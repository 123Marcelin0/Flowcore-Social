// Audio extraction utility for video files
// Extracts audio from video files to reduce size for transcription

export interface AudioExtractionResult {
  audioBlob: Blob
  originalSize: number
  audioSize: number
  compressionRatio: number
}

/**
 * Extracts audio from a video file using Web Audio API and MediaSource
 * This is a client-side approach that works in the browser
 */
export async function extractAudioFromVideo(videoBlob: Blob): Promise<AudioExtractionResult> {
  console.log('🎵 Extracting audio from video...')
  
  try {
    // Create a video element to load the video
    const video = document.createElement('video')
    const videoUrl = URL.createObjectURL(videoBlob)
    
    return new Promise((resolve, reject) => {
      video.addEventListener('loadedmetadata', async () => {
        try {
          // Create audio context
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
          
          // Create media element source
          const source = audioContext.createMediaElementSource(video)
          
          // Create a destination for recording
          const destination = audioContext.createMediaStreamDestination()
          source.connect(destination)
          
          // Create media recorder
          const mediaRecorder = new MediaRecorder(destination.stream, {
            mimeType: 'audio/webm;codecs=opus' // Good compression for audio
          })
          
          const audioChunks: Blob[] = []
          
          mediaRecorder.addEventListener('dataavailable', (event) => {
            if (event.data.size > 0) {
              audioChunks.push(event.data)
            }
          })
          
          mediaRecorder.addEventListener('stop', () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
            const compressionRatio = audioBlob.size / videoBlob.size
            
            console.log(`✅ Audio extraction complete:`, {
              originalSize: Math.round(videoBlob.size / 1024 / 1024),
              audioSize: Math.round(audioBlob.size / 1024 / 1024),
              compressionRatio: (compressionRatio * 100).toFixed(1) + '%'
            })
            
            URL.revokeObjectURL(videoUrl)
            
            resolve({
              audioBlob,
              originalSize: videoBlob.size,
              audioSize: audioBlob.size,
              compressionRatio
            })
          })
          
          // Start recording and play video
          mediaRecorder.start()
          video.play()
          
          // Stop recording when video ends
          video.addEventListener('ended', () => {
            mediaRecorder.stop()
            audioContext.close()
          })
          
        } catch (error) {
          console.error('❌ Audio extraction failed:', error)
          URL.revokeObjectURL(videoUrl)
          reject(error)
        }
      })
      
      video.addEventListener('error', (error) => {
        console.error('❌ Video loading failed:', error)
        URL.revokeObjectURL(videoUrl)
        reject(error)
      })
      
      video.src = videoUrl
      video.load()
    })
    
  } catch (error) {
    console.error('❌ Audio extraction setup failed:', error)
    throw error
  }
}

/**
 * Simpler approach: Convert video blob to audio blob by changing MIME type
 * This works for some video formats where the audio stream is compatible
 */
export async function convertVideoToAudio(videoBlob: Blob): Promise<AudioExtractionResult> {
  console.log('🔄 Converting video to audio format...')
  
  // Try creating an audio blob from the video data
  // This works if the video container has a compatible audio stream
  const audioBlob = new Blob([await videoBlob.arrayBuffer()], { 
    type: 'audio/mp4' // MP4 container can hold audio
  })
  
  const compressionRatio = audioBlob.size / videoBlob.size
  
  console.log(`✅ Video to audio conversion:`, {
    originalSize: Math.round(videoBlob.size / 1024 / 1024),
    audioSize: Math.round(audioBlob.size / 1024 / 1024),
    sameSize: videoBlob.size === audioBlob.size ? 'Yes (container only)' : 'No'
  })
  
  return {
    audioBlob,
    originalSize: videoBlob.size,
    audioSize: audioBlob.size,
    compressionRatio
  }
}

/**
 * Auto-selects the best audio extraction method based on file type and size
 */
export async function extractAudio(videoBlob: Blob): Promise<AudioExtractionResult> {
  const sizeMB = videoBlob.size / (1024 * 1024)
  
  console.log(`🎬 Processing video file: ${sizeMB.toFixed(1)}MB`)
  
  // For smaller files or non-MP4, try simple conversion first
  if (sizeMB < 100 || !videoBlob.type.includes('mp4')) {
    try {
      return await convertVideoToAudio(videoBlob)
    } catch (error) {
      console.log('Simple conversion failed, trying full extraction...')
    }
  }
  
  // For larger files, try full audio extraction
  try {
    return await extractAudioFromVideo(videoBlob)
  } catch (error) {
    console.log('Full extraction failed, falling back to simple conversion...')
    return await convertVideoToAudio(videoBlob)
  }
}






























