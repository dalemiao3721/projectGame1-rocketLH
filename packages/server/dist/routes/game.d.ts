/**
 * Game API routes.
 *
 * POST /game/bet         — Place a bet on a panel (BETTING phase)
 * POST /game/cashout     — Cash out a panel (FLYING phase)
 * GET  /game/balance     — Get player balance
 * GET  /game/history     — Recent crash history
 * GET  /game/verify      — Verify round fairness
 * GET  /game/round-state — Current round state (for reconnection)
 */
import { Router } from 'express';
declare const router: ReturnType<typeof Router>;
export default router;
//# sourceMappingURL=game.d.ts.map