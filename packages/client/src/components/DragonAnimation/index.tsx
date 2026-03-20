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
          width: 'clamp(75px, 12vw, 120px)',
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
            width: 'clamp(75px, 12vw, 120px)',
            zIndex: 50,
          }}
        >
          <RocketSprite />
        </div>
      )}

      {/* Rocket exhaust trail during flight */}
      <ExhaustTrail isFlying={isFlying} />

      {/* Crash explosion effect */}
      <ExplosionEffect isCrashed={isCrashed} />

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
function ExhaustTrail({ isFlying }: { isFlying: boolean }) {
  if (!isFlying) return null;

  return (
    <div className="absolute top-[82%] left-1/2 -translate-x-1/2 w-24 h-60 pointer-events-none overflow-hidden z-20">
      {/* Combustion Core */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-full"
        style={{
          background: 'linear-gradient(to bottom, #fff, #fbbf24 15%, #f97316 40%, #ea580c 70%, transparent)',
          filter: 'blur(3px)',
          opacity: 0.9
        }}
      />
      
      {/* Mach Diamonds (Shock diamonds) */}
      {[0, 1, 2, 3].map((i) => (
        <div 
          key={i}
          className="absolute left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-sky-200/40 rotate-45"
          style={{ 
            top: `${10 + i * 22}%`,
            animation: `mach-pulse 0.15s infinite ${i * 0.04}s alternate`,
            boxShadow: '0 0 8px rgba(255,255,255,0.4)'
          }}
        />
      ))}

      {/* Physics-based Smoke/Vapor */}
      {[...Array(10)].map((_, i) => (
        <div
          key={i}
          className="absolute bg-slate-400/10 rounded-full"
          style={{
            left: `${45 + Math.random() * 10}%`,
            top: `${20 + Math.random() * 60}%`,
            width: `${6 + Math.random() * 10}px`,
            height: `${6 + Math.random() * 10}px`,
            animation: `smoke-float ${0.6 + Math.random() * 0.4}s infinite`,
            filter: 'blur(3px)'
          }}
        />
      ))}

      <style>{`
        @keyframes mach-pulse {
          from { transform: translate(-50%, 0) scale(0.7); opacity: 0.3; }
          to { transform: translate(-50%, 0) scale(1.1); opacity: 0.7; }
        }
        @keyframes smoke-float {
          0% { transform: translateY(0) scale(1); opacity: 0.3; }
          100% { transform: translateY(50px) scale(3); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ─── SpaceX Realism: Physical Explosion with Debris ───
function ExplosionEffect({ isCrashed }: { isCrashed: boolean }) {
  const [show, setShow] = useState(false);
  
  useEffect(() => {
    if (isCrashed) {
      setShow(true);
      const timer = setTimeout(() => setShow(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [isCrashed]);

  if (!show) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
      {/* Central High-Energy Flash */}
      <div className="w-36 h-36 bg-white rounded-full animate-explosion-flash blur-xl" />
      
      {/* Realistic Fire & Heavy Smoke */}
      {[...Array(30)].map((_, i) => { // Increased particle count
        const angle = (i * 12) * Math.PI / 180;
        const velocity = 100 + Math.random() * 200;
        const dist = 180 + Math.random() * 250; // Increased distance 1.5x
        const isSmoke = i % 3 === 0;

        return (
          <div
            key={i}
            className={`absolute rounded-full ${isSmoke ? 'bg-slate-800' : 'bg-orange-600'}`}
            style={{
              width: `${isSmoke ? 45 + Math.random() * 60 : 15 + Math.random() * 25}px`, // Scaled sizes
              height: `${isSmoke ? 45 + Math.random() * 60 : 15 + Math.random() * 25}px`,
              left: '50%',
              top: '50%',
              filter: `blur(${isSmoke ? 15 : 3}px)`,
              opacity: 0.85,
              transform: `translate(-50%, -50%)`,
              animation: `particle-blast-${i} 1.6s cubic-bezier(0.1, 0.5, 0.2, 1) forwards`
            }}
          />
        );
      })}

      {/* Tumbled Metallic Debris */}
      {[...Array(18)].map((_, i) => ( // Increased debris count
        <div 
          key={`debris-${i}`}
          className="absolute bg-slate-900 border border-slate-700 w-6 h-2" // Scaled debris size
          style={{
            left: '50%',
            top: '50%',
            transform: `rotate(${Math.random() * 360}deg)`,
            animation: `debris-fall-${i} 1.8s ease-out forwards`
          }}
        />
      ))}

      <style>{`
        ${[...Array(30)].map((_, i) => {
          const angle = (i * 12) * Math.PI / 180;
          const dist = 180 + Math.random() * 300;
          return `
            @keyframes particle-blast-${i} {
              0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
              100% { transform: translate(calc(-50% + ${Math.cos(angle) * dist}px), calc(-50% + ${Math.sin(angle) * dist}px)) scale(${3 + Math.random() * 5}); opacity: 0; }
            }
          `;
        }).join('')}
        ${[...Array(18)].map((_, i) => {
          const angle = Math.random() * Math.PI * 2;
          const dist = 250 + Math.random() * 150;
          return `
            @keyframes debris-fall-${i} {
              0% { transform: translate(-50%, -50%) rotate(0deg); opacity: 1; }
              100% { transform: translate(calc(-50% + ${Math.cos(angle) * dist}px), calc(-50% + ${Math.sin(angle) * dist}px)) rotate(${1080 + Math.random() * 1500}deg); opacity: 0; }
            }
          `;
        }).join('')}
        @keyframes explosion-flash {
          0% { transform: scale(0.1); opacity: 1; filter: brightness(4); }
          15% { transform: scale(3.5); opacity: 0.9; }
          100% { transform: scale(6.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
