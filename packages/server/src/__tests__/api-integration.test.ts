/**
 * Integration tests for Game API — exercises the full flow
 * through CrashEngine methods (same logic as API endpoints).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CrashEngine, GameError } from '../engine/CrashEngine.js'
import { validatePlaceBet, validateCashout, validateVerify } from '../middleware/validation.js'

let testCounter = 0
function uniquePlayer() {
  return `api-test-player-${++testCounter}-${Date.now()}`
}

describe('API Integration (via CrashEngine)', () => {
  let engine: CrashEngine

  beforeEach(() => {
    vi.useFakeTimers()
    CrashEngine.resetInstance()
    engine = CrashEngine.getInstance()
  })

  afterEach(() => {
    engine.stop()
    CrashEngine.resetInstance()
    vi.useRealTimers()
  })

  function startAndAdvanceToBetting() {
    engine.start()
    vi.advanceTimersByTime(5001)
  }

  // ── Full game flow ────────────────────────────────────

  describe('complete game cycle', () => {
    it('bet → fly → cashout → balance correct', async () => {
      startAndAdvanceToBetting()
      const playerId = uniquePlayer()
      const balanceBefore = await engine.getPlayerBalance(playerId)

      const bet = await engine.placeBet({ playerId, panelId: 'A', betAmount: 100 })
      expect(await engine.getPlayerBalance(playerId)).toBe(balanceBefore - 100)

      vi.advanceTimersByTime(8001) // → FLYING

      const state = engine.getRoundState()
      if (state.phase === 'FLYING') {
        const cashout = await engine.cashout({
          playerId,
          panelId: 'A',
          sessionId: bet.sessionId,
        })

        expect(cashout.payout).toBeGreaterThan(0)
        expect(await engine.getPlayerBalance(playerId)).toBe(balanceBefore - 100 + cashout.payout)
      } else {
        // Crash happened immediately (low crash point) — balance stays debited
        expect(await engine.getPlayerBalance(playerId)).toBe(balanceBefore - 100)
      }
    })

    it('bet → fly → crash → lost (balance reduced)', async () => {
      startAndAdvanceToBetting()
      const playerId = uniquePlayer()
      const balanceBefore = await engine.getPlayerBalance(playerId)

      await engine.placeBet({ playerId, panelId: 'A', betAmount: 100 })

      vi.advanceTimersByTime(8001) // → FLYING
      vi.advanceTimersByTime(120000) // Force crash

      expect(await engine.getPlayerBalance(playerId)).toBe(balanceBefore - 100)
    })
  })

  // ── Multi-panel operation ─────────────────────────────

  describe('four-panel operation', () => {
    it('four panels: A cashout, B cashout, C lost, D lost', async () => {
      startAndAdvanceToBetting()
      const playerId = uniquePlayer()

      const bets = []
      for (const panelId of ['A', 'B', 'C', 'D'] as const) {
        bets.push(await engine.placeBet({ playerId, panelId, betAmount: 50 }))
      }

      vi.advanceTimersByTime(8001) // → FLYING

      const cashA = await engine.cashout({ playerId, panelId: 'A', sessionId: bets[0].sessionId })
      const cashB = await engine.cashout({ playerId, panelId: 'B', sessionId: bets[1].sessionId })

      expect(cashA.payout).toBeGreaterThan(0)
      expect(cashB.payout).toBeGreaterThan(0)

      vi.advanceTimersByTime(120000) // Force crash — C and D lost

      const expected = 1000 - 200 + cashA.payout + cashB.payout
      expect(await engine.getPlayerBalance(playerId)).toBe(expected)
    })
  })

  // ── Auto-cashout mechanism ────────────────────────────

  describe('auto-cashout', () => {
    it('triggers auto-cashout at specified multiplier', async () => {
      const spy = vi.fn()
      engine.on('auto_cashout_triggered', spy)

      startAndAdvanceToBetting()
      const playerId = uniquePlayer()
      await engine.placeBet({
        playerId,
        panelId: 'A',
        betAmount: 100,
        autoCashout: 1.01,
      })

      vi.advanceTimersByTime(8001) // → FLYING
      vi.advanceTimersByTime(2000) // Enough for multiplier to reach 1.01

      expect(spy).toHaveBeenCalled()
      const [panelId, , multiplier, payout] = spy.mock.calls[0]
      expect(panelId).toBe('A')
      expect(multiplier).toBe(1.01)
      expect(payout).toBeGreaterThan(0)
    })
  })

  // ── Phase guard validation ────────────────────────────

  describe('phase guards', () => {
    it('rejects bet in WAITING phase', async () => {
      engine.start()
      const playerId = uniquePlayer()
      await expect(
        engine.placeBet({ playerId, panelId: 'A', betAmount: 100 })
      ).rejects.toThrow(GameError)
    })

    it('rejects bet in FLYING phase', async () => {
      startAndAdvanceToBetting()
      vi.advanceTimersByTime(8001)
      const playerId = uniquePlayer()
      await expect(
        engine.placeBet({ playerId, panelId: 'A', betAmount: 100 })
      ).rejects.toThrow(GameError)
    })

    it('rejects cashout in BETTING phase', async () => {
      startAndAdvanceToBetting()
      const playerId = uniquePlayer()
      const bet = await engine.placeBet({ playerId, panelId: 'A', betAmount: 100 })
      await expect(
        engine.cashout({ playerId, panelId: 'A', sessionId: bet.sessionId })
      ).rejects.toThrow(GameError)
    })

    it('rejects cashout in WAITING phase', async () => {
      engine.start()
      const playerId = uniquePlayer()
      await expect(
        engine.cashout({ playerId, panelId: 'A', sessionId: 'fake' })
      ).rejects.toThrow(GameError)
    })
  })

  // ── Validation middleware ─────────────────────────────

  describe('validation middleware', () => {
    function mockReq(body: any = {}, query: any = {}) {
      return { body, query } as any
    }
    function mockRes() {
      return {} as any
    }

    describe('validatePlaceBet', () => {
      it('passes for valid input', () => {
        const next = vi.fn()
        validatePlaceBet(
          mockReq({ playerId: 'p1', panelId: 'A', betAmount: 100 }),
          mockRes(),
          next
        )
        expect(next).toHaveBeenCalledWith()
      })

      it('rejects missing playerId', () => {
        const next = vi.fn()
        validatePlaceBet(
          mockReq({ panelId: 'A', betAmount: 100 }),
          mockRes(),
          next
        )
        expect(next).toHaveBeenCalledWith(expect.any(GameError))
      })

      it('rejects invalid panelId', () => {
        const next = vi.fn()
        validatePlaceBet(
          mockReq({ playerId: 'p1', panelId: 'X', betAmount: 100 }),
          mockRes(),
          next
        )
        expect(next).toHaveBeenCalledWith(expect.any(GameError))
      })

      it('rejects non-numeric betAmount', () => {
        const next = vi.fn()
        validatePlaceBet(
          mockReq({ playerId: 'p1', panelId: 'A', betAmount: 'abc' }),
          mockRes(),
          next
        )
        expect(next).toHaveBeenCalledWith(expect.any(GameError))
      })

      it('rejects autoCashout below MIN_AUTO_CASHOUT', () => {
        const next = vi.fn()
        validatePlaceBet(
          mockReq({ playerId: 'p1', panelId: 'A', betAmount: 100, autoCashout: 0.5 }),
          mockRes(),
          next
        )
        expect(next).toHaveBeenCalledWith(expect.any(GameError))
      })
    })

    describe('validateCashout', () => {
      it('passes for valid input', () => {
        const next = vi.fn()
        validateCashout(
          mockReq({ playerId: 'p1', panelId: 'A', sessionId: 'S-1' }),
          mockRes(),
          next
        )
        expect(next).toHaveBeenCalledWith()
      })

      it('rejects missing sessionId', () => {
        const next = vi.fn()
        validateCashout(
          mockReq({ playerId: 'p1', panelId: 'A' }),
          mockRes(),
          next
        )
        expect(next).toHaveBeenCalledWith(expect.any(GameError))
      })
    })

    describe('validateVerify', () => {
      it('passes for valid query params', () => {
        const next = vi.fn()
        validateVerify(
          mockReq({}, { serverSeed: 'seed', clientSeed: 'client', nonce: '1' }),
          mockRes(),
          next
        )
        expect(next).toHaveBeenCalledWith()
      })

      it('rejects missing serverSeed', () => {
        const next = vi.fn()
        validateVerify(
          mockReq({}, { clientSeed: 'client', nonce: '1' }),
          mockRes(),
          next
        )
        expect(next).toHaveBeenCalledWith(expect.any(GameError))
      })

      it('rejects non-numeric nonce', () => {
        const next = vi.fn()
        validateVerify(
          mockReq({}, { serverSeed: 'seed', clientSeed: 'client', nonce: 'abc' }),
          mockRes(),
          next
        )
        expect(next).toHaveBeenCalledWith(expect.any(GameError))
      })
    })
  })

  // ── History & verify ──────────────────────────────────

  describe('history', () => {
    it('records rounds after crash', () => {
      engine.start()
      vi.advanceTimersByTime(5001 + 8001 + 120000 + 3001)

      const history = engine.getHistory()
      expect(history.length).toBeGreaterThanOrEqual(1)
      expect(history[0].sessionId).toMatch(/^SESSION-LH-/)
      expect(history[0].crashMultiplier).toBeGreaterThanOrEqual(1.0)
    })

    it('respects limit parameter', () => {
      expect(engine.getHistory(5).length).toBeLessThanOrEqual(5)
    })
  })

  describe('verifyFairness', () => {
    it('returns deterministic verification', () => {
      const r1 = engine.verifyFairness({ serverSeed: 's1', clientSeed: 'c1', nonce: 1 })
      const r2 = engine.verifyFairness({ serverSeed: 's1', clientSeed: 'c1', nonce: 1 })
      expect(r1).toEqual(r2)
    })

    it('different seeds produce different results', () => {
      const r1 = engine.verifyFairness({ serverSeed: 'seed-a', clientSeed: 'c1', nonce: 1 })
      const r2 = engine.verifyFairness({ serverSeed: 'seed-b', clientSeed: 'c1', nonce: 1 })
      expect(r1.computedHash).not.toBe(r2.computedHash)
    })
  })
})
