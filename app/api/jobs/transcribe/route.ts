import { NextRequest, NextResponse } from 'next/server'
import { transcribeFromUrl } from '@/lib/transcribe'
import { transcribeLargeFile } from '@/lib/transcribe-large'
import { supabase, supabaseAdmin } from '@/lib/supabase'

// Ensure this route runs on the Node.js runtime (needed for FFmpeg binaries)
export const runtime = 'nodejs'
export const preferredRegion = 'auto'

// HEAD /api/jobs/transcribe - Health check
export async function HEAD() {
  try {
    // Basic health check - verify OpenAI key exists
    const hasOpenAI = !!process.env.OPENAI_API_KEY
    
    if (!hasOpenAI) {
      return new NextResponse(null, { 
        status: 503, 
        statusText: 'OpenAI API key not configured' 
      })
    }
    
    return new NextResponse(null, { 
      status: 200,
      statusText: 'Service available'
    })
  } catch (error) {
    return new NextResponse(null, { 
      status: 503, 
      statusText: 'Service unavailable' 
    })
  }
}

// POST /api/jobs/transcribe
// Body: { uploadId: string, fileUrl: string }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { uploadId, fileUrl } = body || {}

    if (!uploadId || !fileUrl) {
      return NextResponse.json(
        { success: false, error: 'uploadId and fileUrl are required' },
        { status: 400 }
      )
    }

    // Basic preflight checks for file type
    try {
      const head = await fetch(fileUrl, { method: 'HEAD' })
      const sizeStr = head.headers.get('content-length')
      const type = head.headers.get('content-type') || ''
      const size = sizeStr ? parseInt(sizeStr, 10) : undefined
      
      // Check file type
      const allowed = ['audio/', 'video/mp4', 'video/webm']
      if (type && !allowed.some((p) => type.startsWith(p))) {
        return NextResponse.json(
          { success: false, error: `Unsupported content-type: ${type}. Use mp4, webm, or common audio.` },
          { status: 415 }
        )
      }
      
      // Log file size for debugging
      if (size) {
        console.log(`📊 File size: ${Math.round(size/1024/1024)}MB`)
      }
    } catch {}

    console.log('🎤 Starting transcription for uploadId:', uploadId)
    
    // For now, use the original transcription with a reasonable size limit
    // TODO: Implement proper video splitting with FFmpeg for very large files
    const result = await transcribeFromUrl({ uploadId, fileUrl })
    
    console.log('✅ Transcription completed:', {
      uploadId,
      segmentCount: result.segments.length,
      textLength: result.text.length
    })

    // Auto-trigger AI caption segmentation if word-level timing is available
    console.log('🔍 Checking for AI caption segmentation trigger...')
    let enhancedSegments = result.segments
    try {
      // Extract all words with timing
      const allWords = result.segments.flatMap(seg => 
        Array.isArray(seg.words) ? seg.words : []
      ).filter(w => w && typeof w.word === 'string')
      
      console.log('📊 Found', allWords.length, 'words for AI processing')
      
      if (allWords.length > 0) {
        console.log('🤖 Auto-running AI Caption Segmentation for', allWords.length, 'words...')
        
        // Prefer in-process call to avoid headers timeout in dev
        const { runAICaptionSegmentation } = await import('@/lib/ai-caption-segmentation')
        const aiResult = await runAICaptionSegmentation({
          words: allWords,
          audioUrl: fileUrl,
          settings: {
            minWordsPerCard: 1,
            maxWordsPerCard: 6,
            targetCpsRange: [12, 17],
            globalMinPause: 0.24,
            lingerSec: 0.6
          }
        })
        
        if (aiResult && Array.isArray(aiResult.cards)) {
          
          // Handle both possible response formats
          let cards = null
          if (aiResult.success && Array.isArray(aiResult.cards)) {
            cards = aiResult.cards
          } else if (aiResult.success && aiResult.data && Array.isArray(aiResult.data.cards)) {
            cards = aiResult.data.cards
          }
          
          if (cards && cards.length > 0) {
            console.log('✅ AI generated', cards.length, 'perfect subtitle cards')
            
            // Convert AI cards to segment format
            enhancedSegments = cards.map((card: any) => ({
              start: card.start || card.renderStart || 0,
              end: card.end || card.renderEnd || 0,
              text: card.text || '',
              words: card.words || [],
              confidence: card.confidence || 0.95,
              speaker: 'SPEAKER_00'
            }))
            
            console.log('🎯 AI-enhanced segments ready for frontend!')

            // Persist AI-enhanced cards/segments to media_files metadata for reliable hydration
            try {
              const db = supabaseAdmin || supabase
              const { data: current } = await db
                .from('media_files')
                .select('metadata')
                .eq('id', uploadId)
                .single()

              const existing = (current as any)?.metadata || {}
              await db
                .from('media_files')
                .update({
                  metadata: {
                    ...existing,
                    ai_subtitles: {
                      cards,
                      updated_at: new Date().toISOString(),
                    },
                    // Also reflect enhanced segments for simple consumers
                    asr: {
                      ...(existing.asr || {}),
                      enhanced_segments: enhancedSegments,
                      ai_captioned: true,
                    }
                  } as any
                })
                .eq('id', uploadId)
              console.log('💾 Persisted AI subtitle cards to metadata.ai_subtitles')
            } catch (persistErr) {
              console.warn('⚠️ Failed to persist AI subtitles to DB (non-fatal):', persistErr)
            }
          } else {
            console.warn('⚠️ AI segmentation returned invalid format:', JSON.stringify(aiResult).substring(0, 200))
          }
        } else {
          console.warn('⚠️ AI segmentation failed, using original segments')
        }
      } else {
        console.warn('⚠️ No word-level timing found, skipping AI segmentation')
      }
    } catch (aiError) {
      console.error('❌ AI Caption Segmentation failed:', aiError)
      console.log('🔄 Using original segments as fallback')
    }

    console.log('📤 Returning', enhancedSegments.length, 'segments to frontend')
    return NextResponse.json({ success: true, segments: enhancedSegments })
  } catch (error: any) {
    // Persist error for diagnostics
    try {
      const body = await request.json().catch(() => ({}))
      if (body?.uploadId) {
        const db2 = supabaseAdmin || supabase
        
        // Get existing metadata before updating
        const { data: currentMedia } = await db2
          .from('media_files')
          .select('metadata')
          .eq('id', body.uploadId)
          .single()
        
        const existingMetadata = (currentMedia as any)?.metadata || {}
        
        await db2
          .from('media_files')
          .update({ 
            metadata: { 
              ...existingMetadata,
              processing_status: 'failed', 
              processing_errors: [String(error?.message || error)] 
            } 
          } as any)
          .eq('id', body.uploadId)
      }
    } catch {}

    return NextResponse.json(
      { success: false, error: error?.message || 'Transcription failed' },
      { status: 500 }
    )
  }
}


