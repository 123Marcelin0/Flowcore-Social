/**
 * Professional Auto-Zoom System
 * Implements single keyframe transforms with smooth cubic easing
 * Avoids the common mistake of multiple small transforms that create jerky movement
 */

export interface ZoomTransform {
  start: TransformState
  end: TransformState
  startTime: number    // Clip start time in seconds
  duration: number     // Transform duration in seconds
  easing: 'easeInOutCubic' | 'easeInCubic' | 'easeOutCubic' | 'linear'
  clipId: string
  motionBlur?: boolean
}

export interface TransformState {
  scale: number        // 1.0 = no zoom, 1.25 = 25% zoom in
  x: number           // Horizontal offset in pixels (subpixel precision)
  y: number           // Vertical offset in pixels (subpixel precision)
  rotation?: number   // Optional rotation in degrees
}

export interface ZoomPlan {
  transforms: ZoomTransform[]
  totalDuration: number
  targetResolution: { width: number; height: number }
  recommendations: string[]
  qualitySettings: {
    useMotionBlur: boolean
    subpixelPrecision: boolean
    maxZoomLevel: number
  }
}

export interface ZoomAnalysisOptions {
  intensity?: number              // 0.1-0.5, default 0.25 (25% max zoom)
  targetResolution?: { width: number; height: number }
  minSegmentDuration?: number     // Minimum segment length for zoom (default: 3s)
  maxZoomLevel?: number          // Maximum zoom scale (default: 1.5)
  enableMotionBlur?: boolean     // Add motion blur for smoother movement
  zoomPattern?: 'gentle' | 'dynamic' | 'cinematic'
}

/**
 * easeInOutCubic easing function - creates smooth acceleration and deceleration
 * This is the key to professional-looking zooms
 */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/**
 * Additional easing functions for variety
 */
export const EasingFunctions = {
  easeInOutCubic: (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  easeInCubic: (t: number) => t * t * t,
  easeOutCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  linear: (t: number) => t
}

/**
 * Analyze transcript segments and generate smooth zoom plan
 * Uses single transform keyframes instead of multiple incremental steps
 */
export function generateAutoZoomPlan(
  segments: Array<{
    start: number
    end: number
    text: string
    confidence?: number
    importance?: number  // 0-1, higher = more zoom-worthy
  }>,
  options: ZoomAnalysisOptions = {}
): ZoomPlan {
  
  const intensity = Math.max(0.1, Math.min(0.5, options.intensity || 0.25))
  const targetResolution = options.targetResolution || { width: 1920, height: 1080 }
  const minSegmentDuration = options.minSegmentDuration || 3
  const maxZoomLevel = options.maxZoomLevel || 1 + intensity * 2 // e.g., 1.5 for 25% intensity
  const zoomPattern = options.zoomPattern || 'gentle'
  
  console.log(`🔍 Generating auto-zoom plan with ${intensity * 100}% intensity`)
  
  const transforms: ZoomTransform[] = []
  const recommendations: string[] = []
  
  // Filter segments suitable for zooming
  const zoomableSegments = segments.filter(seg => {
    const duration = seg.end - seg.start
    return duration >= minSegmentDuration
  })
  
  if (zoomableSegments.length === 0) {
    recommendations.push('No segments long enough for smooth zooming - consider reducing minimum duration')
    return createEmptyZoomPlan(targetResolution, recommendations)
  }
  
  // Analyze each segment and create zoom transforms
  zoomableSegments.forEach((segment, index) => {
    const duration = segment.end - segment.start
    const importance = segment.importance || calculateImportanceScore(segment)
    
    // Skip low-importance segments unless we need more variety
    if (importance < 0.3 && transforms.length > 0) return
    
    // Calculate zoom parameters based on segment characteristics
    const zoomParams = calculateZoomParameters({
      segment,
      importance,
      intensity,
      maxZoomLevel,
      zoomPattern,
      targetResolution,
      segmentIndex: index,
      totalSegments: zoomableSegments.length
    })
    
    if (zoomParams) {
      const transform: ZoomTransform = {
        start: zoomParams.startTransform,
        end: zoomParams.endTransform,
        startTime: segment.start,
        duration: duration,
        easing: zoomParams.easing,
        clipId: `segment_${index}`,
        motionBlur: options.enableMotionBlur && zoomParams.shouldUseMotionBlur
      }
      
      transforms.push(transform)
      
      console.log(`📹 Created zoom for segment ${index}: ${zoomParams.startTransform.scale}x → ${zoomParams.endTransform.scale}x`)
    }
  })
  
  // Generate quality recommendations
  if (transforms.length === 0) {
    recommendations.push('No suitable zoom opportunities found - content may be too static')
  } else {
    recommendations.push(`Generated ${transforms.length} smooth zoom transforms`)
    
    if (intensity > 0.3) {
      recommendations.push('High zoom intensity - ensure content supports dramatic movement')
    }
    
    if (options.enableMotionBlur) {
      recommendations.push('Motion blur enabled - will create professional cinematic look')
    }
  }
  
  return {
    transforms,
    totalDuration: Math.max(...segments.map(s => s.end)),
    targetResolution,
    recommendations,
    qualitySettings: {
      useMotionBlur: options.enableMotionBlur || false,
      subpixelPrecision: true, // Always use subpixel for smoothness
      maxZoomLevel
    }
  }
}

/**
 * Calculate zoom parameters for a segment
 * The key insight: use SINGLE transform with start/end states, not multiple steps
 */
function calculateZoomParameters(params: {
  segment: { start: number; end: number; text: string; confidence?: number; importance?: number }
  importance: number
  intensity: number
  maxZoomLevel: number
  zoomPattern: string
  targetResolution: { width: number; height: number }
  segmentIndex: number
  totalSegments: number
}): {
  startTransform: TransformState
  endTransform: TransformState
  easing: ZoomTransform['easing']
  shouldUseMotionBlur: boolean
} | null {
  
  const { segment, importance, intensity, maxZoomLevel, zoomPattern, targetResolution } = params
  
  // Calculate zoom level based on importance and intensity
  const baseZoom = 1.0
  const maxZoom = Math.min(maxZoomLevel, 1 + (intensity * 2 * importance))
  
  // Vary zoom direction and magnitude based on pattern and segment
  let startScale = baseZoom
  let endScale = maxZoom
  let startX = 0
  let startY = 0
  let endX = 0
  let endY = 0
  
  // Example numeric recipe for 1920x1080 as you specified
  switch (zoomPattern) {
    case 'gentle':
      // Gentle zoom with slight pan - your exact example
      startScale = 1.0
      endScale = Math.min(1.25, maxZoom)  // Cap at 1.25x as in your example
      endX = 60 * (importance - 0.5)      // Pan right/left based on importance (+60px example)
      endY = 0
      break
      
    case 'dynamic':
      // More dramatic movement
      startScale = 1.0
      endScale = maxZoom
      endX = 80 * Math.sin(params.segmentIndex) // Vary pan direction
      endY = 20 * Math.cos(params.segmentIndex)
      break
      
    case 'cinematic':
      // Slow zoom with organic movement
      startScale = 1.0 + (0.05 * importance) // Slight initial zoom
      endScale = maxZoom
      endX = 40 * (Math.random() - 0.5)      // Subtle random pan
      endY = 20 * (Math.random() - 0.5)
      break
  }
  
  // Skip if zoom change is too minimal
  if (Math.abs(endScale - startScale) < 0.05) return null
  
  return {
    startTransform: {
      scale: startScale,
      x: startX,
      y: startY
    },
    endTransform: {
      scale: endScale,
      x: endX,
      y: endY
    },
    easing: 'easeInOutCubic', // Always use smooth cubic easing
    shouldUseMotionBlur: endScale > 1.3 || Math.abs(endX) > 50 // Use motion blur for larger movements
  }
}

/**
 * Calculate importance score for a segment (0-1)
 * Higher scores get more dramatic zooms
 */
function calculateImportanceScore(segment: {
  text: string
  confidence?: number
  start: number
  end: number
}): number {
  let score = 0.5 // Base score
  
  // Confidence boosts importance
  if (segment.confidence) {
    score += (segment.confidence - 0.7) * 0.5 // Boost high-confidence segments
  }
  
  // Text analysis for importance cues
  const text = segment.text.toLowerCase()
  
  // Important phrases get higher scores
  const importantPhrases = [
    'important', 'key', 'crucial', 'essential', 'remember', 'note',
    'first', 'second', 'third', 'finally', 'in conclusion',
    'problem', 'solution', 'result', 'answer'
  ]
  
  importantPhrases.forEach(phrase => {
    if (text.includes(phrase)) score += 0.1
  })
  
  // Questions often deserve emphasis
  if (text.includes('?')) score += 0.15
  
  // Longer segments can handle more zoom
  const duration = segment.end - segment.start
  if (duration > 8) score += 0.1
  if (duration > 15) score += 0.1
  
  return Math.max(0, Math.min(1, score))
}

/**
 * Interpolate between transform states using easing
 * This is for preview/testing - actual rendering should be done by video renderer
 */
export function interpolateTransform(
  start: TransformState,
  end: TransformState,
  progress: number, // 0-1
  easingType: ZoomTransform['easing'] = 'easeInOutCubic'
): TransformState {
  
  const easingFunction = EasingFunctions[easingType]
  const easedProgress = easingFunction(progress)
  
  return {
    scale: start.scale + (end.scale - start.scale) * easedProgress,
    x: start.x + (end.x - start.x) * easedProgress,
    y: start.y + (end.y - start.y) * easedProgress,
    rotation: start.rotation && end.rotation 
      ? start.rotation + (end.rotation - start.rotation) * easedProgress
      : start.rotation || end.rotation
  }
}

/**
 * Convert zoom plan to Shotstack-compatible EDL format
 */
export function convertZoomPlanToEDL(zoomPlan: ZoomPlan): any {
  const effects = zoomPlan.transforms.map((transform, index) => ({
    type: 'transform',
    id: `zoom_transform_${index}`,
    startTime: transform.startTime,
    endTime: transform.startTime + transform.duration,
    parameters: {
      // Single keyframe pair - this is the critical fix!
      keyframes: [
        {
          time: 0,
          scale: transform.start.scale,
          x: transform.start.x,
          y: transform.start.y,
          rotation: transform.start.rotation || 0
        },
        {
          time: transform.duration,
          scale: transform.end.scale,
          x: transform.end.x,
          y: transform.end.y,
          rotation: transform.end.rotation || 0
        }
      ],
      easing: transform.easing,
      motionBlur: transform.motionBlur || false,
      subpixelPositioning: true // Enable subpixel accuracy
    }
  }))
  
  return {
    type: 'zoom_effects',
    effects,
    metadata: {
      totalTransforms: effects.length,
      maxZoomLevel: zoomPlan.qualitySettings.maxZoomLevel,
      usesSingleKeyframes: true, // Flag indicating proper implementation
      qualitySettings: zoomPlan.qualitySettings
    }
  }
}

function createEmptyZoomPlan(
  targetResolution: { width: number; height: number },
  recommendations: string[]
): ZoomPlan {
  return {
    transforms: [],
    totalDuration: 0,
    targetResolution,
    recommendations,
    qualitySettings: {
      useMotionBlur: false,
      subpixelPrecision: true,
      maxZoomLevel: 1.0
    }
  }
}

/**
 * Test function for development/preview
 */
export function testAutoZoom() {
  const testSegments = [
    { start: 0, end: 5, text: "This is an important introduction to our topic", confidence: 0.9, importance: 0.8 },
    { start: 5, end: 12, text: "Now let's dive into the key details you need to remember", confidence: 0.85, importance: 0.9 },
    { start: 12, end: 18, text: "Here's a simple example to illustrate the concept", confidence: 0.8, importance: 0.6 }
  ]
  
  const zoomPlan = generateAutoZoomPlan(testSegments, {
    intensity: 0.25,
    zoomPattern: 'gentle',
    enableMotionBlur: true
  })
  
  console.log('🎬 Test Zoom Plan:', JSON.stringify(zoomPlan, null, 2))
  
  // Test easing function
  console.log('📊 Easing test (0, 0.25, 0.5, 0.75, 1.0):')
  ;[0, 0.25, 0.5, 0.75, 1.0].forEach(t => {
    console.log(`t=${t} -> eased=${easeInOutCubic(t).toFixed(3)}`)
  })
}