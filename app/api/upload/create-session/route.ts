import { NextRequest, NextResponse } from 'next/server'
import { createDirectUploadSession } from '@/lib/direct-upload'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { filename, fileSize, mimeType, userId } = body

    // Validate required fields
    if (!filename || !fileSize || !userId) {
      return NextResponse.json(
        { success: false, error: 'filename, fileSize, and userId are required' },
        { status: 400 }
      )
    }

    // Create the upload session
    const result = await createDirectUploadSession({
      userId,
      filename,
      fileSize,
      mimeType
    })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.uploadSession
    })

  } catch (error: any) {
    console.error('❌ Error creating upload session:', error)
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create upload session' },
      { status: 500 }
    )
  }
}