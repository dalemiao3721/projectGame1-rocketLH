/**
 * Express error handling middleware.
 * Catches GameError instances and returns structured API error responses.
 */
import type { Request, Response, NextFunction } from 'express';
export declare function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void;
//# sourceMappingURL=errorHandler.d.ts.map