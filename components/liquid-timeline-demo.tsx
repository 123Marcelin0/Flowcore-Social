"use client"

import React, { useState } from 'react'
import { LiquidTimeline, TimelineTrack, TimelineClip } from './ui/liquid-timeline'
import { TrackTemplate } from './ui/timeline-track-manager'

// Sample data for demonstration
const initialTracks: TimelineTrack[] = [
  {
    id: 'video-1',
    name: 'Main Video',
    type: 'video',
    height: 80,
    visible: true,
    volume: 100,
    clips: [
      {
        id: 'clip-1',
        type: 'video',
        name: 'Intro Scene',
        startTime: 0,
        duration: 5,
        trackId: 'video-1',
        thumbnailUrl: '/placeholder.jpg',
        color: '#3b82f6'
      },
      {
        id: 'clip-2',
        type: 'video',
        name: 'Main Content',
        startTime: 6,
        duration: 15,
        trackId: 'video-1',
        thumbnailUrl: '/placeholder.jpg',
        color: '#3b82f6'
      }
    ]
  },
  {
    id: 'audio-1',
    name: 'Background Music',
    type: 'audio',
    height: 60,
    visible: true,
    volume: 75,
    clips: [
      {
        id: 'clip-3',
        type: 'audio',
        name: 'Background Track',
        startTime: 0,
        duration: 25,
        trackId: 'audio-1',
        color: '#10b981'
      }
    ]
  },
  {
    id: 'overlay-1',
    name: 'Text Overlays',
    type: 'overlay',
    height: 50,
    visible: true,
    volume: 100,
    clips: [
      {
        id: 'clip-4',
        type: 'text',
        name: 'Title Text',
        startTime: 2,
        duration: 3,
        trackId: 'overlay-1',
        color: '#f59e0b'
      },
      {
        id: 'clip-5',
        type: 'text',
        name: 'End Credits',
        startTime: 20,
        duration: 5,
        trackId: 'overlay-1',
        color: '#f59e0b'
      }
    ]
  }
]

export function LiquidTimelineDemo() {
  const [tracks, setTracks] = useState<TimelineTrack[]>(initialTracks)
  const [currentTime, setCurrentTime] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [duration] = useState(30) // 30 seconds total

  const handleClipMove = (clipId: string, newStartTime: number, newTrackId: string) => {
    setTracks(prevTracks => 
      prevTracks.map(track => ({
        ...track,
        clips: track.clips.map(clip => 
          clip.id === clipId 
            ? { ...clip, startTime: newStartTime, trackId: newTrackId }
            : clip
        ).filter(clip => clip.trackId === track.id)
      })).map(track => 
        track.id === newTrackId 
          ? {
              ...track,
              clips: [
                ...track.clips,
                ...prevTracks.flatMap(t => t.clips).find(c => c.id === clipId && c.trackId !== newTrackId) 
                  ? [{ ...prevTracks.flatMap(t => t.clips).find(c => c.id === clipId)!, trackId: newTrackId }]
                  : []
              ]
            }
          : track
      )
    )
  }

  const handleClipResize = (clipId: string, newDuration: number, resizeType: 'start' | 'end') => {
    setTracks(prevTracks =>
      prevTracks.map(track => ({
        ...track,
        clips: track.clips.map(clip =>
          clip.id === clipId ? { ...clip, duration: Math.max(0.1, newDuration) } : clip
        )
      }))
    )
  }

  const handleClipSplit = (clipId: string, splitTime: number) => {
    setTracks(prevTracks =>
      prevTracks.map(track => ({
        ...track,
        clips: track.clips.flatMap(clip => {
          if (clip.id !== clipId) return [clip]
          
          const splitPoint = splitTime - clip.startTime
          if (splitPoint <= 0.1 || splitPoint >= clip.duration - 0.1) return [clip]
          
          return [
            {
              ...clip,
              id: `${clip.id}-part1`,
              duration: splitPoint,
              name: `${clip.name} (1)`
            },
            {
              ...clip,
              id: `${clip.id}-part2`,
              startTime: splitTime,
              duration: clip.duration - splitPoint,
              name: `${clip.name} (2)`
            }
          ]
        })
      }))
    )
  }

  const handleClipMerge = (clipId: string, targetClipId: string) => {
    // Simple merge implementation - combine adjacent clips
    console.log('Merge clips:', clipId, targetClipId)
  }

  const handleClipUpdate = (clipId: string, updates: Partial<TimelineClip>) => {
    setTracks(prevTracks =>
      prevTracks.map(track => ({
        ...track,
        clips: track.clips.map(clip =>
          clip.id === clipId ? { ...clip, ...updates } : clip
        )
      }))
    )
  }

  const handleTrackAdd = (type: TimelineTrack['type'], template?: TrackTemplate) => {
    const newTrack: TimelineTrack = {
      id: `${type}-${Date.now()}`,
      name: template?.name || `New ${type.charAt(0).toUpperCase() + type.slice(1)} Track`,
      type,
      height: template?.defaultHeight || (type === 'video' ? 80 : type === 'audio' ? 60 : 50),
      visible: true,
      volume: type === 'audio' ? 100 : undefined,
      clips: []
    }
    setTracks(prev => [...prev, newTrack])
  }

  const handleTrackRemove = (trackId: string) => {
    setTracks(prev => prev.filter(track => track.id !== trackId))
  }

  const handleTrackReorder = (fromIndex: number, toIndex: number) => {
    setTracks(prev => {
      const newTracks = [...prev]
      const [movedTrack] = newTracks.splice(fromIndex, 1)
      newTracks.splice(toIndex, 0, movedTrack)
      return newTracks
    })
  }

  const handleTrackUpdate = (trackId: string, updates: Partial<TimelineTrack>) => {
    setTracks(prev =>
      prev.map(track =>
        track.id === trackId ? { ...track, ...updates } : track
      )
    )
  }

  const handleTrackDuplicate = (trackId: string) => {
    const trackToDuplicate = tracks.find(t => t.id === trackId)
    if (trackToDuplicate) {
      const newTrack: TimelineTrack = {
        ...trackToDuplicate,
        id: `${trackToDuplicate.type}-${Date.now()}`,
        name: `${trackToDuplicate.name} Copy`,
        clips: trackToDuplicate.clips.map(clip => ({
          ...clip,
          id: `${clip.id}-copy-${Date.now()}`,
          trackId: `${trackToDuplicate.type}-${Date.now()}`
        }))
      }
      setTracks(prev => [...prev, newTrack])
    }
  }

  const handlePreviewUpdate = (time: number) => {
    console.log('Preview update:', time)
    // Here you would update your video preview
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white/90 mb-2">
          Liquid Timeline Demo
        </h2>
        <p className="text-white/60">
          Interactive timeline editor with liquid glass design
        </p>
      </div>

      {/* Timeline Controls */}
      <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCurrentTime(Math.max(0, currentTime - 1))}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-all duration-200"
          >
            ← 1s
          </button>
          <button
            onClick={() => setCurrentTime(0)}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-all duration-200"
          >
            Reset
          </button>
          <button
            onClick={() => setCurrentTime(Math.min(duration, currentTime + 1))}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-all duration-200"
          >
            1s →
          </button>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-sm text-white/60">
            Time: {currentTime.toFixed(1)}s / {duration}s
          </span>
          <span className="text-sm text-white/60">
            Tracks: {tracks.length}
          </span>
        </div>
      </div>

      {/* Timeline Component */}
      <LiquidTimeline
        tracks={tracks}
        duration={duration}
        currentTime={currentTime}
        zoom={zoom}
        onTimeChange={setCurrentTime}
        onZoomChange={setZoom}
        onClipMove={handleClipMove}
        onClipResize={handleClipResize}
        onClipSplit={handleClipSplit}
        onClipMerge={handleClipMerge}
        onClipUpdate={handleClipUpdate}
        onTrackAdd={handleTrackAdd}
        onTrackRemove={handleTrackRemove}
        onTrackReorder={handleTrackReorder}
        onTrackUpdate={handleTrackUpdate}
        onTrackDuplicate={handleTrackDuplicate}
        onPreviewUpdate={handlePreviewUpdate}
        height={500}
        showWaveforms={true}
        snapToGrid={true}
        gridSize={0.5}
      />

      {/* Debug Info */}
      <div className="p-4 bg-black/20 rounded-lg border border-white/10">
        <h3 className="text-lg font-semibold text-white/90 mb-2">Debug Info</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-white/60">Current Time:</span>
            <span className="text-white/90 ml-2">{currentTime.toFixed(2)}s</span>
          </div>
          <div>
            <span className="text-white/60">Zoom Level:</span>
            <span className="text-white/90 ml-2">{zoom.toFixed(1)}x</span>
          </div>
          <div>
            <span className="text-white/60">Total Tracks:</span>
            <span className="text-white/90 ml-2">{tracks.length}</span>
          </div>
          <div>
            <span className="text-white/60">Total Clips:</span>
            <span className="text-white/90 ml-2">{tracks.reduce((sum, track) => sum + track.clips.length, 0)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}