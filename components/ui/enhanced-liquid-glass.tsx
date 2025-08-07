"use client"

import React from 'react'
import { motion, MotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface EnhancedLiquidGlassProps extends MotionProps {
  children: React.ReactNode
  variant?: 'milestone' | 'editor' | 'timeline' | 'modal'
  intensity?: 'subtle' | 'medium' | 'strong' | 'premium'
  animation?: 'none' | 'hover' | 'pulse' | 'glow'
  gradient?: boolean
  borderGlow?: boolean
  className?: string
}

export function EnhancedLiquidGlass({
  children,
  variant = 'editor',
  intensity = 'premium',
  animation = 'hover',
  gradient = false,
  borderGlow = false,
  className,
  ...motionProps
}: EnhancedLiquidGlassProps) {
  const baseClasses = [
    'relative',
    'backdrop-blur-[40px]',
    'backdrop-saturate-[200%]',
    'backdrop-brightness-[1.05]',
    'border',
    'transition-all',
    'duration-600',
    'ease-out',
    'overflow-hidden',
  ]

  const variantClasses = {
    milestone: [
      'rounded-[28px]',
      'shadow-[0_20px_60px_rgba(0,0,0,0.06),0_8px_25px_rgba(0,0,0,0.04)]',
      'hover:shadow-[0_25px_80px_rgba(0,0,0,0.08),0_12px_35px_rgba(0,0,0,0.06)]',
    ],
    editor: [
      'rounded-[24px]',
      'shadow-[0_16px_48px_rgba(0,0,0,0.08),0_6px_20px_rgba(0,0,0,0.05)]',
      'hover:shadow-[0_20px_64px_rgba(0,0,0,0.10),0_8px_28px_rgba(0,0,0,0.07)]',
    ],
    timeline: [
      'rounded-[20px]',
      'shadow-[0_12px_36px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)]',
      'hover:shadow-[0_16px_48px_rgba(0,0,0,0.08),0_6px_20px_rgba(0,0,0,0.05)]',
    ],
    modal: [
      'rounded-[32px]',
      'shadow-[0_32px_96px_rgba(0,0,0,0.12),0_16px_48px_rgba(0,0,0,0.08)]',
      'hover:shadow-[0_40px_120px_rgba(0,0,0,0.15),0_20px_60px_rgba(0,0,0,0.10)]',
    ],
  }

  const intensityClasses = {
    subtle: [
      'bg-white/[0.04]',
      'border-white/[0.06]',
      'hover:bg-white/[0.08]',
      'hover:border-white/[0.10]',
    ],
    medium: [
      'bg-white/[0.08]',
      'border-white/[0.10]',
      'hover:bg-white/[0.12]',
      'hover:border-white/[0.15]',
    ],
    strong: [
      'bg-white/[0.12]',
      'border-white/[0.15]',
      'hover:bg-white/[0.18]',
      'hover:border-white/[0.20]',
    ],
    premium: [
      'bg-gradient-to-br',
      'from-white/[0.15]',
      'via-white/[0.08]',
      'to-transparent',
      'border-white/[0.08]',
      'hover:from-white/[0.2]',
      'hover:via-white/[0.12]',
      'hover:border-white/[0.12]',
    ],
  }

  const animationVariants = {
    none: {},
    hover: {
      whileHover: {
        scale: 1.02,
        transition: { duration: 0.3, ease: "easeOut" }
      },
      whileTap: {
        scale: 0.98,
        transition: { duration: 0.1 }
      }
    },
    pulse: {
      animate: {
        scale: [1, 1.01, 1],
        opacity: [1, 0.95, 1],
        transition: {
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }
      }
    },
    glow: {
      animate: {
        boxShadow: [
          '0_20px_60px_rgba(0,0,0,0.06),0_8px_25px_rgba(0,0,0,0.04)',
          '0_25px_80px_rgba(255,255,255,0.08),0_12px_35px_rgba(255,255,255,0.06)',
          '0_20px_60px_rgba(0,0,0,0.06),0_8px_25px_rgba(0,0,0,0.04)'
        ],
        transition: {
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }
      }
    }
  }

  return (
    <motion.div
      className={cn(
        baseClasses,
        variantClasses[variant],
        intensityClasses[intensity],
        className
      )}
      {...animationVariants[animation]}
      {...motionProps}
    >
      {/* Premium glass reflection effect */}
      <div className="absolute inset-0 rounded-inherit">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent" />
        {intensity === 'premium' && (
          <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        )}
      </div>

      {/* Inner glow effect */}
      <div className="absolute inset-0 rounded-inherit">
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent" />
        {intensity === 'premium' && (
          <div className="absolute inset-0 bg-gradient-to-tl from-white/[0.01] via-transparent to-white/[0.02]" />
        )}
      </div>

      {/* Gradient overlay */}
      {gradient && (
        <div className="absolute inset-0 rounded-inherit bg-gradient-to-br from-blue-500/[0.05] via-purple-500/[0.03] to-pink-500/[0.05]" />
      )}

      {/* Border glow effect */}
      {borderGlow && (
        <div className="absolute inset-0 rounded-inherit">
          <div className="absolute inset-0 rounded-inherit border border-white/[0.08] animate-pulse" 
               style={{ animationDuration: '3s' }} />
        </div>
      )}

      {/* Animated ripple effect */}
      {animation !== 'none' && (
        <div className="absolute inset-0 rounded-inherit overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent animate-pulse" 
               style={{ animationDuration: '5s' }} />
        </div>
      )}

      {/* Content container with proper z-index */}
      <div className="relative z-10">
        {children}
      </div>

      {/* Premium shadow inset */}
      {intensity === 'premium' && (
        <div className="absolute inset-0 rounded-inherit shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]" />
      )}
    </motion.div>
  )
}