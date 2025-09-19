# 🚀 Supabase Job Queue Setup

## Problem Fixed
Your application was trying to connect to Redis on `127.0.0.1:6379` but no Redis server was running. This has been replaced with a **Supabase-only job queue system**.

## ✅ What's Done

### 1. **Created Supabase Job Queue System**
- ✅ `lib/supabase-job-queue.ts` - Complete job queue implementation
- ✅ Updated API routes to use new system:
  - `/api/jobs/transcribe`
  - `/api/jobs/[id]` 
  - `/api/enhanced-video-analysis`
- ✅ Worker scripts for job processing
- ✅ Test scripts for validation

### 2. **Database Setup**
- ✅ `SUPABASE_JOB_QUEUE_SETUP.sql` - Complete SQL setup
- ✅ Tables: `jobs` and `operation_locks`
- ✅ Indexes, triggers, and RLS policies
- ✅ Cleanup functions for maintenance

### 3. **Scripts & Commands**
- ✅ `npm run worker` - Start job worker
- ✅ `npm run worker:dev` - Start worker in dev mode
- ✅ `npm run test-queue` - Test job queue system

## 🔧 Setup Instructions

### Step 1: Run Database Migration
1. Open your [Supabase Dashboard](https://app.supabase.com)
2. Go to **SQL Editor**
3. Copy and paste the entire content of `SUPABASE_JOB_QUEUE_SETUP.sql`
4. Click **Run** to execute the SQL

### Step 2: Configure Environment Variables
Make sure these are set in your `.env.local`:
```bash
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_api_key
```

### Step 3: Test the System
```bash
# Test job creation (should work even without worker running)
npm run test-queue

# Start the job worker (processes jobs in background)
npm run worker
```

## 🎯 How It Works

### Job Creation Flow
1. API endpoint receives request
2. Job gets inserted into `jobs` table with status `pending`  
3. API returns job ID for status polling
4. Worker polls for pending jobs and processes them
5. Job status updates to `completed` or `failed`

### No Redis Required!
- ✅ Jobs stored in Supabase database
- ✅ Locking via database constraints
- ✅ Status polling via API endpoints
- ✅ Background processing via worker script

## 🧪 Testing

### Test Job Creation
```bash
npm run test-queue
```

### Check Job Status
Visit: `http://localhost:3000/api/jobs/{jobId}`

### Process Jobs
```bash
npm run worker
```

## 🔍 Monitoring Jobs

You can monitor jobs directly in your Supabase dashboard:

```sql
-- View all jobs
SELECT * FROM public.jobs ORDER BY created_at DESC;

-- View pending jobs
SELECT * FROM public.jobs WHERE status = 'pending';

-- View failed jobs
SELECT * FROM public.jobs WHERE status = 'failed';

-- Clean up old jobs
SELECT cleanup_expired_jobs_and_locks();
```

## 🚀 Deployment

### For Development
```bash
npm run worker:dev
```

### For Production
- Deploy the worker as a separate service (Railway, Fly.io, etc.)
- Or use Supabase Edge Functions for lighter processing
- Set up monitoring and auto-restart for the worker

## ✨ Benefits

- **No Redis dependency** - Everything runs on Supabase
- **Persistent jobs** - Jobs survive server restarts
- **Built-in monitoring** - View jobs directly in Supabase
- **Scalable** - Easy to run multiple workers
- **Reliable** - Database-backed with proper locking

Your pipeline should now work without the Redis connection error! 🎉