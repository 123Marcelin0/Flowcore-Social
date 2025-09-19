import { spawn, spawnSync } from 'child_process'
import path from 'path'
import fs from 'fs'
import os from 'os'

// Try to get FFmpeg paths from installed packages
let ffmpegPath: string
let ffprobePath: string

try {
  // Try to get from @ffmpeg-installer packages
  ffmpegPath = require('@ffmpeg-installer/ffmpeg').path
  console.log('✅ Found FFmpeg from package:', ffmpegPath)
} catch (error) {
  // Fallback to system PATH
  ffmpegPath = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
  console.log('⚠️ Using system FFmpeg from PATH:', ffmpegPath)
}

try {
  ffprobePath = require('@ffprobe-installer/ffprobe').path
  console.log('✅ Found FFprobe from package:', ffprobePath)
} catch (error) {
  // Fallback to system PATH
  ffprobePath = process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe'
  console.log('⚠️ Using system FFprobe from PATH:', ffprobePath)
}

/**
 * Cross-platform path normalization
 */
export function normalizePath(filePath: string): string {
  // Handle Windows paths
  if (process.platform === 'win32') {
    // Convert Unix-style paths to Windows
    if (filePath.startsWith('/tmp/')) {
      const tempDir = os.tmpdir()
      return path.join(tempDir, filePath.substring(5))
    }
    
    // Normalize Windows paths
    return path.normalize(filePath.replace(/\//g, '\\'))
  }
  
  // Handle Unix-style paths
  return path.normalize(filePath)
}

/**
 * Get temporary directory path
 */
export function getTempDir(): string {
  return os.tmpdir()
}

/**
 * Create a temporary file path with proper extension
 */
export function createTempPath(extension: string = 'tmp'): string {
  const tempDir = getTempDir()
  const fileName = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${extension}`
  return path.join(tempDir, fileName)
}

/**
 * Verify FFmpeg installation and accessibility
 */
export async function verifyFFmpegInstallation(): Promise<{ ffmpeg: boolean; ffprobe: boolean; errors: string[] }> {
  const errors: string[] = []
  
  // Test FFmpeg
  let ffmpegWorking = false
  try {
    const ffmpegResult = spawnSync(ffmpegPath, ['-version'], { 
      encoding: 'utf8',
      timeout: 10000 
    })
    
    ffmpegWorking = ffmpegResult.status === 0 && ffmpegResult.stdout.includes('ffmpeg version')
    
    if (!ffmpegWorking) {
      errors.push(`FFmpeg test failed: ${ffmpegResult.stderr || 'Unknown error'}`)
    }
  } catch (error: any) {
    errors.push(`FFmpeg spawn error: ${error.message}`)
  }
  
  // Test FFprobe
  let ffprobeWorking = false
  try {
    const ffprobeResult = spawnSync(ffprobePath, ['-version'], { 
      encoding: 'utf8',
      timeout: 10000 
    })
    
    ffprobeWorking = ffprobeResult.status === 0 && ffprobeResult.stdout.includes('ffprobe version')
    
    if (!ffprobeWorking) {
      errors.push(`FFprobe test failed: ${ffprobeResult.stderr || 'Unknown error'}`)
    }
  } catch (error: any) {
    errors.push(`FFprobe spawn error: ${error.message}`)
  }
  
  return {
    ffmpeg: ffmpegWorking,
    ffprobe: ffprobeWorking,
    errors
  }
}

/**
 * Execute FFmpeg command with proper error handling
 */
export async function executeFFmpeg(args: string[], options: {
  cwd?: string
  timeout?: number
  input?: string
} = {}): Promise<{ success: boolean; stdout: string; stderr: string; error?: string }> {
  
  return new Promise((resolve) => {
    try {
      const normalizedArgs = args.map(arg => normalizePath(arg))
      
      console.log('🎬 Executing FFmpeg:', ffmpegPath, normalizedArgs.join(' '))
      
      const child = spawn(ffmpegPath, normalizedArgs, {
        cwd: options.cwd || process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
      })
      
      let stdout = ''
      let stderr = ''
      
      child.stdout?.on('data', (data) => {
        stdout += data.toString()
      })
      
      child.stderr?.on('data', (data) => {
        stderr += data.toString()
      })
      
      // Handle input if provided
      if (options.input) {
        child.stdin?.write(options.input)
        child.stdin?.end()
      }
      
      // Set timeout
      let timeoutId: NodeJS.Timeout | null = null
      if (options.timeout) {
        timeoutId = setTimeout(() => {
          child.kill('SIGTERM')
          resolve({
            success: false,
            stdout,
            stderr,
            error: 'Command timed out'
          })
        }, options.timeout)
      }
      
      child.on('close', (code) => {
        if (timeoutId) clearTimeout(timeoutId)
        
        resolve({
          success: code === 0,
          stdout,
          stderr,
          error: code !== 0 ? `FFmpeg exited with code ${code}` : undefined
        })
      })
      
      child.on('error', (error) => {
        if (timeoutId) clearTimeout(timeoutId)
        
        resolve({
          success: false,
          stdout,
          stderr,
          error: `FFmpeg spawn error: ${error.message}`
        })
      })
      
    } catch (error: any) {
      resolve({
        success: false,
        stdout: '',
        stderr: '',
        error: `Failed to execute FFmpeg: ${error.message}`
      })
    }
  })
}

/**
 * Execute FFprobe command with proper error handling
 */
export async function executeFFprobe(args: string[], options: {
  timeout?: number
} = {}): Promise<{ success: boolean; stdout: string; stderr: string; error?: string }> {
  
  return new Promise((resolve) => {
    try {
      const normalizedArgs = args.map(arg => normalizePath(arg))
      
      console.log('🔍 Executing FFprobe:', ffprobePath, normalizedArgs.join(' '))
      
      const child = spawn(ffprobePath, normalizedArgs, {
        stdio: ['pipe', 'pipe', 'pipe']
      })
      
      let stdout = ''
      let stderr = ''
      
      child.stdout?.on('data', (data) => {
        stdout += data.toString()
      })
      
      child.stderr?.on('data', (data) => {
        stderr += data.toString()
      })
      
      // Set timeout
      let timeoutId: NodeJS.Timeout | null = null
      if (options.timeout) {
        timeoutId = setTimeout(() => {
          child.kill('SIGTERM')
          resolve({
            success: false,
            stdout,
            stderr,
            error: 'Command timed out'
          })
        }, options.timeout)
      }
      
      child.on('close', (code) => {
        if (timeoutId) clearTimeout(timeoutId)
        
        resolve({
          success: code === 0,
          stdout,
          stderr,
          error: code !== 0 ? `FFprobe exited with code ${code}` : undefined
        })
      })
      
      child.on('error', (error) => {
        if (timeoutId) clearTimeout(timeoutId)
        
        resolve({
          success: false,
          stdout,
          stderr,
          error: `FFprobe spawn error: ${error.message}`
        })
      })
      
    } catch (error: any) {
      resolve({
        success: false,
        stdout: '',
        stderr: '',
        error: `Failed to execute FFprobe: ${error.message}`
      })
    }
  })
}

/**
 * Detect silences using FFmpeg with proper cross-platform handling
 */
export async function detectSilences(
  inputPath: string, 
  options: {
    noiseThreshold?: string
    minDuration?: string
    timeout?: number
  } = {}
): Promise<Array<{ start: number; end: number; duration: number }>> {
  
  const { noiseThreshold = '-30dB', minDuration = '0.5', timeout = 60000 } = options
  
  const normalizedInputPath = normalizePath(inputPath)
  
  // Verify input file exists
  if (!fs.existsSync(normalizedInputPath)) {
    throw new Error(`Input file does not exist: ${normalizedInputPath}`)
  }
  
  const args = [
    '-i', normalizedInputPath,
    '-af', `silencedetect=noise=${noiseThreshold}:d=${minDuration}`,
    '-f', 'null',
    '-'
  ]
  
  const result = await executeFFmpeg(args, { timeout })
  
  if (!result.success) {
    throw new Error(`Silence detection failed: ${result.error || result.stderr}`)
  }
  
  // Parse silence detection output
  const silenceRegions: Array<{ start: number; end: number; duration: number }> = []
  const lines = result.stderr.split('\n')
  
  let currentSilence: { start?: number; end?: number } = {}
  
  for (const line of lines) {
    // Look for silence_start
    const startMatch = line.match(/silence_start: ([0-9.]+)/)
    if (startMatch) {
      currentSilence.start = parseFloat(startMatch[1])
    }
    
    // Look for silence_end
    const endMatch = line.match(/silence_end: ([0-9.]+)/)
    if (endMatch && currentSilence.start !== undefined) {
      currentSilence.end = parseFloat(endMatch[1])
      
      const duration = currentSilence.end - currentSilence.start
      silenceRegions.push({
        start: currentSilence.start,
        end: currentSilence.end,
        duration
      })
      
      currentSilence = {}
    }
  }
  
  console.log(`🔇 Detected ${silenceRegions.length} silence regions`)
  
  return silenceRegions
}

/**
 * Extract audio from video with proper cross-platform handling
 */
export async function extractAudio(
  inputPath: string, 
  outputPath?: string,
  options: {
    format?: 'wav' | 'mp3' | 'aac'
    sampleRate?: number
    channels?: number
    timeout?: number
  } = {}
): Promise<string> {
  
  const { format = 'wav', sampleRate = 16000, channels = 1, timeout = 120000 } = options
  
  const normalizedInputPath = normalizePath(inputPath)
  const finalOutputPath = outputPath || createTempPath(format)
  const normalizedOutputPath = normalizePath(finalOutputPath)
  
  // Verify input file exists
  if (!fs.existsSync(normalizedInputPath)) {
    throw new Error(`Input file does not exist: ${normalizedInputPath}`)
  }
  
  const args = [
    '-i', normalizedInputPath,
    '-vn', // No video
    '-acodec', format === 'wav' ? 'pcm_s16le' : format,
    '-ar', sampleRate.toString(),
    '-ac', channels.toString(),
    '-y', // Overwrite output file
    normalizedOutputPath
  ]
  
  const result = await executeFFmpeg(args, { timeout })
  
  if (!result.success) {
    throw new Error(`Audio extraction failed: ${result.error || result.stderr}`)
  }
  
  // Verify output file was created
  if (!fs.existsSync(normalizedOutputPath)) {
    throw new Error(`Audio extraction completed but output file not found: ${normalizedOutputPath}`)
  }
  
  console.log(`🎵 Extracted audio to: ${normalizedOutputPath}`)
  
  return normalizedOutputPath
}

/**
 * Get video metadata using FFprobe
 */
export async function getVideoMetadata(filePath: string): Promise<{
  duration: number
  width: number
  height: number
  fps: number
  bitrate?: number
  codec?: string
}> {
  
  const normalizedPath = normalizePath(filePath)
  
  if (!fs.existsSync(normalizedPath)) {
    throw new Error(`File does not exist: ${normalizedPath}`)
  }
  
  const args = [
    '-v', 'quiet',
    '-print_format', 'json',
    '-show_format',
    '-show_streams',
    normalizedPath
  ]
  
  const result = await executeFFprobe(args, { timeout: 30000 })
  
  if (!result.success) {
    throw new Error(`Failed to get video metadata: ${result.error || result.stderr}`)
  }
  
  try {
    const metadata = JSON.parse(result.stdout)
    
    // Find video stream
    const videoStream = metadata.streams.find((stream: any) => stream.codec_type === 'video')
    if (!videoStream) {
      throw new Error('No video stream found')
    }
    
    // Parse frame rate
    let fps = 30 // Default fallback
    if (videoStream.r_frame_rate) {
      const [num, den] = videoStream.r_frame_rate.split('/')
      fps = parseInt(num) / parseInt(den)
    } else if (videoStream.avg_frame_rate) {
      const [num, den] = videoStream.avg_frame_rate.split('/')
      fps = parseInt(num) / parseInt(den)
    }
    
    return {
      duration: parseFloat(metadata.format.duration || videoStream.duration),
      width: parseInt(videoStream.width),
      height: parseInt(videoStream.height),
      fps: Math.round(fps),
      bitrate: parseInt(metadata.format.bit_rate) || undefined,
      codec: videoStream.codec_name
    }
    
  } catch (error: any) {
    throw new Error(`Failed to parse video metadata: ${error.message}`)
  }
}

// Initialize verification on module load
verifyFFmpegInstallation().then(result => {
  if (result.errors.length > 0) {
    console.warn('⚠️ FFmpeg/FFprobe verification warnings:')
    result.errors.forEach(error => console.warn(`  - ${error}`))
  }
  
  if (!result.ffmpeg || !result.ffprobe) {
    console.warn('❌ FFmpeg/FFprobe not fully available. Some features may not work.')
    console.warn('💡 Install packages: npm install @ffmpeg-installer/ffmpeg @ffprobe-installer/ffprobe')
  }
}).catch(error => {
  console.error('❌ Failed to verify FFmpeg installation:', error)
})