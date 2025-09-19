-- Jobs table for durable job queue system
CREATE TABLE IF NOT EXISTS jobs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  job_id TEXT UNIQUE NOT NULL, -- External job identifier (e.g., shotstack render ID)
  job_type TEXT NOT NULL, -- 'transcribe', 'render', 'proxy_generation', 'content_moderation'
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  owner_user_id UUID,
  payload JSONB NOT NULL, -- Job-specific data (uploadId, parameters, etc.)
  result_url TEXT, -- Final output URL when completed
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Index for efficient job querying
CREATE INDEX IF NOT EXISTS idx_jobs_status_type ON jobs(status, job_type);
CREATE INDEX IF NOT EXISTS idx_jobs_owner ON jobs(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_job_id ON jobs(job_id);

-- Idempotency table for preventing duplicate operations
CREATE TABLE IF NOT EXISTS operation_locks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  operation_key TEXT UNIQUE NOT NULL, -- Hash of operation parameters
  operation_type TEXT NOT NULL, -- 'transcribe', 'render', 'proxy_gen'
  resource_id TEXT NOT NULL, -- uploadId or similar
  result_data JSONB, -- Cached result if operation completed
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 hour')
);

CREATE INDEX IF NOT EXISTS idx_operation_locks_key ON operation_locks(operation_key);
CREATE INDEX IF NOT EXISTS idx_operation_locks_resource ON operation_locks(resource_id);

-- Enhanced media_files table additions
ALTER TABLE media_files 
ADD COLUMN IF NOT EXISTS content_moderation_status TEXT DEFAULT 'pending' CHECK (content_moderation_status IN ('pending', 'approved', 'rejected', 'reviewing')),
ADD COLUMN IF NOT EXISTS proxy_url TEXT,
ADD COLUMN IF NOT EXISTS preview_hls_url TEXT,
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS waveform_json JSONB,
ADD COLUMN IF NOT EXISTS aspect_ratio DECIMAL(5,3), -- e.g., 0.563 for 9:16
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
ADD COLUMN IF NOT EXISTS instagram_compliant BOOLEAN DEFAULT FALSE;

-- Content moderation results
CREATE TABLE IF NOT EXISTS content_moderation (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  media_file_id UUID REFERENCES media_files(id) ON DELETE CASCADE,
  moderation_provider TEXT NOT NULL, -- 'openai', 'aws_rekognition', etc.
  results JSONB NOT NULL,
  flagged BOOLEAN DEFAULT FALSE,
  categories TEXT[] DEFAULT '{}', -- Array of flagged categories
  confidence_scores JSONB, -- Provider-specific confidence data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_moderation_media_file ON content_moderation(media_file_id);
CREATE INDEX IF NOT EXISTS idx_content_moderation_flagged ON content_moderation(flagged);

-- Update trigger for jobs table
CREATE OR REPLACE FUNCTION update_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_jobs_updated_at();

-- Error logging and diagnostics table
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  error_id TEXT UNIQUE NOT NULL,
  operation TEXT NOT NULL,
  component TEXT NOT NULL,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  error_message TEXT NOT NULL,
  error_stack TEXT,
  context_data JSONB,
  system_info JSONB,
  suggestions TEXT[],
  recovery_actions TEXT[],
  upload_id UUID,
  user_id UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_error_logs_operation ON error_logs(operation, component);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity, created_at);
CREATE INDEX IF NOT EXISTS idx_error_logs_upload ON error_logs(upload_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_created ON error_logs(created_at);

-- Clean up expired operations and jobs periodically
CREATE OR REPLACE FUNCTION cleanup_expired_records()
RETURNS void AS $$
BEGIN
  DELETE FROM operation_locks WHERE expires_at < NOW();
  DELETE FROM jobs WHERE expires_at < NOW() AND status IN ('completed', 'failed', 'cancelled');
  -- Clean up old error logs (keep for 30 days)
  DELETE FROM error_logs WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;