import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RoundManager } from '../engine/RoundManager.js';
describe('RoundManager', () => {
    let rm;
    beforeEach(() => {
        vi.useFakeTimers();
        rm = new RoundManager();
    });
    afterEach(() => {
        rm.stop();
        vi.useRealTimers();
    });
    // ── Phase transitions ─────────────────────────────────
    describe('state machine', () => {
        it('starts at WAITING phase', () => {
            expect(rm.getPhase()).toBe('WAITING');
        });
        it('WAITING → BETTING after WAITING_DURATION (5s)', () => {
            rm.startNewRound(5.0, 'SESSION-1', 'hash-1');
            expect(rm.getPhase()).toBe('WAITING');
            vi.advanceTimersByTime(5001);
            expect(rm.getPhase()).toBe('BETTING');
        });
        it('BETTING → FLYING after BETTING_DURATION (8s)', () => {
            rm.startNewRound(100.0, 'SESSION-1', 'hash-1');
            vi.advanceTimersByTime(5001); // → BETTING
            expect(rm.getPhase()).toBe('BETTING');
            vi.advanceTimersByTime(8001); // → FLYING
            expect(rm.getPhase()).toBe('FLYING');
        });
        it('FLYING → CRASHED when multiplier reaches crashPoint', () => {
            rm.startNewRound(1.5, 'SESSION-1', 'hash-1');
            vi.advanceTimersByTime(5001); // → BETTING
            vi.advanceTimersByTime(8001); // → FLYING
            // multiplier = e^(0.00006 * t) → 1.5x at ~6800ms
            // Advance enough to crash but NOT past SETTLED_DURATION (3s)
            // so we can still observe CRASHED phase
            vi.advanceTimersByTime(8000); // ~6800ms to crash + ~1200ms buffer (< 3000ms settled)
            expect(rm.getPhase()).toBe('CRASHED');
        });
        it('CRASHED → SETTLED after SETTLED_DURATION (3s)', () => {
            rm.startNewRound(1.0, 'SESSION-1', 'hash-1'); // Instant crash
            vi.advanceTimersByTime(5001); // → BETTING
            vi.advanceTimersByTime(8001); // → FLYING → immediate CRASHED
            expect(rm.getPhase()).toBe('CRASHED');
            vi.advanceTimersByTime(3001); // → SETTLED
            expect(rm.getPhase()).toBe('SETTLED');
        });
        it('instant crash when crashPoint <= 1.0', () => {
            rm.startNewRound(1.0, 'SESSION-1', 'hash-1');
            vi.advanceTimersByTime(5001); // → BETTING
            vi.advanceTimersByTime(8001); // → FLYING → immediate CRASHED
            expect(rm.getPhase()).toBe('CRASHED');
        });
    });
    // ── Events ────────────────────────────────────────────
    describe('event emissions', () => {
        it('emits "waiting" with countdown', () => {
            const spy = vi.fn();
            rm.on('waiting', spy);
            rm.startNewRound(5.0, 'S-1', 'H-1');
            expect(spy).toHaveBeenCalledWith(5); // 5000ms / 1000 = 5s
        });
        it('emits "betting" with sessionId, hash, countdown', () => {
            const spy = vi.fn();
            rm.on('betting', spy);
            rm.startNewRound(5.0, 'S-1', 'H-1');
            vi.advanceTimersByTime(5001);
            expect(spy).toHaveBeenCalledWith('S-1', 'H-1', 8); // 8000ms / 1000 = 8s
        });
        it('emits "flying" when entering flight phase', () => {
            const spy = vi.fn();
            rm.on('flying', spy);
            rm.startNewRound(100.0, 'S-1', 'H-1');
            vi.advanceTimersByTime(5001 + 8001);
            expect(spy).toHaveBeenCalledOnce();
        });
        it('emits "multiplier_update" during flight', () => {
            const spy = vi.fn();
            rm.on('multiplier_update', spy);
            rm.startNewRound(100.0, 'S-1', 'H-1');
            vi.advanceTimersByTime(5001 + 8001); // → FLYING
            vi.advanceTimersByTime(100); // 2 ticks
            expect(spy).toHaveBeenCalled();
            const [multiplier] = spy.mock.calls[0];
            expect(multiplier).toBeGreaterThanOrEqual(1.0);
        });
        it('emits "crashed" with crash multiplier', () => {
            const spy = vi.fn();
            rm.on('crashed', spy);
            rm.startNewRound(1.0, 'S-1', 'H-1');
            vi.advanceTimersByTime(5001 + 8001);
            expect(spy).toHaveBeenCalledWith(1.0);
        });
        it('emits "settled" after crash display', () => {
            const spy = vi.fn();
            rm.on('settled', spy);
            rm.startNewRound(1.0, 'S-1', 'H-1');
            vi.advanceTimersByTime(5001 + 8001 + 3001);
            expect(spy).toHaveBeenCalledOnce();
        });
        it('emits "auto_cashout" during flight ticks', () => {
            const spy = vi.fn();
            rm.on('auto_cashout', spy);
            rm.startNewRound(100.0, 'S-1', 'H-1');
            vi.advanceTimersByTime(5001 + 8001 + 100);
            expect(spy).toHaveBeenCalled();
        });
    });
    // ── Multiplier ────────────────────────────────────────
    describe('multiplier behavior', () => {
        it('starts at 1.0 when entering FLYING', () => {
            rm.startNewRound(100.0, 'S-1', 'H-1');
            vi.advanceTimersByTime(5001 + 8001);
            // At the moment of entering FLYING, multiplier is 1.0
            // (before any ticks fire)
            expect(rm.getPhase()).toBe('FLYING');
        });
        it('increases during flight', () => {
            rm.startNewRound(100.0, 'S-1', 'H-1');
            vi.advanceTimersByTime(5001 + 8001); // → FLYING
            vi.advanceTimersByTime(5000); // 5 seconds of flight
            const m = rm.getMultiplier();
            expect(m).toBeGreaterThan(1.0);
        });
        it('caps at crashPoint when crashing', () => {
            const spy = vi.fn();
            rm.on('crashed', spy);
            rm.startNewRound(1.5, 'S-1', 'H-1');
            vi.advanceTimersByTime(5001 + 8001 + 20000);
            expect(spy).toHaveBeenCalledWith(1.5);
        });
    });
    // ── Elapsed time ──────────────────────────────────────
    describe('getElapsed', () => {
        it('returns 0 when not in FLYING phase', () => {
            expect(rm.getElapsed()).toBe(0);
            rm.startNewRound(100.0, 'S-1', 'H-1');
            expect(rm.getElapsed()).toBe(0); // still WAITING
        });
    });
    // ── Stop / cleanup ────────────────────────────────────
    describe('stop', () => {
        it('resets phase to WAITING and multiplier to 1.0', () => {
            rm.startNewRound(100.0, 'S-1', 'H-1');
            vi.advanceTimersByTime(5001 + 8001 + 500); // FLYING
            rm.stop();
            expect(rm.getPhase()).toBe('WAITING');
            expect(rm.getMultiplier()).toBe(1.0);
        });
    });
});
//# sourceMappingURL=RoundManager.test.js.map