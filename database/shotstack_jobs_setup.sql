-- Shotstack Jobs Table Setup
-- This table tracks video merging jobs sent to Shotstack API

-- Create shotstack_jobs table
CREATE TABLE IF NOT EXISTS public.shotstack_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    shotstack_job_id VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(50) DEFAULT 'submitted' CHECK (status IN ('submitted', 'queued', 'fetching', 'rendering', 'done', 'failed')),
    input_video_urls TEXT[] NOT NULL,
    output_format VARCHAR(10) DEFAULT 'mp4' CHECK (output_format IN ('mp4', 'gif', 'webm')),
    output_resolution VARCHAR(20) DEFAULT 'full-hd' CHECK (output_resolution IN ('sd', 'hd', 'full-hd')),
    video_url TEXT, -- URL of the final rendered video
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_shotstack_jobs_user_id ON public.shotstack_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_shotstack_jobs_status ON public.shotstack_jobs(status);
CREATE INDEX IF NOT EXISTS idx_shotstack_jobs_shotstack_id ON public.shotstack_jobs(shotstack_job_id);

-- Enable RLS (Row Level Security)
ALTER TABLE public.shotstack_jobs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own shotstack jobs" ON public.shotstack_jobs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own shotstack jobs" ON public.shotstack_jobs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shotstack jobs" ON public.shotstack_jobs
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shotstack jobs" ON public.shotstack_jobs
    FOR DELETE USING (auth.uid() = user_id);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_shotstack_jobs_updated_at 
    BEFORE UPDATE ON public.shotstack_jobs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();