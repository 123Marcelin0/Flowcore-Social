import { generateCutPlan, ProcessingSignals } from './cuts'
import { cutPlanToEDL, validateEDL, generateEDLSummary } from '@/utils/cutPlanToEDL'
import { edlToShotstack, validateShotstackEdit, optimizeShotstackEdit, ShotstackAdapterOptions } from '@/utils/shotstackAdapter'
import { CutPlan } from '@/lib/schemas/cutPlan'

/**
 * Main controller for complete video processing pipeline
 * This is the primary function you'll call with your computed signals + transforms
 */
export class VideoProcessingController {
  
  /**
   * Process video from signals to final Shotstack render request
   */
  static async processVideo(
    signals: ProcessingSignals,
    sourceFilePath: string,
    options: VideoProcessingOptions = {}
  ): Promise<VideoProcessingResult> {
    console.log(`🎬 Starting complete video processing for upload: ${signals.uploadId}`)
    
    const startTime = Date.now()
    const result: VideoProcessingResult = {
      success: false,
      uploadId: signals.uploadId,
      processingTimeMs: 0,
      steps: []
    }
    
    try {
      // Step 1: Generate validated CutPlan
      console.log('📋 Step 1: Generating CutPlan from signals...')
      const stepStart = Date.now()
      
      const cutPlan = await generateCutPlan(signals)
      
      result.cutPlan = cutPlan
      result.steps.push({
        name: 'cutPlan',
        success: true,
        timeMs: Date.now() - stepStart,
        data: {
          segments: cutPlan.segments.length,
          keptSegments: cutPlan.segments.filter(s => s.action === 'keep').length,
          removedSegments: cutPlan.segments.filter(s => s.action === 'remove').length,
          transforms: cutPlan.segments.reduce((sum, s) => sum + s.transforms.length, 0),
          qualityScore: cutPlan.qualityMetrics.engagementScore
        }
      })
      
      // Step 2: Convert CutPlan to EDL JSON
      console.log('📝 Step 2: Converting CutPlan to EDL JSON...')
      const edlStepStart = Date.now()
      
      const edl = cutPlanToEDL(cutPlan, sourceFilePath)
      
      // Validate EDL
      const edlValidation = validateEDL(edl)
      if (!edlValidation.valid) {
        throw new Error(`EDL validation failed: ${edlValidation.errors.join(', ')}`)
      }
      
      result.edl = edl
      result.edlSummary = generateEDLSummary(edl)
      result.steps.push({
        name: 'edl',
        success: true,
        timeMs: Date.now() - edlStepStart,
        data: {
          tracks: edl.tracks.length,
          clips: edl.tracks.reduce((sum, t) => sum + t.clips.length, 0),
          effects: edl.globalEffects.length,
          duration: edl.duration
        }
      })
      
      // Step 3: Convert EDL to Shotstack format
      console.log('🎯 Step 3: Converting EDL to Shotstack format...')
      const shotstackStepStart = Date.now()
      
      const shotstackOptions: ShotstackAdapterOptions = {
        enableCache: true,
        quality: options.quality || 'medium',
        outputFormat: options.outputFormat || 'mp4',
        callbackUrl: options.callbackUrl,
        backgroundMusicUrl: options.backgroundMusicUrl,
        customFonts: options.customFonts,
        subtitleStyle: options.subtitleStyle,
        enableKeyframeInterpolation: true,
        simplifyTransforms: true,
        ...options.shotstackOptions
      }
      
      let shotstackEdit = edlToShotstack(edl, shotstackOptions)
      
      // Optimize for performance
      if (options.optimizeForPerformance !== false) {
        shotstackEdit = optimizeShotstackEdit(shotstackEdit)
      }
      
      // Validate Shotstack edit
      const shotstackValidation = validateShotstackEdit(shotstackEdit)
      if (!shotstackValidation.valid) {
        throw new Error(`Shotstack validation failed: ${shotstackValidation.errors.join(', ')}`)
      }
      
      result.shotstackEdit = shotstackEdit
      result.steps.push({
        name: 'shotstack',
        success: true,
        timeMs: Date.now() - shotstackStepStart,
        data: {
          tracks: shotstackEdit.timeline.tracks.length,
          clips: shotstackEdit.timeline.tracks.reduce((sum, t) => sum + t.clips.length, 0),
          format: shotstackEdit.output.format,
          resolution: shotstackEdit.output.resolution
        }
      })
      
      // Success!
      result.success = true
      result.processingTimeMs = Date.now() - startTime
      
      console.log(`✅ Video processing completed successfully in ${result.processingTimeMs}ms`)
      
      return result
      
    } catch (error) {
      console.error('❌ Video processing failed:', error)
      
      result.success = false
      result.error = error instanceof Error ? error.message : 'Unknown error'
      result.processingTimeMs = Date.now() - startTime
      
      // Add failed step
      const currentStepName = result.steps.length === 0 ? 'cutPlan' : 
        result.steps.length === 1 ? 'edl' : 'shotstack'
      
      result.steps.push({
        name: currentStepName,
        success: false,
        timeMs: Date.now() - startTime,
        error: result.error
      })
      
      return result
    }
  }
  
  /**
   * Generate only CutPlan from signals
   */
  static async generateCutPlanOnly(signals: ProcessingSignals): Promise<CutPlan> {
    return generateCutPlan(signals)
  }
  
  /**
   * Convert CutPlan to EDL only
   */
  static convertCutPlanToEDL(cutPlan: CutPlan, sourceFilePath: string) {
    const edl = cutPlanToEDL(cutPlan, sourceFilePath)
    const validation = validateEDL(edl)
    
    if (!validation.valid) {
      throw new Error(`EDL validation failed: ${validation.errors.join(', ')}`)
    }
    
    return {
      edl,
      summary: generateEDLSummary(edl),
      validation
    }
  }
  
  /**
   * Convert EDL to Shotstack only
   */
  static convertEDLToShotstack(
    edl: any, 
    options: ShotstackAdapterOptions = {}
  ) {
    let shotstackEdit = edlToShotstack(edl, options)
    
    // Optimize if requested
    if (options.enableKeyframeInterpolation !== false) {
      shotstackEdit = optimizeShotstackEdit(shotstackEdit)
    }
    
    const validation = validateShotstackEdit(shotstackEdit)
    
    if (!validation.valid) {
      throw new Error(`Shotstack validation failed: ${validation.errors.join(', ')}`)
    }
    
    return {
      shotstackEdit,
      validation
    }
  }
  
  /**
   * Validate processing signals before starting
   */
  static validateProcessingSignals(signals: ProcessingSignals): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    // Required fields
    if (!signals.uploadId) errors.push('Missing uploadId')
    if (!signals.sourceFile) errors.push('Missing sourceFile')
    if (!signals.sourceMetadata) errors.push('Missing sourceMetadata')
    if (!signals.asrSegments || signals.asrSegments.length === 0) errors.push('Missing or empty asrSegments')
    if (!signals.options) errors.push('Missing processing options')
    
    // Validate source metadata
    if (signals.sourceMetadata) {
      if (!signals.sourceMetadata.duration || signals.sourceMetadata.duration <= 0) {
        errors.push('Invalid source duration')
      }
      if (!signals.sourceMetadata.resolution || 
          !signals.sourceMetadata.resolution.width || 
          !signals.sourceMetadata.resolution.height) {
        errors.push('Invalid source resolution')
      }
      if (!signals.sourceMetadata.fps || signals.sourceMetadata.fps <= 0) {
        errors.push('Invalid source fps')
      }
    }
    
    // Validate ASR segments
    if (signals.asrSegments) {
      for (const [index, segment] of signals.asrSegments.entries()) {
        if (segment.start >= segment.end) {
          errors.push(`ASR segment ${index} has invalid timeline`)
        }
        if (!segment.text || segment.text.trim().length === 0) {
          errors.push(`ASR segment ${index} has no text`)
        }
        if (segment.confidence < 0 || segment.confidence > 1) {
          errors.push(`ASR segment ${index} has invalid confidence`)
        }
      }
    }
    
    // Validate arrays
    if (signals.silenceRegions && !Array.isArray(signals.silenceRegions)) {
      errors.push('silenceRegions must be an array')
    }
    if (signals.fillerDetections && !Array.isArray(signals.fillerDetections)) {
      errors.push('fillerDetections must be an array')
    }
    if (signals.confidenceAnalysis && !Array.isArray(signals.confidenceAnalysis)) {
      errors.push('confidenceAnalysis must be an array')
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }
  
  /**
   * Generate processing summary for debugging
   */
  static generateProcessingSummary(result: VideoProcessingResult): string {
    const summary = [`Video Processing Summary for ${result.uploadId}:`]
    summary.push(`Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`)
    summary.push(`Total Time: ${result.processingTimeMs}ms`)
    
    if (result.error) {
      summary.push(`Error: ${result.error}`)
    }
    
    summary.push('\nSteps:')
    for (const step of result.steps) {
      const status = step.success ? '✅' : '❌'
      summary.push(`  ${status} ${step.name}: ${step.timeMs}ms`)
      if (step.data) {
        for (const [key, value] of Object.entries(step.data)) {
          summary.push(`    ${key}: ${value}`)
        }
      }
      if (step.error) {
        summary.push(`    Error: ${step.error}`)
      }
    }
    
    if (result.cutPlan) {
      summary.push('\nCutPlan:')
      summary.push(`  Segments: ${result.cutPlan.segments.length}`)
      summary.push(`  Quality Score: ${(result.cutPlan.qualityMetrics.engagementScore * 100).toFixed(1)}%`)
      summary.push(`  Target Duration: ${result.cutPlan.globalAdjustments.targetDuration}s`)
    }
    
    if (result.edlSummary) {
      summary.push('\nEDL:')
      summary.push(`  Tracks: ${result.edlSummary.totalTracks}`)
      summary.push(`  Clips: ${result.edlSummary.totalClips}`)
      summary.push(`  Transforms: ${result.edlSummary.transformCount}`)
    }
    
    return summary.join('\n')
  }
}

// Types
export interface VideoProcessingOptions {
  // Output options
  quality?: 'draft' | 'low' | 'medium' | 'high'
  outputFormat?: 'mp4' | 'gif'
  optimizeForPerformance?: boolean
  
  // Callback options
  callbackUrl?: string
  
  // Media options
  backgroundMusicUrl?: string
  customFonts?: string[]
  
  // Styling options
  subtitleStyle?: {
    fontFamily?: string
    fontSize?: number
    color?: string
    backgroundColor?: string
  }
  
  // Shotstack-specific options
  shotstackOptions?: ShotstackAdapterOptions
}

export interface VideoProcessingResult {
  success: boolean
  uploadId: string
  processingTimeMs: number
  error?: string
  
  // Generated assets
  cutPlan?: CutPlan
  edl?: any
  edlSummary?: any
  shotstackEdit?: any
  
  // Step-by-step results
  steps: Array<{
    name: 'cutPlan' | 'edl' | 'shotstack'
    success: boolean
    timeMs: number
    data?: any
    error?: string
  }>
}

/**
 * Utility functions for common processing scenarios
 */

/**
 * Process video for Instagram Reels
 */
export async function processForInstagramReels(
  signals: ProcessingSignals,
  sourceFilePath: string,
  options: Partial<VideoProcessingOptions> = {}
): Promise<VideoProcessingResult> {
  // Configure for Instagram Reels
  const reelsSignals: ProcessingSignals = {
    ...signals,
    options: {
      ...signals.options,
      targetFormat: 'instagram_reels',
      targetDuration: options.shotstackOptions?.maxTransformsPerClip || 30,
      optimizeForEngagement: true
    }
  }
  
  const reelsOptions: VideoProcessingOptions = {
    quality: 'high',
    outputFormat: 'mp4',
    subtitleStyle: {
      fontSize: 28,
      color: '#FFFFFF',
      fontFamily: 'Arial Black'
    },
    ...options,
    shotstackOptions: {
      enableCache: true,
      simplifyTransforms: true,
      ...options.shotstackOptions
    }
  }
  
  return VideoProcessingController.processVideo(reelsSignals, sourceFilePath, reelsOptions)
}

/**
 * Process video for YouTube Shorts
 */
export async function processForYouTubeShorts(
  signals: ProcessingSignals,
  sourceFilePath: string,
  options: Partial<VideoProcessingOptions> = {}
): Promise<VideoProcessingResult> {
  const shortsSignals: ProcessingSignals = {
    ...signals,
    options: {
      ...signals.options,
      targetFormat: 'youtube_shorts',
      targetDuration: 60,
      optimizeForEngagement: true
    }
  }
  
  const shortsOptions: VideoProcessingOptions = {
    quality: 'high',
    outputFormat: 'mp4',
    subtitleStyle: {
      fontSize: 26,
      color: '#FFFFFF'
    },
    ...options
  }
  
  return VideoProcessingController.processVideo(shortsSignals, sourceFilePath, shortsOptions)
}

/**
 * Process video for TikTok
 */
export async function processForTikTok(
  signals: ProcessingSignals,
  sourceFilePath: string,
  options: Partial<VideoProcessingOptions> = {}
): Promise<VideoProcessingResult> {
  const tiktokSignals: ProcessingSignals = {
    ...signals,
    options: {
      ...signals.options,
      targetFormat: 'tiktok',
      targetDuration: 15,
      optimizeForEngagement: true,
      aggressiveness: Math.min(1.0, signals.options.aggressiveness + 0.2) // More aggressive for TikTok
    }
  }
  
  const tiktokOptions: VideoProcessingOptions = {
    quality: 'high',
    outputFormat: 'mp4',
    optimizeForPerformance: true,
    subtitleStyle: {
      fontSize: 30,
      color: '#FFFFFF',
      fontFamily: 'Arial Black'
    },
    ...options
  }
  
  return VideoProcessingController.processVideo(tiktokSignals, sourceFilePath, tiktokOptions)
}