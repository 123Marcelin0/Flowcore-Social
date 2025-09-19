#!/usr/bin/env node

/**
 * Job Worker Process
 * 
 * This script runs as a separate process to handle background jobs.
 * It uses BullMQ to process jobs from the Redis queue.
 * 
 * Usage:
 *   npm run worker
 *   or
 *   npx ts-node scripts/job-worker.ts
 */

import { createWorker } from '../lib/job-queue'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

async function startWorker() {
  console.log('🚀 Starting job worker process...')
  console.log(`📍 Process ID: ${process.pid}`)
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`)
  
  // Validate required environment variables
  const requiredEnvVars = ['OPENAI_API_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_SUPABASE_URL']
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars)
    process.exit(1)
  }
  
  // Redis configuration
  const redisHost = process.env.REDIS_HOST || 'localhost'
  const redisPort = process.env.REDIS_PORT || '6379'
  console.log(`🔗 Redis connection: ${redisHost}:${redisPort}`)
  
  try {
    // Create and start the worker
    const worker = createWorker()
    
    console.log('✅ Worker started successfully!')
    console.log('🔄 Ready to process jobs...')
    console.log('📝 Supported job types: transcribe, enhanced-analysis')
    console.log('💡 Press Ctrl+C to stop the worker')
    
    // Graceful shutdown handling
    let isShuttingDown = false
    
    const gracefulShutdown = async (signal: string) => {
      if (isShuttingDown) {
        console.log('🔥 Force shutdown...')
        process.exit(1)
      }
      
      isShuttingDown = true
      console.log(`\n📴 Received ${signal}. Gracefully shutting down worker...`)
      
      try {
        await worker.close()
        console.log('✅ Worker stopped gracefully')
        process.exit(0)
      } catch (error) {
        console.error('❌ Error during worker shutdown:', error)
        process.exit(1)
      }
    }
    
    // Handle shutdown signals
    process.on('SIGINT', () => gracefulShutdown('SIGINT'))
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
    process.on('SIGHUP', () => gracefulShutdown('SIGHUP'))
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught exception:', error)
      gracefulShutdown('uncaughtException')
    })
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled rejection at:', promise, 'reason:', reason)
      gracefulShutdown('unhandledRejection')
    })
    
    // Keep the process alive
    await new Promise(() => {}) // This will run forever until interrupted
    
  } catch (error) {
    console.error('❌ Failed to start worker:', error)
    process.exit(1)
  }
}

// Start the worker if this script is executed directly
if (require.main === module) {
  startWorker().catch((error) => {
    console.error('❌ Worker startup failed:', error)
    process.exit(1)
  })
}