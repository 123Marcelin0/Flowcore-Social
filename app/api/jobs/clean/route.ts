import { NextRequest, NextResponse } from 'next/server'
import { decideFast } from '@/lib/decide'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { transcript, scriptText, policy } = body || {}

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

    return NextResponse.json({ success: true, decision })
  } catch (error: any) {
    console.error('Clean route failed:', error)
    return NextResponse.json({ success: false, error: error?.message || 'Server error' }, { status: 500 })
  }
}












