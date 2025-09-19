export type TranscriptWord = { start: number; end: number; text: string }

export type ZoomEvent = {
  start_ms: number
  end_ms: number
  scale?: number // 1.0 = no zoom
  offsetX?: number // -1..1 (left..right)
  offsetY?: number // -1..1 (top..bottom)
}

export type TransitionEvent = {
  at_ms: number
  kind?: 'fade' | 'slideLeft' | 'slideRight' | 'wipeLeft' | 'wipeRight' | 'zoom'
}

export type HighlightSpan = { start_ms: number; end_ms: number; word: string }

export type AutoZoomPlan = {
  zoom_events: ZoomEvent[]
  transition_events: TransitionEvent[]
  highlights: HighlightSpan[]
  meta?: { preset?: 'subtle' | 'normal' | 'punchy' }
}

export function analyzeAutoZoom(params: {
  videoMeta: { duration_s: number }
  transcript: TranscriptWord[]
  audioPath?: string | null
  videoPath?: string | null
  rois?: Array<any>
  preset?: 'subtle' | 'normal' | 'punchy'
}): AutoZoomPlan {
  const { transcript, videoMeta, preset = 'normal' } = params

  const duration_ms = Math.max(0, Math.round((videoMeta?.duration_s || 0) * 1000))
  const words = (transcript || []).filter(w => Number.isFinite(w.start) && Number.isFinite(w.end) && typeof w.text === 'string')

  // Debug logs (server-side)
  try {
    console.log('[auto-zoom/analyze] words=', words.length, 'duration_ms=', duration_ms, 'preset=', preset)
  } catch {}

  // Compute gaps and simple semantic signals
  const longPauseMs = 420 // ~0.42s pause → candidate transition boundary
  const transitions: TransitionEvent[] = []
  for (let i = 0; i < words.length - 1; i++) {
    const gapMs = Math.round((words[i + 1].start - words[i].end) * 1000)
    if (gapMs >= longPauseMs) {
      transitions.push({ at_ms: Math.round(words[i].end * 1000), kind: gapMs > 900 ? 'fade' : 'slideLeft' })
    }
  }
  // Ensure last word boundary marks an end transition (useful for final clip)
  if (words.length > 0) {
    transitions.push({ at_ms: Math.round(words[words.length - 1].end * 1000), kind: 'fade' })
  }

  // Important words (very simple keyword model; frontend can style them)
  const importantRe = /(important|key|tip|secret|new|now|today|best|why|how|big|city|düsseldorf|dusseldorf|sale|win|grow|faster|stop|start|free|pro|pro\b|ai|trend|viral|boost|convert|money|profit|success)/i
  const highlights: HighlightSpan[] = []
  for (const w of words) {
    if (importantRe.test(w.text)) {
      highlights.push({ start_ms: Math.round(w.start * 1000), end_ms: Math.round(w.end * 1000), word: w.text })
    }
  }

  // Zoom events: place varied zooms around highlight words, with spacing
  const zooms: ZoomEvent[] = []
  // Allow more frequent zooms; remaining smoothing is handled client-side
  const minGapBetweenZoomsMs = 550
  let lastZoomEnd = -Infinity
  const baseScale = preset === 'punchy' ? 1.18 : preset === 'subtle' ? 1.06 : 1.12

  for (let i = 0; i < highlights.length; i++) {
    const h = highlights[i]
    const start = Math.max(0, h.start_ms - 100)
    const end = Math.min(duration_ms || h.end_ms + 420, h.end_ms + 420)
    if (start - lastZoomEnd < minGapBetweenZoomsMs) continue
    
    // Vary zoom types and directions for cinematic feel
    const zoomType = i % 4
    let scale = baseScale
    let offsetX = 0
    let offsetY = 0
    
    switch (zoomType) {
      case 0: // Zoom in center
        scale = baseScale
        offsetX = 0
        offsetY = 0
        break
      case 1: // Zoom out (opening zoom) - keep subtle for natural feel
        scale = preset === 'punchy' ? 0.92 : preset === 'subtle' ? 0.98 : 0.94
        offsetX = 0
        offsetY = 0
        break
      case 2: // Zoom in left side
        scale = baseScale * 1.06
        offsetX = -10
        offsetY = Math.random() > 0.5 ? -6 : 6
        break
      case 3: // Zoom in right side with slight upward pan
        scale = baseScale * 1.03
        offsetX = 8
        offsetY = -4
        break
    }
    
    // Add some randomness to prevent mechanical feeling
    if (Math.random() > 0.7) {
      offsetX += (Math.random() - 0.5) * 6
      offsetY += (Math.random() - 0.5) * 4
    }
    
    zooms.push({ start_ms: start, end_ms: end, scale, offsetX, offsetY })
    lastZoomEnd = end
  }
  
  // Add some opening/closing zooms for dramatic effect
  if (words.length > 0 && preset !== 'subtle') {
    // Opening zoom out at the beginning
    const firstWordStart = Math.round(words[0].start * 1000)
    if (firstWordStart > 500) {
      zooms.unshift({ 
        start_ms: 0, 
        end_ms: Math.min(firstWordStart, 1400), 
        scale: 0.96, 
        offsetX: 0, 
        offsetY: 0 
      })
    }
    
    // Potential closing zoom for dramatic ending
    const lastWordEnd = Math.round(words[words.length - 1].end * 1000)
    if (duration_ms && duration_ms - lastWordEnd > 800) {
      zooms.push({ 
        start_ms: lastWordEnd, 
        end_ms: Math.min(duration_ms, lastWordEnd + 1200), 
        scale: baseScale * 1.04, 
        offsetX: 0, 
        offsetY: -6 
      })
    }
  }

  // Fallback rhythmic zooms if not enough highlights
  const desiredCount = Math.max(2, Math.floor((duration_ms || 0) / 2500))
  if (zooms.length < desiredCount && duration_ms > 0) {
    const missing = desiredCount - zooms.length
    const spacing = Math.max(2000, Math.floor(duration_ms / (desiredCount + 1)))
    for (let i = 0; i < missing; i++) {
      const t = Math.min(duration_ms - 800, (i + 1) * spacing)
      // Skip if collides with existing
      const collides = zooms.some(z => Math.abs(z.start_ms - t) < 400)
      if (collides) continue
      const alt = i % 2
      zooms.push({
        start_ms: Math.max(0, t - 200),
        end_ms: Math.min(duration_ms, t + 700),
        scale: alt ? baseScale * 1.05 : baseScale * 0.99,
        offsetX: alt ? -6 : 6,
        offsetY: alt ? 4 : -4
      })
    }
  }

  // Guardrails
  // Merge very close zooms to reduce stutter between adjacent events
  const sorted = zooms.filter(z => z.end_ms > z.start_ms).sort((a, b) => a.start_ms - b.start_ms)
  const merged: ZoomEvent[] = []
  const joinGapMs = 160
  for (const z of sorted) {
    const last = merged[merged.length - 1]
    if (last && z.start_ms - last.end_ms <= joinGapMs) {
      // Extend last event to cover this window; keep the latter's target for a gentle drift
      last.end_ms = Math.max(last.end_ms, z.end_ms)
      last.scale = z.scale ?? last.scale
      last.offsetX = z.offsetX ?? last.offsetX
      last.offsetY = z.offsetY ?? last.offsetY
    } else {
      merged.push({ ...z })
    }
  }
  const zoom_events = merged
  const transition_events = dedupeTransitions(transitions, 320)

  try {
    console.log('[auto-zoom/analyze] out zooms=', zoom_events.length, 'transitions=', transition_events.length, 'highlights=', highlights.length)
  } catch {}

  return {
    zoom_events,
    transition_events,
    highlights,
    meta: { preset }
  }
}

function dedupeTransitions(arr: TransitionEvent[], minGapMs: number): TransitionEvent[] {
  const out: TransitionEvent[] = []
  let last = -Infinity
  for (const t of arr.sort((a, b) => a.at_ms - b.at_ms)) {
    if (t.at_ms - last >= minGapMs) {
      out.push(t)
      last = t.at_ms
    }
  }
  return out
}


