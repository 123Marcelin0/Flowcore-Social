"use client"

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Upload, 
  Send,
  Paperclip,
  X,
  Play,
  Loader2
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { toast } from 'sonner'
import { AIInteriorDesigner } from './ai-interior-designer'

interface UploadedFile {
  id: string
  file: File
  url: string
  type: 'image' | 'video'
  name: string
  size: number
}

interface ChatMessage {
  id: string
  content: string
  sender: 'user' | 'ai'
  timestamp: Date
}

interface AIStudioMainProps {
  activeTool?: string | null
  isProcessing?: boolean
  onFilesChange?: (hasFiles: boolean) => void
  onProcessingComplete?: () => void
}

export function AIStudioMain({ 
  activeTool, 
  isProcessing, 
  onFilesChange, 
  onProcessingComplete 
}: AIStudioMainProps) {
  const { user } = useAuth()
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [isChatLoading, setIsChatLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle file upload
  const handleFileUpload = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    const newFiles: UploadedFile[] = []

    for (const file of fileArray) {
      if (file.size > 100 * 1024 * 1024) {
        toast.error(`File too large: ${file.name}`)
        continue
      }

      const isImage = file.type.startsWith('image/')
      const isVideo = file.type.startsWith('video/')
      
      if (!isImage && !isVideo) {
        toast.error(`Unsupported file: ${file.name}`)
        continue
      }

      const uploadedFile: UploadedFile = {
        id: `${Date.now()}-${Math.random()}`,
        file,
        url: URL.createObjectURL(file),
        type: isImage ? 'image' : 'video',
        name: file.name,
        size: file.size
      }

      newFiles.push(uploadedFile)
    }

    setUploadedFiles(prev => {
      const updated = [...prev, ...newFiles]
      onFilesChange?.(updated.length > 0)
      return updated
    })
    if (newFiles.length > 0) {
      toast.success(`${newFiles.length} file(s) uploaded`)
    }
  }, [])

  // Handle drag and drop
  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    const files = event.dataTransfer.files
    if (files.length > 0) {
      handleFileUpload(files)
    }
  }, [handleFileUpload])

  // Handle processing completion
  useEffect(() => {
    if (isProcessing) {
      // Simulate processing completion
      const timer = setTimeout(() => {
        onProcessingComplete?.()
        const aiMessage: ChatMessage = {
          id: `ai-${Date.now()}`,
          content: `Processing complete! Your ${uploadedFiles.length} file(s) have been processed using ${activeTool}. Results are ready for download.`,
          sender: 'ai',
          timestamp: new Date()
        }
        setChatMessages(prev => [...prev, aiMessage])
        toast.success('Processing completed!')
      }, 3000)
      
      return () => clearTimeout(timer)
    }
  }, [isProcessing, onProcessingComplete, uploadedFiles.length, activeTool])

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
  }, [])

  // Handle chat
  const handleChatSend = useCallback(async () => {
    if (!chatInput.trim()) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      content: chatInput,
      sender: 'user',
      timestamp: new Date()
    }

    setChatMessages(prev => [...prev, userMessage])
    setChatInput('')
    setIsChatLoading(true)

    // Simulate AI response
    setTimeout(() => {
      let response = "I can help you with image enhancement, interior design, video editing, and content creation. What would you like to work on?"
      
      if (activeTool) {
        const toolNames = {
          'interior-design': 'interior design',
          'image-enhance': 'image enhancement', 
          'video-edit': 'video editing',
          'content-create': 'content creation'
        }
        response = `Great! I see you've selected ${toolNames[activeTool as keyof typeof toolNames] || activeTool}. ${uploadedFiles.length > 0 ? `You have ${uploadedFiles.length} file(s) ready to process.` : 'Upload some files and I can help you get started!'}`
      }
      
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        content: response,
        sender: 'ai',
        timestamp: new Date()
      }
      setChatMessages(prev => [...prev, aiMessage])
      setIsChatLoading(false)
    }, 1000)
  }, [chatInput, activeTool, uploadedFiles.length])

  // Remove file
  const removeFile = useCallback((fileId: string) => {
    setUploadedFiles(prev => {
      const fileToRemove = prev.find(f => f.id === fileId)
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.url)
      }
      const updated = prev.filter(f => f.id !== fileId)
      onFilesChange?.(updated.length > 0)
      return updated
    })
  }, [onFilesChange])

  // Show Interior Designer when interior-design tool is active
  if (activeTool === 'interior-design') {
    return <AIInteriorDesigner />
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 relative">
      {/* Upload Area */}
      <div className="flex-1 p-8">
        <div
          className={`h-full border-2 border-dashed rounded-2xl transition-all cursor-pointer ${
            isDragging 
              ? 'border-blue-500 bg-blue-50' 
              : uploadedFiles.length > 0
              ? 'border-gray-300 bg-white'
              : 'border-gray-300 bg-gray-50 hover:border-gray-400'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploadedFiles.length > 0 ? (
            // File Grid
            <div className="h-full p-6 overflow-y-auto">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {uploadedFiles.map((file) => (
                  <div key={file.id} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border">
                      {file.type === 'image' ? (
                        <img
                          src={file.url}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removeFile(file.id)
                      }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                    <p className="text-xs text-gray-600 mt-2 truncate">{file.name}</p>
                  </div>
                ))}
                
                {/* Add More Button */}
                <div 
                  className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    fileInputRef.current?.click()
                  }}
                >
                  <div className="text-center">
                    <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                    <span className="text-xs text-gray-500">Add More</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Empty State
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Upload className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">
                  {isDragging ? 'Drop your files here' : 'Upload your files'}
                </h3>
                <p className="text-gray-500 mb-6">
                  Drag and drop images or videos, or click to browse
                </p>
                <div className="flex items-center justify-center gap-4 text-sm text-gray-400">
                  <span>Images: JPG, PNG, WebP</span>
                  <span>•</span>
                  <span>Videos: MP4, MOV</span>
                  <span>•</span>
                  <span>Max: 100MB</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
          className="hidden"
        />
      </div>

      {/* Chat Interface - Extended height for better alignment */}
      <div className="border-t border-gray-200 bg-white flex flex-col" style={{ minHeight: '180px' }}>
        {/* Chat Messages */}
        {chatMessages.length > 0 && (
          <div className="max-h-40 overflow-y-auto p-4 space-y-3">
            {chatMessages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                    message.sender === 'user'
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {isChatLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-3 py-2 rounded-lg">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Spacer to push input to bottom */}
        <div className="flex-1"></div>

        {/* Chat Input - Positioned at bottom with extra padding */}
        <div className="p-6 border-t border-gray-100 bg-white">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-gray-600 h-12 w-12"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            <Input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleChatSend()}
              placeholder="Ask AI anything about your files..."
              className="flex-1 border-0 bg-gray-50 focus:bg-white transition-colors h-12 rounded-lg"
            />
            <Button
              onClick={handleChatSend}
              disabled={!chatInput.trim() || isChatLoading}
              size="sm"
              className="bg-black text-white hover:bg-gray-800 h-12 px-4 rounded-lg"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 