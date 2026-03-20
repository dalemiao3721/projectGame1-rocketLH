/**
 * SessionStore — In-memory state for the current round and active bets.
 *
 * Stores:
 * - Current round metadata (session, seeds, crash point)
 * - Active bets keyed by "playerId:panelId"
 */

import type { PanelId, RoundPhase } from '@rocket-lh/shared'

export interface RoundSession {
  sessionId: string
  crashPoint: number       // Only visible server-side
  serverSeed: string
  serverSeedHash: string
  clientSeed: string
  nonce: number
  rtpSetting: number
  volatilityLevel: number
  phase: RoundPhase
  startedAt: Date
}

export interface PanelBet {
  betId: string
  sessionId: string
  playerId: string
  panelId: PanelId
  betAmount: number
  autoCashout: number | null
  status: 'active' | 'cashed_out' | 'lost'
  cashoutMultiplier: number | null
  payout: number
  createdAt: Date
  lobbyToken: string | null       // For lobby wallet integration
  lobbySessionId: string | null   // For lobby wallet integration
}

export class SessionStore {
  private currentRound: RoundSession | null = null
  private bets: Map<string, PanelBet> = new Map()

  private betKey(playerId: string, panelId: PanelId): string {
    return `${playerId}:${panelId}`
  }

  // --- Round management ---

  createRound(session: RoundSession): void {
    this.currentRound = session
    this.bets.clear()
  }

  getCurrentRound(): RoundSession | null {
    return this.currentRound
  }

  updatePhase(phase: RoundPhase): void {
    if (this.currentRound) {
      this.currentRound.phase = phase
    }
  }

  // --- Bet management ---

  placeBet(bet: PanelBet): void {
    this.bets.set(this.betKey(bet.playerId, bet.panelId), bet)
  }

  getBet(playerId: string, panelId: PanelId): PanelBet | undefined {
    return this.bets.get(this.betKey(playerId, panelId))
  }

  /** All bets with status 'active' (not yet cashed out or lost) */
  getActiveBets(): PanelBet[] {
    return Array.from(this.bets.values()).filter(b => b.status === 'active')
  }

  /** All bets in current round */
  getAllBets(): PanelBet[] {
    return Array.from(this.bets.values())
  }

  /** Update a bet's settlement fields */
  settleBet(
    playerId: string,
    panelId: PanelId,
    result: Partial<Pick<PanelBet, 'status' | 'cashoutMultiplier' | 'payout'>>
  ): PanelBet | undefined {
    const bet = this.getBet(playerId, panelId)
    if (!bet) return undefined
    Object.assign(bet, result)
    return bet
  }

  /** Clear round state for the next round */
  clearRound(): void {
    this.currentRound = null
    this.bets.clear()
  }
}
