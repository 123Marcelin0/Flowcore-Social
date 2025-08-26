// Example usage of the enhanced subtitle generation system
import { makeSrt, quickSRT, makeSrtWithMinDuration, validateSRT, createSubtitleStats, exportAsWebVTT } from './subtitles'
import { KeepSegment, KeepReason } from './types'

/**
 * Example: Real-world presentation with various timing challenges
 */
export function createPresentationExample(): KeepSegment[] {
  return [
    {
      start_ms: 500,
      end_ms: 3200,
      transcript: "Welcome everyone to today's presentation on artificial intelligence.",
      confidence: 0.95,
      reason: 'script_match' as KeepReason,
      reasonDetails: "Perfect script match with high confidence",
      originalSegmentIndex: 0
    },
    {
      start_ms: 3800,
      end_ms: 4050, // Only 250ms - too short!
      transcript: "Um",
      confidence: 0.72,
      reason: 'filler_trim' as KeepReason,
      reasonDetails: "Minimal filler kept for natural flow",
      originalSegmentIndex: 1
    },
    {
      start_ms: 4200,
      end_ms: 4380, // Only 180ms - very short!
      transcript: "so",
      confidence: 0.85,
      reason: 'natural_speech' as KeepReason,
      reasonDetails: "Natural transition word",
      originalSegmentIndex: 2
    },
    {
      start_ms: 4600,
      end_ms: 8500,
      transcript: "let's dive into the core concepts that will transform how we think about technology.",
      confidence: 0.91,
      reason: 'high_confidence' as KeepReason,
      reasonDetails: "Key content with excellent transcription quality",
      originalSegmentIndex: 3
    },
    {
      start_ms: 9000,
      end_ms: 9150, // Only 150ms - extremely short!
      transcript: "First",
      confidence: 0.88,
      reason: 'topic_relevant' as KeepReason,
      reasonDetails: "Important topic transition marker",
      originalSegmentIndex: 4
    },
    {
      start_ms: 9400,
      end_ms: 13800,
      transcript: "we need to understand machine learning as the foundation of modern AI systems.",
      confidence: 0.93,
      reason: 'script_match' as KeepReason,
      reasonDetails: "Core technical content matching script",
      originalSegmentIndex: 5
    },
    {
      start_ms: 14200,
      end_ms: 14350, // 150ms - very short
      transcript: "Next",
      confidence: 0.86,
      reason: 'transition_keep' as KeepReason,
      reasonDetails: "Important section transition",
      originalSegmentIndex: 6
    },
    {
      start_ms: 14600,
      end_ms: 18900,
      transcript: "we'll explore how neural networks process information and make decisions.",
      confidence: 0.89,
      reason: 'ai_summary' as KeepReason,
      reasonDetails: "AI identified as key educational content",
      originalSegmentIndex: 7
    }
  ]
}

/**
 * Example 1: Basic subtitle generation with minimum duration enforcement
 */
export function exampleBasicSubtitles() {
  console.log('🎬 Example 1: Basic subtitle generation with 300ms minimum')
  
  const segments = createPresentationExample()
  
  console.log('\n📊 Input Analysis:')
  console.log(`Total segments: ${segments.length}`)
  
  const shortSegments = segments.filter(seg => (seg.end_ms - seg.start_ms) < 300)
  console.log(`Segments shorter than 300ms: ${shortSegments.length}`)
  
  shortSegments.forEach(seg => {
    const duration = seg.end_ms - seg.start_ms
    console.log(`  - ${duration}ms: "${seg.transcript}"`)
  })
  
  console.log('\n🔄 Generating SRT with intelligent merging...')
  const srt = makeSrt(segments, {
    minCueDuration_ms: 300,
    mergeThreshold_ms: 200,
    wordWrap: true
  })
  
  console.log('\n📝 Generated SRT:')
  console.log('--- SRT OUTPUT ---')
  console.log(srt)
  console.log('--- END SRT ---')
  
  // Analyze the results
  const lines = srt.split('\n').filter(line => line.trim())
  const cueCount = (srt.match(/^\d+$/gm) || []).length
  
  console.log('\n📈 Results:')
  console.log(`Original segments: ${segments.length}`)
  console.log(`Generated cues: ${cueCount}`)
  console.log(`Segments merged: ${segments.length - cueCount}`)
  console.log(`Total SRT lines: ${lines.length}`)
  
  return { segments, srt, cueCount, mergedCount: segments.length - cueCount }
}

/**
 * Example 2: Custom minimum duration (500ms)
 */
export function exampleCustomMinDuration() {
  console.log('\n🎬 Example 2: Custom 500ms minimum duration')
  
  const segments = createPresentationExample()
  const srt = makeSrtWithMinDuration(segments, 500)
  
  console.log('\n📝 Generated SRT (500ms minimum):')
  console.log('--- SRT OUTPUT ---')
  console.log(srt)
  console.log('--- END SRT ---')
  
  const cueCount = (srt.match(/^\d+$/gm) || []).length
  
  console.log('\n📈 Results:')
  console.log(`Original segments: ${segments.length}`)
  console.log(`Generated cues (500ms min): ${cueCount}`)
  console.log(`More aggressive merging: ${segments.length - cueCount}`)
  
  return { segments, srt, cueCount }
}

/**
 * Example 3: Professional broadcast settings
 */
export function exampleBroadcastQuality() {
  console.log('\n🎬 Example 3: Professional broadcast quality settings')
  
  const segments = createPresentationExample()
  const srt = makeSrt(segments, {
    minCueDuration_ms: 300,
    maxCueDuration_ms: 6000,      // Max 6 seconds per cue
    maxCharsPerLine: 37,          // Conservative character limit
    maxLinesPerCue: 2,           // Standard 2-line limit
    mergeThreshold_ms: 150,      // Aggressive merging
    readingSpeed_wpm: 160,       // Slower reading speed for accessibility
    wordWrap: true,
    preserveLineBreaks: false
  })
  
  console.log('\n📝 Broadcast Quality SRT:')
  console.log('--- BROADCAST SRT ---')
  console.log(srt)
  console.log('--- END BROADCAST SRT ---')
  
  return { segments, srt }
}

/**
 * Example 4: Validation and statistics
 */
export function exampleValidationAndStats() {
  console.log('\n🎬 Example 4: Validation and detailed statistics')
  
  const segments = createPresentationExample()
  const srt = makeSrt(segments)
  
  // Parse for validation (simplified parsing for demo)
  const cues = parseSRTForDemo(srt)
  
  // Validate the subtitles
  const validation = validateSRT(cues)
  
  console.log('\n✅ Validation Results:')
  console.log(`Valid: ${validation.valid ? '✅' : '❌'}`)
  console.log(`Issues found: ${validation.issues.length}`)
  
  if (validation.issues.length > 0) {
    console.log('\n⚠️ Issues:')
    validation.issues.forEach(issue => console.log(`  • ${issue}`))
  }
  
  // Generate statistics
  const stats = createSubtitleStats(cues)
  
  console.log('\n📊 Detailed Statistics:')
  console.log(`Total cues: ${stats.totalCues}`)
  console.log(`Total duration: ${(stats.totalDuration_ms / 1000).toFixed(1)}s`)
  console.log(`Average cue duration: ${stats.averageDuration_ms.toFixed(0)}ms`)
  console.log(`Shortest cue: ${stats.shortestCue_ms}ms`)
  console.log(`Longest cue: ${stats.longestCue_ms}ms`)
  console.log(`Total words: ${stats.totalWords}`)
  console.log(`Average words per cue: ${stats.averageWordsPerCue.toFixed(1)}`)
  console.log(`Effective reading speed: ${stats.readingSpeed_wpm.toFixed(1)} WPM`)
  
  console.log('\n📈 Duration Distribution:')
  console.log(`Under 500ms: ${stats.coverage.under_500ms} cues`)
  console.log(`Under 1000ms: ${stats.coverage.under_1000ms} cues`)
  console.log(`Over 3000ms: ${stats.coverage.over_3000ms} cues`)
  console.log(`Over 5000ms: ${stats.coverage.over_5000ms} cues`)
  
  return { validation, stats, cues }
}

/**
 * Example 5: WebVTT export for web players
 */
export function exampleWebVTTExport() {
  console.log('\n🎬 Example 5: WebVTT export for web video players')
  
  const segments = createPresentationExample().slice(0, 4) // Use fewer for cleaner demo
  const srt = makeSrt(segments)
  const cues = parseSRTForDemo(srt)
  const webvtt = exportAsWebVTT(cues)
  
  console.log('\n📄 Generated WebVTT:')
  console.log('--- WEBVTT OUTPUT ---')
  console.log(webvtt)
  console.log('--- END WEBVTT ---')
  
  console.log('\n✅ WebVTT Features:')
  console.log(`Has WEBVTT header: ${webvtt.includes('WEBVTT') ? '✅' : '❌'}`)
  console.log(`Proper timestamp format: ${webvtt.includes(' --> ') ? '✅' : '❌'}`)
  console.log(`Clean cue separation: ${webvtt.split('\n\n').length > 1 ? '✅' : '❌'}`)
  
  return { webvtt, cues }
}

/**
 * Example 6: Comparison of different approaches
 */
export function exampleComparison() {
  console.log('\n🎬 Example 6: Comparison of different subtitle approaches')
  
  const segments = createPresentationExample()
  
  // Standard approach
  const standardSrt = quickSRT(segments)
  const standardCues = (standardSrt.match(/^\d+$/gm) || []).length
  
  // Conservative approach (longer minimum duration)
  const conservativeSrt = makeSrtWithMinDuration(segments, 600)
  const conservativeCues = (conservativeSrt.match(/^\d+$/gm) || []).length
  
  // Aggressive approach (shorter minimum, more merging)
  const aggressiveSrt = makeSrt(segments, {
    minCueDuration_ms: 250,
    mergeThreshold_ms: 300,
    wordWrap: true
  })
  const aggressiveCues = (aggressiveSrt.match(/^\d+$/gm) || []).length
  
  console.log('\n📊 Approach Comparison:')
  console.log(`Original segments: ${segments.length}`)
  console.log(`Standard (300ms min): ${standardCues} cues`)
  console.log(`Conservative (600ms min): ${conservativeCues} cues`)
  console.log(`Aggressive (250ms min): ${aggressiveCues} cues`)
  
  console.log('\n🎯 Recommendations:')
  console.log(`• Standard: Best for most content`)
  console.log(`• Conservative: Better for accessibility`)
  console.log(`• Aggressive: More faithful to original timing`)
  
  return {
    standard: { srt: standardSrt, cues: standardCues },
    conservative: { srt: conservativeSrt, cues: conservativeCues },
    aggressive: { srt: aggressiveSrt, cues: aggressiveCues }
  }
}

/**
 * Simplified SRT parser for demo purposes
 */
function parseSRTForDemo(srt: string) {
  const blocks = srt.split('\n\n').filter(block => block.trim())
  
  return blocks.map((block, index) => {
    const lines = block.split('\n').filter(line => line.trim())
    if (lines.length >= 3) {
      const timeMatch = lines[1].match(/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/)
      if (timeMatch) {
        const startMs = timeToMs(timeMatch[1])
        const endMs = timeToMs(timeMatch[2])
        const text = lines.slice(2).join('\n')
        
        return {
          index: index + 1,
          startTime: timeMatch[1],
          endTime: timeMatch[2],
          text,
          duration_ms: endMs - startMs,
          originalSegments: 1
        }
      }
    }
    return null
  }).filter(Boolean)
}

/**
 * Convert SRT time to milliseconds
 */
function timeToMs(timeStr: string): number {
  const [time, ms] = timeStr.split(',')
  const [hours, minutes, seconds] = time.split(':').map(Number)
  return ((hours * 3600) + (minutes * 60) + seconds) * 1000 + Number(ms)
}

/**
 * Run all subtitle examples
 */
export function runAllSubtitleExamples() {
  console.log('🚀 Running comprehensive subtitle generation examples...\n')
  
  const results = {
    basic: exampleBasicSubtitles(),
    customMinDuration: exampleCustomMinDuration(),
    broadcastQuality: exampleBroadcastQuality(),
    validationAndStats: exampleValidationAndStats(),
    webvttExport: exampleWebVTTExport(),
    comparison: exampleComparison()
  }
  
  console.log('\n🎯 Examples Summary:')
  console.log('✅ All subtitle generation examples completed successfully!')
  console.log('\n📋 Key Features Demonstrated:')
  console.log('• Intelligent merging of segments shorter than 300ms')
  console.log('• Configurable minimum duration enforcement')
  console.log('• Professional broadcast quality settings')
  console.log('• Comprehensive validation and statistics')
  console.log('• WebVTT export for web compatibility')
  console.log('• Multiple approaches for different use cases')
  
  return results
}

/**
 * Quick demo for testing
 */
export function quickDemo() {
  console.log('⚡ Quick subtitle generation demo...')
  
  const segments = createPresentationExample().slice(0, 5)
  const srt = quickSRT(segments)
  
  console.log('\n📝 Quick SRT Result:')
  console.log(srt)
  
  return srt
}
