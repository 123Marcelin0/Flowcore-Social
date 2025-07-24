"use client"

import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowLeft, 
  Bookmark, 
  RefreshCw, 
  Heart, 
  X, 
  Sparkles,
  RotateCcw,
  Target,
  Clock,
  Award
} from "lucide-react"
import { StrategySwipeCard } from "@/components/strategy-swipe-card"
import { getSwipeStrategies, type StrategyData } from "@/lib/sample-ideas"
import type { ContentStep } from "../hooks/useContentIdeas"
import { toast } from 'sonner'
import { ContentIdeaService } from "@/lib/content-idea-service"
import { useAuth } from "@/lib/auth-context"

interface ContentIdeasStrategiesProps {
  setCurrentStep: (step: ContentStep) => void
}

export function ContentIdeasStrategies({ setCurrentStep }: ContentIdeasStrategiesProps) {
  const { user } = useAuth()
  const [strategies] = useState<StrategyData[]>(getSwipeStrategies())
  const [currentIndex, setCurrentIndex] = useState(0)
  const [savedStrategies, setSavedStrategies] = useState<StrategyData[]>([])
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set())
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null)
  const [showSaved, setShowSaved] = useState(false)

  const currentStrategy = strategies[currentIndex]
  const hasMoreStrategies = currentIndex < strategies.length - 1

  const handleSwipeLeft = () => {
    if (swipeDirection) return // Prevent multiple swipes
    setSwipeDirection('left')
    
    // Use a shorter delay and ensure smooth transition
    setTimeout(() => {
      setCurrentIndex(prev => Math.min(prev + 1, strategies.length - 1))
      setSwipeDirection(null)
    }, 250) // Reduced from 300ms
  }

  const handleSwipeRight = async () => {
    if (swipeDirection) return // Prevent multiple swipes
    
    if (!user?.id) {
      toast.error('Bitte melde dich an, um Strategien zu speichern')
      return
    }

    const strategy = strategies[currentIndex]
    if (strategy && !savedStrategies.find(s => s.id === strategy.id)) {
      try {
        // Save to database with embedding
        const savedStrategyData = await ContentIdeaService.saveStrategyIdea(strategy, user.id)
        
        if (savedStrategyData) {
          setSavedStrategies(prev => [...prev, strategy])
          toast.success('💾 Strategie in Datenbank gespeichert!')
        } else {
          toast.error('Fehler beim Speichern der Strategie')
        }
      } catch (error) {
        console.error('Error saving strategy:', error)
        toast.error('Fehler beim Speichern der Strategie')
      }
    }
    
    setSwipeDirection('right')
    
    // Use a shorter delay and ensure smooth transition
    setTimeout(() => {
      setCurrentIndex(prev => Math.min(prev + 1, strategies.length - 1))
      setSwipeDirection(null)
    }, 250) // Reduced from 300ms
  }

  const handleFlip = () => {
    if (currentStrategy && !swipeDirection) { // Prevent flip during swipe
      setFlippedCards(prev => {
        const newSet = new Set(prev)
        if (newSet.has(currentStrategy.id)) {
          newSet.delete(currentStrategy.id)
        } else {
          newSet.add(currentStrategy.id)
        }
        return newSet
      })
    }
  }

  const removeSavedStrategy = (id: string) => {
    setSavedStrategies(prev => prev.filter(s => s.id !== id))
    toast.success('Strategie entfernt')
  }

  const resetStrategies = () => {
    setCurrentIndex(0)
    setFlippedCards(new Set())
    setSwipeDirection(null)
    toast.success('Strategien zurückgesetzt!')
  }

  if (showSaved) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="border-b border-gray-100 bg-white">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <Button 
                variant="ghost" 
                onClick={() => setShowSaved(false)}
                className="flex items-center gap-2 h-10 px-4 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-sm hover:shadow-md transition-all duration-200"
                style={{
                  border: 'none',
                  outline: 'none'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'white'
                  e.currentTarget.style.color = '#0D9488'
                  e.currentTarget.style.border = '2px solid #0D9488'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(to right, #14b8a6, #06b6d4)'
                  e.currentTarget.style.color = 'white'
                  e.currentTarget.style.border = 'none'
                }}
              >
                <ArrowLeft className="w-4 h-4" />
                Zurück zu Strategien
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">
                Gespeicherte Strategien ({savedStrategies.length})
              </h1>
              <div className="w-20"></div>
            </div>
          </div>
        </div>

        {/* Saved Strategies Grid */}
        <div className="max-w-6xl mx-auto px-6 py-8">
          {savedStrategies.length === 0 ? (
            <div className="text-center py-12">
              <Bookmark className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Noch keine Strategien gespeichert</p>
              <p className="text-sm text-gray-500 mt-2">Swipe nach rechts um Strategien zu speichern</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedStrategies.map((strategy) => {
                const IconComponent = strategy.icon
                return (
                  <Card key={strategy.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`
                          w-12 h-12 rounded-xl 
                          bg-gradient-to-br ${strategy.color}
                          flex items-center justify-center shadow-sm
                        `}>
                          <IconComponent className={`w-6 h-6 ${strategy.iconColor}`} />
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-gray-400 hover:text-gray-600 rounded-full p-1"
                          onClick={() => removeSavedStrategy(strategy.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <h3 className="font-semibold text-gray-900 mb-2 text-lg">
                        {strategy.title}
                      </h3>
                      
                      <p className="text-gray-600 text-sm leading-relaxed">
                        {strategy.description}
                      </p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - with Content-Strategien button in the center */}
      <div className="">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={() => setCurrentStep("overview")}
              className="flex items-center gap-2 h-10 px-4 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-sm hover:shadow-md transition-all duration-200"
              style={{
                border: 'none',
                outline: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'white'
                e.currentTarget.style.color = '#0D9488'
                e.currentTarget.style.border = '2px solid #0D9488'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(to right, #14b8a6, #06b6d4)'
                e.currentTarget.style.color = 'white'
                e.currentTarget.style.border = 'none'
              }}
            >
              <ArrowLeft className="w-4 h-4" />
              Zurück
            </Button>
            
            {/* Content-Strategien Title - filled gradient style like other buttons */}
            <button className="relative inline-flex items-center gap-3 px-8 py-3 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-medium text-xl transition-all duration-300 ease-in-out group hover:scale-105" style={{ marginRight: '3rem' }}>
              {/* Pulse effect on hover */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 opacity-0 group-hover:opacity-75 group-hover:animate-ping"></div>
              
              {/* Animated border with gradient */}
              <div className="absolute inset-0 rounded-full border-2 border-transparent bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-300 group-hover:opacity-50" 
                   style={{ mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', maskComposite: 'xor' }}></div>
              
              {/* Hover glow effect with gradient */}
              <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-300 bg-gradient-to-r from-teal-500 to-cyan-500 blur-md"></div>
              
              {/* Content with white text */}
              <Target className="w-6 h-6 relative z-10 text-white" />
              <span className="relative z-10 text-white">Content-Strategien</span>
            </button>
            
            {/* Clean save icon button in application colors */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSaved(true)}
              className="h-10 w-10 p-0 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-sm hover:shadow-md transition-all duration-200"
              style={{
                border: 'none',
                outline: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'white'
                e.currentTarget.style.color = '#0D9488'
                e.currentTarget.style.border = '2px solid #0D9488'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(to right, #14b8a6, #06b6d4)'
                e.currentTarget.style.color = 'white'
                e.currentTarget.style.border = 'none'
              }}
            >
              <Bookmark className="w-4 h-4" />
              {savedStrategies.length > 0 && (
                <Badge variant="secondary" className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs bg-red-500 text-white border-2 border-white rounded-full flex items-center justify-center">
                  {savedStrategies.length}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Swipe Interface - moved up with proper z-index */}
      <div className="max-w-md mx-auto px-6 py-8 relative z-50">
        {!hasMoreStrategies && currentIndex >= strategies.length ? (
          // No more strategies
          <div className="text-center py-12">
            <Sparkles className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Alle Strategien durchgesehen!</h3>
            <p className="text-gray-600 mb-6">Du hast alle verfügbaren Content-Strategien gesehen</p>
            <Button 
              onClick={resetStrategies} 
              className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-full px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Von vorne beginnen
            </Button>
          </div>
        ) : (
          // Card Stack with Improved Animation and proper z-index
          <div className="relative h-[600px] overflow-visible z-50">
            {strategies.slice(currentIndex, currentIndex + 3).map((strategy, index) => (
              <div
                key={`${strategy.id}-${currentIndex}`} // Add currentIndex to force re-render
                className="absolute inset-0"
                style={{
                  zIndex: 100 + (3 - index),
                  transform: index === 0 ? 'scale(1)' : `scale(${0.95 - index * 0.02}) translateY(${index * 8}px)`,
                  opacity: index === 0 ? 1 : 0.8 - index * 0.1,
                  transition: swipeDirection ? 'none' : 'all 0.3s ease-out'
                }}
              >
                <StrategySwipeCard
                  strategy={strategy}
                  isCurrentCard={index === 0}
                  isNextCard={index === 1}
                  isFlipped={flippedCards.has(strategy.id)}
                  onFlip={index === 0 ? handleFlip : () => {}}
                  onSwipeLeft={index === 0 ? handleSwipeLeft : () => {}}
                  onSwipeRight={index === 0 ? handleSwipeRight : () => {}}
                  swipeDirection={index === 0 ? swipeDirection : null}
                />
              </div>
            ))}
          </div>
        )}

        {/* Modern Clean Action Buttons - Fixed hover effects */}
        {hasMoreStrategies && currentIndex < strategies.length && (
          <div className="flex justify-center gap-8 mt-8 relative z-40">
            <Button
              size="lg"
              variant="ghost"
              className="no-focus-outline rounded-full w-16 h-16 p-0 bg-white border-2 border-red-200 text-red-500 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
              onClick={handleSwipeLeft}
              disabled={!!swipeDirection}
              style={{
                outline: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'white'
                e.currentTarget.style.color = '#EF4444'
                e.currentTarget.style.borderColor = '#FCA5A5'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white'
                e.currentTarget.style.color = '#EF4444'
                e.currentTarget.style.borderColor = '#FECACA'
              }}
            >
              <X className="w-6 h-6" />
            </Button>
            
            <Button
              size="lg"
              variant="ghost"
              className="no-focus-outline rounded-full w-16 h-16 p-0 bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
              onClick={handleSwipeRight}
              disabled={!!swipeDirection}
              style={{
                outline: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'white'
                e.currentTarget.style.color = '#0D9488'
                e.currentTarget.style.border = '2px solid #0D9488'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(to right, #14b8a6, #06b6d4)'
                e.currentTarget.style.color = 'white'
                e.currentTarget.style.border = 'none'
              }}
            >
              <Heart className="w-6 h-6" />
            </Button>
          </div>
        )}

        {/* Progress Indicator */}
        {strategies.length > 0 && (
          <div className="mt-8 text-center relative z-30">
            <div className="flex justify-center gap-1 mb-2">
              {strategies.slice(0, Math.min(strategies.length, 10)).map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index <= currentIndex ? 'bg-gradient-to-r from-teal-500 to-cyan-500' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
            <p className="text-sm text-gray-500">
              {Math.min(currentIndex + 1, strategies.length)} von {strategies.length}
            </p>
          </div>
        )}
      </div>
    </div>
  )
} 