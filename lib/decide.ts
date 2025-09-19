import OpenAI from 'openai'
import { 
  DecisionInput, 
  DecisionOutput, 
  DecisionPolicy, 
  KeepSegment, 
  KeepReason, 
  Pause, 
  Word, 
  Segment,
  DEFAULT_DECISION_POLICY 
} from './types'

/**
 * Professional LLM-based dialogue editor
 * Replaces brittle alignment logic with intelligent decision making
 */

// Initialize OpenAI client
export function getOpenAI(): OpenAI {
  const apiKeyRaw = process.env.OPENAI_API_KEY
  if (!apiKeyRaw) {
    throw new Error('OPENAI_API_KEY environment variable is required')
  }
  const apiKey = apiKeyRaw.trim().replace(/^["']|["']$/g, '')
  return new OpenAI({ 
    apiKey,
    organization: process.env.OPENAI_ORG_ID || undefined,
    project: process.env.OPENAI_PROJECT_ID || undefined,
  })
}

/**
 * Optimized professional video editor prompt for Speaker-to-Camera content
 */
const PROFESSIONAL_DIALOGUE_EDITOR_PROMPT = `You are a professional video editor.
You receive a word-level transcript with timestamps. 
The transcript may contain false starts, repeated attempts, filler words, and long pauses. 

Rules:
- Keep only the final, fluent, complete version of each sentence or idea.
- If a sentence is spoken multiple times, keep the best/last complete attempt and cut earlier tries.
- Allow natural rewording: different phrasing is fine as long as it's fluent and complete.
- Remove filler words ("um", "uh", "ah", "like", "you know") unless they are clearly intentional.
- Remove abandoned starts and mid-sentence corrections.
- Trim all pauses >800ms down to ~250ms. 
- Preserve small natural pauses (≤500ms) after punctuation so speech feels natural.

Output JSON only:
{
  "keep": [
    {"start": 12.3, "end": 17.8, "text": "The fluent line here..."},
    {"start": 45.1, "end": 49.5, "text": "Next fluent sentence..."}
  ],
  "summaryScript": "Clean final script in natural flow"
}

Use the transcript timestamps exactly; do not invent times.

IMPORTANT: You must respond with valid JSON matching the DecisionOutput format, but focus on the core editing principles above. Convert the simple "keep" format internally to the full DecisionOutput structure with proper reason codes and statistics.`

/**
 * Intelligent dialogue editing using GPT-4o
 */
export async function makeEditingDecision(
  input: DecisionInput,
  model: string = 'gpt-4o'
): Promise<DecisionOutput> {
  const startTime = Date.now()
  
  try {
    console.log('🎬 Starting LLM-based dialogue editing decision...')
    
    const openai = getOpenAI()
    const { transcript, scriptText, policy, metadata } = input
    
    // Prepare transcript data for LLM analysis
    const transcriptData = prepareTranscriptForAnalysis(transcript)
    
    // Construct the user prompt with all necessary data
    const userPrompt = constructUserPrompt(transcriptData, scriptText, policy, metadata)
    
    console.log(`📊 Analyzing ${transcript.segments.length} segments (${transcriptData.wordCount} words)`)
    
    // Make the LLM call
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: PROFESSIONAL_DIALOGUE_EDITOR_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      // GPT-5: use verbosity/reasoning_effort instead of temperature/top_p
      verbosity: 'medium',
      reasoning_effort: 'minimal',
      max_completion_tokens: 8000,  // Allow for comprehensive responses
      response_format: { type: 'json_object' } // Ensure JSON response
    })
    
    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error('No response from LLM')
    }
    
    console.log('✅ LLM analysis completed, parsing response...')
    
    // Parse and validate the JSON response
    const decision = parseAndValidateDecisionOutput(response, input, startTime)
    
    console.log('🎯 Decision parsed successfully:', {
      segmentsKept: decision.keepSegments.length,
      segmentsRemoved: decision.stats.segmentsRemoved,
      reductionPercentage: `${decision.stats.reductionPercentage.toFixed(1)}%`,
      processingTime: `${decision.analysisMetadata.processingTime_ms}ms`
    })
    
    return decision
    
  } catch (error: any) {
    console.error('❌ LLM dialogue editing failed:', error)
    
    // Return fallback decision to prevent pipeline failure
    return createFallbackDecision(input, error.message, Date.now() - startTime)
  }
}

/**
 * Prepare transcript data for LLM analysis
 */
function prepareTranscriptForAnalysis(transcript: any) {
  const segments = transcript.segments || []
  const words = segments.flatMap((seg: any) => seg.words || [])
  
  return {
    fullText: transcript.text || '',
    segments: segments.map((segment: any, index: number) => ({
      index,
      start_ms: Math.round((segment.start || 0) * 1000),
      end_ms: Math.round((segment.end || 0) * 1000),
      duration_ms: Math.round(((segment.end || 0) - (segment.start || 0)) * 1000),
      text: segment.text || '',
      confidence: segment.confidence || 0.8,
      wordCount: (segment.words || []).length,
      words: (segment.words || []).map((word: any) => ({
        word: word.word || '',
        start_ms: Math.round((word.start || 0) * 1000),
        end_ms: Math.round((word.end || 0) * 1000)
      }))
    })),
    wordCount: words.length,
    totalDuration_ms: Math.round((transcript.duration || 0) * 1000),
    language: transcript.language || 'en'
  }
}

/**
 * Construct comprehensive user prompt for LLM analysis
 */
function constructUserPrompt(
  transcriptData: any, 
  scriptText?: string, 
  policy: DecisionPolicy = DEFAULT_DECISION_POLICY,
  metadata?: any
): string {
  const hasScript = !!scriptText?.trim()
  
  let prompt = `# DIALOGUE EDITING TASK

## TRANSCRIPT DATA
Language: ${transcriptData.language}
Total Duration: ${transcriptData.totalDuration_ms}ms
Total Segments: ${transcriptData.segments.length}
Total Words: ${transcriptData.wordCount}

## FULL TRANSCRIPT
"${transcriptData.fullText}"

## DETAILED SEGMENTS
${transcriptData.segments.map((seg: any, i: number) => 
  `[${i}] ${seg.start_ms}-${seg.end_ms}ms (${seg.duration_ms}ms, conf: ${seg.confidence.toFixed(2)}): "${seg.text}"`
).join('\n')}

## EDITING POLICY
- Min Confidence: ${policy.minConfidence}
- Remove Filler: ${policy.removeFiller}
- Remove Hesitations: ${policy.removeHesitations}
- Remove Long Pauses: ${policy.removeLongPauses}
- Max Pause Duration: ${policy.maxPauseDuration_ms}ms
- Strong Confidence Threshold: ${policy.strongConfidenceThreshold}
- Enable Deduplication: ${policy.enableDeduplication}
- Use AI Summary: ${policy.useAISummary}
- Preserve Transitions: ${policy.preserveTransitions}
- Maintain Natural Flow: ${policy.maintainNaturalFlow}`

  if (hasScript) {
    prompt += `

## REFERENCE SCRIPT
"${scriptText}"

INSTRUCTIONS: Prioritize segments that match the script content. Allow natural variations in wording while preserving the intended message. Keep ad-libs that enhance the content.`
  } else {
    prompt += `

INSTRUCTIONS: No script provided. Create a concise, engaging edit that captures the best content. Remove redundancy aggressively while maintaining the speaker's authentic voice and core message.`
  }

  if (policy.customInstructions) {
    prompt += `

## CUSTOM INSTRUCTIONS
${policy.customInstructions}`
  }

  if (metadata) {
    prompt += `

## ADDITIONAL CONTEXT
Video ID: ${metadata.videoId || 'unknown'}
Speaker: ${metadata.speakerInfo?.name || 'unknown'}
Role: ${metadata.speakerInfo?.role || 'unknown'}`
  }

  prompt += `

## RESPONSE FORMAT
Respond with ONLY the JSON object. No markdown code blocks, no explanations, just the raw JSON matching the DecisionOutput interface exactly.`

  return prompt
}

/**
 * Parse and validate LLM response as DecisionOutput
 */
function parseAndValidateDecisionOutput(
  response: string, 
  originalInput: DecisionInput, 
  startTime: number
): DecisionOutput {
  try {
    // Strip potential markdown code fences
    let cleanResponse = response.trim()
    if (cleanResponse.startsWith('```json')) {
      cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (cleanResponse.startsWith('```')) {
      cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }
    
    // Parse JSON
    const parsed = JSON.parse(cleanResponse)
    
    // Check if this is the optimized format (simple "keep" array)
    if (parsed.keep && Array.isArray(parsed.keep) && parsed.summaryScript) {
      console.log('📝 Converting optimized format to DecisionOutput...')
      return convertOptimizedToDecisionOutput(parsed, originalInput, startTime)
    }
    
    // Validate standard DecisionOutput format
    if (!parsed.keepSegments || !Array.isArray(parsed.keepSegments)) {
      throw new Error('Invalid keepSegments array')
    }
    
    if (!parsed.pauseList || !Array.isArray(parsed.pauseList)) {
      throw new Error('Invalid pauseList array')
    }
    
    if (!parsed.stats || typeof parsed.stats !== 'object') {
      throw new Error('Invalid stats object')
    }
    
    // Add processing time and ensure metadata is complete
    const processingTime = Date.now() - startTime
    const decision: DecisionOutput = {
      ...parsed,
      analysisMetadata: {
        timestamp: new Date().toISOString(),
        model: 'gpt-4o',
        policyUsed: originalInput.policy,
        hasScript: !!originalInput.scriptText,
        scriptLength: originalInput.scriptText?.length || 0,
        transcriptLength: originalInput.transcript.text?.length || 0,
        processingTime_ms: processingTime,
        ...parsed.analysisMetadata
      }
    }
    
    // Validate and sanitize keep segments
    decision.keepSegments = decision.keepSegments.map((segment: any, index: number) => ({
      start_ms: Math.round(Number(segment.start_ms) || 0),
      end_ms: Math.round(Number(segment.end_ms) || 0),
      transcript: String(segment.transcript || ''),
      confidence: Math.max(0, Math.min(1, Number(segment.confidence) || 0.8)),
      reason: validateKeepReason(segment.reason),
      reasonDetails: String(segment.reasonDetails || ''),
      originalSegmentIndex: Number(segment.originalSegmentIndex) || index,
      scriptMatch: segment.scriptMatch ? {
        similarity: Math.max(0, Math.min(1, Number(segment.scriptMatch.similarity) || 0)),
        matchedText: String(segment.scriptMatch.matchedText || '')
      } : undefined
    }))
    
    // Validate and sanitize pauses
    decision.pauseList = decision.pauseList.map((pause: any) => ({
      start_ms: Math.round(Number(pause.start_ms) || 0),
      end_ms: Math.round(Number(pause.end_ms) || 0),
      duration_ms: Math.round(Number(pause.duration_ms) || 0),
      type: validatePauseType(pause.type),
      confidence: Math.max(0, Math.min(1, Number(pause.confidence) || 0.8)),
      context: String(pause.context || '')
    }))
    
    console.log('✅ Decision validation completed')
    return decision
    
  } catch (error: any) {
    console.error('❌ Failed to parse LLM response:', error)
    console.error('Raw response:', response.substring(0, 500) + '...')
    
    throw new Error(`JSON parsing failed: ${error.message}`)
  }
}

/**
 * Convert optimized format to full DecisionOutput structure
 */
function convertOptimizedToDecisionOutput(
  optimized: any,
  originalInput: DecisionInput,
  startTime: number
): DecisionOutput {
  const processingTime = Date.now() - startTime
  const transcript = originalInput.transcript
  
  // Convert "keep" array to KeepSegments
  const keepSegments = optimized.keep.map((keepItem: any, index: number) => {
    const startSec = Number(keepItem.start)
    const endSec = Number(keepItem.end)
    
    // Determine reason based on content analysis
    let reason: string = 'natural_speech'
    let reasonDetails = 'Fluent, complete statement kept by professional editor'
    
    // Check for script match if script provided
    if (originalInput.scriptText) {
      const similarity = calculateTextSimilarity(keepItem.text, originalInput.scriptText)
      if (similarity > 0.6) {
        reason = 'script_match'
        reasonDetails = `Matches script content (${(similarity * 100).toFixed(1)}% similarity)`
      }
    }
    
    // Check for deduplication indicators
    if (keepItem.text.toLowerCase().includes('final') || keepItem.text.toLowerCase().includes('complete')) {
      reason = 'dedupe_best_take'
      reasonDetails = 'Best/final version of repeated content'
    }
    
    return {
      start_ms: Math.round(startSec * 1000),
      end_ms: Math.round(endSec * 1000),
      transcript: String(keepItem.text || ''),
      confidence: 0.9, // High confidence for editor-selected content
      reason: validateKeepReason(reason),
      reasonDetails,
      originalSegmentIndex: index
    }
  })
  
  // Calculate pause list by analyzing gaps
  const pauseList = calculatePausesFromKeepSegments(keepSegments, transcript)
  
  // Calculate comprehensive statistics
  const originalDuration = (transcript.duration || 0) * 1000
  const finalDuration = keepSegments.reduce((sum, seg) => sum + (seg.end_ms - seg.start_ms), 0)
  const removedDuration = originalDuration - finalDuration
  const reductionPercentage = (removedDuration / originalDuration) * 100
  
  // Count removed content
  const originalSegments = transcript.segments?.length || 0
  const segmentsKept = keepSegments.length
  const segmentsRemoved = originalSegments - segmentsKept
  
  // Estimate filler and duplicate removal
  const originalText = transcript.text || ''
  const finalText = optimized.summaryScript || ''
  const fillerWordsRemoved = countFillerWords(originalText) - countFillerWords(finalText)
  const duplicatesRemoved = Math.max(0, segmentsRemoved - fillerWordsRemoved)
  
  const decision: DecisionOutput = {
    keepSegments,
    pauseList,
    analysisMetadata: {
      timestamp: new Date().toISOString(),
      model: 'gpt-4o',
      policyUsed: originalInput.policy,
      hasScript: !!originalInput.scriptText,
      scriptLength: originalInput.scriptText?.length || 0,
      transcriptLength: originalText.length,
      processingTime_ms: processingTime
    },
    stats: {
      originalDuration_ms: originalDuration,
      finalDuration_ms: finalDuration,
      removedDuration_ms: removedDuration,
      reductionPercentage,
      totalSegments: originalSegments,
      segmentsKept,
      segmentsRemoved,
      averageConfidence: 0.9,
      lowConfidenceSegments: 0,
      fillerWordsRemoved,
      pausesRemoved: pauseList.filter(p => p.type === 'long_pause').length,
      duplicatesRemoved,
      reasonCounts: {
        script_match: keepSegments.filter(s => s.reason === 'script_match').length,
        dedupe_best_take: keepSegments.filter(s => s.reason === 'dedupe_best_take').length,
        filler_trim: 0,
        pause_trim: pauseList.filter(p => p.type === 'long_pause').length,
        ai_summary: 0,
        high_confidence: 0,
        natural_speech: keepSegments.filter(s => s.reason === 'natural_speech').length,
        topic_relevant: 0,
        transition_keep: 0,
        fallback_keep: 0
      }
    }
  }
  
  console.log('✅ Optimized format converted to DecisionOutput')
  return decision
}

/**
 * Calculate text similarity for script matching
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  const words1 = text1.toLowerCase().split(/\s+/)
  const words2 = text2.toLowerCase().split(/\s+/)
  
  const commonWords = words1.filter(word => words2.includes(word))
  return commonWords.length / Math.max(words1.length, words2.length)
}

/**
 * Calculate pauses from keep segments
 */
function calculatePausesFromKeepSegments(keepSegments: any[], transcript: any): any[] {
  const pauses: any[] = []
  
  for (let i = 0; i < keepSegments.length - 1; i++) {
    const currentEnd = keepSegments[i].end_ms
    const nextStart = keepSegments[i + 1].start_ms
    const gapDuration = nextStart - currentEnd
    
    if (gapDuration > 800) {
      pauses.push({
        start_ms: currentEnd,
        end_ms: nextStart,
        duration_ms: gapDuration,
        type: 'long_pause',
        confidence: 0.9,
        context: `Gap between segments ${i + 1} and ${i + 2}`
      })
    }
  }
  
  return pauses
}

/**
 * Count filler words in text
 */
function countFillerWords(text: string): number {
  const fillerPattern = /\b(um|uh|er|ah|like|you know|so|well)\b/gi
  const matches = text.match(fillerPattern)
  return matches ? matches.length : 0
}

/**
 * Validate keep reason enum
 */
function validateKeepReason(reason: string): KeepReason {
  const validReasons: KeepReason[] = [
    'script_match', 'dedupe_best_take', 'filler_trim', 'pause_trim', 
    'ai_summary', 'high_confidence', 'natural_speech', 'topic_relevant', 
    'transition_keep', 'fallback_keep'
  ]
  
  return validReasons.includes(reason as KeepReason) ? reason as KeepReason : 'fallback_keep'
}

/**
 * Validate pause type enum
 */
function validatePauseType(type: string): Pause['type'] {
  const validTypes: Pause['type'][] = ['silence', 'filler', 'hesitation', 'long_pause', 'natural_break']
  return validTypes.includes(type as Pause['type']) ? type as Pause['type'] : 'silence'
}

/**
 * Create fallback decision when LLM fails
 */
function createFallbackDecision(
  input: DecisionInput, 
  errorMessage: string, 
  processingTime: number
): DecisionOutput {
  console.log('🔄 Creating fallback decision due to LLM failure...')
  
  const segments = input.transcript.segments || []
  const totalDuration = segments.reduce((sum, seg) => sum + ((seg.end - seg.start) * 1000), 0)
  
  // Simple fallback: keep high-confidence segments, remove obvious filler
  const keepSegments: KeepSegment[] = segments
    .filter((segment, index) => {
      const confidence = segment.confidence || 0.8
      const hasFillerWords = /\b(um|uh|er|ah|like|you know)\b/i.test(segment.text)
      
      // Keep if confidence is good and no obvious filler
      return confidence >= input.policy.minConfidence && !hasFillerWords
    })
    .map((segment, index) => ({
      start_ms: Math.round(segment.start * 1000),
      end_ms: Math.round(segment.end * 1000),
      transcript: segment.text,
      confidence: segment.confidence || 0.8,
      reason: 'fallback_keep' as KeepReason,
      reasonDetails: `Fallback decision - LLM failed: ${errorMessage}`,
      originalSegmentIndex: index
    }))
  
  const finalDuration = keepSegments.reduce((sum, seg) => sum + (seg.end_ms - seg.start_ms), 0)
  
  return {
    keepSegments,
    pauseList: [], // No pause analysis in fallback
    analysisMetadata: {
      timestamp: new Date().toISOString(),
      model: 'fallback',
      policyUsed: input.policy,
      hasScript: !!input.scriptText,
      scriptLength: input.scriptText?.length || 0,
      transcriptLength: input.transcript.text?.length || 0,
      processingTime_ms: processingTime
    },
    stats: {
      originalDuration_ms: totalDuration,
      finalDuration_ms: finalDuration,
      removedDuration_ms: totalDuration - finalDuration,
      reductionPercentage: ((totalDuration - finalDuration) / totalDuration) * 100,
      totalSegments: segments.length,
      segmentsKept: keepSegments.length,
      segmentsRemoved: segments.length - keepSegments.length,
      averageConfidence: keepSegments.reduce((sum, seg) => sum + seg.confidence, 0) / (keepSegments.length || 1),
      lowConfidenceSegments: keepSegments.filter(seg => seg.confidence < input.policy.strongConfidenceThreshold).length,
      fillerWordsRemoved: segments.length - keepSegments.length, // Approximate
      pausesRemoved: 0,
      duplicatesRemoved: 0,
      reasonCounts: {
        script_match: 0,
        dedupe_best_take: 0,
        filler_trim: 0,
        pause_trim: 0,
        ai_summary: 0,
        high_confidence: 0,
        natural_speech: 0,
        topic_relevant: 0,
        transition_keep: 0,
        fallback_keep: keepSegments.length
      }
    }
  }
}

/**
 * Convenience function for quick decision making
 */
export async function decideFast(
  transcript: any,
  scriptText?: string,
  policy?: Partial<DecisionPolicy>
): Promise<DecisionOutput> {
  const fullPolicy = { ...DEFAULT_DECISION_POLICY, ...policy }
  
  const input: DecisionInput = {
    transcript,
    scriptText,
    policy: fullPolicy,
    metadata: {
      videoId: 'quick-decision',
      originalDuration_ms: (transcript.duration || 0) * 1000
    }
  }
  
  return makeEditingDecision(input)
}

/**
 * Batch processing for multiple transcripts
 */
export async function decideBatch(
  inputs: DecisionInput[],
  model: string = 'gpt-4o'
): Promise<DecisionOutput[]> {
  console.log(`🎬 Processing ${inputs.length} dialogue editing decisions in batch...`)
  
  const results = await Promise.allSettled(
    inputs.map(input => makeEditingDecision(input, model))
  )
  
  const successes = results.filter(r => r.status === 'fulfilled').length
  const failures = results.filter(r => r.status === 'rejected').length
  
  console.log(`✅ Batch completed: ${successes} successful, ${failures} failed`)
  
  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value
    } else {
      console.error(`❌ Decision ${index} failed:`, result.reason)
      return createFallbackDecision(inputs[index], result.reason?.message || 'Unknown error', 0)
    }
  })
}

/**
 * Export the main decision function as default
 */
export default makeEditingDecision
