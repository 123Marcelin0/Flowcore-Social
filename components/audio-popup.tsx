"use client"

import type React from "react"
import { useState } from "react"
import Image from "next/image"
import {
  Search,
  Heart,
  MoreVertical,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Repeat,
  Shuffle,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

type Track = {
  id: number
  title: string
  tag: string
  listens: string
  duration: string
  cover: string
  liked?: boolean
}

const initialTracks: Track[] = [
  {
    id: 1,
    title: "Say Yes to Heaven",
    tag: "#Choice",
    listens: "93,654 Listened",
    duration: "6:45 sec",
    cover: "/placeholder.svg?height=56&width=56",
    liked: true,
  },
  {
    id: 2,
    title: "Thinking of You",
    tag: "#Abdomein",
    listens: "40,364 Listened",
    duration: "2:57 sec",
    cover: "/placeholder.svg?height=56&width=56",
  },
  {
    id: 3,
    title: "Only Girl (In the World)",
    tag: "#Desire",
    listens: "10,364 Listened",
    duration: "1:20 sec",
    cover: "/placeholder.svg?height=56&width=56",
  },
  {
    id: 4,
    title: "The Conspire of the Bird",
    tag: "#Inspired",
    listens: "73,547 Listened",
    duration: "2:15 sec",
    cover: "/placeholder.svg?height=56&width=56",
  },
]

export interface AudioPopupProps {
  isOpen: boolean
  onClose: () => void
  onAudioSelect?: (track: Track) => void
}

export default function AudioPopup({ isOpen, onClose, onAudioSelect }: AudioPopupProps) {
  const [tracks, setTracks] = useState<Track[]>(initialTracks)
  const [isPlaying, setIsPlaying] = useState<boolean>(true)

  const toggleLike = (id: number) => {
    setTracks((prev) => prev.map((t) => (t.id === id ? { ...t, liked: !t.liked } : t)))
  }
  const handleTrackSelect = (track: Track) => {
    onAudioSelect?.(track)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[200100]">
      {/* Darker, blurred tint veil that transforms the page behind */}
      <button
        aria-label="Close music overlay"
        onClick={onClose}
        className="music-tint animate-tint absolute inset-0 z-10"
      />

      {/* NEW: subtle global distortion layer (between tint and content) */}
      <div className="music-distort-layer z-[15] animate-tint" aria-hidden="true" />

      {/* Soft accent shapes behind elements for depth (blurred) */}
      <div className="absolute inset-0 z-20 pointer-events-none animate-appear">
        <div
          className="shape-blur absolute left-1/2 top-10 -translate-x-1/2 w-[72%] h-28 rounded-full"
          style={{ background: "radial-gradient(60% 100% at 50% 0%, rgba(255,255,255,0.22), rgba(255,255,255,0) 70%)" }}
        />
        <div
          className="shape-blur absolute right-24 top-48 w-80 h-80 rounded-full"
          style={{ background: "radial-gradient(55% 55% at 50% 50%, rgba(16,185,129,0.15), rgba(0,0,0,0) 65%)" }}
        />
        <div
          className="shape-blur absolute inset-x-0 bottom-0 h-64"
          style={{ background: "linear-gradient(to top, rgba(15,23,42,0.28), rgba(0,0,0,0))" }}
        />
      </div>

      {/* Main Content */}
      <main
        role="dialog"
        aria-modal="true"
        className="relative z-30 h-[92vh] w-[min(1280px,96vw)] overflow-visible rounded-3xl pt-12 pb-40 mx-auto"
      >
        {/* Close */}
        <button
          aria-label="Close"
          onClick={onClose}
          className={cn(
            "absolute right-6 top-6 z-40 flex h-9 w-9 items-center justify-center rounded-full",
            "border border-white/25 bg-white/20 text-white/90 backdrop-blur-xl hover:bg-white/30",
            "animate-appear",
          )}
        >
          <X className="h-4 w-4" />
        </button>

        {/* Search bar (moved slightly down for balance) */}
        <div className="absolute left-6 right-6 top-4 z-30 animate-appear">
          <div
            className={cn(
              "relative mx-auto flex w-full max-w-[1000px] items-center gap-3 rounded-full px-4 py-2",
              "backdrop-blur-2xl bg-white/20 border border-white/25 shadow-[0_8px_30px_rgba(0,0,0,0.18)]",
              "distort",
            )}
          >
            <div className="pointer-events-none absolute -left-12 -top-10 h-36 w-36 rounded-full bg-white/35 blur-3xl" />
            <div className="pointer-events-none absolute -right-16 -bottom-12 h-40 w-40 rounded-full bg-emerald-300/30 blur-3xl" />
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Search className="h-4 w-4 text-white/80" />
              <input
                aria-label="Search"
                placeholder="Search..."
                className="w-full bg-transparent text-white/90 placeholder-white/60 outline-none"
                defaultValue=""
              />
            </div>
            <div className="mx-2 h-6 w-px bg-white/30" />
            <span className="text-sm text-white/90">Audiobuck</span>
          </div>
        </div>

        {/* Left toolbar */}
        <div className="absolute left-6 top-1/2 z-30 -translate-y-1/2 animate-appear-d1">
          <div className="distort flex flex-col items-center gap-4 rounded-full border border-white/25 bg-white/20 p-2 backdrop-blur-2xl shadow-[0_8px_30px_rgba(0,0,0,0.18)]">
            <IconBubble label="Back">
              <ChevronLeft className="h-4 w-4" />
            </IconBubble>
            <IconBubble label="Forward">
              <ChevronRight className="h-4 w-4" />
            </IconBubble>
            <IconBubble label="Search">
              <Search className="h-4 w-4" />
            </IconBubble>
          </div>
        </div>

        {/* Centered content (kept lower; reserved space for player) */}
        <div className="relative z-20 flex h-full w-full items-center justify-center pt-80 pb-[232px]">
          <section className="relative mx-auto w/full max-w-[780px] px-6 sm:px-8 animate-appear-d2">
            <div
              className={cn(
                "relative overflow-hidden rounded-3xl border border-white/25 bg-white/15 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.25)]",
                "distort",
                "backdrop-boost",
              )}
            >
              {/* blobs */}
              <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-white/40 blur-3xl" />
              <div className="pointer-events-none absolute left-1/3 -top-20 h-52 w-52 rounded-full bg-emerald-300/40 blur-3xl" />
              <div className="pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full bg-amber-300/30 blur-3xl" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 via-white/5 to-black/20" />

              {/* Header */}
              <div className="relative grid grid-cols-1 gap-6 p-6 sm:grid-cols-12 sm:p-8">
                <div className="sm:col-span-7">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-white/70" />
                    <span className="h-3 w-3 rounded-full bg-white/40" />
                    <span className="h-3 w-3 rounded-full bg-white/30" />
                  </div>
                  <div className="text-sm text-white/80">Artist</div>
                  <h1 className="mt-1 text-4xl font-semibold tracking-tight text-white sm:text-5xl">Linkin Park</h1>
                  <div className="mt-2 text-sm text-white/80">241 song Total</div>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Button
                      variant="secondary"
                      className="rounded-full border border-white/30 bg-white/20 text-white hover:bg-white/30"
                    >
                      Following
                    </Button>
                    <Button className="rounded-full bg-white/80 text-gray-900 hover:bg-white" variant="default">
                      Play all
                    </Button>
                  </div>
                  <nav className="mt-6 flex flex-wrap gap-6 text-sm text-white/80">
                    <span className="font-medium text-white">Overview</span>
                    <span className="hover:text-white/90">Related Artist</span>
                    <span className="hover:text-white/90">Lyrics</span>
                  </nav>
                </div>

                {/* Hero image */}
                <div className="relative sm:col-span-5">
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-white/25 bg-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.25)]">
                    <Image
                      src="/placeholder.svg?height=480&width=640"
                      alt="Artist promotional image"
                      fill
                      className="object-cover"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-black/20" />
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="relative mx-6 mb-2 mt-2 h-px bg-white/20 sm:mx-8" />

              {/* Playlist */}
              <div className="relative p-4 sm:p-6">
                <h2 className="px-2 text-lg font-medium text-white/95 sm:px-4">Top Playlist</h2>
                <ul className="mt-2 divide-y divide-white/15">
                  {tracks.map((t) => (
                    <TrackRow
                      key={t.id}
                      track={t}
                      onToggleLike={() => toggleLike(t.id)}
                      onSelect={() => handleTrackSelect(t)}
                    />
                  ))}
                </ul>
              </div>
            </div>
          </section>
        </div>

        {/* Bottom playback pill */}
        <div className="absolute inset-x-0 bottom-1 z-30 flex justify-center animate-appear-d3">
          <div
            className={cn(
              "distort mx-6 flex w-full max-w-[720px] items-center gap-3 rounded-full border border-white/25 bg-white/20 px-4 py-2 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.25)]",
              "backdrop-boost",
            )}
          >
            <button
              onClick={() => setIsPlaying((p) => !p)}
              aria-label={isPlaying ? "Pause" : "Play"}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-gray-900 hover:bg-white"
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
            <div className="flex items-center gap-1 text-white/90">
              <SkipBack className="h-5 w-5" />
              <SkipForward className="h-5 w-5" />
            </div>
            <div className="mx-2 h-6 w-px bg-white/25" />
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/placeholder.svg?height=64&width=64" alt="Now playing cover" />
                <AvatarFallback>NP</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white/95">Meltdown Mendy</p>
                <p className="truncate text-xs text-white/70">Niall Horan</p>
              </div>
            </div>
            <div className="hidden items-center gap-2 text-white/90 sm:flex">
              <Shuffle className="h-5 w-5" />
              <Repeat className="h-5 w-5" />
              <Volume2 className="h-5 w-5" />
            </div>
          </div>
        </div>
      </main>

      {/* SVG filters (refraction via turbulence displacement) */}
      <svg width="0" height="0" aria-hidden="true" focusable="false" className="pointer-events-none">
        <defs>
          <filter
            id="turbulence-displacement"
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence type="turbulence" baseFrequency="0.015" numOctaves="2" seed="3" result="noise" />
            <feGaussianBlur in="noise" stdDeviation="4" result="softNoise" />
            <feDisplacementMap
              in="SourceGraphic"
              in2="softNoise"
              scale="12"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>
    </div>
  )
}

function IconBubble({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <button
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/20 text-white/90 backdrop-blur-xl hover:bg-white/30"
    >
      {children}
    </button>
  )
}

function TrackRow({ track, onToggleLike, onSelect }: { track: any; onToggleLike: () => void; onSelect: () => void }) {
  return (
    <li
      className="group grid cursor-pointer grid-cols-12 items-center gap-2 rounded-lg px-2 py-3 transition-colors hover:bg-white/5 sm:px-4"
      onClick={onSelect}
    >
      <div className="col-span-7 flex items-center gap-3 sm:col-span-6">
        <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-white/25 bg-white/10">
          <Image
            src={track.cover || "/placeholder.svg"}
            alt={"Album art for " + track.title}
            fill
            className="object-cover"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/20 to-black/10" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white/95">{track.title}</p>
          <p className="truncate text-xs text-white/70">{track.tag}</p>
        </div>
      </div>
      <div className="col-span-2 hidden items-center text-sm text-white/80 sm:flex">{track.listens}</div>
      <div className="col-span-2 hidden items-center text-sm text-white/80 sm:flex">{track.duration}</div>
      <div className="col-span-5 flex items-center justify-end gap-2 sm:col-span-2">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleLike()
          }}
          aria-label={track.liked ? "Unlike" : "Like"}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full border border-white/25 backdrop-blur-xl",
            track.liked ? "bg-white/80 text-gray-900 hover:bg-white" : "bg-white/20 text-white/90 hover:bg-white/30",
          )}
        >
          <Heart className={cn("h-4 w-4", track.liked && "fill-gray-900")} />
        </button>
        <button
          aria-label="More actions"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/20 text-white/90 backdrop-blur-xl hover:bg-white/30"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>
    </li>
  )
}
