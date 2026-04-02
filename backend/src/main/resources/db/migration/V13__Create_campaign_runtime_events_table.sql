CREATE TABLE IF NOT EXISTS campaign_runtime_events (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    campaign_id BIGINT,
    queue_id BIGINT NOT NULL,
    seq_no BIGINT NOT NULL,
    event_time TIMESTAMP NOT NULL DEFAULT NOW(),
    level VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    row_number INTEGER,
    recipient_email VARCHAR(320)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_campaign_runtime_events_queue_seq
    ON campaign_runtime_events (queue_id, seq_no);

CREATE INDEX IF NOT EXISTS idx_campaign_runtime_events_user_time
    ON campaign_runtime_events (user_id, event_time DESC);

CREATE INDEX IF NOT EXISTS idx_campaign_runtime_events_queue_time
    ON campaign_runtime_events (queue_id, event_time DESC);
