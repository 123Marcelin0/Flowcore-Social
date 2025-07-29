'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import AIFeedbackCollector from './ai-feedback-collector'
import { Star, ThumbsUp, ThumbsDown, Sparkles, Target, TrendingUp, Copy, Heart, MessageCircle, Share } from 'lucide-react'

interface CaptionSuggestion {
  id: string
  strategy: string
  caption: string
  hashtags: string
  confidence_score: number
  reasoning: string
}

interface UserProfile {
  brand_tone: string
  target_audience: string[]
  goals: string[]
}

interface PerformanceInsights {
  avgLikes: number
  avgComments: number
  avgShares: number
  avgEngagement: number
  topHashtags: string[]
  insights: string
}

export default function SmartCaptionDemo() {
  const [postContent, setPostContent] = useState('Beautiful 3-bedroom family home in a quiet neighborhood, perfect for growing families. Features modern kitchen, spacious backyard, and walking distance to schools.')
  const [mediaType, setMediaType] = useState('image')
  const [suggestions, setSuggestions] = useState<CaptionSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [userProfile] = useState<UserProfile>({
    brand_tone: 'professional_trustworthy_humorous',
    target_audience: ['seniors_55_plus_sellers', 'families', 'young_buyers_25_35'],
    goals: ['increase_reach', 'build_social_following', 'attract_buyers_sellers']
  })
  const [performanceInsights] = useState<PerformanceInsights>({
    avgLikes: 47,
    avgComments: 12,
    avgShares: 8,
    avgEngagement: 22,
    topHashtags: ['#realestate', '#dreamhome', '#localmarket', '#familyhome', '#investment'],
    insights: 'Your posts average 47 likes, 12 comments. Top hashtags: #realestate, #dreamhome, #localmarket'
  })
  // Removed old feedback state - now using AIFeedbackCollector component

  // Demo data for when the API would return suggestions
  const demoSuggestions: CaptionSuggestion[] = [
    {
      id: '1',
      strategy: 'Brand Voice Match',
      caption: '🏡 This gorgeous family home checks all the boxes! Modern kitchen for those family dinners, spacious backyard for weekend BBQs, and you can literally walk the kids to school. Sometimes the perfect home finds the perfect family! 😊',
      hashtags: '#DreamHome #FamilyFirst #LocalExpert #WalkToSchool #ModernLiving #FamilyHome',
      confidence_score: 0.8,
      reasoning: 'Crafted to perfectly match your established professional yet personable tone for real estate.'
    },
    {
      id: '2',
      strategy: 'Engagement Optimized',
      caption: '✨ What makes a house a HOME? This beauty has it all! 👨‍👩‍👧‍👦 Modern kitchen ✅ Spacious backyard ✅ Walking distance to schools ✅ Drop a 🏡 if this sounds like your family\'s next chapter! Which feature excites you most?',
      hashtags: '#YourNextHome #FamilyLife #ModernHome #DreamHome #RealEstate #LocalMarket',
      confidence_score: 0.7,
      reasoning: 'Uses proven tactics like questions and CTAs to maximize likes, comments, and shares.'
    },
    {
      id: '3',
      strategy: 'Trend-Focused Experimental',
      caption: 'POV: You found THE house 🎯 3BR sanctuary in the perfect neighborhood. Modern vibes meet family functionality. Kids walk to school while parents sip coffee in that stunning kitchen. This is your sign to make the move! 📍',
      hashtags: '#POVRealEstate #TheHouse #ModernFamily #NeighborhoodVibes #YourSign #MakeTheMove',
      confidence_score: 0.6,
      reasoning: 'Tests new approaches with current trends to potentially reach new audience segments.'
    }
  ]

  const generateSuggestions = async () => {
    setLoading(true)
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // In real implementation, this would call the API:
    // const response = await fetch('/api/smart-caption-suggestions', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ postContent, mediaType, platform: 'instagram' })
    // })
    // const data = await response.json()
    // setSuggestions(data.suggestions)
    
    setSuggestions(demoSuggestions)
    setLoading(false)
  }

  // Removed handleFeedback function - now using AIFeedbackCollector component

  const getStrategyIcon = (strategy: string) => {
    switch (strategy) {
      case 'Brand Voice Match': return <Target className="w-4 h-4" />
      case 'Engagement Optimized': return <Heart className="w-4 h-4" />
      case 'Trend-Focused Experimental': return <TrendingUp className="w-4 h-4" />
      default: return <Sparkles className="w-4 h-4" />
    }
  }

  const getStrategyColor = (strategy: string) => {
    switch (strategy) {
      case 'Brand Voice Match': return 'bg-blue-100 text-blue-800'
      case 'Engagement Optimized': return 'bg-green-100 text-green-800'
      case 'Trend-Focused Experimental': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">🪄 Smart Caption Suggestions</h1>
        <p className="text-gray-600">AI-powered captions that learn from your brand voice and performance data</p>
      </div>

      {/* User Profile Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Your Brand Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium">Brand Tone</Label>
              <Badge variant="outline" className="mt-1">Professional & Humorous</Badge>
            </div>
            <div>
              <Label className="text-sm font-medium">Target Audience</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {userProfile.target_audience.map(audience => (
                  <Badge key={audience} variant="secondary" className="text-xs">
                    {audience.replace('_', ' ')}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Performance Insights</Label>
              <p className="text-sm text-gray-600 mt-1">{performanceInsights.insights}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle>Create Your Post</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="content">Post Content/Description</Label>
            <Textarea
              id="content"
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              placeholder="Describe your post content..."
              className="mt-1"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="mediaType">Media Type</Label>
              <Input
                id="mediaType"
                value={mediaType}
                onChange={(e) => setMediaType(e.target.value)}
                placeholder="image, video, carousel"
                className="mt-1"
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={generateSuggestions} 
                disabled={loading || !postContent.trim()}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                    Generating Smart Captions...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Smart Captions
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Your Personalized Caption Options</h2>
          
          {suggestions.map((suggestion, index) => (
            <Card key={suggestion.id} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStrategyIcon(suggestion.strategy)}
                    <CardTitle className="text-lg">{suggestion.strategy}</CardTitle>
                    <Badge className={getStrategyColor(suggestion.strategy)}>
                      {Math.round(suggestion.confidence_score * 100)}% confidence
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigator.clipboard.writeText(`${suggestion.caption}\n\n${suggestion.hashtags}`)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-gray-600">{suggestion.reasoning}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="mb-3 leading-relaxed">{suggestion.caption}</p>
                  <div className="text-blue-600 font-medium">
                    {suggestion.hashtags}
                  </div>
                </div>
                
                {/* Engagement Simulation */}
                <div className="flex items-center gap-4 text-sm text-gray-500 border-t pt-3">
                  <div className="flex items-center gap-1">
                    <Heart className="w-4 h-4" />
                    <span>{performanceInsights.avgLikes + (index === 0 ? 15 : index === 1 ? 25 : 8)} likes</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle className="w-4 h-4" />
                    <span>{performanceInsights.avgComments + (index === 0 ? 3 : index === 1 ? 8 : 2)} comments</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Share className="w-4 h-4" />
                    <span>{performanceInsights.avgShares + (index === 0 ? 2 : index === 1 ? 5 : 1)} shares</span>
                  </div>
                </div>

                {/* AI Feedback Collection */}
                <AIFeedbackCollector
                  actionType="caption"
                  actionId={suggestion.id}
                  suggestionData={suggestion}
                  context="smart-caption-demo"
                  onFeedbackSubmitted={(feedback) => {
                    console.log('✅ Caption feedback received:', feedback)
                    // You can handle the feedback response here
                    // e.g., show a thank you message, update UI, etc.
                  }}
                  compact={true}
                />
              </CardContent>
            </Card>
          ))}

          {/* Learning Message */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-900">AI Learning in Action</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Your feedback helps the AI learn your preferences! Each rating improves future suggestions to better match your brand voice and audience engagement patterns.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
} 