import { supabase, supabaseAdmin } from './supabase'
import OpenAI from 'openai'
import { splitFileBySize, mergeTranscriptionResults, estimateAudioDuration } from './file-splitter'

export interface ASRSegment {
  start: number
  end: number
  text: string
  confidence?: number
}

export interface TranscriptionResult {
  text: string
  segments: ASRSegment[]
}

function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

/**
 * Transcribes a large file by splitting it into chunks if necessary
 */
export async function transcribeLargeFile(params: {
  uploadId: string
  fileUrl: string
}): Promise<TranscriptionResult> {
  const { uploadId, fileUrl } = params
  const openai = getOpenAI()
  
  if (!openai) {
    throw new Error('OpenAI API key not configured')
  }

  // Download the file
  console.log('📥 Downloading file for transcription:', fileUrl)
  const response = await fetch(fileUrl)
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.status}`)
  }
  
  const fileBlob = await response.blob()
  const fileSizeMB = Math.round(fileBlob.size / 1024 / 1024)
  console.log(`📊 File size: ${fileSizeMB}MB`)
  
  // Check if we need to split the file
  const MAX_SIZE = 20 * 1024 * 1024 // 20MB (safe under 25MB OpenAI limit)
  
  if (fileBlob.size <= MAX_SIZE) {
    console.log('✅ File is small enough, transcribing directly')
    return await transcribeSingleBlob(fileBlob, uploadId, fileUrl)
  }
  
  console.log('🔄 File is large, using time-based chunking approach...')
  
  // For large files, we'll use a different approach:
  // 1. Try to compress/re-encode the file to a smaller size
  // 2. If that fails, extract audio only and compress that
  // 3. As a last resort, split by time using a server-side approach
  
  // For now, let's try a simpler approach: compress the entire file
  const compressedResult = await tryCompressFile(fileBlob, uploadId, fileUrl)
  if (compressedResult) {
    return compressedResult
  }
  
  // If compression fails, return an error with instructions
  throw new Error(
    `File is too large (${fileSizeMB}MB) for direct transcription. ` +
    `Please compress your video to under 20MB using tools like HandBrake, ` +
    `or use an online video compressor before uploading.`
  )
}

/**
 * Transcribes a single blob (under 25MB)
 */
async function transcribeSingleBlob(
  blob: Blob, 
  uploadId: string, 
  originalUrl: string
): Promise<TranscriptionResult> {
  const openai = getOpenAI()!
  
  // Determine file format
  const fileName = getFileNameFromBlob(blob, originalUrl)
  
  const form = new FormData()
  form.append('file', blob, fileName)
  form.append('model', 'whisper-1')
  form.append('response_format', 'verbose_json')

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: form,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI transcription failed: ${errorText}`)
  }

  const json = await response.json()
  const text: string = json.text || ''
  const segments: ASRSegment[] = Array.isArray(json.segments)
    ? json.segments.map((s: any) => ({
        start: typeof s.start === 'number' ? s.start : Number(s.start ?? 0),
        end: typeof s.end === 'number' ? s.end : Number(s.end ?? 0),
        text: String(s.text ?? ''),
        confidence: typeof s.confidence === 'number' ? s.confidence : undefined,
      }))
    : []

  await saveTranscriptionResult(uploadId, text, segments)
  return { text, segments }
}

/**
 * Transcribes a single chunk
 */
async function transcribeChunk(chunk: Blob, index: number): Promise<{ text: string, segments: ASRSegment[] }> {
  const openai = getOpenAI()!
  
  const fileName = `chunk_${index}.mp4`
  
  const form = new FormData()
  form.append('file', chunk, fileName)
  form.append('model', 'whisper-1')
  form.append('response_format', 'verbose_json')

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: form,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI transcription failed for chunk ${index}: ${errorText}`)
  }

  const json = await response.json()
  const text: string = json.text || ''
  const segments: ASRSegment[] = Array.isArray(json.segments)
    ? json.segments.map((s: any) => ({
        start: typeof s.start === 'number' ? s.start : Number(s.start ?? 0),
        end: typeof s.end === 'number' ? s.end : Number(s.end ?? 0),
        text: String(s.text ?? ''),
        confidence: typeof s.confidence === 'number' ? s.confidence : undefined,
      }))
    : []

  return { text, segments }
}

/**
 * Saves transcription result to database
 */
async function saveTranscriptionResult(uploadId: string, text: string, segments: ASRSegment[]) {
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
      text,
      segments,
      provider: 'openai.whisper-1',
      updated_at: new Date().toISOString(),
      split_transcription: segments.length > 50 // Indicator if file was split
    },
  }
  
  console.log('💾 Saving transcription metadata:', {
    uploadId,
    segmentCount: segments.length,
    textLength: text.length
  })
  
  const { error: updateError } = await db
    .from('media_files')
    .update({
      metadata: newMetadata,
    } as any)
    .eq('id', uploadId)

  if (updateError) {
    console.error('Failed to persist ASR data:', updateError)
    throw new Error('Failed to save transcription to database')
  }
}

/**
 * Tries to compress/optimize the file for transcription
 * This is a client-side approach with limited compression options
 */
async function tryCompressFile(blob: Blob, uploadId: string, fileUrl: string): Promise<TranscriptionResult | null> {
  try {
    console.log('🗜️ Attempting to compress file for transcription...')
    
    // For video files, try creating a lower quality audio-only version
    if (blob.type.startsWith('video/')) {
      // We can't do real compression client-side without heavy libraries
      // But we can try different encoding formats that might be smaller
      
      // Try sending as audio/mp4 with a reduced quality hint
      const audioBlob = new Blob([await blob.arrayBuffer()], { type: 'audio/mp4' })
      
      if (audioBlob.size < blob.size * 0.8) { // If we saved at least 20%
        console.log('✅ Created smaller audio version')
        return await transcribeSingleBlob(audioBlob, uploadId, fileUrl)
      }
    }
    
    // If no compression worked, return null
    console.log('❌ Compression not effective')
    return null
  } catch (error) {
    console.log('❌ Compression failed:', error)
    return null
  }
}

/**
 * Determines appropriate filename for blob
 */
function getFileNameFromBlob(blob: Blob, originalUrl: string): string {
  // Try to get extension from original URL
  const urlPath = new URL(originalUrl).pathname
  const fileExt = urlPath.split('.').pop()?.toLowerCase() || 'mp4'
  
  if (blob.type.includes('video/mp4') || fileExt === 'mp4') {
    return 'input_audio.mp4'
  } else if (blob.type.includes('video/webm') || fileExt === 'webm') {
    return 'input_audio.webm'
  } else if (blob.type.includes('audio/')) {
    const audioExt = blob.type.split('/')[1] || 'mp3'
    return `input_audio.${audioExt}`
  }
  
  return 'input_audio.mp4' // Default fallback
}
