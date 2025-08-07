"use client"

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { EnhancedLiquidGlass } from './ui/enhanced-liquid-glass'
import { LiquidPanel } from './ui/liquid-panel'
import { 
  Sparkles, 
  Zap, 
  Palette, 
  Music, 
  Volume2, 
  VolumeX,
  Play, 
  Pause, 
  RotateCcw, 
  Download,
  Search,
  Filter,
  Star,
  Clock,
  Layers,
  Sliders,
  Eye,
  Settings,
  ChevronDown,
  ChevronRight
} from 'lucide-react'

interface Effect {
  id: string
  name: string
  category: 'visual' | 'audio' | 'transition' | 'filter'
  description: string
  previewUrl?: string
  thumbnailUrl: string
  intensity?: number
  duration?: number
  parameters?: {
    [key: string]: {
      type: 'slider' | 'color' | 'select' | 'toggle'
      value: any
      min?: number
      max?: number
      options?: string[]
      label: string
    }
  }
  isPremium?: boolean
  isPopular?: boolean
}

interface MusicTrack {
  id: string
  name: string
  artist: string
  duration: number
  genre: string
  mood: string
  bpm: number
  previewUrl: string
  waveformUrl: string
  isPremium?: boolean
}

interface EffectsTransitionsPanelProps {
  selectedSegmentId?: string
  onEffectApply: (segmentId: string, effect: Effect) => void
  onMusicApply: (track: MusicTrack, startTime?: number) => void
  onPreviewEffect: (effect: Effect) => void
  onPreviewMusic: (track: MusicTrack) => void
  className?: string
}

const visualEffects: Effect[] = [
  {
    id: 'fade-in',
    name: 'Fade In',
    category: 'visual',
    description: 'Smooth fade in transition',
    thumbnailUrl: '/effects/fade-in.jpg',
    duration: 1,
    parameters: {
      duration: { type: 'slider', value: 1, min: 0.1, max: 3, label: 'Duration' },
      easing: { type: 'select', value: 'ease-out', options: ['linear', 'ease-in', 'ease-out', 'ease-in-out'], label: 'Easing' }
    }
  },
  {
    id: 'zoom-in',
    name: 'Zoom In',
    category: 'visual',
    description: 'Dynamic zoom in effect',
    thumbnailUrl: '/effects/zoom-in.jpg',
    duration: 0.8,
    isPopular: true,
    parameters: {
      scale: { type: 'slider', value: 1.2, min: 1.1, max: 2, label: 'Scale Factor' },
      duration: { type: 'slider', value: 0.8, min: 0.2, max: 2, label: 'Duration' }
    }
  },
  {
    id: 'blur-focus',
    name: 'Blur Focus',
    category: 'filter',
    description: 'Blur to focus transition',
    thumbnailUrl: '/effects/blur-focus.jpg',
    duration: 1.2,
    isPremium: true,
    parameters: {
      blurAmount: { type: 'slider', value: 10, min: 1, max: 20, label: 'Blur Amount' },
      duration: { type: 'slider', value: 1.2, min: 0.5, max: 3, label: 'Duration' }
    }
  },
  {
    id: 'color-pop',
    name: 'Color Pop',
    category: 'filter',
    description: 'Selective color enhancement',
    thumbnailUrl: '/effects/color-pop.jpg',
    isPopular: true,
    parameters: {
      color: { type: 'color', value: '#ff0000', label: 'Target Color' },
      intensity: { type: 'slider', value: 1.5, min: 1, max: 3, label: 'Intensity' },
      tolerance: { type: 'slider', value: 0.3, min: 0.1, max: 1, label: 'Color Tolerance' }
    }
  },
  {
    id: 'glitch',
    name: 'Glitch',
    category: 'visual',
    description: 'Digital glitch effect',
    thumbnailUrl: '/effects/glitch.jpg',
    isPremium: true,
    parameters: {
      intensity: { type: 'slider', value: 0.5, min: 0.1, max: 1, label: 'Glitch Intensity' },
      frequency: { type: 'slider', value: 2, min: 0.5, max: 5, label: 'Frequency' }
    }
  },
  {
    id: 'vintage',
    name: 'Vintage Film',
    category: 'filter',
    description: 'Classic film look',
    thumbnailUrl: '/effects/vintage.jpg',
    parameters: {
      grain: { type: 'slider', value: 0.3, min: 0, max: 1, label: 'Film Grain' },
      vignette: { type: 'slider', value: 0.4, min: 0, max: 1, label: 'Vignette' },
      warmth: { type: 'slider', value: 0.2, min: -0.5, max: 0.5, label: 'Color Warmth' }
    }
  }
]

const transitionEffects: Effect[] = [
  {
    id: 'crossfade',
    name: 'Crossfade',
    category: 'transition',
    description: 'Smooth crossfade between clips',
    thumbnailUrl: '/transitions/crossfade.jpg',
    duration: 0.5,
    isPopular: true,
    parameters: {
      duration: { type: 'slider', value: 0.5, min: 0.1, max: 2, label: 'Duration' }
    }
  },
  {
    id: 'slide-left',
    name: 'Slide Left',
    category: 'transition',
    description: 'Slide transition to the left',
    thumbnailUrl: '/transitions/slide-left.jpg',
    duration: 0.8,
    parameters: {
      duration: { type: 'slider', value: 0.8, min: 0.2, max: 2, label: 'Duration' },
      easing: { type: 'select', value: 'ease-out', options: ['linear', 'ease-in', 'ease-out'], label: 'Easing' }
    }
  },
  {
    id: 'wipe-circle',
    name: 'Circle Wipe',
    category: 'transition',
    description: 'Circular wipe transition',
    thumbnailUrl: '/transitions/circle-wipe.jpg',
    duration: 1,
    isPremium: true,
    parameters: {
      direction: { type: 'select', value: 'expand', options: ['expand', 'contract'], label: 'Direction' },
      duration: { type: 'slider', value: 1, min: 0.3, max: 2, label: 'Duration' }
    }
  },
  {
    id: 'morph',
    name: 'Morph',
    category: 'transition',
    description: 'AI-powered morphing transition',
    thumbnailUrl: '/transitions/morph.jpg',
    duration: 1.5,
    isPremium: true,
    isPopular: true,
    parameters: {
      strength: { type: 'slider', value: 0.7, min: 0.1, max: 1, label: 'Morph Strength' },
      duration: { type: 'slider', value: 1.5, min: 0.5, max: 3, label: 'Duration' }
    }
  }
]

const musicTracks: MusicTrack[] = [
  {
    id: 'upbeat-energy',
    name: 'Electric Dreams',
    artist: 'SynthWave Studio',
    duration: 180,
    genre: 'Electronic',
    mood: 'Energetic',
    bpm: 128,
    previewUrl: '/music/electric-dreams-preview.mp3',
    waveformUrl: '/music/electric-dreams-waveform.svg'
  },
  {
    id: 'chill-vibes',
    name: 'Sunset Boulevard',
    artist: 'Chill Collective',
    duration: 200,
    genre: 'Ambient',
    mood: 'Relaxed',
    bpm: 85,
    previewUrl: '/music/sunset-boulevard-preview.mp3',
    waveformUrl: '/music/sunset-boulevard-waveform.svg',
    isPremium: true
  },
  {
    id: 'dramatic-build',
    name: 'Rising Tension',
    artist: 'Cinematic Sounds',
    duration: 150,
    genre: 'Cinematic',
    mood: 'Dramatic',
    bpm: 110,
    previewUrl: '/music/rising-tension-preview.mp3',
    waveformUrl: '/music/rising-tension-waveform.svg'
  }
]

export function EffectsTransitionsPanel({
  selectedSegmentId,
  onEffectApply,
  onMusicApply,
  onPreviewEffect,
  onPreviewMusic,
  className,
}: EffectsTransitionsPanelProps) {
  const [activeTab, setActiveTab] = useState<'effects' | 'transitions' | 'music'>('effects')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [previewingEffect, setPreviewingEffect] = useState<string | null>(null)
  const [previewingMusic, setPreviewingMusic] = useState<string | null>(null)
  const [musicVolume, setMusicVolume] = useState(0.7)
  const [isMusicMuted, setIsMusicMuted] = useState(false)
  const [expandedEffect, setExpandedEffect] = useState<string | null>(null)
  const [effectParameters, setEffectParameters] = useState<Record<string, any>>({})

  const audioRef = useRef<HTMLAudioElement>(null)

  // Filter effects based on search and category
  const getFilteredEffects = (effects: Effect[]) => {
    return effects.filter(effect => {
      const matchesSearch = effect.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           effect.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategory === 'all' || effect.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }

  // Filter music tracks
  const getFilteredMusic = () => {
    return musicTracks.filter(track => {
      const matchesSearch = track.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           track.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           track.genre.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesSearch
    })
  }

  // Handle effect preview
  const handleEffectPreview = (effect: Effect) => {
    setPreviewingEffect(effect.id)
    onPreviewEffect(effect)
    
    // Auto-stop preview after effect duration
    setTimeout(() => {
      setPreviewingEffect(null)
    }, (effect.duration || 1) * 1000)
  }

  // Handle music preview
  const handleMusicPreview = (track: MusicTrack) => {
    if (previewingMusic === track.id) {
      // Stop current preview
      setPreviewingMusic(null)
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
    } else {
      // Start new preview
      setPreviewingMusic(track.id)
      if (audioRef.current) {
        audioRef.current.src = track.previewUrl
        audioRef.current.volume = isMusicMuted ? 0 : musicVolume
        audioRef.current.play()
      }
      onPreviewMusic(track)
    }
  }

  // Handle parameter change
  const handleParameterChange = (effectId: string, paramKey: string, value: any) => {
    setEffectParameters(prev => ({
      ...prev,
      [effectId]: {
        ...prev[effectId],
        [paramKey]: value
      }
    }))
  }

  // Apply effect with custom parameters
  const handleEffectApply = (effect: Effect) => {
    if (!selectedSegmentId) return
    
    const customParams = effectParameters[effect.id]
    const effectWithParams = customParams ? {
      ...effect,
      parameters: {
        ...effect.parameters,
        ...Object.entries(customParams).reduce((acc, [key, value]) => ({
          ...acc,
          [key]: { ...effect.parameters?.[key], value }
        }), {})
      }
    } : effect
    
    onEffectApply(selectedSegmentId, effectWithParams)
  }

  const categories = [
    { id: 'all', name: 'All', icon: Layers },
    { id: 'visual', name: 'Visual', icon: Eye },
    { id: 'filter', name: 'Filters', icon: Palette },
    { id: 'transition', name: 'Transitions', icon: Zap },
  ]

  const tabs = [
    { id: 'effects', name: 'Effects', icon: Sparkles },
    { id: 'transitions', name: 'Transitions', icon: Zap },
    { id: 'music', name: 'Music', icon: Music },
  ]

  return (
    <div className={cn("h-full flex flex-col", className)}>
      {/* Hidden audio element for music preview */}
      <audio
        ref={audioRef}
        onEnded={() => setPreviewingMusic(null)}
        onVolumeChange={(e) => setMusicVolume(e.currentTarget.volume)}
      />

      {/* Header */}
      <div className="flex-shrink-0 mb-4">
        <EnhancedLiquidGlass
          variant="editor"
          intensity="premium"
          className="p-4"
        >
          {/* Tabs */}
          <div className="flex items-center gap-2 mb-4">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <motion.button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    activeTab === tab.id
                      ? "bg-white/20 text-white shadow-lg"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  )}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Icon className="w-4 h-4" />
                  {tab.name}
                </motion.button>
              )
            })}
          </div>

          {/* Search and Filters */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 text-sm focus:outline-none focus:border-white/40 transition-colors"
              />
            </div>

            {/* Category Filter (for effects/transitions) */}
            {activeTab !== 'music' && (
              <div className="flex items-center gap-1">
                {categories.map((category) => {
                  const Icon = category.icon
                  return (
                    <motion.button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={cn(
                        "flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-all",
                        selectedCategory === category.id
                          ? "bg-blue-500/30 text-blue-200"
                          : "text-white/60 hover:text-white hover:bg-white/10"
                      )}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Icon className="w-3 h-3" />
                      {category.name}
                    </motion.button>
                  )
                })}
              </div>
            )}
          </div>
        </EnhancedLiquidGlass>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        <AnimatePresence mode="wait">
          {activeTab === 'effects' && (
            <motion.div
              key="effects"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-full"
            >
              <EffectsGrid
                effects={getFilteredEffects(visualEffects)}
                previewingEffect={previewingEffect}
                expandedEffect={expandedEffect}
                effectParameters={effectParameters}
                onPreview={handleEffectPreview}
                onApply={handleEffectApply}
                onExpand={setExpandedEffect}
                onParameterChange={handleParameterChange}
                selectedSegmentId={selectedSegmentId}
              />
            </motion.div>
          )}

          {activeTab === 'transitions' && (
            <motion.div
              key="transitions"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-full"
            >
              <EffectsGrid
                effects={getFilteredEffects(transitionEffects)}
                previewingEffect={previewingEffect}
                expandedEffect={expandedEffect}
                effectParameters={effectParameters}
                onPreview={handleEffectPreview}
                onApply={handleEffectApply}
                onExpand={setExpandedEffect}
                onParameterChange={handleParameterChange}
                selectedSegmentId={selectedSegmentId}
              />
            </motion.div>
          )}

          {activeTab === 'music' && (
            <motion.div
              key="music"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-full"
            >
              <MusicGrid
                tracks={getFilteredMusic()}
                previewingTrack={previewingMusic}
                volume={musicVolume}
                isMuted={isMusicMuted}
                onPreview={handleMusicPreview}
                onApply={onMusicApply}
                onVolumeChange={setMusicVolume}
                onMuteToggle={() => setIsMusicMuted(!isMusicMuted)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// Effects Grid Component
function EffectsGrid({
  effects,
  previewingEffect,
  expandedEffect,
  effectParameters,
  onPreview,
  onApply,
  onExpand,
  onParameterChange,
  selectedSegmentId,
}: {
  effects: Effect[]
  previewingEffect: string | null
  expandedEffect: string | null
  effectParameters: Record<string, any>
  onPreview: (effect: Effect) => void
  onApply: (effect: Effect) => void
  onExpand: (effectId: string | null) => void
  onParameterChange: (effectId: string, paramKey: string, value: any) => void
  selectedSegmentId?: string
}) {
  return (
    <EnhancedLiquidGlass
      variant="timeline"
      intensity="premium"
      className="h-full p-4"
    >
      <div className="h-full overflow-y-auto">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {effects.map((effect) => (
            <motion.div
              key={effect.id}
              layout
              className="relative"
            >
              <EnhancedLiquidGlass
                variant="editor"
                intensity="medium"
                animation="hover"
                className={cn(
                  "overflow-hidden transition-all duration-300",
                  expandedEffect === effect.id && "col-span-2 lg:col-span-3"
                )}
              >
                {/* Effect Card */}
                <div className="relative aspect-video bg-black/20 rounded-lg overflow-hidden">
                  <img
                    src={effect.thumbnailUrl}
                    alt={effect.name}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  
                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex gap-1">
                    {effect.isPremium && (
                      <div className="px-2 py-1 bg-yellow-500/80 text-yellow-100 text-xs font-medium rounded">
                        Premium
                      </div>
                    )}
                    {effect.isPopular && (
                      <div className="px-2 py-1 bg-red-500/80 text-red-100 text-xs font-medium rounded flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        Popular
                      </div>
                    )}
                  </div>

                  {/* Preview Button */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <motion.button
                      onClick={() => onPreview(effect)}
                      className="p-3 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      {previewingEffect === effect.id ? (
                        <Pause className="w-5 h-5" />
                      ) : (
                        <Play className="w-5 h-5 ml-0.5" />
                      )}
                    </motion.button>
                  </div>

                  {/* Duration */}
                  {effect.duration && (
                    <div className="absolute bottom-2 right-2 flex items-center gap-1 text-xs text-white/80">
                      <Clock className="w-3 h-3" />
                      {effect.duration}s
                    </div>
                  )}
                </div>

                {/* Effect Info */}
                <div className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-sm font-medium text-white/90">{effect.name}</h4>
                      <p className="text-xs text-white/60 mt-1">{effect.description}</p>
                    </div>
                    
                    {effect.parameters && (
                      <motion.button
                        onClick={() => onExpand(expandedEffect === effect.id ? null : effect.id)}
                        className="p-1 text-white/60 hover:text-white transition-colors"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Settings className="w-4 h-4" />
                      </motion.button>
                    )}
                  </div>

                  {/* Apply Button */}
                  <motion.button
                    onClick={() => onApply(effect)}
                    disabled={!selectedSegmentId}
                    className={cn(
                      "w-full py-2 px-3 rounded-lg text-xs font-medium transition-all",
                      selectedSegmentId
                        ? "bg-blue-500/30 text-blue-200 hover:bg-blue-500/40"
                        : "bg-white/10 text-white/40 cursor-not-allowed"
                    )}
                    whileHover={selectedSegmentId ? { scale: 1.02 } : {}}
                    whileTap={selectedSegmentId ? { scale: 0.98 } : {}}
                  >
                    {selectedSegmentId ? 'Apply Effect' : 'Select Segment First'}
                  </motion.button>
                </div>

                {/* Parameters Panel */}
                <AnimatePresence>
                  {expandedEffect === effect.id && effect.parameters && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-white/10 p-3 space-y-3"
                    >
                      {Object.entries(effect.parameters).map(([key, param]) => (
                        <div key={key}>
                          <label className="block text-xs text-white/70 mb-1">
                            {param.label}
                          </label>
                          
                          {param.type === 'slider' && (
                            <div className="flex items-center gap-2">
                              <input
                                type="range"
                                min={param.min}
                                max={param.max}
                                step={0.1}
                                value={effectParameters[effect.id]?.[key] ?? param.value}
                                onChange={(e) => onParameterChange(effect.id, key, parseFloat(e.target.value))}
                                className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
                              />
                              <span className="text-xs text-white/60 w-12 text-right">
                                {(effectParameters[effect.id]?.[key] ?? param.value).toFixed(1)}
                              </span>
                            </div>
                          )}
                          
                          {param.type === 'select' && (
                            <select
                              value={effectParameters[effect.id]?.[key] ?? param.value}
                              onChange={(e) => onParameterChange(effect.id, key, e.target.value)}
                              className="w-full p-2 bg-white/10 border border-white/20 rounded text-white text-xs focus:outline-none focus:border-white/40"
                            >
                              {param.options?.map((option) => (
                                <option key={option} value={option} className="bg-gray-800">
                                  {option}
                                </option>
                              ))}
                            </select>
                          )}
                          
                          {param.type === 'color' && (
                            <input
                              type="color"
                              value={effectParameters[effect.id]?.[key] ?? param.value}
                              onChange={(e) => onParameterChange(effect.id, key, e.target.value)}
                              className="w-full h-8 bg-white/10 border border-white/20 rounded cursor-pointer"
                            />
                          )}
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </EnhancedLiquidGlass>
            </motion.div>
          ))}
        </div>
      </div>
    </EnhancedLiquidGlass>
  )
}

// Music Grid Component
function MusicGrid({
  tracks,
  previewingTrack,
  volume,
  isMuted,
  onPreview,
  onApply,
  onVolumeChange,
  onMuteToggle,
}: {
  tracks: MusicTrack[]
  previewingTrack: string | null
  volume: number
  isMuted: boolean
  onPreview: (track: MusicTrack) => void
  onApply: (track: MusicTrack) => void
  onVolumeChange: (volume: number) => void
  onMuteToggle: () => void
}) {
  return (
    <EnhancedLiquidGlass
      variant="timeline"
      intensity="premium"
      className="h-full p-4"
    >
      {/* Volume Control */}
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/10">
        <motion.button
          onClick={onMuteToggle}
          className="p-2 text-white/70 hover:text-white transition-colors"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </motion.button>
        
        <div className="flex-1 flex items-center gap-2">
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-xs text-white/60 w-8">
            {Math.round(volume * 100)}%
          </span>
        </div>
      </div>

      {/* Music Tracks */}
      <div className="h-full overflow-y-auto">
        <div className="space-y-3">
          {tracks.map((track) => (
            <motion.div
              key={track.id}
              layout
            >
              <EnhancedLiquidGlass
                variant="editor"
                intensity="medium"
                animation="hover"
                className="p-4"
              >
                <div className="flex items-center gap-4">
                  {/* Play Button */}
                  <motion.button
                    onClick={() => onPreview(track)}
                    className="flex-shrink-0 p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {previewingTrack === track.id ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5 ml-0.5" />
                    )}
                  </motion.button>

                  {/* Track Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="min-w-0">
                        <h4 className="text-sm font-medium text-white/90 truncate">
                          {track.name}
                        </h4>
                        <p className="text-xs text-white/60">
                          {track.artist} • {track.genre}
                        </p>
                      </div>
                      
                      {track.isPremium && (
                        <div className="flex-shrink-0 px-2 py-1 bg-yellow-500/80 text-yellow-100 text-xs font-medium rounded">
                          Premium
                        </div>
                      )}
                    </div>

                    {/* Track Details */}
                    <div className="flex items-center gap-4 text-xs text-white/50 mb-3">
                      <span>{Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}</span>
                      <span>{track.bpm} BPM</span>
                      <span>{track.mood}</span>
                    </div>

                    {/* Waveform Placeholder */}
                    <div className="h-8 bg-white/10 rounded mb-3 flex items-center px-2">
                      <div className="w-full h-1 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-400 rounded opacity-60" />
                    </div>

                    {/* Apply Button */}
                    <motion.button
                      onClick={() => onApply(track)}
                      className="w-full py-2 px-3 bg-green-500/30 text-green-200 hover:bg-green-500/40 rounded-lg text-xs font-medium transition-all"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Add to Timeline
                    </motion.button>
                  </div>
                </div>
              </EnhancedLiquidGlass>
            </motion.div>
          ))}
        </div>
      </div>
    </EnhancedLiquidGlass>
  )
}