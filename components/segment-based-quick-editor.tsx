'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { EnhancedLiquidGlass } from './ui/enhanced-liquid-glass'
import { 
  Play, 
  Pause, 
  Type, 
  Music, 
  Volume2, 
  VolumeX,
  Edit3,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Wand2,
  Check,
  Undo
} from 'lucide-react'

interface VideoSegment {
  id: string
  type: 'video' | 'image' | 'text' | 'transition'
  startTime: number
  duration: number
  thumbnailUrl: string
  title: string
  content: {
    text?: string
    videoUrl?: string
    imageUrl?: string
  }
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
    waveformData?: number[]
  }
  transformations?: {
    scale: number
    rotation: number
    opacity: number
    blur: number
    brightness: number
    contrast: number
  }
}

interface SegmentBasedQuickEditorProps {
  segments: VideoSegment[]
  onSegmentUpdate: (segmentId: string, updates: Partial<VideoSegment>) => void
  onPreviewUpdate: () => void
  className?: string
}

interface EditingState {
  segmentId: string | null
  mode: 'caption' | 'transformation' | 'audio' | null
  isInline: boolean
}

export default function SegmentBasedQuickEditor({
  segments,
  onSegmentUpdate,
  onPreviewUpdate,
  className
}: SegmentBasedQuickEditorProps) {
  const [editingState, setEditingState] = useState<EditingState>({
    segmentId: null,
    mode: null,
    isInline: false
  })
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null)
  const [previewTime, setPreviewTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [tempChanges, setTempChanges] = useState<Record<string, Partial<VideoSegment>>>({})
  
  const segmentBarRef = useRef<HTMLDivElement>(null)
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null)
  const captionInputRef = useRef<HTMLInputElement>(null)

  // Calculate total duration
  const totalDuration = segments.reduce((total, segment) => 
    Math.max(total, segment.startTime + segment.duration), 0
  )

  // Generate mock waveform data for audio segments
  const generateWaveformData = useCallback((segment: VideoSegment) => {
    if (!segment.audio?.musicTrack) return []
    
    const dataPoints = Math.floor(segment.duration * 10) // 10 points per second
    return Array.from({ length: dataPoints }, () => Math.random() * 0.8 + 0.1)
  }, [])

  // Draw waveform visualization
  useEffect(() => {
    const canvas = waveformCanvasRef.current
    if (!canvas || !editingState.segmentId || editingState.mode !== 'audio') return

    const segment = segments.find(s => s.id === editingState.segmentId)
    if (!segment?.audio?.musicTrack) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const waveformData = segment.audio.waveformData || generateWaveformData(segment)
    const { width, height } = canvas
    
    ctx.clearRect(0, 0, width, height)

    // Draw waveform bars
    const barWidth = width / waveformData.length
    waveformData.forEach((amplitude, index) => {
      const barHeight = amplitude * height * 0.8
      const x = index * barWidth
      const y = (height - barHeight) / 2

      // Color based on volume level
      const volume = segment.audio?.volume || 0.5
      const alpha = amplitude * volume * 0.8 + 0.2
      ctx.fillStyle = `rgba(59, 130, 246, ${alpha})`
      ctx.fillRect(x, y, Math.max(1, barWidth - 1), barHeight)
    })

    // Draw volume indicator line
    const volumeY = height * (1 - (segment.audio?.volume || 0.5))
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'
    ctx.lineWidth = 1
    ctx.setLineDash([2, 2])
    ctx.beginPath()
    ctx.moveTo(0, volumeY)
    ctx.lineTo(width, volumeY)
    ctx.stroke()
    ctx.setLineDash([])
  }, [editingState, segments, generateWaveformData])

  // Handle segment click for editing
  const handleSegmentClick = (segmentId: string, mode: EditingState['mode']) => {
    if (editingState.segmentId === segmentId && editingState.mode === mode) {
      // Toggle off if clicking the same segment/mode
      setEditingState({ segmentId: null, mode: null, isInline: false })
    } else {
      setEditingState({ segmentId, mode, isInline: true })
      setSelectedSegmentId(segmentId)
      
      // Focus caption input if in caption mode
      if (mode === 'caption') {
        setTimeout(() => captionInputRef.current?.focus(), 100)
      }
    }
  }

  // Handle temporary changes
  const handleTempChange = (segmentId: string, updates: Partial<VideoSegment>) => {
    setTempChanges(prev => ({
      ...prev,
      [segmentId]: {
        ...prev[segmentId],
        ...updates
      }
    }))
  }

  // Apply changes and update preview
  const applyChanges = (segmentId: string) => {
    const changes = tempChanges[segmentId]
    if (changes) {
      onSegmentUpdate(segmentId, changes)
      setTempChanges(prev => {
        const newChanges = { ...prev }
        delete newChanges[segmentId]
        return newChanges
      })
      onPreviewUpdate()
    }
    setEditingState({ segmentId: null, mode: null, isInline: false })
  }

  // Discard changes
  const discardChanges = (segmentId: string) => {
    setTempChanges(prev => {
      const newChanges = { ...prev }
      delete newChanges[segmentId]
      return newChanges
    })
    setEditingState({ segmentId: null, mode: null, isInline: false })
  }

  // Get segment with temporary changes applied
  const getSegmentWithChanges = (segment: VideoSegment) => {
    const changes = tempChanges[segment.id]
    return changes ? { ...segment, ...changes } : segment
  }

  // Calculate segment position and width for visual representation
  const getSegmentStyle = (segment: VideoSegment) => {
    const leftPercent = (segment.startTime / totalDuration) * 100
    const widthPercent = (segment.duration / totalDuration) * 100
    
    return {
      left: `${leftPercent}%`,
      width: `${widthPercent}%`
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Segment Visual Timeline */}
      <EnhancedLiquidGlass
        variant="timeline"
        intensity="premium"
        className="p-4"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-white/90">Video Segments</h4>
            <div className="text-xs text-white/60">
              {segments.length} segments • {formatTime(totalDuration)}
            </div>
          </div>

          {/* Visual Segment Bar */}
          <div 
            ref={segmentBarRef}
            className="relative h-20 bg-black/30 rounded-lg overflow-hidden"
          >
            {/* Time markers */}
            <div className="absolute inset-0">
              {Array.from({ length: Math.ceil(totalDuration / 10) + 1 }, (_, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 border-l border-white/20"
                  style={{ left: `${(i * 10 / totalDuration) * 100}%` }}
                >
                  <div className="absolute -top-5 left-1 text-xs text-white/60">
                    {formatTime(i * 10)}
                  </div>
                </div>
              ))}
            </div>

            {/* Segment bars */}
            {segments.map((segment) => {
              const segmentWithChanges = getSegmentWithChanges(segment)
              const isEditing = editingState.segmentId === segment.id
              const hasChanges = tempChanges[segment.id]
              
              return (
                <motion.div
                  key={segment.id}
                  className={cn(
                    "absolute top-2 bottom-2 rounded-md overflow-hidden border-2 transition-all cursor-pointer",
                    isEditing 
                      ? "border-blue-400 shadow-lg shadow-blue-400/20 z-10" 
                      : "border-white/20 hover:border-white/40",
                    hasChanges && "ring-2 ring-yellow-400/50"
                  )}
                  style={getSegmentStyle(segmentWithChanges)}
                  whileHover={{ scale: 1.02, y: -2 }}
                  layout
                >
                  {/* Background gradient */}
                  <div className={cn(
                    "absolute inset-0 bg-gradient-to-r",
                    getSegmentColor(segment.type)
                  )} />

                  {/* Thumbnail */}
                  <img
                    src={segment.thumbnailUrl}
                    alt={segment.title}
                    className="absolute inset-0 w-full h-full object-cover opacity-60"
                  />

                  {/* Content overlay */}
                  <div className="relative z-10 p-2 h-full flex flex-col justify-between">
                    <div className="text-xs text-white font-medium truncate">
                      {segmentWithChanges.title}
                    </div>
                    
                    {/* Quick edit buttons */}
                    <div className="flex items-center gap-1">
                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSegmentClick(segment.id, 'caption')
                        }}
                        className={cn(
                          "p-1 rounded text-white/60 hover:text-white transition-colors",
                          editingState.segmentId === segment.id && editingState.mode === 'caption'
                            ? "bg-blue-500/30 text-blue-300"
                            : "hover:bg-white/20"
                        )}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Type className="w-3 h-3" />
                      </motion.button>

                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSegmentClick(segment.id, 'transformation')
                        }}
                        className={cn(
                          "p-1 rounded text-white/60 hover:text-white transition-colors",
                          editingState.segmentId === segment.id && editingState.mode === 'transformation'
                            ? "bg-purple-500/30 text-purple-300"
                            : "hover:bg-white/20"
                        )}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Wand2 className="w-3 h-3" />
                      </motion.button>

                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSegmentClick(segment.id, 'audio')
                        }}
                        className={cn(
                          "p-1 rounded text-white/60 hover:text-white transition-colors",
                          editingState.segmentId === segment.id && editingState.mode === 'audio'
                            ? "bg-orange-500/30 text-orange-300"
                            : "hover:bg-white/20"
                        )}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Music className="w-3 h-3" />
                      </motion.button>
                    </div>
                  </div>

                  {/* Changes indicator */}
                  {hasChanges && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full"
                    />
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>
      </EnhancedLiquidGlass>

      {/* Inline Editing Panel */}
      <AnimatePresence>
        {editingState.segmentId && editingState.mode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <EnhancedLiquidGlass
              variant="editor"
              intensity="premium"
              className="p-4"
            >
              {editingState.mode === 'caption' && (
                <CaptionInlineEditor
                  segment={getSegmentWithChanges(segments.find(s => s.id === editingState.segmentId)!)}
                  onChange={(updates) => handleTempChange(editingState.segmentId!, updates)}
                  onApply={() => applyChanges(editingState.segmentId!)}
                  onDiscard={() => discardChanges(editingState.segmentId!)}
                  inputRef={captionInputRef}
                />
              )}

              {editingState.mode === 'transformation' && (
                <TransformationInlineEditor
                  segment={getSegmentWithChanges(segments.find(s => s.id === editingState.segmentId)!)}
                  onChange={(updates) => handleTempChange(editingState.segmentId!, updates)}
                  onApply={() => applyChanges(editingState.segmentId!)}
                  onDiscard={() => discardChanges(editingState.segmentId!)}
                />
              )}

              {editingState.mode === 'audio' && (
                <AudioInlineEditor
                  segment={getSegmentWithChanges(segments.find(s => s.id === editingState.segmentId)!)}
                  onChange={(updates) => handleTempChange(editingState.segmentId!, updates)}
                  onApply={() => applyChanges(editingState.segmentId!)}
                  onDiscard={() => discardChanges(editingState.segmentId!)}
                  canvasRef={waveformCanvasRef}
                />
              )}
            </EnhancedLiquidGlass>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Caption Inline Editor Component
function CaptionInlineEditor({
  segment,
  onChange,
  onApply,
  onDiscard,
  inputRef
}: {
  segment: VideoSegment
  onChange: (updates: Partial<VideoSegment>) => void
  onApply: () => void
  onDiscard: () => void
  inputRef: React.RefObject<HTMLInputElement>
}) {
  const [captionText, setCaptionText] = useState(
    segment.captions?.[0]?.text || segment.content.text || ''
  )
  const [position, setPosition] = useState<'top' | 'center' | 'bottom'>(
    segment.captions?.[0]?.style.position || 'bottom'
  )

  const handleTextChange = (text: string) => {
    setCaptionText(text)
    
    const updatedCaptions = [{
      id: segment.captions?.[0]?.id || `caption-${Date.now()}`,
      text,
      startTime: 0,
      duration: segment.duration,
      style: {
        fontSize: 24,
        color: '#ffffff',
        position,
        fontWeight: 'bold' as const
      }
    }]

    onChange({ captions: updatedCaptions })
  }

  const handlePositionChange = (newPosition: 'top' | 'center' | 'bottom') => {
    setPosition(newPosition)
    
    if (segment.captions?.[0]) {
      const updatedCaptions = [{
        ...segment.captions[0],
        style: {
          ...segment.captions[0].style,
          position: newPosition
        }
      }]
      onChange({ captions: updatedCaptions })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-medium text-white/90">Edit Caption</h4>
        <div className="flex items-center gap-2">
          <motion.button
            onClick={onDiscard}
            className="px-3 py-1 text-sm text-white/60 hover:text-white transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Undo className="w-4 h-4" />
          </motion.button>
          <motion.button
            onClick={onApply}
            className="px-4 py-1 bg-blue-500/30 text-blue-300 rounded-lg text-sm font-medium hover:bg-blue-500/40 transition-colors flex items-center gap-1"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Check className="w-4 h-4" />
            Apply
          </motion.button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <label className="block text-sm text-white/70 mb-2">Caption Text</label>
          <input
            ref={inputRef}
            type="text"
            value={captionText}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="Enter caption text..."
            className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-400 transition-colors"
          />
          <div className="text-xs text-white/50 mt-1">
            {captionText.length} / 100 characters
          </div>
        </div>

        <div>
          <label className="block text-sm text-white/70 mb-2">Position</label>
          <div className="space-y-2">
            {(['top', 'center', 'bottom'] as const).map((pos) => (
              <motion.button
                key={pos}
                onClick={() => handlePositionChange(pos)}
                className={cn(
                  "w-full p-2 rounded-lg text-sm transition-colors capitalize",
                  position === pos
                    ? "bg-blue-500/30 text-blue-300"
                    : "bg-white/10 text-white/70 hover:bg-white/20"
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {pos}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Real-time preview */}
      <div className="relative aspect-video bg-black/50 rounded-lg overflow-hidden">
        <img
          src={segment.thumbnailUrl}
          alt="Preview"
          className="w-full h-full object-cover opacity-60"
        />
        {captionText && (
          <div className={cn(
            "absolute left-4 right-4 text-center text-white font-bold text-lg",
            position === 'top' && "top-4",
            position === 'center' && "top-1/2 -translate-y-1/2",
            position === 'bottom' && "bottom-4"
          )}>
            <div className="bg-black/50 px-3 py-1 rounded-lg backdrop-blur-sm">
              {captionText}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Transformation Inline Editor Component
function TransformationInlineEditor({
  segment,
  onChange,
  onApply,
  onDiscard
}: {
  segment: VideoSegment
  onChange: (updates: Partial<VideoSegment>) => void
  onApply: () => void
  onDiscard: () => void
}) {
  const transformations = segment.transformations || {
    scale: 1,
    rotation: 0,
    opacity: 1,
    blur: 0,
    brightness: 1,
    contrast: 1
  }

  const handleTransformationChange = (key: keyof typeof transformations, value: number) => {
    const newTransformations = { ...transformations, [key]: value }
    onChange({ transformations: newTransformations })
  }

  const resetTransformations = () => {
    onChange({
      transformations: {
        scale: 1,
        rotation: 0,
        opacity: 1,
        blur: 0,
        brightness: 1,
        contrast: 1
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-medium text-white/90">Transform Segment</h4>
        <div className="flex items-center gap-2">
          <motion.button
            onClick={resetTransformations}
            className="px-3 py-1 text-sm text-white/60 hover:text-white transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RotateCw className="w-4 h-4" />
          </motion.button>
          <motion.button
            onClick={onDiscard}
            className="px-3 py-1 text-sm text-white/60 hover:text-white transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Undo className="w-4 h-4" />
          </motion.button>
          <motion.button
            onClick={onApply}
            className="px-4 py-1 bg-purple-500/30 text-purple-300 rounded-lg text-sm font-medium hover:bg-purple-500/40 transition-colors flex items-center gap-1"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Check className="w-4 h-4" />
            Apply
          </motion.button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          {/* Scale */}
          <div>
            <label className="block text-sm text-white/70 mb-2">
              Scale: {transformations.scale.toFixed(2)}x
            </label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={transformations.scale}
              onChange={(e) => handleTransformationChange('scale', parseFloat(e.target.value))}
              className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Rotation */}
          <div>
            <label className="block text-sm text-white/70 mb-2">
              Rotation: {transformations.rotation}°
            </label>
            <input
              type="range"
              min="-180"
              max="180"
              step="5"
              value={transformations.rotation}
              onChange={(e) => handleTransformationChange('rotation', parseInt(e.target.value))}
              className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Opacity */}
          <div>
            <label className="block text-sm text-white/70 mb-2">
              Opacity: {Math.round(transformations.opacity * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={transformations.opacity}
              onChange={(e) => handleTransformationChange('opacity', parseFloat(e.target.value))}
              className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        <div className="space-y-4">
          {/* Blur */}
          <div>
            <label className="block text-sm text-white/70 mb-2">
              Blur: {transformations.blur}px
            </label>
            <input
              type="range"
              min="0"
              max="10"
              step="0.5"
              value={transformations.blur}
              onChange={(e) => handleTransformationChange('blur', parseFloat(e.target.value))}
              className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Brightness */}
          <div>
            <label className="block text-sm text-white/70 mb-2">
              Brightness: {Math.round(transformations.brightness * 100)}%
            </label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={transformations.brightness}
              onChange={(e) => handleTransformationChange('brightness', parseFloat(e.target.value))}
              className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Contrast */}
          <div>
            <label className="block text-sm text-white/70 mb-2">
              Contrast: {Math.round(transformations.contrast * 100)}%
            </label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={transformations.contrast}
              onChange={(e) => handleTransformationChange('contrast', parseFloat(e.target.value))}
              className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Live Preview */}
      <div className="relative aspect-video bg-black/50 rounded-lg overflow-hidden">
        <img
          src={segment.thumbnailUrl}
          alt="Preview"
          className="w-full h-full object-cover"
          style={{
            transform: `scale(${transformations.scale}) rotate(${transformations.rotation}deg)`,
            opacity: transformations.opacity,
            filter: `blur(${transformations.blur}px) brightness(${transformations.brightness}) contrast(${transformations.contrast})`
          }}
        />
      </div>
    </div>
  )
}

// Audio Inline Editor Component
function AudioInlineEditor({
  segment,
  onChange,
  onApply,
  onDiscard,
  canvasRef
}: {
  segment: VideoSegment
  onChange: (updates: Partial<VideoSegment>) => void
  onApply: () => void
  onDiscard: () => void
  canvasRef: React.RefObject<HTMLCanvasElement>
}) {
  const audio = segment.audio || { volume: 0.5, fadeIn: 0, fadeOut: 0 }

  const handleAudioChange = (key: keyof typeof audio, value: number) => {
    const newAudio = { ...audio, [key]: value }
    onChange({ audio: newAudio })
  }

  const toggleMute = () => {
    handleAudioChange('volume', audio.volume > 0 ? 0 : 0.5)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-medium text-white/90">Audio Settings</h4>
        <div className="flex items-center gap-2">
          <motion.button
            onClick={onDiscard}
            className="px-3 py-1 text-sm text-white/60 hover:text-white transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Undo className="w-4 h-4" />
          </motion.button>
          <motion.button
            onClick={onApply}
            className="px-4 py-1 bg-orange-500/30 text-orange-300 rounded-lg text-sm font-medium hover:bg-orange-500/40 transition-colors flex items-center gap-1"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Check className="w-4 h-4" />
            Apply
          </motion.button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          {/* Volume */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-white/70">
                Volume: {Math.round(audio.volume * 100)}%
              </label>
              <motion.button
                onClick={toggleMute}
                className="p-1 text-white/60 hover:text-white transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                {audio.volume > 0 ? (
                  <Volume2 className="w-4 h-4" />
                ) : (
                  <VolumeX className="w-4 h-4" />
                )}
              </motion.button>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={audio.volume}
              onChange={(e) => handleAudioChange('volume', parseFloat(e.target.value))}
              className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Fade In */}
          <div>
            <label className="block text-sm text-white/70 mb-2">
              Fade In: {audio.fadeIn}s
            </label>
            <input
              type="range"
              min="0"
              max="5"
              step="0.5"
              value={audio.fadeIn}
              onChange={(e) => handleAudioChange('fadeIn', parseFloat(e.target.value))}
              className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Fade Out */}
          <div>
            <label className="block text-sm text-white/70 mb-2">
              Fade Out: {audio.fadeOut}s
            </label>
            <input
              type="range"
              min="0"
              max="5"
              step="0.5"
              value={audio.fadeOut}
              onChange={(e) => handleAudioChange('fadeOut', parseFloat(e.target.value))}
              className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        {/* Waveform Visualization */}
        <div>
          <label className="block text-sm text-white/70 mb-2">Waveform</label>
          <div className="bg-black/30 rounded-lg p-2">
            <canvas
              ref={canvasRef}
              width={300}
              height={100}
              className="w-full h-24 rounded"
            />
          </div>
        </div>
      </div>
    </div>
  )
}