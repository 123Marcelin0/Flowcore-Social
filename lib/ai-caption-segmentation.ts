import OpenAI from 'openai'

export interface WordTimingIn {
  word: string
  start: number
  end: number
  confidence?: number
}

export interface SegmentationSettings {
  minWordsPerCard?: number
  maxWordsPerCard?: number
  targetCpsRange?: [number, number]
  globalMinPause?: number
  lingerSec?: number
}

export interface CaptionCard {
  cardId?: string
  start: number
  end: number
  renderStart: number
  renderEnd: number
  text: string
  words: Array<{ word: string; start: number; end: number; confidence?: number; text_for_display?: string }>
  lineBreakIndex?: number | null
  emphasis?: number[]
  confidence?: number
}

export interface SegmentationResult {
  cards: CaptionCard[]
  meta?: any
  warnings?: string[]
  errors?: Array<{ code: string; message: string }>
}

const SYSTEM_PROMPT = `You are a professional subtitle processor. Create perfectly timed subtitle cards from word-level timings. Output only valid JSON.

RULES:
1. Strip ALL punctuation from "text" field (.,;:!?)
2. Never split words - align to word boundaries
3. Respect natural pauses/phrase boundaries
4. 2-6 words per card, prefer 3-5
5. Max 2 lines, ~20-40 chars per line
6. Reading speed: 12-17 chars/sec
7. Merge orphan single words when possible
8. Provide accurate start/end + display renderStart/renderEnd times
9. Cards can linger up to 1-2s but max 7s total

Return JSON: {"cards": [{"cardId":"1","start":0.0,"end":0.0,"renderStart":0.0,"renderEnd":0.0,"text":"word word","words":[{"word":"word","start":0.0,"end":0.0,"confidence":0.9,"text_for_display":"word"}],"confidence":0.9}]}`

export async function runAICaptionSegmentation({
  words,
  audioUrl,
  audioBase64,
  sceneCuts,
  settings
}: {
  words: WordTimingIn[]
  audioUrl?: string
  audioBase64?: string
  sceneCuts?: any
  settings?: SegmentationSettings
}): Promise<SegmentationResult> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const defaultSettings: SegmentationSettings = {
    minWordsPerCard: 2,
    maxWordsPerCard: 6,
    targetCpsRange: [12, 17],
    globalMinPause: 0.28,
    lingerSec: 1.0
  }

  const finalSettings = { ...defaultSettings, ...(settings || {}) }

  const payload = {
    words: (words || []).map((w) => ({
      word: w.word || '',
      start: Number(w.start || 0),
      end: Number(w.end || 0),
      confidence: typeof w.confidence === 'number' ? w.confidence : 0.9
    })),
    ...(audioUrl ? { audioUrl } : {}),
    ...(audioBase64 ? { audioBase64 } : {}),
    ...(sceneCuts ? { sceneCuts } : {}),
    settings: finalSettings
  }

  const completion = await client.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Process the following payload and return the required JSON.\n\n${JSON.stringify(payload)}` }
    ],
    max_tokens: 6000
  })

  const content = completion.choices?.[0]?.message?.content || '{}'
  let parsed: any = {}
  
  try {
    parsed = JSON.parse(content)
  } catch (firstError) {
    console.warn('⚠️ First JSON parse failed, attempting repair...')
    
    try {
      // Try to find complete JSON by matching braces
      let braceCount = 0
      let lastComplete = -1
      
      for (let i = 0; i < content.length; i++) {
        if (content[i] === '{') braceCount++
        if (content[i] === '}') {
          braceCount--
          if (braceCount === 0) lastComplete = i
        }
      }
      
      if (lastComplete > 0) {
        const trimmed = content.slice(0, lastComplete + 1)
        parsed = JSON.parse(trimmed)
        console.log('✅ Successfully parsed trimmed JSON')
      } else {
        throw new Error('No complete JSON structure found')
      }
    } catch (secondError) {
      console.warn('⚠️ JSON repair failed, extracting cards manually...')
      
      // Manual extraction as absolute fallback
      const cardsMatch = content.match(/"cards"\s*:\s*\[(.*?)\]/s)
      if (cardsMatch) {
        try {
          // Try to parse just the cards array
          const cardsStr = `{"cards":[${cardsMatch[1]}]}`
          const cardsOnly = JSON.parse(cardsStr)
          parsed = cardsOnly
          console.log('✅ Extracted cards array manually')
        } catch {
          console.warn('⚠️ Manual extraction failed, using empty fallback')
          parsed = { cards: [] }
        }
      } else {
        console.warn('⚠️ No cards found in content, using empty fallback')
        parsed = { cards: [] }
      }
    }
  }

  const cards: CaptionCard[] = Array.isArray(parsed?.cards) ? parsed.cards : []
  return {
    cards,
    meta: parsed?.meta,
    warnings: parsed?.warnings || [],
    errors: parsed?.errors || []
  }
}


