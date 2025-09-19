import { NextRequest, NextResponse } from 'next/server'
import { decideFast } from '@/lib/decide'
import { convertLegacyToEDL, validateEDL } from '@/lib/edl-types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { transcript, scriptText, policy, returnFormat = 'legacy' } = body || {}

    if (!transcript || !Array.isArray(transcript.segments) || transcript.segments.length === 0) {
      return NextResponse.json({ success: false, error: 'Missing transcript.segments' }, { status: 400 })
    }

    const decision = await decideFast(transcript, scriptText, {
      removeFiller: true,
      removeHesitations: true,
      removeLongPauses: true,
      maxPauseDuration_ms: 250,
      targetReductionPercentage: 20,
      preserveTransitions: true,
      maintainNaturalFlow: true,
      ...(policy || {})
    })

    // Support both legacy and new EDL formats
    if (returnFormat === 'edl' && decision.keepSegments) {
      try {
        const sourceDuration = transcript.duration || 0
        const edl = convertLegacyToEDL(decision.keepSegments, 'clean-job', sourceDuration)
        
        const validation = validateEDL(edl)
        if (validation.success) {
          return NextResponse.json({ 
            success: true, 
            decision, // Legacy format
            edl: validation.data // New EDL format
          })
        }
      } catch (error) {
        console.warn('EDL conversion failed, returning legacy format:', error)
      }
    }

    return NextResponse.json({ success: true, decision })
  } catch (error: any) {
    console.error('Clean route failed:', error)
    return NextResponse.json({ success: false, error: error?.message || 'Server error' }, { status: 500 })
  }
}






















