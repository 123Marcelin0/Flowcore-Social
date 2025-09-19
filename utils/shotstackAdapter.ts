import { EDLComposition, EDLClip, EDLKeyframe, EDLTransition, EDLGlobalEffect } from './cutPlanToEDL'

// Shotstack API types based on their official documentation
export interface ShotstackEdit {
  timeline: ShotstackTimeline
  output: ShotstackOutput
  merge?: ShotstackMerge[]
  callback?: string
  disk?: 'local' | 's3' | 'gcs'
}

export interface ShotstackTimeline {
  soundtrack?: ShotstackSoundtrack
  background?: string
  fonts?: ShotstackFont[]
  tracks: ShotstackTrack[]
  cache?: boolean
}

export interface ShotstackTrack {
  clips: ShotstackClip[]
}

export interface ShotstackClip {
  asset: ShotstackAsset
  start: number
  length: number
  fit?: 'crop' | 'scale' | 'none'
  scale?: number
  position?: 'top' | 'topRight' | 'right' | 'bottomRight' | 'bottom' | 'bottomLeft' | 'left' | 'topLeft' | 'center'
  offset?: ShotstackOffset
  transition?: ShotstackTransition
  effect?: 'zoomIn' | 'zoomOut' | 'slideLeft' | 'slideRight' | 'slideUp' | 'slideDown'
  filter?: 'boost' | 'contrast' | 'darken' | 'greyscale' | 'lighten' | 'muted' | 'negative'
  opacity?: number
  transform?: ShotstackTransform
  volume?: number
}

export interface ShotstackAsset {
  type: 'video' | 'audio' | 'image' | 'title' | 'luma' | 'html'
  src?: string
  text?: string
  style?: string
  font?: string
  size?: number
  color?: string
  background?: string
  position?: 'left' | 'center' | 'right'
  offset?: ShotstackOffset
  width?: number
  height?: number
}

export interface ShotstackOffset {
  x?: number
  y?: number
}

export interface ShotstackTransform {
  rotate?: ShotstackRotate
  skew?: ShotstackSkew
  flip?: ShotstackFlip
}

export interface ShotstackRotate {
  angle?: number
}

export interface ShotstackSkew {
  x?: number
  y?: number
}

export interface ShotstackFlip {
  horizontal?: boolean
  vertical?: boolean
}

export interface ShotstackTransition {
  in?: 'fade' | 'reveal' | 'wipeLeft' | 'wipeRight' | 'slideLeft' | 'slideRight' | 'slideUp' | 'slideDown' | 'carouselLeft' | 'carouselRight' | 'carouselUp' | 'carouselDown' | 'shuffleTopRight' | 'shuffleRightTop' | 'shuffleRightBottom' | 'shuffleBottomRight' | 'shuffleBottomLeft' | 'shuffleLeftBottom' | 'shuffleLeftTop' | 'shuffleTopLeft' | 'zoom'
  out?: 'fade' | 'reveal' | 'wipeLeft' | 'wipeRight' | 'slideLeft' | 'slideRight' | 'slideUp' | 'slideDown' | 'carouselLeft' | 'carouselRight' | 'carouselUp' | 'carouselDown' | 'shuffleTopRight' | 'shuffleRightTop' | 'shuffleRightBottom' | 'shuffleBottomRight' | 'shuffleBottomLeft' | 'shuffleLeftBottom' | 'shuffleLeftTop' | 'shuffleTopLeft' | 'zoom'
}

export interface ShotstackOutput {
  format: 'mp4' | 'gif' | 'jpg' | 'png' | 'bmp' | 'mp3'
  resolution: '240p' | '360p' | '480p' | '720p' | '1080p' | '4k' | 'preview'
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:5' | '4:3'
  size?: ShotstackSize
  fps?: number
  scaleTo?: 'preview' | 'crop' | 'pad'
  quality?: 'draft' | 'low' | 'medium' | 'high'
  repeat?: boolean
  range?: ShotstackRange
  poster?: ShotstackPoster
  thumbnail?: ShotstackThumbnail
  destinations?: ShotstackDestination[]
}

export interface ShotstackSize {
  width?: number
  height?: number
}

export interface ShotstackRange {
  start?: number
  length?: number
}

export interface ShotstackPoster {
  capture: number
}

export interface ShotstackThumbnail {
  capture: number
  scale: number
}

export interface ShotstackDestination {
  provider: 's3' | 'gcs' | 'mux'
  options: { [key: string]: any }
}

export interface ShotstackSoundtrack {
  src: string
  effect?: 'fadeIn' | 'fadeOut' | 'fadeInOut'
  volume?: number
}

export interface ShotstackFont {
  src: string
}

export interface ShotstackMerge {
  find: string
  replace: string
}

/**
 * Convert EDL to Shotstack API format
 */
export function edlToShotstack(
  edl: EDLComposition, 
  options: ShotstackAdapterOptions = {}
): ShotstackEdit {
  console.log(`🎬 Converting EDL ${edl.id} to Shotstack format`)
  
  const startTime = Date.now()
  
  try {
    const edit: ShotstackEdit = {
      timeline: {
        tracks: [],
        cache: options.enableCache ?? true
      },
      output: createShotstackOutput(edl, options)
    }
    
    // Add callback URL if provided
    if (options.callbackUrl) {
      edit.callback = options.callbackUrl
    }
    
    // Convert tracks
    const shotstackTracks = convertTracksToShotstack(edl, options)
    edit.timeline.tracks = shotstackTracks
    
    // Add background music if specified
    if (edl.globalEffects.some(e => e.type === 'background_music' && e.enabled)) {
      const musicEffect = edl.globalEffects.find(e => e.type === 'background_music')
      if (musicEffect && options.backgroundMusicUrl) {
        edit.timeline.soundtrack = {
          src: options.backgroundMusicUrl,
          volume: musicEffect.properties.volume || 0.3,
          effect: 'fadeInOut'
        }
      }
    }
    
    // Add custom fonts if needed
    if (options.customFonts && options.customFonts.length > 0) {
      edit.timeline.fonts = options.customFonts.map(font => ({ src: font }))
    }
    
    // Add merge fields if provided
    if (options.mergeFields) {
      edit.merge = Object.entries(options.mergeFields).map(([find, replace]) => ({
        find,
        replace: String(replace)
      }))
    }
    
    console.log(`✅ Shotstack conversion completed in ${Date.now() - startTime}ms`)
    console.log(`📊 Generated ${edit.timeline.tracks.length} tracks`)
    
    return edit
    
  } catch (error) {
    console.error('❌ Shotstack conversion failed:', error)
    throw new Error(`Shotstack conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export interface ShotstackAdapterOptions {
  enableCache?: boolean
  callbackUrl?: string
  backgroundMusicUrl?: string
  customFonts?: string[]
  mergeFields?: { [key: string]: any }
  quality?: 'draft' | 'low' | 'medium' | 'high'
  outputFormat?: 'mp4' | 'gif'
  subtitleStyle?: {
    fontFamily?: string
    fontSize?: number
    color?: string
    backgroundColor?: string
  }
  // Transform options
  enableKeyframeInterpolation?: boolean
  maxTransformsPerClip?: number
  simplifyTransforms?: boolean
}

/**
 * Create Shotstack output configuration
 */
function createShotstackOutput(edl: EDLComposition, options: ShotstackAdapterOptions): ShotstackOutput {
  // Determine aspect ratio from target format
  let aspectRatio: ShotstackOutput['aspectRatio'] = '16:9'
  let resolution: ShotstackOutput['resolution'] = '1080p'
  
  switch (edl.metadata.targetFormat) {
    case 'instagram_reels':
    case 'youtube_shorts':
    case 'tiktok':
      aspectRatio = '9:16'
      resolution = '1080p'
      break
    case 'youtube_landscape':
      aspectRatio = '16:9'
      resolution = '1080p'
      break
    default:
      // Use EDL resolution to determine aspect ratio
      const edlRatio = edl.resolution.width / edl.resolution.height
      if (Math.abs(edlRatio - (9/16)) < 0.1) aspectRatio = '9:16'
      else if (Math.abs(edlRatio - 1) < 0.1) aspectRatio = '1:1'
      else if (Math.abs(edlRatio - (4/5)) < 0.1) aspectRatio = '4:5'
      else aspectRatio = '16:9'
  }
  
  return {
    format: options.outputFormat || 'mp4',
    resolution,
    aspectRatio,
    fps: Math.min(60, edl.fps), // Shotstack max is 60fps
    quality: options.quality || 'medium',
    scaleTo: 'crop'
  }
}

/**
 * Convert EDL tracks to Shotstack tracks
 */
function convertTracksToShotstack(edl: EDLComposition, options: ShotstackAdapterOptions): ShotstackTrack[] {
  const tracks: ShotstackTrack[] = []
  
  // Process video tracks first (they go on top)
  const videoTracks = edl.tracks.filter(track => track.type === 'video')
  for (const track of videoTracks) {
    const shotstackTrack = convertVideoTrackToShotstack(track, edl, options)
    if (shotstackTrack.clips.length > 0) {
      tracks.push(shotstackTrack)
    }
  }
  
  // Process subtitle tracks
  const subtitleTracks = edl.tracks.filter(track => track.type === 'subtitle')
  for (const track of subtitleTracks) {
    const shotstackTrack = convertSubtitleTrackToShotstack(track, edl, options)
    if (shotstackTrack.clips.length > 0) {
      tracks.push(shotstackTrack)
    }
  }
  
  // Audio tracks are handled differently - they're usually part of video clips
  // or added as soundtrack at the timeline level
  
  return tracks
}

/**
 * Convert video track to Shotstack format
 */
function convertVideoTrackToShotstack(
  track: any, 
  edl: EDLComposition, 
  options: ShotstackAdapterOptions
): ShotstackTrack {
  const clips: ShotstackClip[] = []
  
  for (const edlClip of track.clips) {
    if (edlClip.type !== 'video') continue
    
    const shotstackClip = convertVideoClipToShotstack(edlClip, edl, options)
    if (shotstackClip) {
      clips.push(shotstackClip)
    }
  }
  
  return { clips }
}

/**
 * Convert video clip to Shotstack format
 */
function convertVideoClipToShotstack(
  clip: EDLClip, 
  edl: EDLComposition, 
  options: ShotstackAdapterOptions
): ShotstackClip | null {
  if (!clip.sourceFile) {
    console.warn(`Clip ${clip.id} missing source file`)
    return null
  }
  
  const length = clip.endTime - clip.startTime
  
  const shotstackClip: ShotstackClip = {
    asset: {
      type: 'video',
      src: clip.sourceFile,
      // Shotstack will handle trimming based on the source timeline
    },
    start: clip.startTime,
    length: length,
    fit: 'crop', // Default fit mode
    volume: clip.properties.volume || 1.0
  }
  
  // Handle transforms - convert keyframes to Shotstack transforms
  if (clip.keyframes.length > 0) {
    const transforms = convertKeyframesToShotstackTransform(clip.keyframes, options)
    if (transforms.scale !== undefined || transforms.offset) {
      if (transforms.scale) shotstackClip.scale = transforms.scale
      if (transforms.offset) shotstackClip.offset = transforms.offset
      if (transforms.transform) shotstackClip.transform = transforms.transform
    }
  }
  
  // Handle position
  if (clip.properties.position) {
    shotstackClip.offset = {
      x: clip.properties.position.x,
      y: clip.properties.position.y
    }
  }
  
  // Handle opacity
  if (clip.properties.opacity !== undefined) {
    shotstackClip.opacity = clip.properties.opacity
  }
  
  // Handle transitions
  if (clip.transitions && clip.transitions.length > 0) {
    const transition = convertEDLTransitionToShotstack(clip.transitions[0])
    if (transition) {
      shotstackClip.transition = transition
    }
  }
  
  // Handle color grading as filter
  if (clip.properties.colorGrading) {
    const filter = convertColorGradingToFilter(clip.properties.colorGrading)
    if (filter) {
      shotstackClip.filter = filter
    }
  }
  
  return shotstackClip
}

/**
 * Convert subtitle track to Shotstack format
 */
function convertSubtitleTrackToShotstack(
  track: any,
  edl: EDLComposition,
  options: ShotstackAdapterOptions
): ShotstackTrack {
  const clips: ShotstackClip[] = []
  
  for (const edlClip of track.clips) {
    if (edlClip.type !== 'subtitle') continue
    
    const text = edlClip.metadata.text as string
    if (!text) continue
    
    const style = edlClip.metadata.style || {}
    const length = edlClip.endTime - edlClip.startTime
    
    const subtitleClip: ShotstackClip = {
      asset: {
        type: 'title',
        text: text,
        style: createSubtitleStyle(style, options),
        size: style.fontSize || options.subtitleStyle?.fontSize || 24,
        color: style.color || options.subtitleStyle?.color || '#FFFFFF',
        background: style.backgroundColor || options.subtitleStyle?.backgroundColor,
        position: convertAlignmentToPosition(style.alignment || 'center')
      },
      start: edlClip.startTime,
      length: length,
      position: 'center'
    }
    
    // Handle subtitle position
    if (style.position) {
      subtitleClip.offset = {
        x: (style.position.x - 0.5) * edl.resolution.width,
        y: (style.position.y - 0.5) * edl.resolution.height
      }
    }
    
    // Handle subtitle animation
    if (style.animation && style.animation !== 'none') {
      subtitleClip.transition = convertSubtitleAnimationToTransition(style.animation)
    }
    
    clips.push(subtitleClip)
  }
  
  return { clips }
}

/**
 * Convert EDL keyframes to Shotstack transform properties
 */
function convertKeyframesToShotstackTransform(
  keyframes: EDLKeyframe[], 
  options: ShotstackAdapterOptions
): {
  scale?: number
  offset?: ShotstackOffset
  transform?: ShotstackTransform
} {
  // Shotstack doesn't support complex keyframe animations
  // We'll use the final state of the transform or an average
  
  if (keyframes.length === 0) return {}
  
  // Find the last meaningful keyframe
  const lastKeyframe = keyframes[keyframes.length - 1]
  
  const result: any = {}
  
  // Scale
  if (lastKeyframe.properties.scale !== undefined) {
    result.scale = lastKeyframe.properties.scale
  }
  
  // Position
  if (lastKeyframe.properties.position) {
    result.offset = {
      x: lastKeyframe.properties.position.x,
      y: lastKeyframe.properties.position.y
    }
  }
  
  // Rotation
  if (lastKeyframe.properties.rotation !== undefined) {
    result.transform = {
      rotate: {
        angle: lastKeyframe.properties.rotation
      }
    }
  }
  
  return result
}

/**
 * Convert EDL transition to Shotstack transition
 */
function convertEDLTransitionToShotstack(transition: EDLTransition): ShotstackTransition | null {
  const mapping: { [key: string]: string } = {
    'cut': 'fade', // Shotstack doesn't have true cuts, use fast fade
    'fade': 'fade',
    'dissolve': 'fade',
    'wipe': 'wipeLeft',
    'zoom': 'zoom',
    'slide': 'slideLeft'
  }
  
  const shotstackTransition = mapping[transition.type]
  if (!shotstackTransition) return null
  
  return {
    in: shotstackTransition as any
  }
}

/**
 * Convert color grading to Shotstack filter
 */
function convertColorGradingToFilter(colorGrading: any): ShotstackClip['filter'] | null {
  // Shotstack has limited filter options, map to closest match
  if (colorGrading.preset) {
    switch (colorGrading.preset) {
      case 'warm': return 'boost'
      case 'cool': return 'muted'
      case 'vibrant': return 'boost'
      case 'cinematic': return 'contrast'
      default: return null
    }
  }
  
  // Based on numeric values
  if (colorGrading.brightness > 0.1) return 'lighten'
  if (colorGrading.brightness < -0.1) return 'darken'
  if (colorGrading.contrast > 0.1) return 'contrast'
  if (colorGrading.saturation < -0.5) return 'greyscale'
  if (colorGrading.saturation < -0.2) return 'muted'
  
  return null
}

/**
 * Create CSS style string for subtitles
 */
function createSubtitleStyle(style: any, options: ShotstackAdapterOptions): string {
  const fontFamily = style.fontFamily || options.subtitleStyle?.fontFamily || 'Arial'
  const fontSize = style.fontSize || options.subtitleStyle?.fontSize || 24
  const color = style.color || options.subtitleStyle?.color || '#FFFFFF'
  
  let cssStyle = `font-family: ${fontFamily}; font-size: ${fontSize}px; color: ${color};`
  
  if (style.strokeColor && style.strokeWidth > 0) {
    cssStyle += ` text-stroke: ${style.strokeWidth}px ${style.strokeColor};`
  }
  
  if (style.shadow) {
    cssStyle += ` text-shadow: ${style.shadow.offsetX}px ${style.shadow.offsetY}px ${style.shadow.blur}px ${style.shadow.color};`
  }
  
  return cssStyle
}

/**
 * Convert alignment to Shotstack position
 */
function convertAlignmentToPosition(alignment: string): ShotstackAsset['position'] {
  switch (alignment) {
    case 'left': return 'left'
    case 'right': return 'right'
    case 'center':
    default: return 'center'
  }
}

/**
 * Convert subtitle animation to Shotstack transition
 */
function convertSubtitleAnimationToTransition(animation: string): ShotstackTransition {
  switch (animation) {
    case 'slide': return { in: 'slideUp' }
    case 'typewriter': return { in: 'fade' } // Closest equivalent
    case 'fade':
    default: return { in: 'fade' }
  }
}

/**
 * Validate Shotstack edit before sending to API
 */
export function validateShotstackEdit(edit: ShotstackEdit): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Check timeline
  if (!edit.timeline) {
    errors.push('Missing timeline')
  } else {
    if (!edit.timeline.tracks || edit.timeline.tracks.length === 0) {
      errors.push('Timeline must have at least one track')
    }
    
    for (const [trackIndex, track] of edit.timeline.tracks.entries()) {
      if (!track.clips || track.clips.length === 0) {
        errors.push(`Track ${trackIndex} has no clips`)
      }
      
      for (const [clipIndex, clip] of track.clips.entries()) {
        if (!clip.asset) {
          errors.push(`Track ${trackIndex}, clip ${clipIndex} missing asset`)
        } else {
          if (clip.asset.type === 'video' && !clip.asset.src) {
            errors.push(`Track ${trackIndex}, clip ${clipIndex} video asset missing src`)
          }
          if (clip.asset.type === 'title' && !clip.asset.text) {
            errors.push(`Track ${trackIndex}, clip ${clipIndex} title asset missing text`)
          }
        }
        
        if (clip.start < 0) {
          errors.push(`Track ${trackIndex}, clip ${clipIndex} has negative start time`)
        }
        
        if (clip.length <= 0) {
          errors.push(`Track ${trackIndex}, clip ${clipIndex} has invalid length`)
        }
      }
    }
  }
  
  // Check output
  if (!edit.output) {
    errors.push('Missing output configuration')
  } else {
    if (!edit.output.format) {
      errors.push('Output format is required')
    }
    if (!edit.output.resolution) {
      errors.push('Output resolution is required')
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Generate Shotstack render request
 */
export function createShotstackRenderRequest(
  edit: ShotstackEdit,
  apiKey: string
): {
  url: string
  method: string
  headers: { [key: string]: string }
  body: string
} {
  return {
    url: 'https://api.shotstack.io/v1/render',
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(edit)
  }
}

/**
 * Optimize Shotstack edit for performance and cost
 */
export function optimizeShotstackEdit(edit: ShotstackEdit): ShotstackEdit {
  const optimizedEdit = JSON.parse(JSON.stringify(edit)) // Deep copy
  
  // Enable caching
  optimizedEdit.timeline.cache = true
  
  // Optimize clips
  for (const track of optimizedEdit.timeline.tracks) {
    for (const clip of track.clips) {
      // Remove redundant properties
      if (clip.scale === 1.0) delete clip.scale
      if (clip.opacity === 1.0) delete clip.opacity
      if (clip.volume === 1.0) delete clip.volume
      
      // Simplify offsets close to zero
      if (clip.offset) {
        if (Math.abs(clip.offset.x || 0) < 1) delete clip.offset.x
        if (Math.abs(clip.offset.y || 0) < 1) delete clip.offset.y
        if (!clip.offset.x && !clip.offset.y) delete clip.offset
      }
    }
  }
  
  return optimizedEdit
}