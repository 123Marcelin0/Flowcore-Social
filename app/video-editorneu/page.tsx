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
import { Waves } from "lucide-react"
import { Plus_Jakarta_Sans, Anton, Bebas_Neue, Oswald, Montserrat } from "next/font/google"
import SubtitleStyleSelector from "@/components/SubtitleStyleSelector"
import { TranscriptEditor } from "@/components/transcript-editor"
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

type TextOverlay = { id: string; start: number; duration: number; text: string; style?: { position?: "top" | "center" | "bottom"; fontSize?: number; color?: string } }

function CleanTimeline({ rightOffset = 16, gapPx = 4, currentTime = 0, duration = 60, onSeek, initialClips, textOverlays = [], onTextChange, showTextElements = true, showVideoClips = true, showAudioElements = true, onToggleTextElements, onToggleVideoClips, onToggleAudioElements }: { rightOffset?: number; gapPx?: number; currentTime?: number; duration?: number; onSeek?: (sec: number) => void; initialClips?: Array<{ id: string; src: string; start: number; duration: number }>; textOverlays?: Array<{ id: string; start: number; duration: number; text: string }>; onTextChange?: (id: string, updates: Partial<{ start: number; duration: number }>) => void; showTextElements?: boolean; showVideoClips?: boolean; showAudioElements?: boolean; onToggleTextElements?: () => void; onToggleVideoClips?: () => void; onToggleAudioElements?: () => void }) {
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

  const generateThumbnails = useCallback(async (id: string, src: string, frames: number = 4) => {
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

      const times = Array.from({ length: frames }, (_, i) => (assetDur * (i + 1)) / (frames + 1))
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

  // Generate thumbs on mount or when sources change
  useEffect(() => {
    demoClips.forEach(c => {
      if (!thumbsById[c.id]) generateThumbnails(c.id, c.src)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoClips.map(c => c.src).join('|')])

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
                        {Array.isArray(thumbsById[clip.id]) && thumbsById[clip.id].length > 0 ? (
                          thumbsById[clip.id].map((thumb, idx) => (
                            thumb ? (
                              <img key={idx} src={thumb} alt="frame" className="flex-1 object-cover" />
                            ) : (
                              <div key={idx} className="flex-1 bg-gradient-to-br from-indigo-100 to-pink-100" />
                            )
                          ))
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-indigo-100 to-pink-100" />
                        )}
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
                  {[
                    { start: 5, duration: 15, label: "Intro Audio" },
                    { start: 25, duration: 20, label: "Main Audio" },
                    { start: 50, duration: 10, label: "Outro" }
                  ].map((segment, i) => (
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
                          {/* Compact waveform bars */}
                          {Array.from({ length: Math.floor((segment.duration * pixelsPerSecond) / 2.5) }).map((_, j) => {
                            const x = j * 2.5
                            const height = Math.max(0.5, Math.sin((i * 50 + j) * 0.15) * 6 + Math.random() * 4 + 3)
                            return (
                              <rect
                                key={j}
                                x={x}
                                y={16 - height / 2}
                                width="2"
                                height={height}
                                fill={`url(#audioWaveGrad${i})`}
                                opacity="0.8"
                                rx="0.5"
                              />
                            )
                          })}
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
  const [showTranscriptView, setShowTranscriptView] = useState<boolean>(true) // Default to true for transcript-first layout
  const [showProjectVideoPanel, setShowProjectVideoPanel] = useState<boolean>(false)

  // Transcript segments state
  const [transcriptSegments, setTranscriptSegments] = useState([
    {
      id: "ts1",
      text: "Welcome to our video editor. This is a revolutionary new way to edit videos using transcript-first workflow.",
      startTime: 0,
      endTime: 4.5,
      speaker: "Narrator"
    },
    {
      id: "ts2",
      text: "You can click on any word or phrase to jump directly to that point in the video.",
      startTime: 4.5,
      endTime: 8.2,
      speaker: "Narrator"
    },
    {
      id: "ts3",
      text: "Edit, cut, and split segments directly from the transcript. Changes are reflected instantly in the video preview.",
      startTime: 8.2,
      endTime: 13.8,
      speaker: "Narrator"
    },
    {
      id: "ts4",
      text: "This workflow is inspired by tools like Submagic and makes video editing much more intuitive and efficient.",
      startTime: 13.8,
      endTime: 19.5,
      speaker: "Narrator"
    }
  ])
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

  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([
    { id: 't1', start: 1, duration: 4, text: 'Welcome to the video editor' },
    { id: 't2', start: 6, duration: 3, text: 'This is a demo text overlay' },
    { id: 't3', start: 10, duration: 5, text: 'You can edit and move these text elements' }
  ])

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
  const [videoDuration, setVideoDuration] = useState<number>(0)

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
    }
    const onTime = () => setPreviewCurrent(v.currentTime || 0)
    const onPlay = () => setIsPreviewPlaying(true)
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
  }, [previewVideoRef.current])

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

  // Smooth caption entrance animation keyframes (css-in-js fallback)
  // We rely on globals.css @keyframes captionPop (already present from previous work). If missing, fall back via inline scale+fade.

  // Actions
  const onAddText = useCallback(() => {
    setTextOverlays(prev => [...prev, { id: `t${Date.now()}`, start: snapTo(previewCurrent), duration: 3, text: 'New text', style: { position: 'bottom', fontSize: 26, color: '#ffffff' } }])
  }, [previewCurrent, snapTo])

  const onTextChange = useCallback((id: string, updates: Partial<{ start: number; duration: number }>) => {
    setTextOverlays(prev => prev.map(t => t.id === id ? { ...t, ...updates } as TextOverlay : t))
  }, [])

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
      setUploadedFile(file)
    } else {
      alert('Please upload a video file (MP4, MOV, AVI)')
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

      // Add a small delay to show the transcription step
      await new Promise(resolve => setTimeout(resolve, 1000))

      setProcessingStep('Analyzing speech patterns and segments...')
      setProcessingProgress(35)

      const { data: sessionData } = await supabase.auth.getSession()
      const token2 = sessionData.session?.access_token || ''

      // Add timeout and retry logic for the pipeline
      const pipelineCall = async (retryCount = 0): Promise<Response> => {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 300000) // 5 minute timeout

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
              generateFiles: true,
              instagramFormat: 'portrait'
            }),
            signal: controller.signal
          })
          clearTimeout(timeoutId)
          return resp
        } catch (error: any) {
          clearTimeout(timeoutId)
          if (error.name === 'AbortError') {
            throw new Error('Pipeline processing timed out after 5 minutes')
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
        console.error('Pipeline API Error:', { status: resp.status, response: t })
        throw new Error(`Pipeline failed: ${resp.status} (${t || 'terminated'})`)
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
            confidence: 0.95
          }))
          setTranscriptSegments(transcriptSegs)

          console.log(`Loaded ${transcriptSegs.length} transcript segments`)

          // auto-open transcript so user can immediately tweak styles
          setShowTranscriptView(true)
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

      // Add a brief delay to show completion
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Complete processing
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
      } else if (errorMessage.includes('timeout')) {
        userMessage = 'Processing timed out. Would you like to try with the original video?'
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
  }, [uploadedFile, scriptText])

  return (
    <ProtectedRoute fallback={<LoginPage />}>
      <div className={jakarta.className}>
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
          // Media Processing View - Clean and Simple
          <div className="relative w-full h-screen bg-black text-white overflow-hidden flex items-center justify-center">
            <div className="max-w-4xl w-full mx-auto p-8">
              {/* Header */}
              <div className="text-center mb-12">
                <h1 className="text-5xl font-normal text-white mb-4">Media Processing</h1>
                <p className="text-xl text-white/70">Upload and process your speaker-to-camera videos with AI</p>
              </div>

              {/* Upload Area */}
              <div className="relative mb-8">
                <div
                  className="rounded-[24px] border-2 border-dashed border-white/20 p-16 text-center bg-gradient-to-br from-white/5 to-transparent backdrop-blur-md transition-all"
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)'
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault()
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                    const files = Array.from(e.dataTransfer.files)
                    if (files.length > 0) {
                      handleFileUpload(files[0])
                    }
                  }}
                >
                  <div className="flex flex-col items-center gap-6">
                    <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md">
                      <SquarePlay className="w-10 h-10 text-white/80" strokeWidth={1.2} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-medium text-white mb-2">
                        {uploadedFile ? uploadedFile.name : 'Drop your video here'}
                      </h3>
                      <p className="text-white/60">
                        {uploadedFile ? `${(uploadedFile.size / 1024 / 1024).toFixed(1)} MB` : 'Support for MP4, MOV, AVI up to 2GB'}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleFileUpload(file)
                        }}
                        className="hidden"
                        id="video-upload"
                      />
                      <label
                        htmlFor="video-upload"
                        className="px-8 py-3 rounded-[14px] bg-white/10 border border-white/20 text-white hover:bg-white/15 transition-all backdrop-blur-md cursor-pointer"
                      >
                        {uploadedFile ? 'Choose Different File' : 'Choose File'}
                      </label>

                      {/* Subtle script button */}
                      <button
                        onClick={() => setShowScriptPopup(true)}
                        className="px-4 py-2 rounded-[10px] bg-white/5 border border-white/10 text-white/60 hover:text-white/80 hover:bg-white/10 transition-all text-sm flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4" strokeWidth={1.5} />
                        {scriptText.trim() ? 'Edit Script' : 'Add Script'}
                      </button>
                    </div>
                    {scriptText.trim() && (
                      <div className="mt-2 px-3 py-1 rounded-[8px] bg-white/5 border border-white/10">
                        <p className="text-white/70 text-sm">Script added ({scriptText.length} characters)</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Processing Options */}
              <div className="grid grid-cols-2 gap-6 mb-12">
                <div className="rounded-[18px] border border-white/10 p-6 bg-gradient-to-br from-white/5 to-transparent backdrop-blur-md">
                  <h4 className="text-lg font-medium text-white mb-2">Auto Crop</h4>
                  <p className="text-white/60 text-sm">Automatically crop to speaker focus</p>
                </div>
                <div className="rounded-[18px] border border-white/10 p-6 bg-gradient-to-br from-white/5 to-transparent backdrop-blur-md">
                  <h4 className="text-lg font-medium text-white mb-2">Noise Reduction</h4>
                  <p className="text-white/60 text-sm">Clean audio with AI enhancement</p>
                </div>
                <div className="rounded-[18px] border border-white/10 p-6 bg-gradient-to-br from-white/5 to-transparent backdrop-blur-md">
                  <h4 className="text-lg font-medium text-white mb-2">Auto Subtitles</h4>
                  <p className="text-white/60 text-sm">Generate subtitles automatically</p>
                </div>
                <div className="rounded-[18px] border border-white/10 p-6 bg-gradient-to-br from-white/5 to-transparent backdrop-blur-md">
                  <h4 className="text-lg font-medium text-white mb-2">Smart Segments</h4>
                  <p className="text-white/60 text-sm">Intelligent scene detection</p>
                </div>
              </div>

              {/* Processing Progress - Centered Overlay */}
              {isProcessing && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
                  <div className="max-w-md w-full mx-4">
                    <div className="rounded-[24px] border border-white/20 p-8 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md text-center">
                      <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 rounded-full border-4 border-red-500/30 border-t-red-500 animate-spin" />
                      </div>
                      <h4 className="text-2xl font-medium text-white mb-2">Processing Video</h4>
                      <p className="text-white/80 text-lg mb-6">{processingStep}</p>

                      <div className="w-full bg-white/20 rounded-full h-3 mb-4">
                        <div
                          className="bg-gradient-to-r from-red-500 to-red-600 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${processingProgress}%` }}
                        />
                      </div>
                      <p className="text-white/70">{Math.round(processingProgress)}% complete</p>

                      <div className="mt-6 text-white/60 text-sm">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-2 h-2 bg-white/40 rounded-full animate-pulse" />
                          <span>Please don't close this window</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Script Popup */}
              {showScriptPopup && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                  <div className="max-w-2xl w-full mx-4">
                    <div className="rounded-[20px] border border-white/20 p-6 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-medium text-white">Add Script (Optional)</h3>
                        <button
                          onClick={() => setShowScriptPopup(false)}
                          className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all"
                        >
                          ×
                        </button>
                      </div>
                      <p className="text-white/60 text-sm mb-4">
                        Paste your script here to compare with the transcribed audio for better accuracy.
                      </p>
                      <textarea
                        value={scriptText}
                        onChange={(e) => setScriptText(e.target.value)}
                        placeholder="Paste your script here..."
                        className="w-full h-48 p-4 rounded-[12px] bg-white/5 border border-white/20 text-white placeholder:text-white/40 resize-none focus:outline-none focus:border-white/40 transition-all"
                      />
                      <div className="flex justify-between items-center mt-4">
                        <p className="text-white/50 text-sm">
                          {scriptText.length} characters
                        </p>
                        <div className="flex gap-3">
                          <button
                            onClick={() => {
                              setScriptText('')
                              setShowScriptPopup(false)
                            }}
                            className="px-4 py-2 rounded-[10px] border border-white/20 text-white/60 hover:text-white/80 hover:bg-white/5 transition-all"
                          >
                            Clear & Close
                          </button>
                          <button
                            onClick={() => handleScriptSave(scriptText)}
                            className="px-6 py-2 rounded-[10px] bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/30 text-white hover:from-red-500/30 hover:to-red-600/30 transition-all"
                          >
                            Save Script
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => {
                    setShowMediaView(false)
                    setActiveMode('video')
                  }}
                  className="px-6 py-3 rounded-[14px] border border-white/30 text-white/90 hover:bg-white/5 transition-all"
                  disabled={isProcessing}
                >
                  Back to Editor
                </button>
                <button
                  onClick={processVideo}
                  disabled={!uploadedFile || isProcessing}
                  className={`px-8 py-3 rounded-[14px] transition-all backdrop-blur-md ${uploadedFile && !isProcessing
                    ? 'bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/30 text-white hover:from-red-500/30 hover:to-red-600/30'
                    : 'bg-white/5 border border-white/20 text-white/50 cursor-not-allowed'
                    }`}
                >
                  {isProcessing ? 'Processing...' : 'Process with AI'}
                </button>

                {uploadedFile && !isProcessing && (
                  <button
                    onClick={async () => {
                      // Skip processing and load original video directly
                      try {
                        setIsProcessing(true)
                        setProcessingStep('Uploading video...')
                        setProcessingProgress(50)

                        const formData = new FormData()
                        formData.append('file', uploadedFile)
                        formData.append('fileType', 'video')

                        const session = await supabase.auth.getSession()
                        const token = session.data.session?.access_token || ''

                        const response = await fetch('/api/media-upload', {
                          method: 'POST',
                          headers: token ? { Authorization: `Bearer ${token}` } : {},
                          body: formData
                        })

                        if (!response.ok) throw new Error('Upload failed')

                        const result = await response.json()
                        const mediaId = result?.data?.id || result?.data?.[0]?.id
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
                          console.log('Loaded original video without processing')
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
                    className="px-6 py-3 rounded-[14px] transition-all backdrop-blur-md bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/30"
                  >
                    Skip Processing
                  </button>
                )}
              </div>
            </div>
          </div>
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
                    onClick={() => { setActiveTool('text'); setShowTranscriptView(true) }}
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
                <TranscriptEditor
                  segments={transcriptSegments}
                  currentTime={previewCurrent}
                  isPlaying={isPreviewPlaying}
                  onSeek={handleTranscriptSeek}
                  onPlay={() => togglePreviewPlay()}
                  onPause={() => togglePreviewPlay()}
                  onSegmentEdit={handleTranscriptSegmentEdit}
                  onSegmentSplit={handleTranscriptSegmentSplit}
                  onSegmentRemove={handleTranscriptSegmentRemove}
                  className="h-full"
                />
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
                    }}
                    className={`relative z-10 h-10 px-5 rounded-[14px] text-sm font-medium capitalize transition-colors ${activeMode === mode ? 'text-white' : 'text-white/70 hover:text-white/85'}`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

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
                        <button className="flex items-center gap-2 hover:bg-white/5 rounded-md px-2 py-1 -ml-2">
                          <span className="opacity-80">Study Chill Relax Rep…</span>
                          <ChevronDown className="w-3 h-3" strokeWidth={1.5} />
                        </button>
                        <button className="p-1 rounded-md hover:bg-white/10"><VolumeX className="w-5 h-5" strokeWidth={1.5} /></button>
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
                            setPreviewDuration(v.duration || 0)
                          }}
                        />
                      ) : (
                        <div className="absolute inset-0 grid place-items-center text-white/60 text-sm">
                          No media loaded
                        </div>
                      )}
                      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(120% 120% at 50% 50%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.25) 100%)' }} />
                      {/* Visible text overlays */}
                      {activeOverlays.slice(0, 1).map((o) => {
                        const pos = o.style?.position || 'bottom'
                        const baseStyle: React.CSSProperties = pos === 'top' ? { top: '8%' } : pos === 'center' ? { top: '45%' } : { bottom: '8%' }
                        const styleClass = subtitleStyle === 'hormozi-bold' ? fontAnton.className
                          : subtitleStyle === 'bold-outline' ? fontBebas.className
                            : subtitleStyle === 'neon-glow' ? fontOswald.className
                              : subtitleStyle === 'hormozi-shadow' ? fontAnton.className
                                : subtitleStyle === 'marker-highlight' ? fontMont.className
                                  : subtitleStyle === 'pop-shadow' ? fontMont.className
                                    : subtitleStyle === 'leon-rect' ? fontMont.className
                                      : subtitleStyle === 'kelly' ? fontMont.className
                                        : subtitleStyle === 'submagic-bold' ? ''
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
                                        : subtitleStyle === 'leon-rect'
                                          ? { color: '#fff', fontWeight: 900, textTransform: 'uppercase' }
                                          : { color: subtitleColor, fontWeight: 800 }
                        return (
                          <div key={o.id} className="absolute left-0 right-0 text-center" style={baseStyle}>
                            {subtitleStyle === 'marker-highlight' ? (
                              <span className={`${styleClass} inline-block px-4 py-2 rounded-md`} style={{ background: 'linear-gradient(180deg, rgba(255,255,0,0.7), rgba(255,255,0,0.2))', fontSize: (o.style?.fontSize || 28), ...textCss }}>
                                {o.text}
                              </span>
                            ) : subtitleStyle === 'submagic-bold' ? (
                              <span className={`inline-block px-4 py-2 rounded-md`} style={{ background: 'rgba(0,0,0,0.35)', fontSize: (o.style?.fontSize || 28), ...textCss }}>
                                {o.text.split(' ').map((w, idx) => (
                                  <span key={idx} className="mr-1" style={{
                                    color: (idx % 3 === 2) ? subtitleAccentColor : textCss.color,
                                    WebkitTextStroke: (idx % 3 === 2) ? '2px #fff' : (textCss as any).WebkitTextStroke || '2px #000',
                                  }}>{w}</span>
                                ))}
                              </span>
                            ) : subtitleStyle === 'kelly' ? (
                              <span className={`${styleClass} inline-block px-4 py-2 rounded-md`} style={{ background: 'rgba(0,0,0,0.35)', fontSize: (o.style?.fontSize || 28), ...textCss }}>
                                {o.text.split(' ').map((w, idx) => (
                                  <span key={idx} style={{ display: 'inline-block', animation: `captionPop .35s ease-out ${idx * 0.06}s both` }} className="mr-1">{w}</span>
                                ))}
                              </span>
                            ) : subtitleStyle === 'leon-rect' ? (
                              <span className={`${styleClass} inline-block px-1.5 py-[2px] rounded`} style={{ background: 'rgba(249,115,22,0.85)', fontSize: (o.style?.fontSize || 28), ...textCss }}>
                                {o.text}
                              </span>
                            ) : (
                              <span className={`${styleClass} inline-block px-4 py-2 rounded-md`} style={{ background: 'rgba(0,0,0,0.35)', fontSize: (o.style?.fontSize || 28), ...textCss }}>
                                {o.text}
                              </span>
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


