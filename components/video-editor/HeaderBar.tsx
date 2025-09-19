"use client"

import React, { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Image as ImageIcon, LayoutGrid, MousePointerClick, Play, Plus, Type as TypeIcon } from 'lucide-react'
import { UnifiedVideoProcessor } from './UnifiedVideoProcessor'
import { IntelligentVideoProcessor, ProcessingOptions } from '@/lib/intelligent-video-processor'

export function HeaderBar({
  onBack,
  onVideoProcessed,
  onTogglePlay,
  isPlaying,
  setActiveTool,
  activeTool,
  showProjectVideoPanel,
  setShowProjectVideoPanel,
  onExport
}: {
  onBack: () => void
  onVideoProcessed: (uploadId: string, processedVideoUrl?: string) => void
  onTogglePlay: () => void
  isPlaying: boolean
  setActiveTool: (tool: 'mouse' | 'text' | 'forms' | 'image') => void
  activeTool?: string
  showProjectVideoPanel: boolean
  setShowProjectVideoPanel: (val: boolean) => void
  onExport?: () => void
}) {
  const [showUnifiedProcessor, setShowUnifiedProcessor] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState('')
  const [processingProgress, setProcessingProgress] = useState(0)

  // Debug function for button clicks
  const handleToolClick = (tool: 'mouse' | 'text' | 'forms' | 'image') => {
    console.log('HeaderBar button clicked:', tool)
    setActiveTool(tool)
  }

  const handleVideoProcess = async (file: File, options: ProcessingOptions) => {
    setIsProcessing(true)
    setProcessingStep('Starting intelligent processing...')
    setProcessingProgress(0)

    try {
      const result = await IntelligentVideoProcessor.processVideo(
        file,
        options,
        (step: string, progress: number) => {
          setProcessingStep(step)
          setProcessingProgress(progress)
        }
      )

      if (result.success) {
        setProcessingStep('Processing complete!')
        setProcessingProgress(100)
        
        console.log('✅ Video processing completed:', {
          uploadId: result.uploadId,
          processedVideoUrl: result.processedVideoUrl,
          stats: result.stats
        })
        
        // Notify parent component with the processed video
        onVideoProcessed(result.uploadId, result.processedVideoUrl)
        
        // Show success message
        const stats = result.stats
        setTimeout(() => {
          alert(`🎬 Video Processing Complete!\n\n📊 Results:\n• Original: ${stats.originalDuration.toFixed(1)}s\n• Final: ${stats.finalDuration.toFixed(1)}s\n• Words analyzed: ${stats.wordsAnalyzed}\n• Confidence: ${(stats.confidenceScore * 100).toFixed(1)}%\n\nYour video is now ready in the editor! 🚀`)
        }, 800)
        
        // Close processor after delay
        setTimeout(() => {
          setShowUnifiedProcessor(false)
          setIsProcessing(false)
        }, 2000)
      } else {
        throw new Error(result.error || 'Processing failed')
      }
    } catch (error: any) {
      console.error('Video processing failed:', error)
      setProcessingStep('Processing failed')
      setProcessingProgress(0)
      
      // Provide comprehensive error handling with user-friendly messages
      let userMessage = error.message || 'Unknown error occurred'
      let shouldCloseProcessor = true
      
      if (error.message?.includes('Upload failed')) {
        userMessage = '🚨 Upload Failed\n\nCould not upload your video. This might be due to:\n• Network connection issues\n• File size too large\n• Authentication problems\n\nPlease check your connection and try again.'
      } else if (error.message?.includes('Authentication')) {
        userMessage = '🔐 Authentication Required\n\nPlease log in to upload and process videos.\n\nIf you are already logged in, try refreshing the page.'
      } else if (error.message?.includes('Transcription failed') || error.message?.includes('no segments')) {
        userMessage = '🎤 Transcription Issue\n\nWe couldn\'t process the audio in your video. This might be because:\n• The video has very quiet or no audio\n• The audio format isn\'t supported\n• Network issues during processing\n\nWould you like to:\n• Try again with a video that has clear audio\n• Continue with visual-only processing'
        shouldCloseProcessor = false // Keep open for retry
      } else if (error.message?.includes('Server error') || error.message?.includes('500')) {
        userMessage = '⚠️ Server Error\n\nOur servers are experiencing issues. Please:\n• Wait a few minutes\n• Try again\n• Contact support if the problem persists'
      } else if (error.message?.includes('Network error') || error.message?.includes('timeout')) {
        userMessage = '🌐 Network Error\n\nConnection issues detected. Please:\n• Check your internet connection\n• Try again in a moment\n• Use a smaller video file if the issue persists'
      } else if (error.message?.includes('format') || error.message?.includes('unsupported')) {
        userMessage = '📁 File Format Issue\n\nThe video format isn\'t supported. Please:\n• Use MP4, MOV, or AVI formats\n• Ensure the video has audio if you want transcription\n• Try converting your video to MP4'
      } else if (error.message?.includes('Configuration')) {
        userMessage = '⚙️ Configuration Issue\n\nThere\'s a setup problem with the video processing service.\n\nPlease contact support for assistance.'
      } else if (error.message?.includes('silent') || error.message?.includes('no audio')) {
        userMessage = '🔇 Silent Video Detected\n\nYour video appears to have no audio or very quiet audio.\n\nOptions:\n• Continue processing for visual-only editing\n• Upload a video with clear audio for full features\n• Check your microphone settings for future recordings'
        shouldCloseProcessor = false // Allow user to decide
      }
      
      alert(userMessage)
      setIsProcessing(false)
      
      if (shouldCloseProcessor) {
        setShowUnifiedProcessor(false)
      }
    }
  }

  return (
    <div className="px-0 pt-2 pb-0 bg-transparent">
      <div className="mx-2 flex items-center justify-between rounded-[16px] border border-white/10 px-3 py-2 relative" style={{ background: 'linear-gradient(135deg, #2a2a2a 0%, #1f1f1f 50%, #141414 100%)', boxShadow: 'inset 2px 2px 4px rgba(255,255,255,0.03), inset -2px -2px 4px rgba(0,0,0,0.2)' }}>
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="h-10 px-3 rounded-[14px] border border-white/30 text-white/90 flex items-center gap-2">
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>
          <button 
            onClick={() => setShowUnifiedProcessor(true)}
            className="h-10 px-3 rounded-[14px] border border-emerald-400/50 text-white/90 flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm">Add Video</span>
          </button>
          <div className="flex items-center gap-2">
            <button className="h-10 w-10 rounded-[14px] border border-white/30 text-white/90 flex items-center justify-center" aria-label="Backwards">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button className="h-10 w-10 rounded-[14px] border border-white/30 text-white/90 flex items-center justify-center" aria-label="Forwards">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="absolute flex items-center gap-4 z-20" style={{ left: '50%', transform: 'translateX(-50%)' }}>
          {/* Moving highlight background */}
          <div
            className="absolute rounded-[12px] bg-white/10 transition-all duration-300 ease-out"
            style={{
              width: '52px',
              height: '40px',
              left: activeTool === 'mouse' ? '0px' : activeTool === 'text' ? '56px' : activeTool === 'forms' ? '112px' : '168px',
            }}
          />

          {/* Tool buttons */}
          <button
            onClick={() => handleToolClick('mouse')}
            className={`relative z-10 h-10 w-10 rounded-[10px] flex items-center justify-center transition-all ${
              activeTool === 'mouse' ? 'text-white' : 'text-white/60 hover:text-white/80'
            }`}
            aria-label="Mouse"
          >
            <MousePointerClick className="w-5 h-5" strokeWidth={1.2} />
          </button>
          <button
            onClick={() => handleToolClick('text')}
            className={`relative z-10 h-10 w-10 rounded-[10px] flex items-center justify-center transition-all ${
              activeTool === 'text' ? 'text-white' : 'text-white/60 hover:text-white/80'
            }`}
            aria-label="Text"
          >
            <TypeIcon className="w-5 h-5" strokeWidth={1.2} />
          </button>
          <button
            onClick={() => handleToolClick('forms')}
            className={`relative z-10 h-10 w-10 rounded-[10px] flex items-center justify-center transition-all ${
              activeTool === 'forms' ? 'text-white' : 'text-white/60 hover:text-white/80'
            }`}
            aria-label="Forms"
          >
            <LayoutGrid className="w-5 h-5" strokeWidth={1.2} />
          </button>
          <button
            onClick={() => handleToolClick('image')}
            className={`relative z-10 h-10 w-10 rounded-[10px] flex items-center justify-center transition-all ${
              activeTool === 'image' ? 'text-white' : 'text-white/60 hover:text-white/80'
            }`}
            aria-label="Image"
          >
            <ImageIcon className="w-5 h-5" strokeWidth={1.2} />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button className="h-10 w-10 rounded-[14px] border border-white/30 text-white/90 flex items-center justify-center" aria-label="Play" onClick={onTogglePlay}>
            <Play className="w-4 h-4" strokeWidth={1.5} />
          </button>
          <button onClick={() => onExport && onExport()} className="h-10 px-3 rounded-[14px] border border-white/30 text-white/90 flex items-center">
            <span className="text-sm">Export</span>
          </button>
        </div>
      </div>
      
      {/* Unified Video Processor */}
      <UnifiedVideoProcessor
        isOpen={showUnifiedProcessor}
        onClose={() => setShowUnifiedProcessor(false)}
        onVideoProcess={handleVideoProcess}
        isProcessing={isProcessing}
        processingStep={processingStep}
        processingProgress={processingProgress}
      />
    </div>
  )
}