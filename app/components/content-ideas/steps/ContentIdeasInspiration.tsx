"use client"

import React, { useState, useEffect, useCallback } from 'react'
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
  Share2,
  RotateCcw,
  Play,
  Image as ImageIcon,
  Video,
  Loader2
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from 'sonner'
import { TrendOptimizationWorkflow } from "@/app/components/trend-optimization-workflow"
import type { ContentStep } from "../hooks/useContentIdeas"
import { ContentIdeaService } from "@/lib/content-idea-service"
import { useAuth } from "@/lib/auth-context"

// Media Preview Component with enhanced error handling for Instagram URLs
interface MediaPreviewProps {
  src: string
  mediaUrls: string[]
  mediaType: string
  alt: string
  className: string
}

function MediaPreview({ src, mediaUrls, mediaType, alt, className }: MediaPreviewProps) {
  const [currentSrc, setCurrentSrc] = useState(() => {
    // Use proxy for Instagram URLs
    if (src.includes('instagram') || src.includes('scontent-') || src.includes('cdninstagram')) {
      return `/api/media-proxy?url=${encodeURIComponent(src)}`
    }
    return src
  })
  const [urlIndex, setUrlIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [triedProxy, setTriedProxy] = useState(false)

  const getProxiedUrl = useCallback((url: string) => {
    if (url.includes('instagram') || url.includes('scontent-') || url.includes('cdninstagram')) {
      return `/api/media-proxy?url=${encodeURIComponent(url)}`
    }
    return url
  }, [])

  const handleImageError = useCallback(() => {
    console.log(`Failed to load image: ${currentSrc}`)
    
    // If we haven't tried the proxy yet for this URL, try it
    if (!triedProxy && !currentSrc.includes('/api/media-proxy') && urlIndex < mediaUrls.length) {
      const originalUrl = mediaUrls[urlIndex] || src
      setCurrentSrc(getProxiedUrl(originalUrl))
      setTriedProxy(true)
      setIsLoading(true)
      setHasError(false)
      return
    }
    
    // Try next URL in mediaUrls array
    if (urlIndex + 1 < mediaUrls.length) {
      const nextIndex = urlIndex + 1
      setUrlIndex(nextIndex)
      setCurrentSrc(getProxiedUrl(mediaUrls[nextIndex]))
      setTriedProxy(false)
      setIsLoading(true)
      setHasError(false)
      return
    }
    
    // Try original URL without proxy
    if (currentSrc.includes('/api/media-proxy')) {
      const originalUrl = decodeURIComponent(currentSrc.split('url=')[1] || '')
      if (originalUrl && originalUrl !== currentSrc) {
        setCurrentSrc(originalUrl)
        setIsLoading(true)
        setHasError(false)
        return
      }
    }
    
    // Try placeholder as last resort
    if (currentSrc !== '/placeholder.svg') {
      setCurrentSrc('/placeholder.svg')
      setIsLoading(true)
      setHasError(false)
      return
    }
    
    // Complete failure
    setHasError(true)
    setIsLoading(false)
  }, [currentSrc, mediaUrls, urlIndex, src, getProxiedUrl, triedProxy])

  const handleImageLoad = useCallback(() => {
    setIsLoading(false)
    setHasError(false)
  }, [])

  if (hasError) {
    return (
      <div className={`${className} bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center`}>
        <div className="text-center text-gray-500 p-4">
          {mediaType === 'video' ? (
            <Video className="w-8 h-8 mx-auto mb-2" />
          ) : mediaType === 'carousel' ? (
            <ImageIcon className="w-8 h-8 mx-auto mb-2" />
          ) : (
            <ImageIcon className="w-8 h-8 mx-auto mb-2" />
          )}
          <div className="text-xs font-medium mb-1">
            {mediaType === 'video' ? 'Video Preview' : 
             mediaType === 'carousel' ? `${mediaUrls.length} Photos` : 
             'Image Preview'}
          </div>
          <div className="text-xs opacity-75">Content from Instagram</div>
        </div>
      </div>
    )
  }

  return (
    <>
      {isLoading && (
        <div className={`absolute inset-0 bg-gray-200 flex items-center justify-center z-5`}>
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      )}
      <img
        src={currentSrc}
        alt={alt}
        className={className}
        loading="lazy"
        onLoad={handleImageLoad}
        onError={handleImageError}
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
      />
      
      {/* Video/Carousel indicators */}
      {!isLoading && !hasError && (
        <>
          {mediaType === 'video' && (
            <div className="absolute top-3 left-3 z-10">
              <div className="bg-black/80 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                <Play className="w-3 h-3" />
                VIDEO
              </div>
            </div>
          )}
          {mediaType === 'carousel' && mediaUrls.length > 1 && (
            <div className="absolute top-3 left-3 z-10">
              <div className="bg-black/80 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                <ImageIcon className="w-3 h-3" />
                {mediaUrls.length} PHOTOS
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}

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
  media_urls?: string[]
  media_type?: string
}

interface TrendCardProps {
  trend: TrendData
  onSave: () => void
  isSaved: boolean
  onSelect?: (trend: TrendData) => void
  isSelectionMode?: boolean
}

const TrendCard: React.FC<TrendCardProps> = ({ trend, onSave, isSaved, onSelect, isSelectionMode }) => {
  const [isFlipped, setIsFlipped] = useState(false)

  const handleInstagramRedirect = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (trend.reel_url) {
      // Ensure the URL is valid
      const url = trend.reel_url.startsWith('http') ? trend.reel_url : `https://${trend.reel_url}`
      window.open(url, '_blank', 'noopener,noreferrer')
      toast.success('Instagram post öffnet sich in neuem Tab')
    } else {
      toast.error('Instagram Link nicht verfügbar')
    }
  }

  const handleFlip = () => {
    if (isSelectionMode) return // Don't flip in selection mode
    setIsFlipped(!isFlipped)
  }

  const handleCardClick = () => {
    if (isSelectionMode && onSelect) {
      onSelect(trend)
    } else {
      handleFlip()
    }
  }

  const formatCount = (count?: number) => {
    if (!count) return '0'
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
    return count.toString()
  }

  return (
    <div className="perspective-1000 h-[500px]">
      <div
        className={`
          relative w-full h-full transition-transform duration-700 transform-style-preserve-3d cursor-pointer
          ${isFlipped ? 'rotate-y-180' : ''}
          ${isSelectionMode ? 'hover:scale-105 hover:shadow-xl' : ''}
        `}
        onClick={handleCardClick}
      >
        {/* Front Side */}
        <Card className={`
          absolute inset-0 w-full h-full backface-hidden overflow-hidden hover:shadow-lg transition-all duration-300 group border-0 bg-white rounded-2xl
          ${isSelectionMode ? 'ring-2 ring-transparent hover:ring-orange-400 hover:ring-opacity-50' : ''}
        `}>
          <CardContent className="p-0 h-full flex flex-col">
            {/* Selection Mode Indicator */}
            {isSelectionMode && (
              <div className="absolute top-4 left-4 z-10">
                <Badge className="bg-gradient-to-r from-[#dc2626] via-[#ea580c] to-[#f97316] text-white">
                  <span className="transform rotate-90 origin-center inline-block whitespace-nowrap">
                    Zum Optimieren klicken
                  </span>
                </Badge>
              </div>
            )}

            {/* Title */}
            <div className="p-4 pb-2">
              <h3 className="font-semibold text-gray-900 text-lg mb-1 line-clamp-2">
                {trend.title || 'Untitled Trend'}
              </h3>
              <p className="text-sm text-gray-500">{trend.creator || 'Unknown Creator'}</p>
            </div>

            {/* Enhanced Engagement Metrics */}
            <div className="px-4 pb-3">
              <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
                {trend.likes_count !== undefined && trend.likes_count > 0 && (
                  <div className="flex items-center gap-1">
                    <Heart className="w-4 h-4 text-red-500" />
                    <span className="font-medium">{formatCount(trend.likes_count)}</span>
                  </div>
                )}
                {trend.comments_count !== undefined && trend.comments_count > 0 && (
                  <div className="flex items-center gap-1">
                    <MessageCircle className="w-4 h-4 text-blue-500" />
                    <span className="font-medium">{formatCount(trend.comments_count)}</span>
                  </div>
                )}
                {trend.views_count !== undefined && trend.views_count > 0 && (
                  <div className="flex items-center gap-1">
                    <Eye className="w-4 h-4 text-green-500" />
                    <span className="font-medium">{formatCount(trend.views_count)}</span>
                  </div>
                )}
                {trend.shares_count !== undefined && trend.shares_count > 0 && (
                  <div className="flex items-center gap-1">
                    <Share2 className="w-4 h-4 text-purple-500" />
                    <span className="font-medium">{formatCount(trend.shares_count)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Enhanced Preview Image */}
            <div className="aspect-[4/5] relative overflow-hidden mx-4 rounded-xl mb-4 flex-1">
              <MediaPreview
                src={trend.thumbnail_url || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=600&fit=crop'}
                mediaUrls={trend.media_urls || [trend.thumbnail_url || '']}
                mediaType={trend.media_type || 'image'}
                alt={trend.title || 'Instagram content preview'}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Save Button Overlay */}
              {!isSelectionMode && (
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
              )}
              
              {/* Flip Hint or Selection Hint */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-center gap-2 text-white/80 text-sm bg-black/20 backdrop-blur-sm rounded-lg py-2">
                {isSelectionMode ? (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Klicken für KI-Optimierung</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Klicken für Script</span>
                  </>
                )}
              </div>
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

        {/* Back Side - Script (only show if not in selection mode) */}
        {!isSelectionMode && (
          <Card className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 overflow-hidden border-0 bg-white rounded-2xl">
            <CardContent className="p-6 h-full flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Script Idee</h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleFlip()
                  }}
                  className="rounded-full p-2"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Script Content */}
              <div className="flex-1 overflow-y-auto mb-4">
                <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                    {trend.script || 'Kein Script verfügbar für diesen Trend.'}
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={handleInstagramRedirect}
                  className="flex-1 bg-gradient-to-r from-[#dc2626] via-[#ea580c] to-[#f97316] hover:from-red-700 hover:via-orange-700 hover:to-yellow-700 text-white"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Original ansehen
                </Button>
                <Button
                  variant={isSaved ? "default" : "outline"}
                  className={`${
                    isSaved 
                      ? 'bg-gradient-to-r from-[#dc2626] via-[#ea580c] to-[#f97316] text-white' 
                      : 'border-orange-200 text-orange-600 hover:bg-orange-50'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation()
                    onSave()
                  }}
                >
                  <Bookmark className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

interface ContentIdeasInspirationProps {
  setCurrentStep: (step: ContentStep) => void
}

export function ContentIdeasInspiration({ setCurrentStep }: ContentIdeasInspirationProps) {
  const { user } = useAuth()
  const [trends, setTrends] = useState<TrendData[]>([])
  const [savedTrends, setSavedTrends] = useState<TrendData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const [showTrendSelection, setShowTrendSelection] = useState(false)
  const [selectedTrend, setSelectedTrend] = useState<TrendData | null>(null)
  const [workflowStep, setWorkflowStep] = useState<"overview" | "optimization" | "script">("overview")
  const [realtimeChannel, setRealtimeChannel] = useState<any>(null)

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
    
    // Set up real-time subscription for new Instagram reels
    if (supabase) {
      const channel = supabase
        .channel('instagramreelscraper-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'instagramreelscraper' },
          (payload) => {
            console.log('Real-time update received:', payload)
            if (payload.eventType === 'INSERT') {
              toast.success('New Instagram reel added!')
              // Refresh trends to include new data
              loadTrends()
            } else if (payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
              // Refresh trends on any changes
              loadTrends()
            }
          }
        )
        .subscribe()
      
      setRealtimeChannel(channel)
      console.log('Real-time subscription set up for Instagram reels')
    }
    
    // Cleanup function
    return () => {
      if (realtimeChannel) {
        supabase?.removeChannel(realtimeChannel)
        console.log('Real-time subscription cleaned up')
      }
    }
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

      // Query Instagram reels from the instagramreelscraper table (correct table name)
      const { data, error } = await supabase
        .from('instagramreelscraper')
        .select(`
          id,
          url,
          displayUrl,
          videoUrl,
          caption,
          firstComment,
          script,
          likesCount,
          commentsCount,
          videoViewCount,
          videoPlayCount,
          key
        `)
        .order('id', { ascending: false })
        .limit(12)
      
      if (error) {
        console.warn('Database query failed:', error.message)
        throw error
      }
      
      // Transform Instagram reels data to match TrendData interface
      const transformedTrends = data?.map(item => {
        // Extract username from URL if possible
        const urlMatch = item.url?.match(/instagram\.com\/(?:p|reel)\/[^\/]+/)
        const creatorFromUrl = urlMatch ? '@instagram_user' : '@unknown'
        
        return {
          id: item.id.toString(),
          thumbnail_url: item.displayUrl || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=600&fit=crop',
          reel_url: item.url,
          title: item.caption ? (item.caption.substring(0, 50) + '...') : 'Instagram Reel',
          creator: creatorFromUrl,
          likes_count: item.likesCount || 0,
          comments_count: item.commentsCount || 0,
          views_count: item.videoViewCount || 0,
          shares_count: 0, // Not available in current schema
          engagement_count: (item.likesCount || 0) + (item.commentsCount || 0) + (item.videoViewCount || 0),
          script: item.script || (item.firstComment ? `First comment: ${item.firstComment}` : 'No script available for this trend.'),
          description: item.caption || 'Instagram reel content',
          media_urls: [item.displayUrl || ''],
          media_type: 'video' // Instagram reels are videos
        }
      }) || []
      
      console.log(`Loaded ${transformedTrends.length} Instagram reels as trends`)
      
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

      // Query different Instagram reels for variety
      const { data, error } = await supabase
        .from('instagramreelscraper')
        .select(`
          id,
          url,
          displayUrl,
          videoUrl,
          caption,
          firstComment,
          script,
          likesCount,
          commentsCount,
          videoViewCount,
          videoPlayCount,
          key
        `)
        .order('id', { ascending: false })
        .limit(20) // Get more reels to shuffle
      
      if (error) {
        console.warn('Database refresh failed:', error.message)
        throw error
      }
      
      // Transform and shuffle the Instagram reels
      const transformedTrends = data?.map(item => {
        // Extract username from URL if possible
        const urlMatch = item.url?.match(/instagram\.com\/(?:p|reel)\/[^\/]+/)
        const creatorFromUrl = urlMatch ? '@instagram_user' : '@unknown'
        
        return {
          id: item.id.toString(),
          thumbnail_url: item.displayUrl || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=600&fit=crop',
          reel_url: item.url,
          title: item.caption ? (item.caption.substring(0, 50) + '...') : 'Instagram Reel',
          creator: creatorFromUrl,
          likes_count: item.likesCount || 0,
          comments_count: item.commentsCount || 0,
          views_count: item.videoViewCount || 0,
          shares_count: 0, // Not available in current schema
          engagement_count: (item.likesCount || 0) + (item.commentsCount || 0) + (item.videoViewCount || 0),
          script: item.script || (item.firstComment ? `First comment: ${item.firstComment}` : 'No script available for this trend.'),
          description: item.caption || 'Instagram reel content',
          media_urls: [item.displayUrl || ''],
          media_type: 'video' // Instagram reels are videos
        }
      }) || []
      
      // Shuffle the trends for variety and take 12
      const shuffledTrends = transformedTrends.sort(() => Math.random() - 0.5).slice(0, 12)
      setTrends(shuffledTrends.length > 0 ? shuffledTrends : mockTrends)
      
      toast.success(`Fresh ${shuffledTrends.length} Instagram reels loaded!`)
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

  const handleSaveTrend = async (trend: TrendData) => {
    if (!user?.id) {
      toast.error('Bitte melde dich an, um Trends zu speichern')
      return
    }

    if (!savedTrends.find(s => s.id === trend.id)) {
      try {
        // Save to database with embedding
        const savedTrendData = await ContentIdeaService.saveTrendIdea(trend, user.id)
        
        if (savedTrendData) {
          setSavedTrends(prev => [...prev, trend])
          toast.success('💾 Trend in Datenbank gespeichert!')
        } else {
          toast.error('Fehler beim Speichern des Trends')
        }
      } catch (error) {
        console.error('Error saving trend:', error)
        toast.error('Fehler beim Speichern des Trends')
      }
    } else {
      setSavedTrends(prev => prev.filter(s => s.id !== trend.id))
      toast.success('Trend entfernt!')
    }
  }

  const removeSavedTrend = (id: string) => {
    setSavedTrends(prev => prev.filter(t => t.id !== id))
    toast.success('Trend entfernt')
  }

  const handleTrendSelect = (trend: TrendData) => {
    setSelectedTrend(trend)
    setWorkflowStep("optimization")
    toast.success(`Trend "${trend.title}" ausgewählt!`)
  }

  const handleWorkflowBack = () => {
    if (workflowStep === "optimization") {
      setSelectedTrend(null)
      setWorkflowStep("overview")
    }
  }

  // Show trend optimization workflow
  if (selectedTrend && workflowStep === "optimization") {
    return (
      <TrendOptimizationWorkflow 
        trend={selectedTrend}
        onBack={handleWorkflowBack}
      />
    )
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
        {/* Header - Grey Background */}
        <div className="px-6 py-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <Button 
                variant="ghost" 
                onClick={() => setShowSaved(false)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 bg-white/90 backdrop-blur-sm rounded-lg"
              >
                <ArrowLeft className="w-4 h-4" />
                Zurück zu Trends
              </Button>
              <h1 className="text-xl font-semibold text-gray-900 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

  if (showTrendSelection) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header - Grey Background */}
        <div className="px-6 py-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <Button 
                variant="ghost" 
                onClick={() => setShowTrendSelection(false)}
                className="flex items-center gap-2 h-10 px-4 rounded-full bg-gradient-to-r from-[#dc2626] via-[#ea580c] to-[#f97316] text-white shadow-sm hover:shadow-md transition-all duration-200"
                style={{
                  border: 'none',
                  outline: 'none'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'white'
                  e.currentTarget.style.color = '#dc2626'
                  e.currentTarget.style.border = '2px solid #dc2626'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(to right, #dc2626, #ea580c, #f97316)'
                  e.currentTarget.style.color = 'white'
                  e.currentTarget.style.border = 'none'
                }}
              >
                <ArrowLeft className="w-4 h-4" />
                Zurück zu Inspiration
              </Button>
              <h1 className="text-xl font-semibold text-gray-900 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg">
                Trend auswählen
              </h1>
              <div className="w-20"></div>
            </div>
          </div>
        </div>

        {/* Trend Selection Grid */}
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
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trends.map((trend) => (
              <TrendCard
                key={trend.id}
                trend={trend}
                onSave={() => handleSaveTrend(trend)}
                                isSaved={savedTrends.some(s => s.id === trend.id)}
                isSelectionMode={showTrendSelection}
                onSelect={handleTrendSelect}
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
      {/* Header - Grey Background Only */}
      <div className="px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={() => setCurrentStep("overview")}
              className="flex items-center gap-2 h-10 px-4 rounded-full bg-gradient-to-r from-[#dc2626] via-[#ea580c] to-[#f97316] text-white shadow-sm hover:shadow-md transition-all duration-200"
              style={{
                border: 'none',
                outline: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'white'
                e.currentTarget.style.color = '#dc2626'
                e.currentTarget.style.border = '2px solid #dc2626'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(to right, #dc2626, #ea580c, #f97316)'
                e.currentTarget.style.color = 'white'
                e.currentTarget.style.border = 'none'
              }}
            >
              <ArrowLeft className="w-4 h-4" />
              Zurück
            </Button>
            
            {/* Centered Trend Entdecken Button - Always Same Style */}
            <button
              onClick={() => setShowTrendSelection(!showTrendSelection)}
              className="relative inline-flex items-center gap-3 px-8 py-3 rounded-full bg-gradient-to-r from-[#dc2626] via-[#ea580c] to-[#f97316] font-medium text-xl transition-all duration-300 ease-in-out group hover:scale-105"
              style={{
                minWidth: '200px',
                height: '56px'
              }}
            >
              {/* Pulse effect on hover */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#dc2626] via-[#ea580c] to-[#f97316] opacity-0 group-hover:opacity-75 group-hover:animate-ping"></div>
              
              {/* Animated border with gradient */}
              <div className="absolute inset-0 rounded-full border-2 border-transparent bg-gradient-to-r from-[#dc2626] via-[#ea580c] to-[#f97316] transition-all duration-300 group-hover:opacity-50" 
                   style={{ mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', maskComposite: 'xor' }}></div>
              
              {/* Hover glow effect with gradient */}
              <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-300 bg-gradient-to-r from-[#dc2626] via-[#ea580c] to-[#f97316] blur-md"></div>
              
              {/* Content with white text - Always same */}
              <TrendingUp className="w-6 h-6 relative z-10 text-white" />
              <span className="relative z-10 text-white font-medium">Trend Entdecken</span>
            </button>
            
            <div className="w-20"></div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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