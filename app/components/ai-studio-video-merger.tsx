"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Play, 
  Download, 
  Share2, 
  Loader2, 
  CheckCircle, 
  XCircle,
  Plus,
  X,
  RefreshCw,
  Video,
  Clock,
  Settings,
  Film,
  Sparkles,
  Zap,
  Scissors,
  Layers
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { toast } from 'sonner'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = (SUPABASE_URL && SUPABASE_ANON && !/localhost:54321/i.test(SUPABASE_URL) && !/dummy|placeholder/i.test(SUPABASE_ANON))
  ? createClient(SUPABASE_URL, SUPABASE_ANON)
  : ({ from: () => ({ select: async () => ({ data: [], error: null }) }) } as any)

interface VideoFile {
  id: string
  storage_url: string
  filename: string
  duration?: number
  thumbnail_url?: string
  selected: boolean
}

interface ShotstackJob {
  id: string
  shotstack_job_id: string
  status: 'submitted' | 'queued' | 'fetching' | 'rendering' | 'done' | 'failed'
  input_video_urls: string[]
  output_format: string
  output_resolution: string
  video_url?: string
  error_message?: string
  created_at: string
  metadata?: any
}

const statusMessages = {
  submitted: 'Job submitted to queue...',
  queued: 'Waiting in queue...',
  fetching: 'Fetching source videos...',
  rendering: 'Merging and processing...',
  done: 'Video is ready!',
  failed: 'Processing failed'
}

const statusColors = {
  submitted: 'bg-blue-500',
  queued: 'bg-yellow-500',
  fetching: 'bg-orange-500',
  rendering: 'bg-purple-500',
  done: 'bg-green-500',
  failed: 'bg-red-500'
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

export function AIStudioVideoMerger() {
  const { user } = useAuth()
  const [availableVideos, setAvailableVideos] = useState<VideoFile[]>([])
  const [selectedVideos, setSelectedVideos] = useState<VideoFile[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingVideos, setIsLoadingVideos] = useState(true)
  const [currentJob, setCurrentJob] = useState<ShotstackJob | null>(null)
  const [jobHistory, setJobHistory] = useState<ShotstackJob[]>([])
  const [outputFormat, setOutputFormat] = useState<'mp4' | 'gif' | 'webm'>('mp4')
  const [outputResolution, setOutputResolution] = useState<'sd' | 'hd' | 'full-hd'>('hd')
  const [selectAllMode, setSelectAllMode] = useState(false)
  
  // Upload functionality
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load available videos from database
  const loadVideos = useCallback(async () => {
    if (!user) return

    try {
      setIsLoadingVideos(true)
      const { data, error } = await supabase
        .from('media_files')
        .select('*')
        .eq('user_id', user.id)
        .eq('file_type', 'video')
        .eq('processing_status', 'completed')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading videos:', error)
        toast.error('Failed to load videos')
        return
      }

      const videos: VideoFile[] = (data || []).map(video => ({
        id: video.id,
        storage_url: video.storage_url,
        filename: video.filename,
        duration: video.duration,
        thumbnail_url: video.thumbnail_url,
        selected: false
      }))

      setAvailableVideos(videos)
    } catch (error) {
      console.error('Error loading videos:', error)
      toast.error('Failed to load videos')
    } finally {
      setIsLoadingVideos(false)
    }
  }, [user])

  // Load job history
  const loadJobHistory = useCallback(async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('shotstack_jobs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) {
        console.error('Error loading job history:', error)
        return
      }

      setJobHistory(data || [])
    } catch (error) {
      console.error('Error loading job history:', error)
    }
  }, [user])

  useEffect(() => {
    loadVideos()
    loadJobHistory()
  }, [loadVideos, loadJobHistory])

  // Toggle video selection
  const toggleVideoSelection = (videoId: string) => {
    setAvailableVideos(prev => 
      prev.map(video => 
        video.id === videoId 
          ? { ...video, selected: !video.selected }
          : video
      )
    )
  }

  // Update selected videos list
  useEffect(() => {
    setSelectedVideos(availableVideos.filter(video => video.selected))
  }, [availableVideos])

  // Upload functionality
  const handleFileUpload = async (files: FileList) => {
    if (!user || files.length === 0) return

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const uploadPromises = Array.from(files).map(async (file, index) => {
        // Validate file type
        if (!file.type.startsWith('video/')) {
          toast.error(`${file.name} is not a video file`)
          return null
        }

        // Validate file size (100MB limit)
        if (file.size > 100 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 100MB)`)
          return null
        }

        const formData = new FormData()
        formData.append('file', file)
        formData.append('fileType', 'video')

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
        toast.success(`Successfully uploaded ${successfulUploads.length} video${successfulUploads.length !== 1 ? 's' : ''}`)
        
        // Reload videos to include new uploads
        await loadVideos()
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

  // Start video merging job
  const startMerging = async () => {
    if (selectedVideos.length === 0) {
      toast.error('Please select at least one video')
      return
    }

    if (selectedVideos.length > 10) {
      toast.error('Maximum 10 videos allowed')
      return
    }

    try {
      setIsLoading(true)
      
      const videoUrls = selectedVideos.map(video => video.storage_url)
      
      toast.info('Analyzing video durations...', { duration: 3000 })
      
      const response = await fetch('/api/shotstack/render', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          videoUrls,
          outputFormat,
          outputResolution
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to start video merging')
      }

      toast.success(`Video merging started! Estimated duration: ${Math.round(result.estimatedDuration || 0)}s`)
      
      // Start polling for job status
      startStatusPolling(result.jobId, result.estimatedDuration)
      
      // Clear selection
      setAvailableVideos(prev => prev.map(video => ({ ...video, selected: false })))
      
      // Reload job history
      loadJobHistory()
      
    } catch (error) {
      console.error('Error starting video merge:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to start video merging')
    } finally {
      setIsLoading(false)
    }
  }

  // Poll job status
  const startStatusPolling = (jobId: string, estimatedDuration?: number) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/shotstack/render?jobId=${jobId}`, {
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
          }
        })

        const result = await response.json()

        if (response.ok) {
          setCurrentJob(prev => prev ? { ...prev, ...result } : null)
          
          if (result.status === 'done' || result.status === 'failed') {
            clearInterval(pollInterval)
            setCurrentJob(null)
            loadJobHistory()
            
            if (result.status === 'done') {
              const duration = result.duration ? ` (${Math.round(result.duration)}s)` : ''
              const renderTime = result.renderTime ? ` in ${Math.round(result.renderTime / 1000)}s` : ''
              toast.success(`Video merging completed${duration}${renderTime}!`)
            } else {
              toast.error(result.error || 'Video merging failed')
            }
          }
        }
      } catch (error) {
        console.error('Error polling job status:', error)
      }
    }, 3000) // Poll every 3 seconds

    // Create initial job object
    setCurrentJob({
      id: '',
      shotstack_job_id: jobId,
      status: 'submitted',
      input_video_urls: selectedVideos.map(v => v.storage_url),
      output_format: outputFormat,
      output_resolution: outputResolution,
      created_at: new Date().toISOString(),
      metadata: estimatedDuration ? { estimatedDuration } : undefined
    })

    // Clear polling after 10 minutes to prevent infinite polling
    setTimeout(() => {
      clearInterval(pollInterval)
      setCurrentJob(null)
    }, 600000)
  }

  // Download video
  const downloadVideo = (videoUrl: string, filename: string) => {
    const link = document.createElement('a')
    link.href = videoUrl
    link.download = filename
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="relative overflow-hidden min-h-screen">
               {/* Orange Accent Effects */}
         <div className="absolute inset-0 overflow-hidden pointer-events-none">
           {/* Strong orange stains */}
           <div className="absolute inset-0">
             {[...Array(8)].map((_, i) => (
               <div
                 key={i}
                 className="absolute rounded-full opacity-25"
                 style={{
                   background: `radial-gradient(circle, ${
                     ['#ff6b35', '#ff5722', '#ff8c42', '#ff7043', '#ff8a65', '#ff7043', '#ff5722', '#ff6b35'][i]
                   }, transparent 70%)`,
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

           {/* Light orange bubbles */}
           <div className="absolute inset-0">
             {[...Array(12)].map((_, i) => (
               <div
                 key={`bubble-${i}`}
                 className="absolute rounded-full opacity-30"
                 style={{
                   background: `radial-gradient(circle, rgba(255,107,53,0.7), rgba(255,87,34,0.4), transparent)`,
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

           {/* Orange flowing lines */}
           <div className="absolute inset-0">
             {[...Array(5)].map((_, i) => (
               <div
                 key={`line-${i}`}
                 className="absolute opacity-20"
                 style={{
                   background: `linear-gradient(${30 + i * 30}deg, transparent, #ff6b35, #ff5722, transparent)`,
                   width: '3px',
                   height: '250%',
                   left: `${20 + i * 20}%`,
                   animation: `line-${i} ${20 + i * 6}s linear infinite`,
                   filter: 'blur(1px)'
                 }}
               />
             ))}
           </div>

           {/* Additional orange particles */}
           <div className="absolute inset-0">
             {[...Array(15)].map((_, i) => (
               <div
                 key={`particle-${i}`}
                 className="absolute rounded-full opacity-20"
                 style={{
                   background: `radial-gradient(circle, rgba(255,107,53,0.8), transparent)`,
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
        className="relative z-10 w-full max-w-6xl mx-auto p-6 space-y-8"
      >
        

                 {/* Settings Card */}
         <motion.div variants={itemVariants}>
           <Card className="bg-white/20 backdrop-blur-[40px] border border-white/30 rounded-[30px] shadow-[0_25px_60px_rgba(255,255,255,0.3),inset_0_1px_2px_rgba(255,255,255,0.4)] overflow-hidden">
             <CardContent className="p-8 space-y-6">
               <div className="flex items-center gap-3">
                 <motion.div whileHover={iconHoverVariants}>
                   <Settings className="w-6 h-6 text-orange-600" />
                 </motion.div>
                 <h2 className="text-xl font-semibold text-gray-800">Output Settings</h2>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-3">
                   <label className="block text-sm font-medium text-gray-700">Output Format</label>
                   <select
                     value={outputFormat}
                     onChange={(e) => setOutputFormat(e.target.value as 'mp4' | 'gif' | 'webm')}
                     className="w-full bg-white/30 backdrop-blur-[35px] border border-white/40 rounded-[20px] text-gray-800 p-3 focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400/50 transition-all duration-300"
                     disabled={isLoading || !!currentJob}
                   >
                     <option value="mp4">MP4 (Recommended)</option>
                     <option value="gif">GIF</option>
                     <option value="webm">WebM</option>
                   </select>
                 </div>
                 <div className="space-y-3">
                   <label className="block text-sm font-medium text-gray-700">Resolution</label>
                   <select
                     value={outputResolution}
                     onChange={(e) => setOutputResolution(e.target.value as 'sd' | 'hd' | 'full-hd')}
                     className="w-full bg-white/30 backdrop-blur-[35px] border border-white/40 rounded-[20px] text-gray-800 p-3 focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400/50 transition-all duration-300"
                     disabled={isLoading || !!currentJob}
                   >
                     <option value="hd">HD (720p)</option>
                     <option value="full-hd">Full HD (1080p)</option>
                     <option value="sd">SD (480p)</option>
                   </select>
                 </div>
               </div>
             </CardContent>
           </Card>
         </motion.div>

                 {/* Current Job Status */}
         <AnimatePresence>
           {currentJob && (
             <motion.div
               variants={itemVariants}
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -20 }}
             >
               <Card className="bg-white/20 backdrop-blur-[40px] border border-white/30 rounded-[30px] shadow-[0_25px_60px_rgba(255,255,255,0.3),inset_0_1px_2px_rgba(255,255,255,0.4)] overflow-hidden">
                 <CardContent className="p-8 space-y-6">
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                       <div className={`w-3 h-3 rounded-full ${statusColors[currentJob.status]} animate-pulse`} />
                       <span className="font-medium text-gray-800">
                         {statusMessages[currentJob.status]}
                       </span>
                     </div>
                     {currentJob.status === 'rendering' && (
                       <div className="bg-white/40 backdrop-blur-[25px] border border-white/50 rounded-full p-2">
                         <Loader2 className="w-5 h-5 animate-spin text-orange-600" />
                       </div>
                     )}
                   </div>
                   
                   {currentJob.status !== 'failed' && currentJob.status !== 'done' && (
                     <div>
                       <Progress 
                         value={currentJob.status === 'submitted' ? 10 : 
                                currentJob.status === 'queued' ? 25 :
                                currentJob.status === 'fetching' ? 50 : 75} 
                         className="w-full h-2 bg-white/30" 
                       />
                     </div>
                   )}
                   
                   {currentJob.video_url && (
                     <div className="flex gap-3">
                       <motion.div whileHover={buttonHoverVariants}>
                         <Button
                           onClick={() => downloadVideo(currentJob.video_url!, `merged-video-${Date.now()}.${currentJob.output_format}`)}
                           className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-[20px] px-6 py-3 transition-all duration-300 focus:outline-none focus:ring-0 shadow-lg"
                         >
                           <Download className="w-4 h-4 mr-2" />
                           Download Video
                         </Button>
                       </motion.div>
                       <motion.div whileHover={buttonHoverVariants}>
                         <Button
                           variant="outline"
                           className="bg-white/30 backdrop-blur-[25px] border border-white/40 hover:bg-white/50 text-gray-800 rounded-[20px] px-6 py-3 transition-all duration-300 focus:outline-none focus:ring-0"
                         >
                           <Share2 className="w-4 h-4 mr-2" />
                           Share
                         </Button>
                       </motion.div>
                     </div>
                   )}
                   
                   {currentJob.status === 'failed' && currentJob.error_message && (
                     <div className="bg-red-100/40 backdrop-blur-[25px] border border-red-200/40 rounded-[20px] p-4">
                       <p className="text-sm text-red-800">
                         <strong>Error:</strong> {currentJob.error_message}
                       </p>
                     </div>
                   )}
                   
                   {currentJob.metadata?.estimatedDuration && currentJob.status !== 'done' && (
                     <div className="text-sm text-gray-600">
                       Expected duration: ~{Math.round(currentJob.metadata.estimatedDuration)}s
                     </div>
                   )}
                 </CardContent>
               </Card>
             </motion.div>
           )}
         </AnimatePresence>

                 {/* Video Selection Card */}
         <motion.div variants={itemVariants}>
           <Card className="bg-white/20 backdrop-blur-[40px] border border-white/30 rounded-[30px] shadow-[0_25px_60px_rgba(255,255,255,0.3),inset_0_1px_2px_rgba(255,255,255,0.4)] overflow-hidden">
             <CardContent className="p-8 space-y-6">
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <motion.div whileHover={iconHoverVariants}>
                     <Video className="w-6 h-6 text-orange-600" />
                   </motion.div>
                   <h2 className="text-xl font-semibold text-gray-800">
                     Select Videos to Merge ({selectedVideos.length}/10)
                   </h2>
                 </div>
                 <div className="flex items-center gap-3">
                   <motion.div whileHover={buttonHoverVariants}>
                     <Button
                       onClick={() => fileInputRef.current?.click()}
                       disabled={isUploading}
                       className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-[20px] px-4 py-2 transition-all duration-300 focus:outline-none focus:ring-0"
                     >
                       <Plus className="w-4 h-4 mr-2" />
                       Upload Videos
                     </Button>
                   </motion.div>
                   <motion.div whileHover={buttonHoverVariants}>
                     <Button
                       onClick={() => {
                         const newSelectAll = !selectAllMode
                         setSelectAllMode(newSelectAll)
                         setAvailableVideos(prev => prev.map(video => ({ ...video, selected: newSelectAll })))
                       }}
                       disabled={isLoadingVideos || availableVideos.length === 0}
                       variant="outline"
                       size="sm"
                       className="bg-white/30 backdrop-blur-[25px] border border-white/40 hover:bg-white/50 text-gray-800 rounded-[20px] px-4 py-2 transition-all duration-300 focus:outline-none focus:ring-0"
                     >
                       {selectAllMode ? 'Deselect All' : 'Select All'}
                     </Button>
                   </motion.div>
                   <motion.div whileHover={buttonHoverVariants}>
                     <Button
                       onClick={loadVideos}
                       disabled={isLoadingVideos}
                       variant="outline"
                       size="sm"
                       className="bg-white/30 backdrop-blur-[25px] border border-white/40 hover:bg-white/50 text-gray-800 rounded-[20px] px-4 py-2 transition-all duration-300 focus:outline-none focus:ring-0"
                     >
                       <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingVideos ? 'animate-spin' : ''}`} />
                       Refresh
                     </Button>
                   </motion.div>
                 </div>
               </div>
               
               {/* Upload Progress */}
               {isUploading && (
                 <div className="bg-white/30 backdrop-blur-[25px] border border-white/40 rounded-[20px] p-4">
                   <div className="flex items-center gap-3 mb-2">
                     <Loader2 className="w-5 h-5 animate-spin text-orange-600" />
                     <span className="text-sm font-medium text-gray-800">Uploading videos...</span>
                   </div>
                   <Progress value={uploadProgress} className="w-full h-2" />
                   <p className="text-xs text-gray-600 mt-1">{Math.round(uploadProgress)}% complete</p>
                 </div>
               )}
               
               {/* Upload Drop Zone */}
               {!isLoadingVideos && availableVideos.length === 0 && !isUploading && (
                 <div
                   className={`border-2 border-dashed rounded-[20px] p-8 text-center transition-all duration-300 ${
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
                   <h3 className="text-lg font-semibold text-gray-800 mb-2">Upload Your First Videos</h3>
                   <p className="text-gray-600 mb-4">Drag and drop video files here, or click to browse</p>
                   <Button
                     onClick={() => fileInputRef.current?.click()}
                     className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-[20px] px-6 py-3"
                   >
                     <Plus className="w-5 h-5 mr-2" />
                     Choose Videos
                   </Button>
                 </div>
               )}
               
               <input
                 ref={fileInputRef}
                 type="file"
                 accept="video/*"
                 multiple
                 onChange={handleFileSelect}
                 className="hidden"
               />
                             {isLoadingVideos ? (
                 <div className="flex items-center justify-center py-12">
                   <div className="bg-white/40 backdrop-blur-[25px] border border-white/50 rounded-full p-4">
                     <Loader2 className="w-6 h-6 animate-spin text-orange-600" />
                   </div>
                   <span className="text-gray-800 ml-3 font-medium">Loading videos...</span>
                 </div>
               ) : availableVideos.length === 0 ? (
                 <div className="text-center py-12">
                   <div className="bg-white/40 backdrop-blur-[25px] border border-white/50 rounded-full p-6 mx-auto w-20 h-20 flex items-center justify-center mb-4">
                     <Video className="w-8 h-8 text-orange-600" />
                   </div>
                   <p className="text-gray-600">No videos found. Upload some videos first.</p>
                 </div>
               ) : (
                 <>
                   {/* Upload Section for existing videos */}
                   {availableVideos.length > 0 && (
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
                           Drag and drop more videos here or click Upload Videos above
                         </span>
                       </div>
                     </div>
                   )}
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                     {availableVideos.map((video) => (
                       <motion.div
                         key={video.id}
                         whileHover={{ scale: 1.02 }}
                         whileTap={{ scale: 0.98 }}
                       >
                         <div 
                           className={`cursor-pointer transition-all duration-300 p-4 bg-white/25 backdrop-blur-[35px] border border-white/40 rounded-[25px] hover:bg-white/35 hover:border-white/50 ${
                             video.selected 
                               ? 'ring-2 ring-orange-400/50 bg-orange-100/40 border-orange-400/60' 
                               : ''
                           }`}
                           onClick={() => toggleVideoSelection(video.id)}
                         >
                         <div className="aspect-video rounded-[20px] bg-white/20 mb-3 flex items-center justify-center relative overflow-hidden">
                           {video.thumbnail_url ? (
                             <img 
                               src={video.thumbnail_url} 
                               alt={video.filename}
                               className="w-full h-full object-cover rounded-[20px]"
                             />
                           ) : (
                             <Play className="w-8 h-8 text-orange-600" />
                           )}
                           {video.selected && (
                             <div className="absolute inset-0 bg-orange-500/30 flex items-center justify-center rounded-[20px] backdrop-blur-sm">
                               <div className="bg-white/40 backdrop-blur-[25px] border border-white/50 rounded-full p-2">
                                 <CheckCircle className="w-6 h-6 text-orange-600" />
                               </div>
                             </div>
                           )}
                           <div className="absolute bottom-2 left-2 bg-white/40 backdrop-blur-[25px] border border-white/50 rounded-full p-1">
                             <Play className="w-4 h-4 text-orange-600" />
                           </div>
                         </div>
                         <h3 className="font-medium text-gray-800 text-sm truncate mb-2">
                           {video.filename}
                         </h3>
                         {video.duration && (
                           <div className="flex items-center gap-1 text-xs text-gray-600">
                             <Clock className="w-3 h-3" />
                             {Math.round(video.duration)}s
                           </div>
                         )}
                       </div>
                       </motion.div>
                     ))}
                   </div>
                 </>
               )}
            </CardContent>
          </Card>
        </motion.div>

                 {/* Create Reel Button */}
         {selectedVideos.length > 0 && (
           <motion.div
             variants={itemVariants}
             className="text-center space-y-4"
           >
             <motion.div whileHover={buttonHoverVariants}>
               <Button
                 onClick={startMerging}
                 disabled={isLoading || !!currentJob}
                 className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-[25px] px-8 py-4 text-lg font-semibold transition-all duration-300 focus:outline-none focus:ring-0 shadow-[0_8px_32px_rgba(255,107,53,0.3)] hover:shadow-[0_12px_48px_rgba(255,107,53,0.4)]"
               >
                 {isLoading ? (
                   <>
                     <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                     Creating Reel...
                   </>
                 ) : (
                   <>
                     <motion.div whileHover={iconHoverVariants}>
                       <Scissors className="w-5 h-5 mr-2" />
                     </motion.div>
                     Create Reel ({selectedVideos.length} video{selectedVideos.length !== 1 ? 's' : ''})
                   </>
                 )}
               </Button>
             </motion.div>
             
             {selectedVideos.length > 1 && (
               <motion.div whileHover={buttonHoverVariants}>
                 <Button
                   onClick={() => setAvailableVideos(prev => prev.map(video => ({ ...video, selected: false })))}
                   variant="outline"
                   size="sm"
                   className="bg-white/30 backdrop-blur-[25px] border border-white/40 hover:bg-white/50 text-gray-800 rounded-[20px] px-4 py-2 transition-all duration-300 focus:outline-none focus:ring-0"
                 >
                   <X className="w-4 h-4 mr-1" />
                   Clear Selection
                 </Button>
               </motion.div>
             )}
           </motion.div>
         )}

                 {/* Job History */}
         {jobHistory.length > 0 && (
           <motion.div variants={itemVariants}>
             <Card className="bg-white/20 backdrop-blur-[40px] border border-white/30 rounded-[30px] shadow-[0_25px_60px_rgba(255,255,255,0.3),inset_0_1px_2px_rgba(255,255,255,0.4)] overflow-hidden">
               <CardContent className="p-8 space-y-6">
                 <div className="flex items-center gap-3">
                   <motion.div whileHover={iconHoverVariants}>
                     <Clock className="w-6 h-6 text-orange-600" />
                   </motion.div>
                   <h2 className="text-xl font-semibold text-gray-800">Recent Jobs</h2>
                 </div>
                 <div className="space-y-4">
                   {jobHistory.map((job) => (
                     <div key={job.id} className="bg-white/25 backdrop-blur-[35px] border border-white/40 rounded-[20px] p-4">
                       <div className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                           <div className={`w-3 h-3 rounded-full ${statusColors[job.status]}`} />
                           <div>
                             <p className="font-medium text-gray-800">
                               {job.input_video_urls.length} video{job.input_video_urls.length !== 1 ? 's' : ''} merged
                             </p>
                             <p className="text-sm text-gray-600">
                               {new Date(job.created_at).toLocaleDateString()} • {job.output_format.toUpperCase()} • {job.output_resolution}
                             </p>
                           </div>
                         </div>
                         
                         <div className="flex items-center gap-3">
                           <Badge 
                             variant={job.status === 'done' ? 'default' : job.status === 'failed' ? 'destructive' : 'secondary'}
                             className="bg-white/40 border-white/50 text-gray-800"
                           >
                             {job.status}
                           </Badge>
                           
                           {job.video_url && (
                             <motion.div whileHover={buttonHoverVariants}>
                               <Button
                                 variant="outline"
                                 size="sm"
                                 onClick={() => downloadVideo(job.video_url!, `merged-video-${job.id}.${job.output_format}`)}
                                 className="bg-white/30 backdrop-blur-[25px] border border-white/40 hover:bg-white/50 text-gray-800 rounded-[20px] px-3 py-1 transition-all duration-300 focus:outline-none focus:ring-0"
                               >
                                 <Download className="w-4 h-4" />
                               </Button>
                             </motion.div>
                           )}
                         </div>
                       </div>
                     </div>
                   ))}
                 </div>
               </CardContent>
             </Card>
           </motion.div>
         )}
      </motion.div>
    </div>
  )
}