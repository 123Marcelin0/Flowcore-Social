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

// GET /api/calendar-events - Get all calendar events for authenticated user
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
    const start_date = searchParams.get('start_date')
    const end_date = searchParams.get('end_date')
    const category = searchParams.get('category')
    const status = searchParams.get('status')
    const is_recurring = searchParams.get('is_recurring')
    const limit = searchParams.get('limit')

    // Build query
    let query = supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', user.id)
      .order('start_date', { ascending: true })

    // Apply filters
    if (start_date) {
      query = query.gte('start_date', start_date)
    }
    if (end_date) {
      query = query.lte('end_date', end_date)
    }
    if (category) {
      query = query.eq('category', category)
    }
    if (status) {
      query = query.eq('status', status)
    }
    if (is_recurring !== null) {
      query = query.eq('is_recurring', is_recurring === 'true')
    }
    if (limit) {
      query = query.limit(parseInt(limit))
    }

    const { data: events, error } = await query

    if (error) {
      console.error('Error fetching calendar events:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to retrieve calendar events' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: events
    })

  } catch (error) {
    console.error('Calendar events fetch failed:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/calendar-events - Create new calendar event
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
      title, 
      description, 
      start_date, 
      end_date, 
      start_time, 
      end_time, 
      timezone, 
      category, 
      color, 
      all_day, 
      is_recurring, 
      recurrence_pattern, 
      recurrence_end_date, 
      location, 
      attendees, 
      reminders, 
      status, 
      metadata 
    } = body

    if (!title || !start_date || !end_date || !category) {
      return NextResponse.json(
        { success: false, error: 'Title, start date, end date, and category are required' },
        { status: 400 }
      )
    }

    // Validate date range
    if (new Date(start_date) > new Date(end_date)) {
      return NextResponse.json(
        { success: false, error: 'Start date cannot be after end date' },
        { status: 400 }
      )
    }

    // Create calendar event
    const { data: event, error } = await supabase
      .from('calendar_events')
      .insert({
        user_id: user.id,
        title,
        description: description || null,
        start_date,
        end_date,
        start_time: start_time || null,
        end_time: end_time || null,
        timezone: timezone || 'UTC',
        category,
        color: color || '#3B82F6',
        all_day: all_day || false,
        is_recurring: is_recurring || false,
        recurrence_pattern: recurrence_pattern || null,
        recurrence_end_date: recurrence_end_date || null,
        location: location || null,
        attendees: attendees || [],
        reminders: reminders || [],
        status: status || 'confirmed',
        metadata: metadata || {}
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating calendar event:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to create calendar event' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: event
    })

  } catch (error) {
    console.error('Calendar event creation failed:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/calendar-events - Update calendar event
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
        { success: false, error: 'Calendar event ID is required' },
        { status: 400 }
      )
    }

    // Remove any fields that shouldn't be updated
    const allowedFields = [
      'title', 'description', 'start_date', 'end_date', 'start_time', 'end_time', 
      'timezone', 'category', 'color', 'all_day', 'is_recurring', 'recurrence_pattern', 
      'recurrence_end_date', 'location', 'attendees', 'reminders', 'status', 'metadata'
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

    // Validate date range if dates are being updated
    if (filteredData.start_date && filteredData.end_date) {
      if (new Date(filteredData.start_date) > new Date(filteredData.end_date)) {
        return NextResponse.json(
          { success: false, error: 'Start date cannot be after end date' },
          { status: 400 }
        )
      }
    }

    // Update calendar event
    const { data: event, error } = await supabase
      .from('calendar_events')
      .update(filteredData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating calendar event:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update calendar event' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: event
    })

  } catch (error) {
    console.error('Calendar event update failed:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/calendar-events - Delete calendar event
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
        { success: false, error: 'Calendar event ID is required' },
        { status: 400 }
      )
    }

    // Delete calendar event
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting calendar event:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to delete calendar event' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Calendar event deleted successfully'
    })

  } catch (error) {
    console.error('Calendar event deletion failed:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 