import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { generateEmbedding } from '@/lib/openaiService'

// GET /api/social_media_interactions - Get social media interactions for authenticated user
export async function GET(req: NextRequest) {
  try {
    // Retrieve authenticated user's session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Extract filters from search params
    const { searchParams } = req.nextUrl
    const social_account_id = searchParams.get('social_account_id')
    const platform = searchParams.get('platform')
    const post_id = searchParams.get('post_id')
    const interaction_type = searchParams.get('interaction_type')
    const is_read = searchParams.get('is_read')

    // Build query
    let query = supabase
      .from('social_media_interactions')
      .select('*')
      .eq('user_id', user.id)
      .order('timestamp', { ascending: false })

    // Apply filters
    if (social_account_id) {
      query = query.eq('social_account_id', social_account_id)
    }
    if (platform) {
      query = query.eq('platform', platform)
    }
    if (post_id) {
      query = query.eq('post_id', post_id)
    }
    if (interaction_type) {
      query = query.eq('interaction_type', interaction_type)
    }
    if (is_read) {
      query = query.eq('is_read', is_read === 'true')
    }

    const { data: interactions, error } = await query

    if (error) {
      console.error('Error fetching social media interactions:', error)
      return NextResponse.json(
        { error: 'Failed to retrieve social media interactions' },
        { status: 500 }
      )
    }

    return NextResponse.json(interactions, { status: 200 })

  } catch (error) {
    console.error('Social media interactions fetch failed:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/social_media_interactions - Create new social media interaction
export async function POST(req: NextRequest) {
  try {
    // Retrieve authenticated user's session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await req.json()
    const {
      social_account_id,
      platform,
      interaction_type,
      sender_platform_id,
      post_id,
      sender_username,
      sender_name,
      message_content,
      interaction_platform_id,
      timestamp,
      is_read
    } = body

    // Validate required fields
    if (!social_account_id) {
      return NextResponse.json(
        { error: 'social_account_id is required' },
        { status: 400 }
      )
    }

    if (!platform) {
      return NextResponse.json(
        { error: 'platform is required' },
        { status: 400 }
      )
    }

    if (!interaction_type) {
      return NextResponse.json(
        { error: 'interaction_type is required' },
        { status: 400 }
      )
    }

    if (!sender_platform_id) {
      return NextResponse.json(
        { error: 'sender_platform_id is required' },
        { status: 400 }
      )
    }

    // Prepare insert data
    const insertData: any = {
      user_id: user.id,
      social_account_id,
      platform,
      interaction_type,
      sender_platform_id,
      post_id: post_id || null,
      sender_username: sender_username || null,
      sender_name: sender_name || null,
      message_content: message_content || null,
      interaction_platform_id: interaction_platform_id || null,
      is_read: is_read || false
    }

    // Add timestamp if provided
    if (timestamp) {
      insertData.timestamp = timestamp
    }

    // Generate embedding for message content if provided
    if (message_content) {
      try {
        const embedding = await generateEmbedding(message_content)
        insertData.embedding = embedding
      } catch (error) {
        console.error('Error generating embedding for message content:', error)
        // Continue with insertion even if embedding generation fails
        insertData.embedding = null
      }
    } else {
      insertData.embedding = null
    }

    // Insert new social media interaction
    const { data: interaction, error } = await supabase
      .from('social_media_interactions')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Error creating social media interaction:', error)
      return NextResponse.json(
        { error: 'Failed to create social media interaction' },
        { status: 500 }
      )
    }

    return NextResponse.json(interaction, { status: 201 })

  } catch (error) {
    console.error('Social media interaction creation failed:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/social_media_interactions - Update social media interaction
export async function PUT(req: NextRequest) {
  try {
    // Retrieve authenticated user's session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await req.json()
    const { id, message_content, is_read, sender_username, sender_name } = body

    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      )
    }

    // Prepare update data
    const updateData: any = {}
    if (message_content !== undefined) {
      updateData.message_content = message_content
      
      // Generate new embedding if message content is being updated
      if (message_content) {
        try {
          const embedding = await generateEmbedding(message_content)
          updateData.embedding = embedding
        } catch (error) {
          console.error('Error generating embedding for updated message content:', error)
          // Continue with update even if embedding generation fails
          updateData.embedding = null
        }
      } else {
        updateData.embedding = null
      }
    }
    if (is_read !== undefined) {
      updateData.is_read = is_read
    }
    if (sender_username !== undefined) {
      updateData.sender_username = sender_username
    }
    if (sender_name !== undefined) {
      updateData.sender_name = sender_name
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    // Update social media interaction
    const { data: interaction, error } = await supabase
      .from('social_media_interactions')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating social media interaction:', error)
      return NextResponse.json(
        { error: 'Failed to update social media interaction' },
        { status: 500 }
      )
    }

    if (!interaction) {
      return NextResponse.json(
        { error: 'Social media interaction not found or access denied' },
        { status: 404 }
      )
    }

    return NextResponse.json(interaction, { status: 200 })

  } catch (error) {
    console.error('Social media interaction update failed:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/social_media_interactions - Delete social media interaction
export async function DELETE(req: NextRequest) {
  try {
    // Retrieve authenticated user's session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Extract id from search params
    const { searchParams } = req.nextUrl
    const id = searchParams.get('id')

    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      )
    }

    // Delete social media interaction
    const { error } = await supabase
      .from('social_media_interactions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting social media interaction:', error)
      return NextResponse.json(
        { error: 'Failed to delete social media interaction' },
        { status: 500 }
      )
    }

    return new NextResponse(null, { status: 204 })

  } catch (error) {
    console.error('Social media interaction deletion failed:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 