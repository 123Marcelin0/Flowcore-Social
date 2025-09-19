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
    
    // Centralized subtitle creation: prefer AI cards or AI segmentation
    let subtitles: any[] = []
    try {
      const { data: mediaMeta } = await db
        .from('media_files')
        .select('metadata')
        .eq('id', uploadId)
        .single()
      const metadata: any = (mediaMeta as any)?.metadata || {}
      const aiCards: any[] = Array.isArray(metadata?.ai_subtitles?.cards) ? metadata.ai_subtitles.cards : []
      if (aiCards.length) {
        subtitles = aiCards.map((c: any) => ({
          start_ms: Math.round(Number(c.renderStart ?? c.start ?? 0) * 1000),
          end_ms: Math.round(Number(c.renderEnd ?? c.end ?? 0) * 1000),
          text: String(c.text || '')
        }))
      } else {
        // Build words for AI segmentation
        const asr = metadata?.asr || {}
        let words: any[] = Array.isArray(asr?.words) ? asr.words.map((w: any) => ({
          word: String(w.word || w.text_for_display || ''),
          start: Number(w.start ?? w.startTime ?? 0),
          end: Number(w.end ?? w.endTime ?? 0),
          confidence: typeof w.confidence === 'number' ? w.confidence : 0.9
        })) : []
        if (!words.length && Array.isArray(asr?.segments)) {
          // Approximate words from segments
          const approx = (text: string, start: number, end: number) => {
            const tokens = String(text || '').split(/\s+/).filter(Boolean)
            if (!tokens.length) return [] as any[]
            const total = Math.max(0.001, (end || 0) - (start || 0))
            return tokens.map((t, i) => ({ word: t, start: start + (i / tokens.length) * total, end: start + ((i + 1) / tokens.length) * total }))
          }
          for (const seg of asr.segments) {
            words.push(...approx(seg.text || '', Number(seg.start || 0), Number(seg.end || 0)))
          }
        }
        if (words.length) {
          const res = await fetch(`${request.nextUrl.origin}/api/ai-caption-segmentation`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ words, audioUrl: videoUrl, settings: { minWordsPerCard: 2, maxWordsPerCard: 6, targetCpsRange: [12,17], lingerSec: 1.0 } })
          })
          if (res.ok) {
            const j = await res.json().catch(() => null)
            const cards = (j && (j.data?.cards || j.cards)) || []
            if (Array.isArray(cards) && cards.length) {
              subtitles = cards.map((c: any) => ({
                start_ms: Math.round(Number(c.renderStart ?? c.start ?? 0) * 1000),
                end_ms: Math.round(Number(c.renderEnd ?? c.end ?? 0) * 1000),
                text: String(c.text || '')
              }))
            }
          }
        }
        // Final fallback: map alignment segments minimally
        if (!subtitles.length) {
          subtitles = alignment.videoSegments.filter((s: any) => s.keep).map((s: any, idx: number) => ({
            start_ms: s.start_ms,
            end_ms: s.end_ms,
            text: `Segment ${idx + 1}`
          }))
        }
      }
    } catch {}
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
