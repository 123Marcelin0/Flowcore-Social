"use client"

import React, { useState, useRef, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
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
  Eye
} from 'lucide-react'
import { toast } from 'sonner'

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
  existingFiles = []
}: UniversalUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>(existingFiles)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

      // Create file object
      const uploadedFile: UploadedFile = {
        id: `${Date.now()}-${Math.random()}`,
        file,
        url: URL.createObjectURL(file),
        type: getFileType(file),
        name: file.name,
        size: file.size,
        uploadProgress: 0,
        status: 'uploading'
      }

      newFiles.push(uploadedFile)
    }

    // Simulate upload progress for demo
    for (const file of newFiles) {
      setUploadedFiles(prev => [...prev, file])
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadedFiles(prev => 
          prev.map(f => 
            f.id === file.id 
              ? { ...f, uploadProgress: Math.min((f.uploadProgress || 0) + Math.random() * 20, 100) }
              : f
          )
        )
      }, 100)

      // Complete upload after 1-2 seconds
      setTimeout(() => {
        clearInterval(progressInterval)
        setUploadedFiles(prev => 
          prev.map(f => 
            f.id === file.id 
              ? { ...f, uploadProgress: 100, status: 'completed' }
              : f
          )
        )
      }, 1000 + Math.random() * 1000)
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
    const a = document.createElement('a')
    a.href = file.url
    a.download = file.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [])

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

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <Card 
        className={`border-2 border-dashed transition-all duration-300 ${
          isDragging 
            ? 'border-teal-500 bg-teal-50' 
            : 'border-gray-300 hover:border-teal-400 hover:bg-teal-50'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <CardContent 
          className="p-8"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          <div className="text-center space-y-4">
            {isUploading ? (
              <div className="space-y-4">
                <Loader2 className="w-12 h-12 text-teal-500 animate-spin mx-auto" />
                <p className="text-lg font-medium text-gray-900">Processing files...</p>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto">
                  <Upload className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {isDragging ? 'Drop your files here' : 'Upload Files'}
                  </h3>
                  <p className="text-gray-600">
                    Drag and drop files here, or click to browse
                  </p>
                </div>
                <div className="flex flex-wrap gap-4 justify-center text-sm text-gray-500">
                  <span>• Max size: {maxSize}MB</span>
                  <span>• Max files: {maxFiles}</span>
                  {allowedTypes.includes('image/jpeg') && <span>• Images: JPG, PNG, WebP</span>}
                  {allowedTypes.includes('video/mp4') && <span>• Videos: MP4, MOV, AVI</span>}
                </div>
              </>
            )}
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
        </CardContent>
      </Card>

      {/* File List */}
      {uploadedFiles.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Uploaded Files ({uploadedFiles.length}/{maxFiles})
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFiles}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All
              </Button>
            </div>

            <div className="space-y-3">
              {uploadedFiles.map((file) => {
                const FileIcon = getFileIcon(file.type)
                const statusColor = getStatusColor(file.status)
                
                return (
                  <div key={file.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    {/* File Preview/Icon */}
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                      {file.type === 'image' ? (
                        <img
                          src={file.url}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FileIcon className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{file.name}</p>
                      <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                      
                      {/* Upload Progress */}
                      {file.status === 'uploading' && file.uploadProgress !== undefined && (
                        <div className="mt-2">
                          <Progress value={file.uploadProgress} className="h-2" />
                          <p className="text-xs text-gray-500 mt-1">{Math.round(file.uploadProgress)}%</p>
                        </div>
                      )}
                      
                      {/* Error Message */}
                      {file.status === 'error' && file.error && (
                        <p className="text-xs text-red-600 mt-1">{file.error}</p>
                      )}
                    </div>

                    {/* Status & Actions */}
                    <div className="flex items-center gap-2">
                      {/* Status Badge */}
                      <Badge variant="outline" className={statusColor}>
                        {file.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {file.status === 'error' && <AlertCircle className="w-3 h-3 mr-1" />}
                        {file.status === 'uploading' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                        {file.status}
                      </Badge>

                      {/* Action Buttons */}
                      {file.status === 'completed' && (
                        <>
                          {file.type === 'image' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(file.url, '_blank')}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadFile(file)}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(file.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 