#!/usr/bin/env tsx
import 'dotenv/config'
import { startWorker } from '../lib/supabase-job-queue'

console.log('🚀 Starting Supabase Job Queue Worker...')
console.log('📍 Worker will poll for jobs every 5 seconds')
console.log('⏹️  Press Ctrl+C to stop')

// Start the worker with 5 second polling interval
const stopWorker = startWorker(5000)

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...')
  stopWorker()
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...')
  stopWorker()
  process.exit(0)
})