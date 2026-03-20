/**
 * ProvablyFair — Deterministic crash point generation using HMAC-SHA256.
 *
 * Flow:
 * 1. Server generates random serverSeed, publishes SHA-256(serverSeed) as commitment
 * 2. Crash point is computed: HMAC-SHA256(serverSeed, clientSeed:nonce) → [0,1) → CrashMath
 * 3. After round, serverSeed is revealed for verification
 */
import { CrashMath } from './CrashMath.js';
export declare class ProvablyFair {
    private crashMath;
    constructor(crashMath: CrashMath);
    /** Generate a cryptographically secure server seed (32 bytes hex) */
    generateServerSeed(): string;
    /** SHA-256 hash of a seed (used as commitment before round starts) */
    hashSeed(seed: string): string;
    /**
     * Generate a deterministic random value in [0, 1) from seed pair + nonce.
     * Uses HMAC-SHA256, takes first 8 hex chars (32 bits) → divide by 2^32.
     */
    generateRandomValue(serverSeed: string, clientSeed: string, nonce: number): number;
    /**
     * One-shot: generate the crash point for a round.
     */
    generateCrashPoint(serverSeed: string, clientSeed: string, nonce: number, rtp: number, volatility: number): number;
    /**
     * Verify a past round: recompute hash and crash point.
     */
    verify(serverSeed: string, clientSeed: string, nonce: number, rtp: number, volatility: number): {
        computedHash: string;
        computedCrashPoint: number;
    };
}
//# sourceMappingURL=ProvablyFair.d.ts.map