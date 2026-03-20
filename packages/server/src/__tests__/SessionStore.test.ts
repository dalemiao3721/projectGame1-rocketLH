import { describe, it, expect, beforeEach } from 'vitest'
import { SessionStore, type RoundSession, type PanelBet } from '../engine/SessionStore.js'

function makeRound(overrides: Partial<RoundSession> = {}): RoundSession {
  return {
    sessionId: 'SESSION-1',
    crashPoint: 2.5,
    serverSeed: 'server-seed',
    serverSeedHash: 'hash-abc',
    clientSeed: 'client-seed',
    nonce: 1,
    rtpSetting: 97,
    volatilityLevel: 3,
    phase: 'BETTING',
    startedAt: new Date(),
    ...overrides,
  }
}

function makeBet(overrides: Partial<PanelBet> = {}): PanelBet {
  return {
    betId: 'BET-1',
    sessionId: 'SESSION-1',
    playerId: 'player-1',
    panelId: 'A',
    betAmount: 100,
    autoCashout: null,
    status: 'active',
    cashoutMultiplier: null,
    payout: 0,
    createdAt: new Date(),
    lobbyToken: null,
    lobbySessionId: null,
    ...overrides,
  }
}

describe('SessionStore', () => {
  let store: SessionStore

  beforeEach(() => {
    store = new SessionStore()
  })

  // ── Round management ──────────────────────────────────

  describe('createRound', () => {
    it('stores and returns the current round', () => {
      const round = makeRound()
      store.createRound(round)
      expect(store.getCurrentRound()).toBe(round)
    })

    it('clears previous bets when creating a new round', () => {
      store.createRound(makeRound())
      store.placeBet(makeBet())
      expect(store.getAllBets()).toHaveLength(1)

      store.createRound(makeRound({ sessionId: 'SESSION-2' }))
      expect(store.getAllBets()).toHaveLength(0)
    })
  })

  describe('getCurrentRound', () => {
    it('returns null when no round exists', () => {
      expect(store.getCurrentRound()).toBeNull()
    })
  })

  describe('updatePhase', () => {
    it('updates phase of current round', () => {
      store.createRound(makeRound({ phase: 'WAITING' }))
      store.updatePhase('BETTING')
      expect(store.getCurrentRound()!.phase).toBe('BETTING')
    })

    it('does nothing when no round exists', () => {
      // Should not throw
      store.updatePhase('FLYING')
    })
  })

  describe('clearRound', () => {
    it('clears round and bets', () => {
      store.createRound(makeRound())
      store.placeBet(makeBet())
      store.clearRound()
      expect(store.getCurrentRound()).toBeNull()
      expect(store.getAllBets()).toHaveLength(0)
    })
  })

  // ── Bet management ────────────────────────────────────

  describe('placeBet / getBet', () => {
    it('stores a bet keyed by playerId:panelId', () => {
      store.createRound(makeRound())
      const bet = makeBet()
      store.placeBet(bet)
      expect(store.getBet('player-1', 'A')).toBe(bet)
    })

    it('returns undefined for non-existent bet', () => {
      expect(store.getBet('player-1', 'A')).toBeUndefined()
    })

    it('supports multiple panels for same player', () => {
      store.createRound(makeRound())
      store.placeBet(makeBet({ panelId: 'A' }))
      store.placeBet(makeBet({ panelId: 'B', betId: 'BET-2' }))
      expect(store.getBet('player-1', 'A')).toBeDefined()
      expect(store.getBet('player-1', 'B')).toBeDefined()
    })

    it('supports multiple players on same panel', () => {
      store.createRound(makeRound())
      store.placeBet(makeBet({ playerId: 'p1', panelId: 'A' }))
      store.placeBet(makeBet({ playerId: 'p2', panelId: 'A', betId: 'BET-2' }))
      expect(store.getBet('p1', 'A')).toBeDefined()
      expect(store.getBet('p2', 'A')).toBeDefined()
    })
  })

  describe('getActiveBets', () => {
    it('returns only active bets', () => {
      store.createRound(makeRound())
      store.placeBet(makeBet({ panelId: 'A', status: 'active' }))
      store.placeBet(makeBet({ panelId: 'B', betId: 'BET-2', status: 'cashed_out' }))
      store.placeBet(makeBet({ panelId: 'C', betId: 'BET-3', status: 'lost' }))

      const active = store.getActiveBets()
      expect(active).toHaveLength(1)
      expect(active[0].panelId).toBe('A')
    })
  })

  describe('getAllBets', () => {
    it('returns all bets regardless of status', () => {
      store.createRound(makeRound())
      store.placeBet(makeBet({ panelId: 'A' }))
      store.placeBet(makeBet({ panelId: 'B', betId: 'BET-2' }))
      expect(store.getAllBets()).toHaveLength(2)
    })
  })

  describe('settleBet', () => {
    it('updates bet status, cashoutMultiplier, and payout', () => {
      store.createRound(makeRound())
      store.placeBet(makeBet())
      const settled = store.settleBet('player-1', 'A', {
        status: 'cashed_out',
        cashoutMultiplier: 2.0,
        payout: 200,
      })
      expect(settled).toBeDefined()
      expect(settled!.status).toBe('cashed_out')
      expect(settled!.cashoutMultiplier).toBe(2.0)
      expect(settled!.payout).toBe(200)
    })

    it('returns undefined for non-existent bet', () => {
      expect(store.settleBet('nobody', 'A', { status: 'lost' })).toBeUndefined()
    })
  })
})
