import { NextRequest, NextResponse } from 'next/server'
import { getJob, updateJobStatus, JobStatus } from '@/lib/supabase-job-queue-postgres'

// GET /api/jobs/[id] - Get job status by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobId = params.id
    
    if (!jobId) {
      return NextResponse.json(
        { success: false, error: 'Job ID is required' },
        { status: 400 }
      )
    }
    
    const job = await getJob(jobId)
    
    if (!job) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      )
    }
    
    // Return job status with progress information
    return NextResponse.json({
      success: true,
      data: {
        id: job.id,
        type: job.type,
        status: job.status,
        progress: job.status === JobStatus.DONE ? 100 : 
                 job.status === JobStatus.IN_PROGRESS ? 50 : 0,
        attempts: job.attempts,
        maxAttempts: job.max_attempts,
        priority: job.priority,
        error: job.error_message,
        result: job.result,
        createdAt: job.created_at,
        updatedAt: job.updated_at,
        startedAt: job.started_at,
        completedAt: job.completed_at,
        runAt: job.run_at,
        payload: job.payload
      }
    })
    
  } catch (error: any) {
    console.error('❌ Failed to get job status:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to get job status' 
      },
      { status: 500 }
    )
  }
}
