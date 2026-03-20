/**
 * WebSocket multiplier broadcast + client message handler.
 *
 * - Server → Client: broadcasts round lifecycle events to all connected clients
 * - Client → Server: handles place_bet, cashout, register actions per connection
 *
 * Each WS connection is assigned an auto-generated playerId on connect.
 * Clients can override it by sending a `register` message with their own ID.
 */
import { CrashEngine } from '../engine/CrashEngine.js';
let wsConnectionCounter = 0;
export function setupMultiplierBroadcast(wss) {
    const engine = CrashEngine.getInstance();
    function broadcast(message) {
        const data = JSON.stringify(message);
        for (const client of wss.clients) {
            if (client.readyState === 1) { // WebSocket.OPEN
                client.send(data);
            }
        }
    }
    function sendTo(ws, message) {
        if (ws.readyState === 1) {
            ws.send(JSON.stringify(message));
        }
    }
    // ── Server → Client broadcasts ──────────────────────────
    engine.on('round_waiting', (countdown) => {
        broadcast({ event: 'round_waiting', data: { countdown } });
    });
    engine.on('round_betting', (sessionId, serverSeedHash, countdown) => {
        broadcast({ event: 'round_betting', data: { sessionId, serverSeedHash, countdown } });
    });
    engine.on('round_flying', () => {
        broadcast({ event: 'round_flying', data: {} });
    });
    engine.on('multiplier_update', (multiplier, elapsed) => {
        broadcast({ event: 'multiplier_update', data: { multiplier, elapsed } });
    });
    engine.on('round_crashed', (crashMultiplier, serverSeed) => {
        broadcast({ event: 'round_crashed', data: { crashMultiplier, serverSeed } });
    });
    engine.on('auto_cashout_triggered', (panelId, _playerId, multiplier, payout) => {
        broadcast({ event: 'auto_cashout_triggered', data: { panelId, multiplier, payout } });
    });
    engine.on('history_update', (recent) => {
        broadcast({ event: 'history_update', data: { recent } });
    });
    // ── Connection handler ──────────────────────────────────
    wss.on('connection', (rawWs) => {
        const ws = rawWs;
        ws.playerId = `ws-player-${++wsConnectionCounter}-${Date.now()}`;
        // Send current round state on connect
        const state = engine.getRoundState();
        const history = engine.getHistory(10);
        sendTo(ws, {
            event: `round_${state.phase.toLowerCase()}`,
            data: {
                sessionId: state.sessionId,
                serverSeedHash: state.serverSeedHash,
                multiplier: state.currentMultiplier,
                elapsed: state.elapsed,
                countdown: 0,
            },
        });
        sendTo(ws, { event: 'history_update', data: { recent: history } });
        // Confirm assigned playerId
        sendTo(ws, { event: 'registered', data: { playerId: ws.playerId } });
        // ── Client → Server message handler ─────────────────
        ws.on('message', async (raw) => {
            let msg;
            try {
                msg = JSON.parse(raw.toString());
            }
            catch {
                sendTo(ws, { event: 'error', data: { code: 'INVALID_JSON', message: 'Failed to parse message' } });
                return;
            }
            try {
                switch (msg.action) {
                    case 'register': {
                        if (msg.data.playerId) {
                            ws.playerId = msg.data.playerId;
                        }
                        sendTo(ws, { event: 'registered', data: { playerId: ws.playerId } });
                        break;
                    }
                    case 'place_bet': {
                        const { panelId, betAmount, autoCashout, lobbyToken, lobbySessionId } = msg.data;
                        const result = await engine.placeBet({
                            playerId: ws.playerId,
                            panelId,
                            betAmount,
                            autoCashout,
                            lobbyToken,
                            lobbySessionId,
                        });
                        sendTo(ws, {
                            event: 'bet_confirmed',
                            data: { panelId: result.panelId, betId: result.betId, balance: result.balance },
                        });
                        break;
                    }
                    case 'cashout': {
                        const { panelId, sessionId } = msg.data;
                        const result = await engine.cashout({
                            playerId: ws.playerId,
                            panelId,
                            sessionId,
                        });
                        sendTo(ws, {
                            event: 'cashout_success',
                            data: {
                                panelId: result.panelId,
                                multiplier: result.cashoutMultiplier,
                                payout: result.payout,
                                balance: result.balance,
                            },
                        });
                        break;
                    }
                }
            }
            catch (err) {
                sendTo(ws, {
                    event: 'error',
                    data: { code: err.code || 'UNKNOWN', message: err.message },
                });
            }
        });
    });
}
//# sourceMappingURL=multiplier.js.map