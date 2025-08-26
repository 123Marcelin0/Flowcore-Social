import { KeepSegment } from './types'

/**
 * SRT subtitle generation with intelligent cue management
 * Ensures no cues are shorter than 300ms and merges neighbors when needed
 */

export interface SubtitleCue {
  index: number
  startTime: string  // SRT format: HH:MM:SS,mmm
  endTime: string    // SRT format: HH:MM:SS,mmm
  text: string
  duration_ms: number
  originalSegments: number // How many original segments were merged
}

export interface SubtitleOptions {
  minCueDuration_ms: number    // Minimum duration for any cue (default: 300ms)
  maxCueDuration_ms: number    // Maximum duration for any cue (default: 7000ms)
  maxCharsPerLine: number      // Maximum characters per line (default: 42)
  maxLinesPerCue: number       // Maximum lines per cue (default: 2)
  mergeThreshold_ms: number    // Merge cues closer than this (default: 200ms)
  readingSpeed_wpm: number     // Words per minute reading speed (default: 180)
  preserveLineBreaks: boolean  // Keep natural line breaks in transcript
  wordWrap: boolean            // Automatically wrap long lines
}

export const DEFAULT_SUBTITLE_OPTIONS: SubtitleOptions = {
  minCueDuration_ms: 300,
  maxCueDuration_ms: 7000,
  maxCharsPerLine: 42,
  maxLinesPerCue: 2,
  mergeThreshold_ms: 200,
  readingSpeed_wpm: 180,
  preserveLineBreaks: false,
  wordWrap: true
}

/**
 * Generate clean SRT subtitles from KeepSegments
 * Ensures minimum cue durations and merges neighbors if too short
 */
export function makeSrt(
  keepSegments: KeepSegment[], 
  options: Partial<SubtitleOptions> = {}
): string {
  const opts = { ...DEFAULT_SUBTITLE_OPTIONS, ...options }
  
  if (!keepSegments.length) {
    return ''
  }
  
  console.log(`🎬 Generating SRT from ${keepSegments.length} segments...`)
  
  // Step 1: Process and clean segments
  const processedCues = processSubtitleCues(keepSegments, opts)
  console.log(`📝 Processed into ${processedCues.length} subtitle cues`)
  
  // Step 2: Generate SRT format
  const srtContent = generateSRTContent(processedCues)
  
  console.log(`✅ SRT generation completed: ${processedCues.length} cues, ${srtContent.split('\n').length} lines`)
  
  return srtContent
}

/**
 * Process KeepSegments into optimized subtitle cues
 */
function processSubtitleCues(
  segments: KeepSegment[], 
  options: SubtitleOptions
): SubtitleCue[] {
  // Sort segments by start time to ensure proper order
  const sortedSegments = [...segments].sort((a, b) => a.start_ms - b.start_ms)
  
  console.log(`🔄 Processing ${sortedSegments.length} segments into subtitle cues...`)
  
  // Step 1: Create initial cues
  let cues = sortedSegments.map((segment, index) => {
    const duration = segment.end_ms - segment.start_ms
    
    return {
      index: index + 1,
      startTime: formatSRTTime(segment.start_ms),
      endTime: formatSRTTime(segment.end_ms),
      text: cleanSubtitleText(segment.transcript, options),
      duration_ms: duration,
      originalSegments: 1,
      start_ms: segment.start_ms,
      end_ms: segment.end_ms
    }
  })
  
  console.log(`📊 Initial cues: ${cues.length}, average duration: ${(cues.reduce((sum, c) => sum + c.duration_ms, 0) / cues.length).toFixed(0)}ms`)
  
  // Step 2: Merge cues that are too short or too close together
  cues = mergeShortCues(cues, options)
  
  // Step 3: Ensure minimum durations
  cues = ensureMinimumDurations(cues, options)
  
  // Step 4: Apply reading speed constraints
  cues = applyReadingSpeedConstraints(cues, options)
  
  // Step 5: Final cleanup and re-indexing
  return cues.map((cue, index) => ({
    ...cue,
    index: index + 1,
    startTime: formatSRTTime(cue.start_ms),
    endTime: formatSRTTime(cue.end_ms),
    duration_ms: cue.end_ms - cue.start_ms
  }))
}

/**
 * Merge cues that are too short or too close together
 */
function mergeShortCues(cues: any[], options: SubtitleOptions): any[] {
  const mergedCues: any[] = []
  let i = 0
  
  while (i < cues.length) {
    let currentCue = { ...cues[i] }
    let mergeCount = 0
    
    // Check if current cue is too short
    if (currentCue.duration_ms < options.minCueDuration_ms) {
      console.log(`⚡ Cue ${currentCue.index} is too short (${currentCue.duration_ms}ms), attempting merge...`)
      
      // Try to merge with next cue if it exists and is close enough
      let j = i + 1
      while (j < cues.length && currentCue.duration_ms < options.minCueDuration_ms) {
        const nextCue = cues[j]
        const gapBetween = nextCue.start_ms - currentCue.end_ms
        
        // Merge if gap is small or if we really need the duration
        if (gapBetween <= options.mergeThreshold_ms || currentCue.duration_ms < options.minCueDuration_ms / 2) {
          console.log(`🔗 Merging cue ${currentCue.index} with ${nextCue.index} (gap: ${gapBetween}ms)`)
          
          // Merge the cues
          currentCue = {
            ...currentCue,
            end_ms: nextCue.end_ms,
            endTime: nextCue.endTime,
            text: combineSubtitleText(currentCue.text, nextCue.text, options),
            duration_ms: nextCue.end_ms - currentCue.start_ms,
            originalSegments: currentCue.originalSegments + nextCue.originalSegments
          }
          
          mergeCount++
          j++
        } else {
          break
        }
      }
      
      i = j // Skip merged cues
    } else {
      i++
    }
    
    if (mergeCount > 0) {
      console.log(`✅ Merged ${mergeCount + 1} cues into one (${currentCue.duration_ms}ms)`)
    }
    
    mergedCues.push(currentCue)
  }
  
  console.log(`🔗 Merge phase: ${cues.length} → ${mergedCues.length} cues`)
  return mergedCues
}

/**
 * Ensure all cues meet minimum duration requirements
 */
function ensureMinimumDurations(cues: any[], options: SubtitleOptions): any[] {
  return cues.map((cue, index) => {
    if (cue.duration_ms < options.minCueDuration_ms) {
      const extensionNeeded = options.minCueDuration_ms - cue.duration_ms
      
      console.log(`📏 Extending cue ${cue.index} by ${extensionNeeded}ms to meet minimum duration`)
      
      // Try to extend backwards first (more natural for reading)
      const extendStart = Math.min(extensionNeeded / 2, 150) // Don't extend start by more than 150ms
      const extendEnd = extensionNeeded - extendStart
      
      const newStart = Math.max(0, cue.start_ms - extendStart)
      let newEnd = cue.end_ms + extendEnd
      
      // Check for collision with next cue
      if (index + 1 < cues.length) {
        const nextCue = cues[index + 1]
        const maxEnd = nextCue.start_ms - 50 // Leave 50ms gap
        newEnd = Math.min(newEnd, maxEnd)
      }
      
      return {
        ...cue,
        start_ms: newStart,
        end_ms: newEnd,
        duration_ms: newEnd - newStart
      }
    }
    
    return cue
  })
}

/**
 * Apply reading speed constraints to ensure readability
 */
function applyReadingSpeedConstraints(cues: any[], options: SubtitleOptions): any[] {
  return cues.map(cue => {
    const wordCount = cue.text.split(/\s+/).length
    const minReadingTime = (wordCount / options.readingSpeed_wpm) * 60 * 1000 // Convert to ms
    
    if (cue.duration_ms < minReadingTime) {
      console.log(`📖 Cue ${cue.index} needs ${minReadingTime.toFixed(0)}ms for comfortable reading (${wordCount} words)`)
      
      // Extend the cue to allow comfortable reading
      const extension = minReadingTime - cue.duration_ms
      const newEnd = cue.end_ms + extension
      
      return {
        ...cue,
        end_ms: newEnd,
        duration_ms: newEnd - cue.start_ms
      }
    }
    
    return cue
  })
}

/**
 * Clean and format subtitle text
 */
function cleanSubtitleText(text: string, options: SubtitleOptions): string {
  let cleaned = text.trim()
  
  // Remove excessive whitespace
  cleaned = cleaned.replace(/\s+/g, ' ')
  
  // Remove filler words that might have slipped through
  cleaned = cleaned.replace(/\b(um|uh|er|ah)\b\s*/gi, '')
  
  // Clean up punctuation
  cleaned = cleaned.replace(/\s+([,.!?;:])/g, '$1')
  cleaned = cleaned.replace(/([.!?])\s*([.!?])/g, '$1')
  
  // Handle line wrapping if enabled
  if (options.wordWrap) {
    cleaned = wrapSubtitleText(cleaned, options)
  }
  
  return cleaned.trim()
}

/**
 * Combine text from multiple segments
 */
function combineSubtitleText(text1: string, text2: string, options: SubtitleOptions): string {
  let combined = `${text1.trim()} ${text2.trim()}`
  
  // Apply word wrapping if the combined text is too long
  if (options.wordWrap) {
    combined = wrapSubtitleText(combined, options)
  }
  
  return combined
}

/**
 * Wrap text to fit subtitle line constraints
 */
function wrapSubtitleText(text: string, options: SubtitleOptions): string {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''
  
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    
    if (testLine.length <= options.maxCharsPerLine) {
      currentLine = testLine
    } else {
      if (currentLine) {
        lines.push(currentLine)
        currentLine = word
      } else {
        // Word is longer than max chars per line, just add it
        lines.push(word)
      }
    }
  }
  
  if (currentLine) {
    lines.push(currentLine)
  }
  
  // Limit to max lines per cue
  if (lines.length > options.maxLinesPerCue) {
    const truncated = lines.slice(0, options.maxLinesPerCue)
    truncated[truncated.length - 1] += '...'
    return truncated.join('\n')
  }
  
  return lines.join('\n')
}

/**
 * Format time in SRT format (HH:MM:SS,mmm)
 */
function formatSRTTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000)
  const ms = milliseconds % 1000
  const seconds = totalSeconds % 60
  const minutes = Math.floor(totalSeconds / 60) % 60
  const hours = Math.floor(totalSeconds / 3600)
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`
}

/**
 * Generate the final SRT content string
 */
function generateSRTContent(cues: SubtitleCue[]): string {
  return cues.map(cue => {
    return `${cue.index}\n${cue.startTime} --> ${cue.endTime}\n${cue.text}\n`
  }).join('\n')
}

/**
 * Validate SRT cues for common issues
 */
export function validateSRT(cues: SubtitleCue[], options: SubtitleOptions = DEFAULT_SUBTITLE_OPTIONS): {
  valid: boolean
  issues: string[]
  stats: {
    totalCues: number
    shortCues: number
    longCues: number
    averageDuration: number
    totalDuration: number
  }
} {
  const issues: string[] = []
  let shortCues = 0
  let longCues = 0
  
  // Check each cue
  cues.forEach((cue, index) => {
    // Check duration
    if (cue.duration_ms < options.minCueDuration_ms) {
      shortCues++
      issues.push(`Cue ${index + 1} is too short: ${cue.duration_ms}ms < ${options.minCueDuration_ms}ms`)
    }
    
    if (cue.duration_ms > options.maxCueDuration_ms) {
      longCues++
      issues.push(`Cue ${index + 1} is too long: ${cue.duration_ms}ms > ${options.maxCueDuration_ms}ms`)
    }
    
    // Check text length
    const lines = cue.text.split('\n')
    if (lines.length > options.maxLinesPerCue) {
      issues.push(`Cue ${index + 1} has too many lines: ${lines.length} > ${options.maxLinesPerCue}`)
    }
    
    lines.forEach((line, lineIndex) => {
      if (line.length > options.maxCharsPerLine) {
        issues.push(`Cue ${index + 1}, line ${lineIndex + 1} is too long: ${line.length} > ${options.maxCharsPerLine} chars`)
      }
    })
    
    // Check overlap with next cue
    if (index + 1 < cues.length) {
      const nextCue = cues[index + 1]
      const currentEnd = parseTime(cue.endTime)
      const nextStart = parseTime(nextCue.startTime)
      
      if (currentEnd > nextStart) {
        issues.push(`Cue ${index + 1} overlaps with cue ${index + 2}`)
      }
    }
  })
  
  const totalDuration = cues.reduce((sum, cue) => sum + cue.duration_ms, 0)
  const averageDuration = totalDuration / (cues.length || 1)
  
  return {
    valid: issues.length === 0,
    issues,
    stats: {
      totalCues: cues.length,
      shortCues,
      longCues,
      averageDuration,
      totalDuration
    }
  }
}

/**
 * Parse SRT time format back to milliseconds
 */
function parseTime(timeString: string): number {
  const [time, ms] = timeString.split(',')
  const [hours, minutes, seconds] = time.split(':').map(Number)
  return ((hours * 3600) + (minutes * 60) + seconds) * 1000 + Number(ms)
}

/**
 * Export subtitle cues as WebVTT format
 */
export function exportAsWebVTT(cues: SubtitleCue[]): string {
  let webvtt = 'WEBVTT\n\n'
  
  cues.forEach(cue => {
    const startTime = cue.startTime.replace(',', '.')
    const endTime = cue.endTime.replace(',', '.')
    webvtt += `${startTime} --> ${endTime}\n${cue.text}\n\n`
  })
  
  return webvtt
}

/**
 * Create subtitle statistics
 */
export function createSubtitleStats(cues: SubtitleCue[]): {
  totalCues: number
  totalDuration_ms: number
  averageDuration_ms: number
  shortestCue_ms: number
  longestCue_ms: number
  totalWords: number
  averageWordsPerCue: number
  readingSpeed_wpm: number
  coverage: {
    under_500ms: number
    under_1000ms: number
    over_3000ms: number
    over_5000ms: number
  }
} {
  if (!cues.length) {
    return {
      totalCues: 0,
      totalDuration_ms: 0,
      averageDuration_ms: 0,
      shortestCue_ms: 0,
      longestCue_ms: 0,
      totalWords: 0,
      averageWordsPerCue: 0,
      readingSpeed_wpm: 0,
      coverage: { under_500ms: 0, under_1000ms: 0, over_3000ms: 0, over_5000ms: 0 }
    }
  }
  
  const durations = cues.map(c => c.duration_ms)
  const totalDuration = durations.reduce((sum, d) => sum + d, 0)
  const totalWords = cues.reduce((sum, c) => sum + c.text.split(/\s+/).length, 0)
  
  return {
    totalCues: cues.length,
    totalDuration_ms: totalDuration,
    averageDuration_ms: totalDuration / cues.length,
    shortestCue_ms: Math.min(...durations),
    longestCue_ms: Math.max(...durations),
    totalWords,
    averageWordsPerCue: totalWords / cues.length,
    readingSpeed_wpm: (totalWords / (totalDuration / 1000 / 60)),
    coverage: {
      under_500ms: cues.filter(c => c.duration_ms < 500).length,
      under_1000ms: cues.filter(c => c.duration_ms < 1000).length,
      over_3000ms: cues.filter(c => c.duration_ms > 3000).length,
      over_5000ms: cues.filter(c => c.duration_ms > 5000).length
    }
  }
}

/**
 * Convenience function for quick SRT generation with default options
 */
export function quickSRT(keepSegments: KeepSegment[]): string {
  return makeSrt(keepSegments, {
    minCueDuration_ms: 300,
    mergeThreshold_ms: 200,
    wordWrap: true
  })
}

/**
 * Generate SRT with custom minimum duration
 */
export function makeSrtWithMinDuration(
  keepSegments: KeepSegment[], 
  minDuration_ms: number = 300
): string {
  return makeSrt(keepSegments, {
    minCueDuration_ms: minDuration_ms,
    mergeThreshold_ms: Math.min(minDuration_ms / 2, 200),
    wordWrap: true
  })
}
