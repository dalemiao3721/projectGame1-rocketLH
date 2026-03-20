/**
 * CrashMath — RTP + Volatility crash point generator
 *
 * Uses Beta distribution inverse CDF to shape the multiplier distribution
 * based on volatility level, then applies the RTP-based crash formula.
 */
/** Beta distribution parameters per volatility level */
const VOLATILITY_PARAMS = {
    1: { alpha: 1.0, beta: 2.0 }, // Low: skews random values high → low crash points → stable, conservative
    2: { alpha: 1.0, beta: 1.5 }, // Medium-low
    3: { alpha: 1.0, beta: 1.0 }, // Medium: uniform (default)
    4: { alpha: 1.5, beta: 1.0 }, // High: skews random values low → more high multipliers possible
    5: { alpha: 2.0, beta: 1.0 }, // Extreme: long tail, frequent instant crashes but huge potential
};
export class CrashMath {
    /**
     * Calculate crash point from a deterministic random value.
     *
     * Formula: crashPoint = rtp / (1 - betaInvCDF(randomValue, alpha, beta))
     * Minimum crash point is 1.00x.
     */
    calculateCrashPoint(randomValue, rtp, volatility) {
        const rtpDecimal = rtp / 100;
        const params = VOLATILITY_PARAMS[volatility];
        if (!params)
            throw new Error(`Invalid volatility level: ${volatility}`);
        const adjusted = this.betaInverseCDF(randomValue, params.alpha, params.beta);
        // Guard: if adjusted >= 1, crash instantly at 1.00
        if (adjusted >= 1)
            return 1.0;
        const crashPoint = rtpDecimal / (1 - adjusted);
        return Math.max(1.0, Math.floor(crashPoint * 100) / 100);
    }
    /**
     * Survival probability: P(crash > target)
     * Used for display and RTP verification.
     */
    survivalProbability(targetMultiplier, rtp, volatility) {
        if (targetMultiplier <= 1.0)
            return 1.0;
        const rtpDecimal = rtp / 100;
        const rawP = 1 - rtpDecimal / targetMultiplier;
        if (rawP <= 0)
            return 1.0;
        if (rawP >= 1)
            return 0.0;
        const params = VOLATILITY_PARAMS[volatility];
        if (!params)
            return 0;
        return 1 - this.betaCDF(rawP, params.alpha, params.beta);
    }
    /**
     * Beta distribution CDF using the regularized incomplete beta function.
     * I_x(a, b) = B(x; a, b) / B(a, b)
     */
    betaCDF(x, alpha, beta) {
        if (x <= 0)
            return 0;
        if (x >= 1)
            return 1;
        // Uniform shortcut
        if (alpha === 1 && beta === 1)
            return x;
        return this.regularizedBeta(x, alpha, beta);
    }
    /**
     * Beta distribution inverse CDF (quantile function).
     * Uses Newton-Raphson iteration to find x such that betaCDF(x, a, b) = p.
     */
    betaInverseCDF(p, alpha, beta) {
        if (p <= 0)
            return 0;
        if (p >= 1)
            return 1;
        if (alpha === 1 && beta === 1)
            return p;
        // Initial guess using approximation
        let x = p;
        // Power-function shortcut for (1, beta) and (alpha, 1)
        if (alpha === 1) {
            // CDF = 1 - (1-x)^beta => invCDF = 1 - (1-p)^(1/beta)
            return 1 - Math.pow(1 - p, 1 / beta);
        }
        if (beta === 1) {
            // CDF = x^alpha => invCDF = p^(1/alpha)
            return Math.pow(p, 1 / alpha);
        }
        // Newton-Raphson for general case
        for (let i = 0; i < 50; i++) {
            const cdf = this.betaCDF(x, alpha, beta);
            const pdf = this.betaPDF(x, alpha, beta);
            if (pdf < 1e-15)
                break;
            const dx = (cdf - p) / pdf;
            x = x - dx;
            x = Math.max(1e-10, Math.min(1 - 1e-10, x));
            if (Math.abs(dx) < 1e-12)
                break;
        }
        return x;
    }
    /** Beta distribution PDF: f(x) = x^(a-1) * (1-x)^(b-1) / B(a,b) */
    betaPDF(x, alpha, beta) {
        if (x <= 0 || x >= 1)
            return 0;
        const logPdf = (alpha - 1) * Math.log(x) +
            (beta - 1) * Math.log(1 - x) -
            this.logBeta(alpha, beta);
        return Math.exp(logPdf);
    }
    /** log(B(a, b)) = logGamma(a) + logGamma(b) - logGamma(a+b) */
    logBeta(a, b) {
        return this.logGamma(a) + this.logGamma(b) - this.logGamma(a + b);
    }
    /**
     * Regularized incomplete beta function I_x(a, b).
     * Uses continued fraction (Lentz's method) for convergence.
     */
    regularizedBeta(x, a, b) {
        // Use symmetry: I_x(a,b) = 1 - I_{1-x}(b,a) when x > (a+1)/(a+b+2)
        if (x > (a + 1) / (a + b + 2)) {
            return 1 - this.regularizedBeta(1 - x, b, a);
        }
        const lnBeta = this.logBeta(a, b);
        const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lnBeta) / a;
        // Continued fraction (Lentz's algorithm)
        let f = 1;
        let c = 1;
        let d = 1 - (a + b) * x / (a + 1);
        if (Math.abs(d) < 1e-30)
            d = 1e-30;
        d = 1 / d;
        f = d;
        for (let m = 1; m <= 200; m++) {
            // Even step
            let numerator = m * (b - m) * x / ((a + 2 * m - 1) * (a + 2 * m));
            d = 1 + numerator * d;
            if (Math.abs(d) < 1e-30)
                d = 1e-30;
            c = 1 + numerator / c;
            if (Math.abs(c) < 1e-30)
                c = 1e-30;
            d = 1 / d;
            f *= c * d;
            // Odd step
            numerator = -(a + m) * (a + b + m) * x / ((a + 2 * m) * (a + 2 * m + 1));
            d = 1 + numerator * d;
            if (Math.abs(d) < 1e-30)
                d = 1e-30;
            c = 1 + numerator / c;
            if (Math.abs(c) < 1e-30)
                c = 1e-30;
            d = 1 / d;
            const delta = c * d;
            f *= delta;
            if (Math.abs(delta - 1) < 1e-12)
                break;
        }
        return front * f;
    }
    /**
     * Lanczos approximation of log(Gamma(z)).
     */
    logGamma(z) {
        const g = 7;
        const coefficients = [
            0.99999999999980993,
            676.5203681218851,
            -1259.1392167224028,
            771.32342877765313,
            -176.61502916214059,
            12.507343278686905,
            -0.13857109526572012,
            9.9843695780195716e-6,
            1.5056327351493116e-7,
        ];
        if (z < 0.5) {
            // Reflection formula
            return Math.log(Math.PI / Math.sin(Math.PI * z)) - this.logGamma(1 - z);
        }
        z -= 1;
        let x = coefficients[0];
        for (let i = 1; i < g + 2; i++) {
            x += coefficients[i] / (z + i);
        }
        const t = z + g + 0.5;
        return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
    }
}
/**
 * Multiplier growth curve during flight phase.
 * Exponential model: multiplier = e^(speed * elapsed)
 */
export function calculateMultiplierAtTime(elapsedMs) {
    const speed = 0.00006;
    const multiplier = Math.exp(speed * elapsedMs);
    return Math.floor(multiplier * 100) / 100;
}
//# sourceMappingURL=CrashMath.js.map