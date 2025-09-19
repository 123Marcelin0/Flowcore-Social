-- Jobs Queue Table for Supabase (Postgres-only)
-- Run this in your Supabase SQL Editor

-- IMPORTANT: If jobs table already exists, first check if it has the payload column
-- If not, add it: ALTER TABLE jobs ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Drop existing jobs table if it exists (careful in production!)
DROP TABLE IF EXISTS jobs CASCADE;

-- Create jobs table with correct schema
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done', 'failed')),
    result JSONB DEFAULT NULL,
    error_message TEXT DEFAULT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    priority INTEGER NOT NULL DEFAULT 0, -- Higher number = higher priority
    run_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- When to run the job
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_type ON jobs(type);
CREATE INDEX idx_jobs_run_at ON jobs(run_at);
CREATE INDEX idx_jobs_priority_run_at ON jobs(priority DESC, run_at ASC);
CREATE INDEX idx_jobs_status_priority_run_at ON jobs(status, priority DESC, run_at ASC);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_jobs_updated_at
    BEFORE UPDATE ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_jobs_updated_at();

-- Function to clean up old completed jobs (run this periodically)
CREATE OR REPLACE FUNCTION cleanup_old_jobs(days_to_keep INTEGER DEFAULT 7)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM jobs 
    WHERE status IN ('done', 'failed') 
    AND completed_at < NOW() - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security (optional, for multi-tenant scenarios)
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Example policies (adjust based on your auth setup)
CREATE POLICY "Anyone can read jobs" ON jobs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert jobs" ON jobs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update jobs" ON jobs FOR UPDATE USING (true);

-- Grant permissions to authenticated users
GRANT ALL ON jobs TO authenticated;
GRANT ALL ON jobs TO anon;