import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { generateEmbedding } from '@/lib/openaiService'

// GET /api/chat_interactions - Get chat interactions for authenticated user
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

    // Extract conversation_id from search params
    const { searchParams } = req.nextUrl
    const conversation_id = searchParams.get('conversation_id')

    // Build query
    let query = supabase
      .from('interactions')
      .select('*')
      .eq('user_id', user.id)
      .order('timestamp', { ascending: true })

    // Apply conversation_id filter if provided
    if (conversation_id) {
      query = query.eq('conversation_id', conversation_id)
    }

    const { data: interactions, error } = await query

    if (error) {
      console.error('Error fetching chat interactions:', error)
      return NextResponse.json(
        { error: 'Failed to retrieve chat interactions' },
        { status: 500 }
      )
    }

    return NextResponse.json(interactions, { status: 200 })

  } catch (error) {
    console.error('Chat interactions fetch failed:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/chat_interactions - Create new chat interaction
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
    const { conversation_id, role, message_content } = body

    // Validate required fields
    if (!conversation_id) {
      return NextResponse.json(
        { error: 'conversation_id is required' },
        { status: 400 }
      )
    }

    if (!role) {
      return NextResponse.json(
        { error: 'role is required' },
        { status: 400 }
      )
    }

    if (!message_content) {
      return NextResponse.json(
        { error: 'message_content is required' },
        { status: 400 }
      )
    }

    // Generate embedding for message_content
    let embedding: number[] | null = null
    if (message_content) {
      try {
        embedding = await generateEmbedding(message_content)
      } catch (error) {
        console.error('Error generating embedding:', error)
        // Continue with interaction creation even if embedding fails
      }
    }

    // Insert new chat interaction
    const { data: interaction, error } = await supabase
      .from('interactions')
      .insert({
        user_id: user.id,
        conversation_id,
        role,
        message_content,
        embedding
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating chat interaction:', error)
      return NextResponse.json(
        { error: 'Failed to create chat interaction' },
        { status: 500 }
      )
    }

    return NextResponse.json(interaction, { status: 201 })

  } catch (error) {
    console.error('Chat interaction creation failed:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/chat_interactions - Update chat interaction
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
    const { id, message_content } = body

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
      
      // Generate new embedding for updated message_content
      if (message_content) {
        try {
          const embedding = await generateEmbedding(message_content)
          updateData.embedding = embedding
        } catch (error) {
          console.error('Error generating embedding for update:', error)
          // Continue with update even if embedding generation fails
          updateData.embedding = null
        }
      } else {
        // If message_content is being cleared, clear the embedding too
        updateData.embedding = null
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    // Update chat interaction
    const { data: interaction, error } = await supabase
      .from('interactions')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating chat interaction:', error)
      return NextResponse.json(
        { error: 'Failed to update chat interaction' },
        { status: 500 }
      )
    }

    if (!interaction) {
      return NextResponse.json(
        { error: 'Chat interaction not found or access denied' },
        { status: 404 }
      )
    }

    return NextResponse.json(interaction, { status: 200 })

  } catch (error) {
    console.error('Chat interaction update failed:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/chat_interactions - Delete chat interaction
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

    // Delete chat interaction
    const { error } = await supabase
      .from('interactions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting chat interaction:', error)
      return NextResponse.json(
        { error: 'Failed to delete chat interaction' },
        { status: 500 }
      )
    }

    return new NextResponse(null, { status: 204 })

  } catch (error) {
    console.error('Chat interaction deletion failed:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 