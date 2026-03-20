/**
 * PostgreSQL connection pool.
 *
 * Uses the `pg` Pool for connection management.
 * Falls back gracefully — DB failures never block the game engine.
 */

import pg from 'pg'
import { serverConfig } from '../config/index.js'

const { Pool } = pg

let pool: pg.Pool | null = null

export function getPool(): pg.Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: serverConfig.databaseUrl,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    })

    pool.on('error', (err) => {
      console.error('[RocketLH DB] Pool error:', err.message)
    })
  }
  return pool
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
  }
}
