"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Eye, Edit, Move, Loader2, Brain, Sparkles, AlertCircle, Instagram, Facebook, Twitter, Linkedin, Video, ExternalLink } from "lucide-react"
import { MonthlyCalendar } from "@/components/calendar/monthly-calendar"
import type { CalendarEvent } from "@/components/calendar/event-card"
import { usePost } from "@/lib/post-context"
import { useAuth } from "@/lib/auth-context"
import { CalendarEventsService } from "@/lib/data-service"
import type { CalendarEvent as DatabaseCalendarEvent } from "@/lib/supabase"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/cli-dialog"
import { CalendarProvider } from "@/components/cli-calendar-context"
import CliBigCalendar from "@/components/cli-big-calendar"

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

export function CalendarAndPlannerView() {
  const { user } = useAuth()
  const { state, actions } = usePost()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isAIPlanningMode, setIsAIPlanningMode] = useState(false)
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false)
  const [aiPlanData, setAiPlanData] = useState<any>(null)
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [hoveredPost, setHoveredPost] = useState<string | null>(null)
  
  const [dragVisuals, setDragVisuals] = useState<{
    draggedId: string | null
    dragOverDate: string | null
  }>({ draggedId: null, dragOverDate: null })

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

  // Get posts from context for calendar display
  const draftsWithDates = state.drafts.filter(draft => 
    draft.scheduledDate && draft.scheduledTime && 
    draft.scheduledDate.match(/^\d{4}-\d{2}-\d{2}$/) &&
    draft.scheduledTime.match(/^\d{2}:\d{2}$/)
  )
  
  const posts = [
    ...state.scheduled,
    ...state.published,
    ...draftsWithDates
  ].filter(post => {
    return post.scheduledDate && post.scheduledTime && 
           post.scheduledDate.match(/^\d{4}-\d{2}-\d{2}$/) &&
           post.scheduledTime.match(/^\d{2}:\d{2}$/)
  })

  // Synchronize posts as calendar events
  const synchronizePostsAsEvents = () => {
    return posts.map(post => {
      let eventCategory = 'social-media'
      let eventDescription = post.content
      
      if (post.category === 'trend-reels' || 
          post.source === 'trend-explorer' ||
          post.tags?.some(tag => tag.toLowerCase().includes('trend')) ||
          post.content?.toLowerCase().includes('trend') ||
          post.content?.toLowerCase().includes('viral') ||
          post.content?.toLowerCase().includes('tiktok')) {
        eventCategory = 'trend'
        eventDescription = `TREND: ${post.content}`
      }
      else if (post.category === 'content-strategies' || 
               post.category === 'ai-strategies' ||
               post.source === 'content-strategy' ||
               post.tags?.some(tag => tag.toLowerCase().includes('strateg'))) {
        eventCategory = 'content-strategies'
        eventDescription = `CONTENT STRATEGY: ${post.content}`
      }
      
      return {
        id: `post-${post.id}`,
        title: post.title || 'Untitled Post',
        description: eventDescription,
        startDate: post.scheduledDate,
        endDate: post.scheduledDate,
        startTime: post.scheduledTime,
        endTime: post.scheduledTime,
        category: eventCategory,
        color: post.status === 'published' ? '#10b981' : post.status === 'scheduled' ? '#3b82f6' : '#9ca3af',
        allDay: false,
        isRecurring: false,
        postData: post
      }
    })
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
      const events = await CalendarEventsService.getEvents()
      setCalendarEvents(events.map(convertDatabaseEventToEvent))
    } catch (error) {
      console.error('Error deleting event:', error)
    }
  }

  const handleAIPlanningToggle = async () => {
    if (!user?.id) {
      toast.error('Bitte melde dich an, um AI-Planung zu nutzen')
      return
    }

    if (isAIPlanningMode) {
      setIsAIPlanningMode(false)
      setAiPlanData(null)
      setCurrentDate(new Date())
      return
    }

    setIsAIPlanningMode(true)
    setIsGeneratingPlan(true)
    
    const nextMonth = new Date()
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    setCurrentDate(nextMonth)

    try {
      const targetMonth = nextMonth.toISOString().substring(0, 7)
      
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
        description: `${result.data.postsGenerated} Entwürfe für ${targetMonth} erstellt.`,
        duration: 4000,
      })

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

  const getCalendarDays = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const firstDayOfWeek = firstDay.getDay()
    const startingEmptyDays = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1
    
    const prevMonth = month === 0 ? 11 : month - 1
    const prevYear = month === 0 ? year - 1 : year
    const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate()
    
    const calendarDays = []
    
    for (let i = startingEmptyDays - 1; i >= 0; i--) {
      calendarDays.push({
        day: daysInPrevMonth - i,
        isCurrentMonth: false,
        isPreviousMonth: true,
        isNextMonth: false,
        date: new Date(prevYear, prevMonth, daysInPrevMonth - i)
      })
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      calendarDays.push({
        day: day,
        isCurrentMonth: true,
        isPreviousMonth: false,
        isNextMonth: false,
        date: new Date(year, month, day)
      })
    }
    
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
    setDragVisuals({ draggedId: post.id, dragOverDate: null })
    actions.setDragState(post.id, null)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('application/json', JSON.stringify(post))
  }

  const handleDragEnd = (e: React.DragEvent) => {
    setDragVisuals({ draggedId: null, dragOverDate: null })
    actions.setDragState(null, null)
  }

  const handleDragOver = (e: React.DragEvent, date: Date) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    const dateString = date.toISOString().split('T')[0]
    
    if (dragVisuals.dragOverDate !== dateString) {
      setDragVisuals(prev => ({ ...prev, dragOverDate: dateString }))
      actions.setDragState(state.draggedPostId, dateString)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
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
    
    setDragVisuals({ draggedId: null, dragOverDate: null })
    actions.setDragState(null, null)
    
    const draggedPost = state.draggedPostId ? actions.getPostById(state.draggedPostId) : null
    
    if (draggedPost) {
      const newDateString = date.toISOString().split('T')[0]
      const currentTime = draggedPost.scheduledTime
      
      try {
        await actions.updatePostDate(draggedPost.id, newDateString, currentTime)
      } catch (error) {
        console.error('Error updating post date:', error)
      }
    }
  }

  const getPostsForDate = (date: Date) => {
    return actions.getPostsForDate(date)
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const renderCalendar = () => {
    const calendarDays = getCalendarDays(currentDate)
    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

    return (
      <div className="space-y-6">
        {/* Month Navigation - matching dashboard style */}
        <div className="flex items-center justify-center mb-6">
          <div className="flex items-center gap-4 bg-white/20 rounded-full shadow-lg border border-white/30 p-2 min-w-[280px]">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth('prev')}
              className="h-7 w-7 p-0 rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <div className="flex-1 text-center">
              <span className="text-sm font-medium text-white">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth('next')}
              className="h-7 w-7 p-0 rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors shrink-0"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Events as Dashboard-style Cards */}
        <div className="grid grid-cols-4 gap-8 pb-8 max-w-6xl mx-auto mb-8">
          {calendarDays.filter(dayData => dayData.isCurrentMonth).slice(0, 16).map((dayData, index) => {
            const postsForDate = getPostsForDate(dayData.date)
            const isCurrentDay = isToday(dayData.date)
            const dateString = dayData.date.toISOString().split('T')[0]
            const isDragOver = dragVisuals.dragOverDate === dateString
            
            if (postsForDate.length === 0) return null // Only show days with content
            
            // Create a card for each post
            return postsForDate.slice(0, 1).map((post) => (
              <div
                key={`${post.id}-card`}
                className="group border-0 shadow-lg bg-white/95 hover:shadow-2xl transition-all duration-300 rounded-[2rem] cursor-pointer relative"
                draggable
                onDragStart={(e) => handleDragStart(e, post)}
                onDragEnd={handleDragEnd}
                onMouseEnter={() => setHoveredPost(post.id)}
                onMouseLeave={() => setHoveredPost(null)}
              >
                {/* Card Container with Padding */}
                <div className="p-2.5">
                  {/* Media Preview - Tall rectangle matching dashboard */}
                  <div 
                    className="aspect-[3/4] relative rounded-[1.5rem] overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600"
                    onDragOver={(e) => handleDragOver(e, dayData.date)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, dayData.date)}
                  >
                    {/* Date at top left with glowing effect */}
                    <div className="absolute top-3 left-3">
                      <h3 
                        className="text-white font-semibold text-base"
                        style={{
                          textShadow: '0 0 20px rgba(255, 255, 255, 0.8), 0 0 40px rgba(255, 255, 255, 0.4)',
                          color: 'rgba(255, 255, 255, 0.95)'
                        }}
                      >
                        {dayData.day.toString().padStart(2, '0')}.{(currentDate.getMonth() + 1).toString().padStart(2, '0')}
                      </h3>
                    </div>

                    {/* Platform icons in top right */}
                    <div className="absolute top-3 right-3 flex gap-1">
                      {post.platforms.slice(0, 2).map((platform) => {
                        const Icon = {
                          instagram: Instagram,
                          facebook: Facebook,
                          twitter: Twitter,
                          linkedin: Linkedin,
                          tiktok: Video
                        }[platform]
                        return (
                          <div
                            key={platform}
                            className="w-6 h-6 bg-white/25 rounded-full flex items-center justify-center"
                          >
                            {Icon && <Icon className="w-3.5 h-3.5 text-white" />}
                          </div>
                        )
                      })}
                    </div>

                    {/* Status and time at bottom */}
                    <div className="absolute bottom-3 left-3 right-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-white/80 bg-black/30 px-2 py-1 rounded-full">
                          {post.status === 'published' ? 'Live' : 
                           post.status === 'scheduled' ? 'Geplant' : 
                           post.status === 'draft' ? 'Entwurf' : 'Status'}
                        </div>
                        <div className="text-xs text-white/90 font-medium">
                          {post.scheduledTime}
                        </div>
                      </div>
                    </div>

                    {isCurrentDay && (
                      <div className="absolute inset-0 ring-2 ring-white/50 rounded-[1.5rem]" />
                    )}
                    
                    {isDragOver && (
                      <div className="absolute inset-0 bg-teal-500/20 rounded-[1.5rem] border-2 border-dashed border-teal-400">
                        <div className="flex items-center justify-center h-full">
                          <div className="text-white text-xs font-medium bg-teal-600/80 px-3 py-1 rounded-full">
                            Drop hier
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Simple content preview below image */}
                  <div className="pt-3">
                    <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed">
                      {post.title && post.title !== 'Untitled Post' 
                        ? post.title 
                        : post.content 
                          ? post.content.substring(0, 80) + (post.content.length > 80 ? '...' : '')
                          : 'Geplanter Post'
                      }
                    </p>
                  </div>
                </div>
              </div>
            ))
          })}
        </div>

        {/* Traditional Calendar View - Simplified */}
        <div className={`bg-white/95 rounded-[2rem] border-0 shadow-lg overflow-hidden transition-all duration-200 ${
          dragVisuals.draggedId ? 'ring-2 ring-teal-200/60 bg-teal-50/20' : ''
        }`}>
          <div className="grid grid-cols-7 border-b border-white/20 bg-white/20">
            {weekDays.map(day => (
              <div key={day} className="p-4 text-center">
                <span className="text-sm font-medium text-white/80">{day}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {calendarDays.map((dayData, index) => {
              const postsForDate = getPostsForDate(dayData.date)
              const isCurrentDay = isToday(dayData.date)
              const dateString = dayData.date.toISOString().split('T')[0]
              const isDragOver = dragVisuals.dragOverDate === dateString
              
              return (
                <div
                  key={`${dayData.date.getTime()}-${index}`}
                  className={`calendar-cell h-20 border-b border-r border-white/10 p-2 relative flex flex-col ${
                    isCurrentDay ? 'bg-gradient-to-br from-teal-500/20 to-cyan-500/20' : 'hover:bg-white/10'
                  } ${
                    !dayData.isCurrentMonth ? 'opacity-40' : ''
                  } ${
                    isDragOver ? 'drop-zone-active bg-gradient-to-br from-teal-500/30 to-cyan-500/30 ring-1 ring-teal-300/60' : ''
                  }`}
                  onDragOver={(e) => handleDragOver(e, dayData.date)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, dayData.date)}
                >
                  <div className="flex items-center justify-between mb-2 flex-shrink-0">
                    <span className={`text-sm font-medium transition-all ${
                      isCurrentDay 
                        ? 'w-6 h-6 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-full flex items-center justify-center text-xs shadow-lg' 
                        : dayData.isCurrentMonth 
                        ? 'text-gray-700' 
                        : 'text-gray-400'
                    }`}>
                      {dayData.day}
                    </span>
                    {postsForDate.length > 0 && dayData.isCurrentMonth && (
                      <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                    )}
                  </div>

                  {isDragOver && (
                    <div className="absolute inset-0 rounded-lg border-2 border-dashed border-teal-400 bg-teal-50/50 flex items-center justify-center">
                      <div className="text-teal-600 text-xs font-medium">Drop</div>
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

  const renderAIPlanPreview = () => {
    if (!aiPlanData || !aiPlanData.postingPlan) return null

    return (
      <div className="mb-6 bg-white/95 rounded-[2rem] border-0 shadow-lg">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">KI-Posting-Plan</h3>
                <p className="text-sm text-gray-600">{aiPlanData.postsGenerated} Entwürfe für {aiPlanData.targetMonth}</p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-purple-100 text-purple-700 rounded-full">
              Neu generiert
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white/80 rounded-xl p-4 border border-white/20 shadow-sm">
              <div className="text-2xl font-bold text-purple-600">{aiPlanData.analysisData?.existingPosts || 0}</div>
              <div className="text-sm text-gray-600">Analysierte Posts</div>
            </div>
            <div className="bg-white/80 rounded-xl p-4 border border-white/20 shadow-sm">
              <div className="text-2xl font-bold text-indigo-600">{aiPlanData.analysisData?.availableIdeas || 0}</div>
              <div className="text-sm text-gray-600">Verwendete Ideen</div>
            </div>
            <div className="bg-white/80 rounded-xl p-4 border border-white/20 shadow-sm">
              <div className="text-2xl font-bold text-teal-600">{aiPlanData.analysisData?.drafts || 0}</div>
              <div className="text-sm text-gray-600">Integrierte Entwürfe</div>
            </div>
          </div>

          {aiPlanData.notice && (
            <div className="mt-4 p-3 bg-amber-50/80 border border-amber-200/60 rounded-xl">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span className="text-sm text-amber-800 font-medium">Hinweis</span>
              </div>
              <p className="text-sm text-amber-700 mt-1">{aiPlanData.notice}</p>
            </div>
          )}

          <div className="flex items-center gap-3 mt-6 pt-4 border-t border-white/20">
            <Button
              variant="outline"
              onClick={() => {
                setIsAIPlanningMode(false)
                setAiPlanData(null)
              }}
              className="border-white/30 bg-white/10 text-white/80 hover:bg-white/20 hover:text-white rounded-full"
            >
              Plan schließen
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Loading state
  if (state.loading && Object.keys(state.posts).length === 0) {
    return (
      <div className="h-full w-full bg-transparent flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-white/80 mx-auto mb-4" />
          <p className="text-sm text-white/70">Loading calendar...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (state.error) {
    return (
      <div className="h-full w-full bg-transparent flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CalendarIcon className="w-6 h-6 text-white/80" />
          </div>
          <p className="text-sm text-white/80 mb-2">Error loading calendar</p>
          <p className="text-xs text-white/60 mb-4">{state.error}</p>
          <Button 
            onClick={actions.fetchPosts} 
            size="sm"
            className="bg-white/20 text-white/80 hover:bg-white/30 hover:text-white rounded-full border-white/30"
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full overflow-y-auto p-8 bg-transparent">
      {/* Top Header Section - matching dashboard style */}
      <div className="max-w-6xl mx-auto pb-6">
        <div className="mb-4">
          {/* Button Group - matching dashboard style */}
          <div className="w-full flex items-center justify-center mb-4 relative">        
            <div className="flex items-center bg-white/20 rounded-full shadow-lg border border-white/30 p-0.5">
              <button
                className="px-6 py-2.5 text-sm font-medium transition-all relative rounded-full bg-white/40 text-white border border-white/50 shadow-sm"
              >
                Calendar
              </button>
              <button
                onClick={handleAIPlanningToggle}
                disabled={isGeneratingPlan}
                className={`px-6 py-2.5 text-sm font-medium transition-all relative rounded-full flex items-center gap-2 ${
                  isAIPlanningMode
                    ? 'bg-white/40 text-white border border-white/50 shadow-sm'
                    : 'text-white/80 hover:bg-white/20 hover:text-white'
                }`}
              >
                {isGeneratingPlan ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Brain className="w-4 h-4" />
                )}
                AI Planer
              </button>
            </div>

            {/* Enhanced Calendar and New Event Buttons */}
            <div className="absolute right-0 flex items-center gap-3">
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    size="default" 
                    className="h-10 text-sm gap-2 px-4 bg-white/20 text-white/80 hover:bg-white/30 hover:text-white rounded-full border border-white/30"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Enhanced Calendar
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-7xl w-[95vw] h-[90vh] p-6 bg-white/95 backdrop-blur-lg border border-white/30 rounded-3xl">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-semibold text-gray-900">Enhanced Calendar View</DialogTitle>
                  </DialogHeader>
                  <div className="flex-1 min-h-0">
                    <CalendarProvider>
                      <CliBigCalendar />
                    </CalendarProvider>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Button 
                size="default" 
                className="h-10 text-sm gap-2 px-4 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 rounded-full"
              >
                <Plus className="w-4 h-4" />
                Neuer Termin
              </Button>
            </div>
          </div>
        </div>

        {/* Platform Filter - matching dashboard style */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { value: 'calendar', label: '📅', icon: CalendarIcon },
              { value: 'content', label: '📝', icon: Edit },
              { value: 'ai-plan', label: '🤖', icon: Brain },
            ].map(({ value, icon: Icon }) => (
              <button
                key={value}
                className="inline-flex items-center p-2 rounded-full border transition-all bg-white/10 text-white/70 border-white/20 hover:bg-white/20 hover:text-white"
              >
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="transition-all duration-300 mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-medium text-white/60">
              Termine & Planung
            </h2>
          </div>

          {isAIPlanningMode && renderAIPlanPreview()}

          {/* Calendar Grid - redesigned with dashboard card style */}
          <div className="space-y-6">
            {renderCalendar()}
          </div>
        </div>
      </div>
    </div>
  )
}