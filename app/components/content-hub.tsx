"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Edit, Instagram, Facebook, Twitter, Linkedin, Video, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Eye, Heart, MessageCircle, Share2, Move, Loader2 } from "lucide-react"
import { MonthlyCalendar } from "@/components/calendar/monthly-calendar"
import type { CalendarEvent } from "@/components/calendar/event-card"
import { AIPostWorkflow } from "./ai-post-workflow"
import { CreatePostDialog } from "./create-post-dialog"
import { PostDetailPopup } from "./post-detail-popup"
import { IdeaGrid } from "@/components/idea-cards/idea-grid"
import type { IdeaCardData } from "@/components/idea-cards/idea-card"
import { usePost } from "@/lib/post-context"
import { useAuth } from "@/lib/auth-context"
import { CalendarEventsService } from "@/lib/data-service"
import type { CalendarEvent as DatabaseCalendarEvent } from "@/lib/supabase"
import { sampleIdeas } from "@/lib/sample-ideas"
import { toast } from "sonner"

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

export function ContentHub() {
  const { user } = useAuth()
  const { state, actions } = usePost()
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false)
  const [selectedView, setSelectedView] = useState("drafts")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [loadingMore, setLoadingMore] = useState(false)
  const [selectedPost, setSelectedPost] = useState<any>(null)
  const [isPostDetailOpen, setIsPostDetailOpen] = useState(false)
  const [hoveredPost, setHoveredPost] = useState<string | null>(null)
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [dragVisuals, setDragVisuals] = useState<{
    draggedId: string | null
    dragOverDate: string | null
  }>({ draggedId: null, dragOverDate: null })
  const [ideas, setIdeas] = useState<IdeaCardData[]>(sampleIdeas)

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
    shares: post.shares
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
    setSelectedPost(post)
    setIsPostDetailOpen(true)
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
    
    try {
      // Convert idea to post
      await actions.addPost({
        title: idea.title,
        content: idea.description + (idea.content.hook ? `\n\nHook: ${idea.content.hook}` : ''),
        platforms: idea.content.platforms || ['instagram'],
        image: '/placeholder.svg',
        scheduledDate: new Date().toISOString().split('T')[0],
        scheduledTime: '12:00',
        status: 'draft',
        likes: 0,
        comments: 0,
        shares: 0,
        createdAt: new Date().toLocaleDateString(),
        updatedAt: new Date().toLocaleDateString()
      })
      
      // Mark idea as implemented
      const updatedIdeas = ideas.map(i => 
        i.id === idea.id 
          ? { ...i, isImplemented: true, implementedPostId: `post-${Date.now()}` }
          : i
      )
      setIdeas(updatedIdeas)
      
      toast.success("Idea converted to draft post!")
    } catch (error) {
      console.error('Error converting idea to post:', error)
      toast.error("Failed to convert idea to post")
    }
  }

  const handleSaveIdea = (idea: IdeaCardData) => {
    const updatedIdeas = ideas.map(i => 
      i.id === idea.id 
        ? { ...idea, lastModified: new Date().toISOString() }
        : i
    )
    setIdeas(updatedIdeas)
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
                        {postsForDate.some(p => p.status === 'draft') && (
                          <Badge className="bg-gray-500 text-white text-xs px-2 py-0.5 rounded-full shadow-sm">
                            {postsForDate.filter(p => p.status === 'draft').length}
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
                                post.status === 'scheduled' ? 'bg-blue-500' : post.status === 'published' ? 'bg-green-500' : 'bg-gray-500'
                              }`}></div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                  {post.status === 'scheduled' && <Clock className="w-3 h-3 text-blue-600" />}
                                  {post.status === 'published' && <Eye className="w-3 h-3 text-green-600" />}
                                  {post.status === 'draft' && <Edit className="w-3 h-3 text-gray-600" />}
                                  <span className={`text-xs font-medium truncate ${
                                    post.status === 'scheduled' ? 'text-blue-700' : post.status === 'published' ? 'text-green-700' : 'text-gray-700'
                                  }`}>
                                    {post.title || 'Untitled Post'}
                                  </span>
                                </div>
                                <div className={`text-xs opacity-80 truncate ${
                                  post.status === 'scheduled' ? 'text-blue-600' : post.status === 'published' ? 'text-green-600' : 'text-gray-600'
                                }`}>
                                  {post.scheduledTime}
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

                            {/* Hover Tooltip */}
                            {hoveredPost === post.id && (
                              <div className="absolute z-50 bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg max-w-xs">
                                <div className="font-medium mb-1">{post.title || 'Untitled Post'}</div>
                                <div className="text-gray-300 line-clamp-2">{post.content}</div>
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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Content Hub</h1>
              <p className="text-gray-600">Manage your drafts and scheduled content</p>
            </div>
            {/* Restored Clean New Post Button */}
            <Button 
              onClick={() => setIsCreatePostOpen(true)}
              size="default" 
              className="h-10 text-sm gap-2 px-4 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-full shadow-sm hover:shadow-md transition-all duration-200"
            >
              <Plus className="w-4 h-4" />
              New Post
            </Button>
          </div>

          {/* View Filter - Matching Dashboard Style */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center bg-white rounded-full shadow-sm border border-gray-100 p-0.5">
              {[
                { key: "drafts", label: "Drafts" },
                { key: "ideas", label: "Ideas" },
                { key: "calendar", label: "Calendar" },
                { key: "scheduled", label: "Scheduled List" }
              ].map((view) => (
                <button
                  key={view.key}
                  onClick={() => setSelectedView(view.key)}
                  className={`px-6 py-2.5 text-sm font-medium transition-all relative
                    ${selectedView === view.key
                      ? 'rounded-full bg-gradient-to-r from-teal-500/10 to-cyan-500/10 text-teal-600 border border-teal-200'
                      : 'text-gray-600 hover:bg-gray-50 rounded-full'
                    }`}
                >
                  {view.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="space-y-6">
          {selectedView === "ideas" && (
            <IdeaGrid
              ideas={ideas}
              onAddIdea={handleAddIdea}
              onEditIdea={handleEditIdea}
              onDeleteIdea={handleDeleteIdea}
              onDuplicateIdea={handleDuplicateIdea}
              onConvertToPost={handleConvertIdeaToPost}
              onSaveIdea={handleSaveIdea}
            />
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
                        createdAt: draft.createdAt
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
                                  placeholder="Write your caption..."
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

          {selectedView === "scheduled" && (
            <div className="space-y-4">
              {posts.length > 0 ? (
                posts
                  .sort((a, b) => new Date(a.scheduledDate + " " + a.scheduledTime).getTime() - new Date(b.scheduledDate + " " + b.scheduledTime).getTime())
                  .map((post) => (
                  <Card
                    key={post.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, post)}
                    onDragEnd={handleDragEnd}
                    className="overflow-hidden border-0 shadow-sm bg-white hover:shadow-md transition-all duration-200 rounded-2xl cursor-move"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                          <img
                            src={post.image}
                            alt="Post preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-gray-900">{post.title}</h3>
                            <Badge 
                              className={`text-xs px-2 py-1 rounded-full ${
                                post.status === 'scheduled' 
                                  ? 'bg-blue-50 text-blue-600 border-blue-200' 
                                  : 'bg-green-50 text-green-600 border-green-200'
                              }`}
                            >
                              {post.status === 'scheduled' ? 'Scheduled' : 'Published'}
                            </Badge>
                          </div>
                          <p className="text-gray-600 text-sm mb-3 line-clamp-2">{post.content}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <CalendarIcon className="w-4 h-4" />
                                {new Date(post.scheduledDate).toLocaleDateString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {post.scheduledTime}
                              </span>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="flex gap-2">
                                {post.platforms.slice(0, 4).map(platform => {
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
                                      className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center"
                                    >
                                      <Icon className="w-3 h-3 text-gray-600" />
                                    </div>
                                  ) : null
                                })}
                              </div>
                              {post.status === 'published' && (
                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <Heart className="w-3 h-3" />
                                    {post.likes}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <MessageCircle className="w-3 h-3" />
                                    {post.comments}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Share2 className="w-3 h-3" />
                                    {post.shares}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  ))
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-r from-teal-500/10 to-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CalendarIcon className="w-8 h-8 text-teal-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No scheduled posts</h3>
                  <p className="text-gray-600 mb-6">Schedule your first post to see it here. You can schedule drafts by dragging them to the calendar.</p>
                  <Button 
                    onClick={() => setIsCreatePostOpen(true)}
                    className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white rounded-full px-6"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Schedule Post
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <CreatePostDialog
        open={isCreatePostOpen} 
        onOpenChange={setIsCreatePostOpen} 
        onPostCreated={actions.fetchPosts}
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
    </div>
  )
} 