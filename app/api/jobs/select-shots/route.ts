import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'

interface ShotCandidate {
  start_ms: number
  end_ms: number
  transcript: string
  match_score: number
}

// POST /api/jobs/select-shots
// Body: { uploadId: string, targetSeconds?: number, alpha?: number, beta?: number }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      uploadId,
      targetSeconds = 35,
      alpha = 0.6,
      beta = 0.25,
      gamma = 0.1,
      delta = 0.05,
    } = body || {}

    if (!uploadId) {
      return NextResponse.json(
        { success: false, error: 'uploadId is required' },
        { status: 400 }
      )
    }

    const db = supabaseAdmin || supabase
    const { data: media, error } = await db
      .from('media_files')
      .select('id, metadata')
      .eq('id', uploadId)
      .single()

    if (error || !media) {
      return NextResponse.json(
        { success: false, error: 'Upload not found' },
        { status: 404 }
      )
    }

    const alignment = (media as any).metadata?.alignment
    const asr = (media as any).metadata?.asr
    const shots: ShotCandidate[] = alignment?.selectedShots || []
    
    console.log('🎬 Shot selection debug:', {
      uploadId,
      alignedShotsCount: shots.length,
      hasAsr: !!asr,
      asrSegmentCount: asr?.segments?.length || 0,
      targetSeconds
    })

    // If no shots from alignment, create shots from ASR segments directly
    let candidates: ShotCandidate[] = shots
    if (candidates.length === 0 && asr?.segments?.length > 0) {
      console.log('📹 No aligned shots found, creating shots from ASR segments')
      candidates = asr.segments.map((seg: any, index: number) => ({
        start_ms: Math.round(seg.start * 1000),
        end_ms: Math.round(seg.end * 1000),
        transcript: seg.text || '',
        match_score: 0.5 // Default score for ASR-only segments
      }))
    }
    
    // If still no candidates, create a single shot from the whole video duration
    if (candidates.length === 0) {
      console.log('📹 No segments found, creating full video shot')
      candidates = [{
        start_ms: 0,
        end_ms: Math.min(targetSeconds * 1000, 30000), // Max 30 seconds
        transcript: asr?.text || 'Full video',
        match_score: 0.3
      }]
    }

    // Simple scoring: scriptMatch (match_score) and durationScore
    const scored = candidates.map((s) => {
      const durationSec = Math.max(0, s.end_ms - s.start_ms) / 1000
      const desired = targetSeconds / Math.max(candidates.length, 1)
      const durationScore = 1 - Math.abs(durationSec - desired) / Math.max(desired, 1)
      const scriptMatch = s.match_score || 0
      const speechEnergy = 0 // TODO: add if available
      const facePresence = 0 // TODO: integrate face detection if available
      const score = alpha * scriptMatch + beta * durationScore + gamma * speechEnergy + delta * facePresence
      return { ...s, reason: 'auto', score }
    })

    scored.sort((a, b) => b.score - a.score)
    console.log('📊 Scored shots:', scored.length, 'candidates')

    const budgetMs = targetSeconds * 1000
    const cutList: Array<{ start_ms: number; end_ms: number; reason: string; score: number }> = []
    let used = 0
    for (const s of scored) {
      const len = Math.max(0, s.end_ms - s.start_ms)
      if (used + len <= budgetMs) {
        cutList.push({ start_ms: s.start_ms, end_ms: s.end_ms, reason: 'score', score: s.score })
        used += len
      }
      if (used >= budgetMs) break
    }

    // Save cut list to metadata
    await db
      .from('media_files')
      .update({
        metadata: {
          ...(media as any).metadata,
          cutList,
        },
      } as any)
      .eq('id', uploadId)

    return NextResponse.json({ success: true, cutList })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Selection failed' },
      { status: 500 }
    )
  }
}


