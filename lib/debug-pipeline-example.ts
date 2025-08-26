/**
 * Debug Pipeline Examples
 * Demonstrates the comprehensive debug outputs and timing statistics
 */

import { updateSpeakerToCameraPipeline } from './align'

/**
 * Example 1: Debug File Structure and Contents
 */
export function exampleDebugFileStructure() {
  console.log('🐛 Debug File Structure Example\n')
  
  const debugStructure = {
    outputDirectory: '/tmp/video-edit-{uploadId}/',
    debugFiles: [
      {
        name: 'transcript.json',
        description: 'Raw OpenAI transcription output',
        size: '~50-200KB',
        contents: {
          openai_transcription: {
            words: 'Array of word objects with start/end timestamps',
            segments: 'Array of segment objects with word collections',
            text: 'Complete transcript text',
            language: 'Detected language code',
            duration: 'Total audio duration in seconds'
          },
          segments: 'Converted ASR segments for pipeline compatibility',
          metadata: {
            total_segments: 'Number of ASR segments',
            total_words: 'Number of individual words',
            total_duration: 'Total duration in seconds',
            language: 'Language detection result',
            transcription_time_ms: 'Time taken for transcription'
          }
        }
      },
      {
        name: 'micro_segments.json',
        description: 'Micro-segmentation analysis results',
        size: '~20-100KB',
        contents: {
          micro_segments: 'Array of 2s max segments with natural breaks',
          metadata: {
            total_microsegments: 'Number of micro-segments created',
            total_original_segments: 'Original ASR segments count',
            total_words: 'Total words processed',
            segmentation_time_ms: 'Time for segmentation',
            avg_microsegment_duration: 'Average segment length',
            longest_microsegment: 'Longest segment duration',
            shortest_microsegment: 'Shortest segment duration'
          }
        }
      },
      {
        name: 'llm_decisions.json',
        description: 'LLM keep/drop decisions with reasoning',
        size: '~30-150KB',
        contents: {
          analysis_result: {
            decisions: 'Array of keep/drop decisions per micro-segment',
            stats: 'Aggregated statistics',
            metadata: 'LLM processing metadata'
          },
          metadata: {
            llm_processing_time_ms: 'Time for LLM analysis',
            total_decisions: 'Number of decisions made',
            keep_decisions: 'Number of segments kept',
            drop_decisions: 'Number of segments dropped',
            decision_reasons: 'Frequency count of decision reasons'
          }
        }
      },
      {
        name: 'debug_summary.json',
        description: 'Comprehensive timing and statistics summary',
        size: '~5-10KB',
        contents: {
          timing: 'Complete pipeline timing breakdown',
          statistics: 'Word/segment/duration statistics',
          quality_checks: 'Quality validation results',
          files_generated: 'List of all output files'
        }
      }
    ]
  }
  
  console.log('📋 Debug Files Overview:')
  debugStructure.debugFiles.forEach((file, index) => {
    console.log(`  ${index + 1}. ${file.name}`)
    console.log(`     Description: ${file.description}`)
    console.log(`     Typical Size: ${file.size}`)
    console.log(`     Purpose: ${typeof file.contents === 'string' ? file.contents : 'Structured data analysis'}`)
    console.log()
  })
  
  return debugStructure
}

/**
 * Example 2: Timing Statistics Output
 */
export function exampleTimingStatistics() {
  console.log('⏱️  Timing Statistics Example\n')
  
  const exampleStats = {
    scenario: 'Typical 45-second speaker-to-camera video',
    originalContent: {
      duration: 45.3,
      segments: 12,
      words: 245,
      avgWordLength: 0.185, // seconds per word
      fillerWords: 23,
      longPauses: 5
    },
    processingResults: {
      keptSegments: 8,
      keptWords: 156,
      finalDuration: 35.1,
      durationReduction: 22.5, // percent
      wordReduction: 36.3 // percent
    },
    timingBreakdown: {
      transcription: 8.2, // seconds
      llmAnalysis: 12.5,
      ffmpegProcessing: 28.3,
      totalPipeline: 49.0,
      processingSpeed: 0.92 // x realtime
    }
  }
  
  console.log('📊 Example Console Output:')
  console.log(`
📊 Timing Statistics:
   • Average word length: ${exampleStats.originalContent.avgWordLength.toFixed(2)}s
   • Total words: ${exampleStats.originalContent.words} → ${exampleStats.processingResults.keptWords} kept
   • Word reduction: ${exampleStats.processingResults.wordReduction.toFixed(1)}%
   • Duration reduction: ${exampleStats.processingResults.durationReduction.toFixed(1)}%
   • LLM analysis time: ${(exampleStats.timingBreakdown.llmAnalysis * 1000).toFixed(0)}ms

⏱️  Performance Summary:
   • Total pipeline time: ${exampleStats.timingBreakdown.totalPipeline.toFixed(1)}s
   • Transcription: ${exampleStats.timingBreakdown.transcription.toFixed(1)}s
   • LLM analysis: ${exampleStats.timingBreakdown.llmAnalysis.toFixed(1)}s
   • FFmpeg processing: ${exampleStats.timingBreakdown.ffmpegProcessing.toFixed(1)}s
   • Processing speed: ${exampleStats.timingBreakdown.processingSpeed.toFixed(1)}x realtime
  `)
  
  return exampleStats
}

/**
 * Example 3: Quality Warning Scenarios
 */
export function exampleQualityWarnings() {
  console.log('⚠️  Quality Warning Examples\n')
  
  const warningScenarios = [
    {
      scenario: 'LLM Too Lenient',
      reduction: 25.3,
      trigger: 'reduction < 50%',
      warning: '⚠️  WARNING: LLM too lenient, check transcript quality',
      explanation: 'Expected >50% reduction for typical speaker-to-camera content',
      possibleCauses: [
        'High-quality original recording with minimal filler',
        'Script was followed very closely',
        'Short pauses that don\'t warrant cutting',
        'Professional speaker with minimal false starts'
      ],
      actions: [
        'Review transcript.json for audio quality',
        'Check micro_segments.json for pause analysis',
        'Examine llm_decisions.json for decision patterns',
        'Consider adjusting LLM prompt for stricter editing'
      ]
    },
    {
      scenario: 'Normal Processing',
      reduction: 65.8,
      trigger: 'reduction >= 50%',
      warning: null,
      explanation: 'Healthy reduction indicates typical speaker-to-camera content',
      possibleCauses: [
        'Natural speech patterns with filler words',
        'Some false starts and corrections',
        'Appropriate pause trimming',
        'Multiple takes of same content'
      ],
      actions: [
        'No action needed - normal processing',
        'Review debug files for optimization opportunities'
      ]
    },
    {
      scenario: 'Excessive Reduction',
      reduction: 85.2,
      trigger: 'reduction > 80%',
      warning: '⚠️  WARNING: Excessive reduction, check for over-aggressive editing',
      explanation: 'Very high reduction may indicate poor original quality or over-editing',
      possibleCauses: [
        'Poor audio quality causing transcription errors',
        'Very high filler word content',
        'Long periods of silence',
        'LLM being over-aggressive in cutting'
      ],
      actions: [
        'Review original audio quality',
        'Check transcript accuracy',
        'Examine kept vs dropped segment patterns',
        'Consider relaxing editing criteria'
      ]
    }
  ]
  
  console.log('📋 Quality Check Scenarios:')
  warningScenarios.forEach((scenario, index) => {
    console.log(`  ${index + 1}. ${scenario.scenario}`)
    console.log(`     Reduction: ${scenario.reduction.toFixed(1)}%`)
    console.log(`     Trigger: ${scenario.trigger}`)
    if (scenario.warning) {
      console.log(`     Warning: ${scenario.warning}`)
    }
    console.log(`     Explanation: ${scenario.explanation}`)
    console.log(`     Possible Causes: ${scenario.possibleCauses.join(', ')}`)
    console.log(`     Actions: ${scenario.actions.join(', ')}`)
    console.log()
  })
  
  return warningScenarios
}

/**
 * Example 4: Debug Summary JSON Structure
 */
export function exampleDebugSummaryStructure() {
  console.log('📄 Debug Summary JSON Structure\n')
  
  const debugSummaryExample = {
    timing: {
      transcription_ms: 8200,
      llm_analysis_ms: 12500,
      ffmpeg_processing_ms: 28300,
      total_pipeline_ms: 49000
    },
    statistics: {
      original_segments: 12,
      original_words: 245,
      micro_segments: 28,
      kept_segments: 8,
      kept_words: 156,
      avg_word_length_seconds: 0.185,
      duration_reduction_percent: 22.5,
      word_reduction_percent: 36.3,
      original_duration_seconds: 45.3,
      final_duration_seconds: 35.1
    },
    quality_checks: {
      reduction_too_lenient: false,
      has_script: true,
      script_length: 127,
      instagram_format: 'portrait',
      subtitles_burned: true
    },
    files_generated: {
      transcript_json: '/tmp/video-edit-demo-123/transcript.json',
      micro_segments_json: '/tmp/video-edit-demo-123/micro_segments.json',
      llm_decisions_json: '/tmp/video-edit-demo-123/llm_decisions.json',
      final_video: '/tmp/video-edit-demo-123/output.mp4',
      subtitles_srt: '/tmp/video-edit-demo-123/subtitles.srt',
      edit_decision_list: '/tmp/video-edit-demo-123/edit_decision_list.csv',
      debug_summary: '/tmp/video-edit-demo-123/debug_summary.json'
    }
  }
  
  console.log('📋 debug_summary.json Structure:')
  console.log(JSON.stringify(debugSummaryExample, null, 2))
  
  console.log('\n💡 Usage Tips:')
  console.log('  • timing: Identify bottlenecks in the pipeline')
  console.log('  • statistics: Analyze editing effectiveness')
  console.log('  • quality_checks: Validate processing results')
  console.log('  • files_generated: Locate all output files')
  
  return debugSummaryExample
}

/**
 * Example 5: Complete Debug Console Output
 */
export function exampleCompleteDebugOutput() {
  console.log('📺 Complete Debug Console Output Example\n')
  
  const completeOutput = `
🎬 Starting Speaker-to-Camera Pipeline
📋 Upload ID: demo-video-123
📜 Script provided: Yes
🎯 Quality: high

📊 Step 1: Loading media and OpenAI transcription...
🎤 Starting OpenAI Whisper transcription (word-level timestamps)...
🔧 OpenAI Whisper with enhanced timing
⚡ Word-level timestamp analysis
✅ OpenAI transcription completed
📊 Words: 245
📊 Segments: 12
⏱️ Duration: 45.3s
🌍 Language: en
💾 Saving OpenAI transcription to database...
✅ OpenAI transcription saved
🎤 Ready for analysis: 12 segments with word-level timing
🐛 Debug: Raw transcript saved to /tmp/video-edit-demo-123/transcript.json

🤖 Step 2: Professional video editor analysis...
🎯 Rules: Keep final fluent versions, remove filler, trim pauses >800ms
🎬 Using enhanced micro-segment LLM analysis...
📊 Created 28 micro-segments from 12 ASR segments
🐛 Debug: Micro-segments saved to /tmp/video-edit-demo-123/micro_segments.json
🐛 Debug: LLM decisions saved to /tmp/video-edit-demo-123/llm_decisions.json
✅ Enhanced micro-segment LLM analysis completed: {"segmentsKept":19,"reductionPercentage":"22.5%","processingTime":"12500ms","model":"gpt-4o"}
✅ Analysis completed:
📊 Segments: 8/12 kept
⏱️ Reduction: 22.5%
🗑️ Removed: 4 segments  
⏸️ Pauses: 3 detected

📊 Timing Statistics:
   • Average word length: 0.18s
   • Total words: 245 → 156 kept
   • Word reduction: 36.3%
   • Duration reduction: 22.5%
   • LLM analysis time: 12500ms

📝 Step 3: Generating output files...
📄 EDL saved: /tmp/video-edit-demo-123/edit_decision_list.csv
📄 SRT saved: /tmp/video-edit-demo-123/subtitles.srt
✅ Files generated successfully

📹 Step 4: Downloading original video...
✅ Downloaded: 15.2MB

✂️ Step 5: FFmpeg processing...
🎬 Method: Multi-segment cutting
🎞️ Quality: high
📺 Subtitles: Embedded
[... FFmpeg cutting details ...]
✅ FFmpeg processing completed:
📊 Original: 15.2MB
📊 Final: 9.8MB
📊 Size change: -35.5%

📱 Step 6: Creating Instagram-ready video...
🎯 Target format: 1080:1920 portrait (Instagram Stories/Reels)
💾 Temp clean video saved: /tmp/video-edit-demo-123/temp_clean.mp4
📄 SRT file created: /tmp/video-edit-demo-123/subtitles.srt
🎬 Converting to portrait (Instagram Stories/Reels) format with burned subtitles...
🔥 Burning subtitles from: /tmp/video-edit-demo-123/subtitles.srt
🎬 Instagram conversion command: ffmpeg -i temp_clean.mp4 -vf scale=1080:1920...
⏳ Converting: 100.0%
✅ Final Instagram-ready video created at /tmp/video-edit-demo-123/output.mp4

🐛 Debug: Comprehensive timing summary saved to /tmp/video-edit-demo-123/debug_summary.json

⏱️  Performance Summary:
   • Total pipeline time: 49.0s
   • Transcription: 8.2s
   • LLM analysis: 12.5s  
   • FFmpeg processing: 28.3s
   • Processing speed: 0.9x realtime

📝 Step 7: Updating database...
✅ Database updated

🎉 Speaker-to-Camera Pipeline Complete!
📊 Summary:
   • Segments processed: 12
   • Segments kept: 8
   • Time reduction: 22.5%
   • Files generated: Yes
   • Instagram format: 1080:1920 portrait (Instagram Stories/Reels)
   • Burned subtitles: Yes
   • Final video: /tmp/video-edit-demo-123/output.mp4

📁 Debug Files Generated:
   • transcript.json - Raw OpenAI transcription data
   • micro_segments.json - Segmentation analysis
   • llm_decisions.json - LLM keep/drop decisions  
   • debug_summary.json - Complete timing & statistics
   • All files in: /tmp/video-edit-demo-123
  `
  
  console.log(completeOutput)
  
  return completeOutput
}

/**
 * Example 6: Debug File Usage Scenarios
 */
export function exampleDebugFileUsage() {
  console.log('🔧 Debug File Usage Scenarios\n')
  
  const usageScenarios = [
    {
      scenario: 'Troubleshooting Poor Quality',
      files: ['transcript.json', 'llm_decisions.json'],
      steps: [
        'Check transcript.json for transcription accuracy',
        'Look for excessive filler words or unclear speech',
        'Review llm_decisions.json decision patterns',
        'Examine drop reasons for unexpected cuts'
      ]
    },
    {
      scenario: 'Performance Optimization',
      files: ['debug_summary.json', 'micro_segments.json'],
      steps: [
        'Check debug_summary.json timing breakdown',
        'Identify bottleneck steps (transcription/LLM/FFmpeg)',
        'Review micro_segments.json for segmentation efficiency',
        'Optimize model choices based on processing speed'
      ]
    },
    {
      scenario: 'Quality Validation',
      files: ['llm_decisions.json', 'transcript.json'],
      steps: [
        'Compare kept vs dropped text quality',
        'Verify decision reasons align with expectations',
        'Check for missed good content or kept poor content',
        'Validate timing accuracy against original'
      ]
    },
    {
      scenario: 'Script Alignment Analysis',
      files: ['transcript.json', 'llm_decisions.json'],
      steps: [
        'Compare transcript text with provided script',
        'Identify deviations and ad-lib content',
        'Check if script-aligned content is properly kept',
        'Analyze off-script content handling'
      ]
    }
  ]
  
  console.log('📋 Debug Usage Scenarios:')
  usageScenarios.forEach((scenario, index) => {
    console.log(`  ${index + 1}. ${scenario.scenario}`)
    console.log(`     Key Files: ${scenario.files.join(', ')}`)
    console.log(`     Steps:`)
    scenario.steps.forEach((step, stepIndex) => {
      console.log(`       ${stepIndex + 1}. ${step}`)
    })
    console.log()
  })
  
  return usageScenarios
}

/**
 * Run all debug examples
 */
export async function runAllDebugExamples() {
  console.log('🚀 Running All Debug Pipeline Examples\n')
  
  const results = {
    structure: exampleDebugFileStructure(),
    timing: exampleTimingStatistics(),
    warnings: exampleQualityWarnings(),
    summary: exampleDebugSummaryStructure(),
    output: exampleCompleteDebugOutput(),
    usage: exampleDebugFileUsage()
  }
  
  console.log('\n🎉 All debug examples completed!')
  console.log('\n🐛 Debug System Summary:')
  console.log('  ✅ Raw transcript preservation (transcript.json)')
  console.log('  ✅ Micro-segmentation analysis (micro_segments.json)')
  console.log('  ✅ LLM decision tracking (llm_decisions.json)')
  console.log('  ✅ Comprehensive timing metrics (debug_summary.json)')
  console.log('  ✅ Quality validation warnings')
  console.log('  ✅ Performance optimization insights')
  console.log('  ✅ Troubleshooting support')
  
  return results
}

// Export for easy testing
export const debugPipelineExamples = {
  exampleDebugFileStructure,
  exampleTimingStatistics,
  exampleQualityWarnings,
  exampleDebugSummaryStructure,
  exampleCompleteDebugOutput,
  exampleDebugFileUsage,
  runAllDebugExamples
}
