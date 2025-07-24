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

// Utility function to normalize hashtag
function normalizeHashtag(tag: string): string {
  return tag.toLowerCase().replace(/[^a-z0-9]/g, '')
}

// GET /api/hashtags - Get hashtags (public read access)
export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const is_trending = searchParams.get('is_trending')
    const category = searchParams.get('category')
    const limit = searchParams.get('limit')
    const sort_by = searchParams.get('sort_by') || 'usage_count'

    // Build query
    let query = supabase
      .from('hashtags')
      .select('*')

    // Apply filters
    if (search) {
      query = query.or(`tag.ilike.%${search}%,normalized_tag.ilike.%${search}%`)
    }
    if (is_trending !== null) {
      query = query.eq('is_trending', is_trending === 'true')
    }
    if (category) {
      query = query.eq('category', category)
    }

    // Apply sorting
    if (sort_by === 'usage_count') {
      query = query.order('usage_count', { ascending: false })
    } else if (sort_by === 'trending_score') {
      query = query.order('trending_score', { ascending: false })
    } else if (sort_by === 'last_used') {
      query = query.order('last_used_at', { ascending: false })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    if (limit) {
      query = query.limit(parseInt(limit))
    }

    const { data: hashtags, error } = await query

    if (error) {
      console.error('Error fetching hashtags:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to retrieve hashtags' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: hashtags
    })

  } catch (error) {
    console.error('Hashtags fetch failed:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/hashtags - Create new hashtag (requires authentication)
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

    const body = await request.json()

    // Validate required fields
    const { tag, category, usage_count, trending_score, is_trending } = body

    if (!tag) {
      return NextResponse.json(
        { success: false, error: 'Tag is required' },
        { status: 400 }
      )
    }

    // Normalize tag
    const normalizedTag = normalizeHashtag(tag)

    // Check if hashtag already exists
    const { data: existingHashtag } = await supabase
      .from('hashtags')
      .select('id')
      .eq('normalized_tag', normalizedTag)
      .single()

    if (existingHashtag) {
      return NextResponse.json(
        { success: false, error: 'Hashtag already exists' },
        { status: 409 }
      )
    }

    // Create hashtag
    const { data: hashtag, error } = await supabase
      .from('hashtags')
      .insert({
        tag: tag.startsWith('#') ? tag : `#${tag}`,
        normalized_tag: normalizedTag,
        category: category || null,
        usage_count: usage_count || 0,
        trending_score: trending_score || 0,
        is_trending: is_trending || false,
        last_used_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating hashtag:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to create hashtag' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: hashtag
    })

  } catch (error) {
    console.error('Hashtag creation failed:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/hashtags - Update hashtag (requires authentication)
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

    const body = await request.json()

    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Hashtag ID is required' },
        { status: 400 }
      )
    }

    // Remove any fields that shouldn't be updated
    const allowedFields = [
      'tag', 'category', 'usage_count', 'trending_score', 'is_trending', 'last_used_at'
    ]
    const filteredData: any = {}
    
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field]
      }
    }

    // Update normalized_tag if tag is being updated
    if (filteredData.tag) {
      filteredData.normalized_tag = normalizeHashtag(filteredData.tag)
    }

    if (Object.keys(filteredData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    // Update hashtag
    const { data: hashtag, error } = await supabase
      .from('hashtags')
      .update(filteredData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating hashtag:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update hashtag' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: hashtag
    })

  } catch (error) {
    console.error('Hashtag update failed:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/hashtags - Delete hashtag (requires authentication)
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

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Hashtag ID is required' },
        { status: 400 }
      )
    }

    // Delete hashtag
    const { error } = await supabase
      .from('hashtags')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting hashtag:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to delete hashtag' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Hashtag deleted successfully'
    })

  } catch (error) {
    console.error('Hashtag deletion failed:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 