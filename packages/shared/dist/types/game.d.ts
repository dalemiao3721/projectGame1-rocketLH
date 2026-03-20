/** Round phase states */
export type RoundPhase = 'WAITING' | 'BETTING' | 'FLYING' | 'CRASHED' | 'SETTLED';
/** Panel identifiers */
export type PanelId = 'A' | 'B' | 'C' | 'D';
/** Panel bet status */
export type PanelStatus = 'idle' | 'bet_placed' | 'cashed_out' | 'lost';
/** Single panel state */
export interface PanelState {
    panelId: PanelId;
    status: PanelStatus;
    betAmount: number;
    autoCashout: number | null;
    cashoutMultiplier: number | null;
    payout: number;
}
/** Global game state */
export interface GameState {
    roundPhase: RoundPhase;
    sessionId: string | null;
    countdown: number;
    currentMultiplier: number;
    crashMultiplier: number | null;
    panels: Record<PanelId, PanelState>;
    balance: number;
    serverSeedHash: string | null;
    serverSeed: string | null;
    history: {
        sessionId: string;
        crashMultiplier: number;
    }[];
}
/** Server → Client WebSocket messages */
export type ServerMessage = {
    event: 'round_waiting';
    data: {
        countdown: number;
    };
} | {
    event: 'round_betting';
    data: {
        sessionId: string;
        serverSeedHash: string;
        countdown: number;
    };
} | {
    event: 'round_flying';
    data: Record<string, never>;
} | {
    event: 'multiplier_update';
    data: {
        multiplier: number;
        elapsed: number;
    };
} | {
    event: 'round_crashed';
    data: {
        crashMultiplier: number;
        serverSeed: string;
    };
} | {
    event: 'bet_confirmed';
    data: {
        panelId: PanelId;
        betId: string;
        balance: number;
    };
} | {
    event: 'cashout_success';
    data: {
        panelId: PanelId;
        multiplier: number;
        payout: number;
        balance: number;
    };
} | {
    event: 'auto_cashout_triggered';
    data: {
        panelId: PanelId;
        multiplier: number;
        payout: number;
    };
} | {
    event: 'history_update';
    data: {
        recent: {
            sessionId: string;
            crashMultiplier: number;
        }[];
    };
} | {
    event: 'registered';
    data: {
        playerId: string;
    };
} | {
    event: 'error';
    data: {
        code: string;
        message: string;
    };
};
/** Client → Server WebSocket messages */
export type ClientMessage = {
    action: 'register';
    data: {
        playerId?: string;
    };
} | {
    action: 'place_bet';
    data: {
        panelId: PanelId;
        betAmount: number;
        autoCashout?: number;
        lobbyToken?: string;
        lobbySessionId?: string;
    };
} | {
    action: 'cashout';
    data: {
        panelId: PanelId;
        sessionId: string;
        lobbyToken?: string;
        lobbySessionId?: string;
    };
};
//# sourceMappingURL=game.d.ts.map