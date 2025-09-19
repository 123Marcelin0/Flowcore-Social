import { z } from 'zod'

/**
 * Edit Decision List (EDL) Types and Validation
 * Defines the structured format for AI-generated cut plans
 */

// Transition types for smooth cuts
export const TransitionType = z.enum([
  'cut',           // Hard cut (no transition)
  'fade',          // Fade in/out
  'crossfade',     // Audio crossfade
  'dissolve',      // Video dissolve
  'wipe'           // Directional wipe
])

// Shot intent for cinematic planning
export const ShotIntent = z.enum([
  'establish',     // Establishing shot
  'focus',         // Focus on key content
  'transition',    // Transitional segment
  'emphasis',      // Emphasize important point
  'cleanup',       // Clean up bad takes
  'pacing',        // Adjust pacing/rhythm
  'silence_trim'   // Trim excessive silence
])

// Transform for keyframe-based animation
export const Transform = z.object({
  scale: z.number().min(0.1).max(5.0).default(1.0),
  translateX: z.number().min(-1000).max(1000).default(0),
  translateY: z.number().min(-1000).max(1000).default(0),
  rotate: z.number().min(-360).max(360).default(0),
  opacity: z.number().min(0).max(1).default(1)
})

// Easing function for smooth animations
export const EasingFunction = z.enum([
  'linear',
  'ease-in',
  'ease-out', 
  'ease-in-out',
  'cubic-bezier'
])

// Individual clip in the EDL
export const EDLClip = z.object({
  id: z.string().min(1, 'Clip ID is required'),
  startTime: z.number().min(0, 'Start time must be non-negative'),
  endTime: z.number().min(0, 'End time must be non-negative'),
  duration: z.number().min(0.01, 'Duration must be at least 0.01 seconds'),
  
  // Transition settings
  transition: TransitionType.default('cut'),
  transitionDuration: z.number().min(0).max(2).default(0.2),
  
  // Shot planning
  shotIntent: ShotIntent,
  confidence: z.number().min(0).max(1, 'Confidence must be between 0 and 1'),
  reason: z.string().min(1, 'Reason is required'),
  
  // Keyframe-based transforms (start → end)
  startTransform: Transform.optional(),
  endTransform: Transform.optional(),
  easing: EasingFunction.default('ease-in-out'),
  
  // Optional metadata
  originalText: z.string().optional(),
  asrConfidence: z.number().min(0).max(1).optional(),
  silenceDetected: z.boolean().default(false),
  badTakeMarker: z.boolean().default(false)
}).refine(
  (clip) => clip.endTime > clip.startTime,
  { message: 'End time must be greater than start time' }
).refine(
  (clip) => Math.abs(clip.duration - (clip.endTime - clip.startTime)) < 0.01,
  { message: 'Duration must match end time - start time' }
)

// Auto-fix pass configuration
export const AutoFixPass = z.object({
  type: z.enum(['silence_trim', 'mispronunciation_detect', 'filler_removal']),
  enabled: z.boolean().default(true),
  confidence: z.number().min(0).max(1).default(0.8),
  settings: z.record(z.any()).optional()
})

// Complete EDL structure
export const EditDecisionList = z.object({
  version: z.string().default('2.0'),
  createdAt: z.string().datetime(),
  
  // Source information
  sourceId: z.string().min(1, 'Source ID is required'),
  sourceDuration: z.number().min(0, 'Source duration must be non-negative'),
  
  // Clips in chronological order
  clips: z.array(EDLClip).min(1, 'At least one clip is required'),
  
  // Analysis metadata
  analysisMetadata: z.object({
    silenceDetection: z.object({
      totalSilenceRemoved: z.number().min(0),
      silencePercentage: z.number().min(0).max(100),
      trimThreshold: z.number().min(0)
    }),
    asrMetrics: z.object({
      averageConfidence: z.number().min(0).max(1),
      lowConfidenceSegments: z.number().min(0),
      estimatedWER: z.number().min(0).max(1)
    }),
    processingTime: z.number().min(0),
    aiModel: z.string().optional()
  }),
  
  // Auto-fix passes applied
  autoFixPasses: z.array(AutoFixPass).default([]),
  
  // Statistics
  statistics: z.object({
    originalDuration: z.number().min(0),
    finalDuration: z.number().min(0),
    reductionPercentage: z.number().min(0).max(100),
    clipsTotal: z.number().min(0),
    clipsKept: z.number().min(0),
    clipsRemoved: z.number().min(0)
  })
}).refine(
  (edl) => {
    // Validate clips are in chronological order and don't overlap
    for (let i = 1; i < edl.clips.length; i++) {
      if (edl.clips[i].startTime < edl.clips[i-1].endTime) {
        return false
      }
    }
    return true
  },
  { message: 'Clips must be in chronological order without overlaps' }
).refine(
  (edl) => edl.statistics.clipsKept === edl.clips.length,
  { message: 'Clips kept count must match actual clips array length' }
)

// Type exports
export type TransitionType = z.infer<typeof TransitionType>
export type ShotIntent = z.infer<typeof ShotIntent>
export type Transform = z.infer<typeof Transform>
export type EasingFunction = z.infer<typeof EasingFunction>
export type EDLClip = z.infer<typeof EDLClip>
export type AutoFixPass = z.infer<typeof AutoFixPass>
export type EditDecisionList = z.infer<typeof EditDecisionList>

/**
 * Validate an EDL object against the schema
 */
export function validateEDL(edl: unknown): { success: true; data: EditDecisionList } | { success: false; error: string } {
  try {
    const validated = EditDecisionList.parse(edl)
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('; ')
      return { success: false, error: messages }
    }
    return { success: false, error: 'Unknown validation error' }
  }
}

/**
 * Create a basic EDL template
 */
export function createEDLTemplate(sourceId: string, sourceDuration: number): Partial<EditDecisionList> {
  return {
    version: '2.0',
    createdAt: new Date().toISOString(),
    sourceId,
    sourceDuration,
    clips: [],
    analysisMetadata: {
      silenceDetection: {
        totalSilenceRemoved: 0,
        silencePercentage: 0,
        trimThreshold: 0.5
      },
      asrMetrics: {
        averageConfidence: 0.8,
        lowConfidenceSegments: 0,
        estimatedWER: 0.1
      },
      processingTime: 0,
      aiModel: 'gpt-4o'
    },
    autoFixPasses: [],
    statistics: {
      originalDuration: sourceDuration,
      finalDuration: 0,
      reductionPercentage: 0,
      clipsTotal: 0,
      clipsKept: 0,
      clipsRemoved: 0
    }
  }
}

/**
 * Convert legacy keep segments to EDL format
 */
export function convertLegacyToEDL(
  keepSegments: Array<{ start_ms: number; end_ms: number; text?: string }>,
  sourceId: string,
  sourceDuration: number
): EditDecisionList {
  const template = createEDLTemplate(sourceId, sourceDuration)
  
  const clips: EDLClip[] = keepSegments.map((segment, index) => ({
    id: `clip_${index + 1}`,
    startTime: segment.start_ms / 1000,
    endTime: segment.end_ms / 1000,
    duration: (segment.end_ms - segment.start_ms) / 1000,
    transition: 'cut' as TransitionType,
    transitionDuration: 0.1,
    shotIntent: 'focus' as ShotIntent,
    confidence: 0.8,
    reason: 'Converted from legacy keep segment',
    easing: 'ease-in-out' as EasingFunction,
    originalText: segment.text,
    silenceDetected: false,
    badTakeMarker: false
  }))
  
  const finalDuration = clips.reduce((sum, clip) => sum + clip.duration, 0)
  
  return {
    ...template,
    clips,
    statistics: {
      originalDuration: sourceDuration,
      finalDuration,
      reductionPercentage: ((sourceDuration - finalDuration) / sourceDuration) * 100,
      clipsTotal: keepSegments.length,
      clipsKept: clips.length,
      clipsRemoved: 0
    }
  } as EditDecisionList
}



















