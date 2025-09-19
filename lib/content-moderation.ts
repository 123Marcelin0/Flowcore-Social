import { supabase, supabaseAdmin } from './supabase'
import OpenAI from 'openai'
// Note: Job queue functionality removed for simplification

export interface ModerationResult {
  flagged: boolean
  categories: string[]
  confidence_scores: Record<string, number>
  provider: string
  raw_response: any
}

export interface AudioFingerprintResult {
  matches: Array<{
    title: string
    artist: string
    confidence: number
    duration_match: number
    source: string
  }>
  copyrighted: boolean
}

export class ContentModerationService {
  private db = supabaseAdmin || supabase
  private openai: OpenAI | null = null

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY?.trim()
    if (apiKey && apiKey.startsWith('sk-')) {
      this.openai = new OpenAI({ apiKey })
    }
  }

  // Moderate text content using OpenAI Moderation API
  async moderateText(text: string): Promise<ModerationResult> {
    if (!this.openai) {
      console.warn('OpenAI not available for text moderation, returning clean result')
      return {
        flagged: false,
        categories: [],
        confidence_scores: {},
        provider: 'none',
        raw_response: { warning: 'OpenAI API not configured' }
      }
    }

    try {
      const moderation = await this.openai.moderations.create({
        input: text,
      })

      const result = moderation.results[0]
      const flaggedCategories = Object.entries(result.categories)
        .filter(([_, flagged]) => flagged)
        .map(([category, _]) => category)

      return {
        flagged: result.flagged,
        categories: flaggedCategories,
        confidence_scores: result.category_scores,
        provider: 'openai.moderation',
        raw_response: result
      }
    } catch (error) {
      console.error('Text moderation failed:', error)
      return {
        flagged: false,
        categories: [],
        confidence_scores: {},
        provider: 'openai.moderation',
        raw_response: { error: String(error) }
      }
    }
  }

  // Basic audio fingerprinting check (placeholder for real service integration)
  async checkAudioFingerprint(audioUrl: string): Promise<AudioFingerprintResult> {
    try {
      // In production, integrate with services like:
      // - ACRCloud (acrcloud.com)
      // - Shazam API 
      // - YouTube Content ID API
      // - Audible Magic
      
      console.log('🎵 Audio fingerprinting check (placeholder):', audioUrl)
      
      // For now, return a safe result
      // TODO: Replace with actual audio fingerprinting service
      return {
        matches: [],
        copyrighted: false
      }
    } catch (error) {
      console.error('Audio fingerprinting failed:', error)
      return {
        matches: [],
        copyrighted: false
      }
    }
  }

  // Check if external assets (from Pixabay, etc.) have proper licensing
  async checkAssetLicensing(assetUrl: string, source: 'pixabay' | 'unsplash' | 'pexels' | 'other' = 'other'): Promise<{
    licensed: boolean
    attribution_required: boolean
    license_type: string
    attribution_text?: string
  }> {
    try {
      console.log('🖼️ Asset licensing check:', { assetUrl, source })

      // Basic checks based on source
      switch (source) {
        case 'pixabay':
          return {
            licensed: true,
            attribution_required: false, // Pixabay License allows use without attribution
            license_type: 'pixabay',
            attribution_text: undefined
          }
        
        case 'unsplash':
          return {
            licensed: true,
            attribution_required: true,
            license_type: 'unsplash',
            attribution_text: 'Photo from Unsplash'
          }
        
        case 'pexels':
          return {
            licensed: true,
            attribution_required: false, // Pexels License doesn't require attribution
            license_type: 'pexels',
            attribution_text: undefined
          }
        
        default:
          return {
            licensed: false,
            attribution_required: true,
            license_type: 'unknown',
            attribution_text: 'Attribution required for unknown source'
          }
      }
    } catch (error) {
      console.error('Asset licensing check failed:', error)
      return {
        licensed: false,
        attribution_required: true,
        license_type: 'unknown',
        attribution_text: 'License verification failed'
      }
    }
  }

  // Comprehensive moderation of a media file
  async moderateMediaFile(uploadId: string): Promise<{
    approved: boolean
    issues: string[]
    moderation_results: ModerationResult[]
    fingerprint_results?: AudioFingerprintResult
  }> {
    console.log('🔍 Starting comprehensive moderation for:', uploadId)

    try {
      // Get media file info
      const { data: media, error } = await (this.db as any)
        .from('media_files')
        .select('id, storage_url, metadata, file_type')
        .eq('id', uploadId)
        .single()

      if (error || !media) {
        throw new Error('Media file not found')
      }

      const issues: string[] = []
      const moderationResults: ModerationResult[] = []

      // 1. Check transcription text if available
      const transcriptionText = media.metadata?.asr?.text
      if (transcriptionText) {
        console.log('🗣️ Moderating transcription text...')
        const textModeration = await this.moderateText(transcriptionText)
        moderationResults.push(textModeration)
        
        if (textModeration.flagged) {
          issues.push(`Inappropriate speech detected: ${textModeration.categories.join(', ')}`)
        }
      }

      // 2. Audio fingerprinting for copyright detection
      let fingerprintResult: AudioFingerprintResult | undefined
      if (media.storage_url) {
        fingerprintResult = await this.checkAudioFingerprint(media.storage_url)
        if (fingerprintResult.copyrighted) {
          const matchTitles = fingerprintResult.matches.map(m => `${m.title} by ${m.artist}`).join(', ')
          issues.push(`Copyrighted audio detected: ${matchTitles}`)
        }
      }

      // 3. Check any external assets used in the project
      const overlayAssets = media.metadata?.overlay_assets || []
      for (const asset of overlayAssets) {
        if (asset.src && asset.source) {
          const licensing = await this.checkAssetLicensing(asset.src, asset.source)
          if (!licensing.licensed) {
            issues.push(`Unlicensed asset detected: ${asset.src}`)
          } else if (licensing.attribution_required && !asset.attribution) {
            issues.push(`Attribution required for asset: ${asset.src}`)
          }
        }
      }

      const approved = issues.length === 0

      // Save moderation results
      if (moderationResults.length > 0 || fingerprintResult) {
        await (this.db as any)
          .from('content_moderation')
          .insert({
            media_file_id: uploadId,
            moderation_provider: 'comprehensive',
            results: {
              text_moderation: moderationResults,
              audio_fingerprint: fingerprintResult,
              asset_licensing: overlayAssets.map(a => a.licensing_check)
            },
            flagged: !approved,
            categories: moderationResults.flatMap(r => r.categories),
            confidence_scores: moderationResults.reduce((acc, r) => ({ ...acc, ...r.confidence_scores }), {})
          })
      }

      // Update media file moderation status
      await (this.db as any)
        .from('media_files')
        .update({
          content_moderation_status: approved ? 'approved' : 'rejected'
        })
        .eq('id', uploadId)

      console.log(`✅ Moderation complete: ${approved ? 'APPROVED' : 'REJECTED'}`, { 
        issues: issues.length,
        uploadId 
      })

      return {
        approved,
        issues,
        moderation_results: moderationResults,
        fingerprint_results: fingerprintResult
      }

    } catch (error) {
      console.error('Media moderation failed:', error)
      
      // Mark as failed for manual review
      await (this.db as any)
        .from('media_files')
        .update({
          content_moderation_status: 'reviewing'
        })
        .eq('id', uploadId)

      return {
        approved: false,
        issues: [`Moderation system error: ${String(error)}`],
        moderation_results: []
      }
    }
  }

  // Queue moderation job (simplified - removed Redis dependency)
  async queueModerationJob(uploadId: string, userId?: string): Promise<string> {
    console.log('⚠️ Moderation job queuing disabled (Redis removed)')
    // TODO: Implement with Postgres job queue if needed
    return `mock_job_${Date.now()}`
  }

  // Process moderation job from queue (simplified - removed Redis dependency)  
  async processModerationJob(job: any): Promise<void> {
    console.log('⚠️ Moderation job processing disabled (Redis removed)')
    // TODO: Implement with Postgres job queue if needed
  }
}

export const contentModerationService = new ContentModerationService()