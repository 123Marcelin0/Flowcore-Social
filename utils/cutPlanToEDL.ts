import { CutPlan, Segment, Transform, AudioAdjustment, SubtitleSegment } from '@/lib/schemas/cutPlan'

// EDL JSON Schema - Universal format that can be adapted to different video editing systems
export interface EDLClip {
  id: string
  type: 'video' | 'audio' | 'subtitle' | 'effect'
  track: number // Track/layer number
  startTime: number // Timeline position in seconds
  endTime: number // Timeline end position
  sourceStartTime: number // Source media start time
  sourceEndTime: number // Source media end time
  sourceFile?: string
  properties: {
    volume?: number
    opacity?: number
    position?: { x: number; y: number }
    scale?: number
    rotation?: number
    cropRect?: { x: number; y: number; width: number; height: number }
    colorGrading?: {
      brightness: number
      contrast: number
      saturation: number
      temperature: number
    }
  }
  keyframes: EDLKeyframe[]
  transitions?: EDLTransition[]
  metadata: {
    segmentId?: string
    confidence?: number
    reason?: string
    [key: string]: any
  }
}

export interface EDLKeyframe {
  time: number // Relative to clip start
  properties: {
    position?: { x: number; y: number }
    scale?: number
    rotation?: number
    opacity?: number
    volume?: number
    [key: string]: any
  }
  easing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'easeInOutCubic'
}

export interface EDLTransition {
  type: 'cut' | 'fade' | 'dissolve' | 'wipe' | 'zoom' | 'slide'
  duration: number
  easing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut'
  properties?: {
    direction?: 'left' | 'right' | 'up' | 'down'
    feather?: number
    [key: string]: any
  }
}

export interface EDLComposition {
  id: string
  name: string
  duration: number
  resolution: { width: number; height: number }
  fps: number
  tracks: EDLTrack[]
  globalEffects: EDLGlobalEffect[]
  metadata: {
    cutPlanId: string
    sourceFile: string
    targetFormat: string
    processingOptions: any
    qualityMetrics: any
    [key: string]: any
  }
}

export interface EDLTrack {
  id: string
  type: 'video' | 'audio' | 'subtitle'
  index: number
  clips: EDLClip[]
  muted: boolean
  volume: number
  effects: EDLTrackEffect[]
}

export interface EDLGlobalEffect {
  id: string
  type: 'color_grading' | 'background_music' | 'noise_reduction' | 'audio_leveling'
  enabled: boolean
  startTime: number
  endTime: number
  properties: { [key: string]: any }
}

export interface EDLTrackEffect {
  id: string
  type: 'volume' | 'fade' | 'compression' | 'eq' | 'noise_reduction'
  enabled: boolean
  startTime: number
  endTime: number
  properties: { [key: string]: any }
}

/**
 * Convert a CutPlan to universal EDL JSON format
 */
export function cutPlanToEDL(cutPlan: CutPlan, sourceFilePath: string): EDLComposition {
  console.log(`🎬 Converting CutPlan ${cutPlan.id} to EDL format`)
  
  const startTime = Date.now()
  
  try {
    // Calculate composition properties
    const keptSegments = cutPlan.segments.filter(s => s.action === 'keep')
    const totalDuration = cutPlan.globalAdjustments.targetDuration || 
      (keptSegments.length > 0 ? Math.max(...keptSegments.map(s => s.endTime)) : 0)
    
    const composition: EDLComposition = {
      id: `edl_${cutPlan.id}`,
      name: `${cutPlan.uploadId}_edited`,
      duration: totalDuration,
      resolution: {
        width: Math.round(cutPlan.processingMetadata.sourceMetadata.resolution.height * cutPlan.globalAdjustments.targetAspectRatio),
        height: cutPlan.processingMetadata.sourceMetadata.resolution.height
      },
      fps: cutPlan.processingMetadata.sourceMetadata.fps,
      tracks: [],
      globalEffects: [],
      metadata: {
        cutPlanId: cutPlan.id,
        sourceFile: sourceFilePath,
        targetFormat: cutPlan.globalAdjustments.targetFormat,
        processingOptions: cutPlan.processingMetadata.processingOptions,
        qualityMetrics: cutPlan.qualityMetrics
      }
    }
    
    // Create video track
    const videoTrack = createVideoTrack(cutPlan, sourceFilePath)
    composition.tracks.push(videoTrack)
    
    // Create audio track
    const audioTrack = createAudioTrack(cutPlan, sourceFilePath)
    composition.tracks.push(audioTrack)
    
    // Create subtitle track if subtitles exist
    if (cutPlan.subtitles.length > 0) {
      const subtitleTrack = createSubtitleTrack(cutPlan)
      composition.tracks.push(subtitleTrack)
    }
    
    // Add global effects
    composition.globalEffects = createGlobalEffects(cutPlan)
    
    console.log(`✅ EDL conversion completed in ${Date.now() - startTime}ms`)
    console.log(`📊 Generated ${composition.tracks.length} tracks with ${composition.globalEffects.length} global effects`)
    
    return composition
    
  } catch (error) {
    console.error('❌ EDL conversion failed:', error)
    throw new Error(`EDL conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Create video track with all video clips and transforms
 */
function createVideoTrack(cutPlan: CutPlan, sourceFilePath: string): EDLTrack {
  const videoClips: EDLClip[] = []
  const keptSegments = cutPlan.segments.filter(s => s.action === 'keep')
  
  for (const [index, segment] of keptSegments.entries()) {
    const clipId = `video_clip_${index}`
    const duration = segment.endTime - segment.startTime
    
    // Base video clip
    const clip: EDLClip = {
      id: clipId,
      type: 'video',
      track: 1, // Main video track
      startTime: segment.startTime,
      endTime: segment.endTime,
      sourceStartTime: segment.sourceStartTime,
      sourceEndTime: segment.sourceEndTime,
      sourceFile: sourceFilePath,
      properties: {
        opacity: 1.0,
        position: { x: 0, y: 0 },
        scale: 1.0,
        rotation: 0
      },
      keyframes: [],
      metadata: {
        segmentId: segment.id,
        confidence: segment.confidence,
        reason: segment.reason,
        text: segment.text
      }
    }
    
    // Add transforms as keyframes
    const keyframes = convertTransformsToKeyframes(segment.transforms, duration)
    clip.keyframes = keyframes
    
    // Add transitions
    if (segment.transition) {
      clip.transitions = [convertTransitionToEDL(segment.transition)]
    }
    
    // Apply color grading if specified
    if (cutPlan.globalAdjustments.colorGrading) {
      clip.properties.colorGrading = cutPlan.globalAdjustments.colorGrading
    }
    
    videoClips.push(clip)
  }
  
  return {
    id: 'video_track_1',
    type: 'video',
    index: 1,
    clips: videoClips,
    muted: false,
    volume: 1.0,
    effects: []
  }
}

/**
 * Create audio track with audio adjustments
 */
function createAudioTrack(cutPlan: CutPlan, sourceFilePath: string): EDLTrack {
  const audioClips: EDLClip[] = []
  const keptSegments = cutPlan.segments.filter(s => s.action === 'keep')
  
  for (const [index, segment] of keptSegments.entries()) {
    const clipId = `audio_clip_${index}`
    
    // Base audio clip
    const clip: EDLClip = {
      id: clipId,
      type: 'audio',
      track: 1, // Main audio track
      startTime: segment.startTime,
      endTime: segment.endTime,
      sourceStartTime: segment.sourceStartTime,
      sourceEndTime: segment.sourceEndTime,
      sourceFile: sourceFilePath,
      properties: {
        volume: segment.metadata?.volume || 1.0
      },
      keyframes: [],
      metadata: {
        segmentId: segment.id,
        speaker: segment.metadata?.speaker
      }
    }
    
    // Add audio adjustments as keyframes
    const relevantAdjustments = cutPlan.audioAdjustments.filter(adj =>
      adj.startTime >= segment.startTime && adj.endTime <= segment.endTime
    )
    
    for (const adjustment of relevantAdjustments) {
      const keyframe: EDLKeyframe = {
        time: adjustment.startTime - segment.startTime,
        properties: {},
        easing: adjustment.easing === 'exponential' ? 'easeOut' : 'linear'
      }
      
      switch (adjustment.type) {
        case 'volume':
          keyframe.properties.volume = adjustment.value
          break
        case 'fade_in':
          keyframe.properties.volume = 0
          // Add end keyframe
          clip.keyframes.push({
            time: (adjustment.endTime - segment.startTime),
            properties: { volume: 1.0 },
            easing: 'easeOut'
          })
          break
        case 'fade_out':
          keyframe.properties.volume = 1.0
          // Add end keyframe
          clip.keyframes.push({
            time: (adjustment.endTime - segment.startTime),
            properties: { volume: 0 },
            easing: 'easeIn'
          })
          break
      }
      
      clip.keyframes.push(keyframe)
    }
    
    audioClips.push(clip)
  }
  
  // Create track effects for global audio adjustments
  const trackEffects: EDLTrackEffect[] = []
  
  if (cutPlan.globalAdjustments.audioLeveling) {
    trackEffects.push({
      id: 'audio_leveling',
      type: 'compression',
      enabled: true,
      startTime: 0,
      endTime: cutPlan.globalAdjustments.targetDuration,
      properties: {
        threshold: -12,
        ratio: 3,
        attack: 0.003,
        release: 0.1
      }
    })
  }
  
  return {
    id: 'audio_track_1',
    type: 'audio',
    index: 1,
    clips: audioClips,
    muted: false,
    volume: 1.0,
    effects: trackEffects
  }
}

/**
 * Create subtitle track from subtitle segments
 */
function createSubtitleTrack(cutPlan: CutPlan): EDLTrack {
  const subtitleClips: EDLClip[] = []
  
  for (const [index, subtitle] of cutPlan.subtitles.entries()) {
    const clip: EDLClip = {
      id: `subtitle_${index}`,
      type: 'subtitle',
      track: 1,
      startTime: subtitle.startTime,
      endTime: subtitle.endTime,
      sourceStartTime: subtitle.startTime,
      sourceEndTime: subtitle.endTime,
      properties: {
        opacity: 1.0,
        position: subtitle.style?.position || { x: 0.5, y: 0.85 }
      },
      keyframes: [],
      metadata: {
        text: subtitle.text,
        speaker: subtitle.speaker,
        confidence: subtitle.confidence,
        style: subtitle.style
      }
    }
    
    subtitleClips.push(clip)
  }
  
  return {
    id: 'subtitle_track_1',
    type: 'subtitle',
    index: 1,
    clips: subtitleClips,
    muted: false,
    volume: 1.0,
    effects: []
  }
}

/**
 * Convert transforms to EDL keyframes
 */
function convertTransformsToKeyframes(transforms: Transform[], clipDuration: number): EDLKeyframe[] {
  const keyframes: EDLKeyframe[] = []
  
  // Always add initial keyframe
  keyframes.push({
    time: 0,
    properties: {
      position: { x: 0, y: 0 },
      scale: 1.0,
      rotation: 0,
      opacity: 1.0
    },
    easing: 'linear'
  })
  
  for (const transform of transforms) {
    const startKeyframe: EDLKeyframe = {
      time: transform.startTime,
      properties: {},
      easing: transform.easing === 'easeInOutCubic' ? 'easeInOut' : 'linear'
    }
    
    const endKeyframe: EDLKeyframe = {
      time: transform.endTime,
      properties: {},
      easing: transform.easing === 'easeInOutCubic' ? 'easeInOut' : 'linear'
    }
    
    // Convert transform values based on type
    switch (transform.type) {
      case 'scale':
        if (typeof transform.startValue === 'number' && typeof transform.endValue === 'number') {
          startKeyframe.properties.scale = transform.startValue
          endKeyframe.properties.scale = transform.endValue
        }
        break
        
      case 'pan':
        if (typeof transform.startValue === 'object' && typeof transform.endValue === 'object') {
          startKeyframe.properties.position = { x: transform.startValue.x, y: transform.startValue.y }
          endKeyframe.properties.position = { x: transform.endValue.x, y: transform.endValue.y }
          
          if ('scale' in transform.startValue && 'scale' in transform.endValue) {
            startKeyframe.properties.scale = transform.startValue.scale
            endKeyframe.properties.scale = transform.endValue.scale
          }
        }
        break
        
      case 'rotate':
        if (typeof transform.startValue === 'number' && typeof transform.endValue === 'number') {
          startKeyframe.properties.rotation = transform.startValue
          endKeyframe.properties.rotation = transform.endValue
        }
        break
        
      case 'crop':
        // Handle crop transforms - would need additional implementation
        break
    }
    
    keyframes.push(startKeyframe, endKeyframe)
  }
  
  return keyframes.sort((a, b) => a.time - b.time)
}

/**
 * Convert transition to EDL format
 */
function convertTransitionToEDL(transition: any): EDLTransition {
  return {
    type: transition.type,
    duration: transition.duration,
    easing: transition.easing,
    properties: transition.properties || {}
  }
}

/**
 * Create global effects from global adjustments
 */
function createGlobalEffects(cutPlan: CutPlan): EDLGlobalEffect[] {
  const effects: EDLGlobalEffect[] = []
  
  // Color grading
  if (cutPlan.globalAdjustments.colorGrading && cutPlan.globalAdjustments.colorGrading.preset !== 'none') {
    effects.push({
      id: 'global_color_grading',
      type: 'color_grading',
      enabled: true,
      startTime: 0,
      endTime: cutPlan.globalAdjustments.targetDuration,
      properties: cutPlan.globalAdjustments.colorGrading
    })
  }
  
  // Background music
  if (cutPlan.globalAdjustments.backgroundMusic?.enabled) {
    effects.push({
      id: 'background_music',
      type: 'background_music',
      enabled: true,
      startTime: 0,
      endTime: cutPlan.globalAdjustments.targetDuration,
      properties: cutPlan.globalAdjustments.backgroundMusic
    })
  }
  
  // Audio leveling
  if (cutPlan.globalAdjustments.audioLeveling) {
    effects.push({
      id: 'audio_leveling',
      type: 'audio_leveling',
      enabled: true,
      startTime: 0,
      endTime: cutPlan.globalAdjustments.targetDuration,
      properties: {
        normalize: true,
        targetLUFS: -16 // Standard for social media
      }
    })
  }
  
  return effects
}

/**
 * Utility function to validate EDL structure
 */
export function validateEDL(edl: EDLComposition): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Check basic structure
  if (!edl.id) errors.push('Missing composition ID')
  if (!edl.name) errors.push('Missing composition name')
  if (edl.duration <= 0) errors.push('Invalid duration')
  if (!edl.resolution.width || !edl.resolution.height) errors.push('Invalid resolution')
  if (edl.fps <= 0) errors.push('Invalid frame rate')
  
  // Check tracks
  if (!edl.tracks || edl.tracks.length === 0) {
    errors.push('No tracks found')
  } else {
    for (const track of edl.tracks) {
      if (!track.id) errors.push(`Track missing ID`)
      if (!track.clips) errors.push(`Track ${track.id} missing clips array`)
      
      // Check clips
      for (const clip of track.clips) {
        if (!clip.id) errors.push(`Clip missing ID`)
        if (clip.startTime >= clip.endTime) errors.push(`Clip ${clip.id} has invalid timeline`)
        if (clip.sourceStartTime >= clip.sourceEndTime) errors.push(`Clip ${clip.id} has invalid source timeline`)
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Export EDL to JSON string with pretty formatting
 */
export function exportEDLToJSON(edl: EDLComposition, prettify: boolean = true): string {
  return JSON.stringify(edl, null, prettify ? 2 : 0)
}

/**
 * Generate summary statistics for an EDL
 */
export function generateEDLSummary(edl: EDLComposition): {
  totalClips: number
  totalTracks: number
  totalEffects: number
  videoDuration: number
  averageClipDuration: number
  transformCount: number
  transitionCount: number
} {
  const allClips = edl.tracks.flatMap(track => track.clips)
  const videoClips = allClips.filter(clip => clip.type === 'video')
  
  return {
    totalClips: allClips.length,
    totalTracks: edl.tracks.length,
    totalEffects: edl.globalEffects.length,
    videoDuration: edl.duration,
    averageClipDuration: videoClips.length > 0 
      ? videoClips.reduce((sum, clip) => sum + (clip.endTime - clip.startTime), 0) / videoClips.length 
      : 0,
    transformCount: allClips.reduce((sum, clip) => sum + clip.keyframes.length, 0),
    transitionCount: allClips.filter(clip => clip.transitions && clip.transitions.length > 0).length
  }
}