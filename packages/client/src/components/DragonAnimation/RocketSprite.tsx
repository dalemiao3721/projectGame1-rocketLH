/**
 * SVG Rocket sprite — SpaceX-inspired "High-Fidelity Realism" style.
 * Features: High aspect ratio (slender), stainless steel and heat-shield tile textures,
 * grid fins, interstage details, and realistic Raptor-style nozzles with heat staining.
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
        {/* ── Main Body: Matte White Finish (Falcon 9 Style) ── */}
        <linearGradient id="sx-body-white" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#e2e8f0" />
          <stop offset="30%" stopColor="#ffffff" />
          <stop offset="70%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>

        {/* ── Interstage & Nozzle: Dark Metallic Carbon/Steel ── */}
        <linearGradient id="sx-body-dark" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="15%" stopColor="#1e293b" />
          <stop offset="85%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>

        {/* ── Nozzle Heat Staining (Anodized look) ── */}
        <radialGradient id="sx-nozzle-heat" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
          <stop offset="50%" stopColor="#f43f5e" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
        </radialGradient>

        {/* ── Sharp Sunlight Scrim (Specular) ── */}
        <linearGradient id="sx-sunlight" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="20%" stopColor="white" stopOpacity="0" />
          <stop offset="25%" stopColor="white" stopOpacity="0.7" />
          <stop offset="28%" stopColor="white" stopOpacity="0" />
        </linearGradient>

        <filter id="sx-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* ════════════ ENGINE PLUME CORE ════════════ */}
      <g filter="url(#sx-glow)">
        <path d="M40 160 Q50 190 60 160" fill="none" stroke="#f97316" strokeWidth="14" strokeOpacity="0.4">
          <animate attributeName="d" values="M40 160 Q50 190 60 160; M35 160 Q50 205 65 160; M40 160 Q50 190 60 160" dur="0.2s" repeatCount="indefinite" />
        </path>
        <path d="M45 160 Q50 180 55 160" fill="none" stroke="white" strokeWidth="6" strokeLinecap="round">
          <animate attributeName="d" values="M45 160 Q50 180 55 160; M42 160 Q50 195 58 160; M45 160 Q50 180 55 160" dur="0.1s" repeatCount="indefinite" />
        </path>
      </g>

      {/* ════════════ MAIN BODY (F9 STYLE) ════════════ */}
      {/* Interstage (Black portion) */}
      <rect x="38" y="25" width="24" height="15" fill="url(#sx-body-dark)" rx="1" />
      
      {/* Booster Tube */}
      <rect x="38" y="40" width="24" height="110" fill="url(#sx-body-white)" />
      
      {/* Shadowing & Specular */}
      <rect x="38" y="40" width="24" height="110" fill="url(#sx-sunlight)" />

      {/* ════════════ NOSE CONE (FAIRING) ════════════ */}
      <path d="M38 40 L38 25 Q38 2 50 2 Q62 2 62 25 L62 40 Z" fill="url(#sx-body-white)" />
      <path d="M38 40 L38 25 Q38 2 50 2" fill="none" stroke="white" strokeWidth="0.8" opacity="0.4" />
      
      {/* ════════════ GRID FINS (UPPER) ════════════ */}
      <g transform="translate(36, 30)">
        <rect width="6" height="8" fill="#1e293b" rx="0.5" transform="skewY(-10)" />
        <line x1="1" y1="1" x2="5" y2="7" stroke="#475569" strokeWidth="0.5" opacity="0.5" />
        <line x1="5" y1="1" x2="1" y2="7" stroke="#475569" strokeWidth="0.5" opacity="0.5" />
      </g>
      <g transform="translate(58, 30)">
        <rect width="6" height="8" fill="#1e293b" rx="0.5" transform="skewY(10)" />
        <line x1="1" y1="1" x2="5" y2="7" stroke="#475569" strokeWidth="0.5" opacity="0.5" />
        <line x1="5" y1="1" x2="1" y2="7" stroke="#475569" strokeWidth="0.5" opacity="0.5" />
      </g>

      {/* ════════════ LANDING LEGS (FOLDED) ════════════ */}
      <path d="M38 120 L35 150 L38 150 Z" fill="#0f172a" />
      <path d="M62 120 L65 150 L62 150 Z" fill="#0f172a" />

      {/* ════════════ INDUSTRIAL DETAILS ════════════ */}
      {/* External Pipe (LOX Line) */}
      <rect x="49" y="40" width="1.5" height="110" fill="#94a3b8" opacity="0.6" />
      
      {/* USA Decal (Abstract) */}
      <rect x="43" y="65" width="4" height="2.5" fill="#1e40af" rx="0.2" />
      <rect x="43" y="68.5" width="14" height="1" fill="#1e293b" rx="0.2" />
      
      {/* Panel Rivets/Sensors */}
      <circle cx="41" cy="50" r="0.4" fill="#000" opacity="0.3" />
      <circle cx="41" cy="60" r="0.4" fill="#000" opacity="0.3" />
      <circle cx="41" cy="70" r="0.4" fill="#000" opacity="0.3" />
      
      {/* Cold Gas Thruster Ports */}
      <rect x="47" y="32" width="1" height="0.5" fill="white" opacity="0.8" />
      <rect x="52" y="32" width="1" height="0.5" fill="white" opacity="0.8" />

      {/* ════════════ ENGINE SECTION ════════════ */}
      <rect x="40" y="150" width="20" height="8" fill="url(#sx-body-dark)" />
      {/* Nozzles */}
      <path d="M42 158 L40 166 L46 166 L44 158 Z" fill="#334155" />
      <path d="M50 158 L48 166 L52 166 L50 158 Z" fill="#334155" />
      <path d="M58 158 L56 166 L60 166 L58 158 Z" fill="#334155" />
      {/* Heat staining overlay */}
      <rect x="40" y="158" width="20" height="8" fill="url(#sx-nozzle-heat)" />
    </svg>
  );
}


