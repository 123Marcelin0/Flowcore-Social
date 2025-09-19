import { NextRequest, NextResponse } from 'next/server'
import { confirmUploadSession } from '@/lib/direct-upload'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId } = body

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'sessionId is required' },
        { status: 400 }
      )
    }

    const result = await confirmUploadSession(sessionId)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        mediaFileId: result.mediaFileId
      }
    })

  } catch (error: any) {
    console.error('❌ Error confirming upload session:', error)
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to confirm upload' },
      { status: 500 }
    )
  }
}