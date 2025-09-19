import { useState, useEffect, useCallback } from 'react'

export interface JobStatus {
  id: string
  type: 'transcribe' | 'render' | 'proxy_generation' | 'content_moderation'
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled'
  progress: number
  result_url?: string
  error?: string
  created_at: string
  started_at?: string
  completed_at?: string
  attempts: number
  max_attempts: number
}

interface UseJobStatusOptions {
  pollInterval?: number // milliseconds
  onComplete?: (job: JobStatus) => void
  onError?: (job: JobStatus) => void
  autoStop?: boolean // Stop polling when job completes or fails
}

export function useJobStatus(
  jobId: string | null,
  options: UseJobStatusOptions = {}
) {
  const {
    pollInterval = 2000, // Poll every 2 seconds by default
    onComplete,
    onError,
    autoStop = true
  } = options

  const [job, setJob] = useState<JobStatus | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const fetchJobStatus = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/jobs/${id}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return data as JobStatus
    } catch (err) {
      throw new Error(`Failed to fetch job status: ${err instanceof Error ? err.message : String(err)}`)
    }
  }, [])

  const updateJob = useCallback(async () => {
    if (!jobId || loading) return

    try {
      setLoading(true)
      setError(null)

      const jobData = await fetchJobStatus(jobId)
      setJob(jobData)

      // Call callbacks based on status
      if (jobData.status === 'completed' && onComplete) {
        onComplete(jobData)
      } else if (jobData.status === 'failed' && onError) {
        onError(jobData)
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      setError(errorMessage)
      console.error('Failed to fetch job status:', err)
    } finally {
      setLoading(false)
    }
  }, [jobId, loading, fetchJobStatus, onComplete, onError])

  const cancelJob = useCallback(async () => {
    if (!jobId) return

    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error(`Failed to cancel job: ${response.status}`)
      }

      // Update job status immediately
      await updateJob()
    } catch (err) {
      console.error('Failed to cancel job:', err)
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [jobId, updateJob])

  // Polling effect
  useEffect(() => {
    if (!jobId) {
      setJob(null)
      setError(null)
      return
    }

    // Initial fetch
    updateJob()

    // Set up polling
    const shouldPoll = () => {
      if (!job) return true
      if (autoStop && ['completed', 'failed', 'cancelled'].includes(job.status)) {
        return false
      }
      return true
    }

    if (shouldPoll()) {
      const interval = setInterval(() => {
        if (shouldPoll()) {
          updateJob()
        }
      }, pollInterval)

      return () => clearInterval(interval)
    }
  }, [jobId, pollInterval, autoStop, job?.status, updateJob])

  return {
    job,
    loading,
    error,
    refresh: updateJob,
    cancel: cancelJob,
    isComplete: job?.status === 'completed',
    isFailed: job?.status === 'failed',
    isProcessing: job?.status === 'processing',
    isQueued: job?.status === 'queued'
  }
}

// Hook for managing multiple jobs
export function useMultipleJobStatus(jobIds: string[], options: UseJobStatusOptions = {}) {
  const [jobs, setJobs] = useState<Record<string, JobStatus>>({})
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const { pollInterval = 2000, onComplete, onError, autoStop = true } = options

  const fetchAllJobs = useCallback(async () => {
    if (jobIds.length === 0) return

    try {
      setLoading(true)
      setError(null)

      const responses = await Promise.allSettled(
        jobIds.map(id => fetch(`/api/jobs/${id}`).then(r => r.json()))
      )

      const newJobs: Record<string, JobStatus> = {}
      
      responses.forEach((response, index) => {
        const jobId = jobIds[index]
        
        if (response.status === 'fulfilled') {
          newJobs[jobId] = response.value
          
          // Call callbacks
          const job = response.value
          if (job.status === 'completed' && onComplete) {
            onComplete(job)
          } else if (job.status === 'failed' && onError) {
            onError(job)
          }
        } else {
          console.error(`Failed to fetch job ${jobId}:`, response.reason)
        }
      })

      setJobs(prev => ({ ...prev, ...newJobs }))

    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [jobIds, onComplete, onError])

  // Polling effect for multiple jobs
  useEffect(() => {
    if (jobIds.length === 0) {
      setJobs({})
      return
    }

    // Initial fetch
    fetchAllJobs()

    // Set up polling
    const shouldPoll = () => {
      if (autoStop) {
        // Stop polling if all jobs are in terminal states
        const allComplete = jobIds.every(id => {
          const job = jobs[id]
          return job && ['completed', 'failed', 'cancelled'].includes(job.status)
        })
        return !allComplete
      }
      return true
    }

    if (shouldPoll()) {
      const interval = setInterval(() => {
        if (shouldPoll()) {
          fetchAllJobs()
        }
      }, pollInterval)

      return () => clearInterval(interval)
    }
  }, [jobIds, pollInterval, autoStop, jobs, fetchAllJobs])

  const getJob = useCallback((jobId: string) => jobs[jobId] || null, [jobs])

  const allComplete = jobIds.length > 0 && jobIds.every(id => jobs[id]?.status === 'completed')
  const anyFailed = jobIds.some(id => jobs[id]?.status === 'failed')
  const allLoaded = jobIds.every(id => jobs[id] != null)

  return {
    jobs,
    loading,
    error,
    refresh: fetchAllJobs,
    getJob,
    allComplete,
    anyFailed,
    allLoaded,
    completedCount: jobIds.filter(id => jobs[id]?.status === 'completed').length,
    totalCount: jobIds.length
  }
}