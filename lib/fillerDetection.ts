/**
 * Filler word and hesitation detection for bad take identification
 * Analyzes transcript segments for speech disfluencies and hesitations
 */

export interface FillerDetection {
  word: string
  timestamp: number
  segment: number
  type: 'filler' | 'hesitation' | 'repetition' | 'false_start'
  confidence: number
}

export interface FillerAnalysis {
  totalFillers: number
  fillerDensity: number      // fillers per second
  segmentAnalysis: Array<{
    segment: number
    fillerCount: number
    density: number
    duration: number
    hasExcessiveFillers: boolean
  }>
  detections: FillerDetection[]
  recommendations: string[]
}

/**
 * Comprehensive filler word and hesitation patterns
 */
const FILLER_PATTERNS = {
  // Basic filler words
  fillers: new Set([
    "um", "uh", "ah", "er", "erm", "uhm", "mm", "hmm",
    "like", "you know", "i mean", "kind of", "sort of",
    "basically", "actually", "literally", "so", "well",
    "right", "okay", "alright", "yeah"
  ]),
  
  // Hesitation patterns (word fragments)
  hesitationPatterns: [
    /^[a-z]+-$/,           // word fragments ending with hyphen: "the-"
    /^--+$/,               // multiple hyphens: "---"
    /^[a-z]{1,2}$/,        // very short words that might be hesitations: "a", "i"
    /^[a-z]+ [a-z]+- /,    // interrupted words: "the wor-"
  ],
  
  // Repetition patterns
  repetitionPatterns: [
    /^(.+) \1$/,           // immediate repetition: "the the"
    /^(.{2,}) .* \1$/,     // distant repetition within segment
  ],
  
  // False start patterns
  falseStartPatterns: [
    /^i [a-z]+ i /,        // "I was I mean"
    /^the [a-z]+ the /,    // "the car the vehicle"
    /^we [a-z]+ we /,      // "we should we need"
  ]
}

/**
 * Calculate filler density for a segment or entire transcript
 */
export function fillerDensity(words: string[], durationSec: number): number {
  if (!words || words.length === 0 || durationSec <= 0) return 0
  
  const fillerCount = words.filter(word => 
    FILLER_PATTERNS.fillers.has(word.toLowerCase().trim())
  ).length
  
  return fillerCount / Math.max(0.001, durationSec)
}

/**
 * Detect all types of fillers and hesitations in transcript segments
 */
export function detectFillers(segments: Array<{
  start: number
  end: number  
  text: string
  words?: Array<{ word: string; start: number; end: number; confidence?: number }>
}>): FillerAnalysis {
  const detections: FillerDetection[] = []
  const segmentAnalysis: FillerAnalysis['segmentAnalysis'] = []
  
  segments.forEach((segment, segmentIndex) => {
    const duration = segment.end - segment.start
    const words = segment.words || parseWordsFromText(segment.text, segment.start, duration)
    const segmentFillers: FillerDetection[] = []
    
    // Detect basic filler words
    words.forEach(word => {
      const cleanWord = word.word.toLowerCase().replace(/[.,!?;:]/, '')
      
      if (FILLER_PATTERNS.fillers.has(cleanWord)) {
        const detection: FillerDetection = {
          word: word.word,
          timestamp: word.start,
          segment: segmentIndex,
          type: 'filler',
          confidence: word.confidence || 0.8
        }
        detections.push(detection)
        segmentFillers.push(detection)
      }
    })
    
    // Detect hesitation patterns
    const text = segment.text.toLowerCase()
    FILLER_PATTERNS.hesitationPatterns.forEach(pattern => {
      const matches = text.match(pattern)
      if (matches) {
        const detection: FillerDetection = {
          word: matches[0],
          timestamp: segment.start,
          segment: segmentIndex,
          type: 'hesitation',
          confidence: 0.7
        }
        detections.push(detection)
        segmentFillers.push(detection)
      }
    })
    
    // Detect repetitions
    const wordList = words.map(w => w.word.toLowerCase())
    const wordText = wordList.join(' ')
    
    FILLER_PATTERNS.repetitionPatterns.forEach(pattern => {
      const matches = wordText.match(pattern)
      if (matches) {
        const detection: FillerDetection = {
          word: matches[0],
          timestamp: segment.start,
          segment: segmentIndex,
          type: 'repetition',
          confidence: 0.9
        }
        detections.push(detection)
        segmentFillers.push(detection)
      }
    })
    
    // Detect false starts
    FILLER_PATTERNS.falseStartPatterns.forEach(pattern => {
      const matches = wordText.match(pattern)
      if (matches) {
        const detection: FillerDetection = {
          word: matches[0],
          timestamp: segment.start,
          segment: segmentIndex,
          type: 'false_start',
          confidence: 0.8
        }
        detections.push(detection)
        segmentFillers.push(detection)
      }
    })
    
    // Analyze segment
    const segmentFillerCount = segmentFillers.length
    const segmentDensity = fillerDensity(wordList, duration)
    const hasExcessiveFillers = segmentDensity > 0.5 || segmentFillerCount > 3
    
    segmentAnalysis.push({
      segment: segmentIndex,
      fillerCount: segmentFillerCount,
      density: segmentDensity,
      duration,
      hasExcessiveFillers
    })
  })
  
  // Calculate overall metrics
  const totalDuration = segments.reduce((sum, seg) => sum + (seg.end - seg.start), 0)
  const totalFillers = detections.length
  const overallDensity = totalFillers / Math.max(totalDuration, 0.001)
  
  // Generate recommendations
  const recommendations = generateFillerRecommendations({
    totalFillers,
    fillerDensity: overallDensity,
    segmentAnalysis,
    detections
  })
  
  return {
    totalFillers,
    fillerDensity: overallDensity,
    segmentAnalysis,
    detections,
    recommendations
  }
}

/**
 * Generate editing recommendations based on filler analysis
 */
function generateFillerRecommendations(analysis: {
  totalFillers: number
  fillerDensity: number
  segmentAnalysis: FillerAnalysis['segmentAnalysis']
  detections: FillerDetection[]
}): string[] {
  const recommendations: string[] = []
  
  if (analysis.fillerDensity > 1.0) {
    recommendations.push("High filler word density detected - consider aggressive filler removal")
  } else if (analysis.fillerDensity > 0.5) {
    recommendations.push("Moderate filler usage - selective removal recommended")
  }
  
  const excessiveSegments = analysis.segmentAnalysis.filter(s => s.hasExcessiveFillers)
  if (excessiveSegments.length > 0) {
    recommendations.push(`${excessiveSegments.length} segments with excessive fillers - review for retakes`)
  }
  
  const repetitions = analysis.detections.filter(d => d.type === 'repetition')
  if (repetitions.length > 0) {
    recommendations.push(`${repetitions.length} word repetitions detected - likely retakes`)
  }
  
  const falseStarts = analysis.detections.filter(d => d.type === 'false_start')
  if (falseStarts.length > 0) {
    recommendations.push(`${falseStarts.length} false starts detected - consider removal`)
  }
  
  if (recommendations.length === 0) {
    recommendations.push("Clean speech detected - minimal editing required")
  }
  
  return recommendations
}

/**
 * Parse words from text when word-level timing isn't available
 */
function parseWordsFromText(
  text: string, 
  startTime: number, 
  duration: number
): Array<{ word: string; start: number; end: number }> {
  const words = text.split(/\s+/).filter(w => w.length > 0)
  const timePerWord = duration / Math.max(words.length, 1)
  
  return words.map((word, index) => ({
    word,
    start: startTime + (index * timePerWord),
    end: startTime + ((index + 1) * timePerWord)
  }))
}

/**
 * Advanced filler detection for specific speech patterns
 */
export function detectAdvancedFillers(
  segments: Array<{ start: number; end: number; text: string }>,
  options: {
    customFillers?: string[]
    sensitivityLevel?: 'low' | 'medium' | 'high'
    detectMicroPauses?: boolean
  } = {}
): FillerAnalysis {
  // Add custom filler words if provided
  if (options.customFillers) {
    options.customFillers.forEach(filler => {
      FILLER_PATTERNS.fillers.add(filler.toLowerCase())
    })
  }
  
  // Adjust sensitivity based on level
  const sensitivity = options.sensitivityLevel || 'medium'
  const thresholds = {
    low: { density: 1.0, excessiveCount: 5 },
    medium: { density: 0.5, excessiveCount: 3 },
    high: { density: 0.2, excessiveCount: 2 }
  }
  
  const analysis = detectFillers(segments)
  
  // Apply sensitivity adjustments
  const threshold = thresholds[sensitivity]
  analysis.segmentAnalysis.forEach(segment => {
    segment.hasExcessiveFillers = segment.density > threshold.density || 
                                  segment.fillerCount > threshold.excessiveCount
  })
  
  return analysis
}

/**
 * Test function for development
 */
export function testFillerDetection() {
  const testSegments = [
    {
      start: 0,
      end: 5,
      text: "Um, so like, I think, you know, this is actually really good",
      words: [
        { word: "Um", start: 0, end: 0.5, confidence: 0.9 },
        { word: "so", start: 0.8, end: 1.0, confidence: 0.9 },
        { word: "like", start: 1.2, end: 1.4, confidence: 0.8 },
        // ... more words
      ]
    },
    {
      start: 5,
      end: 8,
      text: "The the car is really fast and-- I mean the vehicle is quick",
    }
  ]
  
  const analysis = detectFillers(testSegments)
  console.log('Filler analysis test:', JSON.stringify(analysis, null, 2))
}