"use client"

import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { EnhancedLiquidGlass } from './enhanced-liquid-glass'
import { 
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  RotateCcw,
  Settings,
  Download,
  Share2,
  Save,
  Plus,
  Trash2,
  Edit3,
  Copy,
  Eye,
  EyeOff,
  Lock,
  Unlock
} from 'lucide-react'

// Shared Button Component with consistent styling
interface SharedButtonProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  disabled?: boolean
  loading?: boolean
  onClick?: () => void
  className?: string
}

export function SharedButton({
  children,
  variant = 'secondary',
  size = 'md',
  icon,
  iconPosition = 'left',
  disabled = false,
  loading = false,
  onClick,
  className
}: SharedButtonProps) {
  const baseClasses = [
    'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-transparent',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none'
  ]

  const variantClasses = {
    primary: [
      'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700',
      'text-white shadow-lg hover:shadow-xl',
      'border border-white/20'
    ],
    secondary: [
      'bg-white/10 hover:bg-white/20 backdrop-blur-sm',
      'text-white/90 hover:text-white',
      'border border-white/20 hover:border-white/30'
    ],
    ghost: [
      'bg-transparent hover:bg-white/10',
      'text-white/60 hover:text-white',
      'border border-transparent'
    ],
    danger: [
      'bg-red-500/20 hover:bg-red-500/30',
      'text-red-300 hover:text-red-200',
      'border border-red-500/30 hover:border-red-500/50'
    ]
  }

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm rounded-lg',
    md: 'px-4 py-2 text-sm rounded-lg',
    lg: 'px-6 py-3 text-base rounded-xl'
  }

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
    >
      {loading && (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {!loading && icon && iconPosition === 'left' && icon}
      {children}
      {!loading && icon && iconPosition === 'right' && icon}
    </motion.button>
  )
}

// Shared Card Component
interface SharedCardProps {
  children: React.ReactNode
  variant?: 'default' | 'milestone' | 'timeline' | 'modal'
  intensity?: 'subtle' | 'medium' | 'strong' | 'premium'
  padding?: 'sm' | 'md' | 'lg'
  hover?: boolean
  className?: string
}

export function SharedCard({
  children,
  variant = 'default',
  intensity = 'premium',
  padding = 'md',
  hover = true,
  className
}: SharedCardProps) {
  const paddingClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  }

  const variantMap = {
    default: 'editor',
    milestone: 'milestone',
    timeline: 'timeline',
    modal: 'modal'
  } as const

  return (
    <EnhancedLiquidGlass
      variant={variantMap[variant]}
      intensity={intensity}
      animation={hover ? 'hover' : 'none'}
      className={cn(paddingClasses[padding], className)}
    >
      {children}
    </EnhancedLiquidGlass>
  )
}

// Shared Icon Button
interface SharedIconButtonProps {
  icon: React.ReactNode
  onClick?: () => void
  variant?: 'default' | 'primary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  tooltip?: string
  className?: string
}

export function SharedIconButton({
  icon,
  onClick,
  variant = 'default',
  size = 'md',
  disabled = false,
  tooltip,
  className
}: SharedIconButtonProps) {
  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3'
  }

  const variantClasses = {
    default: 'text-white/60 hover:text-white',
    primary: 'text-blue-400 hover:text-blue-300',
    danger: 'text-red-400 hover:text-red-300'
  }

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      className={cn(
        'rounded-lg transition-colors',
        sizeClasses[size],
        variantClasses[variant],
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
      whileHover={{ scale: disabled ? 1 : 1.1 }}
      whileTap={{ scale: disabled ? 1 : 0.9 }}
    >
      {icon}
    </motion.button>
  )
}

// Shared Progress Bar
interface SharedProgressBarProps {
  value: number
  max?: number
  variant?: 'default' | 'success' | 'warning' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  label?: string
  className?: string
}

export function SharedProgressBar({
  value,
  max = 100,
  variant = 'default',
  size = 'md',
  showLabel = false,
  label,
  className
}: SharedProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  }

  const variantClasses = {
    default: 'from-blue-500 to-purple-600',
    success: 'from-green-500 to-emerald-600',
    warning: 'from-yellow-500 to-orange-600',
    danger: 'from-red-500 to-pink-600'
  }

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-white/70">{label}</span>
          <span className="text-sm text-white/60">{Math.round(percentage)}%</span>
        </div>
      )}
      <div className={cn(
        'w-full bg-white/10 rounded-full overflow-hidden',
        sizeClasses[size]
      )}>
        <motion.div
          className={cn(
            'h-full bg-gradient-to-r rounded-full',
            variantClasses[variant]
          )}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </div>
  )
}

// Shared Status Badge
interface SharedStatusBadgeProps {
  status: 'draft' | 'in-progress' | 'completed' | 'failed' | 'processing' | 'pending'
  size?: 'sm' | 'md'
  className?: string
}

export function SharedStatusBadge({
  status,
  size = 'md',
  className
}: SharedStatusBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm'
  }

  const statusConfig = {
    draft: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Draft' },
    'in-progress': { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'In Progress' },
    completed: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Completed' },
    failed: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Failed' },
    processing: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Processing' },
    pending: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Pending' }
  }

  const config = statusConfig[status]

  return (
    <span className={cn(
      'inline-flex items-center font-medium rounded-full',
      sizeClasses[size],
      config.bg,
      config.text,
      className
    )}>
      {config.label}
    </span>
  )
}

// Shared Toggle Switch
interface SharedToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
  size?: 'sm' | 'md'
  className?: string
}

export function SharedToggle({
  checked,
  onChange,
  label,
  disabled = false,
  size = 'md',
  className
}: SharedToggleProps) {
  const sizeClasses = {
    sm: { container: 'w-8 h-4', thumb: 'w-3 h-3' },
    md: { container: 'w-10 h-5', thumb: 'w-4 h-4' }
  }

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <motion.button
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={cn(
          'relative rounded-full transition-colors duration-200',
          sizeClasses[size].container,
          checked ? 'bg-blue-500' : 'bg-white/20',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        whileTap={{ scale: disabled ? 1 : 0.95 }}
      >
        <motion.div
          className={cn(
            'absolute top-0.5 rounded-full bg-white shadow-sm',
            sizeClasses[size].thumb
          )}
          animate={{
            x: checked ? (size === 'sm' ? 16 : 20) : 2
          }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </motion.button>
      {label && (
        <span className="text-sm text-white/70">{label}</span>
      )}
    </div>
  )
}

// Export all shared components
export {
  // Icons for consistency
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  RotateCcw,
  Settings,
  Download,
  Share2,
  Save,
  Plus,
  Trash2,
  Edit3,
  Copy,
  Eye,
  EyeOff,
  Lock,
  Unlock
}