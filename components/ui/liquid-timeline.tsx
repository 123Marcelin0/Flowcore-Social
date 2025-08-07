"use client"

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { motion, MotionProps, useDragControls, PanInfo } from 'framer-motion'
import { cn } from '@/lib/utils'
import { EnhancedLiquidGlass } from './enhanced-liquid-glass'
import { TimelineTrackManager, TrackTemplate } from './timeline-track-manager'
import { TimelineClipManipulator, ClipPropertiesPanel } from './timeline-clip-manipulator'

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
  effects?: any[]
  transitions?: any[]
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
  clips: TimelineClip[]
}

export interface LiquidTimelineProps extends Omit<MotionProps, 'onDrag'> {
  tracks: TimelineTrack[]
  duration: number
  currentTime: number
  zoom: number
  onTimeChange: (time: number) => void
  onZoomChange: (zoom: number) => void
  onClipMove: (clipId: string, newStartTime: number, newTrackId: string) => void
  onClipResize: (clipId: string, newDuration: number, resizeType: 'start' | 'end') => void
  onClipSplit: (clipId: string, splitTime: number) => void
  onClipMerge: (clipId: string, targetClipId: string) => void
  onClipUpdate: (clipId: string, updates: Partial<TimelineClip>) => void
  onTrackAdd: (type: TimelineTrack['type'], template?: TrackTemplate) => void
  onTrackRemove: (trackId: string) => void
  onTrackReorder: (fromIndex: number, toIndex: number) => void
  onTrackUpdate: (trackId: string, updates: Partial<TimelineTrack>) => void
  onTrackDuplicate: (trackId: string) => void
  onPreviewUpdate?: (time: number) => void
  className?: string
  height?: number
  showWaveforms?: boolean
  snapToGrid?: boolean
  gridSize?: number
}

export function LiquidTimeline({
  tracks,
  duration,
  currentTime,
  zoom,
  onTimeChange,
  onZoomChange,
  onClipMove,
  onClipResize,
  onClipSplit,
  onClipMerge,
  onClipUpdate,
  onTrackAdd,
  onTrackRemove,
  onTrackReorder,
  onTrackUpdate,
  onTrackDuplicate,
  onPreviewUpdate,
  className,
  height = 400,
  showWaveforms = false,
  snapToGrid = true,
  gridSize = 1,
  ...motionProps
}: LiquidTimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [draggedClip, setDraggedClip] = useState<string | null>(null)
  const [playheadPosition, setPlayheadPosition] = useState(0)
  const [selectedClip, setSelectedClip] = useState<string | null>(null)
  const [showClipProperties, setShowClipProperties] = useState(false)

  // Calculate pixel per second based on zoom
  const pixelsPerSecond = zoom * 20

  // Update playhead position when currentTime changes
  useEffect(() => {
    setPlayheadPosition(currentTime * pixelsPerSecond)
  }, [currentTime, pixelsPerSecond])

  // Handle timeline click to set current time
  const handleTimelineClick = useCallback((event: React.MouseEvent) => {
    if (!timelineRef.current || isDragging) return
    
    const rect = timelineRef.current.getBoundingClientRect()
    const x = event.clientX - rect.left - 200 // Account for track headers
    const time = Math.max(0, Math.min(duration, x / pixelsPerSecond))
    
    onTimeChange(time)
    onPreviewUpdate?.(time)
  }, [duration, pixelsPerSecond, onTimeChange, onPreviewUpdate, isDragging])

  // Handle zoom with mouse wheel
  const handleWheel = useCallback((event: React.WheelEvent) => {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault()
      const zoomDelta = event.deltaY > 0 ? -0.1 : 0.1
      const newZoom = Math.max(0.1, Math.min(5, zoom + zoomDelta))
      onZoomChange(newZoom)
    }
  }, [zoom, onZoomChange])

  // Snap time to grid if enabled
  const snapTime = useCallback((time: number) => {
    if (!snapToGrid) return time
    return Math.round(time / gridSize) * gridSize
  }, [snapToGrid, gridSize])

  return (
    <EnhancedLiquidGlass
      variant="timeline"
      intensity="premium"
      animation="hover"
      className={cn("w-full overflow-hidden", className)}
      style={{ height }}
      {...motionProps}
    >
      {/* Timeline Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-white/90">Timeline</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/60">Zoom:</span>
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={zoom}
              onChange={(e) => onZoomChange(parseFloat(e.target.value))}
              className="w-20 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-sm text-white/60 w-8">{zoom.toFixed(1)}x</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-white/60">
            {tracks.length} track{tracks.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Timeline Content */}
      <div className="flex h-full">
        {/* Track Manager */}
        <TimelineTrackManager
          tracks={tracks}
          onTrackAdd={onTrackAdd}
          onTrackRemove={onTrackRemove}
          onTrackReorder={onTrackReorder}
          onTrackUpdate={onTrackUpdate}
          onTrackDuplicate={onTrackDuplicate}
        />

        {/* Timeline Area */}
        <div 
          ref={timelineRef}
          className="flex-1 relative overflow-x-auto overflow-y-hidden"
          onClick={handleTimelineClick}
          onWheel={handleWheel}
        >
          {/* Time Ruler */}
          <TimeRuler
            duration={duration}
            pixelsPerSecond={pixelsPerSecond}
            currentTime={currentTime}
          />

          {/* Playhead */}
          <motion.div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
            style={{ left: playheadPosition }}
            initial={false}
            animate={{ left: playheadPosition }}
            transition={{ type: "tween", duration: 0.1 }}
          >
            <div className="absolute -top-2 -left-2 w-4 h-4 bg-red-500 rounded-full shadow-lg" />
          </motion.div>

          {/* Grid Lines */}
          {snapToGrid && (
            <div className="absolute inset-0 pointer-events-none">
              {Array.from({ length: Math.ceil(duration / gridSize) }).map((_, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 w-px bg-white/5"
                  style={{ left: i * gridSize * pixelsPerSecond }}
                />
              ))}
            </div>
          )}

          {/* Tracks */}
          <div className="relative">
            {tracks.map((track, index) => (
              <TimelineTrackComponent
                key={track.id}
                track={track}
                pixelsPerSecond={pixelsPerSecond}
                onClipMove={onClipMove}
                onClipResize={onClipResize}
                onClipSplit={onClipSplit}
                onClipMerge={onClipMerge}
                onClipUpdate={onClipUpdate}
                snapTime={snapTime}
                showWaveforms={showWaveforms}
                selectedClip={selectedClip}
                onClipSelect={setSelectedClip}
                onClipContextMenu={(clipId, x, y) => {
                  setSelectedClip(clipId)
                  setShowClipProperties(true)
                }}
                onDragStart={() => setIsDragging(true)}
                onDragEnd={() => setIsDragging(false)}
                onClipDragStart={setDraggedClip}
                onClipDragEnd={() => setDraggedClip(null)}
                style={{ top: 48 + index * track.height }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Clip Properties Panel */}
      {showClipProperties && selectedClip && (
        <div className="absolute top-4 right-4 z-50">
          <ClipPropertiesPanel
            clip={tracks.flatMap(t => t.clips).find(c => c.id === selectedClip) || null}
            onUpdate={onClipUpdate}
            onClose={() => {
              setShowClipProperties(false)
              setSelectedClip(null)
            }}
          />
        </div>
      )}
    </EnhancedLiquidGlass>
  )
}



// Time Ruler Component
interface TimeRulerProps {
  duration: number
  pixelsPerSecond: number
  currentTime: number
}

function TimeRuler({ duration, pixelsPerSecond, currentTime }: TimeRulerProps) {
  const majorTickInterval = duration > 60 ? 10 : duration > 30 ? 5 : 1
  const minorTickInterval = majorTickInterval / 5

  return (
    <div className="h-12 bg-black/10 border-b border-white/10 relative">
      {/* Major ticks */}
      {Array.from({ length: Math.ceil(duration / majorTickInterval) + 1 }).map((_, i) => {
        const time = i * majorTickInterval
        const left = time * pixelsPerSecond
        
        return (
          <div key={`major-${i}`} className="absolute top-0 bottom-0" style={{ left }}>
            <div className="w-px h-full bg-white/20" />
            <div className="absolute top-1 left-1 text-xs text-white/60">
              {Math.floor(time / 60)}:{(time % 60).toFixed(0).padStart(2, '0')}
            </div>
          </div>
        )
      })}
      
      {/* Minor ticks */}
      {Array.from({ length: Math.ceil(duration / minorTickInterval) + 1 }).map((_, i) => {
        const time = i * minorTickInterval
        const left = time * pixelsPerSecond
        
        if (time % majorTickInterval === 0) return null
        
        return (
          <div 
            key={`minor-${i}`} 
            className="absolute top-6 w-px h-6 bg-white/10" 
            style={{ left }} 
          />
        )
      })}
    </div>
  )
}

// Timeline Track Component
interface TimelineTrackComponentProps {
  track: TimelineTrack
  pixelsPerSecond: number
  onClipMove: (clipId: string, newStartTime: number, newTrackId: string) => void
  onClipResize: (clipId: string, newDuration: number, resizeType: 'start' | 'end') => void
  onClipSplit: (clipId: string, splitTime: number) => void
  onClipMerge: (clipId: string, targetClipId: string) => void
  onClipUpdate: (clipId: string, updates: Partial<TimelineClip>) => void
  snapTime: (time: number) => number
  showWaveforms: boolean
  selectedClip: string | null
  onClipSelect: (clipId: string) => void
  onClipContextMenu: (clipId: string, x: number, y: number) => void
  onDragStart: () => void
  onDragEnd: () => void
  onClipDragStart: (clipId: string) => void
  onClipDragEnd: () => void
  style?: React.CSSProperties
}

function TimelineTrackComponent({
  track,
  pixelsPerSecond,
  onClipMove,
  onClipResize,
  onClipSplit,
  onClipMerge,
  onClipUpdate,
  snapTime,
  showWaveforms,
  selectedClip,
  onClipSelect,
  onClipContextMenu,
  onDragStart,
  onDragEnd,
  onClipDragStart,
  onClipDragEnd,
  style
}: TimelineTrackComponentProps) {
  return (
    <div 
      className="absolute left-0 right-0 border-b border-white/5 bg-black/5"
      style={{ ...style, height: track.height }}
    >
      {track.clips.map((clip) => (
        <TimelineClipManipulator
          key={clip.id}
          clip={clip}
          track={track}
          pixelsPerSecond={pixelsPerSecond}
          onMove={onClipMove}
          onResize={onClipResize}
          onSplit={onClipSplit}
          onMerge={onClipMerge}
          onUpdate={onClipUpdate}
          onSelect={onClipSelect}
          onContextMenu={onClipContextMenu}
          snapTime={snapTime}
          showWaveforms={showWaveforms}
          isSelected={selectedClip === clip.id}
          onDragStart={() => {
            onDragStart()
            onClipDragStart(clip.id)
          }}
          onDragEnd={() => {
            onDragEnd()
            onClipDragEnd()
          }}
        />
      ))}
    </div>
  )
}

