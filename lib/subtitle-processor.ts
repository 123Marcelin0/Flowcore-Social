// lib/subtitle-processor.ts
import { computePauseHints, smoothPauses, snapBoundaryToPause, type PauseHint } from './pause-utils'

export interface WordTiming {
  word: string
  start: number
  end: number
  confidence?: number
  speaker?: string
}

export interface SpeakerSegment {
  speakerId: string
  start: number
  end: number
}

export interface SubtitleProcessorOptions {
  maxCharsPerLine?: number
  maxLines?: number
  minDuration?: number
  preferredMinDuration?: number
  maxDuration?: number
  endPadding?: number
  mergeIfShorterThan?: number
  silenceThreshold?: number
  collapseShortPausesBelow?: number
  wordConfidenceThreshold?: number
  minGap?: number
  maxOverlap?: number
  allowShortTokens?: string[]
  enableDynamicProgramming?: boolean
  lengthPenaltyWeight?: number
  durationPenaltyWeight?: number
  silenceRewardWeight?: number
  clauseBreakPenaltyWeight?: number
  readingSpeedTargetCps?: number
  readingSpeedWeight?: number
  collocationPenaltyWeight?: number
  namedEntityPenaltyWeight?: number
  connectorPenaltyWeight?: number
  snapToSilenceWindow?: number
  karaokeOverlapMax?: number
  minReadingCps?: number
  maxReadingCps?: number
}

export interface SubtitleChunk {
  start: number
  end: number
  text: string
  confidence?: number
  speaker?: string
  low_confidence?: boolean
  // editor helpers
  words?: Array<{ word: string; start: number; end: number; confidence?: number }>
  lineBreakIndex?: number | null
}

const DEFAULTS: Required<SubtitleProcessorOptions> = {
  maxCharsPerLine: 40,
  maxLines: 3,
  minDuration: 1.0,
  preferredMinDuration: 1.5,
  maxDuration: 4.0,
  endPadding: 0.18,
  mergeIfShorterThan: 0.6,
  silenceThreshold: 0.4,
  collapseShortPausesBelow: 0.15,
  wordConfidenceThreshold: 0.3,
  minGap: 0.05,
  maxOverlap: 0.12,
  allowShortTokens: ["ja", "ok", "nein", "hm", "ah", "oh"],
  enableDynamicProgramming: true,
  lengthPenaltyWeight: 2.2,
  durationPenaltyWeight: 2.6,
  silenceRewardWeight: 1.4,
  clauseBreakPenaltyWeight: 3.25,
  readingSpeedTargetCps: 14.0,
  readingSpeedWeight: 2.2,
  collocationPenaltyWeight: 2.4,
  namedEntityPenaltyWeight: 1.8,
  connectorPenaltyWeight: 1.8,
  snapToSilenceWindow: 0.18,
  karaokeOverlapMax: 0.15,
  minReadingCps: 8.0,
  maxReadingCps: 17.0
}

export class SubtitleProcessor {
  private readonly cfg: Required<SubtitleProcessorOptions>

  constructor(options?: SubtitleProcessorOptions) {
    this.cfg = { ...DEFAULTS, ...(options || {}) }
  }

  public process(
    inputWords: WordTiming[],
    speakerSegments?: SpeakerSegment[],
    pauseHints?: Array<{ start: number; end: number; dur: number }>
  ): SubtitleChunk[] {
    const words = this.preprocessWords(inputWords)
    if (words.length === 0) return []

    // 1) Candidate boundaries
    const naturalBreaks = this.computeNaturalBreaks(words)
    const pauses: PauseHint[] = smoothPauses(
      (pauseHints && pauseHints.length
        ? (pauseHints as PauseHint[])
        : computePauseHints(words, this.cfg.silenceThreshold, this.cfg.collapseShortPausesBelow))
    )

    // 2) Segmentation: dynamic programming optimizer (fallback to greedy)
    const rawChunks = this.cfg.enableDynamicProgramming
      ? this.segmentDP(words, naturalBreaks, pauses)
      : this.segmentGreedy(words, naturalBreaks)

    // 3) Merge & smooth
    const merged = this.mergeAndSmooth(rawChunks)

    // 4) Padding & clamp
    const padded = this.applyPaddingAndClamp(merged)

    // 5) Line breaking + confidence flags
    const finalChunks = padded.map((c) => this.applyLineBreakAndConfidence(c))

    // 6) Speaker attribution if provided
    if (speakerSegments && speakerSegments.length) {
      for (const c of finalChunks) {
        const spk = speakerSegments.find(s => c.start >= s.start && c.end <= s.end)
        if (spk) c.speaker = spk.speakerId
      }
    }

    return finalChunks
  }

  public toSRT(chunks: SubtitleChunk[]): string {
    const lines: string[] = []
    chunks.forEach((c, idx) => {
      const [l1, l2] = this.splitTextIntoLines(c.text)
      const textOut = l2 ? `${l1}\n${l2}` : l1
      lines.push(String(idx + 1))
      lines.push(`${this.ms(c.start * 1000)} --> ${this.ms(c.end * 1000)}`)
      lines.push(textOut)
      lines.push("")
    })
    return lines.join("\n")
  }

  public toVTT(chunks: SubtitleChunk[]): string {
    const lines: string[] = ["WEBVTT", ""]
    chunks.forEach((c) => {
      const [l1, l2] = this.splitTextIntoLines(c.text)
      const textOut = l2 ? `${l1}\n${l2}` : l1
      lines.push(`${this.ms(c.start * 1000)} --> ${this.ms(c.end * 1000)}`)
      lines.push(textOut)
      lines.push("")
    })
    return lines.join("\n")
  }

  private preprocessWords(words: WordTiming[]): WordTiming[] {
    // Ensure monotonic times & filter invalids
    let cleaned = words
      .filter(w => Number.isFinite(w.start) && Number.isFinite(w.end) && w.end > w.start)
      .sort((a, b) => a.start - b.start)
    if (cleaned.length === 0) return cleaned
    // Confidence-aware cleanup: drop ultra-low confidence unless isolated filler
    const isFiller = (t: string) => /^(um|uh|er|ah|hm|hmm|mm|äh|ö|uhm)$/i.test(t)
    cleaned = cleaned.filter((w, i, arr) => {
      const conf = w.confidence ?? 1
      const token = this.stripPunct(w.word).toLowerCase()
      if (conf >= (this.cfg.wordConfidenceThreshold * 0.5)) return true
      if (isFiller(token)) {
        const prev = arr[i - 1], next = arr[i + 1]
        const prevGap = prev ? Math.max(0, w.start - prev.end) : Infinity
        const nextGap = next ? Math.max(0, next.start - w.end) : Infinity
        if (prevGap >= this.cfg.silenceThreshold && nextGap >= this.cfg.silenceThreshold) return true
      }
      return false
    })
    return cleaned
  }

  private computeNaturalBreaks(words: WordTiming[]): boolean[] {
    const b: boolean[] = Array(words.length).fill(false)
    for (let i = 0; i < words.length - 1; i++) {
      const curr = words[i]
      const next = words[i + 1]
      const gap = Math.max(0, next.start - curr.end)
      const token = curr.word
      const isPunct = /[\.!\?;:,]$/.test(token)
      if (isPunct) b[i] = true
      if (gap >= this.cfg.silenceThreshold) b[i] = true
      if (gap <= this.cfg.collapseShortPausesBelow) b[i] = false
      // discourage breaks after connectors
      if (this.isConnector(token)) b[i] = false
    }
    return b
  }

  private segmentGreedy(words: WordTiming[], breaks: boolean[]): SubtitleChunk[] {
    const result: SubtitleChunk[] = []
    let acc: WordTiming[] = []

    const flush = () => {
      if (acc.length === 0) return
      const start = acc[0].start
      const end = acc[acc.length - 1].end
      const text = this.buildDisplayText(acc)
      result.push({ start, end, text, words: acc.map(w => ({ word: this.stripPunct(w.word), start: w.start, end: w.end, confidence: w.confidence })) })
      acc = []
    }

    for (let i = 0; i < words.length; i++) {
      const w = words[i]
      const candidate = [...acc, w]
      const charCount = this.charLen(candidate)
      const duration = (candidate[candidate.length - 1].end - candidate[0].start)
      const reachedLimit = this.wouldExceedLimits(charCount, duration)

      // decide split
      if (reachedLimit && acc.length > 0) {
        flush()
        acc.push(w)
        continue
      }

      acc.push(w)

      // prefer split at natural break, if current chunk is healthy
      if (i < words.length - 1 && breaks[i]) {
        const currentChars = this.charLen(acc)
        const currentDur = acc[acc.length - 1].end - acc[0].start
        const healthy = this.isHealthyChunk(currentChars, currentDur, acc.length)
        if (healthy) flush()
      }
    }

    flush()
    return result
  }

  // Dynamic programming segmentation optimizing for readability & timing
  private segmentDP(
    words: WordTiming[],
    breaks: boolean[],
    pauseHints?: PauseHint[]
  ): SubtitleChunk[] {
    const n = words.length
    const dp: number[] = Array(n + 1).fill(Infinity)
    const prev: number[] = Array(n + 1).fill(-1)
    dp[0] = 0

    // Precompute durations and char counts
    const startTimes = words.map(w => w.start)
    const endTimes = words.map(w => w.end)
    const tokenTexts = words.map(w => this.stripPunct(w.word))
    const charPrefix: number[] = [0]
    for (let i = 0; i < n; i++) {
      const add = (i === 0 ? 0 : 1) + tokenTexts[i].length // include space except first
      charPrefix.push(charPrefix[charPrefix.length - 1] + add)
    }

    // Precompute named-entity spans and collocation boundaries for penalty shaping
    const namedEntitySpans = this.detectNamedEntitySpans(words)
    const isInsideNamedEntityBoundary: boolean[] = Array(n).fill(false)
    for (const [s, e] of namedEntitySpans) {
      for (let k = s; k < e; k++) {
        isInsideNamedEntityBoundary[k] = true // boundary after k is inside NE span
      }
    }
    const isCollocationSplit: boolean[] = Array(n).fill(false)
    for (let i = 0; i < n - 1; i++) {
      if (this.isCollocationBoundary(tokenTexts, i)) isCollocationSplit[i] = true
    }

    const charRange = (l: number, r: number): number => {
      // characters for words[l..r], with spaces between
      if (l > r) return 0
      const len = charPrefix[r + 1] - charPrefix[l]
      return len
    }

    const penaltyForChunk = (l: number, r: number): number => {
      const start = startTimes[l]
      const end = endTimes[r]
      let dur = end - start
      if (dur <= 0) dur = 0.001
      const chars = charRange(l, r)

      // length penalty (over budget)
      const maxChars = this.cfg.maxCharsPerLine * this.cfg.maxLines
      const over = Math.max(0, chars - maxChars)
      let cost = over * this.cfg.lengthPenaltyWeight

      // duration penalty: strong preference for [preferredMinDuration..preferredMinDuration+1.5] window
      if (dur > this.cfg.maxDuration) return Infinity
      const prefMin = this.cfg.preferredMinDuration
      const prefMax = Math.min(this.cfg.maxDuration, prefMin + 1.5)
      let durPenalty = 0
      if (dur < prefMin) durPenalty = Math.pow(prefMin - dur, 2)
      else if (dur > prefMax) durPenalty = Math.pow(dur - prefMax, 1.5)
      cost += durPenalty * this.cfg.durationPenaltyWeight

      // reading speed (chars per sec near target) with hard bounds
      const cps = chars / Math.max(dur, 0.001)
      const cpsDist = Math.abs(cps - this.cfg.readingSpeedTargetCps) / this.cfg.readingSpeedTargetCps
      cost += cpsDist * this.cfg.readingSpeedWeight
      if (cps < this.cfg.minReadingCps || cps > this.cfg.maxReadingCps) cost += this.cfg.readingSpeedWeight * 2

      // collocation and named-entity protection: discourage extremely short or entity-clipped chunks
      const leftShort = tokenTexts[l].length <= 2
      const rightShort = tokenTexts[r].length <= 2
      if ((leftShort || rightShort) && chars <= Math.floor(maxChars * 0.5)) cost += this.cfg.collocationPenaltyWeight * 0.5
      // higher penalty if the proposed start or end lies within a named entity span
      if (isInsideNamedEntityBoundary[r]) cost += this.cfg.namedEntityPenaltyWeight

      return cost
    }

    const boundaryReward = (idx: number): number => {
      // reward if we end chunk at idx (i = idx)
      const gap = idx < n - 1 ? Math.max(0, startTimes[idx + 1] - endTimes[idx]) : 0
      let reward = 0
      if (/[\.!\?;:,]$/.test(words[idx].word)) reward += this.cfg.silenceRewardWeight * 1.2
      if (gap >= this.cfg.silenceThreshold) reward += this.cfg.silenceRewardWeight
      if (gap < this.cfg.silenceThreshold && !breaks[idx]) {
        reward -= this.cfg.clauseBreakPenaltyWeight
      }
      // discourage ending after connectors
      if (this.isConnector(words[idx].word)) reward -= this.cfg.connectorPenaltyWeight
      // discourage if split breaks collocation
      if (isCollocationSplit[idx]) reward -= this.cfg.collocationPenaltyWeight
      // discourage if split lies inside named entity span
      if (isInsideNamedEntityBoundary[idx]) reward -= this.cfg.namedEntityPenaltyWeight
      // Extra reward if near a detected VAD pause end
      if (pauseHints && pauseHints.length) {
        const endT = endTimes[idx]
        const near = pauseHints.some(p => Math.abs(p.end - endT) <= this.cfg.snapToSilenceWindow)
        if (near) reward += this.cfg.silenceRewardWeight * 1.6
      }
      return reward
    }

    for (let i = 1; i <= n; i++) {
      for (let j = Math.max(0, i - 30); j < i; j++) { // limit window for performance
        const pc = penaltyForChunk(j, i - 1)
        if (pc === Infinity) continue
        const reward = boundaryReward(i - 1)
        const cand = dp[j] + pc - reward
        if (cand < dp[i]) { dp[i] = cand; prev[i] = j }
      }
    }

    // Reconstruct
    const chunks: SubtitleChunk[] = []
    let i = n
    const stacks: Array<[number, number]> = []
    while (i > 0 && prev[i] >= 0) { stacks.push([prev[i], i - 1]); i = prev[i] }
    stacks.reverse()
    for (const [l, r] of stacks) {
      let start = startTimes[l]
      let end = endTimes[r]
      // snap boundaries to nearest pause ends within window
      if (pauseHints && pauseHints.length) {
        const snStart = snapBoundaryToPause(start, pauseHints, this.cfg.snapToSilenceWindow)
        if (snStart != null) start = snStart
        const snEnd = snapBoundaryToPause(end, pauseHints, this.cfg.snapToSilenceWindow)
        if (snEnd != null) end = snEnd
      }
      const text = tokenTexts.slice(l, r + 1).join(' ').replace(/\s+/g, ' ').trim()
      chunks.push({ start, end, text, words: words.slice(l, r + 1).map(w => ({ word: this.stripPunct(w.word), start: w.start, end: w.end, confidence: w.confidence })) })
    }
    return chunks
  }

  private mergeAndSmooth(chunks: SubtitleChunk[]): SubtitleChunk[] {
    if (chunks.length === 0) return chunks

    // Merge too-short chunks
    const merged: SubtitleChunk[] = []
    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i]
      if (c.end - c.start < this.cfg.mergeIfShorterThan && i > 0) {
        const prev = merged[merged.length - 1]
        const combined: SubtitleChunk = {
          start: prev.start,
          end: c.end,
          text: `${prev.text} ${c.text}`.trim(),
          words: [...(prev.words || []), ...(c.words || [])]
        }
        merged[merged.length - 1] = combined
      } else {
        merged.push({ ...c })
      }
    }

    // Post split if lines too long or cps too high after merge
    const balanced: SubtitleChunk[] = []
    for (const c of merged) {
      const dur = Math.max(0.001, c.end - c.start)
      const chars = (c.text || '').replace(/\n/g, ' ').length
      const cps = chars / dur
      const tooLong = chars > this.cfg.maxCharsPerLine * this.cfg.maxLines
      const tooFast = cps > this.cfg.maxReadingCps
      if ((tooLong || tooFast) && (c.words && c.words.length > 2)) {
        const splitIdx = this.findBestSplitIndex(c.words)
        if (splitIdx > 0 && splitIdx < (c.words?.length || 0) - 1) {
          const aWords = (c.words || []).slice(0, splitIdx + 1)
          const bWords = (c.words || []).slice(splitIdx + 1)
          balanced.push({
            start: aWords[0].start,
            end: aWords[aWords.length - 1].end,
            text: aWords.map(w => w.word).join(' '),
            words: aWords
          })
          balanced.push({
            start: bWords[0].start,
            end: bWords[bWords.length - 1].end,
            text: bWords.map(w => w.word).join(' '),
            words: bWords
          })
          continue
        }
      }
      balanced.push(c)
    }

    // Smooth overlaps/gaps
    for (let i = 0; i < balanced.length - 1; i++) {
      const a = balanced[i]
      const b = balanced[i + 1]
      if (a.end > b.start + this.cfg.maxOverlap) {
        // shift boundary to midpoint or nearest silence (heuristic)
        const mid = (a.end + b.start) / 2
        a.end = Math.max(a.start + this.cfg.minGap, mid)
        b.start = Math.min(b.end - this.cfg.minGap, mid)
      }
      if (b.start - a.end < this.cfg.minGap) {
        a.end = b.start - this.cfg.minGap
      }
    }

    return balanced
  }

  private applyPaddingAndClamp(chunks: SubtitleChunk[]): SubtitleChunk[] {
    const out: SubtitleChunk[] = []
    for (let i = 0; i < chunks.length; i++) {
      const c = { ...chunks[i] }
      const next = chunks[i + 1]
      c.start = Math.max(0, c.start)
      let paddedStart = Math.max(0, c.start - this.cfg.endPadding)
      let paddedEnd = c.end + this.cfg.endPadding
      if (next) paddedEnd = Math.min(paddedEnd, next.start + Math.min(this.cfg.maxOverlap, this.cfg.karaokeOverlapMax))
      // Respect maxDuration
      const maxEnd = paddedStart + this.cfg.maxDuration
      if (paddedEnd > maxEnd) paddedEnd = maxEnd
      // Respect minDuration unless allowed
      const dur = paddedEnd - paddedStart
      const allowsShort = (c.words && c.words.length === 1 && this.cfg.allowShortTokens.includes((c.words[0].word || '').toLowerCase()))
      if (!allowsShort && dur < this.cfg.minDuration) {
        paddedEnd = Math.min(paddedStart + this.cfg.preferredMinDuration, (next ? next.start - this.cfg.minGap : paddedStart + this.cfg.maxDuration))
      }
      c.start = paddedStart
      c.end = Math.max(c.start + 0.1, paddedEnd)
      out.push(c)
    }
    return out
  }

  private applyLineBreakAndConfidence(chunk: SubtitleChunk): SubtitleChunk {
    const text = this.cleanWhitespace(chunk.text)
    const [l1, l2, index] = this.splitTextIntoLines(text)
    const words = chunk.words || []
    // Confidence
    let total = 0
    let sum = 0
    let low = false
    // Drop/merge ultra-low confidence words unless chunk becomes empty
    const kept: typeof words = []
    for (let i = 0; i < words.length; i++) {
      const w = words[i]
      const conf = w.confidence ?? 0.9
      const t = (w.word || '').toLowerCase()
      const isFiller = /^(um|uh|er|ah|hm|hmm|mm|äh|ö|uhm)$/i.test(t)
      if (conf < this.cfg.wordConfidenceThreshold * 0.5 && !isFiller) {
        continue
      }
      kept.push(w)
    }
    if (kept.length && kept.length !== words.length) {
      const newText = kept.map(w => w.word).join(' ')
      chunk = { ...chunk, text: newText, words: kept }
    }
    for (const w of words) {
      const conf = w.confidence ?? 0.9
      sum += conf
      total += 1
      if (conf < this.cfg.wordConfidenceThreshold) low = true
    }
    const confidence = total ? (sum / total) : 1
    return {
      ...chunk,
      text: l2 ? `${l1}\n${l2}` : l1,
      confidence,
      low_confidence: low,
      lineBreakIndex: index
    }
  }

  private splitTextIntoLines(text: string): [string, string | null, number | null] {
    const clean = text.replace(/[\.,;:!?…]+/g, '').replace(/\s+/g, ' ').trim()
    if (clean.length <= this.cfg.maxCharsPerLine) return [clean, null, null]
    const maxLines = Math.max(1, Math.min(3, this.cfg.maxLines))
    if (maxLines === 1) {
      return [clean.slice(0, this.cfg.maxCharsPerLine), null, null]
    }
    // Two or three-line splitting prefer mid-sentence balance
    const tokens = clean.split(' ')
    const lines: string[] = []
    let current = ''
    for (let i = 0; i < tokens.length; i++) {
      const w = tokens[i]
      const test = current ? `${current} ${w}` : w
      if (test.length <= this.cfg.maxCharsPerLine) current = test
      else {
        if (current) lines.push(current)
        current = w
      }
      if (lines.length === maxLines - 1) break
    }
    if (current && lines.length < maxLines) lines.push(current)
    const joined = lines.join(' ')
    const rest = clean.slice(joined.length).trim()
    if (maxLines === 2) {
      const l1 = lines[0] || ''
      const l2 = (lines[1] || '') + (rest ? ` ${rest}` : '')
      return [l1, l2.trim() || null, l2 ? (l1.split(' ').length) : null]
    }
    // For 3 lines, return exactly 3 lines if needed, but fold to two when exporting
    const l1 = lines[0] || ''
    const l2 = lines[1] || ''
    const l3 = ((lines[2] || '') + (rest ? ` ${rest}` : '')).trim()
    const two = [l1, (l2 + (l3 ? ` ${l3}` : '')).trim()].filter(Boolean)
    return [two[0] || '', two[1] || null, l1 ? l1.split(' ').length : null]
  }

  private stripPunct(token: string): string {
    return token.replace(/[\.,;:!?…]+$/g, '')
  }

  private buildDisplayText(words: WordTiming[]): string {
    return words.map(w => this.stripPunct(w.word)).join(' ').replace(/\s+/g, ' ').trim()
  }

  private charLen(words: WordTiming[]): number {
    return this.buildDisplayText(words).length
  }

  private wouldExceedLimits(charCount: number, duration: number): boolean {
    const overChars = charCount > this.cfg.maxCharsPerLine * this.cfg.maxLines
    const overDur = duration > this.cfg.maxDuration
    return overChars || overDur
  }

  private isHealthyChunk(charCount: number, duration: number, wordCount: number): boolean {
    const withinChars = charCount <= this.cfg.maxCharsPerLine * this.cfg.maxLines
    const allowsShort = wordCount === 1 && this.cfg.allowShortTokens.length > 0
    const aboveMin = allowsShort ? true : duration >= this.cfg.minDuration
    const belowMax = duration <= this.cfg.maxDuration
    return withinChars && aboveMin && belowMax
  }

  private ms(ms: number): string {
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    const s = Math.floor((ms % 60000) / 1000)
    const msPart = Math.floor(ms % 1000)
    const pad = (n: number, w = 2) => String(n).padStart(w, '0')
    return `${pad(h)}:${pad(m)}:${pad(s)},${pad(msPart, 3)}`
  }

  private cleanWhitespace(text: string): string {
    return text.replace(/\s+/g, ' ').trim()
  }

  private isConnector(token: string): boolean {
    const t = token.toLowerCase().replace(/[\.,;:!?…]+$/g, '')
    return [
      'and','or','but','so','because','that','which','who','while','when','if','then','else',
      'und','oder','aber','weil','dass','welche','wer','während','wenn'
    ].includes(t)
  }

  // Collocation detection: prevent breaking common pairs
  private isCollocationBoundary(tokens: string[], boundaryIdx: number): boolean {
    // boundary is after boundaryIdx (between tokens[boundaryIdx] and tokens[boundaryIdx+1])
    const left = (tokens[boundaryIdx] || '').toLowerCase()
    const right = (tokens[boundaryIdx + 1] || '').toLowerCase()
    const pairs: Array<[RegExp, RegExp]> = [
      [/^(kind|sort|type)$/, /^of$/],
      [/^a$/, /^(lot|bit|bunch)$/],
      [/^in$/, /^(order|fact|terms)$/],
      [/^as$/, /^(well|soon|if)$/],
      [/^going$/, /^(to)$/],
      [/^have$/, /^(to)$/],
      [/^got$/, /^(to)$/],
      [/^need$/, /^(to)$/],
      [/^new$/, /^(york|york\scity)$/],
      [/^san$/, /^(francisco|diego)$/],
      [/^los$/, /^(angeles)$/],
      [/^a$/, /^(movie|look|try|go)$/],
      [/^kind$/, /^(of)$/],
      [/^a$/, /^(little)$/],
      [/^a$/, /^(few)$/],
      [/^out$/, /^(there)$/]
    ]
    for (const [l, r] of pairs) {
      if (l.test(left) && r.test(right)) return true
    }
    return false
  }

  // Named entity spans: naive TitleCase consecutive tokens
  private detectNamedEntitySpans(words: WordTiming[]): Array<[number, number]> {
    const spans: Array<[number, number]> = []
    let start: number | null = null
    const isTitle = (t: string) => /^[A-Z][a-z]+(?:[-'][A-Z][a-z]+)*$/.test(this.stripPunct(t))
    for (let i = 0; i < words.length; i++) {
      const w = words[i]
      if (isTitle(w.word)) {
        if (start == null) start = i
      } else {
        if (start != null && i - start >= 1) spans.push([start, i])
        start = null
      }
    }
    if (start != null && words.length - start >= 1) spans.push([start, words.length])
    return spans
  }

  // Choose a good intra-chunk split index when chunk is too long/fast
  private findBestSplitIndex(words: Array<{ word: string; start: number; end: number }>): number {
    let bestIdx = -1
    let bestScore = -Infinity
    for (let i = 0; i < words.length - 1; i++) {
      const leftWord = words[i].word
      const rightWord = words[i + 1].word
      const gap = Math.max(0, words[i + 1].start - words[i].end)
      let score = 0
      if (/[\.,;:!?…]$/.test(leftWord)) score += 3
      if (gap >= this.cfg.silenceThreshold) score += 2
      if (!this.isConnector(leftWord)) score += 1
      // discourage collocation and named entity splits
      const tokens = words.map(w => this.stripPunct(w.word))
      if (this.isCollocationBoundary(tokens, i)) score -= 2
      const titleLeft = /^[A-Z][a-z]+$/.test(this.stripPunct(leftWord))
      const titleRight = /^[A-Z][a-z]+$/.test(this.stripPunct(rightWord))
      if (titleLeft || titleRight) score -= 1
      if (score > bestScore) { bestScore = score; bestIdx = i }
    }
    return bestIdx
  }
}


