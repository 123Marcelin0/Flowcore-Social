"use client"

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { motion, useDragControls, PanInfo } from 'framer-motion'
import { cn } from '@/lib/utils'
import { EnhancedLiquidGlass } from './enhanced-liquid-glass'

export interface TimelineClip {
  id: string
  type: 'video' | 'audio' | 'image' | 'text'
  name: string
  startTime: number
  duration: number
  trackId: string
  thumbnailUrl?: string
  color?: string
  locked?: boolean
  muted?: boolean
  volume?: number
  opacity?: number
  effects?: ClipEffect[]
  transitions?: ClipTransition[]
}

export interface ClipEffect {
  id: string
  type: 'blur' | 'brightness' | 'contrast' | 'saturation' | 'fade'
  intensity: number
  startTime?: number
  duration?: number
}

export interface ClipTransition {
  id: string
  type: 'fade' | 'slide' | 'zoom' | 'dissolve'
  duration: number
  position: 'in' | 'out'
}

export interface ClipManipulatorProps {
  clip: TimelineClip
  track: { id: string; height: number; type: string }
  pixelsPerSecond: number
  onMove: (clipId: string, newStartTime: number, newTrackId: string) => void
  onResize: (clipId: string, newDuration: number, resizeType: 'start' | 'end') => void
  onSplit: (clipId: string, splitTime: number) => void
  onMerge: (clipId: string, targetClipId: string) => void
  onUpdate: (clipId: string, updates: Partial<TimelineClip>) => void
  onSelect: (clipId: string) => void
  onContextMenu: (clipId: string, x: number, y: number) => void
  snapTime: (time: number) => number
  showWaveforms: boolean
  isSelected: boolean
  onDragStart: () => void
  onDragEnd: () => void
}

export function TimelineClipManipulator({
  clip,
  track,
  pixelsPerSecond,
  onMove,
  onResize,
  onSplit,
  onMerge,
  onUpdate,
  onSelect,
  onContextMenu,
  snapTime,
  showWaveforms,
  isSelected,
  onDragStart,
  onDragEnd
}: ClipManipulatorProps) {
  const dragControls = useDragControls()
  const clipRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState<'start' | 'end' | null>(null)
  const [showSplitLine, setShowSplitLine] = useState(false)
  const [splitPosition, setSplitPosition] = useState(0)
  const [hoverTime, setHoverTime] = useState(0)

  const clipWidth = clip.duration * pixelsPerSecond
  const clipLeft = clip.startTime * pixelsPerSecond
  const minClipWidth = 20 // Minimum clip width in pixels

  // Handle clip dragging
  const handleDrag = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const newStartTime = snapTime(Math.max(0, (clipLeft + info.offset.x) / pixelsPerSecond))
    onMove(clip.id, newStartTime, track.id)
  }, [clip.id, clipLeft, pixelsPerSecond, snapTime, onMove, track.id])

  const handleDragStart = useCallback(() => {
    setIsDragging(true)
    onDragStart()
  }, [onDragStart])

  const handleDragEnd = useCallback(() => {
    setIsDragging(false)
    onDragEnd()
  }, [onDragEnd])

  // Handle resize operations
  const handleResizeStart = useCallback((resizeType: 'start' | 'end', event: React.MouseEvent) => {
    event.stopPropagation()
    setIsResizing(resizeType)
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!clipRef.current) return
      
      const rect = clipRef.current.getBoundingClientRect()
      const relativeX = e.clientX - rect.left
      
      if (resizeType === 'end') {
        const newDuration = Math.max(0.1, relativeX / pixelsPerSecond)
        onResize(clip.id, snapTime(newDuration), 'end')
      } else {
        const newStartTime = snapTime(Math.max(0, (clipLeft + relativeX) / pixelsPerSecond))
        const newDuration = Math.max(0.1, clip.duration - (newStartTime - clip.startTime))
        onMove(clip.id, newStartTime, track.id)
        onResize(clip.id, snapTime(newDuration), 'start')
      }
    }
    
    const handleMouseUp = () => {
      setIsResizing(null)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [clip.id, clip.startTime, clip.duration, clipLeft, pixelsPerSecond, snapTime, onMove, onResize, track.id])

  // Handle split operation
  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!clipRef.current || clip.locked) return
    
    const rect = clipRef.current.getBoundingClientRect()
    const relativeX = event.clientX - rect.left
    const timeInClip = relativeX / pixelsPerSecond
    
    setHoverTime(timeInClip)
    setSplitPosition(relativeX)
  }, [pixelsPerSecond, clip.locked])

  const handleSplit = useCallback((event: React.MouseEvent) => {
    if (event.altKey && !clip.locked) {
      event.stopPropagation()
      const splitTime = clip.startTime + hoverTime
      onSplit(clip.id, snapTime(splitTime))
    }
  }, [clip.id, clip.startTime, clip.locked, hoverTime, snapTime, onSplit])

  // Handle context menu
  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault()
    onContextMenu(clip.id, event.clientX, event.clientY)
  }, [clip.id, onContextMenu])

  // Handle selection
  const handleClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation()
    onSelect(clip.id)
  }, [clip.id, onSelect])

  // Get clip color based on type
  const getClipColor = useCallback(() => {
    if (clip.color) return clip.color
    
    switch (clip.type) {
      case 'video': return '#3b82f6'
      case 'audio': return '#10b981'
      case 'image': return '#8b5cf6'
      case 'text': return '#f59e0b'
      default: return '#6b7280'
    }
  }, [clip.type, clip.color])

  return (
    <motion.div
      ref={clipRef}
      drag={!clip.locked && !isResizing}
      dragControls={dragControls}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0}
      onDrag={handleDrag}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setShowSplitLine(true)}
      onMouseLeave={() => setShowSplitLine(false)}
      className={cn(
        "absolute top-2 bottom-2 rounded-lg cursor-move select-none group",
        "border-2 transition-all duration-200 overflow-hidden",
        isDragging && "z-20 shadow-2xl scale-105",
        isSelected && "ring-2 ring-white/50 ring-offset-2 ring-offset-transparent",
        clip.locked && "cursor-not-allowed opacity-60",
        clip.muted && "opacity-50"
      )}
      style={{
        left: clipLeft,
        width: Math.max(minClipWidth, clipWidth),
        background: `linear-gradient(135deg, ${getClipColor()}CC 0%, ${getClipColor()}AA 100%)`,
        borderColor: isSelected ? '#ffffff80' : `${getClipColor()}80`
      }}
      whileHover={{ scale: clip.locked ? 1 : 1.02 }}
      whileDrag={{ scale: 1.05, zIndex: 30 }}
      animate={{
        opacity: clip.opacity || 1,
        scale: isSelected ? 1.02 : 1
      }}
    >
      {/* Clip Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="w-full h-full bg-gradient-to-r from-white/20 via-transparent to-white/20" />
      </div>

      {/* Clip Content */}
      <div className="relative h-full flex items-center px-2 z-10">
        {/* Thumbnail */}
        {clip.thumbnailUrl && (
          <img 
            src={clip.thumbnailUrl} 
            alt={clip.name}
            className="w-6 h-6 rounded object-cover mr-2 flex-shrink-0 border border-white/20"
          />
        )}
        
        {/* Clip Name */}
        <span className="text-xs font-medium text-white truncate flex-1">
          {clip.name}
        </span>

        {/* Clip Duration */}
        <span className="text-xs text-white/70 ml-2 flex-shrink-0">
          {clip.duration.toFixed(1)}s
        </span>
      </div>

      {/* Waveform visualization for audio clips */}
      {showWaveforms && clip.type === 'audio' && (
        <div className="absolute inset-x-1 bottom-1 h-4 flex items-end gap-px z-10">
          {Array.from({ length: Math.floor(clipWidth / 3) }).map((_, i) => (
            <div
              key={i}
              className="bg-white/60 rounded-sm"
              style={{ 
                height: `${Math.random() * 100}%`,
                width: '2px'
              }}
            />
          ))}
        </div>
      )}

      {/* Effects Indicators */}
      {clip.effects && clip.effects.length > 0 && (
        <div className="absolute top-1 right-1 flex gap-1">
          {clip.effects.slice(0, 3).map((effect, i) => (
            <div
              key={effect.id}
              className="w-2 h-2 rounded-full bg-yellow-400/80"
              title={`Effect: ${effect.type}`}
            />
          ))}
          {clip.effects.length > 3 && (
            <div className="w-2 h-2 rounded-full bg-yellow-400/80 text-xs flex items-center justify-center">
              +
            </div>
          )}
        </div>
      )}

      {/* Volume Indicator for Audio */}
      {clip.type === 'audio' && clip.volume !== undefined && (
        <div className="absolute bottom-1 left-1 text-xs text-white/70">
          {clip.volume}%
        </div>
      )}

      {/* Resize Handles */}
      {!clip.locked && (
        <>
          {/* Left resize handle */}
          <div 
            className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity z-20"
            onMouseDown={(e) => handleResizeStart('start', e)}
            title="Resize clip start"
          >
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-4 bg-white/60 rounded-r" />
          </div>
          
          {/* Right resize handle */}
          <div 
            className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity z-20"
            onMouseDown={(e) => handleResizeStart('end', e)}
            title="Resize clip end"
          >
            <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-4 bg-white/60 rounded-l" />
          </div>
        </>
      )}

      {/* Split Line Indicator */}
      {showSplitLine && !clip.locked && hoverTime > 0.5 && hoverTime < clip.duration - 0.5 && (
        <div 
          className="absolute top-0 bottom-0 w-px bg-red-400 z-30 pointer-events-none"
          style={{ left: splitPosition }}
        >
          <div className="absolute -top-1 -left-1 w-2 h-2 bg-red-400 rounded-full" />
          <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-red-400 rounded-full" />
        </div>
      )}

      {/* Transition Indicators */}
      {clip.transitions && (
        <>
          {clip.transitions.find(t => t.position === 'in') && (
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-r from-green-400 to-transparent opacity-60" />
          )}
          {clip.transitions.find(t => t.position === 'out') && (
            <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-l from-green-400 to-transparent opacity-60" />
          )}
        </>
      )}

      {/* Selection Indicator */}
      {isSelected && (
        <div className="absolute inset-0 border-2 border-white/50 rounded-lg pointer-events-none animate-pulse" />
      )}

      {/* Locked Indicator */}
      {clip.locked && (
        <div className="absolute top-1 left-1 text-xs">
          🔒
        </div>
      )}

      {/* Muted Indicator */}
      {clip.muted && (
        <div className="absolute top-1 left-6 text-xs">
          🔇
        </div>
      )}
    </motion.div>
  )
}

// Clip Properties Panel Component
export interface ClipPropertiesPanelProps {
  clip: TimelineClip | null
  onUpdate: (clipId: string, updates: Partial<TimelineClip>) => void
  onClose: () => void
  className?: string
}

export function ClipPropertiesPanel({
  clip,
  onUpdate,
  onClose,
  className
}: ClipPropertiesPanelProps) {
  const [localClip, setLocalClip] = useState<TimelineClip | null>(clip)

  useEffect(() => {
    setLocalClip(clip)
  }, [clip])

  const handleUpdate = useCallback((updates: Partial<TimelineClip>) => {
    if (!clip) return
    
    const newClip = { ...clip, ...updates }
    setLocalClip(newClip)
    onUpdate(clip.id, updates)
  }, [clip, onUpdate])

  if (!localClip) return null

  return (
    <EnhancedLiquidGlass
      variant="modal"
      intensity="premium"
      className={cn("w-80 max-h-96 overflow-y-auto", className)}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white/90">Clip Properties</h3>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white/70 hover:text-white/90 transition-all duration-200"
          >
            ×
          </button>
        </div>

        {/* Basic Properties */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1">Name</label>
            <input
              type="text"
              value={localClip.name}
              onChange={(e) => handleUpdate({ name: e.target.value })}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white/90 focus:outline-none focus:border-white/40"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">Start Time</label>
              <input
                type="number"
                value={localClip.startTime}
                onChange={(e) => handleUpdate({ startTime: parseFloat(e.target.value) || 0 })}
                step="0.1"
                min="0"
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white/90 focus:outline-none focus:border-white/40"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">Duration</label>
              <input
                type="number"
                value={localClip.duration}
                onChange={(e) => handleUpdate({ duration: Math.max(0.1, parseFloat(e.target.value) || 0.1) })}
                step="0.1"
                min="0.1"
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white/90 focus:outline-none focus:border-white/40"
              />
            </div>
          </div>

          {/* Audio Properties */}
          {localClip.type === 'audio' && (
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">Volume</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={localClip.volume || 100}
                  onChange={(e) => handleUpdate({ volume: parseInt(e.target.value) })}
                  className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm text-white/70 w-12 text-right">
                  {localClip.volume || 100}%
                </span>
              </div>
            </div>
          )}

          {/* Visual Properties */}
          {(localClip.type === 'video' || localClip.type === 'image') && (
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">Opacity</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={(localClip.opacity || 1) * 100}
                  onChange={(e) => handleUpdate({ opacity: parseInt(e.target.value) / 100 })}
                  className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm text-white/70 w-12 text-right">
                  {Math.round((localClip.opacity || 1) * 100)}%
                </span>
              </div>
            </div>
          )}

          {/* Toggles */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={localClip.locked || false}
                onChange={(e) => handleUpdate({ locked: e.target.checked })}
                className="w-4 h-4 rounded border border-white/20 bg-white/10 checked:bg-blue-500"
              />
              <span className="text-sm text-white/70">Locked</span>
            </label>
            
            {localClip.type === 'audio' && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localClip.muted || false}
                  onChange={(e) => handleUpdate({ muted: e.target.checked })}
                  className="w-4 h-4 rounded border border-white/20 bg-white/10 checked:bg-red-500"
                />
                <span className="text-sm text-white/70">Muted</span>
              </label>
            )}
          </div>

          {/* Effects Count */}
          {localClip.effects && localClip.effects.length > 0 && (
            <div className="p-3 bg-white/5 rounded-lg border border-white/10">
              <div className="text-sm text-white/70">
                Effects Applied: {localClip.effects.length}
              </div>
              <div className="text-xs text-white/50 mt-1">
                {localClip.effects.map(e => e.type).join(', ')}
              </div>
            </div>
          )}
        </div>
      </div>
    </EnhancedLiquidGlass>
  )
}