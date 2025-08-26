// Core transcript types with timing information
export interface Word {
  word: string
  start: number // seconds
  end: number   // seconds
}

export interface Segment {
  start: number // seconds
  end: number   // seconds
  text: string
  confidence?: number
  words?: Word[]
}

export interface Transcript {
  text: string
  segments: Segment[]
  language?: string
  duration?: number
}

// Pause detection and classification
export interface Pause {
  start_ms: number
  end_ms: number
  duration_ms: number
  type: 'silence' | 'filler' | 'hesitation' | 'long_pause' | 'natural_break'
  confidence: number
  context?: string // What was happening before/after the pause
}

// Keep segment decisions with reasoning
export type KeepReason = 
  | 'script_match'        // Matches provided script content
  | 'dedupe_best_take'    // Best version when multiple takes exist
  | 'filler_trim'         // Filler words removed, content kept
  | 'pause_trim'          // Unnecessary pauses removed
  | 'ai_summary'          // AI determined this contains key information
  | 'high_confidence'     // High transcription confidence
  | 'natural_speech'      // Clear, natural speaking pattern
  | 'topic_relevant'      // Relevant to main topic/theme
  | 'transition_keep'     // Important transition between topics
  | 'fallback_keep'       // Kept due to fallback criteria

export interface KeepSegment {
  start_ms: number
  end_ms: number
  transcript: string
  confidence: number
  reason: KeepReason
  reasonDetails?: string // Human-readable explanation
  originalSegmentIndex?: number // Reference to original transcript segment
  scriptMatch?: {
    similarity: number
    matchedText: string
  }
}

// Policy configuration for decision making
export interface DecisionPolicy {
  // Confidence thresholds
  minConfidence: number
  strongConfidenceThreshold: number
  
  // Content filtering
  removeFiller: boolean
  removeHesitations: boolean
  removeLongPauses: boolean
  maxPauseDuration_ms: number
  
  // Script matching (if script provided)
  scriptMatchWeight: number
  semanticSimilarityThreshold: number
  allowPartialMatches: boolean
  
  // Deduplication
  enableDeduplication: boolean
  similarityThresholdForDupes: number
  preferLaterTakes: boolean
  
  // AI analysis
  useAISummary: boolean
  aiModel: string
  customInstructions?: string
  
  // Output preferences
  targetReductionPercentage?: number
  preserveTransitions: boolean
  maintainNaturalFlow: boolean
}

// Input for decision making process
export interface DecisionInput {
  transcript: Transcript
  scriptText?: string
  policy: DecisionPolicy
  metadata?: {
    videoId: string
    originalDuration_ms: number
    language?: string
    speakerInfo?: {
      name?: string
      role?: string
    }
  }
}

// Comprehensive decision output
export interface DecisionOutput {
  // Main results
  keepSegments: KeepSegment[]
  pauseList: Pause[]
  
  // Analysis metadata
  analysisMetadata: {
    timestamp: string
    model: string
    policyUsed: DecisionPolicy
    hasScript: boolean
    scriptLength: number
    transcriptLength: number
    processingTime_ms: number
  }
  
  // Decision statistics
  stats: {
    // Timing
    originalDuration_ms: number
    finalDuration_ms: number
    removedDuration_ms: number
    reductionPercentage: number
    
    // Segments
    totalSegments: number
    segmentsKept: number
    segmentsRemoved: number
    
    // Quality metrics
    averageConfidence: number
    lowConfidenceSegments: number
    
    // Content breakdown
    fillerWordsRemoved: number
    pausesRemoved: number
    duplicatesRemoved: number
    
    // Reasons breakdown
    reasonCounts: Record<KeepReason, number>
    
    // Script matching (if applicable)
    scriptMatchStats?: {
      perfectMatches: number
      partialMatches: number
      noMatches: number
      averageSimilarity: number
    }
  }
  
  // Warnings and recommendations
  warnings: string[]
  recommendations: string[]
  
  // Export formats
  edlContent?: string
  srtContent?: string
  
  // Quality assessment
  qualityAssessment: {
    overallScore: number // 0-1
    audioQuality: number
    speechClarity: number
    contentCoherence: number
    flowNaturalness: number
    issues: string[]
  }
}

// Extended types for video processing
export interface VideoProcessingOptions {
  outputQuality: 'low' | 'medium' | 'high'
  outputFormat: 'mp4' | 'webm' | 'mov'
  addSubtitles: boolean
  subtitleStyle?: {
    fontFamily: string
    fontSize: number
    fontColor: string
    backgroundColor: string
    position: 'top' | 'center' | 'bottom'
  }
  fadeInOut: boolean
  transitionDuration_ms: number
}

export interface VideoProcessingResult {
  success: boolean
  outputBuffer?: ArrayBuffer
  outputMimeType?: string
  outputFileName?: string
  processingStats: {
    inputSize_mb: number
    outputSize_mb: number
    compressionRatio: number
    processingTime_ms: number
  }
  error?: string
}

// Pipeline orchestration types
export interface PipelineConfig {
  uploadId: string
  scriptText?: string
  decisionPolicy?: Partial<DecisionPolicy>
  videoOptions?: VideoProcessingOptions
  generateFiles: boolean // EDL/SRT
  saveIntermediateResults: boolean
}

export interface PipelineResult {
  success: boolean
  decisionOutput: DecisionOutput
  videoResult?: VideoProcessingResult
  files?: {
    edl?: string
    srt?: string
  }
  error?: string
  debugInfo?: {
    transcriptionTime_ms: number
    analysisTime_ms: number
    videoProcessingTime_ms: number
    totalTime_ms: number
  }
}

// Legacy compatibility types (for existing codebase)
export interface ASRWord extends Word {}
export interface ASRSegment extends Segment {}
export interface PauseSegment extends Pause {}
export interface EditingDecision extends DecisionOutput {}

// Export utility type for reason validation
export const KEEP_REASONS: KeepReason[] = [
  'script_match',
  'dedupe_best_take', 
  'filler_trim',
  'pause_trim',
  'ai_summary',
  'high_confidence',
  'natural_speech',
  'topic_relevant',
  'transition_keep',
  'fallback_keep'
]

// Default policy configuration
export const DEFAULT_DECISION_POLICY: DecisionPolicy = {
  minConfidence: 0.6,
  strongConfidenceThreshold: 0.8,
  removeFiller: true,
  removeHesitations: true,
  removeLongPauses: true,
  maxPauseDuration_ms: 2000,
  scriptMatchWeight: 0.8,
  semanticSimilarityThreshold: 0.7,
  allowPartialMatches: true,
  enableDeduplication: true,
  similarityThresholdForDupes: 0.9,
  preferLaterTakes: true,
  useAISummary: true,
  aiModel: 'gpt-4o',
  preserveTransitions: true,
  maintainNaturalFlow: true
}

// Utility functions for type validation and creation
export function createKeepSegment(
  start_ms: number,
  end_ms: number,
  transcript: string,
  reason: KeepReason,
  confidence: number = 0.8,
  reasonDetails?: string
): KeepSegment {
  return {
    start_ms,
    end_ms,
    transcript,
    confidence,
    reason,
    reasonDetails
  }
}

export function createPause(
  start_ms: number,
  end_ms: number,
  type: Pause['type'],
  confidence: number = 0.8,
  context?: string
): Pause {
  return {
    start_ms,
    end_ms,
    duration_ms: end_ms - start_ms,
    type,
    confidence,
    context
  }
}

export function validateDecisionOutput(output: DecisionOutput): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Validate keep segments
  if (!output.keepSegments || !Array.isArray(output.keepSegments)) {
    errors.push('keepSegments must be an array')
  } else {
    output.keepSegments.forEach((segment, index) => {
      if (segment.start_ms >= segment.end_ms) {
        errors.push(`keepSegments[${index}]: start_ms must be less than end_ms`)
      }
      if (!KEEP_REASONS.includes(segment.reason)) {
        errors.push(`keepSegments[${index}]: invalid reason "${segment.reason}"`)
      }
      if (segment.confidence < 0 || segment.confidence > 1) {
        errors.push(`keepSegments[${index}]: confidence must be between 0 and 1`)
      }
    })
  }
  
  // Validate stats
  if (!output.stats) {
    errors.push('stats object is required')
  } else {
    if (output.stats.reductionPercentage < 0 || output.stats.reductionPercentage > 100) {
      errors.push('reductionPercentage must be between 0 and 100')
    }
    if (output.stats.segmentsKept + output.stats.segmentsRemoved !== output.stats.totalSegments) {
      errors.push('segments counts do not add up correctly')
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}
