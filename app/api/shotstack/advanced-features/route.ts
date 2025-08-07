import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ShotstackService } from '@/lib/shotstack-service'
import { getShotstackConfig, validateShotstackConfig } from '@/lib/shotstack-config'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Authentication helper function
async function verifyAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  const { data: { user }, error } = await supabase.auth.getUser(token)
  
  if (error || !user) {
    return null
  }

  return user
}

interface AdvancedFeaturesRequest {
  action: 'preview' | 'render' | 'analyze'
  mediaUrl: string
  features: {
    filters?: {
      type: string
      intensity?: number
    }
    effects?: {
      type: string
      params?: any
    }
    colorGrading?: {
      preset: string
      custom?: any
    }
    textAnimation?: {
      type: string
      duration?: number
    }
    audio?: {
      fadeIn?: number
      fadeOut?: number
      volume?: number
      sync?: boolean
    }
    video?: {
      speed?: number
      stabilization?: boolean
      motionBlur?: boolean
    }
  }
  output?: {
    format: 'mp4' | 'gif' | 'jpg' | 'png'
    resolution: 'sd' | 'hd' | 'full-hd'
    quality: 'low' | 'medium' | 'high'
  }
}

interface PreviewResponse {
  success: boolean
  previewUrl?: string
  thumbnailUrl?: string
  estimatedTime?: number
  features?: any
}

interface AnalysisResponse {
  success: boolean
  analysis: {
    duration?: number
    resolution?: { width: number; height: number }
    fps?: number
    audio?: {
      duration?: number
      bitrate?: number
      channels?: number
    }
    video?: {
      codec?: string
      bitrate?: number
      colorSpace?: string
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate Shotstack configuration
    const configValidation = validateShotstackConfig()
    if (!configValidation.isValid) {
      return NextResponse.json({ 
        error: 'Shotstack configuration error', 
        details: configValidation.errors 
      }, { status: 500 })
    }

    const body: AdvancedFeaturesRequest = await request.json()
    const { action, mediaUrl, features, output } = body

    // Initialize Shotstack service
    const config = getShotstackConfig()
    const shotstackService = new ShotstackService(config)

    switch (action) {
      case 'preview':
        return await handlePreview(shotstackService, mediaUrl, features, output, user.id)
      
      case 'render':
        return await handleRender(shotstackService, mediaUrl, features, output, user.id)
      
      case 'analyze':
        return await handleAnalysis(shotstackService, mediaUrl)
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Advanced features error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}

async function handlePreview(
  shotstackService: ShotstackService,
  mediaUrl: string,
  features: any,
  output: any,
  userId: string
): Promise<NextResponse<PreviewResponse>> {
  try {
    console.log('Generating preview with features:', features)

    // Create a simplified edit configuration for preview
    const editConfig = {
      timeline: {
        tracks: [{
          clips: [{
            asset: {
              type: mediaUrl.includes('.mp4') || mediaUrl.includes('.mov') ? 'video' : 'image',
              src: mediaUrl
            },
            start: 0,
            length: 5,
            fit: 'cover'
          }]
        }],
        background: '#000000'
      },
      output: {
        format: 'mp4',
        resolution: 'sd', // Use lower resolution for preview
        quality: 'low'
      }
    }

    // Apply features to the edit configuration
    if (features.filters) {
      editConfig.timeline.tracks[0].clips[0].filter = {
        filter: features.filters.type
      }
    }

    if (features.effects) {
      editConfig.timeline.tracks[0].clips[0].transform = {
        rotate: features.effects.params?.rotate || 0
      }
    }

    // Submit preview render
    const response = await shotstackService.render(editConfig)
    const jobId = response.response?.id

    if (!jobId) {
      throw new Error('Failed to create preview job')
    }

    // Save preview job to database
    await supabase
      .from('shotstack_jobs')
      .insert({
        user_id: userId,
        shotstack_job_id: jobId,
        status: 'submitted',
        metadata: {
          type: 'preview',
          features,
          output
        }
      })

    return NextResponse.json({
      success: true,
      previewUrl: null, // Will be available after render completes
      estimatedTime: 30, // Estimated 30 seconds for preview
      features
    })

  } catch (error) {
    console.error('Preview generation error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Preview generation failed'
    }, { status: 500 })
  }
}

async function handleRender(
  shotstackService: ShotstackService,
  mediaUrl: string,
  features: any,
  output: any,
  userId: string
): Promise<NextResponse<any>> {
  try {
    console.log('Rendering with advanced features:', features)

    // Create full edit configuration
    const editConfig = {
      timeline: {
        tracks: [{
          clips: [{
            asset: {
              type: mediaUrl.includes('.mp4') || mediaUrl.includes('.mov') ? 'video' : 'image',
              src: mediaUrl
            },
            start: 0,
            length: 10,
            fit: 'cover'
          }]
        }],
        background: '#000000'
      },
      output: {
        format: output?.format || 'mp4',
        resolution: output?.resolution || 'hd',
        quality: output?.quality || 'medium'
      }
    }

    // Apply all features
    if (features.filters) {
      editConfig.timeline.tracks[0].clips[0].filter = {
        filter: features.filters.type
      }
    }

    if (features.effects) {
      editConfig.timeline.tracks[0].clips[0].transform = {
        rotate: features.effects.params?.rotate || 0
      }
    }

    if (features.audio) {
      editConfig.timeline.soundtrack = {
        src: mediaUrl,
        effect: 'fadeInFadeOut',
        volume: (features.audio.volume || 100) / 100
      }
    }

    // Submit render
    const response = await shotstackService.render(editConfig)
    const jobId = response.response?.id

    if (!jobId) {
      throw new Error('Failed to create render job')
    }

    // Save render job to database
    await supabase
      .from('shotstack_jobs')
      .insert({
        user_id: userId,
        shotstack_job_id: jobId,
        status: 'submitted',
        metadata: {
          type: 'advanced_render',
          features,
          output
        }
      })

    return NextResponse.json({
      success: true,
      jobId,
      estimatedTime: 120, // Estimated 2 minutes for full render
      features
    })

  } catch (error) {
    console.error('Advanced render error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Advanced render failed'
    }, { status: 500 })
  }
}

async function handleAnalysis(
  shotstackService: ShotstackService,
  mediaUrl: string
): Promise<NextResponse<AnalysisResponse>> {
  try {
    console.log('Analyzing media:', mediaUrl)

    // Use Shotstack probe API to analyze media
    const analysis = await shotstackService.probeAsset(mediaUrl)
    
    if (!analysis.success) {
      throw new Error('Failed to analyze media')
    }

    const mediaInfo = analysis.response?.metadata || {}
    
    return NextResponse.json({
      success: true,
      analysis: {
        duration: mediaInfo.duration,
        resolution: mediaInfo.video ? {
          width: mediaInfo.video.width,
          height: mediaInfo.video.height
        } : undefined,
        fps: mediaInfo.video?.fps,
        audio: mediaInfo.audio ? {
          duration: mediaInfo.audio.duration,
          bitrate: mediaInfo.audio.bitrate,
          channels: mediaInfo.audio.channels
        } : undefined,
        video: mediaInfo.video ? {
          codec: mediaInfo.video.codec,
          bitrate: mediaInfo.video.bitrate,
          colorSpace: mediaInfo.video.colorSpace
        } : undefined
      }
    })

  } catch (error) {
    console.error('Media analysis error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Media analysis failed'
    }, { status: 500 })
  }
}

// GET method to check preview/render status
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      return NextResponse.json({ error: 'jobId parameter is required' }, { status: 400 })
    }

    const config = getShotstackConfig()
    const shotstackService = new ShotstackService(config)
    
    const response = await shotstackService.getRenderStatus(jobId)
    const renderData = response.response

    return NextResponse.json({
      success: true,
      jobId,
      status: renderData.status,
      videoUrl: renderData.url,
      error: renderData.error
    })

  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
} 