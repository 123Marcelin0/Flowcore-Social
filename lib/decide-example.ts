// Example usage of the LLM-based decision engine
import { makeEditingDecision, decideFast, decideBatch } from './decide'
import { createSegmentationConfig } from './segmenter'
import { DEFAULT_DECISION_POLICY } from './types'

/**
 * Example 1: Basic usage with script matching
 */
export async function exampleScriptMatching() {
  console.log('📖 Example: Script matching with LLM decision engine')
  
  const transcript = {
    text: "Welcome to our presentation about AI. Um, this is going to be really exciting. Let's explore the features.",
    segments: [
      {
        start: 0.5,
        end: 3.0,
        text: "Welcome to our presentation about AI.",
        confidence: 0.95,
        words: [
          { word: "Welcome", start: 0.5, end: 1.0 },
          { word: "to", start: 1.1, end: 1.2 },
          { word: "our", start: 1.3, end: 1.5 },
          { word: "presentation", start: 1.6, end: 2.3 },
          { word: "about", start: 2.4, end: 2.7 },
          { word: "AI", start: 2.8, end: 3.0 }
        ]
      },
      {
        start: 3.5,
        end: 6.8,
        text: "Um, this is going to be really exciting.",
        confidence: 0.76,
        words: [
          { word: "Um", start: 3.5, end: 3.8 },
          { word: "this", start: 4.0, end: 4.2 },
          { word: "is", start: 4.3, end: 4.4 },
          { word: "going", start: 4.5, end: 4.8 },
          { word: "to", start: 4.9, end: 5.0 },
          { word: "be", start: 5.1, end: 5.3 },
          { word: "really", start: 5.5, end: 5.9 },
          { word: "exciting", start: 6.0, end: 6.8 }
        ]
      },
      {
        start: 7.2,
        end: 9.5,
        text: "Let's explore the features.",
        confidence: 0.92,
        words: [
          { word: "Let's", start: 7.2, end: 7.6 },
          { word: "explore", start: 7.7, end: 8.2 },
          { word: "the", start: 8.3, end: 8.4 },
          { word: "features", start: 8.5, end: 9.5 }
        ]
      }
    ],
    language: 'en',
    duration: 9.5
  }
  
  const script = "Welcome to our presentation about AI. This is going to be really exciting. Let's explore the features."
  
  const input = {
    transcript,
    scriptText: script,
    policy: {
      ...DEFAULT_DECISION_POLICY,
      removeFiller: true,
      scriptMatchWeight: 0.8,
      semanticSimilarityThreshold: 0.7,
      minConfidence: 0.7
    },
    metadata: {
      videoId: 'example-script-match',
      originalDuration_ms: 9500
    }
  }
  
  try {
    const decision = await makeEditingDecision(input, 'gpt-4o')
    
    console.log('✅ Script Matching Results:')
    console.log(`  Original segments: ${decision.stats.totalSegments}`)
    console.log(`  Kept segments: ${decision.stats.segmentsKept}`)
    console.log(`  Script matches: ${decision.stats.reasonCounts.script_match}`)
    console.log(`  Filler removed: ${decision.stats.reasonCounts.filler_trim}`)
    console.log(`  Time reduction: ${decision.stats.reductionPercentage.toFixed(1)}%`)
    console.log(`  Processing time: ${decision.analysisMetadata.processingTime_ms}ms`)
    
    console.log('\n📝 Kept segments:')
    decision.keepSegments.forEach((segment, index) => {
      console.log(`  ${index + 1}. [${segment.reason}] "${segment.transcript}"`)
    })
    
    return decision
    
  } catch (error) {
    console.error('❌ Example failed:', error)
    return null
  }
}

/**
 * Example 2: Filler removal without script
 */
export async function exampleFillerRemoval() {
  console.log('✂️ Example: Filler removal without script')
  
  const transcript = {
    text: "So, um, today we're going to talk about, uh, machine learning. You know, it's really important for, like, the future.",
    segments: [
      {
        start: 0,
        end: 4.5,
        text: "So, um, today we're going to talk about, uh, machine learning.",
        confidence: 0.82
      },
      {
        start: 5.0,
        end: 8.8,
        text: "You know, it's really important for, like, the future.",
        confidence: 0.79
      }
    ],
    language: 'en',
    duration: 8.8
  }
  
  try {
    const decision = await decideFast(
      transcript,
      undefined, // No script
      {
        removeFiller: true,
        removeHesitations: true,
        useAISummary: true,
        minConfidence: 0.7
      }
    )
    
    console.log('✅ Filler Removal Results:')
    console.log(`  Original segments: ${decision.stats.totalSegments}`)
    console.log(`  Kept segments: ${decision.stats.segmentsKept}`)
    console.log(`  Filler removed: ${decision.stats.fillerWordsRemoved}`)
    console.log(`  AI summary used: ${decision.stats.reasonCounts.ai_summary > 0 ? 'Yes' : 'No'}`)
    console.log(`  Time saved: ${decision.stats.removedDuration_ms}ms`)
    
    return decision
    
  } catch (error) {
    console.error('❌ Example failed:', error)
    return null
  }
}

/**
 * Example 3: Batch processing multiple videos
 */
export async function exampleBatchProcessing() {
  console.log('⚡ Example: Batch processing multiple videos')
  
  const inputs = [
    {
      transcript: {
        text: "Welcome everyone to this tutorial.",
        segments: [{ start: 0, end: 2.5, text: "Welcome everyone to this tutorial.", confidence: 0.9 }],
        duration: 2.5
      },
      policy: { ...DEFAULT_DECISION_POLICY, removeFiller: true },
      metadata: { videoId: 'batch-1', originalDuration_ms: 2500 }
    },
    {
      transcript: {
        text: "Um, let's get started with the basics.",
        segments: [{ start: 0, end: 3.2, text: "Um, let's get started with the basics.", confidence: 0.85 }],
        duration: 3.2
      },
      policy: { ...DEFAULT_DECISION_POLICY, removeFiller: true },
      metadata: { videoId: 'batch-2', originalDuration_ms: 3200 }
    }
  ]
  
  try {
    const decisions = await decideBatch(inputs, 'gpt-4o')
    
    console.log('✅ Batch Processing Results:')
    console.log(`  Videos processed: ${decisions.length}`)
    
    decisions.forEach((decision, index) => {
      console.log(`  Video ${index + 1}: ${decision.stats.segmentsKept}/${decision.stats.totalSegments} segments kept`)
    })
    
    const totalTimeSaved = decisions.reduce((sum, d) => sum + d.stats.removedDuration_ms, 0)
    console.log(`  Total time saved: ${totalTimeSaved}ms`)
    
    return decisions
    
  } catch (error) {
    console.error('❌ Batch example failed:', error)
    return null
  }
}

/**
 * Example 4: Advanced configuration
 */
export async function exampleAdvancedConfig() {
  console.log('⚙️ Example: Advanced configuration')
  
  const transcript = {
    text: "This is the first take. This is the second take, much better. This is the final version.",
    segments: [
      { start: 0, end: 2.0, text: "This is the first take.", confidence: 0.75 },
      { start: 2.5, end: 5.8, text: "This is the second take, much better.", confidence: 0.88 },
      { start: 6.0, end: 8.5, text: "This is the final version.", confidence: 0.92 }
    ],
    duration: 8.5
  }
  
  const customPolicy = {
    ...DEFAULT_DECISION_POLICY,
    enableDeduplication: true,
    similarityThresholdForDupes: 0.7,
    preferLaterTakes: true,
    strongConfidenceThreshold: 0.9,
    customInstructions: "Focus on keeping the highest quality version when multiple takes exist."
  }
  
  const input = {
    transcript,
    policy: customPolicy,
    metadata: {
      videoId: 'advanced-config',
      originalDuration_ms: 8500,
      speakerInfo: {
        name: 'Professional Speaker',
        role: 'Instructor'
      }
    }
  }
  
  try {
    const decision = await makeEditingDecision(input, 'gpt-4o')
    
    console.log('✅ Advanced Configuration Results:')
    console.log(`  Duplicates removed: ${decision.stats.duplicatesRemoved}`)
    console.log(`  Best takes selected: ${decision.stats.reasonCounts.dedupe_best_take}`)
    console.log(`  High confidence segments: ${decision.stats.reasonCounts.high_confidence}`)
    console.log(`  Custom instructions applied: ${!!customPolicy.customInstructions}`)
    
    return decision
    
  } catch (error) {
    console.error('❌ Advanced example failed:', error)
    return null
  }
}

/**
 * Run all examples in sequence
 */
export async function runAllExamples() {
  console.log('🚀 Running all LLM decision engine examples...\n')
  
  const results = {
    scriptMatching: await exampleScriptMatching(),
    fillerRemoval: await exampleFillerRemoval(),
    batchProcessing: await exampleBatchProcessing(),
    advancedConfig: await exampleAdvancedConfig()
  }
  
  const successCount = Object.values(results).filter(r => r !== null).length
  const totalExamples = Object.keys(results).length
  
  console.log(`\n🎯 Examples Summary:`)
  console.log(`  Successful: ${successCount}/${totalExamples}`)
  console.log(`  Success rate: ${((successCount / totalExamples) * 100).toFixed(1)}%`)
  
  if (successCount === totalExamples) {
    console.log('🎉 All examples completed successfully!')
  } else {
    console.log('⚠️ Some examples failed - check the logs above')
  }
  
  return results
}

/**
 * Performance comparison: Old vs New approach
 */
export async function compareOldVsNew() {
  console.log('📊 Performance comparison: Old approach vs LLM decision engine')
  
  const testTranscript = {
    text: "Welcome to our presentation. Um, this is going to be exciting. Let's explore the features.",
    segments: [
      { start: 0, end: 2.5, text: "Welcome to our presentation.", confidence: 0.95 },
      { start: 3.0, end: 5.8, text: "Um, this is going to be exciting.", confidence: 0.76 },
      { start: 6.2, end: 8.5, text: "Let's explore the features.", confidence: 0.92 }
    ],
    duration: 8.5
  }
  
  console.log('⏱️ Testing LLM decision engine performance...')
  const start = Date.now()
  
  try {
    const decision = await decideFast(testTranscript, undefined, { removeFiller: true })
    const elapsed = Date.now() - start
    
    console.log(`✅ LLM Decision Engine:`)
    console.log(`  Processing time: ${elapsed}ms`)
    console.log(`  Segments analyzed: ${decision.stats.totalSegments}`)
    console.log(`  Quality decisions: ${Object.keys(decision.stats.reasonCounts).length} criteria used`)
    console.log(`  Reduction achieved: ${decision.stats.reductionPercentage.toFixed(1)}%`)
    
    return {
      processingTime: elapsed,
      decision,
      approach: 'llm'
    }
    
  } catch (error) {
    console.error('❌ Performance test failed:', error)
    return null
  }
}
