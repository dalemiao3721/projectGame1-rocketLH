/** Available RTP options (percentage) */
export declare const RTP_OPTIONS: readonly [94, 95, 96, 97, 98, 99];
/** Volatility levels (1-5) */
export declare const VOLATILITY_LEVELS: readonly [1, 2, 3, 4, 5];
/** Panel IDs */
export declare const PANEL_IDS: readonly ["A", "B", "C", "D"];
/** Round timing (ms) */
export declare const ROUND_TIMING: {
    readonly WAITING_DURATION: 5000;
    readonly BETTING_DURATION: 8000;
    readonly TICK_INTERVAL: 50;
    readonly SETTLED_DURATION: 3000;
};
/** Default bet settings */
export declare const BET_DEFAULTS: {
    readonly INITIAL_AMOUNT: 100;
    readonly STEP: 10;
    readonly MIN_AMOUNT: 1;
    readonly MIN_AUTO_CASHOUT: 1.01;
};
//# sourceMappingURL=constants.d.ts.map