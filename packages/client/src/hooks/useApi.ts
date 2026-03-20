import { useCallback } from 'react'
import type { PanelId } from '@rocket-lh/shared'
import { apiClient } from '../services/api'
import { useGameContext } from '../context/GameContext'
import { useLobby } from '../context/LobbyContext'

/**
 * HTTP API hook — wraps API calls with game state + lobby context.
 * Used as fallback when WebSocket-based bet/cashout isn't available.
 */
export function useApi() {
  const { state, dispatch } = useGameContext()
  const { lobbyToken, lobbySessionId, isLobbyMode } = useLobby()

  const placeBet = useCallback(
    async (panelId: PanelId) => {
      const panel = state.panels[panelId]
      if (!state.sessionId) return

      const res = await apiClient.placeBet({
        playerId: 'local_player',
        panelId,
        betAmount: panel.betAmount,
        autoCashout: panel.autoCashout ?? undefined,
        ...(isLobbyMode && lobbyToken && lobbySessionId
          ? { lobbyToken, lobbySessionId }
          : {}),
      } as Parameters<typeof apiClient.placeBet>[0])

      dispatch({ type: 'BET_PLACED', panelId, balance: res.balance })
    },
    [state.panels, state.sessionId, dispatch, isLobbyMode, lobbyToken, lobbySessionId],
  )

  const cashout = useCallback(
    async (panelId: PanelId) => {
      if (!state.sessionId) return

      const res = await apiClient.cashout({
        playerId: 'local_player',
        panelId,
        sessionId: state.sessionId,
        ...(isLobbyMode && lobbyToken && lobbySessionId
          ? { lobbyToken, lobbySessionId }
          : {}),
      } as Parameters<typeof apiClient.cashout>[0])

      dispatch({
        type: 'CASHOUT_SUCCESS',
        panelId,
        multiplier: res.cashoutMultiplier,
        payout: res.payout,
        balance: res.balance,
      })
    },
    [state.sessionId, dispatch, isLobbyMode, lobbyToken, lobbySessionId],
  )

  const fetchHistory = useCallback(async () => {
    const res = await apiClient.getHistory()
    dispatch({
      type: 'HISTORY_UPDATE',
      recent: res.rounds.map((r: { sessionId: string; crashMultiplier: number; crashedAt: string }) => ({
        sessionId: r.sessionId,
        crashMultiplier: r.crashMultiplier,
      })),
    })
  }, [dispatch])

  /** Refresh balance from lobby API */
  const refreshLobbyBalance = useCallback(async () => {
    if (!isLobbyMode || !lobbyToken) return
    try {
      const data = await apiClient.getLobbyBalance(lobbyToken)
      dispatch({ type: 'UPDATE_BALANCE', balance: data.balance })
    } catch (err) {
      console.error('Failed to refresh lobby balance', err)
    }
  }, [isLobbyMode, lobbyToken, dispatch])

  return { placeBet, cashout, fetchHistory, refreshLobbyBalance }
}
