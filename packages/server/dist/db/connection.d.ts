/**
 * PostgreSQL connection pool.
 *
 * Uses the `pg` Pool for connection management.
 * Falls back gracefully — DB failures never block the game engine.
 */
import pg from 'pg';
export declare function getPool(): pg.Pool;
export declare function closePool(): Promise<void>;
//# sourceMappingURL=connection.d.ts.map