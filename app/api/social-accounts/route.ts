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

// GET /api/social-accounts - Get all social accounts for authenticated user
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
    const platform = searchParams.get('platform')
    const status = searchParams.get('status')

    // Build query
    let query = supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // Apply filters
    if (platform) {
      query = query.eq('platform', platform)
    }
    if (status) {
      query = query.eq('status', status)
    }

    const { data: accounts, error } = await query

    if (error) {
      console.error('Error fetching social accounts:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to retrieve social accounts' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: accounts
    })

  } catch (error) {
    console.error('Social accounts fetch failed:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/social-accounts - Create new social account
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
    const { platform, username, display_name, profile_image_url, access_token, refresh_token, token_expires_at, status, platform_metadata } = body

    if (!platform || !username) {
      return NextResponse.json(
        { success: false, error: 'Platform and username are required' },
        { status: 400 }
      )
    }

    // Validate platform
    const validPlatforms = ['instagram', 'facebook', 'twitter', 'linkedin', 'tiktok', 'youtube', 'pinterest']
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json(
        { success: false, error: 'Invalid platform' },
        { status: 400 }
      )
    }

    // Check for existing account with same platform
    const { data: existingAccount } = await supabase
      .from('social_accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('platform', platform)
      .single()

    if (existingAccount) {
      return NextResponse.json(
        { success: false, error: 'Account for this platform already exists' },
        { status: 409 }
      )
    }

    // Create social account
    const { data: account, error } = await supabase
      .from('social_accounts')
      .insert({
        user_id: user.id,
        platform,
        username,
        display_name: display_name || null,
        profile_image_url: profile_image_url || null,
        access_token: access_token || null,
        refresh_token: refresh_token || null,
        token_expires_at: token_expires_at || null,
        status: status || 'connected',
        platform_metadata: platform_metadata || {}
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating social account:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to create social account' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: account
    })

  } catch (error) {
    console.error('Social account creation failed:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/social-accounts - Update social account
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
        { success: false, error: 'Account ID is required' },
        { status: 400 }
      )
    }

    // Remove any fields that shouldn't be updated
    const allowedFields = ['username', 'display_name', 'profile_image_url', 'access_token', 'refresh_token', 'token_expires_at', 'status', 'platform_metadata']
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

    // Update social account
    const { data: account, error } = await supabase
      .from('social_accounts')
      .update(filteredData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating social account:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update social account' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: account
    })

  } catch (error) {
    console.error('Social account update failed:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/social-accounts - Delete social account
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
        { success: false, error: 'Account ID is required' },
        { status: 400 }
      )
    }

    // Delete social account
    const { error } = await supabase
      .from('social_accounts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting social account:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to delete social account' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Social account deleted successfully'
    })

  } catch (error) {
    console.error('Social account deletion failed:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 