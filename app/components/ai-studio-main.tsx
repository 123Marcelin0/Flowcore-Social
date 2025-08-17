"use client"

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
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
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
import { AIInteriorDesigner } from './ai-interior-designer'
import { AIStudioVideoGenerator } from './ai-studio-video-generator'
import { AIStudioImageGenerator } from './ai-studio-image-generator'
import { AIStudioVideoMerger } from './ai-studio-video-merger'
import { AIStudioVideoEditor } from './ai-studio-video-editor'
import WorkflowCanvas from '@/components/glassmorphic-workflow-canvas'
import { ContentGallery } from './content-gallery'
import { cn } from '@/lib/utils'

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

// Enhanced page transition variants for liquid glass style
const pageVariants = {
  initial: {
    y: 20,
    opacity: 0,
    scale: 0.98
  },
  animate: {
    y: 0,
    opacity: 1,
    scale: 1
  },
  exit: {
    y: -20,
    opacity: 0,
    scale: 0.98
  }
}

const pageTransition = {
  duration: 0.6,
  ease: [0.4, 0, 0.2, 1] as [number, number, number, number]
}

export function AIStudioMain({ 
  activeTool, 
  isProcessing, 
  onFilesChange, 
  onProcessingComplete 
}: AIStudioMainProps) {
  const pathname = usePathname()
  // derive tool from URL if present
  const deepLinkedTool = useMemo(() => {
    if (!pathname.startsWith('/ai-studio/')) return null
    const seg = pathname.split('/')[2] || null
    return seg as string | null
  }, [pathname])
  const effectiveTool = activeTool ?? deepLinkedTool
  const { user } = useAuth()
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [isChatLoading, setIsChatLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (chatTimeoutRef.current) {
        clearTimeout(chatTimeoutRef.current)
      }
    }
  }, [])

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

      try {
        // Upload to database via API
        const formData = new FormData()
        formData.append('file', file)
        formData.append('fileType', isImage ? 'image' : 'video')

        const response = await fetch('/api/media-upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
          },
          body: formData
        })

        const result = await response.json()

        if (!result.success) {
          toast.error(`Upload failed: ${result.error}`)
          continue
        }

        const uploadedFile: UploadedFile = {
          id: result.data.id,
          file,
          url: result.data.storage_url || result.data.public_url,
          type: isImage ? 'image' : 'video',
          name: file.name,
          size: file.size
        }

        newFiles.push(uploadedFile)
        toast.success(`${file.name} uploaded successfully`)
      } catch (error) {
        console.error('Upload error:', error)
        toast.error(`Failed to upload ${file.name}`)
      }
    }

    setUploadedFiles(prev => {
      const updated = [...prev, ...newFiles]
      onFilesChange?.(updated.length > 0)
      return updated
    })
  }, [user])

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
          content: `Processing complete! Your ${uploadedFiles.length} file(s) have been processed using ${effectiveTool}. Results are ready for download.`,
          sender: 'ai',
          timestamp: new Date()
        }
        setChatMessages(prev => [...prev, aiMessage])
        toast.success('Processing completed!')
      }, 3000)
      
      return () => clearTimeout(timer)
    }
  }, [isProcessing, onProcessingComplete, uploadedFiles.length, effectiveTool])

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

    // Clear any existing timeout
    if (chatTimeoutRef.current) {
      clearTimeout(chatTimeoutRef.current)
    }

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
    chatTimeoutRef.current = setTimeout(() => {
      let response = "I can help you with image enhancement, interior design, video editing, and content creation. What would you like to work on?"
      
      if (effectiveTool) {
        const toolNames = {
          'interior-design': 'interior design',
          'image-enhance': 'image enhancement', 
          'video-edit': 'video editing',
          'content-create': 'content creation'
        }
        response = `Great! I see you've selected ${toolNames[effectiveTool as keyof typeof toolNames] || effectiveTool}. ${uploadedFiles.length > 0 ? `You have ${uploadedFiles.length} file(s) ready to process.` : 'Upload some files and I can help you get started!'}`
      }
      
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        content: response,
        sender: 'ai',
        timestamp: new Date()
      }
      setChatMessages(prev => [...prev, aiMessage])
      setIsChatLoading(false)
      chatTimeoutRef.current = null
    }, 1000)
  }, [chatInput, effectiveTool, uploadedFiles.length])

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

  // Enhanced page transitions with AnimatePresence
  return (
    <AnimatePresence mode="wait">
      {effectiveTool === 'interior-design' && (
        <motion.div
          key="interior-design"
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={pageTransition}
        >
          <AIInteriorDesigner />
        </motion.div>
      )}

      {effectiveTool === 'video-edit' && (
        <motion.div
          key="video-edit"
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={pageTransition}
        >
          <AIStudioVideoGenerator />
        </motion.div>
      )}

      {effectiveTool === 'image-generation' && (
        <motion.div
          key="image-generation"
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={pageTransition}
        >
          <AIStudioImageGenerator />
        </motion.div>
      )}

      {effectiveTool === 'video-merger' && (
        <motion.div
          key="video-merger"
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={pageTransition}
        >
          <AIStudioVideoMerger />
        </motion.div>
      )}

      {effectiveTool === 'video-editor' && (
        <motion.div
          key="video-editor"
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={pageTransition}
        >
          {(() => {
            // Ensure full-page dotted background is applied to html/body while editor is active
            if (typeof document !== 'undefined') {
              document.documentElement.classList.add('ai-studio-video-editor')
              document.body.classList.add('ai-studio-video-editor')
            }
            const bgStyle = {
              background:
                "radial-gradient(1200px 800px at 70% 10%, rgba(0,0,0,0.04), transparent 45%), radial-gradient(1000px 600px at 20% 80%, rgba(0,0,0,0.045), transparent 50%), transparent",
            } as React.CSSProperties
            const dotLayerStyle = {
              backgroundImage:
                "radial-gradient(#d4d4d8 1.2px, transparent 1.2px), radial-gradient(#d4d4d8 1.2px, transparent 1.2px)",
              backgroundSize: "22px 22px,22px 22px",
              backgroundPosition: "0 0,11px 11px",
              opacity: 0.6,
            } as React.CSSProperties
            return (
              <main className="relative min-h-screen w-full overflow-hidden">
                <section
                  className={cn(
                    "relative m-2 h-[calc(100vh-16px)] rounded-[28px] border",
                    "border-black/5 bg-white/70 shadow-[0_20px_60px_rgba(0,0,0,0.08)] backdrop-blur-xl",
                  )}
                  style={bgStyle}
                >
                  <div className="absolute inset-0 rounded-[28px]" style={dotLayerStyle} />
                  <div className="absolute inset-0 rounded-[28px]">
                    <WorkflowCanvas className="h-full w-full" />
                  </div>
                </section>
              </main>
            )
          })()}
        </motion.div>
      )}

      {effectiveTool === 'content-create' && (
        <motion.div
          key="content-create"
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={pageTransition}
        >
          <ContentGallery />
        </motion.div>
      )}

      {!effectiveTool && (
        <motion.div
          key="default-upload"
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={pageTransition}
          className="flex flex-col h-screen relative w-full"
        >
      {/* Upload Area */}
      <div className="flex-1 p-8">
        <div
          className={`h-full rounded-3xl transition-all duration-200 cursor-pointer glass-shimmer ${
            isDragging 
              ? 'glass-panel-strong border-2 border-dashed border-white/40 shadow-2xl' 
              : uploadedFiles.length > 0
              ? 'glass-panel-strong border border-white/25 shadow-2xl'
              : 'glass-panel border-2 border-dashed border-white/30 hover:glass-panel-strong hover:border-white/40 shadow-xl'
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
                    <div className="aspect-square rounded-2xl overflow-hidden glass-panel border border-white/25 shadow-lg transition-all duration-200 hover:glass-panel-strong">
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
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500/90 backdrop-blur-lg rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-600/90 active:scale-95 shadow-lg border border-white/20"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                    <p className="text-xs text-slate-700 mt-2 truncate font-medium">{file.name}</p>
                  </div>
                ))}
                
                {/* Add More Button */}
                <div 
                  className="aspect-square rounded-2xl border-2 border-dashed border-white/30 flex items-center justify-center glass-panel hover:glass-panel-strong hover:border-white/40 transition-all duration-200 cursor-pointer active:scale-95"
                  onClick={(e) => {
                    e.stopPropagation()
                    fileInputRef.current?.click()
                  }}
                >
                  <div className="text-center">
                    <Upload className="w-5 h-5 text-slate-700 mx-auto mb-2" />
                    <span className="text-xs text-slate-700 font-medium">Add More</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Empty State
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 glass-panel-strong border border-white/25 shadow-2xl rounded-3xl flex items-center justify-center mx-auto mb-6 transition-all duration-200 hover:glass-panel-strong liquid-float">
                  <Upload className="w-10 h-10 text-slate-700" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2 drop-shadow-sm">
                  {isDragging ? 'Drop your files here' : 'Upload your files'}
                </h3>
                <p className="text-slate-700 mb-6 drop-shadow-sm">
                  Drag and drop images or videos, or click to browse
                </p>
                <div className="flex items-center justify-center gap-4 text-sm text-slate-600 drop-shadow-sm">
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
      <div className="border-t border-white/20 glass-panel-strong flex flex-col" style={{ minHeight: '180px' }}>
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

        {/* Spacer to push input to bottom */}
        <div className="flex-1"></div>

        {/* Chat Input - Positioned at bottom with extra padding */}
        <div className="p-6 border-t border-white/20 backdrop-blur-xl bg-white/60">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-500 hover:text-slate-700 backdrop-blur-xl bg-white/40 hover:bg-white/80 border border-white/20 transition-all duration-200 active:scale-95 h-12 w-12 rounded-xl"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            <Input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleChatSend()}
              placeholder="Ask AI anything about your files..."
              className="flex-1 border-0 backdrop-blur-xl bg-white/40 focus:bg-white/80 transition-all duration-200 h-12 rounded-xl text-slate-800 placeholder:text-slate-500"
            />
            <Button
              onClick={handleChatSend}
              disabled={!chatInput.trim() || isChatLoading}
              size="sm"
              className={`h-12 px-4 rounded-xl transition-all duration-200 active:scale-95 ${
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
        </motion.div>
      )}
    </AnimatePresence>
  )
} 