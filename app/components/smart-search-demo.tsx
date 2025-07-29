'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Search, 
  Sparkles, 
  Copy, 
  Edit, 
  Plus,
  Calendar,
  Hash,
  BarChart3,
  Heart,
  MessageCircle,
  Share,
  Lightbulb,
  Brain,
  Target
} from 'lucide-react'

interface DemoSearchResult {
  id: string
  title: string
  content: string
  platforms: string[]
  type: string
  published_at: string
  topics: string[]
  similarity_score: number
  performance_boost: number
  final_score: number
  match_reasons: string[]
  usage_suggestions: string[]
  relevance_explanation: string
  ai_insights: {
    likes: number
    comments: number
    shares: number
    performance_category: string
  }
}

export default function SmartSearchDemo() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<DemoSearchResult[]>([])
  const [loading, setLoading] = useState(false)

  // Sample data simulating user's content library
  const sampleContent: DemoSearchResult[] = [
    {
      id: '1',
      title: 'Summer Motivation: Your Dream Home Awaits',
      content: '🏡✨ Summer vibes and dream homes! This season is perfect for making moves. Whether you\'re buying your first home or upgrading to your forever place, the market is full of opportunities. Your future self will thank you for taking action today! 💪 #DreamHome #SummerVibes #RealEstateGoals #Motivation',
      platforms: ['instagram', 'facebook'],
      type: 'reel',
      published_at: '2023-07-15T14:30:00Z',
      topics: ['motivation', 'dream-home', 'summer', 'real-estate'],
      similarity_score: 0.89,
      performance_boost: 0.1,
      final_score: 0.99,
      match_reasons: ['Contains keyword: motivational', 'Matches reel content type', 'Contains topics: motivation, summer'],
      usage_suggestions: ['🔄 Reuse exactly as-is', '✏️ Remix with your style', '📱 Convert to carousel post', '🔥 High performer - reuse strategy'],
      relevance_explanation: 'Very similar content theme, previously performed well, from 5 months ago',
      ai_insights: {
        likes: 342,
        comments: 67,
        shares: 23,
        performance_category: 'high'
      }
    },
    {
      id: '2',
      title: 'Motivational Monday: Home Buying Tips',
      content: 'Monday motivation! 💪 Buying a home feels overwhelming? Break it down: 1️⃣ Get pre-approved 2️⃣ Define your must-haves 3️⃣ Start looking 4️⃣ Make an offer 5️⃣ Close the deal! Every expert was once a beginner. You\'ve got this! 🏠❤️ #MondayMotivation #HomeBuying #RealEstate #YouGotThis',
      platforms: ['instagram'],
      type: 'carousel',
      published_at: '2023-08-21T09:00:00Z',
      topics: ['motivation', 'home-buying', 'tips', 'monday'],
      similarity_score: 0.78,
      performance_boost: 0.05,
      final_score: 0.83,
      match_reasons: ['Contains keyword: motivational', 'Similar content concepts'],
      usage_suggestions: ['🔄 Reuse exactly as-is', '✏️ Remix with your style', '🎬 Turn into video script'],
      relevance_explanation: 'Similar content concepts, matches your filters, from 4 months ago',
      ai_insights: {
        likes: 156,
        comments: 34,
        shares: 12,
        performance_category: 'medium'
      }
    },
    {
      id: '3',
      title: 'Beach House Dreams: Summer Real Estate',
      content: '🏖️ Summer beach house hunting! There\'s something magical about finding your perfect coastal retreat. The sound of waves, morning coffee on the deck, sunset dinners... Make this summer the start of your beach house journey! 🌅 DM me to start looking! #BeachHouse #SummerRealEstate #CoastalLiving #DreamLife',
      platforms: ['instagram', 'facebook'],
      type: 'post',
      published_at: '2023-06-10T16:45:00Z',
      topics: ['beach-house', 'summer', 'coastal-living', 'dreams'],
      similarity_score: 0.72,
      performance_boost: 0,
      final_score: 0.72,
      match_reasons: ['Contains keyword: summer', 'Related topic match'],
      usage_suggestions: ['🔄 Reuse exactly as-is', '✏️ Remix with your style', '📄 Create single image post'],
      relevance_explanation: 'Related topic match, from 6 months ago',
      ai_insights: {
        likes: 89,
        comments: 18,
        shares: 7,
        performance_category: 'low'
      }
    }
  ]

  const searchExamples = [
    'motivational reel from last summer',
    'high performing Instagram posts',
    'content about home buying tips',
    'carousel posts with motivation',
    'summer real estate content'
  ]

  const simulateSearch = (searchQuery: string) => {
    setLoading(true)
    setQuery(searchQuery)

    // Simulate API delay
    setTimeout(() => {
      // Simple keyword matching simulation
      const queryLower = searchQuery.toLowerCase()
      const keywords = queryLower.split(' ')

      const searchResults = sampleContent
        .map(item => {
          let score = 0
          let reasons = []

          // Check for keyword matches
          keywords.forEach(keyword => {
            if (item.content.toLowerCase().includes(keyword) || 
                item.title.toLowerCase().includes(keyword) ||
                item.topics.some(topic => topic.includes(keyword))) {
              score += 0.2
              reasons.push(`Contains keyword: ${keyword}`)
            }
          })

          // Type matching
          if (queryLower.includes('reel') && item.type === 'reel') {
            score += 0.3
            reasons.push('Matches reel content type')
          }
          if (queryLower.includes('carousel') && item.type === 'carousel') {
            score += 0.3
            reasons.push('Matches carousel content type')
          }

          // Topic matching
          const matchingTopics = item.topics.filter(topic => 
            keywords.some(keyword => topic.includes(keyword))
          )
          if (matchingTopics.length > 0) {
            score += 0.2 * matchingTopics.length
            reasons.push(`Contains topics: ${matchingTopics.join(', ')}`)
          }

          // Performance boost
          if (item.ai_insights.performance_category === 'high') {
            score += 0.1
          }

          return {
            ...item,
            similarity_score: Math.min(score, 1),
            match_reasons: reasons,
            final_score: Math.min(score + item.performance_boost, 1)
          }
        })
        .filter(item => item.final_score > 0.3) // Only show relevant results
        .sort((a, b) => b.final_score - a.final_score)
        .slice(0, 3) // Top 3 results

      setResults(searchResults)
      setLoading(false)
    }, 1500)
  }

  const handleAction = (result: DemoSearchResult, action: 'reuse' | 'remix' | 'create') => {
    switch (action) {
      case 'reuse':
        navigator.clipboard.writeText(result.content)
        alert('📋 Content copied to clipboard!')
        break
      case 'remix':
        alert('✏️ Opening content editor with this post as a template!')
        break
      case 'create':
        alert('🎯 Starting new content creation inspired by this post!')
        break
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const getPerformanceColor = (category: string) => {
    switch (category) {
      case 'high': return 'text-green-600 bg-green-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'low': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'reel': return '🎬'
      case 'carousel': return '📱'
      case 'story': return '📸'
      case 'post': return '📝'
      default: return '📄'
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Demo Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2 flex items-center justify-center gap-2">
          <Brain className="w-8 h-8" />
          🔍 Smart Search + Vector Recall Demo
        </h1>
        <p className="text-gray-600">See how AI finds your best content using hybrid search</p>
        <Badge className="mt-2 bg-blue-100 text-blue-700">
          <Sparkles className="w-3 h-3 mr-1" />
          Demo Mode - Using Sample Data
        </Badge>
      </div>

      {/* How It Works */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Target className="w-6 h-6 text-blue-600 mt-1" />
            <div>
              <h3 className="font-medium text-blue-900 mb-2">🧠 How Smart Search Works</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
                <div>
                  <div className="font-medium mb-1">1️⃣ Traditional Filters:</div>
                  <ul className="space-y-1">
                    <li>• Content type (reel, carousel, post)</li>
                    <li>• Platform (Instagram, Facebook)</li>
                    <li>• Topics and hashtags</li>
                    <li>• Date ranges</li>
                  </ul>
                </div>
                <div>
                  <div className="font-medium mb-1">2️⃣ Vector Similarity:</div>
                  <ul className="space-y-1">
                    <li>• Semantic meaning understanding</li>
                    <li>• Content theme matching</li>
                    <li>• Performance data boost</li>
                    <li>• Context-aware ranking</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search Interface */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2 mb-4">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Try: 'motivational reel from last summer'"
              className="flex-1"
              onKeyPress={(e) => e.key === 'Enter' && simulateSearch(query)}
            />
            <Button 
              onClick={() => simulateSearch(query)} 
              disabled={loading || !query.trim()}
            >
              {loading ? (
                <>
                  <Brain className="w-4 h-4 animate-pulse mr-2" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </>
              )}
            </Button>
          </div>

          {/* Quick Search Examples */}
          <div>
            <h4 className="font-medium mb-2">Try these example searches:</h4>
            <div className="flex flex-wrap gap-2">
              {searchExamples.map((example, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => simulateSearch(example)}
                  className="text-xs"
                  disabled={loading}
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  {example}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="pt-6 text-center">
            <Brain className="w-12 h-12 mx-auto mb-4 text-blue-600 animate-pulse" />
            <h3 className="font-medium mb-2">🧠 AI Processing Your Search...</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>✅ Analyzing query intent</p>
              <p>✅ Filtering content by topics and type</p>
              <p>🔄 Computing vector similarities...</p>
              <p>⏳ Ranking results by relevance + performance</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      {results.length > 0 && !loading && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Found {results.length} matches for "{query}"
            </h2>
            <Button variant="outline" size="sm" onClick={() => setResults([])}>
              Clear Results
            </Button>
          </div>

          {results.map((result, index) => (
            <Card key={result.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="text-xs bg-blue-100 text-blue-700">
                        #{index + 1}
                      </Badge>
                      <span className="text-lg">{getTypeIcon(result.type)}</span>
                      <h3 className="font-medium">{result.title}</h3>
                      <Badge variant="outline" className="text-xs">
                        {Math.round(result.similarity_score * 100)}% match
                      </Badge>
                      {result.performance_boost > 0 && (
                        <Badge className="text-xs bg-green-100 text-green-700">
                          <BarChart3 className="w-3 h-3 mr-1" />
                          High performer
                        </Badge>
                      )}
                    </div>

                    <p className="text-gray-700 mb-3 line-clamp-3">{result.content}</p>

                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(result.published_at)}
                      </span>
                      <span>Platforms: {result.platforms.join(', ')}</span>
                      <span className="flex items-center gap-1">
                        <Hash className="w-3 h-3" />
                        {result.topics.slice(0, 2).join(', ')}
                      </span>
                    </div>

                    {/* Performance Metrics */}
                    <div className="flex items-center gap-4 text-sm mb-3">
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {result.ai_insights.likes}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        {result.ai_insights.comments}
                      </span>
                      <span className="flex items-center gap-1">
                        <Share className="w-3 h-3" />
                        {result.ai_insights.shares}
                      </span>
                      <Badge className={`text-xs ${getPerformanceColor(result.ai_insights.performance_category)}`}>
                        {result.ai_insights.performance_category} performer
                      </Badge>
                    </div>

                    <div className="text-xs text-gray-500 mb-3">
                      <span className="font-medium">Why this matches:</span> {result.relevance_explanation}
                    </div>

                    {/* Match Reasons */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {result.match_reasons.map((reason, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {reason}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="text-sm text-gray-600">
                    Here's what I found. Want me to reuse, remix, or create something new?
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAction(result, 'reuse')}
                      className="flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      Reuse
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAction(result, 'remix')}
                      className="flex items-center gap-1"
                    >
                      <Edit className="w-3 h-3" />
                      Remix
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleAction(result, 'create')}
                      className="flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Create New
                    </Button>
                  </div>
                </div>

                {/* Usage Suggestions */}
                <div className="mt-3 pt-3 border-t">
                  <div className="text-sm text-gray-600 mb-2">💡 Usage ideas:</div>
                  <div className="flex flex-wrap gap-1">
                    {result.usage_suggestions.map((suggestion, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {suggestion}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* No Results State */}
      {query && !loading && results.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <Search className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="font-medium mb-2">No matches found</h3>
            <p className="text-gray-600 mb-4">
              Try different keywords or one of the example searches above
            </p>
            <Button variant="outline" onClick={() => { setQuery(''); setResults([]) }}>
              Try Another Search
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Technical Details */}
      <Card className="bg-gray-50 border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            🔧 How This Would Work in Production
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <div className="font-medium mb-1">🗄️ Database Setup:</div>
            <p className="text-gray-600">Posts stored with vector embeddings in Supabase using pgvector extension for semantic similarity search.</p>
          </div>
          <div>
            <div className="font-medium mb-1">🧠 AI Processing:</div>
            <p className="text-gray-600">OpenAI embeddings (text-embedding-3-small) convert content to vectors. Cosine similarity finds semantically related content.</p>
          </div>
          <div>
            <div className="font-medium mb-1">📊 Performance Boost:</div>
            <p className="text-gray-600">High-performing content gets ranking boost based on real engagement metrics from Make.com insights.</p>
          </div>
          <div>
            <div className="font-medium mb-1">🎯 Smart Ranking:</div>
            <p className="text-gray-600">Final score = Similarity + Performance boost + Filter matches. Results sorted by relevance to your query.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 