"use client"

import { useState, useEffect } from "react"
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
  CalendarIcon
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"

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
      setEditedPost({ ...post })
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

      // Update the post with all edited values
      const updatedPost = {
        ...editedPost,
        date: scheduledDateTime.toISOString(),
        status: selectedTime ? 'scheduled' : editedPost.status
      };

      // Update the local state immediately for better UX
      setEditedPost(updatedPost);
      
      onSave(updatedPost);
      setIsEditing(false);
      setActiveTab('preview');
      toast.success('Post updated successfully!');
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
    
    // Immediately update the editedPost state so the header shows the new date
    setEditedPost({
      ...editedPost,
      date: scheduledDateTime.toISOString(),
      status: selectedTime ? 'scheduled' : editedPost.status
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

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl w-full h-[90vh] max-h-[900px] p-0 bg-white rounded-2xl border-0 shadow-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Post Details - {statusLabels[post.status]}</DialogTitle>
          </DialogHeader>
          <div className="absolute right-4 top-2 z-50 flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onDuplicate(post)}>
                  <Copy className="w-4 h-4 mr-2" />
                  Duplizieren
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Share2 className="w-4 h-4 mr-2" />
                  Teilen
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-red-600"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Löschen
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="h-full flex">
            {/* Left side - Media */}
            <div className="flex-1 bg-black rounded-l-2xl relative">
              <div className="absolute inset-0 flex items-center justify-center">
                {post.mediaType === 'video' ? (
                  <div className="relative w-full h-full">
                    <img
                      src={post.media}
                      alt="Post preview"
                      className="object-contain w-full h-full"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                        <Play className="w-8 h-8 text-white ml-1" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <img
                    src={post.media}
                    alt="Post preview"
                    className="object-contain w-full h-full"
                  />
                )}
              </div>
            </div>

            {/* Right side - Content */}
            <div className="w-96 flex flex-col bg-white rounded-r-2xl">
              {/* Header */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full flex items-center justify-center">
                      <Settings className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Post Details</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          className={`${statusColors[editedPost?.status || post.status]} text-xs px-2 py-0.5 rounded-full border`}
                        >
                          {statusLabels[editedPost?.status || post.status]}
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
                    { id: 'analytics', label: 'Statistiken', icon: BarChart3 }
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

              {/* Content Area */}
              <div className="flex-1 overflow-hidden">
                {activeTab === 'preview' && (
                  <div className="p-4 space-y-4">
                    {/* Post Content */}
                    <div className="space-y-3">
                      <p className="text-gray-900 leading-relaxed">{post.text}</p>
                      
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

                    {/* Actions */}
                    <div className="space-y-2 pt-4 border-t border-gray-100">
                      <Button 
                        className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600"
                        onClick={() => setActiveTab('edit')}
                      >
                        <Edit3 className="w-4 h-4 mr-2" />
                        Bearbeiten
                      </Button>
                      
                      {post.status === 'draft' && (
                        <Button variant="outline" className="w-full">
                          <Send className="w-4 h-4 mr-2" />
                          Jetzt veröffentlichen
                        </Button>
                      )}
                      
                      {post.status === 'scheduled' && (
                        <Button variant="outline" className="w-full">
                          <Calendar className="w-4 h-4 mr-2" />
                          Zeitplan ändern
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'edit' && (
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
                          className="min-h-[100px] resize-none"
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
                                      
                                      setEditedPost({
                                        ...editedPost,
                                        date: updatedDateTime.toISOString(),
                                        status: 'scheduled'
                                      });
                                    }
                                  }}
                                  className="w-full text-sm border-gray-200 hover:border-teal-300 focus:border-teal-500 focus:ring-teal-500"
                                />
                                <Clock className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Save Button */}
                      <div className="flex gap-2 pt-4 border-t border-gray-100">
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
                  </div>
                )}

                {activeTab === 'analytics' && (
                  <div className="p-4 space-y-4">
                    <div className="text-center py-8">
                      <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Statistiken
                      </h3>
                      <p className="text-sm text-gray-500 mb-4">
                        Detaillierte Analyse der Post-Performance
                      </p>
                      
                      {post.status === 'published' && (
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
                      
                      {post.status !== 'published' && (
                        <p className="text-sm text-gray-400 mt-4">
                          Statistiken werden nach der Veröffentlichung verfügbar sein.
                        </p>
                      )}
                    </div>
                  </div>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Möchten Sie diesen Post wirklich löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden. 
              {post.status === 'scheduled' && ' Der geplante Post wird nicht veröffentlicht und alle Zeitpläne werden entfernt.'}
              {post.status === 'draft' && ' Der Entwurf wird dauerhaft gelöscht und kann nicht wiederhergestellt werden.'}
              {post.status === 'published' && ' Der bereits veröffentlichte Post wird aus der Datenbank entfernt, bleibt aber auf den sozialen Medien sichtbar.'}
              {post.status === 'failed' && ' Der fehlgeschlagene Post wird dauerhaft aus der Liste entfernt.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 focus:ring-red-500">
              Endgültig löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
} 