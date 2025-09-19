/**
 * Silence detection using FFmpeg
 * Detects silent regions in audio for bad take identification
 */

import { detectSilences as detectSilencesFFmpeg, normalizePath } from './ffmpeg-utils'

export interface SilenceRegion {
  start: number
  end: number
  duration: number
}

/**
 * Detect silence regions in audio file using FFmpeg
 * Uses silencedetect filter with configurable noise threshold and minimum duration
 */
export async function detectSilences(
  filePath: string, 
  options: {
    noiseThreshold?: string  // e.g., "-35dB"
    minDuration?: number     // minimum silence duration in seconds
  } = {}
): Promise<SilenceRegion[]> {
  const noiseThreshold = options.noiseThreshold || "-35dB"
  const minDuration = (options.minDuration || 0.6).toString()

  console.log(`🔇 Detecting silences in: ${filePath}`)
  console.log(`   Threshold: ${noiseThreshold}, Min duration: ${minDuration}s`)

  try {
    const normalizedPath = normalizePath(filePath)
    
    // Use the cross-platform FFmpeg utility
    const result = await detectSilencesFFmpeg(normalizedPath, {
      noiseThreshold,
      minDuration,
      timeout: 60000
    })

    console.log(`✅ Found ${result.length} silence regions`)
    return result.map(r => ({
      start: r.start,
      end: r.end,
      duration: r.duration
    }))

  } catch (error: any) {
    console.error(`❌ Silence detection failed: ${error.message}`)
    throw error
  }
}

/**
 * Parse FFmpeg silence detection output
 * Extracts silence_start, silence_end, and silence_duration from stderr
 */
function parseSilenceOutput(stderr: string): SilenceRegion[] {
  const silences: SilenceRegion[] = []
  
  // Regex patterns for parsing FFmpeg silencedetect output
  const startRegex = /silence_start:\s*([0-9.]+)/g
  const endRegex = /silence_end:\s*([0-9.]+)\s*\|\s*silence_duration:\s*([0-9.]+)/g
  
  // Extract all silence starts
  const starts: number[] = []
  let startMatch
  while ((startMatch = startRegex.exec(stderr)) !== null) {
    starts.push(parseFloat(startMatch[1]))
  }
  
  // Extract all silence ends with durations
  const ends: Array<{ end: number; duration: number }> = []
  let endMatch
  while ((endMatch = endRegex.exec(stderr)) !== null) {
    ends.push({
      end: parseFloat(endMatch[1]),
      duration: parseFloat(endMatch[2])
    })
  }
  
  // Match starts with ends to create complete silence regions
  for (let i = 0; i < Math.min(starts.length, ends.length); i++) {
    const start = starts[i]
    const endData = ends[i]
    
    silences.push({
      start,
      end: endData.end,
      duration: endData.duration
    })
  }
  
  return silences
}

/**
 * Analyze silence distribution for bad take detection
 * Returns statistics about silence patterns that may indicate retakes or hesitations
 */
export function analyzeSilencePatterns(
  silences: SilenceRegion[],
  totalDuration: number
): {
  totalSilenceTime: number
  silenceRatio: number
  avgSilenceDuration: number
  longSilences: SilenceRegion[]  // > 2 seconds
  suspiciousGaps: SilenceRegion[] // May indicate retakes
} {
  if (silences.length === 0) {
    return {
      totalSilenceTime: 0,
      silenceRatio: 0,
      avgSilenceDuration: 0,
      longSilences: [],
      suspiciousGaps: []
    }
  }

  const totalSilenceTime = silences.reduce((sum, s) => sum + s.duration, 0)
  const silenceRatio = totalSilenceTime / Math.max(totalDuration, 0.001)
  const avgSilenceDuration = totalSilenceTime / silences.length

  // Long silences (> 2 seconds) may indicate retakes or technical issues
  const longSilences = silences.filter(s => s.duration > 2.0)
  
  // Suspicious gaps: unusually long for speech content (> 3 seconds)
  const suspiciousGaps = silences.filter(s => s.duration > 3.0)

  return {
    totalSilenceTime,
    silenceRatio,
    avgSilenceDuration,
    longSilences,
    suspiciousGaps
  }
}

/**
 * Test function for development/debugging
 */
export function testSilenceDetection() {
  const sampleOutput = `
[silencedetect @ 0x7f8b8c000000] silence_start: 2.345
[silencedetect @ 0x7f8b8c000000] silence_end: 4.567 | silence_duration: 2.222
[silencedetect @ 0x7f8b8c000000] silence_start: 10.123
[silencedetect @ 0x7f8b8c000000] silence_end: 12.456 | silence_duration: 2.333
  `
  
  const silences = parseSilenceOutput(sampleOutput)
  console.log('Test silences:', silences)
  
  const analysis = analyzeSilencePatterns(silences, 60) // 60 second total
  console.log('Silence analysis:', analysis)
}