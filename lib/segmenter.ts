import { Word, Segment, Pause, KeepSegment, KeepReason } from './types'

// Configuration for pause handling and segmentation
export interface SegmentationConfig {
  // Pause preservation rules
  strongPunctuationPauseThreshold: number // Preserve pauses ≤500ms after strong punctuation
  longPauseTrimThreshold: number // Trim pauses ≥800ms
  trimmedPauseLength: number // Trim long pauses to ~250ms
  
  // Segment padding and minimum lengths
  leadInPadding: number // 150ms lead-in for each segment
  minimumSegmentLength: number // At least 450ms total length
  
  // Merging and expansion
  maxGapForMerging: number // Max gap to merge tiny segments
  naturalPauseBuffer: number // Buffer for natural speech flow
  
  // Quality thresholds
  minConfidenceForKeep: number
  strongConfidenceThreshold: number
}

export const DEFAULT_SEGMENTATION_CONFIG: SegmentationConfig = {
  strongPunctuationPauseThreshold: 500, // ms
  longPauseTrimThreshold: 800, // ms
  trimmedPauseLength: 250, // ms
  leadInPadding: 150, // ms
  minimumSegmentLength: 450, // ms
  maxGapForMerging: 300, // ms
  naturalPauseBuffer: 100, // ms
  minConfidenceForKeep: 0.7,
  strongConfidenceThreshold: 0.85
}

// Strong punctuation patterns
const STRONG_PUNCTUATION = /[.!?…]/
const SENTENCE_ENDERS = /[.!?…]+\s*$/

export interface PauseAnalysis {
  pauses: Pause[]
  naturalBreaks: Pause[]
  longPauses: Pause[]
  fillerPauses: Pause[]
}

export interface SegmentationResult {
  processedSegments: KeepSegment[]
  pauseAnalysis: PauseAnalysis
  edlContent: string
  concatList: string[]
  stats: {
    originalSegments: number
    processedSegments: number
    totalPausesTrimmed: number
    totalTimeReduced: number
    averageSegmentLength: number
    confidence: number
  }
}

/**
 * Advanced segmenter with sophisticated pause logic
 */
export class AudioSegmenter {
  private config: SegmentationConfig

  constructor(config: Partial<SegmentationConfig> = {}) {
    this.config = { ...DEFAULT_SEGMENTATION_CONFIG, ...config }
  }

  /**
   * Main segmentation function with advanced pause handling
   */
  async processSegments(
    segments: Segment[],
    scriptText?: string
  ): Promise<SegmentationResult> {
    console.log('🎯 Starting advanced segmentation with pause logic...')
    
    // Step 1: Analyze pauses between segments
    const pauseAnalysis = this.computePauses(segments)
    console.log(`📊 Pause analysis: ${pauseAnalysis.pauses.length} pauses, ${pauseAnalysis.longPauses.length} long pauses`)
    
    // Step 2: Apply pause trimming logic
    const pauseProcessedSegments = this.applyPauseLogic(segments, pauseAnalysis)
    console.log(`✂️ Pause processing: ${pauseProcessedSegments.length} segments after pause logic`)
    
    // Step 3: Merge tiny segments
    const mergedSegments = this.mergeTinySegments(pauseProcessedSegments)
    console.log(`🔗 Segment merging: ${mergedSegments.length} segments after merging`)
    
    // Step 4: Expand segments with padding and ensure minimum lengths
    const paddedSegments = this.expandWithPadding(mergedSegments)
    console.log(`📏 Segment padding: ${paddedSegments.length} segments with proper padding`)
    
    // Step 5: Convert to KeepSegments with reasons
    const keepSegments = this.convertToKeepSegments(paddedSegments, scriptText)
    console.log(`✅ Final segments: ${keepSegments.length} segments ready for editing`)
    
    // Step 6: Generate EDL and concat list
    const edlContent = this.generateEDL(keepSegments)
    const concatList = this.generateConcatList(keepSegments)
    
    // Calculate statistics
    const stats = this.calculateStats(segments, keepSegments, pauseAnalysis)
    
    return {
      processedSegments: keepSegments,
      pauseAnalysis,
      edlContent,
      concatList,
      stats
    }
  }

  /**
   * Compute pauses between segments with classification
   */
  computePauses(segments: Segment[]): PauseAnalysis {
    const pauses: Pause[] = []
    const naturalBreaks: Pause[] = []
    const longPauses: Pause[] = []
    const fillerPauses: Pause[] = []

    for (let i = 0; i < segments.length - 1; i++) {
      const currentSegment = segments[i]
      const nextSegment = segments[i + 1]
      
      const pauseStart = currentSegment.end * 1000 // Convert to ms
      const pauseEnd = nextSegment.start * 1000
      const pauseDuration = pauseEnd - pauseStart
      
      if (pauseDuration > 50) { // Only consider pauses > 50ms
        const pauseType = this.classifyPause(currentSegment, nextSegment, pauseDuration)
        const confidence = this.calculatePauseConfidence(currentSegment, nextSegment, pauseDuration)
        
        const pause: Pause = {
          start_ms: pauseStart,
          end_ms: pauseEnd,
          duration_ms: pauseDuration,
          type: pauseType,
          confidence,
          context: this.generatePauseContext(currentSegment, nextSegment)
        }
        
        pauses.push(pause)
        
        // Classify into specific categories
        if (pauseType === 'natural_break') {
          naturalBreaks.push(pause)
        } else if (pauseType === 'long_pause') {
          longPauses.push(pause)
        } else if (pauseType === 'filler') {
          fillerPauses.push(pause)
        }
      }
    }

    return { pauses, naturalBreaks, longPauses, fillerPauses }
  }

  /**
   * Apply sophisticated pause trimming logic
   */
  private applyPauseLogic(segments: Segment[], pauseAnalysis: PauseAnalysis): Segment[] {
    const processedSegments: Segment[] = []
    
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]
      let adjustedSegment = { ...segment }
      
      // Check pause after this segment
      const pauseAfter = pauseAnalysis.pauses.find(p => 
        Math.abs(p.start_ms - segment.end * 1000) < 100
      )
      
      if (pauseAfter) {
        const hasStrongPunctuation = STRONG_PUNCTUATION.test(segment.text.trim())
        
        if (hasStrongPunctuation && pauseAfter.duration_ms <= this.config.strongPunctuationPauseThreshold) {
          // Preserve pauses ≤500ms after strong punctuation
          console.log(`🔒 Preserving ${pauseAfter.duration_ms}ms pause after strong punctuation: "${segment.text}"`)
          // Keep original timing
        } else if (pauseAfter.duration_ms >= this.config.longPauseTrimThreshold) {
          // Trim pauses ≥800ms to ~250ms
          const originalPauseEnd = pauseAfter.end_ms
          const trimmedPauseEnd = pauseAfter.start_ms + this.config.trimmedPauseLength
          const timeSaved = originalPauseEnd - trimmedPauseEnd
          
          console.log(`✂️ Trimming ${pauseAfter.duration_ms}ms pause to ${this.config.trimmedPauseLength}ms (saved ${timeSaved}ms)`)
          
          // Adjust the next segment's start time
          if (i + 1 < segments.length) {
            segments[i + 1] = {
              ...segments[i + 1],
              start: trimmedPauseEnd / 1000
            }
          }
        }
      }
      
      processedSegments.push(adjustedSegment)
    }
    
    return processedSegments
  }

  /**
   * Merge tiny segments that are too short
   */
  private mergeTinySegments(segments: Segment[]): Segment[] {
    const mergedSegments: Segment[] = []
    let i = 0
    
    while (i < segments.length) {
      const currentSegment = segments[i]
      const segmentDuration = (currentSegment.end - currentSegment.start) * 1000
      
      if (segmentDuration < this.config.minimumSegmentLength && i + 1 < segments.length) {
        // Try to merge with next segment if gap is small
        const nextSegment = segments[i + 1]
        const gap = (nextSegment.start - currentSegment.end) * 1000
        
        if (gap <= this.config.maxGapForMerging) {
          console.log(`🔗 Merging tiny segment (${segmentDuration}ms) with next segment`)
          
          const mergedSegment: Segment = {
            start: currentSegment.start,
            end: nextSegment.end,
            text: `${currentSegment.text} ${nextSegment.text}`.trim(),
            confidence: Math.min(currentSegment.confidence || 0.8, nextSegment.confidence || 0.8),
            words: [
              ...(currentSegment.words || []),
              ...(nextSegment.words || [])
            ]
          }
          
          mergedSegments.push(mergedSegment)
          i += 2 // Skip both segments
          continue
        }
      }
      
      mergedSegments.push(currentSegment)
      i++
    }
    
    return mergedSegments
  }

  /**
   * Expand segments with proper padding and ensure minimum lengths
   */
  private expandWithPadding(segments: Segment[]): Segment[] {
    const paddedSegments: Segment[] = []
    
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]
      const segmentDuration = (segment.end - segment.start) * 1000
      
      // Add lead-in padding (150ms)
      let adjustedStart = segment.start - (this.config.leadInPadding / 1000)
      
      // Ensure we don't overlap with previous segment
      if (i > 0) {
        const prevSegment = paddedSegments[i - 1]
        const minStart = prevSegment.end + (this.config.naturalPauseBuffer / 1000)
        adjustedStart = Math.max(adjustedStart, minStart)
      } else {
        // Don't go before start of recording
        adjustedStart = Math.max(0, adjustedStart)
      }
      
      // Ensure minimum segment length (450ms)
      let adjustedEnd = segment.end
      const currentDuration = (adjustedEnd - adjustedStart) * 1000
      
      if (currentDuration < this.config.minimumSegmentLength) {
        const extraTime = (this.config.minimumSegmentLength - currentDuration) / 1000
        adjustedEnd += extraTime
        console.log(`📏 Extending segment to meet ${this.config.minimumSegmentLength}ms minimum length`)
      }
      
      const paddedSegment: Segment = {
        ...segment,
        start: adjustedStart,
        end: adjustedEnd
      }
      
      paddedSegments.push(paddedSegment)
    }
    
    return paddedSegments
  }

  /**
   * Convert segments to KeepSegments with appropriate reasons
   */
  private convertToKeepSegments(segments: Segment[], scriptText?: string): KeepSegment[] {
    return segments.map((segment, index) => {
      const reason = this.determineKeepReason(segment, scriptText)
      const confidence = segment.confidence || 0.8
      
      return {
        start_ms: Math.round(segment.start * 1000),
        end_ms: Math.round(segment.end * 1000),
        transcript: segment.text,
        confidence,
        reason,
        reasonDetails: this.generateReasonDetails(segment, reason),
        originalSegmentIndex: index
      }
    })
  }

  /**
   * Generate Edit Decision List (EDL) format
   */
  generateEDL(segments: KeepSegment[], sourceName: string = 'SOURCE'): string {
    let edl = `TITLE: Segmented Audio Edit\n`
    edl += `FCM: NON-DROP FRAME\n\n`
    
    let timelinePosition = 0
    
    segments.forEach((segment, index) => {
      const editNumber = (index + 1).toString().padStart(3, '0')
      const sourceIn = this.formatTimecode(segment.start_ms)
      const sourceOut = this.formatTimecode(segment.end_ms)
      const timelineIn = this.formatTimecode(timelinePosition)
      
      const segmentDuration = segment.end_ms - segment.start_ms
      timelinePosition += segmentDuration
      
      const timelineOut = this.formatTimecode(timelinePosition)
      
      edl += `${editNumber}  ${sourceName}       V     C        ${sourceIn} ${sourceOut} ${timelineIn} ${timelineOut}\n`
      edl += `* REASON: ${segment.reason}\n`
      edl += `* CONFIDENCE: ${segment.confidence.toFixed(3)}\n`
      edl += `* TEXT: ${segment.transcript.substring(0, 60)}${segment.transcript.length > 60 ? '...' : ''}\n\n`
    })
    
    return edl
  }

  /**
   * Generate FFmpeg concat list
   */
  generateConcatList(segments: KeepSegment[]): string[] {
    return segments.map((segment, index) => {
      const startSec = segment.start_ms / 1000
      const duration = (segment.end_ms - segment.start_ms) / 1000
      
      return `# Segment ${index + 1}: ${segment.reason} (${segment.confidence.toFixed(3)})\n` +
             `# "${segment.transcript.substring(0, 40)}${segment.transcript.length > 40 ? '...' : ''}"\n` +
             `file 'segment_${index.toString().padStart(3, '0')}.mp4'\n` +
             `# ffmpeg -ss ${startSec.toFixed(3)} -t ${duration.toFixed(3)} -i input.mp4 segment_${index.toString().padStart(3, '0')}.mp4`
    })
  }

  /**
   * Classify pause type based on context
   */
  private classifyPause(currentSegment: Segment, nextSegment: Segment, duration: number): Pause['type'] {
    const hasStrongPunctuation = STRONG_PUNCTUATION.test(currentSegment.text.trim())
    
    if (duration >= this.config.longPauseTrimThreshold) {
      return 'long_pause'
    }
    
    if (hasStrongPunctuation && duration <= this.config.strongPunctuationPauseThreshold) {
      return 'natural_break'
    }
    
    // Check for filler words in surrounding context
    const fillerWords = /\b(um|uh|er|ah|like|you know|well|so)\b/i
    if (fillerWords.test(currentSegment.text) || fillerWords.test(nextSegment.text)) {
      return 'filler'
    }
    
    if (duration > 200 && duration < 600) {
      return 'hesitation'
    }
    
    return 'silence'
  }

  /**
   * Calculate confidence for pause classification
   */
  private calculatePauseConfidence(currentSegment: Segment, nextSegment: Segment, duration: number): number {
    let confidence = 0.8
    
    // Higher confidence for clear patterns
    if (SENTENCE_ENDERS.test(currentSegment.text)) {
      confidence += 0.1
    }
    
    // Lower confidence for very short or very long pauses
    if (duration < 100 || duration > 2000) {
      confidence -= 0.2
    }
    
    // Consider segment confidence
    const avgSegmentConfidence = ((currentSegment.confidence || 0.8) + (nextSegment.confidence || 0.8)) / 2
    confidence = (confidence + avgSegmentConfidence) / 2
    
    return Math.max(0.1, Math.min(1.0, confidence))
  }

  /**
   * Generate context description for pause
   */
  private generatePauseContext(currentSegment: Segment, nextSegment: Segment): string {
    const beforeText = currentSegment.text.trim().slice(-20)
    const afterText = nextSegment.text.trim().slice(0, 20)
    return `"...${beforeText}" → "${afterText}..."`
  }

  /**
   * Determine keep reason for segment
   */
  private determineKeepReason(segment: Segment, scriptText?: string): KeepReason {
    const confidence = segment.confidence || 0.8
    
    if (scriptText && this.segmentMatchesScript(segment, scriptText)) {
      return 'script_match'
    }
    
    if (confidence >= this.config.strongConfidenceThreshold) {
      return 'high_confidence'
    }
    
    if (this.hasNaturalSpeechPattern(segment)) {
      return 'natural_speech'
    }
    
    if (this.containsKeywords(segment)) {
      return 'topic_relevant'
    }
    
    return 'pause_trim'
  }

  /**
   * Generate reason details
   */
  private generateReasonDetails(segment: Segment, reason: KeepReason): string {
    const duration = ((segment.end - segment.start) * 1000).toFixed(0)
    const confidence = ((segment.confidence || 0.8) * 100).toFixed(1)
    
    switch (reason) {
      case 'script_match':
        return `Matches script content (${confidence}% confidence, ${duration}ms)`
      case 'high_confidence':
        return `High transcription confidence (${confidence}%, ${duration}ms)`
      case 'natural_speech':
        return `Natural speech pattern detected (${duration}ms)`
      case 'topic_relevant':
        return `Contains relevant keywords (${confidence}% confidence)`
      case 'pause_trim':
        return `Optimized pause timing (${duration}ms)`
      default:
        return `Segment preserved (${confidence}% confidence, ${duration}ms)`
    }
  }

  /**
   * Check if segment matches script content
   */
  private segmentMatchesScript(segment: Segment, scriptText: string): boolean {
    const segmentWords = segment.text.toLowerCase().split(/\s+/)
    const scriptWords = scriptText.toLowerCase().split(/\s+/)
    
    // Simple word overlap check (can be enhanced with fuzzy matching)
    const overlap = segmentWords.filter(word => 
      scriptWords.some(scriptWord => 
        scriptWord.includes(word) || word.includes(scriptWord)
      )
    )
    
    return overlap.length / segmentWords.length > 0.6
  }

  /**
   * Check for natural speech patterns
   */
  private hasNaturalSpeechPattern(segment: Segment): boolean {
    const text = segment.text.toLowerCase()
    
    // Look for natural speech indicators
    const naturalPatterns = [
      /\b(and|but|so|however|because|therefore)\b/,
      /\b(the|a|an|this|that|these|those)\b/,
      /[.!?]/, // Proper punctuation
    ]
    
    return naturalPatterns.some(pattern => pattern.test(text))
  }

  /**
   * Check for topic-relevant keywords
   */
  private containsKeywords(segment: Segment): boolean {
    const text = segment.text.toLowerCase()
    
    // Common important keywords (can be customized)
    const keywords = [
      'important', 'key', 'main', 'primary', 'essential',
      'because', 'therefore', 'result', 'conclusion',
      'first', 'second', 'finally', 'next', 'then'
    ]
    
    return keywords.some(keyword => text.includes(keyword))
  }

  /**
   * Format milliseconds to timecode (HH:MM:SS:FF at 30fps)
   */
  private formatTimecode(ms: number): string {
    const totalFrames = Math.floor(ms / 1000 * 30)
    const frames = totalFrames % 30
    const seconds = Math.floor(totalFrames / 30) % 60
    const minutes = Math.floor(totalFrames / (30 * 60)) % 60
    const hours = Math.floor(totalFrames / (30 * 60 * 60))
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`
  }

  /**
   * Calculate processing statistics
   */
  private calculateStats(
    originalSegments: Segment[], 
    processedSegments: KeepSegment[], 
    pauseAnalysis: PauseAnalysis
  ) {
    const originalDuration = originalSegments.reduce((sum, seg) => sum + (seg.end - seg.start), 0) * 1000
    const processedDuration = processedSegments.reduce((sum, seg) => sum + (seg.end_ms - seg.start_ms), 0)
    
    const totalTimeReduced = originalDuration - processedDuration
    const averageSegmentLength = processedDuration / processedSegments.length
    const averageConfidence = processedSegments.reduce((sum, seg) => sum + seg.confidence, 0) / processedSegments.length
    
    return {
      originalSegments: originalSegments.length,
      processedSegments: processedSegments.length,
      totalPausesTrimmed: pauseAnalysis.longPauses.length,
      totalTimeReduced,
      averageSegmentLength,
      confidence: averageConfidence
    }
  }
}

/**
 * Convenience function for quick segmentation
 */
export async function processAudioSegments(
  segments: Segment[], 
  scriptText?: string,
  config?: Partial<SegmentationConfig>
): Promise<SegmentationResult> {
  const segmenter = new AudioSegmenter(config)
  return await segmenter.processSegments(segments, scriptText)
}

/**
 * Export helper for creating custom configurations
 */
export function createSegmentationConfig(overrides: Partial<SegmentationConfig>): SegmentationConfig {
  return { ...DEFAULT_SEGMENTATION_CONFIG, ...overrides }
}
