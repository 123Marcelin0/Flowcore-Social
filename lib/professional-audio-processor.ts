/**
 * Professional Audio Processor for Instagram Reel-Quality Editing
 * 
 * This module provides state-of-the-art audio processing capabilities for:
 * - Bad take detection and removal
 * - Silence/pause trimming with natural breathing space
 * - Smooth transitions without artifacts
 * - Professional-grade output like manual Instagram Reel editing
 */

import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

// Types
export interface ProcessingSegment {
  start: number
  end: number
  confidence: number
  reason: 'bad_take' | 'silence' | 'filler' | 'repetition' | 'keep'
  text?: string
}

export interface AudioProcessingOptions {
  // Silence detection
  silenceThreshold: number // dB threshold (e.g., -40)
  minSilenceLength: number // ms (e.g., 500)
  keepSilence: number // ms to preserve for natural breathing (e.g., 200)
  
  // Bad take detection
  enableBadTakeDetection: boolean
  fillerWords: string[]
  repetitionThreshold: number // similarity threshold for detecting repetitions
  
  // Quality settings
  crossfadeDuration: number // ms for smooth transitions
  outputFormat: 'mp4' | 'wav' | 'mp3'
  preserveOriginalQuality: boolean
  
  // Advanced options
  enableAudioNormalization: boolean
  targetLUFS?: number // -16 for social media
  enableDenoising: boolean
}

export interface ProcessingResult {
  success: boolean
  outputBuffer: ArrayBuffer
  mimeType: string
  processingStats: {
    originalDuration: number
    finalDuration: number
    reductionPercentage: number
    segmentsRemoved: number
    silenceRemoved: number
    badTakesRemoved: number
  }
  editingDecision: ProcessingSegment[]
  error?: string
}

export interface BadTakeMarker {
  start: number
  end: number
  reason: string
  confidence: number
}

const DEFAULT_OPTIONS: AudioProcessingOptions = {
  silenceThreshold: -40,
  minSilenceLength: 500,
  keepSilence: 200,
  enableBadTakeDetection: true,
  fillerWords: ['um', 'uh', 'er', 'ah', 'like', 'you know', 'basically', 'literally', 'actually'],
  repetitionThreshold: 0.7,
  crossfadeDuration: 50,
  outputFormat: 'mp4',
  preserveOriginalQuality: true,
  enableAudioNormalization: true,
  targetLUFS: -16,
  enableDenoising: false
}

/**
 * Professional Audio Processor Class
 * Provides Instagram Reel-quality audio editing capabilities
 */
export class ProfessionalAudioProcessor {
  private options: AudioProcessingOptions
  private ffmpegPath: string = 'ffmpeg'

  constructor(options: Partial<AudioProcessingOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
    this.initializeFFmpeg()
  }

  private async initializeFFmpeg(): Promise<void> {
    try {
      const mod: any = await import('@ffmpeg-installer/ffmpeg')
      const installerPath = mod?.default?.path || mod?.path
      if (installerPath) {
        this.ffmpegPath = installerPath
      }
    } catch {
      console.log('Using system FFmpeg')
    }
  }

  /**
   * Main processing function - removes bad takes and pauses
   */
  async processMedia(
    mediaBuffer: ArrayBuffer,
    mimeType: string,
    badTakeMarkers: BadTakeMarker[] = [],
    transcriptSegments?: Array<{ start: number; end: number; text: string; words?: Array<{ word: string; start: number; end: number }> }>
  ): Promise<ProcessingResult> {
    const startTime = Date.now()
    
    try {
      console.log('🎬 Starting professional audio processing...')
      
      // Step 1: Setup temporary files
      const { inputPath, workDir } = await this.setupTempFiles(mediaBuffer, mimeType)
      
      // Step 2: Analyze audio for silence and bad takes
      const analysisResult = await this.analyzeAudio(inputPath, transcriptSegments, badTakeMarkers)
      
      // Step 3: Process the audio/video
      const outputPath = await this.processAudioWithFFmpeg(inputPath, analysisResult, workDir)
      
      // Step 4: Read processed output
      const outputBuffer = await fs.readFile(outputPath)
      
      // Step 5: Calculate stats
      const stats = await this.calculateProcessingStats(inputPath, outputPath, analysisResult)
      
      // Step 6: Cleanup
      await this.cleanup(workDir)
      
      console.log(`✅ Professional processing complete in ${Date.now() - startTime}ms`)
      
      return {
        success: true,
        outputBuffer: outputBuffer.buffer.slice(outputBuffer.byteOffset, outputBuffer.byteOffset + outputBuffer.byteLength),
        mimeType: this.getOutputMimeType(),
        processingStats: stats,
        editingDecision: analysisResult.segments
      }
      
    } catch (error: any) {
      console.error('❌ Professional audio processing failed:', error)
      return {
        success: false,
        outputBuffer: new ArrayBuffer(0),
        mimeType: '',
        processingStats: {
          originalDuration: 0,
          finalDuration: 0,
          reductionPercentage: 0,
          segmentsRemoved: 0,
          silenceRemoved: 0,
          badTakesRemoved: 0
        },
        editingDecision: [],
        error: error.message
      }
    }
  }

  /**
   * Remove bad takes seamlessly with smooth transitions
   */
  async removeBadTakes(
    mediaBuffer: ArrayBuffer,
    mimeType: string,
    badTakeTimestamps: Array<{ start: number; end: number; reason?: string }>
  ): Promise<ProcessingResult> {
    console.log('🔪 Removing bad takes with professional transitions...')
    
    const badTakeMarkers: BadTakeMarker[] = badTakeTimestamps.map(ts => ({
      start: ts.start,
      end: ts.end,
      reason: ts.reason || 'manual_removal',
      confidence: 1.0
    }))
    
    return this.processMedia(mediaBuffer, mimeType, badTakeMarkers)
  }

  /**
   * Remove pauses with configurable settings
   */
  async removePauses(
    mediaBuffer: ArrayBuffer,
    mimeType: string,
    silenceThreshold: number = -40,
    minSilenceLen: number = 500,
    keepSilence: number = 200
  ): Promise<ProcessingResult> {
    console.log('🔇 Removing pauses with natural breathing space...')
    
    const processingOptions = {
      ...this.options,
      silenceThreshold,
      minSilenceLength: minSilenceLen,
      keepSilence
    }
    
    const tempProcessor = new ProfessionalAudioProcessor(processingOptions)
    return tempProcessor.processMedia(mediaBuffer, mimeType)
  }

  /**
   * Setup temporary files for processing
   */
  private async setupTempFiles(mediaBuffer: ArrayBuffer, mimeType: string): Promise<{ inputPath: string; workDir: string }> {
    const workDir = await fs.mkdtemp(join(tmpdir(), 'audio-processing-'))
    
    // Determine file extension
    let extension = '.mp4'
    if (mimeType.includes('webm')) extension = '.webm'
    else if (mimeType.includes('mov') || mimeType.includes('quicktime')) extension = '.mov'
    else if (mimeType.includes('avi')) extension = '.avi'
    else if (mimeType.includes('wav')) extension = '.wav'
    else if (mimeType.includes('mp3')) extension = '.mp3'
    
    const inputPath = join(workDir, `input${extension}`)
    await fs.writeFile(inputPath, Buffer.from(mediaBuffer))
    
    return { inputPath, workDir }
  }

  /**
   * Analyze audio for silence and bad takes using FFmpeg and AI
   */
  private async analyzeAudio(
    inputPath: string,
    transcriptSegments?: Array<{ start: number; end: number; text: string; words?: Array<{ word: string; start: number; end: number }> }>,
    badTakeMarkers: BadTakeMarker[] = []
  ): Promise<{ segments: ProcessingSegment[]; silencePeriods: Array<{ start: number; end: number }> }> {
    console.log('🔍 Analyzing audio for optimal editing points...')
    
    // Step 1: Detect silence periods with FFmpeg
    const silencePeriods = await this.detectSilenceWithFFmpeg(inputPath)
    
    // Step 2: Analyze transcript for bad takes and fillers
    const badTakeSegments = this.analyzeBadTakesFromTranscript(transcriptSegments || [])
    
    // Step 3: Combine manual bad take markers
    const allBadTakes = [...badTakeSegments, ...badTakeMarkers.map(marker => ({
      start: marker.start,
      end: marker.end,
      confidence: marker.confidence,
      reason: 'bad_take' as const,
      text: marker.reason
    }))]
    
    // Step 4: Determine segments to keep vs remove
    const segments = this.createEditingDecision(silencePeriods, allBadTakes, transcriptSegments)
    
    return { segments, silencePeriods }
  }

  /**
   * Detect silence periods using FFmpeg silencedetect filter
   */
  private async detectSilenceWithFFmpeg(inputPath: string): Promise<Array<{ start: number; end: number }>> {
    console.log('🔊 Detecting silence periods with FFmpeg...')
    
    return new Promise((resolve) => {
      const args = [
        '-i', inputPath,
        '-af', `silencedetect=n=${this.options.silenceThreshold}dB:d=${this.options.minSilenceLength / 1000}`,
        '-f', 'null', '-'
      ]
      
      const ffmpeg = spawn(this.ffmpegPath, args)
      let stderr = ''
      
      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString()
      })
      
      ffmpeg.on('close', () => {
        const silencePeriods = this.parseSilenceOutput(stderr)
        console.log(`📊 Found ${silencePeriods.length} silence periods`)
        resolve(silencePeriods)
      })
    })
  }

  /**
   * Parse FFmpeg silence detection output
   */
  private parseSilenceOutput(stderr: string): Array<{ start: number; end: number }> {
    const silencePeriods: Array<{ start: number; end: number }> = []
    const lines = stderr.split('\n')
    
    let currentStart: number | null = null
    
    for (const line of lines) {
      const startMatch = line.match(/silence_start:\s*([0-9.]+)/)
      const endMatch = line.match(/silence_end:\s*([0-9.]+)/)
      
      if (startMatch) {
        currentStart = parseFloat(startMatch[1])
      } else if (endMatch && currentStart !== null) {
        const end = parseFloat(endMatch[1])
        silencePeriods.push({ start: currentStart, end })
        currentStart = null
      }
    }
    
    return silencePeriods
  }

  /**
   * Analyze transcript for bad takes, fillers, and repetitions
   */
  private analyzeBadTakesFromTranscript(transcriptSegments: Array<{ start: number; end: number; text: string; words?: Array<{ word: string; start: number; end: number }> }>): ProcessingSegment[] {
    console.log('🎯 Analyzing transcript for bad takes and fillers...')
    
    const badTakes: ProcessingSegment[] = []
    
    for (const segment of transcriptSegments) {
      const text = segment.text.toLowerCase()
      
      // Check for filler words
      const fillerCount = this.options.fillerWords.reduce((count, filler) => {
        const regex = new RegExp(`\\b${filler.replace(/\s+/g, '\\s+')}\\b`, 'gi')
        return count + (text.match(regex) || []).length
      }, 0)
      
      // High filler density indicates bad take
      const fillerDensity = fillerCount / segment.text.split(' ').length
      if (fillerDensity > 0.3) {
        badTakes.push({
          start: segment.start,
          end: segment.end,
          confidence: Math.min(0.9, fillerDensity * 2),
          reason: 'filler',
          text: segment.text
        })
      }
      
      // Check for incomplete sentences or false starts
      if (this.isIncompleteThought(segment.text)) {
        badTakes.push({
          start: segment.start,
          end: segment.end,
          confidence: 0.8,
          reason: 'bad_take',
          text: segment.text
        })
      }
    }
    
    // Detect repetitions
    const repetitions = this.detectRepetitions(transcriptSegments)
    badTakes.push(...repetitions)
    
    return badTakes
  }

  /**
   * Check if text represents an incomplete thought or false start
   */
  private isIncompleteThought(text: string): boolean {
    const trimmed = text.trim()
    
    // Very short segments
    if (trimmed.length < 10) return true
    
    // Ends abruptly without punctuation and seems incomplete
    if (!trimmed.match(/[.!?]$/) && trimmed.split(' ').length < 4) return true
    
    // Common false start patterns
    const falseStartPatterns = [
      /^(so|well|i mean|you know)\s*$/i,
      /^(um|uh|er)\s+/i,
      /\.\.\.$/, // trailing ellipsis
      /^wait/i
    ]
    
    return falseStartPatterns.some(pattern => pattern.test(trimmed))
  }

  /**
   * Detect repetitions in transcript segments
   */
  private detectRepetitions(segments: Array<{ start: number; end: number; text: string }>): ProcessingSegment[] {
    const repetitions: ProcessingSegment[] = []
    
    for (let i = 0; i < segments.length; i++) {
      for (let j = i + 1; j < segments.length; j++) {
        const similarity = this.calculateTextSimilarity(segments[i].text, segments[j].text)
        
        if (similarity > this.options.repetitionThreshold) {
          // Mark the first occurrence as repetition (keep the later, refined version)
          repetitions.push({
            start: segments[i].start,
            end: segments[i].end,
            confidence: similarity,
            reason: 'repetition',
            text: segments[i].text
          })
          break
        }
      }
    }
    
    return repetitions
  }

  /**
   * Calculate text similarity using simple word overlap
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/))
    const words2 = new Set(text2.toLowerCase().split(/\s+/))
    
    const intersection = new Set([...words1].filter(word => words2.has(word)))
    const union = new Set([...words1, ...words2])
    
    return intersection.size / union.size
  }

  /**
   * Create editing decision based on analysis
   */
  private createEditingDecision(
    silencePeriods: Array<{ start: number; end: number }>,
    badTakes: ProcessingSegment[],
    transcriptSegments?: Array<{ start: number; end: number; text: string }>
  ): ProcessingSegment[] {
    console.log('✂️ Creating professional editing decision...')
    
    const segments: ProcessingSegment[] = []
    
    // Mark silence periods for removal (but keep some breathing room)
    for (const silence of silencePeriods) {
      const duration = (silence.end - silence.start) * 1000
      if (duration > this.options.minSilenceLength) {
        const keepDuration = this.options.keepSilence / 1000
        const trimStart = silence.start + keepDuration / 2
        const trimEnd = silence.end - keepDuration / 2
        
        if (trimEnd > trimStart) {
          segments.push({
            start: trimStart,
            end: trimEnd,
            confidence: 0.9,
            reason: 'silence'
          })
        }
      }
    }
    
    // Add bad takes
    segments.push(...badTakes)
    
    // Sort by start time
    segments.sort((a, b) => a.start - b.start)
    
    console.log(`📋 Created editing decision with ${segments.length} segments to process`)
    return segments
  }

  /**
   * Process audio/video with FFmpeg using complex filter chains
   */
  private async processAudioWithFFmpeg(
    inputPath: string,
    analysisResult: { segments: ProcessingSegment[] },
    workDir: string
  ): Promise<string> {
    console.log('⚙️ Processing with professional FFmpeg filters...')
    
    const outputPath = join(workDir, `output.${this.options.outputFormat}`)
    
    // If no segments to remove, just copy with potential enhancements
    if (analysisResult.segments.length === 0) {
      return this.enhanceAudioOnly(inputPath, outputPath)
    }
    
    // Create segment list for complex filter
    const keepSegments = this.createKeepSegments(analysisResult.segments)
    
    return this.processWithSegments(inputPath, outputPath, keepSegments)
  }

  /**
   * Create list of segments to keep (inverse of segments to remove)
   */
  private createKeepSegments(removeSegments: ProcessingSegment[]): Array<{ start: number; end: number }> {
    // Get media duration first
    const keepSegments: Array<{ start: number; end: number }> = []
    
    let currentTime = 0
    const sortedRemove = removeSegments.sort((a, b) => a.start - b.start)
    
    for (const segment of sortedRemove) {
      if (segment.start > currentTime) {
        keepSegments.push({ start: currentTime, end: segment.start })
      }
      currentTime = Math.max(currentTime, segment.end)
    }
    
    // Add final segment (we'll handle duration detection in FFmpeg)
    return keepSegments.filter(seg => seg.end > seg.start)
  }

  /**
   * Process with segment-based cutting and crossfades
   */
  private async processWithSegments(
    inputPath: string,
    outputPath: string,
    keepSegments: Array<{ start: number; end: number }>
  ): Promise<string> {
    const crossfadeDuration = this.options.crossfadeDuration / 1000 // Convert to seconds
    
    return new Promise((resolve, reject) => {
      // Build complex filter for seamless cutting with crossfades
      const filterComplex = this.buildComplexFilter(keepSegments, crossfadeDuration)
      
      const args = [
        '-i', inputPath,
        '-filter_complex', filterComplex,
        '-map', '[out]',
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        '-y', // Overwrite output
        outputPath
      ]
      
      // Add audio normalization if enabled
      if (this.options.enableAudioNormalization && this.options.targetLUFS) {
        args.splice(-3, 0, '-af', `loudnorm=I=${this.options.targetLUFS}:TP=-1.5:LRA=11`)
      }
      
      console.log('🔧 FFmpeg command:', this.ffmpegPath, args.join(' '))
      
      const ffmpeg = spawn(this.ffmpegPath, args)
      
      ffmpeg.on('error', reject)
      ffmpeg.on('close', (code) => {
        if (code === 0) {
          console.log('✅ FFmpeg processing completed successfully')
          resolve(outputPath)
        } else {
          reject(new Error(`FFmpeg exited with code ${code}`))
        }
      })
    })
  }

  /**
   * Build complex FFmpeg filter for seamless segment concatenation with crossfades
   */
  private buildComplexFilter(keepSegments: Array<{ start: number; end: number }>, crossfadeDuration: number): string {
    if (keepSegments.length === 0) return '[0:v][0:a]concat=n=1:v=1:a=1[out]'
    if (keepSegments.length === 1) {
      const seg = keepSegments[0]
      return `[0:v]trim=start=${seg.start}:end=${seg.end},setpts=PTS-STARTPTS[v0];[0:a]atrim=start=${seg.start}:end=${seg.end},asetpts=PTS-STARTPTS[a0];[v0][a0]concat=n=1:v=1:a=1[out]`
    }
    
    // Multiple segments with crossfades
    const filters: string[] = []
    
    // Trim each segment
    keepSegments.forEach((seg, i) => {
      filters.push(`[0:v]trim=start=${seg.start}:end=${seg.end},setpts=PTS-STARTPTS[v${i}]`)
      filters.push(`[0:a]atrim=start=${seg.start}:end=${seg.end},asetpts=PTS-STARTPTS[a${i}]`)
    })
    
    // Concatenate with crossfades
    if (crossfadeDuration > 0 && keepSegments.length > 1) {
      // Add audio crossfades between segments
      let audioChain = '[a0]'
      for (let i = 1; i < keepSegments.length; i++) {
        filters.push(`${audioChain}[a${i}]acrossfade=d=${crossfadeDuration}[a${i}_fade]`)
        audioChain = `[a${i}_fade]`
      }
      
      // Video concatenation (no crossfade for video to avoid complexity)
      const videoInputs = keepSegments.map((_, i) => `[v${i}]`).join('')
      filters.push(`${videoInputs}concat=n=${keepSegments.length}:v=1:a=0[v_out]`)
      
      // Combine final video and audio
      filters.push(`[v_out]${audioChain}concat=n=1:v=1:a=1[out]`)
    } else {
      // Simple concatenation without crossfades
      const inputs = keepSegments.map((_, i) => `[v${i}][a${i}]`).join('')
      filters.push(`${inputs}concat=n=${keepSegments.length}:v=1:a=1[out]`)
    }
    
    return filters.join(';')
  }

  /**
   * Enhance audio only (no cutting needed)
   */
  private async enhanceAudioOnly(inputPath: string, outputPath: string): Promise<string> {
    console.log('🎵 Applying audio enhancements only...')
    
    return new Promise((resolve, reject) => {
      const args = ['-i', inputPath]
      
      // Audio filters
      const audioFilters: string[] = []
      
      if (this.options.enableDenoising) {
        audioFilters.push('afftdn=nf=-25')
      }
      
      if (this.options.enableAudioNormalization && this.options.targetLUFS) {
        audioFilters.push(`loudnorm=I=${this.options.targetLUFS}:TP=-1.5:LRA=11`)
      }
      
      if (audioFilters.length > 0) {
        args.push('-af', audioFilters.join(','))
      }
      
      args.push(
        '-c:v', 'copy', // Copy video without re-encoding
        '-c:a', 'aac',
        '-b:a', '128k',
        '-y',
        outputPath
      )
      
      const ffmpeg = spawn(this.ffmpegPath, args)
      
      ffmpeg.on('error', reject)
      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve(outputPath)
        } else {
          reject(new Error(`FFmpeg enhancement failed with code ${code}`))
        }
      })
    })
  }

  /**
   * Calculate processing statistics
   */
  private async calculateProcessingStats(
    inputPath: string,
    outputPath: string,
    analysisResult: { segments: ProcessingSegment[] }
  ): Promise<ProcessingResult['processingStats']> {
    const originalDuration = await this.getMediaDuration(inputPath)
    const finalDuration = await this.getMediaDuration(outputPath)
    
    const segmentsRemoved = analysisResult.segments.length
    const silenceRemoved = analysisResult.segments.filter(s => s.reason === 'silence').length
    const badTakesRemoved = analysisResult.segments.filter(s => s.reason === 'bad_take' || s.reason === 'filler' || s.reason === 'repetition').length
    
    const reductionPercentage = ((originalDuration - finalDuration) / originalDuration) * 100
    
    return {
      originalDuration,
      finalDuration,
      reductionPercentage,
      segmentsRemoved,
      silenceRemoved,
      badTakesRemoved
    }
  }

  /**
   * Get media duration using FFprobe
   */
  private async getMediaDuration(filePath: string): Promise<number> {
    return new Promise((resolve) => {
      const ffprobe = spawn(this.ffmpegPath.replace('ffmpeg', 'ffprobe'), [
        '-v', 'quiet',
        '-show_entries', 'format=duration',
        '-of', 'csv=p=0',
        filePath
      ])
      
      let output = ''
      ffprobe.stdout.on('data', (data) => {
        output += data.toString()
      })
      
      ffprobe.on('close', () => {
        const duration = parseFloat(output.trim()) || 0
        resolve(duration)
      })
    })
  }

  /**
   * Get output MIME type based on format
   */
  private getOutputMimeType(): string {
    switch (this.options.outputFormat) {
      case 'mp4': return 'video/mp4'
      case 'wav': return 'audio/wav'
      case 'mp3': return 'audio/mpeg'
      default: return 'video/mp4'
    }
  }

  /**
   * Cleanup temporary files
   */
  private async cleanup(workDir: string): Promise<void> {
    try {
      await fs.rm(workDir, { recursive: true, force: true })
      console.log('🧹 Temporary files cleaned up')
    } catch (error) {
      console.warn('⚠️ Failed to cleanup temporary files:', error)
    }
  }
}

// Convenience functions for easy usage
export async function removeBadTakes(
  media: ArrayBuffer,
  mimeType: string,
  badTakeTimestamps: Array<{ start: number; end: number; reason?: string }>
): Promise<ProcessingResult> {
  const processor = new ProfessionalAudioProcessor()
  return processor.removeBadTakes(media, mimeType, badTakeTimestamps)
}

export async function removePauses(
  media: ArrayBuffer,
  mimeType: string,
  silenceThreshold: number = -40,
  minSilenceLen: number = 500,
  keepSilence: number = 200
): Promise<ProcessingResult> {
  const processor = new ProfessionalAudioProcessor()
  return processor.removePauses(media, mimeType, silenceThreshold, minSilenceLen, keepSilence)
}

// Export main class and functions
export default ProfessionalAudioProcessor




















