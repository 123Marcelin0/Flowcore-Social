"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { ExternalLink, RotateCcw } from 'lucide-react'

interface MinimalSwipeCardProps {
  id: string
  image: string
  caption?: string
  reelUrl: string
  script: string
  onSwipeLeft: (id: string) => void
  onSwipeRight: (id: string) => void
  onFlip?: (id: string) => void
}

export function MinimalSwipeCard({
  id,
  image,
  caption,
  reelUrl,
  script,
  onSwipeLeft,
  onSwipeRight,
  onFlip
}: MinimalSwipeCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [rotation, setRotation] = useState(0)
  const [isExiting, setIsExiting] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const startPos = useRef({ x: 0, y: 0 })

  const handleStart = (clientX: number, clientY: number) => {
    if (isFlipped) return // Don't allow dragging when flipped
    setIsDragging(true)
    startPos.current = { x: clientX, y: clientY }
  }

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging || isFlipped) return
    
    const deltaX = clientX - startPos.current.x
    const deltaY = clientY - startPos.current.y
    
    setDragOffset({ x: deltaX, y: deltaY })
    setRotation(deltaX * 0.1) // Slight rotation based on horizontal movement
  }

  const handleEnd = () => {
    if (!isDragging || isFlipped) return
    
    const threshold = 100
    const { x } = dragOffset
    
    if (Math.abs(x) > threshold) {
      setIsExiting(true)
      if (x > 0) {
        onSwipeRight(id)
      } else {
        onSwipeLeft(id)
      }
    } else {
      // Snap back to center
      setDragOffset({ x: 0, y: 0 })
      setRotation(0)
    }
    
    setIsDragging(false)
  }

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    handleStart(e.clientX, e.clientY)
  }

  const handleMouseMove = (e: MouseEvent) => {
    handleMove(e.clientX, e.clientY)
  }

  const handleMouseUp = () => {
    handleEnd()
  }

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    handleStart(touch.clientX, touch.clientY)
  }

  const handleTouchMove = (e: TouchEvent) => {
    const touch = e.touches[0]
    handleMove(touch.clientX, touch.clientY)
  }

  const handleTouchEnd = () => {
    handleEnd()
  }

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.addEventListener('touchmove', handleTouchMove)
      document.addEventListener('touchend', handleTouchEnd)
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.removeEventListener('touchmove', handleTouchMove)
        document.removeEventListener('touchend', handleTouchEnd)
      }
    }
  }, [isDragging, dragOffset])

  const handleFlip = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isDragging) return
    setIsFlipped(!isFlipped)
    onFlip?.(id)
  }

  const handleExternalLink = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.open(reelUrl, '_blank')
  }

  return (
    <div
      ref={cardRef}
      className={`
        relative w-full max-w-sm mx-auto h-[500px] perspective-1000 select-none
        ${isExiting ? 'pointer-events-none' : ''}
      `}
      style={{
        transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${rotation}deg)`,
        transition: isDragging || isExiting ? 'none' : 'transform 0.3s ease-out',
        cursor: isFlipped ? 'default' : (isDragging ? 'grabbing' : 'grab')
      }}
      onMouseDown={!isFlipped ? handleMouseDown : undefined}
      onTouchStart={!isFlipped ? handleTouchStart : undefined}
    >
      <div
        className={`
          relative w-full h-full transition-transform duration-700 transform-style-preserve-3d
          ${isFlipped ? 'rotate-y-180' : ''}
        `}
      >
        {/* Front Side */}
        <Card className="absolute inset-0 w-full h-full backface-hidden rounded-2xl overflow-hidden shadow-xl border-0 bg-white">
          <div className="relative w-full h-full flex flex-col">
            {/* Image Container */}
            <div className="relative flex-1 p-6">
              <div 
                className="w-full h-full bg-cover bg-center rounded-xl cursor-pointer"
                style={{ backgroundImage: `url(${image})` }}
                onClick={handleFlip}
              >
                {/* Optional external link button */}
                {reelUrl && (
                  <button
                    className="absolute top-3 right-3 bg-white/90 hover:bg-white text-gray-800 rounded-full p-2 shadow-lg transition-colors"
                    onClick={handleExternalLink}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            
            {/* Caption */}
            {caption && (
              <div className="px-6 pb-6">
                <p className="text-gray-900 font-medium text-center text-lg leading-relaxed">
                  {caption}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Back Side */}
        <Card className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-2xl overflow-hidden shadow-xl border-0 bg-white">
          <div className="p-6 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h3 className="text-xl font-bold text-gray-900">Script Idea</h3>
              <button
                onClick={handleFlip}
                className="rounded-full p-2 hover:bg-gray-100 transition-colors"
              >
                <RotateCcw className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            
            {/* Script Content - Scrollable */}
            <div className="flex-1 overflow-y-auto">
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                  {script}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Swipe Direction Indicators */}
      {isDragging && !isFlipped && (
        <>
          <div
            className={`
              absolute top-1/2 left-4 transform -translate-y-1/2 transition-opacity duration-200
              ${dragOffset.x > 50 ? 'opacity-100' : 'opacity-0'}
            `}
          >
            <div className="bg-green-500 text-white px-3 py-2 rounded-full font-bold shadow-lg text-sm">
              SAVE
            </div>
          </div>
          <div
            className={`
              absolute top-1/2 right-4 transform -translate-y-1/2 transition-opacity duration-200
              ${dragOffset.x < -50 ? 'opacity-100' : 'opacity-0'}
            `}
          >
            <div className="bg-red-500 text-white px-3 py-2 rounded-full font-bold shadow-lg text-sm">
              SKIP
            </div>
          </div>
        </>
      )}
    </div>
  )
}