// Example usage of the updated Speaker-to-Camera Pipeline
import { updateSpeakerToCameraPipeline } from './align'

/**
 * Example 1: Basic pipeline usage with script
 */
export async function exampleBasicPipeline() {
  console.log('🎬 Example: Basic Speaker-to-Camera Pipeline')
  
  const result = await updateSpeakerToCameraPipeline({
    uploadId: 'video_upload_123',
    script: 'Welcome to our presentation about AI technology. We will explore machine learning concepts and their applications.',
    outputQuality: 'medium',
    generateFiles: true
  })
  
  if (result.success) {
    console.log('✅ Pipeline completed successfully!')
    console.log(`📹 Final video: ${result.videoPath}`)
    console.log(`📄 Subtitle file: ${result.srtPath}`)
    console.log(`📋 Edit list: ${result.edlPath}`)
  } else {
    console.error('❌ Pipeline failed:', result.error)
  }
  
  return result
}

/**
 * Example 2: High-quality processing without script
 */
export async function exampleHighQuality() {
  console.log('🎬 Example: High-quality processing (no script)')
  
  const result = await updateSpeakerToCameraPipeline({
    uploadId: 'presentation_456',
    outputQuality: 'high',
    generateFiles: true
  })
  
  return result
}

/**
 * Example 3: Quick processing without files
 */
export async function exampleQuickProcessing() {
  console.log('🎬 Example: Quick processing (video only)')
  
  const result = await updateSpeakerToCameraPipeline({
    uploadId: 'lecture_789',
    outputQuality: 'low',
    generateFiles: false // Only generate final video
  })
  
  return result
}

/**
 * Example 4: Professional production workflow
 */
export async function exampleProductionWorkflow() {
  console.log('🎬 Example: Professional production workflow')
  
  const professionalScript = `
    Welcome everyone to today's comprehensive workshop on artificial intelligence.
    We'll be exploring cutting-edge machine learning algorithms and their practical applications.
    By the end of this session, you'll have a solid understanding of how to implement AI solutions.
    Let's dive into the fundamentals and build something amazing together.
  `
  
  const result = await updateSpeakerToCameraPipeline({
    uploadId: 'workshop_recording_001',
    script: professionalScript.trim(),
    outputQuality: 'high',
    generateFiles: true
  })
  
  if (result.success) {
    console.log('\n🎉 Production workflow completed!')
    console.log('📊 Generated files:')
    console.log(`   📹 Final video: ${result.videoPath}`)
    console.log(`   📄 Subtitles: ${result.srtPath}`)
    console.log(`   📋 Edit Decision List: ${result.edlPath}`)
    
    // In a real workflow, you might upload these to storage
    console.log('\n📤 Next steps:')
    console.log('   • Upload final video to storage')
    console.log('   • Distribute subtitle files')
    console.log('   • Archive edit decision list')
  }
  
  return result
}

/**
 * Example 5: Batch processing multiple videos
 */
export async function exampleBatchProcessing() {
  console.log('🎬 Example: Batch processing multiple videos')
  
  const videoUploads = [
    { uploadId: 'intro_video_001', script: 'Welcome to our course introduction.', quality: 'medium' as const },
    { uploadId: 'lesson_001', script: 'Today we learn about fundamentals.', quality: 'high' as const },
    { uploadId: 'outro_video_001', script: 'Thank you for watching our course.', quality: 'medium' as const }
  ]
  
  const results = []
  
  for (const video of videoUploads) {
    console.log(`\n🔄 Processing ${video.uploadId}...`)
    
    const result = await updateSpeakerToCameraPipeline({
      uploadId: video.uploadId,
      script: video.script,
      outputQuality: video.quality,
      generateFiles: true
    })
    
    results.push({
      uploadId: video.uploadId,
      ...result
    })
    
    if (result.success) {
      console.log(`✅ ${video.uploadId} completed`)
    } else {
      console.error(`❌ ${video.uploadId} failed:`, result.error)
    }
  }
  
  const successful = results.filter(r => r.success).length
  const failed = results.length - successful
  
  console.log(`\n📊 Batch processing summary:`)
  console.log(`   Total videos: ${results.length}`)
  console.log(`   Successful: ${successful}`)
  console.log(`   Failed: ${failed}`)
  console.log(`   Success rate: ${((successful / results.length) * 100).toFixed(1)}%`)
  
  return results
}

/**
 * Example 6: Error handling and recovery
 */
export async function exampleErrorHandling() {
  console.log('🎬 Example: Error handling and recovery')
  
  // Try processing a video that might fail
  const result = await updateSpeakerToCameraPipeline({
    uploadId: 'potentially_problematic_video',
    script: 'This video might have transcription issues.',
    outputQuality: 'medium',
    generateFiles: true
  })
  
  if (!result.success) {
    console.log('⚠️ Pipeline failed, attempting recovery...')
    
    // Recovery strategy: try without script
    console.log('🔄 Retry without script...')
    const retryResult = await updateSpeakerToCameraPipeline({
      uploadId: 'potentially_problematic_video',
      outputQuality: 'medium',
      generateFiles: false // Simplify to just video
    })
    
    if (retryResult.success) {
      console.log('✅ Recovery successful with simplified processing')
      return retryResult
    } else {
      console.error('❌ Recovery failed:', retryResult.error)
      return retryResult
    }
  }
  
  return result
}

/**
 * Expected console output example
 */
export function showExpectedOutput() {
  console.log('📋 Expected Pipeline Console Output:')
  console.log(`
🎬 Starting Speaker-to-Camera Pipeline
📋 Upload ID: video_upload_123
📜 Script provided: Yes
🎯 Quality: medium

📊 Step 1: Loading media and transcription...
✅ Found 24 transcribed segments
📊 Duration: 120.5s
🎤 Word count: 287

🤖 Step 2: Professional video editor analysis...
🎯 Rules: Keep final fluent versions, remove filler, trim pauses >800ms
✅ Analysis completed:
📊 Segments: 15/24 kept
⏱️ Reduction: 32.4%
🗑️ Removed: 9 segments
⏸️ Pauses: 6 detected

📝 Step 3: Generating output files...
📄 EDL saved: /tmp/edit_decision_list_video_upload_123.csv
📄 SRT saved: /tmp/subtitles_video_upload_123.srt
✅ Files generated successfully

📹 Step 4: Downloading original video...
✅ Downloaded: 45.2MB

✂️ Step 5: FFmpeg processing...
🎬 Method: Multi-segment cutting
🎞️ Quality: medium
📺 Subtitles: Embedded
✅ FFmpeg processing completed:
📊 Original: 45.2MB
📊 Final: 28.1MB
📊 Size change: -37.8%

💾 Step 6: Saving final video...
✅ Final video saved: /tmp/final_video_video_upload_123.mp4

📝 Step 7: Updating database...
✅ Database updated

🎉 Speaker-to-Camera Pipeline Complete!
📊 Summary:
   • Segments processed: 24
   • Segments kept: 15
   • Time reduction: 32.4%
   • Files generated: Yes
   • Final video: /tmp/final_video_video_upload_123.mp4
  `)
  
  return 'Expected output demonstration complete'
}

/**
 * Run all examples (commented out to avoid actual execution)
 */
export async function runAllExamples() {
  console.log('🚀 Running all Speaker-to-Camera Pipeline examples...\n')
  
  /*
  const examples = [
    { name: 'Basic Pipeline', example: exampleBasicPipeline },
    { name: 'High Quality', example: exampleHighQuality },
    { name: 'Quick Processing', example: exampleQuickProcessing },
    { name: 'Production Workflow', example: exampleProductionWorkflow },
    { name: 'Batch Processing', example: exampleBatchProcessing },
    { name: 'Error Handling', example: exampleErrorHandling }
  ]
  
  for (const { name, example } of examples) {
    console.log(`\n📋 Running ${name} example...`)
    try {
      const result = await example()
      console.log(`✅ ${name} completed`)
    } catch (error) {
      console.error(`❌ ${name} failed:`, error)
    }
  }
  */
  
  console.log('📋 Pipeline Examples Available:')
  console.log('  1. Basic Pipeline - Standard processing with script')
  console.log('  2. High Quality - Maximum quality without script')
  console.log('  3. Quick Processing - Fast processing, video only')
  console.log('  4. Production Workflow - Professional workflow with all files')
  console.log('  5. Batch Processing - Multiple videos in sequence')
  console.log('  6. Error Handling - Recovery strategies for failed processing')
  
  console.log('\n🎯 Key Features:')
  console.log('  ✅ Professional video editor analysis')
  console.log('  ✅ Intelligent filler removal and deduplication')
  console.log('  ✅ Smart pause trimming (>800ms → 250ms)')
  console.log('  ✅ Quality-based FFmpeg processing')
  console.log('  ✅ Comprehensive file generation (EDL, SRT)')
  console.log('  ✅ Clear progress logging with emojis')
  console.log('  ✅ Robust error handling')
  
  return 'All examples ready for execution'
}

/**
 * Quick usage demo
 */
export function quickUsageDemo() {
  console.log('⚡ Quick Usage Demo')
  
  console.log('\n📝 Basic Usage:')
  console.log(`
const result = await updateSpeakerToCameraPipeline({
  uploadId: 'your_video_id',
  script: 'Optional script text...',
  outputQuality: 'medium',
  generateFiles: true
})

if (result.success) {
  console.log('Video ready:', result.videoPath)
  console.log('Subtitles:', result.srtPath) 
  console.log('Edit list:', result.edlPath)
}
  `)
  
  console.log('🎯 Pipeline Flow:')
  console.log('  1. 📊 Load media & transcription')
  console.log('  2. 🤖 Professional video editor analysis')
  console.log('  3. 📝 Generate EDL & SRT files')
  console.log('  4. 📹 Download original video')
  console.log('  5. ✂️ FFmpeg processing')
  console.log('  6. 💾 Save final video')
  console.log('  7. 📝 Update database')
  
  return 'Quick demo complete'
}
