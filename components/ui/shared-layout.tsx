"use client"

import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface SharedLayoutProps {
  children: React.ReactNode
  variant?: 'editor' | 'timeline' | 'modal'
  className?: string
}

export function SharedLayout({ 
  children, 
  variant = 'editor',
  className 
}: SharedLayoutProps) {
  const backgroundVariants = {
    editor: "bg-gradient-to-br from-gray-900 via-blue-900/20 to-purple-900/20",
    timeline: "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900",
    modal: "bg-gradient-to-br from-black/80 via-gray-900/90 to-black/80"
  }

  const effectVariants = {
    editor: [
      "absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl",
      "absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/8 rounded-full blur-3xl",
      "absolute top-1/2 right-1/3 w-64 h-64 bg-pink-500/6 rounded-full blur-2xl"
    ],
    timeline: [
      "absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl",
      "absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl"
    ],
    modal: [
      "absolute top-1/3 left-1/3 w-72 h-72 bg-white/3 rounded-full blur-3xl"
    ]
  }

  return (
    <div className={cn(
      "min-h-screen relative overflow-hidden",
      backgroundVariants[variant],
      className
    )}>
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/10 to-pink-900/20 pointer-events-none" />
      
      {/* Dynamic Background Elements */}
      {effectVariants[variant].map((effectClass, index) => (
        <motion.div
          key={index}
          className={cn(effectClass, "pointer-events-none")}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8 + index * 2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: index * 1.5
          }}
        />
      ))}

      {/* Subtle Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/1 to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-bl from-transparent via-white/1 to-transparent pointer-events-none" />

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}

// Transition components for smooth page transitions
export function PageTransition({ 
  children, 
  className 
}: { 
  children: React.ReactNode
  className?: string 
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ 
        duration: 0.4, 
        ease: "easeOut" 
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Smooth transitions between editor and timeline views
export function ViewTransition({ 
  children, 
  isVisible,
  className 
}: { 
  children: React.ReactNode
  isVisible: boolean
  className?: string 
}) {
  return (
    <motion.div
      initial={false}
      animate={{
        opacity: isVisible ? 1 : 0,
        scale: isVisible ? 1 : 0.95,
        y: isVisible ? 0 : 10
      }}
      transition={{ 
        duration: 0.3, 
        ease: "easeOut" 
      }}
      className={cn(
        "transition-all duration-300",
        !isVisible && "pointer-events-none",
        className
      )}
    >
      {children}
    </motion.div>
  )
}