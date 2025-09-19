import { NextRequest, NextResponse } from 'next/server'
import { updateSpeakerToCameraPipeline } from '@/lib/align'
import { PipelineConfig, PipelineResult } from '@/lib/types'

export const runtime = 'nodejs' // Required for FFmpeg

// POST /api/jobs/speaker-camera-pipeline
// Body: { 
//   uploadId: string, 
//   script?: string, 
//   outputQuality?: 'low' | 'medium' | 'high',
//   generateFiles?: boolean,
//   instagramFormat?: 'portrait' | 'square'
// }
export async function POST(request: NextRequest) {
  try {
    // Check environment variables first
    const { logEnvironmentStatus } = await import('@/lib/env-check')
    const envStatus = logEnvironmentStatus()
    
    // Validate critical environment variables
    if (!envStatus.OPENAI_API_KEY.present || !envStatus.OPENAI_API_KEY.valid) {
      return NextResponse.json({
        success: false,
        error: 'OpenAI API key is not properly configured',
        details: envStatus.OPENAI_API_KEY.error,
        debug: process.env.NODE_ENV === 'development' ? envStatus : undefined
      }, { status: 503 })
    }
    
    const body = await request.json()
    const { 
      uploadId, 
      script, 
      outputQuality = 'medium',
      generateFiles = true,
      instagramFormat = 'portrait',
      skipSubtitles = false
    } = body || {}
    
    if (!uploadId) {
      return NextResponse.json(
        { success: false, error: 'uploadId is required' },
        { status: 400 }
      )
    }

    console.log('🎬 Starting enhanced speaker-to-camera pipeline for uploadId:', uploadId)
    console.log('📝 Script provided:', !!script)
    console.log('🎨 Output quality:', outputQuality)
    console.log('📄 Generate files:', generateFiles)
    console.log('📱 Instagram format:', instagramFormat)
    console.log('🚫 Skip subtitles:', skipSubtitles)
    console.log('🔧 Enhanced pipeline features: EDL generation, keyframe transforms, auto-fix passes')
    
    // Add timeout handling
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Pipeline timeout after 10 minutes')), 600000)
    })
    
    // Run the updated pipeline with timeout
    const result = await Promise.race([
      updateSpeakerToCameraPipeline({
        uploadId,
        script,
        outputQuality: outputQuality as 'low' | 'medium' | 'high',
        generateFiles: skipSubtitles ? false : generateFiles, // Force false if skipping subtitles
        instagramFormat: instagramFormat as 'portrait' | 'square',
        skipSubtitles
      }),
      timeoutPromise
    ]) as any
    
    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error
        },
        { status: 500 }
      )
    }
    
    console.log('✅ Pipeline completed successfully:', {
      videoPath: result.videoPath,
      srtPath: result.srtPath,
      edlPath: result.edlPath,
      instagramFormat: instagramFormat
    })
    
    // If a video file exists, upload it to storage, create DB record, and return JSON
    if (result.videoPath) {
      const fs = await import('fs')
      const path = await import('path')
      const { supabase, supabaseAdmin } = await import('@/lib/supabase')
      const db = supabaseAdmin || supabase

      const videoBuffer = await fs.promises.readFile(result.videoPath)
      const fileSize = videoBuffer.byteLength

      // Build storage filename
      const timestamp = Date.now()
      const filenameOnly = `speaker-camera/${uploadId}/${timestamp}-final.mp4`

      // Upload to storage bucket 'media-files'
      const sb: any = supabaseAdmin || supabase
      const { data: uploadData, error: uploadErr } = await sb.storage
        .from('media-files')
        .upload(filenameOnly, videoBuffer, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'video/mp4'
        })

      if (uploadErr) {
        console.error('❌ Storage upload failed:', uploadErr)
        return NextResponse.json({ success: false, error: 'Storage upload failed' }, { status: 500 })
      }

      // Public URL
      const { data: { publicUrl } } = sb.storage.from('media-files').getPublicUrl(filenameOnly)

      // Find the owner of the original media
      const { data: ownerRow } = await db
        .from('media_files')
        .select('user_id')
        .eq('id', uploadId)
        .single()
      const ownerId = (ownerRow as any)?.user_id || null

      // Create DB record in media_files
      const { data: mediaRec, error: dbErr } = await db
        .from('media_files')
        .insert({
          user_id: ownerId,
          filename: path.basename(filenameOnly),
          original_filename: `speaker_camera_${uploadId}.mp4`,
          file_path: filenameOnly,
          storage_url: publicUrl,
          file_size: fileSize,
          mime_type: 'video/mp4',
          file_type: 'video',
          width: null,
          height: null,
          duration: null,
          processing_status: 'completed',
          optimization_status: 'optimized',
          thumbnail_url: null,
          compressed_url: null,
          alt_text: 'Speaker-to-camera pipeline output',
          metadata: {
            source: 'speaker_camera_pipeline',
            instagram_format: instagramFormat,
            srtPath: result.srtPath || null,
            edlPath: result.edlPath || null
          }
        })
        .select()
        .single()

      if (dbErr) {
        console.error('❌ DB insert failed:', dbErr)
        return NextResponse.json({ success: false, error: 'Database insert failed' }, { status: 500 })
      }

      // Skip calling API thumbnail endpoint (requires auth); optional job can be triggered elsewhere

      return NextResponse.json({
        success: true,
        mediaId: mediaRec.id,
        storageUrl: publicUrl,
        message: 'Pipeline completed and saved to library'
      })
    }

    // No video generated
    return NextResponse.json({
      success: true,
      videoPath: result.videoPath,
      srtPath: result.srtPath,
      edlPath: result.edlPath,
      instagramFormat: instagramFormat,
      message: 'Analysis completed but no video was generated'
    })
    
  } catch (error: any) {
    console.error('❌ Speaker-to-camera pipeline API failed:', error)
    
    // More specific error handling
    let errorMessage = error?.message || 'Pipeline failed'
    let statusCode = 500
    const lowerMsg = errorMessage.toLowerCase()

    if (lowerMsg.includes('timeout')) {
      errorMessage = 'Pipeline processing timed out. Please try with a shorter video.'
      statusCode = 408
    } else if (
      // Treat OpenAI-related issues (including enhanced transcription wrapper) as service unavailable
      lowerMsg.includes('openai') ||
      lowerMsg.includes('invalid_api_key') ||
      lowerMsg.includes('missing openai_api_key') ||
      lowerMsg.includes('enhanced transcription failed') ||
      lowerMsg.includes('https://platform.openai.com/account/api-keys') ||
      /\b401\b/.test(lowerMsg)
    ) {
      errorMessage = 'AI transcription service is unavailable or not configured. Set a valid OpenAI API key and try again.'
      statusCode = 503
    } else if (lowerMsg.includes('ffmpeg')) {
      errorMessage = 'Video processing failed. Please check your video format.'
      statusCode = 422
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        suggestion: statusCode === 503 
          ? 'Add OPENAI_API_KEY to your environment. See: https://platform.openai.com/account/api-keys'
          : undefined,
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: statusCode }
    )
  }
}

// GET /api/jobs/speaker-camera-pipeline/{uploadId}/files
// Get EDL and SRT files separately
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    const uploadId = pathSegments[pathSegments.length - 2] // Get uploadId from path
    const fileType = url.searchParams.get('type') || 'edl' // 'edl' or 'srt'
    
    if (!uploadId) {
      return NextResponse.json(
        { success: false, error: 'uploadId is required' },
        { status: 400 }
      )
    }

    // Get the editing decision from the database
    const { supabase, supabaseAdmin } = await import('@/lib/supabase')
    const db = supabaseAdmin || supabase
    
    const { data: media, error: mediaError } = await db
      .from('media_files')
      .select('metadata')
      .eq('id', uploadId)
      .single()

    if (mediaError || !media) {
      return NextResponse.json(
        { success: false, error: 'Media not found or no editing decision available' },
        { status: 404 }
      )
    }

    const metadata = (media as any).metadata
    const edlContent = metadata?.edlContent
    const srtContent = metadata?.srtContent

    if (fileType === 'edl' && edlContent) {
      return new NextResponse(edlContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': `attachment; filename="edit_${uploadId}.edl"`
        }
      })
    } else if (fileType === 'srt' && srtContent) {
      return new NextResponse(srtContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="subtitles_${uploadId}.srt"`
        }
      })
    } else {
      return NextResponse.json(
        { success: false, error: `${fileType.toUpperCase()} file not available` },
        { status: 404 }
      )
    }
    
  } catch (error: any) {
    console.error('❌ File download failed:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'File download failed' },
      { status: 500 }
    )
  }
}
