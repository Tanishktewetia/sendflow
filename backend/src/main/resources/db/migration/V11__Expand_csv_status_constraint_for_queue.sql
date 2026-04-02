-- Allow queue lifecycle statuses in csv_uploads.status.
-- Existing deployments may have ck_csv_status that does not include QUEUED.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ck_csv_status'
          AND conrelid = 'csv_uploads'::regclass
    ) THEN
        ALTER TABLE csv_uploads DROP CONSTRAINT ck_csv_status;
    END IF;
END $$;

ALTER TABLE csv_uploads
    ADD CONSTRAINT ck_csv_status
    CHECK (
        status IN (
            'UPLOADED',
            'PROCESSING',
            'SUCCESS',
            'FAILED',
            'PARTIALLY_FAILED',
            'QUEUED',
            'IN_PROGRESS',
            'DONE',
            'COMPLETED'
        )
    );
