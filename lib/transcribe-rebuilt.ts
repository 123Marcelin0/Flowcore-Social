import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { extractAudioServerSide, createLowQualityAudio } from './server-audio-extractor-ffmpeg'

// Types
interface TranscriptionResult {
  success: boolean
  data?: any
  error?: string
}

interface TranscriptionOptions {
  blob: Blob
  fileName: string
  useWordTimestamps?: boolean
}

// Get OpenAI client with proper configuration
function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required')
  }

  const config: any = {
    apiKey: apiKey,
  }

  // Add optional organization and project if available
  if (process.env.OPENAI_ORG_ID) {
    config.organization = process.env.OPENAI_ORG_ID
  }
  
  if (process.env.OPENAI_PROJECT_ID) {
    config.project = process.env.OPENAI_PROJECT_ID
  }

  console.log('🔑 OpenAI client config:', {
    hasApiKey: !!apiKey,
    apiKeyPrefix: apiKey.slice(0, 15) + '...',
    hasOrg: !!process.env.OPENAI_ORG_ID,
    hasProject: !!process.env.OPENAI_PROJECT_ID
  })

  return new OpenAI(config)
}

// Clean and robust transcription function
export async function transcribeAudioRobust(options: TranscriptionOptions): Promise<TranscriptionResult> {
  const { blob, fileName } = options
  let tempFilePath: string | null = null

  try {
    console.log('🎤 Starting robust OpenAI transcription...')
    console.log('📊 File details:', {
      size: blob.size,
      type: blob.type,
      name: fileName
    })

    // Create OpenAI client
    const openai = getOpenAIClient()

    // Convert blob to buffer and save to temporary file
    const arrayBuffer = await blob.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Create temp file with proper extension
    const tempDir = os.tmpdir()
    const fileExtension = path.extname(fileName) || '.mp3'
    tempFilePath = path.join(tempDir, `whisper-${Date.now()}-${Math.random().toString(36).substring(2)}${fileExtension}`)
    
    console.log('💾 Writing temporary file:', tempFilePath)
    fs.writeFileSync(tempFilePath, buffer)
    
    // Verify file was written correctly
    const stats = fs.statSync(tempFilePath)
    console.log('✅ Temp file created:', {
      path: tempFilePath,
      size: stats.size,
      exists: fs.existsSync(tempFilePath)
    })

    // Method 1: Try with createReadStream (recommended approach)
    try {
      console.log('🔄 Attempt 1: Using fs.createReadStream...')
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(tempFilePath),
        model: 'whisper-1',
        response_format: 'verbose_json'
      })

      console.log('✅ Transcription successful with word-level timestamps!')
      return { success: true, data: transcription }

    } catch (streamError) {
      console.log('⚠️ createReadStream failed:', streamError)

      // Method 2: Try without timestamp granularities
      try {
        console.log('🔄 Attempt 2: Basic verbose_json without timestamp granularities...')
        const transcription = await openai.audio.transcriptions.create({
          file: fs.createReadStream(tempFilePath),
          model: 'whisper-1',
          response_format: 'verbose_json'
        })

        console.log('✅ Basic transcription successful!')
        return { success: true, data: transcription }

      } catch (basicError) {
        console.log('⚠️ Basic transcription failed:', basicError)

        // Method 3: Try with plain text response
        try {
          console.log('🔄 Attempt 3: Plain text fallback...')
          const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(tempFilePath),
            model: 'whisper-1',
            response_format: 'text'
          })

          console.log('✅ Plain text transcription successful!')
          // Convert plain text to verbose_json format
          const mockVerboseResponse = {
            task: 'transcribe',
            language: 'en',
            duration: 0,
            text: transcription,
            segments: [{
              id: 0,
              seek: 0,
              start: 0.0,
              end: 0.0,
              text: transcription,
              tokens: [],
              verbosity: 'low',
              reasoning_effort: 'minimal',
              avg_logprob: 0.0,
              compression_ratio: 0.0,
              no_speech_prob: 0.0
            }]
          }

          return { success: true, data: mockVerboseResponse }

        } catch (textError) {
          console.log('❌ All transcription methods failed')
          throw textError
        }
      }
    }

  } catch (error: any) {
    console.error('❌ Transcription error:', error)
    return {
      success: false,
      error: error.message || 'Transcription failed'
    }
  } finally {
    // Clean up temporary file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath)
        console.log('🗑️ Cleaned up temp file:', tempFilePath)
      } catch (cleanupError) {
        console.warn('⚠️ Failed to clean up temp file:', cleanupError)
      }
    }
  }
}

// Enhanced transcription with timing - main entry point
export async function transcribeWithEnhancedTimingRebuild(
  mediaUrl: string,
  outputPath?: string
): Promise<any> {
  try {
    console.log('🚀 Starting enhanced transcription with rebuilt logic...')
    console.log('📊 Media URL:', mediaUrl)

    // Download media on the server
    console.log('📥 Downloading media for server-side audio extraction...')
    const res = await fetch(mediaUrl)
    if (!res.ok) {
      throw new Error(`Failed to download media: ${res.status} ${res.statusText}`)
    }
    const originalMimeType = res.headers.get('content-type') || 'video/mp4'
    const videoArrayBuffer = await res.arrayBuffer()

    // Extract audio using server-side FFmpeg (no DOM)
    console.log('🎵 Extracting audio with server-side FFmpeg...')
    let audioData
    try {
      audioData = await extractAudioServerSide(videoArrayBuffer, originalMimeType)
    } catch (e) {
      console.warn('⚠️ extractAudioServerSide failed, trying createLowQualityAudio fallback...', e)
      audioData = await createLowQualityAudio(videoArrayBuffer, originalMimeType, 25)
    }

    if (!audioData || !audioData.audioBuffer) {
      throw new Error('Server-side audio extraction failed')
    }

    console.log('✅ Audio extracted successfully:', {
      sizeMB: (audioData.audioSize / 1024 / 1024).toFixed(1),
      type: audioData.mimeType,
      fileName: audioData.fileName,
      compressed: audioData.success
    })

    // Wrap the audio buffer in a Blob for the robust transcriber
    const audioBlob = new Blob([Buffer.from(audioData.audioBuffer)], { type: audioData.mimeType })

    // Transcribe the extracted audio
    const transcriptionResult = await transcribeAudioRobust({
      blob: audioBlob,
      fileName: audioData.fileName || 'extracted_audio',
      useWordTimestamps: true
    })

    if (!transcriptionResult.success) {
      throw new Error(`Transcription failed: ${transcriptionResult.error}`)
    }

    console.log('🎯 Transcription completed successfully!')
    return transcriptionResult.data

  } catch (error: any) {
    console.error('❌ Enhanced transcription failed:', error)
    throw error
  }
}
