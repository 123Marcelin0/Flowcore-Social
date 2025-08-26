// Comprehensive test suite for LLM-based dialogue decision engine
import { makeEditingDecision, decideFast, decideBatch } from './decide'
import { DecisionInput, DecisionOutput, DEFAULT_DECISION_POLICY, Transcript, Segment, Word } from './types'

/**
 * Test data generators
 */
export function createTestTranscript(): Transcript {
  const segments: Segment[] = [
    {
      start: 0.5,
      end: 3.2,
      text: "Welcome to our presentation about AI technology.",
      confidence: 0.95,
      words: [
        { word: "Welcome", start: 0.5, end: 1.0 },
        { word: "to", start: 1.1, end: 1.2 },
        { word: "our", start: 1.3, end: 1.5 },
        { word: "presentation", start: 1.6, end: 2.3 },
        { word: "about", start: 2.4, end: 2.7 },
        { word: "AI", start: 2.8, end: 3.0 },
        { word: "technology", start: 3.1, end: 3.2 }
      ]
    },
    {
      start: 4.0,
      end: 7.5,
      text: "Um, this is going to be, uh, really exciting.",
      confidence: 0.78,
      words: [
        { word: "Um", start: 4.0, end: 4.3 },
        { word: "this", start: 4.5, end: 4.7 },
        { word: "is", start: 4.8, end: 4.9 },
        { word: "going", start: 5.0, end: 5.3 },
        { word: "to", start: 5.4, end: 5.5 },
        { word: "be", start: 5.6, end: 5.8 },
        { word: "uh", start: 6.0, end: 6.2 },
        { word: "really", start: 6.5, end: 6.9 },
        { word: "exciting", start: 7.0, end: 7.5 }
      ]
    },
    {
      start: 8.0,
      end: 11.2,
      text: "Let's explore the key features and benefits.",
      confidence: 0.92,
      words: [
        { word: "Let's", start: 8.0, end: 8.4 },
        { word: "explore", start: 8.5, end: 9.0 },
        { word: "the", start: 9.1, end: 9.2 },
        { word: "key", start: 9.3, end: 9.6 },
        { word: "features", start: 9.7, end: 10.3 },
        { word: "and", start: 10.4, end: 10.5 },
        { word: "benefits", start: 10.6, end: 11.2 }
      ]
    },
    {
      start: 12.0,
      end: 15.8,
      text: "First, let me talk about the innovation aspect.",
      confidence: 0.89,
      words: [
        { word: "First", start: 12.0, end: 12.4 },
        { word: "let", start: 12.6, end: 12.8 },
        { word: "me", start: 12.9, end: 13.0 },
        { word: "talk", start: 13.1, end: 13.4 },
        { word: "about", start: 13.5, end: 13.8 },
        { word: "the", start: 13.9, end: 14.0 },
        { word: "innovation", start: 14.1, end: 14.9 },
        { word: "aspect", start: 15.0, end: 15.8 }
      ]
    },
    {
      start: 16.5,
      end: 18.2,
      text: "So, you know, it's really important.",
      confidence: 0.71,
      words: [
        { word: "So", start: 16.5, end: 16.7 },
        { word: "you", start: 16.9, end: 17.1 },
        { word: "know", start: 17.2, end: 17.4 },
        { word: "it's", start: 17.6, end: 17.8 },
        { word: "really", start: 17.9, end: 18.0 },
        { word: "important", start: 18.1, end: 18.2 }
      ]
    }
  ]
  
  return {
    text: segments.map(s => s.text).join(' '),
    segments,
    language: 'en',
    duration: 18.2
  }
}

export function createTestTranscriptWithDuplicates(): Transcript {
  return {
    text: "This is the first take. This is the second take, better version. This is the final version.",
    segments: [
      {
        start: 0.0,
        end: 2.5,
        text: "This is the first take.",
        confidence: 0.75
      },
      {
        start: 3.0,
        end: 6.8,
        text: "This is the second take, better version.",
        confidence: 0.88
      },
      {
        start: 7.5,
        end: 10.2,
        text: "This is the final version.",
        confidence: 0.92
      }
    ],
    language: 'en',
    duration: 10.2
  }
}

export function createTestScript(): string {
  return `Welcome to our presentation about AI technology. This is going to be really exciting. Let's explore the key features and benefits. First, let me talk about the innovation aspect. It's really important to understand the possibilities.`
}

/**
 * Test LLM decision making with script matching
 */
export async function testScriptMatching() {
  console.log('🧪 Testing script matching capabilities...')
  
  const transcript = createTestTranscript()
  const script = createTestScript()
  
  const input: DecisionInput = {
    transcript,
    scriptText: script,
    policy: {
      ...DEFAULT_DECISION_POLICY,
      scriptMatchWeight: 0.8,
      semanticSimilarityThreshold: 0.7,
      removeFiller: true
    },
    metadata: {
      videoId: 'test-script-matching',
      originalDuration_ms: transcript.duration! * 1000
    }
  }
  
  try {
    const decision = await makeEditingDecision(input)
    
    console.log('📊 Script Matching Results:')
    console.log(`  Segments kept: ${decision.keepSegments.length}/${decision.stats.totalSegments}`)
    console.log(`  Script matches: ${decision.stats.reasonCounts.script_match}`)
    console.log(`  Filler trims: ${decision.stats.reasonCounts.filler_trim}`)
    console.log(`  Reduction: ${decision.stats.reductionPercentage.toFixed(1)}%`)
    console.log(`  Processing time: ${decision.analysisMetadata.processingTime_ms}ms`)
    
    // Validate script matching behavior
    const scriptMatchSegments = decision.keepSegments.filter(seg => seg.reason === 'script_match')
    const hasScriptMatches = scriptMatchSegments.length > 0
    const removedFillerWords = decision.stats.reasonCounts.filler_trim > 0
    
    console.log('\n✅ Validation:')
    console.log(`  Has script matches: ${hasScriptMatches ? '✅' : '❌'}`)
    console.log(`  Removed filler words: ${removedFillerWords ? '✅' : '❌'}`)
    console.log(`  Valid JSON structure: ${!!decision.keepSegments ? '✅' : '❌'}`)
    
    // Show sample kept segments
    console.log('\n📝 Sample kept segments:')
    decision.keepSegments.slice(0, 3).forEach((seg, i) => {
      console.log(`  ${i + 1}. [${seg.reason}] "${seg.transcript}"`)
    })
    
    return {
      success: hasScriptMatches && decision.keepSegments.length > 0,
      decision,
      validation: {
        hasScriptMatches,
        removedFillerWords,
        validStructure: !!decision.keepSegments
      }
    }
    
  } catch (error: any) {
    console.error('❌ Script matching test failed:', error)
    return {
      success: false,
      error: error.message,
      decision: null
    }
  }
}

/**
 * Test filler word removal without script
 */
export async function testFillerRemoval() {
  console.log('🧪 Testing filler word removal without script...')
  
  const transcript = createTestTranscript()
  
  const input: DecisionInput = {
    transcript,
    // No script provided
    policy: {
      ...DEFAULT_DECISION_POLICY,
      removeFiller: true,
      removeHesitations: true,
      useAISummary: true,
      minConfidence: 0.75
    },
    metadata: {
      videoId: 'test-filler-removal',
      originalDuration_ms: transcript.duration! * 1000
    }
  }
  
  try {
    const decision = await makeEditingDecision(input)
    
    console.log('📊 Filler Removal Results:')
    console.log(`  Original segments: ${decision.stats.totalSegments}`)
    console.log(`  Kept segments: ${decision.stats.segmentsKept}`)
    console.log(`  Removed segments: ${decision.stats.segmentsRemoved}`)
    console.log(`  Filler words removed: ${decision.stats.fillerWordsRemoved}`)
    console.log(`  AI summary segments: ${decision.stats.reasonCounts.ai_summary}`)
    console.log(`  Natural speech kept: ${decision.stats.reasonCounts.natural_speech}`)
    
    // Check if filler segments were properly handled
    const originalFillerSegment = transcript.segments.find(s => 
      s.text.includes('Um,') || s.text.includes('uh,')
    )
    const keptFillerSegments = decision.keepSegments.filter(seg => 
      seg.transcript.includes('Um,') || seg.transcript.includes('uh,')
    )
    
    const fillerWasRemoved = originalFillerSegment && keptFillerSegments.length === 0
    const hasAISummary = decision.stats.reasonCounts.ai_summary > 0
    
    console.log('\n✅ Validation:')
    console.log(`  Filler words removed: ${fillerWasRemoved ? '✅' : '❌'}`)
    console.log(`  AI summary used: ${hasAISummary ? '✅' : '❌'}`)
    console.log(`  Significant reduction: ${decision.stats.reductionPercentage > 10 ? '✅' : '❌'}`)
    
    return {
      success: fillerWasRemoved && hasAISummary,
      decision,
      validation: {
        fillerWasRemoved,
        hasAISummary,
        significantReduction: decision.stats.reductionPercentage > 10
      }
    }
    
  } catch (error: any) {
    console.error('❌ Filler removal test failed:', error)
    return {
      success: false,
      error: error.message,
      decision: null
    }
  }
}

/**
 * Test duplicate detection and best take selection
 */
export async function testDuplicateDetection() {
  console.log('🧪 Testing duplicate detection and best take selection...')
  
  const transcript = createTestTranscriptWithDuplicates()
  
  const input: DecisionInput = {
    transcript,
    policy: {
      ...DEFAULT_DECISION_POLICY,
      enableDeduplication: true,
      similarityThresholdForDupes: 0.7,
      preferLaterTakes: true
    },
    metadata: {
      videoId: 'test-duplicate-detection',
      originalDuration_ms: transcript.duration! * 1000
    }
  }
  
  try {
    const decision = await makeEditingDecision(input)
    
    console.log('📊 Duplicate Detection Results:')
    console.log(`  Original segments: ${decision.stats.totalSegments}`)
    console.log(`  Kept segments: ${decision.stats.segmentsKept}`)
    console.log(`  Duplicates removed: ${decision.stats.duplicatesRemoved}`)
    console.log(`  Best takes selected: ${decision.stats.reasonCounts.dedupe_best_take}`)
    
    // Check if the best version was kept
    const bestTakeSegments = decision.keepSegments.filter(seg => seg.reason === 'dedupe_best_take')
    const finalVersionKept = decision.keepSegments.some(seg => seg.transcript.includes('final version'))
    
    console.log('\n✅ Validation:')
    console.log(`  Best takes identified: ${bestTakeSegments.length > 0 ? '✅' : '❌'}`)
    console.log(`  Final version kept: ${finalVersionKept ? '✅' : '❌'}`)
    console.log(`  Duplicates removed: ${decision.stats.duplicatesRemoved > 0 ? '✅' : '❌'}`)
    
    return {
      success: bestTakeSegments.length > 0 && decision.stats.duplicatesRemoved > 0,
      decision,
      validation: {
        bestTakesIdentified: bestTakeSegments.length > 0,
        finalVersionKept,
        duplicatesRemoved: decision.stats.duplicatesRemoved > 0
      }
    }
    
  } catch (error: any) {
    console.error('❌ Duplicate detection test failed:', error)
    return {
      success: false,
      error: error.message,
      decision: null
    }
  }
}

/**
 * Test JSON validation and markdown fence handling
 */
export async function testJSONValidation() {
  console.log('🧪 Testing JSON validation and error handling...')
  
  // Test with a minimal transcript to focus on JSON handling
  const simpleTranscript: Transcript = {
    text: "Hello world. This is a test.",
    segments: [
      { start: 0, end: 2, text: "Hello world.", confidence: 0.9 },
      { start: 2.5, end: 4, text: "This is a test.", confidence: 0.85 }
    ],
    duration: 4
  }
  
  const input: DecisionInput = {
    transcript: simpleTranscript,
    policy: DEFAULT_DECISION_POLICY,
    metadata: {
      videoId: 'test-json-validation',
      originalDuration_ms: 4000
    }
  }
  
  try {
    const decision = await makeEditingDecision(input)
    
    // Validate JSON structure completeness
    const hasRequiredFields = !!(
      decision.keepSegments &&
      decision.pauseList &&
      decision.analysisMetadata &&
      decision.stats &&
      decision.stats.reasonCounts
    )
    
    const validTimestamps = decision.keepSegments.every(seg => 
      typeof seg.start_ms === 'number' && 
      typeof seg.end_ms === 'number' &&
      seg.end_ms > seg.start_ms
    )
    
    const validConfidenceScores = decision.keepSegments.every(seg =>
      typeof seg.confidence === 'number' &&
      seg.confidence >= 0 &&
      seg.confidence <= 1
    )
    
    const validReasonCodes = decision.keepSegments.every(seg =>
      typeof seg.reason === 'string' &&
      ['script_match', 'dedupe_best_take', 'filler_trim', 'pause_trim', 
       'ai_summary', 'high_confidence', 'natural_speech', 'topic_relevant', 
       'transition_keep', 'fallback_keep'].includes(seg.reason)
    )
    
    console.log('📊 JSON Validation Results:')
    console.log(`  Has required fields: ${hasRequiredFields ? '✅' : '❌'}`)
    console.log(`  Valid timestamps: ${validTimestamps ? '✅' : '❌'}`)
    console.log(`  Valid confidence scores: ${validConfidenceScores ? '✅' : '❌'}`)
    console.log(`  Valid reason codes: ${validReasonCodes ? '✅' : '❌'}`)
    console.log(`  Processing time recorded: ${decision.analysisMetadata.processingTime_ms > 0 ? '✅' : '❌'}`)
    
    return {
      success: hasRequiredFields && validTimestamps && validConfidenceScores && validReasonCodes,
      decision,
      validation: {
        hasRequiredFields,
        validTimestamps,
        validConfidenceScores,
        validReasonCodes
      }
    }
    
  } catch (error: any) {
    console.error('❌ JSON validation test failed:', error)
    return {
      success: false,
      error: error.message,
      decision: null
    }
  }
}

/**
 * Test fast decision convenience function
 */
export async function testFastDecision() {
  console.log('🧪 Testing fast decision convenience function...')
  
  const transcript = createTestTranscript()
  
  try {
    const decision = await decideFast(
      transcript,
      "Welcome to our presentation. Let's explore the key features.",
      { removeFiller: true, minConfidence: 0.8 }
    )
    
    const hasResults = decision.keepSegments.length > 0
    const fastProcessing = decision.analysisMetadata.processingTime_ms < 10000 // Should be reasonably fast
    
    console.log('📊 Fast Decision Results:')
    console.log(`  Segments processed: ${decision.stats.totalSegments}`)
    console.log(`  Segments kept: ${decision.stats.segmentsKept}`)
    console.log(`  Processing time: ${decision.analysisMetadata.processingTime_ms}ms`)
    console.log(`  Has results: ${hasResults ? '✅' : '❌'}`)
    console.log(`  Fast processing: ${fastProcessing ? '✅' : '❌'}`)
    
    return {
      success: hasResults,
      decision,
      validation: {
        hasResults,
        fastProcessing
      }
    }
    
  } catch (error: any) {
    console.error('❌ Fast decision test failed:', error)
    return {
      success: false,
      error: error.message,
      decision: null
    }
  }
}

/**
 * Test batch processing
 */
export async function testBatchProcessing() {
  console.log('🧪 Testing batch processing capabilities...')
  
  const inputs: DecisionInput[] = [
    {
      transcript: createTestTranscript(),
      policy: { ...DEFAULT_DECISION_POLICY, removeFiller: true },
      metadata: { videoId: 'batch-1', originalDuration_ms: 18200 }
    },
    {
      transcript: createTestTranscriptWithDuplicates(),
      policy: { ...DEFAULT_DECISION_POLICY, enableDeduplication: true },
      metadata: { videoId: 'batch-2', originalDuration_ms: 10200 }
    }
  ]
  
  try {
    const decisions = await decideBatch(inputs)
    
    const allSuccessful = decisions.every(d => d.keepSegments.length > 0)
    const batchSize = decisions.length
    const averageProcessingTime = decisions.reduce((sum, d) => sum + d.analysisMetadata.processingTime_ms, 0) / batchSize
    
    console.log('📊 Batch Processing Results:')
    console.log(`  Batch size: ${batchSize}`)
    console.log(`  All successful: ${allSuccessful ? '✅' : '❌'}`)
    console.log(`  Average processing time: ${averageProcessingTime.toFixed(0)}ms`)
    
    decisions.forEach((decision, index) => {
      console.log(`  Decision ${index + 1}: ${decision.stats.segmentsKept}/${decision.stats.totalSegments} segments kept`)
    })
    
    return {
      success: allSuccessful && batchSize === inputs.length,
      decisions,
      validation: {
        allSuccessful,
        correctBatchSize: batchSize === inputs.length,
        averageProcessingTime
      }
    }
    
  } catch (error: any) {
    console.error('❌ Batch processing test failed:', error)
    return {
      success: false,
      error: error.message,
      decisions: null
    }
  }
}

/**
 * Run comprehensive test suite
 */
export async function runAllDecisionTests() {
  console.log('🚀 Running comprehensive decision engine test suite...')
  
  const tests = [
    { name: 'Script Matching', test: testScriptMatching },
    { name: 'Filler Removal', test: testFillerRemoval },
    { name: 'Duplicate Detection', test: testDuplicateDetection },
    { name: 'JSON Validation', test: testJSONValidation },
    { name: 'Fast Decision', test: testFastDecision },
    { name: 'Batch Processing', test: testBatchProcessing }
  ]
  
  const results = []
  let passedTests = 0
  
  for (const { name, test } of tests) {
    console.log(`\n📋 Running ${name} test...`)
    try {
      const result = await test()
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
  
  console.log(`\n🎯 Test Suite Summary:`)
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
 * Performance benchmark test
 */
export async function benchmarkDecisionEngine() {
  console.log('⚡ Running decision engine performance benchmark...')
  
  const transcript = createTestTranscript()
  const iterations = 3 // Reduced for cost efficiency with GPT-4o
  
  console.log(`Running ${iterations} iterations...`)
  
  const times: number[] = []
  const results: DecisionOutput[] = []
  
  for (let i = 0; i < iterations; i++) {
    const start = Date.now()
    
    try {
      const decision = await decideFast(transcript, undefined, { removeFiller: true })
      const elapsed = Date.now() - start
      
      times.push(elapsed)
      results.push(decision)
      
      console.log(`  Iteration ${i + 1}: ${elapsed}ms`)
      
    } catch (error: any) {
      console.error(`  Iteration ${i + 1} failed:`, error.message)
    }
  }
  
  if (times.length > 0) {
    const avgTime = times.reduce((sum, t) => sum + t, 0) / times.length
    const minTime = Math.min(...times)
    const maxTime = Math.max(...times)
    
    console.log('\n⚡ Performance Results:')
    console.log(`  Average time: ${avgTime.toFixed(0)}ms`)
    console.log(`  Min time: ${minTime}ms`)
    console.log(`  Max time: ${maxTime}ms`)
    console.log(`  Consistency: ${avgTime < 8000 ? '✅' : '❌'} (target: <8s)`)
    
    return {
      success: avgTime < 8000 && times.length === iterations,
      performance: {
        avgTime,
        minTime,
        maxTime,
        iterations: times.length,
        consistency: avgTime < 8000
      }
    }
  } else {
    return {
      success: false,
      error: 'No successful iterations completed'
    }
  }
}
