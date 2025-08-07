import { NextRequest, NextResponse } from 'next/server'
import { supabase, getCurrentUser } from '@/lib/supabase'

// POST /api/ai-feedback - Log user feedback for AI suggestions
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
      action_type, // 'caption', 'idea', 'sentence', 'insight', 'search_result'
      action_id, // ID of the AI suggestion/action
      feedback_type, // 'thumbs_up', 'thumbs_down', 'rating', 'detailed'
      rating, // 1-5 scale
      helpful, // boolean
      improvement_notes, // text feedback
      context, // additional context about the feedback
      suggestion_data // the actual suggestion that was given
    } = body

    if (!action_type || !action_id) {
      return NextResponse.json({
        success: false,
        error: 'action_type and action_id are required'
      }, { status: 400 })
    }
    // Log the feedback
    const { data: feedbackRecord, error: feedbackError } = await supabase
      .from('ai_feedback')
      .insert({
        user_id: user.id,
        action_type: action_type,
        action_id: action_id,
        feedback_type: feedback_type || 'thumbs_up_down',
        rating: rating,
        helpful: helpful,
        improvement_notes: improvement_notes,
        context: context,
        suggestion_data: suggestion_data,
        feedback_metadata: {
          timestamp: new Date().toISOString(),
          user_agent: request.headers.get('user-agent'),
          session_context: context
        }
      })
      .select()
      .single()

    if (feedbackError) {
      console.error('Error saving feedback:', feedbackError)
      return NextResponse.json({
        success: false,
        error: 'Failed to save feedback'
      })
    }

    // Update AI suggestions table if this is feedback on a specific suggestion
    // Update AI suggestions table if this is feedback on a specific suggestion
    if (action_type === 'caption' || action_type === 'idea') {
      const { error: updateError } = await supabase
        .from('ai_suggestions')
        .update({
          user_feedback: improvement_notes,
          rating: rating,
          status: helpful ? 'accepted' : 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', action_id)
        .eq('user_id', user.id)

      if (updateError) {
        console.error('Error updating ai_suggestions:', updateError)
        // Continue processing as this is not critical
      }
    }

    const feedbackInsights = await analyzeFeedbackPatterns(user.id, action_type)

    // Log the feedback collection in context logs
    await supabase
      .from('ai_context_logs')
      .insert({
        user_id: user.id,
        source_type: 'feedback_collection',
        source_id: action_id,
        context_summary: `User provided ${feedback_type} feedback for ${action_type}`,
        ai_response: JSON.stringify(feedbackInsights),
        model_used: 'feedback_analyzer',
        metadata: {
          action_type: action_type,
          feedback_type: feedback_type,
          rating: rating,
          helpful: helpful,
          patterns_detected: feedbackInsights.patterns_count
        }
      })

    return NextResponse.json({
      success: true,
      data: {
        feedback_id: feedbackRecord.id,
        message: 'Thank you for your feedback! This helps me learn your preferences.',
        insights: feedbackInsights,
        next_suggestion_improvements: generateImprovementPlan(feedbackInsights, feedback_type, improvement_notes)
      }
    })

  } catch (error) {
    console.error('Error processing feedback:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process feedback' },
      { status: 500 }
    )
  }
}

// GET /api/ai-feedback - Get feedback analytics and patterns
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    const { searchParams } = new URL(request.url)
    const action_type = searchParams.get('action_type') || undefined
    const timeframeDays = parseInt(searchParams.get('timeframe') || '30')

    // Calculate the date threshold
    const dateThreshold = new Date()
    dateThreshold.setDate(dateThreshold.getDate() - timeframeDays)

    // Get recent feedback
    let feedbackQuery = supabase
      .from('ai_feedback')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', dateThreshold.toISOString())
      .order('created_at', { ascending: false })

    if (action_type) {
      feedbackQuery = feedbackQuery.eq('action_type', action_type)
    }

    const { data: feedback } = await feedbackQuery.limit(50)

    // Calculate feedback statistics
    const stats = calculateFeedbackStats(feedback || [])

    // Get user preferences learned from feedback
    const preferences = await extractUserPreferences(user.id, action_type)

    return NextResponse.json({
      success: true,
      data: {
        recent_feedback: feedback || [],
        statistics: stats,
        learned_preferences: preferences,
        improvement_areas: identifyImprovementAreas(feedback || []),
        feedback_trends: analyzeFeedbackTrends(feedback || [])
      }
    })

  } catch (error) {
    console.error('Error getting feedback analytics:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get feedback analytics' },
      { status: 500 }
    )
  }
}

// Helper function to analyze feedback patterns
async function analyzeFeedbackPatterns(userId: string, actionType: string) {
  const { data: feedback } = await supabase
    .from('ai_feedback')
    .select('*')
    .eq('user_id', userId)
    .eq('action_type', actionType)
    .order('created_at', { ascending: false })
    .limit(20)

  if (!feedback || feedback.length === 0) {
    return { patterns_count: 0, insights: [] }
  }
  const helpfulCount = feedback.filter(f => f.helpful === true).length
  const unhelpfulCount = feedback.filter(f => f.helpful === false).length
  const ratingsArray = feedback.filter(f => f.rating)
  const averageRating = ratingsArray.length > 0
    ? ratingsArray.reduce((sum: number, f: any) => sum + f.rating, 0) / ratingsArray.length
    : null

  // Initialize patterns array
  const patterns: any[] = []

  // Analyze improvement notes for common themes
  const improvementThemes = extractImprovementThemes(feedback)

  const totalResponses = helpfulCount + unhelpfulCount
  if (totalResponses > 0) {
    patterns.push({
      type: 'satisfaction_rate',
      value: helpfulCount / totalResponses,
      insight: `User finds ${Math.round((helpfulCount / totalResponses) * 100)}% of ${actionType} suggestions helpful`
    })
  }

  if (averageRating) {
    patterns.push({
      type: 'average_rating',
      value: averageRating,
      insight: `Average rating for ${actionType} suggestions: ${averageRating.toFixed(1)}/5`
    })
  }

  improvementThemes.forEach(theme => {
    patterns.push({
      type: 'improvement_theme',
      value: theme.frequency,
      insight: `Common feedback: "${theme.theme}" (mentioned ${theme.frequency} times)`
    })
  })

  return {
    patterns_count: patterns.length,
    insights: patterns,
    recommendation: generateRecommendation(patterns, actionType)
  }
}

// Helper function to extract improvement themes from feedback
function extractImprovementThemes(feedback: any[]) {
  const themes: Record<string, number> = {}
  
  feedback.forEach(f => {
    if (f.improvement_notes) {
      const notes = f.improvement_notes.toLowerCase()
      
      // Common improvement themes
      if (notes.includes('too long') || notes.includes('shorter')) {
        themes['make_shorter'] = (themes['make_shorter'] || 0) + 1
      }
      if (notes.includes('too short') || notes.includes('longer')) {
        themes['make_longer'] = (themes['make_longer'] || 0) + 1
      }
      if (notes.includes('more personal') || notes.includes('personality')) {
        themes['more_personal'] = (themes['more_personal'] || 0) + 1
      }
      if (notes.includes('more professional') || notes.includes('formal')) {
        themes['more_professional'] = (themes['more_professional'] || 0) + 1
      }
      if (notes.includes('emojis') || notes.includes('emoji')) {
        themes['emoji_preference'] = (themes['emoji_preference'] || 0) + 1
      }
      if (notes.includes('hashtag') || notes.includes('#')) {
        themes['hashtag_feedback'] = (themes['hashtag_feedback'] || 0) + 1
      }
      if (notes.includes('tone') || notes.includes('voice')) {
        themes['tone_adjustment'] = (themes['tone_adjustment'] || 0) + 1
      }
    }
  })

  return Object.entries(themes)
    .map(([theme, frequency]) => ({ theme, frequency }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 5)
}

// Helper function to generate improvement plan
function generateImprovementPlan(insights: any, feedbackType: string, improvementNotes: string) {
  const improvements = []

  if (
    feedbackType === 'thumbs_down' ||
    (feedbackType === 'rating' && insights.insights.some((i: any) => i.type === 'average_rating' && i.value < 3))
  ) {
    improvements.push('I\'ll adjust my suggestions based on your preferences')  }

  if (improvementNotes) {
    if (improvementNotes.toLowerCase().includes('shorter')) {
      improvements.push('Next suggestions will be more concise')
    }
    if (improvementNotes.toLowerCase().includes('personal')) {
      improvements.push('I\'ll make suggestions more personal to your voice')
    }
    if (improvementNotes.toLowerCase().includes('professional')) {
      improvements.push('I\'ll use a more professional tone')
    }
  }

  if (improvements.length === 0) {
    improvements.push('I\'ll continue refining suggestions based on your feedback')
  }

  return improvements
}

// Helper function to generate recommendations
function generateRecommendation(patterns: any[], actionType: string) {
  const satisfactionPattern = patterns.find(p => p.type === 'satisfaction_rate')
  const ratingPattern = patterns.find(p => p.type === 'average_rating')

  if (satisfactionPattern && satisfactionPattern.value < 0.6) {
    return `Focus on improving ${actionType} quality - satisfaction rate is ${Math.round(satisfactionPattern.value * 100)}%`
  }

  if (ratingPattern && ratingPattern.value < 3.5) {
    return `${actionType} suggestions need improvement - average rating is ${ratingPattern.value.toFixed(1)}/5`
  }

  return `${actionType} suggestions are performing well - continue current approach`
}

// Helper function to calculate feedback statistics
function calculateFeedbackStats(feedback: any[]) {
  const total = feedback.length
  if (total === 0) return { total: 0 }

  const helpful = feedback.filter(f => f.helpful === true).length
  const unhelpful = feedback.filter(f => f.helpful === false).length
  const ratings = feedback.filter(f => f.rating).map(f => f.rating)
  
  const byActionType = feedback.reduce((acc, f) => {
    acc[f.action_type] = (acc[f.action_type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return {
    total,
    helpful_percentage: Math.round((helpful / total) * 100),
    unhelpful_percentage: Math.round((unhelpful / total) * 100),
    average_rating: ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : null,
    by_action_type: byActionType,
    recent_trend: feedback.slice(0, 10).filter(f => f.helpful).length >= 7 ? 'improving' : 'stable'
  }
}

// Helper function to extract user preferences
async function extractUserPreferences(userId: string, actionType?: string) {
  let query = supabase
    .from('ai_feedback')
    .select('improvement_notes, rating, helpful, action_type, suggestion_data')
    .eq('user_id', userId)
    .not('improvement_notes', 'is', null)

  if (actionType) {
    query = query.eq('action_type', actionType)
  }

  const { data: feedback } = await query.limit(30)

  if (!feedback || feedback.length === 0) {
    return { preferences: [], confidence: 0 }
  }

  const preferences = []
  const allNotes = feedback.map(f => f.improvement_notes).join(' ').toLowerCase()

  // Extract common preferences
  if (allNotes.includes('short') || allNotes.includes('concise')) {
    preferences.push({ type: 'length', preference: 'shorter', confidence: 0.8 })
  }
  if (allNotes.includes('detail') || allNotes.includes('longer')) {
    preferences.push({ type: 'length', preference: 'more_detailed', confidence: 0.7 })
  }
  if (allNotes.includes('emoji')) {
    const emojiSentiment = allNotes.includes('more emoji') ? 'more_emojis' : 'fewer_emojis'
    preferences.push({ type: 'emojis', preference: emojiSentiment, confidence: 0.9 })
  }
  if (allNotes.includes('personal') || allNotes.includes('voice')) {
    preferences.push({ type: 'tone', preference: 'more_personal', confidence: 0.8 })
  }

  return {
    preferences,
    confidence: feedback.length >= 10 ? 0.9 : feedback.length >= 5 ? 0.7 : 0.5,
    sample_size: feedback.length
  }
}

// Helper function to identify improvement areas
function identifyImprovementAreas(feedback: any[]) {
  const areas = []
  const unhelpfulFeedback = feedback.filter(f => f.helpful === false || (f.rating && f.rating <= 2))
  
  if (unhelpfulFeedback.length > feedback.length * 0.3) {
    areas.push({
      area: 'Overall Quality',
      issue: 'High rate of unhelpful suggestions',
      recommendation: 'Review suggestion generation logic'
    })
  }

  const commonIssues = extractImprovementThemes(unhelpfulFeedback)
  commonIssues.forEach(issue => {
    areas.push({
      area: issue.theme,
      issue: `Frequently mentioned in feedback`,
      recommendation: `Address ${issue.theme} in future suggestions`
    })
  })

  return areas
}

// Helper function to analyze feedback trends
function analyzeFeedbackTrends(feedback: any[]) {
  if (feedback.length < 10) return { trend: 'insufficient_data' }

  const recent = feedback.slice(0, 5)
  const older = feedback.slice(5, 10)

  const recentHelpful =
    recent.length > 0
      ? recent.filter(f => f.helpful).length / recent.length
      : 0
  const olderHelpful =
    older.length > 0
      ? older.filter(f => f.helpful).length / older.length
      : 0
  
  const trend = recentHelpful > olderHelpful + 0.1 ? 'improving' : 
                recentHelpful < olderHelpful - 0.1 ? 'declining' : 'stable'

  return {
    trend,
    recent_satisfaction: Math.round(recentHelpful * 100),
    previous_satisfaction: Math.round(olderHelpful * 100),
    change: Math.round((recentHelpful - olderHelpful) * 100)
  }
} 