"use client"

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowLeft, 
  Bookmark, 
  RefreshCw, 
  Heart, 
  X, 
  TrendingUp,
  Sparkles,
  RotateCcw
} from "lucide-react"
import { MinimalSwipeCard } from "@/components/minimal-swipe-card"
import { supabase } from "@/lib/supabase"
import { toast } from 'sonner'
import type { ContentStep } from "../hooks/useContentIdeas"

interface TrendData {
  id: string
  thumbnail_url: string
  caption?: string
  reel_url: string
  script: string
  title?: string
  creator?: string
  description?: string
  engagement_count?: number
}

interface ContentIdeasInspirationProps {
  setCurrentStep: (step: ContentStep) => void
}

export function ContentIdeasInspiration({ setCurrentStep }: ContentIdeasInspirationProps) {
  const [trends, setTrends] = useState<TrendData[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [savedTrends, setSavedTrends] = useState<TrendData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null)

  // Mock data for demonstration - replace with actual Supabase query
  const mockTrends: TrendData[] = [
    {
      id: '1',
      thumbnail_url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=600&fit=crop',
      caption: 'Modern Home Tour',
      reel_url: 'https://instagram.com/reel/example1',
      title: 'Modern Home Tour',
      creator: '@realestate_pro',
      script: `🏠 HOOK (0-3s): "This $2M home has a SECRET room..."

📱 MAIN CONTENT (3-15s):
• Quick walkthrough of main living areas
• Highlight unique architectural features
• Show the "secret" home office behind bookshelf
• Mention key selling points (location, size, amenities)

💡 VISUAL TIPS:
• Use smooth camera movements
• Good lighting - shoot during golden hour
• Quick cuts between rooms (2-3 seconds each)
• End with exterior shot

🎯 CTA: "DM me for private showing!"

#realestate #luxuryhomes #hometour #dreamhome #property`,
      engagement_count: 2500000
    },
    {
      id: '2',
      thumbnail_url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&h=600&fit=crop',
      caption: 'First-Time Buyer Tips',
      reel_url: 'https://instagram.com/reel/example2',
      title: 'First-Time Buyer Tips',
      creator: '@home_advisor',
      script: `💰 HOOK (0-3s): "Buying your first home? Avoid these 5 mistakes!"

📋 MAIN CONTENT (3-20s):
1. Not getting pre-approved first
2. Skipping the home inspection
3. Forgetting about closing costs
4. Falling in love with the first house
5. Not researching the neighborhood

💡 VISUAL TIPS:
• Use text overlays for each point
• Show examples with B-roll footage
• Keep energy high with upbeat music
• Use hand gestures to emphasize points

🎯 CTA: "Save this post & share with someone buying their first home!"

#firsttimehomebuyer #realestatetips #homebuying #mortgage #property`,
      engagement_count: 1800000
    },
    {
      id: '3',
      thumbnail_url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400&h=600&fit=crop',
      caption: 'Market Update 2024',
      reel_url: 'https://instagram.com/reel/example3',
      title: 'Market Update 2024',
      creator: '@market_insights',
      script: `📊 HOOK (0-3s): "The housing market just shifted - here's what it means for you"

📈 MAIN CONTENT (3-18s):
• Interest rates dropped 0.5% this month
• Inventory increased 15% in major cities
• Best time to buy in 2 years
• Sellers are more negotiable now
• Show local market statistics

💡 VISUAL TIPS:
• Use charts and graphs as overlays
• Split screen with before/after data
• Professional background (office/city view)
• Confident, authoritative delivery

🎯 CTA: "Ready to make your move? Link in bio!"

#marketupdate #realestate #interestrates #homebuying #investment`,
      engagement_count: 3200000
    },
    {
      id: '4',
      thumbnail_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=600&fit=crop',
      caption: 'Staging Secrets',
      reel_url: 'https://instagram.com/reel/example4',
      title: 'Staging Secrets',
      creator: '@staging_expert',
      script: `✨ HOOK (0-3s): "This simple staging trick sold this house in 3 days!"

🏡 MAIN CONTENT (3-16s):
• Before: cluttered, personal items everywhere
• After: clean, neutral, spacious feeling
• Key changes: declutter, depersonalize, add plants
• Show the transformation room by room
• Mention the quick sale result

💡 VISUAL TIPS:
• Split screen before/after shots
• Time-lapse of staging process
• Bright, natural lighting
• Smooth transitions between rooms

🎯 CTA: "Need staging help? DM me!"

#homestaging #realestate #sellfast #homedesign #property`,
      engagement_count: 1500000
    }
  ]

  useEffect(() => {
    loadTrends()
  }, [])

  const loadTrends = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('instagramreelsscraper')
        .select(`
          id,
          thumbnail_url,
          profile_picture,
          reel_url,
          script,
          title,
          creator_display_name,
          description,
          engagement_count
        `)
        .order('scraped_at', { ascending: false })
        .limit(20)
      
      if (error) throw error
      
      // Transform data to match our interface
      const transformedTrends = data?.map(item => ({
        id: item.id,
        thumbnail_url: item.thumbnail_url || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=600&fit=crop',
        reel_url: item.reel_url,
        script: item.script || 'No script available for this trend.',
        title: item.title,
        creator: item.creator_display_name,
        caption: item.title,
        description: item.description,
        engagement_count: item.engagement_count || 0
      })) || []
      
      setTrends(transformedTrends.length > 0 ? transformedTrends : mockTrends)
    } catch (error) {
      console.error('Error loading trends:', error)
      toast.error('Failed to load trends from database, using sample data')
      setTrends(mockTrends) // Fallback to mock data
    } finally {
      setIsLoading(false)
    }
  }

  const refreshTrends = async () => {
    setIsRefreshing(true)
    try {
      // Fetch fresh trends from Supabase
      const { data, error } = await supabase
        .from('instagramreelsscraper')
        .select(`
          id,
          thumbnail_url,
          profile_picture,
          reel_url,
          script,
          title,
          creator_display_name,
          description,
          engagement_count
        `)
        .order('scraped_at', { ascending: false })
        .limit(20)
      
      if (error) throw error
      
      // Transform and shuffle the data
      const transformedTrends = data?.map(item => ({
        id: item.id,
        thumbnail_url: item.thumbnail_url || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=600&fit=crop',
        reel_url: item.reel_url,
        script: item.script || 'No script available for this trend.',
        title: item.title,
        creator: item.creator_display_name,
        caption: item.title,
        description: item.description,
        engagement_count: item.engagement_count || 0
      })) || []
      
      // Shuffle the trends for variety
      const shuffledTrends = transformedTrends.sort(() => Math.random() - 0.5)
      setTrends(shuffledTrends.length > 0 ? shuffledTrends : mockTrends)
      setCurrentIndex(0)
      
      toast.success('Fresh trends loaded!')
    } catch (error) {
      console.error('Error refreshing trends:', error)
      toast.error('Failed to refresh trends')
      // Fallback to shuffled mock data
      const shuffledMockTrends = [...mockTrends].sort(() => Math.random() - 0.5)
      setTrends(shuffledMockTrends)
      setCurrentIndex(0)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleSwipeLeft = (id: string) => {
    setSwipeDirection('left')
    setTimeout(() => {
      setCurrentIndex(prev => prev + 1)
      setSwipeDirection(null)
    }, 300)
  }

  const handleSwipeRight = (id: string) => {
    const trend = trends.find(t => t.id === id)
    if (trend && !savedTrends.find(s => s.id === id)) {
      setSavedTrends(prev => [...prev, trend])
      toast.success('Inspiration gespeichert!')
    }
    
    setSwipeDirection('right')
    setTimeout(() => {
      setCurrentIndex(prev => prev + 1)
      setSwipeDirection(null)
    }, 300)
  }

  const handleFlip = (id: string) => {
    // Optional: Track flip analytics
    console.log('Card flipped:', id)
  }

  const removeSavedTrend = (id: string) => {
    setSavedTrends(prev => prev.filter(t => t.id !== id))
    toast.success('Inspiration entfernt')
  }

  const currentTrend = trends[currentIndex]
  const hasMoreTrends = currentIndex < trends.length - 1

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading content inspiration...</p>
        </div>
      </div>
    )
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
                Zurück zu Inspiration
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">
                Gespeicherte Inspiration ({savedTrends.length})
              </h1>
              <div className="w-20"></div>
            </div>
          </div>
        </div>

        {/* Saved Trends Grid */}
        <div className="max-w-4xl mx-auto px-6 py-8">
          {savedTrends.length === 0 ? (
            <div className="text-center py-12">
              <Bookmark className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Noch keine Inspiration gespeichert</p>
              <p className="text-sm text-gray-500 mt-2">Swipe nach rechts um Inspiration zu speichern</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedTrends.map((trend) => (
                <Card key={trend.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="aspect-[9/16] relative">
                    <img
                      src={trend.thumbnail_url}
                      alt={trend.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      <p className="font-semibold text-sm mb-1">{trend.title}</p>
                      <p className="text-xs text-white/80">{trend.creator}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="absolute top-2 right-2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-1"
                      onClick={() => removeSavedTrend(trend.id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </Card>
              ))}
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
              <TrendingUp className="w-5 h-5 text-orange-600" />
              <h1 className="text-xl font-semibold text-gray-900">Content Inspiration</h1>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSaved(true)}
                className="flex items-center gap-2"
              >
                <Bookmark className="w-4 h-4" />
                <span className="hidden sm:inline">Gespeichert</span>
                {savedTrends.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {savedTrends.length}
                  </Badge>
                )}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={refreshTrends}
                disabled={isRefreshing}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Swipe Interface */}
      <div className="max-w-md mx-auto px-6 py-8">
        {!hasMoreTrends && currentIndex >= trends.length ? (
          // No more trends
          <div className="text-center py-12">
            <Sparkles className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Alle Inspiration durchgesehen!</h3>
            <p className="text-gray-600 mb-6">Du hast alle verfügbaren Content-Inspiration gesehen</p>
            <Button onClick={refreshTrends} className="bg-orange-600 hover:bg-orange-700">
              <RefreshCw className="w-4 h-4 mr-2" />
              Mehr Inspiration laden
            </Button>
          </div>
        ) : (
          // Single Card
          <div className="relative">
            {currentTrend && (
              <MinimalSwipeCard
                key={currentTrend.id}
                id={currentTrend.id}
                image={currentTrend.thumbnail_url}
                caption={currentTrend.caption}
                reelUrl={currentTrend.reel_url}
                script={currentTrend.script}
                onSwipeLeft={handleSwipeLeft}
                onSwipeRight={handleSwipeRight}
                onFlip={handleFlip}
              />
            )}
          </div>
        )}

        {/* Action Buttons */}
        {hasMoreTrends && currentTrend && (
          <div className="flex justify-center gap-6 mt-8">
            <Button
              size="lg"
              variant="outline"
              className="rounded-full w-16 h-16 border-red-200 text-red-600 hover:bg-red-50"
              onClick={() => handleSwipeLeft(currentTrend.id)}
            >
              <X className="w-6 h-6" />
            </Button>
            
            <Button
              size="lg"
              className="rounded-full w-16 h-16 bg-orange-600 hover:bg-orange-700 text-white"
              onClick={() => handleSwipeRight(currentTrend.id)}
            >
              <Heart className="w-6 h-6" />
            </Button>
          </div>
        )}

        {/* Progress Indicator */}
        {trends.length > 0 && (
          <div className="mt-8 text-center">
            <div className="flex justify-center gap-1 mb-2">
              {trends.slice(0, Math.min(trends.length, 10)).map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index <= currentIndex ? 'bg-orange-600' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
            <p className="text-sm text-gray-500">
              {Math.min(currentIndex + 1, trends.length)} von {trends.length}
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
                <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center">
                  <Heart className="w-3 h-3 text-orange-600" />
                </div>
                <span>Rechts wischen zum Speichern</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
              <RotateCcw className="w-4 h-4" />
              <span>Auf Bild tippen für Script</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 