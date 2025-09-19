#!/usr/bin/env tsx
import { supabaseAdmin } from '../lib/supabase'

async function createJobTables() {
  if (!supabaseAdmin) {
    console.error('❌ Supabase admin client not available. Check SUPABASE_SERVICE_ROLE_KEY environment variable.')
    process.exit(1)
  }

  console.log('🔄 Creating job queue tables...')

  try {
    // Create jobs table
    const jobsTableSQL = `
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
    `

    const { error: jobsError } = await supabaseAdmin
      .from('jobs')
      .select('id')
      .limit(1)

    if (jobsError && jobsError.code === '42P01') {
      console.log('📄 Creating jobs table...')
      // Use direct SQL execution if available
      console.log('⚠️  Manual SQL execution needed. Please run this SQL in your Supabase dashboard:')
      console.log(jobsTableSQL)
    } else {
      console.log('✅ Jobs table already exists')
    }

    // Create operation_locks table
    const locksTableSQL = `
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
    `

    const { error: locksError } = await supabaseAdmin
      .from('operation_locks')
      .select('id')
      .limit(1)

    if (locksError && locksError.code === '42P01') {
      console.log('🔐 Creating operation_locks table...')
      console.log('⚠️  Manual SQL execution needed. Please run this SQL in your Supabase dashboard:')
      console.log(locksTableSQL)
    } else {
      console.log('✅ Operation_locks table already exists')
    }

    // Create indexes
    const indexesSQL = `
      -- Indexes for jobs table
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
    `

    console.log('📊 Index creation SQL:')
    console.log(indexesSQL)

    console.log('✅ Job queue setup complete! Please run the SQL commands shown above in your Supabase dashboard.')

  } catch (error) {
    console.error('❌ Error setting up job tables:', error)
    process.exit(1)
  }
}

// Run the setup
createJobTables().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})