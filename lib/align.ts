import { supabase, supabaseAdmin } from './supabase'
import { generateEmbedding } from './openaiService'
import OpenAI from 'openai'
import { 
  Word, 
  Segment, 
  Transcript, 
  Pause, 
  KeepSegment, 
  KeepReason,
  DecisionPolicy,
  DecisionInput,
  DecisionOutput,
  PipelineConfig,
  PipelineResult,
  VideoProcessingOptions,
  DEFAULT_DECISION_POLICY
} from './types'
import { AudioSegmenter, processAudioSegments } from './segmenter'
import { makeEditingDecision } from './decide'
import { generateSubtitlesFromScript, formatSRTTime } from './subtitle-utils'

export interface ASRWord {
  word: string
  start: number
  end: number
}

export interface ASRSegment {
  start: number
  end: number
  text: string
  confidence?: number
  embedding?: number[] | null
  words?: ASRWord[]
}

export interface AlignmentItem {
  sentence: string
  matchedSegment: ASRSegment | null
  score: number
  start_ms: number | null
  end_ms: number | null
  strength: 'strong' | 'weak' | 'none'
}

export interface SelectedShot {
  start_ms: number
  end_ms: number
  transcript: string
  match_score: number
}

export interface VideoSegment {
  start_ms: number
  end_ms: number
  transcript: string
  match_score: number
  keep: boolean // true if this segment should be kept in the clean video
}

export interface PauseSegment {
  start_ms: number
  end_ms: number
  duration_ms: number
  type: 'silence' | 'filler' | 'hesitation' | 'long_pause'
  confidence: number
}

export interface EditingDecision {
  keepSegments: Array<{
    start_ms: number
    end_ms: number
    transcript: string
    confidence: number
    reason: string
  }>
  pauseList: PauseSegment[]
  editingStats: {
    totalDuration_ms: number
    keepDuration_ms: number
    removedDuration_ms: number
    reductionPercentage: number
    segmentsAnalyzed: number
    segmentsKept: number
    segmentsRemoved: number
    averageConfidence: number
  }
  metadata: {
    analysisTimestamp: string
    hasScript: boolean
    scriptLength: number
    transcriptLength: number
    llmModel: string
    decisionCriteria: string[]
  }
}

export interface AlignmentResult {
  mapping: AlignmentItem[]
  selectedShots: SelectedShot[]
  videoSegments?: VideoSegment[] // For video editing
  editingDecision?: EditingDecision // New LLM-based decision output
  editingStats?: {
    totalDuration_ms: number
    keepDuration_ms: number
    removedDuration_ms: number
    reductionPercentage: number
  }
}

export function cosineSimilarity(a: number[], b: number[]) {
  let dot = 0,
    na = 0,
    nb = 0
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-10)
}

export function splitSentences(text: string) {
  return text
    .split(/\n+|(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/**
 * Micro-segmentation: Groups words into segments with intelligent breaks
 * - Max 2 seconds long
 * - Ends early if there's punctuation (.,?!:) or pause >600ms
 * 
 * @param transcriptWords Array of words with timestamps
 * @returns Array of micro-segments with text, start, end
 */
export interface MicroSegment {
  text: string
  start: number
  end: number
}

export function segmentTranscript(transcriptWords: Array<{ text: string; start: number; end: number }>): MicroSegment[] {
  if (!transcriptWords || transcriptWords.length === 0) {
    return []
  }

  const segments: MicroSegment[] = []
  let currentSegment: {
    words: typeof transcriptWords
    text: string
    start: number
    end: number
  } | null = null

  const MAX_SEGMENT_DURATION = 2.0 // 2 seconds max
  const PAUSE_THRESHOLD = 0.6 // 600ms pause threshold
  const PUNCTUATION_REGEX = /[.,?!:…]$/

  for (let i = 0; i < transcriptWords.length; i++) {
    const word = transcriptWords[i]
    const nextWord = transcriptWords[i + 1]
    
    // Start a new segment if needed
    if (!currentSegment) {
      currentSegment = {
        words: [word],
        text: word.text,
        start: word.start,
        end: word.end
      }
      continue
    }

    // Add word to current segment
    currentSegment.words.push(word)
    currentSegment.text += ' ' + word.text
    currentSegment.end = word.end

    // Check if we should end this segment
    let shouldEndSegment = false
    
    // 1. Check duration limit (2 seconds)
    const segmentDuration = currentSegment.end - currentSegment.start
    if (segmentDuration >= MAX_SEGMENT_DURATION) {
      shouldEndSegment = true
    }
    
    // 2. Check for punctuation at end of word
    if (PUNCTUATION_REGEX.test(word.text.trim())) {
      shouldEndSegment = true
    }
    
    // 3. Check for pause >600ms to next word
    if (nextWord) {
      const pauseDuration = nextWord.start - word.end
      if (pauseDuration >= PAUSE_THRESHOLD) {
        shouldEndSegment = true
      }
    }
    
    // 4. Always end at last word
    if (i === transcriptWords.length - 1) {
      shouldEndSegment = true
    }

    // End segment if criteria met
    if (shouldEndSegment) {
      segments.push({
        text: currentSegment.text.trim(),
        start: parseFloat(currentSegment.start.toFixed(3)),
        end: parseFloat(currentSegment.end.toFixed(3))
      })
      currentSegment = null
    }
  }

  // Handle any remaining segment (shouldn't happen with logic above, but safety)
  if (currentSegment) {
    segments.push({
      text: currentSegment.text.trim(),
      start: parseFloat(currentSegment.start.toFixed(3)),
      end: parseFloat(currentSegment.end.toFixed(3))
    })
  }

  return segments
}

function endsWithStrongPunctuation(text: string): boolean {
  const t = (text || '').trim()
  if (!t) return false
  const ch = t[t.length - 1]
  return ch === '.' || ch === '!' || ch === '?' || ch === '…'
}

function normalizeForFuzzy(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
}

function levenshtein(a: string, b: string): number {
  const m = a.length,
    n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      )
    }
  }
  return dp[m][n]
}

function fuzzySimilarity(a: string, b: string): number {
  const na = normalizeForFuzzy(a)
  const nb = normalizeForFuzzy(b)
  if (!na || !nb) return 0
  const dist = levenshtein(na, nb)
  const maxLen = Math.max(na.length, nb.length)
  return maxLen === 0 ? 0 : 1 - dist / maxLen
}

async function embed(text: string): Promise<number[] | null> {
  try {
    return await generateEmbedding(text)
  } catch {
    return null
  }
}

function getOpenAI(): OpenAI | null {
  const apiKeyRaw = process.env.OPENAI_API_KEY
  if (!apiKeyRaw) return null
  const apiKey = apiKeyRaw.trim().replace(/^["']|["']$/g, '')
  return new OpenAI({ 
    apiKey,
    organization: process.env.OPENAI_ORG_ID || undefined,
    project: process.env.OPENAI_PROJECT_ID || undefined,
  })
}

/**
 * Enhanced LLM analysis using micro-segments
 * Provides detailed keep/drop decisions for each micro-segment
 */
export interface MicroSegmentDecision {
  keep: boolean
  start: number
  end: number
  text: string
  reason?: string
}

export interface MicroSegmentAnalysisResult {
  decisions: MicroSegmentDecision[]
  stats: {
    totalSegments: number
    keptSegments: number
    droppedSegments: number
    reductionPercentage: number
    totalDuration: number
    keptDuration: number
  }
  metadata: {
    timestamp: string
    model: string
    hasScript: boolean
    processingTime_ms: number
  }
}

/**
 * Analyze micro-segments with LLM for professional editing decisions
 */
async function analyzeMicroSegmentsWithLLM(
  microSegments: MicroSegment[],
  scriptText?: string
): Promise<MicroSegmentAnalysisResult> {
  const startTime = Date.now()
  console.log('🎬 Analyzing micro-segments with LLM...')
  console.log(`📊 Input: ${microSegments.length} micro-segments`)
  
  const openai = getOpenAI()
  if (!openai) {
    throw new Error('OpenAI API key not configured')
  }
  
  // Prepare micro-segments for LLM analysis
  const segmentData = microSegments.map((segment, index) => ({
    id: index + 1,
    start: segment.start,
    end: segment.end,
    text: segment.text,
    duration: segment.end - segment.start
  }))
  
  // Construct LLM prompt for micro-segment analysis
  const systemPrompt = `You are a professional video editor specializing in speaker-to-camera content.

Your task: Analyze micro-segments and decide which to keep or drop for a clean, fluent final video.

EDITING PRINCIPLES:
- Keep fluent, complete sentences and natural speech
- Drop fillers ("um", "ah", "uh", stutters, false starts)
- Drop abandoned sentences or incomplete thoughts
- If content is repeated, keep the FINAL, most complete version
- Keep small natural pauses (<500ms), aggressively cut longer pauses
- Maintain the speaker's natural flow and meaning
- Preserve the speaker's authentic voice and style

OUTPUT FORMAT: Respond with valid JSON only:
{
  "decisions": [
    { "keep": true, "start": 1.2, "end": 2.1, "text": "Hello world", "reason": "fluent_complete" },
    { "keep": false, "start": 2.7, "end": 3.5, "text": "Um...", "reason": "filler_word" }
  ]
}

REASON CODES:
- "fluent_complete": Complete, fluent sentence/phrase
- "filler_word": Contains filler words (um, ah, uh)
- "false_start": Abandoned or incomplete sentence
- "repetition_early": Earlier version of repeated content
- "repetition_final": Final/best version of repeated content
- "long_pause": Excessive pause or silence
- "incomplete_thought": Unfinished idea or sentence
- "natural_speech": Natural, conversational content to keep

Use exact timestamps from input. Do not modify timing.`

  const userPrompt = `MICRO-SEGMENTS TO ANALYZE:
${segmentData.map(seg => 
  `[${seg.id}] ${seg.start}s-${seg.end}s (${seg.duration.toFixed(1)}s): "${seg.text}"`
).join('\n')}

${scriptText ? `\nORIGINAL SCRIPT REFERENCE:\n"${scriptText}"\n` : ''}

TASK: Analyze each segment and provide keep/drop decisions with reasons.
Focus on creating the cleanest, most professional final video while preserving the speaker's authentic message.`

  try {
    console.log('🤖 Sending micro-segments to LLM for analysis...')
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      // For GPT-5 compatibility, avoid unsupported params in this path
      max_completion_tokens: 4000,
      response_format: { type: 'json_object' }
    })
    
    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error('No response from LLM')
    }
    
    console.log('✅ LLM response received, parsing decisions...')
    
    // Parse JSON response
    let parsedResponse: { decisions: MicroSegmentDecision[] }
    try {
      // Strip markdown code blocks if present
      const cleanedResponse = response.replace(/```json\n?|\n?```/g, '').trim()
      parsedResponse = JSON.parse(cleanedResponse)
    } catch (parseError) {
      throw new Error(`Failed to parse LLM response: ${parseError}`)
    }
    
    // Validate response format
    if (!parsedResponse.decisions || !Array.isArray(parsedResponse.decisions)) {
      throw new Error('Invalid response format: missing decisions array')
    }
    
    // Ensure all decisions have required fields
    const validatedDecisions = parsedResponse.decisions.map((decision, index) => {
      const originalSegment = microSegments[index]
      return {
        keep: Boolean(decision.keep),
        start: decision.start || originalSegment.start,
        end: decision.end || originalSegment.end,
        text: decision.text || originalSegment.text,
        reason: decision.reason || (decision.keep ? 'fluent_complete' : 'unknown')
      }
    })
    
    // Calculate statistics
    const keptDecisions = validatedDecisions.filter(d => d.keep)
    const totalDuration = microSegments.reduce((sum, seg) => sum + (seg.end - seg.start), 0)
    const keptDuration = keptDecisions.reduce((sum, decision) => sum + (decision.end - decision.start), 0)
    
    const result: MicroSegmentAnalysisResult = {
      decisions: validatedDecisions,
      stats: {
        totalSegments: microSegments.length,
        keptSegments: keptDecisions.length,
        droppedSegments: microSegments.length - keptDecisions.length,
        reductionPercentage: ((totalDuration - keptDuration) / totalDuration) * 100,
        totalDuration,
        keptDuration
      },
      metadata: {
        timestamp: new Date().toISOString(),
        model: 'gpt-4o',
        hasScript: !!scriptText,
        processingTime_ms: Date.now() - startTime
      }
    }
    
    console.log('✅ Micro-segment analysis completed:')
    console.log(`📊 Decisions: ${result.stats.keptSegments}/${result.stats.totalSegments} segments kept`)
    console.log(`📊 Reduction: ${result.stats.reductionPercentage.toFixed(1)}%`)
    console.log(`📊 Duration: ${result.stats.keptDuration.toFixed(1)}s / ${result.stats.totalDuration.toFixed(1)}s`)
    
    // Log decision breakdown
    const reasonCounts = validatedDecisions.reduce((counts, decision) => {
      const reason = decision.reason || 'unknown'
      counts[reason] = (counts[reason] || 0) + 1
      return counts
    }, {} as Record<string, number>)
    
    console.log('📊 Decision breakdown:')
    Object.entries(reasonCounts).forEach(([reason, count]) => {
      console.log(`   ${reason}: ${count}`)
    })
    
    return result
    
  } catch (error) {
    console.error('❌ Micro-segment LLM analysis failed:', error)
    
    // Fallback: keep all segments but mark analysis as failed
    const fallbackResult: MicroSegmentAnalysisResult = {
      decisions: microSegments.map(segment => ({
        keep: true,
        start: segment.start,
        end: segment.end,
        text: segment.text,
        reason: 'fallback_keep'
      })),
      stats: {
        totalSegments: microSegments.length,
        keptSegments: microSegments.length,
        droppedSegments: 0,
        reductionPercentage: 0,
        totalDuration: microSegments.reduce((sum, seg) => sum + (seg.end - seg.start), 0),
        keptDuration: microSegments.reduce((sum, seg) => sum + (seg.end - seg.start), 0)
      },
      metadata: {
        timestamp: new Date().toISOString(),
        model: 'fallback',
        hasScript: !!scriptText,
        processingTime_ms: Date.now() - startTime
      }
    }
    
    return fallbackResult
  }
}

/**
 * Enhanced LLM analysis using the new decide.ts engine
 * Replaces brittle alignment logic with professional dialogue editing
 */
async function analyzeSegmentsWithLLM(
  segments: ASRSegment[],
  scriptText?: string,
  debugOutputDir?: string
): Promise<EditingDecision> {
  console.log('🎬 Using enhanced micro-segment LLM analysis...')
  
  // Convert ASR segments to words for micro-segmentation
  const allWords: Array<{ text: string; start: number; end: number }> = []
  
  segments.forEach(segment => {
    if (segment.words && segment.words.length > 0) {
      segment.words.forEach(word => {
        allWords.push({
          text: word.word,
          start: word.start,
          end: word.end
        })
      })
    } else {
      // Fallback: treat entire segment as single word
      allWords.push({
        text: segment.text,
        start: segment.start,
        end: segment.end
      })
    }
  })
  
  // Create micro-segments from words
  const segmentationStart = Date.now()
  const microSegments = segmentTranscript(allWords)
  const segmentationEnd = Date.now()
  console.log(`📊 Created ${microSegments.length} micro-segments from ${segments.length} ASR segments`)
  
  // Save micro-segments for debugging
  if (debugOutputDir) {
    const microSegmentsPath = `${debugOutputDir}/micro_segments.json`
    const microSegmentsDebugData = {
      micro_segments: microSegments,
      metadata: {
        total_microsegments: microSegments.length,
        total_original_segments: segments.length,
        total_words: allWords.length,
        segmentation_time_ms: segmentationEnd - segmentationStart,
        avg_microsegment_duration: microSegments.reduce((sum, seg) => sum + (seg.end - seg.start), 0) / microSegments.length,
        longest_microsegment: Math.max(...microSegments.map(seg => seg.end - seg.start)),
        shortest_microsegment: Math.min(...microSegments.map(seg => seg.end - seg.start))
      }
    }
    await require('fs').promises.writeFile(microSegmentsPath, JSON.stringify(microSegmentsDebugData, null, 2))
    console.log(`🐛 Debug: Micro-segments saved to ${microSegmentsPath}`)
  }
  
  try {
    // Analyze micro-segments with enhanced LLM
    const llmStart = Date.now()
    const analysisResult = await analyzeMicroSegmentsWithLLM(microSegments, scriptText)
    const llmEnd = Date.now()
    
    // Save LLM decisions for debugging
    if (debugOutputDir) {
      const llmDecisionsPath = `${debugOutputDir}/llm_decisions.json`
      const llmDecisionsDebugData = {
        analysis_result: analysisResult,
        metadata: {
          llm_processing_time_ms: llmEnd - llmStart,
          total_decisions: analysisResult.decisions.length,
          keep_decisions: analysisResult.decisions.filter(d => d.keep).length,
          drop_decisions: analysisResult.decisions.filter(d => !d.keep).length,
          decision_reasons: Object.fromEntries(
            Object.entries(
              analysisResult.decisions.reduce((acc: Record<string, number>, decision) => {
                acc[decision.reason || 'unknown'] = (acc[decision.reason || 'unknown'] || 0) + 1
                return acc
              }, {})
            ).sort(([,a], [,b]) => (b as number) - (a as number))
          )
        }
      }
      await require('fs').promises.writeFile(llmDecisionsPath, JSON.stringify(llmDecisionsDebugData, null, 2))
      console.log(`🐛 Debug: LLM decisions saved to ${llmDecisionsPath}`)
    }
    
    // Convert micro-segment decisions to legacy EditingDecision format
    const keptDecisions = analysisResult.decisions.filter(d => d.keep)
    
    const editingDecision: EditingDecision = {
      keepSegments: keptDecisions.map((decision) => ({
        start_ms: decision.start * 1000,
        end_ms: decision.end * 1000,
        transcript: decision.text,
        confidence: 0.9,
        reason: decision.reason as any,
        reasonDetails: getReasonDetails(decision.reason)
      })),
      
      pauseList: [], // Micro-segments handle pauses internally
      
      editingStats: {
        totalDuration_ms: analysisResult.stats.totalDuration * 1000,
        keepDuration_ms: analysisResult.stats.keptDuration * 1000,
        removedDuration_ms: (analysisResult.stats.totalDuration - analysisResult.stats.keptDuration) * 1000,
        reductionPercentage: analysisResult.stats.reductionPercentage,
        segmentsAnalyzed: analysisResult.stats.totalSegments,
        segmentsKept: analysisResult.stats.keptSegments,
        segmentsRemoved: analysisResult.stats.droppedSegments,
        averageConfidence: 0.9
      },
      
      metadata: {
        analysisTimestamp: analysisResult.metadata.timestamp,
        hasScript: analysisResult.metadata.hasScript,
        scriptLength: scriptText?.length || 0,
        transcriptLength: microSegments.reduce((sum, seg) => sum + seg.text.length, 0),
        llmModel: analysisResult.metadata.model,
        decisionCriteria: [
          'Micro-segment analysis',
          'Keep fluent complete sentences',
          'Drop fillers and false starts',
          'Prefer final takes',
          'Natural pause handling'
        ]
      }
    }
    
    console.log('✅ Enhanced micro-segment LLM analysis completed:', {
      segmentsKept: analysisResult.stats.keptSegments,
      reductionPercentage: `${analysisResult.stats.reductionPercentage.toFixed(1)}%`,
      processingTime: `${analysisResult.metadata.processingTime_ms}ms`,
      model: analysisResult.metadata.model
    })
    
    return editingDecision
    
  } catch (error) {
    console.error('❌ Enhanced micro-segment LLM analysis failed:', error)
    
    // Fallback to basic analysis if LLM fails
    return fallbackAnalysis(segments, scriptText)
  }
}

/**
 * Get detailed reason description for micro-segment decisions
 */
function getReasonDetails(reason?: string): string {
  switch (reason) {
    case 'fluent_complete':
      return 'Complete, fluent sentence or phrase'
    case 'filler_word':
      return 'Contains filler words (um, ah, uh)'
    case 'false_start':
      return 'Abandoned or incomplete sentence'
    case 'repetition_early':
      return 'Earlier version of repeated content'
    case 'repetition_final':
      return 'Final/best version of repeated content'
    case 'long_pause':
      return 'Excessive pause or silence'
    case 'incomplete_thought':
      return 'Unfinished idea or sentence'
    case 'natural_speech':
      return 'Natural, conversational content'
    case 'fallback_keep':
      return 'Kept due to analysis fallback'
    default:
      return reason || 'Unknown reason'
  }
}

/**
 * Fallback analysis when LLM decision engine fails
 */
function fallbackAnalysis(segments: ASRSegment[], scriptText?: string): EditingDecision {
  console.log('🔄 Using fallback analysis...')
  
  // Simple fallback: keep high-confidence segments without obvious filler
  const keepSegments = segments
    .filter(segment => {
      const confidence = segment.confidence || 0.8
      const hasFillerWords = /\b(um|uh|er|ah|like|you know)\b/i.test(segment.text)
      return confidence >= 0.7 && !hasFillerWords
    })
    .map((segment, index) => ({
      start_ms: Math.round(segment.start * 1000),
      end_ms: Math.round(segment.end * 1000),
      transcript: segment.text,
      confidence: segment.confidence || 0.8,
      reason: 'fallback_keep' as const,
      reasonDetails: 'Fallback decision - LLM analysis unavailable',
      originalSegmentIndex: index
    }))
  
  const totalDuration_ms = segments.reduce((sum, s) => sum + ((s.end - s.start) * 1000), 0)
  const keepDuration_ms = keepSegments.reduce((sum, s) => sum + (s.end_ms - s.start_ms), 0)
  
  return {
    keepSegments,
    pauseList: [], // No pause analysis in fallback
    editingStats: {
      totalDuration_ms,
      keepDuration_ms,
      removedDuration_ms: totalDuration_ms - keepDuration_ms,
      reductionPercentage: ((totalDuration_ms - keepDuration_ms) / totalDuration_ms) * 100,
      segmentsAnalyzed: segments.length,
      segmentsKept: keepSegments.length,
      segmentsRemoved: segments.length - keepSegments.length,
      averageConfidence: keepSegments.reduce((sum, s) => sum + s.confidence, 0) / (keepSegments.length || 1)
    },
    metadata: {
      analysisTimestamp: new Date().toISOString(),
      hasScript: !!scriptText,
      scriptLength: scriptText?.length || 0,
      transcriptLength: segments.reduce((sum, s) => sum + s.text.length, 0),
      llmModel: 'fallback',
      decisionCriteria: ['basic_confidence_filtering', 'simple_filler_removal']
    }
  }
}

/**
 * Generate EDL (Edit Decision List) from editing decision
 */
function generateEDL(editingDecision: EditingDecision, originalVideoName: string = 'SOURCE'): string {
  let edl = `TITLE: Clean Video Edit\n`
  edl += `FCM: NON-DROP FRAME\n\n`

  editingDecision.keepSegments.forEach((segment, index) => {
    const editNumber = (index + 1).toString().padStart(3, '0')
    const sourceIn = formatTimecode(segment.start_ms)
    const sourceOut = formatTimecode(segment.end_ms)
    
    // Timeline position (accumulated time in final video)
    const timelineIn = index === 0 ? '01:00:00:00' : formatTimecode(
      editingDecision.keepSegments.slice(0, index).reduce((sum, s) => sum + (s.end_ms - s.start_ms), 0)
    )
    const timelineOut = formatTimecode(
      editingDecision.keepSegments.slice(0, index + 1).reduce((sum, s) => sum + (s.end_ms - s.start_ms), 0)
    )

    edl += `${editNumber}  ${originalVideoName}       V     C        ${sourceIn} ${sourceOut} ${timelineIn} ${timelineOut}\n`
    edl += `* COMMENT: ${segment.reason}\n`
    edl += `* TRANSCRIPT: ${segment.transcript.substring(0, 80)}${segment.transcript.length > 80 ? '...' : ''}\n\n`
  })

  return edl
}

/**
 * Generate SRT subtitle file from editing decision (enhanced version)
 * Uses the new subtitles.ts engine for clean cue generation
 */
function generateSRT(editingDecision: EditingDecision): string {
  console.log('📝 Generating SRT with enhanced subtitle engine...')
  
  // Convert EditingDecision keepSegments to KeepSegment format for the subtitle engine
  const keepSegments = editingDecision.keepSegments.map((segment, index) => ({
    start_ms: segment.start_ms,
    end_ms: segment.end_ms,
    transcript: segment.transcript,
    confidence: segment.confidence,
    reason: segment.reason as any, // Convert string to KeepReason enum
    reasonDetails: `Generated from editing decision`,
    originalSegmentIndex: index
  }))
  
  // Use simplified subtitle generation from video-editor.ts
  const videoSegments = keepSegments.map(seg => ({
    start_ms: seg.start_ms,
    end_ms: seg.end_ms,
    keep: true
  }))
  
  const scriptText = keepSegments.map(seg => seg.transcript).join(' ')
  const subtitleSegments = generateSubtitlesFromScript(videoSegments, scriptText)
  
  // Convert to SRT format
  
  return subtitleSegments.map((subtitle, index) => {
    const startTime = formatSRTTime(subtitle.start_ms)
    const endTime = formatSRTTime(subtitle.end_ms)
    return `${index + 1}\n${startTime} --> ${endTime}\n${subtitle.text}\n`
  }).join('\n')
}

/**
 * Legacy SRT generation (fallback)
 */
function generateSRTLegacy(editingDecision: EditingDecision): string {
  let srt = ''
  let accumulatedTime = 0

  editingDecision.keepSegments.forEach((segment, index) => {
    const startTime = accumulatedTime
    const endTime = accumulatedTime + (segment.end_ms - segment.start_ms)
    
    srt += `${index + 1}\n`
    srt += `${formatSRTTimecode(startTime)} --> ${formatSRTTimecode(endTime)}\n`
    srt += `${segment.transcript}\n\n`
    
    accumulatedTime = endTime
  })

  return srt
}

/**
 * Format milliseconds to EDL timecode (HH:MM:SS:FF at 30fps)
 */
function formatTimecode(ms: number): string {
  const totalFrames = Math.floor(ms / 1000 * 30) // Assuming 30fps
  const frames = totalFrames % 30
  const seconds = Math.floor(totalFrames / 30) % 60
  const minutes = Math.floor(totalFrames / (30 * 60)) % 60
  const hours = Math.floor(totalFrames / (30 * 60 * 60))
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`
}

/**
 * Format milliseconds to SRT timecode (HH:MM:SS,mmm)
 */
function formatSRTTimecode(ms: number): string {
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  const milliseconds = ms % 1000
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`
}

export async function alignScriptToAsr(params: {
  uploadId: string
  scriptText: string
  bufferMs?: number
  mergeGapMs?: number
  strongThreshold?: number
  weakThreshold?: number
  createVideoSegments?: boolean // New parameter to enable video segmentation
}): Promise<AlignmentResult> {
  const {
    uploadId,
    scriptText,
    bufferMs = parseInt(process.env.ALIGN_BUFFER_MS || '100', 10), // Much smaller buffer for tighter cuts
    mergeGapMs = parseInt(process.env.MERGE_GAP_MS || '200', 10), // Smaller gap - don't merge distant segments
    strongThreshold = parseFloat(process.env.ALIGN_STRONG_THRESHOLD || '0.7'), // Much higher for strict matching
    weakThreshold = parseFloat(process.env.ALIGN_WEAK_THRESHOLD || '0.5'), // Higher threshold for clean videos
    createVideoSegments = false,
  } = params

  // Load ASR from media_files.metadata.asr
  const db = supabaseAdmin || supabase
  const { data: media, error: mfErr } = await db
    .from('media_files')
    .select('id, metadata, storage_url')
    .eq('id', uploadId)
    .single()

  if (mfErr || !media) {
    throw new Error(`Media not found: ${mfErr?.message || 'unknown error'}`)
  }

  const asr = (media as any).metadata?.asr
  const segments: ASRSegment[] = asr?.segments || []
  
  console.log('🔍 Alignment debug:', {
    hasMetadata: !!(media as any).metadata,
    hasAsr: !!asr,
    segmentsLength: segments.length,
    metadata: (media as any).metadata
  })
  
  if (!segments.length) {
    throw new Error('No ASR segments found. Run transcription first.')
  }

  const sentences = splitSentences(scriptText)

  // Pre-embed segments (cache in memory for this run)
  const segmentEmbeddings: Array<number[] | null> = []
  for (const seg of segments) {
    const e = await embed(seg.text)
    segmentEmbeddings.push(e)
  }

  const mapping: AlignmentItem[] = []

  for (const sentence of sentences) {
    const sentEmb = await embed(sentence)
    let bestScore = -1
    let bestSeg: ASRSegment | null = null
    let bestIdx = -1

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]
      const segEmb = segmentEmbeddings[i]
      let score = 0
      if (sentEmb && segEmb) {
        score = cosineSimilarity(sentEmb, segEmb)
      } else {
        score = fuzzySimilarity(sentence, seg.text)
      }
      if (score > bestScore) {
        bestScore = score
        bestSeg = seg
        bestIdx = i
      }
    }

    let strength: 'strong' | 'weak' | 'none' = 'none'
    if (bestScore >= strongThreshold) strength = 'strong'
    else if (bestScore >= weakThreshold) strength = 'weak'

    mapping.push({
      sentence,
      matchedSegment: bestSeg,
      score: bestScore,
      start_ms: bestSeg ? Math.max(0, Math.round(bestSeg.start * 1000) - bufferMs) : null,
      end_ms: bestSeg ? Math.round(bestSeg.end * 1000) + bufferMs : null,
      strength,
    })
  }

  // Create selected shots from strong/weak matches
  const prelim: SelectedShot[] = mapping
    .filter((m) => m.matchedSegment && m.strength !== 'none')
    .map((m) => ({
      start_ms: m.start_ms!,
      end_ms: m.end_ms!,
      transcript: m.matchedSegment!.text,
      match_score: m.score,
    }))
    .sort((a, b) => a.start_ms - b.start_ms)

  // Merge adjacent within mergeGapMs
  const merged: SelectedShot[] = []
  for (const shot of prelim) {
    if (!merged.length) {
      merged.push({ ...shot })
      continue
    }
    const last = merged[merged.length - 1]
    if (shot.start_ms <= last.end_ms + mergeGapMs) {
      last.end_ms = Math.max(last.end_ms, shot.end_ms)
      last.transcript = `${last.transcript} ${shot.transcript}`.trim()
      last.match_score = Math.max(last.match_score, shot.match_score)
    } else {
      merged.push({ ...shot })
    }
  }

  // Create video segments for editing if requested
  let videoSegments: VideoSegment[] = []
  let editingStats = undefined

  if (createVideoSegments) {
    console.log('🎬 Creating video segments for editing...')
    
    // Get total video duration (assume from last ASR segment)
    const totalDuration_ms = segments.length > 0 ? segments[segments.length - 1].end * 1000 : 0
    
    // Create segments based on ASR and alignment with duplication detection
    const allSegments: VideoSegment[] = []
    const usedScriptSentences = new Set<string>() // Track which script sentences we've already used
    const scriptSentences = splitSentences(scriptText)
    
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]
      const start_ms = Math.round(segment.start * 1000)
      const end_ms = Math.round(segment.end * 1000)
      
      // Find the best matching script sentence that hasn't been used yet
      let bestMatch: AlignmentItem | null = null
      let bestScriptIndex = -1
      
      for (let j = 0; j < mapping.length; j++) {
        const m = mapping[j]
        if (m.matchedSegment && 
            Math.abs(m.matchedSegment.start - segment.start) < 0.2 && // Even stricter timing
            m.strength === 'strong' && 
            m.score >= 0.8 && // Much higher threshold for perfect matching
            !usedScriptSentences.has(m.sentence)) { // Not already used
          
          if (!bestMatch || m.score > bestMatch.score) {
            bestMatch = m
            bestScriptIndex = j
          }
        }
      }
      
      // Only keep segment if it has a perfect, unused match to the script
      const shouldKeep = bestMatch !== null && bestMatch.score >= 0.8
      
      if (shouldKeep && bestMatch) {
        // Mark this script sentence as used to prevent duplicates
        usedScriptSentences.add(bestMatch.sentence)
        console.log(`✅ Keeping segment ${i + 1}: "${segment.text}" → Script: "${bestMatch.sentence}" (score: ${bestMatch.score.toFixed(3)})`)
      } else {
        console.log(`❌ Removing segment ${i + 1}: "${segment.text}" (${bestMatch ? `duplicate/low score: ${bestMatch.score.toFixed(3)}` : 'no match'})`)
      }
      
      allSegments.push({
        start_ms,
        end_ms,
        transcript: segment.text,
        match_score: bestMatch?.score || 0,
        keep: shouldKeep
      })
    }
    
    // Sort by start time and dedupe near-duplicates (same script fragment said twice back-to-back)
    allSegments.sort((a, b) => a.start_ms - b.start_ms)
    const deduped: VideoSegment[] = []
    for (const seg of allSegments) {
      const prev = deduped[deduped.length - 1]
      if (
        prev &&
        seg.keep && prev.keep &&
        Math.abs(seg.start_ms - prev.start_ms) < 1200 &&
        fuzzySimilarity(normalizeForFuzzy(seg.transcript), normalizeForFuzzy(prev.transcript)) > 0.9
      ) {
        // Prefer the later one if it's longer or has higher score
        const preferLater = (seg.end_ms - seg.start_ms) >= (prev.end_ms - prev.start_ms) || seg.match_score >= prev.match_score
        if (preferLater) {
          deduped[deduped.length - 1] = seg
        }
        continue
      }
      deduped.push(seg)
    }
    
    // Only keep the segments we want, and remove silent pauses between them
    const keepSegments = deduped.filter(seg => seg.keep)
    
    // Remove gaps/pauses between kept segments and ensure natural timing
    const optimizedSegments: VideoSegment[] = []
    for (let i = 0; i < keepSegments.length; i++) {
      const segment = keepSegments[i]
      const nextSegment = keepSegments[i + 1]
      
      // Trim the segment to remove potential silence at the end, with punctuation-aware padding
      let trimmedEndMs = segment.end_ms
      if (nextSegment) {
        // If there's a long gap to the next segment, trim this one's trailing silence
        const gapToNext = nextSegment.start_ms - segment.end_ms
        if (gapToNext > 800) {
          // Allow a short natural pause after strong punctuation, else trim aggressively
          const allowPauseMs = endsWithStrongPunctuation(segment.transcript) ? 500 : 200
          const excessiveMs = gapToNext - allowPauseMs
          if (excessiveMs > 0) {
            trimmedEndMs = Math.max(segment.start_ms + 400, segment.end_ms - Math.min(400, excessiveMs))
          }
        }
      }
      
      // Also trim potential silence from the beginning (except for first segment)
      let trimmedStartMs = segment.start_ms
      if (i > 0) {
        // Add small pre-roll for natural word onset, but cap if previous ended strong
        const naturalLeadIn = endsWithStrongPunctuation(keepSegments[i - 1].transcript) ? 40 : 100
        // Then trim small amount if ASR included leading silence
        const trimHead = 120
        trimmedStartMs = Math.max(segment.start_ms + naturalLeadIn, Math.min(segment.end_ms - 350, segment.start_ms + trimHead))
      }
      
      // Ensure we have at least 450ms of content to avoid micro-cuts
      if (trimmedEndMs - trimmedStartMs < 450) {
        const minDur = Math.min(600, segment.end_ms - segment.start_ms)
        trimmedEndMs = Math.min(segment.end_ms, trimmedStartMs + minDur)
      }
      
      // Clamp ordering
      if (trimmedEndMs <= trimmedStartMs) {
        trimmedEndMs = trimmedStartMs + 450
      }

      optimizedSegments.push({
        ...segment,
        start_ms: trimmedStartMs,
        end_ms: trimmedEndMs
      })
      
      console.log(`🎬 Optimized segment ${i + 1}: ${trimmedStartMs}ms - ${trimmedEndMs}ms (${((trimmedEndMs - trimmedStartMs) / 1000).toFixed(1)}s)`)
    }
    
    videoSegments = optimizedSegments
    
    // Calculate editing statistics
    const keepDuration_ms = videoSegments
      .filter(seg => seg.keep)
      .reduce((sum, seg) => sum + (seg.end_ms - seg.start_ms), 0)
    
    const removedDuration_ms = totalDuration_ms - keepDuration_ms
    const reductionPercentage = totalDuration_ms > 0 ? (removedDuration_ms / totalDuration_ms) * 100 : 0
    
    editingStats = {
      totalDuration_ms,
      keepDuration_ms,
      removedDuration_ms,
      reductionPercentage
    }
    
    console.log('📊 Video editing stats:', {
      totalDuration: `${(totalDuration_ms / 1000).toFixed(1)}s`,
      keepDuration: `${(keepDuration_ms / 1000).toFixed(1)}s`,
      removedDuration: `${(removedDuration_ms / 1000).toFixed(1)}s`,
      reduction: `${reductionPercentage.toFixed(1)}%`,
      segmentsToKeep: videoSegments.filter(seg => seg.keep).length,
      segmentsToRemove: videoSegments.filter(seg => !seg.keep).length
    })
  }

  // Persist alignment JSON
  const alignmentPayload = {
    mapping,
    selectedShots: merged,
    videoSegments,
    editingStats,
    config: { bufferMs, mergeGapMs, strongThreshold, weakThreshold },
    updated_at: new Date().toISOString(),
  }

  const { error: saveErr } = await db
    .from('media_files')
    .update({
      metadata: {
        ...(media as any).metadata,
        alignment: alignmentPayload,
      },
    } as any)
    .eq('id', uploadId)

  if (saveErr) {
    // eslint-disable-next-line no-console
    console.error('Failed to save alignment JSON:', saveErr)
  }

  return alignmentPayload
}

/**
 * Enhanced Speaker-to-Camera Pipeline with Advanced Segmentation
 * Uses sophisticated pause logic and segment optimization
 */
export async function updateSpeakerToCameraPipelineWithSegmentation(params: {
  uploadId: string
  scriptText?: string
  outputQuality?: 'low' | 'medium' | 'high'
  addSubtitles?: boolean
  generateFiles?: boolean
  useAdvancedSegmentation?: boolean
  segmentationConfig?: {
    strongPunctuationPauseThreshold?: number
    longPauseTrimThreshold?: number
    trimmedPauseLength?: number
    leadInPadding?: number
    minimumSegmentLength?: number
  }
}): Promise<{
  success: boolean
  editingDecision: EditingDecision
  segmentationResult?: any
  videoBuffer?: ArrayBuffer
  videoMimeType?: string
  edlContent?: string
  srtContent?: string
  error?: string
}> {
  const { 
    uploadId, 
    scriptText, 
    outputQuality = 'medium', 
    addSubtitles = true, 
    generateFiles = true,
    useAdvancedSegmentation = true,
    segmentationConfig
  } = params

  try {
    console.log('🎬 Starting enhanced speaker-to-camera pipeline with advanced segmentation...')
    
    // Step 1: Get the media file and check for existing transcription
    const db = supabaseAdmin || supabase
    const { data: media, error: mediaError } = await db
      .from('media_files')
      .select('*')
      .eq('id', uploadId)
      .single()

    if (mediaError || !media) {
      throw new Error(`Media not found: ${mediaError?.message || 'unknown error'}`)
    }

    const metadata = (media as any).metadata
    const asr = metadata?.asr
    const segments: ASRSegment[] = asr?.segments || []

    if (!segments.length) {
      throw new Error('No transcription found. Please transcribe the video first using the enhanced transcription API.')
    }

    console.log(`📊 Found ${segments.length} ASR segments`)

    let editingDecision: EditingDecision
    let segmentationResult: any = null

    if (useAdvancedSegmentation) {
      // Step 2: Use advanced segmentation with pause logic
      console.log('🎯 Using advanced segmentation with pause logic...')
      
      segmentationResult = await processAudioSegments(segments, scriptText, segmentationConfig)
      
      // Convert segmentation result to EditingDecision format
      editingDecision = {
        keepSegments: segmentationResult.processedSegments,
        pauseList: segmentationResult.pauseAnalysis.pauses,
        editingStats: {
          totalDuration_ms: segmentationResult.stats.originalSegments * 1000, // Approximate
          keepDuration_ms: segmentationResult.processedSegments.reduce((sum: number, seg: any) => 
            sum + (seg.end_ms - seg.start_ms), 0),
          removedDuration_ms: segmentationResult.stats.totalTimeReduced,
          reductionPercentage: (segmentationResult.stats.totalTimeReduced / 
            (segmentationResult.stats.originalSegments * 1000)) * 100,
          segmentsAnalyzed: segmentationResult.stats.originalSegments,
          segmentsKept: segmentationResult.stats.processedSegments,
          segmentsRemoved: segmentationResult.stats.originalSegments - segmentationResult.stats.processedSegments,
          averageConfidence: segmentationResult.stats.confidence
        },
        metadata: {
          analysisTimestamp: new Date().toISOString(),
          hasScript: !!scriptText,
          scriptLength: scriptText?.length || 0,
          transcriptLength: segments.reduce((sum, s) => sum + s.text.length, 0),
          llmModel: 'advanced-segmenter',
          decisionCriteria: ['pause_analysis', 'segment_padding', 'merge_tiny_segments']
        }
      }
      
      console.log('✅ Advanced segmentation completed:', {
        originalSegments: segmentationResult.stats.originalSegments,
        processedSegments: segmentationResult.stats.processedSegments,
        pausesTrimmed: segmentationResult.stats.totalPausesTrimmed,
        timeReduced: `${segmentationResult.stats.totalTimeReduced.toFixed(0)}ms`,
        avgSegmentLength: `${segmentationResult.stats.averageSegmentLength.toFixed(0)}ms`
      })
      
    } else {
      // Fallback to original LLM analysis
      console.log('🤖 Using LLM-based analysis...')
      editingDecision = await analyzeSegmentsWithLLM(segments, scriptText)
    }

    // Step 3: Generate EDL and SRT files
    let edlContent: string | undefined
    let srtContent: string | undefined

    if (generateFiles) {
      console.log('📝 Generating EDL and SRT files...')
      
      if (useAdvancedSegmentation && segmentationResult) {
        // Use segmenter-generated EDL and SRT
        edlContent = segmentationResult.edlContent
        srtContent = generateSRT(editingDecision)
      } else {
        // Use original generators
        edlContent = generateEDL(editingDecision, (media as any).filename || 'SOURCE')
        srtContent = generateSRT(editingDecision)
      }
      
      console.log('✅ EDL and SRT files generated')
    }

    // Step 4: Create the clean video using FFmpeg (rest remains the same)
    console.log('🎬 Creating clean video with FFmpeg...')
    
    const videoUrl = (media as any).storage_url
    if (!videoUrl) {
      throw new Error('Video URL not found in media file')
    }

    const videoResponse = await fetch(videoUrl)
    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.status}`)
    }

    const videoBuffer = await videoResponse.arrayBuffer()
    const videoMimeType = videoResponse.headers.get('content-type') || 'video/mp4'

    console.log(`📹 Video downloaded: ${(videoBuffer.byteLength / 1024 / 1024).toFixed(1)}MB`)

    // Import the enhanced video editor
    const { createCleanVideoFromDecision } = await import('./video-editor')
    
    // Create clean video based on editing decision
    const editingResult = await createCleanVideoFromDecision(
      videoBuffer,
      videoMimeType,
      editingDecision,
      {
        outputQuality,
        outputFormat: 'mp4',
        addSubtitles,
        fadeInOut: true,
        transitionDuration: 200
      }
    )

    if (!editingResult.success || !editingResult.outputBuffer) {
      throw new Error(editingResult.error || 'Video editing failed')
    }

    console.log('✅ Clean video created successfully:', {
      originalDuration: `${editingResult.editingStats.originalDuration.toFixed(1)}s`,
      finalDuration: `${editingResult.editingStats.finalDuration.toFixed(1)}s`,
      reduction: `${editingResult.editingStats.reductionPercentage.toFixed(1)}%`,
      outputSize: `${(editingResult.outputBuffer.byteLength / 1024 / 1024).toFixed(1)}MB`
    })

    // Step 5: Save the results to the database
    const updatedMetadata = {
      ...metadata,
      editingDecision,
      segmentationResult: useAdvancedSegmentation ? segmentationResult : undefined,
      edlContent: generateFiles ? edlContent : undefined,
      srtContent: generateFiles ? srtContent : undefined,
      lastPipelineRun: new Date().toISOString(),
      pipelineVersion: useAdvancedSegmentation ? 'v2-segmented' : 'v1-llm'
    }

    await db
      .from('media_files')
      .update({ metadata: updatedMetadata } as any)
      .eq('id', uploadId)

    return {
      success: true,
      editingDecision,
      segmentationResult,
      videoBuffer: editingResult.outputBuffer,
      videoMimeType: editingResult.outputMimeType || 'video/mp4',
      edlContent,
      srtContent
    }

  } catch (error: any) {
    console.error('❌ Enhanced speaker-to-camera pipeline failed:', error)
    return {
      success: false,
      editingDecision: {
        keepSegments: [],
        pauseList: [],
        editingStats: {
          totalDuration_ms: 0,
          keepDuration_ms: 0,
          removedDuration_ms: 0,
          reductionPercentage: 0,
          segmentsAnalyzed: 0,
          segmentsKept: 0,
          segmentsRemoved: 0,
          averageConfidence: 0
        },
        metadata: {
          analysisTimestamp: new Date().toISOString(),
          hasScript: false,
          scriptLength: 0,
          transcriptLength: 0,
          llmModel: 'error',
          decisionCriteria: []
        }
      },
      error: error.message || 'Unknown error'
    }
  }
}

/**
 * Updated Speaker-to-Camera Pipeline - Orchestrates complete video processing workflow
 * Transcription → Analysis → Editing → FFmpeg → Final Video
 */
export async function updateSpeakerToCameraPipeline(params: {
  uploadId: string
  script?: string // Optional script for comparison
  outputQuality?: 'low' | 'medium' | 'high'
  generateFiles?: boolean // Whether to generate EDL/SRT files
  instagramFormat?: 'portrait' | 'square' // Instagram format preference
  skipSubtitles?: boolean // Whether to skip subtitle generation completely
}): Promise<{
  success: boolean
  videoPath?: string
  srtPath?: string
  edlPath?: string
  error?: string
}> {
  const { uploadId, script, outputQuality = 'medium', generateFiles = true, instagramFormat = 'portrait', skipSubtitles = false } = params

  // Create output directory early for file generation and debug outputs
  const outputDir = `/tmp/video-edit-${uploadId}`
  
  // Debug timing tracking
  const debugTiming = {
    transcriptionStart: Date.now(),
    transcriptionEnd: 0,
    segmentationStart: 0,
    segmentationEnd: 0,
    llmAnalysisStart: 0,
    llmAnalysisEnd: 0,
    ffmpegStart: 0,
    ffmpegEnd: 0
  }

  try {
    console.log('🎬 Starting Speaker-to-Camera Pipeline')
    console.log(`📋 Upload ID: ${uploadId}`)
    console.log(`📜 Script provided: ${script ? 'Yes' : 'No'}`)
    console.log(`🎯 Quality: ${outputQuality}`)
    
    await require('fs').promises.mkdir(outputDir, { recursive: true })
    
    // Step 1: Get media file and perform WhisperX transcription
    console.log('\n📊 Step 1: Loading media and WhisperX transcription...')
    const db = supabaseAdmin || supabase
    const { data: media, error: mediaError } = await db
      .from('media_files')
      .select('*')
      .eq('id', uploadId)
      .single()

    if (mediaError || !media) {
      throw new Error(`Media not found: ${mediaError?.message || 'unknown error'}`)
    }

    const metadata = (media as any).metadata
    
    // Check for existing OpenAI transcription first
    let openaiTranscription = metadata?.openai_transcription
    let segments: ASRSegment[] = []
    
    if (openaiTranscription && openaiTranscription.words && openaiTranscription.segments) {
      console.log('✅ Found existing OpenAI transcription')
      console.log(`📊 Words: ${openaiTranscription.words.length}`)
      console.log(`📊 Segments: ${openaiTranscription.segments.length}`)
      console.log(`⏱️ Duration: ${openaiTranscription.duration?.toFixed(1) || 0}s`)
      
      // Use existing segments
      segments = openaiTranscription.segments
    } else {
      // Perform new OpenAI transcription
      console.log('🎤 Starting OpenAI Whisper transcription (word-level timestamps)...')
      
      const videoUrl = (media as any).storage_url
      if (!videoUrl) {
        throw new Error('❌ Video URL not found in media file')
      }
      
      // Import OpenAI transcription service
      console.log(`🔧 OpenAI Whisper with enhanced timing (rebuilt)`)
      console.log('⚡ Word-level timestamp analysis')
      
      // Transcribe with rebuilt OpenAI logic
      const { transcribeWithEnhancedTimingRebuild } = await import('./transcribe-rebuilt')
      const transcriptionResult = await transcribeWithEnhancedTimingRebuild(videoUrl)
      
      if (!transcriptionResult.segments || transcriptionResult.segments.length === 0) {
        throw new Error(`❌ OpenAI transcription failed: No segments returned`)
      }
      
      segments = transcriptionResult.segments
      const totalWords = segments.reduce((sum, seg) => sum + (seg.words?.length || 0), 0)
      const totalDuration = Math.max(...segments.map(s => s.end))
      
      console.log('✅ OpenAI transcription completed')
      console.log(`📊 Words: ${totalWords}`)
      console.log(`📊 Segments: ${segments.length}`)
      console.log(`⏱️ Duration: ${totalDuration.toFixed(1)}s`)
      console.log(`🌍 Language: ${transcriptionResult.language || 'auto-detected'}`)
      
      // Create transcription object for debugging
      openaiTranscription = {
        words: segments.flatMap(seg => seg.words || []).map(word => ({
          text: word.word,
          start: word.start,
          end: word.end
        })),
        segments: segments,
        text: transcriptionResult.text || segments.map(s => s.text).join(' '),
        language: transcriptionResult.language || 'en',
        duration: totalDuration,
        word_count: totalWords,
        segment_count: segments.length
      }
      
      // Save OpenAI transcription to database
      console.log('💾 Saving OpenAI transcription to database...')
      const updatedMetadata = {
        ...metadata,
        openai_transcription: openaiTranscription,
        transcription_timestamp: new Date().toISOString()
      }
      
      await db
        .from('media_files')
        .update({ metadata: updatedMetadata } as any)
        .eq('id', uploadId)
      
      console.log('✅ OpenAI transcription saved')
    }

    if (!segments.length) {
      throw new Error('❌ No segments found in transcription')
    }

    // Debug timing and save transcript.json
    debugTiming.transcriptionEnd = Date.now()
    console.log(`🎤 Ready for analysis: ${segments.length} segments with word-level timing`)
    
    // Save raw transcript for debugging
    if (generateFiles) {
      const transcriptDebugPath = `${outputDir}/transcript.json`
      const transcriptDebugData = {
        openai_transcription: openaiTranscription,
        segments: segments,
        metadata: {
          total_segments: segments.length,
          total_words: openaiTranscription?.words?.length || 0,
          total_duration: openaiTranscription?.duration || 0,
          language: openaiTranscription?.language || 'unknown',
          transcription_time_ms: debugTiming.transcriptionEnd - debugTiming.transcriptionStart
        }
      }
      await require('fs').promises.writeFile(transcriptDebugPath, JSON.stringify(transcriptDebugData, null, 2))
      console.log(`🐛 Debug: Raw transcript saved to ${transcriptDebugPath}`)
    }

    // Step 2: LLM Analysis with professional video editor approach
    console.log('\n🤖 Step 2: Professional video editor analysis...')
    console.log('🎯 Rules: Keep final fluent versions, remove filler, trim pauses >800ms')
    
    debugTiming.llmAnalysisStart = Date.now()
    const editingDecision = await analyzeSegmentsWithLLM(segments, script, generateFiles ? outputDir : undefined)
    debugTiming.llmAnalysisEnd = Date.now()

    console.log('✅ Analysis completed:')
    console.log(`📊 Segments: ${editingDecision.editingStats.segmentsKept}/${editingDecision.editingStats.segmentsAnalyzed} kept`)
    console.log(`⏱️ Reduction: ${editingDecision.editingStats.reductionPercentage.toFixed(1)}%`)
    console.log(`🗑️ Removed: ${editingDecision.editingStats.segmentsRemoved} segments`)
    console.log(`⏸️ Pauses: ${editingDecision.pauseList.length} detected`)
    
    // Debug timing statistics
    const totalOriginalWords = openaiTranscription?.words?.length || 0
    const keptWords = editingDecision.keepSegments.reduce((sum, seg) => sum + seg.transcript.split(' ').length, 0)
    const avgWordLength = totalOriginalWords > 0 ? (openaiTranscription?.duration || 0) / totalOriginalWords : 0
    const analysisTimeMs = debugTiming.llmAnalysisEnd - debugTiming.llmAnalysisStart
    
    console.log('📊 Timing Statistics:')
    console.log(`   • Average word length: ${avgWordLength.toFixed(2)}s`)
    console.log(`   • Total words: ${totalOriginalWords} → ${keptWords} kept`)
    console.log(`   • Word reduction: ${totalOriginalWords > 0 ? ((totalOriginalWords - keptWords) / totalOriginalWords * 100).toFixed(1) : 0}%`)
    console.log(`   • Duration reduction: ${editingDecision.editingStats.reductionPercentage.toFixed(1)}%`)
    console.log(`   • LLM analysis time: ${analysisTimeMs}ms`)
    
    // Warning for too lenient LLM
    if (editingDecision.editingStats.reductionPercentage < 50) {
      console.log('⚠️  WARNING: LLM too lenient, check transcript quality')
      console.log('    Expected >50% reduction for typical speaker-to-camera content')
      console.log('    Consider reviewing the transcript for audio quality issues')
    }

    // Step 3: Generate output files
    let edlPath: string | undefined
    let srtPath: string | undefined

    if (generateFiles) {
      console.log('\n📝 Step 3: Generating output files...')
      
      // Generate EDL
      const edlContent = generateEDL(editingDecision, (media as any).filename || 'SOURCE')
      edlPath = `${outputDir}/edit_decision_list.csv`
      await require('fs').promises.writeFile(edlPath, edlContent)
      console.log(`📄 EDL saved: ${edlPath}`)
      
      // Generate SRT only if not skipping subtitles
      if (!skipSubtitles) {
        const srtContent = generateSRT(editingDecision)
        srtPath = `${outputDir}/subtitles.srt`
        await require('fs').promises.writeFile(srtPath, srtContent)
        console.log(`📄 SRT saved: ${srtPath}`)
      } else {
        console.log(`🚫 Skipping SRT generation as requested`)
      }
      
      console.log('✅ Files generated successfully')
    }

    // Step 4: Download original video
    console.log('\n📹 Step 4: Downloading original video...')
    const videoUrl = (media as any).storage_url
    if (!videoUrl) {
      throw new Error('❌ Video URL not found in media file')
    }

    const videoResponse = await fetch(videoUrl)
    if (!videoResponse.ok) {
      throw new Error(`❌ Failed to download video: ${videoResponse.status}`)
    }

    const videoBuffer = await videoResponse.arrayBuffer()
    console.log(`✅ Downloaded: ${(videoBuffer.byteLength / 1024 / 1024).toFixed(1)}MB`)

    // Step 5: FFmpeg video cutting and processing
    console.log('\n✂️ Step 5: FFmpeg processing...')
    console.log(`🎬 Method: ${editingDecision.keepSegments.length > 1 ? 'Multi-segment cutting' : 'Single segment'}`)
    console.log(`🎞️ Quality: ${outputQuality}`)
    console.log(`📺 Subtitles: ${generateFiles ? 'Embedded' : 'None'}`)
    
    // Convert EditingDecision to segments for video editor
    const keepSegments = editingDecision.keepSegments.map((segment, index) => ({
      start_ms: segment.start_ms,
      end_ms: segment.end_ms,
      transcript: segment.transcript,
      confidence: segment.confidence,
      reason: segment.reason as any,
      reasonDetails: segment.reason,
      originalSegmentIndex: index
    }))

    // Import and use video editor
    const { createCleanVideoFromDecision } = await import('./video-editor')
    
    debugTiming.ffmpegStart = Date.now()
    const editingResult = await createCleanVideoFromDecision(
      videoBuffer,
      'video/mp4',
      editingDecision,
      {
        outputQuality,
        outputFormat: 'mp4',
        addSubtitles: generateFiles,
        fadeInOut: true,
        transitionDuration: 200
      }
    )
    debugTiming.ffmpegEnd = Date.now()

    if (!editingResult.success || !editingResult.outputBuffer) {
      throw new Error(`❌ Video editing failed: ${editingResult.error}`)
    }

    console.log('✅ FFmpeg processing completed:')
    console.log(`📊 Original: ${(videoBuffer.byteLength / 1024 / 1024).toFixed(1)}MB`)
    console.log(`📊 Final: ${(editingResult.outputBuffer.byteLength / 1024 / 1024).toFixed(1)}MB`)
    console.log(`📊 Size change: ${((editingResult.outputBuffer.byteLength / videoBuffer.byteLength - 1) * 100).toFixed(1)}%`)

    // Step 6: Create Instagram-ready video with burned subtitles
    console.log('\n📱 Step 6: Creating Instagram-ready video...')
    
    // Determine target format and dimensions
    const targetDimensions = instagramFormat === 'square' ? '1080:1080' : '1080:1920'
    const formatName = instagramFormat === 'square' ? 'square (Instagram Post)' : 'portrait (Instagram Stories/Reels)'
    
    console.log(`🎯 Target format: ${targetDimensions} ${formatName}`)
    
    const { writeFile, readFile, unlink, mkdtemp } = await require('fs').promises
    const os = await require('os')
    const path = await require('path')
    const ffmpeg = require('fluent-ffmpeg')
    
    // Use the output directory already created in Step 3
    
    const tempCleanVideoPath = path.join(outputDir, 'temp_clean.mp4')
    const finalOutputPath = path.join(outputDir, 'output.mp4')
    const srtFilePath = srtPath || path.join(outputDir, 'subtitles.srt')
    
    // Save the cleaned video temporarily
    await writeFile(tempCleanVideoPath, Buffer.from(editingResult.outputBuffer))
    console.log(`💾 Temp clean video saved: ${tempCleanVideoPath}`)
    
    // Create SRT file from clean kept text if not already created and not skipping subtitles
    if (!srtPath && generateFiles && !skipSubtitles) {
      const cleanSrtContent = generateSRT(editingDecision)
      await writeFile(srtFilePath, cleanSrtContent)
      console.log(`📄 SRT file created: ${srtFilePath}`)
      srtPath = srtFilePath
    }
    
    console.log(`🎬 Converting to ${formatName} format with burned subtitles...`)
    
    await new Promise<void>((resolve, reject) => {
      // Create the scale and pad filter for the target format
      const scaleFilter = `scale=${targetDimensions}:force_original_aspect_ratio=decrease,pad=${targetDimensions}:(ow-iw)/2:(oh-ih)/2:black`
      
      let instagramCommand = ffmpeg(tempCleanVideoPath)
        .outputOptions([
          '-vf', scaleFilter,
          '-c:v', 'libx264',
          '-crf', '23',
          '-preset', 'medium',
          '-c:a', 'aac',
          '-movflags', '+faststart',
          '-r', '30'  // 30fps for Instagram
        ])
        .format('mp4')
      
      // Burn in subtitles if SRT file exists and not skipping subtitles
      if (srtPath && generateFiles && !skipSubtitles) {
        console.log(`🔥 Burning subtitles from: ${srtPath}`)
        // Adjust font size based on format (smaller for square, larger for portrait)
        const fontSize = instagramFormat === 'square' ? '20' : '24'
        const subtitleFilter = `${scaleFilter},subtitles='${srtPath.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}':force_style='FontSize=${fontSize},PrimaryColour=&Hffffff,OutlineColour=&H000000,BackColour=&H80000000,BorderStyle=1,Outline=2,Shadow=1'`
        
        // Use subtitles filter to burn in the SRT file
        instagramCommand = instagramCommand.outputOptions([
          '-vf', subtitleFilter
        ])
      }
      
      instagramCommand
        .output(finalOutputPath)
        .on('start', (cmd: string) => {
          console.log('🎬 Instagram conversion command:', cmd.split(' ').slice(0, 15).join(' ') + '...')
        })
        .on('progress', (progress: any) => {
          console.log(`⏳ Converting: ${progress.percent?.toFixed(1) || 0}%`)
        })
        .on('end', async () => {
          try {
            // Clean up temp file
            await unlink(tempCleanVideoPath).catch(() => {})
            
            console.log('✅ Final Instagram-ready video created at', finalOutputPath)
            resolve()
          } catch (error) {
            console.error('❌ Error in Instagram conversion cleanup:', error)
            reject(error)
          }
        })
        .on('error', async (error: any) => {
          console.error('❌ Instagram conversion failed:', error)
          await unlink(tempCleanVideoPath).catch(() => {})
          reject(error)
        })
        .run()
    })
    
    // Update paths to point to the final Instagram-ready outputs
    const finalVideoPath = finalOutputPath
    const finalSrtFilePath = srtPath
    const finalEdlFilePath = edlPath

    // Save comprehensive debug timing summary
    if (generateFiles) {
      const debugSummaryPath = `${outputDir}/debug_summary.json`
      const totalPipelineTime = Date.now() - debugTiming.transcriptionStart
      
      const debugSummary = {
        timing: {
          transcription_ms: debugTiming.transcriptionEnd - debugTiming.transcriptionStart,
          llm_analysis_ms: debugTiming.llmAnalysisEnd - debugTiming.llmAnalysisStart,
          ffmpeg_processing_ms: debugTiming.ffmpegEnd - debugTiming.ffmpegStart,
          total_pipeline_ms: totalPipelineTime
        },
        statistics: {
          original_segments: segments.length,
          original_words: totalOriginalWords,
          micro_segments: editingDecision.editingStats.segmentsAnalyzed,
          kept_segments: editingDecision.editingStats.segmentsKept,
          kept_words: keptWords,
          avg_word_length_seconds: avgWordLength,
          duration_reduction_percent: editingDecision.editingStats.reductionPercentage,
          word_reduction_percent: totalOriginalWords > 0 ? ((totalOriginalWords - keptWords) / totalOriginalWords * 100) : 0,
          original_duration_seconds: openaiTranscription?.duration || 0,
          final_duration_seconds: editingDecision.editingStats.keepDuration_ms / 1000
        },
        quality_checks: {
          reduction_too_lenient: editingDecision.editingStats.reductionPercentage < 50,
          has_script: !!script,
          script_length: script?.length || 0,
          instagram_format: instagramFormat,
          subtitles_burned: generateFiles
        },
        files_generated: {
          transcript_json: `${outputDir}/transcript.json`,
          micro_segments_json: `${outputDir}/micro_segments.json`,
          llm_decisions_json: `${outputDir}/llm_decisions.json`,
          final_video: finalVideoPath,
          subtitles_srt: finalSrtFilePath,
          edit_decision_list: finalEdlFilePath,
          debug_summary: debugSummaryPath
        }
      }
      
      await require('fs').promises.writeFile(debugSummaryPath, JSON.stringify(debugSummary, null, 2))
      console.log(`🐛 Debug: Comprehensive timing summary saved to ${debugSummaryPath}`)
      
      console.log('\n⏱️  Performance Summary:')
      console.log(`   • Total pipeline time: ${(totalPipelineTime / 1000).toFixed(1)}s`)
      console.log(`   • Transcription: ${(debugTiming.transcriptionEnd - debugTiming.transcriptionStart) / 1000}s`)
      console.log(`   • LLM analysis: ${(debugTiming.llmAnalysisEnd - debugTiming.llmAnalysisStart) / 1000}s`)
      console.log(`   • FFmpeg processing: ${(debugTiming.ffmpegEnd - debugTiming.ffmpegStart) / 1000}s`)
      console.log(`   • Processing speed: ${((openaiTranscription?.duration || 0) / (totalPipelineTime / 1000)).toFixed(1)}x realtime`)
    }

    // Step 7: Update database with results
    console.log('\n📝 Step 7: Updating database...')
    const updatedMetadata = {
      ...metadata,
      pipelineResults: {
        editingDecision,
        timestamp: new Date().toISOString(),
        outputQuality,
        hadScript: !!script,
        filesGenerated: generateFiles,
        reduction: editingDecision.editingStats.reductionPercentage,
        segmentsKept: editingDecision.editingStats.segmentsKept,
        segmentsRemoved: editingDecision.editingStats.segmentsRemoved,
        instagramFormat: targetDimensions,
        instagramFormatType: instagramFormat,
        burnedSubtitles: generateFiles
      }
    }

    await db
      .from('media_files')
      .update({ metadata: updatedMetadata } as any)
      .eq('id', uploadId)

    console.log('✅ Database updated')

    // Final success message
    console.log('\n🎉 Speaker-to-Camera Pipeline Complete!')
    console.log('📊 Summary:')
    console.log(`   • Segments processed: ${editingDecision.editingStats.segmentsAnalyzed}`)
    console.log(`   • Segments kept: ${editingDecision.editingStats.segmentsKept}`)
    console.log(`   • Time reduction: ${editingDecision.editingStats.reductionPercentage.toFixed(1)}%`)
    console.log(`   • Files generated: ${generateFiles ? 'Yes' : 'No'}`)
    console.log(`   • Instagram format: ${targetDimensions} ${formatName}`)
    console.log(`   • Burned subtitles: ${generateFiles ? 'Yes' : 'No'}`)
    console.log(`   • Final video: ${finalVideoPath}`)
    
    if (generateFiles) {
      console.log('\n📁 Debug Files Generated:')
      console.log(`   • transcript.json - Raw OpenAI transcription data`)
      console.log(`   • micro_segments.json - Segmentation analysis`) 
      console.log(`   • llm_decisions.json - LLM keep/drop decisions`)
      console.log(`   • debug_summary.json - Complete timing & statistics`)
      console.log(`   • All files in: ${outputDir}`)
    }

    return {
      success: true,
      videoPath: finalVideoPath,
      srtPath: finalSrtFilePath,
      edlPath: finalEdlFilePath
    }

  } catch (error: any) {
    console.error('❌ Speaker-to-Camera Pipeline failed:', error.message)
    return {
      success: false,
      error: error.message
    }
  }
}

// Alias for backwards compatibility
export const alignScript = alignScriptToAsr


