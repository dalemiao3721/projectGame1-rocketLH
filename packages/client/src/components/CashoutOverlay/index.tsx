import { useEffect, useState, useMemo } from 'react'
import { useGameContext } from '../../context/GameContext'
import { PANEL_IDS } from '@rocket-lh/shared'

/**
 * Golden glassmorphism overlay shown when any panel successfully cashes out.
 * Displays "CONGRATULATIONS!", total payout, cashout multiplier,
 * and golden celebration particles bursting outward.
 * Auto-dismisses after 3 seconds.
 */
export function CashoutOverlay() {
  const { state } = useGameContext()
  const [visible, setVisible] = useState(false)
  const [lastCashout, setLastCashout] = useState<{ payout: number; multiplier: number } | null>(null)

  // Show overlay when any panel cashes out
  useEffect(() => {
    const cashedOut = PANEL_IDS
      .map((id: typeof PANEL_IDS[number]) => state.panels[id])
      .filter((p) => p.status === 'cashed_out' && p.payout > 0)

    if (cashedOut.length > 0 && state.roundPhase === 'FLYING') {
      const totalPayout = cashedOut.reduce((sum: number, p) => sum + p.payout, 0)
      const maxMultiplier = Math.max(...cashedOut.map((p) => p.cashoutMultiplier ?? 1))
      setLastCashout({ payout: totalPayout, multiplier: maxMultiplier })
      setVisible(true)

      const timer = setTimeout(() => setVisible(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [state.panels, state.roundPhase])

  // Force hide on new round
  useEffect(() => {
    if (state.roundPhase === 'WAITING' || state.roundPhase === 'BETTING') {
      setVisible(false)
    }
  }, [state.roundPhase])

  if (!visible || !lastCashout) return null

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center rounded-2xl overflow-hidden pointer-events-none">
      {/* Backdrop with golden tint */}
      <div
        className="absolute inset-0 animate-[fade-in_300ms_ease-out]"
        style={{ background: 'rgba(0,0,0,0.5)' }}
      />

      {/* Celebration particles */}
      <CelebrationParticles />

      {/* Card */}
      <div
        className="relative animate-[cashout-entrance_var(--anim-cashout-celebration)_ease-out]
                   rounded-2xl px-10 py-8 text-center
                   border border-[var(--color-accent-gold)]/40
                   max-w-sm w-[90%]"
        style={{
          background: 'linear-gradient(135deg, rgba(245,166,35,0.18) 0%, rgba(251,191,36,0.06) 50%, rgba(20,24,51,0.95) 100%)',
          backdropFilter: 'blur(24px)',
          boxShadow: '0 0 60px rgba(245,166,35,0.3), 0 0 120px rgba(245,166,35,0.1), inset 0 1px 0 rgba(255,255,255,0.1)',
        }}
      >
        {/* Decorative top line */}
        <div
          className="absolute top-0 left-[10%] right-[10%] h-[1px]"
          style={{ background: 'linear-gradient(to right, transparent, var(--color-accent-gold), transparent)' }}
        />

        <p
          className="text-sm font-bold uppercase tracking-[0.3em] mb-4"
          style={{
            color: 'var(--color-accent-gold)',
            textShadow: '0 0 20px rgba(245,166,35,0.4)',
          }}
        >
          Congratulations!
        </p>

        <p
          className="text-white font-black mb-2"
          style={{
            fontSize: 'var(--font-payout)',
            textShadow: '0 0 30px rgba(255,255,255,0.3)',
          }}
        >
          ${lastCashout.payout.toFixed(2)}
        </p>

        <p
          className="text-lg font-bold"
          style={{
            color: 'var(--color-text-gold)',
            textShadow: '0 0 15px rgba(251,191,36,0.4)',
          }}
        >
          {lastCashout.multiplier.toFixed(2)}x
        </p>

        {/* Decorative bottom line */}
        <div
          className="absolute bottom-0 left-[10%] right-[10%] h-[1px]"
          style={{ background: 'linear-gradient(to right, transparent, var(--color-accent-gold), transparent)' }}
        />
      </div>
    </div>
  )
}

/** Golden particles bursting from center */
function CelebrationParticles() {
  const particles = useMemo(
    () =>
      Array.from({ length: 20 }, (_, i) => {
        const angle = (i / 20) * Math.PI * 2 + Math.random() * 0.3
        const distance = 80 + Math.random() * 150
        return {
          cx: Math.cos(angle) * distance,
          cy: Math.sin(angle) * distance - 40,
          cr: Math.random() * 720 - 360,
          size: 4 + Math.random() * 8,
          duration: 0.8 + Math.random() * 0.6,
          delay: Math.random() * 0.3,
          color: i % 4 === 0 ? '#f5a623' : i % 4 === 1 ? '#fbbf24' : i % 4 === 2 ? '#fcd34d' : '#ffffff',
          shape: i % 3 === 0 ? 'circle' : 'square',
        }
      }),
    [],
  )

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 overflow-hidden">
      {particles.map((p, i) => (
        <div
          key={i}
          className={`absolute animate-[celebration-particle_ease-out_forwards] ${p.shape === 'circle' ? 'rounded-full' : 'rounded-sm'}`}
          style={{
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: p.color,
            boxShadow: `0 0 ${p.size}px ${p.color}`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            '--cx': `${p.cx}px`,
            '--cy': `${p.cy}px`,
            '--cr': `${p.cr}deg`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}
