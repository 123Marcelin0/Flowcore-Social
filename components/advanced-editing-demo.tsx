"use client"

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { VideoPreviewPanel } from './video-preview-panel'
import { QuickEditInterface } from './quick-edit-interface'
import { SegmentEditor } from './segment-editor'
import { EffectsTransitionsPanel } from './effects-transitions-panel'
import { EnhancedLiquidGlass } from './ui/enhanced-liquid-glass'
import { Play, Edit, Layers, Sparkles } from 'lucide-react'

// Sample data for demonstration
const sampleSegments = [
  {
    id: 'segment-1',
    type: 'video' as const,
    startTime: 0,
    duration: 5,
    thumbnailUrl: '/placeholder.jpg',
    title: 'Opening Scene',
    content: {
      text: 'Welcome to our amazing product!',
      effects: ['fade-in'],
      transitions: ['crossfade'],
    },
    visible: true,
    locked: false,
    volume: 1,
  },
  {
    id: 'segment-2',
    type: 'image' as const,
    startTime: 5,
    duration: 3,
    thumbnailUrl: '/placeholder.jpg',
    title: 'Product Shot',
    content: {
      text: 'Check out these features',
      effects: ['zoom-in', 'color-pop'],
    },
    visible: true,
    locked: false,
    volume: 0.8,
  },
  {
    id: 'segment-3',
    type: 'text' as const,
    startTime: 8,
    duration: 4,
    thumbnailUrl: '/placeholder.jpg',
    title: 'Call to Action',
    content: {
      text: 'Get started today!',
      effects: ['glitch'],
      transitions: ['slide-left'],
    },
    visible: true,
    locked: false,
    volume: 1,
  },
]

export function AdvancedEditingDemo() {
  const [activeView, setActiveView] = useState<'preview' | 'quick-edit' | 'timeline' | 'effects'>('preview')
  const [segments, setSegments] = useState(sampleSegments)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showQuickEdit, setShowQuickEdit] = useState(false)
  const [selectedSegment, setSelectedSegment] = useState<string>()

  const handleSegmentUpdate = (segmentId: string, updates: any) => {
    setSegments(prev => prev.map(segment => 
      segment.id === segmentId ? { ...segment, ...updates } : segment
    ))
  }

  const handleSegmentDelete = (segmentId: string) => {
    setSegments(prev => prev.filter(segment => segment.id !== segmentId))
  }

  const handleSegmentDuplicate = (segmentId: string) => {
    const segment = segments.find(s => s.id === segmentId)
    if (segment) {
      const newSegment = {
        ...segment,
        id: `${segmentId}-copy`,
        startTime: segment.startTime + segment.duration,
        title: `${segment.title} (Copy)`
      }
      setSegments(prev => [...prev, newSegment])
    }
  }

  const handleSegmentSplit = (segmentId: string, splitTime: number) => {
    const segment = segments.find(s => s.id === segmentId)
    if (segment) {
      const firstPart = {
        ...segment,
        duration: splitTime - segment.startTime,
        title: `${segment.title} (Part 1)`
      }
      const secondPart = {
        ...segment,
        id: `${segmentId}-split`,
        startTime: splitTime,
        duration: segment.duration - (splitTime - segment.startTime),
        title: `${segment.title} (Part 2)`
      }
      setSegments(prev => prev.map(s => s.id === segmentId ? firstPart : s).concat(secondPart))
    }
  }

  const views = [
    { id: 'preview', name: 'Preview', icon: Play },
    { id: 'quick-edit', name: 'Quick Edit', icon: Edit },
    { id: 'timeline', name: 'Timeline', icon: Layers },
    { id: 'effects', name: 'Effects', icon: Sparkles },
  ]

  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-4">
      <div className="h-full flex flex-col gap-4">
        {/* Header */}
        <EnhancedLiquidGlass
          variant="editor"
          intensity="premium"
          className="flex-shrink-0 p-4"
        >
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-white">Advanced Editing Interface Demo</h1>
            
            <div className="flex items-center gap-2">
              {views.map((view) => {
                const Icon = view.icon
                return (
                  <motion.button
                    key={view.id}
                    onClick={() => setActiveView(view.id as any)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeView === view.id
                        ? 'bg-white/20 text-white shadow-lg'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Icon className="w-4 h-4" />
                    {view.name}
                  </motion.button>
                )
              })}
            </div>
          </div>
        </EnhancedLiquidGlass>

        {/* Main Content */}
        <div className="flex-1 min-h-0">
          {activeView === 'preview' && (
            <VideoPreviewPanel
              videoSrc="/sample-video.mp4"
              poster="/placeholder.jpg"
              onTimeUpdate={(current, duration) => setCurrentTime(current)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              className="h-full"
            />
          )}

          {activeView === 'quick-edit' && (
            <div className="h-full">
              <EnhancedLiquidGlass
                variant="editor"
                intensity="premium"
                className="h-full p-6 flex items-center justify-center"
              >
                <div className="text-center">
                  <Edit className="w-16 h-16 text-white/40 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white/90 mb-2">Quick Edit Interface</h3>
                  <p className="text-white/60 mb-4">
                    Click the button below to open the quick edit modal
                  </p>
                  <motion.button
                    onClick={() => setShowQuickEdit(true)}
                    className="px-6 py-3 bg-blue-500/30 text-blue-200 hover:bg-blue-500/40 rounded-lg font-medium transition-all"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Open Quick Edit
                  </motion.button>
                </div>
              </EnhancedLiquidGlass>

              <QuickEditInterface
                isOpen={showQuickEdit}
                onClose={() => setShowQuickEdit(false)}
                segments={segments}
                currentSegment={0}
                onSegmentUpdate={handleSegmentUpdate}
                onApplyChanges={() => console.log('Changes applied')}
                videoPreviewUrl="/sample-video.mp4"
              />
            </div>
          )}

          {activeView === 'timeline' && (
            <SegmentEditor
              segments={segments}
              onSegmentUpdate={handleSegmentUpdate}
              onSegmentDelete={handleSegmentDelete}
              onSegmentDuplicate={handleSegmentDuplicate}
              onSegmentSplit={handleSegmentSplit}
              onSegmentReorder={(from, to) => console.log('Reorder:', from, to)}
              currentTime={currentTime}
              totalDuration={60}
              onTimeChange={setCurrentTime}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              isPlaying={isPlaying}
              className="h-full"
            />
          )}

          {activeView === 'effects' && (
            <EffectsTransitionsPanel
              selectedSegmentId={selectedSegment}
              onEffectApply={(segmentId, effect) => {
                console.log('Apply effect:', effect.name, 'to segment:', segmentId)
                handleSegmentUpdate(segmentId, {
                  content: {
                    ...segments.find(s => s.id === segmentId)?.content,
                    effects: [...(segments.find(s => s.id === segmentId)?.content.effects || []), effect.id]
                  }
                })
              }}
              onMusicApply={(track) => console.log('Apply music:', track.name)}
              onPreviewEffect={(effect) => console.log('Preview effect:', effect.name)}
              onPreviewMusic={(track) => console.log('Preview music:', track.name)}
              className="h-full"
            />
          )}
        </div>

        {/* Footer Info */}
        <EnhancedLiquidGlass
          variant="editor"
          intensity="medium"
          className="flex-shrink-0 p-3"
        >
          <div className="flex items-center justify-between text-sm text-white/70">
            <div>
              Current View: <span className="text-white font-medium">{views.find(v => v.id === activeView)?.name}</span>
            </div>
            <div>
              Segments: <span className="text-white font-medium">{segments.length}</span> | 
              Duration: <span className="text-white font-medium">
                {Math.floor(segments.reduce((acc, s) => acc + s.duration, 0) / 60)}:
                {Math.floor(segments.reduce((acc, s) => acc + s.duration, 0) % 60).toString().padStart(2, '0')}
              </span>
            </div>
          </div>
        </EnhancedLiquidGlass>
      </div>
    </div>
  )
}