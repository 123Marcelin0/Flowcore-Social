"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Edit, Instagram, Facebook, Twitter, Linkedin, Video, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Eye, Heart, MessageCircle, Share2, Move, Loader2, Brain, Sparkles, Zap, ArrowLeft, Calendar, List, Lightbulb } from "lucide-react"
import { MonthlyCalendar } from "@/components/calendar/monthly-calendar"
import type { CalendarEvent } from "@/components/calendar/event-card"
import { AIPostWorkflow } from "./ai-post-workflow"
import { CreatePostDialog } from "./create-post-dialog"
import { PostDetailPopup } from "./post-detail-popup"
import { TrendOptimizationWorkflow } from "./trend-optimization-workflow"
import { ContentStrategyWorkflow } from "./content-strategy-workflow"
import { IdeaGrid } from "@/components/idea-cards/idea-grid"
import type { IdeaCardData } from "@/components/idea-cards/idea-card"
import { usePost } from "@/lib/post-context"
import { useAuth } from "@/lib/auth-context"
import { CalendarEventsService } from "@/lib/data-service"
import type { CalendarEvent as DatabaseCalendarEvent } from "@/lib/supabase"
import { sampleIdeas } from "@/lib/sample-ideas"
import { toast } from "sonner"
import { ContentIdeaService } from "@/lib/content-idea-service"

interface Draft {
  id: string
  content: string
  platforms: string[]
  image: string
  createdAt: string
  status: 'draft'
  likes: number
  comments: number
  shares: number
}

// TrendData interface to match TrendOptimizationWorkflow
interface TrendData {
  id: string
  thumbnail_url: string
  reel_url: string
  title?: string
  creator?: string
  script?: string
  description?: string
}

// ContentStrategyData interface to match ContentStrategyWorkflow
interface ContentStrategyData {
  id: string
  title: string
  description: string
  category: 'content-strategies'
  content: {
    hook?: string
    script?: string
    hashtags?: string[]
    visualTips?: string[]
    platforms?: string[]
    targetAudience?: string
    estimatedReach?: number
  }
  priority: 'low' | 'medium' | 'high'
  estimatedEffort: 'quick' | 'medium' | 'complex'
}

// Convert database CalendarEvent to component format
const convertDatabaseEventToEvent = (dbEvent: DatabaseCalendarEvent): CalendarEvent => {
  return {
    id: dbEvent.id,
    title: dbEvent.title,
    description: dbEvent.description || '',
    startDate: dbEvent.start_date,
    endDate: dbEvent.end_date,
    startTime: dbEvent.start_time || '',
    endTime: dbEvent.end_time || '',
    category: dbEvent.category,
    color: dbEvent.color,
    allDay: dbEvent.all_day,
    isRecurring: dbEvent.is_recurring,
    recurrencePattern: (dbEvent.recurrence_pattern as "daily" | "weekly" | "monthly" | "yearly") || undefined
  }
}

// Convert IdeaCardData to TrendData format for the workflow
const convertIdeaToTrendData = (idea: IdeaCardData): TrendData => {
  return {
    id: idea.id,
    thumbnail_url: '/placeholder.svg', // Default thumbnail
    reel_url: `#idea-${idea.id}`, // Placeholder URL
    title: idea.title,
    creator: 'Content Idea',
    script: idea.content.script || idea.description,
    description: idea.description
  }
}

// Convert IdeaCardData to ContentStrategyData format for the workflow
const convertIdeaToContentStrategyData = (idea: IdeaCardData): ContentStrategyData => {
  return {
    id: idea.id,
    title: idea.title,
    description: idea.description,
    category: 'content-strategies',
    content: {
      hook: idea.content.hook,
      script: idea.content.script,
      hashtags: idea.content.hashtags,
      visualTips: idea.content.visualTips,
      platforms: idea.content.platforms,
      targetAudience: idea.content.targetAudience,
      estimatedReach: idea.content.estimatedReach
    },
    priority: idea.priority,
    estimatedEffort: idea.estimatedEffort
  }
}

export function ContentHub() {
  const { user } = useAuth()
  const { state, actions } = usePost()
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false)
  const [selectedView, setSelectedView] = useState("ideas")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [loadingMore, setLoadingMore] = useState(false)
  const [isAIPlanningMode, setIsAIPlanningMode] = useState(false)
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false)
  const [aiPlanData, setAiPlanData] = useState<any>(null)
  const [selectedPost, setSelectedPost] = useState<any>(null)
  const [isPostDetailOpen, setIsPostDetailOpen] = useState(false)
  const [hoveredPost, setHoveredPost] = useState<string | null>(null)
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  
  // Add new approval popup state
  const [showApprovalDialog, setShowApprovalDialog] = useState(false)
  const [pendingApprovalPost, setPendingApprovalPost] = useState<any>(null)
  
  const [dragVisuals, setDragVisuals] = useState<{
    draggedId: string | null
    dragOverDate: string | null
  }>({ draggedId: null, dragOverDate: null })
  const [ideas, setIdeas] = useState<IdeaCardData[]>([])
  const [isLoadingIdeas, setIsLoadingIdeas] = useState(false)
  const [convertingIdeaContent, setConvertingIdeaContent] = useState<{
    title: string
    description: string
    hashtags: string[]
    category?: 'trend-reels' | 'content-strategies' | 'ai-strategies'
    source?: 'ai-generated' | 'trend-explorer' | 'manual' | 'content-strategy'
    tags?: string[]
  } | null>(null)
  const [editingPostId, setEditingPostId] = useState<string | null>(null)

  // Trend Optimization Workflow State
  const [showTrendWorkflow, setShowTrendWorkflow] = useState(false)
  const [selectedTrendData, setSelectedTrendData] = useState<TrendData | null>(null)

  // Content Strategy Workflow State
  const [showContentStrategyWorkflow, setShowContentStrategyWorkflow] = useState(false)
  const [selectedContentStrategyData, setSelectedContentStrategyData] = useState<ContentStrategyData | null>(null)

  // Fetch calendar events
  useEffect(() => {
    if (user) {
      const fetchCalendarEvents = async () => {
        try {
          const events = await CalendarEventsService.getEvents()
          setCalendarEvents(events.map(convertDatabaseEventToEvent))
        } catch (error) {
          console.error('Error fetching calendar events:', error)
        }
      }
      fetchCalendarEvents()
    }
  }, [user])

  // Load content ideas from database
  useEffect(() => {
    if (user?.id) {
      const loadIdeas = async () => {
        setIsLoadingIdeas(true)
        try {
          const userIdeas = await ContentIdeaService.syncWithContentHub(user.id)
          setIdeas(userIdeas)
        } catch (error) {
          console.error('Error loading ideas:', error)
          // Fallback to sample ideas if database loading fails
          setIdeas(sampleIdeas)
        } finally {
          setIsLoadingIdeas(false)
        }
      }
      loadIdeas()
    }
  }, [user])

  // Subscribe to real-time post changes
  useEffect(() => {
    const unsubscribe = actions.subscribeToChanges((event) => {
      // Handle sync events for real-time updates
      switch (event.type) {
        case 'post_created':
        case 'post_updated':
        case 'post_deleted':
        case 'batch_sync':
          // Posts are automatically updated via PostContext
          // Just show a subtle notification if it's from another source
          if (event.source !== 'user_action') {
            console.log('Posts synchronized from server')
          }
          break
      }
    })
    
    return unsubscribe
  }, [actions])

  // Periodic calendar events sync
  useEffect(() => {
    if (!user) return
    
    const syncCalendarEvents = async () => {
      try {
        const events = await CalendarEventsService.getEvents()
        setCalendarEvents(events.map(convertDatabaseEventToEvent))
      } catch (error) {
        console.error('Error syncing calendar events:', error)
      }
    }
    
    // Sync calendar events every 60 seconds
    const interval = setInterval(syncCalendarEvents, 60000)
    return () => clearInterval(interval)
  }, [user])

  // Show trend workflow instead of content hub when active
  if (showTrendWorkflow && selectedTrendData) {
    return (
      <div className="h-full w-full">
        <TrendOptimizationWorkflow
          trend={selectedTrendData}
          onBack={() => {
            setShowTrendWorkflow(false)
            setSelectedTrendData(null)
          }}
        />
      </div>
    )
  }

  // Show content strategy workflow instead of content hub when active
  if (showContentStrategyWorkflow && selectedContentStrategyData) {
    return (
      <div className="h-full w-full">
        <ContentStrategyWorkflow
          strategy={selectedContentStrategyData}
          onBack={() => {
            setShowContentStrategyWorkflow(false)
            setSelectedContentStrategyData(null)
          }}
        />
      </div>
    )
  }

  // Initial loading state
  if (state.loading && Object.keys(state.posts).length === 0) {
    return (
      <div className="h-full w-full bg-gray-50/50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-4" />
          <p className="text-sm text-gray-600">Loading content...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (state.error) {
    return (
      <div className="h-full w-full bg-gray-50/50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-6 h-6 text-red-600" />
          </div>
          <p className="text-sm text-red-600 mb-2">Error loading content</p>
          <p className="text-xs text-gray-500 mb-4">{state.error}</p>
          <Button onClick={actions.fetchPosts} size="sm">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  // Get posts from context
  const drafts = state.drafts.map(post => ({
    id: post.id,
    content: post.content,
    platforms: post.platforms,
    image: post.image,
    createdAt: post.createdAt,
    status: 'draft' as const,
    likes: post.likes,
    comments: post.comments,
    shares: post.shares,
    approved: post.approved // Add approved status
  }))
  const scheduled = state.scheduled
  const published = state.published
  
  // Combine all posts that should appear in calendar (scheduled + published + drafts with dates)
  const draftsWithDates = state.drafts.filter(draft => 
    draft.scheduledDate && draft.scheduledTime && 
    draft.scheduledDate.match(/^\d{4}-\d{2}-\d{2}$/) &&
    draft.scheduledTime.match(/^\d{2}:\d{2}$/)
  )
  
  const posts = [
    ...scheduled,
    ...published,
    ...draftsWithDates
  ].filter(post => {
    // Ensure post has valid date and time
    return post.scheduledDate && post.scheduledTime && 
           // Ensure the date is properly formatted
           post.scheduledDate.match(/^\d{4}-\d{2}-\d{2}$/) &&
           // Ensure the time is properly formatted
           post.scheduledTime.match(/^\d{2}:\d{2}$/)
  })

  // Synchronize posts as calendar events
  const synchronizePostsAsEvents = () => {
    return posts.map(post => ({
      id: `post-${post.id}`,
      title: post.title || 'Untitled Post',
      description: post.content,
      startDate: post.scheduledDate,
      endDate: post.scheduledDate,
      startTime: post.scheduledTime,
      endTime: post.scheduledTime,
      category: 'social-media',
      color: post.status === 'published' ? '#10b981' : post.status === 'scheduled' ? '#3b82f6' : '#9ca3af',
      allDay: false,
      isRecurring: false,
      postData: post // Additional post data for interactions
    }))
  }

  const allEvents = [...calendarEvents, ...synchronizePostsAsEvents()]

  const handleEventCreate = async (event: CalendarEvent) => {
    if (!user) return
    
    try {
      await CalendarEventsService.createEvent({
        user_id: user.id,
        title: event.title,
        description: event.description,
        start_date: event.startDate,
        end_date: event.endDate,
        start_time: event.startTime,
        end_time: event.endTime,
        category: event.category,
        color: event.color,
        all_day: event.allDay,
        is_recurring: event.isRecurring,
        recurrence_pattern: event.recurrencePattern
      })
      // Refresh calendar events
      const events = await CalendarEventsService.getEvents()
      setCalendarEvents(events.map(convertDatabaseEventToEvent))
    } catch (error) {
      console.error('Error creating event:', error)
    }
  }

  const handleEventUpdate = async (updatedEvent: CalendarEvent) => {
    if (!user) return
    
    try {
      await CalendarEventsService.updateEvent(updatedEvent.id, {
        title: updatedEvent.title,
        description: updatedEvent.description,
        start_date: updatedEvent.startDate,
        end_date: updatedEvent.endDate,
        start_time: updatedEvent.startTime,
        end_time: updatedEvent.endTime,
        category: updatedEvent.category,
        color: updatedEvent.color,
        all_day: updatedEvent.allDay,
        is_recurring: updatedEvent.isRecurring,
        recurrence_pattern: updatedEvent.recurrencePattern
      })
      // Refresh calendar events
      const events = await CalendarEventsService.getEvents()
      setCalendarEvents(events.map(convertDatabaseEventToEvent))
    } catch (error) {
      console.error('Error updating event:', error)
    }
  }

  const handleEventDelete = async (eventId: string) => {
    if (!user) return
    
    try {
      await CalendarEventsService.deleteEvent(eventId)
      // Refresh calendar events
      const events = await CalendarEventsService.getEvents()
      setCalendarEvents(events.map(convertDatabaseEventToEvent))
    } catch (error) {
      console.error('Error deleting event:', error)
    }
  }

  const handleSchedulePost = async (postId: string, scheduledDate: string, scheduledTime: string) => {
    if (!user) return
    
    try {
      await actions.updatePostDate(postId, scheduledDate, scheduledTime)
    } catch (error) {
      console.error('Error scheduling post:', error)
    }
  }

  const handleUpdatePostStatus = async (postId: string, status: 'draft' | 'scheduled' | 'published') => {
    if (!user) return
    
    try {
      await actions.updatePost(postId, { status })
    } catch (error) {
      console.error('Error updating post status:', error)
    }
  }

  const handlePostClick = (post: any) => {
    // Debug: Log post properties to understand what we're working with
    console.log('🔍 Post clicked:', {
      id: post.id,
      title: post.title,
      category: post.category,
      source: post.source,
      tags: post.tags,
      status: post.status,
      content: post.content?.substring(0, 50) + '...',
      platforms: post.platforms
    })
    
    // Check if this is an idea that should open trend workflows
    const isIdea = post.category && ['trend-reels', 'content-strategies', 'ai-strategies'].includes(post.category)
    
    if (isIdea) {
      // For reel trend ideas, redirect to trend optimization page
      if (post.category === 'trend-reels') {
        const trendData = convertIdeaToTrendData(post)
        setSelectedTrendData(trendData)
        setShowTrendWorkflow(true)
        return
      } 
      // For content strategies and AI strategies, redirect to content strategy page
      else if (post.category === 'content-strategies' || post.category === 'ai-strategies') {
        const contentStrategyData = convertIdeaToContentStrategyData(post)
        setSelectedContentStrategyData(contentStrategyData)
        setShowContentStrategyWorkflow(true)
        return
      }
    }

    // For ideas converted from IdeaCardData that might not have category but have specific properties
    // Check if it's a trend-based idea by looking at content or properties
    if (!post.category && (post.source === 'trend-explorer' || 
                           (post.content?.platforms && post.content.platforms.includes('tiktok')) ||
                           post.tags?.includes('trend') ||
                           post.tags?.includes('reel') ||
                           post.title?.toLowerCase().includes('reel') ||
                           post.title?.toLowerCase().includes('trend') ||
                           post.title?.toLowerCase().includes('besichtigung') ||
                           post.title?.toLowerCase().includes('renovierung') ||
                           post.title?.toLowerCase().includes('transformation'))) {
      console.log('🎬 Redirecting to Trend Optimization workflow for post:', post.title)
      const trendData = convertIdeaToTrendData(post)
      setSelectedTrendData(trendData)
      setShowTrendWorkflow(true)
      return
    }

    // For strategy-based ideas without explicit category
    if (!post.category && (post.source === 'content-strategy' ||
                           post.tags?.includes('strategy') ||
                           post.tags?.includes('ai-generated') ||
                           post.title?.toLowerCase().includes('strategy') ||
                           post.title?.toLowerCase().includes('planung') ||
                           post.title?.toLowerCase().includes('authentizität') ||
                           post.title?.toLowerCase().includes('vertrauen') ||
                           post.title?.toLowerCase().includes('tipps'))) {
      console.log('🎯 Redirecting to Content Strategy workflow for post:', post.title)
      const contentStrategyData = convertIdeaToContentStrategyData(post)
      setSelectedContentStrategyData(contentStrategyData)
      setShowContentStrategyWorkflow(true)
      return
    }

    // For incomplete drafts ONLY - very specific check
    const isIncompletePost = post.status === 'draft' && 
                            (!post.content?.trim() || 
                             !post.platforms?.length || 
                             post.title === 'Untitled Post' ||
                             post.title === '' ||
                             post.content === '')

    if (isIncompletePost) {
      // Only open CreatePostDialog for truly incomplete posts
      const prefilledContent = {
        title: post.title && post.title !== 'Untitled Post' ? post.title : '',
        description: post.content || '',
        hashtags: [],
        category: post.category,
        source: post.source,
        tags: post.tags
      }
      
      setConvertingIdeaContent(prefilledContent)
      setEditingPostId(post.id)
      setIsCreatePostOpen(true)
      
      toast.info("Unvollständiger Entwurf wird zur Bearbeitung geöffnet.")
      return
    }

    // For complete drafts that need approval
    const needsApproval = post.status === 'draft' && 
                         post.content?.trim() && 
                         post.platforms?.length && 
                         !post.approved

    if (needsApproval) {
      setPendingApprovalPost(post)
      setShowApprovalDialog(true)
      return
    }

    // For all other posts (published, scheduled, approved drafts, or any complete post)
    // Always show the Post Detail View - NO MORE CreatePostDialog!
    setSelectedPost(post)
    setIsPostDetailOpen(true)
  }

  const handleApprovePost = async (approve: boolean) => {
    if (!pendingApprovalPost || !user) {
      setShowApprovalDialog(false)
      setPendingApprovalPost(null)
      return
    }

    try {
      if (approve) {
        // Approve the post and set it to scheduled status
        await actions.updatePost(pendingApprovalPost.id, { 
          approved: true,
          status: 'scheduled'
        })
        toast.success('Post wurde genehmigt und geplant!')
      } else {
        // Keep as draft but mark as reviewed
        await actions.updatePost(pendingApprovalPost.id, { 
          approved: false,
          status: 'draft'
        })
        toast.info('Post bleibt als Entwurf gespeichert.')
      }
      
      // Refresh posts
      await actions.fetchPosts()
    } catch (error) {
      console.error('Error approving post:', error)
      toast.error('Fehler beim Genehmigen des Posts')
    } finally {
      setShowApprovalDialog(false)
      setPendingApprovalPost(null)
    }
  }

  const handlePostSave = async (updatedPost: any) => {
    if (!user) return;
    
    try {
      // Parse the date with precision to avoid timezone shifts
      const postDate = new Date(updatedPost.date);
      
      // Extract date and time components in local timezone to maintain precision
      const scheduledDate = `${postDate.getFullYear()}-${String(postDate.getMonth() + 1).padStart(2, '0')}-${String(postDate.getDate()).padStart(2, '0')}`;
      const scheduledTime = `${String(postDate.getHours()).padStart(2, '0')}:${String(postDate.getMinutes()).padStart(2, '0')}`;
      
      // Convert the post data to match the database schema
      const updateData = {
        title: updatedPost.title || selectedPost?.title || 'Untitled Post',
        content: updatedPost.text,
        platforms: updatedPost.platforms,
        image: updatedPost.media,
        status: updatedPost.status,
        scheduledDate: scheduledDate,
        scheduledTime: scheduledTime,
        likes: updatedPost.likes || 0,
        comments: updatedPost.comments || 0,
        shares: selectedPost?.shares || 0
      };

      // Update the post in the database and global state
      await actions.updatePost(updatedPost.id, updateData);
      
      // Update the selected post in local state immediately so the popup reflects changes
      setSelectedPost(updatedPost);
      
      // Force a refresh of all posts to ensure all views are updated
      await actions.fetchPosts();
      
      toast.success('Post updated successfully!');
      
      // Don't close the popup immediately, let the user see the changes
      // setIsPostDetailOpen(false);
    } catch (error) {
      console.error('Error updating post:', error);
      toast.error('Failed to update post');
    }
  };

  const handlePostDelete = async (postId: string) => {
    if (!user) return
    
    try {
      await actions.deletePost(postId)
    } catch (error) {
      console.error('Error deleting post:', error)
    }
  }

  const handlePostDuplicate = async (post: any) => {
    if (!user) return
    
    try {
      await actions.addPost({
        title: `${post.title} (Copy)`,
        content: post.content,
        platforms: post.platforms,
        image: post.image,
        scheduledDate: new Date().toISOString().split('T')[0],
        scheduledTime: '12:00',
        status: 'draft',
        likes: 0,
        comments: 0,
        shares: 0,
        createdAt: new Date().toLocaleDateString(),
        updatedAt: new Date().toLocaleDateString()
      })
    } catch (error) {
      console.error('Error duplicating post:', error)
    }
  }

  // Idea management handlers
  const handleAddIdea = () => {
    // Open idea creation dialog or navigate to content ideas page
    toast.info("Idea creation coming soon! Use the AI assistant to generate ideas.")
  }

  const handleEditIdea = (idea: IdeaCardData) => {
    // Handle idea editing
    const updatedIdeas = ideas.map(i => i.id === idea.id ? idea : i)
    setIdeas(updatedIdeas)
  }

  const handleDeleteIdea = (ideaId: string) => {
    setIdeas(prev => prev.filter(i => i.id !== ideaId))
    toast.success("Idea deleted successfully")
  }

  const handleDuplicateIdea = (idea: IdeaCardData) => {
    const duplicatedIdea: IdeaCardData = {
      ...idea,
      id: `idea-${Date.now()}`,
      title: `${idea.title} (Copy)`,
      savedAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      isImplemented: false,
      implementedPostId: undefined
    }
    setIdeas(prev => [duplicatedIdea, ...prev])
    toast.success("Idea duplicated successfully")
  }

  const handleConvertIdeaToPost = async (idea: IdeaCardData) => {
    if (!user) return
    
    // Check if this idea has already been converted to a post
    if (idea.isImplemented) {
      toast.info("Diese Idee wurde bereits zu einem Beitrag konvertiert")
      return
    }
    
    // Check if this is a reel idea - if so, open the trend optimization workflow
    if (idea.category === 'trend-reels') {
      const trendData = convertIdeaToTrendData(idea)
      setSelectedTrendData(trendData)
      setShowTrendWorkflow(true)
      return
    }
    
    // Check if this is a content strategy - if so, open the content strategy workflow
    if (idea.category === 'content-strategies' || idea.category === 'ai-strategies') {
      const contentStrategyData = convertIdeaToContentStrategyData(idea)
      setSelectedContentStrategyData(contentStrategyData)
      setShowContentStrategyWorkflow(true)
      return
    }
    
    // For other idea types, prepare content for the create post dialog
    // IMPORTANT: We no longer create posts immediately. Instead, we open the
    // CreatePostDialog with pre-filled content to let the user complete the creation process.
    // This prevents unwanted post creation and ensures proper user confirmation.
    const prefilledContent = {
      title: idea.title,
      description: idea.description + (idea.content.hook ? `\n\nHook: ${idea.content.hook}` : ''),
      hashtags: idea.content.hashtags || [],
      category: idea.category,
      source: idea.source,
      tags: idea.tags
    }
    
    // Set the content to be used in the create post dialog
    setConvertingIdeaContent(prefilledContent)
    
    // Open create post dialog with the idea content
    setIsCreatePostOpen(true)
    
    toast.info("Idee in Post-Editor geöffnet. Vervollständigen Sie die Erstellung.")
  }

  const handleSaveIdea = (idea: IdeaCardData) => {
    const updatedIdeas = ideas.map(i => 
      i.id === idea.id 
        ? { ...idea, lastModified: new Date().toISOString() }
        : i
    )
    setIdeas(updatedIdeas)
  }

  const handleAIPlanningToggle = async () => {
    if (!user?.id) {
      toast.error('Bitte melde dich an, um AI-Planung zu nutzen')
      return
    }

    if (isAIPlanningMode) {
      // Turn off AI mode
      setIsAIPlanningMode(false)
      setAiPlanData(null)
      // Go back to current month
      setCurrentDate(new Date())
      return
    }

    // Turn on AI mode
    setIsAIPlanningMode(true)
    setIsGeneratingPlan(true)
    
    // Switch to next month with animation
    const nextMonth = new Date()
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    setCurrentDate(nextMonth)
    
    // Switch to calendar view automatically
    setSelectedView("calendar")

    try {
      const targetMonth = nextMonth.toISOString().substring(0, 7) // YYYY-MM format
      
      toast.info('🤖 AI analysiert deine Inhalte...', {
        duration: 2000,
      })

      const response = await fetch('/api/ai-planning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          targetMonth
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Fehler beim Erstellen des AI-Plans')
      }

      setAiPlanData(result.data)
      
      toast.success('🎉 AI-Entwürfe erfolgreich erstellt!', {
        description: `${result.data.postsGenerated} Entwürfe für ${targetMonth} erstellt. Überprüfen Sie diese in der Entwürfe-Ansicht.`,
        duration: 4000,
      })

      // Refresh the posts to show the new AI-generated content
      await actions.fetchPosts()

    } catch (error) {
      console.error('AI Planning Error:', error)
      toast.error('Fehler beim Erstellen des AI-Plans', {
        description: error instanceof Error ? error.message : 'Unbekannter Fehler'
      })
      setIsAIPlanningMode(false)
    } finally {
      setIsGeneratingPlan(false)
    }
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1)
      } else {
        newDate.setMonth(newDate.getMonth() + 1)
      }
      return newDate
    })
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const getCalendarDays = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    
    // Get first day of the month
    const firstDay = new Date(year, month, 1)
    // Get last day of the month
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    
    // Get day of week for first day (0 = Sunday, 1 = Monday, etc.)
    const firstDayOfWeek = firstDay.getDay()
    
    // Calculate how many days from previous month to show
    // Monday = 1, so we want: Mon=0, Tue=1, Wed=2, Thu=3, Fri=4, Sat=5, Sun=6
    const startingEmptyDays = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1
    
    // Get previous month info
    const prevMonth = month === 0 ? 11 : month - 1
    const prevYear = month === 0 ? year - 1 : year
    const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate()
    
    // Build calendar array
    const calendarDays = []
    
    // Add previous month days
    for (let i = startingEmptyDays - 1; i >= 0; i--) {
      calendarDays.push({
        day: daysInPrevMonth - i,
        isCurrentMonth: false,
        isPreviousMonth: true,
        isNextMonth: false,
        date: new Date(prevYear, prevMonth, daysInPrevMonth - i)
      })
    }
    
    // Add current month days
    for (let day = 1; day <= daysInMonth; day++) {
      calendarDays.push({
        day: day,
        isCurrentMonth: true,
        isPreviousMonth: false,
        isNextMonth: false,
        date: new Date(year, month, day)
      })
    }
    
    // Add next month days to complete the grid (make sure we have full weeks)
    const totalCells = calendarDays.length
    const cellsNeeded = Math.ceil(totalCells / 7) * 7
    const nextMonthDays = cellsNeeded - totalCells
    
    const nextMonth = month === 11 ? 0 : month + 1
    const nextYear = month === 11 ? year + 1 : year
    
    for (let day = 1; day <= nextMonthDays; day++) {
      calendarDays.push({
        day: day,
        isCurrentMonth: false,
        isPreviousMonth: false,
        isNextMonth: true,
        date: new Date(nextYear, nextMonth, day)
      })
    }
    
    return calendarDays
  }

  const handleDragStart = (e: React.DragEvent, post: any) => {
    // Set drag state in React state instead of DOM manipulation
    setDragVisuals({ draggedId: post.id, dragOverDate: null })
    actions.setDragState(post.id, null)
    
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('application/json', JSON.stringify(post))
    
    // Use CSS custom properties for smooth visual feedback
    const element = e.currentTarget as HTMLElement
    element.style.setProperty('--drag-scale', '0.95')
    element.style.setProperty('--drag-opacity', '0.6')
    element.style.setProperty('--drag-rotate', '1deg')
  }

  const handleDragEnd = (e: React.DragEvent) => {
    // Reset visual state
    setDragVisuals({ draggedId: null, dragOverDate: null })
    actions.setDragState(null, null)
    
    // Reset CSS properties
    const element = e.currentTarget as HTMLElement
    element.style.removeProperty('--drag-scale')
    element.style.removeProperty('--drag-opacity')
    element.style.removeProperty('--drag-rotate')
  }

  const handleDragOver = (e: React.DragEvent, date: Date) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    const dateString = date.toISOString().split('T')[0]
    
    // Update drag over state if it's different
    if (dragVisuals.dragOverDate !== dateString) {
      setDragVisuals(prev => ({ ...prev, dragOverDate: dateString }))
      actions.setDragState(state.draggedPostId, dateString)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear drag over if we're actually leaving the calendar cell
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragVisuals(prev => ({ ...prev, dragOverDate: null }))
      actions.setDragState(state.draggedPostId, null)
    }
  }

  const handleDrop = async (e: React.DragEvent, date: Date) => {
    e.preventDefault()
    
    // Clear drag states
    setDragVisuals({ draggedId: null, dragOverDate: null })
    actions.setDragState(null, null)
    
    // Get dragged post from context
    const draggedPost = state.draggedPostId ? actions.getPostById(state.draggedPostId) : null
    
    if (draggedPost) {
      const newDateString = date.toISOString().split('T')[0]
      const currentTime = draggedPost.scheduledTime
      
      try {
        // Use optimistic update for immediate feedback
        await actions.updatePostDate(draggedPost.id, newDateString, currentTime)
      } catch (error) {
        console.error('Error updating post date:', error)
      }
    }
  }

  // Update getPostsForDate to use the PostContext method
  const getPostsForDate = (date: Date) => {
    return actions.getPostsForDate(date)
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const renderCalendar = () => {
    const calendarDays = getCalendarDays(currentDate)
    const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

    return (
      <div className="space-y-6">
        {/* Calendar Header */}
        <div className="flex items-center justify-center mb-6">
          <div className="flex items-center gap-4 bg-white rounded-full shadow-sm border border-gray-200 p-2 min-w-[280px]">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth('prev')}
              className="h-7 w-7 p-0 rounded-full hover:bg-gray-100 transition-colors shrink-0"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </Button>
            
            <div className="flex-1 text-center">
              <span className="text-sm font-medium text-gray-700">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth('next')}
              className="h-7 w-7 p-0 rounded-full hover:bg-gray-100 transition-colors shrink-0"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </Button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className={`bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm transition-all duration-200 ${
          dragVisuals.draggedId ? 'ring-2 ring-teal-200/60 bg-teal-50/20' : ''
        }`}>
          {/* Week Headers */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {weekDays.map(day => (
              <div key={day} className="p-4 text-center">
                <span className="text-sm font-medium text-gray-500">{day}</span>
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7">
            {calendarDays.map((dayData, index) => {
                          const postsForDate = getPostsForDate(dayData.date)
            const isCurrentDay = isToday(dayData.date)
            const dateString = dayData.date.toISOString().split('T')[0]
            const isDragOver = dragVisuals.dragOverDate === dateString
              
              return (
                <div
                  key={`${dayData.date.getTime()}-${index}`}
                  className={`calendar-cell h-32 border-b border-r border-gray-50 p-2 relative flex flex-col ${
                    isCurrentDay ? 'bg-gradient-to-br from-teal-50/80 to-cyan-50/80' : 'hover:bg-gray-50/30'
                  } ${
                    !dayData.isCurrentMonth ? 'opacity-40' : ''
                  } ${
                    isDragOver ? 'drop-zone-active bg-gradient-to-br from-teal-100/80 to-cyan-100/80 ring-1 ring-teal-300/60' : ''
                  }`}
                  onDragOver={(e) => handleDragOver(e, dayData.date)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, dayData.date)}
                >
                  <div className="flex items-center justify-between mb-2 flex-shrink-0">
                    <span className={`text-sm font-medium transition-all ${
                      isCurrentDay 
                        ? 'w-7 h-7 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-full flex items-center justify-center text-xs shadow-lg' 
                        : dayData.isCurrentMonth 
                        ? 'text-gray-700' 
                        : 'text-gray-400'
                    }`}>
                      {dayData.day}
                    </span>
                    {postsForDate.length > 0 && dayData.isCurrentMonth && (
                      <div className="flex items-center gap-1">
                        {postsForDate.some(p => p.status === 'published') && (
                          <Badge className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full shadow-sm">
                            {postsForDate.filter(p => p.status === 'published').length}
                          </Badge>
                        )}
                        {postsForDate.some(p => p.status === 'scheduled') && (
                          <Badge className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full shadow-sm">
                            {postsForDate.filter(p => p.status === 'scheduled').length}
                          </Badge>
                        )}
                        {postsForDate.some(p => p.status === 'draft' && p.approved) && (
                          <Badge className="bg-cyan-500 text-white text-xs px-2 py-0.5 rounded-full shadow-sm">
                            {postsForDate.filter(p => p.status === 'draft' && p.approved).length}
                          </Badge>
                        )}
                        {postsForDate.some(p => p.status === 'draft' && !p.approved && p.content?.trim() && p.platforms?.length) && (
                          <Badge className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                            {postsForDate.filter(p => p.status === 'draft' && !p.approved && p.content?.trim() && p.platforms?.length).length}
                          </Badge>
                        )}
                        {postsForDate.some(p => p.status === 'draft' && (!p.content?.trim() || !p.platforms?.length)) && (
                          <Badge className="bg-gray-500 text-white text-xs px-2 py-0.5 rounded-full shadow-sm">
                            {postsForDate.filter(p => p.status === 'draft' && (!p.content?.trim() || !p.platforms?.length)).length}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Enhanced Interactive Post Cards - Only show for current month */}
                  {dayData.isCurrentMonth && (
                    <div className="flex-1 space-y-1 overflow-hidden">
                      {postsForDate.length > 0 ? (
                        <div className="space-y-1">
                          {postsForDate.slice(0, 3).map((post, idx) => (
                            <div
                              key={post.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, post)}
                              onDragEnd={handleDragEnd}
                              onMouseEnter={() => setHoveredPost(post.id)}
                              onMouseLeave={() => setHoveredPost(null)}
                              onClick={() => handlePostClick(post)}
                              className={`group relative p-1.5 rounded-md border transition-all duration-150 cursor-pointer ${
                                post.status === 'scheduled' 
                                  ? 'bg-blue-50/80 border-blue-200/60 hover:bg-blue-100/80 hover:border-blue-300/60' 
                                  : post.status === 'published'
                                  ? 'bg-green-50/80 border-green-200/60 hover:bg-green-100/80 hover:border-green-300/60'
                                  : post.status === 'draft' && post.approved
                                  ? 'bg-cyan-50/80 border-cyan-200/60 hover:bg-cyan-100/80 hover:border-cyan-300/60'
                                  : post.status === 'draft' && !post.approved && post.content?.trim() && post.platforms?.length
                                  ? 'bg-orange-50/80 border-orange-200/60 hover:bg-orange-100/80 hover:border-orange-300/60 animate-pulse'
                                  : 'bg-gray-50/80 border-gray-200/60 hover:bg-gray-100/80 hover:border-gray-300/60'
                              } ${
                                hoveredPost === post.id ? 'shadow-sm ring-1 ring-teal-200/60' : ''
                              } ${
                                post.isOptimistic ? 'optimistic-update' : ''
                              }`}
                            >
                            {/* Drag Handle */}
                            <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Move className="w-3 h-3 text-gray-400" />
                            </div>

                            <div className="flex items-start gap-1.5">
                              <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${
                                post.status === 'scheduled' 
                                  ? 'bg-blue-500' 
                                  : post.status === 'published' 
                                  ? 'bg-green-500' 
                                  : post.status === 'draft' && post.approved
                                  ? 'bg-cyan-500'
                                  : post.status === 'draft' && !post.approved && post.content?.trim() && post.platforms?.length
                                  ? 'bg-orange-500 animate-pulse'
                                  : 'bg-gray-500'
                              }`}></div>
                              <div className="flex-1 min-w-0">
                                                                  <div className="flex items-center gap-1">
                                    {post.status === 'scheduled' && <Clock className="w-3 h-3 text-blue-600" />}
                                    {post.status === 'published' && <Eye className="w-3 h-3 text-green-600" />}
                                    {post.status === 'draft' && post.approved && <Calendar className="w-3 h-3 text-cyan-600" />}
                                    {post.status === 'draft' && !post.approved && post.content?.trim() && post.platforms?.length && (
                                      <div className="w-3 h-3 rounded-full bg-orange-500 flex items-center justify-center">
                                        <span className="text-white text-xs font-bold">!</span>
                                      </div>
                                    )}
                                    {post.status === 'draft' && (!post.content?.trim() || !post.platforms?.length) && <Edit className="w-3 h-3 text-gray-600" />}
                                                                      <span className={`text-xs font-medium truncate ${
                                      post.status === 'scheduled' 
                                        ? 'text-blue-700' 
                                        : post.status === 'published' 
                                        ? 'text-green-700' 
                                        : post.status === 'draft' && post.approved
                                        ? 'text-cyan-700'
                                        : post.status === 'draft' && !post.approved && post.content?.trim() && post.platforms?.length
                                        ? 'text-orange-700'
                                        : 'text-gray-700'
                                    }`}>
                                    {/* Enhanced title display with better fallbacks */}
                                    {post.title && post.title !== 'Untitled Post' 
                                      ? post.title 
                                      : post.content 
                                        ? post.content.substring(0, 30) + '...' 
                                        : 'Entwurf bearbeiten'
                                    }
                                  </span>
                                  {/* Add indicator for incomplete posts */}
                                  {(post.status === 'draft' || !post.content?.trim() || !post.platforms?.length || post.title === 'Untitled Post') && (
                                    <span className="text-xs text-orange-500 font-medium">●</span>
                                  )}
                                </div>
                                <div className={`text-xs opacity-80 truncate ${
                                  post.status === 'scheduled' 
                                    ? 'text-blue-600' 
                                    : post.status === 'published' 
                                    ? 'text-green-600' 
                                    : post.status === 'draft' && post.approved
                                    ? 'text-cyan-600'
                                    : post.status === 'draft' && !post.approved && post.content?.trim() && post.platforms?.length
                                    ? 'text-orange-600'
                                    : 'text-gray-600'
                                }`}>
                                  {post.scheduledTime}
                                  {/* Show status hint for incomplete posts */}
                                  {(post.status === 'draft' || !post.content?.trim() || !post.platforms?.length || post.title === 'Untitled Post') && (
                                    <span className="ml-1 text-orange-500">• Vervollständigen</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 mt-1">
                                  {post.platforms.slice(0, 3).map(platform => {
                                    const Icon = {
                                      instagram: Instagram,
                                      facebook: Facebook,
                                      twitter: Twitter,
                                      linkedin: Linkedin,
                                      tiktok: Video
                                    }[platform]
                                    return Icon ? (
                                      <div
                                        key={platform}
                                        className="w-4 h-4 bg-white/60 rounded-full flex items-center justify-center"
                                      >
                                        <Icon className="w-2.5 h-2.5 text-gray-600" />
                                      </div>
                                    ) : null
                                  })}
                                  {post.platforms.length > 3 && (
                                    <span className="text-xs text-gray-500 ml-1">
                                      +{post.platforms.length - 3}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Enhanced Hover Tooltip */}
                            {hoveredPost === post.id && (
                              <div className="absolute z-50 bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg max-w-xs">
                                <div className="font-medium mb-1">
                                  {post.title && post.title !== 'Untitled Post' ? post.title : 'Entwurf'}
                                </div>
                                <div className="text-gray-300 line-clamp-2 mb-1">
                                  {post.content || 'Kein Inhalt verfügbar'}
                                </div>
                                {/* Action hint based on post status */}
                                {post.status === 'draft' && (!post.content?.trim() || !post.platforms?.length || post.title === 'Untitled Post') ? (
                                  <div className="text-orange-300 text-xs mt-1 border-t border-gray-700 pt-1">
                                    Klicken zum Vervollständigen
                                  </div>
                                ) : post.status === 'draft' && !post.approved && post.content?.trim() && post.platforms?.length ? (
                                  <div className="text-orange-300 text-xs mt-1 border-t border-gray-700 pt-1">
                                    Klicken zum Genehmigen
                                  </div>
                                ) : post.status === 'draft' && post.approved ? (
                                  <div className="text-cyan-300 text-xs mt-1 border-t border-gray-700 pt-1">
                                    Genehmigt - Klicken für Details
                                  </div>
                                ) : (
                                  <div className="text-blue-300 text-xs mt-1 border-t border-gray-700 pt-1">
                                    Klicken für Details
                                  </div>
                                )}
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                              </div>
                            )}
                          </div>
                          ))
                          }
                          {postsForDate.length > 3 && (
                            <div className="text-xs text-gray-500 text-center py-1">
                              +{postsForDate.length - 3} more
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* Drop zone indicator */}
                  {isDragOver && (
                    <div className="absolute inset-0 rounded-lg border-2 border-dashed border-teal-400 bg-teal-50/50 flex items-center justify-center">
                      <div className="text-teal-600 text-xs font-medium">Drop here</div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full bg-gray-50/50 overflow-y-auto">
      {/* Top Header Section */}
      <div className="max-w-[1400px] mx-auto p-6">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Content Hub</h1>
              <p className="text-gray-600">Verwalten Sie Ihre Entwürfe und geplanten Inhalte</p>
            </div>
            {/* Restored Clean New Post Button */}
            <Button 
              onClick={() => setIsCreatePostOpen(true)}
              size="default" 
              className="h-10 text-sm gap-2 px-4 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-full shadow-sm hover:shadow-md transition-all duration-200"
            >
              <Plus className="w-4 h-4" />
              Neuer Beitrag
            </Button>
          </div>

          {/* View Filter - Matching Dashboard Style */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex bg-white rounded-full border border-gray-200 p-1 shadow-sm">
              <Button
                variant={selectedView === 'calendar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedView('calendar')}
                className={`rounded-full px-4 py-2 text-sm transition-all ${
                  selectedView === 'calendar' 
                    ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <CalendarIcon className="w-4 h-4 mr-2" />
                Kalender
              </Button>
              <Button
                variant={selectedView === 'ideas' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedView('ideas')}
                className={`rounded-full px-4 py-2 text-sm transition-all ${
                  selectedView === 'ideas' 
                    ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Lightbulb className="w-4 h-4 mr-2" />
                Ideen
              </Button>
              <Button
                variant={selectedView === 'drafts' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedView('drafts')}
                className={`rounded-full px-4 py-2 text-sm transition-all ${
                  selectedView === 'drafts' 
                    ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Edit className="w-4 h-4 mr-2" />
                Entwürfe
              </Button>
            </div>

            {/* AI Planning Toggle Button */}
            <div>
              <button
                onClick={handleAIPlanningToggle}
                disabled={isGeneratingPlan}
                className={`relative inline-flex items-center gap-2 px-4 py-2.5 rounded-full font-medium text-sm transition-all duration-300 ease-in-out group ${
                  isAIPlanningMode
                    ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white shadow-lg'
                    : 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white hover:shadow-lg'
                } ${isGeneratingPlan ? 'animate-pulse' : 'hover:scale-105'}`}
                style={{
                  minWidth: '140px',
                  height: '42px'
                }}
              >
                {/* Animated background pulse */}
                {isAIPlanningMode && (
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 opacity-0 group-hover:opacity-75 group-hover:animate-ping"></div>
                )}
                
                {/* Sparkle effect for active mode */}
                {isAIPlanningMode && (
                  <div className="absolute inset-0 overflow-hidden rounded-full">
                    <div className="absolute top-1 right-1 w-1 h-1 bg-white rounded-full animate-ping" style={{ animationDelay: '0s' }}></div>
                    <div className="absolute top-2 left-3 w-0.5 h-0.5 bg-white rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
                    <div className="absolute bottom-2 right-3 w-0.5 h-0.5 bg-white rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
                  </div>
                )}

                {/* Icon and text */}
                <div className="relative z-10 flex items-center gap-2">
                  {isGeneratingPlan ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Brain className="w-4 h-4" />
                  )}
                  <span className="font-medium">
                    {isGeneratingPlan 
                      ? 'Erstelle...' 
                      : isAIPlanningMode 
                      ? 'AI Aktiv' 
                      : 'AI Planer'
                    }
                  </span>
                  {isAIPlanningMode && !isGeneratingPlan && (
                    <Sparkles className="w-3 h-3 animate-pulse" />
                  )}
                </div>

                {/* Glow effect */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-30 blur-md transition-opacity duration-300"></div>
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="space-y-6">
          {selectedView === "ideas" && (
            isLoadingIdeas ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
                  <p className="text-gray-600">Lade deine gespeicherten Ideen...</p>
                </div>
              </div>
            ) : (
              <IdeaGrid
                ideas={ideas}
                onAddIdea={handleAddIdea}
                onEditIdea={handleEditIdea}
                onDeleteIdea={handleDeleteIdea}
                onDuplicateIdea={handleDuplicateIdea}
                onConvertToPost={handleConvertIdeaToPost}
                onSaveIdea={handleSaveIdea}
              />
            )
          )}

          {selectedView === "drafts" && (
            <div className="space-y-6">
              {drafts.length > 0 ? (
                <>
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Drag any draft to the calendar to schedule it</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {drafts.map((draft) => (
                  <Card
                    key={draft.id}
                    draggable
                    onDragStart={(e) => {
                      const draftAsPost = {
                        id: draft.id,
                        title: 'Draft Post',
                        content: draft.content,
                        platforms: draft.platforms,
                        image: draft.image,
                        scheduledDate: new Date().toISOString().split('T')[0],
                        scheduledTime: '12:00',
                        status: 'draft',
                        likes: draft.likes,
                        comments: draft.comments,
                        shares: draft.shares,
                        createdAt: draft.createdAt,
                        approved: draft.approved // Include approved status
                      }
                      handleDragStart(e, draftAsPost)
                    }}
                    onDragEnd={handleDragEnd}
                    className="overflow-hidden group border border-gray-100 shadow-sm bg-white hover:shadow-md transition-all duration-300 rounded-2xl cursor-move"
                  >
                    <CardContent className="p-0">
                      <div className="aspect-video bg-gray-100 rounded-t-2xl overflow-hidden relative">
                        <img
                          src={draft.image || "/placeholder.svg"}
                          alt="Draft content"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = '/placeholder.svg'
                          }}
                        />
                        <div className="absolute top-3 right-3">
                          <Badge className="bg-white/90 backdrop-blur-sm text-gray-600 text-xs px-2.5 py-1 rounded-full border shadow-sm">
                            Draft
                          </Badge>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-1.5 mb-3">
                          {draft.platforms.map((platform) => (
                            <div
                              key={platform}
                              className="w-6 h-6 bg-gray-50 rounded-full flex items-center justify-center"
                            >
                              {platform === "instagram" && <Instagram className="w-3.5 h-3.5 text-pink-600" />}
                              {platform === "facebook" && <Facebook className="w-3.5 h-3.5 text-blue-600" />}
                              {platform === "twitter" && <Twitter className="w-3.5 h-3.5 text-blue-400" />}
                              {platform === "linkedin" && <Linkedin className="w-3.5 h-3.5 text-blue-700" />}
                              {platform === "tiktok" && <Video className="w-3.5 h-3.5 text-black" />}
                            </div>
                          ))}
                          <span className="text-xs text-gray-500 ml-auto">{draft.createdAt}</span>
                        </div>
                        <p className="text-sm text-gray-700 mb-4 line-clamp-3 leading-relaxed">{draft.content}</p>
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm" 
                            className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-full h-8 text-xs"
                            onClick={() => handleUpdatePostStatus(draft.id, 'published')}
                          >
                            Post Now
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="flex-1 border-gray-200 rounded-full h-8 hover:bg-gray-50 text-xs"
                            onClick={() => handleUpdatePostStatus(draft.id, 'scheduled')}
                          >
                            Schedule
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="px-2 h-8 w-8 rounded-full hover:bg-gray-100"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl rounded-2xl">
                              <DialogHeader>
                                <DialogTitle>Edit Post</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <Textarea
                                  placeholder="Schreiben Sie Ihre Bildunterschrift..."
                                  defaultValue={draft.content}
                                  className="min-h-[100px] border-gray-200 rounded-xl resize-none"
                                />
                                <div className="flex gap-4">
                                  <Button className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-full">
                                    Save Changes
                                  </Button>
                                  <Button variant="outline" className="rounded-full">
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-r from-teal-500/10 to-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Edit className="w-8 h-8 text-teal-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No drafts yet</h3>
                  <p className="text-gray-600 mb-6">Create your first draft to get started. You can then schedule it for later or publish it immediately.</p>
                  <Button 
                    onClick={() => setIsCreatePostOpen(true)}
                    className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white rounded-full px-6"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Draft
                  </Button>
                </div>
              )}
            </div>
          )}

          {selectedView === "calendar" && renderCalendar()}
        </div>
      </div>

      <CreatePostDialog
        open={isCreatePostOpen} 
        onOpenChange={(open) => {
          setIsCreatePostOpen(open)
          // Clear converting idea content and editing post ID when dialog closes
          if (!open) {
            setConvertingIdeaContent(null)
            setEditingPostId(null)
          }
        }} 
        onPostCreated={async () => {
          try {
            // Refresh posts to show updates
            await actions.fetchPosts()
            
            // Handle different scenarios
            if (editingPostId) {
              // We were editing an existing post
              toast.success("Beitrag erfolgreich aktualisiert!")
            } else if (convertingIdeaContent) {
              // We were converting an idea to post
              const ideaToMark = ideas.find(i => i.title === convertingIdeaContent.title)
              if (ideaToMark) {
                const updatedIdeas = ideas.map(i => 
                  i.id === ideaToMark.id 
                    ? { ...i, isImplemented: true, implementedPostId: `post-${Date.now()}` }
                    : i
                )
                setIdeas(updatedIdeas)
                toast.success("Idee erfolgreich zu Post konvertiert!")
              }
            } else {
              // New post created
              toast.success("Neuer Beitrag erfolgreich erstellt!")
            }
            
            // Clear states
            setConvertingIdeaContent(null)
            setEditingPostId(null)
          } catch (error) {
            console.error('Error in post creation callback:', error)
          }
        }}
        initialContent={convertingIdeaContent || undefined}
      />

      {/* Post Detail Popup */}
      <PostDetailPopup
        post={selectedPost ? {
          id: selectedPost.id,
          media: selectedPost.image,
          mediaType: "image",
          text: selectedPost.content,
          platforms: selectedPost.platforms as ("instagram" | "facebook" | "twitter" | "linkedin" | "tiktok")[],
          status: selectedPost.status as "scheduled" | "published" | "draft" | "failed",
          date: selectedPost.createdAt,
          likes: selectedPost.likes,
          comments: selectedPost.comments
        } : null}
        isOpen={isPostDetailOpen}
        onClose={() => setIsPostDetailOpen(false)}
        onSave={(updatedPost) => {
          const convertedPost = {
            id: updatedPost.id,
            title: selectedPost?.title || 'Untitled Post',
            content: updatedPost.text,
            platforms: updatedPost.platforms,
            image: updatedPost.media,
            scheduledDate: selectedPost?.scheduledDate || new Date().toISOString().split('T')[0],
            scheduledTime: selectedPost?.scheduledTime || '12:00',
            status: updatedPost.status as 'draft' | 'scheduled' | 'published',
            likes: updatedPost.likes || 0,
            comments: updatedPost.comments || 0,
            shares: selectedPost?.shares || 0,
            createdAt: updatedPost.date
          }
          handlePostSave(convertedPost)
        }}
        onDelete={handlePostDelete}
        onDuplicate={(post) => {
          const convertedPost = {
            id: post.id,
            title: selectedPost?.title || 'Untitled Post',
            content: post.text,
            platforms: post.platforms,
            image: post.media,
            scheduledDate: selectedPost?.scheduledDate || new Date().toISOString().split('T')[0],
            scheduledTime: selectedPost?.scheduledTime || '12:00',
            status: post.status as 'draft' | 'scheduled' | 'published',
            likes: post.likes || 0,
            comments: post.comments || 0,
            shares: selectedPost?.shares || 0,
            createdAt: post.date
          }
          handlePostDuplicate(convertedPost)
        }}
      />

              {/* Approval Dialog */}
        <AlertDialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
          <AlertDialogContent className="max-w-md rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-center">Post genehmigen</AlertDialogTitle>
              <AlertDialogDescription className="text-center space-y-2">
                <div className="text-gray-700 font-medium">
                  Möchten Sie diesen Entwurf genehmigen und planen?
                </div>
                <div className="text-gray-600 text-sm bg-gray-50 p-3 rounded-lg">
                  <div className="font-medium text-gray-800 mb-1">
                    {pendingApprovalPost?.title || 'Untitled Post'}
                  </div>
                  <div className="text-xs line-clamp-2">
                    {pendingApprovalPost?.content || 'Kein Inhalt'}
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex gap-2">
              <AlertDialogCancel onClick={() => handleApprovePost(false)} className="rounded-full">
                Zurückstellen
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => handleApprovePost(true)} 
                className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-full"
              >
                ✓ Genehmigen & Planen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  )
} 