"use client"

import React, { useState, useEffect } from 'react'
import { MobileStyleSwipeCard } from '@/components/mobile-style-swipe-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { 
  ArrowLeft, 
  Bookmark, 
  RefreshCw, 
  Heart, 
  X, 
  TrendingUp,
  Sparkles
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface TrendData {
  id: string
  thumbnail_url: string
  profile_picture_url?: string
  reel_url: string
  script: string
  title?: string
  description?: string
}

interface FixedMobileTrendExplorerProps {
  onBack: () => void
}

export function FixedMobileTrendExplorer({ onBack }: FixedMobileTrendExplorerProps) {
  const [trends, setTrends] = useState<TrendData[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [savedTrends, setSavedTrends] = useState<TrendData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [dataSource, setDataSource] = useState<'database' | 'mock'>('mock')

  // Mock data as fallback
  const mockTrends: TrendData[] = [
    {
      id: 'mock-1',
      thumbnail_url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&h=800&fit=crop',
      profile_picture_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
      reel_url: 'https://instagram.com/reel/example1',
      title: 'Modern Home Tour',
      description: 'This $2M home has a SECRET room that will blow your mind!',
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
      id: 'mock-2',
      thumbnail_url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&h=800&fit=crop',
      profile_picture_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
      reel_url: 'https://instagram.com/reel/example2',
      title: 'First-Time Buyer Tips',
      description: 'Avoid these 5 costly mistakes when buying your first home',
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
    }
  ]

  useEffect(() => {
    console.log('FixedMobileTrendExplorer: Component mounted')
    loadTrends()
  }, [])

  const loadTrends = async () => {
    setIsLoading(true)
    console.log('Loading Instagram posts from database...')
    
    try {
      // Query real Instagram posts from the posts table
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
      
      if (error) {
        console.error('Database query error:', error)
        throw error
      }
      
      console.log(`Found ${data?.length || 0} Instagram posts in database`)
      
      if (data && data.length > 0) {
        console.log('Available columns in first record:', Object.keys(data[0]))
        console.log('First record data:', data[0])
        
        const transformedTrends = data.map(item => {
          const firstMediaUrl = item.media_urls?.[0] || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&h=800&fit=crop'
          const instagramUrl = item.metadata?.post_url || `https://instagram.com/p/${item.metadata?.instagram_id || 'example'}`
          
          const transformed = {
            id: item.id,
            thumbnail_url: firstMediaUrl,
            profile_picture_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
            reel_url: instagramUrl,
            script: item.content || 'No script available for this trend.',
            title: item.content?.substring(0, 60) + '...' || 'Instagram Post',
            description: item.content || 'Instagram post content'
          }
          console.log('Transformed Instagram post:', transformed)
          return transformed
        })
        
        setTrends(transformedTrends)
        setDataSource('database')
        console.log(`Successfully loaded ${transformedTrends.length} Instagram posts from database`)
        toast.success(`Loaded ${transformedTrends.length} Instagram posts from database`)
      } else {
        console.log('No data found in database, using mock data')
        setTrends(mockTrends)
        setDataSource('mock')
        toast.info('Using sample data - no trends found in database')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const refreshTrends = async () => {
    setIsRefreshing(true)
    console.log('Refreshing Instagram posts...')
    
    try {
      // Get fresh Instagram posts with more variety
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
        .limit(30) // Get more for variety
      
      if (error) throw error
      
      if (data && data.length > 0) {
        const transformedTrends = data.map(item => {
          const firstMediaUrl = item.media_urls?.[0] || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&h=800&fit=crop'
          const instagramUrl = item.metadata?.post_url || `https://instagram.com/p/${item.metadata?.instagram_id || 'example'}`
          
          return {
            id: item.id,
            thumbnail_url: firstMediaUrl,
            profile_picture_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
            reel_url: instagramUrl,
            script: item.content || 'No script available for this trend.',
            title: item.content?.substring(0, 60) + '...' || 'Instagram Post',
            description: item.content || 'Instagram post content'
          }
        })
        
        const shuffledTrends = transformedTrends.sort(() => Math.random() - 0.5).slice(0, 20)
        setTrends(shuffledTrends)
        setCurrentIndex(0)
        setDataSource('database')
        toast.success(`Refreshed with ${shuffledTrends.length} Instagram posts from database`)
        console.log(`Refreshed with ${shuffledTrends.length} Instagram posts`)
      } else {
        // Create additional mock trends for variety
        const additionalMockTrends = [
          {
            id: `mock-${Math.random().toString(36).substring(2, 9)}`,
            thumbnail_url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&h=800&fit=crop',
            profile_picture_url: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face',
            reel_url: 'https://instagram.com/reel/example3',
            title: 'Market Update 2024',
            description: 'The housing market just shifted - here\'s what it means for you',
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
            id: `mock-${Math.random().toString(36).substring(2, 9)}`,
            thumbnail_url: 'https://images.unsplash.com/photo-1600573472550-8090b5e0745e?w=600&h=800&fit=crop',
            profile_picture_url: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=100&h=100&fit=crop&crop=face',
            reel_url: 'https://instagram.com/reel/example4',
            title: 'Home Staging Secrets',
            description: 'These 3 staging tricks will sell your home 30% faster',
            script: `🏠 HOOK (0-3s): "These 3 staging tricks will sell your home 30% faster"

🛋️ MAIN CONTENT (3-20s):
1. Declutter & depersonalize - show before/after
2. Strategic lighting - demonstrate difference
3. Neutral color palette with pops of color

💡 VISUAL TIPS:
• Show real examples with side-by-side comparisons
• Use quick transitions between tips
• Include statistics as text overlays
• End with a stunning "after" reveal

🎯 CTA: "Want more staging tips? DM me for a free consultation!"

#homestaging #realestatetips #sellmyhome #interiordesign #homeselling`
          }
        ]
        
        // Combine original mock trends with additional ones and shuffle
        const allMockTrends = [...mockTrends, ...additionalMockTrends]
        const shuffledMockTrends = allMockTrends.sort(() => Math.random() - 0.5)
        
        setTrends(shuffledMockTrends)
        setCurrentIndex(0)
        setDataSource('mock')
        toast.info('Refreshed with sample data')
        console.log('Refreshed with mock data')
      }
      
    } catch (error) {
      console.error('Error refreshing:', error)
      const shuffledMockTrends = [...mockTrends].sort(() => Math.random() - 0.5)
      setTrends(shuffledMockTrends)
      setCurrentIndex(0)
      setDataSource('mock')
      toast.error('Refresh failed, using sample data')
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleSwipeLeft = (id: string) => {
    if (isAnimating) return
    setIsAnimating(true)
    console.log('Swiped left on:', id)
    
    // For now, just skip to next trend
    // TODO: Add skip functionality when database columns are available
    
    setTimeout(() => {
      setCurrentIndex(prev => prev + 1)
      setIsAnimating(false)
    }, 100)
  }

  const handleSwipeRight = (id: string) => {
    if (isAnimating) return
    
    const trend = trends.find(t => t.id === id)
    if (trend && !savedTrends.find(s => s.id === id)) {
      setSavedTrends(prev => [...prev, trend])
      toast.success('Trend saved!')
      console.log('Saved trend:', id)
    }
    
    setIsAnimating(true)
    console.log('Swiped right on:', id)
    
    setTimeout(() => {
      setCurrentIndex(prev => prev + 1)
      setIsAnimating(false)
    }, 100)
  }

  const handleFlip = (id: string) => {
    console.log('Flipped card:', id)
  }

  const removeSavedTrend = (id: string) => {
    setSavedTrends(prev => prev.filter(t => t.id !== id))
    toast.success('Trend removed from saved')
  }

  const currentTrend = trends[currentIndex]
  const hasMoreTrends = currentIndex < trends.length
  
  // Debug logging
  console.log('Current state:', {
    trendsLength: trends.length,
    currentIndex,
    currentTrend,
    hasMoreTrends,
    dataSource
  })

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
                  <div className="aspect-[4/5] relative">
                    <img
                      src={trend.thumbnail_url}
                      alt="Saved trend"
                      className="w-full h-full object-cover"
                    />
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
              <Badge variant={dataSource === 'database' ? 'default' : 'secondary'} className="text-xs">
                {dataSource === 'database' ? 'Live Data' : 'Sample Data'}
              </Badge>
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
      <div className="max-w-lg mx-auto px-6 py-8">
        {!hasMoreTrends || !currentTrend ? (
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
          // Single Card
          <div className="relative">
            <div 
              key={currentTrend.id}
              className="animate-in slide-in-from-right-4 fade-in duration-200"
            >
              <MobileStyleSwipeCard
                id={currentTrend.id}
                thumbnailUrl={currentTrend.thumbnail_url}
                profilePictureUrl={currentTrend.profile_picture_url}
                reelUrl={currentTrend.reel_url}
                script={currentTrend.script}
                title={currentTrend.title}
                description={currentTrend.description}
                onSwipeLeft={handleSwipeLeft}
                onSwipeRight={handleSwipeRight}
                onFlip={handleFlip}
              />
            </div>
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
              disabled={isAnimating}
            >
              <X className="w-6 h-6" />
            </Button>
            
            <Button
              size="lg"
              className="rounded-full w-16 h-16 bg-green-600 hover:bg-green-700 text-white"
              onClick={() => handleSwipeRight(currentTrend.id)}
              disabled={isAnimating}
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
    </div>
  )
}