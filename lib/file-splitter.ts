// File splitting utility for large audio/video files
// Splits files into chunks for OpenAI Whisper (25MB limit)

export interface FileSplit {
  chunk: Blob
  start: number // Start time in seconds
  duration: number // Duration of chunk in seconds
  index: number // Chunk index (0, 1, 2...)
}

export interface SplitOptions {
  maxSizeBytes?: number // Default 20MB (to be safe under 25MB limit)
  maxDurationSeconds?: number // Maximum duration per chunk
  overlap?: number // Overlap between chunks in seconds
}

/**
 * Splits a large audio/video file into smaller chunks for processing
 * This is a client-side implementation that splits by size, not by time
 * For time-based splitting, you'd need FFmpeg or similar server-side tools
 */
export async function splitFileBySize(
  file: Blob,
  options: SplitOptions = {}
): Promise<FileSplit[]> {
  const {
    maxSizeBytes = 20 * 1024 * 1024, // 20MB default (safe under 25MB)
    maxDurationSeconds = 300 // 5 minutes per chunk
  } = options

  const fileSize = file.size
  
  if (fileSize <= maxSizeBytes) {
    // File is small enough, return as single chunk
    return [{
      chunk: file,
      start: 0,
      duration: maxDurationSeconds, // We don't know actual duration
      index: 0
    }]
  }

  const chunks: FileSplit[] = []
  const numChunks = Math.ceil(fileSize / maxSizeBytes)
  
  for (let i = 0; i < numChunks; i++) {
    const start = i * maxSizeBytes
    const end = Math.min(start + maxSizeBytes, fileSize)
    const chunk = file.slice(start, end)
    
    chunks.push({
      chunk,
      start: i * maxDurationSeconds, // Estimated start time
      duration: maxDurationSeconds, // Estimated duration
      index: i
    })
  }

  return chunks
}

/**
 * Estimates file duration based on file size and type
 * This is a rough estimate - actual duration may vary
 */
export function estimateAudioDuration(file: Blob): number {
  // Very rough estimate based on typical bitrates
  // MP4 video: ~8Mbps, Audio: ~128kbps
  const fileSizeMB = file.size / (1024 * 1024)
  
  if (file.type.startsWith('video/')) {
    // Estimate for video files (assuming ~8Mbps)
    return (fileSizeMB * 8) / 8 * 60 // Convert to seconds
  } else {
    // Estimate for audio files (assuming ~128kbps)
    return (fileSizeMB * 8) / 0.128 // Convert to seconds
  }
}

/**
 * Merges transcription results from multiple chunks
 */
export function mergeTranscriptionResults(
  results: Array<{ segments: any[], text: string, chunkStart: number }>
): { segments: any[], text: string } {
  let mergedText = ''
  const mergedSegments: any[] = []
  
  for (const result of results) {
    const { segments, text, chunkStart } = result
    
    // Add text with space separator
    if (mergedText && text) {
      mergedText += ' ' + text
    } else if (text) {
      mergedText = text
    }
    
    // Adjust segment timings for chunk offset
    for (const segment of segments) {
      mergedSegments.push({
        ...segment,
        start: segment.start + chunkStart,
        end: segment.end + chunkStart
      })
    }
  }
  
  return {
    segments: mergedSegments,
    text: mergedText
  }
}






























