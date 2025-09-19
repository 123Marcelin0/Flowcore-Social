import { z } from 'zod'

// Basic types
export const TransformSchema = z.object({
  type: z.enum(['scale', 'pan', 'rotate', 'crop']),
  startTime: z.number(),
  endTime: z.number(),
  startValue: z.union([z.number(), z.object({
    x: z.number(),
    y: z.number(),
    scale: z.number().optional(),
    rotation: z.number().optional()
  })]),
  endValue: z.union([z.number(), z.object({
    x: z.number(),
    y: z.number(),
    scale: z.number().optional(),
    rotation: z.number().optional()
  })]),
  easing: z.enum(['linear', 'easeIn', 'easeOut', 'easeInOut', 'easeInOutCubic']).default('easeInOutCubic'),
  source: z.enum(['mediapipe', 'auto_zoom', 'manual', 'ai_decision']).optional()
})

export const TransitionSchema = z.object({
  type: z.enum(['cut', 'fade', 'dissolve', 'wipe', 'zoom']),
  duration: z.number().min(0).max(5), // Max 5 second transitions
  easing: z.enum(['linear', 'easeIn', 'easeOut', 'easeInOut']).default('easeInOut'),
  properties: z.record(z.any()).optional() // Custom transition properties
})

export const SegmentSchema = z.object({
  id: z.string(),
  startTime: z.number(),
  endTime: z.number(),
  sourceStartTime: z.number(), // Original video timestamp
  sourceEndTime: z.number(),
  text: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  action: z.enum(['keep', 'remove', 'modify']),
  reason: z.string().optional(),
  transforms: z.array(TransformSchema).default([]),
  transition: TransitionSchema.optional(),
  metadata: z.object({
    speaker: z.string().optional(),
    volume: z.number().optional(),
    silenceScore: z.number().optional(),
    fillerScore: z.number().optional(),
    werScore: z.number().optional(),
    qualityScore: z.number().optional()
  }).optional()
})

export const AudioAdjustmentSchema = z.object({
  startTime: z.number(),
  endTime: z.number(),
  type: z.enum(['volume', 'fade_in', 'fade_out', 'noise_reduction', 'compression']),
  value: z.number(), // Volume multiplier, fade duration, etc.
  easing: z.enum(['linear', 'exponential', 'logarithmic']).default('linear')
})

export const SubtitleStyleSchema = z.object({
  fontFamily: z.string().default('Arial'),
  fontSize: z.number().default(24),
  color: z.string().default('#FFFFFF'),
  backgroundColor: z.string().optional(),
  strokeColor: z.string().optional(),
  strokeWidth: z.number().default(0),
  alignment: z.enum(['left', 'center', 'right']).default('center'),
  position: z.object({
    x: z.number().default(0.5), // 0-1 normalized
    y: z.number().default(0.85)  // 0-1 normalized
  }),
  animation: z.enum(['none', 'fade', 'slide', 'typewriter']).default('fade'),
  shadow: z.object({
    offsetX: z.number().default(2),
    offsetY: z.number().default(2),
    blur: z.number().default(4),
    color: z.string().default('#000000')
  }).optional()
})

export const SubtitleSegmentSchema = z.object({
  startTime: z.number(),
  endTime: z.number(),
  text: z.string(),
  style: SubtitleStyleSchema.optional(),
  speaker: z.string().optional(),
  confidence: z.number().optional()
})

export const QualityMetricsSchema = z.object({
  engagementScore: z.number().min(0).max(1), // How engaging is the content
  retentionPrediction: z.number().min(0).max(1), // Predicted viewer retention
  paceScore: z.number().min(0).max(1), // How well-paced the editing is
  coherenceScore: z.number().min(0).max(1), // How coherent the flow is
  technicalScore: z.number().min(0).max(1), // Technical quality of transforms
  socialMediaOptimization: z.number().min(0).max(1), // Optimization for social platforms
  averageSegmentDuration: z.number(),
  totalCuts: z.number(),
  transformDensity: z.number() // Transforms per minute
})

export const GlobalAdjustmentsSchema = z.object({
  targetDuration: z.number().positive(),
  targetAspectRatio: z.number().positive(), // e.g., 9/16 for vertical
  targetFormat: z.enum(['instagram_reels', 'youtube_shorts', 'tiktok', 'youtube_landscape', 'custom']),
  speedAdjustment: z.number().min(0.5).max(3.0).default(1.0), // Global playback speed
  audioLeveling: z.boolean().default(true),
  colorGrading: z.object({
    brightness: z.number().default(0),
    contrast: z.number().default(0),
    saturation: z.number().default(0),
    temperature: z.number().default(0),
    preset: z.enum(['none', 'warm', 'cool', 'vibrant', 'cinematic']).default('none')
  }).optional(),
  backgroundMusic: z.object({
    enabled: z.boolean().default(false),
    track: z.string().optional(),
    volume: z.number().min(0).max(1).default(0.3),
    fadeIn: z.number().default(1),
    fadeOut: z.number().default(2)
  }).optional()
})

export const ProcessingMetadataSchema = z.object({
  version: z.string().default('v1.0'),
  timestamp: z.string(),
  processingTimeMs: z.number(),
  sourceFile: z.string(),
  sourceMetadata: z.object({
    duration: z.number(),
    resolution: z.object({
      width: z.number(),
      height: z.number()
    }),
    fps: z.number(),
    bitrate: z.number().optional(),
    codec: z.string().optional()
  }),
  signalsUsed: z.array(z.enum([
    'silence_detection',
    'filler_detection', 
    'wer_analysis',
    'confidence_analysis',
    'mediapipe_transforms',
    'auto_zoom',
    'ai_analysis'
  ])),
  processingOptions: z.record(z.any()),
  warnings: z.array(z.string()).default([]),
  errors: z.array(z.string()).default([])
})

// Main CutPlan schema
export const CutPlanSchema = z.object({
  id: z.string(),
  uploadId: z.string(),
  segments: z.array(SegmentSchema),
  audioAdjustments: z.array(AudioAdjustmentSchema).default([]),
  subtitles: z.array(SubtitleSegmentSchema).default([]),
  qualityMetrics: QualityMetricsSchema,
  globalAdjustments: GlobalAdjustmentsSchema,
  processingMetadata: ProcessingMetadataSchema
})

// Type exports for use in other files
export type Transform = z.infer<typeof TransformSchema>
export type Transition = z.infer<typeof TransitionSchema>
export type Segment = z.infer<typeof SegmentSchema>
export type AudioAdjustment = z.infer<typeof AudioAdjustmentSchema>
export type SubtitleStyle = z.infer<typeof SubtitleStyleSchema>
export type SubtitleSegment = z.infer<typeof SubtitleSegmentSchema>
export type QualityMetrics = z.infer<typeof QualityMetricsSchema>
export type GlobalAdjustments = z.infer<typeof GlobalAdjustmentsSchema>
export type ProcessingMetadata = z.infer<typeof ProcessingMetadataSchema>
export type CutPlan = z.infer<typeof CutPlanSchema>

// Validation functions
export function validateCutPlan(data: unknown): CutPlan {
  try {
    return CutPlanSchema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`CutPlan validation failed: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`)
    }
    throw error
  }
}

export function validateCutPlanSafe(data: unknown): { success: true; data: CutPlan } | { success: false; error: string } {
  const result = CutPlanSchema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  } else {
    return { 
      success: false, 
      error: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
    }
  }
}

// Utility functions for creating common structures
export function createBasicSegment(
  startTime: number, 
  endTime: number, 
  sourceStartTime: number, 
  sourceEndTime: number,
  action: 'keep' | 'remove' | 'modify' = 'keep'
): Segment {
  return {
    id: `segment_${startTime}_${endTime}`,
    startTime,
    endTime,
    sourceStartTime,
    sourceEndTime,
    action,
    transforms: []
  }
}

export function createTransform(
  type: Transform['type'],
  startTime: number,
  endTime: number,
  startValue: Transform['startValue'],
  endValue: Transform['endValue'],
  source?: Transform['source']
): Transform {
  return {
    type,
    startTime,
    endTime,
    startValue,
    endValue,
    easing: 'easeInOutCubic',
    source
  }
}

export function createQualityMetrics(
  engagementScore: number,
  retentionPrediction: number,
  totalCuts: number,
  averageSegmentDuration: number
): QualityMetrics {
  return {
    engagementScore,
    retentionPrediction,
    paceScore: Math.min(1, totalCuts / 10), // Rough heuristic
    coherenceScore: Math.max(0, 1 - (totalCuts * 0.05)), // Fewer cuts = more coherent
    technicalScore: 0.8, // Default technical quality
    socialMediaOptimization: engagementScore * 0.8,
    averageSegmentDuration,
    totalCuts,
    transformDensity: totalCuts / (averageSegmentDuration * totalCuts / 60) // Transforms per minute
  }
}