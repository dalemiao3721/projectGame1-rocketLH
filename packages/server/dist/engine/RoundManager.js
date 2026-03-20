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
import { ROUND_TIMING } from '@rocket-lh/shared';
import { calculateMultiplierAtTime } from './CrashMath.js';
export class RoundManager extends EventEmitter {
    phase = 'WAITING';
    multiplier = 1.0;
    crashPoint = 1.0;
    tickTimer = null;
    phaseTimer = null;
    flyingStartTime = 0;
    getPhase() {
        return this.phase;
    }
    getMultiplier() {
        return this.multiplier;
    }
    getElapsed() {
        if (this.phase !== 'FLYING')
            return 0;
        return Date.now() - this.flyingStartTime;
    }
    /**
     * Start a new round cycle: WAITING → BETTING → FLYING → CRASHED → SETTLED → loop
     */
    startNewRound(crashPoint, sessionId, serverSeedHash) {
        this.cleanup();
        this.crashPoint = crashPoint;
        this.multiplier = 1.0;
        this.enterWaiting(sessionId, serverSeedHash);
    }
    /** Stop all timers and reset */
    stop() {
        this.cleanup();
        this.phase = 'WAITING';
        this.multiplier = 1.0;
    }
    // --- Phase transitions ---
    enterWaiting(sessionId, serverSeedHash) {
        this.phase = 'WAITING';
        const countdownSec = ROUND_TIMING.WAITING_DURATION / 1000;
        this.emit('waiting', countdownSec);
        this.phaseTimer = setTimeout(() => {
            this.enterBetting(sessionId, serverSeedHash);
        }, ROUND_TIMING.WAITING_DURATION);
    }
    enterBetting(sessionId, serverSeedHash) {
        this.phase = 'BETTING';
        const countdownSec = ROUND_TIMING.BETTING_DURATION / 1000;
        this.emit('betting', sessionId, serverSeedHash, countdownSec);
        this.phaseTimer = setTimeout(() => {
            this.enterFlying();
        }, ROUND_TIMING.BETTING_DURATION);
    }
    enterFlying() {
        this.phase = 'FLYING';
        this.multiplier = 1.0;
        this.flyingStartTime = Date.now();
        this.emit('flying');
        // Immediate crash check (crashPoint === 1.00)
        if (this.crashPoint <= 1.0) {
            this.crash();
            return;
        }
        this.tickTimer = setInterval(() => {
            this.tick();
        }, ROUND_TIMING.TICK_INTERVAL);
    }
    tick() {
        const elapsed = Date.now() - this.flyingStartTime;
        this.multiplier = calculateMultiplierAtTime(elapsed);
        // Emit for auto-cashout checking before potential crash
        this.emit('multiplier_update', this.multiplier, elapsed);
        // Check if auto-cashout threshold reached for any bets
        this.emit('auto_cashout', this.multiplier);
        if (this.multiplier >= this.crashPoint) {
            this.multiplier = this.crashPoint;
            this.crash();
        }
    }
    crash() {
        this.clearTickTimer();
        this.phase = 'CRASHED';
        this.emit('crashed', this.crashPoint);
        // Auto-transition to SETTLED after display duration
        this.phaseTimer = setTimeout(() => {
            this.enterSettled();
        }, ROUND_TIMING.SETTLED_DURATION);
    }
    enterSettled() {
        this.phase = 'SETTLED';
        this.emit('settled');
    }
    // --- Cleanup ---
    cleanup() {
        this.clearTickTimer();
        if (this.phaseTimer) {
            clearTimeout(this.phaseTimer);
            this.phaseTimer = null;
        }
    }
    clearTickTimer() {
        if (this.tickTimer) {
            clearInterval(this.tickTimer);
            this.tickTimer = null;
        }
    }
}
//# sourceMappingURL=RoundManager.js.map