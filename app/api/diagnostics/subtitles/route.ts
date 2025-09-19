import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'
// Centralized subtitles: Keep minimal util import for diagnostics only
import { generateSubtitlesFromScript } from '@/lib/subtitle-utils'
import { extractAudioServerSide } from '@/lib/server-audio-extractor-ffmpeg'
import os from 'os'
import path from 'path'
import fs from 'fs'
import { spawn } from 'child_process'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { uploadId, runVad = false } = body || {}
    if (!uploadId) {
      return NextResponse.json({ success: false, error: 'uploadId is required' }, { status: 400 })
    }

    const db = supabaseAdmin || supabase
    const { data: media, error } = await db
      .from('media_files')
      .select('id, storage_url, metadata')
      .eq('id', uploadId)
      .single()

    if (error || !media) {
      return NextResponse.json({ success: false, error: 'Media not found' }, { status: 404 })
    }

    const storageUrl: string | undefined = (media as any).storage_url
    const asr = (media as any).metadata?.asr || (media as any).metadata?.openai_transcription
    const segments = asr?.segments || []
    const words = asr?.words || []

    // Build word list for processor (fallback to uniform words if missing)
    let wordList: Array<{ word: string; start: number; end: number; confidence?: number }> = []
    if (Array.isArray(words) && words.length > 0) {
      wordList = words.map((w: any) => ({ word: String(w.word || w.text || ''), start: Number(w.start || 0), end: Number(w.end || 0), confidence: Number(w.confidence || 0.9) }))
    } else if (Array.isArray(segments) && segments.length > 0) {
      // Evenly distribute words from text within segment when word timing missing
      for (const s of segments) {
        const tokens = String(s.text || '').split(/\s+/).filter(Boolean)
        if (tokens.length === 0) continue
        const start = Number(s.start || 0)
        const end = Number(s.end || 0)
        const total = Math.max(0.001, end - start)
        tokens.forEach((t: string, i: number) => {
          const ts = start + (i / tokens.length) * total
          const te = start + ((i + 1) / tokens.length) * total
          wordList.push({ word: t, start: ts, end: te, confidence: 0.7 })
        })
      }
    }

    // Create basic video segments for subtitle generation
    const videoSegments = segments.map((seg: any) => ({
      start_ms: Number(seg.start || 0) * 1000,
      end_ms: Number(seg.end || 0) * 1000,
      keep: true
    }))
    
    const scriptText = segments.map((seg: any) => seg.text || '').join(' ')
    const chunks = generateSubtitlesFromScript(videoSegments, scriptText)

    const stats = {
      hasWordTiming: Array.isArray(words) && words.length > 0,
      segmentCount: segments.length || 0,
      wordCount: wordList.length,
      chunkCount: chunks.length,
      avgChunkDuration: chunks.length ? (chunks.reduce((s, c) => s + ((c.end_ms - c.start_ms) / 1000), 0) / chunks.length) : 0,
      avgCharsPerChunk: chunks.length ? (chunks.reduce((s, c) => s + (c.text || '').length, 0) / chunks.length) : 0,
      twoLineShare: 0 // Simplified approach doesn't use multi-line chunks
    }

    let vad: any = null
    if (runVad && storageUrl) {
      try {
        // Extract audio (server-side) and run ffmpeg silencedetect for VAD pauses
        const mediaResp = await fetch(storageUrl)
        if (!mediaResp.ok) throw new Error(`Failed to fetch media: ${mediaResp.status}`)
        const mediaArrayBuffer = await mediaResp.arrayBuffer()
        const extracted = await extractAudioServerSide(mediaArrayBuffer, mediaResp.headers.get('content-type') || 'video/mp4')
        const audioBuf: Buffer = Buffer.from(extracted.audioBuffer)
        const ext = extracted.mimeType.includes('wav') ? 'wav' : extracted.mimeType.includes('mp3') ? 'mp3' : 'm4a'
        const tmpPath = path.join(os.tmpdir(), `vad-${uploadId}-${Date.now()}.${ext}`)
        await fs.promises.writeFile(tmpPath, audioBuf)

        const args = ['-i', tmpPath, '-af', 'silencedetect=n=-30dB:d=0.2', '-f', 'null', '-']
        let ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg'
        try {
          const mod: any = await import('@ffmpeg-installer/ffmpeg')
          const installerPath = mod?.default?.path || mod?.path
          if (installerPath) ffmpegPath = installerPath
        } catch {}
        const ff = spawn(ffmpegPath, args)
        let stderr = ''
        ff.stderr.on('data', (d) => { stderr += d.toString() })
        await new Promise<void>((resolve) => ff.on('close', () => resolve()))
        try { fs.unlinkSync(tmpPath) } catch {}

        const pauseEntries: Array<{ start: number; end: number; dur: number }> = []
        const reStart = /silence_start:\s*([0-9\.]+)/
        const reEnd = /silence_end:\s*([0-9\.]+)\s*\|\s*silence_duration:\s*([0-9\.]+)/
        let lastStart: number | null = null
        stderr.split('\n').forEach((line) => {
          const m1 = line.match(reStart)
          if (m1) lastStart = parseFloat(m1[1])
          const m2 = line.match(reEnd)
          if (m2 && lastStart != null) {
            const end = parseFloat(m2[1])
            const dur = parseFloat(m2[2])
            pauseEntries.push({ start: lastStart, end, dur })
            lastStart = null
          }
        })
        vad = { pauses: pauseEntries, longPauses: pauseEntries.filter(p => p.dur >= 0.45) }
      } catch (e: any) {
        vad = { error: String(e) }
      }
    }

    return NextResponse.json({
      success: true,
      diagnostics: {
        hasWordTiming: stats.hasWordTiming,
        segmentCount: stats.segmentCount,
        wordCount: stats.wordCount,
        chunkCount: stats.chunkCount,
        avgChunkDuration: Number(stats.avgChunkDuration.toFixed(3)),
        avgCharsPerChunk: Math.round(stats.avgCharsPerChunk),
        twoLineShare: Number(stats.twoLineShare.toFixed(2)),
        vad
      },
      sample: chunks.slice(0, 3)
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
















