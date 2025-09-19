/**
 * Structured AI Responses using OpenAI Function Calling
 * Provides schema-enforced responses with fallback handling
 */

import OpenAI from 'openai'
import { 
  SafeAIDecision, 
  normalizeAIDecision, 
  createDefaultAIDecision,
  generateRequestId,
  safeJsonParse,
  mergeWithFallback
} from './safe-ai-decision'

export interface AIRequestContext {
  uploadId: string
  segments: any[]
  heuristics?: any
  scriptText?: string
  requestId?: string
  model?: string
}

// OpenAI Function Schema for Edit Decisions
const EDIT_DECISION_SCHEMA = {
  name: "create_edit_decision",
  description: "Create a video editing decision with keep/remove segments and statistics",
  parameters: {
    type: "object",
    properties: {
      keepSegments: {
        type: "array",
        description: "Segments to keep in the final video",
        items: {
          type: "object",
          properties: {
            start: { type: "number", description: "Start time in seconds" },
            end: { type: "number", description: "End time in seconds" },
            score: { type: "number", minimum: 0, maximum: 1, description: "Quality score" },
            reason: { type: "string", description: "Why this segment should be kept" }
          },
          required: ["start", "end", "score"],
          additionalProperties: false
        }
      },
      removeSegments: {
        type: "array",
        description: "Segments to remove from the video",
        items: {
          type: "object",
          properties: {
            start: { type: "number", description: "Start time in seconds" },
            end: { type: "number", description: "End time in seconds" },
            reason: { type: "string", description: "Why this segment should be removed" },
            confidence: { type: "number", minimum: 0, maximum: 1, description: "Confidence in removal decision" }
          },
          required: ["start", "end", "reason"],
          additionalProperties: false
        }
      },
      statistics: {
        type: "object",
        description: "Statistics about the editing decisions",
        properties: {
          originalDuration: { type: "number", minimum: 0 },
          finalDuration: { type: "number", minimum: 0 },
          reductionPercentage: { type: "number", minimum: 0, maximum: 100 },
          silenceRemoved: { type: "number", minimum: 0 },
          fillersRemoved: { type: "number", minimum: 0 },
          badTakesRemoved: { type: "number", minimum: 0 },
          scriptDeviations: { type: "number", minimum: 0 }
        },
        required: ["originalDuration", "finalDuration", "reductionPercentage"],
        additionalProperties: false
      },
      qualityScore: {
        type: "number",
        minimum: 0,
        maximum: 1,
        description: "Overall quality score of the editing decision"
      },
      confidence: {
        type: "number",
        minimum: 0,
        maximum: 1,
        description: "Confidence in the overall editing decision"
      },
      recommendations: {
        type: "array",
        description: "Additional recommendations for the editor",
        items: { type: "string" },
        maxItems: 10
      },
      explain: {
        type: "string",
        maxLength: 500,
        description: "Brief explanation of the editing strategy"
      }
    },
    required: ["keepSegments", "removeSegments", "statistics", "qualityScore", "confidence"],
    additionalProperties: false
  }
}

// Caption Segmentation Schema
const CAPTION_SEGMENTATION_SCHEMA = {
  name: "create_caption_segments",
  description: "Create optimized caption segments for video",
  parameters: {
    type: "object",
    properties: {
      cards: {
        type: "array",
        description: "Caption cards with timing and text",
        items: {
          type: "object",
          properties: {
            start: { type: "number", description: "Start time in seconds" },
            end: { type: "number", description: "End time in seconds" },
            text: { type: "string", description: "Caption text" },
            words: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  word: { type: "string" },
                  start: { type: "number" },
                  end: { type: "number" },
                  confidence: { type: "number", minimum: 0, maximum: 1 }
                },
                required: ["word", "start", "end"]
              }
            },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            renderStart: { type: "number" },
            renderEnd: { type: "number" }
          },
          required: ["start", "end", "text", "words"],
          additionalProperties: false
        }
      },
      metadata: {
        type: "object",
        properties: {
          totalCards: { type: "number" },
          averageWordsPerCard: { type: "number" },
          averageCps: { type: "number" },
          qualityScore: { type: "number", minimum: 0, maximum: 1 }
        }
      }
    },
    required: ["cards", "metadata"],
    additionalProperties: false
  }
}

/**
 * Creates a structured AI request with function calling
 */
export async function makeStructuredAIRequest(
  openai: OpenAI,
  context: AIRequestContext,
  type: 'edit_decision' | 'caption_segmentation' = 'edit_decision'
): Promise<SafeAIDecision> {
  const requestId = context.requestId || generateRequestId()
  const model = context.model || 'gpt-4o-mini'
  const startTime = Date.now()
  
  console.info({
    event: 'ai_request_start',
    requestId,
    uploadId: context.uploadId,
    model,
    type,
    segmentCount: context.segments.length,
    hasHeuristics: !!context.heuristics,
    hasScript: !!context.scriptText
  })
  
  try {
    // Prepare the prompt based on type
    const systemPrompt = type === 'edit_decision' 
      ? getEditDecisionSystemPrompt()
      : getCaptionSegmentationSystemPrompt()
    
    const userPrompt = formatUserPrompt(context, type)
    const schema = type === 'edit_decision' ? EDIT_DECISION_SCHEMA : CAPTION_SEGMENTATION_SCHEMA
    
    // Make OpenAI request with function calling
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      functions: [schema],
      function_call: { name: schema.name },
      temperature: 0.1, // Low temperature for consistent results
      max_tokens: 4000
    })
    
    const processingTime = Date.now() - startTime
    
    // Extract function call response
    const functionCall = response.choices?.[0]?.message?.function_call
    const rawArguments = functionCall?.arguments
    
    console.info({
      event: 'ai_response_received',
      requestId,
      uploadId: context.uploadId,
      model,
      processingTimeMs: processingTime,
      rawResponseLength: rawArguments?.length || 0,
      functionName: functionCall?.name,
      hasArguments: !!rawArguments
    })
    
    if (!rawArguments) {
      console.warn('No function arguments received from OpenAI')
      return createDefaultAIDecision({
        processingMetadata: {
          model,
          requestId,
          processingTimeMs: processingTime,
          fallbackUsed: true,
          validationErrors: ['No function arguments received']
        }
      })
    }
    
    // Parse and validate the response
    const parsedResponse = safeJsonParse(rawArguments)
    if (!parsedResponse) {
      console.warn('Failed to parse function arguments as JSON')
      return createDefaultAIDecision({
        processingMetadata: {
          model,
          requestId,
          processingTimeMs: processingTime,
          fallbackUsed: true,
          validationErrors: ['Failed to parse JSON response']
        }
      })
    }
    
    // Normalize the AI decision
    const normalizedDecision = normalizeAIDecision(parsedResponse, requestId, model, processingTime)
    
    console.info({
      event: 'ai_decision_processed',
      requestId,
      uploadId: context.uploadId,
      keepSegmentsCount: normalizedDecision.keepSegments.length,
      removeSegmentsCount: normalizedDecision.removeSegments.length,
      qualityScore: normalizedDecision.qualityScore,
      confidence: normalizedDecision.confidence,
      fallbackUsed: normalizedDecision.processingMetadata.fallbackUsed
    })
    
    return normalizedDecision
    
  } catch (error: any) {
    const processingTime = Date.now() - startTime
    
    console.error({
      event: 'ai_request_failed',
      requestId,
      uploadId: context.uploadId,
      model,
      error: error.message,
      processingTimeMs: processingTime
    })
    
    return createDefaultAIDecision({
      processingMetadata: {
        model,
        requestId,
        processingTimeMs: processingTime,
        fallbackUsed: true,
        validationErrors: [error.message]
      }
    })
  }
}

/**
 * Makes a structured request with fallback merging
 */
export async function makeStructuredAIRequestWithFallback(
  openai: OpenAI,
  context: AIRequestContext,
  fallbackSegments: any[] = [],
  originalDuration: number = 0
): Promise<SafeAIDecision> {
  const aiDecision = await makeStructuredAIRequest(openai, context, 'edit_decision')
  
  // Merge with fallback if needed
  return mergeWithFallback(aiDecision, fallbackSegments, originalDuration)
}

function getEditDecisionSystemPrompt(): string {
  return `You are an expert video editor specializing in creating engaging content for social media platforms like Instagram Reels, TikTok, and YouTube Shorts.

Your task is to analyze video segments and create editing decisions that:
1. Remove filler words, long pauses, and low-quality segments
2. Keep engaging, high-quality content that maintains flow
3. Optimize for viewer retention and engagement
4. Maintain natural pacing and transitions

Guidelines:
- Prioritize content quality over duration
- Remove segments with confidence scores below 0.6
- Keep segments that advance the narrative or provide value
- Consider reading speed (12-17 characters per second) for captions
- Maintain logical flow between kept segments

You MUST respond using the provided function schema. Do not include any narrative text outside the function call.`
}

function getCaptionSegmentationSystemPrompt(): string {
  return `You are an expert at creating optimized captions for social media videos.

Your task is to segment transcribed text into caption cards that:
1. Have 2-6 words per card for optimal readability
2. Maintain natural phrase boundaries
3. Keep reading speed between 12-17 characters per second
4. Create smooth visual transitions
5. Preserve timing accuracy with word-level precision

Guidelines:
- Split at natural pauses and phrase boundaries
- Avoid breaking mid-phrase or mid-thought
- Ensure each card has clear, readable text
- Optimize for mobile viewing
- Maintain synchronization with speech

You MUST respond using the provided function schema. Do not include any narrative text outside the function call.`
}

function formatUserPrompt(context: AIRequestContext, type: 'edit_decision' | 'caption_segmentation'): string {
  if (type === 'caption_segmentation') {
    return `Create optimized caption segments for this video:

Upload ID: ${context.uploadId}
Total Segments: ${context.segments.length}

Segments to process:
${JSON.stringify(context.segments.slice(0, 50), null, 2)} ${context.segments.length > 50 ? '\n... (truncated)' : ''}

${context.scriptText ? `Reference Script:\n${context.scriptText}\n` : ''}

Create caption cards that are optimized for social media viewing with proper timing and readability.`
  }
  
  return `Analyze these video segments and create editing decisions:

Upload ID: ${context.uploadId}
Total Segments: ${context.segments.length}

Transcript Segments:
${JSON.stringify(context.segments.slice(0, 20), null, 2)} ${context.segments.length > 20 ? '\n... (truncated)' : ''}

${context.heuristics ? `Analysis Heuristics:
${JSON.stringify(context.heuristics, null, 2)}
` : ''}

${context.scriptText ? `Reference Script:
${context.scriptText}
` : ''}

Create editing decisions that optimize this content for social media engagement while maintaining quality and flow.`
}

/**
 * Specialized function for caption segmentation
 */
export async function makeStructuredCaptionRequest(
  openai: OpenAI,
  words: any[],
  settings: any = {}
): Promise<{ cards: any[], metadata: any }> {
  const requestId = generateRequestId()
  const context: AIRequestContext = {
    uploadId: 'caption_job',
    segments: words,
    requestId
  }
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: "system", content: getCaptionSegmentationSystemPrompt() },
        { role: "user", content: `Create caption segments from these words:\n${JSON.stringify(words.slice(0, 100), null, 2)}` }
      ],
      functions: [CAPTION_SEGMENTATION_SCHEMA],
      function_call: { name: CAPTION_SEGMENTATION_SCHEMA.name },
      temperature: 0.1,
      max_tokens: 4000
    })
    
    const functionCall = response.choices?.[0]?.message?.function_call
    const rawArguments = functionCall?.arguments
    
    if (rawArguments) {
      const parsed = safeJsonParse(rawArguments)
      if (parsed?.cards && Array.isArray(parsed.cards)) {
        console.info({
          event: 'caption_segmentation_success',
          requestId,
          cardsCreated: parsed.cards.length,
          wordsProcessed: words.length
        })
        
        return {
          cards: parsed.cards,
          metadata: parsed.metadata || { totalCards: parsed.cards.length }
        }
      }
    }
    
    console.warn('Caption segmentation failed, using fallback')
    return { cards: [], metadata: {} }
    
  } catch (error: any) {
    console.error('Caption segmentation error:', error.message)
    return { cards: [], metadata: {} }
  }
}