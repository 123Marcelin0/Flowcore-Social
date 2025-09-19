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
    const autoPlan = (media as any).metadata?.auto_zoom_plan
    const transitionEvents = Array.isArray(autoPlan?.transition_events) ? autoPlan.transition_events : []
    const zoomEvents = Array.isArray(autoPlan?.zoom_events) ? autoPlan.zoom_events : []
    
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
    
    // Centralized subtitle creation: prefer AI subtitle cards from editor, else AI segmentation
    // Only fall back to simple ASR/alignment if absolutely necessary
    let captionClips: any[] = []
    try {
      const metadata: any = (media as any).metadata || {}
      const aiCards: any[] = Array.isArray(metadata?.ai_subtitles?.cards) ? metadata.ai_subtitles.cards : []

      if (aiCards.length > 0) {
        console.log('🧠 Using AI subtitle cards from metadata.ai_subtitles')
        captionClips = aiCards
          .map((c: any) => ({
            start_ms: Math.round(Number(c.renderStart ?? c.start ?? 0) * 1000),
            end_ms: Math.round(Number(c.renderEnd ?? c.end ?? 0) * 1000),
            text: String(c.text || '')
          }))
          .filter((c: any) => c.end_ms > c.start_ms && c.text.length > 0)
      } else {
        // Build words array for AI segmentation
        const wordsSrc: any[] = Array.isArray(metadata?.asr?.words) ? metadata.asr.words : []

        const buildWordTiming = (text: string, start: number, end: number) => {
          const tokens = String(text || '')
            .split(/\s+/)
            .map(t => t.trim())
            .filter(Boolean)
          if (!tokens.length) return [] as Array<{ word: string; start: number; end: number }>
          const total = Math.max(0.001, (end || 0) - (start || 0))
          return tokens.map((w, i) => {
            const ws = (start || 0) + (i / tokens.length) * total
            const we = (start || 0) + ((i + 1) / tokens.length) * total
            return { word: w, start: ws, end: we }
          })
        }

        let words: Array<{ word: string; start: number; end: number; confidence?: number }> = []
        if (wordsSrc.length) {
          words = wordsSrc.map((w: any) => ({
            word: String(w.word || w.text_for_display || ''),
            start: Number(w.start ?? w.startTime ?? 0),
            end: Number(w.end ?? w.endTime ?? 0),
            confidence: typeof w.confidence === 'number' ? w.confidence : 0.9
          }))
        } else if (asr?.segments?.length) {
          for (const seg of asr.segments) {
            const approx = buildWordTiming(seg.text || '', Number(seg.start || 0), Number(seg.end || 0))
            words.push(...approx)
          }
        }

        if (words.length) {
          try {
            console.log('🤖 Requesting AI caption segmentation for ad pipeline...')
            const url = new URL('/api/ai-caption-segmentation', request.nextUrl.origin)
            const res = await fetch(url.toString(), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                words,
                audioUrl: sourceUrl,
                settings: {
                  minWordsPerCard: 2,
                  maxWordsPerCard: 6,
                  targetCpsRange: [12, 17],
                  lingerSec: 1.0
                }
              })
            })
            if (res.ok) {
              const j = await res.json().catch(() => null as any)
              const cards = (j && (j.data?.cards || j.cards)) || []
              if (Array.isArray(cards) && cards.length) {
                captionClips = cards
                  .map((c: any) => ({
                    start_ms: Math.round(Number(c.renderStart ?? c.start ?? 0) * 1000),
                    end_ms: Math.round(Number(c.renderEnd ?? c.end ?? 0) * 1000),
                    text: String(c.text || '')
                  }))
                  .filter((c: any) => c.end_ms > c.start_ms && c.text.length > 0)
              }
            }
          } catch (e) {
            console.warn('⚠️ AI segmentation failed, will attempt fallback:', e)
          }
        }

        // Last resort fallback: use ASR mapping if AI failed
        if (!captionClips.length) {
          if (asr?.segments?.length > 0) {
            console.log('📝 Fallback: using ASR segments for captions')
            captionClips = asr.segments.map((seg: any) => ({
              start_ms: Math.round(Number(seg.start || 0) * 1000),
              end_ms: Math.round(Number(seg.end || 0) * 1000),
              text: String(seg.text || '')
            }))
          } else if (alignment?.mapping?.length > 0) {
            console.log('📝 Fallback: using alignment mapping for captions')
            captionClips = (alignment.mapping || [])
              .filter((m: any) => m.matchedSegment && m.strength !== 'none')
              .map((m: any) => ({ 
                start_ms: m.start_ms, 
                end_ms: m.end_ms, 
                text: String(m.matchedSegment?.text || m.sentence || '')
              }))
          } else {
            console.log('⚠️ No ASR or alignment data for captions')
          }
        }
      }
    } catch (capErr) {
      console.warn('⚠️ Subtitle creation encountered an error, falling back if possible:', capErr)
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
      zoomEvents,
      transitionEvents,
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


