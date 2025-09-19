import { 
  CutPlan, 
  Segment, 
  Transform, 
  AudioAdjustment,
  QualityMetrics,
  validateCutPlan,
  createBasicSegment,
  createTransform,
  createQualityMetrics
} from '@/lib/schemas/cutPlan'
import { CleanTransform } from '@/lib/clean-transforms'

// Input signals interface - what you'll feed in from earlier steps
export interface ProcessingSignals {
  uploadId: string
  sourceFile: string
  sourceMetadata: {
    duration: number
    resolution: { width: number; height: number }
    fps: number
    bitrate?: number
    codec?: string
  }
  
  // Transcription data
  asrSegments: Array<{
    start: number
    end: number
    text: string
    confidence: number
    words?: Array<{
      start: number
      end: number
      word: string
      confidence: number
    }>
    speaker?: string
  }>
  
  // Analysis results from earlier steps
  silenceRegions: Array<{
    start: number
    end: number
    duration: number
    confidence: number
  }>
  
  fillerDetections: Array<{
    start: number
    end: number
    word: string
    confidence: number
    severity: 'low' | 'medium' | 'high'
  }>
  
  werAnalysis?: Array<{
    segmentStart: number
    segmentEnd: number
    werScore: number
    errors: Array<{
      type: 'insertion' | 'deletion' | 'substitution'
      position: number
      expected?: string
      actual?: string
    }>
  }>
  
  confidenceAnalysis: Array<{
    start: number
    end: number
    confidence: number
    reason: string
  }>
  
  // MediaPipe transforms (if available)
  mediapipeTransforms?: CleanTransform[]
  
  // Auto-zoom transforms (if available) 
  autoZoomTransforms?: Array<{
    timestamp: number
    duration: number
    scale: number
    x: number
    y: number
    easing: string
    confidence: number
  }>
  
  // AI analysis results
  aiAnalysis?: {
    keepSegments: Array<{
      start: number
      end: number
      reason: string
      confidence: number
    }>
    removeSegments: Array<{
      start: number
      end: number
      reason: string
      confidence: number
    }>
    qualityScore: number
    recommendations: string[]
  }
  
  // Processing options
  options: {
    targetFormat: 'instagram_reels' | 'youtube_shorts' | 'tiktok' | 'youtube_landscape' | 'custom'
    targetDuration?: number
    aggressiveness: number // 0-1
    preserveNaturalPauses: boolean
    removeFillerWords: boolean
    autoFixMistakes: boolean
    enableAutoZoom: boolean
    enableMediaPipe: boolean
    optimizeForEngagement: boolean
  }
}

/**
 * Main function to generate a validated CutPlan from processing signals
 */
export async function generateCutPlan(signals: ProcessingSignals): Promise<CutPlan> {
  console.log(`🎬 Generating CutPlan for upload: ${signals.uploadId}`)
  
  const startTime = Date.now()
  
  try {
    // Step 1: Analyze and score all segments
    const scoredSegments = analyzeAndScoreSegments(signals)
    console.log(`📊 Analyzed ${scoredSegments.length} segments`)
    
    // Step 2: Make cutting decisions based on signals
    const cuttingDecisions = makeCuttingDecisions(scoredSegments, signals)
    console.log(`✂️ Made cutting decisions: ${cuttingDecisions.keep.length} keep, ${cuttingDecisions.remove.length} remove`)
    
    // Step 3: Generate segments with transforms
    const segments = generateSegments(cuttingDecisions, signals)
    console.log(`🎯 Generated ${segments.length} final segments`)
    
    // Step 4: Calculate quality metrics
    const qualityMetrics = calculateQualityMetrics(segments, signals)
    
    // Step 5: Generate audio adjustments
    const audioAdjustments = generateAudioAdjustments(segments, signals)
    
    // Step 6: Determine global adjustments
    const globalAdjustments = determineGlobalAdjustments(signals)
    
    // Step 7: Create processing metadata
    const processingMetadata = createProcessingMetadata(signals, startTime)
    
    // Step 8: Assemble the complete CutPlan
    const cutPlan: CutPlan = {
      id: `cutplan_${signals.uploadId}_${Date.now()}`,
      uploadId: signals.uploadId,
      segments,
      audioAdjustments,
      subtitles: [], // Will be generated from ASR segments later
      qualityMetrics,
      globalAdjustments,
      processingMetadata
    }
    
    // Step 9: Validate the CutPlan
    const validatedCutPlan = validateCutPlan(cutPlan)
    
    console.log(`✅ CutPlan generated successfully in ${Date.now() - startTime}ms`)
    
    return validatedCutPlan
    
  } catch (error) {
    console.error('❌ CutPlan generation failed:', error)
    throw new Error(`CutPlan generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Analyze and score all potential segments based on various signals
 */
function analyzeAndScoreSegments(signals: ProcessingSignals) {
  const segments = []
  
  // Create segments from ASR data
  for (const asrSegment of signals.asrSegments) {
    let score = 0.5 // Base score
    const reasons = []
    
    // Confidence scoring
    if (asrSegment.confidence > 0.8) {
      score += 0.2
      reasons.push('high_confidence')
    } else if (asrSegment.confidence < 0.5) {
      score -= 0.3
      reasons.push('low_confidence')
    }
    
    // Check for silence overlap
    const silenceOverlap = signals.silenceRegions.some(silence => 
      silence.start < asrSegment.end && silence.end > asrSegment.start
    )
    if (silenceOverlap) {
      score -= 0.2
      reasons.push('silence_overlap')
    }
    
    // Check for filler words
    const fillerOverlap = signals.fillerDetections.filter(filler =>
      filler.start >= asrSegment.start && filler.end <= asrSegment.end
    )
    if (fillerOverlap.length > 0) {
      const fillerPenalty = fillerOverlap.length * 0.1
      score -= fillerPenalty
      reasons.push(`filler_words_${fillerOverlap.length}`)
    }
    
    // WER analysis (if available)
    if (signals.werAnalysis) {
      const werMatch = signals.werAnalysis.find(wer => 
        wer.segmentStart <= asrSegment.start && wer.segmentEnd >= asrSegment.end
      )
      if (werMatch && werMatch.werScore > 0.3) {
        score -= werMatch.werScore * 0.4
        reasons.push(`high_wer_${werMatch.werScore.toFixed(2)}`)
      }
    }
    
    // AI analysis boost (if available)
    if (signals.aiAnalysis) {
      const aiKeep = signals.aiAnalysis.keepSegments.find(keep =>
        keep.start <= asrSegment.start && keep.end >= asrSegment.end
      )
      if (aiKeep) {
        score += aiKeep.confidence * 0.3
        reasons.push(`ai_recommended`)
      }
      
      const aiRemove = signals.aiAnalysis.removeSegments.find(remove =>
        remove.start <= asrSegment.start && remove.end >= asrSegment.end
      )
      if (aiRemove) {
        score -= aiRemove.confidence * 0.4
        reasons.push(`ai_flagged`)
      }
    }
    
    segments.push({
      start: asrSegment.start,
      end: asrSegment.end,
      text: asrSegment.text,
      confidence: asrSegment.confidence,
      score: Math.max(0, Math.min(1, score)),
      reasons,
      speaker: asrSegment.speaker,
      originalSegment: asrSegment
    })
  }
  
  return segments.sort((a, b) => a.start - b.start)
}

/**
 * Make cutting decisions based on scored segments and options
 */
function makeCuttingDecisions(scoredSegments: any[], signals: ProcessingSignals) {
  const aggressiveness = signals.options.aggressiveness
  const threshold = 0.3 + (aggressiveness * 0.4) // 0.3-0.7 threshold range
  
  const keep = []
  const remove = []
  const modify = []
  
  for (const segment of scoredSegments) {
    if (segment.score >= threshold) {
      keep.push(segment)
    } else if (segment.score < threshold - 0.2) {
      remove.push(segment)
    } else {
      // Borderline segments - might need modification
      modify.push(segment)
    }
  }
  
  // Handle filler word removal
  if (signals.options.removeFillerWords) {
    for (const segment of keep) {
      const fillers = signals.fillerDetections.filter(filler =>
        filler.start >= segment.start && filler.end <= segment.end
      )
      if (fillers.length > 0) {
        segment.fillersToRemove = fillers
      }
    }
  }
  
  return { keep, remove, modify }
}

/**
 * Generate final segments with transforms and transitions
 */
function generateSegments(decisions: any, signals: ProcessingSignals): Segment[] {
  const segments: Segment[] = []
  let currentOutputTime = 0
  
  // Process kept segments
  for (const [index, segmentData] of decisions.keep.entries()) {
    const duration = segmentData.end - segmentData.start
    
    // Create basic segment
    const segment = createBasicSegment(
      currentOutputTime,
      currentOutputTime + duration,
      segmentData.start,
      segmentData.end,
      'keep'
    )
    
    // Add metadata
    segment.text = segmentData.text
    segment.confidence = segmentData.confidence
    segment.reason = `Score: ${segmentData.score.toFixed(2)} (${segmentData.reasons.join(', ')})`
    segment.metadata = {
      speaker: segmentData.speaker,
      qualityScore: segmentData.score,
      silenceScore: calculateSilenceScore(segmentData, signals.silenceRegions),
      fillerScore: calculateFillerScore(segmentData, signals.fillerDetections)
    }
    
    // Add transforms from MediaPipe
    if (signals.options.enableMediaPipe && signals.mediapipeTransforms) {
      const relevantTransforms = signals.mediapipeTransforms.filter(transform =>
        transform.timestamp >= segmentData.start && 
        transform.timestamp + transform.duration <= segmentData.end
      )
      
      for (const mpTransform of relevantTransforms) {
        const relativeStartTime = currentOutputTime + (mpTransform.timestamp - segmentData.start)
        const transform = createTransform(
          'pan',
          relativeStartTime,
          relativeStartTime + mpTransform.duration,
          { x: 0, y: 0, scale: 1.0 },
          { x: mpTransform.x, y: mpTransform.y, scale: mpTransform.scale },
          'mediapipe'
        )
        segment.transforms.push(transform)
      }
    }
    
    // Add auto-zoom transforms
    if (signals.options.enableAutoZoom && signals.autoZoomTransforms) {
      const relevantZooms = signals.autoZoomTransforms.filter(zoom =>
        zoom.timestamp >= segmentData.start && 
        zoom.timestamp + zoom.duration <= segmentData.end
      )
      
      for (const zoom of relevantZooms) {
        const relativeStartTime = currentOutputTime + (zoom.timestamp - segmentData.start)
        const transform = createTransform(
          'scale',
          relativeStartTime,
          relativeStartTime + zoom.duration,
          1.0,
          zoom.scale,
          'auto_zoom'
        )
        segment.transforms.push(transform)
      }
    }
    
    // Add transition if not the first segment
    if (index > 0) {
      segment.transition = {
        type: 'cut', // Default to cut, can be enhanced based on content
        duration: 0.1,
        easing: 'easeInOut'
      }
      
      // Use dissolve for similar segments
      const prevSegment = decisions.keep[index - 1]
      if (prevSegment && segmentData.speaker === prevSegment.speaker) {
        segment.transition.type = 'dissolve'
        segment.transition.duration = 0.3
      }
    }
    
    segments.push(segment)
    currentOutputTime += duration
  }
  
  // Add remove segments for reference (with action: 'remove')
  for (const segmentData of decisions.remove) {
    const segment = createBasicSegment(
      segmentData.start,
      segmentData.end,
      segmentData.start,
      segmentData.end,
      'remove'
    )
    segment.text = segmentData.text
    segment.reason = `Removed: ${segmentData.reasons.join(', ')}`
    segment.metadata = {
      qualityScore: segmentData.score
    }
    segments.push(segment)
  }
  
  return segments
}

/**
 * Calculate quality metrics for the generated cut plan
 */
function calculateQualityMetrics(segments: Segment[], signals: ProcessingSignals): QualityMetrics {
  const keptSegments = segments.filter(s => s.action === 'keep')
  const totalCuts = keptSegments.length
  const averageSegmentDuration = keptSegments.length > 0 
    ? keptSegments.reduce((sum, s) => sum + (s.endTime - s.startTime), 0) / keptSegments.length
    : 0
  
  // Engagement score based on pace and variety
  const paceScore = Math.min(1, totalCuts / 20) // More cuts = higher engagement (to a point)
  const varietyScore = keptSegments.some(s => s.transforms.length > 0) ? 0.8 : 0.5
  const engagementScore = (paceScore + varietyScore) / 2
  
  // Retention prediction based on segment quality
  const avgQualityScore = keptSegments.reduce((sum, s) => sum + (s.metadata?.qualityScore || 0.5), 0) / keptSegments.length
  const retentionPrediction = avgQualityScore
  
  // Social media optimization for target format
  let socialOptimization = 0.7 // Base score
  if (signals.options.targetFormat === 'instagram_reels') {
    const targetDuration = signals.options.targetDuration || 30
    const actualDuration = keptSegments.reduce((sum, s) => sum + (s.endTime - s.startTime), 0)
    const durationMatch = 1 - Math.abs(actualDuration - targetDuration) / targetDuration
    socialOptimization = Math.min(1, durationMatch * 1.2)
  }
  
  return createQualityMetrics(engagementScore, retentionPrediction, totalCuts, averageSegmentDuration)
}

/**
 * Generate audio adjustments based on segments and analysis
 */
function generateAudioAdjustments(segments: Segment[], signals: ProcessingSignals): AudioAdjustment[] {
  const adjustments: AudioAdjustment[] = []
  
  // Add fade in/out for segments with abrupt starts/ends
  for (const segment of segments) {
    if (segment.action !== 'keep') continue
    
    // Check if segment starts/ends abruptly
    const silenceAtStart = signals.silenceRegions.some(silence => 
      Math.abs(silence.end - segment.sourceStartTime) < 0.5
    )
    const silenceAtEnd = signals.silenceRegions.some(silence =>
      Math.abs(silence.start - segment.sourceEndTime) < 0.5
    )
    
    if (!silenceAtStart) {
      adjustments.push({
        startTime: segment.startTime,
        endTime: segment.startTime + 0.2,
        type: 'fade_in',
        value: 0.2,
        easing: 'exponential'
      })
    }
    
    if (!silenceAtEnd) {
      adjustments.push({
        startTime: segment.endTime - 0.2,
        endTime: segment.endTime,
        type: 'fade_out',
        value: 0.2,
        easing: 'exponential'
      })
    }
  }
  
  return adjustments
}

/**
 * Determine global adjustments based on target format and options
 */
function determineGlobalAdjustments(signals: ProcessingSignals) {
  const targetDuration = signals.options.targetDuration || getDefaultDurationForFormat(signals.options.targetFormat)
  const targetAspectRatio = getAspectRatioForFormat(signals.options.targetFormat)
  
  return {
    targetDuration,
    targetAspectRatio,
    targetFormat: signals.options.targetFormat,
    speedAdjustment: 1.0,
    audioLeveling: true,
    colorGrading: {
      brightness: 0,
      contrast: 0,
      saturation: 0,
      temperature: 0,
      preset: signals.options.targetFormat === 'instagram_reels' ? 'vibrant' as const : 'none' as const
    },
    backgroundMusic: {
      enabled: signals.options.targetFormat === 'instagram_reels',
      volume: 0.2,
      fadeIn: 1,
      fadeOut: 2
    }
  }
}

/**
 * Create processing metadata
 */
function createProcessingMetadata(signals: ProcessingSignals, startTime: number) {
  const signalsUsed: Array<'silence_detection' | 'filler_detection' | 'wer_analysis' | 'confidence_analysis' | 'mediapipe_transforms' | 'auto_zoom' | 'ai_analysis'> = [
    'silence_detection',
    'filler_detection',
    'confidence_analysis'
  ]
  
  if (signals.werAnalysis) signalsUsed.push('wer_analysis')
  if (signals.mediapipeTransforms) signalsUsed.push('mediapipe_transforms')
  if (signals.autoZoomTransforms) signalsUsed.push('auto_zoom')
  if (signals.aiAnalysis) signalsUsed.push('ai_analysis')
  
  return {
    version: 'v1.0',
    timestamp: new Date().toISOString(),
    processingTimeMs: Date.now() - startTime,
    sourceFile: signals.sourceFile,
    sourceMetadata: signals.sourceMetadata,
    signalsUsed,
    processingOptions: signals.options,
    warnings: [],
    errors: []
  }
}

// Helper functions
function calculateSilenceScore(segment: any, silenceRegions: any[]): number {
  const overlaps = silenceRegions.filter(silence =>
    silence.start < segment.end && silence.end > segment.start
  )
  const overlapDuration = overlaps.reduce((sum, silence) => {
    const overlapStart = Math.max(silence.start, segment.start)
    const overlapEnd = Math.min(silence.end, segment.end)
    return sum + Math.max(0, overlapEnd - overlapStart)
  }, 0)
  const segmentDuration = segment.end - segment.start
  return 1 - (overlapDuration / segmentDuration) // Higher score = less silence
}

function calculateFillerScore(segment: any, fillerDetections: any[]): number {
  const fillers = fillerDetections.filter(filler =>
    filler.start >= segment.start && filler.end <= segment.end
  )
  const fillerDuration = fillers.reduce((sum, filler) => sum + (filler.end - filler.start), 0)
  const segmentDuration = segment.end - segment.start
  return 1 - (fillerDuration / segmentDuration) // Higher score = fewer fillers
}

function getDefaultDurationForFormat(format: string): number {
  switch (format) {
    case 'instagram_reels': return 30
    case 'youtube_shorts': return 60
    case 'tiktok': return 15
    case 'youtube_landscape': return 300
    default: return 60
  }
}

function getAspectRatioForFormat(format: string): number {
  switch (format) {
    case 'instagram_reels':
    case 'youtube_shorts':
    case 'tiktok':
      return 9/16
    case 'youtube_landscape':
      return 16/9
    default:
      return 16/9
  }
}