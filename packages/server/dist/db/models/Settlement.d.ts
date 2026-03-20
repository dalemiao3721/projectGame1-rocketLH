/**
 * Settlement model — persists win/lose outcomes to rocketlh_settlements table.
 */
export declare const Settlement: {
    insert(params: {
        settlementId: string;
        betId: string;
        outcome: "win" | "lose";
        cashoutMultiplier: number;
        payout: number;
        profit: number;
    }): Promise<void>;
};
//# sourceMappingURL=Settlement.d.ts.map