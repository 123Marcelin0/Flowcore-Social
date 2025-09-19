import { NextRequest, NextResponse } from 'next/server'
import { handleError } from '@/lib/error-handler'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    console.log('🎯 Enhanced video analysis API called')
    
    const body = await request.json()
    const { transcriptSegments, mediaUrl, uploadId, options = {} } = body
    
    if (!transcriptSegments || !Array.isArray(transcriptSegments)) {
      return handleError(
        new Error('Missing or invalid transcript segments'),
        'INVALID_INPUT',
        400,
        { suggestion: 'Provide valid transcript segments array' }
      )
    }
    
    console.log(`📊 Analyzing ${transcriptSegments.length} transcript segments`)
    
    // Extract word-level data for analysis
    const allWords = transcriptSegments.flatMap((seg: any) => 
      seg.words ? seg.words.map((w: any) => ({
        word: w.word,
        start: w.start,
        end: w.end,
        confidence: w.confidence || 0.9
      })) : []
    )
    
    console.log(`🔍 Analyzing ${allWords.length} words for quality issues`)
    
    // 1. Detect natural pauses and breaks
    const pauseAnalysis = analyzePauses(allWords)
    console.log(`⏸️ Found ${pauseAnalysis.longPauses.length} long pauses, ${pauseAnalysis.awkwardPauses.length} awkward pauses`)
    
    // 2. Detect filler words and hesitations
    const fillerAnalysis = analyzeFillers(allWords)
    console.log(`🗣️ Found ${fillerAnalysis.fillerWords.length} filler words, ${fillerAnalysis.repetitions.length} repetitions`)
    
    // 3. Detect low confidence segments (likely mispronunciations)
    const confidenceAnalysis = analyzeLowConfidence(allWords, transcriptSegments)
    console.log(`❓ Found ${confidenceAnalysis.lowConfidenceSegments.length} low confidence segments`)
    
    // 4. Use AI to detect content quality issues
    const aiAnalysis = await analyzeContentWithAI(transcriptSegments)
    console.log(`🤖 AI detected ${aiAnalysis.qualityIssues.length} quality issues`)
    
    // 5. Generate editing decisions
    const editingDecisions = generateEditingDecisions(
      pauseAnalysis,
      fillerAnalysis,
      confidenceAnalysis,
      aiAnalysis,
      transcriptSegments,
      options
    )
    
    console.log(`✂️ Generated ${editingDecisions.length} editing decisions`)
    
    // 6. Calculate processing statistics
    const stats = calculateProcessingStats(transcriptSegments, editingDecisions)
    console.log(`📈 Processing will reduce duration by ${stats.reductionPercentage.toFixed(1)}%`)
    
    const result = {
      success: true,
      data: {
        editingDecisions,
        analysis: {
          pauses: pauseAnalysis,
          fillers: fillerAnalysis,
          confidence: confidenceAnalysis,
          aiQuality: aiAnalysis
        },
        stats,
        processedSegments: applyEditingDecisions(transcriptSegments, editingDecisions)
      }
    }
    
    return NextResponse.json(result)
    
  } catch (error: any) {
    console.error('❌ Enhanced video analysis failed:', error)
    return handleError(error, 'ANALYSIS_ERROR', 500)
  }
}

function analyzePauses(words: any[]) {
  const longPauses: any[] = []
  const awkwardPauses: any[] = []
  
  for (let i = 0; i < words.length - 1; i++) {
    const currentEnd = words[i].end
    const nextStart = words[i + 1].start
    const pauseDuration = nextStart - currentEnd
    
    if (pauseDuration > 1.5) {
      // Long pause - likely should be removed
      longPauses.push({
        start: currentEnd,
        end: nextStart,
        duration: pauseDuration,
        reason: 'long_pause',
        confidence: 0.9,
        beforeWord: words[i].word,
        afterWord: words[i + 1].word
      })
    } else if (pauseDuration > 0.8 && isAwkwardPause(words[i], words[i + 1])) {
      // Awkward pause - hesitation or uncertainty
      awkwardPauses.push({
        start: currentEnd,
        end: nextStart,
        duration: pauseDuration,
        reason: 'awkward_pause',
        confidence: 0.7,
        beforeWord: words[i].word,
        afterWord: words[i + 1].word
      })
    }
  }
  
  return { longPauses, awkwardPauses }
}

function isAwkwardPause(beforeWord: any, afterWord: any): boolean {
  const before = beforeWord.word.toLowerCase()
  const after = afterWord.word.toLowerCase()
  
  // Awkward if pause is mid-sentence or after hesitation words
  const hesitationWords = ['um', 'uh', 'er', 'ah', 'hmm', 'so', 'like', 'you know']
  const midSentenceWords = ['and', 'but', 'or', 'the', 'a', 'an', 'with', 'for', 'to']
  
  return hesitationWords.includes(before) || 
         midSentenceWords.includes(before) ||
         midSentenceWords.includes(after)
}

function analyzeFillers(words: any[]) {
  const fillerWords: any[] = []
  const repetitions: any[] = []
  
  const commonFillers = ['um', 'uh', 'er', 'ah', 'hmm', 'like', 'you know', 'so', 'well', 'actually', 'basically']
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i].word.toLowerCase()
    
    // Check for filler words
    if (commonFillers.includes(word)) {
      fillerWords.push({
        start: words[i].start,
        end: words[i].end,
        word: words[i].word,
        reason: 'filler_word',
        confidence: 0.85
      })
    }
    
    // Check for repetitions (same word within 3 words)
    for (let j = i + 1; j <= Math.min(i + 3, words.length - 1); j++) {
      if (words[j].word.toLowerCase() === word && word.length > 2) {
        repetitions.push({
          start: words[i].start,
          end: words[j].end,
          word: words[i].word,
          reason: 'word_repetition',
          confidence: 0.8,
          instances: [words[i], words[j]]
        })
        break
      }
    }
  }
  
  return { fillerWords, repetitions }
}

function analyzeLowConfidence(words: any[], segments: any[]) {
  const lowConfidenceSegments: any[] = []
  const threshold = 0.6 // Confidence below 60% indicates likely mispronunciation
  
  for (const segment of segments) {
    if (segment.confidence && segment.confidence < threshold) {
      lowConfidenceSegments.push({
        start: segment.startTime || segment.start,
        end: segment.endTime || segment.end,
        text: segment.text,
        confidence: segment.confidence,
        reason: 'low_confidence_speech',
        likely_issue: segment.confidence < 0.3 ? 'major_mispronunciation' : 'minor_unclear_speech'
      })
    }
  }
  
  // Also check individual words
  const lowConfidenceWords = words.filter(w => w.confidence < threshold)
  
  return { lowConfidenceSegments, lowConfidenceWords }
}

async function analyzeContentWithAI(segments: any[]): Promise<any> {
  try {
    const fullText = segments.map(s => s.text).join(' ')
    
    const prompt = `Analyze this speech transcript for content quality issues that should be edited out for a professional video:

TRANSCRIPT:
"${fullText}"

Identify:
1. False starts and restarts
2. Off-topic rambling 
3. Grammatical errors that sound unprofessional
4. Incomplete thoughts or sentences
5. Excessive self-correction
6. Content that doesn't add value

For each issue, provide the approximate text and reason. Focus on making the content clean and professional.

Respond in JSON format:
{
  "qualityIssues": [
    {"text": "exact text", "reason": "description", "severity": "low|medium|high"}
  ]
}
`
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 1000
    })
    
    const response = completion.choices[0]?.message?.content
    if (response) {
      try {
        return JSON.parse(response)
      } catch {
        // Fallback if JSON parsing fails
        return { qualityIssues: [] }
      }
    }
    
    return { qualityIssues: [] }
    
  } catch (error) {
    console.error('AI analysis failed:', error)
    return { qualityIssues: [] }
  }
}

function generateEditingDecisions(
  pauseAnalysis: any,
  fillerAnalysis: any,
  confidenceAnalysis: any,
  aiAnalysis: any,
  segments: any[],
  options: any
) {
  const decisions: any[] = []
  
  // Add pause removal decisions
  pauseAnalysis.longPauses.forEach((pause: any) => {
    decisions.push({
      start: pause.start,
      end: pause.end,
      action: 'remove',
      reason: 'long_pause',
      confidence: pause.confidence,
      originalDuration: pause.duration
    })
  })
  
  pauseAnalysis.awkwardPauses.forEach((pause: any) => {
    decisions.push({
      start: pause.start,
      end: pause.end,
      action: 'remove',
      reason: 'awkward_pause',
      confidence: pause.confidence,
      originalDuration: pause.duration
    })
  })
  
  // Add filler word removal decisions
  fillerAnalysis.fillerWords.forEach((filler: any) => {
    decisions.push({
      start: filler.start,
      end: filler.end,
      action: 'remove',
      reason: 'filler_word',
      confidence: filler.confidence,
      text: filler.word
    })
  })
  
  // Add repetition removal decisions
  fillerAnalysis.repetitions.forEach((rep: any) => {
    decisions.push({
      start: rep.start,
      end: rep.end,
      action: 'remove',
      reason: 'word_repetition',
      confidence: rep.confidence,
      text: rep.word
    })
  })
  
  // Add low confidence segment decisions
  confidenceAnalysis.lowConfidenceSegments.forEach((seg: any) => {
    decisions.push({
      start: seg.start,
      end: seg.end,
      action: 'remove',
      reason: 'low_confidence',
      confidence: 0.9,
      text: seg.text,
      originalConfidence: seg.confidence
    })
  })
  
  // Sort decisions by start time
  return decisions.sort((a, b) => a.start - b.start)
}

function calculateProcessingStats(segments: any[], decisions: any[]) {
  const originalDuration = segments.length > 0 
    ? Math.max(...segments.map(s => s.endTime || s.end || 0))
    : 0
  
  const removedDuration = decisions.reduce((total, decision) => {
    return total + (decision.end - decision.start)
  }, 0)
  
  const finalDuration = Math.max(0, originalDuration - removedDuration)
  const reductionPercentage = originalDuration > 0 
    ? (removedDuration / originalDuration) * 100
    : 0
  
  return {
    originalDuration,
    finalDuration,
    removedDuration,
    reductionPercentage,
    segmentsRemoved: decisions.length,
    pausesRemoved: decisions.filter(d => d.reason.includes('pause')).length,
    fillersRemoved: decisions.filter(d => d.reason === 'filler_word').length,
    badTakesRemoved: decisions.filter(d => d.reason === 'low_confidence').length
  }
}

function applyEditingDecisions(segments: any[], decisions: any[]) {
  // Create a list of time ranges to keep
  const keepRanges: Array<{start: number, end: number}> = []
  let currentStart = 0
  
  for (const decision of decisions) {
    if (decision.start > currentStart) {
      keepRanges.push({
        start: currentStart,
        end: decision.start
      })
    }
    currentStart = decision.end
  }
  
  // Add final range if needed
  const lastSegment = segments[segments.length - 1]
  if (lastSegment && currentStart < (lastSegment.endTime || lastSegment.end)) {
    keepRanges.push({
      start: currentStart,
      end: lastSegment.endTime || lastSegment.end
    })
  }
  
  return keepRanges
}