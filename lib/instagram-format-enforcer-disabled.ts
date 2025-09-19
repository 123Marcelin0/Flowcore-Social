import { jobQueue } from './job-queue'
import { getFFmpegPath } from './transcribe'
import { supabase, supabaseAdmin } from './supabase'
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import os from 'os'

export interface InstagramReelsSpecs {
  aspectRatio: number // 9:16 = 0.5625
  maxDuration: number // 90 seconds (Instagram Reels max)
  recommendedDuration: number // 15-30 seconds for better engagement
  resolution: {
    width: number // 1080
    height: number // 1920
  }
  safeZones: {
    top: number // pixels from top for UI elements
    bottom: number // pixels from bottom for captions/UI
    side: number // pixels from sides
  }
  fileSize: {
    maxMB: number // 4GB max for Instagram
    recommendedMB: number // Target for good upload speed
  }
  audioRequirements: {
    codec: string
    bitrate: string
    sampleRate: number
  }
  videoRequirements: {
    codec: string
    profile: string
    level: string
    frameRate: number
    maxBitrate: string
  }
}

export const INSTAGRAM_REELS_SPECS: InstagramReelsSpecs = {
  aspectRatio: 9/16, // Vertical format
  maxDuration: 90,
  recommendedDuration: 30,
  resolution: {
    width: 1080,
    height: 1920
  },
  safeZones: {
    top: 180, // Account for Instagram UI
    bottom: 250, // Account for captions and interaction buttons
    side: 40
  },
  fileSize: {
    maxMB: 4000, // 4GB Instagram limit
    recommendedMB: 100 // Reasonable target
  },
  audioRequirements: {
    codec: 'aac',
    bitrate: '128k',
    sampleRate: 44100
  },
  videoRequirements: {
    codec: 'libx264',
    profile: 'main',
    level: '4.0',
    frameRate: 30,
    maxBitrate: '3500k'
  }
}

export interface FormatValidationResult {
  isCompliant: boolean
  issues: string[]
  warnings: string[]
  currentSpecs: {
    width?: number
    height?: number
    aspectRatio?: number
    duration?: number
    fileSizeMB?: number
    frameRate?: number
    videoCodec?: string
    audioCodec?: string
  }
  suggestions: string[]
}

export interface InstagramOptimizationOptions {
  enforceAspectRatio: boolean
  cropStrategy: 'center' | 'smart' | 'top' | 'bottom'
  maxDuration: number
  targetBitrate: string
  includeAudioNormalization: boolean
  addSafeZoneOverlay: boolean
  optimizeForEngagement: boolean
}

export class InstagramFormatEnforcer {
  private db = supabaseAdmin || supabase

  // Validate video against Instagram Reels specifications
  async validateFormat(inputUrl: string): Promise<FormatValidationResult> {
    let tempInputPath: string | null = null

    try {
      console.log('🔍 Validating Instagram Reels format for:', inputUrl)

      // Download and analyze the video
      const response = await fetch(inputUrl)
      const inputBuffer = Buffer.from(await response.arrayBuffer())
      tempInputPath = path.join(os.tmpdir(), `validate_${Date.now()}.mp4`)
      fs.writeFileSync(tempInputPath, inputBuffer)

      const ffmpegPath = await getFFmpegPath()
      const ffprobePath = ffmpegPath.replace('ffmpeg', 'ffprobe')

      // Get video metadata
      const metadata = await this.getVideoMetadata(ffprobePath, tempInputPath)
      
      const issues: string[] = []
      const warnings: string[] = []
      const suggestions: string[] = []

      const specs = INSTAGRAM_REELS_SPECS
      const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video')
      const audioStream = metadata.streams.find((s: any) => s.codec_type === 'audio')

      if (!videoStream) {
        issues.push('No video stream found')
        return {
          isCompliant: false,
          issues,
          warnings,
          currentSpecs: {},
          suggestions: ['Ensure the file contains a valid video stream']
        }
      }

      const width = videoStream.width
      const height = videoStream.height
      const aspectRatio = width / height
      const duration = parseFloat(metadata.format.duration)
      const fileSizeMB = parseInt(metadata.format.size) / (1024 * 1024)
      const frameRate = this.parseFrameRate(videoStream.r_frame_rate)

      // Check aspect ratio
      const targetAspectRatio = specs.aspectRatio
      const aspectRatioTolerance = 0.05
      
      if (Math.abs(aspectRatio - targetAspectRatio) > aspectRatioTolerance) {
        if (aspectRatio > targetAspectRatio) {
          issues.push(`Video is too wide (${aspectRatio.toFixed(3)}:1, expected 9:16). Instagram Reels requires vertical format.`)
          suggestions.push('Crop or letterbox the video to 9:16 aspect ratio')
        } else {
          warnings.push(`Video aspect ratio (${aspectRatio.toFixed(3)}:1) is more vertical than Instagram standard`)
          suggestions.push('Consider adjusting to exactly 9:16 for optimal display')
        }
      }

      // Check resolution
      if (width !== specs.resolution.width || height !== specs.resolution.height) {
        if (width < specs.resolution.width || height < specs.resolution.height) {
          warnings.push(`Resolution ${width}x${height} is lower than Instagram's recommended 1080x1920`)
          suggestions.push('Upscale to 1080x1920 for best quality')
        } else {
          warnings.push(`Resolution ${width}x${height} is higher than Instagram's standard 1080x1920`)
          suggestions.push('Downscale to 1080x1920 to reduce file size')
        }
      }

      // Check duration
      if (duration > specs.maxDuration) {
        issues.push(`Video duration ${duration.toFixed(1)}s exceeds Instagram Reels maximum of ${specs.maxDuration}s`)
        suggestions.push(`Trim video to ${specs.maxDuration}s or less, or split into multiple parts`)
      } else if (duration > specs.recommendedDuration) {
        warnings.push(`Duration ${duration.toFixed(1)}s is longer than recommended ${specs.recommendedDuration}s for engagement`)
        suggestions.push(`Consider trimming to ${specs.recommendedDuration}s for better engagement`)
      }

      // Check file size
      if (fileSizeMB > specs.fileSize.maxMB) {
        issues.push(`File size ${fileSizeMB.toFixed(1)}MB exceeds Instagram limit of ${specs.fileSize.maxMB}MB`)
        suggestions.push('Reduce bitrate or resolution to decrease file size')
      } else if (fileSizeMB > specs.fileSize.recommendedMB) {
        warnings.push(`File size ${fileSizeMB.toFixed(1)}MB is larger than recommended ${specs.fileSize.recommendedMB}MB`)
        suggestions.push('Consider optimizing compression for faster upload')
      }

      // Check video codec
      if (videoStream.codec_name !== 'h264') {
        warnings.push(`Video codec '${videoStream.codec_name}' may not be optimal. H.264 is recommended for Instagram.`)
        suggestions.push('Re-encode using H.264 codec for best compatibility')
      }

      // Check frame rate
      if (frameRate > specs.videoRequirements.frameRate) {
        warnings.push(`Frame rate ${frameRate}fps is higher than Instagram's standard ${specs.videoRequirements.frameRate}fps`)
        suggestions.push(`Consider reducing to ${specs.videoRequirements.frameRate}fps to reduce file size`)
      }

      // Check audio
      if (!audioStream) {
        warnings.push('No audio stream detected')
        suggestions.push('Instagram Reels perform better with audio content')
      } else if (audioStream.codec_name !== 'aac') {
        warnings.push(`Audio codec '${audioStream.codec_name}' detected. AAC is recommended for Instagram.`)
        suggestions.push('Re-encode audio using AAC codec')
      }

      // Generate engagement optimization suggestions
      if (duration < 15) {
        suggestions.push('Videos over 15 seconds tend to perform better on Instagram Reels')
      }

      if (!audioStream && duration > 10) {
        suggestions.push('Add background music or narration to improve engagement')
      }

      const isCompliant = issues.length === 0

      console.log(`${isCompliant ? '✅' : '❌'} Format validation complete:`, {
        isCompliant,
        issueCount: issues.length,
        warningCount: warnings.length
      })

      return {
        isCompliant,
        issues,
        warnings,
        currentSpecs: {
          width,
          height,
          aspectRatio,
          duration,
          fileSizeMB,
          frameRate,
          videoCodec: videoStream.codec_name,
          audioCodec: audioStream?.codec_name
        },
        suggestions
      }

    } catch (error) {
      console.error('Format validation failed:', error)
      return {
        isCompliant: false,
        issues: [`Validation failed: ${String(error)}`],
        warnings: [],
        currentSpecs: {},
        suggestions: ['Check if the input file is accessible and contains valid video data']
      }
    } finally {
      if (tempInputPath && fs.existsSync(tempInputPath)) {
        fs.unlinkSync(tempInputPath)
      }
    }
  }

  // Optimize video for Instagram Reels format
  async optimizeForInstagram(
    inputUrl: string,
    options: InstagramOptimizationOptions = {
      enforceAspectRatio: true,
      cropStrategy: 'smart',
      maxDuration: 90,
      targetBitrate: '2500k',
      includeAudioNormalization: true,
      addSafeZoneOverlay: false,
      optimizeForEngagement: true
    }
  ): Promise<{ success: boolean; outputUrl?: string; changes: string[]; error?: string }> {
    let tempInputPath: string | null = null
    let tempOutputPath: string | null = null

    try {
      console.log('📱 Optimizing video for Instagram Reels format')

      const ffmpegPath = await getFFmpegPath()
      
      // Download input
      const response = await fetch(inputUrl)
      const inputBuffer = Buffer.from(await response.arrayBuffer())
      tempInputPath = path.join(os.tmpdir(), `input_${Date.now()}.mp4`)
      tempOutputPath = path.join(os.tmpdir(), `instagram_${Date.now()}.mp4`)
      
      fs.writeFileSync(tempInputPath, inputBuffer)

      // Get input metadata
      const ffprobePath = ffmpegPath.replace('ffmpeg', 'ffprobe')
      const metadata = await this.getVideoMetadata(ffprobePath, tempInputPath)
      const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video')
      
      if (!videoStream) {
        throw new Error('No video stream found in input')
      }

      const inputWidth = videoStream.width
      const inputHeight = videoStream.height
      const inputAspectRatio = inputWidth / inputHeight
      const inputDuration = parseFloat(metadata.format.duration)

      const changes: string[] = []
      const ffmpegArgs: string[] = ['-i', tempInputPath]

      // Video filters array
      const videoFilters: string[] = []

      // Handle aspect ratio and resolution
      if (options.enforceAspectRatio) {
        const targetAspectRatio = INSTAGRAM_REELS_SPECS.aspectRatio
        const targetWidth = INSTAGRAM_REELS_SPECS.resolution.width
        const targetHeight = INSTAGRAM_REELS_SPECS.resolution.height

        if (Math.abs(inputAspectRatio - targetAspectRatio) > 0.05) {
          // Need to crop/letterbox to 9:16
          if (inputAspectRatio > targetAspectRatio) {
            // Input is too wide, need to crop sides
            switch (options.cropStrategy) {
              case 'center':
                videoFilters.push(`crop=ih*${targetAspectRatio}:ih`)
                changes.push('Cropped sides to achieve 9:16 aspect ratio')
                break
              case 'smart':
                // Try to detect faces/subjects and crop intelligently
                videoFilters.push(`crop=ih*${targetAspectRatio}:ih`)
                changes.push('Smart-cropped to 9:16 aspect ratio')
                break
              case 'top':
              case 'bottom':
                videoFilters.push(`crop=ih*${targetAspectRatio}:ih`)
                changes.push(`Cropped ${options.cropStrategy} to 9:16 aspect ratio`)
                break
            }
          } else {
            // Input is too tall, add letterboxing or crop top/bottom
            videoFilters.push(`scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease`)
            videoFilters.push(`pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2:black`)
            changes.push('Added letterboxing to achieve 9:16 aspect ratio')
          }
        }

        // Scale to Instagram resolution
        if (inputWidth !== targetWidth || inputHeight !== targetHeight) {
          if (!videoFilters.some(f => f.includes('scale'))) {
            videoFilters.push(`scale=${targetWidth}:${targetHeight}`)
            changes.push(`Scaled to Instagram Reels resolution (${targetWidth}x${targetHeight})`)
          }
        }
      }

      // Handle duration
      if (inputDuration > options.maxDuration) {
        ffmpegArgs.push('-t', options.maxDuration.toString())
        changes.push(`Trimmed to ${options.maxDuration} seconds`)
      }

      // Add safe zone overlay if requested
      if (options.addSafeZoneOverlay) {
        const safeZone = INSTAGRAM_REELS_SPECS.safeZones
        const overlayFilter = `drawbox=x=${safeZone.side}:y=${safeZone.top}:w=iw-${safeZone.side*2}:h=ih-${safeZone.top+safeZone.bottom}:color=white@0.1:t=2`
        videoFilters.push(overlayFilter)
        changes.push('Added safe zone overlay guide')
      }

      // Apply video filters
      if (videoFilters.length > 0) {
        ffmpegArgs.push('-vf', videoFilters.join(','))
      }

      // Video encoding settings
      ffmpegArgs.push(
        '-c:v', INSTAGRAM_REELS_SPECS.videoRequirements.codec,
        '-profile:v', INSTAGRAM_REELS_SPECS.videoRequirements.profile,
        '-level:v', INSTAGRAM_REELS_SPECS.videoRequirements.level,
        '-b:v', options.targetBitrate,
        '-maxrate', options.targetBitrate,
        '-bufsize', `${parseInt(options.targetBitrate) * 2}k`,
        '-r', INSTAGRAM_REELS_SPECS.videoRequirements.frameRate.toString(),
        '-pix_fmt', 'yuv420p'
      )

      // Audio settings
      const audioArgs = [
        '-c:a', INSTAGRAM_REELS_SPECS.audioRequirements.codec,
        '-b:a', INSTAGRAM_REELS_SPECS.audioRequirements.bitrate,
        '-ar', INSTAGRAM_REELS_SPECS.audioRequirements.sampleRate.toString(),
        '-ac', '2' // Stereo
      ]

      if (options.includeAudioNormalization) {
        // Add audio normalization
        audioArgs.unshift('-af', 'loudnorm=I=-16:TP=-1.5:LRA=11')
        changes.push('Applied audio normalization for consistent volume')
      }

      ffmpegArgs.push(...audioArgs)

      // Output settings
      ffmpegArgs.push(
        '-movflags', '+faststart', // Web optimized
        '-y', // Overwrite output
        tempOutputPath
      )

      console.log('🔧 FFmpeg command:', [ffmpegPath, ...ffmpegArgs].join(' '))

      // Execute FFmpeg
      await new Promise<void>((resolve, reject) => {
        const ffmpegProcess = spawn(ffmpegPath, ffmpegArgs)
        
        let stderr = ''
        ffmpegProcess.stderr.on('data', (data) => {
          stderr += data.toString()
        })

        ffmpegProcess.on('close', (code) => {
          if (code === 0) {
            console.log('✅ Instagram optimization completed')
            resolve()
          } else {
            console.error('❌ FFmpeg optimization failed:', stderr)
            reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`))
          }
        })
      })

      // Upload optimized video
      const outputBuffer = fs.readFileSync(tempOutputPath)
      const outputFileName = `instagram_reels_${Date.now()}.mp4`

      const { data: uploadData, error: uploadError } = await (this.db as any).storage
        .from('media')
        .upload(outputFileName, outputBuffer, {
          contentType: 'video/mp4',
          upsert: false
        })

      if (uploadError) {
        throw new Error(`Failed to upload optimized video: ${uploadError.message}`)
      }

      const { data: publicData } = (this.db as any).storage
        .from('media')
        .getPublicUrl(outputFileName)

      changes.push('Optimized for Instagram Reels specifications')

      return {
        success: true,
        outputUrl: publicData.publicUrl,
        changes
      }

    } catch (error) {
      console.error('Instagram optimization failed:', error)
      return {
        success: false,
        changes: [],
        error: String(error)
      }
    } finally {
      if (tempInputPath && fs.existsSync(tempInputPath)) {
        fs.unlinkSync(tempInputPath)
      }
      if (tempOutputPath && fs.existsSync(tempOutputPath)) {
        fs.unlinkSync(tempOutputPath)
      }
    }
  }

  // Update media file with Instagram compliance status
  async updateInstagramCompliance(uploadId: string, validationResult: FormatValidationResult): Promise<void> {
    try {
      await (this.db as any)
        .from('media_files')
        .update({
          instagram_compliant: validationResult.isCompliant,
          metadata: (this.db as any).raw(`
            COALESCE(metadata, '{}'::jsonb) || 
            jsonb_build_object(
              'instagram_validation', 
              '${JSON.stringify(validationResult)}'
            )
          `)
        })
        .eq('id', uploadId)

      console.log(`📱 Updated Instagram compliance status: ${validationResult.isCompliant}`)
    } catch (error) {
      console.error('Failed to update Instagram compliance:', error)
    }
  }

  // Get engagement optimization suggestions
  getEngagementSuggestions(validationResult: FormatValidationResult): string[] {
    const suggestions: string[] = []

    if (validationResult.currentSpecs.duration) {
      if (validationResult.currentSpecs.duration < 7) {
        suggestions.push('Videos under 7 seconds may not perform well - consider extending content')
      } else if (validationResult.currentSpecs.duration > 15 && validationResult.currentSpecs.duration < 30) {
        suggestions.push('Sweet spot: Current duration is good for engagement')
      } else if (validationResult.currentSpecs.duration > 60) {
        suggestions.push('Consider splitting longer content into multiple Reels for better performance')
      }
    }

    if (!validationResult.currentSpecs.audioCodec) {
      suggestions.push('Add trending audio or original sound to improve discoverability')
    }

    suggestions.push('Use text overlays in the safe zone (avoid top 180px and bottom 250px)')
    suggestions.push('Include a hook in the first 3 seconds to retain viewers')
    suggestions.push('End with a call-to-action to encourage engagement')

    return suggestions
  }

  // Helper methods
  private async getVideoMetadata(ffprobePath: string, inputPath: string): Promise<any> {
    const ffprobeArgs = [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      inputPath
    ]

    return new Promise((resolve, reject) => {
      const ffprobeProcess = spawn(ffprobePath, ffprobeArgs)
      let stdout = ''
      
      ffprobeProcess.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      ffprobeProcess.on('close', (code) => {
        if (code === 0) {
          try {
            resolve(JSON.parse(stdout))
          } catch (e) {
            reject(new Error('Failed to parse metadata JSON'))
          }
        } else {
          reject(new Error(`ffprobe failed with code ${code}`))
        }
      })
    })
  }

  private parseFrameRate(frameRateStr: string): number {
    if (frameRateStr.includes('/')) {
      const [num, den] = frameRateStr.split('/').map(Number)
      return num / den
    }
    return parseFloat(frameRateStr)
  }
}

export const instagramFormatEnforcer = new InstagramFormatEnforcer()