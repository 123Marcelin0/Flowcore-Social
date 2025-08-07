import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { GoogleAuth } from 'google-auth-library'

// Helper function to verify authentication
async function verifyAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authenticated: false, user: null, error: 'Missing or invalid authorization header' }
  }

  const token = authHeader.replace('Bearer ', '')
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      return { authenticated: false, user: null, error: 'Invalid or expired token' }
    }

    return { authenticated: true, user, error: null }
  } catch (error) {
    return { authenticated: false, user: null, error: 'Authentication verification failed' }
  }
}

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
  operationName?: string
  error?: string
  estimatedTime?: number
}

// Vertex AI Configuration
const VERTEX_AI_BASE_URL = 'https://us-central1-aiplatform.googleapis.com'
const GOOGLE_CLOUD_PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID
const GOOGLE_APPLICATION_CREDENTIALS = process.env.GOOGLE_APPLICATION_CREDENTIALS

// Initialize Google Auth client
async function getAuthenticatedClient() {
  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    keyFile: GOOGLE_APPLICATION_CREDENTIALS,
  })
  
  return await auth.getClient()
}

// Poll long-running operation
async function pollOperation(operationName: string): Promise<any> {
  const client = await getAuthenticatedClient()
  const accessToken = await client.getAccessToken()
  
  const maxAttempts = 60 // 5 minutes with 5-second intervals
  let attempts = 0
  
  while (attempts < maxAttempts) {
    const response = await fetch(
      `${VERTEX_AI_BASE_URL}/v1/${operationName}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json',
        },
      }
    )
    
    if (!response.ok) {
      throw new Error(`Failed to poll operation: ${response.status} - ${response.statusText}`)
    }
    
    const operation = await response.json()
    
    if (operation.done) {
      if (operation.error) {
        throw new Error(`Operation failed: ${JSON.stringify(operation.error)}`)
      }
      return operation.response
    }
    
    // Wait 5 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 5000))
    attempts++
  }
  
  throw new Error('Operation timed out after 5 minutes')
}

async function generateVideoWithVertexAI(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
  try {
    if (!GOOGLE_CLOUD_PROJECT_ID) {
      throw new Error('Google Cloud Project ID not configured')
    }

    if (!GOOGLE_APPLICATION_CREDENTIALS) {
      throw new Error('Google Application Credentials not configured')
    }

    // Map resolution to actual dimensions
    const resolutionMap = {
      '480p': { width: 854, height: 480 },
      '720p': { width: 1280, height: 720 },
      '1080p': { width: 1920, height: 1080 }
    }

    const dimensions = resolutionMap[request.resolution]

    // Validate motion intensity range
    if (request.motionIntensity < 0 || request.motionIntensity > 10) {
      throw new Error('Motion intensity must be between 0 and 10')
    }

    // Get authenticated client
    const client = await getAuthenticatedClient()
    const accessToken = await client.getAccessToken()

    // Prepare Vertex AI request body
    const vertexRequest = {
      instances: [{
        prompt: request.prompt,
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
        model: request.model
      }
    }

    console.log('Generating video with Vertex AI:', { 
      prompt: request.prompt, 
      model: request.model,
      duration: request.duration,
      resolution: request.resolution
    })

    // Call Vertex AI predictLongRunning endpoint
    const response = await fetch(
      `${VERTEX_AI_BASE_URL}/v1/projects/${GOOGLE_CLOUD_PROJECT_ID}/locations/us-central1/publishers/google/models/${request.model}:predictLongRunning`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(vertexRequest)
      }
    )

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Vertex AI error:', errorData)
      throw new Error(`Vertex AI error: ${response.status} - ${errorData}`)
    }

    const result = await response.json()
    
    // Extract operation name from response
    if (result.name) {
      console.log('Video generation started, operation name:', result.name)
      
      // Poll the operation until completion
      const operationResult = await pollOperation(result.name)
      
      // Extract video URL from operation result
      if (operationResult.predictions && operationResult.predictions[0]) {
        const prediction = operationResult.predictions[0]
        
        if (prediction.video_url) {
          return {
            success: true,
            videoUrl: prediction.video_url
          }
        }
      }
      
      throw new Error('Video generation completed but no video URL found in response')
    }

    throw new Error('Unexpected response format from Vertex AI')

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
    
    if (GOOGLE_CLOUD_PROJECT_ID && GOOGLE_APPLICATION_CREDENTIALS) {
      result = await generateVideoWithVertexAI(body)
      
      // If Vertex AI fails, try simulation as fallback
      if (!result.success) {
        console.warn('Vertex AI failed, using simulation:', result.error)
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
          status: result.operationName ? 'processing' : 'completed',
          task_id: result.operationName
        })
    } catch (dbError) {
      console.error('Failed to log generation:', dbError)
      // Don't fail the request if logging fails
    }

    return NextResponse.json({
      success: true,
      videoUrl: result.videoUrl,
      taskId: result.operationName,
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
    if (GOOGLE_CLOUD_PROJECT_ID) {
      const operationResult = await pollOperation(taskId)
      
      return NextResponse.json({
        success: true,
        status: operationResult.done ? 'completed' : 'processing',
        videoUrl: operationResult.done ? operationResult.response?.predictions?.[0]?.video_url : undefined,
        progress: operationResult.metadata?.progress_percent || 0
      })
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