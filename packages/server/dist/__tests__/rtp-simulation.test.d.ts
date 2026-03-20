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
export {};
//# sourceMappingURL=rtp-simulation.test.d.ts.map