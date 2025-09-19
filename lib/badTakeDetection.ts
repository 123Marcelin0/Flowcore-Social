/**
 * Unified Bad Take Detection Service
 * Combines FFmpeg silence detection, filler analysis, WER calculation, and ASR confidence analysis
 */

import { detectSilences, analyzeSilencePatterns, type SilenceRegion } from './detectSilences'
import { detectFillers, detectAdvancedFillers, type FillerAnalysis } from './fillerDetection'
import { calculateSegmentWER, analyzeWERPatterns, type SegmentWER } from './werCalculation'
import { analyzeASRConfidence, crossValidateASR, type ConfidenceAnalysis } from './asrConfidenceAnalysis'

export interface BadTakeDetectionResult {
  overallScore: number              // 0-1 (1 = perfect, 0 = complete retake needed)
  badTakeSegments: BadTakeSegment[]
  silenceAnalysis: ReturnType<typeof analyzeSilencePatterns>
  fillerAnalysis: FillerAnalysis
  werAnalysis?: ReturnType<typeof analyzeWERPatterns>
  confidenceAnalysis: ConfidenceAnalysis
  recommendations: string[]
  processingMetadata: {
    processingTimeMs: number
    methodsUsed: string[]
    confidence: number
  }
}

export interface BadTakeSegment {
  segment: number
  startTime: number
  endTime: number
  score: number                    // 0-1 (1 = perfect, 0 = bad take)
  issues: BadTakeIssue[]
  recommendation: 'keep' | 'review' | 'retake'
  reasoning: string
}

export interface BadTakeIssue {
  type: 'silence' | 'filler' | 'wer' | 'confidence' | 'fragment' | 'mispronunciation'
  severity: 'low' | 'medium' | 'high'
  description: string
  timestamp?: number
  evidence?: any
}

export interface BadTakeDetectionOptions {
  // File paths
  audioFilePath?: string
  
  // Script comparison
  scriptText?: string
  scriptSegments?: Array<{ text: string; start?: number; end?: number }>
  
  // Silence detection options
  silenceThreshold?: string        // Default: "-35dB"
  minSilenceDuration?: number      // Default: 0.6s
  
  // Filler detection options
  fillerSensitivity?: 'low' | 'medium' | 'high'
  customFillers?: string[]
  
  // WER options
  werBadTakeThreshold?: number     // Default: 0.3
  
  // Confidence options
  lowConfidenceThreshold?: number  // Default: 0.6
  
  // Overall scoring
  weights?: {
    silence: number
    filler: number
    wer: number
    confidence: number
  }
}

/**
 * Main bad take detection function - analyzes all aspects
 */
export async function detectBadTakes(
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
  options: BadTakeDetectionOptions = {}
): Promise<BadTakeDetectionResult> {
  const startTime = Date.now()
  const methodsUsed: string[] = []
  
  console.log('🔍 Starting comprehensive bad take detection...')
  
  // Default weights for scoring
  const weights = {
    silence: 0.2,
    filler: 0.3,
    wer: 0.3,
    confidence: 0.2,
    ...options.weights
  }
  
  const results: BadTakeDetectionResult = {
    overallScore: 0,
    badTakeSegments: [],
    silenceAnalysis: {
      totalSilenceTime: 0,
      silenceRatio: 0,
      avgSilenceDuration: 0,
      longSilences: [],
      suspiciousGaps: []
    },
    fillerAnalysis: {
      totalFillers: 0,
      fillerDensity: 0,
      segmentAnalysis: [],
      detections: [],
      recommendations: []
    },
    confidenceAnalysis: {
      overallConfidence: 0,
      lowConfidenceWords: [],
      suspiciousPatterns: [],
      mispronunciationCandidates: [],
      recommendations: [],
      segments: []
    },
    recommendations: [],
    processingMetadata: {
      processingTimeMs: 0,
      methodsUsed: [],
      confidence: 0
    }
  }
  
  try {
    // 1. Silence Analysis (if audio file provided)
    let silenceAnalysis = results.silenceAnalysis
    if (options.audioFilePath) {
      console.log('🔇 Analyzing silence patterns...')
      methodsUsed.push('silence_detection')
      
      const silenceRegions = await detectSilences(options.audioFilePath, {
        noiseThreshold: options.silenceThreshold,
        minDuration: options.minSilenceDuration
      })
      
      const totalDuration = segments[segments.length - 1]?.end || 0
      silenceAnalysis = analyzeSilencePatterns(silenceRegions, totalDuration)
      results.silenceAnalysis = silenceAnalysis
    }
    
    // 2. Filler Word Analysis
    console.log('📝 Analyzing filler words and hesitations...')
    methodsUsed.push('filler_detection')
    
    const fillerAnalysis = detectAdvancedFillers(segments, {
      customFillers: options.customFillers,
      sensitivityLevel: options.fillerSensitivity || 'medium'
    })
    results.fillerAnalysis = fillerAnalysis
    
    // 3. Word Error Rate Analysis (if script provided)
    let werAnalysis
    if (options.scriptText || options.scriptSegments) {
      console.log('📊 Calculating Word Error Rate against script...')
      methodsUsed.push('wer_calculation')
      
      const scriptSegments = options.scriptSegments || 
        [{ text: options.scriptText || '', start: 0, end: segments[segments.length - 1]?.end || 0 }]
      
      const werResults = calculateSegmentWER(scriptSegments, segments, {
        badTakeThreshold: options.werBadTakeThreshold
      })
      
      werAnalysis = analyzeWERPatterns(werResults)
      results.werAnalysis = werAnalysis
    }
    
    // 4. ASR Confidence Analysis
    console.log('🎯 Analyzing ASR confidence scores...')
    methodsUsed.push('confidence_analysis')
    
    const confidenceAnalysis = analyzeASRConfidence(segments, {
      lowConfidenceThreshold: options.lowConfidenceThreshold,
      scriptWords: options.scriptText?.split(/\s+/) || []
    })
    results.confidenceAnalysis = confidenceAnalysis
    
    // 5. Combine analyses into segment-level bad take detection
    console.log('🔬 Combining analyses for segment scoring...')
    const badTakeSegments = analyzeSegments({
      segments,
      silenceAnalysis,
      fillerAnalysis,
      werAnalysis,
      confidenceAnalysis,
      weights
    })
    results.badTakeSegments = badTakeSegments
    
    // 6. Calculate overall score
    const overallScore = calculateOverallScore(badTakeSegments, {
      silenceAnalysis,
      fillerAnalysis,
      werAnalysis,
      confidenceAnalysis,
      weights
    })
    results.overallScore = overallScore
    
    // 7. Generate recommendations
    results.recommendations = generateBadTakeRecommendations({
      overallScore,
      badTakeSegments,
      silenceAnalysis,
      fillerAnalysis,
      werAnalysis,
      confidenceAnalysis
    })
    
    const processingTime = Date.now() - startTime
    results.processingMetadata = {
      processingTimeMs: processingTime,
      methodsUsed,
      confidence: calculateDetectionConfidence(methodsUsed, overallScore)
    }
    
    console.log(`✅ Bad take detection completed in ${processingTime}ms`)
    console.log(`📈 Overall score: ${(overallScore * 100).toFixed(1)}%`)
    console.log(`🎯 ${badTakeSegments.filter(s => s.recommendation === 'retake').length} segments need retakes`)
    
    return results
    
  } catch (error: any) {
    console.error('❌ Bad take detection failed:', error)
    
    // Return partial results with error information
    results.recommendations = [`Analysis failed: ${error.message}`]
    results.processingMetadata = {
      processingTimeMs: Date.now() - startTime,
      methodsUsed,
      confidence: 0
    }
    
    return results
  }
}

/**
 * Analyze individual segments and combine all detection methods
 */
function analyzeSegments(data: {
  segments: Array<{ text: string; start: number; end: number; confidence?: number }>
  silenceAnalysis: ReturnType<typeof analyzeSilencePatterns>
  fillerAnalysis: FillerAnalysis
  werAnalysis?: ReturnType<typeof analyzeWERPatterns>
  confidenceAnalysis: ConfidenceAnalysis
  weights: { silence: number; filler: number; wer: number; confidence: number }
}): BadTakeSegment[] {
  
  return data.segments.map((segment, index) => {
    const issues: BadTakeIssue[] = []
    let scores = { silence: 1.0, filler: 1.0, wer: 1.0, confidence: 1.0 }
    
    // Analyze silence issues
    const segmentSilences = data.silenceAnalysis.longSilences.filter(
      silence => silence.start >= segment.start && silence.end <= segment.end
    )
    if (segmentSilences.length > 0) {
      scores.silence = Math.max(0, 1 - (segmentSilences.length * 0.3))
      issues.push({
        type: 'silence',
        severity: segmentSilences.length > 2 ? 'high' : 'medium',
        description: `${segmentSilences.length} long silence(s) detected`,
        evidence: segmentSilences
      })
    }
    
    // Analyze filler issues
    const segmentFillers = data.fillerAnalysis.segmentAnalysis[index]
    if (segmentFillers && segmentFillers.hasExcessiveFillers) {
      scores.filler = Math.max(0, 1 - segmentFillers.density)
      issues.push({
        type: 'filler',
        severity: segmentFillers.density > 1.0 ? 'high' : 'medium',
        description: `High filler density: ${segmentFillers.fillerCount} fillers`,
        evidence: segmentFillers
      })
    }
    
    // Analyze WER issues
    if (data.werAnalysis) {
      const werScore = 1.0 // Would need segment-specific WER data
      scores.wer = werScore
    }
    
    // Analyze confidence issues
    const segmentConfidence = data.confidenceAnalysis.segments[index]
    if (segmentConfidence && segmentConfidence.isLowConfidence) {
      scores.confidence = segmentConfidence.averageConfidence
      issues.push({
        type: 'confidence',
        severity: segmentConfidence.averageConfidence < 0.4 ? 'high' : 'medium',
        description: `Low confidence: ${(segmentConfidence.averageConfidence * 100).toFixed(1)}%`,
        evidence: segmentConfidence
      })
    }
    
    // Calculate weighted score
    const weightedScore = (
      scores.silence * data.weights.silence +
      scores.filler * data.weights.filler +
      scores.wer * data.weights.wer +
      scores.confidence * data.weights.confidence
    )
    
    // Determine recommendation
    let recommendation: 'keep' | 'review' | 'retake' = 'keep'
    let reasoning = 'Good quality segment'
    
    if (weightedScore < 0.4) {
      recommendation = 'retake'
      reasoning = 'Multiple serious issues detected'
    } else if (weightedScore < 0.7) {
      recommendation = 'review'
      reasoning = 'Some issues detected - review recommended'
    }
    
    return {
      segment: index,
      startTime: segment.start,
      endTime: segment.end,
      score: weightedScore,
      issues,
      recommendation,
      reasoning
    }
  })
}

/**
 * Calculate overall quality score
 */
function calculateOverallScore(
  badTakeSegments: BadTakeSegment[],
  analyses: any
): number {
  if (badTakeSegments.length === 0) return 0
  
  // Average segment scores
  const avgSegmentScore = badTakeSegments.reduce((sum, seg) => sum + seg.score, 0) / badTakeSegments.length
  
  // Apply penalties for global issues
  let penalties = 0
  
  if (analyses.fillerAnalysis.fillerDensity > 1.0) penalties += 0.1
  if (analyses.confidenceAnalysis.overallConfidence < 0.6) penalties += 0.1
  if (analyses.werAnalysis && analyses.werAnalysis.averageWER > 0.4) penalties += 0.15
  
  return Math.max(0, avgSegmentScore - penalties)
}

/**
 * Generate comprehensive recommendations
 */
function generateBadTakeRecommendations(data: {
  overallScore: number
  badTakeSegments: BadTakeSegment[]
  silenceAnalysis: any
  fillerAnalysis: any
  werAnalysis?: any
  confidenceAnalysis: any
}): string[] {
  const recommendations: string[] = []
  
  const retakeSegments = data.badTakeSegments.filter(s => s.recommendation === 'retake').length
  const reviewSegments = data.badTakeSegments.filter(s => s.recommendation === 'review').length
  
  if (data.overallScore > 0.8) {
    recommendations.push("✅ Excellent recording quality - minimal editing needed")
  } else if (data.overallScore > 0.6) {
    recommendations.push("👍 Good recording quality - minor touch-ups recommended")
  } else if (data.overallScore > 0.4) {
    recommendations.push("⚠️ Moderate issues detected - significant editing required")
  } else {
    recommendations.push("❌ Major issues detected - consider re-recording")
  }
  
  if (retakeSegments > 0) {
    recommendations.push(`🔄 ${retakeSegments} segments need complete retakes`)
  }
  
  if (reviewSegments > 0) {
    recommendations.push(`👀 ${reviewSegments} segments need review and possible editing`)
  }
  
  // Add specific issue recommendations
  if (data.fillerAnalysis.fillerDensity > 1.0) {
    recommendations.push("🗣️ High filler word usage - practice speaking more deliberately")
  }
  
  if (data.silenceAnalysis.suspiciousGaps.length > 0) {
    recommendations.push("⏸️ Long pauses detected - may indicate uncertainty or technical issues")
  }
  
  if (data.confidenceAnalysis.overallConfidence < 0.6) {
    recommendations.push("🎤 Low ASR confidence - check audio quality and microphone setup")
  }
  
  if (data.werAnalysis && data.werAnalysis.averageWER > 0.3) {
    recommendations.push("📝 High word error rate - review script adherence and pronunciation")
  }
  
  return recommendations
}

/**
 * Calculate confidence in the detection results
 */
function calculateDetectionConfidence(methods: string[], overallScore: number): number {
  const methodWeights: { [key: string]: number } = {
    'silence_detection': 0.2,
    'filler_detection': 0.3,
    'wer_calculation': 0.3,
    'confidence_analysis': 0.2
  }
  
  const methodScore = methods.reduce((sum, method) => sum + (methodWeights[method] || 0), 0)
  return Math.min(1.0, methodScore + (overallScore * 0.2))
}