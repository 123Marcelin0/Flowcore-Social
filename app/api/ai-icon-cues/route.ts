import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

type Word = { word: string; start: number; end: number }
type SegmentIn = { id?: string; text: string; start: number; end: number; words?: Word[] }

// Auth helper (same pattern as other routes)
async function verifyAuth(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return { authenticated: false, user: null, error: 'Missing or invalid authorization header' }
    }
    const token = authHeader.substring(7)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) {
      return { authenticated: false, user: null, error: 'Invalid token or user not found' }
    }
    return { authenticated: true, user, error: null }
  } catch (error) {
    return { authenticated: false, user: null, error: 'Authentication verification failed' }
  }
}

function getOpenAI(): OpenAI {
  const apiKey = (process.env.OPENAI_API_KEY || '').trim().replace(/^['"]|['"]$/g, '')
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set')
  return new OpenAI({ apiKey })
}

function earliestWordTimeFor(term: string, segments: SegmentIn): { start: number; end: number } | null
function earliestWordTimeFor(term: string, segments: SegmentIn[]): { start: number; end: number } | null
function earliestWordTimeFor(term: string, segments: SegmentIn | SegmentIn[]): { start: number; end: number } | null {
  const list: SegmentIn[] = Array.isArray(segments) ? segments : [segments]
  const lower = term.toLowerCase()
  let best: { start: number; end: number } | null = null
  for (const s of list) {
    const words = s.words || []
    for (const w of words) {
      if ((w.word || '').toLowerCase() === lower) {
        if (!best || w.start < best.start) best = { start: w.start, end: w.end }
      }
    }
  }
  return best
}

function applySpacing(cues: any[], minSpacingSec: number): any[] {
  const sorted = [...cues].sort((a, b) => (a.start ?? 0) - (b.start ?? 0))
  const kept: any[] = []
  let lastTime = -Infinity
  for (const c of sorted) {
    const t = c.start ?? 0
    if ((t - lastTime) >= minSpacingSec) {
      kept.push(c)
      lastTime = t
    }
  }
  return kept
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request)
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const incoming: any[] = Array.isArray(body?.segments) ? body.segments : []
    // Normalize segments to { text, start, end, words[] }
    const segments: SegmentIn[] = incoming.map((s: any) => ({
      id: s?.id,
      text: String(s?.text || ''),
      start: Number(s?.start ?? s?.startTime ?? 0),
      end: Number(s?.end ?? s?.endTime ?? (s?.start ?? s?.startTime ?? 0) + 0.6),
      words: Array.isArray(s?.words)
        ? s.words.map((w: any) => ({
            word: String(w?.word || w?.text_for_display || ''),
            start: Number(w?.start ?? w?.startTime ?? 0),
            end: Number(w?.end ?? w?.endTime ?? 0),
          }))
        : []
    }))
    const language: string = body?.language || 'auto'
    const maxCues: number = Math.max(1, Math.min(12, Number(body?.maxCues || 8)))
    const minSpacingSec: number = Math.max(1, Math.min(6, Number(body?.minSpacingSec || 2.5)))

    if (!segments.length) {
      return NextResponse.json({ success: false, error: 'No segments provided' }, { status: 400 })
    }

    const openai = getOpenAI()

    // Build compact prompt: only text + simple guidance
    const fullText = segments.map(s => s.text).join(' ')
    const prompt = [
      `You enhance a short video by proposing on-screen visuals for certain spoken words.`,
      `Language: ${language}.`,
      `Context: Transcript may describe places/objects that are already visible in-video.`,
      `Your task: Suggest sparse, meaningful visuals that add clarity, symbolism, humor, or emphasis.`,
      `Rules:`,
      `1) No Redundancy: Do NOT suggest a visual that duplicates what the video obviously already shows (e.g., if a villa is shown while "Landhausvilla" is said, don't add another villa).`,
      `2) Abstract/Emotional Focus: Prefer symbolic or emotional concepts: for "groß" pick ruler, skyscraper, globe, etc.`,
      `3) Cultural Sensitivity: Use universally understandable, non-offensive visuals.`,
      `4) Balance & Frequency: Only for strong keywords; keep suggestions concise.`,
      `5) Type selection: choose one of emoji | gif | icon | vector.`,
      `   - emoji: quick emotional/qualitative hints (🔥, 💡, 🏆).`,
      `   - gif: expressive reactions/humor/pop culture.`,
      `   - icon/vector: symbolic, abstract shapes (arrows, signs) or general concepts.`,
      `6) Timing: Each visual should appear briefly when the word occurs; default 3–5s, within 2–8s.`,
      `7) Output JSON only: { cues: [ { word, query, type, imageType, emoji, durationSec, reason } ] }`,
      `   - type ∈ { emoji | gif | icon | vector }`,
      `   - if type=emoji provide emoji, else provide query.`,
      `   - if type in {icon,vector} also provide imageType ∈ {vector|illustration}.`,
      `Transcript: "${fullText.slice(0, 6000)}"`
    ].join('\n')

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You extract visually depictable keywords from transcripts.' },
        { role: 'user', content: prompt }
      ]
    })

    const content = completion.choices[0]?.message?.content
    let parsed: any = {}
    try { parsed = content ? JSON.parse(content) : {} } catch { parsed = {} }
    const rawCues = Array.isArray(parsed?.cues) ? parsed.cues : []

    // Map LLM picks to actual times from word list, with spacing
    const mapped = rawCues.map((c: any) => {
      const text = String(c?.word || c?.query || '').trim()
      const type = (c?.type === 'emoji' || c?.type === 'gif' || c?.type === 'icon' || c?.type === 'vector') ? c.type : 'icon'
      const imageType = (c?.imageType === 'illustration') ? 'illustration' : 'vector'
      if (!text) return null
      const time = earliestWordTimeFor(text, segments) || { start: segments[0].start || 0, end: (segments[0].start || 0) + 0.6 }
      const d = Math.max(2, Math.min(8, Number(c?.durationSec || 4)))
      return {
        word: text,
        query: String(c?.query || text),
        type,
        imageType,
        emoji: (typeof c?.emoji === 'string' && c.emoji.length > 0) ? c.emoji : undefined,
        reason: String(c?.reason || 'visual keyword'),
        start: time.start,
        end: Math.max(time.end, time.start + d)
      }
    }).filter(Boolean) as any[]

    const spaced = applySpacing(mapped, minSpacingSec).slice(0, maxCues)

    return NextResponse.json({ success: true, data: { cues: spaced } })
  } catch (error: any) {
    console.error('💥 AI Icon Cues failed:', error)
    return NextResponse.json({ success: false, error: error?.message || 'AI Icon Cues failed' }, { status: 500 })
  }
}


