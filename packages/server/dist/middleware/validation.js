/**
 * Request validation middleware for game API endpoints.
 */
import { PANEL_IDS, BET_DEFAULTS } from '@rocket-lh/shared';
import { GameError } from '../engine/CrashEngine.js';
/** Validate POST /game/bet request body */
export function validatePlaceBet(req, _res, next) {
    const { playerId, panelId, betAmount, autoCashout } = req.body;
    if (!playerId || typeof playerId !== 'string') {
        return next(new GameError('INVALID_PARAMS', 'playerId is required and must be a string', 400));
    }
    if (!panelId || !PANEL_IDS.includes(panelId)) {
        return next(new GameError('INVALID_PANEL_ID', `panelId must be one of: ${PANEL_IDS.join(', ')}`, 400));
    }
    if (typeof betAmount !== 'number' || betAmount < BET_DEFAULTS.MIN_AMOUNT) {
        return next(new GameError('INVALID_PARAMS', `betAmount must be a number >= ${BET_DEFAULTS.MIN_AMOUNT}`, 400));
    }
    if (autoCashout !== undefined && autoCashout !== null) {
        if (typeof autoCashout !== 'number' || autoCashout < BET_DEFAULTS.MIN_AUTO_CASHOUT) {
            return next(new GameError('INVALID_PARAMS', `autoCashout must be >= ${BET_DEFAULTS.MIN_AUTO_CASHOUT}`, 400));
        }
    }
    next();
}
/** Validate POST /game/cashout request body */
export function validateCashout(req, _res, next) {
    const { playerId, panelId, sessionId } = req.body;
    if (!playerId || typeof playerId !== 'string') {
        return next(new GameError('INVALID_PARAMS', 'playerId is required', 400));
    }
    if (!panelId || !PANEL_IDS.includes(panelId)) {
        return next(new GameError('INVALID_PANEL_ID', `panelId must be one of: ${PANEL_IDS.join(', ')}`, 400));
    }
    if (!sessionId || typeof sessionId !== 'string') {
        return next(new GameError('INVALID_PARAMS', 'sessionId is required', 400));
    }
    next();
}
/** Validate GET /game/verify query params */
export function validateVerify(req, _res, next) {
    const { serverSeed, clientSeed, nonce } = req.query;
    if (!serverSeed || typeof serverSeed !== 'string') {
        return next(new GameError('INVALID_PARAMS', 'serverSeed query parameter is required', 400));
    }
    if (!clientSeed || typeof clientSeed !== 'string') {
        return next(new GameError('INVALID_PARAMS', 'clientSeed query parameter is required', 400));
    }
    if (!nonce || isNaN(Number(nonce))) {
        return next(new GameError('INVALID_PARAMS', 'nonce query parameter must be a number', 400));
    }
    next();
}
//# sourceMappingURL=validation.js.map