import { useState, useRef, useCallback, useEffect, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { MOCK_MEDIA } from "@/lib/glassmorphic-mock-media"
import { useProfessionalAudioProcessor } from "@/hooks/useProfessionalAudioProcessor"
import { useSubtitleGenerator } from "@/hooks/useSubtitleGenerator"
import { useSubtitleSettings } from "@/hooks/useSubtitleSettings"
import { WorkflowStateMachine, classifyAsset } from "@/lib/workflow-state"
import { findBestEmoji } from "@/lib/emoji"
import type { TranscriptSegmentUI, TextOverlay, VisualOverlay, Segment } from "../types"

export function useVideoEditor() {
  // Router and initial params
  const searchParams = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search)
  const initialMediaId = searchParams?.get('mediaId') || null
  const [currentUploadId, setCurrentUploadId] = useState<string | null>(initialMediaId)

  // Subtitle settings and generation
  const [subtitleSettings, subtitleActions] = useSubtitleSettings()
  const { 
    textOverlays, 
    detectedPauses: subtitleDetectedPauses, 
    generateSubtitles, 
    createTestSubtitles, 
    clearSubtitles,
    setTextOverlays
  } = useSubtitleGenerator()

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
    }
  ])

  // Transcript segments state
  const [transcriptSegments, setTranscriptSegments] = useState<TranscriptSegmentUI[]>([])
  const [showChatPopup, setShowChatPopup] = useState<boolean>(false)
  const [showTextElements, setShowTextElements] = useState<boolean>(true)
  const [showVideoClips, setShowVideoClips] = useState<boolean>(true)
  const [showAudioElements, setShowAudioElements] = useState<boolean>(true)
  const [showTranscriptView, setShowTranscriptView] = useState<boolean>(true)
  const [showProjectVideoPanel, setShowProjectVideoPanel] = useState<boolean>(false)
  const [isProcessingSubtitles, setIsProcessingSubtitles] = useState<boolean>(false)

  // Auto zoom plan for live preview
  const [autoZoomPlan, setAutoZoomPlan] = useState<null | { zoom_events?: Array<{ start_ms: number; end_ms: number; scale?: number; direction?: 'left' | 'right' | 'up' | 'down' | 'center'; pan?: number; rotate?: number }>; transition_events?: any[]; highlights?: any[] }>(null)

  const [currentTime, setCurrentTime] = useState<number>(0)
  const [zoom, setZoom] = useState(1)

  // Interactive demo video clips for the middle track
  const [demoClips, setDemoClips] = useState<Array<{ id: string; src: string; start: number; duration: number }>>([
    { id: 'c1', src: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4', start: 2, duration: 3.5 },
    { id: 'c2', src: 'https://www.w3schools.com/html/mov_bbb.mp4', start: 8, duration: 3.5 },
    { id: 'c3', src: 'https://media.w3.org/2010/05/sintel/trailer.mp4', start: 14, duration: 3.5 },
  ])

  // Use subtitle generator's detected pauses and merge with existing state
  const [localDetectedPauses, setLocalDetectedPauses] = useState<Array<{ start: number; end: number; duration: number; segmentId?: string; beforeWordIndex?: number; type: 'initial' | 'interWord' | 'interSegment' }>>([])

  // Visual icon/vector overlays synced to word times
  const [visualOverlays, setVisualOverlays] = useState<VisualOverlay[]>([])
  const [autoIconsGenerated, setAutoIconsGenerated] = useState<boolean>(false)

  // Audio lane segments (synced to current media duration)
  const [audioSegments, setAudioSegments] = useState<Array<{ start: number; duration: number; label: string }>>([])

  const [playbackWindows, setPlaybackWindows] = useState<Array<{ start: number; end: number }>>([])

  // Unified pauses for editor: prefer server VAD if available
  // NOTE: Types expect { start, end, duration, type: 'initial'|'interWord'|'interSegment' }
  // Map server VAD generic pauses to 'interSegment' blocks for display.
  const [pausesForEditor, setPausesForEditor] = useState<Array<{ start: number; end: number; duration: number; segmentId?: string; beforeWordIndex?: number; type: 'initial' | 'interWord' | 'interSegment' }>>([])

  // Keep transcript editor pauses populated even before server VAD is ready
  // (moved below precomputedVad declaration)

  // Left Project panel positioning
  const [projectTop, setProjectTop] = useState<number>(64) // Header height
  const [projectBottom, setProjectBottom] = useState<number>(280) // Reduced timeline space to align with timeline editor
  const [projectWidth, setProjectWidth] = useState<number>(380) // Smaller transcript panel width
  const [projectHeight, setProjectHeight] = useState<number>(400) // Fixed height for transcript editor
  const [previewTop, setPreviewTop] = useState<number>(64) // Header height

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
  const skipGuardRef = useRef<boolean>(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [scriptText, setScriptText] = useState<string>('')
  const [showScriptPopup, setShowScriptPopup] = useState<boolean>(false)
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [processingProgress_old, setProcessingProgress_old] = useState<number>(0)
  const [processingStep_old, setProcessingStep_old] = useState<string>('')
  const workflowRef = useRef<WorkflowStateMachine | null>(null)
  if (!workflowRef.current) workflowRef.current = new WorkflowStateMachine()
  const [videoDuration, setVideoDuration] = useState<number>(0)

  // Precomputed analysis (bad takes + pauses) kept for instant apply on "Cut"
  const [analysisReady, setAnalysisReady] = useState<boolean>(false)
  const [precomputedDecision, setPrecomputedDecision] = useState<any | null>(null)
  const [precomputedVad, setPrecomputedVad] = useState<any | null>(null)

  // Professional audio processing integration
  const {
    isProcessing: isProfessionalProcessing,
    isAnalyzing,
    processingProgress,
    processingStep,
    lastResult: professionalResult,
    badTakeAnalysis,
    analyzeBadTakes,
    processMedia: processProfessionalMedia,
    quickPauseRemoval,
    removeBadTakesOnly,
    professionalEdit,
    canProcess: canProfessionalProcess,
    hasAnalysis,
    hasResult: hasProfessionalResult
  } = useProfessionalAudioProcessor()
  // Combine detected pauses from subtitle generator and local pauses
  const detectedPauses = useMemo(() => {
    return [...subtitleDetectedPauses, ...localDetectedPauses]
  }, [subtitleDetectedPauses, localDetectedPauses])

  // Auto-generate subtitles when transcript segments change
  useEffect(() => {
    if (transcriptSegments.length > 0) {
      console.log('🎬 Auto-generating subtitles from transcript segments:', transcriptSegments.length)
      generateSubtitles({
        transcriptSegments,
        subtitleSettings,
        currentTime: currentTime,
        duration: previewDuration || videoDuration || 30
      })
    }
  }, [transcriptSegments.length, subtitleSettings.wordsPerCard, subtitleSettings.gapThreshold, subtitleSettings.cardLinger, subtitleSettings.wordLead, subtitleSettings.wordTrail, generateSubtitles, previewDuration, videoDuration])

  // Keep transcript editor pauses populated even before server VAD is ready
  useEffect(() => {
    try {
      if (!precomputedVad) {
        const mappedLocal = (detectedPauses || []).map((p: any) => ({ start: p.start, end: p.end, duration: p.duration, segmentId: p.segmentId, beforeWordIndex: p.beforeWordIndex, type: p.type }))
        setPausesForEditor(mappedLocal)
      }
    } catch {}
  }, [detectedPauses, precomputedVad])

  // Right-side mode group state & highlight logic
  const modes = ['video', 'animation', 'media'] as const
  const [activeMode, setActiveMode] = useState<typeof modes[number]>('video')
  const modeContainerRef = useRef<HTMLDivElement | null>(null)
  const modeButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [highlightBox, setHighlightBox] = useState<{ left: number; width: number }>({ left: 0, width: 0 })
  const [modeContainerWidth, setModeContainerWidth] = useState<number>(320)
  const mediaBgRef = useRef<HTMLDivElement | null>(null)
  const headerBarRef = useRef<HTMLDivElement | null>(null)
  const projectAsideRef = useRef<HTMLDivElement | null>(null)
  const [chatTop, setChatTop] = useState<number | undefined>(undefined)
  const modeGapRef = useRef<HTMLDivElement | null>(null)
  const [standardGap, setStandardGap] = useState<number>(8)
  const [musicVolume, setMusicVolume] = useState<number>(0.75)
  const volumeTrackRef = useRef<HTMLDivElement | null>(null)
  const [showMusicPopup, setShowMusicPopup] = useState<boolean>(false)
  const [showSubtitlesPanel, setShowSubtitlesPanel] = useState<boolean>(false)
  
  // Whether a CapCut-style resegmentation is currently running
  const [isCapCutResegmenting, setIsCapCutResegmenting] = useState<boolean>(false)

  // Layout calculation effect
  useEffect(() => {
    const updateLayout = () => {
      // Calculate header height
      const headerHeight = headerBarRef.current?.offsetHeight || 64
      
      // Timeline takes approximately 120px height + 60px for time display above + buffer to align with timeline editor
      const timelineHeight = 280
      
      // Update layout values
      setProjectTop(headerHeight)
      setPreviewTop(headerHeight)
      setProjectBottom(timelineHeight)
      
      // Project dimensions from transcript panel
      setProjectWidth(380)
      setProjectHeight(400)
    }

    // Initial calculation
    updateLayout()

    // Recalculate on resize
    window.addEventListener('resize', updateLayout)
    return () => window.removeEventListener('resize', updateLayout)
  }, [])

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

  const totalDuration = useMemo(
    () => segments.reduce((acc, s) => Math.max(acc, s.startTime + s.duration), 0),
    [segments]
  )

  // Helper: build naive word timing if ASR lacks word-level timestamps
  const buildWordTiming = useCallback((text: string, start: number, end: number) => {
    const tokens = text.split(/\s+/).filter(Boolean)
    if (tokens.length === 0) return [] as Array<{ word: string; start: number; end: number }>
    const total = Math.max(0.001, end - start)
    return tokens.map((w, i) => {
      const ws = start + (i / tokens.length) * total
      const we = start + ((i + 1) / tokens.length) * total
      return { word: w, start: ws, end: we }
    })
  }, [])

  // --- Video element wiring: keep editor state in sync with actual playback ---
  useEffect(() => {
    const v = previewVideoRef.current
    if (!v) return

    const onLoaded = () => {
      try {
        const dur = v.duration || 0
        setPreviewDuration(dur)
        // Seed timeline clips and audio lane if empty
        setInitialClips((prev) => prev.length ? prev : (loadedMediaUrl ? [{ id: 'clip-1', src: loadedMediaUrl, start: 0, duration: Math.max(0.1, dur) }] : prev))
        setAudioSegments([{ start: 0, duration: Math.max(0.1, dur), label: 'Audio' }])
      } catch {}
    }
    const onTime = () => {
      const t = v.currentTime || 0
      // Enforce playback windows by skipping removed ranges
      try {
        if (!skipGuardRef.current && playbackWindows && playbackWindows.length > 0) {
          const EPS = 0.005
          const inWindow = playbackWindows.find(w => t >= (w.start - EPS) && t <= (w.end - EPS))
          if (!inWindow) {
            const ahead = [...playbackWindows].filter(w => w.start > t).sort((a, b) => a.start - b.start)[0]
            if (ahead) {
              skipGuardRef.current = true
              v.currentTime = Math.max(0, ahead.start)
              // do not update state here; next timeupdate will do
              return
            } else {
              // Past the last window → pause at end
              v.pause()
              setIsPreviewPlaying(false)
            }
          }
        }
      } finally {
        // Clear guard after one cycle
        if (skipGuardRef.current) {
          skipGuardRef.current = false
        }
      }
      setPreviewCurrent(v.currentTime || 0)
      setCurrentTime(v.currentTime || 0)
    }
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
  }, [previewVideoRef.current, loadedMediaUrl])

  // --- Hydration from existing media record (DB) ---
  const hydrateFromUpload = useCallback(async (uploadId: string) => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      const headers: Record<string,string> = token ? { Authorization: `Bearer ${token}` } : {}
      const res = await fetch(`/api/media-files?id=${encodeURIComponent(uploadId)}`, { headers })
      const json = await res.json().catch(() => null)
      const rec = json?.data?.id ? json.data : (Array.isArray(json?.data) ? json.data.find((x: any) => x.id === uploadId) : null)
      if (!rec) return

      if (rec.storage_url) setLoadedMediaUrl((prev) => prev || rec.storage_url)

      // Seed timeline clips from keepSegments if available
      const keepSegments: Array<{ start_ms: number; end_ms: number }> | undefined = rec?.metadata?.editingDecision?.keepSegments
      if (Array.isArray(keepSegments) && keepSegments.length && rec.storage_url) {
        const clips = keepSegments.map((seg: any, idx: number) => ({
          id: `k${idx + 1}`,
          src: rec.storage_url,
          start: (seg.start_ms || 0) / 1000,
          duration: Math.max(0.12, ((seg.end_ms || 0) - (seg.start_ms || 0)) / 1000)
        }))
        setInitialClips(clips)
      }

      // Prefer AI subtitle cards → enhanced ASR → raw ASR
      const aiCards = Array.isArray(rec?.metadata?.ai_subtitles?.cards) ? rec.metadata.ai_subtitles.cards : []
      const enhanced = Array.isArray(rec?.metadata?.asr?.enhanced_segments) ? rec.metadata.asr.enhanced_segments : []
      const basic = Array.isArray(rec?.metadata?.asr?.segments) ? rec.metadata.asr.segments : []
      const wordsAll = Array.isArray(rec?.metadata?.asr?.words) ? rec.metadata.asr.words : []

      if (aiCards.length) {
        const tSegs = aiCards.map((c: any, idx: number) => ({
          id: `ts-${idx + 1}`,
          text: String(c.text || ''),
          startTime: Number(c.start || c.renderStart || 0),
          endTime: Number(c.end || c.renderEnd || 0),
          speaker: 'Speaker 1',
          confidence: typeof c.confidence === 'number' ? c.confidence : 0.95,
          words: Array.isArray(c.words) ? c.words.map((w: any) => ({ word: String(w.word || w.text_for_display || ''), start: Number(w.start || 0), end: Number(w.end || 0), confidence: typeof w.confidence === 'number' ? w.confidence : 0.9 })) : [],
          isAiCard: true,
          lineBreakIndex: (typeof c.lineBreakIndex === 'number' ? c.lineBreakIndex : null)
        }))
        setTranscriptSegments(tSegs as any)
        setShowTranscriptView(true)
        
        // Auto-generate subtitles from AI cards
        try {
          generateSubtitles({
            transcriptSegments: tSegs as any,
            subtitleSettings,
            currentTime: 0,
            duration: previewDuration || videoDuration || 30
          })
          console.log('✅ Subtitles generated from AI cards')
        } catch (error) {
          console.warn('⚠️ Failed to generate subtitles from AI cards:', error)
        }
        return
      }

      const source = enhanced.length ? enhanced : basic
      if (source.length) {
        const merged = source
          .map((s: any) => ({ start: Math.max(0, Number(s.start || 0)), end: Math.max(0, Number(s.end || 0)), text: String(s.text || ''), words: Array.isArray(s.words) ? s.words : [] }))
          .filter((s: any) => s.end > s.start && s.text.trim().length > 0)
          .sort((a: any, b: any) => a.start - b.start)
        const tSegs = merged.map((s: any, idx: number) => ({
          id: `ts-${idx + 1}`,
          text: s.text,
          startTime: s.start,
          endTime: s.end,
          speaker: 'Speaker 1',
          confidence: 0.95,
          words: s.words.length ? s.words.map((w: any) => ({ word: String(w.word || ''), start: Number(w.start || 0), end: Number(w.end || 0), confidence: typeof w.confidence === 'number' ? w.confidence : 0.9 })) : buildWordTiming(s.text, s.start, s.end)
        }))
        setTranscriptSegments(tSegs as any)
        setShowTranscriptView(true)
        
        // Auto-generate subtitles from enhanced/basic ASR
        try {
          generateSubtitles({
            transcriptSegments: tSegs as any,
            subtitleSettings,
            currentTime: 0,
            duration: previewDuration || videoDuration || 30
          })
          console.log('✅ Subtitles generated from ASR segments')
        } catch (error) {
          console.warn('⚠️ Failed to generate subtitles from ASR:', error)
        }
      }
    } catch (e) {
      console.warn('hydrateFromUpload failed', e)
    }
  }, [buildWordTiming, generateSubtitles, subtitleSettings, previewDuration, videoDuration])

  // Auto-hydrate latest media on first load or when an upload id is present
  useEffect(() => {
    (async () => {
      try {
        if (transcriptSegments.length > 0) return
        if (currentUploadId) {
          await hydrateFromUpload(currentUploadId)
          return
        }
        // Fallback: load latest user video
        const token = (await supabase.auth.getSession()).data.session?.access_token
        const headers: Record<string,string> = token ? { Authorization: `Bearer ${token}` } : {}
        const res = await fetch('/api/media-files?file_type=video&limit=1', { headers })
        const json = await res.json().catch(() => null)
        const rec = json?.data?.[0]
        if (rec?.id) {
          setCurrentUploadId(rec.id)
          if (rec.storage_url) setLoadedMediaUrl(rec.storage_url)
          await hydrateFromUpload(rec.id)
        }
      } catch {}
    })()
  }, [currentUploadId, transcriptSegments.length, hydrateFromUpload])

  const formatClock = useCallback((sec: number) => {
    const s = Math.max(0, Math.floor(sec))
    const mm = Math.floor(s / 60).toString().padStart(2, '0')
    const ss = Math.floor(s % 60).toString().padStart(2, '0')
    return `${mm}:${ss}`
  }, [])

  // Manual CapCut/SubMagic-style resegmentation (user-triggered)
  const resegmentCapCutStyle = useCallback(async () => {
    try {
      if (!transcriptSegments.length || isCapCutResegmenting) return
      setIsCapCutResegmenting(true)
      setIsProcessingSubtitles(true)
      setProcessingStep_old('Resegmenting captions (CapCut style)...')
      setProcessingProgress_old(60)

      // Collect word timings from current transcript
      const words: Array<{ word: string; start: number; end: number; confidence?: number }> = []
      for (const seg of transcriptSegments) {
        const segWords = (seg.words && seg.words.length)
          ? seg.words
          : buildWordTiming(seg.text, seg.startTime, seg.endTime)
        for (const w of (segWords as any)) {
          words.push({ word: String(w.word || ''), start: Number(w.start || 0), end: Number(w.end || 0), confidence: typeof w.confidence === 'number' ? w.confidence : 0.9 })
        }
      }
      if (!words.length) return

      // Prefer AI segmentation API
      let nextSegments: any[] | null = null
      try {
        const controller = new AbortController()
        const to = setTimeout(() => controller.abort(), 15000)
        const res = await fetch('/api/ai-caption-segmentation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            words,
            audioUrl: loadedMediaUrl || undefined,
            settings: {
              minWordsPerCard: 2,
              maxWordsPerCard: 4,
              targetCpsRange: [14, 18],
              globalMinPause: 0.18,
              lingerSec: 0.5
            }
          }),
          signal: controller.signal
        })
        clearTimeout(to)
        if (res.ok) {
          const j = await res.json().catch(() => null)
          const cards = j?.data?.cards || j?.cards
          if (Array.isArray(cards) && cards.length) {
            nextSegments = cards.map((c: any, idx: number) => ({
              id: `ts-${idx + 1}`,
              text: String(c.text || ''),
              startTime: Number(c.start || c.renderStart || 0),
              endTime: Number(c.end || c.renderEnd || 0),
              speaker: 'Speaker 1',
              confidence: typeof c.confidence === 'number' ? c.confidence : 0.95,
              words: Array.isArray(c.words) ? c.words.map((w: any) => ({ word: String(w.word || w.text_for_display || ''), start: Number(w.start || 0), end: Number(w.end || 0), confidence: typeof w.confidence === 'number' ? w.confidence : 0.9 })) : [],
              isAiCard: true,
              lineBreakIndex: (typeof c.lineBreakIndex === 'number' ? c.lineBreakIndex : null)
            }))
          }
        }
      } catch {}

      // Fallback to simple word grouping
      if (!nextSegments) {
        const chunks: any[] = []
        let currentChunk: any = null
        const targetWordsPerCard = 3
        const maxDuration = 2.6
        
        for (const word of words) {
          if (!currentChunk) {
            currentChunk = {
              start: word.start,
              end: word.end,
              text: word.word,
              words: [word],
              confidence: word.confidence || 0.9
            }
          } else {
            const duration = word.end - currentChunk.start
            const wordCount = currentChunk.words.length
            
            if (wordCount >= targetWordsPerCard || duration >= maxDuration) {
              chunks.push(currentChunk)
              currentChunk = {
                start: word.start,
                end: word.end,
                text: word.word,
                words: [word],
                confidence: word.confidence || 0.9
              }
            } else {
              currentChunk.end = word.end
              currentChunk.text += ' ' + word.word
              currentChunk.words.push(word)
            }
          }
        }
        
        if (currentChunk) {
          chunks.push(currentChunk)
        }
        
        nextSegments = chunks.map((c: any, i: number) => ({
          id: `ts-${i + 1}`,
          text: (c.text || '').replace(/\n/g, ' ').trim(),
          startTime: c.start,
          endTime: c.end,
          speaker: c.speaker || 'Speaker 1',
          confidence: c.confidence ?? 0.9,
          words: (c.words || []).map((w: any) => ({ word: w.word, start: w.start, end: w.end, kept: true })),
          isAiCard: true
        }))
      }

      setTranscriptSegments(nextSegments as any)
      setShowTranscriptView(true)
      setProcessingStep_old('Resegmenting complete')
      setProcessingProgress_old(100)
    } finally {
      setTimeout(() => {
        setIsCapCutResegmenting(false)
        setIsProcessingSubtitles(false)
        setProcessingProgress_old(0)
        setProcessingStep_old('')
      }, 300)
    }
  }, [transcriptSegments, buildWordTiming, loadedMediaUrl, isCapCutResegmenting])

  // Generate a professional auto-zoom plan from transcript segments
  const generateAutoZoomPlan = useCallback(() => {
    if (!transcriptSegments.length || !previewDuration) return
    const events: Array<{ start_ms: number; end_ms: number; scale: number; direction?: 'left'|'right'|'up'|'down'|'center'; pan?: number; rotate?: number }> = []
    const timelineMs = Math.round(previewDuration * 1000)
    let lastEnd = 0
    const seed = (s: string) => Math.abs(Array.from(s).reduce((a, c) => a + c.charCodeAt(0), 0))
    const pick = <T,>(n: number, arr: ReadonlyArray<T>): T => arr[n % arr.length]
    for (const seg of transcriptSegments) {
      const start = Math.max(0, Math.round(seg.startTime * 1000))
      const end = Math.max(start + 400, Math.round(seg.endTime * 1000))
      const dur = Math.min(3800, end - start)
      const s = seed(seg.text || seg.id)
      const styles = ['punch_in','punch_out','swoosh_left','swoosh_right','tilt_in','tilt_out'] as const
      const style = pick(s, styles)
      if (style === 'punch_in') {
        events.push({ start_ms: start, end_ms: start + dur, scale: 1.14, direction: 'center', pan: 12 })
      } else if (style === 'punch_out') {
        events.push({ start_ms: start, end_ms: start + dur, scale: 0.90, direction: 'center', pan: 10 })
      } else if (style === 'swoosh_left') {
        events.push({ start_ms: start, end_ms: start + dur, scale: 1.10, direction: 'left', pan: 28 })
      } else if (style === 'swoosh_right') {
        events.push({ start_ms: start, end_ms: start + dur, scale: 1.10, direction: 'right', pan: 28 })
      } else if (style === 'tilt_in') {
        events.push({ start_ms: start, end_ms: start + dur, scale: 1.12, direction: 'up', pan: 16, rotate: 0.6 })
      } else {
        events.push({ start_ms: start, end_ms: start + dur, scale: 0.92, direction: 'down', pan: 16, rotate: -0.6 })
      }
      lastEnd = start + dur
      if (lastEnd > timelineMs) break
    }
    setAutoZoomPlan({ zoom_events: events })
  }, [transcriptSegments, previewDuration])

  useEffect(() => {
    generateAutoZoomPlan()
  }, [generateAutoZoomPlan])

  // Expose a safe bridge for page UI to apply transcript updates (used by advanced clean)
  useEffect(() => {
    ;(window as any).__applyTranscript = (arr: any[]) => {
      try {
        setTranscriptSegments(arr as any)
      } catch {}
    }
    return () => { try { delete (window as any).__applyTranscript } catch {} }
  }, [])

  // Disable legacy auto-refinement that merged too much (users disliked)
  const enableAutoRefine = false
  useEffect(() => {
    if (!enableAutoRefine) return
    const hasAny = transcriptSegments.length > 0
    const allAi = transcriptSegments.length > 0 && transcriptSegments.every(s => (s as any).isAiCard)
    if (hasAny && !allAi) {
      const id = setTimeout(() => {
        try {
          // Keep codepath available but disabled by default
          // refineSubtitlesLocally()
        } catch {}
      }, 0)
      return () => clearTimeout(id)
    }
  }, [enableAutoRefine, transcriptSegments])

  // Actions
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
      setPreviewCurrent(next)
      setCurrentTime(next)
    } catch { }
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

  const handleTranscriptWordClick = useCallback((args: { segmentId: string; wordIndex: number; start: number; end: number }) => {
    let { start, end } = args
    const EPS = 0.004
    if (end - start < 0.010) end = start + 0.010
    start = Math.max(0, start + EPS)
    end = Math.max(end - EPS, start + 0.008)
    setCurrentTime(start)
    setPreviewCurrent(start)
    if (previewVideoRef.current) {
      const v = previewVideoRef.current
      v.currentTime = start
      v.play().catch(() => {})
    }
  }, [])

  const handleTranscriptWordToggle = useCallback((args: { segmentId: string; wordIndex: number }) => {
    const { segmentId, wordIndex } = args
    setTranscriptSegments(prev => prev.map(seg => {
      if (seg.id !== segmentId) return seg
      const words = seg.words ? [...seg.words] : undefined
      if (!words || !words[wordIndex]) return seg
      const w = words[wordIndex]
      words[wordIndex] = { ...w, kept: w.kept === false ? true : false }
      const newText = words.map(x => x.word).join(' ')
      return { ...seg, words, text: newText }
    }))
  }, [])

  const handleTranscriptWordAction = useCallback((args: { segmentId: string; wordIndex: number; action: 'add' | 'remove' | 'restore' | 'keepOnly' }) => {
    const { segmentId, wordIndex, action } = args
    
    setTranscriptSegments(prev => prev.map(seg => {
      if (seg.id !== segmentId) return seg
      const words = seg.words ? [...seg.words] : undefined
      if (!words || !words[wordIndex]) return seg
      
      if (action === 'add' || action === 'restore') {
        const w = words[wordIndex]
        words[wordIndex] = { ...w, kept: true, isRemoved: false, removalReason: undefined }
      } else if (action === 'remove') {
        const w = words[wordIndex]
        words[wordIndex] = { ...w, kept: false, isRemoved: true, removalReason: 'manual' }
      } else if (action === 'keepOnly') {
        words.forEach((w, i) => {
          if (i === wordIndex) {
            words[i] = { ...w, kept: true, isRemoved: false, removalReason: undefined }
          } else {
            words[i] = { ...w, kept: false, isRemoved: true, removalReason: 'manual' }
          }
        })
      }
      
      const newText = words.filter(w => w.kept !== false).map(w => w.word).join(' ')
      return { ...seg, words, text: newText }
    }))
  }, [])

  const handleExport = useCallback(async () => {
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
  }, [segments])

  const onTextChange = useCallback((id: string, updates: Partial<{ start: number; duration: number }>) => {
    setTextOverlays(prev => prev.map(t => t.id === id ? { ...t, ...updates } as TextOverlay : t))
  }, [setTextOverlays])

  // Create a ref to store the file for processing
  const pendingFileRef = useRef<File | null>(null)

  const handleFileUpload = useCallback((file: File) => {
    if (file.type.startsWith('video/')) {
      workflowRef.current?.reset()
      workflowRef.current?.addAsset({ name: file.name, mimeType: file.type })
      setTranscriptSegments([])
      clearSubtitles() // Use subtitle generator's clear method
      setVisualOverlays([])
      setAutoIconsGenerated(false)
      setInitialClips([])
      setPlaybackWindows([])
      setLoadedMediaUrl(null)
      setShowTranscriptView(false)
      setUploadedFile(file)
      
      // Store the file for later processing
      pendingFileRef.current = file
    } else {
      const t = classifyAsset({ name: file.name, mimeType: file.type })
      console.log('media_added', { type: t })
      alert('Please upload a video file (MP4, MOV, AVI) for processing.')
    }
  }, [clearSubtitles])

  // Run pause + bad-take analysis ahead of time so Cut can be instant
  const precomputeAnalysis = useCallback(async () => {
    try {
      if (!transcriptSegments.length) return
      setIsProcessing(true)
      setProcessingStep_old('Analyzing pauses and bad takes...')
      setProcessingProgress_old(65)

      // Build transcript payload similar to Advanced Clean
      const transcript = {
        text: transcriptSegments.map(s => s.text).join(' '),
        duration: previewDuration || 0,
        segments: transcriptSegments.map(s => ({
          start: s.startTime,
          end: s.endTime,
          text: s.text,
          confidence: (s as any).confidence || 0.8,
          words: (s.words || []).map(w => ({ word: w.word, start: w.start, end: w.end }))
        })),
        script: scriptText || undefined
      }

      const cleanReq = fetch('/api/jobs/clean', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, policy: {
          removeFiller: true,
          removeHesitations: true,
          removeLongPauses: true,
          maxPauseDuration_ms: 220,
          targetReductionPercentage: 25,
          preserveTransitions: true,
          maintainNaturalFlow: true,
          enableDeduplication: true,
          preferLaterTakes: true
        }})
      })

      const vadReq = loadedMediaUrl ? fetch('/api/diagnostics/subtitles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId: currentUploadId || undefined, runVad: true, storageUrl: loadedMediaUrl })
      }) : Promise.resolve(null as any)

      const [cleanRes, vadRes] = await Promise.allSettled([cleanReq, vadReq])

      if (cleanRes.status === 'fulfilled' && cleanRes.value && cleanRes.value.ok) {
        const j = await cleanRes.value.json().catch(() => null)
        if (j?.success && j?.decision) {
          setPrecomputedDecision(j.decision)
        }
      }
      if (vadRes.status === 'fulfilled' && vadRes.value && vadRes.value.ok) {
        const j = await vadRes.value.json().catch(() => null)
        const vad = j?.diagnostics?.vad
        if (vad) {
          setPrecomputedVad(vad)
          try {
            const raw = Array.isArray(vad.pauses) ? vad.pauses : []
            const mapped = raw.map((p: any) => ({ start: Number(p.start || 0), end: Number(p.end || 0), duration: Number(p.dur || Math.max(0, (p.end || 0) - (p.start || 0))), type: 'interSegment' as const }))
            setPausesForEditor(mapped)
          } catch {}
        } else {
          // fallback to local detected pauses when VAD missing
          try {
            const mappedLocal = (detectedPauses || []).map((p: any) => ({ start: p.start, end: p.end, duration: p.duration, segmentId: p.segmentId, beforeWordIndex: p.beforeWordIndex, type: p.type }))
            setPausesForEditor(mappedLocal)
          } catch {}
        }
      } else {
        // fallback to local detected pauses
        try {
          const mappedLocal = (detectedPauses || []).map((p: any) => ({ start: p.start, end: p.end, duration: p.duration, segmentId: p.segmentId, beforeWordIndex: p.beforeWordIndex, type: p.type }))
          setPausesForEditor(mappedLocal)
        } catch {}
      }

      setAnalysisReady(true)
      setProcessingStep_old('Analysis ready — click Cut to apply')
      setProcessingProgress_old(100)
      // Let the panel remain visible; hide spinner
    } catch {}
    finally {
      setIsProcessing(false)
      // Keep step/percent ephemeral
      setTimeout(() => { setProcessingStep_old(''); setProcessingProgress_old(0) }, 300)
    }
  }, [transcriptSegments, previewDuration, scriptText, loadedMediaUrl, currentUploadId, detectedPauses])

  const generateVisualOverlaysFromTranscript = useCallback(async () => {
    if (!transcriptSegments.length) return
    
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    const suggestions: any[] = []
    try {
      const res = await fetch('/api/ai-visual-director', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ segments: transcriptSegments, language: 'auto', maxSuggestions: 18, minSpacingSec: 2.2 })
      })
      if (res.ok) {
        const data = await res.json()
        suggestions.push(...(Array.isArray(data?.data?.suggestions) ? data.data.suggestions : []))
      }
    } catch (e) {
      console.warn('AI Visual Director failed', e)
    }

    const planned = suggestions.filter(s => s.visual_type !== 'none')
    const overlays: VisualOverlay[] = []

    const emojiPlanned = planned.map((s) => ({
      ...s,
      visual_type: 'emoji' as const,
      emoji: s.emoji || findBestEmoji(s.pixabay_query || s.keyword || s.transcript_line || '') || '✨'
    }))

    const emojiCounts = new Map<string, number>()
    for (const ov of visualOverlays) {
      if (!ov.emoji) continue
      emojiCounts.set(ov.emoji, (emojiCounts.get(ov.emoji) || 0) + 1)
    }

    const placements: Array<NonNullable<VisualOverlay['placement']>> = ['aboveSub', 'topRight', 'topLeft', 'bottomRight', 'bottomLeft']
    let placeIdx = 0

    for (const s of emojiPlanned) {
      const start = typeof s.start === 'number' ? s.start : 0
      const end = typeof s.end === 'number' ? s.end : start + 1.0
      const duration = Math.max(0.5, Math.min(0.8, Math.max(0.2, end - start)))

      const emoji = String(s.emoji || '✨')
      const used = emojiCounts.get(emoji) || 0
      if (used >= 2) continue
      emojiCounts.set(emoji, used + 1)

      const placement = placements[placeIdx++ % placements.length]
      const animations: Array<NonNullable<VisualOverlay['animation']>> = ['pop','flip','bounce','slide']
      const animation = animations[(placeIdx + used) % animations.length]

      overlays.push({
        id: `vo_${(s.keyword || 'emoji')}_${Math.round(start * 1000)}`,
        start,
        duration,
        mediaUrl: 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='128' height='128'><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='96'>${emoji}</text></svg>`),
        placement,
        size: 60,
        emoji,
        animation
      })
    }

    const merged: VisualOverlay[] = []
    const seen = new Set<string>()
    for (const existing of visualOverlays) {
      seen.add(`${Math.round(existing.start * 10)}|${existing.emoji || existing.mediaUrl}`)
    }
    for (const ov of overlays) {
      const key = `${Math.round(ov.start * 10)}|${ov.emoji || ov.mediaUrl}`
      if (seen.has(key)) continue
      seen.add(key)
      merged.push(ov)
    }

    const timelineSorted = [...visualOverlays, ...merged].sort((a, b) => a.start - b.start)
    const nonOverlapping: VisualOverlay[] = []
    let lastEnd = -Infinity
    for (const ov of timelineSorted) {
      if (ov.start >= lastEnd - 0.05) {
        nonOverlapping.push(ov)
        lastEnd = ov.start + ov.duration
      }
    }

    setVisualOverlays(nonOverlapping)
    setAutoIconsGenerated(true)
  }, [transcriptSegments, visualOverlays])

  const handleAddIcons = useCallback(async () => {
    try {
      setIsProcessing(true)
      setProcessingStep_old('Finding emojis for key moments...')
      setProcessingProgress_old(85)
      await generateVisualOverlaysFromTranscript()
      setProcessingStep_old('Applying emojis...')
      setProcessingProgress_old(96)
      await new Promise(r => setTimeout(r, 350))
    } finally {
      setIsProcessing(false)
    }
  }, [generateVisualOverlaysFromTranscript])

  const handleClearIcons = useCallback(() => {
    setVisualOverlays([])
    setAutoIconsGenerated(false)
  }, [])

  // Apply precomputed decision to word-level without deleting entire segments
  const applyPrecomputedCut = useCallback(async () => {
    if (!precomputedDecision) return

    const keepWindows: Array<{ start: number; end: number }> = Array.isArray(precomputedDecision.keepSegments)
      ? precomputedDecision.keepSegments.map((k: any) => ({ start: (k.start_ms || 0) / 1000, end: (k.end_ms || 0) / 1000 }))
      : []

    const normalize = (raw: string) => String(raw || '').trim().toLowerCase().replace(/[.,;:!?…]+$/g, '')
    const isPortal = (raw: string) => {
      const t = normalize(raw)
      if (!t) return false
      // Strong filler/"portal" tokens
      if (/^(um|uh|er|ah|hm|hmm|mm|äh|ö|uhm)$/.test(t)) return true
      if (t === 'like') return true
      if (t === 'basically' || t === 'literally' || t === 'actually') return true
      return false
    }

    const updatedSegments = (transcriptSegments as any).map((seg: any) => {
      const ensureWords = seg.words && seg.words.length ? seg.words : buildWordTiming(seg.text, seg.startTime, seg.endTime)
      // Phrase-level portal removal: mark indices for multi-word fillers
      const toRemove = new Set<number>()
      for (let i = 0; i < ensureWords.length - 1; i++) {
        const a = normalize(ensureWords[i].word)
        const b = normalize(ensureWords[i + 1].word)
        // you know
        if (a === 'you' && b === 'know') { toRemove.add(i); toRemove.add(i + 1) }
        // i mean
        if ((a === 'i' || a === "i'm") && b === 'mean') { toRemove.add(i); toRemove.add(i + 1) }
        // kind of / sort of
        if ((a === 'kind' || a === 'sort') && b === 'of') { toRemove.add(i); toRemove.add(i + 1) }
      }
      const words = ensureWords.map((w: any) => {
        const mid = ((w.start || 0) + (w.end || 0)) / 2
        const inside = keepWindows.length ? keepWindows.some(win => mid >= win.start && mid <= win.end) : true
        if (!inside) return { ...w, kept: false, isRemoved: true, removalReason: 'auto' }
        if (isPortal(w.word) || toRemove.has(ensureWords.indexOf(w))) return { ...w, kept: false, isRemoved: true, removalReason: 'portal' }
        return { ...w, kept: true, isRemoved: false, removalReason: undefined }
      })
      const newText = words.filter((w: any) => w.kept !== false).map((w: any) => w.word).join(' ')
      return { ...seg, words, text: newText }
    })

    setTranscriptSegments(updatedSegments)
    // Reflect keep windows on timeline clips
    if (keepWindows.length && loadedMediaUrl) {
      const clips = keepWindows.map((win, idx) => ({ id: `k${idx + 1}`, src: loadedMediaUrl as string, start: Math.max(0, win.start), duration: Math.max(0.12, win.end - win.start) }))
      setInitialClips(clips)
      setPlaybackWindows(keepWindows)
    }
    setAnalysisReady(false)
  }, [precomputedDecision, transcriptSegments, loadedMediaUrl, buildWordTiming])

  // Test subtitle generation function
  const generateTestSubtitles = useCallback(() => {
    console.log('🎬 Manual subtitle generation requested:', { 
      hasTranscript: transcriptSegments.length > 0,
      segmentCount: transcriptSegments.length 
    })
    
    if (transcriptSegments.length > 0) {
      // Generate from actual transcript segments
      generateSubtitles({
        transcriptSegments,
        subtitleSettings,
        currentTime: currentTime,
        duration: previewDuration || videoDuration || 30
      })
      console.log('✅ Generated subtitles from transcript segments')
    } else {
      // Fall back to test subtitles
      createTestSubtitles(transcriptSegments, subtitleSettings)
      console.log('✅ Generated test subtitles')
    }
  }, [createTestSubtitles, generateSubtitles, transcriptSegments, subtitleSettings, currentTime, previewDuration, videoDuration])

  // Remove only pauses (standard pacing): keep all words except inside long pauses
  const applyPauseOnlyCut = useCallback(async (pace: 'standard' | 'fast' | 'slow' = 'standard') => {
    // Prefer server VAD, else local detected pauses
    const sourcePauses: Array<{ start: number; end: number; duration: number }> = pausesForEditor && pausesForEditor.length
      ? pausesForEditor.map(p => ({ start: p.start, end: p.end, duration: p.duration }))
      : (detectedPauses || []).map((p: any) => ({ start: p.start, end: p.end, duration: p.duration }))
    if (!sourcePauses.length) return

    // Thresholds per pace
    const minPause = pace === 'fast' ? 0.18 : pace === 'slow' ? 0.40 : 0.28
    const keepWindows = sourcePauses
      .filter(p => p.duration >= minPause)
      .map(p => ({ start: p.start, end: p.end }))

    if (!keepWindows.length) return

    const updatedSegments = (transcriptSegments as any).map((seg: any) => {
      const ensureWords = seg.words && seg.words.length ? seg.words : buildWordTiming(seg.text, seg.startTime, seg.endTime)
      const words = ensureWords.map((w: any) => {
        const mid = ((w.start || 0) + (w.end || 0)) / 2
        const insidePause = keepWindows.some(win => mid >= win.start && mid <= win.end)
        if (insidePause) return { ...w, kept: false, isRemoved: true, removalReason: 'pause' }
        return { ...w, kept: true, isRemoved: false, removalReason: undefined }
      })
      const newText = words.filter((w: any) => w.kept !== false).map((w: any) => w.word).join(' ')
      return { ...seg, words, text: newText }
    })

    setTranscriptSegments(updatedSegments)

    // Rebuild timeline clips by removing pause windows (keep non-pause zones)
    if (loadedMediaUrl) {
      const timeline: Array<{ start: number; end: number }> = []
      const total = previewDuration || (videoDuration || 0)
      let cursor = 0
      const sorted = [...keepWindows].sort((a, b) => a.start - b.start)
      for (const p of sorted) {
        const start = Math.max(0, Math.min(total, p.start))
        const end = Math.max(0, Math.min(total, p.end))
        if (start > cursor) timeline.push({ start: cursor, end: start })
        cursor = Math.max(cursor, end)
      }
      if (cursor < total) timeline.push({ start: cursor, end: total })
      const clips = timeline
        .filter(w => (w.end - w.start) >= 0.12)
        .map((w, idx) => ({ id: `p${idx + 1}`, src: loadedMediaUrl as string, start: w.start, duration: w.end - w.start }))
      setInitialClips(clips)
      setPlaybackWindows(timeline)
    }
  }, [pausesForEditor, detectedPauses, transcriptSegments, buildWordTiming, loadedMediaUrl, previewDuration, videoDuration])

  const addVideoAndTranscribe = useCallback(async (file: File) => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      const fd = new FormData()
      fd.append('file', file)
      fd.append('fileType', 'video')
      
      // Enter workflow view and show progress
      setShowMediaView(true)
      setIsProcessing(true)
      setProcessingStep_old('Uploading video...')
      setProcessingProgress_old(5)

      const up = await fetch('/api/media-upload', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd })
      const uj = await up.json().catch(() => null)
      if (!up.ok) throw new Error(uj?.error || 'Upload failed')
      
      const media = uj?.data
      const uploadId = media?.id
      const fileUrl = media?.storage_url
      setCurrentUploadId(uploadId || null)
      setLoadedMediaUrl(fileUrl || null)
      
      if (uploadId && fileUrl) {
        setProcessingStep_old('Transcribing audio...')
        setProcessingProgress_old(25)
        const tr = await fetch('/api/jobs/transcribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uploadId, fileUrl }) })
        const tj = await tr.json().catch(() => null)
        
        if (tr.ok && Array.isArray(tj?.segments) && tj.segments.length) {
          setProcessingStep_old('Preparing transcript...')
          setProcessingProgress_old(45)
          const tSegs = tj.segments.map((seg: any, idx: number) => ({
            id: `ts-${idx + 1}`,
            text: seg.text,
            startTime: seg.start,
            endTime: seg.end,
            speaker: seg.speaker || 'Speaker 1',
            confidence: seg.confidence || 0.95,
            words: Array.isArray(seg.words) && seg.words.length > 0 ? seg.words.map((w: any) => ({ 
              word: w.word || w.text_for_display || '', 
              start: w.start || 0, 
              end: w.end || 0, 
              confidence: w.confidence || 0.9 
            })) : []
          }))
          
          setTranscriptSegments(tSegs as any)
          setShowTranscriptView(true)
          
          // Generate subtitles immediately after transcript is ready
          setProcessingStep_old('Generating subtitles...')
          setProcessingProgress_old(50)
          try {
            generateSubtitles({
              transcriptSegments: tSegs as any,
              subtitleSettings,
              currentTime: 0,
              duration: previewDuration || videoDuration || 30
            })
            console.log('✅ Subtitles generated from transcript')
          } catch (error) {
            console.warn('⚠️ Failed to generate subtitles:', error)
          }
          
          // Immediately precompute analysis for instant cut
          setProcessingStep_old('Analyzing pauses and bad takes...')
          setProcessingProgress_old(60)
          await precomputeAnalysis()
          // Auto-apply cleaned preview: bad takes and standard pause trimming
          try {
            await applyPrecomputedCut()
            await applyPauseOnlyCut('standard')
          } catch {}
          // Return to editor view so changes are visible immediately
          setShowMediaView(false)
        }
      }
    } catch (err: any) {
      console.error('addVideoAndTranscribe failed:', err)
      alert(err?.message || 'Failed to add and transcribe video')
    }
  }, [buildWordTiming, resegmentCapCutStyle, precomputeAnalysis, applyPrecomputedCut, applyPauseOnlyCut, generateSubtitles, subtitleSettings, previewDuration, videoDuration])

  // Process pending file when addVideoAndTranscribe is available
  useEffect(() => {
    if (pendingFileRef.current && addVideoAndTranscribe) {
      const file = pendingFileRef.current
      pendingFileRef.current = null
      addVideoAndTranscribe(file)
    }
  }, [addVideoAndTranscribe])

  const trimPausesWithPace = useCallback(async (pace: 'slow' | 'normal' | 'fast') => {
    // Stub implementation - would contain the actual pause trimming logic
    console.log('Trimming pauses with pace:', pace)
  }, [])

  const processVideo = useCallback(async () => {
    // Stub implementation - would contain the actual video processing logic
    console.log('Processing video...')
  }, [])

  // Load user videos for library
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


  // Ensure bad-take cut: precompute if needed, then apply instantly
  const applyBadTakesNow = useCallback(async () => {
    try {
      if (!analysisReady || !precomputedDecision) {
        setIsProcessing(true)
        setProcessingStep_old('Analyzing bad takes...')
        setProcessingProgress_old(60)
        await precomputeAnalysis()
      }
      await applyPrecomputedCut()
      setShowMediaView(false)
    } finally {
      setIsProcessing(false)
      setProcessingStep_old('')
      setProcessingProgress_old(0)
    }
  }, [analysisReady, precomputedDecision, precomputeAnalysis, applyPrecomputedCut])

  // Professional audio processing handlers
  const handleProfessionalEdit = useCallback(async (type: 'analyze' | 'quick' | 'complete') => {
    // Wait for upload to complete if still in progress
    if (!currentUploadId && uploadedFile) {
      console.log('⏳ Waiting for upload to complete...')
      alert('Upload in progress. Professional processing will start once upload completes...')
      
      // Wait up to 30 seconds for upload to complete
      let waitTime = 0
      while (!currentUploadId && waitTime < 30000) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        waitTime += 1000
      }
    }
    
    if (!currentUploadId) {
      console.warn('No upload ID available for professional processing')
      alert('Please upload a video first before using professional editing features.')
      return
    }

    // For professional processing, we can work with minimal transcript data
    // The API will handle cases where transcription is still in progress
    if (!transcriptSegments.length && type !== 'analyze') {
      console.warn('No transcript available for professional processing')
      alert('Please wait for transcription to complete before using professional editing.')
      return
    }

    try {
      switch (type) {
        case 'analyze':
          console.log('🎯 Starting professional analysis...')
          const analysis = await analyzeBadTakes(currentUploadId)
          if (analysis) {
            console.log('📊 Analysis complete:', analysis)
            // Show success message
            setTimeout(() => {
              alert(`Analysis complete! Found ${analysis.totalIssues} editing opportunities that could save ${analysis.potentialTimeReduction.percentage.toFixed(1)}% of your video length.`)
            }, 500)
          }
          break
        
        case 'quick':
          console.log('⚡ Starting quick professional processing...')
          const quickResult = await quickPauseRemoval(currentUploadId, 'normal')
          if (quickResult?.success) {
            console.log('✅ Quick processing completed successfully')
            
            // Update the loaded media URL to show the processed version
            if (quickResult.processedMediaUrl && quickResult.processedMediaUrl.includes('processed_')) {
              setLoadedMediaUrl(quickResult.processedMediaUrl)
              console.log('📼 Updated video with processed version:', quickResult.processedMediaUrl)
              
              // Force video to reload with new source
              if (previewVideoRef.current) {
                previewVideoRef.current.load()
              }
            } else {
              console.log('📼 Processing simulation completed - keeping original video')
            }
            
            // Show success message with stats
            setTimeout(() => {
              const hasProcessedVideo = quickResult.processedMediaUrl && quickResult.processedMediaUrl.includes('processed_')
              const videoStatus = hasProcessedVideo ? "✅ Video updated with processed version!" : "📝 Processing simulation completed"
              
              alert(`Quick processing complete! 🎬\n\n${videoStatus}\n\nResults:\n• Reduced video by ${quickResult.stats.reductionPercentage.toFixed(1)}%\n• Removed ${quickResult.stats.segmentsRemoved} segments\n• Removed ${quickResult.stats.silenceRemoved} silence periods\n\nYour video is now more engaging and professional!`)
            }, 500)
          } else {
            throw new Error(quickResult?.error || 'Quick processing failed')
          }
          break
        
        case 'complete':
          console.log('🎬 Starting complete professional processing...')
          const completeResult = await professionalEdit(currentUploadId)
          if (completeResult?.success) {
            console.log('✅ Complete professional processing finished')
            
            // Update the loaded media URL to show the processed version
            if (completeResult.processedMediaUrl && completeResult.processedMediaUrl.includes('processed_')) {
              setLoadedMediaUrl(completeResult.processedMediaUrl)
              console.log('📼 Updated video with professionally processed version:', completeResult.processedMediaUrl)
              
              // Force video to reload with new source
              if (previewVideoRef.current) {
                previewVideoRef.current.load()
              }
            } else {
              console.log('📼 Professional processing simulation completed - keeping original video')
            }
            
            // Show success message with detailed stats
            setTimeout(() => {
              const stats = completeResult.stats
              const hasProcessedVideo = completeResult.processedMediaUrl && completeResult.processedMediaUrl.includes('processed_')
              const videoStatus = hasProcessedVideo ? "✅ Video updated with Instagram Reel quality!" : "📝 Processing simulation completed"
              
              alert(`Professional editing complete! 🎬\n\n${videoStatus}\n\nInstagram Reel Quality Results:\n• Original: ${stats.originalDuration.toFixed(1)}s → Final: ${stats.finalDuration.toFixed(1)}s\n• Time saved: ${stats.reductionPercentage.toFixed(1)}%\n• Segments removed: ${stats.segmentsRemoved}\n• Bad takes cleaned: ${stats.badTakesRemoved}\n• Silence trimmed: ${stats.silenceRemoved}\n\nYour video is now professional quality and ready for social media! 🚀`)
            }, 500)
          } else {
            throw new Error(completeResult?.error || 'Professional processing failed')
          }
          break
      }
    } catch (error: any) {
      console.error('❌ Professional processing failed:', error)
      alert(`Professional processing failed: ${error.message || 'Unknown error'}. Please try again or contact support.`)
    }
  }, [currentUploadId, transcriptSegments.length, analyzeBadTakes, quickPauseRemoval, professionalEdit])

  return {
    // Media state
    currentUploadId,
    loadedMediaUrl,
    videoAspectRatio,
    uploadedFile,
    
    // Transcript state
    transcriptSegments,
    textOverlays,
    visualOverlays,
    detectedPauses,
    pausesForEditor,
    
    // Video controls
    isPreviewPlaying,
    isPreviewMuted,
    currentTime: previewCurrent,
    previewDuration,
    previewVideoRef,
    
    // Timeline state
    initialClips,
    autoZoomPlan,
    
    // UI state
    showTranscriptView,
    showProjectVideoPanel,
    showChatPopup,
    showTextElements,
    showVideoClips,
    showAudioElements,
    showMediaView,
    analysisReady,
    isProcessing,
    isProcessingSubtitles,
    processingStep: processingStep_old,
    processingProgress: processingProgress_old,
    
    // Professional processing state
    isProfessionalProcessing,
    isAnalyzing,
    professionalProcessingStep: processingStep,
    professionalProcessingProgress: processingProgress,
    badTakeAnalysis,
    hasProfessionalResult,
    hasAnalysis,
    activeTool,
    activeMode,
    showMusicPopup,
    musicVolume,
    
    // Layout state
    projectTop,
    projectBottom,
    projectWidth,
    projectHeight,
    previewTop,
    modeContainerWidth,
    chatTop,
    standardGap,
    headerBarRef,
    projectAsideRef,
    mediaBgRef,
    modeContainerRef,
    modeButtonRefs,
    modes,
    
    // Media library
    searchQuery,
    filterKind,
    filteredMedia,
    
    // Actions
    setShowTranscriptView,
    setShowProjectVideoPanel,
    setShowChatPopup,
    setShowTextElements,
    setShowVideoClips,
    setShowAudioElements,
    setActiveTool,
    setActiveMode,
    setSearchQuery,
    setFilterKind,
    setMusicVolume,
    setShowMusicPopup,
    setShowMediaView,
    setCurrentUploadId,
    setLoadedMediaUrl,
    togglePreviewPlay,
    togglePreviewMute,
    seekRelative,
    handleTranscriptSeek,
    handleTranscriptSegmentEdit,
    handleTranscriptSegmentSplit,
    handleTranscriptSegmentRemove,
    handleTranscriptWordClick,
    handleTranscriptWordToggle,
    handleTranscriptWordAction,
    handleFileUpload,
    handleExport,
    handleAddIcons,
    handleClearIcons,
    onTextChange,
    addVideoAndTranscribe,
    trimPausesWithPace,
    generateVisualOverlaysFromTranscript,
    processVideo,
    resegmentCapCutStyle,
    applyPrecomputedCut,
    applyPauseOnlyCut,
    applyBadTakesNow,
    
    // Professional processing actions
    handleProfessionalEdit,
    analyzeBadTakes: () => currentUploadId ? analyzeBadTakes(currentUploadId) : Promise.resolve(null),
    hydrateFromUpload,
    
    // Subtitle generation actions
    generateTestSubtitles,
    clearSubtitles,
    subtitleSettings,
    subtitleActions
  }
}
