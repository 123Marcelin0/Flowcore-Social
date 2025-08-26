// Server-side audio extraction using FFmpeg for valid, small audio files
// This file must only be imported/executed on the server (Node.js runtime)

export interface AudioExtractionResult {
  audioBuffer: ArrayBuffer
  mimeType: string
  fileName: string
  originalSize: number
  audioSize: number
  success: boolean
}

let ffmpegConfigured = false

export async function configureFfmpeg() {
  if (ffmpegConfigured) return
  if (typeof window !== 'undefined') return
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ffmpeg = require('fluent-ffmpeg')
    
    // Use @ffmpeg-installer packages with dynamic imports to avoid bundling issues
    try {
      // Use dynamic imports to avoid webpack bundling the README.md files
      const [ffmpegInstaller, ffprobeInstaller] = await Promise.all([
        import('@ffmpeg-installer/ffmpeg'),
        import('@ffprobe-installer/ffprobe')
      ])
      
      console.log('🔧 Configuring FFmpeg with installer packages...')
      console.log('📍 FFmpeg path:', ffmpegInstaller.default.path)
      console.log('📍 FFprobe path:', ffprobeInstaller.default.path)
      
      ffmpeg.setFfmpegPath(ffmpegInstaller.default.path)
      ffmpeg.setFfprobePath(ffprobeInstaller.default.path)
      
      console.log('✅ FFmpeg and FFprobe paths set successfully')
      ffmpegConfigured = true
      console.log('✅ FFmpeg configuration completed with installer packages')
      return
    } catch (installerError) {
      console.warn('⚠️ FFmpeg installer packages not available, trying fallbacks...', installerError)
    }
    
    // Note: ffmpeg-static was removed in favor of @ffmpeg-installer packages
    
    // Fallback: Try system PATH
    try {
      console.log('🔧 Trying system PATH for FFmpeg...')
      ffmpeg.setFfmpegPath('ffmpeg')
      ffmpeg.setFfprobePath('ffprobe')
      console.log('✅ Using system PATH for FFmpeg')
    } catch (e) {
      console.log('⚠️ System FFmpeg not available in PATH')
    }
    
    ffmpegConfigured = true
    console.log('✅ FFmpeg configuration completed with available options')
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('❌ FFmpeg configuration failed completely:', e)
  }
}

function getInputExtFromMime(mime: string): string {
  const m = (mime || '').toLowerCase()
  if (m.includes('webm')) return '.webm'
  if (m.includes('quicktime') || m.includes('mov')) return '.mov'
  if (m.includes('mkv')) return '.mkv'
  if (m.includes('mp3')) return '.mp3'
  if (m.includes('wav')) return '.wav'
  return '.mp4'
}

async function probeDurationSeconds(inputPath: string): Promise<number> {
  if (typeof window !== 'undefined') return 0
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ffmpeg = require('fluent-ffmpeg')
  return new Promise((resolve) => {
    try {
      ffmpeg.ffprobe(inputPath, (err: any, metadata: any) => {
        if (err) {
          resolve(0)
          return
        }
        const duration = Number(metadata?.format?.duration || 0)
        resolve(isFinite(duration) ? duration : 0)
      })
    } catch {
      resolve(0)
    }
  })
}

async function convertToAudio(
  videoBuffer: ArrayBuffer,
  prefer: 'wav' | 'mp3' | 'm4a' = 'wav',
  bitrateKbps = 32,
  sampleRateHz = 16000,
  sourceMime?: string
): Promise<AudioExtractionResult> {
  if (typeof window !== 'undefined') {
    throw new Error('convertToAudio can only run on the server')
  }
  await configureFfmpeg()
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ffmpeg = require('fluent-ffmpeg')
  const { writeFile, readFile, unlink } = await import('fs/promises')
  const os = await import('os')
  const path = await import('path')

  const tmpDir = os.tmpdir()
  const inputExt = getInputExtFromMime(sourceMime || '')
  const inputPath = path.join(tmpDir, `in-${Date.now()}-${Math.random().toString(36).slice(2)}${inputExt}`)
  const outputExt = prefer === 'mp3' ? '.mp3' : prefer === 'm4a' ? '.m4a' : '.wav'
  const outputPath = path.join(tmpDir, `out-${Date.now()}-${Math.random().toString(36).slice(2)}${outputExt}`)

  await writeFile(inputPath, Buffer.from(videoBuffer))

  const run = () => new Promise<void>((resolve, reject) => {
    let cmd = ffmpeg(inputPath)
      .noVideo()
      .audioChannels(1)
      .audioFrequency(sampleRateHz)
      .audioBitrate(`${bitrateKbps}k`)

    if (prefer === 'wav') {
      cmd = cmd.audioCodec('pcm_s16le').format('wav')
    } else if (prefer === 'm4a') {
      cmd = cmd.audioCodec('aac').format('ipod') // m4a (AAC)
    } else {
      // mp3
      cmd = cmd.format('mp3')
    }

    cmd.on('error', (err: any) => reject(err))
       .on('end', () => resolve())
       .save(outputPath)
  })

  try {
    await run()
    const out = await readFile(outputPath)
    const result: AudioExtractionResult = {
      audioBuffer: out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength),
      mimeType: prefer === 'mp3' ? 'audio/mpeg' : prefer === 'm4a' ? 'audio/mp4' : 'audio/wav',
      fileName: `extracted_audio${outputExt}`,
      originalSize: videoBuffer.byteLength,
      audioSize: out.byteLength,
      success: true,
    }
    await unlink(inputPath).catch(() => {})
    await unlink(outputPath).catch(() => {})
    return result
  } catch (e) {
    await unlink(inputPath).catch(() => {})
    await unlink(outputPath).catch(() => {})
    throw e
  }
}

export async function extractAudioServerSide(
  videoBuffer: ArrayBuffer,
  originalMimeType: string
): Promise<AudioExtractionResult> {
  try {
    // Prefer WAV (most decodable), then m4a (aac), then mp3
    try { return await convertToAudio(videoBuffer, 'wav', 0, 16000, originalMimeType) } catch {}
    try { return await convertToAudio(videoBuffer, 'm4a', 48, 16000, originalMimeType) } catch {}
    return await convertToAudio(videoBuffer, 'mp3', 48, 16000, originalMimeType)
  } catch (e) {
    // Fallback: return original buffer marked as failure
    return {
      audioBuffer: videoBuffer,
      mimeType: originalMimeType.replace('video/', 'audio/'),
      fileName: 'original_as_audio',
      originalSize: videoBuffer.byteLength,
      audioSize: videoBuffer.byteLength,
      success: false,
    }
  }
}

export async function createSimpleAudioFallback(
  videoBuffer: ArrayBuffer,
  originalMimeType: string,
  targetSizeMB: number = 25
): Promise<{ audioBuffer: ArrayBuffer; mimeType: string; fileName: string }> {
  console.log('🔄 Using simple fallback (no FFmpeg) - truncating file')
  const targetBytes = targetSizeMB * 1024 * 1024
  const truncatedBuffer = videoBuffer.slice(0, Math.min(targetBytes, videoBuffer.byteLength))
  
  let audioMimeType = originalMimeType.replace('video/', 'audio/')
  let fileName = 'truncated_audio'
  
  if (originalMimeType.includes('mp4')) {
    audioMimeType = 'audio/mp4'
    fileName = 'truncated_audio.m4a'
  } else if (originalMimeType.includes('webm')) {
    audioMimeType = 'audio/webm'
    fileName = 'truncated_audio.webm'
  } else {
    audioMimeType = 'audio/mpeg'
    fileName = 'truncated_audio.mp3'
  }
  
  console.log(`📊 Fallback truncation: ${(videoBuffer.byteLength / 1024 / 1024).toFixed(1)}MB → ${(truncatedBuffer.byteLength / 1024 / 1024).toFixed(1)}MB`)
  
  return {
    audioBuffer: truncatedBuffer,
    mimeType: audioMimeType,
    fileName: fileName
  }
}

export async function createLowQualityAudio(
  videoBuffer: ArrayBuffer,
  originalMimeType: string,
  targetSizeMB = 25
): Promise<AudioExtractionResult> {
  const targetBytes = targetSizeMB * 1024 * 1024

  if (typeof window !== 'undefined') throw new Error('FFmpeg conversion is server-only')
  await configureFfmpeg()
  
  const { writeFile, readFile, unlink } = await import('fs/promises')
  const os = await import('os')
  const path = await import('path')
  const tmpDir = os.tmpdir()
  const probeExt = getInputExtFromMime(originalMimeType)
  const inputPath = path.join(tmpDir, `input-${Date.now()}-${Math.random().toString(36).slice(2)}${probeExt}`)
  
  // Write input file for processing
  await writeFile(inputPath, Buffer.from(videoBuffer))
  let durationSec = 0

  try {
    durationSec = await probeDurationSeconds(inputPath)
    console.log(`📊 Video duration: ${durationSec}s`)
  } catch (e) {
    console.warn('⚠️ Could not probe duration, using fallback approach')
  }

  // Try stable bitrates that FFmpeg can handle reliably
  const safeBitrates = [64, 48, 40, 32]  // Start higher, go down - more stable than 24k
  
  for (const bitrate of safeBitrates) {
    try {
      console.log(`🔄 Trying MP3 at ${bitrate}kbps...`)
      
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const ffmpeg = require('fluent-ffmpeg')
      const outPath = path.join(tmpDir, `out-${bitrate}k-${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`)
      
      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .noVideo()
          .audioChannels(1)  // Force mono
          .audioFrequency(16000)  // 16kHz sample rate
          .audioBitrate(`${bitrate}k`)
          .format('mp3')
          .on('start', (cmdLine: string) => {
            console.log('🔧 FFmpeg command:', cmdLine)
          })
          .on('error', (err: any) => {
            console.error(`❌ FFmpeg error at ${bitrate}kbps:`, err.message)
            reject(err)
          })
          .on('end', () => {
            console.log(`✅ FFmpeg completed at ${bitrate}kbps`)
            resolve()
          })
          .save(outPath)
      })
      
      const out = await readFile(outPath)
      await unlink(outPath).catch(() => {})
      
      const resultSizeMB = out.byteLength / (1024 * 1024)
      console.log(`📊 Output size: ${resultSizeMB.toFixed(1)}MB (target: ${targetSizeMB}MB)`)
      
      if (out.byteLength <= targetBytes) {
        await unlink(inputPath).catch(() => {})
        return {
          audioBuffer: out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength),
          mimeType: 'audio/mpeg',
          fileName: 'extracted_audio.mp3',
          originalSize: videoBuffer.byteLength,
          audioSize: out.byteLength,
          success: true,
        }
      }
    } catch (e) {
      console.error(`❌ Failed at ${bitrate}kbps:`, e)
      // Continue to next bitrate
    }
  }

  // If still too big, try duration trimming at 32kbps (more stable than 24k)
  if (durationSec > 0) {
    try {
      console.log('🔄 Trying duration trimming at 32kbps...')
      
      // Calculate max duration that fits at 32kbps
      const maxSeconds = Math.max(30, Math.floor((targetBytes * 8) / (32 * 1000)))
      console.log(`⏱️ Trimming to ${maxSeconds}s`)
      
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const ffmpeg = require('fluent-ffmpeg')
      const outPath = path.join(tmpDir, `trimmed-${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`)
      
      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .noVideo()
          .audioChannels(1)
          .audioFrequency(16000)
          .audioBitrate('32k')
          .format('mp3')
          .setDuration(maxSeconds)
          .on('start', (cmdLine: string) => {
            console.log('🔧 FFmpeg trim command:', cmdLine)
          })
          .on('error', (err: any) => {
            console.error('❌ FFmpeg trim error:', err.message)
            reject(err)
          })
          .on('end', () => {
            console.log('✅ FFmpeg trim completed')
            resolve()
          })
          .save(outPath)
      })
      
      const out = await readFile(outPath)
      await unlink(outPath).catch(() => {})
      await unlink(inputPath).catch(() => {})
      
      const resultSizeMB = out.byteLength / (1024 * 1024)
      console.log(`📊 Trimmed output size: ${resultSizeMB.toFixed(1)}MB`)
      
      if (out.byteLength <= targetBytes) {
        return {
          audioBuffer: out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength),
          mimeType: 'audio/mpeg',
          fileName: 'extracted_audio.mp3',
          originalSize: videoBuffer.byteLength,
          audioSize: out.byteLength,
          success: true,
        }
      }
    } catch (e) {
      console.error('❌ Duration trimming failed:', e)
    }
  }

  // Cleanup
  await unlink(inputPath).catch(() => {})
  
  throw new Error(`FFmpeg conversion failed: could not create MP3 under ${targetSizeMB}MB. Try compressing your video first.`)
}


