-- Migration V9: Add CSV queue management columns to csv_uploads table
-- Purpose: Persist CSV queue data to database instead of localStorage

-- Add queue-related columns to csv_uploads table
ALTER TABLE csv_uploads ADD COLUMN IF NOT EXISTS queue_position INTEGER;
ALTER TABLE csv_uploads ADD COLUMN IF NOT EXISTS is_queued BOOLEAN DEFAULT false;
ALTER TABLE csv_uploads ADD COLUMN IF NOT EXISTS queued_at TIMESTAMP;

-- Create index for efficient queue retrieval
-- Query: SELECT * FROM csv_uploads WHERE user_id = ? AND is_queued = true ORDER BY queue_position
CREATE INDEX IF NOT EXISTS idx_csv_queue ON csv_uploads(user_id, queue_position) 
WHERE is_queued = true;

-- Create index for user's CSV uploads
CREATE INDEX IF NOT EXISTS idx_csv_user_queued ON csv_uploads(user_id, is_queued);
