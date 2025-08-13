"use client"

import type React from "react"

import { useEffect, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { ImageIcon, VideoIcon, Search, X } from "lucide-react"
import NextImage from "next/image"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import SpeedRampingDialog from "@/components/glassmorphic-speed-ramping-dialog"

export type MediaBoardItem = {
  id: string
  kind: "photo" | "video"
  src: string
  label: string
  poster?: string
}

export default function MediaBoard({
  items,
  className,
}: {
  items: MediaBoardItem[]
  className?: string
}) {
  const [query, setQuery] = useState("")
  const [tab, setTab] = useState<"all" | "photo" | "video">("all")
  const [activeId, setActiveId] = useState<string | null>(null)
  const [fading, setFading] = useState(false)
  const [speedRampingItem, setSpeedRampingItem] = useState<MediaBoardItem | null>(null)

  // Only one preview video plays at a time (throttled)
  const currentPreviewRef = useRef<HTMLVideoElement | null>(null)

  // Pause any preview video when this component unmounts
  useEffect(() => {
    return () => {
      try {
        currentPreviewRef.current?.pause()
      } catch {}
      currentPreviewRef.current = null
    }
  }, [])

  // Pause any playing preview when we open the lightbox (avoid double decodes)
  useEffect(() => {
    if (activeId) {
      try {
        currentPreviewRef.current?.pause()
      } catch {}
      currentPreviewRef.current = null
    }
  }, [activeId])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((i) => {
      if (tab !== "all" && i.kind !== tab) return false
      if (!q) return true
      return i.label.toLowerCase().includes(q)
    })
  }, [items, query, tab])

  const activeIndex = activeId ? filtered.findIndex((i) => i.id === activeId) : -1
  const active = activeIndex >= 0 ? filtered[activeIndex] : null

  const open = async (id: string) => {
    setFading(true)
    setActiveId(id)
    // cross-fade entry
    requestAnimationFrame(() => setFading(false))
  }
  const close = () => setActiveId(null)
  const next = () => {
    if (!filtered.length) return
    const idx = activeIndex < 0 ? 0 : (activeIndex + 1) % filtered.length
    setActiveId(filtered[idx].id)
  }
  const prev = () => {
    if (!filtered.length) return
    const idx = activeIndex < 0 ? 0 : (activeIndex - 1 + filtered.length) % filtered.length
    setActiveId(filtered[idx].id)
  }

  // Preload neighbors (image decode, video metadata)
  useEffect(() => {
    if (!active) return
    const preload = (target: MediaBoardItem) => {
      if (target.kind === "photo") {
        const img = new window.Image()
        img.crossOrigin = "anonymous"
        img.src = target.src
        img.decode?.().catch(() => {})
      } else {
        const v = document.createElement("video")
        v.preload = "metadata"
        v.src = target.src
        v.load()
      }
    }
    const n1 = filtered[(activeIndex + 1) % filtered.length]
    const n2 = filtered[(activeIndex - 1 + filtered.length) % filtered.length]
    if (n1) preload(n1)
    if (n2) preload(n2)
  }, [active, activeIndex, filtered])

  // IntersectionObserver to auto-pause grid previews that scroll out of view
  useEffect(() => {
    const vids = Array.from(document.querySelectorAll<HTMLVideoElement>('[data-board-preview="1"]'))
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          const v = en.target as HTMLVideoElement
          if (!en.isIntersecting) {
            try {
              if (!v.paused) v.pause()
              if (currentPreviewRef.current === v) currentPreviewRef.current = null
            } catch {}
          }
        }
      },
      { root: null, rootMargin: "0px", threshold: 0.1 },
    )
    vids.forEach((v) => io.observe(v))
    return () => io.disconnect()
  })

  return (
    <div className={cn("absolute inset-0 p-4 sm:p-6 md:p-8", className)}>
      {/* Header */}
      <div
        className={cn(
          "distort backdrop-boost mx-auto flex w-full max-w-6xl items-center gap-3 rounded-2xl border",
          "border-white/20 bg-white/10 px-3 py-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.25)]",
        )}
      >
        <div className="flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 p-1">
          <button
            aria-label="All"
            onClick={() => setTab("all")}
            className={cn(
              "px-3 py-1.5 text-xs rounded-full text-white/80 transition-colors",
              tab === "all" && "bg-white/80 text-slate-900",
            )}
          >
            All
          </button>
          <button
            aria-label="Photos"
            onClick={() => setTab("photo")}
            className={cn(
              "px-3 py-1.5 text-xs rounded-full text-white/80 transition-colors",
              tab === "photo" && "bg-white/80 text-slate-900",
            )}
          >
            Photos
          </button>
          <button
            aria-label="Videos"
            onClick={() => setTab("video")}
            className={cn(
              "px-3 py-1.5 text-xs rounded-full text-white/80 transition-colors",
              tab === "video" && "bg-white/80 text-slate-900",
            )}
          >
            Videos
          </button>
        </div>

        <div className="mx-2 h-6 w-px bg-white/20" />

        <div className="relative ml-auto flex min-w-0 flex-1 items-center gap-2">
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-white/70" />
          <input
            aria-label="Search media"
            placeholder="Search media..."
            className="w-full rounded-xl border border-white/25 bg-white/15 px-9 py-2 text-sm text-white/90 placeholder-white/60 outline-none backdrop-blur-md"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              aria-label="Clear search"
              className="absolute right-2 grid h-7 w-7 place-items-center rounded-full border border-white/25 bg-white/20 text-white/80"
              onClick={() => setQuery("")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="mx-auto mt-4 w-full max-w-6xl">
        {filtered.length === 0 ? (
          <div className="distort backdrop-boost mx-auto mt-10 max-w-lg rounded-3xl border border-white/20 bg-white/10 p-10 text-center text-white/80">
            <div className="mx-auto mb-4 h-12 w-12 rounded-2xl border border-white/20 bg-white/15" />
            <div className="text-lg font-medium text-white/95">No media found</div>
            <div className="mt-1 text-sm text-white/70">
              Try adjusting your filters or add media from the Media panel.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((m) => (
              <MediaCard
                key={m.id}
                item={m}
                onOpen={() => open(m.id)}
                currentPreviewRef={currentPreviewRef}
                onSpeedRamping={() => setSpeedRampingItem(m)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      <Dialog open={!!active} onOpenChange={(v) => !v && close()}>
        <DialogContent
          className={cn(
            "max-w-5xl border-white/25 bg-white/10 p-0 text-white/95 backdrop-blur-2xl transition-opacity duration-200",
            fading ? "opacity-0" : "opacity-100",
          )}
        >
          <DialogHeader className="px-4 pb-2 pt-3">
            <DialogTitle className="text-white/95">{active?.label || "Preview"}</DialogTitle>
            <DialogDescription className="text-white/70">
              {active?.kind === "photo" ? "Image" : "Video"} preview
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 p-4 pt-0">
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-white/20 bg-black/30">
              {active?.kind === "video" ? (
                <video
                  src={active.src}
                  controls
                  preload="metadata"
                  poster={active.poster || "/placeholder.svg?height=540&width=960"}
                  className="h-full w-full object-contain"
                  playsInline
                  disablePictureInPicture
                  controlsList="nodownload noplaybackrate"
                />
              ) : (
                <NextImage
                  src={active?.src || "/placeholder.svg?height=720&width=1280"}
                  alt={active?.label || "Image preview"}
                  fill
                  className="object-contain will-change-transform"
                  priority
                />
              )}
            </div>
            <div className="flex items-center justify-between text-sm text-white/80">
              <div className="flex items-center gap-2">
                {active?.kind === "photo" ? (
                  <span className="grid h-7 w-7 place-items-center rounded-full border border-white/25 bg-white/15">
                    <ImageIcon className="h-4 w-4" />
                  </span>
                ) : (
                  <span className="grid h-7 w-7 place-items-center rounded-full border border-white/25 bg-white/15">
                    <VideoIcon className="h-4 w-4" />
                  </span>
                )}
                <span>{active?.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={prev}
                  className="rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-white/90 hover:bg-white/25"
                >
                  Prev
                </button>
                <button
                  onClick={next}
                  className="rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-white/90 hover:bg-white/25"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Speed Ramping Dialog */}
      <SpeedRampingDialog
        isOpen={!!speedRampingItem}
        onClose={() => setSpeedRampingItem(null)}
        mediaItem={
          speedRampingItem
            ? {
                id: speedRampingItem.id,
                label: speedRampingItem.label,
                kind: speedRampingItem.kind,
              }
            : undefined
        }
        onApply={(points) => {
          console.log("Speed ramping applied:", points)
          // Here you would integrate with your video processing logic
        }}
      />
    </div>
  )
}

function MediaCard({
  item,
  onOpen,
  currentPreviewRef,
  onSpeedRamping,
}: {
  item: MediaBoardItem
  onOpen: () => void
  currentPreviewRef: React.MutableRefObject<HTMLVideoElement | null>
  onSpeedRamping: () => void
}) {
  // Throttle hover play with RAF
  const hoverFrame = useRef<number | null>(null)

  const onEnter = (e: React.MouseEvent<HTMLVideoElement>) => {
    const v = e.currentTarget
    if (hoverFrame.current) cancelAnimationFrame(hoverFrame.current)
    hoverFrame.current = requestAnimationFrame(async () => {
      try {
        // pause another preview if playing
        if (currentPreviewRef.current && currentPreviewRef.current !== v) {
          currentPreviewRef.current.pause()
        }
        currentPreviewRef.current = v
        v.currentTime = 0
        await v.play().catch(() => {})
      } catch {}
    })
  }
  const onLeave = (e: React.MouseEvent<HTMLVideoElement>) => {
    const v = e.currentTarget
    if (hoverFrame.current) {
      cancelAnimationFrame(hoverFrame.current)
      hoverFrame.current = null
    }
    try {
      v.pause()
    } catch {}
    if (currentPreviewRef.current === v) currentPreviewRef.current = null
  }

  const handleClick = (e: React.MouseEvent) => {
    // Only open on left click, not right click
    if (e.button === 0) {
      onOpen()
    }
  }

  const handleSpeedRampingClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent opening the media preview
    onSpeedRamping()
  }

  const onKeyDownOpen: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      onOpen()
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={onKeyDownOpen}
      className={cn(
        "group distort backdrop-boost block overflow-hidden rounded-2xl border border-white/18 bg-white/10 text-left",
        "shadow-[0_12px_40px_rgba(0,0,0,0.25)] transition-transform hover:-translate-y-0.5",
        "will-change-transform",
      )}
      aria-label={`Open ${item.kind}: ${item.label}`}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        {item.kind === "video" ? (
          <video
            className="h-full w-full object-cover opacity-95"
            src={item.src || "/placeholder.svg"}
            muted
            preload="metadata"
            playsInline
            disablePictureInPicture
            controlsList="nodownload noplaybackrate"
            poster={item.poster || "/placeholder.svg?height=300&width=400"}
            onMouseEnter={onEnter}
            onMouseLeave={onLeave}
            data-board-preview="1"
          />
        ) : (
          <NextImage
            src={item.src || "/placeholder.svg?height=400&width=600"}
            alt={item.label}
            fill
            priority={false}
            className="object-cover"
          />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/30" />
        <div className="absolute left-3 top-3 flex flex-col items-start gap-3 z-10">
          <span className="grid h-8 w-8 place-items-center rounded-full border border-white/30 bg-white/25 text-white/95 backdrop-blur-md shadow-lg">
            {item.kind === "photo" ? <ImageIcon className="h-4 w-4" /> : <VideoIcon className="h-4 w-4" />}
          </span>
        {item.kind === "video" && (
          <button
            onClick={handleSpeedRampingClick}
            className="pointer-events-auto grid h-9 w-9 place-items-center rounded-full border-2 border-purple-400/60 bg-purple-600/90 text-white shadow-xl backdrop-blur-md transition-all hover:bg-purple-500/95 hover:scale-125 hover:shadow-2xl hover:border-purple-300/80 active:scale-110"
            aria-label="Speed Ramping"
            title="Speed Ramping"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </button>
        )}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 px-3 py-2.5">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-white/95">{item.label}</div>
          <div className="text-xs text-white/70">{item.kind === "photo" ? "Image" : "Video"}</div>
        </div>
        <span className="rounded-full border border-white/25 bg-white/15 px-2 py-1 text-xs text-white/85">Open</span>
      </div>
    </div>
  )
}
