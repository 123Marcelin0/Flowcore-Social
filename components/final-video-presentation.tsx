"use client"

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { LiquidModal } from './ui/liquid-modal'
import { EnhancedLiquidGlass } from './ui/enhanced-liquid-glass'
import { 
  Play, 
  Pause, 
  Download, 
  Share2, 
  Sparkles, 
  CheckCircle,
  Star,
  Heart,
  Trophy,
  Zap,
  Eye,
  Volume2,
  VolumeX,
  Maximize,
  RotateCcw,
  Settings,
  Copy,
  ExternalLink
} from 'lucide-react'

interface VideoSegment {
  id: string
  type: 'video' | 'image' | 'text' | 'transition'
  startTime: number
  duration: number
  thumbnailUrl: string
  title: string
  content?: any
}

interface FinalVideoPresentationProps {
  isOpen: boolean
  onClose: () => void
  videoUrl: string
  videoTitle: string
  duration: number
  segments: VideoSegment[]
  onDownload?: () => void
  onShare?: () => void
  onRestart?: () => void
  className?: string
}

export function FinalVideoPresentation({
  isOpen,
  onClose,
  videoUrl,
  videoTitle,
  duration,
  segments,
  onDownload,
  onShare,
  onRestart,
  className
}: FinalVideoPresentationProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [showShareOptions, setShowShareOptions] = useState(false)
  const [copied, setCopied] = useState(false)

  // Celebration effect on open
  useEffect(() => {
    if (isOpen) {
      setShowCelebration(true)
      const timer = setTimeout(() => setShowCelebration(false), 4000)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Video controls
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (!isFullscreen) {
        videoRef.current.requestFullscreen()
      } else {
        document.exitFullscreen()
      }
      setIsFullscreen(!isFullscreen)
    }
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const copyVideoUrl = async () => {
    try {
      await navigator.clipboard.writeText(videoUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy URL:', error)
    }
  }

  const shareOptions = [
    { name: 'Copy Link', icon: Copy, action: copyVideoUrl },
    { name: 'Open in New Tab', icon: ExternalLink, action: () => window.open(videoUrl, '_blank') },
    { name: 'Download', icon: Download, action: onDownload },
  ]

  return (
    <LiquidModal
      isOpen={isOpen}
      onClose={onClose}
      title="🎉 Your Video is Ready!"
      subtitle={`"${videoTitle}" • ${formatTime(duration)}`}
      size="full"
      variant="premium"
      className={cn("max-w-6xl", className)}
      headerActions={
        <div className="flex items-center gap-2">
          <EnhancedLiquidGlass
            variant="editor"
            intensity="medium"
            animation="hover"
            className="px-3 py-1"
          >
            <motion.button
              onClick={() => setShowShareOptions(!showShareOptions)}
              className="text-xs font-medium flex items-center gap-1 text-white/70 hover:text-white/90 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Share2 className="w-3 h-3" />
              Share
            </motion.button>
          </EnhancedLiquidGlass>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Video Player */}
        <EnhancedLiquidGlass
          variant="modal"
          intensity="premium"
          className="relative overflow-hidden"
        >
          <div className="relative aspect-video bg-black rounded-2xl overflow-hidden">
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full object-contain"
              onTimeUpdate={handleTimeUpdate}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
            />
            
            {/* Video Controls Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300">
              <div className="absolute bottom-4 left-4 right-4">
                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-white rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${(currentTime / duration) * 100}%` }}
                      transition={{ duration: 0.1 }}
                    />
                  </div>
                </div>
                
                {/* Control Buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <motion.button
                      onClick={togglePlay}
                      className="p-2 bg-white/20 hover:bg-white/30 rounded-full backdrop-blur-sm transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      {isPlaying ? (
                        <Pause className="w-5 h-5 text-white" />
                      ) : (
                        <Play className="w-5 h-5 text-white ml-0.5" />
                      )}
                    </motion.button>
                    
                    <motion.button
                      onClick={toggleMute}
                      className="p-2 bg-white/20 hover:bg-white/30 rounded-full backdrop-blur-sm transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      {isMuted ? (
                        <VolumeX className="w-4 h-4 text-white" />
                      ) : (
                        <Volume2 className="w-4 h-4 text-white" />
                      )}
                    </motion.button>
                    
                    <span className="text-white text-sm font-medium">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <motion.button
                      onClick={toggleFullscreen}
                      className="p-2 bg-white/20 hover:bg-white/30 rounded-full backdrop-blur-sm transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Maximize className="w-4 h-4 text-white" />
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>

            {/* Play Button Overlay */}
            {!isPlaying && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <motion.button
                  onClick={togglePlay}
                  className="p-6 bg-white/20 hover:bg-white/30 rounded-full backdrop-blur-sm transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Play className="w-12 h-12 text-white ml-1" />
                </motion.button>
              </motion.div>
            )}
          </div>
        </EnhancedLiquidGlass>

        {/* Video Segments Timeline */}
        <div>
          <h3 className="text-lg font-semibold text-white/90 mb-4">Video Timeline</h3>
          <EnhancedLiquidGlass
            variant="timeline"
            intensity="premium"
            className="p-4"
          >
            <div className="flex gap-2 overflow-x-auto pb-2">
              {segments.map((segment, index) => (
                <motion.div
                  key={segment.id}
                  className="flex-shrink-0 cursor-pointer"
                  onClick={() => handleSeek(segment.startTime)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className={cn(
                    "w-24 h-16 rounded-lg overflow-hidden border-2 transition-colors",
                    currentTime >= segment.startTime && currentTime < segment.startTime + segment.duration
                      ? "border-blue-400 shadow-lg shadow-blue-400/20"
                      : "border-white/20 hover:border-white/40"
                  )}>
                    {segment.thumbnailUrl ? (
                      <img
                        src={segment.thumbnailUrl}
                        alt={segment.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                        <span className="text-xs text-white/60 font-medium">
                          {segment.type.toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-white/60 mt-1 text-center truncate">
                    {segment.title}
                  </p>
                  <p className="text-xs text-white/40 text-center">
                    {formatTime(segment.duration)}
                  </p>
                </motion.div>
              ))}
            </div>
          </EnhancedLiquidGlass>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <EnhancedLiquidGlass
            variant="milestone"
            intensity="premium"
            animation="hover"
            borderGlow
            className="p-6 text-center"
          >
            <motion.button
              onClick={onDownload}
              className="w-full"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Download className="w-6 h-6 text-green-400" />
              </div>
              <h4 className="font-semibold text-white/90 mb-1">Download Video</h4>
              <p className="text-sm text-white/60">Save to your device</p>
            </motion.button>
          </EnhancedLiquidGlass>

          <EnhancedLiquidGlass
            variant="milestone"
            intensity="premium"
            animation="hover"
            borderGlow
            className="p-6 text-center"
          >
            <motion.button
              onClick={onShare}
              className="w-full"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Share2 className="w-6 h-6 text-blue-400" />
              </div>
              <h4 className="font-semibold text-white/90 mb-1">Share Video</h4>
              <p className="text-sm text-white/60">Share with others</p>
            </motion.button>
          </EnhancedLiquidGlass>

          <EnhancedLiquidGlass
            variant="milestone"
            intensity="premium"
            animation="hover"
            borderGlow
            className="p-6 text-center"
          >
            <motion.button
              onClick={onRestart}
              className="w-full"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <RotateCcw className="w-6 h-6 text-purple-400" />
              </div>
              <h4 className="font-semibold text-white/90 mb-1">Create Another</h4>
              <p className="text-sm text-white/60">Start a new project</p>
            </motion.button>
          </EnhancedLiquidGlass>
        </div>

        {/* Share Options Dropdown */}
        <AnimatePresence>
          {showShareOptions && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-16 right-6 z-50"
            >
              <EnhancedLiquidGlass
                variant="modal"
                intensity="premium"
                className="p-3 min-w-48"
              >
                {shareOptions.map((option, index) => (
                  <motion.button
                    key={option.name}
                    onClick={() => {
                      option.action?.()
                      setShowShareOptions(false)
                    }}
                    className="w-full flex items-center gap-3 p-2 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <option.icon className="w-4 h-4" />
                    {option.name === 'Copy Link' && copied ? 'Copied!' : option.name}
                  </motion.button>
                ))}
              </EnhancedLiquidGlass>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Celebration Effect */}
        <AnimatePresence>
          {showCelebration && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 pointer-events-none z-50"
            >
              {/* Confetti */}
              {[...Array(30)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-3 h-3 rounded-full"
                  style={{
                    background: ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'][i % 5],
                  }}
                  initial={{
                    x: '50vw',
                    y: '50vh',
                    scale: 0,
                    opacity: 1,
                    rotate: 0,
                  }}
                  animate={{
                    x: `${50 + (Math.random() - 0.5) * 100}vw`,
                    y: `${50 + (Math.random() - 0.5) * 100}vh`,
                    scale: [0, 1, 0],
                    opacity: [1, 1, 0],
                    rotate: 360,
                  }}
                  transition={{
                    duration: 3,
                    delay: i * 0.1,
                    ease: "easeOut"
                  }}
                />
              ))}
              
              {/* Stars */}
              {[...Array(15)].map((_, i) => (
                <motion.div
                  key={`star-${i}`}
                  className="absolute"
                  initial={{
                    x: '50vw',
                    y: '50vh',
                    scale: 0,
                    opacity: 1,
                  }}
                  animate={{
                    x: `${50 + (Math.random() - 0.5) * 80}vw`,
                    y: `${50 + (Math.random() - 0.5) * 80}vh`,
                    scale: [0, 1.5, 0],
                    opacity: [1, 1, 0],
                  }}
                  transition={{
                    duration: 2.5,
                    delay: i * 0.15,
                    ease: "easeOut"
                  }}
                >
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                </motion.div>
              ))}
              
              {/* Success Icons */}
              {[Trophy, Heart, Sparkles, CheckCircle, Zap].map((Icon, i) => (
                <motion.div
                  key={`icon-${i}`}
                  className="absolute"
                  initial={{
                    x: '50vw',
                    y: '50vh',
                    scale: 0,
                    opacity: 1,
                  }}
                  animate={{
                    x: `${50 + (Math.random() - 0.5) * 60}vw`,
                    y: `${50 + (Math.random() - 0.5) * 60}vh`,
                    scale: [0, 1.2, 0],
                    opacity: [1, 1, 0],
                  }}
                  transition={{
                    duration: 2,
                    delay: i * 0.2,
                    ease: "easeOut"
                  }}
                >
                  <Icon className="w-6 h-6 text-white" />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </LiquidModal>
  )
}