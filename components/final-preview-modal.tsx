'use client'

import React, { useState, useRef, useEffect } from 'react'
import { X, Play, Pause, RotateCcw, Download, Share2, Edit3, Volume2, VolumeX } from 'lucide-react'
import SegmentBasedQuickEditor from './segment-based-quick-editor'
import { EnhancedLiquidGlass } from './ui/enhanced-liquid-glass'

interface VideoSegment {
  id: string
  type: 'video' | 'image' | 'text' | 'transition'
  startTime: number
  duration: number
  thumbnailUrl: string
  content: any
  effects: any[]
  captions?: any[]
}

interface FinalPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  videoUrl: string
  segments: VideoSegment[]
  onSegmentEdit: (segmentId: string) => void
  onExport: () => void
  onSave: () => void
  projectTitle: string
}

export default function FinalPreviewModal({
  isOpen,
  onClose,
  videoUrl,
  segments,
  onSegmentEdit,
  onExport,
  onSave,
  projectTitle
}: FinalPreviewModalProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showQuickEdit, setShowQuickEdit] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current) {
      const video = videoRef.current
      
      const handleTimeUpdate = () => setCurrentTime(video.currentTime)
      const handleDurationChange = () => setDuration(video.duration)
      const handleLoadedData = () => setIsLoading(false)
      const handleLoadStart = () => setIsLoading(true)
      
      video.addEventListener('timeupdate', handleTimeUpdate)
      video.addEventListener('durationchange', handleDurationChange)
      video.addEventListener('loadeddata', handleLoadedData)
      video.addEventListener('loadstart', handleLoadStart)
      
      return () => {
        video.removeEventListener('timeupdate', handleTimeUpdate)
        video.removeEventListener('durationchange', handleDurationChange)
        video.removeEventListener('loadeddata', handleLoadedData)
        video.removeEventListener('loadstart', handleLoadStart)
      }
    }
  }, [videoUrl])

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current && duration) {
      const rect = e.currentTarget.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const newTime = (clickX / rect.width) * duration
      videoRef.current.currentTime = newTime
      setCurrentTime(newTime)
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      await onSave()
      // Show success animation
      setTimeout(() => setIsLoading(false), 1000)
    } catch (error) {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-6xl h-full max-h-[90vh] overflow-hidden">
        {/* Main Modal Container */}
        <div className="liquid-glass-premium h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div>
              <h2 className="text-2xl font-semibold text-white mb-1">Final Preview</h2>
              <p className="text-white/70">{projectTitle}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowQuickEdit(!showQuickEdit)}
                className="liquid-button-secondary flex items-center gap-2 px-4 py-2"
              >
                <Edit3 size={16} />
                Quick Edit
              </button>
              <button
                onClick={onClose}
                className="liquid-button-ghost p-2"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Video Preview Section */}
          <div className="flex-1 flex">
            {/* Main Video Area */}
            <div className="flex-1 flex flex-col p-6">
              <div className="relative flex-1 bg-black/20 rounded-2xl overflow-hidden">
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-10">
                    <div className="liquid-glass-premium p-6 rounded-2xl">
                      <div className="animate-spin w-8 h-8 border-2 border-white/30 border-t-white rounded-full mx-auto mb-3"></div>
                      <p className="text-white/80">Loading preview...</p>
                    </div>
                  </div>
                )}
                
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="w-full h-full object-contain"
                  onClick={togglePlayPause}
                />

                {/* Video Controls Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="liquid-glass-premium p-4 rounded-xl">
                    {/* Progress Bar */}
                    <div 
                      className="w-full h-2 bg-white/20 rounded-full mb-4 cursor-pointer"
                      onClick={handleSeek}
                    >
                      <div 
                        className="h-full bg-gradient-to-r from-blue-400 to-purple-500 rounded-full transition-all duration-200"
                        style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                      />
                    </div>

                    {/* Control Buttons */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={togglePlayPause}
                          className="liquid-button-primary p-3 rounded-full"
                        >
                          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                        </button>
                        <button
                          onClick={toggleMute}
                          className="liquid-button-ghost p-2"
                        >
                          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                        </button>
                        <span className="text-white/80 text-sm">
                          {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (videoRef.current) {
                              videoRef.current.currentTime = 0
                              setCurrentTime(0)
                            }
                          }}
                          className="liquid-button-ghost p-2"
                        >
                          <RotateCcw size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Edit Panel */}
            {showQuickEdit && (
              <div className="w-80 border-l border-white/10 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Quick Edit</h3>
                
                {/* Segment Timeline */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-white/80 mb-3">Video Segments</h4>
                  <div className="space-y-2">
                    {segments.map((segment, index) => (
                      <div
                        key={segment.id}
                        className="liquid-glass-subtle p-3 rounded-lg cursor-pointer hover:bg-white/10 transition-all duration-200"
                        onClick={() => onSegmentEdit(segment.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-8 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded border border-white/10 flex items-center justify-center">
                            <span className="text-xs text-white/70">{index + 1}</span>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-white/90 capitalize">{segment.type}</p>
                            <p className="text-xs text-white/60">
                              {formatTime(segment.startTime)} - {formatTime(segment.startTime + segment.duration)}
                            </p>
                          </div>
                          <Edit3 size={14} className="text-white/50" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-3">
                  <button className="w-full liquid-button-secondary p-3 text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                        <Edit3 size={14} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Edit Captions</p>
                        <p className="text-xs text-white/60">Add or modify text overlays</p>
                      </div>
                    </div>
                  </button>

                  <button className="w-full liquid-button-secondary p-3 text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                        <Volume2 size={14} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Adjust Audio</p>
                        <p className="text-xs text-white/60">Change music and sound levels</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between p-6 border-t border-white/10">
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="liquid-button-primary px-6 py-3 disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></div>
                    Saving...
                  </div>
                ) : (
                  'Save Changes'
                )}
              </button>
              <button className="liquid-button-secondary px-6 py-3 flex items-center gap-2">
                <Share2 size={16} />
                Share Preview
              </button>
            </div>

            <button
              onClick={onExport}
              className="liquid-button-accent px-8 py-3 flex items-center gap-2"
            >
              <Download size={16} />
              Export Video
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}