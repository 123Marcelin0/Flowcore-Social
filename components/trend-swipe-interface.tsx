"use client"

import React, { useState, useEffect } from 'react'
import { SwipeCard } from '@/components/ui/swipe-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  Bookmark, 
  RefreshCw, 
  Heart, 
  X, 
  TrendingUp,
  Sparkles,
  RotateCcw
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import '@/styles/swipe-cards.css'

interface TrendData {
  id: string
  thumbnail_url: string
  profile_picture: string
  reel_url: string
  script: string
  title?: string
  creator?: string
  description?: string
  engagement_count?: number
}

interface TrendSwipeInterfaceProps {
  onBack: () => void
}

export function TrendSwipeInterface({ onBack }: TrendSwipeInterfaceProps) {
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
      profile_picture: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
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
      profile_picture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
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
      profile_picture: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face',
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
      profile_picture: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face',
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
      // Use real Instagram posts from the posts table
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          media_urls,
          media_type,
          platforms,
          likes,
          comments,
          impressions,
          shares,
          metadata,
          created_at
        `)
        .eq('status', 'published')
        .contains('platforms', ['instagram'])
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (error) throw error
      
      // Transform Instagram posts to match our interface
      const transformedTrends = data?.map(item => {
        const firstMediaUrl = item.media_urls?.[0] || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=600&fit=crop'
        const instagramUrl = item.metadata?.post_url || `https://instagram.com/p/${item.metadata?.instagram_id || 'example'}`
        
        return {
          id: item.id,
          thumbnail_url: firstMediaUrl,
          profile_picture: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face', // Default profile picture
          reel_url: instagramUrl,
          script: item.content || 'No script available for this trend.',
          title: item.content?.substring(0, 60) + '...' || 'Instagram Post',
          creator: item.metadata?.username || '@vonpollemsland',
          description: item.content || 'Instagram post content',
          engagement_count: (item.likes || 0) + (item.comments || 0) + (item.shares || 0)
        }
      }) || []
      
      console.log(`Loaded ${transformedTrends.length} Instagram posts for trend swipe`)
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
      // Get fresh Instagram posts with randomization
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          media_urls,
          media_type,
          platforms,
          likes,
          comments,
          impressions,
          shares,
          metadata,
          created_at
        `)
        .eq('status', 'published')
        .contains('platforms', ['instagram'])
        .order('created_at', { ascending: false })
        .limit(30) // Get more for better variety
      
      if (error) throw error
      
      // Transform and shuffle the Instagram posts
      const transformedTrends = data?.map(item => {
        const firstMediaUrl = item.media_urls?.[0] || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=600&fit=crop'
        const instagramUrl = item.metadata?.post_url || `https://instagram.com/p/${item.metadata?.instagram_id || 'example'}`
        
        return {
          id: item.id,
          thumbnail_url: firstMediaUrl,
          profile_picture: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
          reel_url: instagramUrl,
          script: item.content || 'No script available for this trend.',
          title: item.content?.substring(0, 60) + '...' || 'Instagram Post',
          creator: item.metadata?.username || '@vonpollemsland',
          description: item.content || 'Instagram post content',
          engagement_count: (item.likes || 0) + (item.comments || 0) + (item.shares || 0)
        }
      }) || []
      
      // Shuffle the trends for variety and take 20
      const shuffledTrends = transformedTrends.sort(() => Math.random() - 0.5).slice(0, 20)
      setTrends(shuffledTrends.length > 0 ? shuffledTrends : mockTrends)
      setCurrentIndex(0)
      
      toast.success(`Fresh ${shuffledTrends.length} Instagram trends loaded!`)
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
      toast.success('Trend saved!')
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
    toast.success('Trend removed from saved')
  }

  const currentTrend = trends[currentIndex]
  const hasMoreTrends = currentIndex < trends.length - 1

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading trending reels...</p>
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
                <Card key={trend.id} className="overflow-hidden">
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
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-orange-600" />
              <h1 className="text-xl font-semibold text-gray-900">Trend Entdecken</h1>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSaved(true)}
                className="flex items-center gap-2"
              >
                <Bookmark className="w-4 h-4" />
                <span className="hidden sm:inline">Saved</span>
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
            <h3 className="text-xl font-semibold text-gray-900 mb-2">All caught up!</h3>
            <p className="text-gray-600 mb-6">You've seen all the latest trends</p>
            <Button onClick={refreshTrends} className="bg-orange-600 hover:bg-orange-700">
              <RefreshCw className="w-4 h-4 mr-2" />
              Load More Trends
            </Button>
          </div>
        ) : (
          // Card Stack
          <div className="card-stack relative">
            {trends.slice(currentIndex, currentIndex + 3).map((trend, index) => (
              <div
                key={trend.id}
                className={`swipe-card ${index === 0 ? (swipeDirection === 'left' ? 'swipe-left' : swipeDirection === 'right' ? 'swipe-right' : '') : ''}`}
                style={{
                  zIndex: 3 - index,
                  transform: index > 0 ? `scale(${1 - index * 0.05}) translateY(${index * 10}px)` : 'none',
                  opacity: index > 0 ? 1 - index * 0.2 : 1
                }}
              >
                <SwipeCard
                  id={trend.id}
                  image={trend.thumbnail_url}
                  profilePicture={trend.profile_picture}
                  reelUrl={trend.reel_url}
                  script={trend.script}
                  title={trend.title}
                  creator={trend.creator}
                  onSwipeLeft={handleSwipeLeft}
                  onSwipeRight={handleSwipeRight}
                  onFlip={handleFlip}
                />
              </div>
            ))}
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
              className="rounded-full w-16 h-16 bg-green-600 hover:bg-green-700 text-white"
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
              {Math.min(currentIndex + 1, trends.length)} of {trends.length}
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
                <span>Swipe left to skip</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                  <Heart className="w-3 h-3 text-green-600" />
                </div>
                <span>Swipe right to save</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
              <RotateCcw className="w-4 h-4" />
              <span>Tap image to flip and see script</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}