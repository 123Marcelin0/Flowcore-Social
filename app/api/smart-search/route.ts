import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/supabase'
import { generateEmbedding } from '@/lib/openaiService'

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
      })
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
      // This requires a join with ai_insights, so we'll handle it after the main query
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
        const embedding = typedPost.embedding as number[]
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
function getMatchReasons(post: any, query: string, filters: any): string[] {
  const reasons = []
  
  if (filters.type && post.type === filters.type) {
    reasons.push(`Matches ${filters.type} content type`)
  }
  
  if (filters.topics && post.topics) {
    const matchingTopics = post.topics.filter((topic: string) => 
      filters.topics.includes(topic)
    )
    if (matchingTopics.length > 0) {
      reasons.push(`Contains topics: ${matchingTopics.join(', ')}`)
    }
  }
  
  if (filters.platform && post.platforms?.includes(filters.platform)) {
    reasons.push(`Published on ${filters.platform}`)
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
function generateUsageSuggestions(post: any, query: string): string[] {
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
function explainRelevance(post: any, query: string, filters: any): string {
  const reasons = []
  
  if (post.similarity_score > 0.8) {
    reasons.push('Very similar content theme')
  } else if (post.similarity_score > 0.6) {
    reasons.push('Similar content concepts')
  } else {
    reasons.push('Related topic match')
  }
  
  if (post.performance_boost > 0) {
    reasons.push('previously performed well')
  }
  
  if (post.match_reasons.length > 0) {
    reasons.push('matches your filters')
  }
  
  const timeAgo = getTimeAgo(post.published_at)
  if (timeAgo) {
    reasons.push(`from ${timeAgo}`)
  }
  
  return reasons.join(', ')
}

// Helper function to get time ago
function getTimeAgo(dateString: string): string {
  if (!dateString) return ''
  
  const now = new Date()
  const date = new Date(dateString)
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffInDays < 7) return `${diffInDays} days ago`
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`
  if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`
  return `${Math.floor(diffInDays / 365)} years ago`
}

// GET /api/smart-search - Get search suggestions and recent searches
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get recent search queries for suggestions
    const { data: recentSearches } = await supabase
      .from('ai_context_logs')
      .select('metadata, created_at')
      .eq('user_id', user.id)
      .eq('source_type', 'smart_search')
      .order('created_at', { ascending: false })
      .limit(10)

    // Get popular topics from user's posts
    const { data: posts } = await supabase
      .from('posts')
      .select('topics, type, platforms')
      .eq('user_id', user.id)
      .not('topics', 'is', null)
      .limit(100)

    // Extract popular topics and types
    const topicCounts: Record<string, number> = {}
    const typeCounts: Record<string, number> = {}
    const platformCounts: Record<string, number> = {}

    posts?.forEach(post => {
      // Count topics
      post.topics?.forEach((topic: string) => {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1
      })
      
      // Count types
      if (post.type) {
        typeCounts[post.type] = (typeCounts[post.type] || 0) + 1
      }
      
      // Count platforms
      post.platforms?.forEach((platform: string) => {
        platformCounts[platform] = (platformCounts[platform] || 0) + 1
      })
    })

    // Get top suggestions
    const topTopics = Object.entries(topicCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 10)
      .map(([topic]) => topic)

    const topTypes = Object.entries(typeCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([type]) => type)

    const topPlatforms = Object.entries(platformCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([platform]) => platform)

    return NextResponse.json({
      success: true,
      data: {
        recent_searches: recentSearches?.map(log => log.metadata?.query).filter(Boolean) || [],
        suggested_topics: topTopics,
        available_types: topTypes,
        available_platforms: topPlatforms,
        search_tips: [
          'Try "motivational reel from last summer"',
          'Search "high performing Instagram posts"',
          'Find "carousel about home buying"',
          'Look for "quotes about real estate"'
        ]
      }
    })

  } catch (error) {
    console.error('Error getting search suggestions:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get suggestions' },
      { status: 500 }
    )
  }
} 