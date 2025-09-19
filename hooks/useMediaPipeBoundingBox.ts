import { useEffect, useRef, useState, useCallback } from 'react'
import { FaceDetection } from '@mediapipe/face_detection'
import { Pose } from '@mediapipe/pose'

export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
  confidence: number
  type: 'face' | 'body'
}

export interface MediaPipeFrame {
  timestamp: number
  boundingBoxes: BoundingBox[]
  frameIndex: number
}

export interface MediaPipeOptions {
  detectionType: 'face' | 'pose' | 'both'
  minDetectionConfidence: number
  minTrackingConfidence: number
  modelComplexity: 0 | 1 | 2
  enableSmoothing: boolean
}

export interface UseMediaPipeBoundingBoxReturn {
  isLoading: boolean
  isProcessing: boolean
  error: string | null
  frames: MediaPipeFrame[]
  processVideo: (videoElement: HTMLVideoElement, options?: Partial<MediaPipeOptions>) => Promise<void>
  reset: () => void
  progress: number
}

const DEFAULT_OPTIONS: MediaPipeOptions = {
  detectionType: 'both',
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
  modelComplexity: 1,
  enableSmoothing: true
}

export function useMediaPipeBoundingBox(): UseMediaPipeBoundingBoxReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [frames, setFrames] = useState<MediaPipeFrame[]>([])
  const [progress, setProgress] = useState(0)

  const faceDetectionRef = useRef<FaceDetection | null>(null)
  const poseDetectionRef = useRef<Pose | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Initialize MediaPipe models
  useEffect(() => {
    const initializeMediaPipe = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Initialize face detection
        const faceDetection = new FaceDetection({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`
        })

        faceDetection.setOptions({
          model: 'short',
          minDetectionConfidence: 0.5,
        })

        // Initialize pose detection
        const poseDetection = new Pose({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
        })

        poseDetection.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          enableSegmentation: false,
          smoothSegmentation: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        })

        faceDetectionRef.current = faceDetection
        poseDetectionRef.current = poseDetection

        console.log('✅ MediaPipe models initialized successfully')
      } catch (err: any) {
        console.error('❌ Failed to initialize MediaPipe:', err)
        setError(`Failed to initialize MediaPipe: ${err.message}`)
      } finally {
        setIsLoading(false)
      }
    }

    initializeMediaPipe()

    // Cleanup on unmount
    return () => {
      if (faceDetectionRef.current) {
        faceDetectionRef.current.close()
      }
      if (poseDetectionRef.current) {
        poseDetectionRef.current.close()
      }
    }
  }, [])

  const processVideo = useCallback(async (
    videoElement: HTMLVideoElement,
    options: Partial<MediaPipeOptions> = {}
  ) => {
    if (!faceDetectionRef.current || !poseDetectionRef.current) {
      setError('MediaPipe models not initialized')
      return
    }

    setIsProcessing(true)
    setError(null)
    setFrames([])
    setProgress(0)

    const mergedOptions = { ...DEFAULT_OPTIONS, ...options }
    const detectedFrames: MediaPipeFrame[] = []

    try {
      // Create canvas for frame extraction
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas')
      }
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')!

      canvas.width = videoElement.videoWidth
      canvas.height = videoElement.videoHeight

      const duration = videoElement.duration
      const fps = 30 // Process at 30fps for smooth detection
      const frameCount = Math.floor(duration * fps)
      const frameInterval = 1 / fps

      console.log(`🎬 Processing ${frameCount} frames at ${fps}fps`)

      // Process frames sequentially
      for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
        const timestamp = frameIndex * frameInterval

        // Seek to specific timestamp
        videoElement.currentTime = timestamp
        await new Promise(resolve => {
          const onSeeked = () => {
            videoElement.removeEventListener('seeked', onSeeked)
            resolve(void 0)
          }
          videoElement.addEventListener('seeked', onSeeked)
        })

        // Draw current frame to canvas
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)

        const boundingBoxes: BoundingBox[] = []

        // Face detection
        if (mergedOptions.detectionType === 'face' || mergedOptions.detectionType === 'both') {
          const faceResults = await new Promise<any>((resolve) => {
            faceDetectionRef.current!.onResults = resolve
            faceDetectionRef.current!.send({ image: canvas })
          })

          if (faceResults.detections) {
            faceResults.detections.forEach((detection: any) => {
              if (detection.score[0] >= mergedOptions.minDetectionConfidence) {
                const bbox = detection.locationData.relativeBoundingBox
                boundingBoxes.push({
                  x: bbox.xMin * canvas.width,
                  y: bbox.yMin * canvas.height,
                  width: bbox.width * canvas.width,
                  height: bbox.height * canvas.height,
                  confidence: detection.score[0],
                  type: 'face'
                })
              }
            })
          }
        }

        // Pose detection
        if (mergedOptions.detectionType === 'pose' || mergedOptions.detectionType === 'both') {
          const poseResults = await new Promise<any>((resolve) => {
            poseDetectionRef.current!.onResults = resolve
            poseDetectionRef.current!.send({ image: canvas })
          })

          if (poseResults.poseLandmarks && poseResults.poseLandmarks.length > 0) {
            // Calculate bounding box from pose landmarks
            const landmarks = poseResults.poseLandmarks
            const xs = landmarks.map((l: any) => l.x * canvas.width)
            const ys = landmarks.map((l: any) => l.y * canvas.height)
            
            const minX = Math.min(...xs)
            const maxX = Math.max(...xs)
            const minY = Math.min(...ys)
            const maxY = Math.max(...ys)

            // Add padding around body
            const padding = 50
            boundingBoxes.push({
              x: Math.max(0, minX - padding),
              y: Math.max(0, minY - padding),
              width: Math.min(canvas.width - minX + padding, maxX - minX + 2 * padding),
              height: Math.min(canvas.height - minY + padding, maxY - minY + 2 * padding),
              confidence: 0.9, // Pose detection doesn't provide confidence per detection
              type: 'body'
            })
          }
        }

        // Apply smoothing if enabled
        if (mergedOptions.enableSmoothing && detectedFrames.length > 0) {
          const smoothedBoxes = applySmoothingFilter(boundingBoxes, detectedFrames.slice(-3))
          boundingBoxes.splice(0, boundingBoxes.length, ...smoothedBoxes)
        }

        const frame: MediaPipeFrame = {
          timestamp,
          boundingBoxes,
          frameIndex
        }

        detectedFrames.push(frame)
        setFrames([...detectedFrames]) // Update state with current progress

        // Update progress
        const progressPercent = ((frameIndex + 1) / frameCount) * 100
        setProgress(progressPercent)

        console.log(`📊 Processed frame ${frameIndex + 1}/${frameCount} - ${boundingBoxes.length} detections`)

        // Small delay to prevent UI blocking
        if (frameIndex % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1))
        }
      }

      console.log(`✅ MediaPipe processing completed: ${detectedFrames.length} frames processed`)
      
    } catch (err: any) {
      console.error('❌ MediaPipe processing failed:', err)
      setError(`Processing failed: ${err.message}`)
    } finally {
      setIsProcessing(false)
      setProgress(100)
    }
  }, [])

  const reset = useCallback(() => {
    setFrames([])
    setError(null)
    setProgress(0)
    setIsProcessing(false)
  }, [])

  return {
    isLoading,
    isProcessing,
    error,
    frames,
    processVideo,
    reset,
    progress
  }
}

/**
 * Apply temporal smoothing to bounding boxes to reduce jitter
 */
function applySmoothingFilter(
  currentBoxes: BoundingBox[],
  previousFrames: MediaPipeFrame[]
): BoundingBox[] {
  if (previousFrames.length === 0) return currentBoxes

  return currentBoxes.map(currentBox => {
    // Find similar box in previous frames (same type, overlapping position)
    const historicalBoxes: BoundingBox[] = []
    
    previousFrames.forEach(frame => {
      const matchingBox = frame.boundingBoxes.find(box => 
        box.type === currentBox.type &&
        Math.abs(box.x - currentBox.x) < 50 &&
        Math.abs(box.y - currentBox.y) < 50
      )
      if (matchingBox) historicalBoxes.push(matchingBox)
    })

    if (historicalBoxes.length === 0) return currentBox

    // Apply exponential moving average for smoothing
    const alpha = 0.3 // Smoothing factor (0 = no change, 1 = no smoothing)
    
    const avgX = historicalBoxes.reduce((sum, box) => sum + box.x, 0) / historicalBoxes.length
    const avgY = historicalBoxes.reduce((sum, box) => sum + box.y, 0) / historicalBoxes.length
    const avgWidth = historicalBoxes.reduce((sum, box) => sum + box.width, 0) / historicalBoxes.length
    const avgHeight = historicalBoxes.reduce((sum, box) => sum + box.height, 0) / historicalBoxes.length

    return {
      ...currentBox,
      x: alpha * currentBox.x + (1 - alpha) * avgX,
      y: alpha * currentBox.y + (1 - alpha) * avgY,
      width: alpha * currentBox.width + (1 - alpha) * avgWidth,
      height: alpha * currentBox.height + (1 - alpha) * avgHeight,
    }
  })
}