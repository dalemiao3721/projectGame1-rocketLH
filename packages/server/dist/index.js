import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { config } from 'dotenv';
import gameRoutes from './routes/game.js';
import { errorHandler } from './middleware/errorHandler.js';
import { setupMultiplierBroadcast } from './ws/multiplier.js';
import { CrashEngine } from './engine/CrashEngine.js';
config();
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });
const PORT = parseInt(process.env.PORT || '4002', 10);
app.use(express.json());
// CORS for dev
app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type, X-Game-Secret');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (_req.method === 'OPTIONS') {
        res.sendStatus(204);
        return;
    }
    next();
});
// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', game: 'rocketLH', timestamp: new Date().toISOString() });
});
// Game API routes
app.use('/game', gameRoutes);
// Error handler (must be after routes)
app.use(errorHandler);
// WebSocket connection logging
wss.on('connection', (ws) => {
    console.log('[RocketLH] WebSocket client connected');
    ws.on('close', () => {
        console.log('[RocketLH] WebSocket client disconnected');
    });
});
// Setup WebSocket broadcast
setupMultiplierBroadcast(wss);
// Start game engine
const engine = CrashEngine.getInstance();
engine.start();
console.log('[RocketLH] CrashEngine started');
server.listen(PORT, () => {
    console.log(`[RocketLH] Server running at http://localhost:${PORT}`);
    console.log(`[RocketLH] WebSocket ready on ws://localhost:${PORT}`);
    console.log(`[RocketLH] Game API at http://localhost:${PORT}/game/*`);
});
export default app;
//# sourceMappingURL=index.js.map