-- Flyway migration V2__CreatePendingRegistrations.sql
-- Creates the pending_registrations table for the new registration flow

CREATE TABLE IF NOT EXISTS pending_registrations (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    verification_token VARCHAR(255) NOT NULL UNIQUE,
    otp VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP(6) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verified_at TIMESTAMP(6)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_pending_reg_email ON pending_registrations(email);
CREATE INDEX IF NOT EXISTS idx_pending_reg_token ON pending_registrations(verification_token);
CREATE INDEX IF NOT EXISTS idx_pending_reg_expires ON pending_registrations(expires_at);
