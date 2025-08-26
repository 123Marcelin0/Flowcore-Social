/**
 * Micro-segmentation Examples and Tests
 * Demonstrates the segmentTranscript function with various scenarios
 */

import { segmentTranscript, MicroSegment } from './align'

/**
 * Example 1: Basic micro-segmentation
 */
export function exampleBasicSegmentation() {
  console.log('📋 Example: Basic Micro-segmentation')
  
  const transcriptWords = [
    { text: "Hello", start: 1.2, end: 1.6 },
    { text: "world", start: 1.7, end: 2.1 },
    { text: "this", start: 2.7, end: 3.0 },
    { text: "is", start: 3.1, end: 3.2 },
    { text: "a", start: 3.3, end: 3.4 },
    { text: "test", start: 3.5, end: 3.9 }
  ]
  
  const segments = segmentTranscript(transcriptWords)
  
  console.log('📊 Input words:', transcriptWords.length)
  console.log('📊 Output segments:', segments.length)
  console.log('\n🎯 Segments:')
  segments.forEach((segment, index) => {
    const duration = segment.end - segment.start
    console.log(`  ${index + 1}. "${segment.text}" [${segment.start}s - ${segment.end}s] (${duration.toFixed(1)}s)`)
  })
  
  return segments
}

/**
 * Example 2: Punctuation-based segmentation
 */
export function examplePunctuationSegmentation() {
  console.log('\n📋 Example: Punctuation-based Segmentation')
  
  const transcriptWords = [
    { text: "Hello", start: 1.0, end: 1.3 },
    { text: "world.", start: 1.4, end: 1.8 }, // Period triggers break
    { text: "How", start: 1.9, end: 2.1 },
    { text: "are", start: 2.2, end: 2.4 },
    { text: "you?", start: 2.5, end: 2.8 }, // Question mark triggers break
    { text: "I'm", start: 2.9, end: 3.1 },
    { text: "fine!", start: 3.2, end: 3.6 }  // Exclamation triggers break
  ]
  
  const segments = segmentTranscript(transcriptWords)
  
  console.log('🎯 Punctuation triggers:')
  segments.forEach((segment, index) => {
    console.log(`  ${index + 1}. "${segment.text}" [${segment.start}s - ${segment.end}s]`)
  })
  
  // Expected: 3 segments ending at punctuation
  console.log(`✅ Expected 3 segments, got ${segments.length}`)
  
  return segments
}

/**
 * Example 3: Pause-based segmentation (>600ms gaps)
 */
export function examplePauseSegmentation() {
  console.log('\n📋 Example: Pause-based Segmentation (>600ms)')
  
  const transcriptWords = [
    { text: "First", start: 1.0, end: 1.3 },
    { text: "segment", start: 1.4, end: 1.8 },
    // 700ms pause here (1.8 → 2.5)
    { text: "Second", start: 2.5, end: 2.8 },
    { text: "segment", start: 2.9, end: 3.2 },
    // 800ms pause here (3.2 → 4.0)
    { text: "Third", start: 4.0, end: 4.3 },
    { text: "segment", start: 4.4, end: 4.7 }
  ]
  
  const segments = segmentTranscript(transcriptWords)
  
  console.log('⏸️ Pause-triggered breaks:')
  segments.forEach((segment, index) => {
    console.log(`  ${index + 1}. "${segment.text}" [${segment.start}s - ${segment.end}s]`)
  })
  
  // Check pause durations
  console.log('\n📊 Pause analysis:')
  for (let i = 0; i < transcriptWords.length - 1; i++) {
    const current = transcriptWords[i]
    const next = transcriptWords[i + 1]
    const pause = next.start - current.end
    console.log(`  ${current.text} → ${next.text}: ${(pause * 1000).toFixed(0)}ms pause`)
  }
  
  return segments
}

/**
 * Example 4: Duration-based segmentation (2-second limit)
 */
export function exampleDurationSegmentation() {
  console.log('\n📋 Example: Duration-based Segmentation (2s limit)')
  
  const transcriptWords = [
    { text: "This", start: 1.0, end: 1.2 },
    { text: "is", start: 1.3, end: 1.4 },
    { text: "a", start: 1.5, end: 1.6 },
    { text: "very", start: 1.7, end: 1.9 },
    { text: "long", start: 2.0, end: 2.2 },
    { text: "sentence", start: 2.3, end: 2.7 },
    { text: "that", start: 2.8, end: 3.0 },
    { text: "exceeds", start: 3.1, end: 3.5 }, // This should trigger 2s limit
    { text: "two", start: 3.6, end: 3.8 },
    { text: "seconds", start: 3.9, end: 4.3 },
    { text: "duration", start: 4.4, end: 4.8 }
  ]
  
  const segments = segmentTranscript(transcriptWords)
  
  console.log('⏱️ Duration-limited segments:')
  segments.forEach((segment, index) => {
    const duration = segment.end - segment.start
    const status = duration >= 2.0 ? '⚠️ ' : '✅ '
    console.log(`  ${index + 1}. ${status}"${segment.text}" [${segment.start}s - ${segment.end}s] (${duration.toFixed(1)}s)`)
  })
  
  return segments
}

/**
 * Example 5: Complex real-world scenario
 */
export function exampleRealWorldScenario() {
  console.log('\n📋 Example: Real-world Complex Scenario')
  
  const transcriptWords = [
    { text: "Welcome", start: 0.5, end: 0.9 },
    { text: "to", start: 1.0, end: 1.1 },
    { text: "our", start: 1.2, end: 1.4 },
    { text: "presentation.", start: 1.5, end: 2.1 }, // Punctuation break
    { text: "Today", start: 2.2, end: 2.5 },
    { text: "we'll", start: 2.6, end: 2.9 },
    { text: "explore", start: 3.0, end: 3.4 },
    { text: "artificial", start: 3.5, end: 4.0 },
    { text: "intelligence", start: 4.1, end: 4.8 }, // Should hit 2s limit around here
    // Long pause
    { text: "Machine", start: 6.0, end: 6.4 }, // 1.2s pause triggers break
    { text: "learning", start: 6.5, end: 6.9 },
    { text: "algorithms", start: 7.0, end: 7.6 },
    { text: "can", start: 7.7, end: 7.9 },
    { text: "help", start: 8.0, end: 8.3 },
    { text: "us!", start: 8.4, end: 8.7 }, // Punctuation break
    { text: "Let's", start: 8.8, end: 9.1 },
    { text: "get", start: 9.2, end: 9.4 },
    { text: "started", start: 9.5, end: 10.0 }
  ]
  
  const segments = segmentTranscript(transcriptWords)
  
  console.log('🌍 Real-world segmentation:')
  segments.forEach((segment, index) => {
    const duration = segment.end - segment.start
    const wordCount = segment.text.split(' ').length
    console.log(`  ${index + 1}. "${segment.text}"`)
    console.log(`     ⏱️ ${segment.start}s - ${segment.end}s (${duration.toFixed(1)}s)`)
    console.log(`     📊 ${wordCount} words`)
  })
  
  // Analysis
  const avgDuration = segments.reduce((sum, seg) => sum + (seg.end - seg.start), 0) / segments.length
  const maxDuration = Math.max(...segments.map(seg => seg.end - seg.start))
  const avgWordCount = segments.reduce((sum, seg) => sum + seg.text.split(' ').length, 0) / segments.length
  
  console.log('\n📊 Analysis:')
  console.log(`   Average duration: ${avgDuration.toFixed(1)}s`)
  console.log(`   Max duration: ${maxDuration.toFixed(1)}s`)
  console.log(`   Average words per segment: ${avgWordCount.toFixed(1)}`)
  console.log(`   Total segments: ${segments.length}`)
  
  return segments
}

/**
 * Example 6: Edge cases
 */
export function exampleEdgeCases() {
  console.log('\n📋 Example: Edge Cases')
  
  console.log('🔍 Test 1: Empty input')
  const emptyResult = segmentTranscript([])
  console.log(`   Empty array result: ${emptyResult.length} segments`)
  
  console.log('🔍 Test 2: Single word')
  const singleWord = segmentTranscript([{ text: "Hello", start: 1.0, end: 1.5 }])
  console.log(`   Single word result: ${singleWord.length} segments`)
  console.log(`   Content: "${singleWord[0]?.text}"`)
  
  console.log('🔍 Test 3: Multiple punctuation')
  const multiPunct = segmentTranscript([
    { text: "What?!", start: 1.0, end: 1.5 },
    { text: "Really...", start: 1.6, end: 2.2 },
    { text: "Yes:", start: 2.3, end: 2.6 }
  ])
  console.log(`   Multi-punctuation result: ${multiPunct.length} segments`)
  multiPunct.forEach((seg, i) => console.log(`     ${i + 1}. "${seg.text}"`))
  
  console.log('🔍 Test 4: Very short words with gaps')
  const shortWords = segmentTranscript([
    { text: "I", start: 1.0, end: 1.1 },
    { text: "am", start: 1.2, end: 1.3 },
    { text: "ok", start: 2.0, end: 2.1 }, // 700ms gap
    { text: "now", start: 2.2, end: 2.4 }
  ])
  console.log(`   Short words with gaps: ${shortWords.length} segments`)
  shortWords.forEach((seg, i) => console.log(`     ${i + 1}. "${seg.text}" [${seg.start}s-${seg.end}s]`))
  
  return {
    emptyResult,
    singleWord,
    multiPunct,
    shortWords
  }
}

/**
 * Test function format compliance
 */
export function testOutputFormat() {
  console.log('\n📋 Test: Output Format Compliance')
  
  const testWords = [
    { text: "Hello", start: 1.2, end: 1.6 },
    { text: "world", start: 1.7, end: 2.1 },
    { text: "This", start: 2.7, end: 3.0 },
    { text: "is", start: 3.1, end: 3.2 },
    { text: "a", start: 3.3, end: 3.4 },
    { text: "test", start: 3.5, end: 4.5 }
  ]
  
  const segments = segmentTranscript(testWords)
  
  console.log('✅ Expected format verification:')
  segments.forEach((segment, index) => {
    const hasText = typeof segment.text === 'string' && segment.text.length > 0
    const hasStart = typeof segment.start === 'number' && segment.start >= 0
    const hasEnd = typeof segment.end === 'number' && segment.end > segment.start
    
    console.log(`  Segment ${index + 1}: ${JSON.stringify(segment)}`)
    console.log(`    ✅ text: ${hasText ? 'string' : '❌ invalid'}`)
    console.log(`    ✅ start: ${hasStart ? 'number' : '❌ invalid'}`)
    console.log(`    ✅ end: ${hasEnd ? 'number > start' : '❌ invalid'}`)
  })
  
  // Show exact expected format
  console.log('\n📋 Exact expected format:')
  console.log('[')
  segments.forEach((segment, index) => {
    const comma = index < segments.length - 1 ? ',' : ''
    console.log(`  { text: "${segment.text}", start: ${segment.start}, end: ${segment.end} }${comma}`)
  })
  console.log(']')
  
  return segments
}

/**
 * Performance test with large transcript
 */
export function testPerformance() {
  console.log('\n📋 Test: Performance with Large Transcript')
  
  // Generate a large transcript (1000 words)
  const largeTranscript = []
  for (let i = 0; i < 1000; i++) {
    largeTranscript.push({
      text: `word${i}`,
      start: i * 0.5,
      end: i * 0.5 + 0.4
    })
  }
  
  console.log(`📊 Testing with ${largeTranscript.length} words...`)
  
  const startTime = performance.now()
  const segments = segmentTranscript(largeTranscript)
  const endTime = performance.now()
  
  const processingTime = endTime - startTime
  console.log(`⏱️ Processing time: ${processingTime.toFixed(2)}ms`)
  console.log(`📊 Output segments: ${segments.length}`)
  console.log(`📊 Words per segment: ${(largeTranscript.length / segments.length).toFixed(1)}`)
  console.log(`📊 Average segment duration: ${(segments.reduce((sum, seg) => sum + (seg.end - seg.start), 0) / segments.length).toFixed(1)}s`)
  
  return {
    processingTime,
    segmentCount: segments.length,
    wordsPerSegment: largeTranscript.length / segments.length
  }
}

/**
 * Run all examples
 */
export function runAllSegmentationExamples() {
  console.log('🚀 Running All Micro-segmentation Examples\n')
  
  const results = {
    basic: exampleBasicSegmentation(),
    punctuation: examplePunctuationSegmentation(),
    pause: examplePauseSegmentation(),
    duration: exampleDurationSegmentation(),
    realWorld: exampleRealWorldScenario(),
    edgeCases: exampleEdgeCases(),
    format: testOutputFormat(),
    performance: testPerformance()
  }
  
  console.log('\n🎉 All examples completed!')
  console.log('\n📊 Summary:')
  console.log(`  Basic segmentation: ${results.basic.length} segments`)
  console.log(`  Punctuation breaks: ${results.punctuation.length} segments`)
  console.log(`  Pause breaks: ${results.pause.length} segments`)
  console.log(`  Duration limits: ${results.duration.length} segments`)
  console.log(`  Real-world scenario: ${results.realWorld.length} segments`)
  console.log(`  Performance test: ${results.performance.processingTime.toFixed(2)}ms`)
  
  return results
}

/**
 * Quick usage demo
 */
export function quickUsageDemo() {
  console.log('⚡ Quick Usage Demo\n')
  
  console.log('📝 Import:')
  console.log('import { segmentTranscript } from "./lib/align"')
  
  console.log('\n📝 Basic usage:')
  console.log(`
const words = [
  { text: "Hello", start: 1.2, end: 1.6 },
  { text: "world", start: 1.7, end: 2.1 }
]

const segments = segmentTranscript(words)
// Result: [{ text: "Hello world", start: 1.2, end: 2.1 }]
  `)
  
  console.log('🎯 Segmentation Rules:')
  console.log('  ✅ Max 2 seconds duration')
  console.log('  ✅ Break at punctuation (.,?!:)')
  console.log('  ✅ Break at pause >600ms')
  console.log('  ✅ Precise start/end timestamps')
  
  console.log('\n📊 Output Format:')
  console.log('  { text: string, start: number, end: number }')
  
  return 'Demo complete'
}

// Export for easy testing
export const segmentationExamples = {
  exampleBasicSegmentation,
  examplePunctuationSegmentation,
  examplePauseSegmentation,
  exampleDurationSegmentation,
  exampleRealWorldScenario,
  exampleEdgeCases,
  testOutputFormat,
  testPerformance,
  runAllSegmentationExamples,
  quickUsageDemo
}
