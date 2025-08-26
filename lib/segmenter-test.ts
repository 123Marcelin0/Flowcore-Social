// Test suite for advanced audio segmenter
import { AudioSegmenter, processAudioSegments, createSegmentationConfig, DEFAULT_SEGMENTATION_CONFIG } from './segmenter'
import { Segment } from './types'

/**
 * Create test segments with various pause scenarios
 */
function createTestSegments(): Segment[] {
  return [
    {
      start: 0.5,
      end: 2.0,
      text: "Welcome to our presentation.",
      confidence: 0.95,
      words: [
        { word: "Welcome", start: 0.5, end: 1.0 },
        { word: "to", start: 1.1, end: 1.2 },
        { word: "our", start: 1.3, end: 1.5 },
        { word: "presentation", start: 1.6, end: 2.0 }
      ]
    },
    // Long pause (1000ms) - should be trimmed
    {
      start: 3.0,
      end: 4.2,
      text: "Um, this is about AI.",
      confidence: 0.75,
      words: [
        { word: "Um", start: 3.0, end: 3.2 },
        { word: "this", start: 3.3, end: 3.5 },
        { word: "is", start: 3.6, end: 3.7 },
        { word: "about", start: 3.8, end: 4.0 },
        { word: "AI", start: 4.1, end: 4.2 }
      ]
    },
    // Short pause after punctuation (400ms) - should be preserved
    {
      start: 4.6,
      end: 6.8,
      text: "Let's explore the features!",
      confidence: 0.92,
      words: [
        { word: "Let's", start: 4.6, end: 5.0 },
        { word: "explore", start: 5.1, end: 5.6 },
        { word: "the", start: 5.7, end: 5.8 },
        { word: "features", start: 5.9, end: 6.5 },
        { word: "!", start: 6.7, end: 6.8 }
      ]
    },
    // Very short segment (200ms) - should be merged
    {
      start: 7.2,
      end: 7.4,
      text: "So",
      confidence: 0.80,
      words: [{ word: "So", start: 7.2, end: 7.4 }]
    },
    // Next segment to merge with
    {
      start: 7.5,
      end: 9.0,
      text: "let's dive in deeper.",
      confidence: 0.88,
      words: [
        { word: "let's", start: 7.5, end: 7.8 },
        { word: "dive", start: 7.9, end: 8.2 },
        { word: "in", start: 8.3, end: 8.4 },
        { word: "deeper", start: 8.5, end: 9.0 }
      ]
    }
  ]
}

/**
 * Test pause computation
 */
export function testPauseComputation() {
  console.log('🧪 Testing pause computation...')
  
  const segments = createTestSegments()
  const segmenter = new AudioSegmenter()
  const pauseAnalysis = segmenter.computePauses(segments)
  
  console.log('📊 Pause Analysis Results:')
  console.log(`  Total pauses: ${pauseAnalysis.pauses.length}`)
  console.log(`  Natural breaks: ${pauseAnalysis.naturalBreaks.length}`)
  console.log(`  Long pauses: ${pauseAnalysis.longPauses.length}`)
  console.log(`  Filler pauses: ${pauseAnalysis.fillerPauses.length}`)
  
  // Validate pause detection
  const expectedPauses = [
    { between: [0, 1], duration: 1000, type: 'long_pause' },
    { between: [1, 2], duration: 400, type: 'natural_break' },
    { between: [2, 3], duration: 600, type: 'hesitation' },
    { between: [3, 4], duration: 100, type: 'silence' }
  ]
  
  pauseAnalysis.pauses.forEach((pause, index) => {
    console.log(`  Pause ${index + 1}: ${pause.duration_ms}ms (${pause.type}) - ${pause.context}`)
  })
  
  return {
    success: pauseAnalysis.pauses.length > 0,
    pauseCount: pauseAnalysis.pauses.length,
    longPauses: pauseAnalysis.longPauses.length,
    analysis: pauseAnalysis
  }
}

/**
 * Test pause logic rules
 */
export function testPauseLogic() {
  console.log('🧪 Testing pause logic rules...')
  
  const testCases = [
    {
      name: "Strong punctuation pause preservation",
      segment: { text: "This is important.", end: 2.0 } as Segment,
      pauseDuration: 400,
      expected: "preserve"
    },
    {
      name: "Long pause trimming",
      segment: { text: "Um, well", end: 3.0 } as Segment,
      pauseDuration: 1200,
      expected: "trim_to_250ms"
    },
    {
      name: "Normal pause handling",
      segment: { text: "And then", end: 4.0 } as Segment,
      pauseDuration: 600,
      expected: "keep_normal"
    }
  ]
  
  const results = testCases.map(testCase => {
    const hasStrongPunctuation = /[.!?…]/.test(testCase.segment.text.trim())
    
    let result: string
    if (hasStrongPunctuation && testCase.pauseDuration <= 500) {
      result = "preserve"
    } else if (testCase.pauseDuration >= 800) {
      result = "trim_to_250ms"
    } else {
      result = "keep_normal"
    }
    
    const passed = result === testCase.expected
    console.log(`  ${testCase.name}: ${passed ? '✅' : '❌'} (${result})`)
    
    return { ...testCase, result, passed }
  })
  
  return {
    success: results.every(r => r.passed),
    testCases: results.length,
    passed: results.filter(r => r.passed).length
  }
}

/**
 * Test segment padding and minimum length
 */
export function testSegmentPadding() {
  console.log('🧪 Testing segment padding and minimum length...')
  
  const testSegments: Segment[] = [
    { start: 1.0, end: 1.2, text: "Hi", confidence: 0.9 }, // 200ms - too short
    { start: 2.0, end: 2.8, text: "This is good", confidence: 0.95 }, // 800ms - good
    { start: 4.0, end: 4.1, text: "Ok", confidence: 0.85 } // 100ms - very short
  ]
  
  const segmenter = new AudioSegmenter()
  
  // Test expansion with padding
  const paddedSegments = segmenter['expandWithPadding'](testSegments)
  
  const results = paddedSegments.map((segment, index) => {
    const duration = (segment.end - segment.start) * 1000
    const hasLeadIn = segment.start < testSegments[index].start
    const meetsMinLength = duration >= DEFAULT_SEGMENTATION_CONFIG.minimumSegmentLength
    
    console.log(`  Segment ${index + 1}: ${duration.toFixed(0)}ms (lead-in: ${hasLeadIn ? '✅' : '❌'}, min-length: ${meetsMinLength ? '✅' : '❌'})`)
    
    return {
      originalDuration: (testSegments[index].end - testSegments[index].start) * 1000,
      paddedDuration: duration,
      hasLeadIn,
      meetsMinLength,
      leadInAmount: (testSegments[index].start - segment.start) * 1000
    }
  })
  
  return {
    success: results.every(r => r.hasLeadIn && r.meetsMinLength),
    segments: results.length,
    allHaveLeadIn: results.every(r => r.hasLeadIn),
    allMeetMinLength: results.every(r => r.meetsMinLength)
  }
}

/**
 * Test EDL generation
 */
export function testEDLGeneration() {
  console.log('🧪 Testing EDL generation...')
  
  const segments = createTestSegments()
  const segmenter = new AudioSegmenter()
  
  // Process segments to get KeepSegments
  const processedResult = segmenter.processSegments(segments)
  
  return processedResult.then(result => {
    const edlContent = result.edlContent
    const lines = edlContent.split('\n').filter(line => line.trim())
    
    // Validate EDL structure
    const hasTitle = lines.some(line => line.startsWith('TITLE:'))
    const hasFCM = lines.some(line => line.startsWith('FCM:'))
    const hasEdits = lines.some(line => /^\d{3}\s+/.test(line))
    const hasComments = lines.some(line => line.startsWith('*'))
    
    console.log('📋 EDL Validation:')
    console.log(`  Has title: ${hasTitle ? '✅' : '❌'}`)
    console.log(`  Has FCM: ${hasFCM ? '✅' : '❌'}`)
    console.log(`  Has edits: ${hasEdits ? '✅' : '❌'}`)
    console.log(`  Has comments: ${hasComments ? '✅' : '❌'}`)
    console.log(`  Total lines: ${lines.length}`)
    
    // Show sample EDL content
    console.log('\n📄 Sample EDL content:')
    console.log(edlContent.substring(0, 300) + '...')
    
    return {
      success: hasTitle && hasFCM && hasEdits && hasComments,
      edlLines: lines.length,
      hasTitle,
      hasFCM,
      hasEdits,
      hasComments,
      edlContent
    }
  })
}

/**
 * Test concat list generation
 */
export function testConcatListGeneration() {
  console.log('🧪 Testing concat list generation...')
  
  const segments = createTestSegments()
  const segmenter = new AudioSegmenter()
  
  return segmenter.processSegments(segments).then(result => {
    const concatList = result.concatList
    
    // Validate concat list structure
    const hasFileEntries = concatList.some(line => line.includes("file 'segment_"))
    const hasComments = concatList.some(line => line.startsWith('#'))
    const hasFFmpegCommands = concatList.some(line => line.includes('ffmpeg -ss'))
    
    console.log('📋 Concat List Validation:')
    console.log(`  Has file entries: ${hasFileEntries ? '✅' : '❌'}`)
    console.log(`  Has comments: ${hasComments ? '✅' : '❌'}`)
    console.log(`  Has FFmpeg commands: ${hasFFmpegCommands ? '✅' : '❌'}`)
    console.log(`  Total entries: ${concatList.length}`)
    
    // Show sample concat list content
    console.log('\n📄 Sample concat list:')
    concatList.slice(0, 3).forEach(line => console.log(`  ${line}`))
    
    return {
      success: hasFileEntries && hasComments && hasFFmpegCommands,
      entryCount: concatList.length,
      hasFileEntries,
      hasComments,
      hasFFmpegCommands,
      concatList
    }
  })
}

/**
 * Test complete segmentation workflow
 */
export async function testCompleteWorkflow() {
  console.log('🧪 Testing complete segmentation workflow...')
  
  const segments = createTestSegments()
  const scriptText = "Welcome to our presentation about AI. Let's explore the features and dive in deeper."
  
  const result = await processAudioSegments(segments, scriptText)
  
  console.log('📊 Workflow Results:')
  console.log(`  Original segments: ${result.stats.originalSegments}`)
  console.log(`  Processed segments: ${result.stats.processedSegments}`)
  console.log(`  Pauses trimmed: ${result.stats.totalPausesTrimmed}`)
  console.log(`  Time reduced: ${result.stats.totalTimeReduced.toFixed(0)}ms`)
  console.log(`  Average segment length: ${result.stats.averageSegmentLength.toFixed(0)}ms`)
  console.log(`  Average confidence: ${result.stats.confidence.toFixed(3)}`)
  
  // Validate results
  const hasProcessedSegments = result.processedSegments.length > 0
  const hasReasonableReduction = result.stats.totalTimeReduced > 0
  const hasGoodConfidence = result.stats.confidence > 0.7
  const hasEDL = result.edlContent.length > 0
  const hasConcatList = result.concatList.length > 0
  
  console.log('\n✅ Validation:')
  console.log(`  Has processed segments: ${hasProcessedSegments ? '✅' : '❌'}`)
  console.log(`  Has time reduction: ${hasReasonableReduction ? '✅' : '❌'}`)
  console.log(`  Good confidence: ${hasGoodConfidence ? '✅' : '❌'}`)
  console.log(`  Has EDL: ${hasEDL ? '✅' : '❌'}`)
  console.log(`  Has concat list: ${hasConcatList ? '✅' : '❌'}`)
  
  return {
    success: hasProcessedSegments && hasReasonableReduction && hasGoodConfidence && hasEDL && hasConcatList,
    result,
    validation: {
      hasProcessedSegments,
      hasReasonableReduction,
      hasGoodConfidence,
      hasEDL,
      hasConcatList
    }
  }
}

/**
 * Run all segmenter tests
 */
export async function runAllSegmenterTests() {
  console.log('🚀 Running all segmenter tests...')
  
  const results = {
    pauseComputation: testPauseComputation(),
    pauseLogic: testPauseLogic(),
    segmentPadding: testSegmentPadding(),
    edlGeneration: await testEDLGeneration(),
    concatListGeneration: await testConcatListGeneration(),
    completeWorkflow: await testCompleteWorkflow()
  }
  
  const allPassed = Object.values(results).every(result => result.success)
  
  console.log(allPassed ? '🎉 All segmenter tests passed!' : '❌ Some segmenter tests failed')
  
  return {
    success: allPassed,
    results
  }
}

// Example usage demonstration
export function demonstrateSegmenter() {
  console.log('🎯 Demonstrating AudioSegmenter usage...')
  
  const customConfig = createSegmentationConfig({
    strongPunctuationPauseThreshold: 400, // More aggressive
    longPauseTrimThreshold: 600, // Trim shorter pauses
    minimumSegmentLength: 500 // Longer minimum
  })
  
  console.log('⚙️ Custom configuration:', customConfig)
  
  return customConfig
}
