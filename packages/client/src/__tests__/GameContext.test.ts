import { describe, it, expect } from 'vitest'
import { gameReducer, initialGameState, type GameAction } from '../context/GameContext.js'
import type { GameState, PanelId } from '@rocket-lh/shared'

function dispatch(state: GameState, action: GameAction): GameState {
  return gameReducer(state, action)
}

describe('gameReducer', () => {
  // ── Round lifecycle actions ───────────────────────────

  describe('ROUND_WAITING', () => {
    it('sets roundPhase to WAITING and resets multiplier/crash state', () => {
      const state = dispatch(initialGameState, {
        type: 'ROUND_WAITING',
        countdown: 5,
      })
      expect(state.roundPhase).toBe('WAITING')
      expect(state.countdown).toBe(5)
      expect(state.currentMultiplier).toBe(1.0)
      expect(state.crashMultiplier).toBeNull()
      expect(state.serverSeed).toBeNull()
    })
  })

  describe('ROUND_BETTING', () => {
    it('sets roundPhase to BETTING with session info', () => {
      const state = dispatch(initialGameState, {
        type: 'ROUND_BETTING',
        sessionId: 'S-1',
        serverSeedHash: 'hash-abc',
        countdown: 8,
      })
      expect(state.roundPhase).toBe('BETTING')
      expect(state.sessionId).toBe('S-1')
      expect(state.serverSeedHash).toBe('hash-abc')
      expect(state.countdown).toBe(8)
    })
  })

  describe('ROUND_FLYING', () => {
    it('sets roundPhase to FLYING, resets countdown and multiplier', () => {
      const prev = { ...initialGameState, countdown: 3, currentMultiplier: 1.5 }
      const state = dispatch(prev, { type: 'ROUND_FLYING' })
      expect(state.roundPhase).toBe('FLYING')
      expect(state.countdown).toBe(0)
      expect(state.currentMultiplier).toBe(1.0)
    })
  })

  describe('ROUND_CRASHED', () => {
    it('sets crashMultiplier, reveals serverSeed, marks bet_placed panels as lost', () => {
      // Setup: panel A has bet, panel B is idle
      let state = { ...initialGameState }
      state = dispatch(state, { type: 'BET_PLACED', panelId: 'A', balance: 900 })

      state = dispatch(state, {
        type: 'ROUND_CRASHED',
        crashMultiplier: 2.5,
        serverSeed: 'revealed-seed',
      })

      expect(state.roundPhase).toBe('CRASHED')
      expect(state.crashMultiplier).toBe(2.5)
      expect(state.currentMultiplier).toBe(2.5)
      expect(state.serverSeed).toBe('revealed-seed')
      expect(state.panels['A'].status).toBe('lost')
      expect(state.panels['B'].status).toBe('idle') // unchanged
    })

    it('does not change cashed_out panels', () => {
      let state = { ...initialGameState }
      state = dispatch(state, { type: 'BET_PLACED', panelId: 'A', balance: 900 })
      state = dispatch(state, {
        type: 'CASHOUT_SUCCESS',
        panelId: 'A',
        multiplier: 1.5,
        payout: 150,
        balance: 1050,
      })
      state = dispatch(state, {
        type: 'ROUND_CRASHED',
        crashMultiplier: 2.0,
        serverSeed: 'seed',
      })
      expect(state.panels['A'].status).toBe('cashed_out')
    })
  })

  describe('ROUND_SETTLED', () => {
    it('sets roundPhase to SETTLED', () => {
      const state = dispatch(initialGameState, { type: 'ROUND_SETTLED' })
      expect(state.roundPhase).toBe('SETTLED')
    })
  })

  // ── Multiplier & Countdown ────────────────────────────

  describe('MULTIPLIER_UPDATE', () => {
    it('updates currentMultiplier', () => {
      const state = dispatch(initialGameState, {
        type: 'MULTIPLIER_UPDATE',
        multiplier: 3.45,
      })
      expect(state.currentMultiplier).toBe(3.45)
    })
  })

  describe('COUNTDOWN_TICK', () => {
    it('updates countdown', () => {
      const state = dispatch(initialGameState, {
        type: 'COUNTDOWN_TICK',
        countdown: 3,
      })
      expect(state.countdown).toBe(3)
    })
  })

  // ── Panel operations ──────────────────────────────────

  describe('SET_BET_AMOUNT', () => {
    it('updates betAmount for specific panel', () => {
      const state = dispatch(initialGameState, {
        type: 'SET_BET_AMOUNT',
        panelId: 'B',
        amount: 250,
      })
      expect(state.panels['B'].betAmount).toBe(250)
      expect(state.panels['A'].betAmount).toBe(initialGameState.panels['A'].betAmount)
    })
  })

  describe('SET_AUTO_CASHOUT', () => {
    it('sets autoCashout for a panel', () => {
      const state = dispatch(initialGameState, {
        type: 'SET_AUTO_CASHOUT',
        panelId: 'C',
        multiplier: 2.5,
      })
      expect(state.panels['C'].autoCashout).toBe(2.5)
    })

    it('clears autoCashout with null', () => {
      let state = dispatch(initialGameState, {
        type: 'SET_AUTO_CASHOUT',
        panelId: 'C',
        multiplier: 2.5,
      })
      state = dispatch(state, {
        type: 'SET_AUTO_CASHOUT',
        panelId: 'C',
        multiplier: null,
      })
      expect(state.panels['C'].autoCashout).toBeNull()
    })
  })

  describe('BET_PLACED', () => {
    it('sets panel status to bet_placed and updates balance', () => {
      const state = dispatch(initialGameState, {
        type: 'BET_PLACED',
        panelId: 'A',
        balance: 900,
      })
      expect(state.panels['A'].status).toBe('bet_placed')
      expect(state.balance).toBe(900)
    })
  })

  describe('CASHOUT_SUCCESS', () => {
    it('sets panel to cashed_out with multiplier, payout, and updates balance', () => {
      const state = dispatch(initialGameState, {
        type: 'CASHOUT_SUCCESS',
        panelId: 'A',
        multiplier: 2.5,
        payout: 250,
        balance: 1150,
      })
      expect(state.panels['A'].status).toBe('cashed_out')
      expect(state.panels['A'].cashoutMultiplier).toBe(2.5)
      expect(state.panels['A'].payout).toBe(250)
      expect(state.balance).toBe(1150)
    })
  })

  describe('PANEL_LOST', () => {
    it('sets panel status to lost', () => {
      const state = dispatch(initialGameState, {
        type: 'PANEL_LOST',
        panelId: 'D',
      })
      expect(state.panels['D'].status).toBe('lost')
    })
  })

  // ── Balance & History ─────────────────────────────────

  describe('UPDATE_BALANCE', () => {
    it('updates balance', () => {
      const state = dispatch(initialGameState, {
        type: 'UPDATE_BALANCE',
        balance: 5000,
      })
      expect(state.balance).toBe(5000)
    })
  })

  describe('HISTORY_UPDATE', () => {
    it('replaces history array', () => {
      const recent = [
        { sessionId: 'S-1', crashMultiplier: 2.5 },
        { sessionId: 'S-2', crashMultiplier: 1.3 },
      ]
      const state = dispatch(initialGameState, {
        type: 'HISTORY_UPDATE',
        recent,
      })
      expect(state.history).toEqual(recent)
    })
  })

  // ── RESET_PANELS ──────────────────────────────────────

  describe('RESET_PANELS', () => {
    it('resets all panels to idle, clears cashout info, preserves betAmount', () => {
      let state = { ...initialGameState }
      state = dispatch(state, { type: 'BET_PLACED', panelId: 'A', balance: 900 })
      state = dispatch(state, {
        type: 'CASHOUT_SUCCESS',
        panelId: 'B',
        multiplier: 2.0,
        payout: 200,
        balance: 1100,
      })
      state = dispatch(state, { type: 'PANEL_LOST', panelId: 'C' })

      state = dispatch(state, { type: 'RESET_PANELS' })

      for (const id of ['A', 'B', 'C', 'D'] as PanelId[]) {
        expect(state.panels[id].status).toBe('idle')
        expect(state.panels[id].cashoutMultiplier).toBeNull()
        expect(state.panels[id].payout).toBe(0)
      }
    })
  })

  // ── Panel isolation ───────────────────────────────────

  describe('panel isolation', () => {
    it('actions on one panel do not affect other panels', () => {
      let state = { ...initialGameState }
      state = dispatch(state, { type: 'SET_BET_AMOUNT', panelId: 'A', amount: 500 })
      state = dispatch(state, { type: 'BET_PLACED', panelId: 'A', balance: 500 })

      expect(state.panels['A'].status).toBe('bet_placed')
      expect(state.panels['A'].betAmount).toBe(500)
      expect(state.panels['B'].status).toBe('idle')
      expect(state.panels['B'].betAmount).toBe(initialGameState.panels['B'].betAmount)
      expect(state.panels['C'].status).toBe('idle')
      expect(state.panels['D'].status).toBe('idle')
    })
  })

  // ── Unknown action ────────────────────────────────────

  describe('unknown action', () => {
    it('returns state unchanged', () => {
      const state = gameReducer(initialGameState, { type: 'UNKNOWN' } as any)
      expect(state).toBe(initialGameState)
    })
  })
})

// ── Initial state validation ──────────────────────────────

describe('initialGameState', () => {
  it('has correct defaults', () => {
    expect(initialGameState.roundPhase).toBe('WAITING')
    expect(initialGameState.sessionId).toBeNull()
    expect(initialGameState.countdown).toBe(0)
    expect(initialGameState.currentMultiplier).toBe(1.0)
    expect(initialGameState.crashMultiplier).toBeNull()
    expect(initialGameState.balance).toBe(1000)
    expect(initialGameState.serverSeedHash).toBeNull()
    expect(initialGameState.serverSeed).toBeNull()
    expect(initialGameState.history).toEqual([])
  })

  it('has all four panels in idle state', () => {
    for (const id of ['A', 'B', 'C', 'D'] as const) {
      expect(initialGameState.panels[id]).toBeDefined()
      expect(initialGameState.panels[id].panelId).toBe(id)
      expect(initialGameState.panels[id].status).toBe('idle')
      expect(initialGameState.panels[id].autoCashout).toBeNull()
      expect(initialGameState.panels[id].cashoutMultiplier).toBeNull()
      expect(initialGameState.panels[id].payout).toBe(0)
    }
  })
})
