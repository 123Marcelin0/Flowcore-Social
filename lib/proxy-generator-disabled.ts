import { supabase, supabaseAdmin } from './supabase'
import { jobQueue } from './job-queue'
import { getFFmpegPath } from './transcribe'
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import os from 'os'

export interface ProxyGenerationOptions {
  generateLowRes: boolean
  generateHLS: boolean
  generateThumbnail: boolean
  generateWaveform: boolean
  targetQuality: '360p' | '540p' | '720p'
}

export interface ProxyResults {
  proxy_url?: string
  preview_hls_url?: string
  thumbnail_url?: string
  waveform_json?: any
  aspect_ratio?: number
  duration_seconds?: number
  file_size_bytes?: number
}

export class ProxyGenerator {
  private db = supabaseAdmin || supabase

  // Generate low-resolution proxy for editing
  async generateProxy(
    inputUrl: string, 
    targetQuality: '360p' | '540p' | '720p' = '540p'
  ): Promise<{ success: boolean; proxyUrl?: string; error?: string }> {
    let tempInputPath: string | null = null
    let tempOutputPath: string | null = null

    try {
      console.log(`🎬 Generating ${targetQuality} proxy from:`, inputUrl)

      const ffmpegPath = await getFFmpegPath()

      // Download input file to temp location
      const response = await fetch(inputUrl)
      if (!response.ok) {
        throw new Error(`Failed to download input file: ${response.status}`)
      }

      const inputBuffer = Buffer.from(await response.arrayBuffer())
      tempInputPath = path.join(os.tmpdir(), `input_${Date.now()}.mp4`)
      tempOutputPath = path.join(os.tmpdir(), `proxy_${Date.now()}.mp4`)

      fs.writeFileSync(tempInputPath, inputBuffer)

      // Determine resolution and encoding settings
      const resolutionMap = {
        '360p': { height: 360, videoBitrate: '500k', audioBitrate: '64k' },
        '540p': { height: 540, videoBitrate: '1000k', audioBitrate: '96k' },
        '720p': { height: 720, videoBitrate: '1500k', audioBitrate: '128k' }
      }

      const settings = resolutionMap[targetQuality]

      // FFmpeg command for proxy generation
      const ffmpegArgs = [
        '-i', tempInputPath,
        '-vf', `scale=-2:${settings.height}`, // Maintain aspect ratio
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '28', // Higher CRF for smaller file size
        '-b:v', settings.videoBitrate,
        '-maxrate', settings.videoBitrate,
        '-bufsize', `${parseInt(settings.videoBitrate) * 2}k`,
        '-c:a', 'aac',
        '-b:a', settings.audioBitrate,
        '-ac', '2', // Stereo
        '-r', '24', // Lower frame rate for smaller size
        '-movflags', '+faststart', // Web optimized
        '-y', // Overwrite output file
        tempOutputPath
      ]

      console.log(`🔧 FFmpeg command:`, [ffmpegPath, ...ffmpegArgs].join(' '))

      await new Promise<void>((resolve, reject) => {
        const ffmpegProcess = spawn(ffmpegPath, ffmpegArgs)
        
        let stderr = ''
        ffmpegProcess.stderr.on('data', (data) => {
          stderr += data.toString()
        })

        ffmpegProcess.on('close', (code) => {
          if (code === 0) {
            console.log('✅ Proxy generation completed successfully')
            resolve()
          } else {
            console.error('❌ FFmpeg proxy generation failed:', stderr)
            reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`))
          }
        })

        ffmpegProcess.on('error', (error) => {
          console.error('❌ FFmpeg process error:', error)
          reject(error)
        })
      })

      // Upload proxy to Supabase storage
      if (!fs.existsSync(tempOutputPath)) {
        throw new Error('Proxy file was not generated')
      }

      const proxyBuffer = fs.readFileSync(tempOutputPath)
      const proxyFileName = `proxy_${targetQuality}_${Date.now()}.mp4`

      const { data: uploadData, error: uploadError } = await (this.db as any).storage
        .from('media')
        .upload(proxyFileName, proxyBuffer, {
          contentType: 'video/mp4',
          upsert: false
        })

      if (uploadError) {
        throw new Error(`Failed to upload proxy: ${uploadError.message}`)
      }

      const { data: publicData } = (this.db as any).storage
        .from('media')
        .getPublicUrl(proxyFileName)

      console.log(`✅ Proxy uploaded: ${publicData.publicUrl}`)

      return {
        success: true,
        proxyUrl: publicData.publicUrl
      }

    } catch (error) {
      console.error('Proxy generation failed:', error)
      return {
        success: false,
        error: String(error)
      }
    } finally {
      // Cleanup temp files
      if (tempInputPath && fs.existsSync(tempInputPath)) {
        fs.unlinkSync(tempInputPath)
      }
      if (tempOutputPath && fs.existsSync(tempOutputPath)) {
        fs.unlinkSync(tempOutputPath)
      }
    }
  }

  // Generate HLS playlist for adaptive streaming
  async generateHLS(inputUrl: string): Promise<{ success: boolean; hlsUrl?: string; error?: string }> {
    let tempInputPath: string | null = null
    let tempDir: string | null = null

    try {
      console.log('🎭 Generating HLS playlist from:', inputUrl)

      const ffmpegPath = await getFFmpegPath()

      // Download input file
      const response = await fetch(inputUrl)
      if (!response.ok) {
        throw new Error(`Failed to download input file: ${response.status}`)
      }

      const inputBuffer = Buffer.from(await response.arrayBuffer())
      tempInputPath = path.join(os.tmpdir(), `input_${Date.now()}.mp4`)
      tempDir = path.join(os.tmpdir(), `hls_${Date.now()}`)

      fs.writeFileSync(tempInputPath, inputBuffer)
      fs.mkdirSync(tempDir, { recursive: true })

      const playlistPath = path.join(tempDir, 'playlist.m3u8')
      const segmentPattern = path.join(tempDir, 'segment%03d.ts')

      // FFmpeg command for HLS generation
      const ffmpegArgs = [
        '-i', tempInputPath,
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', '26',
        '-sc_threshold', '0',
        '-g', '48',
        '-keyint_min', '48',
        '-hls_time', '6',
        '-hls_list_size', '0',
        '-hls_segment_filename', segmentPattern,
        '-f', 'hls',
        '-y',
        playlistPath
      ]

      await new Promise<void>((resolve, reject) => {
        const ffmpegProcess = spawn(ffmpegPath, ffmpegArgs)
        
        let stderr = ''
        ffmpegProcess.stderr.on('data', (data) => {
          stderr += data.toString()
        })

        ffmpegProcess.on('close', (code) => {
          if (code === 0) {
            console.log('✅ HLS generation completed')
            resolve()
          } else {
            console.error('❌ FFmpeg HLS generation failed:', stderr)
            reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`))
          }
        })
      })

      // Upload HLS files to storage
      const files = fs.readdirSync(tempDir)
      const hlsFolderName = `hls_${Date.now()}`
      
      for (const file of files) {
        const filePath = path.join(tempDir, file)
        const fileBuffer = fs.readFileSync(filePath)
        const uploadPath = `${hlsFolderName}/${file}`
        
        const contentType = file.endsWith('.m3u8') ? 'application/x-mpegURL' : 'video/MP2T'
        
        await (this.db as any).storage
          .from('media')
          .upload(uploadPath, fileBuffer, {
            contentType,
            upsert: false
          })
      }

      const { data: publicData } = (this.db as any).storage
        .from('media')
        .getPublicUrl(`${hlsFolderName}/playlist.m3u8`)

      console.log(`✅ HLS playlist uploaded: ${publicData.publicUrl}`)

      return {
        success: true,
        hlsUrl: publicData.publicUrl
      }

    } catch (error) {
      console.error('HLS generation failed:', error)
      return {
        success: false,
        error: String(error)
      }
    } finally {
      // Cleanup
      if (tempInputPath && fs.existsSync(tempInputPath)) {
        fs.unlinkSync(tempInputPath)
      }
      if (tempDir && fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true })
      }
    }
  }

  // Generate thumbnail image
  async generateThumbnail(inputUrl: string, timeOffset: number = 5): Promise<{ success: boolean; thumbnailUrl?: string; error?: string }> {
    let tempInputPath: string | null = null
    let tempOutputPath: string | null = null

    try {
      console.log('🖼️ Generating thumbnail at', timeOffset, 'seconds')

      const ffmpegPath = await getFFmpegPath()

      const response = await fetch(inputUrl)
      if (!response.ok) {
        throw new Error(`Failed to download input file: ${response.status}`)
      }

      const inputBuffer = Buffer.from(await response.arrayBuffer())
      tempInputPath = path.join(os.tmpdir(), `input_${Date.now()}.mp4`)
      tempOutputPath = path.join(os.tmpdir(), `thumb_${Date.now()}.jpg`)

      fs.writeFileSync(tempInputPath, inputBuffer)

      const ffmpegArgs = [
        '-i', tempInputPath,
        '-ss', timeOffset.toString(),
        '-vframes', '1',
        '-vf', 'scale=480:270',
        '-q:v', '3', // High quality JPEG
        '-y',
        tempOutputPath
      ]

      await new Promise<void>((resolve, reject) => {
        const ffmpegProcess = spawn(ffmpegPath, ffmpegArgs)
        
        ffmpegProcess.on('close', (code) => {
          if (code === 0) {
            resolve()
          } else {
            reject(new Error(`FFmpeg failed with code ${code}`))
          }
        })
      })

      const thumbnailBuffer = fs.readFileSync(tempOutputPath)
      const thumbnailFileName = `thumb_${Date.now()}.jpg`

      const { data: uploadData, error: uploadError } = await (this.db as any).storage
        .from('media')
        .upload(thumbnailFileName, thumbnailBuffer, {
          contentType: 'image/jpeg',
          upsert: false
        })

      if (uploadError) {
        throw new Error(`Failed to upload thumbnail: ${uploadError.message}`)
      }

      const { data: publicData } = (this.db as any).storage
        .from('media')
        .getPublicUrl(thumbnailFileName)

      return {
        success: true,
        thumbnailUrl: publicData.publicUrl
      }

    } catch (error) {
      console.error('Thumbnail generation failed:', error)
      return {
        success: false,
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

  // Generate waveform data for audio visualization
  async generateWaveform(inputUrl: string): Promise<{ success: boolean; waveformData?: any; error?: string }> {
    let tempInputPath: string | null = null

    try {
      console.log('🌊 Generating waveform data')

      const ffmpegPath = await getFFmpegPath()

      const response = await fetch(inputUrl)
      const inputBuffer = Buffer.from(await response.arrayBuffer())
      tempInputPath = path.join(os.tmpdir(), `input_${Date.now()}.mp4`)

      fs.writeFileSync(tempInputPath, inputBuffer)

      // Extract audio samples for waveform
      const ffmpegArgs = [
        '-i', tempInputPath,
        '-ac', '1', // Mono
        '-ar', '8000', // Lower sample rate for waveform
        '-f', 'f32le', // 32-bit float PCM
        'pipe:1'
      ]

      const samples = await new Promise<number[]>((resolve, reject) => {
        const ffmpegProcess = spawn(ffmpegPath, ffmpegArgs)
        const chunks: Buffer[] = []
        
        ffmpegProcess.stdout.on('data', (chunk) => {
          chunks.push(chunk)
        })

        ffmpegProcess.on('close', (code) => {
          if (code === 0) {
            const buffer = Buffer.concat(chunks)
            const samples: number[] = []
            
            // Convert buffer to float32 samples
            for (let i = 0; i < buffer.length; i += 4) {
              samples.push(buffer.readFloatLE(i))
            }
            
            resolve(samples)
          } else {
            reject(new Error(`FFmpeg failed with code ${code}`))
          }
        })
      })

      // Downsample for visualization (create peaks for timeline)
      const peakCount = 1000 // Number of peaks for timeline
      const samplesPerPeak = Math.floor(samples.length / peakCount)
      const peaks: number[] = []

      for (let i = 0; i < peakCount; i++) {
        const start = i * samplesPerPeak
        const end = Math.min(start + samplesPerPeak, samples.length)
        let max = 0
        
        for (let j = start; j < end; j++) {
          max = Math.max(max, Math.abs(samples[j]))
        }
        
        peaks.push(max)
      }

      const waveformData = {
        peaks,
        duration: samples.length / 8000, // Duration in seconds
        sample_rate: 8000,
        peak_count: peakCount
      }

      return {
        success: true,
        waveformData
      }

    } catch (error) {
      console.error('Waveform generation failed:', error)
      return {
        success: false,
        error: String(error)
      }
    } finally {
      if (tempInputPath && fs.existsSync(tempInputPath)) {
        fs.unlinkSync(tempInputPath)
      }
    }
  }

  // Get video metadata
  async getVideoMetadata(inputUrl: string): Promise<{
    success: boolean
    metadata?: {
      duration: number
      width: number
      height: number
      aspect_ratio: number
      file_size: number
      bitrate: number
    }
    error?: string
  }> {
    let tempInputPath: string | null = null

    try {
      const ffmpegPath = await getFFmpegPath()

      const response = await fetch(inputUrl)
      const inputBuffer = Buffer.from(await response.arrayBuffer())
      tempInputPath = path.join(os.tmpdir(), `input_${Date.now()}.mp4`)

      fs.writeFileSync(tempInputPath, inputBuffer)

      // Use ffprobe to get metadata
      const ffprobeArgs = [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        tempInputPath
      ]

      const ffprobePath = ffmpegPath.replace('ffmpeg', 'ffprobe')

      const metadata = await new Promise<any>((resolve, reject) => {
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

      const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video')
      const format = metadata.format

      if (!videoStream) {
        throw new Error('No video stream found')
      }

      return {
        success: true,
        metadata: {
          duration: parseFloat(format.duration),
          width: videoStream.width,
          height: videoStream.height,
          aspect_ratio: videoStream.width / videoStream.height,
          file_size: parseInt(format.size),
          bitrate: parseInt(format.bit_rate)
        }
      }

    } catch (error) {
      return {
        success: false,
        error: String(error)
      }
    } finally {
      if (tempInputPath && fs.existsSync(tempInputPath)) {
        fs.unlinkSync(tempInputPath)
      }
    }
  }

  // Generate all proxies and metadata for a media file
  async generateAllProxies(
    uploadId: string, 
    inputUrl: string, 
    options: ProxyGenerationOptions = {
      generateLowRes: true,
      generateHLS: false, // HLS can be resource intensive
      generateThumbnail: true,
      generateWaveform: true,
      targetQuality: '540p'
    }
  ): Promise<ProxyResults> {
    console.log('🎬 Generating all proxies for:', uploadId)

    const results: ProxyResults = {}

    try {
      // Get video metadata first
      const metadataResult = await this.getVideoMetadata(inputUrl)
      if (metadataResult.success && metadataResult.metadata) {
        results.aspect_ratio = metadataResult.metadata.aspect_ratio
        results.duration_seconds = Math.round(metadataResult.metadata.duration)
        results.file_size_bytes = metadataResult.metadata.file_size
      }

      // Generate low-res proxy
      if (options.generateLowRes) {
        const proxyResult = await this.generateProxy(inputUrl, options.targetQuality)
        if (proxyResult.success) {
          results.proxy_url = proxyResult.proxyUrl
        }
      }

      // Generate HLS playlist
      if (options.generateHLS) {
        const hlsResult = await this.generateHLS(inputUrl)
        if (hlsResult.success) {
          results.preview_hls_url = hlsResult.hlsUrl
        }
      }

      // Generate thumbnail
      if (options.generateThumbnail) {
        const thumbnailResult = await this.generateThumbnail(inputUrl, 3)
        if (thumbnailResult.success) {
          results.thumbnail_url = thumbnailResult.thumbnailUrl
        }
      }

      // Generate waveform
      if (options.generateWaveform) {
        const waveformResult = await this.generateWaveform(inputUrl)
        if (waveformResult.success) {
          results.waveform_json = waveformResult.waveformData
        }
      }

      // Update media file with proxy URLs
      await (this.db as any)
        .from('media_files')
        .update(results)
        .eq('id', uploadId)

      console.log('✅ All proxies generated and saved:', Object.keys(results))

    } catch (error) {
      console.error('Error generating proxies:', error)
      throw error
    }

    return results
  }

  // Queue proxy generation job
  async queueProxyJob(uploadId: string, inputUrl: string, options?: ProxyGenerationOptions, userId?: string): Promise<string> {
    const jobId = await jobQueue.createJob(
      'proxy_generation',
      { uploadId, inputUrl, options },
      userId
    )

    console.log(`📋 Queued proxy generation job: ${jobId}`)
    return jobId
  }

  // Process proxy generation job from queue
  async processProxyJob(job: any): Promise<void> {
    const { uploadId, inputUrl, options } = job.payload

    try {
      await jobQueue.updateJobStatus(job.job_id, 'processing')
      
      const results = await this.generateAllProxies(uploadId, inputUrl, options)
      
      await jobQueue.updateJobStatus(job.job_id, 'completed', {
        result_url: results.proxy_url || 'completed'
      })

      console.log(`✅ Proxy generation job completed: ${job.job_id}`)
    } catch (error) {
      console.error('Proxy generation job failed:', error)
      await jobQueue.updateJobStatus(job.job_id, 'failed', {
        error_message: String(error)
      })
    }
  }
}

export const proxyGenerator = new ProxyGenerator()