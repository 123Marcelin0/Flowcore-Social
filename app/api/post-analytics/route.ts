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

// GET /api/post-analytics - Get all post analytics for authenticated user
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
    const post_id = searchParams.get('post_id')
    const platform = searchParams.get('platform')
    const start_date = searchParams.get('start_date')
    const end_date = searchParams.get('end_date')
    const limit = searchParams.get('limit')

    // Build query
    let query = supabase
      .from('post_analytics')
      .select('*')
      .eq('user_id', user.id)
      .order('recorded_at', { ascending: false })

    // Apply filters
    if (post_id) {
      query = query.eq('post_id', post_id)
    }
    if (platform) {
      query = query.eq('platform', platform)
    }
    if (start_date) {
      query = query.gte('recorded_at', start_date)
    }
    if (end_date) {
      query = query.lte('recorded_at', end_date)
    }
    if (limit) {
      query = query.limit(parseInt(limit))
    }

    const { data: analytics, error } = await query

    if (error) {
      console.error('Error fetching post analytics:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to retrieve post analytics' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: analytics
    })

  } catch (error) {
    console.error('Post analytics fetch failed:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/post-analytics - Create new post analytics record
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
      post_id, 
      platform, 
      external_post_id, 
      impressions, 
      reach, 
      engagement, 
      likes, 
      comments, 
      shares, 
      saves, 
      clicks, 
      video_views, 
      profile_visits, 
      website_clicks, 
      engagement_rate, 
      recorded_at 
    } = body

    if (!post_id || !platform) {
      return NextResponse.json(
        { success: false, error: 'Post ID and platform are required' },
        { status: 400 }
      )
    }

    // Verify post belongs to user
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id')
      .eq('id', post_id)
      .eq('user_id', user.id)
      .single()

    if (postError || !post) {
      return NextResponse.json(
        { success: false, error: 'Post not found or access denied' },
        { status: 404 }
      )
    }

    // Create post analytics record
    const { data: analytics, error } = await supabase
      .from('post_analytics')
      .insert({
        post_id,
        user_id: user.id,
        platform,
        external_post_id: external_post_id || null,
        impressions: impressions || 0,
        reach: reach || 0,
        engagement: engagement || 0,
        likes: likes || 0,
        comments: comments || 0,
        shares: shares || 0,
        saves: saves || 0,
        clicks: clicks || 0,
        video_views: video_views || 0,
        profile_visits: profile_visits || 0,
        website_clicks: website_clicks || 0,
        engagement_rate: engagement_rate || 0,
        recorded_at: recorded_at || new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating post analytics:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to create post analytics' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: analytics
    })

  } catch (error) {
    console.error('Post analytics creation failed:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/post-analytics - Update post analytics record
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
        { success: false, error: 'Analytics record ID is required' },
        { status: 400 }
      )
    }

    // Remove any fields that shouldn't be updated
    const allowedFields = [
      'external_post_id', 'impressions', 'reach', 'engagement', 'likes', 'comments', 
      'shares', 'saves', 'clicks', 'video_views', 'profile_visits', 'website_clicks', 
      'engagement_rate', 'recorded_at'
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

    // Update post analytics record
    const { data: analytics, error } = await supabase
      .from('post_analytics')
      .update(filteredData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating post analytics:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update post analytics' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: analytics
    })

  } catch (error) {
    console.error('Post analytics update failed:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/post-analytics - Delete post analytics record
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
        { success: false, error: 'Analytics record ID is required' },
        { status: 400 }
      )
    }

    // Delete post analytics record
    const { error } = await supabase
      .from('post_analytics')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting post analytics:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to delete post analytics' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Post analytics record deleted successfully'
    })

  } catch (error) {
    console.error('Post analytics deletion failed:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 