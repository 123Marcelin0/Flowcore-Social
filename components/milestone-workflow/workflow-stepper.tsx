"use client"

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { EnhancedLiquidGlass } from '@/components/ui/enhanced-liquid-glass'
import { Check, AlertCircle, ChevronRight } from 'lucide-react'

export interface MilestoneStep {
  id: number
  name: string
  description: string
  isRequired: boolean
  isCompleted: boolean
  isActive: boolean
  hasError?: boolean
  errorMessage?: string
}

export interface WorkflowStepperProps {
  steps: MilestoneStep[]
  currentStep: number
  onStepClick: (stepId: number) => void
  allowSkipping?: boolean
  showProgress?: boolean
  variant?: 'horizontal' | 'vertical'
  className?: string
}

export function WorkflowStepper({
  steps,
  currentStep,
  onStepClick,
  allowSkipping = false,
  showProgress = true,
  variant = 'horizontal',
  className
}: WorkflowStepperProps) {
  const completedSteps = steps.filter(step => step.isCompleted).length
  const progressPercentage = (completedSteps / steps.length) * 100

  const stepVariants = {
    inactive: {
      scale: 0.95,
      opacity: 0.6,
      transition: { duration: 0.3, ease: 'easeOut' }
    },
    active: {
      scale: 1,
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

  const progressVariants = {
    initial: { width: 0 },
    animate: { 
      width: `${progressPercentage}%`,
      transition: { duration: 0.8, ease: 'easeOut' }
    }
  }

  const getStepState = (step: MilestoneStep) => {
    if (step.hasError) return 'error'
    if (step.isCompleted) return 'completed'
    if (step.isActive) return 'active'
    return 'inactive'
  }

  const canClickStep = (step: MilestoneStep) => {
    if (allowSkipping) return true
    if (step.isCompleted || step.isActive) return true
    
    // Check if all previous required steps are completed
    const previousSteps = steps.filter(s => s.id < step.id)
    return previousSteps.every(s => !s.isRequired || s.isCompleted)
  }

  const StepIndicator = ({ step, index }: { step: MilestoneStep; index: number }) => {
    const state = getStepState(step)
    const clickable = canClickStep(step)

    return (
      <motion.div
        className={cn(
          'relative flex items-center',
          variant === 'vertical' ? 'flex-col' : 'flex-row'
        )}
        variants={stepVariants}
        animate={state}
        whileHover={clickable ? { scale: 1.05 } : undefined}
        whileTap={clickable ? { scale: 0.95 } : undefined}
      >
        {/* Step Circle */}
        <motion.button
          onClick={() => clickable && onStepClick(step.id)}
          disabled={!clickable}
          className={cn(
            'relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300',
            'focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-transparent',
            clickable ? 'cursor-pointer' : 'cursor-not-allowed',
            {
              // Inactive state
              'bg-white/5 border-white/20 text-white/40': state === 'inactive',
              // Active state
              'bg-white/15 border-white/40 text-white/90 shadow-[0_0_20px_rgba(255,255,255,0.1)]': state === 'active',
              // Completed state
              'bg-green-500/20 border-green-400/60 text-green-300 shadow-[0_0_20px_rgba(34,197,94,0.2)]': state === 'completed',
              // Error state
              'bg-red-500/20 border-red-400/60 text-red-300 shadow-[0_0_20px_rgba(239,68,68,0.2)]': state === 'error',
            }
          )}
        >
          <AnimatePresence mode="wait">
            {state === 'completed' ? (
              <motion.div
                key="check"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 180 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                <Check className="w-6 h-6" />
              </motion.div>
            ) : state === 'error' ? (
              <motion.div
                key="error"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                <AlertCircle className="w-6 h-6" />
              </motion.div>
            ) : (
              <motion.span
                key="number"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="text-sm font-semibold"
              >
                {step.id}
              </motion.span>
            )}
          </AnimatePresence>

          {/* Active step pulse effect */}
          {state === 'active' && (
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-white/30"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 0, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            />
          )}
        </motion.button>

        {/* Step Label */}
        <div className={cn(
          'flex flex-col',
          variant === 'vertical' ? 'mt-3 text-center' : 'ml-4 text-left'
        )}>
          <span className={cn(
            'text-sm font-medium transition-colors duration-300',
            {
              'text-white/50': state === 'inactive',
              'text-white/90': state === 'active',
              'text-green-300': state === 'completed',
              'text-red-300': state === 'error',
            }
          )}>
            {step.name}
          </span>
          <span className={cn(
            'text-xs transition-colors duration-300 mt-1',
            {
              'text-white/30': state === 'inactive',
              'text-white/60': state === 'active',
              'text-green-200/80': state === 'completed',
              'text-red-200/80': state === 'error',
            }
          )}>
            {step.hasError ? step.errorMessage : step.description}
          </span>
          {step.isRequired && (
            <span className="text-xs text-orange-300/80 mt-1">Required</span>
          )}
        </div>

        {/* Connection Line */}
        {index < steps.length - 1 && (
          <div className={cn(
            'absolute bg-white/20 transition-all duration-500',
            variant === 'vertical' 
              ? 'top-12 left-1/2 transform -translate-x-1/2 w-0.5 h-16'
              : 'top-1/2 left-12 transform -translate-y-1/2 h-0.5 w-16'
          )}>
            {/* Progress line */}
            <motion.div
              className={cn(
                'bg-gradient-to-r from-green-400 to-blue-400',
                variant === 'vertical' ? 'w-full' : 'h-full'
              )}
              initial={{ [variant === 'vertical' ? 'height' : 'width']: 0 }}
              animate={{ 
                [variant === 'vertical' ? 'height' : 'width']: 
                  step.isCompleted ? '100%' : '0%'
              }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        )}

        {/* Arrow for horizontal layout */}
        {variant === 'horizontal' && index < steps.length - 1 && (
          <ChevronRight className="w-4 h-4 text-white/30 ml-2" />
        )}
      </motion.div>
    )
  }

  return (
    <EnhancedLiquidGlass
      variant="milestone"
      intensity="premium"
      animation="hover"
      className={cn('w-full', className)}
    >
      <div className="p-6">
        {/* Progress Header */}
        {showProgress && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white/90">
                Content Creation Workflow
              </h3>
              <span className="text-sm text-white/60">
                {completedSteps} of {steps.length} completed
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 rounded-full"
                variants={progressVariants}
                initial="initial"
                animate="animate"
              />
              
              {/* Progress glow effect */}
              <motion.div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-400/50 via-blue-400/50 to-purple-400/50 rounded-full blur-sm"
                variants={progressVariants}
                initial="initial"
                animate="animate"
              />
            </div>
          </div>
        )}

        {/* Steps Container */}
        <div className={cn(
          'flex',
          variant === 'vertical' 
            ? 'flex-col space-y-8' 
            : 'flex-row items-center justify-between overflow-x-auto pb-4',
          variant === 'horizontal' && steps.length > 4 && 'space-x-8'
        )}>
          {steps.map((step, index) => (
            <StepIndicator key={step.id} step={step} index={index} />
          ))}
        </div>

        {/* Current Step Details */}
        <AnimatePresence mode="wait">
          {steps.find(step => step.isActive) && (
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="mt-8 p-4 rounded-2xl bg-white/5 border border-white/10"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <span className="text-sm font-semibold text-blue-300">
                    {currentStep}
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-white/90 mb-1">
                    Current Step: {steps.find(step => step.isActive)?.name}
                  </h4>
                  <p className="text-xs text-white/60">
                    {steps.find(step => step.isActive)?.description}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </EnhancedLiquidGlass>
  )
}