// Test suite for subtitle generation functionality
import { 
  makeSrt, 
  validateSRT, 
  createSubtitleStats, 
  exportAsWebVTT, 
  quickSRT,
  makeSrtWithMinDuration,
  DEFAULT_SUBTITLE_OPTIONS,
  SubtitleOptions
} from './subtitles'
import { KeepSegment, KeepReason } from './types'

/**
 * Create test segments with various durations and scenarios
 */
function createTestSegments(): KeepSegment[] {
  return [
    {
      start_ms: 500,
      end_ms: 2800,
      transcript: "Welcome to our presentation about AI technology.",
      confidence: 0.95,
      reason: 'script_match' as KeepReason,
      reasonDetails: "Matches script content perfectly",
      originalSegmentIndex: 0
    },
    {
      start_ms: 3200,
      end_ms: 3450, // Very short - 250ms
      transcript: "Um.",
      confidence: 0.75,
      reason: 'filler_trim' as KeepReason,
      reasonDetails: "Kept minimal filler for natural flow",
      originalSegmentIndex: 1
    },
    {
      start_ms: 3800,
      end_ms: 4050, // Short - 250ms
      transcript: "So",
      confidence: 0.82,
      reason: 'natural_speech' as KeepReason,
      reasonDetails: "Natural transition word",
      originalSegmentIndex: 2
    },
    {
      start_ms: 4300,
      end_ms: 7500,
      transcript: "let's explore the key features and benefits of this system.",
      confidence: 0.92,
      reason: 'high_confidence' as KeepReason,
      reasonDetails: "High confidence clear speech",
      originalSegmentIndex: 3
    },
    {
      start_ms: 8000,
      end_ms: 8180, // Very short - 180ms
      transcript: "First",
      confidence: 0.88,
      reason: 'topic_relevant' as KeepReason,
      reasonDetails: "Important topic marker",
      originalSegmentIndex: 4
    },
    {
      start_ms: 8600,
      end_ms: 12200,
      transcript: "we need to understand the fundamental concepts that drive innovation in artificial intelligence.",
      confidence: 0.89,
      reason: 'script_match' as KeepReason,
      reasonDetails: "Core content from script",
      originalSegmentIndex: 5
    }
  ]
}

/**
 * Create test segments that are very close together (should merge)
 */
function createCloseSegments(): KeepSegment[] {
  return [
    {
      start_ms: 1000,
      end_ms: 1200, // 200ms
      transcript: "This",
      confidence: 0.9,
      reason: 'natural_speech' as KeepReason,
      reasonDetails: "Start of sentence",
      originalSegmentIndex: 0
    },
    {
      start_ms: 1250, // Only 50ms gap
      end_ms: 1450, // 200ms
      transcript: "is",
      confidence: 0.85,
      reason: 'natural_speech' as KeepReason,
      reasonDetails: "Continuation",
      originalSegmentIndex: 1
    },
    {
      start_ms: 1500, // 50ms gap
      end_ms: 1800, // 300ms
      transcript: "a test",
      confidence: 0.88,
      reason: 'natural_speech' as KeepReason,
      reasonDetails: "End of sentence",
      originalSegmentIndex: 2
    }
  ]
}

/**
 * Test basic SRT generation
 */
export function testBasicSRTGeneration() {
  console.log('🧪 Testing basic SRT generation...')
  
  const segments = createTestSegments()
  const srt = makeSrt(segments)
  
  console.log('📝 Generated SRT:')
  console.log(srt)
  
  // Validate the SRT structure
  const lines = srt.split('\n').filter(line => line.trim())
  const hasNumbers = lines.some(line => /^\d+$/.test(line))
  const hasTimestamps = lines.some(line => /\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}/.test(line))
  const hasText = lines.some(line => line.length > 0 && !/^\d+$/.test(line) && !/-->/.test(line))
  
  console.log('✅ SRT Validation:')
  console.log(`  Has cue numbers: ${hasNumbers ? '✅' : '❌'}`)
  console.log(`  Has timestamps: ${hasTimestamps ? '✅' : '❌'}`)
  console.log(`  Has text content: ${hasText ? '✅' : '❌'}`)
  console.log(`  Total lines: ${lines.length}`)
  
  return {
    success: hasNumbers && hasTimestamps && hasText,
    srt,
    validation: { hasNumbers, hasTimestamps, hasText, totalLines: lines.length }
  }
}

/**
 * Test minimum duration enforcement
 */
export function testMinimumDuration() {
  console.log('🧪 Testing minimum duration enforcement...')
  
  const segments = createTestSegments()
  
  // Count segments shorter than 300ms
  const shortSegments = segments.filter(seg => (seg.end_ms - seg.start_ms) < 300)
  console.log(`📊 Input: ${shortSegments.length} segments shorter than 300ms`)
  
  const srt = makeSrt(segments, { minCueDuration_ms: 300 })
  
  // Parse the SRT to check durations
  const cues = parseSRTCues(srt)
  const shortCues = cues.filter(cue => cue.duration < 300)
  
  console.log('✅ Duration Enforcement Results:')
  console.log(`  Input short segments: ${shortSegments.length}`)
  console.log(`  Output short cues: ${shortCues.length}`)
  console.log(`  Total cues: ${cues.length}`)
  console.log(`  Average duration: ${(cues.reduce((sum, c) => sum + c.duration, 0) / cues.length).toFixed(0)}ms`)
  
  // Show duration details
  cues.forEach((cue, index) => {
    console.log(`  Cue ${index + 1}: ${cue.duration}ms - "${cue.text.substring(0, 30)}${cue.text.length > 30 ? '...' : ''}"`)
  })
  
  return {
    success: shortCues.length === 0,
    inputShortSegments: shortSegments.length,
    outputShortCues: shortCues.length,
    totalCues: cues.length,
    cues
  }
}

/**
 * Test merging of close segments
 */
export function testSegmentMerging() {
  console.log('🧪 Testing segment merging for close neighbors...')
  
  const segments = createCloseSegments()
  console.log(`📊 Input: ${segments.length} close segments`)
  
  const srt = makeSrt(segments, { 
    minCueDuration_ms: 300,
    mergeThreshold_ms: 200 
  })
  
  const cues = parseSRTCues(srt)
  
  console.log('✅ Merging Results:')
  console.log(`  Input segments: ${segments.length}`)
  console.log(`  Output cues: ${cues.length}`)
  console.log(`  Segments merged: ${segments.length - cues.length}`)
  
  // Show merged content
  cues.forEach((cue, index) => {
    console.log(`  Merged cue ${index + 1}: ${cue.duration}ms - "${cue.text}"`)
  })
  
  const mergedSuccessfully = cues.length < segments.length
  const allMeetMinDuration = cues.every(cue => cue.duration >= 300)
  
  console.log(`  Merging occurred: ${mergedSuccessfully ? '✅' : '❌'}`)
  console.log(`  All meet min duration: ${allMeetMinDuration ? '✅' : '❌'}`)
  
  return {
    success: mergedSuccessfully && allMeetMinDuration,
    inputSegments: segments.length,
    outputCues: cues.length,
    merged: segments.length - cues.length,
    cues
  }
}

/**
 * Test SRT validation functionality
 */
export function testSRTValidation() {
  console.log('🧪 Testing SRT validation functionality...')
  
  const segments = createTestSegments()
  const srt = makeSrt(segments)
  const cues = parseSRTCues(srt).map((cue, index) => ({
    index: index + 1,
    startTime: formatTime(cue.startMs),
    endTime: formatTime(cue.endMs),
    text: cue.text,
    duration_ms: cue.duration,
    originalSegments: 1
  }))
  
  const validation = validateSRT(cues, DEFAULT_SUBTITLE_OPTIONS)
  
  console.log('✅ Validation Results:')
  console.log(`  Valid: ${validation.valid ? '✅' : '❌'}`)
  console.log(`  Issues found: ${validation.issues.length}`)
  console.log(`  Total cues: ${validation.stats.totalCues}`)
  console.log(`  Short cues: ${validation.stats.shortCues}`)
  console.log(`  Long cues: ${validation.stats.longCues}`)
  console.log(`  Average duration: ${validation.stats.averageDuration.toFixed(0)}ms`)
  
  if (validation.issues.length > 0) {
    console.log('\n⚠️ Issues found:')
    validation.issues.forEach(issue => {
      console.log(`  • ${issue}`)
    })
  }
  
  return {
    success: validation.valid,
    validation,
    cues
  }
}

/**
 * Test subtitle statistics generation
 */
export function testSubtitleStats() {
  console.log('🧪 Testing subtitle statistics generation...')
  
  const segments = createTestSegments()
  const srt = makeSrt(segments)
  const cues = parseSRTCues(srt).map((cue, index) => ({
    index: index + 1,
    startTime: formatTime(cue.startMs),
    endTime: formatTime(cue.endMs),
    text: cue.text,
    duration_ms: cue.duration,
    originalSegments: 1
  }))
  
  const stats = createSubtitleStats(cues)
  
  console.log('📊 Subtitle Statistics:')
  console.log(`  Total cues: ${stats.totalCues}`)
  console.log(`  Total duration: ${(stats.totalDuration_ms / 1000).toFixed(1)}s`)
  console.log(`  Average duration: ${stats.averageDuration_ms.toFixed(0)}ms`)
  console.log(`  Shortest cue: ${stats.shortestCue_ms}ms`)
  console.log(`  Longest cue: ${stats.longestCue_ms}ms`)
  console.log(`  Total words: ${stats.totalWords}`)
  console.log(`  Average words per cue: ${stats.averageWordsPerCue.toFixed(1)}`)
  console.log(`  Reading speed: ${stats.readingSpeed_wpm.toFixed(1)} WPM`)
  
  console.log('\n📈 Duration Coverage:')
  console.log(`  Under 500ms: ${stats.coverage.under_500ms}`)
  console.log(`  Under 1000ms: ${stats.coverage.under_1000ms}`)
  console.log(`  Over 3000ms: ${stats.coverage.over_3000ms}`)
  console.log(`  Over 5000ms: ${stats.coverage.over_5000ms}`)
  
  return {
    success: stats.totalCues > 0 && stats.averageDuration_ms >= 300,
    stats,
    cues
  }
}

/**
 * Test WebVTT export functionality
 */
export function testWebVTTExport() {
  console.log('🧪 Testing WebVTT export functionality...')
  
  const segments = createTestSegments().slice(0, 3) // Use fewer segments for cleaner output
  const srt = makeSrt(segments)
  const cues = parseSRTCues(srt).map((cue, index) => ({
    index: index + 1,
    startTime: formatTime(cue.startMs),
    endTime: formatTime(cue.endMs),
    text: cue.text,
    duration_ms: cue.duration,
    originalSegments: 1
  }))
  
  const webvtt = exportAsWebVTT(cues)
  
  console.log('📄 Generated WebVTT:')
  console.log(webvtt)
  
  const hasHeader = webvtt.startsWith('WEBVTT')
  const hasTimestamps = webvtt.includes(' --> ')
  const hasCueContent = cues.some(cue => webvtt.includes(cue.text))
  
  console.log('✅ WebVTT Validation:')
  console.log(`  Has WEBVTT header: ${hasHeader ? '✅' : '❌'}`)
  console.log(`  Has timestamps: ${hasTimestamps ? '✅' : '❌'}`)
  console.log(`  Has cue content: ${hasCueContent ? '✅' : '❌'}`)
  
  return {
    success: hasHeader && hasTimestamps && hasCueContent,
    webvtt,
    validation: { hasHeader, hasTimestamps, hasCueContent }
  }
}

/**
 * Test convenience functions
 */
export function testConvenienceFunctions() {
  console.log('🧪 Testing convenience functions...')
  
  const segments = createTestSegments()
  
  // Test quickSRT
  const quickSrt = quickSRT(segments)
  const quickCues = parseSRTCues(quickSrt)
  
  // Test makeSrtWithMinDuration
  const customSrt = makeSrtWithMinDuration(segments, 500)
  const customCues = parseSRTCues(customSrt)
  
  console.log('✅ Convenience Function Results:')
  console.log(`  quickSRT cues: ${quickCues.length}`)
  console.log(`  quickSRT min duration met: ${quickCues.every(c => c.duration >= 300) ? '✅' : '❌'}`)
  console.log(`  customSRT (500ms) cues: ${customCues.length}`)
  console.log(`  customSRT min duration met: ${customCues.every(c => c.duration >= 500) ? '✅' : '❌'}`)
  
  return {
    success: quickCues.length > 0 && customCues.length > 0,
    quickSrt: { cues: quickCues.length, validDuration: quickCues.every(c => c.duration >= 300) },
    customSrt: { cues: customCues.length, validDuration: customCues.every(c => c.duration >= 500) }
  }
}

/**
 * Parse SRT content back into cue objects for testing
 */
function parseSRTCues(srt: string): Array<{
  index: number
  startMs: number
  endMs: number
  text: string
  duration: number
}> {
  const cues = []
  const blocks = srt.split('\n\n').filter(block => block.trim())
  
  for (const block of blocks) {
    const lines = block.split('\n').filter(line => line.trim())
    if (lines.length >= 3) {
      const index = parseInt(lines[0])
      const timeMatch = lines[1].match(/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/)
      
      if (timeMatch) {
        const startMs = timeToMs(timeMatch[1])
        const endMs = timeToMs(timeMatch[2])
        const text = lines.slice(2).join('\n')
        
        cues.push({
          index,
          startMs,
          endMs,
          text,
          duration: endMs - startMs
        })
      }
    }
  }
  
  return cues
}

/**
 * Convert SRT time format to milliseconds
 */
function timeToMs(timeStr: string): number {
  const [time, ms] = timeStr.split(',')
  const [hours, minutes, seconds] = time.split(':').map(Number)
  return ((hours * 3600) + (minutes * 60) + seconds) * 1000 + Number(ms)
}

/**
 * Format milliseconds to SRT time format
 */
function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const milliseconds = ms % 1000
  const seconds = totalSeconds % 60
  const minutes = Math.floor(totalSeconds / 60) % 60
  const hours = Math.floor(totalSeconds / 3600)
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`
}

/**
 * Run all subtitle tests
 */
export async function runAllSubtitleTests() {
  console.log('🚀 Running comprehensive subtitle test suite...\n')
  
  const tests = [
    { name: 'Basic SRT Generation', test: testBasicSRTGeneration },
    { name: 'Minimum Duration', test: testMinimumDuration },
    { name: 'Segment Merging', test: testSegmentMerging },
    { name: 'SRT Validation', test: testSRTValidation },
    { name: 'Subtitle Statistics', test: testSubtitleStats },
    { name: 'WebVTT Export', test: testWebVTTExport },
    { name: 'Convenience Functions', test: testConvenienceFunctions }
  ]
  
  const results = []
  let passedTests = 0
  
  for (const { name, test } of tests) {
    console.log(`\n📋 Running ${name} test...`)
    try {
      const result = test()
      results.push({ name, ...result })
      if (result.success) {
        passedTests++
        console.log(`✅ ${name} test passed`)
      } else {
        console.log(`❌ ${name} test failed`)
      }
    } catch (error: any) {
      console.error(`💥 ${name} test threw exception:`, error)
      results.push({ name, success: false, error: error.message })
    }
  }
  
  const overallSuccess = passedTests === tests.length
  
  console.log(`\n🎯 Subtitle Test Suite Summary:`)
  console.log(`  Tests run: ${tests.length}`)
  console.log(`  Tests passed: ${passedTests}`)
  console.log(`  Tests failed: ${tests.length - passedTests}`)
  console.log(`  Success rate: ${((passedTests / tests.length) * 100).toFixed(1)}%`)
  console.log(`  Overall result: ${overallSuccess ? '🎉 ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`)
  
  return {
    success: overallSuccess,
    testResults: results,
    summary: {
      totalTests: tests.length,
      passedTests,
      failedTests: tests.length - passedTests,
      successRate: (passedTests / tests.length) * 100
    }
  }
}

/**
 * Demo function showing typical usage
 */
export function demonstrateSubtitleGeneration() {
  console.log('🎬 Demonstrating subtitle generation with real-world example...')
  
  const segments = createTestSegments()
  
  console.log('\n📊 Input Analysis:')
  console.log(`  Total segments: ${segments.length}`)
  segments.forEach((seg, index) => {
    const duration = seg.end_ms - seg.start_ms
    console.log(`  ${index + 1}. ${duration}ms: "${seg.transcript}"`)
  })
  
  console.log('\n🔄 Generating SRT with 300ms minimum duration...')
  const srt = makeSrt(segments, {
    minCueDuration_ms: 300,
    mergeThreshold_ms: 200,
    wordWrap: true,
    maxCharsPerLine: 42
  })
  
  console.log('\n📝 Generated SRT:')
  console.log('--- SRT CONTENT ---')
  console.log(srt)
  console.log('--- END SRT ---')
  
  const cues = parseSRTCues(srt)
  console.log('\n📈 Output Analysis:')
  console.log(`  Total cues: ${cues.length}`)
  console.log(`  Segments merged: ${segments.length - cues.length}`)
  console.log(`  All cues ≥300ms: ${cues.every(c => c.duration >= 300) ? '✅' : '❌'}`)
  console.log(`  Average duration: ${(cues.reduce((sum, c) => sum + c.duration, 0) / cues.length).toFixed(0)}ms`)
  
  return { segments, srt, cues }
}
