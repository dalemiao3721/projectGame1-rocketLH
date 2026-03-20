/** Available RTP options (percentage) */
export const RTP_OPTIONS = [94, 95, 96, 97, 98, 99] as const

/** Volatility levels (1-5) */
export const VOLATILITY_LEVELS = [1, 2, 3, 4, 5] as const

/** Panel IDs */
export const PANEL_IDS = ['A', 'B', 'C', 'D'] as const

/** Round timing (ms) */
export const ROUND_TIMING = {
  WAITING_DURATION: 3000,
  BETTING_DURATION: 20000,
  TICK_INTERVAL: 50,
  SETTLED_DURATION: 3000,
} as const

/** Default bet settings */
export const BET_DEFAULTS = {
  INITIAL_AMOUNT: 100,
  STEP: 10,
  MIN_AMOUNT: 1,
  MIN_AUTO_CASHOUT: 1.01,
} as const
