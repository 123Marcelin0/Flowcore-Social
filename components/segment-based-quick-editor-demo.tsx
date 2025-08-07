'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { EnhancedLiquidGlass } from './ui/enhanced-liquid-glass'
import SegmentBasedQuickEditor from './segment-based-quick-editor'
import { Play, Pause, RotateCcw } from 'lucide-react'

// Mock video segments data
const mockSegments = [
  {
    id: 'segment-1',
    type: 'video' as const,
    startTime: 0,
    duration: 8,
    thumbnailUrl: '/api/placeholder/120/80',
    title: 'Opening Scene',
    content: {
      text: 'Welcome to our amazing product',
      videoUrl: '/videos/opening.mp4'
    },
    captions: [{
      id: 'caption-1',
      text: 'Welcome to our amazing product',
      startTime: 0,
      duration: 8,
      style: {
        fontSize: 24,
        color: '#ffffff',
        position: 'bottom' as const,
        fontWeight: 'bold' as const
      }
    }],
    audio: {
      volume: 0.8,
      fadeIn: 1,
      fadeOut: 1,
      musicTrack: 'upbeat-intro',
      waveformData: Array.from({ length: 80 }, () => Math.random() * 0.8 + 0.1)
    },
    transformations: {
      scale: 1,
      rotation: 0,
      opacity: 1,
      blur: 0,
      brightness: 1,
      contrast: 1
    }
  },
  {
    id: 'segment-2',
    type: 'image' as const,
    startTime: 8,
    duration: 5,
    thumbnailUrl: '/api/placeholder/120/80',
    title: 'Product Showcase',
    content: {
      text: 'Check out these features',
      imageUrl: '/images/product.jpg'
    },
    captions: [{
      id: 'caption-2',
      text: 'Check out these features',
      startTime: 0,
      duration: 5,
      style: {
        fontSize: 28,
        color: '#ffffff',
        position: 'center' as const,
        fontWeight: 'bold' as const
      }
    }],
    audio: {
      volume: 0.6,
      fadeIn: 0.5,
      fadeOut: 0.5,
      waveformData: Array.from({ length: 50 }, () => Math.random() * 0.6 + 0.2)
    },
    transformations: {
      scale: 1.1,
      rotation: 0,
      opacity: 1,
      blur: 0,
      brightness: 1.1,
      contrast: 1.2
    }
  },
  {
    id: 'segment-3',
    type: 'text' as const,
    startTime: 13,
    duration: 4,
    thumbnailUrl: '/api/placeholder/120/80',
    title: 'Call to Action',
    content: {
      text: 'Get started today!'
    },
    captions: [{
      id: 'caption-3',
      text: 'Get started today!',
      startTime: 0,
      duration: 4,
      style: {
        fontSize: 32,
        color: '#ffffff',
        position: 'center' as const,
        fontWeight: 'bold' as const
      }
    }],
    audio: {
      volume: 0.7,
      fadeIn: 0,
      fadeOut: 2,
      musicTrack: 'dramatic-build',
      waveformData: Array.from({ length: 40 }, () => Math.random() * 0.9 + 0.1)
    },
    transformations: {
      scale: 1,
      rotation: 0,
      opacity: 1,
      blur: 0,
      brightness: 1,
      contrast: 1
    }
  },
  {
    id: 'segment-4',
    type: 'transition' as const,
    startTime: 17,
    duration: 2,
    thumbnailUrl: '/api/placeholder/120/80',
    title: 'Fade Transition',
    content: {},
    audio: {
      volume: 0.3,
      fadeIn: 0,
      fadeOut: 0,
      waveformData: Array.from({ length: 20 }, () => Math.random() * 0.3 + 0.1)
    },
    transformations: {
      scale: 1,
      rotation: 0,
      opacity: 0.5,
      blur: 2,
      brightness: 1,
      contrast: 1
    }
  },
  {
    id: 'segment-5',
    type: 'video' as const,
    startTime: 19,
    duration: 6,
    thumbnailUrl: '/api/placeholder/120/80',
    title: 'Closing Scene',
    content: {
      text: 'Thank you for watching',
      videoUrl: '/videos/closing.mp4'
    },
    captions: [{
      id: 'caption-5',
      text: 'Thank you for watching',
      startTime: 0,
      duration: 6,
      style: {
        fontSize: 24,
        color: '#ffffff',
        position: 'bottom' as const,
        fontWeight: 'bold' as const
      }
    }],
    audio: {
      volume: 0.5,
      fadeIn: 1,
      fadeOut: 3,
      musicTrack: 'ambient-outro',
      waveformData: Array.from({ length: 60 }, () => Math.random() * 0.5 + 0.2)
    },
    transformations: {
      scale: 1,
      rotation: 0,
      opacity: 1,
      blur: 0,
      brightness: 0.9,
      contrast: 1.1
    }
  }
]

export default function SegmentBasedQuickEditorDemo() {
  const [segments, setSegments] = useState(mockSegments)
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false)
  const [previewTime, setPreviewTime] = useState(0)
  const [lastUpdate, setLastUpdate] = useState(Date.now())

  const handleSegmentUpdate = (segmentId: string, updates: Partial<typeof mockSegments[0]>) => {
    setSegments(prev => prev.map(segment => 
      segment.id === segmentId 
        ? { ...segment, ...updates }
        : segment
    ))
  }

  const handlePreviewUpdate = () => {
    setLastUpdate(Date.now())
    // In a real implementation, this would trigger video re-rendering
    console.log('Preview updated at:', new Date().toLocaleTimeString())
  }

  const resetSegments = () => {
    setSegments(mockSegments)
    setLastUpdate(Date.now())
  }

  const togglePreview = () => {
    setIsPreviewPlaying(!isPreviewPlaying)
  }

  const totalDuration = segments.reduce((total, segment) => 
    Math.max(total, segment.startTime + segment.duration), 0
  )

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <EnhancedLiquidGlass
          variant="editor"
          intensity="premium"
          className="p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Segment-Based Quick Editor
              </h1>
              <p className="text-white/70">
                Click on segments to edit captions, transformations, and audio inline
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-sm text-white/60">
                Total: {formatTime(totalDuration)} • {segments.length} segments
              </div>
              
              <motion.button
                onClick={resetSegments}
                className="p-2 text-white/60 hover:text-white transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                title="Reset segments"
              >
                <RotateCcw className="w-5 h-5" />
              </motion.button>
              
              <motion.button
                onClick={togglePreview}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500/30 text-blue-300 rounded-lg hover:bg-blue-500/40 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isPreviewPlaying ? (
                  <>
                    <Pause className="w-4 h-4" />
                    Pause Preview
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Play Preview
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </EnhancedLiquidGlass>

        {/* Video Preview Area */}
        <EnhancedLiquidGlass
          variant="editor"
          intensity="premium"
          className="p-6"
        >
          <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
            {/* Mock video preview */}
            <div className="w-full h-full bg-gradient-to-br from-blue-900/50 to-purple-900/50 flex items-center justify-center">
              <div className="text-center text-white/60">
                <div className="text-6xl mb-4">🎬</div>
                <div className="text-xl font-medium mb-2">Video Preview</div>
                <div className="text-sm">
                  {isPreviewPlaying ? 'Playing...' : 'Paused'} • {formatTime(previewTime)}
                </div>
                <div className="text-xs mt-2 opacity-60">
                  Last updated: {new Date(lastUpdate).toLocaleTimeString()}
                </div>
              </div>
            </div>

            {/* Play/Pause overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.button
                onClick={togglePreview}
                className="p-4 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: isPreviewPlaying ? 0 : 1 }}
                transition={{ duration: 0.3 }}
              >
                {isPreviewPlaying ? (
                  <Pause className="w-8 h-8" />
                ) : (
                  <Play className="w-8 h-8 ml-1" />
                )}
              </motion.button>
            </div>
          </div>
        </EnhancedLiquidGlass>

        {/* Segment-Based Quick Editor */}
        <SegmentBasedQuickEditor
          segments={segments}
          onSegmentUpdate={handleSegmentUpdate}
          onPreviewUpdate={handlePreviewUpdate}
        />

        {/* Instructions */}
        <EnhancedLiquidGlass
          variant="editor"
          intensity="medium"
          className="p-4"
        >
          <div className="text-sm text-white/70">
            <h4 className="font-medium text-white/90 mb-2">How to use:</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>Click the <strong>Type</strong> icon on any segment to edit captions inline</li>
              <li>Click the <strong>Wand</strong> icon to adjust transformations (scale, rotation, effects)</li>
              <li>Click the <strong>Music</strong> icon to modify audio settings with waveform visualization</li>
              <li>Changes are applied in real-time with preview updates</li>
              <li>Yellow dots indicate segments with unsaved changes</li>
            </ul>
          </div>
        </EnhancedLiquidGlass>
      </div>
    </div>
  )
}