"use client"

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { LiquidModal } from './ui/liquid-modal'
import { EnhancedLiquidGlass } from './ui/enhanced-liquid-glass'
import { 
  Play, 
  Pause, 
  Edit3, 
  Type, 
  Music, 
  Sparkles, 
  Save, 
  X,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Check
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
    effects?: string[]
    transitions?: string[]
    music?: {
      track: string
      volume: number
      startTime: number
    }
  }
}

interface QuickEditInterfaceProps {
  isOpen: boolean
  onClose: () => void
  segments: VideoSegment[]
  currentSegment?: number
  onSegmentUpdate: (segmentId: string, updates: Partial<VideoSegment>) => void
  onApplyChanges: () => void
  videoPreviewUrl?: string
  className?: string
  onMusicPopupToggle?: (isOpen: boolean) => void
}

interface EditMode {
  type: 'caption' | 'effect' | 'transition' | 'music' | null
  segmentId: string | null
}

const effectOptions = [
  { id: 'fade-in', name: 'Fade In', preview: '↗️' },
  { id: 'fade-out', name: 'Fade Out', preview: '↘️' },
  { id: 'zoom-in', name: 'Zoom In', preview: '🔍' },
  { id: 'slide-left', name: 'Slide Left', preview: '⬅️' },
  { id: 'slide-right', name: 'Slide Right', preview: '➡️' },
  { id: 'blur', name: 'Blur', preview: '🌫️' },
  { id: 'brightness', name: 'Brightness', preview: '☀️' },
  { id: 'contrast', name: 'Contrast', preview: '🎭' },
]

const transitionOptions = [
  { id: 'cut', name: 'Cut', preview: '✂️' },
  { id: 'fade', name: 'Fade', preview: '🌅' },
  { id: 'slide', name: 'Slide', preview: '📱' },
  { id: 'wipe', name: 'Wipe', preview: '🧽' },
  { id: 'dissolve', name: 'Dissolve', preview: '💫' },
  { id: 'zoom', name: 'Zoom', preview: '🔎' },
]

const musicTracks = [
  { id: 'upbeat-1', name: 'Upbeat Energy', duration: 180 },
  { id: 'chill-1', name: 'Chill Vibes', duration: 200 },
  { id: 'dramatic-1', name: 'Dramatic Build', duration: 150 },
  { id: 'ambient-1', name: 'Ambient Flow', duration: 240 },
  { id: 'electronic-1', name: 'Electronic Beat', duration: 160 },
]

export function QuickEditInterface({
  isOpen,
  onClose,
  segments,
  currentSegment = 0,
  onSegmentUpdate,
  onApplyChanges,
  videoPreviewUrl,
  className,
  onMusicPopupToggle,
}: QuickEditInterfaceProps) {
  const [selectedSegment, setSelectedSegment] = useState(currentSegment)
  const [editMode, setEditMode] = useState<EditMode>({ type: null, segmentId: null })
  const [tempChanges, setTempChanges] = useState<Record<string, Partial<VideoSegment>>>({})
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false)
  const [previewTime, setPreviewTime] = useState(0)
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const segmentRefs = useRef<(HTMLDivElement | null)[]>([])

  // Update selected segment when currentSegment prop changes
  useEffect(() => {
    setSelectedSegment(currentSegment)
  }, [currentSegment])

  // Add/remove music popup class to body when music editing is active
  useEffect(() => {
    const isMusicMode = editMode.type === 'music'
    
    if (isMusicMode) {
      document.body.classList.add('music-popup-active')
    } else {
      document.body.classList.remove('music-popup-active')
    }

    // Cleanup on unmount
    return () => {
      document.body.classList.remove('music-popup-active')
    }
  }, [editMode.type])

  // Auto-scroll to selected segment
  useEffect(() => {
    const segmentElement = segmentRefs.current[selectedSegment]
    if (segmentElement) {
      segmentElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'center'
      })
    }
  }, [selectedSegment])

  const currentSegmentData = segments[selectedSegment]
  const hasUnsavedChanges = Object.keys(tempChanges).length > 0

  const handleSegmentClick = (index: number) => {
    setSelectedSegment(index)
    setEditMode({ type: null, segmentId: null })
    
    // Jump to segment time in preview
    if (videoRef.current) {
      videoRef.current.currentTime = segments[index].startTime
    }
  }

  const handleEditModeChange = (type: EditMode['type'], segmentId: string) => {
    setEditMode({ type, segmentId })
    
    // Notify parent when music popup is opened/closed
    if (onMusicPopupToggle) {
      onMusicPopupToggle(type === 'music')
    }
  }

  const handleTempChange = (segmentId: string, updates: Partial<VideoSegment>) => {
    setTempChanges(prev => ({
      ...prev,
      [segmentId]: {
        ...prev[segmentId],
        ...updates
      }
    }))
  }

  const applyTempChanges = () => {
    Object.entries(tempChanges).forEach(([segmentId, updates]) => {
      onSegmentUpdate(segmentId, updates)
    })
    setTempChanges({})
    setShowSaveConfirmation(true)
    setTimeout(() => setShowSaveConfirmation(false), 2000)
  }

  const discardTempChanges = () => {
    setTempChanges({})
    setEditMode({ type: null, segmentId: null })
  }

  const handleApplyAndClose = () => {
    if (hasUnsavedChanges) {
      applyTempChanges()
    }
    onApplyChanges()
    
    // Ensure music popup is closed when interface closes
    if (onMusicPopupToggle) {
      onMusicPopupToggle(false)
    }
    
    onClose()
  }

  const togglePreview = () => {
    if (videoRef.current) {
      if (isPreviewPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPreviewPlaying(!isPreviewPlaying)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getSegmentWithChanges = (segment: VideoSegment) => {
    const changes = tempChanges[segment.id]
    return changes ? { ...segment, ...changes } : segment
  }

  return (
    <LiquidModal
      isOpen={isOpen}
      onClose={onClose}
      title="Quick Edit"
      subtitle="Make quick adjustments to your video segments"
      size="xl"
      variant="premium"
      className={cn("max-w-6xl max-h-[90vh]", className)}
      headerActions={
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-2"
            >
              <EnhancedLiquidGlass
                variant="editor"
                intensity="medium"
                animation="hover"
                className="px-3 py-1"
              >
                <motion.button
                  onClick={discardTempChanges}
                  className="text-xs text-white/60 hover:text-white/80 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Discard
                </motion.button>
              </EnhancedLiquidGlass>
              
              <EnhancedLiquidGlass
                variant="editor"
                intensity="premium"
                animation="glow"
                className="px-3 py-1"
              >
                <motion.button
                  onClick={applyTempChanges}
                  className="text-xs text-white font-medium flex items-center gap-1"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Save className="w-3 h-3" />
                  Save Changes
                </motion.button>
              </EnhancedLiquidGlass>
            </motion.div>
          )}
          
          <AnimatePresence>
            {showSaveConfirmation && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="flex items-center gap-1 text-green-400 text-sm"
              >
                <Check className="w-4 h-4" />
                <span>Saved!</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      }
    >
      <div className="flex flex-col h-full gap-6">
        {/* Video Preview Section */}
        <div className="flex-shrink-0">
          <EnhancedLiquidGlass
            variant="editor"
            intensity="premium"
            className="p-4"
          >
            <div className="flex gap-4">
              {/* Video Preview */}
              <div className="flex-1">
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                  {videoPreviewUrl && (
                    <video
                      ref={videoRef}
                      src={videoPreviewUrl}
                      className="w-full h-full object-cover"
                      onTimeUpdate={(e) => setPreviewTime(e.currentTarget.currentTime)}
                      onPlay={() => setIsPreviewPlaying(true)}
                      onPause={() => setIsPreviewPlaying(false)}
                    />
                  )}
                  
                  {/* Play/Pause Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.button
                      onClick={togglePreview}
                      className="p-3 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      {isPreviewPlaying ? (
                        <Pause className="w-6 h-6" />
                      ) : (
                        <Play className="w-6 h-6 ml-1" />
                      )}
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* Current Segment Info */}
              <div className="w-64 space-y-3">
                <div>
                  <h4 className="text-sm font-medium text-white/90 mb-1">
                    Current Segment
                  </h4>
                  <p className="text-xs text-white/60">
                    {currentSegmentData?.title || `Segment ${selectedSegment + 1}`}
                  </p>
                </div>
                
                <div className="text-xs text-white/60">
                  <div>Duration: {formatTime(currentSegmentData?.duration || 0)}</div>
                  <div>Start: {formatTime(currentSegmentData?.startTime || 0)}</div>
                </div>

                {/* Quick Edit Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <motion.button
                    onClick={() => handleEditModeChange('caption', currentSegmentData?.id)}
                    className={cn(
                      "p-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1",
                      editMode.type === 'caption' && editMode.segmentId === currentSegmentData?.id
                        ? "bg-blue-500/30 text-blue-300"
                        : "bg-white/10 text-white/70 hover:bg-white/20"
                    )}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Type className="w-3 h-3" />
                    Caption
                  </motion.button>

                  <motion.button
                    onClick={() => handleEditModeChange('effect', currentSegmentData?.id)}
                    className={cn(
                      "p-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1",
                      editMode.type === 'effect' && editMode.segmentId === currentSegmentData?.id
                        ? "bg-purple-500/30 text-purple-300"
                        : "bg-white/10 text-white/70 hover:bg-white/20"
                    )}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Sparkles className="w-3 h-3" />
                    Effects
                  </motion.button>

                  <motion.button
                    onClick={() => handleEditModeChange('transition', currentSegmentData?.id)}
                    className={cn(
                      "p-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1",
                      editMode.type === 'transition' && editMode.segmentId === currentSegmentData?.id
                        ? "bg-green-500/30 text-green-300"
                        : "bg-white/10 text-white/70 hover:bg-white/20"
                    )}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Edit3 className="w-3 h-3" />
                    Transition
                  </motion.button>

                  <motion.button
                    onClick={() => handleEditModeChange('music', currentSegmentData?.id)}
                    className={cn(
                      "p-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1",
                      editMode.type === 'music' && editMode.segmentId === currentSegmentData?.id
                        ? "bg-orange-500/30 text-orange-300"
                        : "bg-white/10 text-white/70 hover:bg-white/20"
                    )}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Music className="w-3 h-3" />
                    Music
                  </motion.button>
                </div>
              </div>
            </div>
          </EnhancedLiquidGlass>
        </div>

        {/* Segment Timeline */}
        <div className="flex-shrink-0">
          <EnhancedLiquidGlass
            variant="timeline"
            intensity="premium"
            className="p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <h4 className="text-sm font-medium text-white/90">Video Segments</h4>
              <div className="flex items-center gap-1">
                <motion.button
                  onClick={() => setSelectedSegment(Math.max(0, selectedSegment - 1))}
                  disabled={selectedSegment === 0}
                  className="p-1 text-white/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </motion.button>
                <motion.button
                  onClick={() => setSelectedSegment(Math.min(segments.length - 1, selectedSegment + 1))}
                  disabled={selectedSegment === segments.length - 1}
                  className="p-1 text-white/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
              {segments.map((segment, index) => {
                const segmentWithChanges = getSegmentWithChanges(segment)
                const hasChanges = tempChanges[segment.id]
                
                return (
                  <motion.div
                    key={segment.id}
                    ref={(el) => { segmentRefs.current[index] = el }}
                    onClick={() => handleSegmentClick(index)}
                    className={cn(
                      "relative flex-shrink-0 w-24 h-16 rounded-lg overflow-hidden cursor-pointer border-2 transition-all",
                      selectedSegment === index
                        ? "border-blue-400 shadow-lg shadow-blue-400/20"
                        : "border-white/20 hover:border-white/40"
                    )}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    layout
                  >
                    {/* Thumbnail */}
                    <img
                      src={segment.thumbnailUrl}
                      alt={segment.title}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    
                    {/* Changes Indicator */}
                    {hasChanges && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full"
                      />
                    )}
                    
                    {/* Segment Info */}
                    <div className="absolute bottom-1 left-1 right-1">
                      <div className="text-xs text-white font-medium truncate">
                        {segmentWithChanges.title}
                      </div>
                      <div className="text-xs text-white/60">
                        {formatTime(segmentWithChanges.duration)}
                      </div>
                    </div>
                    
                    {/* Selection Indicator */}
                    {selectedSegment === index && (
                      <motion.div
                        layoutId="segment-selection"
                        className="absolute inset-0 border-2 border-blue-400 rounded-lg"
                        initial={false}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                  </motion.div>
                )
              })}
            </div>
          </EnhancedLiquidGlass>
        </div>

        {/* Edit Panel */}
        <div className="flex-1 min-h-0">
          <AnimatePresence mode="wait">
            {editMode.type && editMode.segmentId && (
              <motion.div
                key={`${editMode.type}-${editMode.segmentId}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="h-full"
              >
                <EnhancedLiquidGlass
                  variant="editor"
                  intensity="premium"
                  className="p-4 h-full"
                >
                  {editMode.type === 'caption' && (
                    <CaptionEditor
                      segment={getSegmentWithChanges(currentSegmentData)}
                      onChange={(updates) => handleTempChange(editMode.segmentId!, updates)}
                    />
                  )}
                  
                  {editMode.type === 'effect' && (
                    <EffectEditor
                      segment={getSegmentWithChanges(currentSegmentData)}
                      effects={effectOptions}
                      onChange={(updates) => handleTempChange(editMode.segmentId!, updates)}
                    />
                  )}
                  
                  {editMode.type === 'transition' && (
                    <TransitionEditor
                      segment={getSegmentWithChanges(currentSegmentData)}
                      transitions={transitionOptions}
                      onChange={(updates) => handleTempChange(editMode.segmentId!, updates)}
                    />
                  )}
                  
                  {editMode.type === 'music' && (
                    <div data-music-editor>
                      <MusicEditor
                        segment={getSegmentWithChanges(currentSegmentData)}
                        tracks={musicTracks}
                        onChange={(updates) => handleTempChange(editMode.segmentId!, updates)}
                      />
                    </div>
                  )}
                </EnhancedLiquidGlass>
              </motion.div>
            )}
          </AnimatePresence>
          
          {!editMode.type && (
            <div className="h-full flex items-center justify-center">
              <EnhancedLiquidGlass
                variant="editor"
                intensity="medium"
                className="p-8 text-center"
              >
                <div className="text-white/60">
                  <Edit3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Select a segment and choose an edit option to get started</p>
                </div>
              </EnhancedLiquidGlass>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex-shrink-0 flex justify-end gap-3">
          <motion.button
            onClick={onClose}
            className="px-4 py-2 text-sm text-white/70 hover:text-white transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Cancel
          </motion.button>
          
          <EnhancedLiquidGlass
            variant="editor"
            intensity="premium"
            animation="glow"
            className="px-6 py-2"
          >
            <motion.button
              onClick={handleApplyAndClose}
              className="text-sm text-white font-medium flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Check className="w-4 h-4" />
              Apply & Close
            </motion.button>
          </EnhancedLiquidGlass>
        </div>
      </div>
    </LiquidModal>
  )
}

// Individual Editor Components
function CaptionEditor({ 
  segment, 
  onChange 
}: { 
  segment: VideoSegment
  onChange: (updates: Partial<VideoSegment>) => void 
}) {
  const [text, setText] = useState(segment.content.text || '')

  const handleTextChange = (newText: string) => {
    setText(newText)
    onChange({
      content: {
        ...segment.content,
        text: newText
      }
    })
  }

  return (
    <div className="space-y-4">
      <h4 className="text-lg font-medium text-white/90">Edit Caption</h4>
      <div>
        <label className="block text-sm text-white/70 mb-2">Caption Text</label>
        <textarea
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="Enter caption text..."
          className="w-full h-32 p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 resize-none focus:outline-none focus:border-white/40 transition-colors"
        />
      </div>
      <div className="text-xs text-white/50">
        Characters: {text.length} / 280
      </div>
    </div>
  )
}

function EffectEditor({ 
  segment, 
  effects, 
  onChange 
}: { 
  segment: VideoSegment
  effects: typeof effectOptions
  onChange: (updates: Partial<VideoSegment>) => void 
}) {
  const currentEffects = segment.content.effects || []

  const toggleEffect = (effectId: string) => {
    const newEffects = currentEffects.includes(effectId)
      ? currentEffects.filter(id => id !== effectId)
      : [...currentEffects, effectId]
    
    onChange({
      content: {
        ...segment.content,
        effects: newEffects
      }
    })
  }

  return (
    <div className="space-y-4">
      <h4 className="text-lg font-medium text-white/90">Apply Effects</h4>
      <div className="grid grid-cols-2 gap-3">
        {effects.map((effect) => (
          <motion.button
            key={effect.id}
            onClick={() => toggleEffect(effect.id)}
            className={cn(
              "p-3 rounded-lg border transition-colors text-left",
              currentEffects.includes(effect.id)
                ? "bg-purple-500/30 border-purple-400 text-purple-200"
                : "bg-white/10 border-white/20 text-white/70 hover:bg-white/20"
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{effect.preview}</span>
              <span className="text-sm font-medium">{effect.name}</span>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

function TransitionEditor({ 
  segment, 
  transitions, 
  onChange 
}: { 
  segment: VideoSegment
  transitions: typeof transitionOptions
  onChange: (updates: Partial<VideoSegment>) => void 
}) {
  const currentTransitions = segment.content.transitions || []

  const selectTransition = (transitionId: string) => {
    onChange({
      content: {
        ...segment.content,
        transitions: [transitionId]
      }
    })
  }

  return (
    <div className="space-y-4">
      <h4 className="text-lg font-medium text-white/90">Choose Transition</h4>
      <div className="grid grid-cols-3 gap-3">
        {transitions.map((transition) => (
          <motion.button
            key={transition.id}
            onClick={() => selectTransition(transition.id)}
            className={cn(
              "p-3 rounded-lg border transition-colors text-center",
              currentTransitions.includes(transition.id)
                ? "bg-green-500/30 border-green-400 text-green-200"
                : "bg-white/10 border-white/20 text-white/70 hover:bg-white/20"
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="text-2xl mb-1">{transition.preview}</div>
            <div className="text-xs font-medium">{transition.name}</div>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

function MusicEditor({ 
  segment, 
  tracks, 
  onChange 
}: { 
  segment: VideoSegment
  tracks: typeof musicTracks
  onChange: (updates: Partial<VideoSegment>) => void 
}) {
  const currentMusic = segment.content.music
  const [volume, setVolume] = useState(currentMusic?.volume || 0.5)

  const selectTrack = (trackId: string) => {
    onChange({
      content: {
        ...segment.content,
        music: {
          track: trackId,
          volume,
          startTime: 0
        }
      }
    })
  }

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume)
    if (currentMusic) {
      onChange({
        content: {
          ...segment.content,
          music: {
            ...currentMusic,
            volume: newVolume
          }
        }
      })
    }
  }

  return (
    <div className="space-y-4">
      <h4 className="text-lg font-medium text-white/90">Add Music</h4>
      
      <div className="space-y-2">
        {tracks.map((track) => (
          <motion.button
            key={track.id}
            onClick={() => selectTrack(track.id)}
            className={cn(
              "w-full p-3 rounded-lg border transition-colors text-left flex items-center justify-between",
              currentMusic?.track === track.id
                ? "bg-orange-500/30 border-orange-400 text-orange-200"
                : "bg-white/10 border-white/20 text-white/70 hover:bg-white/20"
            )}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <div>
              <div className="font-medium">{track.name}</div>
              <div className="text-xs text-white/50">{track.duration}s</div>
            </div>
            <Music className="w-4 h-4" />
          </motion.button>
        ))}
      </div>

      {currentMusic && (
        <div className="space-y-2">
          <label className="block text-sm text-white/70">Volume</label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="flex-1 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-sm text-white/60 w-12">
              {Math.round(volume * 100)}%
            </span>
          </div>
        </div>
      )}
    </div>
  )
}