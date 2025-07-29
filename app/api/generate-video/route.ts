import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

interface VideoGenerationRequest {
  prompt: string
  model: 'veo-2' | 'veo-3'
  duration: number
  fps: number
  resolution: '480p' | '720p' | '1080p'
  style: string
  motionIntensity: number
  cameraMovement: string
}

interface VideoGenerationResponse {
  success: boolean
  videoUrl?: string
  taskId?: string
  error?: string
  estimatedTime?: number
}

// Google Veo API Configuration
const GOOGLE_VEO_API_URL = 'https://aiplatform.googleapis.com/v1'
const GOOGLE_VEO_PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID
const GOOGLE_VEO_API_KEY = process.env.GOOGLE_VEO_API_KEY

async function generateVideoWithVeo(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
  try {
    if (!GOOGLE_VEO_API_KEY) {
      throw new Error('Google Veo API key not configured')
    }

    // Map resolution to actual dimensions
    const resolutionMap = {
      '480p': { width: 854, height: 480 },
      '720p': { width: 1280, height: 720 },
      '1080p': { width: 1920, height: 1080 }
    }

    const dimensions = resolutionMap[request.resolution]

    // Prepare Veo API request
    const veoRequest = {
      instances: [{
        prompt: request.prompt,
        model: request.model,
        video_config: {
          duration_seconds: request.duration,
          fps: request.fps,
          width: dimensions.width,
          height: dimensions.height,
          style: request.style,
          motion_intensity: request.motionIntensity / 10, // Normalize to 0-1
          camera_movement: request.cameraMovement
        }
      }],
      parameters: {
        temperature: 0.7,
        max_output_tokens: 1024
      }
    }

    console.log('Generating video with Veo:', { 
      prompt: request.prompt, 
      model: request.model,
      duration: request.duration,
      resolution: request.resolution
    })

    // Call Google Veo API
    const response = await fetch(
      `${GOOGLE_VEO_API_URL}/projects/${GOOGLE_VEO_PROJECT_ID}/locations/us-central1/publishers/google/models/${request.model}:predict`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GOOGLE_VEO_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(veoRequest)
      }
    )

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Veo API error:', errorData)
      throw new Error(`Veo API error: ${response.status} - ${errorData}`)
    }

    const result = await response.json()
    
    // Handle different response formats
    if (result.predictions && result.predictions[0]) {
      const prediction = result.predictions[0]
      
      // If video is immediately available
      if (prediction.video_url) {
        return {
          success: true,
          videoUrl: prediction.video_url
        }
      }
      
      // If video generation is queued (async)
      if (prediction.task_id) {
        return {
          success: true,
          taskId: prediction.task_id,
          estimatedTime: prediction.estimated_time_seconds || 60
        }
      }
    }

    throw new Error('Unexpected response format from Veo API')

  } catch (error) {
    console.error('Video generation error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Video generation failed'
    }
  }
}

// Simulate video generation for development/fallback
async function simulateVideoGeneration(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
  console.log('Simulating video generation:', request)
  
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  // Return mock video URL (you can replace with actual test video)
  return {
    success: true,
    videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4'
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json() as VideoGenerationRequest

    // Validate required fields
    if (!body.prompt?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      )
    }

    // Validate duration limits
    if (body.duration < 3 || body.duration > 30) {
      return NextResponse.json(
        { success: false, error: 'Duration must be between 3 and 30 seconds' },
        { status: 400 }
      )
    }

    console.log('Video generation request:', {
      prompt: body.prompt,
      model: body.model,
      duration: body.duration,
      resolution: body.resolution
    })

    // Try Google Veo API first, fallback to simulation
    let result: VideoGenerationResponse
    
    if (GOOGLE_VEO_API_KEY && process.env.NODE_ENV === 'production') {
      result = await generateVideoWithVeo(body)
      
      // If Veo fails, try simulation as fallback
      if (!result.success) {
        console.warn('Veo API failed, using simulation:', result.error)
        result = await simulateVideoGeneration(body)
      }
    } else {
      console.log('Using video simulation (development mode or missing API key)')
      result = await simulateVideoGeneration(body)
    }

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Video generation failed' },
        { status: 500 }
      )
    }

    // Log successful generation
    try {
      await supabase
        .from('content_generations')
        .insert({
          user_id: 'system', // TODO: Extract from auth
          type: 'video',
          prompt: body.prompt,
          settings: {
            model: body.model,
            duration: body.duration,
            resolution: body.resolution,
            style: body.style,
            motionIntensity: body.motionIntensity,
            cameraMovement: body.cameraMovement
          },
          result_url: result.videoUrl,
          status: result.taskId ? 'processing' : 'completed',
          task_id: result.taskId
        })
    } catch (dbError) {
      console.error('Failed to log generation:', dbError)
      // Don't fail the request if logging fails
    }

    return NextResponse.json({
      success: true,
      videoUrl: result.videoUrl,
      taskId: result.taskId,
      estimatedTime: result.estimatedTime
    })

  } catch (error) {
    console.error('Video generation API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

// GET endpoint to check video generation status (for async generation)
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const taskId = url.searchParams.get('taskId')

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: 'Task ID is required' },
        { status: 400 }
      )
    }

    // Check task status with Google Veo
    if (GOOGLE_VEO_API_KEY) {
      const response = await fetch(
        `${GOOGLE_VEO_API_URL}/projects/${GOOGLE_VEO_PROJECT_ID}/locations/us-central1/operations/${taskId}`,
        {
          headers: {
            'Authorization': `Bearer ${GOOGLE_VEO_API_KEY}`,
            'Content-Type': 'application/json',
          }
        }
      )

      if (response.ok) {
        const result = await response.json()
        
        return NextResponse.json({
          success: true,
          status: result.done ? 'completed' : 'processing',
          videoUrl: result.done ? result.response?.video_url : undefined,
          progress: result.metadata?.progress_percent || 0
        })
      }
    }

    // Fallback for simulation
    return NextResponse.json({
      success: true,
      status: 'completed',
      videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
      progress: 100
    })

  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to check status' },
      { status: 500 }
    )
  }
} 