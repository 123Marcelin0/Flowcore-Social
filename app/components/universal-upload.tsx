"use client"

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { 
  Upload, 
  X, 
  ImageIcon, 
  VideoIcon, 
  FileIcon,
  Loader2,
  CheckCircle,
  AlertCircle,
  Trash2,
  Download,
  Eye,
  Scissors,
  Settings,
  Clock
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-context'
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export interface UploadedFile {
  id: string
  file: File
  url: string
  type: 'image' | 'video' | 'other'
  name: string
  size: number
  uploadProgress?: number
  status: 'uploading' | 'completed' | 'error'
  error?: string
  selected?: boolean
}

interface ShotstackJob {
  id: string
  shotstack_job_id: string
  status: 'submitted' | 'queued' | 'fetching' | 'rendering' | 'done' | 'failed'
  input_video_urls: string[]
  output_format: string
  output_resolution: string
  video_url?: string
  error_message?: string
  created_at: string
  metadata?: any
}

interface UniversalUploadProps {
  accept?: string
  maxSize?: number // in MB
  maxFiles?: number
  multiple?: boolean
  onFilesUploaded?: (files: UploadedFile[]) => void
  onFileRemoved?: (fileId: string) => void
  allowedTypes?: string[]
  className?: string
  disabled?: boolean
  existingFiles?: UploadedFile[]
  enableVideoMerging?: boolean
}

const statusMessages = {
  submitted: 'Job submitted to queue...',
  queued: 'Waiting in queue...',
  fetching: 'Fetching source videos...',
  rendering: 'Merging and processing...',
  done: 'Video is ready!',
  failed: 'Processing failed'
}

const statusColors = {
  submitted: 'bg-blue-500',
  queued: 'bg-yellow-500',
  fetching: 'bg-orange-500',
  rendering: 'bg-purple-500',
  done: 'bg-green-500',
  failed: 'bg-red-500'
}

export function UniversalUpload({
  accept = "image/*,video/*",
  maxSize = 100, // 100MB default
  maxFiles = 10,
  multiple = true,
  onFilesUploaded,
  onFileRemoved,
  allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/mov', 'video/avi', 'video/webm'],
  className = "",
  disabled = false,
  existingFiles = [],
  enableVideoMerging = true
}: UniversalUploadProps) {
  const { user } = useAuth()
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>(existingFiles)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isMerging, setIsMerging] = useState(false)
  const [currentMergeJob, setCurrentMergeJob] = useState<ShotstackJob | null>(null)
  const [outputFormat, setOutputFormat] = useState<'mp4' | 'gif' | 'webm'>('mp4')
  const [outputResolution, setOutputResolution] = useState<'sd' | 'hd' | 'full-hd'>('full-hd')
  const [showMergeSettings, setShowMergeSettings] = useState(false)
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Track interval and timeout IDs to prevent memory leaks
  const intervalRefs = useRef<(number | NodeJS.Timeout)[]>([])

  // Cleanup intervals on component unmount
  useEffect(() => {
    return () => {
      intervalRefs.current.forEach(id => {
        if (typeof id === 'number') {
          clearInterval(id)
        } else {
          clearTimeout(id)
        }
      })
      intervalRefs.current = []
    }
  }, [])

  // Get selected videos
  const selectedVideos = uploadedFiles.filter(file => file.type === 'video' && file.selected)

  // Validate file type
  const validateFileType = (file: File): boolean => {
    if (allowedTypes.length === 0) return true
    return allowedTypes.includes(file.type)
  }

  // Validate file size
  const validateFileSize = (file: File): boolean => {
    return file.size <= maxSize * 1024 * 1024
  }

  // Get file type category
  const getFileType = (file: File): 'image' | 'video' | 'other' => {
    if (file.type.startsWith('image/')) return 'image'
    if (file.type.startsWith('video/')) return 'video'
    return 'other'
  }

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Toggle file selection
  const toggleFileSelection = (fileId: string) => {
    setUploadedFiles(prev => 
      prev.map(file => 
        file.id === fileId 
          ? { ...file, selected: !file.selected }
          : file
      )
    )
  }

  // Handle file upload
  const handleFileUpload = useCallback(async (files: FileList | File[]) => {
    if (disabled) return

    setIsUploading(true)
    const fileArray = Array.from(files)
    const newFiles: UploadedFile[] = []
    let errorCount = 0

    for (const file of fileArray) {
      // Check file limit
      if (!multiple && uploadedFiles.length > 0) {
        toast.error('Only one file is allowed')
        break
      }

      if (uploadedFiles.length + newFiles.length >= maxFiles) {
        toast.error(`Maximum ${maxFiles} files allowed`)
        break
      }

      // Validate file type
      if (!validateFileType(file)) {
        toast.error(`File type not supported: ${file.name}`)
        errorCount++
        continue
      }

      // Validate file size
      if (!validateFileSize(file)) {
        toast.error(`File too large: ${file.name}. Maximum size is ${maxSize}MB`)
        errorCount++
        continue
      }

      // All validations passed - create file object with blob URL
      const uploadedFile: UploadedFile = {
        id: uuidv4(),
        file,
        url: URL.createObjectURL(file),
        type: getFileType(file),
        name: file.name,
        size: file.size,
        uploadProgress: 0,
        status: 'uploading',
        selected: false
      }

      newFiles.push(uploadedFile)
    }

    // Simulate upload progress for demo
    for (const file of newFiles) {
      setUploadedFiles(prev => [...prev, file])
      
      // Simulate progress with proper cleanup
      const progressInterval = setInterval(() => {
        setUploadedFiles(prev => 
          prev.map(f => 
            f.id === file.id 
              ? { ...f, uploadProgress: Math.min((f.uploadProgress || 0) + Math.random() * 20, 100) }
              : f
          )
        )
      }, 100)
      
      // Store interval ID for cleanup
      intervalRefs.current.push(progressInterval)

      // Complete upload after 1-2 seconds
      const completeTimeout = setTimeout(() => {
        clearInterval(progressInterval)
        // Remove from tracked intervals
        intervalRefs.current = intervalRefs.current.filter(id => id !== progressInterval)
        setUploadedFiles(prev => 
          prev.map(f => 
            f.id === file.id 
              ? { ...f, uploadProgress: 100, status: 'completed' }
              : f
          )
        )
      }, 1000 + Math.random() * 1000)
      
      // Store timeout ID for cleanup
      intervalRefs.current.push(completeTimeout)
    }

    setIsUploading(false)

    if (newFiles.length > 0) {
      toast.success(`${newFiles.length} file(s) uploaded successfully!`)
      onFilesUploaded?.(newFiles)
    }

    if (errorCount > 0) {
      toast.error(`${errorCount} file(s) failed to upload`)
    }
  }, [disabled, multiple, uploadedFiles.length, maxFiles, maxSize, onFilesUploaded])

  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileUpload(files)
    }
  }, [handleFileUpload])

  // Remove file
  const removeFile = useCallback((fileId: string) => {
    setUploadedFiles(prev => {
      const fileToRemove = prev.find(f => f.id === fileId)
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.url)
      }
      const updated = prev.filter(f => f.id !== fileId)
      onFileRemoved?.(fileId)
      return updated
    })
    toast.success('File removed')
  }, [onFileRemoved])

  // Clear all files
  const clearAllFiles = useCallback(() => {
    uploadedFiles.forEach(file => URL.revokeObjectURL(file.url))
    setUploadedFiles([])
    toast.success('All files cleared')
  }, [uploadedFiles])

  // Download file
  const downloadFile = useCallback((file: UploadedFile) => {
    // Validate URL for security before downloading
    if (!isValidUrl(file.url)) {
      toast.error('Unable to download file from untrusted source')
      return
    }
    
    const a = document.createElement('a')
    a.href = file.url
    a.download = file.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [])

  // Start video merging
  const startVideoMerging = async () => {
    if (selectedVideos.length < 2) {
      toast.error('Please select at least 2 videos to merge')
      return
    }

    if (selectedVideos.length > 10) {
      toast.error('Maximum 10 videos allowed for merging')
      return
    }

    try {
      setIsMerging(true)
      
      const videoUrls = selectedVideos.map(video => video.url)
      
      toast.info('Starting video merge...', { duration: 3000 })
      
      const response = await fetch('/api/shotstack/render', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          videoUrls,
          outputFormat,
          outputResolution
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to start video merging')
      }

      toast.success(`Video merging started! Estimated duration: ${Math.round(result.estimatedDuration || 0)}s`)
      
      // Start polling for job status
      startStatusPolling(result.jobId, result.estimatedDuration)
      
      // Clear selection
      setUploadedFiles(prev => prev.map(file => ({ ...file, selected: false })))
      
    } catch (error) {
      console.error('Error starting video merge:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to start video merging')
    } finally {
      setIsMerging(false)
    }
  }

  // Poll job status
  const startStatusPolling = (jobId: string, estimatedDuration?: number) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/shotstack/render?jobId=${jobId}`, {
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
          }
        })

        const result = await response.json()

        if (response.ok) {
          setCurrentMergeJob(prev => prev ? { ...prev, ...result } : null)
          
          if (result.status === 'done' || result.status === 'failed') {
            clearInterval(pollInterval)
            // Remove from tracked intervals
            intervalRefs.current = intervalRefs.current.filter(id => id !== pollInterval)
            setCurrentMergeJob(null)
            
            if (result.status === 'done') {
              const duration = result.duration ? ` (${Math.round(result.duration)}s)` : ''
              const renderTime = result.renderTime ? ` in ${Math.round(result.renderTime / 1000)}s` : ''
              toast.success(`Video merging completed${duration}${renderTime}!`)
            } else {
              toast.error(result.error || 'Video merging failed')
            }
          }
        }
      } catch (error) {
        console.error('Error polling job status:', error)
      }
    }, 3000) // Poll every 3 seconds
    
    // Store interval ID for cleanup
    intervalRefs.current.push(pollInterval)

    // Create initial job object
    setCurrentMergeJob({
      id: '',
      shotstack_job_id: jobId,
      status: 'submitted',
      input_video_urls: selectedVideos.map(v => v.url),
      output_format: outputFormat,
      output_resolution: outputResolution,
      created_at: new Date().toISOString(),
      metadata: estimatedDuration ? { estimatedDuration } : undefined
    })

    // Clear polling after 10 minutes to prevent infinite polling
    const timeoutId = setTimeout(() => {
      clearInterval(pollInterval)
      // Remove from tracked intervals
      intervalRefs.current = intervalRefs.current.filter(id => id !== pollInterval)
      setCurrentMergeJob(null)
    }, 600000)
    
    // Store timeout ID for cleanup
    intervalRefs.current.push(timeoutId)
  }

  // Download merged video
  const downloadMergedVideo = (videoUrl: string) => {
    const link = document.createElement('a')
    link.href = videoUrl
    link.download = `merged-video-${Date.now()}.${outputFormat}`
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Get file icon
  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image': return ImageIcon
      case 'video': return VideoIcon
      default: return FileIcon
    }
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600'
      case 'error': return 'text-red-600'
      case 'uploading': return 'text-blue-600'
      default: return 'text-gray-600'
    }
  }

  // Handle file preview
  const handleFilePreview = (file: UploadedFile) => {
    setPreviewFile(file)
    setPreviewError(null)
  }

  // Validate URL for security
  const isValidUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url)
      // Only allow data URLs, blob URLs, or URLs from trusted domains
      return urlObj.protocol === 'data:' || 
             urlObj.protocol === 'blob:' || 
             urlObj.hostname === 'localhost' ||
             urlObj.hostname.endsWith('.supabase.co') ||
             urlObj.hostname.endsWith('.vercel.app')
    } catch {
      return false
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Glassmorphic Upload Area */}
      <div 
        className={`relative group transition-all duration-500 ease-out ${
          isDragging 
            ? 'scale-105' 
            : 'hover:scale-[1.02]'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        {/* Background Blur Layer with Warm Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50/30 via-peach-50/20 to-amber-50/10 backdrop-blur-xl rounded-3xl border border-white/40 shadow-2xl" />
        
        {/* Glassmorphic Container with Edit Page Styling */}
        <div className={`
          relative p-8 rounded-3xl
          bg-gradient-to-br from-white/15 via-white/10 to-white/5 backdrop-blur-2xl
          border border-white/50
          shadow-[0_8px_32px_rgba(255,165,0,0.1),inset_0_1px_2px_rgba(255,255,255,0.3)]
          hover:shadow-[0_16px_48px_rgba(255,165,0,0.15),inset_0_2px_4px_rgba(255,255,255,0.4)]
          transition-all duration-500 ease-out
          ${isDragging 
            ? 'bg-gradient-to-br from-white/25 via-white/20 to-white/15 border-white/70 shadow-[0_20px_60px_rgba(255,165,0,0.2),inset_0_2px_4px_rgba(255,255,255,0.5)]' 
            : 'hover:bg-gradient-to-br from-white/20 via-white/15 to-white/10 hover:border-white/60'
          }
        `}>
          {/* Inner Glow Effect with Warm Tones */}
          <div className="absolute inset-0 bg-gradient-to-br from-orange-100/10 via-transparent to-amber-100/5 rounded-3xl" />
          
          {/* Content */}
          <div className="relative z-10 text-center space-y-6">
            {isUploading ? (
              <div className="space-y-6">
                <div className="relative">
                  <div className="w-20 h-20 bg-gradient-to-r from-orange-400/20 to-amber-400/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto border border-white/40 shadow-lg">
                    <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
                  </div>
                  {/* Animated Ring */}
                  <div className="absolute inset-0 w-20 h-20 border-2 border-orange-400/30 rounded-full animate-ping mx-auto" />
                </div>
                <div>
                  <p className="text-xl font-semibold text-gray-800 mb-2 bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                    Processing files...
                  </p>
                  <p className="text-gray-600/80 text-sm">Please wait while we upload your files</p>
                </div>
              </div>
            ) : (
              <>
                {/* Upload Icon with Glassmorphic Effect - Updated Colors */}
                <div className="relative">
                  <div className="w-24 h-24 bg-gradient-to-br from-orange-400/30 to-amber-400/30 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto border border-white/50 shadow-[0_8px_32px_rgba(255,165,0,0.2)] group-hover:shadow-[0_12px_40px_rgba(255,165,0,0.3)] transition-all duration-500">
                    <Upload className="w-12 h-12 text-orange-600 drop-shadow-lg" />
                  </div>
                  {/* Subtle Glow Ring with Warm Colors */}
                  <div className="absolute inset-0 w-24 h-24 bg-gradient-to-r from-orange-400/20 to-amber-400/20 rounded-full blur-xl opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
                </div>

                {/* Text Content */}
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 bg-clip-text text-transparent">
                    {isDragging ? 'Drop your files here' : 'Bilder hier ablegen'}
                  </h3>
                  <p className="text-gray-600/90 text-base leading-relaxed">
                    Mehrere Bilder per Drag & Drop oder Klick auswählen
                  </p>
                </div>

                {/* File Type Info with Glassmorphic Cards - Updated Styling */}
                <div className="flex flex-wrap gap-3 justify-center">
                  <div className="px-4 py-2 bg-gradient-to-r from-white/25 via-white/20 to-white/15 backdrop-blur-sm rounded-full border border-white/40 shadow-sm">
                    <span className="text-sm font-medium text-gray-700">Unterstützt: JPG, PNG, WebP</span>
                  </div>
                  <div className="px-4 py-2 bg-gradient-to-r from-white/25 via-white/20 to-white/15 backdrop-blur-sm rounded-full border border-white/40 shadow-sm">
                    <span className="text-sm font-medium text-gray-700">Max: {maxSize}MB</span>
                  </div>
                  <div className="px-4 py-2 bg-gradient-to-r from-white/25 via-white/20 to-white/15 backdrop-blur-sm rounded-full border border-white/40 shadow-sm">
                    <span className="text-sm font-medium text-gray-700">Bis zu {maxFiles} Bilder</span>
                  </div>
                </div>

                {/* Action Buttons - Updated Styling */}
                <div className="flex gap-4 justify-center pt-4">
                  <Button
                    variant="outline"
                    className="bg-gradient-to-r from-white/25 via-white/20 to-white/15 backdrop-blur-sm border-white/50 text-gray-700 hover:bg-gradient-to-r hover:from-white/35 hover:via-white/30 hover:to-white/25 hover:border-white/60 shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    Bilder auswählen
                  </Button>
                  <Button
                    variant="outline"
                    className="bg-gradient-to-r from-white/25 via-white/20 to-white/15 backdrop-blur-sm border-white/50 text-gray-700 hover:bg-gradient-to-r hover:from-white/35 hover:via-white/30 hover:to-white/25 hover:border-white/60 shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    Leeren Raum verwenden
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Subtle Background Pattern with Warm Tones */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50/30 via-transparent to-amber-50/30 rounded-3xl opacity-50" />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
        className="hidden"
        disabled={disabled}
      />

      {/* Video Merge Settings */}
      {enableVideoMerging && selectedVideos.length >= 2 && (
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-white/10 to-white/5 backdrop-blur-xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(255,165,0,0.1),inset_0_1px_2px_rgba(255,255,255,0.3)]" />
          <div className="relative z-10 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Scissors className="w-5 h-5 text-orange-600" />
                <h3 className="text-lg font-semibold text-gray-800">
                  Merge {selectedVideos.length} Videos
                </h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMergeSettings(!showMergeSettings)}
                className="bg-gradient-to-r from-white/25 via-white/20 to-white/15 backdrop-blur-sm border-white/50 text-gray-700 hover:bg-gradient-to-r hover:from-white/35 hover:via-white/30 hover:to-white/25 hover:border-white/60 shadow-sm hover:shadow-md transition-all duration-300"
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </div>

            {showMergeSettings && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Output Format</label>
                  <select
                    value={outputFormat}
                    onChange={(e) => setOutputFormat(e.target.value as 'mp4' | 'gif' | 'webm')}
                    className="w-full bg-gradient-to-r from-white/25 via-white/20 to-white/15 backdrop-blur-sm border border-white/50 rounded-lg text-gray-800 p-2 focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400/50 transition-all duration-300"
                    disabled={isMerging || !!currentMergeJob}
                  >
                    <option value="mp4">MP4 (Recommended)</option>
                    <option value="gif">GIF</option>
                    <option value="webm">WebM</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Resolution</label>
                  <select
                    value={outputResolution}
                    onChange={(e) => setOutputResolution(e.target.value as 'sd' | 'hd' | 'full-hd')}
                    className="w-full bg-gradient-to-r from-white/25 via-white/20 to-white/15 backdrop-blur-sm border border-white/50 rounded-lg text-gray-800 p-2 focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400/50 transition-all duration-300"
                    disabled={isMerging || !!currentMergeJob}
                  >
                    <option value="full-hd">Full HD (1080p)</option>
                    <option value="hd">HD (720p)</option>
                    <option value="sd">SD (480p)</option>
                  </select>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={startVideoMerging}
                disabled={isMerging || !!currentMergeJob}
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg px-6 py-2 transition-all duration-300 focus:outline-none focus:ring-0 shadow-lg"
              >
                {isMerging ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Merging...
                  </>
                ) : (
                  <>
                    <Scissors className="w-4 h-4 mr-2" />
                    Merge Videos
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setUploadedFiles(prev => prev.map(file => ({ ...file, selected: false })))}
                className="bg-gradient-to-r from-white/25 via-white/20 to-white/15 backdrop-blur-sm border-white/50 text-gray-700 hover:bg-gradient-to-r hover:from-white/35 hover:via-white/30 hover:to-white/25 hover:border-white/60 shadow-sm hover:shadow-md transition-all duration-300"
              >
                <X className="w-4 h-4 mr-2" />
                Clear Selection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Current Merge Job Status */}
      {currentMergeJob && (
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-white/10 to-white/5 backdrop-blur-xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(255,165,0,0.1),inset_0_1px_2px_rgba(255,255,255,0.3)]" />
          <div className="relative z-10 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${statusColors[currentMergeJob.status]} animate-pulse`} />
                <span className="font-medium text-gray-800">
                  {statusMessages[currentMergeJob.status]}
                </span>
              </div>
              {currentMergeJob.status === 'rendering' && (
                <div className="bg-white/40 backdrop-blur-sm border border-white/50 rounded-full p-2">
                  <Loader2 className="w-5 h-5 animate-spin text-orange-600" />
                </div>
              )}
            </div>
            
            {currentMergeJob.status !== 'failed' && currentMergeJob.status !== 'done' && (
              <div className="mb-4">
                <Progress 
                  value={currentMergeJob.status === 'submitted' ? 10 : 
                         currentMergeJob.status === 'queued' ? 25 :
                         currentMergeJob.status === 'fetching' ? 50 : 75} 
                  className="w-full h-2 bg-white/30" 
                />
              </div>
            )}
            
            {currentMergeJob.video_url && (
              <div className="flex gap-3">
                <Button
                  onClick={() => downloadMergedVideo(currentMergeJob.video_url!)}
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg px-4 py-2 transition-all duration-300 focus:outline-none focus:ring-0 shadow-lg"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Merged Video
                </Button>
              </div>
            )}
            
            {currentMergeJob.status === 'failed' && currentMergeJob.error_message && (
              <div className="bg-red-100/40 backdrop-blur-sm border border-red-200/40 rounded-lg p-4 mt-4">
                <p className="text-sm text-red-800">
                  <strong>Error:</strong> {currentMergeJob.error_message}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* File List with Glassmorphic Styling */}
      {uploadedFiles.length > 0 && (
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-white/10 to-white/5 backdrop-blur-xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(255,165,0,0.1),inset_0_1px_2px_rgba(255,255,255,0.3)]" />
          <div className="relative z-10 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                Uploaded Files ({uploadedFiles.length}/{maxFiles})
              </h3>
              <div className="flex gap-3">
                {enableVideoMerging && uploadedFiles.filter(f => f.type === 'video').length >= 2 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMergeSettings(!showMergeSettings)}
                    className="bg-gradient-to-r from-white/25 via-white/20 to-white/15 backdrop-blur-sm border-white/50 text-orange-600 hover:text-orange-700 hover:bg-gradient-to-r hover:from-white/35 hover:via-white/30 hover:to-white/25 hover:border-white/60 shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    <Scissors className="w-4 h-4 mr-2" />
                    Video Merge
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFiles}
                  className="bg-gradient-to-r from-white/25 via-white/20 to-white/15 backdrop-blur-sm border-white/50 text-red-600 hover:text-red-700 hover:bg-gradient-to-r hover:from-white/35 hover:via-white/30 hover:to-white/25 hover:border-white/60 shadow-sm hover:shadow-md transition-all duration-300"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear All
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {uploadedFiles.map((file) => {
                const FileIcon = getFileIcon(file.type)
                const statusColor = getStatusColor(file.status)
                
                return (
                  <div key={file.id} className={`flex items-center gap-4 p-4 bg-gradient-to-r from-white/25 via-white/20 to-white/15 backdrop-blur-sm rounded-xl border border-white/50 shadow-sm hover:shadow-md transition-all duration-300 ${
                    file.selected ? 'ring-2 ring-orange-400/50 bg-gradient-to-r from-orange-100/40 via-orange-50/30 to-orange-100/40 border-orange-400/60' : ''
                  }`}>
                    {/* File Preview/Icon */}
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gradient-to-r from-white/35 via-white/30 to-white/25 backdrop-blur-sm flex-shrink-0 border border-white/50">
                      {file.type === 'image' ? (
                        <img
                          src={file.url}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FileIcon className="w-6 h-6 text-gray-500" />
                        </div>
                      )}
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">{file.name}</p>
                      <p className="text-sm text-gray-600/80">{formatFileSize(file.size)}</p>
                      
                      {/* Upload Progress */}
                      {file.status === 'uploading' && file.uploadProgress !== undefined && (
                        <div className="mt-2">
                          <Progress value={file.uploadProgress} className="h-2 bg-white/20" />
                          <p className="text-xs text-gray-600/70 mt-1">{Math.round(file.uploadProgress)}%</p>
                        </div>
                      )}
                      
                      {/* Error Message */}
                      {file.status === 'error' && file.error && (
                        <p className="text-xs text-red-600 mt-1">{file.error}</p>
                      )}
                    </div>

                    {/* Status & Actions */}
                    <div className="flex items-center gap-2">
                      {/* Selection Toggle for Videos */}
                      {enableVideoMerging && file.type === 'video' && file.status === 'completed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleFileSelection(file.id)}
                          className={`bg-gradient-to-r from-white/25 via-white/20 to-white/15 backdrop-blur-sm border border-white/50 shadow-sm hover:shadow-md transition-all duration-300 ${
                            file.selected 
                              ? 'text-orange-600 hover:text-orange-700 hover:bg-gradient-to-r hover:from-white/35 hover:via-white/30 hover:to-white/25 hover:border-white/60' 
                              : 'text-gray-600 hover:text-gray-800 hover:bg-gradient-to-r hover:from-white/35 hover:via-white/30 hover:to-white/25 hover:border-white/60'
                          }`}
                        >
                          {file.selected ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                        </Button>
                      )}

                      {/* Status Badge */}
                      <Badge variant="outline" className={`bg-gradient-to-r from-white/25 via-white/20 to-white/15 backdrop-blur-sm border-white/50 ${statusColor}`}>
                        {file.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {file.status === 'error' && <AlertCircle className="w-3 h-3 mr-1" />}
                        {file.status === 'uploading' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                        {file.status}
                      </Badge>

                      {/* Action Buttons */}
                      {file.status === 'completed' && (
                        <>
                          {(file.type === 'image' || file.type === 'video') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleFilePreview(file)}
                              className="bg-gradient-to-r from-white/25 via-white/20 to-white/15 backdrop-blur-sm text-gray-600 hover:text-gray-800 hover:bg-gradient-to-r hover:from-white/35 hover:via-white/30 hover:to-white/25 border border-white/50 hover:border-white/60 shadow-sm hover:shadow-md transition-all duration-300"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadFile(file)}
                            className="bg-gradient-to-r from-white/25 via-white/20 to-white/15 backdrop-blur-sm text-gray-600 hover:text-gray-800 hover:bg-gradient-to-r hover:from-white/35 hover:via-white/30 hover:to-white/25 border border-white/50 hover:border-white/60 shadow-sm hover:shadow-md transition-all duration-300"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(file.id)}
                        className="bg-gradient-to-r from-white/25 via-white/20 to-white/15 backdrop-blur-sm text-red-600 hover:text-red-700 hover:bg-gradient-to-r hover:from-white/35 hover:via-white/30 hover:to-white/25 border border-white/50 hover:border-white/60 shadow-sm hover:shadow-md transition-all duration-300"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Secure File Preview Modal */}
      <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Preview: {previewFile?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 min-h-0 flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden">
            {previewFile && isValidUrl(previewFile.url) ? (
              previewFile.type === 'image' ? (
                <img 
                  src={previewFile.url} 
                  alt={previewFile.name}
                  className="max-w-full max-h-full object-contain"
                  onError={() => setPreviewError('Failed to load image')}
                  onLoad={() => setPreviewError(null)}
                />
              ) : previewFile.type === 'video' ? (
                <video 
                  src={previewFile.url} 
                  controls 
                  className="max-w-full max-h-full object-contain"
                  onError={() => setPreviewError('Failed to load video')}
                  onLoadedData={() => setPreviewError(null)}
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className="text-center p-8">
                  <FileIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Preview not available for this file type</p>
                  <p className="text-sm text-gray-500 mt-2">{previewFile.name}</p>
                </div>
              )
            ) : (
              <div className="text-center p-8">
                <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <p className="text-red-600">Unable to preview this file</p>
                <p className="text-sm text-gray-500 mt-2">
                  {previewError || 'The file URL is not from a trusted source'}
                </p>
              </div>
            )}
          </div>
          
          {previewFile && (
            <div className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
              <div>
                <p><strong>Type:</strong> {previewFile.type}</p>
                <p><strong>Size:</strong> {formatFileSize(previewFile.size)}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadFile(previewFile)}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
} 