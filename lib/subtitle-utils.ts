/**
 * Minimal subtitle utilities - only essential functions
 * For subtitle creation logic, use useVideoEditor.ts and useSubtitleSettings.ts
 */

export interface SubtitleSegment {
  start_ms: number
  end_ms: number
  text: string
}

export interface CaptionClipInput {
  start_ms: number
  end_ms: number
  text: string
}

export interface VideoSegment {
  start_ms: number
  end_ms: number
  keep: boolean
}

/**
 * Generate subtitles based on script and video segments
 * Simple client-safe version for backward compatibility
 */
export function generateSubtitlesFromScript(
  videoSegments: VideoSegment[],
  scriptText: string
): SubtitleSegment[] {
  const subtitles: SubtitleSegment[] = []
  const scriptSentences = scriptText.split(/[.!?]+/).map(s => s.trim()).filter(Boolean)
  
  let accumulatedTime = 0
  let scriptIndex = 0
  
  for (const segment of videoSegments.filter(seg => seg.keep)) {
    const segmentDuration = segment.end_ms - segment.start_ms
    
    if (scriptIndex < scriptSentences.length) {
      const scriptSentence = scriptSentences[scriptIndex].trim()
      
      if (scriptSentence.length > 0) {
        subtitles.push({
          start_ms: accumulatedTime,
          end_ms: accumulatedTime + segmentDuration,
          text: scriptSentence
        })
        scriptIndex++
      }
    }
    
    accumulatedTime += segmentDuration
  }
  
  return subtitles
}

/**
 * Format milliseconds to SRT time format (HH:MM:SS,mmm)
 */
export function formatSRTTime(ms: number): string {
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  const milliseconds = ms % 1000
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`
}

// Shotstack-specific caption mapping for timeline builder
export function mapCaptionSegmentsToShotstackClips(
  styleId: string,
  captions: CaptionClipInput[]
): any[] {
  const clips: any[] = []
  for (const c of captions) {
    const start = c.start_ms / 1000
    const length = Math.max(0, (c.end_ms - c.start_ms) / 1000)
    let style: any = 'subtitle'
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

    const clip: any = {
      asset: {
        type: 'title',
        text: c.text,
        style,
        color,
        background,
      },
      start,
      length,
      opacity: 1,
      position,
      scale: Math.min(scale ?? 1, 1),
    }
    clips.push(clip)
  }
  return clips
}