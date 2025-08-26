/**
 * Instagram-Ready Pipeline Examples
 * Demonstrates the complete Speaker-to-Camera pipeline with Instagram formatting
 */

import { updateSpeakerToCameraPipeline } from './align'

/**
 * Example 1: Instagram Portrait Format (Stories/Reels)
 */
export async function exampleInstagramPortrait() {
  console.log('📱 Instagram Portrait Pipeline Example\n')
  
  console.log('🎯 Configuration:')
  console.log('  • Format: 1080x1920 portrait')
  console.log('  • Target: Instagram Stories/Reels')
  console.log('  • Subtitles: Burned-in, optimized for vertical viewing')
  console.log('  • Quality: High (OpenAI Whisper with enhanced timing)')
  
  const portraitExample = {
    uploadId: 'example-video-123',
    script: 'Welcome to our AI presentation. Today we explore machine learning.',
    outputQuality: 'high' as const,
    generateFiles: true,
    instagramFormat: 'portrait' as const
  }
  
  console.log('\n📋 Pipeline Steps:')
  console.log('1. 🎤 OpenAI Whisper: Word-level transcription')
  console.log('2. 📊 Micro-segmentation: 2s max segments')
  console.log('3. 🤖 LLM Analysis: Professional editing decisions')
  console.log('4. ✂️ Safe FFmpeg: Segment cutting & validation')
  console.log('5. 📱 Instagram Format: 1080x1920 + burned subtitles')
  console.log('6. 💾 Output: /tmp/video-edit-{id}/output.mp4')
  
  console.log('\n🎬 Expected FFmpeg Command:')
  console.log(`
ffmpeg -i temp_clean.mp4 \\
  -vf "scale=1080:1920:force_original_aspect_ratio=decrease,\\
       pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,\\
       subtitles='subtitles.srt':force_style='FontSize=24,\\
       PrimaryColour=&Hffffff,OutlineColour=&H000000,\\
       BackColour=&H80000000,BorderStyle=1,Outline=2,Shadow=1'" \\
  -c:v libx264 \\
  -crf 23 \\
  -preset medium \\
  -c:a aac \\
  -movflags +faststart \\
  -r 30 \\
  output.mp4
  `)
  
  console.log('📊 Expected Output Structure:')
  console.log('/tmp/video-edit-example-video-123/')
  console.log('├── output.mp4               # Final Instagram-ready video')
  console.log('├── subtitles.srt            # Clean subtitle file')
  console.log('├── edit_decision_list.csv   # EDL for professional editors')
  console.log('└── temp files               # (cleaned up automatically)')
  
  return portraitExample
}

/**
 * Example 2: Instagram Square Format (Posts)
 */
export async function exampleInstagramSquare() {
  console.log('\n📱 Instagram Square Pipeline Example\n')
  
  console.log('🎯 Configuration:')
  console.log('  • Format: 1080x1080 square')
  console.log('  • Target: Instagram Posts/Feed')
  console.log('  • Subtitles: Burned-in, smaller font for square format')
  console.log('  • Quality: Medium (OpenAI Whisper with enhanced timing)')
  
  const squareExample = {
    uploadId: 'square-video-456',
    script: undefined, // No script - let LLM create summary
    outputQuality: 'medium' as const,
    generateFiles: true,
    instagramFormat: 'square' as const
  }
  
  console.log('\n📋 Key Differences from Portrait:')
  console.log('  • Dimensions: 1080x1080 (instead of 1080x1920)')
  console.log('  • Font size: 20px (instead of 24px)')
  console.log('  • Better for landscape/wide original content')
  console.log('  • Optimized for Instagram feed viewing')
  
  console.log('\n🎬 Expected FFmpeg Command:')
  console.log(`
ffmpeg -i temp_clean.mp4 \\
  -vf "scale=1080:1080:force_original_aspect_ratio=decrease,\\
       pad=1080:1080:(ow-iw)/2:(oh-ih)/2:black,\\
       subtitles='subtitles.srt':force_style='FontSize=20,\\
       PrimaryColour=&Hffffff,OutlineColour=&H000000,\\
       BackColour=&H80000000,BorderStyle=1,Outline=2,Shadow=1'" \\
  -c:v libx264 \\
  -crf 23 \\
  -preset medium \\
  -c:a aac \\
  -movflags +faststart \\
  -r 30 \\
  output.mp4
  `)
  
  return squareExample
}

/**
 * Example 3: Complete Pipeline Usage
 */
export async function exampleCompletePipelineUsage() {
  console.log('\n🚀 Complete Pipeline Usage Example\n')
  
  try {
    console.log('📋 Running Instagram Portrait Pipeline...')
    
    const result = await updateSpeakerToCameraPipeline({
      uploadId: 'demo-video-789',
      script: 'Hello everyone! Today we are discussing the future of AI technology.',
      outputQuality: 'high',
      generateFiles: true,
      instagramFormat: 'portrait'
    })
    
    if (result.success) {
      console.log('\n✅ Pipeline completed successfully!')
      console.log('📊 Results:')
      console.log(`   • Video: ${result.videoPath}`)
      console.log(`   • Subtitles: ${result.srtPath}`)
      console.log(`   • EDL: ${result.edlPath}`)
      
      console.log('\n📱 Instagram-Ready Features:')
      console.log('   • Format: 1080x1920 portrait')
      console.log('   • Burned subtitles with professional styling')
      console.log('   • 30fps for smooth Instagram playback')
      console.log('   • Optimized file size with CRF 23')
      console.log('   • Fast-start enabled for web streaming')
      
      return result
    } else {
      console.error('❌ Pipeline failed:', result.error)
      return result
    }
    
  } catch (error) {
    console.error('❌ Pipeline error:', error)
    return { success: false, error: (error as Error).message }
  }
}

/**
 * Example 4: Console Output Walkthrough
 */
export function exampleConsoleOutput() {
  console.log('\n📋 Expected Console Output Walkthrough\n')
  
  const expectedOutput = `
🎬 Starting Speaker-to-Camera Pipeline
📋 Upload ID: demo-video-789
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

🤖 Step 2: Professional video editor analysis...
🎯 Rules: Keep final fluent versions, remove filler, trim pauses >800ms
✅ Analysis completed:
📊 Segments: 8/12 kept
⏱️ Reduction: 22.5%
🗑️ Removed: 4 segments
⏸️ Pauses: 3 detected

📝 Step 3: Generating output files...
📄 EDL saved: /tmp/video-edit-demo-video-789/edit_decision_list.csv
📄 SRT saved: /tmp/video-edit-demo-video-789/subtitles.srt
✅ Files generated successfully

📹 Step 4: Downloading original video...
✅ Downloaded: 15.2MB

✂️ Step 5: FFmpeg processing...
🎬 Method: Multi-segment cutting
🎞️ Quality: high
📺 Subtitles: Embedded
🔍 Filtering segments: checking 8 segments for minimum duration
✅ Valid segments: 8/8 (0 skipped as too short)
📊 Total valid duration: 35.1s
🎨 Fade effects: ENABLED (total duration > 1.0s)
🔧 Safe FFmpeg cutting: Using -ss start -to end with libx264 + AAC re-encoding

✂️ Cutting segment 1/8:
   ⏱️ Time: 1.200s → 4.500s (3.300s)
   📝 Text: "Hello everyone! Today we are discussing the future of AI technology..."
   💾 Output: segment_001.mp4
   🎬 FFmpeg: ffmpeg -i input.mp4 -ss 1.2 -to 4.5...
   ✅ Segment 1 completed

[... segments 2-8 ...]

📝 Creating concat list: 8 segments
🔗 Concatenating segments via concat demuxer...
🎨 Applying fades: 0.30s fade-in/out
⏳ Concatenating: 100.0%
✅ Safe video cutting completed
📊 Final stats: 8 segments → 35.1s video
✅ FFmpeg processing completed:
📊 Original: 15.2MB
📊 Final: 9.8MB
📊 Size change: -35.5%

📱 Step 6: Creating Instagram-ready video...
🎯 Target format: 1080:1920 portrait (Instagram Stories/Reels)
💾 Temp clean video saved: /tmp/video-edit-demo-video-789/temp_clean.mp4
📄 SRT file created: /tmp/video-edit-demo-video-789/subtitles.srt
🎬 Converting to portrait (Instagram Stories/Reels) format with burned subtitles...
🔥 Burning subtitles from: /tmp/video-edit-demo-video-789/subtitles.srt
🎬 Instagram conversion command: ffmpeg -i temp_clean.mp4 -vf scale=1080:1920...
⏳ Converting: 100.0%
✅ Final Instagram-ready video created at /tmp/video-edit-demo-video-789/output.mp4

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
   • Final video: /tmp/video-edit-demo-video-789/output.mp4
  `
  
  console.log(expectedOutput)
  
  return expectedOutput
}

/**
 * Example 5: File Structure and Outputs
 */
export function exampleFileStructure() {
  console.log('\n📁 Output File Structure\n')
  
  const fileStructure = {
    outputDirectory: '/tmp/video-edit-{uploadId}/',
    files: [
      {
        name: 'output.mp4',
        description: 'Final Instagram-ready video',
        format: 'MP4 H.264 + AAC',
        dimensions: '1080x1920 (portrait) or 1080x1080 (square)',
        features: ['Burned subtitles', '30fps', 'CRF 23 quality', 'Fast-start enabled']
      },
      {
        name: 'subtitles.srt',
        description: 'Clean subtitle file (SubRip format)',
        format: 'SRT text file',
        content: 'Time-synced captions from kept segments only',
        features: ['Professional formatting', 'Minimum 300ms duration', 'Merged short cues']
      },
      {
        name: 'edit_decision_list.csv',
        description: 'Edit Decision List for professional editors',
        format: 'CSV (CMX 3600 compatible)',
        content: 'Start/end times, segment descriptions, decisions',
        features: ['Industry standard', 'Import into Avid/Premiere', 'Human-readable']
      }
    ],
    temporaryFiles: [
      'temp_clean.mp4 (cleaned up after Instagram conversion)',
      'segment_001.mp4 through segment_N.mp4 (cleaned up after concat)',
      'concat_list.txt (cleaned up after concat)'
    ]
  }
  
  console.log('📋 Primary Output Files:')
  fileStructure.files.forEach((file, index) => {
    console.log(`  ${index + 1}. ${file.name}`)
    console.log(`     Description: ${file.description}`)
    console.log(`     Format: ${file.format}`)
    console.log(`     Content: ${file.content || file.dimensions}`)
    console.log(`     Features: ${file.features.join(', ')}`)
    console.log()
  })
  
  console.log('🗑️ Temporary Files (Auto-cleaned):')
  fileStructure.temporaryFiles.forEach(file => {
    console.log(`  • ${file}`)
  })
  
  console.log('\n💡 Usage Tips:')
  console.log('  • output.mp4: Ready to upload directly to Instagram')
  console.log('  • subtitles.srt: Can be used for additional platforms')
  console.log('  • edit_decision_list.csv: For manual editing refinements')
  console.log('  • All files use consistent naming for easy automation')
  
  return fileStructure
}

/**
 * Example 6: Format Comparison
 */
export function exampleFormatComparison() {
  console.log('\n📊 Instagram Format Comparison\n')
  
  const formatComparison = [
    {
      format: 'Portrait (1080x1920)',
      target: 'Instagram Stories, Reels',
      aspectRatio: '9:16',
      fontSize: '24px',
      bestFor: 'Vertical/mobile content, speaking to camera',
      viewingContext: 'Full-screen mobile viewing',
      engagement: 'Higher for Stories/Reels'
    },
    {
      format: 'Square (1080x1080)',
      target: 'Instagram Posts, Feed',
      aspectRatio: '1:1',
      fontSize: '20px',
      bestFor: 'Landscape/wide content, presentations',
      viewingContext: 'Feed scrolling, desktop viewing',
      engagement: 'Better for feed visibility'
    }
  ]
  
  console.log('📋 Format Specifications:')
  formatComparison.forEach((format, index) => {
    console.log(`  ${index + 1}. ${format.format}`)
    console.log(`     Target: ${format.target}`)
    console.log(`     Aspect Ratio: ${format.aspectRatio}`)
    console.log(`     Subtitle Font: ${format.fontSize}`)
    console.log(`     Best For: ${format.bestFor}`)
    console.log(`     Viewing: ${format.viewingContext}`)
    console.log(`     Engagement: ${format.engagement}`)
    console.log()
  })
  
  console.log('🎯 Choosing the Right Format:')
  console.log('  • Use PORTRAIT for:')
  console.log('    - Speaker-to-camera content')
  console.log('    - Vertical phone recordings')
  console.log('    - Instagram Stories/Reels')
  console.log('    - Maximum mobile engagement')
  console.log()
  console.log('  • Use SQUARE for:')
  console.log('    - Presentation content')
  console.log('    - Landscape recordings')
  console.log('    - Instagram feed posts')
  console.log('    - Cross-platform compatibility')
  
  return formatComparison
}

/**
 * Run all Instagram pipeline examples
 */
export async function runAllInstagramExamples() {
  console.log('🚀 Running All Instagram Pipeline Examples\n')
  
  const results = {
    portrait: exampleInstagramPortrait(),
    square: await exampleInstagramSquare(),
    usage: await exampleCompletePipelineUsage(),
    console: exampleConsoleOutput(),
    files: exampleFileStructure(),
    comparison: exampleFormatComparison()
  }
  
  console.log('\n🎉 All Instagram examples completed!')
  console.log('\n📱 Instagram Pipeline Summary:')
  console.log('  ✅ OpenAI Whisper word-level transcription')
  console.log('  ✅ LLM professional editing decisions')
  console.log('  ✅ Safe FFmpeg segment cutting')
  console.log('  ✅ Instagram format conversion (portrait/square)')
  console.log('  ✅ Burned subtitle integration')
  console.log('  ✅ Professional file outputs')
  console.log('  ✅ Comprehensive error handling')
  
  return results
}

// Export for easy testing
export const instagramPipelineExamples = {
  exampleInstagramPortrait,
  exampleInstagramSquare,
  exampleCompletePipelineUsage,
  exampleConsoleOutput,
  exampleFileStructure,
  exampleFormatComparison,
  runAllInstagramExamples
}
