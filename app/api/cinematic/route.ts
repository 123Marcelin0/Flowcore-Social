import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'
import { spawn } from 'child_process'

function getFFmpegPath(): string {
  try {
    // Prefer package if installed
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg')
    return ffmpegInstaller.path
  } catch {
    return process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
  }
}

async function runFFmpeg(ffmpegPath: string, args: string[]): Promise<{ ok: boolean; stderr: string }> {
  return new Promise((resolve) => {
    const proc = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    proc.stderr.on('data', (d) => { stderr += d.toString() })
    proc.on('close', (code) => resolve({ ok: code === 0, stderr }))
    proc.on('error', (e) => resolve({ ok: false, stderr: String(e) }))
  })
}

export async function POST(req: NextRequest) {
  try {
    // Parse form-data: file or url, plus preset/zoom/aspect
    const ct = req.headers.get('content-type') || ''
    if (!ct.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Expected multipart/form-data with fields: file|url, preset, zoomType, zoomAmount, aspect' }, { status: 400 })
    }
    const form = await req.formData()

    const preset = String(form.get('preset') || 'lightroom_clean') as 'lightroom_clean' | 'teal_orange' | 'moody'
    const zoomType = String(form.get('zoomType') || 'in') as 'in' | 'out' | 'none'
    const zoomAmount = Math.max(1.0, parseFloat(String(form.get('zoomAmount') || '1.12')) || 1.12)
    const aspect = String(form.get('aspect') || 'auto') as 'auto' | 'vertical' | 'square' | 'widescreen'

    const fileOrUrl = form.get('file') as unknown as File | null
    const url = String(form.get('url') || '')

    let inputPath = ''
    let cleanupInput = false

    if (fileOrUrl && (fileOrUrl as any).arrayBuffer) {
      const buf = Buffer.from(await fileOrUrl.arrayBuffer())
      const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'cinematic-in-'))
      inputPath = path.join(tmp, (fileOrUrl as any).name || 'input.mp4')
      await fs.writeFile(inputPath, buf)
      cleanupInput = true
    } else if (url) {
      const r = await fetch(url)
      if (!r.ok) return NextResponse.json({ error: `Failed to fetch url: ${r.status}` }, { status: 400 })
      const ab = await r.arrayBuffer()
      const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'cinematic-in-'))
      inputPath = path.join(tmp, 'input.mp4')
      await fs.writeFile(inputPath, Buffer.from(ab))
      cleanupInput = true
    } else {
      return NextResponse.json({ error: 'No input provided. Include a video file under "file" or a "url".' }, { status: 400 })
    }

    const ffmpeg = getFFmpegPath()

    // Decide output dimensions by aspect
    const dims = aspect === 'vertical' ? '1080x1920' : aspect === 'square' ? '1080x1080' : aspect === 'widescreen' ? '1920x1080' : '1280x720'

    // Map preset to filters. Prefer LUT if present, else fallback to eq/hue
    const publicDir = path.join(process.cwd(), 'public')
    const lutDir = path.join(publicDir, 'luts')
    const lutPath = preset === 'lightroom_clean' ? path.join(lutDir, 'lightroom_clean.cube')
                  : preset === 'teal_orange' ? path.join(lutDir, 'teal_orange.cube')
                  : path.join(lutDir, 'moody.cube')

    let grade = ''
    try {
      await fs.access(lutPath)
      grade = `lut3d='${lutPath.replace(/'/g, "'\\''")}'`
    } catch {
      if (preset === 'lightroom_clean') grade = 'eq=brightness=0.04:contrast=1.08:saturation=1.06'
      else if (preset === 'teal_orange') grade = 'eq=brightness=0.02:contrast=1.12:saturation=1.05,hue=h=-6*PI/180'
      else grade = 'eq=brightness=-0.08:contrast=1.18:saturation=0.90'
    }

    const vignette = 'vignette=PI/5:0.2'
    const sharp = 'unsharp=luma_msize_x=7:luma_msize_y=7:luma_amount=1.2'
    const grain = 'noise=alls=6:allf=t'

    // Zoom animation using zoompan (frame-by-frame zoom). Keep gentle step.
    const step = Math.max(0.0004, (zoomAmount - 1.0) / 600)
    const zIn = `if(lte(on,1),1.0,min(zoom+${step.toFixed(6)},${zoomAmount.toFixed(4)}))`
    const zOut = `if(lte(on,1),${zoomAmount.toFixed(4)},max(zoom-${step.toFixed(6)},1.0))`
    const zExpr = zoomType === 'in' ? zIn : zoomType === 'out' ? zOut : '1.0'
    const zoompan = `zoompan=z='${zExpr}':d=1:x='iw/2-(iw/zoom)/2':y='ih/2-(ih/zoom)/2':s=${dims}`

    const outDir = path.join(publicDir, 'cinematic')
    await fs.mkdir(outDir, { recursive: true })
    const outPath = path.join(outDir, `cin_${Date.now()}.mp4`)

    const vf = `${zoompan},${grade},${vignette},${sharp},${grain},format=yuv420p`
    const args = [
      '-y',
      '-i', inputPath,
      '-an', // drop audio if resampling not in scope; remove to keep audio
      '-vf', vf,
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '20',
      '-movflags', '+faststart',
      outPath
    ]

    // Verify ffmpeg availability
    const ffmpegCheck = await runFFmpeg(ffmpeg, ['-version'])
    if (!ffmpegCheck.ok) {
      // Fallback stub
      const tmpCopy = path.join(outDir, `stub_${Date.now()}.mp4`)
      await fs.copyFile(inputPath, tmpCopy)
      cleanupInput && await fs.rm(path.dirname(inputPath), { recursive: true, force: true }).catch(() => {})
      return NextResponse.json({ url: `/cinematic/${path.basename(tmpCopy)}`, stub: true, note: 'FFmpeg unavailable. Install system ffmpeg or @ffmpeg-installer/ffmpeg for production rendering.' })
    }

    const run = await runFFmpeg(ffmpeg, args)
    cleanupInput && await fs.rm(path.dirname(inputPath), { recursive: true, force: true }).catch(() => {})
    if (!run.ok) {
      return NextResponse.json({ error: 'FFmpeg failed', details: run.stderr.slice(0, 8000) }, { status: 500 })
    }

    return NextResponse.json({ url: `/cinematic/${path.basename(outPath)}` })
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 })
  }
}


