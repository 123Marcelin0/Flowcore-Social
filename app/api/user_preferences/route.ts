import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/user_preferences - Get user preferences for authenticated user
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

    // Fetch user preferences
    const { data: preferences, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error) {
      // If no preferences found, return empty object (user-friendly)
      if (error.code === 'PGRST116') {
        return NextResponse.json({}, { status: 200 })
      }
      
      console.error('Error fetching user preferences:', error)
      return NextResponse.json(
        { error: 'Failed to retrieve user preferences' },
        { status: 500 }
      )
    }

    return NextResponse.json(preferences, { status: 200 })

  } catch (error) {
    console.error('User preferences fetch failed:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/user_preferences - Upsert user preferences
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
    const { preferred_tone, preferred_style, preferred_keywords } = body

    // Prepare upsert data
    const upsertData = {
      user_id: user.id,
      preferred_tone: preferred_tone || null,
      preferred_style: preferred_style || null,
      preferred_keywords: preferred_keywords || null,
      last_updated_at: new Date().toISOString()
    }

    // Upsert user preferences (update if exists, insert if not)
    const { data: preferences, error } = await supabase
      .from('user_preferences')
      .upsert(upsertData, {
        onConflict: 'user_id'
      })
      .select()
      .single()

    if (error) {
      console.error('Error upserting user preferences:', error)
      return NextResponse.json(
        { error: 'Failed to update user preferences' },
        { status: 500 }
      )
    }

    return NextResponse.json(preferences, { status: 200 })

  } catch (error) {
    console.error('User preferences update failed:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Handle other HTTP methods
export async function POST(req: NextRequest) {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}

export async function DELETE(req: NextRequest) {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}

export async function PATCH(req: NextRequest) {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
} 