"use client"

import type React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { X, ImageIcon, VideoIcon } from "lucide-react"
import GlassSurface from '@/components/ui/glass-surface'
import { MOCK_MEDIA } from "@/lib/glassmorphic-mock-media"

export type MediaItem = {
  id: string
  kind: "photo" | "video"
  src: string
  label: string
  accent?: string
  poster?: string
}

export default function MediaPopup({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  // Hide the top AI tools bar while media is open to reduce clutter
  useEffect(() => {
    if (!isOpen) return
    const toolbar = document.querySelector('[aria-label="Top toolbar"]') as HTMLElement | null
    const aiSidebar = document.querySelector('[data-ai-tools-sidebar]') as HTMLElement | null
    const prev = toolbar?.style.display || ''
    if (toolbar) toolbar.style.display = 'none'
    // Fully fold the AI Tools sidebar if present
    const sidebarPrev = aiSidebar?.style.transform || ''
    if (aiSidebar) aiSidebar.style.transform = 'translateX(-110%)'
    return () => {
      if (toolbar) toolbar.style.display = prev
      if (aiSidebar) aiSidebar.style.transform = sidebarPrev
    }
  }, [isOpen])
  const asideRef = useRef<HTMLDivElement | null>(null)

  // Derive initial sets from shared mock data
  const initialPhotos = useMemo<MediaItem[]>(
    () =>
      MOCK_MEDIA.filter((m) => m.kind === "photo").map((m, i) => ({
        id: m.id,
        kind: "photo",
        src: m.src,
        label: m.label,
        accent: i % 3 === 0 ? "from-emerald-100/40" : i % 3 === 1 ? "from-violet-100/40" : "from-amber-100/40",
      })),
    [],
  )
  const initialVideos = useMemo<MediaItem[]>(
    () =>
      MOCK_MEDIA.filter((m) => m.kind === "video").map((m, i) => ({
        id: m.id,
        kind: "video",
        src: m.src, // actual video URL
        poster: m.poster || "/placeholder.svg?height=120&width=200",
        label: m.label,
        accent: i % 3 === 0 ? "from-lime-100/40" : i % 3 === 1 ? "from-rose-100/40" : "from-sky-100/40",
      })),
    [],
  )

  const [photos, setPhotos] = useState<MediaItem[]>(initialPhotos)
  const [videos, setVideos] = useState<MediaItem[]>(initialVideos)

  const removeItem = (id: string) => {
    setPhotos((prev) => prev.filter((i) => i.id !== id))
    setVideos((prev) => prev.filter((i) => i.id !== id))
  }

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ id?: string }>).detail
      if (detail?.id) removeItem(detail.id)
    }
    window.addEventListener("media-dropped", handler as EventListener)
    return () => window.removeEventListener("media-dropped", handler as EventListener)
  }, [])

  if (!isOpen) return null

  // Align vertically with the editor's top and bottom button groups
  // Add ~72-80px extra offset beyond safe-area to match the groups visually
  const topOffset = "calc(max(1rem, env(safe-area-inset-top, 1rem)) + 72px)"
  const bottomOffset = "calc(max(1rem, env(safe-area-inset-bottom, 1rem)) + 80px)"

  return (
    <aside
      ref={asideRef}
      className={cn(
        // Container; glass is applied via inner GlassSurface to unify styling
        "fixed left-4 z-[200120] w-[380px] max-w-[calc(100vw-2rem)] rounded-3xl",
        "animate-appear text-white/90 overflow-hidden flex flex-col",
      )}
      style={{
        top: topOffset,
        bottom: bottomOffset,
        maxHeight: "calc(100vh - 2rem)",
      }}
      aria-label="Media Library"
    >
      <GlassSurface
        width="100%"
        height="100%"
        borderRadius={36}
        backgroundOpacity={0.08}
        distortionScale={-55}
        redOffset={6}
        greenOffset={2}
        blueOffset={-4}
        displace={0.6}
        className="absolute inset-0"
        contentClassName="relative h-full flex flex-col"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 px-3 pt-3">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/40 bg-white/30 px-3 py-2 shadow-[0_12px_28px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.6)]">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-white/45 bg-white/30 px-3 py-1.5 text-sm font-medium text-white shadow-2xl hover:bg-white/40 transition-colors"
              aria-label="Media"
            >
              <VideoIcon className="h-4 w-4" />
              <span>Media</span>
            </button>
            <button
              aria-label="Close media"
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-xl border border-white/40 bg-white/30 text-white hover:bg-white/40 shadow-2xl"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scroll body */}
        <div className="media-scroll media-scroll--mask flex-1 min-h-0 overflow-y-auto px-3 pb-6">
        {/* Videos */}
        {videos.length > 0 && (
          <section className="pb-3">
            <div className="mb-2 inline-flex items-center gap-2 rounded-xl border border-white/35 bg-white/20 px-2.5 py-1 text-[11px] uppercase tracking-wide text-white/85 shadow-2xl">
              <VideoIcon className="h-3.5 w-3.5" />
              <span>Videos</span>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {videos.map((m) => (
                <MediaTile 
                  key={m.id} 
                  item={m} 
                  asideRef={asideRef}
                  onRemove={removeItem} 
                />
              ))}
            </div>
          </section>
        )}

        {/* Photos */}
        {photos.length > 0 && (
          <section className="pt-2">
            <div className="mb-2 inline-flex items-center gap-2 rounded-xl border border-white/35 bg-white/20 px-2.5 py-1 text-[11px] uppercase tracking-wide text-white/85 shadow-2xl">
              <ImageIcon className="h-3.5 w-3.5" />
              <span>Photos</span>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {photos.map((m) => (
                <MediaTile key={m.id} item={m} asideRef={asideRef} onRemove={removeItem} />
              ))}
            </div>
          </section>
        )}

          {videos.length === 0 && photos.length === 0 && (
            <div className="mt-10 rounded-2xl border border-white/20 bg-white/10 p-6 text-center text-sm text-white/70">
              Your media library is empty. Drag files into the canvas or add new media.
            </div>
          )}
        </div>
      </GlassSurface>
    </aside>
  )
}

function MediaTile({
  item,
  asideRef,
  onRemove,
}: {
  item: MediaItem
  asideRef: React.RefObject<HTMLDivElement | null>
  onRemove: (id: string) => void
}) {
  // Smooth, clean drag payload for canvas/template receivers
  const onDragStart = (e: React.DragEvent) => {
    try {
      const payload = JSON.stringify({
        id: item.id,
        kind: item.kind,
        src: item.src,
        label: item.label,
        poster: item.poster,
      })
      e.dataTransfer.setData('application/x-media-item', payload)
      e.dataTransfer.effectAllowed = 'copy'
      // Ultra-light drag image for smoothness
      const img = new Image()
      img.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACw='
      e.dataTransfer.setDragImage(img, 0, 0)
    } catch {}
  }

  const onDragEnd = (e: React.DragEvent) => {
    const rect = asideRef.current?.getBoundingClientRect()
    if (!rect) return
    const { clientX, clientY } = e
    const outside =
      clientX < rect.left - 4 || clientX > rect.right + 4 || clientY < rect.top - 4 || clientY > rect.bottom + 4
    if (outside) onRemove(item.id)
  }

  const visualSrc = item.kind === "video" ? item.poster || "/placeholder.svg?height=118&width=200" : item.src

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={cn("media-tile group relative overflow-hidden rounded-2xl border border-white/40 bg-white/22 backdrop-blur-xl shadow-[0_12px_28px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.6)]")}
      role="button"
      aria-label={`${item.kind}: ${item.label}`}
      title="Drag onto canvas or template slot"
    >
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-b to-transparent pointer-events-none",
          item.accent || "from-white/25",
        )}
      />
      <img
        src={visualSrc || "/placeholder.svg"}
        alt={item.label}
        className="block h-[118px] w-full object-cover rounded-2xl transition-transform duration-300 group-hover:scale-[1.015]"
        crossOrigin="anonymous"
      />
      {/* Footer stripe */}
      <div className="tile-meta flex items-center justify-between gap-2 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          {item.kind === "photo" ? (
            <span className="grid h-6 w-6 place-items-center rounded-xl border border-white/40 bg-white/30 text-white">
              <ImageIcon className="h-3.5 w-3.5" />
            </span>
          ) : (
            <span className="grid h-6 w-6 place-items-center rounded-xl border border-white/40 bg-white/30 text-white">
              <VideoIcon className="h-3.5 w-3.5" />
            </span>
          )}
          <span className="truncate text-sm text-white">{item.label}</span>
        </div>
        <span className="drag-pill rounded-full border border-white/45 bg-white/30 px-2.5 py-1 text-xs text-white shadow-2xl">View</span>
      </div>
    </div>
  )
}
