'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { 
  Search, 
  Filter, 
  Sparkles, 
  RefreshCw, 
  Copy, 
  Edit, 
  Plus,
  Calendar,
  Hash,
  BarChart3,
  Heart,
  MessageCircle,
  Share,
  Eye,
  Clock,
  Target,
  Lightbulb
} from 'lucide-react'

interface SearchResult {
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
  ai_insights?: {
    likes: number
    comments: number
    shares: number
    reach: number
    impressions: number
    engagement_rate: number
    performance_category: string
  }[]
}

interface SearchFilters {
  type?: string
  platform?: string
  topics?: string[]
  dateFrom?: string
  dateTo?: string
  performanceCategory?: string
}

interface SearchSuggestions {
  recent_searches: string[]
  suggested_topics: string[]
  available_types: string[]
  available_platforms: string[]
  search_tips: string[]
}

export default function SmartSearchInterface() {
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<SearchFilters>({})
  const [results, setResults] = useState<SearchResult[]>([])
  const [suggestions, setSuggestions] = useState<SearchSuggestions | null>(null)
  const [loading, setLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null)
  const [actionMode, setActionMode] = useState<'reuse' | 'remix' | 'create' | null>(null)
  const [remixContent, setRemixContent] = useState('')
  const [createContent, setCreateContent] = useState('')

  // Load search suggestions on component mount
  useEffect(() => {
    let isMounted = true;

    const loadSuggestions = async () => {
      try {
        const response = await fetch('/api/smart-search')
        const data = await response.json()
        if (isMounted && data.success) {
          setSuggestions(data.data)
        }
      } catch (error) {
        if (isMounted) {
          console.error('Error loading suggestions:', error)
        }
      }
    }

    loadSuggestions()

    return () => {
      isMounted = false
    }
  }, [])

  const performSearch = async (searchLimit = 10) => {
    if (!query.trim()) return

    setLoading(true)
    setResults([]) // Clear previous results
    try {
      const response = await fetch('/api/smart-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: query.trim(),
          filters: filters,
          limit: searchLimit
        })
      })

      const data = await response.json()
      if (data.success) {
        setResults(data.data.results || [])
      } else {
        console.error('Search failed:', data.error)
        // Add user-facing error state/notification here
      }
    } catch (error) {
      console.error('Search error:', error)
      // Add user-facing error state/notification here
    } finally {
      setLoading(false)
    }
  }

  const handleQuickSearch = (searchQuery: string) => {
    setQuery(searchQuery)
    setFilters({}) // Reset filters for quick searches
  }

  const handleActionSelect = (result: SearchResult, action: 'reuse' | 'remix' | 'create') => {
    setSelectedResult(result)
    setActionMode(action)
    // Initialize content based on action mode
    if (action === 'remix') {
      setRemixContent(result.content)
    } else if (action === 'create') {
      setCreateContent('')
    }
  }

  const closeModal = () => {
    setSelectedResult(null)
    setActionMode(null)
    setRemixContent('')
    setCreateContent('')
  }

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selectedResult && actionMode) {
        closeModal()
      }
    }

    document.addEventListener('keydown', handleEscapeKey)
    return () => {
      document.removeEventListener('keydown', handleEscapeKey)
    }
  }, [selectedResult, actionMode])

  const executeAction = () => {
    if (!selectedResult || !actionMode) return

    switch (actionMode) {
      case 'reuse':
        // Copy exact content
        navigator.clipboard.writeText(selectedResult.content)
          .then(() => {
            console.log('📋 Content copied to clipboard')
            // Add success notification to user
          })
          .catch((err) => {
            console.error('Failed to copy to clipboard:', err)
            // Add error notification to user
          })
        break
      case 'remix':
        // Use the edited content from remixContent state
        navigator.clipboard.writeText(remixContent)
          .then(() => {
            console.log('✏️ Remixed content copied to clipboard:', remixContent)
            // Add success notification to user
          })
          .catch((err) => {
            console.error('Failed to copy remixed content to clipboard:', err)
            // Add error notification to user
          })
        break
      case 'create':
        // Use the new content from createContent state
        navigator.clipboard.writeText(createContent)
          .then(() => {
            console.log('🎯 New content copied to clipboard:', createContent)
            // Add success notification to user
          })
          .catch((err) => {
            console.error('Failed to copy new content to clipboard:', err)
            // Add error notification to user
          })
        break
    }

    // Reset selection
    closeModal()
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
      {/* Search Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2 flex items-center justify-center gap-2">
          <Search className="w-8 h-8" />
          🔍 Smart Content Search
        </h1>
        <p className="text-gray-600">Find and reuse your best content with AI-powered search</p>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2 mb-4">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your content... e.g., 'motivational reel from last summer'"
              className="flex-1"
              onKeyPress={(e) => e.key === 'Enter' && performSearch()}
            />
            <Button onClick={performSearch} disabled={loading || !query.trim()}>
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filters
            </Button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <Label>Content Type</Label>
                <Select value={filters.type || ""} onValueChange={(value) => setFilters({...filters, type: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any type</SelectItem>
                    {suggestions?.available_types.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Platform</Label>
                <Select value={filters.platform || ""} onValueChange={(value) => setFilters({...filters, platform: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any platform</SelectItem>
                    {suggestions?.available_platforms.map(platform => (
                      <SelectItem key={platform} value={platform}>{platform}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Performance</Label>
                <Select value={filters.performanceCategory || ""} onValueChange={(value) => setFilters({...filters, performanceCategory: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any performance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any performance</SelectItem>
                    <SelectItem value="high">High performing</SelectItem>
                    <SelectItem value="medium">Medium performing</SelectItem>
                    <SelectItem value="low">Low performing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Search Suggestions */}
      {suggestions && !results.length && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5" />
              Search Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Recent Searches */}
            {suggestions.recent_searches.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Recent Searches</h4>
                <div className="flex flex-wrap gap-2">
                  {suggestions.recent_searches.slice(0, 5).map((search, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickSearch(search)}
                      className="text-xs"
                    >
                      <Clock className="w-3 h-3 mr-1" />
                      {search}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Search Tips */}
            <div>
              <h4 className="font-medium mb-2">Try These Searches</h4>
              <div className="flex flex-wrap gap-2">
                {suggestions.search_tips.map((tip, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickSearch(tip)}
                    className="text-xs"
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    {tip}
                  </Button>
                ))}
              </div>
            </div>

            {/* Popular Topics */}
            {suggestions.suggested_topics.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Your Popular Topics</h4>
                <div className="flex flex-wrap gap-2">
                  {suggestions.suggested_topics.slice(0, 8).map((topic, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="cursor-pointer hover:bg-blue-100"
                      onClick={() => handleQuickSearch(topic)}
                    >
                      <Hash className="w-3 h-3 mr-1" />
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Found {results.length} matches for "{query}"
            </h2>
            <Button variant="outline" size="sm" onClick={() => setResults([])}>
              Clear Results
            </Button>
          </div>

          {results.map((result) => (
            <Card key={result.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
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
                      {result.topics.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Hash className="w-3 h-3" />
                          {result.topics.slice(0, 2).join(', ')}
                        </span>
                      )}
                    </div>

                    {/* Performance Metrics */}
                    {result.ai_insights && result.ai_insights.length > 0 && result.ai_insights[0] && (
                      <div className="flex items-center gap-4 text-sm mb-3">
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          {result.ai_insights[0].likes}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" />
                          {result.ai_insights[0].comments}
                        </span>
                        <span className="flex items-center gap-1">
                          <Share className="w-3 h-3" />
                          {result.ai_insights[0].shares}
                        </span>
                        <Badge className={`text-xs ${getPerformanceColor(result.ai_insights[0].performance_category)}`}>
                          {result.ai_insights[0].performance_category} performer
                        </Badge>
                      </div>
                    )}

                    <div className="text-xs text-gray-500 mb-3">
                      <span className="font-medium">Why this matches:</span> {result.relevance_explanation}
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
                      onClick={() => handleActionSelect(result, 'reuse')}
                      className="flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      Reuse
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleActionSelect(result, 'remix')}
                      className="flex items-center gap-1"
                    >
                      <Edit className="w-3 h-3" />
                      Remix
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleActionSelect(result, 'create')}
                      className="flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Create New
                    </Button>
                  </div>
                </div>

                {/* Usage Suggestions */}
                {result.usage_suggestions.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="text-sm text-gray-600 mb-2">💡 Usage ideas:</div>
                    <div className="flex flex-wrap gap-1">
                      {result.usage_suggestions.map((suggestion, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {suggestion}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Action Modal */}
      {selectedResult && actionMode && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={closeModal}
        >
          <Card 
            className="w-full max-w-2xl mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {actionMode === 'reuse' && (
                  <>
                    <Copy className="w-5 h-5" />
                    Reuse Content
                  </>
                )}
                {actionMode === 'remix' && (
                  <>
                    <Edit className="w-5 h-5" />
                    Remix Content
                  </>
                )}
                {actionMode === 'create' && (
                  <>
                    <Plus className="w-5 h-5" />
                    Create New Content
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 p-3 rounded">
                <div className="font-medium mb-1">{selectedResult.title}</div>
                <div className="text-sm text-gray-600">{selectedResult.content}</div>
              </div>

              {actionMode === 'reuse' && (
                <div>
                  <p>This will copy the content exactly as-is to your clipboard.</p>
                </div>
              )}

              {actionMode === 'remix' && (
                <div>
                  <Label>Edit the content:</Label>
                  <Textarea
                    placeholder="Edit the content to match your current needs..."
                    className="min-h-32"
                    value={remixContent}
                    onChange={(e) => setRemixContent(e.target.value)}
                  />
                </div>
              )}

              {actionMode === 'create' && (
                <div>
                  <Label>Use as inspiration for new content:</Label>
                  <Textarea
                    placeholder="Create new content inspired by this post..."
                    className="min-h-32"
                    value={createContent}
                    onChange={(e) => setCreateContent(e.target.value)}
                  />
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={closeModal}>
                  Cancel
                </Button>
                <Button onClick={executeAction}>
                  {actionMode === 'reuse' && 'Copy to Clipboard'}
                  {actionMode === 'remix' && 'Save Remix'}
                  {actionMode === 'create' && 'Create New'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* No Results */}
      {query && !loading && results.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <Search className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="font-medium mb-2">No matches found</h3>
            <p className="text-gray-600 mb-4">
              Try different keywords or adjust your filters
            </p>
            <Button variant="outline" onClick={() => setQuery('')}>
              Clear Search
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 