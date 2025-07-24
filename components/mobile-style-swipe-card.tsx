"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Instagram, RotateCcw } from 'lucide-react'

interface MobileStyleSwipeCardProps {
  id: string
  thumbnailUrl: string
  profilePictureUrl?: string
  reelUrl: string
  script: string
  title?: string
  description?: string
  onSwipeLeft: (id: string) => void
  onSwipeRight: (id: string) => void
  onFlip?: (id: string) => void
}

export function MobileStyleSwipeCard({
  id,
  thumbnailUrl,
  profilePictureUrl,
  reelUrl,
  script,
  title,
  description,
  onSwipeLeft,
  onSwipeRight,
  onFlip
}: MobileStyleSwipeCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [rotation, setRotation] = useState(0)
  const [isExiting, setIsExiting] = useState(false)
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null)
  const [pulseEffect, setPulseEffect] = useState<'save' | 'skip' | null>(null)
  
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
    
    setDragOffset({ x: deltaX, y: deltaY * 0.1 })
    setRotation(deltaX * 0.05)
  }

  const handleEnd = () => {
    if (!isDragging || isExiting) return
    
    const threshold = 80
    const velocity = Math.abs(dragOffset.x) / (Date.now() - startTime.current)
    const { x } = dragOffset
    
    const isTap = Math.abs(x) < 10 && Math.abs(dragOffset.y) < 10 && (Date.now() - startTime.current) < 200
    
    if (isTap) {
      setIsFlipped(!isFlipped)
      onFlip?.(id)
    } else if (Math.abs(x) > threshold || velocity > 0.5) {
      setIsExiting(true)
      if (x > 0) {
        setExitDirection('right')
        setPulseEffect('save')
        setTimeout(() => {
          onSwipeRight(id)
          setPulseEffect(null)
        }, 150)
      } else {
        setExitDirection('left')
        setPulseEffect('skip')
        setTimeout(() => {
          onSwipeLeft(id)
          setPulseEffect(null)
        }, 150)
      }
    } else {
      setDragOffset({ x: 0, y: 0 })
      setRotation(0)
    }
    
    setIsDragging(false)
  }

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

  const handleFlip = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isDragging) return
    setIsFlipped(!isFlipped)
    onFlip?.(id)
  }

  const getTransform = () => {
    if (isExiting) {
      const direction = exitDirection === 'right' ? 1 : -1
      return `translateX(${direction * 100}vw) rotate(${direction * 20}deg) scale(0.8)`
    }
    return `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${rotation}deg)`
  }

  const getOpacity = () => {
    if (isExiting) return 0
    if (isDragging) {
      const fadeThreshold = 150
      return Math.max(0.8, 1 - Math.abs(dragOffset.x) / fadeThreshold)
    }
    return 1
  }

  return (
    <div
      ref={cardRef}
      className="relative w-full max-w-md mx-auto h-[650px] perspective-1000 select-none"
      style={{
        transform: getTransform(),
        opacity: getOpacity(),
        transition: isDragging ? 'none' : isExiting ? 'all 0.15s ease-in' : 'transform 0.3s ease-out, opacity 0.3s ease-out',
        cursor: isDragging ? 'grabbing' : 'grab'
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
        <Card className={`
          absolute inset-0 w-full h-full backface-hidden rounded-3xl overflow-hidden shadow-2xl border-0 bg-white
          ${pulseEffect === 'save' ? 'animate-pulse-green' : pulseEffect === 'skip' ? 'animate-pulse-red' : ''}
        `}>
          <div className="relative w-full h-full">
            {/* Main Image */}
            <div 
              className="w-full h-[60%] bg-cover bg-center cursor-pointer relative"
              style={{ backgroundImage: `url(${thumbnailUrl})` }}
            >
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
              
              {/* Profile Picture */}
              {profilePictureUrl && (
                <div className="absolute top-4 left-4">
                  <img
                    src={profilePictureUrl}
                    alt="Creator"
                    className="w-10 h-10 rounded-full border-2 border-white shadow-lg"
                  />
                </div>
              )}
              
              {/* Instagram Link Button */}
              <a
                href={reelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute top-4 right-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-full p-2.5 shadow-lg transition-all duration-200 hover:scale-110"
                onClick={(e) => e.stopPropagation()}
              >
                <Instagram className="w-4 h-4" />
              </a>
              
              {/* Swipe Indicators */}
              {isDragging && (
                <>
                  <div
                    className={`
                      absolute top-1/2 left-6 transform -translate-y-1/2 transition-opacity duration-200
                      ${dragOffset.x > 50 ? 'opacity-100' : 'opacity-0'}
                    `}
                  >
                    <div className="bg-green-500 text-white px-3 py-2 rounded-full font-bold shadow-lg text-sm">
                      SAVE
                    </div>
                  </div>
                  <div
                    className={`
                      absolute top-1/2 right-6 transform -translate-y-1/2 transition-opacity duration-200
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
            
            {/* Content Section */}
            <div className="h-[40%] p-6 flex flex-col justify-between cursor-pointer bg-white">
              {/* Title and Description */}
              <div className="flex-1 flex flex-col justify-center">
                {title && (
                  <h3 className="text-lg font-bold text-gray-900 mb-2 text-center line-clamp-2">
                    {title}
                  </h3>
                )}
                {description && (
                  <p className="text-sm text-gray-600 text-center line-clamp-2 leading-relaxed">
                    {description}
                  </p>
                )}
              </div>
              
              {/* Tap to flip hint */}
              <div className="text-center">
                <div className="text-gray-500 text-xs flex items-center justify-center gap-2">
                  <RotateCcw className="w-3 h-3" />
                  <span>Tap to see script</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Back Side - Script */}
        <Card className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-3xl overflow-hidden shadow-2xl border-0 bg-white cursor-pointer">
          <div className="p-6 h-full flex flex-col" onClick={handleFlip}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h3 className="text-xl font-bold text-gray-900">Script Idea</h3>
              <div className="rounded-full p-2 hover:bg-gray-100 transition-colors">
                <RotateCcw className="w-5 h-5 text-gray-600" />
              </div>
            </div>
            
            {/* Script Content - Scrollable */}
            <div className="flex-1 overflow-y-auto">
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed script-content">
                  {script}
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="flex-shrink-0 mt-4 text-center">
              <div className="text-gray-500 text-sm">
                Tap anywhere to go back
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}