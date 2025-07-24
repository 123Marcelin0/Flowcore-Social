import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { generateEmbedding } from '@/lib/openaiService'

// GET /api/trends - Get trends for authenticated user
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

    // Extract category filter from search params
    const { searchParams } = req.nextUrl
    const category = searchParams.get('category')

    // Build query
    let query = supabase
      .from('trends')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // Apply category filter if provided
    if (category) {
      query = query.eq('category', category)
    }

    const { data: trends, error } = await query

    if (error) {
      console.error('Error fetching trends:', error)
      return NextResponse.json(
        { error: 'Failed to retrieve trends' },
        { status: 500 }
      )
    }

    return NextResponse.json(trends, { status: 200 })

  } catch (error) {
    console.error('Trends fetch failed:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/trends - Create new trend
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
    const { source_url, trend_title, trend_description, category } = body

    // Validate required fields
    if (!source_url) {
      return NextResponse.json(
        { error: 'source_url is required' },
        { status: 400 }
      )
    }

    if (!trend_title) {
      return NextResponse.json(
        { error: 'trend_title is required' },
        { status: 400 }
      )
    }

    if (!trend_description) {
      return NextResponse.json(
        { error: 'trend_description is required' },
        { status: 400 }
      )
    }

    // Generate embedding for trend_description
    let embedding: number[] | null = null
    if (trend_description) {
      try {
        embedding = await generateEmbedding(trend_description)
      } catch (error) {
        console.error('Error generating embedding:', error)
        // Continue with trend creation even if embedding fails
      }
    }

    // Insert new trend
    const { data: trend, error } = await supabase
      .from('trends')
      .insert({
        user_id: user.id,
        source_url,
        trend_title,
        trend_description,
        category: category || null,
        embedding
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating trend:', error)
      return NextResponse.json(
        { error: 'Failed to create trend' },
        { status: 500 }
      )
    }

    return NextResponse.json(trend, { status: 201 })

  } catch (error) {
    console.error('Trend creation failed:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/trends - Update trend
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
    const { id, source_url, trend_title, trend_description, category } = body

    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      )
    }

    // Prepare update data
    const updateData: any = {
      last_updated_at: new Date().toISOString()
    }

    if (source_url !== undefined) {
      updateData.source_url = source_url
    }
    if (trend_title !== undefined) {
      updateData.trend_title = trend_title
    }
    if (trend_description !== undefined) {
      updateData.trend_description = trend_description
      
      // Generate new embedding for updated trend_description
      if (trend_description) {
        try {
          const embedding = await generateEmbedding(trend_description)
          updateData.embedding = embedding
        } catch (error) {
          console.error('Error generating embedding for update:', error)
          // Continue with update even if embedding generation fails
          updateData.embedding = null
        }
      } else {
        // If trend_description is being cleared, clear the embedding too
        updateData.embedding = null
      }
    }
    if (category !== undefined) {
      updateData.category = category
    }

    // Remove last_updated_at from check since it's always updated
    const fieldsToUpdate = Object.keys(updateData).filter(key => key !== 'last_updated_at')
    if (fieldsToUpdate.length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    // Update trend
    const { data: trend, error } = await supabase
      .from('trends')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating trend:', error)
      return NextResponse.json(
        { error: 'Failed to update trend' },
        { status: 500 }
      )
    }

    if (!trend) {
      return NextResponse.json(
        { error: 'Trend not found or access denied' },
        { status: 404 }
      )
    }

    return NextResponse.json(trend, { status: 200 })

  } catch (error) {
    console.error('Trend update failed:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/trends - Delete trend
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

    // Delete trend
    const { error } = await supabase
      .from('trends')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting trend:', error)
      return NextResponse.json(
        { error: 'Failed to delete trend' },
        { status: 500 }
      )
    }

    return new NextResponse(null, { status: 204 })

  } catch (error) {
    console.error('Trend deletion failed:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 