"use client"

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { LiquidModal } from './ui/liquid-modal'
import { EnhancedLiquidGlass } from './ui/enhanced-liquid-glass'
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Zap,
  Film,
  Download,
  Share2,
  AlertTriangle,
  RefreshCw,
  Eye
} from 'lucide-react'

interface RenderingStep {
  id: string
  name: string
  description: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  estimatedTime?: string
  icon: React.ReactNode
}

interface RenderingProgressProps {
  isOpen: boolean
  onClose: () => void
  onRetry?: () => void
  onPreview?: () => void
  onDownload?: () => void
  onShare?: () => void
  renderStatus: 'submitted' | 'queued' | 'fetching' | 'rendering' | 'done' | 'failed'
  progress: number
  estimatedTimeRemaining?: string
  videoUrl?: string
  error?: string
  projectTitle: string
  exportFormat: string
  className?: string
}

export function RenderingProgress({
  isOpen,
  onClose,
  onRetry,
  onPreview,
  onDownload,
  onShare,
  renderStatus,
  progress,
  estimatedTimeRemaining,
  videoUrl,
  error,
  projectTitle,
  exportFormat,
  className
}: RenderingProgressProps) {
  const [steps, setSteps] = useState<RenderingStep[]>([
    {
      id: 'submit',
      name: 'Submitting Request',
      description: 'Preparing your video for rendering',
      status: 'pending',
      progress: 0,
      icon: <Zap className="w-4 h-4" />
    },
    {
      id: 'queue',
      name: 'Queued for Processing',
      description: 'Waiting in the rendering queue',
      status: 'pending',
      progress: 0,
      estimatedTime: '30s',
      icon: <Clock className="w-4 h-4" />
    },
    {
      id: 'fetch',
      name: 'Fetching Assets',
      description: 'Downloading media files and resources',
      status: 'pending',
      progress: 0,
      estimatedTime: '1-2 min',
      icon: <Download className="w-4 h-4" />
    },
    {
      id: 'render',
      name: 'Rendering Video',
      description: 'Processing effects, transitions, and encoding',
      status: 'pending',
      progress: 0,
      estimatedTime: '2-5 min',
      icon: <Film className="w-4 h-4" />
    },
    {
      id: 'complete',
      name: 'Finalizing',
      description: 'Preparing your video for download',
      status: 'pending',
      progress: 0,
      estimatedTime: '30s',
      icon: <CheckCircle className="w-4 h-4" />
    }
  ])

  const [showCelebration, setShowCelebration] = useState(false)

  // Update steps based on render status
  useEffect(() => {
    setSteps(prevSteps => {
      const newSteps = [...prevSteps]
      
      switch (renderStatus) {
        case 'submitted':
          newSteps[0].status = 'completed'
          newSteps[0].progress = 100
          break
        case 'queued':
          newSteps[0].status = 'completed'
          newSteps[0].progress = 100
          newSteps[1].status = 'processing'
          newSteps[1].progress = 50
          break
        case 'fetching':
          newSteps[0].status = 'completed'
          newSteps[0].progress = 100
          newSteps[1].status = 'completed'
          newSteps[1].progress = 100
          newSteps[2].status = 'processing'
          newSteps[2].progress = Math.min(progress * 0.3, 100)
          break
        case 'rendering':
          newSteps[0].status = 'completed'
          newSteps[0].progress = 100
          newSteps[1].status = 'completed'
          newSteps[1].progress = 100
          newSteps[2].status = 'completed'
          newSteps[2].progress = 100
          newSteps[3].status = 'processing'
          newSteps[3].progress = Math.min(progress * 0.8, 100)
          break
        case 'done':
          newSteps.forEach((step, index) => {
            step.status = 'completed'
            step.progress = 100
          })
          if (!showCelebration) {
            setShowCelebration(true)
            setTimeout(() => setShowCelebration(false), 3000)
          }
          break
        case 'failed':
          const failedStepIndex = newSteps.findIndex(step => step.status === 'processing')
          if (failedStepIndex !== -1) {
            newSteps[failedStepIndex].status = 'failed'
          }
          break
      }
      
      return newSteps
    })
  }, [renderStatus, progress, showCelebration])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-400" />
      case 'processing':
        return <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-400" />
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-white/30" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400'
      case 'processing':
        return 'text-blue-400'
      case 'failed':
        return 'text-red-400'
      default:
        return 'text-white/50'
    }
  }

  const overallProgress = steps.reduce((sum, step) => sum + step.progress, 0) / steps.length

  return (
    <LiquidModal
      isOpen={isOpen}
      onClose={renderStatus === 'done' || renderStatus === 'failed' ? onClose : undefined}
      title={renderStatus === 'done' ? 'Export Complete!' : renderStatus === 'failed' ? 'Export Failed' : 'Exporting Video'}
      subtitle={`"${projectTitle}" • ${exportFormat.toUpperCase()}`}
      size="lg"
      variant="premium"
      closeOnOverlayClick={false}
      closeOnEscape={false}
      showCloseButton={renderStatus === 'done' || renderStatus === 'failed'}
      className={cn("max-w-2xl", className)}
    >
      <div className="space-y-6">
        {/* Overall Progress */}
        <EnhancedLiquidGlass
          variant="timeline"
          intensity="premium"
          className="p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white/90">
                {renderStatus === 'done' ? 'Export Complete!' : 
                 renderStatus === 'failed' ? 'Export Failed' : 
                 'Processing Your Video'}
              </h3>
              <p className="text-sm text-white/60">
                {renderStatus === 'done' ? 'Your video is ready for download' :
                 renderStatus === 'failed' ? 'Something went wrong during export' :
                 estimatedTimeRemaining ? `Estimated time remaining: ${estimatedTimeRemaining}` : 'Please wait...'}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white/90">
                {Math.round(overallProgress)}%
              </div>
              <div className="text-xs text-white/50">Complete</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="relative h-3 bg-white/10 rounded-full overflow-hidden mb-4">
            <motion.div
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-400 via-purple-500 to-green-400 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${overallProgress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
            
            {/* Animated shimmer effect */}
            {renderStatus !== 'done' && renderStatus !== 'failed' && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
            )}
          </div>

          {/* Status Message */}
          {error && renderStatus === 'failed' && (
            <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-300">Export Failed</p>
                <p className="text-xs text-red-400/80 mt-1">{error}</p>
              </div>
            </div>
          )}
        </EnhancedLiquidGlass>

        {/* Detailed Steps */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-white/70">Processing Steps</h4>
          {steps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <EnhancedLiquidGlass
                variant="editor"
                intensity={step.status === 'processing' ? "premium" : "medium"}
                animation={step.status === 'processing' ? "pulse" : "none"}
                borderGlow={step.status === 'processing'}
                className="p-4"
              >
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    {getStatusIcon(step.status)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h5 className={cn("font-medium", getStatusColor(step.status))}>
                        {step.name}
                      </h5>
                      {step.status === 'processing' && (
                        <span className="text-xs text-white/50">
                          {Math.round(step.progress)}%
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/60 mb-2">{step.description}</p>
                    
                    {step.status === 'processing' && (
                      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-blue-400 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${step.progress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    )}
                    
                    {step.estimatedTime && step.status === 'pending' && (
                      <div className="text-xs text-white/40 mt-1">
                        Est. {step.estimatedTime}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-shrink-0 p-2 bg-white/5 rounded-lg">
                    {step.icon}
                  </div>
                </div>
              </EnhancedLiquidGlass>
            </motion.div>
          ))}
        </div>

        {/* Success Actions */}
        {renderStatus === 'done' && videoUrl && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <EnhancedLiquidGlass
              variant="milestone"
              intensity="premium"
              animation="glow"
              borderGlow
              gradient
              className="p-4"
            >
              <div className="text-center mb-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3"
                >
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </motion.div>
                <h3 className="text-lg font-semibold text-white/90 mb-1">
                  Your video is ready!
                </h3>
                <p className="text-sm text-white/60">
                  Export completed successfully. What would you like to do next?
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {onPreview && (
                  <motion.button
                    onClick={onPreview}
                    className="flex items-center justify-center gap-2 p-3 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium text-white/80 hover:text-white transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Eye className="w-4 h-4" />
                    Preview
                  </motion.button>
                )}
                
                {onDownload && (
                  <motion.button
                    onClick={onDownload}
                    className="flex items-center justify-center gap-2 p-3 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg text-sm font-medium text-blue-300 hover:text-blue-200 transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </motion.button>
                )}
                
                {onShare && (
                  <motion.button
                    onClick={onShare}
                    className="flex items-center justify-center gap-2 p-3 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg text-sm font-medium text-purple-300 hover:text-purple-200 transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </motion.button>
                )}
              </div>
            </EnhancedLiquidGlass>
          </motion.div>
        )}

        {/* Failed Actions */}
        {renderStatus === 'failed' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-3"
          >
            {onRetry && (
              <EnhancedLiquidGlass
                variant="editor"
                intensity="premium"
                animation="hover"
                className="px-6 py-3"
              >
                <motion.button
                  onClick={onRetry}
                  className="text-sm font-medium text-white flex items-center gap-2"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </motion.button>
              </EnhancedLiquidGlass>
            )}
            
            <motion.button
              onClick={onClose}
              className="px-6 py-3 text-sm text-white/70 hover:text-white transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Close
            </motion.button>
          </motion.div>
        )}

        {/* Celebration Effect */}
        <AnimatePresence>
          {showCelebration && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 pointer-events-none z-50"
            >
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full"
                  initial={{
                    x: '50vw',
                    y: '50vh',
                    scale: 0,
                    opacity: 1
                  }}
                  animate={{
                    x: `${50 + (Math.random() - 0.5) * 100}vw`,
                    y: `${50 + (Math.random() - 0.5) * 100}vh`,
                    scale: [0, 1, 0],
                    opacity: [1, 1, 0]
                  }}
                  transition={{
                    duration: 2,
                    delay: i * 0.1,
                    ease: "easeOut"
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </LiquidModal>
  )
}