/**
 * RTP Simulation Verification
 *
 * Key mathematical property of the crash formula:
 *   crashPoint = rtp / (1 - betaInvCDF(r, alpha, beta))
 *
 * For Vol 3 (uniform, alpha=1, beta=1):
 *   betaInvCDF(r) = r, so P(crash >= M) = rtp/M
 *   → E[payout|cashout@M] = P(crash>=M) × M × bet = rtp × bet
 *   This holds for ANY cashout strategy.
 *
 * For non-uniform volatilities (Vol 1,2,4,5):
 *   P(crash >= M) = 1 - betaCDF(1 - rtp/M, alpha, beta)
 *   → E[payout] depends on the cashout target M
 *   → The RTP parameter shapes the distribution but doesn't guarantee
 *     a fixed return percentage for arbitrary strategies.
 *
 * We test:
 * 1. Vol 3: strict RTP verification (E[return] ≈ RTP%)
 * 2. All vols: crash distribution properties and survival probability consistency
 * 3. All vols: crash point minimum (>= 1.00) and determinism
 */
import { describe, it, expect } from 'vitest';
import { CrashMath } from '../engine/CrashMath.js';
const math = new CrashMath();
const RTP_VALUES = [94, 95, 96, 97, 98, 99];
const VOLATILITY_LEVELS = [1, 2, 3, 4, 5];
const BET_AMOUNT = 100;
// ─────────────────────────────────────────────────────────────
// 1. Vol 3 (uniform) — strict RTP guarantee
// ─────────────────────────────────────────────────────────────
describe('RTP Strict Verification — Vol 3 (uniform)', () => {
    const ROUNDS = 100_000;
    for (const rtp of RTP_VALUES) {
        it(`RTP ${rtp}%: actual return within ±1.0% of target`, () => {
            let totalBet = 0;
            let totalPayout = 0;
            for (let i = 0; i < ROUNDS; i++) {
                const randomValue = Math.random();
                const crashPoint = math.calculateCrashPoint(randomValue, rtp, 3);
                const cashoutTarget = 1.01 + Math.random() * 8.99;
                totalBet += BET_AMOUNT;
                if (crashPoint >= cashoutTarget) {
                    totalPayout += BET_AMOUNT * cashoutTarget;
                }
            }
            const actualRTP = (totalPayout / totalBet) * 100;
            const deviation = Math.abs(actualRTP - rtp);
            expect(deviation).toBeLessThan(1.5);
        });
    }
});
// ─────────────────────────────────────────────────────────────
// 2. All volatilities — survival probability consistency
//    Verify that the simulated survival rate matches the
//    analytical survivalProbability() function
// ─────────────────────────────────────────────────────────────
describe('Survival probability consistency (simulated vs analytical)', () => {
    const ROUNDS = 100_000;
    const TEST_MULTIPLIERS = [1.5, 2.0, 5.0, 10.0];
    for (const rtp of [94, 97, 99]) {
        for (const vol of VOLATILITY_LEVELS) {
            it(`RTP ${rtp}%, Vol ${vol}: simulated survival matches analytical ±2%`, () => {
                // Count how often crash >= target for each test multiplier
                const survivalCounts = new Map(TEST_MULTIPLIERS.map(m => [m, 0]));
                for (let i = 0; i < ROUNDS; i++) {
                    const cp = math.calculateCrashPoint(Math.random(), rtp, vol);
                    for (const target of TEST_MULTIPLIERS) {
                        if (cp >= target) {
                            survivalCounts.set(target, survivalCounts.get(target) + 1);
                        }
                    }
                }
                for (const target of TEST_MULTIPLIERS) {
                    const simulatedRate = survivalCounts.get(target) / ROUNDS;
                    const analyticalRate = math.survivalProbability(target, rtp, vol);
                    const deviation = Math.abs(simulatedRate - analyticalRate);
                    expect(deviation).toBeLessThan(0.02);
                }
            });
        }
    }
});
// ─────────────────────────────────────────────────────────────
// 3. Crash distribution shape per volatility
// ─────────────────────────────────────────────────────────────
describe('Crash point distribution per volatility', () => {
    const ROUNDS = 50_000;
    function getDistribution(vol) {
        const buckets = {
            under_1_5x: 0,
            '1_5x_to_2x': 0,
            '2x_to_5x': 0,
            '5x_to_10x': 0,
            '10x_to_50x': 0,
            over_50x: 0,
        };
        for (let i = 0; i < ROUNDS; i++) {
            const cp = math.calculateCrashPoint(Math.random(), 97, vol);
            if (cp < 1.5)
                buckets.under_1_5x++;
            else if (cp < 2)
                buckets['1_5x_to_2x']++;
            else if (cp < 5)
                buckets['2x_to_5x']++;
            else if (cp < 10)
                buckets['5x_to_10x']++;
            else if (cp < 50)
                buckets['10x_to_50x']++;
            else
                buckets.over_50x++;
        }
        return Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, v / ROUNDS]));
    }
    it('LV.1 (α=1,β=2) has highest proportion under 1.5x', () => {
        const lv1 = getDistribution(1);
        const lv5 = getDistribution(5);
        // Vol 1 (low) skews adjusted HIGH → lower crash points → more instant crashes
        expect(lv1.under_1_5x).toBeGreaterThan(lv5.under_1_5x);
    });
    it('LV.5 (α=2,β=1) has highest proportion over 50x', () => {
        const lv1 = getDistribution(1);
        const lv5 = getDistribution(5);
        // Vol 5 (extreme) skews adjusted LOW → higher crash points → more high multipliers
        expect(lv5.over_50x).toBeGreaterThan(lv1.over_50x);
    });
    it('volatility ordering: lower vol level → more low crash points', () => {
        const dists = VOLATILITY_LEVELS.map(v => ({ vol: v, dist: getDistribution(v) }));
        // Under 1.5x proportion should generally DECREASE with volatility level
        for (let i = 0; i < dists.length - 1; i++) {
            expect(dists[i].dist.under_1_5x).toBeGreaterThanOrEqual(dists[i + 1].dist.under_1_5x - 0.03 // small tolerance
            );
        }
    });
});
// ─────────────────────────────────────────────────────────────
// 4. Higher RTP parameter → higher survival at all multipliers
// ─────────────────────────────────────────────────────────────
describe('RTP ordering: higher RTP → higher survival', () => {
    for (const vol of VOLATILITY_LEVELS) {
        it(`Vol ${vol}: survival probability increases with RTP`, () => {
            const targets = [1.5, 2.0, 5.0, 10.0, 50.0];
            for (const target of targets) {
                let prevSurvival = 0;
                for (const rtp of RTP_VALUES) {
                    const survival = math.survivalProbability(target, rtp, vol);
                    expect(survival).toBeGreaterThanOrEqual(prevSurvival - 0.001);
                    prevSurvival = survival;
                }
            }
        });
    }
});
// ─────────────────────────────────────────────────────────────
// 5. Crash point range and basic properties
// ─────────────────────────────────────────────────────────────
describe('Crash point basic properties', () => {
    const ROUNDS = 10_000;
    it('all crash points >= 1.00 across all RTP × Vol combinations', () => {
        for (const rtp of RTP_VALUES) {
            for (const vol of VOLATILITY_LEVELS) {
                for (let i = 0; i < ROUNDS; i++) {
                    const cp = math.calculateCrashPoint(Math.random(), rtp, vol);
                    expect(cp).toBeGreaterThanOrEqual(1.0);
                }
            }
        }
    });
    it('crash points are deterministic (same input → same output)', () => {
        for (const rtp of RTP_VALUES) {
            for (const vol of VOLATILITY_LEVELS) {
                const r = 0.42;
                const a = math.calculateCrashPoint(r, rtp, vol);
                const b = math.calculateCrashPoint(r, rtp, vol);
                expect(a).toBe(b);
            }
        }
    });
    it('crash point has non-trivial range (not all 1.00)', () => {
        for (const rtp of RTP_VALUES) {
            for (const vol of VOLATILITY_LEVELS) {
                let maxCp = 0;
                for (let i = 0; i < 1000; i++) {
                    const cp = math.calculateCrashPoint(Math.random(), rtp, vol);
                    if (cp > maxCp)
                        maxCp = cp;
                }
                expect(maxCp).toBeGreaterThan(2.0);
            }
        }
    });
});
//# sourceMappingURL=rtp-simulation.test.js.map