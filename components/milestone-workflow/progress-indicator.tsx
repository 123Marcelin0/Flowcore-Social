"use client"

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { EnhancedLiquidGlass } from '@/components/ui/enhanced-liquid-glass'
import { Check, Trophy, Sparkles, Target, Zap } from 'lucide-react'

export interface ProgressIndicatorProps {
  current: number
  total: number
  completedMilestones?: number[]
  variant?: 'circular' | 'linear' | 'radial' | 'stepped'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showPercentage?: boolean
  showMilestones?: boolean
  showCelebration?: boolean
  animated?: boolean
  className?: string
  onMilestoneComplete?: (milestone: number) => void
}

export function ProgressIndicator({
  current,
  total,
  completedMilestones = [],
  variant = 'circular',
  size = 'md',
  showPercentage = true,
  showMilestones = true,
  showCelebration = true,
  animated = true,
  className,
  onMilestoneComplete
}: ProgressIndicatorProps) {
  const [previousCurrent, setPreviousCurrent] = useState(current)
  const [showCelebrationEffect, setShowCelebrationEffect] = useState(false)
  
  const percentage = Math.round((current / total) * 100)
  const circumference = 2 * Math.PI * 45 // radius of 45
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  // Trigger celebration effect when progress increases
  useEffect(() => {
    if (current > previousCurrent && showCelebration) {
      setShowCelebrationEffect(true)
      const timer = setTimeout(() => setShowCelebrationEffect(false), 2000)
      
      // Trigger milestone completion callback
      if (onMilestoneComplete && current > previousCurrent) {
        onMilestoneComplete(current)
      }
      
      return () => clearTimeout(timer)
    }
    setPreviousCurrent(current)
  }, [current, previousCurrent, showCelebration, onMilestoneComplete])

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
    xl: 'w-40 h-40'
  }

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg'
  }

  const CircularProgress = () => (
    <div className={cn('relative', sizeClasses[size])}>
      {/* Background Circle */}
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="45"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth="8"
          fill="none"
          className="drop-shadow-sm"
        />
        
        {/* Progress Circle */}
        <motion.circle
          cx="50"
          cy="50"
          r="45"
          stroke="url(#progressGradient)"
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          initial={{ strokeDashoffset: circumference }}
          animate={{ 
            strokeDashoffset: animated ? strokeDashoffset : circumference - (percentage / 100) * circumference
          }}
          transition={{ 
            duration: animated ? 1.5 : 0, 
            ease: "easeOut",
            delay: 0.2
          }}
          className="drop-shadow-lg"
        />
        
        {/* Gradient Definition */}
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="50%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#EC4899" />
          </linearGradient>
        </defs>
      </svg>

      {/* Center Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {percentage === 100 ? (
            <motion.div
              key="complete"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 20,
                delay: 1.2
              }}
              className="text-green-400"
            >
              <Trophy className={cn('w-6 h-6', size === 'xl' && 'w-8 h-8')} />
            </motion.div>
          ) : (
            <motion.div
              key="percentage"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="text-center"
            >
              <motion.span
                className={cn('font-bold text-white/90', textSizes[size])}
                animate={{ scale: showCelebrationEffect ? [1, 1.2, 1] : 1 }}
                transition={{ duration: 0.5 }}
              >
                {showPercentage ? `${percentage}%` : `${current}/${total}`}
              </motion.span>
              {size !== 'sm' && (
                <div className="text-xs text-white/60 mt-1">
                  Complete
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Celebration Sparkles */}
      <AnimatePresence>
        {showCelebrationEffect && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                style={{
                  left: '50%',
                  top: '50%',
                }}
                animate={{
                  x: [0, (Math.cos(i * 45 * Math.PI / 180) * 60)],
                  y: [0, (Math.sin(i * 45 * Math.PI / 180) * 60)],
                  scale: [0, 1, 0],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 1.5,
                  ease: "easeOut",
                  delay: i * 0.1
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )

  const LinearProgress = () => (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-white/90">Progress</span>
        <span className="text-sm text-white/60">
          {showPercentage ? `${percentage}%` : `${current} of ${total}`}
        </span>
      </div>
      
      <div className="relative h-3 bg-white/10 rounded-full overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-white/10 rounded-full" />
        
        {/* Progress Bar */}
        <motion.div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: animated ? 1.2 : 0, ease: "easeOut" }}
        />
        
        {/* Glow Effect */}
        <motion.div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-400/50 via-purple-400/50 to-pink-400/50 rounded-full blur-sm"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: animated ? 1.2 : 0, ease: "easeOut" }}
        />

        {/* Milestone Markers */}
        {showMilestones && (
          <div className="absolute inset-0">
            {Array.from({ length: total }, (_, i) => {
              const position = ((i + 1) / total) * 100
              const isCompleted = completedMilestones.includes(i + 1)
              
              return (
                <motion.div
                  key={i}
                  className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2"
                  style={{ left: `${position}%` }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <div className={cn(
                    'w-4 h-4 rounded-full border-2 transition-all duration-300',
                    isCompleted 
                      ? 'bg-green-400 border-green-300 shadow-[0_0_10px_rgba(34,197,94,0.5)]'
                      : 'bg-white/20 border-white/40'
                  )}>
                    {isCompleted && (
                      <Check className="w-2 h-2 text-white m-0.5" />
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )

  const RadialProgress = () => (
    <div className={cn('relative', sizeClasses[size])}>
      <svg className="w-full h-full" viewBox="0 0 100 100">
        {/* Background Rings */}
        {[...Array(3)].map((_, i) => (
          <circle
            key={i}
            cx="50"
            cy="50"
            r={35 - i * 8}
            stroke={`rgba(255, 255, 255, ${0.05 + i * 0.02})`}
            strokeWidth="2"
            fill="none"
          />
        ))}
        
        {/* Progress Ring */}
        <motion.circle
          cx="50"
          cy="50"
          r="40"
          stroke="url(#radialGradient)"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={2 * Math.PI * 40}
          initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
          animate={{ 
            strokeDashoffset: (2 * Math.PI * 40) - (percentage / 100) * (2 * Math.PI * 40)
          }}
          transition={{ duration: animated ? 2 : 0, ease: "easeOut" }}
          transform="rotate(-90 50 50)"
        />
        
        <defs>
          <radialGradient id="radialGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#A855F7" />
          </radialGradient>
        </defs>
      </svg>

      {/* Center Icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={{ 
            rotate: showCelebrationEffect ? 360 : 0,
            scale: showCelebrationEffect ? [1, 1.2, 1] : 1
          }}
          transition={{ duration: 1 }}
          className="text-blue-400"
        >
          <Target className="w-8 h-8" />
        </motion.div>
      </div>
    </div>
  )

  const SteppedProgress = () => (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => {
        const stepNumber = i + 1
        const isCompleted = stepNumber <= current
        const isActive = stepNumber === current + 1
        
        return (
          <motion.div
            key={i}
            className="flex flex-col items-center gap-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            {/* Step Circle */}
            <motion.div
              className={cn(
                'w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-semibold transition-all duration-300',
                {
                  'bg-green-500/20 border-green-400 text-green-300': isCompleted,
                  'bg-blue-500/20 border-blue-400 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.3)]': isActive,
                  'bg-white/5 border-white/20 text-white/40': !isCompleted && !isActive,
                }
              )}
              animate={isActive ? {
                scale: [1, 1.1, 1],
                transition: { duration: 2, repeat: Infinity }
              } : {}}
            >
              {isCompleted ? (
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <Check className="w-5 h-5" />
                </motion.div>
              ) : (
                stepNumber
              )}
            </motion.div>
            
            {/* Step Label */}
            <span className={cn(
              'text-xs transition-colors duration-300',
              {
                'text-green-300': isCompleted,
                'text-blue-300': isActive,
                'text-white/40': !isCompleted && !isActive,
              }
            )}>
              Step {stepNumber}
            </span>
          </motion.div>
        )
      })}
    </div>
  )

  const renderProgress = () => {
    switch (variant) {
      case 'linear':
        return <LinearProgress />
      case 'radial':
        return <RadialProgress />
      case 'stepped':
        return <SteppedProgress />
      default:
        return <CircularProgress />
    }
  }

  return (
    <EnhancedLiquidGlass
      variant="timeline"
      intensity="medium"
      animation="hover"
      className={cn('p-6', className)}
    >
      <div className="flex flex-col items-center gap-4">
        {/* Progress Visualization */}
        {renderProgress()}

        {/* Celebration Message */}
        <AnimatePresence>
          {showCelebrationEffect && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.8 }}
              className="flex items-center gap-2 text-yellow-300"
            >
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">
                {percentage === 100 ? 'All milestones completed!' : 'Milestone completed!'}
              </span>
              <Zap className="w-4 h-4" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress Stats */}
        {variant !== 'stepped' && (
          <div className="text-center">
            <div className="text-sm text-white/80 font-medium">
              {current} of {total} milestones completed
            </div>
            {percentage === 100 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
                className="text-xs text-green-300 mt-1"
              >
                🎉 Workflow complete!
              </motion.div>
            )}
          </div>
        )}
      </div>
    </EnhancedLiquidGlass>
  )
}