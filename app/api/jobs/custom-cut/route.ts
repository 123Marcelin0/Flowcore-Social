import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { createCleanVideoFromDecision } from '@/lib/video-editor'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
	try {
		const body = await request.json()
		const { uploadId, keepSegments } = body || {}
		if (!uploadId || !Array.isArray(keepSegments) || keepSegments.length === 0) {
			return NextResponse.json({ success: false, error: 'uploadId and keepSegments[] are required' }, { status: 400 })
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
		const resp = await fetch(sourceUrl)
		if (!resp.ok) {
			return NextResponse.json({ success: false, error: `Failed to fetch source video (${resp.status})` }, { status: 502 })
		}
		const videoBuffer = await resp.arrayBuffer()
		const videoMimeType = resp.headers.get('content-type') || 'video/mp4'

		// Build a minimal EditingDecision-like structure with basic stats
		const cleanedSegments = (keepSegments as any[])
			.map((s: any) => ({
				start_ms: Math.max(0, Math.round(Number(s.start_ms || 0))),
				end_ms: Math.max(0, Math.round(Number(s.end_ms || 0))),
				transcript: String(s.transcript || ''),
				confidence: 0.9,
				reason: 'fallback_keep'
			}))
			.filter(s => s.end_ms > s.start_ms)

		const totalDurationMs = cleanedSegments.reduce((a, s) => a + (s.end_ms - s.start_ms), 0)

		const editingDecision = {
			keepSegments: cleanedSegments,
			analysisMetadata: { timestamp: new Date().toISOString(), model: 'manual', policyUsed: {}, hasScript: false, scriptLength: 0, transcriptLength: 0, processingTime_ms: 0 },
			editingStats: {
				totalDuration_ms: cleanedSegments.length ? cleanedSegments[cleanedSegments.length - 1].end_ms : 0,
				finalDuration_ms: totalDurationMs,
				removedDuration_ms: 0,
				reductionPercentage: 0,
				segmentsRemoved: 0
			}
		} as any

		const result = await createCleanVideoFromDecision(videoBuffer, videoMimeType, editingDecision, { outputFormat: 'mp4', outputQuality: 'medium', fadeInOut: true, transitionDuration: 200 })
		if (!result.success || !result.outputBuffer) {
			return NextResponse.json({ success: false, error: result.error || 'Render failed' }, { status: 500 })
		}

		// Store rendered file back into storage for this user
		const outBytes = new Uint8Array(result.outputBuffer)
		const file = new File([outBytes], 'cut.mp4', { type: result.outputMimeType || 'video/mp4' })
		const filename = `${(media as any).user_id || 'user'}/videos/${Date.now()}-cut.mp4`
		const { data: upload, error: upErr } = await supabase.storage.from('media-files').upload(filename, file, { upsert: false })
		if (upErr) {
			return NextResponse.json({ success: false, error: 'Failed to save rendered video' }, { status: 500 })
		}
		const { data: { publicUrl } } = supabase.storage.from('media-files').getPublicUrl(filename)

		return NextResponse.json({ success: true, storageUrl: publicUrl })
	} catch (e: any) {
		return NextResponse.json({ success: false, error: e?.message || 'Custom cut failed' }, { status: 500 })
	}
}


