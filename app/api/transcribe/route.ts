import { NextRequest, NextResponse } from 'next/server'
import { transcribeFromUrl } from '@/lib/transcribe'

/**
 * Direct Transcription API
 * POST /api/transcribe - Performs immediate transcription (synchronous)
 * 
 * This API provides direct synchronous transcription for immediate results
 * Body: { uploadId: string, fileUrl: string, options?: any }
 */

export const runtime = 'nodejs'
export const preferredRegion = 'auto'

export async function POST(request: NextRequest) {
  try {
    console.log('🎤 Direct transcription API called')

    const body = await request.json()
    const { uploadId, fileUrl, options = {} } = body

    if (!uploadId || !fileUrl) {
      return NextResponse.json(
        { success: false, error: 'uploadId and fileUrl are required' },
        { status: 400 }
      )
    }

    console.log('🎤 Starting direct transcription for uploadId:', uploadId)

    // Perform transcription directly
    const result = await transcribeFromUrl({ uploadId, fileUrl, options })

    if (!result || !result.segments) {
      throw new Error('Transcription failed - no segments returned')
    }

    console.log('✅ Direct transcription completed:', {
      segmentCount: result.segments?.length || 0,
      duration: result.duration,
      hasText: !!result.text
    })

    // Return the transcription result directly
    return NextResponse.json({
      success: true,
      text: result.text || '',
      duration: result.duration || 0,
      segments: result.segments || [],
      words: result.words || [],
      language: result.language || 'en'
    })

  } catch (error: any) {
    console.error('❌ Direct transcription failed:', error)

    // Handle specific error cases
    let errorMessage = error?.message || 'Transcription failed'
    let statusCode = 500

    if (error?.message?.includes('silent') || error?.message?.includes('no audio')) {
      statusCode = 200 // Not an error, just silent
      return NextResponse.json({
        success: true,
        text: 'Silent video - no audio detected',
        duration: 30, // Default duration
        segments: [{
          start: 0,
          end: 30,
          text: 'Silent video - no audio detected',
          confidence: 1.0
        }],
        words: [],
        language: 'en',
        isSilent: true
      })
    }

    if (error?.message?.includes('network') || error?.message?.includes('timeout')) {
      errorMessage = 'Network error during transcription. Please check your connection and try again.'
    } else if (error?.message?.includes('format') || error?.message?.includes('unsupported')) {
      errorMessage = 'Unsupported audio/video format. Please use MP4, MOV, or common audio formats.'
    } else if (error?.message?.includes('OpenAI') || error?.message?.includes('API key')) {
      errorMessage = 'Transcription service unavailable. Please try again later.'
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    )
  }
}

// Health check endpoint
export async function GET() {
  try {
    // Basic health check - verify OpenAI key exists
    const hasOpenAI = !!process.env.OPENAI_API_KEY
    
    return NextResponse.json({
      status: 'healthy',
      services: {
        openai: hasOpenAI ? 'configured' : 'missing',
        transcription: 'available'
      }
    })
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', error: 'Service check failed' },
      { status: 503 }
    )
  }
}