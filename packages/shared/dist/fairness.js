/**
 * Provably Fair verification utilities (shared between server and client).
 *
 * Players can use these functions to independently verify that:
 * 1. The server seed hash matches the revealed server seed
 * 2. The crash point can be deterministically recomputed
 *
 * Uses Web Crypto API (works in both browser and Node.js 18+).
 */
/** Compute SHA-256 hash of a string */
export async function sha256(message) {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
/** Verify that a server seed matches its previously committed hash */
export async function verifyServerSeed(serverSeed, expectedHash) {
    const hash = await sha256(serverSeed);
    return hash === expectedHash;
}
/**
 * Compute HMAC-SHA256 using Web Crypto API.
 */
async function hmacSha256(key, message) {
    const encoder = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey('raw', encoder.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
    return Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0')).join('');
}
// --- Beta distribution math (mirrors server CrashMath exactly) ---
/** Volatility params — must match server configuration */
const VOLATILITY_PARAMS = {
    1: { alpha: 1.0, beta: 2.0 },
    2: { alpha: 1.0, beta: 1.5 },
    3: { alpha: 1.0, beta: 1.0 },
    4: { alpha: 1.5, beta: 1.0 },
    5: { alpha: 2.0, beta: 1.0 },
};
function betaInverseCDF(p, alpha, beta) {
    if (alpha === 1 && beta === 1)
        return p;
    if (alpha === 1)
        return 1 - Math.pow(1 - p, 1 / beta);
    if (beta === 1)
        return Math.pow(p, 1 / alpha);
    // Newton-Raphson for general case
    let x = p;
    for (let i = 0; i < 50; i++) {
        const cdf = betaCDF(x, alpha, beta);
        const pdf = betaPDF(x, alpha, beta);
        if (pdf < 1e-15)
            break;
        const dx = (cdf - p) / pdf;
        x = Math.max(1e-10, Math.min(1 - 1e-10, x - dx));
        if (Math.abs(dx) < 1e-12)
            break;
    }
    return x;
}
function betaCDF(x, a, b) {
    if (x <= 0)
        return 0;
    if (x >= 1)
        return 1;
    if (a === 1 && b === 1)
        return x;
    return regularizedBeta(x, a, b);
}
function betaPDF(x, a, b) {
    if (x <= 0 || x >= 1)
        return 0;
    return Math.exp((a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x) - logBeta(a, b));
}
function logBeta(a, b) {
    return logGamma(a) + logGamma(b) - logGamma(a + b);
}
function regularizedBeta(x, a, b) {
    if (x > (a + 1) / (a + b + 2))
        return 1 - regularizedBeta(1 - x, b, a);
    const lnBeta = logBeta(a, b);
    const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lnBeta) / a;
    let f = 1, c = 1, d = 1 - (a + b) * x / (a + 1);
    if (Math.abs(d) < 1e-30)
        d = 1e-30;
    d = 1 / d;
    f = d;
    for (let m = 1; m <= 200; m++) {
        let num = m * (b - m) * x / ((a + 2 * m - 1) * (a + 2 * m));
        d = 1 + num * d;
        if (Math.abs(d) < 1e-30)
            d = 1e-30;
        c = 1 + num / c;
        if (Math.abs(c) < 1e-30)
            c = 1e-30;
        d = 1 / d;
        f *= c * d;
        num = -(a + m) * (a + b + m) * x / ((a + 2 * m) * (a + 2 * m + 1));
        d = 1 + num * d;
        if (Math.abs(d) < 1e-30)
            d = 1e-30;
        c = 1 + num / c;
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
function logGamma(z) {
    const coeff = [
        0.99999999999980993, 676.5203681218851, -1259.1392167224028,
        771.32342877765313, -176.61502916214059, 12.507343278686905,
        -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
    ];
    if (z < 0.5)
        return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
    z -= 1;
    let x = coeff[0];
    for (let i = 1; i < 9; i++)
        x += coeff[i] / (z + i);
    const t = z + 7.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}
/**
 * Recompute crash point from seeds — client-side verification.
 * Uses the same HMAC-SHA256 + Beta inverse CDF as the server.
 *
 * @param serverSeed - Revealed after round ends
 * @param clientSeed - Player's seed (or default)
 * @param nonce - Round counter
 * @param rtp - RTP setting (94-99)
 * @param volatility - Volatility level (1-5)
 */
export async function computeCrashPoint(serverSeed, clientSeed, nonce, rtp = 96, volatility = 3) {
    const hmac = await hmacSha256(serverSeed, `${clientSeed}:${nonce}`);
    const intValue = parseInt(hmac.substring(0, 8), 16);
    const randomValue = intValue / 0x100000000;
    const rtpDecimal = rtp / 100;
    const params = VOLATILITY_PARAMS[volatility] ?? { alpha: 1, beta: 1 };
    const adjusted = betaInverseCDF(randomValue, params.alpha, params.beta);
    if (adjusted >= 1)
        return 1.0;
    const crashPoint = rtpDecimal / (1 - adjusted);
    return Math.max(1.0, Math.floor(crashPoint * 100) / 100);
}
//# sourceMappingURL=fairness.js.map