import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'
import { KeepSegment } from './types'

/**
 * Advanced FFmpeg video cutting with intelligent mode selection
 * Supports single-pass filter_complex and extract+concat modes
 */

export interface CutSegment {
  start_ms: number
  end_ms: number
  text?: string
  index?: number
}

export interface FFmpegOptions {
  outputFormat: 'mp4' | 'webm' | 'avi' | 'mov'
  videoCodec: 'x264' | 'x265' | 'vp9' | 'copy'
  audioCodec: 'aac' | 'mp3' | 'opus' | 'copy'
  quality: 'low' | 'medium' | 'high' | 'lossless'
  subtitles?: {
    enabled: boolean
    style?: SubtitleStyle
    burnIn: boolean  // Whether to burn subtitles into video
  }
  filters?: string[] // Additional video filters
  forceReencode?: boolean // Force re-encoding even if no filters
}

export interface SubtitleStyle {
  fontFamily: string
  fontSize: number
  fontColor: string
  backgroundColor: string
  borderColor: string
  borderWidth: number
  shadowColor: string
  shadowOffset: { x: number; y: number }
  position: 'bottom' | 'top' | 'center'
  marginV: number
}

export interface FFmpegResult {
  success: boolean
  outputPath?: string
  outputBuffer?: ArrayBuffer
  duration_ms: number
  fileSize: number
  processingTime_ms: number
  method: 'single-pass' | 'extract-concat'
  reencoded: boolean
  error?: string
  stats?: {
    originalSize: number
    compressionRatio: number
    videoCodec: string
    audioCodec: string
    resolution: string
    bitrate: number
  }
}

const DEFAULT_FFMPEG_OPTIONS: FFmpegOptions = {
  outputFormat: 'mp4',
  videoCodec: 'x264',
  audioCodec: 'aac',
  quality: 'medium',
  subtitles: {
    enabled: false,
    burnIn: false
  },
  filters: [],
  forceReencode: false
}

const DEFAULT_SUBTITLE_STYLE: SubtitleStyle = {
  fontFamily: 'Arial',
  fontSize: 24,
  fontColor: '#FFFFFF',
  backgroundColor: '#00000080',
  borderColor: '#000000',
  borderWidth: 2,
  shadowColor: '#000000',
  shadowOffset: { x: 2, y: 2 },
  position: 'bottom',
  marginV: 30
}

/**
 * Get FFmpeg executable path
 */
export function getFFmpegPath(): string {
  // Try to load from @ffmpeg-installer/ffmpeg if available
  try {
    const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg')
    return ffmpegInstaller.path
  } catch {
    // Fallback to system ffmpeg
    return process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
  }
}

/**
 * Main cutting function with intelligent mode selection
 */
export async function cutVideo(
  inputPath: string,
  segments: CutSegment[],
  options: Partial<FFmpegOptions> = {}
): Promise<FFmpegResult> {
  const startTime = Date.now()
  const opts = { ...DEFAULT_FFMPEG_OPTIONS, ...options }
  
  console.log(`🎬 Starting video cutting: ${segments.length} segments`)
  console.log(`📊 Options: ${opts.outputFormat}, ${opts.videoCodec}, ${opts.audioCodec}, quality: ${opts.quality}`)
  
  if (!segments.length) {
    throw new Error('No segments provided for cutting')
  }
  
  try {
    // Determine cutting method based on options
    const needsFilters = shouldUseFilters(opts)
    const method = needsFilters ? 'single-pass' : 'extract-concat'
    
    console.log(`🔧 Using ${method} method (filters: ${needsFilters ? 'enabled' : 'disabled'})`)
    
    let result: FFmpegResult
    
    if (method === 'single-pass') {
      result = await cutVideoSinglePass(inputPath, segments, opts)
    } else {
      result = await cutVideoExtractConcat(inputPath, segments, opts)
    }
    
    result.processingTime_ms = Date.now() - startTime
    result.method = method
    
    console.log(`✅ Video cutting completed in ${result.processingTime_ms}ms using ${method}`)
    return result
    
  } catch (error: any) {
    console.error('❌ Video cutting failed:', error)
    return {
      success: false,
      duration_ms: 0,
      fileSize: 0,
      processingTime_ms: Date.now() - startTime,
      method: 'single-pass',
      reencoded: false,
      error: error.message
    }
  }
}

/**
 * Determine if filters are needed (prevents streamcopy with filters error)
 */
function shouldUseFilters(options: FFmpegOptions): boolean {
  // Always use filters if:
  // 1. Subtitles are enabled and burn-in is requested
  // 2. Custom filters are provided
  // 3. Re-encoding is forced
  // 4. Video/audio codec is not 'copy'
  
  const hasSubtitleBurnIn = options.subtitles?.enabled && options.subtitles?.burnIn
  const hasCustomFilters = options.filters && options.filters.length > 0
  const isForceReencode = options.forceReencode
  const isNotStreamCopy = options.videoCodec !== 'copy' || options.audioCodec !== 'copy'
  
  return hasSubtitleBurnIn || hasCustomFilters || isForceReencode || isNotStreamCopy
}

/**
 * Single-pass cutting using filter_complex (always re-encodes)
 */
async function cutVideoSinglePass(
  inputPath: string,
  segments: CutSegment[],
  options: FFmpegOptions
): Promise<FFmpegResult> {
  console.log('🎯 Using single-pass filter_complex method...')
  
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ffmpeg-single-'))
  const outputPath = path.join(tempDir, `output.${options.outputFormat}`)
  
  try {
    // Build filter_complex graph for trim + concat + optional subtitles
    const filterGraph = buildFilterComplexGraph(segments, options)
    
    // Build FFmpeg command
    const ffmpegPath = getFFmpegPath()
    const args = [
      '-i', inputPath,
      '-filter_complex', filterGraph,
      '-map', '[output]',
      ...getEncodingArgs(options),
      '-avoid_negative_ts', 'make_zero',
      '-fflags', '+genpts',
      '-y', // Overwrite output
      outputPath
    ]
    
    // Add subtitle file mapping if external subtitles
    if (options.subtitles?.enabled && !options.subtitles.burnIn) {
      const srtPath = await createSubtitleFile(segments, tempDir)
      args.splice(-2, 0, '-i', srtPath, '-map', '1:s')
    }
    
    console.log('🔧 FFmpeg command:', ffmpegPath, args.join(' '))
    
    // Execute FFmpeg
    await runFFmpegCommand(ffmpegPath, args)
    
    // Read output file
    const outputBuffer = await fs.readFile(outputPath)
    const stats = await getVideoStats(outputPath)
    
    // Cleanup
    await fs.rm(tempDir, { recursive: true, force: true })
    
    return {
      success: true,
      outputBuffer: outputBuffer.buffer.slice(outputBuffer.byteOffset, outputBuffer.byteOffset + outputBuffer.byteLength),
      duration_ms: segments.reduce((sum, seg) => sum + (seg.end_ms - seg.start_ms), 0),
      fileSize: outputBuffer.length,
      processingTime_ms: 0, // Will be set by caller
      method: 'single-pass',
      reencoded: true,
      stats
    }
    
  } catch (error) {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {})
    throw error
  }
}

/**
 * Extract + concat method using temp files and -c copy
 */
async function cutVideoExtractConcat(
  inputPath: string,
  segments: CutSegment[],
  options: FFmpegOptions
): Promise<FFmpegResult> {
  console.log('🎯 Using extract + concat method with stream copy...')
  
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ffmpeg-extract-'))
  
  try {
    const ffmpegPath = getFFmpegPath()
    const segmentPaths: string[] = []
    
    // Step 1: Extract each segment to temporary files
    console.log('📂 Extracting segments to temporary files...')
    
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]
      const segmentPath = path.join(tempDir, `segment_${i.toString().padStart(3, '0')}.${options.outputFormat}`)
      
      const startSec = segment.start_ms / 1000
      const duration = (segment.end_ms - segment.start_ms) / 1000
      
      const extractArgs = [
        '-i', inputPath,
        '-ss', startSec.toString(),
        '-t', duration.toString(),
        '-c', 'copy', // Stream copy - no re-encoding
        '-avoid_negative_ts', 'make_zero',
        '-y',
        segmentPath
      ]
      
      console.log(`  Extracting segment ${i + 1}/${segments.length}: ${startSec.toFixed(3)}s + ${duration.toFixed(3)}s`)
      await runFFmpegCommand(ffmpegPath, extractArgs)
      
      segmentPaths.push(segmentPath)
    }
    
    // Step 2: Create concat file list
    const concatListPath = path.join(tempDir, 'concat_list.txt')
    const concatContent = segmentPaths.map(p => `file '${p}'`).join('\n')
    await fs.writeFile(concatListPath, concatContent)
    
    // Step 3: Concatenate segments
    console.log('🔗 Concatenating segments...')
    const outputPath = path.join(tempDir, `output.${options.outputFormat}`)
    
    const concatArgs = [
      '-f', 'concat',
      '-safe', '0',
      '-i', concatListPath,
      '-c', 'copy', // Stream copy - no re-encoding
      '-y',
      outputPath
    ]
    
    await runFFmpegCommand(ffmpegPath, concatArgs)
    
    // Read output file
    const outputBuffer = await fs.readFile(outputPath)
    const stats = await getVideoStats(outputPath)
    
    // Cleanup
    await fs.rm(tempDir, { recursive: true, force: true })
    
    return {
      success: true,
      outputBuffer: outputBuffer.buffer.slice(outputBuffer.byteOffset, outputBuffer.byteOffset + outputBuffer.byteLength),
      duration_ms: segments.reduce((sum, seg) => sum + (seg.end_ms - seg.start_ms), 0),
      fileSize: outputBuffer.length,
      processingTime_ms: 0, // Will be set by caller
      method: 'extract-concat',
      reencoded: false, // Stream copy preserves original encoding
      stats
    }
    
  } catch (error) {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {})
    throw error
  }
}

/**
 * Build filter_complex graph for trim + concat + optional effects
 */
function buildFilterComplexGraph(segments: CutSegment[], options: FFmpegOptions): string {
  const filters: string[] = []
  const inputLabels: string[] = []
  
  // Create trim filters for each segment
  segments.forEach((segment, index) => {
    const startSec = segment.start_ms / 1000
    const endSec = segment.end_ms / 1000
    const label = `seg${index}`
    
    // Trim video and audio
    filters.push(`[0:v]trim=start=${startSec}:end=${endSec},setpts=PTS-STARTPTS[${label}v]`)
    filters.push(`[0:a]atrim=start=${startSec}:end=${endSec},asetpts=PTS-STARTPTS[${label}a]`)
    
    inputLabels.push(`[${label}v]`, `[${label}a]`)
  })
  
  // Concatenate all segments
  const concatFilter = `${inputLabels.join('')}concat=n=${segments.length}:v=1:a=1[concatv][concata]`
  filters.push(concatFilter)
  
  // Apply additional video filters if specified
  let videoOutput = '[concatv]'
  let audioOutput = '[concata]'
  
  if (options.filters && options.filters.length > 0) {
    options.filters.forEach((filter, index) => {
      const inputLabel = index === 0 ? videoOutput : `[filtered${index - 1}]`
      const outputLabel = `[filtered${index}]`
      filters.push(`${inputLabel}${filter}${outputLabel}`)
      videoOutput = outputLabel
    })
  }
  
  // Add subtitle burn-in if enabled
  if (options.subtitles?.enabled && options.subtitles.burnIn) {
    const subtitleFilter = buildSubtitleFilter(segments, options.subtitles.style)
    const subtitleLabel = '[subtitled]'
    filters.push(`${videoOutput}${subtitleFilter}${subtitleLabel}`)
    videoOutput = subtitleLabel
  }
  
  // Final output mapping
  filters.push(`${videoOutput}${audioOutput}concat=n=1:v=1:a=1[output]`)
  
  return filters.join(';')
}

/**
 * Build subtitle filter for burn-in
 */
function buildSubtitleFilter(segments: CutSegment[], style?: SubtitleStyle): string {
  const subtitleStyle = { ...DEFAULT_SUBTITLE_STYLE, ...style }
  
  // Create subtitle text filters for each segment
  const subtitleFilters: string[] = []
  let cumulativeTime = 0
  
  segments.forEach((segment, index) => {
    if (segment.text) {
      const startTime = cumulativeTime / 1000
      const endTime = (cumulativeTime + (segment.end_ms - segment.start_ms)) / 1000
      
      const drawtext = `drawtext=text='${escapeSubtitleText(segment.text)}':` +
        `fontfile='${subtitleStyle.fontFamily}':` +
        `fontsize=${subtitleStyle.fontSize}:` +
        `fontcolor=${subtitleStyle.fontColor}:` +
        `bordercolor=${subtitleStyle.borderColor}:` +
        `borderw=${subtitleStyle.borderWidth}:` +
        `shadowcolor=${subtitleStyle.shadowColor}:` +
        `shadowx=${subtitleStyle.shadowOffset.x}:` +
        `shadowy=${subtitleStyle.shadowOffset.y}:` +
        `x=(w-text_w)/2:` + // Center horizontally
        `y=h-text_h-${subtitleStyle.marginV}:` + // Position from bottom
        `enable='between(t,${startTime},${endTime})'`
      
      subtitleFilters.push(drawtext)
      cumulativeTime += (segment.end_ms - segment.start_ms)
    }
  })
  
  return subtitleFilters.length > 0 ? ',' + subtitleFilters.join(',') : ''
}

/**
 * Get encoding arguments based on options
 */
function getEncodingArgs(options: FFmpegOptions): string[] {
  const args: string[] = []
  
  // Video codec
  if (options.videoCodec === 'copy') {
    args.push('-c:v', 'copy')
  } else {
    args.push('-c:v', options.videoCodec)
    
    // Quality settings for video
    switch (options.quality) {
      case 'low':
        args.push('-crf', '28', '-preset', 'fast')
        break
      case 'medium':
        args.push('-crf', '23', '-preset', 'medium')
        break
      case 'high':
        args.push('-crf', '18', '-preset', 'slow')
        break
      case 'lossless':
        args.push('-crf', '0', '-preset', 'veryslow')
        break
    }
  }
  
  // Audio codec
  if (options.audioCodec === 'copy') {
    args.push('-c:a', 'copy')
  } else {
    args.push('-c:a', options.audioCodec)
    
    // Audio bitrate based on quality
    switch (options.quality) {
      case 'low':
        args.push('-b:a', '96k')
        break
      case 'medium':
        args.push('-b:a', '128k')
        break
      case 'high':
      case 'lossless':
        args.push('-b:a', '192k')
        break
    }
  }
  
  // Format-specific options
  if (options.outputFormat === 'mp4') {
    args.push('-movflags', '+faststart') // Web-optimized MP4
  }
  
  return args
}

/**
 * Create external subtitle file
 */
async function createSubtitleFile(segments: CutSegment[], tempDir: string): Promise<string> {
  const srtPath = path.join(tempDir, 'subtitles.srt')
  let srtContent = ''
  let cumulativeTime = 0
  
  segments.forEach((segment, index) => {
    if (segment.text) {
      const startTime = formatSRTTime(cumulativeTime)
      const endTime = formatSRTTime(cumulativeTime + (segment.end_ms - segment.start_ms))
      
      srtContent += `${index + 1}\n`
      srtContent += `${startTime} --> ${endTime}\n`
      srtContent += `${segment.text}\n\n`
    }
    
    cumulativeTime += (segment.end_ms - segment.start_ms)
  })
  
  await fs.writeFile(srtPath, srtContent)
  return srtPath
}

/**
 * Format time for SRT subtitles
 */
function formatSRTTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const milliseconds = ms % 1000
  const seconds = totalSeconds % 60
  const minutes = Math.floor(totalSeconds / 60) % 60
  const hours = Math.floor(totalSeconds / 3600)
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`
}

/**
 * Escape text for subtitle filters
 */
function escapeSubtitleText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/:/g, '\\:')
    .replace(/\n/g, '\\n')
}

/**
 * Run FFmpeg command with promise wrapper
 */
function runFFmpegCommand(ffmpegPath: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const process = spawn(ffmpegPath, args, {
      stdio: ['pipe', 'pipe', 'pipe']
    })
    
    let stderr = ''
    
    process.stderr.on('data', (data) => {
      stderr += data.toString()
    })
    
    process.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`))
      }
    })
    
    process.on('error', (error) => {
      reject(new Error(`FFmpeg process error: ${error.message}`))
    })
  })
}

/**
 * Get video statistics from file
 */
async function getVideoStats(filePath: string): Promise<FFmpegResult['stats']> {
  try {
    const ffmpegPath = getFFmpegPath()
    const args = [
      '-i', filePath,
      '-f', 'null',
      '-'
    ]
    
    // This is a simplified version - in practice you'd parse ffmpeg output for detailed stats
    const stats = await fs.stat(filePath)
    
    return {
      originalSize: 0, // Would need input file stats
      compressionRatio: 1,
      videoCodec: 'unknown',
      audioCodec: 'unknown',
      resolution: 'unknown',
      bitrate: 0
    }
  } catch {
    return undefined
  }
}

/**
 * Convenience function for cutting with KeepSegments
 */
export async function cutVideoFromKeepSegments(
  inputPath: string,
  keepSegments: KeepSegment[],
  options: Partial<FFmpegOptions> = {}
): Promise<FFmpegResult> {
  const segments: CutSegment[] = keepSegments.map(seg => ({
    start_ms: seg.start_ms,
    end_ms: seg.end_ms,
    text: seg.transcript,
    index: seg.originalSegmentIndex
  }))
  
  return cutVideo(inputPath, segments, options)
}

/**
 * Quick cut with default settings
 */
export async function quickCut(
  inputPath: string,
  segments: CutSegment[],
  outputFormat: 'mp4' | 'webm' = 'mp4'
): Promise<FFmpegResult> {
  return cutVideo(inputPath, segments, {
    outputFormat,
    quality: 'medium',
    videoCodec: 'x264',
    audioCodec: 'aac'
  })
}

/**
 * High-quality cut with subtitle burn-in
 */
export async function cutWithSubtitles(
  inputPath: string,
  segments: CutSegment[],
  subtitleStyle?: Partial<SubtitleStyle>
): Promise<FFmpegResult> {
  return cutVideo(inputPath, segments, {
    outputFormat: 'mp4',
    quality: 'high',
    videoCodec: 'x264',
    audioCodec: 'aac',
    subtitles: {
      enabled: true,
      burnIn: true,
      style: { ...DEFAULT_SUBTITLE_STYLE, ...subtitleStyle }
    }
  })
}

/**
 * Fast cut using stream copy (no re-encoding)
 */
export async function fastCut(
  inputPath: string,
  segments: CutSegment[]
): Promise<FFmpegResult> {
  return cutVideo(inputPath, segments, {
    outputFormat: 'mp4',
    videoCodec: 'copy',
    audioCodec: 'copy'
  })
}

/**
 * Validate FFmpeg availability
 */
export async function validateFFmpeg(): Promise<{ available: boolean; version?: string; path?: string }> {
  try {
    const ffmpegPath = getFFmpegPath()
    
    return new Promise((resolve) => {
      const process = spawn(ffmpegPath, ['-version'], { stdio: 'pipe' })
      
      let stdout = ''
      process.stdout.on('data', (data) => {
        stdout += data.toString()
      })
      
      process.on('close', (code) => {
        if (code === 0) {
          const versionMatch = stdout.match(/ffmpeg version (\S+)/)
          resolve({
            available: true,
            version: versionMatch ? versionMatch[1] : 'unknown',
            path: ffmpegPath
          })
        } else {
          resolve({ available: false })
        }
      })
      
      process.on('error', () => {
        resolve({ available: false })
      })
    })
  } catch {
    return { available: false }
  }
}
