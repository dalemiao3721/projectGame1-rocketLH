/**
 * BetRecord model — persists bet placement and status updates to rocketlh_bet_records table.
 */

import { getPool } from '../connection.js'

export type BetStatus = 'active' | 'cashed_out' | 'lost'

export const BetRecord = {
  async insert(params: {
    betId: string
    sessionId: string
    playerId: string
    panelId: string
    betAmount: number
    rtpSetting: number
    volatilityLevel: number
    autoCashout: number | null
  }): Promise<void> {
    const pool = getPool()
    await pool.query(
      `INSERT INTO rocketlh_bet_records
        (bet_id, session_id, player_id, panel_id, bet_amount, rtp_setting, volatility_level, auto_cashout)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        params.betId,
        params.sessionId,
        params.playerId,
        params.panelId,
        params.betAmount,
        params.rtpSetting,
        params.volatilityLevel,
        params.autoCashout,
      ]
    )
  },

  async updateStatus(betId: string, status: BetStatus): Promise<void> {
    const pool = getPool()
    await pool.query(
      `UPDATE rocketlh_bet_records SET status = $1 WHERE bet_id = $2`,
      [status, betId]
    )
  },
}
