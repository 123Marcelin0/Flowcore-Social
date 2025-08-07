import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

// Validate required environment variables
function validateEnvironmentVariables() {
  const requiredVars = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  }

  const missingVars = Object.entries(requiredVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key)

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}. ` +
      'Please check your .env.local file and ensure all required variables are set.'
    )
  }
}

// Initialize environment variables validation
let supabase: ReturnType<typeof createClient>

try {
  validateEnvironmentVariables()
  
  // Initialize Supabase client
  supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
} catch (error) {
  console.error('Environment validation failed:', error)
  // Create a mock client for development that will fail gracefully
  supabase = createClient('http://localhost:54321', 'mock-key', {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface ImageGenerationRequest {
  prompt: string
  model: 'dall-e-2' | 'dall-e-3'
  size: '256x256' | '512x512' | '1024x1024' | '1024x1792' | '1792x1024'
  quality: 'standard' | 'hd'
  style: 'vivid' | 'natural'
  count: number
}

interface ImageGenerationResponse {
  success: boolean
  imageUrl?: string
  images?: string[]
  error?: string
}

// Generate image using OpenAI DALL-E
async function generateImageWithDALLE(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
  try {
    // Validate model-specific constraints
    if (request.model === 'dall-e-3') {
      // DALL-E 3 constraints
      if (!['1024x1024', '1024x1792', '1792x1024'].includes(request.size)) {
        throw new Error('DALL-E 3 only supports 1024x1024, 1024x1792, or 1792x1024 sizes')
      }
      if (request.count > 1) {
        throw new Error('DALL-E 3 only supports generating 1 image at a time')
      }
    } else {
      // DALL-E 2 constraints
      if (!['256x256', '512x512', '1024x1024'].includes(request.size)) {
        throw new Error('DALL-E 2 only supports 256x256, 512x512, or 1024x1024 sizes')
      }
      if (request.count > 10) {
        throw new Error('DALL-E 2 supports maximum 10 images per request')
      }
    }

    console.log('Generating image with DALL-E:', {
      prompt: request.prompt,
      model: request.model,
      size: request.size,
      quality: request.quality,
      style: request.style
    })

    // Prepare OpenAI request
    const openaiRequest: any = {
      model: request.model,
      prompt: request.prompt,
      n: request.count,
      size: request.size as any,
      response_format: 'url'
    }

    // Add DALL-E 3 specific parameters
    if (request.model === 'dall-e-3') {
      openaiRequest.quality = request.quality
      openaiRequest.style = request.style
    }

    // Generate image
    const response = await openai.images.generate(openaiRequest)

    if (!response.data || response.data.length === 0) {
      throw new Error('No images generated')
    }

    const imageUrls = response.data.map(img => img.url).filter(Boolean) as string[]

    if (imageUrls.length === 0) {
      throw new Error('Failed to get image URLs')
    }

    return {
      success: true,
      imageUrl: imageUrls[0], // Return first image for single generation
      images: imageUrls // Return all images for batch generation
    }

  } catch (error) {
    console.error('Image generation error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Image generation failed'
    }
  }
}

// Simulate image generation for development/fallback
async function simulateImageGeneration(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
  console.log('Simulating image generation:', request)
  
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // Return mock image URL (placeholder)
  const mockImageUrl = `https://picsum.photos/${request.size.replace('x', '/')}?random=${Date.now()}`
  
  return {
    success: true,
    imageUrl: mockImageUrl,
    images: [mockImageUrl]
  }
}

// POST endpoint for image generation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ImageGenerationRequest

    // Validate required fields
    if (!body.prompt?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      )
    }

    // Set defaults
    const imageRequest: ImageGenerationRequest = {
      prompt: body.prompt.trim(),
      model: body.model || 'dall-e-3',
      size: body.size || '1024x1024',
      quality: body.quality || 'standard',
      style: body.style || 'vivid',
      count: body.count || 1
    }

    // Validate count
    const maxCount = imageRequest.model === 'dall-e-3' ? 1 : 10
    if (imageRequest.count < 1 || imageRequest.count > maxCount) {
      return NextResponse.json(
        { success: false, error: `Count must be between 1 and ${maxCount} for ${imageRequest.model}` },
        { status: 400 }
      )
    }

    console.log('Image generation request:', {
      prompt: imageRequest.prompt,
      model: imageRequest.model,
      size: imageRequest.size,
      quality: imageRequest.quality
    })

    // Try OpenAI DALL-E first, fallback to simulation
    let result: ImageGenerationResponse
    
    if (process.env.OPENAI_API_KEY) {
      result = await generateImageWithDALLE(imageRequest)
      
      // If DALL-E fails, try simulation as fallback
      if (!result.success) {
        console.warn('DALL-E API failed, using simulation:', result.error)
        result = await simulateImageGeneration(imageRequest)
      }
    } else {
      console.log('Using image simulation (missing API key)')
      result = await simulateImageGeneration(imageRequest)
    }

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Image generation failed' },
        { status: 500 }
      )
    }

    // Log successful generation
    try {
      // Check if Supabase is properly configured before attempting database operations
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const { error: dbError } = await supabase
          .from('content_generations')
          .insert({
            user_id: 'system', // TODO: Extract from auth
            type: 'image',
            prompt: imageRequest.prompt,
            model: imageRequest.model,
            size: imageRequest.size,
            status: 'completed'
          })
        
        if (dbError) {
          console.error('Failed to log generation to database:', dbError)
        }
      } else {
        console.warn('Skipping database logging - Supabase not properly configured')
      }
    } catch (dbError) {
      console.error('Failed to log generation:', dbError)
      // Don't fail the request if logging fails
    }

    return NextResponse.json({
      success: true,
      imageUrl: result.imageUrl,
      images: result.images
    })

  } catch (error) {
    console.error('Image generation API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve generation history
export async function GET(request: NextRequest) {
  try {
    // Check if Supabase is properly configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Database not configured. Please check environment variables.' 
        },
        { status: 503 }
      )
    }

    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '10')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    // Validate pagination parameters
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        { success: false, error: 'Invalid limit parameter (must be 1-100)' },
        { status: 400 }
      )
    }
    if (isNaN(offset) || offset < 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid offset parameter (must be >= 0)' },
        { status: 400 }
      )
    }

    // Fetch recent image generations
    const { data: generations, error } = await supabase
      .from('content_generations')
      .select('*')
      .eq('type', 'image')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Database query error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch history from database' },
        { status: 500 }
      )
    }

    // Get total count
    const { count: totalCount } = await supabase
      .from('content_generations')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'image')

    return NextResponse.json({
      success: true,
      generations: generations || [],
      total: totalCount || 0,
      limit,
      offset
    })

  } catch (error) {
    console.error('History fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch history' },
      { status: 500 }
    )
  }
} 