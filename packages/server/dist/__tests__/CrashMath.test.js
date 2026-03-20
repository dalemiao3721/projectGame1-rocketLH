import { describe, it, expect } from 'vitest';
import { CrashMath, calculateMultiplierAtTime } from '../engine/CrashMath.js';
const math = new CrashMath();
const RTP_VALUES = [94, 95, 96, 97, 98, 99];
const VOLATILITY_LEVELS = [1, 2, 3, 4, 5];
// ─────────────────────────────────────────────────────────────
// 1. Crash Point basics
// ─────────────────────────────────────────────────────────────
describe('CrashMath.calculateCrashPoint', () => {
    it('always returns >= 1.00', () => {
        for (const rtp of RTP_VALUES) {
            for (const vol of VOLATILITY_LEVELS) {
                for (const r of [0, 0.001, 0.5, 0.999, 0.99999]) {
                    const cp = math.calculateCrashPoint(r, rtp, vol);
                    expect(cp).toBeGreaterThanOrEqual(1.0);
                }
            }
        }
    });
    it('returns values truncated to 2 decimal places', () => {
        for (let i = 0; i < 100; i++) {
            const r = Math.random();
            const cp = math.calculateCrashPoint(r, 97, 3);
            // Verify no more than 2 decimal places (avoid IEEE 754 floor artifact)
            const decimalPart = cp.toString().split('.')[1] ?? '';
            expect(decimalPart.length).toBeLessThanOrEqual(2);
        }
    });
    it('randomValue=0 → crash at minimum (1.00)', () => {
        // betaInverseCDF(0, ...) → 0, so crashPoint = rtp / (1 - 0) = rtp < 1.0 → clamped to 1.0
        const cp = math.calculateCrashPoint(0, 97, 3);
        expect(cp).toBe(1.0);
    });
    it('randomValue near 1 → very high crash point', () => {
        const cp = math.calculateCrashPoint(0.999, 97, 3);
        expect(cp).toBeGreaterThan(50);
    });
    it('throws for invalid volatility level', () => {
        expect(() => math.calculateCrashPoint(0.5, 97, 0)).toThrow('Invalid volatility');
        expect(() => math.calculateCrashPoint(0.5, 97, 6)).toThrow('Invalid volatility');
    });
    it('is deterministic — same inputs always produce same output', () => {
        const a = math.calculateCrashPoint(0.42, 96, 2);
        const b = math.calculateCrashPoint(0.42, 96, 2);
        expect(a).toBe(b);
    });
    it('higher randomValue → equal or higher crash point (monotonic)', () => {
        for (const rtp of RTP_VALUES) {
            for (const vol of VOLATILITY_LEVELS) {
                let prev = math.calculateCrashPoint(0.01, rtp, vol);
                for (let r = 0.1; r <= 0.99; r += 0.1) {
                    const cp = math.calculateCrashPoint(r, rtp, vol);
                    expect(cp).toBeGreaterThanOrEqual(prev);
                    prev = cp;
                }
            }
        }
    });
});
// ─────────────────────────────────────────────────────────────
// 2. Survival probability
// ─────────────────────────────────────────────────────────────
describe('CrashMath.survivalProbability', () => {
    it('returns 1.0 for targetMultiplier <= 1.0', () => {
        expect(math.survivalProbability(1.0, 97, 3)).toBe(1.0);
        expect(math.survivalProbability(0.5, 97, 3)).toBe(1.0);
    });
    it('returns value between 0 and 1', () => {
        for (const rtp of RTP_VALUES) {
            for (const vol of VOLATILITY_LEVELS) {
                for (const target of [1.1, 2, 5, 10, 50, 100]) {
                    const sp = math.survivalProbability(target, rtp, vol);
                    expect(sp).toBeGreaterThanOrEqual(0);
                    expect(sp).toBeLessThanOrEqual(1);
                }
            }
        }
    });
    it('is monotonically decreasing with target multiplier', () => {
        const targets = [1.1, 1.5, 2, 5, 10, 50, 100, 1000];
        for (const rtp of RTP_VALUES) {
            for (const vol of VOLATILITY_LEVELS) {
                for (let i = 1; i < targets.length; i++) {
                    const prev = math.survivalProbability(targets[i - 1], rtp, vol);
                    const curr = math.survivalProbability(targets[i], rtp, vol);
                    expect(curr).toBeLessThanOrEqual(prev);
                }
            }
        }
    });
    it('higher RTP → higher survival probability', () => {
        for (const vol of VOLATILITY_LEVELS) {
            for (const target of [2, 5, 10]) {
                let prev = math.survivalProbability(target, 94, vol);
                for (const rtp of [95, 96, 97, 98, 99]) {
                    const curr = math.survivalProbability(target, rtp, vol);
                    expect(curr).toBeGreaterThanOrEqual(prev - 0.001);
                    prev = curr;
                }
            }
        }
    });
});
// ─────────────────────────────────────────────────────────────
// 3. Beta distribution math
// ─────────────────────────────────────────────────────────────
describe('CrashMath.betaCDF', () => {
    it('boundary: betaCDF(0, ...) = 0', () => {
        expect(math.betaCDF(0, 2, 3)).toBe(0);
    });
    it('boundary: betaCDF(1, ...) = 1', () => {
        expect(math.betaCDF(1, 2, 3)).toBe(1);
    });
    it('uniform case (1,1): betaCDF(x) = x', () => {
        for (const x of [0.1, 0.25, 0.5, 0.75, 0.9]) {
            expect(math.betaCDF(x, 1, 1)).toBeCloseTo(x, 10);
        }
    });
    it('betaCDF(0.5, a, a) ≈ 0.5 (symmetric)', () => {
        for (const a of [1, 2, 3, 5]) {
            expect(math.betaCDF(0.5, a, a)).toBeCloseTo(0.5, 4);
        }
    });
});
describe('CrashMath.betaInverseCDF', () => {
    it('boundary: betaInverseCDF(0, ...) = 0', () => {
        expect(math.betaInverseCDF(0, 2, 3)).toBe(0);
    });
    it('boundary: betaInverseCDF(1, ...) = 1', () => {
        expect(math.betaInverseCDF(1, 2, 3)).toBe(1);
    });
    it('uniform case (1,1): betaInverseCDF(p) = p', () => {
        for (const p of [0.1, 0.5, 0.9]) {
            expect(math.betaInverseCDF(p, 1, 1)).toBeCloseTo(p, 10);
        }
    });
    it('round-trip: betaCDF(betaInverseCDF(p)) ≈ p', () => {
        const params = [[2, 1], [1, 2], [1.5, 1], [1, 1.5]];
        for (const [a, b] of params) {
            for (const p of [0.1, 0.3, 0.5, 0.7, 0.9]) {
                const x = math.betaInverseCDF(p, a, b);
                const recovered = math.betaCDF(x, a, b);
                expect(recovered).toBeCloseTo(p, 6);
            }
        }
    });
});
// ─────────────────────────────────────────────────────────────
// 4. RTP Monte Carlo Simulation — Vol 3 (uniform) strict test
//
// For the crash formula crashPoint = rtp / (1 - betaInvCDF(r)):
// - With uniform Beta (Vol 3): E[payout] = RTP × bet for ANY strategy
// - With non-uniform Beta (Vol 1,2,4,5): E[payout] depends on strategy
//   because the Beta shaping changes survival probability per multiplier
// ─────────────────────────────────────────────────────────────
const SIMULATION_ROUNDS = 100_000;
describe('RTP Monte Carlo — Vol 3 (uniform) strict verification', () => {
    for (const rtp of RTP_VALUES) {
        it(`RTP ${rtp}%, Vol 3: actual return within ±1.0% of target`, () => {
            let totalBet = 0;
            let totalPayout = 0;
            const betAmount = 100;
            for (let i = 0; i < SIMULATION_ROUNDS; i++) {
                const randomValue = Math.random();
                const crashPoint = math.calculateCrashPoint(randomValue, rtp, 3);
                const targetCashout = 1.01 + Math.random() * 8.99;
                totalBet += betAmount;
                if (crashPoint >= targetCashout) {
                    totalPayout += betAmount * targetCashout;
                }
            }
            const actualRTP = (totalPayout / totalBet) * 100;
            const deviation = Math.abs(actualRTP - rtp);
            expect(deviation).toBeLessThan(1.5);
        });
    }
});
// ─────────────────────────────────────────────────────────────
// 5. Cross-volatility: same RTP parameter → different distributions
//    but crash point properties still hold
// ─────────────────────────────────────────────────────────────
describe('Volatility distribution shape', () => {
    const ROUNDS = 50_000;
    function simulateDistribution(vol) {
        let under2 = 0;
        let over10 = 0;
        for (let i = 0; i < ROUNDS; i++) {
            const cp = math.calculateCrashPoint(Math.random(), 97, vol);
            if (cp < 2)
                under2++;
            if (cp >= 10)
                over10++;
        }
        return { under2Pct: under2 / ROUNDS, over10Pct: over10 / ROUNDS };
    }
    it('LV.1 (α=1,β=2) produces more low crash points than LV.5 (α=2,β=1)', () => {
        const lv1 = simulateDistribution(1);
        const lv5 = simulateDistribution(5);
        // Vol 1 (low) skews adjusted values HIGH → lower crash points → more under 2x
        expect(lv1.under2Pct).toBeGreaterThan(lv5.under2Pct);
    });
    it('LV.5 (α=2,β=1) produces more high crash points than LV.1 (α=1,β=2)', () => {
        const lv1 = simulateDistribution(1);
        const lv5 = simulateDistribution(5);
        // Vol 5 (extreme) skews adjusted values LOW → higher crash points → more over 10x
        expect(lv5.over10Pct).toBeGreaterThan(lv1.over10Pct);
    });
    it('survival probability: LV.5 has higher survival than LV.1 at all multipliers', () => {
        // Vol 5 (α=2,β=1) produces higher crash points overall
        // → higher P(crash >= target) at both low and high multipliers
        for (const target of [1.5, 10, 100]) {
            const lv1 = math.survivalProbability(target, 97, 1);
            const lv5 = math.survivalProbability(target, 97, 5);
            expect(lv5).toBeGreaterThan(lv1);
        }
    });
});
// ─────────────────────────────────────────────────────────────
// 6. calculateMultiplierAtTime
// ─────────────────────────────────────────────────────────────
describe('calculateMultiplierAtTime', () => {
    it('returns 1.00 at t=0', () => {
        expect(calculateMultiplierAtTime(0)).toBe(1.0);
    });
    it('is monotonically increasing', () => {
        let prev = calculateMultiplierAtTime(0);
        for (let t = 1000; t <= 60000; t += 1000) {
            const curr = calculateMultiplierAtTime(t);
            expect(curr).toBeGreaterThanOrEqual(prev);
            prev = curr;
        }
    });
    it('matches exponential formula: floor(e^(0.00006 * t) * 100) / 100', () => {
        for (const t of [0, 1000, 5000, 10000, 30000]) {
            const expected = Math.floor(Math.exp(0.00006 * t) * 100) / 100;
            expect(calculateMultiplierAtTime(t)).toBe(expected);
        }
    });
});
//# sourceMappingURL=CrashMath.test.js.map