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
  ExternalLink,
  MessageCircle,
  Eye,
  Share2
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from 'sonner'
import type { ContentStep } from "../hooks/useContentIdeas"

interface TrendData {
  id: string
  thumbnail_url: string
  reel_url: string
  title?: string
  creator?: string
  likes_count?: number
  comments_count?: number
  views_count?: number
  shares_count?: number
  engagement_count?: number
  script?: string
  description?: string
}

interface TrendCardProps {
  trend: TrendData
  onSave: () => void
  isSaved: boolean
}

const TrendCard: React.FC<TrendCardProps> = ({ trend, onSave, isSaved }) => {
  const handleInstagramRedirect = () => {
    if (trend.reel_url) {
      window.open(trend.reel_url, '_blank', 'noopener,noreferrer')
    } else {
      toast.error('Instagram Link nicht verfügbar')
    }
  }

  const formatCount = (count?: number) => {
    if (!count) return '0'
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
    return count.toString()
  }

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 group border-0 bg-white rounded-2xl">
      <CardContent className="p-0">
        {/* Title */}
        <div className="p-4 pb-2">
          <h3 className="font-semibold text-gray-900 text-lg mb-1 line-clamp-2">
            {trend.title || 'Untitled Trend'}
          </h3>
          <p className="text-sm text-gray-500">{trend.creator || 'Unknown Creator'}</p>
        </div>

        {/* Insight Data */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            {trend.likes_count !== undefined && (
              <div className="flex items-center gap-1">
                <Heart className="w-4 h-4 text-red-500" />
                <span className="font-medium">{formatCount(trend.likes_count)}</span>
              </div>
            )}
            {trend.comments_count !== undefined && (
              <div className="flex items-center gap-1">
                <MessageCircle className="w-4 h-4 text-blue-500" />
                <span className="font-medium">{formatCount(trend.comments_count)}</span>
              </div>
            )}
            {trend.views_count !== undefined && (
              <div className="flex items-center gap-1">
                <Eye className="w-4 h-4 text-green-500" />
                <span className="font-medium">{formatCount(trend.views_count)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Preview Image */}
        <div className="aspect-[4/5] relative overflow-hidden mx-4 rounded-xl mb-4">
          <img
            src={trend.thumbnail_url || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=600&fit=crop'}
            alt={trend.title || 'Trend preview'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.src = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=600&fit=crop'
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Save Button Overlay */}
          <Button
            size="sm"
            variant={isSaved ? "default" : "secondary"}
            className={`absolute top-3 right-3 rounded-full w-8 h-8 p-0 ${
              isSaved 
                ? 'bg-gradient-to-r from-[#dc2626] via-[#ea580c] to-[#f97316] text-white' 
                : 'bg-white/90 backdrop-blur-sm text-gray-700 hover:bg-white'
            }`}
            onClick={(e) => {
              e.stopPropagation()
              onSave()
            }}
          >
            <Bookmark className="w-4 h-4" />
          </Button>
        </div>

        {/* Interactive Button */}
        <div className="p-4 pt-0">
          <Button
            onClick={handleInstagramRedirect}
            className="w-full bg-gradient-to-r from-[#dc2626] via-[#ea580c] to-[#f97316] hover:from-red-700 hover:via-orange-700 hover:to-yellow-700 text-white rounded-xl font-medium transition-all duration-200 group/btn"
          >
            <span>Instagram Reel ansehen</span>
            <ExternalLink className="w-4 h-4 ml-2 group-hover/btn:translate-x-0.5 transition-transform duration-200" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

interface ContentIdeasInspirationProps {
  setCurrentStep: (step: ContentStep) => void
}

export function ContentIdeasInspiration({ setCurrentStep }: ContentIdeasInspirationProps) {
  const [trends, setTrends] = useState<TrendData[]>([])
  const [savedTrends, setSavedTrends] = useState<TrendData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showSaved, setShowSaved] = useState(false)

  // Mock data for demonstration - fallback when database is not available
  const mockTrends: TrendData[] = [
    {
      id: '1',
      thumbnail_url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=600&fit=crop',
      reel_url: 'https://instagram.com/reel/example1',
      title: 'Modern Home Tour',
      creator: '@realestate_pro',
      likes_count: 125000,
      comments_count: 2500,
      views_count: 2500000,
      shares_count: 1200,
      engagement_count: 2500000,
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
      thumbnail_url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&h=600&fit=crop',
      reel_url: 'https://instagram.com/reel/example2',
      title: 'First-Time Buyer Tips',
      creator: '@home_advisor',
      likes_count: 90000,
      comments_count: 1800,
      views_count: 1800000,
      shares_count: 850,
      engagement_count: 1800000,
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
      thumbnail_url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400&h=600&fit=crop',
      reel_url: 'https://instagram.com/reel/example3',
      title: 'Market Update 2024',
      creator: '@market_insights',
      likes_count: 160000,
      comments_count: 3200,
      views_count: 3200000,
      shares_count: 1500,
      engagement_count: 3200000,
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
      thumbnail_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=600&fit=crop',
      reel_url: 'https://instagram.com/reel/example4',
      title: 'Staging Secrets',
      creator: '@staging_expert',
      likes_count: 75000,
      comments_count: 1500,
      views_count: 1500000,
      shares_count: 720,
      engagement_count: 1500000,
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
  }, [])

  const loadTrends = async () => {
    setIsLoading(true)
    try {
      // First check if Supabase is available
      if (!supabase) {
        console.warn('Supabase not available, using mock data')
        setTrends(mockTrends)
        return
      }

      const { data, error } = await supabase
        .from('instagramreelsscraper')
        .select(`
          id,
          thumbnail_url,
          reel_url,
          title,
          creator_display_name,
          likes_count,
          comments_count,
          views_count,
          shares_count,
          engagement_count,
          script,
          description
        `)
        .order('scraped_at', { ascending: false })
        .limit(12)
      
      if (error) {
        console.warn('Database query failed:', error.message)
        throw error
      }
      
      // Transform data to match our interface
      const transformedTrends = data?.map(item => ({
        id: item.id,
        thumbnail_url: item.thumbnail_url || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=600&fit=crop',
        reel_url: item.reel_url,
        title: item.title,
        creator: item.creator_display_name,
        likes_count: item.likes_count || 0,
        comments_count: item.comments_count || 0,
        views_count: item.views_count || 0,
        shares_count: item.shares_count || 0,
        engagement_count: item.engagement_count || 0,
        script: item.script,
        description: item.description
      })) || []
      
      // Use transformed data if available, otherwise fallback to mock data
      setTrends(transformedTrends.length > 0 ? transformedTrends : mockTrends)
      
    } catch (error) {
      console.error('Error loading trends:', error)
      // Always fallback to mock data on any error
      setTrends(mockTrends)
      // Don't show error toast if it's just a missing table
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMessage = (error as any).message
        if (!errorMessage.includes('relation') && !errorMessage.includes('does not exist')) {
          toast.error('Failed to load trends from database, using sample data')
        }
      }
    } finally {
      setIsLoading(false)
    }
  }

  const refreshTrends = async () => {
    setIsRefreshing(true)
    try {
      if (!supabase) {
        console.warn('Supabase not available, shuffling mock data')
        const shuffledMockTrends = [...mockTrends].sort(() => Math.random() - 0.5)
        setTrends(shuffledMockTrends)
        toast.success('Trends refreshed!')
        return
      }

      const { data, error } = await supabase
        .from('instagramreelsscraper')
        .select(`
          id,
          thumbnail_url,
          reel_url,
          title,
          creator_display_name,
          likes_count,
          comments_count,
          views_count,
          shares_count,
          engagement_count,
          script,
          description
        `)
        .order('scraped_at', { ascending: false })
        .limit(12)
      
      if (error) {
        console.warn('Database refresh failed:', error.message)
        throw error
      }
      
      // Transform and shuffle the data
      const transformedTrends = data?.map(item => ({
        id: item.id,
        thumbnail_url: item.thumbnail_url || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=600&fit=crop',
        reel_url: item.reel_url,
        title: item.title,
        creator: item.creator_display_name,
        likes_count: item.likes_count || 0,
        comments_count: item.comments_count || 0,
        views_count: item.views_count || 0,
        shares_count: item.shares_count || 0,
        engagement_count: item.engagement_count || 0,
        script: item.script,
        description: item.description
      })) || []
      
      // Shuffle the trends for variety
      const shuffledTrends = transformedTrends.sort(() => Math.random() - 0.5)
      setTrends(shuffledTrends.length > 0 ? shuffledTrends : mockTrends)
      
      toast.success('Fresh trends loaded!')
    } catch (error) {
      console.error('Error refreshing trends:', error)
      // Fallback to shuffled mock data
      const shuffledMockTrends = [...mockTrends].sort(() => Math.random() - 0.5)
      setTrends(shuffledMockTrends)
      toast.success('Trends refreshed!')
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleSaveTrend = (trend: TrendData) => {
    if (!savedTrends.find(s => s.id === trend.id)) {
      setSavedTrends(prev => [...prev, trend])
      toast.success('Trend gespeichert!')
    } else {
      setSavedTrends(prev => prev.filter(s => s.id !== trend.id))
      toast.success('Trend entfernt!')
    }
  }

  const removeSavedTrend = (id: string) => {
    setSavedTrends(prev => prev.filter(t => t.id !== id))
    toast.success('Trend entfernt')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading trending content...</p>
        </div>
      </div>
    )
  }

  if (showSaved) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="border-b border-gray-100 bg-white">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <Button 
                variant="ghost" 
                onClick={() => setShowSaved(false)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4" />
                Zurück zu Trends
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">
                Gespeicherte Trends ({savedTrends.length})
              </h1>
              <div className="w-20"></div>
            </div>
          </div>
        </div>

        {/* Saved Trends Grid */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          {savedTrends.length === 0 ? (
            <div className="text-center py-12">
              <Bookmark className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Noch keine Trends gespeichert</p>
              <p className="text-sm text-gray-500 mt-2">Klicke auf das Bookmark-Icon um Trends zu speichern</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {savedTrends.map((trend) => (
                <TrendCard
                  key={trend.id}
                  trend={trend}
                  onSave={() => removeSavedTrend(trend.id)}
                  isSaved={true}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - with Content Inspiration button in the center */}
      <div className="">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={() => setCurrentStep("overview")}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Zurück
            </Button>
            
            {/* Content Inspiration Title - perfectly centered relative to card area with white text */}
            <div className="relative inline-flex items-center gap-3 px-8 py-3 rounded-full bg-gradient-to-r from-[#dc2626] via-[#ea580c] to-[#f97316] font-medium text-xl transition-all duration-300 ease-in-out group" style={{ marginRight: '3rem' }}>
              {/* Animated border with flowcore gradient */}
              <div className="absolute inset-0 rounded-full border-2 border-transparent bg-gradient-to-r from-[#dc2626] via-[#ea580c] to-[#f97316] transition-all duration-300 group-hover:opacity-50" 
                   style={{ mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', maskComposite: 'xor' }}></div>
              
              {/* Hover glow effect with flowcore gradient */}
              <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-300 bg-gradient-to-r from-[#dc2626] via-[#ea580c] to-[#f97316] blur-md"></div>
              
              {/* Content with white text */}
              <TrendingUp className="w-6 h-6 relative z-10 text-white" />
              <span className="relative z-10 text-white">Trend Entdecken</span>
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center gap-3">
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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {trends.length === 0 ? (
          <div className="text-center py-12">
            <Sparkles className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Keine Trends verfügbar</h3>
            <p className="text-gray-600 mb-6">Versuche es später noch einmal</p>
            <Button onClick={refreshTrends} disabled={isRefreshing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Neu laden
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {trends.map((trend) => (
              <TrendCard
                key={trend.id}
                trend={trend}
                onSave={() => handleSaveTrend(trend)}
                isSaved={savedTrends.some(s => s.id === trend.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 