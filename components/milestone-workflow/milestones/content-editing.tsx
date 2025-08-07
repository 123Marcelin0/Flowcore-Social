"use client"

import React, { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { EnhancedLiquidGlass } from '@/components/ui/enhanced-liquid-glass'
import { 
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Scissors,
  RotateCcw,
  RotateCw,
  Crop,
  Move,
  ZoomIn,
  ZoomOut,
  Layers,
  Type,
  Music,
  Image as ImageIcon,
  Video,
  Plus,
  Trash2,
  Copy,
  Settings,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  AlertCircle,
  Clock,
  Sliders
} from 'lucide-react'

export interface TimelineClip {
  id: string
  type: 'video' | 'image' | 'audio' | 'text'
  name: string
  startTime: number
  duration: number
  layer: number
  thumbnailUrl?: string
  url?: string
  properties: {
    volume?: number
    opacity?: number
    scale?: number
    rotation?: number
    x?: number
    y?: number
    text?: string
    fontSize?: number
    fontFamily?: string
    color?: string
    backgroundColor?: string
  }
  effects: {
    id: string
    type: string
    intensity: number
  }[]
  isLocked: boolean
  isVisible: boolean
  isSelected: boolean
}

export interface ContentEditingData {
  clips: TimelineClip[]
  totalDuration: number
  currentTime: number
  zoom: number
  selectedClips: string[]
}

export interface ContentEditingProps {
  initialData?: Partial<ContentEditingData>
  onDataChange: (data: ContentEditingData) => void
  onValidationChange: (isValid: boolean, errors: string[]) => void
  className?: string
}

const TIMELINE_LAYERS = [
  { id: 'video', name: 'Video', color: '#3b82f6', icon: Video },
  { id: 'images', name: 'Images', color: '#10b981', icon: ImageIcon },
  { id: 'text', name: 'Text', color: '#f59e0b', icon: Type },
  { id: 'audio', name: 'Audio', color: '#8b5cf6', icon: Music }
]

const EDITING_TOOLS = [
  { id: 'select', name: 'Select', icon: Move, shortcut: 'V' },
  { id: 'cut', name: 'Cut', icon: Scissors, shortcut: 'C' },
  { id: 'crop', name: 'Crop', icon: Crop, shortcut: 'R' },
  { id: 'rotate', name: 'Rotate', icon: RotateCw, shortcut: 'T' },
  { id: 'zoom', name: 'Zoom', icon: ZoomIn, shortcut: 'Z' }
]

export function ContentEditing({
  initialData,
  onDataChange,
  onValidationChange,
  className
}: ContentEditingProps) {
  const [clips, setClips] = useState<TimelineClip[]>(initialData?.clips || [])
  const [currentTime, setCurrentTime] = useState(initialData?.currentTime || 0)
  const [totalDuration, setTotalDuration] = useState(initialData?.totalDuration || 60)
  const [zoom, setZoom] = useState(initialData?.zoom || 1)
  const [selectedClips, setSelectedClips] = useState<string[]>(initialData?.selectedClips || [])
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [selectedTool, setSelectedTool] = useState('select')
  const [showPreview, setShowPreview] = useState(true)
  const [errors, setErrors] = useState<string[]>([])
  
  const timelineRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLVideoElement>(null)

  // Mock clips for demonstration
  React.useEffect(() => {
    if (clips.length === 0) {
      const mockClips: TimelineClip[] = [
        {
          id: 'clip-1',
          type: 'video',
          name: 'Main Video',
          startTime: 0,
          duration: 30,
          layer: 0,
          thumbnailUrl: '/placeholder.jpg',
          url: '/placeholder-video.mp4',
          properties: {
            volume: 0.8,
            opacity: 1,
            scale: 1,
            rotation: 0,
            x: 0,
            y: 0
          },
          effects: [],
          isLocked: false,
          isVisible: true,
          isSelected: false
        },
        {
          id: 'clip-2',
          type: 'image',
          name: 'Overlay Image',
          startTime: 10,
          duration: 15,
          layer: 1,
          thumbnailUrl: '/placeholder.jpg',
          properties: {
            opacity: 0.8,
            scale: 0.5,
            rotation: 0,
            x: 100,
            y: 50
          },
          effects: [],
          isLocked: false,
          isVisible: true,
          isSelected: false
        },
        {
          id: 'clip-3',
          type: 'text',
          name: 'Title Text',
          startTime: 5,
          duration: 10,
          layer: 2,
          properties: {
            text: 'Sample Title',
            fontSize: 48,
            fontFamily: 'Inter',
            color: '#ffffff',
            backgroundColor: 'transparent',
            x: 50,
            y: 100
          },
          effects: [],
          isLocked: false,
          isVisible: true,
          isSelected: false
        },
        {
          id: 'clip-4',
          type: 'audio',
          name: 'Background Music',
          startTime: 0,
          duration: 45,
          layer: 3,
          properties: {
            volume: 0.3
          },
          effects: [],
          isLocked: false,
          isVisible: true,
          isSelected: false
        }
      ]
      setClips(mockClips)
      setTotalDuration(Math.max(...mockClips.map(c => c.startTime + c.duration)))
    }
  }, [clips.length])

  // Validation logic
  React.useEffect(() => {
    const newErrors: string[] = []
    
    if (clips.length === 0) {
      newErrors.push('Please add at least one media clip to the timeline')
    }
    
    const videoClips = clips.filter(c => c.type === 'video')
    if (videoClips.length === 0) {
      newErrors.push('Timeline must contain at least one video clip')
    }
    
    const overlappingClips = clips.filter((clip, index) => {
      return clips.some((otherClip, otherIndex) => 
        index !== otherIndex &&
        clip.layer === otherClip.layer &&
        clip.startTime < otherClip.startTime + otherClip.duration &&
        clip.startTime + clip.duration > otherClip.startTime
      )
    })
    
    if (overlappingClips.length > 0) {
      newErrors.push(`${overlappingClips.length} clip(s) have overlapping timing on the same layer`)
    }

    setErrors(newErrors)
    onValidationChange(newErrors.length === 0, newErrors)
  }, [clips, onValidationChange])

  // Data change handler
  React.useEffect(() => {
    onDataChange({
      clips,
      totalDuration,
      currentTime,
      zoom,
      selectedClips
    })
  }, [clips, totalDuration, currentTime, zoom, selectedClips, onDataChange])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 100)
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
  }

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying)
    // In a real implementation, this would control video playback
  }

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!timelineRef.current) return
    
    const rect = timelineRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const timelineWidth = rect.width
    const clickTime = (x / timelineWidth) * totalDuration
    
    setCurrentTime(Math.max(0, Math.min(clickTime, totalDuration)))
  }

  const handleClipSelect = (clipId: string, multiSelect = false) => {
    if (multiSelect) {
      setSelectedClips(prev => 
        prev.includes(clipId) 
          ? prev.filter(id => id !== clipId)
          : [...prev, clipId]
      )
    } else {
      setSelectedClips([clipId])
    }
    
    setClips(prev => prev.map(clip => ({
      ...clip,
      isSelected: multiSelect 
        ? clip.id === clipId ? !clip.isSelected : clip.isSelected
        : clip.id === clipId
    })))
  }

  const handleClipDrag = (clipId: string, newStartTime: number) => {
    setClips(prev => prev.map(clip => 
      clip.id === clipId 
        ? { ...clip, startTime: Math.max(0, newStartTime) }
        : clip
    ))
  }

  const handleClipResize = (clipId: string, newDuration: number) => {
    setClips(prev => prev.map(clip => 
      clip.id === clipId 
        ? { ...clip, duration: Math.max(0.1, newDuration) }
        : clip
    ))
  }

  const handleClipDelete = (clipId: string) => {
    setClips(prev => prev.filter(clip => clip.id !== clipId))
    setSelectedClips(prev => prev.filter(id => id !== clipId))
  }

  const handleClipDuplicate = (clipId: string) => {
    const clipToDuplicate = clips.find(c => c.id === clipId)
    if (clipToDuplicate) {
      const newClip: TimelineClip = {
        ...clipToDuplicate,
        id: `${clipId}-copy-${Date.now()}`,
        name: `${clipToDuplicate.name} Copy`,
        startTime: clipToDuplicate.startTime + clipToDuplicate.duration,
        isSelected: false
      }
      setClips(prev => [...prev, newClip])
    }
  }

  const handleClipPropertyChange = (clipId: string, property: string, value: any) => {
    setClips(prev => prev.map(clip => 
      clip.id === clipId 
        ? { 
            ...clip, 
            properties: { ...clip.properties, [property]: value }
          }
        : clip
    ))
  }

  const TimelineClipComponent = ({ clip }: { clip: TimelineClip }) => {
    const clipWidth = (clip.duration / totalDuration) * 100
    const clipLeft = (clip.startTime / totalDuration) * 100
    const layer = TIMELINE_LAYERS[clip.layer] || TIMELINE_LAYERS[0]

    return (
      <motion.div
        className={cn(
          'absolute h-12 rounded-lg border-2 cursor-pointer group transition-all duration-200',
          clip.isSelected 
            ? 'border-blue-400 bg-blue-500/30 z-20' 
            : 'border-white/20 bg-white/10 hover:border-white/40 z-10',
          !clip.isVisible && 'opacity-50',
          clip.isLocked && 'cursor-not-allowed'
        )}
        style={{
          left: `${clipLeft}%`,
          width: `${clipWidth}%`,
          backgroundColor: `${layer.color}20`,
          borderColor: clip.isSelected ? '#3b82f6' : `${layer.color}40`
        }}
        onClick={(e) => {
          e.stopPropagation()
          handleClipSelect(clip.id, e.metaKey || e.ctrlKey)
        }}
        drag={!clip.isLocked}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0}
        onDrag={(e, info) => {
          const newStartTime = clip.startTime + (info.delta.x / timelineRef.current!.offsetWidth) * totalDuration
          handleClipDrag(clip.id, newStartTime)
        }}
        whileHover={{ scale: 1.02 }}
        whileDrag={{ scale: 1.05, zIndex: 30 }}
      >
        {/* Clip Content */}
        <div className="flex items-center h-full px-2 gap-2">
          {/* Thumbnail */}
          {clip.thumbnailUrl && (
            <div className="w-8 h-8 rounded bg-white/10 overflow-hidden flex-shrink-0">
              <img 
                src={clip.thumbnailUrl} 
                alt={clip.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          {/* Clip Info */}
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-white/90 truncate">
              {clip.name}
            </div>
            <div className="text-xs text-white/60">
              {formatTime(clip.duration)}
            </div>
          </div>
          
          {/* Status Icons */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {clip.isLocked && <Lock className="w-3 h-3 text-white/60" />}
            {!clip.isVisible && <EyeOff className="w-3 h-3 text-white/60" />}
          </div>
        </div>

        {/* Resize Handles */}
        {!clip.isLocked && (
          <>
            <div 
              className="absolute left-0 top-0 w-2 h-full cursor-ew-resize bg-blue-400/50 opacity-0 group-hover:opacity-100 transition-opacity"
              onMouseDown={(e) => {
                e.stopPropagation()
                // Handle left resize
              }}
            />
            <div 
              className="absolute right-0 top-0 w-2 h-full cursor-ew-resize bg-blue-400/50 opacity-0 group-hover:opacity-100 transition-opacity"
              onMouseDown={(e) => {
                e.stopPropagation()
                // Handle right resize
              }}
            />
          </>
        )}
      </motion.div>
    )
  }

  const selectedClip = clips.find(c => c.isSelected)

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <section>
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-white/90 mb-2">
            Content Editor
          </h3>
          <p className="text-sm text-white/60">
            Arrange your media, add effects, and fine-tune your content
          </p>
        </div>
      </section>

      {/* Main Editor Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Preview Panel */}
        <div className="lg:col-span-2">
          <EnhancedLiquidGlass
            variant="editor"
            intensity="medium"
            className="p-4"
          >
            <div className="space-y-4">
              {/* Preview Controls */}
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-white/90">Preview</h4>
                <div className="flex items-center gap-2">
                  <motion.button
                    onClick={() => setShowPreview(!showPreview)}
                    className={cn(
                      'p-2 rounded-lg border transition-all duration-300',
                      showPreview 
                        ? 'bg-blue-500/20 border-blue-400/50 text-blue-300'
                        : 'bg-white/10 border-white/20 text-white/60'
                    )}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {showPreview ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </motion.button>
                  
                  <motion.button
                    className="p-2 rounded-lg border bg-white/10 border-white/20 text-white/60 hover:bg-white/20"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Maximize className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>

              {/* Video Preview */}
              {showPreview && (
                <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
                  <video
                    ref={previewRef}
                    className="w-full h-full object-contain"
                    poster="/placeholder.jpg"
                  />
                  
                  {/* Preview Overlay Controls */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="flex items-center gap-4">
                        <motion.button
                          onClick={handlePlayPause}
                          className="w-12 h-12 bg-white/20 border border-white/30 rounded-full flex items-center justify-center text-white hover:bg-white/30"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                        </motion.button>
                        
                        <div className="flex-1 flex items-center gap-2">
                          <span className="text-xs text-white/80 font-mono">
                            {formatTime(currentTime)}
                          </span>
                          <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-400 transition-all duration-300"
                              style={{ width: `${(currentTime / totalDuration) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-white/80 font-mono">
                            {formatTime(totalDuration)}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <motion.button
                            onClick={() => setIsMuted(!isMuted)}
                            className="p-2 rounded-lg bg-white/20 border border-white/30 text-white hover:bg-white/30"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                          </motion.button>
                          
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={isMuted ? 0 : volume}
                            onChange={(e) => setVolume(parseFloat(e.target.value))}
                            className="w-16 accent-blue-400"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Playback Controls */}
              <div className="flex items-center justify-center gap-4">
                <motion.button
                  onClick={() => setCurrentTime(Math.max(0, currentTime - 5))}
                  className="p-2 rounded-lg bg-white/10 border border-white/20 text-white/80 hover:bg-white/20"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <SkipBack className="w-4 h-4" />
                </motion.button>
                
                <motion.button
                  onClick={handlePlayPause}
                  className="p-3 rounded-lg bg-blue-500/20 border border-blue-400/50 text-blue-300 hover:bg-blue-500/30"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </motion.button>
                
                <motion.button
                  onClick={() => setCurrentTime(Math.min(totalDuration, currentTime + 5))}
                  className="p-2 rounded-lg bg-white/10 border border-white/20 text-white/80 hover:bg-white/20"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <SkipForward className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </EnhancedLiquidGlass>
        </div>

        {/* Properties Panel */}
        <div className="space-y-4">
          {/* Editing Tools */}
          <EnhancedLiquidGlass
            variant="timeline"
            intensity="medium"
            className="p-4"
          >
            <h4 className="text-sm font-semibold text-white/90 mb-3">Tools</h4>
            <div className="grid grid-cols-2 gap-2">
              {EDITING_TOOLS.map((tool) => {
                const Icon = tool.icon
                const isActive = selectedTool === tool.id
                
                return (
                  <motion.button
                    key={tool.id}
                    onClick={() => setSelectedTool(tool.id)}
                    className={cn(
                      'p-3 rounded-lg border text-left transition-all duration-300',
                      isActive
                        ? 'bg-blue-500/20 border-blue-400/50 text-blue-300'
                        : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/10'
                    )}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{tool.name}</span>
                    </div>
                    <span className="text-xs opacity-70">{tool.shortcut}</span>
                  </motion.button>
                )
              })}
            </div>
          </EnhancedLiquidGlass>

          {/* Clip Properties */}
          {selectedClip && (
            <EnhancedLiquidGlass
              variant="timeline"
              intensity="medium"
              className="p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-white/90">Properties</h4>
                <div className="flex items-center gap-1">
                  <motion.button
                    onClick={() => handleClipDuplicate(selectedClip.id)}
                    className="p-1 rounded bg-white/10 border border-white/20 text-white/60 hover:bg-white/20"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Copy className="w-3 h-3" />
                  </motion.button>
                  <motion.button
                    onClick={() => handleClipDelete(selectedClip.id)}
                    className="p-1 rounded bg-red-500/20 border border-red-400/50 text-red-300 hover:bg-red-500/30"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </motion.button>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={selectedClip.name}
                    onChange={(e) => {
                      setClips(prev => prev.map(clip => 
                        clip.id === selectedClip.id 
                          ? { ...clip, name: e.target.value }
                          : clip
                      ))
                    }}
                    className="w-full px-2 py-1 text-xs bg-white/10 border border-white/20 rounded text-white/90 focus:outline-none focus:ring-1 focus:ring-blue-400/50"
                  />
                </div>

                {selectedClip.properties.opacity !== undefined && (
                  <div>
                    <label className="block text-xs font-medium text-white/70 mb-1">
                      Opacity: {Math.round(selectedClip.properties.opacity * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={selectedClip.properties.opacity}
                      onChange={(e) => handleClipPropertyChange(selectedClip.id, 'opacity', parseFloat(e.target.value))}
                      className="w-full accent-blue-400"
                    />
                  </div>
                )}

                {selectedClip.properties.scale !== undefined && (
                  <div>
                    <label className="block text-xs font-medium text-white/70 mb-1">
                      Scale: {Math.round(selectedClip.properties.scale * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="2"
                      step="0.1"
                      value={selectedClip.properties.scale}
                      onChange={(e) => handleClipPropertyChange(selectedClip.id, 'scale', parseFloat(e.target.value))}
                      className="w-full accent-blue-400"
                    />
                  </div>
                )}

                {selectedClip.properties.rotation !== undefined && (
                  <div>
                    <label className="block text-xs font-medium text-white/70 mb-1">
                      Rotation: {selectedClip.properties.rotation}°
                    </label>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      step="1"
                      value={selectedClip.properties.rotation}
                      onChange={(e) => handleClipPropertyChange(selectedClip.id, 'rotation', parseInt(e.target.value))}
                      className="w-full accent-blue-400"
                    />
                  </div>
                )}

                {selectedClip.properties.volume !== undefined && (
                  <div>
                    <label className="block text-xs font-medium text-white/70 mb-1">
                      Volume: {Math.round(selectedClip.properties.volume * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={selectedClip.properties.volume}
                      onChange={(e) => handleClipPropertyChange(selectedClip.id, 'volume', parseFloat(e.target.value))}
                      className="w-full accent-blue-400"
                    />
                  </div>
                )}

                {selectedClip.type === 'text' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-white/70 mb-1">
                        Text
                      </label>
                      <textarea
                        value={selectedClip.properties.text || ''}
                        onChange={(e) => handleClipPropertyChange(selectedClip.id, 'text', e.target.value)}
                        className="w-full px-2 py-1 text-xs bg-white/10 border border-white/20 rounded text-white/90 focus:outline-none focus:ring-1 focus:ring-blue-400/50 resize-none"
                        rows={2}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-white/70 mb-1">
                        Font Size: {selectedClip.properties.fontSize}px
                      </label>
                      <input
                        type="range"
                        min="12"
                        max="72"
                        step="2"
                        value={selectedClip.properties.fontSize || 24}
                        onChange={(e) => handleClipPropertyChange(selectedClip.id, 'fontSize', parseInt(e.target.value))}
                        className="w-full accent-blue-400"
                      />
                    </div>
                  </>
                )}
              </div>
            </EnhancedLiquidGlass>
          )}
        </div>
      </div>

      {/* Timeline */}
      <section>
        <EnhancedLiquidGlass
          variant="editor"
          intensity="medium"
          className="p-4"
        >
          <div className="space-y-4">
            {/* Timeline Header */}
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-white/90">Timeline</h4>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/60">Zoom:</span>
                <motion.button
                  onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
                  className="p-1 rounded bg-white/10 border border-white/20 text-white/60 hover:bg-white/20"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ZoomOut className="w-3 h-3" />
                </motion.button>
                <span className="text-xs text-white/70 font-mono w-8 text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <motion.button
                  onClick={() => setZoom(Math.min(3, zoom + 0.25))}
                  className="p-1 rounded bg-white/10 border border-white/20 text-white/60 hover:bg-white/20"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ZoomIn className="w-3 h-3" />
                </motion.button>
              </div>
            </div>

            {/* Timeline Ruler */}
            <div className="relative h-6 bg-white/5 rounded-lg overflow-hidden">
              <div className="absolute inset-0 flex">
                {Array.from({ length: Math.ceil(totalDuration / 5) }, (_, i) => (
                  <div key={i} className="flex-1 border-r border-white/10 text-xs text-white/40 px-1">
                    {formatTime(i * 5)}
                  </div>
                ))}
              </div>
              
              {/* Playhead */}
              <div 
                className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-30"
                style={{ left: `${(currentTime / totalDuration) * 100}%` }}
              >
                <div className="absolute -top-1 -left-1 w-2 h-2 bg-red-400 rounded-full" />
              </div>
            </div>

            {/* Timeline Tracks */}
            <div className="space-y-2">
              {TIMELINE_LAYERS.map((layer, layerIndex) => {
                const layerClips = clips.filter(c => c.layer === layerIndex)
                
                return (
                  <div key={layer.id} className="flex items-center gap-4">
                    {/* Layer Header */}
                    <div className="w-24 flex-shrink-0">
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10">
                        <layer.icon className="w-4 h-4" style={{ color: layer.color }} />
                        <span className="text-xs font-medium text-white/80">{layer.name}</span>
                      </div>
                    </div>

                    {/* Track */}
                    <div 
                      ref={layerIndex === 0 ? timelineRef : undefined}
                      className="flex-1 relative h-16 bg-white/5 rounded-lg border border-white/10 cursor-crosshair"
                      onClick={handleTimelineClick}
                    >
                      {layerClips.map(clip => (
                        <TimelineClipComponent key={clip.id} clip={clip} />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </EnhancedLiquidGlass>
      </section>

      {/* Validation Errors */}
      <AnimatePresence>
        {errors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <EnhancedLiquidGlass
              variant="timeline"
              intensity="medium"
              className="p-4 border-red-400/30"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-red-300 mb-2">
                    Please fix the following issues:
                  </h4>
                  <ul className="space-y-1">
                    {errors.map((error, index) => (
                      <li key={index} className="text-sm text-red-200/80">
                        • {error}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </EnhancedLiquidGlass>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}