import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { ShotstackService } from '@/lib/shotstack-service'
import { getShotstackConfig } from '@/lib/shotstack-config'
import { buildShotstackTimeline } from '@/lib/timelineBuilder'
import { searchAssetsByEmbedding, searchAssetsByTags } from '@/lib/assetsSearch'

function getService() {
  const cfg = getShotstackConfig()
  return new ShotstackService({ ...cfg, debug: true })
}

// POST /api/render/shotstack
// Body: { uploadId: string, styleId?: string }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { uploadId, styleId = 'minimal-bottom' } = body || {}
    if (!uploadId) return NextResponse.json({ error: 'uploadId required' }, { status: 400 })

    console.log('🎬 Starting render for uploadId:', uploadId, 'styleId:', styleId)

    const db = supabaseAdmin || supabase
    const { data: media, error } = await db
      .from('media_files')
      .select('id, storage_url, metadata')
      .eq('id', uploadId)
      .single()

    if (error || !media) {
      console.error('❌ Media not found:', error)
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 })
    }

    const sourceUrl = (media as any).storage_url
    const cutList = (media as any).metadata?.cutList || []
    const alignment = (media as any).metadata?.alignment
    const asr = (media as any).metadata?.asr
    
    console.log('📊 Render data check:', {
      hasSourceUrl: !!sourceUrl,
      cutListLength: cutList.length,
      hasAlignment: !!alignment,
      hasAsr: !!asr,
      asrSegmentCount: asr?.segments?.length || 0,
      cutList: cutList.slice(0, 3), // Show first 3 cuts
      sourceUrl
    })

    // Preflight: ensure sourceUrl is publicly reachable for Shotstack
    try {
      if (!sourceUrl || !/^https?:\/\//i.test(sourceUrl) || /localhost|127\.0\.0\.1/i.test(sourceUrl)) {
        throw new Error('Source URL must be a public https URL (not localhost)')
      }
      const head = await fetch(sourceUrl, { method: 'HEAD' })
      if (!head.ok) {
        throw new Error(`Source URL not reachable (${head.status} ${head.statusText})`)
      }
    } catch (preErr: any) {
      return NextResponse.json({ error: `Source video not publicly reachable: ${preErr.message}` }, { status: 400 })
    }
    
    // IMPORTANT: For subtitles, we should use the actual spoken words (ASR), not the script!
    // Always use ASR segments for captions (what was actually said)
    let captionClips: any[] = []
    
    if (asr?.segments?.length > 0) {
      console.log('📝 Using ASR segments for captions (actual spoken words)')
      captionClips = asr.segments.map((seg: any) => ({
        start_ms: Math.round(seg.start * 1000),
        end_ms: Math.round(seg.end * 1000),
        text: seg.text || ''
      }))
    } else if (alignment?.mapping?.length > 0) {
      // Fallback: use alignment mapping but with matched segment text, not script text
      console.log('📝 Using alignment mapping for captions')
      captionClips = (alignment.mapping || [])
        .filter((m: any) => m.matchedSegment && m.strength !== 'none')
        .map((m: any) => ({ 
          start_ms: m.start_ms, 
          end_ms: m.end_ms, 
          text: m.matchedSegment?.text || m.sentence // Use spoken text, not script
        }))
    } else {
      console.log('⚠️ No ASR or alignment data for captions')
    }
    
    console.log('📝 Caption clips sample:', captionClips.slice(0, 2))
    
    const overlayAssets: Array<{ src: string; start_ms: number; end_ms: number }> = []
    const chosenAssets: Array<{ src: string; range: [number, number] }> = []
    const captionClipsLocal = [...captionClips]
    for (const cut of cutList) {
      const mid = Math.round((cut.start_ms + cut.end_ms) / 2)
      const overlap = captionClipsLocal.find(
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
      chosenAssets.push({ src: chosen.storage_url, range: [ovStart, ovEnd] })
    }

    const edit = buildShotstackTimeline({
      sourceUrl,
      cutList,
      captionClips,
      overlayAssets,
      styleId,
    })

    console.log('🎞️ Building Shotstack timeline...')
    console.log('📋 Final edit payload:', JSON.stringify(edit, null, 2))
    
    // Validate the edit payload before sending
    if (!edit.timeline?.tracks?.length) {
      throw new Error('No tracks in timeline')
    }
    
    const videoTracks = edit.timeline.tracks.filter(t => 
      t.clips?.some(c => c.asset?.type === 'video')
    )
    
    if (videoTracks.length === 0) {
      throw new Error('No video tracks found in timeline')
    }
    
    console.log('✅ Timeline validation passed:', {
      totalTracks: edit.timeline.tracks.length,
      videoTracks: videoTracks.length,
      totalClips: edit.timeline.tracks.reduce((acc, t) => acc + (t.clips?.length || 0), 0)
    })
    
    const service = getService()
    const renderResp = await service.render(edit)
    const jobId = renderResp?.response?.id
    
    console.log('✅ Shotstack render submitted:', { jobId, status: renderResp?.response?.status })

    // Try to save render record, but don't fail if table doesn't exist
    try {
      await db.from('shotstack_jobs').insert({
        shotstack_job_id: jobId,
        user_id: null,
        status: 'submitted',
        video_url: null,
        error_message: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: { uploadId, styleId, chosenAssets },
      } as any)
      console.log('💾 Saved render record to shotstack_jobs')
    } catch (dbError) {
      console.log('⚠️ Could not save to shotstack_jobs table:', dbError)
      // Continue anyway - the render was submitted successfully
    }

    return NextResponse.json({ success: true, jobId, edit })
  } catch (error: any) {
    console.error('❌ Render failed:', error)
    return NextResponse.json({ 
      error: error?.message || 'Render failed',
      details: error?.toString?.() || String(error)
    }, { status: 500 })
  }
}


