-- ============================================================================
-- Supabase Job Queue Setup SQL
-- Run this SQL in your Supabase Dashboard > SQL Editor
-- ============================================================================

-- 1. Create the jobs table
CREATE TABLE IF NOT EXISTS public.jobs (
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

-- 2. Create the operation_locks table for preventing duplicate processing
CREATE TABLE IF NOT EXISTS public.operation_locks (
    id SERIAL PRIMARY KEY,
    operation_key TEXT UNIQUE NOT NULL,
    operation_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('processing', 'completed', 'failed')),
    result_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- 3. Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_type ON public.jobs(type);
CREATE INDEX IF NOT EXISTS idx_jobs_upload_id ON public.jobs(upload_id);
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON public.jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON public.jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_status_type ON public.jobs(status, type);
CREATE INDEX IF NOT EXISTS idx_jobs_upload_type_status ON public.jobs(upload_id, type, status);

-- Indexes for operation_locks table
CREATE INDEX IF NOT EXISTS idx_operation_locks_key ON public.operation_locks(operation_key);
CREATE INDEX IF NOT EXISTS idx_operation_locks_expires ON public.operation_locks(expires_at);

-- 4. Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 5. Create trigger for jobs table
DROP TRIGGER IF EXISTS update_jobs_updated_at ON public.jobs;
CREATE TRIGGER update_jobs_updated_at
    BEFORE UPDATE ON public.jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. Cleanup function for expired jobs and locks
CREATE OR REPLACE FUNCTION cleanup_expired_jobs_and_locks()
RETURNS void AS $$
BEGIN
    -- Clean up completed/failed jobs older than 7 days
    DELETE FROM public.jobs 
    WHERE status IN ('completed', 'failed', 'cancelled') 
    AND completed_at < NOW() - INTERVAL '7 days';
    
    -- Clean up expired operation locks
    DELETE FROM public.operation_locks 
    WHERE expires_at < NOW();
    
    -- Clean up very old pending jobs (older than 24 hours, likely stuck)
    DELETE FROM public.jobs 
    WHERE status = 'pending' 
    AND created_at < NOW() - INTERVAL '24 hours';
    
    RAISE NOTICE 'Cleanup completed: removed expired jobs and locks';
END;
$$ LANGUAGE plpgsql;

-- 7. Set up Row Level Security (RLS) policies
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operation_locks ENABLE ROW LEVEL SECURITY;

-- Allow service role to access all records
CREATE POLICY "Service role can manage all jobs" ON public.jobs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all locks" ON public.operation_locks
    FOR ALL USING (auth.role() = 'service_role');

-- Allow authenticated users to see their own jobs
CREATE POLICY "Users can view their own jobs" ON public.jobs
    FOR SELECT USING (auth.uid()::text = user_id);

-- 8. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.operation_locks TO authenticated;
GRANT USAGE ON SEQUENCE public.operation_locks_id_seq TO authenticated;

-- Grant permissions to service role (for background processing)
GRANT ALL ON public.jobs TO service_role;
GRANT ALL ON public.operation_locks TO service_role;
GRANT USAGE ON SEQUENCE public.operation_locks_id_seq TO service_role;

-- 9. Create a test job to verify everything works
INSERT INTO public.jobs (id, type, status, data, upload_id) 
VALUES ('test_job_setup', 'test', 'pending', '{"message": "Setup test"}', 'test_upload')
ON CONFLICT (id) DO NOTHING;

-- Verify the tables were created correctly
SELECT 'Jobs table created successfully' as status, count(*) as job_count FROM public.jobs;
SELECT 'Locks table created successfully' as status, count(*) as lock_count FROM public.operation_locks;

-- ============================================================================
-- Setup Complete!
-- ============================================================================