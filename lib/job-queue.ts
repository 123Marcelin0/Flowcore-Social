import { Queue, Worker, Job } from 'bullmq'
import Redis from 'ioredis'
import { supabase, supabaseAdmin } from './supabase'
import { transcribeFromUrl } from './transcribe'
import { logger, logJobExecution } from './structured-logger'

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  lazyConnect: true,
}

// Create Redis connection
const redis = new Redis(redisConfig)

// Create job queue
export const videoJobQueue = new Queue('video-processing', {
  connection: redisConfig,
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
})

// Job types
export interface TranscribeJobData {
  uploadId: string
  fileUrl: string
  userId?: string
  options?: any
}

export interface EnhancedAnalysisJobData {
  uploadId: string
  transcriptSegments: any[]
  totalDuration?: number
  userId?: string
  options?: any
}

// Job status enum
export enum JobStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// Database job record interface
export interface JobRecord {
  id: string
  type: string
  status: JobStatus
  data: any
  result?: any
  error?: string
  progress: number
  attempts: number
  max_attempts: number
  created_at: string
  updated_at: string
  started_at?: string
  completed_at?: string
  upload_id?: string
  user_id?: string
}

// Create a job and store it in database
export async function createJob(
  type: string,
  data: any,
  options: {
    uploadId?: string
    userId?: string
    maxAttempts?: number
    delay?: number
  } = {}
): Promise<string> {
  const jobId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const requestId = logger.generateRequestId()
  
  const jobLogger = logger.child({
    requestId,
    jobId,
    uploadId: options.uploadId,
    userId: options.userId,
    operation: 'create_job',
    component: 'job-queue'
  })
  
  jobLogger.info('job_creation_start', { type, dataKeys: Object.keys(data), options })
  
  try {
    // Store job in database
    const { error: dbError } = await supabaseAdmin
      .from('jobs')
      .insert({
        id: jobId,
        type,
        status: JobStatus.PENDING,
        data,
        progress: 0,
        attempts: 0,
        max_attempts: options.maxAttempts || 3,
        upload_id: options.uploadId,
        user_id: options.userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    
    if (dbError) {
      jobLogger.error('job_db_insert_failed', new Error(dbError.message), { code: dbError.code })
      throw new Error(`Failed to create job record: ${dbError.message}`)
    }
    
    // Add job to queue
    await videoJobQueue.add(type, { ...data, jobId }, {
      jobId,
      delay: options.delay,
      attempts: options.maxAttempts || 3,
    })
    
    jobLogger.info('job_created_successfully', { 
      delay: options.delay,
      maxAttempts: options.maxAttempts || 3
    })
    
    return jobId
  } catch (error: any) {
    jobLogger.error('job_creation_failed', error)
    throw error
  }
}

// Update job status in database
export async function updateJobStatus(
  jobId: string,
  status: JobStatus,
  updates: {
    progress?: number
    result?: any
    error?: string
    attempts?: number
  } = {}
): Promise<void> {
  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
    ...updates
  }
  
  if (status === JobStatus.IN_PROGRESS && !updates.attempts) {
    updateData.started_at = new Date().toISOString()
  } else if (status === JobStatus.COMPLETED || status === JobStatus.FAILED) {
    updateData.completed_at = new Date().toISOString()
  }
  
  const { error } = await supabaseAdmin
    .from('jobs')
    .update(updateData)
    .eq('id', jobId)
  
  if (error) {
    console.error(`Failed to update job ${jobId}:`, error.message)
  }
}

// Get job status from database
export async function getJobStatus(jobId: string): Promise<JobRecord | null> {
  const { data, error } = await supabaseAdmin
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .single()
  
  if (error) {
    if (error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error(`Failed to get job ${jobId}:`, error.message)
    }
    return null
  }
  
  return data as JobRecord
}

// Idempotency check - prevent duplicate jobs for same upload+type
export async function checkIdempotency(
  uploadId: string,
  type: string
): Promise<string | null> {
  // Check if there's already a pending or in-progress job for this upload
  const { data, error } = await supabaseAdmin
    .from('jobs')
    .select('id, status')
    .eq('upload_id', uploadId)
    .eq('type', type)
    .in('status', [JobStatus.PENDING, JobStatus.IN_PROGRESS])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  
  if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
    console.error(`Idempotency check failed:`, error.message)
  }
  
  return data?.id || null
}

// Redis lock for preventing duplicate processing
export async function acquireLock(
  lockKey: string,
  ttlSeconds: number = 300
): Promise<boolean> {
  try {
    const result = await redis.set(lockKey, process.pid.toString(), 'EX', ttlSeconds, 'NX')
    return result === 'OK'
  } catch (error) {
    console.error(`Failed to acquire lock ${lockKey}:`, error)
    return false
  }
}

export async function releaseLock(lockKey: string): Promise<void> {
  try {
    await redis.del(lockKey)
  } catch (error) {
    console.error(`Failed to release lock ${lockKey}:`, error)
  }
}

// Enhanced video analysis function (placeholder - needs actual implementation)
async function runEnhancedVideoAnalysis(data: EnhancedAnalysisJobData): Promise<any> {
  // Import and call the enhanced video analysis
  const response = await fetch('/api/enhanced-video-analysis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  
  if (!response.ok) {
    throw new Error(`Enhanced analysis failed: ${response.statusText}`)
  }
  
  return await response.json()
}

// Job processor functions
async function processTranscribeJob(job: Job<TranscribeJobData & { jobId: string }>): Promise<any> {
  const { uploadId, fileUrl, jobId, userId } = job.data
  
  return logJobExecution('transcribe', jobId, async () => {
    const jobLogger = logger.child({
      jobId,
      uploadId,
      userId,
      operation: 'transcribe',
      component: 'job-processor'
    })
    
    jobLogger.info('transcribe_job_start', { 
      fileUrl: fileUrl.substring(0, 100) + '...',
      attempt: job.attemptsMade + 1 
    })
    
    await updateJobStatus(jobId, JobStatus.IN_PROGRESS, { attempts: job.attemptsMade + 1 })
    
    // Acquire lock to prevent duplicate processing
    const lockKey = `lock:transcribe:${uploadId}`
    const lockAcquired = await acquireLock(lockKey, 600) // 10 minutes
    
    if (!lockAcquired) {
      jobLogger.warn('transcribe_job_duplicate_blocked', { lockKey })
      throw new Error('Another transcription job is already processing this upload')
    }
    
    try {
      const startTime = Date.now()
      const result = await transcribeFromUrl({ uploadId, fileUrl })
      const processingTime = Date.now() - startTime
      
      await updateJobStatus(jobId, JobStatus.COMPLETED, { 
        progress: 100, 
        result: {
          segments: result.segments,
          duration: result.duration,
          text: result.text
        }
      })
      
      jobLogger.performance('transcribe_job_completed', startTime, {
        segmentCount: result.segments.length,
        textLength: result.text.length,
        duration: result.duration
      })
      
      return result
    } finally {
      await releaseLock(lockKey)
      jobLogger.debug('transcribe_job_lock_released', { lockKey })
    }
  }, { uploadId, userId })
}

async function processEnhancedAnalysisJob(job: Job<EnhancedAnalysisJobData & { jobId: string }>): Promise<any> {
  const { uploadId, transcriptSegments, totalDuration, jobId, options } = job.data
  console.log(`🎬 Processing enhanced analysis job ${jobId} for upload ${uploadId}`)
  
  await updateJobStatus(jobId, JobStatus.IN_PROGRESS, { attempts: job.attemptsMade + 1 })
  
  try {
    // Acquire lock to prevent duplicate processing
    const lockKey = `lock:enhanced:${uploadId}`
    const lockAcquired = await acquireLock(lockKey, 1800) // 30 minutes
    
    if (!lockAcquired) {
      throw new Error('Another enhanced analysis job is already processing this upload')
    }
    
    try {
      const result = await runEnhancedVideoAnalysis({
        uploadId,
        transcriptSegments,
        totalDuration,
        options: options || {}
      })
      
      await updateJobStatus(jobId, JobStatus.COMPLETED, { 
        progress: 100, 
        result
      })
      
      console.log(`✅ Enhanced analysis job ${jobId} completed`)
      return result
    } finally {
      await releaseLock(lockKey)
    }
  } catch (error: any) {
    console.error(`❌ Enhanced analysis job ${jobId} failed:`, error)
    await updateJobStatus(jobId, JobStatus.FAILED, { 
      error: error.message,
      attempts: job.attemptsMade + 1
    })
    throw error
  }
}

// Create worker to process jobs
export function createWorker() {
  const worker = new Worker('video-processing', async (job: Job) => {
    console.log(`🔄 Processing job ${job.id} of type ${job.name}`)
    
    switch (job.name) {
      case 'transcribe':
        return await processTranscribeJob(job as Job<TranscribeJobData & { jobId: string }>)
      
      case 'enhanced-analysis':
        return await processEnhancedAnalysisJob(job as Job<EnhancedAnalysisJobData & { jobId: string }>)
      
      default:
        throw new Error(`Unknown job type: ${job.name}`)
    }
  }, {
    connection: redisConfig,
    concurrency: 2, // Process up to 2 jobs concurrently
    removeOnComplete: 10,
    removeOnFail: 50,
  })
  
  worker.on('completed', (job, result) => {
    console.log(`✅ Job ${job.id} completed successfully`)
  })
  
  worker.on('failed', (job, err) => {
    console.error(`❌ Job ${job?.id} failed:`, err.message)
  })
  
  worker.on('error', (err) => {
    console.error('❌ Worker error:', err)
  })
  
  return worker
}

// Helper functions for job enqueueing
export async function enqueueTranscribeJob(data: TranscribeJobData): Promise<string> {
  // Check idempotency
  const existingJobId = await checkIdempotency(data.uploadId, 'transcribe')
  if (existingJobId) {
    console.log(`⚡ Transcribe job already exists for upload ${data.uploadId}: ${existingJobId}`)
    return existingJobId
  }
  
  return await createJob('transcribe', data, {
    uploadId: data.uploadId,
    userId: data.userId,
    maxAttempts: 3
  })
}

export async function enqueueEnhancedAnalysisJob(data: EnhancedAnalysisJobData): Promise<string> {
  // Check idempotency
  const existingJobId = await checkIdempotency(data.uploadId, 'enhanced-analysis')
  if (existingJobId) {
    console.log(`⚡ Enhanced analysis job already exists for upload ${data.uploadId}: ${existingJobId}`)
    return existingJobId
  }
  
  return await createJob('enhanced-analysis', data, {
    uploadId: data.uploadId,
    userId: data.userId,
    maxAttempts: 2, // Less retries for analysis jobs
    delay: 2000     // 2 second delay to ensure transcription is complete
  })
}

// Utility function to wait for job completion (for testing)
export async function waitForJobCompletion(
  jobId: string,
  timeoutMs: number = 300000 // 5 minutes default
): Promise<JobRecord> {
  const startTime = Date.now()
  
  while (Date.now() - startTime < timeoutMs) {
    const job = await getJobStatus(jobId)
    if (!job) {
      throw new Error(`Job ${jobId} not found`)
    }
    
    if (job.status === JobStatus.COMPLETED) {
      return job
    } else if (job.status === JobStatus.FAILED) {
      throw new Error(`Job ${jobId} failed: ${job.error}`)
    }
    
    // Wait 1 second before checking again
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  throw new Error(`Job ${jobId} timed out after ${timeoutMs}ms`)
}