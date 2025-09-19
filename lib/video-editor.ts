import { configureFfmpeg } from './server-audio-extractor-ffmpeg'
import { VideoSegment, EditingDecision } from './align'
import { VideoProcessingOptions, VideoProcessingResult, DecisionOutput } from './types'

export interface SubtitleSegment {
  start_ms: number
  end_ms: number
  text: string
}


export interface VideoEditingOptions {
  outputFormat?: 'mp4' | 'webm'
  outputQuality?: 'low' | 'medium' | 'high'
  transitionDuration?: number // milliseconds for crossfade transitions
  fadeInOut?: boolean // add fade in/out to the final video
  addSubtitles?: boolean // add subtitles to the video
  subtitles?: SubtitleSegment[] // subtitle segments to add
  subtitleStyle?: {
    fontFamily?: string
    fontSize?: number
    fontColor?: string
    backgroundColor?: string
    position?: 'bottom' | 'top' | 'center'
  }
}

export interface VideoEditingResult {
  success: boolean
  outputBuffer?: ArrayBuffer
  outputMimeType?: string
  outputFileName?: string
  editingStats: {
    originalDuration: number
    finalDuration: number
    segmentsKept: number
    segmentsRemoved: number
    reductionPercentage: number
  }
  error?: string
}



/**
 * Create FFmpeg subtitle filter
 */
function createSubtitleFilter(
  subtitles: SubtitleSegment[],
  style: any
): string {
  // For now, create a simple drawtext filter for the first subtitle
  // In a full implementation, you'd create multiple overlapping drawtext filters
  if (subtitles.length === 0) return ''
  
  const firstSubtitle = subtitles[0]
  const text = firstSubtitle.text.replace(/'/g, "\\'").replace(/:/g, "\\:")
  const startSec = firstSubtitle.start_ms / 1000
  const endSec = firstSubtitle.end_ms / 1000
  
  const fontSize = style.fontSize || 24
  const fontColor = style.fontColor || 'white'
  const position = style.position === 'top' ? 'h*0.1' : style.position === 'center' ? 'h*0.5' : 'h*0.9'
  
  return `drawtext=text='${text}':fontsize=${fontSize}:fontcolor=${fontColor}:x=(w-text_w)/2:y=${position}:enable='between(t,${startSec},${endSec})'`
}

/**
 * Creates a cleaned video by removing segments not in the script
 * Uses FFmpeg to cut and concatenate video segments
 */
export async function createCleanVideo(
  videoBuffer: ArrayBuffer,
  videoMimeType: string,
  videoSegments: VideoSegment[],
  options: VideoEditingOptions = {}
): Promise<VideoEditingResult> {
  if (typeof window !== 'undefined') {
    throw new Error('Video editing is server-side only')
  }

  const {
    outputFormat = 'mp4',
    outputQuality = 'medium',
    transitionDuration = 200,
    fadeInOut = true,
    addSubtitles = false,
    subtitles = [],
    subtitleStyle = {
      fontFamily: 'Arial',
      fontSize: 24,
      fontColor: 'white',
      backgroundColor: 'black@0.8',
      position: 'bottom'
    }
  } = options

  try {
    await configureFfmpeg()
    
    const { writeFile, readFile, unlink, mkdtemp } = await import('fs/promises')
    const os = await import('os')
    const path = await import('path')
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ffmpeg = require('fluent-ffmpeg')

    // Create temporary directory for processing
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'video-edit-'))
    
    // Determine input file extension from MIME type
    let inputExtension = '.mp4'
    if (videoMimeType.includes('webm')) inputExtension = '.webm'
    else if (videoMimeType.includes('quicktime') || videoMimeType.includes('mov')) inputExtension = '.mov'
    else if (videoMimeType.includes('avi')) inputExtension = '.avi'

    const inputPath = path.join(tmpDir, `input${inputExtension}`)
    const outputPath = path.join(tmpDir, `output.${outputFormat}`)

    // Write input video to temp file
    await writeFile(inputPath, Buffer.from(videoBuffer))
    console.log(`📹 Input video written: ${inputPath}`)

    // Filter segments to keep (only those that match the script)
    const segmentsToKeep = videoSegments.filter(seg => seg.keep).sort((a, b) => a.start_ms - b.start_ms)
    
    if (segmentsToKeep.length === 0) {
      throw new Error('No segments to keep - script might not match any video content')
    }

    console.log(`✂️ Keeping ${segmentsToKeep.length} segments out of ${videoSegments.length}`)
    
    // Calculate total durations
    const originalDuration = videoSegments.reduce((sum, seg) => sum + (seg.end_ms - seg.start_ms), 0)
    const finalDuration = segmentsToKeep.reduce((sum, seg) => sum + (seg.end_ms - seg.start_ms), 0)
    const reductionPercentage = ((originalDuration - finalDuration) / originalDuration) * 100

    console.log(`📊 Video editing: ${(originalDuration / 1000).toFixed(1)}s → ${(finalDuration / 1000).toFixed(1)}s (${reductionPercentage.toFixed(1)}% reduction)`)

    // Create FFmpeg filter complex for cutting and concatenating
    const filterComplex: string[] = []
    const inputs: string[] = []
    
    // If we have only one segment, use simple cut
    if (segmentsToKeep.length === 1) {
      const segment = segmentsToKeep[0]
      const startSeconds = segment.start_ms / 1000
      const durationSeconds = (segment.end_ms - segment.start_ms) / 1000
      
      console.log(`✂️ Simple cut: ${startSeconds.toFixed(3)}s - ${(startSeconds + durationSeconds).toFixed(3)}s`)
      
      // Quality settings based on output quality
      const qualitySettings = getQualitySettings(outputQuality)
      
      return new Promise((resolve, reject) => {
        let command = ffmpeg(inputPath)
          .seekInput(startSeconds)
          .duration(durationSeconds)
          .outputOptions(qualitySettings)
          .format(outputFormat)
        
        // Add video filters (fade and/or subtitles)
        const videoFilters: string[] = []
        
        if (fadeInOut) {
          const fadeDuration = Math.min(0.5, durationSeconds / 4) // Max 0.5s fade, or 1/4 of segment duration
          videoFilters.push(
            `fade=t=in:st=0:d=${fadeDuration}`,
            `fade=t=out:st=${durationSeconds - fadeDuration}:d=${fadeDuration}`
          )
        }
        
        if (addSubtitles && subtitles.length > 0) {
          // Create subtitle filter for this single segment
          const subtitleFilter = createSubtitleFilter(subtitles, subtitleStyle)
          videoFilters.push(subtitleFilter)
        }
        
        if (videoFilters.length > 0) {
          command = command.videoFilters(videoFilters)
        }
        
        command
          .output(outputPath)
          .on('start', (cmd) => {
            console.log('🎬 FFmpeg command:', cmd)
          })
          .on('progress', (progress) => {
            console.log(`⏳ Processing: ${progress.percent?.toFixed(1) || 0}%`)
          })
          .on('end', async () => {
            try {
              console.log('✅ Video editing completed')
              const outputBuffer = await readFile(outputPath)
              
              // Cleanup
              await cleanupFiles([inputPath, outputPath, tmpDir])
              
              resolve({
                success: true,
                outputBuffer: outputBuffer.buffer.slice(outputBuffer.byteOffset, outputBuffer.byteOffset + outputBuffer.byteLength),
                outputMimeType: `video/${outputFormat}`,
                outputFileName: `clean_video.${outputFormat}`,
                editingStats: {
                  originalDuration: originalDuration / 1000,
                  finalDuration: finalDuration / 1000,
                  segmentsKept: segmentsToKeep.length,
                  segmentsRemoved: videoSegments.length - segmentsToKeep.length,
                  reductionPercentage
                }
              })
            } catch (error) {
              console.error('❌ Error reading output file:', error)
              await cleanupFiles([inputPath, outputPath, tmpDir])
              reject(error)
            }
          })
          .on('error', async (error) => {
            console.error('❌ FFmpeg error:', error)
            await cleanupFiles([inputPath, outputPath, tmpDir])
            reject(error)
          })
          .run()
      })
    }

    // Multiple segments - need to cut and concatenate
    console.log(`✂️ Complex editing: ${segmentsToKeep.length} segments to concatenate`)
    
    // Create individual segment files first
    const segmentPaths: string[] = []
    
    for (let i = 0; i < segmentsToKeep.length; i++) {
      const segment = segmentsToKeep[i]
      const segmentPath = path.join(tmpDir, `segment_${i}.${outputFormat}`)
      segmentPaths.push(segmentPath)
      
      const startSeconds = segment.start_ms / 1000
      const durationSeconds = (segment.end_ms - segment.start_ms) / 1000
      
      console.log(`✂️ Cutting segment ${i + 1}: ${startSeconds.toFixed(3)}s - ${(startSeconds + durationSeconds).toFixed(3)}s`)
      
      await new Promise<void>((resolveSegment, rejectSegment) => {
        const qualitySettings = getQualitySettings(outputQuality)
        
        ffmpeg(inputPath)
          .seekInput(startSeconds)
          .duration(durationSeconds)
          .outputOptions(qualitySettings)
          .format(outputFormat)
          .output(segmentPath)
          .on('end', () => {
            console.log(`✅ Segment ${i + 1} created`)
            resolveSegment()
          })
          .on('error', (error) => {
            console.error(`❌ Error creating segment ${i + 1}:`, error)
            rejectSegment(error)
          })
          .run()
      })
    }

    // Create concatenation list file
    const concatListPath = path.join(tmpDir, 'concat_list.txt')
    const concatList = segmentPaths.map(p => `file '${p}'`).join('\n')
    await writeFile(concatListPath, concatList)
    
    console.log('🔗 Concatenating segments...')
    
    // Concatenate all segments
    return new Promise((resolve, reject) => {
      let command = ffmpeg()
        .input(concatListPath)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        .format(outputFormat)
      
      // Add fade effects to final video if requested
      if (fadeInOut) {
        const totalDurationSeconds = finalDuration / 1000
        const fadeDuration = Math.min(0.5, totalDurationSeconds / 8) // Shorter fade for concatenated video
        
        // Use re-encoding with fade filters (can't use copy with filters)
        const qualitySettings = getQualitySettings(outputQuality)
        command = command
          .outputOptions(qualitySettings)
          .videoFilters([
            `fade=t=in:st=0:d=${fadeDuration}`,
            `fade=t=out:st=${totalDurationSeconds - fadeDuration}:d=${fadeDuration}`
          ])
      } else {
        // No filters, can use copy for speed
        command = command.outputOptions(['-c', 'copy'])
      }
      
      command
        .output(outputPath)
        .on('start', (cmd) => {
          console.log('🎬 FFmpeg concat command:', cmd)
        })
        .on('progress', (progress) => {
          console.log(`⏳ Concatenating: ${progress.percent?.toFixed(1) || 0}%`)
        })
        .on('end', async () => {
          try {
            console.log('✅ Video concatenation completed')
            const outputBuffer = await readFile(outputPath)
            
            // Cleanup all temp files
            const allTempFiles = [inputPath, outputPath, concatListPath, ...segmentPaths, tmpDir]
            await cleanupFiles(allTempFiles)
            
            resolve({
              success: true,
              outputBuffer: outputBuffer.buffer.slice(outputBuffer.byteOffset, outputBuffer.byteOffset + outputBuffer.byteLength),
              outputMimeType: `video/${outputFormat}`,
              outputFileName: `clean_video.${outputFormat}`,
              editingStats: {
                originalDuration: originalDuration / 1000,
                finalDuration: finalDuration / 1000,
                segmentsKept: segmentsToKeep.length,
                segmentsRemoved: videoSegments.length - segmentsToKeep.length,
                reductionPercentage
              }
            })
          } catch (error) {
            console.error('❌ Error reading concatenated output:', error)
            await cleanupFiles([inputPath, outputPath, concatListPath, ...segmentPaths, tmpDir])
            reject(error)
          }
        })
        .on('error', async (error) => {
          console.error('❌ FFmpeg concatenation error:', error)
          await cleanupFiles([inputPath, outputPath, concatListPath, ...segmentPaths, tmpDir])
          reject(error)
        })
        .run()
    })

  } catch (error) {
    console.error('❌ Video editing failed:', error)
    return {
      success: false,
      editingStats: {
        originalDuration: 0,
        finalDuration: 0,
        segmentsKept: 0,
        segmentsRemoved: 0,
        reductionPercentage: 0
      },
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Get FFmpeg quality settings based on quality level
 */
function getQualitySettings(quality: 'low' | 'medium' | 'high'): string[] {
  switch (quality) {
    case 'low':
      return [
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '28',
        '-c:a', 'aac',
        '-b:a', '128k'
      ]
    case 'medium':
      return [
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '192k'
      ]
    case 'high':
      return [
        '-c:v', 'libx264',
        '-preset', 'slow',
        '-crf', '18',
        '-c:a', 'aac',
        '-b:a', '256k'
      ]
    default:
      return getQualitySettings('medium')
  }
}

/**
 * Clean up temporary files and directories
 */
async function cleanupFiles(paths: string[]): Promise<void> {
  const { unlink, rm, stat } = await import('fs/promises')
  
  // Separate files and directories
  const files: string[] = []
  const directories: string[] = []
  
  for (const filePath of paths) {
    try {
      const stats = await stat(filePath)
      if (stats.isDirectory()) {
        directories.push(filePath)
      } else {
        files.push(filePath)
      }
    } catch (error) {
      // File/dir doesn't exist, skip it
      continue
    }
  }
  
  // Clean up files first
  for (const filePath of files) {
    try {
      await unlink(filePath)
    } catch (error) {
      // Ignore cleanup errors for files
      console.warn(`⚠️ Could not cleanup file ${filePath}:`, error)
    }
  }
  
  // Clean up directories last
  for (const dirPath of directories) {
    try {
      await rm(dirPath, { recursive: true, force: true })
    } catch (error) {
      // Ignore cleanup errors for directories
      console.warn(`⚠️ Could not cleanup directory ${dirPath}:`, error)
    }
  }
}

/**
 * Creates a cleaned video based on LLM editing decision
 */
export async function createCleanVideoFromDecision(
  videoBuffer: ArrayBuffer,
  videoMimeType: string,
  editingDecision: EditingDecision,
  options: VideoEditingOptions = {}
): Promise<VideoEditingResult> {
  if (typeof window !== 'undefined') {
    throw new Error('Video editing is server-side only')
  }

  const {
    outputFormat = 'mp4',
    outputQuality = 'medium',
    transitionDuration = 200,
    fadeInOut = true,
    addSubtitles = true,
    subtitleStyle = {
      fontFamily: 'Arial Bold',
      fontSize: 28,
      fontColor: 'white',
      backgroundColor: 'black@0.8',
      position: 'bottom'
    }
  } = options

  try {
    await configureFfmpeg()
    
    const { writeFile, readFile, unlink, mkdtemp } = await import('fs/promises')
    const os = await import('os')
    const path = await import('path')
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ffmpeg = require('fluent-ffmpeg')

    // Create temporary directory for processing
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'video-edit-safe-'))
    
    // Determine input file extension from MIME type
    let inputExtension = '.mp4'
    if (videoMimeType.includes('webm')) inputExtension = '.webm'
    else if (videoMimeType.includes('quicktime') || videoMimeType.includes('mov')) inputExtension = '.mov'
    else if (videoMimeType.includes('avi')) inputExtension = '.avi'

    const inputPath = path.join(tmpDir, `input${inputExtension}`)
    const outputPath = path.join(tmpDir, `output.${outputFormat}`)

    // Write input video to temp file
    await writeFile(inputPath, Buffer.from(videoBuffer))
    console.log(`📹 Input video written: ${inputPath}`)

    const allSegments = editingDecision.keepSegments.sort((a, b) => a.start_ms - b.start_ms)
    
    // SAFE CUTTING: Filter out segments that are too short (<0.3s)
    console.log(`🔍 Filtering segments: checking ${allSegments.length} segments for minimum duration`)
    
    const validSegments = allSegments.filter(segment => {
      const durationSeconds = (segment.end_ms - segment.start_ms) / 1000
      const isValid = durationSeconds >= 0.3
      
      if (!isValid) {
        console.log(`⚠️ SKIPPED: Segment too short (${durationSeconds.toFixed(3)}s < 0.3s): "${segment.transcript.substring(0, 40)}..."`)
      }
      
      return isValid
    })
    
    if (validSegments.length === 0) {
      throw new Error('No valid segments to join - all segments are shorter than 0.3 seconds')
    }

    console.log(`✅ Valid segments: ${validSegments.length}/${allSegments.length} (${allSegments.length - validSegments.length} skipped as too short)`)
    
    // Probe real input duration (seconds)
    const inputDurationSec: number = await new Promise((resolve) => {
      try {
        ffmpeg.ffprobe(inputPath, (err: any, data: any) => {
          if (err) return resolve(0)
          const dur = Number(data?.format?.duration || 0)
          resolve(isFinite(dur) ? dur : 0)
        })
      } catch {
        resolve(0)
      }
    })

    // Decide time unit scale for segments (ms vs s) by comparing to input duration
    const maxEndMs = validSegments.reduce((m, s) => Math.max(m, s.end_ms), 0)
    // If max end (interpreted as seconds) is far beyond input duration, assume ms → scale 0.001
    const scale = (inputDurationSec > 0 && (maxEndMs > (inputDurationSec * 1500))) ? 0.001 : 0.001 // prefer ms by default
    // If some systems already pass seconds, detect that: when maxEndMs (s) within 1.5x input duration
    const secondsLooksRight = (inputDurationSec > 0 && (maxEndMs <= (inputDurationSec * 1.5)))
    const timeScale = secondsLooksRight ? 1 : 0.001

    // Calculate total duration for fade decisions using normalized seconds
    const totalValidDuration = validSegments.reduce((sum, seg) => sum + ((seg.end_ms - seg.start_ms) * timeScale), 0)
    const shouldApplyFades = fadeInOut && totalValidDuration > 1.0
    
    console.log(`📊 Total valid duration: ${totalValidDuration.toFixed(1)}s`)
    console.log(`🎨 Fade effects: ${shouldApplyFades ? 'ENABLED' : 'DISABLED'} (total duration ${totalValidDuration > 1.0 ? '>' : '≤'} 1.0s)`)
    
    // Calculate duration information (harden against missing stats)
    const originalDuration_s = (editingDecision as any).editingStats?.totalDuration_ms
      ? ((editingDecision as any).editingStats.totalDuration_ms / 1000)
      : (validSegments.reduce((sum, seg) => sum + (seg.end_ms - seg.start_ms), 0) / 1000)
    const finalDuration_s = totalValidDuration

    // SAFE SEGMENT CUTTING: Use -ss start -to end with re-encoding
    console.log(`🔧 Safe FFmpeg cutting: Using -ss start -to end with libx264 + AAC re-encoding`)
    
    const segmentPaths: string[] = []
    const concatListPath = path.join(tmpDir, 'concat_list.txt')
    
    // Cut each valid segment to temporary files
    for (let i = 0; i < validSegments.length; i++) {
      const segment = validSegments[i]
      const segmentPath = path.join(tmpDir, `segment_${String(i + 1).padStart(3, '0')}.${outputFormat}`)
      segmentPaths.push(segmentPath)
      
      let startSeconds = (segment.start_ms) * timeScale
      let endSeconds = (segment.end_ms) * timeScale
      if (inputDurationSec > 0) {
        // Clamp to media duration bounds
        startSeconds = Math.max(0, Math.min(startSeconds, Math.max(0.01, inputDurationSec - 0.01)))
        endSeconds = Math.max(startSeconds + 0.01, Math.min(endSeconds, inputDurationSec))
      }
      const durationSeconds = Math.max(0.02, endSeconds - startSeconds)
      
      // Log each segment cut with text + duration
      console.log(`✂️ Cutting segment ${i + 1}/${validSegments.length}:`)
      console.log(`   ⏱️ Time: ${startSeconds.toFixed(3)}s → ${endSeconds.toFixed(3)}s (${durationSeconds.toFixed(3)}s)`)
      console.log(`   📝 Text: "${segment.transcript.substring(0, 80)}${segment.transcript.length > 80 ? '...' : ''}"`)
      console.log(`   💾 Output: ${path.basename(segmentPath)}`)
      
      await new Promise<void>((resolveSegment, rejectSegment) => {
        // Safe cutting with -ss start -to end and re-encoding
        let segmentCommand = ffmpeg(inputPath)
          .seekInput(startSeconds)
          .duration(durationSeconds)
          .outputOptions([
            '-c:v', 'libx264',
            '-crf', '23',
            '-preset', 'medium',
            '-c:a', 'aac',
            '-movflags', '+faststart'
          ])
          .format(outputFormat)
        
        // Add subtitle to this segment if requested
        if (addSubtitles) {
          const text = segment.transcript.replace(/'/g, "\\'").replace(/:/g, "\\:").replace(/"/g, '\\"')
          const fontSize = subtitleStyle.fontSize || 28
          const fontColor = subtitleStyle.fontColor || 'white'
          const position = subtitleStyle.position === 'top' ? 'h*0.1' : 
                          subtitleStyle.position === 'center' ? 'h*0.5' : 'h*0.9'
          
          segmentCommand = segmentCommand.videoFilters([
            `drawtext=text='${text}':fontsize=${fontSize}:fontcolor=${fontColor}:x=(w-text_w)/2:y=${position}:box=1:boxcolor=black@0.8:boxborderw=5`
          ])
        }
        
        segmentCommand
          .output(segmentPath)
          .on('start', (cmd) => {
            console.log(`   🎬 FFmpeg: ${cmd.split(' ').slice(0, 10).join(' ')}...`)
          })
          .on('end', () => {
            console.log(`   ✅ Segment ${i + 1} completed`)
            resolveSegment()
          })
          .on('error', (error) => {
            console.error(`   ❌ Error creating segment ${i + 1}:`, error)
            rejectSegment(error)
          })
          .run()
      })
    }

    // Guard: Check if concat list is empty
    if (segmentPaths.length === 0) {
      throw new Error('No valid segments to join - concat list is empty')
    }

    // Create concat list file with absolute paths
    console.log(`📝 Creating concat list: ${segmentPaths.length} segments`)
    
    // Verify all segment files exist before creating concat list
    for (const segmentPath of segmentPaths) {
      try {
        await require('fs').promises.access(segmentPath)
      } catch (error) {
        throw new Error(`Segment file not found: ${segmentPath}`)
      }
    }
    
    // Build concat content with proper path escaping for Windows
    const concatContent = segmentPaths.map(p => {
      // Convert Windows paths to forward slashes for FFmpeg
      const normalizedPath = p.replace(/\\/g, '/')
      return `file '${normalizedPath}'`
    }).join('\n')
    
    await writeFile(concatListPath, concatContent, 'utf8')
    
    console.log(`📋 Concat list content:\n${concatContent}`)
    console.log(`📄 Concat list written to: ${concatListPath}`)
    
    // Verify the concat list file was created
    try {
      await require('fs').promises.access(concatListPath)
      const fileStats = await require('fs').promises.stat(concatListPath)
      console.log(`✅ Concat list verified: ${fileStats.size} bytes`)
    } catch (error) {
      throw new Error(`Failed to create concat list file: ${concatListPath}`)
    }
    
    // Concatenate all segments using filter_complex concat (more robust across platforms)
    console.log('🔗 Concatenating segments via filter_complex concat...')
    
    // Probe segments and include only those that have a video stream; detect audio presence overall
    type ProbeInfo = { path: string; hasVideo: boolean; hasAudio: boolean }
    const probes: ProbeInfo[] = await Promise.all(segmentPaths.map(p => new Promise<ProbeInfo>((resolve) => {
      try {
        ffmpeg.ffprobe(p, (err: any, data: any) => {
          if (err) return resolve({ path: p, hasVideo: false, hasAudio: false })
          const streams = Array.isArray(data?.streams) ? data.streams : []
          const hasVideo = streams.some((s: any) => s.codec_type === 'video')
          const hasAudio = streams.some((s: any) => s.codec_type === 'audio')
          resolve({ path: p, hasVideo, hasAudio })
        })
      } catch {
        resolve({ path: p, hasVideo: false, hasAudio: false })
      }
    })))
    const included = probes.filter(p => p.hasVideo)
    if (included.length === 0) {
      console.warn('⚠️ Probe could not find video streams in segment files. Falling back to concat demuxer re-encode path...')
      // Fallback: concat demuxer with re-encode (robust across mixed streams)
      return new Promise((resolve, reject) => {
        let command = ffmpeg()
          .input(concatListPath)
          .inputOptions(['-f', 'concat', '-safe', '0'])
          .outputOptions([
            '-c:v', 'libx264',
            '-preset', 'medium',
            '-crf', '23',
            '-pix_fmt', 'yuv420p',
            '-vsync', '2',
            '-c:a', 'aac',
            '-movflags', '+faststart'
          ])

        if (shouldApplyFades) {
          const fadeDuration = Math.min(0.3, totalValidDuration / 10)
          command = command.videoFilters([
            `fade=t=in:st=0:d=${fadeDuration}`,
            `fade=t=out:st=${Math.max(0, totalValidDuration - fadeDuration)}:d=${fadeDuration}`
          ])
        }

        command
          .output(outputPath)
          .on('start', (cmd: string) => {
            console.log('🎬 Fallback concat demuxer command:', cmd.split(' ').slice(0, 25).join(' ') + '...')
          })
          .on('end', async () => {
            try {
              const outputBuffer = await readFile(outputPath)
              const filesToCleanup = [inputPath, outputPath, concatListPath, ...segmentPaths, tmpDir]
              await cleanupFiles(filesToCleanup)
              resolve({
                success: true,
                outputBuffer: outputBuffer.buffer.slice(outputBuffer.byteOffset, outputBuffer.byteOffset + outputBuffer.byteLength),
                outputMimeType: `video/${outputFormat}`,
                outputFileName: `clean_video.${outputFormat}`,
                editingStats: {
                  originalDuration: originalDuration_s,
                  finalDuration: finalDuration_s,
                  segmentsKept: validSegments.length,
                  segmentsRemoved: (((editingDecision as any).editingStats?.segmentsRemoved) || 0) + (allSegments.length - validSegments.length),
                  reductionPercentage: ((originalDuration_s - finalDuration_s) / originalDuration_s) * 100,
                  segmentsSkippedTooShort: allSegments.length - validSegments.length
                }
              })
            } catch (error) {
              console.error('❌ Error reading output file (fallback):', error)
              const filesToCleanup = [inputPath, outputPath, concatListPath, ...segmentPaths, tmpDir]
              await cleanupFiles(filesToCleanup)
              reject(error)
            }
          })
          .on('error', async (error: any) => {
            console.error('❌ Fallback concat demuxer error:', error)
            const filesToCleanup = [inputPath, outputPath, concatListPath, ...segmentPaths, tmpDir]
            await cleanupFiles(filesToCleanup)
            reject(error)
          })
          .run()
      })
    }
    const allHaveAudio = included.every(p => p.hasAudio)

    return new Promise((resolve, reject) => {
      let command = ffmpeg()
      // Add only valid video segments as inputs
      included.forEach(p => { command = command.input(p.path) })

      const n = included.length
      // Build inputs array like ['0:v','0:a','1:v','1:a', ...] or only video if no audio
      const inputs: string[] = []
      for (let i = 0; i < n; i++) {
        inputs.push(`${i}:v`)
        if (allHaveAudio) inputs.push(`${i}:a`)
      }

      const outputs = allHaveAudio ? ['vcat', 'acat'] : ['vcat']
      const filters: any[] = [
        { filter: 'concat', options: { n, v: 1, a: allHaveAudio ? 1 : 0 }, inputs, outputs }
      ]

      // Optional fades on video output
      let vOut = 'vcat'
      if (shouldApplyFades) {
        const fadeDuration = Math.min(0.3, totalValidDuration / 10)
        filters.push({ filter: 'fade', options: { t: 'in', st: 0, d: fadeDuration }, inputs: 'vcat', outputs: 'vtmp' })
        filters.push({ filter: 'fade', options: { t: 'out', st: Math.max(0, totalValidDuration - fadeDuration), d: fadeDuration }, inputs: 'vtmp', outputs: 'vout' })
        vOut = 'vout'
      }

      command = command.complexFilter(filters)
      const outOpts: string[] = [
        '-map', `[${vOut}]`,
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '23',
        '-vsync', '2',
        '-movflags', '+faststart'
      ]
      if (allHaveAudio) {
        outOpts.push('-map', '[acat]', '-c:a', 'aac')
      } else {
        outOpts.push('-an')
      }

      command = command
        .outputOptions(outOpts)
        .output(outputPath)
        .on('start', (cmd: string) => {
          console.log('🎬 Final concat command:', cmd.split(' ').slice(0, 25).join(' ') + '...')
        })
        .on('progress', (progress: any) => {
          console.log(`⏳ Concatenating: ${progress.percent?.toFixed(1) || 0}%`)
        })
        .on('end', async () => {
          try {
            const outputBuffer = await readFile(outputPath)
            const filesToCleanup = [inputPath, outputPath, concatListPath, ...segmentPaths, tmpDir]
            await cleanupFiles(filesToCleanup)
            resolve({
              success: true,
              outputBuffer: outputBuffer.buffer.slice(outputBuffer.byteOffset, outputBuffer.byteOffset + outputBuffer.byteLength),
              outputMimeType: `video/${outputFormat}`,
              outputFileName: `clean_video.${outputFormat}`,
              editingStats: {
                originalDuration: originalDuration_s,
                finalDuration: finalDuration_s,
                segmentsKept: validSegments.length,
                segmentsRemoved: (((editingDecision as any).editingStats?.segmentsRemoved) || 0) + (allSegments.length - validSegments.length),
                reductionPercentage: ((originalDuration_s - finalDuration_s) / originalDuration_s) * 100,
                segmentsSkippedTooShort: allSegments.length - validSegments.length
              }
            })
          } catch (error) {
            console.error('❌ Error reading output file:', error)
            const filesToCleanup = [inputPath, outputPath, concatListPath, ...segmentPaths, tmpDir]
            await cleanupFiles(filesToCleanup)
            reject(error)
          }
        })
        .on('error', async (error: any) => {
          console.error('❌ FFmpeg concat filter error:', error)
          const filesToCleanup = [inputPath, outputPath, concatListPath, ...segmentPaths, tmpDir]
          await cleanupFiles(filesToCleanup)
          reject(error)
        })
        .run()
    })

  } catch (error) {
    console.error('❌ Video editing from LLM decision failed:', error)
    return {
      success: false,
      editingStats: {
        originalDuration: 0,
        finalDuration: 0,
        segmentsKept: 0,
        segmentsRemoved: 0,
        reductionPercentage: 0
      },
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
