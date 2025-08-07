import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface ShotstackWebhookPayload {
  id: string
  owner: string
  status: 'queued' | 'fetching' | 'rendering' | 'done' | 'failed'
  url?: string
  error?: string
  duration?: number
  renderTime?: number
  created: string
  updated: string
  data: any
}

/**
 * Shotstack Webhook Handler
 * Handles status updates from Shotstack API
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook authenticity (optional but recommended)
    const signature = request.headers.get('x-shotstack-signature')
    
    if (process.env.SHOTSTACK_WEBHOOK_SECRET && signature) {
      // Implement signature verification here if you have a webhook secret
      // This is important for production security
    }

    const payload: ShotstackWebhookPayload = await request.json()
    
    console.log(`[Shotstack Webhook] Received status update for job ${payload.id}: ${payload.status}`)

    // Update the job status in our database
    const updateData: any = {
      status: payload.status,
      updated_at: new Date().toISOString()
    }

    if (payload.url) {
      updateData.video_url = payload.url
    }

    if (payload.error) {
      updateData.error_message = payload.error
    }

    if (payload.duration || payload.renderTime) {
      // Get existing metadata and merge with new data
      const { data: existingJob } = await supabase
        .from('shotstack_jobs')
        .select('metadata')
        .eq('shotstack_job_id', payload.id)
        .single()

      updateData.metadata = {
        ...(existingJob?.metadata || {}),
        duration: payload.duration,
        renderTime: payload.renderTime,
        webhookReceived: new Date().toISOString()
      }
    }

    const { error: dbError } = await supabase
      .from('shotstack_jobs')
      .update(updateData)
      .eq('shotstack_job_id', payload.id)

    if (dbError) {
      console.error('Database update error:', dbError)
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
    }

    console.log(`[Shotstack Webhook] Successfully updated job ${payload.id}`)

    // Send notifications or trigger other workflows here
    if (payload.status === 'done') {
      await handleRenderComplete(payload)
    } else if (payload.status === 'failed') {
      await handleRenderFailed(payload)
    }

    return NextResponse.json({ success: true, message: 'Webhook processed successfully' })

  } catch (error) {
    console.error('Error processing Shotstack webhook:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' }, 
      { status: 500 }
    )
  }
}

/**
 * Handle successful render completion
 */
async function handleRenderComplete(payload: ShotstackWebhookPayload) {
  try {
    // Get the job details to find the user
    const { data: job } = await supabase
      .from('shotstack_jobs')
      .select('user_id, metadata')
      .eq('shotstack_job_id', payload.id)
      .single()

    if (job) {
      console.log(`[Shotstack Webhook] Render completed for user ${job.user_id}`)
      
      // Here you could:
      // - Send email notifications
      // - Update user credits/usage
      // - Trigger post-processing workflows
      // - Generate thumbnails or previews
      // - Update analytics
    }
  } catch (error) {
    console.error('Error handling render completion:', error)
  }
}

/**
 * Handle failed renders
 */
async function handleRenderFailed(payload: ShotstackWebhookPayload) {
  try {
    // Get the job details to find the user
    const { data: job } = await supabase
      .from('shotstack_jobs')
      .select('user_id, metadata')
      .eq('shotstack_job_id', payload.id)
      .single()

    if (job) {
      console.log(`[Shotstack Webhook] Render failed for user ${job.user_id}: ${payload.error}`)
      
      // Here you could:
      // - Send error notifications
      // - Log errors for analysis
      // - Attempt automatic retries
      // - Refund credits if applicable
      // - Update error analytics
    }
  } catch (error) {
    console.error('Error handling render failure:', error)
  }
}

/**
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({ 
    status: 'healthy', 
    service: 'shotstack-webhook',
    timestamp: new Date().toISOString()
  })
}