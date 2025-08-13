"use client"

import type React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { Check, X, ZoomIn, ZoomOut, MoveHorizontal, GripVertical } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

export type FilmStripEditorProps = {
  src: string
  poster?: string
  label?: string
  initialStart?: number
  initialEnd?: number
  onApply: (range: { start: number; end: number; duration: number }) => void
  onCancel: () => void
  onScrub?: (time: number) => void
  onRangeChange?: (range: { start: number; end: number; duration: number }) => void
}

type FramesResult = { frames: string[]; duration: number; usedPosterFallback: boolean }

function useFilmstripFrames(src: string, poster?: string, count = 14, targetHeight = 56) {
  const [result, setResult] = useState<FramesResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setResult(null)

    async function run() {
      const video = document.createElement("video")
      video.crossOrigin = "anonymous"
      video.preload = "metadata"
      video.src = src

      const onMeta = () =>
        new Promise<void>((resolve, reject) => {
          if (video.readyState >= 1 && video.duration && isFinite(video.duration)) return resolve()
          const ok = () => resolve()
          const err = () => reject(new Error("metadataerror"))
          video.addEventListener("loadedmetadata", ok, { once: true })
          video.addEventListener("error", err, { once: true })
          setTimeout(() => reject(new Error("metadata-timeout")), 8000)
        })

      try {
        await onMeta()
      } catch {
        const frames = Array.from({ length: count }).map(() => poster || "/placeholder.svg?height=112&width=200")
        if (!cancelled) {
          setResult({ frames, duration: 1, usedPosterFallback: true })
          setLoading(false)
        }
        return
      }

      const duration = Math.max(0.1, Math.min(60 * 60, video.duration || 1))
      const canvas = document.createElement("canvas")
      const w = 100
      const h = targetHeight
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext("2d", { willReadFrequently: true })

      const frames: string[] = []
      const seekTo = (t: number) =>
        new Promise<void>((resolve, reject) => {
          const onSeeked = () => resolve()
          const onError = () => reject(new Error("seekerror"))
          video.currentTime = Math.min(Math.max(0, t), Math.max(0.01, duration - 0.01))
          video.addEventListener("seeked", onSeeked, { once: true })
          video.addEventListener("error", onError, { once: true })
          setTimeout(() => resolve(), 1200)
        })

      let failedDraw = false
      for (let i = 0; i < count; i++) {
        if (cancelled) return
        const t = ((i + 1) / (count + 1)) * duration
        try {
          await seekTo(t)
          if (!ctx) {
            failedDraw = true
            break
          }
          ctx.clearRect(0, 0, w, h)
          const vw = video.videoWidth || 16
          const vh = video.videoHeight || 9
          const scale = Math.max(w / vw, h / vh)
          const dw = vw * scale
          const dh = vh * scale
          const dx = (w - dw) / 2
          const dy = (h - dh) / 2
          ctx.drawImage(video, dx, dy, dw, dh)
          const data = canvas.toDataURL("image/jpeg", 0.6)
          frames.push(data)
        } catch {
          failedDraw = true
          break
        }
      }

      if (cancelled) return

      if (failedDraw || frames.length === 0) {
        const fb = Array.from({ length: count }).map(() => poster || "/placeholder.svg?height=112&width=200")
        setResult({ frames: fb, duration, usedPosterFallback: true })
      } else {
        setResult({ frames, duration, usedPosterFallback: false })
      }
      setLoading(false)
    }

    run()
    return () => {
      cancelled = true
    }
  }, [src, poster, count, targetHeight])

  return { result, loading }
}

function fmtMMSS(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, "0")}`
}

export default function FilmStripEditor({
  src,
  poster,
  label,
  initialStart = 0,
  initialEnd,
  onApply,
  onCancel,
  onScrub,
  onRangeChange,
}: FilmStripEditorProps) {
  // Zoom controls -> adjust frame count
  const [frameCount, setFrameCount] = useState(18)
  const { result, loading } = useFilmstripFrames(src, poster, frameCount, 56)
  const duration = result?.duration ?? 1

  const startDefault = Math.max(0, Math.min(initialStart, duration))
  const endDefault = Math.max(startDefault + 0.1, Math.min(initialEnd ?? duration, duration))

  const trackRef = useRef<HTMLDivElement | null>(null)
  const [range, setRange] = useState<{ start: number; end: number }>({ start: startDefault, end: endDefault })
  const dragRef = useRef<null | "start" | "end" | "move">(null)
  const lastClientX = useRef(0)
  const lastActive = useRef<null | "start" | "end" | "move">(null)
  const hoverRaf = useRef<number | null>(null)

  const [snap, setSnap] = useState<boolean>(true)
  const [snapStep, setSnapStep] = useState<number>(0.1)

  useEffect(() => {
    setRange({ start: startDefault, end: endDefault })
    onRangeChange?.({ start: startDefault, end: endDefault, duration })
  }, [startDefault, endDefault, duration])

  const frames = result?.frames ?? Array.from({ length: 12 }).map(() => "/placeholder.svg?height=112&width=200")
  const gridCols = frames.length

  const clampTime = (t: number) => Math.min(Math.max(0, t), duration)
  const minGap = Math.max(0.2, duration * 0.02)
  const applySnap = (t: number) => (snap ? Math.round(t / snapStep) * snapStep : t)

  const onPointerDown = (kind: "start" | "end" | "move") => (e: React.PointerEvent) => {
    e.preventDefault()
    dragRef.current = kind
    lastActive.current = kind
    lastClientX.current = e.clientX
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || !trackRef.current) return
    const rect = trackRef.current.getBoundingClientRect()
    const rel = (e.clientX - rect.left) / Math.max(1, rect.width)
    const base = clampTime(rel * duration)

    if (dragRef.current === "start") {
      const nextStart = applySnap(Math.min(base, range.end - minGap))
      setRange((r) => ({ ...r, start: nextStart }))
      onScrub?.(nextStart)
      onRangeChange?.({ start: nextStart, end: range.end, duration })
    } else if (dragRef.current === "end") {
      const nextEnd = applySnap(Math.max(base, range.start + minGap))
      setRange((r) => ({ ...r, end: nextEnd }))
      onScrub?.(nextEnd)
      onRangeChange?.({ start: range.start, end: nextEnd, duration })
    } else if (dragRef.current === "move") {
      const deltaPx = e.clientX - lastClientX.current
      lastClientX.current = e.clientX
      const deltaTime = (deltaPx / rect.width) * duration
      let ns = applySnap(range.start + deltaTime)
      let ne = applySnap(range.end + deltaTime)
      if (ns < 0) {
        ne -= ns
        ns = 0
      }
      if (ne > duration) {
        const diff = ne - duration
        ns -= diff
        ne = duration
      }
      setRange({ start: ns, end: ne })
      onScrub?.(ns)
      onRangeChange?.({ start: ns, end: ne, duration })
    }
  }
  const onPointerUp = (e: React.PointerEvent) => {
    if (dragRef.current) {
      dragRef.current = null
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    }
  }

  function onHoverMove(e: React.MouseEvent) {
    if (!trackRef.current || dragRef.current) return
    const rect = trackRef.current.getBoundingClientRect()
    const rel = (e.clientX - rect.left) / Math.max(1, rect.width)
    const timeAtCursor = clampTime(rel * duration)
    if (hoverRaf.current) cancelAnimationFrame(hoverRaf.current)
    hoverRaf.current = requestAnimationFrame(() => {
      onScrub?.(timeAtCursor)
    })
  }
  function onHoverLeave() {
    if (hoverRaf.current) {
      cancelAnimationFrame(hoverRaf.current)
      hoverRaf.current = null
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const step = e.shiftKey ? 1 : 0.1
    if (e.key === "Enter") {
      e.preventDefault()
      onApply({ start: range.start, end: range.end, duration })
      return
    }
    if (e.key === "Escape") {
      e.preventDefault()
      onCancel()
      return
    }
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault()
      const dir = e.key === "ArrowRight" ? 1 : -1
      const moveBy = step * dir

      if (lastActive.current === "move") {
        let ns = clampTime(range.start + moveBy)
        let ne = clampTime(range.end + moveBy)
        if (ns < 0) {
          ne -= ns
          ns = 0
        }
        if (ne > duration) {
          const diff = ne - duration
          ns -= diff
          ne = duration
        }
        setRange({ start: ns, end: ne })
        onScrub?.(ns)
        onRangeChange?.({ start: ns, end: ne, duration })
        return
      }

      if (lastActive.current === "start") {
        const ns = clampTime(Math.min(range.end - minGap, range.start + moveBy))
        setRange((r) => ({ ...r, start: ns }))
        onScrub?.(ns)
        onRangeChange?.({ start: ns, end: range.end, duration })
        return
      }

      const ne = clampTime(Math.max(range.start + minGap, range.end + moveBy))
      setRange((r) => ({ ...r, end: ne }))
      onScrub?.(ne)
      onRangeChange?.({ start: range.start, end: ne, duration })
    }
  }

  const apply = () => onApply({ start: range.start, end: range.end, duration })
  const setInInput = (v: string) => {
    const val = clampTime(Number.parseFloat(v) || 0)
    const ns = Math.min(val, range.end - minGap)
    setRange((r) => ({ ...r, start: ns }))
    onRangeChange?.({ start: ns, end: range.end, duration })
    onScrub?.(ns)
  }
  const setOutInput = (v: string) => {
    const val = clampTime(Number.parseFloat(v) || 0)
    const ne = Math.max(val, range.start + minGap)
    setRange((r) => ({ ...r, end: ne }))
    onRangeChange?.({ start: range.start, end: ne, duration })
    onScrub?.(ne)
  }

  const pct = (t: number) => (duration <= 0 ? 0 : (t / duration) * 100)

  // Minimap frames re-use the same frame list with blur
  const miniFrames = useMemo(() => frames.slice(0, Math.min(frames.length, 10)), [frames])

  return (
    <div
      className="w-full toolbar-strip-in"
      role="group"
      aria-label={label ? `Trim ${label}` : "Trim video"}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      {/* Header row with time + controls */}
      <div className="flex flex-wrap items-center gap-3 px-1">
        <div className="truncate text-xs text-zinc-600">{label || "Video"}</div>
        <div className="text-[11px] text-zinc-500">
          {fmtMMSS(range.start)} - {fmtMMSS(range.end)} / {fmtMMSS(duration)}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-white/50 bg-white/40 px-2 py-1">
            <ZoomOut className="h-3.5 w-3.5 text-zinc-700" />
            <div className="w-24">
              <Slider
                min={8}
                max={36}
                step={2}
                value={[frameCount]}
                onValueChange={(v) => setFrameCount(v?.[0] ?? 18)}
              />
            </div>
            <ZoomIn className="h-3.5 w-3.5 text-zinc-700" />
          </div>

          <div className="hidden md:flex items-center gap-2 rounded-full border border-white/50 bg-white/40 px-2 py-1">
            <MoveHorizontal className="h-3.5 w-3.5 text-zinc-700" />
            <Label htmlFor="snap" className="text-[11px] text-zinc-700">
              Snap
            </Label>
            <Input
              id="snap"
              type="number"
              min={0.01}
              step={0.01}
              value={snapStep}
              onChange={(e) => setSnapStep(Math.max(0.01, Number.parseFloat(e.target.value) || 0.01))}
              className="h-7 w-16 bg-white/70 text-xs"
            />
            <button
              className={cn("rounded-full px-2 py-1 text-xs", snap ? "bg-white text-slate-900" : "bg-white/30")}
              onClick={() => (snap ? setSnap(false) : setSnap(true))}
            >
              {snap ? "On" : "Off"}
            </button>
          </div>

          <Button
            variant="ghost"
            className="h-8 rounded-full border border-white/60 bg-white/80 text-slate-900 hover:bg-white"
            aria-label="Apply cut"
            onClick={apply}
          >
            <Check className="h-4 w-4 mr-1" /> Apply
          </Button>
          <Button
            variant="ghost"
            className="h-8 rounded-full border border-white/60 bg-white/30 text-zinc-800 hover:bg-white/40"
            aria-label="Cancel editing"
            onClick={onCancel}
          >
            <X className="h-4 w-4 mr-1" /> Cancel
          </Button>
        </div>
      </div>

      {/* Inputs row (mobile-visible too) */}
      <div className="mt-1 flex items-center gap-2 px-1">
        <div className="flex items-center gap-1">
          <Label htmlFor="inT" className="text-[11px] text-zinc-600">
            In (s)
          </Label>
          <Input
            id="inT"
            type="number"
            min={0}
            step={0.01}
            className="h-7 w-24 bg-white/70 text-xs"
            value={Number.isFinite(range.start) ? Number(range.start.toFixed(2)) : 0}
            onChange={(e) => setInInput(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1">
          <Label htmlFor="outT" className="text-[11px] text-zinc-600">
            Out (s)
          </Label>
          <Input
            id="outT"
            type="number"
            min={0}
            step={0.01}
            className="h-7 w-24 bg-white/70 text-xs"
            value={Number.isFinite(range.end) ? Number(range.end.toFixed(2)) : 0}
            onChange={(e) => setOutInput(e.target.value)}
          />
        </div>
      </div>

      {/* Main strip */}
      <div
        ref={trackRef}
        className={cn(
          "mt-2 filmstrip-track relative rounded-xl border border-white/40 bg-white/50 backdrop-blur-md",
          "shadow-[0_8px_26px_rgba(0,0,0,0.10)] px-1 py-1 select-none",
        )}
        style={{ height: 76 }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onMouseMove={onHoverMove}
        onMouseLeave={onHoverLeave}
      >
        <div
          className="grid h-full w-full gap-[2px] overflow-hidden rounded-lg"
          style={{
            gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
          }}
        >
          {frames.map((f, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={f || "/placeholder.svg"}
              alt={"Frame " + (i + 1)}
              className={cn("h-full w-full object-cover", loading && "opacity-70")}
              crossOrigin="anonymous"
            />
          ))}
        </div>

        {/* Dim gutters */}
        <div
          className="pointer-events-none absolute inset-y-1 left-1 rounded-l-lg bg-black/10"
          style={{ width: `${Math.max(0, (range.start / (result?.duration || 1)) * 100)}%` }}
        />
        <div
          className="pointer-events-none absolute inset-y-1 right-1 rounded-r-lg bg-black/10"
          style={{ width: `${Math.max(0, 100 - (range.end / (result?.duration || 1)) * 100)}%` }}
        />

        {/* Active window */}
        <div
          role="slider"
          aria-valuemin={0}
          aria-valuemax={result?.duration || 0}
          aria-valuenow={range.start}
          className="absolute inset-y-1 rounded-md bg-white/30 ring-1 ring-white/60 cursor-grab active:cursor-grabbing"
          style={{
            left: `${(range.start / (result?.duration || 1)) * 100}%`,
            width: `${Math.max(1, ((range.end - range.start) / (result?.duration || 1)) * 100)}%`,
          }}
          onPointerDown={onPointerDown("move")}
          title="Drag selection"
        >
          <div className="pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 rounded-full border border-white/60 bg-white/80 px-2 py-0.5 text-[10px] text-slate-900">
            <span className="inline-flex items-center gap-1">
              <GripVertical className="h-3 w-3" /> {fmtMMSS(range.end - range.start)}
            </span>
          </div>
        </div>

        {/* Handles */}
        <FSHandle left pct={(range.start / (result?.duration || 1)) * 100} onPointerDown={onPointerDown("start")} />
        <FSHandle pct={(range.end / (result?.duration || 1)) * 100} onPointerDown={onPointerDown("end")} />
      </div>

      {/* Minimap */}
      <div className="mt-2 hidden sm:block">
        <div className="relative overflow-hidden rounded-lg border border-white/40 bg-white/40">
          <div
            className="grid h-10 w-full gap-[2px]"
            style={{ gridTemplateColumns: `repeat(${miniFrames.length},1fr)` }}
          >
            {miniFrames.map((f, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={f || "/placeholder.svg"}
                alt={"Mini " + (i + 1)}
                className="h-10 w-full object-cover opacity-80 blur-[0.2px]"
              />
            ))}
          </div>
          <div
            className="absolute inset-y-0 rounded-md ring-2 ring-emerald-400/80 bg-emerald-200/20"
            style={{
              left: `${(range.start / duration) * 100}%`,
              width: `${((range.end - range.start) / duration) * 100}%`,
            }}
          />
        </div>
      </div>
    </div>
  )
}

function FSHandle({
  pct,
  onPointerDown,
  left,
}: {
  pct: number
  onPointerDown: (e: React.PointerEvent) => void
  left?: boolean
}) {
  return (
    <div
      className={cn("absolute top-1/2 -translate-y-1/2", left ? "left-0" : "left-0")}
      style={{ transform: `translate(calc(${pct}% - 8px), -50%)` }}
    >
      <button
        aria-label={left ? "Trim start" : "Trim end"}
        onPointerDown={onPointerDown}
        className={cn(
          "film-handle h-9 w-3 rounded-md border border-emerald-400/80 bg-emerald-300 shadow",
          "hover:bg-emerald-200 active:bg-emerald-300",
        )}
        title={left ? "Start handle" : "End handle"}
      />
    </div>
  )
}
