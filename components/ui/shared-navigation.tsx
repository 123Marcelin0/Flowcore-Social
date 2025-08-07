"use client"

import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { EnhancedLiquidGlass } from './enhanced-liquid-glass'
import { 
  ArrowLeft,
  Save,
  Share2,
  Download,
  Settings,
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX
} from 'lucide-react'

interface SharedNavigationProps {
  title: string
  subtitle?: string
  onBack?: () => void
  onSave?: () => void
  onShare?: () => void
  onExport?: () => void
  onSettings?: () => void
  
  // Media controls
  isPlaying?: boolean
  onPlay?: () => void
  onPause?: () => void
  onReset?: () => void
  currentTime?: number
  duration?: number
  volume?: number
  onVolumeChange?: (volume: number) => void
  isMuted?: boolean
  onToggleMute?: () => void
  
  // View controls
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
  
  // Custom actions
  customActions?: React.ReactNode
  
  className?: string
}

export function SharedNavigation({
  title,
  subtitle,
  onBack,
  onSave,
  onShare,
  onExport,
  onSettings,
  isPlaying,
  onPlay,
  onPause,
  onReset,
  currentTime = 0,
  duration = 0,
  volume = 100,
  onVolumeChange,
  isMuted = false,
  onToggleMute,
  isFullscreen = false,
  onToggleFullscreen,
  customActions,
  className
}: SharedNavigationProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <EnhancedLiquidGlass
      variant="editor"
      intensity="premium"
      className={cn("p-4", className)}
    >
      <div className="flex items-center justify-between">
        {/* Left Section - Title and Back */}
        <div className="flex items-center gap-4">
          {onBack && (
            <motion.button
              onClick={onBack}
              className="p-2 text-white/60 hover:text-white transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
          )}
          
          <div>
            <h1 className="text-xl font-bold text-white/90">{title}</h1>
            {subtitle && (
              <p className="text-sm text-white/60 mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Center Section - Media Controls */}
        {(onPlay || onPause || onReset) && (
          <div className="flex items-center gap-4">
            {/* Play/Pause */}
            {(onPlay || onPause) && (
              <motion.button
                onClick={isPlaying ? onPause : onPlay}
                className="p-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full transition-all duration-200"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 text-white" />
                ) : (
                  <Play className="w-5 h-5 text-white ml-0.5" />
                )}
              </motion.button>
            )}

            {/* Reset */}
            {onReset && (
              <motion.button
                onClick={onReset}
                className="p-2 text-white/60 hover:text-white transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <RotateCcw className="w-4 h-4" />
              </motion.button>
            )}

            {/* Time Display */}
            {duration > 0 && (
              <div className="text-sm text-white/70 font-mono">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            )}

            {/* Volume Control */}
            {(onVolumeChange || onToggleMute) && (
              <div className="flex items-center gap-2">
                {onToggleMute && (
                  <motion.button
                    onClick={onToggleMute}
                    className="p-2 text-white/60 hover:text-white transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {isMuted ? (
                      <VolumeX className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </motion.button>
                )}
                
                {onVolumeChange && (
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => onVolumeChange(parseInt(e.target.value))}
                    className="w-20 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* Right Section - Actions */}
        <div className="flex items-center gap-2">
          {/* Custom Actions */}
          {customActions}

          {/* Standard Actions */}
          {onSave && (
            <motion.button
              onClick={onSave}
              className="p-2 text-white/60 hover:text-white transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title="Save"
            >
              <Save className="w-5 h-5" />
            </motion.button>
          )}

          {onShare && (
            <motion.button
              onClick={onShare}
              className="p-2 text-white/60 hover:text-white transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title="Share"
            >
              <Share2 className="w-5 h-5" />
            </motion.button>
          )}

          {onExport && (
            <motion.button
              onClick={onExport}
              className="p-2 text-white/60 hover:text-white transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title="Export"
            >
              <Download className="w-5 h-5" />
            </motion.button>
          )}

          {onToggleFullscreen && (
            <motion.button
              onClick={onToggleFullscreen}
              className="p-2 text-white/60 hover:text-white transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="w-5 h-5" />
              ) : (
                <Maximize2 className="w-5 h-5" />
              )}
            </motion.button>
          )}

          {onSettings && (
            <motion.button
              onClick={onSettings}
              className="p-2 text-white/60 hover:text-white transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </motion.button>
          )}
        </div>
      </div>
    </EnhancedLiquidGlass>
  )
}

// Preset configurations for common use cases
export const NavigationPresets = {
  editor: {
    variant: 'editor' as const,
    intensity: 'premium' as const,
    showMediaControls: true,
    showVolumeControl: true,
    showFullscreen: true
  },
  timeline: {
    variant: 'timeline' as const,
    intensity: 'premium' as const,
    showMediaControls: true,
    showVolumeControl: false,
    showFullscreen: false
  },
  modal: {
    variant: 'modal' as const,
    intensity: 'premium' as const,
    showMediaControls: false,
    showVolumeControl: false,
    showFullscreen: false
  }
}