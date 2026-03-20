/**
 * CrashMath — RTP + Volatility crash point generator
 *
 * Uses Beta distribution inverse CDF to shape the multiplier distribution
 * based on volatility level, then applies the RTP-based crash formula.
 */
export declare class CrashMath {
    /**
     * Calculate crash point from a deterministic random value.
     *
     * Formula: crashPoint = rtp / (1 - betaInvCDF(randomValue, alpha, beta))
     * Minimum crash point is 1.00x.
     */
    calculateCrashPoint(randomValue: number, rtp: number, volatility: number): number;
    /**
     * Survival probability: P(crash > target)
     * Used for display and RTP verification.
     */
    survivalProbability(targetMultiplier: number, rtp: number, volatility: number): number;
    /**
     * Beta distribution CDF using the regularized incomplete beta function.
     * I_x(a, b) = B(x; a, b) / B(a, b)
     */
    betaCDF(x: number, alpha: number, beta: number): number;
    /**
     * Beta distribution inverse CDF (quantile function).
     * Uses Newton-Raphson iteration to find x such that betaCDF(x, a, b) = p.
     */
    betaInverseCDF(p: number, alpha: number, beta: number): number;
    /** Beta distribution PDF: f(x) = x^(a-1) * (1-x)^(b-1) / B(a,b) */
    private betaPDF;
    /** log(B(a, b)) = logGamma(a) + logGamma(b) - logGamma(a+b) */
    private logBeta;
    /**
     * Regularized incomplete beta function I_x(a, b).
     * Uses continued fraction (Lentz's method) for convergence.
     */
    private regularizedBeta;
    /**
     * Lanczos approximation of log(Gamma(z)).
     */
    private logGamma;
}
/**
 * Multiplier growth curve during flight phase.
 * Exponential model: multiplier = e^(speed * elapsed)
 */
export declare function calculateMultiplierAtTime(elapsedMs: number): number;
//# sourceMappingURL=CrashMath.d.ts.map