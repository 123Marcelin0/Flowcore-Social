/**
 * Word Error Rate (WER) calculation using Levenshtein distance
 * Compares ASR transcript against provided script to detect bad takes
 */

export interface WERResult {
  wer: number                    // Word Error Rate (0-1, lower is better)
  totalEdits: number            // Total number of edits needed
  insertions: number            // Words added by ASR
  deletions: number             // Words missing in ASR  
  substitutions: number         // Words changed by ASR
  referenceWords: number        // Total words in reference script
  hypothesisWords: number       // Total words in ASR transcript
  alignment: WordAlignment[]    // Detailed word-by-word alignment
}

export interface WordAlignment {
  referenceWord: string | null  // Word from script (null for insertion)
  hypothesisWord: string | null // Word from ASR (null for deletion)
  operation: 'match' | 'substitution' | 'insertion' | 'deletion'
  confidence?: number           // ASR confidence if available
  timestamp?: number            // Time in audio
}

export interface SegmentWER {
  segment: number
  wer: number
  isBadTake: boolean           // WER above threshold indicates bad take
  alignment: WordAlignment[]
  recommendation: string
}

/**
 * Calculate Word Error Rate between reference script and ASR hypothesis
 * Uses Wagner-Fischer algorithm (dynamic programming) for edit distance
 */
export function calculateWER(
  reference: string[], 
  hypothesis: string[]
): WERResult {
  if (reference.length === 0) {
    return {
      wer: hypothesis.length > 0 ? 1.0 : 0.0,
      totalEdits: hypothesis.length,
      insertions: hypothesis.length,
      deletions: 0,
      substitutions: 0,
      referenceWords: 0,
      hypothesisWords: hypothesis.length,
      alignment: hypothesis.map(word => ({
        referenceWord: null,
        hypothesisWord: word,
        operation: 'insertion' as const
      }))
    }
  }

  // Preprocess words: normalize case and punctuation
  const refWords = reference.map(normalizeWord)
  const hypWords = hypothesis.map(normalizeWord)

  const refLen = refWords.length
  const hypLen = hypWords.length

  // Dynamic programming matrix for edit distance
  // dp[i][j] = minimum edits to transform ref[0...i-1] to hyp[0...j-1]
  const dp: number[][] = Array(refLen + 1).fill(null)
    .map(() => Array(hypLen + 1).fill(0))
  
  // Operation tracking for backtracking
  const ops: string[][] = Array(refLen + 1).fill(null)
    .map(() => Array(hypLen + 1).fill(''))

  // Initialize base cases
  for (let i = 0; i <= refLen; i++) {
    dp[i][0] = i  // i deletions
    ops[i][0] = 'D'
  }
  for (let j = 0; j <= hypLen; j++) {
    dp[0][j] = j  // j insertions
    ops[0][j] = 'I'
  }
  ops[0][0] = 'M'  // Match (base case)

  // Fill the DP table
  for (let i = 1; i <= refLen; i++) {
    for (let j = 1; j <= hypLen; j++) {
      const match = refWords[i-1] === hypWords[j-1] ? 0 : 1
      const costs = {
        substitution: dp[i-1][j-1] + match,
        insertion: dp[i][j-1] + 1,
        deletion: dp[i-1][j] + 1
      }

      const minCost = Math.min(costs.substitution, costs.insertion, costs.deletion)
      dp[i][j] = minCost

      // Track operation for backtracking
      if (minCost === costs.substitution) {
        ops[i][j] = match === 0 ? 'M' : 'S'  // Match or Substitution
      } else if (minCost === costs.insertion) {
        ops[i][j] = 'I'  // Insertion
      } else {
        ops[i][j] = 'D'  // Deletion
      }
    }
  }

  // Backtrack to get alignment and count operations
  const alignment: WordAlignment[] = []
  let insertions = 0, deletions = 0, substitutions = 0
  let i = refLen, j = hypLen

  while (i > 0 || j > 0) {
    const op = ops[i][j]
    
    switch (op) {
      case 'M':  // Match
        alignment.unshift({
          referenceWord: reference[i-1],
          hypothesisWord: hypothesis[j-1],
          operation: 'match'
        })
        i--; j--
        break
        
      case 'S':  // Substitution
        alignment.unshift({
          referenceWord: reference[i-1],
          hypothesisWord: hypothesis[j-1],
          operation: 'substitution'
        })
        substitutions++
        i--; j--
        break
        
      case 'I':  // Insertion
        alignment.unshift({
          referenceWord: null,
          hypothesisWord: hypothesis[j-1],
          operation: 'insertion'
        })
        insertions++
        j--
        break
        
      case 'D':  // Deletion
        alignment.unshift({
          referenceWord: reference[i-1],
          hypothesisWord: null,
          operation: 'deletion'
        })
        deletions++
        i--
        break
    }
  }

  const totalEdits = insertions + deletions + substitutions
  const wer = refLen > 0 ? totalEdits / refLen : 0

  return {
    wer,
    totalEdits,
    insertions,
    deletions,
    substitutions,
    referenceWords: refLen,
    hypothesisWords: hypLen,
    alignment
  }
}

/**
 * Calculate WER for transcript segments against script
 */
export function calculateSegmentWER(
  scriptSegments: Array<{ text: string; start?: number; end?: number }>,
  asrSegments: Array<{ 
    text: string
    start: number
    end: number
    words?: Array<{ word: string; start: number; end: number; confidence?: number }>
  }>,
  options: {
    badTakeThreshold?: number  // WER threshold for bad take (default: 0.3)
    alignmentWindow?: number   // Time window for segment alignment (default: 2.0s)
  } = {}
): SegmentWER[] {
  const badTakeThreshold = options.badTakeThreshold || 0.3
  const results: SegmentWER[] = []

  // Align script segments with ASR segments by timestamp or sequence
  const alignedPairs = alignSegments(scriptSegments, asrSegments, options.alignmentWindow)

  alignedPairs.forEach(({ scriptSeg, asrSeg, segmentIndex }) => {
    if (!scriptSeg || !asrSeg) {
      // Missing segment - likely indicates problems
      results.push({
        segment: segmentIndex,
        wer: 1.0,
        isBadTake: true,
        alignment: [],
        recommendation: "Missing segment - possible retake or technical issue"
      })
      return
    }

    const scriptWords = tokenizeWords(scriptSeg.text)
    const asrWords = tokenizeWords(asrSeg.text)
    
    const werResult = calculateWER(scriptWords, asrWords)
    const isBadTake = werResult.wer > badTakeThreshold

    // Add timing information to alignment
    if (asrSeg.words) {
      addTimingToAlignment(werResult.alignment, asrSeg.words)
    }

    // Generate recommendation
    let recommendation = ""
    if (isBadTake) {
      if (werResult.wer > 0.7) {
        recommendation = "Major errors - likely complete retake"
      } else if (werResult.wer > 0.5) {
        recommendation = "Significant errors - review for partial retake"
      } else {
        recommendation = "Moderate errors - minor corrections needed"
      }
    } else {
      recommendation = "Good take - minimal errors"
    }

    results.push({
      segment: segmentIndex,
      wer: werResult.wer,
      isBadTake,
      alignment: werResult.alignment,
      recommendation
    })
  })

  return results
}

/**
 * Normalize words for comparison (remove punctuation, lowercase)
 */
function normalizeWord(word: string): string {
  return word.toLowerCase()
    .replace(/[^\w\s'-]/g, '')  // Remove punctuation except hyphens and apostrophes
    .trim()
}

/**
 * Tokenize text into normalized words
 */
function tokenizeWords(text: string): string[] {
  return text.split(/\s+/)
    .map(normalizeWord)
    .filter(word => word.length > 0)
}

/**
 * Align script segments with ASR segments by timestamp
 */
function alignSegments(
  scriptSegments: Array<{ text: string; start?: number; end?: number }>,
  asrSegments: Array<{ text: string; start: number; end: number }>,
  alignmentWindow: number = 2.0
): Array<{ scriptSeg: any; asrSeg: any; segmentIndex: number }> {
  const alignedPairs: Array<{ scriptSeg: any; asrSeg: any; segmentIndex: number }> = []

  // If no timestamps in script, align by sequence
  if (!scriptSegments[0]?.start) {
    const maxSegments = Math.max(scriptSegments.length, asrSegments.length)
    for (let i = 0; i < maxSegments; i++) {
      alignedPairs.push({
        scriptSeg: scriptSegments[i] || null,
        asrSeg: asrSegments[i] || null,
        segmentIndex: i
      })
    }
    return alignedPairs
  }

  // Align by timestamp
  asrSegments.forEach((asrSeg, index) => {
    const matchingScript = scriptSegments.find(scriptSeg => {
      if (!scriptSeg.start) return false
      const timeDiff = Math.abs(asrSeg.start - scriptSeg.start)
      return timeDiff <= alignmentWindow
    })

    alignedPairs.push({
      scriptSeg: matchingScript || null,
      asrSeg,
      segmentIndex: index
    })
  })

  return alignedPairs
}

/**
 * Add timing information to word alignment
 */
function addTimingToAlignment(
  alignment: WordAlignment[],
  asrWords: Array<{ word: string; start: number; end: number; confidence?: number }>
) {
  let asrIndex = 0
  
  alignment.forEach(align => {
    if (align.hypothesisWord && asrIndex < asrWords.length) {
      const asrWord = asrWords[asrIndex]
      if (normalizeWord(align.hypothesisWord) === normalizeWord(asrWord.word)) {
        align.timestamp = asrWord.start
        align.confidence = asrWord.confidence
        asrIndex++
      }
    }
  })
}

/**
 * Analyze WER patterns to identify systematic issues
 */
export function analyzeWERPatterns(segmentResults: SegmentWER[]): {
  averageWER: number
  badTakeCount: number
  badTakePercentage: number
  commonErrors: Array<{ type: string; count: number; examples: string[] }>
  recommendations: string[]
} {
  if (segmentResults.length === 0) {
    return {
      averageWER: 0,
      badTakeCount: 0,
      badTakePercentage: 0,
      commonErrors: [],
      recommendations: []
    }
  }

  const averageWER = segmentResults.reduce((sum, result) => sum + result.wer, 0) / segmentResults.length
  const badTakes = segmentResults.filter(result => result.isBadTake)
  const badTakeCount = badTakes.length
  const badTakePercentage = badTakeCount / segmentResults.length

  // Analyze common error patterns
  const errorCounts = { substitution: 0, insertion: 0, deletion: 0 }
  const errorExamples: { [key: string]: string[] } = { substitution: [], insertion: [], deletion: [] }

  segmentResults.forEach(result => {
    result.alignment.forEach(align => {
      if (align.operation !== 'match') {
        errorCounts[align.operation as keyof typeof errorCounts]++
        
        const example = align.operation === 'substitution' 
          ? `"${align.referenceWord}" → "${align.hypothesisWord}"`
          : align.operation === 'insertion'
          ? `+${align.hypothesisWord}`
          : `-${align.referenceWord}`
          
        errorExamples[align.operation].push(example)
      }
    })
  })

  const commonErrors = Object.entries(errorCounts)
    .map(([type, count]) => ({
      type,
      count,
      examples: errorExamples[type].slice(0, 3) // Top 3 examples
    }))
    .sort((a, b) => b.count - a.count)

  // Generate recommendations
  const recommendations: string[] = []
  
  if (badTakePercentage > 0.5) {
    recommendations.push("High bad take rate - consider re-recording with better audio quality")
  } else if (badTakePercentage > 0.3) {
    recommendations.push("Moderate bad take rate - review script adherence")
  }
  
  if (averageWER > 0.4) {
    recommendations.push("High overall WER - check microphone placement and background noise")
  }

  if (commonErrors[0]?.type === 'substitution' && commonErrors[0].count > 5) {
    recommendations.push("Many word substitutions - possibly unclear pronunciation")
  }

  return {
    averageWER,
    badTakeCount,
    badTakePercentage,
    commonErrors,
    recommendations
  }
}

/**
 * Test function for development
 */
export function testWERCalculation() {
  // Test basic WER calculation
  const reference = ["the", "quick", "brown", "fox", "jumps"]
  const hypothesis = ["the", "quick", "red", "fox", "leaps"]
  
  const result = calculateWER(reference, hypothesis)
  console.log('WER Test Result:', result)
  console.log('Expected WER: 0.4 (2 errors out of 5 words)')
  
  // Test segment WER
  const scriptSegments = [
    { text: "Hello everyone, welcome to the show" },
    { text: "Today we are discussing artificial intelligence" }
  ]
  
  const asrSegments = [
    { text: "Hello everyone, welcome to this show", start: 0, end: 3 },
    { text: "Today we are discussing artificial intelligent", start: 3, end: 7 }
  ]
  
  const segmentResults = calculateSegmentWER(scriptSegments, asrSegments)
  console.log('Segment WER Results:', segmentResults)
}