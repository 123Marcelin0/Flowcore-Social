"use client"

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { EnhancedLiquidGlass } from './enhanced-liquid-glass'

export interface TrackTemplate {
  id: string
  name: string
  type: 'video' | 'audio' | 'overlay'
  icon: string
  description: string
  defaultHeight: number
  color: string
}

export interface TimelineTrack {
  id: string
  name: string
  type: 'video' | 'audio' | 'overlay'
  height: number
  muted?: boolean
  solo?: boolean
  locked?: boolean
  visible?: boolean
  volume?: number
  clips: any[]
}

export interface TimelineTrackManagerProps {
  tracks: TimelineTrack[]
  onTrackAdd: (type: TimelineTrack['type'], template?: TrackTemplate) => void
  onTrackRemove: (trackId: string) => void
  onTrackReorder: (fromIndex: number, toIndex: number) => void
  onTrackUpdate: (trackId: string, updates: Partial<TimelineTrack>) => void
  onTrackDuplicate: (trackId: string) => void
  className?: string
}

const trackTemplates: TrackTemplate[] = [
  {
    id: 'video-main',
    name: 'Main Video',
    type: 'video',
    icon: '🎥',
    description: 'Primary video content track',
    defaultHeight: 80,
    color: '#3b82f6'
  },
  {
    id: 'video-overlay',
    name: 'Video Overlay',
    type: 'video',
    icon: '📹',
    description: 'Secondary video overlay track',
    defaultHeight: 60,
    color: '#1d4ed8'
  },
  {
    id: 'audio-music',
    name: 'Background Music',
    type: 'audio',
    icon: '🎵',
    description: 'Background music and soundtrack',
    defaultHeight: 50,
    color: '#10b981'
  },
  {
    id: 'audio-voice',
    name: 'Voice/Narration',
    type: 'audio',
    icon: '🎤',
    description: 'Voice over and narration',
    defaultHeight: 50,
    color: '#059669'
  },
  {
    id: 'audio-sfx',
    name: 'Sound Effects',
    type: 'audio',
    icon: '🔊',
    description: 'Sound effects and ambient audio',
    defaultHeight: 40,
    color: '#047857'
  },
  {
    id: 'text-title',
    name: 'Titles & Text',
    type: 'overlay',
    icon: '📝',
    description: 'Text overlays and titles',
    defaultHeight: 40,
    color: '#f59e0b'
  },
  {
    id: 'text-subtitle',
    name: 'Subtitles',
    type: 'overlay',
    icon: '💬',
    description: 'Subtitle and caption track',
    defaultHeight: 35,
    color: '#d97706'
  },
  {
    id: 'overlay-graphics',
    name: 'Graphics & Effects',
    type: 'overlay',
    icon: '✨',
    description: 'Visual effects and graphics',
    defaultHeight: 45,
    color: '#8b5cf6'
  }
]

export function TimelineTrackManager({
  tracks,
  onTrackAdd,
  onTrackRemove,
  onTrackReorder,
  onTrackUpdate,
  onTrackDuplicate,
  className
}: TimelineTrackManagerProps) {
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [draggedTrack, setDraggedTrack] = useState<string | null>(null)

  const handleTrackAdd = useCallback((template: TrackTemplate) => {
    onTrackAdd(template.type, template)
    setShowAddMenu(false)
  }, [onTrackAdd])

  const handleTrackMute = useCallback((trackId: string, muted: boolean) => {
    onTrackUpdate(trackId, { muted })
  }, [onTrackUpdate])

  const handleTrackSolo = useCallback((trackId: string, solo: boolean) => {
    // When soloing a track, unsolo all others
    if (solo) {
      tracks.forEach(track => {
        if (track.id !== trackId && track.solo) {
          onTrackUpdate(track.id, { solo: false })
        }
      })
    }
    onTrackUpdate(trackId, { solo })
  }, [tracks, onTrackUpdate])

  const handleTrackLock = useCallback((trackId: string, locked: boolean) => {
    onTrackUpdate(trackId, { locked })
  }, [onTrackUpdate])

  const handleTrackVisibility = useCallback((trackId: string, visible: boolean) => {
    onTrackUpdate(trackId, { visible })
  }, [onTrackUpdate])

  const handleVolumeChange = useCallback((trackId: string, volume: number) => {
    onTrackUpdate(trackId, { volume })
  }, [onTrackUpdate])

  const handleTrackRename = useCallback((trackId: string, name: string) => {
    onTrackUpdate(trackId, { name })
  }, [onTrackUpdate])

  return (
    <div className={cn("w-48 bg-black/20 border-r border-white/10 flex flex-col", className)}>
      {/* Header */}
      <div className="h-12 border-b border-white/10 flex items-center justify-between px-4">
        <span className="text-sm font-medium text-white/70">Tracks</span>
        <div className="relative">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white/70 hover:text-white/90 transition-all duration-200"
            title="Add Track"
          >
            +
          </button>
          
          {/* Add Track Menu */}
          <AnimatePresence>
            {showAddMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 top-8 z-50"
              >
                <EnhancedLiquidGlass
                  variant="modal"
                  intensity="premium"
                  className="w-64 max-h-80 overflow-y-auto"
                >
                  <div className="p-3">
                    <h3 className="text-sm font-semibold text-white/90 mb-3">Add Track</h3>
                    <div className="space-y-1">
                      {trackTemplates.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => handleTrackAdd(template)}
                          className="w-full p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-200 text-left"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{template.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-white/90 truncate">
                                {template.name}
                              </div>
                              <div className="text-xs text-white/60 truncate">
                                {template.description}
                              </div>
                            </div>
                            <div 
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: template.color }}
                            />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </EnhancedLiquidGlass>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Track List */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence>
          {tracks.map((track, index) => (
            <motion.div
              key={track.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className={cn(
                "border-b border-white/5 hover:bg-white/5 transition-colors",
                draggedTrack === track.id && "bg-white/10"
              )}
              style={{ height: track.height }}
            >
              <TrackControl
                track={track}
                index={index}
                onMute={(muted) => handleTrackMute(track.id, muted)}
                onSolo={(solo) => handleTrackSolo(track.id, solo)}
                onLock={(locked) => handleTrackLock(track.id, locked)}
                onVisibility={(visible) => handleTrackVisibility(track.id, visible)}
                onVolumeChange={(volume) => handleVolumeChange(track.id, volume)}
                onRename={(name) => handleTrackRename(track.id, name)}
                onRemove={() => onTrackRemove(track.id)}
                onDuplicate={() => onTrackDuplicate(track.id)}
                onDragStart={() => setDraggedTrack(track.id)}
                onDragEnd={() => setDraggedTrack(null)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Track Statistics */}
      <div className="p-3 border-t border-white/10 bg-black/10">
        <div className="text-xs text-white/60 space-y-1">
          <div className="flex justify-between">
            <span>Total Tracks:</span>
            <span>{tracks.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Video:</span>
            <span>{tracks.filter(t => t.type === 'video').length}</span>
          </div>
          <div className="flex justify-between">
            <span>Audio:</span>
            <span>{tracks.filter(t => t.type === 'audio').length}</span>
          </div>
          <div className="flex justify-between">
            <span>Overlay:</span>
            <span>{tracks.filter(t => t.type === 'overlay').length}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Individual Track Control Component
interface TrackControlProps {
  track: TimelineTrack
  index: number
  onMute: (muted: boolean) => void
  onSolo: (solo: boolean) => void
  onLock: (locked: boolean) => void
  onVisibility: (visible: boolean) => void
  onVolumeChange: (volume: number) => void
  onRename: (name: string) => void
  onRemove: () => void
  onDuplicate: () => void
  onDragStart: () => void
  onDragEnd: () => void
}

function TrackControl({
  track,
  index,
  onMute,
  onSolo,
  onLock,
  onVisibility,
  onVolumeChange,
  onRename,
  onRemove,
  onDuplicate,
  onDragStart,
  onDragEnd
}: TrackControlProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(track.name)
  const [showControls, setShowControls] = useState(false)

  const handleNameSubmit = useCallback(() => {
    if (editName.trim() && editName !== track.name) {
      onRename(editName.trim())
    }
    setIsEditing(false)
  }, [editName, track.name, onRename])

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSubmit()
    } else if (e.key === 'Escape') {
      setEditName(track.name)
      setIsEditing(false)
    }
  }, [handleNameSubmit, track.name])

  return (
    <div 
      className="h-full flex flex-col p-2 relative group"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Track Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className={cn(
          "w-3 h-3 rounded-full flex-shrink-0",
          track.type === 'video' && "bg-blue-500",
          track.type === 'audio' && "bg-green-500",
          track.type === 'overlay' && "bg-purple-500"
        )} />
        
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={handleKeyPress}
            className="flex-1 bg-white/10 border border-white/20 rounded px-2 py-1 text-xs text-white/90 focus:outline-none focus:border-white/40"
            autoFocus
          />
        ) : (
          <span 
            className="flex-1 text-xs font-medium text-white/80 truncate cursor-pointer hover:text-white/90"
            onDoubleClick={() => setIsEditing(true)}
            title={track.name}
          >
            {track.name}
          </span>
        )}
      </div>

      {/* Primary Controls */}
      <div className="flex items-center gap-1 mb-2">
        <button
          onClick={() => onMute(!track.muted)}
          className={cn(
            "w-5 h-5 rounded text-xs font-medium transition-all duration-200",
            track.muted 
              ? "bg-red-500/20 text-red-400 border border-red-500/40" 
              : "bg-white/10 text-white/60 hover:bg-white/20 border border-white/20"
          )}
          title={track.muted ? "Unmute" : "Mute"}
        >
          M
        </button>
        
        <button
          onClick={() => onSolo(!track.solo)}
          className={cn(
            "w-5 h-5 rounded text-xs font-medium transition-all duration-200",
            track.solo 
              ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40" 
              : "bg-white/10 text-white/60 hover:bg-white/20 border border-white/20"
          )}
          title={track.solo ? "Unsolo" : "Solo"}
        >
          S
        </button>

        <button
          onClick={() => onLock(!track.locked)}
          className={cn(
            "w-5 h-5 rounded text-xs font-medium transition-all duration-200",
            track.locked 
              ? "bg-orange-500/20 text-orange-400 border border-orange-500/40" 
              : "bg-white/10 text-white/60 hover:bg-white/20 border border-white/20"
          )}
          title={track.locked ? "Unlock" : "Lock"}
        >
          🔒
        </button>

        <button
          onClick={() => onVisibility(!track.visible)}
          className={cn(
            "w-5 h-5 rounded text-xs font-medium transition-all duration-200",
            track.visible === false
              ? "bg-gray-500/20 text-gray-400 border border-gray-500/40" 
              : "bg-white/10 text-white/60 hover:bg-white/20 border border-white/20"
          )}
          title={track.visible === false ? "Show" : "Hide"}
        >
          👁
        </button>
      </div>

      {/* Volume Control (for audio tracks) */}
      {track.type === 'audio' && (
        <div className="mb-2">
          <div className="flex items-center gap-1">
            <span className="text-xs text-white/60 w-4">Vol</span>
            <input
              type="range"
              min="0"
              max="100"
              value={track.volume || 100}
              onChange={(e) => onVolumeChange(parseInt(e.target.value))}
              className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #10b981 0%, #10b981 ${track.volume || 100}%, rgba(255,255,255,0.1) ${track.volume || 100}%, rgba(255,255,255,0.1) 100%)`
              }}
            />
            <span className="text-xs text-white/60 w-6 text-right">
              {track.volume || 100}
            </span>
          </div>
        </div>
      )}

      {/* Extended Controls (shown on hover) */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-1 overflow-hidden"
          >
            <button
              onClick={onDuplicate}
              className="w-5 h-5 rounded text-xs bg-white/10 text-white/60 hover:bg-white/20 border border-white/20 transition-all duration-200"
              title="Duplicate Track"
            >
              📋
            </button>
            
            <button
              onClick={onRemove}
              className="w-5 h-5 rounded text-xs bg-white/10 text-white/60 hover:bg-red-500/20 hover:text-red-400 border border-white/20 hover:border-red-500/40 transition-all duration-200"
              title="Remove Track"
            >
              🗑
            </button>
            
            <div 
              className="w-5 h-5 rounded text-xs bg-white/10 text-white/60 hover:bg-white/20 border border-white/20 transition-all duration-200 cursor-move flex items-center justify-center"
              title="Drag to Reorder"
              onMouseDown={onDragStart}
              onMouseUp={onDragEnd}
            >
              ⋮⋮
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Track Info */}
      <div className="mt-auto pt-1">
        <div className="text-xs text-white/50">
          {track.clips.length} clip{track.clips.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  )
}