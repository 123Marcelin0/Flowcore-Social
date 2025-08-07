"use client"

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { EnhancedLiquidGlass } from './ui/enhanced-liquid-glass'
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  Settings,
  SkipBack,
  SkipForward
} from 'lucide-react'

interface VideoPreviewPanelProps {
  videoSrc: string
  poster?: string
  className?: string
  onTimeUpdate?: (currentTime: number, duration: number) => void
  onPlay?: () => void
  onPause?: () => void
  onFullscreenToggle?: (isFullscreen: boolean) => void
  autoPlay?: boolean
  muted?: boolean
  loop?: boolean
}

interface QualityOption {
  label: string
  value: string
  resolution: string
}

const qualityOptions: QualityOption[] = [
  { label: 'Auto', value: 'auto', resolution: 'Auto' },
  { label: '1080p', value: '1080p', resolution: '1920x1080' },
  { label: '720p', value: '720p', resolution: '1280x720' },
  { label: '480p', value: '480p', resolution: '854x480' },
  { label: '360p', value: '360p', resolution: '640x360' },
]

export function VideoPreviewPanel({
  videoSrc,
  poster,
  className,
  onTimeUpdate,
  onPlay,
  onPause,
  onFullscreenToggle,
  autoPlay = false,
  muted = false,
  loop = false,
}: VideoPreviewPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(muted)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [showControls, setShowControls] = useState(true)
  const [showQualityMenu, setShowQualityMenu] = useState(false)
  const [selectedQuality, setSelectedQuality] = useState('auto')
  const [isLoading, setIsLoading] = useState(true)
  const [isDragging, setIsDragging] = useState(false)

  // Auto-hide controls after 3 seconds of inactivity
  useEffect(() => {
    let timeout: NodeJS.Timeout
    
    const resetTimeout = () => {
      clearTimeout(timeout)
      setShowControls(true)
      timeout = setTimeout(() => {
        if (isPlaying && !isDragging) {
          setShowControls(false)
        }
      }, 3000)
    }

    resetTimeout()
    
    const handleMouseMove = () => resetTimeout()
    const handleMouseLeave = () => {
      if (isPlaying && !isDragging) {
        setShowControls(false)
      }
    }

    const container = containerRef.current
    if (container) {
      container.addEventListener('mousemove', handleMouseMove)
      container.addEventListener('mouseleave', handleMouseLeave)
    }

    return () => {
      clearTimeout(timeout)
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove)
        container.removeEventListener('mouseleave', handleMouseLeave)
      }
    }
  }, [isPlaying, isDragging])

  // Video event handlers
  const handlePlay = () => {
    setIsPlaying(true)
    onPlay?.()
  }

  const handlePause = () => {
    setIsPlaying(false)
    onPause?.()
  }

  const handleTimeUpdate = () => {
    if (videoRef.current && !isDragging) {
      const current = videoRef.current.currentTime
      const total = videoRef.current.duration
      setCurrentTime(current)
      setDuration(total)
      onTimeUpdate?.(current, total)
    }
  }

  const handleLoadedData = () => {
    setIsLoading(false)
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
    }
  }

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const handleVolumeChange = (newVolume: number) => {
    if (videoRef.current) {
      videoRef.current.volume = newVolume
      setVolume(newVolume)
      setIsMuted(newVolume === 0)
    }
  }

  const toggleFullscreen = async () => {
    if (!containerRef.current) return

    try {
      if (!isFullscreen) {
        await containerRef.current.requestFullscreen()
        setIsFullscreen(true)
        onFullscreenToggle?.(true)
      } else {
        await document.exitFullscreen()
        setIsFullscreen(false)
        onFullscreenToggle?.(false)
      }
    } catch (error) {
      console.error('Fullscreen toggle failed:', error)
    }
  }

  const handleProgressClick = (e: React.MouseEvent) => {
    if (!progressRef.current || !videoRef.current) return

    const rect = progressRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = clickX / rect.width
    const newTime = percentage * duration
    
    videoRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }

  const handleProgressDrag = (e: React.MouseEvent) => {
    if (!isDragging || !progressRef.current || !videoRef.current) return

    const rect = progressRef.current.getBoundingClientRect()
    const dragX = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
    const percentage = dragX / rect.width
    const newTime = percentage * duration
    
    videoRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }

  const skipTime = (seconds: number) => {
    if (videoRef.current) {
      const newTime = Math.max(0, Math.min(currentTime + seconds, duration))
      videoRef.current.currentTime = newTime
      setCurrentTime(newTime)
    }
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full h-full bg-black rounded-2xl overflow-hidden',
        'cursor-pointer group',
        className
      )}
      onClick={togglePlayPause}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={videoSrc}
        poster={poster}
        autoPlay={autoPlay}
        muted={isMuted}
        loop={loop}
        className="w-full h-full object-cover"
        onPlay={handlePlay}
        onPause={handlePause}
        onTimeUpdate={handleTimeUpdate}
        onLoadedData={handleLoadedData}
        onWaiting={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
      />

      {/* Loading Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/50"
          >
            <EnhancedLiquidGlass
              variant="editor"
              intensity="premium"
              animation="pulse"
              className="p-6"
            >
              <div className="flex items-center gap-3 text-white/80">
                <div className="w-6 h-6 border-2 border-white/30 border-t-white/80 rounded-full animate-spin" />
                <span className="text-sm font-medium">Loading video...</span>
              </div>
            </EnhancedLiquidGlass>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls Overlay */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Controls */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
              {/* Quality Selector */}
              <div className="relative">
                <EnhancedLiquidGlass
                  variant="editor"
                  intensity="premium"
                  animation="hover"
                  className="p-2"
                >
                  <motion.button
                    onClick={() => setShowQualityMenu(!showQualityMenu)}
                    className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Settings className="w-4 h-4" />
                    <span className="text-sm font-medium">{selectedQuality}</span>
                  </motion.button>
                </EnhancedLiquidGlass>

                {/* Quality Menu */}
                <AnimatePresence>
                  {showQualityMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: -10 }}
                      className="absolute top-full right-0 mt-2 z-10"
                    >
                      <EnhancedLiquidGlass
                        variant="modal"
                        intensity="premium"
                        className="p-2 min-w-[120px]"
                      >
                        {qualityOptions.map((option) => (
                          <motion.button
                            key={option.value}
                            onClick={() => {
                              setSelectedQuality(option.value)
                              setShowQualityMenu(false)
                            }}
                            className={cn(
                              'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
                              selectedQuality === option.value
                                ? 'bg-white/20 text-white'
                                : 'text-white/70 hover:text-white hover:bg-white/10'
                            )}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <div className="font-medium">{option.label}</div>
                            <div className="text-xs text-white/50">{option.resolution}</div>
                          </motion.button>
                        ))}
                      </EnhancedLiquidGlass>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Fullscreen Toggle */}
              <EnhancedLiquidGlass
                variant="editor"
                intensity="premium"
                animation="hover"
                className="p-2"
              >
                <motion.button
                  onClick={toggleFullscreen}
                  className="text-white/80 hover:text-white transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isFullscreen ? (
                    <Minimize className="w-4 h-4" />
                  ) : (
                    <Maximize className="w-4 h-4" />
                  )}
                </motion.button>
              </EnhancedLiquidGlass>
            </div>

            {/* Center Play/Pause Button */}
            <div className="absolute inset-0 flex items-center justify-center">
              <EnhancedLiquidGlass
                variant="milestone"
                intensity="premium"
                animation="glow"
                borderGlow
                className="p-4"
              >
                <motion.button
                  onClick={togglePlayPause}
                  className="text-white"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  {isPlaying ? (
                    <Pause className="w-8 h-8" />
                  ) : (
                    <Play className="w-8 h-8 ml-1" />
                  )}
                </motion.button>
              </EnhancedLiquidGlass>
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-4 left-4 right-4">
              <EnhancedLiquidGlass
                variant="editor"
                intensity="premium"
                className="p-4"
              >
                {/* Progress Bar */}
                <div className="mb-4">
                  <div
                    ref={progressRef}
                    className="relative h-2 bg-white/20 rounded-full cursor-pointer group"
                    onClick={handleProgressClick}
                    onMouseDown={() => setIsDragging(true)}
                    onMouseUp={() => setIsDragging(false)}
                    onMouseMove={handleProgressDrag}
                  >
                    {/* Progress Track */}
                    <div className="absolute inset-0 bg-white/10 rounded-full" />
                    
                    {/* Progress Fill */}
                    <motion.div
                      className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-400 to-purple-500 rounded-full"
                      style={{ width: `${progressPercentage}%` }}
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercentage}%` }}
                      transition={{ duration: 0.1 }}
                    />
                    
                    {/* Progress Handle */}
                    <motion.div
                      className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ left: `calc(${progressPercentage}% - 8px)` }}
                      whileHover={{ scale: 1.2 }}
                      whileDrag={{ scale: 1.3 }}
                    />
                  </div>
                  
                  {/* Time Display */}
                  <div className="flex justify-between items-center mt-2 text-xs text-white/60">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Control Buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* Skip Back */}
                    <motion.button
                      onClick={() => skipTime(-10)}
                      className="p-2 text-white/70 hover:text-white transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <SkipBack className="w-4 h-4" />
                    </motion.button>

                    {/* Play/Pause */}
                    <motion.button
                      onClick={togglePlayPause}
                      className="p-2 text-white/70 hover:text-white transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      {isPlaying ? (
                        <Pause className="w-5 h-5" />
                      ) : (
                        <Play className="w-5 h-5" />
                      )}
                    </motion.button>

                    {/* Skip Forward */}
                    <motion.button
                      onClick={() => skipTime(10)}
                      className="p-2 text-white/70 hover:text-white transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <SkipForward className="w-4 h-4" />
                    </motion.button>
                  </div>

                  {/* Volume Controls */}
                  <div className="flex items-center gap-2">
                    <motion.button
                      onClick={toggleMute}
                      className="p-2 text-white/70 hover:text-white transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-4 h-4" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </motion.button>

                    {/* Volume Slider */}
                    <div className="w-20 h-1 bg-white/20 rounded-full relative group cursor-pointer">
                      <motion.div
                        className="absolute left-0 top-0 h-full bg-white/60 rounded-full"
                        style={{ width: `${volume * 100}%` }}
                      />
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={volume}
                        onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </EnhancedLiquidGlass>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}