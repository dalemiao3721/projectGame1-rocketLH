/**
 * CrashEngine — Core game controller (Singleton).
 *
 * Orchestrates: CrashMath, ProvablyFair, SessionStore, RoundManager.
 * Provides the public API surface for bet placement, cashout, and verification.
 *
 * Balance modes:
 * - Lobby mode: when lobbyToken/lobbySessionId are provided, uses lobby wallet API
 * - Standalone mode: falls back to in-memory playerBalances map
 */
import { EventEmitter } from 'node:events';
import { PANEL_IDS, BET_DEFAULTS } from '@rocket-lh/shared';
import { CrashMath } from './CrashMath.js';
import { ProvablyFair } from './ProvablyFair.js';
import { SessionStore } from './SessionStore.js';
import { RoundManager } from './RoundManager.js';
import { serverConfig } from '../config/index.js';
import * as lobbyClient from '../services/lobby-client.js';
import { CrashLog } from '../db/models/CrashLog.js';
import { BetRecord } from '../db/models/BetRecord.js';
import { Settlement } from '../db/models/Settlement.js';
/** Error codes matching the API spec */
export class GameError extends Error {
    code;
    httpStatus;
    constructor(code, message, httpStatus = 400) {
        super(message);
        this.code = code;
        this.httpStatus = httpStatus;
        this.name = 'GameError';
    }
}
// --- Standalone mode: in-memory balance fallback ---
const playerBalances = new Map();
function getStandaloneBalance(playerId) {
    if (!playerBalances.has(playerId)) {
        playerBalances.set(playerId, 1000);
    }
    return playerBalances.get(playerId);
}
function adjustStandaloneBalance(playerId, amount) {
    const current = getStandaloneBalance(playerId);
    const newBalance = current + amount;
    playerBalances.set(playerId, newBalance);
    return newBalance;
}
/** Fire-and-forget DB write — logs errors but never throws */
function dbWrite(label, fn) {
    fn().catch((err) => {
        console.error(`[RocketLH DB] ${label} failed:`, err.message);
    });
}
export class CrashEngine extends EventEmitter {
    static instance = null;
    crashMath;
    provablyFair;
    sessionStore;
    roundManager;
    roundCounter = 0;
    history = [];
    running = false;
    constructor() {
        super();
        this.crashMath = new CrashMath();
        this.provablyFair = new ProvablyFair(this.crashMath);
        this.sessionStore = new SessionStore();
        this.roundManager = new RoundManager();
        this.bindRoundEvents();
    }
    static getInstance() {
        if (!CrashEngine.instance) {
            CrashEngine.instance = new CrashEngine();
        }
        return CrashEngine.instance;
    }
    /** Reset singleton (for testing) */
    static resetInstance() {
        if (CrashEngine.instance) {
            CrashEngine.instance.stop();
            CrashEngine.instance = null;
        }
    }
    // --- Lifecycle ---
    /** Start the game loop */
    start() {
        if (this.running)
            return;
        this.running = true;
        this.startNextRound();
    }
    /** Stop the game loop */
    stop() {
        this.running = false;
        this.roundManager.stop();
    }
    isRunning() {
        return this.running;
    }
    // --- Public API ---
    /** Place a bet on a panel during BETTING phase */
    async placeBet(params) {
        const { playerId, panelId, betAmount, autoCashout, lobbyToken, lobbySessionId } = params;
        const round = this.sessionStore.getCurrentRound();
        const useLobby = !!(lobbyToken && lobbySessionId);
        // Validate round phase
        if (!round || round.phase !== 'BETTING') {
            throw new GameError('BET_PHASE_CLOSED', 'Betting phase has ended. Please wait for the next round.', 409);
        }
        // Validate panel ID
        if (!PANEL_IDS.includes(panelId)) {
            throw new GameError('INVALID_PANEL_ID', `Panel ID must be one of: ${PANEL_IDS.join(', ')}`, 400);
        }
        // Validate bet amount
        if (betAmount < BET_DEFAULTS.MIN_AMOUNT) {
            throw new GameError('INVALID_PARAMS', `Minimum bet amount is ${BET_DEFAULTS.MIN_AMOUNT}`, 400);
        }
        // Validate auto cashout
        if (autoCashout !== undefined && autoCashout < BET_DEFAULTS.MIN_AUTO_CASHOUT) {
            throw new GameError('INVALID_PARAMS', `Auto cashout must be >= ${BET_DEFAULTS.MIN_AUTO_CASHOUT}`, 400);
        }
        // Check duplicate bet
        if (this.sessionStore.getBet(playerId, panelId)) {
            throw new GameError('DUPLICATE_BET', `Panel ${panelId} already has an active bet`, 409);
        }
        // Check balance and debit
        let newBalance;
        if (useLobby) {
            // Lobby mode: check balance via lobby API, then debit
            const balanceRes = await lobbyClient.getBalance(lobbyToken);
            if (balanceRes.balance < betAmount) {
                throw new GameError('INSUFFICIENT_BALANCE', 'Insufficient balance for this bet', 402);
            }
            const settleRes = await lobbyClient.settle(lobbySessionId, betAmount, 0);
            newBalance = settleRes.newBalance;
        }
        else {
            // Standalone mode: in-memory balance
            const balance = getStandaloneBalance(playerId);
            if (balance < betAmount) {
                throw new GameError('INSUFFICIENT_BALANCE', 'Insufficient balance for this bet', 402);
            }
            newBalance = adjustStandaloneBalance(playerId, -betAmount);
        }
        // Create bet record
        const betId = `BET-ROCKET-${Date.now()}-${panelId}`;
        const bet = {
            betId,
            sessionId: round.sessionId,
            playerId,
            panelId,
            betAmount,
            autoCashout: autoCashout ?? null,
            status: 'active',
            cashoutMultiplier: null,
            payout: 0,
            createdAt: new Date(),
            lobbyToken: lobbyToken ?? null,
            lobbySessionId: lobbySessionId ?? null,
        };
        this.sessionStore.placeBet(bet);
        // Persist to DB (fire-and-forget)
        dbWrite(`BetRecord.insert(${betId})`, () => BetRecord.insert({
            betId,
            sessionId: round.sessionId,
            playerId,
            panelId,
            betAmount,
            rtpSetting: round.rtpSetting,
            volatilityLevel: round.volatilityLevel,
            autoCashout: autoCashout ?? null,
        }));
        return {
            betId,
            sessionId: round.sessionId,
            panelId,
            betAmount,
            autoCashout: autoCashout ?? null,
            balance: newBalance,
        };
    }
    /** Cash out a panel during FLYING phase */
    async cashout(params) {
        const { playerId, panelId, sessionId } = params;
        const round = this.sessionStore.getCurrentRound();
        if (!round) {
            throw new GameError('SESSION_NOT_FOUND', 'No active round', 404);
        }
        if (round.phase !== 'FLYING') {
            throw new GameError('NOT_FLYING', 'Cashout is only allowed during flying phase', 409);
        }
        if (round.sessionId !== sessionId) {
            throw new GameError('SESSION_MISMATCH', 'Session ID does not match current round', 403);
        }
        const bet = this.sessionStore.getBet(playerId, panelId);
        if (!bet) {
            throw new GameError('SESSION_NOT_FOUND', `No bet found for panel ${panelId}`, 404);
        }
        if (bet.status === 'cashed_out') {
            throw new GameError('ALREADY_CASHED_OUT', `Panel ${panelId} has already been cashed out`, 409);
        }
        if (bet.status === 'lost') {
            throw new GameError('NOT_FLYING', 'This bet has already been settled as lost', 409);
        }
        // Lock current multiplier
        const cashoutMultiplier = this.roundManager.getMultiplier();
        const payout = Math.floor(bet.betAmount * cashoutMultiplier * 100) / 100;
        const profit = Math.floor((payout - bet.betAmount) * 100) / 100;
        // Update bet
        this.sessionStore.settleBet(playerId, panelId, {
            status: 'cashed_out',
            cashoutMultiplier,
            payout,
        });
        // Credit balance
        let newBalance;
        if (bet.lobbyToken && bet.lobbySessionId) {
            // Lobby mode: credit via lobby API
            const settleRes = await lobbyClient.settle(bet.lobbySessionId, 0, payout);
            newBalance = settleRes.newBalance;
        }
        else {
            // Standalone mode
            newBalance = adjustStandaloneBalance(playerId, payout);
        }
        // Persist to DB (fire-and-forget)
        dbWrite(`BetRecord.updateStatus(${bet.betId})`, () => BetRecord.updateStatus(bet.betId, 'cashed_out'));
        const settlementId = `SETTLE-${Date.now()}-${panelId}`;
        dbWrite(`Settlement.insert(${settlementId})`, () => Settlement.insert({
            settlementId,
            betId: bet.betId,
            outcome: 'win',
            cashoutMultiplier,
            payout,
            profit,
        }));
        return {
            panelId,
            cashoutMultiplier,
            payout,
            profit,
            balance: newBalance,
        };
    }
    /** Verify a past round's fairness */
    verifyFairness(params) {
        const { serverSeed, clientSeed, nonce } = params;
        const { computedHash, computedCrashPoint } = this.provablyFair.verify(serverSeed, clientSeed, nonce, serverConfig.rtpSetting, serverConfig.volatilityLevel);
        return {
            isValid: true,
            computedHash,
            computedCrashPoint,
        };
    }
    /** Get current round state (for reconnection) */
    getRoundState() {
        const round = this.sessionStore.getCurrentRound();
        return {
            phase: round?.phase ?? 'WAITING',
            sessionId: round?.sessionId ?? null,
            serverSeedHash: round?.serverSeedHash ?? null,
            currentMultiplier: this.roundManager.getMultiplier(),
            elapsed: this.roundManager.getElapsed(),
        };
    }
    /** Get recent crash history */
    getHistory(limit = 10) {
        return this.history.slice(0, limit);
    }
    /** Get player balance (standalone mode or lobby mode) */
    async getPlayerBalance(playerId, lobbyToken) {
        if (lobbyToken) {
            const res = await lobbyClient.getBalance(lobbyToken);
            return res.balance;
        }
        return getStandaloneBalance(playerId);
    }
    // --- Internal ---
    startNextRound() {
        if (!this.running)
            return;
        this.roundCounter++;
        const sessionId = `SESSION-LH-${Date.now()}`;
        const serverSeed = this.provablyFair.generateServerSeed();
        const serverSeedHash = this.provablyFair.hashSeed(serverSeed);
        const clientSeed = 'default_client_seed'; // Simplified; real impl would accept player seeds
        const nonce = this.roundCounter;
        const crashPoint = this.provablyFair.generateCrashPoint(serverSeed, clientSeed, nonce, serverConfig.rtpSetting, serverConfig.volatilityLevel);
        // Store round in SessionStore
        this.sessionStore.createRound({
            sessionId,
            crashPoint,
            serverSeed,
            serverSeedHash,
            clientSeed,
            nonce,
            rtpSetting: serverConfig.rtpSetting,
            volatilityLevel: serverConfig.volatilityLevel,
            phase: 'WAITING',
            startedAt: new Date(),
        });
        // Pre-insert crash_log so bet_records FK constraint is satisfied
        const drawId = `DRAW-${Date.now()}-${nonce}`;
        dbWrite(`CrashLog.insert(${drawId})`, () => CrashLog.insert({
            drawId,
            sessionId,
            crashMultiplier: crashPoint,
            serverSeed,
            serverSeedHash,
            clientSeed,
            rtpSetting: serverConfig.rtpSetting,
            volatilityLevel: serverConfig.volatilityLevel,
            crashedAt: new Date(), // Placeholder — updated on actual crash
        }));
        this.roundManager.startNewRound(crashPoint, sessionId, serverSeedHash);
    }
    bindRoundEvents() {
        this.roundManager.on('waiting', (countdown) => {
            this.sessionStore.updatePhase('WAITING');
            this.emit('round_waiting', countdown);
        });
        this.roundManager.on('betting', (sessionId, serverSeedHash, countdown) => {
            this.sessionStore.updatePhase('BETTING');
            this.emit('round_betting', sessionId, serverSeedHash, countdown);
        });
        this.roundManager.on('flying', () => {
            this.sessionStore.updatePhase('FLYING');
            this.emit('round_flying');
        });
        this.roundManager.on('multiplier_update', (multiplier, elapsed) => {
            this.emit('multiplier_update', multiplier, elapsed);
        });
        this.roundManager.on('auto_cashout', (currentMultiplier) => {
            this.processAutoCashouts(currentMultiplier);
        });
        this.roundManager.on('crashed', (crashMultiplier) => {
            this.handleCrash(crashMultiplier);
        });
        this.roundManager.on('settled', () => {
            this.emit('settled');
            // Auto-start next round
            this.startNextRound();
        });
    }
    processAutoCashouts(currentMultiplier) {
        const activeBets = this.sessionStore.getActiveBets();
        for (const bet of activeBets) {
            if (bet.autoCashout !== null &&
                currentMultiplier >= bet.autoCashout) {
                const payout = Math.floor(bet.betAmount * bet.autoCashout * 100) / 100;
                this.sessionStore.settleBet(bet.playerId, bet.panelId, {
                    status: 'cashed_out',
                    cashoutMultiplier: bet.autoCashout,
                    payout,
                });
                // Credit balance (async, fire-and-forget for auto-cashout)
                if (bet.lobbyToken && bet.lobbySessionId) {
                    lobbyClient.settle(bet.lobbySessionId, 0, payout).catch((err) => {
                        console.error(`[RocketLH] Auto-cashout lobby settle failed for ${bet.betId}:`, err);
                    });
                }
                else {
                    adjustStandaloneBalance(bet.playerId, payout);
                }
                // Persist to DB (fire-and-forget)
                dbWrite(`BetRecord.updateStatus(${bet.betId})`, () => BetRecord.updateStatus(bet.betId, 'cashed_out'));
                const autoSettleId = `SETTLE-AUTO-${Date.now()}-${bet.panelId}`;
                dbWrite(`Settlement.insert(${autoSettleId})`, () => Settlement.insert({
                    settlementId: autoSettleId,
                    betId: bet.betId,
                    outcome: 'win',
                    cashoutMultiplier: bet.autoCashout,
                    payout,
                    profit: Math.floor((payout - bet.betAmount) * 100) / 100,
                }));
                this.emit('auto_cashout_triggered', bet.panelId, bet.playerId, bet.autoCashout, payout);
            }
        }
    }
    handleCrash(crashMultiplier) {
        const round = this.sessionStore.getCurrentRound();
        if (!round)
            return;
        this.sessionStore.updatePhase('CRASHED');
        // Mark all remaining active bets as lost
        const activeBets = this.sessionStore.getActiveBets();
        for (const bet of activeBets) {
            this.sessionStore.settleBet(bet.playerId, bet.panelId, {
                status: 'lost',
                cashoutMultiplier: crashMultiplier,
                payout: 0,
            });
            // Persist lost settlement to DB (fire-and-forget)
            dbWrite(`BetRecord.updateStatus(${bet.betId})`, () => BetRecord.updateStatus(bet.betId, 'lost'));
            const lostSettleId = `SETTLE-LOST-${Date.now()}-${bet.panelId}`;
            dbWrite(`Settlement.insert(${lostSettleId})`, () => Settlement.insert({
                settlementId: lostSettleId,
                betId: bet.betId,
                outcome: 'lose',
                cashoutMultiplier: crashMultiplier,
                payout: 0,
                profit: -bet.betAmount,
            }));
        }
        // Add to history
        const crashedAt = new Date();
        this.history.unshift({
            sessionId: round.sessionId,
            crashMultiplier,
            crashedAt: crashedAt.toISOString(),
        });
        // Keep last 50 entries
        if (this.history.length > 50)
            this.history.pop();
        // Update crash timestamp in DB (row was pre-inserted at round start)
        dbWrite(`CrashLog.updateCrashedAt(${round.sessionId})`, () => CrashLog.updateCrashedAt(round.sessionId, crashedAt));
        // Emit events
        this.emit('round_crashed', crashMultiplier, round.serverSeed);
        this.emit('history_update', this.history.slice(0, 10));
    }
}
//# sourceMappingURL=CrashEngine.js.map