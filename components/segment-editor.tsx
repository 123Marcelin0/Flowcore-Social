'use client'

import React, { useState, useRef, useEffect } from 'react'
import { 
  Edit3, 
  Type, 
  Music, 
  Scissors, 
  RotateCw, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause,
  ChevronLeft,
  ChevronRight,
  Save,
  X,
  Wand2,
  Image as ImageIcon,
  Video
} from 'lucide-react'

interface VideoSegment {
  id: string
  type: 'video' | 'image' | 'text' | 'transition'
  startTime: number
  duration: number
  thumbnailUrl: string
  content: {
    text?: string
    imageUrl?: string
    videoUrl?: string
    transition?: {
      type: 'fade' | 'slide' | 'zoom' | 'dissolve'
      duration: number
    }
  }
  effects: Array<{
    id: string
    type: 'filter' | 'transform' | 'animation'
    name: string
    intensity: number
  }>
  captions?: Array<{
    id: string
    text: string
    startTime: number
    duration: number
    style: {
      fontSize: number
      color: string
      position: 'top' | 'center' | 'bottom'
      fontWeight: 'normal' | 'bold'
    }
  }>
  audio?: {
    volume: number
    fadeIn: number
    fadeOut: number
    musicTrack?: string
  }
}

interface SegmentEditorProps {
  segments: VideoSegment[]
  currentSegmentId: string | null
  onSegmentUpdate: (segmentId: string, updates: Partial<VideoSegment>) => void
  onSegmentSelect: (segmentId: string) => void
  onClose: () => void
  videoRef?: React.RefObject<HTMLVideoElement>
}

export default function SegmentEditor({
  segments,
  currentSegmentId,
  onSegmentUpdate,
  onSegmentSelect,
  onClose,
  videoRef
}: SegmentEditorProps) {
  const [activeTab, setActiveTab] = useState<'edit' | 'captions' | 'audio' | 'effects'>('edit')
  const [isPlaying, setIsPlaying] = useState(false)
  const [previewTime, setPreviewTime] = useState(0)
  const [waveformData, setWaveformData] = useState<number[]>([])
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const currentSegment = segments.find(s => s.id === currentSegmentId)

  // Generate mock waveform data
  useEffect(() => {
    if (currentSegment?.audio?.musicTrack) {
      const mockWaveform = Array.from({ length: 100 }, () => Math.random() * 0.8 + 0.1)
      setWaveformData(mockWaveform)
    }
  }, [currentSegment?.audio?.musicTrack])

  // Draw waveform visualization
  useEffect(() => {
    if (canvasRef.current && waveformData.length > 0) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const { width, height } = canvas
      ctx.clearRect(0, 0, width, height)

      // Draw waveform
      const barWidth = width / waveformData.length
      waveformData.forEach((amplitude, index) => {
        const barHeight = amplitude * height * 0.8
        const x = index * barWidth
        const y = (height - barHeight) / 2

        ctx.fillStyle = `rgba(59, 130, 246, ${amplitude * 0.8 + 0.2})`
        ctx.fillRect(x, y, barWidth - 1, barHeight)
      })

      // Draw playhead
      const playheadX = (previewTime / (currentSegment?.duration || 1)) * width
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(playheadX, 0)
      ctx.lineTo(playheadX, height)
      ctx.stroke()
    }
  }, [waveformData, previewTime, currentSegment?.duration])

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handleCaptionUpdate = (captionId: string, updates: any) => {
    if (!currentSegment) return

    const updatedCaptions = currentSegment.captions?.map(caption =>
      caption.id === captionId ? { ...caption, ...updates } : caption
    ) || []

    onSegmentUpdate(currentSegment.id, { captions: updatedCaptions })
  }

  const addCaption = () => {
    if (!currentSegment) return

    const newCaption = {
      id: `caption-${Date.now()}`,
      text: 'New Caption',
      startTime: 0,
      duration: currentSegment.duration,
      style: {
        fontSize: 24,
        color: '#ffffff',
        position: 'bottom' as const,
        fontWeight: 'bold' as const
      }
    }

    const updatedCaptions = [...(currentSegment.captions || []), newCaption]
    onSegmentUpdate(currentSegment.id, { captions: updatedCaptions })
  }

  const updateAudio = (updates: Partial<VideoSegment['audio']>) => {
    if (!currentSegment) return

    const updatedAudio = { ...currentSegment.audio, ...updates }
    onSegmentUpdate(currentSegment.id, { audio: updatedAudio })
  }

  const addEffect = (effectType: string) => {
    if (!currentSegm

    onSegmentUpdate(dragState.segmentId, updates)
  }, [dragState, segments, zoomLevel, onSegmentUpdate])

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDragState({
      isDragging: false,
      dragType: null,
      segmentId: null,
      startX: 0,
      startTime: 0,
      startDuration: 0,
    })
  }, [])

  // Add event listeners for drag
  useEffect(() => {
    if (dragState.isDragging) {
      document.addEventListener('mousemove', handleDrag)
      document.addEventListener('mouseup', handleDragEnd)
      
      return () => {
        document.removeEventListener('mousemove', handleDrag)
        document.removeEventListener('mouseup', handleDragEnd)
      }
    }
  }, [dragState.isDragging, handleDrag, handleDragEnd])

  // Snap to grid helper
  const snapToGrid = (time: number) => {
    const gridSize = 0.5 // 0.5 second grid
    return Math.round(time / gridSize) * gridSize
  }

  // Handle segment split
  const handleSplitSegment = (segmentId: string) => {
    const segment = segments.find(s => s.id === segmentId)
    if (!segment) return

    const splitTime = segment.startTime + segment.duration / 2
    onSegmentSplit(segmentId, splitTime)
  }

  // Handle zoom
  const handleZoom = (direction: 'in' | 'out') => {
    setZoomLevel(prev => {
      const newZoom = direction === 'in' ? prev * 1.5 : prev / 1.5
      return Math.max(0.25, Math.min(4, newZoom))
    })
  }

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 100)
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
  }

  // Get segment style for positioning
  const getSegmentStyle = (segment: VideoSegment) => {
    const left = segment.startTime * TIMELINE_SCALE * zoomLevel
    const width = segment.duration * TIMELINE_SCALE * zoomLevel
    
    return {
      left: `${left}px`,
      width: `${width}px`,
    }
  }

  // Get segment color based on type
  const getSegmentColor = (type: VideoSegment['type']) => {
    switch (type) {
      case 'video': return 'from-blue-500/80 to-blue-600/80'
      case 'image': return 'from-green-500/80 to-green-600/80'
      case 'text': return 'from-purple-500/80 to-purple-600/80'
      case 'transition': return 'from-orange-500/80 to-orange-600/80'
      default: return 'from-gray-500/80 to-gray-600/80'
    }
  }

  const selectedSegmentData = segments.find(s => s.id === selectedSegment)

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Toolbar */}
      <div className="flex-shrink-0 mb-4">
        <EnhancedLiquidGlass
          variant="editor"
          intensity="premium"
          className="p-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Play/Pause */}
              <motion.button
                onClick={isPlaying ? onPause : onPlay}
                className="p-2 text-white/80 hover:text-white transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
              </motion.button>

              {/* Time Display */}
              <div className="text-sm text-white/70 font-mono">
                {formatTime(currentTime)} / {formatTime(totalDuration)}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Zoom Controls */}
              <div className="flex items-center gap-1">
                <motion.button
                  onClick={() => handleZoom('out')}
                  className="p-1 text-white/60 hover:text-white transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <ZoomOut className="w-4 h-4" />
                </motion.button>
                <span className="text-xs text-white/60 w-12 text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <motion.button
                  onClick={() => handleZoom('in')}
                  className="p-1 text-white/60 hover:text-white transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <ZoomIn className="w-4 h-4" />
                </motion.button>
              </div>

              {/* View Options */}
              <motion.button
                onClick={() => setShowCaptions(!showCaptions)}
                className={cn(
                  "p-2 transition-colors",
                  showCaptions ? "text-white" : "text-white/40"
                )}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Type className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </EnhancedLiquidGlass>
      </div>

      {/* Timeline */}
      <div className="flex-1 min-h-0">
        <EnhancedLiquidGlass
          variant="timeline"
          intensity="premium"
          className="h-full p-4"
        >
          <div className="h-full flex flex-col">
            {/* Timeline Header */}
            <div className="flex-shrink-0 mb-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-white/90">Timeline</h4>
                <div className="text-xs text-white/60">
                  {segments.length} segments
                </div>
              </div>
            </div>

            {/* Timeline Container */}
            <div className="flex-1 relative overflow-auto">
              <div
                ref={timelineRef}
                className="relative h-32 bg-black/20 rounded-lg cursor-pointer"
                style={{ 
                  width: `${totalDuration * TIMELINE_SCALE * zoomLevel}px`,
                  minWidth: '100%'
                }}
                onClick={handleTimelineClick}
              >
                {/* Time Markers */}
                <div className="absolute inset-0">
                  {Array.from({ length: Math.ceil(totalDuration) + 1 }, (_, i) => (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 border-l border-white/20"
                      style={{ left: `${i * TIMELINE_SCALE * zoomLevel}px` }}
                    >
                      <div className="absolute -top-6 left-1 text-xs text-white/60">
                        {formatTime(i)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Segments */}
                {segments.map((segment) => (
                  <motion.div
                    key={segment.id}
                    className={cn(
                      "absolute top-2 bottom-2 rounded-lg overflow-hidden cursor-pointer border-2 transition-all",
                      selectedSegment === segment.id
                        ? "border-white/60 shadow-lg"
                        : "border-white/20 hover:border-white/40",
                      segment.locked && "opacity-60",
                      !segment.visible && "opacity-30"
                    )}
                    style={getSegmentStyle(segment)}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedSegment(segment.id)
                    }}
                    whileHover={{ scale: 1.02 }}
                    layout
                  >
                    {/* Segment Background */}
                    <div className={cn(
                      "absolute inset-0 bg-gradient-to-r",
                      getSegmentColor(segment.type)
                    )} />

                    {/* Segment Thumbnail */}
                    <img
                      src={segment.thumbnailUrl}
                      alt={segment.title}
                      className="absolute inset-0 w-full h-full object-cover opacity-60"
                    />

                    {/* Segment Content */}
                    <div className="relative z-10 p-2 h-full flex flex-col justify-between">
                      <div className="text-xs text-white font-medium truncate">
                        {segment.title}
                      </div>
                      
                      {showCaptions && segment.content.text && (
                        <div className="text-xs text-white/80 truncate">
                          {segment.content.text}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-white/60">
                          {formatTime(segment.duration)}
                        </div>
                        
                        <div className="flex items-center gap-1">
                          {segment.locked && (
                            <Lock className="w-3 h-3 text-white/60" />
                          )}
                          {!segment.visible && (
                            <EyeOff className="w-3 h-3 text-white/60" />
                          )}
                          {segment.volume === 0 && (
                            <VolumeX className="w-3 h-3 text-white/60" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Resize Handles */}
                    {!segment.locked && selectedSegment === segment.id && (
                      <>
                        <div
                          className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize bg-white/20 hover:bg-white/40 transition-colors"
                          onMouseDown={(e) => handleDragStart(segment.id, 'resize-start', e)}
                        />
                        <div
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize bg-white/20 hover:bg-white/40 transition-colors"
                          onMouseDown={(e) => handleDragStart(segment.id, 'resize-end', e)}
                        />
                      </>
                    )}

                    {/* Drag Handle */}
                    {!segment.locked && (
                      <div
                        className="absolute inset-0 cursor-move"
                        onMouseDown={(e) => handleDragStart(segment.id, 'move', e)}
                      />
                    )}
                  </motion.div>
                ))}

                {/* Playhead */}
                <motion.div
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
                  style={{ left: `${playheadPosition}px` }}
                  initial={false}
                  animate={{ left: `${playheadPosition}px` }}
                  transition={{ type: "tween", duration: 0.1 }}
                >
                  <div className="absolute -top-2 -left-1 w-3 h-3 bg-red-500 rounded-full" />
                </motion.div>
              </div>
            </div>
          </div>
        </EnhancedLiquidGlass>
      </div>

      {/* Segment Properties Panel */}
      <AnimatePresence>
        {selectedSegmentData && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex-shrink-0 mt-4"
          >
            <EnhancedLiquidGlass
              variant="editor"
              intensity="premium"
              className="p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-white/90 mb-2">
                    {selectedSegmentData.title}
                  </h4>
                  
                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-white/60">Start:</span>
                      <div className="text-white/90 font-mono">
                        {formatTime(selectedSegmentData.startTime)}
                      </div>
                    </div>
                    <div>
                      <span className="text-white/60">Duration:</span>
                      <div className="text-white/90 font-mono">
                        {formatTime(selectedSegmentData.duration)}
                      </div>
                    </div>
                    <div>
                      <span className="text-white/60">End:</span>
                      <div className="text-white/90 font-mono">
                        {formatTime(selectedSegmentData.startTime + selectedSegmentData.duration)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {/* Visibility Toggle */}
                  <motion.button
                    onClick={() => onSegmentUpdate(selectedSegmentData.id, { 
                      visible: !selectedSegmentData.visible 
                    })}
                    className={cn(
                      "p-2 rounded-lg transition-colors",
                      selectedSegmentData.visible 
                        ? "text-white/80 hover:text-white" 
                        : "text-white/40 hover:text-white/60"
                    )}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {selectedSegmentData.visible ? (
                      <Eye className="w-4 h-4" />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
                  </motion.button>

                  {/* Lock Toggle */}
                  <motion.button
                    onClick={() => onSegmentUpdate(selectedSegmentData.id, { 
                      locked: !selectedSegmentData.locked 
                    })}
                    className={cn(
                      "p-2 rounded-lg transition-colors",
                      selectedSegmentData.locked 
                        ? "text-orange-400 hover:text-orange-300" 
                        : "text-white/60 hover:text-white/80"
                    )}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {selectedSegmentData.locked ? (
                      <Lock className="w-4 h-4" />
                    ) : (
                      <Unlock className="w-4 h-4" />
                    )}
                  </motion.button>

                  {/* Split */}
                  <motion.button
                    onClick={() => handleSplitSegment(selectedSegmentData.id)}
                    disabled={selectedSegmentData.locked}
                    className="p-2 rounded-lg text-white/60 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Scissors className="w-4 h-4" />
                  </motion.button>

                  {/* Duplicate */}
                  <motion.button
                    onClick={() => onSegmentDuplicate(selectedSegmentData.id)}
                    className="p-2 rounded-lg text-white/60 hover:text-white transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Copy className="w-4 h-4" />
                  </motion.button>

                  {/* Delete */}
                  <motion.button
                    onClick={() => {
                      onSegmentDelete(selectedSegmentData.id)
                      setSelectedSegment(null)
                    }}
                    className="p-2 rounded-lg text-red-400 hover:text-red-300 transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
            </EnhancedLiquidGlass>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}