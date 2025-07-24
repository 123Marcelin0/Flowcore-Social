import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const REIMAGINE_HOME_API_KEY = "686d8281f0bdbfed5cb8f049"
const REIMAGINE_HOME_BASE_URL = "https://api.reimaginehome.ai/api"

// Supabase client for authentication verification
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Add timeout for API calls
const API_TIMEOUT = 30000 // 30 seconds

// Rate limiting map (in production, use Redis or database)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW = 60000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10 // 10 requests per minute per user

// Helper function to check authentication
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

// Helper function to check rate limits
function checkRateLimit(userId: string): { allowed: boolean; remainingRequests: number } {
  const now = Date.now()
  const userLimit = rateLimitMap.get(userId)

  if (!userLimit || now > userLimit.resetTime) {
    // Reset or create new limit window
    rateLimitMap.set(userId, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    })
    return { allowed: true, remainingRequests: RATE_LIMIT_MAX_REQUESTS - 1 }
  }

  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remainingRequests: 0 }
  }

  userLimit.count++
  return { allowed: true, remainingRequests: RATE_LIMIT_MAX_REQUESTS - userLimit.count }
}

// Helper function to create fetch with timeout
async function fetchWithTimeout(url: string, options: RequestInit, timeout = API_TIMEOUT) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request)
    if (!authResult.authenticated) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const user = authResult.user!

    // Check rate limiting
    const rateLimit = checkRateLimit(user.id)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Rate limit exceeded. Please try again later.',
          remainingRequests: 0 
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': ((Date.now() + RATE_LIMIT_WINDOW) / 1000).toString()
          }
        }
      )
    }

    // Parse the incoming request
    const formData = await request.formData()
    const imageFile = formData.get('image') as File
    const style = formData.get('style') as string
    const roomType = formData.get('roomType') as string
    const lighting = formData.get('lighting') as string || 'soft_daylight'
    const flooring = formData.get('flooring') as string || 'hardwood'
    const furniture = formData.get('furniture') as string || 'modern'
    const customInstructions = formData.get('customInstructions') as string || ''

    // Validate required fields
    if (!imageFile) {
      return NextResponse.json(
        { success: false, error: 'Image file is required' },
        { status: 400 }
      )
    }

    if (!style || !roomType) {
      return NextResponse.json(
        { success: false, error: 'Style and room type are required' },
        { status: 400 }
      )
    }

    // Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(imageFile.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Only JPEG, PNG, and WebP are supported' },
        { status: 400 }
      )
    }

    // 10MB limit
    if (imageFile.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'File size must be less than 10MB' },
        { status: 400 }
      )
    }

    console.log(`Interior design transformation for user: ${user.id}`)
    console.log('Parameters:', { style, roomType, lighting, flooring, furniture })

    // Create FormData for the API request
    const apiFormData = new FormData()
    apiFormData.append('image_file', imageFile)
    apiFormData.append('style', mapStyleToReimaginehome(style))
    apiFormData.append('room_type', mapRoomTypeToReimaginehome(roomType))
    apiFormData.append('lighting', mapLightingToReimaginehome(lighting))
    apiFormData.append('flooring', mapFlooringToReimaginehome(flooring))
    apiFormData.append('furniture', mapFurnitureToReimaginehome(furniture))
    
    if (customInstructions) {
      apiFormData.append('custom_instructions', customInstructions)
    }

    // Make API request
    const response = await fetchWithTimeout(`${REIMAGINE_HOME_BASE_URL}/v1/interior-design`, {
      method: 'POST',
      headers: {
        'x-api-key': REIMAGINE_HOME_API_KEY,
        'Accept': 'application/json',
        'User-Agent': 'SocialMediaDashboard/1.0',
      },
      body: apiFormData
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('API request failed:', response.status, errorText)
      
      let errorMessage = 'API request failed'
      try {
        const errorData = JSON.parse(errorText)
        errorMessage = errorData.error || errorData.message || errorMessage
      } catch (e) {
        errorMessage = errorText || errorMessage
      }
      
      return NextResponse.json(
        { success: false, error: `Interior design service temporarily unavailable: ${errorMessage}` },
        { status: response.status }
      )
    }

    const result = await response.json()

    // Handle different response formats
    let resultImageUrl = null
    let orderId = null
    let processingTime = null

    if (result.result_url) {
      resultImageUrl = result.result_url
    } else if (result.image_url) {
      resultImageUrl = result.image_url
    } else if (result.images && result.images.length > 0) {
      resultImageUrl = result.images[0].url || result.images[0].result_url
    } else if (result.url) {
      resultImageUrl = result.url
    }

    orderId = result.order_id || result.id
    processingTime = result.processing_time || result.eta

    if (!resultImageUrl) {
      console.error('No result image URL in response:', result)
      return NextResponse.json(
        { success: false, error: 'No result image URL received from API' },
        { status: 500 }
      )
    }

    // Return the successful result with rate limit headers
    return NextResponse.json({ 
      success: true,
      imageUrl: resultImageUrl,
      order_id: orderId,
      processing_time: processingTime,
      message: 'Interior design transformation completed successfully'
    }, {
      headers: {
        'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
        'X-RateLimit-Remaining': rateLimit.remainingRequests.toString(),
      }
    })

  } catch (error) {
    console.error('Interior design transformation failed:', error)
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return NextResponse.json(
          { success: false, error: 'Request timed out. Please try again.' },
          { status: 408 }
        )
      }
      
      if (error.message.includes('fetch')) {
        return NextResponse.json(
          { success: false, error: 'Network error. Please check your internet connection and try again.' },
          { status: 503 }
        )
      }
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Interior design service temporarily unavailable. Please try again later.'
      },
      { status: 500 }
    )
  }
}

// Enhanced mapping functions with more comprehensive options
function mapStyleToReimaginehome(style: string): string {
  const styleMap: Record<string, string> = {
    // Modern styles
    'modern': 'modern',
    'contemporary': 'contemporary',
    'minimalist': 'minimalist',
    'midcentury': 'midcentury_modern',
    'mid-century': 'midcentury_modern',
    
    // Classic styles
    'traditional': 'traditional',
    'classic': 'traditional',
    'vintage': 'vintage',
    'antique': 'vintage',
    
    // Regional styles
    'scandinavian': 'scandinavian',
    'nordic': 'scandinavian',
    'japanese': 'japanese',
    'zen': 'japanese',
    'mediterranean': 'mediterranean',
    
    // Specific styles
    'industrial': 'industrial',
    'bohemian': 'bohemian',
    'boho': 'bohemian',
    'rustic': 'rustic',
    'farmhouse': 'farmhouse',
    'coastal': 'coastal',
    'transitional': 'transitional',
    'eclectic': 'eclectic',
    'luxury': 'luxury',
    'elegant': 'luxury'
  }
  
  const normalizedStyle = style.toLowerCase().trim()
  return styleMap[normalizedStyle] || 'modern'
}

function mapRoomTypeToReimaginehome(roomType: string): string {
  const roomMap: Record<string, string> = {
    // Living spaces
    'livingroom': 'living_room',
    'living_room': 'living_room',
    'living-room': 'living_room',
    'lounge': 'living_room',
    'family_room': 'living_room',
    'familyroom': 'living_room',
    
    // Kitchen areas
    'kitchen': 'kitchen',
    'kitchenette': 'kitchen',
    'dining_room': 'dining_room',
    'diningroom': 'dining_room',
    'dining-room': 'dining_room',
    
    // Bedrooms
    'bedroom': 'bedroom',
    'master_bedroom': 'bedroom',
    'guest_bedroom': 'bedroom',
    'kids_room': 'bedroom',
    'nursery': 'bedroom',
    
    // Bathrooms
    'bathroom': 'bathroom',
    'master_bathroom': 'bathroom',
    'guest_bathroom': 'bathroom',
    'powder_room': 'bathroom',
    
    // Work spaces
    'office': 'home_office',
    'home_office': 'home_office',
    'homeoffice': 'home_office',
    'study': 'home_office',
    'workspace': 'home_office',
    
    // Other spaces
    'hallway': 'hallway',
    'entryway': 'entryway',
    'foyer': 'entryway',
    'basement': 'basement',
    'attic': 'attic',
    'garage': 'garage'
  }
  
  const normalizedRoom = roomType.toLowerCase().trim()
  return roomMap[normalizedRoom] || 'living_room'
}

function mapLightingToReimaginehome(lighting: string): string {
  const lightingMap: Record<string, string> = {
    'soft_daylight': 'soft_daylight',
    'softdaylight': 'soft_daylight',
    'soft-daylight': 'soft_daylight',
    'natural': 'soft_daylight',
    
    'bright_natural': 'bright_natural',
    'brightnatural': 'bright_natural',
    'bright-natural': 'bright_natural',
    'bright': 'bright_natural',
    
    'warm_evening': 'warm_evening',
    'warmevening': 'warm_evening',
    'warm-evening': 'warm_evening',
    'warm': 'warm_evening',
    'cozy': 'warm_evening',
    
    'dramatic_accent': 'dramatic_accent',
    'dramaticaccent': 'dramatic_accent',
    'dramatic-accent': 'dramatic_accent',
    'dramatic': 'dramatic_accent',
    'accent': 'dramatic_accent',
    
    'soft_ambient': 'soft_ambient',
    'softambient': 'soft_ambient',
    'soft-ambient': 'soft_ambient',
    'ambient': 'soft_ambient',
    'subtle': 'soft_ambient'
  }
  
  const normalizedLighting = lighting.toLowerCase().trim()
  return lightingMap[normalizedLighting] || 'soft_daylight'
}

function mapFlooringToReimaginehome(flooring: string): string {
  const flooringMap: Record<string, string> = {
    'hardwood': 'hardwood',
    'wood': 'hardwood',
    'oak': 'oak',
    'pine': 'hardwood',
    'maple': 'hardwood',
    
    'marble': 'marble',
    'stone': 'marble',
    'granite': 'marble',
    
    'tile': 'modern_tile',
    'modern_tile': 'modern_tile',
    'moderntile': 'modern_tile',
    'modern-tile': 'modern_tile',
    'ceramic': 'modern_tile',
    'porcelain': 'modern_tile',
    
    'vinyl': 'luxury_vinyl',
    'luxury_vinyl': 'luxury_vinyl',
    'luxuryvinyl': 'luxury_vinyl',
    'luxury-vinyl': 'luxury_vinyl',
    'lvp': 'luxury_vinyl',
    
    'carpet': 'carpet',
    'rug': 'carpet',
    'carpeted': 'carpet',
    
    'laminate': 'hardwood',
    'bamboo': 'hardwood',
    'cork': 'hardwood'
  }
  
  const normalizedFlooring = flooring.toLowerCase().trim()
  return flooringMap[normalizedFlooring] || 'hardwood'
}

function mapFurnitureToReimaginehome(furniture: string): string {
  const furnitureMap: Record<string, string> = {
    'modern': 'modern',
    'contemporary': 'modern',
    
    'minimalist': 'minimalist',
    'minimal': 'minimalist',
    'clean': 'minimalist',
    'simple': 'minimalist',
    
    'luxury': 'luxury',
    'luxurious': 'luxury',
    'premium': 'luxury',
    'high-end': 'luxury',
    'upscale': 'luxury',
    
    'comfortable': 'comfortable',
    'cozy': 'comfortable',
    'relaxed': 'comfortable',
    'casual': 'comfortable',
    
    'professional': 'professional',
    'business': 'professional',
    'formal': 'professional',
    'corporate': 'professional',
    
    'elegant': 'elegant',
    'sophisticated': 'elegant',
    'refined': 'elegant',
    'classy': 'elegant',
    
    'traditional': 'traditional',
    'classic': 'traditional',
    'timeless': 'traditional'
  }
  
  const normalizedFurniture = furniture.toLowerCase().trim()
  return furnitureMap[normalizedFurniture] || 'modern'
} 