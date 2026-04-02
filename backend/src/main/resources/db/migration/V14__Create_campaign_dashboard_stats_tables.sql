CREATE TABLE IF NOT EXISTS campaign_stats_daily (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    queue_id BIGINT NOT NULL UNIQUE,
    sent_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    total_count INTEGER NOT NULL DEFAULT 0,
    recorded_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_campaign_stats_daily_user_expires
    ON campaign_stats_daily (user_id, expires_at);

CREATE TABLE IF NOT EXISTS campaign_stats_yearly (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    stat_year INTEGER NOT NULL,
    sent_count BIGINT NOT NULL DEFAULT 0,
    failed_count BIGINT NOT NULL DEFAULT 0,
    total_count BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_campaign_stats_yearly_user_year UNIQUE (user_id, stat_year)
);

CREATE INDEX IF NOT EXISTS idx_campaign_stats_yearly_user_year
    ON campaign_stats_yearly (user_id, stat_year DESC);
