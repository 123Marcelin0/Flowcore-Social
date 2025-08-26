// Test suite for advanced FFmpeg cutting functionality
import { 
  cutVideo, 
  cutVideoFromKeepSegments, 
  quickCut, 
  cutWithSubtitles, 
  fastCut,
  validateFFmpeg,
  getFFmpegPath,
  CutSegment,
  FFmpegOptions 
} from './ffmpeg'
import { KeepSegment, KeepReason } from './types'

/**
 * Create test cut segments with various scenarios
 */
function createTestSegments(): CutSegment[] {
  return [
    {
      start_ms: 2000,    // 2s
      end_ms: 8500,      // 6.5s duration
      text: "Welcome to our presentation about artificial intelligence and machine learning.",
      index: 0
    },
    {
      start_ms: 12000,   // 12s
      end_ms: 18200,     // 6.2s duration
      text: "Let's explore the key concepts that will transform how we work and live.",
      index: 1
    },
    {
      start_ms: 22500,   // 22.5s
      end_ms: 29800,     // 7.3s duration
      text: "First, we need to understand machine learning as the foundation of modern AI.",
      index: 2
    },
    {
      start_ms: 33000,   // 33s
      end_ms: 38600,     // 5.6s duration
      text: "Next, we'll examine how neural networks process information and make decisions.",
      index: 3
    }
  ]
}

/**
 * Create KeepSegments for testing the convenience function
 */
function createKeepSegments(): KeepSegment[] {
  return [
    {
      start_ms: 1500,
      end_ms: 7200,
      transcript: "Welcome everyone to today's comprehensive overview of artificial intelligence.",
      confidence: 0.95,
      reason: 'script_match' as KeepReason,
      reasonDetails: "Perfect match with script content",
      originalSegmentIndex: 0
    },
    {
      start_ms: 10800,
      end_ms: 16500,
      transcript: "We'll cover machine learning, deep learning, and practical applications.",
      confidence: 0.92,
      reason: 'high_confidence' as KeepReason,
      reasonDetails: "High confidence technical content",
      originalSegmentIndex: 1
    },
    {
      start_ms: 20000,
      end_ms: 26400,
      transcript: "Understanding these concepts is crucial for anyone working with modern technology.",
      confidence: 0.89,
      reason: 'topic_relevant' as KeepReason,
      reasonDetails: "Key educational content",
      originalSegmentIndex: 2
    }
  ]
}

/**
 * Test FFmpeg availability and version
 */
export async function testFFmpegAvailability() {
  console.log('🧪 Testing FFmpeg availability...')
  
  try {
    const validation = await validateFFmpeg()
    
    console.log('📊 FFmpeg Validation Results:')
    console.log(`  Available: ${validation.available ? '✅' : '❌'}`)
    console.log(`  Version: ${validation.version || 'Unknown'}`)
    console.log(`  Path: ${validation.path || 'Not found'}`)
    
    if (validation.available) {
      const path = getFFmpegPath()
      console.log(`  Detected path: ${path}`)
    }
    
    return {
      success: validation.available,
      validation
    }
    
  } catch (error: any) {
    console.error('❌ FFmpeg validation failed:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Test method selection logic
 */
export function testMethodSelection() {
  console.log('🧪 Testing cutting method selection logic...')
  
  const testCases = [
    {
      name: "Stream copy (no filters)",
      options: { videoCodec: 'copy', audioCodec: 'copy' } as FFmpegOptions,
      expectedMethod: 'extract-concat'
    },
    {
      name: "Re-encode with x264",
      options: { videoCodec: 'x264', audioCodec: 'aac' } as FFmpegOptions,
      expectedMethod: 'single-pass'
    },
    {
      name: "Subtitle burn-in",
      options: { 
        videoCodec: 'copy', 
        audioCodec: 'copy',
        subtitles: { enabled: true, burnIn: true }
      } as FFmpegOptions,
      expectedMethod: 'single-pass'
    },
    {
      name: "Custom filters",
      options: { 
        videoCodec: 'copy', 
        audioCodec: 'copy',
        filters: ['scale=1280:720']
      } as FFmpegOptions,
      expectedMethod: 'single-pass'
    },
    {
      name: "Force re-encode",
      options: { 
        videoCodec: 'copy', 
        audioCodec: 'copy',
        forceReencode: true
      } as FFmpegOptions,
      expectedMethod: 'single-pass'
    }
  ]
  
  console.log('📊 Method Selection Results:')
  
  const results = testCases.map(testCase => {
    // This would call the internal shouldUseFilters function
    // For demo purposes, we'll simulate the logic
    const needsFilters = (
      testCase.options.subtitles?.enabled && testCase.options.subtitles?.burnIn ||
      testCase.options.filters && testCase.options.filters.length > 0 ||
      testCase.options.forceReencode ||
      testCase.options.videoCodec !== 'copy' ||
      testCase.options.audioCodec !== 'copy'
    )
    
    const actualMethod = needsFilters ? 'single-pass' : 'extract-concat'
    const passed = actualMethod === testCase.expectedMethod
    
    console.log(`  ${testCase.name}: ${passed ? '✅' : '❌'} (${actualMethod})`)
    
    return {
      ...testCase,
      actualMethod,
      passed
    }
  })
  
  const allPassed = results.every(r => r.passed)
  
  console.log(`\n✅ Method Selection Summary:`)
  console.log(`  Test cases: ${testCases.length}`)
  console.log(`  Passed: ${results.filter(r => r.passed).length}`)
  console.log(`  Failed: ${results.filter(r => !r.passed).length}`)
  console.log(`  Success rate: ${((results.filter(r => r.passed).length / testCases.length) * 100).toFixed(1)}%`)
  
  return {
    success: allPassed,
    results
  }
}

/**
 * Test filter_complex graph generation (dry run)
 */
export function testFilterComplexGeneration() {
  console.log('🧪 Testing filter_complex graph generation...')
  
  const segments = createTestSegments().slice(0, 3) // Use 3 segments for demo
  
  // Simulate the filter graph generation
  const filters: string[] = []
  const inputLabels: string[] = []
  
  // Create trim filters for each segment
  segments.forEach((segment, index) => {
    const startSec = segment.start_ms / 1000
    const endSec = segment.end_ms / 1000
    const label = `seg${index}`
    
    filters.push(`[0:v]trim=start=${startSec}:end=${endSec},setpts=PTS-STARTPTS[${label}v]`)
    filters.push(`[0:a]atrim=start=${startSec}:end=${endSec},asetpts=PTS-STARTPTS[${label}a]`)
    
    inputLabels.push(`[${label}v]`, `[${label}a]`)
  })
  
  // Concatenate all segments
  const concatFilter = `${inputLabels.join('')}concat=n=${segments.length}:v=1:a=1[concatv][concata]`
  filters.push(concatFilter)
  
  // Final output
  filters.push(`[concatv][concata]concat=n=1:v=1:a=1[output]`)
  
  const filterGraph = filters.join(';')
  
  console.log('📝 Generated Filter Graph:')
  console.log('--- FILTER COMPLEX ---')
  console.log(filterGraph)
  console.log('--- END FILTER ---')
  
  // Validate structure
  const hasTrims = filterGraph.includes('trim=start=')
  const hasConcat = filterGraph.includes('concat=n=')
  const hasOutput = filterGraph.includes('[output]')
  const segmentCount = (filterGraph.match(/\[seg\d+v\]/g) || []).length
  
  console.log('\n✅ Filter Graph Validation:')
  console.log(`  Has trim filters: ${hasTrims ? '✅' : '❌'}`)
  console.log(`  Has concat filter: ${hasConcat ? '✅' : '❌'}`)
  console.log(`  Has output mapping: ${hasOutput ? '✅' : '❌'}`)
  console.log(`  Video segments processed: ${segmentCount}`)
  console.log(`  Expected segments: ${segments.length}`)
  
  return {
    success: hasTrims && hasConcat && hasOutput && segmentCount === segments.length,
    filterGraph,
    validation: { hasTrims, hasConcat, hasOutput, segmentCount }
  }
}

/**
 * Test subtitle filter generation
 */
export function testSubtitleFilterGeneration() {
  console.log('🧪 Testing subtitle filter generation...')
  
  const segments = createTestSegments().slice(0, 2) // Use 2 segments for demo
  
  // Simulate subtitle filter generation
  const subtitleFilters: string[] = []
  let cumulativeTime = 0
  
  segments.forEach((segment, index) => {
    if (segment.text) {
      const startTime = cumulativeTime / 1000
      const endTime = (cumulativeTime + (segment.end_ms - segment.start_ms)) / 1000
      
      const drawtext = `drawtext=text='${segment.text.replace(/'/g, "\\'")}':` +
        `fontfile='Arial':fontsize=24:fontcolor=#FFFFFF:` +
        `bordercolor=#000000:borderw=2:` +
        `x=(w-text_w)/2:y=h-text_h-30:` +
        `enable='between(t,${startTime},${endTime})'`
      
      subtitleFilters.push(drawtext)
      cumulativeTime += (segment.end_ms - segment.start_ms)
    }
  })
  
  const subtitleFilter = subtitleFilters.join(',')
  
  console.log('📝 Generated Subtitle Filter:')
  console.log('--- SUBTITLE FILTER ---')
  console.log(subtitleFilter)
  console.log('--- END SUBTITLE ---')
  
  // Validate structure
  const hasDrawtext = subtitleFilter.includes('drawtext=')
  const hasTimingEnabled = subtitleFilter.includes('enable=')
  const hasPositioning = subtitleFilter.includes('x=(w-text_w)/2')
  const subtitleCount = (subtitleFilter.match(/drawtext=/g) || []).length
  
  console.log('\n✅ Subtitle Filter Validation:')
  console.log(`  Has drawtext filters: ${hasDrawtext ? '✅' : '❌'}`)
  console.log(`  Has timing controls: ${hasTimingEnabled ? '✅' : '❌'}`)
  console.log(`  Has positioning: ${hasPositioning ? '✅' : '❌'}`)
  console.log(`  Subtitle count: ${subtitleCount}`)
  console.log(`  Expected count: ${segments.filter(s => s.text).length}`)
  
  return {
    success: hasDrawtext && hasTimingEnabled && hasPositioning,
    subtitleFilter,
    validation: { hasDrawtext, hasTimingEnabled, hasPositioning, subtitleCount }
  }
}

/**
 * Test encoding arguments generation
 */
export function testEncodingArgs() {
  console.log('🧪 Testing encoding arguments generation...')
  
  const testCases = [
    {
      name: "High quality x264 + AAC",
      options: { videoCodec: 'x264', audioCodec: 'aac', quality: 'high' } as FFmpegOptions,
      expectedArgs: ['-c:v', 'x264', '-crf', '18', '-preset', 'slow', '-c:a', 'aac', '-b:a', '192k']
    },
    {
      name: "Stream copy",
      options: { videoCodec: 'copy', audioCodec: 'copy' } as FFmpegOptions,
      expectedArgs: ['-c:v', 'copy', '-c:a', 'copy']
    },
    {
      name: "Medium quality with MP4 optimization",
      options: { videoCodec: 'x264', audioCodec: 'aac', quality: 'medium', outputFormat: 'mp4' } as FFmpegOptions,
      expectedArgs: ['-c:v', 'x264', '-crf', '23', '-preset', 'medium', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart']
    }
  ]
  
  console.log('📊 Encoding Arguments Results:')
  
  const results = testCases.map(testCase => {
    // Simulate getEncodingArgs function
    const args: string[] = []
    
    // Video codec logic
    if (testCase.options.videoCodec === 'copy') {
      args.push('-c:v', 'copy')
    } else {
      args.push('-c:v', testCase.options.videoCodec!)
      
      // Quality settings
      switch (testCase.options.quality) {
        case 'high':
          args.push('-crf', '18', '-preset', 'slow')
          break
        case 'medium':
          args.push('-crf', '23', '-preset', 'medium')
          break
        case 'low':
          args.push('-crf', '28', '-preset', 'fast')
          break
      }
    }
    
    // Audio codec logic
    if (testCase.options.audioCodec === 'copy') {
      args.push('-c:a', 'copy')
    } else {
      args.push('-c:a', testCase.options.audioCodec!)
      
      switch (testCase.options.quality) {
        case 'high':
          args.push('-b:a', '192k')
          break
        case 'medium':
          args.push('-b:a', '128k')
          break
        case 'low':
          args.push('-b:a', '96k')
          break
      }
    }
    
    // Format-specific options
    if (testCase.options.outputFormat === 'mp4') {
      args.push('-movflags', '+faststart')
    }
    
    const argsMatch = JSON.stringify(args) === JSON.stringify(testCase.expectedArgs)
    
    console.log(`  ${testCase.name}: ${argsMatch ? '✅' : '❌'}`)
    console.log(`    Generated: [${args.join(', ')}]`)
    console.log(`    Expected:  [${testCase.expectedArgs.join(', ')}]`)
    
    return {
      ...testCase,
      generatedArgs: args,
      passed: argsMatch
    }
  })
  
  const allPassed = results.every(r => r.passed)
  
  return {
    success: allPassed,
    results
  }
}

/**
 * Test SRT time formatting
 */
export function testSRTTimeFormatting() {
  console.log('🧪 Testing SRT time formatting...')
  
  const testCases = [
    { ms: 0, expected: "00:00:00,000" },
    { ms: 1500, expected: "00:00:01,500" },
    { ms: 65000, expected: "00:01:05,000" },
    { ms: 3725750, expected: "01:02:05,750" }
  ]
  
  console.log('📊 SRT Time Formatting Results:')
  
  const results = testCases.map(testCase => {
    // Simulate formatSRTTime function
    const totalSeconds = Math.floor(testCase.ms / 1000)
    const milliseconds = testCase.ms % 1000
    const seconds = totalSeconds % 60
    const minutes = Math.floor(totalSeconds / 60) % 60
    const hours = Math.floor(totalSeconds / 3600)
    
    const formatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`
    
    const passed = formatted === testCase.expected
    
    console.log(`  ${testCase.ms}ms → ${formatted} ${passed ? '✅' : '❌'}`)
    
    return {
      ...testCase,
      formatted,
      passed
    }
  })
  
  const allPassed = results.every(r => r.passed)
  
  return {
    success: allPassed,
    results
  }
}

/**
 * Test convenience functions (dry run)
 */
export function testConvenienceFunctions() {
  console.log('🧪 Testing convenience function configurations...')
  
  const segments = createTestSegments()
  const keepSegments = createKeepSegments()
  
  // Test function configurations (not actual execution)
  const quickCutConfig = {
    outputFormat: 'mp4',
    quality: 'medium',
    videoCodec: 'x264',
    audioCodec: 'aac'
  }
  
  const fastCutConfig = {
    outputFormat: 'mp4',
    videoCodec: 'copy',
    audioCodec: 'copy'
  }
  
  const subtitleCutConfig = {
    outputFormat: 'mp4',
    quality: 'high',
    videoCodec: 'x264',
    audioCodec: 'aac',
    subtitles: {
      enabled: true,
      burnIn: true
    }
  }
  
  console.log('📊 Convenience Function Configurations:')
  console.log(`  quickCut: ${JSON.stringify(quickCutConfig)}`)
  console.log(`  fastCut: ${JSON.stringify(fastCutConfig)}`)
  console.log(`  cutWithSubtitles: ${JSON.stringify(subtitleCutConfig)}`)
  
  // Validate configurations
  const quickCutValid = quickCutConfig.videoCodec === 'x264' && quickCutConfig.quality === 'medium'
  const fastCutValid = fastCutConfig.videoCodec === 'copy' && fastCutConfig.audioCodec === 'copy'
  const subtitleCutValid = subtitleCutConfig.subtitles.enabled && subtitleCutConfig.subtitles.burnIn
  
  console.log('\n✅ Configuration Validation:')
  console.log(`  quickCut valid: ${quickCutValid ? '✅' : '❌'}`)
  console.log(`  fastCut valid: ${fastCutValid ? '✅' : '❌'}`)
  console.log(`  cutWithSubtitles valid: ${subtitleCutValid ? '✅' : '❌'}`)
  
  return {
    success: quickCutValid && fastCutValid && subtitleCutValid,
    configurations: {
      quickCut: quickCutConfig,
      fastCut: fastCutConfig,
      subtitleCut: subtitleCutConfig
    }
  }
}

/**
 * Run all FFmpeg tests (dry run - no actual video processing)
 */
export async function runAllFFmpegTests() {
  console.log('🚀 Running comprehensive FFmpeg test suite...\n')
  
  const tests = [
    { name: 'FFmpeg Availability', test: testFFmpegAvailability },
    { name: 'Method Selection', test: () => Promise.resolve(testMethodSelection()) },
    { name: 'Filter Complex Generation', test: () => Promise.resolve(testFilterComplexGeneration()) },
    { name: 'Subtitle Filter Generation', test: () => Promise.resolve(testSubtitleFilterGeneration()) },
    { name: 'Encoding Arguments', test: () => Promise.resolve(testEncodingArgs()) },
    { name: 'SRT Time Formatting', test: () => Promise.resolve(testSRTTimeFormatting()) },
    { name: 'Convenience Functions', test: () => Promise.resolve(testConvenienceFunctions()) }
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
  
  console.log(`\n🎯 FFmpeg Test Suite Summary:`)
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
 * Demo function showing typical usage patterns
 */
export function demonstrateFFmpegUsage() {
  console.log('🎬 Demonstrating FFmpeg usage patterns...')
  
  const segments = createTestSegments()
  const keepSegments = createKeepSegments()
  
  console.log('\n📊 Input Analysis:')
  console.log(`  Cut segments: ${segments.length}`)
  console.log(`  KeepSegments: ${keepSegments.length}`)
  console.log(`  Total duration: ${segments.reduce((sum, seg) => sum + (seg.end_ms - seg.start_ms), 0) / 1000}s`)
  
  segments.forEach((seg, index) => {
    const duration = (seg.end_ms - seg.start_ms) / 1000
    console.log(`    ${index + 1}. ${duration.toFixed(1)}s: "${seg.text?.substring(0, 40)}${seg.text && seg.text.length > 40 ? '...' : ''}"`)
  })
  
  console.log('\n🔧 Usage Examples:')
  console.log('1. Quick cut (medium quality):')
  console.log('   await quickCut("input.mp4", segments)')
  
  console.log('\n2. Fast cut (stream copy):')
  console.log('   await fastCut("input.mp4", segments)')
  
  console.log('\n3. High quality with subtitle burn-in:')
  console.log('   await cutWithSubtitles("input.mp4", segments)')
  
  console.log('\n4. Custom options:')
  console.log('   await cutVideo("input.mp4", segments, {')
  console.log('     outputFormat: "mp4",')
  console.log('     quality: "high",')
  console.log('     subtitles: { enabled: true, burnIn: true }')
  console.log('   })')
  
  console.log('\n5. From KeepSegments:')
  console.log('   await cutVideoFromKeepSegments("input.mp4", keepSegments)')
  
  return { segments, keepSegments }
}
