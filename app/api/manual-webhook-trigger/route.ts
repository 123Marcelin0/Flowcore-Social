import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/supabase'

// Make.com webhook URL
const MAKE_WEBHOOK_URL = 'https://hook.eu2.make.com/2k9wydyrif8tdoa0jxj57tgcof49qi5e'

// POST /api/manual-webhook-trigger - Manual trigger for specific posts
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { postId, postIds, platform } = body

    // Get posts to sync
    let postsToSync = []
    
    if (postId) {
      // Single post fetch
      const { data: post } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .eq('user_id', user.id)
        .single()
      
      if (post) postsToSync = [post]
    } else if (postIds) {
      // Multiple posts fetch
      const { data: posts } = await supabase
        .from('posts')
        .select('*')
        .in('id', postIds)
        .eq('user_id', user.id)
      
      postsToSync = posts || []
    } else {
      return NextResponse.json({
        success: false,
        error: 'Either postId or postIds must be provided'
      })
    }

    if (postsToSync.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No posts found to sync'
      })
    }

    // Get user's social accounts for context
    const { data: socialAccounts } = await supabase
      .from('social_accounts')
      .select('platform, username, external_account_id, platform_metadata')
      .eq('user_id', user.id)
      .eq('status', 'connected')

    const results = []
    
    // Trigger Make.com webhook for each post
    for (const post of postsToSync) {
      try {
        // Find relevant social account
        const relevantPlatforms = platform ? [platform] : (post.platforms || [])
        const accounts = socialAccounts?.filter(acc => 
          relevantPlatforms.includes(acc.platform)
        ) || []

        for (const account of accounts) {
          const webhookPayload = {
            trigger_type: 'manual',
            user_id: user.id,
            post_id: post.id,
            post_data: {
              title: post.title,
              content: post.content,
              platforms: post.platforms,
              published_at: post.published_at,
              external_id: post.metadata?.external_id || null,
              media_urls: post.media_urls || []
            },
            platform_data: {
              platform: account.platform,
              username: account.username,
              account_id: account.platform_metadata?.account_id || account.external_account_id
            },
            fetch_insights: true,
            timestamp: new Date().toISOString()
          }

          // Send to Make.com webhook
          const makeResponse = await fetch(MAKE_WEBHOOK_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(webhookPayload)
          })

          const responseData = await makeResponse.text()
          
          results.push({
            post_id: post.id,
            platform: account.platform,
            status: makeResponse.ok ? 'triggered' : 'failed',
            response: responseData,
            webhook_url: MAKE_WEBHOOK_URL
          })

          // Log the trigger in database
          await supabase
            .from('ai_context_logs')
            .insert({
              user_id: user.id,
              source_type: 'manual_webhook',
              source_id: post.id,
              context_summary: `Manual Make.com webhook triggered for ${account.platform} post insights`,
              ai_response: responseData,
              model_used: 'make_webhook_manual',
              metadata: {
                trigger_type: 'manual',
                platform: account.platform,
                webhook_response: responseData,
                webhook_status: makeResponse.status,
                post_title: post.title
              }
            })

          // Small delay to avoid overwhelming Make.com
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      } catch (error) {
        console.error(`Error triggering webhook for post ${post.id}:`, error)
        results.push({
          post_id: post.id,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    const successCount = results.filter(r => r.status === 'triggered').length
    const failureCount = results.filter(r => r.status !== 'triggered').length

    return NextResponse.json({
      success: successCount > 0,
      data: {
        total_posts: postsToSync.length,
        triggered_successfully: successCount,
        failed: failureCount,
        results: results,
        webhook_url: MAKE_WEBHOOK_URL
      }
    })

  } catch (error) {
    console.error('Error triggering Make.com webhook:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to trigger webhook' },
      { status: 500 }
    )
  }
}

// GET /api/manual-webhook-trigger - Get manual trigger activity logs
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get recent manual webhook triggers
    const { data: logs } = await supabase
      .from('ai_context_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('source_type', 'manual_webhook')
      .order('created_at', { ascending: false })
      .limit(50)

    // Get statistics for last 24 hours
    const twentyFourHoursAgo = new Date()
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)

    const recentLogs = logs?.filter(log => 
      new Date(log.created_at) > twentyFourHoursAgo
    ) || []

    const stats = {
      total_manual_triggers_24h: recentLogs.length,
      successful_triggers: recentLogs.filter(log => 
        log.metadata?.webhook_status === 200
      ).length,
      failed_triggers: recentLogs.filter(log => 
        log.metadata?.webhook_status !== 200
      ).length,
      last_manual_trigger: logs?.[0]?.created_at || null
    }

    return NextResponse.json({
      success: true,
      data: {
        webhook_url: MAKE_WEBHOOK_URL,
        statistics: stats,
        recent_logs: logs?.slice(0, 10) || [],
        automation_note: "6-hour automation runs directly from Make.com scenario"
      }
    })

  } catch (error) {
    console.error('Error getting manual webhook status:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get status' },
      { status: 500 }
    )
  }
} 