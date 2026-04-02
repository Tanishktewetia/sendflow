-- Database Migration: Add default email provider to users table
-- Created: 2026-03-27
-- Purpose: Store the user's selected default email provider

-- Add column to users table
ALTER TABLE users ADD COLUMN default_email_provider_id BIGINT;

-- Add foreign key constraint
ALTER TABLE users ADD CONSTRAINT fk_user_default_email_provider 
  FOREIGN KEY (default_email_provider_id) 
  REFERENCES email_providers(id) 
  ON DELETE SET NULL;

-- Create index for faster lookups when needed
CREATE INDEX idx_user_default_provider ON users(default_email_provider_id);
