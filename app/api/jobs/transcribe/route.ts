import { NextRequest, NextResponse } from 'next/server'
import { enqueueTranscribeJob, getJobStatus } from '@/lib/supabase-job-queue'
import { supabase, supabaseAdmin } from '@/lib/supabase'

// Ensure this route runs on the Node.js runtime (needed for FFmpeg binaries)
export const runtime = 'nodejs'
export const preferredRegion = 'auto'

// HEAD /api/jobs/transcribe - Health check
export async function HEAD() {
  try {
    // Basic health check - verify OpenAI key exists
    const hasOpenAI = !!process.env.OPENAI_API_KEY
    
    if (!hasOpenAI) {
      return new NextResponse(null, { 
        status: 503, 
        statusText: 'OpenAI API key not configured' 
      })
    }
    
    return new NextResponse(null, { 
      status: 200,
      statusText: 'Service available'
    })
  } catch (error) {
    return new NextResponse(null, { 
      status: 503, 
      statusText: 'Service unavailable' 
    })
  }
}

// POST /api/jobs/transcribe - Enqueue transcription job
// Body: { uploadId: string, fileUrl: string, userId?: string }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { uploadId, fileUrl, userId, options } = body || {}

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
      const allowed = ['audio/', 'video/mp4', 'video/webm', 'video/mov', 'video/avi']
      if (type && !allowed.some((p) => type.startsWith(p))) {
        return NextResponse.json(
          { success: false, error: `Unsupported content-type: ${type}. Use mp4, webm, mov, avi, or common audio formats.` },
          { status: 415 }
        )
      }
      
      // Log file size for debugging
      if (size) {
        console.log(`📊 File size: ${Math.round(size/1024/1024)}MB`)
        
        // Warn for very large files
        if (size > 500 * 1024 * 1024) { // 500MB
          console.warn(`⚠️ Large file detected (${Math.round(size/1024/1024)}MB). This may take a while to process.`)
        }
      }
    } catch (prefetchError) {
      console.warn('⚠️ Preflight check failed, but continuing:', prefetchError)
    }

    console.log('🎤 Enqueueing transcription job for uploadId:', uploadId)
    
    // Enqueue the transcription job instead of processing immediately
    const jobId = await enqueueTranscribeJob({
      uploadId,
      fileUrl,
      userId,
      options: options || {}
    })
    
    console.log(`✅ Transcription job enqueued with ID: ${jobId}`)

    // Return job ID for status polling
    return NextResponse.json({
      success: true,
      jobId,
      message: 'Transcription job has been queued. Use /api/jobs/' + jobId + ' to check status.',
      pollUrl: `/api/jobs/${jobId}`
    })

  } catch (error: any) {
    console.error('❌ Failed to enqueue transcription job:', error)
    
    // Persist error for diagnostics
    try {
      const body = await request.json().catch(() => ({}))
      if (body?.uploadId) {
        const db = supabaseAdmin || supabase
        
        // Get existing metadata before updating
        const { data: currentMedia } = await db
          .from('media_files')
          .select('metadata')
          .eq('id', body.uploadId)
          .single()
        
        const existingMetadata = (currentMedia as any)?.metadata || {}
        
        await db
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
      { success: false, error: error?.message || 'Failed to enqueue transcription job' },
      { status: 500 }
    )
  }
}



