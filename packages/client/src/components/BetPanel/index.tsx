import type { PanelId } from '@rocket-lh/shared'
import { BET_DEFAULTS } from '@rocket-lh/shared'
import { useGame } from '../../hooks/useGame'

interface BetPanelProps {
  panelId: PanelId
}

export function BetPanel({ panelId }: BetPanelProps) {
  const { state, setBetAmount, adjustBet, setAutoCashout, placeBet, cashout, canBet, canCashout } =
    useGame()
  const panel = state.panels[panelId]
  const { roundPhase, currentMultiplier } = state

  const potentialWin = panel.status === 'bet_placed'
    ? (currentMultiplier * panel.betAmount).toFixed(2)
    : (panel.betAmount).toFixed(2)

  const buttonConfig = getButtonConfig(
    roundPhase,
    panel.status,
    panel.betAmount,
    panel.payout,
    currentMultiplier,
    canBet(panelId),
    canCashout(panelId),
  )

  const handleAction = () => {
    if (canBet(panelId)) placeBet(panelId)
    else if (canCashout(panelId)) cashout(panelId)
  }

  const panelStyle = getPanelStyle(panel.status)
  const isIdle = panel.status === 'idle'
  const canAdjustAuto = roundPhase !== 'FLYING'
  const autoValue = panel.autoCashout !== null ? panel.autoCashout : 2.0

  return (
    <div
      className={`
        rounded-[var(--radius-panel)] p-3 flex flex-col gap-2
        border transition-all duration-[var(--anim-panel-transition)]
        ${panelStyle.borderClass}
        max-md:p-2.5 max-md:gap-1.5
      `}
      style={{
        background: panelStyle.background,
        backdropFilter: `blur(var(--glass-blur))`,
        boxShadow: panelStyle.shadow,
      }}
    >
      {/* Status badge — only show when there's a result */}
      {(panel.status === 'cashed_out' || panel.status === 'lost') && (
        <div className="flex items-center justify-end">
          {panel.status === 'cashed_out' && panel.payout > 0 && (
            <span
              className="text-xs font-bold animate-[fade-in_300ms_ease-out]"
              style={{ color: 'var(--color-accent-green)', textShadow: '0 0 10px rgba(34,197,94,0.4)' }}
            >
              +${panel.payout.toFixed(2)}
            </span>
          )}
          {panel.status === 'lost' && (
            <span
              className="text-xs font-bold animate-[fade-in_300ms_ease-out]"
              style={{ color: 'var(--color-accent-red)', textShadow: '0 0 10px rgba(239,68,68,0.4)' }}
            >
              LOST
            </span>
          )}
        </div>
      )}

      {/* Bet Amount + Auto Cashout — equal halves */}
      <div className="flex items-center gap-1.5">
        {/* Left half: Bet Amount */}
        <div className="flex-1 flex items-center gap-1">
          <button
            className="w-6 h-7 rounded bg-[var(--glass-bg)] border border-[var(--glass-border)]
                       text-white font-bold text-xs shrink-0
                       hover:bg-[var(--glass-bg-hover)] transition-all duration-150 active:scale-90
                       disabled:opacity-30 disabled:cursor-not-allowed
                       max-md:w-5 max-md:h-6 max-md:text-[10px]"
            onClick={() => adjustBet(panelId, -BET_DEFAULTS.STEP)}
            disabled={!isIdle || panel.betAmount <= BET_DEFAULTS.MIN_AMOUNT}
          >
            −
          </button>
          <input
            type="number"
            value={panel.betAmount}
            onChange={(e) => setBetAmount(panelId, Number(e.target.value))}
            disabled={!isIdle}
            className="flex-1 min-w-0 h-7 rounded bg-[var(--glass-bg)] border border-[var(--glass-border)]
                       text-center text-white text-xs font-semibold
                       focus:outline-none focus:border-[var(--color-accent-gold)]
                       transition-all duration-150
                       disabled:opacity-50 disabled:cursor-not-allowed
                       max-md:h-6 max-md:text-[10px]"
            min={BET_DEFAULTS.MIN_AMOUNT}
          />
          <button
            className="w-6 h-7 rounded bg-[var(--glass-bg)] border border-[var(--glass-border)]
                       text-white font-bold text-xs shrink-0
                       hover:bg-[var(--glass-bg-hover)] transition-all duration-150 active:scale-90
                       disabled:opacity-30 disabled:cursor-not-allowed
                       max-md:w-5 max-md:h-6 max-md:text-[10px]"
            onClick={() => adjustBet(panelId, BET_DEFAULTS.STEP)}
            disabled={!isIdle}
          >
            +
          </button>
        </div>

        {/* Separator */}
        <div className="shrink-0 w-px h-5 bg-[var(--glass-border)]" />

        {/* Right half: Auto Cashout */}
        <div className="flex-1 flex items-center gap-1">
          {/* Auto toggle button — purple when active */}
          <button
            className={`
              h-7 px-2 rounded text-[10px] font-bold shrink-0 transition-all duration-150 uppercase tracking-wider
              ${panel.autoCashout !== null
                ? 'text-white shadow-[0_0_10px_rgba(124,58,237,0.3)]'
                : 'text-[rgba(200,180,255,0.8)] hover:text-white'}
              max-md:h-6 max-md:text-[9px] max-md:px-1.5
            `}
            style={panel.autoCashout !== null
              ? { background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }
              : { background: 'rgba(124,58,237,0.25)', border: '1px solid rgba(124,58,237,0.4)' }
            }
            onClick={() => {
              if (panel.autoCashout !== null) {
                setAutoCashout(panelId, null)
              } else {
                setAutoCashout(panelId, autoValue)
              }
            }}
            disabled={!canAdjustAuto}
          >
            Auto
          </button>
          <button
            className="w-6 h-7 rounded bg-[var(--glass-bg)] border border-[var(--glass-border)]
                       text-white font-bold text-xs shrink-0
                       hover:bg-[var(--glass-bg-hover)] transition-all duration-150 active:scale-90
                       disabled:opacity-30 disabled:cursor-not-allowed
                       max-md:w-5 max-md:h-6 max-md:text-[10px]"
            onClick={() => setAutoCashout(panelId, Math.max(1.1, autoValue - 0.1))}
            disabled={!canAdjustAuto}
          >
            −
          </button>
          <div
            className={`
              flex-1 min-w-0 h-7 rounded flex items-center justify-center
              border transition-all duration-150 text-xs font-bold
              ${panel.autoCashout !== null
                ? 'border-[#7c3aed]/40 text-[#7c3aed]'
                : 'text-[rgba(124,58,237,0.4)]'}
              max-md:h-6 max-md:text-[10px]
            `}
            style={panel.autoCashout !== null
              ? { background: 'rgba(124,58,237,0.1)' }
              : { background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)' }
            }
          >
            {autoValue.toFixed(1)}x
          </div>
          <button
            className="w-6 h-7 rounded bg-[var(--glass-bg)] border border-[var(--glass-border)]
                       text-white font-bold text-xs shrink-0
                       hover:bg-[var(--glass-bg-hover)] transition-all duration-150 active:scale-90
                       disabled:opacity-30 disabled:cursor-not-allowed
                       max-md:w-5 max-md:h-6 max-md:text-[10px]"
            onClick={() => setAutoCashout(panelId, autoValue + 0.1)}
            disabled={!canAdjustAuto}
          >
            +
          </button>
        </div>
      </div>

      {/* Action Button */}
      <button
        className={`
          w-full h-10 rounded-[var(--radius-button)] font-bold text-sm uppercase tracking-wider
          transition-all duration-200 active:scale-95
          max-md:h-9 max-md:text-xs
          ${buttonConfig.className}
        `}
        style={buttonConfig.style}
        onClick={handleAction}
        disabled={buttonConfig.disabled}
      >
        {buttonConfig.label}
      </button>

      {/* Potential Win — shown during flight when bet is active */}
      {panel.status === 'bet_placed' && roundPhase === 'FLYING' && (
        <p className="text-center text-[10px] max-md:text-[9px] animate-pulse"
          style={{ color: 'var(--color-text-gold)', textShadow: '0 0 8px rgba(251,191,36,0.3)' }}
        >
          Potential: ${potentialWin}
        </p>
      )}
    </div>
  )
}

function getPanelStyle(status: string) {
  switch (status) {
    case 'bet_placed':
      return {
        borderClass: 'border-[var(--color-accent-gold)]/40',
        background: 'var(--gradient-panel-bet)',
        shadow: 'var(--shadow-panel), 0 0 15px rgba(245,166,35,0.1)',
      }
    case 'cashed_out':
      return {
        borderClass: 'border-[var(--color-accent-green)]/50',
        background: 'var(--gradient-panel-won)',
        shadow: 'var(--shadow-panel), 0 0 15px rgba(34,197,94,0.15)',
      }
    case 'lost':
      return {
        borderClass: 'border-[var(--color-accent-red)]/40',
        background: 'var(--gradient-panel-lost)',
        shadow: 'var(--shadow-panel), 0 0 15px rgba(239,68,68,0.1)',
      }
    default:
      return {
        borderClass: 'border-[var(--glass-border)]',
        background: 'var(--gradient-panel-idle)',
        shadow: 'var(--shadow-panel)',
      }
  }
}

function getButtonConfig(
  phase: string,
  status: string,
  betAmount: number,
  payout: number,
  multiplier: number,
  canBet: boolean,
  canCashout: boolean,
) {
  if (canCashout) {
    return {
      label: `CASHOUT $${(multiplier * betAmount).toFixed(2)}`,
      className: 'text-white',
      style: {
        background: 'var(--gradient-green-button)',
        boxShadow: 'var(--shadow-green)',
      } as React.CSSProperties,
      disabled: false,
    }
  }

  if (canBet) {
    return {
      label: 'BET',
      className: 'text-black',
      style: {
        background: 'var(--gradient-gold-button)',
        boxShadow: 'var(--shadow-gold)',
      } as React.CSSProperties,
      disabled: false,
    }
  }

  if (status === 'cashed_out') {
    return {
      label: `WON $${payout.toFixed(2)}`,
      className: 'bg-[var(--color-accent-green)]/15 text-[var(--color-accent-green)] border border-[var(--color-accent-green)]/30',
      style: { textShadow: '0 0 10px rgba(34,197,94,0.3)' } as React.CSSProperties,
      disabled: true,
    }
  }

  if (status === 'lost') {
    return {
      label: 'LOST',
      className: 'bg-[var(--color-accent-red)]/15 text-[var(--color-accent-red)] border border-[var(--color-accent-red)]/30',
      style: { textShadow: '0 0 10px rgba(239,68,68,0.3)' } as React.CSSProperties,
      disabled: true,
    }
  }

  if (phase === 'FLYING' && status === 'idle') {
    return {
      label: 'BET',
      className: 'bg-gray-700/50 text-gray-500 cursor-not-allowed',
      style: {} as React.CSSProperties,
      disabled: true,
    }
  }

  return {
    label: 'BET',
    className: 'bg-[var(--color-accent-gold)]/40 text-black/50 cursor-not-allowed',
    style: {} as React.CSSProperties,
    disabled: true,
  }
}
