-- Migration V7: Create activity_logs and campaign_queue tables

-- Create activity_logs table for tracking all user actions
CREATE TABLE IF NOT EXISTS activity_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    action_title VARCHAR(255),
    action_description TEXT,
    resource_type VARCHAR(50),
    resource_id BIGINT,
    metadata JSONB,
    status VARCHAR(20) DEFAULT 'SUCCESS',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    error_message TEXT,
    CONSTRAINT fk_activity_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for activity_logs
CREATE INDEX IF NOT EXISTS idx_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_action_type ON activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_resource_type_id ON activity_logs(resource_type, resource_id);

-- Create campaign_queue table for FIFO management (max 5 concurrent)
CREATE TABLE IF NOT EXISTS campaign_queue (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    csv_upload_id BIGINT NOT NULL,
    campaign_id BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'QUEUED', -- QUEUED, PROCESSING, PAUSED, COMPLETED, FAILED, REPROCESSING
    queue_position INTEGER NOT NULL, -- Lower = higher priority
    total_recipients INTEGER,
    processed_recipients INTEGER DEFAULT 0,
    failed_recipients INTEGER DEFAULT 0,
    sent_recipients INTEGER DEFAULT 0,
    current_row INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    pause_reason VARCHAR(255),
    retry_count INTEGER DEFAULT 0,
    CONSTRAINT fk_campaign_queue_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_campaign_queue_csv FOREIGN KEY (csv_upload_id) REFERENCES csv_uploads(id) ON DELETE CASCADE,
    CONSTRAINT fk_campaign_queue_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

-- Create indexes for campaign_queue
CREATE INDEX IF NOT EXISTS idx_status ON campaign_queue(status);
CREATE INDEX IF NOT EXISTS idx_queue_position ON campaign_queue(queue_position);
CREATE INDEX IF NOT EXISTS idx_user_id_status ON campaign_queue(user_id, status);
CREATE INDEX IF NOT EXISTS idx_csv_upload_id ON campaign_queue(csv_upload_id);
CREATE INDEX IF NOT EXISTS idx_campaign_id ON campaign_queue(campaign_id);
