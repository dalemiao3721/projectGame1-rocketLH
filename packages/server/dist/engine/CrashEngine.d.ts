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
import type { PanelId } from '@rocket-lh/shared';
import type { PlaceBetResponse, CashoutResponse, VerifyResponse, RoundStateResponse } from '@rocket-lh/shared';
/** Error codes matching the API spec */
export declare class GameError extends Error {
    code: string;
    httpStatus: number;
    constructor(code: string, message: string, httpStatus?: number);
}
export interface CrashEngineEvents {
    round_waiting: [countdown: number];
    round_betting: [sessionId: string, serverSeedHash: string, countdown: number];
    round_flying: [];
    multiplier_update: [multiplier: number, elapsed: number];
    round_crashed: [crashMultiplier: number, serverSeed: string];
    auto_cashout_triggered: [panelId: PanelId, playerId: string, multiplier: number, payout: number];
    history_update: [recent: {
        sessionId: string;
        crashMultiplier: number;
    }[]];
    settled: [];
}
export declare class CrashEngine extends EventEmitter<CrashEngineEvents> {
    private static instance;
    private crashMath;
    private provablyFair;
    private sessionStore;
    private roundManager;
    private roundCounter;
    private history;
    private running;
    private constructor();
    static getInstance(): CrashEngine;
    /** Reset singleton (for testing) */
    static resetInstance(): void;
    /** Start the game loop */
    start(): void;
    /** Stop the game loop */
    stop(): void;
    isRunning(): boolean;
    /** Place a bet on a panel during BETTING phase */
    placeBet(params: {
        playerId: string;
        panelId: PanelId;
        betAmount: number;
        autoCashout?: number;
        lobbyToken?: string;
        lobbySessionId?: string;
    }): Promise<PlaceBetResponse>;
    /** Cash out a panel during FLYING phase */
    cashout(params: {
        playerId: string;
        panelId: PanelId;
        sessionId: string;
    }): Promise<CashoutResponse>;
    /** Verify a past round's fairness */
    verifyFairness(params: {
        serverSeed: string;
        clientSeed: string;
        nonce: number;
    }): VerifyResponse;
    /** Get current round state (for reconnection) */
    getRoundState(): RoundStateResponse;
    /** Get recent crash history */
    getHistory(limit?: number): {
        sessionId: string;
        crashMultiplier: number;
        crashedAt: string;
    }[];
    /** Get player balance (standalone mode or lobby mode) */
    getPlayerBalance(playerId: string, lobbyToken?: string): Promise<number>;
    private startNextRound;
    private bindRoundEvents;
    private processAutoCashouts;
    private handleCrash;
}
//# sourceMappingURL=CrashEngine.d.ts.map