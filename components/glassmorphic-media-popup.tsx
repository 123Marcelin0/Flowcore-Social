"use client"

import type React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { X, ImageIcon, VideoIcon } from "lucide-react"
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

  const topOffset = "max(1rem, env(safe-area-inset-top, 1rem))"
  const bottomOffset = "max(1rem, env(safe-area-inset-bottom, 1rem))"

  return (
    <aside
      ref={asideRef}
      className={cn(
        "media-drawer distort media-drawer--dark",
        "fixed left-4 z-[200120] w-[320px] max-w-[calc(100vw-2rem)] rounded-3xl border",
        "animate-appear text-white/90",
      )}
      style={{
        top: topOffset,
        bottom: bottomOffset,
        maxHeight: "calc(100vh - 2rem)",
      }}
      aria-label="Media Library"
    >
      {/* Header */}
      <div className="media-header sticky top-0 z-10 flex items-center justify-between gap-3 rounded-t-3xl px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-full border border-white/25 bg-white/15">
            <VideoIcon className="h-4 w-4 text-white/90" />
          </div>
          <span className="text-sm font-medium">Media</span>
        </div>
        <button
          aria-label="Close media"
          onClick={onClose}
          className="grid h-8 w-8 place-items-center rounded-full border border-white/25 bg-white/15 text-white/90 hover:bg-white/25"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Scroll body */}
      <div className="media-scroll media-scroll--mask h-full overflow-y-auto px-3 pb-4">
        {/* Videos */}
        {videos.length > 0 && (
          <section className="pb-3">
            <div className="media-section-label">
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
            <div className="media-section-label">
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
      className={cn("media-tile group relative overflow-hidden rounded-2xl border border-white/18 bg-white/10")}
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
        className="block h-[118px] w-full object-cover"
        crossOrigin="anonymous"
      />
      {/* Footer stripe */}
      <div className="tile-meta flex items-center justify-between gap-2 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          {item.kind === "photo" ? (
            <span className="grid h-6 w-6 place-items-center rounded-full border border-white/20 bg-white/15 text-white/90">
              <ImageIcon className="h-3.5 w-3.5" />
            </span>
          ) : (
            <span className="grid h-6 w-6 place-items-center rounded-full border border-white/20 bg-white/15 text-white/90">
              <VideoIcon className="h-3.5 w-3.5" />
            </span>
          )}
          <span className="truncate text-sm text-white/95">{item.label}</span>
        </div>
        <span className="drag-pill">View</span>
      </div>
    </div>
  )
}
