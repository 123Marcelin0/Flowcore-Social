import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface TranscriptionProgress {
  progress: number
  step: string
  updated_at: string
}

interface UseTranscriptionProgressReturn {
  progress: number
  step: string
  isTranscribing: boolean
  startPolling: (uploadId: string) => void
  stopPolling: () => void
}

export function useTranscriptionProgress(): UseTranscriptionProgressReturn {
  const [progress, setProgress] = useState(0)
  const [step, setStep] = useState('')
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)

  const stopPolling = useCallback(() => {
    if (pollingInterval) {
      clearInterval(pollingInterval)
      setPollingInterval(null)
    }
    setIsTranscribing(false)
    setProgress(0)
    setStep('')
  }, [pollingInterval])

  const startPolling = useCallback((uploadId: string) => {
    if (!uploadId) return

    setIsTranscribing(true)
    setProgress(0)
    setStep('Initializing...')

    // Clear any existing interval
    if (pollingInterval) {
      clearInterval(pollingInterval)
    }

    const checkProgress = async () => {
      try {
        const { data: media } = await supabase
          .from('media_files')
          .select('metadata')
          .eq('id', uploadId)
          .single()

        if (media?.metadata?.transcription_progress) {
          const progressData = media.metadata.transcription_progress as TranscriptionProgress
          setProgress(progressData.progress)
          setStep(progressData.step)

          // If progress is complete (100% or null), stop polling
          if (progressData.progress >= 100 || !media.metadata.transcription_progress) {
            stopPolling()
          }
        } else if (media?.metadata?.asr?.segments) {
          // Transcription is complete
          setProgress(100)
          setStep('Transcription complete!')
          setTimeout(() => stopPolling(), 1000)
        }
      } catch (error) {
        console.error('Error checking transcription progress:', error)
      }
    }

    // Check immediately
    checkProgress()

    // Set up polling every 1 second
    const interval = setInterval(checkProgress, 1000)
    setPollingInterval(interval)

    // Auto-stop after 5 minutes to prevent infinite polling
    setTimeout(() => {
      if (interval) {
        clearInterval(interval)
        setPollingInterval(null)
        setIsTranscribing(false)
      }
    }, 300000) // 5 minutes

  }, [pollingInterval, stopPolling])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
    }
  }, [pollingInterval])

  return {
    progress,
    step,
    isTranscribing,
    startPolling,
    stopPolling
  }
}

