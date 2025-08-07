# 🚨 Critical Setup Steps to Fix Errors

You're getting multiple errors because some critical setup steps are missing. Here's what you need to do **right now** to fix the issues:

## 🔥 IMMEDIATE ACTIONS REQUIRED

### 1. 📊 Create Missing Database Table

**Problem:** `shotstack_jobs table returning 404`

**Fix:** Go to your Supabase project and run this SQL:

1. **Open Supabase Dashboard** → Your Project → SQL Editor
2. **Copy and paste this SQL:**

```sql
-- Create shotstack_jobs table
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

-- Enable RLS
ALTER TABLE public.shotstack_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own shotstack jobs" ON public.shotstack_jobs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own shotstack jobs" ON public.shotstack_jobs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shotstack jobs" ON public.shotstack_jobs
    FOR UPDATE USING (auth.uid() = user_id);
```

3. **Click "Run"**

### 2. 🔧 Update Your Environment File

**Problem:** `Shotstack configuration error`

Your `.env.local` has placeholder values. You need to replace them with real values:

**Get your Supabase credentials:**
1. Supabase Dashboard → Settings → API
2. Copy the values:

```env
# Replace these in your .env.local:
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key
```

**Add OpenAI API key:**
```env
OPENAI_API_KEY=your-openai-api-key
```

**Generate a secret:**
```env
NEXTAUTH_SECRET=any-random-string-here
```

### 3. 🔄 Restart Development Server

After updating `.env.local`:

1. **Stop current server** (Ctrl+C in terminal)
2. **Restart:** `pnpm run dev`

## 🎯 What Each Error Means

### ❌ "Shotstack configuration error"
- **Cause:** Missing or invalid environment variables
- **Fix:** Complete step 2 above

### ❌ "404 on shotstack_jobs"
- **Cause:** Database table doesn't exist
- **Fix:** Complete step 1 above

### ❌ "400/403 on media-proxy"
- **Cause:** Instagram URLs with expired tokens
- **Impact:** Only affects image display, not video creation
- **Fix:** Not required (this is normal)

### ❌ "Picture in Picture requires at least 2 videos"
- **Cause:** Selected template needs multiple files
- **Fix:** Use "Basic Slideshow" template instead

## 🧪 Test After Setup

Once you complete steps 1-3:

1. **Go to AI Studio → Video Editor**
2. **Upload images** using the upload button
3. **Select "Basic Slideshow" template**
4. **Add title/subtitle** 
5. **Click "Start Rendering"**

**Expected result:** Should work without "Shotstack configuration error"

## 📱 Current Status

✅ **Shotstack API Keys** - Properly configured  
✅ **Development Server** - Running on port 3000/3001  
❌ **Supabase Database** - Missing shotstack_jobs table  
❌ **Supabase Credentials** - Using placeholder values  
❌ **OpenAI API Key** - Using placeholder value  

## 🚀 Quick Setup Checklist

- [ ] Run SQL in Supabase to create shotstack_jobs table
- [ ] Get Supabase URL, anon key, and service role key
- [ ] Update `.env.local` with real Supabase credentials
- [ ] Add OpenAI API key to `.env.local`
- [ ] Add NEXTAUTH_SECRET to `.env.local`
- [ ] Restart development server: `pnpm run dev`
- [ ] Test video creation in AI Studio

**Complete these steps and the Shotstack video creation will work!** 🎉