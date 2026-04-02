-- Migration V10: Add email selection preference to users table
-- Purpose: Store user's email selection preference (default or prompt)
-- Created: 2026-03-27

-- Add column to store email selection preference
ALTER TABLE users ADD COLUMN email_selection_preference VARCHAR(50) DEFAULT 'default';

-- Create index for efficient filtering
CREATE INDEX idx_user_email_selection_pref ON users(email_selection_preference);

-- Add constraint to only allow valid values
ALTER TABLE users ADD CONSTRAINT chk_email_selection_pref 
  CHECK (email_selection_preference IN ('default', 'prompt'));
