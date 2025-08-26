// Example usage of the advanced FFmpeg cutting system
import { 
  cutVideo, 
  cutVideoFromKeepSegments, 
  quickCut, 
  cutWithSubtitles, 
  fastCut,
  validateFFmpeg,
  CutSegment,
  FFmpegOptions 
} from './ffmpeg'
import { KeepSegment, KeepReason } from './types'

/**
 * Example 1: Fast cutting with stream copy (no re-encoding)
 * Best for: Quick edits when no filters or quality changes needed
 */
export async function exampleFastCut() {
  console.log('⚡ Example 1: Fast cutting with stream copy')
  
  const segments: CutSegment[] = [
    { start_ms: 5000, end_ms: 12000, text: "Introduction segment" },
    { start_ms: 18000, end_ms: 25000, text: "Main content" },
    { start_ms: 30000, end_ms: 35000, text: "Conclusion" }
  ]
  
  console.log('📊 Input segments:')
  segments.forEach((seg, i) => {
    const duration = (seg.end_ms - seg.start_ms) / 1000
    console.log(`  ${i + 1}. ${duration}s: "${seg.text}"`)
  })
  
  console.log('\n🔧 Configuration: Stream copy (no re-encoding)')
  console.log('  • Method: extract-concat')
  console.log('  • Video codec: copy')
  console.log('  • Audio codec: copy')
  console.log('  • Quality: Original (lossless)')
  console.log('  • Speed: Very fast')
  
  // Example usage (commented out to avoid actual execution)
  /*
  try {
    const result = await fastCut('input.mp4', segments)
    
    if (result.success) {
      console.log('✅ Fast cut completed:')
      console.log(`  • Output size: ${(result.fileSize / 1024 / 1024).toFixed(1)}MB`)
      console.log(`  • Duration: ${(result.duration_ms / 1000).toFixed(1)}s`)
      console.log(`  • Processing time: ${result.processingTime_ms}ms`)
      console.log(`  • Method used: ${result.method}`)
      console.log(`  • Re-encoded: ${result.reencoded ? 'Yes' : 'No'}`)
    }
  } catch (error) {
    console.error('❌ Fast cut failed:', error)
  }
  */
  
  return { segments, method: 'extract-concat', reencoded: false }
}

/**
 * Example 2: High-quality cut with subtitle burn-in
 * Best for: Final production videos with embedded subtitles
 */
export async function exampleHighQualityWithSubtitles() {
  console.log('🎬 Example 2: High-quality cut with subtitle burn-in')
  
  const segments: CutSegment[] = [
    { 
      start_ms: 2000, 
      end_ms: 8500, 
      text: "Welcome to our comprehensive guide on artificial intelligence and its applications.",
      index: 0 
    },
    { 
      start_ms: 12000, 
      end_ms: 19300, 
      text: "We'll explore machine learning algorithms and their real-world implementations.",
      index: 1 
    },
    { 
      start_ms: 22500, 
      end_ms: 28800, 
      text: "Understanding these concepts will help you leverage AI in your own projects.",
      index: 2 
    }
  ]
  
  console.log('📊 Input segments with subtitles:')
  segments.forEach((seg, i) => {
    const duration = (seg.end_ms - seg.start_ms) / 1000
    console.log(`  ${i + 1}. ${duration}s: "${seg.text}"`)
  })
  
  console.log('\n🔧 Configuration: High quality with subtitle burn-in')
  console.log('  • Method: single-pass (filter_complex)')
  console.log('  • Video codec: x264')
  console.log('  • Audio codec: AAC')
  console.log('  • Quality: High (CRF 18)')
  console.log('  • Subtitles: Burned into video')
  console.log('  • Font: Arial, 24px, white with black border')
  
  // Example usage (commented out to avoid actual execution)
  /*
  try {
    const result = await cutWithSubtitles('input.mp4', segments, {
      fontSize: 26,
      fontColor: '#FFFFFF',
      backgroundColor: '#00000080',
      borderColor: '#000000',
      borderWidth: 2,
      position: 'bottom',
      marginV: 40
    })
    
    if (result.success) {
      console.log('✅ High-quality cut with subtitles completed:')
      console.log(`  • Output size: ${(result.fileSize / 1024 / 1024).toFixed(1)}MB`)
      console.log(`  • Duration: ${(result.duration_ms / 1000).toFixed(1)}s`)
      console.log(`  • Processing time: ${result.processingTime_ms}ms`)
      console.log(`  • Method used: ${result.method}`)
      console.log(`  • Subtitles: Burned in`)
    }
  } catch (error) {
    console.error('❌ High-quality cut failed:', error)
  }
  */
  
  return { segments, method: 'single-pass', reencoded: true }
}

/**
 * Example 3: Custom advanced options
 * Best for: Professional production with specific requirements
 */
export async function exampleAdvancedOptions() {
  console.log('⚙️ Example 3: Advanced custom options')
  
  const segments: CutSegment[] = [
    { start_ms: 1000, end_ms: 6000, text: "Professional presentation opening" },
    { start_ms: 10000, end_ms: 16000, text: "Technical deep dive content" },
    { start_ms: 20000, end_ms: 25000, text: "Actionable conclusions and next steps" }
  ]
  
  const advancedOptions: FFmpegOptions = {
    outputFormat: 'mp4',
    videoCodec: 'x264',
    audioCodec: 'aac',
    quality: 'high',
    subtitles: {
      enabled: true,
      burnIn: true,
      style: {
        fontFamily: 'Arial',
        fontSize: 28,
        fontColor: '#FFFFFF',
        backgroundColor: '#00000060',
        borderColor: '#000000',
        borderWidth: 3,
        shadowColor: '#000000',
        shadowOffset: { x: 2, y: 2 },
        position: 'bottom',
        marginV: 50
      }
    },
    filters: [
      'scale=1920:1080', // Ensure 1080p output
      'unsharp=5:5:1.0:5:5:0.0' // Slight sharpening
    ],
    forceReencode: false
  }
  
  console.log('📊 Advanced configuration:')
  console.log(`  • Output format: ${advancedOptions.outputFormat}`)
  console.log(`  • Video codec: ${advancedOptions.videoCodec}`)
  console.log(`  • Quality: ${advancedOptions.quality}`)
  console.log(`  • Subtitle burn-in: ${advancedOptions.subtitles?.burnIn ? 'Yes' : 'No'}`)
  console.log(`  • Custom filters: ${advancedOptions.filters?.length} filters`)
  console.log(`  • Filters: ${advancedOptions.filters?.join(', ')}`)
  
  console.log('\n🔧 Expected behavior:')
  console.log('  • Method: single-pass (has filters and subtitles)')
  console.log('  • Processing: filter_complex with trim → concat → scale → sharpen → subtitle burn-in')
  console.log('  • Output: High-quality 1080p MP4 with embedded subtitles')
  
  // Example usage (commented out to avoid actual execution)
  /*
  try {
    const result = await cutVideo('input.mp4', segments, advancedOptions)
    
    if (result.success) {
      console.log('✅ Advanced cut completed:')
      console.log(`  • Method: ${result.method}`)
      console.log(`  • Re-encoded: ${result.reencoded}`)
      console.log(`  • File size: ${(result.fileSize / 1024 / 1024).toFixed(1)}MB`)
      console.log(`  • Processing time: ${result.processingTime_ms}ms`)
      
      if (result.stats) {
        console.log(`  • Video codec: ${result.stats.videoCodec}`)
        console.log(`  • Audio codec: ${result.stats.audioCodec}`)
        console.log(`  • Resolution: ${result.stats.resolution}`)
      }
    }
  } catch (error) {
    console.error('❌ Advanced cut failed:', error)
  }
  */
  
  return { segments, options: advancedOptions, method: 'single-pass' }
}

/**
 * Example 4: Working with KeepSegments from the editing pipeline
 * Best for: Integration with the full video editing pipeline
 */
export async function exampleFromKeepSegments() {
  console.log('🔗 Example 4: Integration with KeepSegments')
  
  const keepSegments: KeepSegment[] = [
    {
      start_ms: 3000,
      end_ms: 9500,
      transcript: "Welcome to our comprehensive tutorial on modern web development frameworks.",
      confidence: 0.95,
      reason: 'script_match' as KeepReason,
      reasonDetails: "Perfect match with script content",
      originalSegmentIndex: 0
    },
    {
      start_ms: 15000,
      end_ms: 22300,
      transcript: "We'll cover React, Vue, and Angular with practical examples and best practices.",
      confidence: 0.92,
      reason: 'high_confidence' as KeepReason,
      reasonDetails: "High confidence technical content",
      originalSegmentIndex: 1
    },
    {
      start_ms: 26000,
      end_ms: 31800,
      transcript: "By the end of this tutorial, you'll be able to choose the right framework for your project.",
      confidence: 0.89,
      reason: 'topic_relevant' as KeepReason,
      reasonDetails: "Key learning outcome statement",
      originalSegmentIndex: 2
    }
  ]
  
  console.log('📊 KeepSegments from editing pipeline:')
  keepSegments.forEach((seg, i) => {
    const duration = (seg.end_ms - seg.start_ms) / 1000
    console.log(`  ${i + 1}. ${duration}s [${seg.reason}]: "${seg.transcript}"`)
    console.log(`     Confidence: ${(seg.confidence * 100).toFixed(1)}% | ${seg.reasonDetails}`)
  })
  
  console.log('\n🔧 Integration workflow:')
  console.log('  1. Video uploaded and transcribed')
  console.log('  2. LLM analyzes and creates KeepSegments')
  console.log('  3. KeepSegments converted to CutSegments')
  console.log('  4. FFmpeg cuts and processes video')
  console.log('  5. Final video with clean editing')
  
  // Example usage (commented out to avoid actual execution)
  /*
  try {
    const result = await cutVideoFromKeepSegments('input.mp4', keepSegments, {
      outputFormat: 'mp4',
      quality: 'medium',
      subtitles: {
        enabled: true,
        burnIn: false // External subtitle file
      }
    })
    
    if (result.success) {
      console.log('✅ KeepSegments cut completed:')
      console.log(`  • Segments processed: ${keepSegments.length}`)
      console.log(`  • Total duration: ${(result.duration_ms / 1000).toFixed(1)}s`)
      console.log(`  • Method: ${result.method}`)
      console.log(`  • Subtitles: External SRT file`)
    }
  } catch (error) {
    console.error('❌ KeepSegments cut failed:', error)
  }
  */
  
  return { keepSegments, method: 'auto-detected' }
}

/**
 * Example 5: Method selection demonstration
 * Shows how the system automatically chooses between single-pass and extract-concat
 */
export function exampleMethodSelection() {
  console.log('🎯 Example 5: Automatic method selection')
  
  const segments: CutSegment[] = [
    { start_ms: 2000, end_ms: 7000, text: "Sample segment" },
    { start_ms: 10000, end_ms: 15000, text: "Another segment" }
  ]
  
  const scenarios = [
    {
      name: "Stream copy only",
      options: { videoCodec: 'copy', audioCodec: 'copy' } as FFmpegOptions,
      expectedMethod: 'extract-concat',
      reason: "No filters needed, can use fast stream copy"
    },
    {
      name: "Re-encode with x264",
      options: { videoCodec: 'x264', audioCodec: 'aac' } as FFmpegOptions,
      expectedMethod: 'single-pass',
      reason: "Re-encoding required, must use filter_complex"
    },
    {
      name: "Subtitle burn-in",
      options: { 
        videoCodec: 'copy', 
        audioCodec: 'copy',
        subtitles: { enabled: true, burnIn: true }
      } as FFmpegOptions,
      expectedMethod: 'single-pass',
      reason: "Subtitle burn-in requires video filters"
    },
    {
      name: "Custom video filters",
      options: { 
        videoCodec: 'copy', 
        audioCodec: 'copy',
        filters: ['scale=1280:720', 'unsharp=5:5:0.8']
      } as FFmpegOptions,
      expectedMethod: 'single-pass',
      reason: "Custom filters prevent stream copy"
    },
    {
      name: "External subtitles",
      options: { 
        videoCodec: 'copy', 
        audioCodec: 'copy',
        subtitles: { enabled: true, burnIn: false }
      } as FFmpegOptions,
      expectedMethod: 'extract-concat',
      reason: "External subtitles don't require filters"
    }
  ]
  
  console.log('📊 Method selection scenarios:')
  
  scenarios.forEach((scenario, i) => {
    console.log(`\n  ${i + 1}. ${scenario.name}:`)
    console.log(`     Expected method: ${scenario.expectedMethod}`)
    console.log(`     Reason: ${scenario.reason}`)
    console.log(`     Options: ${JSON.stringify(scenario.options)}`)
  })
  
  console.log('\n🔧 Selection logic:')
  console.log('  • extract-concat: Fast, uses stream copy when no filters needed')
  console.log('  • single-pass: Uses filter_complex for filters, re-encoding, or subtitle burn-in')
  console.log('  • Guard: Prevents "Filtering and streamcopy cannot be used together" error')
  
  return { scenarios, segments }
}

/**
 * Example 6: Error handling and validation
 */
export async function exampleErrorHandling() {
  console.log('🛡️ Example 6: Error handling and validation')
  
  // Check FFmpeg availability
  console.log('\n1. Validating FFmpeg availability...')
  const validation = await validateFFmpeg()
  
  console.log(`   Available: ${validation.available ? '✅' : '❌'}`)
  if (validation.available) {
    console.log(`   Version: ${validation.version}`)
    console.log(`   Path: ${validation.path}`)
  } else {
    console.log('   ❌ FFmpeg not found - install @ffmpeg-installer/ffmpeg or system FFmpeg')
  }
  
  console.log('\n2. Common error scenarios:')
  
  const errorScenarios = [
    {
      name: "Empty segments array",
      segments: [],
      error: "No segments provided for cutting"
    },
    {
      name: "Invalid time ranges",
      segments: [{ start_ms: 5000, end_ms: 2000, text: "Invalid" }],
      error: "End time before start time"
    },
    {
      name: "Missing input file",
      file: "nonexistent.mp4",
      error: "Input file not found"
    },
    {
      name: "Insufficient disk space",
      issue: "Temp directory full",
      error: "Cannot write temporary files"
    }
  ]
  
  errorScenarios.forEach((scenario, i) => {
    console.log(`   ${i + 1}. ${scenario.name}:`)
    console.log(`      Error: ${scenario.error}`)
    console.log(`      Handling: Graceful failure with detailed error message`)
  })
  
  console.log('\n3. Best practices:')
  console.log('   • Always validate FFmpeg availability before processing')
  console.log('   • Check segment validity (end > start, reasonable duration)')
  console.log('   • Verify input file exists and is readable')
  console.log('   • Monitor disk space for temporary files')
  console.log('   • Use try-catch blocks for all cutting operations')
  console.log('   • Clean up temporary files even on error')
  
  return { validation, errorScenarios }
}

/**
 * Run all examples (dry run - no actual video processing)
 */
export async function runAllFFmpegExamples() {
  console.log('🚀 Running all FFmpeg cutting examples...\n')
  
  const examples = [
    { name: 'Fast Cut (Stream Copy)', example: exampleFastCut },
    { name: 'High Quality with Subtitles', example: exampleHighQualityWithSubtitles },
    { name: 'Advanced Custom Options', example: exampleAdvancedOptions },
    { name: 'KeepSegments Integration', example: exampleFromKeepSegments },
    { name: 'Method Selection', example: () => Promise.resolve(exampleMethodSelection()) },
    { name: 'Error Handling', example: exampleErrorHandling }
  ]
  
  const results = []
  
  for (const { name, example } of examples) {
    console.log(`\n📋 Running ${name} example...`)
    try {
      const result = await example()
      results.push({ name, success: true, result })
      console.log(`✅ ${name} example completed`)
    } catch (error: any) {
      console.error(`❌ ${name} example failed:`, error)
      results.push({ name, success: false, error: error.message })
    }
  }
  
  console.log(`\n🎯 FFmpeg Examples Summary:`)
  console.log(`  Examples run: ${examples.length}`)
  console.log(`  Successful: ${results.filter(r => r.success).length}`)
  console.log(`  Failed: ${results.filter(r => !r.success).length}`)
  
  console.log('\n📋 Key Features Demonstrated:')
  console.log('  • Intelligent method selection (single-pass vs extract-concat)')
  console.log('  • Stream copy for fast, lossless cutting')
  console.log('  • filter_complex for advanced processing with subtitles')
  console.log('  • Guard against "Filtering and streamcopy" errors')
  console.log('  • Integration with KeepSegments from editing pipeline')
  console.log('  • Professional subtitle burn-in with custom styling')
  console.log('  • Comprehensive error handling and validation')
  
  return {
    success: results.every(r => r.success),
    results,
    totalExamples: examples.length
  }
}

/**
 * Quick demonstration
 */
export function quickDemo() {
  console.log('⚡ Quick FFmpeg demonstration...')
  
  const segments: CutSegment[] = [
    { start_ms: 2000, end_ms: 8000, text: "Introduction to the topic" },
    { start_ms: 12000, end_ms: 18000, text: "Main content explanation" },
    { start_ms: 22000, end_ms: 26000, text: "Summary and conclusion" }
  ]
  
  console.log('\n📊 Sample cutting job:')
  console.log(`  Segments: ${segments.length}`)
  console.log(`  Total duration: ${segments.reduce((sum, seg) => sum + (seg.end_ms - seg.start_ms), 0) / 1000}s`)
  
  console.log('\n🎯 Automatic method selection:')
  console.log('  • No filters/subtitles → extract-concat (fast)')
  console.log('  • With filters/subtitles → single-pass (filter_complex)')
  
  console.log('\n⚡ Usage:')
  console.log('  await quickCut("input.mp4", segments)        // Fast, medium quality')
  console.log('  await fastCut("input.mp4", segments)         // Fastest, stream copy')
  console.log('  await cutWithSubtitles("input.mp4", segments) // High quality + subs')
  
  return segments
}
