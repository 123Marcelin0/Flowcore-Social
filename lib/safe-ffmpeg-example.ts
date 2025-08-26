/**
 * Safe FFmpeg Cutting Examples
 * Demonstrates the enhanced FFmpeg cutting logic with safety measures
 */

import { createCleanVideoFromDecision } from './video-editor'
import { EditingDecision } from './align'

/**
 * Example 1: Basic safe cutting demonstration
 */
export function exampleSafeCuttingBehavior() {
  console.log('🔧 Safe FFmpeg Cutting Behavior\n')
  
  console.log('📋 Safety Measures Implemented:')
  console.log('  ✅ Skip segments < 0.3s duration')
  console.log('  ✅ Use -ss start -to end with re-encoding')
  console.log('  ✅ Re-encode with libx264 CRF 23 + AAC')
  console.log('  ✅ Write temp files for each segment')
  console.log('  ✅ Concat via text list file')
  console.log('  ✅ Guard: No valid segments → throw error')
  console.log('  ✅ Apply fades only if total duration > 1.0s')
  console.log('  ✅ Log each segment cut with text + duration')
  
  console.log('\n🎯 FFmpeg Command Pattern:')
  console.log(`
For each segment:
  ffmpeg -i input.mp4 \\
    -ss {start} \\
    -to {end} \\
    -c:v libx264 \\
    -crf 23 \\
    -preset medium \\
    -c:a aac \\
    -movflags +faststart \\
    segment_001.mp4

Concat:
  ffmpeg -f concat -safe 0 -i concat_list.txt \\
    [fade filters if total > 1.0s] \\
    output.mp4
  `)
  
  console.log('📊 Expected Console Output:')
  console.log(`
🔍 Filtering segments: checking 8 segments for minimum duration
⚠️ SKIPPED: Segment too short (0.150s < 0.3s): "um..."
⚠️ SKIPPED: Segment too short (0.200s < 0.3s): "uh..."  
✅ Valid segments: 6/8 (2 skipped as too short)
📊 Total valid duration: 15.4s
🎨 Fade effects: ENABLED (total duration > 1.0s)
🔧 Safe FFmpeg cutting: Using -ss start -to end with libx264 + AAC re-encoding

✂️ Cutting segment 1/6:
   ⏱️ Time: 1.200s → 3.500s (2.300s)
   📝 Text: "Hello everyone, welcome to our presentation about AI technology..."
   💾 Output: segment_001.mp4
   🎬 FFmpeg: ffmpeg -i input.mp4 -ss 1.2 -to 3.5...
   ✅ Segment 1 completed

✂️ Cutting segment 2/6:
   ⏱️ Time: 4.100s → 6.800s (2.700s)
   📝 Text: "Today we'll explore machine learning algorithms and their applications..."
   💾 Output: segment_002.mp4
   🎬 FFmpeg: ffmpeg -i input.mp4 -ss 4.1 -to 6.8...
   ✅ Segment 2 completed

...

📝 Creating concat list: 6 segments
📋 Concat list content:
file 'segment_001.mp4'
file 'segment_002.mp4'
file 'segment_003.mp4'
file 'segment_004.mp4'
file 'segment_005.mp4'
file 'segment_006.mp4'

🔗 Concatenating segments via concat demuxer...
🎨 Applying fades: 0.30s fade-in/out
🎬 Final concat command: ffmpeg -f concat -safe 0 -i concat_list.txt...
⏳ Concatenating: 100.0%
✅ Safe video cutting completed
📊 Final stats: 6 segments → 15.4s video
  `)
  
  return 'Safe cutting behavior demonstrated'
}

/**
 * Example 2: Segment validation scenarios
 */
export function exampleSegmentValidation() {
  console.log('\n🔍 Segment Validation Examples\n')
  
  const testSegments = [
    { start: 1.0, end: 1.1, text: "Um", valid: false, reason: "0.1s < 0.3s" },
    { start: 2.0, end: 2.25, text: "Uh", valid: false, reason: "0.25s < 0.3s" },
    { start: 3.0, end: 3.3, text: "Hello", valid: true, reason: "0.3s = minimum" },
    { start: 4.0, end: 4.5, text: "World", valid: true, reason: "0.5s > 0.3s" },
    { start: 5.0, end: 7.2, text: "This is a longer segment", valid: true, reason: "2.2s > 0.3s" },
    { start: 8.0, end: 8.15, text: "Ah", valid: false, reason: "0.15s < 0.3s" }
  ]
  
  console.log('📊 Segment Validation Results:')
  testSegments.forEach((segment, index) => {
    const duration = segment.end - segment.start
    const status = segment.valid ? '✅ KEEP' : '❌ SKIP'
    console.log(`  ${index + 1}. ${status} "${segment.text}" (${duration.toFixed(3)}s) - ${segment.reason}`)
  })
  
  const validCount = testSegments.filter(s => s.valid).length
  const invalidCount = testSegments.length - validCount
  
  console.log(`\n📈 Summary: ${validCount} valid, ${invalidCount} skipped`)
  console.log(`🎯 Filter result: ${validCount}/${testSegments.length} segments kept`)
  
  return { validCount, invalidCount, testSegments }
}

/**
 * Example 3: Fade application logic
 */
export function exampleFadeLogic() {
  console.log('\n🎨 Fade Application Logic\n')
  
  const scenarios = [
    { totalDuration: 0.8, shouldFade: false, reason: "0.8s ≤ 1.0s" },
    { totalDuration: 1.0, shouldFade: false, reason: "1.0s = threshold" },
    { totalDuration: 1.1, shouldFade: true, reason: "1.1s > 1.0s" },
    { totalDuration: 5.5, shouldFade: true, reason: "5.5s > 1.0s" },
    { totalDuration: 15.0, shouldFade: true, reason: "15.0s > 1.0s" },
    { totalDuration: 0.6, shouldFade: false, reason: "0.6s ≤ 1.0s" }
  ]
  
  console.log('🎯 Fade Decision Matrix:')
  scenarios.forEach((scenario, index) => {
    const fadeStatus = scenario.shouldFade ? '✅ APPLY FADES' : '🚫 NO FADES'
    const fadeDuration = scenario.shouldFade ? Math.min(0.3, scenario.totalDuration / 10).toFixed(2) : 'N/A'
    
    console.log(`  ${index + 1}. ${fadeStatus} - ${scenario.totalDuration}s total (${scenario.reason})`)
    if (scenario.shouldFade) {
      console.log(`     Fade duration: ${fadeDuration}s (min(0.3, ${scenario.totalDuration}/10))`)
    }
  })
  
  console.log('\n📋 Fade Implementation:')
  console.log('  • Condition: totalDuration > 1.0s')
  console.log('  • Fade duration: min(0.3s, totalDuration/10)')
  console.log('  • Effects: fade-in at start + fade-out at end')
  console.log('  • Encoding: Requires re-encoding (no stream copy)')
  
  return scenarios
}

/**
 * Example 4: FFmpeg command generation
 */
export function exampleFFmpegCommands() {
  console.log('\n🔧 FFmpeg Command Examples\n')
  
  console.log('📋 Segment Cutting Command:')
  console.log(`
ffmpeg -i input.mp4 \\
  -ss 1.200 \\
  -to 3.500 \\
  -c:v libx264 \\
  -crf 23 \\
  -preset medium \\
  -c:a aac \\
  -movflags +faststart \\
  segment_001.mp4
  `)
  
  console.log('📋 Concatenation Commands:')
  
  console.log('\n🎨 With Fades (total > 1.0s):')
  console.log(`
ffmpeg -f concat -safe 0 -i concat_list.txt \\
  -c:v libx264 \\
  -crf 23 \\
  -preset medium \\
  -c:a aac \\
  -vf "fade=t=in:st=0:d=0.3,fade=t=out:st=14.7:d=0.3" \\
  output.mp4
  `)
  
  console.log('🚫 Without Fades (total ≤ 1.0s):')
  console.log(`
ffmpeg -f concat -safe 0 -i concat_list.txt \\
  -c copy \\
  output.mp4
  `)
  
  console.log('📝 Concat List File Format:')
  console.log(`
file 'segment_001.mp4'
file 'segment_002.mp4'
file 'segment_003.mp4'
file 'segment_004.mp4'
  `)
  
  return 'FFmpeg commands demonstrated'
}

/**
 * Example 5: Error handling scenarios
 */
export function exampleErrorHandling() {
  console.log('\n🛡️ Error Handling Scenarios\n')
  
  const errorScenarios = [
    {
      condition: "All segments < 0.3s",
      error: "No valid segments to join - all segments are shorter than 0.3 seconds",
      handling: "Throw error immediately after filtering"
    },
    {
      condition: "No segments provided",
      error: "No valid segments to join - concat list is empty", 
      handling: "Guard check before concat list creation"
    },
    {
      condition: "FFmpeg segment cutting fails",
      error: "Error creating segment N: [FFmpeg error]",
      handling: "Clean up temp files and reject promise"
    },
    {
      condition: "FFmpeg concatenation fails", 
      error: "FFmpeg concatenation error: [FFmpeg error]",
      handling: "Clean up all temp files and reject promise"
    },
    {
      condition: "Output file read fails",
      error: "Error reading output file: [File system error]",
      handling: "Clean up temp files and reject promise"
    }
  ]
  
  console.log('⚠️ Error Scenarios and Handling:')
  errorScenarios.forEach((scenario, index) => {
    console.log(`  ${index + 1}. ${scenario.condition}`)
    console.log(`     Error: "${scenario.error}"`)
    console.log(`     Handling: ${scenario.handling}`)
    console.log()
  })
  
  console.log('🧹 Cleanup Strategy:')
  console.log('  • Always clean up temp files on success/error')
  console.log('  • Files cleaned: input, output, concat list, all segments, temp dir')
  console.log('  • Fail-safe: Continue cleanup even if individual file deletion fails')
  
  return errorScenarios
}

/**
 * Example 6: Performance considerations
 */
export function examplePerformanceOptimizations() {
  console.log('\n⚡ Performance Optimizations\n')
  
  console.log('🎯 Encoding Strategy:')
  console.log('  • Individual segments: Always re-encode (libx264 + AAC)')
  console.log('  • Final concat: Re-encode if fades needed, copy if not')
  console.log('  • CRF 23: Good quality/size balance')
  console.log('  • Preset medium: Balanced speed/compression')
  
  console.log('\n📊 Processing Patterns:')
  
  const processingExamples = [
    {
      scenario: "6 segments, 15s total",
      segmentTime: "~30s (5s per segment)", 
      concatTime: "~10s (with fades)",
      totalTime: "~40s"
    },
    {
      scenario: "3 segments, 8s total",
      segmentTime: "~15s (5s per segment)",
      concatTime: "~5s (with fades)", 
      totalTime: "~20s"
    },
    {
      scenario: "2 segments, 0.8s total",
      segmentTime: "~10s (5s per segment)",
      concatTime: "~1s (stream copy)",
      totalTime: "~11s"
    }
  ]
  
  processingExamples.forEach((example, index) => {
    console.log(`  ${index + 1}. ${example.scenario}`)
    console.log(`     Segment cutting: ${example.segmentTime}`)
    console.log(`     Concatenation: ${example.concatTime}`)
    console.log(`     Total estimate: ${example.totalTime}`)
    console.log()
  })
  
  console.log('💡 Optimization Tips:')
  console.log('  • Parallel segment cutting could reduce time')
  console.log('  • Stream copy for short videos saves processing')
  console.log('  • CRF 18-28 range balances quality vs speed')
  console.log('  • Preset ultrafast for speed, slower for quality')
  
  return processingExamples
}

/**
 * Example 7: Integration with LLM decisions
 */
export function exampleLLMIntegration() {
  console.log('\n🤖 LLM Decision Integration\n')
  
  console.log('📋 Pipeline Flow:')
  console.log('1. 🎤 WhisperX: Word-level transcription')
  console.log('2. 📊 Micro-segmentation: 2s max segments')
  console.log('3. 🤖 LLM Analysis: Keep/drop decisions')
  console.log('4. 🔧 Safe FFmpeg: Validate and cut segments')
  console.log('5. 🎬 Output: Clean, professional video')
  
  console.log('\n💎 Quality Assurance:')
  console.log('  ✅ No segments shorter than 0.3s')
  console.log('  ✅ Consistent re-encoding quality')
  console.log('  ✅ Professional fade transitions')
  console.log('  ✅ Reliable concatenation')
  console.log('  ✅ Comprehensive error handling')
  
  const exampleDecision = {
    keepSegments: [
      { start_ms: 1200, end_ms: 3500, transcript: "Hello everyone, welcome to our presentation" },
      { start_ms: 4100, end_ms: 6800, transcript: "Today we'll explore machine learning" },
      { start_ms: 7200, end_ms: 8900, transcript: "Let's dive into the fundamentals" }
    ]
  }
  
  console.log('\n📝 Example LLM Decision:')
  console.log(`Input: ${exampleDecision.keepSegments.length} segments to keep`)
  exampleDecision.keepSegments.forEach((segment, index) => {
    const duration = (segment.end_ms - segment.start_ms) / 1000
    console.log(`  ${index + 1}. ${duration.toFixed(1)}s: "${segment.transcript}"`)
  })
  
  const totalDuration = exampleDecision.keepSegments.reduce((sum, seg) => sum + (seg.end_ms - seg.start_ms), 0) / 1000
  console.log(`\nTotal: ${totalDuration.toFixed(1)}s → ${totalDuration > 1.0 ? 'Fades enabled' : 'No fades'}`)
  
  return exampleDecision
}

/**
 * Run all safe FFmpeg examples
 */
export function runAllSafeFFmpegExamples() {
  console.log('🚀 Running All Safe FFmpeg Examples\n')
  
  const results = {
    behavior: exampleSafeCuttingBehavior(),
    validation: exampleSegmentValidation(),
    fades: exampleFadeLogic(),
    commands: exampleFFmpegCommands(),
    errors: exampleErrorHandling(),
    performance: examplePerformanceOptimizations(),
    integration: exampleLLMIntegration()
  }
  
  console.log('\n🎉 All examples completed!')
  console.log('\n📊 Safe FFmpeg Summary:')
  console.log('  ✅ Segment validation (≥0.3s)')
  console.log('  ✅ Safe cutting (-ss start -to end)')
  console.log('  ✅ Quality re-encoding (libx264 CRF 23 + AAC)')
  console.log('  ✅ Intelligent fading (>1.0s only)')
  console.log('  ✅ Robust concatenation (text list)')
  console.log('  ✅ Comprehensive logging')
  console.log('  ✅ Error handling & cleanup')
  
  return results
}

// Export for easy testing
export const safeFFmpegExamples = {
  exampleSafeCuttingBehavior,
  exampleSegmentValidation,
  exampleFadeLogic,
  exampleFFmpegCommands,
  exampleErrorHandling,
  examplePerformanceOptimizations,
  exampleLLMIntegration,
  runAllSafeFFmpegExamples
}
