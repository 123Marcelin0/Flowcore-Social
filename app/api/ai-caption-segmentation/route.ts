import { NextRequest, NextResponse } from 'next/server'

interface WordTiming {
  word: string
  start: number
  end: number
  confidence?: number
}

interface Settings {
  minWordsPerCard?: number
  maxWordsPerCard?: number
  targetCpsRange?: [number, number]
  globalMinPause?: number
  lingerSec?: number
}

interface CaptionCard {
  cardId: string
  start: number
  end: number
  renderStart: number
  renderEnd: number
  text: string
  words: Array<{
    word: string
    start: number
    end: number
    confidence: number
    text_for_display: string
  }>
  lineBreakIndex: number | null
  emphasis: number[]
  confidence: number
}

interface CaptionResponse {
  version: string
  meta: {
    readingSpeedCps: number
    pauseThresholdGlobal: number
    generatedAt: string
    notes?: string
  }
  cards: CaptionCard[]
  errors: Array<{ code: string; message: string }>
  warnings: string[]
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

Be concise and efficient. Focus on core subtitle cards only.

Return JSON: {"cards": [{"cardId":"1","start":0.0,"end":0.0,"renderStart":0.0,"renderEnd":0.0,"text":"word word","words":[{"word":"word","start":0.0,"end":0.0,"confidence":0.9,"text_for_display":"word"}],"confidence":0.9}]}`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { words, audioUrl, audioBase64, sceneCuts, settings } = body

    if (!words || !Array.isArray(words)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid words array provided'
      }, { status: 400 })
    }

    // Default settings
    const defaultSettings: Settings = {
      minWordsPerCard: 2,
      maxWordsPerCard: 6,
      targetCpsRange: [12, 17],
      globalMinPause: 0.28,
      lingerSec: 1.0
    }

    const finalSettings = { ...defaultSettings, ...settings }

    // Prepare payload for AI model
    const payload = {
      words: words.map((w: any) => ({
        word: w.word || w.text || '',
        start: w.start || 0,
        end: w.end || 0,
        confidence: w.confidence || 0.9
      })),
      ...(audioUrl && { audioUrl }),
      ...(audioBase64 && { audioBase64 }),
      ...(sceneCuts && { sceneCuts }),
      settings: finalSettings
    }

    // Call OpenAI GPT-4o with the professional captioning prompt
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: `Process the following payload and return the required JSON:\n\n${JSON.stringify(payload, null, 2)}`
          }
        ],
        temperature: 0.0,
        top_p: 1.0,
        max_tokens: 16000,
        response_format: { type: 'json_object' }
      })
    })

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.status}`)
    }

    const openaiResult = await openaiResponse.json()
    let captionData: CaptionResponse

    try {
      // The response is already JSON when using response_format: json_object
      let content = openaiResult.choices[0].message.content
      
      // Clean up malformed JSON - fix common issues
      if (typeof content === 'string') {
        // First, try to fix incomplete numbers and strings
        let cleanedContent = content
        
        // Fix incomplete decimal numbers (e.g., "0." -> "0.9")
        cleanedContent = cleanedContent.replace(/:\s*\d+\.\s*([,}\]\s])/g, ':0.9$1')
        
        // Fix incomplete strings at end of content
        cleanedContent = cleanedContent.replace(/:\s*"[^"]*$/g, ':"incomplete"')
        
        // Find the last properly closed JSON structure
        let openBraces = 0
        let lastValidEnd = -1
        
        for (let i = 0; i < cleanedContent.length; i++) {
          if (cleanedContent[i] === '{') openBraces++
          if (cleanedContent[i] === '}') {
            openBraces--
            if (openBraces === 0) {
              lastValidEnd = i
            }
          }
        }
        
        if (lastValidEnd > 0) {
          content = cleanedContent.substring(0, lastValidEnd + 1)
        } else {
          content = cleanedContent
        }
        
        // Try to parse the cleaned content
        captionData = JSON.parse(content)
      } else {
        captionData = content
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      console.error('Raw content length:', openaiResult.choices[0].message.content?.length)
      console.error('Raw content preview:', openaiResult.choices[0].message.content?.substring(0, 500))
      
      // Fallback: Advanced JSON repair for truncated AI responses
      try {
        let content = openaiResult.choices[0].message.content
        console.log('🔧 Starting advanced JSON repair...')
        
        // Find the start of JSON
        const jsonStart = content.indexOf('{')
        if (jsonStart === -1) throw new Error('No JSON opening brace found')
        
        content = content.substring(jsonStart)
        
        // Step 1: Try to extract cards array even from incomplete JSON
        const cardsStartMatch = content.match(/"cards"\s*:\s*\[/)
        if (cardsStartMatch) {
          console.log('🔍 Found cards array start, extracting...')
          
          const cardsStart = cardsStartMatch.index! + cardsStartMatch[0].length - 1 // Include the [
          let cardsContent = content.substring(cardsStart)
          
          // Find complete card objects
          const cards = []
          let bracketDepth = 0
          let currentCard = ''
          let inString = false
          let escapeNext = false
          let startedCard = false
          
          for (let i = 0; i < cardsContent.length; i++) {
            const char = cardsContent[i]
            
            if (escapeNext) {
              escapeNext = false
              currentCard += char
              continue
            }
            
            if (char === '\\') {
              escapeNext = true
              currentCard += char
              continue
            }
            
            if (char === '"' && !escapeNext) {
              inString = !inString
              currentCard += char
              continue
            }
            
            if (inString) {
              currentCard += char
              continue
            }
            
            if (char === '{') {
              bracketDepth++
              startedCard = true
              currentCard += char
            } else if (char === '}') {
              bracketDepth--
              currentCard += char
              
              // Complete card found
              if (bracketDepth === 0 && startedCard) {
                try {
                  const cardObj = JSON.parse(currentCard.trim())
                  if (cardObj && cardObj.text && cardObj.start !== undefined) {
                    cards.push(cardObj)
                    console.log(`✅ Extracted card ${cards.length}: "${cardObj.text.substring(0, 30)}..."`)
                  }
                } catch (cardError) {
                  console.warn('⚠️ Failed to parse card:', currentCard.substring(0, 100))
                }
                currentCard = ''
                startedCard = false
              }
            } else if (char === '[' || char === ']') {
              // Skip array brackets
              continue
            } else if (char === ',' && bracketDepth === 0) {
              // Skip commas between cards
              continue
            } else {
              currentCard += char
            }
          }
          
          console.log(`🎯 Successfully extracted ${cards.length} cards from truncated JSON`)
          
          if (cards.length > 0) {
            captionData = { cards }
            console.log('✅ Successfully created caption data from extracted cards')
          } else {
            throw new Error('No valid cards extracted from truncated JSON')
          }
        } else {
          throw new Error('Could not find cards array in JSON')
        }
      } catch (fallbackError) {
        console.error('Fallback JSON repair also failed:', fallbackError)
        return NextResponse.json({
          success: false,
          error: 'AI response contains malformed JSON that cannot be repaired',
          details: parseError.message,
          contentLength: openaiResult.choices[0].message.content?.length
        }, { status: 500 })
      }
    }

    // Validate the response structure
    if (!captionData.cards || !Array.isArray(captionData.cards)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid caption data structure'
      }, { status: 500 })
    }

    // Transform for our video editor format
    const textOverlays = captionData.cards.map((card, index) => ({
      id: card.cardId || `ai_card_${index}`,
      start: card.renderStart,
      duration: card.renderEnd - card.renderStart,
      text: card.text,
      tokens: card.words.map(w => ({
        w: w.text_for_display,
        offset: w.start - card.start,
        dur: w.end - w.start
      })),
      style: {
        position: 'bottom' as const,
        fontSize: 28,
        color: '#ffffff'
      },
      lineBreakIndex: card.lineBreakIndex,
      emphasis: card.emphasis,
      confidence: card.confidence
    }))

    return NextResponse.json({
      success: true,
      data: {
        textOverlays,
        meta: captionData.meta,
        cards: captionData.cards,
        errors: captionData.errors || [],
        warnings: captionData.warnings || []
      }
    })

  } catch (error) {
    console.error('AI caption segmentation error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error during caption processing'
    }, { status: 500 })
  }
}


