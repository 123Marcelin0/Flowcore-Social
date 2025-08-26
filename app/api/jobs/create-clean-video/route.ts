import { NextRequest, NextResponse } from 'next/server'
import { alignScriptToAsr } from '@/lib/align'
import { createCleanVideo } from '@/lib/video-editor'
import { supabase, supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs' // Required for FFmpeg

// POST /api/jobs/create-clean-video
// Body: { uploadId: string, scriptText: string, outputQuality?: 'low' | 'medium' | 'high' }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { uploadId, scriptText, outputQuality = 'medium' } = body || {}
    
    if (!uploadId || !scriptText) {
      return NextResponse.json(
        { success: false, error: 'uploadId and scriptText are required' },
        { status: 400 }
      )
    }

    console.log('🎬 Starting clean video creation for uploadId:', uploadId)
    console.log('📝 Script length:', scriptText.length, 'characters')
    console.log('🎨 Output quality:', outputQuality)
    
    // Step 1: Perform alignment with video segmentation enabled
    console.log('1️⃣ Aligning script to video...')
    const alignment = await alignScriptToAsr({ 
      uploadId, 
      scriptText, 
      createVideoSegments: true 
    })
    
    if (!alignment.videoSegments || alignment.videoSegments.length === 0) {
      throw new Error('No video segments found. Make sure the video is transcribed first.')
    }
    
    console.log('✅ Alignment completed:', {
      mappingCount: alignment.mapping.length,
      videoSegmentsCount: alignment.videoSegments.length,
      segmentsToKeep: alignment.videoSegments.filter(seg => seg.keep).length,
      estimatedReduction: alignment.editingStats?.reductionPercentage?.toFixed(1) + '%'
    })
    
    // Step 2: Get the original video file
    console.log('2️⃣ Fetching original video...')
    const db = supabaseAdmin || supabase
    const { data: media, error: mediaError } = await db
      .from('media_files')
      .select('storage_url, file_type, filename')
      .eq('id', uploadId)
      .single()
    
    if (mediaError || !media) {
      throw new Error(`Media file not found: ${mediaError?.message || 'unknown error'}`)
    }
    
    const videoUrl = (media as any).storage_url
    if (!videoUrl) {
      throw new Error('Video URL not found in media file')
    }
    
    console.log('📹 Downloading video from:', videoUrl)
    
    // Download the video
    const videoResponse = await fetch(videoUrl)
    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.status} ${videoResponse.statusText}`)
    }
    
    const videoBuffer = await videoResponse.arrayBuffer()
    const videoMimeType = videoResponse.headers.get('content-type') || 'video/mp4'
    
    console.log(`📊 Video downloaded: ${(videoBuffer.byteLength / 1024 / 1024).toFixed(1)}MB, type: ${videoMimeType}`)
    
    // Step 3: Create the clean video with subtitles
    console.log('3️⃣ Creating clean video with subtitles...')
    
    // Import the subtitle generation function
    const { generateSubtitlesFromScript } = await import('@/lib/video-editor')
    
    // Generate subtitles based on script and video segments  
    const subtitles = generateSubtitlesFromScript(alignment.videoSegments, scriptText)
    console.log(`📝 Generated ${subtitles.length} subtitle segments`)
    
    const editingResult = await createCleanVideo(
      videoBuffer,
      videoMimeType,
      alignment.videoSegments,
      {
        outputQuality: outputQuality as 'low' | 'medium' | 'high',
        outputFormat: 'mp4',
        fadeInOut: false, // Disable for now to avoid codec copy conflicts
        transitionDuration: 200,
        addSubtitles: true,
        subtitles: subtitles,
        subtitleStyle: {
          fontFamily: 'Arial Bold',
          fontSize: 28,
          fontColor: 'white',
          backgroundColor: 'black@0.8',
          position: 'bottom'
        }
      }
    )
    
    if (!editingResult.success || !editingResult.outputBuffer) {
      throw new Error(editingResult.error || 'Video editing failed')
    }
    
    console.log('✅ Clean video created:', {
      originalDuration: `${editingResult.editingStats.originalDuration.toFixed(1)}s`,
      finalDuration: `${editingResult.editingStats.finalDuration.toFixed(1)}s`,
      reduction: `${editingResult.editingStats.reductionPercentage.toFixed(1)}%`,
      segmentsKept: editingResult.editingStats.segmentsKept,
      segmentsRemoved: editingResult.editingStats.segmentsRemoved,
      outputSize: `${(editingResult.outputBuffer.byteLength / 1024 / 1024).toFixed(1)}MB`
    })
    
    // Step 4: Return the clean video for download
    return new NextResponse(Buffer.from(editingResult.outputBuffer), {
      status: 200,
      headers: {
        'Content-Type': editingResult.outputMimeType || 'video/mp4',
        'Content-Disposition': `attachment; filename="${editingResult.outputFileName || 'clean_video.mp4'}"`,
        'Content-Length': editingResult.outputBuffer.byteLength.toString(),
        'X-Video-Stats': JSON.stringify(editingResult.editingStats),
        'X-Alignment-Stats': JSON.stringify({
          mappingCount: alignment.mapping.length,
          selectedShotsCount: alignment.selectedShots.length,
          reductionPercentage: alignment.editingStats?.reductionPercentage?.toFixed(1) + '%'
        })
      },
    })
    
  } catch (error: any) {
    console.error('❌ Clean video creation failed:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error?.message || 'Clean video creation failed',
        details: error?.stack
      },
      { status: 500 }
    )
  }
}
