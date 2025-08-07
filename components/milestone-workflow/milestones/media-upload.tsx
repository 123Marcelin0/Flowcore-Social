"use client"

import React, { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { EnhancedLiquidGlass } from '@/components/ui/enhanced-liquid-glass'
import { 
  Upload, 
  Image, 
  Video, 
  Music, 
  File,
  X, 
  Play,
  Pause,
  RotateCcw,
  Trash2,
  GripVertical,
  Plus,
  AlertCircle,
  CheckCircle,
  Clock,
  FileImage,
  FileVideo,
  FileAudio
} from 'lucide-react'

export interface MediaFile {
  id: string
  name: string
  type: 'image' | 'video' | 'audio' | 'document'
  size: number
  duration?: number
  thumbnailUrl?: string
  url: string
  uploadProgress?: number
  uploadStatus: 'pending' | 'uploading' | 'completed' | 'error'
  errorMessage?: string
  metadata?: {
    width?: number
    height?: number
    format?: string
    bitrate?: number
  }
}

export interface MediaUploadData {
  files: MediaFile[]
  totalSize: number
  maxFileSize: number
  allowedTypes: string[]
}

export interface MediaUploadProps {
  initialData?: Partial<MediaUploadData>
  onDataChange: (data: MediaUploadData) => void
  onValidationChange: (isValid: boolean, errors: string[]) => void
  maxFiles?: number
  maxFileSize?: number // in MB
  allowedTypes?: string[]
  className?: string
}

const SUPPORTED_FORMATS = {
  image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
  video: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v'],
  audio: ['mp3', 'wav', 'aac', 'ogg', 'm4a', 'flac']
}

const DEFAULT_ALLOWED_TYPES = [
  ...SUPPORTED_FORMATS.image.map(ext => `image/${ext === 'jpg' ? 'jpeg' : ext}`),
  ...SUPPORTED_FORMATS.video.map(ext => `video/${ext}`),
  ...SUPPORTED_FORMATS.audio.map(ext => `audio/${ext}`)
]

export function MediaUpload({
  initialData,
  onDataChange,
  onValidationChange,
  maxFiles = 20,
  maxFileSize = 100, // 100MB default
  allowedTypes = DEFAULT_ALLOWED_TYPES,
  className
}: MediaUploadProps) {
  const [files, setFiles] = useState<MediaFile[]>(initialData?.files || [])
  const [dragActive, setDragActive] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null)

  const totalSize = files.reduce((sum, file) => sum + file.size, 0)

  // Validation logic
  React.useEffect(() => {
    const newErrors: string[] = []
    
    if (files.length === 0) {
      newErrors.push('Please upload at least one media file')
    }
    
    if (files.length > maxFiles) {
      newErrors.push(`Maximum ${maxFiles} files allowed`)
    }
    
    const oversizedFiles = files.filter(file => file.size > maxFileSize * 1024 * 1024)
    if (oversizedFiles.length > 0) {
      newErrors.push(`${oversizedFiles.length} file(s) exceed ${maxFileSize}MB limit`)
    }
    
    const failedUploads = files.filter(file => file.uploadStatus === 'error')
    if (failedUploads.length > 0) {
      newErrors.push(`${failedUploads.length} file(s) failed to upload`)
    }

    setErrors(newErrors)
    onValidationChange(newErrors.length === 0, newErrors)
  }, [files, maxFiles, maxFileSize, onValidationChange])

  // Data change handler
  React.useEffect(() => {
    onDataChange({
      files,
      totalSize,
      maxFileSize,
      allowedTypes
    })
  }, [files, totalSize, maxFileSize, allowedTypes, onDataChange])

  const getFileType = (file: File): MediaFile['type'] => {
    if (file.type.startsWith('image/')) return 'image'
    if (file.type.startsWith('video/')) return 'video'
    if (file.type.startsWith('audio/')) return 'audio'
    return 'document'
  }

  const getFileIcon = (type: MediaFile['type']) => {
    switch (type) {
      case 'image': return FileImage
      case 'video': return FileVideo
      case 'audio': return FileAudio
      default: return File
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const generateThumbnail = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target?.result as string)
        reader.readAsDataURL(file)
      } else if (file.type.startsWith('video/')) {
        const video = document.createElement('video')
        video.preload = 'metadata'
        video.onloadedmetadata = () => {
          video.currentTime = Math.min(1, video.duration / 2)
        }
        video.onseeked = () => {
          const canvas = document.createElement('canvas')
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(video, 0, 0)
          resolve(canvas.toDataURL())
        }
        video.src = URL.createObjectURL(file)
      } else {
        resolve('') // No thumbnail for audio/other files
      }
    })
  }

  const simulateUpload = async (file: MediaFile): Promise<void> => {
    return new Promise((resolve, reject) => {
      let progress = 0
      const interval = setInterval(() => {
        progress += Math.random() * 20
        if (progress >= 100) {
          progress = 100
          clearInterval(interval)
          
          // Simulate occasional upload failures
          if (Math.random() < 0.1) {
            setFiles(prev => prev.map(f => 
              f.id === file.id 
                ? { ...f, uploadStatus: 'error', errorMessage: 'Upload failed. Please try again.' }
                : f
            ))
            reject(new Error('Upload failed'))
          } else {
            setFiles(prev => prev.map(f => 
              f.id === file.id 
                ? { ...f, uploadStatus: 'completed', uploadProgress: 100 }
                : f
            ))
            resolve()
          }
        } else {
          setFiles(prev => prev.map(f => 
            f.id === file.id 
              ? { ...f, uploadProgress: progress }
              : f
          ))
        }
      }, 200)
    })
  }

  const handleFiles = async (fileList: FileList) => {
    const newFiles: MediaFile[] = []
    
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i]
      
      // Check file type
      if (!allowedTypes.includes(file.type)) {
        continue
      }
      
      const thumbnailUrl = await generateThumbnail(file)
      
      const mediaFile: MediaFile = {
        id: `${Date.now()}-${i}`,
        name: file.name,
        type: getFileType(file),
        size: file.size,
        thumbnailUrl,
        url: URL.createObjectURL(file),
        uploadProgress: 0,
        uploadStatus: 'uploading'
      }
      
      newFiles.push(mediaFile)
    }
    
    setFiles(prev => [...prev, ...newFiles])
    
    // Start uploads
    newFiles.forEach(file => {
      simulateUpload(file).catch(() => {
        // Error handling is done in simulateUpload
      })
    })
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files)
    }
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files)
    }
  }

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const retryUpload = (fileId: string) => {
    const file = files.find(f => f.id === fileId)
    if (file) {
      setFiles(prev => prev.map(f => 
        f.id === fileId 
          ? { ...f, uploadStatus: 'uploading', uploadProgress: 0, errorMessage: undefined }
          : f
      ))
      simulateUpload(file).catch(() => {
        // Error handling is done in simulateUpload
      })
    }
  }

  const reorderFiles = (fromIndex: number, toIndex: number) => {
    setFiles(prev => {
      const newFiles = [...prev]
      const [removed] = newFiles.splice(fromIndex, 1)
      newFiles.splice(toIndex, 0, removed)
      return newFiles
    })
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Upload Area */}
      <section>
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-white/90 mb-2">
            Upload Media Files
          </h3>
          <p className="text-sm text-white/60">
            Drag and drop your files here, or click to browse
          </p>
        </div>

        <motion.div
          className={cn(
            'relative border-2 border-dashed rounded-2xl transition-all duration-300',
            dragActive 
              ? 'border-blue-400/60 bg-blue-500/10' 
              : 'border-white/20 hover:border-white/40'
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          whileHover={{ scale: 1.01 }}
        >
          <EnhancedLiquidGlass
            variant="editor"
            intensity="medium"
            animation="hover"
            className="p-12 text-center cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <motion.div
              animate={dragActive ? { scale: 1.05 } : { scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <div className={cn(
                'w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center transition-all duration-300',
                dragActive 
                  ? 'bg-blue-500/20 text-blue-300' 
                  : 'bg-white/10 text-white/60'
              )}>
                <Upload className="w-8 h-8" />
              </div>
              
              <h4 className="text-lg font-semibold text-white/90 mb-2">
                {dragActive ? 'Drop files here' : 'Upload your media'}
              </h4>
              
              <p className="text-sm text-white/60 mb-4">
                Drag and drop files here, or click to browse
              </p>
              
              <div className="flex flex-wrap justify-center gap-2 mb-4">
                {Object.entries(SUPPORTED_FORMATS).map(([type, formats]) => (
                  <span
                    key={type}
                    className="px-3 py-1 text-xs bg-white/10 border border-white/20 rounded-full text-white/70"
                  >
                    {type.toUpperCase()}: {formats.join(', ')}
                  </span>
                ))}
              </div>
              
              <p className="text-xs text-white/40">
                Maximum {maxFiles} files, {maxFileSize}MB per file
              </p>
            </motion.div>
          </EnhancedLiquidGlass>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={allowedTypes.join(',')}
            onChange={handleFileInput}
            className="hidden"
          />
        </motion.div>
      </section>

      {/* File Grid */}
      {files.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-lg font-semibold text-white/90">
              Uploaded Files ({files.length})
            </h4>
            <div className="text-sm text-white/60">
              Total size: {formatFileSize(totalSize)}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {files.map((file, index) => {
                const Icon = getFileIcon(file.type)
                
                return (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.3 }}
                  >
                    <EnhancedLiquidGlass
                      variant="timeline"
                      intensity="medium"
                      animation="hover"
                      className={cn(
                        'relative group',
                        file.uploadStatus === 'error' && 'ring-2 ring-red-400/30',
                        file.uploadStatus === 'completed' && 'ring-2 ring-green-400/30'
                      )}
                    >
                      <div className="p-4">
                        {/* File Preview */}
                        <div className="relative mb-3">
                          <div className="aspect-video bg-white/5 rounded-lg overflow-hidden flex items-center justify-center">
                            {file.thumbnailUrl ? (
                              <img
                                src={file.thumbnailUrl}
                                alt={file.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Icon className="w-8 h-8 text-white/40" />
                            )}
                          </div>
                          
                          {/* Upload Progress */}
                          {file.uploadStatus === 'uploading' && (
                            <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                              <div className="text-center">
                                <div className="w-12 h-12 border-4 border-white/20 border-t-blue-400 rounded-full animate-spin mb-2" />
                                <div className="text-xs text-white/80">
                                  {Math.round(file.uploadProgress || 0)}%
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Status Icons */}
                          <div className="absolute top-2 right-2">
                            {file.uploadStatus === 'completed' && (
                              <div className="w-6 h-6 bg-green-500/20 border border-green-400/60 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-4 h-4 text-green-300" />
                              </div>
                            )}
                            {file.uploadStatus === 'error' && (
                              <div className="w-6 h-6 bg-red-500/20 border border-red-400/60 rounded-full flex items-center justify-center">
                                <AlertCircle className="w-4 h-4 text-red-300" />
                              </div>
                            )}
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <div className="flex gap-1">
                              {file.type === 'video' && (
                                <motion.button
                                  onClick={() => setPreviewFile(file)}
                                  className="w-6 h-6 bg-black/50 border border-white/20 rounded-full flex items-center justify-center text-white/80 hover:bg-black/70"
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                >
                                  <Play className="w-3 h-3" />
                                </motion.button>
                              )}
                              
                              <motion.button
                                onClick={() => removeFile(file.id)}
                                className="w-6 h-6 bg-red-500/20 border border-red-400/60 rounded-full flex items-center justify-center text-red-300 hover:bg-red-500/30"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                <X className="w-3 h-3" />
                              </motion.button>
                            </div>
                          </div>
                        </div>
                        
                        {/* File Info */}
                        <div>
                          <h5 className="text-sm font-medium text-white/90 truncate mb-1">
                            {file.name}
                          </h5>
                          
                          <div className="flex items-center justify-between text-xs text-white/60">
                            <span>{formatFileSize(file.size)}</span>
                            {file.duration && (
                              <span>{formatDuration(file.duration)}</span>
                            )}
                          </div>
                          
                          {file.uploadStatus === 'error' && (
                            <div className="mt-2">
                              <p className="text-xs text-red-300 mb-2">
                                {file.errorMessage}
                              </p>
                              <motion.button
                                onClick={() => retryUpload(file.id)}
                                className="flex items-center gap-1 text-xs text-blue-300 hover:text-blue-200"
                                whileHover={{ scale: 1.05 }}
                              >
                                <RotateCcw className="w-3 h-3" />
                                Retry
                              </motion.button>
                            </div>
                          )}
                        </div>
                      </div>
                    </EnhancedLiquidGlass>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </section>
      )}

      {/* Upload Stats */}
      {files.length > 0 && (
        <section>
          <EnhancedLiquidGlass
            variant="timeline"
            intensity="subtle"
            className="p-4"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-lg font-semibold text-white/90">
                  {files.length}
                </div>
                <div className="text-xs text-white/60">Total Files</div>
              </div>
              
              <div>
                <div className="text-lg font-semibold text-green-300">
                  {files.filter(f => f.uploadStatus === 'completed').length}
                </div>
                <div className="text-xs text-white/60">Completed</div>
              </div>
              
              <div>
                <div className="text-lg font-semibold text-blue-300">
                  {files.filter(f => f.uploadStatus === 'uploading').length}
                </div>
                <div className="text-xs text-white/60">Uploading</div>
              </div>
              
              <div>
                <div className="text-lg font-semibold text-red-300">
                  {files.filter(f => f.uploadStatus === 'error').length}
                </div>
                <div className="text-xs text-white/60">Failed</div>
              </div>
            </div>
          </EnhancedLiquidGlass>
        </section>
      )}

      {/* Validation Errors */}
      <AnimatePresence>
        {errors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <EnhancedLiquidGlass
              variant="timeline"
              intensity="medium"
              className="p-4 border-red-400/30"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-red-300 mb-2">
                    Please fix the following issues:
                  </h4>
                  <ul className="space-y-1">
                    {errors.map((error, index) => (
                      <li key={index} className="text-sm text-red-200/80">
                        • {error}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </EnhancedLiquidGlass>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video Preview Modal */}
      <AnimatePresence>
        {previewFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setPreviewFile(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="max-w-4xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <EnhancedLiquidGlass
                variant="modal"
                intensity="premium"
                className="p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white/90">
                    {previewFile.name}
                  </h3>
                  <motion.button
                    onClick={() => setPreviewFile(null)}
                    className="w-8 h-8 bg-white/10 border border-white/20 rounded-full flex items-center justify-center text-white/80 hover:bg-white/20"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X className="w-4 h-4" />
                  </motion.button>
                </div>
                
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  <video
                    src={previewFile.url}
                    controls
                    className="w-full h-full"
                    autoPlay
                  />
                </div>
              </EnhancedLiquidGlass>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}