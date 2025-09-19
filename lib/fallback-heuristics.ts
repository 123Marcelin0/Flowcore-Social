/**
 * Fallback Heuristics and Merging System
 * Provides local analysis and merges with AI decisions when needed
 */

import { generateSubtitlesFromScript } from './video-editor'
import { SafeAIDecision, KeepSegment, RemoveSegment, createDefaultAIDecision } from './safe-ai-decision'
import { logger } from './structured-logger'

export interface LocalHeuristics {
  silenceSegments: Array<{ start: number; end: number; confidence: number }>
  fillerWords: Array<{ start: number; end: number; word: string; confidence: number }>
  lowConfidenceSegments: Array<{ start: number; end: number; avgConfidence: number }>
  pauseAnalysis: {
    shortPauses: number
    mediumPauses: number
    longPauses: number
    averagePauseLength: number
  }
  readingSpeed: {
    averageCps: number
    segments: Array<{ start: number; end: number; cps: number }>
  }
  processingMetadata: {
    processingTimeMs: number
    methodsUsed: string[]
    totalSegments: number
    totalWords: number
  }
}

export interface HeuristicOptions {
  minConfidenceThreshold: number
  longPauseThreshold: number // seconds
  maxReadingCps: number
  minReadingCps: number
  fillerWordList: string[]
  aggressiveness: 'conservative' | 'balanced' | 'aggressive'
}

const DEFAULT_OPTIONS: HeuristicOptions = {
  minConfidenceThreshold: 0.6,
  longPauseThreshold: 0.8,
  maxReadingCps: 20,
  minReadingCps: 8,
  fillerWordList: [
    'um', 'uh', 'ah', 'er', 'like', 'you know', 'so', 'actually', 
    'basically', 'literally', 'totally', 'really', 'very', 'just',
    'kind of', 'sort of', 'I mean', 'well', 'okay', 'right'
  ],
  aggressiveness: 'balanced'
}

/**
 * Analyzes transcript segments using local heuristics
 */
export function analyzeWithLocalHeuristics(
  segments: any[],
  options: Partial<HeuristicOptions> = {}
): LocalHeuristics {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const startTime = Date.now()
  
  const heuristicLogger = logger.child({
    requestId: logger.generateRequestId(),
    operation: 'local_heuristics',
    component: 'fallback-system'
  })
  
  heuristicLogger.info('heuristics_analysis_start', {
    segmentCount: segments.length,
    options: opts
  })
  
  const methodsUsed: string[] = []
  
  // Analyze silence segments
  const silenceSegments = findSilenceSegments(segments, opts.longPauseThreshold)
  methodsUsed.push('silence_detection')
  
  // Analyze filler words
  const fillerWords = findFillerWords(segments, opts.fillerWordList)
  methodsUsed.push('filler_detection')
  
  // Analyze low confidence segments
  const lowConfidenceSegments = findLowConfidenceSegments(segments, opts.minConfidenceThreshold)
  methodsUsed.push('confidence_analysis')
  
  // Analyze pauses
  const pauseAnalysis = analyzePauses(segments)
  methodsUsed.push('pause_analysis')
  
  // Analyze reading speed
  const readingSpeed = analyzeReadingSpeed(segments)
  methodsUsed.push('reading_speed_analysis')
  
  const processingTime = Date.now() - startTime
  
  const heuristics: LocalHeuristics = {
    silenceSegments,
    fillerWords,
    lowConfidenceSegments,
    pauseAnalysis,
    readingSpeed,
    processingMetadata: {
      processingTimeMs: processingTime,
      methodsUsed,
      totalSegments: segments.length,
      totalWords: segments.reduce((sum, seg) => sum + (seg.words?.length || 0), 0)
    }
  }
  
  heuristicLogger.performance('heuristics_analysis_completed', startTime, {
    silenceSegmentsFound: silenceSegments.length,
    fillerWordsFound: fillerWords.length,
    lowConfidenceSegmentsFound: lowConfidenceSegments.length,
    methodsUsed
  })
  
  return heuristics
}

/**
 * Merges AI decision with local heuristics intelligently
 */
export function intelligentMerge(
  aiDecision: SafeAIDecision,
  localHeuristics: LocalHeuristics,
  originalSegments: any[],
  options: Partial<HeuristicOptions> = {}
): SafeAIDecision {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const mergeLogger = logger.child({
    requestId: logger.generateRequestId(),
    operation: 'intelligent_merge',
    component: 'fallback-system'
  })
  
  mergeLogger.info('merge_start', {
    aiConfidence: aiDecision.confidence,
    aiKeepSegments: aiDecision.keepSegments.length,
    aiRemoveSegments: aiDecision.removeSegments.length,
    localMethodsUsed: localHeuristics.processingMetadata.methodsUsed,
    aggressiveness: opts.aggressiveness
  })
  
  // Decision strategy based on AI confidence and local analysis
  const strategy = determineMergeStrategy(aiDecision, localHeuristics, opts)
  mergeLogger.info('merge_strategy_selected', { strategy })
  
  switch (strategy) {
    case 'trust_ai':
      return enhanceAIDecisionWithLocalInsights(aiDecision, localHeuristics, mergeLogger)
    
    case 'merge_conservative':
      return conservativeMerge(aiDecision, localHeuristics, originalSegments, mergeLogger)
    
    case 'merge_aggressive':
      return aggressiveMerge(aiDecision, localHeuristics, originalSegments, mergeLogger)
    
    case 'fallback_only':
      return createFallbackDecision(localHeuristics, originalSegments, mergeLogger)
    
    default:
      return aiDecision
  }
}

function determineMergeStrategy(
  aiDecision: SafeAIDecision,
  localHeuristics: LocalHeuristics,
  options: HeuristicOptions
): 'trust_ai' | 'merge_conservative' | 'merge_aggressive' | 'fallback_only' {
  // High confidence AI with reasonable results
  if (aiDecision.confidence > 0.8 && aiDecision.keepSegments.length > 0) {
    return 'trust_ai'
  }
  
  // Low confidence AI - rely more on local heuristics
  if (aiDecision.confidence < 0.3) {
    return 'fallback_only'
  }
  
  // Medium confidence - merge based on aggressiveness
  if (options.aggressiveness === 'aggressive') {
    return 'merge_aggressive'
  } else {
    return 'merge_conservative'
  }
}

function enhanceAIDecisionWithLocalInsights(
  aiDecision: SafeAIDecision,
  localHeuristics: LocalHeuristics,
  logger: any
): SafeAIDecision {
  // Add local insights as additional remove segments if they're not already covered
  const additionalRemoveSegments: RemoveSegment[] = []
  
  // Add high-confidence silence segments that AI might have missed
  for (const silence of localHeuristics.silenceSegments) {
    if (silence.confidence > 0.9 && !isSegmentCovered(silence, aiDecision.removeSegments)) {
      additionalRemoveSegments.push({
        start: silence.start,
        end: silence.end,
        reason: 'silence_detected_locally',
        confidence: silence.confidence
      })
    }
  }
  
  // Add obvious filler words
  for (const filler of localHeuristics.fillerWords) {
    if (filler.confidence > 0.8 && !isSegmentCovered(filler, aiDecision.removeSegments)) {
      additionalRemoveSegments.push({
        start: filler.start,
        end: filler.end,
        reason: `filler_word: ${filler.word}`,
        confidence: filler.confidence
      })
    }
  }
  
  logger.info('ai_decision_enhanced', {
    additionalRemoveSegments: additionalRemoveSegments.length
  })
  
  return {
    ...aiDecision,
    removeSegments: [...aiDecision.removeSegments, ...additionalRemoveSegments],
    processingMetadata: {
      ...aiDecision.processingMetadata,
      fallbackUsed: additionalRemoveSegments.length > 0
    }
  }
}

function conservativeMerge(
  aiDecision: SafeAIDecision,
  localHeuristics: LocalHeuristics,
  originalSegments: any[],
  logger: any
): SafeAIDecision {
  // Use AI decisions as primary, supplement with high-confidence local findings
  const mergedKeepSegments = [...aiDecision.keepSegments]
  const mergedRemoveSegments = [...aiDecision.removeSegments]
  
  // Only add local remove segments if they have very high confidence
  for (const silence of localHeuristics.silenceSegments) {
    if (silence.confidence > 0.95 && !isSegmentCovered(silence, mergedRemoveSegments)) {
      mergedRemoveSegments.push({
        start: silence.start,
        end: silence.end,
        reason: 'high_confidence_silence',
        confidence: silence.confidence
      })
    }
  }
  
  // If AI didn't provide keep segments, generate from local analysis
  if (mergedKeepSegments.length === 0) {
    const fallbackKeepSegments = generateKeepSegmentsFromHeuristics(
      localHeuristics, 
      originalSegments, 
      'conservative'
    )
    mergedKeepSegments.push(...fallbackKeepSegments)
  }
  
  logger.info('conservative_merge_completed', {
    originalKeepSegments: aiDecision.keepSegments.length,
    originalRemoveSegments: aiDecision.removeSegments.length,
    mergedKeepSegments: mergedKeepSegments.length,
    mergedRemoveSegments: mergedRemoveSegments.length
  })
  
  return {
    ...aiDecision,
    keepSegments: mergedKeepSegments,
    removeSegments: mergedRemoveSegments,
    confidence: Math.min(aiDecision.confidence + 0.1, 1.0), // Slight confidence boost
    processingMetadata: {
      ...aiDecision.processingMetadata,
      fallbackUsed: true
    }
  }
}

function aggressiveMerge(
  aiDecision: SafeAIDecision,
  localHeuristics: LocalHeuristics,
  originalSegments: any[],
  logger: any
): SafeAIDecision {
  // Combine AI and local heuristics more aggressively
  const mergedRemoveSegments = [...aiDecision.removeSegments]
  
  // Add all moderate-confidence local findings
  for (const silence of localHeuristics.silenceSegments) {
    if (silence.confidence > 0.7 && !isSegmentCovered(silence, mergedRemoveSegments)) {
      mergedRemoveSegments.push({
        start: silence.start,
        end: silence.end,
        reason: 'moderate_confidence_silence',
        confidence: silence.confidence
      })
    }
  }
  
  for (const filler of localHeuristics.fillerWords) {
    if (filler.confidence > 0.6 && !isSegmentCovered(filler, mergedRemoveSegments)) {
      mergedRemoveSegments.push({
        start: filler.start,
        end: filler.end,
        reason: `filler_word: ${filler.word}`,
        confidence: filler.confidence
      })
    }
  }
  
  for (const lowConf of localHeuristics.lowConfidenceSegments) {
    if (!isSegmentCovered(lowConf, mergedRemoveSegments)) {
      mergedRemoveSegments.push({
        start: lowConf.start,
        end: lowConf.end,
        reason: `low_confidence: ${lowConf.avgConfidence.toFixed(2)}`,
        confidence: 1 - lowConf.avgConfidence
      })
    }
  }
  
  logger.info('aggressive_merge_completed', {
    additionalRemoveSegments: mergedRemoveSegments.length - aiDecision.removeSegments.length
  })
  
  return {
    ...aiDecision,
    removeSegments: mergedRemoveSegments,
    processingMetadata: {
      ...aiDecision.processingMetadata,
      fallbackUsed: true
    }
  }
}

function createFallbackDecision(
  localHeuristics: LocalHeuristics,
  originalSegments: any[],
  logger: any
): SafeAIDecision {
  logger.info('creating_fallback_decision', {
    originalSegments: originalSegments.length
  })
  
  // Create decision based purely on local heuristics
  const removeSegments: RemoveSegment[] = []
  
  // Add all local findings
  localHeuristics.silenceSegments.forEach(silence => {
    removeSegments.push({
      start: silence.start,
      end: silence.end,
      reason: 'fallback_silence',
      confidence: silence.confidence
    })
  })
  
  localHeuristics.fillerWords.forEach(filler => {
    removeSegments.push({
      start: filler.start,
      end: filler.end,
      reason: `fallback_filler: ${filler.word}`,
      confidence: filler.confidence
    })
  })
  
  localHeuristics.lowConfidenceSegments.forEach(lowConf => {
    removeSegments.push({
      start: lowConf.start,
      end: lowConf.end,
      reason: 'fallback_low_confidence',
      confidence: 1 - lowConf.avgConfidence
    })
  })
  
  // Generate keep segments from remaining content
  const keepSegments = generateKeepSegmentsFromHeuristics(
    localHeuristics,
    originalSegments,
    'balanced'
  )
  
  const totalDuration = originalSegments.reduce((sum, seg) => 
    sum + (seg.end - seg.start), 0
  )
  const removedDuration = removeSegments.reduce((sum, seg) => 
    sum + (seg.end - seg.start), 0
  )
  
  logger.info('fallback_decision_created', {
    keepSegments: keepSegments.length,
    removeSegments: removeSegments.length,
    reductionPercentage: (removedDuration / totalDuration) * 100
  })
  
  return createDefaultAIDecision({
    keepSegments,
    removeSegments,
    statistics: {
      originalDuration: totalDuration,
      finalDuration: totalDuration - removedDuration,
      reductionPercentage: (removedDuration / totalDuration) * 100,
      silenceRemoved: localHeuristics.silenceSegments.length,
      fillersRemoved: localHeuristics.fillerWords.length,
      badTakesRemoved: localHeuristics.lowConfidenceSegments.length,
      scriptDeviations: 0
    },
    confidence: 0.6, // Moderate confidence for local-only decision
    qualityScore: 0.7,
    processingMetadata: {
      model: 'local_heuristics',
      requestId: logger.generateRequestId(),
      processingTimeMs: localHeuristics.processingMetadata.processingTimeMs,
      fallbackUsed: true
    }
  })
}

// Helper functions
function isSegmentCovered(
  segment: { start: number; end: number },
  existingSegments: Array<{ start: number; end: number }>
): boolean {
  return existingSegments.some(existing => 
    segment.start >= existing.start && segment.end <= existing.end
  )
}

function findSilenceSegments(
  segments: any[],
  threshold: number
): Array<{ start: number; end: number; confidence: number }> {
  const silenceSegments: Array<{ start: number; end: number; confidence: number }> = []
  
  for (let i = 0; i < segments.length - 1; i++) {
    const current = segments[i]
    const next = segments[i + 1]
    
    if (current.end && next.start) {
      const gap = next.start - current.end
      if (gap >= threshold) {
        silenceSegments.push({
          start: current.end,
          end: next.start,
          confidence: Math.min(gap / threshold, 1.0)
        })
      }
    }
  }
  
  return silenceSegments
}

function findFillerWords(
  segments: any[],
  fillerWordList: string[]
): Array<{ start: number; end: number; word: string; confidence: number }> {
  const fillerWords: Array<{ start: number; end: number; word: string; confidence: number }> = []
  
  for (const segment of segments) {
    if (segment.words && Array.isArray(segment.words)) {
      for (const word of segment.words) {
        const cleanWord = word.word?.toLowerCase().trim()
        if (cleanWord && fillerWordList.includes(cleanWord)) {
          fillerWords.push({
            start: word.start,
            end: word.end,
            word: cleanWord,
            confidence: 0.8 // Default confidence for filler detection
          })
        }
      }
    }
  }
  
  return fillerWords
}

function findLowConfidenceSegments(
  segments: any[],
  threshold: number
): Array<{ start: number; end: number; avgConfidence: number }> {
  const lowConfidenceSegments: Array<{ start: number; end: number; avgConfidence: number }> = []
  
  for (const segment of segments) {
    const confidence = segment.confidence || 0.9
    if (confidence < threshold) {
      lowConfidenceSegments.push({
        start: segment.start,
        end: segment.end,
        avgConfidence: confidence
      })
    }
  }
  
  return lowConfidenceSegments
}

function analyzePauses(segments: any[]) {
  let shortPauses = 0
  let mediumPauses = 0
  let longPauses = 0
  let totalPauseTime = 0
  
  for (let i = 0; i < segments.length - 1; i++) {
    const gap = segments[i + 1].start - segments[i].end
    if (gap > 0.1) { // Minimum pause threshold
      totalPauseTime += gap
      if (gap < 0.5) shortPauses++
      else if (gap < 1.0) mediumPauses++
      else longPauses++
    }
  }
  
  const totalPauses = shortPauses + mediumPauses + longPauses
  
  return {
    shortPauses,
    mediumPauses,
    longPauses,
    averagePauseLength: totalPauses > 0 ? totalPauseTime / totalPauses : 0
  }
}

function analyzeReadingSpeed(segments: any[]) {
  const speedSegments: Array<{ start: number; end: number; cps: number }> = []
  let totalCps = 0
  
  for (const segment of segments) {
    const duration = segment.end - segment.start
    const textLength = segment.text?.length || 0
    if (duration > 0 && textLength > 0) {
      const cps = textLength / duration
      speedSegments.push({
        start: segment.start,
        end: segment.end,
        cps
      })
      totalCps += cps
    }
  }
  
  return {
    averageCps: speedSegments.length > 0 ? totalCps / speedSegments.length : 0,
    segments: speedSegments
  }
}

function generateKeepSegmentsFromHeuristics(
  heuristics: LocalHeuristics,
  originalSegments: any[],
  strategy: 'conservative' | 'balanced' | 'aggressive'
): KeepSegment[] {
  // Simple implementation - keep segments that aren't flagged for removal
  const keepSegments: KeepSegment[] = []
  
  for (const segment of originalSegments) {
    let shouldKeep = true
    let score = 0.5
    
    // Check if segment overlaps with remove candidates
    for (const silence of heuristics.silenceSegments) {
      if (segment.start < silence.end && segment.end > silence.start) {
        shouldKeep = false
        break
      }
    }
    
    if (shouldKeep) {
      // Calculate score based on confidence and reading speed
      score = segment.confidence || 0.5
      
      // Boost score for good reading speed
      const cps = heuristics.readingSpeed.segments.find(s => 
        s.start <= segment.start && s.end >= segment.end
      )?.cps || 0
      
      if (cps >= 12 && cps <= 17) {
        score += 0.2
      }
      
      keepSegments.push({
        start: segment.start,
        end: segment.end,
        score: Math.min(score, 1.0),
        reason: 'heuristic_analysis'
      })
    }
  }
  
  return keepSegments
}