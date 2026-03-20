/**
 * SVG Rocket sprite — Disney-inspired "High-Fidelity" style.
 * Combines cartoon proportions with realistic rendering: rim lighting, 
 * surface panel textures, complex specular highlights, and refractive glass.
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
        {/* ── Body: High-Gloss Ceramic/Metallic Blend ── */}
        <radialGradient id="ds-body-base" cx="45%" cy="35%" r="80%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#f1f5f9" />
          <stop offset="85%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#94a3b8" />
        </radialGradient>
        
        {/* ── Rim Light (The "Disney" 3D separator) ── */}
        <linearGradient id="ds-rim-light" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="white" stopOpacity="0.8" />
          <stop offset="3%" stopColor="white" stopOpacity="0" />
          <stop offset="97%" stopColor="white" stopOpacity="0" />
          <stop offset="100%" stopColor="white" stopOpacity="0.6" />
        </linearGradient>

        {/* ── Specular Shine (Sharp reflection) ── */}
        <linearGradient id="ds-specular" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="35%" stopColor="white" stopOpacity="0" />
          <stop offset="38%" stopColor="white" stopOpacity="0.4" />
          <stop offset="42%" stopColor="white" stopOpacity="0" />
        </linearGradient>

        {/* ── Red Accent: Deep Polish ── */}
        <radialGradient id="ds-red-rich" cx="35%" cy="25%" r="90%">
          <stop offset="0%" stopColor="#ff5f5f" />
          <stop offset="45%" stopColor="#e11d48" />
          <stop offset="85%" stopColor="#881337" />
          <stop offset="100%" stopColor="#4c0519" />
        </radialGradient>

        {/* ── Window: Refractive Depth ── */}
        <radialGradient id="ds-win-glass" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#e0f2fe" />
          <stop offset="25%" stopColor="#7dd3fc" />
          <stop offset="60%" stopColor="#0284c7" />
          <stop offset="90%" stopColor="#0c4a6e" />
          <stop offset="100%" stopColor="#082f49" />
        </radialGradient>

        {/* ── Engine Glow (Blue-hot core) ── */}
        <radialGradient id="ds-magical-core" cx="50%" cy="20%" r="80%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="20%" stopColor="#7dd3fc" />
          <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0" />
        </radialGradient>

        <filter id="ds-bloom" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        {/* ── Subtle Panel Texture ── */}
        <pattern id="ds-panels" x="0" y="0" width="100" height="40" patternUnits="userSpaceOnUse">
          <line x1="0" y1="39.5" x2="100" y2="39.5" stroke="#94a3b8" strokeWidth="0.5" opacity="0.3" />
        </pattern>
      </defs>

      {/* ════════════ ENGINE BLOOM ════════════ */}
      <circle cx="50" cy="158" r="28" fill="url(#ds-magical-core)" opacity="0.5" filter="url(#ds-bloom)">
        <animate attributeName="opacity" values="0.4;0.7;0.4" dur="1s" repeatCount="indefinite" />
      </circle>

      {/* ════════════ MAGICAL ENGINE STREAM ════════════ */}
      <g filter="url(#ds-bloom)">
        {/* Outer Plasma */}
        <path d="M35 145 Q50 185 65 145" fill="none" stroke="#38bdf8" strokeWidth="12" strokeOpacity="0.2" strokeLinecap="round">
          <animate attributeName="d" values="M35 145 Q50 185 65 145; M30 145 Q50 195 70 145; M35 145 Q50 185 65 145" dur="0.5s" repeatCount="indefinite" />
        </path>
        {/* Inner Core */}
        <path d="M42 145 Q50 170 58 145" fill="none" stroke="white" strokeWidth="8" strokeLinecap="round">
          <animate attributeName="d" values="M42 145 Q50 170 58 145; M40 145 Q50 185 60 145; M42 145 Q50 170 58 145" dur="0.25s" repeatCount="indefinite" />
        </path>
      </g>

      {/* ════════════ FINS — Rounded but Solid ════════════ */}
      {/* Left Fin */}
      <path d="M30 110 Q8 115 15 148 Q30 142 32 115 Z" fill="url(#ds-red-rich)" stroke="#4c0519" strokeWidth="0.5" />
      <path d="M18 118 Q12 118 16 135" fill="none" stroke="white" strokeWidth="1.5" opacity="0.2" strokeLinecap="round" />
      {/* Right Fin */}
      <path d="M70 110 Q92 115 85 148 Q70 142 68 115 Z" fill="url(#ds-red-rich)" stroke="#4c0519" strokeWidth="0.5" />
      <path d="M82 118 Q88 118 84 135" fill="none" stroke="white" strokeWidth="1.5" opacity="0.2" strokeLinecap="round" />

      {/* ════════════ MAIN BODY — High-quality Porcelain ════════════ */}
      {/* Base Shape */}
      <path 
        d="M30 145 L30 60 Q30 15 50 5 Q70 15 70 60 L70 145 Q50 155 30 145 Z" 
        fill="url(#ds-body-base)" 
      />
      {/* Subtle Panel Grooves */}
      <path d="M30 145 L30 60 Q30 15 50 5 Q70 15 70 60 L70 145 Q50 155 30 145 Z" fill="url(#ds-panels)" opacity="0.4" />
      
      {/* Light/Shadow Overlays */}
      <path d="M30 145 L30 60 Q30 15 50 5 Q70 15 70 60 L70 145 Q50 155 30 145 Z" fill="url(#ds-specular)" />
      <path d="M30 145 L30 60 Q30 15 50 5 Q70 15 70 60 L70 145 Q50 155 30 145 Z" fill="url(#ds-rim-light)" />

      {/* ════════════ NOSE CONE — Polished Finish ════════════ */}
      <path 
        d="M30 60 Q30 15 50 5 Q70 15 70 60 Q50 72 30 60 Z" 
        fill="url(#ds-red-rich)" 
        stroke="#4c0519" 
        strokeWidth="0.5"
      />
      {/* Rim light on nose */}
      <path d="M32 58 Q32 18 50 8" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      {/* Specular highlight */}
      <ellipse cx="44" cy="24" rx="4" ry="7" fill="white" opacity="0.25" transform="rotate(-15, 44, 24)" />

      {/* ════════════ PREMIUM WINDOW ════════════ */}
      {/* Metallic Bezel */}
      <circle cx="50" cy="85" r="15" fill="#1e293b" />
      <circle cx="50" cy="85" r="14.5" fill="#f1f5f9" />
      <circle cx="50" cy="85" r="13.5" fill="#334155" />
      {/* Glass with internal reflections */}
      <circle cx="50" cy="85" r="12" fill="url(#ds-win-glass)" />
      {/* Surface reflection */}
      <path d="M42 82 Q45 76 52 76" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.3" />
      <circle cx="43" cy="80" r="1.5" fill="white" opacity="0.5" />
      {/* Rim light inside glass */}
      <circle cx="50" cy="85" r="11" fill="none" stroke="white" strokeWidth="0.5" opacity="0.1" />

      {/* ════════════ MECHANICAL DETAILS ════════════ */}
      {/* Rivets / Fasteners */}
      <circle cx="35" cy="100" r="1" fill="#475569" opacity="0.4" />
      <circle cx="65" cy="100" r="1" fill="#475569" opacity="0.4" />
      <circle cx="35" cy="130" r="1" fill="#475569" opacity="0.4" />
      <circle cx="65" cy="130" r="1" fill="#475569" opacity="0.4" />
      
      {/* Golden Logo Plaque */}
      <g transform="translate(42, 115) scale(0.6)">
        <circle cx="13" cy="13" r="14" fill="#f5a623" stroke="#92400e" strokeWidth="1" />
        <path d="M13 5 L15 11 L21 11 L16 15 L18 21 L13 17 L8 21 L10 15 L5 11 L11 11 Z" fill="white" opacity="0.9" />
      </g>

      {/* ════════════ ENGINE NOZZLE — Heat-stained Metal ════════════ */}
      <path 
        d="M34 145 Q35 156 50 156 Q65 156 66 145" 
        fill="none" 
        stroke="#1e293b" 
        strokeWidth="5" 
        strokeLinecap="round" 
      />
      <path 
        d="M36 146 Q35 152 50 152 Q65 152 64 146" 
        fill="none" 
        stroke="#334155" 
        strokeWidth="2" 
        strokeLinecap="round" 
      />
    </svg>
  );
}


