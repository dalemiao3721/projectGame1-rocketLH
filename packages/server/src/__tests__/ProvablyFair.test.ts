import { describe, it, expect } from 'vitest'
import { CrashMath } from '../engine/CrashMath.js'
import { ProvablyFair } from '../engine/ProvablyFair.js'

const crashMath = new CrashMath()
const pf = new ProvablyFair(crashMath)

// ─────────────────────────────────────────────────────────────
// 1. generateServerSeed
// ─────────────────────────────────────────────────────────────

describe('ProvablyFair.generateServerSeed', () => {
  it('returns a 64-character hex string (32 bytes)', () => {
    const seed = pf.generateServerSeed()
    expect(seed).toMatch(/^[0-9a-f]{64}$/)
  })

  it('generates unique seeds each time', () => {
    const seeds = new Set(Array.from({ length: 50 }, () => pf.generateServerSeed()))
    expect(seeds.size).toBe(50)
  })
})

// ─────────────────────────────────────────────────────────────
// 2. hashSeed
// ─────────────────────────────────────────────────────────────

describe('ProvablyFair.hashSeed', () => {
  it('returns a 64-character hex string (SHA-256)', () => {
    const hash = pf.hashSeed('test-seed')
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('is deterministic', () => {
    const seed = 'my-fixed-seed'
    expect(pf.hashSeed(seed)).toBe(pf.hashSeed(seed))
  })

  it('differs for different seeds', () => {
    expect(pf.hashSeed('seed-a')).not.toBe(pf.hashSeed('seed-b'))
  })
})

// ─────────────────────────────────────────────────────────────
// 3. generateRandomValue
// ─────────────────────────────────────────────────────────────

describe('ProvablyFair.generateRandomValue', () => {
  it('returns a value in [0, 1)', () => {
    for (let nonce = 0; nonce < 100; nonce++) {
      const val = pf.generateRandomValue('server-seed', 'client-seed', nonce)
      expect(val).toBeGreaterThanOrEqual(0)
      expect(val).toBeLessThan(1)
    }
  })

  it('is deterministic: same inputs → same output', () => {
    const a = pf.generateRandomValue('seed1', 'seed2', 42)
    const b = pf.generateRandomValue('seed1', 'seed2', 42)
    expect(a).toBe(b)
  })

  it('differs with different server seeds', () => {
    const a = pf.generateRandomValue('seed-a', 'client', 1)
    const b = pf.generateRandomValue('seed-b', 'client', 1)
    expect(a).not.toBe(b)
  })

  it('differs with different client seeds', () => {
    const a = pf.generateRandomValue('server', 'client-a', 1)
    const b = pf.generateRandomValue('server', 'client-b', 1)
    expect(a).not.toBe(b)
  })

  it('differs with different nonces', () => {
    const a = pf.generateRandomValue('server', 'client', 1)
    const b = pf.generateRandomValue('server', 'client', 2)
    expect(a).not.toBe(b)
  })
})

// ─────────────────────────────────────────────────────────────
// 4. generateCrashPoint
// ─────────────────────────────────────────────────────────────

describe('ProvablyFair.generateCrashPoint', () => {
  it('returns a crash point >= 1.00', () => {
    for (let i = 0; i < 100; i++) {
      const seed = pf.generateServerSeed()
      const cp = pf.generateCrashPoint(seed, 'client', i, 97, 3)
      expect(cp).toBeGreaterThanOrEqual(1.0)
    }
  })

  it('is deterministic: same seeds + nonce → same crash point', () => {
    const a = pf.generateCrashPoint('fixed-server', 'fixed-client', 10, 96, 2)
    const b = pf.generateCrashPoint('fixed-server', 'fixed-client', 10, 96, 2)
    expect(a).toBe(b)
  })

  it('produces different crash points for different nonces', () => {
    const results = new Set<number>()
    for (let i = 0; i < 50; i++) {
      results.add(pf.generateCrashPoint('server-seed', 'client-seed', i, 97, 3))
    }
    // Not all 50 will be unique (some may collide at 1.00), but most should differ
    expect(results.size).toBeGreaterThan(10)
  })
})

// ─────────────────────────────────────────────────────────────
// 5. verify (round-trip: Seed → Hash → CrashPoint consistency)
// ─────────────────────────────────────────────────────────────

describe('ProvablyFair.verify', () => {
  it('computedHash matches hashSeed(serverSeed)', () => {
    const serverSeed = pf.generateServerSeed()
    const expectedHash = pf.hashSeed(serverSeed)
    const result = pf.verify(serverSeed, 'client', 1, 97, 3)
    expect(result.computedHash).toBe(expectedHash)
  })

  it('computedCrashPoint matches generateCrashPoint()', () => {
    const serverSeed = pf.generateServerSeed()
    const expectedCrashPoint = pf.generateCrashPoint(serverSeed, 'client', 5, 96, 2)
    const result = pf.verify(serverSeed, 'client', 5, 96, 2)
    expect(result.computedCrashPoint).toBe(expectedCrashPoint)
  })

  it('end-to-end: pre-commitment hash matches post-reveal verification', () => {
    // Simulate a full round
    const serverSeed = pf.generateServerSeed()
    const preCommitHash = pf.hashSeed(serverSeed)

    // ... round plays out ...

    // Post-round verification
    const { computedHash, computedCrashPoint } = pf.verify(
      serverSeed, 'default_client_seed', 1, 97, 3
    )

    // The hash published before the round MUST match
    expect(computedHash).toBe(preCommitHash)
    expect(computedCrashPoint).toBeGreaterThanOrEqual(1.0)
  })
})
