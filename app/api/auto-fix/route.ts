import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { validateEDL, type EditDecisionList } from '@/lib/edl-types'
import { applyAutoFixPasses, getAutoFixRecommendations, type AutoFixOptions } from '@/lib/auto-fix-service'

export const runtime = 'nodejs'

interface AutoFixRequest {
  uploadId: string
  edl?: EditDecisionList
  options?: Partial<AutoFixOptions>
  mode: 'analyze' | 'apply' | 'recommendations'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as AutoFixRequest
    const { uploadId, edl, options, mode } = body

    if (!uploadId) {
      return NextResponse.json(
        { success: false, error: 'uploadId is required' },
        { status: 400 }
      )
    }

    console.log('🔧 Auto-fix request:', { uploadId, mode })

    // Get EDL from request or database
    let targetEDL = edl
    if (!targetEDL) {
      const { data: media } = await supabase
        .from('media_files')
        .select('metadata')
        .eq('id', uploadId)
        .single()

      const metadata = (media as any)?.metadata
      targetEDL = metadata?.editDecisionList

      if (!targetEDL) {
        return NextResponse.json(
          { success: false, error: 'No EDL found. Generate cut suggestions first.' },
          { status: 400 }
        )
      }
    }

    // Validate EDL
    const validation = validateEDL(targetEDL)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: `Invalid EDL: ${validation.error}` },
        { status: 400 }
      )
    }

    const validatedEDL = validation.data

    switch (mode) {
      case 'analyze':
        return handleAnalyze(validatedEDL)
      
      case 'recommendations':
        return handleRecommendations(validatedEDL)
      
      case 'apply':
        return await handleApply(validatedEDL, uploadId, options)
      
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid mode. Use: analyze, recommendations, or apply' },
          { status: 400 }
        )
    }

  } catch (error: any) {
    console.error('❌ Auto-fix failed:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Auto-fix failed' },
      { status: 500 }
    )
  }
}

/**
 * Analyze EDL for auto-fix opportunities
 */
function handleAnalyze(edl: EditDecisionList) {
  const analysis = {
    totalClips: edl.clips.length,
    
    silenceAnalysis: {
      silenceClips: edl.clips.filter(clip => clip.silenceDetected).length,
      shortClips: edl.clips.filter(clip => clip.duration < 0.3).length,
      potentialTrimTime: edl.clips
        .filter(clip => clip.silenceDetected && clip.duration < 0.5)
        .reduce((sum, clip) => sum + clip.duration, 0)
    },
    
    confidenceAnalysis: {
      lowConfidenceClips: edl.clips.filter(clip => clip.asrConfidence && clip.asrConfidence < 0.6).length,
      veryLowConfidenceClips: edl.clips.filter(clip => clip.asrConfidence && clip.asrConfidence < 0.4).length,
      averageConfidence: edl.clips.reduce((sum, clip) => sum + (clip.asrConfidence || 0.8), 0) / edl.clips.length
    },
    
    fillerAnalysis: {
      potentialFillers: edl.clips.filter(clip => {
        const text = (clip.originalText || '').trim().toLowerCase()
        return /^(um|uh|like|you know|basically|literally)/.test(text)
      }).length,
      shortUtterances: edl.clips.filter(clip => 
        clip.duration < 0.8 && clip.originalText && clip.originalText.split(' ').length <= 2
      ).length
    },
    
    qualityScore: calculateQualityScore(edl),
    
    estimatedImprovements: {
      potentialTimeReduction: estimatePotentialTimeReduction(edl),
      confidenceImprovement: estimateConfidenceImprovement(edl),
      flowImprovement: estimateFlowImprovement(edl)
    }
  }

  return NextResponse.json({
    success: true,
    data: analysis
  })
}

/**
 * Get auto-fix recommendations
 */
function handleRecommendations(edl: EditDecisionList) {
  const recommendations = getAutoFixRecommendations(edl)
  
  return NextResponse.json({
    success: true,
    data: {
      recommendations,
      summary: {
        totalRecommendations: recommendations.length,
        highPriority: recommendations.filter(r => r.type === 'warning').length,
        mediumPriority: recommendations.filter(r => r.type === 'info').length,
        lowPriority: recommendations.filter(r => r.type === 'success').length
      }
    }
  })
}

/**
 * Apply auto-fix passes
 */
async function handleApply(
  edl: EditDecisionList, 
  uploadId: string, 
  options?: Partial<AutoFixOptions>
) {
  console.log('🔧 Applying auto-fix passes...')
  
  const { edl: fixedEDL, result } = await applyAutoFixPasses(edl, options)
  
  if (!result.success) {
    throw new Error(result.error || 'Auto-fix failed')
  }

  // Save updated EDL to database
  const { data: media } = await supabase
    .from('media_files')
    .select('metadata')
    .eq('id', uploadId)
    .single()

  const metadata = (media as any)?.metadata || {}
  const updatedMetadata = {
    ...metadata,
    editDecisionList: fixedEDL,
    lastAutoFixApplied: new Date().toISOString(),
    autoFixHistory: [
      ...(metadata.autoFixHistory || []),
      {
        appliedAt: new Date().toISOString(),
        passesApplied: result.passesApplied.length,
        statistics: result.statistics
      }
    ]
  }

  await supabase
    .from('media_files')
    .update({ metadata: updatedMetadata } as any)
    .eq('id', uploadId)

  console.log('✅ Auto-fix completed:', {
    originalClips: result.originalClipCount,
    finalClips: result.finalClipCount,
    passesApplied: result.passesApplied.length,
    timeReduced: result.statistics.timeReduced.toFixed(2) + 's'
  })

  return NextResponse.json({
    success: true,
    data: {
      edl: fixedEDL,
      result
    }
  })
}

/**
 * Calculate overall quality score for EDL
 */
function calculateQualityScore(edl: EditDecisionList): number {
  const avgConfidence = edl.clips.reduce((sum, clip) => sum + clip.confidence, 0) / edl.clips.length
  const avgASRConfidence = edl.clips.reduce((sum, clip) => sum + (clip.asrConfidence || 0.8), 0) / edl.clips.length
  const silenceRatio = edl.clips.filter(clip => clip.silenceDetected).length / edl.clips.length
  
  // Weighted quality score
  return Math.max(0, Math.min(1,
    (avgConfidence * 0.4) +
    (avgASRConfidence * 0.4) +
    ((1 - silenceRatio) * 0.2)
  ))
}

/**
 * Estimate potential time reduction from auto-fixes
 */
function estimatePotentialTimeReduction(edl: EditDecisionList): number {
  const silenceTime = edl.clips
    .filter(clip => clip.silenceDetected && clip.duration < 0.5)
    .reduce((sum, clip) => sum + clip.duration, 0)
  
  const fillerTime = edl.clips
    .filter(clip => {
      const text = (clip.originalText || '').trim().toLowerCase()
      return /^(um|uh|like)/.test(text) && clip.duration < 1.0
    })
    .reduce((sum, clip) => sum + clip.duration, 0)
  
  return silenceTime + fillerTime
}

/**
 * Estimate confidence improvement from auto-fixes
 */
function estimateConfidenceImprovement(edl: EditDecisionList): number {
  const lowConfidenceClips = edl.clips.filter(clip => clip.confidence < 0.6)
  const improvementPotential = lowConfidenceClips.length / edl.clips.length
  
  return Math.min(0.3, improvementPotential * 0.5) // Max 30% improvement
}

/**
 * Estimate flow improvement from auto-fixes
 */
function estimateFlowImprovement(edl: EditDecisionList): number {
  const shortClips = edl.clips.filter(clip => clip.duration < 0.5).length
  const silenceClips = edl.clips.filter(clip => clip.silenceDetected).length
  const totalIssues = shortClips + silenceClips
  
  return Math.min(0.4, (totalIssues / edl.clips.length) * 0.6) // Max 40% improvement
}



















