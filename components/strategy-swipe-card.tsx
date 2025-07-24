"use client"

import React, { useState, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'

interface StrategySwipeCardProps {
  strategy: any
  isCurrentCard: boolean
  isNextCard: boolean
  isFlipped: boolean
  onFlip: () => void
  onSwipeLeft: () => void
  onSwipeRight: () => void
  swipeDirection: 'left' | 'right' | null
}

export function StrategySwipeCard({
  strategy,
  isCurrentCard,
  isNextCard,
  isFlipped,
  onFlip,
  onSwipeLeft,
  onSwipeRight,
  swipeDirection
}: StrategySwipeCardProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [rotation, setRotation] = useState(0)
  const [pulseEffect, setPulseEffect] = useState<'save' | 'skip' | null>(null)
  const [isInteracting, setIsInteracting] = useState(false)
  
  const cardRef = useRef<HTMLDivElement>(null)
  const startPos = useRef({ x: 0, y: 0 })
  const startTime = useRef(0)

  const IconComponent = strategy.icon

  const handleStart = (clientX: number, clientY: number) => {
    if (!isCurrentCard || isInteracting) return
    setIsDragging(true)
    setIsInteracting(true)
    startPos.current = { x: clientX, y: clientY }
    startTime.current = Date.now()
  }

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging || !isCurrentCard) return
    
    const deltaX = clientX - startPos.current.x
    const deltaY = clientY - startPos.current.y
    
    setDragOffset({ x: deltaX, y: deltaY * 0.1 })
    setRotation(deltaX * 0.05)

    // Show pulse effect based on drag direction
    if (Math.abs(deltaX) > 50) {
      setPulseEffect(deltaX > 0 ? 'save' : 'skip')
    } else {
      setPulseEffect(null)
    }
  }

  const handleEnd = () => {
    if (!isDragging || !isCurrentCard) return
    
    const threshold = 80
    const velocity = Math.abs(dragOffset.x) / (Date.now() - startTime.current)
    const { x } = dragOffset
    
    const isTap = Math.abs(x) < 10 && Math.abs(dragOffset.y) < 10 && (Date.now() - startTime.current) < 200
    
    if (isTap) {
      // Small delay to ensure clean flip animation
      setTimeout(() => {
        onFlip()
        setIsInteracting(false)
      }, 50)
    } else if (Math.abs(x) > threshold || velocity > 0.5) {
      if (x > 0) {
        onSwipeRight()
      } else {
        onSwipeLeft()
      }
      // Reset interaction state after swipe animation
      setTimeout(() => setIsInteracting(false), 250)
    } else {
      // Smooth return to center
      setDragOffset({ x: 0, y: 0 })
      setRotation(0)
      setPulseEffect(null)
      // Quick reset for cancelled swipe
      setTimeout(() => setIsInteracting(false), 100)
    }
    
    setIsDragging(false)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    handleStart(e.clientX, e.clientY)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    handleMove(e.clientX, e.clientY)
  }

  const handleMouseUp = () => {
    handleEnd()
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    handleStart(touch.clientX, touch.clientY)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    handleMove(touch.clientX, touch.clientY)
  }

  const handleTouchEnd = () => {
    handleEnd()
  }

  const getCardStyle = () => {
    if (!isCurrentCard && !isNextCard) return { display: 'none' }
    
    let transform = ''
    let zIndex = 1
    let opacity = 1
    
    if (isCurrentCard) {
      zIndex = 10
      if (swipeDirection === 'left') {
        transform = 'translateX(-100%) rotate(-10deg) scale(0.8)'
        opacity = 0
      } else if (swipeDirection === 'right') {
        transform = 'translateX(100%) rotate(10deg) scale(0.8)'
        opacity = 0
      } else if (isDragging) {
        transform = `translateX(${dragOffset.x}px) translateY(${dragOffset.y}px) rotate(${rotation}deg)`
      }
    } else if (isNextCard) {
      zIndex = 5
      transform = 'scale(0.95) translateY(10px)'
      opacity = 0.8
    }
    
    return {
      transform,
      zIndex,
      opacity,
      transition: isDragging ? 'none' : swipeDirection ? 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)' : 'all 0.3s ease-out'
    }
  }

  return (
    <div
      ref={cardRef}
      className="absolute inset-0 cursor-pointer select-none"
      style={getCardStyle()}
      onMouseDown={handleMouseDown}
      onMouseMove={isDragging ? handleMouseMove : undefined}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pulse Effects */}
      {pulseEffect === 'save' && (
        <div className="absolute inset-0 bg-teal-500 opacity-20 rounded-3xl animate-pulse" />
      )}
      {pulseEffect === 'skip' && (
        <div className="absolute inset-0 bg-red-500 opacity-20 rounded-3xl animate-pulse" />
      )}
      
      <div className="perspective-1000 w-full h-full">
        <div
          className={`
            relative w-full h-full transform-style-preserve-3d transition-transform duration-500
            ${isFlipped ? 'rotate-y-180' : ''}
          `}
        >
          {/* Front of Card */}
          <div className="absolute inset-0 backface-hidden">
            <Card className="w-full h-full bg-white shadow-xl rounded-3xl border-0 overflow-hidden">
              <CardContent className="p-8 h-full flex flex-col">
                <div className={`
                  w-16 h-16 rounded-2xl 
                  bg-gradient-to-br ${strategy.color}
                  flex items-center justify-center mb-6
                  shadow-lg
                `}>
                  <IconComponent className={`w-8 h-8 ${strategy.iconColor}`} />
                </div>
                
                <h3 className="text-2xl font-semibold text-gray-900 mb-4 leading-tight">
                  {strategy.title}
                </h3>
                
                <p className="text-gray-600 text-base leading-relaxed flex-1">
                  {strategy.description}
                </p>
                
                <div className="mt-6 text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full">
                    <div className="w-2 h-2 bg-gray-300 rounded-full animate-pulse" />
                    <span className="text-sm text-gray-500">Tippen für Details</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Back of Card */}
          <div className="absolute inset-0 backface-hidden rotate-y-180">
            <Card className="w-full h-full bg-white shadow-xl rounded-3xl border-0 overflow-hidden">
              <CardContent className="p-8 h-full flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {strategy.title}
                  </h3>
                  <div className={`
                    w-12 h-12 rounded-xl 
                    bg-gradient-to-br ${strategy.color}
                    flex items-center justify-center shadow-sm
                  `}>
                    <IconComponent className={`w-6 h-6 ${strategy.iconColor}`} />
                  </div>
                </div>
                
                <div className="space-y-4 flex-1 overflow-y-auto">
                  {strategy.details?.why && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2 text-sm">Warum es wirkt:</h4>
                      <p className="text-sm text-gray-600 leading-relaxed">{strategy.details.why}</p>
                    </div>
                  )}
                  
                  {strategy.details?.example && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2 text-sm">Beispiel:</h4>
                      <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-lg">
                        {strategy.details.example}
                      </p>
                    </div>
                  )}
                  
                  {strategy.details?.tips && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2 text-sm">Profi-Tipps:</h4>
                      <ul className="text-xs text-gray-600 space-y-2">
                        {strategy.details.tips.map((tip: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2 bg-gray-50 p-2 rounded-lg">
                            <span className="text-teal-500 mt-0.5 font-bold">•</span>
                            <span className="leading-relaxed">{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                
                <div className="mt-6 text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full">
                    <div className="w-2 h-2 bg-gray-300 rounded-full animate-pulse" />
                    <span className="text-sm text-gray-500">Tippen zum Umdrehen</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}