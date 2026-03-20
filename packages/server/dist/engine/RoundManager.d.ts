/**
 * RoundManager — Round lifecycle state machine with timing control.
 *
 * State transitions:
 *   WAITING (5s) → BETTING (8s) → FLYING (until crash) → CRASHED → SETTLED (3s) → WAITING...
 *
 * Emits events: 'waiting', 'betting', 'flying', 'multiplier_update',
 *               'auto_cashout', 'crashed', 'settled'
 */
import { EventEmitter } from 'node:events';
import type { RoundPhase } from '@rocket-lh/shared';
export interface RoundManagerEvents {
    waiting: [countdown: number];
    betting: [sessionId: string, serverSeedHash: string, countdown: number];
    flying: [];
    multiplier_update: [multiplier: number, elapsed: number];
    auto_cashout: [multiplier: number];
    crashed: [crashMultiplier: number];
    settled: [];
}
export declare class RoundManager extends EventEmitter<RoundManagerEvents> {
    private phase;
    private multiplier;
    private crashPoint;
    private tickTimer;
    private phaseTimer;
    private flyingStartTime;
    getPhase(): RoundPhase;
    getMultiplier(): number;
    getElapsed(): number;
    /**
     * Start a new round cycle: WAITING → BETTING → FLYING → CRASHED → SETTLED → loop
     */
    startNewRound(crashPoint: number, sessionId: string, serverSeedHash: string): void;
    /** Stop all timers and reset */
    stop(): void;
    private enterWaiting;
    private enterBetting;
    private enterFlying;
    private tick;
    private crash;
    private enterSettled;
    private cleanup;
    private clearTickTimer;
}
//# sourceMappingURL=RoundManager.d.ts.map