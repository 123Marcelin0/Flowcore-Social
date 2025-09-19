// lib/pause-utils.ts

export interface WordTimingLike {
  word: string
  start: number
  end: number
  confidence?: number
}

export interface PauseHint {
  start: number
  end: number
  dur: number
  type: 'interWord' | 'sentenceBreak'
}

/**
 * Compute pause hints from word timing gaps. These are used to snap subtitle
 * boundaries to nearby silences for more natural reading rhythm.
 */
export function computePauseHints(
  words: WordTimingLike[],
  silenceThresholdSec: number = 0.45,
  collapseBelowSec: number = 0.15
): PauseHint[] {
  const pauses: PauseHint[] = []
  if (!words || words.length < 2) return pauses

  for (let i = 0; i < words.length - 1; i++) {
    const a = words[i]
    const b = words[i + 1]
    const gap = Math.max(0, b.start - a.end)
    if (gap < collapseBelowSec) continue
    const isSentenceBreak = /[\.!\?]+$/.test(a.word)
    if (gap >= silenceThresholdSec || isSentenceBreak) {
      pauses.push({ start: a.end, end: b.start, dur: gap, type: isSentenceBreak ? 'sentenceBreak' : 'interWord' })
    }
  }
  return pauses
}

/**
 * Snap a proposed boundary time to the nearest pause end within a window.
 * Returns the snapped time or null if nothing is within range.
 */
export function snapBoundaryToPause(
  boundaryTime: number,
  pauses: PauseHint[],
  windowSec: number = 0.12
): number | null {
  if (!pauses || pauses.length === 0) return null
  let best: PauseHint | null = null
  let bestDist = Infinity
  for (const p of pauses) {
    const t = p.end
    const dist = Math.abs(t - boundaryTime)
    if (dist <= windowSec && dist < bestDist) {
      bestDist = dist
      best = p
    }
  }
  return best ? best.end : null
}

/**
 * Light smoothing/merging of pauses that are very close to each other.
 */
export function smoothPauses(pauses: PauseHint[], mergeIfWithinSec: number = 0.08): PauseHint[] {
  if (!pauses || pauses.length === 0) return []
  const sorted = pauses.slice().sort((a, b) => a.start - b.start)
  const out: PauseHint[] = []
  let acc: PauseHint | null = null
  for (const p of sorted) {
    if (!acc) { acc = { ...p }; continue }
    if (p.start - acc.end <= mergeIfWithinSec) {
      acc.end = Math.max(acc.end, p.end)
      acc.dur = acc.end - acc.start
      acc.type = (acc.type === 'sentenceBreak' || p.type === 'sentenceBreak') ? 'sentenceBreak' : 'interWord'
    } else {
      out.push(acc)
      acc = { ...p }
    }
  }
  if (acc) out.push(acc)
  return out
}



































