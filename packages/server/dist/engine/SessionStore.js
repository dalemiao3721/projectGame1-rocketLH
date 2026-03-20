/**
 * SessionStore — In-memory state for the current round and active bets.
 *
 * Stores:
 * - Current round metadata (session, seeds, crash point)
 * - Active bets keyed by "playerId:panelId"
 */
export class SessionStore {
    currentRound = null;
    bets = new Map();
    betKey(playerId, panelId) {
        return `${playerId}:${panelId}`;
    }
    // --- Round management ---
    createRound(session) {
        this.currentRound = session;
        this.bets.clear();
    }
    getCurrentRound() {
        return this.currentRound;
    }
    updatePhase(phase) {
        if (this.currentRound) {
            this.currentRound.phase = phase;
        }
    }
    // --- Bet management ---
    placeBet(bet) {
        this.bets.set(this.betKey(bet.playerId, bet.panelId), bet);
    }
    getBet(playerId, panelId) {
        return this.bets.get(this.betKey(playerId, panelId));
    }
    /** All bets with status 'active' (not yet cashed out or lost) */
    getActiveBets() {
        return Array.from(this.bets.values()).filter(b => b.status === 'active');
    }
    /** All bets in current round */
    getAllBets() {
        return Array.from(this.bets.values());
    }
    /** Update a bet's settlement fields */
    settleBet(playerId, panelId, result) {
        const bet = this.getBet(playerId, panelId);
        if (!bet)
            return undefined;
        Object.assign(bet, result);
        return bet;
    }
    /** Clear round state for the next round */
    clearRound() {
        this.currentRound = null;
        this.bets.clear();
    }
}
//# sourceMappingURL=SessionStore.js.map