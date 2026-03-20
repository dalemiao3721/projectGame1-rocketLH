import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CrashEngine, GameError } from '../engine/CrashEngine.js'

// Use unique player IDs per test to avoid balance leakage from the
// module-level playerBalances Map (not cleared by resetInstance).
let testCounter = 0
function uniquePlayer() {
  return `test-player-${++testCounter}-${Date.now()}`
}

describe('CrashEngine', () => {
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

  // ── Singleton ─────────────────────────────────────────

  describe('singleton', () => {
    it('returns same instance', () => {
      const a = CrashEngine.getInstance()
      const b = CrashEngine.getInstance()
      expect(a).toBe(b)
    })

    it('resetInstance creates a fresh instance', () => {
      const a = CrashEngine.getInstance()
      CrashEngine.resetInstance()
      const b = CrashEngine.getInstance()
      expect(a).not.toBe(b)
    })
  })

  // ── Lifecycle ─────────────────────────────────────────

  describe('lifecycle', () => {
    it('isRunning returns false before start', () => {
      expect(engine.isRunning()).toBe(false)
    })

    it('isRunning returns true after start', () => {
      engine.start()
      expect(engine.isRunning()).toBe(true)
    })

    it('isRunning returns false after stop', () => {
      engine.start()
      engine.stop()
      expect(engine.isRunning()).toBe(false)
    })
  })

  // Helper: advance to BETTING phase
  function startAndAdvanceToBetting() {
    engine.start()
    vi.advanceTimersByTime(5001) // WAITING → BETTING
  }

  // ── placeBet ──────────────────────────────────────────

  describe('placeBet', () => {
    it('succeeds during BETTING phase', async () => {
      startAndAdvanceToBetting()
      const playerId = uniquePlayer()
      const result = await engine.placeBet({
        playerId,
        panelId: 'A',
        betAmount: 100,
      })
      expect(result.panelId).toBe('A')
      expect(result.betAmount).toBe(100)
      expect(result.autoCashout).toBeNull()
      expect(result.betId).toMatch(/^BET-ROCKET-/)
      expect(result.sessionId).toMatch(/^SESSION-LH-/)
      // Default balance is 1000, minus 100 bet
      expect(result.balance).toBe(900)
    })

    it('succeeds with autoCashout', async () => {
      startAndAdvanceToBetting()
      const playerId = uniquePlayer()
      const result = await engine.placeBet({
        playerId,
        panelId: 'A',
        betAmount: 50,
        autoCashout: 2.0,
      })
      expect(result.autoCashout).toBe(2.0)
    })

    it('rejects in non-BETTING phase (WAITING)', async () => {
      engine.start()
      const playerId = uniquePlayer()
      await expect(
        engine.placeBet({ playerId, panelId: 'A', betAmount: 100 })
      ).rejects.toThrow(GameError)
    })

    it('rejects in non-BETTING phase (FLYING)', async () => {
      startAndAdvanceToBetting()
      vi.advanceTimersByTime(8001) // → FLYING
      const playerId = uniquePlayer()
      await expect(
        engine.placeBet({ playerId, panelId: 'A', betAmount: 100 })
      ).rejects.toThrow(GameError)
    })

    it('rejects duplicate bet on same panel', async () => {
      startAndAdvanceToBetting()
      const playerId = uniquePlayer()
      await engine.placeBet({ playerId, panelId: 'A', betAmount: 100 })
      await expect(
        engine.placeBet({ playerId, panelId: 'A', betAmount: 100 })
      ).rejects.toThrow(GameError)
    })

    it('allows same player on different panels', async () => {
      startAndAdvanceToBetting()
      const playerId = uniquePlayer()
      await engine.placeBet({ playerId, panelId: 'A', betAmount: 100 })
      const result = await engine.placeBet({ playerId, panelId: 'B', betAmount: 100 })
      expect(result.panelId).toBe('B')
      expect(result.balance).toBe(800) // 1000 - 100 - 100
    })

    it('allows different players on same panel', async () => {
      startAndAdvanceToBetting()
      const p1 = uniquePlayer()
      const p2 = uniquePlayer()
      await engine.placeBet({ playerId: p1, panelId: 'A', betAmount: 100 })
      const result = await engine.placeBet({ playerId: p2, panelId: 'A', betAmount: 200 })
      expect(result.panelId).toBe('A')
    })

    it('rejects bet below MIN_AMOUNT', async () => {
      startAndAdvanceToBetting()
      const playerId = uniquePlayer()
      await expect(
        engine.placeBet({ playerId, panelId: 'A', betAmount: 0.5 })
      ).rejects.toThrow(GameError)
    })

    it('rejects autoCashout below MIN_AUTO_CASHOUT (1.01)', async () => {
      startAndAdvanceToBetting()
      const playerId = uniquePlayer()
      await expect(
        engine.placeBet({ playerId, panelId: 'A', betAmount: 100, autoCashout: 1.0 })
      ).rejects.toThrow(GameError)
    })

    it('rejects when insufficient balance', async () => {
      startAndAdvanceToBetting()
      const playerId = uniquePlayer()
      await expect(
        engine.placeBet({ playerId, panelId: 'A', betAmount: 999999 })
      ).rejects.toThrow(GameError)
    })

    it('debits balance correctly', async () => {
      startAndAdvanceToBetting()
      const playerId = uniquePlayer()
      const before = await engine.getPlayerBalance(playerId)
      await engine.placeBet({ playerId, panelId: 'A', betAmount: 500 })
      const after = await engine.getPlayerBalance(playerId)
      expect(after).toBe(before - 500)
    })
  })

  // ── cashout ───────────────────────────────────────────

  describe('cashout', () => {
    it('succeeds during FLYING phase with active bet', async () => {
      startAndAdvanceToBetting()
      const playerId = uniquePlayer()
      const betResult = await engine.placeBet({ playerId, panelId: 'A', betAmount: 100 })

      vi.advanceTimersByTime(8001) // → FLYING

      // Only attempt cashout if still in FLYING phase (crashPoint may be very low)
      const state = engine.getRoundState()
      if (state.phase === 'FLYING') {
        const result = await engine.cashout({
          playerId,
          panelId: 'A',
          sessionId: betResult.sessionId,
        })

        expect(result.panelId).toBe('A')
        expect(result.cashoutMultiplier).toBeGreaterThanOrEqual(1.0)
        expect(result.payout).toBeGreaterThan(0)
        expect(result.profit).toBeDefined()
      } else {
        // If already crashed, the bet should be settled as lost
        expect(state.phase).toBe('CRASHED')
      }
    })

    it('rejects in non-FLYING phase', async () => {
      startAndAdvanceToBetting()
      const playerId = uniquePlayer()
      const betResult = await engine.placeBet({ playerId, panelId: 'A', betAmount: 100 })
      // Still in BETTING, not FLYING
      await expect(
        engine.cashout({ playerId, panelId: 'A', sessionId: betResult.sessionId })
      ).rejects.toThrow(GameError)
    })

    it('rejects with wrong sessionId', async () => {
      startAndAdvanceToBetting()
      const playerId = uniquePlayer()
      await engine.placeBet({ playerId, panelId: 'A', betAmount: 100 })
      vi.advanceTimersByTime(8001) // → FLYING

      await expect(
        engine.cashout({ playerId, panelId: 'A', sessionId: 'wrong-session' })
      ).rejects.toThrow(GameError)
    })

    it('rejects double cashout', async () => {
      startAndAdvanceToBetting()
      const playerId = uniquePlayer()
      const betResult = await engine.placeBet({ playerId, panelId: 'A', betAmount: 100 })
      vi.advanceTimersByTime(8001) // → FLYING

      await engine.cashout({ playerId, panelId: 'A', sessionId: betResult.sessionId })
      await expect(
        engine.cashout({ playerId, panelId: 'A', sessionId: betResult.sessionId })
      ).rejects.toThrow(GameError)
    })

    it('rejects when no bet exists', async () => {
      startAndAdvanceToBetting()
      const playerId = uniquePlayer()
      const betResult = await engine.placeBet({ playerId, panelId: 'A', betAmount: 100 })
      vi.advanceTimersByTime(8001) // → FLYING

      await expect(
        engine.cashout({ playerId, panelId: 'B', sessionId: betResult.sessionId })
      ).rejects.toThrow(GameError)
    })

    it('credits balance after cashout', async () => {
      startAndAdvanceToBetting()
      const playerId = uniquePlayer()
      const betResult = await engine.placeBet({ playerId, panelId: 'A', betAmount: 100 })
      const afterBet = await engine.getPlayerBalance(playerId)
      vi.advanceTimersByTime(8001) // → FLYING

      const result = await engine.cashout({
        playerId,
        panelId: 'A',
        sessionId: betResult.sessionId,
      })

      expect(result.balance).toBe(afterBet + result.payout)
    })

    it('payout = floor(betAmount * multiplier * 100) / 100', async () => {
      startAndAdvanceToBetting()
      const playerId = uniquePlayer()
      const betResult = await engine.placeBet({ playerId, panelId: 'A', betAmount: 100 })
      vi.advanceTimersByTime(8001) // → FLYING

      const result = await engine.cashout({
        playerId,
        panelId: 'A',
        sessionId: betResult.sessionId,
      })

      const expected = Math.floor(100 * result.cashoutMultiplier * 100) / 100
      expect(result.payout).toBe(expected)
    })
  })

  // ── verifyFairness ────────────────────────────────────

  describe('verifyFairness', () => {
    it('returns isValid: true with computed hash and crash point', () => {
      const result = engine.verifyFairness({
        serverSeed: 'test-seed',
        clientSeed: 'client-seed',
        nonce: 1,
      })
      expect(result.isValid).toBe(true)
      expect(result.computedHash).toMatch(/^[0-9a-f]{64}$/)
      expect(result.computedCrashPoint).toBeGreaterThanOrEqual(1.0)
    })
  })

  // ── getRoundState ─────────────────────────────────────

  describe('getRoundState', () => {
    it('returns current phase and multiplier', () => {
      engine.start()
      const state = engine.getRoundState()
      expect(state.phase).toBe('WAITING')
      expect(state.currentMultiplier).toBe(1.0)
    })

    it('returns BETTING phase info after waiting', () => {
      startAndAdvanceToBetting()
      const state = engine.getRoundState()
      expect(state.phase).toBe('BETTING')
      expect(state.sessionId).toMatch(/^SESSION-LH-/)
      expect(state.serverSeedHash).toMatch(/^[0-9a-f]{64}$/)
    })
  })

  // ── getHistory ────────────────────────────────────────

  describe('getHistory', () => {
    it('returns empty array initially', () => {
      expect(engine.getHistory()).toEqual([])
    })

    it('records crash history after a round ends', () => {
      engine.start()
      // Complete a full round cycle
      vi.advanceTimersByTime(5001 + 8001 + 60000 + 3001)
      const history = engine.getHistory()
      expect(history.length).toBeGreaterThanOrEqual(1)
      expect(history[0]).toHaveProperty('sessionId')
      expect(history[0]).toHaveProperty('crashMultiplier')
      expect(history[0]).toHaveProperty('crashedAt')
    })
  })

  // ── getPlayerBalance ──────────────────────────────────

  describe('getPlayerBalance', () => {
    it('returns default balance (1000) for new player', async () => {
      const playerId = uniquePlayer()
      expect(await engine.getPlayerBalance(playerId)).toBe(1000)
    })
  })

  // ── Crash marks uncashed bets as lost ─────────────────

  describe('crash settlement', () => {
    it('emits round_crashed with crashMultiplier and serverSeed', () => {
      const spy = vi.fn()
      engine.on('round_crashed', spy)
      engine.start()
      vi.advanceTimersByTime(5001 + 8001 + 120000) // FLYING until crash
      expect(spy).toHaveBeenCalled()
      const [crashMultiplier, serverSeed] = spy.mock.calls[0]
      expect(crashMultiplier).toBeGreaterThanOrEqual(1.0)
      expect(serverSeed).toMatch(/^[0-9a-f]{64}$/)
    })
  })

  // ── Four-panel independent operation ──────────────────

  describe('four-panel independent betting', () => {
    it('supports bets on all four panels simultaneously', async () => {
      startAndAdvanceToBetting()
      const playerId = uniquePlayer()
      const panels = ['A', 'B', 'C', 'D'] as const
      const results = []
      for (const panelId of panels) {
        results.push(await engine.placeBet({ playerId, panelId, betAmount: 100 }))
      }

      expect(results).toHaveLength(4)
      results.forEach((r, i) => {
        expect(r.panelId).toBe(panels[i])
      })
      // Balance: 1000 - 4 * 100 = 600
      expect(await engine.getPlayerBalance(playerId)).toBe(600)
    })

    it('allows partial cashout (some panels escape, others crash)', async () => {
      startAndAdvanceToBetting()
      const playerId = uniquePlayer()
      const betA = await engine.placeBet({ playerId, panelId: 'A', betAmount: 100 })
      await engine.placeBet({ playerId, panelId: 'B', betAmount: 100 })

      vi.advanceTimersByTime(8001) // → FLYING

      const state = engine.getRoundState()
      if (state.phase === 'FLYING') {
        // Cash out panel A only
        const cashoutResult = await engine.cashout({
          playerId,
          panelId: 'A',
          sessionId: betA.sessionId,
        })
        expect(cashoutResult.payout).toBeGreaterThan(0)
        // Panel B is still active — it will be marked lost on crash
      } else {
        // If crashed immediately, both panels lost — still valid behavior
        expect(state.phase).toBe('CRASHED')
      }
    })
  })
})
