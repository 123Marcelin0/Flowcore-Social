import { NextRequest, NextResponse } from 'next/server'
import { transcribeFromUrl } from '@/lib/transcribe'
import { transcribeLargeFile } from '@/lib/transcribe-large'
import { supabase, supabaseAdmin } from '@/lib/supabase'

// Ensure this route runs on the Node.js runtime (needed for FFmpeg binaries)
export const runtime = 'nodejs'
export const preferredRegion = 'auto'

// POST /api/jobs/transcribe
// Body: { uploadId: string, fileUrl: string }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { uploadId, fileUrl } = body || {}

    if (!uploadId || !fileUrl) {
      return NextResponse.json(
        { success: false, error: 'uploadId and fileUrl are required' },
        { status: 400 }
      )
    }

    // Basic preflight checks for file type
    try {
      const head = await fetch(fileUrl, { method: 'HEAD' })
      const sizeStr = head.headers.get('content-length')
      const type = head.headers.get('content-type') || ''
      const size = sizeStr ? parseInt(sizeStr, 10) : undefined
      
      // Check file type
      const allowed = ['audio/', 'video/mp4', 'video/webm']
      if (type && !allowed.some((p) => type.startsWith(p))) {
        return NextResponse.json(
          { success: false, error: `Unsupported content-type: ${type}. Use mp4, webm, or common audio.` },
          { status: 415 }
        )
      }
      
      // Log file size for debugging
      if (size) {
        console.log(`📊 File size: ${Math.round(size/1024/1024)}MB`)
      }
    } catch {}

    console.log('🎤 Starting transcription for uploadId:', uploadId)
    
    // For now, use the original transcription with a reasonable size limit
    // TODO: Implement proper video splitting with FFmpeg for very large files
    const result = await transcribeFromUrl({ uploadId, fileUrl })
    
    console.log('✅ Transcription completed:', {
      uploadId,
      segmentCount: result.segments.length,
      textLength: result.text.length
    })

    return NextResponse.json({ success: true, segments: result.segments })
  } catch (error: any) {
    // Persist error for diagnostics
    try {
      const body = await request.json().catch(() => ({}))
      if (body?.uploadId) {
        const db2 = supabaseAdmin || supabase
        
        // Get existing metadata before updating
        const { data: currentMedia } = await db2
          .from('media_files')
          .select('metadata')
          .eq('id', body.uploadId)
          .single()
        
        const existingMetadata = (currentMedia as any)?.metadata || {}
        
        await db2
          .from('media_files')
          .update({ 
            metadata: { 
              ...existingMetadata,
              processing_status: 'failed', 
              processing_errors: [String(error?.message || error)] 
            } 
          } as any)
          .eq('id', body.uploadId)
      }
    } catch {}

    return NextResponse.json(
      { success: false, error: error?.message || 'Transcription failed' },
      { status: 500 }
    )
  }
}


