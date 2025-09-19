import type { Transform, EasingFunction, EDLClip } from './edl-types'

/**
 * Keyframe-based Transform System
 * Replaces incremental zoom logic with smooth continuous paths
 */

export interface KeyframeTransform {
  time: number // 0-1 normalized time within clip
  transform: Transform
}

export interface TransformPath {
  clipId: string
  startTransform: Transform
  endTransform: Transform
  easing: EasingFunction
  keyframes?: KeyframeTransform[] // Optional intermediate keyframes
}

/**
 * Easing functions for smooth animations
 */
export const easingFunctions = {
  linear: (t: number) => t,
  'ease-in': (t: number) => t * t,
  'ease-out': (t: number) => 1 - Math.pow(1 - t, 2),
  'ease-in-out': (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  'cubic-bezier': (t: number) => t * t * (3 - 2 * t) // Default cubic bezier
}

/**
 * Calculate transform at specific time using easing
 */
export function interpolateTransform(
  startTransform: Transform,
  endTransform: Transform,
  progress: number, // 0-1
  easing: EasingFunction = 'ease-in-out'
): Transform {
  const easedProgress = easingFunctions[easing](Math.max(0, Math.min(1, progress)))
  
  return {
    scale: lerp(startTransform.scale, endTransform.scale, easedProgress),
    translateX: lerp(startTransform.translateX, endTransform.translateX, easedProgress),
    translateY: lerp(startTransform.translateY, endTransform.translateY, easedProgress),
    rotate: lerp(startTransform.rotate, endTransform.rotate, easedProgress),
    opacity: lerp(startTransform.opacity, endTransform.opacity, easedProgress)
  }
}

/**
 * Linear interpolation helper
 */
function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t
}

/**
 * Generate professional transform paths for clips
 */
export function generateTransformPaths(clips: EDLClip[]): TransformPath[] {
  const paths: TransformPath[] = []
  
  for (const clip of clips) {
    // Use existing transforms from EDL if available
    if (clip.startTransform && clip.endTransform) {
      paths.push({
        clipId: clip.id,
        startTransform: clip.startTransform,
        endTransform: clip.endTransform,
        easing: clip.easing || 'ease-in-out'
      })
      continue
    }
    
    // Generate professional transforms based on shot intent
    const transformPath = generateTransformForShotIntent(clip)
    paths.push(transformPath)
  }
  
  return paths
}

/**
 * Generate transforms based on shot intent and content analysis
 */
function generateTransformForShotIntent(clip: EDLClip): TransformPath {
  const baseTransform: Transform = {
    scale: 1.0,
    translateX: 0,
    translateY: 0,
    rotate: 0,
    opacity: 1
  }
  
  let startTransform: Transform
  let endTransform: Transform
  let easing: EasingFunction = 'ease-in-out'
  
  // Seed for consistent but varied transforms
  const seed = hashString(clip.id + clip.originalText || '')
  const random = (min: number, max: number) => min + (seed % 1000) / 1000 * (max - min)
  
  switch (clip.shotIntent) {
    case 'establish':
      // Gentle zoom in for establishing shots
      startTransform = { ...baseTransform, scale: 0.95 }
      endTransform = { ...baseTransform, scale: 1.05 }
      easing = 'ease-out'
      break
      
    case 'focus':
      // Subtle push-in for focus
      startTransform = { ...baseTransform, scale: 1.0 }
      endTransform = { ...baseTransform, scale: 1.08, translateY: -5 }
      easing = 'ease-in-out'
      break
      
    case 'emphasis':
      // Dynamic movement for emphasis
      const direction = random(0, 4)
      const translateX = direction < 1 ? -15 : direction < 2 ? 15 : 0
      const translateY = direction >= 2 && direction < 3 ? -10 : direction >= 3 ? 10 : 0
      
      startTransform = { ...baseTransform, scale: 1.0 }
      endTransform = { 
        ...baseTransform, 
        scale: 1.12, 
        translateX,
        translateY,
        rotate: random(-1, 1)
      }
      easing = 'ease-in-out'
      break
      
    case 'transition':
      // Smooth lateral movement for transitions
      const isLeftToRight = seed % 2 === 0
      startTransform = { 
        ...baseTransform, 
        scale: 1.02,
        translateX: isLeftToRight ? -20 : 20
      }
      endTransform = { 
        ...baseTransform, 
        scale: 1.02,
        translateX: isLeftToRight ? 20 : -20
      }
      easing = 'linear'
      break
      
    case 'cleanup':
      // Minimal movement for cleaned content
      startTransform = { ...baseTransform, scale: 1.0 }
      endTransform = { ...baseTransform, scale: 1.03 }
      easing = 'ease-out'
      break
      
    case 'silence_trim':
      // No movement for trimmed silence
      startTransform = { ...baseTransform }
      endTransform = { ...baseTransform }
      easing = 'linear'
      break
      
    default:
      // Default subtle movement
      startTransform = { ...baseTransform, scale: 0.98 }
      endTransform = { ...baseTransform, scale: 1.02 }
      easing = 'ease-in-out'
  }
  
  return {
    clipId: clip.id,
    startTransform,
    endTransform,
    easing
  }
}

/**
 * Simple hash function for consistent randomness
 */
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

/**
 * Generate CSS transform string from Transform object
 */
export function transformToCSS(transform: Transform): string {
  const { scale, translateX, translateY, rotate, opacity } = transform
  
  const transforms = []
  
  if (scale !== 1) transforms.push(`scale(${scale})`)
  if (translateX !== 0 || translateY !== 0) transforms.push(`translate(${translateX}px, ${translateY}px)`)
  if (rotate !== 0) transforms.push(`rotate(${rotate}deg)`)
  
  const transformString = transforms.length > 0 ? transforms.join(' ') : 'none'
  
  return `transform: ${transformString}; opacity: ${opacity};`
}

/**
 * Generate Shotstack-compatible smooth animations
 */
export function generateShotstackAnimations(path: TransformPath, clipDuration: number): Array<{
  property: string
  start: number
  end: number
  duration: number
  easing: string
}> {
  const animations: Array<{
    property: string
    start: number
    end: number
    duration: number
    easing: string
  }> = []

  const { startTransform, endTransform, easing } = path

  // Convert easing function to Shotstack format
  const shotstackEasing = easing === 'ease-in-out' ? 'easeInOut' :
                         easing === 'ease-in' ? 'easeIn' :
                         easing === 'ease-out' ? 'easeOut' :
                         easing === 'linear' ? 'linear' : 'easeInOut'

  // Generate smooth animations for each transform property
  if (startTransform.scale !== endTransform.scale) {
    animations.push({
      property: 'scale',
      start: startTransform.scale,
      end: endTransform.scale,
      duration: clipDuration,
      easing: shotstackEasing
    })
  }

  if (startTransform.translateX !== endTransform.translateX) {
    animations.push({
      property: 'x',
      start: startTransform.translateX,
      end: endTransform.translateX,
      duration: clipDuration,
      easing: shotstackEasing
    })
  }

  if (startTransform.translateY !== endTransform.translateY) {
    animations.push({
      property: 'y',
      start: startTransform.translateY,
      end: endTransform.translateY,
      duration: clipDuration,
      easing: shotstackEasing
    })
  }

  if (startTransform.rotate !== endTransform.rotate) {
    animations.push({
      property: 'rotate',
      start: startTransform.rotate,
      end: endTransform.rotate,
      duration: clipDuration,
      easing: shotstackEasing
    })
  }

  if (startTransform.opacity !== endTransform.opacity) {
    animations.push({
      property: 'opacity',
      start: startTransform.opacity,
      end: endTransform.opacity,
      duration: clipDuration,
      easing: shotstackEasing
    })
  }

  return animations
}

/**
 * Generate CSS keyframes for a transform path (for web preview)
 */
export function generateCSSKeyframes(path: TransformPath, clipDuration: number): string {
  const keyframeName = `transform-${path.clipId}`
  
  let keyframeRules = `
    @keyframes ${keyframeName} {
      0% { ${transformToCSS(path.startTransform)} }
      100% { ${transformToCSS(path.endTransform)} }
    }
  `
  
  // Add intermediate keyframes if specified
  if (path.keyframes && path.keyframes.length > 0) {
    const sortedKeyframes = [...path.keyframes].sort((a, b) => a.time - b.time)
    
    keyframeRules = `
      @keyframes ${keyframeName} {
        0% { ${transformToCSS(path.startTransform)} }
        ${sortedKeyframes.map(kf => 
          `${(kf.time * 100).toFixed(1)}% { ${transformToCSS(kf.transform)} }`
        ).join('\n        ')}
        100% { ${transformToCSS(path.endTransform)} }
      }
    `
  }
  
  return keyframeRules
}

/**
 * Get animation CSS for applying to video element
 */
export function getAnimationCSS(path: TransformPath, clipDuration: number): string {
  const keyframeName = `transform-${path.clipId}`
  const duration = clipDuration.toFixed(3)
  const easingCSS = path.easing === 'cubic-bezier' ? 'cubic-bezier(0.4, 0, 0.2, 1)' : path.easing
  
  return `
    animation: ${keyframeName} ${duration}s ${easingCSS} forwards;
    animation-fill-mode: both;
  `
}

/**
 * Calculate transform at specific time within clip
 */
export function getTransformAtTime(
  path: TransformPath,
  currentTime: number,
  clipStartTime: number,
  clipDuration: number
): Transform {
  const relativeTime = currentTime - clipStartTime
  const progress = Math.max(0, Math.min(1, relativeTime / clipDuration))
  
  // Handle keyframes if present
  if (path.keyframes && path.keyframes.length > 0) {
    const sortedKeyframes = [
      { time: 0, transform: path.startTransform },
      ...path.keyframes,
      { time: 1, transform: path.endTransform }
    ].sort((a, b) => a.time - b.time)
    
    // Find the two keyframes to interpolate between
    let startKeyframe = sortedKeyframes[0]
    let endKeyframe = sortedKeyframes[sortedKeyframes.length - 1]
    
    for (let i = 0; i < sortedKeyframes.length - 1; i++) {
      if (progress >= sortedKeyframes[i].time && progress <= sortedKeyframes[i + 1].time) {
        startKeyframe = sortedKeyframes[i]
        endKeyframe = sortedKeyframes[i + 1]
        break
      }
    }
    
    // Calculate local progress between keyframes
    const keyframeDuration = endKeyframe.time - startKeyframe.time
    const localProgress = keyframeDuration > 0 
      ? (progress - startKeyframe.time) / keyframeDuration 
      : 0
    
    return interpolateTransform(
      startKeyframe.transform,
      endKeyframe.transform,
      localProgress,
      path.easing
    )
  }
  
  // Simple start to end interpolation
  return interpolateTransform(
    path.startTransform,
    path.endTransform,
    progress,
    path.easing
  )
}

/**
 * Optimize transform paths to avoid jarring transitions between clips
 */
export function optimizeTransformPaths(paths: TransformPath[]): TransformPath[] {
  if (paths.length <= 1) return paths
  
  const optimized = [...paths]
  
  // Smooth transitions between clips
  for (let i = 1; i < optimized.length; i++) {
    const prevPath = optimized[i - 1]
    const currentPath = optimized[i]
    
    // If the end transform of previous clip is very different from start of current,
    // adjust the start transform of current clip for smoother transition
    const scaleDiff = Math.abs(prevPath.endTransform.scale - currentPath.startTransform.scale)
    const translateDiff = Math.abs(
      (prevPath.endTransform.translateX - currentPath.startTransform.translateX) +
      (prevPath.endTransform.translateY - currentPath.startTransform.translateY)
    )
    
    if (scaleDiff > 0.2 || translateDiff > 30) {
      // Blend the transforms for smoother transition
      optimized[i] = {
        ...currentPath,
        startTransform: {
          scale: lerp(prevPath.endTransform.scale, currentPath.startTransform.scale, 0.3),
          translateX: lerp(prevPath.endTransform.translateX, currentPath.startTransform.translateX, 0.3),
          translateY: lerp(prevPath.endTransform.translateY, currentPath.startTransform.translateY, 0.3),
          rotate: lerp(prevPath.endTransform.rotate, currentPath.startTransform.rotate, 0.3),
          opacity: currentPath.startTransform.opacity
        }
      }
    }
  }
  
  return optimized
}

/**
 * Generate complete Shotstack clip with smooth animations
 */
export function generateShotstackClip(
  path: TransformPath,
  clipData: {
    src: string
    start: number
    duration: number
    assetType?: 'video' | 'image'
  }
): any {
  const { src, start, duration, assetType = 'video' } = clipData
  const animations = generateShotstackAnimations(path, duration)
  
  // Base transform (starting position)
  const baseTransform = {
    scale: path.startTransform.scale,
    x: path.startTransform.translateX,
    y: path.startTransform.translateY,
    rotate: path.startTransform.rotate,
    opacity: path.startTransform.opacity
  }

  // Only add animations if there are actual changes
  const hasAnimations = animations.length > 0

  return {
    asset: {
      type: assetType,
      src: src
    },
    start: start,
    length: duration,
    ...(hasAnimations && {
      transform: {
        ...baseTransform,
        animations: animations
      }
    }),
    ...(!hasAnimations && baseTransform.scale !== 1 && {
      transform: baseTransform
    })
  }
}

/**
 * Generate complete Shotstack timeline with smooth animations
 */
export function generateShotstackTimeline(
  paths: TransformPath[],
  clips: Array<{
    id: string
    src: string
    start: number
    duration: number
    assetType?: 'video' | 'image'
  }>
): any {
  const shotstackClips = clips.map(clip => {
    const path = paths.find(p => p.clipId === clip.id)
    if (!path) {
      // No transform path found, return basic clip
      return {
        asset: {
          type: clip.assetType || 'video',
          src: clip.src
        },
        start: clip.start,
        length: clip.duration
      }
    }
    
    return generateShotstackClip(path, clip)
  })

  return {
    timeline: {
      tracks: [
        {
          clips: shotstackClips
        }
      ]
    },
    output: {
      format: 'mp4',
      resolution: 'hd'
    }
  }
}

