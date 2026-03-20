/**
 * CrashLog model — persists round results to rocketlh_crash_logs table.
 */

import { getPool } from '../connection.js'

export interface CrashLogRow {
  draw_id: string
  session_id: string
  crash_multiplier: number
  server_seed: string
  server_seed_hash: string
  client_seed: string | null
  rtp_setting: number
  volatility_level: number
  created_at: Date
  crashed_at: Date | null
}

export const CrashLog = {
  async insert(params: {
    drawId: string
    sessionId: string
    crashMultiplier: number
    serverSeed: string
    serverSeedHash: string
    clientSeed: string | null
    rtpSetting: number
    volatilityLevel: number
    crashedAt: Date
  }): Promise<void> {
    const pool = getPool()
    await pool.query(
      `INSERT INTO rocketlh_crash_logs
        (draw_id, session_id, crash_multiplier, server_seed, server_seed_hash, client_seed, rtp_setting, volatility_level, crashed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        params.drawId,
        params.sessionId,
        params.crashMultiplier,
        params.serverSeed,
        params.serverSeedHash,
        params.clientSeed,
        params.rtpSetting,
        params.volatilityLevel,
        params.crashedAt,
      ]
    )
  },

  async updateCrashedAt(sessionId: string, crashedAt: Date): Promise<void> {
    const pool = getPool()
    await pool.query(
      `UPDATE rocketlh_crash_logs SET crashed_at = $1 WHERE session_id = $2`,
      [crashedAt, sessionId]
    )
  },

  async findRecent(limit: number = 10): Promise<CrashLogRow[]> {
    const pool = getPool()
    const result = await pool.query<CrashLogRow>(
      `SELECT * FROM rocketlh_crash_logs ORDER BY created_at DESC LIMIT $1`,
      [limit]
    )
    return result.rows
  },
}
