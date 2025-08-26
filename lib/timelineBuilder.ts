import type { EditConfig, TimelineConfig, TrackConfig, ClipConfig } from './shotstack-service'
import { mapCaptionSegmentsToShotstackClips } from './subtitleStyles'

export interface CutItem {
  start_ms: number
  end_ms: number
  reason?: string
  score?: number
}

export interface CaptionClip {
  start_ms: number
  end_ms: number
  text: string
}

export interface OverlayAsset {
  src: string
  start_ms: number
  end_ms: number
  position?: 'center' | 'top' | 'topRight' | 'right' | 'bottomRight' | 'bottom' | 'bottomLeft' | 'left' | 'topLeft'
  scale?: number
}

export interface BuildTimelineParams {
  sourceUrl: string
  cutList: CutItem[]
  captionClips: CaptionClip[]
  overlayAssets: OverlayAsset[]
  styleId: string
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:5'
}

export function buildShotstackTimeline(params: BuildTimelineParams): EditConfig {
  const {
    sourceUrl,
    cutList,
    captionClips,
    overlayAssets,
    styleId,
    aspectRatio = '16:9',
  } = params

  console.log('🎬 Timeline builder input:', {
    sourceUrl: sourceUrl?.slice(-50), // Last 50 chars
    cutListLength: cutList.length,
    captionClipsLength: captionClips.length,
    overlayAssetsLength: overlayAssets.length,
    styleId,
    cutListSample: cutList.slice(0, 2),
    captionClipsSample: captionClips.slice(0, 2)
  })

  const videoTrack: TrackConfig = { clips: [] }
  const captionsTrack: TrackConfig = { clips: [] }
  const overlaysTrack: TrackConfig = { clips: [] }

  // Base video clips with crossfade transitions
  if (cutList.length === 0) {
    // No cuts available - create a full video clip (fallback)
    console.log('⚠️ No cuts found, creating full video clip (30s max)')
    const maxDuration = Math.min(30, captionClips.length > 0 ? 
      Math.max(...captionClips.map(c => c.end_ms / 1000)) : 30)
    
    const clip: ClipConfig = {
      asset: {
        type: 'video',
        src: sourceUrl,
        trim: 0,
      } as any,
      start: 0,
      length: maxDuration,
      fit: 'cover',
    }
    videoTrack.clips.push(clip)
  } else {
    // Use the cuts from the cut list
    for (let i = 0; i < cutList.length; i++) {
      const cut = cutList[i]
      const startSec = cut.start_ms / 1000
      const lengthSec = Math.max(0, (cut.end_ms - cut.start_ms) / 1000)
      const transitionIn = i === 0 ? undefined : { in: 'fade' as const }
      const transitionOut = i === cutList.length - 1 ? undefined : { out: 'fade' as const }

      const clip: ClipConfig = {
        asset: {
          type: 'video',
          src: sourceUrl,
          trim: startSec,
        } as any,
        start: i === 0 ? 0 : videoTrack.clips.reduce((acc, c) => acc + c.length, 0),
        length: lengthSec,
        fit: 'cover',
        transition: { ...(transitionIn || {}), ...(transitionOut || {}) },
      }
      videoTrack.clips.push(clip)
    }
  }

  console.log('📹 Video track created:', {
    videoClipsCount: videoTrack.clips.length,
    totalDuration: videoTrack.clips.reduce((acc, c) => acc + c.length, 0)
  })

  const mappedCaptions = mapCaptionSegmentsToShotstackClips(styleId, captionClips)
  captionsTrack.clips.push(...mappedCaptions)
  
  console.log('📝 Caption track created:', {
    captionClipsCount: captionsTrack.clips.length,
    mappedCaptionsCount: mappedCaptions.length
  })

  // Overlays: images positioned over time windows
  for (const ov of overlayAssets) {
    const startSec = ov.start_ms / 1000
    const lengthSec = Math.max(0, (ov.end_ms - ov.start_ms) / 1000)
    const clip: ClipConfig = {
      asset: {
        type: 'image',
        src: ov.src,
      } as any,
      start: startSec,
      length: lengthSec,
      position: ov.position || 'topRight',
      scale: ov.scale ?? 0.5,
      opacity: 0.95,
    }
    overlaysTrack.clips.push(clip)
  }

  const tracks: TrackConfig[] = []
  if (videoTrack.clips.length) tracks.push(videoTrack)
  if (overlaysTrack.clips.length) tracks.push(overlaysTrack)
  if (captionsTrack.clips.length) tracks.push(captionsTrack)

  // Validate that we have at least a video track
  if (!videoTrack.clips.length) {
    throw new Error('No video clips in timeline - this will fail at Shotstack')
  }

  // Validate video clips have valid properties
  for (const clip of videoTrack.clips) {
    if (!clip.asset?.src) {
      throw new Error('Video clip missing source URL')
    }
    if (clip.length <= 0) {
      throw new Error(`Video clip has invalid length: ${clip.length}`)
    }
  }

  const timeline: TimelineConfig = {
    tracks,
    background: '#000000',
  }

  const output: EditConfig['output'] = {
    format: 'mp4',
    resolution: 'full-hd',
    aspectRatio,
  }

  console.log('🎬 Final timeline summary:', {
    tracksCount: tracks.length,
    videoClipsCount: videoTrack.clips.length,
    captionClipsCount: captionsTrack.clips.length,
    overlayClipsCount: overlaysTrack.clips.length,
    totalDuration: videoTrack.clips.reduce((acc, c) => acc + c.length, 0)
  })

  return {
    timeline,
    output,
  }
}


