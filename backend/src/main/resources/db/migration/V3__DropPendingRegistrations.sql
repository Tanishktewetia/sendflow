-- Flyway migration V3__DropPendingRegistrations.sql
-- Drops the pending_registrations table as it's no longer needed
-- Registration flow now uses in-memory storage and direct OTP verification to users table

DROP TABLE IF EXISTS pending_registrations CASCADE;
