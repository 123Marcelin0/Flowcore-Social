import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

type Word = { word: string; start: number; end: number }
type SegmentIn = { id?: string; text: string; start: number; end: number; words?: Word[] }

// Authentication helper (same pattern as other routes)
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

function applySpacing<T extends { start?: number }>(items: T[], minSpacingSec: number): T[] {
  const sorted = [...items].sort((a, b) => (a.start ?? 0) - (b.start ?? 0))
  const kept: T[] = []
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
    const language: string = body?.language || 'auto'
    const maxSuggestions: number = Math.max(1, Math.min(16, Number(body?.maxSuggestions || 10)))
    const minSpacingSec: number = Math.max(1, Math.min(6, Number(body?.minSpacingSec || 2.5)))

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

    if (!segments.length) {
      return NextResponse.json({ success: false, error: 'No segments provided' }, { status: 400 })
    }

    const openai = getOpenAI()

    // Build prompt per spec: director role and minimal, high-impact suggestions
    const numberedLines = segments.map((s, i) => `${i + 1}. ${s.text}`).join('\n')
    const system = [
      'You are a creative assistant for video editing who behaves like a thoughtful visual director, not a keyword matcher.',
      'Your job: suggest high-quality, meaningful visuals (Pixabay images or emojis) that enrich a transcript.',
      'Decide per line if a visual adds symbolic/emotional value; otherwise choose none.'
    ].join(' ')

    const user = [
      `Language: ${language}.`,
      'Rules:',
      '- Only suggest visuals when they add symbolic/emotional value.',
      "- Avoid literal duplication of visuals already likely shown; don't repeat obvious objects.",
      '- Prefer abstract/metaphorical imagery over clichés.',
      '- Minimalism: fewer, higher-impact visuals.',
      '- Emojis only if universally recognizable and they enhance meaning.',
      '- Return Pixabay-ready search queries (2–5 words, abstract/symbolic).',
      '',
      'Output JSON object with field "suggestions" as an array of items with:',
      '{ "transcript_line": string, "keyword": string, "visual_type": "emoji" | "pixabay_image" | "none", "pixabay_query": string | null, "emoji": string | null, "reason": string }',
      '',
      'Transcript lines:',
      numberedLines
    ].join('\n')

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      // Use seed for reproducibility with models that fix temperature
      seed: 0
    })

    const content = completion.choices[0]?.message?.content
    let parsed: any = {}
    try { parsed = content ? JSON.parse(content) : {} } catch { parsed = {} }
    const raw = Array.isArray(parsed?.suggestions) ? parsed.suggestions : []

    // Map to include timings where possible
    type Suggestion = {
      transcript_line: string
      keyword: string
      visual_type: 'emoji' | 'pixabay_image' | 'none'
      pixabay_query?: string | null
      emoji?: string | null
      reason?: string
      start?: number
      end?: number
    }

    const mapped: Suggestion[] = raw.map((r: any) => {
      const transcript_line = String(r?.transcript_line || '').trim()
      const keyword = String(r?.keyword || '').trim()
      const visual_type = (r?.visual_type === 'emoji' || r?.visual_type === 'pixabay_image' || r?.visual_type === 'none') ? r.visual_type : 'none'
      const pixabay_query = r?.pixabay_query ? String(r.pixabay_query).trim() : null
      const emoji = r?.emoji ? String(r.emoji) : null
      const reason = r?.reason ? String(r.reason) : ''

      // Timing: prefer keyword timing; else map to line segment time
      let t = keyword ? earliestWordTimeFor(keyword, segments) : null
      if (!t) {
        // find a segment with matching text
        const seg = segments.find(s => s.text.trim() === transcript_line)
        if (seg) t = { start: seg.start, end: seg.end }
      }
      const start = t ? t.start : segments[0].start
      const end = t ? Math.max(t.end, (t.start + 4)) : (segments[0].start + 4)

      return { transcript_line, keyword, visual_type, pixabay_query, emoji, reason, start, end }
    })
    .filter(Boolean)
    .filter(s => s.transcript_line.length > 0)

    // Drop none suggestions up-front; spacing applied on the remainder
    const withVisuals = mapped.filter(m => m.visual_type !== 'none')
    const spaced = applySpacing(withVisuals, minSpacingSec).slice(0, maxSuggestions)

    return NextResponse.json({ success: true, data: { suggestions: spaced } })
  } catch (error: any) {
    console.error('💥 AI Visual Director failed:', error)
    return NextResponse.json({ success: false, error: error?.message || 'AI Visual Director failed' }, { status: 500 })
  }
}










