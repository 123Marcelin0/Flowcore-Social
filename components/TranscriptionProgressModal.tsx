import React from 'react'
import { Loader2, Mic, FileAudio, Sparkles, CheckCircle } from 'lucide-react'

interface TranscriptionProgressModalProps {
  isVisible: boolean
  progress: number
  step: string
}

export function TranscriptionProgressModal({ 
  isVisible, 
  progress, 
  step 
}: TranscriptionProgressModalProps) {
  if (!isVisible) return null

  const getIcon = () => {
    if (progress >= 100) return <CheckCircle className="w-10 h-10 text-green-500" />
    if (progress >= 70) return <Sparkles className="w-10 h-10 text-blue-500 animate-pulse" />
    if (progress >= 40) return <FileAudio className="w-10 h-10 text-orange-500 animate-bounce" />
    return <Mic className="w-10 h-10 text-purple-500 animate-pulse" />
  }

  const getGradientColor = () => {
    if (progress >= 100) return 'from-green-400 to-emerald-500'
    if (progress >= 70) return 'from-blue-400 to-cyan-500' 
    if (progress >= 40) return 'from-orange-400 to-amber-500'
    return 'from-purple-400 to-pink-500'
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center" 
         style={{ 
           backdropFilter: 'blur(12px)', 
           background: 'rgba(0,0,0,0.5)' 
         }}>
      
      {/* Glassmorphic Modal */}
      <div 
        className="relative rounded-[24px] border border-white/20 p-8 text-white max-w-md mx-4 w-full"
        style={{ 
          background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 50%, rgba(0,0,0,0.4) 100%)', 
          boxShadow: 'inset 2px 2px 8px rgba(255,255,255,0.08), inset -2px -2px 8px rgba(0,0,0,0.4), 0 16px 48px rgba(0,0,0,0.6)' 
        }}>
        
        {/* Animated Background Elements */}
        <div className="absolute inset-0 rounded-[24px] overflow-hidden">
          <div className="absolute top-4 left-4 w-2 h-2 bg-white/30 rounded-full animate-ping" style={{ animationDelay: '0s' }} />
          <div className="absolute top-6 right-8 w-1 h-1 bg-white/20 rounded-full animate-ping" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-8 left-8 w-1.5 h-1.5 bg-white/25 rounded-full animate-ping" style={{ animationDelay: '2s' }} />
          <div className="absolute bottom-4 right-4 w-2 h-2 bg-white/30 rounded-full animate-ping" style={{ animationDelay: '1.5s' }} />
        </div>

        <div className="relative z-10 text-center space-y-6">
          {/* Icon with Floating Animation */}
          <div className="relative">
            <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto border border-white/30 shadow-lg">
              {progress < 100 ? (
                <div className="relative">
                  {getIcon()}
                  <Loader2 className="absolute inset-0 w-10 h-10 text-white/60 animate-spin" />
                </div>
              ) : (
                getIcon()
              )}
            </div>
            
            {/* Animated Ring */}
            <div className={`absolute inset-0 w-20 h-20 border-2 border-white/30 rounded-full mx-auto ${progress < 100 ? 'animate-ping' : ''}`} />
          </div>

          {/* Text Content */}
          <div className="space-y-3">
            <h3 className="text-xl font-semibold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
              {progress >= 100 ? '🎉 Transcription Complete!' : '🎤 AI Transcription'}
            </h3>
            
            <p className="text-white/70 text-sm min-h-[1.25rem]">
              {step || 'Processing your audio...'}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-white/60">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            
            <div className="h-2 w-full rounded-full overflow-hidden bg-white/20">
              <div 
                className={`h-full transition-all duration-500 ease-out bg-gradient-to-r ${getGradientColor()}`}
                style={{ 
                  width: `${Math.max(3, Math.min(100, progress))}%`,
                  boxShadow: progress > 10 ? '0 0 12px rgba(255,255,255,0.3)' : 'none'
                }} 
              />
            </div>
          </div>

          {/* Step Indicators */}
          <div className="flex justify-center space-x-2">
            {[
              { threshold: 0, label: 'Start', icon: '🚀' },
              { threshold: 25, label: 'Download', icon: '📥' },
              { threshold: 50, label: 'AI Process', icon: '🤖' },
              { threshold: 80, label: 'Optimize', icon: '✨' },
              { threshold: 100, label: 'Done', icon: '✅' }
            ].map((stepItem, index) => (
              <div 
                key={index}
                className={`flex flex-col items-center text-xs transition-all duration-300 ${
                  progress >= stepItem.threshold 
                    ? 'text-white/90 scale-110' 
                    : 'text-white/40 scale-95'
                }`}
              >
                <div className={`text-base mb-1 transition-all duration-300 ${
                  progress >= stepItem.threshold ? 'animate-bounce' : ''
                }`}>
                  {stepItem.icon}
                </div>
                <span>{stepItem.label}</span>
              </div>
            ))}
          </div>

          {/* Completion Message */}
          {progress >= 100 && (
            <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
              <p className="text-green-400 text-sm">
                🎯 Your video is ready for editing with AI-optimized subtitles!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

