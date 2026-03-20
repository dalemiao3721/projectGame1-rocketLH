import { useCallback } from 'react'
import type { PanelId } from '@rocket-lh/shared'
import { BET_DEFAULTS } from '@rocket-lh/shared'
import { useGameContext } from '../context/GameContext'
import { useLobby } from '../context/LobbyContext'
import { wsClient } from '../services/ws'

/**
 * Core game logic hook — bet, cashout, and panel control.
 * Sends actions via WebSocket and dispatches optimistic state updates.
 * In lobby mode, includes lobbyToken and lobbySessionId in WS messages.
 */
export function useGame() {
  const { state, dispatch } = useGameContext()
  const { lobbyToken, lobbySessionId, isLobbyMode } = useLobby()

  /** Adjust bet amount for a panel (clamped to min) */
  const setBetAmount = useCallback(
    (panelId: PanelId, amount: number) => {
      const clamped = Math.max(BET_DEFAULTS.MIN_AMOUNT, Math.round(amount))
      dispatch({ type: 'SET_BET_AMOUNT', panelId, amount: clamped })
    },
    [dispatch],
  )

  /** Increment/decrement bet by step amount */
  const adjustBet = useCallback(
    (panelId: PanelId, delta: number) => {
      const current = state.panels[panelId].betAmount
      setBetAmount(panelId, current + delta)
    },
    [state.panels, setBetAmount],
  )

  /** Set auto-cashout multiplier for a panel */
  const setAutoCashout = useCallback(
    (panelId: PanelId, multiplier: number | null) => {
      if (multiplier !== null && multiplier < BET_DEFAULTS.MIN_AUTO_CASHOUT) return
      dispatch({ type: 'SET_AUTO_CASHOUT', panelId, multiplier })
      // Always notify server — covers both pre-bet and post-bet scenarios
      wsClient.send({
        action: 'update_auto_cashout' as any,
        data: { panelId, autoCashout: multiplier },
      })
    },
    [dispatch],
  )

  /** Place a bet on a panel */
  const placeBet = useCallback(
    (panelId: PanelId) => {
      const panel = state.panels[panelId]

      // Guard: only bet during BETTING phase, panel must be idle, sufficient balance
      console.log('[BET] Attempt:', { phase: state.roundPhase, status: panel.status, bet: panel.betAmount, balance: state.balance })
      if (state.roundPhase !== 'BETTING') { console.log('[BET] Blocked: not BETTING phase'); return }
      if (panel.status !== 'idle') { console.log('[BET] Blocked: panel not idle'); return }
      if (panel.betAmount > state.balance) { console.log('[BET] Blocked: insufficient balance'); return }

      console.log('[BET] Sending WS message...')
      wsClient.send({
        action: 'place_bet',
        data: {
          panelId,
          betAmount: panel.betAmount,
          autoCashout: panel.autoCashout ?? undefined,
          ...(isLobbyMode && lobbyToken && lobbySessionId
            ? { lobbyToken, lobbySessionId }
            : {}),
        },
      })
    },
    [state.roundPhase, state.panels, state.balance, isLobbyMode, lobbyToken, lobbySessionId],
  )

  /** Cash out a panel during flight */
  const cashout = useCallback(
    (panelId: PanelId) => {
      const panel = state.panels[panelId]

      // Guard: only cashout during FLYING phase with active bet
      if (state.roundPhase !== 'FLYING') return
      if (panel.status !== 'bet_placed') return
      if (!state.sessionId) return

      wsClient.send({
        action: 'cashout',
        data: {
          panelId,
          sessionId: state.sessionId,
          ...(isLobbyMode && lobbyToken && lobbySessionId
            ? { lobbyToken, lobbySessionId }
            : {}),
        },
      })
    },
    [state.roundPhase, state.panels, state.sessionId, isLobbyMode, lobbyToken, lobbySessionId],
  )

  /** Check if a panel can place a bet */
  const canBet = useCallback(
    (panelId: PanelId): boolean => {
      const panel = state.panels[panelId]
      return (
        state.roundPhase === 'BETTING' &&
        panel.status === 'idle' &&
        panel.betAmount <= state.balance
      )
    },
    [state.roundPhase, state.panels, state.balance],
  )

  /** Check if a panel can cash out */
  const canCashout = useCallback(
    (panelId: PanelId): boolean => {
      return state.roundPhase === 'FLYING' && state.panels[panelId].status === 'bet_placed'
    },
    [state.roundPhase, state.panels],
  )

  return {
    state,
    setBetAmount,
    adjustBet,
    setAutoCashout,
    placeBet,
    cashout,
    canBet,
    canCashout,
  }
}
