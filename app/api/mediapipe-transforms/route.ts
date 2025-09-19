import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { 
  computeCleanTransforms, 
  transformsToEDL, 
  previewTransforms,
  type CleanTransform 
} from '@/lib/clean-transforms'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { uploadId, frames, videoResolution, options = {} } = body

    if (!uploadId) {
      return NextResponse.json(
        { success: false, error: 'Upload ID is required' },
        { status: 400 }
      )
    }

    if (!frames || !Array.isArray(frames)) {
      return NextResponse.json(
        { success: false, error: 'MediaPipe frames data is required' },
        { status: 400 }
      )
    }

    if (!videoResolution || !videoResolution.width || !videoResolution.height) {
      return NextResponse.json(
        { success: false, error: 'Video resolution is required' },
        { status: 400 }
      )
    }

    console.log(`🎯 Computing MediaPipe transforms for upload: ${uploadId}`)
    console.log(`📊 Processing ${frames.length} frames at ${videoResolution.width}x${videoResolution.height}`)

    // Validate and clean frame data
    const validatedFrames = frames.map((frame: any) => ({
      timestamp: frame.timestamp || 0,
      frameIndex: frame.frameIndex || 0,
      boundingBoxes: (frame.boundingBoxes || []).map((box: any) => ({
        x: box.x || 0,
        y: box.y || 0,
        width: box.width || 0,
        height: box.height || 0,
        confidence: box.confidence || 0,
        type: box.type || 'face'
      }))
    }))

    // Default transform options
    const transformOptions = {
      targetAspectRatio: options.targetAspectRatio || 9/16,
      maxZoomLevel: options.maxZoomLevel || 2.0,
      minZoomLevel: options.minZoomLevel || 1.0,
      paddingPercent: options.paddingPercent || 0.15,
      smoothingWindow: options.smoothingWindow || 5,
      minTransformDuration: options.minTransformDuration || 2.0,
      confidenceThreshold: options.confidenceThreshold || 0.6
    }

    console.log('🔬 Transform options:', transformOptions)

    // Compute clean transforms from MediaPipe frames
    const transforms = computeCleanTransforms(
      validatedFrames,
      videoResolution,
      transformOptions
    )

    if (transforms.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          uploadId,
          transforms: [],
          edl: null,
          preview: 'No transforms generated - insufficient detection data',
          statistics: {
            framesProcessed: validatedFrames.length,
            detectionsFound: validatedFrames.reduce((sum, frame) => sum + frame.boundingBoxes.length, 0),
            transformsGenerated: 0,
            averageConfidence: 0,
            processingTime: 0
          }
        },
        message: 'No suitable transforms found based on detection data'
      })
    }

    // Convert transforms to EDL format
    const edl = transformsToEDL(transforms, videoResolution)
    
    // Generate preview summary
    const preview = previewTransforms(transforms, videoResolution)

    // Calculate statistics
    const totalDetections = validatedFrames.reduce((sum, frame) => sum + frame.boundingBoxes.length, 0)
    const averageConfidence = totalDetections > 0 
      ? validatedFrames.reduce((sum, frame) => 
          sum + frame.boundingBoxes.reduce((boxSum, box) => boxSum + box.confidence, 0)
        , 0) / totalDetections
      : 0

    const statistics = {
      framesProcessed: validatedFrames.length,
      detectionsFound: totalDetections,
      transformsGenerated: transforms.length,
      averageConfidence,
      totalDuration: Math.max(...validatedFrames.map(f => f.timestamp)),
      transformDuration: transforms.reduce((sum, t) => sum + t.duration, 0),
      coveragePercent: (transforms.reduce((sum, t) => sum + t.duration, 0) / 
        Math.max(...validatedFrames.map(f => f.timestamp))) * 100
    }

    // Store results in database
    const { data: mediaFile, error: fetchError } = await supabase
      .from('media_files')
      .select('metadata')
      .eq('id', uploadId)
      .single()

    if (!fetchError && mediaFile) {
      const mediapipeData = {
        transforms,
        edl,
        statistics,
        options: transformOptions,
        processingTimestamp: new Date().toISOString(),
        version: 'mediapipe_v1'
      }

      await supabase
        .from('media_files')
        .update({
          metadata: {
            ...mediaFile.metadata,
            mediapipeTransforms: mediapipeData
          }
        })
        .eq('id', uploadId)

      console.log('✅ MediaPipe transforms stored in database')
    }

    console.log(`✅ MediaPipe processing completed: ${transforms.length} transforms generated`)

    return NextResponse.json({
      success: true,
      data: {
        uploadId,
        transforms,
        edl,
        preview,
        statistics
      }
    })

  } catch (error: any) {
    console.error('❌ MediaPipe transforms processing failed:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'MediaPipe transforms processing failed',
        details: error.stack
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const uploadId = searchParams.get('uploadId')

    if (!uploadId) {
      return NextResponse.json(
        { success: false, error: 'Upload ID is required' },
        { status: 400 }
      )
    }

    // Retrieve stored MediaPipe transforms
    const { data: mediaFile, error } = await supabase
      .from('media_files')
      .select('metadata')
      .eq('id', uploadId)
      .single()

    if (error || !mediaFile) {
      return NextResponse.json(
        { success: false, error: 'Media file not found' },
        { status: 404 }
      )
    }

    const mediapipeData = mediaFile.metadata?.mediapipeTransforms

    if (!mediapipeData) {
      return NextResponse.json(
        { success: false, error: 'No MediaPipe transforms found for this upload' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: mediapipeData
    })

  } catch (error: any) {
    console.error('❌ Failed to retrieve MediaPipe transforms:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to retrieve MediaPipe transforms'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const uploadId = searchParams.get('uploadId')

    if (!uploadId) {
      return NextResponse.json(
        { success: false, error: 'Upload ID is required' },
        { status: 400 }
      )
    }

    // Remove MediaPipe transforms from database
    const { data: mediaFile, error: fetchError } = await supabase
      .from('media_files')
      .select('metadata')
      .eq('id', uploadId)
      .single()

    if (fetchError || !mediaFile) {
      return NextResponse.json(
        { success: false, error: 'Media file not found' },
        { status: 404 }
      )
    }

    const updatedMetadata = { ...mediaFile.metadata }
    delete updatedMetadata.mediapipeTransforms

    await supabase
      .from('media_files')
      .update({ metadata: updatedMetadata })
      .eq('id', uploadId)

    console.log(`🗑️ MediaPipe transforms cleared for upload: ${uploadId}`)

    return NextResponse.json({
      success: true,
      message: 'MediaPipe transforms cleared successfully'
    })

  } catch (error: any) {
    console.error('❌ Failed to clear MediaPipe transforms:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to clear MediaPipe transforms'
      },
      { status: 500 }
    )
  }
}