import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase clients
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Authentication helper
async function verifyAuth(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return { authenticated: false, user: null, error: 'Missing or invalid authorization header' }
    }

    const token = authHeader.substring(7)
    const { data: { user }, error } = await supabaseClient.auth.getUser(token)
    
    if (error || !user) {
      return { authenticated: false, user: null, error: 'Invalid token or user not found' }
    }

    return { authenticated: true, user, error: null }
  } catch (error) {
    return { authenticated: false, user: null, error: 'Authentication verification failed' }
  }
}

// Helper to get video duration using ffprobe (if available)
async function getVideoDuration(file: File): Promise<number | null> {
  try {
    // Create a video element to get duration
    return new Promise((resolve) => {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.onloadedmetadata = () => {
        resolve(video.duration)
      }
      video.onerror = () => {
        resolve(null)
      }
      // This won't work server-side, but it's a placeholder for now
      resolve(null)
    })
  } catch {
    return null
  }
}

// Helper to get image dimensions
async function getImageDimensions(file: File): Promise<{ width: number, height: number } | null> {
  try {
    // This would need to be implemented with a proper image processing library
    // For now, return null and let the client handle it
    return null
  } catch {
    return null
  }
}

// POST /api/media-upload - Upload files to storage and create database records
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Media upload request received')
    
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

    // Parse FormData
    const formData = await request.formData()
    const file = formData.get('file') as File
    const fileType = formData.get('fileType') as string

    console.log('📄 Upload details:', {
      filename: file?.name,
      size: file?.size,
      type: file?.type,
      fileType
    })

    if (!file) {
      console.error('❌ No file provided')
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!fileType) {
      console.error('❌ No file type provided')
      return NextResponse.json(
        { success: false, error: 'File type is required' },
        { status: 400 }
      )
    }

    // Validate file size (100MB limit)
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 100MB limit' },
        { status: 400 }
      )
    }

    // Validate file type
    const validFileTypes = ['image', 'video', 'audio']
    if (!validFileTypes.includes(fileType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Supported types: image, video, audio' },
        { status: 400 }
      )
    }

    // Validate MIME type
    const allowedMimeTypes = {
      image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      video: ['video/mp4', 'video/mov', 'video/avi', 'video/webm'],
      audio: ['audio/mp3', 'audio/wav', 'audio/ogg']
    }

    if (!allowedMimeTypes[fileType as keyof typeof allowedMimeTypes]?.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: `Invalid MIME type for ${fileType}` },
        { status: 400 }
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 15)
    const fileExtension = file.name.split('.').pop()
    const filename = `${user.id}/${fileType}s/${timestamp}-${randomId}.${fileExtension}`

    console.log(`📤 Uploading file for user ${user.id}: ${filename}`)

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('media-files')
      .upload(filename, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('❌ Storage upload error:', uploadError)
      return NextResponse.json(
        { 
          success: false, 
          error: 'File upload failed', 
          details: uploadError.message,
          suggestion: 'Check if the media-files bucket exists and is configured properly'
        },
        { status: 500 }
      )
    }

    console.log('✅ File uploaded to storage successfully')

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('media-files')
      .getPublicUrl(filename)

    console.log('🔗 Generated public URL:', publicUrl)

    // Get file dimensions/duration (basic implementation)
    let width = null
    let height = null
    let duration = null
    let thumbnailUrl = null

    if (fileType === 'image') {
      // For images, use the original URL as thumbnail
      thumbnailUrl = publicUrl
    } else if (fileType === 'video') {
      // For videos, we'll generate a thumbnail later
      // For now, leave as null and let the frontend handle it
    }

    // Create database record
    const mediaFileData = {
      user_id: user.id,
      filename: `${timestamp}-${randomId}.${fileExtension}`,
      original_filename: file.name,
      file_path: filename,
      storage_url: publicUrl,
      file_size: file.size,
      mime_type: file.type,
      file_type: fileType,
      width,
      height,
      duration,
      processing_status: 'completed',
      optimization_status: 'pending',
      thumbnail_url: thumbnailUrl,
      compressed_url: null,
      alt_text: null,
      metadata: {
        uploaded_at: new Date().toISOString(),
        upload_method: 'direct'
      }
    }

    const { data: mediaFile, error: dbError } = await supabase
      .from('media_files')
      .insert(mediaFileData)
      .select()
      .single()

    if (dbError) {
      console.error('❌ Database error:', dbError)
      
      // Clean up uploaded file if database insertion fails
      try {
        await supabase.storage
          .from('media-files')
          .remove([filename])
        console.log('🧹 Cleaned up uploaded file after database error')
      } catch (cleanupError) {
        console.error('Failed to cleanup uploaded file:', cleanupError)
      }

      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to create media file record',
          details: dbError.message,
          suggestion: 'Check if the media_files table exists and RLS policies are set correctly'
        },
        { status: 500 }
      )
    }

    console.log(`✅ Successfully uploaded and created record for: ${filename}`)

    return NextResponse.json({
      success: true,
      data: {
        ...mediaFile,
        // Ensure public URL is included for Shotstack compatibility
        public_url: publicUrl,
        is_public: true
      },
      message: 'File uploaded successfully'
    })

  } catch (error) {
    console.error('💥 Media upload failed:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        suggestion: 'Check server logs for more details'
      },
      { status: 500 }
    )
  }
}