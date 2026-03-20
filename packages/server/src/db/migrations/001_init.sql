-- RocketLH Database Schema
-- Migration: 001_init
-- Table prefix: rocketlh_ (shared game_lobby database)

-- 開獎記錄表（每局一筆，所有面板共用）
CREATE TABLE IF NOT EXISTS rocketlh_crash_logs (
    draw_id           VARCHAR(64) PRIMARY KEY,
    session_id        VARCHAR(64) UNIQUE NOT NULL,
    crash_multiplier  DECIMAL(10, 4) NOT NULL,
    server_seed       VARCHAR(128) NOT NULL,
    server_seed_hash  VARCHAR(128) NOT NULL,
    client_seed       VARCHAR(128),
    rtp_setting       SMALLINT NOT NULL CHECK (rtp_setting IN (94, 95, 96, 97, 98, 99)),
    volatility_level  SMALLINT NOT NULL DEFAULT 3 CHECK (volatility_level BETWEEN 1 AND 5),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    crashed_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_rlh_crash_logs_session_id ON rocketlh_crash_logs (session_id);
CREATE INDEX IF NOT EXISTS idx_rlh_crash_logs_created_at ON rocketlh_crash_logs (created_at DESC);

-- 注單記錄表（每個面板一筆，單局最多 4 筆）
CREATE TABLE IF NOT EXISTS rocketlh_bet_records (
    bet_id            VARCHAR(64) PRIMARY KEY,
    session_id        VARCHAR(64) NOT NULL REFERENCES rocketlh_crash_logs(session_id),
    player_id         VARCHAR(64) NOT NULL,
    panel_id          CHAR(1) NOT NULL CHECK (panel_id IN ('A', 'B', 'C', 'D')),
    bet_amount        DECIMAL(12, 2) NOT NULL CHECK (bet_amount > 0),
    rtp_setting       SMALLINT NOT NULL CHECK (rtp_setting IN (94, 95, 96, 97, 98, 99)),
    volatility_level  SMALLINT NOT NULL DEFAULT 3,
    status            VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cashed_out', 'lost')),
    auto_cashout      DECIMAL(10, 2),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (session_id, player_id, panel_id)
);

CREATE INDEX IF NOT EXISTS idx_rlh_bet_records_session_id ON rocketlh_bet_records (session_id);
CREATE INDEX IF NOT EXISTS idx_rlh_bet_records_player_id ON rocketlh_bet_records (player_id);

-- 結算記錄表
CREATE TABLE IF NOT EXISTS rocketlh_settlements (
    settlement_id      VARCHAR(64) PRIMARY KEY,
    bet_id             VARCHAR(64) NOT NULL REFERENCES rocketlh_bet_records(bet_id),
    outcome            VARCHAR(8) NOT NULL CHECK (outcome IN ('win', 'lose')),
    cashout_multiplier DECIMAL(10, 4) NOT NULL,
    payout             DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    profit             DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    settled_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rlh_settlements_bet_id ON rocketlh_settlements (bet_id);
