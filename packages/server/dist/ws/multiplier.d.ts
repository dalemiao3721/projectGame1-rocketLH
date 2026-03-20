/**
 * WebSocket multiplier broadcast + client message handler.
 *
 * - Server → Client: broadcasts round lifecycle events to all connected clients
 * - Client → Server: handles place_bet, cashout, register actions per connection
 *
 * Each WS connection is assigned an auto-generated playerId on connect.
 * Clients can override it by sending a `register` message with their own ID.
 */
import type { WebSocketServer } from 'ws';
export declare function setupMultiplierBroadcast(wss: WebSocketServer): void;
//# sourceMappingURL=multiplier.d.ts.map