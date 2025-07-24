"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ExternalLink, Heart, X, RotateCcw } from 'lucide-react'

interface SwipeCardProps {
  id: string
  image: string
  profilePicture: string
  reelUrl: string
  script: string
  title?: string
  creator?: string
  onSwipeLeft: (id: string) => void
  onSwipeRight: (id: string) => void
  onFlip?: (id: string) => void
}

export function SwipeCard({
  id,
  image,
  profilePicture,
  reelUrl,
  script,
  title,
  creator,
  onSwipeLeft,
  onSwipeRight,
  onFlip
}: SwipeCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [rotation, setRotation] = useState(0)
  const cardRef = useRef<HTMLDivElement>(null)
  const startPos = useRef({ x: 0, y: 0 })

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    startPos.current = { x: e.clientX, y: e.clientY }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true)
    const touch = e.touches[0]
    startPos.current = { x: touch.clientX, y: touch.clientY }
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return
    
    const deltaX = e.clientX - startPos.current.x
    const deltaY = e.clientY - startPos.current.y
    
    setDragOffset({ x: deltaX, y: deltaY })
    setRotation(deltaX * 0.1) // Slight rotation based on horizontal movement
  }

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging) return
    
    const touch = e.touches[0]
    const deltaX = touch.clientX - startPos.current.x
    const deltaY = touch.clientY - startPos.current.y
    
    setDragOffset({ x: deltaX, y: deltaY })
    setRotation(deltaX * 0.1)
  }

  const handleEnd = () => {
    if (!isDragging) return
    
    const threshold = 100
    const { x } = dragOffset
    
    if (Math.abs(x) > threshold) {
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

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleEnd)
      document.addEventListener('touchmove', handleTouchMove)
      document.addEventListener('touchend', handleEnd)
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleEnd)
        document.removeEventListener('touchmove', handleTouchMove)
        document.removeEventListener('touchend', handleEnd)
      }
    }
  }, [isDragging, dragOffset])

  const handleFlip = () => {
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
      className="relative w-full max-w-sm mx-auto h-[600px] perspective-1000"
      style={{
        transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${rotation}deg)`,
        transition: isDragging ? 'none' : 'transform 0.3s ease-out',
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <div
        className={`relative w-full h-full transition-transform duration-700 transform-style-preserve-3d ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
      >
        {/* Front Side */}
        <Card className="absolute inset-0 w-full h-full backface-hidden rounded-3xl overflow-hidden shadow-2xl border-0">
          <div className="relative w-full h-full">
            {/* Main Image */}
            <div 
              className="w-full h-full bg-cover bg-center cursor-pointer"
              style={{ backgroundImage: `url(${image})` }}
              onClick={handleFlip}
            >
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
              
              {/* External Link Button */}
              <Button
                size="sm"
                variant="secondary"
                className="absolute top-4 right-4 bg-white/90 hover:bg-white text-gray-800 rounded-full p-2 shadow-lg"
                onClick={handleExternalLink}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
              
              {/* Profile Section */}
              <div className="absolute bottom-4 left-4 right-4">
                <div className="flex items-center gap-3 mb-3">
                  <img
                    src={profilePicture}
                    alt="Creator"
                    className="w-12 h-12 rounded-full border-2 border-white shadow-lg"
                  />
                  <div className="text-white">
                    <p className="font-semibold text-lg">{creator || 'Creator'}</p>
                    <p className="text-white/80 text-sm">{title || 'Trending Reel'}</p>
                  </div>
                </div>
                
                {/* Flip Hint */}
                <div className="flex items-center justify-center gap-2 text-white/80 text-sm">
                  <RotateCcw className="w-4 h-4" />
                  <span>Tap to see script</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Back Side */}
        <Card className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-3xl overflow-hidden shadow-2xl border-0 bg-white">
          <div className="p-6 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Script Idea</h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleFlip}
                className="rounded-full p-2"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Script Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                  {script}
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3 mt-4 pt-4 border-t">
              <Button
                variant="outline"
                className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                onClick={() => onSwipeLeft(id)}
              >
                <X className="w-4 h-4 mr-2" />
                Skip
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                onClick={() => onSwipeRight(id)}
              >
                <Heart className="w-4 h-4 mr-2" />
                Save
              </Button>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Swipe Indicators */}
      {isDragging && (
        <>
          <div
            className={`absolute top-1/2 left-4 transform -translate-y-1/2 transition-opacity duration-200 ${
              dragOffset.x > 50 ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="bg-green-500 text-white px-4 py-2 rounded-full font-bold shadow-lg">
              SAVE
            </div>
          </div>
          <div
            className={`absolute top-1/2 right-4 transform -translate-y-1/2 transition-opacity duration-200 ${
              dragOffset.x < -50 ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="bg-red-500 text-white px-4 py-2 rounded-full font-bold shadow-lg">
              SKIP
            </div>
          </div>
        </>
      )}
    </div>
  )
}