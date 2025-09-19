/**
 * AI-powered video editing functions for generating perfect Instagram Reels
 * Uses OpenAI GPT-4o-mini for intelligent cut planning and EDL generation
 */

import OpenAI from 'openai'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY || process.env.OPENAI_API_KEY
})

/**
 * Generate an intelligent cut plan from video analysis signals
 * Takes acoustic features, transcript data, and heuristics to create optimal editing decisions
 */
export async function generateCutPlan(signals: any): Promise<any> {
  try {
    const systemPrompt = `You are an expert video editor specializing in creating perfect Instagram Reels. Your job is to analyze video signals and generate a comprehensive cut plan that will transform raw footage into engaging, professional content.

ANALYSIS INPUT:
You will receive structured signals containing:
- Acoustic features (RMS levels, silence regions, energy spikes)
- Transcript segments with word-level timing and confidence scores
- Filler word detection (um, uh, like, repetitions)
- Video metadata (frame rate, resolution, motion analysis)
- Bad take indicators and speech mistakes
- Natural pause detection and flow analysis

CUT PLAN OUTPUT:
Generate a JSON response with the following structure:
{
  "cuts": [
    {
      "id": "cut_1",
      "startTime": 0.5,
      "endTime": 3.2,
      "action": "keep|remove|trim",
      "reason": "engaging_opening|remove_filler|bad_take|natural_pause",
      "confidence": 0.95,
      "transitions": {
        "fadeIn": false,
        "fadeOut": false,
        "crossFade": false
      }
    }
  ],
  "globalAdjustments": {
    "targetDuration": 30,
    "pacing": "dynamic|steady|slow",
    "retentionOptimization": true
  },
  "qualityMetrics": {
    "engagementScore": 0.85,
    "retentionPrediction": 0.78,
    "professionalismScore": 0.92
  }
}

EDITING PRINCIPLES:
1. Hook viewers in the first 3 seconds
2. Remove all filler words and hesitations
3. Maintain natural speech rhythm while increasing pace
4. Cut on natural pauses and breath points
5. Remove retakes and mistakes completely
6. Optimize for 15-60 second Instagram Reels format
7. Ensure smooth transitions that feel natural
8. Maximize viewer retention and engagement

Focus on creating content that feels professional, engaging, and native to social media platforms.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      max_tokens: 1800,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(signals) }
      ]
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('Empty response from OpenAI')
    }

    // Parse JSON response
    let cutPlan
    try {
      cutPlan = JSON.parse(content)
    } catch (parseError) {
      console.error('Failed to parse cut plan JSON:', content)
      throw new Error('Invalid JSON response from OpenAI')
    }

    // TODO: Validate JSON structure with zod schema
    // const CutPlanSchema = z.object({ ... })
    // const validatedCutPlan = CutPlanSchema.parse(cutPlan)

    console.log('✅ Generated cut plan with', cutPlan.cuts?.length || 0, 'editing decisions')
    return cutPlan

  } catch (error: any) {
    console.error('❌ Cut plan generation failed:', error)
    throw new Error(`Cut plan generation failed: ${error.message}`)
  }
}

/**
 * Convert a cut plan to Edit Decision List (EDL) format for video rendering
 * Transforms high-level editing decisions into precise timeline instructions
 */
export async function cutPlanToEDL(cutPlan: any): Promise<any> {
  try {
    const systemPrompt = `You are a video rendering specialist. Convert high-level cut plans into precise Edit Decision Lists (EDL) for video rendering engines.

INPUT: CutPlan JSON with editing decisions
OUTPUT: EDL JSON with precise timeline instructions

EDL STRUCTURE:
{
  "timeline": {
    "duration": 30.5,
    "fps": 30,
    "resolution": { "width": 1920, "height": 1080 }
  },
  "tracks": [
    {
      "type": "video",
      "clips": [
        {
          "id": "clip_1",
          "sourceStart": 0.5,
          "sourceEnd": 3.2,
          "timelineStart": 0.0,
          "timelineEnd": 2.7,
          "transitions": {
            "in": { "type": "cut|fade", "duration": 0 },
            "out": { "type": "cut|fade", "duration": 0.1 }
          }
        }
      ]
    },
    {
      "type": "audio",
      "clips": [
        {
          "id": "audio_1",
          "sourceStart": 0.5,
          "sourceEnd": 3.2,
          "timelineStart": 0.0,
          "timelineEnd": 2.7,
          "volume": 1.0,
          "fadeIn": 0,
          "fadeOut": 0.1
        }
      ]
    }
  ],
  "effects": [
    {
      "type": "auto_zoom",
      "startTime": 5.0,
      "endTime": 8.0,
      "parameters": { "zoomFactor": 1.2, "smooth": true }
    }
  ]
}

RENDERING PRINCIPLES:
1. Ensure frame-accurate timing calculations
2. Handle smooth transitions between cuts
3. Maintain audio sync with video cuts
4. Apply appropriate fade in/out for natural flow
5. Optimize for the specified resolution and frame rate
6. Include auto-zoom suggestions for engagement
7. Generate timeline that renders without gaps or overlaps

Convert the cut plan into a production-ready EDL that can be sent directly to video rendering services.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      max_tokens: 1200,
      messages: [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: JSON.stringify({ 
            cutPlan, 
            resolution: { w: 1920, h: 1080, fps: 30 } 
          }) 
        }
      ]
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('Empty response from OpenAI')
    }

    // Parse JSON response
    let edl
    try {
      edl = JSON.parse(content)
    } catch (parseError) {
      console.error('Failed to parse EDL JSON:', content)
      throw new Error('Invalid JSON response from OpenAI')
    }

    // TODO: Validate JSON structure with zod schema
    // const EDLSchema = z.object({ ... })
    // const validatedEDL = EDLSchema.parse(edl)

    console.log('✅ Generated EDL with', edl.tracks?.length || 0, 'tracks')
    return edl

  } catch (error: any) {
    console.error('❌ EDL generation failed:', error)
    throw new Error(`EDL generation failed: ${error.message}`)
  }
}

/**
 * Helper function to validate API key is configured
 */
export function validateOpenAIConfig(): boolean {
  const apiKey = process.env.OPENAI_KEY || process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error('❌ OpenAI API key not configured. Set OPENAI_KEY or OPENAI_API_KEY environment variable.')
    return false
  }
  return true
}