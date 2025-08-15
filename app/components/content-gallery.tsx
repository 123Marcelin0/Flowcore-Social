"use client"

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  Video, 
  Image as ImageIcon, 
  Play, 
  Download, 
  Edit3, 
  Eye, 
  Sparkles,
  FileImage,
  FileVideo,
  MoreHorizontal,
  Grid3X3,
  List,
  Filter,
  Search,
  RefreshCw,
  Zap,
  Clock,
  TrendingUp,
  Heart,
  MessageCircle,
  Share2,
  Loader2,
  X,
  Plus,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Settings,
  Upload
} from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { MediaPreviewModal } from './media-preview-modal'

interface MediaFile {
  id: string
  filename: string
  original_filename: string
  storage_url: string
  thumbnail_url?: string
  file_type: 'image' | 'video'
  file_size: number
  width?: number
  height?: number
  duration?: number
  processing_status: 'pending' | 'processing' | 'completed' | 'failed'
  optimization_status: 'pending' | 'optimized' | 'failed'
  created_at: string
  metadata?: any
}

interface Post {
  id: string
  title?: string
  content: string
  media_urls: string[]
  media_type: 'image' | 'video' | 'text' | 'carousel'
  status: 'draft' | 'scheduled' | 'published' | 'failed'
  published_at?: string
  likes: number
  comments_count: number
  shares: number
  reach: number
  impressions: number
  created_at: string
}

// Staggered entry animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: "easeOut" as const
    }
  }
}

// Interactive hover animations
const buttonHoverVariants = {
  scale: 1.02,
  transition: {
    type: "spring" as const,
    stiffness: 400,
    damping: 10
  }
}

const iconHoverVariants = {
  rotate: 10,
  scale: 1.1,
  transition: {
    type: "spring" as const,
    stiffness: 400,
    damping: 10
  }
}

export function ContentGallery() {
  const [activeView, setActiveView] = useState<'optimized' | 'raw'>('optimized')
  const [optimizedPosts, setOptimizedPosts] = useState<Post[]>([])
  const [rawMaterials, setRawMaterials] = useState<MediaFile[]>([])
  const [selectedItem, setSelectedItem] = useState<Post | MediaFile | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Media preview modal state
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [previewMedia, setPreviewMedia] = useState<MediaFile | null>(null)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 12
  const gridContainerRef = useRef<HTMLDivElement | null>(null)
  const [viewportHeight, setViewportHeight] = useState(0)
  const [rowHeight, setRowHeight] = useState(320) // approximate; adjust if card layout changes
  const [overscan, setOverscan] = useState(3)
  const dragStateRef = useRef<{ active: boolean; id: number; startX: number; startY: number; offsetX: number; offsetY: number; clone: HTMLElement | null; containerScrollTop: number } | null>(null)

  // Lightweight virtualization: only render rows likely visible
  const visibleSlice = useMemo(() => {
    const container = gridContainerRef.current
    if (!container) return { start: 0, end: itemsPerPage }
    const scrollTop = container.scrollTop
    const height = container.clientHeight || viewportHeight || 800
    const itemsPerRow = 4 // xl grid; degrade gracefully on smaller widths
    const total = (activeView === 'optimized' ? filteredOptimizedPosts.length : filteredRawMaterials.length)
    const rowStart = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan)
    const numRows = Math.ceil(height / rowHeight) + overscan * 2
    const start = Math.min(total, rowStart * itemsPerRow)
    const end = Math.min(total, start + numRows * itemsPerRow)
    return { start, end, itemsPerRow }
  }, [activeView, filteredOptimizedPosts.length, filteredRawMaterials.length, rowHeight, overscan, viewportHeight])

  const onScroll = useCallback(() => {
    const c = gridContainerRef.current
    if (!c) return
    // trigger memo recompute by updating viewport height state
    setViewportHeight(c.clientHeight)
  }, [])

  useEffect(() => {
    const c = gridContainerRef.current
    if (!c) return
    setViewportHeight(c.clientHeight)
    c.addEventListener('scroll', onScroll, { passive: true })
    const obs = new ResizeObserver(() => {
      setViewportHeight(c.clientHeight)
    })
    obs.observe(c)
    return () => {
      c.removeEventListener('scroll', onScroll)
      obs.disconnect()
    }
  }, [onScroll])

  // Feather drag (compositor-only) overlay for ultra-light movement feel
  const startFeatherDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault() // Prevent default touch behaviors
    e.stopPropagation() // Prevent event bubbling
    
    const target = e.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()
    const id = e.pointerId
    const startX = e.clientX
    const startY = e.clientY
    const offsetX = startX - rect.left
    const offsetY = startY - rect.top
    
    // Force immediate layer promotion for target
    target.style.willChange = 'transform'
    target.style.transform = 'translateZ(0)'
    
    const state = {
      active: true,
      id,
      startX,
      startY,
      offsetX,
      offsetY,
      clone: null as HTMLElement | null,
      containerScrollTop: gridContainerRef.current?.scrollTop || 0,
    }
    dragStateRef.current = state
    
    // Capture pointer for consistent events
    target.setPointerCapture?.(id)

    // Create highly optimized clone
    const clone = target.cloneNode(true) as HTMLElement
    clone.classList.add('feather-clone')
    
    // Zero-cost positioning setup
    const cloneStyle = clone.style
    cloneStyle.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 9999;
      width: ${rect.width}px;
      height: ${rect.height}px;
      will-change: transform;
      transform-origin: 0 0;
      transition: none;
      contain: layout paint style;
      isolation: isolate;
    `
    
    document.body.appendChild(clone)
    dragStateRef.current.clone = clone
    
    // Enter high-performance drag mode
    document.body.classList.add('drag-mode')
    document.body.style.userSelect = 'none'
    document.body.style.touchAction = 'none'
    target.style.cursor = 'grabbing'
    
    // Suppress click to prevent accidental activation
    const suppress = (clickEv: Event) => { 
      clickEv.stopPropagation() 
      clickEv.preventDefault() 
    }
    target.addEventListener('click', suppress, { once: true, capture: true })

    // Direct transform application - no calculations
    const apply = (cx: number, cy: number) => {
      const s = dragStateRef.current
      if (!s?.clone) return
      const x = cx - s.offsetX
      const y = cy - s.offsetY
      s.clone.style.transform = `translate3d(${x}px, ${y}px, 0)`
    }

    // Position immediately - no delay
    apply(startX, startY)

    // High-frequency event handlers
    const onMove = (ev: PointerEvent) => {
      ev.preventDefault()
      apply(ev.clientX, ev.clientY)
    }
    
    // Use pointerrawupdate for ultra-low latency when available
    const onRawUpdate = (ev: any) => {
      apply(ev.clientX, ev.clientY)
    }

    const endDrag = () => {
      const s = dragStateRef.current
      dragStateRef.current = null
      
      // Clean up all event listeners
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerrawupdate', onRawUpdate)
      window.removeEventListener('pointerup', endDrag)
      window.removeEventListener('pointercancel', endDrag)
      
      // Reset styles
      target.style.willChange = ''
      target.style.transform = ''
      target.style.cursor = ''
      document.body.style.userSelect = ''
      document.body.style.touchAction = ''
      
      // Remove clone and exit drag mode
      if (s?.clone) {
        s.clone.remove()
      }
      document.body.classList.remove('drag-mode')
    }

    // Register optimized event listeners with maximum frequency
    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerrawupdate', onRawUpdate, { passive: true })
    window.addEventListener('pointerup', endDrag, { passive: true, once: true })
    window.addEventListener('pointercancel', endDrag, { passive: true, once: true })
    
    // Force maximum refresh rate for this interaction (browser hint)
    if ('requestIdleCallback' in window) {
      // @ts-ignore
      window.requestIdleCallback(() => {}, { timeout: 1 })
    }
  }, [])
  
  // Selection state for raw materials
  const [selectedRawMaterialIds, setSelectedRawMaterialIds] = useState<Set<string>>(new Set())
  
  // Selection mode state
  const [isSelectionMode, setIsSelectionMode] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  // Filter posts to show only those not uploaded or planned
  const filteredOptimizedPosts = useMemo(() => {
    return optimizedPosts.filter(post => {
      const matchesSearch = searchQuery === '' || 
        (post.title && post.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        post.content.toLowerCase().includes(searchQuery.toLowerCase())
      
      // Show only posts that are not published, scheduled, or failed (i.e., only drafts)
      const isNotUploadedOrPlanned = post.status === 'draft'
      
      return matchesSearch && isNotUploadedOrPlanned
    })
  }, [optimizedPosts, searchQuery])

  // Filter raw materials
  const filteredRawMaterials = useMemo(() => {
    return rawMaterials.filter(file => {
      const matchesSearch = searchQuery === '' || 
        file.original_filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.filename.toLowerCase().includes(searchQuery.toLowerCase())
      
      return matchesSearch
    })
  }, [rawMaterials, searchQuery])

  // Pagination logic
  const paginatedOptimizedPosts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredOptimizedPosts.slice(startIndex, endIndex)
  }, [filteredOptimizedPosts, currentPage, itemsPerPage])

  const paginatedRawMaterials = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredRawMaterials.slice(startIndex, endIndex)
  }, [filteredRawMaterials, currentPage, itemsPerPage])

  // Calculate total pages
  const totalOptimizedPages = Math.ceil(filteredOptimizedPosts.length / itemsPerPage)
  const totalRawPages = Math.ceil(filteredRawMaterials.length / itemsPerPage)
  const totalPages = activeView === 'optimized' ? totalOptimizedPages : totalRawPages

  // Reset to page 1 when switching views or searching
  useEffect(() => {
    setCurrentPage(1)
  }, [activeView, searchQuery])

  const loadData = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Sample data with more realistic content - updated to include draft posts
      const samplePosts: Post[] = [
        {
          id: '1',
          title: 'Amazing Interior Transformation',
          content: 'Check out this incredible before and after transformation! Our team worked magic on this space.',
          media_urls: ['https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=600&fit=crop'],
          media_type: 'image',
          status: 'draft', // Changed from 'published' to 'draft'
          published_at: '2024-01-15T10:30:00Z',
          likes: 1247,
          comments_count: 89,
          shares: 45,
          reach: 15420,
          impressions: 18900,
          created_at: '2024-01-15T10:30:00Z'
        },
        {
          id: '2',
          title: 'Kitchen Renovation Process',
          content: 'Step-by-step kitchen renovation that will inspire you to transform your own space.',
          media_urls: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=600&fit=crop'],
          media_type: 'video',
          status: 'draft', // Changed from 'published' to 'draft'
          published_at: '2024-01-14T14:20:00Z',
          likes: 892,
          comments_count: 67,
          shares: 23,
          reach: 9870,
          impressions: 11200,
          created_at: '2024-01-14T14:20:00Z'
        },
        {
          id: '3',
          title: 'Modern Living Room Design',
          content: 'Contemporary living room with minimalist design and natural lighting.',
          media_urls: ['https://images.unsplash.com/photo-1618220179428-22790b461013?w=400&h=600&fit=crop'],
          media_type: 'image',
          status: 'draft', // Changed from 'published' to 'draft'
          published_at: '2024-01-13T09:15:00Z',
          likes: 2156,
          comments_count: 134,
          shares: 78,
          reach: 23400,
          impressions: 26700,
          created_at: '2024-01-13T09:15:00Z'
        },
        {
          id: '4',
          title: 'Bathroom Makeover Reveal',
          content: 'From outdated to luxurious - see the stunning transformation of this bathroom.',
          media_urls: ['https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=400&h=600&fit=crop'],
          media_type: 'video',
          status: 'draft', // Changed from 'published' to 'draft'
          published_at: '2024-01-12T16:45:00Z',
          likes: 1678,
          comments_count: 98,
          shares: 56,
          reach: 18900,
          impressions: 21500,
          created_at: '2024-01-12T16:45:00Z'
        },
        // Add a published post to demonstrate filtering
        {
          id: '5',
          title: 'Already Published Post',
          content: 'This post has already been published and should not appear in the gallery.',
          media_urls: ['https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=600&fit=crop'],
          media_type: 'image',
          status: 'published', // This should be filtered out
          published_at: '2024-01-11T10:30:00Z',
          likes: 500,
          comments_count: 30,
          shares: 15,
          reach: 8000,
          impressions: 9500,
          created_at: '2024-01-11T10:30:00Z'
        }
      ]

      const sampleMedia: MediaFile[] = [
        {
          id: '1',
          filename: 'kitchen_before.jpg',
          original_filename: 'kitchen_before.jpg',
          storage_url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop',
          thumbnail_url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop',
          file_type: 'image',
          file_size: 2048576,
          width: 1920,
          height: 1080,
          processing_status: 'completed',
          optimization_status: 'optimized',
          created_at: '2024-01-10T11:30:00Z'
        },
        {
          id: '2',
          filename: 'living_room_video.mp4',
          original_filename: 'living_room_video.mp4',
          storage_url: 'https://images.unsplash.com/photo-1618220179428-22790b461013?w=400&h=400&fit=crop',
          thumbnail_url: 'https://images.unsplash.com/photo-1618220179428-22790b461013?w=400&h=400&fit=crop',
          file_type: 'video',
          file_size: 15728640,
          width: 1920,
          height: 1080,
          duration: 45,
          processing_status: 'completed',
          optimization_status: 'optimized',
          created_at: '2024-01-09T14:20:00Z'
        },
        {
          id: '3',
          filename: 'bathroom_raw.jpg',
          original_filename: 'bathroom_raw.jpg',
          storage_url: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=400&h=400&fit=crop',
          thumbnail_url: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=400&h=400&fit=crop',
          file_type: 'image',
          file_size: 3145728,
          width: 2560,
          height: 1440,
          processing_status: 'processing',
          optimization_status: 'pending',
          created_at: '2024-01-08T09:15:00Z'
        },
        {
          id: '4',
          filename: 'bedroom_sketch.jpg',
          original_filename: 'bedroom_sketch.jpg',
          storage_url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop',
          thumbnail_url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop',
          file_type: 'image',
          file_size: 1048576,
          width: 1280,
          height: 720,
          processing_status: 'failed',
          optimization_status: 'failed',
          created_at: '2024-01-07T16:45:00Z'
        }
      ]

      setOptimizedPosts(samplePosts)
      setRawMaterials(sampleMedia)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load content')
    } finally {
      setIsLoading(false)
    }
  }

  const handleItemClick = (item: Post | MediaFile) => {
    // For this iteration, clicking navigates to workflow with selection in sessionStorage
    try {
      const toStore = 'file_type' in item
        ? [{ id: item.id, url: (item.thumbnail_url || item.storage_url), type: item.file_type, name: item.original_filename, size: item.file_size }]
        : [{ id: item.id, url: item.media_urls[0], type: (item.media_type === 'video' ? 'video' : 'image') as 'image' | 'video', name: item.title || 'Post', size: 0 }]
      sessionStorage.setItem('workflowSelectedMedia', JSON.stringify(toStore))
      window.location.href = '/workflow'
    } catch {
      // Fallback to modal preview
      if ('file_type' in item) {
        setPreviewMedia(item)
        setPreviewModalOpen(true)
      } else {
        setSelectedItem(item)
        setIsDetailOpen(true)
      }
    }
  }

  const handleMediaClick = (item: Post | MediaFile, event: React.MouseEvent) => {
    event.stopPropagation() // Prevent triggering the parent click handler
    
    // If selection mode is active and it's a raw material, toggle selection
    if (isSelectionMode && 'file_type' in item && activeView === 'raw') {
      toggleRawMaterialSelection(item.id)
      return
    }
    
    // Otherwise, show preview modal
    // Check if it's a media file (has file_type property)
    if ('file_type' in item) {
      // Use MediaPreviewModal for media files
      setPreviewMedia(item)
      setPreviewModalOpen(true)
    } else {
      // For posts, check if they have media and use MediaPreviewModal for media posts
      if (item.media_urls.length > 0 && (item.media_type === 'image' || item.media_type === 'video')) {
        // Convert post to media format for preview modal
        const mediaForPreview: MediaFile = {
          id: item.id,
          filename: item.title || 'Untitled Post',
          original_filename: item.title || 'Untitled Post',
          storage_url: item.media_urls[0], // Use first media URL
          thumbnail_url: item.media_urls[0],
          file_type: item.media_type as 'image' | 'video',
          file_size: 0, // Posts don't have file size info
          processing_status: 'completed',
          optimization_status: 'optimized',
          created_at: item.created_at,
          duration: undefined, // Posts don't have duration info
          width: undefined,
          height: undefined
        }
        setPreviewMedia(mediaForPreview)
        setPreviewModalOpen(true)
      }
    }
  }

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    Array.from(files).forEach(file => {
      // Create a new media file object
      const newMediaFile: MediaFile = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        filename: file.name,
        original_filename: file.name,
        storage_url: URL.createObjectURL(file),
        thumbnail_url: URL.createObjectURL(file),
        file_type: file.type.startsWith('video/') ? 'video' : 'image',
        file_size: file.size,
        processing_status: 'completed',
        optimization_status: 'optimized',
        created_at: new Date().toISOString()
      }

      // Add to raw materials
      setRawMaterials(prev => [newMediaFile, ...prev])
    })

    // Reset the input
    event.target.value = ''
    
    // Show success message
    toast.success(`${files.length} file${files.length > 1 ? 's' : ''} uploaded successfully!`)
  }

  // Handle raw material selection
  const toggleRawMaterialSelection = (fileId: string) => {
    setSelectedRawMaterialIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(fileId)) {
        newSet.delete(fileId)
      } else {
        newSet.add(fileId)
      }
      return newSet
    })
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
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getMediaUrl = (item: Post | MediaFile) => {
    if ('storage_url' in item) {
      return item.thumbnail_url || item.storage_url
    }
    return item.media_urls[0] || ''
  }

  const getMediaType = (item: Post | MediaFile) => {
    if ('file_type' in item) {
      return item.file_type
    }
    return item.media_type === 'video' ? 'video' : 'image'
  }



  const renderDetailView = () => {
    if (!selectedItem) return null

    const isPost = 'content' in selectedItem
    const mediaUrl = getMediaUrl(selectedItem)
    const mediaType = getMediaType(selectedItem)
    const filename = isPost ? selectedItem.title || 'Untitled Post' : selectedItem.original_filename

    return (
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl w-full h-[85vh] max-h-[800px] p-0 bg-white rounded-2xl border-0 shadow-2xl overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>{filename}</DialogTitle>
          </DialogHeader>
          
          {/* Header with trash can and close button */}
          <div className="absolute right-2 top-2 z-50 flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsDetailOpen(false)}
              className="h-9 w-9 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="h-full flex">
            {/* Left side - Enhanced Media */}
            <div className="flex-1 bg-black rounded-l-2xl relative">
              <div className="absolute inset-0 flex items-center justify-center">
                {mediaType === 'video' ? (
                  <div className="relative w-full h-full">
                    <video
                      src={mediaUrl}
                      controls
                      className="object-contain w-full h-full"
                      autoPlay={false}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                        <Play className="w-8 h-8 text-white ml-1" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <img
                    src={mediaUrl}
                    alt={filename}
                    className="object-contain w-full h-full"
                    loading="lazy"
                    decoding="async"
                  />
                )}
              </div>
            </div>

            {/* Right side - Content */}
            <div className="w-96 flex flex-col bg-white rounded-r-2xl">
              {/* Header */}
              <div className="p-4 border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center justify-between pr-20">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-gray-500 to-slate-500 rounded-full flex items-center justify-center">
                      <Settings className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Media Details</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className="bg-gray-50 text-gray-600 text-xs px-2 py-0.5 rounded-full border border-gray-200">
                          {mediaType === 'video' ? 'Video' : 'Image'}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {isPost ? selectedItem.created_at : selectedItem.created_at}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="flex-1 flex flex-col">
                  <div className="flex-1">
                    <div className="p-4 space-y-4">
                      {/* File Information */}
                      <div className="space-y-3">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-2">File Information</h4>
                          <div className="space-y-2 text-sm text-gray-600">
                            <div className="flex justify-between">
                              <span>Name:</span>
                              <span className="font-medium">{filename}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Type:</span>
                              <span className="font-medium">{mediaType === 'video' ? 'Video' : 'Image'}</span>
                            </div>
                            {!isPost && (
                              <>
                                <div className="flex justify-between">
                                  <span>Size:</span>
                                  <span className="font-medium">{formatFileSize(selectedItem.file_size)}</span>
                                </div>
                                {selectedItem.width && selectedItem.height && (
                                  <div className="flex justify-between">
                                    <span>Dimensions:</span>
                                    <span className="font-medium">{selectedItem.width} × {selectedItem.height}</span>
                                  </div>
                                )}
                                {selectedItem.duration && (
                                  <div className="flex justify-between">
                                    <span>Duration:</span>
                                    <span className="font-medium">{formatDuration(selectedItem.duration)}</span>
                                  </div>
                                )}
                              </>
                            )}
                            {isPost && (
                              <>
                                <div className="flex justify-between">
                                  <span>Status:</span>
                                  <span className="font-medium capitalize">{selectedItem.status}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Created:</span>
                                  <span className="font-medium">
                                    {new Date(selectedItem.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="p-4 border-t border-gray-100 space-y-2 flex-shrink-0">
                    <Button className="w-full bg-gradient-to-r from-gray-500 to-slate-500 hover:from-gray-600 hover:to-slate-600">
                      <Edit3 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    
                    <Button variant="outline" className="w-full">
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                    
                    <Button variant="outline" className="w-full">
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <div className="relative overflow-auto min-h-screen">
      {/* Content Gallery Background Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large teal stains */}
        <div className="absolute inset-0">
          {[...Array(8)].map((_, i) => (
            <div
              key={`stain-${i}`}
              className="absolute rounded-full opacity-25"
              style={{
                background: `radial-gradient(circle, rgba(20,184,166,0.6), rgba(14,165,233,0.4), transparent)`,
                width: `${200 + i * 80}px`,
                height: `${200 + i * 80}px`,
                left: `${8 + i * 12}%`,
                top: `${12 + Math.sin(i) * 20}%`,
                animation: `stain-${i} ${18 + i * 2}s ease-in-out infinite`,
                filter: 'blur(3px)'
              }}
            />
          ))}
        </div>

        {/* Light teal bubbles */}
        <div className="absolute inset-0">
          {[...Array(12)].map((_, i) => (
            <div
              key={`bubble-${i}`}
              className="absolute rounded-full opacity-30"
              style={{
                background: `radial-gradient(circle, rgba(20,184,166,0.7), rgba(14,165,233,0.4), transparent)`,
                width: `${25 + i * 20}px`,
                height: `${25 + i * 20}px`,
                left: `${3 + i * 8}%`,
                top: `${8 + Math.cos(i) * 25}%`,
                animation: `bubble-${i} ${12 + i * 1.5}s ease-in-out infinite`,
                filter: 'blur(1px)'
              }}
            />
          ))}
        </div>

        {/* Teal flowing lines */}
        <div className="absolute inset-0">
          {[...Array(5)].map((_, i) => (
            <div
              key={`line-${i}`}
              className="absolute opacity-20"
              style={{
                background: `linear-gradient(${30 + i * 30}deg, transparent, #14b8a6, #0ea5e9, transparent)`,
                width: '3px',
                height: '250%',
                left: `${20 + i * 20}%`,
                animation: `line-${i} ${20 + i * 6}s linear infinite`,
                filter: 'blur(1px)'
              }}
            />
          ))}
        </div>

        {/* Additional teal particles */}
        <div className="absolute inset-0">
          {[...Array(15)].map((_, i) => (
            <div
              key={`particle-${i}`}
              className="absolute rounded-full opacity-20"
              style={{
                background: `radial-gradient(circle, rgba(20,184,166,0.8), transparent)`,
                width: `${8 + i * 3}px`,
                height: `${8 + i * 3}px`,
                left: `${2 + i * 6}%`,
                top: `${5 + Math.sin(i * 0.5) * 30}%`,
                animation: `particle-${i} ${10 + i * 1}s ease-in-out infinite`,
                filter: 'blur(0.5px)'
              }}
            />
          ))}
        </div>

        {/* CSS Animations */}
        <style jsx>{`
          @keyframes stain-0 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.25; } 50% { transform: translate(35px, -25px) scale(1.4); opacity: 0.35; } }
          @keyframes stain-1 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.25; } 50% { transform: translate(-30px, 30px) scale(0.7); opacity: 0.30; } }
          @keyframes stain-2 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.25; } 50% { transform: translate(25px, 35px) scale(1.3); opacity: 0.33; } }
          @keyframes stain-3 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.25; } 50% { transform: translate(-35px, -20px) scale(0.8); opacity: 0.28; } }
          @keyframes stain-4 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.25; } 50% { transform: translate(40px, 25px) scale(1.2); opacity: 0.32; } }
          @keyframes stain-5 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.25; } 50% { transform: translate(-25px, 40px) scale(0.9); opacity: 0.31; } }
          @keyframes stain-6 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.25; } 50% { transform: translate(30px, -35px) scale(1.1); opacity: 0.34; } }
          @keyframes stain-7 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.25; } 50% { transform: translate(-40px, 15px) scale(0.6); opacity: 0.29; } }
          
          @keyframes bubble-0 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.30; } 50% { transform: translate(20px, -30px) scale(1.3); opacity: 0.45; } }
          @keyframes bubble-1 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.30; } 50% { transform: translate(-25px, 35px) scale(0.7); opacity: 0.40; } }
          @keyframes bubble-2 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.30; } 50% { transform: translate(30px, 20px) scale(1.2); opacity: 0.43; } }
          @keyframes bubble-3 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.30; } 50% { transform: translate(-20px, -25px) scale(0.8); opacity: 0.37; } }
          @keyframes bubble-4 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.30; } 50% { transform: translate(35px, 30px) scale(1.4); opacity: 0.47; } }
          @keyframes bubble-5 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.30; } 50% { transform: translate(-30px, 20px) scale(0.6); opacity: 0.35; } }
          @keyframes bubble-6 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.30; } 50% { transform: translate(25px, -35px) scale(1.1); opacity: 0.41; } }
          @keyframes bubble-7 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.30; } 50% { transform: translate(-35px, 25px) scale(0.9); opacity: 0.38; } }
          @keyframes bubble-8 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.30; } 50% { transform: translate(15px, 40px) scale(1.3); opacity: 0.44; } }
          @keyframes bubble-9 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.30; } 50% { transform: translate(-40px, -15px) scale(0.7); opacity: 0.36; } }
          @keyframes bubble-10 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.30; } 50% { transform: translate(40px, -20px) scale(1.2); opacity: 0.42; } }
          @keyframes bubble-11 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.30; } 50% { transform: translate(-15px, 45px) scale(0.8); opacity: 0.39; } }
          
          @keyframes line-0 { 0% { transform: translateY(-100%) rotate(0deg); } 100% { transform: translateY(100vh) rotate(360deg); } }
          @keyframes line-1 { 0% { transform: translateY(-100%) rotate(180deg); } 100% { transform: translateY(100vh) rotate(540deg); } }
          @keyframes line-2 { 0% { transform: translateY(-100%) rotate(90deg); } 100% { transform: translateY(100vh) rotate(450deg); } }
          @keyframes line-3 { 0% { transform: translateY(-100%) rotate(270deg); } 100% { transform: translateY(100vh) rotate(630deg); } }
          @keyframes line-4 { 0% { transform: translateY(-100%) rotate(45deg); } 100% { transform: translateY(100vh) rotate(405deg); } }
          
          @keyframes particle-0 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.20; } 50% { transform: translate(10px, -15px) scale(1.2); opacity: 0.30; } }
          @keyframes particle-1 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.20; } 50% { transform: translate(-12px, 18px) scale(0.8); opacity: 0.25; } }
          @keyframes particle-2 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.20; } 50% { transform: translate(15px, 12px) scale(1.1); opacity: 0.28; } }
          @keyframes particle-3 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.20; } 50% { transform: translate(-8px, -20px) scale(0.9); opacity: 0.23; } }
          @keyframes particle-4 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.20; } 50% { transform: translate(20px, 25px) scale(1.3); opacity: 0.32; } }
          @keyframes particle-5 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.20; } 50% { transform: translate(-18px, 15px) scale(0.7); opacity: 0.26; } }
          @keyframes particle-6 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.20; } 50% { transform: translate(12px, -25px) scale(1.1); opacity: 0.29; } }
          @keyframes particle-7 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.20; } 50% { transform: translate(-25px, 22px) scale(0.8); opacity: 0.24; } }
          @keyframes particle-8 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.20; } 50% { transform: translate(18px, 30px) scale(1.2); opacity: 0.31; } }
          @keyframes particle-9 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.20; } 50% { transform: translate(-15px, -18px) scale(0.9); opacity: 0.27; } }
          @keyframes particle-10 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.20; } 50% { transform: translate(25px, -12px) scale(1.1); opacity: 0.30; } }
          @keyframes particle-11 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.20; } 50% { transform: translate(-22px, 28px) scale(0.7); opacity: 0.25; } }
          @keyframes particle-12 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.20; } 50% { transform: translate(14px, 35px) scale(1.3); opacity: 0.33; } }
          @keyframes particle-13 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.20; } 50% { transform: translate(-30px, -10px) scale(0.8); opacity: 0.26; } }
          @keyframes particle-14 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.20; } 50% { transform: translate(16px, -28px) scale(1.2); opacity: 0.31; } }
        `}</style>
      </div>

      {/* Main Content */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="relative z-10 w-full max-w-6xl mx-auto p-6 pb-20 space-y-8"
      >
        {/* Content Type Toggle */}
        <motion.div variants={itemVariants} className="flex justify-center">
          <div className="bg-white/20 backdrop-blur-[35px] border border-white/40 rounded-full p-1 shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
            <div className="flex gap-0.5">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveView('raw')}
                className={`relative px-6 py-2.5 rounded-full transition-all duration-300 ${
                  activeView === 'raw'
                    ? 'bg-white/30 text-gray-800 shadow-[0_4px_16px_rgba(20,184,166,0.3)] border border-white/40'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-white/20'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">Rohmaterial</span>
                </div>
                {activeView === 'raw' && (
                  <motion.div
                    layoutId="activeContentTab"
                    className="absolute inset-0 bg-gradient-to-r from-teal-400/20 to-cyan-400/20 rounded-full -z-10"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveView('optimized')}
                className={`relative px-6 py-2.5 rounded-full transition-all duration-300 ${
                  activeView === 'optimized'
                    ? 'bg-white/30 text-gray-800 shadow-[0_4px_16px_rgba(20,184,166,0.3)] border border-white/40'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-white/20'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4" />
                  <span className="text-sm font-medium">Bearbeitetes Material</span>
                </div>
                {activeView === 'optimized' && (
                  <motion.div
                    layoutId="activeContentTab"
                    className="absolute inset-0 bg-gradient-to-r from-teal-400/20 to-cyan-400/20 rounded-full -z-10"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Content Selection Card - Liquid Glass Design */}
        <motion.div variants={itemVariants}>
          <div className="relative">
            {/* Liquid Glass Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-white/8 to-white/5 backdrop-blur-[25px] rounded-[40px] border border-white/20 shadow-[0_20px_60px_rgba(255,255,255,0.2),inset_0_1px_0_rgba(255,255,255,0.3)]" />
            
            {/* Liquid Shimmer Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-1000 rounded-[40px]" />
            
            {/* Floating Liquid Orbs */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-white/[0.08] rounded-full blur-2xl liquid-float" />
              <div className="absolute bottom-1/3 right-1/4 w-24 h-24 bg-white/[0.06] rounded-full blur-xl liquid-float" style={{ animationDelay: '2s' }} />
              <div className="absolute top-2/3 left-1/2 w-20 h-20 bg-white/[0.04] rounded-full blur-lg liquid-float" style={{ animationDelay: '4s' }} />
            </div>
            
            {/* Subtle Light Refractions */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.03] via-transparent to-white/[0.02] pointer-events-none rounded-[40px]" />
            <div className="absolute inset-0 bg-gradient-to-bl from-transparent via-white/[0.02] to-transparent pointer-events-none rounded-[40px]" />
            
            {/* Enhanced Edge Highlights */}
            <div className="absolute inset-y-0 left-0 w-[1px] bg-gradient-to-b from-transparent via-white/30 to-transparent pointer-events-none rounded-[40px]" />
            <div className="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-white/30 to-transparent pointer-events-none rounded-[40px]" />
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none rounded-[40px]" />
            <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none rounded-[40px]" />
            
            {/* Main Content */}
            <div className="relative z-10 p-8 space-y-6">
              {/* Search Bar */}
              <div className="flex items-center justify-between gap-4">
                {/* Selection Mode Toggle Button */}
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative"
                >
                  <div className={`absolute inset-0 rounded-full transition-all duration-500 ${
                    isSelectionMode 
                      ? 'bg-gradient-to-r from-teal-400/30 to-cyan-400/30 blur-lg' 
                      : 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 blur-md'
                  }`} />
                  <Button
                    onClick={() => {
                      setIsSelectionMode(!isSelectionMode)
                      // Clear selections when exiting selection mode
                      if (isSelectionMode) {
                        setSelectedRawMaterialIds(new Set())
                      }
                    }}
                    className={`relative w-14 h-14 rounded-full transition-all duration-500 flex items-center justify-center ${
                      isSelectionMode
                        ? 'bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-[0_8px_32px_rgba(20,184,166,0.4),inset_0_1px_0_rgba(255,255,255,0.3)] hover:shadow-[0_12px_40px_rgba(20,184,166,0.5),inset_0_1px_0_rgba(255,255,255,0.4)]'
                        : 'bg-gradient-to-r from-white/30 to-white/20 hover:from-white/40 hover:to-white/30 text-gray-700 hover:text-gray-800 border border-white/40 hover:border-white/50 shadow-[0_4px_16px_rgba(255,255,255,0.2),inset_0_1px_0_rgba(255,255,255,0.3)] hover:shadow-[0_8px_24px_rgba(255,255,255,0.3),inset_0_1px_0_rgba(255,255,255,0.4)]'
                    }`}
                  >
                    {/* Icon with glow effect */}
                    <div className="relative">
                      <div className={`absolute inset-0 rounded-full blur-sm transition-all duration-500 ${
                        isSelectionMode 
                          ? 'bg-teal-400/60' 
                          : 'bg-gray-400/40'
                      }`} />
                      {isSelectionMode ? (
                        <CheckCircle className="relative w-6 h-6" />
                      ) : (
                        <Eye className="relative w-6 h-6" />
                      )}
                    </div>
                  </Button>
                  
                  {/* Tooltip */}
                  <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 rounded-lg text-xs font-medium transition-all duration-300 ${
                    isSelectionMode
                      ? 'bg-teal-500 text-white shadow-lg'
                      : 'bg-gray-700 text-white shadow-lg'
                  } opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap`}>
                    {isSelectionMode ? 'Selection Mode' : 'Preview Mode'}
                  </div>
                  
                  {/* Selection Mode Indicator */}
                  {isSelectionMode && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-teal-500 rounded-full animate-pulse border-2 border-white shadow-lg" />
                  )}
                </motion.div>
                
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder={`${activeView === 'optimized' ? 'Bearbeitetes Material' : 'Rohmaterial'} durchsuchen...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white/25 backdrop-blur-[20px] border border-white/30 rounded-[25px] text-gray-800 placeholder-gray-500 focus:ring-2 focus:ring-white/50 focus:border-white/50 focus:bg-white/35 transition-all duration-300 shadow-[0_4px_16px_rgba(255,255,255,0.1),inset_0_1px_0_rgba(255,255,255,0.2)]"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <motion.div whileHover={buttonHoverVariants}>
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-teal-500/20 to-cyan-500/20 backdrop-blur-[15px] rounded-[25px] border border-teal-400/30 shadow-[0_4px_16px_rgba(20,184,166,0.2)]" />
                      <Button
                        onClick={loadData}
                        disabled={isLoading}
                        className="relative bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-[25px] px-4 py-2 transition-all duration-300 focus:outline-none focus:ring-0 shadow-[0_4px_16px_rgba(20,184,166,0.3)]"
                      >
                        <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                    </div>
                  </motion.div>
                  <motion.div whileHover={buttonHoverVariants}>
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-white/15 to-white/10 backdrop-blur-[15px] rounded-[25px] border border-white/30 shadow-[0_4px_16px_rgba(255,255,255,0.2)]" />
                      <Button
                        variant="outline"
                        size="sm"
                        className="relative bg-white/25 backdrop-blur-[20px] border border-white/40 hover:bg-white/35 hover:border-white/50 text-gray-800 rounded-[25px] px-4 py-2 transition-all duration-300 focus:outline-none focus:ring-0"
                      >
                      <Filter className="w-4 h-4 mr-2" />
                      Filter
                    </Button>
                    </div>
                  </motion.div>
                </div>
              </div>
              
              {/* Selection Mode Banner */}
              {isSelectionMode && activeView === 'raw' && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-gradient-to-r from-teal-500/10 to-cyan-500/10 backdrop-blur-[20px] border border-teal-400/30 rounded-[20px] p-4 mb-6"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse" />
                    <span className="text-sm font-medium text-teal-700">
                      Selection Mode Active - Click items to select them for editing
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsSelectionMode(false)}
                      className="ml-auto text-teal-600 hover:text-teal-700 hover:bg-teal-100/30 rounded-full px-3 py-1"
                    >
                      Exit Selection
                    </Button>
                  </div>
                </motion.div>
              )}
              
              {/* Loading State */}
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="bg-white/40 backdrop-blur-[25px] border border-white/50 rounded-full p-4">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-600" />
                  </div>
                  <span className="text-gray-800 ml-3 font-medium">Loading content...</span>
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <div className="bg-red-100/40 backdrop-blur-[25px] border border-red-200/40 rounded-[20px] p-4 mb-4">
                    <p className="text-sm text-red-800">
                      <strong>Error:</strong> {error}
                    </p>
                  </div>
                  <Button 
                    onClick={loadData} 
                    className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-[20px] px-6 py-3"
                  >
                    Try Again
                  </Button>
                </div>
              ) : (
                <>
                  {/* Empty State - Liquid Glass Design */}
                  {(activeView === 'optimized' && filteredOptimizedPosts.length === 0) || (activeView === 'raw' && filteredRawMaterials.length === 0) ? (
                    <div className="text-center py-16">
                      {/* Liquid Glass Icon Container */}
                      <div className="relative mx-auto w-24 h-24 mb-6">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-white/10 to-white/5 backdrop-blur-[20px] rounded-full border border-white/25 shadow-[0_8px_32px_rgba(255,255,255,0.2),inset_0_1px_0_rgba(255,255,255,0.3)]" />
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/8 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-1000 rounded-full" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          {activeView === 'optimized' ? (
                            <Video className="w-10 h-10 text-gray-700 drop-shadow-sm" />
                          ) : (
                            <ImageIcon className="w-10 h-10 text-gray-700 drop-shadow-sm" />
                          )}
                        </div>
                        {/* Floating Liquid Orbs */}
                        <div className="absolute inset-0 pointer-events-none">
                          <div className="absolute top-1/4 left-1/4 w-8 h-8 bg-white/[0.15] rounded-full blur-md liquid-float" />
                          <div className="absolute bottom-1/3 right-1/4 w-6 h-6 bg-white/[0.12] rounded-full blur-sm liquid-float" style={{ animationDelay: '1s' }} />
                        </div>
                      </div>
                      
                      <h3 className="text-xl font-semibold text-gray-800 mb-3 drop-shadow-sm">
                        Kein {activeView === 'optimized' ? 'bearbeitetes Material' : 'Rohmaterial'} gefunden
                      </h3>
                      <p className="text-gray-600 mb-6 max-w-md mx-auto leading-relaxed">
                        {activeView === 'optimized' 
                          ? 'Keine Entwürfe gefunden. Nur Beiträge, die nicht hochgeladen oder geplant sind, werden hier angezeigt.' 
                          : 'Kein Rohmaterial gefunden, das Ihrer Suche entspricht.'
                        }
                      </p>
                      
                      {/* Liquid Glass Action Button */}
                      <div className="relative inline-block">
                        <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-white/15 to-white/10 backdrop-blur-[15px] rounded-full border border-white/25 shadow-[0_4px_16px_rgba(255,255,255,0.2)]" />
                        <button className="relative px-6 py-3 bg-gradient-to-r from-teal-500/20 to-cyan-500/20 hover:from-teal-500/30 hover:to-cyan-500/30 text-gray-700 font-medium rounded-full transition-all duration-300 border border-teal-400/30 hover:border-teal-400/50">
                          <span className="flex items-center gap-2">
                            <Upload className="w-4 h-4" />
                            Medien hochladen
                          </span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>

                      {/* Content Grid - virtualized */}
                      <div ref={gridContainerRef} className="content-gallery grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-h-[70vh] overflow-auto cv-auto" data-media-cards style={{ containIntrinsicSize: '1200px 800px' }}>
                        {activeView === 'optimized' ? (
                          paginatedOptimizedPosts.slice(visibleSlice.start, visibleSlice.end).map((post) => (
                            <motion.div
                              key={post.id}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <div 
                                data-card
                                className="relative cursor-pointer p-4 rounded-[30px] group"
                                onPointerDown={startFeatherDrag}
                                onClick={() => handleItemClick(post)}
                              >
                                {/* Liquid Glass Background */}
                                <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-white/12 to-white/8 backdrop-blur-[20px] rounded-[30px] border border-white/25 shadow-[0_8px_32px_rgba(255,255,255,0.15),inset_0_1px_0_rgba(255,255,255,0.2)] group-hover:bg-gradient-to-br group-hover:from-white/25 group-hover:via-white/15 group-hover:to-white/10 group-hover:border-white/30 group-hover:shadow-[0_12px_40px_rgba(255,255,255,0.2),inset_0_1px_0_rgba(255,255,255,0.3)] transition-all duration-300" />
                                
                                {/* Liquid Shimmer Effect */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/8 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000 rounded-[30px]" />
                                
                                {/* Content */}
                                <div className="relative z-10">
                                <div 
                                  className="aspect-[9/16] rounded-[20px] bg-white/20 mb-3 flex items-center justify-center relative overflow-hidden cursor-pointer"
                                  onClick={(e) => handleMediaClick(post, e)}
                                >
                                  {post.media_urls[0] ? (
                                    <img 
                                      src={post.media_urls[0]} 
                                      alt={post.title || 'Post thumbnail'}
                                      className="w-full h-full object-cover rounded-[20px]"
                                      loading="lazy"
                                      decoding="async"
                                    />
                                  ) : (
                                    <Video className="w-8 h-8 text-gray-600" />
                                  )}
                                  {post.media_type === 'video' && (
                                    <div className="absolute bottom-2 left-2 bg-white/40 backdrop-blur-[25px] border border-white/50 rounded-full p-1">
                                      <Play className="w-4 h-4 text-gray-600" />
                                    </div>
                                  )}
                                </div>
                                <h3 className="font-medium text-gray-800 text-sm truncate mb-2">
                                  {post.title || 'Untitled Post'}
                                </h3>
                                <div className="flex items-center justify-between text-xs text-gray-600">
                                  <span>{new Date(post.published_at || post.created_at).toLocaleDateString()}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="flex items-center gap-1">
                                      <Heart className="w-3 h-3" />
                                      {post.likes}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <MessageCircle className="w-3 h-3" />
                                      {post.comments_count}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              </div>
                            </motion.div>
                          ))
                        ) : (
                          <>
                            {/* Upload Card - Only show on first page of Rohmaterial */}
                            {currentPage === 1 && (
                              <motion.div
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <div className="relative">
                                  <input
                                    type="file"
                                    multiple
                                    accept="image/*,video/*"
                                    onChange={handleFileUpload}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                  />
                                  <div data-card className="relative cursor-pointer p-4 rounded-[30px] group" onPointerDown={startFeatherDrag}>
                                    {/* Liquid Glass Background */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-white/12 to-white/8 backdrop-blur-[20px] rounded-[30px] border-2 border-dashed border-white/40 shadow-[0_8px_32px_rgba(255,255,255,0.15),inset_0_1px_0_rgba(255,255,255,0.2)] group-hover:bg-gradient-to-br group-hover:from-white/25 group-hover:via-white/15 group-hover:to-white/10 group-hover:border-white/50 group-hover:shadow-[0_12px_40px_rgba(255,255,255,0.2),inset_0_1px_0_rgba(255,255,255,0.3)] transition-all duration-300" />
                                    
                                    {/* Liquid Shimmer Effect */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/8 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000 rounded-[30px]" />
                                    
                                    {/* Content */}
                                    <div className="relative z-10">
                                    <div className="aspect-square rounded-[20px] bg-white/20 mb-3 flex flex-col items-center justify-center">
                                      <div className="w-16 h-16 bg-gradient-to-r from-teal-500/20 to-cyan-500/20 rounded-full flex items-center justify-center mb-3">
                                        <Plus className="w-8 h-8 text-teal-600" />
                                      </div>
                                      <p className="text-sm font-medium text-gray-700 text-center">
                                        Media hochladen
                                      </p>
                                      <p className="text-xs text-gray-500 text-center mt-1">
                                        Bilder & Videos
                                      </p>
                                    </div>
                                    <h3 className="font-medium text-gray-800 text-sm text-center mb-2">
                                      Neue Medien hinzufügen
                                    </h3>
                                    <div className="text-center text-xs text-gray-600">
                                      <span>Klicken zum Auswählen</span>
                                    </div>
                                  </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                            
                            {/* Raw Materials (virtualized) */}
                            {paginatedRawMaterials.slice(visibleSlice.start, visibleSlice.end).map((file) => {
                              const isSelected = selectedRawMaterialIds.has(file.id)
                              
                              return (
                                <motion.div
                                  key={file.id}
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                >
                                  <div 
                                    data-card
                                    className={`relative cursor-pointer transition-all duration-300 p-4 rounded-[30px] hover:scale-[1.02] group ${
                                      isSelected 
                                        ? 'ring-2 ring-orange-400/50' 
                                        : ''
                                    }`}
                                    onPointerDown={startFeatherDrag}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      if (isSelectionMode) {
                                        toggleRawMaterialSelection(file.id)
                                      } else {
                                        // In preview mode, show the media preview
                                        setPreviewMedia(file)
                                        setPreviewModalOpen(true)
                                      }
                                    }}
                                  >
                                    {/* Liquid Glass Background */}
                                    <div className={`absolute inset-0 backdrop-blur-[20px] rounded-[30px] border border-white/25 shadow-[0_8px_32px_rgba(255,255,255,0.15),inset_0_1px_0_rgba(255,255,255,0.2)] group-hover:shadow-[0_12px_40px_rgba(255,255,255,0.2),inset_0_1px_0_rgba(255,255,255,0.3)] transition-all duration-300 ${
                                      isSelected 
                                        ? 'bg-gradient-to-br from-orange-100/30 via-orange-50/20 to-orange-100/10 border-orange-400/40' 
                                        : 'bg-gradient-to-br from-white/20 via-white/12 to-white/8 group-hover:bg-gradient-to-br group-hover:from-white/25 group-hover:via-white/15 group-hover:to-white/10 group-hover:border-white/30'
                                    }`} />
                                    
                                    {/* Liquid Shimmer Effect */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/8 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000 rounded-[30px]" />
                                    
                                    {/* Content */}
                                    <div className="relative z-10">
                                    <div className="aspect-square rounded-[20px] bg-white/20 mb-3 flex items-center justify-center relative overflow-hidden">
                                      {file.thumbnail_url ? (
                                        <img 
                                          src={file.thumbnail_url} 
                                          alt={file.original_filename}
                                          className="w-full h-full object-cover rounded-[20px]"
                                          loading="lazy"
                                          decoding="async"
                                        />
                                      ) : (
                                        file.file_type === 'video' ? (
                                          <Video className="w-8 h-8 text-gray-600" />
                                        ) : (
                                          <ImageIcon className="w-8 h-8 text-gray-600" />
                                        )
                                      )}
                                      
                                      {/* Selection Overlay - matching video merger design */}
                                      {isSelected && (
                                        <div className="absolute inset-0 bg-orange-500/30 flex items-center justify-center rounded-[20px] backdrop-blur-sm">
                                          <div className="bg-white/40 backdrop-blur-[25px] border border-white/50 rounded-full p-2">
                                            <CheckCircle className="w-6 h-6 text-orange-600" />
                                          </div>
                                        </div>
                                      )}
                                      
                                      <div className="absolute top-2 left-2 bg-white/40 backdrop-blur-[25px] border border-white/50 rounded-full px-2 py-1">
                                        <span className="text-xs text-gray-700 font-medium">
                                          {file.file_type}
                                        </span>
                                      </div>
                                      {file.processing_status !== 'completed' && (
                                        <div className="absolute bottom-2 left-2 bg-white/40 backdrop-blur-[25px] border border-white/50 rounded-full px-2 py-1">
                                          <span className="text-xs text-gray-700 font-medium">
                                            {file.processing_status}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                    <h3 className="font-medium text-gray-800 text-sm truncate mb-2">
                                      {file.original_filename}
                                    </h3>
                                    <div className="flex items-center justify-between text-xs text-gray-600">
                                      <span>{formatFileSize(file.file_size)}</span>
                                      <span>{new Date(file.created_at).toLocaleDateString()}</span>
                                    </div>
                                  </div>
                                  </div>
                                </motion.div>
                              )
                            })}
                          </>
                        )}
                      </div>

                      {/* Selection Summary for Raw Materials */}
                      {activeView === 'raw' && isSelectionMode && selectedRawMaterialIds.size > 0 && (
                        <motion.div 
                          variants={itemVariants}
                          className="mt-6"
                        >
                          <Card className="bg-white/30 backdrop-blur-[40px] border border-white/40 rounded-[25px] shadow-[0_20px_50px_rgba(255,255,255,0.2)]">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="text-left">
                                  <p className="text-gray-800 font-medium">
                                    {selectedRawMaterialIds.size} of {filteredRawMaterials.length} files selected
                                  </p>
                                  <p className="text-gray-600 text-sm">
                                    Selected files ready for editing
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    onClick={() => setSelectedRawMaterialIds(new Set())}
                                    variant="outline"
                                    size="sm"
                                    className="bg-white/30 backdrop-blur-[25px] border border-white/40 hover:bg-white/50 text-gray-800 rounded-[15px] px-3 py-2"
                                  >
                                    Clear All
                                  </Button>
                                  <Button
                                    onClick={() => setSelectedRawMaterialIds(new Set(filteredRawMaterials.map(f => f.id)))}
                                    variant="outline"
                                    size="sm"
                                    className="bg-orange-500/20 hover:bg-orange-500/30 border border-orange-400/40 text-orange-700 rounded-[15px] px-3 py-2"
                                  >
                                    Select All
                                  </Button>
                                  <Button
                                                    onClick={() => {
                  // Add haptic feedback
                  const button = document.querySelector('.floating-action-button')
                  if (button) {
                    button.classList.add('haptic-feedback')
                    setTimeout(() => {
                      button.classList.remove('haptic-feedback')
                    }, 300)
                  }
                  
                  const selectedFiles = filteredRawMaterials.filter(file => selectedRawMaterialIds.has(file.id))
                  toast.success(`${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''} ready for video editing!`)
                  // Here you could navigate to video editor or trigger some action
                }}
                                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-[15px] px-4 py-2"
                                  >
                                    Edit Selected ({selectedRawMaterialIds.size})
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      )}

                      {/* Pagination */}
                      {totalPages > 1 && (
                        <motion.div 
                          variants={itemVariants}
                          className="flex items-center justify-center gap-2 mt-8"
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="bg-white/30 backdrop-blur-[25px] border border-white/40 hover:bg-white/50 text-gray-800 rounded-[15px] px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          
                          <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                              <Button
                                key={page}
                                variant={currentPage === page ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentPage(page)}
                                className={`rounded-[15px] px-3 py-2 text-sm ${
                                  currentPage === page
                                    ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white border-0'
                                    : 'bg-white/30 backdrop-blur-[25px] border border-white/40 hover:bg-white/50 text-gray-800'
                                }`}
                              >
                                {page}
                              </Button>
                            ))}
                          </div>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="bg-white/30 backdrop-blur-[25px] border border-white/40 hover:bg-white/50 text-gray-800 rounded-[15px] px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </motion.div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Detail Modal */}
      {renderDetailView()}

      {/* Glassmorphic Floating Action Button - Appears when items are selected in selection mode */}
      <AnimatePresence>
        {isSelectionMode && selectedRawMaterialIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 30,
              duration: 0.6
            }}
            className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50"
          >
            {/* Button Container with Glassmorphic Effect */}
            <div className="relative group">
              {/* Selection Counter Badge */}
              <div className="absolute -top-3 -right-3 z-10">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-teal-400 to-cyan-400 rounded-full blur-md opacity-60 animate-pulse" />
                  <div className="relative bg-gradient-to-r from-teal-500 to-cyan-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg border border-white/20 backdrop-blur-sm">
                    {selectedRawMaterialIds.size}
                  </div>
                </div>
              </div>
              {/* Background Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-teal-400/20 via-cyan-400/20 to-blue-400/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500 floating-glow" />
              
              {/* Glassmorphic Button */}
              <Button
                onClick={() => {
                  const selectedFiles = filteredRawMaterials.filter(file => selectedRawMaterialIds.has(file.id))
                  toast.success(`${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''} ready for video editing!`)
                  // Here you could navigate to video editor or trigger some action
                }}
                className="floating-action-button relative bg-gradient-to-r from-white/20 via-white/15 to-white/10 backdrop-blur-[25px] border border-white/30 hover:border-white/50 text-gray-800 hover:text-gray-900 font-semibold text-lg px-8 py-4 rounded-full shadow-[0_20px_60px_rgba(0,0,0,0.1),0_8px_25px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.4)] hover:shadow-[0_25px_80px_rgba(0,0,0,0.15),0_12px_35px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.6)] transition-all duration-500 group-hover:scale-105 active:scale-95"
              >
                {/* Shimmer Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 button-shimmer" />
                
                {/* Content */}
                <div className="relative flex items-center gap-3">
                  {/* Icon with Glow */}
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-teal-400 to-cyan-400 rounded-full blur-md opacity-60 group-hover:opacity-80 transition-opacity duration-300" />
                    <Edit3 className="relative w-6 h-6 text-teal-600 group-hover:text-teal-700 transition-colors duration-300" />
                  </div>
                  
                  {/* Text */}
                  <span className="font-semibold">
                    Edit {selectedRawMaterialIds.size} Item{selectedRawMaterialIds.size !== 1 ? 's' : ''}
                  </span>
                  
                  {/* Arrow Icon */}
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full blur-md opacity-60 group-hover:opacity-80 transition-opacity duration-300" />
                    <ChevronRight className="relative w-5 h-5 text-cyan-600 group-hover:text-cyan-700 transition-colors duration-300 group-hover:translate-x-1" />
                  </div>
                </div>
              </Button>
              
              {/* Floating Particles Effect */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-teal-400/30 rounded-full particle-float" style={{ animationDelay: '0s' }} />
                <div className="absolute top-1/3 right-1/4 w-1.5 h-1.5 bg-cyan-400/40 rounded-full particle-float" style={{ animationDelay: '1s' }} />
                <div className="absolute bottom-1/4 left-1/3 w-1 h-1 bg-blue-400/50 rounded-full particle-float" style={{ animationDelay: '2s' }} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Media Preview Modal */}
      <MediaPreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        media={previewMedia ? {
          id: previewMedia.id,
          storage_url: previewMedia.storage_url,
          thumbnail_url: previewMedia.thumbnail_url,
          filename: previewMedia.original_filename,
          file_type: previewMedia.file_type,
          duration: previewMedia.duration,
          width: previewMedia.width,
          height: previewMedia.height,
          alt_text: previewMedia.original_filename
        } : null}
      />
    </div>
  )
} 