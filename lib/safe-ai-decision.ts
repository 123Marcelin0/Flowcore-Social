/**
 * Safe AI Decision Handler
 * Provides defensive handling for AI responses to prevent TypeErrors and ensure consistent structure
 */

export interface KeepSegment {
  start: number
  end: number
  score: number
  reason?: string
}

export interface RemoveSegment {
  start: number
  end: number
  reason: string
  confidence?: number
}

export interface EditStatistics {
  originalDuration: number
  finalDuration: number
  reductionPercentage: number
  silenceRemoved: number
  fillersRemoved: number
  badTakesRemoved: number
  scriptDeviations: number
}

export interface SafeAIDecision {
  keepSegments: KeepSegment[]
  removeSegments: RemoveSegment[]
  statistics: EditStatistics
  qualityScore: number
  recommendations: string[]
  confidence: number
  processingMetadata: {
    model: string
    requestId: string
    processingTimeMs: number
    fallbackUsed: boolean
    rawResponseLength?: number
    validationErrors?: string[]
  }
}

/**
 * Creates a safe default AI decision structure
 */
export function createDefaultAIDecision(overrides: Partial<SafeAIDecision> = {}): SafeAIDecision {
  return {
    keepSegments: [],
    removeSegments: [],
    statistics: {
      originalDuration: 0,
      finalDuration: 0,
      reductionPercentage: 0,
      silenceRemoved: 0,
      fillersRemoved: 0,
      badTakesRemoved: 0,
      scriptDeviations: 0
    },
    qualityScore: 0.5,
    recommendations: [],
    confidence: 0.0,
    processingMetadata: {
      model: 'fallback',
      requestId: 'unknown',
      processingTimeMs: 0,
      fallbackUsed: true
    },
    ...overrides
  }
}

/**
 * Safely parses JSON with error handling
 */
export function safeJsonParse<T = any>(jsonString: string, fallback: T | null = null): T | null {
  if (!jsonString || typeof jsonString !== 'string') {
    return fallback
  }
  
  try {
    return JSON.parse(jsonString) as T
  } catch (error) {
    console.warn('Failed to parse JSON:', error, 'Input:', jsonString.substring(0, 200))
    return fallback
  }
}

/**
 * Validates and normalizes an AI decision response
 */
export function normalizeAIDecision(
  rawDecision: any,
  requestId: string,
  model: string = 'unknown',
  processingTimeMs: number = 0
): SafeAIDecision {
  const validationErrors: string[] = []
  
  // Ensure basic structure exists
  if (!rawDecision || typeof rawDecision !== 'object') {
    validationErrors.push('Raw decision is not an object')
    return createDefaultAIDecision({
      processingMetadata: {
        model,
        requestId,
        processingTimeMs,
        fallbackUsed: true,
        validationErrors
      }
    })
  }
  
  // Validate and normalize keepSegments
  let keepSegments: KeepSegment[] = []
  if (Array.isArray(rawDecision.keepSegments)) {
    keepSegments = rawDecision.keepSegments
      .filter((seg: any) => seg && typeof seg === 'object')
      .map((seg: any) => ({
        start: typeof seg.start === 'number' ? seg.start : 0,
        end: typeof seg.end === 'number' ? seg.end : 0,
        score: typeof seg.score === 'number' ? seg.score : 0.5,
        reason: typeof seg.reason === 'string' ? seg.reason : undefined
      }))
      .filter((seg: KeepSegment) => seg.start >= 0 && seg.end > seg.start)
  } else if (rawDecision.keepSegments !== undefined) {
    validationErrors.push('keepSegments is not an array')
  }
  
  // Validate and normalize removeSegments
  let removeSegments: RemoveSegment[] = []
  if (Array.isArray(rawDecision.removeSegments)) {
    removeSegments = rawDecision.removeSegments
      .filter((seg: any) => seg && typeof seg === 'object')
      .map((seg: any) => ({
        start: typeof seg.start === 'number' ? seg.start : 0,
        end: typeof seg.end === 'number' ? seg.end : 0,
        reason: typeof seg.reason === 'string' ? seg.reason : 'unknown',
        confidence: typeof seg.confidence === 'number' ? seg.confidence : 0.5
      }))
      .filter((seg: RemoveSegment) => seg.start >= 0 && seg.end > seg.start)
  } else if (rawDecision.removeSegments !== undefined) {
    validationErrors.push('removeSegments is not an array')
  }
  
  // Validate and normalize statistics
  const rawStats = rawDecision.statistics || {}
  const statistics: EditStatistics = {
    originalDuration: typeof rawStats.originalDuration === 'number' ? rawStats.originalDuration : 0,
    finalDuration: typeof rawStats.finalDuration === 'number' ? rawStats.finalDuration : 0,
    reductionPercentage: typeof rawStats.reductionPercentage === 'number' ? 
      Math.max(0, Math.min(100, rawStats.reductionPercentage)) : 0,
    silenceRemoved: typeof rawStats.silenceRemoved === 'number' ? rawStats.silenceRemoved : 0,
    fillersRemoved: typeof rawStats.fillersRemoved === 'number' ? rawStats.fillersRemoved : 0,
    badTakesRemoved: typeof rawStats.badTakesRemoved === 'number' ? rawStats.badTakesRemoved : 0,
    scriptDeviations: typeof rawStats.scriptDeviations === 'number' ? rawStats.scriptDeviations : 0
  }
  
  // Validate other fields
  const qualityScore = typeof rawDecision.qualityScore === 'number' ? 
    Math.max(0, Math.min(1, rawDecision.qualityScore)) : 0.5
  
  const recommendations = Array.isArray(rawDecision.recommendations) ?
    rawDecision.recommendations
      .filter((r: any) => typeof r === 'string')
      .slice(0, 10) : // Limit to prevent spam
    []
  
  const confidence = typeof rawDecision.confidence === 'number' ?
    Math.max(0, Math.min(1, rawDecision.confidence)) : 0.5
  
  return {
    keepSegments,
    removeSegments,
    statistics,
    qualityScore,
    recommendations,
    confidence,
    processingMetadata: {
      model,
      requestId,
      processingTimeMs,
      fallbackUsed: validationErrors.length > 0,
      rawResponseLength: JSON.stringify(rawDecision).length,
      validationErrors: validationErrors.length > 0 ? validationErrors : undefined
    }
  }
}

/**
 * Safely logs an AI decision without causing errors
 */
export function safeLogDecision(decision: any, context: string = ''): void {
  try {
    const normalized = typeof decision === 'object' && decision !== null ? decision : {}
    
    console.info({
      event: 'ai_decision_log',
      context,
      keepSegmentsCount: Array.isArray(normalized.keepSegments) ? normalized.keepSegments.length : 0,
      removeSegmentsCount: Array.isArray(normalized.removeSegments) ? normalized.removeSegments.length : 0,
      qualityScore: typeof normalized.qualityScore === 'number' ? normalized.qualityScore : 'unknown',
      confidence: typeof normalized.confidence === 'number' ? normalized.confidence : 'unknown',
      hasStatistics: !!(normalized.statistics && typeof normalized.statistics === 'object'),
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.warn('Failed to log AI decision safely:', error)
  }
}

/**
 * Merges AI decision with fallback heuristics
 */
export function mergeWithFallback(
  aiDecision: SafeAIDecision,
  fallbackSegments: any[],
  originalDuration: number = 0
): SafeAIDecision {
  // If AI decision is low confidence or has no segments, merge with fallback
  if (aiDecision.confidence < 0.3 || (aiDecision.keepSegments.length === 0 && aiDecision.removeSegments.length === 0)) {
    console.info('Merging low-confidence AI decision with fallback heuristics')
    
    // Convert fallback segments to keep segments
    const fallbackKeepSegments: KeepSegment[] = fallbackSegments
      .filter(seg => seg && typeof seg.start === 'number' && typeof seg.end === 'number')
      .map((seg, index) => ({
        start: seg.start,
        end: seg.end,
        score: 0.7, // Default score for fallback
        reason: `fallback_segment_${index}`
      }))
    
    return {
      ...aiDecision,
      keepSegments: [...aiDecision.keepSegments, ...fallbackKeepSegments],
      statistics: {
        ...aiDecision.statistics,
        originalDuration: originalDuration || aiDecision.statistics.originalDuration,
        finalDuration: fallbackKeepSegments.reduce((sum, seg) => sum + (seg.end - seg.start), 0)
      },
      processingMetadata: {
        ...aiDecision.processingMetadata,
        fallbackUsed: true
      }
    }
  }
  
  return aiDecision
}

/**
 * Creates a correlation ID for request tracking
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Validates timing consistency in segments
 */
export function validateSegmentTiming(segments: (KeepSegment | RemoveSegment)[]): string[] {
  const errors: string[] = []
  
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    
    // Check basic timing
    if (seg.start >= seg.end) {
      errors.push(`Segment ${i}: start (${seg.start}) must be less than end (${seg.end})`)
    }
    
    if (seg.start < 0) {
      errors.push(`Segment ${i}: start time cannot be negative (${seg.start})`)
    }
    
    // Check overlap with next segment
    if (i < segments.length - 1) {
      const nextSeg = segments[i + 1]
      if (seg.end > nextSeg.start) {
        errors.push(`Segments ${i} and ${i + 1}: overlap detected (${seg.end} > ${nextSeg.start})`)
      }
    }
  }
  
  return errors
}