"use client"

import React from "react"
import { CleanTimeline } from "@/components/video-editor/CleanTimeline"
import type { TextOverlay, TimelineClip } from "../types"

export function TimelineDock({
  rightOffset,
  gapPx,
  currentTime,
  duration,
  onSeek,
  initialClips,
  textOverlays,
  onTextChange,
  showTextElements,
  showVideoClips,
  showAudioElements,
  onToggleTextElements,
  onToggleVideoClips,
  onToggleAudioElements,
  zoomEvents,
  transitionEvents,
  removedSegments
}: {
  rightOffset: number
  gapPx: number
  currentTime: number
  duration: number
  onSeek: (t: number) => void
  initialClips: TimelineClip[]
  textOverlays: TextOverlay[]
  onTextChange: (id: string, updates: Partial<{ start: number; duration: number }>) => void
  showTextElements: boolean
  showVideoClips: boolean
  showAudioElements: boolean
  onToggleTextElements: () => void
  onToggleVideoClips: () => void
  onToggleAudioElements: () => void
  zoomEvents?: Array<{ start_ms: number; end_ms: number; scale?: number; offsetX?: number; offsetY?: number }>
  transitionEvents?: any[]
  removedSegments?: Array<{ start: number; end: number; reason?: string }>
}) {
  return (
    <CleanTimeline
      rightOffset={rightOffset}
      gapPx={gapPx}
      currentTime={currentTime}
      duration={duration}
      onSeek={onSeek}
      initialClips={initialClips}
      textOverlays={textOverlays}
      onTextChange={onTextChange}
      showTextElements={showTextElements}
      showVideoClips={showVideoClips}
      showAudioElements={showAudioElements}
      onToggleTextElements={onToggleTextElements}
      onToggleVideoClips={onToggleVideoClips}
      onToggleAudioElements={onToggleAudioElements}
      zoomEvents={zoomEvents || []}
      transitionEvents={transitionEvents || []}
      removedSegments={removedSegments || []}
    />
  )
}


