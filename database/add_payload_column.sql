-- Fix for missing 'payload' column in jobs table
-- Run this in your Supabase SQL Editor if you get the error:
-- "Could not find the 'payload' column of 'jobs' in the schema cache"

-- Add the missing payload column if it doesn't exist
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Also add other missing columns that might be needed
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS result JSONB DEFAULT NULL;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS error_message TEXT DEFAULT NULL;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS max_attempts INTEGER NOT NULL DEFAULT 3;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 0;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS run_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create or replace the update trigger
CREATE OR REPLACE FUNCTION update_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_jobs_updated_at ON jobs;
CREATE TRIGGER trigger_jobs_updated_at
    BEFORE UPDATE ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_jobs_updated_at();

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs(type);
CREATE INDEX IF NOT EXISTS idx_jobs_run_at ON jobs(run_at);
CREATE INDEX IF NOT EXISTS idx_jobs_priority_run_at ON jobs(priority DESC, run_at ASC);
CREATE INDEX IF NOT EXISTS idx_jobs_status_priority_run_at ON jobs(status, priority DESC, run_at ASC);

-- Verify the table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'jobs' 
ORDER BY ordinal_position;