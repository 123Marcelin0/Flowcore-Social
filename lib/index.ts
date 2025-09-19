import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'
import { supabase, supabaseAdmin } from './supabase'
import { transcribeWithEnhancedTiming } from './transcribe'
import { processAudioSegments } from './segmenter'
import { makeEditingDecision } from './decide'
import { generateSubtitlesFromScript, formatSRTTime } from './subtitle-utils'
import { cutVideoFromKeepSegments } from './ffmpeg'
import { 
  DecisionInput, 
  DecisionOutput, 
  KeepSegment, 
  DEFAULT_DECISION_POLICY,
  Transcript,
  Segment 
} from './types'

/**
 * Complete Speaker-to-Camera Video Processing Pipeline
 * Integrates all components: transcription → pause analysis → LLM decisions → file output → FFmpeg cutting
 */

export interface PipelineInput {
  videoPath: string
  uploadId?: string
  scriptText?: string
  outputDir?: string
  options?: PipelineOptions
}

export interface PipelineOptions {
  // Transcription options
  useEnhancedTiming: boolean
  forceRetranscribe: boolean
  
  // Segmentation options
  useAdvancedSegmentation: boolean
  pauseConfig?: {
    strongPunctuationThreshold: number
    longPauseTrimThreshold: number
    trimmedPauseLength: number
    leadInPadding: number
    minimumSegmentLength: number
  }
  
  // Decision options
  llmModel: string
  useScript: boolean
  removeFiller: boolean
  enableDeduplication: boolean
  customInstructions?: string
  
  // Output options
  generateFiles: boolean
  outputQuality: 'low' | 'medium' | 'high'
  addSubtitles: boolean
  burnInSubtitles: boolean
  
  // Debug options
  saveIntermediateFiles: boolean
  verbose: boolean
}

export interface PipelineResult {
  success: boolean
  outputVideoPath?: string
  outputVideoBuffer?: ArrayBuffer
  files?: {
    decisionPath?: string
    edlPath?: string
    srtPath?: string
  }
  stats: PipelineStats
  processingTime_ms: number
  error?: string
}

export interface PipelineStats {
  // Input metrics
  originalDuration_ms: number
  originalSegments: number
  originalFileSize: number
  
  // Transcription metrics
  transcriptionConfidence: number
  wordCount: number
  segmentCount: number
  enhancedTiming: boolean
  
  // Pause analysis
  pausesDetected: number
  pausesTrimmed: number
  pauseTimeReduced_ms: number
  
  // LLM decision metrics
  reductionPercentage: number
  segmentsKept: number
  segmentsRemoved: number
  fillerWordsRemoved: number
  duplicatesRemoved: number
  averageConfidence: number
  
  // Cutting metrics
  ffmpegMethod: 'single-pass' | 'extract-concat'
  reencoded: boolean
  finalDuration_ms: number
  finalFileSize: number
  compressionRatio: number
  
  // Performance metrics
  transcriptionTime_ms: number
  segmentationTime_ms: number
  llmDecisionTime_ms: number
  ffmpegTime_ms: number
  totalProcessingTime_ms: number
}

const DEFAULT_PIPELINE_OPTIONS: PipelineOptions = {
  useEnhancedTiming: true,
  forceRetranscribe: false,
  useAdvancedSegmentation: true,
  llmModel: 'gpt-4o',
  useScript: true,
  removeFiller: true,
  enableDeduplication: true,
  generateFiles: true,
  outputQuality: 'medium',
  addSubtitles: true,
  burnInSubtitles: true,
  saveIntermediateFiles: false,
  verbose: true
}

/**
 * Main Speaker-to-Camera Pipeline Function
 * Complete end-to-end processing with all integrated components
 */
export async function updateSpeakerToCameraPipeline(input: PipelineInput): Promise<PipelineResult> {
  const startTime = Date.now()
  const options = { ...DEFAULT_PIPELINE_OPTIONS, ...input.options }
  const outputDir = input.outputDir || await fs.mkdtemp(path.join(os.tmpdir(), 'speaker-pipeline-'))
  
  console.log('🎬 Starting Complete Speaker-to-Camera Pipeline...')
  console.log(`📁 Input: ${input.videoPath}`)
  console.log(`📁 Output: ${outputDir}`)
  console.log(`⚙️ Options: ${JSON.stringify(options, null, 2)}`)
  
  let stats: Partial<PipelineStats> = {
    originalFileSize: 0,
    transcriptionTime_ms: 0,
    segmentationTime_ms: 0,
    llmDecisionTime_ms: 0,
    ffmpegTime_ms: 0
  }
  
  try {
    // Step 1: Validate input and get file stats
    console.log('\n📊 Step 1: Input validation and analysis...')
    const inputStats = await fs.stat(input.videoPath)
    stats.originalFileSize = inputStats.size
    
    console.log(`✅ Input file: ${(stats.originalFileSize / 1024 / 1024).toFixed(1)}MB`)
    
    // Step 2: Transcribe the video with enhanced timing
    console.log('\n🎤 Step 2: Transcribing with enhanced timing...')
    const transcriptionStart = Date.now()
    
    let transcript: Transcript
    
    if (input.uploadId && !options.forceRetranscribe) {
      // Try to get existing transcription from database
      const db = supabaseAdmin || supabase
      const { data: media, error } = await db
        .from('media_files')
        .select('metadata')
        .eq('id', input.uploadId)
        .single()
      
      if (!error && media?.metadata?.asr) {
        console.log('📋 Found existing transcription in database')
        const asr = media.metadata.asr
        transcript = {
          text: asr.text || '',
          segments: asr.segments || [],
          language: asr.language || 'en',
          duration: asr.duration || 0
        }
      } else {
        console.log('🔄 No existing transcription found, creating new one...')
        transcript = await transcribeWithEnhancedTiming(input.videoPath, input.uploadId)
      }
    } else {
      transcript = await transcribeWithEnhancedTiming(input.videoPath, input.uploadId)
    }
    
    stats.transcriptionTime_ms = Date.now() - transcriptionStart
    stats.originalDuration_ms = (transcript.duration || 0) * 1000
    stats.originalSegments = transcript.segments.length
    stats.wordCount = transcript.segments.reduce((sum, seg) => sum + (seg.words?.length || 0), 0)
    stats.segmentCount = transcript.segments.length
    stats.enhancedTiming = true
    stats.transcriptionConfidence = transcript.segments.reduce((sum, seg) => sum + (seg.confidence || 0.8), 0) / transcript.segments.length
    
    console.log(`✅ Transcription completed: ${stats.segmentCount} segments, ${stats.wordCount} words`)
    console.log(`📊 Duration: ${(stats.originalDuration_ms! / 1000).toFixed(1)}s, Confidence: ${(stats.transcriptionConfidence! * 100).toFixed(1)}%`)
    
    // Step 3: Compute pauses and advanced segmentation
    console.log('\n⏸️ Step 3: Computing pauses and advanced segmentation...')
    const segmentationStart = Date.now()
    
    let segmentationResult: any = null
    let processedSegments: KeepSegment[] = []
    
    if (options.useAdvancedSegmentation) {
      console.log('🎯 Using advanced segmentation with pause logic...')
      segmentationResult = await processAudioSegments(
        transcript.segments, 
        input.scriptText, 
        options.pauseConfig
      )
      
      processedSegments = segmentationResult.processedSegments
      
      stats.pausesDetected = segmentationResult.pauseAnalysis.pauses.length
      stats.pausesTrimmed = segmentationResult.stats.totalPausesTrimmed
      stats.pauseTimeReduced_ms = segmentationResult.stats.totalTimeReduced
      
      console.log(`✅ Advanced segmentation: ${processedSegments.length} segments, ${stats.pausesTrimmed} pauses trimmed`)
    } else {
      // Convert transcript segments to KeepSegments for simple processing
      processedSegments = transcript.segments.map((segment, index) => ({
        start_ms: Math.round(segment.start * 1000),
        end_ms: Math.round(segment.end * 1000),
        transcript: segment.text,
        confidence: segment.confidence || 0.8,
        reason: 'fallback_keep' as const,
        reasonDetails: 'Basic segmentation without pause analysis',
        originalSegmentIndex: index
      }))
      
      stats.pausesDetected = 0
      stats.pausesTrimmed = 0
      stats.pauseTimeReduced_ms = 0
    }
    
    stats.segmentationTime_ms = Date.now() - segmentationStart
    
    // Step 4: Call LLM for intelligent editing decisions
    console.log('\n🤖 Step 4: LLM-based editing decisions...')
    const llmStart = Date.now()
    
    const decisionInput: DecisionInput = {
      transcript,
      scriptText: options.useScript ? input.scriptText : undefined,
      policy: {
        ...DEFAULT_DECISION_POLICY,
        removeFiller: options.removeFiller,
        enableDeduplication: options.enableDeduplication,
        aiModel: options.llmModel,
        customInstructions: options.customInstructions,
        useAISummary: !input.scriptText
      },
      metadata: {
        videoId: input.uploadId || 'pipeline-process',
        originalDuration_ms: stats.originalDuration_ms!,
        language: transcript.language,
        speakerInfo: {
          name: 'Speaker',
          role: 'Presenter'
        }
      }
    }
    
    const decision: DecisionOutput = await makeEditingDecision(decisionInput, options.llmModel)
    
    stats.llmDecisionTime_ms = Date.now() - llmStart
    stats.reductionPercentage = decision.stats.reductionPercentage
    stats.segmentsKept = decision.stats.segmentsKept
    stats.segmentsRemoved = decision.stats.segmentsRemoved
    stats.fillerWordsRemoved = decision.stats.fillerWordsRemoved
    stats.duplicatesRemoved = decision.stats.duplicatesRemoved
    stats.averageConfidence = decision.stats.averageConfidence
    
    console.log(`✅ LLM decisions: ${stats.segmentsKept}/${stats.originalSegments} segments kept`)
    console.log(`📊 Reduction: ${stats.reductionPercentage!.toFixed(1)}%, Filler removed: ${stats.fillerWordsRemoved}, Duplicates: ${stats.duplicatesRemoved}`)
    
    // Step 5: Generate output files (decision.json, edl.csv, subs.srt)
    console.log('\n📝 Step 5: Generating output files...')
    const files: PipelineResult['files'] = {}
    
    if (options.generateFiles) {
      // Write decision.json
      const decisionPath = path.join(outputDir, 'decision.json')
      await fs.writeFile(decisionPath, JSON.stringify({
        decision,
        segmentationResult: options.useAdvancedSegmentation ? segmentationResult : null,
        metadata: {
          pipeline: 'speaker-to-camera-v2',
          timestamp: new Date().toISOString(),
          options,
          stats
        }
      }, null, 2))
      files.decisionPath = decisionPath
      console.log(`📄 Decision file: ${decisionPath}`)
      
      // Write EDL (Edit Decision List) as CSV
      const edlPath = path.join(outputDir, 'edit_decision_list.csv')
      const edlContent = generateEDLCSV(decision.keepSegments)
      await fs.writeFile(edlPath, edlContent)
      files.edlPath = edlPath
      console.log(`📄 EDL file: ${edlPath}`)
      
      // Write subtitles (SRT)
      const srtPath = path.join(outputDir, 'subtitles.srt')
      const videoSegments = decision.keepSegments.map(seg => ({
        start_ms: seg.start_ms,
        end_ms: seg.end_ms,
        keep: true
      }))
      
      const scriptText = decision.keepSegments.map(seg => seg.transcript).join(' ')
      const subtitleSegments = generateSubtitlesFromScript(videoSegments, scriptText)
      
      // Convert to SRT format
      
      const srtContent = subtitleSegments.map((subtitle, index) => {
        const startTime = formatSRTTime(subtitle.start_ms)
        const endTime = formatSRTTime(subtitle.end_ms)
        return `${index + 1}\n${startTime} --> ${endTime}\n${subtitle.text}\n`
      }).join('\n')
      await fs.writeFile(srtPath, srtContent)
      files.srtPath = srtPath
      console.log(`📄 Subtitle file: ${srtPath}`)
      
      console.log(`✅ Generated ${Object.keys(files).length} output files`)
    }
    
    // Step 6: Run FFmpeg cutting with intelligent mode selection
    console.log('\n✂️ Step 6: FFmpeg video cutting...')
    const ffmpegStart = Date.now()
    
    const ffmpegResult = await cutVideoFromKeepSegments(input.videoPath, decision.keepSegments, {
      outputFormat: 'mp4',
      quality: options.outputQuality,
      videoCodec: 'x264',
      audioCodec: 'aac',
      subtitles: {
        enabled: options.addSubtitles,
        burnIn: options.burnInSubtitles
      }
    })
    
    stats.ffmpegTime_ms = Date.now() - ffmpegStart
    stats.ffmpegMethod = ffmpegResult.method
    stats.reencoded = ffmpegResult.reencoded
    stats.finalDuration_ms = ffmpegResult.duration_ms
    stats.finalFileSize = ffmpegResult.fileSize
    stats.compressionRatio = stats.originalFileSize! / stats.finalFileSize!
    
    if (!ffmpegResult.success) {
      throw new Error(`FFmpeg cutting failed: ${ffmpegResult.error}`)
    }
    
    console.log(`✅ FFmpeg completed: ${ffmpegResult.method} method, ${ffmpegResult.reencoded ? 'Re-encoded' : 'Stream copy'}`)
    console.log(`📊 Output: ${(stats.finalFileSize! / 1024 / 1024).toFixed(1)}MB, ${(stats.finalDuration_ms! / 1000).toFixed(1)}s`)
    
    // Step 7: Save final video and log comprehensive stats
    console.log('\n📊 Step 7: Final processing and statistics...')
    
    let outputVideoPath: string | undefined
    if (ffmpegResult.outputBuffer) {
      outputVideoPath = path.join(outputDir, `final_video_${Date.now()}.mp4`)
      await fs.writeFile(outputVideoPath, Buffer.from(ffmpegResult.outputBuffer))
      console.log(`💾 Final video saved: ${outputVideoPath}`)
    }
    
    // Calculate total processing time
    stats.totalProcessingTime_ms = Date.now() - startTime
    
    // Log comprehensive statistics
    logPipelineStats(stats as PipelineStats, options)
    
    console.log(`\n🎉 Pipeline completed successfully in ${(stats.totalProcessingTime_ms / 1000).toFixed(1)}s`)
    
    return {
      success: true,
      outputVideoPath,
      outputVideoBuffer: ffmpegResult.outputBuffer,
      files,
      stats: stats as PipelineStats,
      processingTime_ms: stats.totalProcessingTime_ms
    }
    
  } catch (error: any) {
    console.error('❌ Pipeline failed:', error)
    
    // Cleanup on error
    if (!options.saveIntermediateFiles) {
      await fs.rm(outputDir, { recursive: true, force: true }).catch(() => {})
    }
    
    return {
      success: false,
      stats: {
        ...stats,
        totalProcessingTime_ms: Date.now() - startTime
      } as PipelineStats,
      processingTime_ms: Date.now() - startTime,
      error: error.message
    }
  }
}

/**
 * Generate EDL as CSV format
 */
function generateEDLCSV(keepSegments: KeepSegment[]): string {
  const headers = [
    'Edit_Number',
    'Source_In_MS',
    'Source_Out_MS',
    'Duration_MS',
    'Source_In_Timecode',
    'Source_Out_Timecode',
    'Timeline_In_MS',
    'Timeline_Out_MS',
    'Transcript',
    'Reason',
    'Confidence',
    'Reason_Details'
  ]
  
  const rows = [headers.join(',')]
  let timelinePosition = 0
  
  keepSegments.forEach((segment, index) => {
    const duration = segment.end_ms - segment.start_ms
    const timelineIn = timelinePosition
    const timelineOut = timelinePosition + duration
    
    const row = [
      (index + 1).toString(),
      segment.start_ms.toString(),
      segment.end_ms.toString(),
      duration.toString(),
      formatTimecode(segment.start_ms),
      formatTimecode(segment.end_ms),
      timelineIn.toString(),
      timelineOut.toString(),
      `"${segment.transcript.replace(/"/g, '""')}"`, // Escape quotes for CSV
      segment.reason,
      segment.confidence.toFixed(3),
      `"${(segment.reasonDetails || '').replace(/"/g, '""')}"`
    ]
    
    rows.push(row.join(','))
    timelinePosition += duration
  })
  
  return rows.join('\n')
}

/**
 * Format milliseconds to timecode
 */
function formatTimecode(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const milliseconds = ms % 1000
  const seconds = totalSeconds % 60
  const minutes = Math.floor(totalSeconds / 60) % 60
  const hours = Math.floor(totalSeconds / 3600)
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`
}

/**
 * Log comprehensive pipeline statistics
 */
function logPipelineStats(stats: PipelineStats, options: PipelineOptions): void {
  console.log('\n📊 COMPREHENSIVE PIPELINE STATISTICS')
  console.log('=' .repeat(60))
  
  // Input metrics
  console.log('\n📁 INPUT METRICS:')
  console.log(`  Original duration: ${(stats.originalDuration_ms / 1000).toFixed(1)}s`)
  console.log(`  Original segments: ${stats.originalSegments}`)
  console.log(`  Original file size: ${(stats.originalFileSize / 1024 / 1024).toFixed(1)}MB`)
  console.log(`  Word count: ${stats.wordCount}`)
  
  // Transcription metrics
  console.log('\n🎤 TRANSCRIPTION METRICS:')
  console.log(`  Enhanced timing: ${stats.enhancedTiming ? '✅' : '❌'}`)
  console.log(`  Transcription confidence: ${(stats.transcriptionConfidence * 100).toFixed(1)}%`)
  console.log(`  Processing time: ${(stats.transcriptionTime_ms / 1000).toFixed(1)}s`)
  
  // Pause analysis metrics
  console.log('\n⏸️ PAUSE ANALYSIS:')
  console.log(`  Pauses detected: ${stats.pausesDetected}`)
  console.log(`  Pauses trimmed: ${stats.pausesTrimmed}`)
  console.log(`  Time saved from pauses: ${(stats.pauseTimeReduced_ms / 1000).toFixed(1)}s`)
  
  // LLM decision metrics
  console.log('\n🤖 LLM DECISION METRICS:')
  console.log(`  Reduction percentage: ${stats.reductionPercentage.toFixed(1)}%`)
  console.log(`  Segments kept: ${stats.segmentsKept}/${stats.originalSegments} (${((stats.segmentsKept / stats.originalSegments) * 100).toFixed(1)}%)`)
  console.log(`  Segments removed: ${stats.segmentsRemoved}`)
  console.log(`  Filler words removed: ${stats.fillerWordsRemoved}`)
  console.log(`  Duplicates removed: ${stats.duplicatesRemoved}`)
  console.log(`  Average confidence: ${(stats.averageConfidence * 100).toFixed(1)}%`)
  console.log(`  LLM processing time: ${(stats.llmDecisionTime_ms / 1000).toFixed(1)}s`)
  
  // FFmpeg cutting metrics
  console.log('\n✂️ FFMPEG CUTTING METRICS:')
  console.log(`  Method used: ${stats.ffmpegMethod}`)
  console.log(`  Re-encoded: ${stats.reencoded ? 'Yes' : 'No (stream copy)'}`)
  console.log(`  Final duration: ${(stats.finalDuration_ms / 1000).toFixed(1)}s`)
  console.log(`  Final file size: ${(stats.finalFileSize / 1024 / 1024).toFixed(1)}MB`)
  console.log(`  Compression ratio: ${stats.compressionRatio.toFixed(2)}x`)
  console.log(`  FFmpeg processing time: ${(stats.ffmpegTime_ms / 1000).toFixed(1)}s`)
  
  // Performance breakdown
  console.log('\n⏱️ PERFORMANCE BREAKDOWN:')
  console.log(`  Transcription: ${(stats.transcriptionTime_ms / 1000).toFixed(1)}s (${((stats.transcriptionTime_ms / stats.totalProcessingTime_ms) * 100).toFixed(1)}%)`)
  console.log(`  Segmentation: ${(stats.segmentationTime_ms / 1000).toFixed(1)}s (${((stats.segmentationTime_ms / stats.totalProcessingTime_ms) * 100).toFixed(1)}%)`)
  console.log(`  LLM decisions: ${(stats.llmDecisionTime_ms / 1000).toFixed(1)}s (${((stats.llmDecisionTime_ms / stats.totalProcessingTime_ms) * 100).toFixed(1)}%)`)
  console.log(`  FFmpeg cutting: ${(stats.ffmpegTime_ms / 1000).toFixed(1)}s (${((stats.ffmpegTime_ms / stats.totalProcessingTime_ms) * 100).toFixed(1)}%)`)
  console.log(`  Total processing: ${(stats.totalProcessingTime_ms / 1000).toFixed(1)}s`)
  
  // Summary
  console.log('\n🎯 SUMMARY:')
  console.log(`  Time reduction: ${(stats.originalDuration_ms - stats.finalDuration_ms) / 1000}s (${stats.reductionPercentage.toFixed(1)}%)`)
  console.log(`  File size change: ${((stats.finalFileSize - stats.originalFileSize) / stats.originalFileSize * 100).toFixed(1)}%`)
  console.log(`  Processing efficiency: ${(stats.originalDuration_ms / stats.totalProcessingTime_ms).toFixed(1)}x real-time`)
  console.log(`  Quality improvement: Filler removed, pauses optimized, ${options.addSubtitles ? 'subtitles added' : 'no subtitles'}`)
  
  console.log('=' .repeat(60))
}

/**
 * Convenience function for quick processing with default options
 */
export async function processVideoQuick(
  videoPath: string,
  scriptText?: string,
  outputDir?: string
): Promise<PipelineResult> {
  return updateSpeakerToCameraPipeline({
    videoPath,
    scriptText,
    outputDir,
    options: {
      ...DEFAULT_PIPELINE_OPTIONS,
      outputQuality: 'medium',
      verbose: false
    }
  })
}

/**
 * High-quality processing with all features enabled
 */
export async function processVideoHighQuality(
  videoPath: string,
  scriptText?: string,
  outputDir?: string
): Promise<PipelineResult> {
  return updateSpeakerToCameraPipeline({
    videoPath,
    scriptText,
    outputDir,
    options: {
      ...DEFAULT_PIPELINE_OPTIONS,
      outputQuality: 'high',
      useAdvancedSegmentation: true,
      enableDeduplication: true,
      addSubtitles: true,
      burnInSubtitles: true,
      generateFiles: true,
      saveIntermediateFiles: true
    }
  })
}

/**
 * Fast processing with stream copy (minimal quality changes)
 */
export async function processVideoFast(
  videoPath: string,
  scriptText?: string,
  outputDir?: string
): Promise<PipelineResult> {
  return updateSpeakerToCameraPipeline({
    videoPath,
    scriptText,
    outputDir,
    options: {
      ...DEFAULT_PIPELINE_OPTIONS,
      outputQuality: 'medium',
      useAdvancedSegmentation: false,
      addSubtitles: false,
      burnInSubtitles: false,
      generateFiles: false
    }
  })
}

/**
 * Validate pipeline dependencies
 */
export async function validatePipelineDependencies(): Promise<{
  valid: boolean
  issues: string[]
  dependencies: Record<string, boolean>
}> {
  const issues: string[] = []
  const dependencies = {
    ffmpeg: false,
    openai: false,
    supabase: false
  }
  
  // Check FFmpeg
  try {
    const { validateFFmpeg } = await import('./ffmpeg')
    const ffmpegValidation = await validateFFmpeg()
    dependencies.ffmpeg = ffmpegValidation.available
    if (!ffmpegValidation.available) {
      issues.push('FFmpeg not available - install @ffmpeg-installer/ffmpeg or system FFmpeg')
    }
  } catch {
    issues.push('FFmpeg module not available')
  }
  
  // Check OpenAI API key
  dependencies.openai = !!process.env.OPENAI_API_KEY
  if (!dependencies.openai) {
    issues.push('OPENAI_API_KEY environment variable not set')
  }
  
  // Check Supabase connection
  try {
    const { data, error } = await supabase.from('media_files').select('count').limit(1)
    dependencies.supabase = !error
    if (error) {
      issues.push(`Supabase connection failed: ${error.message}`)
    }
  } catch (error: any) {
    issues.push(`Supabase validation failed: ${error.message}`)
    dependencies.supabase = false
  }
  
  return {
    valid: issues.length === 0,
    issues,
    dependencies
  }
}

// Export types for external use
export type {
  PipelineInput,
  PipelineOptions,
  PipelineResult,
  PipelineStats
}
