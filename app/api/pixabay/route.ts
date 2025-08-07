import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { PixabayService } from '@/lib/pixabay-service'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Authentication helper
async function verifyAuth(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return { authenticated: false, user: null, error: 'Missing or invalid authorization header' }
    }

    const token = authHeader.substring(7)
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      return { authenticated: false, user: null, error: 'Invalid token or user not found' }
    }

    return { authenticated: true, user, error: null }
  } catch (error) {
    return { authenticated: false, user: null, error: 'Authentication verification failed' }
  }
}

// Initialize Pixabay service
function getPixabayService(): PixabayService {
  const apiKey = process.env.PIXABAY_API_KEY
  if (!apiKey) {
    throw new Error('PIXABAY_API_KEY environment variable is not set')
  }
  
  return new PixabayService({ apiKey })
}

// GET /api/pixabay - Search Pixabay for images and videos
export async function GET(request: NextRequest) {
  try {
    console.log('🖼️ Pixabay search request received')
    
    // Verify authentication
    const authResult = await verifyAuth(request)
    if (!authResult.authenticated) {
      console.error('❌ Authentication failed:', authResult.error)
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const user = authResult.user!
    console.log(`✅ User authenticated: ${user.id}`)

    // Get search parameters
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const type = searchParams.get('type') || 'all' // 'images', 'videos', 'audio', 'all'
    const page = parseInt(searchParams.get('page') || '1')
    const perPage = parseInt(searchParams.get('perPage') || '20')
    const order = searchParams.get('order') || 'popular'
    const category = searchParams.get('category') || undefined
    const minWidth = searchParams.get('minWidth') ? parseInt(searchParams.get('minWidth')!) : undefined
    const minHeight = searchParams.get('minHeight') ? parseInt(searchParams.get('minHeight')!) : undefined

    console.log('🖼️ Pixabay search details:', {
      query,
      type,
      page,
      perPage,
      order,
      category,
      minWidth,
      minHeight
    })

    // Initialize Pixabay service
    const pixabayService = getPixabayService()

    let results: any = {}

    if (type === 'images' || type === 'all') {
      console.log('🖼️ Searching for images...')
      const imageResults = await pixabayService.searchImages(query, {
        page,
        perPage,
        order: order as 'popular' | 'latest',
        category,
        minWidth,
        minHeight
      })
      results.images = imageResults
    }

    if (type === 'videos' || type === 'all') {
      console.log('🎥 Searching for videos...')
      const videoResults = await pixabayService.searchVideos(query, {
        page,
        perPage,
        order: order as 'popular' | 'latest',
        category,
        minWidth,
        minHeight
      })
      results.videos = videoResults
    }

    if (type === 'audio' || type === 'all') {
      console.log('🎵 Searching for audio...')
      const audioResults = await pixabayService.searchAudio(query, {
        page,
        perPage,
        order: order as 'popular' | 'latest',
        category
      })
      results.audio = audioResults
    }

    console.log('✅ Pixabay search completed successfully')

    return NextResponse.json({
      success: true,
      data: results,
      message: 'Pixabay search completed successfully'
    })

  } catch (error) {
    console.error('💥 Pixabay search failed:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Pixabay search failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST /api/pixabay - Download and save media to user's library
export async function POST(request: NextRequest) {
  try {
    console.log('📥 Pixabay download request received')
    
    // Verify authentication
    const authResult = await verifyAuth(request)
    if (!authResult.authenticated) {
      console.error('❌ Authentication failed:', authResult.error)
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const user = authResult.user!
    console.log(`✅ User authenticated: ${user.id}`)

    // Parse request body
    const body = await request.json()
    const { 
      mediaId, 
      mediaType, // 'image', 'video', or 'audio'
      size = 'large' // 'preview', 'webformat', 'large', 'fullHD', 'original' for images; 'tiny', 'small', 'medium', 'large' for videos
    } = body

    if (!mediaId || !mediaType) {
      return NextResponse.json(
        { success: false, error: 'Media ID and type are required' },
        { status: 400 }
      )
    }

    console.log('📥 Pixabay download details:', {
      mediaId,
      mediaType,
      size
    })

    // Initialize Pixabay service
    const pixabayService = getPixabayService()

    let mediaData: any
    let downloadUrl: string
    let filename: string

    if (mediaType === 'image') {
      // Get image data
      mediaData = await pixabayService.getImageById(mediaId)
      if (!mediaData) {
        return NextResponse.json(
          { success: false, error: 'Image not found' },
          { status: 404 }
        )
      }

      // Get download URL
      downloadUrl = pixabayService.getImageDownloadUrl(mediaData, size as any)
      filename = `pixabay-image-${mediaId}-${size}.jpg`
    } else if (mediaType === 'video') {
      // Get video data
      mediaData = await pixabayService.getVideoById(mediaId)
      if (!mediaData) {
        return NextResponse.json(
          { success: false, error: 'Video not found' },
          { status: 404 }
        )
      }

      // Get download URL
      downloadUrl = pixabayService.getVideoDownloadUrl(mediaData, size as any)
      filename = `pixabay-video-${mediaId}-${size}.mp4`
    } else if (mediaType === 'audio') {
      // Get audio data
      mediaData = await pixabayService.getAudioById(mediaId)
      if (!mediaData) {
        return NextResponse.json(
          { success: false, error: 'Audio not found' },
          { status: 404 }
        )
      }

      // Get download URL
      downloadUrl = pixabayService.getAudioDownloadUrl(mediaData)
      filename = `pixabay-audio-${mediaId}.mp3`
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid media type' },
        { status: 400 }
      )
    }

    // Download the media file
    console.log('📥 Downloading media from:', downloadUrl)
    const response = await fetch(downloadUrl)
    
    if (!response.ok) {
      throw new Error(`Failed to download media: ${response.status} ${response.statusText}`)
    }

    const buffer = await response.arrayBuffer()
    const file = new File([buffer], filename, {
      type: mediaType === 'image' ? 'image/jpeg' : mediaType === 'video' ? 'video/mp4' : 'audio/mpeg'
    })

    // Upload to Supabase Storage
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 15)
    const fileExtension = mediaType === 'image' ? 'jpg' : mediaType === 'video' ? 'mp4' : 'mp3'
    const storagePath = `${user.id}/${mediaType}s/pixabay-${timestamp}-${randomId}.${fileExtension}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('media-files')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('❌ Storage upload error:', uploadError)
      return NextResponse.json(
        { success: false, error: 'Failed to upload media to storage' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('media-files')
      .getPublicUrl(storagePath)

    // Create database record
    const mediaFileData = {
      user_id: user.id,
      filename: `pixabay-${timestamp}-${randomId}.${fileExtension}`,
      original_filename: filename,
      file_path: storagePath,
      storage_url: publicUrl,
      file_size: file.size,
      mime_type: file.type,
      file_type: mediaType,
      width: mediaType === 'image' ? mediaData.imageWidth : mediaType === 'video' ? pixabayService.getVideoDimensions(mediaData, size as any).width : null,
      height: mediaType === 'image' ? mediaData.imageHeight : mediaType === 'video' ? pixabayService.getVideoDimensions(mediaData, size as any).height : null,
      duration: mediaType === 'video' ? pixabayService.getVideoDuration(mediaData) : mediaType === 'audio' ? pixabayService.getAudioDuration(mediaData) : null,
      processing_status: 'completed',
      optimization_status: 'completed',
      thumbnail_url: mediaType === 'image' ? mediaData.previewURL : mediaType === 'audio' ? mediaData.previewURL : null,
      compressed_url: null,
      alt_text: mediaData.tags,
      metadata: {
        source: 'pixabay',
        pixabay_id: mediaId,
        pixabay_user: mediaData.user,
        pixabay_page_url: mediaData.pageURL,
        downloaded_at: new Date().toISOString(),
        size: size
      }
    }

    const { data: dbResult, error: dbError } = await supabase
      .from('media_files')
      .insert(mediaFileData)
      .select()
      .single()

    if (dbError) {
      console.error('❌ Database error:', dbError)
      return NextResponse.json(
        { success: false, error: 'Failed to save media record' },
        { status: 500 }
      )
    }

    console.log('✅ Pixabay media downloaded and saved successfully')

    return NextResponse.json({
      success: true,
      data: {
        mediaFile: dbResult,
        pixabayData: {
          id: mediaData.id,
          user: mediaData.user,
          tags: mediaData.tags,
          views: mediaData.views,
          downloads: mediaData.downloads,
          likes: mediaData.likes
        }
      },
      message: 'Media downloaded and saved to your library successfully'
    })

  } catch (error) {
    console.error('💥 Pixabay download failed:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Pixabay download failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 