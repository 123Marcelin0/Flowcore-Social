import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { validateEDL, createEDLTemplate, type EditDecisionList, type EDLClip, type ShotIntent, type TransitionType } from '@/lib/edl-types'
import { getOpenAI } from '@/lib/decide'

export const runtime = 'nodejs'

interface CutSuggestionRequest {
  uploadId: string
  transcriptSegments: any[]
  scriptText?: string
  enhancedAnalysis?: any
  options?: {
    aggressiveness: 'conservative' | 'balanced' | 'aggressive'
    preserveNaturalPauses: boolean
    enableAutoFix: boolean
    targetReduction: number // percentage
  }
}

const AI_CUT_SYSTEM_PROMPT = `You are a professional video editor AI that creates precise Edit Decision Lists (EDL) for speaker-to-camera content.

Your task: Analyze transcript segments with objective quality signals and create a structured cut plan.

INPUT DATA:
- Transcript segments with word-level timing and confidence scores
- Silence detection data with objective thresholds
- ASR confidence metrics and estimated word error rates
- Optional script for comparison

EDITING PRINCIPLES:
1. Use objective signals (silence detection, ASR confidence) as primary guidance
2. Keep complete, fluent sentences and natural speech patterns
3. Remove filler words, false starts, and bad takes based on confidence scores
4. Trim silence segments above the recommended threshold
5. Preserve natural pauses that aid comprehension
6. If script provided, keep content that aligns with script intent
7. Mark low-confidence segments for potential review

OUTPUT REQUIREMENTS:
- Return valid JSON matching the EditDecisionList schema
- Each clip must have: id, startTime, endTime, duration, shotIntent, confidence, reason
- Include keyframe transforms for smooth motion (startTransform → endTransform)
- Use objective data to set confidence scores
- Provide clear reasons for each editing decision

SHOT INTENTS:
- "establish": Opening or context-setting segments
- "focus": Key content delivery
- "transition": Smooth transitions between topics
- "emphasis": Important points to highlight
- "cleanup": Removing bad takes/fillers
- "silence_trim": Trimming excessive silence

CONFIDENCE SCORING:
- Use ASR confidence scores as baseline
- Reduce confidence for segments with detected issues
- High confidence (0.8+): Clean, clear content
- Medium confidence (0.5-0.8): Minor issues, keep with caution
- Low confidence (<0.5): Significant issues, consider removal

Return only the JSON EDL structure, no additional text.`

/**
 * Generate AI-powered cut suggestions using enhanced analysis
 */
async function generateCutSuggestions(
  request: CutSuggestionRequest
): Promise<EditDecisionList> {
  const { uploadId, transcriptSegments, scriptText, enhancedAnalysis, options } = request
  
  const openai = getOpenAI()
  if (!openai) {
    throw new Error('OpenAI API not configured')
  }

  // Get media metadata for source duration
  const { data: media } = await supabase
    .from('media_files')
    .select('metadata')
    .eq('id', uploadId)
    .single()

  const metadata = (media as any)?.metadata || {}
  const sourceDuration = metadata.duration || 0

  // Prepare analysis data for AI
  const analysisData = {
    transcriptSegments: transcriptSegments.map(seg => ({
      id: seg.id,
      text: seg.text,
      startTime: seg.startTime,
      endTime: seg.endTime,
      confidence: seg.confidence || 0.8,
      words: seg.words?.map((w: any) => ({
        word: w.word,
        start: w.start,
        end: w.end,
        confidence: w.confidence || 0.8
      })) || []
    })),
    
    silenceDetection: enhancedAnalysis?.silenceDetection || {
      segments: [],
      recommendedTrimThreshold: 0.5,
      silencePercentage: 0
    },
    
    asrMetrics: enhancedAnalysis?.asrMetrics || {
      averageConfidence: 0.8,
      lowConfidenceSegments: [],
      wordErrorRate: 0.1
    },
    
    objectiveSignals: enhancedAnalysis?.objectiveSignals || {
      overallQuality: 0.8,
      recommendations: []
    },
    
    scriptText: scriptText || null,
    
    options: {
      aggressiveness: options?.aggressiveness || 'balanced',
      preserveNaturalPauses: options?.preserveNaturalPauses ?? true,
      targetReduction: options?.targetReduction || 25
    }
  }

  console.log('🤖 Sending analysis to AI for cut suggestions...')
  
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: AI_CUT_SYSTEM_PROMPT },
      { 
        role: 'user', 
        content: `Create an Edit Decision List for this video analysis:\n\n${JSON.stringify(analysisData, null, 2)}`
      }
    ],
    max_completion_tokens: 8000,
    response_format: { type: 'json_object' },
    verbosity: 'medium',
    reasoning_effort: 'minimal'
  })

  const response = completion.choices[0]?.message?.content
  if (!response) {
    throw new Error('No response from AI')
  }

  let edlData: any
  try {
    edlData = JSON.parse(response)
  } catch (error) {
    throw new Error('Invalid JSON response from AI')
  }

  // Validate the EDL structure
  const validation = validateEDL(edlData)
  if (!validation.success) {
    console.error('EDL validation failed:', validation.error)
    
    // Create a fallback EDL if AI response is invalid
    const template = createEDLTemplate(uploadId, sourceDuration)
    const fallbackClips: EDLClip[] = transcriptSegments
      .filter(seg => seg.confidence > 0.6) // Keep high-confidence segments
      .map((seg, index) => ({
        id: `fallback_${index + 1}`,
        startTime: seg.startTime,
        endTime: seg.endTime,
        duration: seg.endTime - seg.startTime,
        transition: 'cut' as TransitionType,
        transitionDuration: 0.1,
        shotIntent: 'focus' as ShotIntent,
        confidence: seg.confidence || 0.8,
        reason: 'Fallback: High confidence segment',
        easing: 'ease-in-out',
        originalText: seg.text,
        asrConfidence: seg.confidence
      }))

    const finalDuration = fallbackClips.reduce((sum, clip) => sum + clip.duration, 0)
    
    return {
      ...template,
      clips: fallbackClips,
      statistics: {
        originalDuration: sourceDuration,
        finalDuration,
        reductionPercentage: ((sourceDuration - finalDuration) / sourceDuration) * 100,
        clipsTotal: transcriptSegments.length,
        clipsKept: fallbackClips.length,
        clipsRemoved: transcriptSegments.length - fallbackClips.length
      }
    } as EditDecisionList
  }

  return validation.data
}

/**
 * Apply auto-fix passes to the EDL
 */
async function applyAutoFixPasses(edl: EditDecisionList, options: CutSuggestionRequest['options']): Promise<EditDecisionList> {
  if (!options?.enableAutoFix) return edl

  const updatedEDL = { ...edl }
  const autoFixPasses = []

  // Auto-fix pass 1: Trim tiny silences
  console.log('🔧 Applying auto-fix: Trim tiny silences')
  const silenceTrimmed = updatedEDL.clips.filter(clip => {
    // Remove clips that are just tiny silences (< 0.3s and marked as silence)
    if (clip.duration < 0.3 && clip.silenceDetected && clip.confidence < 0.5) {
      return false
    }
    return true
  })

  if (silenceTrimmed.length !== updatedEDL.clips.length) {
    updatedEDL.clips = silenceTrimmed
    autoFixPasses.push({
      type: 'silence_trim' as const,
      enabled: true,
      confidence: 0.9,
      settings: { minDuration: 0.3 }
    })
  }

  // Auto-fix pass 2: Mark suspected mispronunciations
  console.log('🔧 Applying auto-fix: Mark mispronunciations')
  let mispronunciationCount = 0
  updatedEDL.clips = updatedEDL.clips.map(clip => {
    // Mark clips with very low ASR confidence as potential mispronunciations
    if (clip.asrConfidence && clip.asrConfidence < 0.4) {
      mispronunciationCount++
      return {
        ...clip,
        reason: `${clip.reason} (Potential mispronunciation - low ASR confidence)`,
        confidence: Math.min(clip.confidence, 0.6) // Reduce confidence
      }
    }
    return clip
  })

  if (mispronunciationCount > 0) {
    autoFixPasses.push({
      type: 'mispronunciation_detect' as const,
      enabled: true,
      confidence: 0.7,
      settings: { confidenceThreshold: 0.4, markedCount: mispronunciationCount }
    })
  }

  // Update statistics
  const finalDuration = updatedEDL.clips.reduce((sum, clip) => sum + clip.duration, 0)
  updatedEDL.statistics = {
    ...updatedEDL.statistics,
    finalDuration,
    reductionPercentage: ((updatedEDL.statistics.originalDuration - finalDuration) / updatedEDL.statistics.originalDuration) * 100,
    clipsKept: updatedEDL.clips.length
  }

  updatedEDL.autoFixPasses = autoFixPasses

  return updatedEDL
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as CutSuggestionRequest
    const { uploadId } = body

    if (!uploadId) {
      return NextResponse.json(
        { success: false, error: 'uploadId is required' },
        { status: 400 }
      )
    }

    console.log('✂️ Generating AI cut suggestions for uploadId:', uploadId)

    // Step 1: Get or run enhanced analysis
    let enhancedAnalysis = body.enhancedAnalysis
    if (!enhancedAnalysis) {
      console.log('🔍 Running enhanced analysis first...')
      const analysisResponse = await fetch(`${request.nextUrl.origin}/api/enhanced-video-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadId,
          transcriptSegments: body.transcriptSegments
        })
      })

      if (analysisResponse.ok) {
        const analysisResult = await analysisResponse.json()
        enhancedAnalysis = analysisResult.data
      }
    }

    // Step 2: Generate AI cut suggestions
    console.log('🤖 Generating cut suggestions with AI...')
    let edl = await generateCutSuggestions({
      ...body,
      enhancedAnalysis
    })

    // Step 3: Apply auto-fix passes if enabled
    if (body.options?.enableAutoFix) {
      console.log('🔧 Applying auto-fix passes...')
      edl = await applyAutoFixPasses(edl, body.options)
    }

    // Step 4: Store EDL in database
    const { data: media } = await supabase
      .from('media_files')
      .select('metadata')
      .eq('id', uploadId)
      .single()

    const metadata = (media as any)?.metadata || {}
    const updatedMetadata = {
      ...metadata,
      editDecisionList: edl,
      lastEDLGenerated: new Date().toISOString()
    }

    await supabase
      .from('media_files')
      .update({ metadata: updatedMetadata } as any)
      .eq('id', uploadId)

    console.log('✅ Cut suggestions generated:', {
      clipsTotal: edl.clips.length,
      originalDuration: edl.statistics.originalDuration.toFixed(1) + 's',
      finalDuration: edl.statistics.finalDuration.toFixed(1) + 's',
      reduction: edl.statistics.reductionPercentage.toFixed(1) + '%',
      autoFixPasses: edl.autoFixPasses.length
    })

    return NextResponse.json({
      success: true,
      data: {
        edl,
        enhancedAnalysis
      }
    })

  } catch (error: any) {
    console.error('❌ Cut suggestions generation failed:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Cut suggestions failed' },
      { status: 500 }
    )
  }
}



















