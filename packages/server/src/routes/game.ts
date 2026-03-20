/**
 * Game API routes.
 *
 * POST /game/bet         — Place a bet on a panel (BETTING phase)
 * POST /game/cashout     — Cash out a panel (FLYING phase)
 * GET  /game/balance     — Get player balance
 * GET  /game/history     — Recent crash history
 * GET  /game/verify      — Verify round fairness
 * GET  /game/round-state — Current round state (for reconnection)
 */

import { Router, type Request, type Response, type NextFunction } from 'express'
import { CrashEngine } from '../engine/CrashEngine.js'
import { validatePlaceBet, validateCashout, validateVerify } from '../middleware/validation.js'

const router: ReturnType<typeof Router> = Router()

/** Wrap async route handlers to forward errors to Express error middleware */
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next)
  }
}

// POST /game/bet
router.post('/bet', validatePlaceBet, asyncHandler(async (req, res) => {
  const engine = CrashEngine.getInstance()
  const { playerId, panelId, betAmount, autoCashout, lobbyToken, lobbySessionId } = req.body
  const result = await engine.placeBet({
    playerId,
    panelId,
    betAmount,
    autoCashout,
    lobbyToken,
    lobbySessionId,
  })
  res.json(result)
}))

// POST /game/cashout
router.post('/cashout', validateCashout, asyncHandler(async (req, res) => {
  const engine = CrashEngine.getInstance()
  const result = await engine.cashout(req.body)
  res.json(result)
}))

// GET /game/balance
router.get('/balance', asyncHandler(async (req, res) => {
  const engine = CrashEngine.getInstance()
  const playerId = req.query.playerId as string
  if (!playerId) {
    res.status(400).json({ error: { code: 'INVALID_PARAMS', message: 'playerId query parameter is required' } })
    return
  }
  const lobbyToken = req.headers.authorization?.replace('Bearer ', '')
  const balance = await engine.getPlayerBalance(playerId, lobbyToken)
  res.json({ balance })
}))

// GET /game/history
router.get('/history', asyncHandler(async (req, res) => {
  const engine = CrashEngine.getInstance()
  const limit = Math.min(Math.max(parseInt(String(req.query.limit)) || 10, 1), 50)
  const rounds = engine.getHistory(limit)
  res.json({ rounds })
}))

// GET /game/verify
router.get('/verify', validateVerify, asyncHandler(async (req, res) => {
  const engine = CrashEngine.getInstance()
  const result = engine.verifyFairness({
    serverSeed: req.query.serverSeed as string,
    clientSeed: req.query.clientSeed as string,
    nonce: Number(req.query.nonce),
  })
  res.json(result)
}))

// GET /game/round-state
router.get('/round-state', asyncHandler(async (req, res) => {
  const engine = CrashEngine.getInstance()
  const state = engine.getRoundState()
  res.json(state)
}))

export default router
