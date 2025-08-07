"use client"

import React from 'react'
import { motion, MotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'

interface LiquidGlassProps extends MotionProps {
  children: React.ReactNode
  variant?: 'card' | 'panel' | 'floating'
  intensity?: 'subtle' | 'medium' | 'strong'
  className?: string
  rippleEffect?: boolean
  flowOnHover?: boolean
  stretchOnDrag?: boolean
}

export function LiquidGlass({
  children,
  variant = 'card',
  intensity = 'medium',
  className,
  rippleEffect = true,
  flowOnHover = true,
  stretchOnDrag = false,
  ...motionProps
}: LiquidGlassProps) {
  const baseClasses = [
    'relative',
    'backdrop-blur-xl',
    'border',
    'transition-all',
    'duration-500',
    'ease-out',
  ]

  const variantClasses = {
    card: [
      'rounded-2xl',
      'shadow-[0_8px_32px_rgba(0,0,0,0.12)]',
      'hover:shadow-[0_12px_48px_rgba(0,0,0,0.15)]',
    ],
    panel: [
      'rounded-3xl',
      'shadow-[0_16px_64px_rgba(0,0,0,0.15)]',
      'hover:shadow-[0_24px_80px_rgba(0,0,0,0.18)]',
    ],
    floating: [
      'rounded-xl',
      'shadow-[0_4px_16px_rgba(0,0,0,0.08)]',
      'hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)]',
    ],
  }

  const intensityClasses = {
    subtle: [
      'bg-white/[0.03]',
      'border-white/[0.08]',
      'hover:bg-white/[0.05]',
      'hover:border-white/[0.12]',
    ],
    medium: [
      'bg-white/[0.06]',
      'border-white/[0.12]',
      'hover:bg-white/[0.08]',
      'hover:border-white/[0.16]',
    ],
    strong: [
      'bg-white/[0.10]',
      'border-white/[0.16]',
      'hover:bg-white/[0.12]',
      'hover:border-white/[0.20]',
    ],
  }

  const motionVariants = {
    whileHover: flowOnHover ? {
      scale: 1.02,
      transition: { duration: 0.3, ease: "easeOut" }
    } : undefined,
    whileTap: {
      scale: 0.98,
      transition: { duration: 0.1 }
    },
    ...(stretchOnDrag && {
      whileDrag: {
        scale: 1.05,
        rotate: 2,
        transition: { duration: 0.2 }
      }
    })
  }

  return (
    <motion.div
      className={cn(
        baseClasses,
        variantClasses[variant],
        intensityClasses[intensity],
        className
      )}
      variants={motionVariants}
      whileHover={motionVariants.whileHover}
      whileTap={motionVariants.whileTap}
      {...(stretchOnDrag && { whileDrag: motionVariants.whileDrag })}
      {...motionProps}
    >
      {/* Glass reflection effect */}
      <div className="absolute inset-0 rounded-inherit">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent" />
      </div>

      {/* Inner glow effect */}
      <div className="absolute inset-0 rounded-inherit bg-gradient-to-br from-white/[0.02] via-transparent to-transparent" />

      {/* Ripple effect overlay */}
      {rippleEffect && (
        <div className="absolute inset-0 rounded-inherit overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent animate-pulse" 
               style={{ animationDuration: '4s' }} />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  )
}

// CSS custom properties for liquid glass
export const liquidGlassStyles = `
  :root {
    --liquid-glass-bg: rgba(255, 255, 255, 0.06);
    --liquid-glass-border: rgba(255, 255, 255, 0.12);
    --liquid-glass-hover-bg: rgba(255, 255, 255, 0.08);
    --liquid-glass-hover-border: rgba(255, 255, 255, 0.16);
    --liquid-glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
    --liquid-glass-shadow-hover: 0 12px 48px rgba(0, 0, 0, 0.15);
  }
`