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

interface ContentIdeasStrategiesProps {
  setCurrentStep: (step: ContentStep) => void
}

export function ContentIdeasStrategies({ setCurrentStep }: ContentIdeasStrategiesProps) {
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

  const handleSwipeRight = () => {
    if (swipeDirection) return // Prevent multiple swipes
    const strategy = strategies[currentIndex]
    if (strategy && !savedStrategies.find(s => s.id === strategy.id)) {
      setSavedStrategies(prev => [...prev, strategy])
      toast.success('Strategie gespeichert!')
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
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
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
      {/* Header */}
      <div className="border-b border-gray-100 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={() => setCurrentStep("overview")}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Zurück
            </Button>
            
            <div className="flex items-center gap-3">
              <Target className="w-5 h-5 text-teal-600" />
              <h1 className="text-xl font-semibold text-gray-900">Content-Strategien</h1>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Optimized Saved Button - Small, Modern, Just "Saved" */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSaved(true)}
                className="h-8 px-3 bg-white border-gray-200 hover:bg-gray-50 rounded-lg"
              >
                <Bookmark className="w-3.5 h-3.5 mr-1.5" />
                <span className="text-sm font-medium">Saved</span>
                {savedStrategies.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs bg-gray-100 text-gray-700">
                    {savedStrategies.length}
                  </Badge>
                )}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={resetStrategies}
                className="h-8 px-3 bg-white border-gray-200 hover:bg-gray-50 rounded-lg"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                <span className="text-sm font-medium">Reset</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Swipe Interface */}
      <div className="max-w-md mx-auto px-6 py-8">
        {!hasMoreStrategies && currentIndex >= strategies.length ? (
          // No more strategies
          <div className="text-center py-12">
            <Sparkles className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Alle Strategien durchgesehen!</h3>
            <p className="text-gray-600 mb-6">Du hast alle verfügbaren Content-Strategien gesehen</p>
            <Button 
              onClick={resetStrategies} 
              className="bg-teal-600 hover:bg-teal-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Von vorne beginnen
            </Button>
          </div>
        ) : (
          // Card Stack with Improved Animation
          <div className="relative h-[600px] overflow-hidden">
            {strategies.slice(currentIndex, currentIndex + 3).map((strategy, index) => (
              <div
                key={`${strategy.id}-${currentIndex}`} // Add currentIndex to force re-render
                className="absolute inset-0"
                style={{
                  zIndex: 3 - index,
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

        {/* Action Buttons */}
        {hasMoreStrategies && currentIndex < strategies.length && (
          <div className="flex justify-center gap-6 mt-8">
            <Button
              size="lg"
              variant="outline"
              className="rounded-full w-16 h-16 border-red-200 text-red-600 hover:bg-red-50"
              onClick={handleSwipeLeft}
              disabled={!!swipeDirection}
            >
              <X className="w-6 h-6" />
            </Button>
            
            <Button
              size="lg"
              className="rounded-full w-16 h-16 bg-teal-600 hover:bg-teal-700 text-white"
              onClick={handleSwipeRight}
              disabled={!!swipeDirection}
            >
              <Heart className="w-6 h-6" />
            </Button>
          </div>
        )}

        {/* Progress Indicator */}
        {strategies.length > 0 && (
          <div className="mt-8 text-center">
            <div className="flex justify-center gap-1 mb-2">
              {strategies.slice(0, Math.min(strategies.length, 10)).map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index <= currentIndex ? 'bg-teal-600' : 'bg-gray-300'
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

      {/* Instructions */}
      <div className="max-w-md mx-auto px-6 pb-8">
        <Card className="bg-white/50 border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                  <X className="w-3 h-3 text-red-600" />
                </div>
                <span>Links wischen zum Überspringen</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center">
                  <Heart className="w-3 h-3 text-teal-600" />
                </div>
                <span>Rechts wischen zum Speichern</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
              <RotateCcw className="w-4 h-4" />
              <span>Auf Karte tippen für Details</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 