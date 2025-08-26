/**
 * LLM Decision Engine Examples with Micro-segmentation
 * Demonstrates the enhanced LLM analysis step with micro-segments
 */

import { analyzeMicroSegmentsWithLLM, MicroSegmentDecision, MicroSegmentAnalysisResult, MicroSegment } from './align'

/**
 * Example 1: Basic LLM micro-segment analysis
 */
export async function exampleBasicLLMAnalysis() {
  console.log('🤖 Example: Basic LLM Micro-segment Analysis')
  
  const microSegments: MicroSegment[] = [
    { text: "Hello everyone", start: 1.2, end: 2.1 },
    { text: "um welcome to", start: 2.3, end: 3.5 },
    { text: "our presentation", start: 3.6, end: 4.8 },
    { text: "uh let me", start: 5.0, end: 6.2 },
    { text: "let me start again", start: 6.5, end: 8.0 }
  ]
  
  const scriptText = "Hello everyone, welcome to our presentation. Let me start with an introduction."
  
  try {
    const result = await analyzeMicroSegmentsWithLLM(microSegments, scriptText)
    
    console.log('✅ Analysis completed:')
    console.log(`📊 Total segments: ${result.stats.totalSegments}`)
    console.log(`📊 Kept segments: ${result.stats.keptSegments}`)
    console.log(`📊 Dropped segments: ${result.stats.droppedSegments}`)
    console.log(`📊 Reduction: ${result.stats.reductionPercentage.toFixed(1)}%`)
    
    console.log('\n🎯 Decisions:')
    result.decisions.forEach((decision, index) => {
      const status = decision.keep ? '✅ KEEP' : '❌ DROP'
      console.log(`  ${index + 1}. ${status} "${decision.text}" [${decision.start}s-${decision.end}s] (${decision.reason})`)
    })
    
    return result
  } catch (error) {
    console.error('❌ Analysis failed:', error)
    return null
  }
}

/**
 * Example 2: Filler word detection and removal
 */
export async function exampleFillerRemoval() {
  console.log('\n🤖 Example: Filler Word Detection and Removal')
  
  const microSegments: MicroSegment[] = [
    { text: "So today we're going to", start: 1.0, end: 2.8 },
    { text: "um", start: 3.0, end: 3.2 },
    { text: "talk about", start: 3.3, end: 4.1 },
    { text: "uh", start: 4.3, end: 4.5 },
    { text: "artificial intelligence.", start: 4.7, end: 6.2 },
    { text: "You know", start: 6.5, end: 7.0 },
    { text: "it's really fascinating", start: 7.1, end: 8.5 },
    { text: "like", start: 8.7, end: 8.9 },
    { text: "the future is here.", start: 9.0, end: 10.3 }
  ]
  
  try {
    const result = await analyzeMicroSegmentsWithLLM(microSegments)
    
    console.log('🗑️ Filler word analysis:')
    const fillerDecisions = result.decisions.filter(d => d.reason === 'filler_word')
    const keptDecisions = result.decisions.filter(d => d.keep)
    
    console.log(`   Filler segments detected: ${fillerDecisions.length}`)
    console.log(`   Clean segments kept: ${keptDecisions.length}`)
    
    console.log('\n📋 Clean result:')
    const cleanText = keptDecisions.map(d => d.text).join(' ')
    console.log(`   "${cleanText}"`)
    
    return result
  } catch (error) {
    console.error('❌ Filler analysis failed:', error)
    return null
  }
}

/**
 * Example 3: False start and repetition handling
 */
export async function exampleFalseStartHandling() {
  console.log('\n🤖 Example: False Start and Repetition Handling')
  
  const microSegments: MicroSegment[] = [
    { text: "Let me tell you about", start: 1.0, end: 2.5 },
    { text: "Actually let me", start: 2.8, end: 3.6 },
    { text: "Let me start over.", start: 4.0, end: 5.2 },
    { text: "The most important thing", start: 5.5, end: 7.0 },
    { text: "The key point is", start: 7.3, end: 8.5 },
    { text: "machine learning can help", start: 8.8, end: 10.5 },
    { text: "can really help us", start: 10.7, end: 12.0 },
    { text: "solve complex problems.", start: 12.2, end: 14.0 }
  ]
  
  try {
    const result = await analyzeMicroSegmentsWithLLM(microSegments)
    
    console.log('🔄 False start and repetition analysis:')
    
    const falseStarts = result.decisions.filter(d => d.reason === 'false_start')
    const repetitionEarly = result.decisions.filter(d => d.reason === 'repetition_early')
    const repetitionFinal = result.decisions.filter(d => d.reason === 'repetition_final')
    
    console.log(`   False starts: ${falseStarts.length}`)
    console.log(`   Early repetitions: ${repetitionEarly.length}`)
    console.log(`   Final versions kept: ${repetitionFinal.length}`)
    
    console.log('\n📋 Final clean version:')
    const finalText = result.decisions.filter(d => d.keep).map(d => d.text).join(' ')
    console.log(`   "${finalText}"`)
    
    return result
  } catch (error) {
    console.error('❌ False start analysis failed:', error)
    return null
  }
}

/**
 * Example 4: Script matching and adherence
 */
export async function exampleScriptMatching() {
  console.log('\n🤖 Example: Script Matching and Adherence')
  
  const microSegments: MicroSegment[] = [
    { text: "Welcome everyone to", start: 1.0, end: 2.3 },
    { text: "our presentation about", start: 2.5, end: 3.8 },
    { text: "AI and machine learning.", start: 4.0, end: 5.5 },
    { text: "Today we'll explore", start: 6.0, end: 7.3 },
    { text: "various algorithms and", start: 7.5, end: 9.0 },
    { text: "their applications in", start: 9.2, end: 10.5 },
    { text: "real world scenarios.", start: 10.7, end: 12.0 }
  ]
  
  const originalScript = `Welcome everyone to our presentation about artificial intelligence and machine learning. 
  Today we'll explore various algorithms and their applications in real-world scenarios.`
  
  try {
    const result = await analyzeMicroSegmentsWithLLM(microSegments, originalScript)
    
    console.log('📜 Script matching analysis:')
    console.log(`   Original script length: ${originalScript.length} chars`)
    console.log(`   Script provided: ${result.metadata.hasScript}`)
    
    console.log('\n🎯 Adherence check:')
    result.decisions.forEach((decision, index) => {
      const status = decision.keep ? '✅' : '❌'
      console.log(`   ${status} "${decision.text}" (${decision.reason})`)
    })
    
    return result
  } catch (error) {
    console.error('❌ Script matching failed:', error)
    return null
  }
}

/**
 * Example 5: Real-world complex scenario
 */
export async function exampleComplexScenario() {
  console.log('\n🤖 Example: Real-world Complex Scenario')
  
  const microSegments: MicroSegment[] = [
    { text: "So um today we're", start: 0.5, end: 1.8 },
    { text: "going to talk about", start: 2.0, end: 3.3 },
    { text: "uh artificial", start: 3.5, end: 4.2 },
    { text: "artificial intelligence.", start: 4.5, end: 5.8 },
    { text: "It's really", start: 6.0, end: 6.7 },
    { text: "It's fascinating how", start: 7.0, end: 8.2 },
    { text: "machine learning can", start: 8.4, end: 9.6 },
    { text: "you know", start: 9.8, end: 10.3 },
    { text: "can solve problems", start: 10.5, end: 11.8 },
    { text: "that were impossible", start: 12.0, end: 13.5 },
    { text: "just a few years ago.", start: 13.7, end: 15.2 },
    { text: "Let me give you", start: 16.0, end: 17.2 },
    { text: "Actually let me", start: 17.5, end: 18.3 },
    { text: "Let me show you", start: 18.6, end: 19.8 },
    { text: "some examples.", start: 20.0, end: 21.2 }
  ]
  
  const script = "Today we're going to talk about artificial intelligence. It's fascinating how machine learning can solve problems that were impossible just a few years ago. Let me show you some examples."
  
  try {
    const result = await analyzeMicroSegmentsWithLLM(microSegments, script)
    
    console.log('🌍 Complex scenario analysis:')
    console.log(`📊 Input: ${result.stats.totalSegments} micro-segments`)
    console.log(`📊 Output: ${result.stats.keptSegments} clean segments`)
    console.log(`📊 Reduction: ${result.stats.reductionPercentage.toFixed(1)}%`)
    console.log(`⏱️ Processing: ${result.metadata.processingTime_ms}ms`)
    
    // Breakdown by decision type
    const reasonBreakdown = result.decisions.reduce((counts, decision) => {
      const reason = decision.reason || 'unknown'
      counts[reason] = (counts[reason] || 0) + 1
      return counts
    }, {} as Record<string, number>)
    
    console.log('\n📊 Decision breakdown:')
    Object.entries(reasonBreakdown).forEach(([reason, count]) => {
      console.log(`   ${reason}: ${count}`)
    })
    
    console.log('\n✨ Final clean result:')
    const cleanText = result.decisions.filter(d => d.keep).map(d => d.text).join(' ')
    console.log(`   "${cleanText}"`)
    
    console.log('\n🎯 Comparison with script:')
    console.log(`   Original: "${script}"`)
    console.log(`   Generated: "${cleanText}"`)
    
    return result
  } catch (error) {
    console.error('❌ Complex scenario analysis failed:', error)
    return null
  }
}

/**
 * Example 6: Expected JSON output format demonstration
 */
export function showExpectedOutputFormat() {
  console.log('\n📋 Expected LLM JSON Output Format')
  
  const expectedFormat = {
    decisions: [
      { 
        keep: true, 
        start: 1.2, 
        end: 2.1, 
        text: "Hello world", 
        reason: "fluent_complete" 
      },
      { 
        keep: false, 
        start: 2.7, 
        end: 3.5, 
        text: "Um...", 
        reason: "filler_word" 
      },
      { 
        keep: true, 
        start: 3.8, 
        end: 5.2, 
        text: "This is a test", 
        reason: "natural_speech" 
      },
      { 
        keep: false, 
        start: 5.5, 
        end: 6.1, 
        text: "Let me uh", 
        reason: "false_start" 
      },
      { 
        keep: true, 
        start: 6.3, 
        end: 7.8, 
        text: "Thank you for watching", 
        reason: "fluent_complete" 
      }
    ]
  }
  
  console.log('🎯 Exact format as specified:')
  console.log(JSON.stringify(expectedFormat, null, 2))
  
  console.log('\n📊 Decision analysis:')
  const kept = expectedFormat.decisions.filter(d => d.keep)
  const dropped = expectedFormat.decisions.filter(d => !d.keep)
  
  console.log(`   Total decisions: ${expectedFormat.decisions.length}`)
  console.log(`   Kept: ${kept.length}`)
  console.log(`   Dropped: ${dropped.length}`)
  console.log(`   Reduction: ${((dropped.length / expectedFormat.decisions.length) * 100).toFixed(1)}%`)
  
  return expectedFormat
}

/**
 * Example 7: Integration with existing pipeline
 */
export function showPipelineIntegration() {
  console.log('\n🎬 Pipeline Integration with LLM Decision Engine')
  
  console.log('📋 Enhanced Pipeline Flow:')
  console.log('1. 📊 Load media file')
  console.log('2. 🎤 WhisperX transcription (word-level timestamps)')
  console.log('3. 📊 Micro-segmentation (max 2s, punctuation/pause breaks)')
  console.log('4. 🤖 LLM Decision Engine (NEW - enhanced analysis)')
  console.log('5. 📝 Generate EDL/SRT files')
  console.log('6. ✂️ FFmpeg processing')
  console.log('7. 💾 Save final video')
  
  console.log('\n🔧 LLM Analysis Step:')
  console.log(`
// Input: micro-segments + optional script
const microSegments = segmentTranscript(whisperxWords)
const result = await analyzeMicroSegmentsWithLLM(microSegments, script)

// Output: decisions array with exact format
{
  decisions: [
    { keep: true, start: 1.2, end: 2.1, text: "Hello world", reason: "fluent_complete" },
    { keep: false, start: 2.7, end: 3.5, text: "Um...", reason: "filler_word" }
  ]
}
  `)
  
  console.log('🎯 LLM Instructions Applied:')
  console.log('  ✅ Keep fluent, complete sentences')
  console.log('  ✅ Drop fillers ("um", "ah", stutters)')
  console.log('  ✅ Drop false starts / abandoned sentences')
  console.log('  ✅ If repeated, keep final complete take')
  console.log('  ✅ Keep small natural pauses (<500ms)')
  console.log('  ✅ Cut longer pauses aggressively')
  
  console.log('\n💡 Benefits:')
  console.log('  • Intelligent content analysis')
  console.log('  • Context-aware decisions')
  console.log('  • Script adherence checking')
  console.log('  • Professional editing quality')
  console.log('  • Detailed reasoning provided')
  
  return 'Pipeline integration overview complete'
}

/**
 * Run all LLM analysis examples
 */
export async function runAllLLMExamples() {
  console.log('🚀 Running All LLM Decision Engine Examples\n')
  
  /*
  const examples = [
    { name: 'Basic Analysis', fn: exampleBasicLLMAnalysis },
    { name: 'Filler Removal', fn: exampleFillerRemoval },
    { name: 'False Start Handling', fn: exampleFalseStartHandling },
    { name: 'Script Matching', fn: exampleScriptMatching },
    { name: 'Complex Scenario', fn: exampleComplexScenario }
  ]
  
  const results = []
  
  for (const example of examples) {
    console.log(`\n📋 Running ${example.name}...`)
    try {
      const result = await example.fn()
      results.push({ name: example.name, result })
      console.log(`✅ ${example.name} completed`)
    } catch (error) {
      console.error(`❌ ${example.name} failed:`, error)
      results.push({ name: example.name, error })
    }
  }
  
  console.log('\n📊 Summary:')
  results.forEach(({ name, result, error }) => {
    if (result) {
      console.log(`  ✅ ${name}: ${result.stats?.keptSegments}/${result.stats?.totalSegments} kept`)
    } else {
      console.log(`  ❌ ${name}: Failed`)
    }
  })
  
  return results
  */
  
  console.log('📚 Available LLM Examples:')
  console.log('1. Basic Analysis - Standard keep/drop decisions')
  console.log('2. Filler Removal - Detect and remove um, ah, uh')
  console.log('3. False Start Handling - Handle repetitions and restarts')
  console.log('4. Script Matching - Compare against original script')
  console.log('5. Complex Scenario - Real-world mixed content')
  
  console.log('\n🎯 Key Features Demonstrated:')
  console.log('  ✅ Exact JSON output format as specified')
  console.log('  ✅ Professional editing principles')
  console.log('  ✅ Intelligent decision reasoning')
  console.log('  ✅ Micro-segment integration')
  console.log('  ✅ Script adherence checking')
  
  return 'All LLM examples ready for execution'
}

// Export for easy testing
export const llmMicroSegmentExamples = {
  exampleBasicLLMAnalysis,
  exampleFillerRemoval,
  exampleFalseStartHandling,
  exampleScriptMatching,
  exampleComplexScenario,
  showExpectedOutputFormat,
  showPipelineIntegration,
  runAllLLMExamples
}
