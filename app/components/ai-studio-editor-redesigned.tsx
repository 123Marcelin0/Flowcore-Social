"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import { toast } from 'sonner'
import { createClient } from '@supabase/supabase-js'
import { EnhancedLiquidGlass } from '@/components/ui/enhanced-liquid-glass'
import type { MilestoneStep } from '@/components/milestone-workflow'
import { MediaUpload } from '@/components/milestone-workflow/milestones/media-upload'
import { ExportDialog } from '@/components/export-dialog'
import { RenderingProgress } from '@/components/rendering-progress'
import { FinalVideoPresentation } from '@/components/final-video-presentation'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { MediaPreviewModal } from './media-preview-modal'
import AudioPopup from '@/components/audio-popup'
import { MediaLibraryDialog } from './ai-studio-editor/MediaLibraryDialog'
import { CommandPalette } from './ai-studio-editor/CommandPalette'
import GlassSurface from '@/components/ui/glass-surface'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
import { 
  Sparkles, 
  ArrowRight, 
  CheckCircle, 
  Play,
  Settings,
  Wand2,
  Zap,
  Music,
  Upload,
  Volume2,
  Volume1,
  Scissors,
  RotateCcw,
  Palette,
  Star,
  Gauge,
  Crop,
  Filter,
  Layers,
  Lightbulb,
  BarChart3,
  Search,
  EyeOff,
  Mic,
  Image,
  Video,
  Download,
  Heart,
  MoreHorizontal,
  Clock,
  Users,
  TrendingUp,
  Home,
  Bell,
  List,
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
  Eye,
  X,
  Edit3,
  Magnet,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Command,
  BoxSelect
} from 'lucide-react'

interface ProjectData {
  mediaFiles: any[]
  timeline: any | null
  effects: any[]
  audio: any | null
}

interface PixabayImage {
  id: number
  webformatURL: string
  largeImageURL: string
  previewURL: string
  user: string
  tags: string
  likes: number
  downloads: number
  views: number
  duration?: number
  type: 'photo' | 'video'
}

interface PixabaySearchResult {
  hits: PixabayImage[]
  total: number
  totalHits: number
}

interface AIStudioEditorRedesignedProps {
  className?: string
}

const MILESTONE_STEPS: MilestoneStep[] = [
  {
    id: 1,
    name: 'Media Upload',
    description: 'Upload and organize your content files',
    isRequired: true,
    isCompleted: false,
    isActive: true,
  },
  {
    id: 2,
    name: 'Proceed Options',
    description: 'Choose how to continue with your selected media',
    isRequired: true,
    isCompleted: false,
    isActive: false,
  },
  {
    id: 3,
    name: 'Content Editing',
    description: 'Arrange, edit, and enhance your content',
    isRequired: true,
    isCompleted: false,
    isActive: false,
  },
  {
    id: 4,
    name: 'Effects & Audio',
    description: 'Apply effects, transitions, and audio',
    isRequired: false,
    isCompleted: false,
    isActive: false,
  },
  {
    id: 5,
    name: 'Preview & Export',
    description: 'Preview and export your final video',
    isRequired: true,
    isCompleted: false,
    isActive: false,
  },
]

export function AIStudioEditorRedesigned({ className }: AIStudioEditorRedesignedProps) {
  const { user } = useAuth()
  const [steps, setSteps] = useState(MILESTONE_STEPS)
  const [currentStep, setCurrentStep] = useState(1)
  const [projectData, setProjectData] = useState<ProjectData>({
    mediaFiles: [
      // Sample media files for testing
      {
        id: 'sample-1',
        filename: 'sample-image-1.jpg',
        original_filename: 'Beautiful Landscape.jpg',
        file_type: 'image',
        storage_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
        thumbnail_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop'
      },
      {
        id: 'sample-2', 
        filename: 'sample-video-1.mp4',
        original_filename: 'Nature Video.mp4',
        file_type: 'video',
        storage_url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
        thumbnail_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop'
      }
    ],
    timeline: null,
    effects: [],
    audio: null
  })
  
  // Pixabay integration state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  
  // Media preview modal state
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [previewMedia, setPreviewMedia] = useState<any>(null)
  
  // Media selection state
  const [selectedMediaIds, setSelectedMediaIds] = useState<Set<string>>(new Set(['sample-1', 'sample-2'])) // Pre-select sample media for testing
  
  // Pixabay search toggle state
  const [isPixabayMode, setIsPixabayMode] = useState(false)
  const [pixabayResults, setPixabayResults] = useState<PixabayImage[]>([])
  const [isPixabayLoading, setIsPixabayLoading] = useState(false)
  
  // Pixabay pagination and filtering
  const [pixabayPage, setPixabayPage] = useState(1)
  const [pixabayTotalPages, setPixabayTotalPages] = useState(1)
  const [pixabayOrder, setPixabayOrder] = useState<'popular' | 'latest'>('popular')
  const [hasMorePages, setHasMorePages] = useState(false)
  
  // Pixabay preview modal
  const [previewImage, setPreviewImage] = useState<PixabayImage | null>(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  
  // Selection mode state
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  
  // Export system state
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showRenderingProgress, setShowRenderingProgress] = useState(false)
  const [showFinalPresentation, setShowFinalPresentation] = useState(false)
  const [renderStatus, setRenderStatus] = useState<'submitted' | 'queued' | 'fetching' | 'rendering' | 'done' | 'failed'>('submitted')
  const [renderProgress, setRenderProgress] = useState(0)
  const [renderError, setRenderError] = useState<string>('')
  const [finalVideoUrl, setFinalVideoUrl] = useState<string>('')
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<string>('')
  const [chosenProceedOption, setChosenProceedOption] = useState<string | null>(null)
  const [audioPopupOpen, setAudioPopupOpen] = useState(false)

  const completedCount = steps.filter(step => step.isCompleted).length
  const currentStepData = steps.find(step => step.isActive)



  // Handle step navigation
  const handleStepClick = useCallback((stepId: number) => {
    const step = steps.find(s => s.id === stepId)
    if (!step) return

    if (step.isRequired) {
      const previousRequiredSteps = steps.filter(s => s.id < stepId && s.isRequired)
      const allPreviousCompleted = previousRequiredSteps.every(s => s.isCompleted)
      
      if (!allPreviousCompleted) {
        toast.error('Please complete previous required steps first')
        return
      }
    }

    setCurrentStep(stepId)
    setSteps(prevSteps => 
      prevSteps.map(s => ({
        ...s,
        isActive: s.id === stepId
      }))
    )
  }, [steps])

  // Handle milestone completion
  const handleMilestoneComplete = useCallback((stepId: number) => {
    setSteps(prevSteps => {
      const currentStepName = prevSteps.find(s => s.id === stepId)?.name || 'Step'
      
      const newSteps = prevSteps.map(step => 
        step.id === stepId 
          ? { ...step, isCompleted: true, isActive: false }
          : step
      )

      const nextStep = newSteps.find(s => s.id === stepId + 1)
      if (nextStep) {
        nextStep.isActive = true
        setCurrentStep(stepId + 1)
      }

      toast.success(`${currentStepName} completed!`, {
        icon: '🎉'
      })

      return newSteps
    })
  }, [])

  // Handle project data changes
  const handleProjectDataChange = useCallback((stepId: number, data: any) => {
    setProjectData(prev => {
      switch (stepId) {
        case 1:
          return { ...prev, mediaFiles: data }
        case 2:
          return { ...prev, timeline: data }
        case 3:
          return { ...prev, effects: data.effects || [], audio: data.audio || null }
        case 4:
          return prev
        default:
          return prev
      }
    })
  }, [])

  // Handle media selection
  const toggleMediaSelection = useCallback((mediaId: string) => {
    setSelectedMediaIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(mediaId)) {
        newSet.delete(mediaId)
      } else {
        newSet.add(mediaId)
      }
      return newSet
    })
  }, [])

  // Drag & Drop timeline editor (Step 3)
  type TransitionType = 'fade' | 'slideLeft' | 'slideRight' | 'wipeLeft' | 'wipeRight' | 'zoom' | 'reveal'
  type TimelinePosition = 'center' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' | 'topCenter' | 'bottomCenter' | 'centerLeft' | 'centerRight'
  interface TimelineClip {
    id: string
    kind: 'image' | 'video' | 'title' | 'emoji' | 'action' | 'output'
    src?: string
    text?: string
    thumbnail?: string
    start: number
    length: number
    transitionIn?: TransitionType
    transitionOut?: TransitionType
    scale?: number
    position?: TimelinePosition
    x?: number
    y?: number
  }
  const [timelineClips, setTimelineClips] = useState<TimelineClip[]>([])
  const [captionText, setCaptionText] = useState('')
  const [isRenderingPreview, setIsRenderingPreview] = useState(false)
  const [showOverlay, setShowOverlay] = useState<boolean>(false)
  const [dragStartClipX, setDragStartClipX] = useState<number>(0)
  const [canvasHeight, setCanvasHeight] = useState<number>(560)
  const [isDraggingClipId, setIsDraggingClipId] = useState<string | null>(null)
  const [dragStartOffsetX, setDragStartOffsetX] = useState<number>(0)
  const [dragStartOffsetY, setDragStartOffsetY] = useState<number>(0)
  const [isResizingClipId, setIsResizingClipId] = useState<string | null>(null)
  const [resizeEdge, setResizeEdge] = useState<'left' | 'right' | null>(null)
  const [isResizingCanvas, setIsResizingCanvas] = useState(false)
  const [resizeStartY, setResizeStartY] = useState<number>(0)
  const [edges, setEdges] = useState<Array<{ fromId: string; toId: string }>>([])
  // Canvas transform state (pan & zoom)
  const [canvasScale, setCanvasScale] = useState(1)
  const [canvasTranslate, setCanvasTranslate] = useState({ x: 0, y: 0 })
  const canvasWrapperRef = React.useRef<HTMLDivElement | null>(null)
  // Manual connection state
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null)
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null)
  const [tempPointer, setTempPointer] = useState<{ x: number; y: number } | null>(null)
  // Context menu
  const [contextMenu, setContextMenu] = useState<{ open: boolean; x: number; y: number; target: 'canvas' | 'block'; blockId?: string }>({ open: false, x: 0, y: 0, target: 'canvas' })
  // Selection & settings
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [showSettingsPanel, setShowSettingsPanel] = useState(false)
  // Auto-align toggle
  const [autoAlignEnabled, setAutoAlignEnabled] = useState(false)
  const [snapEnabled, setSnapEnabled] = useState(true)

  // Command palette & toolbar state
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [commandQuery, setCommandQuery] = useState("")
  const [gridDensity, setGridDensity] = useState<8 | 16 | 24>(16)
  const [isDarkGlass, setIsDarkGlass] = useState(false)

  // Minimap
  const minimapRef = React.useRef<HTMLDivElement | null>(null)

  // Marquee selection & grouping
  const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false)
  const [marqueeStart, setMarqueeStart] = useState<{ x: number; y: number } | null>(null)
  const [marqueeRect, setMarqueeRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [groups, setGroups] = useState<Array<{ id: string; children: string[]; collapsed?: boolean }>>([])
  const [isRightDockOpen, setIsRightDockOpen] = useState(false)
  const [isLeftMediaPanelOpen, setIsLeftMediaPanelOpen] = useState(false)
  const [showOnlyChosenInMediaPanel, setShowOnlyChosenInMediaPanel] = useState(true) // Show only selected media by default
  // Fallback dialog for media panel to guarantee visibility
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false)
  
  // Media panel state changes
  useEffect(() => {
    // no-op: keep effect to maintain dependency tracking
  }, [isLeftMediaPanelOpen, showOnlyChosenInMediaPanel])
  
  // Auto-open media panel when builder opens (for testing)
  useEffect(() => {
    if (showOverlay && currentStep === 3) {
      // Small delay to ensure everything is rendered
      const timer = setTimeout(() => {
        setIsLeftMediaPanelOpen(true)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [showOverlay, currentStep])
  
  // Force media panel to be visible for debugging
  useEffect(() => {
    if (showOverlay) setIsLeftMediaPanelOpen(true)
  }, [showOverlay])

  // Media panel keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Close media panel on ESC
      if (e.key === 'Escape' && isLeftMediaPanelOpen) {
        setIsLeftMediaPanelOpen(false)
        return
      }
      
      // Open media panel with Ctrl/Cmd + M
      if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
        e.preventDefault()
        setIsLeftMediaPanelOpen(v => !v)
        setShowOnlyChosenInMediaPanel(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isLeftMediaPanelOpen])

  // Render a guaranteed glass dialog anchored on the left as a fallback when user clicks Media
  // This ensures a popup appears even if in-canvas portal stacking is interfered with

  // Pan with space+drag and inertia
  const [isSpaceHeld, setIsSpaceHeld] = useState(false)
  const [isPanning, setIsPanning] = useState(false)
  const panLastPoint = React.useRef<{ x: number; y: number } | null>(null)
  const panVelocity = React.useRef<{ vx: number; vy: number }>({ vx: 0, vy: 0 })
  const panRaf = React.useRef<number | null>(null)

  // Undo/Redo history
  type EditorSnapshot = {
    timelineClips: TimelineClip[]
    edges: Array<{ fromId: string; toId: string }>
    canvasScale: number
    canvasTranslate: { x: number; y: number }
    groups: Array<{ id: string; children: string[]; collapsed?: boolean }>
  }
  const [history, setHistory] = useState<EditorSnapshot[]>([])
  const [future, setFuture] = useState<EditorSnapshot[]>([])

  const captureSnapshot = useCallback((): EditorSnapshot => ({
    timelineClips: JSON.parse(JSON.stringify(timelineClips)),
    edges: JSON.parse(JSON.stringify(edges)),
    canvasScale,
    canvasTranslate: { ...canvasTranslate },
    groups: JSON.parse(JSON.stringify(groups)),
  }), [timelineClips, edges, canvasScale, canvasTranslate, groups])

  const pushHistory = useCallback(() => {
    setHistory(prev => {
      const snap = captureSnapshot()
      const next = [...prev, snap]
      // Limit history size
      return next.length > 50 ? next.slice(next.length - 50) : next
    })
    setFuture([])
  }, [captureSnapshot])

  const undo = useCallback(() => {
    setHistory(prev => {
      if (prev.length === 0) return prev
      const next = [...prev]
      const last = next.pop() as EditorSnapshot
      setFuture(f => [captureSnapshot(), ...f])
      // Restore
      setTimelineClips(last.timelineClips)
      setEdges(last.edges)
      setCanvasScale(last.canvasScale)
      setCanvasTranslate(last.canvasTranslate)
      setGroups(last.groups)
      return next
    })
  }, [captureSnapshot])

  const redo = useCallback(() => {
    setFuture(prev => {
      if (prev.length === 0) return prev
      const [first, ...rest] = prev
      setHistory(h => [...h, captureSnapshot()])
      setTimelineClips(first.timelineClips)
      setEdges(first.edges)
      setCanvasScale(first.canvasScale)
      setCanvasTranslate(first.canvasTranslate)
      setGroups(first.groups)
      return rest
    })
  }, [captureSnapshot])

  // Autosave & restore
  const storageKey = `ai-studio-layout-${user?.id || 'guest'}`
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) return
      const data: EditorSnapshot = JSON.parse(raw)
      setTimelineClips(data.timelineClips || [])
      setEdges(data.edges || [])
      setCanvasScale(data.canvasScale || 1)
      setCanvasTranslate(data.canvasTranslate || { x: 0, y: 0 })
      setGroups(data.groups || [])
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])

  useEffect(() => {
    const id = setTimeout(() => {
      try {
        const payload = captureSnapshot()
        localStorage.setItem(storageKey, JSON.stringify(payload))
      } catch {}
    }, 300)
    return () => clearTimeout(id)
  }, [captureSnapshot, storageKey])

  // Validate connection helper to prevent cycles
  const wouldCreateCycle = useCallback((fromId: string, toId: string) => {
    const graph: Record<string, string[]> = {}
    for (const e of edges) {
      if (!graph[e.fromId]) graph[e.fromId] = []
      graph[e.fromId].push(e.toId)
    }
    if (!graph[fromId]) graph[fromId] = []
    graph[fromId].push(toId)
    const seen = new Set<string>()
    const stack = new Set<string>()
    const dfs = (n: string): boolean => {
      if (stack.has(n)) return true
      if (seen.has(n)) return false
      seen.add(n)
      stack.add(n)
      for (const nb of graph[n] || []) {
        if (dfs(nb)) return true
      }
      stack.delete(n)
      return false
    }
    return dfs(fromId)
  }, [edges])

  const PX_PER_SECOND = 48
  const GRID = gridDensity
  const CONNECT_THRESHOLD_PX = 360

  // Node typing helpers
  type NodeCategory = 'media' | 'caption' | 'action' | 'output'
  const getNodeCategory = (clip: TimelineClip): NodeCategory => {
    if (clip.kind === 'image' || clip.kind === 'video') return 'media'
    if (clip.kind === 'title' || clip.kind === 'emoji') return 'caption'
    if (clip.kind === 'output') return 'output'
    return 'action'
  }
  const isValidTypedConnection = (from: TimelineClip, to: TimelineClip): boolean => {
    const f: NodeCategory = getNodeCategory(from)
    const t: NodeCategory = getNodeCategory(to)
    const validTargetsFor: Record<NodeCategory, NodeCategory[]> = {
      media: ['action', 'output'],
      caption: ['action', 'output'],
      action: ['action', 'output'],
      output: [],
    }
    return validTargetsFor[f].includes(t)
  }

  const addClipFromMedia = useCallback((file: any, at?: { x: number; y: number }) => {
    const isVideo = (file.file_type || '').startsWith('video')
    const endOfTimeline = timelineClips.reduce((s, c) => Math.max(s, c.start + c.length), 0)
    const newClip: TimelineClip = {
      id: `clip-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      kind: isVideo ? 'video' : 'image',
      src: file.storage_url || file.url,
      thumbnail: file.thumbnail_url || file.storage_url || file.url,
      start: endOfTimeline,
      length: isVideo ? 5 : 3,
      transitionIn: timelineClips.length > 0 ? 'fade' : undefined,
      transitionOut: 'fade',
      scale: 1,
      position: 'center',
      x: (timelineClips.length * 200) + 40,
      y: 60
    }
    // If a drop position is provided, center the block at the drop point
    if (at) {
      const widthPx = Math.max(48, Math.min(720, newClip.length * PX_PER_SECOND))
      newClip.x = Math.max(0, at.x - widthPx / 2)
      newClip.y = Math.max(0, at.y - 140 / 2)
    }
    const updated = [...timelineClips, newClip]
    setTimelineClips(updated)
    // Manual connections; no auto connect
    handleProjectDataChange(2, updated)
  }, [timelineClips, handleProjectDataChange])

  const addCaptionClip = useCallback((text: string) => {
    if (!text.trim()) return
    const endOfTimeline = timelineClips.reduce((s, c) => Math.max(s, c.start + c.length), 0)
    const newClip: TimelineClip = {
      id: `clip-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      kind: 'title',
      text,
      start: endOfTimeline,
      length: 2,
      transitionIn: timelineClips.length > 0 ? 'slideLeft' : 'fade',
      transitionOut: 'fade',
      scale: 1,
      position: 'center',
      x: (timelineClips.length * 200) + 40,
      y: 60
    }
    const updated = [...timelineClips, newClip]
    setTimelineClips(updated)
    // Manual connections; no auto connect
    handleProjectDataChange(2, updated)
  }, [timelineClips, handleProjectDataChange])

  const addEmojiClip = useCallback((emoji: string) => {
    addCaptionClip(emoji)
  }, [addCaptionClip])

  const reorderClips = useCallback((fromIndex: number, toIndex: number) => {
    if (Number.isNaN(fromIndex) || Number.isNaN(toIndex)) return
    if (fromIndex === toIndex) return
    const updated = [...timelineClips]
    const [moved] = updated.splice(fromIndex, 1)
    updated.splice(toIndex, 0, moved)
    // Recompute sequential starts
    let cursor = 0
    const fixed = updated.map(c => {
      const nc = { ...c, start: cursor }
      cursor += c.length
      return nc
    })
    setTimelineClips(fixed)
    handleProjectDataChange(2, fixed)
  }, [timelineClips, handleProjectDataChange])

  const updateClip = useCallback((id: string, patch: Partial<TimelineClip>) => {
    const updated = timelineClips.map(c => c.id === id ? { ...c, ...patch } : c)
    setTimelineClips(updated)
    handleProjectDataChange(2, updated)
  }, [timelineClips, handleProjectDataChange])

  const removeClip = useCallback((id: string) => {
    const updated = timelineClips.filter(c => c.id !== id)
    let cursor = 0
    const fixed = updated.map(c => {
      const nc = { ...c, start: cursor }
      cursor += c.length
      return nc
    })
    setTimelineClips(fixed)
    handleProjectDataChange(2, fixed)
  }, [timelineClips, handleProjectDataChange])

  const autoArrange = useCallback(() => {
    let cursor = 0
    const arranged = timelineClips.map(c => {
      const nc = { ...c, start: cursor }
      cursor += c.length
      return nc
    })
    setTimelineClips(arranged)
    handleProjectDataChange(2, arranged)
  }, [timelineClips, handleProjectDataChange])

  // Drag/resize interactions for blocks
  const handleBlockMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>, clipId: string) => {
    e.stopPropagation()
    const target = e.currentTarget
    const rect = target.getBoundingClientRect()
    const offsetX = (e.clientX - rect.left) / (canvasScale || 1)
    const offsetY = (e.clientY - rect.top) / (canvasScale || 1)
    // Detect edge for trimming (12px handles)
    if (offsetX <= 12) {
      setIsResizingClipId(clipId)
      setResizeEdge('left')
    } else if (offsetX >= rect.width - 12) {
      setIsResizingClipId(clipId)
      setResizeEdge('right')
    } else {
      setIsDraggingClipId(clipId)
      setDragStartOffsetX(offsetX)
      setDragStartOffsetY(offsetY)
      const clip = timelineClips.find(c => c.id === clipId)
      setDragStartClipX(clip?.x || 0)
    }
    window.addEventListener('mousemove', onWindowMouseMove)
    window.addEventListener('mouseup', onWindowMouseUp)
  }, [timelineClips])

  const onWindowMouseMove = useCallback((e: MouseEvent) => {
    // Dragging blocks by x/y
    if (isDraggingClipId) {
      setTimelineClips(prev => {
        const canvas = document.getElementById('editor-canvas-inner') as HTMLElement | null
        const canvasRect = canvas?.getBoundingClientRect()
        if (!canvasRect) return prev
        const next = prev.map(c => {
          if (c.id !== isDraggingClipId) return c
          let newLeft = (e.clientX - canvasRect.left - dragStartOffsetX)
          let newTop = (e.clientY - canvasRect.top - dragStartOffsetY)
          if (snapEnabled) {
            newLeft = Math.round(newLeft / GRID) * GRID
            newTop = Math.round(newTop / GRID) * GRID
          }
          // Clamp after transform awareness
          const clampedLeft = Math.max(0, Math.min(newLeft, canvasRect.width - 120))
          const clampedTop = Math.max(0, Math.min(newTop, canvasRect.height - 140))
          return { ...c, x: clampedLeft, y: clampedTop }
        })
        if (isConnecting) {
          setTempPointer({ x: e.clientX, y: e.clientY })
        }
        return next
      })
      return
    }
    if (isConnecting) {
      setTempPointer({ x: e.clientX, y: e.clientY })
      return
    }
    // Resizing clip (trim)
    if (isResizingClipId && resizeEdge) {
      setTimelineClips(prev => prev.map(c => {
        if (c.id !== isResizingClipId) return c
        const blockEl = document.getElementById(`block-${c.id}`)
        const canvasRect = (document.getElementById('editor-canvas-inner') as HTMLElement)?.getBoundingClientRect()
        if (!blockEl || !canvasRect) return c
        const currentRect = blockEl.getBoundingClientRect()
        // visual scale
        if (resizeEdge === 'right') {
          const deltaPx = e.clientX - currentRect.left
          const raw = deltaPx / PX_PER_SECOND
          const snapped = Math.round(raw * 2) / 2 // 0.5s steps
          const newLength = Math.max(1, Math.min(12, snapped))
          return { ...c, length: newLength }
        } else {
          // left edge trim: reduce length while block visually would shift; for simplicity, just reduce length
          const deltaPx = currentRect.right - e.clientX
          const raw = (currentRect.width - deltaPx) / PX_PER_SECOND
          const snapped = Math.round(raw * 2) / 2
          const newLength = Math.max(1, Math.min(12, snapped))
          return { ...c, length: newLength }
        }
      }))
      return
    }
  }, [isDraggingClipId, dragStartOffsetX, isResizingClipId, resizeEdge])

  const onWindowMouseUp = useCallback(() => {
    setIsDraggingClipId(null)
    setIsResizingClipId(null)
    setResizeEdge(null)
    if (isConnecting && connectingFromId) {
      if (hoveredBlockId && hoveredBlockId !== connectingFromId) {
        const from = timelineClips.find(c => c.id === connectingFromId)
        const to = timelineClips.find(c => c.id === hoveredBlockId)
        if (from && to && !isValidTypedConnection(from, to)) {
          toast.error('Invalid connection types')
        } else {
        setEdges(prev => {
          if (prev.some(e => e.fromId === connectingFromId && e.toId === hoveredBlockId)) return prev
          if (wouldCreateCycle(connectingFromId, hoveredBlockId)) {
            toast.error('Invalid: connection creates a loop')
            return prev
          }
          return [...prev, { fromId: connectingFromId, toId: hoveredBlockId }]
        })
        }
      }
    }
    setIsConnecting(false)
    setConnectingFromId(null)
    setHoveredBlockId(null)
    setTempPointer(null)
    setTimelineClips(prev => {
      const next = [...prev]
      handleProjectDataChange(2, next)
      return next
    })
    window.removeEventListener('mousemove', onWindowMouseMove)
    window.removeEventListener('mouseup', onWindowMouseUp)
  }, [onWindowMouseMove])

  const handleCanvasResizeMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsResizingCanvas(true)
    setResizeStartY(e.clientY)
    window.addEventListener('mousemove', onCanvasResizeMove)
    window.addEventListener('mouseup', onCanvasResizeUp)
  }, [])

  const onCanvasResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizingCanvas) return
    setCanvasHeight(prev => {
      const delta = e.clientY - resizeStartY
      const next = Math.min(900, Math.max(320, prev + delta))
      return next
    })
    setResizeStartY(e.clientY)
  }, [isResizingCanvas, resizeStartY])

  const onCanvasResizeUp = useCallback(() => {
    setIsResizingCanvas(false)
    window.removeEventListener('mousemove', onCanvasResizeMove)
    window.removeEventListener('mouseup', onCanvasResizeUp)
  }, [onCanvasResizeMove])

  // Lock background scroll when overlay open
  useEffect(() => {
    if (showOverlay) {
      const original = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = original }
    }
  }, [showOverlay])

  // Keyboard shortcuts: space (pan), Cmd/Ctrl+K (command palette), 0/1 reset zoom, Cmd/Ctrl+Z/Y undo/redo
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        if (!isSpaceHeld) setIsSpaceHeld(true)
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsCommandPaletteOpen(v => !v)
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault(); undo()
      }
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        e.preventDefault(); redo()
      }
      if (e.key === '0') {
        setCanvasScale(1); setCanvasTranslate({ x: 0, y: 0 })
      }
      if (e.key === '1') {
        setCanvasScale(0.9)
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setIsSpaceHeld(false)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [isSpaceHeld, undo, redo])

  // Helper: compute anchor points for a node
  const getNodeAnchor = useCallback((clip: TimelineClip) => {
    const widthPx = Math.max(48, Math.min(720, clip.length * PX_PER_SECOND))
    const x = (clip.x || 40)
    const y = (clip.y || 60)
    return {
      left: { x: x, y: y + 70 },
      right: { x: x + widthPx, y: y + 70 },
    }
  }, [])

  // Overlay opens only via explicit button

  // Build Shotstack edit config from timeline clips
  const buildShotstackEditFromTimeline = useCallback(() => {
    const clips = timelineClips.map((c) => {
      const base: any = {
        start: c.start,
        length: c.length,
        fit: 'cover' as const,
        transition: {
          ...(c.transitionIn ? { in: c.transitionIn } : {}),
          ...(c.transitionOut ? { out: c.transitionOut } : {}),
        }
      }
      if (c.kind === 'image' || c.kind === 'video') {
        base.asset = { type: c.kind, src: c.src }
      } else if (c.kind === 'title' || c.kind === 'emoji') {
        base.asset = { type: 'title', text: c.text, style: 'blockbuster', color: '#ffffff', size: 'large', position: 'center' }
      }
      if (typeof c.scale === 'number') base.scale = c.scale
      if (c.position) base.position = c.position
      return base
    })

    const timeline: any = {
      tracks: [ { clips } ],
      background: '#000000'
    }

    return {
      timeline,
      output: {
        format: 'mp4',
        resolution: 'full-hd',
        aspectRatio: '9:16'
      }
    }
  }, [timelineClips])

  const startShotstackRender = useCallback(async () => {
    if (timelineClips.length === 0) {
      toast.error('Add media or captions to the timeline first')
      return
    }
    setShowFinalPresentation(false)
    setShowRenderingProgress(true)
    setRenderStatus('queued')
    setRenderProgress(15)
    setRenderError('')
    setIsRenderingPreview(true)
    try {
      const edit = buildShotstackEditFromTimeline()
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch('/api/shotstack/render', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({ edit, projectName: 'AI Studio Prototype' })
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json.error || 'Failed to start render')
      const jobId: string | undefined = json?.response?.id || json?.jobId
      if (!jobId) throw new Error('No job id returned from render API')

      const statusToProgress: Record<string, number> = { submitted: 20, queued: 30, fetching: 55, rendering: 85, done: 100 }
      let done = false
      while (!done) {
        await new Promise(r => setTimeout(r, 3000))
        const sres = await fetch(`/api/shotstack/render?jobId=${encodeURIComponent(jobId)}`, {
          headers: { ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) }
        })
        const sjson = await sres.json()
        if (!sres.ok) throw new Error(sjson.error || 'Failed to fetch render status')
        const status: string = sjson.status || sjson.response?.status
        setRenderStatus((status as any) || 'rendering')
        setRenderProgress(statusToProgress[status] ?? 70)
        if (status === 'done') {
          const url: string = sjson.videoUrl || sjson.response?.url
          setFinalVideoUrl(url || '')
          setShowRenderingProgress(false)
          setShowFinalPresentation(true)
          done = true
          handleMilestoneComplete(5)
        }
        if (status === 'failed') {
          throw new Error('Render failed')
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Preview failed'
      setRenderStatus('failed')
      setRenderError(msg)
      toast.error(msg)
    } finally {
      setIsRenderingPreview(false)
    }
  }, [timelineClips, buildShotstackEditFromTimeline, handleMilestoneComplete])
  // Get selected media files
  const selectedMediaFiles = projectData.mediaFiles.filter(file => 
    selectedMediaIds.has(file.id || file.filename)
  )

  // Handle Pixabay search
  const handlePixabaySearch = useCallback(async (page: number = 1, append: boolean = false) => {
    if (!searchQuery.trim()) {
      toast.error('Bitte geben Sie einen Suchbegriff ein')
      return
    }

    setIsPixabayLoading(true)
    try {
      // Get auth token from Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('Session error:', sessionError)
        throw new Error('Authentication failed')
      }
      
      if (!session?.access_token) {
        console.error('No session or access token found')
        throw new Error('Bitte melden Sie sich an, um Pixabay zu durchsuchen')
      }
      
      // Authenticated; proceed to search Pixabay

      const response = await fetch(`/api/pixabay?q=${encodeURIComponent(searchQuery)}&type=${selectedCategory === 'photos' ? 'images' : selectedCategory === 'videos' ? 'videos' : 'all'}&per_page=20&page=${page}&order=${pixabayOrder}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      const data = await response.json()
      
      if (response.ok) {
        // Handle the new API response structure
        let results: PixabayImage[] = []
        let totalHits = 0
        
        if (data.data.images?.hits) {
          results = [...results, ...data.data.images.hits.map((item: any) => ({ ...item, type: 'photo' }))]
          totalHits = Math.max(totalHits, data.data.images.totalHits || 0)
        }
        if (data.data.videos?.hits) {
          results = [...results, ...data.data.videos.hits.map((item: any) => ({ ...item, type: 'video' }))]
          totalHits = Math.max(totalHits, data.data.videos.totalHits || 0)
        }
        
        // Calculate pagination
        const totalPages = Math.ceil(totalHits / 20)
        setPixabayTotalPages(totalPages)
        setHasMorePages(page < totalPages)
        setPixabayPage(page)
        
        // Update results (append for pagination, replace for new search)
        if (append) {
          setPixabayResults(prev => [...prev, ...results])
        } else {
          setPixabayResults(results)
        }
        
        toast.success(`${append ? results.length + ' weitere' : results.length} Ergebnisse gefunden`)
      } else {
        throw new Error(data.error || 'Suche fehlgeschlagen')
      }
    } catch (error) {
      console.error('Pixabay search error:', error)
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('Authentication required')) {
          toast.error('Bitte melden Sie sich an, um Pixabay zu durchsuchen')
        } else if (error.message.includes('500')) {
          toast.error('Pixabay-Dienst vorübergehend nicht verfügbar. Bitte versuchen Sie es später erneut.')
        } else {
          toast.error(`Suche fehlgeschlagen: ${error.message}`)
        }
      } else {
        toast.error('Suche fehlgeschlagen. Bitte versuchen Sie es erneut.')
      }
      
      if (!append) {
        setPixabayResults([])
      }
    } finally {
      setIsPixabayLoading(false)
    }
  }, [searchQuery, selectedCategory, pixabayOrder])

  // Load next page
  const loadNextPage = useCallback(() => {
    if (hasMorePages && !isPixabayLoading) {
      handlePixabaySearch(pixabayPage + 1, true)
    }
  }, [hasMorePages, isPixabayLoading, pixabayPage, handlePixabaySearch])

  // Reset search when switching modes or categories
  const resetPixabaySearch = useCallback(() => {
    setPixabayResults([])
    setPixabayPage(1)
    setPixabayTotalPages(1)
    setHasMorePages(false)
  }, [])

  // Add Pixabay media to project
  const addPixabayMedia = useCallback(async (pixabayItem: PixabayImage) => {
    try {
      const newMediaFile = {
        id: `pixabay-${pixabayItem.id}`,
        filename: `pixabay-${pixabayItem.id}.${pixabayItem.type === 'video' ? 'mp4' : 'jpg'}`,
        original_filename: `pixabay-${pixabayItem.id}.${pixabayItem.type === 'video' ? 'mp4' : 'jpg'}`,
        storage_url: pixabayItem.type === 'video' 
          ? (pixabayItem as any).videos?.medium?.url || (pixabayItem as any).videos?.small?.url
          : pixabayItem.largeImageURL || pixabayItem.webformatURL,
        thumbnail_url: pixabayItem.previewURL,
        file_type: pixabayItem.type === 'video' ? 'video' : 'image',
        file_size: 0, // Unknown for Pixabay
        processing_status: 'completed',
        created_at: new Date().toISOString()
      }

      handleProjectDataChange(1, [...projectData.mediaFiles, newMediaFile])
      toast.success('Media added to your collection!')
    } catch (error) {
      console.error('Error adding Pixabay media:', error)
      toast.error('Failed to add media')
    }
  }, [projectData.mediaFiles, handleProjectDataChange])

  // Handle export process
  const handleStartExport = useCallback(() => {
    if (completedCount < 3) {
      toast.error('Please complete media upload, proceed options, and content editing before exporting')
      return
    }
    setShowExportDialog(true)
  }, [completedCount])

  const handleExport = useCallback(async (exportOptions: any) => {
    setShowExportDialog(false)
    setShowRenderingProgress(true)
    setRenderStatus('submitted')
    setRenderError('')
    
    try {
      setRenderStatus('queued')
      setRenderProgress(25)
      setEstimatedTimeRemaining('3-5 minutes')
      
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      setRenderStatus('fetching')
      setRenderProgress(50)
      setEstimatedTimeRemaining('2-3 minutes')
      
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      setRenderStatus('rendering')
      setRenderProgress(75)
      setEstimatedTimeRemaining('1-2 minutes')
      
      await new Promise(resolve => setTimeout(resolve, 4000))
      
      setRenderStatus('done')
      setRenderProgress(100)
      setFinalVideoUrl('https://example.com/final-video.mp4')
      setShowRenderingProgress(false)
      setShowFinalPresentation(true)
      
      handleMilestoneComplete(5)
      
    } catch (error) {
      setRenderStatus('failed')
      setRenderError('Failed to render video. Please try again.')
    }
  }, [handleMilestoneComplete])

  // Render milestone content
  const renderMilestoneContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-8 pointer-events-auto">
            {/* Rohmaterial View */}
            <div className="p-6 pointer-events-auto">
              <div className="text-center mb-4 pointer-events-auto">
                <h3 className="text-xl font-semibold text-black mb-2 glass-text-shadow">
                  
                </h3>

              </div>
              
              {/* Search Bar with Pixabay Toggle */}
              <div className="flex items-center justify-between gap-4 mb-4 pointer-events-auto">
                <div className="flex-1 flex items-center gap-3">
                  {/* Selection Mode Toggle Button */}
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative group"
                  >
                    <div className={`absolute inset-0 rounded-full transition-all duration-500 ${
                      isSelectionMode 
                        ? 'bg-gradient-to-r from-teal-400/30 to-cyan-400/30 blur-lg' 
                        : 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 blur-md'
                    }`} />
                    <Button
                      onClick={() => {
                        setIsSelectionMode(!isSelectionMode)
                        // Don't clear selections when exiting selection mode - keep selected media
                        // if (isSelectionMode) {
                        //   setSelectedMediaIds(new Set())
                        // }
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
                    {/* Enhanced Glassmorphic Media Panel with Backdrop */}
                    <AnimatePresence>
                      {isLeftMediaPanelOpen && createPortal((
                        <>
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[200190] bg-black/20 backdrop-blur-[3px]"
                            onClick={() => setIsLeftMediaPanelOpen(false)}
                          />
                          <motion.div
                            initial={{ x: -420, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -420, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="fixed top-20 left-8 z-[200200] w-[420px] max-h-[85vh] rounded-3xl border border-white/60 bg-white/80 supports-[backdrop-filter]:bg-white/60 backdrop-blur-3xl shadow-[0_50px_150px_rgba(0,0,0,0.35)] overflow-hidden"
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* Enhanced Header */}
                            <div className="px-6 py-4 flex items-center justify-between bg-gradient-to-br from-white/70 via-white/50 to-white/30 border-b border-white/60">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-400/30 flex items-center justify-center">
                                  <Image className="w-4 h-4 text-blue-600" />
                                </div>
                                <div>
                                  <div className="text-sm font-semibold text-slate-800">Media Library</div>
                                  <div className="text-xs text-slate-500">Drag & drop to timeline</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <label className="text-xs text-slate-600 flex items-center gap-2 cursor-pointer hover:text-slate-800 transition-colors">
                                  <input 
                                    type="checkbox" 
                                    checked={showOnlyChosenInMediaPanel} 
                                    onChange={(e) => setShowOnlyChosenInMediaPanel(e.target.checked)}
                                    className="w-3 h-3 rounded border-white/40 bg-white/60"
                                  />
                                  <span>Selected only</span>
                                </label>
                                <button 
                                  className="px-3 py-1.5 text-xs rounded-xl border border-white/50 bg-white/70 hover:bg-white/90 text-slate-700 transition-all duration-200 hover:shadow-md" 
                                  onClick={() => setIsLeftMediaPanelOpen(false)}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                            
                            {/* Enhanced Content */}
                            <div className="p-6 grid grid-cols-2 gap-4 overflow-auto" style={{ maxHeight: 'calc(85vh - 80px)' }}>
                              {/* Debug info */}
                              <div className="col-span-2 text-xs text-slate-500 mb-4">
                                Debug: Panel is open, {projectData.mediaFiles.length} media files available
                              </div>
                              
                              {(showOnlyChosenInMediaPanel ? projectData.mediaFiles.filter((f: any) => selectedMediaIds.has(f.id || f.filename)) : projectData.mediaFiles).length === 0 && (
                                <div className="col-span-2 flex flex-col items-center justify-center py-12 text-center">
                                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-300/50 flex items-center justify-center mb-4">
                                    <Image className="w-8 h-8 text-slate-400" />
                                  </div>
                                  <div className="text-sm font-medium text-slate-600 mb-1">No media files</div>
                                  <div className="text-xs text-slate-500">Upload or select media to get started</div>
                                  <div className="text-xs text-blue-500 mt-2">Sample files should appear here</div>
                                </div>
                              )}
                              {(showOnlyChosenInMediaPanel ? projectData.mediaFiles.filter((f: any) => selectedMediaIds.has(f.id || f.filename)) : projectData.mediaFiles).map((file: any) => (
                                <div 
                                  key={file.id || file.filename}
                                  className="group rounded-2xl overflow-hidden border border-white/60 bg-white/80 backdrop-blur-xl shadow-sm hover:shadow-xl transition-all duration-300 hover:scale-[1.02] hover:border-white/80"
                                >
                                  <div className="relative">
                                    {file.file_type === 'video' ? (
                                      <video 
                                        src={file.storage_url} 
                                        className="w-full h-32 object-cover" 
                                        muted 
                                        onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                                        onMouseLeave={(e) => (e.target as HTMLVideoElement).pause()}
                                      />
                                    ) : (
                                      <img 
                                        src={file.thumbnail_url || file.storage_url} 
                                        className="w-full h-32 object-cover" 
                                        alt={file.original_filename || file.filename}
                                      />
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    <div className="absolute top-2 right-2 w-6 h-6 rounded-lg bg-white/80 backdrop-blur-sm flex items-center justify-center">
                                      {file.file_type === 'video' ? (
                                        <Video className="w-3 h-3 text-slate-600" />
                                      ) : (
                                        <Image className="w-3 h-3 text-slate-600" />
                                      )}
                                    </div>
                                  </div>
                                  <div className="px-3 py-2 bg-white/90 backdrop-blur-sm">
                                    <div className="text-xs font-medium text-slate-700 truncate">
                                      {file.original_filename || file.filename}
                                    </div>
                                    <div className="text-[10px] text-slate-500 mt-0.5">
                                      {file.file_type === 'video' ? 'Video' : 'Image'}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        </>
                      ), document.body)}
                    </AnimatePresence>
                    
                    {/* Test Panel - Always visible when builder is open */}
                    {/* Debug panel removed for cleanliness */}
                    
                    {/* Selection Mode Indicator */}
                    {isSelectionMode && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-teal-500 rounded-full animate-pulse border-2 border-white shadow-lg" />
                    )}
                  </motion.div>
                  
                  <div className="flex-1 relative pointer-events-auto">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      type="text"
                      placeholder={isPixabayMode ? "Pixabay Fotos & Videos durchsuchen..." : "Rohmaterial durchsuchen..."}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && isPixabayMode) {
                          if (!user) {
                            toast.error('Bitte melden Sie sich an, um Pixabay zu durchsuchen')
                            return
                          }
                          resetPixabaySearch()
                          handlePixabaySearch(1, false)
                        }
                      }}
                      className="w-full pl-12 pr-4 py-3 glass-input rounded-xl text-black placeholder:text-gray-500 focus:ring-2 focus:ring-white/30 focus:border-white/30 transition-all duration-300 pointer-events-auto"
                    />
                  </div>
                  
                  {/* Pixabay Toggle Button */}
                  <button
                    onClick={() => {
                      setIsPixabayMode(!isPixabayMode)
                      setSearchQuery('')
                      resetPixabaySearch()
                    }}
                    className={`px-4 py-3 rounded-xl transition-all duration-300 focus:outline-none focus:ring-0 flex items-center gap-2 pointer-events-auto ${
                      isPixabayMode 
                        ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30 text-black' 
                        : 'glass-button hover:glass-panel-strong border border-white/20 text-black'
                    }`}
                  >
                    <Image className="w-4 h-4" />
                    {isPixabayMode ? 'Pixabay' : 'Local'}
                  </button>
                </div>
                
                <div className="flex items-center gap-3 pointer-events-auto">
                  {isPixabayMode ? (
                    <button 
                      onClick={() => {
                        if (!user) {
                          toast.error('Bitte melden Sie sich an, um Pixabay zu durchsuchen')
                          return
                        }
                        resetPixabaySearch()
                        handlePixabaySearch(1, false)
                      }}
                      disabled={isPixabayLoading || !user}
                      className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 text-black border border-purple-400/30 rounded-xl px-4 py-3 transition-all duration-300 focus:outline-none focus:ring-0 flex items-center gap-2 disabled:opacity-50"
                    >
                      {isPixabayLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      {!user ? 'Anmeldung erforderlich' : 'Suchen'}
                    </button>
                  ) : (
                    <button className="bg-gradient-to-r from-teal-500/20 to-cyan-500/20 hover:from-teal-500/30 hover:to-cyan-500/30 text-black border border-teal-400/30 rounded-xl px-4 py-3 transition-all duration-300 focus:outline-none focus:ring-0 flex items-center gap-2">
                      <RotateCcw className="w-4 h-4" />
                      Refresh
                    </button>
                  )}
                  <button className="glass-button hover:glass-panel-strong border border-white/20 text-black rounded-xl px-4 py-3 transition-all duration-300 focus:outline-none focus:ring-0 flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    Filter
                  </button>
                </div>
              </div>
              
              {/* Selection Mode Banner */}
              {isSelectionMode && (
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

              {/* Category and Order Filters for Pixabay */}
              {isPixabayMode && (
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pointer-events-auto">
                  {/* Category Filters */}
                  <div className="flex flex-wrap gap-2 pointer-events-auto">
                    {['all', 'photos', 'videos'].map((category) => (
                      <button
                        key={category}
                        onClick={() => {
                          setSelectedCategory(category)
                          resetPixabaySearch()
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                          selectedCategory === category
                            ? "bg-purple-500/20 text-purple-200 border border-purple-400/30"
                            : "bg-gradient-to-br from-white/[0.4] via-white/[0.2] to-white/[0.05] text-white/70 border border-white/30 hover:from-white/[0.5] hover:via-white/[0.25] hover:to-white/[0.1] hover:text-white/90 backdrop-blur-[35x] backdrop-saturate-[200%] shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] hover:shadow-[inset_0_2px_0_rgba(255,255,255,0.5)] hover:scale-105"
                        }`}
                      >
                        {category === 'all' ? 'Alle' : category === 'photos' ? 'Fotos' : 'Videos'}
                      </button>
                    ))}
                  </div>
                  
                  {/* Order Filter */}
                  <div className="flex items-center gap-2">
                    <span className="text-white/60 text-sm">Sortieren nach:</span>
                    <select
                      value={pixabayOrder}
                      onChange={(e) => {
                        setPixabayOrder(e.target.value as 'popular' | 'latest')
                        resetPixabaySearch()
                      }}
                      className="px-3 py-1 bg-gradient-to-br from-white/[0.15] via-white/[0.08] to-transparent border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-purple-400/30 transition-all duration-300 backdrop-blur-[20px]"
                    >
                      <option value="popular" className="bg-gray-800">Beliebteste</option>
                      <option value="latest" className="bg-gray-800">Neueste</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Media Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {isPixabayMode ? (
                  /* Pixabay Results */
                  pixabayResults.length > 0 ? (
                    <>
                      {pixabayResults.map((item) => (
                        <motion.div
                          key={item.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <EnhancedLiquidGlass
                            variant="editor"
                            intensity="premium"
                            animation="glow"
                            gradient={true}
                            borderGlow={true}
                            className={`cursor-pointer transition-all duration-500 p-6 hover:scale-[1.03] hover:shadow-[0_32px_96px_rgba(255,255,255,0.15),0_16px_48px_rgba(255,255,255,0.08),inset_0_2px_0_rgba(255,255,255,0.3)] ${
                              isSelectionMode && selectedMediaIds.has(item.id.toString()) 
                                ? 'ring-2 ring-teal-400/50 bg-teal-100/40 border-teal-400/60' 
                                : ''
                            }`}
                          >
                            <div className="aspect-square rounded-xl bg-gradient-to-br from-white/[0.35] via-white/[0.15] to-white/[0.05] mb-4 flex items-center justify-center relative overflow-hidden backdrop-blur-[40px] backdrop-saturate-[200%] border border-white/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_8px_32px_rgba(255,255,255,0.1)]">
                              <img 
                                src={item.webformatURL} 
                                alt={item.tags}
                                className="w-full h-full object-cover rounded-lg cursor-pointer transition-transform duration-300 hover:scale-105"
                                onClick={() => {
                                  // If selection mode is active, toggle selection instead of showing preview
                                  if (isSelectionMode) {
                                    const itemId = item.id.toString()
                                    setSelectedMediaIds(prev => {
                                      const newSet = new Set(prev)
                                      if (newSet.has(itemId)) {
                                        newSet.delete(itemId)
                                      } else {
                                        newSet.add(itemId)
                                      }
                                      return newSet
                                    })
                                  } else {
                                    // In preview mode, show the preview modal
                                    setPreviewImage(item)
                                    setShowPreviewModal(true)
                                  }
                                }}
                                loading="lazy"
                              />
                              
                              {/* Action Buttons Overlay */}
                              <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2 rounded-lg">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setPreviewImage(item)
                                    setShowPreviewModal(true)
                                  }}
                                  className="bg-gradient-to-br from-white/[0.6] via-white/[0.3] to-white/[0.1] backdrop-blur-[35px] backdrop-saturate-[200%] border border-white/60 rounded-full p-3 hover:from-white/[0.7] hover:via-white/[0.4] hover:to-white/[0.15] transition-all duration-500 shadow-[0_16px_48px_rgba(255,255,255,0.2),inset_0_1px_0_rgba(255,255,255,0.5)] hover:shadow-[0_24px_64px_rgba(255,255,255,0.3),inset_0_2px_0_rgba(255,255,255,0.6)] hover:scale-110"
                                >
                                  <Eye className="w-5 h-5 text-white drop-shadow-lg" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    addPixabayMedia(item)
                                  }}
                                  className="bg-gradient-to-br from-white/[0.6] via-white/[0.3] to-white/[0.1] backdrop-blur-[35x] backdrop-saturate-[200%] border border-white/60 rounded-full p-3 hover:from-white/[0.7] hover:via-white/[0.4] hover:to-white/[0.15] transition-all duration-500 shadow-[0_16px_48px_rgba(255,255,255,0.2),inset_0_1px_0_rgba(255,255,255,0.5)] hover:shadow-[0_24px_64px_rgba(255,255,255,0.3),inset_0_2px_0_rgba(255,255,255,0.6)] hover:scale-110"
                                >
                                  <Plus className="w-5 h-5 text-white drop-shadow-lg" />
                                </button>
                              </div>
                              
                              {/* Type indicator */}
                              <div className="absolute top-3 left-3 bg-gradient-to-br from-white/[0.7] via-white/[0.4] to-white/[0.2] backdrop-blur-[30px] backdrop-saturate-[200%] border border-white/50 rounded-full px-3 py-1.5 shadow-[0_8px_32px_rgba(255,255,255,0.2),inset_0_1px_0_rgba(255,255,255,0.6)]">
                                <span className="text-xs text-black font-semibold drop-shadow-sm">
                                  {item.type === 'video' ? 'video' : 'image'}
                                </span>
                              </div>
                              
                              {/* Stats */}
                              <div className="absolute top-3 right-3 flex items-center gap-1.5 text-black text-xs bg-gradient-to-br from-white/[0.7] via-white/[0.4] to-white/[0.2] backdrop-blur-[30px] backdrop-saturate-[200%] rounded-full px-3 py-1.5 shadow-[0_8px_32px_rgba(255,255,255,0.2),inset_0_1px_0_rgba(255,255,255,0.6)]">
                                <Heart className="w-3 h-3 drop-shadow-sm" />
                                <span className="font-semibold drop-shadow-sm">{item.likes}</span>
                              </div>
                              
                              {/* Selection Indicator for Pixabay Images */}
                              {isSelectionMode && selectedMediaIds.has(item.id.toString()) && (
                                <div className="absolute inset-0 bg-gradient-to-br from-teal-500/40 via-teal-400/30 to-teal-300/20 flex items-center justify-center rounded-xl backdrop-blur-[25px]">
                                  <div className="bg-gradient-to-br from-white/[0.8] via-white/[0.5] to-white/[0.3] backdrop-blur-[35px] backdrop-saturate-[200%] border border-white/70 rounded-full p-3 shadow-[0_16px_48px_rgba(255,255,255,0.3),inset_0_2px_0_rgba(255,255,255,0.7)] animate-pulse">
                                    <CheckCircle className="w-7 h-7 text-teal-600 drop-shadow-lg" />
                                  </div>
                                </div>
                              )}
                            </div>
                            <h3 className="font-medium text-black text-sm truncate mb-2 glass-text-shadow">
                              {item.tags.split(',')[0] || 'Untitled'}
                            </h3>
                            <div className="flex items-center justify-between text-xs text-gray-600 glass-text-shadow">
                              <span>by {item.user}</span>
                              <span>{item.views} views</span>
                            </div>
                          </EnhancedLiquidGlass>
                        </motion.div>
                      ))}
                      
                      {/* Load More Button */}
                      {hasMorePages && (
                        <div className="col-span-full flex justify-center mt-6">
                          <button
                            onClick={loadNextPage}
                            disabled={isPixabayLoading}
                            className="px-6 py-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 text-black border border-purple-400/30 rounded-xl transition-all duration-300 focus:outline-none focus:ring-0 flex items-center gap-2 disabled:opacity-50"
                          >
                            {isPixabayLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                            Mehr laden ({pixabayPage}/{pixabayTotalPages})
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    /* Pixabay Empty State */
                    <div className="col-span-full text-center py-12">
                      <EnhancedLiquidGlass
                        variant="editor"
                        intensity="premium"
                        animation="pulse"
                        gradient={true}
                        borderGlow={true}
                        className="rounded-full p-8 mx-auto w-24 h-24 flex items-center justify-center mb-6 shadow-[0_24px_64px_rgba(255,255,255,0.15),inset_0_2px_0_rgba(255,255,255,0.4)]"
                      >
                        <Search className="w-10 h-10 text-white/70 drop-shadow-lg" />
                      </EnhancedLiquidGlass>
                      <h3 className="text-lg font-semibold text-black mb-2">
                        Pixabay durchsuchen
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Geben Sie einen Suchbegriff ein, um Fotos und Videos von Pixabay zu finden
                      </p>
                      {!user && (
                        <div className="bg-orange-500/10 border border-orange-400/30 rounded-lg p-4 max-w-md mx-auto">
                                                  <p className="text-orange-800 text-sm">
                          Bitte melden Sie sich an, um Pixabay nach Stockfotos und Videos zu durchsuchen
                        </p>
                        </div>
                      )}
                    </div>
                  )
                ) : (
                  /* Local Media Files */
                  <>
                    {/* Upload Card - Always first */}
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="relative">
                        <input
                          type="file"
                          multiple
                          accept="image/*,video/*"
                          onChange={(e) => {
                            if (e.target.files) {
                              const files = Array.from(e.target.files)
                              const newMediaFiles = files.map((file, index) => ({
                                id: `${Date.now()}-${index}`,
                                filename: file.name,
                                original_filename: file.name,
                                storage_url: URL.createObjectURL(file),
                                thumbnail_url: URL.createObjectURL(file),
                                file_type: file.type.startsWith('video/') ? 'video' : 'image',
                                file_size: file.size,
                                processing_status: 'completed',
                                created_at: new Date().toISOString()
                              }))
                              
                              handleProjectDataChange(1, [...projectData.mediaFiles, ...newMediaFiles])
                              toast.success(`${files.length} file${files.length > 1 ? 's' : ''} uploaded successfully!`)
                            }
                            e.target.value = ''
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <EnhancedLiquidGlass
                          variant="editor"
                          intensity="premium"
                          animation="glow"
                          gradient={true}
                          borderGlow={true}
                          className="cursor-pointer transition-all duration-500 p-6 border-2 border-dashed border-white/40 rounded-2xl hover:border-white/60 hover:scale-[1.02] hover:shadow-[0_32px_96px_rgba(255,255,255,0.15),0_16px_48px_rgba(255,255,255,0.08)]"
                        >
                          <div className="aspect-square rounded-xl bg-gradient-to-br from-white/[0.4] via-white/[0.2] to-white/[0.05] mb-4 flex flex-col items-center justify-center backdrop-blur-[40px] backdrop-saturate-[200%] border border-white/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_8px_32px_rgba(255,255,255,0.15)]">
                            <div className="w-16 h-16 bg-gradient-to-r from-teal-500/20 to-cyan-500/20 rounded-full flex items-center justify-center mb-3">
                              <Upload className="w-8 h-8 text-teal-300" />
                            </div>
                            <p className="text-sm font-medium text-black text-center">
                              Media hochladen
                            </p>
                            <p className="text-xs text-gray-600 text-center mt-1">
                              Bilder & Videos
                            </p>
                          </div>
                          <h3 className="font-medium text-black text-sm text-center mb-2">
                            Neue Medien hinzufügen
                          </h3>
                          <div className="text-center text-xs text-gray-600">
                            <span>Klicken zum Auswählen</span>
                          </div>
                        </EnhancedLiquidGlass>
                      </div>
                    </motion.div>

                    {/* Existing Media Files */}
                    {projectData.mediaFiles.map((file, index) => {
                      const fileId = file.id || file.filename
                      const isSelected = selectedMediaIds.has(fileId)
                      
                      return (
                        <motion.div
                          key={fileId}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <EnhancedLiquidGlass
                            variant="editor"
                            intensity="premium"
                            animation="glow"
                            gradient={true}
                            borderGlow={true}
                            className={`cursor-pointer transition-all duration-500 p-6 hover:scale-[1.03] hover:shadow-[0_32px_96px_rgba(255,255,255,0.15),0_16px_48px_rgba(255,255,255,0.08),inset_0_2px_0_rgba(255,255,255,0.3)] ${
                              isSelected 
                                ? 'ring-2 ring-orange-400/50 bg-orange-100/40 border-orange-400/60' 
                                : ''
                            }`}
                            onClick={() => {
                              // If selection mode is active, toggle selection
                              if (isSelectionMode) {
                                toggleMediaSelection(fileId)
                              } else {
                                // In preview mode, show the media preview modal
                                setPreviewMedia({
                                  id: file.id || file.filename,
                                  storage_url: file.storage_url || file.url,
                                  thumbnail_url: file.thumbnail_url,
                                  filename: file.filename || file.name,
                                  file_type: file.file_type || (file.type?.startsWith('video/') ? 'video' : 'image'),
                                  duration: file.duration,
                                  width: file.width,
                                  height: file.height,
                                  alt_text: file.alt_text
                                })
                                setPreviewModalOpen(true)
                              }
                            }}
                          >
                            <div className="aspect-square rounded-xl bg-gradient-to-br from-white/[0.35] via-white/[0.15] to-white/[0.05] mb-4 flex items-center justify-center relative overflow-hidden backdrop-blur-[40px] backdrop-saturate-[200%] border border-white/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_8px_32px_rgba(255,255,255,0.1)]">
                              {file.thumbnail_url || file.storage_url ? (
                                file.file_type === 'video' ? (
                                  <video 
                                    src={file.storage_url} 
                                    className="w-full h-full object-cover rounded-lg"
                                    muted
                                  />
                                ) : (
                                  <img 
                                    src={file.thumbnail_url || file.storage_url} 
                                    alt={file.filename}
                                    className="w-full h-full object-cover rounded-lg"
                                  />
                                )
                              ) : (
                                file.file_type === 'video' ? (
                                  <Video className="w-8 h-8 text-white/40" />
                                ) : (
                                  <Image className="w-8 h-8 text-white/40" />
                                )
                              )}
                              
                              {/* Selection Overlay - matching video merger design */}
                              {isSelected && (
                                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/40 via-orange-400/30 to-orange-300/20 flex items-center justify-center rounded-xl backdrop-blur-[25px]">
                                  <div className="bg-gradient-to-br from-white/[0.8] via-white/[0.5] to-white/[0.3] backdrop-blur-[35px] backdrop-saturate-[200%] border border-white/70 rounded-full p-3 shadow-[0_16px_48px_rgba(255,255,255,0.3),inset_0_2px_0_rgba(255,255,255,0.7)] animate-pulse">
                                    <CheckCircle className="w-7 h-7 text-orange-600 drop-shadow-lg" />
                                  </div>
                                </div>
                              )}
                              
                              <div className="absolute top-3 left-3 bg-gradient-to-br from-white/[0.7] via-white/[0.4] to-white/[0.2] backdrop-blur-[30px] backdrop-saturate-[200%] border border-white/50 rounded-full px-3 py-1.5 shadow-[0_8px_32px_rgba(255,255,255,0.2),inset_0_1px_0_rgba(255,255,255,0.6)]">
                                                              <span className="text-xs text-black font-semibold drop-shadow-sm">
                                {file.file_type}
                              </span>
                              </div>
                              {file.processing_status && file.processing_status !== 'completed' && (
                                <div className="absolute bottom-3 left-3 bg-gradient-to-br from-white/[0.7] via-white/[0.4] to-white/[0.2] backdrop-blur-[30px] backdrop-saturate-[200%] border border-white/50 rounded-full px-3 py-1.5 shadow-[0_8px_32px_rgba(255,255,255,0.2),inset_0_1px_0_rgba(255,255,255,0.6)]">
                                                                  <span className="text-xs text-black font-semibold drop-shadow-sm">
                                  {file.processing_status}
                                </span>
                                </div>
                              )}
                            </div>
                            <h3 className="font-medium text-black text-sm truncate mb-2">
                              {file.original_filename || file.filename}
                            </h3>
                            <div className="flex items-center justify-between text-xs text-gray-600">
                              <span>{file.file_size ? `${Math.round(file.file_size / 1024)}KB` : 'Unknown size'}</span>
                              <span>{file.created_at ? new Date(file.created_at).toLocaleDateString() : 'Today'}</span>
                            </div>
                          </EnhancedLiquidGlass>
                        </motion.div>
                      )
                    })}
                  </>
                )}
              </div>

              {/* Empty State */}
              {projectData.mediaFiles.length === 0 && (
                <div className="text-center py-12">
                  <EnhancedLiquidGlass
                    variant="editor"
                    intensity="premium"
                    animation="pulse"
                    gradient={true}
                    borderGlow={true}
                    className="rounded-full p-8 mx-auto w-24 h-24 flex items-center justify-center mb-6 shadow-[0_24px_64px_rgba(255,255,255,0.15),inset_0_2px_0_rgba(255,255,255,0.4)]"
                  >
                    <Image className="w-10 h-10 text-white/70 drop-shadow-lg" />
                  </EnhancedLiquidGlass>
                  <h3 className="text-lg font-semibold text-black mb-2">
                    Kein Rohmaterial gefunden
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Laden Sie Ihre ersten Medien hoch, um zu beginnen.
                  </p>
                </div>
              )}
            </div>
            
            {/* Selection Summary and Continue Button */}
            {/* Removed file selection summary and continue button */}
          </div>
        )
      
      case 2:
        // Proceed Options step (UI only)
        return (
          <div className="space-y-8">
            <EnhancedLiquidGlass variant="editor" intensity="premium" className="p-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-black mb-2">Choose how to proceed</h3>
                <p className="text-gray-600">
                  {projectData.mediaFiles.length >= 2 && projectData.mediaFiles.every(f => (f.file_type || '').startsWith('image'))
                    ? `You selected ${projectData.mediaFiles.length} photos. Pick a workflow to continue.`
                    : 'Pick a workflow to continue.'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {[
                  { key: 'upscale', name: 'AI Upscale', desc: 'Increase resolution and clarity for all selected photos', icon: Wand2, accent: 'from-blue-500/20 to-cyan-500/20' },
                  { key: 'interior', name: 'Interior Staging', desc: 'Apply AI interior styles to selected room photos', icon: Home, accent: 'from-emerald-500/20 to-teal-500/20' },
                  { key: 'video-clips', name: 'Create Video Clips', desc: 'Turn your photos into a video with transitions and music', icon: Play, accent: 'from-purple-500/20 to-pink-500/20' },
                  { key: 'carousel', name: 'Social Carousel', desc: 'Arrange photos into a carousel/collage for posts', icon: Layers, accent: 'from-orange-500/20 to-amber-500/20' },
                  { key: 'batch-crop', name: 'Batch Crop & Resize', desc: 'Set aspect ratios for platforms (9:16, 1:1, 16:9)', icon: Gauge, accent: 'from-indigo-500/20 to-sky-500/20' },
                  { key: 'background-removal', name: 'Background Cleanup', desc: 'Remove/blur backgrounds for product-like shots', icon: Scissors, accent: 'from-rose-500/20 to-red-500/20' },
                ].map((opt) => (
                  <div
                    key={opt.key}
                    onClick={() => setChosenProceedOption(opt.key)}
                    className={`p-5 rounded-2xl border cursor-pointer transition-all duration-300 backdrop-blur-[35px] ${
                      chosenProceedOption === opt.key
                        ? 'border-teal-400/60 bg-gradient-to-br from-teal-500/15 to-cyan-500/10 shadow-[0_16px_48px_rgba(20,184,166,0.25)]'
                        : 'border-white/30 bg-gradient-to-br from-white/40 via-white/20 to-white/10 hover:from-white/50 hover:via-white/25 hover:to-white/15'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-r ${opt.accent} border border-white/30`}>
                      <opt.icon className="w-5 h-5 text-black" />
                    </div>
                    <h4 className="text-black font-semibold mb-1">{opt.name}</h4>
                    <p className="text-gray-600 text-sm mb-4">{opt.desc}</p>
                    {opt.key === 'video-clips' && (
                      <div className="flex items-center gap-3 text-xs text-gray-700">
                        <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-white/40 border border-white/30"><Music className="w-3 h-3" /> Music: Auto</div>
                        <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-white/40 border border-white/30"><Clock className="w-3 h-3" /> Clip: 2–3s</div>
                      </div>
                    )}
                    {opt.key === 'batch-crop' && (
                      <div className="flex items-center gap-2 text-xs text-gray-700">
                        {['9:16', '1:1', '16:9'].map(r => (
                          <span key={r} className="px-2 py-1 rounded-lg bg-white/40 border border-white/30">{r}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6 text-center">
                <Button
                  onClick={() => {
                    if (!chosenProceedOption) {
                      toast.error('Please select how you want to proceed')
                      return
                    }
                    toast.success(`${chosenProceedOption.replace('-', ' ')} selected`, { icon: '✨' })
                    handleMilestoneComplete(2)
                  }}
                  disabled={!chosenProceedOption}
                  className="px-6 py-3 bg-gradient-to-r from-teal-500/30 to-cyan-500/30 border border-teal-400/40 rounded-xl text-black hover:from-teal-500/40 hover:to-cyan-500/40 transition-all duration-300"
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </EnhancedLiquidGlass>
          </div>
        )
      
      case 3:
        return (
          <>
            {/* Launch button to open full-screen builder */}
            {!showOverlay && (
              <div className="flex justify-end">
                <Button onClick={() => setShowOverlay(true)} className="px-4 py-2">Open Builder</Button>
              </div>
            )}
            {/* Dimmed background overlay */}
            {showOverlay && (
              // Lower overlay z-index so dialogs/modals can appear above
              <div className="fixed inset-0 z-[200000] bg-black/40 backdrop-blur-sm" onClick={() => setShowOverlay(false)} />
            )}
            {/* Floating modal container (full screen) */}
            {showOverlay && createPortal(
              <div className="fixed inset-0 z-[200005]">
                <div className="h-full w-full overflow-hidden flex flex-col bg-gradient-to-br from-white via-white/80 to-white">
                  {/* Header removed for immersive canvas */}
                  {/* Body - Full-width Builder (assets/emojis/pixabay removed) */}
                  <div className="flex-1 grid grid-cols-12 gap-4 p-4">
                {/* Canvas + Right Dock (Full width) */}
                <div className="col-span-12 relative">
                  <div
                    ref={canvasWrapperRef}
                    id="editor-canvas"
                    className="relative w-full rounded-2xl border border-white/50 bg-white/60 overflow-hidden backdrop-blur-xl shadow-lg"
                     style={{ height: `calc(100vh - 90px)` }}
                    onWheel={(e) => {
                      if ((e as any).ctrlKey) {
                        e.preventDefault()
                        const delta = -e.deltaY
                        const factor = delta > 0 ? 1.06 : 0.94
                        setCanvasScale(prev => Math.min(2.5, Math.max(0.3, prev * factor)))
                      } else if (isSpaceHeld) {
                        // horizontal/vertical pan on wheel when space is held
                        setCanvasTranslate(prev => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }))
                      }
                    }}
                    onMouseDown={(e) => {
                      if (isSpaceHeld) {
                        setIsPanning(true)
                        panLastPoint.current = { x: e.clientX, y: e.clientY }
                        panVelocity.current = { vx: 0, vy: 0 }
                      } else {
                        // start marquee selection on empty canvas click
                        if (e.target === e.currentTarget) {
                          setIsMarqueeSelecting(true)
                          const rect = e.currentTarget.getBoundingClientRect()
                          const start = { x: e.clientX - rect.left, y: e.clientY - rect.top }
                          setMarqueeStart(start)
                          setMarqueeRect({ x: start.x, y: start.y, w: 0, h: 0 })
                        }
                      }
                    }}
                    onMouseMove={(e) => {
                      if (isPanning && panLastPoint.current) {
                        const dx = e.clientX - panLastPoint.current.x
                        const dy = e.clientY - panLastPoint.current.y
                        panLastPoint.current = { x: e.clientX, y: e.clientY }
                        setCanvasTranslate(prev => ({ x: prev.x + dx, y: prev.y + dy }))
                        panVelocity.current = { vx: dx, vy: dy }
                      }
                      if (isMarqueeSelecting && marqueeStart) {
                        const rect = e.currentTarget.getBoundingClientRect()
                        const x = e.clientX - rect.left
                        const y = e.clientY - rect.top
                        const w = x - marqueeStart.x
                        const h = y - marqueeStart.y
                        const mx = Math.min(marqueeStart.x, x)
                        const my = Math.min(marqueeStart.y, y)
                        const mw = Math.abs(w)
                        const mh = Math.abs(h)
                        setMarqueeRect({ x: mx, y: my, w: mw, h: mh })
                        // compute selection on the transformed inner canvas coordinates
                        const inner = document.getElementById('editor-canvas-inner') as HTMLElement | null
                        const innerRect = inner?.getBoundingClientRect()
                        if (innerRect) {
                          const transformed = { x: mx - innerRect.left, y: my - innerRect.top, w: mw, h: mh }
                          const nextSel = new Set<string>()
                          for (const c of timelineClips) {
                            const left = (c.x ?? 40)
                            const top = (c.y ?? 60)
                            const widthPx = Math.max(48, Math.min(720, c.length * PX_PER_SECOND))
                            const inX = left < transformed.x + transformed.w && left + widthPx > transformed.x
                            const inY = top < transformed.y + transformed.h && top + 140 > transformed.y
                            if (inX && inY) nextSel.add(c.id)
                          }
                          setSelectedIds(nextSel)
                        }
                      }
                    }}
                    onMouseUp={() => {
                      if (isPanning) {
                        setIsPanning(false)
                        // inertia
                        if (panRaf.current) cancelAnimationFrame(panRaf.current)
                        const decay = 0.92
                        const step = () => {
                          panVelocity.current.vx *= decay
                          panVelocity.current.vy *= decay
                          if (Math.hypot(panVelocity.current.vx, panVelocity.current.vy) < 0.5) return
                          setCanvasTranslate(prev => ({ x: prev.x + panVelocity.current.vx, y: prev.y + panVelocity.current.vy }))
                          panRaf.current = requestAnimationFrame(step)
                        }
                        panRaf.current = requestAnimationFrame(step)
                      }
                      if (isMarqueeSelecting) {
                        setIsMarqueeSelecting(false)
                        setMarqueeStart(null)
                        setMarqueeRect(null)
                      }
                    }}
                    
                    onContextMenu={(e) => { e.preventDefault(); setContextMenu({ open: true, x: e.clientX, y: e.clientY, target: 'canvas' }) }}
                  >
                    {/* Builder Toolbar */}
                    <div className="absolute top-3 left-4 right-4 z-[200005] flex items-center justify-between pointer-events-auto" onMouseDown={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                      <div className="pointer-events-auto" onPointerDown={(e) => e.stopPropagation()}>
                        <GlassSurface width="auto" height="auto" borderRadius={36} backgroundOpacity={0.10} distortionScale={-55} redOffset={6} greenOffset={2} blueOffset={-4} displace={0.6} className="px-4 py-3" contentClassName="flex items-center gap-2">
                        <button type="button" title="Add Node" className="px-3 py-2 text-sm rounded-2xl border border-white/50 bg-white/30 text-white hover:bg-white/40 shadow-[0_8px_24px_rgba(0,0,0,0.12)] flex items-center gap-2" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsCommandPaletteOpen(true) }} onPointerDown={(e) => e.stopPropagation()}>
                          <Plus className="w-4 h-4" /> Add
                        </button>
                        <button type="button" title="Connect Mode" className={`px-3 py-2 text-sm rounded-2xl border ${isConnecting ? 'border-white/70 bg-white/40 text-white' : 'border-white/50 bg-white/30 text-white hover:bg-white/40'}`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsConnecting(v => !v) }} onPointerDown={(e) => e.stopPropagation()}>
                          <Layers className="w-4 h-4" /> Connect
                        </button>
                        <button type="button" title="Align to grid" className="px-3 py-2 text-sm rounded-2xl border border-white/50 bg-white/30 text-white hover:bg-white/40" onClick={(e) => {
                          e.preventDefault(); e.stopPropagation();
                          pushHistory()
                          setTimelineClips(prev => prev.map(c => ({ ...c, x: Math.round((c.x || 0)/GRID)*GRID, y: Math.round((c.y || 0)/GRID)*GRID })))
                        }}>
                          <Gauge className="w-4 h-4" /> Align
                        </button>
                        <button type="button" title="Group" className="px-3 py-2 text-sm rounded-2xl border border-white/50 bg-white/30 text-white hover:bg-white/40" onClick={(e) => {
                          e.preventDefault(); e.stopPropagation();
                          if (selectedIds.size === 0) return
                          pushHistory()
                          const gid = `group-${Date.now()}`
                          setGroups(prev => [...prev, { id: gid, children: Array.from(selectedIds) }])
                        }}>Group</button>
                        <button type="button" title="Ungroup" className="px-3 py-2 text-sm rounded-2xl border border-white/50 bg-white/30 text-white hover:bg-white/40" onClick={(e) => {
                          e.preventDefault(); e.stopPropagation();
                          if (selectedIds.size === 0) return
                          pushHistory()
                          setGroups(prev => prev.filter(g => !g.children.some(id => selectedIds.has(id))))
                        }}>Ungroup</button>
                        <button type="button" title="Snap toggle" className={`px-3 py-2 text-sm rounded-2xl border ${snapEnabled ? 'border-white/70 bg-white/40 text-white' : 'border-white/50 bg-white/30 text-white hover:bg-white/40'}`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSnapEnabled(v => !v) }}>
                          <Magnet className="w-4 h-4" /> Snap
                        </button>
                        <button type="button" title="Undo" className="px-3 py-2 text-sm rounded-2xl border border-white/50 bg-white/30 text-white hover:bg-white/40" onClick={(e) => { e.preventDefault(); e.stopPropagation(); undo() }}>
                          <Undo2 className="w-4 h-4" />
                        </button>
                        <button type="button" title="Redo" className="px-3 py-2 text-sm rounded-2xl border border-white/50 bg-white/30 text-white hover:bg-white/40" onClick={(e) => { e.preventDefault(); e.stopPropagation(); redo() }}>
                          <Redo2 className="w-4 h-4" />
                        </button>
                        <div className="ml-1 flex items-center gap-1">
                          <button type="button" className="px-2 py-1 text-xs rounded-lg border border-white/40 bg-white/60" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCanvasScale(s => Math.min(2.5, s * 1.1)) }}><ZoomIn className="w-4 h-4" /></button>
                          <button type="button" className="px-2 py-1 text-xs rounded-lg border border-white/40 bg-white/60" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCanvasScale(s => Math.max(0.3, s / 1.1)) }}><ZoomOut className="w-4 h-4" /></button>
                          <button type="button" className="px-2 py-1 text-xs rounded-lg border border-white/40 bg-white/60" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCanvasScale(1); setCanvasTranslate({ x: 0, y: 0 }) }}>Reset</button>
                        </div>
                        <button type="button" title="Marquee" className={`px-2 py-1 text-xs rounded-lg border ${isMarqueeSelecting ? 'border-indigo-400 bg-indigo-50' : 'border-white/40 bg-white/60'}`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsMarqueeSelecting(v => !v) }}>
                          <BoxSelect className="w-4 h-4" />
                        </button>
                        </GlassSurface>
                      </div>
                      <div className="pointer-events-auto" onPointerDown={(e) => e.stopPropagation()}>
                        <GlassSurface width="auto" height="auto" borderRadius={36} backgroundOpacity={0.10} distortionScale={-55} redOffset={6} greenOffset={2} blueOffset={-4} displace={0.6} className="px-4 py-3" contentClassName="flex items-center gap-2">
                        <button title="Theme" className="px-3 py-2 text-sm rounded-2xl border border-white/50 bg-white/30 text-white hover:bg-white/40" onClick={() => setIsDarkGlass(v => !v)}>{isDarkGlass ? 'Light' : 'Dark'}</button>
                        <select className="px-3 py-2 text-sm rounded-2xl border border-white/50 bg-white/30 text-white" value={gridDensity} onChange={e => setGridDensity(Number(e.target.value) as 8|16|24)}>
                          <option value={8}>Dense</option>
                          <option value={16}>Medium</option>
                          <option value={24}>Loose</option>
                        </select>
                        <div className="relative group">
                          <button 
                            type="button" 
                            title="Media Panel (Ctrl+M)" 
                            className={`px-4 py-2 text-sm rounded-2xl border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-300/50 cursor-pointer ${
                              isLeftMediaPanelOpen 
                                ? 'border-white/70 bg-white/40 text-white shadow-lg' 
                                : 'border-white/50 bg-white/30 hover:bg-white/40 text-white hover:shadow-md'
                            }`} 
                            onClick={(e) => { 
                              e.preventDefault(); 
                              e.stopPropagation(); 
                              setShowOnlyChosenInMediaPanel(true); 
                              // Toggle both the in-canvas panel and the high-priority dialog fallback
                              setIsLeftMediaPanelOpen(v => {
                                const newState = !v;
                                return newState;
                              });
                              setMediaDialogOpen(true);
                            }} 
                            onPointerDown={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-2">
                              <Image className="w-4 h-4" />
                              <span>Media</span>
                              {isLeftMediaPanelOpen && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                              )}
                            </div>
                          </button>
                          <button
                            type="button"
                            title="Add Audio"
                            className="px-4 py-2 text-sm rounded-2xl border border-white/50 bg-white/30 hover:bg-white/40 text-white hover:shadow-md"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAudioPopupOpen(true) }}
                            onPointerDown={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-2">
                              <Music className="w-4 h-4" />
                              <span>Audio</span>
                            </div>
                          </button>
                          
                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 bg-slate-800 text-white shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                            Media Library (Ctrl+M)
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800"></div>
                          </div>
                        </div>
                        <button type="button" title="Close" className="px-2 py-1 text-xs rounded-lg border border-white/40 bg-white/60 hover:bg-white/70" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowOverlay(false) }}>
                          Close
                        </button>
                        </GlassSurface>
                      </div>
                    </div>
                    {/* Inner transformed canvas */}
                    <div id="editor-canvas-inner" className="absolute inset-0 z-[1]" style={{ transform: `translate(${canvasTranslate.x}px, ${canvasTranslate.y}px) scale(${canvasScale})`, transformOrigin: '0 0' }}>
                      <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%">
                        {edges.map((edge, idx) => {
                          const from = timelineClips.find(c => c.id === edge.fromId)
                          const to = timelineClips.find(c => c.id === edge.toId)
                          if (!from || !to) return null
                          const a1 = getNodeAnchor(from).right
                          const a2 = getNodeAnchor(to).left
                          const dx = a2.x - a1.x
                          const dy = a2.y - a1.y
                          const dist = Math.hypot(dx, dy)
                          if (dist > CONNECT_THRESHOLD_PX) return null
                          const curvature = Math.max(60, Math.min(240, Math.abs(dx) * 0.6))
                          const c1x = a1.x + curvature
                          const c1y = a1.y
                          const c2x = a2.x - curvature
                          const c2y = a2.y
                          return (
                            <path key={`edge-${idx}`} d={`M ${a1.x} ${a1.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${a2.x} ${a2.y}`} fill="none" stroke="#a5b4fc" strokeWidth="2.5" filter="url(#softBlur)" />
                          )
                        })}
                        <defs>
                          <filter id="softBlur"><feGaussianBlur in="SourceGraphic" stdDeviation="0.35" /></filter>
                        </defs>
                        {isConnecting && connectingFromId && tempPointer && (() => {
                          const from = timelineClips.find(c => c.id === connectingFromId)
                          if (!from) return null
                          const a1 = getNodeAnchor(from).right
                          const rect = (document.getElementById('editor-canvas-inner') as HTMLElement)?.getBoundingClientRect()
                          if (!rect) return null
                          const x = tempPointer.x - rect.left
                          const y = tempPointer.y - rect.top
                          const curvature = 120
                          return (
                            <path d={`M ${a1.x} ${a1.y} C ${a1.x + curvature} ${a1.y}, ${x - curvature} ${y}, ${x} ${y}`} fill="none" stroke="#c4b5fd" strokeWidth={2} strokeDasharray="4 6" />
                          )
                        })()}
                      </svg>
                      <div className="absolute inset-0 p-6">
                        {timelineClips.map((clip, index) => {
                            const widthPx = Math.max(48, Math.min(720, clip.length * PX_PER_SECOND))
                            const left = clip.x ?? (40 + index * 160)
                            const top = clip.y ?? 60
                            const isSelected = selectedBlockId === clip.id
                            return (
                              <div
                                key={clip.id}
                                id={`block-${clip.id}`}
                                className={`absolute rounded-2xl ${isDarkGlass ? 'bg-slate-900/40' : 'bg-white/70'} backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.06)] border ${isSelected || selectedIds.has(clip.id) ? 'border-indigo-300 ring-2 ring-indigo-200' : 'border-white/60'} overflow-hidden cursor-grab active:cursor-grabbing select-none transition group`}
                                style={{ width: widthPx, height: 140, left, top }}
                                onMouseDown={(e) => handleBlockMouseDown(e, clip.id)}
                                onMouseEnter={() => { if (isConnecting) setHoveredBlockId(clip.id) }}
                                onMouseLeave={() => { if (hoveredBlockId === clip.id) setHoveredBlockId(null) }}
                                onClick={(e) => { e.stopPropagation(); setSelectedBlockId(clip.id); setSelectedIds(new Set([clip.id])); setShowSettingsPanel(true) }}
                                onContextMenu={(e) => { e.preventDefault(); setContextMenu({ open: true, x: e.clientX, y: e.clientY, target: 'block', blockId: clip.id }) }}
                              >
                                <div className="w-full h-24 bg-white/60">
                                  {clip.kind === 'image' && clip.src && (
                                    <img src={clip.thumbnail || clip.src} className="w-full h-full object-cover" />
                                  )}
                                  {clip.kind === 'video' && clip.src && (
                                    <video src={clip.src} muted playsInline className="w-full h-full object-cover pointer-events-none" />
                                  )}
                                  {(clip.kind === 'title' || clip.kind === 'emoji') && (
                                    <div className="w-full h-full flex items-center justify-center text-2xl text-slate-800">{clip.text}</div>
                                  )}
                                </div>
                                <div className="px-3 py-2 text-[11px] text-slate-700 flex items-center justify-between bg-white/70">
                                  <span className="capitalize">{clip.kind}</span>
                                  <span>{clip.length.toFixed(1)}s</span>
                                </div>
                                <div className="absolute left-0 top-0 h-full w-2 bg-white/50 hover:bg-white/80 cursor-ew-resize" />
                                <div className="absolute right-0 top-0 h-full w-2 bg-white/50 hover:bg-white/80 cursor-ew-resize" />
                                <div
                                  title="Connect"
                                  className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-indigo-200/80 border border-white shadow hover:bg-indigo-300 cursor-crosshair"
                                  onMouseDown={(e) => { e.stopPropagation(); setIsConnecting(true); setConnectingFromId(clip.id); window.addEventListener('mousemove', onWindowMouseMove); window.addEventListener('mouseup', onWindowMouseUp) }}
                                />
                                <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-sky-200/80 border border-white shadow" />
                                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                  <button className="px-2 py-1 text-[10px] bg-white/90 border rounded-lg shadow-sm" onClick={(e) => { e.stopPropagation(); setSelectedBlockId(clip.id); setShowSettingsPanel(true) }}>Edit</button>
                                  <button className="px-2 py-1 text-[10px] bg-white/90 border rounded-lg shadow-sm" onClick={(e) => { e.stopPropagation(); setTimelineClips(prev => prev.filter(c => c.id !== clip.id)); setEdges(prev => prev.filter(e => e.fromId !== clip.id && e.toId !== clip.id)) }}>Delete</button>
                                </div>
                              </div>
                            )
                          })}
                        {isMarqueeSelecting && marqueeRect && (
                          <div className="absolute border-2 border-indigo-400/70 bg-indigo-400/10" style={{ left: marqueeRect.x, top: marqueeRect.y, width: marqueeRect.w, height: marqueeRect.h }} />
                        )}
                      </div>
                    </div>
                    {/* Minimap */}
                    <div ref={minimapRef} className="absolute bottom-3 right-3 z-[3] w-44 h-28 rounded-lg border border-white/50 bg-white/70 backdrop-blur p-1 shadow">
                      <div className="relative w-full h-full overflow-hidden rounded">
                        {/* viewport rectangle */}
                        <div className="absolute border border-indigo-400/70 bg-indigo-400/10"
                          style={{ left: Math.max(0, (-canvasTranslate.x) * 0.15), top: Math.max(0, (-canvasTranslate.y) * 0.15), width: Math.max(20, (canvasWrapperRef.current?.clientWidth || 0) * 0.15 / canvasScale), height: Math.max(20, (canvasWrapperRef.current?.clientHeight || 0) * 0.15 / canvasScale) }}
                        />
                        {/* click to jump */}
                        <div className="absolute inset-0" onClick={(e) => {
                          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
                          const x = e.clientX - rect.left
                          const y = e.clientY - rect.top
                          // convert from minimap to canvas translate
                          const targetX = -x / 0.15
                          const targetY = -y / 0.15
                          setCanvasTranslate({ x: targetX + (canvasWrapperRef.current?.clientWidth || 0) / 2, y: targetY + (canvasWrapperRef.current?.clientHeight || 0) / 2 })
                        }} />
                      </div>
                    </div>
                    {/* Right folding dock removed per request */}
                  </div>

                  {/* Actions removed — consolidated into bottom action bar */}
                </div>
                {/* Workflow Inspector */}
                <div className="col-span-12 md:col-span-3">
                  <div className="rounded-2xl border border-white/50 bg-white/70 backdrop-blur p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-sm font-semibold">Workflow Inspector</h5>
                      <span className="text-xs text-slate-600">Health</span>
                    </div>
                    {(() => {
                      // compute health and warnings
                      const orphanInputs: string[] = []
                      const orphanOutputs: string[] = []
                      const clipById: Record<string, TimelineClip> = {}
                      for (const c of timelineClips) clipById[c.id] = c
                      const inDegree: Record<string, number> = {}
                      const outDegree: Record<string, number> = {}
                      for (const e of edges) {
                        outDegree[e.fromId] = (outDegree[e.fromId] || 0) + 1
                        inDegree[e.toId] = (inDegree[e.toId] || 0) + 1
                      }
                      for (const c of timelineClips) {
                        const cat = getNodeCategory(c)
                        const indeg = inDegree[c.id] || 0
                        const outdeg = outDegree[c.id] || 0
                        if ((cat === 'action' || cat === 'output') && indeg === 0) orphanInputs.push(c.id)
                        if ((cat === 'media' || cat === 'caption' || cat === 'action') && outdeg === 0) orphanOutputs.push(c.id)
                      }
                      return (
                        <div className="space-y-2">
                          <div className="text-xs text-slate-700">Nodes: {timelineClips.length} • Connections: {edges.length}</div>
                          {orphanInputs.length > 0 && (
                            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">Warnings: {orphanInputs.length} nodes have no inputs</div>
                          )}
                          {orphanOutputs.length > 0 && (
                            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">Warnings: {orphanOutputs.length} nodes are not connected to any output</div>
                          )}
                          <div className="pt-2 border-t border-white/40">
                            <div className="text-xs font-semibold mb-1">Templates</div>
                            <div className="grid grid-cols-2 gap-2">
                              <button className="text-xs px-2 py-1 rounded-lg border border-white/40 bg-white/60" onClick={() => {
                                pushHistory()
                                // scaffold: Video → Auto-caption (action) → Overlay (action) → Export (output)
                                const idBase = Date.now()
                                const v: TimelineClip = { id: `n-${idBase}-v`, kind: 'video', src: '', start: 0, length: 5, position: 'center', scale: 1, x: 60, y: 60 }
                                const ac: TimelineClip = { id: `n-${idBase}-ac`, kind: 'action', text: 'Auto-caption', start: 0, length: 1.5, x: 300, y: 60 }
                                const ov: TimelineClip = { id: `n-${idBase}-ov`, kind: 'action', text: 'Overlay', start: 0, length: 1.5, x: 520, y: 60 }
                                const out: TimelineClip = { id: `n-${idBase}-out`, kind: 'output', text: 'Export', start: 0, length: 1, x: 740, y: 60 }
                                setTimelineClips(prev => [...prev, v, ac, ov, out])
                                setEdges(prev => [...prev, { fromId: v.id, toId: ac.id }, { fromId: ac.id, toId: ov.id }, { fromId: ov.id, toId: out.id }])
                              }}>Video → Auto-caption</button>
                              <button className="text-xs px-2 py-1 rounded-lg border border-white/40 bg-white/60" onClick={() => {
                                pushHistory()
                                // scaffold: Image → Emoji (caption) → Export
                                const idBase = Date.now()
                                const img: TimelineClip = { id: `n-${idBase}-i`, kind: 'image', src: '', start: 0, length: 3, x: 60, y: 160 }
                                const em: TimelineClip = { id: `n-${idBase}-e`, kind: 'emoji', text: '✨', start: 0, length: 1, x: 300, y: 160 }
                                const out: TimelineClip = { id: `n-${idBase}-o`, kind: 'output', text: 'Export', start: 0, length: 1, x: 520, y: 160 }
                                setTimelineClips(prev => [...prev, img, em, out])
                                setEdges(prev => [...prev, { fromId: img.id, toId: em.id }, { fromId: em.id, toId: out.id }])
                              }}>Image → Emoji</button>
                  </div>
                </div>
                  </div>
                      )
                    })()}
                      </div>
                    </div>
                  </div>
                  {/* Floating bottom-center action bar (glassmorphic) */}
                  <motion.div
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 240, damping: 24 }}
                    className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10015]"
                  >
                    <GlassSurface width="auto" height="auto" borderRadius={40} backgroundOpacity={0.10} distortionScale={-55} redOffset={6} greenOffset={2} blueOffset={-4} displace={0.6} className="px-5 py-3" contentClassName="flex items-center gap-3 text-white">
                      <button
                        onClick={() => {
                          // Back to previous step if exists
                          const prevStep = Math.max(1, currentStep - 1)
                          handleStepClick(prevStep)
                        }}
                        className="px-5 py-2 text-sm rounded-full border border-white/60 bg-white/30 hover:bg-white/40 text-white"
                      >
                        Back
                      </button>
                      <button onClick={() => startShotstackRender()} disabled={isRenderingPreview} className="px-4 py-2 text-sm rounded-full border border-indigo-300/60 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-800 flex items-center gap-2">
                        {isRenderingPreview ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}<span>Preview</span>
                      </button>
                       <button onClick={() => setShowExportDialog(true)} className="px-5 py-2 text-sm rounded-full border border-white/60 bg-white/30 hover:bg-white/40 text-white flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        <span>Publish</span>
                      </button>
                      <button
                        onClick={() => {
                          // Next step
                          const nextStep = Math.min(steps.length, currentStep + 1)
                          handleStepClick(nextStep)
                        }}
                        className="px-5 py-2 text-sm rounded-full border border-white/60 bg-white/30 hover:bg-white/40 text-white"
                      >
                        Next
                      </button>
                    </GlassSurface>
                  </motion.div>
                  {/* Close h-full container */}
                </div>
                {/* Close outer fixed container via createPortal below */}
              </div>, document.body)
            }
          </>
        )
      
      case 4:
        return (
          <div className="text-center py-12">
            <EnhancedLiquidGlass
              variant="milestone"
              intensity="premium"
              className="p-8 max-w-md mx-auto"
            >
              <Play className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-black mb-2">
                Preview & Export
              </h3>
              <p className="text-gray-600 mb-6">
                Review your final video and export it in your desired format
              </p>
              <div className="space-y-3">
                <motion.button
                  onClick={() => {
                    handleMilestoneComplete(4)
                    setTimeout(() => handleStartExport(), 1000)
                  }}
                  className="w-full px-6 py-3 bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-400/30 rounded-xl text-white font-medium hover:from-green-500/30 hover:to-blue-500/30 transition-all duration-300"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Zap className="w-4 h-4 inline mr-2" />
                  Preview & Export
                </motion.button>
              </div>
            </EnhancedLiquidGlass>
          </div>
        )
      
      default:
        return null
    }
  }

  return (
    <div 
      className={cn(
        'min-h-screen relative overflow-auto h-auto',
        className
      )}
    >
      {/* Media Library Dialog */}
      <MediaLibraryDialog
        open={mediaDialogOpen}
        onOpenChange={setMediaDialogOpen}
        files={projectData.mediaFiles as any}
        filterToSelected={showOnlyChosenInMediaPanel}
        selectedIds={selectedMediaIds}
      />

      {/* Audio Picker */}
      <AudioPopup
        isOpen={audioPopupOpen}
        onClose={() => setAudioPopupOpen(false)}
        onAudioSelect={(track) => {
          setProjectData(prev => ({
            ...prev,
            audio: {
              id: track.id,
              title: track.title,
              tag: track.tag,
              duration: track.duration,
              cover: track.cover
            }
          }))
        }}
      />
      {/* Command Palette */}
      {createPortal(
        <CommandPalette
          open={isCommandPaletteOpen}
          query={commandQuery}
          onQueryChange={setCommandQuery}
          onClose={() => setIsCommandPaletteOpen(false)}
          onRun={(item) => {
            if (item.startsWith('Add ')) {
              pushHistory()
              const id = `cmd-${Date.now()}`
              if (item.includes('Image')) setTimelineClips(prev => [...prev, { id, kind: 'image', start: 0, length: 3, x: 80, y: 80 } as TimelineClip])
              if (item.includes('Video')) setTimelineClips(prev => [...prev, { id, kind: 'video', start: 0, length: 5, x: 80, y: 80 } as TimelineClip])
              if (item.includes('Caption')) setTimelineClips(prev => [...prev, { id, kind: 'title', text: 'Caption', start: 0, length: 2, x: 80, y: 80 } as TimelineClip])
              if (item.includes('Emoji')) setTimelineClips(prev => [...prev, { id, kind: 'emoji', text: '✨', start: 0, length: 1.5, x: 80, y: 80 } as TimelineClip])
              if (item.includes('Action')) setTimelineClips(prev => [...prev, { id, kind: 'action', text: 'Transform', start: 0, length: 1.5, x: 80, y: 80 } as TimelineClip])
              if (item.includes('Output')) setTimelineClips(prev => [...prev, { id, kind: 'output', text: 'Export', start: 0, length: 1, x: 80, y: 80 } as TimelineClip])
            } else if (item === 'Auto Arrange') {
              autoArrange()
            } else if (item === 'Align to Grid') {
              pushHistory(); setTimelineClips(prev => prev.map(c => ({ ...c, x: Math.round((c.x || 0)/GRID)*GRID, y: Math.round((c.y || 0)/GRID)*GRID })))
            } else if (item === 'Toggle Snap') {
              setSnapEnabled(v => !v)
            } else if (item === 'Preview') {
              startShotstackRender()
            } else if (item === 'Export') {
              setShowExportDialog(true)
            }
            setIsCommandPaletteOpen(false); setCommandQuery("")
          }}
        />,
        document.body
      )}
      {/* Liquid Glass Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Primary liquid glass overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.008] via-white/[0.004] to-transparent" />
        
        {/* Floating liquid orbs */}
        <div className="absolute top-1/4 left-1/5 w-96 h-96 bg-white/[0.012] rounded-full blur-3xl liquid-float" />
        <div className="absolute top-1/2 right-1/4 w-80 h-80 bg-white/[0.008] rounded-full blur-3xl liquid-float" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-1/3 left-1/3 w-72 h-72 bg-white/[0.01] rounded-full blur-3xl liquid-float" style={{ animationDelay: '4s' }} />
        
        {/* Subtle light refractions */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.003] to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-bl from-transparent via-white/[0.002] to-transparent" />
      </div>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative z-10 p-0 min-h-screen pointer-events-auto">
        <div className="max-w-7xl mx-auto space-y-8">


          {/* Single Clean Progress Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-0"
          >
            <EnhancedLiquidGlass
              variant="milestone"
              intensity="premium"
              animation="glow"
              className="px-6 py-4 rounded-none border-x-0 border-t-0"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-black">
                    Video Creation Progress
                  </h3>
                  <p className="text-sm text-gray-600">
                    {currentStepData?.name} • Step {currentStep} of {steps.length}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-black">
                    {Math.round((completedCount / steps.length) * 100)}%
                  </div>
                  <div className="text-xs text-gray-500">Complete</div>
                </div>
              </div>

              {/* Ultra Clean Progress Bar */}
              <div className="relative h-4 bg-gradient-to-br from-white/[0.4] via-white/[0.2] to-white/[0.05] rounded-full overflow-hidden backdrop-blur-[35px] backdrop-saturate-[200%] border border-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_8px_32px_rgba(255,255,255,0.1)]">
                <motion.div
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-400 via-purple-500 to-green-400 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(completedCount / steps.length) * 100}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
                
                {/* Animated shimmer effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />

                {/* Step markers */}
                {steps.map((step, index) => (
                  <div
                    key={step.id}
                    className="absolute top-0 h-full w-0.5 bg-white/20"
                    style={{ left: `${((index + 1) / steps.length) * 100}%` }}
                  />
                ))}
              </div>

              {/* Step indicators */}
              <div className="flex justify-between mt-3">
                {steps.map((step, index) => (
                  <div key={step.id} className="flex flex-col items-center">
                    <div className={cn(
                      "w-2 h-2 rounded-full transition-all duration-300",
                      step.isCompleted 
                        ? "bg-green-400 shadow-lg shadow-green-400/30" 
                        : step.isActive 
                        ? "bg-blue-400 shadow-lg shadow-blue-400/30 animate-pulse" 
                        : "bg-white/20"
                    )} />
                    <span className={cn(
                      "text-xs mt-1 transition-colors duration-300",
                      step.isCompleted 
                        ? "text-green-600" 
                        : step.isActive 
                        ? "text-blue-600" 
                        : "text-gray-400"
                    )}>
                      {step.name}
                    </span>
                  </div>
                ))}
              </div>
            </EnhancedLiquidGlass>
          </motion.div>

          {/* Main Content Area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <EnhancedLiquidGlass
              variant="editor"
              intensity="premium"
              animation="glow"
              className="min-h-[700px] pointer-events-auto"
            >
              <div className="p-8 pointer-events-auto">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.4 }}
                    className="pointer-events-auto"
                  >
                    {renderMilestoneContent()}
                  </motion.div>
                </AnimatePresence>
              </div>
            </EnhancedLiquidGlass>
          </motion.div>

          {/* Navigation Controls */}
          {/* Removed Previous and Continue buttons */}
        </div>
      </div>

      {/* Export System Modals */}
      <ExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        onExport={handleExport}
        projectTitle="My Video"
        duration={60}
      />

      <RenderingProgress
        isOpen={showRenderingProgress}
        onClose={() => setShowRenderingProgress(false)}
        onRetry={() => {
          setShowRenderingProgress(false)
          setShowExportDialog(true)
        }}
        renderStatus={renderStatus}
        progress={renderProgress}
        estimatedTimeRemaining={estimatedTimeRemaining}
        videoUrl={finalVideoUrl}
        error={renderError}
        projectTitle="My Video"
        exportFormat="mp4"
      />

      <FinalVideoPresentation
        isOpen={showFinalPresentation}
        onClose={() => setShowFinalPresentation(false)}
        videoUrl={finalVideoUrl}
        videoTitle="My Video"
        duration={60}
        segments={[]}
        onDownload={() => {
          if (finalVideoUrl) {
            const link = document.createElement('a')
            link.href = finalVideoUrl
            link.download = `my-video.mp4`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
          }
        }}
        onShare={() => {
          if (navigator.share && finalVideoUrl) {
            navigator.share({
              title: 'My Video',
              url: finalVideoUrl
            })
          } else {
            navigator.clipboard.writeText(finalVideoUrl)
            toast.success('Video URL copied to clipboard!')
          }
        }}
        onRestart={() => {
          setShowFinalPresentation(false)
          setSteps(MILESTONE_STEPS)
          setCurrentStep(1)
          setProjectData({
            mediaFiles: [],
            timeline: null,
            effects: [],
            audio: null
          })
        }}
      />

      {/* Context Menu (above builder) */}
      {contextMenu.open && (
        <div
          className="fixed z-[10010] bg-white border border-slate-200 rounded-md shadow-lg py-1 text-sm"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onMouseLeave={() => setContextMenu(prev => ({ ...prev, open: false }))}
        >
          {contextMenu.target === 'canvas' ? (
            <>
              <button className="block w-full text-left px-3 py-1 hover:bg-slate-50" onClick={() => {
                setContextMenu(prev => ({ ...prev, open: false }))
                const id = `clip-${Date.now()}-${Math.random().toString(36).slice(2)}`
                const innerRect = (document.getElementById('editor-canvas-inner') as HTMLElement)?.getBoundingClientRect()
                const x = innerRect ? (contextMenu.x - innerRect.left) : 80
                const y = innerRect ? (contextMenu.y - innerRect.top) : 80
                const newClip: TimelineClip = { id, kind: 'title', text: 'Caption', start: 0, length: 2, x, y, transitionIn: 'fade', transitionOut: 'fade', scale: 1, position: 'center' }
                setTimelineClips(prev => [...prev, newClip])
              }}>Add caption block</button>
              <button className="block w-full text-left px-3 py-1 hover:bg-slate-50" onClick={() => {
                setContextMenu(prev => ({ ...prev, open: false }))
                const id = `clip-${Date.now()}-${Math.random().toString(36).slice(2)}`
                const innerRect = (document.getElementById('editor-canvas-inner') as HTMLElement)?.getBoundingClientRect()
                const x = innerRect ? (contextMenu.x - innerRect.left) : 80
                const y = innerRect ? (contextMenu.y - innerRect.top) : 80
                const newClip: TimelineClip = { id, kind: 'emoji', text: '✨', start: 0, length: 2, x, y, transitionIn: 'fade', transitionOut: 'fade', scale: 1, position: 'center' }
                setTimelineClips(prev => [...prev, newClip])
              }}>Add action block</button>
              <button className="block w-full text-left px-3 py-1 hover:bg-slate-50" onClick={() => {
                setContextMenu(prev => ({ ...prev, open: false }))
                setEdges([])
              }}>Clear connections</button>
              <button className="block w-full text-left px-3 py-1 hover:bg-slate-50" onClick={() => {
                setContextMenu(prev => ({ ...prev, open: false }))
                // simple align: trigger auto arrange columns if enabled
                setTimeout(() => {
                  // noop placeholder for external align
                }, 0)
              }}>Auto-align now</button>
            </>
          ) : (
            <>
              <button className="block w-full text-left px-3 py-1 hover:bg-slate-50" onClick={() => {
                if (!contextMenu.blockId) return
                const clip = timelineClips.find(c => c.id === contextMenu.blockId)
                if (!clip) return
                toast.info('Replace media coming soon')
                setContextMenu(prev => ({ ...prev, open: false }))
              }}>Replace media</button>
              <button className="block w-full text-left px-3 py-1 hover:bg-slate-50" onClick={() => {
                if (!contextMenu.blockId) return
                setEdges(prev => prev.filter(e => e.fromId !== contextMenu.blockId && e.toId !== contextMenu.blockId))
                setContextMenu(prev => ({ ...prev, open: false }))
              }}>Disconnect logic</button>
              <button className="block w-full text-left px-3 py-1 hover:bg-slate-50" onClick={() => {
                if (!contextMenu.blockId) return
                setTimelineClips(prev => prev.filter(c => c.id !== contextMenu.blockId))
                setEdges(prev => prev.filter(e => e.fromId !== contextMenu.blockId && e.toId !== contextMenu.blockId))
                setContextMenu(prev => ({ ...prev, open: false }))
              }}>Delete block</button>
              <button className="block w-full text-left px-3 py-1 hover:bg-slate-50" onClick={() => {
                if (!contextMenu.blockId) return
                setSelectedBlockId(contextMenu.blockId)
                setShowSettingsPanel(true)
                setContextMenu(prev => ({ ...prev, open: false }))
              }}>Settings</button>
            </>
          )}
        </div>
      )}
      {/* Image Preview Modal (above builder) */}
      {showPreviewModal && previewImage && (
        <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0 bg-transparent border-none">
            <EnhancedLiquidGlass
              variant="modal"
              intensity="premium"
              className="p-6 relative"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowPreviewModal(false)}
                className="absolute top-4 right-4 z-10 bg-white/20 hover:bg-white/30 border border-white/30 rounded-full p-2 transition-all duration-300"
              >
                <X className="w-5 h-5 text-white" />
              </button>
              
              {/* Image */}
              <div className="max-h-[70vh] rounded-lg overflow-hidden mb-4 flex items-center justify-center bg-black/20">
                <img 
                  src={previewImage.largeImageURL || previewImage.webformatURL}
                  alt={previewImage.tags}
                  className="max-w-full max-h-full object-contain rounded-lg"
                  loading="eager"
                />
              </div>
              
              {/* Image Info */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-black mb-1">
                    {previewImage.tags.split(',').slice(0, 3).join(', ')}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    by {previewImage.user} • {previewImage.views} views • {previewImage.likes} likes
                  </p>
                </div>
                <button
                  onClick={() => {
                    addPixabayMedia(previewImage)
                    setShowPreviewModal(false)
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30 rounded-xl text-black font-medium hover:from-purple-500/30 hover:to-pink-500/30 transition-all duration-300 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Zur Sammlung hinzufügen
                </button>
              </div>
            </EnhancedLiquidGlass>
          </DialogContent>
        </Dialog>
      )}

      {/* Glassmorphic Floating Action Button - Appears when items are selected in selection mode */}
      <AnimatePresence>
        {isSelectionMode && selectedMediaIds.size > 0 && (
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
            <div className="relative group">
              {/* Selection Counter Badge */}
              <div className="absolute -top-3 -right-3 z-10">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-teal-400 to-cyan-400 rounded-full blur-md opacity-60 animate-pulse" />
                  <div className="relative bg-gradient-to-r from-teal-500 to-cyan-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg border border-white/20 backdrop-blur-sm">
                    {selectedMediaIds.size}
                  </div>
                </div>
              </div>
              
              {/* Glassmorphic Button */}
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
                  
                  const selectedItems = Array.from(selectedMediaIds)
                  toast.success(`${selectedItems.length} item${selectedItems.length !== 1 ? 's' : ''} selected for editing!`)
                  
                  // Complete the current step (Media Upload) and navigate to next step
                  handleMilestoneComplete(1)
                  
                  // Exit selection mode
                  setIsSelectionMode(false)
                  setSelectedMediaIds(new Set())
                }}
                className="floating-action-button relative h-14 px-8 text-slate-700 transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none focus:ring-0 overflow-hidden"
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(4px)',
                  WebkitBackdropFilter: 'blur(4px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderTop: '1px solid rgba(255, 255, 255, 0.4)',
                  borderRadius: '50px',
                  boxShadow: `
                    0 8px 25px rgba(0, 0, 0, 0.12),
                    inset 0 1px 0 rgba(255, 255, 255, 0.4),
                    inset 0 -1px 0 rgba(255, 255, 255, 0.1)
                  `
                }}
              >
                {/* Button glass reflection */}
                <div 
                  className="absolute inset-0 opacity-30 pointer-events-none"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, transparent 50%)',
                    borderRadius: '50px'
                  }}
                />
                
                {/* Content */}
                <div className="relative z-10 flex items-center gap-3">
                  {/* Icon */}
                  <Edit3 className="w-5 h-5" />
                  
                  {/* Text */}
                  <span>
                    Edit {selectedMediaIds.size} Item{selectedMediaIds.size !== 1 ? 's' : ''}
                  </span>
                  
                  {/* Arrow Icon */}
                  <ChevronRight className="w-4 h-4" />
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

      {/* Settings Drawer (fixed, highest z-index) */}
      <AnimatePresence>
        {showSettingsPanel && selectedBlockId && (
          <motion.div
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed top-0 right-0 h-full w-80 z-[10012] bg-white/90 backdrop-blur border-l border-slate-200 shadow-[0_20px_60px_rgba(0,0,0,0.2)]"
          >
            <div className="p-4 border-b flex items-center justify-between">
              <div className="text-sm font-medium">Block Settings</div>
              <button className="text-slate-600 text-xs" onClick={() => setShowSettingsPanel(false)}>Close</button>
            </div>
            <div className="p-4 space-y-3 text-sm">
              {(() => {
                const clip = timelineClips.find(c => c.id === selectedBlockId)
                if (!clip) return <div className="text-slate-500">No block selected</div>
                return (
                  <>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Type</label>
                      <div className="px-2 py-2 border rounded bg-slate-50 capitalize">{clip.kind}</div>
                    </div>
                    {(clip.kind === 'title' || clip.kind === 'emoji') && (
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Text</label>
                        <input className="w-full border rounded px-2 py-1" value={clip.text || ''} onChange={(e) => updateClip(clip.id, { text: e.target.value })} />
                      </div>
                    )}
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Length (s)</label>
                      <input type="number" step="0.5" min={1} max={12} className="w-full border rounded px-2 py-1" value={clip.length} onChange={(e) => updateClip(clip.id, { length: Math.max(1, Math.min(12, Number(e.target.value) || clip.length)) })} />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEdges(prev => prev.filter(e => e.fromId !== clip.id && e.toId !== clip.id))}>Disconnect</Button>
                      <Button variant="outline" size="sm" onClick={() => { setTimelineClips(prev => prev.filter(c => c.id !== clip.id)); setEdges(prev => prev.filter(e => e.fromId !== clip.id && e.toId !== clip.id)); setShowSettingsPanel(false) }}>Delete</Button>
                    </div>
                  </>
                )
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Media Preview Modal */}
      <MediaPreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        media={previewMedia}
      />
    </div>
  )
} 