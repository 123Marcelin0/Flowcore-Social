#!/usr/bin/env tsx

/**
 * Simple Job Worker - Processes jobs from Supabase queue
 * 
 * Usage:
 *   npm run worker
 *   npx tsx scripts/worker.ts
 * 
 * Environment variables:
 *   WORKER_POLL_INTERVAL - How often to check for jobs (ms, default: 5000)
 *   WORKER_CONCURRENT_JOBS - Max concurrent jobs (default: 1)
 *   NODE_ENV - Set to 'development' for verbose logging
 */

import 'dotenv/config'
import { 
  fetchNextJob, 
  processJob, 
  getPendingJobsCount,
  cleanupOldJobs,
  Job
} from '../lib/supabase-job-queue-postgres'

// Configuration
const POLL_INTERVAL = parseInt(process.env.WORKER_POLL_INTERVAL || '5000')
const CONCURRENT_JOBS = parseInt(process.env.WORKER_CONCURRENT_JOBS || '1')
const IS_DEV = process.env.NODE_ENV === 'development'

// Worker state
let isShuttingDown = false
let activeJobs = 0
let totalProcessed = 0
let totalFailed = 0

/**
 * Main worker loop
 */
async function startWorker() {
  console.log('🚀 Starting Supabase Job Worker')
  console.log(`📊 Config: Poll=${POLL_INTERVAL}ms, Concurrent=${CONCURRENT_JOBS}`)
  
  // Setup graceful shutdown
  setupGracefulShutdown()
  
  // Cleanup old jobs on startup
  try {
    await cleanupOldJobs(7)
  } catch (error) {
    console.warn('⚠️ Failed to cleanup old jobs on startup:', error)
  }
  
  // Main processing loop
  while (!isShuttingDown) {
    try {
      await processAvailableJobs()
      await sleep(POLL_INTERVAL)
    } catch (error) {
      console.error('❌ Worker loop error:', error)
      await sleep(POLL_INTERVAL * 2) // Back off on error
    }
  }
  
  console.log('👋 Worker shutting down gracefully...')
}

/**
 * Process available jobs up to the concurrency limit
 */
async function processAvailableJobs() {
  if (activeJobs >= CONCURRENT_JOBS) {
    if (IS_DEV) console.log(`⏳ At max concurrency (${activeJobs}/${CONCURRENT_JOBS})`)
    return
  }
  
  try {
    const pendingCount = await getPendingJobsCount()
    if (IS_DEV && pendingCount > 0) {
      console.log(`📋 ${pendingCount} pending jobs, ${activeJobs} active`)
    }
    
    // Process jobs up to concurrency limit
    const slotsAvailable = CONCURRENT_JOBS - activeJobs
    const jobPromises = []
    
    for (let i = 0; i < slotsAvailable; i++) {
      const job = await fetchNextJob()
      if (!job) break
      
      // Process job asynchronously
      const jobPromise = processJobAsync(job)
      jobPromises.push(jobPromise)
    }
    
    // Don't await all jobs here - let them run concurrently
    if (jobPromises.length > 0) {
      console.log(`🎯 Started ${jobPromises.length} new jobs`)
    }
    
  } catch (error) {
    console.error('❌ Error in processAvailableJobs:', error)
  }
}

/**
 * Process a single job asynchronously
 */
async function processJobAsync(job: Job): Promise<void> {
  activeJobs++
  const startTime = Date.now()
  
  try {
    console.log(`▶️ Starting job ${job.id} (${job.type})`)
    
    await processJob(job)
    
    const duration = Date.now() - startTime
    totalProcessed++
    
    console.log(`✅ Job ${job.id} completed in ${duration}ms`)
    
  } catch (error) {
    const duration = Date.now() - startTime
    totalFailed++
    
    console.error(`❌ Job ${job.id} failed after ${duration}ms:`, error)
    
  } finally {
    activeJobs--
  }
}

/**
 * Setup graceful shutdown handlers
 */
function setupGracefulShutdown() {
  const shutdown = () => {
    if (isShuttingDown) return
    
    console.log('\n🛑 Received shutdown signal')
    isShuttingDown = true
    
    // Wait for active jobs to complete
    if (activeJobs > 0) {
      console.log(`⏳ Waiting for ${activeJobs} active jobs to complete...`)
      const checkInterval = setInterval(() => {
        if (activeJobs === 0) {
          clearInterval(checkInterval)
          console.log('✅ All jobs completed. Exiting.')
          printStats()
          process.exit(0)
        } else {
          console.log(`⏳ Still waiting for ${activeJobs} jobs...`)
        }
      }, 1000)
      
      // Force exit after 30 seconds
      setTimeout(() => {
        console.log('⚠️ Force exit - some jobs may not have completed')
        printStats()
        process.exit(1)
      }, 30000)
    } else {
      console.log('✅ No active jobs. Exiting immediately.')
      printStats()
      process.exit(0)
    }
  }
  
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

/**
 * Print worker statistics
 */
function printStats() {
  console.log('\n📊 Worker Statistics:')
  console.log(`   Processed: ${totalProcessed}`)
  console.log(`   Failed: ${totalFailed}`)
  console.log(`   Success rate: ${totalProcessed + totalFailed > 0 ? Math.round((totalProcessed / (totalProcessed + totalFailed)) * 100) : 0}%`)
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Health check endpoint (optional)
 */
async function healthCheck() {
  try {
    const pendingCount = await getPendingJobsCount()
    return {
      status: 'healthy',
      activeJobs,
      pendingJobs: pendingCount,
      totalProcessed,
      totalFailed,
      uptime: process.uptime()
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

// Print health status every 5 minutes in development
if (IS_DEV) {
  setInterval(async () => {
    const health = await healthCheck()
    console.log('💊 Health:', health)
  }, 5 * 60 * 1000)
}

// Start the worker
if (require.main === module) {
  startWorker().catch(error => {
    console.error('💥 Worker crashed:', error)
    process.exit(1)
  })
}