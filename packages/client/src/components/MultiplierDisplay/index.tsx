import { useRef, useEffect } from 'react'
import { useGameContext } from '../../context/GameContext'

/**
 * Multiplier display positioned top-right of the animation zone.
 * Color changes with multiplier: green (<2x), gold (2-10x), red (≥10x).
 * Matches HistoryBar color scheme.
 */
export function MultiplierDisplay() {
  const { state } = useGameContext()
  const { roundPhase, currentMultiplier, crashMultiplier } = state
  const prevMultiplier = useRef(currentMultiplier)

  const isFlying = roundPhase === 'FLYING'
  const isCrashed = roundPhase === 'CRASHED'
  const displayMultiplier = isCrashed ? crashMultiplier : currentMultiplier
  const value = displayMultiplier ?? 1
  const formatted = `${value.toFixed(2)}x`

  const didUpdate = prevMultiplier.current !== currentMultiplier
  useEffect(() => {
    prevMultiplier.current = currentMultiplier
  }, [currentMultiplier])

  if (roundPhase === 'WAITING' || roundPhase === 'BETTING') return null

  // Color: green (<2x), gold (2-10x), purple (≥10x), red (crashed)
  const { color, shadow } = isCrashed
    ? { color: 'var(--color-accent-red)', shadow: '0 0 40px rgba(239,68,68,0.6), 0 0 80px rgba(239,68,68,0.3)' }
    : value < 2
      ? { color: 'var(--color-accent-green)', shadow: '0 0 40px rgba(34,197,94,0.5), 0 0 80px rgba(34,197,94,0.2)' }
      : value < 10
        ? { color: 'var(--color-text-gold)', shadow: '0 0 40px rgba(245,166,35,0.5), 0 0 80px rgba(245,166,35,0.2)' }
        : { color: '#a855f7', shadow: '0 0 40px rgba(168,85,247,0.5), 0 0 80px rgba(168,85,247,0.2)' }

  return (
    <div
      className="absolute z-10 pointer-events-none select-none
                 top-[12%] right-[8%]
                 max-md:top-[8%] max-md:right-[5%]"
    >
      <span
        className={`
          font-black tracking-tight will-change-transform block text-right
          ${isFlying ? 'animate-[multiplier-pulse_var(--anim-multiplier-bounce)_ease-in-out_infinite]' : ''}
          ${didUpdate && isFlying ? 'animate-[multiplier-flash_300ms_ease-out]' : ''}
        `}
        style={{
          fontSize: 'clamp(2.5rem, 8vw, 5.5rem)',
          color,
          textShadow: shadow,
          lineHeight: 1,
        }}
      >
        {formatted}
      </span>
    </div>
  )
}
