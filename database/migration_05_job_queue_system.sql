-- Migration 05: Job Queue System
-- This migration creates tables for a robust job queue system using BullMQ with database persistence

-- Jobs table for tracking all background jobs
CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    result JSONB,
    error TEXT,
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    upload_id TEXT,
    user_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs(type);
CREATE INDEX IF NOT EXISTS idx_jobs_upload_id ON jobs(upload_id);
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_status_type ON jobs(status, type);

-- Composite index for idempotency checks
CREATE INDEX IF NOT EXISTS idx_jobs_upload_type_status ON jobs(upload_id, type, status);

-- Operation locks for preventing duplicate processing (Redis fallback)
CREATE TABLE IF NOT EXISTS operation_locks (
    id SERIAL PRIMARY KEY,
    operation_key TEXT UNIQUE NOT NULL,
    operation_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('processing', 'completed', 'failed')),
    result_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- Index for operation locks
CREATE INDEX IF NOT EXISTS idx_operation_locks_key ON operation_locks(operation_key);
CREATE INDEX IF NOT EXISTS idx_operation_locks_expires ON operation_locks(expires_at);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for jobs table
DROP TRIGGER IF EXISTS update_jobs_updated_at ON jobs;
CREATE TRIGGER update_jobs_updated_at
    BEFORE UPDATE ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Cleanup function for expired jobs and locks
CREATE OR REPLACE FUNCTION cleanup_expired_jobs_and_locks()
RETURNS void AS $$
BEGIN
    -- Clean up completed/failed jobs older than 7 days
    DELETE FROM jobs 
    WHERE status IN ('completed', 'failed', 'cancelled') 
    AND completed_at < NOW() - INTERVAL '7 days';
    
    -- Clean up expired operation locks
    DELETE FROM operation_locks 
    WHERE expires_at < NOW();
    
    -- Clean up very old pending jobs (older than 24 hours, likely stuck)
    DELETE FROM jobs 
    WHERE status = 'pending' 
    AND created_at < NOW() - INTERVAL '24 hours';
    
    RAISE NOTICE 'Cleanup completed: removed expired jobs and locks';
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled cleanup function (to be called periodically)
-- Note: This would typically be called by a cron job or scheduled task
COMMENT ON FUNCTION cleanup_expired_jobs_and_locks() IS 
'Function to clean up expired jobs and operation locks. Should be called periodically via cron job.';

-- Initial data type constraints and validation
ALTER TABLE jobs 
ADD CONSTRAINT jobs_progress_range CHECK (progress >= 0 AND progress <= 100),
ADD CONSTRAINT jobs_attempts_positive CHECK (attempts >= 0),
ADD CONSTRAINT jobs_max_attempts_positive CHECK (max_attempts > 0),
ADD CONSTRAINT jobs_attempts_not_exceed_max CHECK (attempts <= max_attempts);

-- Add foreign key constraints if user management exists
-- Uncomment if you have a users table:
-- ALTER TABLE jobs ADD CONSTRAINT fk_jobs_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add foreign key constraint to media_files if needed
-- Uncomment if upload_id should reference media_files:
-- ALTER TABLE jobs ADD CONSTRAINT fk_jobs_upload_id FOREIGN KEY (upload_id) REFERENCES media_files(id) ON DELETE CASCADE;

-- Grant necessary permissions
-- GRANT SELECT, INSERT, UPDATE, DELETE ON jobs TO authenticated;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON operation_locks TO authenticated;
-- GRANT USAGE ON SEQUENCE operation_locks_id_seq TO authenticated;

-- Insert initial test data for validation
-- INSERT INTO jobs (id, type, status, data, upload_id) VALUES 
-- ('test_job_1', 'transcribe', 'pending', '{"uploadId": "test", "fileUrl": "https://example.com/test.mp4"}', 'test');

COMMIT;