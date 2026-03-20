import type { PanelId } from './game.js'

/** POST /game/bet request */
export interface PlaceBetRequest {
  playerId: string
  panelId: PanelId
  betAmount: number
  autoCashout?: number
}

/** POST /game/bet response */
export interface PlaceBetResponse {
  betId: string
  sessionId: string
  panelId: PanelId
  betAmount: number
  autoCashout: number | null
  balance: number
}

/** POST /game/cashout request */
export interface CashoutRequest {
  playerId: string
  panelId: PanelId
  sessionId: string
}

/** POST /game/cashout response */
export interface CashoutResponse {
  panelId: PanelId
  cashoutMultiplier: number
  payout: number
  profit: number
  balance: number
}

/** GET /game/history response */
export interface HistoryResponse {
  rounds: {
    sessionId: string
    crashMultiplier: number
    crashedAt: string
  }[]
}

/** GET /game/verify response */
export interface VerifyResponse {
  isValid: boolean
  computedHash: string
  computedCrashPoint: number
}

/** GET /game/round-state response */
export interface RoundStateResponse {
  phase: string
  sessionId: string | null
  serverSeedHash: string | null
  currentMultiplier: number
  elapsed: number
}

/** API error response */
export interface ApiError {
  error: {
    code: string
    message: string
  }
}
