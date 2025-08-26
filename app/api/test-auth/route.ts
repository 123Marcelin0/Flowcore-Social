import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase'

// Simple auth test endpoint
export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing authentication...')
    
    // Get headers
    const authHeader = request.headers.get('authorization') || ''
    console.log('🔍 Auth header:', { hasHeader: !!authHeader, length: authHeader.length, prefix: authHeader.substring(0, 20) })
    
    // Get cookies
    try {
      const jar = cookies()
      const allCookies = jar.getAll()
      console.log('🔍 Cookies:', allCookies.map(c => ({ name: c.name, hasValue: !!c.value, length: c.value.length })))
    } catch (e) {
      console.error('Cookie error:', e)
    }
    
    // Test token extraction
    let token = ''
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    }
    
    console.log('🔍 Token extracted:', { hasToken: !!token, length: token.length })
    
    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'No token found',
        debug: {
          hasAuthHeader: !!authHeader,
          authHeaderLength: authHeader.length
        }
      }, { status: 401 })
    }
    
    // Test with both clients
    const results = {}
    
    // Test with admin client
    if (supabaseAdmin) {
      try {
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
        results.admin = { hasUser: !!user, error: error?.message }
      } catch (e) {
        results.admin = { error: e.message }
      }
    }
    
    // Test with regular client
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    try {
      const { data: { user }, error } = await supabaseClient.auth.getUser(token)
      results.client = { hasUser: !!user, error: error?.message }
    } catch (e) {
      results.client = { error: e.message }
    }
    
    return NextResponse.json({
      success: true,
      debug: {
        hasToken: !!token,
        tokenLength: token.length,
        hasAdmin: !!supabaseAdmin,
        results
      }
    })
    
  } catch (error) {
    console.error('🔥 Test auth failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}