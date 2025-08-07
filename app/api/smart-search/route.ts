import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/supabase'
import { generateEmbedding } from '@/lib/openaiService'

// Interface for AI insights data
interface AIInsight {
  likes: number
  comments: number
  shares: number
  reach: number
  impressions: number
  engagement_rate: number
  performance_category: 'high' | 'medium' | 'low' | null
}

// Interface for search filters
interface SearchFilters {
  type?: string
  platform?: string
  status?: string
  topics?: string[]
  dateFrom?: string
  dateTo?: string
  performanceCategory?: string
}

// Interface for the post object used in getMatchReasons
interface SearchPost {
  id: string
  title: string | null
  content: string
  type?: string
  topics?: string[] // Note: This might be 'tags' in the actual schema
  platforms?: string[]
  status?: string
  published_at?: string | null
  ai_insights?: AIInsight[]
  similarity_score?: number
  performance_boost?: number
  match_reasons?: string[]
}

// POST /api/smart-search - Hybrid search with filters + vector similarity
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { 
      query, 
      filters = {}, 
      limit = 5,
      includeInsights = true 
    } = body

    if (!query || query.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Search query is required'
      }, { status: 400 })
    }

    console.log('🔍 Smart search request:', { query, filters })

    // Generate embedding for the search query
    const queryEmbedding = await generateEmbedding(query)
    
    // Build base query with user filter
    let searchQuery = supabase
      .from('posts')
      .select(`
        id,
        title,
        content,
        platforms,
        type,
        status,
        published_at,
        topics,
        metadata,
        media_urls,
        embedding,
        ${includeInsights ? `
          ai_insights (
            likes,
            comments,
            shares,
            reach,
            impressions,
            engagement_rate,
            performance_category
          )
        ` : ''}
      `)
      .eq('user_id', user.id)
      .not('embedding', 'is', null) // Only posts with embeddings

    // Apply traditional filters
    if (filters.type) {
      searchQuery = searchQuery.eq('type', filters.type)
    }
    
    if (filters.platform) {
      searchQuery = searchQuery.contains('platforms', [filters.platform])
    }
    
    if (filters.status) {
      searchQuery = searchQuery.eq('status', filters.status)
    }
    
    if (filters.topics && filters.topics.length > 0) {
      searchQuery = searchQuery.overlaps('topics', filters.topics)
    }
    
    // Date range filters
    if (filters.dateFrom) {
      searchQuery = searchQuery.gte('published_at', filters.dateFrom)
    }
    
    if (filters.dateTo) {
      searchQuery = searchQuery.lte('published_at', filters.dateTo)
    }
    
    // Performance filters
    if (filters.performanceCategory) {
      // Filter by performance category from ai_insights table
      searchQuery = searchQuery.eq('ai_insights.performance_category', filters.performanceCategory)
    }

    // Execute the filtered query first
    const { data: filteredPosts, error: searchError } = await searchQuery
      .order('published_at', { ascending: false })
      .limit(50) // Get more candidates for similarity scoring

    if (searchError) {
      console.error('Database search error:', searchError)
      return NextResponse.json({
        success: false,
        error: 'Search failed'
      })
    }

    if (!filteredPosts || filteredPosts.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          results: [],
          query: query,
          filters: filters,
          total_found: 0,
          search_type: 'hybrid_no_results'
        }
      })
    }

    // Calculate similarity scores using the embeddings
    const scoredResults = []
    
    for (const post of filteredPosts) {
      // Type assertion to handle Supabase query result typing
      const typedPost = post as any
      
      if (!typedPost.embedding || !Array.isArray(typedPost.embedding)) continue
      
      try {
        // Calculate cosine similarity
        const embedding = typedPost.embedding!
        const similarity = calculateCosineSimilarity(queryEmbedding, embedding)
        
        // Apply performance boost if available
        let performanceBoost = 0
        if (typedPost.ai_insights && typedPost.ai_insights.length > 0) {
          const latestInsights = typedPost.ai_insights[0]
          if (latestInsights.performance_category === 'high') {
            performanceBoost = 0.1
          } else if (latestInsights.performance_category === 'medium') {
            performanceBoost = 0.05
          }
        }
        
        const finalScore = similarity + performanceBoost
        
        scoredResults.push({
          ...typedPost,
          similarity_score: similarity,
          performance_boost: performanceBoost,
          final_score: finalScore,
          match_reasons: getMatchReasons(typedPost, query, filters)
        })
      } catch (error) {
        console.error(`Error calculating similarity for post ${typedPost.id}:`, error)
      }
    }

    // Sort by final score and take top results
    const topResults = scoredResults
      .sort((a, b) => b.final_score - a.final_score)
      .slice(0, limit)

    // Add usage suggestions for each result
    const enrichedResults = topResults.map(result => ({
      ...result,
      usage_suggestions: generateUsageSuggestions(result, query),
      relevance_explanation: explainRelevance(result, query, filters)
    }))

    // Log the search for analytics
    try {
      await supabase
        .from('ai_context_logs')
        .insert({
          user_id: user.id,
          source_type: 'smart_search',
          source_id: null,
          context_summary: `Smart search: "${query}" with filters`,
          ai_response: JSON.stringify({
            results_count: topResults.length,
            top_score: topResults[0]?.final_score || 0,
            search_filters: filters
          }),
          model_used: 'vector_search',
          metadata: {
            query: query,
            filters: filters,
            results_found: topResults.length
          }
        })
    } catch (logError) {
      console.error('Failed to log search analytics:', logError)
      // Don't throw - continue with returning results
    }

    return NextResponse.json({
      success: true,
      data: {
        results: enrichedResults,
        query: query,
        filters: filters,
        total_found: topResults.length,
        search_type: 'hybrid_vector',
        search_stats: {
          candidates_filtered: filteredPosts.length,
          vector_matches: scoredResults.length,
          top_similarity: topResults[0]?.similarity_score || 0
        }
      }
    })

  } catch (error) {
    console.error('Smart search error:', error)
    return NextResponse.json(
      { success: false, error: 'Search failed' },
      { status: 500 }
    )
  }
}

// Helper function to calculate cosine similarity
function calculateCosineSimilarity(embedding1: number[], embedding2: number[]): number {
  if (embedding1.length !== embedding2.length) {
    throw new Error('Embeddings must have the same length')
  }

  let dotProduct = 0
  let norm1 = 0
  let norm2 = 0

  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i]
    norm1 += embedding1[i] * embedding1[i]
    norm2 += embedding2[i] * embedding2[i]
  }

  if (norm1 === 0 || norm2 === 0) {
    return 0
  }

  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2))
}

// Helper function to generate match reasons
function getMatchReasons(post: SearchPost, query: string, filters: SearchFilters): string[] {
  const reasons = []
  
  if (filters.type && post.type === filters.type) {
    reasons.push(`Matches ${filters.type} content type`)
  }
  
  if (filters.topics && post.topics) {
    const matchingTopics = post.topics.filter((topic: string) => 
      filters.topics!.includes(topic)
    )
    if (matchingTopics.length > 0) {
      reasons.push(`Contains topics: ${matchingTopics.join(', ')}`)
    }
  }
  
  if (filters.platform && post.platforms?.includes(filters.platform)) {
    reasons.push(`Published on ${filters.platform}`)
  }
  
  if (filters.performanceCategory && post.ai_insights?.[0]?.performance_category === filters.performanceCategory) {
    reasons.push(`${filters.performanceCategory} performing content`)
  }
  
  // Check for keyword matches in content
  const queryWords = query.toLowerCase().split(' ')
  const contentWords = (post.content || '').toLowerCase()
  const titleWords = (post.title || '').toLowerCase()
  
  const matchingKeywords = queryWords.filter(word => 
    contentWords.includes(word) || titleWords.includes(word)
  )
  
  if (matchingKeywords.length > 0) {
    reasons.push(`Contains keywords: ${matchingKeywords.join(', ')}`)
  }
  
  return reasons
}

// Helper function to generate usage suggestions
function generateUsageSuggestions(post: SearchPost, query: string): string[] {
  const suggestions = []
  
  // Always offer basic options
  suggestions.push('🔄 Reuse exactly as-is')
  suggestions.push('✏️ Remix with your style')
  suggestions.push('🎯 Adapt for different platform')
  
  // Add specific suggestions based on content type
  if (post.type === 'reel' || post.type === 'video') {
    suggestions.push('📱 Convert to carousel post')
    suggestions.push('📝 Extract key quotes')
  } else if (post.type === 'carousel') {
    suggestions.push('🎬 Turn into video script')
    suggestions.push('📄 Create single image post')
  }
  
  // Performance-based suggestions
  if (post.ai_insights?.[0]?.performance_category === 'high') {
    suggestions.push('🔥 High performer - reuse strategy')
    suggestions.push('📈 Analyze what made this work')
  }
  
  return suggestions.slice(0, 5) // Limit to 5 suggestions
}

// Helper function to explain relevance
function explainRelevance(post: SearchPost, query: string, filters: SearchFilters): string {
  const reasons = []
  
  if (post.similarity_score && post.similarity_score > 0.8) {
    reasons.push('Very similar content theme')
  } else if (post.similarity_score && post.similarity_score > 0.6) {
    reasons.push('Similar content concepts')
  } else {
    reasons.push('Related topic match')
  }
  
  if (post.performance_boost && post.performance_boost > 0) {
    reasons.push('previously performed well')
  }
  
  if (post.match_reasons && post.match_reasons.length > 0) {
    reasons.push('matches your filters')
  }
  
  const timeAgo = post.published_at ? getTimeAgo(post.published_at) : null
  if (timeAgo) {
    reasons.push(`published ${timeAgo}`)
  }
  
  return reasons.join(', ')
}

// Helper function to get time ago string
function getTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
  
  if (diffInDays === 0) {
    return 'today'
  } else if (diffInDays === 1) {
    return 'yesterday'
  } else if (diffInDays < 7) {
    return `${diffInDays} days ago`
  } else if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7)
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`
  } else if (diffInDays < 365) {
    const months = Math.floor(diffInDays / 30)
    return `${months} month${months > 1 ? 's' : ''} ago`
  } else {
    const years = Math.floor(diffInDays / 365)
    return `${years} year${years > 1 ? 's' : ''} ago`
  }
}

// GET endpoint for recent searches and suggestions
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get recent searches from ai_context_logs
    const { data: recentSearches } = await supabase
      .from('ai_context_logs')
      .select('metadata')
      .eq('user_id', user.id)
      .eq('source_type', 'smart_search')
      .order('created_at', { ascending: false })
      .limit(10)

    // Get performance categories from ai_insights
    const { data: performanceCategories } = await supabase
      .from('ai_insights')
      .select('performance_category')
      .eq('user_id', user.id)
      .not('performance_category', 'is', null)

    const uniqueCategories = [...new Set(
      performanceCategories?.map(insight => insight.performance_category) || []
    )]

    return NextResponse.json({
      success: true,
      data: {
        recent_searches: recentSearches
          ?.map(log => log.metadata?.query)
          .filter((query): query is string => Boolean(query)) || [],
        performance_categories: uniqueCategories,
        search_suggestions: [
          'high performing content',
          'viral posts',
          'engagement strategies',
          'trending topics',
          'best practices'
        ]
      }
    })

  } catch (error) {
    console.error('GET smart search error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get search data' },
      { status: 500 }
    )
  }
} 