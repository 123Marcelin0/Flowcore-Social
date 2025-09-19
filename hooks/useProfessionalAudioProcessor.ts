import { useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export interface ProcessingOptions {
  silenceThreshold: number
  minSilenceLength: number
  keepSilence: number
  enableBadTakeDetection: boolean
  processingQuality: 'fast' | 'balanced' | 'high'
}

export interface ProcessingResult {
  success: boolean
  processedMediaUrl?: string
  stats: {
    originalDuration: number
    finalDuration: number
    reductionPercentage: number
    segmentsRemoved: number
    silenceRemoved: number
    badTakesRemoved: number
  }
  error?: string
}

export interface BadTakeAnalysis {
  totalIssues: number
  breakdown: {
    badTakes: number
    fillers: number
    repetitions: number
  }
  potentialTimeReduction: {
    seconds: number
    percentage: number
  }
  recommendations: string[]
  detectedSegments: Array<{
    start: number
    end: number
    reason: string
    confidence: number
    text?: string
  }>
}

const DEFAULT_OPTIONS: ProcessingOptions = {
  silenceThreshold: -35,
  minSilenceLength: 300,
  keepSilence: 150,
  enableBadTakeDetection: true,
  processingQuality: 'balanced'
}

/**
 * Professional Audio Processing Hook
 * Provides Instagram Reel-quality editing capabilities with real-time progress
 */
export function useProfessionalAudioProcessor() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [processingStep, setProcessingStep] = useState('')
  const [lastResult, setLastResult] = useState<ProcessingResult | null>(null)
  const [badTakeAnalysis, setBadTakeAnalysis] = useState<BadTakeAnalysis | null>(null)
  
  const abortControllerRef = useRef<AbortController | null>(null)

  /**
   * Analyze media for bad takes and editing opportunities
   */
  const analyzeBadTakes = useCallback(async (uploadId: string): Promise<BadTakeAnalysis | null> => {
    if (isAnalyzing) return null
    
    setIsAnalyzing(true)
    setProcessingStep('Analyzing content for editing opportunities...')
    
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (token) headers.Authorization = `Bearer ${token}`

      // Retry logic for 404 errors (route compilation delay)
      let response
      let retryCount = 0
      const maxRetries = 3

      while (retryCount < maxRetries) {
        try {
          response = await fetch(`/api/professional-audio-processing?uploadId=${uploadId}&type=complete`, {
            method: 'GET',
            headers
          })

          if (response.status === 404 && retryCount < maxRetries - 1) {
            console.log(`⏳ API route compiling for analysis... retry ${retryCount + 1}/${maxRetries}`)
            setProcessingStep(`Initializing analysis... (${retryCount + 1}/${maxRetries})`)
            await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds
            retryCount++
            continue
          }

          if (!response.ok) {
            throw new Error(`Analysis failed: ${response.status}`)
          }
          break
        } catch (error: any) {
          if (retryCount === maxRetries - 1) throw error
          
          console.log(`⚠️ Analysis request failed, retrying... (${retryCount + 1}/${maxRetries})`)
          setProcessingStep(`Connection issue, retrying analysis... (${retryCount + 1}/${maxRetries})`)
          await new Promise(resolve => setTimeout(resolve, 2000))
          retryCount++
        }
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Analysis failed')
      }

      const analysis = result.data as BadTakeAnalysis
      setBadTakeAnalysis(analysis)
      setProcessingStep(`Found ${analysis.totalIssues} editing opportunities`)
      
      return analysis
    } catch (error: any) {
      console.error('❌ Bad take analysis failed:', error)
      setProcessingStep('Analysis failed')
      return null
    } finally {
      setIsAnalyzing(false)
    }
  }, [isAnalyzing])

  /**
   * Process media with professional editing
   */
  const processMedia = useCallback(async (
    uploadId: string,
    processingType: 'bad_takes' | 'pauses' | 'complete' = 'complete',
    options: Partial<ProcessingOptions> = {}
  ): Promise<ProcessingResult | null> => {
    if (isProcessing) return null

    setIsProcessing(true)
    setProcessingProgress(0)
    setProcessingStep('Initializing professional processing...')
    
    // Setup abort controller for cancellation
    abortControllerRef.current = new AbortController()
    
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (token) headers.Authorization = `Bearer ${token}`

      const processingOptions = { ...DEFAULT_OPTIONS, ...options }
      
      setProcessingStep('Loading media and transcript...')
      setProcessingProgress(10)

      // Get bad take markers from analysis if available
      const badTakeMarkers = badTakeAnalysis?.detectedSegments.map(seg => ({
        start: seg.start,
        end: seg.end,
        reason: seg.reason,
        confidence: seg.confidence
      })) || []

      setProcessingStep('Analyzing audio patterns...')
      setProcessingProgress(25)

      const requestBody = {
        uploadId,
        processingType,
        badTakeMarkers,
        options: {
          silenceThreshold: processingOptions.silenceThreshold,
          minSilenceLength: processingOptions.minSilenceLength,
          keepSilence: processingOptions.keepSilence,
          enableBadTakeDetection: processingOptions.enableBadTakeDetection,
          crossfadeDuration: processingOptions.processingQuality === 'fast' ? 20 : 
                           processingOptions.processingQuality === 'high' ? 80 : 50,
          enableAudioNormalization: true,
          targetLUFS: -14
        }
      }

      setProcessingStep('Processing with professional filters...')
      setProcessingProgress(50)

      // Retry logic for 404 errors (route compilation delay)
      let response
      let retryCount = 0
      const maxRetries = 3

      while (retryCount < maxRetries) {
        try {
          response = await fetch('/api/professional-audio-processing', {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody),
            signal: abortControllerRef.current.signal
          })

          if (response.status === 404 && retryCount < maxRetries - 1) {
            console.log(`⏳ API route compiling... retry ${retryCount + 1}/${maxRetries}`)
            setProcessingStep(`Initializing professional processing... (${retryCount + 1}/${maxRetries})`)
            await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds
            retryCount++
            continue
          }

          if (!response.ok) {
            throw new Error(`Processing failed: ${response.status}`)
          }
          break
        } catch (error: any) {
          if (error.name === 'AbortError') throw error
          if (retryCount === maxRetries - 1) throw error
          
          console.log(`⚠️ Request failed, retrying... (${retryCount + 1}/${maxRetries})`)
          setProcessingStep(`Connection issue, retrying... (${retryCount + 1}/${maxRetries})`)
          await new Promise(resolve => setTimeout(resolve, 2000))
          retryCount++
        }
      }

      setProcessingStep('Finalizing output...')
      setProcessingProgress(80)

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Processing failed')
      }

      setProcessingStep('Creating download URL...')
      setProcessingProgress(95)

      // Create a unique blob URL for the processed video
      // In real implementation, this would be the actual processed video
      const processedMediaUrl = result.data.processedMedia.startsWith('processed_') 
        ? `blob:${window.location.origin}/${result.data.processedMedia}` 
        : URL.createObjectURL(new Blob([
            Uint8Array.from(atob(result.data.processedMedia), c => c.charCodeAt(0))
          ], { type: result.data.mimeType }))

      const finalResult: ProcessingResult = {
        success: true,
        processedMediaUrl,
        stats: result.data.stats
      }

      setLastResult(finalResult)
      setProcessingStep('Processing complete!')
      setProcessingProgress(100)

      // Auto-hide progress after delay
      setTimeout(() => {
        setProcessingStep('')
        setProcessingProgress(0)
      }, 2000)

      return finalResult

    } catch (error: any) {
      if (error.name === 'AbortError') {
        setProcessingStep('Processing cancelled')
      } else {
        console.error('❌ Professional processing failed:', error)
        setProcessingStep('Processing failed')
        
        const errorResult: ProcessingResult = {
          success: false,
          stats: {
            originalDuration: 0,
            finalDuration: 0,
            reductionPercentage: 0,
            segmentsRemoved: 0,
            silenceRemoved: 0,
            badTakesRemoved: 0
          },
          error: error.message
        }
        
        setLastResult(errorResult)
        return errorResult
      }
    } finally {
      setIsProcessing(false)
      abortControllerRef.current = null
    }

    return null
  }, [isProcessing, badTakeAnalysis])

  /**
   * Quick pause removal with smart defaults
   */
  const quickPauseRemoval = useCallback(async (
    uploadId: string,
    pace: 'slow' | 'normal' | 'fast' = 'normal'
  ) => {
    const paceSettings = {
      slow: { silenceThreshold: -30, minSilenceLength: 600, keepSilence: 300 },
      normal: { silenceThreshold: -35, minSilenceLength: 400, keepSilence: 200 },
      fast: { silenceThreshold: -40, minSilenceLength: 250, keepSilence: 100 }
    }

    return processMedia(uploadId, 'pauses', {
      ...paceSettings[pace],
      enableBadTakeDetection: false,
      processingQuality: 'fast'
    })
  }, [processMedia])

  /**
   * Smart bad take removal only
   */
  const removeBadTakesOnly = useCallback(async (uploadId: string) => {
    return processMedia(uploadId, 'bad_takes', {
      enableBadTakeDetection: true,
      processingQuality: 'balanced'
    })
  }, [processMedia])

  /**
   * Complete professional processing
   */
  const professionalEdit = useCallback(async (
    uploadId: string,
    customOptions?: Partial<ProcessingOptions>
  ) => {
    return processMedia(uploadId, 'complete', {
      ...customOptions,
      processingQuality: 'high'
    })
  }, [processMedia])

  /**
   * Cancel ongoing processing
   */
  const cancelProcessing = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [])

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setIsProcessing(false)
    setIsAnalyzing(false)
    setProcessingProgress(0)
    setProcessingStep('')
    setLastResult(null)
    setBadTakeAnalysis(null)
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [])

  /**
   * Get processing recommendations based on analysis
   */
  const getRecommendations = useCallback((analysis?: BadTakeAnalysis) => {
    const currentAnalysis = analysis || badTakeAnalysis
    if (!currentAnalysis) return []

    const recommendations: Array<{
      type: 'info' | 'success' | 'warning' | 'error'
      title: string
      description: string
      action?: string
    }> = []

    if (currentAnalysis.totalIssues === 0) {
      recommendations.push({
        type: 'success',
        title: 'Perfect Content!',
        description: 'Your content is already professionally clean with minimal editing needed.',
        action: 'Apply light processing for optimization'
      })
    } else if (currentAnalysis.totalIssues < 5) {
      recommendations.push({
        type: 'info',
        title: 'Minor Cleanup',
        description: `${currentAnalysis.totalIssues} small issues detected. Quick processing recommended.`,
        action: 'Apply quick cleanup'
      })
    } else if (currentAnalysis.totalIssues < 15) {
      recommendations.push({
        type: 'warning',
        title: 'Moderate Editing Needed',
        description: `${currentAnalysis.totalIssues} issues found. Professional processing will significantly improve quality.`,
        action: 'Apply professional editing'
      })
    } else {
      recommendations.push({
        type: 'error',
        title: 'Significant Editing Required',
        description: `${currentAnalysis.totalIssues} issues detected. Comprehensive processing highly recommended.`,
        action: 'Apply complete professional processing'
      })
    }

    // Add specific recommendations
    if (currentAnalysis.breakdown.fillers > 8) {
      recommendations.push({
        type: 'warning',
        title: 'Many Filler Words',
        description: `${currentAnalysis.breakdown.fillers} filler words detected. Removing these will create much more professional delivery.`,
        action: 'Focus on filler word removal'
      })
    }

    if (currentAnalysis.breakdown.repetitions > 3) {
      recommendations.push({
        type: 'info',
        title: 'Repetitive Content',
        description: `${currentAnalysis.breakdown.repetitions} repetitions found. Cleaning these will make your message more concise.`,
        action: 'Remove repetitive segments'
      })
    }

    if (currentAnalysis.potentialTimeReduction.percentage > 25) {
      recommendations.push({
        type: 'warning',
        title: 'Significant Time Savings',
        description: `Processing could reduce content by ${currentAnalysis.potentialTimeReduction.percentage.toFixed(1)}% (${currentAnalysis.potentialTimeReduction.seconds.toFixed(1)}s).`,
        action: 'Apply aggressive editing'
      })
    }

    return recommendations
  }, [badTakeAnalysis])

  return {
    // State
    isProcessing,
    isAnalyzing,
    processingProgress,
    processingStep,
    lastResult,
    badTakeAnalysis,
    
    // Actions
    analyzeBadTakes,
    processMedia,
    quickPauseRemoval,
    removeBadTakesOnly,
    professionalEdit,
    cancelProcessing,
    reset,
    getRecommendations,
    
    // Computed
    canProcess: !isProcessing && !isAnalyzing,
    hasAnalysis: !!badTakeAnalysis,
    hasResult: !!lastResult
  }
}
