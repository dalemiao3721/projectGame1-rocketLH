/**
 * WebSocket multiplier broadcast + client message handler.
 *
 * - Server → Client: broadcasts round lifecycle events to all connected clients
 * - Client → Server: handles place_bet, cashout, register actions per connection
 *
 * Each WS connection is assigned an auto-generated playerId on connect.
 * Clients can override it by sending a `register` message with their own ID.
 */

import type { WebSocketServer, WebSocket } from 'ws'
import type { ServerMessage, ClientMessage, PanelId } from '@rocket-lh/shared'
import { CrashEngine } from '../engine/CrashEngine.js'

/** Extend WebSocket to carry per-connection state */
interface GameWebSocket extends WebSocket {
  playerId: string
  pendingAutoCashouts?: Record<string, number | null>
  _betLock?: Promise<void>
}

let wsConnectionCounter = 0

export function setupMultiplierBroadcast(wss: WebSocketServer): void {
  const engine = CrashEngine.getInstance()

  function broadcast(message: ServerMessage): void {
    const data = JSON.stringify(message)
    for (const client of wss.clients) {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(data)
      }
    }
  }

  function sendTo(ws: WebSocket, message: ServerMessage): void {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify(message))
    }
  }

  // ── Server → Client broadcasts ──────────────────────────

  engine.on('round_waiting', (countdown) => {
    broadcast({ event: 'round_waiting', data: { countdown } })
  })

  engine.on('round_betting', (sessionId, serverSeedHash, countdown) => {
    broadcast({ event: 'round_betting', data: { sessionId, serverSeedHash, countdown } })
  })

  engine.on('countdown_tick', (countdown) => {
    broadcast({ event: 'countdown_tick', data: { countdown } } as any)
  })

  engine.on('round_flying', () => {
    broadcast({ event: 'round_flying', data: {} })
  })

  engine.on('multiplier_update', (multiplier, elapsed) => {
    broadcast({ event: 'multiplier_update', data: { multiplier, elapsed } })
  })

  engine.on('round_crashed', (crashMultiplier, serverSeed) => {
    broadcast({ event: 'round_crashed', data: { crashMultiplier, serverSeed } })
  })

  engine.on('auto_cashout_triggered', (panelId: PanelId, _playerId: string, multiplier: number, payout: number) => {
    broadcast({ event: 'auto_cashout_triggered', data: { panelId, multiplier, payout } })
  })

  engine.on('settled', () => {
    broadcast({ event: 'round_settled', data: {} } as any)
  })

  engine.on('history_update', (recent) => {
    broadcast({ event: 'history_update', data: { recent } })
  })

  // ── Connection handler ──────────────────────────────────

  wss.on('connection', (rawWs: WebSocket) => {
    const ws = rawWs as GameWebSocket
    ws.playerId = `ws-player-${++wsConnectionCounter}-${Date.now()}`

    // Send current round state on connect — with accurate countdown
    const state = engine.getRoundState()
    const history = engine.getHistory(10)
    const phase = state.phase.toLowerCase()

    sendTo(ws, {
      event: `round_${phase}`,
      data: {
        sessionId: state.sessionId,
        serverSeedHash: state.serverSeedHash,
        multiplier: state.currentMultiplier,
        elapsed: state.elapsed,
        countdown: state.countdown,
      },
    } as unknown as ServerMessage)

    // If in countdown phase, also send a countdown_tick for immediate sync
    if (phase === 'waiting' || phase === 'betting') {
      sendTo(ws, { event: 'countdown_tick', data: { countdown: state.countdown } } as any)
    }

    sendTo(ws, { event: 'history_update', data: { recent: history } })

    // Confirm assigned playerId
    sendTo(ws, { event: 'registered', data: { playerId: ws.playerId } })

    // ── Client → Server message handler ─────────────────

    ws.on('message', async (raw) => {
      let msg: ClientMessage
      try {
        msg = JSON.parse(raw.toString())
      } catch {
        sendTo(ws, { event: 'error', data: { code: 'INVALID_JSON', message: 'Failed to parse message' } })
        return
      }

      // Serialize bet operations per connection to prevent race conditions
      if (msg.action === 'place_bet' || msg.action === 'cashout') {
        const prev = ws._betLock ?? Promise.resolve()
        ws._betLock = prev.then(() => handleAction(ws, msg)).catch(() => {})
        return
      }
      await handleAction(ws, msg)
    })
  })

  async function handleAction(ws: GameWebSocket, msg: ClientMessage): Promise<void> {
    try {
      switch (msg.action) {
        case 'register': {
          if (msg.data.playerId) {
            ws.playerId = msg.data.playerId
          }
          sendTo(ws, { event: 'registered', data: { playerId: ws.playerId } })
          break
        }

        case 'place_bet': {
          const { panelId, betAmount, autoCashout, lobbyToken, lobbySessionId } = msg.data
          const effectiveAutoCashout = autoCashout ?? ws.pendingAutoCashouts?.[panelId] ?? undefined
          const result = await engine.placeBet({
            playerId: ws.playerId,
            panelId,
            betAmount,
            autoCashout: effectiveAutoCashout,
            lobbyToken,
            lobbySessionId,
          })
          sendTo(ws, {
            event: 'bet_confirmed',
            data: { panelId: result.panelId, betId: result.betId, balance: result.balance },
          })
          break
        }

        case 'update_auto_cashout': {
          const { panelId, autoCashout } = msg.data as any
          const bet = engine.getSessionStore().getBet(ws.playerId, panelId)
          if (bet && bet.status === 'active') {
            bet.autoCashout = autoCashout
          }
          if (!ws.pendingAutoCashouts) ws.pendingAutoCashouts = {}
          ws.pendingAutoCashouts[panelId] = autoCashout
          break
        }

        case 'cashout': {
          const { panelId, sessionId } = msg.data
          const result = await engine.cashout({
            playerId: ws.playerId,
            panelId,
            sessionId,
          })
          sendTo(ws, {
            event: 'cashout_success',
            data: {
              panelId: result.panelId,
              multiplier: result.cashoutMultiplier,
              payout: result.payout,
              balance: result.balance,
            },
          })
          break
        }
      }
    } catch (err: any) {
      sendTo(ws, {
        event: 'error',
        data: { code: err.code || 'UNKNOWN', message: err.message },
      })
    }
  }
}
