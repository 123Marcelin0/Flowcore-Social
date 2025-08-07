import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

// POST /api/generate-thumbnail - Generate thumbnail for a media file
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Thumbnail generation request received')
    
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
    const { mediaId, mediaUrl, fileType } = body

    if (!mediaId || !mediaUrl || !fileType) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: mediaId, mediaUrl, fileType' },
        { status: 400 }
      )
    }

    console.log('📄 Thumbnail generation details:', {
      mediaId,
      mediaUrl,
      fileType
    })

    let thumbnailUrl = null

    if (fileType === 'image') {
      // For images, we can use the original URL as thumbnail
      // In a production environment, you might want to resize the image
      thumbnailUrl = mediaUrl
    } else if (fileType === 'video') {
      // For videos, we'll generate a thumbnail using a video processing service
      // For now, we'll use a placeholder approach
      // In production, you could use FFmpeg or a cloud service
      
      // Generate a unique thumbnail filename
      const timestamp = Date.now()
      const randomId = Math.random().toString(36).substring(2, 15)
      const thumbnailFilename = `${user.id}/thumbnails/${timestamp}-${randomId}.jpg`
      
      // For now, we'll create a simple colored thumbnail as placeholder
      // In production, you'd extract a frame from the video
      const canvas = new OffscreenCanvas(320, 180)
      const ctx = canvas.getContext('2d')
      
      if (ctx) {
        // Create a gradient background
        const gradient = ctx.createLinearGradient(0, 0, 320, 180)
        gradient.addColorStop(0, '#ff6b35')
        gradient.addColorStop(1, '#f7931e')
        
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, 320, 180)
        
        // Add video icon
        ctx.fillStyle = 'white'
        ctx.font = '48px Arial'
        ctx.textAlign = 'center'
        ctx.fillText('▶', 160, 110)
        
        // Convert to blob
        const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.8 })
        
        // Upload to storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('media-files')
          .upload(thumbnailFilename, blob, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) {
          console.error('❌ Thumbnail upload error:', uploadError)
          return NextResponse.json(
            { success: false, error: 'Failed to upload thumbnail' },
            { status: 500 }
          )
        }

        // Get public URL for thumbnail
        const { data: { publicUrl } } = supabase.storage
          .from('media-files')
          .getPublicUrl(thumbnailFilename)

        thumbnailUrl = publicUrl
      }
    }

    if (!thumbnailUrl) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate thumbnail' },
        { status: 500 }
      )
    }

    // Update the media file record with the thumbnail URL
    const { data: updateData, error: updateError } = await supabase
      .from('media_files')
      .update({ thumbnail_url: thumbnailUrl })
      .eq('id', mediaId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('❌ Database update error:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update media file with thumbnail' },
        { status: 500 }
      )
    }

    console.log(`✅ Successfully generated and saved thumbnail for: ${mediaId}`)

    return NextResponse.json({
      success: true,
      data: {
        thumbnail_url: thumbnailUrl,
        media_id: mediaId
      },
      message: 'Thumbnail generated successfully'
    })

  } catch (error) {
    console.error('💥 Thumbnail generation failed:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 