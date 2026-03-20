/**
 * SVG Rocket sprite — Disney-inspired "Toy" style.
 * Features: ultra-rounded "pot-bellied" shape, vibrant glossy finish, large expressive window,
 * soft inner glows for 3D depth, and magical star-sparkle engine effects.
 */
export function RocketSprite({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 100 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* ── Main Body: Glossy White Porcelain ── */}
        <radialGradient id="ds-body" cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </radialGradient>
        
        {/* ── Inner Glow for Body (Soft 3D edge) ── */}
        <linearGradient id="ds-body-glow" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="white" stopOpacity="0.4" />
          <stop offset="15%" stopColor="white" stopOpacity="0" />
          <stop offset="85%" stopColor="black" stopOpacity="0" />
          <stop offset="100%" stopColor="black" stopOpacity="0.05" />
        </linearGradient>

        {/* ── Vibrant Red Accents (Nose & Fins) ── */}
        <radialGradient id="ds-red-gloss" cx="40%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#ff4d4d" />
          <stop offset="70%" stopColor="#e11d48" />
          <stop offset="100%" stopColor="#9f1239" />
        </radialGradient>

        {/* ── Large Expressive Window: Multi-layer Glass ── */}
        <radialGradient id="ds-window-depth" cx="40%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#bae6fd" />
          <stop offset="40%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0369a1" />
        </radialGradient>
        
        {/* ── Magical Flame: Soft Blue/White Core ── */}
        <radialGradient id="ds-flame-core" cx="50%" cy="0%" r="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="30%" stopColor="#fbbf24" />
          <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
        </radialGradient>

        {/* ── Ambient Occlusion (Bottom Shadow) ── */}
        <linearGradient id="ds-shadow" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="70%" stopColor="white" stopOpacity="0" />
          <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.5" />
        </linearGradient>

        <filter id="ds-soft-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* ════════════ ENGINE GLOW ════════════ */}
      <circle cx="50" cy="155" r="22" fill="url(#ds-flame-core)" opacity="0.6" filter="url(#ds-soft-glow)">
        <animate attributeName="r" values="20;25;20" dur="0.8s" repeatCount="indefinite" />
      </circle>

      {/* ════════════ MAGICAL FLAME ════════════ */}
      {/* Outer Glow */}
      <path d="M35 145 Q50 175 65 145" fill="none" stroke="#f59e0b" strokeWidth="8" strokeOpacity="0.3" strokeLinecap="round">
        <animate attributeName="d" values="M35 145 Q50 175 65 145; M30 145 Q50 185 70 145; M35 145 Q50 175 65 145" dur="0.4s" repeatCount="indefinite" />
      </path>
      {/* Core Stream */}
      <path d="M42 145 Q50 165 58 145" fill="none" stroke="white" strokeWidth="6" strokeLinecap="round">
        <animate attributeName="d" values="M42 145 Q50 165 58 145; M40 145 Q50 175 60 145; M42 145 Q50 165 58 145" dur="0.3s" repeatCount="indefinite" />
      </path>

      {/* ════════════ FINS — Thick Rounded "Toys" ════════════ */}
      {/* Left Fin */}
      <path d="M30 110 Q10 115 15 145 Q30 140 32 120 Z" fill="url(#ds-red-gloss)" stroke="#9f1239" strokeWidth="0.5" />
      {/* Right Fin */}
      <path d="M70 110 Q90 115 85 145 Q70 140 68 120 Z" fill="url(#ds-red-gloss)" stroke="#9f1239" strokeWidth="0.5" />
      {/* Center Fin (Depth) */}
      <path d="M48 115 Q50 125 52 115 Q50 145 50 145 Z" fill="#9f1239" opacity="0.4" />

      {/* ════════════ MAIN BODY — Pot-bellied shape ════════════ */}
      <path 
        d="M30 145 L30 60 Q30 15 50 5 Q70 15 70 60 L70 145 Q50 155 30 145 Z" 
        fill="url(#ds-body)" 
        stroke="#cbd5e1" 
        strokeWidth="1"
      />
      {/* Shadow overlay */}
      <path 
        d="M30 145 L30 60 Q30 15 50 5 Q70 15 70 60 L70 145 Q50 155 30 145 Z" 
        fill="url(#ds-shadow)" 
      />
      {/* Edge Gloss */}
      <path 
        d="M32 60 Q32 18 50 8" 
        fill="none" 
        stroke="white" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
        opacity="0.6" 
      />

      {/* ════════════ NOSE CONE — Rounded ════════════ */}
      <path 
        d="M30 60 Q30 15 50 5 Q70 15 70 60 Q50 70 30 60 Z" 
        fill="url(#ds-red-gloss)" 
        stroke="#9f1239" 
        strokeWidth="0.5"
      />
      {/* Nose Shine */}
      <ellipse cx="45" cy="25" rx="5" ry="8" fill="white" opacity="0.3" transform="rotate(-20, 45, 25)" />

      {/* ════════════ BIG CARTOON WINDOW ════════════ */}
      {/* Outer Border */}
      <circle cx="50" cy="85" r="14" fill="#64748b" />
      <circle cx="50" cy="85" r="12" fill="white" />
      {/* Glass */}
      <circle cx="50" cy="85" r="10.5" fill="url(#ds-window-depth)" />
      {/* Shine */}
      <path d="M44 80 Q46 76 50 76" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
      <circle cx="43" cy="82" r="1.5" fill="white" opacity="0.6" />

      {/* ════════════ DECORATIVE STAR ════════════ */}
      <path 
        d="M50 115 L52 120 L57 120 L53 123 L54 128 L50 125 L46 128 L47 123 L43 120 L48 120 Z" 
        fill="#f5a623" 
        stroke="#92400e" 
        strokeWidth="0.5"
      />

      {/* ════════════ ENGINE NOZZLE ════════════ */}
      <path 
        d="M35 145 Q35 152 50 152 Q65 152 65 145" 
        fill="none" 
        stroke="#475569" 
        strokeWidth="3" 
        strokeLinecap="round" 
      />
    </svg>
  );
}

