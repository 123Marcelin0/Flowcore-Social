"use client"

import React from 'react'
import { motion, MotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface LiquidButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'color'> {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  className?: string
}

export function LiquidButton({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  disabled,
  ...props
}: LiquidButtonProps) {
  const baseClasses = [
    'relative',
    'inline-flex',
    'items-center',
    'justify-center',
    'font-medium',
    'rounded-xl',
    'backdrop-blur-xl',
    'border',
    'transition-all',
    'duration-300',
    'ease-out',
    'focus:outline-none',
    'focus:ring-2',
    'focus:ring-offset-2',
    'disabled:opacity-50',
    'disabled:cursor-not-allowed',
    'overflow-hidden',
  ]

  const variantClasses = {
    primary: [
      'bg-gradient-to-r',
      'from-blue-500/80',
      'via-purple-500/80',
      'to-blue-600/80',
      'border-white/20',
      'text-white',
      'shadow-[0_8px_32px_rgba(79,70,229,0.3)]',
      'hover:shadow-[0_12px_48px_rgba(79,70,229,0.4)]',
      'hover:from-blue-400/90',
      'hover:via-purple-400/90',
      'hover:to-blue-500/90',
      'focus:ring-blue-500/50',
    ],
    secondary: [
      'bg-white/10',
      'border-white/20',
      'text-white',
      'shadow-[0_4px_16px_rgba(255,255,255,0.1)]',
      'hover:bg-white/15',
      'hover:border-white/30',
      'hover:shadow-[0_8px_24px_rgba(255,255,255,0.15)]',
      'focus:ring-white/50',
    ],
    danger: [
      'bg-gradient-to-r',
      'from-red-500/80',
      'via-pink-500/80',
      'to-red-600/80',
      'border-white/20',
      'text-white',
      'shadow-[0_8px_32px_rgba(239,68,68,0.3)]',
      'hover:shadow-[0_12px_48px_rgba(239,68,68,0.4)]',
      'hover:from-red-400/90',
      'hover:via-pink-400/90',
      'hover:to-red-500/90',
      'focus:ring-red-500/50',
    ],
    ghost: [
      'bg-transparent',
      'border-transparent',
      'text-white/80',
      'hover:bg-white/10',
      'hover:border-white/20',
      'hover:text-white',
      'focus:ring-white/30',
    ],
  }

  const sizeClasses = {
    sm: ['px-3', 'py-2', 'text-sm', 'gap-2'],
    md: ['px-4', 'py-3', 'text-base', 'gap-2'],
    lg: ['px-6', 'py-4', 'text-lg', 'gap-3'],
  }

  const motionVariants = {
    whileHover: {
      scale: 1.02,
      transition: { duration: 0.2, ease: "easeOut" }
    },
    whileTap: {
      scale: 0.98,
      transition: { duration: 0.1 }
    }
  }

  const isDisabled = disabled || loading

  return (
    <motion.button
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      variants={motionVariants}
      whileHover={!isDisabled ? motionVariants.whileHover : undefined}
      whileTap={!isDisabled ? motionVariants.whileTap : undefined}
      disabled={isDisabled}
      {...props}
    >
      {/* Animated background gradient for primary buttons */}
      {variant === 'primary' && (
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 via-purple-400/20 to-blue-500/20 animate-pulse" 
             style={{ animationDuration: '3s' }} />
      )}

      {/* Glass reflection effect */}
      <div className="absolute inset-0 rounded-inherit">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-white/30 to-transparent" />
      </div>

      {/* Inner content with loading state */}
      <div className="relative z-10 flex items-center justify-center gap-2">
        {loading && (
          <Loader2 className="w-4 h-4 animate-spin" />
        )}
        {children}
      </div>

      {/* Ripple effect overlay */}
      <div className="absolute inset-0 rounded-inherit overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.05] to-transparent animate-pulse" 
             style={{ animationDuration: '2s' }} />
      </div>
    </motion.button>
  )
}