import { supabase, supabaseAdmin } from './supabase'
import OpenAI from 'openai'
// Use FFmpeg-backed extractor on server with fallback
import { extractAudioServerSide, createLowQualityAudio, createSimpleAudioFallback } from './server-audio-extractor-ffmpeg'
import { Word, Segment, Transcript } from './types'

// Wire FFmpeg binary path for video cutting operations
let ffmpegPath: string | null = null

async function getFFmpegPath(): Promise<string> {
  if (ffmpegPath) return ffmpegPath
  
  try {
    // Import @ffmpeg-installer/ffmpeg dynamically to get the binary path
    const ffmpegInstaller = await import('@ffmpeg-installer/ffmpeg')
    ffmpegPath = ffmpegInstaller.path
    console.log('🎬 FFmpeg binary located at:', ffmpegPath)
    return ffmpegPath
  } catch (error) {
    console.warn('⚠️ @ffmpeg-installer/ffmpeg not found, falling back to system FFmpeg')
    ffmpegPath = 'ffmpeg' // Assume system FFmpeg is available
    return ffmpegPath
  }
}

// Enhanced transcription response interface to handle both word and segment level data
interface OpenAITranscriptionResponse {
  text: string
  language?: string
  duration?: number
  segments?: Array<{
    id: number
    seek: number
    start: number
    end: number
    text: string
    tokens: number[]
    temperature: number
    avg_logprob: number
    compression_ratio: number
    no_speech_prob: number
    words?: Array<{
      word: string
      start: number
      end: number
    }>
  }>
  words?: Array<{
    word: string
    start: number
    end: number
  }>
}

export interface ASRWord extends Word {}

export interface ASRSegment extends Segment {}

export interface TranscriptionResult extends Transcript {}

function getOpenAI(): OpenAI | null {
  // Clean the API key of any potential whitespace or quotes
  let apiKey = process.env.OPENAI_API_KEY
  if (apiKey) {
    apiKey = apiKey.trim().replace(/^["']|["']$/g, '') // Remove surrounding quotes and whitespace
  }
  
  console.log('🔑 Checking OpenAI API key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT FOUND')
  console.log('🔍 Key length:', apiKey?.length || 0)
  console.log('🔍 Key starts with sk-:', apiKey?.startsWith('sk-') || false)
  
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY environment variable is not set')
    return null
  }
  
  if (!apiKey.startsWith('sk-')) {
    console.error('❌ OPENAI_API_KEY does not appear to be valid (should start with sk-)')
    console.error('Key details:', { 
      length: apiKey.length, 
      prefix: apiKey.substring(0, 15),
      hasQuotes: process.env.OPENAI_API_KEY?.includes('"') || process.env.OPENAI_API_KEY?.includes("'"),
      rawLength: process.env.OPENAI_API_KEY?.length || 0
    })
    return null
  }
  
  console.log('✅ OpenAI API key found and appears valid')
  try {
    // Create OpenAI client with explicit configuration
    const client = new OpenAI({ 
      apiKey,
      dangerouslyAllowBrowser: false // Ensure we're not in browser mode
    })
    console.log('✅ OpenAI client created successfully')
    return client
  } catch (error) {
    console.error('❌ Failed to initialize OpenAI client:', error)
    return null
  }
}

/**
 * Enhanced OpenAI transcription call with word-level timing and graceful fallback
 */
async function callOpenAITranscription(
  openai: OpenAI, 
  blob: Blob, 
  fileName: string
): Promise<{ success: boolean; data?: OpenAITranscriptionResponse; error?: string }> {
  try {
    console.log(`🎤 Calling OpenAI transcriptions.create with enhanced timing for: ${fileName}`)
    console.log(`📊 File details: size=${blob.size}, type=${blob.type}`)
    console.log(`🔑 OpenAI client config:`, { 
      hasApiKey: !!openai.apiKey,
      apiKeyPrefix: openai.apiKey ? openai.apiKey.substring(0, 10) + '...' : 'none'
    })
    
    // Primary attempt: Request both word and segment level timestamps
    try {
      const primaryResult = await openai.audio.transcriptions.create({
        file: new File([blob], fileName, { type: 'audio/mpeg' }),
        model: 'whisper-1',
        response_format: 'verbose_json'
      })
      
      console.log(`✅ Primary transcription successful with word-level timing`)
      return { success: true, data: primaryResult as OpenAITranscriptionResponse }
      
    } catch (primaryError) {
      console.log(`⚠️ Primary transcription with word+segment timing failed:`, primaryError)
      
      // Fallback 1: Try with just segment-level timestamps
      try {
        console.log(`🔄 Fallback 1: Trying segment-level timing only...`)
        const segmentResult = await openai.audio.transcriptions.create({
          file: new File([blob], fileName, { type: 'audio/mpeg' }),
          model: 'whisper-1',
          response_format: 'verbose_json'
        })
        
        console.log(`✅ Fallback 1 successful with segment-level timing`)
        return { success: true, data: segmentResult as OpenAITranscriptionResponse }
        
      } catch (segmentError) {
        console.log(`⚠️ Fallback 1 (segment-only) failed:`, segmentError)
        
        // Fallback 2: Basic verbose_json without granularities
        try {
          console.log(`🔄 Fallback 2: Trying basic verbose_json...`)
          const basicResult = await openai.audio.transcriptions.create({
            file: new File([blob], fileName, { type: 'audio/mpeg' }),
            model: 'whisper-1',
            response_format: 'verbose_json'
          })
          
          console.log(`✅ Fallback 2 successful with basic timing`)
          return { success: true, data: basicResult as OpenAITranscriptionResponse }
          
        } catch (basicError) {
          console.log(`⚠️ Fallback 2 (basic) failed:`, basicError)
          
          // Fallback 3: Plain text response (last resort)
          try {
            console.log(`🔄 Fallback 3: Trying plain text response...`)
            const textResult = await openai.audio.transcriptions.create({
              file: new File([blob], fileName, { type: 'audio/mpeg' }),
              model: 'whisper-1',
              response_format: 'text'
            })
            
            console.log(`✅ Fallback 3 successful with text-only response`)
            
            // Create minimal response structure for text-only result
            return { 
              success: true, 
              data: {
                text: typeof textResult === 'string' ? textResult : (textResult as any).text || '',
                segments: [] // No timing information available
              }
            }
            
          } catch (textError) {
            console.error(`❌ All transcription methods failed:`, textError)
            return { 
              success: false, 
              error: `All transcription methods failed. Last error: ${textError}` 
            }
          }
        }
      }
    }
    
  } catch (error) {
    console.error(`❌ Transcription call failed:`, error)
    return { 
      success: false, 
      error: `Transcription failed: ${error}` 
    }
  }
}

/**
 * Process OpenAI transcription response and create standardized segments with word timing
 */
function processTranscriptionResponse(response: OpenAITranscriptionResponse): TranscriptionResult {
  const text = response.text || ''
  const segments: ASRSegment[] = []
  
  console.log(`📊 Processing transcription response:`, {
    hasText: !!text,
    hasSegments: !!(response.segments && response.segments.length > 0),
    hasGlobalWords: !!(response.words && response.words.length > 0),
    segmentCount: response.segments?.length || 0,
    globalWordCount: response.words?.length || 0
  })
  
  if (response.segments && response.segments.length > 0) {
    // Process segment-based response
    response.segments.forEach((segment, index) => {
      const words: Word[] = []
      
      // Check if this segment has word-level timing
      if (segment.words && segment.words.length > 0) {
        segment.words.forEach(word => {
          words.push({
            word: word.word,
            start: word.start,
            end: word.end
          })
        })
      } else if (response.words && response.words.length > 0) {
        // Fallback: Try to match global words to this segment by timing
        const segmentWords = response.words.filter(word => 
          word.start >= segment.start && word.end <= segment.end
        )
        segmentWords.forEach(word => {
          words.push({
            word: word.word,
            start: word.start,
            end: word.end
          })
        })
      }
      
      segments.push({
        start: segment.start,
        end: segment.end,
        text: segment.text,
        confidence: calculateSegmentConfidence(segment),
        words: words.length > 0 ? words : undefined
      })
    })
  } else if (response.words && response.words.length > 0) {
    // Fallback: Create segments from word-level data
    console.log(`🔄 Creating segments from word-level data...`)
    segments.push(...createSegmentsFromWords(response.words, text))
  } else {
    // Last resort: Create single segment with no timing details
    console.log(`⚠️ No timing information available, creating single segment`)
    segments.push({
      start: 0,
      end: 0, // Duration unknown
      text: text,
      confidence: 0.5, // Low confidence due to lack of timing data
      words: undefined
    })
  }
  
  const result: TranscriptionResult = {
    text,
    segments,
    language: response.language,
    duration: response.duration
  }
  
  console.log(`✅ Transcription processing complete:`, {
    totalSegments: segments.length,
    wordsDetected: segments.reduce((sum, s) => sum + (s.words?.length || 0), 0),
    hasWordTiming: segments.some(s => s.words && s.words.length > 0),
    avgConfidence: segments.reduce((sum, s) => sum + (s.confidence || 0), 0) / segments.length
  })
  
  return result
}

/**
 * Calculate confidence score from OpenAI segment data
 */
function calculateSegmentConfidence(segment: any): number {
  // Use available confidence indicators from OpenAI response
  if (typeof segment.avg_logprob === 'number') {
    // Convert log probability to confidence (OpenAI uses negative log probs)
    const confidence = Math.exp(segment.avg_logprob)
    return Math.max(0, Math.min(1, confidence))
  }
  
  if (typeof segment.no_speech_prob === 'number') {
    // Invert no-speech probability to get speech confidence
    return Math.max(0, Math.min(1, 1 - segment.no_speech_prob))
  }
  
  // Default confidence if no indicators available
  return 0.8
}

/**
 * Create segments from word-level timing when segment data is not available
 */
function createSegmentsFromWords(words: Array<{ word: string; start: number; end: number }>, fullText: string): ASRSegment[] {
  if (words.length === 0) return []
  
  const segments: ASRSegment[] = []
  const sentences = fullText.split(/[.!?]+/).filter(text => text.trim().length > 0)
  
  if (sentences.length === 0) {
    // Single segment with all words
    return [{
      start: words[0].start,
      end: words[words.length - 1].end,
      text: fullText,
      confidence: 0.8,
      words: words.map(w => ({ word: w.word, start: w.start, end: w.end }))
    }]
  }
  
  // Try to group words into sentence-based segments
  let wordIndex = 0
  
  sentences.forEach(sentence => {
    const sentenceWords = sentence.trim().split(/\s+/).length
    const segmentWords = words.slice(wordIndex, wordIndex + sentenceWords)
    
    if (segmentWords.length > 0) {
      segments.push({
        start: segmentWords[0].start,
        end: segmentWords[segmentWords.length - 1].end,
        text: sentence.trim(),
        confidence: 0.8,
        words: segmentWords.map(w => ({ word: w.word, start: w.start, end: w.end }))
      })
      
      wordIndex += sentenceWords
    }
  })
  
  // Handle any remaining words
  if (wordIndex < words.length) {
    const remainingWords = words.slice(wordIndex)
    segments.push({
      start: remainingWords[0].start,
      end: remainingWords[remainingWords.length - 1].end,
      text: remainingWords.map(w => w.word).join(' '),
      confidence: 0.8,
      words: remainingWords.map(w => ({ word: w.word, start: w.start, end: w.end }))
    })
  }
  
  return segments
}

/**
 * Save transcription result to database
 */
async function saveTranscriptionResult(uploadId: string, result: TranscriptionResult): Promise<void> {
  const db = supabaseAdmin || supabase
  
  // Get current metadata
  const { data: currentMedia } = await db
    .from('media_files')
    .select('metadata')
    .eq('id', uploadId)
    .single()
  
  const existingMetadata = (currentMedia as any)?.metadata || {}
  
  const newMetadata = {
    ...existingMetadata,
    processing_status: 'completed',
    asr: {
      text: result.text,
      segments: result.segments,
      language: result.language,
      duration: result.duration,
      provider: 'openai.whisper-1',
      enhanced_timing: result.segments.some(s => s.words && s.words.length > 0),
      word_count: result.segments.reduce((sum, s) => sum + (s.words?.length || 0), 0),
      updated_at: new Date().toISOString(),
    },
    ffmpeg_path: ffmpegPath, // Store FFmpeg path for later video cutting
  }
  
  console.log('💾 Saving enhanced transcription metadata:', {
    uploadId,
    segmentCount: result.segments.length,
    wordCount: newMetadata.asr.word_count,
    hasWordTiming: newMetadata.asr.enhanced_timing,
    language: result.language,
    duration: result.duration
  })
  
  const { error: updateError } = await db
    .from('media_files')
    .update({
      metadata: newMetadata,
    } as any)
    .eq('id', uploadId)

  if (updateError) {
    console.error('Failed to persist enhanced ASR data:', updateError)
    throw new Error('Failed to save transcription to database')
  }
}



export async function transcribeFromUrl(params: {
  uploadId: string
  fileUrl: string
}): Promise<TranscriptionResult> {
  const { uploadId, fileUrl } = params
  const openai = getOpenAI()
  if (!openai) {
    // Graceful fallback: mark error on media_files.metadata
    const db = supabaseAdmin || supabase
    
    // Get current metadata to preserve it
    const { data: currentMedia } = await db
      .from('media_files')
      .select('metadata')
      .eq('id', uploadId)
      .single()
    
    const existingMetadata = (currentMedia as any)?.metadata || {}
    
    const apiKey = process.env.OPENAI_API_KEY
    const errorDetails = !apiKey 
      ? 'OpenAI API key not found in environment variables'
      : !apiKey.startsWith('sk-')
      ? 'OpenAI API key format is invalid (should start with sk-)'
      : 'OpenAI client initialization failed'
    
    await db
      .from('media_files')
      .update({
        metadata: {
          ...existingMetadata,
          processing_status: 'failed',
          processing_errors: [errorDetails],
          debug_info: {
            hasApiKey: !!apiKey,
            keyLength: apiKey?.length || 0,
            keyPrefix: apiKey?.substring(0, 10) || 'none',
            nodeEnv: process.env.NODE_ENV
          }
        },
      } as any)
      .eq('id', uploadId)
    throw new Error(`OpenAI API configuration error: ${errorDetails}`)
  }

  // Fetch the media into memory as a Blob/Buffer for upload to OpenAI
  const resp = await fetch(fileUrl)
  if (!resp.ok) throw new Error(`Failed to fetch media from URL: ${resp.status}`)
  
  // Check file size and content type
  const contentLength = resp.headers.get('content-length')
  const contentType = resp.headers.get('content-type') || ''
  let sizeMB = contentLength ? parseInt(contentLength) / (1024 * 1024) : 0
  
  console.log(`📊 Downloading file: ${sizeMB.toFixed(1)}MB, type: ${contentType}`)
  
  const arrayBuffer = await resp.arrayBuffer()
  
  // Create initial blob
  let fileBlob = new Blob([arrayBuffer], { type: contentType })
  
  // Handle MP4 files and large files with server-side audio extraction/compression
  let processedBuffer = arrayBuffer
  let processedMimeType = contentType
  let processedFileName = 'input'
  
  // Check if file is MP4 or large file that needs processing
  const isMP4 = contentType.toLowerCase().includes('mp4') || contentType.toLowerCase().includes('video/')
  const needsProcessing = sizeMB > 25 || isMP4
  
  if (needsProcessing) {
    if (isMP4 && sizeMB <= 25) {
      console.log(`🎥 MP4 file detected (${sizeMB.toFixed(1)}MB), converting to MP3 for better Whisper compatibility...`)
    } else {
      console.log(`🎬 Large file detected (${sizeMB.toFixed(1)}MB), attempting server-side processing...`)
    }
    
    try {
      // Try FFmpeg-based conversion/compression
      const targetSize = sizeMB > 25 ? 25 : Math.min(sizeMB * 0.8, 20) // For MP4s under 25MB, target 80% of original or 20MB max
      console.log(`🗜️ Processing with FFmpeg (target: ${targetSize.toFixed(1)}MB)...`)
      
      try {
        const audioResult = await createLowQualityAudio(arrayBuffer, contentType, targetSize)
        
        const finalSizeMB = audioResult.audioSize / (1024 * 1024)
        console.log(`✅ FFmpeg conversion successful: ${sizeMB.toFixed(1)}MB → ${finalSizeMB.toFixed(1)}MB (${audioResult.mimeType})`)
        
        processedBuffer = audioResult.audioBuffer
        processedMimeType = audioResult.mimeType
        processedFileName = audioResult.fileName.replace(/\.[a-z0-9]+$/i, '')
        
        // Update file blob with processed data
        fileBlob = new Blob([processedBuffer], { type: processedMimeType })
        
        // Update size for logging
        sizeMB = finalSizeMB
        
      } catch (ffmpegError) {
        console.warn('⚠️ FFmpeg failed, using simple fallback:', ffmpegError)
        
        // Only use fallback for files that are actually too large
        if (sizeMB > 25) {
          const fallbackResult = await createSimpleAudioFallback(arrayBuffer, contentType, 25)
          
          const finalSizeMB = fallbackResult.audioBuffer.byteLength / (1024 * 1024)
          console.log(`✅ Fallback successful: ${sizeMB.toFixed(1)}MB → ${finalSizeMB.toFixed(1)}MB`)
          
          processedBuffer = fallbackResult.audioBuffer
          processedMimeType = fallbackResult.mimeType
          processedFileName = fallbackResult.fileName.replace(/\.[a-z0-9]+$/i, '')
          
          // Update file blob with processed data
          fileBlob = new Blob([processedBuffer], { type: processedMimeType })
          
          // Update size for logging
          sizeMB = finalSizeMB
        } else {
          // For small MP4s where FFmpeg failed, just proceed with original file
          console.log('📄 Small MP4 - proceeding with original file since FFmpeg failed')
        }
      }
      
    } catch (processingError) {
      console.error('❌ All processing methods failed:', processingError)
      if (sizeMB > 25) {
        throw new Error(
          `File too large for transcription (${sizeMB.toFixed(1)}MB) and automatic processing failed. ` +
          `Please compress your video to under 25MB using:\n` +
          `• HandBrake (free): handbrake.fr\n` +
          `• Online compressor: cloudconvert.com\n` +
          `• Target: 720p, lower bitrate, under 25MB`
        )
      } else {
        console.log('📄 Small file - proceeding with original despite processing failure')
      }
    }
  } else {
    console.log(`📄 Audio file detected (${sizeMB.toFixed(1)}MB, ${contentType}) - no conversion needed`)
  }
  
  // Determine the best format for the processed file (ensure decodable types to Whisper)
  let finalBlob: Blob
  let fileName: string
  
  finalBlob = fileBlob
  
  // Prefer stable audio types for Whisper
  if (processedMimeType.includes('wav')) {
    fileName = `${processedFileName}.wav`
  } else if (processedMimeType.includes('mpeg')) {
    fileName = `${processedFileName}.mp3`
  } else if (processedMimeType.includes('mp4')) {
    // This is m4a when mime is audio/mp4
    fileName = `${processedFileName}.m4a`
  } else if (processedMimeType.includes('webm')) {
    fileName = `${processedFileName}.webm`
  } else {
    // Fallback to wav for max compatibility
    fileName = `${processedFileName}.wav`
    finalBlob = new Blob([processedBuffer], { type: 'audio/wav' })
  }

  console.log(`🎵 Sending processed file as ${fileName} to OpenAI Whisper`)

  // Try multiple formats if the first one fails
  const blobBuffer = await finalBlob.arrayBuffer()
  const formatAttempts = [
    { blob: finalBlob, name: fileName },
    { blob: new Blob([blobBuffer], { type: 'audio/wav' }), name: 'input_audio.wav' },
    { blob: new Blob([blobBuffer], { type: 'audio/mp4' }), name: 'input_audio.m4a' },
    { blob: new Blob([blobBuffer], { type: 'audio/mpeg' }), name: 'input_audio.mp3' }
  ]

  let lastError = ''

  // Initialize FFmpeg path for later use
  await getFFmpegPath()

  for (const attempt of formatAttempts) {
    try {
      console.log(`🔄 Trying format: ${attempt.name}`)
      
      // Enhanced OpenAI transcription call with word-level timing
      const transcriptionResult = await callOpenAITranscription(openai, attempt.blob, attempt.name)
      
      if (transcriptionResult.success && transcriptionResult.data) {
        console.log(`✅ Success with format: ${attempt.name}`)
        const processedResult = processTranscriptionResponse(transcriptionResult.data)
        
        // Save and return the processed result
        await saveTranscriptionResult(uploadId, processedResult)
        return processedResult
        
      } else {
        lastError = transcriptionResult.error || 'Unknown transcription error'
        console.log(`❌ Failed with ${attempt.name}:`, lastError)
      }
    } catch (err) {
      console.log(`❌ Exception with ${attempt.name}:`, err)
      lastError = String(err)
    }
  }

  // All format attempts failed
  const db = supabaseAdmin || supabase
  
  // Get current metadata to preserve it
  const { data: currentMedia } = await db
    .from('media_files')
    .select('metadata')
    .eq('id', uploadId)
    .single()
  
  const existingMetadata = (currentMedia as any)?.metadata || {}
  
  await db
    .from('media_files')
    .update({
      metadata: {
        ...existingMetadata,
        processing_status: 'failed',
        processing_errors: [`Enhanced transcription failed with all formats. Last error: ${lastError}`],
      },
    } as any)
    .eq('id', uploadId)
  throw new Error(`Enhanced transcription failed with all formats. Last error: ${lastError}`)
}

/**
 * Export FFmpeg path getter for use in other modules
 */
export { getFFmpegPath }

/**
 * Get transcription with enhanced word-level timing information
 * This is the main function to use for new implementations
 */
export async function transcribeWithEnhancedTiming(params: {
  uploadId: string
  fileUrl: string
}): Promise<TranscriptionResult> {
  console.log('🚀 Starting enhanced transcription with word-level timing...')
  return await transcribeFromUrl(params)
}


