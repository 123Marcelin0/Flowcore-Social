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
  ChevronRight,
  ChevronDown
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
import { OptimizedAIChat } from "./optimized-ai-chat"
import { DashboardButtonGroup } from "./dashboard-button-group"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { usePost } from "@/lib/post-context"
import { useAuth } from "@/lib/auth-context"
import { useDate } from "@/lib/date-context"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

// Enhanced Media Preview Component
interface MediaPreviewProps {
  src: string
  mediaUrls: string[]
  mediaType: "image" | "video" | "carousel" | "text"
  alt: string
  className: string
}

function MediaPreview({ src, mediaUrls, mediaType, alt, className }: MediaPreviewProps) {
  const [currentSrc, setCurrentSrc] = useState(() => {
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
    if (!triedProxy && !currentSrc.includes('/api/media-proxy') && urlIndex < mediaUrls.length) {
      const originalUrl = mediaUrls[urlIndex] || src
      if (originalUrl) {
        setCurrentSrc(getProxiedUrl(originalUrl))
        setTriedProxy(true)
        setIsLoading(true)
        setHasError(false)
        return
      }
    }
    
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
    
    if (currentSrc !== '/placeholder.svg') {
      setCurrentSrc('/placeholder.svg')
      setIsLoading(true)
      setHasError(false)
      return
    }
    
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

// Post interfaces
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

interface Post {
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

interface TimeInterval {
  startDate: Date
  startTime?: string
  endDate?: Date
  endTime?: string
}

type Platform = 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'tiktok'
type PostStatus = 'draft' | 'scheduled' | 'published' | 'failed'

// Convert PostContext Post to component DashboardPost format
const convertPostContextToComponentPost = (post: any): DashboardPost => {
  let displayDate = post.createdAt;
  
  if (post.scheduledDate && post.scheduledTime) {
  if (post.scheduledDate && post.scheduledTime) {
    try {
      const [year, month, day] = post.scheduledDate.split('-').map(Number);
      const [hours, minutes] = post.scheduledTime.split(':').map(Number);
      const scheduledDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
      if (!isNaN(scheduledDateTime.getTime())) {
        displayDate = scheduledDateTime.toISOString();
      }
    } catch (error) {
      console.error('Error parsing scheduled date:', error);
    }
  } else if (post.scheduledDate) {
    try {
      const [year, month, day] = post.scheduledDate.split('-').map(Number);
      const dateOnly = new Date(year, month - 1, day, 12, 0, 0, 0);
      if (!isNaN(dateOnly.getTime())) {
        displayDate = dateOnly.toISOString();
      }
    } catch (error) {
      console.error('Error parsing scheduled date:', error);
    }
  }
  } else if (post.published_at) {
    displayDate = post.published_at;
  } else if (post.created_at) {
    displayDate = post.created_at;
  }

  let mediaUrls: string[] = [];
  let primaryMedia = '/placeholder.jpg';
  
  if (post.media_urls && Array.isArray(post.media_urls) && post.media_urls.length > 0) {
    mediaUrls = post.media_urls.filter(Boolean);
    primaryMedia = mediaUrls[0];
  } else if (post.image) {
    mediaUrls = [post.image];
    primaryMedia = post.image;
  }

  let mediaType: "image" | "video" | "carousel" | "text" = "image";
  if (post.media_type) {
    mediaType = post.media_type as "image" | "video" | "carousel" | "text";
  } else if (mediaUrls.length > 1) {
    mediaType = "carousel";
  } else if (mediaUrls.some(url => url.toLowerCase().includes('.mp4') || url.toLowerCase().includes('video'))) {
    mediaType = "video";
  }

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
    views: post.impressions || 0,
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

export const DashboardOverviewOptimized = memo(function DashboardOverviewOptimized() {
  const { user } = useAuth()
  const { state, actions } = usePost()
  const { state: dateState } = useDate()
  const router = useRouter()
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([])
  const [selectedStatus, setSelectedStatus] = useState<string>("Alle")
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
  const [postsPerPage] = useState(16) // 4x4 grid

  // Get posts from context and convert to component format
  const posts = useMemo(() => {
    return Object.values(state.posts).map(convertPostContextToComponentPost)
  }, [state.posts])

  // Memoized filtered posts  
  const filteredPosts = useMemo(() => {
    const sortedPosts = [...posts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return sortedPosts.filter((post: DashboardPost) => {
      const platformMatch = selectedPlatforms.length === 0 || 
        post.platforms.some(p => selectedPlatforms.includes(p))
      const statusMatch = selectedStatus === "Alle" || 
        statusLabels[post.status as keyof typeof statusLabels] === selectedStatus

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
  }, [posts, selectedPlatforms, selectedStatus, selectedInterval])

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

  const togglePlatform = useCallback((platform: Platform) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    )
  }, [])


  const handleOpenAiWorkflow = useCallback(() => {
    setIsAiWorkflowOpen(true)
  }, [])

  const handlePostClick = useCallback((post: DashboardPost) => {
    const convertToPopupPost = (dashboardPost: DashboardPost): Post => ({
      id: dashboardPost.id,
      media: dashboardPost.media,
      mediaUrls: dashboardPost.mediaUrls,
      mediaType: dashboardPost.mediaType,
      text: dashboardPost.text,
      platforms: dashboardPost.platforms,
      status: dashboardPost.status,
      date: dashboardPost.date,
      likes: dashboardPost.likes,
      comments: dashboardPost.comments,
      views: dashboardPost.views,
      shares: dashboardPost.shares,
      reach: dashboardPost.reach
    })
    
    setSelectedPost(convertToPopupPost(post))
    setIsPostDetailOpen(true)
  }, [])

  if (state.loading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-teal-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading posts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full overflow-y-auto p-8 bg-transparent">
      {/* Top Header Section */}
      <div className="max-w-[1200px] mx-auto pb-6">
        <div className="mb-4">
          <DashboardButtonGroup 
            selectedStatus={selectedStatus}
            setSelectedStatus={setSelectedStatus}
            onOpenAiWorkflow={handleOpenAiWorkflow}
            showAiWorkflowButton={true}
          />

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
                      ? 'bg-white/30 text-white border-white/50 shadow-sm backdrop-blur-sm'
                      : 'bg-white/10 text-white/70 border-white/20 hover:bg-white/20 hover:text-white'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Main Content Area */}
        <div className="transition-all duration-300 mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-medium text-white/60">
              Beiträge & Entwürfe
            </h2>
          <div className="flex items-center gap-4">
            {/* Pagination Info */}
            {filteredPosts.length > 0 && (
              <span className="text-xs text-white/50">
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
                  className="h-8 w-8 p-0 rounded-full border-white/30 bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
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
                            ? 'bg-white/40 backdrop-blur-sm text-white border border-white/50' 
                            : 'text-white/70 hover:bg-white/20 hover:text-white'
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
                  className="h-8 w-8 p-0 rounded-full border-white/30 bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Post Grid - Clean, minimal card design */}
        <div className="grid grid-cols-4 gap-8 pb-8 max-w-6xl mx-auto">
          {paginatedPosts.map((post) => (
            <Card 
              key={post.id} 
              className="group border-0 shadow-lg bg-white/95 hover:shadow-2xl transition-all duration-300 rounded-[2rem] cursor-pointer relative"
              onClick={() => handlePostClick(post)}
            >
              {/* Card Container with Padding */}
              <div className="p-2.5">
                {/* Media Preview - Tall rectangle with padding from borders */}
                <div className="aspect-[3/4] relative rounded-[1.5rem] overflow-hidden bg-gray-100">
                  <MediaPreview 
                    src={post.media}
                    mediaUrls={post.mediaUrls}
                    mediaType={post.mediaType}
                    alt={`${post.mediaType} preview`}
                    className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                  />
                  
                  {/* Date at top left with glowing transparent white effect */}
                  <div className="absolute top-3 left-3">
                    <h3 
                      className="text-white font-semibold text-base"
                      style={{
                        textShadow: '0 0 20px rgba(255, 255, 255, 0.8), 0 0 40px rgba(255, 255, 255, 0.4)',
                        color: 'rgba(255, 255, 255, 0.95)'
                      }}
                    >
                      {new Date(post.date).toLocaleDateString('de-DE', { 
                        day: '2-digit', 
                        month: '2-digit'
                      })}
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

                  {/* Status indicator at bottom right */}
                  <div className="absolute bottom-3 right-3">
                    <div className="text-xs text-white/80 bg-black/30 px-2 py-1 rounded-full">
                      {post.status === 'published' ? 'Live' : 
                       post.status === 'scheduled' ? 'Geplant' : 
                       post.status === 'draft' ? 'Entwurf' : 'Status'}
                    </div>
                  </div>
                </div>

                {/* Simple content preview below image */}
                <div className="pt-3">
                  <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed">
                    {post.text.substring(0, 100)}{post.text.length > 100 ? '...' : ''}
                  </p>
                  
                  {/* Minimal metrics - only show if values > 0 */}
                  {((post.likes && post.likes > 0) || (post.comments && post.comments > 0)) && (
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      {post.likes && post.likes > 0 && (
                        <div className="flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          {post.likes}
                        </div>
                      )}
                      {post.comments && post.comments > 0 && (
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" />
                          {post.comments}
                        </div>
                      )}
                    </div>
                  )}
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

        {/* Load More Button for Better UX */}
        {filteredPosts.length > 0 && hasNextPage && (
          <div className="text-center py-6">
            <Button
              variant="outline"
              onClick={handleNextPage}
              className="gap-2 rounded-full border-white/30 bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
            >
              Weitere Beiträge laden ({filteredPosts.length - currentPage * postsPerPage} verbleibend)
              <ChevronDown className="w-4 h-4" />
            </Button>
          </div>
        )}

        </div>
      </div>

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
        onSave={async (updatedPost: Post) => {
          try {
            const postDate = new Date(updatedPost.date);
            if (isNaN(postDate.getTime())) {
              throw new Error('Invalid date format');
            }

            const scheduledDate = `${postDate.getFullYear()}-${String(postDate.getMonth() + 1).padStart(2, '0')}-${String(postDate.getDate()).padStart(2, '0')}`;
            const scheduledTime = `${String(postDate.getHours()).padStart(2, '0')}:${String(postDate.getMinutes()).padStart(2, '0')}`;
            
            const updateData = {
              title: updatedPost.text ? updatedPost.text.substring(0, 100) : 'Untitled Post',
              content: updatedPost.text,
              platforms: updatedPost.platforms,
              image: updatedPost.media,
              status: updatedPost.status,
              scheduledDate,
              scheduledTime,
              likes: updatedPost.likes || 0,
              comments: updatedPost.comments || 0,
              shares: 0
            };

            await actions.updatePost(updatedPost.id, updateData);
            setSelectedPost(updatedPost);
            await actions.fetchPosts();
            toast.success('Beitrag erfolgreich aktualisiert!');
          } catch (error) {
            console.error('Error updating post:', error);
            if (error instanceof Error && error.message === 'Invalid date format') {
              toast.error('Ungültiges Datumsformat');
            } else {
              toast.error('Fehler beim Aktualisieren des Beitrags');
            }
          }
        }}
        onDelete={async (postId: string) => {
          try {
            await actions.deletePost(postId)
          } catch (error) {
            console.error('Error deleting post:', error)
          }
        }}
        onDuplicate={async (post: Post) => {
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
        }}
      />
    </div>
  )
}) 