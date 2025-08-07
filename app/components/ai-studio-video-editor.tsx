"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Play, 
  Download, 
  Share2, 
  Loader2, 
  CheckCircle, 
  X,
  RefreshCw,
  Video,
  Clock,
  Settings,
  Film,
  Type,
  Image as ImageIcon,
  Music,
  Volume2,
  Edit3,
  Layout,
  Wand2,
  Instagram,
  Youtube,
  Facebook,
  Twitter,
  Plus,
  Sparkles,
  Search,
  Scissors
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { toast } from 'sonner'
import { createClient } from '@supabase/supabase-js'
import { ShotstackService, SHOTSTACK_TEMPLATES, type EditConfig, type ClipConfig, type TimelineConfig, type TransitionConfig } from '@/lib/shotstack-service'
import { generateVideoThumbnail, saveThumbnailToServer, createAudioPlaceholder } from '@/lib/thumbnail-generator'
import { MediaPreviewModal } from './media-preview-modal'
import { ExportDialog } from '@/components/export-dialog'
import { RenderingProgress } from '@/components/rendering-progress'
import { FinalVideoPresentation } from '@/components/final-video-presentation'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface MediaFile {
  id: string
  storage_url: string
  filename: string
  duration?: number
  thumbnail_url?: string
  file_type: 'video' | 'image' | 'audio'
  selected: boolean
}

interface VideoProject {
  id: string
  name: string
  timeline: TimelineConfig
  output: any
  created_at: string
  updated_at: string
}

interface Template {
  id: string
  name: string
  description: string
  category: string
  platform: string
  thumbnail: string
  config: EditConfig
}

const SOCIAL_PLATFORMS = [
  { id: 'instagram', name: 'Instagram', icon: Instagram, aspectRatio: '9:16' },
  { id: 'tiktok', name: 'TikTok', icon: Video, aspectRatio: '9:16' },
  { id: 'youtube', name: 'YouTube', icon: Youtube, aspectRatio: '16:9' },
  { id: 'facebook', name: 'Facebook', icon: Facebook, aspectRatio: '1:1' },
  { id: 'twitter', name: 'Twitter', icon: Twitter, aspectRatio: '16:9' }
]

const VIDEO_TEMPLATES: Template[] = [
  {
    id: 'slideshow',
    name: 'Photo Slideshow',
    description: 'Create a dynamic slideshow from your photos',
    category: 'basic',
    platform: 'all',
    thumbnail: '/templates/slideshow.jpg',
    config: {} as EditConfig
  },
  {
    id: 'kinetic-text',
    name: 'Kinetic Text',
    description: 'Animated text with smooth transitions',
    category: 'text',
    platform: 'all',
    thumbnail: '/templates/kinetic-text.jpg',
    config: {} as EditConfig
  },
  {
    id: 'picture-in-picture',
    name: 'Picture in Picture',
    description: 'Overlay video on background content',
    category: 'advanced',
    platform: 'all',
    thumbnail: '/templates/pip.jpg',
    config: {} as EditConfig
  },
  {
    id: 'social-story',
    name: 'Social Story',
    description: 'Vertical video optimized for stories',
    category: 'social',
    platform: 'instagram',
    thumbnail: '/templates/story.jpg',
    config: {} as EditConfig
  },
  {
    id: 'brand-intro',
    name: 'Brand Intro',
    description: 'Professional brand introduction video',
    category: 'business',
    platform: 'all',
    thumbnail: '/templates/brand-intro.jpg',
    config: {} as EditConfig
  },
  {
    id: 'product-showcase',
    name: 'Product Showcase',
    description: 'Highlight your products with style',
    category: 'business',
    platform: 'all',
    thumbnail: '/templates/product.jpg',
    config: {} as EditConfig
  }
]

// Enhanced transition system with all available Shotstack transitions
const ALL_TRANSITIONS = [
  'fade', 'reveal', 'wipeLeft', 'wipeRight', 'slideLeft', 'slideRight', 
  'slideUp', 'slideDown', 'carouselLeft', 'carouselRight', 'carouselUp', 
  'carouselDown', 'shuffleTopRight', 'shuffleRightTop', 'shuffleRightBottom', 
  'shuffleBottomRight', 'shuffleBottomLeft', 'shuffleLeftBottom', 
  'shuffleLeftTop', 'shuffleTopLeft', 'zoom'
] as const;

const TRANSITION_PRESETS = {
  instagram: ['fade', 'slideUp', 'slideDown', 'zoom', 'carouselLeft', 'carouselRight'],
  facebook: ['fade', 'wipeLeft', 'wipeRight', 'slideLeft', 'slideRight', 'zoom'],
  tiktok: ['slideUp', 'slideDown', 'carouselUp', 'carouselDown', 'zoom', 'shuffleTopRight'],
  youtube: ['fade', 'reveal', 'wipeLeft', 'wipeRight', 'slideLeft', 'slideRight'],
  modern: ['fade', 'zoom', 'carouselLeft', 'carouselRight', 'shuffleTopRight', 'shuffleBottomLeft'],
  all: ALL_TRANSITIONS
} as const;

const TRANSITION_CATEGORIES = {
  'Fade & Reveal': ['fade', 'reveal'],
  'Wipe Effects': ['wipeLeft', 'wipeRight'],
  'Slide Effects': ['slideLeft', 'slideRight', 'slideUp', 'slideDown'],
  'Carousel Effects': ['carouselLeft', 'carouselRight', 'carouselUp', 'carouselDown'],
  'Shuffle Effects': ['shuffleTopRight', 'shuffleRightTop', 'shuffleRightBottom', 'shuffleBottomRight', 'shuffleBottomLeft', 'shuffleLeftBottom', 'shuffleLeftTop', 'shuffleTopLeft'],
  'Zoom Effects': ['zoom']
} as const;

// Animation variants
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

// Enhanced Shotstack Features Configuration
const SHOTSTACK_ADVANCED_FEATURES = {
  // Advanced Filters
  filters: {
    boost: { name: 'Boost', description: 'Enhance brightness and contrast' },
    contrast: { name: 'Contrast', description: 'Adjust image contrast' },
    darken: { name: 'Darken', description: 'Reduce brightness' },
    greyscale: { name: 'Greyscale', description: 'Convert to black and white' },
    lighten: { name: 'Lighten', description: 'Increase brightness' },
    muted: { name: 'Muted', description: 'Reduce color saturation' },
    negative: { name: 'Negative', description: 'Invert colors' }
  },

  // Advanced Effects
  effects: {
    blur: { name: 'Blur', description: 'Apply blur effect', params: { radius: { min: 0, max: 50, default: 10 } } },
    sharpen: { name: 'Sharpen', description: 'Enhance image sharpness', params: { amount: { min: 0, max: 100, default: 50 } } },
    pixelate: { name: 'Pixelate', description: 'Create pixelated effect', params: { size: { min: 2, max: 50, default: 10 } } },
    glow: { name: 'Glow', description: 'Add glow effect', params: { radius: { min: 0, max: 100, default: 20 }, color: '#ffffff' } }
  },

  // Text Animation Styles
  textAnimations: {
    fadeIn: { name: 'Fade In', description: 'Smooth fade in animation' },
    slideIn: { name: 'Slide In', description: 'Slide from edge' },
    typewriter: { name: 'Typewriter', description: 'Character by character reveal' },
    bounce: { name: 'Bounce', description: 'Bouncy entrance animation' },
    zoomIn: { name: 'Zoom In', description: 'Scale up from center' },
    rotate: { name: 'Rotate', description: 'Rotate into view' }
  },

  // Advanced Transitions with Custom Parameters
  advancedTransitions: {
    fade: { name: 'Fade', duration: 0.5, description: 'Smooth crossfade' },
    wipeLeft: { name: 'Wipe Left', duration: 0.8, description: 'Wipe from right to left' },
    wipeRight: { name: 'Wipe Right', duration: 0.8, description: 'Wipe from left to right' },
    slideUp: { name: 'Slide Up', duration: 0.6, description: 'Slide up from bottom' },
    slideDown: { name: 'Slide Down', duration: 0.6, description: 'Slide down from top' },
    zoom: { name: 'Zoom', duration: 0.7, description: 'Zoom in/out effect' },
    carouselLeft: { name: 'Carousel Left', duration: 1.0, description: '3D carousel rotation' },
    carouselRight: { name: 'Carousel Right', duration: 1.0, description: '3D carousel rotation' },
    shuffleTopRight: { name: 'Shuffle Top Right', duration: 0.9, description: 'Shuffle animation' },
    shuffleBottomLeft: { name: 'Shuffle Bottom Left', duration: 0.9, description: 'Shuffle animation' }
  },

  // Color Grading Presets
  colorGrading: {
    cinematic: { name: 'Cinematic', description: 'Movie-like color grading' },
    vintage: { name: 'Vintage', description: 'Retro film look' },
    vibrant: { name: 'Vibrant', description: 'Enhanced colors' },
    moody: { name: 'Moody', description: 'Dark atmospheric look' },
    warm: { name: 'Warm', description: 'Warm color temperature' },
    cool: { name: 'Cool', description: 'Cool color temperature' }
  }
}

export function AIStudioVideoEditor() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'media' | 'templates' | 'timeline' | 'settings'>('media')
  const [availableMedia, setAvailableMedia] = useState<MediaFile[]>([])
  const [selectedMedia, setSelectedMedia] = useState<MediaFile[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMedia, setIsLoadingMedia] = useState(true)
  const [currentProject, setCurrentProject] = useState<VideoProject | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [selectedPlatform, setSelectedPlatform] = useState('all')
  const [renderProgress, setRenderProgress] = useState(0)
  const [isRendering, setIsRendering] = useState(false)
  
  // Upload functionality
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Project settings
  const [projectName, setProjectName] = useState('Untitled Project')
  const [outputFormat, setOutputFormat] = useState<'mp4' | 'gif' | 'jpg' | 'png'>('mp4')
  const [outputResolution, setOutputResolution] = useState<'sd' | 'hd' | 'full-hd'>('hd')
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1' | '4:5'>('16:9')
  const [backgroundMusic, setBackgroundMusic] = useState('')
  const [backgroundColor, setBackgroundColor] = useState('#000000')
  const [titleText, setTitleText] = useState('')
  const [subtitleText, setSubtitleText] = useState('')

  // Timeline
  const [timeline, setTimeline] = useState<TimelineConfig>({
    tracks: [],
    background: '#000000'
  })



  // Transition settings
  const [selectedTransition, setSelectedTransition] = useState<string>('fade');
  const [transitionPreset, setTransitionPreset] = useState<keyof typeof TRANSITION_PRESETS>('modern');
  const [enableRandomTransitions, setEnableRandomTransitions] = useState(false);
  const [transitionDuration, setTransitionDuration] = useState(0.5);
  const [showAllTransitions, setShowAllTransitions] = useState(false);

  // Music synchronization settings
  const [enableMusicSync, setEnableMusicSync] = useState(false);
  const [musicAnalysis, setMusicAnalysis] = useState<any>(null);
  const [pacingConfig, setPacingConfig] = useState({
    slowMotionThreshold: 0.3,
    fastPaceThreshold: 0.7,
    beatSync: true,
    dynamicSpeed: true
  });

  // Pixabay search settings
  const [showPixabaySearch, setShowPixabaySearch] = useState(false);
  const [pixabayQuery, setPixabayQuery] = useState('');
  const [pixabayResults, setPixabayResults] = useState<any>(null);
  const [pixabayLoading, setPixabayLoading] = useState(false);
  const [pixabayType, setPixabayType] = useState<'all' | 'images' | 'videos' | 'audio'>('all');

  // Media preview modal
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<MediaFile | null>(null);

  // Step-by-step workflow
  const [currentStep, setCurrentStep] = useState(1);
  const [workflowMode, setWorkflowMode] = useState<'guided' | 'advanced'>('advanced');
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // Advanced Shotstack Features State
  const [selectedFilter, setSelectedFilter] = useState<string>('')
  const [filterIntensity, setFilterIntensity] = useState(50)
  const [selectedEffect, setSelectedEffect] = useState<string>('')
  const [effectParams, setEffectParams] = useState<any>({})
  const [textAnimation, setTextAnimation] = useState<string>('fadeIn')
  const [colorGrading, setColorGrading] = useState<string>('')
  const [enableRealTimePreview, setEnableRealTimePreview] = useState(false)
  const [previewQuality, setPreviewQuality] = useState<'low' | 'medium' | 'high'>('medium')
  
  // Advanced Timeline Features
  const [timelineZoom, setTimelineZoom] = useState(1)
  const [showWaveform, setShowWaveform] = useState(false)
  const [enableSnapping, setEnableSnapping] = useState(true)
  const [snapThreshold, setSnapThreshold] = useState(0.1)
  
  // Advanced Audio Features
  const [audioFadeIn, setAudioFadeIn] = useState(0)
  const [audioFadeOut, setAudioFadeOut] = useState(0)
  const [audioVolume, setAudioVolume] = useState(100)
  const [enableAudioSync, setEnableAudioSync] = useState(false)
  
  // Advanced Video Features
  const [videoSpeed, setVideoSpeed] = useState(1)
  const [enableMotionBlur, setEnableMotionBlur] = useState(false)
  const [enableStabilization, setEnableStabilization] = useState(false)
  const [cropSettings, setCropSettings] = useState({ x: 0, y: 0, width: 100, height: 100 })

  // Text styling variables
  const [textStyle, setTextStyle] = useState<'minimal' | 'blockbuster' | 'vogue' | 'sketchy' | 'skinny' | 'chunk' | 'chunkLight' | 'marker' | 'future' | 'subtitle'>('blockbuster')
  const [textColor, setTextColor] = useState('#ffffff')

  // Export system state
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showRenderingProgress, setShowRenderingProgress] = useState(false)
  const [showFinalPresentation, setShowFinalPresentation] = useState(false)
  const [renderStatus, setRenderStatus] = useState<'submitted' | 'queued' | 'fetching' | 'rendering' | 'done' | 'failed'>('submitted')
  const [renderError, setRenderError] = useState<string>('')
  const [finalVideoUrl, setFinalVideoUrl] = useState<string>('')
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<string>('')
  const [currentJobId, setCurrentJobId] = useState<string>('')

  // Load available media from database
  const loadMedia = useCallback(async () => {
    if (!user) {
      console.log('No user available, skipping media load')
      setIsLoadingMedia(false)
      return
    }

    try {
      console.log('Loading media for user:', user.id)
      setIsLoadingMedia(true)
      const { data, error } = await supabase
        .from('media_files')
        .select('*')
        .eq('user_id', user.id)
        .eq('processing_status', 'completed')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading media:', error)
        toast.error('Failed to load media')
        setAvailableMedia([])
        return
      }

      const media: MediaFile[] = (data || []).map(file => ({
        id: file.id,
        storage_url: file.storage_url,
        filename: file.filename,
        duration: file.duration,
        thumbnail_url: file.thumbnail_url,
        file_type: file.file_type,
        selected: false
      }))

      console.log('📁 Loaded media files:', media.length, 'files')
      console.log('📁 Media details:', media.map(m => ({ 
        id: m.id, 
        filename: m.filename, 
        type: m.file_type, 
        url: m.storage_url?.substring(0, 50) + '...',
        hasThumbnail: !!m.thumbnail_url
      })))

      setAvailableMedia(media)
    } catch (error) {
      console.error('Error loading media:', error)
      toast.error('Failed to load media')
      setAvailableMedia([])
    } finally {
      setIsLoadingMedia(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      loadMedia()
    }
    
    // Add a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (isLoadingMedia) {
        console.log('Media loading timeout, setting loading to false')
        setIsLoadingMedia(false)
      }
    }, 10000) // 10 second timeout

    return () => clearTimeout(timeout)
  }, [user])

  // Auto-switch tabs based on current step in guided mode
  useEffect(() => {
    if (workflowMode === 'guided') {
      const targetTab = getStepTab(currentStep);
      setActiveTab(targetTab as any);
    }
  }, [currentStep, workflowMode]);

  // Toggle media selection
  const toggleMediaSelection = (mediaId: string) => {
    console.log('🔄 Toggling media selection for ID:', mediaId)
    setAvailableMedia(prev => {
      const updated = prev.map(media => 
        media.id === mediaId 
          ? { ...media, selected: !media.selected }
          : media
      )
      const selectedCount = updated.filter(m => m.selected).length
      console.log('📁 Updated available media, selected count:', selectedCount)
      return updated
    })
  }

  // Open media preview modal
  const openMediaPreview = (media: MediaFile) => {
    setPreviewMedia(media);
    setPreviewModalOpen(true);
  }

  // Update selected media list
  useEffect(() => {
    const selected = availableMedia.filter(media => media.selected)
    console.log('📁 Updating selected media:', selected.length, 'files selected')
    console.log('📁 Selected media details:', selected.map(m => ({ id: m.id, filename: m.filename, type: m.file_type, url: m.storage_url })))
    setSelectedMedia(selected)
  }, [availableMedia])

  // Upload functionality
  const handleFileUpload = async (files: FileList) => {
    if (!user || files.length === 0) return

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const uploadPromises = Array.from(files).map(async (file, index) => {
        // Determine file type
        let fileType = 'other'
        if (file.type.startsWith('video/')) fileType = 'video'
        else if (file.type.startsWith('image/')) fileType = 'image'
        else if (file.type.startsWith('audio/')) fileType = 'audio'

        // Validate file size (100MB limit)
        if (file.size > 100 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 100MB)`)
          return null
        }

        const formData = new FormData()
        formData.append('file', file)
        formData.append('fileType', fileType)

        const response = await fetch('/api/media-upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
          },
          body: formData
        })

        if (!response.ok) {
          const error = await response.text()
          throw new Error(`Upload failed for ${file.name}: ${error}`)
        }

        const result = await response.json()
        
        // Update progress
        const progressValue = ((index + 1) / files.length) * 100
        setUploadProgress(progressValue)
        
        return result.data
      })

      const results = await Promise.all(uploadPromises)
      const successfulUploads = results.filter(Boolean)

      if (successfulUploads.length > 0) {
        toast.success(`Successfully uploaded ${successfulUploads.length} file${successfulUploads.length !== 1 ? 's' : ''}`)
        
        // Reload media to include new uploads
        await loadMedia()
      }

    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  // Drag and drop handlers
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
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files)
    }
  }, [handleFileUpload])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files)
    }
  }

  // Create timeline from selected media and template
  const createTimelineFromTemplate = (template: Template, media: MediaFile[]) => {
    console.log('🎬 Creating timeline from template:', template.name)
    console.log('📁 Media files to process:', media.length)
    console.log('📁 Media details:', media.map(m => ({ id: m.id, filename: m.filename, type: m.file_type, url: m.storage_url })))

    // Validate that we have media files
    if (!media || media.length === 0) {
      console.error('❌ No media files provided to createTimelineFromTemplate')
      throw new Error('No media files selected. Please select at least one video, image, or audio file.')
    }

    // Validate that all media files have valid URLs
    const invalidMedia = media.filter(m => !m.storage_url || m.storage_url.trim() === '')
    if (invalidMedia.length > 0) {
      console.error('❌ Invalid media files found:', invalidMedia)
      throw new Error('Some media files have invalid URLs. Please re-upload them.')
    }

    const shotstackService = new ShotstackService({
      apiKey: process.env.NEXT_PUBLIC_SHOTSTACK_API_KEY || 'demo-key',
      environment: 'sandbox'
    })

    let editConfig: EditConfig

    switch (template.id) {
      case 'slideshow':
        const imageUrls = media.filter(m => m.file_type === 'image').map(m => m.storage_url)
        editConfig = shotstackService.createSlideshow(imageUrls, {
          soundtrack: backgroundMusic,
          outputFormat: outputFormat === 'gif' ? 'gif' : 'mp4',
          resolution: outputResolution,
          aspectRatio,
          transition: selectedTransition
        })
        break


      case 'picture-in-picture':
        const videos = media.filter(m => m.file_type === 'video')
        if (videos.length >= 2) {
          editConfig = shotstackService.createPictureInPicture(
            videos[0].storage_url,
            videos[1].storage_url,
            {
              outputFormat: 'mp4',
              resolution: outputResolution
            }
          )
        } else {
          throw new Error('Picture in Picture requires at least 2 videos')
        }
        break

      case 'social-story':
        const socialPlatform = selectedPlatform === 'all' ? 'instagram' : selectedPlatform
        editConfig = shotstackService.createSocialMediaVideo(
          socialPlatform as 'instagram' | 'tiktok' | 'youtube' | 'facebook',
          {
            mediaUrls: media.map(m => m.storage_url),
            title: titleText,
            subtitle: subtitleText,
            music: backgroundMusic,
            brandColors: {
              primary: textColor,
              secondary: backgroundColor
            }
          }
        )
        break

      default:
        // Default: simple video compilation with enhanced transitions
        console.log('🎬 Using default template for video compilation')
        const clips: ClipConfig[] = []
        let currentStart = 0

        if (titleText) {
          console.log('📝 Adding title clip:', titleText)
          clips.push({
            asset: {
              type: 'title',
              text: titleText,
              style: textStyle as any,
              color: textColor,
              size: 'x-large',
              position: 'center'
            },
            start: 0,
            length: 2,
            transition: { in: 'fade', out: 'fade' }
          })
          currentStart = 2
        }

        // Get available transitions for the selected preset
        const availableTransitions = TRANSITION_PRESETS[transitionPreset as keyof typeof TRANSITION_PRESETS] || TRANSITION_PRESETS.modern
        const transitionValues = availableTransitions.map(t => t as string) // Ensure string type for all transitions

        console.log('🎬 Processing media files:', media.length)
        console.log('🎬 Available transitions:', transitionValues)

        media.forEach((file, index) => {
          const duration = file.file_type === 'video' ? (file.duration || 5) : 3
          console.log(`📎 Adding media clip ${index + 1}:`, {
            type: file.file_type,
            filename: file.filename,
            url: file.storage_url,
            start: currentStart,
            length: duration
          })
          
          // Select transition based on settings
          let transition: TransitionConfig | undefined
          if (index > 0 || titleText) {
            if (enableRandomTransitions) {
              // Random transition from available transitions
              const randomTransition = transitionValues[Math.floor(Math.random() * transitionValues.length)]
              transition = { 
                in: randomTransition as any, 
                out: randomTransition as any 
              }
            } else {
              // Use selected transition
              transition = { 
                in: selectedTransition as any, 
                out: selectedTransition as any 
              }
            }
          }
          
          const clip: ClipConfig = {
            asset: { 
              type: file.file_type === 'audio' ? 'audio' : file.file_type as 'video' | 'image',
              src: file.storage_url 
            },
            start: currentStart,
            length: duration,
            fit: 'cover',
            transition
          }
          clips.push(clip)
          currentStart += duration
        })

        console.log('🎬 Final clips array:', clips.length, 'clips')
        console.log('🎬 Clips details:', clips.map((clip, i) => ({ 
          index: i, 
          type: clip.asset.type, 
          start: clip.start, 
          length: clip.length,
          hasTransition: !!clip.transition
        })))

        editConfig = {
          timeline: {
            tracks: [{ clips }],
            background: backgroundColor,
            soundtrack: backgroundMusic ? {
              src: backgroundMusic,
              effect: 'fadeInFadeOut',
              volume: 0.3
            } : undefined
          },
          output: {
            format: outputFormat,
            resolution: outputResolution,
            aspectRatio
          }
        }

        console.log('🎬 Final edit config created with', editConfig.timeline.tracks.length, 'tracks and', 
          editConfig.timeline.tracks.reduce((sum, track) => sum + track.clips.length, 0), 'total clips')
    }

    console.log('🎬 Final edit config for video editor:', JSON.stringify({
      tracksCount: editConfig.timeline.tracks.length,
      clipsPerTrack: editConfig.timeline.tracks.map(track => track.clips.length),
      totalClips: editConfig.timeline.tracks.reduce((sum, track) => sum + track.clips.length, 0),
      firstClipAsset: editConfig.timeline.tracks[0]?.clips[0]?.asset,
      transitionSettings: {
        selectedTransition,
        transitionPreset,
        enableRandomTransitions
      }
    }, null, 2))

    setTimeline(editConfig.timeline)
    return editConfig
  }

  // Enhanced Timeline Creation with Advanced Features
  const createAdvancedTimelineFromTemplate = (template: Template, media: MediaFile[]) => {
    console.log('🎬 Creating advanced timeline with Shotstack features')
    
    const shotstackService = new ShotstackService({
      apiKey: process.env.NEXT_PUBLIC_SHOTSTACK_API_KEY || 'demo-key',
      environment: 'sandbox'
    })

    let editConfig: EditConfig

    // Enhanced template processing with advanced features
    switch (template.id) {
      case 'slideshow':
        const imageUrls = media.filter(m => m.file_type === 'image').map(m => m.storage_url)
        editConfig = shotstackService.createSlideshow(imageUrls, {
          soundtrack: backgroundMusic,
          outputFormat: outputFormat === 'gif' ? 'gif' : 'mp4',
          resolution: outputResolution,
          aspectRatio,
          transition: selectedTransition
        })
        
        // Apply advanced features
        if (selectedFilter) {
          editConfig.timeline.tracks.forEach(track => {
            track.clips.forEach(clip => {
              clip.filter = { filter: selectedFilter as any }
            })
          })
        }
        break

      case 'kinetic-text':
        const textLines = [titleText, subtitleText].filter(Boolean)
                 editConfig = shotstackService.createKineticText(textLines, {
           style: textStyle as any,
           color: textColor,
           backgroundColor,
           duration: 3,
           music: backgroundMusic,
           outputFormat: outputFormat === 'gif' ? 'mp4' : 'mp4',
           resolution: outputResolution,
           aspectRatio
         })
        break

      case 'picture-in-picture':
        const videos = media.filter(m => m.file_type === 'video')
        if (videos.length >= 2) {
          editConfig = shotstackService.createPictureInPicture(
            videos[0].storage_url,
            videos[1].storage_url,
            {
              outputFormat: 'mp4',
              resolution: outputResolution
            }
          )
        } else {
          throw new Error('Picture in Picture requires at least 2 videos')
        }
        break

      default:
        // Enhanced default template with all advanced features
        const clips: ClipConfig[] = []
        let currentStart = 0

        // Enhanced title with animation
        if (titleText) {
          clips.push({
            asset: {
              type: 'title',
              text: titleText,
              style: textStyle as any,
              color: textColor,
              size: 'x-large',
              position: 'center'
            },
            start: 0,
            length: 2,
            transition: { 
              in: textAnimation as any, 
              out: 'fade' 
            }
          })
          currentStart = 2
        }

        // Process media with advanced features
        media.forEach((file, index) => {
          const duration = file.file_type === 'video' ? (file.duration || 5) : 3
          
          const clip: ClipConfig = {
            asset: { 
              type: file.file_type === 'audio' ? 'audio' : file.file_type as 'video' | 'image',
              src: file.storage_url 
            },
            start: currentStart,
            length: duration,
            fit: 'cover',
            transition: index > 0 || titleText ? { 
              in: selectedTransition as any, 
              out: selectedTransition as any 
            } : undefined
          }

          // Apply advanced features
          if (selectedFilter) {
            clip.filter = { filter: selectedFilter as any }
          }

                     if (selectedEffect) {
             // Apply custom effects
             clip.transform = {
               rotate: effectParams.rotate || 0
             }
           }

          // Apply color grading
          if (colorGrading) {
            // Color grading would be applied through filters
            clip.filter = {
              ...clip.filter,
              // Additional color grading parameters
            }
          }

          clips.push(clip)
          currentStart += duration
        })

        editConfig = {
          timeline: {
            tracks: [{ clips }],
            background: backgroundColor,
            soundtrack: backgroundMusic ? {
              src: backgroundMusic,
              effect: 'fadeInFadeOut',
              volume: audioVolume / 100
            } : undefined
          },
          output: {
            format: outputFormat,
            resolution: outputResolution,
            aspectRatio,
            fps: 30,
            quality: previewQuality
          }
        }
    }

    return editConfig
  }

  // Start export process
  const startExport = () => {
    if (selectedMedia.length === 0 && !titleText) {
      toast.error('Please select media or add text content')
      return
    }
    setShowExportDialog(true)
  }

  // Handle export with selected options
  const handleExport = async (exportOptions: any) => {
    setShowExportDialog(false)
    setShowRenderingProgress(true)
    setRenderStatus('submitted')
    setRenderError('')
    
    // Update output settings based on export options
    setOutputFormat(exportOptions.format)
    setOutputResolution(exportOptions.resolution)
    setAspectRatio(exportOptions.aspectRatio)
    
    await startRendering(exportOptions)
  }

  // Start rendering video
  const startRendering = async (exportOptions?: any) => {
    console.log('🚀 Starting video rendering...')
    console.log('📁 Selected media count:', selectedMedia.length)
    console.log('📁 Selected media:', selectedMedia.map(m => ({ id: m.id, filename: m.filename, type: m.file_type, url: m.storage_url })))
    console.log('📝 Title text:', titleText)
    console.log('🎨 Selected template:', selectedTemplate?.name || 'Default')
    console.log('⚙️ Export options:', exportOptions)

    if (selectedMedia.length === 0 && !titleText) {
      toast.error('Please select media or add text content')
      return
    }

    try {
      setIsLoading(true)
      setIsRendering(true)
      setRenderStatus('submitted')
      setRenderProgress(0)

      let editConfig: any

      // Use music synchronization if enabled and music is provided
      if (enableMusicSync && backgroundMusic && selectedMedia.length > 0) {
        console.log('🎵 Using music-synchronized editing')
        
        try {
          const response = await fetch('/api/music-sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
            },
            body: JSON.stringify({
              mediaFiles: selectedMedia.map(media => ({
                url: media.storage_url,
                type: media.file_type,
                duration: media.duration || 3
              })),
              musicUrl: backgroundMusic,
              options: {
                title: titleText,
                subtitle: subtitleText,
                outputFormat,
                resolution: outputResolution,
                aspectRatio,
                backgroundColor
              },
              pacingConfig
            })
          })

          if (response.ok) {
            const result = await response.json()
            editConfig = result.data.editConfig
            console.log('🎵 Music-synchronized edit created:', result.data.summary)
          } else {
            console.warn('Music sync failed, falling back to template editing')
            const template = selectedTemplate || VIDEO_TEMPLATES[0]
            editConfig = createTimelineFromTemplate(template, selectedMedia)
          }
        } catch (error) {
          console.error('Music sync error, falling back to template editing:', error)
          const template = selectedTemplate || VIDEO_TEMPLATES[0]
          editConfig = createTimelineFromTemplate(template, selectedMedia)
        }
      } else {
        // Use regular template editing
        const template = selectedTemplate || VIDEO_TEMPLATES[0]
        editConfig = createTimelineFromTemplate(template, selectedMedia)
      }

      // Ensure all settings are applied to the edit configuration
      if (editConfig.timeline) {
        // Apply background color
        editConfig.timeline.background = backgroundColor
        
        // Apply soundtrack if provided
        if (backgroundMusic) {
          editConfig.timeline.soundtrack = {
            src: backgroundMusic,
            effect: 'fadeInFadeOut',
            volume: 0.3
          }
        }
      }

      // Apply output settings
      if (editConfig.output) {
        editConfig.output.format = outputFormat
        editConfig.output.resolution = outputResolution
        editConfig.output.aspectRatio = aspectRatio
      }

      console.log('🎬 Final edit config with applied settings:', JSON.stringify({
        background: editConfig.timeline?.background,
        soundtrack: editConfig.timeline?.soundtrack?.src,
        outputFormat: editConfig.output?.format,
        resolution: editConfig.output?.resolution,
        aspectRatio: editConfig.output?.aspectRatio,
        tracksCount: editConfig.timeline?.tracks?.length,
        totalClips: editConfig.timeline?.tracks?.reduce((sum: number, track: any) => sum + track.clips.length, 0)
      }, null, 2))

      toast.info('Starting video render...', { duration: 3000 })

      const response = await fetch('/api/shotstack/render', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          edit: editConfig,
          projectName
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to start rendering')
      }

      toast.success('Video rendering started!')
      
      // Start progress polling
      setCurrentJobId(result.jobId)
      pollRenderProgress(result.jobId)
      
    } catch (error) {
      console.error('Error starting render:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to start rendering')
      setIsRendering(false)
    } finally {
      setIsLoading(false)
    }
  }

  // Poll render progress
  const pollRenderProgress = (jobId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/shotstack/render?jobId=${jobId}`, {
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
          }
        })

        const result = await response.json()

        if (response.ok) {
          // Update progress based on status
          setRenderStatus(result.status)
          
          switch (result.status) {
            case 'submitted':
              setRenderProgress(10)
              setEstimatedTimeRemaining('5-10 minutes')
              break
            case 'queued':
              setRenderProgress(25)
              setEstimatedTimeRemaining('3-8 minutes')
              break
            case 'fetching':
              setRenderProgress(50)
              setEstimatedTimeRemaining('2-5 minutes')
              break
            case 'rendering':
              setRenderProgress(75)
              setEstimatedTimeRemaining('1-3 minutes')
              break
            case 'done':
              setRenderProgress(100)
              clearInterval(pollInterval)
              setIsRendering(false)
              setFinalVideoUrl(result.url || '')
              setShowRenderingProgress(false)
              setShowFinalPresentation(true)
              toast.success('Video render completed!')
              break
            case 'failed':
              clearInterval(pollInterval)
              setIsRendering(false)
              setRenderError(result.error || 'Video render failed')
              setRenderStatus('failed')
              toast.error(result.error || 'Video render failed')
              break
          }
        }
      } catch (error) {
        console.error('Error polling render status:', error)
        setRenderError('Failed to check render status')
      }
    }, 3000)

    // Clear polling after 10 minutes
    setTimeout(() => {
      clearInterval(pollInterval)
      setIsRendering(false)
    }, 600000)
  }

  // Get available transitions based on current preset
  const getAvailableTransitions = () => {
    if (showAllTransitions) {
      return ALL_TRANSITIONS;
    }
    return TRANSITION_PRESETS[transitionPreset];
  };

  // Get transitions grouped by category for better organization
  const getTransitionsByCategory = () => {
    if (!showAllTransitions) {
      return { [transitionPreset]: getAvailableTransitions() };
    }
    return TRANSITION_CATEGORIES;
  };

  // Workflow steps definition
  const workflowSteps = [
    {
      id: 1,
      title: 'Select Media',
      description: 'Choose videos, images, or audio files for your project',
      icon: '🎬',
      required: true,
      completed: selectedMedia.length > 0
    },
    {
      id: 2,
      title: 'Choose Template',
      description: 'Pick a template or create a custom layout',
      icon: '🎨',
      required: false,
      completed: selectedTemplate !== null
    },
    {
      id: 3,
      title: 'Add Text & Music',
      description: 'Add titles, subtitles, and background music',
      icon: '📝',
      required: false,
      completed: titleText.length > 0 || backgroundMusic.length > 0
    },
    {
      id: 4,
      title: 'Set Transitions',
      description: 'Choose how clips transition between each other',
      icon: '✨',
      required: false,
      completed: selectedTransition !== 'fade' || enableRandomTransitions
    },
    {
      id: 5,
      title: 'Configure Output',
      description: 'Set resolution, format, and platform settings',
      icon: '⚙️',
      required: false,
      completed: outputResolution !== 'hd' || aspectRatio !== '16:9'
    },
    {
      id: 6,
      title: 'Create Video',
      description: 'Generate your final video',
      icon: '🚀',
      required: true,
      completed: false
    }
  ];

  // Workflow navigation functions
  const nextStep = () => {
    if (currentStep < workflowSteps.length) {
      setCurrentStep(currentStep + 1);
      setCompletedSteps(prev => new Set([...prev, currentStep]));
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (step: number) => {
    setCurrentStep(step);
  };

  const canProceedToStep = (step: number) => {
    if (step === 1) return true;
    if (step === 2) return selectedMedia.length > 0;
    if (step === 6) return selectedMedia.length > 0;
    return true; // Other steps are optional
  };

  const getStepTab = (step: number) => {
    switch (step) {
      case 1: return 'media';
      case 2: return 'templates';
      case 3: return 'timeline';
      case 4: return 'timeline';
      case 5: return 'settings';
      case 6: return 'timeline';
      default: return 'media';
    }
  };

  // Enhanced renderTabContent with advanced features
  const renderTabContent = () => {
    switch (activeTab) {
      case 'media':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">Media Library</h3>
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => setShowPixabaySearch(!showPixabaySearch)}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-[15px] px-3 py-2"
                >
                  <Search className="w-4 h-4 mr-2" />
                  {showPixabaySearch ? 'Hide' : 'Search'} Pixabay
                </Button>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-[20px] px-4 py-2"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Upload Media
                </Button>
                <Button
                  onClick={loadMedia}
                  disabled={isLoadingMedia}
                  variant="outline"
                  size="sm"
                  className="bg-white/30 backdrop-blur-[25px] border border-white/40 hover:bg-white/50 text-gray-800 rounded-[20px]"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingMedia ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Upload Progress */}
            {isUploading && (
              <div className="bg-white/30 backdrop-blur-[25px] border border-white/40 rounded-[20px] p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Loader2 className="w-5 h-5 animate-spin text-orange-600" />
                  <span className="text-sm font-medium text-gray-800">Uploading media...</span>
                </div>
                <Progress value={uploadProgress} className="w-full h-2" />
                <p className="text-xs text-gray-600 mt-1">{Math.round(uploadProgress)}% complete</p>
              </div>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,audio/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Pixabay Search */}
            {showPixabaySearch && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 p-4 mb-6">
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    placeholder="Search for images, videos, and music..."
                    value={pixabayQuery}
                    onChange={(e) => setPixabayQuery(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    value={pixabayType}
                    onChange={(e) => setPixabayType(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All</option>
                    <option value="images">Images</option>
                    <option value="videos">Videos</option>
                    <option value="audio">Music</option>
                  </select>
                  <Button
                    onClick={async () => {
                      if (!pixabayQuery.trim()) return;
                      
                      setPixabayLoading(true);
                      try {
                        const response = await fetch(`/api/pixabay?q=${encodeURIComponent(pixabayQuery)}&type=${pixabayType}`, {
                          headers: {
                            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
                          }
                        });
                        
                        if (response.ok) {
                          const result = await response.json();
                          setPixabayResults(result.data);
                          toast.success(`Found ${(result.data.images?.hits?.length || 0) + (result.data.videos?.hits?.length || 0) + (result.data.audio?.hits?.length || 0)} results`);
                        } else {
                          toast.error('Failed to search Pixabay');
                        }
                      } catch (error) {
                        console.error('Pixabay search failed:', error);
                        toast.error('Pixabay search failed');
                      } finally {
                        setPixabayLoading(false);
                      }
                    }}
                    disabled={pixabayLoading || !pixabayQuery.trim()}
                    className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg px-4 py-2 disabled:opacity-50"
                  >
                    {pixabayLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                {/* Pixabay Results */}
                {pixabayResults && (
                  <div className="space-y-4">
                    {/* Images */}
                    {pixabayResults.images?.hits?.length > 0 && (
                      <div>
                        <h5 className="font-medium text-gray-800 mb-2">Images ({pixabayResults.images.hits.length})</h5>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {pixabayResults.images.hits.slice(0, 8).map((image: any) => (
                            <div key={image.id} className="relative group">
                              <img
                                src={image.previewURL}
                                alt={image.tags}
                                className="w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => {
                                  // Create a temporary media object for preview
                                  const tempMedia = {
                                    id: `pixabay-${image.id}`,
                                    storage_url: image.largeImageURL,
                                    thumbnail_url: image.previewURL,
                                    filename: `pixabay-image-${image.id}.jpg`,
                                    file_type: 'image' as const,
                                    selected: false,
                                    alt_text: image.tags
                                  };
                                  openMediaPreview(tempMedia);
                                }}
                              />
                              <Button
                                onClick={async () => {
                                  try {
                                    const response = await fetch('/api/pixabay', {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
                                      },
                                      body: JSON.stringify({
                                        mediaId: image.id,
                                        mediaType: 'image',
                                        size: 'large'
                                      })
                                    });
                                    
                                    if (response.ok) {
                                      const result = await response.json();
                                      setAvailableMedia(prev => [...prev, result.data.mediaFile]);
                                      toast.success('Image added to your library!');
                                    } else {
                                      toast.error('Failed to download image');
                                    }
                                  } catch (error) {
                                    console.error('Download failed:', error);
                                    toast.error('Download failed');
                                  }
                                }}
                                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center text-white text-sm"
                              >
                                <Download className="w-4 h-4 mr-1" />
                                Download
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Videos */}
                    {pixabayResults.videos?.hits?.length > 0 && (
                      <div>
                        <h5 className="font-medium text-gray-800 mb-2">Videos ({pixabayResults.videos.hits.length})</h5>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {pixabayResults.videos.hits.slice(0, 8).map((video: any) => (
                            <div key={video.id} className="relative group">
                              <video
                                src={video.videos.tiny.url}
                                className="w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                                muted
                                loop
                                onClick={() => {
                                  // Create a temporary media object for preview
                                  const tempMedia = {
                                    id: `pixabay-${video.id}`,
                                    storage_url: video.videos.medium.url,
                                    thumbnail_url: video.videos.tiny.url,
                                    filename: `pixabay-video-${video.id}.mp4`,
                                    file_type: 'video' as const,
                                    selected: false,
                                    duration: video.duration
                                  };
                                  openMediaPreview(tempMedia);
                                }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-8 h-8 bg-black/50 rounded-full flex items-center justify-center">
                                  <Play className="w-4 h-4 text-white ml-0.5" />
                                </div>
                              </div>
                              <Button
                                onClick={async () => {
                                  try {
                                    const response = await fetch('/api/pixabay', {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
                                      },
                                      body: JSON.stringify({
                                        mediaId: video.id,
                                        mediaType: 'video',
                                        size: 'medium'
                                      })
                                    });
                                    
                                    if (response.ok) {
                                      const result = await response.json();
                                      setAvailableMedia(prev => [...prev, result.data.mediaFile]);
                                      toast.success('Video added to your library!');
                                    } else {
                                      toast.error('Failed to download video');
                                    }
                                  } catch (error) {
                                    console.error('Download failed:', error);
                                    toast.error('Download failed');
                                  }
                                }}
                                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center text-white text-sm"
                              >
                                <Download className="w-4 h-4 mr-1" />
                                Download
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Audio */}
                    {pixabayResults.audio?.hits?.length > 0 && (
                      <div>
                        <h5 className="font-medium text-gray-800 mb-2">Music ({pixabayResults.audio.hits.length})</h5>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {pixabayResults.audio.hits.slice(0, 8).map((audio: any) => (
                            <div key={audio.id} className="relative group">
                              <div 
                                className="w-full h-24 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => {
                                  // Create a temporary media object for preview
                                  const tempMedia = {
                                    id: `pixabay-${audio.id}`,
                                    storage_url: audio.audioURL,
                                    thumbnail_url: audio.previewURL,
                                    filename: `pixabay-audio-${audio.id}.mp3`,
                                    file_type: 'audio' as const,
                                    selected: false,
                                    duration: audio.duration
                                  };
                                  openMediaPreview(tempMedia);
                                }}
                              >
                                <Music className="w-8 h-8 text-white" />
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-2 rounded-b-lg">
                                <div className="truncate">{audio.tags.split(',')[0]}</div>
                                <div>{Math.floor(audio.duration / 60)}:{(audio.duration % 60).toString().padStart(2, '0')}</div>
                              </div>
                              <Button
                                onClick={async () => {
                                  try {
                                    const response = await fetch('/api/pixabay', {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
                                      },
                                      body: JSON.stringify({
                                        mediaId: audio.id,
                                        mediaType: 'audio'
                                      })
                                    });
                                    
                                    if (response.ok) {
                                      const result = await response.json();
                                      setAvailableMedia(prev => [...prev, result.data.mediaFile]);
                                      toast.success('Music added to your library!');
                                    } else {
                                      toast.error('Failed to download music');
                                    }
                                  } catch (error) {
                                    console.error('Download failed:', error);
                                    toast.error('Download failed');
                                  }
                                }}
                                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center text-white text-sm"
                              >
                                <Download className="w-4 h-4 mr-1" />
                                Download
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {isLoadingMedia ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-orange-600" />
                <span className="text-gray-800 ml-3">Loading media...</span>
              </div>
            ) : availableMedia.length === 0 ? (
              <div
                className={`border-2 border-dashed rounded-[20px] p-12 text-center transition-all duration-300 ${
                  dragActive 
                    ? 'border-orange-400 bg-orange-50/50' 
                    : 'border-white/40 hover:border-orange-300'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className="bg-white/40 backdrop-blur-[25px] border border-white/50 rounded-full p-6 mx-auto w-20 h-20 flex items-center justify-center mb-4">
                  <Video className="w-8 h-8 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Upload Your Media</h3>
                <p className="text-gray-600 mb-4">Drag and drop videos, images, or audio files here, or click to browse</p>
                <p className="text-sm text-gray-500 mb-6">Supports: MP4, MOV, JPG, PNG, MP3, WAV</p>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-[20px] px-6 py-3"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Choose Files
                </Button>
              </div>
            ) : (
              <>
                {/* Upload Section for existing media */}
                <div
                  className={`border-2 border-dashed rounded-[20px] p-4 text-center transition-all duration-300 mb-6 ${
                    dragActive 
                      ? 'border-orange-400 bg-orange-50/50' 
                      : 'border-white/40 hover:border-orange-300'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <div className="flex items-center justify-center gap-3">
                    <Plus className="w-5 h-5 text-orange-600" />
                    <span className="text-sm font-medium text-gray-700">
                      Drag and drop more files here or click Upload Media above
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {availableMedia.map((media) => (
                  <motion.div
                    key={media.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div 
                      className={`cursor-pointer transition-all duration-300 p-3 bg-white/25 backdrop-blur-[35px] border border-white/40 rounded-[20px] hover:bg-white/35 ${
                        media.selected 
                          ? 'ring-2 ring-orange-400/50 bg-orange-100/40' 
                          : ''
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        openMediaPreview(media);
                      }}
                    >
                      <div className="aspect-video rounded-[15px] bg-white/20 mb-2 flex items-center justify-center relative overflow-hidden">
                        {media.thumbnail_url ? (
                          <img 
                            src={media.thumbnail_url} 
                            alt={media.filename}
                            className="w-full h-full object-cover rounded-[15px]"
                            onError={(e) => {
                              console.log('❌ Thumbnail failed to load for:', media.filename, 'URL:', media.thumbnail_url)
                              // Fallback to direct URL if thumbnail fails
                              const target = e.target as HTMLImageElement;
                              if (media.file_type === 'image') {
                                console.log('🔄 Falling back to direct image URL:', media.storage_url)
                                target.src = media.storage_url;
                              }
                            }}
                            onLoad={() => {
                              console.log('✅ Thumbnail loaded successfully for:', media.filename)
                            }}
                          />
                        ) : media.file_type === 'image' ? (
                          <img 
                            src={media.storage_url} 
                            alt={media.filename}
                            className="w-full h-full object-cover rounded-[15px]"
                            onError={(e) => {
                              console.log('❌ Direct image failed to load for:', media.filename, 'URL:', media.storage_url)
                            }}
                            onLoad={() => {
                              console.log('✅ Direct image loaded successfully for:', media.filename)
                            }}
                          />
                        ) : media.file_type === 'video' ? (
                          <div className="relative w-full h-full">
                            <video 
                              src={media.storage_url}
                              className="w-full h-full object-cover rounded-[15px]"
                              preload="metadata"
                              muted
                              onError={(e) => {
                                console.log('❌ Video failed to load for:', media.filename, 'URL:', media.storage_url)
                              }}
                              onLoadedData={async (e) => {
                                console.log('✅ Video loaded successfully for:', media.filename)
                                try {
                                  const video = e.target as HTMLVideoElement;
                                  const thumbnailUrl = await generateVideoThumbnail(video);
                                  
                                  // Update the media item with the generated thumbnail
                                  setAvailableMedia(prev => prev.map(m => 
                                    m.id === media.id 
                                      ? { ...m, thumbnail_url: thumbnailUrl }
                                      : m
                                  ));

                                  // Save thumbnail to server
                                  const session = await supabase.auth.getSession();
                                  if (session.data.session?.access_token) {
                                    const result = await saveThumbnailToServer(
                                      media.id,
                                      media.storage_url,
                                      media.file_type,
                                      session.data.session.access_token
                                    );
                                    
                                    if (result.success) {
                                      console.log('✅ Thumbnail saved to server');
                                    } else {
                                      console.error('Failed to save thumbnail:', result.error);
                                    }
                                  }
                                } catch (error) {
                                  console.error('Failed to generate thumbnail:', error);
                                }
                              }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-8 h-8 bg-black/50 rounded-full flex items-center justify-center">
                                <Play className="w-4 h-4 text-white ml-0.5" />
                              </div>
                            </div>
                          </div>
                        ) : media.file_type === 'audio' ? (
                          <div className="relative w-full h-full">
                            <img 
                              src={createAudioPlaceholder()}
                              alt="Audio file"
                              className="w-full h-full object-cover rounded-[15px]"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-8 h-8 bg-black/50 rounded-full flex items-center justify-center">
                                <Music className="w-4 h-4 text-white" />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-orange-600">
                            <ImageIcon className="w-6 h-6" />
                          </div>
                        )}
                        {media.selected && (
                          <div className="absolute inset-0 bg-orange-500/30 flex items-center justify-center rounded-[15px]">
                            <CheckCircle className="w-6 h-6 text-white" />
                          </div>
                        )}
                        <div className="absolute bottom-1 left-1 bg-white/40 backdrop-blur-[15px] rounded-full p-1">
                          {media.file_type === 'video' && <Video className="w-3 h-3 text-orange-600" />}
                          {media.file_type === 'image' && <ImageIcon className="w-3 h-3 text-orange-600" />}
                          {media.file_type === 'audio' && <Music className="w-3 h-3 text-orange-600" />}
                        </div>
                      </div>
                      <h4 className="font-medium text-gray-800 text-xs truncate">
                        {media.filename}
                      </h4>
                      {media.duration && (
                        <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
                          <Clock className="w-3 h-3" />
                          {Math.round(media.duration)}s
                        </div>
                      )}
                    </div>
                  </motion.div>
                  ))}
                </div>
              </>
            )}

            {/* Advanced Media Features */}
            <div className="bg-white/20 backdrop-blur-[25px] border border-white/40 rounded-[20px] p-4">
              <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-purple-600" />
                Advanced Media Features
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Filters */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2">Video/Image Filters</Label>
                  <select
                    value={selectedFilter}
                    onChange={(e) => setSelectedFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">No Filter</option>
                    {Object.entries(SHOTSTACK_ADVANCED_FEATURES.filters).map(([key, filter]) => (
                      <option key={key} value={key}>{filter.name}</option>
                    ))}
                  </select>
                  
                  {selectedFilter && (
                    <div className="mt-2">
                      <Label className="text-sm font-medium text-gray-700">
                        Intensity: {filterIntensity}%
                      </Label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={filterIntensity}
                        onChange={(e) => setFilterIntensity(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                      />
                    </div>
                  )}
                </div>

                {/* Effects */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2">Special Effects</Label>
                  <select
                    value={selectedEffect}
                    onChange={(e) => setSelectedEffect(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">No Effect</option>
                    {Object.entries(SHOTSTACK_ADVANCED_FEATURES.effects).map(([key, effect]) => (
                      <option key={key} value={key}>{effect.name}</option>
                    ))}
                  </select>
                </div>

                {/* Color Grading */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2">Color Grading</Label>
                  <select
                    value={colorGrading}
                    onChange={(e) => setColorGrading(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">No Color Grading</option>
                    {Object.entries(SHOTSTACK_ADVANCED_FEATURES.colorGrading).map(([key, grading]) => (
                      <option key={key} value={key}>{grading.name}</option>
                    ))}
                  </select>
                </div>

                {/* Real-time Preview */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2">Preview Quality</Label>
                  <select
                    value={previewQuality}
                    onChange={(e) => setPreviewQuality(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="low">Low (Fast)</option>
                    <option value="medium">Medium (Balanced)</option>
                    <option value="high">High (Slow)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )

      case 'templates':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">Video Templates</h3>
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="bg-white/30 backdrop-blur-[25px] border border-white/40 rounded-[15px] text-gray-800 px-3 py-2 text-sm"
              >
                <option value="all">All Platforms</option>
                {SOCIAL_PLATFORMS.map(platform => (
                  <option key={platform.id} value={platform.id}>{platform.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {VIDEO_TEMPLATES.filter(template => 
                selectedPlatform === 'all' || template.platform === 'all' || template.platform === selectedPlatform
              ).map((template) => (
                <motion.div
                  key={template.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div 
                    className={`cursor-pointer transition-all duration-300 p-4 bg-white/25 backdrop-blur-[35px] border border-white/40 rounded-[20px] hover:bg-white/35 ${
                      selectedTemplate?.id === template.id 
                        ? 'ring-2 ring-orange-400/50 bg-orange-100/40' 
                        : ''
                    }`}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <div className="aspect-video rounded-[15px] bg-white/20 mb-3 flex items-center justify-center">
                      <Layout className="w-8 h-8 text-orange-600" />
                    </div>
                    <h4 className="font-semibold text-gray-800 mb-1">{template.name}</h4>
                    <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                    <Badge 
                      variant="secondary"
                      className="bg-white/40 border-white/50 text-gray-800 text-xs"
                    >
                      {template.category}
                    </Badge>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )

      case 'timeline':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-800">
              Timeline Editor
            </h3>
            


            {/* Music Synchronization Settings */}
            <div className="bg-white/20 backdrop-blur-[25px] border border-white/40 rounded-[20px] p-4 mb-6">
              <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Music className="w-5 h-5 text-purple-600" />
                Music Synchronization
              </h4>
              
              <div className="space-y-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                {/* Enable Music Sync Toggle */}
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableMusicSync}
                      onChange={(e) => setEnableMusicSync(e.target.checked)}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Enable Music-Synchronized Pacing
                    </span>
                  </label>
                </div>

                {enableMusicSync && (
                  <div className="space-y-4">
                    {/* Music Analysis Display */}
                    {musicAnalysis && (
                      <div className="bg-white/50 rounded-lg p-3">
                        <h5 className="font-medium text-gray-800 mb-2">Music Analysis</h5>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-600">BPM:</span>
                            <span className="ml-2 font-medium">{musicAnalysis.bpm}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Energy:</span>
                            <span className="ml-2 font-medium">{Math.round(musicAnalysis.energy * 100)}%</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Tempo:</span>
                            <span className="ml-2 font-medium">{musicAnalysis.tempo}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Key:</span>
                            <span className="ml-2 font-medium">{musicAnalysis.key}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Pacing Configuration */}
                    <div className="space-y-3">
                      <h5 className="font-medium text-gray-800">Pacing Configuration</h5>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Slow Motion Threshold: {pacingConfig.slowMotionThreshold}
                          </label>
                          <input
                            type="range"
                            min="0.1"
                            max="0.5"
                            step="0.1"
                            value={pacingConfig.slowMotionThreshold}
                            onChange={(e) => setPacingConfig(prev => ({
                              ...prev,
                              slowMotionThreshold: parseFloat(e.target.value)
                            }))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Fast Pace Threshold: {pacingConfig.fastPaceThreshold}
                          </label>
                          <input
                            type="range"
                            min="0.5"
                            max="0.9"
                            step="0.1"
                            value={pacingConfig.fastPaceThreshold}
                            onChange={(e) => setPacingConfig(prev => ({
                              ...prev,
                              fastPaceThreshold: parseFloat(e.target.value)
                            }))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={pacingConfig.beatSync}
                            onChange={(e) => setPacingConfig(prev => ({
                              ...prev,
                              beatSync: e.target.checked
                            }))}
                            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            Sync Cuts to Beats
                          </span>
                        </label>
                        
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={pacingConfig.dynamicSpeed}
                            onChange={(e) => setPacingConfig(prev => ({
                              ...prev,
                              dynamicSpeed: e.target.checked
                            }))}
                            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            Dynamic Speed Variations
                          </span>
                        </label>
                      </div>
                    </div>

                    {/* Music Analysis Button */}
                    <Button
                      onClick={async () => {
                        if (!backgroundMusic) {
                          toast.error('Please add a background music URL first');
                          return;
                        }
                        
                        try {
                          const response = await fetch(`/api/music-sync?musicUrl=${encodeURIComponent(backgroundMusic)}`, {
                            headers: {
                              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
                            }
                          });
                          
                          if (response.ok) {
                            const result = await response.json();
                            setMusicAnalysis(result.data.analysis);
                            toast.success('Music analysis completed!');
                          } else {
                            const errorData = await response.json();
                            toast.error(errorData.error || 'Failed to analyze music');
                          }
                        } catch (error) {
                          console.error('Music analysis failed:', error);
                          toast.error('Music analysis failed');
                        }
                      }}
                      disabled={!backgroundMusic}
                      className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white rounded-[15px] px-4 py-2 disabled:opacity-50"
                    >
                      <Music className="w-4 h-4 mr-2" />
                      {backgroundMusic ? 'Analyze Music' : 'Add Music URL First'}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Transition Settings */}
            <div className="bg-white/20 backdrop-blur-[25px] border border-white/40 rounded-[20px] p-4">
              <h4 className="font-semibold text-gray-800 mb-4">Transition Settings</h4>
              
              <div className="space-y-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  Transition Settings
                </h3>
                
                {/* Transition Mode Toggle */}
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showAllTransitions}
                      onChange={(e) => setShowAllTransitions(e.target.checked)}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Show All Available Transitions
                    </span>
                  </label>
                </div>

                {/* Preset Selection (only when not showing all transitions) */}
                {!showAllTransitions && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Transition Preset
                    </label>
                    <select
                      value={transitionPreset}
                      onChange={(e) => {
                        setTransitionPreset(e.target.value as keyof typeof TRANSITION_PRESETS);
                        setSelectedTransition(TRANSITION_PRESETS[e.target.value as keyof typeof TRANSITION_PRESETS][0]);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="modern">Modern & Clean</option>
                      <option value="instagram">Instagram Style</option>
                      <option value="facebook">Facebook Style</option>
                      <option value="tiktok">TikTok Style</option>
                      <option value="youtube">YouTube Style</option>
                    </select>
                  </div>
                )}

                {/* Individual Transition Selection */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Selected Transition
                  </label>
                  <select
                    value={selectedTransition}
                    onChange={(e) => setSelectedTransition(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    {showAllTransitions ? (
                      Object.entries(getTransitionsByCategory()).map(([category, transitions]) => (
                        <optgroup key={category} label={category}>
                          {(transitions as string[]).map((transition: string) => (
                            <option key={transition} value={transition}>
                              {transition}
                            </option>
                          ))}
                        </optgroup>
                      ))
                    ) : (
                      getAvailableTransitions().map((transition: string) => (
                        <option key={transition} value={transition}>
                          {transition}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Random Transitions Toggle */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="randomTransitions"
                    checked={enableRandomTransitions}
                    onChange={(e) => setEnableRandomTransitions(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="randomTransitions" className="text-sm font-medium text-gray-700 cursor-pointer">
                    Enable Random Transitions
                  </label>
                </div>

                {/* Transition Duration */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Transition Duration: {transitionDuration}s
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="2.0"
                    step="0.1"
                    value={transitionDuration}
                    onChange={(e) => setTransitionDuration(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                </div>

                {/* Transition Preview */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Available Transitions
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                    {showAllTransitions ? (
                      Object.entries(getTransitionsByCategory()).map(([category, transitions]) => (
                        <div key={category} className="col-span-full">
                          <div className="text-xs font-medium text-gray-500 mb-1">{category}</div>
                          <div className="grid grid-cols-3 gap-1">
                            {(transitions as string[]).map((transition: string) => (
                              <button
                                key={transition}
                                onClick={() => setSelectedTransition(transition)}
                                className={`px-2 py-1 text-xs rounded border transition-colors ${
                                  selectedTransition === transition
                                    ? 'bg-purple-100 border-purple-300 text-purple-700'
                                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}
                              >
                                {transition}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      getAvailableTransitions().map((transition) => (
                        <button
                          key={transition}
                          onClick={() => setSelectedTransition(transition)}
                          className={`px-2 py-1 text-xs rounded border transition-colors ${
                            selectedTransition === transition
                              ? 'bg-purple-100 border-purple-300 text-purple-700'
                              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {transition}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline visualization */}
            <div className="bg-white/20 backdrop-blur-[25px] border border-white/40 rounded-[20px] p-4">
              <h4 className="font-semibold text-gray-800 mb-3">Timeline Preview</h4>
              <div className="space-y-2">
                {titleText && (
                  <div className="bg-blue-100/40 border border-blue-200/40 rounded-[10px] p-2 text-sm">
                    <Type className="w-4 h-4 inline mr-2" />
                    Title: {titleText} (2s)
                  </div>
                )}
                {selectedMedia.map((media, index) => (
                  <div key={media.id} className="bg-white/30 border border-white/40 rounded-[10px] p-2 text-sm">
                    {media.file_type === 'video' && <Video className="w-4 h-4 inline mr-2" />}
                    {media.file_type === 'image' && <ImageIcon className="w-4 h-4 inline mr-2" />}
                    {media.file_type === 'audio' && <Music className="w-4 h-4 inline mr-2" />}
                    {media.filename} ({media.file_type === 'video' ? (media.duration || 5) : 3}s)
                    {index > 0 && (
                      <span className="ml-2 text-xs bg-orange-100/50 px-2 py-1 rounded-full">
                        {enableRandomTransitions ? 'Random' : selectedTransition}
                      </span>
                    )}
                  </div>
                ))}
                {backgroundMusic && (
                  <div className="bg-green-100/40 border border-green-200/40 rounded-[10px] p-2 text-sm">
                    <Music className="w-4 h-4 inline mr-2" />
                    Background Music
                  </div>
                )}
              </div>
            </div>

            {/* Advanced Timeline Features */}
            <div className="bg-white/20 backdrop-blur-[25px] border border-white/40 rounded-[20px] p-4">
              <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Scissors className="w-5 h-5 text-blue-600" />
                Advanced Timeline Features
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Timeline Controls */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2">Timeline Zoom</Label>
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={timelineZoom}
                    onChange={(e) => setTimelineZoom(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <span className="text-xs text-gray-600">{timelineZoom}x</span>
                </div>

                {/* Snapping */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      id="enableSnapping"
                      checked={enableSnapping}
                      onChange={(e) => setEnableSnapping(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <Label htmlFor="enableSnapping" className="text-sm font-medium text-gray-700">
                      Enable Snapping
                    </Label>
                  </div>
                  
                  {enableSnapping && (
                    <div>
                      <Label className="text-sm font-medium text-gray-700">
                        Snap Threshold: {snapThreshold}s
                      </Label>
                      <input
                        type="range"
                        min="0.05"
                        max="0.5"
                        step="0.05"
                        value={snapThreshold}
                        onChange={(e) => setSnapThreshold(parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                      />
                    </div>
                  )}
                </div>

                {/* Audio Features */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2">Audio Fade In: {audioFadeIn}s</Label>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.1"
                    value={audioFadeIn}
                    onChange={(e) => setAudioFadeIn(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2">Audio Fade Out: {audioFadeOut}s</Label>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.1"
                    value={audioFadeOut}
                    onChange={(e) => setAudioFadeOut(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                </div>

                {/* Video Features */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2">Video Speed: {videoSpeed}x</Label>
                  <input
                    type="range"
                    min="0.25"
                    max="4"
                    step="0.25"
                    value={videoSpeed}
                    onChange={(e) => setVideoSpeed(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      id="enableMotionBlur"
                      checked={enableMotionBlur}
                      onChange={(e) => setEnableMotionBlur(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <Label htmlFor="enableMotionBlur" className="text-sm font-medium text-gray-700">
                      Motion Blur
                    </Label>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="enableStabilization"
                      checked={enableStabilization}
                      onChange={(e) => setEnableStabilization(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <Label htmlFor="enableStabilization" className="text-sm font-medium text-gray-700">
                      Video Stabilization
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      case 'settings':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-800">Project Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Project Name</Label>
                  <Input
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="bg-white/30 backdrop-blur-[25px] border border-white/40 rounded-[15px] text-gray-800"
                  />
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-700">Output Format</Label>
                  <select
                    value={outputFormat}
                    onChange={(e) => setOutputFormat(e.target.value as any)}
                    className="w-full bg-white/30 backdrop-blur-[25px] border border-white/40 rounded-[15px] text-gray-800 p-2"
                  >
                    <option value="mp4">MP4 Video</option>
                    <option value="gif">GIF Animation</option>
                    <option value="jpg">JPEG Image</option>
                    <option value="png">PNG Image</option>
                  </select>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700">Resolution</Label>
                  <select
                    value={outputResolution}
                    onChange={(e) => setOutputResolution(e.target.value as any)}
                    className="w-full bg-white/30 backdrop-blur-[25px] border border-white/40 rounded-[15px] text-gray-800 p-2"
                  >
                    <option value="full-hd">Full HD (1080p)</option>
                    <option value="hd">HD (720p)</option>
                    <option value="sd">SD (480p)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Aspect Ratio</Label>
                  <select
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value as any)}
                    className="w-full bg-white/30 backdrop-blur-[25px] border border-white/40 rounded-[15px] text-gray-800 p-2"
                  >
                    <option value="16:9">16:9 (Landscape)</option>
                    <option value="9:16">9:16 (Portrait/Stories)</option>
                    <option value="1:1">1:1 (Square)</option>
                    <option value="4:5">4:5 (Instagram)</option>
                  </select>
                </div>

                <div className="bg-white/20 backdrop-blur-[25px] border border-white/40 rounded-[15px] p-4">
                  <h4 className="font-medium text-gray-800 mb-2">Platform Presets</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {SOCIAL_PLATFORMS.map(platform => {
                      const Icon = platform.icon
                      return (
                        <Button
                          key={platform.id}
                          variant="outline"
                          size="sm"
                          onClick={() => setAspectRatio(platform.aspectRatio as any)}
                          className="bg-white/30 border-white/40 text-gray-800 hover:bg-white/50 text-xs"
                        >
                          <Icon className="w-3 h-3 mr-1" />
                          {platform.name}
                        </Button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      case 'settings':
        return (
          <div className="space-y-6">
            {/* Advanced Mode Content */}
            {workflowMode === 'advanced' && (
              <div className="bg-white/20 backdrop-blur-[25px] border border-white/40 rounded-[20px] p-4">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Background Color</Label>
                    <Input
                      type="color"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="bg-white/30 backdrop-blur-[25px] border border-white/40 rounded-[15px] h-10"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700">Background Music URL</Label>
                    <Input
                      value={backgroundMusic}
                      onChange={(e) => setBackgroundMusic(e.target.value)}
                      placeholder="https://example.com/music.mp3"
                      className="bg-white/30 backdrop-blur-[25px] border border-white/40 rounded-[15px] text-gray-800"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Transition Settings */}
            {workflowMode === 'advanced' && (
              <div className="bg-white/20 backdrop-blur-[25px] border border-white/40 rounded-[20px] p-4">
                <h4 className="font-semibold text-gray-800 mb-4">Transition Settings</h4>
                
                <div className="space-y-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    Transition Settings
                  </h3>
                  
                  {/* Transition Mode Toggle */}
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showAllTransitions}
                        onChange={(e) => setShowAllTransitions(e.target.checked)}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Show All Available Transitions
                      </span>
                    </label>
                  </div>

                  {/* Preset Selection (only when not showing all transitions) */}
                  {!showAllTransitions && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Transition Preset
                      </label>
                      <select
                        value={transitionPreset}
                        onChange={(e) => {
                          setTransitionPreset(e.target.value as keyof typeof TRANSITION_PRESETS);
                          setSelectedTransition(TRANSITION_PRESETS[e.target.value as keyof typeof TRANSITION_PRESETS][0]);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="modern">Modern & Clean</option>
                        <option value="instagram">Instagram Style</option>
                        <option value="facebook">Facebook Style</option>
                        <option value="tiktok">TikTok Style</option>
                        <option value="youtube">YouTube Style</option>
                      </select>
                    </div>
                  )}

                  {/* Individual Transition Selection */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Selected Transition
                    </label>
                    <select
                      value={selectedTransition}
                      onChange={(e) => setSelectedTransition(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      {showAllTransitions ? (
                        Object.entries(getTransitionsByCategory()).map(([category, transitions]) => (
                          <optgroup key={category} label={category}>
                            {(transitions as string[]).map((transition: string) => (
                              <option key={transition} value={transition}>
                                {transition}
                              </option>
                            ))}
                          </optgroup>
                        ))
                      ) : (
                        getAvailableTransitions().map((transition: string) => (
                          <option key={transition} value={transition}>
                            {transition}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Random Transitions Toggle */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="randomTransitions"
                      checked={enableRandomTransitions}
                      onChange={(e) => setEnableRandomTransitions(e.target.checked)}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <label htmlFor="randomTransitions" className="text-sm font-medium text-gray-700 cursor-pointer">
                      Enable Random Transitions
                    </label>
                  </div>

                  {/* Transition Duration */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Transition Duration: {transitionDuration}s
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="2.0"
                      step="0.1"
                      value={transitionDuration}
                      onChange={(e) => setTransitionDuration(parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                  </div>

                  {/* Transition Preview */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Available Transitions
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                      {showAllTransitions ? (
                        Object.entries(getTransitionsByCategory()).map(([category, transitions]) => (
                          <div key={category} className="col-span-full">
                            <div className="text-xs font-medium text-gray-500 mb-1">{category}</div>
                            <div className="grid grid-cols-3 gap-1">
                              {(transitions as string[]).map((transition: string) => (
                                <button
                                  key={transition}
                                  onClick={() => setSelectedTransition(transition)}
                                  className={`px-2 py-1 text-xs rounded border transition-colors ${
                                    selectedTransition === transition
                                      ? 'bg-purple-100 border-purple-300 text-purple-700'
                                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                  }`}
                                >
                                  {transition}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))
                      ) : (
                        getAvailableTransitions().map((transition: string) => (
                          <button
                            key={transition}
                            onClick={() => setSelectedTransition(transition)}
                            className={`px-2 py-1 text-xs rounded border transition-colors ${
                              selectedTransition === transition
                                ? 'bg-purple-100 border-purple-300 text-purple-700'
                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            {transition}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Timeline visualization */}
            <div className="bg-white/20 backdrop-blur-[25px] border border-white/40 rounded-[20px] p-4">
              <h4 className="font-semibold text-gray-800 mb-3">Timeline Preview</h4>
              <div className="space-y-2">
                {titleText && (
                  <div className="bg-blue-100/40 border border-blue-200/40 rounded-[10px] p-2 text-sm">
                    <Type className="w-4 h-4 inline mr-2" />
                    Title: {titleText} (2s)
                  </div>
                )}
                {selectedMedia.map((media, index) => (
                  <div key={media.id} className="bg-white/30 border border-white/40 rounded-[10px] p-2 text-sm">
                    {media.file_type === 'video' && <Video className="w-4 h-4 inline mr-2" />}
                    {media.file_type === 'image' && <ImageIcon className="w-4 h-4 inline mr-2" />}
                    {media.file_type === 'audio' && <Music className="w-4 h-4 inline mr-2" />}
                    {media.filename} ({media.file_type === 'video' ? (media.duration || 5) : 3}s)
                    {index > 0 && (
                      <span className="ml-2 text-xs bg-orange-100/50 px-2 py-1 rounded-full">
                        {enableRandomTransitions ? 'Random' : selectedTransition}
                      </span>
                    )}
                  </div>
                ))}
                {backgroundMusic && (
                  <div className="bg-green-100/40 border border-green-200/40 rounded-[10px] p-2 text-sm">
                    <Music className="w-4 h-4 inline mr-2" />
                    Background Music
                  </div>
                )}
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  // Helper functions for export system
  const handleRetryRender = () => {
    setShowRenderingProgress(false)
    setRenderError('')
    setRenderStatus('submitted')
    if (currentJobId) {
      pollRenderProgress(currentJobId)
    } else {
      setShowExportDialog(true)
    }
  }

  const handlePreviewVideo = () => {
    if (finalVideoUrl) {
      window.open(finalVideoUrl, '_blank')
    }
  }

  const handleDownloadVideo = () => {
    if (finalVideoUrl) {
      const link = document.createElement('a')
      link.href = finalVideoUrl
      link.download = `${projectName}.${outputFormat}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success('Video download started!')
    }
  }

  const handleShareVideo = async () => {
    if (navigator.share && finalVideoUrl) {
      try {
        await navigator.share({
          title: projectName,
          url: finalVideoUrl
        })
      } catch (error) {
        console.error('Share failed:', error)
        await navigator.clipboard.writeText(finalVideoUrl)
        toast.success('Video URL copied to clipboard!')
      }
    } else if (finalVideoUrl) {
      await navigator.clipboard.writeText(finalVideoUrl)
      toast.success('Video URL copied to clipboard!')
    }
  }

  // Add a simple loading check
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden min-h-screen">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full opacity-20"
              style={{
                background: `radial-gradient(circle, ${
                  ['#ff6b35', '#ff5722', '#ff8c42', '#ff7043', '#ff8a65', '#ff5722'][i]
                }, transparent 70%)`,
                width: `${150 + i * 60}px`,
                height: `${150 + i * 60}px`,
                left: `${10 + i * 15}%`,
                top: `${15 + Math.sin(i) * 15}%`,
                animation: `float ${15 + i * 2}s ease-in-out infinite`,
                filter: 'blur(2px)'
              }}
            />
          ))}
        </div>
      </div>

      {/* Main Content */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="relative z-10 w-full max-w-7xl mx-auto p-6 space-y-8"
      >


        {/* Navigation Tabs */}
        {workflowMode === 'advanced' && (
          <motion.div variants={itemVariants}>
            <Card className="bg-white/20 backdrop-blur-[40px] border border-white/30 rounded-[30px] shadow-[0_25px_60px_rgba(255,255,255,0.3),inset_0_1px_2px_rgba(255,255,255,0.4)] overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {[
                      { id: 'media', label: 'Media', icon: Video },
                      { id: 'templates', label: 'Templates', icon: Layout },
                      { id: 'timeline', label: 'Timeline', icon: Film },
                      { id: 'settings', label: 'Settings', icon: Settings }
                    ].map(tab => {
                      const Icon = tab.icon
                      return (
                        <Button
                          key={tab.id}
                          variant={activeTab === tab.id ? 'default' : 'outline'}
                          onClick={() => setActiveTab(tab.id as any)}
                          className={`rounded-[20px] px-6 py-3 transition-all duration-300 ${
                            activeTab === tab.id
                              ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg'
                              : 'bg-white/30 border-white/40 text-gray-800 hover:bg-white/50'
                          }`}
                        >
                          <Icon className="w-4 h-4 mr-2" />
                          {tab.label}
                        </Button>
                      )
                    })}
                  </div>
                  
                  {isRendering && (
                    <div className="bg-white/40 backdrop-blur-[25px] border border-white/50 rounded-[20px] p-4 min-w-[200px]">
                      <div className="flex items-center gap-2 mb-2">
                        <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
                        <span className="text-sm font-medium text-gray-800">Rendering...</span>
                      </div>
                      <Progress value={renderProgress} className="w-full h-2" />
                      <p className="text-xs text-gray-600 mt-1">{renderProgress}% complete</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Tab Content */}
        <motion.div variants={itemVariants}>
          <Card className="bg-white/20 backdrop-blur-[40px] border border-white/30 rounded-[30px] shadow-[0_25px_60px_rgba(255,255,255,0.3),inset_0_1px_2px_rgba(255,255,255,0.4)] overflow-hidden">
            <CardContent className="p-8">
              {renderTabContent()}
            </CardContent>
          </Card>
        </motion.div>

        {/* Action Bar */}
        {(selectedMedia.length > 0 || titleText) && (
          <motion.div
            variants={itemVariants}
            className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-20"
          >
            <Card className="bg-white/20 backdrop-blur-[40px] border border-white/30 rounded-[25px] shadow-[0_25px_60px_rgba(255,255,255,0.3),inset_0_1px_2px_rgba(255,255,255,0.4)]">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-700">
                    {selectedTemplate ? `Template: ${selectedTemplate.name}` : 'Custom Video'}
                    {selectedMedia.length > 0 && ` • ${selectedMedia.length} file${selectedMedia.length !== 1 ? 's' : ''}`}
                  </div>
                  
                  <Button
                    onClick={startExport}
                    disabled={isLoading || isRendering}
                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-[20px] px-8 py-3 font-semibold shadow-lg"
                  >
                    {isLoading || isRendering ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        {isRendering ? 'Rendering...' : 'Starting...'}
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-5 h-5 mr-2" />
                        Export Video
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>

      {/* Media Preview Modal */}
      <MediaPreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        media={previewMedia}
      />

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.2; }
          50% { transform: translate(20px, -20px) scale(1.1); opacity: 0.3; }
        }
      `}</style>

      {/* Export Dialog */}
      <ExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        onExport={handleExport}
        projectTitle={projectName}
        duration={selectedMedia.reduce((total, media) => total + (media.duration || 3), 0)}
      />

      {/* Rendering Progress */}
      <RenderingProgress
        isOpen={showRenderingProgress}
        onClose={() => setShowRenderingProgress(false)}
        onRetry={handleRetryRender}
        onPreview={finalVideoUrl ? handlePreviewVideo : undefined}
        onDownload={finalVideoUrl ? handleDownloadVideo : undefined}
        onShare={finalVideoUrl ? handleShareVideo : undefined}
        renderStatus={renderStatus}
        progress={renderProgress}
        estimatedTimeRemaining={estimatedTimeRemaining}
        videoUrl={finalVideoUrl}
        error={renderError}
        projectTitle={projectName}
        exportFormat={outputFormat}
      />

      {/* Final Video Presentation */}
      <FinalVideoPresentation
        isOpen={showFinalPresentation}
        onClose={() => setShowFinalPresentation(false)}
        videoUrl={finalVideoUrl}
        videoTitle={projectName}
        duration={selectedMedia.reduce((total, media) => total + (media.duration || 3), 0)}
        segments={selectedMedia.map((media, index) => ({
          id: media.id,
          type: media.file_type === 'video' ? 'video' : media.file_type === 'image' ? 'image' : 'text',
          startTime: index * 3,
          duration: media.duration || 3,
          thumbnailUrl: media.thumbnail_url || '',
          title: media.filename
        }))}
        onDownload={handleDownloadVideo}
        onShare={handleShareVideo}
        onRestart={() => {
          setShowFinalPresentation(false)
          setSelectedMedia([])
          setAvailableMedia(prev => prev.map(m => ({ ...m, selected: false })))
          setProjectName('Untitled Project')
          setTitleText('')
          setSubtitleText('')
          setSelectedTemplate(null)
          setActiveTab('media')
        }}
      />

      {/* Media Preview Modal */}
      {previewMedia && (
        <MediaPreviewModal
          isOpen={previewModalOpen}
          onClose={() => {
            setPreviewModalOpen(false)
            setPreviewMedia(null)
          }}
          media={previewMedia}
        />
      )}
    </div>
  )
}