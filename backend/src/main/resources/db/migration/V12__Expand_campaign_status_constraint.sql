-- Allow queue-driven campaign lifecycle statuses in campaigns.status.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ck_status'
          AND conrelid = 'campaigns'::regclass
    ) THEN
        ALTER TABLE campaigns DROP CONSTRAINT ck_status;
    END IF;
END $$;

ALTER TABLE campaigns
    ADD CONSTRAINT ck_status
    CHECK (
        status IN (
            'DRAFT',
            'SCHEDULED',
            'QUEUED',
            'RUNNING',
            'PAUSED',
            'COMPLETED',
            'FAILED',
            'CANCELLED'
        )
    );
