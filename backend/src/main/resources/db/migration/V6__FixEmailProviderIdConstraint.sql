-- Flyway Migration V6: Fix email_provider_id NOT NULL constraint
-- The email_provider_id column MUST be nullable for draft campaigns
-- This removes the NOT NULL constraint that was preventing drafts from being saved

-- Drop any NOT NULL constraint on email_provider_id
ALTER TABLE campaigns
    ALTER COLUMN email_provider_id DROP NOT NULL;
