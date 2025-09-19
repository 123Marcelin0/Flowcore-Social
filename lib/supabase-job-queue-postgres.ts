/**
 * Supabase-Only Job Queue System
 * No Redis dependencies - uses Postgres/Supabase for all job management
 */

import { supabaseAdmin } from './supabase'
import { transcribeFromUrl } from './transcribe'

// Job status enum
export enum JobStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress', 
  DONE = 'done',
  FAILED = 'failed'
}

// Job interface
export interface Job {
  id: string
  type: string
  payload: any
  status: JobStatus
  result?: any
  error_message?: string
  attempts: number
  max_attempts: number
  priority: number
  run_at: string
  started_at?: string
  completed_at?: string
  created_at: string
  updated_at: string
}

// Job types
export interface TranscribeJobPayload {
  uploadId: string
  fileUrl: string
  userId?: string
  options?: any
}

export interface EnhancedAnalysisJobPayload {
  uploadId: string
  transcriptSegments: any[]
  totalDuration?: number
  userId?: string
  options?: any
}

/**
 * Validate Supabase configuration
 */
function validateSupabaseConfig(): void {
  if (!supabaseAdmin) {
    throw new Error('supabaseAdmin client is not configured - check your environment variables')
  }
}

/**
 * Enqueue a new job
 */
export async function enqueueJob(
  type: string,
  payload: any,
  options: {
    priority?: number
    maxAttempts?: number
    runAt?: Date
    userId?: string
  } = {}
): Promise<string> {
  validateSupabaseConfig()
  
  const job = {
    type,
    payload,
    status: JobStatus.PENDING,
    priority: options.priority || 0,
    max_attempts: options.maxAttempts || 3,
    run_at: (options.runAt || new Date()).toISOString(),
    attempts: 0
  }
  
  console.log('📋 Enqueueing job:', { type, priority: job.priority })
  
  const { data, error } = await supabaseAdmin
    .from('jobs')
    .insert(job)
    .select('id')
    .single()
  
  if (error) {
    console.error('❌ Failed to enqueue job:', error)
    throw new Error(`Failed to enqueue job: ${error.message}`)
  }
  
  console.log('✅ Job enqueued with ID:', data.id)
  return data.id
}

/**
 * Fetch the next available job and mark it as in progress
 */
export async function fetchNextJob(): Promise<Job | null> {
  validateSupabaseConfig()
  
  // Use a transaction to atomically fetch and update a job
  const { data, error } = await supabaseAdmin.rpc('fetch_next_job')
  
  if (error) {
    // If the RPC doesn't exist, fall back to a less atomic approach
    console.warn('RPC fetch_next_job not found, using fallback method')
    return await fetchNextJobFallback()
  }
  
  return data ? data[0] : null
}

/**
 * Fallback method for fetching next job (less atomic but works without custom RPC)
 */
async function fetchNextJobFallback(): Promise<Job | null> {
  // Find the next pending job
  const { data: jobs, error: selectError } = await supabaseAdmin
    .from('jobs')
    .select('*')
    .eq('status', JobStatus.PENDING)
    .lte('run_at', new Date().toISOString())
    .order('priority', { ascending: false })
    .order('run_at', { ascending: true })
    .limit(1)
  
  if (selectError) {
    console.error('❌ Error fetching jobs:', selectError)
    return null
  }
  
  if (!jobs || jobs.length === 0) {
    return null
  }
  
  const job = jobs[0]
  
  // Try to claim this job by updating its status
  const { data: updatedJob, error: updateError } = await supabaseAdmin
    .from('jobs')
    .update({
      status: JobStatus.IN_PROGRESS,
      started_at: new Date().toISOString(),
      attempts: job.attempts + 1
    })
    .eq('id', job.id)
    .eq('status', JobStatus.PENDING) // Only update if still pending (avoid race conditions)
    .select()
    .single()
  
  if (updateError || !updatedJob) {
    // Job was probably claimed by another worker
    console.log('⚡ Job was claimed by another worker or update failed')
    return null
  }
  
  console.log('🎯 Claimed job:', { id: job.id, type: job.type })
  return updatedJob as Job
}

/**
 * Update job status
 */
export async function updateJobStatus(
  jobId: string,
  status: JobStatus,
  updates: {
    result?: any
    errorMessage?: string
  } = {}
): Promise<void> {
  validateSupabaseConfig()
  
  const updateData: any = {
    status,
    updated_at: new Date().toISOString()
  }
  
  if (updates.result !== undefined) {
    updateData.result = updates.result
  }
  
  if (updates.errorMessage) {
    updateData.error_message = updates.errorMessage
  }
  
  if (status === JobStatus.DONE || status === JobStatus.FAILED) {
    updateData.completed_at = new Date().toISOString()
  }
  
  const { error } = await supabaseAdmin
    .from('jobs')
    .update(updateData)
    .eq('id', jobId)
  
  if (error) {
    console.error(`❌ Failed to update job ${jobId}:`, error)
    throw new Error(`Failed to update job status: ${error.message}`)
  }
  
  console.log(`✅ Job ${jobId} status updated to ${status}`)
}

/**
 * Get job by ID
 */
export async function getJob(jobId: string): Promise<Job | null> {
  validateSupabaseConfig()
  
  const { data, error } = await supabaseAdmin
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .single()
  
  if (error) {
    if (error.code === 'PGRST116') { // Not found
      return null
    }
    console.error(`❌ Error fetching job ${jobId}:`, error)
    throw new Error(`Failed to fetch job: ${error.message}`)
  }
  
  return data as Job
}

/**
 * Get pending jobs count
 */
export async function getPendingJobsCount(): Promise<number> {
  validateSupabaseConfig()
  
  const { count, error } = await supabaseAdmin
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .eq('status', JobStatus.PENDING)
  
  if (error) {
    console.error('❌ Error counting pending jobs:', error)
    return 0
  }
  
  return count || 0
}

/**
 * Get jobs by status with optional limit
 */
export async function getJobsByStatus(
  status: JobStatus,
  limit?: number
): Promise<Job[]> {
  validateSupabaseConfig()
  
  let query = supabaseAdmin
    .from('jobs')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false })
  
  if (limit) {
    query = query.limit(limit)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error(`❌ Error fetching ${status} jobs:`, error)
    return []
  }
  
  return data as Job[]
}

/**
 * Retry a failed job
 */
export async function retryJob(jobId: string): Promise<void> {
  const job = await getJob(jobId)
  if (!job) {
    throw new Error(`Job ${jobId} not found`)
  }
  
  if (job.attempts >= job.max_attempts) {
    throw new Error(`Job ${jobId} has exceeded maximum attempts`)
  }
  
  await updateJobStatus(jobId, JobStatus.PENDING)
  console.log(`🔄 Job ${jobId} queued for retry`)
}

/**
 * Clean up old completed jobs
 */
export async function cleanupOldJobs(daysToKeep: number = 7): Promise<number> {
  validateSupabaseConfig()
  
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
  
  const { error } = await supabaseAdmin
    .from('jobs')
    .delete()
    .in('status', [JobStatus.DONE, JobStatus.FAILED])
    .lt('completed_at', cutoffDate.toISOString())
  
  if (error) {
    console.error('❌ Error cleaning up old jobs:', error)
    throw new Error(`Failed to cleanup jobs: ${error.message}`)
  }
  
  console.log(`🧹 Cleaned up jobs older than ${daysToKeep} days`)
  return 0 // Supabase doesn't return affected rows count easily
}

// Job processor functions
export async function processTranscribeJob(job: Job): Promise<void> {
  const { uploadId, fileUrl, options = {} } = job.payload as TranscribeJobPayload
  
  console.log(`🎤 Processing transcribe job ${job.id} for upload ${uploadId}`)
  
  try {
    const result = await transcribeFromUrl({ uploadId, fileUrl, options })
    
    await updateJobStatus(job.id, JobStatus.DONE, {
      result: {
        segments: result.segments,
        duration: result.duration,
        text: result.text,
        words: result.words
      }
    })
    
    console.log(`✅ Transcribe job ${job.id} completed`)
  } catch (error: any) {
    console.error(`❌ Transcribe job ${job.id} failed:`, error)
    
    if (job.attempts >= job.max_attempts) {
      await updateJobStatus(job.id, JobStatus.FAILED, {
        errorMessage: error.message
      })
    } else {
      // Requeue for retry
      await updateJobStatus(job.id, JobStatus.PENDING)
    }
  }
}

export async function processEnhancedAnalysisJob(job: Job): Promise<void> {
  const { uploadId, transcriptSegments, options = {} } = job.payload as EnhancedAnalysisJobPayload
  
  console.log(`🧠 Processing enhanced analysis job ${job.id} for upload ${uploadId}`)
  
  try {
    // Call your enhanced analysis API
    const response = await fetch('/api/enhanced-video-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uploadId,
        transcriptSegments,
        options
      })
    })
    
    if (!response.ok) {
      throw new Error(`Enhanced analysis API failed: ${response.status}`)
    }
    
    const result = await response.json()
    
    await updateJobStatus(job.id, JobStatus.DONE, { result })
    
    console.log(`✅ Enhanced analysis job ${job.id} completed`)
  } catch (error: any) {
    console.error(`❌ Enhanced analysis job ${job.id} failed:`, error)
    
    if (job.attempts >= job.max_attempts) {
      await updateJobStatus(job.id, JobStatus.FAILED, {
        errorMessage: error.message
      })
    } else {
      // Requeue for retry
      await updateJobStatus(job.id, JobStatus.PENDING)
    }
  }
}

/**
 * Process a single job by its ID
 */
export async function processJob(job: Job): Promise<void> {
  console.log(`🔄 Processing job ${job.id} of type ${job.type}`)
  
  try {
    switch (job.type) {
      case 'transcribe':
        await processTranscribeJob(job)
        break
      
      case 'enhanced-analysis':
        await processEnhancedAnalysisJob(job)
        break
      
      default:
        throw new Error(`Unknown job type: ${job.type}`)
    }
  } catch (error: any) {
    console.error(`❌ Job ${job.id} processing failed:`, error)
    
    if (job.attempts >= job.max_attempts) {
      await updateJobStatus(job.id, JobStatus.FAILED, {
        errorMessage: error.message
      })
    } else {
      // Requeue for retry with delay
      const retryDelay = Math.min(1000 * Math.pow(2, job.attempts), 30000) // Exponential backoff, max 30s
      const runAt = new Date(Date.now() + retryDelay)
      
      await supabaseAdmin
        .from('jobs')
        .update({
          status: JobStatus.PENDING,
          run_at: runAt.toISOString()
        })
        .eq('id', job.id)
    }
  }
}

// Helper functions for specific job types
export async function enqueueTranscribeJob(payload: TranscribeJobPayload): Promise<string> {
  return enqueueJob('transcribe', payload, { maxAttempts: 3 })
}

export async function enqueueEnhancedAnalysisJob(payload: EnhancedAnalysisJobPayload): Promise<string> {
  return enqueueJob('enhanced-analysis', payload, { maxAttempts: 2 })
}