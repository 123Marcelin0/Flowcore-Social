import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { generateEmbedding } from '@/lib/openaiService'

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

// GET /api/content-ideas - Get all content ideas for authenticated user
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
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const category = searchParams.get('category')
    const is_saved = searchParams.get('is_saved')
    const limit = searchParams.get('limit')

    // Build query
    let query = supabase
      .from('content_ideas')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }
    if (priority) {
      query = query.eq('priority', priority)
    }
    if (category) {
      query = query.eq('category', category)
    }
    if (is_saved !== null) {
      query = query.eq('is_saved', is_saved === 'true')
    }
    if (limit) {
      query = query.limit(parseInt(limit))
    }

    const { data: ideas, error } = await query

    if (error) {
      console.error('Error fetching content ideas:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to retrieve content ideas' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: ideas
    })

  } catch (error) {
    console.error('Content ideas fetch failed:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/content-ideas - Create new content idea
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
    const { title, description, content_type, platforms, tags, category, priority, status, due_date, notes, is_saved, metadata } = body

    if (!title || !description || !content_type) {
      return NextResponse.json(
        { success: false, error: 'Title, description, and content type are required' },
        { status: 400 }
      )
    }

    // Validate content type
    const validContentTypes = ['video', 'image', 'text', 'reel', 'story', 'carousel']
    if (!validContentTypes.includes(content_type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid content type' },
        { status: 400 }
      )
    }

    // Generate embedding for the description
    const embedding = await generateEmbedding(description)

    // Create content idea
    const { data: idea, error } = await supabase
      .from('content_ideas')
      .insert({
        user_id: user.id,
        title,
        description,
        embedding: embedding, // Store the embedding
        content_type,
        platforms: platforms || [],
        tags: tags || [],
        category: category || null,
        priority: priority || 'medium',
        status: status || 'idea',
        due_date: due_date || null,
        notes: notes || null,
        is_saved: is_saved || false,
        metadata: metadata || {}
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating content idea:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to create content idea' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: idea
    })

  } catch (error) {
    console.error('Content idea creation failed:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/content-ideas - Update content idea
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
        { success: false, error: 'Content idea ID is required' },
        { status: 400 }
      )
    }

    // Remove any fields that shouldn't be updated
    const allowedFields = ['title', 'description', 'content_type', 'platforms', 'tags', 'category', 'priority', 'status', 'due_date', 'notes', 'is_saved', 'metadata', 'embedding']
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

    // Generate embedding for the description if it's being updated
    if (filteredData.description !== undefined) {
      filteredData.embedding = await generateEmbedding(filteredData.description)
    }

    // Update content idea
    const { data: idea, error } = await supabase
      .from('content_ideas')
      .update(filteredData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating content idea:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update content idea' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: idea
    })

  } catch (error) {
    console.error('Content idea update failed:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/content-ideas - Delete content idea
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
        { success: false, error: 'Content idea ID is required' },
        { status: 400 }
      )
    }

    // Delete content idea
    const { error } = await supabase
      .from('content_ideas')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting content idea:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to delete content idea' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Content idea deleted successfully'
    })

  } catch (error) {
    console.error('Content idea deletion failed:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 