import { NextRequest, NextResponse } from 'next/server'
import { createLowQualityAudio, createSimpleAudioFallback } from '@/lib/server-audio-extractor-ffmpeg'

// Ensure this route runs on the Node.js runtime (needed for FFmpeg binaries)
export const runtime = 'nodejs'
export const preferredRegion = 'auto'

// POST /api/convert-to-mp3
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

    console.log('🎵 Starting MP3 conversion for uploadId:', uploadId)
    console.log('📄 Source URL:', fileUrl)

    // Fetch the video file
    const resp = await fetch(fileUrl)
    if (!resp.ok) throw new Error(`Failed to fetch media from URL: ${resp.status}`)
    
    const contentType = resp.headers.get('content-type') || ''
    const arrayBuffer = await resp.arrayBuffer()
    const sizeMB = arrayBuffer.byteLength / (1024 * 1024)
    
    console.log(`📊 Source file: ${sizeMB.toFixed(1)}MB, type: ${contentType}`)

    // Convert to MP3 using our FFmpeg function
    let audioResult
    try {
      // Try normal extraction first (for smaller files)
      if (sizeMB <= 100) {
        console.log('🔄 Using standard conversion for smaller file...')
        audioResult = await createLowQualityAudio(arrayBuffer, contentType, 100) // Allow up to 100MB output
      } else {
        console.log('🔄 Using size-optimized conversion for large file...')
        audioResult = await createLowQualityAudio(arrayBuffer, contentType, 50) // Limit to 50MB for very large files
      }
    } catch (ffmpegError) {
      console.warn('⚠️ FFmpeg conversion failed, falling back to simple truncation:', ffmpegError)
      
      // Use the centralized fallback function
      const fallbackResult = await createSimpleAudioFallback(arrayBuffer, contentType, 50) // 50MB fallback target
      
      audioResult = {
        audioBuffer: fallbackResult.audioBuffer,
        mimeType: fallbackResult.mimeType,
        fileName: fallbackResult.fileName,
        originalSize: arrayBuffer.byteLength,
        audioSize: fallbackResult.audioBuffer.byteLength,
        success: true
      }
    }
    
    const finalSizeMB = audioResult.audioSize / (1024 * 1024)
    console.log(`✅ MP3 conversion completed: ${sizeMB.toFixed(1)}MB → ${finalSizeMB.toFixed(1)}MB`)
    
    // Return the MP3 file as a download
    const headers = new Headers()
    headers.set('Content-Type', 'audio/mpeg')
    headers.set('Content-Disposition', `attachment; filename="converted_${uploadId}.mp3"`)
    headers.set('Content-Length', audioResult.audioSize.toString())
    
    return new NextResponse(audioResult.audioBuffer, {
      status: 200,
      headers
    })

  } catch (error: any) {
    console.error('❌ MP3 conversion API error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'MP3 conversion failed' },
      { status: 500 }
    )
  }
}
