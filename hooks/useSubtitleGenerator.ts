import { useCallback, useEffect, useState } from "react"
import type { TextOverlay, TranscriptSegmentUI } from "@/app/video-editorneu/types"
import { SubtitleSettings } from "./useSubtitleSettings"

interface SubtitleGenerationOptions {
  transcriptSegments: TranscriptSegmentUI[]
  subtitleSettings: SubtitleSettings
  currentTime: number
  duration: number
}

export function useSubtitleGenerator() {
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([])
  const [detectedPauses, setDetectedPauses] = useState<Array<{ start: number; end: number; duration: number; segmentId?: string; beforeWordIndex?: number; type: 'initial' | 'interWord' | 'interSegment' }>>([])

  // Helper function to build naive word timing if ASR lacks word-level timestamps
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

  // Main subtitle generation function - converts transcript segments into text overlays
  const generateTextOverlays = useCallback((options: SubtitleGenerationOptions) => {
    const { transcriptSegments, subtitleSettings } = options
    
    if (!transcriptSegments || transcriptSegments.length === 0) {
      setTextOverlays([])
      setDetectedPauses([])
      return
    }

    const overlays: TextOverlay[] = []
    const pauses: Array<{ start: number; end: number; duration: number; segmentId?: string; beforeWordIndex?: number; type: 'initial' | 'interWord' | 'interSegment' }> = []

    // Process each transcript segment
    for (const segment of transcriptSegments) {
      const segmentWords = segment.words && segment.words.length > 0 
        ? segment.words 
        : buildWordTiming(segment.text, segment.startTime, segment.endTime)

      if (!segmentWords.length) continue

      // Group words into subtitle cards based on settings
      const cards: Array<{
        words: typeof segmentWords
        start: number
        end: number
        text: string
      }> = []

      let currentCard = {
        words: [] as typeof segmentWords,
        start: segmentWords[0].start,
        end: segmentWords[0].end,
        text: ''
      }

      for (let i = 0; i < segmentWords.length; i++) {
        const word = segmentWords[i]
        const nextWord = segmentWords[i + 1]

        // Check if we should start a new card
        const shouldBreak = 
          // Max words per card reached
          currentCard.words.length >= subtitleSettings.wordsPerCard ||
          // Gap threshold exceeded
          (nextWord && (nextWord.start - word.end) > subtitleSettings.gapThreshold) ||
          // Max duration reached
          (word.end - currentCard.start) > 3.0 ||
          // Last word
          i === segmentWords.length - 1

        currentCard.words.push(word)
        currentCard.end = word.end
        currentCard.text = currentCard.words.map(w => w.word).join(' ')

        if (shouldBreak || i === segmentWords.length - 1) {
          // Ensure minimum words per card
          if (currentCard.words.length >= subtitleSettings.minWordsPerCard) {
            cards.push({ ...currentCard })
          } else if (cards.length > 0) {
            // Merge with previous card if too few words
            const prevCard = cards[cards.length - 1]
            prevCard.words.push(...currentCard.words)
            prevCard.end = currentCard.end
            prevCard.text = prevCard.words.map(w => w.word).join(' ')
          } else {
            // First card, keep it even if short
            cards.push({ ...currentCard })
          }

          // Start new card if not last word
          if (i < segmentWords.length - 1 && nextWord) {
            currentCard = {
              words: [],
              start: nextWord.start,
              end: nextWord.end,
              text: ''
            }
          }
        }

        // Detect pauses between words
        if (nextWord) {
          const pauseDuration = nextWord.start - word.end
          if (pauseDuration > subtitleSettings.gapThreshold) {
            pauses.push({
              start: word.end,
              end: nextWord.start,
              duration: pauseDuration,
              segmentId: segment.id,
              beforeWordIndex: i + 1,
              type: 'interWord'
            })
          }
        }
      }

      // Convert cards to text overlays
      for (let cardIndex = 0; cardIndex < cards.length; cardIndex++) {
        const card = cards[cardIndex]
        const nextCard = cards[cardIndex + 1]
        
        // Calculate timing with linger effect
        const baseStart = Math.max(0, card.start - subtitleSettings.wordLead)
        const baseEnd = card.end + subtitleSettings.wordTrail
        const lingerEnd = nextCard 
          ? Math.min(baseEnd + subtitleSettings.cardLinger, nextCard.start - 0.01)
          : baseEnd + subtitleSettings.cardLinger

        const finalDuration = Math.max(0.5, lingerEnd - baseStart)

        // Create tokens for word-level animation
        const tokens = card.words.map((word, idx) => ({
          w: word.word,
          offset: Math.max(0, word.start - baseStart),
          dur: Math.max(0.1, word.end - word.start)
        }))

        const overlay: TextOverlay = {
          id: `subtitle_${segment.id}_${cardIndex}`,
          start: baseStart,
          duration: finalDuration,
          text: card.text,
          tokens,
          style: {
            fontSize: subtitleSettings.fontSize,
            color: subtitleSettings.color,
            position: subtitleSettings.positionY > 50 ? "bottom" : subtitleSettings.positionY < 30 ? "top" : "center"
          }
        }

        overlays.push(overlay)
      }

      // Detect pauses between segments
      const nextSegment = transcriptSegments.find(s => s.startTime > segment.endTime)
      if (nextSegment) {
        const pauseDuration = nextSegment.startTime - segment.endTime
        if (pauseDuration > subtitleSettings.gapThreshold) {
          pauses.push({
            start: segment.endTime,
            end: nextSegment.startTime,
            duration: pauseDuration,
            segmentId: segment.id,
            type: 'interSegment'
          })
        }
      }
    }

    setTextOverlays(overlays)
    setDetectedPauses(pauses)
  }, [buildWordTiming])

  // Generate subtitles from transcript segments automatically
  const generateSubtitles = useCallback((options: SubtitleGenerationOptions) => {
    generateTextOverlays(options)
  }, [generateTextOverlays])

  // Manual subtitle creation for testing
  const createTestSubtitles = useCallback((transcriptSegments: TranscriptSegmentUI[], settings: SubtitleSettings) => {
    if (!transcriptSegments.length) {
      // Create demo subtitles for testing
      const demoOverlays: TextOverlay[] = [
        {
          id: "demo_1",
          start: 0,
          duration: 2.5,
          text: "Welcome to the video editor",
          tokens: [
            { w: "Welcome", offset: 0, dur: 0.6 },
            { w: "to", offset: 0.7, dur: 0.3 },
            { w: "the", offset: 1.1, dur: 0.3 },
            { w: "video", offset: 1.5, dur: 0.6 },
            { w: "editor", offset: 2.2, dur: 0.7 }
          ],
          style: {
            fontSize: settings.fontSize,
            color: settings.color,
            position: "bottom"
          }
        },
        {
          id: "demo_2", 
          start: 3,
          duration: 3,
          text: "This is a subtitle test",
          tokens: [
            { w: "This", offset: 0, dur: 0.4 },
            { w: "is", offset: 0.5, dur: 0.3 },
            { w: "a", offset: 0.9, dur: 0.2 },
            { w: "subtitle", offset: 1.2, dur: 0.8 },
            { w: "test", offset: 2.1, dur: 0.5 }
          ],
          style: {
            fontSize: settings.fontSize,
            color: settings.color,
            position: "bottom"
          }
        }
      ]
      setTextOverlays(demoOverlays)
      return
    }

    generateTextOverlays({
      transcriptSegments,
      subtitleSettings: settings,
      currentTime: 0,
      duration: transcriptSegments[transcriptSegments.length - 1]?.endTime || 30
    })
  }, [generateTextOverlays])

  // Clear all subtitles
  const clearSubtitles = useCallback(() => {
    setTextOverlays([])
    setDetectedPauses([])
  }, [])

  return {
    textOverlays,
    detectedPauses,
    generateSubtitles,
    createTestSubtitles,
    clearSubtitles,
    setTextOverlays
  }
}