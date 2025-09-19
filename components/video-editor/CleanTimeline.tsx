"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import { Eye, Lock, Mic, PencilOff, Type as TypeIcon } from "lucide-react"

type TextOverlay = { id: string; start: number; duration: number; text: string }

export function CleanTimeline({ rightOffset = 16, gapPx = 4, currentTime = 0, duration = 60, onSeek, initialClips, textOverlays = [], onTextChange, showTextElements = true, showVideoClips = true, showAudioElements = true, onToggleTextElements, onToggleVideoClips, onToggleAudioElements, zoomEvents = [], transitionEvents = [], removedSegments = [] }: { rightOffset?: number; gapPx?: number; currentTime?: number; duration?: number; onSeek?: (sec: number) => void; initialClips?: Array<{ id: string; src: string; start: number; duration: number }>; textOverlays?: Array<{ id: string; start: number; duration: number; text: string }>; onTextChange?: (id: string, updates: Partial<{ start: number; duration: number }>) => void; showTextElements?: boolean; showVideoClips?: boolean; showAudioElements?: boolean; onToggleTextElements?: () => void; onToggleVideoClips?: () => void; onToggleAudioElements?: () => void; zoomEvents?: Array<{ start_ms: number; end_ms: number; scale?: number; offsetX?: number; offsetY?: number }>; transitionEvents?: Array<{ at_ms: number; kind?: string }>; removedSegments?: Array<{ start: number; end: number; reason?: string }> }) {
  const blockRef = useRef<HTMLDivElement | null>(null)
  const [blockHeight, setBlockHeight] = useState<number>(0)

  const formatTime = (sec: number) => {
    const s = Math.max(0, Math.floor(sec))
    const mm = Math.floor(s / 60).toString().padStart(2, '0')
    const ss = Math.floor(s % 60).toString().padStart(2, '0')
    return `${mm}:${ss}`
  }

  type DemoClip = { id: string; src: string; start: number; duration: number }
  const [pixelsPerSecond, setPixelsPerSecond] = useState(40)
  const MIN_DURATION = 0.5
  const [demoClips, setDemoClips] = useState<DemoClip[]>([
    { id: 'c1', src: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4', start: 2, duration: 3.5 },
    { id: 'c2', src: 'https://www.w3schools.com/html/mov_bbb.mp4', start: 8, duration: 3.5 },
    { id: 'c3', src: 'https://media.w3.org/2010/05/sintel/trailer.mp4', start: 14, duration: 3.5 },
  ])

  useEffect(() => {
    if (initialClips && initialClips.length > 0) {
      // Split incoming clips at transition points for clearer visualization
      const transSec = (transitionEvents || []).map(t => Math.max(0, (t.at_ms || 0) / 1000)).sort((a, b) => a - b)
      const split: DemoClip[] = []
      for (const c of initialClips) {
        const cStart = c.start
        const cEnd = c.start + c.duration
        const mids = transSec.filter(s => s > cStart && s < cEnd)
        if (!mids.length) {
          split.push({ id: c.id, src: c.src, start: c.start, duration: c.duration })
          continue
        }
        let last = cStart
        let segIdx = 0
        for (const m of mids) {
          split.push({ id: `${c.id}_seg${segIdx++}`, src: c.src, start: last, duration: Math.max(0.1, m - last) })
          last = m
        }
        split.push({ id: `${c.id}_seg${segIdx++}`, src: c.src, start: last, duration: Math.max(0.1, cEnd - last) })
      }
      setDemoClips(split)
    }
  }, [initialClips && JSON.stringify(initialClips), transitionEvents && JSON.stringify(transitionEvents)])

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
      const placeholders = Array.from({ length: 4 }, () => '')
      setThumbsById(prev => ({ ...prev, [id]: placeholders }))
    }
  }, [])

  useEffect(() => {
    demoClips.forEach(c => {
      if (!thumbsById[c.id]) generateThumbnails(c.id, c.src)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoClips.map(c => c.src).join('|')])

  const snapTo = useCallback((value: number, step = 0.01) => Math.round(value / step) * step, [])

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
        const rawStart = original.start + deltaSec
        const maxStart = Math.min(original.start + original.duration - MIN_DURATION, original.start + original.duration)
        const clampedStart = Math.max(prevEnd, Math.min(rawStart, maxStart))
        const snappedStart = snapTo(clampedStart)
        const newDuration = Math.min(
          Math.max(MIN_DURATION, original.start + original.duration - snappedStart),
          assetDur
        )
        setDemoClips(prev => prev.map((c, i) => i === index ? { ...c, start: snappedStart, duration: newDuration } : c))
      } else {
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
      const x = clientX - rect.left - 24
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
        <div className="relative w-[112px]" style={{ height: blockHeight || undefined }}>
          <div
            aria-hidden
            className="absolute inset-0 rounded-[16px] border border-white/[0.04]"
            style={{ background: 'radial-gradient(circle at 30% 30%, #3a3a3a 0%, #2a2a2a 25%, #1a1a1a 70%, #0a0a0a 100%)', boxShadow: 'inset 3px 3px 6px rgba(255,255,255,0.06), inset -3px -3px 6px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)' }}
          >
          </div>
          <div className="absolute inset-0 rounded-[14px] border border-white/[0.04] p-4" style={{ background: 'radial-gradient(circle at 30% 30%, #3a3a3a 0%, #2a2a2a 25%, #1a1a1a 70%, #0a0a0a 100%)', boxShadow: 'inset 3px 3px 6px rgba(255,255,255,0.06), inset -3px -3px 6px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)' }}>

            <div className="grid grid-rows-[40px_1px_96px_1px_48px] h-full gap-3 text-white/70 pt-1">
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
              <div aria-hidden className="h-px w-[calc(100%-16px)] mx-auto bg-white/15 rounded-full" />
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
              <div aria-hidden className="h-px w-[calc(100%-16px)] mx-auto bg-white/15 rounded-full" />
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
          <div className="absolute -top-14 left-0 right-0 mx-auto w-[112px] rounded-[12px] border border-white/[0.04] px-4 text-[14px] tracking-wide text-white/95 text-center font-light" style={{ paddingTop: 14, paddingBottom: 14, background: 'radial-gradient(circle at 30% 30%, #3a3a3a 0%, #2a2a2a 25%, #1a1a1a 70%, #0a0a0a 100%)', boxShadow: 'inset 3px 3px 6px rgba(255,255,255,0.06), inset -3px -3px 6px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)' }}>
            {(() => {
              const totalSeconds = Math.max(0, currentTime)
              const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0')
              const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0')
              const millis = Math.floor((totalSeconds % 1) * 1000).toString().padStart(3, '0')
              return `${minutes}:${seconds}:${millis}`
            })()}
          </div>
        </div>

        <div ref={blockRef} className="relative flex-1 rounded-[14px] border border-white/[0.04] px-6 py-3 select-none" style={{ background: 'radial-gradient(circle at 30% 30%, #3a3a3a 0%, #2a2a2a 25%, #1a1a1a 70%, #0a0a0a 100%)', boxShadow: 'inset 3px 3px 6px rgba(255,255,255,0.06), inset -3px -3px 6px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)' }}>

          <div
            data-timeline-ruler="1"
            className="absolute left-0 right-0 -top-14 h-12 z-30"
            onMouseDown={handleScrubStart}
            onWheel={(e) => {
              const delta = e.deltaY > 0 ? -5 : 5
              const newScale = Math.max(20, Math.min(120, pixelsPerSecond + delta))
              setPixelsPerSecond(newScale)
            }}
          >
            <div className="absolute inset-0 rounded-[10px] border border-white/[0.04]" style={{ background: 'radial-gradient(circle at 30% 30%, #3a3a3a 0%, #2a2a2a 25%, #1a1a1a 70%, #0a0a0a 100%)', boxShadow: 'inset 2px 2px 4px rgba(255,255,255,0.04), inset -2px -2px 4px rgba(0,0,0,0.3), 0 1px 4px rgba(0,0,0,0.2)' }} />
            <div className="absolute left-0 right-0 top-0 bottom-0 overflow-hidden">
              <div className="relative h-full" style={{ width: `${Math.max(duration * pixelsPerSecond, blockRef.current?.clientWidth || 0)}px`, maxWidth: `${Math.max(blockRef.current?.clientWidth || 0, duration * pixelsPerSecond)}px` }}>
                {/* Visualize transitions as vertical markers */}
                {(transitionEvents || []).map((t, idx) => {
                  const left = (Math.max(0, (t.at_ms || 0) / 1000)) * pixelsPerSecond
                  return (
                    <div key={`tr-${idx}`} className="absolute top-0 bottom-0" style={{ left }}>
                      <div className="w-[2px] h-full bg-white/20" />
                      <div className="absolute -top-5 -left-1 w-2.5 h-2.5 rotate-45 bg-white/30 rounded-[1px]" />
                    </div>
                  )
                })}
                {Array.from({ length: Math.max(1, Math.ceil(duration) + 1) }).map((_, sec) => {
                  const left = sec * pixelsPerSecond
                  const showTime = sec % 5 === 0 && sec > 0
                  const showDot = sec % 1 === 0 && sec > 0 && !showTime

                  return (
                    <div key={`tick-${sec}`} className="absolute inset-y-0" style={{ left }}>
                      {showTime && (
                        <div className="absolute top-1/2 -translate-y-1/2 text-center text-[14px] text-white/95 font-medium whitespace-nowrap">
                          {formatTime(sec)}
                        </div>
                      )}
                      {showDot && (
                        <div className="absolute top-1/2 -translate-y-1/2 w-[2px] h-[2px] bg-white/60 rounded-full" />
                      )}
                    </div>
                  )
                })}

                <div className="absolute top-0 bottom-0 w-[2px] bg-gradient-to-b from-[#dc2626] to-[#ef4444] cursor-col-resize" style={{ left: currentTime * pixelsPerSecond }} onMouseDown={handleScrubStart}>
                  <div className="absolute -top-6 -left-6 w-12 text-center text-[10px] text-white/80 font-light">{formatTime(currentTime)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6 overflow-x-hidden">
            {showTextElements && (
              <div className="flex items-center gap-4">
                <div className="flex-1 relative" style={{ height: '60px' }}>
                  {textOverlays.map((t: TextOverlay, i: number) => (
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

            {showVideoClips && (
              <div className="flex items-center gap-4">
                <div className="flex-1 relative" style={{ height: '90px' }}>
                  {/* Shade zoom windows on the video row */}
                  {(zoomEvents || []).map((z, idx) => {
                    const left = (Math.max(0, z.start_ms / 1000)) * pixelsPerSecond
                    const width = Math.max(0, ((z.end_ms - z.start_ms) / 1000) * pixelsPerSecond)
                    return <div key={`z-${idx}`} className="absolute bottom-0 h-[84px] bg-white/5 rounded-[10px]" style={{ left, width }} />
                  })}
                  
                  {/* Removed segments overlay */}
                  {(removedSegments || []).map((seg, idx) => {
                    const left = Math.max(0, seg.start) * pixelsPerSecond
                    const width = Math.max(0, (seg.end - seg.start)) * pixelsPerSecond
                    const isPause = seg.reason === 'pause'
                    return (
                      <div 
                        key={`removed-${idx}`} 
                        className={`absolute bottom-0 h-[84px] rounded-[10px] border-2 border-dashed ${
                          isPause 
                            ? 'bg-orange-500/10 border-orange-500/30' 
                            : 'bg-red-500/10 border-red-500/30'
                        }`}
                        style={{ left, width }}
                        title={`Removed: ${seg.reason || 'manual'}`}
                      >
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className={`w-full h-0.5 ${
                            isPause ? 'bg-orange-500/50' : 'bg-red-500/50'
                          }`} />
                        </div>
                      </div>
                    )
                  })}
                  
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

            {showAudioElements && (
              <div className="flex items-center gap-4">
                <div className="flex-1 relative" style={{ height: '60px' }}>
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
        </div>
      </div>
    </div>
  )
}





















