/**
 * Request validation middleware for game API endpoints.
 */
import type { Request, Response, NextFunction } from 'express';
/** Validate POST /game/bet request body */
export declare function validatePlaceBet(req: Request, _res: Response, next: NextFunction): void;
/** Validate POST /game/cashout request body */
export declare function validateCashout(req: Request, _res: Response, next: NextFunction): void;
/** Validate GET /game/verify query params */
export declare function validateVerify(req: Request, _res: Response, next: NextFunction): void;
//# sourceMappingURL=validation.d.ts.map