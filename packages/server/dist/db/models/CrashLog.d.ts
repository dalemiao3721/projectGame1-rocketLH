/**
 * CrashLog model — persists round results to rocketlh_crash_logs table.
 */
export interface CrashLogRow {
    draw_id: string;
    session_id: string;
    crash_multiplier: number;
    server_seed: string;
    server_seed_hash: string;
    client_seed: string | null;
    rtp_setting: number;
    volatility_level: number;
    created_at: Date;
    crashed_at: Date | null;
}
export declare const CrashLog: {
    insert(params: {
        drawId: string;
        sessionId: string;
        crashMultiplier: number;
        serverSeed: string;
        serverSeedHash: string;
        clientSeed: string | null;
        rtpSetting: number;
        volatilityLevel: number;
        crashedAt: Date;
    }): Promise<void>;
    updateCrashedAt(sessionId: string, crashedAt: Date): Promise<void>;
    findRecent(limit?: number): Promise<CrashLogRow[]>;
};
//# sourceMappingURL=CrashLog.d.ts.map