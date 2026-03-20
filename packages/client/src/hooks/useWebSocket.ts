import { useEffect } from 'react'
import type { ServerMessage, PanelId } from '@rocket-lh/shared'
import { useGameContext } from '../context/GameContext'
import { wsClient } from '../services/ws'

/**
 * Manages WebSocket connection lifecycle and dispatches
 * server messages to the game reducer.
 */
export function useWebSocket() {
  const { dispatch } = useGameContext()

  useEffect(() => {
    wsClient.connect()

    const unsubscribe = wsClient.onMessage((msg: any) => {
      switch (msg.event) {
        case 'round_waiting':
          dispatch({ type: 'RESET_PANELS' })
          dispatch({ type: 'ROUND_WAITING', countdown: msg.data.countdown })
          break

        case 'round_betting':
          dispatch({
            type: 'ROUND_BETTING',
            sessionId: msg.data.sessionId,
            serverSeedHash: msg.data.serverSeedHash,
            countdown: msg.data.countdown,
          })
          break

        case 'countdown_tick':
          dispatch({ type: 'COUNTDOWN_TICK', countdown: msg.data.countdown })
          break

        case 'round_flying':
          dispatch({ type: 'ROUND_FLYING' })
          break

        case 'round_settled':
          dispatch({ type: 'ROUND_SETTLED' })
          break

        case 'multiplier_update':
          dispatch({ type: 'MULTIPLIER_UPDATE', multiplier: msg.data.multiplier })
          break

        case 'round_crashed':
          dispatch({
            type: 'ROUND_CRASHED',
            crashMultiplier: msg.data.crashMultiplier,
            serverSeed: msg.data.serverSeed,
          })
          // No client-side timeout — server drives SETTLED→WAITING transitions
          break

        case 'bet_confirmed':
          dispatch({
            type: 'BET_PLACED',
            panelId: msg.data.panelId,
            balance: msg.data.balance,
          })
          break

        case 'cashout_success':
          dispatch({
            type: 'CASHOUT_SUCCESS',
            panelId: msg.data.panelId,
            multiplier: msg.data.multiplier,
            payout: msg.data.payout,
            balance: msg.data.balance,
          })
          break

        case 'auto_cashout_triggered':
          // balance not sent by server for broadcast events —
          // use -1 as signal for reducer to add payout to current balance
          dispatch({
            type: 'AUTO_CASHOUT',
            panelId: msg.data.panelId,
            multiplier: msg.data.multiplier,
            payout: msg.data.payout,
          })
          break

        case 'history_update':
          dispatch({ type: 'HISTORY_UPDATE', recent: msg.data.recent })
          break

        case 'error':
          console.error('[WS] Server error:', msg.data)
          break

        case 'registered':
          console.log('[WS] Registered as:', msg.data.playerId)
          break

        default:
          console.log('[WS] Unhandled event:', (msg as any).event)
      }
    })

    return () => {
      unsubscribe()
      // Don't disconnect the shared wsClient on cleanup —
      // React StrictMode double-mounts in dev, which would
      // cause connect→disconnect→reconnect loops.
    }
  }, [dispatch])
}
