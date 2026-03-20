import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react'
import type { GameState, PanelId, PanelState, RoundPhase } from '@rocket-lh/shared'
import { PANEL_IDS, BET_DEFAULTS } from '@rocket-lh/shared'

// ── Action Types ──────────────────────────────────────────────

export type GameAction =
  // Round lifecycle
  | { type: 'ROUND_WAITING'; countdown: number }
  | { type: 'ROUND_BETTING'; sessionId: string; serverSeedHash: string; countdown: number }
  | { type: 'ROUND_FLYING' }
  | { type: 'ROUND_CRASHED'; crashMultiplier: number; serverSeed: string }
  | { type: 'ROUND_SETTLED' }
  // Multiplier
  | { type: 'MULTIPLIER_UPDATE'; multiplier: number }
  // Countdown
  | { type: 'COUNTDOWN_TICK'; countdown: number }
  // Panel operations
  | { type: 'SET_BET_AMOUNT'; panelId: PanelId; amount: number }
  | { type: 'SET_AUTO_CASHOUT'; panelId: PanelId; multiplier: number | null }
  | { type: 'BET_PLACED'; panelId: PanelId; balance: number }
  | { type: 'CASHOUT_SUCCESS'; panelId: PanelId; multiplier: number; payout: number; balance: number }
  | { type: 'AUTO_CASHOUT'; panelId: PanelId; multiplier: number; payout: number }
  | { type: 'PANEL_LOST'; panelId: PanelId }
  // Balance
  | { type: 'UPDATE_BALANCE'; balance: number }
  // History
  | { type: 'HISTORY_UPDATE'; recent: { sessionId: string; crashMultiplier: number }[] }
  // Reset
  | { type: 'RESET_PANELS' }

// ── Initial State ─────────────────────────────────────────────

function createInitialPanelState(panelId: PanelId): PanelState {
  return {
    panelId,
    status: 'idle',
    betAmount: BET_DEFAULTS.INITIAL_AMOUNT,
    autoCashout: null,
    cashoutMultiplier: null,
    payout: 0,
  }
}

export const initialGameState: GameState = {
  roundPhase: 'WAITING',
  sessionId: null,
  countdown: 0,
  currentMultiplier: 1.0,
  crashMultiplier: null,
  panels: Object.fromEntries(
    PANEL_IDS.map((id: typeof PANEL_IDS[number]) => [id, createInitialPanelState(id)]),
  ) as Record<PanelId, PanelState>,
  balance: 1000,
  serverSeedHash: null,
  serverSeed: null,
  history: [],
}

// ── Reducer ───────────────────────────────────────────────────

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'ROUND_WAITING':
      return {
        ...state,
        roundPhase: 'WAITING',
        countdown: action.countdown,
        currentMultiplier: 1.0,
        crashMultiplier: null,
        serverSeed: null,
      }

    case 'ROUND_BETTING':
      return {
        ...state,
        roundPhase: 'BETTING',
        sessionId: action.sessionId,
        serverSeedHash: action.serverSeedHash,
        countdown: action.countdown,
      }

    case 'ROUND_FLYING':
      return {
        ...state,
        roundPhase: 'FLYING',
        countdown: 0,
        currentMultiplier: 1.0,
      }

    case 'ROUND_CRASHED': {
      // Mark all active bet panels as lost
      const crashedPanels = { ...state.panels }
      for (const id of PANEL_IDS) {
        if (crashedPanels[id].status === 'bet_placed') {
          crashedPanels[id] = { ...crashedPanels[id], status: 'lost' }
        }
      }
      return {
        ...state,
        roundPhase: 'CRASHED',
        crashMultiplier: action.crashMultiplier,
        currentMultiplier: action.crashMultiplier,
        serverSeed: action.serverSeed,
        panels: crashedPanels,
      }
    }

    case 'ROUND_SETTLED':
      return { ...state, roundPhase: 'SETTLED' }

    case 'MULTIPLIER_UPDATE':
      return { ...state, currentMultiplier: action.multiplier }

    case 'COUNTDOWN_TICK':
      return { ...state, countdown: action.countdown }

    case 'SET_BET_AMOUNT':
      return updatePanel(state, action.panelId, { betAmount: action.amount })

    case 'SET_AUTO_CASHOUT':
      return updatePanel(state, action.panelId, { autoCashout: action.multiplier })

    case 'BET_PLACED':
      return {
        ...updatePanel(state, action.panelId, { status: 'bet_placed' }),
        balance: action.balance,
      }

    case 'CASHOUT_SUCCESS':
      return {
        ...updatePanel(state, action.panelId, {
          status: 'cashed_out',
          cashoutMultiplier: action.multiplier,
          payout: action.payout,
        }),
        balance: action.balance,
      }

    case 'AUTO_CASHOUT':
      return {
        ...updatePanel(state, action.panelId, {
          status: 'cashed_out',
          cashoutMultiplier: action.multiplier,
          payout: action.payout,
        }),
        balance: state.balance + action.payout,
      }

    case 'PANEL_LOST':
      return updatePanel(state, action.panelId, { status: 'lost' })

    case 'UPDATE_BALANCE':
      return { ...state, balance: action.balance }

    case 'HISTORY_UPDATE':
      return { ...state, history: action.recent }

    case 'RESET_PANELS': {
      const resetPanels = { ...state.panels }
      for (const id of PANEL_IDS) {
        resetPanels[id] = {
          ...resetPanels[id],
          status: 'idle',
          cashoutMultiplier: null,
          payout: 0,
        }
      }
      return { ...state, panels: resetPanels }
    }

    default:
      return state
  }
}

function updatePanel(
  state: GameState,
  panelId: PanelId,
  updates: Partial<PanelState>,
): GameState {
  return {
    ...state,
    panels: {
      ...state.panels,
      [panelId]: { ...state.panels[panelId], ...updates },
    },
  }
}

// ── Context ───────────────────────────────────────────────────

interface GameContextValue {
  state: GameState
  dispatch: Dispatch<GameAction>
}

const GameContext = createContext<GameContextValue | null>(null)

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialGameState)

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  )
}

export function useGameContext(): GameContextValue {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGameContext must be used within GameProvider')
  return ctx
}
