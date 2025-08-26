import type { ClipConfig } from './shotstack-service'

export interface CaptionClipInput {
  start_ms: number
  end_ms: number
  text: string
}

export function mapCaptionSegmentsToShotstackClips(
  styleId: string,
  captions: CaptionClipInput[]
): ClipConfig[] {
  const clips: ClipConfig[] = []
  for (const c of captions) {
    const start = c.start_ms / 1000
    const length = Math.max(0, (c.end_ms - c.start_ms) / 1000)
    let style: any = 'subtitle'
    // Clip-level allowed positions: top, topRight, right, bottomRight, bottom, bottomLeft, left, topLeft, center
    let position: any = 'bottom'
    let color = '#ffffff'
    let background: string | undefined = '#000000AA'
    let scale: number | undefined

    switch (styleId) {
      case 'minimal-bottom':
        style = 'subtitle'
        position = 'bottom'
        background = '#000000AA'
        break
      case 'boxed-bold':
        style = 'chunk'
        position = 'bottom'
        background = '#000000CC'
        break
      case 'kinetic-words':
        // Shotstack doesn't support a 'kinetic' style keyword – map to a valid style
        style = 'marker'
        position = 'center'
        background = undefined
        break
      case 'neon-outline':
        style = 'future'
        color = '#39FF14'
        background = undefined
        break
      case 'split-center':
        style = 'subtitle'
        position = 'center'
        background = undefined
        break
      case 'instagram-viral':
        style = 'chunk'
        position = 'center'
        background = '#00000099'
        scale = 1.0
        break
      default:
        style = 'subtitle'
        position = 'bottomCenter'
        background = '#000000AA'
    }

    const clip: ClipConfig = {
      asset: {
        type: 'title',
        text: c.text,
        style,
        color,
        background,
      } as any,
      start,
      length,
      opacity: 1,
      // Position is a clip-level property in Shotstack
      position,
      // Clamp scale to a safe range (Shotstack expects 0-1 typically)
      scale: Math.min(scale ?? 1, 1),
    }
    clips.push(clip)
  }
  return clips
}

export function generateSRT(captions: CaptionClipInput[]): string {
  function format(ms: number): string {
    const totalMs = Math.max(0, Math.round(ms))
    const hours = Math.floor(totalMs / 3600000)
    const minutes = Math.floor((totalMs % 3600000) / 60000)
    const seconds = Math.floor((totalMs % 60000) / 1000)
    const millis = totalMs % 1000
    const pad = (n: number, w = 2) => n.toString().padStart(w, '0')
    const padMs = (n: number) => n.toString().padStart(3, '0')
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${padMs(millis)}`
  }

  const lines: string[] = []
  captions
    .sort((a, b) => a.start_ms - b.start_ms)
    .forEach((c, idx) => {
      lines.push(String(idx + 1))
      lines.push(`${format(c.start_ms)} --> ${format(c.end_ms)}`)
      lines.push(c.text)
      lines.push('')
    })
  return lines.join('\n')
}


