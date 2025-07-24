"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Instagram, ExternalLink } from 'lucide-react'

interface FullscreenSwipeCardProps {
  id: string
  thumbnailUrl: string
  profilePictureUrl?: string
  reelUrl: string
  script: string
  onSwipeLeft: (id: string) => void
  onSwipeRight: (id: string) => void
  onFlip?: (id: string) => void
}

export function FullscreenSwipeCard({
  id,
  thumbnailUrl,
  profilePictureUrl,
  reelUrl,
  script,
  onSwipeLeft,
  onSwipeRight,
  onFlip
}: FullscreenSwipeCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [rotation, setRotation] = useState(0)
  const [isExiting, setIsExiting] = useState(false)
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null)
  
  const cardRef = useRef<HTMLDivElement>(null)
  const startPos = useRef({ x: 0, y: 0 })
  const startTime = useRef(0)

  const handleStart = (clientX: number, clientY: number) => {
    if (isExiting) return
    setIsDragging(true)
    startPos.current = { x: clientX, y: clientY }
    startTime.current = Date.now()
  }

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging || isExiting) return
    
    const deltaX = clientX - startPos.current.x
    const deltaY = clientY - startPos.current.y
    
    // Only allow horizontal movement for swiping
    setDragOffset({ x: deltaX, y: deltaY * 0.1 })
    setRotation(deltaX * 0.05) // Subtle rotation
  }

  const handleEnd = () => {
    if (!isDragging || isExiting) return
    
    const threshold = 80
    const velocity = Math.abs(dragOffset.x) / (Date.now() - startTime.current)
    const { x } = dragOffset
    
    // Check if it's a tap (small movement, quick time)
    const isTap = Math.abs(x) < 10 && Math.abs(dragOffset.y) < 10 && (Date.now() - startTime.current) < 200
    
    if (isTap) {
      // Handle tap to flip
      setIsFlipped(!isFlipped)
      onFlip?.(id)
    } else if (Math.abs(x) > threshold || velocity > 0.5) {
      // Handle swipe
      setIsExiting(true)
      if (x > 0) {
        setExitDirection('right')
        setTimeout(() => onSwipeRight(id), 300)
      } else {
        setExitDirection('left')
        setTimeout(() => onSwipeLeft(id), 300)
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
    e.preventDefault()
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
    e.preventDefault()
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
      document.addEventListener('touchmove', handleTouchMove, { passive: false })
      document.addEventListener('touchend', handleTouchEnd)
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.removeEventListener('touchmove', handleTouchMove)
        document.removeEventListener('touchend', handleTouchEnd)
      }
    }
  }, [isDragging, dragOffset])

  const handleExternalLink = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.open(reelUrl, '_blank')
  }

  const getTransform = () => {
    if (isExiting) {
      const direction = exitDirection === 'right' ? 1 : -1
      return `translateX(${direction * 120}vw) rotate(${direction * 30}deg)`
    }
    return `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${rotation}deg)`
  }

  const getOpacity = () => {
    if (isExiting) return 0
    if (isDragging) {
      const fadeThreshold = 100
      return Math.max(0.7, 1 - Math.abs(dragOffset.x) / fadeThreshold)
    }
    return 1
  }

  return (
    <div
      ref={cardRef}
      className="fixed inset-0 w-full h-full perspective-1000 select-none touch-none"
      style={{
        transform: getTransform(),
        opacity: getOpacity(),
        transition: isDragging || isExiting ? 'none' : 'transform 0.3s ease-out, opacity 0.3s ease-out',
        cursor: isDragging ? 'grabbing' : 'grab',
        zIndex: 10
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <div
        className={`
          relative w-full h-full transition-transform duration-700 transform-style-preserve-3d
          ${isFlipped ? 'rotate-y-180' : ''}
        `}
      >
        {/* Front Side - Instagram Preview */}
        <div className="absolute inset-0 w-full h-full backface-hidden">
          <div 
            className="w-full h-full bg-cover bg-center relative"
            style={{ 
              backgroundImage: `url(${thumbnailUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />
            
            {/* Profile Picture */}
            {profilePictureUrl && (
              <div className="absolute top-6 left-6">
                <img
                  src={profilePictureUrl}
                  alt="Creator"
                  className="w-12 h-12 rounded-full border-2 border-white shadow-lg"
                />
              </div>
            )}
            
            {/* Instagram Link Button */}
            <button
              className="absolute top-6 right-6 bg-white/90 hover:bg-white text-gray-800 rounded-full p-3 shadow-lg transition-colors"
              onClick={handleExternalLink}
            >
              <Instagram className="w-5 h-5" />
            </button>
            
            {/* Swipe Indicators */}
            {isDragging && (
              <>
                <div
                  className={`
                    absolute top-1/2 left-8 transform -translate-y-1/2 transition-opacity duration-200
                    ${dragOffset.x > 50 ? 'opacity-100' : 'opacity-0'}
                  `}
                >
                  <div className="bg-green-500 text-white px-4 py-2 rounded-full font-bold shadow-lg">
                    SAVE
                  </div>
                </div>
                <div
                  className={`
                    absolute top-1/2 right-8 transform -translate-y-1/2 transition-opacity duration-200
                    ${dragOffset.x < -50 ? 'opacity-100' : 'opacity-0'}
                  `}
                >
                  <div className="bg-red-500 text-white px-4 py-2 rounded-full font-bold shadow-lg">
                    SKIP
                  </div>
                </div>
              </>
            )}
            
            {/* Tap to flip hint */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
              <div className="bg-black/50 text-white px-4 py-2 rounded-full text-sm backdrop-blur-sm">
                Tap to see script
              </div>
            </div>
          </div>
        </div>

        {/* Back Side - Script */}
        <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 bg-white">
          <div className="w-full h-full p-8 flex flex-col">
            {/* Header */}
            <div className="flex-shrink-0 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 text-center">Script Idea</h2>
            </div>
            
            {/* Script Content - Scrollable */}
            <div className="flex-1 overflow-y-auto">
              <div className="prose prose-lg max-w-none">
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                  {script}
                </div>
              </div>
            </div>
            
            {/* Footer hint */}
            <div className="flex-shrink-0 mt-6 text-center">
              <div className="text-gray-500 text-sm">
                Tap anywhere to go back
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}