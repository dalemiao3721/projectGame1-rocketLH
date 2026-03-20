/**
 * SessionStore — In-memory state for the current round and active bets.
 *
 * Stores:
 * - Current round metadata (session, seeds, crash point)
 * - Active bets keyed by "playerId:panelId"
 */
import type { PanelId, RoundPhase } from '@rocket-lh/shared';
export interface RoundSession {
    sessionId: string;
    crashPoint: number;
    serverSeed: string;
    serverSeedHash: string;
    clientSeed: string;
    nonce: number;
    rtpSetting: number;
    volatilityLevel: number;
    phase: RoundPhase;
    startedAt: Date;
}
export interface PanelBet {
    betId: string;
    sessionId: string;
    playerId: string;
    panelId: PanelId;
    betAmount: number;
    autoCashout: number | null;
    status: 'active' | 'cashed_out' | 'lost';
    cashoutMultiplier: number | null;
    payout: number;
    createdAt: Date;
    lobbyToken: string | null;
    lobbySessionId: string | null;
}
export declare class SessionStore {
    private currentRound;
    private bets;
    private betKey;
    createRound(session: RoundSession): void;
    getCurrentRound(): RoundSession | null;
    updatePhase(phase: RoundPhase): void;
    placeBet(bet: PanelBet): void;
    getBet(playerId: string, panelId: PanelId): PanelBet | undefined;
    /** All bets with status 'active' (not yet cashed out or lost) */
    getActiveBets(): PanelBet[];
    /** All bets in current round */
    getAllBets(): PanelBet[];
    /** Update a bet's settlement fields */
    settleBet(playerId: string, panelId: PanelId, result: Partial<Pick<PanelBet, 'status' | 'cashoutMultiplier' | 'payout'>>): PanelBet | undefined;
    /** Clear round state for the next round */
    clearRound(): void;
}
//# sourceMappingURL=SessionStore.d.ts.map