"use client"

import React, { useMemo, useState, useRef, useCallback, useEffect } from "react"
import { motion } from "framer-motion"
import { useRouter, useSearchParams } from "next/navigation"
import { ProtectedRoute } from "@/lib/auth-context"
import LoginPage from "@/components/auth/login-page"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MOCK_MEDIA } from "@/lib/glassmorphic-mock-media"
import { supabase } from "@/lib/supabase"
import {
  Sparkles,
  FileText,
  LayoutGrid,
  MessageSquareText,
  Type as TypeIcon,
  Image as ImageIcon,
  Square,
  Download,
  Play,
  Pause,
  ZoomIn,
  ZoomOut,
  Search,
  Scissors,
  RotateCcw,
  RotateCw,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Users,
  MousePointerClick,
  Volume2,
  VolumeX,
  Mic,
  MessageSquare,
  Wand2,
  Send,
  Settings,
  User,
  Eye,
  Lock,
  PencilOff,
  Filter,
  SquarePlay,
  X
} from "lucide-react"
import { Copy } from "lucide-react"
import { SkipBack, SkipForward } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Waves, Plus } from "lucide-react"
import { Plus_Jakarta_Sans, Anton, Bebas_Neue, Oswald, Montserrat } from "next/font/google"
import SubtitleStyleSelector from "@/components/SubtitleStyleSelector"
import { CleanTimeline } from "@/components/video-editor/CleanTimeline"
import { MediaProcessingPanel } from "@/components/video-editor/MediaProcessingPanel"
import { TranscriptEditor } from "@/components/transcript-editor"
import { SubtitleProcessor } from "@/lib/subtitle-processor"
import { WorkflowStateMachine, classifyAsset } from "@/lib/workflow-state"
import { findBestEmoji } from "@/lib/emoji"
// import { VideoEditorLayout } from "@/components/video-editor/VideoEditorLayout"

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"] })
// Fonts for viral subtitle presets
const fontAnton = Anton({ subsets: ['latin'], weight: '400', display: 'swap' })
const fontBebas = Bebas_Neue({ subsets: ['latin'], weight: '400', display: 'swap' })
const fontOswald = Oswald({ subsets: ['latin'], weight: ['600', '700'], display: 'swap' })
const fontMont = Montserrat({ subsets: ['latin'], weight: ['700', '800', '900'], display: 'swap' })

type Segment = {
  id: string
  type: "video" | "image" | "text"
  startTime: number
  duration: number
  thumbnailUrl: string
  title: string
  content: { text?: string; videoUrl?: string; imageUrl?: string }
  captions?: Array<{
    id: string
    text: string
    startTime: number
    duration: number
    style: { fontSize: number; color: string; position: "top" | "center" | "bottom"; fontWeight: "normal" | "bold" }
  }>
}

type TextOverlay = { id: string; start: number; duration: number; text: string; tokens?: Array<{ w: string; offset: number; dur: number }>; style?: { position?: "top" | "center" | "bottom"; fontSize?: number; color?: string } }

function LegacyCleanTimeline({ rightOffset = 16, gapPx = 4, currentTime = 0, duration = 60, onSeek, initialClips, textOverlays = [], onTextChange, showTextElements = true, showVideoClips = true, showAudioElements = true, onToggleTextElements, onToggleVideoClips, onToggleAudioElements }: { rightOffset?: number; gapPx?: number; currentTime?: number; duration?: number; onSeek?: (sec: number) => void; initialClips?: Array<{ id: string; src: string; start: number; duration: number }>; textOverlays?: Array<{ id: string; start: number; duration: number; text: string }>; onTextChange?: (id: string, updates: Partial<{ start: number; duration: number }>) => void; showTextElements?: boolean; showVideoClips?: boolean; showAudioElements?: boolean; onToggleTextElements?: () => void; onToggleVideoClips?: () => void; onToggleAudioElements?: () => void }) {
  const blockRef = useRef<HTMLDivElement | null>(null)
  const [blockHeight, setBlockHeight] = useState<number>(0)

  const formatTime = (sec: number) => {
    const s = Math.max(0, Math.floor(sec))
    const mm = Math.floor(s / 60).toString().padStart(2, '0')
    const ss = Math.floor(s % 60).toString().padStart(2, '0')
    return `${mm}:${ss}`
  }

  // Demo video clips and basic drag/resize logic (scoped to this timeline)
  type DemoClip = { id: string; src: string; start: number; duration: number }
  const [pixelsPerSecond, setPixelsPerSecond] = useState(40) // Start closer together
  const MIN_DURATION = 0.5
  const [demoClips, setDemoClips] = useState<DemoClip[]>([
    { id: 'c1', src: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4', start: 2, duration: 3.5 },
    { id: 'c2', src: 'https://www.w3schools.com/html/mov_bbb.mp4', start: 8, duration: 3.5 },
    { id: 'c3', src: 'https://media.w3.org/2010/05/sintel/trailer.mp4', start: 14, duration: 3.5 },
  ])

  // If provided, hydrate timeline clips from props (pipeline result)
  useEffect(() => {
    if (initialClips && initialClips.length > 0) {
      setDemoClips(initialClips.map(c => ({ id: c.id, src: c.src, start: c.start, duration: c.duration })))
    }
  }, [initialClips && JSON.stringify(initialClips)])

  // Asset duration per clip (seconds) and thumbnail strips
  const [assetDurById, setAssetDurById] = useState<Record<string, number>>({})
  const [thumbsById, setThumbsById] = useState<Record<string, string[]>>({})

  const generateThumbnails = useCallback(async (id: string, src: string, frames: number = 48) => {
    try {
      const video = document.createElement('video')
      video.crossOrigin = 'anonymous'
      video.preload = 'auto'
      video.src = src
      await new Promise<void>((resolve, reject) => {
        const onLoaded = () => resolve()
        const onErr = () => reject(new Error('video load error'))
        video.addEventListener('loadedmetadata', onLoaded, { once: true })
        video.addEventListener('error', onErr, { once: true })
      })
      const assetDur = Math.max(0.1, video.duration || 0)
      setAssetDurById(prev => ({ ...prev, [id]: assetDur }))

      const canvas = document.createElement('canvas')
      canvas.width = 160
      canvas.height = 90
      const ctx = canvas.getContext('2d')!
      const captures: string[] = []

      const safeFrames = Math.max(8, Math.min(240, frames))
      const times = Array.from({ length: safeFrames }, (_, i) => (assetDur * i) / Math.max(1, safeFrames - 1))
      for (const t of times) {
        await new Promise<void>((resolve) => {
          const seekHandler = () => {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
            captures.push(canvas.toDataURL('image/jpeg', 0.7))
            resolve()
          }
          video.currentTime = Math.min(Math.max(0, t), assetDur - 0.05)
          video.addEventListener('seeked', seekHandler, { once: true })
        })
      }
      setThumbsById(prev => ({ ...prev, [id]: captures }))
    } catch (e) {
      // Fallback to gradient placeholders
      const placeholders = Array.from({ length: 4 }, () => '')
      setThumbsById(prev => ({ ...prev, [id]: placeholders }))
    }
  }, [])

  // Generate thumbs based on current zoom so each frame tile can be dense at high zoom
  useEffect(() => {
    demoClips.forEach(c => {
      const widthPx = c.duration * pixelsPerSecond
      const targetFrames = Math.min(240, Math.max(12, Math.ceil(widthPx / 8)))
      if (!thumbsById[c.id] || thumbsById[c.id].length < targetFrames * 0.7) {
        generateThumbnails(c.id, c.src, targetFrames)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoClips.map(c => `${c.id}:${c.src}:${c.duration}`).join('|'), pixelsPerSecond])

  const snapTo = useCallback((value: number, step = 0.25) => Math.round(value / step) * step, [])

  const getPrevNextBounds = useCallback((index: number) => {
    const byTime = [...demoClips].sort((a, b) => a.start - b.start)
    const clip = demoClips[index]
    const orderedIndex = byTime.findIndex(c => c.id === clip.id)
    const prevEnd = orderedIndex > 0 ? byTime[orderedIndex - 1].start + byTime[orderedIndex - 1].duration : 0
    const nextStart = orderedIndex < byTime.length - 1 ? byTime[orderedIndex + 1].start : Number.POSITIVE_INFINITY
    return { prevEnd, nextStart }
  }, [demoClips])

  const beginMove = useCallback((index: number, e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    const startX = e.clientX
    const startSec = demoClips[index].start
    const { prevEnd, nextStart } = getPrevNextBounds(index)

    const onMove = (ev: MouseEvent) => {
      const deltaSec = (ev.clientX - startX) / pixelsPerSecond
      const raw = startSec + deltaSec
      const clamped = Math.max(prevEnd, Math.min(raw, nextStart - demoClips[index].duration))
      const snapped = snapTo(clamped)
      setDemoClips(prev => prev.map((c, i) => i === index ? { ...c, start: snapped } : c))
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [demoClips, getPrevNextBounds, snapTo])

  const beginResize = useCallback((index: number, edge: 'left' | 'right', e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    const startX = e.clientX
    const clip = demoClips[index]
    const original = { start: clip.start, duration: clip.duration }
    const { prevEnd, nextStart } = getPrevNextBounds(index)
    const assetDur = assetDurById[clip.id] ?? 30

    const onMove = (ev: MouseEvent) => {
      const deltaSec = (ev.clientX - startX) / pixelsPerSecond
      if (edge === 'left') {
        // Left trim: move start within bounds and keep right edge fixed
        const rawStart = original.start + deltaSec
        const maxStart = Math.min(original.start + original.duration - MIN_DURATION, original.start + original.duration) // cannot exceed right edge
        const clampedStart = Math.max(prevEnd, Math.min(rawStart, maxStart))
        const snappedStart = snapTo(clampedStart)
        // ensure we don't exceed asset duration when expanding left later
        const newDuration = Math.min(
          Math.max(MIN_DURATION, original.start + original.duration - snappedStart),
          assetDur
        )
        setDemoClips(prev => prev.map((c, i) => i === index ? { ...c, start: snappedStart, duration: newDuration } : c))
      } else {
        // Right trim: adjust only duration, limited by next clip and asset duration
        const rawEnd = original.start + original.duration + deltaSec
        const minEnd = original.start + MIN_DURATION
        const assetEnd = original.start + assetDur
        const clampedEnd = Math.max(minEnd, Math.min(rawEnd, Math.min(nextStart, assetEnd)))
        const snappedEnd = snapTo(clampedEnd)
        const newDuration = Math.max(MIN_DURATION, snappedEnd - original.start)
        setDemoClips(prev => prev.map((c, i) => i === index ? { ...c, duration: newDuration } : c))
      }
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [demoClips, getPrevNextBounds, snapTo, assetDurById])

  // Text overlays move/resize
  const beginTextMove = useCallback((index: number, e: React.MouseEvent<HTMLDivElement>) => {
    if (!onTextChange) return
    e.preventDefault()
    const startX = e.clientX
    const startSec = textOverlays[index].start
    const onMove = (ev: MouseEvent) => {
      const deltaSec = (ev.clientX - startX) / pixelsPerSecond
      const nextStart = Math.max(0, Math.min(duration, startSec + deltaSec))
      onTextChange(textOverlays[index].id, { start: snapTo(nextStart) })
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [textOverlays, onTextChange, duration, snapTo])

  const beginTextResize = useCallback((index: number, edge: 'left' | 'right', e: React.MouseEvent<HTMLDivElement>) => {
    if (!onTextChange) return
    e.preventDefault()
    const startX = e.clientX
    const overlay = textOverlays[index]
    const original = { start: overlay.start, duration: overlay.duration }
    const onMove = (ev: MouseEvent) => {
      const deltaSec = (ev.clientX - startX) / pixelsPerSecond
      if (edge === 'left') {
        const rawStart = original.start + deltaSec
        const clampedStart = Math.max(0, Math.min(rawStart, original.start + original.duration - MIN_DURATION))
        const snappedStart = snapTo(clampedStart)
        const newDuration = Math.max(MIN_DURATION, original.start + original.duration - snappedStart)
        onTextChange(overlay.id, { start: snappedStart, duration: newDuration })
      } else {
        const rawEnd = original.start + original.duration + deltaSec
        const clampedEnd = Math.max(original.start + MIN_DURATION, Math.min(rawEnd, duration))
        const snappedEnd = snapTo(clampedEnd)
        const newDuration = Math.max(MIN_DURATION, snappedEnd - original.start)
        onTextChange(overlay.id, { duration: newDuration })
      }
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [textOverlays, onTextChange, duration, snapTo])

  const handleScrubStart = (e: React.MouseEvent) => {
    if (!blockRef.current) return
    const rect = blockRef.current.getBoundingClientRect()
    const toTime = (clientX: number) => {
      const x = clientX - rect.left - 24 /* padding left visuals */
      return snapTo(Math.max(0, Math.min(duration, x / pixelsPerSecond)))
    }
    onSeek?.(toTime(e.clientX))
    const onMove = (ev: MouseEvent) => onSeek?.(toTime(ev.clientX))
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div data-timeline-root="1" className="fixed bottom-3 left-3 z-40" style={{ width: `calc(100vw - ${rightOffset + 12}px)` }}>
      <div className="flex items-stretch" style={{ gap: `${gapPx}px` }}>
        {/* Left rail: time indicator + controls (rail matches timeline height) */}
        <div className="relative w-[112px]" style={{ height: blockHeight || undefined }}>
          {/* Extended base behind the rail to remove any bottom gap and match timeline height */}
          <div
            aria-hidden
            className="absolute inset-0 rounded-[16px] border border-white/[0.04]"
            style={{ background: 'radial-gradient(circle at 30% 30%, #3a3a3a 0%, #2a2a2a 25%, #1a1a1a 70%, #0a0a0a 100%)', boxShadow: 'inset 3px 3px 6px rgba(255,255,255,0.06), inset -3px -3px 6px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)' }}
          >

          </div>
          {/* Controls panel fills rail height */}
          <div className="absolute inset-0 rounded-[14px] border border-white/[0.04] p-4" style={{ background: 'radial-gradient(circle at 30% 30%, #3a3a3a 0%, #2a2a2a 25%, #1a1a1a 70%, #0a0a0a 100%)', boxShadow: 'inset 3px 3px 6px rgba(255,255,255,0.06), inset -3px -3px 6px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)' }}>

            <div className="grid grid-rows-[40px_1px_96px_1px_48px] h-full gap-3 text-white/70 pt-1">
              {/* Text row controls */}
              <div className="grid grid-cols-2 gap-3 h-full place-items-center">
                <button className="w-9 h-9 rounded-[10px] bg-white/8 flex items-center justify-center text-white/80"><Lock className="w-5 h-5" style={{ strokeWidth: 1.6 }} /></button>
                <button
                  className={`w-9 h-9 rounded-[10px] flex items-center justify-center transition-colors ${showTextElements ? 'bg-white/15 text-white/90' : 'bg-white/8 text-white/50'}`}
                  onClick={onToggleTextElements}
                  title={showTextElements ? 'Hide text elements' : 'Show text elements'}
                >
                  <Eye className={`w-5 h-5 ${!showTextElements ? 'opacity-50' : ''}`} style={{ strokeWidth: 1.6 }} />
                </button>
              </div>
              {/* Separator */}
              <div aria-hidden className="h-px w-[calc(100%-16px)] mx-auto bg-white/15 rounded-full" />
              {/* Video row controls */}
              <div className="grid grid-cols-2 gap-3 h-full place-items-center">
                <button className="w-9 h-9 rounded-[10px] bg-white/8 flex items-center justify-center text-white/80"><PencilOff className="w-5 h-5" style={{ strokeWidth: 1.6 }} /></button>
                <button
                  className={`w-9 h-9 rounded-[10px] flex items-center justify-center transition-colors ${showVideoClips ? 'bg-white/15 text-white/90' : 'bg-white/8 text-white/50'}`}
                  onClick={onToggleVideoClips}
                  title={showVideoClips ? 'Hide video clips' : 'Show video clips'}
                >
                  <Eye className={`w-5 h-5 ${!showVideoClips ? 'opacity-50' : ''}`} style={{ strokeWidth: 1.6 }} />
                </button>
              </div>
              {/* Separator */}
              <div aria-hidden className="h-px w-[calc(100%-16px)] mx-auto bg-white/15 rounded-full" />
              {/* Audio row controls */}
              <div className="grid grid-cols-2 gap-3 h-full place-items-center">
                <button className="w-9 h-9 rounded-[10px] bg-white/8 flex items-center justify-center text-white/80"><Lock className="w-5 h-5" style={{ strokeWidth: 1.6 }} /></button>
                <button
                  className={`w-9 h-9 rounded-[10px] flex items-center justify-center transition-colors ${showAudioElements ? 'bg-white/15 text-white/90' : 'bg-white/8 text-white/50'}`}
                  onClick={onToggleAudioElements}
                  title={showAudioElements ? 'Hide audio elements' : 'Show audio elements'}
                >
                  <Eye className={`w-5 h-5 ${!showAudioElements ? 'opacity-50' : ''}`} style={{ strokeWidth: 1.6 }} />
                </button>
              </div>
            </div>
          </div>
          {/* Time badge positioned above the rail */}
          <div className="absolute -top-14 left-0 right-0 mx-auto w-[112px] rounded-[12px] border border-white/[0.04] px-4 text-[14px] tracking-wide text-white/95 text-center font-light" style={{ paddingTop: 14, paddingBottom: 14, background: 'radial-gradient(circle at 30% 30%, #3a3a3a 0%, #2a2a2a 25%, #1a1a1a 70%, #0a0a0a 100%)', boxShadow: 'inset 3px 3px 6px rgba(255,255,255,0.06), inset -3px -3px 6px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)' }}>

            {(() => {
              const totalSeconds = Math.max(0, currentTime)
              const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0')
              const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0')
              const centis = Math.floor((totalSeconds % 1) * 100).toString().padStart(2, '0')
              return `${minutes}:${seconds}:${centis}`
            })()}
          </div>
        </div>

        {/* Main timeline block */}
        <div ref={blockRef} className="relative flex-1 rounded-[14px] border border-white/[0.04] px-6 py-3 select-none" style={{ background: 'radial-gradient(circle at 30% 30%, #3a3a3a 0%, #2a2a2a 25%, #1a1a1a 70%, #0a0a0a 100%)', boxShadow: 'inset 3px 3px 6px rgba(255,255,255,0.06), inset -3px -3px 6px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)' }}>


          {/* Top time ruler (interactive) */}
          <div
            data-timeline-ruler="1"
            className="absolute left-0 right-0 -top-14 h-12 z-30"
            onMouseDown={handleScrubStart}
            onWheel={(e) => {
              // Avoid preventDefault to comply with passive listeners
              const delta = e.deltaY > 0 ? -5 : 5 // Zoom out/in
              const newScale = Math.max(20, Math.min(120, pixelsPerSecond + delta))
              setPixelsPerSecond(newScale)
            }}
          >
            {/* Ruler background */}
            <div className="absolute inset-0 rounded-[10px] border border-white/[0.04]" style={{ background: 'radial-gradient(circle at 30% 30%, #3a3a3a 0%, #2a2a2a 25%, #1a1a1a 70%, #0a0a0a 100%)', boxShadow: 'inset 2px 2px 4px rgba(255,255,255,0.04), inset -2px -2px 4px rgba(0,0,0,0.3), 0 1px 4px rgba(0,0,0,0.2)' }} />
            <div className="absolute left-0 right-0 top-0 bottom-0 overflow-hidden">
              <div className="relative h-full" style={{ width: `${Math.max(duration * pixelsPerSecond, blockRef.current?.clientWidth || 0)}px` }}>
                {/* Timeline markers and dots like reference image */}
                {Array.from({ length: Math.max(1, Math.ceil(duration) + 1) }).map((_, sec) => {
                  const left = sec * pixelsPerSecond
                  const showTime = sec % 5 === 0 && sec > 0 // Show time every 5 seconds but NOT 0
                  const showDot = sec % 1 === 0 && sec > 0 && !showTime // Show dots on other seconds

                  return (
                    <div key={`tick-${sec}`} className="absolute inset-y-0" style={{ left }}>
                      {/* Time labels - bigger like reference */}
                      {showTime && (
                        <div className="absolute top-1/2 -translate-y-1/2 text-center text-[14px] text-white/95 font-medium whitespace-nowrap">
                          {formatTime(sec)}
                        </div>
                      )}
                      {/* Dots between time markers */}
                      {showDot && (
                        <div className="absolute top-1/2 -translate-y-1/2 w-[2px] h-[2px] bg-white/60 rounded-full" />
                      )}
                    </div>
                  )
                })}

                {/* Playhead */}
                <div className="absolute top-0 bottom-0 w-[2px] bg-gradient-to-b from-[#dc2626] to-[#ef4444]" style={{ left: currentTime * pixelsPerSecond }}>
                  <div className="absolute -top-6 -left-6 w-12 text-center text-[10px] text-white/80 font-light">{formatTime(currentTime)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Three lanes */}
          <div className="space-y-6 overflow-x-hidden">
            {/* Row 1 - Text overlays editing lane */}
            {showTextElements && (
              <div className="flex items-center gap-4">
                <div className="flex-1 relative" style={{ height: '60px' }}>
                  {textOverlays.map((t, i) => (
                    <div
                      key={t.id}
                      className="absolute bottom-0 h-[56px] rounded-[18px] text-white/90 overflow-hidden flex items-center"
                      style={{
                        left: t.start * pixelsPerSecond,
                        width: Math.max(120, t.duration * pixelsPerSecond),
                        background: 'linear-gradient(135deg, #5a5a5a 0%, #4a4a4a 25%, #3a3a3a 50%, #2a2a2a 75%, #1a1a1a 100%)',
                        boxShadow: 'inset 2px 2px 4px rgba(255,255,255,0.08), inset -2px -2px 4px rgba(0,0,0,0.5), 0 3px 10px rgba(0,0,0,0.4)'
                      }}
                      title={t.text}
                    >
                      <div className="absolute left-[2px] top-1/2 -translate-y-1/2 w-[3px] h-[36px] rounded-full bg-gradient-to-b from-[#dc2626] to-[#ef4444] z-10" onMouseDown={(e) => beginTextResize(i, 'left', e)} />
                      <div className="absolute right-[2px] top-1/2 -translate-y-1/2 w-[3px] h-[36px] rounded-full bg-gradient-to-b from-[#dc2626] to-[#ef4444] z-10" onMouseDown={(e) => beginTextResize(i, 'right', e)} />
                      <div className="absolute inset-0 flex items-center cursor-move select-none" onMouseDown={(e) => beginTextMove(i, e)}>
                        <div className="relative w-10 h-10 rounded-[10px] border border-white/25 flex items-center justify-center overflow-hidden ml-3" style={{ background: 'rgba(255, 255, 255, 0.12)', backdropFilter: 'blur(10px)', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.2)' }}>
                          <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-2" style={{ background: 'linear-gradient(0deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 85%)' }} />
                          <TypeIcon className="w-5 h-5 text-white/90" strokeWidth={1.2} />
                        </div>
                        <div className="flex-1 px-4">
                          <span className="truncate text-base font-medium text-white/95">{t.text}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Row 2 - Video clips */}
            {showVideoClips && (
              <div className="flex items-center gap-4">
                <div className="flex-1 relative" style={{ height: '90px' }}>
                  {demoClips.map((clip, i) => (
                    <div
                      key={clip.id}
                      className="absolute bottom-0 h-[84px] rounded-[16px] bg-white border border-white/20 overflow-hidden shadow-[0_8px_22px_rgba(0,0,0,0.25)]"
                      style={{ left: clip.start * pixelsPerSecond, width: clip.duration * pixelsPerSecond }}
                    >
                      <div className="absolute left-[1px] top-1/2 -translate-y-1/2 w-[10px] h-[82px] rounded-full bg-white z-10 flex items-center justify-center">
                        <div className="w-[4px] h-[32px] rounded-full bg-gray-400/80" />
                      </div>
                      <div className="absolute right-[1px] top-1/2 -translate-y-1/2 w-[10px] h-[82px] rounded-full bg-white z-10 flex items-center justify-center">
                        <div className="w-[4px] h-[32px] rounded-full bg-gray-400/80" />
                      </div>
                      <div className="absolute left-2 right-2 top-[2px] bottom-[2px] rounded-[10px] overflow-hidden flex z-0">
                        {(() => {
                          const frames = thumbsById[clip.id]
                          if (!frames || frames.length === 0) {
                            return <div className="w-full h-full bg-gradient-to-br from-indigo-100 to-pink-100" />
                          }
                          // Aim for ~1 tile every 6px so at high zoom user can inspect almost frame-by-frame
                          const count = Math.max(12, Math.ceil((clip.duration * pixelsPerSecond) / 6))
                          const tiles = Array.from({ length: count }).map((_, i) => frames[i % frames.length])
                          return tiles.map((thumb, idx) => (
                            thumb ? (
                              <img key={idx} src={thumb} alt="frame" className="flex-1 object-cover" />
                            ) : (
                              <div key={idx} className="flex-1 bg-gradient-to-br from-indigo-100 to-pink-100" />
                            )
                          ))
                        })()}
                      </div>
                      <div className="absolute -bottom-5 right-2 text-[11px] text-white/70">{clip.duration.toFixed(1)}s</div>
                      <div className="absolute inset-0 cursor-move" onMouseDown={(e) => beginMove(i, e)} />
                      <div className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize" onMouseDown={(e) => beginResize(i, 'left', e)} />
                      <div className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize" onMouseDown={(e) => beginResize(i, 'right', e)} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Row 3 - Audio segments like reference image */}
            {showAudioElements && (
              <div className="flex items-center gap-4">
                <div className="flex-1 relative" style={{ height: '60px' }}>
                  {/* Multiple audio segments instead of one long bar */}
                  {(() => {
                    const audioList: Array<{ start: number; duration: number; label: string }> = [
                      { start: 0, duration: Math.max(0.1, duration || 0), label: 'Audio' }
                    ]
                    return audioList
                  })().map((segment: any, i: number) => (
                    <div
                      key={`audio-${i}`}
                      className="absolute bottom-0 h-[52px] rounded-[18px] text-white/90 overflow-hidden flex items-center"
                      style={{
                        left: segment.start * pixelsPerSecond,
                        width: segment.duration * pixelsPerSecond,
                        background: 'radial-gradient(circle at 30% 30%, #4a4a4a 0%, #3a3a3a 25%, #2a2a2a 70%, #1a1a1a 100%)',
                        boxShadow: 'inset 3px 3px 6px rgba(255,255,255,0.06), inset -3px -3px 6px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)'
                      }}
                    >
                      <div className="relative w-10 h-10 rounded-[10px] border border-white/25 flex items-center justify-center overflow-hidden ml-3" style={{ background: 'rgba(255, 255, 255, 0.12)', backdropFilter: 'blur(10px)', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.2)' }}>
                        <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-2" style={{ background: 'linear-gradient(0deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 85%)' }} />
                        <Mic className="w-5 h-5 text-white/90" strokeWidth={1.2} />
                      </div>
                      <div className="relative h-8 mx-2 flex-1 overflow-hidden">
                        <svg viewBox={`0 0 ${segment.duration * pixelsPerSecond} 32`} className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id={`audioWaveGrad${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#dc2626" />
                              <stop offset="25%" stopColor="#ef4444" />
                              <stop offset="50%" stopColor="#f87171" />
                              <stop offset="75%" stopColor="#fca5a5" />
                              <stop offset="100%" stopColor="#fecaca" />
                            </linearGradient>
                          </defs>
                          {/* Smoothed pseudo-waveform based on transcript word density (fallback) */}
                          {(() => {
                            const bars = Math.floor((segment.duration * pixelsPerSecond) / 3)
                            const points: string[] = []
                            for (let j = 0; j <= bars; j++) {
                              const x = j * 3
                              const height = 8 + 6 * Math.sin((i * 17 + j) * 0.22)
                              points.push(`${x},${16 - height}`)
                            }
                            return (
                              <polyline
                                points={points.join(' ')}
                                fill="none"
                                stroke={`url(#audioWaveGrad${i})`}
                                strokeWidth="2"
                                opacity="0.9"
                              />
                            )
                          })()}
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          {/* Mini timeline overlay removed */}
        </div>
      </div>
    </div>
  )
}

export default function VideoEditorNeuPage() {
  const router = useRouter()
  const searchParams = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search)
  const initialMediaId = searchParams?.get('mediaId') || null
  const [currentUploadId, setCurrentUploadId] = useState<string | null>(initialMediaId)

  // Demo segments; real projects will hydrate from DB
  const [segments, setSegments] = useState<Segment[]>([
    {
      id: "seg-1",
      type: "video",
      startTime: 0,
      duration: 8,
      title: "Intro",
      thumbnailUrl: "/placeholder.jpg",
      content: { videoUrl: "/placeholder.mp4" },
      captions: [
        {
          id: "cap-1",
          text: "Welcome to the new editor",
          startTime: 0,
          duration: 8,
          style: { fontSize: 24, color: "#ffffff", position: "center", fontWeight: "bold" }
        }
      ]
    },
    {
      id: "seg-2",
      type: "text",
      startTime: 8,
      duration: 4,
      title: "Title Card",
      thumbnailUrl: "/placeholder.jpg",
      content: { text: "Your caption here" }
    }
  ])

  const [subtitleStyle, setSubtitleStyle] = useState<string>("default")
  const [subtitleColor, setSubtitleColor] = useState<string>("#ffffff")
  const [subtitleAccentColor, setSubtitleAccentColor] = useState<string>("#22c55e")
  // Subtitles behavior tuning
  const [subtitleWordsPerCard, setSubtitleWordsPerCard] = useState<number>(5) // 4–5 for two-line flow
  const [subtitleGapThreshold, setSubtitleGapThreshold] = useState<number>(0.08) // seconds (lower for more accurate sentence splits)
  // Advanced timing/segmentation controls
  const [subtitleMinWordsPerCard] = useState<number>(2)
  const [subtitleMaxWordsPerCard] = useState<number>(6)
  const [subtitleReadingCpsMin] = useState<number>(12) // characters per second lower bound (slower reading)
  const [subtitleReadingCpsMax] = useState<number>(17) // characters per second upper bound (faster reading)
  const [subtitleLineCharMax] = useState<number>(40)
  const [subtitleMaxLines, setSubtitleMaxLines] = useState<number>(3)
  const [subtitleFontSize, setSubtitleFontSize] = useState<number>(28)
  const [subtitleFontWeight, setSubtitleFontWeight] = useState<'Light' | 'Regular' | 'Medium' | 'Bold' | 'Heavy'>('Heavy')
  const [subtitleUppercase, setSubtitleUppercase] = useState<boolean>(false)
  const [subtitlePositionY, setSubtitlePositionY] = useState<number>(55)
  const [subtitleStrokeWeight, setSubtitleStrokeWeight] = useState<'none' | 'small' | 'medium' | 'large'>('small')
  const [subtitleStrokeColor, setSubtitleStrokeColor] = useState<string>('#000000')
  const [subtitleShadow, setSubtitleShadow] = useState<'none' | 'small' | 'medium' | 'large'>('medium')
  const [subtitleAnimEnabled, setSubtitleAnimEnabled] = useState<boolean>(true)
  const [subtitleKeepPunctuation, setSubtitleKeepPunctuation] = useState<boolean>(true)
  const [subtitleAutoEmojiMode, setSubtitleAutoEmojiMode] = useState<'auto' | 'top' | 'none'>('auto')
  const [subtitleEmojiAnimation, setSubtitleEmojiAnimation] = useState<boolean>(true)
  const [subtitleGapFree, setSubtitleGapFree] = useState<boolean>(false)
  const [subtitleSecondColor, setSubtitleSecondColor] = useState<string>('#ffffff')
  const [subtitleThirdColor, setSubtitleThirdColor] = useState<string>('#ffffff')
  const [subtitleStagger, setSubtitleStagger] = useState<number>(0.06) // seconds per word
  const [subtitleBottomOffset, setSubtitleBottomOffset] = useState<number>(8) // % from bottom
  const [subtitleAnimation, setSubtitleAnimation] = useState<'pop' | 'fade' | 'slideUp'>('pop')
  const [subtitleWordLead, setSubtitleWordLead] = useState<number>(0.03) // seconds to show word slightly early
  const [subtitleWordTrail, setSubtitleWordTrail] = useState<number>(0.00) // seconds to keep after end
  const [subtitleCardLinger, setSubtitleCardLinger] = useState<number>(1.0) // seconds overlap between cards (max 2s)
  const [showTranscriptView, setShowTranscriptView] = useState<boolean>(true) // Default to true for transcript-first layout
  const [showProjectVideoPanel, setShowProjectVideoPanel] = useState<boolean>(false)
  const [isProcessingSubtitles, setIsProcessingSubtitles] = useState<boolean>(false)



  // Transcript segments state
  type TranscriptSegmentUI = {
    id: string
    text: string
    startTime: number
    endTime: number
    speaker?: string
    confidence?: number
    words?: Array<{ word: string; start: number; end: number; kept?: boolean }>
    isAiCard?: boolean
    lineBreakIndex?: number | null
  }
  const [transcriptSegments, setTranscriptSegments] = useState<TranscriptSegmentUI[]>([])
  const [showChatPopup, setShowChatPopup] = useState<boolean>(false)
  const [showTextElements, setShowTextElements] = useState<boolean>(true)
  const [showVideoClips, setShowVideoClips] = useState<boolean>(true)
  const [showAudioElements, setShowAudioElements] = useState<boolean>(true)
  const [currentTime, setCurrentTime] = useState<number>(0)
  const [zoom, setZoom] = useState(1)
  // Demo audio (generated via WebAudio so no file is required)
  const [isAudioPlaying, setIsAudioPlaying] = useState(false)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null)

  // Interactive demo video clips for the middle track
  type DemoClip = { id: string; src: string; start: number; duration: number }
  // Use same zoom state as main timeline
  const pixelsPerSecond = 40
  const MIN_DURATION = 0.5
  const [demoClips, setDemoClips] = useState<DemoClip[]>([
    { id: 'c1', src: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4', start: 2, duration: 3.5 },
    { id: 'c2', src: 'https://www.w3schools.com/html/mov_bbb.mp4', start: 8, duration: 3.5 },
    { id: 'c3', src: 'https://media.w3.org/2010/05/sintel/trailer.mp4', start: 14, duration: 3.5 },
  ])

  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([])

  // Visual icon/vector overlays synced to word times
  type VisualOverlay = {
    id: string
    start: number
    duration: number
    mediaUrl: string
    placement?: 'aboveSub' | 'belowSub' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'
    size?: number
    offsetX?: number
    offsetY?: number
  }
  const [visualOverlays, setVisualOverlays] = useState<VisualOverlay[]>([])
  const [autoIconsGenerated, setAutoIconsGenerated] = useState<boolean>(false)

  // Audio lane segments (synced to current media duration)
  const [audioSegments, setAudioSegments] = useState<Array<{ start: number; duration: number; label: string }>>([])
  // Detected pauses across transcript (initial, inter-word, inter-segment)
  const [detectedPauses, setDetectedPauses] = useState<Array<{ start: number; end: number; duration: number; segmentId?: string; beforeWordIndex?: number; type: 'initial' | 'interWord' | 'interSegment' }>>([])
  // Build clean subtitle overlays from transcript (one overlay per segment or per sentence)
  useEffect(() => {
    if (!transcriptSegments || transcriptSegments.length === 0) {
      setTextOverlays([])
      setDetectedPauses([])
      return
    }
    // Strategy: robust grouping:
    //  - sanitize punctuation for display
    //  - group by hard sentence terminators and pauses > GAP_S
    //  - avoid orphan single-word cards by merging with neighbors
    //  - cap words per card by subtitleWordsPerCard but prefer sentence boundaries
    const overlays: TextOverlay[] = []
    const GAP_S = subtitleGapThreshold
    const isHardStop = (token: string) => /[.!?…]+$/.test(token)
    const cleanToken = (token: string) => (subtitleKeepPunctuation ? token : token.replace(/[.,;:!?…]+$/g, ''))
    for (const seg of transcriptSegments) {
      // Use raw ASR word timings for pause accuracy (do not filter kept flags)
      const words = (seg.words || [])
      if (!words.length) {
        console.log(`⚠️ Segment "${seg.text.substring(0, 30)}..." has no word timing, skipping`)
        continue
      }
      console.log(`📊 Processing segment with ${words.length} words: "${seg.text.substring(0, 30)}..."`)
      // Compute local median inter-word gap to detect natural pauses (speech-rate aware)
      const gaps = [] as number[]
      for (let gi = 0; gi < words.length - 1; gi++) gaps.push(Math.max(0, words[gi + 1].start - words[gi].end))
      const sortedGaps = gaps.slice().sort((a, b) => a - b)
      const medianGap = sortedGaps.length ? (sortedGaps[Math.floor(sortedGaps.length / 2)] || 0) : 0
      const localPauseThreshold = Math.max(GAP_S, medianGap * 1.8)
      let runStart = words[0].start
      let runEnd = words[0].end
      let tokens: string[] = [cleanToken(words[0].word)]
      let tokenTimes: Array<{ w: string; offset: number; dur: number }> = [{ w: cleanToken(words[0].word), offset: 0, dur: Math.max(0.04, words[0].end - words[0].start) }]
      let prevToken = words[0].word
      for (let i = 1; i < words.length; i++) {
        const w = words[i]
        const gap = w.start - runEnd
        const boundaryByPause = gap >= localPauseThreshold
        const boundaryByHardPunct = isHardStop(prevToken)
        const targetMaxWords = Math.min(subtitleMaxWordsPerCard, Math.max(subtitleWordsPerCard, subtitleMinWordsPerCard))
        const boundaryByCount = tokens.length >= targetMaxWords
        // Keep within two-line character budget
        const currentChars = tokens.join(' ').length
        const nextChars = currentChars + (currentChars ? 1 : 0) + cleanToken(w.word).length
        const lineBudget = Math.max(1, subtitleMaxLines) * subtitleLineCharMax
        const boundaryByChars = nextChars > lineBudget
        // Split if sentence ends or there's a real pause or we exceed count
        const shouldSplit = seg.isAiCard ? false : (boundaryByHardPunct || boundaryByPause || boundaryByCount || boundaryByChars)
        if (!shouldSplit) {
          runEnd = Math.max(runEnd, w.end)
          tokens.push(cleanToken(w.word))
          tokenTimes.push({ w: cleanToken(w.word), offset: Math.max(0, w.start - runStart), dur: Math.max(0.04, w.end - w.start) })
        } else {
          // Avoid orphan cards: if tokens would be 1, try to append to previous overlay instead
          if (tokens.length === 1 && overlays.length > 0) {
            const last = overlays[overlays.length - 1]
            last.text = `${last.text} ${tokens[0]}`.trim()
            // shift durations to extend last card end
            last.duration = Math.max(0.08, (runEnd - last.start))
            last.tokens = (last.tokens || []).concat(tokenTimes.map(tt => ({ ...tt, offset: (tt.offset + (runStart - last.start)) })))
          } else {
            overlays.push({ id: `sub_${seg.id}_${overlays.length}`, start: runStart, duration: Math.max(0.08, runEnd - runStart), text: tokens.join(' '), tokens: tokenTimes })
          }
          runStart = w.start
          runEnd = w.end
          tokens = [cleanToken(w.word)]
          tokenTimes = [{ w: cleanToken(w.word), offset: 0, dur: Math.max(0.04, w.end - w.start) }]
        }
        prevToken = w.word
      }
      if (tokens.length === 1 && overlays.length > 0) {
        const last = overlays[overlays.length - 1]
        last.text = `${last.text} ${tokens[0]}`.trim()
        last.duration = Math.max(0.08, (runEnd - last.start))
        last.tokens = (last.tokens || []).concat(tokenTimes.map(tt => ({ ...tt, offset: (tt.offset + (runStart - last.start)) })))
      } else {
        overlays.push({ id: `sub_${seg.id}_${overlays.length}`, start: runStart, duration: Math.max(0.08, runEnd - runStart), text: tokens.join(' '), tokens: tokenTimes })
      }
    }
    // Bridge connector quantifiers like "mit rund" into their own micro-card before numbers/measurements
    // This avoids phrases being semantically attached to the wrong card or visually skipped
    try {
      const isNumericStart = (s: string) => /^(\d|\d+[.,]\d+)/.test(String(s || '').trim())
      const isConnector = (w: string) => {
        const t = String(w || '').toLowerCase()
        return t === 'mit' || t === 'with' || t === 'ohne' || t === 'über' || t === 'unter' || t === 'bis' || t === 'ab'
      }
      const isQuantifier = (w: string) => {
        const t = String(w || '').toLowerCase()
        return t === 'rund' || t === 'circa' || t === 'etwa' || t === 'ungefähr' || t === 'about' || t === 'around' || t === 'approximately' || t === 'knapp' || t === 'fast' || t === 'mindestens' || t === 'höchstens'
      }
      for (let i = 0; i < overlays.length - 1; i++) {
        const curr = overlays[i] as any
        const next = overlays[i + 1] as any
        if (!curr.tokens || !curr.tokens.length || !next.tokens || !next.tokens.length) continue
        const lastIdx = curr.tokens.length - 1
        const lastWord = curr.tokens[lastIdx].w
        const secondLast = lastIdx > 0 ? curr.tokens[lastIdx - 1].w : undefined
        const pairConnector = Boolean(secondLast) && isConnector(secondLast as string) && isQuantifier(lastWord)
        const singleConnector = isConnector(lastWord)
        const nextStartsNumeric = isNumericStart(next.text) || /^(\d|\d+[.,]\d+)/.test(String(next.tokens[0]?.w || ''))
        if (pairConnector || (singleConnector && nextStartsNumeric)) {
          const moveCount = pairConnector ? 2 : 1
          const startTok = curr.tokens[lastIdx - moveCount + 1]
          const endTok = curr.tokens[lastIdx]
          const newStart = curr.start + startTok.offset
          const newEnd = curr.start + endTok.offset + endTok.dur
          const movedTokens = curr.tokens.slice(lastIdx - moveCount + 1)
          const movedText = movedTokens.map((t: any) => t.w).join(' ')
          // Trim current card tokens/text/duration
          curr.tokens = curr.tokens.slice(0, lastIdx - moveCount + 1)
          curr.text = curr.tokens.map((t: any) => t.w).join(' ')
          const lastRemainEnd = curr.tokens.length
            ? curr.start + curr.tokens[curr.tokens.length - 1].offset + curr.tokens[curr.tokens.length - 1].dur
            : curr.start
          curr.duration = Math.max(0.08, lastRemainEnd - curr.start)
          // Insert new micro-card immediately after current
          const micro = { id: `micro_${i}_${Date.now()}`, start: newStart, duration: Math.max(0.08, newEnd - newStart), text: movedText, tokens: movedTokens }
          overlays.splice(i + 1, 0, micro as any)
          i++ // Skip over the inserted card
        }
      }
    } catch (e) {
      console.warn('subtitle bridge micro-card pass failed:', e)
    }
    // Apply contextual card linger or gap-free behavior
    // If gap-free is enabled, extend each card to the next start exactly (no silent gaps)
    // Otherwise extend to min(next.start, start + duration + subtitleCardLinger), capping overlap to 1–2s
    const linger = Math.max(0, Math.min(2, subtitleCardLinger))
    for (let i = 0; i < overlays.length - 1; i++) {
      const curr = overlays[i]
      const next = overlays[i + 1]
      // Always end at or before next.start to avoid blocking next segment
      const hardEnd = Math.max(0.08, next.start - curr.start)
      if (subtitleGapFree) {
        curr.duration = hardEnd
      } else {
        const desiredEnd = Math.min(next.start, curr.start + curr.duration + linger)
        curr.duration = Math.min(hardEnd, Math.max(0.08, desiredEnd - curr.start))
      }
    }
    // Reading-speed adjustment: ensure each overlay supports ~12–17 chars/sec and max 7s
    for (const ov of overlays) {
      const charCount = ov.text.length
      const minDur = Math.max(0.4, charCount / subtitleReadingCpsMax) // allow shorter cards
      const maxDur = Math.min(6.0, charCount / subtitleReadingCpsMin) // avoid overlong blocking
      if (ov.duration < minDur) ov.duration = minDur
      if (ov.duration > maxDur) ov.duration = maxDur
      // Ensure the overlay does not end before the last spoken word plus small trail
      if (ov.tokens && ov.tokens.length) {
        const speechEnd = ov.start + Math.max(...ov.tokens.map(t => t.offset + t.dur))
        const minSpeechDur = (speechEnd - ov.start) + Math.max(0.00, subtitleWordTrail)
        if (ov.duration < minSpeechDur) ov.duration = minSpeechDur
        // Clamp to not exceed next card start if any
        const next = overlays[overlays.indexOf(ov) + 1]
        if (next) {
          ov.duration = Math.min(ov.duration, Math.max(0.08, next.start - ov.start))
        }
      }
    }
    console.log(`✅ Generated ${overlays.length} textOverlays with precise word timing`)
    setTextOverlays(overlays)
    
    // Compute pauses (beginning, between words, and between segments)
    const pauses: Array<{ start: number; end: number; duration: number; segmentId?: string; beforeWordIndex?: number; type: 'initial' | 'interWord' | 'interSegment' }> = []
    const threshold = GAP_S
    // Initial pause from t=0 to very first word across transcript
    const ordered = [...transcriptSegments].sort((a, b) => a.startTime - b.startTime)
    const firstWithWord = ordered.find(s => (s.words && s.words.length) || s.text.trim().length)
    if (firstWithWord) {
      const fw = (firstWithWord.words && firstWithWord.words.length)
        ? (firstWithWord.words as any)[0]
        : null
      const firstStart = fw ? fw.start : firstWithWord.startTime
      if (firstStart > threshold) {
        pauses.push({ start: 0, end: firstStart, duration: firstStart - 0, segmentId: firstWithWord.id, beforeWordIndex: 0, type: 'initial' })
      }
    }
    // Per-segment pauses
    for (let si = 0; si < ordered.length; si++) {
      const seg = ordered[si]
      const words = (seg.words || [])
      if (words.length) {
        // Initial pause within segment (segment start to first word)
        const segInitial = words[0].start - seg.startTime
        if (segInitial >= threshold) {
          pauses.push({ start: seg.startTime, end: words[0].start, duration: segInitial, segmentId: seg.id, beforeWordIndex: 0, type: 'initial' })
        }
        // Inter-word pauses
        for (let wi = 0; wi < words.length - 1; wi++) {
          const gap = words[wi + 1].start - words[wi].end
          if (gap >= threshold) {
            pauses.push({ start: words[wi].end, end: words[wi + 1].start, duration: gap, segmentId: seg.id, beforeWordIndex: wi + 1, type: 'interWord' })
          }
        }
      }
      // Inter-segment pause (end of this -> start of next)
      const next = ordered[si + 1]
      if (next) {
        const thisEnd = (seg.words && seg.words.length) ? (seg.words as any)[(seg.words as any).length - 1].end : seg.endTime
        const nextStart = (next.words && next.words.length) ? (next.words as any)[0].start : next.startTime
        const gap = nextStart - thisEnd
        if (gap >= threshold) {
          pauses.push({ start: thisEnd, end: nextStart, duration: gap, segmentId: seg.id, type: 'interSegment' })
        }
      }
    }
    setDetectedPauses(pauses)
  }, [JSON.stringify(transcriptSegments), subtitleGapThreshold, subtitleWordsPerCard, subtitleCardLinger, subtitleKeepPunctuation, subtitleGapFree])



  const snapTo = useCallback((value: number, step = 0.25) => {
    return Math.round(value / step) * step
  }, [])

  const getPrevNextBounds = useCallback((index: number) => {
    const byTime = [...demoClips].sort((a, b) => a.start - b.start)
    const clip = demoClips[index]
    const orderedIndex = byTime.findIndex(c => c.id === clip.id)
    const prevEnd = orderedIndex > 0 ? byTime[orderedIndex - 1].start + byTime[orderedIndex - 1].duration : 0
    const nextStart = orderedIndex < byTime.length - 1 ? byTime[orderedIndex + 1].start : Number.POSITIVE_INFINITY
    return { prevEnd, nextStart }
  }, [demoClips])

  const beginMove = useCallback((index: number, e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    const startX = e.clientX
    const startSec = demoClips[index].start
    const { prevEnd, nextStart } = getPrevNextBounds(index)

    const onMove = (ev: MouseEvent) => {
      const deltaSec = (ev.clientX - startX) / pixelsPerSecond
      const raw = startSec + deltaSec
      const clamped = Math.max(prevEnd, Math.min(raw, nextStart - demoClips[index].duration))
      const snapped = snapTo(clamped)
      setDemoClips(prev => prev.map((c, i) => i === index ? { ...c, start: snapped } : c))
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [demoClips, getPrevNextBounds, snapTo])

  const beginResize = useCallback((index: number, edge: 'left' | 'right', e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    const startX = e.clientX
    const clip = demoClips[index]
    const original = { start: clip.start, duration: clip.duration }
    const { prevEnd, nextStart } = getPrevNextBounds(index)

    const onMove = (ev: MouseEvent) => {
      const deltaSec = (ev.clientX - startX) / pixelsPerSecond
      if (edge === 'left') {
        const rawStart = original.start + deltaSec
        const maxStart = original.start + original.duration - MIN_DURATION
        const clampedStart = Math.max(prevEnd, Math.min(rawStart, maxStart))
        const snappedStart = snapTo(clampedStart)
        const newDuration = Math.max(MIN_DURATION, original.start + original.duration - snappedStart)
        setDemoClips(prev => prev.map((c, i) => i === index ? { ...c, start: snappedStart, duration: newDuration } : c))
      } else {
        const rawEnd = original.start + original.duration + deltaSec
        const minEnd = original.start + MIN_DURATION
        const clampedEnd = Math.max(minEnd, Math.min(rawEnd, nextStart))
        const snappedEnd = snapTo(clampedEnd)
        const newDuration = Math.max(MIN_DURATION, snappedEnd - original.start)
        setDemoClips(prev => prev.map((c, i) => i === index ? { ...c, duration: newDuration } : c))
      }
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [demoClips, getPrevNextBounds, snapTo])

  const totalDuration = useMemo(
    () => segments.reduce((acc, s) => Math.max(acc, s.startTime + s.duration), 0),
    [segments]
  )

  const subtitleSegments = useMemo(
    () => segments.flatMap(s =>
      (s.captions || []).map(c => ({ id: c.id, start: s.startTime + c.startTime, duration: c.duration }))
    ),
    [segments]
  )

  const handleSegmentUpdate = (segmentId: string, updates: Partial<Segment>) => {
    setSegments(prev => prev.map(s => (s.id === segmentId ? { ...s, ...updates } : s)))
  }

  const handleClipMove = (clipId: string, newStartTime: number) => {
    setSegments(prev => prev.map(s => (s.id === clipId ? { ...s, startTime: newStartTime } : s)))
  }

  const handleClipResize = (clipId: string, newDuration: number) => {
    setSegments(prev => prev.map(s => (s.id === clipId ? { ...s, duration: Math.max(0.1, newDuration) } : s)))
  }

  const handleExport = async () => {
    const token = (await supabase.auth.getSession()).data.session?.access_token
    try {
      const videoUrls = segments
        .filter(s => s.type === "video" && s.content.videoUrl)
        .map(s => s.content.videoUrl as string)

      const res = await fetch("/api/shotstack/render", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          projectName: "EditorNeu Export",
          videoUrls,
          outputFormat: "mp4",
          outputResolution: "hd"
        })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Export failed")
      alert(`Render submitted. Job ID: ${json.jobId}`)
    } catch (e: any) {
      alert(e?.message || "Failed to export")
    }
  }

  // Right-side mode group state & highlight logic
  const modes = ['video', 'animation', 'tracking', 'media'] as const
  const [activeMode, setActiveMode] = useState<typeof modes[number]>('video')
  const modeContainerRef = useRef<HTMLDivElement | null>(null)
  const modeButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [highlightBox, setHighlightBox] = useState<{ left: number; width: number }>({ left: 0, width: 0 })
  const [modeContainerWidth, setModeContainerWidth] = useState<number>(0)
  const mediaBgRef = useRef<HTMLDivElement | null>(null)
  const headerBarRef = useRef<HTMLDivElement | null>(null)
  const projectAsideRef = useRef<HTMLDivElement | null>(null)
  const [chatTop, setChatTop] = useState<number | undefined>(undefined)
  const modeGapRef = useRef<HTMLDivElement | null>(null)
  const [standardGap, setStandardGap] = useState<number>(8)
  const [musicVolume, setMusicVolume] = useState<number>(0.75)
  const volumeTrackRef = useRef<HTMLDivElement | null>(null)
  const [showMusicPopup, setShowMusicPopup] = useState<boolean>(false)
  const [showSubtitlesPanel, setShowSubtitlesPanel] = useState<boolean>(false)
  const [playbackWindows, setPlaybackWindows] = useState<Array<{ start: number; end: number }>>([])

  // Left Project panel positioning
  const [projectTop, setProjectTop] = useState<number>(0)
  const [projectBottom, setProjectBottom] = useState<number>(0)
  const [projectWidth, setProjectWidth] = useState<number>(0)
  const [previewTop, setPreviewTop] = useState<number>(0)

  // Preview video controls state
  const previewVideoRef = useRef<HTMLVideoElement | null>(null)
  const [isPreviewPlaying, setIsPreviewPlaying] = useState<boolean>(false)
  const [isPreviewMuted, setIsPreviewMuted] = useState<boolean>(false)
  const [previewCurrent, setPreviewCurrent] = useState<number>(0)
  const [previewDuration, setPreviewDuration] = useState<number>(0)
  const [loadedMediaUrl, setLoadedMediaUrl] = useState<string | null>(null)
  const [videoAspectRatio, setVideoAspectRatio] = useState<number | null>(null)
  const [initialClips, setInitialClips] = useState<Array<{ id: string; src: string; start: number; duration: number }>>([])
  const [activeTool, setActiveTool] = useState<string>('mouse')
  const [showMediaView, setShowMediaView] = useState<boolean>(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [scriptText, setScriptText] = useState<string>('')
  const [showScriptPopup, setShowScriptPopup] = useState<boolean>(false)
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [processingProgress, setProcessingProgress] = useState<number>(0)
  const [processingStep, setProcessingStep] = useState<string>('')
  const workflowRef = useRef<WorkflowStateMachine | null>(null)
  if (!workflowRef.current) workflowRef.current = new WorkflowStateMachine()
  const [videoDuration, setVideoDuration] = useState<number>(0)
  const onTimeHandlerRef = useRef<((this: HTMLVideoElement, ev: Event) => any) | null>(null)

  // Helper: build naive word timing if ASR lacks word-level timestamps
  const buildWordTiming = useCallback((text: string, start: number, end: number) => {
    const tokens = text.split(/\s+/).filter(Boolean)
    if (tokens.length === 0) return [] as Array<{ word: string; start: number; end: number }>
    const total = Math.max(0.001, end - start)
    return tokens.map((w, i) => {
      const ws = start + (i / tokens.length) * total
      const we = start + ((i + 1) / tokens.length) * total
      return { word: w, start: ws, end: we }
    })
  }, [])

  // Unified transcript+timeline hydration for a given uploadId
  const hydrateFromUpload = useCallback(async (uploadId: string) => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
      const check = await fetch(`/api/media-files?id=${encodeURIComponent(uploadId)}`, { headers })
      const j = await check.json().catch(() => null)
      const rec = j?.data?.id ? j.data : (Array.isArray(j?.data) ? j.data[0] : null)
      if (!rec) return
      if (rec.storage_url) setLoadedMediaUrl(rec.storage_url)

      const asr = rec?.metadata?.asr
      const ai = rec?.metadata?.ai_subtitles
      // Prefer AI-enhanced segments if available
      const aiCards = Array.isArray(ai?.cards) ? ai.cards : []
      const segs = aiCards.length
        ? aiCards.map((c: any) => ({ start: c.start || c.renderStart || 0, end: c.end || c.renderEnd || 0, text: c.text || '', words: c.words || [], isAiCard: true, lineBreakIndex: (typeof c.lineBreakIndex === 'number' ? c.lineBreakIndex : null) }))
        : (Array.isArray(asr?.segments) ? asr.segments : [])
      const words = Array.isArray(asr?.words) ? asr.words : []
      if (Array.isArray(segs) && segs.length) {
        const merged = segs
          .map((s: any) => ({ start: Math.max(0, Number(s.start||0)), end: Math.max(0, Number(s.end||0)), text: String(s.text||''), words: Array.isArray(s.words) ? s.words : [], isAiCard: !!s.isAiCard, lineBreakIndex: (typeof s.lineBreakIndex === 'number' ? s.lineBreakIndex : null) }))
          .filter((s: any) => s.end > s.start && s.text.trim().length > 0)
          .sort((a: any,b: any) => a.start - b.start)
        const tSegs = merged.map((s: any, idx: number) => {
          const segWords = s.words.length
            ? s.words
            : (words.length ? words.filter((w: any) => w.start >= s.start && w.end <= s.end) : buildWordTiming(s.text, s.start, s.end))
          return { id: `ts-${idx+1}`, text: s.text, startTime: s.start, endTime: s.end, speaker: 'Speaker 1', confidence: 0.95, words: segWords as any, isAiCard: !!s.isAiCard, lineBreakIndex: (typeof s.lineBreakIndex === 'number' ? s.lineBreakIndex : null) }
        })
        setTranscriptSegments(tSegs as any)
        setShowTranscriptView(true)
      }
    } catch {}
  }, [buildWordTiming])

  const formatClock = useCallback((sec: number) => {
    const s = Math.max(0, Math.floor(sec))
    const mm = Math.floor(s / 60).toString().padStart(2, '0')
    const ss = Math.floor(s % 60).toString().padStart(2, '0')
    return `${mm}:${ss}`
  }, [])

  // Transcript editor handlers
  const handleTranscriptSeek = useCallback((time: number) => {
    setCurrentTime(time)
    setPreviewCurrent(time)
    if (previewVideoRef.current) {
      previewVideoRef.current.currentTime = time
    }
  }, [])

  const handleTranscriptSegmentEdit = useCallback((id: string, newText: string) => {
    setTranscriptSegments(prev =>
      prev.map(segment =>
        segment.id === id ? { ...segment, text: newText } : segment
      )
    )
  }, [])

  const handleTranscriptSegmentSplit = useCallback((id: string, splitTime: number) => {
    setTranscriptSegments(prev => {
      const segmentIndex = prev.findIndex(s => s.id === id)
      if (segmentIndex === -1) return prev

      const segment = prev[segmentIndex]
      if (splitTime <= segment.startTime || splitTime >= segment.endTime) return prev

      const firstPart = {
        ...segment,
        id: `${segment.id}_1`,
        endTime: splitTime,
        text: segment.text.substring(0, Math.floor(segment.text.length * (splitTime - segment.startTime) / (segment.endTime - segment.startTime)))
      }

      const secondPart = {
        ...segment,
        id: `${segment.id}_2`,
        startTime: splitTime,
        text: segment.text.substring(Math.floor(segment.text.length * (splitTime - segment.startTime) / (segment.endTime - segment.startTime)))
      }

      const newSegments = [...prev]
      newSegments.splice(segmentIndex, 1, firstPart, secondPart)
      return newSegments
    })
  }, [])

  const handleTranscriptSegmentRemove = useCallback((id: string) => {
    setTranscriptSegments(prev => prev.filter(segment => segment.id !== id))
  }, [])

  // Submagic-style: click a word to preview only that clip
  const handleTranscriptWordClick = useCallback((args: { segmentId: string; wordIndex: number; start: number; end: number }) => {
    let { start, end } = args
    // Tighten boundaries to avoid bleeding into neighbor words
    const EPS = 0.004 // 4ms
    if (end - start < 0.010) end = start + 0.010 // ensure at least 10ms
    start = Math.max(0, start + EPS)
    end = Math.max(end - EPS, start + 0.008)
    setCurrentTime(start)
    setPreviewCurrent(start)
    if (previewVideoRef.current) {
      const v = previewVideoRef.current
      v.currentTime = start
      v.play().catch(() => {})
      const stopAt = end
      // Stop playback automatically at word end
      const onTime = () => {
        if (v.currentTime >= stopAt) {
          v.pause()
          v.currentTime = stopAt
          v.removeEventListener('timeupdate', onTime)
        }
      }
      v.addEventListener('timeupdate', onTime)
    }
  }, [])

  // Toggle keep/remove for a word (Alt/Ctrl click)
  const handleTranscriptWordToggle = useCallback((args: { segmentId: string; wordIndex: number }) => {
    const { segmentId, wordIndex } = args
    setTranscriptSegments(prev => prev.map(seg => {
      if (seg.id !== segmentId) return seg
      const words = seg.words ? [...seg.words] : undefined
      if (!words || !words[wordIndex]) return seg
      const w = words[wordIndex]
      words[wordIndex] = { ...w, kept: w.kept === false ? true : false }
      // Rebuild text from kept words for visual coherence
      const newText = words.map(x => x.word).join(' ')
      return { ...seg, words, text: newText }
    }))
    // Update playback windows to reflect new kept words
    setTimeout(() => {
      try { recomputePlaybackWindows() } catch {}
    }, 0)
  }, [])

  // Build keep segments from toggled words
  const buildKeepSegmentsFromTranscript = useCallback((): Array<{ start_ms: number; end_ms: number; transcript: string }> => {
    const segments: Array<{ start_ms: number; end_ms: number; transcript: string }> = []
    const GAP_S = 0.12
    for (const seg of transcriptSegments) {
      const words = seg.words && seg.words.length ? seg.words.filter(w => w.kept !== false) : null
      if (words && words.length) {
        let runStart = words[0].start
        let runEnd = words[0].end
        let runText = [words[0].word]
        for (let i = 1; i < words.length; i++) {
          const w = words[i]
          if (w.start - runEnd <= GAP_S) {
            runEnd = Math.max(runEnd, w.end)
            runText.push(w.word)
          } else {
            segments.push({ start_ms: Math.round(runStart * 1000), end_ms: Math.round(runEnd * 1000), transcript: runText.join(' ') })
            runStart = w.start
            runEnd = w.end
            runText = [w.word]
          }
        }
        // flush
        segments.push({ start_ms: Math.round(runStart * 1000), end_ms: Math.round(runEnd * 1000), transcript: runText.join(' ') })
      } else {
        // No word timing → keep whole segment
        segments.push({ start_ms: Math.round(seg.startTime * 1000), end_ms: Math.round(seg.endTime * 1000), transcript: seg.text })
      }
    }
    // Merge adjacent segments separated by tiny gaps
    segments.sort((a, b) => a.start_ms - b.start_ms)
    const merged: typeof segments = []
    for (const s of segments) {
      const last = merged[merged.length - 1]
      if (last && s.start_ms - last.end_ms <= GAP_S * 1000) {
        last.end_ms = Math.max(last.end_ms, s.end_ms)
        last.transcript = `${last.transcript} ${s.transcript}`.trim()
      } else {
        merged.push({ ...s })
      }
    }
    return merged
  }, [transcriptSegments])

  // Recompute clean playback windows from current transcript (kept words)
  const recomputePlaybackWindows = useCallback(() => {
    const ks = buildKeepSegmentsFromTranscript()
    const wins = ks.map(k => ({ start: k.start_ms / 1000, end: k.end_ms / 1000 })).filter(w => w.end > w.start)
    setPlaybackWindows(wins)
    if (loadedMediaUrl && wins.length) {
      setInitialClips(wins.map((w, i) => ({ id: `clip-${i + 1}`, src: loadedMediaUrl, start: w.start, duration: Math.max(0.1, w.end - w.start) })))
    }
  }, [buildKeepSegmentsFromTranscript, loadedMediaUrl])

  const renderWordCut = useCallback(async (overrideKeepSegments?: Array<{ start_ms: number; end_ms: number; transcript: string }>) => {
    if (!currentUploadId) {
      alert('No upload selected')
      return
    }
    const keepSegments = (overrideKeepSegments && overrideKeepSegments.length)
      ? overrideKeepSegments
      : buildKeepSegmentsFromTranscript()
    if (!keepSegments.length) {
      alert('Nothing to render')
      return
    }
    const token = (await supabase.auth.getSession()).data.session?.access_token
    const res = await fetch('/api/jobs/custom-cut', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ uploadId: currentUploadId, keepSegments })
    })
    const j = await res.json().catch(() => null)
    if (!res.ok) {
      alert(j?.error || 'Render failed')
      return
    }
    if (j?.storageUrl) {
      setLoadedMediaUrl(j.storageUrl)
      setVideoAspectRatio(null)
    }
  }, [currentUploadId, buildKeepSegmentsFromTranscript])

  

  // Auto actions: remove filler words (local), trim pauses (LLM-powered via API)
  const removeFillerWords = useCallback(() => {
    const FILLERS = new Set(['um','uh','ah','like','you','know','well','erm','hmm','sort','of','kind','of'])
    setTranscriptSegments(prev => prev.map(seg => {
      if (!seg.words || seg.words.length === 0) return seg
      const words = seg.words.map((w: any) => ({ ...w }))
      for (let i = 0; i < words.length; i++) {
        const token = String(words[i].word || '').toLowerCase().replace(/[^a-z']+/g,'')
        if (FILLERS.has(token)) {
          words[i].kept = false
        }
      }
      return { ...seg, words }
    }))
    // Also regenerate playback windows and timeline clips
    recomputePlaybackWindows()
  }, [recomputePlaybackWindows])

  const trimLongPauses = useCallback(async (thresholdSec: number = 0.5) => {
    try {
      if (!transcriptSegments.length) return
      const transcript = {
        text: transcriptSegments.map(s => s.text).join(' '),
        duration: videoDuration || previewDuration || 0,
        segments: transcriptSegments.map(s => ({
          start: s.startTime,
          end: s.endTime,
          text: s.text,
          confidence: s.confidence || 0.8,
          words: (s.words || []).map(w => ({ word: w.word, start: w.start, end: w.end }))
        }))
      }
      const res = await fetch('/api/jobs/clean', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          policy: {
            removeFiller: true,
            removeHesitations: true,
            removeLongPauses: true,
            maxPauseDuration_ms: Math.round(thresholdSec * 1000),
            targetReductionPercentage: 30,
            preserveTransitions: true,
            maintainNaturalFlow: true,
            enableDeduplication: true,
            preferLaterTakes: true,
            similarityThresholdForDupes: 0.7
          }
        })
      })
      const j = await res.json().catch(() => null)
      if (!res.ok || !j?.success || !j?.decision) {
        console.warn('Clean API failed', j)
        return
      }
      const decision = j.decision as {
        keepSegments: Array<{ start_ms: number; end_ms: number; transcript: string }>
        pauseList: Array<{ start_ms: number; end_ms: number; duration_ms: number }>
      }

      // Update UI: mark words outside of keep windows as removed and attach pause markers to segments
      const keepWindows = decision.keepSegments.map(k => ({ start: k.start_ms / 1000, end: k.end_ms / 1000 }))
      setTranscriptSegments(prev => prev.map(seg => {
        if (!seg.words || seg.words.length === 0) return seg
        const words = seg.words.map(w => {
          const mid = (w.start + w.end) / 2
          const inside = keepWindows.some(win => mid >= win.start && mid <= win.end)
          return { ...w, kept: inside }
        })
        const newText = words.filter(w => w.kept !== false).map(w => w.word).join(' ')
        return { ...seg, words, text: newText }
      }))

      // Update playback windows and timeline clips to reflect clean result
      setPlaybackWindows(keepWindows)
      if (loadedMediaUrl && keepWindows.length) {
        setInitialClips(keepWindows.map((w, i) => ({ id: `clip-${i + 1}`, src: loadedMediaUrl, start: w.start, duration: Math.max(0.1, w.end - w.start) })))
      }

      // Persist pause metadata locally for rendering (optional: store in state if needed)
      // We already render inline pause chips per word; this complements that with precise LLM pauses if desired.
      console.log('Detected pauses:', decision.pauseList)

      // Immediately render cleaned selection to update preview source
      await renderWordCut(decision.keepSegments)
    } catch (e) {
      console.warn('Clean trim failed', e)
    }
  }, [transcriptSegments, videoDuration, previewDuration, loadedMediaUrl])

  // Local re-segmentation using SubtitleProcessor (no network)
  const resegmentLocally = useCallback(() => {
    try {
      if (!transcriptSegments.length) return
      // Flatten all words; if missing, approximate evenly within segment
      const allWords: Array<{ word: string; start: number; end: number; confidence?: number }> = []
      for (const seg of transcriptSegments) {
        const segWords = (seg.words && seg.words.length)
          ? seg.words
          : buildWordTiming(seg.text, seg.startTime, seg.endTime)
        for (const w of (segWords as any)) {
          allWords.push({ word: w.word, start: w.start, end: w.end, confidence: w.confidence ?? seg.confidence ?? 0.9 })
        }
      }
      if (!allWords.length) return

      const proc = new SubtitleProcessor({
        maxCharsPerLine: 40,
        maxLines: 3,
        minDuration: 1.0,
        preferredMinDuration: 1.5,
        maxDuration: 4.0,
        endPadding: 0.2,
        mergeIfShorterThan: 0.6,
        silenceThreshold: 0.45,
        collapseShortPausesBelow: 0.15,
        wordConfidenceThreshold: 0.3
      })
      const chunks = proc.process(allWords)
      // Map to TranscriptSegmentUI
      const nextSegments = chunks.map((c, i) => {
        const words = (c.words || []).map(w => ({ word: w.word, start: w.start, end: w.end, kept: true }))
        return {
          id: `seg-${i + 1}`,
          text: (c.text || '').replace(/\n/g, ' ').trim(),
          startTime: c.start,
          endTime: c.end,
          speaker: c.speaker || 'Speaker 1',
          confidence: c.confidence ?? 0.9,
          words
        }
      })
      setTranscriptSegments(nextSegments as any)
      // Update playback windows to match new segmentation
      setPlaybackWindows(chunks.map(c => ({ start: c.start, end: c.end })))
    } catch (e) {
      console.warn('Local re-segmentation failed', e)
    }
  }, [transcriptSegments])

  // Auto-hydrate latest media on page open if nothing is loaded
  useEffect(() => {
    (async () => {
      if (loadedMediaUrl || transcriptSegments.length > 0) return
      try {
        const token = (await supabase.auth.getSession()).data.session?.access_token
        const headers: Record<string,string> = token ? { Authorization: `Bearer ${token}` } : {}
        const res = await fetch('/api/media-files?file_type=video&limit=1', { headers })
        const json = await res.json().catch(() => null)
        const rec = json?.data?.[0]
        if (rec?.id) {
          setCurrentUploadId(rec.id)
          // If transcript exists, hydrate; else call transcribe and then hydrate
          const hasAsr = !!rec?.metadata?.asr?.segments?.length
          if (!hasAsr && rec.storage_url) {
            await fetch('/api/jobs/transcribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uploadId: rec.id, fileUrl: rec.storage_url }) })
          }
          await hydrateFromUpload(rec.id)
          if (rec.storage_url) setLoadedMediaUrl(rec.storage_url)
        }
      } catch {}
    })()
  }, [loadedMediaUrl, transcriptSegments])

  const handleTextOverlayChange = useCallback((id: string, updates: Partial<{ start: number; duration: number }>) => {
    setTextOverlays(prev => prev.map(t => t.id === id ? { ...t, ...updates } as TextOverlay : t))
  }, [])

  const togglePreviewPlay = useCallback(() => {
    const v = previewVideoRef.current
    if (!v) return
    if (v.paused) {
      v.play().catch(() => { })
      setIsPreviewPlaying(true)
    } else {
      v.pause()
      setIsPreviewPlaying(false)
    }
  }, [])

  // Load media by mediaId (if provided)
  useEffect(() => {
    const fetchMedia = async () => {
      try {
        if (!initialMediaId) return
        const token = (await supabase.auth.getSession()).data.session?.access_token
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
        const res = await fetch(`/api/media-files?id=${encodeURIComponent(initialMediaId)}`, { headers })
        const json = await res.json().catch(() => null)
        const list = json?.data || []
        const rec = Array.isArray(list) ? list.find((x: any) => x.id === initialMediaId) : (json?.data?.id ? json.data : null)
        const url = rec?.storage_url || null
        if (url) {
          setLoadedMediaUrl(url)
          setVideoAspectRatio(null) // Reset aspect ratio to trigger redetection
        }
        // Hydrate mini timeline from pipeline keep segments if present
        const keepSegments: Array<{ start_ms: number; end_ms: number }> | undefined = rec?.metadata?.editingDecision?.keepSegments
        if (url && Array.isArray(keepSegments) && keepSegments.length) {
          const clips = keepSegments.map((seg: any, idx: number) => ({
            id: `k${idx + 1}`,
            src: url,
            start: (seg.start_ms || 0) / 1000,
            duration: Math.max(0.1, ((seg.end_ms || 0) - (seg.start_ms || 0)) / 1000)
          }))
          setInitialClips(clips)
        }

        // Hydrate transcript overlays from ASR segments if available
        const asrSegments: Array<{ start: number; end: number; text: string }> | undefined = rec?.metadata?.asr?.segments
        if (Array.isArray(asrSegments) && asrSegments.length) {
          // Normalize and merge segments to avoid duplicates and tiny gaps
          const raw = asrSegments
            .map((s) => ({ start: Math.max(0, Number(s.start || 0)), end: Math.max(0, Number(s.end || 0)), text: String(s.text || '') }))
            .filter((s) => s.end > s.start && s.text.trim().length > 0)
            .sort((a, b) => a.start - b.start)

          const merged: Array<{ start: number; end: number; text: string }> = []
          const GAP = 0.08 // 80ms merge threshold
          for (const seg of raw) {
            const last = merged[merged.length - 1]
            if (last && seg.start - last.end <= GAP) {
              last.end = Math.max(last.end, seg.end)
              last.text = (last.text + ' ' + seg.text).trim()
            } else {
              merged.push({ ...seg })
            }
          }

          const overlays = merged.map((s, idx) => ({
            id: `asr-${idx + 1}`,
            start: s.start,
            duration: Math.max(0.12, s.end - s.start),
            text: s.text
          }))
          setTextOverlays(overlays)
        }
      } catch { }
    }
    fetchMedia()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const togglePreviewMute = useCallback(() => {
    const v = previewVideoRef.current
    if (!v) return
    v.muted = !v.muted
    setIsPreviewMuted(v.muted)
  }, [])

  const seekRelative = useCallback((deltaSec: number) => {
    const v = previewVideoRef.current
    if (!v) return
    try {
      const next = Math.min(v.duration || Infinity, Math.max(0, v.currentTime + deltaSec))
      v.currentTime = next
    } catch { }
  }, [])

  // Wire up time updates
  useEffect(() => {
    const v = previewVideoRef.current
    if (!v) return
    const onLoaded = () => {
      setPreviewDuration(v.duration || 0)
      setIsPreviewMuted(v.muted)
      setIsPreviewPlaying(!v.paused)
      // If we have keep windows, snap to the first allowed start
      if (playbackWindows.length) {
        const first = playbackWindows[0]
        try { v.currentTime = Math.max(0, first.start) } catch {}
      }
    }
    const onTime = () => {
      const t = v.currentTime || 0
      setPreviewCurrent(t)
      if (playbackWindows.length) {
        // If current time is outside any allowed window, jump to next allowed start
        const inside = playbackWindows.some(w => t >= w.start && t <= w.end)
        if (!inside) {
          const next = playbackWindows.find(w => t < w.start)
          if (next) {
            try { v.currentTime = next.start } catch {}
          } else {
            // Past all windows: pause at end of last window
            const last = playbackWindows[playbackWindows.length - 1]
            try { v.pause(); v.currentTime = last.end } catch {}
          }
        } else {
          // If at or beyond the end boundary of current window, advance to next
          const current = playbackWindows.find(w => t >= w.start && t <= w.end)
          if (current && t >= current.end - 0.01) {
            const idx = playbackWindows.indexOf(current)
            const nextWin = playbackWindows[idx + 1]
            if (nextWin) {
              try { v.currentTime = nextWin.start } catch {}
            } else {
              try { v.pause(); v.currentTime = current.end } catch {}
            }
          }
        }
      }
    }
    const onPlay = () => {
      setIsPreviewPlaying(true)
      if (playbackWindows.length) {
        const t = v.currentTime || 0
        const inside = playbackWindows.some(w => t >= w.start && t <= w.end)
        if (!inside) {
          const next = playbackWindows.find(w => t < w.start) || playbackWindows[0]
          try { v.currentTime = next.start } catch {}
        }
      }
    }
    const onPause = () => setIsPreviewPlaying(false)
    v.addEventListener('loadedmetadata', onLoaded)
    v.addEventListener('timeupdate', onTime)
    v.addEventListener('play', onPlay)
    v.addEventListener('pause', onPause)
    return () => {
      v.removeEventListener('loadedmetadata', onLoaded)
      v.removeEventListener('timeupdate', onTime)
      v.removeEventListener('play', onPlay)
      v.removeEventListener('pause', onPause)
    }
  }, [previewVideoRef.current, playbackWindows && JSON.stringify(playbackWindows)])

  // Sync timeline scrubbing -> video element
  useEffect(() => {
    const v = previewVideoRef.current
    if (!v) return
    try {
      if (Math.abs((v.currentTime || 0) - currentTime) > 0.05) {
        v.currentTime = Math.min(v.duration || Infinity, Math.max(0, currentTime))
      }
    } catch { }
  }, [currentTime])

  const [searchQuery, setSearchQuery] = useState<string>("")
  const [filterKind, setFilterKind] = useState<"all" | "photo" | "video">("all")

  const [library, setLibrary] = useState<any[]>([])
  const filteredMedia = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const base = library.length ? library.map(m => ({ id: m.id, kind: 'video' as const, src: m.storage_url, label: m.filename, poster: m.thumbnail_url })) : MOCK_MEDIA
    return base.filter((m) => {
      if (filterKind !== "all" && (m as any).kind !== filterKind) return false
      if (!q) return true
      return (m.label || '').toLowerCase().includes(q)
    })
  }, [searchQuery, filterKind, library])

  // Load user videos for library (fallback to mock when unauthenticated)
  useEffect(() => {
    const load = async () => {
      try {
        const token = (await supabase.auth.getSession()).data.session?.access_token
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
        const res = await fetch('/api/media-files?file_type=video&limit=100', { headers })
        const json = await res.json()
        if (json?.success) setLibrary(json.data || [])
      } catch { }
    }
    load()
  }, [])

  const updateModeHighlight = useCallback((mode?: typeof modes[number]) => {
    const which = mode || activeMode
    const btn = modeButtonRefs.current[which]
    const cont = modeContainerRef.current
    if (!btn || !cont) return
    const br = btn.getBoundingClientRect()
    const cr = cont.getBoundingClientRect()
    setHighlightBox({ left: br.left - cr.left, width: br.width })
    setModeContainerWidth(Math.round(cr.width))
  }, [activeMode])

  useEffect(() => {
    const onResize = () => updateModeHighlight()
    window.addEventListener('resize', onResize)
    // Slight delay to ensure fonts/measurements are correct
    const id = window.setTimeout(() => updateModeHighlight(), 0)
    return () => {
      window.removeEventListener('resize', onResize)
      window.clearTimeout(id)
    }
  }, [updateModeHighlight])

  useEffect(() => {
    updateModeHighlight()
  }, [activeMode, updateModeHighlight])

  // Align chat directly below the Media Background card with standard gap
  useEffect(() => {
    const updateChatTop = () => {
      if (mediaBgRef.current) {
        const rect = mediaBgRef.current.getBoundingClientRect()
        setChatTop(Math.round(rect.bottom + standardGap))
      }
    }
    updateChatTop()
    window.addEventListener('resize', updateChatTop)
    return () => window.removeEventListener('resize', updateChatTop)
  }, [modeContainerWidth, standardGap])

  // Measure the real visual gap between header bar and the mode button group
  useEffect(() => {
    const measureGap = () => {
      const modeEl = modeContainerRef.current
      const headerEl = headerBarRef.current
      if (!modeEl || !headerEl) return
      const modeTop = modeEl.getBoundingClientRect().top
      const headerBottom = headerEl.getBoundingClientRect().bottom
      const gap = Math.max(0, Math.round(modeTop - headerBottom))
      setStandardGap(gap || 8)
    }
    measureGap()
    window.addEventListener('resize', measureGap)
    return () => window.removeEventListener('resize', measureGap)
  }, [])

  // Measure left Project panel top and bottom so it sits between header and timeline with a tiny gap
  useEffect(() => {
    const measureProjectBounds = () => {
      const headerEl = headerBarRef.current
      const headerBottom = headerEl ? headerEl.getBoundingClientRect().bottom : 0
      const topPx = Math.round(headerBottom + standardGap)
      // Prefer aligning to the visible top of the timeline's time ruler
      const rulerEl = document.querySelector('[data-timeline-ruler="1"]') as HTMLElement | null
      let bottomPx = 8 + standardGap // fallback tiny spacing
      if (rulerEl) {
        const rr = rulerEl.getBoundingClientRect()
        // Distance from viewport bottom to the ruler top, minus a tiny offset so we sit just above
        const tinyGap = 6
        bottomPx = Math.max(8, Math.round(window.innerHeight - rr.top + tinyGap))
      }
      setProjectTop(topPx)
      setProjectBottom(bottomPx)
      const asideEl = projectAsideRef.current
      if (asideEl) {
        const w = Math.round(asideEl.getBoundingClientRect().width)
        if (w && w !== projectWidth) setProjectWidth(w)
      }
      // Match the gap to the mode button group's measured gap (standardGap)
      setPreviewTop(Math.max(0, Math.round(headerBottom + standardGap)))
    }
    measureProjectBounds()
    window.addEventListener('resize', measureProjectBounds)
    const id = window.setInterval(measureProjectBounds, 500)
    return () => {
      window.removeEventListener('resize', measureProjectBounds)
      window.clearInterval(id)
    }
  }, [standardGap, projectWidth])

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      try { audioSourceRef.current?.stop() } catch { }
      audioCtxRef.current?.close?.()
    }
  }, [])

  // Visible text overlays for the current time
  const activeOverlays = useMemo(() => textOverlays.filter(t => previewCurrent >= t.start && previewCurrent <= t.start + t.duration), [textOverlays, previewCurrent])

  // Visible visual overlays (icons/vectors) for the current time
  const activeVisualOverlays = useMemo(
    () => visualOverlays.filter(v => previewCurrent >= v.start && previewCurrent <= v.start + v.duration),
    [visualOverlays, previewCurrent]
  )

  // Removed auto-run of icon generation on transcript available.

  // Smooth caption entrance animation keyframes (css-in-js fallback)
  // We rely on globals.css @keyframes captionPop (already present from previous work). If missing, fall back via inline scale+fade.

  // Actions
  const onAddText = useCallback(() => {
    setTextOverlays(prev => [...prev, { id: `t${Date.now()}`, start: snapTo(previewCurrent), duration: 3, text: 'New text', style: { position: 'bottom', fontSize: 26, color: '#ffffff' } }])
  }, [previewCurrent, snapTo])

  const onTextChange = useCallback((id: string, updates: Partial<{ start: number; duration: number }>) => {
    setTextOverlays(prev => prev.map(t => t.id === id ? { ...t, ...updates } as TextOverlay : t))
  }, [])

  // Minimal noun-ish selector; replace with LLM cue extractor later
  const STOPWORDS = useMemo(() => new Set([
    'the','a','an','and','or','but','if','then','so','because','as','of','to','in','on','for','at','by','with','about','into','through','during','before','after','above','below','from','up','down','out','over','under','again','further','then','once','here','there','when','where','why','how','all','any','both','each','few','more','most','other','some','such','no','nor','not','only','own','same','than','too','very','can','will','just','should','now','i','you','he','she','it','we','they','this','that','these','those'
  ]), [])

  const generateVisualOverlaysFromTranscript = useCallback(async () => {
    if (!transcriptSegments.length) return
    if (autoIconsGenerated) return

    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    // 1) Ask AI Visual Director for semantic suggestions
    type DirSuggestion = {
      transcript_line: string
      keyword: string
      visual_type: 'emoji' | 'pixabay_image' | 'none'
      pixabay_query?: string | null
      emoji?: string | null
      reason?: string
      start?: number
      end?: number
    }

    let suggestions: DirSuggestion[] = []
    try {
      const res = await fetch('/api/ai-visual-director', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ segments: transcriptSegments, language: 'auto', maxSuggestions: 10, minSpacingSec: 2.5 })
      })
      if (res.ok) {
        const data = await res.json()
        suggestions = Array.isArray(data?.data?.suggestions) ? data.data.suggestions : []
      } else {
        console.warn('AI Visual Director returned non-OK; falling back to ai-icon-cues')
      }
    } catch (e) {
      console.warn('AI Visual Director failed; falling back to ai-icon-cues', e)
    }

    // Fallback to legacy ai-icon-cues if needed
    if (!suggestions.length) {
      try {
        const res = await fetch('/api/ai-icon-cues', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ segments: transcriptSegments, language: 'auto', maxCues: 8, minSpacingSec: 2.5 })
        })
        if (res.ok) {
          const data = await res.json()
          const cues = Array.isArray(data?.data?.cues) ? data.data.cues : []
          suggestions = cues.map((c: any) => ({
            transcript_line: '',
            keyword: String(c.word || c.query || ''),
            visual_type: c?.type === 'emoji' && c?.emoji ? 'emoji' : 'pixabay_image',
            pixabay_query: c?.query || c?.word || null,
            emoji: c?.emoji || null,
            reason: c?.reason || '',
            start: c?.start,
            end: c?.end
          }))
        }
      } catch { /* ignore */ }
    }

    // Filter out 'none' cases
    const planned = suggestions.filter(s => s.visual_type !== 'none')
    console.log(`🎯 Visual Director: ${planned.length} planned visuals`)

    // 2) Resolve Pixabay images and build overlays; emoji fallback built directly
    const overlays: VisualOverlay[] = []
    let sideToggle = false

    // Ranking helper for Pixabay hits
    function rankHits(hits: any[]): any[] {
      const scored = hits.map(h => {
        const likes = Number(h.likes || 0)
        const downloads = Number(h.downloads || 0)
        const views = Number(h.views || 0)
        const width = Number(h.imageWidth || h.webformatWidth || 0)
        const height = Number(h.imageHeight || h.webformatHeight || 0)
        const resolution = width * height
        const score = likes * 1.0 + downloads * 0.02 + views * 0.005 + Math.min(resolution / (1280*720), 2)
        return { h, score }
      })
      scored.sort((a, b) => b.score - a.score)
      return scored.map(x => x.h)
    }

    for (const s of planned) {
      const start = typeof s.start === 'number' ? s.start : 0
      const end = typeof s.end === 'number' ? s.end : start + 4
      const duration = Math.max(2, Math.min(8, end - start))

      if (s.visual_type === 'emoji' && s.emoji) {
        const emoji = String(s.emoji)
        overlays.push({
          id: `vo_${(s.keyword || 'emoji')}_${Math.round(start * 1000)}`,
          start,
          duration,
          mediaUrl: 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='128' height='128'><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='96'>${emoji}</text></svg>`),
          placement: sideToggle ? 'topRight' : 'topLeft',
          size: 72
        })
        sideToggle = !sideToggle
        continue
      }

      // Pixabay image
      const query = (s.pixabay_query || s.keyword || '').trim()
      if (!query) continue

      let hits: any[] = []
      try {
        if (token) {
          const resp = await fetch(`/api/pixabay?q=${encodeURIComponent(query)}&type=images&perPage=6&order=popular&imageType=photo`, {
            headers: { Authorization: `Bearer ${token}` }
          })
          if (resp.ok) {
            const data = await resp.json()
            hits = Array.isArray(data?.data?.images?.hits) ? data.data.images.hits : []
          }
        }
        if (!hits.length && process.env.NEXT_PUBLIC_PIXABAY_KEY) {
          const params = new URLSearchParams({
            key: String(process.env.NEXT_PUBLIC_PIXABAY_KEY),
            q: query,
            image_type: 'photo',
            order: 'popular',
            per_page: '6'
          })
          const fb = await fetch(`https://pixabay.com/api/?${params.toString()}`)
          if (fb.ok) {
            const data = await fb.json()
            hits = Array.isArray(data?.hits) ? data.hits : []
          }
        }
      } catch (err) {
        console.warn('Pixabay query failed for', query, err)
      }

      const ranked = rankHits(hits)
      const best = ranked[0]
      const url = best?.webformatURL || best?.largeImageURL || best?.previewURL
      if (!url) {
        const emoji = findBestEmoji(query) || '✨'
        overlays.push({
          id: `vo_${query}_${Math.round(start * 1000)}`,
          start,
          duration,
          mediaUrl: 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='128' height='128'><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='96'>${emoji}</text></svg>`),
          placement: sideToggle ? 'topRight' : 'topLeft',
          size: 72
        })
        sideToggle = !sideToggle
        continue
      }

      overlays.push({
        id: `vo_${query}_${Math.round(start * 1000)}`,
        start,
        duration,
        mediaUrl: url,
        placement: sideToggle ? 'topRight' : 'topLeft',
        size: 72
      })
      sideToggle = !sideToggle
    }

    // Deduplicate near-identical overlays by time and URL
    const merged: VisualOverlay[] = []
    const seen = new Set<string>()
    for (const ov of overlays) {
      const key = `${Math.round(ov.start * 10)}|${ov.mediaUrl}`
      if (seen.has(key)) continue
      seen.add(key)
      merged.push(ov)
    }

    setVisualOverlays(prev => [...prev, ...merged])
    console.log(`✅ Visual Director: created ${merged.length} overlays`)
    setAutoIconsGenerated(true)
  }, [transcriptSegments, autoIconsGenerated])

  const loadDemoClips = useCallback(() => {
    const demo = [
      { id: 'c1', src: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4', start: 0, duration: 3.5 },
      { id: 'c2', src: 'https://www.w3schools.com/html/mov_bbb.mp4', start: 4.2, duration: 4.0 },
      { id: 'c3', src: 'https://media.w3.org/2010/05/sintel/trailer.mp4', start: 9.0, duration: 3.8 }
    ]
    setInitialClips(demo)
    setLoadedMediaUrl(demo[0].src)
    setVideoAspectRatio(null) // Reset aspect ratio to trigger redetection
  }, [])

  const getSegmentFillPercent = useCallback((segmentIndex: number) => {
    const segmentStart = segmentIndex * 0.25
    const fraction = (musicVolume - segmentStart) / 0.25
    const clamped = Math.max(0, Math.min(1, fraction))
    return `${(clamped * 100).toFixed(2)}%`
  }, [musicVolume])

  const setVolumeByClientX = useCallback((clientX: number) => {
    const el = volumeTrackRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left))
    const next = x / rect.width
    setMusicVolume(next)
  }, [])

  const onStartDragVolume = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setVolumeByClientX(e.clientX)
    const onMove = (ev: MouseEvent) => setVolumeByClientX(ev.clientX)
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [setVolumeByClientX])

  // Media processing functions
  const handleFileUpload = useCallback((file: File) => {
    if (file.type.startsWith('video/')) {
      // Reset previous state so a new upload always runs a fresh analysis
      workflowRef.current?.reset()
      workflowRef.current?.addAsset({ name: file.name, mimeType: file.type })
      setTranscriptSegments([])
      setTextOverlays([])
      setVisualOverlays([])
      setAutoIconsGenerated(false)
      setDetectedPauses([] as any)
      setInitialClips([])
      setPlaybackWindows([])
      setLoadedMediaUrl(null)
      setShowTranscriptView(false)
      setUploadedFile(file)
      // Start processing only if queue contains a video
      if (workflowRef.current?.startIfNeeded()) {
        setIsProcessing(true)
        setProcessingStep('Uploading video...')
        setProcessingProgress(5)
      }
    } else {
      // Non-video: vectors/images should not trigger processing
      const t = classifyAsset({ name: file.name, mimeType: file.type })
      console.log('media_added', { type: t })
      alert('Please upload a video file (MP4, MOV, AVI) for processing. Images/vectors are added for later composition.')
    }
  }, [])

  const handleScriptSave = useCallback((text: string) => {
    setScriptText(text)
    setShowScriptPopup(false)
  }, [])

  const processVideo = useCallback(async () => {
    if (!uploadedFile) return

    setIsProcessing(true)
    setProcessingProgress(0)
    setProcessingStep('Uploading video...')

    // Declare uploadedMediaId at function scope so it's accessible in error handling
    let uploadedMediaId: string | null = null

    try {
      // Step 1: Upload video
      const formData = new FormData()
      formData.append('file', uploadedFile)
      formData.append('fileType', 'video')
      formData.append('pipeline', 'speaker-to-camera')
      if (scriptText.trim()) {
        formData.append('script', scriptText)
      }

      // Upload using XHR to get real progress (prevents 10% stall)
      await new Promise<void>(async (resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', '/api/media-upload')

        // Attach auth header BEFORE sending
        try {
          const session = await supabase.auth.getSession()
          const token = session.data.session?.access_token || ''
          if (token) {
            xhr.setRequestHeader('Authorization', `Bearer ${token}`)
            xhr.setRequestHeader('x-supabase-auth', token)
          }
        } catch { }

        xhr.upload.onprogress = (evt) => {
          if (!evt.lengthComputable) return
          const pct = Math.max(10, Math.min(95, Math.round((evt.loaded / evt.total) * 100)))
          setProcessingProgress(pct)
          setProcessingStep('Uploading video...')
        }
        xhr.onerror = () => reject(new Error('Upload failed'))
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const json = JSON.parse(xhr.responseText || '{}')
              uploadedMediaId = json?.data?.id || json?.data?.[0]?.id || null
              resolve()
            } catch {
              resolve()
            }
          } else {
            reject(new Error(`Upload failed (${xhr.status})`))
          }
        }
        xhr.send(formData)
      })
      setProcessingProgress((p) => Math.max(p, 20))

      // Run server-side speaker-to-camera pipeline using the uploaded mediaId
      if (!uploadedMediaId) throw new Error('Upload succeeded but no media id returned')

      setProcessingStep('Transcribing audio with AI...')
      setProcessingProgress(25)

      // Test API availability first
      try {
        const healthCheck = await fetch('/api/jobs/transcribe', {
          method: 'HEAD'
        })
        if (!healthCheck.ok) {
          throw new Error('Transcription service unavailable')
        }
      } catch (e) {
        console.error('Health check failed:', e)
        throw new Error('Processing services are currently unavailable. Please try again later.')
      }

      // Add a small delay to show the transcription step
      await new Promise(resolve => setTimeout(resolve, 1000))

      setProcessingStep('Analyzing speech patterns and segments...')
      setProcessingProgress(35)

      const { data: sessionData } = await supabase.auth.getSession()
      const token2 = sessionData.session?.access_token || ''

      // Add timeout and retry logic for the pipeline
      const pipelineCall = async (retryCount = 0): Promise<Response> => {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 600000) // 10 minute timeout

        try {
          const resp = await fetch('/api/jobs/speaker-camera-pipeline', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token2 ? { Authorization: `Bearer ${token2}` } : {})
            },
            body: JSON.stringify({
              uploadId: uploadedMediaId,
              script: scriptText.trim() || undefined,
              outputQuality: 'medium',
              generateFiles: false, // Disable subtitle generation
              instagramFormat: 'portrait',
              skipSubtitles: true // Explicitly skip subtitle creation
            }),
            signal: controller.signal
          })
          clearTimeout(timeoutId)
          return resp
        } catch (error: any) {
          clearTimeout(timeoutId)
          if (error.name === 'AbortError') {
            throw new Error('Pipeline processing timed out after 10 minutes')
          }
          if (retryCount < 2) {
            console.log(`Pipeline attempt ${retryCount + 1} failed, retrying...`)
            setProcessingStep(`Retrying analysis (attempt ${retryCount + 2}/3)...`)
            await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds before retry
            return pipelineCall(retryCount + 1)
          }
          throw error
        }
      }

      const resp = await pipelineCall()

      setProcessingStep('Processing video segments...')
      setProcessingProgress(60)

      // Add a small delay to show progress
      await new Promise(resolve => setTimeout(resolve, 500))
      if (!resp.ok) {
        const t = await resp.text().catch(() => '')
        let j: any = null
        try { j = JSON.parse(t) } catch {}
        console.error('Pipeline API Error:', { status: resp.status, response: t })
        // Handle missing/invalid OpenAI configuration gracefully
        if (resp.status === 503) {
          const suggestion = j?.suggestion || 'Add OPENAI_API_KEY to your environment. See: https://platform.openai.com/account/api-keys'
          const msg = j?.error || 'AI transcription service unavailable.'
          setIsProcessing(false)
          setProcessingProgress(0)
          setProcessingStep('')
          alert(`${msg}\n\n${suggestion}`)
          return
        }
        throw new Error(`Pipeline failed: ${resp.status} (${j?.error || t || 'terminated'})`)
      }
      const pipelineResult = await resp.json().catch((e) => {
        console.error('Failed to parse pipeline response:', e)
        return {}
      })

      console.log('Pipeline result:', pipelineResult)

      if (!pipelineResult.success && pipelineResult.error) {
        throw new Error(`Pipeline processing failed: ${pipelineResult.error}`)
      }

      setProcessingStep('Rendering final video...')
      setProcessingProgress(75)

      // Add a delay to show rendering progress
      await new Promise(resolve => setTimeout(resolve, 1000))

      setProcessingStep('Finalizing and optimizing...')
      setProcessingProgress(92)

      // Prefer API-provided mediaId and storageUrl so we can hydrate metadata
      const producedMediaId: string | null = pipelineResult?.mediaId || null
      const processedUrl = pipelineResult?.storageUrl || pipelineResult?.data?.storageUrl || null

      try {
        const idToFetch = producedMediaId || uploadedMediaId
        const check = await fetch(`/api/media-files?id=${encodeURIComponent(idToFetch || '')}`, { headers: token2 ? { Authorization: `Bearer ${token2}` } : {} })
        const j = await check.json().catch(() => null)
        const rec = j?.data?.id ? j.data : (Array.isArray(j?.data) ? j.data.find((x: any) => x.id === idToFetch) : null)

        const finalUrl = processedUrl || rec?.storage_url || null
        if (finalUrl) {
          setLoadedMediaUrl(finalUrl)
          setVideoAspectRatio(null)
          console.log('Successfully loaded processed video:', finalUrl)
        } else {
          console.warn('No processed video URL found, using original upload')
          // Fallback to original upload if processing didn't produce a new video
          const originalCheck = await fetch(`/api/media-files?id=${encodeURIComponent(uploadedMediaId)}`, { headers: token2 ? { Authorization: `Bearer ${token2}` } : {} })
          const originalJson = await originalCheck.json().catch(() => null)
          const originalUrl = originalJson?.data?.storage_url || null
          if (originalUrl) {
            setLoadedMediaUrl(originalUrl)
            setVideoAspectRatio(null)
            console.log('Loaded original video as fallback:', originalUrl)
          }
        }

        // Hydrate timeline clips from keepSegments
        const keepSegments: Array<{ start_ms: number; end_ms: number }> | undefined = rec?.metadata?.editingDecision?.keepSegments
        if (finalUrl && Array.isArray(keepSegments) && keepSegments.length) {
          const clips = keepSegments.map((seg: any, idx: number) => ({
            id: `k${idx + 1}`,
            src: finalUrl,
            start: (seg.start_ms || 0) / 1000,
            duration: Math.max(0.12, ((seg.end_ms || 0) - (seg.start_ms || 0)) / 1000)
          }))
          setInitialClips(clips)
        }

        // Hydrate transcript overlays from ASR segments
        const asrSegments: Array<{ start: number; end: number; text: string }> | undefined = rec?.metadata?.asr?.segments
        const openaiTranscription = rec?.metadata?.openai_transcription

        // Try to get segments from OpenAI transcription first, then fallback to ASR
        let segmentsToUse = asrSegments
        if (openaiTranscription?.segments && Array.isArray(openaiTranscription.segments)) {
          segmentsToUse = openaiTranscription.segments.map((s: any) => ({
            start: s.start || 0,
            end: s.end || 0,
            text: s.text || ''
          }))
        }

        if (Array.isArray(segmentsToUse) && segmentsToUse.length) {
          const raw = segmentsToUse
            .map((s) => ({ start: Math.max(0, Number(s.start || 0)), end: Math.max(0, Number(s.end || 0)), text: String(s.text || '') }))
            .filter((s) => s.end > s.start && s.text.trim().length > 0)
            .sort((a, b) => a.start - b.start)

          const merged: Array<{ start: number; end: number; text: string }> = []
          const GAP = 0.08
          for (const seg of raw) {
            const last = merged[merged.length - 1]
            if (last && seg.start - last.end <= GAP) {
              last.end = Math.max(last.end, seg.end)
              last.text = (last.text + ' ' + seg.text).trim()
            } else {
              merged.push({ ...seg })
            }
          }
          const overlays = merged.map((s, idx) => ({ id: `asr-${idx + 1}`, start: s.start, duration: Math.max(0.12, s.end - s.start), text: s.text }))
          setTextOverlays(overlays)

          // Also populate transcript segments for the transcript editor
          const transcriptSegs = merged.map((s, idx) => ({
            id: `ts-${idx + 1}`,
            text: s.text,
            startTime: s.start,
            endTime: s.end,
            speaker: 'Speaker 1',
            confidence: 0.95,
            words: buildWordTiming(s.text, s.start, s.end) as any
          }))
          setTranscriptSegments(transcriptSegs as any)

          console.log(`Loaded ${transcriptSegs.length} transcript segments`)

          // If word-level timing is available in metadata, enrich segments accordingly
          const wordItems: Array<{ word: string; start: number; end: number }> | undefined =
            rec?.metadata?.asr?.words || rec?.metadata?.openai_transcription?.words
          if (Array.isArray(wordItems) && wordItems.length > 0) {
            setTranscriptSegments(prev => {
              const next = prev.map(seg => ({ ...seg })) as any
              for (const seg of next) {
                const words = wordItems.filter((w: any) => w.start >= seg.startTime && w.end <= seg.endTime)
                if (words.length) {
                  seg.words = words.map((w: any) => ({ ...w, kept: true }))
                }
              }
              return next
            })
          }

          // auto-open transcript so user can immediately tweak styles
          setShowTranscriptView(true)

          // Kick off local re-segmentation to improve chunking and timing
          setTimeout(() => {
            try { resegmentLocally() } catch {}
          }, 0)
        }
      } catch (fetchError) {
        console.warn('Failed to fetch processed media details:', fetchError)
        // Try to load the original uploaded media as fallback
        try {
          const originalCheck = await fetch(`/api/media-files?id=${encodeURIComponent(uploadedMediaId)}`, { headers: token2 ? { Authorization: `Bearer ${token2}` } : {} })
          const originalJson = await originalCheck.json().catch(() => null)
          const originalUrl = originalJson?.data?.storage_url || null
          if (originalUrl) {
            setLoadedMediaUrl(originalUrl)
            setVideoAspectRatio(null)
            console.log('Loaded original video as fallback after processing')
          }
        } catch { }
      }

      setProcessingStep('Complete!')
      setProcessingProgress(100)

      // Immediately continue with vector icon generation in same workflow
      // Vector/visual search no longer auto-runs. Users can trigger it from the Transcript Editor.
      setProcessingStep('Complete!')
      setProcessingProgress(100)
      await new Promise(resolve => setTimeout(resolve, 400))
      workflowRef.current?.complete()
      setIsProcessing(false)
      setProcessingProgress(0)
      setProcessingStep('')
      setUploadedFile(null)
      setScriptText('')
      setShowMediaView(false)
      setActiveMode('video')

      // Load processed video into editor from last uploaded file
      // The upload API responds with record; fetch latest file for user via media-files list
      try {
        const token = (await supabase.auth.getSession()).data.session?.access_token
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
        const res = await fetch('/api/media-files?file_type=video&limit=1', { headers })
        const json = await res.json().catch(() => null)
        const url = json?.data?.[0]?.storage_url || json?.data?.storage_url || null
        if (url) {
          setLoadedMediaUrl(url)
          setVideoAspectRatio(null)
        }
      } catch { }

    } catch (error) {
      console.error('Processing failed:', error)
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        uploadedMediaId,
        uploadedFile: uploadedFile ? { name: uploadedFile.name, size: uploadedFile.size } : null
      })
      
      setIsProcessing(false)
      setProcessingProgress(0)
      setProcessingStep('')

      // More detailed error handling
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      let userMessage = ''

      if (errorMessage.includes('terminated')) {
        userMessage = 'Video processing was terminated. This might be due to a large file or timeout. Would you like to try with the original video instead?'
      } else if (errorMessage.includes('Pipeline failed: 500')) {
        userMessage = 'Server processing error. Would you like to retry or load the original video?'
      } else if (errorMessage.includes('Pipeline failed: 503') || errorMessage.toLowerCase().includes('ai transcription service') || errorMessage.includes('OpenAI')) {
        userMessage = 'AI features are not configured (missing or invalid OpenAI key). Would you like to load the original video instead?'
      } else if (errorMessage.includes('timeout')) {
        userMessage = 'Processing timed out. Would you like to try with the original video?'
      } else if (errorMessage.includes('Processing services are currently unavailable')) {
        userMessage = 'Processing services are temporarily unavailable. Please try again in a few minutes or load the original video.'
      } else {
        userMessage = `Video processing failed: ${errorMessage}. Would you like to load the original video instead?`
      }

      const useOriginal = confirm(userMessage)
      if (useOriginal && uploadedMediaId) {
        // Try to load the original uploaded video
        try {
          const token = (await supabase.auth.getSession()).data.session?.access_token
          const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
          const res = await fetch(`/api/media-files?id=${encodeURIComponent(uploadedMediaId || '')}`, { headers })
          const json = await res.json().catch(() => null)
          const url = json?.data?.storage_url || null
          if (url) {
            setLoadedMediaUrl(url)
            setVideoAspectRatio(null)
            setShowMediaView(false)
            setActiveMode('video')
            console.log('Loaded original video after processing failure')
            return
          }
        } catch { }
      }

      alert('Unable to load video. Please try uploading again.')
    }
  }, [uploadedFile, scriptText, resegmentLocally])

  return (
    <ProtectedRoute fallback={<LoginPage />}>
      <div className={jakarta.className}>
        {/* Global loading screen (glassmorphic) */}
        {(isProcessing || isProcessingSubtitles) && (
          <div className="fixed inset-0 z-[1000] grid place-items-center" style={{ backdropFilter: 'blur(8px)', background: 'rgba(8,8,8,0.45)' }}>
            <div className="rounded-[16px] border border-white/10 p-6 text-white/90" style={{ background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 50%, rgba(0,0,0,0.35) 100%)', boxShadow: 'inset 2px 2px 6px rgba(255,255,255,0.06), inset -2px -2px 6px rgba(0,0,0,0.35), 0 12px 40px rgba(0,0,0,0.45)' }}>
              <div className="text-[12px] uppercase tracking-wide text-white/70 mb-1">{isProcessingSubtitles ? 'Subtitles' : 'Processing'}</div>
              <div className="text-xl font-medium mb-4">{processingStep || (isProcessingSubtitles ? 'Generating AI subtitles…' : 'Working…')}</div>
              <div className="h-2 w-64 rounded-full overflow-hidden bg-white/10">
                <div className="h-full" style={{ width: `${Math.max(8, Math.min(100, processingProgress || (isProcessingSubtitles ? 60 : 8)))}%`, background: 'linear-gradient(90deg,#ef4444,#f97316)' }} />
              </div>
            </div>
          </div>
        )}
        {/* VideoEditorLayout component commented out - implement your own layout here */}
        {/* <VideoEditorLayout
          loadedMediaUrl={loadedMediaUrl}
          currentTime={currentTime}
          isPlaying={isPreviewPlaying}
          duration={videoDuration}
          transcriptSegments={transcriptSegments}
          textOverlays={textOverlays}
          initialClips={initialClips}
          showTranscriptView={showTranscriptView}
          showMediaView={showMediaView}
          onTimeUpdate={setCurrentTime}
          onPlay={() => togglePreviewPlay()}
          onPause={() => togglePreviewPlay()}
          onSeek={handleTranscriptSeek}
          onTranscriptSegmentEdit={handleTranscriptSegmentEdit}
          onTranscriptSegmentSplit={handleTranscriptSegmentSplit}
          onTranscriptSegmentRemove={handleTranscriptSegmentRemove}
          onTextChange={handleTextOverlayChange}
          onShowMediaView={setShowMediaView}
          onLoadedMetadata={(duration: number) => setVideoDuration(duration)}
        /> */}
        
        {showMediaView ? (
          <MediaProcessingPanel
            uploadedFile={uploadedFile}
            scriptText={scriptText}
            isProcessing={isProcessing}
            processingStep={processingStep}
            processingProgress={processingProgress}
            onChooseFile={(file) => handleFileUpload(file)}
            onDropFile={(file) => handleFileUpload(file)}
            onOpenScript={() => setShowScriptPopup(true)}
            onSaveScript={(text) => handleScriptSave(text)}
            onCloseScript={() => setShowScriptPopup(false)}
            onBackToEditor={() => { setShowMediaView(false); setActiveMode('video') }}
            onProcess={() => { processVideo() }}
            onSkipProcessing={async () => {
              try {
                setIsProcessing(true)
                setProcessingStep('Uploading video...')
                setProcessingProgress(50)
                const formData = new FormData()
                if (uploadedFile) {
                  formData.append('file', uploadedFile)
                  formData.append('fileType', 'video')
                }
                const session = await supabase.auth.getSession()
                const token = session.data.session?.access_token || ''
                const response = await fetch('/api/media-upload', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: formData })
                if (!response.ok) throw new Error('Upload failed')
                const result = await response.json()
                const mediaUrl = result?.data?.storage_url || result?.data?.[0]?.storage_url
                if (mediaUrl) {
                  setLoadedMediaUrl(mediaUrl)
                  setVideoAspectRatio(null)
                  setShowMediaView(false)
                  setActiveMode('video')
                  setIsProcessing(false)
                  setProcessingProgress(0)
                  setProcessingStep('')
                  setUploadedFile(null)
                } else {
                  throw new Error('No video URL returned')
                }
              } catch (error) {
                console.error('Failed to load original video:', error)
                setIsProcessing(false)
                setProcessingProgress(0)
                setProcessingStep('')
                alert('Failed to load video. Please try again.')
              }
            }}
          />
        ) : (
          // Original Video Editor View
          <div className="relative w-full h-screen bg-black text-white overflow-hidden">
            {/* Header - redesigned floating bar */}
            <div ref={headerBarRef} className="px-0 pt-2 pb-0 bg-transparent">
              <div className="mx-2 flex items-center justify-between rounded-[16px] border border-white/10 px-3 py-2 relative" style={{ background: 'linear-gradient(135deg, #2a2a2a 0%, #1f1f1f 50%, #141414 100%)', boxShadow: 'inset 2px 2px 4px rgba(255,255,255,0.03), inset -2px -2px 4px rgba(0,0,0,0.2)' }}>
                {/* Left controls: Back + backward/forward group */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => router.back()}
                    className="h-10 px-3 rounded-[14px] border border-white/30 text-white/90 flex items-center gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="text-sm">Back</span>
                  </button>

                  {/* Test: Add Video (transcribe only) */}
                  <label className="h-10 px-3 rounded-[14px] border border-white/30 text-white/90 flex items-center gap-2 bg-white/10 hover:bg-white/20 cursor-pointer">
                    <Plus className="w-4 h-4" />
                    <span className="text-sm">Add Video</span>
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        try {
                          const token = (await supabase.auth.getSession()).data.session?.access_token
                          const fd = new FormData()
                          fd.append('file', file)
                          fd.append('fileType', 'video')
                          const up = await fetch('/api/media-upload', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd })
                          const uj = await up.json().catch(() => null)
                          if (!up.ok) throw new Error(uj?.error || 'Upload failed')
                          const media = uj?.data
                          const uploadId = media?.id
                          const fileUrl = media?.storage_url
                          setCurrentUploadId(uploadId || null)
                          setLoadedMediaUrl(fileUrl || null)
                          // transcribe only (no cutting)
                          if (uploadId && fileUrl) {
                            const tr = await fetch('/api/jobs/transcribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uploadId, fileUrl }) })
                            const tj = await tr.json().catch(() => null)
                            let hydrated = false
                            if (tr.ok && Array.isArray(tj?.segments) && tj.segments.length) {
                              console.log('🎯 Auto-running SubtitleProcessor for perfect subtitle timing...')
                              
                              try {
                                // Extract all words with timing from transcription response
                                const allWords = tj.segments.flatMap((seg: any) => 
                                  Array.isArray(seg.words) ? seg.words : []
                                ).filter((w: any) => w && typeof w.word === 'string')
                                
                                if (allWords.length > 0) {
                                  console.log('🤖 Auto-running AI Caption Segmentation for perfect subtitle timing...')
                                  setIsProcessingSubtitles(true)
                                  
                                  try {
                                    // Call AI Caption Segmentation API for optimal batching
                                    const aiResponse = await fetch('/api/ai-caption-segmentation', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        words: allWords,
                                        audioUrl: fileUrl,
                                        settings: {
                                          maxCharsPerLine: 35,
                                          maxLines: 3,
                                          preferredDuration: 2.5,
                                          maxDuration: 4.0,
                                          language: 'de'
                                        }
                                      })
                                    })
                                    
                                    if (!aiResponse.ok) {
                                      // AI API returned an error status
                                      const errorText = await aiResponse.text().catch(() => 'Unknown error')
                                      throw new Error(`AI API error: ${aiResponse.status} - ${errorText}`)
                                    }
                                    
                                    const aiResult = await aiResponse.json()
                                    
                                    // Handle both possible response formats
                                    let cards = null
                                    if (aiResult.success && Array.isArray(aiResult.cards)) {
                                      cards = aiResult.cards
                                    } else if (aiResult.success && aiResult.data && Array.isArray(aiResult.data.cards)) {
                                      cards = aiResult.data.cards
                                    }
                                    
                                    if (!cards || cards.length === 0) {
                                      throw new Error(`Invalid AI response format: no cards found`)
                                    }
                                    
                                    console.log('✅ AI generated', cards.length, 'perfect subtitle cards')
                                    
                                    // Convert AI cards to display format - preserve precise word timing
                                    const tSegs = cards.map((card: any, idx: number) => ({
                                      id: `ts-${idx+1}`,
                                      text: card.text,
                                      startTime: card.start || card.renderStart || 0,
                                      endTime: card.end || card.renderEnd || 0,
                                      speaker: 'Speaker 1',
                                      confidence: card.confidence || 0.95,
                                      words: Array.isArray(card.words) && card.words.length > 0 
                                        ? card.words.map((w: any) => ({
                                            word: w.word || w.text_for_display || '',
                                            start: w.start || 0,
                                            end: w.end || 0,
                                            confidence: w.confidence || 0.9
                                          }))
                                        : []
                                    }))
                                    
                                    setTranscriptSegments(tSegs as any)
                                    setShowTranscriptView(true)
                                    setIsProcessingSubtitles(false)
                                    hydrated = true
                                    console.log('🎯 Perfect AI subtitle timing applied automatically!')
                                    
                                    // Force regeneration of textOverlays with precise AI word timing
                                    setTimeout(() => {
                                      console.log('🔄 Triggering textOverlays regeneration with AI timing...')
                                      // The useEffect will automatically regenerate overlays from the updated transcriptSegments
                                    }, 100)
                                  } catch (aiError) {
                                    console.error('❌ AI Caption Segmentation failed:', aiError)
                                    console.log('🔄 Falling back to local SubtitleProcessor...')
                                    
                                    // Fallback to local SubtitleProcessor
                                    const { detectPausesFromWords } = await import('../../lib/vad')
                                    const pauseHints = detectPausesFromWords(allWords, {
                                      silenceThreshold: 0.3,
                                      longPauseThreshold: 1.0,
                                      minPauseConfidence: 0.7
                                    }).map((p: any) => ({ start: p.timestamp, end: p.timestamp + p.duration, dur: p.duration }))
                                    
                                    const { SubtitleProcessor } = await import('../../lib/subtitle-processor')
                                    const processor = new SubtitleProcessor({
                                      maxCharsPerLine: 35,
                                      maxLines: 3,
                                      minDuration: 0.8,
                                      preferredMinDuration: 1.2,
                                      maxDuration: 4.0,
                                      endPadding: 0.1,
                                      mergeIfShorterThan: 0.6,
                                      silenceThreshold: 0.3,
                                      collapseShortPausesBelow: 0.15,
                                      wordConfidenceThreshold: 0.1,
                                      enableDynamicProgramming: true
                                    })
                                    
                                    const processedSubtitles = processor.process(allWords, undefined, pauseHints)
                                    console.log('✅ Fallback SubtitleProcessor created', processedSubtitles.length, 'optimized subtitle cards')
                                    
                                    const tSegs = processedSubtitles.map((sub: any, idx: number) => ({
                                      id: `ts-${idx+1}`,
                                      text: sub.text,
                                      startTime: sub.start,
                                      endTime: sub.end,
                                      speaker: sub.speaker || 'Speaker 1',
                                      confidence: sub.confidence || 0.95,
                                      words: sub.words || []
                                    }))
                                    
                                    setTranscriptSegments(tSegs as any)
                                    setShowTranscriptView(true)
                                    setIsProcessingSubtitles(false)
                                    hydrated = true
                                    console.log('🎯 Fallback subtitle timing applied!')
                                  }
                                } else {
                                  // Fallback to raw segments if no word timing
                                  console.warn('⚠️ No word-level timing found, using raw segments')
                                  const segs = tj.segments
                                    .map((s: any) => ({ start: Math.max(0, Number(s.start||0)), end: Math.max(0, Number(s.end||0)), text: String(s.text||'') }))
                                    .filter((s: any) => s.end > s.start && s.text.trim().length > 0)
                                    .sort((a: any,b: any) => a.start - b.start)
                                  const tSegs = segs.map((s: any, idx: number) => ({
                                    id: `ts-${idx+1}`,
                                    text: s.text,
                                    startTime: s.start,
                                    endTime: s.end,
                                    speaker: 'Speaker 1',
                                    confidence: 0.95,
                                    words: buildWordTiming(s.text, s.start, s.end) as any
                                  }))
                                  setTranscriptSegments(tSegs as any)
                                  setShowTranscriptView(true)
                                  setIsProcessingSubtitles(false)
                                  hydrated = true
                                }
                              } catch (procError) {
                                console.error('❌ SubtitleProcessor failed:', procError)
                                // Fallback to raw segments if processor fails
                                const segs = tj.segments
                                  .map((s: any) => ({ start: Math.max(0, Number(s.start||0)), end: Math.max(0, Number(s.end||0)), text: String(s.text||'') }))
                                  .filter((s: any) => s.end > s.start && s.text.trim().length > 0)
                                  .sort((a: any,b: any) => a.start - b.start)
                                const tSegs = segs.map((s: any, idx: number) => ({
                                  id: `ts-${idx+1}`,
                                  text: s.text,
                                  startTime: s.start,
                                  endTime: s.end,
                                  speaker: 'Speaker 1',
                                  confidence: 0.95,
                                  words: buildWordTiming(s.text, s.start, s.end) as any
                                }))
                                setTranscriptSegments(tSegs as any)
                                setShowTranscriptView(true)
                                setIsProcessingSubtitles(false)
                                hydrated = true
                              }
                            }
                            // Also poll Supabase once or twice to ensure persisted ASR is used going forward
                            for (let i = 0; i < 4; i++) {
                              try {
                                await hydrateFromUpload(uploadId)
                                hydrated = true
                                break
                              } catch {}
                              await new Promise(r => setTimeout(r, 600))
                            }
                            if (!hydrated) {
                              console.warn('Transcript hydration failed; please try again or check ASR metadata')
                            }
                          }
                        } catch (err: any) {
                          alert(err?.message || 'Failed to add and transcribe video')
                        } finally {
                          try { if (e.currentTarget) e.currentTarget.value = '' } catch {}
                        }
                      }}
                    />
                  </label>

                  <div className="flex items-center gap-2">
                    <button className="h-10 w-10 rounded-[14px] border border-white/30 text-white/90 flex items-center justify-center" aria-label="Backwards">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button className="h-10 w-10 rounded-[14px] border border-white/30 text-white/90 flex items-center justify-center" aria-label="Forwards">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Center tools - positioned above video */}
                <div className="absolute flex items-center gap-4" style={{ left: '50%', transform: 'translateX(-50%)' }}>
                  {/* Moving highlight background */}
                  <div
                    className="absolute h-11 rounded-[14px] transition-all duration-500 ease-out pointer-events-none"
                    style={{
                      background: 'radial-gradient(circle at 50% 80%, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0.1) 25%, transparent 50%), radial-gradient(circle at 30% 30%, #3a3a3a 0%, #2a2a2a 25%, #1a1a1a 70%, #0a0a0a 100%)',
                      boxShadow: 'inset 3px 3px 6px rgba(255,255,255,0.06), inset -3px -3px 6px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)',
                      left: activeTool === 'mouse' ? '0px' : activeTool === 'text' ? '76px' : activeTool === 'forms' ? '152px' : '228px',
                      width: '72px',
                      top: '50%',
                      transform: 'translateY(-50%)'
                    }}
                  />

                  {/* Tool buttons - icons with arrows */}
                  <button
                    onClick={() => { setActiveTool('mouse'); setShowTranscriptView(false) }}
                    className="relative z-10 h-11 px-3 text-white/90 flex items-center gap-2 transition-all duration-300"
                    aria-label="Mouse tool"
                  >
                    <MousePointerClick className="w-6 h-6" strokeWidth={1.2} />
                    <ChevronDown className="w-4 h-4" strokeWidth={1.2} />
                  </button>

                  <button
                    onClick={() => { setActiveTool('text'); setShowTranscriptView(true); setShowTextElements(true) }}
                    className="relative z-10 h-11 px-3 text-white/90 flex items-center gap-2 transition-all duration-300"
                    aria-label="Text tool"
                  >
                    <TypeIcon className="w-6 h-6" strokeWidth={1.2} />
                    <ChevronDown className="w-4 h-4" strokeWidth={1.2} />
                  </button>

                  <button
                    onClick={() => { setActiveTool('forms'); setShowTranscriptView(false) }}
                    className="relative z-10 h-11 px-3 text-white/90 flex items-center gap-2 transition-all duration-300"
                    aria-label="Forms tool"
                  >
                    <LayoutGrid className="w-6 h-6" strokeWidth={1.2} />
                    <ChevronDown className="w-4 h-4" strokeWidth={1.2} />
                  </button>

                  <button
                    onClick={() => { setActiveTool('image'); setShowProjectVideoPanel(!showProjectVideoPanel) }}
                    className="relative z-10 h-11 px-3 text-white/90 flex items-center gap-2 transition-all duration-300"
                    aria-label="Project Video"
                    title="Open Project Video Panel"
                  >
                    <ImageIcon className="w-6 h-6" strokeWidth={1.2} />
                    <ChevronDown className="w-4 h-4" strokeWidth={1.2} />
                  </button>
                </div>

                {/* Right: play, export */}
                <div className="flex items-center gap-3">

                  {/* Play button (icon-only, border-only) */}
                  <button
                    className="h-10 w-10 rounded-[14px] border border-white/30 text-white/90 flex items-center justify-center"
                    aria-label="Play"
                    onClick={togglePreviewPlay}
                  >
                    <Play className="w-4 h-4" strokeWidth={1.5} />
                  </button>

                  {/* Export */}
                  <button
                    onClick={handleExport}
                    className="h-10 px-3 rounded-[14px] border border-white/30 text-white/90 flex items-center"
                  >
                    <span className="text-sm">Export</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Left Transcript Editor panel (enlarged, replaces Project Video) */}
            <div className="px-0">
              <aside
                aria-label="Transcript Editor"
                className="fixed left-2 z-50 w-[480px] max-w-[calc(100vw-2rem)] rounded-[14px] border border-white/[0.04] text-white/90 overflow-hidden"
                ref={projectAsideRef}
                style={{ top: projectTop || undefined, bottom: projectBottom || undefined, background: 'radial-gradient(circle at 30% 30%, #3a3a3a 0%, #2a2a2a 25%, #1a1a1a 70%, #0a0a0a 100%)', boxShadow: 'inset 3px 3px 6px rgba(255,255,255,0.06), inset -3px -3px 6px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)' }}
              >
                <div className="h-full overflow-y-auto overflow-x-hidden no-scrollbar">
                  {activeTool === 'text' ? (
                    <div className="p-4">
                      <div className="text-[11px] tracking-wide text-white/60">Caption</div>
                      <div className="text-2xl font-normal mb-4">Choose Style</div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-white/70 mb-1">Font Family</div>
                          <select className="w-full h-9 rounded-[10px] bg-transparent border border-white/20 px-2" value={subtitleStyle} onChange={(e) => setSubtitleStyle(e.target.value)}>
                            <option value="default">Montserrat</option>
                            <option value="hormozi-bold">Anton</option>
                            <option value="bold-outline">Bebas Neue</option>
                            <option value="neon-glow">Oswald</option>
                          </select>
                        </div>
                        <div>
                          <div className="text-xs text-white/70 mb-1">Font Weight</div>
                          <select className="w-full h-9 rounded-[10px] bg-transparent border border-white/20 px-2" value={subtitleFontWeight} onChange={(e) => setSubtitleFontWeight(e.target.value as any)}>
                            <option value="Heavy">Heavy</option>
                            <option value="Bold">Bold</option>
                            <option value="Medium">Medium</option>
                            <option value="Regular">Regular</option>
                            <option value="Light">Light</option>
                          </select>
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="text-xs text-white/70 mb-1">Uppercase</div>
                        <div className="flex items-center gap-2">
                          <button className={`px-3 py-1.5 rounded-md border ${subtitleUppercase ? 'bg-white/15 border-white/40' : 'bg-white/10 border-white/20'}`} onClick={() => setSubtitleUppercase(true)}>Yes</button>
                          <button className={`px-3 py-1.5 rounded-md border ${!subtitleUppercase ? 'bg-white/15 border-white/40' : 'bg-white/10 border-white/20'}`} onClick={() => setSubtitleUppercase(false)}>No</button>
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="text-xs text-white/70 mb-1">Size</div>
                        <div className="flex items-center gap-3">
                          <div className="w-16 text-center h-9 grid place-items-center rounded-[10px] border border-white/20">{subtitleFontSize}</div>
                          <input type="range" min={16} max={72} step={1} value={subtitleFontSize} onChange={(e) => setSubtitleFontSize(parseInt(e.target.value || '28', 10))} className="flex-1" />
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-white/70 mb-1">Font Color</div>
                          <input type="color" className="w-full h-9 rounded-[10px] border border-white/20 bg-transparent" value={subtitleColor} onChange={(e) => setSubtitleColor(e.target.value)} />
                        </div>
                        <div>
                          <div className="text-xs text-white/70 mb-1">Stroke Color</div>
                          <input type="color" className="w-full h-9 rounded-[10px] border border-white/20 bg-transparent" value={subtitleStrokeColor} onChange={(e) => setSubtitleStrokeColor(e.target.value)} />
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-1 gap-3">
                        <div>
                          <div className="text-xs text-white/70 mb-1">Stroke weight</div>
                          <div className="flex items-center gap-2">
                            {(['none','small','medium','large'] as const).map(opt => (
                              <button key={opt} className={`px-3 py-1.5 rounded-md border ${subtitleStrokeWeight===opt?'bg-white/15 border-white/40':'bg-white/10 border-white/20'}`} onClick={() => setSubtitleStrokeWeight(opt)}>{opt[0].toUpperCase()+opt.slice(1)}</button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-white/70 mb-1">Shadow</div>
                          <div className="flex items-center gap-2">
                            {(['none','small','medium','large'] as const).map(opt => (
                              <button key={opt} className={`px-3 py-1.5 rounded-md border ${subtitleShadow===opt?'bg-white/15 border-white/40':'bg-white/10 border-white/20'}`} onClick={() => setSubtitleShadow(opt)}>{opt[0].toUpperCase()+opt.slice(1)}</button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-white/70 mb-1">Display word</div>
                          <div className="flex items-center gap-3">
                            <div className="w-12 text-center h-9 grid place-items-center rounded-[10px] border border-white/20">{subtitleWordsPerCard}</div>
                            <input type="range" min={1} max={6} step={1} value={subtitleWordsPerCard} onChange={(e) => setSubtitleWordsPerCard(parseInt(e.target.value || '3', 10))} className="flex-1" />
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-white/70 mb-1">Position Y</div>
                          <div className="flex items-center gap-3">
                            <div className="w-12 text-center h-9 grid place-items-center rounded-[10px] border border-white/20">{subtitlePositionY}</div>
                            <input type="range" min={5} max={95} step={1} value={subtitlePositionY} onChange={(e) => setSubtitlePositionY(parseInt(e.target.value || '55', 10))} className="flex-1" />
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-white/70 mb-1">Animation</div>
                          <div className="flex items-center gap-2">
                            <button className={`px-3 py-1.5 rounded-md border ${subtitleAnimEnabled ? 'bg-white/15 border-white/40' : 'bg-white/10 border-white/20'}`} onClick={() => setSubtitleAnimEnabled(true)}>Yes</button>
                            <button className={`px-3 py-1.5 rounded-md border ${!subtitleAnimEnabled ? 'bg-white/15 border-white/40' : 'bg-white/10 border-white/20'}`} onClick={() => setSubtitleAnimEnabled(false)}>No</button>
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-white/70 mb-1">Punctuation</div>
                          <div className="flex items-center gap-2">
                            <button className={`px-3 py-1.5 rounded-md border ${subtitleKeepPunctuation ? 'bg-white/15 border-white/40' : 'bg-white/10 border-white/20'}`} onClick={() => setSubtitleKeepPunctuation(true)}>Yes</button>
                            <button className={`px-3 py-1.5 rounded-md border ${!subtitleKeepPunctuation ? 'bg-white/15 border-white/40' : 'bg-white/10 border-white/20'}`} onClick={() => setSubtitleKeepPunctuation(false)}>No</button>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-white/70 mb-1">Auto emoji</div>
                          <div className="flex items-center gap-2">
                            <button className={`px-3 py-1.5 rounded-md border ${subtitleAutoEmojiMode === 'auto' ? 'bg-white/15 border-white/40' : 'bg-white/10 border-white/20'}`} onClick={() => setSubtitleAutoEmojiMode('auto')}>Auto</button>
                            <button className={`px-3 py-1.5 rounded-md border ${subtitleAutoEmojiMode === 'top' ? 'bg-white/15 border-white/40' : 'bg-white/10 border-white/20'}`} onClick={() => setSubtitleAutoEmojiMode('top')}>Top</button>
                            <button className={`px-3 py-1.5 rounded-md border ${subtitleAutoEmojiMode === 'none' ? 'bg-white/15 border-white/40' : 'bg-white/10 border-white/20'}`} onClick={() => setSubtitleAutoEmojiMode('none')}>None</button>
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-white/70 mb-1">Emoji animation</div>
                          <div className="flex items-center gap-2">
                            <button className={`px-3 py-1.5 rounded-md border ${subtitleEmojiAnimation ? 'bg-white/15 border-white/40' : 'bg-white/10 border-white/20'}`} onClick={() => setSubtitleEmojiAnimation(true)}>Yes</button>
                            <button className={`px-3 py-1.5 rounded-md border ${!subtitleEmojiAnimation ? 'bg-white/15 border-white/40' : 'bg-white/10 border-white/20'}`} onClick={() => setSubtitleEmojiAnimation(false)}>No</button>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="text-xs text-white/70 mb-1">Gap-free captions</div>
                        <div className="flex items-center gap-2">
                          <button className={`px-3 py-1.5 rounded-md border ${subtitleGapFree ? 'bg-white/15 border-white/40' : 'bg-white/10 border-white/20'}`} onClick={() => setSubtitleGapFree(true)}>Yes</button>
                          <button className={`px-3 py-1.5 rounded-md border ${!subtitleGapFree ? 'bg-white/15 border-white/40' : 'bg-white/10 border-white/20'}`} onClick={() => setSubtitleGapFree(false)}>No</button>
                        </div>
                      </div>
                      <div className="mt-6 grid grid-cols-3 gap-4">
                        <div>
                          <div className="text-xs text-white/70 mb-1">Main color</div>
                          <input type="color" className="w-full h-9 rounded-[10px] border border-white/20 bg-transparent" value={subtitleColor} onChange={(e) => setSubtitleColor(e.target.value)} />
                        </div>
                        <div>
                          <div className="text-xs text-white/70 mb-1">Second color</div>
                          <input type="color" className="w-full h-9 rounded-[10px] border border-white/20 bg-transparent" value={subtitleSecondColor} onChange={(e) => setSubtitleSecondColor(e.target.value)} />
                        </div>
                        <div>
                          <div className="text-xs text-white/70 mb-1">Third color</div>
                          <input type="color" className="w-full h-9 rounded-[10px] border border-white/20 bg-transparent" value={subtitleThirdColor} onChange={(e) => setSubtitleThirdColor(e.target.value)} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <TranscriptEditor
                      segments={transcriptSegments as any}
                      currentTime={currentTime}
                      isPlaying={isPreviewPlaying}
                      onSeek={handleTranscriptSeek}
                      onPlay={() => togglePreviewPlay()}
                      onPause={() => togglePreviewPlay()}
                      onSegmentEdit={handleTranscriptSegmentEdit}
                      onSegmentSplit={handleTranscriptSegmentSplit}
                      onSegmentRemove={handleTranscriptSegmentRemove}
                      pauses={detectedPauses as any}
                      onAddVisuals={async () => {
                        try {
                          setIsProcessing(true)
                          setProcessingStep('Finding visuals for key moments...')
                          setProcessingProgress(85)
                          await generateVisualOverlaysFromTranscript()
                          setProcessingStep('Applying visuals...')
                          setProcessingProgress(96)
                          await new Promise(r => setTimeout(r, 350))
                        } finally {
                          setIsProcessing(false)
                          setProcessingProgress(0)
                          setProcessingStep('')
                        }
                      }}
                    />
                  )}
                </div>
              </aside>
            </div>

            {/* Right-side mode group (Video / Animation / Tracking) - floating below header */}
            <div ref={modeGapRef} className="px-0 mt-1">
              <div
                ref={modeContainerRef}
                className="relative ml-auto mr-2 w-max flex items-center gap-3 rounded-[16px] text-white border border-white/[0.04] px-3 py-2"
                style={{ background: 'radial-gradient(circle at 30% 30%, #3a3a3a 0%, #2a2a2a 25%, #1a1a1a 70%, #0a0a0a 100%)', boxShadow: 'inset 3px 3px 6px rgba(255,255,255,0.06), inset -3px -3px 6px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)' }}
              >

                {/* Sliding highlight */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 -translate-y-1/2 rounded-[14px] transition-[left,width] duration-500 ease-out"
                  style={{
                    left: `${highlightBox.left - 4}px`,
                    width: `${highlightBox.width + 8}px`,
                    height: `calc(100% - 8px)`,
                    background: 'radial-gradient(circle at 50% 80%, rgba(239, 68, 68, 0.25) 0%, rgba(239, 68, 68, 0.15) 25%, rgba(239, 68, 68, 0.05) 50%, transparent 70%), radial-gradient(circle at 30% 30%, #4a4a4a 0%, #3a3a3a 25%, #2a2a2a 70%, #1a1a1a 100%)',
                    boxShadow: 'inset 3px 3px 6px rgba(255,255,255,0.08), inset -3px -3px 6px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)'
                  }}
                />
                {modes.map((mode) => (
                  <button
                    key={mode}
                    ref={(el) => { modeButtonRefs.current[mode] = el }}
                    onClick={() => {
                      setActiveMode(mode)
                      if (mode === 'media') {
                        setShowMediaView(true)
                      } else {
                        setShowMediaView(false)
                      }
                      // No separate 'subtitles' mode; handled by header T icon
                    }}
                    className={`relative z-10 h-10 px-5 rounded-[14px] text-sm font-medium capitalize transition-colors ${activeMode === mode ? 'text-white' : 'text-white/70 hover:text-white/85'}`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Subtitles settings panel disabled: replaced by left-side Subtitles Editor */}
            {false && (
              <div className="px-0" style={{ marginTop: `${standardGap}px` }}>
                <div className="ml-auto mr-2" style={{ width: modeContainerWidth ? `${modeContainerWidth}px` : undefined }}>
                  <div className="rounded-[14px] text-white/90 border border-white/[0.04] overflow-hidden relative" style={{ background: 'radial-gradient(circle at 30% 30%, #3a3a3a 0%, #2a2a2a 25%, #1a1a1a 70%, #0a0a0a 100%)', boxShadow: 'inset 3px 3px 6px rgba(255,255,255,0.06), inset -3px -3px 6px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)' }}>
                    <div className="p-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-[11px] tracking-wide text-white/60">Subtitles</div>
                          <div className="text-2xl font-normal">Editor</div>
                        </div>
                        <button className="text-white/70 hover:text-white" onClick={() => setShowSubtitlesPanel(false)} title="Close"><X className="w-5 h-5" /></button>
                      </div>

                      <div className="mt-4">
                        <SubtitleStyleSelector
                          value={subtitleStyle}
                          onChange={setSubtitleStyle}
                          color={subtitleColor}
                          onColorChange={setSubtitleColor}
                          accentColor={subtitleAccentColor}
                          onAccentColorChange={setSubtitleAccentColor}
                          animation={subtitleAnimation}
                          onAnimationChange={setSubtitleAnimation}
                        />
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-4 text-[12px] text-white/80">
                        <div>
                          <div className="flex items-center justify-between mb-1"><span>Words per card</span><span className="text-white/60">{subtitleWordsPerCard}</span></div>
                          <input type="range" min={2} max={6} step={1} value={subtitleWordsPerCard} onChange={(e) => setSubtitleWordsPerCard(parseInt(e.target.value || '3', 10))} className="w-full" />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1"><span>Pause split (s)</span><span className="text-white/60">{subtitleGapThreshold.toFixed(2)}</span></div>
                          <input type="range" min={0.06} max={0.5} step={0.01} value={subtitleGapThreshold} onChange={(e) => setSubtitleGapThreshold(parseFloat(e.target.value || '0.12'))} className="w-full" />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1"><span>Max lines</span><span className="text-white/60">{subtitleMaxLines}</span></div>
                          <input type="range" min={1} max={3} step={1} value={subtitleMaxLines} onChange={(e) => setSubtitleMaxLines(parseInt(e.target.value || '2', 10))} className="w-full" />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1"><span>Font size (px)</span><span className="text-white/60">{subtitleFontSize}</span></div>
                          <input type="range" min={16} max={72} step={1} value={subtitleFontSize} onChange={(e) => setSubtitleFontSize(parseInt(e.target.value || '28', 10))} className="w-full" />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1"><span>Stagger (s/word)</span><span className="text-white/60">{subtitleStagger.toFixed(2)}</span></div>
                          <input type="range" min={0.02} max={0.12} step={0.01} value={subtitleStagger} onChange={(e) => setSubtitleStagger(parseFloat(e.target.value || '0.06'))} className="w-full" />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1"><span>Uppercase</span><span className="text-white/60">{subtitleUppercase ? 'Yes' : 'No'}</span></div>
                          <div className="flex items-center gap-2">
                            <button className={`px-3 py-1.5 rounded-md border ${subtitleUppercase ? 'bg-white/15 border-white/40' : 'bg-white/10 border-white/20'}`} onClick={() => setSubtitleUppercase(true)}>Yes</button>
                            <button className={`px-3 py-1.5 rounded-md border ${!subtitleUppercase ? 'bg-white/15 border-white/40' : 'bg-white/10 border-white/20'}`} onClick={() => setSubtitleUppercase(false)}>No</button>
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1"><span>Position Y (%)</span><span className="text-white/60">{subtitlePositionY}</span></div>
                          <input type="range" min={5} max={95} step={1} value={subtitlePositionY} onChange={(e) => setSubtitlePositionY(parseInt(e.target.value || '55', 10))} className="w-full" />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1"><span>Bottom offset (%)</span><span className="text-white/60">{subtitleBottomOffset}</span></div>
                          <input type="range" min={4} max={24} step={1} value={subtitleBottomOffset} onChange={(e) => setSubtitleBottomOffset(parseInt(e.target.value || '8', 10))} className="w-full" />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1"><span>Word lead (s)</span><span className="text-white/60">{subtitleWordLead.toFixed(2)}</span></div>
                          <input type="range" min={0} max={0.12} step={0.01} value={subtitleWordLead} onChange={(e) => setSubtitleWordLead(parseFloat(e.target.value || '0.03'))} className="w-full" />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1"><span>Word trail (s)</span><span className="text-white/60">{subtitleWordTrail.toFixed(2)}</span></div>
                          <input type="range" min={0} max={0.16} step={0.01} value={subtitleWordTrail} onChange={(e) => setSubtitleWordTrail(parseFloat(e.target.value || '0.04'))} className="w-full" />
                        </div>
                        <div className="col-span-2 pt-2 border-t border-white/10">
                          <div className="flex items-center justify-center py-2">
                            {isProcessingSubtitles ? (
                              <span className="text-blue-400 text-xs">🔄 Processing AI Subtitles...</span>
                            ) : (
                              <span className="text-green-400 text-xs">✅ AI Contextual Segmentation (Auto)</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <label className="flex items-center gap-2 text-[13px]">
                          <input type="checkbox" checked={showTextElements} onChange={() => setShowTextElements(v => !v)} />
                          <span>Show subtitles on video</span>
                        </label>
                        <button
                          className="px-3 py-1.5 rounded-md text-sm bg-white/10 hover:bg-white/20 border border-white/20"
                          onClick={() => {
                            setSubtitleStyle('default')
                            setSubtitleColor('#ffffff')
                            setSubtitleAccentColor('#22c55e')
                            setSubtitleWordsPerCard(3)
                            setSubtitleGapThreshold(0.12)
                            setSubtitleUppercase(false)
                            setSubtitlePositionY(55)
                            setSubtitleFontSize(28)
                            setSubtitleStagger(0.06)
                            setSubtitleBottomOffset(8)
                            setSubtitleAnimation('pop')
                            setSubtitleWordLead(0.03)
                            setSubtitleWordTrail(0.04)
                          }}
                          title="Reset to defaults"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Music Volume card directly under the mode group, same width */}
            <div className="px-0" style={{ marginTop: `${standardGap}px` }}>
              <div className="ml-auto mr-2" style={{ width: modeContainerWidth ? `${modeContainerWidth}px` : undefined }}>
                <div className="rounded-[14px] text-white/90 border border-white/[0.04] overflow-hidden relative" style={{ background: 'radial-gradient(circle at 30% 30%, #3a3a3a 0%, #2a2a2a 25%, #1a1a1a 70%, #0a0a0a 100%)', boxShadow: 'inset 3px 3px 6px rgba(255,255,255,0.06), inset -3px -3px 6px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)' }}>
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-[11px] tracking-wide text-white/60">Music</div>
                        <div className="text-2xl font-normal">Volume</div>
                      </div>
                      <div className="text-3xl font-normal mt-1">{Math.round(musicVolume * 100)}%</div>
                    </div>
                    <div className="mt-6">
                      <div className="relative h-6 rounded-[10px] overflow-hidden" style={{ background: 'rgba(27,29,34,0.35)', backdropFilter: 'blur(4px)' }}>
                        {/* subtle white glow from the right */}
                        <span className="pointer-events-none absolute inset-0 rounded-full" style={{ background: 'linear-gradient(270deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 60%)' }} />
                        {/* inset slim track with 25% segments */}
                        <div className="absolute top-1/2 -translate-y-1/2" ref={volumeTrackRef} onMouseDown={onStartDragVolume} style={{ left: '2px', right: '2px' }}>
                          <div className="flex gap-[6px] cursor-pointer">
                            {[0, 1, 2, 3].map((i) => (
                              <div key={`seg-${i}`} className="relative flex-1 h-[5px] rounded-[3px] bg-white/10 overflow-hidden">
                                <div className="absolute left-0 top-0 bottom-0 rounded-[3px]" style={{
                                  width: getSegmentFillPercent(i),
                                  background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0.5) 25%, rgba(239, 68, 68, 0.7) 50%, rgba(200, 30, 30, 1) 100%)'
                                }} />
                              </div>
                            ))}
                          </div>
                          {/* liquid glassy knob - longer oval shape */}
                          <div className="absolute top-1/2 -translate-y-1/2 h-6 rounded-full flex items-center justify-center cursor-pointer z-30" onMouseDown={onStartDragVolume} style={{
                            left: `${Math.max(0, Math.min(100, musicVolume * 100))}%`,
                            transform: 'translate(-50%, -50%)',
                            width: '32px',
                            background: 'rgba(255, 255, 255, 0.08)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255, 255, 255, 0.25)',
                            boxShadow: '0 0 0 1px rgba(255,255,255,0.25) inset, 0 2px 6px rgba(0,0,0,0.35)'
                          }}>
                            <Waves className="w-3.5 h-3.5 text-white/80" />
                          </div>
                        </div>
                      </div>
                      <div className="mt-5 flex items-center justify-between text-[12px] text-white/70">
                        <div className="relative">
                          <button
                            className="flex items-center gap-2 hover:bg-white/5 rounded-md px-2 py-1 -ml-2"
                            onClick={() => setShowMusicPopup(v => !v)}
                          >
                            <span className="opacity-80">Study Chill Relax Rep…</span>
                            <ChevronDown className="w-3 h-3" strokeWidth={1.5} />
                          </button>
                          {showMusicPopup && (
                            <div className="absolute left-0 mt-2 z-50 w-64 rounded-[14px] border border-white/15 p-3"
                              style={{ background: 'rgba(20,20,20,0.6)', backdropFilter: 'blur(14px)' }}>
                              <div className="text-white/80 text-sm mb-2">Select background music</div>
                              {['Study Chill Relax','Lo-fi Groove','Ambient Focus','No Music'].map((n) => (
                                <button key={n} className="w-full text-left text-white/85 hover:bg-white/10 rounded-md px-2 py-1">
                                  {n}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          className="p-1 rounded-md hover:bg-white/10"
                          onClick={() => {
                            const v = previewVideoRef.current
                            if (!v) return
                            const next = !isPreviewMuted
                            v.muted = next
                            setIsPreviewMuted(next)
                          }}
                        >
                          {isPreviewMuted ? <VolumeX className="w-5 h-5" strokeWidth={1.5} /> : <Volume2 className="w-5 h-5" strokeWidth={1.5} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Media Background card */}
              <div className="px-0" style={{ marginTop: `${standardGap}px` }}>
                <div ref={mediaBgRef} className="ml-auto mr-2" style={{ width: modeContainerWidth ? `${modeContainerWidth}px` : undefined }}>
                  <div className="rounded-[14px] text-white/90 border border-white/[0.04] overflow-hidden relative" style={{ background: 'radial-gradient(circle at 30% 30%, #3a3a3a 0%, #2a2a2a 25%, #1a1a1a 70%, #0a0a0a 100%)', boxShadow: 'inset 3px 3px 6px rgba(255,255,255,0.06), inset -3px -3px 6px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)' }}>

                    <div className="p-6 relative">
                      {/* Header */}
                      <div className="text-[11px] tracking-wide text-white/60">Media</div>
                      <div className="text-2xl font-normal text-white mt-1">Background</div>
                      {/* Tabs */}
                      <div className="mt-3 flex items-center gap-6 text-[13px] text-white/70">
                        <span className="relative pb-1 after:absolute after:left-0 after:right-0 after:-bottom-[2px] after:h-[2px] after:rounded-full after:bg-white/30">Curves</span>
                        <span className="opacity-80">HSL</span>
                        <span className="opacity-80">Color Wheel</span>
                        <span className="opacity-80">Basic</span>
                      </div>
                      {/* Graph */}
                      <div className="mt-4 h-28 rounded-[12px] bg-gradient-to-b from-white/5 to-transparent relative overflow-hidden border border-white/5">
                        <svg viewBox="0 0 320 110" className="absolute inset-0 w-full h-full">
                          <defs>
                            <linearGradient id="bgLinePurple" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#dc2626" stopOpacity="0.9" />
                              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.8" />
                            </linearGradient>
                            <linearGradient id="bgLineYellow" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#fde047" stopOpacity="0.85" />
                              <stop offset="100%" stopColor="#a3e635" stopOpacity="0.85" />
                            </linearGradient>
                          </defs>
                          {/* Subtle grid */}
                          <g stroke="rgba(255,255,255,0.08)" strokeWidth="1">
                            {Array.from({ length: 8 }).map((_, i) => (
                              <line key={`h-${i}`} x1="0" x2="320" y1={14 * i} y2={14 * i} />
                            ))}
                          </g>
                          {/* Lines */}
                          <path d="M0 90 C 40 70, 80 100, 120 76 C 160 54, 200 84, 240 64 C 270 52, 300 66, 320 58" fill="none" stroke="url(#bgLineYellow)" strokeWidth="2" />
                          <path d="M0 96 C 40 86, 80 64, 120 72 C 160 84, 200 44, 240 60 C 270 74, 300 90, 320 84" fill="none" stroke="url(#bgLinePurple)" strokeWidth="2" />
                          {/* Emphasized section rectangle */}
                          <rect x="200" y="38" width="36" height="72" fill="url(#bgLinePurple)" opacity="0.12" />
                          <rect x="200" y="38" width="36" height="72" fill="url(#bgLineYellow)" opacity="0.08" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Chat assistant card (keep on top visually) */}
              <div className="px-0 mt-2 relative z-30">
                {(() => {
                  return (
                    <div className="fixed right-2 z-50" style={{ width: modeContainerWidth ? `${modeContainerWidth}px` : undefined, top: chatTop, bottom: (typeof projectBottom === 'number' ? Math.max(0, projectBottom - 6) : projectBottom) }}>
                      <div
                        className="relative rounded-[14px] text-white/90 border border-white/[0.04] overflow-hidden h-full min-h-[420px] cursor-pointer"
                        style={{ background: 'radial-gradient(circle at 50% 80%, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.08) 25%, transparent 50%), radial-gradient(circle at 30% 30%, #3a3a3a 0%, #2a2a2a 25%, #1a1a1a 70%, #0a0a0a 100%)', boxShadow: 'inset 3px 3px 6px rgba(255,255,255,0.06), inset -3px -3px 6px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)' }}
                        onClick={() => setShowChatPopup(true)}
                      >
                        <div className="p-6 space-y-4 h-full min-h-0 flex flex-col">
                          {/* Header with avatar and settings icon */}
                          <div className="flex items-start justify-between">
                            <div className="flex flex-col items-start">
                              <div className="relative w-10 h-10 rounded-[12px] border border-white/[0.04] overflow-hidden flex items-center justify-center" style={{ background: 'radial-gradient(circle at 30% 30%, #3a3a3a 0%, #2a2a2a 25%, #1a1a1a 70%, #0a0a0a 100%)', boxShadow: 'inset 2px 2px 4px rgba(255,255,255,0.04), inset -2px -2px 4px rgba(0,0,0,0.3)' }}>
                                <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-3" style={{ background: 'linear-gradient(0deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 90%)' }} />
                                <Avatar className="w-full h-full rounded-[12px]">
                                  <AvatarImage src="https://i.pravatar.cc/64?img=12" />
                                  <AvatarFallback>HH</AvatarFallback>
                                </Avatar>
                              </div>
                              <div className="mt-6">
                                <div className="text-2xl font-normal text-white/95">Hi Mike!</div>
                                <div className="text-2xl font-normal text-white/95">How can I help you?</div>
                              </div>
                            </div>
                            <button
                              className="relative w-10 h-10 rounded-[12px] border border-white/20 flex items-center justify-center overflow-hidden hover:bg-white/10 transition-colors"
                              style={{ background: 'rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(8px)' }}
                              onClick={(e) => {
                                e.stopPropagation()
                                setShowChatPopup(true)
                              }}
                            >
                              <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-3" style={{ background: 'linear-gradient(0deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 90%)' }} />
                              <Maximize2 className="w-6 h-6 text-white/85" strokeWidth={1.2} />
                            </button>
                          </div>

                          {/* Action chips */}
                          <div className="flex-1 space-y-3 overflow-auto mt-3 mb-3 pr-1">
                            {[
                              { icon: <SquarePlay className='w-6 h-6' strokeWidth={1.2} />, title: 'Generate Text', desc: 'Automatically create unique text.' },
                              { icon: <ImageIcon className='w-6 h-6' strokeWidth={1.2} />, title: 'Generate Images', desc: 'Create images for your projects' }
                            ].map((item, idx) => (
                              <button key={idx} className="w-full flex items-center gap-3 pl-2 pr-3 py-2 rounded-[12px] border border-white/20 text-left" style={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)' }}>
                                <div className="relative -ml-1 w-10 h-10 rounded-[12px] flex items-center justify-center border border-white/20 overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(8px)' }}>
                                  {/* subtle bottom glow inside icon tile */}
                                  <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-3" style={{ background: 'linear-gradient(0deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 90%)' }} />
                                  {item.icon}
                                </div>
                                <div className="flex-1">
                                  <div className="text-[13px] font-medium text-white/90">{item.title}</div>
                                  <div className="text-[12px] text-white/70">{item.desc}</div>
                                </div>
                              </button>
                            ))}
                          </div>

                          {/* Chat input */}
                          <div className="mt-3 flex items-center gap-2">
                            <div className="flex-1 rounded-[12px] border border-white/20 px-3 py-3 text-[13px] text-white/90 placeholder-white/60" style={{ background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(10px)' }}>Start typing</div>
                            <button className="w-10 h-10 rounded-[12px] border border-white/20 text-white/80 flex items-center justify-center hover:bg-white/10 transition-colors" style={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)' }}>
                              <Send className="w-5 h-5" strokeWidth={1.2} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })()}

              </div>

              {/* Center Video Preview - smaller vertical Instagram/TikTok style */}
              {(() => {
                const leftGap = 8
                const rightMargin = 8
                const reservedRight = Math.max(280, modeContainerWidth + rightMargin + standardGap)
                const leftOffset = (projectWidth || 480) + leftGap + 8 // Updated for larger transcript panel
                return (
                  <div
                    className="fixed z-20 flex items-center justify-center"
                    style={{ left: leftOffset, right: reservedRight, top: previewTop || projectTop, bottom: projectBottom }}
                  >
                    <div
                      className="relative rounded-[16px] overflow-hidden border border-white/[0.04] aspect-[9/16] shadow-2xl"
                      style={{
                        width: '320px', // Fixed width for Instagram/TikTok style
                        maxHeight: '80%',
                        background: 'radial-gradient(circle at 30% 30%, #3a3a3a 0%, #2a2a2a 25%, #1a1a1a 70%, #0a0a0a 100%)',
                        boxShadow: 'inset 3px 3px 6px rgba(255,255,255,0.06), inset -3px -3px 6px rgba(0,0,0,0.4), 0 8px 32px rgba(0,0,0,0.4)'
                      }}
                    >
                      {loadedMediaUrl ? (
                        <video
                          src={loadedMediaUrl}
                          poster="/placeholder.svg?height=720&width=1280"
                          className="absolute inset-0 w-full h-full"
                          style={{ objectFit: 'cover' }}
                          controls={false}
                          ref={previewVideoRef}
                          onLoadedMetadata={(e) => {
                            const v = e.currentTarget
                            const aspectRatio = (v.videoWidth || 16) / (v.videoHeight || 9)
                            const isVertical = aspectRatio < 1

                            // Set aspect ratio state for container sizing
                            setVideoAspectRatio(aspectRatio)

                            // If vertical, contain to show full video with side pillars
                            v.style.objectFit = isVertical ? 'contain' : 'cover'
                            v.style.backgroundColor = isVertical ? 'black' : 'transparent'
                            const dur = v.duration || 0
                            setPreviewDuration(dur)
                            setVideoDuration(dur)
                            // Sync initial timeline from duration when first loaded
                            setInitialClips(prev => prev.length ? prev : [{ id: 'clip-1', src: loadedMediaUrl, start: 0, duration: Math.max(0.1, dur) }])
                            setAudioSegments([{ start: 0, duration: Math.max(0.1, dur), label: 'Audio' }])
                          }}
                        />
                      ) : (
                        <div className="absolute inset-0 grid place-items-center text-white/60 text-sm">
                          No media loaded
                        </div>
                      )}
                      {isProcessing && (
                        <div className="absolute inset-0 z-40 grid place-items-center" style={{ backdropFilter: 'blur(6px)', background: 'rgba(10,10,10,0.45)' }}>
                          <div className="min-w-[220px] rounded-[14px] border border-white/10 p-4 text-white/90" style={{ background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 50%, rgba(0,0,0,0.35) 100%)', boxShadow: 'inset 2px 2px 4px rgba(255,255,255,0.06), inset -2px -2px 4px rgba(0,0,0,0.35), 0 8px 32px rgba(0,0,0,0.35)' }}>
                            <div className="text-[12px] uppercase tracking-wide text-white/70 mb-1">Working</div>
                            <div className="text-lg font-medium mb-3">{processingStep || 'Preparing...'}</div>
                            <div className="h-2 w-56 rounded-full overflow-hidden bg-white/10">
                              <div className="h-full" style={{ width: `${Math.max(8, Math.min(100, processingProgress || 8))}%`, background: 'linear-gradient(90deg,#ef4444,#f97316)' }} />
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(120% 120% at 50% 50%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.25) 100%)' }} />
                      {/* Visual icon/vector overlays */}
                      {activeVisualOverlays.map((vo, idx) => {
                        // Respect emoji display mode
                        if (subtitleAutoEmojiMode === 'none') return null
                        let pos: React.CSSProperties = {}
                        if (vo.placement === 'topRight') pos = { top: '6%', right: '6%' }
                        else if (vo.placement === 'topLeft') pos = { top: '6%', left: '6%' }
                        else if (vo.placement === 'bottomRight') pos = { bottom: `calc(${subtitleBottomOffset}% + 12%)`, right: '6%' }
                        else if (vo.placement === 'bottomLeft') pos = { bottom: `calc(${subtitleBottomOffset}% + 12%)`, left: '6%' }
                        else if (vo.placement === 'aboveSub') pos = { bottom: `calc(${subtitleBottomOffset}% + 14%)`, left: '50%', transform: 'translateX(-50%)' }
                        else if (vo.placement === 'belowSub') pos = { bottom: `calc(${Math.max(0, subtitleBottomOffset - 14)}%)`, left: '50%', transform: 'translateX(-50%)' }
                        // Force top placement if requested
                        if (subtitleAutoEmojiMode === 'top') {
                          pos = { bottom: `calc(${subtitleBottomOffset}% + 14%)`, left: '50%', transform: 'translateX(-50%)' }
                        }

                        return (
                          <div
                            key={vo.id}
                            className="absolute pointer-events-none select-none"
                            style={{
                              ...pos,
                              transition: subtitleEmojiAnimation ? 'transform 360ms cubic-bezier(0.22,1,0.36,1), opacity 260ms ease-out' : undefined,
                              transform: `${pos.transform || ''} translateY(${isPreviewPlaying ? '0' : '0'})`,
                              opacity: 1
                            }}
                          >
                            <img
                              src={vo.mediaUrl}
                              alt=""
                              style={{ width: vo.size ? `${vo.size}px` : '64px', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.45))' }}
                            />
                          </div>
                        )
                      })}
                      {/* Visible text overlays (clean, small groups, staggered) */}
                      {activeOverlays.slice(0, 1).map((o) => {
                        const pos = o.style?.position || 'bottom'
                        const baseStyle: React.CSSProperties = pos === 'top' ? { top: `${Math.max(0, Math.min(100, subtitlePositionY))}%` } : pos === 'center' ? { top: `${Math.max(0, Math.min(100, subtitlePositionY))}%` } : { bottom: `${subtitleBottomOffset}%` }
                        const styleClass = subtitleStyle === 'hormozi-bold' ? fontAnton.className
                          : subtitleStyle === 'bold-outline' ? fontBebas.className
                            : subtitleStyle === 'neon-glow' ? fontOswald.className
                              : subtitleStyle === 'hormozi-shadow' ? fontAnton.className
                                : subtitleStyle === 'marker-highlight' ? fontMont.className
                                  : subtitleStyle === 'pop-shadow' ? fontMont.className
                                    : subtitleStyle === 'leon-rect' ? fontMont.className
                                      : subtitleStyle === 'kelly' ? fontMont.className
                                        : subtitleStyle === 'submagic-bold' ? ''
                                          : subtitleStyle === 'karaoke-accent' ? fontMont.className
                                            : fontMont.className
                        const textCss: React.CSSProperties = subtitleStyle === 'hormozi-bold'
                          ? { color: subtitleColor, WebkitTextStroke: '2px #000', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 900 }
                          : subtitleStyle === 'bold-outline'
                            ? { color: subtitleColor, WebkitTextStroke: '2px #000', textShadow: '0 2px 0 #000, 0 0 10px rgba(0,0,0,0.35)', textTransform: 'uppercase', fontWeight: 800 }
                            : subtitleStyle === 'neon-glow'
                              ? { color: subtitleColor, textShadow: `0 0 6px ${subtitleColor}, 0 0 14px ${subtitleColor}`, textTransform: 'uppercase', fontWeight: 800 }
                              : subtitleStyle === 'hormozi-shadow'
                                ? { color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 900, textShadow: '0 6px 24px rgba(0,0,0,0.8), 0 2px 0 #000' }
                                : subtitleStyle === 'marker-highlight'
                                  ? { color: subtitleColor, fontWeight: 900 }
                                  : subtitleStyle === 'pop-shadow'
                                    ? { color: subtitleColor, textShadow: '2px 2px 0 #000, 4px 4px 0 rgba(0,0,0,0.25)', fontWeight: 900, textTransform: 'uppercase' }
                                    : subtitleStyle === 'kelly'
                                      ? { color: subtitleColor, WebkitTextStroke: '2px #000', textTransform: 'uppercase', fontWeight: 900, textShadow: '0 2px 0 #000, 0 6px 20px rgba(0,0,0,0.6)' }
                                      : subtitleStyle === 'submagic-bold'
                                        ? { fontFamily: 'Arial, Helvetica, sans-serif', color: '#fff', WebkitTextStroke: '2px #000', fontWeight: 900 }
                                        : subtitleStyle === 'karaoke-accent'
                                          ? { color: '#fff', fontWeight: 900 }
                                          : subtitleStyle === 'leon-rect'
                                            ? { color: '#fff', fontWeight: 900, textTransform: 'uppercase' }
                                            : { color: subtitleColor, fontWeight: 800 }
                        // Apply uppercase preference globally
                        if (subtitleUppercase) (textCss as any).textTransform = 'uppercase'
                        // Word-level timing: use true per-word offsets/durations when available (no uniform staggering)
                        // Preserve real offsets (from ASR words) so variable gaps are respected within the card
                        const tokens = (o.tokens && o.tokens.length
                          ? o.tokens.map(t => ({ w: t.w, offset: Math.max(0, t.offset), dur: Math.max(0.02, t.dur) }))
                          : o.text.split(' ').map((w, i, arr) => ({
                              w,
                              offset: (i * (o.duration / Math.max(1, arr.length))),
                              dur: Math.max(0.02, o.duration / Math.max(1, arr.length))
                            }))
                        )
                        // Ensure tokens stay within card bounds if fallback is used
                        const totalEnd = Math.max(...tokens.map(t => t.offset + t.dur))
                        if (totalEnd > o.duration && (!o.tokens || !o.tokens.length)) {
                          const scale = o.duration / totalEnd
                          for (let i = 0; i < tokens.length; i++) {
                            tokens[i].dur *= scale
                            // keep offsets proportional in fallback case
                            tokens[i].offset *= scale
                          }
                        }
                        // Decide splits for multi-line layout (enforce up to subtitleMaxLines)
                        let breakIndices: number[] = []
                        const maxLines = Math.max(1, Math.min(3, subtitleMaxLines))
                        const maxBreaks = Math.max(0, Math.min(2, maxLines - 1))
                        if (maxBreaks > 0 && tokens.length >= 2 * (maxBreaks + 1)) {
                          const aiLineBreakIdx = transcriptSegments.find(s => previewCurrent >= s.startTime && previewCurrent <= s.endTime)?.lineBreakIndex
                          if (typeof aiLineBreakIdx === 'number' && aiLineBreakIdx > 0 && aiLineBreakIdx < tokens.length - 1) {
                            breakIndices.push(aiLineBreakIdx)
                          }
                          // Char-length guided splitting
                          if (breakIndices.length < maxBreaks) {
                            let currentLen = 0
                            for (let i = 0; i < tokens.length; i++) {
                              const addLen = (currentLen > 0 ? 1 : 0) + (tokens[i].w || '').length
                              const testLen = currentLen + addLen
                              if (testLen > subtitleLineCharMax && breakIndices.length < maxBreaks) {
                                if (i > 0 && i < tokens.length - 1) breakIndices.push(i)
                                currentLen = (tokens[i].w || '').length
                              } else {
                                currentLen = testLen
                              }
                            }
                          }
                          // Balanced fallback
                          if (breakIndices.length < maxBreaks) {
                            const perLine = Math.ceil(tokens.length / Math.min(maxLines, 3))
                            for (let j = 1; j <= maxBreaks; j++) {
                              const idx = perLine * j
                              if (idx > 0 && idx < tokens.length - 1 && !breakIndices.includes(idx)) breakIndices.push(idx)
                            }
                          }
                          breakIndices = Array.from(new Set(breakIndices)).sort((a, b) => a - b).slice(0, maxBreaks)
                        }
                        // Hard-enforce line budget by inserting breaks on overflows if needed
                        if (maxBreaks > 0) {
                          let currentLen = 0
                          const enforced: number[] = []
                          for (let i = 0; i < tokens.length; i++) {
                            const addLen = (currentLen > 0 ? 1 : 0) + (tokens[i].w || '').length
                            if (currentLen + addLen > subtitleLineCharMax && enforced.length < maxBreaks) {
                              if (i > 0 && i < tokens.length - 1 && !breakIndices.includes(i)) enforced.push(i)
                              currentLen = (tokens[i].w || '').length
                            } else {
                              currentLen += addLen
                            }
                          }
                          breakIndices = Array.from(new Set([...breakIndices, ...enforced])).sort((a, b) => a - b).slice(0, maxBreaks)
                        }
                        // Don't render subtitles while processing
                        if (isProcessingSubtitles) return null
                        
                        const makeAnim = (delaySec: number, durSec: number) => {
                          // Return longhand animation properties to avoid mixing with animationPlayState
                          const d = Math.max(0.04, durSec)
                          const name = subtitleAnimation === 'fade' ? 'fadeIn' : (subtitleAnimation === 'slideUp' ? 'slideUp' : 'captionPop')
                          if (!subtitleAnimEnabled) {
                            return { name: 'none', duration: '0s', timingFunction: 'linear', delay: '0s', fillMode: 'none' } as const
                          }
                          return { name, duration: `${d}s`, timingFunction: 'ease-out', delay: `${delaySec}s`, fillMode: 'both' } as const
                        }
                        return (
                          <div key={o.id} className="absolute left-0 right-0 text-center" style={baseStyle}>
                            {subtitleStyle === 'leon-rect' ? (
                              <span className={`${styleClass}`} style={{ fontSize: (o.style?.fontSize || subtitleFontSize), ...textCss }}>{o.text}</span>
                            ) : (
                              (() => {
                                const isKaraoke = subtitleStyle === 'karaoke-accent'
                                // Compute karaoke fade-out after last spoken word (with trail)
                                const karaokeFadeOut = 0.12
                                let containerOpacityInner = 1
                                const endOffsets = tokens.map(t => t.offset + t.dur)
                                const speechEndWithin = endOffsets.length ? Math.max(...endOffsets) + Math.max(0, subtitleWordTrail) : o.duration
                                const speechEndAbs = o.start + speechEndWithin
                                if (isKaraoke) {
                                  const timeAfterLast = previewCurrent - speechEndAbs
                                  containerOpacityInner = timeAfterLast > 0 ? Math.max(0, 1 - (timeAfterLast / karaokeFadeOut)) : 1
                                }

                                // Determine single active word index for karaoke highlighting (strict on-time, smooth)
                                let activeIdx = -1
                                if (isKaraoke) {
                                  const epsilon = 0.02 // 20ms tolerance; ensures we never skip a word on tiny timing drift
                                  for (let i = 0; i < tokens.length; i++) {
                                    const startAbs = o.start + Math.max(0, tokens[i].offset)
                                    const endAbs = startAbs + Math.max(0.02, tokens[i].dur)
                                    if (previewCurrent >= (startAbs - epsilon) && previewCurrent <= (endAbs + epsilon)) {
                                      activeIdx = i
                                      break
                                    }
                                  }
                                }

                                return (() => {
                                  const maxLines = Math.max(1, Math.min(3, subtitleMaxLines))
                                  const charLimit = 14
                                  const letters = (s: string) => (s.replace(/\s+/g, ''))
                                  const countLetters = (arr: typeof tokens) => letters(arr.map(t => t.w).join(' ')).length
                                  const shouldNotEndLine = (w: string) => {
                                    const lw = (w || '').toLowerCase()
                                    if (!lw) return false
                                    if (lw.length <= 3) return true // articles/preps like der, die, das, von, mit
                                    if (/^(der|die|das|den|dem|des|ein|eine|einen|einem|einer|und|oder|sowie|zum|zur|im|in|am|an|auf|bei|mit|nach|vor|für|von|vom|ins|beim)$/i.test(lw)) return true
                                    if (/(er|e|es|en|em)$/i.test(lw)) return true // adjective endings
                                    return false
                                  }
                                  const lines: typeof tokens[] = []
                                  let current: typeof tokens = []
                                  let currentLetters = 0
                                  for (let i = 0; i < tokens.length; i++) {
                                    const tk = tokens[i]
                                    const wLetters = letters(tk.w).length
                                    const willExceed = (currentLetters + wLetters) > charLimit
                                    if (!willExceed) {
                                      current.push(tk)
                                      currentLetters += wLetters
                                    } else {
                                      if (current.length > 0) {
                                        const last = current[current.length - 1]
                                        const lastLetters = letters(last.w).length
                                        if (shouldNotEndLine(last.w) && (lastLetters + wLetters) <= charLimit) {
                                          current.pop()
                                          currentLetters -= lastLetters
                                          lines.push([...current])
                                          current = [last, tk]
                                          currentLetters = lastLetters + wLetters
                                        } else {
                                          lines.push([...current])
                                          current = [tk]
                                          currentLetters = wLetters
                                        }
                                      } else {
                                        current.push(tk)
                                        currentLetters = wLetters
                                      }
                                    }
                                  }
                                  if (current.length) lines.push([...current])
                                  const clamped = lines.slice(0, maxLines)

                                  const containerStyle: React.CSSProperties = {
                                    fontSize: (o.style?.fontSize || subtitleFontSize),
                                    lineHeight: 1.18,
                                    ...textCss,
                                    ...(isKaraoke ? { opacity: containerOpacityInner, transition: 'opacity 120ms linear' } : {}),
                                    display: 'inline-block',
                                    whiteSpace: 'normal',
                                    maxHeight: `${Math.ceil(1.18 * (o.style?.fontSize || subtitleFontSize) * maxLines)}px`,
                                    overflow: 'hidden'
                                  }

                                  return (
                                    <span className={`${styleClass}`} style={containerStyle}>
                                      {clamped.map((group, gi) => (
                                        <div key={gi} style={{ whiteSpace: 'nowrap' }}>
                                          {group.map((tk, idx) => (
                                            <span
                                              key={idx}
                                              className="mr-1"
                                              style={{
                                                display: 'inline-block',
                                                ...(isKaraoke ? {
                                                } : (subtitleAnimEnabled ? {
                                                  animationName: makeAnim(Math.max(0, (tk.offset - subtitleWordLead)) - (previewCurrent - o.start), Math.max(0.04, tk.dur)).name,
                                                  animationDuration: makeAnim(Math.max(0, (tk.offset - subtitleWordLead)) - (previewCurrent - o.start), Math.max(0.04, tk.dur)).duration,
                                                  animationTimingFunction: makeAnim(Math.max(0, (tk.offset - subtitleWordLead)) - (previewCurrent - o.start), Math.max(0.04, tk.dur)).timingFunction,
                                                  animationDelay: makeAnim(Math.max(0, (tk.offset - subtitleWordLead)) - (previewCurrent - o.start), Math.max(0.04, tk.dur)).delay,
                                                  animationFillMode: makeAnim(Math.max(0, (tk.offset - subtitleWordLead)) - (previewCurrent - o.start), Math.max(0.04, tk.dur)).fillMode,
                                                } : { animation: 'none' })),
                                                ...(isKaraoke ? {} : (subtitleAnimEnabled ? { animationPlayState: isPreviewPlaying ? 'running' : 'paused' } : { animation: 'none' })),
                                                ...(subtitleStyle === 'submagic-bold' ? (() => {
                                                  const weightMapLocal: Record<'Light' | 'Regular' | 'Medium' | 'Bold' | 'Heavy', number> = { Light: 300, Regular: 400, Medium: 600, Bold: 800, Heavy: 900 }
                                                  const strokePxLocal = subtitleStrokeWeight === 'large' ? 3 : (subtitleStrokeWeight === 'medium' ? 2 : (subtitleStrokeWeight === 'small' ? 1 : 0))
                                                  const colorIdx = (gi + idx) % 3
                                                  const cycColor = colorIdx === 0 ? subtitleColor : (colorIdx === 1 ? subtitleSecondColor : subtitleThirdColor)
                                                  return {
                                                    color: (colorIdx === 2) ? subtitleAccentColor : (cycColor || (textCss.color as string)),
                                                    WebkitTextStroke: strokePxLocal > 0 ? `${strokePxLocal}px ${subtitleStrokeColor}` : undefined,
                                                    fontWeight: weightMapLocal[subtitleFontWeight] ?? 800
                                                  }
                                                })() : {}),
                                                ...(isKaraoke ? {
                                                  color: (idx === activeIdx) ? subtitleAccentColor : (textCss.color as string),
                                                  transition: 'color 120ms linear, transform 120ms ease-out',
                                                  transform: (idx === activeIdx) ? 'scale(1.04)' : 'scale(1.0)'
                                                } : {})
                                              }}
                                            >
                                              {tk.w}
                                            </span>
                                          ))}
                                        </div>
                                      ))}
                                    </span>
                                  )
                                })()
                              })()
                            )}
                          </div>
                        )
                      })}
                      {/* Glassy controls */}
                      <div className="absolute left-4 right-4 bottom-2 flex items-center justify-between gap-4">
                        {/* Left glass group */}
                        <div className="flex items-center gap-2">
                          <div className="h-8 px-3 rounded-[10px] bg-white/15 hover:bg-white/25 text-white/90 border border-white/20 backdrop-blur-md flex items-center gap-2" style={{ WebkitBackdropFilter: 'blur(8px)' }}>
                            <button onClick={togglePreviewPlay} className="grid place-items-center w-8 h-8 rounded-[8px] bg-white/10 border border-white/20 text-white/90">
                              {isPreviewPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                            </button>
                            <span className="text-[12px] tabular-nums font-light">{formatClock(previewCurrent)} / {formatClock(previewDuration)}</span>
                            <button onClick={(e) => { e.stopPropagation(); togglePreviewMute(); }} className="ml-1 grid place-items-center w-7 h-7 rounded-[8px] bg-white/10 border border-white/20 text-white/90">
                              {isPreviewMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation()
                                try {
                                  setIsProcessing(true)
                                  setProcessingStep('Finding visuals for key moments...')
                                  setProcessingProgress(85)
                                  await generateVisualOverlaysFromTranscript()
                                  setProcessingStep('Applying visuals...')
                                  setProcessingProgress(96)
                                  await new Promise(r => setTimeout(r, 350))
                                } finally {
                                  setIsProcessing(false)
                                  setProcessingProgress(0)
                                  setProcessingStep('')
                                }
                              }}
                              className="ml-1 grid place-items-center h-7 px-2 rounded-[8px] bg-white/10 border border-white/20 text-white/90 text-[12px]"
                              title="Find visuals for this transcript"
                            >
                              Find Visuals
                            </button>
                          </div>
                        </div>
                        {/* Center glass progress bar */}
                        <div className="flex-1">
                          <div className="rounded-[10px] h-7 px-3 bg-white/15 border border-white/20 backdrop-blur-md flex items-center" style={{ WebkitBackdropFilter: 'blur(8px)' }}>
                            <div className="relative w-full h-2 rounded-full overflow-hidden bg-white/20">
                              <div className="absolute inset-y-0 left-0" style={{ width: `${previewDuration ? (previewCurrent / previewDuration) * 100 : 0}%`, background: 'linear-gradient(90deg,#a78bfa,#f472b6)' }} />
                            </div>
                          </div>
                        </div>
                        {/* Right glass group */}
                        <div className="flex items-center gap-2">
                          <button onClick={() => seekRelative(-5)} className="h-9 w-9 rounded-[10px] bg-white/15 hover:bg-white/25 text-white/90 border border-white/20 backdrop-blur-md grid place-items-center" title="Back 5s" style={{ WebkitBackdropFilter: 'blur(8px)' }}>
                            <RotateCcw className="w-5 h-5" />
                          </button>
                          <button onClick={() => seekRelative(5)} className="h-9 w-9 rounded-[10px] bg-white/15 hover:bg-white/25 text-white/90 border border-white/20 backdrop-blur-md grid place-items-center" title="Forward 5s" style={{ WebkitBackdropFilter: 'blur(8px)' }}>
                            <RotateCw className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
            {/* Clean minimal timeline (floating rounded panel) */}
            <div className="relative z-20">
              {(() => {
                const gap = standardGap
                const rightMargin = 8
                const reservedRight = modeContainerWidth + rightMargin + gap
                const timelineDuration = initialClips.length === 0 ? totalDuration : Math.ceil(initialClips.reduce((max, c) => Math.max(max, c.start + c.duration), 0))
                return <CleanTimeline rightOffset={reservedRight} gapPx={gap} currentTime={currentTime} duration={timelineDuration} onSeek={setCurrentTime} initialClips={initialClips} textOverlays={textOverlays} onTextChange={onTextChange} showTextElements={showTextElements} showVideoClips={showVideoClips} showAudioElements={showAudioElements} onToggleTextElements={() => setShowTextElements(!showTextElements)} onToggleVideoClips={() => setShowVideoClips(!showVideoClips)} onToggleAudioElements={() => setShowAudioElements(!showAudioElements)} />
              })()}
            </div>
          </div>
        )}

        {/* Project Video Panel Popup */}
        {showProjectVideoPanel && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setShowProjectVideoPanel(false)}>
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <div
              className="relative w-full h-full max-w-4xl max-h-[90vh] rounded-[20px] text-white/90 border border-white/[0.04] overflow-hidden flex flex-col"
              style={{ background: 'radial-gradient(circle at 30% 30%, #3a3a3a 0%, #2a2a2a 25%, #1a1a1a 70%, #0a0a0a 100%)', boxShadow: 'inset 3px 3px 6px rgba(255,255,255,0.06), inset -3px -3px 6px rgba(0,0,0,0.4), 0 20px 40px rgba(0,0,0,0.5)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <div className="text-2xl font-normal text-white/90">Projekt Video</div>
                <button
                  className="relative w-10 h-10 rounded-full border border-white/20 flex items-center justify-center overflow-hidden hover:bg-white/10 transition-colors"
                  style={{ background: 'rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(8px)' }}
                  onClick={() => setShowProjectVideoPanel(false)}
                >
                  <X className="w-5 h-5 text-white/85" strokeWidth={1.2} />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-hidden">
                {/* Search and filter */}
                <div className="p-6 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" strokeWidth={1.5} />
                      <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search media" className="pl-9 h-10 rounded-[10px] border-white/30 text-white placeholder:text-white/60 bg-transparent" />
                    </div>
                    <button onClick={() => setFilterKind((k) => (k === 'all' ? 'photo' : k === 'photo' ? 'video' : 'all'))} className="h-10 w-10 rounded-[10px] hover:bg-white/5 border border-white/30 flex items-center justify-center text-white/90" title="Filter" aria-label="Filter">
                      <Filter className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>

                {/* Media grid */}
                <div className="flex-1 overflow-y-auto p-6">
                  {filteredMedia.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-white/70 text-lg mb-2">No media found</div>
                      <div className="text-white/50 text-sm">Upload videos and images to get started</div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {filteredMedia.map((item, index) => (
                        <div key={index} className="aspect-video rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                          <div className="w-full h-full flex items-center justify-center text-white/60">
                            <ImageIcon className="w-8 h-8" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Chat Popup */}
        {showChatPopup && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-2" onClick={() => setShowChatPopup(false)}>
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <div
              className="relative w-full h-full max-w-7xl max-h-[95vh] rounded-[20px] text-white/90 border border-white/[0.04] overflow-hidden flex flex-col"
              style={{ background: 'radial-gradient(circle at 50% 80%, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.08) 25%, transparent 50%), radial-gradient(circle at 30% 30%, #3a3a3a 0%, #2a2a2a 25%, #1a1a1a 70%, #0a0a0a 100%)', boxShadow: 'inset 3px 3px 6px rgba(255,255,255,0.06), inset -3px -3px 6px rgba(0,0,0,0.4), 0 20px 40px rgba(0,0,0,0.5)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 rounded-full border border-white/20 overflow-hidden flex items-center justify-center" style={{ background: 'rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(8px)' }}>
                      <Avatar className="w-full h-full rounded-full">
                        <AvatarImage src="https://i.pravatar.cc/64?img=12" />
                        <AvatarFallback>HH</AvatarFallback>
                      </Avatar>
                    </div>
                    <div>
                      <div className="text-lg font-medium text-white/95">AI Assistant</div>
                      <div className="text-sm text-white/60">Ready to help</div>
                    </div>
                  </div>
                  <button
                    className="relative w-10 h-10 rounded-full border border-white/20 flex items-center justify-center overflow-hidden hover:bg-white/10 transition-colors"
                    style={{ background: 'rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(8px)' }}
                    onClick={() => setShowChatPopup(false)}
                  >
                    <X className="w-5 h-5 text-white/85" strokeWidth={1.2} />
                  </button>
                </div>

                {/* Chat Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {/* Welcome Message */}
                  <div className="flex items-start gap-3">
                    <div className="relative w-8 h-8 rounded-full border border-white/20 overflow-hidden flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(8px)' }}>
                      <Avatar className="w-full h-full rounded-full">
                        <AvatarImage src="https://i.pravatar.cc/64?img=12" />
                        <AvatarFallback>AI</AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="flex-1">
                      <div className="text-white/95 text-sm leading-relaxed">
                        Hi Mike! I'm here to help you with your video editing and content creation. What would you like to work on today?
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
                    {[
                      { icon: <SquarePlay className='w-5 h-5' strokeWidth={1.2} />, title: 'Generate Text', desc: 'Create unique text for your videos' },
                      { icon: <ImageIcon className='w-5 h-5' strokeWidth={1.2} />, title: 'Generate Images', desc: 'Create stunning images' },
                      { icon: <Wand2 className='w-5 h-5' strokeWidth={1.2} />, title: 'AI Enhancements', desc: 'Improve your content' },
                      { icon: <MessageSquare className='w-5 h-5' strokeWidth={1.2} />, title: 'Content Ideas', desc: 'Get creative suggestions' }
                    ].map((item, idx) => (
                      <button key={idx} className="w-full flex items-center gap-3 p-4 rounded-xl border border-white/20 text-left" style={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)' }}>
                        <div className="relative w-10 h-10 rounded-xl flex items-center justify-center border border-white/20 overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(8px)' }}>
                          {item.icon}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-white/90">{item.title}</div>
                          <div className="text-xs text-white/70">{item.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chat Input */}
                <div className="p-6 border-t border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 rounded-xl border border-white/20 px-4 py-3 text-sm text-white/90 placeholder-white/60" style={{ background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(10px)' }}>
                      Type your message here...
                    </div>
                    <button className="w-10 h-10 rounded-xl border border-white/20 text-white/80 flex items-center justify-center" style={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)' }}>
                      <Send className="w-5 h-5" strokeWidth={1.2} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}




