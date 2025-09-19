import { NextRequest, NextResponse } from 'next/server'
import { enqueueTranscribeJob } from '@/lib/supabase-job-queue-postgres'

/**
 * Enhanced Transcription API with Postgres Job Queue
 * POST /api/transcribe-with-jobs
 * 
 * This API provides asynchronous transcription using Supabase/Postgres job queue
 */

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Enhanced transcription API with Postgres job queue called')

    const body = await request.json()
    const { uploadId, fileUrl, userId, options = {} } = body

    if (!uploadId || !fileUrl) {
      return NextResponse.json(
        { error: 'uploadId and fileUrl are required' },
        { status: 400 }
      )
    }

    console.log('📋 Processing transcription request:', { uploadId, fileUrl })

    // Enqueue transcription job using Postgres queue
    const jobId = await enqueueTranscribeJob({
      uploadId,
      fileUrl,
      userId,
      options
    })

    console.log(`✅ Transcription job enqueued with ID: ${jobId}`)

    return NextResponse.json({
      success: true,
      jobId,
      message: 'Transcription job has been queued successfully',
      statusUrl: `/api/jobs/${jobId}`,
      instructions: {
        polling: `Poll /api/jobs/${jobId} for status updates`,
        worker: 'Make sure the worker is running: npm run worker'
      }
    })

  } catch (error: any) {
    console.error('❌ Enhanced transcription API error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to enqueue transcription job',
      details: error.toString()
    }, { status: 500 })
  }
}