-- AI Jobs Table for Interior Designer Module
-- This table stores AI processing jobs for the Interior Designer feature

CREATE TABLE IF NOT EXISTS ai_jobs (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('change_style', 'remove_interior', 'add_interior')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    external_api_name TEXT NOT NULL CHECK (external_api_name IN ('applydesign', 'reimaginehome')),
    external_job_id TEXT NOT NULL,
    result_image_url TEXT,
    error_message TEXT,
    style_id TEXT,
    room_type TEXT,
    batch_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ai_jobs_user_id ON ai_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_status ON ai_jobs(status);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_created_at ON ai_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_external_api ON ai_jobs(external_api_name);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_batch_id ON ai_jobs(batch_id) WHERE batch_id IS NOT NULL;

-- Add RLS (Row Level Security) policies
ALTER TABLE ai_jobs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own jobs
CREATE POLICY "Users can view their own AI jobs" ON ai_jobs
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own jobs
CREATE POLICY "Users can create their own AI jobs" ON ai_jobs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own jobs
CREATE POLICY "Users can update their own AI jobs" ON ai_jobs
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own jobs
CREATE POLICY "Users can delete their own AI jobs" ON ai_jobs
    FOR DELETE USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ai_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_ai_jobs_updated_at
    BEFORE UPDATE ON ai_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_jobs_updated_at();

-- Add comments for documentation
COMMENT ON TABLE ai_jobs IS 'Stores AI processing jobs for interior design features';
COMMENT ON COLUMN ai_jobs.id IS 'Unique identifier for the AI job';
COMMENT ON COLUMN ai_jobs.user_id IS 'Reference to the user who created the job';
COMMENT ON COLUMN ai_jobs.image_url IS 'URL of the original image to be processed';
COMMENT ON COLUMN ai_jobs.action IS 'Type of AI action: change_style, remove_interior, or add_interior';
COMMENT ON COLUMN ai_jobs.status IS 'Current status of the job: pending, in_progress, completed, or failed';
COMMENT ON COLUMN ai_jobs.external_api_name IS 'Which external API is being used: applydesign or reimaginehome';
COMMENT ON COLUMN ai_jobs.external_job_id IS 'Job ID from the external API service';
COMMENT ON COLUMN ai_jobs.result_image_url IS 'URL of the processed result image (when completed)';
COMMENT ON COLUMN ai_jobs.error_message IS 'Error message if job failed';
COMMENT ON COLUMN ai_jobs.style_id IS 'Style ID used for the transformation';
COMMENT ON COLUMN ai_jobs.room_type IS 'Room type specified for the transformation';
COMMENT ON COLUMN ai_jobs.batch_id IS 'Optional batch ID for grouping related jobs'; 