"use client"

import React, { useState, useEffect } from 'react'
import { FullscreenSwipeCard } from '@/components/fullscreen-swipe-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  Bookmark, 
  RefreshCw, 
  TrendingUp,
  Sparkles,
  Heart,
  X
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface TrendData {
  id: string
  thumbnail_url: string
  profile_picture_url?: string
  reel_url: string
  script: string
}

interface FullscreenTrendExplorerProps {
  onBack: () => void
}

export function FullscreenTrendExplorer({ onBack }: FullscreenTrendExplorerProps) {
  const [trends, setTrends] = useState<TrendData[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [savedTrends, setSavedTrends] = useState<TrendData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const [showControls, setShowControls] = useState(true)

  // Mock data for demonstration
  const mockTrends: TrendData[] = [
    {
      id: '1',
      thumbnail_url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=1200&fit=crop',
      profile_picture_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
      reel_url: 'https://instagram.com/reel/example1',
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

#realestate #luxuryhomes #hometour #dreamhome #property`
    },
    {
      id: '2',
      thumbnail_url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=1200&fit=crop',
      profile_picture_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
      reel_url: 'https://instagram.com/reel/example2',
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

#firsttimehomebuyer #realestatetips #homebuying #mortgage #property`
    },
    {
      id: '3',
      thumbnail_url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=1200&fit=crop',
      profile_picture_url: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face',
      reel_url: 'https://instagram.com/reel/example3',
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

#marketupdate #realestate #interestrates #homebuying #investment`
    },
    {
      id: '4',
      thumbnail_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=1200&fit=crop',
      profile_picture_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face',
      reel_url: 'https://instagram.com/reel/example4',
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

#homestaging #realestate #sellfast #homedesign #property`
    }
  ]

  useEffect(() => {
    loadTrends()
    
    // Auto-hide controls after 3 seconds
    const timer = setTimeout(() => {
      setShowControls(false)
    }, 3000)
    
    return () => clearTimeout(timer)
  }, [])

  // Show controls on mouse move or touch
  useEffect(() => {
    const handleInteraction = () => {
      setShowControls(true)
      // Hide again after 3 seconds of inactivity
      setTimeout(() => setShowControls(false), 3000)
    }

    document.addEventListener('mousemove', handleInteraction)
    document.addEventListener('touchstart', handleInteraction)
    
    return () => {
      document.removeEventListener('mousemove', handleInteraction)
      document.removeEventListener('touchstart', handleInteraction)
    }
  }, [])

  const loadTrends = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('instagramreelsscraper')
        .select(`
          id,
          thumbnail_url,
          profile_picture_url,
          reel_url,
          script
        `)
        .order('scraped_at', { ascending: false })
        .limit(20)
      
      if (error) throw error
      
      // Transform data to match our interface
      const transformedTrends = data?.map(item => ({
        id: item.id,
        thumbnail_url: item.thumbnail_url || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=1200&fit=crop',
        profile_picture_url: item.profile_picture_url,
        reel_url: item.reel_url,
        script: item.script || 'No script available for this trend.'
      })) || []
      
      setTrends(transformedTrends.length > 0 ? transformedTrends : mockTrends)
    } catch (error) {
      console.error('Error loading trends:', error)
      toast.error('Failed to load trends from database, using sample data')
      setTrends(mockTrends)
    } finally {
      setIsLoading(false)
    }
  }

  const refreshTrends = async () => {
    setIsRefreshing(true)
    try {
      const { data, error } = await supabase
        .from('instagramreelsscraper')
        .select(`
          id,
          thumbnail_url,
          profile_picture_url,
          reel_url,
          script
        `)
        .order('scraped_at', { ascending: false })
        .limit(20)
      
      if (error) throw error
      
      const transformedTrends = data?.map(item => ({
        id: item.id,
        thumbnail_url: item.thumbnail_url || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=1200&fit=crop',
        profile_picture_url: item.profile_picture_url,
        reel_url: item.reel_url,
        script: item.script || 'No script available for this trend.'
      })) || []
      
      const shuffledTrends = transformedTrends.sort(() => Math.random() - 0.5)
      setTrends(shuffledTrends.length > 0 ? shuffledTrends : mockTrends)
      setCurrentIndex(0)
      
      toast.success('Fresh trends loaded!')
    } catch (error) {
      console.error('Error refreshing trends:', error)
      toast.error('Failed to refresh trends')
      const shuffledMockTrends = [...mockTrends].sort(() => Math.random() - 0.5)
      setTrends(shuffledMockTrends)
      setCurrentIndex(0)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleSwipeLeft = (id: string) => {
    setCurrentIndex(prev => prev + 1)
  }

  const handleSwipeRight = (id: string) => {
    const trend = trends.find(t => t.id === id)
    if (trend && !savedTrends.find(s => s.id === id)) {
      setSavedTrends(prev => [...prev, trend])
      toast.success('Trend saved!')
    }
    setCurrentIndex(prev => prev + 1)
  }

  const handleFlip = (id: string) => {
    console.log('Card flipped:', id)
  }

  const currentTrend = trends[currentIndex]
  const hasMoreTrends = currentIndex < trends.length

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading trending reels...</p>
        </div>
      </div>
    )
  }

  if (showSaved) {
    return (
      <div className="fixed inset-0 bg-gray-50 overflow-y-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <Button 
                variant="ghost" 
                onClick={() => setShowSaved(false)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Swipe
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">
                Saved Trends ({savedTrends.length})
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
              <p className="text-gray-600">No saved trends yet</p>
              <p className="text-sm text-gray-500 mt-2">Swipe right on trends you like to save them</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedTrends.map((trend) => (
                <div key={trend.id} className="bg-white rounded-lg overflow-hidden shadow-lg">
                  <div className="aspect-[4/5] relative">
                    <img
                      src={trend.thumbnail_url}
                      alt="Saved trend"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black">
      {/* Header Controls - Auto-hide */}
      <div 
        className={`
          fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/50 to-transparent p-6
          transition-opacity duration-300
          ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
      >
        <div className="flex items-center justify-between text-white">
          <Button 
            variant="ghost" 
            onClick={onBack}
            className="flex items-center gap-2 text-white hover:text-gray-300 hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-orange-400" />
            <h1 className="text-xl font-semibold">Trend Entdecken</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSaved(true)}
              className="flex items-center gap-2 text-white hover:text-gray-300 hover:bg-white/10"
            >
              <Bookmark className="w-4 h-4" />
              {savedTrends.length > 0 && (
                <Badge variant="secondary" className="bg-white/20 text-white border-0">
                  {savedTrends.length}
                </Badge>
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshTrends}
              disabled={isRefreshing}
              className="flex items-center gap-2 text-white hover:text-gray-300 hover:bg-white/10"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {!hasMoreTrends || !currentTrend ? (
        // No more trends
        <div className="flex items-center justify-center h-full text-center text-white">
          <div>
            <Sparkles className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">All caught up!</h3>
            <p className="text-gray-400 mb-6">You've seen all the latest trends</p>
            <Button 
              onClick={refreshTrends} 
              className="bg-orange-600 hover:bg-orange-700"
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Load More Trends
            </Button>
          </div>
        </div>
      ) : (
        // Current Card
        <FullscreenSwipeCard
          key={currentTrend.id}
          id={currentTrend.id}
          thumbnailUrl={currentTrend.thumbnail_url}
          profilePictureUrl={currentTrend.profile_picture_url}
          reelUrl={currentTrend.reel_url}
          script={currentTrend.script}
          onSwipeLeft={handleSwipeLeft}
          onSwipeRight={handleSwipeRight}
          onFlip={handleFlip}
        />
      )}

      {/* Bottom Controls - Auto-hide */}
      <div 
        className={`
          fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black/50 to-transparent p-6
          transition-opacity duration-300
          ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
      >
        <div className="flex items-center justify-center gap-8">
          {/* Skip Button */}
          <Button
            size="lg"
            variant="outline"
            className="rounded-full w-16 h-16 border-red-400 text-red-400 hover:bg-red-400 hover:text-white bg-black/20 backdrop-blur-sm"
            onClick={() => currentTrend && handleSwipeLeft(currentTrend.id)}
          >
            <X className="w-6 h-6" />
          </Button>
          
          {/* Progress Indicator */}
          <div className="text-center text-white">
            <div className="flex justify-center gap-1 mb-2">
              {trends.slice(0, Math.min(trends.length, 10)).map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index <= currentIndex ? 'bg-orange-400' : 'bg-white/30'
                  }`}
                />
              ))}
            </div>
            <p className="text-sm text-white/70">
              {Math.min(currentIndex + 1, trends.length)} of {trends.length}
            </p>
          </div>
          
          {/* Save Button */}
          <Button
            size="lg"
            className="rounded-full w-16 h-16 bg-green-500 hover:bg-green-600 text-white"
            onClick={() => currentTrend && handleSwipeRight(currentTrend.id)}
          >
            <Heart className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </div>
  )
}