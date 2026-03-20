import { useMemo } from 'react'
import { useGameContext } from '../../context/GameContext'
import { PANEL_IDS } from '@rocket-lh/shared'

/**
 * Popup overlay shown when the rocket crashes.
 * Styled as a glassmorphism card (like CashoutOverlay) with red theme.
 * Shows "ROCKET CRASH!", crash multiplier, and lost panels summary.
 * Auto-dismisses when round transitions to SETTLED.
 */
export function CrashedOverlay() {
  const { state } = useGameContext()

  if (state.roundPhase !== 'CRASHED' || state.crashMultiplier === null) return null

  const lostPanels = PANEL_IDS.filter((id: typeof PANEL_IDS[number]) => state.panels[id].status === 'lost')
  const totalLost = lostPanels.reduce((sum: number, id: typeof PANEL_IDS[number]) => sum + state.panels[id].betAmount, 0)

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center rounded-2xl overflow-hidden">
      {/* Backdrop with red tint */}
      <div
        className="absolute inset-0 animate-[fade-in_300ms_ease-out]"
        style={{ background: 'rgba(20,0,0,0.6)' }}
      />

      {/* Explosion particles */}
      <CrashParticles />

      {/* Card */}
      <div
        className="relative animate-[cashout-entrance_var(--anim-cashout-celebration)_ease-out]
                   rounded-2xl px-10 py-8 text-center
                   border border-[var(--color-accent-red)]/40
                   max-w-sm w-[90%]"
        style={{
          background: 'linear-gradient(135deg, rgba(239,68,68,0.18) 0%, rgba(255,107,53,0.06) 50%, rgba(20,14,14,0.95) 100%)',
          backdropFilter: 'blur(24px)',
          boxShadow: '0 0 60px rgba(239,68,68,0.3), 0 0 120px rgba(239,68,68,0.1), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
      >
        {/* Decorative top line */}
        <div
          className="absolute top-0 left-[10%] right-[10%] h-[1px]"
          style={{ background: 'linear-gradient(to right, transparent, var(--color-accent-red), transparent)' }}
        />

        {/* Explosion emoji */}
        <p className="text-4xl mb-2 animate-[fade-in_200ms_ease-out]"
          style={{ filter: 'drop-shadow(0 0 20px rgba(255,107,53,0.6))' }}
        >
          💥
        </p>

        <p
          className="text-sm font-bold uppercase tracking-[0.3em] mb-4"
          style={{
            color: 'var(--color-accent-red)',
            textShadow: '0 0 20px rgba(239,68,68,0.4)',
          }}
        >
          Rocket Crash!
        </p>

        <p
          className="text-white font-black mb-2"
          style={{
            fontSize: 'var(--font-payout)',
            textShadow: '0 0 30px rgba(239,68,68,0.3)',
          }}
        >
          {state.crashMultiplier.toFixed(2)}x
        </p>

        {totalLost > 0 && (
          <p
            className="text-sm font-semibold"
            style={{
              color: 'var(--color-accent-red)',
              textShadow: '0 0 10px rgba(239,68,68,0.3)',
            }}
          >
            -{totalLost.toFixed(2)} ({lostPanels.length} panel{lostPanels.length > 1 ? 's' : ''})
          </p>
        )}

        {/* Decorative bottom line */}
        <div
          className="absolute bottom-0 left-[10%] right-[10%] h-[1px]"
          style={{ background: 'linear-gradient(to right, transparent, var(--color-accent-red), transparent)' }}
        />
      </div>
    </div>
  )
}

/** Red/orange particles bursting from center */
function CrashParticles() {
  const particles = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => {
        const angle = (i / 16) * Math.PI * 2 + Math.random() * 0.3
        const distance = 60 + Math.random() * 120
        return {
          cx: Math.cos(angle) * distance,
          cy: Math.sin(angle) * distance - 30,
          cr: Math.random() * 720 - 360,
          size: 3 + Math.random() * 6,
          duration: 0.6 + Math.random() * 0.5,
          delay: Math.random() * 0.2,
          color: i % 3 === 0 ? '#ef4444' : i % 3 === 1 ? '#ff6b35' : '#f5a623',
        }
      }),
    [],
  )

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 overflow-hidden">
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full animate-[celebration-particle_ease-out_forwards]"
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
