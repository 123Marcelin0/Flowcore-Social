import type { EditDecisionList, EDLClip, AutoFixPass } from './edl-types'

/**
 * Auto-Fix Service for Video Processing
 * Provides automated fixes for common video editing issues
 */

export interface AutoFixOptions {
  enableSilenceTrimming: boolean
  enableMispronunciationDetection: boolean
  enableFillerRemoval: boolean
  silenceThreshold: number // seconds
  confidenceThreshold: number // 0-1
  aggressiveness: 'conservative' | 'balanced' | 'aggressive'
}

export interface AutoFixResult {
  success: boolean
  originalClipCount: number
  finalClipCount: number
  passesApplied: AutoFixPass[]
  statistics: {
    silenceSegmentsRemoved: number
    mispronunciationsMarked: number
    fillersRemoved: number
    timeReduced: number
  }
  error?: string
}

const DEFAULT_OPTIONS: AutoFixOptions = {
  enableSilenceTrimming: true,
  enableMispronunciationDetection: true,
  enableFillerRemoval: true,
  silenceThreshold: 0.3,
  confidenceThreshold: 0.6,
  aggressiveness: 'balanced'
}

/**
 * Apply auto-fix passes to an EDL
 */
export async function applyAutoFixPasses(
  edl: EditDecisionList,
  options: Partial<AutoFixOptions> = {}
): Promise<{ edl: EditDecisionList; result: AutoFixResult }> {
  
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const originalClipCount = edl.clips.length
  let processedClips = [...edl.clips]
  const passesApplied: AutoFixPass[] = []
  const statistics = {
    silenceSegmentsRemoved: 0,
    mispronunciationsMarked: 0,
    fillersRemoved: 0,
    timeReduced: 0
  }

  try {
    // Pass 1: Trim tiny silence segments
    if (opts.enableSilenceTrimming) {
      const { clips, pass, stats } = await applySilenceTrimming(processedClips, opts)
      processedClips = clips
      passesApplied.push(pass)
      statistics.silenceSegmentsRemoved = stats.removed
      statistics.timeReduced += stats.timeReduced
    }

    // Pass 2: Detect and mark mispronunciations
    if (opts.enableMispronunciationDetection) {
      const { clips, pass, stats } = await applyMispronunciationDetection(processedClips, opts)
      processedClips = clips
      passesApplied.push(pass)
      statistics.mispronunciationsMarked = stats.marked
    }

    // Pass 3: Remove filler words and phrases
    if (opts.enableFillerRemoval) {
      const { clips, pass, stats } = await applyFillerRemoval(processedClips, opts)
      processedClips = clips
      passesApplied.push(pass)
      statistics.fillersRemoved = stats.removed
      statistics.timeReduced += stats.timeReduced
    }

    // Update EDL with processed clips
    const finalDuration = processedClips.reduce((sum, clip) => sum + clip.duration, 0)
    const updatedEDL: EditDecisionList = {
      ...edl,
      clips: processedClips,
      autoFixPasses: [...edl.autoFixPasses, ...passesApplied],
      statistics: {
        ...edl.statistics,
        finalDuration,
        reductionPercentage: ((edl.statistics.originalDuration - finalDuration) / edl.statistics.originalDuration) * 100,
        clipsKept: processedClips.length,
        clipsRemoved: edl.statistics.clipsTotal - processedClips.length
      }
    }

    const result: AutoFixResult = {
      success: true,
      originalClipCount,
      finalClipCount: processedClips.length,
      passesApplied,
      statistics
    }

    return { edl: updatedEDL, result }

  } catch (error: any) {
    const result: AutoFixResult = {
      success: false,
      originalClipCount,
      finalClipCount: processedClips.length,
      passesApplied,
      statistics,
      error: error.message
    }

    return { edl, result }
  }
}

/**
 * Auto-fix pass: Trim tiny silence segments
 */
async function applySilenceTrimming(
  clips: EDLClip[],
  options: AutoFixOptions
): Promise<{ clips: EDLClip[]; pass: AutoFixPass; stats: { removed: number; timeReduced: number } }> {
  
  const threshold = options.silenceThreshold
  const aggressiveness = options.aggressiveness
  
  // Adjust threshold based on aggressiveness
  const adjustedThreshold = aggressiveness === 'conservative' ? threshold * 1.5 :
                           aggressiveness === 'aggressive' ? threshold * 0.7 : threshold

  let removed = 0
  let timeReduced = 0
  
  const processedClips = clips.filter(clip => {
    // Remove clips that are:
    // 1. Very short (likely silence)
    // 2. Marked as silence detected
    // 3. Have low confidence
    const isTinyClip = clip.duration < adjustedThreshold
    const isLowConfidence = clip.confidence < 0.4
    const isSilenceMarked = clip.silenceDetected
    
    const shouldRemove = isTinyClip && (isSilenceMarked || isLowConfidence)
    
    if (shouldRemove) {
      removed++
      timeReduced += clip.duration
      return false
    }
    
    return true
  })

  const pass: AutoFixPass = {
    type: 'silence_trim',
    enabled: true,
    confidence: 0.9,
    settings: {
      threshold: adjustedThreshold,
      aggressiveness: options.aggressiveness,
      removed,
      timeReduced
    }
  }

  return {
    clips: processedClips,
    pass,
    stats: { removed, timeReduced }
  }
}

/**
 * Auto-fix pass: Detect and mark suspected mispronunciations
 */
async function applyMispronunciationDetection(
  clips: EDLClip[],
  options: AutoFixOptions
): Promise<{ clips: EDLClip[]; pass: AutoFixPass; stats: { marked: number } }> {
  
  const confidenceThreshold = options.confidenceThreshold
  let marked = 0
  
  const processedClips = clips.map(clip => {
    // Mark clips with very low ASR confidence as potential mispronunciations
    const hasLowASRConfidence = clip.asrConfidence && clip.asrConfidence < confidenceThreshold
    const hasVeryLowConfidence = clip.confidence < 0.5
    
    if (hasLowASRConfidence || hasVeryLowConfidence) {
      marked++
      
      // Don't auto-delete unless very high confidence it's wrong
      const shouldAutoDelete = options.aggressiveness === 'aggressive' && 
                              clip.asrConfidence && 
                              clip.asrConfidence < 0.3
      
      if (shouldAutoDelete) {
        return null // Mark for removal
      }
      
      // Otherwise just mark for review
      return {
        ...clip,
        reason: `${clip.reason} [REVIEW: Potential mispronunciation - ASR confidence: ${((clip.asrConfidence || 0) * 100).toFixed(1)}%]`,
        confidence: Math.min(clip.confidence, 0.6) // Reduce confidence
      }
    }
    
    return clip
  }).filter(Boolean) as EDLClip[]

  const pass: AutoFixPass = {
    type: 'mispronunciation_detect',
    enabled: true,
    confidence: 0.8,
    settings: {
      confidenceThreshold,
      marked,
      autoDeletedCount: clips.length - processedClips.length
    }
  }

  return {
    clips: processedClips,
    pass,
    stats: { marked }
  }
}

/**
 * Auto-fix pass: Remove common filler words and phrases
 */
async function applyFillerRemoval(
  clips: EDLClip[],
  options: AutoFixOptions
): Promise<{ clips: EDLClip[]; pass: AutoFixPass; stats: { removed: number; timeReduced: number } }> {
  
  // Common filler words and phrases
  const fillerPatterns = [
    /^(um|uh|er|ah|hm|hmm|mm)$/i,
    /^(like|you know|i mean|basically|literally|actually)$/i,
    /^(so|well|okay|alright|right)$/i, // Only if very short clips
    /^(and|but|or)$/i // Only if isolated
  ]
  
  // Phrase-level fillers
  const fillerPhrases = [
    /^you know what$/i,
    /^i mean like$/i,
    /^kind of like$/i,
    /^sort of$/i,
    /^you see$/i
  ]
  
  let removed = 0
  let timeReduced = 0
  
  const processedClips = clips.filter(clip => {
    const text = (clip.originalText || '').trim().toLowerCase()
    
    // Skip if no text
    if (!text) return true
    
    // Check for filler patterns
    const isFiller = fillerPatterns.some(pattern => pattern.test(text)) ||
                    fillerPhrases.some(pattern => pattern.test(text))
    
    // Additional checks for context
    const isVeryShort = clip.duration < 0.8
    const isLowConfidence = clip.confidence < 0.6
    
    // Be more aggressive with obvious fillers
    const shouldRemove = isFiller && (
      options.aggressiveness === 'aggressive' ||
      (options.aggressiveness === 'balanced' && isVeryShort) ||
      (options.aggressiveness === 'conservative' && isVeryShort && isLowConfidence)
    )
    
    if (shouldRemove) {
      removed++
      timeReduced += clip.duration
      return false
    }
    
    return true
  })

  const pass: AutoFixPass = {
    type: 'filler_removal',
    enabled: true,
    confidence: 0.85,
    settings: {
      aggressiveness: options.aggressiveness,
      removed,
      timeReduced,
      patterns: fillerPatterns.length + fillerPhrases.length
    }
  }

  return {
    clips: processedClips,
    pass,
    stats: { removed, timeReduced }
  }
}

/**
 * Get auto-fix recommendations based on EDL analysis
 */
export function getAutoFixRecommendations(edl: EditDecisionList): Array<{
  type: 'info' | 'warning' | 'success'
  title: string
  description: string
  action: string
}> {
  const recommendations = []
  
  // Analyze silence segments
  const silenceClips = edl.clips.filter(clip => clip.silenceDetected)
  if (silenceClips.length > 5) {
    recommendations.push({
      type: 'warning' as const,
      title: 'Many Silence Segments',
      description: `${silenceClips.length} silence segments detected. Auto-trimming could improve pacing.`,
      action: 'Apply silence trimming'
    })
  }
  
  // Analyze low confidence clips
  const lowConfidenceClips = edl.clips.filter(clip => clip.asrConfidence && clip.asrConfidence < 0.6)
  if (lowConfidenceClips.length > 3) {
    recommendations.push({
      type: 'info' as const,
      title: 'Low Confidence Segments',
      description: `${lowConfidenceClips.length} segments have low ASR confidence. Review recommended.`,
      action: 'Apply mispronunciation detection'
    })
  }
  
  // Analyze potential fillers
  const potentialFillers = edl.clips.filter(clip => {
    const text = (clip.originalText || '').trim().toLowerCase()
    return /^(um|uh|like|you know)/.test(text) && clip.duration < 1.0
  })
  
  if (potentialFillers.length > 8) {
    recommendations.push({
      type: 'warning' as const,
      title: 'Many Filler Words',
      description: `${potentialFillers.length} potential filler words detected. Removal will improve flow.`,
      action: 'Apply filler removal'
    })
  }
  
  // Overall quality assessment
  const avgConfidence = edl.clips.reduce((sum, clip) => sum + clip.confidence, 0) / edl.clips.length
  if (avgConfidence > 0.8) {
    recommendations.push({
      type: 'success' as const,
      title: 'High Quality Content',
      description: 'Your content has high confidence scores. Light auto-fixing recommended.',
      action: 'Apply conservative auto-fix'
    })
  }
  
  return recommendations
}



















