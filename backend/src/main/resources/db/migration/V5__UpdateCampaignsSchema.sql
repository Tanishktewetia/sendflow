-- Flyway Migration V5: Update Campaigns Table Schema
-- Aligns database schema with current Campaign entity
-- Adds missing columns and renames existing ones for consistency

-- First, add missing columns that don't exist yet
ALTER TABLE campaigns
    ADD COLUMN IF NOT EXISTS subject VARCHAR(500),
    ADD COLUMN IF NOT EXISTS email_body TEXT,
    ADD COLUMN IF NOT EXISTS email_provider_id BIGINT REFERENCES email_providers(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP(6),
    ADD COLUMN IF NOT EXISTS started_at TIMESTAMP(6),
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP(6),
    ADD COLUMN IF NOT EXISTS paused_at TIMESTAMP(6),
    ADD COLUMN IF NOT EXISTS recipient_count INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS send_delay_ms INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_sent INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_failed INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_pending INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS success_rate DOUBLE PRECISION DEFAULT 0.0;

-- Copy data from old columns if they exist and new columns are empty
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'email_subject')
        THEN
        UPDATE campaigns SET subject = email_subject WHERE subject IS NULL;
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'email_body')
        THEN
        UPDATE campaigns SET email_body = email_body WHERE email_body IS NULL;
    END IF;
END $$;

-- Rename old columns to new ones if they exist and haven't been renamed
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'total_recipients')
        AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'recipient_count')
    THEN
        ALTER TABLE campaigns RENAME COLUMN total_recipients TO recipient_count;
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'sent_count')
        AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'total_sent')
    THEN
        ALTER TABLE campaigns RENAME COLUMN sent_count TO total_sent;
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'failed_count')
        AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'total_failed')
    THEN
        ALTER TABLE campaigns RENAME COLUMN failed_count TO total_failed;
    END IF;
END $$;

-- Add campaign_recipients table for managing email recipients per campaign
CREATE TABLE IF NOT EXISTS campaign_recipients (
    id BIGSERIAL PRIMARY KEY,
    campaign_id BIGINT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign ON campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_status ON campaign_recipients(status);
