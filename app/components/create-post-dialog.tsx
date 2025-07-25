"use client"

import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Upload, Instagram, Facebook, Twitter, Linkedin, Video, Image as ImageIcon, FileText, X, Sparkles, Wand2, Loader2, CheckCircle, VideoIcon, FileTextIcon, Home, Wand2Icon, ArrowRight, ArrowLeft, Calendar, Clock, Send } from "lucide-react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { CalendarPopup } from "@/components/ui/calendar-popup"
import { InteriorDesignWorkflow } from "./interior-design-workflow"
import { useAuth } from "@/lib/auth-context"
import { usePost } from "@/lib/post-context"
import { toast } from "sonner"

interface Platform {
  id: string
  name: string
  icon: string
  connected: boolean
}

const SAMPLE_PLATFORMS: Platform[] = [
  { id: "instagram", name: "Instagram", icon: "/instagram.svg", connected: true },
  { id: "twitter", name: "Twitter", icon: "/twitter.svg", connected: true },
  { id: "facebook", name: "Facebook", icon: "/facebook.svg", connected: false },
  { id: "linkedin", name: "LinkedIn", icon: "/linkedin.svg", connected: true },
]

interface CreatePostDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPostCreated?: () => void
  initialContent?: {
    title: string
    description: string
    hashtags: string[]
    category?: 'trend-reels' | 'content-strategies' | 'ai-strategies'
    source?: 'ai-generated' | 'trend-explorer' | 'manual' | 'content-strategy'
    tags?: string[]
  }
}

export function CreatePostDialog({ open, onOpenChange, onPostCreated, initialContent }: CreatePostDialogProps) {
  const { user } = useAuth()
  const { actions } = usePost()
  const [postType, setPostType] = useState<"image" | "video" | "text" | null>(null)
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [text, setText] = useState("")
  const [title, setTitle] = useState("")
  const [useAI, setUseAI] = useState(false)
  const [useInteriorDesign, setUseInteriorDesign] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState({ title: "", description: "" })
  const [transformedImage, setTransformedImage] = useState<{ url: string; blob: Blob } | null>(null)
  
  // Scheduling state
  const [publishNow, setPublishNow] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedTime, setSelectedTime] = useState<string>("12:00")
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  const connectedPlatforms = SAMPLE_PLATFORMS.filter(p => p.connected)

  // Pre-fill form with initial content when dialog opens
  useEffect(() => {
    if (open && initialContent) {
      setTitle(initialContent.title)
      setText(initialContent.description)
      if (initialContent.hashtags.length > 0) {
        // Add hashtags to the description
        const hashtagString = '\n\n' + initialContent.hashtags.join(' ')
        setText(prev => prev + hashtagString)
      }
      setPostType("text") // Default to text when pre-filling
    }
  }, [open, initialContent])

  // Ensure main dialog stays protected when calendar is open
  useEffect(() => {
    if (!isCalendarOpen) return

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Block all escape key attempts when calendar is open
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
        return false
      }
    }

    const handleGlobalClick = (e: MouseEvent) => {
      // Prevent any global click events from affecting the main dialog
      // when calendar is open
      e.stopPropagation()
    }

    // Add global listeners with high priority
    document.addEventListener('keydown', handleGlobalKeyDown, true)
    document.addEventListener('click', handleGlobalClick, true)

    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown, true)
      document.removeEventListener('click', handleGlobalClick, true)
    }
  }, [isCalendarOpen])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      
      if (postType === "image" && !selectedFile.type.startsWith("image/")) {
        toast.error("Bitte wähle eine Bilddatei aus")
        return
      }
      
      if (postType === "video" && !selectedFile.type.startsWith("video/")) {
        toast.error("Bitte wähle eine Videodatei aus")
        return
      }
      
      const maxSize = 10 * 1024 * 1024
      if (selectedFile.size > maxSize) {
        toast.error("Die Dateigröße darf nicht mehr als 10MB betragen")
        return
      }
      
      setFile(selectedFile)
      setTransformedImage(null)
    }
  }

  const handlePlatformToggle = (platformId: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platformId)
        ? prev.filter(id => id !== platformId)
        : [...prev, platformId]
    )
  }

  const handleGenerateContent = async () => {
    setIsGenerating(true)
    try {
      // Prepare the input for AI generation - use existing user content
      const userInput = text || title || "Immobilien Content"
      const contentType = postType || "general"
      
      // If user has already written content, use that as the primary input
      const existingContent = text || title || ""
      const aiPrompt = existingContent 
        ? `Basierend auf diesem Text erstelle einen verbesserten Social Media Post: "${existingContent}"`
        : "Immobilien Content"
      
      const response = await fetch('/api/generate-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userInput: aiPrompt,
          contentType,
          platforms: selectedPlatforms,
          language: 'german'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate content')
      }

      const data = await response.json()
      
      if (data.success && data.content) {
        setGeneratedContent({
          title: data.content.title,
          description: data.content.description
        })
        
        // Store hashtags for later use
        if (data.content.hashtags) {
          // You can add hashtags to the description or store them separately
          const hashtagString = data.content.hashtags.join(' ')
          setGeneratedContent(prev => ({
            ...prev,
            description: `${prev.description}\n\n${hashtagString}`
          }))
        }
        
        toast.success("KI-Inhalt erfolgreich generiert!")
      } else {
        throw new Error(data.error || 'Failed to generate content')
      }
    } catch (error) {
      console.error('Content generation error:', error)
      toast.error("Inhalt konnte nicht generiert werden")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleInteriorDesignComplete = (imageUrl: string, originalFile: File, transformedBlob: Blob) => {
    setTransformedImage({ url: imageUrl, blob: transformedBlob })
    toast.success("Innenarchitektur erfolgreich angewendet!")
  }

  const handleCalendarConfirm = (interval: { startDate: Date; startTime?: string; endDate?: Date; endTime?: string }) => {
    setSelectedDate(interval.startDate)
    if (interval.startTime) {
      setSelectedTime(interval.startTime)
    }
    setIsCalendarOpen(false)
    toast.success(`📅 Datum gesetzt: ${interval.startDate.toLocaleDateString('de-DE')} um ${interval.startTime || selectedTime}`)
  }

  const handleClose = () => {
    // Don't allow closing the main dialog if calendar is open
    // User must close calendar first via "Abbrechen" button
    if (isCalendarOpen) {
      return
    }
    
    onOpenChange(false)
    setPostType(null)
    setSelectedPlatforms([])
    setFile(null)
    setText("")
    setTitle("")
    setGeneratedContent({ title: "", description: "" })
    setTransformedImage(null)
    setUseInteriorDesign(false)
    setIsCreating(false)
    setUseAI(false)
    setPublishNow(true)
    setSelectedDate(new Date())
    setSelectedTime("12:00")
    setIsCalendarOpen(false)
  }

  const handleCreatePost = async (postStatus?: 'draft' | 'scheduled' | 'published') => {
    if (!user) {
      toast.error('Bitte melde dich an, um einen Beitrag zu erstellen')
      return
    }

    if (!postType) {
      toast.error('Bitte wähle einen Beitragstyp aus')
      return
    }

    if (selectedPlatforms.length === 0) {
      toast.error('Bitte wähle mindestens eine Plattform aus')
      return
    }

    if (postType === "text" && !text.trim()) {
      toast.error('Bitte gib den Textinhalt ein')
      return
    }

    if ((postType === "image" || postType === "video") && !file && !transformedImage) {
      toast.error('Bitte lade eine Datei hoch')
      return
    }

    setIsCreating(true)
    
    try {
      const finalContent = useAI && generatedContent.description 
        ? generatedContent.description 
        : text

      const finalTitle = useAI && generatedContent.title 
        ? generatedContent.title 
        : (title || (postType === "text" ? "Text Beitrag" : `${postType} Beitrag`))

      let mediaUrl = null
      if (postType === "image") {
        if (transformedImage) {
          const reader = new FileReader()
          mediaUrl = await new Promise<string>((resolve) => {
            reader.onload = (e) => resolve(e.target?.result as string)
            reader.readAsDataURL(transformedImage.blob)
          })
        } else if (file) {
          const reader = new FileReader()
          mediaUrl = await new Promise<string>((resolve) => {
            reader.onload = (e) => resolve(e.target?.result as string)
            reader.readAsDataURL(file)
          })
        }
      } else if (file) {
        const reader = new FileReader()
        mediaUrl = await new Promise<string>((resolve) => {
          reader.onload = (e) => resolve(e.target?.result as string)
          reader.readAsDataURL(file)
        })
      }

      // Determine final status based on parameter or current settings
      const finalStatus = postStatus || (publishNow ? "published" : "scheduled")
      
      // Ensure proper date/time handling
      const scheduledDate = (finalStatus === "published") ? 
        new Date().toISOString().split('T')[0] : 
        selectedDate.toISOString().split('T')[0]
      
      const scheduledTime = (finalStatus === "published") ? 
        new Date().toTimeString().slice(0, 5) : 
        selectedTime
      
      console.log('Creating post with:', {
        finalStatus,
        scheduledDate,
        scheduledTime,
        selectedDate,
        selectedTime,
        publishNow
      })
      
      // Show specific feedback for scheduling
      if (finalStatus === 'scheduled') {
        toast.loading('Speichere geplanter Beitrag...', {
          id: 'save-post',
          style: {
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
          }
        })
      }
      
      await actions.addPost({
        title: finalTitle,
        content: finalContent,
        platforms: selectedPlatforms,
        image: mediaUrl || '/placeholder.svg',
        scheduledDate,
        scheduledTime,
        status: finalStatus,
        likes: 0,
        comments: 0,
        shares: 0,
        createdAt: new Date().toLocaleDateString(),
        updatedAt: new Date().toLocaleDateString(),
        // Preserve idea properties if available
        category: initialContent?.category,
        source: initialContent?.source,
        tags: initialContent?.tags
      })

      // Enhanced success feedback
      if (finalStatus === 'scheduled') {
        toast.success('✅ Beitrag erfolgreich geplant!', {
          id: 'save-post',
          description: `Wird am ${selectedDate?.toLocaleDateString?.('de-DE')} um ${selectedTime} veröffentlicht`,
          duration: 5000,
          style: {
            background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          }
        })
      } else {
        const statusMessage = finalStatus === 'published' ? 'Beitrag veröffentlicht!' : 'Entwurf gespeichert!'
        const statusDetail = finalStatus === 'published' ? 
          'Dein Beitrag wurde sofort veröffentlicht.' : 
          `Dein Entwurf wurde mit Datum ${selectedDate?.toLocaleDateString?.('de-DE') || 'dem ausgewählten Datum'} um ${selectedTime} gespeichert.`
        
        toast.success(statusMessage, {
          description: statusDetail,
          duration: 4000,
          style: {
            background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          }
        })
      }
      
      // Refresh posts to ensure new post appears in dashboard
      await actions.fetchPosts()
      
      // Add smooth closing animation
      setTimeout(() => {
        handleClose()
        
        if (onPostCreated) {
          onPostCreated()
        }
      }, 1000) // Allow time for success animation to show
    } catch (error) {
      console.error('Error creating post:', error)
      toast.error('Beitrag konnte nicht erstellt werden. Bitte versuchen Sie es erneut.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => {
      // Completely disable automatic closing - only allow explicit X button close
      // Especially when calendar is open, never allow auto-close
    }}>
      <DialogContent className="max-w-7xl w-[95vw] h-[90vh] p-0 bg-gray-50/50 overflow-hidden">
        <div className="flex flex-col h-full">
          <DialogHeader className="px-6 py-4 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-bold text-gray-900">Neuer Beitrag erstellen</DialogTitle>
                <p className="text-sm text-gray-600 mt-1">Erstellen Sie Ihren Social Media Content</p>
              </div>
              <Badge variant="outline" className="bg-gradient-to-r from-teal-50 to-cyan-50 text-teal-600 border-teal-200 font-medium">
                KI-Powered
              </Badge>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-4 py-3">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 h-full">
            {/* Left Column - Post Type & Upload - Compact */}
            <div className="xl:col-span-2 space-y-3">
              {/* Post Type Selection - More Compact */}
              <Card className="border-0 bg-white shadow-lg ring-1 ring-gray-200/50 rounded-2xl">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Post Type</h3>
                      <p className="text-sm text-gray-600">Wählen Sie Ihren Content-Typ</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    {(["image", "video", "text"] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setPostType(type)}
                        className={`p-4 rounded-xl border-2 transition-all duration-300 hover:scale-105 ${
                          postType === type
                            ? "border-cyan-500 bg-gradient-to-r from-cyan-50 to-blue-50 shadow-lg shadow-cyan-100/50"
                            : "border-gray-200 hover:border-cyan-300 hover:bg-cyan-50/30"
                        }`}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            postType === type ? 'bg-cyan-500' : 'bg-gray-400'
                          }`}>
                            {type === "image" && <ImageIcon className="w-5 h-5 text-white" />}
                            {type === "video" && <VideoIcon className="w-5 h-5 text-white" />}
                            {type === "text" && <FileText className="w-5 h-5 text-white" />}
                          </div>
                          <span className="text-sm font-semibold text-gray-900 capitalize">
                            {type === "image" ? "Foto" : type === "video" ? "Video" : "Text"}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Upload Section - Completely Redesigned */}
              {(postType === "image" || postType === "video") && (
                <Card className="border-0 bg-white shadow-lg ring-1 ring-gray-200/50 rounded-2xl overflow-hidden">
                  <CardContent className="p-0">
                    {/* Header with Clean Design */}
                    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-6 border-b border-blue-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg">
                            {postType === "image" ? (
                              <ImageIcon className="w-6 h-6 text-white" />
                            ) : (
                              <VideoIcon className="w-6 h-6 text-white" />
                            )}
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">
                              {postType === "image" ? "Foto Upload" : "Video Upload"}
                            </h3>
                            <p className="text-gray-600">
                              {postType === "image" ? "Bild hochladen und optional mit KI bearbeiten" : "Video für Social Media hochladen"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* AI Interior Design Toggle - Redesigned */}
                    {postType === "image" && (
                      <div className="bg-gradient-to-r from-cyan-50 to-blue-50 p-6 border-b border-blue-100">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
                              <Wand2 className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900">KI Interior Design</h4>
                              <p className="text-sm text-gray-600">Räume mit künstlicher Intelligenz gestalten</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-sm font-semibold text-gray-900">
                                {useInteriorDesign ? "Aktiviert" : "Deaktiviert"}
                              </div>
                              <div className="text-xs text-gray-500">
                                {useInteriorDesign ? "KI-Design wird angewendet" : "Standard Upload"}
                              </div>
                            </div>
                            <div className="relative">
                              <input
                                type="checkbox"
                                id="interior-design-toggle"
                                checked={useInteriorDesign}
                                onChange={(e) => {
                                  setUseInteriorDesign(e.target.checked)
                                  if (!e.target.checked) {
                                    setTransformedImage(null)
                                  }
                                }}
                                className="sr-only"
                              />
                              <label
                                htmlFor="interior-design-toggle"
                                className={`block w-14 h-8 rounded-full cursor-pointer transition-all duration-300 ${
                                  useInteriorDesign 
                                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/30' 
                                    : 'bg-gray-300 hover:bg-gray-400'
                                }`}
                              >
                                <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 transform ${
                                  useInteriorDesign ? 'translate-x-7' : 'translate-x-1'
                                } mt-1`}>
                                  <div className="w-full h-full flex items-center justify-center">
                                    {useInteriorDesign ? (
                                      <Sparkles className="w-3 h-3 text-cyan-600" />
                                    ) : (
                                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                    )}
                                  </div>
                                </div>
                              </label>
                            </div>
                          </div>
                        </div>
                        {useInteriorDesign && (
                          <div className="mt-4 p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-cyan-200">
                            <div className="flex items-center gap-3">
                              <CheckCircle className="w-5 h-5 text-cyan-600" />
                              <div>
                                <p className="text-sm font-medium text-cyan-900">KI Interior Design aktiviert</p>
                                <p className="text-xs text-cyan-700">Ihr Raumfoto wird automatisch mit KI-Design bearbeitet</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Content Area - Restructured */}
                    <div className="p-6">
                      {useInteriorDesign ? (
                        <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl p-6 border border-cyan-200">
                          <InteriorDesignWorkflow
                            onImageTransformed={handleInteriorDesignComplete}
                            onBack={() => setUseInteriorDesign(false)}
                            onNext={() => {}}
                            initialImage={file || undefined}
                          />
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {/* Upload Area - Redesigned */}
                          <input
                            id="file-upload"
                            type="file"
                            accept={postType === "image" ? "image/*" : "video/*"}
                            onChange={handleFileChange}
                            className="hidden"
                          />
                          <Label htmlFor="file-upload" className="cursor-pointer block">
                            <div className={`
                              relative border-3 border-dashed rounded-2xl p-12 text-center transition-all duration-500 hover:scale-[1.02] group
                              ${file 
                                ? "border-cyan-400 bg-gradient-to-br from-cyan-50 to-blue-50 shadow-lg shadow-cyan-100/50" 
                                : "border-gray-300 bg-gradient-to-br from-gray-50 to-blue-50/30 hover:border-cyan-400 hover:bg-gradient-to-br hover:from-cyan-50 hover:to-blue-50 hover:shadow-lg hover:shadow-cyan-200/30"
                              }
                            `}>
                              
                              {file ? (
                                <div className="space-y-4">
                                  <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/30">
                                    <CheckCircle className="h-8 w-8 text-white" />
                                  </div>
                                  <div>
                                    <h4 className="text-xl font-bold text-cyan-700 mb-2">{file.name}</h4>
                                    <p className="text-cyan-600 font-medium">
                                      {(file.size / (1024 * 1024)).toFixed(2)} MB • Bereit für Upload
                                    </p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.preventDefault()
                                      setFile(null)
                                    }}
                                    className="h-10 w-10 rounded-full bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 transition-all duration-300 hover:scale-110"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="space-y-6">
                                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-blue-500/30 group-hover:scale-110 transition-all duration-500">
                                    <Upload className="h-10 w-10 text-white drop-shadow-sm" />
                                  </div>
                                  <div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-3">
                                      {postType === "image" ? "Foto hochladen" : "Video hochladen"}
                                    </h3>
                                    <p className="text-gray-600 text-lg mb-6">Datei hier ablegen oder klicken zum Auswählen</p>
                                  </div>
                                  <div className="flex items-center justify-center gap-8 pt-4">
                                    <div className="flex items-center gap-3 text-gray-500">
                                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                      <span className="font-medium">Max. 50MB</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-gray-500">
                                      <div className="w-3 h-3 bg-cyan-500 rounded-full"></div>
                                      <span className="font-medium">{postType === "image" ? "JPG, PNG, WebP" : "MP4, MOV"}</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </Label>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Text Content - Compact */}
              <Card className="border-0 bg-white shadow-lg ring-1 ring-gray-200/50 rounded-2xl">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Text Inhalt</h3>
                      <p className="text-sm text-gray-600">Erstelle deinen Beitragstext</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Titel (optional)..."
                        className="border-2 border-gray-200 rounded-xl text-sm h-10 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <Textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Was möchtest du teilen?"
                        rows={3}
                        className="border-2 border-gray-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Settings & Controls - Compact */}
            <div className="space-y-3">
              {/* Platform Selection - More Compact */}
              <Card className="border-0 bg-white shadow-lg ring-1 ring-gray-200/50 rounded-2xl">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">Plattformen</h3>
                      <p className="text-xs text-gray-600">Ziele auswählen</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2">
                    {connectedPlatforms.map((platform) => (
                      <Label
                        key={platform.id}
                        htmlFor={platform.id}
                        className={`
                          flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer
                          transition-all duration-300 hover:scale-[1.02]
                          ${selectedPlatforms.includes(platform.id)
                            ? "border-cyan-500 bg-gradient-to-r from-cyan-50 to-blue-50 shadow-lg shadow-cyan-100/50"
                            : "border-gray-200 hover:border-cyan-300 hover:bg-cyan-50/30"
                          }
                        `}
                      >
                        <input
                          type="checkbox"
                          id={platform.id}
                          checked={selectedPlatforms.includes(platform.id)}
                          onChange={() => handlePlatformToggle(platform.id)}
                          className="sr-only"
                        />
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center shadow-sm">
                          <span className="text-white font-semibold text-sm">{platform.name[0]}</span>
                        </div>
                        <span className="font-semibold text-gray-900 flex-1 text-sm">{platform.name}</span>
                        {selectedPlatforms.includes(platform.id) && (
                          <CheckCircle className="w-5 h-5 text-cyan-500" />
                        )}
                      </Label>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* AI Enhancement - Extremely Compact */}
              <Card className="border-0 bg-white shadow-lg ring-1 ring-gray-200/50 rounded-2xl">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <Wand2 className="w-3 h-3 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900">KI-Hilfe</h3>
                        <p className="text-xs text-gray-600">Inhalt verbessern</p>
                      </div>
                    </div>
                    <Switch
                      id="use-ai"
                      checked={useAI}
                      onCheckedChange={setUseAI}
                      className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-violet-500 data-[state=checked]:to-purple-600 scale-75"
                    />
                  </div>

                  {useAI && (
                    <div className="space-y-2">
                      <Button
                        onClick={handleGenerateContent}
                        disabled={isGenerating}
                        className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white rounded-lg h-8 text-xs font-medium transition-all duration-300"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            Generiere...
                          </>
                        ) : (
                          <>
                            <Wand2Icon className="mr-1 h-3 w-3" />
                            KI-Inhalt
                          </>
                        )}
                      </Button>

                      {generatedContent.title && (
                        <div className="p-2 bg-violet-50 rounded-lg border border-violet-200">
                          <div className="space-y-1">
                            <div>
                              <p className="text-xs font-semibold text-violet-900 mb-1">Titel</p>
                              <p className="text-gray-900 text-xs font-medium line-clamp-1">{generatedContent.title}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-violet-900 mb-1">Inhalt</p>
                              <p className="text-gray-900 text-xs leading-relaxed line-clamp-1">{generatedContent.description}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Scheduling - More Compact */}
              <Card className="border-0 bg-white shadow-lg ring-1 ring-gray-200/50 rounded-2xl">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                        <Calendar className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900">Zeitplanung</h3>
                        <p className="text-xs text-gray-600">Veröffentlichung planen</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-medium text-gray-700">{publishNow ? "Sofort" : "Geplant"}</span>
                      <Switch
                        id="publish-now"
                        checked={publishNow}
                        onCheckedChange={setPublishNow}
                        className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-500 data-[state=checked]:to-cyan-600 scale-75"
                      />
                    </div>
                  </div>

                  {/* Publishing Mode Indicator */}
                  <div className={`p-2 rounded-lg border-2 transition-all duration-300 ${
                    publishNow 
                      ? "bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-300" 
                      : "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300"
                  }`}>
                    <div className="flex items-center">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                          publishNow 
                            ? "bg-gradient-to-br from-cyan-400 to-blue-500" 
                            : "bg-gradient-to-br from-blue-400 to-indigo-500"
                        }`}>
                          {publishNow ? (
                            <Send className="w-3 h-3 text-white" />
                          ) : (
                            <Clock className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <div>
                          <span className="font-semibold text-gray-900 text-xs">
                            {publishNow ? "Sofort veröffentlichen" : "Geplante Veröffentlichung"}
                          </span>
                          <p className="text-xs text-gray-600">
                            {publishNow ? "Direkt nach Erstellung" : "Automatisch zum Zeitpunkt"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Scheduling Controls */}
                  {!publishNow && (
                    <div className="mt-3 space-y-2">
                      <Button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setIsCalendarOpen(true)
                        }}
                        variant="outline"
                        className="w-full h-10 rounded-lg border-2 border-blue-200 hover:border-cyan-400 hover:bg-cyan-50 bg-white transition-all duration-300 flex items-center justify-center gap-2"
                      >
                        <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
                          <Calendar className="h-3 w-3 text-white" />
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-gray-900 text-xs">
                            {selectedDate.toLocaleDateString('de-DE')}
                          </div>
                          <div className="text-blue-600 font-semibold text-xs">
                            um {selectedTime} Uhr
                          </div>
                        </div>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Action Buttons - More Compact */}
              <div className="flex flex-col gap-2">
                {/* Main Action Button */}
                <Button
                  onClick={() => handleCreatePost(publishNow ? 'published' : 'scheduled')}
                  disabled={isCreating}
                  className={`h-10 text-white rounded-xl font-bold text-sm transition-all duration-300 hover:scale-[1.02] shadow-xl relative overflow-hidden group ${
                    publishNow 
                      ? "bg-gradient-to-r from-cyan-500 via-blue-600 to-blue-700 hover:from-cyan-600 hover:via-blue-700 hover:to-blue-800 shadow-cyan-500/30" 
                      : "bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 hover:from-blue-600 hover:via-indigo-700 hover:to-purple-700 shadow-blue-500/30"
                  }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      <span className="animate-pulse text-sm">
                        {publishNow ? "Veröffentliche..." : "Plane..."}
                      </span>
                    </>
                  ) : (
                    <>
                      {publishNow ? (
                        <>
                          <Send className="w-4 h-4 mr-2 group-hover:translate-x-1 group-hover:-translate-y-0.5 transition-transform duration-300" />
                          Jetzt veröffentlichen
                        </>
                      ) : (
                        <>
                          <Clock className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-300" />
                          Beitrag planen
                        </>
                      )}
                    </>
                  )}
                </Button>

                {/* Secondary Actions */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleCreatePost('draft')}
                    disabled={isCreating}
                    className="flex-1 h-8 bg-gradient-to-r from-slate-500 via-gray-600 to-slate-700 hover:from-slate-600 hover:via-gray-700 hover:to-slate-800 text-white rounded-lg text-xs font-semibold transition-all duration-300 hover:scale-[1.02] group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                    {isCreating ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <FileText className="w-3 h-3 mr-1" />
                    )}
                    Entwurf
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleClose}
                    className="flex-1 h-8 rounded-lg border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-xs font-semibold text-gray-700 hover:text-gray-900 group"
                  >
                    <X className="w-3 h-3 mr-1 group-hover:rotate-90 transition-transform duration-300" />
                    Abbrechen
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </DialogContent>
      
      {/* Calendar Popup */}
      <CalendarPopup
        isOpen={isCalendarOpen}
        selectedInterval={{
          startDate: selectedDate,
          startTime: selectedTime
        }}
        singleDateMode={true}
        showTimeSelect={true}
        onConfirm={handleCalendarConfirm}
        onClose={() => {
          setIsCalendarOpen(false)
        }}
      />
    </Dialog>
  )
}