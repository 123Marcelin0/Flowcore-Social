'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useMediaPipeBoundingBox, BoundingBox, MediaPipeFrame } from '@/hooks/useMediaPipeBoundingBox'
import { 
  computeCleanTransforms, 
  transformsToEDL, 
  previewTransforms,
  CleanTransform 
} from '@/lib/clean-transforms'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Play, Pause, RotateCcw, Download, Eye, EyeOff } from 'lucide-react'

interface MediaPipeProcessorProps {
  videoFile: File | null
  onTransformsGenerated?: (transforms: CleanTransform[], edl: any) => void
  className?: string
}

export function MediaPipeProcessor({ 
  videoFile, 
  onTransformsGenerated,
  className = '' 
}: MediaPipeProcessorProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [videoResolution, setVideoResolution] = useState({ width: 1920, height: 1080 })
  
  // MediaPipe processing state
  const {
    isLoading,
    isProcessing,
    error,
    frames,
    processVideo,
    reset,
    progress
  } = useMediaPipeBoundingBox()
  
  // Transform computation state
  const [transforms, setTransforms] = useState<CleanTransform[]>([])
  const [edlData, setEdlData] = useState<any>(null)
  
  // UI state
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true)
  const [showTransforms, setShowTransforms] = useState(true)
  const [processingOptions, setProcessingOptions] = useState({
    detectionType: 'both' as 'face' | 'pose' | 'both',
    targetAspectRatio: 9/16, // Instagram Reels
    maxZoomLevel: 2.0,
    minZoomLevel: 1.0,
    paddingPercent: 0.15,
    confidenceThreshold: 0.6,
    enableSmoothing: true
  })
  
  // Initialize video when file changes
  useEffect(() => {
    if (videoFile) {
      const url = URL.createObjectURL(videoFile)
      setVideoUrl(url)
      return () => URL.revokeObjectURL(url)
    } else {
      setVideoUrl(null)
    }
  }, [videoFile])
  
  // Video event handlers
  const handleVideoLoad = useCallback(() => {
    const video = videoRef.current
    if (video) {
      setDuration(video.duration)
      setVideoResolution({
        width: video.videoWidth,
        height: video.videoHeight
      })
      console.log(`📹 Video loaded: ${video.videoWidth}x${video.videoHeight}, ${video.duration.toFixed(1)}s`)
    }
  }, [])
  
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current
    if (video) {
      setCurrentTime(video.currentTime)
    }
  }, [])
  
  const togglePlayPause = useCallback(() => {
    const video = videoRef.current
    if (video) {
      if (video.paused) {
        video.play()
        setIsPlaying(true)
      } else {
        video.pause()
        setIsPlaying(false)
      }
    }
  }, [])
  
  const seekTo = useCallback((time: number) => {
    const video = videoRef.current
    if (video) {
      video.currentTime = time
      setCurrentTime(time)
    }
  }, [])
  
  // MediaPipe processing
  const handleProcessVideo = useCallback(async () => {
    const video = videoRef.current
    if (!video || !videoFile) return
    
    console.log('🎬 Starting MediaPipe video processing...')
    
    await processVideo(video, {
      detectionType: processingOptions.detectionType,
      minDetectionConfidence: processingOptions.confidenceThreshold,
      minTrackingConfidence: processingOptions.confidenceThreshold,
      modelComplexity: 1,
      enableSmoothing: processingOptions.enableSmoothing
    })
  }, [videoFile, processingOptions, processVideo])
  
  // Compute transforms from MediaPipe frames
  const handleComputeTransforms = useCallback(() => {
    if (frames.length === 0) return
    
    console.log('🎯 Computing clean transforms from MediaPipe data...')
    
    const cleanTransforms = computeCleanTransforms(frames, videoResolution, {
      targetAspectRatio: processingOptions.targetAspectRatio,
      maxZoomLevel: processingOptions.maxZoomLevel,
      minZoomLevel: processingOptions.minZoomLevel,
      paddingPercent: processingOptions.paddingPercent,
      confidenceThreshold: processingOptions.confidenceThreshold
    })
    
    const edl = transformsToEDL(cleanTransforms, videoResolution)
    
    setTransforms(cleanTransforms)
    setEdlData(edl)
    
    // Notify parent component
    onTransformsGenerated?.(cleanTransforms, edl)
    
    console.log(`✅ Generated ${cleanTransforms.length} clean transforms`)
  }, [frames, videoResolution, processingOptions, onTransformsGenerated])
  
  // Canvas overlay rendering
  useEffect(() => {
    const canvas = canvasRef.current
    const video = videoRef.current
    
    if (!canvas || !video || !showBoundingBoxes) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const renderOverlay = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Find current frame data
      const currentFrame = frames.find(frame => 
        Math.abs(frame.timestamp - currentTime) < 0.1
      )
      
      if (!currentFrame || currentFrame.boundingBoxes.length === 0) return
      
      // Scale factor from video to canvas
      const scaleX = canvas.width / videoResolution.width
      const scaleY = canvas.height / videoResolution.height
      
      // Draw bounding boxes
      currentFrame.boundingBoxes.forEach((box, index) => {
        const x = box.x * scaleX
        const y = box.y * scaleY
        const width = box.width * scaleX
        const height = box.height * scaleY
        
        // Box styling based on type
        ctx.strokeStyle = box.type === 'face' ? '#22c55e' : '#3b82f6'
        ctx.lineWidth = 2
        ctx.fillStyle = box.type === 'face' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(59, 130, 246, 0.1)'
        
        // Draw box
        ctx.fillRect(x, y, width, height)
        ctx.strokeRect(x, y, width, height)
        
        // Draw label
        ctx.fillStyle = box.type === 'face' ? '#22c55e' : '#3b82f6'
        ctx.font = '12px sans-serif'
        ctx.fillText(
          `${box.type} ${(box.confidence * 100).toFixed(0)}%`,
          x,
          y - 5
        )
      })
      
      // Draw transform visualization if enabled
      if (showTransforms) {
        const activeTransform = transforms.find(transform => 
          currentTime >= transform.timestamp && 
          currentTime <= transform.timestamp + transform.duration
        )
        
        if (activeTransform) {
          // Draw transform info
          ctx.fillStyle = '#f59e0b'
          ctx.font = 'bold 14px sans-serif'
          ctx.fillText(
            `Transform: ${activeTransform.scale.toFixed(2)}x scale, (${activeTransform.x.toFixed(0)}, ${activeTransform.y.toFixed(0)}) offset`,
            10,
            30
          )
          
          // Draw center crosshair
          const centerX = canvas.width / 2 + (activeTransform.x * scaleX)
          const centerY = canvas.height / 2 + (activeTransform.y * scaleY)
          
          ctx.strokeStyle = '#f59e0b'
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(centerX - 10, centerY)
          ctx.lineTo(centerX + 10, centerY)
          ctx.moveTo(centerX, centerY - 10)
          ctx.lineTo(centerX, centerY + 10)
          ctx.stroke()
        }
      }
    }
    
    renderOverlay()
  }, [currentTime, frames, transforms, showBoundingBoxes, showTransforms, videoResolution])
  
  const handleReset = useCallback(() => {
    reset()
    setTransforms([])
    setEdlData(null)
    setCurrentTime(0)
    setIsPlaying(false)
  }, [reset])
  
  const handleDownloadResults = useCallback(() => {
    if (!transforms.length || !edlData) return
    
    const results = {
      transforms,
      edl: edlData,
      preview: previewTransforms(transforms, videoResolution),
      metadata: {
        videoFile: videoFile?.name,
        videoResolution,
        processingOptions,
        timestamp: new Date().toISOString()
      }
    }
    
    const blob = new Blob([JSON.stringify(results, null, 2)], {
      type: 'application/json'
    })
    
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mediapipe-transforms-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [transforms, edlData, videoResolution, videoFile, processingOptions])
  
  if (!videoFile) {
    return (
      <Card className={className}>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">Please select a video file to begin MediaPipe processing</p>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Video Preview with Overlay */}
      <Card>
        <CardHeader>
          <CardTitle>MediaPipe Video Processing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative w-full max-w-2xl mx-auto">
            {videoUrl && (
              <>
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="w-full h-auto bg-black rounded-lg"
                  onLoadedMetadata={handleVideoLoad}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={() => setIsPlaying(false)}
                />
                <canvas
                  ref={canvasRef}
                  width={videoResolution.width}
                  height={videoResolution.height}
                  className="absolute inset-0 w-full h-full pointer-events-none rounded-lg"
                  style={{ aspectRatio: `${videoResolution.width}/${videoResolution.height}` }}
                />
              </>
            )}
          </div>
          
          {/* Video Controls */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={togglePlayPause}
                disabled={!videoUrl}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              
              <div className="flex-1">
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  value={currentTime}
                  onChange={(e) => seekTo(Number(e.target.value))}
                  className="w-full"
                  disabled={!videoUrl}
                />
              </div>
              
              <span className="text-sm text-muted-foreground min-w-[60px]">
                {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={showBoundingBoxes}
                  onCheckedChange={setShowBoundingBoxes}
                />
                <label className="text-sm">Show Detections</label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  checked={showTransforms}
                  onCheckedChange={setShowTransforms}
                />
                <label className="text-sm">Show Transforms</label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Processing Options */}
      <Card>
        <CardHeader>
          <CardTitle>Processing Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Detection Type</label>
              <select
                value={processingOptions.detectionType}
                onChange={(e) => setProcessingOptions(prev => ({
                  ...prev,
                  detectionType: e.target.value as 'face' | 'pose' | 'both'
                }))}
                className="w-full mt-1 p-2 border rounded"
              >
                <option value="both">Face + Body</option>
                <option value="face">Face Only</option>
                <option value="pose">Body Only</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Target Aspect Ratio</label>
              <select
                value={processingOptions.targetAspectRatio}
                onChange={(e) => setProcessingOptions(prev => ({
                  ...prev,
                  targetAspectRatio: Number(e.target.value)
                }))}
                className="w-full mt-1 p-2 border rounded"
              >
                <option value={9/16}>9:16 (Instagram Reels)</option>
                <option value={16/9}>16:9 (Landscape)</option>
                <option value={1}>1:1 (Square)</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Max Zoom Level: {processingOptions.maxZoomLevel.toFixed(1)}x</label>
              <Slider
                value={[processingOptions.maxZoomLevel]}
                onValueChange={([value]) => setProcessingOptions(prev => ({
                  ...prev,
                  maxZoomLevel: value
                }))}
                min={1.0}
                max={3.0}
                step={0.1}
                className="mt-2"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Confidence Threshold: {(processingOptions.confidenceThreshold * 100).toFixed(0)}%</label>
              <Slider
                value={[processingOptions.confidenceThreshold]}
                onValueChange={([value]) => setProcessingOptions(prev => ({
                  ...prev,
                  confidenceThreshold: value
                }))}
                min={0.3}
                max={0.9}
                step={0.05}
                className="mt-2"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              checked={processingOptions.enableSmoothing}
              onCheckedChange={(checked) => setProcessingOptions(prev => ({
                ...prev,
                enableSmoothing: checked
              }))}
            />
            <label className="text-sm">Enable Temporal Smoothing</label>
          </div>
        </CardContent>
      </Card>
      
      {/* Processing Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Processing Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleProcessVideo}
              disabled={isLoading || isProcessing || !videoUrl}
              className="flex items-center gap-2"
            >
              {isProcessing ? 'Processing...' : 'Start Detection'}
            </Button>
            
            <Button
              onClick={handleComputeTransforms}
              disabled={frames.length === 0}
              variant="outline"
              className="flex items-center gap-2"
            >
              Compute Transforms
            </Button>
            
            <Button
              onClick={handleReset}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            
            <Button
              onClick={handleDownloadResults}
              disabled={!transforms.length}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export Results
            </Button>
          </div>
          
          {isProcessing && (
            <div className="mt-4">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground mt-1">
                Processing: {progress.toFixed(1)}%
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {/* Results Summary */}
      {(frames.length > 0 || transforms.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Processing Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium">Frames Processed</p>
                <p className="text-2xl font-bold">{frames.length}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium">Detections</p>
                <p className="text-2xl font-bold">
                  {frames.reduce((sum, frame) => sum + frame.boundingBoxes.length, 0)}
                </p>
              </div>
              
              <div>
                <p className="text-sm font-medium">Transforms</p>
                <p className="text-2xl font-bold">{transforms.length}</p>
              </div>
            </div>
            
            {transforms.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Transform Summary</p>
                <div className="space-y-1">
                  {transforms.slice(0, 3).map((transform, index) => (
                    <Badge key={index} variant="outline" className="mr-2 mb-1">
                      {transform.timestamp.toFixed(1)}s: {transform.scale.toFixed(2)}x zoom
                    </Badge>
                  ))}
                  {transforms.length > 3 && (
                    <Badge variant="outline">+{transforms.length - 3} more</Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}