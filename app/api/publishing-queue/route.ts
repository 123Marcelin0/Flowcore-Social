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

// GET /api/publishing-queue - Get all publishing queue items for authenticated user
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
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const start_date = searchParams.get('start_date')
    const end_date = searchParams.get('end_date')
    const limit = searchParams.get('limit')

    // Build query
    let query = supabase
      .from('publishing_queue')
      .select('*')
      .eq('user_id', user.id)
      .order('scheduled_at', { ascending: true })

    // Apply filters
    if (post_id) {
      query = query.eq('post_id', post_id)
    }
    if (platform) {
      query = query.eq('platform', platform)
    }
    if (status) {
      query = query.eq('status', status)
    }
    if (priority) {
      query = query.eq('priority', priority)
    }
    if (start_date) {
      query = query.gte('scheduled_at', start_date)
    }
    if (end_date) {
      query = query.lte('scheduled_at', end_date)
    }
    if (limit) {
      query = query.limit(parseInt(limit))
    }

    const { data: queueItems, error } = await query

    if (error) {
      console.error('Error fetching publishing queue:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to retrieve publishing queue' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: queueItems
    })

  } catch (error) {
    console.error('Publishing queue fetch failed:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/publishing-queue - Add new item to publishing queue
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
      scheduled_at, 
      status, 
      attempt_count, 
      max_attempts, 
      priority, 
      error_message, 
      external_post_id, 
      published_at, 
      next_retry_at, 
      metadata 
    } = body

    if (!post_id || !platform || !scheduled_at) {
      return NextResponse.json(
        { success: false, error: 'Post ID, platform, and scheduled time are required' },
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

    // Validate scheduled time is in the future
    const scheduledTime = new Date(scheduled_at)
    if (scheduledTime <= new Date()) {
      return NextResponse.json(
        { success: false, error: 'Scheduled time must be in the future' },
        { status: 400 }
      )
    }

    // Check for duplicate queue item
    const { data: existingItem } = await supabase
      .from('publishing_queue')
      .select('id')
      .eq('user_id', user.id)
      .eq('post_id', post_id)
      .eq('platform', platform)
      .eq('status', 'pending')
      .single()

    if (existingItem) {
      return NextResponse.json(
        { success: false, error: 'Post is already queued for this platform' },
        { status: 409 }
      )
    }

    // Create queue item
    const { data: queueItem, error } = await supabase
      .from('publishing_queue')
      .insert({
        user_id: user.id,
        post_id,
        platform,
        scheduled_at,
        status: status || 'pending',
        attempt_count: attempt_count || 0,
        max_attempts: max_attempts || 3,
        priority: priority || 5,
        error_message: error_message || null,
        external_post_id: external_post_id || null,
        published_at: published_at || null,
        next_retry_at: next_retry_at || null,
        metadata: metadata || {}
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating publishing queue item:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to add item to publishing queue' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: queueItem
    })

  } catch (error) {
    console.error('Publishing queue creation failed:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/publishing-queue - Update publishing queue item
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
        { success: false, error: 'Publishing queue item ID is required' },
        { status: 400 }
      )
    }

    // Remove any fields that shouldn't be updated
    const allowedFields = [
      'scheduled_at', 'status', 'attempt_count', 'max_attempts', 'priority', 
      'error_message', 'external_post_id', 'published_at', 'next_retry_at', 'metadata'
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

    // Update queue item
    const { data: queueItem, error } = await supabase
      .from('publishing_queue')
      .update(filteredData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating publishing queue item:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update publishing queue item' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: queueItem
    })

  } catch (error) {
    console.error('Publishing queue update failed:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/publishing-queue - Delete publishing queue item
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
        { success: false, error: 'Publishing queue item ID is required' },
        { status: 400 }
      )
    }

    // Delete queue item
    const { error } = await supabase
      .from('publishing_queue')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting publishing queue item:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to delete publishing queue item' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Publishing queue item deleted successfully'
    })

  } catch (error) {
    console.error('Publishing queue deletion failed:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 