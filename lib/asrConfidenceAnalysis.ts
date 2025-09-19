/**
 * ASR Low-Confidence and Mispronunciation Detection
 * Identifies potentially incorrect transcriptions through confidence analysis and heuristics
 */

export interface ConfidenceAnalysis {
  overallConfidence: number
  lowConfidenceWords: LowConfidenceWord[]
  suspiciousPatterns: SuspiciousPattern[]
  mispronunciationCandidates: MispronunciationCandidate[]
  recommendations: string[]
  segments: SegmentConfidenceAnalysis[]
}

export interface LowConfidenceWord {
  word: string
  confidence: number
  timestamp: number
  segment: number
  reason: 'low_confidence' | 'very_short' | 'repeated_fragment' | 'punctuation_heavy'
}

export interface SuspiciousPattern {
  pattern: string
  type: 'fragment' | 'repetition' | 'gibberish' | 'length_mismatch'
  timestamp: number
  segment: number
  confidence: number
  suggestion?: string
}

export interface MispronunciationCandidate {
  asrWord: string
  scriptWord?: string
  confidence: number
  timestamp: number
  segment: number
  phoneticDistance?: number
  suggestion: string
}

export interface SegmentConfidenceAnalysis {
  segment: number
  averageConfidence: number
  isLowConfidence: boolean
  wordCount: number
  lowConfidenceWordCount: number
  hasFragments: boolean
  hasSuspiciousPatterns: boolean
}

/**
 * Analyze ASR confidence scores and detect problematic transcriptions
 */
export function analyzeASRConfidence(
  segments: Array<{
    text: string
    start: number
    end: number
    confidence?: number
    words?: Array<{
      word: string
      start: number
      end: number
      confidence?: number
    }>
  }>,
  options: {
    lowConfidenceThreshold?: number      // Default: 0.6
    veryLowConfidenceThreshold?: number  // Default: 0.4
    scriptWords?: string[]               // For mispronunciation detection
  } = {}
): ConfidenceAnalysis {
  
  const lowConfidenceThreshold = options.lowConfidenceThreshold || 0.6
  const veryLowConfidenceThreshold = options.veryLowConfidenceThreshold || 0.4
  
  const lowConfidenceWords: LowConfidenceWord[] = []
  const suspiciousPatterns: SuspiciousPattern[] = []
  const mispronunciationCandidates: MispronunciationCandidate[] = []
  const segmentAnalyses: SegmentConfidenceAnalysis[] = []
  
  let totalConfidence = 0
  let totalWords = 0
  
  segments.forEach((segment, segmentIndex) => {
    const words = segment.words || parseWordsFromSegment(segment)
    const segmentConfidences: number[] = []
    let segmentLowConfidenceCount = 0
    let hasFragments = false
    let hasSuspiciousPatterns = false
    
    words.forEach(wordData => {
      const confidence = wordData.confidence || segment.confidence || 0.8
      segmentConfidences.push(confidence)
      totalConfidence += confidence
      totalWords++
      
      // Detect low confidence words
      if (confidence < lowConfidenceThreshold) {
        const reason = detectLowConfidenceReason(wordData.word, confidence, veryLowConfidenceThreshold)
        
        lowConfidenceWords.push({
          word: wordData.word,
          confidence,
          timestamp: wordData.start,
          segment: segmentIndex,
          reason
        })
        
        segmentLowConfidenceCount++
      }
      
      // Detect suspicious patterns
      const suspiciousPattern = detectSuspiciousPatterns(wordData.word, confidence)
      if (suspiciousPattern) {
        suspiciousPattern.timestamp = wordData.start
        suspiciousPattern.segment = segmentIndex
        suspiciousPattern.confidence = confidence
        suspiciousPatterns.push(suspiciousPattern)
        
        if (suspiciousPattern.type === 'fragment') hasFragments = true
        hasSuspiciousPatterns = true
      }
      
      // Detect mispronunciation candidates
      if (options.scriptWords) {
        const mispronunciation = detectMispronunciation(
          wordData.word, 
          confidence, 
          options.scriptWords,
          wordData.start,
          segmentIndex
        )
        if (mispronunciation) {
          mispronunciationCandidates.push(mispronunciation)
        }
      }
    })
    
    // Analyze segment
    const averageConfidence = segmentConfidences.reduce((a, b) => a + b, 0) / Math.max(segmentConfidences.length, 1)
    const isLowConfidence = averageConfidence < lowConfidenceThreshold
    
    segmentAnalyses.push({
      segment: segmentIndex,
      averageConfidence,
      isLowConfidence,
      wordCount: words.length,
      lowConfidenceWordCount: segmentLowConfidenceCount,
      hasFragments,
      hasSuspiciousPatterns
    })
  })
  
  const overallConfidence = totalWords > 0 ? totalConfidence / totalWords : 0
  const recommendations = generateConfidenceRecommendations({
    overallConfidence,
    lowConfidenceWords,
    suspiciousPatterns,
    mispronunciationCandidates,
    segmentAnalyses
  })
  
  return {
    overallConfidence,
    lowConfidenceWords,
    suspiciousPatterns,
    mispronunciationCandidates,
    recommendations,
    segments: segmentAnalyses
  }
}

/**
 * Detect reason for low confidence score
 */
function detectLowConfidenceReason(
  word: string, 
  confidence: number, 
  veryLowThreshold: number
): LowConfidenceWord['reason'] {
  
  if (confidence < veryLowThreshold) {
    return 'low_confidence'
  }
  
  // Very short words (often incorrectly transcribed)
  if (word.length <= 2 && !['I', 'a', 'to', 'in', 'on', 'it', 'is', 'be'].includes(word.toLowerCase())) {
    return 'very_short'
  }
  
  // Words with repeated fragments (he-, ---, etc.)
  if (word.includes('-') || word.match(/^(.)\1{2,}$/)) {
    return 'repeated_fragment'
  }
  
  // Heavy punctuation (often transcription errors)
  const punctuationRatio = (word.match(/[^\w\s]/g) || []).length / word.length
  if (punctuationRatio > 0.3) {
    return 'punctuation_heavy'
  }
  
  return 'low_confidence'
}

/**
 * Detect suspicious word patterns that indicate transcription errors
 */
function detectSuspiciousPatterns(word: string, confidence: number): SuspiciousPattern | null {
  
  // Word fragments ending with hyphen
  if (word.match(/^[a-zA-Z]+-$/)) {
    return {
      pattern: word,
      type: 'fragment',
      timestamp: 0, // Will be set by caller
      segment: 0,   // Will be set by caller
      confidence,
      suggestion: "Likely incomplete word - check for retake"
    }
  }
  
  // Multiple hyphens or dashes
  if (word.match(/^--+$/) || word.match(/^-+$/)) {
    return {
      pattern: word,
      type: 'fragment',
      timestamp: 0,
      segment: 0,
      confidence,
      suggestion: "Transcription artifact - likely pause or silence"
    }
  }
  
  // Repeated characters (stutter detection)
  if (word.match(/^(.)\1{3,}$/)) {
    return {
      pattern: word,
      type: 'repetition',
      timestamp: 0,
      segment: 0,
      confidence,
      suggestion: "Repeated character - possible stutter or audio artifact"
    }
  }
  
  // Gibberish patterns (random letters)
  if (word.length > 3 && !hasVowels(word) && confidence < 0.5) {
    return {
      pattern: word,
      type: 'gibberish',
      timestamp: 0,
      segment: 0,
      confidence,
      suggestion: "Possible gibberish - review audio quality"
    }
  }
  
  // Unusual length for confidence (very long words with low confidence)
  if (word.length > 15 && confidence < 0.7) {
    return {
      pattern: word,
      type: 'length_mismatch',
      timestamp: 0,
      segment: 0,
      confidence,
      suggestion: "Unusually long word with low confidence - verify accuracy"
    }
  }
  
  return null
}

/**
 * Detect potential mispronunciations by comparing with script
 */
function detectMispronunciation(
  asrWord: string,
  confidence: number,
  scriptWords: string[],
  timestamp: number,
  segment: number
): MispronunciationCandidate | null {
  
  if (confidence > 0.8) return null // High confidence words are likely correct
  
  const normalizedASR = normalizeWord(asrWord)
  
  // Find closest script word using simple edit distance
  let bestMatch: string | null = null
  let minDistance = Infinity
  
  scriptWords.forEach(scriptWord => {
    const normalizedScript = normalizeWord(scriptWord)
    const distance = simpleEditDistance(normalizedASR, normalizedScript)
    
    if (distance < minDistance && distance > 0) { // Don't match identical words
      minDistance = distance
      bestMatch = scriptWord
    }
  })
  
  // If we found a close match with reasonable edit distance
  if (bestMatch && minDistance <= 2 && minDistance < normalizedASR.length / 2) {
    return {
      asrWord,
      scriptWord: bestMatch,
      confidence,
      timestamp,
      segment,
      phoneticDistance: minDistance,
      suggestion: `Possible mispronunciation: "${asrWord}" → "${bestMatch}"`
    }
  }
  
  // Check for phonetically similar words (basic)
  const phoneticMatch = findPhoneticMatch(normalizedASR, scriptWords)
  if (phoneticMatch) {
    return {
      asrWord,
      scriptWord: phoneticMatch,
      confidence,
      timestamp,
      segment,
      suggestion: `Phonetic mismatch: "${asrWord}" → "${phoneticMatch}"`
    }
  }
  
  return null
}

/**
 * Cross-validate with second ASR model (when available)
 */
export function crossValidateASR(
  primaryTranscript: Array<{ word: string; confidence: number; start: number }>,
  secondaryTranscript: Array<{ word: string; confidence: number; start: number }>,
  options: {
    timeToleranceSeconds?: number
    confidenceThreshold?: number
  } = {}
): Array<{
  word: string
  primaryConfidence: number
  secondaryConfidence: number
  timestamp: number
  agreement: boolean
  recommendation: string
}> {
  
  const timeTolerance = options.timeToleranceSeconds || 0.5
  const confidenceThreshold = options.confidenceThreshold || 0.6
  const results: any[] = []
  
  primaryTranscript.forEach(primaryWord => {
    // Find corresponding word in secondary transcript
    const secondaryWord = secondaryTranscript.find(secWord => 
      Math.abs(secWord.start - primaryWord.start) <= timeTolerance
    )
    
    if (secondaryWord) {
      const agreement = normalizeWord(primaryWord.word) === normalizeWord(secondaryWord.word)
      let recommendation = ""
      
      if (!agreement) {
        if (primaryWord.confidence < confidenceThreshold && secondaryWord.confidence < confidenceThreshold) {
          recommendation = "Both models uncertain - review audio"
        } else if (primaryWord.confidence > secondaryWord.confidence) {
          recommendation = `Primary model more confident: "${primaryWord.word}"`
        } else {
          recommendation = `Secondary model more confident: "${secondaryWord.word}"`
        }
      } else {
        recommendation = "Models agree - high confidence"
      }
      
      results.push({
        word: primaryWord.word,
        primaryConfidence: primaryWord.confidence,
        secondaryConfidence: secondaryWord.confidence,
        timestamp: primaryWord.start,
        agreement,
        recommendation
      })
    }
  })
  
  return results
}

/**
 * Helper functions
 */

function parseWordsFromSegment(segment: { text: string; start: number; end: number }): Array<{
  word: string; start: number; end: number; confidence?: number
}> {
  const words = segment.text.split(/\s+/).filter(w => w.length > 0)
  const duration = segment.end - segment.start
  const timePerWord = duration / Math.max(words.length, 1)
  
  return words.map((word, index) => ({
    word,
    start: segment.start + (index * timePerWord),
    end: segment.start + ((index + 1) * timePerWord)
  }))
}

function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[^\w]/g, '')
}

function hasVowels(word: string): boolean {
  return /[aeiouAEIOU]/.test(word)
}

function simpleEditDistance(a: string, b: string): number {
  const matrix = Array(a.length + 1).fill(null).map(() => Array(b.length + 1).fill(0))
  
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j
  
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i-1] === b[j-1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i-1][j] + 1,      // deletion
        matrix[i][j-1] + 1,      // insertion
        matrix[i-1][j-1] + cost  // substitution
      )
    }
  }
  
  return matrix[a.length][b.length]
}

function findPhoneticMatch(word: string, candidates: string[]): string | null {
  // Basic phonetic similarity (simplified)
  const phoneticCode = (w: string) => {
    return w.toLowerCase()
      .replace(/ph/g, 'f')
      .replace(/th/g, 't')
      .replace(/ch/g, 'k')
      .replace(/sh/g, 's')
      .replace(/[aeiou]/g, '') // Remove vowels for basic phonetic matching
  }
  
  const wordPhonetic = phoneticCode(word)
  
  for (const candidate of candidates) {
    if (phoneticCode(candidate) === wordPhonetic) {
      return candidate
    }
  }
  
  return null
}

function generateConfidenceRecommendations(analysis: {
  overallConfidence: number
  lowConfidenceWords: LowConfidenceWord[]
  suspiciousPatterns: SuspiciousPattern[]
  mispronunciationCandidates: MispronunciationCandidate[]
  segmentAnalyses: SegmentConfidenceAnalysis[]
}): string[] {
  const recommendations: string[] = []
  
  if (analysis.overallConfidence < 0.6) {
    recommendations.push("Low overall confidence - check audio quality and microphone setup")
  }
  
  const fragmentCount = analysis.suspiciousPatterns.filter(p => p.type === 'fragment').length
  if (fragmentCount > 0) {
    recommendations.push(`${fragmentCount} word fragments detected - likely incomplete sentences or retakes`)
  }
  
  if (analysis.mispronunciationCandidates.length > 0) {
    recommendations.push(`${analysis.mispronunciationCandidates.length} potential mispronunciations - review against script`)
  }
  
  const lowConfidenceSegments = analysis.segmentAnalyses.filter(s => s.isLowConfidence).length
  if (lowConfidenceSegments > analysis.segmentAnalyses.length / 2) {
    recommendations.push("Many low-confidence segments - consider re-recording")
  }
  
  if (recommendations.length === 0) {
    recommendations.push("Good transcription confidence - minimal issues detected")
  }
  
  return recommendations
}

/**
 * Test function for development
 */
export function testASRConfidenceAnalysis() {
  const testSegments = [
    {
      text: "Hello everyone, welc- welcome to the show",
      start: 0,
      end: 4,
      words: [
        { word: "Hello", start: 0, end: 0.5, confidence: 0.95 },
        { word: "everyone", start: 0.6, end: 1.2, confidence: 0.88 },
        { word: "welc-", start: 1.5, end: 1.8, confidence: 0.45 },
        { word: "welcome", start: 2.0, end: 2.6, confidence: 0.92 },
        { word: "to", start: 2.7, end: 2.8, confidence: 0.98 },
        { word: "the", start: 2.9, end: 3.0, confidence: 0.97 },
        { word: "show", start: 3.1, end: 3.5, confidence: 0.91 }
      ]
    }
  ]
  
  const analysis = analyzeASRConfidence(testSegments, {
    scriptWords: ["Hello", "everyone", "welcome", "to", "the", "show"]
  })
  
  console.log('ASR Confidence Analysis Test:', JSON.stringify(analysis, null, 2))
}