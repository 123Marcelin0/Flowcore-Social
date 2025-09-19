import { Queue, Worker, Job } from 'bullmq'
import Redis from 'ioredis'
import { supabase, supabaseAdmin } from './supabase'
import { transcribeFromUrl } from './transcribe'

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
    throw new Error(`Failed to create job record: ${dbError.message}`)
  }
  
  // Add job to queue
  await videoJobQueue.add(type, { ...data, jobId }, {
    jobId,
    delay: options.delay,
    attempts: options.maxAttempts || 3,
  })
  
  console.log(`✅ Created job ${jobId} of type ${type}`)
  return jobId
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
    console.error(`Failed to get job ${jobId}:`, error.message)
    return null
  }
  
  return data as JobRecord
}

  // Complete idempotency lock with result
  async completeOperationLock(operationKey: string, result: any, status: 'completed' | 'failed' = 'completed'): Promise<void> {
    try {
      await (this.db as any)
        .from('operation_locks')
        .update({
          status,
          result_data: result,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // Keep completed results for 24h
        })
        .eq('operation_key', operationKey)
    } catch (error) {
      console.warn('Failed to complete operation lock:', error)
    }
  }

  // Create new job
  async createJob(
    jobType: Job['job_type'],
    payload: Record<string, any>,
    ownerUserId?: string,
    maxAttempts: number = 3
  ): Promise<string> {
    const jobId = uuidv4()
    
    const { data, error } = await (this.db as any)
      .from('jobs')
      .insert({
        job_id: jobId,
        job_type: jobType,
        payload,
        owner_user_id: ownerUserId,
        max_attempts: maxAttempts,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create job:', error)
      throw new Error('Failed to create job')
    }

    console.log(`📋 Created job: ${jobType} (${jobId})`)
    return jobId
  }

  // Get job status
  async getJob(jobId: string): Promise<Job | null> {
    try {
      const { data, error } = await (this.db as any)
        .from('jobs')
        .select('*')
        .eq('job_id', jobId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null
        throw error
      }

      return data as Job
    } catch (error) {
      console.error('Failed to get job:', error)
      return null
    }
  }

  // Update job status
  async updateJobStatus(
    jobId: string,
    status: Job['status'],
    updates: Partial<{
      result_url: string
      error_message: string
      attempts: number
      started_at: string
      completed_at: string
    }> = {}
  ): Promise<void> {
    try {
      const updateData = {
        status,
        ...updates,
        updated_at: new Date().toISOString()
      }

      if (status === 'processing' && !updates.started_at) {
        updateData.started_at = new Date().toISOString()
      }

      if (['completed', 'failed', 'cancelled'].includes(status) && !updates.completed_at) {
        updateData.completed_at = new Date().toISOString()
      }

      const { error } = await (this.db as any)
        .from('jobs')
        .update(updateData)
        .eq('job_id', jobId)

      if (error) {
        throw error
      }

      console.log(`📋 Job ${jobId} updated to ${status}`)
    } catch (error) {
      console.error('Failed to update job status:', error)
      throw error
    }
  }

  // Get next queued job of specified type
  async getNextQueuedJob(jobType?: Job['job_type']): Promise<Job | null> {
    try {
      let query = (this.db as any)
        .from('jobs')
        .select('*')
        .eq('status', 'queued')
        .lt('attempts', (this.db as any).raw('max_attempts'))
        .order('created_at', { ascending: true })
        .limit(1)

      if (jobType) {
        query = query.eq('job_type', jobType)
      }

      const { data, error } = await query

      if (error) {
        throw error
      }

      return data && data.length > 0 ? data[0] as Job : null
    } catch (error) {
      console.error('Failed to get next queued job:', error)
      return null
    }
  }

  // Increment job attempts
  async incrementJobAttempts(jobId: string): Promise<void> {
    try {
      const { error } = await (this.db as any)
        .from('jobs')
        .update({
          attempts: (this.db as any).raw('attempts + 1'),
          updated_at: new Date().toISOString()
        })
        .eq('job_id', jobId)

      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Failed to increment job attempts:', error)
      throw error
    }
  }

  // Get jobs by user ID
  async getUserJobs(userId: string, limit: number = 50): Promise<Job[]> {
    try {
      const { data, error } = await (this.db as any)
        .from('jobs')
        .select('*')
        .eq('owner_user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        throw error
      }

      return data as Job[]
    } catch (error) {
      console.error('Failed to get user jobs:', error)
      return []
    }
  }

  // Clean up expired jobs and locks
  async cleanup(): Promise<void> {
    try {
      // Clean up expired operation locks
      await (this.db as any)
        .from('operation_locks')
        .delete()
        .lt('expires_at', new Date().toISOString())

      // Clean up expired completed jobs
      await (this.db as any)
        .from('jobs')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .in('status', ['completed', 'failed', 'cancelled'])

      console.log('🧹 Job queue cleanup completed')
    } catch (error) {
      console.error('Failed to cleanup jobs:', error)
    }
  }
}

// Singleton instance
export const jobQueue = new JobQueue()