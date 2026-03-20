import { useGameContext } from '../../context/GameContext'

/**
 * Displays the last 10 round crash multipliers as colored pills.
 * Color coding: Green < 2x, Gold 2x-10x, Red > 10x
 * Features: pill entrance animation, glow effect on high multipliers.
 */
export function HistoryBar() {
  const { state } = useGameContext()
  const { history } = state

  if (history.length === 0) return null

  return (
    <div
      className="flex items-center gap-2 overflow-x-auto py-2 px-1 scrollbar-none"
      style={{
        background: 'linear-gradient(to right, rgba(20,24,51,0.5), transparent 5%, transparent 95%, rgba(20,24,51,0.5))',
      }}
    >
      <span className="text-xs text-[var(--color-text-secondary)] whitespace-nowrap shrink-0 uppercase tracking-wider font-semibold max-md:text-[10px]">
        History
      </span>
      {history.slice(0, 10).map((entry: { sessionId: string; crashMultiplier: number }, i: number) => {
        const style = getMultiplierStyle(entry.crashMultiplier)
        return (
          <span
            key={`${entry.sessionId}-${i}`}
            className={`
              shrink-0 px-2.5 py-1 rounded-full text-xs font-bold
              animate-[pill-enter_300ms_ease-out]
              max-md:px-2 max-md:py-0.5 max-md:text-[10px]
              ${style.className}
            `}
            style={{
              animationDelay: `${i * 50}ms`,
              animationFillMode: 'backwards',
              boxShadow: style.shadow,
            }}
          >
            {entry.crashMultiplier.toFixed(2)}x
          </span>
        )
      })}
    </div>
  )
}

function getMultiplierStyle(multiplier: number) {
  if (multiplier < 2) {
    return {
      className: 'bg-[var(--color-accent-green)]/15 text-[var(--color-accent-green)]',
      shadow: undefined,
    }
  }
  if (multiplier < 10) {
    return {
      className: 'bg-[var(--color-accent-gold)]/15 text-[var(--color-text-gold)]',
      shadow: multiplier >= 5 ? '0 0 8px rgba(245,166,35,0.2)' : undefined,
    }
  }
  return {
    className: 'bg-[#a855f7]/15 text-[#a855f7]',
    shadow: '0 0 10px rgba(168,85,247,0.2)',
  }
}
