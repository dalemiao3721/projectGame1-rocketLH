import { useEffect, useCallback, useState, useRef } from 'react'
import { GameProvider, useGameContext } from './context/GameContext'
import { LobbyProvider, useLobby } from './context/LobbyContext'
import { DragonAnimation } from './components/DragonAnimation'
import { PanelGrid } from './components/PanelGrid'
import { HistoryBar } from './components/HistoryBar'
import { GameConnector } from './GameConnector'
import { apiClient } from './services/api'
import { useSoundEffects } from './hooks/useSound'
import { wsClient } from './services/ws'
import { toggleMute, isMuted, unlockAudio } from './services/sound'
import { PANEL_IDS } from '@rocket-lh/shared'
import type { PanelId, PanelState } from '@rocket-lh/shared'

export default function App() {
  return (
    <LobbyProvider>
      <GameProvider>
        <GameConnector />
        <LobbyBalanceLoader />
        <SoundManager />
        <div
          className="min-h-dvh flex flex-col"
          style={{ background: 'var(--color-bg-primary)' }}
          onTouchStart={unlockAudio}
          onClick={unlockAudio}
        >
          {/* Top Bar — logo + mute only */}
          <header
            className="flex items-center justify-between px-4 py-3 shrink-0
                       border-b border-[var(--glass-border)]
                       max-md:px-3 max-md:py-2"
            style={{
              background: 'linear-gradient(to right, rgba(11,13,26,0.95), rgba(20,24,51,0.95))',
              backdropFilter: 'blur(12px)',
            }}
          >
            <h1
              className="text-lg font-black tracking-wider max-md:text-base"
              style={{
                color: 'var(--color-accent-gold)',
                textShadow: '0 0 20px rgba(245,166,35,0.3)',
              }}
            >
              ROCKETLH
            </h1>
            <MuteButton />
          </header>

          {/* Main Content */}
          <main
            className="flex-1 flex flex-col max-w-5xl mx-auto w-full overflow-y-auto"
            style={{
              padding: 'var(--space-content-padding)',
              gap: 'var(--space-panel-gap)',
            }}
          >
            <DragonAnimation />
            <BalanceBar />
            <PanelGrid />
            <HistoryBar />
          </main>
        </div>
      </GameProvider>
    </LobbyProvider>
  )
}

/** Available Balance (50%) + Rebet button (50%) — above panel grid */
function BalanceBar() {
  const { state, dispatch } = useGameContext()
  const { lobbyToken, lobbySessionId, isLobbyMode } = useLobby()
  const [lastBets, setLastBets] = useState<Record<string, number>>({})

  // Track last round's bets when entering CRASHED (before panels reset)
  useEffect(() => {
    if (state.roundPhase === 'CRASHED') {
      const bets: Record<string, number> = {}
      for (const id of PANEL_IDS) {
        const panel = state.panels[id as PanelId]
        if (panel.status === 'bet_placed' || panel.status === 'cashed_out' || panel.status === 'lost') {
          bets[id] = panel.betAmount
        }
      }
      if (Object.keys(bets).length > 0) {
        setLastBets(bets)
      }
    }
  }, [state.roundPhase])

  const hasLastBets = Object.keys(lastBets).length > 0
  const canRebet = state.roundPhase === 'BETTING' && hasLastBets

  const handleRebet = () => {
    const panelIds = Object.keys(lastBets)
    // Set all amounts first
    for (const [panelId, amount] of Object.entries(lastBets)) {
      dispatch({ type: 'SET_BET_AMOUNT', panelId: panelId as PanelId, amount })
    }
    // Send bets sequentially with stagger to avoid race conditions
    panelIds.forEach((panelId, index) => {
      setTimeout(() => {
        wsClient.send({
          action: 'place_bet',
          data: {
            panelId,
            betAmount: lastBets[panelId],
            ...(isLobbyMode && lobbyToken && lobbySessionId
              ? { lobbyToken, lobbySessionId }
              : {}),
          },
        })
      }, index * 300) // 300ms between each bet
    })
  }

  return (
    <div className="flex items-center gap-4 px-1 py-1">
      {/* Available Balance — 50%, no border */}
      <div className="flex-1 flex items-center justify-between">
        <span className="text-[11px] text-[var(--color-text-secondary)] uppercase tracking-wider font-semibold max-md:text-[10px]">
          Balance
        </span>
        <span
          className="text-base font-bold max-md:text-sm text-white"
        >
          ${state.balance.toFixed(2)}
        </span>
      </div>

      {/* Rebet — 50%, same style as BET button */}
      <button
        className={`
          flex-1 h-10 rounded-[var(--radius-button)] font-bold text-sm uppercase tracking-wider
          flex items-center justify-center gap-2
          transition-all duration-200 active:scale-95
          max-md:h-9 max-md:text-xs
        `}
        style={canRebet
          ? {
              background: 'var(--gradient-gold-button)',
              boxShadow: 'var(--shadow-gold)',
              color: '#000',
            }
          : {
              background: 'rgba(245,166,35,0.2)',
              color: 'rgba(0,0,0,0.3)',
              cursor: 'not-allowed',
            }
        }
        onClick={handleRebet}
        disabled={!canRebet}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
        REBET
      </button>
    </div>
  )
}

/** Activates sound effects — invisible component */
function SoundManager() {
  useSoundEffects()
  return null
}

/** Mute/unmute toggle button */
function MuteButton() {
  const [muted, setMuted] = useState(isMuted)

  const handleToggle = () => {
    const newState = toggleMute()
    setMuted(newState)
  }

  return (
    <button
      onClick={handleToggle}
      className="w-8 h-8 rounded-full flex items-center justify-center
                 border border-[var(--glass-border)]
                 hover:bg-[var(--glass-bg-hover)] transition-all duration-150
                 max-md:w-7 max-md:h-7"
      style={{ background: 'var(--glass-bg)' }}
      title={muted ? 'Unmute' : 'Mute'}
    >
      {muted ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-text-secondary)]">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <line x1="23" y1="9" x2="17" y2="15" />
          <line x1="17" y1="9" x2="23" y2="15" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-accent-gold)]">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        </svg>
      )}
    </button>
  )
}

/**
 * Invisible component that fetches lobby balance on mount
 * and updates GameContext. Only active in lobby mode.
 */
function LobbyBalanceLoader() {
  const { lobbyToken, isLobbyMode } = useLobby()
  const { dispatch } = useGameContext()

  const fetchBalance = useCallback(async () => {
    if (!isLobbyMode || !lobbyToken) return
    try {
      const data = await apiClient.getLobbyBalance(lobbyToken)
      dispatch({ type: 'UPDATE_BALANCE', balance: data.balance })
    } catch (err) {
      console.error('Failed to fetch lobby balance', err)
    }
  }, [isLobbyMode, lobbyToken, dispatch])

  useEffect(() => {
    fetchBalance()
  }, [fetchBalance])

  return null
}
