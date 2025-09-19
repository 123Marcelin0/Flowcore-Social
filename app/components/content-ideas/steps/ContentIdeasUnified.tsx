"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  Loader2,
  Target,
  Clock,
  Award,
  Grid3X3,
  Layers3,
  Zap
} from "lucide-react"
import { StrategySwipeCard } from "@/components/strategy-swipe-card"
import { getSwipeStrategies, type StrategyData } from "@/lib/sample-ideas"
import type { ContentStep } from "../hooks/useContentIdeas"
import { toast } from 'sonner'
import { ContentIdeaService } from "@/lib/content-idea-service"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import { TrendOptimizationWorkflow } from "@/app/components/trend-optimization-workflow"

// Enhanced Media Preview Component
interface MediaPreviewProps {
  src: string
  mediaUrls: string[]
  mediaType: string
  alt: string
  className: string
}

function MediaPreview({ src, mediaUrls, mediaType, alt, className }: MediaPreviewProps) {
  const [currentSrc, setCurrentSrc] = useState(() => {
    if (src && (src.includes('instagram') || src.includes('scontent-') || src.includes('cdninstagram'))) {
      return `/api/media-proxy?url=${encodeURIComponent(src)}`
    }
    return src
  })
  const [urlIndex, setUrlIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [triedProxy, setTriedProxy] = useState(false)

  const getProxiedUrl = useCallback((url: string) => {
    if (url && (url.includes('instagram') || url.includes('scontent-') || url.includes('cdninstagram'))) {
      return `/api/media-proxy?url=${encodeURIComponent(url)}`
    }
    return url
  }, [])

  const handleImageError = useCallback(() => {
    if (!triedProxy && !currentSrc.includes('/api/media-proxy') && urlIndex < mediaUrls.length) {
      const originalUrl = mediaUrls[urlIndex] || src
      if (originalUrl) {
        setCurrentSrc(getProxiedUrl(originalUrl))
        setTriedProxy(true)
        setIsLoading(true)
        setHasError(false)
        return
      }
    }
    
    if (urlIndex + 1 < mediaUrls.length) {
      const nextIndex = urlIndex + 1
      const nextUrl = mediaUrls[nextIndex]
      if (nextUrl) {
        setUrlIndex(nextIndex)
        setCurrentSrc(getProxiedUrl(nextUrl))
        setTriedProxy(false)
        setIsLoading(true)
        setHasError(false)
        return
      }
    }
    
    if (currentSrc !== '/placeholder.svg') {
      setCurrentSrc('/placeholder.svg')
      setIsLoading(true)
      setHasError(false)
      return
    }
    
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
          <div className="text-xs opacity-75">Content Preview</div>
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
      const url = trend.reel_url.startsWith('http') ? trend.reel_url : `https://${trend.reel_url}`
      window.open(url, '_blank', 'noopener,noreferrer')
      toast.success('Instagram post öffnet sich in neuem Tab')
    } else {
      toast.error('Instagram Link nicht verfügbar')
    }
  }

  const handleFlip = () => {
    if (isSelectionMode) return
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
    <div className="perspective-1000 h-[420px]">
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
          absolute inset-0 w-full h-full backface-hidden overflow-hidden 
          bg-white/80 backdrop-blur-xl border border-white/20
          shadow-[0_8px_32px_rgba(31,38,135,0.15)]
          hover:shadow-[0_16px_48px_rgba(31,38,135,0.25)]
          transition-all duration-300 group rounded-2xl
          ${isSelectionMode ? 'ring-2 ring-transparent hover:ring-orange-400/50' : ''}
        `}>
          <CardContent className="p-0 h-full flex flex-col">
            {isSelectionMode && (
              <div className="absolute top-3 left-3 z-10">
                <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                  Zum Optimieren klicken
                </Badge>
              </div>
            )}

            <div className="p-4 pb-2">
              <h3 className="font-semibold text-gray-900 text-lg mb-1 line-clamp-2">
                {trend.title || 'Untitled Trend'}
              </h3>
              <p className="text-sm text-gray-500">{trend.creator || 'Unknown Creator'}</p>
            </div>

            <div className="px-4 pb-3">
              <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
                {trend.likes_count && trend.likes_count > 0 && (
                  <div className="flex items-center gap-1">
                    <Heart className="w-4 h-4 text-red-500" />
                    <span className="font-medium">{formatCount(trend.likes_count)}</span>
                  </div>
                )}
                {trend.comments_count && trend.comments_count > 0 && (
                  <div className="flex items-center gap-1">
                    <MessageCircle className="w-4 h-4 text-blue-500" />
                    <span className="font-medium">{formatCount(trend.comments_count)}</span>
                  </div>
                )}
                {trend.views_count && trend.views_count > 0 && (
                  <div className="flex items-center gap-1">
                    <Eye className="w-4 h-4 text-green-500" />
                    <span className="font-medium">{formatCount(trend.views_count)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="aspect-[4/5] relative overflow-hidden mx-4 rounded-xl mb-4 flex-1">
              <MediaPreview
                src={trend.thumbnail_url || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=600&fit=crop'}
                mediaUrls={trend.media_urls || [trend.thumbnail_url || '']}
                mediaType={trend.media_type || 'image'}
                alt={trend.title || 'Instagram content preview'}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {!isSelectionMode && (
                <Button
                  size="sm"
                  variant={isSaved ? "default" : "secondary"}
                  className={`absolute top-3 right-3 rounded-full w-8 h-8 p-0 ${
                    isSaved 
                      ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white' 
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

            <div className="p-4 pt-0">
              <Button
                onClick={handleInstagramRedirect}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-xl font-medium transition-all duration-200 group/btn"
              >
                <span>Instagram Reel ansehen</span>
                <ExternalLink className="w-4 h-4 ml-2 group-hover/btn:translate-x-0.5 transition-transform duration-200" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Back Side - Script */}
        {!isSelectionMode && (
          <Card className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 overflow-hidden bg-white/80 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_rgba(31,38,135,0.15)] rounded-2xl">
            <CardContent className="p-6 h-full flex flex-col">
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
              
              <div className="flex-1 overflow-y-auto mb-4">
                <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                    {trend.script || 'Kein Script verfügbar für diesen Trend.'}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={handleInstagramRedirect}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Original ansehen
                </Button>
                <Button
                  variant={isSaved ? "default" : "outline"}
                  className={`${
                    isSaved 
                      ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white' 
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

interface ContentIdeasUnifiedProps {
  setCurrentStep: (step: ContentStep) => void
}

export function ContentIdeasUnified({ setCurrentStep }: ContentIdeasUnifiedProps) {
  const { user } = useAuth()
  
  // Strategy state
  const [strategies] = useState<StrategyData[]>(getSwipeStrategies())
  const [currentStrategyIndex, setCurrentStrategyIndex] = useState(0)
  const [savedStrategies, setSavedStrategies] = useState<StrategyData[]>([])
  const [flippedStrategyCards, setFlippedStrategyCards] = useState<Set<string>>(new Set())
  const [strategySwipeDirection, setStrategySwipeDirection] = useState<'left' | 'right' | null>(null)
  
  // Trend state
  const [trends, setTrends] = useState<TrendData[]>([])
  const [savedTrends, setSavedTrends] = useState<TrendData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // UI state
  const [activeTab, setActiveTab] = useState("strategies")
  const [showSaved, setShowSaved] = useState(false)
  const [showTrendSelection, setShowTrendSelection] = useState(false)
  const [selectedTrend, setSelectedTrend] = useState<TrendData | null>(null)
  const [workflowStep, setWorkflowStep] = useState<"overview" | "optimization" | "script">("overview")

  // Mock trends data
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
    }
  ]

  useEffect(() => {
    loadTrends()
  }, [])

  const loadTrends = async () => {
    setIsLoading(true)
    try {
      if (!supabase) {
        setTrends(mockTrends)
        return
      }

      const { data, error } = await supabase
        .from('instagramreelscraper')
        .select(`
          id,
          url,
          displayUrl,
          caption,
          script,
          likesCount,
          commentsCount,
          videoViewCount
        `)
        .order('id', { ascending: false })
        .limit(12)
      
      if (error) throw error
      
      const transformedTrends = data?.map(item => ({
        id: item.id.toString(),
        thumbnail_url: item.displayUrl || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=600&fit=crop',
        reel_url: item.url,
        title: item.caption ? (item.caption.substring(0, 50) + '...') : 'Instagram Reel',
        creator: '@instagram_user',
        likes_count: item.likesCount || 0,
        comments_count: item.commentsCount || 0,
        views_count: item.videoViewCount || 0,
        script: item.script || 'No script available for this trend.',
        media_urls: [item.displayUrl || ''],
        media_type: 'video'
      })) || []
      
      setTrends(transformedTrends.length > 0 ? transformedTrends : mockTrends)
      
    } catch (error) {
      setTrends(mockTrends)
    } finally {
      setIsLoading(false)
    }
  }

  const refreshTrends = async () => {
    setIsRefreshing(true)
    await loadTrends()
    toast.success('Trends refreshed!')
    setIsRefreshing(false)
  }

  // Strategy functions
  const handleStrategySwipeLeft = () => {
    if (strategySwipeDirection) return
    setStrategySwipeDirection('left')
    
    setTimeout(() => {
      setCurrentStrategyIndex(prev => Math.min(prev + 1, strategies.length - 1))
      setStrategySwipeDirection(null)
    }, 250)
  }

  const handleStrategySwipeRight = async () => {
    if (strategySwipeDirection) return
    
    if (!user?.id) {
      toast.error('Bitte melde dich an, um Strategien zu speichern')
      return
    }

    const strategy = strategies[currentStrategyIndex]
    if (strategy && !savedStrategies.find(s => s.id === strategy.id)) {
      try {
        const savedStrategyData = await ContentIdeaService.saveStrategyIdea(strategy, user.id)
        
        if (savedStrategyData) {
          setSavedStrategies(prev => [...prev, strategy])
          toast.success('💾 Strategie gespeichert!')
        } else {
          toast.error('Fehler beim Speichern der Strategie')
        }
      } catch (error) {
        toast.error('Fehler beim Speichern der Strategie')
      }
    }
    
    setStrategySwipeDirection('right')
    
    setTimeout(() => {
      setCurrentStrategyIndex(prev => Math.min(prev + 1, strategies.length - 1))
      setStrategySwipeDirection(null)
    }, 250)
  }

  const handleStrategyFlip = () => {
    const currentStrategy = strategies[currentStrategyIndex]
    if (currentStrategy && !strategySwipeDirection) {
      setFlippedStrategyCards(prev => {
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

  // Trend functions
  const handleSaveTrend = async (trend: TrendData) => {
    if (!user?.id) {
      toast.error('Bitte melde dich an, um Trends zu speichern')
      return
    }

    if (!savedTrends.find(s => s.id === trend.id)) {
      try {
        const savedTrendData = await ContentIdeaService.saveTrendIdea(trend, user.id)
        
        if (savedTrendData) {
          setSavedTrends(prev => [...prev, trend])
          toast.success('💾 Trend gespeichert!')
        } else {
          toast.error('Fehler beim Speichern des Trends')
        }
      } catch (error) {
        toast.error('Fehler beim Speichern des Trends')
      }
    } else {
      setSavedTrends(prev => prev.filter(s => s.id !== trend.id))
      toast.success('Trend entfernt!')
    }
  }

  const handleTrendSelect = (trend: TrendData) => {
    setSelectedTrend(trend)
    setWorkflowStep("optimization")
    toast.success(`Trend "${trend.title}" ausgewählt!`)
  }

  // Show trend optimization workflow
  if (selectedTrend && workflowStep === "optimization") {
    return (
      <TrendOptimizationWorkflow 
        trend={selectedTrend}
        onBack={() => {
          setSelectedTrend(null)
          setWorkflowStep("overview")
        }}
      />
    )
  }

  const currentStrategy = strategies[currentStrategyIndex]
  const hasMoreStrategies = currentStrategyIndex < strategies.length - 1

  return (
    <div 
      className="min-h-screen"
      style={{
        backgroundImage: 'url(/background.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Enhanced Header */}
      <div className="px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={() => setCurrentStep("overview")}
              className="flex items-center gap-2 h-10 px-4 rounded-full bg-white/80 backdrop-blur-xl text-gray-700 hover:bg-white/90 shadow-lg border border-white/20 transition-all duration-300"
            >
              <ArrowLeft className="w-4 h-4" />
              Zurück
            </Button>
            
            <div className="relative inline-flex items-center gap-3 px-8 py-3 rounded-full bg-white/80 backdrop-blur-xl border border-white/20 shadow-lg">
              <Sparkles className="w-6 h-6 text-teal-600" />
              <span className="text-xl font-semibold bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 bg-clip-text text-transparent">
                Content Ideas Hub
              </span>
            </div>

            <Button
              variant="ghost"
              onClick={() => setShowSaved(!showSaved)}
              className="h-10 w-10 p-0 rounded-full bg-white/80 backdrop-blur-xl text-gray-700 hover:bg-white/90 shadow-lg border border-white/20 transition-all duration-300"
            >
              <Bookmark className="w-4 h-4" />
              {(savedStrategies.length + savedTrends.length) > 0 && (
                <Badge variant="secondary" className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs bg-teal-500 text-white border-2 border-white rounded-full flex items-center justify-center">
                  {savedStrategies.length + savedTrends.length}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white/80 backdrop-blur-xl border border-white/20 shadow-lg rounded-2xl">
            <TabsTrigger 
              value="strategies" 
              className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white transition-all duration-300"
            >
              <Target className="w-4 h-4 mr-2" />
              Content Strategien
            </TabsTrigger>
            <TabsTrigger 
              value="inspiration" 
              className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white transition-all duration-300"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Content Inspiration
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="strategies" className="mt-8">
            {/* Strategy Swipe Interface */}
            <div className="max-w-md mx-auto">
              {!hasMoreStrategies && currentStrategyIndex >= strategies.length ? (
                <div className="text-center py-12 bg-white/80 backdrop-blur-xl rounded-3xl shadow-lg border border-white/20">
                  <Sparkles className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Alle Strategien durchgesehen!</h3>
                  <p className="text-gray-600 mb-6">Du hast alle verfügbaren Content-Strategien gesehen</p>
                  <Button 
                    onClick={() => {
                      setCurrentStrategyIndex(0)
                      setFlippedStrategyCards(new Set())
                      setStrategySwipeDirection(null)
                      toast.success('Strategien zurückgesetzt!')
                    }}
                    className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-full px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Von vorne beginnen
                  </Button>
                </div>
              ) : (
                <div className="relative h-[600px] overflow-visible">
                  {strategies.slice(currentStrategyIndex, currentStrategyIndex + 3).map((strategy, index) => (
                    <div
                      key={`${strategy.id}-${currentStrategyIndex}`}
                      className="absolute inset-0"
                      style={{
                        zIndex: 100 + (3 - index),
                        transform: index === 0 ? 'scale(1)' : `scale(${0.95 - index * 0.02}) translateY(${index * 8}px)`,
                        opacity: index === 0 ? 1 : 0.8 - index * 0.1,
                        transition: strategySwipeDirection ? 'none' : 'all 0.3s ease-out'
                      }}
                    >
                      <StrategySwipeCard
                        strategy={strategy}
                        isCurrentCard={index === 0}
                        isNextCard={index === 1}
                        isFlipped={flippedStrategyCards.has(strategy.id)}
                        onFlip={index === 0 ? handleStrategyFlip : () => {}}
                        onSwipeLeft={index === 0 ? handleStrategySwipeLeft : () => {}}
                        onSwipeRight={index === 0 ? handleStrategySwipeRight : () => {}}
                        swipeDirection={index === 0 ? strategySwipeDirection : null}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              {hasMoreStrategies && currentStrategyIndex < strategies.length && (
                <div className="flex justify-center gap-8 mt-8">
                  <Button
                    size="lg"
                    variant="ghost"
                    className="rounded-full w-16 h-16 p-0 bg-white/90 backdrop-blur-xl border-2 border-red-200 text-red-500 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                    onClick={handleStrategySwipeLeft}
                    disabled={!!strategySwipeDirection}
                  >
                    <X className="w-6 h-6" />
                  </Button>
                  
                  <Button
                    size="lg"
                    variant="ghost"
                    className="rounded-full w-16 h-16 p-0 bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                    onClick={handleStrategySwipeRight}
                    disabled={!!strategySwipeDirection}
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
                          index <= currentStrategyIndex ? 'bg-gradient-to-r from-teal-500 to-cyan-500' : 'bg-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-gray-600">
                    {Math.min(currentStrategyIndex + 1, strategies.length)} von {strategies.length}
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="inspiration" className="mt-8">
            {/* Enhanced Controls */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex gap-3">
                <Button
                  onClick={refreshTrends}
                  disabled={isRefreshing}
                  className="bg-white/80 backdrop-blur-xl border border-white/20 shadow-lg hover:bg-white/90 text-gray-700 rounded-xl transition-all duration-300"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Neue Trends laden
                </Button>
                
                <Button
                  onClick={() => setShowTrendSelection(!showTrendSelection)}
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {showTrendSelection ? 'Normal View' : 'KI-Optimierung'}
                </Button>
              </div>
            </div>

            {/* Trends Grid */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12 bg-white/80 backdrop-blur-xl rounded-3xl shadow-lg border border-white/20">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 text-teal-500 animate-spin mx-auto mb-4" />
                  <p className="text-gray-600">Loading trending content...</p>
                </div>
              </div>
            ) : trends.length === 0 ? (
              <div className="text-center py-12 bg-white/80 backdrop-blur-xl rounded-3xl shadow-lg border border-white/20">
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
          </TabsContent>
        </Tabs>

        {/* Saved Items View */}
        {showSaved && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 w-full max-w-6xl max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b border-gray-200/50">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold text-gray-900">
                    Gespeicherte Inhalte ({savedStrategies.length + savedTrends.length})
                  </h2>
                  <Button
                    variant="ghost"
                    onClick={() => setShowSaved(false)}
                    className="rounded-full p-2"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <Tabs defaultValue="strategies" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="strategies">Strategien ({savedStrategies.length})</TabsTrigger>
                    <TabsTrigger value="trends">Trends ({savedTrends.length})</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="strategies">
                    {savedStrategies.length === 0 ? (
                      <div className="text-center py-8">
                        <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">Noch keine Strategien gespeichert</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {savedStrategies.map((strategy) => {
                          const IconComponent = strategy.icon
                          return (
                            <Card key={strategy.id} className="overflow-hidden hover:shadow-lg transition-shadow bg-white/80 backdrop-blur-sm">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-3">
                                  <div className={`
                                    w-10 h-10 rounded-xl 
                                    bg-gradient-to-br ${strategy.color}
                                    flex items-center justify-center shadow-sm
                                  `}>
                                    <IconComponent className={`w-5 h-5 ${strategy.iconColor}`} />
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-gray-400 hover:text-gray-600 rounded-full p-1"
                                    onClick={() => setSavedStrategies(prev => prev.filter(s => s.id !== strategy.id))}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                                
                                <h3 className="font-semibold text-gray-900 mb-2">
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
                  </TabsContent>
                  
                  <TabsContent value="trends">
                    {savedTrends.length === 0 ? (
                      <div className="text-center py-8">
                        <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">Noch keine Trends gespeichert</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {savedTrends.map((trend) => (
                          <TrendCard
                            key={trend.id}
                            trend={trend}
                            onSave={() => setSavedTrends(prev => prev.filter(t => t.id !== trend.id))}
                            isSaved={true}
                          />
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}