"use client"

import type React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
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
  Loader2,
  Music,
  Image as ImageIcon,
  Video as VideoIcon,
  Eye,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import GlassSurface from "@/components/ui/glass-surface"

type Track = {
  id: number
  title: string
  tag: string
  listens: string
  duration: string
  cover: string
  liked?: boolean
  previewUrl?: string
  src?: string
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
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [query, setQuery] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)
  const [order, setOrder] = useState<'popular' | 'latest'>("popular")
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playingId, setPlayingId] = useState<number | null>(null)
  const [page, setPage] = useState<number>(1)
  const [totalPages, setTotalPages] = useState<number>(1)
  const pageSize = 8
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null)
  const [showDetail, setShowDetail] = useState<boolean>(false)
  const [nowPlaying, setNowPlaying] = useState<Track | null>(null)
  const [mediaType, setMediaType] = useState<'audio' | 'images' | 'videos'>("audio")

  // When music popup opens, hide AI Tools sidebar and any open media popup
  useEffect(() => {
    if (!isOpen) return

    // Add music popup active class to body for global CSS control
    document.body.classList.add('music-popup-active')

    const aiSidebar = document.querySelector('[data-ai-tools-sidebar]') as HTMLElement | null
    const mediaAside = document.querySelector('[aria-label="Media Library"]') as HTMLElement | null
    const topBar = document.querySelector('.editor-toolbar') as HTMLElement | null
    const bottomBar = document.querySelector('.editor-bottombar') as HTMLElement | null

    // Hide all media card containers with more comprehensive selectors
    const mediaCardContainers = document.querySelectorAll(
      '.workflow-media-cards, .media-gallery-grid, .content-gallery, .media-grid, [data-media-cards], .uploaded-files-grid, .grid, [class*="grid-cols"], .aspect-square, .glass-panel-opt, .group'
    ) as NodeListOf<HTMLElement>

    const prevTransform = aiSidebar?.style.transform || ''
    const prevDisplay = mediaAside?.style.display || ''
    const prevTopOpacity = topBar?.style.opacity || ''
    const prevBottomOpacity = bottomBar?.style.opacity || ''

    // Store original styles for media cards
    const prevMediaStyles: Array<{ element: HTMLElement, opacity: string, visibility: string, pointerEvents: string }> = []
    mediaCardContainers.forEach(element => {
      prevMediaStyles.push({
        element,
        opacity: element.style.opacity || '',
        visibility: element.style.visibility || '',
        pointerEvents: element.style.pointerEvents || ''
      })
    })

    // Apply hiding styles
    if (aiSidebar) aiSidebar.style.transform = 'translateX(-110%)'
    if (mediaAside) mediaAside.style.display = 'none'
    if (topBar) topBar.style.opacity = '0'
    if (bottomBar) bottomBar.style.opacity = '0'

    // Hide media cards immediately
    mediaCardContainers.forEach(element => {
      element.style.opacity = '0'
      element.style.visibility = 'hidden'
      element.style.pointerEvents = 'none'
    })

    return () => {
      // Remove global class
      document.body.classList.remove('music-popup-active')

      // Restore original styles
      if (aiSidebar) aiSidebar.style.transform = prevTransform
      if (mediaAside) mediaAside.style.display = prevDisplay
      if (topBar) topBar.style.opacity = prevTopOpacity
      if (bottomBar) bottomBar.style.opacity = prevBottomOpacity

      // Restore media card styles
      prevMediaStyles.forEach(({ element, opacity, visibility, pointerEvents }) => {
        element.style.opacity = opacity
        element.style.visibility = visibility
        element.style.pointerEvents = pointerEvents
      })
    }
  }, [isOpen])

  const toggleLike = (id: number) => {
    setTracks((prev) => prev.map((t) => (t.id === id ? { ...t, liked: !t.liked } : t)))
  }
  const handleTrackSelect = (track: Track) => {
    setSelectedTrack(track)
    setShowDetail(true)
  }

  // Map a Pixabay audio hit to our Track type
  const mapPixabayAudio = (hit: any): Track => {
    const preview =
      hit?.assets?.preview_mp3?.url ||
      hit?.assets?.preview?.url ||
      hit?.previewURL ||
      hit?.audio ||
      ""
    const title = hit?.tags || hit?.title || `Pixabay #${hit?.id}`
    const durationSec = hit?.duration || hit?.duration_seconds || 0
    const mm = Math.floor(durationSec / 60)
    const ss = String(Math.floor(durationSec % 60)).padStart(2, "0")
    return {
      id: Number(hit?.id ?? Math.random() * 1000000),
      title,
      tag: "#PixabayMusic",
      listens: `${hit?.likes ?? hit?.downloads ?? 0} Listened`,
      duration: `${mm}:${ss} sec`,
      cover: "/placeholder.svg?height=56&width=56",
      liked: false,
      previewUrl: preview,
      src: preview,
    }
  }

  // Map Pixabay image to Track shape for unified UI
  const mapPixabayImage = (hit: any): Track => {
    const title = hit?.tags || hit?.title || `Pixabay Image #${hit?.id}`
    const cover = hit?.previewURL || hit?.webformatURL || hit?.largeImageURL || "/placeholder.svg?height=56&width=56"
    return {
      id: Number(hit?.id ?? Math.random() * 1000000),
      title,
      tag: "#PixabayImage",
      listens: `${hit?.likes ?? hit?.downloads ?? 0} Views`,
      duration: "",
      cover,
      liked: false,
      previewUrl: hit?.largeImageURL || hit?.webformatURL || cover,
      src: hit?.largeImageURL || hit?.webformatURL || cover,
    }
  }

  // Map Pixabay video to Track shape for unified UI
  const mapPixabayVideo = (hit: any): Track => {
    const title = hit?.tags || hit?.title || `Pixabay Video #${hit?.id}`
    const pictureId = hit?.picture_id
    const thumb = pictureId ? `https://i.vimeocdn.com/video/${pictureId}_640x360.jpg` : "/placeholder.svg?height=56&width=56"
    const small = hit?.videos?.small?.url || hit?.videos?.tiny?.url || hit?.videos?.medium?.url
    return {
      id: Number(hit?.id ?? Math.random() * 1000000),
      title,
      tag: "#PixabayVideo",
      listens: `${hit?.likes ?? hit?.downloads ?? 0} Views`,
      duration: `${hit?.duration ?? 0}s`,
      cover: thumb,
      liked: false,
      previewUrl: small,
      src: small,
    }
  }

  // Client-side fallback to Pixabay (optional NEXT_PUBLIC_PIXABAY_KEY)
  const clientPixabayFallback = async (q: string, type: 'audio' | 'images' | 'videos', ord: 'popular' | 'latest', pageNum: number) => {
    try {
      const key = process.env.NEXT_PUBLIC_PIXABAY_KEY
      if (!key) return { hits: [], totalHits: 0 }
      const base = 'https://pixabay.com/api/'
      const common = `key=${key}&q=${encodeURIComponent(q)}&order=${ord}&page=${pageNum}&per_page=${pageSize}&safesearch=true&lang=en`
      let url = ''
      if (type === 'images') {
        url = `${base}?${common}`
      } else if (type === 'videos') {
        url = `${base}videos/?${common}`
      } else {
        url = `${base}audio/?${common}`
      }
      const res = await fetch(url)
      if (!res.ok) return { hits: [], totalHits: 0 }
      const data = await res.json()
      return { hits: Array.isArray(data?.hits) ? data.hits : [], totalHits: data?.totalHits ?? 0 }
    } catch (e) {
      return { hits: [], totalHits: 0 }
    }
  }

  // Fetch Pixabay media list based on current mediaType
  const runSearch = async (
    q: string,
    ord: 'popular' | 'latest',
    pageNum: number,
    typeOverride?: 'audio' | 'images' | 'videos'
  ) => {
    setLoading(true)
    try {
      const type = typeOverride || mediaType
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch(`/api/pixabay?q=${encodeURIComponent(q)}&type=${type}&perPage=${pageSize}&order=${ord}&page=${pageNum}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      })
      let data: any = null
      let hits: any[] = []
      let totalHits = 0
      if (res.ok) {
        data = await res.json()
        const section = type === 'audio' ? (data?.data?.audio || data?.audio || {})
          : type === 'images' ? (data?.data?.images || data?.images || {})
            : (data?.data?.videos || data?.videos || {})
        hits = section?.hits || []
        totalHits = section?.totalHits ?? (Array.isArray(hits) ? hits.length : 0)
      } else {
        // Fallback to client-side if server denies (e.g. unauthenticated)
        const fb = await clientPixabayFallback(q, type, ord, pageNum)
        hits = fb.hits
        totalHits = fb.totalHits
      }
      setTotalPages(Math.max(1, Math.ceil(totalHits / pageSize)))
      if (hits.length > 0) {
        const mapped = type === 'audio' ? hits.map(mapPixabayAudio)
          : type === 'images' ? hits.map(mapPixabayImage)
            : hits.map(mapPixabayVideo)
        setTracks(mapped)
      } else {
        setTracks([])
      }
    } catch (e) {
      // fall back to initial dummy if API fails
      console.error('Pixabay search failed', e)
    } finally {
      setLoading(false)
    }
  }

  // Auto load on open and when type changes
  useEffect(() => {
    if (isOpen) {
      setPage(1)
      setSelectedTrack(null)
      runSearch("", order, 1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mediaType])

  const goToPage = (nextPage: number) => {
    const clamped = Math.max(1, Math.min(totalPages, nextPage))
    setPage(clamped)
    runSearch(query, order, clamped)
  }

  const onPlayToggle = (id: number, url?: string) => {
    if (!audioRef.current) {
      audioRef.current = new Audio()
      audioRef.current.crossOrigin = 'anonymous'
    }
    const audio = audioRef.current
    if (playingId === id) {
      if (isPlaying) {
        audio.pause()
        setIsPlaying(false)
      } else {
        audio.play().catch(() => { })
        setIsPlaying(true)
      }
      return
    }
    // new track
    audio.pause()
    const nextSrc = url || nowPlaying?.previewUrl || nowPlaying?.src || selectedTrack?.previewUrl || selectedTrack?.src || ""
    if (!nextSrc) {
      console.warn('No audio source available for track', id)
      return
    }
    audio.src = nextSrc
    audio.currentTime = 0
    audio.play().catch(() => { })
    setPlayingId(id)
    setIsPlaying(true)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[200100]" data-music-overlay>
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
            "fixed right-6 top-3 z-40 flex h-9 w-9 items-center justify-center rounded-full",
            "border border-white/25 bg-white/20 text-white/90 backdrop-blur-xl hover:bg-white/30",
            "animate-appear",
          )}
        >
          <X className="h-4 w-4" />
        </button>

        {/* Search bar (glassmorphic like editor top group) */}
        <div className="absolute left-6 right-6 top-4 z-30 animate-appear">
          <GlassSurface width="auto" height="auto" borderRadius={36} backgroundOpacity={0.08} distortionScale={-55} redOffset={6} greenOffset={2} blueOffset={-4} displace={0.6} className="editor-toolbar" contentClassName="relative mx-auto flex w-full max-w-[880px] items-center gap-2.5 rounded-full px-3.5 py-1.5">
            <div className="pointer-events-none absolute -left-12 -top-10 h-36 w-36 rounded-full bg-white/35 blur-3xl" />
            <div className="pointer-events-none absolute -right-16 -bottom-12 h-40 w-40 rounded-full bg-emerald-300/30 blur-3xl" />
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Search className="h-4 w-4 text-white/80 pointer-events-none" />
              <input
                aria-label="Search music"
                placeholder={`Search Pixabay ${mediaType === 'audio' ? 'music' : mediaType === 'images' ? 'images' : 'videos'}...`}
                className="w-full bg-transparent text-white/90 placeholder-white/60 outline-none"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); runSearch(query, order, 1) }
                  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setQuery(''); runSearch('', order, 1) }
                }}
              />
            </div>
            <div className="mx-2 h-6 w-px bg-white/30" />
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); runSearch(query, order, 1) }}
              className="inline-flex items-center gap-2 rounded-full border border-white/45 bg-white/30 px-3 py-1.5 text-sm text-white hover:bg-white/40"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Music className="h-3.5 w-3.5" />} Search
            </button>
            {query && (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setQuery(''); runSearch('', order, 1) }}
                className="inline-flex items-center gap-2 rounded-full border border-white/45 bg-white/20 px-2 py-1 text-xs text-white hover:bg-white/30"
              >
                Clear
              </button>
            )}
          </GlassSurface>
        </div>

        {/* Left toolbar with navigation & media type */}
        <div className="absolute left-12 top-[40%] z-30 -translate-y-1/2 animate-appear-d1">
          <GlassSurface width="auto" height="auto" borderRadius={36} backgroundOpacity={0.08} distortionScale={-55} redOffset={6} greenOffset={2} blueOffset={-4} displace={0.6} className="rounded-full" contentClassName="flex flex-col items-center gap-3 p-2">
            <IconBubble label="Back" onClick={() => goToPage(page - 1)} disabled={page <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </IconBubble>
            <IconBubble label="Forward" onClick={() => goToPage(page + 1)} disabled={page >= totalPages}>
              <ChevronRight className="h-4 w-4" />
            </IconBubble>
            <IconBubble label="Images" onClick={() => { setMediaType('images'); setPage(1); runSearch(query, order, 1, 'images') }}>
              <ImageIcon className="h-4 w-4" />
            </IconBubble>
            <IconBubble label="Videos" onClick={() => { setMediaType('videos'); setPage(1); runSearch(query, order, 1, 'videos') }}>
              <VideoIcon className="h-4 w-4" />
            </IconBubble>
            <IconBubble label="Music" onClick={() => { setMediaType('audio'); setPage(1); runSearch(query, order, 1, 'audio') }}>
              <Music className="h-4 w-4" />
            </IconBubble>
          </GlassSurface>
        </div>

        {/* Centered content: list view or detail view */}
        <div className="relative z-20 flex h-full w-full items-center justify-center pt-80 pb-[232px]">
          <section className="relative mx-auto w/full max-w-[980px] px-6 sm:px-8 animate-appear-d2">
            <GlassSurface width="auto" height="auto" borderRadius={36} backgroundOpacity={0.08} distortionScale={-55} redOffset={6} greenOffset={2} blueOffset={-4} displace={0.6} className="editor-toolbar" contentClassName="relative">
              {/* blobs */}
              <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-white/40 blur-3xl" />
              <div className="pointer-events-none absolute left-1/3 -top-20 h-52 w-52 rounded-full bg-emerald-300/40 blur-3xl" />
              <div className="pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full bg-amber-300/30 blur-3xl" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 via-white/5 to-black/20" />

              {/* Detail view */}
              {showDetail && selectedTrack && (
                <div className="relative grid grid-cols-1 gap-6 p-6 sm:grid-cols-12 sm:p-8">
                  <div className="sm:col-span-7">
                    <button
                      onClick={() => { setShowDetail(false); setSelectedTrack(null) }}
                      className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/20 px-3 py-1.5 text-sm text-white hover:bg-white/30"
                    >
                      <ChevronLeft className="h-4 w-4" /> Back to results
                    </button>
                    <div className="mb-3 flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-white/70" />
                      <span className="h-3 w-3 rounded-full bg-white/40" />
                      <span className="h-3 w-3 rounded-full bg-white/30" />
                    </div>
                    <div className="text-sm text-white/80">{mediaType === 'audio' ? 'Now playing' : mediaType === 'images' ? 'Selected image' : 'Selected video'}</div>
                    <h1 className="mt-1 text-4xl font-semibold tracking-tight text-white sm:text-5xl">{selectedTrack.title}</h1>
                    <div className="mt-2 text-sm text-white/80">{selectedTrack.tag} · {selectedTrack.listens} · {selectedTrack.duration}</div>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      {mediaType === 'audio' && (
                        <Button
                          variant="secondary"
                          className="rounded-full border border-white/30 bg-white/20 text-white hover:bg-white/30"
                          onClick={() => { setNowPlaying(selectedTrack); onPlayToggle(selectedTrack.id, selectedTrack.previewUrl) }}
                        >
                          {isPlaying && playingId === selectedTrack.id ? 'Pause' : 'Play'}
                        </Button>
                      )}
                      {onAudioSelect && (
                        <Button className="rounded-full bg-white/80 text-gray-900 hover:bg-white" variant="default" onClick={() => onAudioSelect(selectedTrack)}>
                          Use this media
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Artwork */}
                  <div className="relative sm:col-span-5">
                    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-white/25 bg-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.25)]">
                      <Image
                        src={(selectedTrack.cover as string) || "/placeholder.svg?height=480&width=640"}
                        alt={"Artwork for " + selectedTrack.title}
                        fill
                        className="object-cover"
                      />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-black/20" />
                    </div>
                  </div>
                </div>
              )}

              {/* List view: only when no selection */}
              {!selectedTrack && (
                <>
                  <div className="relative mx-6 mb-2 mt-2 h-px bg-white/20 sm:mx-8" />
                  <div className="relative p-4 sm:p-6">
                    <div className="flex items-center justify-between px-2 sm:px-4">
                      <h2 className="text-lg font-medium text-white/95">{mediaType === 'audio' ? 'Pixabay Music' : mediaType === 'images' ? 'Pixabay Images' : 'Pixabay Videos'}</h2>
                      <span className="text-xs text-white/80">Page {page} / {totalPages}</span>
                    </div>
                    <ul className="mt-2 divide-y divide-white/15" data-music-results>
                      {tracks.map((t) => (
                        <TrackRow
                          key={t.id}
                          track={t}
                          onToggleLike={() => toggleLike(t.id)}
                          onSelect={() => handleTrackSelect(t)}
                          onPreview={() => { if (mediaType === 'audio') { setNowPlaying(t); onPlayToggle(t.id, t.previewUrl) } }}
                        />
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </GlassSurface>
          </section>
        </div>

        {/* Bottom playback pill */}
        <div className="absolute inset-x-0 bottom-1 z-30 flex justify-center animate-appear-d3">
          <GlassSurface width="auto" height="auto" borderRadius={36} backgroundOpacity={0.08} distortionScale={-55} redOffset={6} greenOffset={2} blueOffset={-4} displace={0.6} className="editor-toolbar mx-6" contentClassName="flex w/full max-w-[720px] items-center gap-3 rounded-full px-4 py-2">
            <button
              onClick={() => {
                if (!nowPlaying && selectedTrack && mediaType === 'audio') {
                  setNowPlaying(selectedTrack)
                  onPlayToggle(selectedTrack.id, selectedTrack.previewUrl)
                } else if (playingId && isPlaying) {
                  onPlayToggle(playingId)
                } else if (playingId && !isPlaying) {
                  onPlayToggle(playingId)
                }
              }}
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
                <AvatarImage src={(selectedTrack?.cover as string) || "/placeholder.svg?height=64&width=64"} alt="Now playing cover" />
                <AvatarFallback>NP</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white/95">{selectedTrack?.title || 'No track selected'}</p>
                <p className="truncate text-xs text-white/70">{selectedTrack?.tag || ''}</p>
              </div>
            </div>
            <div className="hidden items-center gap-2 text-white/90 sm:flex">
              <Shuffle className="h-5 w-5" />
              <Repeat className="h-5 w-5" />
              <Volume2 className="h-5 w-5" />
            </div>
          </GlassSurface>
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

function IconBubble({ children, label, onClick, disabled }: { children: React.ReactNode; label: string; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/20 text-white/90 backdrop-blur-xl",
        disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-white/30"
      )}
    >
      {children}
    </button>
  )
}

function TrackRow({ track, onToggleLike, onSelect, onPreview }: { track: any; onToggleLike: () => void; onSelect: () => void; onPreview: () => void }) {
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
            onPreview()
          }}
          aria-label="Preview"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/20 text-white/90 backdrop-blur-xl hover:bg-white/30"
        >
          <Play className="h-4 w-4" />
        </button>
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
