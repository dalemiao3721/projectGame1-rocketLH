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
export declare function sha256(message: string): Promise<string>;
/** Verify that a server seed matches its previously committed hash */
export declare function verifyServerSeed(serverSeed: string, expectedHash: string): Promise<boolean>;
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
export declare function computeCrashPoint(serverSeed: string, clientSeed: string, nonce: number, rtp?: number, volatility?: number): Promise<number>;
//# sourceMappingURL=fairness.d.ts.map