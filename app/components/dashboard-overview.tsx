"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useState, useRef, useEffect, useMemo, useCallback, memo } from "react"
import {
  Plus,
  MessageSquare,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Video,
  Edit3,
  Copy,
  Trash2,
  ChevronDown,
  Image as ImageIcon,
  Play,
  Heart,
  MessageCircle,
  Share,
  Search,
  Sparkles,
  Send,
  X,
  Bot,
  Calendar as CalendarIcon,
  Loader2,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CalendarPopup } from "@/components/ui/calendar-popup"
import { AIPostWorkflow } from "./ai-post-workflow"
import { PostDetailPopup } from "./post-detail-popup"
import { DynamicText } from "./dynamic-text"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { usePost } from "@/lib/post-context"
import { useAuth } from "@/lib/auth-context"
import { useDate } from "@/lib/date-context"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

// Enhanced Media Preview Component with comprehensive error handling
interface MediaPreviewProps {
  src: string
  mediaUrls: string[]
  mediaType: "image" | "video" | "carousel" | "text"
  alt: string
  className: string
}

function MediaPreview({ src, mediaUrls, mediaType, alt, className }: MediaPreviewProps) {
  const [currentSrc, setCurrentSrc] = useState(() => {
    // Use proxy for Instagram URLs
    if (src && (src.includes('instagram') || src.includes('scontent-') || src.includes('cdninstagram'))) {
      return `/api/media-proxy?url=${encodeURIComponent(src)}`
    }
    return src || '/placeholder.svg'
  })
  const [urlIndex, setUrlIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [triedProxy, setTriedProxy] = useState(false)

  const getProxiedUrl = useCallback((url: string) => {
    if (url && (url.includes('instagram') || url.includes('scontent-') || url.includes('cdninstagram'))) {
      return `/api/media-proxy?url=${encodeURIComponent(url)}`
    }
    return url
  }, [])

  const handleImageError = useCallback(() => {
    console.log(`Dashboard: Failed to load image: ${currentSrc}`)
    console.log(`Dashboard: Available URLs:`, mediaUrls)
    console.log(`Dashboard: Current URL index: ${urlIndex}`)
    console.log(`Dashboard: Tried proxy: ${triedProxy}`)
    
    // If we haven't tried the proxy yet for this URL, try it
    if (!triedProxy && !currentSrc.includes('/api/media-proxy') && urlIndex < mediaUrls.length) {
      const originalUrl = mediaUrls[urlIndex] || src
      if (originalUrl) {
        console.log(`Dashboard: Trying proxy for: ${originalUrl}`)
        setCurrentSrc(getProxiedUrl(originalUrl))
        setTriedProxy(true)
        setIsLoading(true)
        setHasError(false)
        return
      }
    }
    
    // Try next URL in mediaUrls array
    if (urlIndex + 1 < mediaUrls.length) {
      const nextIndex = urlIndex + 1
      const nextUrl = mediaUrls[nextIndex]
      if (nextUrl) {
        setUrlIndex(nextIndex)
        setCurrentSrc(getProxiedUrl(nextUrl))
        setTriedProxy(false)
        setIsLoading(true)
        setHasError(false)
        return
      }
    }
    
    // Try original URL without proxy
    if (currentSrc.includes('/api/media-proxy')) {
      const originalUrl = decodeURIComponent(currentSrc.split('url=')[1] || '')
      if (originalUrl && originalUrl !== currentSrc && originalUrl !== '/placeholder.svg') {
        setCurrentSrc(originalUrl)
        setIsLoading(true)
        setHasError(false)
        return
      }
    }
    
    // Try placeholder as last resort
    if (currentSrc !== '/placeholder.svg') {
      setCurrentSrc('/placeholder.svg')
      setIsLoading(true)
      setHasError(false)
      return
    }
    
    // Complete failure
    setHasError(true)
    setIsLoading(false)
  }, [currentSrc, mediaUrls, urlIndex, src, getProxiedUrl, triedProxy])

  const handleImageLoad = useCallback(() => {
    setIsLoading(false)
    setHasError(false)
  }, [])

  if (hasError) {
    return (
      <div className={`${className} bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center`}>
        <div className="text-center text-gray-500 p-2">
          {mediaType === 'video' ? (
            <Video className="w-6 h-6 mx-auto mb-1" />
          ) : mediaType === 'carousel' ? (
            <ImageIcon className="w-6 h-6 mx-auto mb-1" />
          ) : (
            <ImageIcon className="w-6 h-6 mx-auto mb-1" />
          )}
          <div className="text-xs font-medium mb-1">
            {mediaType === 'video' ? 'Video' : 
             mediaType === 'carousel' ? `${mediaUrls.length} Photos` : 
             'Image'}
          </div>
          <div className="text-xs opacity-75">Instagram Content</div>
        </div>
      </div>
    )
  }

  return (
    <>
      {isLoading && (
        <div className={`absolute inset-0 bg-gray-200 flex items-center justify-center z-5`}>
          <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
        </div>
      )}
      <img
        src={currentSrc}
        alt={alt}
        className={className}
        loading="lazy"
        onLoad={handleImageLoad}
        onError={handleImageError}
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
      />
    </>
  )
}

// Enhanced Post interface that matches the uploaded Instagram data
interface DashboardPost {
  id: string
  media: string
  mediaUrls: string[]
  mediaType: "image" | "video" | "carousel" | "text"
  text: string
  platforms: ("instagram" | "facebook" | "twitter" | "linkedin" | "tiktok")[]
  status: "scheduled" | "published" | "draft" | "failed"
  date: string
  likes?: number
  comments?: number
  views?: number
  shares?: number
  reach?: number
}

// Original Post interface for PostDetailPopup compatibility
interface Post {
  id: string
  media: string
  mediaType: "image" | "video"
  text: string
  platforms: ("instagram" | "facebook" | "twitter" | "linkedin" | "tiktok")[]
  status: "scheduled" | "published" | "draft" | "failed"
  date: string
  likes?: number
  comments?: number
}

interface TimeInterval {
  startDate: Date
  startTime?: string
  endDate?: Date
  endTime?: string
}

type Platform = 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'tiktok'
type PostStatus = 'draft' | 'scheduled' | 'published' | 'failed'

// Convert PostContext Post to component DashboardPost format with enhanced Instagram data
const convertPostContextToComponentPost = (post: any): DashboardPost => {
      // Debug: Log post data to understand media URLs structure
    if (post.media_urls && post.media_urls.length > 0) {
      console.log(`Dashboard: Converting post ${post.id} with ${post.media_urls.length} media URLs:`, post.media_urls.map((url: string) => url?.substring(0, 60) + '...'));
    }
    
    // Use scheduled date and time if available, otherwise fall back to created/published date
    let displayDate = post.createdAt;
  
  if (post.scheduledDate && post.scheduledTime) {
    // Create date object with careful timezone handling to maintain precision
    const [year, month, day] = post.scheduledDate.split('-').map(Number);
    const [hours, minutes] = post.scheduledTime.split(':').map(Number);
    const scheduledDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
    displayDate = scheduledDateTime.toISOString();
  } else if (post.scheduledDate) {
    const [year, month, day] = post.scheduledDate.split('-').map(Number);
    const dateOnly = new Date(year, month - 1, day, 12, 0, 0, 0);
    displayDate = dateOnly.toISOString();
  } else if (post.published_at) {
    displayDate = post.published_at;
  } else if (post.created_at) {
    displayDate = post.created_at;
  }

  // Extract media URLs - handle both old format (image field) and new format (media_urls array)
  let mediaUrls: string[] = [];
  let primaryMedia = '/placeholder.jpg';
  
  if (post.media_urls && Array.isArray(post.media_urls) && post.media_urls.length > 0) {
    mediaUrls = post.media_urls.filter(Boolean);
    primaryMedia = mediaUrls[0];
  } else if (post.image) {
    mediaUrls = [post.image];
    primaryMedia = post.image;
  }

  // Extract media type - use database field if available, otherwise infer
  let mediaType: "image" | "video" | "carousel" | "text" = "image";
  if (post.media_type) {
    mediaType = post.media_type as "image" | "video" | "carousel" | "text";
  } else if (mediaUrls.length > 1) {
    mediaType = "carousel";
  } else if (mediaUrls.some(url => url.toLowerCase().includes('.mp4') || url.toLowerCase().includes('video'))) {
    mediaType = "video";
  }

  // Final debug log
  console.log(`Dashboard: Post ${post.id} converted - Primary: ${primaryMedia?.substring(0, 60)}..., URLs: ${mediaUrls.length}, Type: ${mediaType}`);

  return {
    id: post.id,
    media: primaryMedia,
    mediaUrls: mediaUrls,
    mediaType: mediaType,
    text: post.content || post.title || '',
    platforms: post.platforms as Platform[],
    status: post.status as PostStatus,
    date: displayDate,
    likes: post.likes || 0,
    comments: post.comments || post.comments_count || 0,
    views: post.impressions || 0, // Use impressions as views for videos
    shares: post.shares || 0,
    reach: post.reach || 0
  }
}

const statusColors = {
  scheduled: "bg-blue-100 text-blue-700",
  published: "bg-green-100 text-green-700",
  draft: "bg-gray-100 text-gray-700",
  failed: "bg-red-100 text-red-700"
}

const statusLabels = {
  scheduled: "Geplant",
  published: "Veröffentlicht",
  draft: "In Bearbeitung",
  failed: "Fehlgeschlagen"
}

export const DashboardOverview = memo(function DashboardOverview() {
  const { user } = useAuth()
  const { state, actions } = usePost()
  const { state: dateState } = useDate()
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([])
  const [selectedStatus, setSelectedStatus] = useState<string>("Alle")
  const [isAiChatOpen, setIsAiChatOpen] = useState(false)
  const [chatMessage, setChatMessage] = useState("")
  const [chatHistory, setChatHistory] = useState<Array<{id: string, type: 'user' | 'ai', message: string, timestamp: Date}>>([])
  const [isTyping, setIsTyping] = useState(false)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [selectedInterval, setSelectedInterval] = useState<TimeInterval | undefined>()
  const [timeFilter, setTimeFilter] = useState("Zuletzt erstellt")
  const [isAiWorkflowOpen, setIsAiWorkflowOpen] = useState(false)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [isPostDetailOpen, setIsPostDetailOpen] = useState(false)
  const [showTimeoutMessage, setShowTimeoutMessage] = useState(false)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [postsPerPage] = useState(16) // Optimal number for 4x4 grid

  // Show timeout message after 10 seconds of loading
  useEffect(() => {
    if (state.loading) {
      const timer = setTimeout(() => {
        setShowTimeoutMessage(true)
      }, 10000)
      return () => clearTimeout(timer)
    } else {
      setShowTimeoutMessage(false)
    }
  }, [state.loading])

  // Subscribe to real-time post changes
  useEffect(() => {
    const unsubscribe = actions.subscribeToChanges((event) => {
      // Handle sync events for real-time updates
      switch (event.type) {
        case 'post_created':
          if (event.source !== 'user_action') {
            toast.info('New post created', { 
              description: 'Posts updated from server',
              duration: 2000 
            })
          }
          break
        case 'post_updated':
          if (event.source !== 'user_action') {
            toast.info('Post updated', { 
              description: 'Changes synchronized',
              duration: 2000 
            })
          }
          break
        case 'post_deleted':
          if (event.source !== 'user_action') {
            toast.info('Post deleted', { 
              description: 'Changes synchronized',
              duration: 2000 
            })
          }
          break
        case 'batch_sync':
          if (event.source === 'periodic' && event.posts && event.posts.length > 0) {
            console.log('Dashboard synchronized with server')
          }
          break
      }
    })
    
    return unsubscribe
  }, [actions])

  // Manual sync trigger
  const handleManualSync = useCallback(async () => {
    await actions.syncPosts('manual')
    toast.success('Dashboard synchronized')
  }, [actions])

  // Get posts from context and convert to component format - memoized
  const posts = useMemo(() => {
    return Object.values(state.posts).map(convertPostContextToComponentPost)
  }, [state.posts])

  // Convert DashboardPost to PostDetailPopup Post format
  const convertToPopupPost = (dashboardPost: DashboardPost): Post => ({
    id: dashboardPost.id,
    media: dashboardPost.media,
    mediaType: dashboardPost.mediaType === 'carousel' ? 'image' : 
               dashboardPost.mediaType === 'text' ? 'image' : 
               dashboardPost.mediaType as "image" | "video",
    text: dashboardPost.text,
    platforms: dashboardPost.platforms,
    status: dashboardPost.status,
    date: dashboardPost.date,
    likes: dashboardPost.likes,
    comments: dashboardPost.comments
  })

  // Memoized filtered posts  
  const filteredPosts = useMemo(() => {
    // Sort posts by date (newest first)
    const sortedPosts = [...posts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return sortedPosts.filter((post: DashboardPost) => {
      const platformMatch = selectedPlatforms.length === 0 || 
        post.platforms.some(p => selectedPlatforms.includes(p))
      const statusMatch = selectedStatus === "Alle" || 
        statusLabels[post.status as keyof typeof statusLabels] === selectedStatus

      // Add date filtering
      let dateMatch = true
      if (selectedInterval) {
        const postDate = new Date(post.date)
        const startDateTime = new Date(selectedInterval.startDate)
        startDateTime.setHours(
          parseInt(selectedInterval.startTime?.split(":")[0] || "0"),
          parseInt(selectedInterval.startTime?.split(":")[1] || "0")
        )
        
        const endDateTime = selectedInterval.endDate ? new Date(selectedInterval.endDate) : undefined
        if (endDateTime) {
          endDateTime.setHours(
            parseInt(selectedInterval.endTime?.split(":")[0] || "23"),
            parseInt(selectedInterval.endTime?.split(":")[1] || "59")
          )
          dateMatch = postDate >= startDateTime && postDate <= endDateTime
        } else {
          dateMatch = postDate >= startDateTime
        }
      }

      return platformMatch && statusMatch && dateMatch
    })
  }, [posts, selectedPlatforms, selectedStatus, selectedInterval, dateState.currentDate])

  // Paginated posts
  const paginatedPosts = useMemo(() => {
    const startIndex = (currentPage - 1) * postsPerPage
    const endIndex = startIndex + postsPerPage
    return filteredPosts.slice(startIndex, endIndex)
  }, [filteredPosts, currentPage, postsPerPage])

  // Pagination calculations
  const totalPages = Math.ceil(filteredPosts.length / postsPerPage)
  const hasNextPage = currentPage < totalPages
  const hasPrevPage = currentPage > 1

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedPlatforms, selectedStatus, selectedInterval])

  // Pagination handlers
  const handleNextPage = useCallback(() => {
    if (hasNextPage) {
      setCurrentPage(prev => prev + 1)
    }
  }, [hasNextPage])

  const handlePrevPage = useCallback(() => {
    if (hasPrevPage) {
      setCurrentPage(prev => prev - 1)
    }
  }, [hasPrevPage])

  const handlePageClick = useCallback((page: number) => {
    setCurrentPage(page)
  }, [])

  // Will add empty state check later after functions are defined

  const scrollToBottom = useCallback(() => {
    if (chatContainerRef.current) {
      const scrollHeight = chatContainerRef.current.scrollHeight
      chatContainerRef.current.scrollTo({
        top: scrollHeight,
        behavior: 'smooth'
      })
    }
  }, [])

  useEffect(() => {
    if (isAiChatOpen) {
      scrollToBottom()
    }
  }, [chatHistory, isTyping, isAiChatOpen, scrollToBottom])

  const togglePlatform = useCallback((platform: Platform) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    )
  }, [])

  const handleAiToggle = useCallback(() => {
    setIsAiChatOpen(!isAiChatOpen)
  }, [isAiChatOpen])



  // Generate dynamic sentence suggestions based on conversation context
  const getDynamicSuggestions = useCallback(() => {
    const suggestions: Array<{ id: string; text: string }> = []
    const lastMessage = chatHistory[chatHistory.length - 1]
    const lastFewMessages = chatHistory.slice(-3) // Look at last 3 messages for context
    const conversationText = lastFewMessages.map(m => m.message.toLowerCase()).join(' ')
    
    // Advanced context analysis with more specific keywords
    const hasContentKeywords = /content|idee|post|artikel|story|text|bild|video/i.test(conversationText)
    const hasAnalyticsKeywords = /performance|analytics|zahlen|statistik|reichweite|engagement|likes|kommentare/i.test(conversationText)
    const hasHashtagKeywords = /hashtag|#|tag|trending|viral/i.test(conversationText)
    const hasScheduleKeywords = /zeit|planen|schedule|wann|timing|kalender/i.test(conversationText)
    const hasTrendsKeywords = /trend|aktuell|viral|popular|neu|hot/i.test(conversationText)
    const hasOptimizeKeywords = /verbessern|optimier|besser|mehr|steigern|erhöhen/i.test(conversationText)
    const hasStrategyKeywords = /strategie|plan|konzept|vorgehens|ansatz/i.test(conversationText)
    const hasImmobilienKeywords = /immobilie|haus|wohnung|makler|verkauf|kauf|finanzierung/i.test(conversationText)
    const hasPlatformKeywords = /instagram|facebook|linkedin|tiktok|twitter|story|reel/i.test(conversationText)
    
    // Context-based dynamic suggestions
    if (lastMessage?.type === 'ai') {
      // If AI just gave content ideas
      if (hasContentKeywords) {
        suggestions.push({ id: 'create-post', text: 'Erstelle einen vollständigen Post basierend auf diesen Ideen.' })
        suggestions.push({ id: 'more-ideas', text: 'Gib mir weitere kreative Content-Ideen für diese Woche.' })
        suggestions.push({ id: 'content-strategy', text: 'Entwickle eine Content-Strategie für die nächsten 4 Wochen.' })
      }
      
      // If AI mentioned hashtags
      if (hasHashtagKeywords) {
        suggestions.push({ id: 'hashtag-strategy', text: 'Erstelle eine Hashtag-Strategie für maximale Reichweite.' })
        suggestions.push({ id: 'trending-tags', text: 'Zeige mir die aktuell viral gehenden Hashtags.' })
      }
      
      // If AI talked about timing/scheduling
      if (hasScheduleKeywords) {
        suggestions.push({ id: 'best-times', text: 'Zeige mir die optimalen Posting-Zeiten für meine Zielgruppe.' })
        suggestions.push({ id: 'schedule-plan', text: 'Erstelle einen detaillierten Posting-Plan für diese Woche.' })
      }
      
      // If AI gave analytics/performance info
      if (hasAnalyticsKeywords) {
        suggestions.push({ id: 'deep-analysis', text: 'Analysiere meine Top-Posts und erkläre warum sie erfolgreich waren.' })
        suggestions.push({ id: 'improvement-tips', text: 'Gib mir konkrete Tipps zur Verbesserung meiner Performance.' })
      }
      
      // If AI mentioned trends
      if (hasTrendsKeywords) {
        suggestions.push({ id: 'trend-content', text: 'Erstelle Content-Ideen basierend auf aktuellen Trends.' })
        suggestions.push({ id: 'viral-strategy', text: 'Zeige mir bewährte Strategien für virale Inhalte.' })
      }
      
      // If conversation was about optimization
      if (hasOptimizeKeywords) {
        suggestions.push({ id: 'quick-wins', text: 'Zeige mir 3 Quick-Win Optimierungen für sofortige Verbesserungen.' })
        suggestions.push({ id: 'next-steps', text: 'Was sind meine konkreten nächsten Schritte zur Optimierung?' })
      }
      
      // If conversation was about real estate
      if (hasImmobilienKeywords) {
        suggestions.push({ id: 'property-content', text: 'Erstelle spezifische Content-Ideen für Immobilienmakler.' })
        suggestions.push({ id: 'client-attraction', text: 'Wie kann ich mehr qualifizierte Kunden über Social Media gewinnen?' })
      }
    }
    
    // Conversation flow-based suggestions
    const messageCount = chatHistory.length
    
    if (messageCount === 0) {
      // Initial suggestions for empty chat
      return [
        { id: 'analyze-performance', text: 'Analysiere meine Post-Performance und gib konkrete Verbesserungsvorschläge.' },
        { id: 'content-ideas', text: 'Erstelle 5 kreative Content-Ideen für meine Immobilien-Posts.' },
        { id: 'posting-strategy', text: 'Entwickle eine optimale Posting-Strategie für maximale Reichweite.' },
        { id: 'competitor-analysis', text: 'Analysiere meine Konkurrenz und zeige Differenzierungsmöglichkeiten.' }
      ]
    } else if (messageCount <= 2) {
      // Early conversation - broad exploration
      if (!hasContentKeywords) suggestions.push({ id: 'content-ideas', text: 'Gib mir frische Content-Ideen für diese Woche.' })
      if (!hasAnalyticsKeywords) suggestions.push({ id: 'performance-check', text: 'Wie performt mein aktueller Content und was kann ich verbessern?' })
      if (!hasTrendsKeywords) suggestions.push({ id: 'trending-topics', text: 'Welche Trends sollte ich für meinen Content nutzen?' })
      if (!hasImmobilienKeywords) suggestions.push({ id: 'real-estate-focus', text: 'Erstelle spezifische Strategien für Immobilien-Marketing.' })
    } else if (messageCount <= 5) {
      // Mid conversation - specific actions
      if (!hasHashtagKeywords) suggestions.push({ id: 'hashtag-optimization', text: 'Optimiere meine Hashtag-Strategie für bessere Sichtbarkeit.' })
      if (!hasScheduleKeywords) suggestions.push({ id: 'timing-optimization', text: 'Wann sind die besten Zeiten zum Posten für meine Zielgruppe?' })
      if (!hasOptimizeKeywords) suggestions.push({ id: 'growth-strategy', text: 'Erstelle eine Wachstumsstrategie für die nächsten 3 Monate.' })
    } else {
      // Deep conversation - advanced actions
      suggestions.push({ id: 'comprehensive-strategy', text: 'Fasse alles zusammen und erstelle einen umfassenden Aktionsplan.' })
      suggestions.push({ id: 'advanced-tactics', text: 'Zeige mir fortgeschrittene Taktiken für exponentielles Wachstum.' })
      suggestions.push({ id: 'roi-optimization', text: 'Wie kann ich den ROI meiner Social Media Aktivitäten maximieren?' })
    }
    
    // Fallback suggestions if no specific context detected
    if (suggestions.length === 0) {
      const fallbackSuggestions = [
        { id: 'general-help', text: 'Wobei kann ich dir heute am besten helfen?' },
        { id: 'quick-tip', text: 'Gib mir einen schnellen Tipp zur Verbesserung meiner Posts.' },
        { id: 'content-audit', text: 'Führe ein Content-Audit durch und zeige Optimierungspotenziale.' },
        { id: 'strategy-review', text: 'Bewerte meine aktuelle Social Media Strategie.' }
      ]
      
      suggestions.push(...fallbackSuggestions.slice(0, 3))
    }
    
    // Limit to 3-4 suggestions and shuffle for variety
    return suggestions
      .slice(0, Math.min(4, suggestions.length))
      .sort(() => Math.random() - 0.5)
  }, [chatHistory, filteredPosts])

  // Process AI response to optimize formatting and remove redundant content
  const processAIResponse = useCallback((response: string | undefined | null) => {
    // Handle undefined or null responses
    if (!response || typeof response !== 'string') {
      console.warn('[DASHBOARD] Received invalid response:', response)
      return "Entschuldigung, ich konnte keine Antwort generieren. Bitte versuchen Sie es erneut."
    }

    // Handle empty strings
    if (response.trim().length === 0) {
      console.warn('[DASHBOARD] Received empty response')
      return "Ich habe eine leere Antwort erhalten. Können Sie Ihre Frage anders formulieren?"
    }

    // Remove dynamic action suggestions at the end
    let cleanedResponse = response
      .replace(/---[\s\S]*?(\[.*?\]\(.*?\)[\s\S]*?)*---/g, '')
      .replace(/\*\*Nächste Schritte[\s\S]*$/g, '')
      .replace(/\*\*Aktionen:?\*\*[\s\S]*$/g, '')
      .replace(/- \[.*?\]\(.*?\)[\s\S]*?$/gm, '')
      .replace(/Wenn du Unterstützung.*?wissen!/g, '')
      .replace(/Falls du.*?wissen!/g, '')
      .replace(/Lass es mich wissen.*?$/g, '')
      .trim()

    // Make content more compressed while preserving structure
    cleanedResponse = cleanedResponse
      .replace(/\n\n\n+/g, '\n\n') // Remove excessive line breaks
      .replace(/- \*\*Content-Idee\*\*:/g, '**Idee:**')
      .replace(/- \*\*Hashtags\*\*:/g, '**Tags:**')
      .replace(/Hier sind fünf frische Content-Ideen.*?engagieren:/i, '**5 Content-Ideen:**')
      .replace(/Diese Ideen sind.*?engagieren:/i, '')
      .replace(/Hier sind.*?die du.*?kannst\.?:?/i, '**Empfehlungen:**')
      
    return cleanedResponse
  }, [])

  // Render markdown formatting for AI messages
  const renderMessageWithMarkdown = useCallback((message: string) => {
    // Split by bold markers and render accordingly
    const parts = message.split(/(\*\*[^*]+\*\*)/g)
    
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        // Bold text
        return (
          <span key={index} className="font-semibold text-gray-900">
            {part.slice(2, -2)}
          </span>
        )
      } else {
        // Regular text with line breaks
        return part.split('\n').map((line, lineIndex, arr) => (
          <span key={`${index}-${lineIndex}`}>
            {line}
            {lineIndex < arr.length - 1 && <br />}
          </span>
        ))
      }
    })
  }, [])

  const handleChatInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setChatMessage(e.target.value)
  }, [])

  const handleSendMessage = useCallback(async () => {
    if (!chatMessage.trim()) return

    const newMessage = {
      id: Date.now().toString(),
      type: 'user' as const,
      message: chatMessage,
      timestamp: new Date()
    }

    setChatHistory(prev => [...prev, newMessage])
    setChatMessage("")
    setIsTyping(true)

    try {
      // Get the current user's session token
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('No authentication token found')
      }

      // Add timeout to prevent hanging
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          query: chatMessage + "\n\nBitte antworte prägnant und strukturiert. Verwende **fett** für wichtige Begriffe und halte dich kurz, außer bei detaillierten Fragen.",
          // conversation_id will be managed by the API
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      const data = await response.json()
      console.log('[DASHBOARD] API Response received:', { 
        ok: response.ok, 
        status: response.status, 
        dataKeys: Object.keys(data || {}),
        hasMessage: !!data?.message,
        messageType: typeof data?.message,
        messageLength: data?.message?.length || 0
      })

      if (!response.ok) {
        console.error('[DASHBOARD] API Error:', data)
        // Handle specific error cases
        if (data.error === 'GPT-4o did not return a response.') {
          throw new Error('Der AI-Assistent konnte keine Antwort generieren. Bitte versuchen Sie es mit einer anderen Formulierung.')
        }
        throw new Error(data.error || 'Failed to get AI response')
      }

      // Validate the response structure
      if (!data || typeof data !== 'object') {
        console.error('[DASHBOARD] Invalid response structure:', data)
        throw new Error('Invalid response structure from API')
      }

      if (!data.message) {
        console.error('[DASHBOARD] No message in response:', data)
        throw new Error('No message content in API response')
      }

      // Process the AI response to optimize formatting
      const processedResponse = processAIResponse(data.message)

      const aiResponse = {
        id: (Date.now() + 1).toString(),
        type: 'ai' as const,
        message: processedResponse,
        timestamp: new Date()
      }
      setChatHistory(prev => [...prev, aiResponse])
      setIsTyping(false)
    } catch (error) {
      console.error('Error sending message to AI:', error)
      
      let errorMessage = "Entschuldigung, ich konnte Ihre Nachricht nicht verarbeiten. Bitte versuchen Sie es erneut."
      let toastDescription = 'Bitte versuchen Sie es erneut.'
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = "Die Anfrage hat zu lange gedauert. Bitte versuchen Sie es mit einer kürzeren Nachricht erneut."
          toastDescription = 'Anfrage unterbrochen - Zeitüberschreitung'
        } else if (error.message.includes('Failed to fetch') || error.message.includes('network')) {
          errorMessage = "Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung."
          toastDescription = 'Netzwerkproblem erkannt'
        }
      }
      
      const errorResponse = {
        id: (Date.now() + 1).toString(),
        type: 'ai' as const,
        message: errorMessage,
        timestamp: new Date()
      }
      setChatHistory(prev => [...prev, errorResponse])
      setIsTyping(false)
      
      // Show error toast
      toast.error('Fehler beim Senden der Nachricht', {
        description: toastDescription
      })
    }
  }, [chatMessage, processAIResponse])



  const handleTimeFilterSelect = useCallback((filter: string) => {
    setTimeFilter(filter)
    if (filter === "Benutzerdefiniert") {
      setIsCalendarOpen(true)
    } else if (filter === "Gesamter Zeitraum") {
      setSelectedInterval(undefined)
    } else {
      // Set predefined intervals
      const now = new Date()
      let startDate = new Date()
      let endDate = new Date()
      
      switch (filter) {
        case "Nächste 24 Stunden":
          startDate = now
          endDate = new Date(now.getTime() + 24 * 60 * 60 * 1000)
          break
        case "Diese Woche":
          startDate = now
          endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
          break
        case "Dieser Monat":
          startDate = now
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
          break
        default:
          setSelectedInterval(undefined)
          return
      }
      
      setSelectedInterval({
        startDate,
        startTime: "00:00",
        endDate,
        endTime: "23:59"
      })
    }
  }, [])

  const handleIntervalSelect = useCallback((interval: TimeInterval) => {
    setSelectedInterval(interval)
    setTimeFilter(`${interval.startDate.toLocaleDateString("de-DE")} - ${interval.endDate?.toLocaleDateString("de-DE")}`)
  }, [])

  const handleOpenAiWorkflow = useCallback(() => {
    setIsAiWorkflowOpen(true)
  }, [])

  const handlePostClick = useCallback((post: DashboardPost) => {
    setSelectedPost(convertToPopupPost(post))
    setIsPostDetailOpen(true)
  }, [])

  const handlePostSave = useCallback(async (updatedPost: Post) => {
    if (!user) return
    
    try {
      // Parse the date with precision to avoid timezone shifts
      const postDate = new Date(updatedPost.date);
      
      // Extract date and time components in local timezone to maintain precision
      const scheduledDate = `${postDate.getFullYear()}-${String(postDate.getMonth() + 1).padStart(2, '0')}-${String(postDate.getDate()).padStart(2, '0')}`;
      const scheduledTime = `${String(postDate.getHours()).padStart(2, '0')}:${String(postDate.getMinutes()).padStart(2, '0')}`;
      
      // Convert the post data to match the database schema
      const updateData = {
        title: updatedPost.text ? updatedPost.text.substring(0, 100) : 'Untitled Post',
        content: updatedPost.text,
        platforms: updatedPost.platforms,
        image: updatedPost.media,
        status: updatedPost.status,
        scheduledDate: scheduledDate,
        scheduledTime: scheduledTime,
        likes: updatedPost.likes || 0,
        comments: updatedPost.comments || 0,
        shares: 0 // Set default since it's not in the Post interface
      };

      // Update the post in the database and global state
      await actions.updatePost(updatedPost.id, updateData);
      
      // Update the selected post in local state immediately so the popup reflects changes
      setSelectedPost(updatedPost);
      
      // Force a refresh of all posts to ensure all views are updated
      await actions.fetchPosts();
      
      toast.success('Beitrag erfolgreich aktualisiert!');
      
    } catch (error) {
      console.error('Error updating post:', error);
      toast.error('Fehler beim Aktualisieren des Beitrags');
    }
  }, [user, actions]);

  const handlePostDelete = useCallback(async (postId: string) => {
    if (!user) return
    
    try {
      await actions.deletePost(postId)
    } catch (error) {
      console.error('Error deleting post:', error)
    }
  }, [user, actions])

  const handlePostDuplicate = useCallback(async (post: Post) => {
    if (!user) return
    
    try {
      await actions.addPost({
        title: `${post.text.substring(0, 20)}... (Copy)`,
        content: post.text,
        platforms: post.platforms,
        image: post.media,
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
  }, [user, actions])

  const handleUpdatePostStatus = useCallback(async (postId: string, status: PostStatus) => {
    if (!user) return
    
    try {
      await actions.updatePost(postId, { status })
    } catch (error) {
      console.error('Error updating post status:', error)
    }
  }, [user, actions])

  if (state.loading && showTimeoutMessage) {
    return (
      <div className="h-full w-full bg-gray-50/50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-yellow-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Database Setup Required</h3>
          <p className="text-sm text-gray-600 mb-4">
            The application is taking too long to load. This usually means the database tables haven't been set up yet.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800 font-medium mb-2">Quick Setup:</p>
            <ol className="text-xs text-blue-700 text-left space-y-1">
              <li>1. Go to your Supabase dashboard</li>
              <li>2. Open the SQL Editor</li>
              <li>3. Run the SQL scripts from database/schema.sql</li>
              <li>4. Refresh this page</li>
            </ol>
          </div>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => window.location.reload()} size="sm">
              Refresh Page
            </Button>
            <Button onClick={() => setShowTimeoutMessage(false)} variant="outline" size="sm">
              Continue Anyway
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (state.loading) {
    return (
      <div className="h-full w-full bg-gray-50/50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-teal-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (state.error && Object.keys(state.posts).length === 0) {
    return (
      <div className="h-full w-full bg-gray-50/50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Dashboard</h3>
          <p className="text-sm text-gray-600 mb-4">{state.error}</p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800 font-medium mb-2">Possible Solutions:</p>
            <ol className="text-xs text-blue-700 text-left space-y-1">
              <li>1. Check your internet connection</li>
              <li>2. Verify Supabase configuration</li>
              <li>3. Run database setup scripts</li>
              <li>4. Try refreshing the page</li>
            </ol>
          </div>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => actions.fetchPosts()} size="sm">
              Try Again
            </Button>
            <Button onClick={() => window.location.reload()} variant="outline" size="sm">
              Refresh Page
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full bg-gray-50/50 overflow-y-auto">
      {/* Top Header Section */}
      <div className={`max-w-[1400px] mx-auto pl-4 ${isAiChatOpen ? 'pb-2' : 'pb-8'}`}>
        <div className="mb-4">
          {/* Status Filter and Actions */}
          <div className="w-full flex items-center justify-between mb-4">
            {/* Empty div for left spacing */}
            <div className="w-32"></div>
            
            {/* Centered Status Filter */}
            <div className="flex items-center bg-white rounded-full shadow-sm border border-gray-100 p-0.5">
              {["Alle", "Geplant", "Veröffentlicht", "In Bearbeitung"].map((status) => (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={`px-6 py-2.5 text-sm font-medium transition-all relative
                    ${selectedStatus === status
                      ? 'rounded-full bg-gradient-to-r from-teal-500/10 to-cyan-500/10 text-teal-600 border border-teal-200'
                      : 'text-gray-600 hover:bg-gray-50 rounded-full'
                    }`}
                >
                  {status}
                </button>
              ))}
              <button 
                onClick={handleAiToggle}
                className={`px-4 py-2.5 rounded-full flex items-center gap-1 transition-all
                  ${isAiChatOpen 
                    ? 'bg-gradient-to-r from-teal-500/10 to-cyan-500/10 text-teal-600 border border-teal-200' 
                    : 'text-gray-600 hover:bg-gray-50'
                  }`}
              >
                <Search className="w-4 h-4" />
                <Sparkles className="w-4 h-4" />
              </button>
            </div>

            {/* Right-aligned Button */}
            <div className="flex justify-end w-32">
              <Button 
                onClick={handleOpenAiWorkflow}
                size="default" 
                className="h-10 text-sm gap-2 px-4 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 rounded-full"
              >
                <Plus className="w-4 h-4" />
                Neuer Post
              </Button>
            </div>
          </div>

          {/* AI Chat Window */}
          <div className={`transition-all duration-300 ease-out ${isAiChatOpen ? 'opacity-100 mb-4' : 'max-h-0 opacity-0 overflow-hidden'}`}>
            <Card className="bg-white/95 backdrop-blur-sm border border-gray-100 shadow-lg rounded-2xl">
              <div className="p-4 flex flex-col" style={{ height: isAiChatOpen ? 'calc(100vh - 140px)' : '0' }}>
                {/* Chat Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full flex items-center justify-center">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">AI Assistant</h3>
                      <p className="text-xs text-gray-500">Hier, um zu helfen</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsAiChatOpen(false)}
                    className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Chat Messages */}
                <div className="space-y-3 flex-1 overflow-y-auto mb-4 scroll-smooth pr-2" 
                     ref={chatContainerRef}
                     style={{ 
                       scrollbarWidth: 'thin',
                       maxHeight: 'calc(100vh - 500px)' // Account for header, buttons, input, suggestions
                     }}>
                  {chatHistory.length === 0 ? (
                    <div className="text-center py-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-teal-500/10 to-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Sparkles className="w-6 h-6 text-teal-600" />
                      </div>
                      <p className="text-sm text-gray-600 mb-2">Willkommen beim AI Assistant!</p>
                      <p className="text-xs text-gray-500 mb-4">Wählen Sie eine Aktion oder stellen Sie mir eine Frage.</p>
                      
                      {/* Initial suggestions for empty chat */}
                      <div className="flex flex-col gap-3 mt-4">
                        {getDynamicSuggestions().map((suggestion) => (
                          <button
                            key={suggestion.id}
                            onClick={() => {
                              setChatMessage(suggestion.text);
                              setTimeout(() => {
                                handleSendMessage();
                              }, 100);
                            }}
                            className="flex items-center gap-4 p-4 text-left bg-gradient-to-r from-gray-50 to-gray-100 hover:from-teal-50 hover:to-cyan-50 border border-gray-200 hover:border-teal-200 rounded-xl transition-all duration-200 group"
                          >
                            <span className="text-2xl">💡</span>
                            <span className="text-sm font-medium text-gray-700 group-hover:text-teal-700 leading-relaxed">
                              {suggestion.text}
                            </span>
                            <Send className="w-5 h-5 text-gray-400 group-hover:text-teal-500 ml-auto transition-colors" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      {chatHistory.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-2xl px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                            msg.type === 'user' 
                              ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {msg.type === 'ai' ? renderMessageWithMarkdown(msg.message) : msg.message}
                          </div>
                        </div>
                      ))}
                      {isTyping && (
                        <div className="flex justify-start">
                          <div className="bg-gray-100 px-3 py-2 rounded-2xl">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Chat Input */}
                <div className="flex-shrink-0 mt-auto">
                  {/* Dynamic Suggestion Sentences - Right above input */}
                  <div className="mb-2">
                    <div className="flex flex-wrap gap-1.5">
                      {getDynamicSuggestions().map((suggestion) => (
                        <button
                          key={suggestion.id}
                          onClick={() => {
                            setChatMessage(suggestion.text);
                            setTimeout(() => {
                              handleSendMessage();
                            }, 100);
                          }}
                          className="text-left px-2 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-300 rounded-full transition-all duration-200 group flex-1 min-w-0"
                          style={{ maxWidth: 'calc(50% - 3px)' }}
                        >
                          <span className="text-xs text-gray-600 group-hover:text-gray-800 leading-tight line-clamp-2">
                            {suggestion.text}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Input Field */}
                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    <Input
                      value={chatMessage}
                      onChange={handleChatInputChange}
                      placeholder="Stellen Sie mir eine Frage..."
                      className="flex-1 border-gray-200 focus:border-teal-500 focus:ring-teal-500/20 rounded-full"
                      onKeyPress={(e) => e.key === 'Enter' && !isTyping && handleSendMessage()}
                      disabled={isTyping}
                    />
                    <Button
                      onClick={handleSendMessage}
                      size="sm"
                      disabled={isTyping || !chatMessage.trim()}
                      className="h-10 w-10 p-0 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isTyping ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Content with smooth transition */}
          <div className={`transition-all duration-300 ease-out ${isAiChatOpen ? 'transform translate-y-2' : ''}`}>
            {/* Platform Filter */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {[
                  { icon: Instagram, value: "instagram" },
                  { icon: Facebook, value: "facebook" },
                  { icon: Twitter, value: "twitter" },
                  { icon: Linkedin, value: "linkedin" },
                  { icon: Video, value: "tiktok" }
                ].map(({ icon: Icon, value }) => (
                  <button
                    key={value}
                    onClick={() => togglePlatform(value as Platform)}
                    className={`inline-flex items-center p-2 rounded-full border transition-all
                      ${selectedPlatforms.includes(value as Platform)
                        ? 'bg-blue-50 text-blue-600 border-blue-200 shadow-sm'
                        : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                ))}
              </div>

              {/* Time Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="default" 
                    className="h-10 text-sm gap-2 px-4 rounded-full border-gray-200 bg-white hover:bg-gray-50 transition-all"
                  >
                    {timeFilter}
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48 rounded-xl shadow-xl border-gray-100 bg-white/95 backdrop-blur-sm p-2">
                  <DropdownMenuItem 
                    className="text-sm py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleTimeFilterSelect("Gesamter Zeitraum")}
                  >
                    Gesamter Zeitraum
                  </DropdownMenuItem>
                  <div className="h-px bg-gray-100 my-2" />
                  <DropdownMenuItem 
                    className="text-sm py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleTimeFilterSelect("Nächste 24 Stunden")}
                  >
                    Nächste 24 Stunden
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-sm py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleTimeFilterSelect("Diese Woche")}
                  >
                    Diese Woche
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-sm py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleTimeFilterSelect("Dieser Monat")}
                  >
                    Dieser Monat
                  </DropdownMenuItem>
                  <div className="h-px bg-gray-100 my-2" />
                  <DropdownMenuItem 
                    className="text-sm py-2.5 px-3 rounded-lg hover:bg-teal-50 hover:text-teal-600 transition-colors cursor-pointer flex items-center gap-2"
                    onClick={() => handleTimeFilterSelect("Benutzerdefiniert")}
                  >
                    <CalendarIcon className="w-4 h-4" />
                    Benutzerdefiniert
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className={`transition-all duration-300 ease-out ${isAiChatOpen ? 'transform translate-y-2' : ''}`}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-medium text-gray-400">
              Beiträge & Entwürfe
            </h2>
            <div className="flex items-center gap-4">
              {/* Pagination Info */}
              {filteredPosts.length > 0 && (
                <span className="text-xs text-gray-400">
                  {currentPage * postsPerPage - postsPerPage + 1}-{Math.min(currentPage * postsPerPage, filteredPosts.length)} von {filteredPosts.length} Beiträgen
                </span>
              )}
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevPage}
                    disabled={!hasPrevPage}
                    className="h-8 w-8 p-0 rounded-full border-gray-200"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  
                  {/* Page numbers - show up to 5 pages */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPage <= 3) {
                        pageNum = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = currentPage - 2 + i
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "ghost"}
                          size="sm"
                          onClick={() => handlePageClick(pageNum)}
                          className={`h-8 w-8 p-0 rounded-full text-xs ${
                            currentPage === pageNum 
                              ? 'bg-teal-500 text-white' 
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={!hasNextPage}
                    className="h-8 w-8 p-0 rounded-full border-gray-200"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Post Grid - Now showing paginated posts */}
          <div className="grid grid-cols-4 gap-3 pb-4">
            {paginatedPosts.map((post) => (
              <Card 
                key={post.id} 
                className="overflow-hidden group border border-gray-100 shadow-sm bg-white hover:shadow-md transition-all duration-300 rounded-2xl cursor-pointer"
                onClick={() => handlePostClick(post)}
              >
                {/* Media Preview */}
                <div className="aspect-video relative bg-gray-50 rounded-t-2xl overflow-hidden">
                  {/* Media Type Indicator */}
                  <div className="absolute top-2 left-2 z-10">
                    {post.mediaType === 'video' && (
                      <div className="bg-black/80 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1.5">
                        <Play className="w-3 h-3" />
                        VIDEO
                      </div>
                    )}
                    {post.mediaType === 'carousel' && (
                      <div className="bg-black/80 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1.5">
                        <ImageIcon className="w-3 h-3" />
                        {post.mediaUrls.length} PHOTOS
                      </div>
                    )}
                  </div>

                  {/* Video Views Count - Always visible for videos */}
                  {post.mediaType === 'video' && (
                    <div className="absolute top-2 right-2 z-10">
                      <div className="bg-black/80 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                        <Play className="w-3 h-3" />
                        {post.views && post.views > 0 ? post.views.toLocaleString() : '0'} views
                      </div>
                    </div>
                  )}

                  {/* Enhanced Media Display with Loading States */}
                  <MediaPreview 
                    src={post.media}
                    mediaUrls={post.mediaUrls}
                    mediaType={post.mediaType}
                    alt={`${post.mediaType} preview`}
                    className={`object-cover w-full h-full transition-transform duration-300 ${
                      post.mediaType === 'video' 
                        ? 'group-hover:scale-105 filter brightness-95' 
                        : 'group-hover:scale-105'
                    }`}
                  />

                  {/* Video Play Overlay */}
                  {post.mediaType === 'video' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 bg-black/50 rounded-full flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity duration-300">
                        <Play className="w-6 h-6 text-white ml-1" />
                      </div>
                    </div>
                  )}

                  {/* Carousel Indicators */}
                  {post.mediaType === 'carousel' && post.mediaUrls.length > 1 && (
                    <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
                      {post.mediaUrls.slice(0, 5).map((_, index) => (
                        <div
                          key={index}
                          className="w-1.5 h-1.5 bg-white/60 rounded-full"
                        />
                      ))}
                      {post.mediaUrls.length > 5 && (
                        <div className="w-1.5 h-1.5 bg-white/60 rounded-full ml-1" />
                      )}
                    </div>
                  )}
                  
                  {/* Status Badge */}
                  <div className="absolute top-3 right-3">
                    <Badge 
                      className={`${
                        post.status === 'published' 
                          ? 'bg-green-50/90 text-green-600 border-green-200' 
                          : post.status === 'scheduled'
                          ? 'bg-blue-50/90 text-blue-600 border-blue-200'
                          : post.status === 'draft'
                          ? 'bg-gray-50/90 text-gray-600 border-gray-200'
                          : 'bg-red-50/90 text-red-600 border-red-200'
                      } text-xs px-2.5 py-1 rounded-full border shadow-sm backdrop-blur-sm`}
                    >
                      {post.status === 'published' ? 'Veröffentlicht' : 
                       post.status === 'scheduled' ? 'Geplant' : 
                       post.status === 'draft' ? 'Entwurf' : 'Fehlgeschlagen'}
                    </Badge>
                  </div>

                  {/* Enhanced Hover Overlay with All Metrics */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-wrap items-center justify-center gap-3 text-white text-xs">
                      {post.likes !== undefined && post.likes > 0 && (
                        <div className="flex items-center gap-1 bg-black/50 px-2 py-1 rounded-full">
                          <Heart className="w-3 h-3" />
                          <span className="font-medium">{post.likes.toLocaleString()}</span>
                        </div>
                      )}
                      {post.comments !== undefined && post.comments > 0 && (
                        <div className="flex items-center gap-1 bg-black/50 px-2 py-1 rounded-full">
                          <MessageCircle className="w-3 h-3" />
                          <span className="font-medium">{post.comments.toLocaleString()}</span>
                        </div>
                      )}
                      {post.views !== undefined && post.views > 0 && post.mediaType === 'video' && (
                        <div className="flex items-center gap-1 bg-black/50 px-2 py-1 rounded-full">
                          <Play className="w-3 h-3" />
                          <span className="font-medium">{post.views.toLocaleString()}</span>
                        </div>
                      )}
                      {post.shares !== undefined && post.shares > 0 && (
                        <div className="flex items-center gap-1 bg-black/50 px-2 py-1 rounded-full">
                          <Share className="w-3 h-3" />
                          <span className="font-medium">{post.shares.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Content Preview */}
                <div className="p-4">
                  <div className="flex items-center gap-1.5 mb-3">
                    {post.platforms.slice(0, 4).map((platform) => {
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
                          className="w-6 h-6 bg-gray-50 rounded-full flex items-center justify-center"
                        >
                          {Icon && <Icon className="w-3.5 h-3.5 text-gray-600" />}
                        </div>
                      )
                    })}
                    {post.platforms.length > 4 && (
                      <div className="w-6 h-6 bg-gray-50 rounded-full flex items-center justify-center">
                        <span className="text-xs text-gray-600">+{post.platforms.length - 4}</span>
                      </div>
                    )}
                    <span className="text-xs text-gray-500 ml-auto">
                      {post.status === 'scheduled' ? 
                        `📅 ${new Date(post.date).toLocaleDateString('de-DE', { 
                          day: '2-digit', 
                          month: '2-digit',
                          year: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}` : 
                        new Date(post.date).toLocaleDateString('de-DE', { 
                          day: '2-digit', 
                          month: '2-digit' 
                        })
                      }
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-700 mb-4 line-clamp-3 leading-relaxed">
                    {post.text}
                  </p>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    {post.status === 'published' ? (
                      <>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="flex-1 border-gray-200 rounded-full h-8 hover:bg-gray-50 text-xs"
                          onClick={(e) => {
                            e.stopPropagation()
                            // Handle view analytics
                          }}
                        >
                          View Analytics
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="flex-1 border-gray-200 rounded-full h-8 hover:bg-gray-50 text-xs"
                          onClick={(e) => {
                            e.stopPropagation()
                            // Handle boost post
                          }}
                        >
                          Boost Post
                        </Button>
                      </>
                    ) : post.status === 'scheduled' ? (
                      <>
                        <Button 
                          size="sm" 
                          className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-full h-8 text-xs"
                          onClick={(e) => {
                            e.stopPropagation()
                            // Handle post now
                          }}
                        >
                          Post Now
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1 border-gray-200 rounded-full h-8 hover:bg-gray-50 text-xs"
                          onClick={(e) => {
                            e.stopPropagation()
                            // Handle reschedule
                          }}
                        >
                          Reschedule
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button 
                          size="sm" 
                          className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-full h-8 text-xs"
                          onClick={(e) => {
                            e.stopPropagation()
                            // Handle post now
                          }}
                        >
                          Post Now
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1 border-gray-200 rounded-full h-8 hover:bg-gray-50 text-xs"
                          onClick={(e) => {
                            e.stopPropagation()
                            // Handle schedule
                          }}
                        >
                          Schedule
                        </Button>
                      </>
                    )}
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="px-2 h-8 w-8 rounded-full hover:bg-gray-100"
                      onClick={(e) => {
                        e.stopPropagation()
                        // Handle edit
                      }}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Empty State */}
          {filteredPosts.length === 0 && (
            <div className="text-center py-8">
              <Video className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <h3 className="text-sm font-medium text-gray-900 mb-1">
                Keine Beiträge gefunden
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                Passe deine Filter an oder erstelle einen neuen Beitrag.
              </p>
              <Button 
                onClick={handleOpenAiWorkflow}
                size="sm" 
                className="h-7 text-xs gap-1.5 px-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 rounded-full"
              >
                <Plus className="w-3.5 h-3.5" />
                Neuer Post
              </Button>
            </div>
          )}

          {/* Load More for Better UX (Alternative to pagination) */}
          {filteredPosts.length > 0 && hasNextPage && (
            <div className="text-center py-6">
              <Button
                variant="outline"
                onClick={handleNextPage}
                className="gap-2 rounded-full border-gray-200 hover:bg-gray-50"
              >
                Weitere Beiträge laden ({filteredPosts.length - currentPage * postsPerPage} verbleibend)
                <ChevronDown className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Calendar Popup */}
      <CalendarPopup
        isOpen={isCalendarOpen}
        selectedInterval={selectedInterval}
        onIntervalSelect={handleIntervalSelect}
        onClose={() => setIsCalendarOpen(false)}
      />

      {/* AI Post Workflow */}
            <AIPostWorkflow
        open={isAiWorkflowOpen} 
        onOpenChange={setIsAiWorkflowOpen} 
        onPostCreated={actions.fetchPosts}
      />

      {/* Post Detail Popup */}
      <PostDetailPopup
        post={selectedPost}
        isOpen={isPostDetailOpen}
        onClose={() => setIsPostDetailOpen(false)}
        onSave={handlePostSave}
        onDelete={handlePostDelete}
        onDuplicate={handlePostDuplicate}
      />

    </div>
  )
}) 