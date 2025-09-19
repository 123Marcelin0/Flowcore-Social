"use client"

import React, { useCallback, useEffect, useMemo, useRef } from "react"
import { Pause, Play, RotateCcw, RotateCw, Volume2, VolumeX } from "lucide-react"
import type { CaptionConfig, TextOverlay, TranscriptSegmentUI, VisualOverlay } from "../types"
import { Anton, Bebas_Neue, EB_Garamond, Inter, Montserrat, Oswald } from "next/font/google"

const fontAnton = Anton({ subsets: ['latin'], weight: '400', display: 'swap' })
const fontBebas = Bebas_Neue({ subsets: ['latin'], weight: '400', display: 'swap' })
const fontOswald = Oswald({ subsets: ['latin'], weight: ['600', '700'], display: 'swap' })
const fontMont = Montserrat({ subsets: ['latin'], weight: ['700', '800', '900'], display: 'swap' })
const fontInterBlack = Inter({ subsets: ['latin'], weight: '900', display: 'swap' })
const fontEBGaramondItalic = EB_Garamond({ subsets: ['latin'], weight: ['400','500','600'], style: ['italic'], display: 'swap' })

function useRafZoom(videoEl: HTMLVideoElement | null, autoZoomPlan: any | null) {
  const rafIdRef = useRef<number | null>(null)
  const lastAppliedTransformRef = useRef<string | null>(null)

  const easeInOutCubic = useCallback((t: number): number => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }, [])
  const easeOutCubic = useCallback((t: number): number => {
    return 1 - Math.pow(1 - t, 3)
  }, [])

  const computeZoomTransformAt = useCallback((nowMs: number): { transform: string; origin?: string } | null => {
    const events = autoZoomPlan?.zoom_events || []
    if (!events.length) return null
    const activeZoom = events.find((z: any) => nowMs >= z.start_ms && nowMs <= z.end_ms)
    if (activeZoom) {
      const duration = Math.max(1, activeZoom.end_ms - activeZoom.start_ms)
      const progress = Math.max(0, Math.min(1, (nowMs - activeZoom.start_ms) / duration))
      const targetScale = activeZoom.scale || 1.0
      const isZoomOut = targetScale < 1
      const isZoomIn = targetScale > 1
      // Smooth, one-motion cubic ease both ways
      const ease = isZoomOut ? easeOutCubic : easeInOutCubic
      const baseScale = isZoomOut ? (1 / Math.max(0.001, targetScale)) : 1
      const currentScale = isZoomIn ? (1 + (targetScale - 1) * ease(progress)) : (baseScale + (1 - baseScale) * ease(progress))
      // Strong directional pan that matches zoom quadrant
      const dir = activeZoom.direction || 'center'
      const panIntensity = activeZoom.pan || 24
      const panEase = ease(progress)
      const offsetX = dir === 'left' ? -panIntensity * panEase : dir === 'right' ? panIntensity * panEase : 0
      const offsetY = dir === 'up' ? -panIntensity * panEase : dir === 'down' ? panIntensity * panEase : 0
      // Optional rotation micro-tilt for dynamics
      const rotate = activeZoom.rotate || 0
      const rot = rotate ? (rotate * Math.sin(progress * Math.PI)) : 0
      return { transform: `translate(${offsetX}px, ${offsetY}px) scale(${currentScale}) rotate(${rot}deg)`, origin: 'center center' }
    }
    // Bridge with smooth deceleration to neutral between events
    const BRIDGE_MS = 220
    const prev = [...events].reverse().find((z: any) => nowMs > z.end_ms && nowMs - z.end_ms <= BRIDGE_MS)
    if (prev) {
      const p = Math.max(0, Math.min(1, (nowMs - prev.end_ms) / BRIDGE_MS))
      const endScale = Math.max(1, prev.scale || 1.0)
      const s = endScale + (1 - endScale) * easeOutCubic(p)
      const x = 0 + (0 - (prev.offsetX || 0)) * easeOutCubic(p)
      const y = 0 + (0 - (prev.offsetY || 0)) * easeOutCubic(p)
      return { transform: `translate(${x}px, ${y}px) scale(${s})`, origin: 'center center' }
    }
    return null
  }, [autoZoomPlan, easeInOutCubic, easeOutCubic])

  useEffect(() => {
    if (!videoEl) return
    const el = videoEl
    const tick = () => {
      const t = (el.currentTime || 0) * 1000
      const res = computeZoomTransformAt(t)
      const transform = res?.transform || ''
      if (lastAppliedTransformRef.current !== transform) {
        el.style.transform = transform
        el.style.transformOrigin = res?.origin || 'center center'
        el.style.transition = 'none'
        lastAppliedTransformRef.current = transform
      }
      rafIdRef.current = window.requestAnimationFrame(tick)
    }
    rafIdRef.current && cancelAnimationFrame(rafIdRef.current)
    rafIdRef.current = window.requestAnimationFrame(tick)
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }
  }, [videoEl, computeZoomTransformAt])
}

function formatClock(sec: number) {
  const s = Math.max(0, Math.floor(sec))
  const mm = Math.floor(s / 60).toString().padStart(2, '0')
  const ss = Math.floor(s % 60).toString().padStart(2, '0')
  return `${mm}:${ss}`
}

export function PreviewPane({
  videoUrl,
  videoRef,
  autoZoomPlan,
  isPlaying,
  isMuted,
  currentTime,
  duration,
  onLoadedMetadata,
  onTogglePlay,
  onToggleMute,
  onSeekRelative,
  activeTextOverlays,
  transcriptSegments,
  captionConfig,
  activeVisualOverlays,
  subtitleAutoEmojiMode,
  subtitleEmojiAnimation,
  isProcessing,
  onRequestAddVisuals
}: {
  videoUrl: string | null
  videoRef: React.RefObject<HTMLVideoElement | null>
  autoZoomPlan: any | null
  isPlaying: boolean
  isMuted: boolean
  currentTime: number
  duration: number
  onLoadedMetadata?: (e: React.SyntheticEvent<HTMLVideoElement, Event>) => void
  onTogglePlay: () => void
  onToggleMute: () => void
  onSeekRelative: (delta: number) => void
  activeTextOverlays: TextOverlay[]
  transcriptSegments: TranscriptSegmentUI[]
  captionConfig: CaptionConfig & { colorAccent: string; colorSecond: string; colorThird: string; }
  activeVisualOverlays: VisualOverlay[]
  subtitleAutoEmojiMode: 'auto' | 'top' | 'none'
  subtitleEmojiAnimation: boolean
  isProcessing: boolean
  onRequestAddVisuals: () => Promise<void> | void
}) {
  useRafZoom(videoRef.current, autoZoomPlan)

  const activeOverlays = useMemo(() => activeTextOverlays.filter(t => currentTime >= t.start && currentTime <= t.start + t.duration), [activeTextOverlays, currentTime])

  // Check if this is a processed video (contains 'processed_' or 'storageUrl')
  const isProcessedVideo = videoUrl && (videoUrl.includes('processed_') || videoUrl.includes('supabase'))

  return (
    <div
      className="relative rounded-[16px] overflow-hidden border border-white/[0.04] aspect-[9/16] shadow-2xl"
      style={{
        width: '320px',
        maxHeight: '80%',
        background: 'radial-gradient(circle at 30% 30%, #3a3a3a 0%, #2a2a2a 25%, #1a1a1a 70%, #0a0a0a 100%)',
        boxShadow: 'inset 3px 3px 6px rgba(255,255,255,0.06), inset -3px -3px 6px rgba(0,0,0,0.4), 0 8px 32px rgba(0,0,0,0.4)'
      }}
    >
      {/* Processed Video Indicator */}
      {isProcessedVideo && (
        <div 
          className="absolute top-3 right-3 z-50 bg-green-600/90 text-white text-xs px-2 py-1 rounded-full border border-green-400/30 backdrop-blur-sm"
          style={{ fontWeight: 600 }}
        >
          ✨ Processed
        </div>
      )}
      {videoUrl ? (
        <video id="background"
          src={videoUrl}
          poster="/placeholder.svg?height=720&width=1280"
          className="absolute inset-0 w-full h-full"
          style={{ objectFit: 'cover' }}
          controls={false}
          ref={videoRef}
          onLoadedMetadata={(e) => {
            const v = e.currentTarget
            const aspectRatio = (v.videoWidth || 16) / (v.videoHeight || 9)
            const isVertical = aspectRatio < 1
            v.style.objectFit = isVertical ? 'contain' : 'cover'
            v.style.backgroundColor = isVertical ? 'black' : 'transparent'
            onLoadedMetadata?.(e)
          }}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center text-white/60 text-sm">No media loaded</div>
      )}

      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(120% 120% at 50% 50%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.25) 100%)' }} />

      {activeVisualOverlays.map((vo) => {
        if (subtitleAutoEmojiMode === 'none') return null
        let pos: React.CSSProperties
        if (vo.placement === 'topLeft') pos = { top: '6%', left: '6%' }
        else if (vo.placement === 'topRight') pos = { top: '6%', right: '6%' }
        else if (vo.placement === 'bottomLeft') pos = { bottom: '6%', left: '6%' }
        else if (vo.placement === 'bottomRight') pos = { bottom: '6%', right: '6%' }
        else if (vo.placement === 'aboveSub') pos = { bottom: `calc(${captionConfig.bottomOffsetPercent}% + 18%)`, right: '6%' }
        else {
          if (subtitleAutoEmojiMode === 'top') {
            const hash = Math.abs(Array.from(vo.id).reduce((a, c) => a + c.charCodeAt(0), 0))
            const corner = hash % 4
            pos = corner === 0 ? { top: '6%', left: '6%' }
              : corner === 1 ? { top: '6%', right: '6%' }
              : corner === 2 ? { bottom: '6%', left: '6%' }
              : { bottom: '6%', right: '6%' }
          } else {
            pos = { bottom: `calc(${captionConfig.bottomOffsetPercent}% + 18%)`, right: '6%' }
          }
        }
        const remaining = (vo.start + vo.duration) - currentTime
        const fadeOut = remaining < 0.16 ? Math.max(0, Math.min(1, remaining / 0.16)) : 1
        const animClass = !subtitleEmojiAnimation ? '' : vo.animation === 'flip' ? 'animate-emojiFlipIn' : vo.animation === 'bounce' ? 'animate-emojiBounceIn' : vo.animation === 'slide' ? 'animate-emojiSlideIn' : 'animate-emojiEnter'
        return (
          <div key={vo.id} className={`absolute pointer-events-none select-none ${animClass}`} style={{ ...pos, opacity: fadeOut }}>
            <img src={vo.mediaUrl} alt="" style={{ width: vo.size ? `${vo.size}px` : '64px', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.45))' }} />
          </div>
        )
      })}

      {autoZoomPlan?.zoom_events?.length ? (
        <div className="absolute top-1 right-1 text-xs text-white/80 bg-black/30 px-2 py-1 rounded">🔍 ZOOM ACTIVE</div>
      ) : null}

      {autoZoomPlan && Array.isArray(autoZoomPlan.highlights) && autoZoomPlan.highlights.length > 0 && (
        <div className="absolute top-1 left-1 right-1 flex justify-center pointer-events-none">
          {(() => {
            const nowMs = Math.round(currentTime * 1000)
            const h = autoZoomPlan.highlights.find((x: any) => nowMs >= x.start_ms && nowMs <= x.end_ms)
            if (!h) return null
            return <div className="px-2 py-0.5 rounded bg-white/15 text-white text-[10px] border border-white/25">Highlight: {h.word}</div>
          })()}
        </div>
      )}

      {activeOverlays.slice(0, 1).map((o) => {
        const clampedY = Math.max(0, Math.min(100, captionConfig.positionYPercent))
        const baseStyle: React.CSSProperties = { top: `${clampedY}%` }
        const styleClass = captionConfig.styleKey === 'hormozi-bold' ? fontAnton.className
          : captionConfig.styleKey === 'bold-outline' ? fontBebas.className
            : captionConfig.styleKey === 'neon-glow' ? fontOswald.className
              : captionConfig.styleKey === 'hormozi-shadow' ? fontAnton.className
                : captionConfig.styleKey === 'marker-highlight' ? fontMont.className
                  : captionConfig.styleKey === 'pop-shadow' ? fontMont.className
                    : captionConfig.styleKey === 'leon-rect' ? fontMont.className
                      : captionConfig.styleKey === 'kelly' ? fontMont.className
                        : captionConfig.styleKey === 'submagic-bold' ? ''
                          : captionConfig.styleKey === 'karaoke-accent' ? fontMont.className
                            : captionConfig.styleKey === 'cinematic-duo' ? fontInterBlack.className
                            : fontMont.className

        const textCss: React.CSSProperties = captionConfig.styleKey === 'hormozi-bold'
          ? { color: captionConfig.colorMain, WebkitTextStroke: '2px #000', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 900 }
          : captionConfig.styleKey === 'bold-outline'
            ? { color: captionConfig.colorMain, WebkitTextStroke: '2px #000', textShadow: '0 2px 0 #000, 0 0 10px rgba(0,0,0,0.35)', textTransform: 'uppercase', fontWeight: 800 }
            : captionConfig.styleKey === 'neon-glow'
              ? { color: captionConfig.colorMain, textShadow: `0 0 6px ${captionConfig.colorMain}, 0 0 14px ${captionConfig.colorMain}`, textTransform: 'uppercase', fontWeight: 800 }
              : captionConfig.styleKey === 'hormozi-shadow'
                ? { color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 900, textShadow: '0 6px 24px rgba(0,0,0,0.8), 0 2px 0 #000' }
                : captionConfig.styleKey === 'marker-highlight'
                  ? { color: captionConfig.colorMain, fontWeight: 900 }
                  : captionConfig.styleKey === 'pop-shadow'
                    ? { color: captionConfig.colorMain, textShadow: '2px 2px 0 #000, 4px 4px 0 rgba(0,0,0,0.25)', fontWeight: 900, textTransform: 'uppercase' }
                    : captionConfig.styleKey === 'kelly'
                      ? { color: captionConfig.colorMain, WebkitTextStroke: '2px #000', textTransform: 'uppercase', fontWeight: 900, textShadow: '0 2px 0 #000, 0 6px 20px rgba(0,0,0,0.6)' }
                      : captionConfig.styleKey === 'submagic-bold'
                        ? { fontFamily: 'Arial, Helvetica, sans-serif', color: '#fff', WebkitTextStroke: '2px #000', fontWeight: 900 }
                        : captionConfig.styleKey === 'karaoke-accent'
                          ? { color: '#fff', fontWeight: 900 }
                          : captionConfig.styleKey === 'leon-rect'
                            ? { color: '#fff', fontWeight: 900, textTransform: 'uppercase' }
                          : captionConfig.styleKey === 'cinematic-duo'
                            ? { color: '#fff', fontWeight: 900 }
                            : { color: captionConfig.colorMain, fontWeight: 800 }

        if (captionConfig.uppercase) (textCss as any).textTransform = 'uppercase'

        const tokens = (o.tokens && o.tokens.length
          ? o.tokens.map(t => ({ w: t.w, offset: Math.max(0, t.offset), dur: Math.max(0.02, t.dur) }))
          : o.text.split(' ').map((w, i, arr) => ({
              w,
              offset: (i * (o.duration / Math.max(1, arr.length))),
              dur: Math.max(0.02, o.duration / Math.max(1, arr.length))
            }))
        )

        const totalEnd = Math.max(...tokens.map(t => t.offset + t.dur))
        if (totalEnd > o.duration && (!o.tokens || !o.tokens.length)) {
          const scale = o.duration / totalEnd
          for (let i = 0; i < tokens.length; i++) {
            tokens[i].dur *= scale
            tokens[i].offset *= scale
          }
        }

        let breakIndices: number[] = []
        const maxLines = Math.max(1, Math.min(3, captionConfig.maxLines))
        const maxBreaks = Math.max(0, Math.min(2, maxLines - 1))
        if (maxBreaks > 0 && tokens.length >= 2 * (maxBreaks + 1)) {
          const aiLineBreakIdx = transcriptSegments.find(s => currentTime >= s.startTime && currentTime <= s.endTime)?.lineBreakIndex
          if (typeof aiLineBreakIdx === 'number' && aiLineBreakIdx > 0 && aiLineBreakIdx < tokens.length - 1) {
            breakIndices.push(aiLineBreakIdx)
          }
          if (breakIndices.length < maxBreaks) {
            let currentLen = 0
            for (let i = 0; i < tokens.length; i++) {
              const addLen = (currentLen > 0 ? 1 : 0) + (tokens[i].w || '').length
              const testLen = currentLen + addLen
              if (testLen > captionConfig.maxCharsPerLine && breakIndices.length < maxBreaks) {
                if (i > 0 && i < tokens.length - 1) breakIndices.push(i)
                currentLen = (tokens[i].w || '').length
              } else {
                currentLen = testLen
              }
            }
          }
          if (breakIndices.length < maxBreaks) {
            const perLine = Math.ceil(tokens.length / Math.min(maxLines, 3))
            for (let j = 1; j <= maxBreaks; j++) {
              const idx = perLine * j
              if (idx > 0 && idx < tokens.length - 1 && !breakIndices.includes(idx)) breakIndices.push(idx)
            }
          }
          breakIndices = Array.from(new Set(breakIndices)).sort((a, b) => a - b).slice(0, maxBreaks)
        }

        const containerStyle: React.CSSProperties = {
          fontSize: captionConfig.fontSize,
          lineHeight: captionConfig.lineSpacing,
          ...textCss,
          display: 'inline-block',
          whiteSpace: 'normal',
          maxHeight: `${Math.ceil(captionConfig.lineSpacing * captionConfig.fontSize * maxLines)}px`,
          overflow: 'hidden',
          paddingBottom: 2
        }

        const makeAnim = (delaySec: number, durSec: number) => {
          const d = Math.max(0.04, durSec)
          const name = captionConfig.animation === 'fade' ? 'fadeIn' : (captionConfig.animation === 'slideUp' ? 'slideUp' : 'captionPop')
          if (!captionConfig.animEnabled) {
            return { name: 'none', duration: '0s', timingFunction: 'linear', delay: '0s', fillMode: 'none' } as const
          }
          return { name, duration: `${d}s`, timingFunction: 'ease-out', delay: `${delaySec}s`, fillMode: 'both' } as const
        }

        const isKaraoke = captionConfig.styleKey === 'karaoke-accent'
        const karaokeFadeOut = 0.12
        const endOffsets = tokens.map(t => t.offset + t.dur)
        const speechEndWithin = endOffsets.length ? Math.max(...endOffsets) + Math.max(0, captionConfig.wordTrail) : o.duration
        const speechEndAbs = o.start + speechEndWithin
        let containerOpacityInner = 1
        if (isKaraoke) {
          const timeAfterLast = currentTime - speechEndAbs
          containerOpacityInner = timeAfterLast > 0 ? Math.max(0, 1 - (timeAfterLast / karaokeFadeOut)) : 1
        }

        let activeIdx = -1
        if (isKaraoke) {
          const epsilon = 0.02
          for (let i = 0; i < tokens.length; i++) {
            const startAbs = o.start + Math.max(0, tokens[i].offset)
            const endAbs = startAbs + Math.max(0.02, tokens[i].dur)
            if (currentTime >= (startAbs - epsilon) && currentTime <= (endAbs + epsilon)) {
              activeIdx = i
              break
            }
          }
        }

        return (
          <div key={o.id} className="absolute left-0 right-0 text-center" style={{ ...baseStyle, zIndex: captionConfig.styleKey === 'cinematic-duo' ? 9999 : undefined, overflow: 'visible', pointerEvents: 'none' }}>
            <span className={`${styleClass}`} style={{ ...containerStyle, ...(isKaraoke ? { opacity: containerOpacityInner, transition: 'opacity 120ms linear' } : {}) }}>
              {(() => {
                const lines: typeof tokens[] = []
                let current: typeof tokens = []
                let currentLetters = 0
                const letters = (s: string) => (s.replace(/\s+/g, ''))
                for (let i = 0; i < tokens.length; i++) {
                  const tk = tokens[i]
                  const wLetters = letters(tk.w).length
                  const willExceed = (currentLetters + wLetters) > captionConfig.maxCharsPerLine
                  if (!willExceed) {
                    current.push(tk)
                    currentLetters += wLetters
                  } else {
                    if (current.length > 0) {
                      lines.push([...current])
                      current = [tk]
                      currentLetters = wLetters
                    } else {
                      current.push(tk)
                      currentLetters = wLetters
                    }
                  }
                }
                if (current.length) lines.push([...current])
                const clamped = lines.slice(0, maxLines)
                return clamped.map((group, gi) => (
                  <div key={gi} style={{ whiteSpace: 'nowrap' }}>
                    {group.map((tk, idx) => (
                      <span key={idx} className="mr-1" style={{
                        display: 'inline-block',
                        ...(captionConfig.animEnabled ? {
                          animationName: makeAnim(Math.max(0, (tk.offset - captionConfig.wordLead)) - (currentTime - o.start), Math.max(0.04, tk.dur)).name,
                          animationDuration: makeAnim(Math.max(0, (tk.offset - captionConfig.wordLead)) - (currentTime - o.start), Math.max(0.04, tk.dur)).duration,
                          animationTimingFunction: makeAnim(Math.max(0, (tk.offset - captionConfig.wordLead)) - (currentTime - o.start), Math.max(0.04, tk.dur)).timingFunction,
                          animationDelay: makeAnim(Math.max(0, (tk.offset - captionConfig.wordLead)) - (currentTime - o.start), Math.max(0.04, tk.dur)).delay,
                          animationFillMode: makeAnim(Math.max(0, (tk.offset - captionConfig.wordLead)) - (currentTime - o.start), Math.max(0.04, tk.dur)).fillMode,
                          animationPlayState: isPlaying ? 'running' : 'paused'
                        } : { animation: 'none' }),
                        ...(captionConfig.styleKey === 'submagic-bold' ? (() => {
                          const weightMapLocal: Record<'Light' | 'Regular' | 'Medium' | 'Bold' | 'Heavy', number> = { Light: 300, Regular: 400, Medium: 600, Bold: 800, Heavy: 900 }
                          const strokePxLocal = 0
                          const colorIdx = (gi + idx) % 3
                          const cycColor = colorIdx === 0 ? captionConfig.colorMain : (colorIdx === 1 ? (captionConfig as any).colorSecond : (captionConfig as any).colorThird)
                          return {
                            color: (colorIdx === 2) ? (captionConfig as any).colorAccent : (cycColor || (textCss.color as string)),
                            WebkitTextStroke: strokePxLocal > 0 ? `${strokePxLocal}px #000` : undefined,
                            fontWeight: weightMapLocal[captionConfig.fontWeight] ?? 800
                          }
                        })() : {}),
                        ...(captionConfig.styleKey === 'cinematic-duo' ? (() => {
                          const isOneRow = maxLines <= 1
                          const isGaramond = isOneRow ? (idx === 1) : (gi === 1 && (idx === 0 || idx === 1))
                          return {
                            fontFamily: isGaramond ? fontEBGaramondItalic.style.fontFamily : fontInterBlack.style.fontFamily,
                            fontWeight: isGaramond ? 400 : 900,
                            fontStyle: isGaramond ? 'italic' : 'normal',
                            fontSize: isGaramond ? '112%' : undefined,
                            letterSpacing: isGaramond ? undefined : '-0.02em',
                            textShadow: isGaramond ? undefined : '0 3px 6px rgba(0,0,0,0.16), 0 6px 14px rgba(0,0,0,0.10), 3px 3px 6px rgba(0,0,0,0.08), -3px 3px 6px rgba(0,0,0,0.08)'
                          }
                        })() : {}),
                        ...(isKaraoke ? {
                          color: (idx === activeIdx) ? (captionConfig as any).colorAccent : (textCss.color as string),
                          transition: 'color 120ms linear, transform 120ms ease-out',
                          transform: (idx === activeIdx) ? 'scale(1.04)' : 'scale(1.0)'
                        } : {})
                      }}>{tk.w}</span>
                    ))}
                  </div>
                ))
              })()}
            </span>
          </div>
        )
      })}

      <div className="absolute left-4 right-4 bottom-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="h-8 px-3 rounded-[10px] bg-white/15 hover:bg-white/25 text-white/90 border border-white/20 backdrop-blur-md flex items-center gap-2" style={{ WebkitBackdropFilter: 'blur(8px)' }}>
            <button onClick={onTogglePlay} className="grid place-items-center w-8 h-8 rounded-[8px] bg-white/10 border border-white/20 text-white/90">
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            <span className="text-[12px] tabular-nums font-light">{formatClock(currentTime)} / {formatClock(duration)}</span>
            <button onClick={(e) => { e.stopPropagation(); onToggleMute() }} className="ml-1 grid place-items-center w-7 h-7 rounded-[8px] bg-white/10 border border-white/20 text-white/90">
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button onClick={async (e) => { e.stopPropagation(); await onRequestAddVisuals() }} className={`ml-1 grid place-items-center h-7 px-2 rounded-[8px] ${isProcessing ? 'bg-white/5 border border-white/10 text-white/60 cursor-not-allowed' : 'bg-white/10 border border-white/20 text-white/90'} text-[12px]`} title="Find visuals for this transcript">
              {isProcessing ? 'Finding…' : 'Find Visuals'}
            </button>
          </div>
        </div>
        <div className="flex-1">
          <div className="rounded-[10px] h-7 px-3 bg-white/15 border border-white/20 backdrop-blur-md flex items-center" style={{ WebkitBackdropFilter: 'blur(8px)' }}>
            <div className="relative w-full h-2 rounded-full overflow-hidden bg-white/20">
              <div className="absolute inset-y-0 left-0" style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%`, background: 'linear-gradient(90deg,#a78bfa,#f472b6)' }} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onSeekRelative(-5)} className="h-9 w-9 rounded-[10px] bg-white/15 hover:bg-white/25 text-white/90 border border-white/20 backdrop-blur-md grid place-items-center" title="Back 5s" style={{ WebkitBackdropFilter: 'blur(8px)' }}>
            <RotateCcw className="w-5 h-5" />
          </button>
          <button onClick={() => onSeekRelative(5)} className="h-9 w-9 rounded-[10px] bg-white/15 hover:bg-white/25 text-white/90 border border-white/20 backdrop-blur-md grid place-items-center" title="Forward 5s" style={{ WebkitBackdropFilter: 'blur(8px)' }}>
            <RotateCw className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}


