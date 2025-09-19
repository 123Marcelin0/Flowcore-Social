import { VideoProcessingController, processForInstagramReels, VideoProcessingOptions } from './videoProcessing'
import { ProcessingSignals } from './cuts'
import { createShotstackRenderRequest } from '@/utils/shotstackAdapter'

/**
 * Example usage of the complete video processing pipeline
 * This demonstrates how to use all the functions you've implemented
 */

/**
 * Example 1: Complete processing from signals to Shotstack
 */
export async function exampleCompleteProcessing() {
  console.log('🎬 Example: Complete Video Processing Pipeline')
  
  // Example processing signals (what you'll feed in from your earlier steps)
  const signals: ProcessingSignals = {
    uploadId: 'upload_123456',
    sourceFile: 'my_video.mp4',
    sourceMetadata: {
      duration: 120, // 2 minutes
      resolution: { width: 1920, height: 1080 },
      fps: 30,
      bitrate: 5000000,
      codec: 'h264'
    },
    
    // ASR segments from Whisper
    asrSegments: [
      {
        start: 0,
        end: 3.5,
        text: "Hello everyone, welcome to my channel",
        confidence: 0.95,
        speaker: "Speaker 1"
      },
      {
        start: 3.5,
        end: 8.2,
        text: "Today we're going to talk about, um, artificial intelligence",
        confidence: 0.87,
        speaker: "Speaker 1"
      },
      {
        start: 8.2,
        end: 12.8,
        text: "This is a really important topic that everyone should understand",
        confidence: 0.92,
        speaker: "Speaker 1"
      },
      // ... more segments
    ],
    
    // Silence regions detected
    silenceRegions: [
      {
        start: 2.8,
        end: 3.5,
        duration: 0.7,
        confidence: 0.9
      },
      {
        start: 7.5,
        end: 8.2,
        duration: 0.7,
        confidence: 0.85
      }
    ],
    
    // Filler words detected
    fillerDetections: [
      {
        start: 6.1,
        end: 6.3,
        word: "um",
        confidence: 0.95,
        severity: 'medium'
      }
    ],
    
    // Low confidence regions
    confidenceAnalysis: [
      {
        start: 3.5,
        end: 4.0,
        confidence: 0.65,
        reason: 'background_noise'
      }
    ],
    
    // MediaPipe transforms (from your implementation)
    mediapipeTransforms: [
      {
        timestamp: 0,
        duration: 3.5,
        scale: 1.2,
        x: 20,
        y: -10,
        confidence: 0.88,
        reasoning: "face detection with high confidence",
        easing: 'easeInOutCubic'
      },
      {
        timestamp: 8.2,
        duration: 4.6,
        scale: 1.15,
        x: -15,
        y: 5,
        confidence: 0.92,
        reasoning: "body detection with tracking",
        easing: 'easeInOutCubic'
      }
    ],
    
    // Auto-zoom transforms
    autoZoomTransforms: [
      {
        timestamp: 3.5,
        duration: 4.7,
        scale: 1.25,
        x: 30,
        y: 0,
        easing: 'easeInOutCubic',
        confidence: 0.85
      }
    ],
    
    // AI analysis results (optional)
    aiAnalysis: {
      keepSegments: [
        {
          start: 0,
          end: 3.5,
          reason: "strong introduction",
          confidence: 0.9
        },
        {
          start: 8.2,
          end: 12.8,
          reason: "key information",
          confidence: 0.95
        }
      ],
      removeSegments: [
        {
          start: 3.5,
          end: 8.2,
          reason: "filler content with hesitation",
          confidence: 0.8
        }
      ],
      qualityScore: 0.82,
      recommendations: [
        "Remove filler words for better pacing",
        "Consider adding captions for key points"
      ]
    },
    
    // Processing options
    options: {
      targetFormat: 'instagram_reels',
      targetDuration: 30,
      aggressiveness: 0.7,
      preserveNaturalPauses: true,
      removeFillerWords: true,
      autoFixMistakes: true,
      enableAutoZoom: true,
      enableMediaPipe: true,
      optimizeForEngagement: true
    }
  }
  
  const sourceFilePath = 'https://my-bucket.s3.amazonaws.com/videos/my_video.mp4'
  
  const options: VideoProcessingOptions = {
    quality: 'high',
    callbackUrl: 'https://my-api.com/webhook/render-complete',
    subtitleStyle: {
      fontFamily: 'Arial Black',
      fontSize: 28,
      color: '#FFFFFF'
    }
  }
  
  try {
    // Process the video completely
    const result = await VideoProcessingController.processVideo(signals, sourceFilePath, options)
    
    if (result.success) {
      console.log('✅ Processing completed successfully!')
      console.log(`⏱️  Total time: ${result.processingTimeMs}ms`)
      console.log(`📊 Quality score: ${(result.cutPlan!.qualityMetrics.engagementScore * 100).toFixed(1)}%`)
      
      // The result contains everything you need:
      console.log('\n📋 CutPlan generated with:')
      console.log(`  - ${result.cutPlan!.segments.filter(s => s.action === 'keep').length} kept segments`)
      console.log(`  - ${result.cutPlan!.segments.filter(s => s.action === 'remove').length} removed segments`)
      console.log(`  - ${result.cutPlan!.segments.reduce((sum, s) => sum + s.transforms.length, 0)} transforms`)
      
      console.log('\n📝 EDL generated with:')
      console.log(`  - ${result.edlSummary!.totalTracks} tracks`)
      console.log(`  - ${result.edlSummary!.totalClips} clips`)
      console.log(`  - ${result.edlSummary!.transformCount} keyframes`)
      
      console.log('\n🎯 Shotstack edit ready for rendering')
      
      // If you want to actually render with Shotstack:
      if (process.env.SHOTSTACK_API_KEY) {
        const renderRequest = createShotstackRenderRequest(
          result.shotstackEdit!,
          process.env.SHOTSTACK_API_KEY
        )
        
        console.log('\n🚀 Ready to send to Shotstack:')
        console.log(`URL: ${renderRequest.url}`)
        console.log(`Method: ${renderRequest.method}`)
        console.log('Headers:', renderRequest.headers)
        // console.log('Body:', renderRequest.body) // Uncomment to see full payload
        
        // To actually render:
        // const response = await fetch(renderRequest.url, {
        //   method: renderRequest.method,
        //   headers: renderRequest.headers,
        //   body: renderRequest.body
        // })
        // const renderResult = await response.json()
        // console.log('Render started:', renderResult)
      }
      
    } else {
      console.error('❌ Processing failed:', result.error)
      for (const step of result.steps) {
        if (!step.success) {
          console.error(`  ${step.name}: ${step.error}`)
        }
      }
    }
    
    return result
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    throw error
  }
}

/**
 * Example 2: Step-by-step processing (for debugging or custom workflows)
 */
export async function exampleStepByStep() {
  console.log('🔍 Example: Step-by-Step Processing')
  
  // Use the same signals as above
  const signals: ProcessingSignals = {
    // ... (same as above for brevity)
    uploadId: 'upload_step_by_step',
    sourceFile: 'test_video.mp4',
    sourceMetadata: {
      duration: 60,
      resolution: { width: 1920, height: 1080 },
      fps: 30
    },
    asrSegments: [
      {
        start: 0,
        end: 5,
        text: "This is a test segment",
        confidence: 0.9,
        speaker: "Speaker 1"
      }
    ],
    silenceRegions: [],
    fillerDetections: [],
    confidenceAnalysis: [],
    options: {
      targetFormat: 'instagram_reels',
      aggressiveness: 0.5,
      preserveNaturalPauses: true,
      removeFillerWords: false,
      autoFixMistakes: false,
      enableAutoZoom: false,
      enableMediaPipe: false,
      optimizeForEngagement: true
    }
  }
  
  const sourceFilePath = 'test_video.mp4'
  
  try {
    // Step 1: Generate CutPlan only
    console.log('📋 Step 1: Generating CutPlan...')
    const cutPlan = await VideoProcessingController.generateCutPlanOnly(signals)
    console.log(`✅ CutPlan generated with ${cutPlan.segments.length} segments`)
    
    // Step 2: Convert to EDL
    console.log('📝 Step 2: Converting to EDL...')
    const edlResult = VideoProcessingController.convertCutPlanToEDL(cutPlan, sourceFilePath)
    console.log(`✅ EDL generated with ${edlResult.summary.totalClips} clips`)
    
    // Step 3: Convert to Shotstack
    console.log('🎯 Step 3: Converting to Shotstack...')
    const shotstackResult = VideoProcessingController.convertEDLToShotstack(edlResult.edl, {
      quality: 'medium',
      outputFormat: 'mp4'
    })
    console.log('✅ Shotstack edit generated')
    
    console.log('\n📊 Final Summary:')
    console.log(`  CutPlan ID: ${cutPlan.id}`)
    console.log(`  EDL Duration: ${edlResult.edl.duration}s`)
    console.log(`  Shotstack Tracks: ${shotstackResult.shotstackEdit.timeline.tracks.length}`)
    
    return {
      cutPlan,
      edl: edlResult.edl,
      shotstackEdit: shotstackResult.shotstackEdit
    }
    
  } catch (error) {
    console.error('❌ Step-by-step processing failed:', error)
    throw error
  }
}

/**
 * Example 3: Processing for different social media formats
 */
export async function exampleMultiFormat() {
  console.log('📱 Example: Multi-Format Processing')
  
  const baseSignals: ProcessingSignals = {
    uploadId: 'upload_multi_format',
    sourceFile: 'content_video.mp4',
    sourceMetadata: {
      duration: 180, // 3 minutes
      resolution: { width: 1920, height: 1080 },
      fps: 30
    },
    asrSegments: [
      {
        start: 0,
        end: 10,
        text: "Welcome to my tutorial on video editing",
        confidence: 0.95,
        speaker: "Host"
      },
      {
        start: 10,
        end: 25,
        text: "First, let's cover the basics of timeline editing",
        confidence: 0.92,
        speaker: "Host"
      }
      // ... more segments
    ],
    silenceRegions: [],
    fillerDetections: [],
    confidenceAnalysis: [],
    options: {
      targetFormat: 'instagram_reels', // Will be overridden
      aggressiveness: 0.6,
      preserveNaturalPauses: true,
      removeFillerWords: true,
      autoFixMistakes: true,
      enableAutoZoom: true,
      enableMediaPipe: true,
      optimizeForEngagement: true
    }
  }
  
  const sourceFilePath = 'https://cdn.example.com/content_video.mp4'
  
  try {
    // Process for Instagram Reels (30s)
    console.log('📸 Processing for Instagram Reels...')
    const reelsResult = await processForInstagramReels(baseSignals, sourceFilePath, {
      quality: 'high',
      backgroundMusicUrl: 'https://cdn.example.com/music/energetic.mp3'
    })
    
    // Process for YouTube Shorts (60s)  
    console.log('🎥 Processing for YouTube Shorts...')
    const shortsSignals = { ...baseSignals, options: { ...baseSignals.options, targetFormat: 'youtube_shorts' as const } }
    const shortsResult = await VideoProcessingController.processVideo(shortsSignals, sourceFilePath, {
      quality: 'high',
      outputFormat: 'mp4'
    })
    
    // Process for TikTok (15s)
    console.log('🎵 Processing for TikTok...')
    const tiktokSignals = { 
      ...baseSignals, 
      options: { 
        ...baseSignals.options, 
        targetFormat: 'tiktok' as const,
        aggressiveness: 0.8 // More aggressive for shorter format
      } 
    }
    const tiktokResult = await VideoProcessingController.processVideo(tiktokSignals, sourceFilePath, {
      quality: 'high',
      optimizeForPerformance: true
    })
    
    console.log('\n📊 Multi-Format Results:')
    console.log(`Instagram Reels: ${reelsResult.success ? '✅' : '❌'} (${reelsResult.edl?.duration}s)`)
    console.log(`YouTube Shorts: ${shortsResult.success ? '✅' : '❌'} (${shortsResult.edl?.duration}s)`)
    console.log(`TikTok: ${tiktokResult.success ? '✅' : '❌'} (${tiktokResult.edl?.duration}s)`)
    
    return {
      reels: reelsResult,
      shorts: shortsResult,
      tiktok: tiktokResult
    }
    
  } catch (error) {
    console.error('❌ Multi-format processing failed:', error)
    throw error
  }
}

/**
 * Example 4: Validation and debugging
 */
export async function exampleValidationAndDebugging() {
  console.log('🔍 Example: Validation and Debugging')
  
  // Example of invalid signals to test validation
  const invalidSignals = {
    // Missing required fields
    uploadId: '',
    sourceFile: '',
    // Invalid duration
    sourceMetadata: {
      duration: -10,
      resolution: { width: 0, height: 0 },
      fps: 0
    },
    asrSegments: [],
    silenceRegions: [],
    fillerDetections: [],
    confidenceAnalysis: [],
    options: {}
  } as any
  
  // Test validation
  console.log('🧪 Testing signal validation...')
  const validation = VideoProcessingController.validateProcessingSignals(invalidSignals)
  
  console.log(`Validation result: ${validation.valid ? '✅ Valid' : '❌ Invalid'}`)
  if (!validation.valid) {
    console.log('Validation errors:')
    for (const error of validation.errors) {
      console.log(`  - ${error}`)
    }
  }
  
  // Test with valid signals
  const validSignals: ProcessingSignals = {
    uploadId: 'upload_validation_test',
    sourceFile: 'valid_video.mp4',
    sourceMetadata: {
      duration: 30,
      resolution: { width: 1920, height: 1080 },
      fps: 30
    },
    asrSegments: [
      {
        start: 0,
        end: 5,
        text: "Valid segment",
        confidence: 0.9,
        speaker: "Speaker"
      }
    ],
    silenceRegions: [],
    fillerDetections: [],
    confidenceAnalysis: [],
    options: {
      targetFormat: 'instagram_reels',
      aggressiveness: 0.5,
      preserveNaturalPauses: true,
      removeFillerWords: true,
      autoFixMistakes: false,
      enableAutoZoom: false,
      enableMediaPipe: false,
      optimizeForEngagement: true
    }
  }
  
  console.log('🧪 Testing with valid signals...')
  const validValidation = VideoProcessingController.validateProcessingSignals(validSignals)
  console.log(`Valid signals: ${validValidation.valid ? '✅ Pass' : '❌ Fail'}`)
  
  // Test processing and generate summary
  try {
    const result = await VideoProcessingController.processVideo(validSignals, 'test.mp4')
    const summary = VideoProcessingController.generateProcessingSummary(result)
    
    console.log('\n📋 Processing Summary:')
    console.log(summary)
    
    return { validation, result, summary }
    
  } catch (error) {
    console.error('❌ Processing test failed:', error)
    return { validation, error }
  }
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('🚀 Running All Video Processing Examples\n')
  
  try {
    console.log('=' .repeat(80))
    await exampleCompleteProcessing()
    
    console.log('\n' + '='.repeat(80))
    await exampleStepByStep()
    
    console.log('\n' + '='.repeat(80))
    await exampleMultiFormat()
    
    console.log('\n' + '='.repeat(80))
    await exampleValidationAndDebugging()
    
    console.log('\n✅ All examples completed successfully!')
    
  } catch (error) {
    console.error('\n❌ Example execution failed:', error)
  }
}

// Export for use in other files
export {
  VideoProcessingController,
  processForInstagramReels,
  type ProcessingSignals,
  type VideoProcessingOptions
}