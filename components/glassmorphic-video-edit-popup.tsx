"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Scissors,
  Volume2,
  VolumeX,
  Gauge,
  X,
  Clock,
  Repeat,
} from "lucide-react"

function fmtTime(t: number) {
  if (!isFinite(t)) return "0:00"
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  const ms = Math.floor((t % 1) * 1000)
  return `${m}:${s.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`
}

export default function VideoEditPopup({
  open,
  onOpenChange,
  src,
  poster,
  label,
  start = 0,
  end,
  scrubTo,
  onLoopWindowChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  src: string
  poster?: string
  label?: string
  start?: number
  end?: number
  scrubTo?: number | null
  onLoopWindowChange?: (info: { start: number; end: number }) => void
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [duration, setDuration] = useState<number>(0)
  const [current, setCurrent] = useState<number>(0)
  const [playing, setPlaying] = useState<boolean>(false)
  const [muted, setMuted] = useState<boolean>(false)
  const [volume, setVolume] = useState<number>(0.9)
  const [rate, setRate] = useState<number>(1)
  const [loopRange, setLoopRange] = useState<boolean>(true)

  const inPoint = useMemo(() => Math.max(0, Math.min(start ?? 0, duration || 0)), [start, duration])
  const outPoint = useMemo(
    () => Math.max(inPoint + 0.05, Math.min(end ?? (duration || 0), duration || 0)),
    [end, inPoint, duration],
  )

  // Metadata
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const onMeta = () => {
      const d = v.duration || 0
      setDuration(isFinite(d) ? d : 0)
    }
    const onTime = () => setCurrent(v.currentTime || 0)
    v.addEventListener("loadedmetadata", onMeta)
    v.addEventListener("timeupdate", onTime)
    return () => {
      v.removeEventListener("loadedmetadata", onMeta)
      v.removeEventListener("timeupdate", onTime)
    }
  }, [src])

  // Apply playback settings
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.playbackRate = rate
    v.muted = muted
    v.volume = volume
  }, [rate, muted, volume])

  // Loop between in/out when playing
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const onTime = () => {
      if (loopRange && isFinite(outPoint) && v.currentTime > outPoint - 0.01) {
        v.currentTime = Math.max(inPoint, 0)
        if (!v.paused) v.play().catch(() => {})
      }
    }
    v.addEventListener("timeupdate", onTime)
    return () => v.removeEventListener("timeupdate", onTime)
  }, [inPoint, outPoint, loopRange])

  // External scrub from filmstrip
  useEffect(() => {
    const v = videoRef.current
    if (!v || scrubTo == null || Number.isNaN(scrubTo)) return
    v.currentTime = Math.max(0, Math.min(duration || 0, scrubTo))
  }, [scrubTo, duration])

  // Keyboard transport: J/K/L step, I/O set marks, Space play/pause
  useEffect(() => {
    if (!open) return
    const step = (dir: -1 | 1, amount = 0.04) => {
      const v = videoRef.current
      if (!v) return
      v.currentTime = Math.max(0, Math.min(duration || 0, v.currentTime + dir * amount))
    }
    const onKey = (e: KeyboardEvent) => {
      // Ignore when typing in inputs
      const target = e.target as HTMLElement | null
      const isInput =
        !!target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || (target as HTMLElement).isContentEditable)
      if (isInput) return

      const key = e.key.toLowerCase()
      if (key === " " || key === "k") {
        e.preventDefault()
        togglePlay()
      } else if (key === "j") {
        e.preventDefault()
        step(-1)
      } else if (key === "l") {
        e.preventDefault()
        step(1)
      } else if (key === "i") {
        e.preventDefault()
        markIn()
      } else if (key === "o") {
        e.preventDefault()
        markOut()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, duration, inPoint, outPoint])

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      v.play().catch(() => {})
      setPlaying(true)
    } else {
      v.pause()
      setPlaying(false)
    }
  }
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    v.addEventListener("play", onPlay)
    v.addEventListener("pause", onPause)
    return () => {
      v.removeEventListener("play", onPlay)
      v.removeEventListener("pause", onPause)
    }
  }, [])

  const jumpTo = (t: number) => {
    const v = videoRef.current
    if (!v) return
    v.currentTime = Math.max(0, Math.min(duration || 0, t))
  }
  const stepBy = (delta: number) => {
    const v = videoRef.current
    if (!v) return
    v.currentTime = Math.max(0, Math.min(duration || 0, v.currentTime + delta))
  }

  const markIn = () => {
    onLoopWindowChange?.({ start: current, end: outPoint })
  }
  const markOut = () => {
    const endT = Math.max(current, inPoint + 0.05)
    onLoopWindowChange?.({ start: inPoint, end: endT })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className={cn(
          "my-4 max-w-5xl border-white/25 bg-white/10 p-0 text-white/95 backdrop-blur-2xl z-[200150]",
          "shadow-[0_20px_70px_rgba(0,0,0,0.35)]",
          "max-h-[min(92vh,900px)] overflow-y-auto",
        )}
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
      >
        <DialogHeader className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-white/95">{label || "Edit Video"}</DialogTitle>
              <DialogDescription className="text-white/70">
                Double‑click a video node to trim. Use I/O to mark In/Out • J/K/L for transport.
              </DialogDescription>
            </div>
            <Button
              variant="secondary"
              className="rounded-full border border-white/30 bg-white/20 text-white hover:bg-white/30"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          </div>
        </DialogHeader>

        {/* Transport */}
        <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
          <div className="flex items-center gap-1 rounded-full border border-white/25 bg-white/15 p-1 backdrop-blur-xl">
            <Button
              variant="ghost"
              className="h-8 rounded-full text-white/90 hover:bg-white/20"
              onClick={() => jumpTo(inPoint)}
              aria-label="Jump to In"
              title="Jump to In"
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              className="h-8 rounded-full text-white/90 hover:bg-white/20"
              onClick={() => stepBy(-0.04)}
              aria-label="Step back"
              title="Step back (J)"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="default"
              className="h-8 rounded-full bg-white/85 text-slate-900 hover:bg-white"
              onClick={togglePlay}
              aria-label={playing ? "Pause" : "Play"}
              title="Play/Pause (Space/K)"
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              className="h-8 rounded-full text-white/90 hover:bg-white/20"
              onClick={() => stepBy(0.04)}
              aria-label="Step forward"
              title="Step forward (L)"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              className="h-8 rounded-full text-white/90 hover:bg-white/20"
              onClick={() => jumpTo(outPoint)}
              aria-label="Jump to Out"
              title="Jump to Out"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          <div className="mx-2 h-6 w-px bg-white/25" />

          <div className="flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-2 py-1">
            <Clock className="h-4 w-4 text-white/80" />
            <span className="tabular-nums text-sm">
              {fmtTime(current)} / {fmtTime(duration)}
            </span>
          </div>

          <div className="mx-2 h-6 w-px bg-white/25" />

          <div className="flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-2 py-1">
            <Repeat className="h-4 w-4 text-white/80" />
            <Label className="text-xs text-white/80">Loop range</Label>
            <button
              className={cn(
                "ml-1 rounded-full px-2 py-1 text-xs",
                loopRange ? "bg-white/85 text-slate-900" : "bg-white/10 text-white/80",
              )}
              onClick={() => setLoopRange((v) => !v)}
            >
              {loopRange ? "On" : "Off"}
            </button>
          </div>

          <div className="mx-2 h-6 w-px bg-white/25" />

          <div className="flex items-center gap-3 rounded-full border border-white/25 bg-white/15 px-3 py-1">
            <Gauge className="h-4 w-4 text-white/80" />
            <button
              className={cn(
                "rounded-full px-2 py-1 text-xs",
                rate === 0.5 ? "bg-white/85 text-slate-900" : "bg-white/10 text-white/80",
              )}
              onClick={() => setRate(0.5)}
            >
              0.5x
            </button>
            <button
              className={cn(
                "rounded-full px-2 py-1 text-xs",
                rate === 1 ? "bg-white/85 text-slate-900" : "bg-white/10 text-white/80",
              )}
              onClick={() => setRate(1)}
            >
              1x
            </button>
            <button
              className={cn(
                "rounded-full px-2 py-1 text-xs",
                rate === 2 ? "bg-white/85 text-slate-900" : "bg-white/10 text-white/80",
              )}
              onClick={() => setRate(2)}
            >
              2x
            </button>
          </div>

          <div className="mx-2 h-6 w-px bg-white/25" />

          <div className="flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1">
            <button
              className="rounded-full bg-white/10 p-1 text-white/90 hover:bg-white/20"
              aria-label={muted ? "Unmute" : "Mute"}
              onClick={() => setMuted((m) => !m)}
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <div className="w-24">
              <Slider
                value={[Math.round(volume * 100)]}
                onValueChange={(v) => setVolume(Math.max(0, Math.min(1, (v?.[0] ?? 0) / 100)))}
              />
            </div>
          </div>

          <div className="mx-2 h-6 w-px bg-white/25" />

          <div className="flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-2 py-1">
            <button
              className="rounded-full bg-white/85 px-2 py-1 text-xs text-slate-900 hover:bg-white"
              onClick={markIn}
              title="Mark In (I)"
            >
              <span className="inline-flex items-center gap-1">
                <Scissors className="h-3.5 w-3.5" /> In
              </span>
            </button>
            <button
              className="rounded-full bg-white/85 px-2 py-1 text-xs text-slate-900 hover:bg-white"
              onClick={markOut}
              title="Mark Out (O)"
            >
              <span className="inline-flex items-center gap-1">
                <Scissors className="h-3.5 w-3.5" /> Out
              </span>
            </button>
          </div>
        </div>

        {/* Player */}
        <div className="flex flex-col gap-3 px-4 pb-4">
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-white/20 bg-black/40">
            <video
              ref={videoRef}
              src={src}
              controls={false}
              playsInline
              poster={poster || "/placeholder.svg?height=540&width=960"}
              preload="metadata"
              disablePictureInPicture
              controlsList="nodownload noplaybackrate"
              className="h-full w-full object-contain"
            />
            {/* In/out overlay marker bar */}
            <div className="absolute inset-x-6 bottom-3 h-1.5 rounded-full bg-white/20">
              <div
                className="absolute inset-y-0 rounded-full bg-emerald-300/80"
                style={{
                  left: `${((inPoint ?? 0) / (duration || 1)) * 100}%`,
                  width: `${(((outPoint ?? (duration || 1)) - (inPoint ?? 0)) / (duration || 1)) * 100}%`,
                }}
              />
              <div
                className="absolute -top-2 h-5 w-[2px] rounded bg-emerald-400"
                style={{ left: `${((inPoint ?? 0) / (duration || 1)) * 100}%` }}
                title={"In: " + fmtTime(inPoint)}
              />
              <div
                className="absolute -top-2 h-5 w-[2px] rounded bg-emerald-400"
                style={{ left: `${((outPoint ?? 0) / (duration || 1)) * 100}%` }}
                title={"Out: " + fmtTime(outPoint)}
              />
            </div>

            {/* Play button overlay (center) */}
            <button
              className={cn(
                "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full",
                "border border-white/25 bg-white/80 p-4 text-slate-900 backdrop-blur-xl hover:bg-white",
              )}
              onClick={togglePlay}
              aria-label={playing ? "Pause" : "Play"}
              title="Play/Pause"
            >
              {playing ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
            </button>
          </div>

          {/* Scrubber */}
          <div className="flex items-center gap-3">
            <span className="tabular-nums text-xs text-white/80 w-24">{fmtTime(current)}</span>
            <div className="flex-1">
              <Slider
                value={[Math.max(0, Math.min(duration || 0, current))]}
                max={Math.max(0, duration || 0)}
                step={0.01}
                onValueChange={(v) => jumpTo(v?.[0] ?? 0)}
              />
            </div>
            <span className="tabular-nums text-xs text-white/70 w-24 text-right">{fmtTime(duration)}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
