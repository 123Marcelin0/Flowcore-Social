// DEPRECATED: This file has been replaced by supabase-job-queue-postgres.ts
// All Redis dependencies have been removed in favor of Postgres-only job queue

// Re-export everything from the new Postgres-only implementation
export * from './supabase-job-queue-postgres'

// For backwards compatibility, also export the main functions with their original names
import {
  enqueueTranscribeJob as pgEnqueueTranscribeJob,
  enqueueEnhancedAnalysisJob as pgEnqueueEnhancedAnalysisJob,
  getJob as pgGetJob,
  updateJobStatus as pgUpdateJobStatus
} from './supabase-job-queue-postgres'

// Legacy function names (for compatibility)
export const enqueueTranscribeJob = pgEnqueueTranscribeJob
export const enqueueEnhancedAnalysisJob = pgEnqueueEnhancedAnalysisJob
export const getJobStatus = pgGetJob
export const updateJobStatus = pgUpdateJobStatus

// Legacy JobStatus enum
export { JobStatus } from './supabase-job-queue-postgres'