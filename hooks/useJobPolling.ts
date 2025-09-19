import { useState, useEffect, useCallback } from 'react'

export interface JobData {
  id: string
  type: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled'
  progress: number
  attempts: number
  maxAttempts: number
  error?: string
  result?: any
  createdAt: string
  updatedAt: string
  startedAt?: string
  completedAt?: string
  uploadId?: string
  userId?: string
}

export interface JobPollingOptions {
  jobId: string
  enabled?: boolean
  pollInterval?: number // in milliseconds
  onComplete?: (result: any) => void
  onError?: (error: string) => void
  onProgress?: (progress: number) => void
}

export function useJobPolling({
  jobId,
  enabled = true,
  pollInterval = 2000, // 2 seconds
  onComplete,
  onError,
  onProgress
}: JobPollingOptions) {
  const [job, setJob] = useState<JobData | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const fetchJobStatus = useCallback(async () => {
    if (!jobId || !enabled) return

    try {
      setLoading(true)
      const response = await fetch(`/api/jobs/${jobId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch job status')
      }

      const jobData = data.data as JobData
      setJob(jobData)
      setError(null)

      // Trigger progress callback
      if (onProgress && typeof jobData.progress === 'number') {
        onProgress(jobData.progress)
      }

      // Handle completion
      if (jobData.status === 'completed') {
        console.log('✅ Job completed:', jobId, jobData.result)
        if (onComplete) {
          onComplete(jobData.result)
        }
      }

      // Handle error
      if (jobData.status === 'failed') {
        const errorMessage = jobData.error || 'Job failed'
        console.error('❌ Job failed:', jobId, errorMessage)
        setError(errorMessage)
        if (onError) {
          onError(errorMessage)
        }
      }

    } catch (err: any) {
      console.error('❌ Error fetching job status:', err)
      setError(err.message || 'Failed to fetch job status')
      if (onError) {
        onError(err.message || 'Failed to fetch job status')
      }
    } finally {
      setLoading(false)
    }
  }, [jobId, enabled, onComplete, onError, onProgress])

  // Poll job status
  useEffect(() => {
    if (!jobId || !enabled) return

    // Fetch immediately
    fetchJobStatus()

    // Only continue polling if job is not in a final state
    const shouldContinuePolling = () => {
      return job?.status === 'pending' || job?.status === 'in_progress'
    }

    const interval = setInterval(() => {
      if (shouldContinuePolling()) {
        fetchJobStatus()
      } else {
        clearInterval(interval)
      }
    }, pollInterval)

    return () => clearInterval(interval)
  }, [jobId, enabled, fetchJobStatus, pollInterval, job?.status])

  const retry = useCallback(() => {
    if (jobId) {
      setError(null)
      fetchJobStatus()
    }
  }, [jobId, fetchJobStatus])

  return {
    job,
    loading,
    error,
    retry,
    isPolling: enabled && (job?.status === 'pending' || job?.status === 'in_progress'),
    isCompleted: job?.status === 'completed',
    isFailed: job?.status === 'failed',
    progress: job?.progress || 0
  }
}

// Hook for multiple jobs
export function useMultipleJobPolling(jobIds: string[], options?: Omit<JobPollingOptions, 'jobId'>) {
  const [jobs, setJobs] = useState<Record<string, JobData>>({})
  const [loading, setLoading] = useState<boolean>(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const fetchAllJobs = useCallback(async () => {
    if (!jobIds.length || !options?.enabled) return

    try {
      setLoading(true)
      
      // Fetch all jobs in parallel
      const responses = await Promise.allSettled(
        jobIds.map(jobId => fetch(`/api/jobs/${jobId}`).then(r => r.json()))
      )

      const newJobs: Record<string, JobData> = {}
      const newErrors: Record<string, string> = {}

      responses.forEach((result, index) => {
        const jobId = jobIds[index]
        
        if (result.status === 'fulfilled' && result.value.success) {
          newJobs[jobId] = result.value.data
          
          // Handle individual job completion
          if (result.value.data.status === 'completed' && options?.onComplete) {
            options.onComplete(result.value.data.result)
          }
          
          // Handle individual job error
          if (result.value.data.status === 'failed' && options?.onError) {
            options.onError(result.value.data.error || 'Job failed')
          }
        } else {
          const error = result.status === 'rejected' ? result.reason.message : result.value.error
          newErrors[jobId] = error || 'Failed to fetch job status'
        }
      })

      setJobs(newJobs)
      setErrors(newErrors)
      
    } catch (err: any) {
      console.error('❌ Error fetching multiple job statuses:', err)
    } finally {
      setLoading(false)
    }
  }, [jobIds, options])

  useEffect(() => {
    if (!jobIds.length || !options?.enabled) return

    fetchAllJobs()

    // Continue polling while any job is still running
    const interval = setInterval(() => {
      const hasRunningJobs = Object.values(jobs).some(
        job => job.status === 'pending' || job.status === 'in_progress'
      )
      
      if (hasRunningJobs) {
        fetchAllJobs()
      } else {
        clearInterval(interval)
      }
    }, options?.pollInterval || 2000)

    return () => clearInterval(interval)
  }, [jobIds, fetchAllJobs, jobs, options])

  const allCompleted = Object.values(jobs).every(job => job.status === 'completed')
  const anyFailed = Object.values(jobs).some(job => job.status === 'failed')
  const overallProgress = Object.values(jobs).reduce((sum, job) => sum + (job.progress || 0), 0) / Math.max(Object.keys(jobs).length, 1)

  return {
    jobs,
    loading,
    errors,
    allCompleted,
    anyFailed,
    overallProgress,
    retry: fetchAllJobs
  }
}