-- Fix jobs table UUID generation issue
-- Run this in your Supabase SQL Editor

-- First, let's check if the uuid-ossp extension is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Check current table structure
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name = 'jobs' 
ORDER BY ordinal_position;

-- Drop and recreate the table with proper UUID setup
DROP TABLE IF EXISTS jobs CASCADE;

-- Create jobs table with correct UUID generation
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done', 'failed')),
    result JSONB DEFAULT NULL,
    error_message TEXT DEFAULT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    priority INTEGER NOT NULL DEFAULT 0,
    run_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_type ON jobs(type);
CREATE INDEX idx_jobs_run_at ON jobs(run_at);
CREATE INDEX idx_jobs_priority_run_at ON jobs(priority DESC, run_at ASC);
CREATE INDEX idx_jobs_status_priority_run_at ON jobs(status, priority DESC, run_at ASC);

-- Create update trigger function
CREATE OR REPLACE FUNCTION update_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_jobs_updated_at
    BEFORE UPDATE ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_jobs_updated_at();

-- Test UUID generation
INSERT INTO jobs (type, payload) VALUES ('test', '{"test": true}');
SELECT id, type, created_at FROM jobs WHERE type = 'test';
DELETE FROM jobs WHERE type = 'test';

-- Verify final table structure
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name = 'jobs' 
ORDER BY ordinal_position;