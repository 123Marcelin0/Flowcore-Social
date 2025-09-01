import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Get session from client-side
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      return NextResponse.json({ 
        error: error.message,
        sessionError: true 
      }, { status: 401 })
    }

    if (!session) {
      return NextResponse.json({ 
        error: 'No session found',
        noSession: true 
      }, { status: 401 })
    }

    // Debug session structure
    return NextResponse.json({
      sessionExists: !!session,
      sessionKeys: session ? Object.keys(session) : [],
      userKeys: session?.user ? Object.keys(session.user) : [],
      hasAccessToken: !!(session as any)?.access_token,
      hasUserAccessToken: !!(session?.user as any)?.access_token,
      // Don't log actual tokens for security
      accessTokenLength: (session as any)?.access_token?.length || 0,
      userAccessTokenLength: (session?.user as any)?.access_token?.length || 0,
      // Check if there's another property name
      allSessionProps: session ? Object.getOwnPropertyNames(session) : [],
      allUserProps: session?.user ? Object.getOwnPropertyNames(session.user) : []
    })
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message,
      debugError: true 
    }, { status: 500 })
  }
}



























