import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/supabase'

// Types for Meta API responses
interface InstagramInsights {
  data: Array<{
    name: string
    values: Array<{
      value: number
      end_time: string
    }>
  }>
}

interface FacebookPageInsights {
  data: Array<{
    name: string
    values: Array<{
      value: number
      end_time: string
    }>
  }>
}

interface PostMetrics {
  likes: number
  comments: number
  shares: number
  saves: number
  reach: number
  impressions: number
  engagement_rate: number
}

// POST /api/sync-insights - Sync insights for user's posts
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
    const { platform, forceSync = false } = body

    if (!platform) {
      return NextResponse.json(
        { success: false, error: 'Platform is required' },
        { status: 400 }
      )
    }

    // Check if sync is needed
    const shouldSync = await checkSyncStatus(user.id, platform, forceSync)
    if (!shouldSync.needsSync) {
      return NextResponse.json({
        success: true,
        message: `Sync not needed. Next sync: ${shouldSync.nextSync}`,
        data: { nextSync: shouldSync.nextSync }
      })
    }

    // Get user's connected account
    const { data: socialAccount, error: accountError } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', platform)
      .eq('status', 'connected')
      .single()

    if (accountError || !socialAccount) {
      return NextResponse.json(
        { success: false, error: `No connected ${platform} account found` },
        { status: 404 }
      )
    }

    // Get posts that need syncing
    const postsToSync = await getPostsNeedingSync(user.id, platform)
    
    let syncedCount = 0
    let failedCount = 0
    const syncResults = []

    // Sync each post
    for (const post of postsToSync) {
      try {
        const metrics = await fetchPostMetrics(socialAccount, post, platform)
        if (metrics) {
          await storeInsights(user.id, post, platform, socialAccount, metrics)
          syncedCount++
          syncResults.push({ postId: post.id, status: 'success' })
        } else {
          failedCount++
          syncResults.push({ postId: post.id, status: 'failed', error: 'No metrics returned' })
        }
      } catch (error) {
        console.error(`Failed to sync post ${post.id}:`, error)
        failedCount++
        syncResults.push({ postId: post.id, status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' })
      }
    }

    // Update sync status
    await updateSyncStatus(user.id, platform, syncedCount > 0, failedCount === 0 ? null : `${failedCount} posts failed`)

    // Trigger pattern analysis if we have enough data
    if (syncedCount > 0) {
      await triggerPatternAnalysis(user.id)
    }

    return NextResponse.json({
      success: true,
      data: {
        platform,
        totalPosts: postsToSync.length,
        syncedCount,
        failedCount,
        syncResults: syncResults.slice(0, 10), // Return first 10 for debugging
        patternsAnalyzed: syncedCount > 0
      }
    })

  } catch (error) {
    console.error('Sync insights failed:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to sync insights' },
      { status: 500 }
    )
  }
}

// GET /api/sync-insights - Get sync status and recent insights
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const platform = searchParams.get('platform')

    // Get sync status
    let syncStatusQuery = supabase
      .from('platform_sync_status')
      .select('*')
      .eq('user_id', user.id)

    if (platform) {
      syncStatusQuery = syncStatusQuery.eq('platform', platform)
    }

    const { data: syncStatus } = await syncStatusQuery

    // Get recent insights
    let insightsQuery = supabase
      .from('ai_insights')
      .select(`
        *,
        posts:post_id (
          title,
          content,
          created_at
        )
      `)
      .eq('user_id', user.id)
      .order('last_synced_at', { ascending: false })
      .limit(50)

    if (platform) {
      insightsQuery = insightsQuery.eq('platform', platform)
    }

    const { data: insights } = await insightsQuery

    // Get patterns summary
    const { data: patterns } = await supabase
      .from('performance_patterns')
      .select('pattern_type, pattern_name, avg_engagement_lift, confidence_level, is_active')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('priority_score', { ascending: false })
      .limit(20)

    return NextResponse.json({
      success: true,
      data: {
        syncStatus: syncStatus || [],
        recentInsights: insights || [],
        activePatterns: patterns || []
      }
    })

  } catch (error) {
    console.error('Get sync insights failed:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get sync insights' },
      { status: 500 }
    )
  }
}

// Helper Functions

async function checkSyncStatus(userId: string, platform: string, forceSync: boolean) {
  if (forceSync) return { needsSync: true }

  const { data: status } = await supabase
    .from('platform_sync_status')
    .select('*')
    .eq('user_id', userId)
    .eq('platform', platform)
    .single()

  if (!status) {
    // First time sync
    await supabase
      .from('platform_sync_status')
      .insert({
        user_id: userId,
        platform,
        sync_enabled: true,
        next_sync_at: new Date().toISOString()
      })
    return { needsSync: true }
  }

  const now = new Date()
  const nextSync = new Date(status.next_sync_at)
  
  return {
    needsSync: now >= nextSync && status.sync_enabled,
    nextSync: status.next_sync_at
  }
}

async function getPostsNeedingSync(userId: string, platform: string) {
  // Get published posts from the last 30 days that haven't been synced recently
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: posts } = await supabase
    .from('posts')
    .select(`
      *,
      ai_insights!left(id, last_synced_at, sync_status)
    `)
    .eq('user_id', userId)
    .contains('platforms', [platform])
    .eq('status', 'published')
    .gte('published_at', thirtyDaysAgo.toISOString())

  // Filter posts that need syncing (never synced or synced more than 6 hours ago)
  const sixHoursAgo = new Date()
  sixHoursAgo.setHours(sixHoursAgo.getHours() - 6)

  return posts?.filter(post => {
    const insight = post.ai_insights?.[0]
    if (!insight) return true // Never synced
    
    const lastSynced = new Date(insight.last_synced_at)
    return lastSynced < sixHoursAgo // Synced more than 6 hours ago
  }) || []
}

async function fetchPostMetrics(socialAccount: any, post: any, platform: string): Promise<PostMetrics | null> {
  try {
    // This is where you'd call the actual Meta APIs
    // For demo purposes, we'll simulate the API calls
    
    if (platform === 'instagram') {
      return await fetchInstagramMetrics(socialAccount, post)
    } else if (platform === 'facebook') {
      return await fetchFacebookMetrics(socialAccount, post)
    }
    
    return null
  } catch (error) {
    console.error(`Error fetching ${platform} metrics:`, error)
    return null
  }
}

async function fetchInstagramMetrics(socialAccount: any, post: any): Promise<PostMetrics | null> {
  // Demo implementation - replace with actual Instagram Basic Display API calls
  
  const accessToken = socialAccount.access_token
  if (!accessToken) {
    throw new Error('No access token available')
  }

  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 100))

  // In real implementation:
  // const response = await fetch(`https://graph.instagram.com/v18.0/${post.external_id}/insights?metric=likes,comments,shares,saved,reach,impressions&access_token=${accessToken}`)
  // const data = await response.json()
  
  // For demo, return simulated metrics
  return {
    likes: Math.floor(Math.random() * 100) + 20,
    comments: Math.floor(Math.random() * 20) + 2,
    shares: Math.floor(Math.random() * 10) + 1,
    saves: Math.floor(Math.random() * 15) + 3,
    reach: Math.floor(Math.random() * 500) + 100,
    impressions: Math.floor(Math.random() * 800) + 200,
    engagement_rate: (Math.random() * 0.08) + 0.02 // 2-10%
  }
}

async function fetchFacebookMetrics(socialAccount: any, post: any): Promise<PostMetrics | null> {
  // Demo implementation - replace with actual Facebook Graph API calls
  
  const accessToken = socialAccount.access_token
  if (!accessToken) {
    throw new Error('No access token available')
  }

  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 100))

  // In real implementation:
  // const response = await fetch(`https://graph.facebook.com/v18.0/${post.external_id}/insights?metric=post_impressions,post_engaged_users,post_clicks&access_token=${accessToken}`)
  // const data = await response.json()
  
  // For demo, return simulated metrics
  return {
    likes: Math.floor(Math.random() * 80) + 15,
    comments: Math.floor(Math.random() * 15) + 1,
    shares: Math.floor(Math.random() * 8) + 1,
    saves: 0, // Facebook doesn't have saves like Instagram
    reach: Math.floor(Math.random() * 400) + 80,
    impressions: Math.floor(Math.random() * 600) + 150,
    engagement_rate: (Math.random() * 0.06) + 0.015 // 1.5-7.5%
  }
}

async function storeInsights(userId: string, post: any, platform: string, socialAccount: any, metrics: PostMetrics) {
  // Analyze content features (emojis, hashtags, etc.)
  const contentFeatures = analyzeContentFeatures(post.content)
  
  // Analyze posting timing
  const postTiming = analyzePostTiming(post.published_at)
  
  // Determine performance category
  const performanceCategory = determinePerformanceCategory(metrics.engagement_rate)
  
  // Store in ai_insights table
  const { error } = await supabase
    .from('ai_insights')
    .upsert({
      user_id: userId,
      post_id: post.id,
      platform,
      external_post_id: post.metadata?.external_id || null,
      external_account_id: socialAccount.platform_metadata?.account_id || null,
      likes_count: metrics.likes,
      comments_count: metrics.comments,
      shares_count: metrics.shares,
      saves_count: metrics.saves,
      reach: metrics.reach,
      impressions: metrics.impressions,
      engagement_rate: metrics.engagement_rate,
      content_features: contentFeatures,
      post_timing: postTiming,
      performance_category: performanceCategory,
      last_synced_at: new Date().toISOString(),
      sync_status: 'synced'
    }, {
      onConflict: 'user_id,post_id,platform'
    })

  if (error) {
    console.error('Error storing insights:', error)
    throw error
  }

  // Update the original posts table with latest metrics
  await supabase
    .from('posts')
    .update({
      likes: metrics.likes,
      comments: metrics.comments,
      shares: metrics.shares,
      reach: metrics.reach,
      impressions: metrics.impressions
    })
    .eq('id', post.id)
}

function analyzeContentFeatures(content: string) {
  // Extract emojis
  const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu
  const emojis = content.match(emojiRegex) || []
  
  // Extract hashtags
  const hashtagRegex = /#[\w]+/g
  const hashtags = content.match(hashtagRegex) || []
  
  // Extract mentions
  const mentionRegex = /@[\w]+/g
  const mentions = content.match(mentionRegex) || []
  
  // Detect CTAs (call-to-actions)
  const ctaKeywords = ['click', 'link', 'bio', 'comment', 'share', 'tag', 'follow', 'dm', 'message', 'swipe', 'tap']
  const hasCTA = ctaKeywords.some(keyword => content.toLowerCase().includes(keyword))
  
  // Detect questions
  const hasQuestion = content.includes('?')
  
  return {
    emoji_count: emojis.length,
    emojis: emojis.slice(0, 10), // First 10 emojis
    hashtag_count: hashtags.length,
    hashtags: hashtags.slice(0, 10), // First 10 hashtags
    mention_count: mentions.length,
    has_cta: hasCTA,
    has_question: hasQuestion,
    content_length: content.length,
    word_count: content.split(/\s+/).length
  }
}

function analyzePostTiming(publishedAt: string) {
  const date = new Date(publishedAt)
  
  return {
    posted_at: publishedAt,
    day_of_week: date.getDay(), // 0 = Sunday, 6 = Saturday
    hour_of_day: date.getHours(),
    day_name: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()],
    time_period: getTimePeriod(date.getHours())
  }
}

function getTimePeriod(hour: number): string {
  if (hour >= 6 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 21) return 'evening'
  return 'night'
}

function determinePerformanceCategory(engagementRate: number): string {
  if (engagementRate >= 0.06) return 'high'    // 6%+ engagement
  if (engagementRate >= 0.03) return 'medium'  // 3-6% engagement
  return 'low'                                  // < 3% engagement
}

async function updateSyncStatus(userId: string, platform: string, success: boolean, errorMessage: string | null) {
  const now = new Date()
  const nextSync = new Date(now.getTime() + (6 * 60 * 60 * 1000)) // 6 hours from now

  const updateData: any = {
    last_sync_at: now.toISOString(),
    next_sync_at: nextSync.toISOString(),
    api_status: success ? 'active' : 'error'
  }

  if (success) {
    updateData.last_successful_sync = now.toISOString()
    updateData.api_error_message = null
  } else {
    updateData.api_error_message = errorMessage
    updateData.failed_syncs = 'failed_syncs + 1' // SQL increment
  }

  await supabase
    .from('platform_sync_status')
    .upsert({
      user_id: userId,
      platform,
      ...updateData
    }, {
      onConflict: 'user_id,platform'
    })
}

async function triggerPatternAnalysis(userId: string) {
  // This would trigger the pattern detection system
  // For now, we'll just log that it should happen
  console.log(`Pattern analysis triggered for user ${userId}`)
  
  // In a real implementation, this might:
  // 1. Queue a background job
  // 2. Call a separate pattern analysis service
  // 3. Update pattern priorities based on new data
  
  try {
    // Update pattern priorities based on recent performance
    const { data } = await supabase
      .rpc('update_pattern_priorities', { input_user_id: userId })
    
    console.log(`Updated ${data} patterns for user ${userId}`)
  } catch (error) {
    console.error('Error updating pattern priorities:', error)
  }
} 