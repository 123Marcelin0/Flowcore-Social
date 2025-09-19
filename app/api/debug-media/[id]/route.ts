import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'

// GET /api/debug-media/[id] - Debug endpoint to check media metadata
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Media ID is required' },
        { status: 400 }
      )
    }

    const db = supabaseAdmin || supabase
    const { data: media, error } = await db
      .from('media_files')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !media) {
      return NextResponse.json(
        { success: false, error: 'Media not found', details: error?.message },
        { status: 404 }
      )
    }

    const metadata = (media as any).metadata || {}
    const asr = metadata.asr || {}

    return NextResponse.json({
      success: true,
      media: {
        id: media.id,
        filename: media.filename,
        storage_url: media.storage_url,
        created_at: media.created_at
      },
      metadata: {
        keys: Object.keys(metadata),
        processing_status: metadata.processing_status,
        hasAsr: !!asr,
        asrProvider: asr.provider,
        asrSegmentCount: Array.isArray(asr.segments) ? asr.segments.length : 0,
        asrTextLength: typeof asr.text === 'string' ? asr.text.length : 0,
        fullMetadata: metadata
      }
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Debug failed' },
      { status: 500 }
    )
  }
}






























