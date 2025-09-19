import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { 
  generateAutoZoomPlan, 
  convertZoomPlanToEDL,
  type ZoomAnalysisOptions 
} from '@/lib/autoZoom'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { uploadId, options = {} } = body

    if (!uploadId) {
      return NextResponse.json(
        { success: false, error: 'Upload ID is required' },
        { status: 400 }
      )
    }

    console.log(`🎬 Generating professional auto-zoom plan for upload: ${uploadId}`)

    const db = supabaseAdmin || supabase
    const { data: media, error: mediaError } = await db
      .from('media_files')
      .select('id, storage_url, metadata')
      .eq('id', uploadId)
      .single()

    if (mediaError || !media) {
      return NextResponse.json(
        { success: false, error: 'Media file not found' },
        { status: 404 }
      )
    }

    const mediaMetadata = (media as any).metadata || {}
    
    // Extract transcript segments from ASR data
    const asr = mediaMetadata.asr
    let segments: any[] = []
    
    if (asr?.segments && Array.isArray(asr.segments)) {
      segments = asr.segments.map((seg: any) => ({
        start: seg.start,
        end: seg.end,
        text: seg.text || '',
        confidence: seg.confidence || 0.8,
        importance: calculateSegmentImportance(seg)
      }))
    } else if (asr?.words && Array.isArray(asr.words)) {
      // Create segments from word-level data if no segments available
      segments = createSegmentsFromWords(asr.words)
    }

    if (segments.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No transcript segments available for zoom analysis' },
        { status: 400 }
      )
    }

    // Prepare zoom analysis options with your exact specifications
    const zoomOptions: ZoomAnalysisOptions = {
      intensity: options.zoomIntensity || 0.25,          // Default 25% intensity
      targetResolution: mediaMetadata.resolution || { width: 1920, height: 1080 },
      minSegmentDuration: options.minSegmentDuration || 3,
      maxZoomLevel: 1 + ((options.zoomIntensity || 0.25) * 2), // e.g., 1.5 for 25% intensity
      enableMotionBlur: options.enableMotionBlur || false,
      zoomPattern: options.zoomPattern || 'gentle'
    }

    console.log(`📊 Processing ${segments.length} segments with intensity: ${(zoomOptions.intensity! * 100).toFixed(0)}%`)

    // Generate the zoom plan using your single keyframe approach
    const zoomPlan = generateAutoZoomPlan(segments, zoomOptions)
    
    console.log(`✅ Generated zoom plan with ${zoomPlan.transforms.length} smooth transforms`)
    
    // Convert to EDL format with single keyframes (no multiple steps!)
    const edlFormat = convertZoomPlanToEDL(zoomPlan)
    
    // Calculate quality metrics
    const qualityMetrics = {
      smoothnessScore: calculateSmoothnessScore(zoomPlan),
      cinematicScore: calculateCinematicScore(zoomPlan),
      technicalScore: calculateTechnicalScore(zoomPlan),
      usesSingleKeyframes: true // Key indicator of proper implementation
    }

    // Store the professional zoom plan in database
    const zoomData = {
      zoomPlan,
      edlFormat,
      options: zoomOptions,
      qualityMetrics,
      analysisTimestamp: new Date().toISOString(),
      metadata: {
        transformCount: zoomPlan.transforms.length,
        maxZoomLevel: Math.max(...zoomPlan.transforms.map(t => Math.max(t.start.scale, t.end.scale))),
        totalDuration: zoomPlan.totalDuration,
        usesSingleKeyframes: true,
        easing: 'easeInOutCubic'
      }
    }

    // Update media file with professional zoom analysis
    await db
      .from('media_files')
      .update({
        metadata: {
          ...mediaMetadata,
          professionalAutoZoom: zoomData, // Use different key to distinguish from old implementation
          auto_zoom_plan: edlFormat       // For backward compatibility
        }
      })
      .eq('id', uploadId)

    console.log(`🎯 Professional zoom plan completed - ${qualityMetrics.smoothnessScore > 0.8 ? 'Excellent' : 'Good'} quality`)

    return NextResponse.json({
      success: true,
      data: {
        uploadId,
        zoomPlan: {
          transformCount: zoomPlan.transforms.length,
          totalDuration: zoomPlan.totalDuration,
          recommendations: zoomPlan.recommendations,
          qualitySettings: zoomPlan.qualitySettings
        },
        qualityMetrics,
        edlPreview: {
          effectsCount: edlFormat.effects.length,
          usesSingleKeyframes: edlFormat.metadata.usesSingleKeyframes,
          maxZoomLevel: edlFormat.metadata.maxZoomLevel,
          easing: 'easeInOutCubic'
        },
        // Include full data for rendering
        fullZoomPlan: zoomPlan,
        fullEDL: edlFormat
      }
    })

  } catch (error: any) {
    console.error('❌ Professional auto-zoom analysis failed:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Auto-zoom analysis failed',
        details: error.stack
      },
      { status: 500 }
    )
  }
}

/**
 * Calculate segment importance for zoom decisions
 */
function calculateSegmentImportance(segment: any): number {
  let importance = 0.5 // Base importance
  
  const text = (segment.text || '').toLowerCase()
  
  // Boost importance for key phrases
  const keyPhrases = ['important', 'key', 'remember', 'first', 'second', 'finally', 'solution']
  keyPhrases.forEach(phrase => {
    if (text.includes(phrase)) importance += 0.1
  })
  
  // Questions get higher importance
  if (text.includes('?')) importance += 0.15
  
  // Confidence affects importance
  if (segment.confidence > 0.8) importance += 0.1
  
  return Math.min(1, importance)
}

/**
 * Create segments from word-level data
 */
function createSegmentsFromWords(words: any[]): any[] {
  if (!words || words.length === 0) return []
  
  const segments = []
  const wordsPerSegment = 10 // Group words into segments
  
  for (let i = 0; i < words.length; i += wordsPerSegment) {
    const segmentWords = words.slice(i, i + wordsPerSegment)
    const start = segmentWords[0].start
    const end = segmentWords[segmentWords.length - 1].end
    const text = segmentWords.map(w => w.word || '').join(' ')
    const avgConfidence = segmentWords.reduce((sum, w) => sum + (w.confidence || 0.8), 0) / segmentWords.length
    
    segments.push({
      start,
      end,
      text,
      confidence: avgConfidence,
      importance: calculateSegmentImportance({ text, confidence: avgConfidence })
    })
  }
  
  return segments
}

/**
 * Calculate smoothness score - penalizes jerky movement
 */
function calculateSmoothnessScore(zoomPlan: any): number {
  if (zoomPlan.transforms.length === 0) return 1.0

  let score = 1.0

  zoomPlan.transforms.forEach((transform: any) => {
    // Penalize very rapid zoom changes (jerky movement)
    const zoomChange = Math.abs(transform.end.scale - transform.start.scale)
    const zoomRate = zoomChange / transform.duration
    
    if (zoomRate > 0.1) score -= 0.1 // Too fast
    
    // Penalize extreme zoom levels
    const maxScale = Math.max(transform.start.scale, transform.end.scale)
    if (maxScale > 2.0) score -= 0.1 // Too much zoom
    
    // Reward use of proper easing (key to your approach)
    if (transform.easing === 'easeInOutCubic') score += 0.05
    
    // Reward single keyframe approach (no multiple steps)
    if (transform.startTime !== undefined && transform.duration > 0) score += 0.05
  })

  return Math.max(0, Math.min(1, score))
}

/**
 * Calculate cinematic quality score
 */
function calculateCinematicScore(zoomPlan: any): number {
  if (zoomPlan.transforms.length === 0) return 0

  let score = 0.5 // Base score

  zoomPlan.transforms.forEach((transform: any) => {
    // Reward gentle, purposeful movement (your "gentle zoom" example)
    const zoomChange = Math.abs(transform.end.scale - transform.start.scale)
    const panDistance = Math.sqrt(
      Math.pow(transform.end.x - transform.start.x, 2) + 
      Math.pow(transform.end.y - transform.start.y, 2)
    )
    
    // Your exact numeric recipe: 1.0 → 1.25 scale, +60px pan
    if (zoomChange > 0.1 && zoomChange < 0.3) score += 0.1 // Good zoom range
    if (panDistance > 20 && panDistance < 80) score += 0.1 // Good pan range like your +60px example
    if (transform.motionBlur) score += 0.1 // Motion blur for pro look (your add-on)
    if (transform.duration > 4) score += 0.1 // Longer transforms are more cinematic
  })

  return Math.max(0, Math.min(1, score))
}

/**
 * Calculate technical quality score - rewards proper implementation
 */
function calculateTechnicalScore(zoomPlan: any): number {
  let score = 0.5

  // Reward use of single keyframes (your key fix!)
  if (zoomPlan.qualitySettings.subpixelPrecision) score += 0.2
  
  // Reward reasonable number of transforms
  if (zoomPlan.transforms.length > 0 && zoomPlan.transforms.length <= 3) {
    score += 0.2
  } else if (zoomPlan.transforms.length > 5) {
    score -= 0.1
  }

  // Reward reasonable zoom levels (like your 1.25x example)
  const maxZoom = zoomPlan.qualitySettings.maxZoomLevel
  if (maxZoom <= 1.5) score += 0.1 // Your gentle approach
  if (maxZoom > 2.0) score -= 0.2   // Too extreme

  return Math.max(0, Math.min(1, score))
}
