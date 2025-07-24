import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/insights - Get insights for authenticated user
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
    const metric_type = searchParams.get('metric_type')
    const post_id = searchParams.get('post_id')
    const start_date = searchParams.get('start_date')
    const end_date = searchParams.get('end_date')

    // Build query
    let query = supabase
      .from('insights')
      .select('*')
      .eq('user_id', user.id)
      .order('insight_date', { ascending: false })

    // Apply filters
    if (social_account_id) {
      query = query.eq('social_account_id', social_account_id)
    }
    if (metric_type) {
      query = query.eq('metric_type', metric_type)
    }
    if (post_id) {
      query = query.eq('post_id', post_id)
    }
    if (start_date) {
      query = query.gte('insight_date', start_date)
    }
    if (end_date) {
      query = query.lte('insight_date', end_date)
    }

    const { data: insights, error } = await query

    if (error) {
      console.error('Error fetching insights:', error)
      return NextResponse.json(
        { error: 'Failed to retrieve insights' },
        { status: 500 }
      )
    }

    return NextResponse.json(insights, { status: 200 })

  } catch (error) {
    console.error('Insights fetch failed:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/insights - Create new insight
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
    const { social_account_id, insight_date, metric_type, metric_value, post_id } = body

    // Validate required fields
    if (!social_account_id) {
      return NextResponse.json(
        { error: 'social_account_id is required' },
        { status: 400 }
      )
    }

    if (!insight_date) {
      return NextResponse.json(
        { error: 'insight_date is required' },
        { status: 400 }
      )
    }

    if (!metric_type) {
      return NextResponse.json(
        { error: 'metric_type is required' },
        { status: 400 }
      )
    }

    if (metric_value === undefined || metric_value === null) {
      return NextResponse.json(
        { error: 'metric_value is required' },
        { status: 400 }
      )
    }

    // Validate metric_value is a number
    if (typeof metric_value !== 'number' && isNaN(Number(metric_value))) {
      return NextResponse.json(
        { error: 'metric_value must be a number' },
        { status: 400 }
      )
    }

    // Insert new insight
    const { data: insight, error } = await supabase
      .from('insights')
      .insert({
        user_id: user.id,
        social_account_id,
        insight_date,
        metric_type,
        metric_value: Number(metric_value),
        post_id: post_id || null
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating insight:', error)
      return NextResponse.json(
        { error: 'Failed to create insight' },
        { status: 500 }
      )
    }

    return NextResponse.json(insight, { status: 201 })

  } catch (error) {
    console.error('Insight creation failed:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/insights - Update insight
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
    const { id, metric_value } = body

    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      )
    }

    // Prepare update data
    const updateData: any = {}
    if (metric_value !== undefined) {
      // Validate metric_value is a number if provided
      if (typeof metric_value !== 'number' && isNaN(Number(metric_value))) {
        return NextResponse.json(
          { error: 'metric_value must be a number' },
          { status: 400 }
        )
      }
      updateData.metric_value = Number(metric_value)
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    // Update insight
    const { data: insight, error } = await supabase
      .from('insights')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating insight:', error)
      return NextResponse.json(
        { error: 'Failed to update insight' },
        { status: 500 }
      )
    }

    if (!insight) {
      return NextResponse.json(
        { error: 'Insight not found or access denied' },
        { status: 404 }
      )
    }

    return NextResponse.json(insight, { status: 200 })

  } catch (error) {
    console.error('Insight update failed:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/insights - Delete insight
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

    // Delete insight
    const { error } = await supabase
      .from('insights')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting insight:', error)
      return NextResponse.json(
        { error: 'Failed to delete insight' },
        { status: 500 }
      )
    }

    return new NextResponse(null, { status: 204 })

  } catch (error) {
    console.error('Insight deletion failed:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 