import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Import Shotstack SDK components
const Shotstack = require('shotstack-sdk')

// For video duration retrieval
import ffmpeg from 'fluent-ffmpeg'
import ffmpegPath from 'ffmpeg-static'
// @ts-ignore
import ffprobePath from 'ffprobe-static'

// Set FFmpeg paths for serverless environments
if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath)
if (ffprobePath) ffmpeg.setFfprobePath(ffprobePath)

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Authentication helper function
async function verifyAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  const { data: { user }, error } = await supabase.auth.getUser(token)
  
  if (error || !user) {
    return null
  }

  return user
}

interface ShotstackRenderRequest {
  videoUrls?: string[]
  outputFormat?: 'mp4' | 'gif' | 'webm'
  outputResolution?: 'sd' | 'hd' | 'full-hd'
  // Enhanced request structure
  edit?: any // Full Shotstack edit configuration
  template?: {
    id: string
    mergeFields?: Array<{
      find: string
      replace: string | number | boolean
    }>
  }
  projectName?: string
  // Template-specific options
  templateOptions?: {
    imageUrls?: string[]
    title?: string
    subtitle?: string
    music?: string
    aspectRatio?: '16:9' | '9:16' | '1:1' | '4:5'
    platform?: 'instagram' | 'tiktok' | 'youtube' | 'facebook'
    textStyle?: string
    textColor?: string
    backgroundColor?: string
    duration?: number
    transition?: string
  }
}

// Import our enhanced Shotstack service
import { ShotstackService } from '@/lib/shotstack-service'
import { getShotstackConfig, validateShotstackConfig } from '@/lib/shotstack-config'

// Configure Shotstack client using our optimized service
let shotstackService: ShotstackService | null = null

function getShotstackService(): ShotstackService {
  if (!shotstackService) {
    const config = getShotstackConfig()
    // Force debug mode to see detailed logs
    config.debug = true
    shotstackService = new ShotstackService(config)
  }
  return shotstackService
}

// Validate configuration at startup
const configValidation = validateShotstackConfig()
if (!configValidation.isValid) {
  console.error('Shotstack configuration errors:', configValidation.errors)
}

/**
 * Retrieves the duration of a video from its URL using ffprobe.
 * @param videoUrl Public URL of the video.
 * @returns Promise<number> duration in seconds.
 */
async function getVideoDuration(videoUrl: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoUrl, (err: any, metadata: any) => {
      if (err) {
        console.error(`Failed to probe video ${videoUrl}:`, err)
        return reject(new Error(`Could not get video duration: ${err.message}`))
      }
      const duration = metadata.format?.duration
      if (duration === undefined) {
        return reject(new Error('Video duration not found in metadata'))
      }
      resolve(Number(duration))
    })
  })
}

/**
 * Create edit configuration from template
 */
async function createEditFromTemplate(template: any, options: any = {}): Promise<any> {
  const {
    imageUrls = [],
    title = '',
    subtitle = '',
    music = '',
    aspectRatio = '16:9',
    platform = 'youtube',
    textStyle = 'blockbuster',
    textColor = '#ffffff',
    backgroundColor = '#000000',
    duration = 3,
    transition = 'fade'
  } = options

  const clips: any[] = []
  let currentStart = 0

  // Add title if provided
  if (title) {
    clips.push({
      asset: {
        type: 'title',
        text: title,
        style: textStyle,
        color: textColor,
        size: 'x-large',
        position: 'center'
      },
      start: 0,
      length: 2
    })
    currentStart = 2
  }

  // Add subtitle if provided
  if (subtitle) {
    clips.push({
      asset: {
        type: 'title',
        text: subtitle,
        style: 'minimal',
        color: textColor,
        size: 'medium',
        position: 'bottomCenter'
      },
      start: currentStart,
      length: Math.max(imageUrls.length * duration, 5)
    })
  }

  // Add images
  imageUrls.forEach((url: string, index: number) => {
    const imageClip: any = {
      asset: {
        type: 'image',
        src: url
      },
      start: currentStart,
      length: duration,
      fit: 'cover'
    }

    if (index > 0 || title) {
      imageClip.transition = {
        in: transition,
        out: transition
      }
    }

    clips.push(imageClip)
    currentStart += duration
  })

  console.log(`🎨 Template created ${clips.length} clips`)

  // If no clips were created, create a default placeholder clip
  if (clips.length === 0) {
    console.log('⚠️ No content provided, creating placeholder clip')
    clips.push({
      asset: {
        type: 'title',
        text: 'No content provided',
        style: 'minimal',
        color: '#ffffff',
        size: 'large',
        position: 'center'
      },
      start: 0,
      length: 3
    })
  }

  // Create edit configuration as plain object
  const edit = {
    timeline: {
      tracks: [{ clips: clips }],
      background: backgroundColor,
      soundtrack: music ? {
        src: music,
        effect: 'fadeInFadeOut',
        volume: 0.3
      } : undefined
    },
    output: {
      format: 'mp4',
      resolution: 'full-hd',
      aspectRatio: aspectRatio
    }
  }

  return edit
}

/**
 * Create legacy video merge configuration
 */
async function createLegacyVideoMerge(
  videoUrls: string[], 
  outputFormat: string, 
  outputResolution: string,
  options: any = {}
): Promise<any> {
  console.log('Getting video durations for', videoUrls.length, 'videos...')
  
  // Get all video durations using Promise.all
  let videoDurations: number[]
  try {
    videoDurations = await Promise.all(
      videoUrls.map(async (url) => {
        try {
          const duration = await getVideoDuration(url)
          console.log(`Video duration for ${url}: ${duration}s`)
          return duration
        } catch (error) {
          console.warn(`Could not get duration for ${url}, using 5s default:`, error)
          return 5 // Fallback to 5 seconds if probe fails
        }
      })
    )
  } catch (error) {
    console.error('Error getting video durations:', error)
    // Fallback to 5 seconds for all videos
    videoDurations = videoUrls.map(() => 5)
  }

  console.log('Video durations:', videoDurations)

  // Construct Shotstack timeline using plain objects (not SDK)
  const clips: any[] = []
  
  // Add intro title clip if provided
  if (options.title) {
    const titleClip = {
      asset: {
        type: 'title',
        text: options.title,
        style: options.textStyle || 'blockbuster',
        color: options.textColor || '#ffffff',
        size: 'x-large',
        position: 'center'
      },
      start: 0,
      length: 2
    }

    console.log(`📝 Title clip created:`, {
      assetType: titleClip.asset.type,
      text: titleClip.asset.text,
      style: titleClip.asset.style
    })
    
    clips.push(titleClip)
  }

  // Calculate start times and add video clips
  let currentStart = options.title ? 2 : 0
  
  videoUrls.forEach((url, index) => {
    const clipDuration = videoDurations[index]
    const isFirstVideo = index === 0

    console.log(`🎬 Adding video clip ${index + 1}:`, {
      url: url,
      start: currentStart,
      length: clipDuration
    })

    // Create video clip as plain object
    // Shotstack expects asset type to be 'video' for video files
    const videoClip: any = {
      asset: {
        type: 'video',
        src: url
      },
      start: currentStart,
      length: clipDuration,
      fit: 'cover'
    }

    console.log(`🎬 Video clip ${index + 1} created:`, {
      assetType: videoClip.asset.type,
      src: videoClip.asset.src,
      start: videoClip.start,
      length: videoClip.length
    })

    // Add transitions
    if (!isFirstVideo || options.title) {
      videoClip.transition = {
        in: options.transition || 'fade',
        out: options.transition || 'fade'
      }
    }

    clips.push(videoClip)
    currentStart += clipDuration
  })

  console.log(`🎥 Created ${clips.length} clips total`)

  // Create track and timeline as plain objects
  const track = {
    clips: clips
  }

  const timeline: any = {
    tracks: [track],
    background: options.backgroundColor || '#000000'
  }

  // Add soundtrack if provided
  if (options.music) {
    timeline.soundtrack = {
      src: options.music,
      effect: 'fadeInFadeOut',
      volume: 0.1
    }
  }

  // Determine aspect ratio - Shotstack expects specific format
  const aspectRatio = outputFormat === 'gif' ? '1:1' : (options.aspectRatio || '16:9')

  // Map resolution to Shotstack format
  let mappedResolution = outputResolution
  if (outputResolution === 'full-hd') {
    mappedResolution = 'hd' // Shotstack uses 'hd' for 1080p
  }
  if (outputResolution === 'sd') {
    mappedResolution = 'sd' // Keep as is
  }
  if (outputResolution === 'hd') {
    mappedResolution = 'hd' // Keep as is
  }

  console.log(`🎬 Resolution mapping: ${outputResolution} -> ${mappedResolution}`)

  // Create output specification as plain object
  // Shotstack expects specific resolution values: 'preview', 'mobile', 'sd', 'hd', 'full-hd'
  const output = {
    format: outputFormat,
    resolution: mappedResolution,
    aspectRatio: aspectRatio
  }

  console.log(`🎬 Output configuration:`, {
    format: output.format,
    resolution: output.resolution,
    aspectRatio: output.aspectRatio
  })

  // Create edit as plain object
  const edit = {
    timeline: timeline,
    output: output
  }

  console.log('🔧 Final edit configuration:', JSON.stringify({
    tracksCount: edit.timeline.tracks.length,
    clipsPerTrack: edit.timeline.tracks.map((track: any) => track.clips.length),
    totalClips: edit.timeline.tracks.reduce((sum: number, track: any) => sum + track.clips.length, 0),
    firstClipAsset: edit.timeline.tracks[0]?.clips[0]?.asset
  }, null, 2))

  return edit
}

// POST Method - Video Merging & Transformation
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate Shotstack configuration
    try {
      // Check if Shotstack is disabled
      const shotstackKey = process.env.SHOTSTACK_API_KEY || process.env.SHOTSTACK_SANDBOX_API_KEY;
      if (shotstackKey === 'disabled' || !shotstackKey) {
        return NextResponse.json({ 
          error: 'Shotstack video features are currently disabled', 
          message: 'Video rendering is not available. Please configure a valid Shotstack API key to enable video features.',
          suggestion: 'Get a free Shotstack API key at https://shotstack.io/dashboard/developers'
        }, { status: 503 }) // Service Unavailable instead of 500
      }

      const configValidation = validateShotstackConfig()
      if (!configValidation.isValid) {
        console.error('Shotstack configuration errors:', configValidation.errors)
        return NextResponse.json({ 
          error: 'Shotstack configuration error', 
          details: configValidation.errors 
        }, { status: 500 })
      }
    } catch (configError) {
      console.error('Failed to validate Shotstack configuration:', configError)
      const errorMessage = configError instanceof Error ? configError.message : 'Configuration validation failed';
      
      // Handle disabled key gracefully
      if (errorMessage.includes('disabled')) {
        return NextResponse.json({ 
          error: 'Shotstack video features are disabled', 
          message: 'Video rendering requires a valid Shotstack API key.',
          suggestion: 'Get a free API key at https://shotstack.io/dashboard/developers'
        }, { status: 503 })
      }
      
      return NextResponse.json({ 
        error: 'Shotstack configuration error', 
        details: [errorMessage] 
      }, { status: 500 })
    }

      // Parse request body
  const body: ShotstackRenderRequest = await request.json()
  const { 
    videoUrls, 
    outputFormat = 'mp4', 
    outputResolution = 'full-hd',
    edit,
    template,
    projectName = 'Untitled Project',
    templateOptions
  } = body

  let editConfig: any
  let totalDuration = 0

  // Handle different request types
  if (edit) {
    // Direct edit configuration provided
    editConfig = edit
    console.log('Using provided edit configuration')
  } else if (template) {
    // Template-based render with merge fields
    console.log('Rendering with template:', template.id)
    
    // Validate template options to ensure we have some content
    const hasContent = (templateOptions?.imageUrls && templateOptions.imageUrls.length > 0) || 
                      templateOptions?.title || 
                      templateOptions?.subtitle;
    
    if (!hasContent) {
      return NextResponse.json({ 
        error: 'No content provided for template',
        details: 'Please provide at least one of: imageUrls, title, or subtitle in templateOptions',
        suggestion: 'Add content to templateOptions before rendering'
      }, { status: 400 })
    }
    
    editConfig = await createEditFromTemplate(template, templateOptions)
  } else if (videoUrls && Array.isArray(videoUrls) && videoUrls.length > 0) {
    // Legacy video merging mode
    console.log('Using legacy video merging mode')
    
    // Validate input
    if (videoUrls.length > 10) {
      return NextResponse.json({ error: 'Maximum 10 videos allowed' }, { status: 400 })
    }

    // Validate URLs
    const urlPattern = /^https?:\/\/.+/
    for (const url of videoUrls) {
      if (!urlPattern.test(url)) {
        return NextResponse.json({ error: `Invalid URL: ${url}` }, { status: 400 })
      }
    }

    editConfig = await createLegacyVideoMerge(videoUrls, outputFormat, outputResolution, templateOptions)
  } else {
    return NextResponse.json({ 
      error: 'No content provided for rendering',
      details: 'Either videoUrls, edit configuration, or template with content must be provided',
      suggestion: 'Provide video URLs, a complete edit configuration, or template options with content'
    }, { status: 400 })
  }

  // Calculate total duration for database metadata
  if (videoUrls && Array.isArray(videoUrls)) {
    try {
      const videoDurations = await Promise.all(
        videoUrls.map(async (url) => {
          try {
            const duration = await getVideoDuration(url)
            return duration
          } catch (error) {
            return 5 // Fallback
          }
        })
      )
      totalDuration = videoDurations.reduce((sum, duration) => sum + duration, 0) + (templateOptions?.title ? 2 : 0)
    } catch (error) {
      totalDuration = videoUrls.length * 5 + (templateOptions?.title ? 2 : 0)
    }
  } else {
    // Estimate duration for template-based or direct edit configs
    totalDuration = (templateOptions?.duration || 10)
  }

  // Validate that we have a valid edit configuration with content
  if (!editConfig || !editConfig.timeline || !editConfig.timeline.tracks) {
    return NextResponse.json({ 
      error: 'Invalid edit configuration generated',
      details: 'The edit configuration is missing timeline or tracks',
      suggestion: 'Check that your request contains valid content'
    }, { status: 400 })
  }

  // Check if any track has clips
  const hasClips = editConfig.timeline.tracks.some((track: any) => 
    track && track.clips && Array.isArray(track.clips) && track.clips.length > 0
  );

  if (!hasClips) {
    return NextResponse.json({ 
      error: 'No content found in edit configuration',
      details: 'All tracks are empty or have no valid clips',
      suggestion: 'Provide valid content (images, videos, or text) before rendering',
      debugInfo: {
        tracksCount: editConfig.timeline.tracks.length,
        tracks: editConfig.timeline.tracks.map((track: any, i: number) => ({
          trackIndex: i,
          hasTrack: !!track,
          hasClips: !!(track?.clips),
          clipsLength: track?.clips?.length || 0
        }))
      }
    }, { status: 400 })
  }

  console.log('Submitting render to Shotstack API...')
    
    // Additional pre-render validation and cleanup
    try {
      // Ensure we have a valid edit configuration
      if (!editConfig || !editConfig.timeline) {
        throw new Error('Invalid edit configuration: missing timeline')
      }

      // Debug: Log the original edit structure
      console.log('Original edit configuration:', JSON.stringify({
        tracks: editConfig.timeline.tracks?.map((track: any, i: number) => ({
          trackIndex: i,
          clipsCount: track?.clips?.length || 0,
          hasValidClips: !!(track?.clips && Array.isArray(track.clips) && track.clips.length > 0)
        })) || [],
        totalTracks: editConfig.timeline.tracks?.length || 0
      }, null, 2));

      // Filter out any empty tracks before sending to Shotstack
      if (editConfig.timeline.tracks) {
        const originalTrackCount = editConfig.timeline.tracks.length;
        
        // First, validate each track individually
        for (let i = 0; i < editConfig.timeline.tracks.length; i++) {
          const track: any = editConfig.timeline.tracks[i];
          console.log(`Track ${i}:`, {
            exists: !!track,
            hasClips: !!(track?.clips),
            isArray: Array.isArray(track?.clips),
            clipsLength: track?.clips?.length || 0,
            clips: track?.clips?.map((clip: any, j: number) => ({
              clipIndex: j,
              hasAsset: !!(clip?.asset),
              assetType: clip?.asset?.type || 'missing',
              start: clip?.start,
              length: clip?.length
            })) || []
          });
        }

        // Now filter out empty tracks
        editConfig.timeline.tracks = editConfig.timeline.tracks.filter((track: any) => {
          const isValid = track && track.clips && Array.isArray(track.clips) && track.clips.length > 0;
          if (!isValid) {
            console.log('Filtering out invalid track:', {
              hasTrack: !!track,
              hasClips: !!(track?.clips),
              clipsIsArray: Array.isArray(track?.clips),
              clipsLength: track?.clips?.length || 0
            });
          }
          return isValid;
        });
        
        if (originalTrackCount !== editConfig.timeline.tracks.length) {
          console.log(`Filtered out ${originalTrackCount - editConfig.timeline.tracks.length} empty tracks before render`);
        }
      }

      // Final check: ensure we have at least one valid track
      if (!editConfig.timeline.tracks || editConfig.timeline.tracks.length === 0) {
        console.error('❌ VALIDATION FAILED: No valid tracks found after filtering');
        console.error('This typically means:');
        console.error('1. All tracks had empty clips arrays');
        console.error('2. Video/image URLs failed to load');
        console.error('3. Asset generation failed in previous steps');
        console.error('4. No content was provided in the request');
        
        // Provide more specific error based on request type
        let errorMessage = 'No valid tracks with clips found. All tracks were empty.';
        if (template) {
          errorMessage += ' Check that templateOptions contains valid content (imageUrls, title, or subtitle).';
        } else if (videoUrls) {
          errorMessage += ' Check that your video URLs are valid and accessible.';
        } else if (edit) {
          errorMessage += ' Check that your edit configuration contains valid clips.';
        }
        
        throw new Error(errorMessage)
      }

      console.log(`✅ Validation passed! Submitting render with ${editConfig.timeline.tracks.length} tracks and ${editConfig.timeline.tracks.reduce((sum: number, track: any) => sum + track.clips.length, 0)} total clips`)
      
    } catch (validationError) {
      console.error('Pre-render validation failed:', validationError)
      return NextResponse.json({ 
        error: 'Invalid video configuration',
        details: validationError instanceof Error ? validationError.message : 'Unknown validation error',
        suggestion: 'Ensure your video has valid content (images, videos, or text) before rendering. Check that media URLs are accessible and properly formatted.',
        debugInfo: {
          editConfigExists: !!editConfig,
          timelineExists: !!(editConfig?.timeline),
          tracksExists: !!(editConfig?.timeline?.tracks),
          tracksCount: editConfig?.timeline?.tracks?.length || 0
        }
      }, { status: 400 })
    }

    // Submit to Shotstack API using our enhanced service
    let response: any;
    let jobId: string;
    
    try {
      const shotstackService = getShotstackService()
      response = await shotstackService.render(editConfig)
      jobId = response.response?.id

      if (!jobId) {
        console.error('No job ID returned from Shotstack:', response)
        return NextResponse.json({ 
          error: 'No job ID returned from Shotstack',
          details: response,
          suggestion: 'Check if the edit configuration is valid and API key is correct'
        }, { status: 500 })
      }
      
      console.log('Shotstack render job submitted successfully:', jobId)
    } catch (shotstackError) {
      console.error('Error calling Shotstack API:', shotstackError)
      const errorMessage = shotstackError instanceof Error ? shotstackError.message : 'Unknown Shotstack error';
      return NextResponse.json({ 
        error: 'Shotstack API error',
        details: errorMessage,
        suggestion: 'Check API key, rate limits, and edit configuration'
      }, { status: 500 })
    }

    // Prepare metadata for database
    const metadata: any = {
      projectName,
      estimatedDuration: totalDuration,
      editType: edit ? 'custom' : template ? 'template' : 'legacy'
    }

    if (videoUrls) {
      metadata.totalVideos = videoUrls.length
      metadata.inputVideoUrls = videoUrls
    }

    if (template) {
      metadata.templateId = template.id
      metadata.templateOptions = templateOptions
    }

    if (templateOptions) {
      metadata.templateOptions = templateOptions
    }

    // Save job to database
    const { data: dbResult, error: dbError } = await supabase
      .from('shotstack_jobs')
      .insert({
        user_id: user.id,
        shotstack_job_id: jobId,
        status: 'submitted',
        input_video_urls: videoUrls || [],
        output_format: outputFormat,
        output_resolution: outputResolution,
        metadata
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json({ error: 'Failed to save job to database' }, { status: 500 })
    }

    console.log('Shotstack job created successfully:', jobId)
    
    return NextResponse.json({
      success: true,
      jobId: jobId,
      dbJobId: dbResult.id,
      estimatedDuration: totalDuration,
      projectName,
      editType: metadata.editType,
      message: 'Video rendering job submitted successfully'
    })

  } catch (error) {
    console.error('Error in Shotstack render:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      { 
        error: 'Internal server error in Shotstack render',
        details: error instanceof Error ? error.message : 'Unknown error',
        suggestion: 'Check server logs for more details'
      }, 
      { status: 500 }
    )
  }
}

// GET Method - Job Status Check
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get jobId from query parameters
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      return NextResponse.json({ error: 'jobId parameter is required' }, { status: 400 })
    }

    // Validate Shotstack configuration
    try {
      const configValidation = validateShotstackConfig()
      if (!configValidation.isValid) {
        console.error('Shotstack configuration errors:', configValidation.errors)
        return NextResponse.json({ 
          error: 'Shotstack configuration error', 
          details: configValidation.errors 
        }, { status: 500 })
      }
    } catch (configError) {
      console.error('Failed to validate Shotstack configuration:', configError)
      return NextResponse.json({ 
        error: 'Shotstack configuration error', 
        details: ['Configuration validation failed'] 
      }, { status: 500 })
    }

    console.log('Checking Shotstack job status:', jobId)
    
    // Get job status from Shotstack API using our enhanced service
    const shotstackService = getShotstackService()
    const response = await shotstackService.getRenderStatus(jobId)
    const renderData = response.response

    if (!renderData) {
      return NextResponse.json({ error: 'Invalid response from Shotstack' }, { status: 500 })
    }

    const status = renderData.status
    const videoUrl = renderData.url
    const error = renderData.error
    const duration = (renderData as any).duration
    const renderTime = (renderData as any).render_time

    // Update database with new status
    const updateData: any = {
      status: status,
      updated_at: new Date().toISOString()
    }

    if (videoUrl) {
      updateData.video_url = videoUrl
    }

    if (error) {
      updateData.error_message = error
    }

    if (duration || renderTime) {
      updateData.metadata = {
        ...(updateData.metadata || {}),
        duration: duration,
        renderTime: renderTime
      }
    }

    const { error: dbError } = await supabase
      .from('shotstack_jobs')
      .update(updateData)
      .eq('shotstack_job_id', jobId)
      .eq('user_id', user.id)

    if (dbError) {
      console.error('Database update error:', dbError)
      // Don't fail the request if DB update fails, still return Shotstack status
    }

    console.log('Job status updated:', jobId, status)

    return NextResponse.json({
      success: true,
      jobId: jobId,
      status: status,
      videoUrl: videoUrl || null,
      error: error || null,
      duration: duration || null,
      renderTime: renderTime || null
    })

  } catch (error) {
    console.error('Error checking job status:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}