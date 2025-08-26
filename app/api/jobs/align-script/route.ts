import { NextRequest, NextResponse } from 'next/server'
import { alignScript } from '@/lib/align'

// POST /api/jobs/align-script
// Body: { uploadId: string, scriptText: string }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { uploadId, scriptText } = body || {}
    if (!uploadId || !scriptText) {
      return NextResponse.json(
        { success: false, error: 'uploadId and scriptText are required' },
        { status: 400 }
      )
    }

    console.log('📝 Starting alignment for uploadId:', uploadId)
    console.log('📝 Script length:', scriptText.length, 'characters')
    
    const result = await alignScript({ uploadId, scriptText })
    
    console.log('✅ Alignment completed:', {
      uploadId,
      mappingCount: result.mapping.length,
      selectedShotsCount: result.selectedShots.length
    })
    
    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error('❌ Alignment failed:', error.message)
    return NextResponse.json(
      { success: false, error: error?.message || 'Alignment failed' },
      { status: 500 }
    )
  }
}


