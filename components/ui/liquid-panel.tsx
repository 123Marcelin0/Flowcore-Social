"use client"

import React from 'react'
import { motion, MotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'
import { EnhancedLiquidGlass } from './enhanced-liquid-glass'

export interface LiquidPanelProps extends MotionProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  headerActions?: React.ReactNode
  variant?: 'default' | 'elevated' | 'floating' | 'sidebar'
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  scrollable?: boolean
  collapsible?: boolean
  collapsed?: boolean
  onToggleCollapse?: () => void
  className?: string
  headerClassName?: string
  contentClassName?: string
}

export function LiquidPanel({
  children,
  title,
  subtitle,
  headerActions,
  variant = 'default',
  size = 'md',
  padding = 'md',
  scrollable = false,
  collapsible = false,
  collapsed = false,
  onToggleCollapse,
  className,
  headerClassName,
  contentClassName,
  ...motionProps
}: LiquidPanelProps) {
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'w-full',
  }

  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-12',
  }

  const variantProps = {
    default: {
      variant: 'editor' as const,
      intensity: 'premium' as const,
      animation: 'hover' as const,
    },
    elevated: {
      variant: 'modal' as const,
      intensity: 'premium' as const,
      animation: 'glow' as const,
      borderGlow: true,
    },
    floating: {
      variant: 'milestone' as const,
      intensity: 'strong' as const,
      animation: 'pulse' as const,
      gradient: true,
    },
    sidebar: {
      variant: 'timeline' as const,
      intensity: 'medium' as const,
      animation: 'hover' as const,
    },
  }

  const collapseVariants = {
    expanded: {
      height: 'auto',
      opacity: 1,
      transition: {
        height: { duration: 0.3, ease: 'easeOut' },
        opacity: { duration: 0.2, delay: 0.1 }
      }
    },
    collapsed: {
      height: 0,
      opacity: 0,
      transition: {
        height: { duration: 0.3, ease: 'easeIn' },
        opacity: { duration: 0.2 }
      }
    }
  }

  return (
    <EnhancedLiquidGlass
      {...variantProps[variant]}
      className={cn(sizeClasses[size], className)}
      {...motionProps}
    >
      {/* Header Section */}
      {(title || subtitle || headerActions || collapsible) && (
        <div className={cn(
          'flex items-start justify-between',
          padding !== 'none' && 'px-6 pt-6 pb-4',
          headerClassName
        )}>
          <div className="flex-1 min-w-0">
            {title && (
              <h3 className="text-lg font-semibold text-white/90 truncate">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-1 text-sm text-white/60 line-clamp-2">
                {subtitle}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-2 ml-4">
            {headerActions}
            {collapsible && (
              <button
                onClick={onToggleCollapse}
                className="p-2 rounded-lg text-white/60 hover:text-white/80 hover:bg-white/10 transition-all duration-200"
                aria-label={collapsed ? 'Expand panel' : 'Collapse panel'}
              >
                <motion.div
                  animate={{ rotate: collapsed ? 0 : 180 }}
                  transition={{ duration: 0.2 }}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </motion.div>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content Section */}
      <motion.div
        variants={collapsible ? collapseVariants : undefined}
        initial={collapsible && collapsed ? 'collapsed' : 'expanded'}
        animate={collapsible ? (collapsed ? 'collapsed' : 'expanded') : undefined}
        className="overflow-hidden"
      >
        <div className={cn(
          scrollable && 'overflow-y-auto',
          padding !== 'none' && paddingClasses[padding],
          title && padding !== 'none' && 'pt-0',
          contentClassName
        )}>
          {children}
        </div>
      </motion.div>

      {/* Decorative elements for elevated variant */}
      {variant === 'elevated' && (
        <>
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-16 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full" />
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-full" />
        </>
      )}

      {/* Floating variant glow effect */}
      {variant === 'floating' && (
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-[32px] blur-xl opacity-50 animate-pulse" 
             style={{ animationDuration: '4s' }} />
      )}
    </EnhancedLiquidGlass>
  )
}