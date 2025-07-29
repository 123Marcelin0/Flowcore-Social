"use client"

import React, { useState, useRef, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Upload, 
  Home, 
  ImageIcon, 
  VideoIcon, 
  FileText,
  Wand2,
  Scissors,
  Send,
  Paperclip,
  X,
  Play,
  Download,
  Settings,
  Loader2
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { toast } from 'sonner'

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

type ActiveTool = 'interior-design' | 'image-enhance' | 'video-edit' | 'content-create' | null

export function AIStudioClean() {
  const { user } = useAuth()
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [activeTool, setActiveTool] = useState<ActiveTool>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [isChatLoading, setIsChatLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatInputRef = useRef<HTMLInputElement>(null)

  // Tool definitions
  const tools = [
    {
      id: 'interior-design' as ActiveTool,
      icon: Home,
      label: 'Interior',
      color: 'text-emerald-600 hover:bg-emerald-50'
    },
    {
      id: 'image-enhance' as ActiveTool,
      icon: ImageIcon,
      label: 'Enhance',
      color: 'text-blue-600 hover:bg-blue-50'
    },
    {
      id: 'video-edit' as ActiveTool,
      icon: VideoIcon,
      label: 'Video',
      color: 'text-purple-600 hover:bg-purple-50'
    },
    {
      id: 'content-create' as ActiveTool,
      icon: FileText,
      label: 'Content',
      color: 'text-orange-600 hover:bg-orange-50'
    }
  ]

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

    setUploadedFiles(prev => [...prev, ...newFiles])
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

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
  }, [])

  // Process files with selected tool
  const handleProcess = useCallback(async () => {
    if (!activeTool || uploadedFiles.length === 0) {
      toast.error('Select a tool and upload files first')
      return
    }

    setIsProcessing(true)
    
    // Simulate processing
    setTimeout(() => {
      setIsProcessing(false)
      toast.success('Processing completed!')
      
      // Add AI message about results
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        content: `I've processed your ${uploadedFiles.length} file(s) using ${activeTool}. The results are ready for download.`,
        sender: 'ai',
        timestamp: new Date()
      }
      setChatMessages(prev => [...prev, aiMessage])
    }, 3000)
  }, [activeTool, uploadedFiles])

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
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        content: "I can help you with image enhancement, interior design, video editing, and content creation. What would you like to work on?",
        sender: 'ai',
        timestamp: new Date()
      }
      setChatMessages(prev => [...prev, aiMessage])
      setIsChatLoading(false)
    }, 1000)
  }, [chatInput])

  // Remove file
  const removeFile = useCallback((fileId: string) => {
    setUploadedFiles(prev => {
      const fileToRemove = prev.find(f => f.id === fileId)
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.url)
      }
      return prev.filter(f => f.id !== fileId)
    })
  }, [])

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Action Toolbar Sidebar */}
      <div className="w-20 bg-white border-r border-gray-200 flex flex-col">
        {/* Tools */}
        <div className="flex-1 py-6">
          <div className="space-y-2 px-3">
            {tools.map((tool) => (
              <Button
                key={tool.id}
                variant="ghost"
                size="sm"
                className={`w-14 h-14 flex flex-col gap-1 rounded-xl transition-all ${
                  activeTool === tool.id 
                    ? 'bg-gray-100 shadow-sm' 
                    : tool.color
                }`}
                onClick={() => setActiveTool(tool.id)}
              >
                <tool.icon className="w-5 h-5" />
                <span className="text-xs font-medium">{tool.label}</span>
              </Button>
            ))}
          </div>

          {/* Process Button */}
          {activeTool && uploadedFiles.length > 0 && (
            <div className="px-3 mt-6">
              <Button
                onClick={handleProcess}
                disabled={isProcessing}
                className="w-14 h-14 rounded-xl bg-black text-white hover:bg-gray-800 flex flex-col gap-1"
              >
                {isProcessing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Wand2 className="w-5 h-5" />
                )}
                <span className="text-xs">
                  {isProcessing ? 'Process' : 'Start'}
                </span>
              </Button>
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="p-3 border-t border-gray-200">
          <Button
            variant="ghost"
            size="sm"
            className="w-14 h-14 flex flex-col gap-1 rounded-xl text-gray-600 hover:bg-gray-50"
          >
            <Settings className="w-5 h-5" />
            <span className="text-xs">Settings</span>
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
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

        {/* Chat Interface */}
        <div className="border-t border-gray-200 bg-white">
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

          {/* Chat Input */}
          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-gray-600"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              <Input
                ref={chatInputRef}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleChatSend()}
                placeholder="Ask AI anything about your files..."
                className="flex-1 border-0 bg-gray-50 focus:bg-white transition-colors"
              />
              <Button
                onClick={handleChatSend}
                disabled={!chatInput.trim() || isChatLoading}
                size="sm"
                className="bg-black text-white hover:bg-gray-800"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 