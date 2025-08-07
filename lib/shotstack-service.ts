/**
 * Comprehensive Shotstack.io API Service
 * Implements all major Shotstack features for video editing and generation
 * Optimized for production use with proper error handling and retry mechanisms
 */

export interface ShotstackConfig {
  apiKey: string
  environment: 'sandbox' | 'production'
  webhookUrl?: string
  ownerId?: string
  maxRetries?: number
  retryDelay?: number
  enableCache?: boolean
  debug?: boolean
}

export interface VideoAssetConfig {
  type: 'video'
  src: string
  trim?: number
  volume?: number
  speed?: number
  crop?: {
    top?: number
    bottom?: number
    left?: number
    right?: number
  }
}

export interface ImageAssetConfig {
  type: 'image'
  src: string
  crop?: {
    top?: number
    bottom?: number
    left?: number
    right?: number
  }
}

export interface TitleAssetConfig {
  type: 'title'
  text: string
  style?: 'minimal' | 'blockbuster' | 'vogue' | 'sketchy' | 'skinny' | 'chunk' | 'chunkLight' | 'marker' | 'future' | 'subtitle'
  color?: string
  size?: 'x-small' | 'small' | 'medium' | 'large' | 'x-large'
  background?: string
  position?: 'center' | 'centerLeft' | 'centerRight' | 'topCenter' | 'topLeft' | 'topRight' | 'bottomCenter' | 'bottomLeft' | 'bottomRight'
}

export interface HtmlAssetConfig {
  type: 'html'
  html: string
  css?: string
  width?: number
  height?: number
  background?: string
  position?: 'center' | 'top' | 'topRight' | 'right' | 'bottomRight' | 'bottom' | 'bottomLeft' | 'left' | 'topLeft'
}

export interface AudioAssetConfig {
  type: 'audio'
  src: string
  trim?: number
  volume?: number
  effect?: 'fadeIn' | 'fadeOut' | 'fadeInFadeOut'
}

export interface LumaAssetConfig {
  type: 'luma'
  src: string
}

export interface TransitionConfig {
  in?: 'fade' | 'reveal' | 'wipeLeft' | 'wipeRight' | 'slideLeft' | 'slideRight' | 'slideUp' | 'slideDown' | 'carouselLeft' | 'carouselRight' | 'carouselUp' | 'carouselDown' | 'shuffleTopRight' | 'shuffleRightTop' | 'shuffleRightBottom' | 'shuffleBottomRight' | 'shuffleBottomLeft' | 'shuffleLeftBottom' | 'shuffleLeftTop' | 'shuffleTopLeft' | 'zoom'
  out?: 'fade' | 'reveal' | 'wipeLeft' | 'wipeRight' | 'slideLeft' | 'slideRight' | 'slideUp' | 'slideDown' | 'carouselLeft' | 'carouselRight' | 'carouselUp' | 'carouselDown' | 'shuffleTopRight' | 'shuffleRightTop' | 'shuffleRightBottom' | 'shuffleBottomRight' | 'shuffleBottomLeft' | 'shuffleLeftBottom' | 'shuffleLeftTop' | 'shuffleTopLeft' | 'zoom'
}

export interface FilterConfig {
  filter?: 'boost' | 'contrast' | 'darken' | 'greyscale' | 'lighten' | 'muted' | 'negative'
}

export interface TransformConfig {
  rotate?: number
  skew?: {
    x?: number
    y?: number
  }
  flip?: {
    horizontal?: boolean
    vertical?: boolean
  }
}

export interface ClipConfig {
  asset: VideoAssetConfig | ImageAssetConfig | TitleAssetConfig | HtmlAssetConfig | AudioAssetConfig | LumaAssetConfig
  start: number
  length: number
  fit?: 'cover' | 'contain' | 'fill' | 'none'
  scale?: number
  position?: 'center' | 'top' | 'topRight' | 'right' | 'bottomRight' | 'bottom' | 'bottomLeft' | 'left' | 'topLeft'
  offset?: {
    x?: number
    y?: number
  }
  transition?: TransitionConfig
  filter?: FilterConfig
  transform?: TransformConfig
  opacity?: number
}

export interface TrackConfig {
  clips: ClipConfig[]
}

export interface SoundtrackConfig {
  src: string
  effect?: 'fadeIn' | 'fadeOut' | 'fadeInFadeOut'
  volume?: number
}

export interface TimelineConfig {
  tracks: TrackConfig[]
  soundtrack?: SoundtrackConfig
  background?: string
  fonts?: Array<{ src: string }>
  cache?: boolean
}

export interface OutputConfig {
  format: 'mp4' | 'gif' | 'jpg' | 'png' | 'bmp' | 'mp3'
  resolution?: 'preview' | 'mobile' | 'sd' | 'hd' | 'full-hd'
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:5' | '4:3'
  size?: {
    width?: number
    height?: number
  }
  fps?: number
  scaleTo?: 'preview' | 'mobile' | 'sd' | 'hd' | 'full-hd'
  quality?: 'low' | 'medium' | 'high'
  repeat?: boolean
  range?: {
    start?: number
    length?: number
  }
  poster?: {
    capture?: number
  }
  thumbnail?: {
    capture?: number
    scale?: number
  }
  destinations?: Array<{
    provider: 's3' | 'shotstack'
    options?: {
      region?: string
      bucket?: string
      prefix?: string
      filename?: string
      acl?: string
    }
  }>
}

export interface EditConfig {
  timeline: TimelineConfig
  output: OutputConfig
  merge?: Array<{
    find: string
    replace: string | number | boolean
  }>
  callback?: string
  disk?: 'local' | 'mount'
}

export interface RenderResponse {
  success: boolean
  message: string
  response: {
    id: string
    message: string
  }
}

export interface RenderStatus {
  success: boolean
  message: string
  response: {
    id: string
    owner: string
    plan: string
    status: 'submitted' | 'queued' | 'fetching' | 'rendering' | 'done' | 'failed'
    error?: string
    url?: string
    poster?: string
    thumbnail?: string
    data: EditConfig
    created: string
    updated: string
  }
}

export interface TemplateRenderRequest {
  template: string
  merge?: Array<{
    find: string
    replace: string | number | boolean
  }>
}

export interface IngestResponse {
  success: boolean
  message: string
  response: {
    id: string
    message: string
  }
}

export interface AssetResponse {
  success: boolean
  message: string
  response: {
    type: string
    attributes: {
      id: string
      owner: string
      region: string
      bucket: string
      key: string
      filename: string
      url: string
      status: 'importing' | 'ready' | 'failed'
      bytes: number
      duration?: number
      width?: number
      height?: number
      created: string
      updated: string
    }
  }
}

/**
 * Pre-built Shotstack templates for common video types
 */
export const SHOTSTACK_TEMPLATES = {
  // Social Media Templates
  INSTAGRAM_STORY: 'instagram-story-template',
  INSTAGRAM_POST: 'instagram-post-template',
  TIKTOK_VIDEO: 'tiktok-video-template',
  YOUTUBE_SHORT: 'youtube-shorts-template',
  FACEBOOK_POST: 'facebook-post-template',
  TWITTER_VIDEO: 'twitter-video-template',
  LINKEDIN_POST: 'linkedin-post-template',

  // Business Templates
  REAL_ESTATE_LISTING: 'real-estate-listing-template',
  PRODUCT_SHOWCASE: 'product-showcase-template',
  TESTIMONIAL_VIDEO: 'testimonial-video-template',
  BRAND_INTRO: 'brand-intro-template',
  EVENT_PROMOTION: 'event-promotion-template',

  // Creative Templates
  SLIDESHOW: 'slideshow-template',
  KINETIC_TEXT: 'kinetic-text-template',
  LOWER_THIRDS: 'lower-thirds-template',
  PICTURE_IN_PICTURE: 'picture-in-picture-template',
  SPLIT_SCREEN: 'split-screen-template',

  // News & Media
  NEWS_SUMMARY: 'news-summary-template',
  PODCAST_PREVIEW: 'podcast-preview-template',
  SPORTS_HIGHLIGHT: 'sports-highlight-template',

  // Seasonal & Special
  CHRISTMAS_MESSAGE: 'christmas-message-template',
  BIRTHDAY_VIDEO: 'birthday-video-template',
  HOLIDAY_GREETINGS: 'holiday-greetings-template'
}

/**
 * Shotstack API Service Class
 * Optimized for production use with robust error handling and monitoring
 */
export class ShotstackService {
  private config: ShotstackConfig
  private baseUrl: string
  private retryCount: number = 0

  constructor(config: ShotstackConfig) {
    this.config = {
      maxRetries: 3,
      retryDelay: 2000,
      enableCache: true,
      debug: false,
      ...config
    }
    
    this.baseUrl = config.environment === 'sandbox' 
      ? 'https://api.shotstack.io/stage' 
      : 'https://api.shotstack.io/v1'
    
    if (this.config.debug) {
      console.log(`[Shotstack] Initialized with ${config.environment} environment`)
      console.log(`[Shotstack] Base URL: ${this.baseUrl}`)
    }
  }

  /**
   * Create headers for API requests
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'x-api-key': this.config.apiKey,
      'Content-Type': 'application/json',
      'User-Agent': 'ShotstackService/2.0.0'
    }

    // Add cache control if disabled
    if (!this.config.enableCache) {
      headers['Cache-Control'] = 'no-cache'
    }

    return headers
  }

  /**
   * Enhanced fetch with retry logic and error handling
   */
  private async fetchWithRetry(url: string, options: RequestInit, attempt: number = 1): Promise<Response> {
    try {
      if (this.config.debug) {
        console.log(`[Shotstack] API Request (attempt ${attempt}): ${options.method} ${url}`)
      }

      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `Shotstack API error: ${response.status} ${response.statusText}`
        
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.message) {
            errorMessage += ` - ${errorJson.message}`
          }
        } catch {
          errorMessage += ` - ${errorText}`
        }

        // Retry on 5xx errors or rate limiting
        if ((response.status >= 500 || response.status === 429) && attempt < (this.config.maxRetries || 3)) {
          const delay = (this.config.retryDelay || 2000) * Math.pow(2, attempt - 1) // Exponential backoff
          
          if (this.config.debug) {
            console.log(`[Shotstack] Retrying after ${delay}ms due to ${response.status} error`)
          }
          
          await new Promise(resolve => setTimeout(resolve, delay))
          return this.fetchWithRetry(url, options, attempt + 1)
        }

        throw new Error(errorMessage)
      }

      if (this.config.debug) {
        console.log(`[Shotstack] API Response: ${response.status} ${response.statusText}`)
      }

      return response
    } catch (error) {
      if (attempt < (this.config.maxRetries || 3) && (error instanceof TypeError || error.message.includes('network'))) {
        const delay = (this.config.retryDelay || 2000) * Math.pow(2, attempt - 1)
        
        if (this.config.debug) {
          console.log(`[Shotstack] Retrying after ${delay}ms due to network error:`, error.message)
        }
        
        await new Promise(resolve => setTimeout(resolve, delay))
        return this.fetchWithRetry(url, options, attempt + 1)
      }
      
      throw error
    }
  }

  /**
   * Render a video using the Edit API
   */
  async render(edit: EditConfig): Promise<RenderResponse> {
    try {
      // Validate edit config
      this.validateEditConfig(edit)
      
      // Log the exact request being sent
      const requestBody = JSON.stringify(edit, null, 2)
      if (this.config.debug) {
        console.log(`[Shotstack] Sending request body:`, requestBody)
      }
      
      const response = await this.fetchWithRetry(`${this.baseUrl}/render`, {
        method: 'POST',
        body: requestBody
      })

      const result = await response.json()
      
      if (this.config.debug) {
        console.log(`[Shotstack] Render submitted: ${result.response?.id}`)
      }
      
      return result
    } catch (error) {
      if (this.config.debug) {
        console.error(`[Shotstack] Render failed:`, error)
      }
      throw error
    }
  }

  /**
   * Helper function to safely create a track with clips filtering
   * This ensures no empty tracks are accidentally created
   */
  static createSafeTrack(clips: any[]): any {
    // Filter out invalid clips
    const validClips = clips.filter(clip => 
      clip && 
      clip.asset && 
      clip.asset.type && 
      typeof clip.start === 'number' && 
      typeof clip.length === 'number' && 
      clip.length > 0
    );
    
    if (validClips.length === 0) {
      throw new Error('Cannot create track: no valid clips provided')
    }
    
    return {
      clips: validClips
    }
  }

  /**
   * Helper function to safely create an edit configuration
   * Automatically filters empty tracks and validates the structure
   */
  static createSafeEdit(tracks: any[], output: any, timeline?: any): any {
    // Filter out empty or invalid tracks
    const validTracks = tracks.filter(track => 
      track && track.clips && Array.isArray(track.clips) && track.clips.length > 0
    );
    
    if (validTracks.length === 0) {
      throw new Error('Cannot create edit: no valid tracks with clips provided')
    }
    
    return {
      timeline: {
        tracks: validTracks,
        ...timeline
      },
      output
    }
  }

  /**
   * Validate and sanitize edit configuration before sending to API
   */
  private validateEditConfig(edit: EditConfig): void {
    if (!edit.timeline) {
      throw new Error('Edit must have a timeline')
    }

    if (!edit.output || !edit.output.format) {
      throw new Error('Edit must specify output format')
    }
    
    // Filter out empty tracks BEFORE validation
    if (edit.timeline.tracks) {
      const originalTrackCount = edit.timeline.tracks.length;
      edit.timeline.tracks = edit.timeline.tracks.filter(track => 
        track && track.clips && Array.isArray(track.clips) && track.clips.length > 0
      );
      
      if (this.config.debug && originalTrackCount !== edit.timeline.tracks.length) {
        console.log(`[Shotstack] Filtered out ${originalTrackCount - edit.timeline.tracks.length} empty tracks`);
      }
    }
    
    // Check if we have any tracks left after filtering
    if (!edit.timeline.tracks || edit.timeline.tracks.length === 0) {
      throw new Error('Edit must have at least one track with clips in the timeline. All tracks were empty or invalid.')
    }
    
    // Validate each remaining track has valid clips
    for (let i = 0; i < edit.timeline.tracks.length; i++) {
      const track = edit.timeline.tracks[i];
      
      if (!track.clips || track.clips.length === 0) {
        throw new Error(`Track ${i + 1} must have at least one clip`)
      }
      
      // Validate each clip has required properties
      for (let j = 0; j < track.clips.length; j++) {
        const clip = track.clips[j];
        if (!clip.asset || !clip.asset.type) {
          throw new Error(`Track ${i + 1}, Clip ${j + 1} must have a valid asset with type`)
        }
        if (typeof clip.start !== 'number' || clip.start < 0) {
          throw new Error(`Track ${i + 1}, Clip ${j + 1} must have a valid start time (number >= 0)`)
        }
        if (typeof clip.length !== 'number' || clip.length <= 0) {
          throw new Error(`Track ${i + 1}, Clip ${j + 1} must have a valid length (number > 0)`)
        }
      }
    }
    
    if (this.config.debug) {
      console.log(`[Shotstack] Validation passed: ${edit.timeline.tracks.length} tracks with total ${edit.timeline.tracks.reduce((sum, track) => sum + track.clips.length, 0)} clips`);
    }
  }

  /**
   * Get render status with enhanced error handling
   */
  async getRenderStatus(renderId: string): Promise<RenderStatus> {
    try {
      if (!renderId || typeof renderId !== 'string') {
        throw new Error('Valid render ID is required')
      }

      const response = await this.fetchWithRetry(`${this.baseUrl}/render/${renderId}`, {
        method: 'GET'
      })

      const result = await response.json()
      
      if (this.config.debug) {
        console.log(`[Shotstack] Render status for ${renderId}: ${result.response?.status}`)
      }
      
      return result
    } catch (error) {
      if (this.config.debug) {
        console.error(`[Shotstack] Failed to get render status for ${renderId}:`, error)
      }
      throw error
    }
  }

  /**
   * Render using a template with enhanced validation
   */
  async renderTemplate(templateId: string, mergeFields?: Array<{find: string, replace: string | number | boolean}>): Promise<RenderResponse> {
    try {
      if (!templateId || typeof templateId !== 'string') {
        throw new Error('Valid template ID is required')
      }

      const request: TemplateRenderRequest = {
        template: templateId,
        merge: mergeFields
      }

      const response = await this.fetchWithRetry(`${this.baseUrl}/templates/render`, {
        method: 'POST',
        body: JSON.stringify(request)
      })

      const result = await response.json()
      
      if (this.config.debug) {
        console.log(`[Shotstack] Template render submitted: ${result.response?.id}`)
      }
      
      return result
    } catch (error) {
      if (this.config.debug) {
        console.error(`[Shotstack] Template render failed:`, error)
      }
      throw error
    }
  }

  /**
   * Ingest media assets with URL validation
   */
  async ingestAsset(url: string, outputFormat?: 'mp4' | 'mp3' | 'jpg' | 'png' | 'gif'): Promise<IngestResponse> {
    try {
      if (!url || !this.isValidUrl(url)) {
        throw new Error('Valid URL is required for asset ingestion')
      }

      const request = {
        url,
        output: outputFormat || 'mp4'
      }

      const response = await this.fetchWithRetry(`${this.baseUrl}/ingest`, {
        method: 'POST',
        body: JSON.stringify(request)
      })

      const result = await response.json()
      
      if (this.config.debug) {
        console.log(`[Shotstack] Asset ingestion started: ${result.response?.id}`)
      }
      
      return result
    } catch (error) {
      if (this.config.debug) {
        console.error(`[Shotstack] Asset ingestion failed:`, error)
      }
      throw error
    }
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return url.startsWith('http://') || url.startsWith('https://')
    } catch {
      return false
    }
  }

  /**
   * Get asset status with validation
   */
  async getAssetStatus(assetId: string): Promise<AssetResponse> {
    try {
      if (!assetId || typeof assetId !== 'string') {
        throw new Error('Valid asset ID is required')
      }

      const response = await this.fetchWithRetry(`${this.baseUrl}/assets/render/${assetId}`, {
        method: 'GET'
      })

      const result = await response.json()
      
      if (this.config.debug) {
        console.log(`[Shotstack] Asset status for ${assetId}: ${result.response?.attributes?.status}`)
      }
      
      return result
    } catch (error) {
      if (this.config.debug) {
        console.error(`[Shotstack] Failed to get asset status for ${assetId}:`, error)
      }
      throw error
    }
  }

  /**
   * Probe media file for metadata with URL validation
   */
  async probeAsset(url: string): Promise<any> {
    try {
      if (!url || !this.isValidUrl(url)) {
        throw new Error('Valid URL is required for media probing')
      }

      const response = await this.fetchWithRetry(`${this.baseUrl}/probe`, {
        method: 'POST',
        body: JSON.stringify({ url })
      })

      const result = await response.json()
      
      if (this.config.debug) {
        console.log(`[Shotstack] Probed asset: ${url}`)
      }
      
      return result
    } catch (error) {
      if (this.config.debug) {
        console.error(`[Shotstack] Asset probing failed for ${url}:`, error)
      }
      throw error
    }
  }

  /**
   * Wait for render completion with polling
   */
  async waitForRender(renderId: string, options: {
    maxWaitTime?: number
    pollInterval?: number
    onProgress?: (status: string) => void
  } = {}): Promise<RenderStatus> {
    const { 
      maxWaitTime = 600000, // 10 minutes default
      pollInterval = 5000,  // 5 seconds default
      onProgress 
    } = options

    const startTime = Date.now()
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const status = await this.getRenderStatus(renderId)
        
        if (onProgress) {
          onProgress(status.response.status)
        }
        
        if (status.response.status === 'done') {
          if (this.config.debug) {
            console.log(`[Shotstack] Render completed: ${renderId}`)
          }
          return status
        }
        
        if (status.response.status === 'failed') {
          throw new Error(`Render failed: ${status.response.error || 'Unknown error'}`)
        }
        
        await new Promise(resolve => setTimeout(resolve, pollInterval))
      } catch (error) {
        if (this.config.debug) {
          console.error(`[Shotstack] Error while waiting for render:`, error)
        }
        throw error
      }
    }
    
    throw new Error(`Render timeout after ${maxWaitTime}ms`)
  }

  /**
   * Helper: Create a simple slideshow from images
   */
  createSlideshow(imageUrls: string[], options: {
    duration?: number
    transition?: string
    soundtrack?: string
    title?: string
    outputFormat?: 'mp4' | 'gif'
    resolution?: string
    aspectRatio?: string
  } = {}): EditConfig {
    const {
      duration = 3,
      transition = 'fade',
      soundtrack,
      title,
      outputFormat = 'mp4',
      resolution = 'full-hd',
      aspectRatio = '16:9'
    } = options

    const clips: ClipConfig[] = []
    let currentStart = 0

    // Add title if provided
    if (title) {
      clips.push({
                asset: { 
          type: 'title',
          text: title,
          style: 'blockbuster',
          color: '#ffffff',
          size: 'x-large',
          position: 'center'
        },
        start: 0,
        length: 2,
        transition: { in: 'fade', out: 'fade' }
      })
      currentStart = 2
    }

    // Add image clips
    imageUrls.forEach((url, index) => {
      clips.push({
        asset: { 
          type: 'image',
          src: url 
        },
        start: currentStart,
        length: duration,
        fit: 'cover',
        transition: index > 0 || title ? { in: transition as any, out: transition as any } : undefined
      })
      currentStart += duration
    })

    const tracks: TrackConfig[] = [{ clips }]

    const timeline: TimelineConfig = {
      tracks,
      background: '#000000'
    }

    if (soundtrack) {
      timeline.soundtrack = {
        src: soundtrack,
        effect: 'fadeInFadeOut',
        volume: 0.3
      }
    }

    return {
      timeline,
      output: {
        format: outputFormat,
        resolution: resolution as any,
        aspectRatio: aspectRatio as any
      }
    }
  }

  /**
   * Helper: Create a picture-in-picture video
   */
  createPictureInPicture(backgroundVideoUrl: string, overlayVideoUrl: string, options: {
    overlayPosition?: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'
    overlayScale?: number
    duration?: number
    outputFormat?: 'mp4'
    resolution?: string
  } = {}): EditConfig {
    const {
      overlayPosition = 'topRight',
      overlayScale = 0.3,
      duration = 10,
      outputFormat = 'mp4',
      resolution = 'full-hd'
    } = options

    const backgroundClip: ClipConfig = {
      asset: { 
        type: 'video',
        src: backgroundVideoUrl 
      },
      start: 0,
      length: duration,
      fit: 'cover'
    }

    const overlayClip: ClipConfig = {
      asset: { 
        type: 'video',
        src: overlayVideoUrl 
      },
      start: 0,
      length: duration,
      fit: 'cover',
      scale: overlayScale,
      position: overlayPosition,
      offset: {
        x: overlayPosition.includes('Right') ? -0.05 : 0.05,
        y: overlayPosition.includes('top') ? -0.05 : 0.05
      }
    }

    return {
      timeline: {
        tracks: [
          { clips: [backgroundClip] },
          { clips: [overlayClip] }
        ],
        background: '#000000'
      },
      output: {
        format: outputFormat,
        resolution: resolution as any,
        aspectRatio: '16:9'
      }
    }
  }

  /**
   * Helper: Create a kinetic text video
   */
  createKineticText(textLines: string[], options: {
    style?: string
    color?: string
    backgroundColor?: string
    duration?: number
    music?: string
    outputFormat?: 'mp4'
    resolution?: string
    aspectRatio?: string
  } = {}): EditConfig {
    const {
      style = 'blockbuster',
      color = '#ffffff',
      backgroundColor = '#000000',
      duration = 3,
      music,
      outputFormat = 'mp4',
      resolution = 'full-hd',
      aspectRatio = '16:9'
    } = options

    const clips: ClipConfig[] = []
    let currentStart = 0

    textLines.forEach((text, index) => {
      clips.push({
        asset: {
          type: 'title',
          text,
          style: style as any,
          color,
          size: 'x-large',
          position: 'center'
        },
        start: currentStart,
        length: duration,
        transition: {
          in: index === 0 ? 'fade' : 'slideLeft',
          out: index === textLines.length - 1 ? 'fade' : 'slideRight'
        }
      })
      currentStart += duration * 0.8 // Overlap slightly
    })

    const timeline: TimelineConfig = {
      tracks: [{ clips }],
      background: backgroundColor
    }

    if (music) {
      timeline.soundtrack = {
        src: music,
        effect: 'fadeInFadeOut',
        volume: 0.4
      }
    }

    return {
      timeline,
      output: {
        format: outputFormat,
        resolution: resolution as any,
        aspectRatio: aspectRatio as any
      }
    }
  }

  /**
   * Helper: Create a social media video from template
   */
  createSocialMediaVideo(platform: 'instagram' | 'tiktok' | 'youtube' | 'facebook', content: {
    mediaUrls: string[]
    title?: string
    subtitle?: string
    logo?: string
    music?: string
    brandColors?: { primary: string; secondary: string }
  }): EditConfig {
    const { mediaUrls, title, subtitle, logo, music, brandColors } = content

    // Platform-specific configurations
    const platformConfigs = {
      instagram: { aspectRatio: '9:16', resolution: 'full-hd' },
      tiktok: { aspectRatio: '9:16', resolution: 'full-hd' },
      youtube: { aspectRatio: '9:16', resolution: 'full-hd' },
      facebook: { aspectRatio: '1:1', resolution: 'hd' }
    }

    const config = platformConfigs[platform]
    const clips: ClipConfig[] = []
    let currentStart = 0

    // Add intro with title if provided
    if (title) {
      clips.push({
        asset: {
          type: 'title',
          text: title,
          style: 'blockbuster',
          color: brandColors?.primary || '#ffffff',
          size: 'large',
          position: 'center'
        },
        start: 0,
        length: 2,
        transition: { in: 'fade', out: 'fade' }
      })
      currentStart = 2
    }

    // Add media clips
    mediaUrls.forEach((url, index) => {
      const isVideo = url.includes('.mp4') || url.includes('.mov') || url.includes('.avi')
      
      clips.push({
        asset: { 
          type: isVideo ? 'video' : 'image',
          src: url 
        },
        start: currentStart,
        length: isVideo ? 5 : 3,
        fit: 'cover',
        transition: index > 0 || title ? { in: 'fade', out: 'fade' } : undefined
      })
      currentStart += isVideo ? 5 : 3
    })

    // Add logo overlay if provided
    if (logo) {
      clips.push({
        asset: { 
          type: 'image',
          src: logo 
        },
        start: 0,
        length: currentStart,
        fit: 'none',
        scale: 0.2,
        position: 'topRight',
        offset: { x: -0.05, y: -0.05 },
        opacity: 0.8
      })
    }

    const timeline: TimelineConfig = {
      tracks: [{ clips }],
      background: brandColors?.secondary || '#000000'
    }

    if (music) {
      timeline.soundtrack = {
        src: music,
        effect: 'fadeInFadeOut',
        volume: 0.3
      }
    }

    return {
      timeline,
      output: {
        format: 'mp4',
        resolution: config.resolution as any,
        aspectRatio: config.aspectRatio as any
      }
    }
  }
}

export default ShotstackService