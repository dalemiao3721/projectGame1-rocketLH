/**
 * BetRecord model — persists bet placement and status updates to rocketlh_bet_records table.
 */
export type BetStatus = 'active' | 'cashed_out' | 'lost';
export declare const BetRecord: {
    insert(params: {
        betId: string;
        sessionId: string;
        playerId: string;
        panelId: string;
        betAmount: number;
        rtpSetting: number;
        volatilityLevel: number;
        autoCashout: number | null;
    }): Promise<void>;
    updateStatus(betId: string, status: BetStatus): Promise<void>;
};
//# sourceMappingURL=BetRecord.d.ts.map