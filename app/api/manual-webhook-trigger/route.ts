import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/supabase'

// Make.com webhook URL
const MAKE_WEBHOOK_URL = process.env.MAKE_WEBHOOK_URL

if (!MAKE_WEBHOOK_URL) {
  console.warn('MAKE_WEBHOOK_URL not configured - webhook functionality disabled')
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    if (!MAKE_WEBHOOK_URL) {
      return NextResponse.json(
        { success: false, error: 'Webhook URL not configured' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { postId, postIds, platform } = body

    // Validate input parameters
    if (postId && typeof postId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'postId must be a string' },
        { status: 400 }
      )
    }

    if (postIds && (!Array.isArray(postIds) || !postIds.every(id => typeof id === 'string'))) {
      return NextResponse.json(
        { success: false, error: 'postIds must be an array of strings' },
        { status: 400 }
      )
    }

    if (platform && typeof platform !== 'string') {
      return NextResponse.json(
        { success: false, error: 'platform must be a string' },
        { status: 400 }
      )
    }

    // Get posts to sync
    let postsToSync = []
    
    if (postId) {
      // Single post fetch
      const { data: post, error: postError } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .eq('user_id', user.id)
        .single()

      if (postError) {
        console.error('Error fetching post:', postError)
        return NextResponse.json(
          { success: false, error: 'Failed to fetch post' },
          { status: 500 }
        )
      }

      if (post) postsToSync = [post]
    } else if (postIds) {
      // Multiple posts fetch
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .in('id', postIds)
        .eq('user_id', user.id)

      if (postsError) {
        console.error('Error fetching posts:', postsError)
        return NextResponse.json(
          { success: false, error: 'Failed to fetch posts' },
          { status: 500 }
        )
      }

      postsToSync = posts || []
    } else {
      // No specific posts - sync all user's posts
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50) // Limit to recent posts

      if (postsError) {
        console.error('Error fetching posts:', postsError)
        return NextResponse.json(
          { success: false, error: 'Failed to fetch posts' },
          { status: 500 }
        )
      }

      postsToSync = posts || []
    }

    if (postsToSync.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No posts found to sync' },
        { status: 404 }
      )
    }

    // Trigger webhook for each post
    const results = []
    for (const post of postsToSync) {
      try {
        const webhookPayload = {
          post_id: post.id,
          user_id: user.id,
          platform: platform || post.platform,
          post_data: {
            title: post.title,
            content: post.content,
            media_urls: post.media_urls,
            hashtags: post.hashtags,
            scheduled_time: post.scheduled_time,
            status: post.status
          },
          trigger_type: 'manual',
          timestamp: new Date().toISOString()
        }

        const response = await fetch(MAKE_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(webhookPayload)
        })

        const result = {
          post_id: post.id,
          success: response.ok,
          status: response.status,
          statusText: response.statusText
        }

        // Log the webhook call
        await supabase
          .from('webhook_logs')
          .insert({
            user_id: user.id,
            post_id: post.id,
            webhook_url: MAKE_WEBHOOK_URL,
            payload: webhookPayload,
            response_status: response.status,
            response_text: response.statusText,
            success: response.ok
          })

        results.push(result)
      } catch (error) {
        console.error(`Error triggering webhook for post ${post.id}:`, error)
        results.push({
          post_id: post.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    const successfulCount = results.filter(r => r.success).length
    const failedCount = results.length - successfulCount

    return NextResponse.json({
      success: true,
      message: `Triggered webhooks for ${results.length} posts`,
      results: {
        total: results.length,
        successful: successfulCount,
        failed: failedCount,
        details: results
      }
    })

  } catch (error) {
    console.error('Manual webhook trigger error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to trigger webhook' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get webhook statistics
    const { count: totalLogs } = await supabase
      .from('webhook_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    const { count: successfulLogs } = await supabase
      .from('webhook_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('success', true)

    const { data: logs } = await supabase
      .from('webhook_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    const stats = {
      total_webhooks: totalLogs || 0,
      successful_webhooks: successfulLogs || 0,
      success_rate: totalLogs ? Math.round((successfulLogs || 0) / totalLogs * 100) : 0
    }

    return NextResponse.json({
      success: true,
      data: {
        webhook_url: MAKE_WEBHOOK_URL,
        statistics: stats,
        recent_logs: logs?.slice(0, 10).map(log => ({
          id: log.id,
          created_at: log.created_at,
          post_id: log.post_id,
          success: log.success,
          response_status: log.response_status,
          response_text: log.response_text
        }))
      }
    })

  } catch (error) {
    console.error('Error fetching webhook statistics:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch webhook statistics' },
      { status: 500 }
    )
  }
} 