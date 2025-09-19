/**
 * Job Worker System for Background Processing
 * 
 * This module provides a worker system for processing jobs from the queue.
 * It can be run as a separate process or integrated into the main application.
 * 
 * Usage:
 * - Development: Run alongside the main app
 * - Production: Deploy as separate worker processes or serverless functions
 */

import { jobQueue } from './job-queue'
import { contentModerationService } from './content-moderation'
import { proxyGenerator } from './proxy-generator'
import { transcribeWithEnhancedTiming } from './transcribe'
import { ShotstackService } from './shotstack-service'
import { getShotstackConfig } from './shotstack-config'
import { buildShotstackTimeline } from './timelineBuilder'
import { supabase, supabaseAdmin } from './supabase'

export interface WorkerOptions {
  maxConcurrentJobs: number
  pollInterval: number // milliseconds
  jobTypes: Array<'transcribe' | 'render' | 'proxy_generation' | 'content_moderation'>
  gracefulShutdownTimeout: number
}

export class JobWorker {
  private isRunning = false
  private activeJobs = new Set<string>()
  private shutdownPromise: Promise<void> | null = null
  
  constructor(private options: WorkerOptions = {
    maxConcurrentJobs: 3,
    pollInterval: 5000,
    jobTypes: ['transcribe', 'render', 'proxy_generation', 'content_moderation'],
    gracefulShutdownTimeout: 30000
  }) {}

  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('Job worker is already running')
      return
    }

    this.isRunning = true
    console.log('🚀 Job worker starting...', this.options)

    // Setup graceful shutdown handlers
    process.on('SIGINT', this.gracefulShutdown.bind(this))
    process.on('SIGTERM', this.gracefulShutdown.bind(this))

    // Start the main processing loop
    this.processLoop()
  }

  async stop(): Promise<void> {
    console.log('🛑 Stopping job worker...')
    this.isRunning = false

    // Wait for active jobs to complete or timeout
    if (this.activeJobs.size > 0) {
      console.log(`⏳ Waiting for ${this.activeJobs.size} active jobs to complete...`)
      
      const timeout = new Promise(resolve => 
        setTimeout(resolve, this.options.gracefulShutdownTimeout)
      )
      
      const allJobsComplete = new Promise<void>(resolve => {
        const checkJobs = () => {
          if (this.activeJobs.size === 0) {
            resolve()
          } else {
            setTimeout(checkJobs, 1000)
          }
        }
        checkJobs()
      })

      await Promise.race([allJobsComplete, timeout])
    }

    console.log('✅ Job worker stopped')
  }

  private async processLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        // Check if we can take more jobs
        if (this.activeJobs.size < this.options.maxConcurrentJobs) {
          await this.processNextJob()
        }

        // Clean up completed jobs and expired locks
        await jobQueue.cleanup()

        // Wait before next poll
        await this.sleep(this.options.pollInterval)
      } catch (error) {
        console.error('❌ Error in worker process loop:', error)
        await this.sleep(this.options.pollInterval)
      }
    }
  }

  private async processNextJob(): Promise<void> {
    try {
      // Get next job from any allowed type
      for (const jobType of this.options.jobTypes) {
        const job = await jobQueue.getNextQueuedJob(jobType)
        
        if (job) {
          this.activeJobs.add(job.job_id)
          console.log(`🎯 Processing job: ${job.job_type} (${job.job_id})`)

          // Process job without blocking the main loop
          this.processJobAsync(job)
          return
        }
      }
    } catch (error) {
      console.error('❌ Error getting next job:', error)
    }
  }

  private async processJobAsync(job: any): Promise<void> {
    try {
      await jobQueue.incrementJobAttempts(job.job_id)

      switch (job.job_type) {
        case 'transcribe':
          await this.processTranscriptionJob(job)
          break
        case 'render':
          await this.processRenderJob(job)
          break
        case 'proxy_generation':
          await this.processProxyJob(job)
          break
        case 'content_moderation':
          await this.processModerationJob(job)
          break
        default:
          throw new Error(`Unknown job type: ${job.job_type}`)
      }

    } catch (error) {
      console.error(`❌ Job ${job.job_id} failed:`, error)
      
      if (job.attempts >= job.max_attempts) {
        await jobQueue.updateJobStatus(job.job_id, 'failed', {
          error_message: String(error)
        })
        console.log(`💀 Job ${job.job_id} failed permanently after ${job.attempts} attempts`)
      } else {
        // Retry the job by putting it back in queue
        await jobQueue.updateJobStatus(job.job_id, 'queued')
        console.log(`🔄 Job ${job.job_id} queued for retry (attempt ${job.attempts + 1}/${job.max_attempts})`)
      }
    } finally {
      this.activeJobs.delete(job.job_id)
    }
  }

  private async processTranscriptionJob(job: any): Promise<void> {
    const { uploadId, fileUrl, options, lockKey } = job.payload

    try {
      console.log('🎤 Processing transcription job:', job.job_id)
      
      await jobQueue.updateJobStatus(job.job_id, 'processing')

      // Perform transcription
      const transcriptionResult = await transcribeWithEnhancedTiming({
        uploadId,
        fileUrl
      })

      // Complete operation lock if provided
      if (lockKey) {
        await jobQueue.completeOperationLock(lockKey, transcriptionResult)
      }

      await jobQueue.updateJobStatus(job.job_id, 'completed', {
        result_url: `transcription_completed_${uploadId}`
      })

      console.log('✅ Transcription job completed:', job.job_id)

    } catch (error) {
      if (lockKey) {
        await jobQueue.completeOperationLock(lockKey, null, 'failed')
      }
      throw error
    }
  }

  private async processRenderJob(job: any): Promise<void> {
    const { uploadId, styleId } = job.payload

    try {
      console.log('🎬 Processing render job:', job.job_id)
      
      await jobQueue.updateJobStatus(job.job_id, 'processing')

      const db = supabaseAdmin || supabase
      
      // Get media file data
      const { data: media, error } = await (db as any)
        .from('media_files')
        .select('id, storage_url, metadata')
        .eq('id', uploadId)
        .single()

      if (error || !media) {
        throw new Error('Media file not found')
      }

      const sourceUrl = media.storage_url
      const cutList = media.metadata?.cutList || []
      const asr = media.metadata?.asr
      const autoPlan = media.metadata?.auto_zoom_plan

      // Build Shotstack timeline
      const edit = buildShotstackTimeline({
        sourceUrl,
        cutList,
        captionClips: asr?.segments || [],
        overlayAssets: [],
        styleId,
        zoomEvents: autoPlan?.zoom_events || [],
        transitionEvents: autoPlan?.transition_events || []
      })

      // Submit to Shotstack
      const shotstackService = new ShotstackService({ ...getShotstackConfig(), debug: true })
      const renderResp = await shotstackService.render(edit)
      const shotstackJobId = renderResp?.response?.id

      if (!shotstackJobId) {
        throw new Error('Failed to submit render to Shotstack')
      }

      // Update job with Shotstack job ID
      await jobQueue.updateJobStatus(job.job_id, 'processing', {
        result_url: shotstackJobId
      })

      // Poll Shotstack for completion
      await this.pollShotstackJob(job.job_id, shotstackJobId, shotstackService)

      console.log('✅ Render job completed:', job.job_id)

    } catch (error) {
      throw error
    }
  }

  private async pollShotstackJob(jobId: string, shotstackJobId: string, service: ShotstackService): Promise<void> {
    const maxPolls = 120 // 10 minutes with 5s intervals
    let polls = 0

    while (polls < maxPolls) {
      try {
        const status = await service.getStatus(shotstackJobId)
        
        switch (status.response.status) {
          case 'done':
            await jobQueue.updateJobStatus(jobId, 'completed', {
              result_url: status.response.url
            })
            return

          case 'failed':
            throw new Error(`Shotstack render failed: ${status.response.error}`)

          case 'rendering':
          case 'queued':
            // Continue polling
            break
        }

        await this.sleep(5000) // 5 second poll interval
        polls++

      } catch (error) {
        console.error('Error polling Shotstack:', error)
        polls++
        await this.sleep(5000)
      }
    }

    throw new Error('Shotstack render timeout')
  }

  private async processProxyJob(job: any): Promise<void> {
    const { uploadId, inputUrl, options } = job.payload

    try {
      console.log('🎞️ Processing proxy generation job:', job.job_id)
      
      await jobQueue.updateJobStatus(job.job_id, 'processing')

      const results = await proxyGenerator.generateAllProxies(uploadId, inputUrl, options)

      await jobQueue.updateJobStatus(job.job_id, 'completed', {
        result_url: results.proxy_url || 'completed'
      })

      console.log('✅ Proxy generation job completed:', job.job_id)

    } catch (error) {
      throw error
    }
  }

  private async processModerationJob(job: any): Promise<void> {
    const { uploadId } = job.payload

    try {
      console.log('🔍 Processing moderation job:', job.job_id)
      
      await jobQueue.updateJobStatus(job.job_id, 'processing')

      const result = await contentModerationService.moderateMediaFile(uploadId)

      await jobQueue.updateJobStatus(job.job_id, 'completed', {
        result_url: result.approved ? 'approved' : 'rejected'
      })

      console.log('✅ Moderation job completed:', job.job_id)

    } catch (error) {
      throw error
    }
  }

  private async gracefulShutdown(): Promise<void> {
    if (this.shutdownPromise) {
      return this.shutdownPromise
    }

    this.shutdownPromise = this.stop()
    return this.shutdownPromise
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Singleton worker instance
export const jobWorker = new JobWorker()

// Auto-start in development
if (process.env.NODE_ENV === 'development' && process.env.AUTO_START_WORKER === 'true') {
  jobWorker.start().catch(console.error)
}