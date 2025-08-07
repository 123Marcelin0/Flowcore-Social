"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CalendarPopup } from "@/components/ui/calendar-popup"
import { toast } from "sonner"
import {
  X,
  Edit3,
  Copy,
  Trash2,
  Share2,
  MoreHorizontal,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Video,
  Play,
  Heart,
  MessageCircle,
  Share,
  Bookmark,
  Calendar,
  Send,
  Eye,
  BarChart3,
  Clock,
  Check,
  Settings,
  CalendarIcon,
  Image as ImageIcon,
  Loader2
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"

// Enhanced Media Preview Component for Post Detail View
interface MediaPreviewProps {
  src: string
  mediaUrls?: string[]
  mediaType?: "image" | "video" | "carousel" | "text"
  alt: string
  className: string
}

function MediaPreview({ src, mediaUrls = [src], mediaType = 'image', alt, className }: MediaPreviewProps) {
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
    console.log(`Post detail: Failed to load image: ${currentSrc}`)
    
    // If we haven't tried the proxy yet for this URL, try it
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
        <div className="text-center text-gray-500">
          {mediaType === 'video' ? (
            <Video className="w-12 h-12 mx-auto mb-2" />
          ) : (
            <ImageIcon className="w-12 h-12 mx-auto mb-2" />
          )}
          <div className="text-sm font-medium mb-1">
            {mediaType === 'video' ? 'Video Content' : 'Image Content'}
          </div>
          <div className="text-xs opacity-75">Instagram Media</div>
        </div>
      </div>
    )
  }

  return (
    <>
      {isLoading && (
        <div className={`absolute inset-0 bg-gray-200 flex items-center justify-center z-10`}>
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
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
  approved?: boolean
}

interface PostDetailPopupProps {
  post: Post | null
  isOpen: boolean
  onClose: () => void
  onSave: (updatedPost: Post) => void
  onDelete: (postId: string) => void
  onDuplicate: (post: Post) => void
}

interface TimeInterval {
  startDate: Date
  startTime?: string
  endDate?: Date
  endTime?: string
}

// Helper function to check if a date is in the past
function isDateInPast(dateString: string): boolean {
  const postDate = new Date(dateString);
  const now = new Date();
  
  // If the date is invalid, consider it as past to be safe
  if (isNaN(postDate.getTime())) {
    return true;
  }
  
  return postDate < now;
}

// Helper function to get the correct status for a post
function getCorrectPostStatus(originalStatus: string, dateString: string): "scheduled" | "published" | "draft" | "failed" {
  // Only check for past dates if the original status is scheduled
  if (originalStatus === 'scheduled') {
    // If the post date is in the past, it cannot be scheduled
    if (isDateInPast(dateString)) {
      return 'draft'; // Convert past scheduled posts to drafts
    }
  }
  
  // Return the original status for all other cases
  return originalStatus as "scheduled" | "published" | "draft" | "failed";
}

export function PostDetailPopup({ post, isOpen, onClose, onSave, onDelete, onDuplicate }: PostDetailPopupProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedPost, setEditedPost] = useState<Post | null>(null)
  const [activeTab, setActiveTab] = useState<'preview' | 'edit' | 'analytics'>('preview')
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedInterval, setSelectedInterval] = useState<TimeInterval>({
    startDate: new Date(),
    startTime: "09:00",
    endDate: new Date(),
    endTime: "17:00"
  })

  useEffect(() => {
    if (post) {
      // Correct the post status if it's in the past
      const correctedStatus = getCorrectPostStatus(post.status, post.date);
      const correctedPost: Post = {
        ...post,
        status: correctedStatus
      };
      
      setEditedPost(correctedPost)
      setIsEditing(false)
      setActiveTab('preview')
      
      // Parse existing date if available
      if (post.date) {
        const existingDate = new Date(post.date)
        const timeString = existingDate.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
        setSelectedInterval({
          startDate: existingDate,
          startTime: timeString,
          endDate: existingDate,
          endTime: timeString
        })
      }
    }
  }, [post])

  if (!post || !editedPost) return null

  const handleSave = () => {
    if (editedPost) {
      // Create a date object with precise timezone handling
      const selectedDate = selectedInterval.startDate;
      const selectedTime = selectedInterval.startTime;
      
      let scheduledDateTime: Date;
      
      if (selectedTime) {
        // Parse time components carefully
        const [hours, minutes] = selectedTime.split(':').map(Number);
        
        // Create date in local timezone to maintain precision
        scheduledDateTime = new Date(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          selectedDate.getDate(),
          hours,
          minutes,
          0,
          0
        );
      } else {
        // If no time specified, use noon to avoid timezone edge cases
        scheduledDateTime = new Date(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          selectedDate.getDate(),
          12,
          0,
          0,
          0
        );
      }

      // Determine the correct status - can only be scheduled if date is in the future
      let newStatus: "scheduled" | "published" | "draft" | "failed" = editedPost.status;
      if (selectedTime && scheduledDateTime > new Date()) {
        newStatus = 'scheduled';
      } else if (isDateInPast(scheduledDateTime.toISOString())) {
        newStatus = 'draft'; // Force draft status for past dates
        toast.warning('Posts können nicht für vergangene Zeiten geplant werden. Als Entwurf gespeichert.');
      }

      // Update the post with all edited values
      const updatedPost = {
        ...editedPost,
        date: scheduledDateTime.toISOString(),
        status: newStatus
      };

      // Update the local state immediately for better UX
      setEditedPost(updatedPost);
      
      onSave(updatedPost);
      setIsEditing(false);
      setActiveTab('preview');
      toast.success('Beitrag erfolgreich aktualisiert!');
    }
  }

  const handleDelete = () => {
    onDelete(post.id)
    setShowDeleteDialog(false)
    onClose()
  }

  const handlePlatformToggle = (platform: string) => {
    if (!editedPost) return
    
    const newPlatforms = editedPost.platforms.includes(platform as any)
      ? editedPost.platforms.filter(p => p !== platform)
      : [...editedPost.platforms, platform as any]
    
    setEditedPost({
      ...editedPost,
      platforms: newPlatforms
    })
  }

  const handleScheduleTimeSelect = (interval: TimeInterval) => {
    if (!editedPost) return;
    
    // Create a date object with precise timezone handling
    const selectedDate = interval.startDate;
    const selectedTime = interval.startTime;
    
    let scheduledDateTime: Date;
    
    if (selectedTime) {
      // Parse time components carefully  
      const [hours, minutes] = selectedTime.split(':').map(Number);
      
      // Create date in local timezone to maintain precision
      scheduledDateTime = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        hours,
        minutes,
        0,
        0
      );
    } else {
      // If no time specified, use noon to avoid timezone edge cases
      scheduledDateTime = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(), 
        selectedDate.getDate(),
        12,
        0,
        0,
        0
      );
    }
    
    // Update the interval state
    setSelectedInterval(interval);
    
    // Determine correct status based on date
    let newStatus: "scheduled" | "published" | "draft" | "failed" = editedPost.status;
    if (selectedTime && scheduledDateTime > new Date()) {
      newStatus = 'scheduled';
    } else if (isDateInPast(scheduledDateTime.toISOString())) {
      newStatus = 'draft';
    }
    
    // Immediately update the editedPost state so the header shows the new date
    setEditedPost({
      ...editedPost,
      date: scheduledDateTime.toISOString(),
      status: newStatus
    });
    
    setIsCalendarOpen(false);
  }

  const platformIcons = {
    instagram: Instagram,
    facebook: Facebook,
    twitter: Twitter,
    linkedin: Linkedin,
    tiktok: Video
  }

  const statusColors = {
    scheduled: "bg-blue-50 text-blue-600 border-blue-200",
    published: "bg-green-50 text-green-600 border-green-200",
    draft: "bg-gray-50 text-gray-600 border-gray-200",
    failed: "bg-red-50 text-red-600 border-red-200"
  }

  const statusLabels = {
    scheduled: "Geplant",
    published: "Veröffentlicht",
    draft: "Entwurf",
    failed: "Fehlgeschlagen"
  }

  // Get the corrected status for display
  const displayStatus: "scheduled" | "published" | "draft" | "failed" = getCorrectPostStatus(editedPost?.status || post.status, editedPost?.date || post.date);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl w-full h-[85vh] max-h-[800px] p-0 bg-white rounded-2xl border-0 shadow-2xl overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Post Details - {statusLabels[displayStatus]}</DialogTitle>
          </DialogHeader>
          
          {/* Header with trash can and close button */}
          <div className="absolute right-2 top-2 z-50 flex items-center gap-3">
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <Trash2 className="w-5 h-5 text-red-600" />
                    Post dauerhaft löschen?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    <div className="font-medium text-gray-900">
                      ⚠️ Diese Aktion kann nicht rückgängig gemacht werden!
                    </div>
                    <div>
                      {displayStatus === 'scheduled' && 'Der geplante Post wird nicht veröffentlicht und alle Zeitpläne werden entfernt.'}
                      {displayStatus === 'draft' && 'Der Entwurf wird dauerhaft gelöscht und kann nicht wiederhergestellt werden.'}
                      {displayStatus === 'published' && 'Der bereits veröffentlichte Post wird aus der Datenbank entfernt, bleibt aber auf den sozialen Medien sichtbar.'}
                      {displayStatus === 'failed' && 'Der fehlgeschlagene Post wird dauerhaft aus der Liste entfernt.'}
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDelete} 
                    className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Endgültig löschen
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="h-9 w-9 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="h-full flex">
            {/* Left side - Enhanced Media */}
            <div className="flex-1 bg-black rounded-l-2xl relative">
              <div className="absolute inset-0 flex items-center justify-center">
                {post.mediaType === 'video' ? (
                  <div className="relative w-full h-full">
                    <MediaPreview
                      src={post.media}
                      mediaUrls={[post.media]}
                      mediaType="video"
                      alt="Video post preview"
                      className="object-contain w-full h-full"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                        <Play className="w-8 h-8 text-white ml-1" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <MediaPreview
                    src={post.media}
                    mediaUrls={[post.media]}
                    mediaType={post.mediaType}
                    alt="Post preview"
                    className="object-contain w-full h-full"
                  />
                )}
              </div>
            </div>

            {/* Right side - Content */}
            <div className="w-96 flex flex-col bg-white rounded-r-2xl">
              {/* Header */}
              <div className="p-4 border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center justify-between pr-20"> {/* Add right padding to avoid button overlap */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full flex items-center justify-center">
                      <Settings className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Post Details</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          className={`${statusColors[displayStatus]} text-xs px-2 py-0.5 rounded-full border`}
                        >
                          {statusLabels[displayStatus]}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {new Date(editedPost?.date || post.date).toLocaleString('de-DE', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center justify-center bg-white rounded-full shadow-sm border border-gray-100 p-0.5 mt-4">
                  {[
                    { id: 'preview', label: 'Vorschau', icon: Eye },
                    { id: 'edit', label: 'Bearbeiten', icon: Edit3 },
                    { id: 'analytics', label: 'Analytik', icon: BarChart3 }
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setActiveTab(id as any)}
                      className={`px-2 py-1.5 text-xs font-medium transition-all relative flex items-center gap-1 min-w-0 flex-1 justify-center
                        ${activeTab === id
                          ? 'rounded-full bg-gradient-to-r from-teal-500/10 to-cyan-500/10 text-teal-600 border border-teal-200'
                          : 'text-gray-600 hover:bg-gray-50 rounded-full'
                        }`}
                    >
                      <Icon className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate text-xs">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Content Area with proper scrolling */}
              <div className="flex-1 overflow-hidden flex flex-col">
                {activeTab === 'preview' && (
                  <div className="flex-1 flex flex-col">
                    <ScrollArea className="flex-1">
                      <div className="p-4 space-y-4">
                        {/* Post Content with larger scroll container */}
                        <div className="space-y-3">
                          <div className="max-h-[300px] overflow-y-auto"> {/* Increased from 200px to 300px */}
                            <p className="text-gray-900 leading-relaxed whitespace-pre-wrap break-words">{post.text}</p>
                          </div>
                          
                          {/* Platforms */}
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">Plattformen:</span>
                            <div className="flex gap-2">
                              {post.platforms.map((platform) => {
                                const Icon = platformIcons[platform]
                                return (
                                  <div
                                    key={platform}
                                    className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center"
                                  >
                                    <Icon className="w-4 h-4 text-gray-600" />
                                  </div>
                                )
                              })}
                            </div>
                          </div>

                          {/* Engagement */}
                          {(post.likes !== undefined || post.comments !== undefined) && (
                            <div className="flex items-center gap-6 pt-3 border-t border-gray-100">
                              {post.likes !== undefined && (
                                <div className="flex items-center gap-2">
                                  <Heart className="w-5 h-5 text-red-500" />
                                  <span className="text-sm font-medium">{post.likes}</span>
                                </div>
                              )}
                              {post.comments !== undefined && (
                                <div className="flex items-center gap-2">
                                  <MessageCircle className="w-5 h-5 text-blue-500" />
                                  <span className="text-sm font-medium">{post.comments}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </ScrollArea>
                    
                    {/* Actions moved to bottom */}
                    <div className="p-4 border-t border-gray-100 space-y-2 flex-shrink-0">
                      <Button 
                        className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600"
                        onClick={() => setActiveTab('edit')}
                      >
                        <Edit3 className="w-4 h-4 mr-2" />
                        Bearbeiten
                      </Button>
                      
                      {displayStatus === 'draft' && (
                        <Button variant="outline" className="w-full">
                          <Send className="w-4 h-4 mr-2" />
                          Jetzt veröffentlichen
                        </Button>
                      )}
                      
                      {displayStatus === 'scheduled' && (
                        <Button variant="outline" className="w-full" onClick={() => setActiveTab('edit')}>
                          <Calendar className="w-4 h-4 mr-2" />
                          Zeitplan ändern
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'edit' && (
                  <div className="flex-1 flex flex-col">
                    <ScrollArea className="flex-1">
                      <div className="p-4 space-y-4">
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Post-Text
                            </label>
                            <Textarea
                              value={editedPost.text}
                              onChange={(e) => setEditedPost({...editedPost, text: e.target.value})}
                              placeholder="Was möchtest du teilen?"
                              className="min-h-[180px] max-h-[300px] resize-none" // Increased from 120px to 180px
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Plattformen
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                              {Object.entries(platformIcons).map(([platform, Icon]) => (
                                <div
                                  key={platform}
                                  className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                                    editedPost.platforms.includes(platform as any)
                                      ? 'border-teal-500 bg-teal-50'
                                      : 'border-gray-200 hover:border-gray-300'
                                  }`}
                                  onClick={() => handlePlatformToggle(platform)}
                                >
                                  <div className="flex items-center gap-2">
                                    <Icon className="w-4 h-4" />
                                    <span className="text-sm font-medium capitalize">
                                      {platform}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Zeitplan
                            </label>
                            <div className="space-y-2">
                              <div className="flex gap-2">
                                <div className="flex-1">
                                  <Button
                                    onClick={() => setIsCalendarOpen(true)}
                                    variant="outline"
                                    className="w-full justify-start border-gray-200 hover:border-teal-300"
                                  >
                                    <CalendarIcon className="w-4 h-4 mr-2 text-teal-600" />
                                    <span className="text-sm">
                                      {selectedInterval.startDate.toLocaleDateString('de-DE')}
                                    </span>
                                  </Button>
                                </div>
                                <div className="w-24">
                                  <div className="relative">
                                    <Input
                                      type="time"
                                      value={selectedInterval.startTime || '09:00'}
                                      onChange={(e) => {
                                        const newTime = e.target.value;
                                        const newInterval = {
                                          ...selectedInterval,
                                          startTime: newTime
                                        };
                                        setSelectedInterval(newInterval);
                                        
                                        // Immediately update the editedPost state so the header shows the new date
                                        if (editedPost) {
                                          const currentDate = selectedInterval.startDate;
                                          const [timeHours, timeMinutes] = newTime.split(':').map(Number);
                                          
                                          // Create date in local timezone to maintain precision
                                          const updatedDateTime = new Date(
                                            currentDate.getFullYear(),
                                            currentDate.getMonth(),
                                            currentDate.getDate(),
                                            timeHours,
                                            timeMinutes,
                                            0,
                                            0
                                          );
                                          
                                          // Determine correct status based on date
                                          let newStatus: "scheduled" | "published" | "draft" | "failed" = editedPost.status;
                                          if (updatedDateTime > new Date()) {
                                            newStatus = 'scheduled';
                                          } else {
                                            newStatus = 'draft';
                                          }
                                          
                                          setEditedPost({
                                            ...editedPost,
                                            date: updatedDateTime.toISOString(),
                                            status: newStatus
                                          });
                                        }
                                      }}
                                      className="w-full text-sm border-gray-200 hover:border-teal-300 focus:border-teal-500 focus:ring-teal-500"
                                    />
                                    <Clock className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                  </div>
                                </div>
                              </div>
                              {isDateInPast(editedPost.date) && (
                                <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-md">
                                  ⚠️ Datum liegt in der Vergangenheit. Post wird als Entwurf gespeichert.
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </ScrollArea>
                    
                    {/* Save Button moved to bottom */}
                    <div className="p-4 border-t border-gray-100 flex gap-2 flex-shrink-0">
                      <Button 
                        onClick={handleSave}
                        className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Speichern
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => setActiveTab('preview')}
                        className="flex-1"
                      >
                        Abbrechen
                      </Button>
                    </div>
                  </div>
                )}

                {activeTab === 'analytics' && (
                  <ScrollArea className="flex-1">
                    <div className="p-4 space-y-4">
                      <div className="text-center py-8">
                        <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          Statistiken
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">
                          Detaillierte Analyse der Post-Performance
                        </p>
                        
                        {displayStatus === 'published' && (
                          <div className="grid grid-cols-2 gap-4 mt-6">
                            <div className="bg-red-50 p-4 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <Heart className="w-5 h-5 text-red-500" />
                                <span className="text-sm font-medium">Likes</span>
                              </div>
                              <div className="text-2xl font-bold text-red-600">
                                {post.likes || 0}
                              </div>
                            </div>
                            <div className="bg-blue-50 p-4 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <MessageCircle className="w-5 h-5 text-blue-500" />
                                <span className="text-sm font-medium">Kommentare</span>
                              </div>
                              <div className="text-2xl font-bold text-blue-600">
                                {post.comments || 0}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {displayStatus !== 'published' && (
                          <p className="text-sm text-gray-400 mt-4">
                            Statistiken werden nach der Veröffentlichung verfügbar sein.
                          </p>
                        )}
                      </div>
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>
          </div>
            
          {/* Calendar Popup */}
          <CalendarPopup
            isOpen={isCalendarOpen}
            selectedInterval={selectedInterval}
            singleDateMode={true}
            showTimeSelect={true}
            onConfirm={handleScheduleTimeSelect}
            onClose={() => setIsCalendarOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
} 