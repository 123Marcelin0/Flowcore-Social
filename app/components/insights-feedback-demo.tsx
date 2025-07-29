'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  TrendingUp, TrendingDown, Clock, Hash, Smile, Target, 
  BarChart3, Zap, Brain, RefreshCw, CheckCircle, Calendar,
  Users, Heart, MessageCircle, Share, Eye
} from 'lucide-react'

interface PerformanceInsight {
  id: string
  post_id: string
  platform: string
  content: string
  metrics: {
    likes: number
    comments: number
    shares: number
    reach: number
    engagement_rate: number
  }
  content_features: {
    emoji_count: number
    hashtag_count: number
    has_cta: boolean
    has_question: boolean
    word_count: number
  }
  post_timing: {
    day_of_week: number
    hour_of_day: number
    day_name: string
    time_period: string
  }
  performance_category: string
  created_at: string
}

interface DetectedPattern {
  id: string
  pattern_type: string
  pattern_name: string
  avg_engagement_lift: number
  confidence_level: number
  sample_size: number
  priority_score: number
  is_active: boolean
}

export default function InsightsFeedbackDemo() {
  const [syncStatus, setSyncStatus] = useState('idle') // idle, syncing, completed
  const [insights, setInsights] = useState<PerformanceInsight[]>([])
  const [patterns, setPatterns] = useState<DetectedPattern[]>([])
  const [selectedPattern, setSelectedPattern] = useState<string | null>(null)

  // Demo data
  const demoInsights: PerformanceInsight[] = [
    {
      id: '1',
      post_id: 'post-1',
      platform: 'instagram',
      content: '🏡 Just listed! Beautiful 3BR family home in Maplewood. Modern kitchen, spacious backyard, walk to schools! Who\'s ready for a tour? 📍 #DreamHome #FamilyFirst #LocalExpert',
      metrics: { likes: 89, comments: 23, shares: 12, reach: 1247, engagement_rate: 0.098 },
      content_features: { emoji_count: 2, hashtag_count: 3, has_cta: true, has_question: true, word_count: 24 },
      post_timing: { day_of_week: 2, hour_of_day: 10, day_name: 'Tuesday', time_period: 'morning' },
      performance_category: 'high',
      created_at: '2024-01-15T10:30:00Z'
    },
    {
      id: '2', 
      post_id: 'post-2',
      platform: 'facebook',
      content: 'Market Update: Home values in our area increased 8% this quarter. Great news for sellers! Contact me for a free consultation.',
      metrics: { likes: 34, comments: 6, shares: 4, reach: 892, engagement_rate: 0.049 },
      content_features: { emoji_count: 0, hashtag_count: 0, has_cta: true, has_question: false, word_count: 19 },
      post_timing: { day_of_week: 4, hour_of_day: 15, day_name: 'Thursday', time_period: 'afternoon' },
      performance_category: 'medium',
      created_at: '2024-01-18T15:20:00Z'
    },
    {
      id: '3',
      post_id: 'post-3', 
      platform: 'instagram',
      content: '✨ Before & After transformation! This kitchen renovation added $25k in value. Smart investment for this growing family! 👨‍👩‍👧‍👦 #HomeImprovement #Investment #RealEstateValue',
      metrics: { likes: 156, comments: 31, shares: 18, reach: 2134, engagement_rate: 0.096 },
      content_features: { emoji_count: 3, hashtag_count: 3, has_cta: false, has_question: false, word_count: 21 },
      post_timing: { day_of_week: 0, hour_of_day: 19, day_name: 'Sunday', time_period: 'evening' },
      performance_category: 'high',
      created_at: '2024-01-21T19:15:00Z'
    }
  ]

  const demoPatterns: DetectedPattern[] = [
    {
      id: '1',
      pattern_type: 'emoji_usage',
      pattern_name: 'House + Family Emojis',
      avg_engagement_lift: 0.032,
      confidence_level: 0.87,
      sample_size: 12,
      priority_score: 0.89,
      is_active: true
    },
    {
      id: '2', 
      pattern_type: 'posting_time',
      pattern_name: 'Tuesday Morning Posts',
      avg_engagement_lift: 0.028,
      confidence_level: 0.82,
      sample_size: 8,
      priority_score: 0.83,
      is_active: true
    },
    {
      id: '3',
      pattern_type: 'content_strategy',
      pattern_name: 'Question + CTA Combination', 
      avg_engagement_lift: 0.025,
      confidence_level: 0.79,
      sample_size: 15,
      priority_score: 0.81,
      is_active: true
    },
    {
      id: '4',
      pattern_type: 'hashtag_strategy',
      pattern_name: 'Local + Emotional Hashtags',
      avg_engagement_lift: 0.022,
      confidence_level: 0.75,
      sample_size: 18,
      priority_score: 0.77,
      is_active: true
    }
  ]

  const simulateSync = async () => {
    setSyncStatus('syncing')
    
    // Simulate API sync process
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    setInsights(demoInsights)
    
    // Simulate pattern detection after sync
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    setPatterns(demoPatterns)
    setSyncStatus('completed')
  }

  const getPatternIcon = (type: string) => {
    switch (type) {
      case 'emoji_usage': return <Smile className="w-4 h-4" />
      case 'posting_time': return <Clock className="w-4 h-4" />
      case 'content_strategy': return <Target className="w-4 h-4" />
      case 'hashtag_strategy': return <Hash className="w-4 h-4" />
      default: return <Brain className="w-4 h-4" />
    }
  }

  const getPerformanceColor = (category: string) => {
    switch (category) {
      case 'high': return 'text-green-600 bg-green-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'low': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const formatEngagementRate = (rate: number) => `${(rate * 100).toFixed(1)}%`

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">📊 AI Insights Feedback Loop</h1>
        <p className="text-gray-600">Real-time learning from your social media performance</p>
      </div>

      {/* Sync Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Sync Real-Time Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button 
              onClick={simulateSync}
              disabled={syncStatus === 'syncing'}
              className="flex items-center gap-2"
            >
              {syncStatus === 'syncing' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Syncing from Meta APIs...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Sync Instagram & Facebook
                </>
              )}
            </Button>
            
            {syncStatus === 'syncing' && (
              <div className="flex-1">
                <div className="text-sm text-gray-600 mb-1">Fetching performance data...</div>
                <Progress value={66} className="h-2" />
              </div>
            )}

            {syncStatus === 'completed' && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">Last synced: Just now</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Performance Insights */}
      {insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Recent Performance Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.map((insight) => (
                <div key={insight.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">{insight.content}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {insight.post_timing.day_name} {insight.post_timing.time_period}
                        </span>
                        <Badge variant="outline" className={`text-xs ${getPerformanceColor(insight.performance_category)}`}>
                          {insight.performance_category} performer
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-green-600">
                        {formatEngagementRate(insight.metrics.engagement_rate)}
                      </div>
                      <div className="text-xs text-gray-500">engagement rate</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Heart className="w-3 h-3 text-red-500" />
                      <span>{insight.metrics.likes}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3 text-blue-500" />
                      <span>{insight.metrics.comments}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Share className="w-3 h-3 text-green-500" />
                      <span>{insight.metrics.shares}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="w-3 h-3 text-purple-500" />
                      <span>{insight.metrics.reach}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>🙂 {insight.content_features.emoji_count} emojis</span>
                    <span># {insight.content_features.hashtag_count} hashtags</span>
                    <span>💬 {insight.content_features.word_count} words</span>
                    {insight.content_features.has_cta && <span>📢 Has CTA</span>}
                    {insight.content_features.has_question && <span>❓ Has question</span>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detected Patterns */}
      {patterns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              AI-Detected Performance Patterns
            </CardTitle>
            <p className="text-sm text-gray-600">
              Patterns the AI learned from your content that drive higher engagement
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {patterns.map((pattern) => (
                <div 
                  key={pattern.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedPattern === pattern.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedPattern(selectedPattern === pattern.id ? null : pattern.id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getPatternIcon(pattern.pattern_type)}
                      <div>
                        <h3 className="font-medium text-sm">{pattern.pattern_name}</h3>
                        <p className="text-xs text-gray-500 capitalize">{pattern.pattern_type.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-green-600 font-medium text-sm">
                        +{formatEngagementRate(pattern.avg_engagement_lift)}
                      </div>
                      <div className="text-xs text-gray-500">avg lift</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Confidence</span>
                      <span className="font-medium">{Math.round(pattern.confidence_level * 100)}%</span>
                    </div>
                    <Progress value={pattern.confidence_level * 100} className="h-1" />
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{pattern.sample_size} posts analyzed</span>
                      <Badge variant="secondary" className="text-xs">
                        Priority: {Math.round(pattern.priority_score * 100)}
                      </Badge>
                    </div>
                  </div>

                  {selectedPattern === pattern.id && (
                    <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                      <div className="text-xs space-y-1">
                        <div className="font-medium text-blue-900">How this improves your suggestions:</div>
                        {pattern.pattern_type === 'emoji_usage' && (
                          <div className="text-blue-700">AI will suggest using 🏡 and 👨‍👩‍👧‍👦 emojis in family home posts</div>
                        )}
                        {pattern.pattern_type === 'posting_time' && (
                          <div className="text-blue-700">AI will recommend posting on Tuesday mornings for better reach</div>
                        )}
                        {pattern.pattern_type === 'content_strategy' && (
                          <div className="text-blue-700">AI will include questions + CTAs in caption suggestions</div>
                        )}
                        {pattern.pattern_type === 'hashtag_strategy' && (
                          <div className="text-blue-700">AI will combine local tags (#LocalExpert) with emotional ones (#DreamHome)</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Steps */}
      {syncStatus === 'completed' && (
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900 mb-1">AI Learning Complete!</h3>
                <p className="text-sm text-blue-700 mb-3">
                  Your AI assistant has analyzed {insights.length} recent posts and detected {patterns.length} performance patterns. 
                  Future caption suggestions will now be personalized based on what works best for YOUR audience.
                </p>
                <div className="flex items-center gap-4 text-xs text-blue-600">
                  <span>✓ Content patterns learned</span>
                  <span>✓ Optimal timing identified</span>
                  <span>✓ Hashtag strategies optimized</span>
                  <span>✓ Suggestion algorithm updated</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Improvement Prediction */}
      {patterns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Predicted Performance Improvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600 mb-1">+24%</div>
                <div className="text-sm text-green-700">Avg Engagement</div>
                <div className="text-xs text-gray-500 mt-1">Using detected patterns</div>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 mb-1">+38%</div>
                <div className="text-sm text-blue-700">Reach Growth</div>
                <div className="text-xs text-gray-500 mt-1">Optimal timing + content</div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600 mb-1">3.2x</div>
                <div className="text-sm text-purple-700">Time Saved</div>
                <div className="text-xs text-gray-500 mt-1">AI-optimized suggestions</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 