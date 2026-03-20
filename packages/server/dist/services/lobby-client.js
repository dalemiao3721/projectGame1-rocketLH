/**
 * HTTP client for communicating with the game lobby backend.
 *
 * Authentication:
 * - getBalance: Uses player's game-session-token (Bearer auth)
 * - settle / closeSession: Uses shared game secret (X-Game-Secret header)
 */
const LOBBY_API_URL = process.env.LOBBY_API_URL || 'http://localhost:3000';
const GAME_SECRET = process.env.ROCKETLH_GAME_SECRET || 'rocketlh-shared-secret-dev';
/**
 * Get player balance from the lobby.
 * Uses the game-session-token (Bearer auth).
 */
export async function getBalance(lobbyToken) {
    const res = await fetch(`${LOBBY_API_URL}/api/game/balance`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${lobbyToken}`,
        },
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Failed to get balance' }));
        throw new Error(err.message || `Lobby getBalance failed: HTTP ${res.status}`);
    }
    return res.json();
}
/**
 * Settle a game transaction with the lobby (deduct bet / pay winnings).
 * Uses the shared game secret for authentication.
 *
 * - Debit (bet):    settle(sessionId, betAmount, 0)
 * - Credit (payout): settle(sessionId, 0, payout)
 */
export async function settle(sessionId, betAmount, payout) {
    const res = await fetch(`${LOBBY_API_URL}/api/game/settle`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Game-Secret': GAME_SECRET,
        },
        body: JSON.stringify({ sessionId, betAmount, payout }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Failed to settle' }));
        throw new Error(err.message || `Lobby settle failed: HTTP ${res.status}`);
    }
    return res.json();
}
/**
 * Close a game session in the lobby.
 * Uses the shared game secret for authentication.
 */
export async function closeSession(sessionId) {
    const res = await fetch(`${LOBBY_API_URL}/api/game/close-session`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Game-Secret': GAME_SECRET,
        },
        body: JSON.stringify({ sessionId }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Failed to close session' }));
        throw new Error(err.message || `Lobby closeSession failed: HTTP ${res.status}`);
    }
    return res.json();
}
//# sourceMappingURL=lobby-client.js.map