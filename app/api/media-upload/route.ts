import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase'
import { handleError } from '@/lib/error-handler'

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
    console.log('🔍 Starting auth verification...')
    
    // Accept token from Authorization, x-supabase-auth, or Supabase cookies
    const hdr = (name: string) => {
      try {
        return request.headers.get(name)
      } catch (e) {
        console.error('Failed to get header:', name, e)
        return null
      }
    }
    
    const authHeader = hdr('authorization') || hdr('Authorization') || hdr('x-supabase-auth') || ''
    let token = ''
    
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    } else if (authHeader.length > 20) {
      token = authHeader
    }
    
    console.log('🔍 Header token check:', { hasAuthHeader: !!authHeader, tokenFromHeader: !!token })
    
    if (!token) {
      try {
        const jar = cookies()
        token = jar.get('sb-access-token')?.value || jar.get('sb:token')?.value || ''
        console.log('🔍 Cookie token check:', { tokenFromCookies: !!token })
      } catch (cookieError) {
        console.error('Failed to read cookies:', cookieError)
        // Continue without token - will be handled below
      }
    }
    
    console.log('🔍 Final token check:', { hasToken: !!token, tokenLength: token.length })
    
    if (!token) {
      return { authenticated: false, user: null, error: 'Missing access token' }
    }

    // Use admin client for server-side token validation if available
    console.log('🔍 Using auth client:', { hasAdmin: !!supabaseAdmin, hasClient: !!supabaseClient })
    const authClient = supabaseAdmin || supabaseClient
    
    if (!authClient) {
      console.error('No Supabase client available!')
      return { authenticated: false, user: null, error: 'Supabase client not available' }
    }
    
    const { data: { user }, error } = await authClient.auth.getUser(token)
    console.log('🔍 Auth validation result:', { error: error?.message, hasUser: !!user, userId: user?.id })
    
    if (error || !user) {
      return { authenticated: false, user: null, error: 'Invalid token or user not found' }
    }

    return { authenticated: true, user, error: null }
  } catch (error) {
    console.error('🔥 Auth verification exception:', error)
    return { authenticated: false, user: null, error: `Authentication verification failed: ${error instanceof Error ? error.message : 'Unknown error'}` }
  }
}

// Helper to get video duration using ffprobe (if available)
async function getVideoDuration(file: File): Promise<number | null> {
  try {
    // Server-side video duration detection would require FFmpeg
    // For now, return null and let client-side handle duration detection
    return null
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
  console.log('🔄 Media upload request received')
  
  try {
    console.log('🔄 Inside POST handler')
    
    // Check Supabase configuration first
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing Supabase configuration')
      return handleError(
        new Error('Supabase configuration missing'),
        'SUPABASE_CONFIG_MISSING',
        500,
        { 
          suggestion: 'Check that NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are set',
          details: {
            hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
          }
        }
      )
    }
    
    // Verify authentication
    let authResult: any
    try {
      authResult = await verifyAuth(request)
      console.log('🔍 Auth result:', { authenticated: authResult.authenticated, hasUser: !!authResult.user })
    } catch (authError: any) {
      console.error('❌ Auth verification exception:', authError)
      return handleError(
        authError,
        'AUTH_VERIFICATION_FAILED',
        500,
        { suggestion: 'Check authentication configuration' }
      )
    }
    
    if (!authResult.authenticated) {
      console.error('❌ Authentication failed:', authResult.error)
      return handleError(
        new Error('Authentication required for file upload'),
        'AUTHENTICATION_REQUIRED',
        401,
        { 
          suggestion: 'Please log in to upload files',
          details: { reason: authResult.error }
        }
      )
    }

    const user = authResult.user!
    console.log(`✅ User authenticated: ${user.id}`)

    // Parse FormData with error handling
    let formData: FormData
    try {
      formData = await request.formData()
    } catch (formError: any) {
      return handleError(
        formError,
        'FORM_DATA_PARSE_ERROR',
        400,
        { suggestion: 'Ensure file is properly attached to form data' }
      )
    }
    
    const file = formData.get('file') as File
    const fileType = formData.get('fileType') as string
    
    if (!file) {
      return handleError(
        new Error('No file provided in upload'),
        'MISSING_FILE',
        400,
        { suggestion: 'Select a file to upload' }
      )
    }

    console.log('📄 Upload details:', {
      filename: file?.name,
      size: file?.size,
      type: file?.type,
      fileType,
      sizeMB: Math.round(file?.size / 1024 / 1024)
    })

    // Check file size (50MB limit for Supabase free tier)
    const maxSize = 50 * 1024 * 1024 // 50MB in bytes
    if (file.size > maxSize) {
      return handleError(
        new Error(`File size ${Math.round(file.size/1024/1024)}MB exceeds 50MB limit`),
        'FILE_SIZE_EXCEEDED',
        413,
        { 
          suggestion: 'Please compress your video or use a smaller file',
          details: {
            fileSize: `${Math.round(file.size/1024/1024)}MB`,
            maxSize: '50MB'
          }
        }
      )
    }

    if (!fileType) {
      return handleError(
        new Error('File type is required'),
        'MISSING_FILE_TYPE',
        400,
        { suggestion: 'Specify fileType as image, video, or audio' }
      )
    }

    // File size already validated above (50MB limit)

    // Validate file type
    const validFileTypes = ['image', 'video', 'audio']
    if (!validFileTypes.includes(fileType)) {
      return handleError(
        new Error('Invalid file type'),
        'INVALID_FILE_TYPE',
        400,
        { 
          suggestion: 'Use one of the supported file types',
          details: {
            provided: fileType,
            allowed: validFileTypes
          }
        }
      )
    }

    // Validate MIME type
    const allowedMimeTypes = {
      image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      video: ['video/mp4', 'video/mov', 'video/avi', 'video/webm'],
      audio: ['audio/mp3', 'audio/wav', 'audio/ogg']
    }

    if (!allowedMimeTypes[fileType as keyof typeof allowedMimeTypes]?.includes(file.type)) {
      return handleError(
        new Error(`Invalid MIME type for ${fileType}`),
        'INVALID_MIME_TYPE',
        400,
        { 
          suggestion: 'Use a supported file format',
          details: {
            provided: file.type,
            allowed: allowedMimeTypes[fileType as keyof typeof allowedMimeTypes]
          }
        }
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
      
      // Provide specific error handling for common Supabase storage issues
      let userMessage = 'File upload failed'
      let suggestion = 'Please try again'
      
      if (uploadError.message?.includes('Bucket not found')) {
        userMessage = 'Storage bucket configuration error'
        suggestion = 'Contact administrator - storage bucket needs to be configured'
      } else if (uploadError.message?.includes('Unauthorized')) {
        userMessage = 'Storage access denied'
        suggestion = 'Check storage permissions and authentication'
      } else if (uploadError.message?.includes('File size')) {
        userMessage = 'File too large for upload'
        suggestion = 'Use a smaller file or compress your video'
      }
      
      return handleError(
        new Error(userMessage),
        'STORAGE_UPLOAD_FAILED',
        500,
        { 
          suggestion,
          details: {
            originalError: uploadError.message,
            errorCode: uploadError.statusCode || uploadError.code
          }
        }
      )
    }

    console.log('✅ File uploaded to storage successfully')

    // Get public URL and ensure it is reachable; fallback to signed URL if bucket is private
    const { data: { publicUrl } } = supabase.storage
      .from('media-files')
      .getPublicUrl(filename)

    let finalUrl = publicUrl
    let urlType: 'public' | 'signed' = 'public'
    let signedExpiresAt: string | null = null

    try {
      console.log('🔍 Testing public URL accessibility:', publicUrl)
      
      // Create timeout controller manually for Node.js compatibility
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      
      const head = await fetch(publicUrl, { 
        method: 'HEAD',
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      if (!head.ok) {
        throw new Error(`HTTP ${head.status}: ${head.statusText}`)
      }
      console.log('✅ Public URL reachable')
    } catch (e) {
      console.log('ℹ️ Public URL not reachable, creating signed URL instead:', String(e))
      try {
        const expiresIn = 60 * 60 * 24 * 7 // 7 days (max for Supabase signed URLs)
        const { data: signed, error: signErr } = await supabase.storage
          .from('media-files')
          .createSignedUrl(filename, expiresIn)
        
        if (signErr || !signed?.signedUrl) {
          console.error('❌ Failed to create signed URL:', signErr?.message)
          return handleError(
            new Error('Failed to create accessible URL for file'),
            'SIGNED_URL_FAILED',
            500,
            { suggestion: 'Check Supabase storage configuration and permissions' }
          )
        }
        
        finalUrl = signed.signedUrl
        urlType = 'signed'
        signedExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()
        console.log('🔐 Using signed URL for file access')
      } catch (signedUrlError) {
        console.error('❌ Critical error in signed URL creation:', signedUrlError)
        return handleError(
          new Error('Failed to create any accessible URL for file'),
          'URL_CREATION_FAILED',
          500,
          { suggestion: 'Check Supabase storage configuration and try again' }
        )
      }
    }

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

    // Create database record (matching actual database schema)
    const mediaFileData = {
      user_id: user.id,
      filename: `${timestamp}-${randomId}.${fileExtension}`,
      original_filename: file.name,
      file_path: filename, // Direct column as required by DB
      storage_url: finalUrl,
      file_size: file.size,
      mime_type: file.type,
      file_type: fileType,
      width,
      height,
      duration,
      thumbnail_url: thumbnailUrl,
      alt_text: null,
      metadata: {
        uploaded_at: new Date().toISOString(),
        upload_method: 'direct',
        source_url_type: urlType,
        source_url_expires_at: signedExpiresAt
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
      
      // Provide specific error handling for common database issues
      let userMessage = 'Failed to create media file record'
      let suggestion = 'Please try again'
      
      if (dbError.code === '42P01') {
        userMessage = 'Database table not found'
        suggestion = 'Contact administrator - database schema needs to be set up'
      } else if (dbError.code === '23505') {
        userMessage = 'File with this name already exists'
        suggestion = 'Try renaming your file or wait a moment and try again'
      } else if (dbError.message?.includes('RLS')) {
        userMessage = 'Database access denied'
        suggestion = 'Contact administrator - database permissions need to be configured'
      } else if (dbError.message?.includes('violates')) {
        userMessage = 'File information violates database constraints'
        suggestion = 'Check that your file name and type are valid'
      }

      return handleError(
        new Error(userMessage),
        'DATABASE_INSERT_FAILED',
        500,
        { 
          suggestion,
          details: {
            originalError: dbError.message,
            errorCode: dbError.code,
            table: 'media_files'
          }
        }
      )
    }

    console.log(`✅ Successfully uploaded and created record for: ${filename}`)

    const successResponse = NextResponse.json({
      success: true,
      data: {
        ...mediaFile,
        // Ensure public URL is included for Shotstack compatibility
        public_url: finalUrl,
        is_public: urlType === 'public',
        is_signed_url: urlType === 'signed',
        signed_expires_at: signedExpiresAt
      },
      message: 'File uploaded successfully'
    })

    console.log('🎉 Returning success response')
    return successResponse

  } catch (error: any) {
    console.error('❌ Unexpected error in media upload:', error)
    return handleError(
      error,
      'UNEXPECTED_ERROR',
      500,
      { suggestion: 'Please try again or contact support if the issue persists' }
    )
  }
}