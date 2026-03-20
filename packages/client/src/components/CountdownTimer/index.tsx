import { useRef, useEffect, useState } from 'react'
import { useGameContext } from '../../context/GameContext'

/**
 * Countdown timer shown during WAITING and BETTING phases.
 * Server sends countdown_tick events every second for accurate sync.
 */
export function CountdownTimer() {
  const { state } = useGameContext()
  const { roundPhase, countdown } = state
  const [tick, setTick] = useState(false)
  const prevSeconds = useRef(0)

  const isCountdownPhase = roundPhase === 'WAITING' || roundPhase === 'BETTING'
  const isPostRound = roundPhase === 'CRASHED' || roundPhase === 'SETTLED'
  const isVisible = isCountdownPhase || isPostRound

  // Trigger tick animation when countdown changes
  useEffect(() => {
    if (isVisible && prevSeconds.current !== countdown && countdown > 0) {
      setTick(true)
      const t = setTimeout(() => setTick(false), 300)
      prevSeconds.current = countdown
      return () => clearTimeout(t)
    }
  }, [countdown, isVisible])

  if (!isVisible) return null

  const display = String(countdown).padStart(2, '0')
  const isBetting = roundPhase === 'BETTING'
  const isLastSecond = isBetting && countdown <= 1
  const label = isLastSecond
    ? 'NO MORE BET'
    : isBetting
      ? 'PLACE YOUR BETS'
      : 'WAITING FOR NEXT ROUND'
  const showTimer = isCountdownPhase && countdown > 0

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none select-none">
      {/* Ambient glow ring */}
      <div
        className="absolute rounded-full animate-[countdown-glow_2s_ease-in-out_infinite]"
        style={{
          width: 'clamp(120px, 25vw, 200px)',
          height: 'clamp(120px, 25vw, 200px)',
          background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)',
        }}
      />

      {/* Label */}
      <p
        className={`
          text-sm uppercase tracking-[0.25em] mb-3 font-semibold
          ${isLastSecond ? 'text-[var(--color-accent-red)]' : isBetting ? 'text-[var(--color-accent-gold)]' : 'text-[var(--color-text-secondary)]'}
        `}
        style={{
          textShadow: isLastSecond ? '0 0 20px rgba(239,68,68,0.4)' : isBetting ? '0 0 20px rgba(245,166,35,0.3)' : undefined,
        }}
      >
        {label}
      </p>

      {/* Timer digits — only during countdown phases */}
      {showTimer && (
        <span
          className={`
            font-black text-white will-change-transform
            ${tick ? 'animate-[countdown-tick_400ms_ease-out]' : ''}
          `}
          style={{
            fontSize: 'var(--font-countdown)',
            textShadow: '0 0 30px rgba(255,255,255,0.2), 0 0 60px rgba(124,58,237,0.15)',
          }}
        >
          00:{display}
        </span>
      )}

      {/* Subtext for betting phase */}
      {isBetting && (
        <p className="mt-2 text-xs text-[var(--color-text-secondary)] uppercase tracking-widest animate-pulse">
          Bets are open
        </p>
      )}
    </div>
  )
}
