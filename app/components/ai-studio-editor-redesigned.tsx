"use client"

import React, { useState, useEffect, useCallback } from 'react'
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { MediaPreviewModal } from './media-preview-modal'

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
  Edit3
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
    name: 'Content Editing',
    description: 'Arrange, edit, and enhance your content',
    isRequired: true,
    isCompleted: false,
    isActive: false,
  },
  {
    id: 3,
    name: 'Effects & Audio',
    description: 'Apply effects, transitions, and audio',
    isRequired: false,
    isCompleted: false,
    isActive: false,
  },
  {
    id: 4,
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
    mediaFiles: [],
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
  const [selectedMediaIds, setSelectedMediaIds] = useState<Set<string>>(new Set())
  
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
      
      console.log('Authentication successful, searching Pixabay...')

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
    if (completedCount < 2) {
      toast.error('Please complete media upload and content editing before exporting')
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
      
      handleMilestoneComplete(4)
      
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
                        // Clear selections when exiting selection mode
                        if (isSelectionMode) {
                          setSelectedMediaIds(new Set())
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
            {projectData.mediaFiles.length > 0 && (
              <div className="space-y-4">
                {/* Selection Summary */}
                <div className="text-center">
                  <EnhancedLiquidGlass
                    variant="editor"
                    intensity="premium"
                    className="p-4 max-w-lg mx-auto"
                  >
                    <div className="text-left">
                      <p className="text-black font-medium">
                        {selectedMediaIds.size} of {projectData.mediaFiles.length} files selected
                      </p>
                      <p className="text-gray-600 text-sm">
                        Click on files to select them for editing
                      </p>
                    </div>
                  </EnhancedLiquidGlass>
                </div>

                {/* Continue Button */}
                {selectedMediaIds.size > 0 && (
                  <div className="text-center">
                    <EnhancedLiquidGlass
                      variant="milestone"
                      intensity="premium"
                      className="p-4 max-w-md mx-auto"
                    >
                      <motion.button
                        onClick={() => {
                          // Update project data with only selected files
                          const selectedFiles = projectData.mediaFiles.filter(file => 
                            selectedMediaIds.has(file.id || file.filename)
                          )
                          handleProjectDataChange(1, selectedFiles)
                          toast.success(`${selectedFiles.length} selected file${selectedFiles.length !== 1 ? 's' : ''} ready for editing!`, { icon: '✨' })
                          handleMilestoneComplete(1)
                        }}
                        className="px-6 py-3 bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-400/30 rounded-xl text-white font-medium hover:from-green-500/30 hover:to-blue-500/30 transition-all duration-300 flex items-center gap-2 mx-auto"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <CheckCircle className="w-4 h-4" />
                        Continue with {selectedMediaIds.size} selected file{selectedMediaIds.size !== 1 ? 's' : ''}
                      </motion.button>
                    </EnhancedLiquidGlass>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      
      case 2:
        return (
          <div className="space-y-8">
            {/* Content Editing Interface */}
            <EnhancedLiquidGlass
              variant="editor"
              intensity="premium"
              className="p-6"
            >
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-black mb-2">
                  Content Editing
                </h3>
                <p className="text-gray-600">
                  Edit and transform your {projectData.mediaFiles.length} media file{projectData.mediaFiles.length !== 1 ? 's' : ''}
                </p>
              </div>
              
              {/* Media Files Grid with Edit Options */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Media Preview */}
                <div>
                  <h4 className="text-black font-medium mb-3">Media Files</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {projectData.mediaFiles.slice(0, 4).map((file, index) => (
                      <div key={index} className="relative group">
                        <div 
                          className="aspect-video bg-gradient-to-br from-white/[0.4] via-white/[0.2] to-white/[0.05] rounded-xl overflow-hidden border border-white/30 backdrop-blur-[40px] backdrop-saturate-[200%] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_8px_32px_rgba(255,255,255,0.1)] cursor-pointer"
                          onClick={() => {
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
                          }}
                        >
                          {file.file_type === 'image' ? (
                            <img 
                              src={file.storage_url || file.thumbnail_url} 
                              alt={file.filename}
                              className="w-full h-full object-cover"
                            />
                          ) : file.file_type === 'video' ? (
                            <video 
                              src={file.storage_url} 
                              className="w-full h-full object-cover"
                              muted
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-gray-500 text-xs">{file.file_type}</span>
                            </div>
                          )}
                          {/* Edit Overlay */}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                            <button className="px-3 py-1 bg-blue-500/80 rounded text-white text-xs">
                              Edit
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 mt-1 truncate">{file.filename}</p>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Transformation Menu */}
                <div>
                  <h4 className="text-black font-medium mb-3 flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Transformations
                  </h4>
                  <div className="space-y-3">
                    {[
                      { name: 'Crop & Resize', icon: Crop, desc: 'Adjust dimensions and aspect ratio', color: 'blue' },
                      { name: 'Rotate & Flip', icon: RotateCcw, desc: 'Rotate or flip your media', color: 'green' },
                      { name: 'Color Correction', icon: Palette, desc: 'Adjust brightness, contrast, saturation', color: 'purple' },
                      { name: 'Filters', icon: Filter, desc: 'Apply artistic filters and effects', color: 'pink' },
                      { name: 'Speed Control', icon: Gauge, desc: 'Change playback speed', color: 'orange' },
                      { name: 'Trim & Cut', icon: Scissors, desc: 'Remove unwanted parts', color: 'red' }
                    ].map((transform, index) => (
                      <div key={index} className="flex items-center gap-4 p-4 bg-gradient-to-br from-white/[0.4] via-white/[0.2] to-white/[0.05] rounded-xl border border-white/30 hover:from-white/[0.5] hover:via-white/[0.25] hover:to-white/[0.1] transition-all duration-500 cursor-pointer group backdrop-blur-[40px] backdrop-saturate-[200%] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_8px_32px_rgba(255,255,255,0.1)] hover:shadow-[inset_0_2px_0_rgba(255,255,255,0.5),0_12px_40px_rgba(255,255,255,0.15)] hover:scale-[1.02]">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-${transform.color}-500/20 border border-${transform.color}-400/30`}>
                          <transform.icon className={`w-4 h-4 text-${transform.color}-300`} />
                        </div>
                        <div className="flex-1">
                          <p className="text-black text-sm font-medium">{transform.name}</p>
                          <p className="text-gray-600 text-xs">{transform.desc}</p>
                        </div>
                        <button className={`px-3 py-1 bg-${transform.color}-500/20 border border-${transform.color}-400/30 rounded text-${transform.color}-200 text-xs hover:bg-${transform.color}-500/30 transition-colors opacity-0 group-hover:opacity-100`}>
                          Apply
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Timeline Editor Placeholder */}
              <div className="mb-6">
                                  <h4 className="text-black font-medium mb-3 flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    Timeline Editor
                  </h4>
                <div className="h-36 bg-gradient-to-br from-white/[0.4] via-white/[0.2] to-white/[0.05] rounded-xl border border-white/30 p-6 backdrop-blur-[40px] backdrop-saturate-[200%] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_8px_32px_rgba(255,255,255,0.1)]">
                  <div className="flex items-center gap-2 mb-3">
                    {projectData.mediaFiles.slice(0, 5).map((file, index) => (
                      <div key={index} className="relative group">
                        <div 
                          className="w-16 h-10 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded border border-blue-400/30 hover:from-blue-500/30 hover:to-purple-500/30 transition-all duration-300 cursor-pointer flex items-center justify-center"
                          onClick={() => {
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
                          }}
                        >
                          <span className="text-black text-xs">{file.file_type}</span>
                        </div>
                        {/* Duration indicator */}
                        <div className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-green-500/50 to-blue-500/50 rounded-full" />
                      </div>
                    ))}
                    {projectData.mediaFiles.length > 5 && (
                                          <div className="w-16 h-10 bg-white/10 rounded border border-white/20 flex items-center justify-center">
                      <span className="text-gray-500 text-xs">+{projectData.mediaFiles.length - 5}</span>
                    </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>00:00</span>
                    <span>Total: {projectData.mediaFiles.length * 3}s</span>
                  </div>
                  <p className="text-gray-500 text-xs mt-2 text-center">Drag to reorder • Click to edit • Double-click to preview</p>
                </div>
              </div>
            </EnhancedLiquidGlass>
            
            {/* Manual completion button */}
            {!steps[1].isCompleted && (
              <div className="text-center">
                <EnhancedLiquidGlass
                  variant="milestone"
                  intensity="premium"
                  className="p-4 max-w-md mx-auto"
                >
                  <motion.button
                    onClick={() => {
                      toast.success('Content editing completed!', { icon: '✨' })
                      handleMilestoneComplete(2)
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 rounded-xl text-white font-medium hover:from-blue-500/30 hover:to-purple-500/30 transition-all duration-300 flex items-center gap-2 mx-auto"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Settings className="w-4 h-4" />
                    Complete Editing
                  </motion.button>
                </EnhancedLiquidGlass>
              </div>
            )}
          </div>
        )
      
      case 3:
        return (
          <div className="space-y-8">
            {/* Effects & Audio Interface */}
            <EnhancedLiquidGlass
              variant="editor"
              intensity="premium"
              className="p-6"
            >
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-black mb-2">
                  Effects & Audio
                </h3>
                <p className="text-gray-600">
                  Enhance your video with effects, transitions, and audio
                </p>
              </div>
              
              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Visual Effects */}
                <div>
                  <h4 className="text-black font-medium mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Visual Effects
                  </h4>
                  <div className="space-y-2">
                    {[
                      { name: 'Fade In/Out', icon: Layers, desc: 'Smooth transitions', color: 'blue' },
                      { name: 'Zoom Effect', icon: Search, desc: 'Dynamic zoom in/out', color: 'green' },
                      { name: 'Color Grading', icon: Palette, desc: 'Professional color', color: 'purple' },
                      { name: 'Blur Transition', icon: EyeOff, desc: 'Smooth blur effects', color: 'pink' },
                      { name: 'Particle Effects', icon: Sparkles, desc: 'Magical particles', color: 'yellow' },
                      { name: 'Light Leaks', icon: Lightbulb, desc: 'Cinematic lighting', color: 'orange' }
                    ].map((effect, index) => (
                      <div key={index} className="flex items-center gap-4 p-4 bg-gradient-to-br from-white/[0.4] via-white/[0.2] to-white/[0.05] rounded-xl border border-white/30 hover:from-white/[0.5] hover:via-white/[0.25] hover:to-white/[0.1] transition-all duration-500 cursor-pointer group backdrop-blur-[40px] backdrop-saturate-[200%] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_8px_32px_rgba(255,255,255,0.1)] hover:shadow-[inset_0_2px_0_rgba(255,255,255,0.5),0_12px_40px_rgba(255,255,255,0.15)] hover:scale-[1.02]">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-${effect.color}-500/20 border border-${effect.color}-400/30`}>
                          <effect.icon className={`w-4 h-4 text-${effect.color}-300`} />
                        </div>
                        <div className="flex-1">
                          <p className="text-black text-sm font-medium">{effect.name}</p>
                          <p className="text-gray-600 text-xs">{effect.desc}</p>
                        </div>
                        <button className={`px-2 py-1 bg-${effect.color}-500/20 border border-${effect.color}-400/30 rounded text-${effect.color}-200 text-xs hover:bg-${effect.color}-500/30 transition-colors opacity-0 group-hover:opacity-100`}>
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Music Selection */}
                <div>
                  <h4 className="text-black font-medium mb-3 flex items-center gap-2">
                    <Music className="w-4 h-4" />
                    Background Music
                  </h4>
                  <div className="space-y-2 mb-4">
                    {[
                      { name: 'Upbeat Pop', duration: '2:45', genre: 'Pop' },
                      { name: 'Chill Vibes', duration: '3:12', genre: 'Lo-Fi' },
                      { name: 'Epic Cinematic', duration: '2:58', genre: 'Orchestral' },
                      { name: 'Funky Groove', duration: '2:33', genre: 'Funk' },
                      { name: 'Ambient Space', duration: '4:21', genre: 'Ambient' }
                    ].map((track, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-gradient-to-br from-white/[0.15] via-white/[0.08] to-transparent rounded-lg border border-white/10 hover:from-white/[0.2] hover:via-white/[0.12] transition-colors cursor-pointer backdrop-blur-[20px]">
                        <div className="w-8 h-8 bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded flex items-center justify-center">
                          <Music className="w-3 h-3 text-pink-300" />
                        </div>
                        <div className="flex-1">
                          <p className="text-black text-sm font-medium">{track.name}</p>
                          <p className="text-gray-600 text-xs">{track.genre} • {track.duration}</p>
                        </div>
                        <button className="px-2 py-1 bg-pink-500/20 border border-pink-400/30 rounded text-pink-200 text-xs hover:bg-pink-500/30 transition-colors">
                          Use
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  {/* Upload Custom Music */}
                  <div className="p-3 bg-gradient-to-br from-white/[0.15] via-white/[0.08] to-transparent rounded-lg border border-white/10 border-dashed hover:from-white/[0.2] hover:via-white/[0.12] transition-colors cursor-pointer group backdrop-blur-[20px]">
                    <div className="text-center">
                      <Upload className="w-6 h-6 text-white/40 mx-auto mb-2 group-hover:text-white/60 transition-colors" />
                      <p className="text-gray-600 text-sm group-hover:text-black transition-colors">Upload Custom Music</p>
                      <p className="text-gray-500 text-xs">MP3, WAV, M4A</p>
                    </div>
                  </div>
                  
                  {/* Music Library */}
                  <div className="mt-4">
                    <h5 className="text-gray-700 text-sm font-medium mb-2">Music Library</h5>
                    <div className="grid grid-cols-2 gap-2">
                      {['Pop', 'Rock', 'Jazz', 'Classical'].map((genre) => (
                        <button key={genre} className="p-2 bg-gradient-to-br from-white/[0.15] via-white/[0.08] to-transparent rounded border border-white/10 hover:from-white/[0.2] hover:via-white/[0.12] transition-colors text-gray-600 text-xs backdrop-blur-[20px]">
                          {genre}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Audio Controls */}
                <div>
                  <h4 className="text-black font-medium mb-3 flex items-center gap-2">
                    <Volume2 className="w-4 h-4" />
                    Audio Controls
                  </h4>
                  <div className="space-y-4">
                    {/* Volume Control */}
                    <div className="p-3 bg-gradient-to-br from-white/[0.15] via-white/[0.08] to-transparent rounded-lg border border-white/10 backdrop-blur-[20px]">
                      <p className="text-black text-sm font-medium mb-2">Master Volume</p>
                      <div className="flex items-center gap-3">
                        <Volume1 className="w-4 h-4 text-white/60" />
                        <div className="flex-1 h-2 bg-white/10 rounded-full">
                          <div className="w-3/4 h-full bg-gradient-to-r from-green-500 to-blue-500 rounded-full" />
                        </div>
                        <Volume2 className="w-4 h-4 text-white/60" />
                      </div>
                    </div>
                    
                    {/* Audio Effects */}
                    <div className="space-y-2">
                      {[
                        { name: 'Fade In/Out', icon: BarChart3, color: 'blue' },
                        { name: 'Echo Effect', icon: Volume2, color: 'purple' },
                        { name: 'Bass Boost', icon: Zap, color: 'orange' },
                        { name: 'Voice Over', icon: Mic, color: 'pink' }
                      ].map((audio, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-gradient-to-br from-white/[0.15] via-white/[0.08] to-transparent rounded-lg border border-white/10 hover:from-white/[0.2] hover:via-white/[0.12] transition-colors cursor-pointer group backdrop-blur-[20px]">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-${audio.color}-500/20 border border-${audio.color}-400/30`}>
                            <audio.icon className={`w-4 h-4 text-${audio.color}-300`} />
                          </div>
                          <div className="flex-1">
                            <p className="text-black text-sm font-medium">{audio.name}</p>
                          </div>
                          <button className={`px-2 py-1 bg-${audio.color}-500/20 border border-${audio.color}-400/30 rounded text-${audio.color}-200 text-xs hover:bg-${audio.color}-500/30 transition-colors opacity-0 group-hover:opacity-100`}>
                            Apply
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Audio Waveform Visualization */}
              <div className="mb-6">
                <h4 className="text-black font-medium mb-3 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Audio Timeline
                </h4>
                <div className="h-24 bg-gradient-to-br from-white/[0.15] via-white/[0.08] to-transparent rounded-lg border border-white/10 p-4 backdrop-blur-[20px]">
                  <div className="flex items-end gap-1 h-full">
                    {Array.from({ length: 80 }, (_, i) => (
                      <div 
                        key={i} 
                        className="w-1 bg-gradient-to-t from-blue-500/40 to-purple-500/40 rounded-t hover:from-blue-400/60 hover:to-purple-400/60 transition-all duration-200 cursor-pointer"
                        style={{ 
                          height: `${Math.random() * 50 + 15}px`,
                          animationDelay: `${i * 0.1}s`
                        }}
                      />
                    ))}
                  </div>
                  {/* Playback Controls */}
                  <div className="flex items-center justify-center gap-4 mt-3">
                    <button className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                      <Play className="w-4 h-4 text-white/80" />
                    </button>
                    <div className="flex-1 h-1 bg-white/10 rounded-full">
                      <div className="w-1/3 h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
                    </div>
                    <span className="text-gray-600 text-xs">1:23 / 3:45</span>
                  </div>
                </div>
              </div>
            </EnhancedLiquidGlass>
            
            {/* Manual completion button */}
            {!steps[2].isCompleted && (
              <div className="text-center">
                <EnhancedLiquidGlass
                  variant="milestone"
                  intensity="premium"
                  className="p-4 max-w-md mx-auto"
                >
                  <motion.button
                    onClick={() => {
                      toast.success('Effects and audio applied!', { icon: '🎵' })
                      handleMilestoneComplete(3)
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30 rounded-xl text-white font-medium hover:from-purple-500/30 hover:to-pink-500/30 transition-all duration-300 flex items-center gap-2 mx-auto"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Sparkles className="w-4 h-4" />
                    Apply Effects & Audio
                  </motion.button>
                </EnhancedLiquidGlass>
              </div>
            )}
          </div>
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
      
      <div className="relative z-10 p-8 min-h-screen pointer-events-auto">
        <div className="max-w-7xl mx-auto space-y-8">


          {/* Single Clean Progress Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-8"
          >
            <EnhancedLiquidGlass
              variant="milestone"
              intensity="premium"
              animation="glow"
              className="p-6"
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="flex justify-center items-center gap-4"
          >
            <motion.button
              onClick={() => currentStep > 1 && handleStepClick(currentStep - 1)}
              disabled={currentStep <= 1}
              className={cn(
                'px-6 py-3 rounded-xl font-medium transition-all duration-300',
                currentStep <= 1
                  ? 'bg-gradient-to-br from-white/[0.2] via-white/[0.1] to-white/[0.02] text-gray-400 cursor-not-allowed backdrop-blur-[35px] backdrop-saturate-[200%] border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]'
                  : 'bg-gradient-to-br from-white/[0.5] via-white/[0.25] to-white/[0.1] text-black hover:from-white/[0.6] hover:via-white/[0.3] hover:to-white/[0.15] hover:text-black backdrop-blur-[35px] backdrop-saturate-[200%] border border-white/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] hover:shadow-[inset_0_2px_0_rgba(255,255,255,0.5)] hover:scale-105'
              )}
              whileHover={currentStep > 1 ? { scale: 1.05 } : undefined}
              whileTap={currentStep > 1 ? { scale: 0.95 } : undefined}
            >
              Previous
            </motion.button>

            <motion.button
              onClick={() => {
                if (currentStep < steps.length) {
                  const canProceed = currentStep === 1 ? projectData.mediaFiles.length > 0 : true
                  if (canProceed) {
                    handleStepClick(currentStep + 1)
                  } else {
                    toast.error('Please upload at least one media file before continuing')
                  }
                } else {
                  handleStartExport()
                }
              }}
              disabled={currentStep === 1 && projectData.mediaFiles.length === 0}
              className={cn(
                "px-8 py-3 rounded-xl font-medium transition-all duration-300 flex items-center gap-2",
                currentStep === 1 && projectData.mediaFiles.length === 0
                  ? "bg-gradient-to-br from-white/[0.2] via-white/[0.1] to-white/[0.02] text-gray-400 cursor-not-allowed backdrop-blur-[35px] backdrop-saturate-[200%] border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]"
                  : "bg-gradient-to-r from-blue-500/30 via-purple-500/25 to-blue-500/20 border border-blue-400/40 text-black hover:from-blue-500/40 hover:via-purple-500/35 hover:to-blue-500/30 backdrop-blur-[35px] backdrop-saturate-[200%] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_16px_48px_rgba(59,130,246,0.15)] hover:shadow-[inset_0_2px_0_rgba(255,255,255,0.5),0_20px_60px_rgba(59,130,246,0.2)] hover:scale-105"
              )}
              whileHover={currentStep === 1 && projectData.mediaFiles.length === 0 ? undefined : { scale: 1.05 }}
              whileTap={currentStep === 1 && projectData.mediaFiles.length === 0 ? undefined : { scale: 0.95 }}
            >
              {currentStep < steps.length ? 'Continue' : 'Export Video'}
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </motion.div>
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

      {/* Image Preview Modal */}
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
                  // Here you could navigate to video editor or trigger some action
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

      {/* Media Preview Modal */}
      <MediaPreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        media={previewMedia}
      />
    </div>
  )
} 