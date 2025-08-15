"use client"

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react'
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
  const { user } = useAuth()
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [isChatLoading, setIsChatLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Refs for high-FPS drag visuals and composite blur without React re-renders
  const dropZoneRef = useRef<HTMLDivElement | null>(null)
  const compositeBlurRef = useRef<HTMLDivElement | null>(null)
  const isDraggingRef = useRef<boolean>(false)
  const rafRef = useRef<number | null>(null)

  // Pre-rendered glass rasters (idle vs interacting) to avoid live backdrop blur during interaction
  const idleGlassUrlRef = useRef<string | null>(null)
  const interactingGlassUrlRef = useRef<string | null>(null)

  // Helper: pre-render a subtle glass texture
  const renderGlassState = useCallback((opts: { width: number; height: number; intensity: number; hueShift: number }) => {
    const { width, height, intensity, hueShift } = opts
    // Pre-render on a small in-memory canvas; this is cheap and avoids per-frame backdrop blur work
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
    if (!ctx) return ''
    // Base translucent gradient
    const g = ctx.createLinearGradient(0, 0, width, height)
    g.addColorStop(0, `hsla(${200 + hueShift}, 100%, 95%, ${0.10 + intensity * 0.05})`)
    g.addColorStop(1, `hsla(${210 + hueShift}, 80%, 88%, ${0.08 + intensity * 0.05})`)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, width, height)
    // Subtle noise to break banding and approximate frosted texture
    const noiseDensity = Math.max(60, Math.min(140, Math.floor(100 + intensity * 60)))
    const noiseAlpha = 0.04 + intensity * 0.04
    const imgData = ctx.createImageData(width, height)
    for (let i = 0; i < width * height * 4; i += 4) {
      const v = Math.random() * 255
      imgData.data[i] = v
      imgData.data[i + 1] = v
      imgData.data[i + 2] = v
      imgData.data[i + 3] = noiseAlpha * 255
    }
    ctx.putImageData(imgData, 0, 0)
    // Soft vignette for depth
    const radial = ctx.createRadialGradient(width * 0.5, height * 0.4, width * 0.1, width * 0.5, height * 0.5, width * 0.7)
    radial.addColorStop(0, 'rgba(255,255,255,0)')
    radial.addColorStop(1, `rgba(255,255,255,${0.08 + intensity * 0.06})`)
    ctx.fillStyle = radial
    ctx.fillRect(0, 0, width, height)
    // Convert to data URL for CSS background-image usage
    try {
      const dataUrl = canvas.toDataURL('image/png') || ''
      return dataUrl
    } catch {
      return ''
    }
  }, [])

  // Initialize composite blur overlay and pre-rendered glass backgrounds once
  useEffect(() => {
    const overlay = compositeBlurRef.current
    if (!overlay) return
    // Pre-render two states. Kept small and scaled via CSS to preserve memory, OK for subtle texture
    idleGlassUrlRef.current = renderGlassState({ width: 320, height: 320, intensity: 0.6, hueShift: 0 })
    interactingGlassUrlRef.current = renderGlassState({ width: 320, height: 320, intensity: 1.0, hueShift: 8 })
    overlay.style.setProperty('--glass-bg', `url(${idleGlassUrlRef.current || ''})`)
    // Default: idle visual
    overlay.setAttribute('data-state', 'idle')
    // Optional: disable backdrop-filter entirely and rely on pre-rendered raster for max FPS
    if (process.env.NEXT_PUBLIC_DISABLE_BACKDROP === '1') {
      overlay.style.backdropFilter = 'none'
      ;(overlay.style as any).WebkitBackdropFilter = 'none'
    }

    // If OffscreenCanvas is available, upgrade rasters asynchronously to object URLs rendered off-thread
    let urlsToRevoke: string[] = []
    const tryOffscreen = async () => {
      try {
        // @ts-ignore
        if (typeof OffscreenCanvas === 'undefined') return
        // @ts-ignore
        const idleCanvas = new OffscreenCanvas(320, 320)
        const idleCtx = idleCanvas.getContext('2d') as OffscreenCanvasRenderingContext2D
        if (!idleCtx) return
        const draw = (ctx: OffscreenCanvasRenderingContext2D, intensity: number, hueShift: number) => {
          const width = 320, height = 320
          const g = ctx.createLinearGradient(0, 0, width, height)
          g.addColorStop(0, `hsla(${200 + hueShift}, 100%, 95%, ${0.10 + intensity * 0.05})`)
          g.addColorStop(1, `hsla(${210 + hueShift}, 80%, 88%, ${0.08 + intensity * 0.05})`)
          ctx.fillStyle = g as any
          ctx.fillRect(0, 0, width, height)
          const noiseAlpha = 0.04 + intensity * 0.04
          const imgData = ctx.createImageData(width, height)
          for (let i = 0; i < width * height * 4; i += 4) {
            const v = Math.random() * 255
            imgData.data[i] = v
            imgData.data[i + 1] = v
            imgData.data[i + 2] = v
            imgData.data[i + 3] = noiseAlpha * 255
          }
          ctx.putImageData(imgData, 0, 0)
          const radial = ctx.createRadialGradient(width * 0.5, height * 0.4, width * 0.1, width * 0.5, height * 0.5, width * 0.7)
          radial.addColorStop(0, 'rgba(255,255,255,0)')
          radial.addColorStop(1, `rgba(255,255,255,${0.08 + intensity * 0.06})`)
          ctx.fillStyle = radial as any
          ctx.fillRect(0, 0, width, height)
        }
        draw(idleCtx, 0.6, 0)
        const idleBlob = await (idleCanvas as any).convertToBlob({ type: 'image/png' })
        const idleUrl = URL.createObjectURL(idleBlob)
        urlsToRevoke.push(idleUrl)
        idleGlassUrlRef.current = idleUrl

        // interacting
        // @ts-ignore
        const activeCanvas = new OffscreenCanvas(320, 320)
        const activeCtx = activeCanvas.getContext('2d') as OffscreenCanvasRenderingContext2D
        if (activeCtx) {
          draw(activeCtx, 1.0, 8)
          const activeBlob = await (activeCanvas as any).convertToBlob({ type: 'image/png' })
          const activeUrl = URL.createObjectURL(activeBlob)
          urlsToRevoke.push(activeUrl)
          interactingGlassUrlRef.current = activeUrl
        }

        // Apply upgraded idle background
        overlay.style.setProperty('--glass-bg', `url(${idleGlassUrlRef.current || ''})`)
      } catch {
        // Ignore; fallback rasters already set
      }
    }
    tryOffscreen()

    return () => {
      urlsToRevoke.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [renderGlassState])

  // Maintain composite overlay clip region to limit paint work to the drop zone
  const updateOverlayClip = useCallback(() => {
    const overlay = compositeBlurRef.current
    const target = dropZoneRef.current
    if (!overlay || !target) return
    const rect = target.getBoundingClientRect()
    const r = 24
    // Translate viewport rect to overlay local using CSS variables; using both inset and border-radius via clip-path
    overlay.style.setProperty('--clip-top', `${rect.top}px`)
    overlay.style.setProperty('--clip-left', `${rect.left}px`)
    overlay.style.setProperty('--clip-right', `${window.innerWidth - rect.right}px`)
    overlay.style.setProperty('--clip-bottom', `${window.innerHeight - rect.bottom}px`)
    overlay.style.setProperty('--clip-radius', `${r}px`)
  }, [])

  useEffect(() => {
    updateOverlayClip()
    const onResize = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(updateOverlayClip)
    }
    window.addEventListener('resize', onResize, { passive: true })
    window.addEventListener('scroll', onResize, { passive: true })
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onResize)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [updateOverlayClip])

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
    isDraggingRef.current = false
    const dz = dropZoneRef.current
    if (dz) dz.removeAttribute('data-dragging')
    const overlay = compositeBlurRef.current
    if (overlay) {
      overlay.setAttribute('data-state', 'idle')
      overlay.style.setProperty('--glass-bg', `url(${idleGlassUrlRef.current || ''})`)
    }
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

  // Optional: accept pre-selected media from /library via sessionStorage
  useEffect(() => {
    try {
      const payload = typeof window !== 'undefined' ? sessionStorage.getItem('workflowSelectedMedia') : null
      if (!payload) return
      const items: Array<{ id: string; url: string; type: 'image' | 'video'; name: string; size?: number }> = JSON.parse(payload)
      if (Array.isArray(items) && items.length > 0) {
        const mapped: UploadedFile[] = items.map((it) => ({
          id: it.id,
          file: new File([], it.name || 'remote'),
          url: it.url,
          type: it.type,
          name: it.name || 'remote',
          size: it.size || 0
        }))
        setUploadedFiles(mapped)
        onFilesChange?.(mapped.length > 0)
      }
      sessionStorage.removeItem('workflowSelectedMedia')
    } catch {
      // ignore
    }
  }, [onFilesChange])

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    // Enter drag mode: suspend transitions/animations globally for ultra-low latency
    if (typeof document !== 'undefined' && !document.body.classList.contains('drag-mode')) {
      document.body.classList.add('drag-mode')
    }
    if (!isDraggingRef.current) {
      isDraggingRef.current = true
      const dz = dropZoneRef.current
      if (dz) dz.setAttribute('data-dragging', 'true')
      const overlay = compositeBlurRef.current
      if (overlay) {
        overlay.setAttribute('data-state', 'interacting')
        overlay.style.setProperty('--glass-bg', `url(${interactingGlassUrlRef.current || ''})`)
      }
    }
  }, [])

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    isDraggingRef.current = false
    const dz = dropZoneRef.current
    if (dz) dz.removeAttribute('data-dragging')
    const overlay = compositeBlurRef.current
    if (overlay) {
      overlay.setAttribute('data-state', 'idle')
      overlay.style.setProperty('--glass-bg', `url(${idleGlassUrlRef.current || ''})`)
    }
    if (typeof document !== 'undefined' && document.body.classList.contains('drag-mode')) {
      document.body.classList.remove('drag-mode')
    }
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
      chatTimeoutRef.current = null
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

  // Enhanced page transitions with AnimatePresence
  return (
    <AnimatePresence mode="wait">
      {activeTool === 'interior-design' && (
        <motion.div
          key="interior-design"
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={pageTransition}
        >
          {React.createElement(AIInteriorDesigner as unknown as React.ComponentType)}
        </motion.div>
      )}

      {activeTool === 'video-edit' && (
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

      {activeTool === 'image-generation' && (
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

      {activeTool === 'video-merger' && (
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

      {activeTool === 'video-editor' && (
        <motion.div
          key="video-editor"
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={pageTransition}
        >
          {(() => {
            // Ensure clean page background class only (no dotted overlay)
            if (typeof document !== 'undefined') {
              document.documentElement.classList.add('ai-studio-video-editor')
              document.body.classList.add('ai-studio-video-editor')
            }
            const bgStyle = { background: 'transparent' } as React.CSSProperties
            return (
              <main className="relative min-h-screen w-full overflow-hidden" style={bgStyle}>
                <WorkflowCanvas className="absolute inset-0 h-full w-full will-change-transform" />
              </main>
            )
          })()}
        </motion.div>
      )}

      {activeTool === 'content-create' && (
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

      {!activeTool && (
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
        <div className="relative h-full">
          {/* Composite blur overlay: one layer serving all glass within the drop zone to reduce multiple backdrop passes */}
          <div
            ref={compositeBlurRef}
            className="glass-composite-layer paint-clip"
            aria-hidden="true"
          />
          <div
            ref={dropZoneRef}
            className={`relative z-10 h-full rounded-3xl transition-transform duration-200 cursor-pointer glass-shimmer glass-panel-opt border-2 border-dashed border-white/30 shadow-xl`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragEnter={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
          {uploadedFiles.length > 0 ? (
            // File Grid
            <div className="h-full p-6 overflow-y-auto cv-auto" style={{ containIntrinsicSize: '800px 600px' }}>
              <div className="uploaded-files-grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4" data-media-cards data-workflow-cards>
                {uploadedFiles.map((file) => (
                  <div key={file.id} className="relative group">
                    <div className="aspect-square rounded-2xl overflow-hidden glass-panel-opt border border-white/25 shadow-lg transition-all duration-200">
                      {file.type === 'image' ? (
                        <img
                          src={file.url}
                          alt={file.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          decoding="async"
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
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-600/90 active:scale-95 shadow-lg border border-white/20"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                    <p className="text-xs text-slate-700 mt-2 truncate font-medium">{file.name}</p>
                  </div>
                ))}
                
                {/* Add More Button */}
                <div 
                  className="aspect-square rounded-2xl border-2 border-dashed border-white/30 flex items-center justify-center glass-panel-opt hover:border-white/40 transition-all duration-200 cursor-pointer active:scale-95"
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
                <div className="w-24 h-24 glass-panel-opt border border-white/25 shadow-2xl rounded-3xl flex items-center justify-center mx-auto mb-6 transition-all duration-200 liquid-float">
                  <Upload className="w-10 h-10 text-slate-700" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2 drop-shadow-sm">
                  Upload your files
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
      </div>

      {/* Chat Interface - Extended height for better alignment */}
      <div className="border-t border-white/20 glass-panel-opt flex flex-col" style={{ minHeight: '180px' }}>
        {/* Chat Messages */}
        {chatMessages.length > 0 && (
          <div className="max-h-40 overflow-y-auto p-4 space-y-3 cv-auto" style={{ containIntrinsicSize: '600px 200px' }}>
            {chatMessages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs px-3 py-2 rounded-xl text-sm transition-all duration-200 ${
                    message.sender === 'user'
                      ? 'bg-slate-800 text-white shadow-lg'
                      : 'bg-white/60 text-slate-800 border border-white/20 shadow-lg'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {isChatLoading && (
              <div className="flex justify-start">
                <div className="bg-white/60 border border-white/20 shadow-lg px-3 py-2 rounded-xl">
                  <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Spacer to push input to bottom */}
        <div className="flex-1"></div>

        {/* Chat Input - Positioned at bottom with extra padding */}
        <div className="p-6 border-t border-white/20 bg-white/60">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-500 hover:text-slate-700 bg-white/40 hover:bg-white/80 border border-white/20 transition-all duration-200 active:scale-95 h-12 w-12 rounded-xl"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            <Input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleChatSend()}
              placeholder="Ask AI anything about your files..."
              className="flex-1 border-0 bg-white/40 focus:bg-white/80 transition-all duration-200 h-12 rounded-xl text-slate-800 placeholder:text-slate-500"
            />
            <Button
              onClick={handleChatSend}
              disabled={!chatInput.trim() || isChatLoading}
              size="sm"
              className={`h-12 px-4 rounded-xl transition-all duration-200 active:scale-95 ${
                !chatInput.trim() || isChatLoading
                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed opacity-50'
                  : 'bg-slate-800 text-white hover:bg-slate-700 shadow-lg'
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