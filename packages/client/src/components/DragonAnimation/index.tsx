import { useMemo, useRef, useEffect, useState } from 'react'
import { useGameContext } from '../../context/GameContext'
import { MultiplierDisplay } from '../MultiplierDisplay'
import { CountdownTimer } from '../CountdownTimer'
import { RocketSprite } from './RocketSprite'

/**
 * Main animation zone — top section of the game.
 * Shows: parallax starfield, shooting stars, rocket ascent animation,
 * multiplier display (top-right), countdown timer, and crash explosion effects.
 */
export function DragonAnimation() {
  const { state } = useGameContext()
  const { roundPhase } = state

  const isFlying = roundPhase === 'FLYING'
  const isCrashed = roundPhase === 'CRASHED'
  const rocketRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const lastPosRef = useRef<{ left: number; top: number }>({ left: 0, top: 0 })
  const [crashPos, setCrashPos] = useState<{ left: number; top: number } | null>(null)

  // Continuously track rocket position during flight
  useEffect(() => {
    if (!isFlying) return
    let raf: number
    const track = () => {
      if (rocketRef.current && containerRef.current) {
        const elRect = rocketRef.current.getBoundingClientRect()
        const parentRect = containerRef.current.getBoundingClientRect()
        lastPosRef.current = {
          left: elRect.left - parentRect.left,
          top: elRect.top - parentRect.top,
        }
      }
      raf = requestAnimationFrame(track)
    }
    raf = requestAnimationFrame(track)
    return () => cancelAnimationFrame(raf)
  }, [isFlying])

  // On crash, use last tracked position
  useEffect(() => {
    if (isCrashed) {
      setCrashPos({ ...lastPosRef.current })
    }
    if (roundPhase === 'WAITING') {
      setCrashPos(null)
    }
  }, [isCrashed, roundPhase])

  return (
    <div
      ref={containerRef}
      className={`
        relative w-full rounded-2xl
        border border-[var(--glass-border)]
        ${isCrashed ? 'animate-[crash-shake_0.6s_ease-in-out] overflow-visible' : 'overflow-hidden'}
      `}
      style={{
        background: 'var(--gradient-sky)',
        height: 'var(--rocket-area-height, clamp(200px, 49vh, 585px))',
        boxShadow: isCrashed
          ? '0 0 40px rgba(239, 68, 68, 0.3), inset 0 0 60px rgba(239, 68, 68, 0.1)'
          : 'var(--shadow-panel)',
      }}
    >
      {/* Red flash on crash */}
      {isCrashed && (
        <div
          className="absolute inset-0 z-30 pointer-events-none animate-[red-flash_0.8s_ease-out_forwards]"
          style={{ background: 'radial-gradient(circle at center, rgba(239,68,68,0.35) 0%, rgba(239,68,68,0.1) 50%, transparent 80%)' }}
        />
      )}

      {/* Starfield */}
      <Starfield />

      {/* Shooting Stars */}
      <ShootingStars />

      {/* Nebula glow */}
      <div
        className="absolute pointer-events-none opacity-30"
        style={{
          width: '300px',
          height: '300px',
          top: '10%',
          right: '5%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.3) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      {/* Rocket — always mounted so ref survives crash transition */}
      <div
        ref={rocketRef}
        className={`
          absolute will-change-transform
          ${isFlying
            ? 'animate-[dragon-fly_18s_linear_forwards]'
            : !isCrashed
              ? 'animate-[dragon-idle_3s_ease-in-out_infinite]'
              : ''
          }
        `}
        style={{
          width: 'clamp(50px, 8vw, 80px)',
          bottom: '2%',
          left: '3%',
          transform: 'rotate(75deg)',
          filter: isFlying
            ? 'drop-shadow(0 0 25px rgba(255,107,53,0.7)) drop-shadow(0 0 50px rgba(245,166,35,0.3))'
            : 'drop-shadow(0 0 15px rgba(255,107,53,0.4))',
          // Hide when crash animation takes over
          visibility: (isCrashed && crashPos) ? 'hidden' : 'visible',
        }}
      >
        <RocketSprite />
      </div>

      {/* Rocket — crash: falling from captured position */}
      {isCrashed && crashPos && (
        <div
          className="animate-[rocket-fall_2s_ease-in_forwards]"
          style={{
            position: 'absolute',
            left: `${crashPos.left}px`,
            top: `${crashPos.top}px`,
            width: 'clamp(50px, 8vw, 80px)',
            zIndex: 50,
          }}
        >
          <RocketSprite />
        </div>
      )}

      {/* Rocket exhaust trail during flight */}
      {isFlying && <ExhaustTrail />}

      {/* Crash explosion effect */}
      {isCrashed && <ExplosionEffect />}

      {/* Overlays: countdown (center) or multiplier (top-right) */}
      <CountdownTimer />
      <MultiplierDisplay />

      {/* Bottom gradient fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
        style={{ background: 'linear-gradient(to top, var(--color-bg-primary), transparent)' }}
      />
    </div>
  )
}

/** Parallax starfield with two layers */
function Starfield() {
  const stars = useMemo(() => {
    const layers = []
    for (let i = 0; i < 40; i++) {
      layers.push({
        size: 1 + Math.random() * 1.5,
        x: Math.random() * 100,
        y: Math.random() * 200,
        delay: Math.random() * 4,
        duration: 2 + Math.random() * 3,
        opacity: 0.15 + Math.random() * 0.35,
        layer: 'back' as const,
      })
    }
    for (let i = 0; i < 15; i++) {
      layers.push({
        size: 1.5 + Math.random() * 2,
        x: Math.random() * 100,
        y: Math.random() * 200,
        delay: Math.random() * 3,
        duration: 1.5 + Math.random() * 2,
        opacity: 0.4 + Math.random() * 0.6,
        layer: 'front' as const,
      })
    }
    return layers
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0 animate-[starfield-scroll_60s_linear_infinite]"
        style={{ height: '200%' }}
      >
        {stars.map((star, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white animate-[twinkle_ease-in-out_infinite]"
            style={{
              width: `${star.size}px`,
              height: `${star.size}px`,
              top: `${star.y}%`,
              left: `${star.x}%`,
              animationDelay: `${star.delay}s`,
              animationDuration: `${star.duration}s`,
              opacity: star.opacity,
              boxShadow: star.layer === 'front' ? `0 0 ${star.size * 2}px rgba(255,255,255,0.3)` : undefined,
            }}
          />
        ))}
      </div>
    </div>
  )
}

/** Animated shooting stars */
function ShootingStars() {
  const meteors = useMemo(
    () =>
      Array.from({ length: 3 }, (_, i) => ({
        top: 5 + Math.random() * 40,
        left: 20 + Math.random() * 60,
        delay: i * 4 + Math.random() * 3,
        duration: 1.5 + Math.random() * 1,
      })),
    [],
  )

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {meteors.map((m, i) => (
        <div
          key={i}
          className="absolute h-[1px] rounded-full animate-[shooting-star_ease-out_infinite]"
          style={{
            top: `${m.top}%`,
            left: `${m.left}%`,
            animationDelay: `${m.delay}s`,
            animationDuration: `${m.duration}s`,
            background: 'linear-gradient(to right, rgba(255,255,255,0.8), rgba(200,200,255,0.4), transparent)',
            boxShadow: '0 0 4px rgba(200,200,255,0.5)',
          }}
        />
      ))}
    </div>
  )
}

/** Multi-layer exhaust trail behind the flying rocket */
function ExhaustTrail() {
  return (
    <div className="absolute bottom-[8%] left-[12%] pointer-events-none will-change-transform">
      {/* Soft magical glow */}
      <div
        className="absolute -top-6 -left-4 w-32 h-14 rounded-full animate-pulse opacity-40"
        style={{
          background: 'radial-gradient(ellipse at left, rgba(56,189,248,0.5), rgba(124,58,237,0.2) 60%, transparent 90%)',
          filter: 'blur(12px)',
        }}
      />
      {/* Core magical stream */}
      <div
        className="absolute w-36 h-4 rounded-full animate-pulse"
        style={{
          background: 'linear-gradient(to right, rgba(255,255,255,1), rgba(56,189,248,0.8), rgba(124,58,237,0.4), transparent)',
          filter: 'blur(3px)',
          boxShadow: '0 0 25px rgba(56,189,248,0.6)',
        }}
      />
      {/* Magical sparkle particles */}
      {[...Array(10)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-pulse"
          style={{
            width: `${3 + Math.random() * 5}px`,
            height: `${3 + Math.random() * 5}px`,
            top: `${-10 + Math.random() * 20}px`,
            left: `${Math.random() * 100}px`,
            background: 'white',
            borderRadius: '1px',
            transform: `rotate(${Math.random() * 360}deg)`,
            opacity: 0.6 + Math.random() * 0.4,
            animationDelay: `${Math.random() * 0.8}s`,
            animationDuration: `${0.3 + Math.random() * 0.4}s`,
            boxShadow: `0 0 8px ${i % 2 === 0 ? 'rgba(56,189,248,0.8)' : 'rgba(124,58,237,0.8)'}`,
          }}
        />
      ))}
    </div>
  )
}

/** Crash explosion with soft magical fire particles and radial burst */
function ExplosionEffect() {
  const particles = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => {
        const angle = (i / 18) * Math.PI * 2
        const distance = 50 + Math.random() * 110
        return {
          px: Math.cos(angle) * distance,
          py: Math.sin(angle) * distance,
          size: 6 + Math.random() * 12,
          duration: 0.6 + Math.random() * 0.6,
          delay: Math.random() * 0.2,
          color: i % 4 === 0 ? '#ff4d4d' : i % 4 === 1 ? '#38bdf8' : i % 4 === 2 ? '#fbbf24' : '#ffffff',
        }
      }),
    [],
  )

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      {/* Soft radial burst */}
      <div
        className="absolute rounded-full animate-[explosion-expand_1s_ease-out_forwards]"
        style={{
          width: '140px',
          height: '140px',
          background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(56,189,248,0.4) 40%, transparent 80%)',
        }}
      />
      {/* Colorful magical ring */}
      <div
        className="absolute rounded-full animate-[explosion-expand_1.2s_ease-out_0.1s_forwards]"
        style={{
          width: '100px',
          height: '100px',
          background: 'radial-gradient(circle, rgba(124,58,237,0.3) 0%, transparent 70%)',
          border: '2px solid rgba(255,255,255,0.2)',
        }}
      />
      {/* Magical fire sparks */}
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full animate-[fire-particle_ease-out_forwards]"
          style={{
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: p.color,
            boxShadow: `0 0 ${p.size * 1.5}px ${p.color}`,
            filter: 'blur(1px)',
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            '--px': `${p.px}px`,
            '--py': `${p.py}px`,
          } as React.CSSProperties}
        />
      ))}
      {/* Central bright flash */}
      <div
        className="absolute rounded-full animate-[fade-in_200ms_ease-out]"
        style={{
          width: '80px',
          height: '80px',
          background: 'radial-gradient(circle, #fff 0%, rgba(56,189,248,0.6) 50%, transparent 80%)',
          filter: 'blur(6px)',
        }}
      />
    </div>
  )
}
