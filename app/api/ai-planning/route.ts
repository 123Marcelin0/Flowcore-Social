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
      message: `AI-Entwürfe für ${targetMonth} erfolgreich erstellt! (Mock Preview)`,
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
          platforms: post.platforms,
          estimatedReach: post.estimatedReach,
          estimatedEngagement: post.estimatedEngagement
        })),
        notice: 'Mock-Daten werden angezeigt. Posts sind nicht in der Datenbank gespeichert.'
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

    // Return mock AI-generated posts for preview
    // This avoids the database schema issues with the ai_generated column
    const mockAiPosts = [
      {
        id: `mock-${Date.now()}-1`,
        title: "Luxuriöse Penthouse-Besichtigung",
        content: "🏙️ Exklusives Penthouse mit Panoramablick über die Stadt! 360° Rundumblick, moderne Ausstattung und XXL-Terrasse.\n\n#LuxusImmobilien #Penthouse #Traumwohnung",
        platforms: ["instagram"],
        scheduled_date: `${month}-05`,
        scheduled_time: "10:00",
        status: "draft",
        media_type: "image",
        estimated_reach: 2500,
        estimated_engagement: 8.5
      },
      {
        id: `mock-${Date.now()}-2`,
        title: "Erste Eigentumswohnung - Tipps",
        content: "🏠 Der Traum vom Eigenheim wird wahr! Diese 5 Tipps helfen beim ersten Wohnungskauf:\n\n✅ Budget realistisch kalkulieren\n✅ Lage, Lage, Lage beachten\n\n#Erstkauf #Immobilien #Tipps",
        platforms: ["instagram", "linkedin"],
        scheduled_date: `${month}-10`,
        scheduled_time: "14:00",
        status: "draft",
        media_type: "carousel",
        estimated_reach: 3200,
        estimated_engagement: 12.3
      },
      {
        id: `mock-${Date.now()}-3`,
        title: "Familienhaus mit Garten",
        content: "👨‍👩‍👧‍👦 Das perfekte Familienglück! Dieses charmante Einfamilienhaus bietet alles, was eine Familie braucht:\n\n🌳 Großer Garten für die Kinder\n🚗 Doppelgarage\n\n#Familienhaus #Garten #Traumhaus",
        platforms: ["instagram"],
        scheduled_date: `${month}-15`,
        scheduled_time: "16:30",
        status: "draft",
        media_type: "video",
        estimated_reach: 1800,
        estimated_engagement: 15.7
      }
    ]

    return NextResponse.json({
      success: true,
      posts: mockAiPosts,
      count: mockAiPosts.length,
      note: "Mock data - posts are not actually saved to database"
    })

  } catch (error) {
    console.error('Error fetching AI posts:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der AI-Posts' },
      { status: 500 }
    )
  }
} 