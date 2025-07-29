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

interface InteriorDesignRequest {
  apiProvider: 'decor8ai' | 'aihomedesign'
  service: string
  roomType: string
  designStyle: string
  colorScheme?: string
  specialityDecor?: string
  numImages: number
  scaleFactor?: number
  matchStyling?: boolean
  seed?: number | null
  guidanceScale?: number
  designCreativity?: number
  wallColorHex?: string
  yardType?: string
  gardenStyle?: string
  skyType?: string
}

interface InteriorDesignResponse {
  success: boolean
  imageUrl?: string
  images?: string[]
  error?: string
  seed?: number
  taskId?: string
}

// Decor8AI API Configuration
const DECOR8AI_API_URL = 'https://api.decor8.ai'
const DECOR8AI_API_KEY = process.env.DECOR8AI_API_KEY

// AI HomeDesign API Configuration
const AIHOMEDESIGN_API_URL = 'https://api.aihomedesign.com/v1'
const AIHOMEDESIGN_API_KEY = process.env.AIHOMEDESIGN_API_KEY

// Upload image to external service and get URL
async function uploadImageToService(imageFile: File, apiProvider: string): Promise<string> {
  try {
    // Convert File to base64 for some services or upload directly
    const arrayBuffer = await imageFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString('base64')
    const dataUrl = `data:${imageFile.type};base64,${base64}`

    if (apiProvider === 'decor8ai') {
      // Decor8AI accepts data URLs directly
      return dataUrl
    } else {
      // AI HomeDesign requires actual file upload
      const formData = new FormData()
      formData.append('image', imageFile)

      const response = await fetch(`${AIHOMEDESIGN_API_URL}/order/image`, {
        method: 'POST',
        headers: {
          'x-api-key': AIHOMEDESIGN_API_KEY!
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Failed to upload image to AI HomeDesign: ${response.statusText}`)
      }

      const result = await response.json()
      return result.order_id // AI HomeDesign returns order_id for the uploaded image
    }
  } catch (error) {
    console.error('Image upload error:', error)
    throw new Error('Failed to upload image')
  }
}

// Process with Decor8AI API
async function processWithDecor8AI(imageUrl: string, settings: InteriorDesignRequest): Promise<InteriorDesignResponse> {
  try {
    if (!DECOR8AI_API_KEY) {
      throw new Error('Decor8AI API key not configured')
    }

    let endpoint = ''
    let requestBody: any = {
      input_image_url: imageUrl,
      num_images: settings.numImages || 1
    }

    // Set common parameters
    if (settings.seed) {
      requestBody.seed = settings.seed
    }
    if (settings.guidanceScale) {
      requestBody.guidance_scale = settings.guidanceScale
    }
    if (settings.designCreativity !== undefined) {
      requestBody.design_creativity = settings.designCreativity
    }

    switch (settings.service) {
      case 'virtual-staging':
      case 'interior-design':
        endpoint = '/generate_designs_for_room'
        requestBody = {
          ...requestBody,
          room_type: settings.roomType,
          design_style: settings.designStyle,
          color_scheme: settings.colorScheme || 'COLOR_SCHEME_0',
          speciality_decor: settings.specialityDecor || 'SPECIALITY_DECOR_0',
          scale_factor: settings.scaleFactor || 2
        }
        break

      case 'remove-objects':
        endpoint = '/remove_objects_from_room'
        requestBody = {
          input_image_url: imageUrl
        }
        break

      case 'change-wall-color':
        endpoint = '/change_wall_color'
        requestBody = {
          input_image_url: imageUrl,
          wall_color_hex_code: settings.wallColorHex || '#FFFFFF'
        }
        break

      case 'replace-sky':
        endpoint = '/replace_sky_behind_house'
        requestBody = {
          input_image_url: imageUrl,
          sky_type: settings.skyType || 'day'
        }
        break

      case 'landscaping':
        endpoint = '/generate_landscaping_designs'
        requestBody = {
          input_image_url: imageUrl,
          yard_type: settings.yardType || 'Front Yard',
          garden_style: settings.gardenStyle || 'Garden',
          num_images: settings.numImages || 1
        }
        break

      case 'prime-walls':
        endpoint = '/prime_walls_for_room'
        requestBody = {
          input_image_url: imageUrl
        }
        break

      default:
        throw new Error(`Unsupported Decor8AI service: ${settings.service}`)
    }

    console.log('Calling Decor8AI:', { endpoint, service: settings.service })

    const response = await fetch(`${DECOR8AI_API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DECOR8AI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Decor8AI API error:', errorData)
      throw new Error(`Decor8AI API error: ${response.status} - ${errorData}`)
    }

    const result = await response.json()

    if (result.error) {
      throw new Error(result.error)
    }

    // Extract image URLs from response
    let imageUrls: string[] = []
    if (result.info?.images) {
      imageUrls = result.info.images.map((img: any) => img.url)
    } else if (result.new_image_url) {
      imageUrls = [result.new_image_url]
    } else if (result.details?.primed_image_url) {
      imageUrls = [result.details.primed_image_url]
    }

    if (imageUrls.length === 0) {
      throw new Error('No images returned from Decor8AI')
    }

    return {
      success: true,
      imageUrl: imageUrls[0],
      images: imageUrls,
      seed: requestBody.seed
    }

  } catch (error) {
    console.error('Decor8AI processing error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Decor8AI processing failed'
    }
  }
}

// Process with AI HomeDesign API
async function processWithAIHomeDesign(orderId: string, settings: InteriorDesignRequest): Promise<InteriorDesignResponse> {
  try {
    if (!AIHOMEDESIGN_API_KEY) {
      throw new Error('AI HomeDesign API key not configured')
    }

    // First, get spaces and widgets for the service
    const spacesResponse = await fetch(`${AIHOMEDESIGN_API_URL}/catalog/spaces`, {
      headers: {
        'x-api-key': AIHOMEDESIGN_API_KEY
      }
    })

    const spacesData = await spacesResponse.json()
    
    // Find the appropriate service and space
    let serviceName = ''
    let spaceName = ''

    switch (settings.service) {
      case 'virtual-staging':
        serviceName = 'service-ai-virtual-staging'
        break
      case 'interior-design':
        serviceName = 'service-creative-designer'
        break
      case 'image-enhancement':
        serviceName = 'service-ai-image-enhancement'
        break
      case 'day-to-dusk':
        serviceName = 'service-ai-day-to-dusk'
        break
      case 'item-removal':
        serviceName = 'service-item-removal'
        break
      default:
        throw new Error(`Unsupported AI HomeDesign service: ${settings.service}`)
    }

    // Find space name
    const serviceSpaces = spacesData.find((s: any) => s.service_name === serviceName)
    if (serviceSpaces?.spaces?.length > 0) {
      // Try to match room type, fallback to first available
      spaceName = serviceSpaces.spaces.find((s: any) => 
        s.space_name.toLowerCase().includes(settings.roomType.toLowerCase())
      )?.space_name || serviceSpaces.spaces[0].space_name
    }

    let requestBody: any = {
      order_id: orderId
    }

    // Add space name if required
    if (spaceName) {
      requestBody.space_name = spaceName
    }

    // Get widgets and items if needed
    if (settings.service !== 'item-removal') {
      const widgetsResponse = await fetch(`${AIHOMEDESIGN_API_URL}/catalog/items/filter?service_name=${serviceName}`, {
        headers: {
          'x-api-key': AIHOMEDESIGN_API_KEY
        }
      })

      const widgetsData = await widgetsResponse.json()
      const selectedWidgets: any[] = []

      // Add style widget if available
      const styleWidget = widgetsData.find((w: any) => w.widget_name.toLowerCase().includes('style'))
      if (styleWidget?.items?.length > 0) {
        const styleItem = styleWidget.items.find((item: any) => 
          item.item_name.toLowerCase().includes(settings.designStyle.toLowerCase())
        ) || styleWidget.items[0]

        selectedWidgets.push({
          id: styleWidget.widget_id,
          item_id: styleItem.item_id
        })
      }

      // Add color widget if available (for interior design)
      if (settings.service === 'interior-design') {
        const colorWidget = widgetsData.find((w: any) => w.widget_name.toLowerCase().includes('color'))
        if (colorWidget?.items?.length > 0) {
          selectedWidgets.push({
            id: colorWidget.widget_id,
            item_id: colorWidget.items[0].item_id
          })
        }
      }

      if (selectedWidgets.length > 0) {
        requestBody.selected_widgets = selectedWidgets
      }
    }

    console.log('Calling AI HomeDesign:', { serviceName, requestBody })

    const response = await fetch(`${AIHOMEDESIGN_API_URL}/order`, {
      method: 'POST',
      headers: {
        'x-api-key': AIHOMEDESIGN_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('AI HomeDesign API error:', errorData)
      throw new Error(`AI HomeDesign API error: ${response.status} - ${errorData}`)
    }

    const result = await response.json()

    if (result.error) {
      throw new Error(result.error)
    }

    // For AI HomeDesign, we need to wait for webhook or poll for results
    // For now, return task ID for async processing
    return {
      success: true,
      taskId: result.order_id,
      imageUrl: 'https://via.placeholder.com/512x512?text=Processing...' // Placeholder while processing
    }

  } catch (error) {
    console.error('AI HomeDesign processing error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'AI HomeDesign processing failed'
    }
  }
}

// Simulate processing for development/fallback
async function simulateInteriorProcessing(settings: InteriorDesignRequest): Promise<InteriorDesignResponse> {
  console.log('Simulating interior design processing:', settings)
  
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 3000))
  
  // Return mock image URL based on service
  const mockImages = {
    'virtual-staging': 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=512&h=512&fit=crop',
    'interior-design': 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=512&h=512&fit=crop',
    'remove-objects': 'https://images.unsplash.com/photo-1560185007-5f0bb1866cab?w=512&h=512&fit=crop',
    'change-wall-color': 'https://images.unsplash.com/photo-1588471980401-6d0a1a1de0b0?w=512&h=512&fit=crop',
    'replace-sky': 'https://images.unsplash.com/photo-1591367334295-e4585c128071?w=512&h=512&fit=crop',
    'landscaping': 'https://images.unsplash.com/photo-1558618666-7bd1c4a05c83?w=512&h=512&fit=crop'
  }

  const mockImageUrl = mockImages[settings.service as keyof typeof mockImages] || mockImages['virtual-staging']
  
  return {
    success: true,
    imageUrl: mockImageUrl,
    images: [mockImageUrl],
    seed: settings.seed || Date.now()
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse form data
    const formData = await request.formData()
    const imageFile = formData.get('image') as File
    const settingsString = formData.get('settings') as string

    if (!imageFile) {
      return NextResponse.json(
        { success: false, error: 'Image file is required' },
        { status: 400 }
      )
    }

    if (!settingsString) {
      return NextResponse.json(
        { success: false, error: 'Settings are required' },
        { status: 400 }
      )
    }

    const settings: InteriorDesignRequest = JSON.parse(settingsString)

    // Validate file type and size
    if (!imageFile.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: 'File must be an image' },
        { status: 400 }
      )
    }

    if (imageFile.size > 4 * 1024 * 1024) { // 4MB limit
      return NextResponse.json(
        { success: false, error: 'Image file too large (max 4MB)' },
        { status: 400 }
      )
    }

    console.log('Interior design request:', {
      apiProvider: settings.apiProvider,
      service: settings.service,
      roomType: settings.roomType,
      designStyle: settings.designStyle,
      fileName: imageFile.name
    })

    let result: InteriorDesignResponse

    // Check if APIs are configured and in production
    const hasDecor8AI = DECOR8AI_API_KEY && process.env.NODE_ENV === 'production'
    const hasAIHomeDesign = AIHOMEDESIGN_API_KEY && process.env.NODE_ENV === 'production'

    if (settings.apiProvider === 'decor8ai' && hasDecor8AI) {
      const imageUrl = await uploadImageToService(imageFile, 'decor8ai')
      result = await processWithDecor8AI(imageUrl, settings)
    } else if (settings.apiProvider === 'aihomedesign' && hasAIHomeDesign) {
      const orderId = await uploadImageToService(imageFile, 'aihomedesign')
      result = await processWithAIHomeDesign(orderId, settings)
    } else {
      console.log('Using simulation (development mode or missing API keys)')
      result = await simulateInteriorProcessing(settings)
    }

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Interior design processing failed' },
        { status: 500 }
      )
    }

    // Log successful processing
    try {
      await supabase
        .from('content_generations')
        .insert({
          user_id: 'system', // TODO: Extract from auth
          type: 'interior',
          prompt: `${settings.service} for ${settings.roomType} in ${settings.designStyle} style`,
          settings: settings,
          result_url: result.imageUrl,
          status: result.taskId ? 'processing' : 'completed',
          task_id: result.taskId
        })
    } catch (dbError) {
      console.error('Failed to log generation:', dbError)
      // Don't fail the request if logging fails
    }

    return NextResponse.json({
      success: true,
      imageUrl: result.imageUrl,
      images: result.images,
      seed: result.seed,
      taskId: result.taskId
    })

  } catch (error) {
    console.error('Interior design API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

// GET endpoint to check processing status (for async processing)
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const taskId = url.searchParams.get('taskId')
    const apiProvider = url.searchParams.get('apiProvider') || 'decor8ai'

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: 'Task ID is required' },
        { status: 400 }
      )
    }

    // Check task status with respective API
    if (apiProvider === 'aihomedesign' && AIHOMEDESIGN_API_KEY) {
      const response = await fetch(`${AIHOMEDESIGN_API_URL}/order/${taskId}`, {
        headers: {
          'x-api-key': AIHOMEDESIGN_API_KEY
        }
      })

      if (response.ok) {
        const result = await response.json()
        
        return NextResponse.json({
          success: true,
          status: result.status === 'completed' ? 'completed' : 'processing',
          imageUrl: result.result_url,
          progress: result.status === 'completed' ? 100 : 50
        })
      }
    }

    // Fallback for simulation
    return NextResponse.json({
      success: true,
      status: 'completed',
      imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=512&h=512&fit=crop',
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