"use client"

import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { 
  ImageIcon, 
  VideoIcon, 
  FileTextIcon, 
  FileText,
  Camera, 
  Wand2, 
  Music, 
  Calendar,
  CheckCircle,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Send,
  Upload,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  X,
  Play,
  Loader2,
  AlertCircle,
  Check,
  Plus,
  Trash2,
  Video,
  CalendarIcon,
  Clock,
  Zap,
  Type,
  MessageSquare,
  Hash,
  Eye,
  Heart,
  MessageCircle,
  Bookmark,
  BarChart3,
  Bell
} from "lucide-react"
import { CalendarPopup } from "@/components/ui/calendar-popup"
import { InteriorDesignWorkflow } from "./interior-design-workflow"
import { useAuth } from "@/lib/auth-context"
import { usePost } from "@/lib/post-context"
import { toast } from "sonner"

interface TimeInterval {
  startDate: Date
  startTime?: string
  endDate?: Date
  endTime?: string
}

interface AIPostWorkflowProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPostCreated?: () => void
}

// Simplified workflow steps
type WorkflowStep = 
  | 'content-type'
  | 'upload-content'
  | 'content-creation'
  | 'platform-selection'
  | 'scheduling'
  | 'review'
  | 'success'

type ContentType = 'photo' | 'video' | 'text' | null

interface UploadedFile {
  id: string
  file: File
  url: string
  type: 'image' | 'video'
  name: string
  size: number
}

interface PostContent {
  title: string
  description: string
  hashtags: string[]
}

interface PostData {
  contentType: ContentType
  files: UploadedFile[]
  content: PostContent
  platforms: string[]
  scheduledTime: Date | null
  status: 'draft' | 'scheduled' | 'published'
}

export function AIPostWorkflow({ open, onOpenChange, onPostCreated }: AIPostWorkflowProps) {
  const { user } = useAuth()
  const { actions } = usePost()
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('content-type')
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingMessage, setProcessingMessage] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [useInteriorDesign, setUseInteriorDesign] = useState(false)
  const [transformedImage, setTransformedImage] = useState<{ url: string; blob: Blob } | null>(null)
  
  // Main post data
  const [postData, setPostData] = useState<PostData>({
    contentType: null,
    files: [],
    content: {
      title: "",
      description: "",
      hashtags: []
    },
    platforms: [],
    scheduledTime: null,
    status: 'draft'
  })

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Clear error when step changes
  useEffect(() => {
    setError(null)
  }, [currentStep])

  const steps: WorkflowStep[] = [
    'content-type',
    'upload-content',
    'content-creation',
    'platform-selection',
    'scheduling',
    'review',
    'success'
  ]

  const currentStepNumber = steps.indexOf(currentStep) + 1
  const progress = ((currentStepNumber - 1) / (steps.length - 1)) * 100

  const handleClose = () => {
    // Don't allow closing if calendar is open
    if (isCalendarOpen) {
      return
    }
    
    // Reset all state
    setCurrentStep('content-type')
    setIsProcessing(false)
    setProcessingMessage("")
    setError(null)
    setIsDragOver(false)
    setIsCalendarOpen(false)
    setUseInteriorDesign(false)
    setTransformedImage(null)
    setPostData({
      contentType: null,
      files: [],
      content: {
        title: "",
        description: "",
        hashtags: []
      },
      platforms: [],
      scheduledTime: null,
      status: 'draft'
    })
    
    onOpenChange(false)
  }

  const validateStep = (step: WorkflowStep): boolean => {
    switch (step) {
      case 'content-type':
        return postData.contentType !== null
      case 'upload-content':
        if (postData.contentType === 'text') return true
        if (postData.contentType === 'photo' && useInteriorDesign) {
          return transformedImage !== null
        }
        return postData.files.length > 0
      case 'content-creation':
        return postData.content.title.trim() !== "" && postData.content.description.trim() !== ""
      case 'platform-selection':
        return postData.platforms.length > 0
      case 'scheduling':
        return true // Scheduling is optional
      case 'review':
        return true
      default:
        return true
    }
  }

  const handleNext = async () => {
    if (!validateStep(currentStep)) {
      let errorMessage = "Please complete all required fields"
      
      if (currentStep === 'content-type') {
        errorMessage = "Please select a content type"
      } else if (currentStep === 'upload-content') {
        if (postData.contentType === 'photo' && useInteriorDesign && !transformedImage) {
          errorMessage = "Please apply interior design transformation"
        } else if (postData.contentType !== 'text' && postData.files.length === 0) {
          errorMessage = "Please upload at least one file"
        }
      } else if (currentStep === 'content-creation') {
        errorMessage = "Please provide a title and description"
      } else if (currentStep === 'platform-selection') {
        errorMessage = "Please select at least one platform"
      }
      
      setError(errorMessage)
      return
    }

    setError(null)
    const currentIndex = steps.indexOf(currentStep)
    
    // Skip upload step for text content
    if (currentStep === 'content-type' && postData.contentType === 'text') {
      setCurrentStep('content-creation')
    } else if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1])
    }
  }

  const handleBack = () => {
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex > 0) {
      // Skip upload step for text content when going back
      if (currentStep === 'content-creation' && postData.contentType === 'text') {
        setCurrentStep('content-type')
      } else {
        setCurrentStep(steps[currentIndex - 1])
      }
    }
  }

  const handleFileUpload = async (files: File[]) => {
    const newFiles: UploadedFile[] = []
    
    for (const file of files) {
      // Validate file type
      const expectedType = postData.contentType === 'photo' ? 'image' : 'video'
      const actualType = file.type.startsWith('image/') ? 'image' : 'video'
      
      if (actualType !== expectedType) {
        toast.error(`Please upload ${expectedType} files only`)
        continue
      }
      
      // Validate file size (50MB limit)
      const maxSize = 50 * 1024 * 1024
      if (file.size > maxSize) {
        toast.error(`File ${file.name} is too large. Maximum size is 50MB`)
        continue
      }
      
      // Create file URL
      const url = URL.createObjectURL(file)
      
      newFiles.push({
        id: Date.now().toString() + Math.random(),
        file,
        url,
        type: actualType,
        name: file.name,
        size: file.size
      })
    }
    
    setPostData(prev => ({
      ...prev,
      files: [...prev.files, ...newFiles]
    }))
    
    if (newFiles.length > 0) {
      toast.success(`${newFiles.length} file(s) uploaded successfully`)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileUpload(Array.from(e.target.files))
    }
  }

  const handleRemoveFile = (fileId: string) => {
    setPostData(prev => ({
      ...prev,
      files: prev.files.filter(f => f.id !== fileId)
    }))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileUpload(files)
    }
  }

  const handleGenerateContent = async () => {
    setIsProcessing(true)
    setProcessingMessage("Generating content with GPT-4o...")
    
    try {
      // Prepare input for AI generation - use existing user content
      const existingContent = postData.content.title || postData.content.description || ""
      const userInput = existingContent 
        ? `Basierend auf diesem Text erstelle einen verbesserten Social Media Post: "${existingContent}"`
        : "Immobilien Content"
      const contentType = postData.contentType || "general"
      
      const response = await fetch('/api/generate-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userInput,
          contentType,
          platforms: postData.platforms,
          language: 'german'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate content')
      }

      const data = await response.json()
      
      if (data.success && data.content) {
        const generatedContent = {
          title: data.content.title,
          description: data.content.description,
          hashtags: data.content.hashtags || []
        }
        
        setPostData(prev => ({
          ...prev,
          content: generatedContent
        }))
        
        toast.success("Content generated successfully with GPT-4o!")
      } else {
        throw new Error(data.error || 'Failed to generate content')
      }
    } catch (error) {
      console.error('Content generation error:', error)
      toast.error("Failed to generate content. Please try again.")
    } finally {
      setIsProcessing(false)
      setProcessingMessage("")
    }
  }

  const handleInteriorDesignComplete = (imageUrl: string, originalFile: File, transformedBlob: Blob) => {
    setTransformedImage({ url: imageUrl, blob: transformedBlob })
    toast.success("Interior design transformation applied!")
  }

  const handleCalendarConfirm = (interval: { startDate: Date; startTime?: string; endDate?: Date; endTime?: string }) => {
    const scheduledDate = new Date(interval.startDate)
    const [hours, minutes] = (interval.startTime || '12:00').split(':').map(Number)
    scheduledDate.setHours(hours, minutes, 0, 0)
    
    const now = new Date()
    if (scheduledDate <= now) {
      toast.error("Bitte wähle ein zukünftiges Datum und eine zukünftige Uhrzeit")
      return
    }
    
    setPostData(prev => ({ ...prev, scheduledTime: scheduledDate }))
    setIsCalendarOpen(false)
    toast.success(`📅 Zeitplanung gesetzt: ${scheduledDate.toLocaleDateString('de-DE')} um ${scheduledDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`)
  }

  const handleSavePost = async () => {
    if (!user) {
      toast.error('Please log in to save your post')
      return
    }

    setIsProcessing(true)
    setProcessingMessage("Saving your post...")
    
    try {
      // Prepare media URLs
      let mediaUrls: string[] = []
      
      if (postData.contentType === 'photo' && transformedImage) {
        // Use transformed image
        const reader = new FileReader()
        const mediaUrl = await new Promise<string>((resolve) => {
          reader.onload = (e) => resolve(e.target?.result as string)
          reader.readAsDataURL(transformedImage.blob)
        })
        mediaUrls = [mediaUrl]
      } else if (postData.files.length > 0) {
        // Use uploaded files
        const filePromises = postData.files.map(file => {
          return new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onload = (e) => resolve(e.target?.result as string)
            reader.readAsDataURL(file.file)
          })
        })
        mediaUrls = await Promise.all(filePromises)
      }
      
      // Determine scheduled time
      let scheduledAt: string | undefined
      if (postData.status === 'scheduled' && postData.scheduledTime) {
        scheduledAt = postData.scheduledTime.toISOString()
      }

      // Map content type to database media type
      const getMediaType = (contentType: ContentType): 'image' | 'video' | 'text' => {
        switch (contentType) {
          case 'photo':
            return 'image'
          case 'video':
            return 'video'
          case 'text':
            return 'text'
          default:
            return 'text'
        }
      }

      // Create post
      const postToCreate = {
        title: postData.content.title,
        content: postData.content.description,
        platforms: postData.platforms,
        image: mediaUrls.length > 0 ? mediaUrls[0] : '/placeholder.svg',
        scheduledDate: postData.scheduledTime ? postData.scheduledTime.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        scheduledTime: postData.scheduledTime ? postData.scheduledTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : '12:00',
        status: postData.status,
        likes: 0,
        comments: 0,
        shares: 0,
        createdAt: new Date().toLocaleDateString(),
        updatedAt: new Date().toLocaleDateString()
      }

      await actions.addPost(postToCreate)
      
      // Show success message
      const statusMessages = {
        draft: 'Post saved as draft!',
        scheduled: 'Post scheduled successfully!',
        published: 'Post published successfully!'
      }
      
      toast.success(statusMessages[postData.status])
      
      // Call callback to refresh dashboard
      if (onPostCreated) {
        onPostCreated()
      }
      
      // Move to success step
      setCurrentStep('success')
      
    } catch (error) {
      console.error('Error saving post:', error)
      
      let errorMessage = 'Failed to save post'
      if (error instanceof Error) {
        // Provide more specific error messages
        if (error.message.includes('auth')) {
          errorMessage = 'Authentication failed. Please log in again.'
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection and try again.'
        } else if (error.message.includes('validation')) {
          errorMessage = 'Invalid post data. Please check your inputs and try again.'
        } else {
          errorMessage = error.message
        }
      }
      
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsProcessing(false)
      setProcessingMessage("")
    }
  }

  const handleSchedulePost = () => {
    if (!postData.scheduledTime) {
      toast.error("Please select a date and time")
      return
    }
    
    const now = new Date()
    const scheduledTime = new Date(postData.scheduledTime)
    
    if (scheduledTime <= now) {
      toast.error("Scheduled time must be in the future")
      return
    }
    
    setPostData(prev => ({ ...prev, status: 'scheduled' }))
    handleSavePost()
  }

  const handlePublishNow = () => {
    setPostData(prev => ({ ...prev, status: 'published' }))
    handleSavePost()
  }

  const handleSaveDraft = () => {
    setPostData(prev => ({ ...prev, status: 'draft' }))
    handleSavePost()
  }

  const togglePlatform = (platform: string) => {
    setPostData(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform]
    }))
  }

  const renderContentTypeSelection = () => (
    <div className="p-6 pt-4">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-light text-gray-900 mb-2">What type of content would you like to create?</h1>
        <p className="text-gray-600 font-light">Choose your content type to get started</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
        {[
          { id: 'photo', icon: ImageIcon, title: 'Photo', description: 'Upload and edit photos' },
          { id: 'video', icon: VideoIcon, title: 'Video', description: 'Upload and edit videos' },
          { id: 'text', icon: FileTextIcon, title: 'Text', description: 'Create text-only posts' }
        ].map((type) => (
          <button
            key={type.id}
            onClick={() => setPostData(prev => ({ ...prev, contentType: type.id as ContentType }))}
            className={`p-6 rounded-xl border-2 transition-all hover:scale-105 ${
              postData.contentType === type.id
                ? 'border-teal-500 bg-teal-50 shadow-lg'
                : 'border-gray-200 hover:border-teal-300'
            }`}
          >
            <type.icon className={`w-8 h-8 mx-auto mb-3 ${
              postData.contentType === type.id ? 'text-teal-600' : 'text-gray-400'
            }`} />
            <h3 className="font-medium text-gray-900 mb-1">{type.title}</h3>
            <p className="text-sm text-gray-600">{type.description}</p>
          </button>
        ))}
      </div>
    </div>
  )

  const renderUploadContent = () => (
    <div className="p-6 pt-4">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-light text-gray-900 mb-2">Upload Your {postData.contentType}</h1>
        <p className="text-gray-600 font-light">Upload your files or apply AI enhancements</p>
      </div>

      {postData.contentType === 'photo' && (
        <div className="mb-6">
          <div className="flex items-center justify-center mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useInteriorDesign}
                onChange={(e) => setUseInteriorDesign(e.target.checked)}
                className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
              />
              <span className="text-sm font-medium text-gray-700">Apply AI Interior Design</span>
            </label>
          </div>
          
          {useInteriorDesign && (
            <div className="mb-6">
              <InteriorDesignWorkflow
                onImageTransformed={handleInteriorDesignComplete}
                onBack={() => setUseInteriorDesign(false)}
                onNext={() => {}}
                initialImage={postData.files[0]?.file}
              />
            </div>
          )}
        </div>
      )}

      {!useInteriorDesign && (
        <div className="space-y-6">
          {/* Upload Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
              isDragOver
                ? 'border-teal-500 bg-teal-50'
                : 'border-gray-300 hover:border-teal-400'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={postData.contentType === 'photo' ? 'image/*' : 'video/*'}
              onChange={handleFileInputChange}
              multiple
              className="hidden"
            />
            
            <div className="space-y-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                <Upload className="w-8 h-8 text-gray-400" />
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Upload {postData.contentType}s
                </h3>
                <p className="text-gray-600 mb-4">
                  Drag and drop files here or click to browse
                </p>
                
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  Choose Files
                </Button>
              </div>
              
              <p className="text-sm text-gray-500">
                Max file size: 50MB • Supported formats: {postData.contentType === 'photo' ? 'JPG, PNG, WebP' : 'MP4, MOV, AVI'}
              </p>
            </div>
          </div>

          {/* Uploaded Files */}
          {postData.files.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-gray-900">Uploaded Files</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {postData.files.map((file) => (
                  <div key={file.id} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                      {file.type === 'image' ? (
                        <img 
                          src={file.url} 
                          alt={file.name} 
                          className="w-full h-full object-cover" 
                          loading="lazy"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = '/placeholder.svg'
                          }}
                        />
                      ) : (
                        <video 
                          src={file.url} 
                          className="w-full h-full object-cover" 
                          preload="metadata"
                          onError={(e) => {
                            const target = e.target as HTMLVideoElement
                            target.poster = '/placeholder.svg'
                          }}
                        />
                      )}
                    </div>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleRemoveFile(file.id)}
                        className="w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="mt-2">
                      <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                      <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )

  const renderContentCreation = () => (
    <div className="px-8 pt-6 pb-8 min-h-[600px] bg-gradient-to-br from-slate-50/50 via-white to-blue-50/30">
      {/* Header Section - Removed all icons and bubbles, moved content up */}
      <div className="text-center mb-4">
      </div>

      <div className="max-w-3xl mx-auto space-y-8">
        {/* AI Content Generation - Enhanced */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 via-purple-500/5 to-pink-500/5 animate-pulse"></div>
          <div className="relative bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50 rounded-2xl p-6 border border-violet-200/50 shadow-lg shadow-violet-100/50 hover:shadow-xl hover:shadow-violet-200/60 transition-all duration-500 hover:scale-[1.02]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-violet-500 via-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-xl shadow-violet-500/30">
                    <Sparkles className="w-8 h-8 text-white drop-shadow-lg animate-pulse" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                    <Zap className="w-3 h-3 text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 tracking-tight">KI Content-Generator</h3>
                  <p className="text-violet-700 font-medium">Erstelle fesselnde Inhalte mit künstlicher Intelligenz</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-violet-100 text-violet-800 border-violet-300 px-3 py-1 rounded-full text-xs font-semibold">
                  ✨ Premium
                </Badge>
                <Badge className="bg-purple-100 text-purple-800 border-purple-300 px-3 py-1 rounded-full text-xs font-semibold">
                  🚀 Neu
                </Badge>
              </div>
            </div>
            <p className="text-gray-700 mb-4 leading-relaxed text-lg">
              Lasse unsere fortschrittliche KI einzigartige, ansprechende Inhalte für deinen Post erstellen, 
              die perfekt auf deine Zielgruppe zugeschnitten sind.
            </p>
            <Button
              onClick={handleGenerateContent}
              disabled={isProcessing}
              className="w-full h-12 bg-gradient-to-r from-violet-500 via-purple-600 to-pink-600 hover:from-violet-600 hover:via-purple-700 hover:to-pink-700 text-white rounded-2xl font-bold text-base transition-all duration-500 hover:scale-[1.02] shadow-xl shadow-violet-500/30 hover:shadow-2xl hover:shadow-violet-600/40 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  <span className="animate-pulse">Generiere magischen Content...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform duration-300" />
                  KI-Content erstellen
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Content Form */}
        <div className="bg-white rounded-2xl shadow-lg shadow-gray-100/50 border border-gray-100 overflow-hidden">
          <div className="p-8 space-y-8">
            {/* Title Input */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <Type className="w-5 h-5 text-white" />
                </div>
                <div>
                  <Label htmlFor="title" className="text-xl font-bold text-gray-900 tracking-tight">
                    Titel <span className="text-red-500">*</span>
                  </Label>
                  <p className="text-sm text-gray-600 font-medium">Der erste Eindruck zählt - mache ihn unvergesslich</p>
                </div>
              </div>
              <Input
                id="title"
                value={postData.content.title}
                onChange={(e) => setPostData(prev => ({
                  ...prev,
                  content: { ...prev.content, title: e.target.value }
                }))}
                placeholder="Gib deinem Post einen fesselnden Titel..."
                className="h-14 text-lg px-6 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 hover:border-blue-300 bg-gray-50/50 font-medium"
              />
            </div>

            {/* Description Input */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <div>
                  <Label htmlFor="description" className="text-xl font-bold text-gray-900 tracking-tight">
                    Beschreibung <span className="text-red-500">*</span>
                  </Label>
                  <p className="text-sm text-gray-600 font-medium">Erzähle deine Geschichte und begeistere dein Publikum</p>
                </div>
              </div>
              <Textarea
                id="description"
                value={postData.content.description}
                onChange={(e) => setPostData(prev => ({
                  ...prev,
                  content: { ...prev.content, description: e.target.value }
                }))}
                placeholder="Schreibe eine überzeugende Beschreibung, die dein Publikum fesselt..."
                rows={6}
                className="text-lg px-6 py-4 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300 hover:border-emerald-300 bg-gray-50/50 resize-none font-medium leading-relaxed"
              />
            </div>

            {/* Hashtags */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl flex items-center justify-center">
                  <Hash className="w-5 h-5 text-white" />
                </div>
                <div>
                  <Label htmlFor="hashtags" className="text-xl font-bold text-gray-900 tracking-tight">
                    Hashtags
                  </Label>
                  <p className="text-sm text-gray-600 font-medium">Erhöhe deine Reichweite mit relevanten Hashtags</p>
                </div>
              </div>
              
              {/* Hashtag Display */}
              {postData.content.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-3 p-4 bg-gradient-to-r from-pink-50 to-rose-50 rounded-2xl border border-pink-200">
                  {postData.content.hashtags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-full text-sm font-semibold shadow-lg shadow-pink-500/25 hover:shadow-xl hover:shadow-pink-600/30 transition-all duration-300 hover:scale-105 group"
                    >
                      <span>{tag}</span>
                      <button
                        onClick={() => setPostData(prev => ({
                          ...prev,
                          content: {
                            ...prev.content,
                            hashtags: prev.content.hashtags.filter((_, i) => i !== index)
                          }
                        }))}
                        className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors group-hover:scale-110"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              
              {/* Hashtag Input */}
              <Input
                placeholder="Hashtag eingeben und Enter drücken... (z.B. marketing, social)"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const input = e.target as HTMLInputElement
                    const hashtag = input.value.trim()
                    if (hashtag && !postData.content.hashtags.includes(hashtag)) {
                      const formattedTag = hashtag.startsWith('#') ? hashtag : `#${hashtag}`
                      setPostData(prev => ({
                        ...prev,
                        content: {
                          ...prev.content,
                          hashtags: [...prev.content.hashtags, formattedTag]
                        }
                      }))
                      input.value = ''
                    }
                  }
                }}
                className="h-14 text-lg px-6 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-300 hover:border-pink-300 bg-gray-50/50 font-medium"
              />
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-pink-400 rounded-full"></div>
                <span>Tipp: Verwende spezifische Hashtags für bessere Reichweite</span>
              </div>
            </div>
          </div>
          
          {/* Form Footer */}
          <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-slate-50 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <span className="text-sm font-medium text-gray-700">
                  {postData.content.title && postData.content.description ? 
                    "Bereit für den nächsten Schritt" : 
                    "Bitte fülle alle Pflichtfelder aus"
                  }
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                  {postData.content.title.length}/100 Zeichen
                </Badge>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300">
                  {postData.content.hashtags.length} Hashtags
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderPlatformSelection = () => (
    <div className="p-6 pt-4">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-light text-gray-900 mb-2">Choose Your Platforms</h1>
        <p className="text-gray-600 font-light">Select where you want to publish your content</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 max-w-4xl mx-auto">
        {[
          { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'text-pink-600' },
          { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'text-blue-600' },
          { id: 'twitter', name: 'Twitter', icon: Twitter, color: 'text-blue-400' },
          { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: 'text-blue-700' },
          { id: 'tiktok', name: 'TikTok', icon: Video, color: 'text-black' }
        ].map((platform) => (
          <button
            key={platform.id}
            onClick={() => togglePlatform(platform.id)}
            className={`p-6 rounded-xl border-2 transition-all hover:scale-105 ${
              postData.platforms.includes(platform.id)
                ? 'border-teal-500 bg-teal-50 shadow-lg'
                : 'border-gray-200 hover:border-teal-300'
            }`}
          >
            <platform.icon className={`w-8 h-8 mx-auto mb-3 ${
              postData.platforms.includes(platform.id) ? 'text-teal-600' : platform.color
            }`} />
            <h3 className="font-medium text-gray-900 text-sm">{platform.name}</h3>
          </button>
        ))}
      </div>

      {postData.platforms.length > 0 && (
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Selected: {postData.platforms.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ')}
          </p>
        </div>
      )}
    </div>
  )

  const renderScheduling = () => (
    <div className="p-8 pt-6">
      <div className="text-center mb-12">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/25">
          <Clock className="w-8 h-8 text-white drop-shadow-sm" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">Zeitplanung wählen</h1>
        <p className="text-lg text-gray-600 font-medium">Bestimme den perfekten Moment für deine Veröffentlichung</p>
      </div>

      <div className="space-y-8 max-w-4xl mx-auto">
        {/* Schedule Options */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Publish Now Card */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-3xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity duration-500"></div>
            <div className="relative bg-white border-2 border-emerald-200 rounded-3xl p-8 shadow-xl shadow-emerald-100/25 hover:shadow-2xl hover:shadow-emerald-200/30 transition-all duration-500 hover:scale-[1.02] group">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/25 group-hover:scale-110 transition-transform duration-300">
                  <Send className="w-6 h-6 text-white drop-shadow-sm" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Sofort veröffentlichen</h3>
                  <p className="text-sm text-gray-600 font-medium">Direkter Upload auf alle Plattformen</p>
                </div>
              </div>
              <p className="text-gray-700 mb-6 leading-relaxed">Dein Post wird sofort nach dem Erstellen auf allen ausgewählten Plattformen live gehen und ist für deine Follower sichtbar.</p>
              <Button
                onClick={handlePublishNow}
                disabled={isProcessing}
                className="w-full h-14 bg-gradient-to-r from-emerald-500 via-teal-600 to-green-600 hover:from-emerald-600 hover:via-teal-700 hover:to-green-700 text-white rounded-2xl font-bold text-lg transition-all duration-500 hover:scale-[1.02] shadow-xl shadow-emerald-500/30 hover:shadow-2xl hover:shadow-emerald-600/40 group/btn relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000"></div>
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                    <span className="animate-pulse">Veröffentliche...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-3 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-0.5 transition-transform duration-300" />
                    Jetzt veröffentlichen
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Schedule Card */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-3xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity duration-500"></div>
            <div className="relative bg-white border-2 border-blue-200 rounded-3xl p-8 shadow-xl shadow-blue-100/25 hover:shadow-2xl hover:shadow-blue-200/30 transition-all duration-500 hover:scale-[1.02] group">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-110 transition-transform duration-300">
                  <Clock className="w-6 h-6 text-white drop-shadow-sm" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Geplante Veröffentlichung</h3>
                  <p className="text-sm text-gray-600 font-medium">Automatischer Upload zu bestimmter Zeit</p>
                </div>
              </div>
              <p className="text-gray-700 mb-6 leading-relaxed">Wähle Datum und Uhrzeit für die automatische Veröffentlichung. Dein Post wird zur gewählten Zeit automatisch hochgeladen.</p>
              <Button
                onClick={() => setIsCalendarOpen(true)}
                variant="outline"
                className="w-full h-14 border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50/50 rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-[1.02] shadow-sm hover:shadow-lg hover:shadow-blue-100/50 group/btn bg-white/80 backdrop-blur-sm"
              >
                <Calendar className="w-5 h-5 mr-3 text-blue-600 group-hover/btn:scale-110 transition-transform duration-300" />
                <span className="text-blue-900">
                  {postData.scheduledTime 
                    ? `${postData.scheduledTime.toLocaleDateString('de-DE')} um ${postData.scheduledTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`
                    : "Datum & Uhrzeit wählen"
                  }
                </span>
              </Button>
            </div>
          </div>
        </div>

        {/* Selected Schedule Confirmation */}


        {/* Save as Draft */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-400 to-slate-500 rounded-3xl blur-xl opacity-15 group-hover:opacity-25 transition-opacity duration-500"></div>
          <div className="relative bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100 border-2 border-gray-300 rounded-3xl p-8 shadow-lg shadow-gray-200/50 hover:shadow-xl hover:shadow-gray-300/60 transition-all duration-500 hover:scale-[1.01]">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-gray-500 to-slate-600 rounded-2xl flex items-center justify-center shadow-lg shadow-gray-500/25 group-hover:scale-110 transition-transform duration-300">
                <FileTextIcon className="w-6 h-6 text-white drop-shadow-sm" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Als Entwurf speichern</h3>
                <p className="text-sm text-gray-600 font-medium">Für spätere Bearbeitung aufbewahren</p>
              </div>
            </div>
            <p className="text-gray-700 mb-6 leading-relaxed">Speichere deinen Post als Entwurf, um ihn später zu bearbeiten und zu veröffentlichen. Alle Inhalte bleiben erhalten.</p>
            <Button
              onClick={handleSaveDraft}
              disabled={isProcessing}
              variant="outline"
              className="w-full h-14 border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-100/80 rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-[1.02] shadow-sm hover:shadow-lg hover:shadow-gray-200/50 group/btn bg-white/90 backdrop-blur-sm"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-3 animate-spin text-gray-600" />
                  <span className="animate-pulse text-gray-700">Speichere...</span>
                </>
              ) : (
                <>
                  <FileTextIcon className="w-5 h-5 mr-3 text-gray-600 group-hover/btn:scale-110 transition-transform duration-300" />
                  <span className="text-gray-900">Entwurf speichern</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )

  const renderReview = () => (
    <div className="p-8 pt-6 bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
      <div className="text-center mb-12">
        <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/25">
          <Eye className="w-8 h-8 text-white drop-shadow-sm" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">Post Vorschau</h1>
        <p className="text-lg text-gray-600 font-medium">Schaue dir an, wie dein Post aussehen wird</p>
      </div>

      <div className="max-w-md mx-auto space-y-8">
        {/* Social Media Post Preview */}
        <div className="bg-white rounded-2xl shadow-2xl shadow-gray-900/10 border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-3xl hover:shadow-gray-900/15">
          {/* Post Header */}
          <div className="p-4 border-b border-gray-100 bg-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-sm">You</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-sm">Dein Account</h3>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>
                    {postData.scheduledTime 
                      ? `Geplant für ${postData.scheduledTime.toLocaleDateString('de-DE')}`
                      : 'Jetzt'
                    }
                  </span>
                  <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                  <div className="flex items-center gap-1">
                    {postData.platforms.map((platform, index) => {
                      const icons = {
                        instagram: Instagram,
                        facebook: Facebook,
                        twitter: Twitter,
                        linkedin: Linkedin,
                        tiktok: Video
                      }
                      const Icon = icons[platform as keyof typeof icons] || Video
                      return (
                        <Icon key={platform} className="w-3 h-3 text-gray-500" />
                      )
                    })}
                  </div>
                </div>
              </div>
              <button className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Media Content */}
          {(postData.files.length > 0 || transformedImage) && (
            <div className="relative bg-gray-50">
              {transformedImage ? (
                <img
                  src={transformedImage.url}
                  alt="Post media"
                  className="w-full aspect-square object-cover"
                />
              ) : postData.files.length > 0 && (
                <div className={`${postData.files.length === 1 ? '' : 'grid grid-cols-2 gap-1'}`}>
                  {postData.files.slice(0, 4).map((file, index) => (
                    <div key={file.id} className={`relative ${postData.files.length === 1 ? 'aspect-square' : 'aspect-square'} overflow-hidden bg-gray-100`}>
                      {file.type === 'image' ? (
                        <img 
                          src={file.url} 
                          alt={file.name} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <div className="relative w-full h-full">
                          <video 
                            src={file.url} 
                            className="w-full h-full object-cover" 
                            preload="metadata"
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-12 h-12 bg-black/70 rounded-full flex items-center justify-center">
                              <Play className="w-6 h-6 text-white ml-1" />
                            </div>
                          </div>
                        </div>
                      )}
                      {postData.files.length > 4 && index === 3 && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <span className="text-white font-bold text-lg">+{postData.files.length - 4}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Post Actions */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button className="flex items-center gap-2 text-gray-700 hover:text-red-500 transition-colors">
                  <Heart className="w-5 h-5" />
                </button>
                <button className="flex items-center gap-2 text-gray-700 hover:text-blue-500 transition-colors">
                  <MessageCircle className="w-5 h-5" />
                </button>
                <button className="flex items-center gap-2 text-gray-700 hover:text-green-500 transition-colors">
                  <Send className="w-5 h-5" />
                </button>
              </div>
              <button className="text-gray-700 hover:text-yellow-500 transition-colors">
                <Bookmark className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Post Content */}
          <div className="p-4 space-y-3">
            {/* Title */}
            {postData.content.title && (
              <h4 className="font-semibold text-gray-900 text-base leading-relaxed">
                {postData.content.title}
              </h4>
            )}
            
            {/* Description */}
            {postData.content.description && (
              <p className="text-gray-800 text-sm leading-relaxed">
                {postData.content.description}
              </p>
            )}
            
            {/* Hashtags */}
            {postData.content.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {postData.content.hashtags.map((tag, index) => (
                  <span key={index} className="text-blue-600 text-sm font-medium hover:underline cursor-pointer">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Engagement Preview */}
            <div className="text-xs text-gray-500 font-medium pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span>0 Gefällt mir</span>
                <span>Jetzt ansehen</span>
              </div>
            </div>
          </div>
        </div>

        {/* Post Summary Card */}
        <div className="bg-white/90 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 shadow-lg shadow-gray-200/50">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            Post Details
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Content Type</span>
                <p className="text-sm font-semibold text-gray-900 capitalize">{postData.contentType}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Platforms</span>
                <p className="text-sm font-semibold text-gray-900 capitalize">{postData.platforms.join(', ')}</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</span>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    postData.status === 'published' ? 'bg-green-500' :
                    postData.status === 'scheduled' ? 'bg-blue-500' :
                    'bg-gray-500'
                  }`}></div>
                  <p className="text-sm font-semibold text-gray-900 capitalize">{postData.status}</p>
                </div>
              </div>
              {postData.scheduledTime && (
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Scheduled</span>
                  <p className="text-sm font-semibold text-gray-900">
                    {postData.scheduledTime.toLocaleDateString('de-DE')}
                    <br />
                    <span className="text-xs text-gray-600">
                      {postData.scheduledTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderSuccess = () => (
    <div className="p-8 min-h-[600px] flex flex-col justify-center items-center">
      <div className="text-center">
        {/* Clean Animated Success Icon */}
        <div className="relative mb-8">
          <div className="w-24 h-24 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center mx-auto shadow-lg animate-in zoom-in-50 duration-700">
            <CheckCircle className="w-12 h-12 text-white animate-in zoom-in-75 duration-500 delay-200" />
          </div>
          {/* Subtle success ring */}
          <div className="absolute inset-0 w-24 h-24 mx-auto rounded-full border-2 border-emerald-300 animate-ping opacity-30"></div>
        </div>
        
        {/* Simple Success Message */}
        <div className="animate-in fade-in duration-800 delay-500">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {postData.status === 'published' ? (
              "Entwurf gespeichert!"
            ) : postData.status === 'scheduled' ? (
              "Entwurf gespeichert!"
            ) : (
              "Entwurf gespeichert!"
            )}
          </h1>
          
          <p className="text-lg text-gray-600 max-w-md mx-auto">
            Dein Entwurf wurde sicher gespeichert und kann jederzeit bearbeitet werden.
          </p>
        </div>
      </div>
    </div>
  )

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'content-type':
        return renderContentTypeSelection()
      case 'upload-content':
        return renderUploadContent()
      case 'content-creation':
        return renderContentCreation()
      case 'platform-selection':
        return renderPlatformSelection()
      case 'scheduling':
        return renderScheduling()
      case 'review':
        return renderReview()
      case 'success':
        return renderSuccess()
      default:
        return renderContentTypeSelection()
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={() => {
        // Prevent auto-closing when calendar is open
        if (isCalendarOpen) {
          return
        }
        onOpenChange(false)
      }}>
        <DialogContent 
          hideCloseButton 
          className="max-w-4xl max-h-[90vh] p-0 gap-0 bg-white rounded-xl overflow-hidden flex flex-col"
          onPointerDownOutside={(e) => {
            // Prevent closing when clicking outside if calendar is open
            if (isCalendarOpen) {
              e.preventDefault()
              e.stopPropagation()
            }
          }}
          onInteractOutside={(e) => {
            // Prevent closing when interacting outside if calendar is open
            if (isCalendarOpen) {
              e.preventDefault()
              e.stopPropagation()
            }
          }}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Neuen Beitrag erstellen</DialogTitle>
          </DialogHeader>
          
          {/* Header with Progress */}
          {currentStep !== 'success' && (
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center gap-4 flex-1">
                <div className="flex-1">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-teal-500 to-teal-600 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                <div className="text-sm text-gray-500 font-medium">
                  {currentStepNumber}/{steps.length - 1}
                </div>
              </div>
              <button
                onClick={handleClose}
                className="ml-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {renderCurrentStep()}
          </div>

          {/* Error Message */}
          {error && (
            <div className="px-6 py-3 bg-red-50 border-t border-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {/* Processing Message */}
          {isProcessing && (
            <div className="px-6 py-3 bg-blue-50 border-t border-blue-200 flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
              <span className="text-sm text-blue-700">{processingMessage}</span>
            </div>
          )}

          {/* Navigation Buttons */}
          {currentStep !== 'success' && (
            <div className="flex justify-between items-center p-6 pt-4 border-t border-gray-200 bg-white flex-shrink-0">
              <Button
                variant="ghost"
                onClick={handleBack}
                disabled={currentStep === 'content-type' || isProcessing}
                className={currentStep === 'content-type' ? 'invisible' : ''}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              
              {currentStep !== 'review' && currentStep !== 'scheduling' ? (
                <Button
                  onClick={handleNext}
                  disabled={!validateStep(currentStep) || isProcessing}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    onClick={handleBack}
                    variant="outline"
                    disabled={isProcessing}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleNext}
                    disabled={!validateStep(currentStep) || isProcessing}
                    className="bg-teal-600 hover:bg-teal-700"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Calendar Popup */}
      <CalendarPopup
        isOpen={isCalendarOpen}
        selectedInterval={postData.scheduledTime ? {
          startDate: postData.scheduledTime,
          startTime: postData.scheduledTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
        } : undefined}
        singleDateMode={true}
        showTimeSelect={true}
        onConfirm={handleCalendarConfirm}
        onClose={() => setIsCalendarOpen(false)}
      />
    </>
  )
} 