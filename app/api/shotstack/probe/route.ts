import { NextRequest, NextResponse } from 'next/server'
import { getShotstackConfig } from '@/lib/shotstack-config'
import { ShotstackService } from '@/lib/shotstack-service'

// Authentication helper function
async function verifyAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  // Add your auth verification logic here
  return { id: 'user-id' } // Replace with actual user verification
}

/**
 * Shotstack Probe API
 * Analyzes media files to extract metadata
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { url } = await request.json()
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Validate URL format
    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }

    const config = getShotstackConfig()
    const shotstackService = new ShotstackService(config)
    const probeResult = await shotstackService.probeAsset(url)

    // Extract useful metadata
    const metadata = probeResult.response?.metadata
    if (!metadata) {
      return NextResponse.json({ error: 'No metadata found' }, { status: 404 })
    }

    // Process and clean up the metadata for frontend use
    const processedMetadata = {
      format: {
        filename: metadata.format?.filename,
        duration: parseFloat(metadata.format?.duration || '0'),
        size: parseInt(metadata.format?.size || '0'),
        bitRate: parseInt(metadata.format?.bit_rate || '0'),
        formatName: metadata.format?.format_name
      },
      streams: metadata.streams?.map((stream: any) => ({
        index: stream.index,
        codecType: stream.codec_type,
        codecName: stream.codec_name,
        width: stream.width,
        height: stream.height,
        duration: parseFloat(stream.duration || '0'),
        frameRate: stream.r_frame_rate,
        bitRate: parseInt(stream.bit_rate || '0'),
        aspectRatio: stream.display_aspect_ratio,
        pixelFormat: stream.pix_fmt,
        sampleRate: stream.sample_rate,
        channels: stream.channels
      })) || []
    }

    // Find video and audio streams
    const videoStream = processedMetadata.streams.find(s => s.codecType === 'video')
    const audioStream = processedMetadata.streams.find(s => s.codecType === 'audio')

    const summary = {
      url,
      isVideo: !!videoStream,
      isAudio: !!audioStream,
      duration: processedMetadata.format.duration,
      fileSize: processedMetadata.format.size,
      video: videoStream ? {
        width: videoStream.width,
        height: videoStream.height,
        codec: videoStream.codecName,
        frameRate: videoStream.frameRate,
        aspectRatio: videoStream.aspectRatio,
        bitRate: videoStream.bitRate
      } : null,
      audio: audioStream ? {
        codec: audioStream.codecName,
        sampleRate: audioStream.sampleRate,
        channels: audioStream.channels,
        bitRate: audioStream.bitRate
      } : null,
      format: processedMetadata.format,
      analyzedAt: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      data: summary,
      raw: processedMetadata // Include raw data for advanced users
    })

  } catch (error) {
    console.error('Error probing asset:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    // Handle specific Shotstack errors
    if (errorMessage.includes('404') || errorMessage.includes('not found')) {
      return NextResponse.json({ error: 'Media file not found or not accessible' }, { status: 404 })
    }
    
    if (errorMessage.includes('403') || errorMessage.includes('forbidden')) {
      return NextResponse.json({ error: 'Access denied to media file' }, { status: 403 })
    }
    
    if (errorMessage.includes('timeout')) {
      return NextResponse.json({ error: 'Media analysis timed out' }, { status: 408 })
    }

    return NextResponse.json(
      { error: 'Failed to analyze media file', details: errorMessage }, 
      { status: 500 }
    )
  }
}

/**
 * GET endpoint for health check
 */
export async function GET() {
  return NextResponse.json({ 
    status: 'healthy', 
    service: 'shotstack-probe',
    timestamp: new Date().toISOString()
  })
}