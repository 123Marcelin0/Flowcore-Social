"use client"

import React, { useEffect } from 'react'
import { motion, AnimatePresence, MotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'
import { EnhancedLiquidGlass } from './enhanced-liquid-glass'
import { X } from 'lucide-react'

export interface LiquidModalProps extends MotionProps {
  children: React.ReactNode
  isOpen: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  variant?: 'default' | 'premium' | 'floating' | 'fullscreen'
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
  showCloseButton?: boolean
  headerActions?: React.ReactNode
  className?: string
  overlayClassName?: string
  contentClassName?: string
}

export function LiquidModal({
  children,
  isOpen,
  onClose,
  title,
  subtitle,
  size = 'md',
  variant = 'premium',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  headerActions,
  className,
  overlayClassName,
  contentClassName,
  ...motionProps
}: LiquidModalProps) {
  // Handle escape key
  useEffect(() => {
    if (!closeOnEscape || !isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [closeOnEscape, isOpen, onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-[95vw] max-h-[95vh]',
  }

  const overlayVariants = {
    hidden: {
      opacity: 0,
      backdropFilter: 'blur(0px)',
    },
    visible: {
      opacity: 1,
      backdropFilter: 'blur(20px)',
      transition: {
        duration: 0.3,
        ease: 'easeOut',
      },
    },
    exit: {
      opacity: 0,
      backdropFilter: 'blur(0px)',
      transition: {
        duration: 0.2,
        ease: 'easeIn',
      },
    },
  }

  const modalVariants = {
    hidden: {
      opacity: 0,
      scale: 0.8,
      y: 50,
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: [0.16, 1, 0.3, 1], // Custom easing for premium feel
        delay: 0.1,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.9,
      y: 20,
      transition: {
        duration: 0.2,
        ease: 'easeIn',
      },
    },
  }

  const fullscreenVariants = {
    hidden: {
      opacity: 0,
      scale: 1.1,
    },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1],
      },
    },
    exit: {
      opacity: 0,
      scale: 1.05,
      transition: {
        duration: 0.3,
        ease: 'easeIn',
      },
    },
  }

  const variantProps = {
    default: {
      variant: 'modal' as const,
      intensity: 'premium' as const,
      animation: 'none' as const,
    },
    premium: {
      variant: 'modal' as const,
      intensity: 'premium' as const,
      animation: 'glow' as const,
      borderGlow: true,
      gradient: true,
    },
    floating: {
      variant: 'milestone' as const,
      intensity: 'strong' as const,
      animation: 'pulse' as const,
      gradient: true,
    },
    fullscreen: {
      variant: 'editor' as const,
      intensity: 'premium' as const,
      animation: 'none' as const,
    },
  }

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          className={cn(
            'fixed inset-0 z-50 flex items-center justify-center p-4',
            'bg-black/40',
            overlayClassName
          )}
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={closeOnOverlayClick ? onClose : undefined}
        >
          <motion.div
            className={cn(
              'relative w-full',
              variant === 'fullscreen' ? 'h-full' : 'max-h-[90vh]',
              sizeClasses[size]
            )}
            variants={variant === 'fullscreen' ? fullscreenVariants : modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            {...motionProps}
          >
            <EnhancedLiquidGlass
              {...variantProps[variant]}
              className={cn(
                'w-full h-full flex flex-col',
                variant === 'fullscreen' && 'rounded-none',
                className
              )}
            >
              {/* Header */}
              {(title || subtitle || showCloseButton || headerActions) && (
                <div className="flex items-start justify-between p-6 pb-4 border-b border-white/10">
                  <div className="flex-1 min-w-0">
                    {title && (
                      <h2 className="text-xl font-semibold text-white/90 truncate">
                        {title}
                      </h2>
                    )}
                    {subtitle && (
                      <p className="mt-1 text-sm text-white/60 line-clamp-2">
                        {subtitle}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    {headerActions}
                    {showCloseButton && (
                      <motion.button
                        onClick={onClose}
                        className="p-2 rounded-lg text-white/60 hover:text-white/80 hover:bg-white/10 transition-all duration-200"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        aria-label="Close modal"
                      >
                        <X className="w-5 h-5" />
                      </motion.button>
                    )}
                  </div>
                </div>
              )}

              {/* Content */}
              <div className={cn(
                'flex-1 overflow-y-auto p-6',
                (title || subtitle || showCloseButton || headerActions) && 'pt-4',
                contentClassName
              )}>
                {children}
              </div>

              {/* Premium decorative elements */}
              {variant === 'premium' && (
                <>
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-20 h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-full" />
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-32 h-4 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-full blur-sm" />
                </>
              )}

              {/* Floating variant outer glow */}
              {variant === 'floating' && (
                <div className="absolute -inset-2 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-[36px] blur-2xl opacity-60 animate-pulse" 
                     style={{ animationDuration: '5s' }} />
              )}
            </EnhancedLiquidGlass>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}