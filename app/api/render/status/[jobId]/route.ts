import { NextRequest, NextResponse } from 'next/server'
import { ShotstackService } from '@/lib/shotstack-service'
import { getShotstackConfig } from '@/lib/shotstack-config'
import { supabase, supabaseAdmin } from '@/lib/supabase'

function getService() {
  const cfg = getShotstackConfig()
  return new ShotstackService({ ...cfg, debug: true })
}

// GET /api/render/status/:jobId
export async function GET(_request: NextRequest, context: { params: { jobId: string } }) {
  try {
    const jobId = context.params.jobId
    if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 })

    const service = getService()
    const resp = await service.getRenderStatus(jobId)
    const data = resp?.response

    if (data) {
      const update: any = { status: data.status, updated_at: new Date().toISOString() }
      if (data.url) update.video_url = data.url
      if ((data as any).error) update.error_message = (data as any).error
      const db = supabaseAdmin || supabase
      await db.from('shotstack_jobs').update(update).eq('shotstack_job_id', jobId)
    }

    return NextResponse.json({ success: true, status: data?.status, url: data?.url || null })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Status check failed' }, { status: 500 })
  }
}


