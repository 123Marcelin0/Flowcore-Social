import { NextRequest, NextResponse } from 'next/server'
import { buildShotstackTimeline } from '@/lib/timelineBuilder'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { searchAssetsByEmbedding, searchAssetsByTags } from '@/lib/assetsSearch'

// POST /api/jobs/render-preview
// Body: { uploadId, cutList, styleId }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { uploadId, cutList, styleId } = body || {}
    if (!uploadId || !Array.isArray(cutList) || !styleId) {
      return NextResponse.json(
        { success: false, error: 'uploadId, cutList, styleId required' },
        { status: 400 }
      )
    }

    const db = supabaseAdmin || supabase
    const { data: media, error } = await db
      .from('media_files')
      .select('id, storage_url, metadata')
      .eq('id', uploadId)
      .single()

    if (error || !media) {
      return NextResponse.json({ success: false, error: 'Upload not found' }, { status: 404 })
    }

    const sourceUrl = (media as any).storage_url
    const alignment = (media as any).metadata?.alignment
    const captionClips = (alignment?.mapping || [])
      .filter((m: any) => m.matchedSegment && m.strength !== 'none')
      .map((m: any) => ({ start_ms: m.start_ms, end_ms: m.end_ms, text: m.sentence }))

    const autoPlan = (media as any).metadata?.auto_zoom_plan
    const transitionEvents = Array.isArray(autoPlan?.transition_events) ? autoPlan.transition_events : []
    const zoomEvents = Array.isArray(autoPlan?.zoom_events) ? autoPlan.zoom_events : []

    // Minimal overlay selection: 0–1 asset per cut, based on overlapping caption text
    const overlayAssets: Array<{ src: string; start_ms: number; end_ms: number }> = []
    for (const cut of cutList) {
      const mid = Math.round((cut.start_ms + cut.end_ms) / 2)
      const overlap = captionClips.find(
        (c: any) => mid >= c.start_ms && mid <= c.end_ms && typeof c.text === 'string' && c.text.length > 0
      )
      if (!overlap) continue
      const query = overlap.text.slice(0, 120)
      let assets = await searchAssetsByEmbedding(query, 3)
      if (!assets.length) assets = await searchAssetsByTags(query, 3)
      if (!assets.length) continue
      const chosen = assets[0]
      const ovStart = cut.start_ms + Math.round((cut.end_ms - cut.start_ms) * 0.25)
      const ovEnd = Math.min(cut.end_ms, ovStart + Math.round((cut.end_ms - cut.start_ms) * 0.5))
      overlayAssets.push({ src: chosen.storage_url, start_ms: ovStart, end_ms: ovEnd })
    }

    const edit = buildShotstackTimeline({
      sourceUrl,
      cutList,
      captionClips,
      overlayAssets,
      styleId,
      zoomEvents,
      transitionEvents,
    })

    return NextResponse.json({ success: true, edit })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Render preview failed' },
      { status: 500 }
    )
  }
}


