#!/usr/bin/env tsx
import 'dotenv/config'

import { createClient } from '@supabase/supabase-js'
import { enqueueTranscribeJob, getJob } from '../lib/supabase-job-queue-postgres'

async function testJobQueue() {
  console.log('🧪 Testing Supabase Job Queue System')
  
  // Verify Supabase client works before the queue code runs
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
  if (!supabase) {
    throw new Error('Supabase client could not be created – check your env vars')
  }
  
  console.log('🔍 Verifying Supabase connection...')
  const { data, error } = await supabase
    .from('jobs')
    .select('id')
    .limit(1)
    
  if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" which is OK
    console.error('Supabase test query failed', error)
    process.exit(1)
  }
  console.log('✅ Supabase connected and jobs table accessible')
  
  try {
    // Create a test job
    console.log('1️⃣ Creating test transcription job...')
    const jobId = await enqueueTranscribeJob({
      uploadId: 'test_upload_' + Date.now(),
      fileUrl: 'https://example.com/test.mp4',
      userId: 'test_user',
      options: { test: true }
    })
    
    console.log(`✅ Job created with ID: ${jobId}`)
    
    // Check initial status
    console.log('2️⃣ Checking job status...')
    const job = await getJob(jobId)
    console.log('📊 Job status:', job)
    
    if (job) {
      console.log('📋 Job details:', {
        id: job.id,
        type: job.type,
        status: job.status,
        attempts: job.attempts,
        maxAttempts: job.max_attempts,
        priority: job.priority,
        createdAt: job.created_at
      })
    }
    
    console.log('✅ Test completed successfully!')
    console.log('💡 To process jobs, run: npm run worker')
    console.log('🗄️ Make sure to run the database migrations first:')
    console.log('   1. database/jobs_table_migration.sql')
    console.log('   2. database/fetch_next_job_function.sql')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

testJobQueue().catch(console.error)