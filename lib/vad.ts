/**
 * Voice Activity Detection (VAD) utilities for pause detection
 * Used to guide subtitle segmentation by finding natural speech pauses
 */

export interface VadResult {
  start: number
  end: number
  confidence: number
}

export interface PauseHint {
  timestamp: number
  duration: number
  type: 'inter_word' | 'inter_sentence' | 'long_pause'
  confidence: number
}

/**
 * Simple VAD using word timing gaps
 * Identifies pauses based on gaps between consecutive words
 */
export function detectPausesFromWords(
  words: Array<{ word: string; start: number; end: number }>,
  options: {
    silenceThreshold?: number
    longPauseThreshold?: number
    minPauseConfidence?: number
  } = {}
): PauseHint[] {
  const {
    silenceThreshold = 0.3,
    longPauseThreshold = 1.0,
    minPauseConfidence = 0.7
  } = options

  const pauses: PauseHint[] = []
  
  if (words.length < 2) return pauses

  // Sort words by start time to ensure correct order
  const sortedWords = [...words].sort((a, b) => a.start - b.start)

  for (let i = 0; i < sortedWords.length - 1; i++) {
    const currentWord = sortedWords[i]
    const nextWord = sortedWords[i + 1]
    
    const gap = nextWord.start - currentWord.end
    
    if (gap >= silenceThreshold) {
      const pauseType = gap >= longPauseThreshold ? 'long_pause' : 
                       isPunctuationEnd(currentWord.word) ? 'inter_sentence' : 'inter_word'
      
      // Higher confidence for larger gaps and sentence boundaries
      const confidence = Math.min(1.0, 
        minPauseConfidence + 
        (gap - silenceThreshold) * 0.3 + 
        (pauseType === 'inter_sentence' ? 0.2 : 0)
      )

      pauses.push({
        timestamp: currentWord.end,
        duration: gap,
        type: pauseType,
        confidence
      })
    }
  }

  return pauses
}

/**
 * Check if a word ends with punctuation indicating sentence boundary
 */
function isPunctuationEnd(word: string): boolean {
  if (!word) return false
  const lastChar = word.trim().slice(-1)
  return ['.', '!', '?', ':', ';'].includes(lastChar)
}

/**
 * Convert pause hints to boundary scores for DP segmentation
 * Higher scores indicate better boundaries for subtitle breaks
 */
export function pausesToBoundaryScores(
  words: Array<{ word: string; start: number; end: number }>,
  pauses: PauseHint[],
  options: {
    maxBoundaryWindow?: number
    pauseBonus?: number
    sentenceBonus?: number
  } = {}
): number[] {
  const {
    maxBoundaryWindow = 0.5, // seconds
    pauseBonus = 2.0,
    sentenceBonus = 1.5
  } = options

  // Initialize boundary scores (one per word position)
  const scores = new Array(words.length).fill(0)

  pauses.forEach(pause => {
    // Find words near this pause timestamp
    words.forEach((word, index) => {
      const distanceFromPause = Math.abs(word.end - pause.timestamp)
      
      if (distanceFromPause <= maxBoundaryWindow) {
        // Score decays with distance from pause
        const proximityFactor = 1 - (distanceFromPause / maxBoundaryWindow)
        
        let bonus = pauseBonus
        if (pause.type === 'inter_sentence') bonus += sentenceBonus
        if (pause.type === 'long_pause') bonus += 1.0
        
        scores[index] += bonus * pause.confidence * proximityFactor
      }
    })
  })

  return scores
}

/**
 * Enhanced VAD that analyzes audio energy (placeholder for future implementation)
 * Currently returns word-gap based detection
 */
export async function analyzeAudioForVAD(
  audioUrl: string,
  options: {
    frameSize?: number
    hopSize?: number
    energyThreshold?: number
  } = {}
): Promise<VadResult[]> {
  // TODO: Implement actual audio analysis using Web Audio API or server-side processing
  // For now, return empty results - will be enhanced with actual VAD later
  console.log('🎤 Audio VAD analysis not yet implemented, using word-gap detection')
  return []
}





