"use client"

import React, { useState, useRef, useCallback, useEffect } from 'react'
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

  // Cleanup object URLs on component unmount
  useEffect(() => {
    return () => {
      uploadedFiles.forEach(file => {
        URL.revokeObjectURL(file.url)
      })
    }
  }, [uploadedFiles])

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
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Action Toolbar Sidebar */}
      <div className="w-20 backdrop-blur-xl bg-white/60 border-r border-white/20 flex flex-col shadow-xl">
        {/* Tools */}
        <div className="flex-1 py-6">
          <div className="space-y-2 px-3">
            {tools.map((tool) => (
              <Button
                key={tool.id}
                variant="ghost"
                size="sm"
                className={`w-14 h-14 flex flex-col gap-1 rounded-xl transition-all duration-200 ${
                  activeTool === tool.id 
                    ? 'backdrop-blur-xl bg-white/90 shadow-lg border border-white/30' 
                    : 'backdrop-blur-xl bg-white/40 hover:bg-white/80 border border-white/20'
                } active:scale-95`}
                onClick={() => setActiveTool(tool.id)}
              >
                <tool.icon className="w-4 h-4 text-slate-700" />
                <span className="text-xs font-medium text-slate-700">{tool.label}</span>
              </Button>
            ))}
          </div>

          {/* Process Button */}
          {activeTool && uploadedFiles.length > 0 && (
            <div className="px-3 mt-6">
              <Button
                onClick={handleProcess}
                disabled={isProcessing}
                className={`w-14 h-14 rounded-xl flex flex-col gap-1 transition-all duration-200 active:scale-95 ${
                  isProcessing 
                    ? 'backdrop-blur-xl bg-slate-200 text-slate-500 cursor-not-allowed opacity-50' 
                    : 'backdrop-blur-xl bg-slate-800 text-white hover:bg-slate-700 shadow-lg'
                }`}
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
                <span className="text-xs">
                  {isProcessing ? 'Processing' : 'Start'}
                </span>
              </Button>
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="p-3 border-t border-white/20">
          <Button
            variant="ghost"
            size="sm"
            className="w-14 h-14 flex flex-col gap-1 rounded-xl backdrop-blur-xl bg-white/40 hover:bg-white/80 border border-white/20 transition-all duration-200 active:scale-95"
          >
            <Settings className="w-4 h-4 text-slate-700" />
            <span className="text-xs font-medium text-slate-700">Settings</span>
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Upload Area */}
        <div className="flex-1 p-8">
          <div
            className={`h-full rounded-2xl transition-all duration-200 cursor-pointer ${
              isDragging 
                ? 'backdrop-blur-xl bg-blue-100/80 border-2 border-dashed border-blue-400 shadow-lg' 
                : uploadedFiles.length > 0
                ? 'backdrop-blur-xl bg-white/60 border border-white/20 shadow-xl'
                : 'backdrop-blur-xl bg-white/40 border-2 border-dashed border-white/30 hover:bg-white/60 hover:border-slate-300/60 shadow-lg'
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
                      <div className="aspect-square rounded-xl overflow-hidden backdrop-blur-xl bg-white/40 border border-white/20 shadow-lg transition-all duration-200 hover:bg-white/60">
                        {file.type === 'image' ? (
                          <img
                            src={file.url}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Play className="w-6 h-6 text-slate-500" />
                          </div>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeFile(file.id)
                        }}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                        aria-label={`Remove ${file.name}`}
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                      <p className="text-xs text-slate-600 mt-2 truncate">{file.name}</p>
                    </div>
                  ))}
                  
                  {/* Add More Button */}
                  <div 
                    className="aspect-square rounded-xl border-2 border-dashed border-white/30 flex items-center justify-center backdrop-blur-xl bg-white/30 hover:bg-white/60 hover:border-slate-300/60 transition-all duration-200 cursor-pointer active:scale-95"
                    onClick={(e) => {
                      e.stopPropagation()
                      fileInputRef.current?.click()
                    }}
                  >
                    <div className="text-center">
                      <Upload className="w-5 h-5 text-slate-500 mx-auto mb-2" />
                      <span className="text-xs text-slate-600 font-medium">Add More</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Empty State
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 backdrop-blur-xl bg-white/60 border border-white/20 shadow-lg rounded-3xl flex items-center justify-center mx-auto mb-6 transition-all duration-200 hover:bg-white/80">
                    <Upload className="w-10 h-10 text-slate-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">
                    {isDragging ? 'Drop your files here' : 'Upload your files'}
                  </h3>
                  <p className="text-slate-600 mb-6">
                    Drag and drop images or videos, or click to browse
                  </p>
                  <div className="flex items-center justify-center gap-4 text-sm text-slate-500">
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
        <div className="border-t border-white/20 backdrop-blur-xl bg-white/60">
          {/* Chat Messages */}
          {chatMessages.length > 0 && (
            <div className="max-h-40 overflow-y-auto p-4 space-y-3">
              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs px-3 py-2 rounded-xl text-sm transition-all duration-200 ${
                      message.sender === 'user'
                        ? 'backdrop-blur-xl bg-slate-800 text-white shadow-lg'
                        : 'backdrop-blur-xl bg-white/60 text-slate-800 border border-white/20 shadow-lg'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="backdrop-blur-xl bg-white/60 border border-white/20 shadow-lg px-3 py-2 rounded-xl">
                    <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Chat Input */}
          <div className="p-4 border-t border-white/20">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-500 hover:text-slate-700 backdrop-blur-xl bg-white/40 hover:bg-white/80 border border-white/20 transition-all duration-200 active:scale-95 h-10 w-10 rounded-xl"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              <Input
                ref={chatInputRef}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleChatSend()}
                placeholder="Ask AI anything about your files..."
                className="flex-1 border-0 backdrop-blur-xl bg-white/40 focus:bg-white/80 transition-all duration-200 h-10 rounded-xl text-slate-800 placeholder:text-slate-500"
              />
              <Button
                onClick={handleChatSend}
                disabled={!chatInput.trim() || isChatLoading}
                size="sm"
                className={`h-10 w-10 rounded-xl transition-all duration-200 active:scale-95 ${
                  !chatInput.trim() || isChatLoading
                    ? 'backdrop-blur-xl bg-slate-200 text-slate-500 cursor-not-allowed opacity-50'
                    : 'backdrop-blur-xl bg-slate-800 text-white hover:bg-slate-700 shadow-lg'
                }`}
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