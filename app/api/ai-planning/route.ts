import { NextRequest, NextResponse } from 'next/server'
import { AIPlanner } from '@/lib/ai-planning-service'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { userId, targetMonth } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    if (!targetMonth) {
      return NextResponse.json(
        { error: 'Target month is required (format: YYYY-MM)' },
        { status: 400 }
      )
    }

    // Step 1: Analyze user's existing content
    console.log('🔍 Analyzing user content...')
    const analysisData = await AIPlanner.analyzeUserContent(userId)

    // Step 2: Generate AI posting plan
    console.log('🤖 Generating AI posting plan...')
    const postingPlan = await AIPlanner.generatePostingPlan(analysisData, targetMonth)

    // Step 3: Save the posting plan to database
    console.log('💾 Saving posting plan...')
    const saved = await AIPlanner.savePostingPlan(userId, postingPlan, targetMonth)

    if (!saved) {
      return NextResponse.json(
        { error: 'Failed to save posting plan' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `AI-Entwürfe für ${targetMonth} erfolgreich erstellt!`,
      data: {
        postsGenerated: postingPlan.length,
        targetMonth,
        analysisData: {
          existingPosts: analysisData.posts.length,
          availableIdeas: analysisData.ideas.length,
          drafts: analysisData.drafts.length
        },
        postingPlan: postingPlan.map(post => ({
          day: post.day,
          title: post.title,
          category: post.category,
          platforms: post.platforms
        })),
        notice: 'Alle Posts wurden als Entwürfe erstellt und müssen manuell geplant werden.'
      }
    })

  } catch (error) {
    console.error('AI Planning Error:', error)
    return NextResponse.json(
      { 
        error: 'Fehler beim Erstellen des AI-Posting-Plans',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const month = searchParams.get('month')

    if (!userId || !month) {
      return NextResponse.json(
        { error: 'User ID and month are required' },
        { status: 400 }
      )
    }

    // Fetch AI-generated posts for the specified month
    const { data: aiPosts, error } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', userId)
      .eq('ai_generated', true)
      .gte('scheduled_for', `${month}-01`)
      .lt('scheduled_for', `${month}-32`)
      .order('scheduled_for', { ascending: true })

    if (error) throw error

    return NextResponse.json({
      success: true,
      posts: aiPosts || [],
      count: aiPosts?.length || 0
    })

  } catch (error) {
    console.error('Error fetching AI posts:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der AI-Posts' },
      { status: 500 }
    )
  }
} 