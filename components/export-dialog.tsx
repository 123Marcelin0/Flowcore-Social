"use client"

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { LiquidModal } from './ui/liquid-modal'
import { EnhancedLiquidGlass } from './ui/enhanced-liquid-glass'
import { 
  Download, 
  Settings, 
  Smartphone, 
  Monitor, 
  Square, 
  Film, 
  Zap,
  Check,
  AlertCircle,
  Loader2,
  Play,
  Share2,
  Sparkles
} from 'lucide-react'

interface ExportOption {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  format: 'mp4' | 'gif' | 'jpg' | 'png'
  quality: 'low' | 'medium' | 'high'
  resolution: 'preview' | 'mobile' | 'sd' | 'hd' | 'full-hd'
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:5' | '4:3'
  optimizedFor: string[]
  fileSize: string
  renderTime: string
}

interface ExportDialogProps {
  isOpen: boolean
  onClose: () => void
  onExport: (options: ExportOption) => void
  projectTitle: string
  duration: number
  className?: string
}

const exportOptions: ExportOption[] = [
  {
    id: 'instagram-story',
    name: 'Instagram Story',
    description: 'Vertical format optimized for Instagram Stories',
    icon: <Smartphone className="w-5 h-5" />,
    format: 'mp4',
    quality: 'high',
    resolution: 'full-hd',
    aspectRatio: '9:16',
    optimizedFor: ['Instagram', 'TikTok', 'YouTube Shorts'],
    fileSize: '~15MB',
    renderTime: '2-3 min'
  },
  {
    id: 'instagram-post',
    name: 'Instagram Post',
    description: 'Square format perfect for Instagram feed',
    icon: <Square className="w-5 h-5" />,
    format: 'mp4',
    quality: 'high',
    resolution: 'hd',
    aspectRatio: '1:1',
    optimizedFor: ['Instagram', 'Facebook', 'LinkedIn'],
    fileSize: '~12MB',
    renderTime: '2-3 min'
  },
  {
    id: 'youtube-video',
    name: 'YouTube Video',
    description: 'Widescreen format for YouTube and desktop',
    icon: <Monitor className="w-5 h-5" />,
    format: 'mp4',
    quality: 'high',
    resolution: 'full-hd',
    aspectRatio: '16:9',
    optimizedFor: ['YouTube', 'Vimeo', 'Website'],
    fileSize: '~25MB',
    renderTime: '3-4 min'
  },
  {
    id: 'tiktok-video',
    name: 'TikTok Video',
    description: 'Vertical format optimized for TikTok',
    icon: <Film className="w-5 h-5" />,
    format: 'mp4',
    quality: 'high',
    resolution: 'full-hd',
    aspectRatio: '9:16',
    optimizedFor: ['TikTok', 'Instagram Reels', 'YouTube Shorts'],
    fileSize: '~18MB',
    renderTime: '2-3 min'
  },
  {
    id: 'quick-preview',
    name: 'Quick Preview',
    description: 'Fast, low-quality preview for testing',
    icon: <Zap className="w-5 h-5" />,
    format: 'mp4',
    quality: 'low',
    resolution: 'preview',
    aspectRatio: '16:9',
    optimizedFor: ['Preview', 'Testing'],
    fileSize: '~3MB',
    renderTime: '30-60 sec'
  },
  {
    id: 'gif-animation',
    name: 'GIF Animation',
    description: 'Animated GIF for social media and web',
    icon: <Sparkles className="w-5 h-5" />,
    format: 'gif',
    quality: 'medium',
    resolution: 'mobile',
    aspectRatio: '1:1',
    optimizedFor: ['Social Media', 'Email', 'Web'],
    fileSize: '~8MB',
    renderTime: '1-2 min'
  }
]

export function ExportDialog({
  isOpen,
  onClose,
  onExport,
  projectTitle,
  duration,
  className
}: ExportDialogProps) {
  const [selectedOption, setSelectedOption] = useState<ExportOption>(exportOptions[0])
  const [customSettings, setCustomSettings] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      await onExport(selectedOption)
    } finally {
      setIsExporting(false)
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <LiquidModal
      isOpen={isOpen}
      onClose={onClose}
      title="Export Video"
      subtitle={`Export "${projectTitle}" • ${formatDuration(duration)}`}
      size="xl"
      variant="premium"
      className={cn("max-w-4xl", className)}
      headerActions={
        <div className="flex items-center gap-2">
          <EnhancedLiquidGlass
            variant="editor"
            intensity="medium"
            animation="hover"
            className="px-3 py-1"
          >
            <motion.button
              onClick={() => setCustomSettings(!customSettings)}
              className={cn(
                "text-xs font-medium flex items-center gap-1 transition-colors",
                customSettings ? "text-blue-300" : "text-white/70 hover:text-white/90"
              )}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Settings className="w-3 h-3" />
              Custom
            </motion.button>
          </EnhancedLiquidGlass>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Export Options Grid */}
        <div>
          <h3 className="text-lg font-semibold text-white/90 mb-4">Choose Export Format</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {exportOptions.map((option) => (
              <motion.div
                key={option.id}
                onClick={() => setSelectedOption(option)}
                className={cn(
                  "cursor-pointer transition-all duration-300",
                  selectedOption.id === option.id && "scale-105"
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <EnhancedLiquidGlass
                  variant="editor"
                  intensity={selectedOption.id === option.id ? "premium" : "medium"}
                  animation="hover"
                  borderGlow={selectedOption.id === option.id}
                  gradient={selectedOption.id === option.id}
                  className="p-4 h-full"
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "p-2 rounded-lg transition-colors",
                      selectedOption.id === option.id 
                        ? "bg-blue-500/30 text-blue-300" 
                        : "bg-white/10 text-white/70"
                    )}>
                      {option.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-white/90 mb-1">{option.name}</h4>
                      <p className="text-xs text-white/60 mb-2 line-clamp-2">
                        {option.description}
                      </p>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-white/50">
                          <span>{option.resolution.toUpperCase()}</span>
                          <span>•</span>
                          <span>{option.aspectRatio}</span>
                          <span>•</span>
                          <span>{option.format.toUpperCase()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-white/50">
                          <span>{option.fileSize}</span>
                          <span>•</span>
                          <span>{option.renderTime}</span>
                        </div>
                      </div>
                    </div>
                    {selectedOption.id === option.id && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="p-1 bg-blue-500/30 rounded-full"
                      >
                        <Check className="w-3 h-3 text-blue-300" />
                      </motion.div>
                    )}
                  </div>
                </EnhancedLiquidGlass>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Selected Option Details */}
        <EnhancedLiquidGlass
          variant="timeline"
          intensity="premium"
          className="p-4"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h4 className="font-semibold text-white/90 mb-1">
                {selectedOption.name}
              </h4>
              <p className="text-sm text-white/60">
                {selectedOption.description}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-white/80">
                {selectedOption.resolution.toUpperCase()} • {selectedOption.quality.toUpperCase()}
              </div>
              <div className="text-xs text-white/50">
                {selectedOption.aspectRatio} • {selectedOption.format.toUpperCase()}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h5 className="text-xs font-medium text-white/70 mb-2">Optimized For</h5>
              <div className="flex flex-wrap gap-1">
                {selectedOption.optimizedFor.map((platform) => (
                  <span
                    key={platform}
                    className="px-2 py-1 bg-white/10 rounded text-xs text-white/60"
                  >
                    {platform}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h5 className="text-xs font-medium text-white/70 mb-2">Estimated Size</h5>
              <p className="text-sm text-white/80">{selectedOption.fileSize}</p>
            </div>
            <div>
              <h5 className="text-xs font-medium text-white/70 mb-2">Render Time</h5>
              <p className="text-sm text-white/80">{selectedOption.renderTime}</p>
            </div>
          </div>
        </EnhancedLiquidGlass>

        {/* Custom Settings Panel */}
        <AnimatePresence>
          {customSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <EnhancedLiquidGlass
                variant="editor"
                intensity="medium"
                className="p-4"
              >
                <h4 className="font-semibold text-white/90 mb-4">Custom Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Quality
                    </label>
                    <select className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-white/40">
                      <option value="low">Low (Fast render)</option>
                      <option value="medium">Medium (Balanced)</option>
                      <option value="high">High (Best quality)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Resolution
                    </label>
                    <select className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-white/40">
                      <option value="preview">Preview (480p)</option>
                      <option value="mobile">Mobile (720p)</option>
                      <option value="hd">HD (1080p)</option>
                      <option value="full-hd">Full HD (1080p)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Format
                    </label>
                    <select className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-white/40">
                      <option value="mp4">MP4 (Video)</option>
                      <option value="gif">GIF (Animation)</option>
                      <option value="jpg">JPG (Image)</option>
                      <option value="png">PNG (Image)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Aspect Ratio
                    </label>
                    <select className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-white/40">
                      <option value="16:9">16:9 (Widescreen)</option>
                      <option value="9:16">9:16 (Vertical)</option>
                      <option value="1:1">1:1 (Square)</option>
                      <option value="4:5">4:5 (Portrait)</option>
                      <option value="4:3">4:3 (Standard)</option>
                    </select>
                  </div>
                </div>
              </EnhancedLiquidGlass>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Export Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <motion.button
              onClick={onClose}
              className="px-4 py-2 text-sm text-white/70 hover:text-white transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Cancel
            </motion.button>
            
            <EnhancedLiquidGlass
              variant="editor"
              intensity="medium"
              animation="hover"
              className="px-4 py-2"
            >
              <motion.button
                className="text-sm text-white/80 hover:text-white flex items-center gap-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Play className="w-4 h-4" />
                Preview
              </motion.button>
            </EnhancedLiquidGlass>
          </div>

          <div className="flex items-center gap-3">
            <EnhancedLiquidGlass
              variant="editor"
              intensity="premium"
              animation="glow"
              borderGlow
              className="px-6 py-3"
            >
              <motion.button
                onClick={handleExport}
                disabled={isExporting}
                className="text-sm font-medium text-white flex items-center gap-2 disabled:opacity-50"
                whileHover={{ scale: isExporting ? 1 : 1.05 }}
                whileTap={{ scale: isExporting ? 1 : 0.95 }}
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Starting Export...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Export Video
                  </>
                )}
              </motion.button>
            </EnhancedLiquidGlass>
          </div>
        </div>
      </div>
    </LiquidModal>
  )
}