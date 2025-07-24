"use client"

import { useState, useEffect, useCallback } from 'react'
import { 
  PostsService, 
  CalendarEventsService, 
  InteractionsService,
  ContentIdeasService,
  SocialAccountsService 
} from '@/lib/data-service'
import { useAuth } from '@/lib/auth-context'
import type { Post, CalendarEvent, Interaction, ContentIdea, SocialAccount } from '@/lib/supabase'

// Demo data for when Supabase is not configured
const createDemoData = () => {
  // Get current date for demo data
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const nextWeek = new Date(today)
  nextWeek.setDate(nextWeek.getDate() + 7)

  const demoPosts: Post[] = [
    {
      id: 'demo-post-1',
      user_id: 'demo-user-id',
      title: 'Welcome to Your Social Media Dashboard',
      content: 'This is a demo post showing how your content will appear in the dashboard. You can create, edit, and schedule posts across multiple platforms.',
      media_urls: ['/placeholder.jpg'],
      media_type: 'image',
      platforms: ['instagram', 'facebook'],
      status: 'published',
      scheduled_at: today.toISOString(),
      published_at: today.toISOString(),
      tags: ['demo', 'welcome'],
      likes: 42,
      comments: 8,
      shares: 3,
      reach: 1250,
      impressions: 1800,
      metadata: {},
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'demo-post-2',
      user_id: 'demo-user-id',
      title: 'Scheduled Content Example',
      content: 'This post is scheduled for tomorrow. You can see all your scheduled content in the Content Hub and make changes as needed.',
      media_urls: ['/placeholder.jpg'],
      media_type: 'image',
      platforms: ['twitter', 'linkedin'],
      status: 'scheduled',
      scheduled_at: tomorrow.toISOString(),
      published_at: null,
      tags: ['scheduled', 'demo'],
      likes: 0,
      comments: 0,
      shares: 0,
      reach: 0,
      impressions: 0,
      metadata: {},
      created_at: today.toISOString(),
      updated_at: today.toISOString(),
    },
    {
      id: 'demo-post-5',
      user_id: 'demo-user-id',
      title: 'Published Today',
      content: 'This post was published today and should appear on the calendar.',
      media_urls: ['/placeholder.jpg'],
      media_type: 'image',
      platforms: ['instagram', 'facebook'],
      status: 'published',
      scheduled_at: today.toISOString(),
      published_at: today.toISOString(),
      tags: ['published', 'demo'],
      likes: 25,
      comments: 5,
      shares: 2,
      reach: 800,
      impressions: 1200,
      metadata: {},
      created_at: today.toISOString(),
      updated_at: today.toISOString(),
    },
    {
      id: 'demo-post-3',
      user_id: 'demo-user-id',
      title: 'Draft Post',
      content: 'This is a draft post that you can continue working on. Drafts are saved automatically so you never lose your work.',
      media_urls: [],
      media_type: 'text',
      platforms: ['instagram'],
      status: 'draft',
      scheduled_at: null,
      published_at: null,
      tags: ['draft', 'work-in-progress'],
      likes: 0,
      comments: 0,
      shares: 0,
      reach: 0,
      impressions: 0,
      metadata: {},
      created_at: new Date(Date.now() - 3600000).toISOString(),
      updated_at: new Date(Date.now() - 3600000).toISOString(),
    },
          {
        id: 'demo-post-4',
        user_id: 'demo-user-id',
        title: 'Next Week\'s Campaign Launch',
        content: 'Get ready for our exciting new campaign launch! Stay tuned for more updates.',
        media_urls: ['/placeholder.jpg'],
        media_type: 'image',
        platforms: ['instagram', 'facebook', 'twitter'],
        status: 'scheduled',
        scheduled_at: nextWeek.toISOString(),
        published_at: null,
        tags: ['campaign', 'launch'],
        likes: 0,
        comments: 0,
        shares: 0,
        reach: 0,
        impressions: 0,
        metadata: {},
        created_at: today.toISOString(),
        updated_at: today.toISOString(),
      },
      {
        id: 'demo-post-6',
        user_id: 'demo-user-id',
        title: 'Afternoon Update',
        content: 'This post is scheduled for this afternoon. Perfect for showing how the calendar displays multiple posts per day.',
        media_urls: ['/placeholder.jpg'],
        media_type: 'image',
        platforms: ['twitter', 'linkedin'],
        status: 'scheduled',
        scheduled_at: new Date(today.getTime() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours later
        published_at: null,
        tags: ['scheduled', 'afternoon'],
        likes: 0,
        comments: 0,
        shares: 0,
        reach: 0,
        impressions: 0,
        metadata: {},
        created_at: today.toISOString(),
        updated_at: today.toISOString(),
      }
  ]

  const demoEvents: CalendarEvent[] = [
    {
      id: 'demo-event-1',
      user_id: 'demo-user-id',
      title: 'Content Planning Session',
      description: 'Weekly content planning and strategy review',
      start_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      end_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      start_time: '10:00',
      end_time: '11:00',
      timezone: 'UTC',
      category: 'work',
      color: '#3b82f6',
      all_day: false,
      is_recurring: true,
      recurrence_pattern: 'weekly',
      recurrence_end_date: null,
      location: null,
      attendees: [],
      reminders: [15],
      status: 'confirmed',
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  ]

  const demoInteractions: Interaction[] = [
    {
      id: 'demo-interaction-1',
      user_id: 'demo-user-id',
      post_id: 'demo-post-1',
      platform: 'instagram',
      interaction_type: 'comment',
      sender_name: 'Demo User',
      sender_username: '@demouser',
      sender_avatar_url: '/placeholder-user.jpg',
      message: 'Love this content! Can you share more tips?',
      ai_suggestion: 'Thank you for the positive feedback! I\'d be happy to share more tips. What specific areas would you like me to focus on?',
      sentiment: 'positive',
      priority: 'medium',
      status: 'pending',
      replied_at: null,
      external_interaction_id: null,
      metadata: {},
      created_at: new Date(Date.now() - 1800000).toISOString(),
      updated_at: new Date(Date.now() - 1800000).toISOString(),
    }
  ]

  const demoContentIdeas: ContentIdea[] = [
    {
      id: 'demo-idea-1',
      user_id: 'demo-user-id',
      title: 'Behind the Scenes Video',
      description: 'Show the creative process behind your latest project',
      content_type: 'video',
      platforms: ['instagram', 'tiktok'],
      tags: ['behind-the-scenes', 'process'],
      category: 'lifestyle',
      priority: 'high',
      status: 'idea',
      due_date: new Date(Date.now() + 604800000).toISOString().split('T')[0],
      notes: 'Remember to capture good lighting and multiple angles',
      is_saved: true,
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  ]

  const demoSocialAccounts: SocialAccount[] = [
    {
      id: 'demo-account-1',
      user_id: 'demo-user-id',
      platform: 'instagram',
      username: '@demo_account',
      display_name: 'Demo Account',
      profile_image_url: '/placeholder-user.jpg',
      access_token: null,
      refresh_token: null,
      token_expires_at: null,
      status: 'connected',
      platform_metadata: { followers: 1250, following: 340 },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'demo-account-2',
      user_id: 'demo-user-id',
      platform: 'facebook',
      username: 'Demo Page',
      display_name: 'Demo Business Page',
      profile_image_url: '/placeholder.svg',
      access_token: null,
      refresh_token: null,
      token_expires_at: null,
      status: 'connected',
      platform_metadata: { likes: 890, followers: 950 },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  ]

  return {
    posts: demoPosts,
    events: demoEvents,
    interactions: demoInteractions,
    contentIdeas: demoContentIdeas,
    socialAccounts: demoSocialAccounts
  }
}

interface DashboardData {
  posts: Post[]
  drafts: Post[]
  scheduled: Post[]
  published: Post[]
  events: CalendarEvent[]
  interactions: Interaction[]
  contentIdeas: ContentIdea[]
  socialAccounts: SocialAccount[]
}

export function useDashboardData() {
  const { user } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const POSTS_PER_PAGE = 10

  const fetchData = useCallback(async () => {
    if (!user) {
      setData(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Fetch real data using existing service methods with pagination
      const offset = (page - 1) * POSTS_PER_PAGE
      const [
        posts,
        draftCount,
        scheduledCount,
        publishedCount,
        events,
        interactions,
        contentIdeas,
        socialAccounts
      ] = await Promise.all([
        PostsService.getPosts({ 
          limit: POSTS_PER_PAGE, 
          offset,
          includeMedia: false // Only load media for visible posts
        }),
        PostsService.getPostCount('draft'),
        PostsService.getPostCount('scheduled'),
        PostsService.getPostCount('published'),
        CalendarEventsService.getEvents(),
        InteractionsService.getInteractions(),
        ContentIdeasService.getIdeas(),
        SocialAccountsService.getAccounts()
      ])

      // Update hasMore based on total counts
      const totalPosts = draftCount + scheduledCount + publishedCount
      setHasMore(offset + posts.length < totalPosts)

      // Merge new posts with existing ones if paginating
      setData(prevData => ({
        posts: page === 1 ? posts : [...(prevData?.posts || []), ...posts],
        drafts: posts.filter((p: Post) => p.status === 'draft'),
        scheduled: posts.filter((p: Post) => p.status === 'scheduled'),
        published: posts.filter((p: Post) => p.status === 'published'),
        events,
        interactions,
        contentIdeas,
        socialAccounts
      }))
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }, [user, page])

  // Load initial data
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Function to load more posts
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      setPage(p => p + 1)
    }
  }, [loading, hasMore])

  // Function to refresh data
  const refresh = useCallback(() => {
    setPage(1)
    setHasMore(true)
    fetchData()
  }, [fetchData])

  return {
    data,
    loading,
    error,
    hasMore,
    loadMore,
    refresh
  }
}

export function useContentHubData() {
  const { user } = useAuth()
  const [data, setData] = useState<{ 
    drafts: Post[], 
    scheduled: Post[], 
    published: Post[], 
    events: CalendarEvent[] 
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const POSTS_PER_PAGE = 20

  const fetchData = useCallback(async () => {
    if (!user) {
      setData(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Fetch real data using existing service methods with pagination
      const offset = (page - 1) * POSTS_PER_PAGE
      const [
        allPosts, 
        draftCount, 
        scheduledCount, 
        publishedCount, 
        events
      ] = await Promise.all([
        PostsService.getPosts({ 
          limit: POSTS_PER_PAGE, 
          offset,
          includeMedia: true // Include media for calendar display
        }),
        PostsService.getPostCount('draft'),
        PostsService.getPostCount('scheduled'),
        PostsService.getPostCount('published'),
        CalendarEventsService.getEvents()
      ])

      // Update hasMore based on total counts
      const totalPosts = draftCount + scheduledCount + publishedCount
      setHasMore(offset + allPosts.length < totalPosts)

      // Filter posts by status
      const drafts = allPosts.filter((p: Post) => p.status === 'draft')
      const scheduled = allPosts.filter((p: Post) => p.status === 'scheduled')
      const published = allPosts.filter((p: Post) => p.status === 'published')

      // Merge new posts with existing ones if paginating
      setData(prevData => ({
        drafts: page === 1 ? drafts : [...(prevData?.drafts || []), ...drafts],
        scheduled: page === 1 ? scheduled : [...(prevData?.scheduled || []), ...scheduled],
        published: page === 1 ? published : [...(prevData?.published || []), ...published],
        events
      }))
    } catch (err) {
      console.error('Error fetching content data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch content data')
    } finally {
      setLoading(false)
    }
  }, [user, page])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Function to load more posts
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      setPage(p => p + 1)
    }
  }, [loading, hasMore])

  // Function to refresh data
  const refresh = useCallback(() => {
    setPage(1)
    setHasMore(true)
    fetchData()
  }, [fetchData])

  return {
    data,
    loading,
    error,
    hasMore,
    loadMore,
    refresh
  }
} 