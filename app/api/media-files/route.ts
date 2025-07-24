import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

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

// GET /api/media-files - Get all media files for authenticated user
export async function GET(request: NextRequest) {
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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const file_type = searchParams.get('file_type')
    const processing_status = searchParams.get('processing_status')
    const optimization_status = searchParams.get('optimization_status')
    const limit = searchParams.get('limit')

    // Build query
    let query = supabase
      .from('media_files')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // Apply filters
    if (file_type) {
      query = query.eq('file_type', file_type)
    }
    if (processing_status) {
      query = query.eq('processing_status', processing_status)
    }
    if (optimization_status) {
      query = query.eq('optimization_status', optimization_status)
    }
    if (limit) {
      query = query.limit(parseInt(limit))
    }

    const { data: mediaFiles, error } = await query

    if (error) {
      console.error('Error fetching media files:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to retrieve media files' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: mediaFiles
    })

  } catch (error) {
    console.error('Media files fetch failed:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/media-files - Create new media file record
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
    const body = await request.json()

    // Validate required fields
    const { 
      filename, 
      original_filename, 
      file_path, 
      storage_url, 
      file_size, 
      mime_type, 
      file_type, 
      width, 
      height, 
      duration, 
      processing_status, 
      optimization_status, 
      thumbnail_url, 
      compressed_url, 
      alt_text, 
      metadata 
    } = body

    if (!filename || !original_filename || !file_path || !storage_url || !file_size || !mime_type || !file_type) {
      return NextResponse.json(
        { success: false, error: 'Filename, original filename, file path, storage URL, file size, mime type, and file type are required' },
        { status: 400 }
      )
    }

    // Validate file type
    const validFileTypes = ['image', 'video', 'audio', 'document']
    if (!validFileTypes.includes(file_type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type' },
        { status: 400 }
      )
    }

    // Create media file record
    const { data: mediaFile, error } = await supabase
      .from('media_files')
      .insert({
        user_id: user.id,
        filename,
        original_filename,
        file_path,
        storage_url,
        file_size,
        mime_type,
        file_type,
        width: width || null,
        height: height || null,
        duration: duration || null,
        processing_status: processing_status || 'pending',
        optimization_status: optimization_status || 'pending',
        thumbnail_url: thumbnail_url || null,
        compressed_url: compressed_url || null,
        alt_text: alt_text || null,
        metadata: metadata || {}
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating media file:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to create media file record' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: mediaFile
    })

  } catch (error) {
    console.error('Media file creation failed:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/media-files - Update media file record
export async function PUT(request: NextRequest) {
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
    const body = await request.json()

    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Media file ID is required' },
        { status: 400 }
      )
    }

    // Remove any fields that shouldn't be updated
    const allowedFields = [
      'filename', 'file_path', 'storage_url', 'width', 'height', 'duration', 
      'processing_status', 'optimization_status', 'thumbnail_url', 'compressed_url', 
      'alt_text', 'metadata'
    ]
    const filteredData: any = {}
    
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field]
      }
    }

    if (Object.keys(filteredData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    // Update media file record
    const { data: mediaFile, error } = await supabase
      .from('media_files')
      .update(filteredData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating media file:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update media file' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: mediaFile
    })

  } catch (error) {
    console.error('Media file update failed:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/media-files - Delete media file record
export async function DELETE(request: NextRequest) {
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
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Media file ID is required' },
        { status: 400 }
      )
    }

    // Delete media file record (Note: This doesn't delete the actual file from storage)
    const { error } = await supabase
      .from('media_files')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting media file:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to delete media file' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Media file record deleted successfully'
    })

  } catch (error) {
    console.error('Media file deletion failed:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 