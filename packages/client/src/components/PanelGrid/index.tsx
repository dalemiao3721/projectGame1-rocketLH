import { PANEL_IDS } from '@rocket-lh/shared'
import { BetPanel } from '../BetPanel'
import { CashoutOverlay } from '../CashoutOverlay'
import { CrashedOverlay } from '../CrashedOverlay'

/**
 * 2x2 grid container for the four bet panels.
 * Overlays (Cashout/Crash) are positioned relative to this container
 * so they appear centered over the panel area.
 */
export function PanelGrid() {
  return (
    <div className="relative">
      <div
        className="grid grid-cols-2 max-md:grid-cols-1"
        style={{ gap: 'var(--space-panel-gap)' }}
      >
        {PANEL_IDS.map((id: typeof PANEL_IDS[number]) => (
          <BetPanel key={id} panelId={id} />
        ))}
      </div>

      {/* Overlays centered over the panel grid */}
      <CashoutOverlay />
      <CrashedOverlay />
    </div>
  )
}
