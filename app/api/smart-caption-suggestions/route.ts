import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/supabase'
import OpenAI from 'openai'

// Types
interface CaptionSuggestion {
  strategy: string
  caption: string
  hashtags: string
  confidence_score: number
  reasoning: string
}

interface SavedCaptionSuggestion extends CaptionSuggestion {
  id: string
}

// OpenAI client
function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not defined')
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
}

// Smart Caption Suggestion System
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
    const { postContent, mediaType, platform = 'instagram', context = '' } = body

    if (!postContent) {
      return NextResponse.json(
        { success: false, error: 'Post content is required' },
        { status: 400 }
      )
    }

    // 1. Fetch user's brand voice and preferences
    const userProfile = await fetchUserProfile(user.id)
    
    // 2. Analyze past performance to identify what works
    const performanceInsights = await analyzeUserPerformance(user.id)
    
    // 3. Generate 3 caption options with different strategies
    const suggestions = await generateCaptionSuggestions({
      postContent,
      mediaType,
      platform,
      context,
      userProfile,
      performanceInsights
    })

    // 4. Store suggestions in database for learning
    const savedSuggestions = await storeSuggestions(user.id, suggestions, {
      postContent,
      mediaType,
      platform,
      context
    })

    return NextResponse.json({
      success: true,
      data: {
        suggestions: savedSuggestions,
        userProfile: {
          brand_tone: userProfile.brand_tone,
          target_audience: userProfile.target_audience,
          goals: userProfile.goals
        },
        performanceInsights
      }
    })

  } catch (error) {
    console.error('Smart caption generation failed:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate caption suggestions' },
      { status: 500 }
    )
  }
}

// Rate a suggestion (for learning)
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { suggestionId, rating, feedback, selectedOption } = body

    // Store user feedback in ai_suggestions table
    const { data, error } = await supabase
      .from('ai_suggestions')
      .update({
        status: selectedOption ? 'accepted' : 'rejected',
        user_feedback: feedback,
        metadata: {
          rating: rating, // 1-5 scale
          selected_option: selectedOption,
          feedback_timestamp: new Date().toISOString()
        }
      })
      .eq('id', suggestionId)
      .eq('user_id', user.id)
      .select()

    if (error) {
      console.error('Error updating suggestion feedback:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to save feedback' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Feedback saved successfully',
      data
    })

  } catch (error) {
    console.error('Error saving suggestion feedback:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save feedback' },
      { status: 500 }
    )
  }
}

// Helper Functions

async function fetchUserProfile(userId: string) {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('preferences')
    .eq('id', userId)
    .single()

  // Return structured profile or defaults
  return profile?.preferences || {
    brand_tone: 'professional_trustworthy_humorous',
    target_audience: ['general'],
    goals: ['engagement'],
    platforms: ['instagram', 'facebook'],
    industry: 'general'
  }
}

async function analyzeUserPerformance(userId: string) {
  // Get user's best performing posts for learning
  const { data: topPosts } = await supabase
    .from('posts')
    .select('content, likes, comments, shares, reach, impressions, tags, created_at')
    .eq('user_id', userId)
    .eq('status', 'published')
    .order('likes', { ascending: false })
    .limit(10)

  if (!topPosts || topPosts.length === 0) {
    return {
      avgLikes: 0,
      avgComments: 0,
      avgShares: 0,
      avgEngagement: 0,
      topHashtags: [],
      bestContentTypes: [],
      insights: 'No published posts found. Starting with general best practices.'
    }
  }

  // Analyze patterns
  const avgLikes = Math.round(topPosts.reduce((sum, post) => sum + post.likes, 0) / topPosts.length)
  const avgComments = Math.round(topPosts.reduce((sum, post) => sum + post.comments, 0) / topPosts.length)
  const avgShares = Math.round(topPosts.reduce((sum, post) => sum + post.shares, 0) / topPosts.length)
  
  // Extract successful hashtags
  const allTags = topPosts.flatMap(post => post.tags || [])
  const tagCounts = allTags.reduce((acc, tag) => {
    acc[tag] = (acc[tag] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  const topHashtags = Object.entries(tagCounts)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 5)
    .map(([tag]) => tag)

  return {
    avgLikes,
    avgComments,
    avgShares,
    avgEngagement: Math.round((avgLikes + avgComments + avgShares) / 3),
    topHashtags,
    bestContentTypes: ['educational', 'behind_the_scenes', 'testimonial'], // Could be derived from content analysis
    insights: `Your posts average ${avgLikes} likes, ${avgComments} comments. Top hashtags: ${topHashtags.slice(0, 3).join(', ')}`
  }
}

async function generateCaptionSuggestions({
  postContent,
  mediaType,
  platform,
  context,
  userProfile,
  performanceInsights
}: any) {
  const client = getOpenAIClient()
  
  const prompt = `You are an expert social media content creator specializing in ${userProfile.industry || 'general'} content.

GENERATE 3 CAPTION OPTIONS for this post:

POST DETAILS:
- Content: ${postContent}
- Media Type: ${mediaType}
- Platform: ${platform}
- Context: ${context}

USER BRAND PROFILE:
- Tone: ${userProfile.brand_tone}
- Target Audience: ${userProfile.target_audience?.join(', ')}
- Goals: ${userProfile.goals?.join(', ')}
- Industry: ${userProfile.industry}

PERFORMANCE INSIGHTS:
- Average Engagement: ${performanceInsights.avgEngagement}
- Successful Hashtags: ${performanceInsights.topHashtags?.join(', ')}
- Insights: ${performanceInsights.insights}

Generate 3 distinct caption options:

OPTION 1 - BRAND VOICE MATCH:
- Perfectly matches the user's established brand tone
- Targets their specific audience segments  
- Professional and trustworthy with appropriate humor level
- 150-200 characters for ${platform}

OPTION 2 - ENGAGEMENT OPTIMIZED:
- Uses proven engagement tactics (questions, CTAs, emojis)
- Incorporates successful hashtags from user's history
- Strong hook in first line
- Encourages comments and shares

OPTION 3 - TREND-FOCUSED EXPERIMENTAL:
- Incorporates current social media trends
- Tests new content angles
- Uses trending hashtags relevant to industry
- Slightly different tone to test audience response

Format each option as:
OPTION 1:
[Caption text]
#hashtag1 #hashtag2 #hashtag3

OPTION 2:
[Caption text]  
#hashtag1 #hashtag2 #hashtag3

OPTION 3:
[Caption text]
#hashtag1 #hashtag2 #hashtag3

Remember: This is ${userProfile.industry} content for ${userProfile.target_audience?.join(' and ')} audience.`

  const response = await client.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1500,
    temperature: 0.7
  })

  const content = response.choices[0]?.message?.content || ''
  
  // Parse the response into structured options
  const options = parseGeneratedOptions(content)
  
  return options
}

function parseGeneratedOptions(content: string): CaptionSuggestion[] {
  const options: CaptionSuggestion[] = []
  const sections = content.split(/OPTION \d+:/).filter(section => section.trim())
  
  const strategyNames = [
    'Brand Voice Match',
    'Engagement Optimized', 
    'Trend-Focused Experimental'
  ]
  
  sections.forEach((section, index) => {
    const lines = section.trim().split('\n').filter(line => line.trim())
    const caption = lines.filter(line => !line.startsWith('#')).join(' ').trim()
    const hashtags = lines.filter(line => line.startsWith('#')).join(' ').trim()
    
    if (caption) {
      options.push({
        strategy: strategyNames[index] || `Option ${index + 1}`,
        caption,
        hashtags,
        confidence_score: 0.8 - (index * 0.1), // Higher confidence for first option
        reasoning: getStrategyReasoning(strategyNames[index] || `Option ${index + 1}`)
      })
    }
  })
  
  return options
}

function getStrategyReasoning(strategy: string): string {
  const reasoningMap: Record<string, string> = {
    'Brand Voice Match': 'Crafted to perfectly match your established professional yet personable tone for real estate.',
    'Engagement Optimized': 'Uses proven tactics like questions and CTAs to maximize likes, comments, and shares.',
    'Trend-Focused Experimental': 'Tests new approaches with current trends to potentially reach new audience segments.'
  }
  
  return reasoningMap[strategy] || 'AI-generated suggestion based on best practices.'
}

async function storeSuggestions(userId: string, suggestions: CaptionSuggestion[], metadata: any): Promise<SavedCaptionSuggestion[]> {
  const savedSuggestions: SavedCaptionSuggestion[] = []
  
  for (const suggestion of suggestions) {
    const { data, error } = await supabase
      .from('ai_suggestions')
      .insert({
        user_id: userId,
        suggestion_type: 'caption',
        context_type: 'post_draft',
        suggestion_text: `${suggestion.caption}\n\n${suggestion.hashtags}`,
        confidence_score: suggestion.confidence_score,
        metadata: {
          strategy: suggestion.strategy,
          reasoning: suggestion.reasoning,
          post_context: metadata,
          generated_at: new Date().toISOString()
        }
      })
      .select()
      .single()
    
    if (!error && data) {
      savedSuggestions.push({
        id: data.id,
        ...suggestion
      })
    }
  }
  
  return savedSuggestions
} 