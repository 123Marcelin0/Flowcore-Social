"use client"

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Play, Pause, Volume2, VolumeX, Download, Share2, Maximize2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MediaPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  media: {
    id: string
    storage_url: string
    thumbnail_url?: string
    filename: string
    file_type: 'video' | 'image' | 'audio'
    duration?: number
    width?: number
    height?: number
    alt_text?: string
  } | null
}

export function MediaPreviewModal({ isOpen, onClose, media }: MediaPreviewModalProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [rotation, setRotation] = useState(0)
  const videoRef = React.useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      setIsPlaying(false)
      setCurrentTime(0)
      setRotation(0)
    }
  }, [isOpen])

  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  const handleVideoLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    if (videoRef.current) {
      videoRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

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
      if (!document.fullscreenElement) {
        videoRef.current.requestFullscreen()
        setIsFullscreen(true)
      } else {
        document.exitFullscreen()
        setIsFullscreen(false)
      }
    }
  }

  const rotateImage = () => {
    setRotation((prev) => (prev + 90) % 360)
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handleDownload = () => {
    if (media) {
      const link = document.createElement('a')
      link.href = media.storage_url
      link.download = media.filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleShare = () => {
    if (navigator.share && media) {
      navigator.share({
        title: media.filename,
        url: media.storage_url,
      })
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(media?.storage_url || '')
    }
  }

  if (!media) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          
          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-4xl max-h-[90vh] bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 bg-white/5 backdrop-blur-lg border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                <div className="w-3 h-3 bg-green-500 rounded-full" />
              </div>
              
              <div className="flex-1 mx-4">
                <h3 className="text-white font-medium truncate">{media.filename}</h3>
                {media.file_type === 'video' && media.duration && (
                  <p className="text-white/60 text-sm">{formatTime(media.duration)}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={handleShare}
                  variant="ghost"
                  size="sm"
                  className="text-white/70 hover:text-white hover:bg-white/10 rounded-full p-2"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
                
                <Button
                  onClick={handleDownload}
                  variant="ghost"
                  size="sm"
                  className="text-white/70 hover:text-white hover:bg-white/10 rounded-full p-2"
                >
                  <Download className="w-4 h-4" />
                </Button>

                {media.file_type === 'image' && (
                  <Button
                    onClick={rotateImage}
                    variant="ghost"
                    size="sm"
                    className="text-white/70 hover:text-white hover:bg-white/10 rounded-full p-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                )}

                {media.file_type === 'video' && (
                  <Button
                    onClick={toggleFullscreen}
                    variant="ghost"
                    size="sm"
                    className="text-white/70 hover:text-white hover:bg-white/10 rounded-full p-2"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </Button>
                )}

                <Button
                  onClick={onClose}
                  variant="ghost"
                  size="sm"
                  className="text-white/70 hover:text-white hover:bg-white/10 rounded-full p-2"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Media Content */}
            <div className="relative flex items-center justify-center bg-black/20 min-h-[400px]">
              {media.file_type === 'image' ? (
                <motion.img
                  src={media.thumbnail_url || media.storage_url}
                  alt={media.alt_text || media.filename}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg"
                  style={{ transform: `rotate(${rotation}deg)` }}
                  transition={{ duration: 0.3 }}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                />
              ) : media.file_type === 'video' ? (
                <div className="relative w-full max-w-4xl">
                  <video
                    ref={videoRef}
                    src={media.storage_url}
                    className="w-full max-h-[70vh] object-contain rounded-lg"
                    onTimeUpdate={handleVideoTimeUpdate}
                    onLoadedMetadata={handleVideoLoadedMetadata}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => setIsPlaying(false)}
                    muted={isMuted}
                  />
                  
                  {/* Video Controls Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 rounded-b-lg">
                    <div className="flex items-center gap-4">
                      <Button
                        onClick={togglePlay}
                        variant="ghost"
                        size="sm"
                        className="text-white hover:bg-white/20 rounded-full p-2"
                      >
                        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                      </Button>

                      <div className="flex-1">
                        <input
                          type="range"
                          min="0"
                          max={duration || 0}
                          value={currentTime}
                          onChange={handleSeek}
                          className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer slider"
                        />
                      </div>

                      <span className="text-white text-sm min-w-[40px]">
                        {formatTime(currentTime)}
                      </span>

                      <span className="text-white/70 text-sm min-w-[40px]">
                        {formatTime(duration)}
                      </span>

                      <Button
                        onClick={toggleMute}
                        variant="ghost"
                        size="sm"
                        className="text-white hover:bg-white/20 rounded-full p-2"
                      >
                        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center w-full h-64">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Volume2 className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-white/70">Audio preview not available</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Info */}
            <div className="p-6 bg-white/5 backdrop-blur-lg border-t border-white/10">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-white/60">Type</p>
                  <p className="text-white font-medium capitalize">{media.file_type}</p>
                </div>
                {media.width && media.height && (
                  <div>
                    <p className="text-white/60">Dimensions</p>
                    <p className="text-white font-medium">{media.width} × {media.height}</p>
                  </div>
                )}
                {media.duration && (
                  <div>
                    <p className="text-white/60">Duration</p>
                    <p className="text-white font-medium">{formatTime(media.duration)}</p>
                  </div>
                )}
                <div>
                  <p className="text-white/60">Filename</p>
                  <p className="text-white font-medium truncate">{media.filename}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
} 