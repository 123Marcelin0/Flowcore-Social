# Setup Fixes Required

Based on the error logs, here are the issues that need to be resolved:

## 1. Missing Shotstack Jobs Table in Supabase

**Error:** `shotstack_jobs table returning 404`

**Fix Required:** Run this SQL in your Supabase SQL Editor:

```sql
-- Shotstack Jobs Table Setup
CREATE TABLE IF NOT EXISTS public.shotstack_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    shotstack_job_id VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(50) DEFAULT 'submitted' CHECK (status IN ('submitted', 'queued', 'fetching', 'rendering', 'done', 'failed')),
    input_video_urls TEXT[] NOT NULL,
    output_format VARCHAR(10) DEFAULT 'mp4' CHECK (output_format IN ('mp4', 'gif', 'webm')),
    output_resolution VARCHAR(20) DEFAULT 'full-hd' CHECK (output_resolution IN ('sd', 'hd', 'full-hd')),
    video_url TEXT,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_shotstack_jobs_user_id ON public.shotstack_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_shotstack_jobs_status ON public.shotstack_jobs(status);
CREATE INDEX IF NOT EXISTS idx_shotstack_jobs_shotstack_id ON public.shotstack_jobs(shotstack_job_id);

-- Enable RLS
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

-- Update trigger
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
```

## 2. Complete Your .env.local File

**Current Status:** Placeholder values need to be replaced

**Required Updates:** Replace these placeholder values in your `.env.local`:

```env
# Replace these with your actual Supabase credentials:
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Replace with your actual OpenAI API key:
OPENAI_API_KEY=your-openai-api-key

# Generate a random secret:
NEXTAUTH_SECRET=your-nextauth-secret
```

**How to get Supabase credentials:**
1. Go to your Supabase project dashboard
2. Navigate to Settings → API
3. Copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon/public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`

## 3. Media Proxy Issues

**Error:** Instagram URLs returning 400/403 errors

**Explanation:** This is normal - Instagram URLs have authentication tokens that expire. The media proxy tries to fetch Instagram images but they're protected.

**Impact:** This doesn't affect Shotstack video creation, only the display of existing posts.

## 4. Picture in Picture Error

**Error:** "Picture in Picture requires at least 2 videos"

**Fix:** When using Picture in Picture template, make sure you select at least 2 videos/images.

## Next Steps

### 1. Set up Supabase Database
Run the SQL above in your Supabase SQL Editor to create the required table.

### 2. Update Environment Variables
Replace the placeholder values in `.env.local` with your actual credentials.

### 3. Restart Development Server
After making changes:
```bash
# Stop current server (Ctrl+C)
# Then restart:
pnpm run dev
```

### 4. Test Video Creation
1. Go to AI Studio → Video Editor
2. Upload multiple images (at least 2 for Picture in Picture)
3. Select "Basic Slideshow" template
4. Configure settings and click "Start Rendering"

## Current Configuration Status

✅ **Shotstack API Keys** - Configured for sandbox environment
✅ **Port Configuration** - Updated for current server port
❌ **Supabase Database** - Missing shotstack_jobs table
❌ **Supabase Credentials** - Placeholder values need to be replaced
❌ **OpenAI API Key** - Placeholder value needs to be replaced

Once you complete steps 1 and 2 above, the Shotstack video creation should work properly!