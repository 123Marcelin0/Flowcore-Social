import { BoundingBox, MediaPipeFrame } from '@/hooks/useMediaPipeBoundingBox'

export interface CleanTransform {
  timestamp: number
  duration: number
  scale: number
  x: number
  y: number
  confidence: number
  reasoning: string
  easing: 'easeInOutCubic' | 'easeInCubic' | 'easeOutCubic' | 'linear'
}

export interface TransformOptions {
  targetAspectRatio: number // e.g., 9/16 for vertical video, 16/9 for horizontal
  maxZoomLevel: number // Maximum scale factor (e.g., 2.0)
  minZoomLevel: number // Minimum scale factor (e.g., 1.0)
  paddingPercent: number // Padding around subject (e.g., 0.15 for 15%)
  smoothingWindow: number // Frames to consider for smoothing (e.g., 5)
  minTransformDuration: number // Minimum duration for a transform (seconds)
  confidenceThreshold: number // Minimum confidence to use detection
}

export interface FrameAnalysis {
  primarySubject: BoundingBox | null
  subjectType: 'face' | 'body' | 'mixed'
  stability: number // 0-1, higher = more stable detection
  optimalTransform: {
    scale: number
    x: number
    y: number
    confidence: number
  }
}

const DEFAULT_OPTIONS: TransformOptions = {
  targetAspectRatio: 9/16, // Instagram Reels default
  maxZoomLevel: 2.0,
  minZoomLevel: 1.0,
  paddingPercent: 0.15,
  smoothingWindow: 5,
  minTransformDuration: 2.0,
  confidenceThreshold: 0.6
}

/**
 * Analyze MediaPipe frames and compute clean camera transforms
 * This is the core algorithm that turns bounding box detections into smooth camera movements
 */
export function computeCleanTransforms(
  frames: MediaPipeFrame[],
  videoResolution: { width: number; height: number },
  options: Partial<TransformOptions> = {}
): CleanTransform[] {
  
  const opts = { ...DEFAULT_OPTIONS, ...options }
  
  console.log(`🎯 Computing clean transforms for ${frames.length} frames`)
  console.log(`📐 Target aspect ratio: ${opts.targetAspectRatio.toFixed(2)}, Video: ${videoResolution.width}x${videoResolution.height}`)
  
  if (frames.length === 0) return []
  
  // Step 1: Analyze each frame to find optimal subject and transform
  const frameAnalyses: FrameAnalysis[] = frames.map(frame => 
    analyzeFrame(frame, videoResolution, opts)
  )
  
  // Step 2: Apply temporal smoothing to reduce jitter
  const smoothedAnalyses = applyTemporalSmoothing(frameAnalyses, opts.smoothingWindow)
  
  // Step 3: Generate discrete transforms with proper duration and easing
  const transforms = generateDiscreteTransforms(smoothedAnalyses, frames, opts)
  
  console.log(`✅ Generated ${transforms.length} clean transforms`)
  
  return transforms
}

/**
 * Analyze a single frame to determine the best camera transform
 */
function analyzeFrame(
  frame: MediaPipeFrame,
  videoResolution: { width: number; height: number },
  options: TransformOptions
): FrameAnalysis {
  
  const { boundingBoxes } = frame
  
  // Filter high-confidence detections
  const validBoxes = boundingBoxes.filter(box => box.confidence >= options.confidenceThreshold)
  
  if (validBoxes.length === 0) {
    return {
      primarySubject: null,
      subjectType: 'mixed',
      stability: 0,
      optimalTransform: {
        scale: 1.0,
        x: 0,
        y: 0,
        confidence: 0
      }
    }
  }
  
  // Find primary subject (largest, highest confidence)
  const primarySubject = findPrimarySubject(validBoxes)
  const subjectType = determineSubjectType(validBoxes)
  const stability = calculateStability(validBoxes)
  
  // Compute optimal transform for this subject
  const optimalTransform = computeOptimalTransform(
    primarySubject,
    videoResolution,
    options
  )
  
  return {
    primarySubject,
    subjectType,
    stability,
    optimalTransform
  }
}

/**
 * Find the most important subject in the frame
 */
function findPrimarySubject(boxes: BoundingBox[]): BoundingBox {
  // Priority: Face > Body, then by size and confidence
  const faces = boxes.filter(box => box.type === 'face')
  const bodies = boxes.filter(box => box.type === 'body')
  
  if (faces.length > 0) {
    // Use largest, most confident face
    return faces.reduce((best, current) => {
      const bestScore = (best.width * best.height) * best.confidence
      const currentScore = (current.width * current.height) * current.confidence
      return currentScore > bestScore ? current : best
    })
  }
  
  if (bodies.length > 0) {
    // Use largest, most confident body
    return bodies.reduce((best, current) => {
      const bestScore = (best.width * best.height) * best.confidence
      const currentScore = (current.width * current.height) * current.confidence
      return currentScore > bestScore ? current : best
    })
  }
  
  // Fallback to largest detection
  return boxes.reduce((best, current) => {
    const bestSize = best.width * best.height
    const currentSize = current.width * current.height
    return currentSize > bestSize ? current : best
  })
}

/**
 * Determine the dominant subject type in the frame
 */
function determineSubjectType(boxes: BoundingBox[]): 'face' | 'body' | 'mixed' {
  const faces = boxes.filter(box => box.type === 'face').length
  const bodies = boxes.filter(box => box.type === 'body').length
  
  if (faces > 0 && bodies === 0) return 'face'
  if (bodies > 0 && faces === 0) return 'body'
  return 'mixed'
}

/**
 * Calculate detection stability (consistency of detection)
 */
function calculateStability(boxes: BoundingBox[]): number {
  if (boxes.length === 0) return 0
  
  // Simple stability metric based on confidence and count
  const avgConfidence = boxes.reduce((sum, box) => sum + box.confidence, 0) / boxes.length
  const countStability = Math.min(1.0, boxes.length / 2) // Prefer 1-2 clear detections
  
  return (avgConfidence + countStability) / 2
}

/**
 * Compute the optimal camera transform for a given subject
 */
function computeOptimalTransform(
  subject: BoundingBox,
  videoResolution: { width: number; height: number },
  options: TransformOptions
) {
  const { width: videoWidth, height: videoHeight } = videoResolution
  const { targetAspectRatio, paddingPercent, maxZoomLevel, minZoomLevel } = options
  
  // Calculate subject center
  const subjectCenterX = subject.x + subject.width / 2
  const subjectCenterY = subject.y + subject.height / 2
  
  // Calculate required scale to fit subject with padding
  const subjectWithPadding = {
    width: subject.width * (1 + paddingPercent * 2),
    height: subject.height * (1 + paddingPercent * 2)
  }
  
  // Determine target frame size based on aspect ratio
  const targetFrameWidth = Math.min(videoWidth, videoHeight * targetAspectRatio)
  const targetFrameHeight = Math.min(videoHeight, videoWidth / targetAspectRatio)
  
  // Calculate scale needed to fit subject in target frame
  const scaleX = targetFrameWidth / subjectWithPadding.width
  const scaleY = targetFrameHeight / subjectWithPadding.height
  const requiredScale = Math.min(scaleX, scaleY)
  
  // Clamp scale to allowed range
  const scale = Math.max(minZoomLevel, Math.min(maxZoomLevel, requiredScale))
  
  // Calculate pan offset to center subject
  const scaledVideoWidth = videoWidth / scale
  const scaledVideoHeight = videoHeight / scale
  
  // Target center position in scaled video space
  const targetCenterX = scaledVideoWidth / 2
  const targetCenterY = scaledVideoHeight / 2
  
  // Calculate offset needed to center subject
  const offsetX = (targetCenterX - subjectCenterX) * scale
  const offsetY = (targetCenterY - subjectCenterY) * scale
  
  // Clamp offsets to prevent going out of bounds
  const maxOffsetX = (videoWidth - scaledVideoWidth) / 2
  const maxOffsetY = (videoHeight - scaledVideoHeight) / 2
  
  const clampedOffsetX = Math.max(-maxOffsetX, Math.min(maxOffsetX, offsetX))
  const clampedOffsetY = Math.max(-maxOffsetY, Math.min(maxOffsetY, offsetY))
  
  const confidence = Math.min(1.0, subject.confidence * (scale <= maxZoomLevel ? 1.0 : 0.8))
  
  return {
    scale,
    x: clampedOffsetX,
    y: clampedOffsetY,
    confidence
  }
}

/**
 * Apply temporal smoothing to reduce jitter between frames
 */
function applyTemporalSmoothing(
  analyses: FrameAnalysis[],
  windowSize: number
): FrameAnalysis[] {
  
  if (analyses.length <= windowSize) return analyses
  
  return analyses.map((analysis, index) => {
    const start = Math.max(0, index - Math.floor(windowSize / 2))
    const end = Math.min(analyses.length, index + Math.floor(windowSize / 2) + 1)
    const window = analyses.slice(start, end)
    
    // Only smooth if we have good detections
    const validTransforms = window
      .map(a => a.optimalTransform)
      .filter(t => t.confidence >= 0.5)
    
    if (validTransforms.length === 0) return analysis
    
    // Apply exponential moving average
    const smoothed = {
      scale: validTransforms.reduce((sum, t) => sum + t.scale, 0) / validTransforms.length,
      x: validTransforms.reduce((sum, t) => sum + t.x, 0) / validTransforms.length,
      y: validTransforms.reduce((sum, t) => sum + t.y, 0) / validTransforms.length,
      confidence: Math.max(...validTransforms.map(t => t.confidence))
    }
    
    return {
      ...analysis,
      optimalTransform: smoothed
    }
  })
}

/**
 * Generate discrete transforms with proper duration and easing
 * This avoids the jerky movement problem by creating smooth transitions
 */
function generateDiscreteTransforms(
  analyses: FrameAnalysis[],
  frames: MediaPipeFrame[],
  options: TransformOptions
): CleanTransform[] {
  
  if (analyses.length === 0) return []
  
  const transforms: CleanTransform[] = []
  let currentTransform: Partial<CleanTransform> | null = null
  
  for (let i = 0; i < analyses.length; i++) {
    const analysis = analyses[i]
    const frame = frames[i]
    const transform = analysis.optimalTransform
    
    // Skip low-confidence transforms
    if (transform.confidence < options.confidenceThreshold) {
      continue
    }
    
    // Check if we need a new transform (significant change)
    const needsNewTransform = !currentTransform || 
      Math.abs(transform.scale - currentTransform.scale!) > 0.1 ||
      Math.abs(transform.x - currentTransform.x!) > 30 ||
      Math.abs(transform.y - currentTransform.y!) > 30
    
    if (needsNewTransform) {
      // Finalize previous transform
      if (currentTransform && currentTransform.timestamp !== undefined) {
        const duration = frame.timestamp - currentTransform.timestamp
        if (duration >= options.minTransformDuration) {
          transforms.push({
            ...currentTransform,
            duration,
            easing: 'easeInOutCubic'
          } as CleanTransform)
        }
      }
      
      // Start new transform
      currentTransform = {
        timestamp: frame.timestamp,
        scale: transform.scale,
        x: transform.x,
        y: transform.y,
        confidence: transform.confidence,
        reasoning: `${analysis.subjectType} detection (${(transform.confidence * 100).toFixed(0)}% confidence)`
      }
    } else {
      // Update current transform with smoothed values
      if (currentTransform) {
        currentTransform.scale = (currentTransform.scale! + transform.scale) / 2
        currentTransform.x = (currentTransform.x! + transform.x) / 2
        currentTransform.y = (currentTransform.y! + transform.y) / 2
        currentTransform.confidence = Math.max(currentTransform.confidence!, transform.confidence)
      }
    }
  }
  
  // Finalize last transform
  if (currentTransform && currentTransform.timestamp !== undefined) {
    const lastFrame = frames[frames.length - 1]
    const duration = lastFrame.timestamp - currentTransform.timestamp
    if (duration >= options.minTransformDuration) {
      transforms.push({
        ...currentTransform,
        duration,
        easing: 'easeInOutCubic'
      } as CleanTransform)
    }
  }
  
  return transforms
}

/**
 * Convert clean transforms to Shotstack-compatible EDL format
 */
export function transformsToEDL(
  transforms: CleanTransform[],
  videoResolution: { width: number; height: number }
): any {
  
  const effects = transforms.map((transform, index) => ({
    type: 'transform',
    id: `mediapipe_transform_${index}`,
    startTime: transform.timestamp,
    endTime: transform.timestamp + transform.duration,
    parameters: {
      // Single keyframe approach - critical for smooth movement
      keyframes: [
        {
          time: 0,
          scale: 1.0, // Start at original scale
          x: 0,
          y: 0,
          rotation: 0
        },
        {
          time: transform.duration,
          scale: transform.scale,
          x: transform.x,
          y: transform.y,
          rotation: 0
        }
      ],
      easing: transform.easing,
      subpixelPositioning: true,
      motionBlur: transform.scale > 1.3, // Add motion blur for significant zoom
      metadata: {
        confidence: transform.confidence,
        reasoning: transform.reasoning,
        source: 'mediapipe_detection'
      }
    }
  }))
  
  return {
    type: 'mediapipe_transforms',
    effects,
    metadata: {
      totalTransforms: effects.length,
      videoResolution,
      source: 'MediaPipe Web',
      algorithm: 'clean_transforms_v1',
      averageConfidence: transforms.reduce((sum, t) => sum + t.confidence, 0) / transforms.length
    }
  }
}

/**
 * Utility function to preview transforms (for debugging)
 */
export function previewTransforms(
  transforms: CleanTransform[],
  videoResolution: { width: number; height: number }
): string {
  
  const summary = transforms.map((transform, index) => 
    `Transform ${index + 1}: ${transform.timestamp.toFixed(1)}s-${(transform.timestamp + transform.duration).toFixed(1)}s ` +
    `Scale: ${transform.scale.toFixed(2)}x, Pan: (${transform.x.toFixed(0)}, ${transform.y.toFixed(0)}) ` +
    `Confidence: ${(transform.confidence * 100).toFixed(0)}% - ${transform.reasoning}`
  ).join('\n')
  
  return `MediaPipe Transform Preview:\n` +
         `Video: ${videoResolution.width}x${videoResolution.height}\n` +
         `Total Transforms: ${transforms.length}\n` +
         `Duration: ${transforms.reduce((sum, t) => sum + t.duration, 0).toFixed(1)}s\n\n` +
         summary
}