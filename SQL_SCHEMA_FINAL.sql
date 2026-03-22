-- ============================================================================
-- SendFlow PostgreSQL Database Schema
-- Production-Ready Schema Based on Frontend Data Structure
-- ============================================================================
-- This schema is optimized for:
-- 1. Full Name (no separate first/last names)
-- 2. Avatar file storage (not URLs)
-- 3. Recipient personalization fields: name, email, company, customField1, customField2
-- 4. Email provider credentials encryption
-- 5. Campaign scheduling & execution tracking
-- ============================================================================


-- ============================================================================
-- 1. Users Table - Account Management
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    
    -- Account Info
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- BCrypt (60 chars minimum)
    full_name VARCHAR(255), -- Single field: "John Doe" (not separate first/last)
    
    -- Avatar Storage (Files, not URLs)
    avatar_file_name VARCHAR(255), -- e.g., "avatar_user_1.jpg"
    avatar_file_size BIGINT, -- Size in bytes
    avatar_mime_type VARCHAR(100), -- e.g., "image/jpeg", "image/png"
    avatar_storage_path VARCHAR(500), -- Full path: "/avatars/user_1/avatar.jpg"
    
    -- Account Status
    is_active BOOLEAN DEFAULT true,
    is_email_verified BOOLEAN DEFAULT false,
    email_verified_at TIMESTAMP NULL,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP NULL,
    
    -- Constraints
    CONSTRAINT uk_users_email UNIQUE(email),
    CONSTRAINT ck_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_is_active ON users(is_active);

-- Add comment
COMMENT ON TABLE users IS 'User accounts with full name and avatar file storage';
COMMENT ON COLUMN users.full_name IS 'Single full name field from registration form';
COMMENT ON COLUMN users.avatar_storage_path IS 'Path to uploaded avatar image';


-- ============================================================================
-- 2. Email Verification Tokens - For Initial Registration
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    
    token VARCHAR(300) NOT NULL UNIQUE, -- Random token for verification link
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT false,
    used_at TIMESTAMP NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT fk_evt_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_evt_user_id ON email_verification_tokens(user_id);
CREATE INDEX idx_evt_token ON email_verification_tokens(token);
CREATE INDEX idx_evt_expires_at ON email_verification_tokens(expires_at);

COMMENT ON TABLE email_verification_tokens IS 'One-time tokens sent to user email for account verification during registration';


-- ============================================================================
-- 3. Password Reset Tokens - For Password Recovery (with OTP)
-- ============================================================================

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    
    token VARCHAR(300) NOT NULL UNIQUE, -- Random reset token
    otp VARCHAR(6), -- 6-digit OTP sent via email
    
    expires_at TIMESTAMP NOT NULL, -- Typically 30 minutes
    is_used BOOLEAN DEFAULT false,
    used_at TIMESTAMP NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT fk_prt_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uk_prt_token UNIQUE(token)
);

-- Indexes
CREATE INDEX idx_prt_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_prt_token ON password_reset_tokens(token);
CREATE INDEX idx_prt_expires_at ON password_reset_tokens(expires_at);
CREATE INDEX idx_prt_otp ON password_reset_tokens(otp);

COMMENT ON TABLE password_reset_tokens IS 'Tokens for password reset with OTP verification';


-- ============================================================================
-- 4. Email Providers - SMTP/Gmail/Outlook/Resend Credentials
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_providers (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    
    -- Provider Type: SMTP, GMAIL, OUTLOOK, RESEND
    provider_type VARCHAR(50) NOT NULL,
    display_name VARCHAR(255), -- User-friendly name: "My Gmail", "Office365"
    from_email VARCHAR(255) NOT NULL, -- Who sends from: "sender@gmail.com"
    from_name VARCHAR(255), -- Display name in email: "John Doe"
    
    -- Configuration (ENCRYPTED with AES-256)
    -- This stores encrypted JSON containing credentials like:
    -- {"host": "smtp.gmail.com", "port": 587, "username": "...", "password": "..."}
    -- For Resend: {"apiKey": "re_XXXXX"}
    encrypted_config TEXT NOT NULL,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false, -- Test email sent successfully?
    verification_attempts INT DEFAULT 0, -- Track failed verification attempts
    last_verified_at TIMESTAMP NULL,
    last_verification_error TEXT NULL, -- Error message from last failed verification
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT fk_ep_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uk_ep_user_type UNIQUE(user_id, provider_type), -- One per type per user
    CONSTRAINT ck_provider_type CHECK (provider_type IN ('SMTP', 'GMAIL', 'OUTLOOK', 'RESEND'))
);

-- Indexes
CREATE INDEX idx_ep_user_id ON email_providers(user_id);
CREATE INDEX idx_ep_is_active ON email_providers(is_active);
CREATE INDEX idx_ep_is_verified ON email_providers(is_verified);

COMMENT ON TABLE email_providers IS 'Email provider configurations (SMTP, Gmail, Outlook, Resend) with encrypted credentials';
COMMENT ON COLUMN email_providers.encrypted_config IS 'AES-256 encrypted JSON containing provider-specific credentials';


-- ============================================================================
-- 5. Campaigns - Email Campaign Management
-- ============================================================================

CREATE TABLE IF NOT EXISTS campaigns (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    email_provider_id BIGINT NOT NULL,
    
    -- Campaign Details
    campaign_name VARCHAR(255) NOT NULL, -- User-given name
    subject VARCHAR(255) NOT NULL, -- Email subject (max 255 chars)
    email_body TEXT NOT NULL, -- HTML email content with {{personalization tags}}
    
    -- Status: DRAFT, SCHEDULED, RUNNING, PAUSED, COMPLETED, FAILED, CANCELLED
    status VARCHAR(50) DEFAULT 'DRAFT',
    
    -- Timing & Scheduling
    scheduled_at TIMESTAMP NULL, -- When to send (if user schedules for later)
    started_at TIMESTAMP NULL, -- When actually started sending
    completed_at TIMESTAMP NULL, -- When finished sending all
    paused_at TIMESTAMP NULL, -- When user paused
    
    -- Configuration
    recipient_count INT DEFAULT 0, -- Total recipients for this campaign
    send_delay_ms INT DEFAULT 0, -- Delay between each email (e.g., 100ms = 10 emails/sec)
    
    -- Statistics (denormalized for fast queries, refreshed periodically)
    total_sent INT DEFAULT 0, -- Successfully sent
    total_failed INT DEFAULT 0, -- Failed to send
    total_pending INT DEFAULT 0, -- Waiting to be sent
    success_rate DECIMAL(5, 2) DEFAULT 0.00, -- Percentage (0-100)
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT fk_camp_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_camp_provider FOREIGN KEY(email_provider_id) REFERENCES email_providers(id) ON DELETE RESTRICT,
    CONSTRAINT ck_status CHECK (status IN ('DRAFT', 'SCHEDULED', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED')),
    CONSTRAINT ck_success_rate CHECK (success_rate BETWEEN 0 AND 100)
);

-- Indexes
CREATE INDEX idx_camp_user_id ON campaigns(user_id);
CREATE INDEX idx_camp_status ON campaigns(status);
CREATE INDEX idx_camp_scheduled_at ON campaigns(scheduled_at);
CREATE INDEX idx_camp_created_at ON campaigns(created_at DESC);
CREATE INDEX idx_camp_email_provider_id ON campaigns(email_provider_id);

COMMENT ON TABLE campaigns IS 'Email campaigns with personalization and scheduling support';
COMMENT ON COLUMN campaigns.email_body IS 'HTML email content supporting {{name}}, {{email}}, {{company}}, {{customField1}}, {{customField2}} tags';


-- ============================================================================
-- 6. Campaign Recipients - Recipients for Each Campaign
-- ============================================================================

CREATE TABLE IF NOT EXISTS campaign_recipients (
    id BIGSERIAL PRIMARY KEY,
    campaign_id BIGINT NOT NULL,
    
    -- Recipient Data (from CSV upload or manual entry)
    -- These fields are used for personalization: {{name}}, {{email}}, {{company}}, {{customField1}}, {{customField2}}
    name VARCHAR(255) NOT NULL, -- Recipient's full name
    email VARCHAR(255) NOT NULL, -- Email address
    company VARCHAR(255), -- Optional company name
    custom_field_1 VARCHAR(500), -- Optional custom field 1
    custom_field_2 VARCHAR(500), -- Optional custom field 2
    
    -- Email Status
    status VARCHAR(50) DEFAULT 'PENDING',
    -- PENDING: Not sent yet
    -- SENT: Successfully sent
    -- FAILED: Could not send
    -- BOUNCED: Email address invalid
    -- INVALID: Email failed validation
    
    -- Error Tracking
    error_message TEXT, -- If failed/bounced, why?
    error_code VARCHAR(50), -- SMTP error code like "550", "421", etc.
    
    -- Timestamps
    sent_at TIMESTAMP NULL, -- When email was sent
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT fk_cr_campaign FOREIGN KEY(campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    CONSTRAINT ck_recipient_status CHECK (status IN ('PENDING', 'SENT', 'FAILED', 'BOUNCED', 'INVALID')),
    CONSTRAINT ck_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Indexes (critical for campaign execution)
CREATE INDEX idx_cr_campaign_id ON campaign_recipients(campaign_id);
CREATE INDEX idx_cr_status ON campaign_recipients(status);
CREATE INDEX idx_cr_email ON campaign_recipients(email);
CREATE INDEX idx_cr_sent_at ON campaign_recipients(sent_at);

COMMENT ON TABLE campaign_recipients IS 'Recipients for each campaign with personalization fields (name, email, company, customField1, customField2)';


-- ============================================================================
-- 7. Email Logs - Audit Trail of All Emails Sent
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_logs (
    id BIGSERIAL PRIMARY KEY,
    campaign_id BIGINT NOT NULL,
    recipient_id BIGINT, -- Can be NULL if recipient was deleted
    
    -- Email Details
    recipient_email VARCHAR(255) NOT NULL, -- Snapshot of email at send time
    subject_sent VARCHAR(255), -- Snapshot of subject sent
    
    -- Delivery Status: SENT, FAILED, BOUNCED, OPENED, CLICKED
    status VARCHAR(50) DEFAULT 'SENT',
    
    -- SMTP Response (for debugging)
    smtp_response_code INT, -- 250 (success), 550 (mailbox unavailable), 421 (service unavailable), etc.
    smtp_response_message TEXT, -- Full SMTP server response
    
    -- Open/Click Tracking (for future analytics)
    opened_at TIMESTAMP NULL,
    clicked_at TIMESTAMP NULL,
    
    -- Timestamps
    sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT fk_el_campaign FOREIGN KEY(campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    CONSTRAINT fk_el_recipient FOREIGN KEY(recipient_id) REFERENCES campaign_recipients(id) ON DELETE SET NULL,
    CONSTRAINT ck_email_log_status CHECK (status IN ('SENT', 'FAILED', 'BOUNCED', 'OPENED', 'CLICKED'))
);

-- Indexes (for analytics queries)
CREATE INDEX idx_el_campaign_id ON email_logs(campaign_id);
CREATE INDEX idx_el_status ON email_logs(status);
CREATE INDEX idx_el_sent_at ON email_logs(sent_at DESC);
CREATE INDEX idx_el_recipient_email ON email_logs(recipient_email);

COMMENT ON TABLE email_logs IS 'Complete audit trail of all emails sent, including SMTP responses for debugging';


-- ============================================================================
-- 8. CSV Uploads - Track User CSV File Uploads
-- ============================================================================

CREATE TABLE IF NOT EXISTS csv_uploads (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    
    -- File Details
    file_name VARCHAR(255) NOT NULL, -- Original filename: "contacts.csv"
    file_size_bytes BIGINT, -- Size in bytes
    file_storage_path VARCHAR(500), -- Path if storing on disk: "/csvs/user_1/contacts.csv"
    
    -- Processing Stats
    total_rows INT DEFAULT 0, -- Total rows in file
    valid_rows INT DEFAULT 0, -- Rows that passed validation
    invalid_rows INT DEFAULT 0, -- Rows that failed validation
    duplicate_rows INT DEFAULT 0, -- Rows that were duplicates
    
    -- Processing Result
    status VARCHAR(50) DEFAULT 'UPLOADED',
    -- UPLOADED: File received
    -- PROCESSING: Being parsed
    -- SUCCESS: All rows valid
    -- FAILED: Parsing failed
    -- PARTIALLY_FAILED: Some rows invalid
    
    error_details TEXT, -- Details about which rows failed and why
    
    -- Metadata
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL, -- When parsing completed
    
    -- Constraints
    CONSTRAINT fk_csv_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT ck_csv_status CHECK (status IN ('UPLOADED', 'PROCESSING', 'SUCCESS', 'FAILED', 'PARTIALLY_FAILED'))
);

-- Indexes
CREATE INDEX idx_csv_user_id ON csv_uploads(user_id);
CREATE INDEX idx_csv_status ON csv_uploads(status);
CREATE INDEX idx_csv_uploaded_at ON csv_uploads(uploaded_at);

COMMENT ON TABLE csv_uploads IS 'Track CSV file uploads with processing status and validation results';


-- ============================================================================
-- 9. Application Settings - Platform Configuration
-- ============================================================================

CREATE TABLE IF NOT EXISTS app_settings (
    id BIGSERIAL PRIMARY KEY,
    
    setting_key VARCHAR(255) UNIQUE NOT NULL, -- e.g., "max_recipients_per_campaign"
    setting_value TEXT, -- JSON or plain text value
    description VARCHAR(500),
    
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uk_app_settings_key UNIQUE(setting_key)
);

-- Insert default settings
INSERT INTO app_settings (setting_key, setting_value, description) VALUES
    ('max_recipients_per_campaign', '100000', 'Maximum recipients per campaign'),
    ('max_csv_file_size_mb', '50', 'Maximum CSV file size in MB'),
    ('email_send_delay_ms', '100', 'Default delay between sending emails (ms)'),
    ('otp_expiry_minutes', '30', 'OTP expiration time in minutes'),
    ('verification_token_expiry_hours', '24', 'Email verification token expiration in hours'),
    ('campaign_auto_cleanup_days', '90', 'Auto delete old campaign data after X days')
ON CONFLICT (setting_key) DO NOTHING;

COMMENT ON TABLE app_settings IS 'Platform-wide configuration settings';


-- ============================================================================
-- 10. Audit Logs - Track User Actions (Optional, for compliance)
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    
    action VARCHAR(100), -- "LOGIN", "CAMPAIGN_STARTED", "EMAIL_PROVIDER_ADDED", etc.
    resource_type VARCHAR(100), -- "campaign", "email_provider", "user", etc.
    resource_id BIGINT, -- ID of the affected resource
    
    details TEXT, -- JSON with additional details
    ip_address VARCHAR(50), -- User's IP address
    user_agent VARCHAR(500), -- Browser/client info
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT fk_audit_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at DESC);

COMMENT ON TABLE audit_logs IS 'Audit trail for compliance and security monitoring';


-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View 1: Campaign Summary with User Info
CREATE OR REPLACE VIEW v_campaign_summary AS
SELECT 
    c.id,
    c.campaign_name,
    c.subject,
    c.status,
    c.user_id,
    u.email as user_email,
    u.full_name,
    c.recipient_count,
    c.total_sent,
    c.total_failed,
    c.total_pending,
    c.success_rate,
    c.created_at,
    c.started_at,
    c.completed_at,
    ep.provider_type,
    ep.from_email
FROM campaigns c
JOIN users u ON c.user_id = u.id
JOIN email_providers ep ON c.email_provider_id = ep.id;

COMMENT ON VIEW v_campaign_summary IS 'Campaign data with user and provider information';


-- View 2: Recipient Status Summary
CREATE OR REPLACE VIEW v_recipient_stats AS
SELECT 
    campaign_id,
    status,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY campaign_id), 2) as percentage
FROM campaign_recipients
GROUP BY campaign_id, status;

COMMENT ON VIEW v_recipient_stats IS 'Recipient status distribution per campaign';


-- View 3: User Email Activity
CREATE OR REPLACE VIEW v_user_email_stats AS
SELECT 
    u.id,
    u.email,
    u.full_name,
    COUNT(DISTINCT c.id) as total_campaigns,
    COUNT(DISTINCT CASE WHEN c.status = 'COMPLETED' THEN c.id END) as completed_campaigns,
    SUM(c.total_sent) as total_emails_sent,
    COUNT(DISTINCT ep.id) as email_providers_count,
    u.last_login_at,
    u.created_at
FROM users u
LEFT JOIN campaigns c ON u.id = c.user_id
LEFT JOIN email_providers ep ON u.id = ep.user_id
GROUP BY u.id, u.email, u.full_name, u.last_login_at, u.created_at;

COMMENT ON VIEW v_user_email_stats IS 'User activity and email sending statistics';


-- ============================================================================
-- FUNCTIONS FOR COMMON OPERATIONS
-- ============================================================================

-- Function 1: Update Campaign Statistics
CREATE OR REPLACE FUNCTION update_campaign_stats(campaign_id_param BIGINT)
RETURNS void AS $$
BEGIN
    UPDATE campaigns
    SET 
        total_sent = (SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = campaign_id_param AND status = 'SENT'),
        total_failed = (SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = campaign_id_param AND status = 'FAILED'),
        total_pending = (SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = campaign_id_param AND status = 'PENDING'),
        success_rate = ROUND(
            (SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = campaign_id_param AND status = 'SENT') * 100.0 /
            NULLIF((SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = campaign_id_param), 0),
            2
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = campaign_id_param;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_campaign_stats IS 'Recalculate campaign statistics based on recipient status';


-- Function 2: Mark Campaign as Complete
CREATE OR REPLACE FUNCTION complete_campaign(campaign_id_param BIGINT)
RETURNS void AS $$
BEGIN
    UPDATE campaigns
    SET 
        status = 'COMPLETED',
        completed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = campaign_id_param AND status IN ('RUNNING', 'PAUSED');
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION complete_campaign IS 'Mark campaign as completed and set completion timestamp';


-- ============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Trigger 1: Update user.updated_at on profile changes
CREATE OR REPLACE FUNCTION update_user_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_user_timestamp
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_user_timestamp();

COMMENT ON TRIGGER trg_update_user_timestamp ON users IS 'Automatically update user.updated_at on profile changes';


-- Trigger 2: Update campaign.updated_at
CREATE OR REPLACE FUNCTION update_campaign_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_campaign_timestamp
BEFORE UPDATE ON campaigns
FOR EACH ROW
EXECUTE FUNCTION update_campaign_timestamp();

COMMENT ON TRIGGER trg_update_campaign_timestamp ON campaigns IS 'Automatically update campaign.updated_at on changes';


-- Trigger 3: Update email_provider.updated_at
CREATE OR REPLACE FUNCTION update_email_provider_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_email_provider_timestamp
BEFORE UPDATE ON email_providers
FOR EACH ROW
EXECUTE FUNCTION update_email_provider_timestamp();

COMMENT ON TRIGGER trg_update_email_provider_timestamp ON email_providers IS 'Automatically update email_provider.updated_at on changes';


-- Trigger 4: Update app_settings.updated_at
CREATE OR REPLACE FUNCTION update_app_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_app_settings_timestamp
BEFORE UPDATE ON app_settings
FOR EACH ROW
EXECUTE FUNCTION update_app_settings_timestamp();

COMMENT ON TRIGGER trg_update_app_settings_timestamp ON app_settings IS 'Automatically update app_settings.updated_at on changes';


-- ============================================================================
-- CLEANUP: Drop Old Tables (if doing migration/reset)
-- ============================================================================
-- Uncomment ONLY if you want to drop existing tables

-- DROP TABLE IF EXISTS audit_logs CASCADE;
-- DROP TABLE IF EXISTS email_logs CASCADE;
-- DROP TABLE IF EXISTS campaign_recipients CASCADE;
-- DROP TABLE IF EXISTS campaigns CASCADE;
-- DROP TABLE IF EXISTS csv_uploads CASCADE;
-- DROP TABLE IF EXISTS email_providers CASCADE;
-- DROP TABLE IF EXISTS password_reset_tokens CASCADE;
-- DROP TABLE IF EXISTS email_verification_tokens CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;
-- DROP TABLE IF EXISTS app_settings CASCADE;


-- ============================================================================
-- SUMMARY
-- ============================================================================

/*
TABLES CREATED (10):
1. users - User accounts with full_name (not split) and avatar file storage
2. email_verification_tokens - Registration verification tokens
3. password_reset_tokens - Password reset tokens with OTP
4. email_providers - SMTP/Gmail/Outlook/Resend credentials (encrypted)
5. campaigns - Email campaigns
6. campaign_recipients - Recipients with personalization fields (name, email, company, customField1, customField2)
7. email_logs - Audit trail of all emails sent
8. csv_uploads - Track CSV file uploads
9. app_settings - Platform configuration
10. audit_logs - User action tracking

VIEWS CREATED (3):
- v_campaign_summary - Campaign data with user and provider
- v_recipient_stats - Recipient status distribution
- v_user_email_stats - User activity and statistics

FUNCTIONS CREATED (2):
- update_campaign_stats() - Recalculate campaign statistics
- complete_campaign() - Mark campaign as complete

TRIGGERS CREATED (3):
- trg_update_user_timestamp - Auto-update user.updated_at
- trg_update_campaign_timestamp - Auto-update campaign.updated_at
- trg_update_email_provider_timestamp - Auto-update email_provider.updated_at

KEY FEATURES:
✅ Full name only (no split first/last)
✅ Avatar file storage (file_name, file_size, mime_type, storage_path)
✅ Recipient personalization fields: name, email, company, customField1, customField2
✅ Email provider encryption support
✅ Campaign scheduling & execution tracking
✅ Comprehensive email logging and audit trails
✅ Indexes for performance optimization
✅ Constraints for data integrity
✅ Views for common queries
✅ Functions for statistics updates
✅ Triggers for auto-timestamping

READY FOR SUPABASE DEPLOYMENT!
*/
