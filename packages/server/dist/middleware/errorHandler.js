/**
 * Express error handling middleware.
 * Catches GameError instances and returns structured API error responses.
 */
import { GameError } from '../engine/CrashEngine.js';
export function errorHandler(err, _req, res, _next) {
    if (err instanceof GameError) {
        res.status(err.httpStatus).json({
            error: {
                code: err.code,
                message: err.message,
            },
        });
        return;
    }
    console.error('[RocketLH] Unexpected error:', err);
    res.status(500).json({
        error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred',
        },
    });
}
//# sourceMappingURL=errorHandler.js.map