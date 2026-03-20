/**
 * ProvablyFair — Deterministic crash point generation using HMAC-SHA256.
 *
 * Flow:
 * 1. Server generates random serverSeed, publishes SHA-256(serverSeed) as commitment
 * 2. Crash point is computed: HMAC-SHA256(serverSeed, clientSeed:nonce) → [0,1) → CrashMath
 * 3. After round, serverSeed is revealed for verification
 */
import crypto from 'node:crypto';
export class ProvablyFair {
    crashMath;
    constructor(crashMath) {
        this.crashMath = crashMath;
    }
    /** Generate a cryptographically secure server seed (32 bytes hex) */
    generateServerSeed() {
        return crypto.randomBytes(32).toString('hex');
    }
    /** SHA-256 hash of a seed (used as commitment before round starts) */
    hashSeed(seed) {
        return crypto.createHash('sha256').update(seed).digest('hex');
    }
    /**
     * Generate a deterministic random value in [0, 1) from seed pair + nonce.
     * Uses HMAC-SHA256, takes first 8 hex chars (32 bits) → divide by 2^32.
     */
    generateRandomValue(serverSeed, clientSeed, nonce) {
        const hmac = crypto
            .createHmac('sha256', serverSeed)
            .update(`${clientSeed}:${nonce}`)
            .digest('hex');
        const intValue = parseInt(hmac.substring(0, 8), 16);
        return intValue / 0x100000000;
    }
    /**
     * One-shot: generate the crash point for a round.
     */
    generateCrashPoint(serverSeed, clientSeed, nonce, rtp, volatility) {
        const randomValue = this.generateRandomValue(serverSeed, clientSeed, nonce);
        return this.crashMath.calculateCrashPoint(randomValue, rtp, volatility);
    }
    /**
     * Verify a past round: recompute hash and crash point.
     */
    verify(serverSeed, clientSeed, nonce, rtp, volatility) {
        const computedHash = this.hashSeed(serverSeed);
        const computedCrashPoint = this.generateCrashPoint(serverSeed, clientSeed, nonce, rtp, volatility);
        return { computedHash, computedCrashPoint };
    }
}
//# sourceMappingURL=ProvablyFair.js.map