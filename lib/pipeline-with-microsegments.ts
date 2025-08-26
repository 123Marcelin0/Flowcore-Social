/**
 * Pipeline Integration with Micro-segmentation
 * Shows how to use segmentTranscript with WhisperX transcription
 */

import { segmentTranscript, MicroSegment } from './align'
import { transcribeWithWhisperX, WhisperXTranscription } from './whisperx-service'

/**
 * Complete pipeline: WhisperX → Micro-segmentation
 */
export async function transcribeAndSegment(audioInput: string, options: {
  whisperxModel?: 'tiny' | 'base' | 'small' | 'medium' | 'large-v2' | 'large-v3'
  language?: string
  device?: 'cpu' | 'cuda' | 'mps'
} = {}): Promise<{
  success: boolean
  transcription?: WhisperXTranscription
  microSegments?: MicroSegment[]
  error?: string
}> {
  try {
    console.log('🎤 Step 1: WhisperX transcription with word-level timestamps...')
    
    // Transcribe with WhisperX
    const whisperxResult = await transcribeWithWhisperX(audioInput, {
      model: options.whisperxModel || 'base',
      language: options.language || 'en',
      device: options.device || 'cpu'
    })
    
    if (!whisperxResult.success || !whisperxResult.transcription) {
      return {
        success: false,
        error: `WhisperX transcription failed: ${whisperxResult.error}`
      }
    }
    
    console.log(`✅ Transcription completed: ${whisperxResult.transcription.word_count} words`)
    
    console.log('📊 Step 2: Micro-segmentation (max 2s, punctuation/pause breaks)...')
    
    // Create micro-segments from word-level timestamps
    const microSegments = segmentTranscript(whisperxResult.transcription.words)
    
    console.log(`✅ Micro-segmentation completed: ${microSegments.length} segments`)
    
    // Analysis
    const avgSegmentDuration = microSegments.reduce((sum, seg) => sum + (seg.end - seg.start), 0) / microSegments.length
    const maxSegmentDuration = Math.max(...microSegments.map(seg => seg.end - seg.start))
    const wordsPerSegment = whisperxResult.transcription.word_count / microSegments.length
    
    console.log('📊 Segmentation analysis:')
    console.log(`   Average duration: ${avgSegmentDuration.toFixed(1)}s`)
    console.log(`   Max duration: ${maxSegmentDuration.toFixed(1)}s`)
    console.log(`   Words per segment: ${wordsPerSegment.toFixed(1)}`)
    
    return {
      success: true,
      transcription: whisperxResult.transcription,
      microSegments
    }
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Enhanced pipeline with segment analysis
 */
export async function transcribeWithDetailedSegmentation(audioInput: string): Promise<{
  success: boolean
  analysis?: {
    totalWords: number
    totalDuration: number
    segmentCount: number
    averageSegmentDuration: number
    punctuationBreaks: number
    pauseBreaks: number
    durationBreaks: number
    segments: Array<MicroSegment & { 
      wordCount: number
      breakReason: 'punctuation' | 'pause' | 'duration' | 'end'
    }>
  }
  error?: string
}> {
  try {
    console.log('🔍 Enhanced transcription with detailed segmentation analysis...')
    
    // Get transcription and basic segments
    const result = await transcribeAndSegment(audioInput, { whisperxModel: 'medium' })
    
    if (!result.success || !result.transcription || !result.microSegments) {
      return { success: false, error: result.error }
    }
    
    // Analyze break reasons
    const words = result.transcription.words
    const segments = result.microSegments
    
    let punctuationBreaks = 0
    let pauseBreaks = 0
    let durationBreaks = 0
    
    const detailedSegments = segments.map((segment, index) => {
      // Find words in this segment
      const segmentWords = words.filter(word => 
        word.start >= segment.start && word.end <= segment.end
      )
      
      // Determine break reason
      let breakReason: 'punctuation' | 'pause' | 'duration' | 'end' = 'end'
      
      if (index < segments.length - 1) {
        const nextSegment = segments[index + 1]
        const segmentDuration = segment.end - segment.start
        const gapToNext = nextSegment.start - segment.end
        const lastWord = segmentWords[segmentWords.length - 1]
        
        if (lastWord && /[.,?!:…]$/.test(lastWord.text.trim())) {
          breakReason = 'punctuation'
          punctuationBreaks++
        } else if (gapToNext >= 0.6) {
          breakReason = 'pause'
          pauseBreaks++
        } else if (segmentDuration >= 2.0) {
          breakReason = 'duration'
          durationBreaks++
        }
      }
      
      return {
        ...segment,
        wordCount: segmentWords.length,
        breakReason
      }
    })
    
    const analysis = {
      totalWords: result.transcription.word_count,
      totalDuration: result.transcription.duration,
      segmentCount: segments.length,
      averageSegmentDuration: segments.reduce((sum, seg) => sum + (seg.end - seg.start), 0) / segments.length,
      punctuationBreaks,
      pauseBreaks,
      durationBreaks,
      segments: detailedSegments
    }
    
    console.log('📊 Detailed analysis:')
    console.log(`   Total words: ${analysis.totalWords}`)
    console.log(`   Total duration: ${analysis.totalDuration.toFixed(1)}s`)
    console.log(`   Segments: ${analysis.segmentCount}`)
    console.log(`   Average segment: ${analysis.averageSegmentDuration.toFixed(1)}s`)
    console.log(`   Break reasons:`)
    console.log(`     Punctuation: ${punctuationBreaks}`)
    console.log(`     Pause >600ms: ${pauseBreaks}`)
    console.log(`     Duration 2s+: ${durationBreaks}`)
    
    return {
      success: true,
      analysis
    }
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Example usage with real-world scenarios
 */
export function demonstrateMicroSegmentation() {
  console.log('🎬 Micro-segmentation Integration Examples\n')
  
  console.log('📋 Usage Pattern 1: Basic Integration')
  console.log(`
// Basic usage
const result = await transcribeAndSegment('audio.wav', {
  whisperxModel: 'medium',
  language: 'en'
})

if (result.success) {
  console.log('Words:', result.transcription.word_count)
  console.log('Segments:', result.microSegments.length)
  
  result.microSegments.forEach(segment => {
    console.log(\`"\${segment.text}" [\${segment.start}s-\${segment.end}s]\`)
  })
}
  `)
  
  console.log('📋 Usage Pattern 2: Detailed Analysis')
  console.log(`
// Enhanced analysis
const detailed = await transcribeWithDetailedSegmentation('presentation.mp4')

if (detailed.success) {
  console.log('Break analysis:', {
    punctuation: detailed.analysis.punctuationBreaks,
    pauses: detailed.analysis.pauseBreaks,
    duration: detailed.analysis.durationBreaks
  })
}
  `)
  
  console.log('📋 Usage Pattern 3: Direct Segmentation')
  console.log(`
// From existing WhisperX words
const segments = segmentTranscript(whisperxWords)

// Format: [
//   { text: "Hello world", start: 1.2, end: 2.1 },
//   { text: "This is a test", start: 2.7, end: 4.5 }
// ]
  `)
  
  console.log('🎯 Segmentation Rules Applied:')
  console.log('  ✅ Max 2 seconds duration')
  console.log('  ✅ Break at punctuation (.,?!:)')
  console.log('  ✅ Break at pause >600ms')
  console.log('  ✅ Precise timestamps from WhisperX')
  
  console.log('\n💡 Benefits:')
  console.log('  • Perfect for subtitle generation')
  console.log('  • Ideal for video editing markers')
  console.log('  • Natural speech boundaries')
  console.log('  • Consistent segment lengths')
  console.log('  • Readable and listenable chunks')
  
  return 'Demonstration complete'
}

/**
 * Integration with Speaker-to-Camera Pipeline
 */
export function integrateWithPipeline() {
  console.log('🎬 Integration with Speaker-to-Camera Pipeline\n')
  
  console.log('📋 Enhanced Pipeline Flow:')
  console.log('1. 📊 Load media file')
  console.log('2. 🎤 WhisperX transcription (word-level timestamps)')
  console.log('3. 📊 Micro-segmentation (NEW)')
  console.log('4. 🤖 Professional video editor analysis')
  console.log('5. 📝 Generate EDL/SRT files')
  console.log('6. ✂️ FFmpeg processing')
  console.log('7. 💾 Save final video')
  
  console.log('\n🔧 Implementation in Pipeline:')
  console.log(`
// In updateSpeakerToCameraPipeline()
const whisperxTranscription = await transcribeWithWhisperX(videoUrl)
const microSegments = segmentTranscript(whisperxTranscription.words)

// Use micro-segments for:
// - Subtitle cue generation
// - Video editing markers  
// - Speech analysis boundaries
// - Natural pause detection
  `)
  
  console.log('📊 Advantages in Pipeline:')
  console.log('  • Better subtitle timing (natural breaks)')
  console.log('  • More precise editing decisions')
  console.log('  • Improved LLM analysis (logical chunks)')
  console.log('  • Enhanced user experience')
  
  return 'Integration overview complete'
}

// Export utilities
export const microSegmentationUtils = {
  transcribeAndSegment,
  transcribeWithDetailedSegmentation,
  demonstrateMicroSegmentation,
  integrateWithPipeline
}
