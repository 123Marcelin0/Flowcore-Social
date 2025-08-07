"use client"

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { EnhancedLiquidGlass } from '@/components/ui/enhanced-liquid-glass'
import { Check, Lock, AlertCircle, ChevronRight, Clock, Star } from 'lucide-react'

export interface MilestoneCardProps {
  id: number
  title: string
  description: string
  isCompleted: boolean
  isActive: boolean
  isLocked: boolean
  isRequired: boolean
  hasError?: boolean
  errorMessage?: string
  estimatedTime?: string
  difficulty?: 'easy' | 'medium' | 'hard'
  children?: React.ReactNode
  onActivate?: () => void
  onComplete?: () => void
  className?: string
}

export function MilestoneCard({
  id,
  title,
  description,
  isCompleted,
  isActive,
  isLocked,
  isRequired,
  hasError = false,
  errorMessage,
  estimatedTime,
  difficulty = 'medium',
  children,
  onActivate,
  onComplete,
  className
}: MilestoneCardProps) {
  const getCardState = () => {
    if (hasError) return 'error'
    if (isCompleted) return 'completed'
    if (isActive) return 'active'
    if (isLocked) return 'locked'
    return 'available'
  }

  const cardState = getCardState()

  const cardVariants = {
    locked: {
      scale: 0.95,
      opacity: 0.5,
      transition: { duration: 0.3, ease: 'easeOut' }
    },
    available: {
      scale: 1,
      opacity: 0.8,
      transition: { duration: 0.3, ease: 'easeOut' }
    },
    active: {
      scale: 1.02,
      opacity: 1,
      transition: { duration: 0.3, ease: 'easeOut' }
    },
    completed: {
      scale: 1,
      opacity: 1,
      transition: { duration: 0.3, ease: 'easeOut' }
    },
    error: {
      scale: 1,
      opacity: 1,
      x: [0, -2, 2, -2, 2, 0],
      transition: { duration: 0.5, ease: 'easeOut' }
    }
  }

  const contentVariants = {
    hidden: {
      height: 0,
      opacity: 0,
      transition: { duration: 0.3, ease: 'easeIn' }
    },
    visible: {
      height: 'auto',
      opacity: 1,
      transition: { duration: 0.4, ease: 'easeOut' }
    }
  }

  const checkmarkVariants = {
    hidden: { scale: 0, rotate: -180 },
    visible: { 
      scale: 1, 
      rotate: 0,
      transition: { 
        type: 'spring',
        stiffness: 300,
        damping: 20,
        delay: 0.2
      }
    }
  }

  const getDifficultyColor = () => {
    switch (difficulty) {
      case 'easy': return 'text-green-300'
      case 'medium': return 'text-yellow-300'
      case 'hard': return 'text-red-300'
      default: return 'text-yellow-300'
    }
  }

  const getDifficultyStars = () => {
    const starCount = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3
    return Array.from({ length: 3 }, (_, i) => (
      <Star
        key={i}
        className={cn(
          'w-3 h-3',
          i < starCount ? getDifficultyColor() : 'text-white/20'
        )}
        fill={i < starCount ? 'currentColor' : 'none'}
      />
    ))
  }

  const getGlassProps = () => {
    switch (cardState) {
      case 'active':
        return {
          variant: 'milestone' as const,
          intensity: 'premium' as const,
          animation: 'glow' as const,
          borderGlow: true,
          gradient: true
        }
      case 'completed':
        return {
          variant: 'editor' as const,
          intensity: 'strong' as const,
          animation: 'pulse' as const,
          gradient: false
        }
      case 'error':
        return {
          variant: 'milestone' as const,
          intensity: 'medium' as const,
          animation: 'none' as const,
          gradient: false
        }
      case 'locked':
        return {
          variant: 'timeline' as const,
          intensity: 'subtle' as const,
          animation: 'none' as const,
          gradient: false
        }
      default:
        return {
          variant: 'editor' as const,
          intensity: 'medium' as const,
          animation: 'hover' as const,
          gradient: false
        }
    }
  }

  return (
    <motion.div
      variants={cardVariants}
      animate={cardState}
      whileHover={!isLocked && cardState !== 'completed' ? { scale: 1.02 } : undefined}
      whileTap={!isLocked && cardState !== 'completed' ? { scale: 0.98 } : undefined}
      className={cn('relative', className)}
    >
      <EnhancedLiquidGlass
        {...getGlassProps()}
        className={cn(
          'w-full cursor-pointer transition-all duration-300',
          {
            'cursor-not-allowed': isLocked,
            'ring-2 ring-green-400/30': isCompleted,
            'ring-2 ring-blue-400/30': isActive,
            'ring-2 ring-red-400/30': hasError,
          }
        )}
        onClick={!isLocked ? onActivate : undefined}
      >
        <div className="p-6">
          {/* Header Section */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              {/* Status Icon */}
              <div className={cn(
                'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300',
                {
                  'bg-white/5 border-white/20 text-white/40': cardState === 'locked',
                  'bg-white/10 border-white/30 text-white/70': cardState === 'available',
                  'bg-blue-500/20 border-blue-400/60 text-blue-300 shadow-[0_0_20px_rgba(59,130,246,0.2)]': cardState === 'active',
                  'bg-green-500/20 border-green-400/60 text-green-300 shadow-[0_0_20px_rgba(34,197,94,0.2)]': cardState === 'completed',
                  'bg-red-500/20 border-red-400/60 text-red-300 shadow-[0_0_20px_rgba(239,68,68,0.2)]': cardState === 'error',
                }
              )}>
                <AnimatePresence mode="wait">
                  {isLocked ? (
                    <Lock key="lock" className="w-5 h-5" />
                  ) : isCompleted ? (
                    <motion.div
                      key="check"
                      variants={checkmarkVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      <Check className="w-5 h-5" />
                    </motion.div>
                  ) : hasError ? (
                    <AlertCircle key="error" className="w-5 h-5" />
                  ) : (
                    <span key="number" className="text-sm font-semibold">
                      {id}
                    </span>
                  )}
                </AnimatePresence>

                {/* Active pulse effect */}
                {cardState === 'active' && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-blue-400/30"
                    animate={{
                      scale: [1, 1.3, 1],
                      opacity: [0.5, 0, 0.5],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut'
                    }}
                  />
                )}
              </div>

              {/* Title and Badges */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className={cn(
                    'text-lg font-semibold transition-colors duration-300',
                    {
                      'text-white/50': cardState === 'locked',
                      'text-white/80': cardState === 'available',
                      'text-white/95': cardState === 'active',
                      'text-green-300': cardState === 'completed',
                      'text-red-300': cardState === 'error',
                    }
                  )}>
                    {title}
                  </h3>
                  
                  {/* Required Badge */}
                  {isRequired && (
                    <span className="px-2 py-1 text-xs font-medium bg-orange-500/20 text-orange-300 rounded-full border border-orange-400/30">
                      Required
                    </span>
                  )}
                </div>

                {/* Metadata Row */}
                <div className="flex items-center gap-4 text-xs text-white/60">
                  {/* Difficulty */}
                  <div className="flex items-center gap-1">
                    <span>Difficulty:</span>
                    <div className="flex gap-0.5">
                      {getDifficultyStars()}
                    </div>
                  </div>

                  {/* Estimated Time */}
                  {estimatedTime && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{estimatedTime}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Arrow */}
            {!isLocked && !isCompleted && (
              <motion.div
                className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 text-white/60"
                whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.15)' }}
                whileTap={{ scale: 0.9 }}
              >
                <ChevronRight className="w-4 h-4" />
              </motion.div>
            )}
          </div>

          {/* Description */}
          <p className={cn(
            'text-sm mb-4 transition-colors duration-300',
            {
              'text-white/40': cardState === 'locked',
              'text-white/60': cardState === 'available',
              'text-white/80': cardState === 'active',
              'text-green-200/80': cardState === 'completed',
              'text-red-200/80': cardState === 'error',
            }
          )}>
            {hasError ? errorMessage : description}
          </p>

          {/* Expandable Content */}
          <AnimatePresence>
            {isActive && children && (
              <motion.div
                variants={contentVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="overflow-hidden"
              >
                <div className="pt-4 border-t border-white/10">
                  {children}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Completion Actions */}
          {isActive && onComplete && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-4 pt-4 border-t border-white/10"
            >
              <motion.button
                onClick={onComplete}
                className="w-full px-4 py-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 rounded-xl text-white/90 font-medium transition-all duration-300 hover:from-blue-500/30 hover:to-purple-500/30 hover:border-blue-400/50"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Complete Step
              </motion.button>
            </motion.div>
          )}
        </div>

        {/* Completion Celebration Effect */}
        {isCompleted && (
          <motion.div
            className="absolute inset-0 rounded-inherit"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.3, 0] }}
            transition={{ duration: 1, delay: 0.5 }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 via-blue-400/20 to-purple-400/20 rounded-inherit" />
          </motion.div>
        )}

        {/* Error State Indicator */}
        {hasError && (
          <div className="absolute top-2 right-2">
            <motion.div
              className="w-3 h-3 bg-red-400 rounded-full"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.7, 1, 0.7],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            />
          </div>
        )}

        {/* Active State Glow */}
        {cardState === 'active' && (
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-[32px] blur-xl opacity-60 animate-pulse" 
               style={{ animationDuration: '3s' }} />
        )}

        {/* Completed State Glow */}
        {cardState === 'completed' && (
          <div className="absolute -inset-1 bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-teal-500/10 rounded-[28px] blur-lg opacity-50" />
        )}
      </EnhancedLiquidGlass>
    </motion.div>
  )
}