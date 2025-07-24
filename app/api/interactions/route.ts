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

// GET /api/interactions - Get all interactions for authenticated user
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
    const interaction_type = searchParams.get('interaction_type')
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const sentiment = searchParams.get('sentiment')
    const limit = searchParams.get('limit')

    // Build query
    let query = supabase
      .from('interactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // Apply filters
    if (post_id) {
      query = query.eq('post_id', post_id)
    }
    if (platform) {
      query = query.eq('platform', platform)
    }
    if (interaction_type) {
      query = query.eq('interaction_type', interaction_type)
    }
    if (status) {
      query = query.eq('status', status)
    }
    if (priority) {
      query = query.eq('priority', priority)
    }
    if (sentiment) {
      query = query.eq('sentiment', sentiment)
    }
    if (limit) {
      query = query.limit(parseInt(limit))
    }

    const { data: interactions, error } = await query

    if (error) {
      console.error('Error fetching interactions:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to retrieve interactions' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: interactions
    })

  } catch (error) {
    console.error('Interactions fetch failed:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/interactions - Create new interaction
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
      interaction_type, 
      sender_name, 
      sender_username, 
      sender_avatar_url, 
      message, 
      ai_suggestion, 
      sentiment, 
      priority, 
      status, 
      replied_at, 
      external_interaction_id, 
      metadata 
    } = body

    if (!platform || !interaction_type || !sender_name || !sender_username || !message) {
      return NextResponse.json(
        { success: false, error: 'Platform, interaction type, sender name, sender username, and message are required' },
        { status: 400 }
      )
    }

    // Validate interaction type
    const validInteractionTypes = ['comment', 'dm', 'mention', 'reply', 'like']
    if (!validInteractionTypes.includes(interaction_type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid interaction type' },
        { status: 400 }
      )
    }

    // Verify post belongs to user if post_id is provided
    if (post_id) {
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
    }

    // Create interaction
    const { data: interaction, error } = await supabase
      .from('interactions')
      .insert({
        user_id: user.id,
        post_id: post_id || null,
        platform,
        interaction_type,
        sender_name,
        sender_username,
        sender_avatar_url: sender_avatar_url || null,
        message,
        ai_suggestion: ai_suggestion || null,
        sentiment: sentiment || 'neutral',
        priority: priority || 'medium',
        status: status || 'pending',
        replied_at: replied_at || null,
        external_interaction_id: external_interaction_id || null,
        metadata: metadata || {}
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating interaction:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to create interaction' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: interaction
    })

  } catch (error) {
    console.error('Interaction creation failed:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/interactions - Update interaction
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
        { success: false, error: 'Interaction ID is required' },
        { status: 400 }
      )
    }

    // Remove any fields that shouldn't be updated
    const allowedFields = [
      'sender_name', 'sender_username', 'sender_avatar_url', 'message', 'ai_suggestion', 
      'sentiment', 'priority', 'status', 'replied_at', 'external_interaction_id', 'metadata'
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

    // Update interaction
    const { data: interaction, error } = await supabase
      .from('interactions')
      .update(filteredData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating interaction:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update interaction' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: interaction
    })

  } catch (error) {
    console.error('Interaction update failed:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/interactions - Delete interaction
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
        { success: false, error: 'Interaction ID is required' },
        { status: 400 }
      )
    }

    // Delete interaction
    const { error } = await supabase
      .from('interactions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting interaction:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to delete interaction' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Interaction deleted successfully'
    })

  } catch (error) {
    console.error('Interaction deletion failed:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 