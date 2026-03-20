/**
 * Settlement model — persists win/lose outcomes to rocketlh_settlements table.
 */

import { getPool } from '../connection.js'

export const Settlement = {
  async insert(params: {
    settlementId: string
    betId: string
    outcome: 'win' | 'lose'
    cashoutMultiplier: number
    payout: number
    profit: number
  }): Promise<void> {
    const pool = getPool()
    await pool.query(
      `INSERT INTO rocketlh_settlements
        (settlement_id, bet_id, outcome, cashout_multiplier, payout, profit)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        params.settlementId,
        params.betId,
        params.outcome,
        params.cashoutMultiplier,
        params.payout,
        params.profit,
      ]
    )
  },
}
