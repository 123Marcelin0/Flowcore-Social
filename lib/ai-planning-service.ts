import OpenAI from 'openai'
import { supabase } from './supabase'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface PostingPlan {
  day: number
  title: string
  content: string
  platforms: string[]
  hashtags: string[]
  bestTime: string
  category: 'idea' | 'draft' | 'fresh'
  reasoning: string
}

export interface AIAnalysisData {
  posts: any[]
  ideas: any[]
  drafts: any[]
  userProfile?: any
}

export class AIPlanner {
  static async analyzeUserContent(userId: string): Promise<AIAnalysisData> {
    try {
      // Fetch user's existing posts
      const { data: posts } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20)

      // Fetch user's content ideas  
      const { data: ideas } = await supabase
        .from('content_generations')
        .select('*')
        .eq('user_id', userId)
        .eq('type', 'idea')
        .order('created_at', { ascending: false })
        .limit(10)

      // Fetch user's drafts
      const { data: drafts } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'draft')
        .order('created_at', { ascending: false })

      // Fetch user strategy profile for context
      const { data: userProfile } = await supabase
        .from('user_strategy_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      return {
        posts: posts || [],
        ideas: ideas || [],
        drafts: drafts || [],
        userProfile
      }
    } catch (error) {
      console.error('Error analyzing user content:', error)
      return { posts: [], ideas: [], drafts: [] }
    }
  }

  static async generatePostingPlan(analysisData: AIAnalysisData, targetMonth: string): Promise<PostingPlan[]> {
    try {
      const prompt = `
        Als KI-Content-Planer erstelle einen optimalen Posting-Plan für ${targetMonth}.
        
        VERFÜGBARE DATEN:
        - Bisherige Posts: ${analysisData.posts.length} Posts
        - Content-Ideen: ${analysisData.ideas.length} Ideen  
        - Entwürfe: ${analysisData.drafts.length} Entwürfe
        - User-Strategie: ${analysisData.userProfile?.content_pillars || 'Nicht definiert'}
        
        BEISPIEL POSTS:
        ${analysisData.posts.slice(0, 3).map(post => `- ${post.content?.substring(0, 100)}...`).join('\n')}
        
        VERFÜGBARE IDEEN:
        ${analysisData.ideas.slice(0, 5).map(idea => `- ${idea.title}: ${idea.content?.substring(0, 80)}...`).join('\n')}
        
        VERFÜGBARE ENTWÜRFE:
        ${analysisData.drafts.slice(0, 3).map(draft => `- ${draft.content?.substring(0, 100)}...`).join('\n')}

        ERSTELLE EINEN 30-TAGE POSTING-PLAN MIT:
        1. Optimaler Mischung aus bestehenden Ideen, Entwürfen und neuen Vorschlägen
        2. Verschiedenen Content-Formaten (Posts, Reels, Stories)
        3. Strategischen Posting-Zeiten
        4. Relevanten Hashtags
        5. Begründung für jeden Post

        AUSGABE ALS JSON-ARRAY mit diesem Schema:
        {
          "day": 1-31,
          "title": "Post-Titel",
          "content": "Post-Inhalt (max 200 Zeichen)",
          "platforms": ["instagram", "tiktok"],
          "hashtags": ["#hashtag1", "#hashtag2"],
          "bestTime": "14:30",
          "category": "idea|draft|fresh",
          "reasoning": "Warum dieser Post an diesem Tag"
        }
        
        Erstelle 15-20 Posts für den Monat, verteilt über verschiedene Tage.
      `

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 3000,
      })

      const response = completion.choices[0]?.message?.content
      if (!response) throw new Error('No response from OpenAI')

      // Parse the JSON response
      const jsonMatch = response.match(/\[[\s\S]*\]/)
      if (!jsonMatch) throw new Error('No valid JSON found in response')
      
      const postingPlan: PostingPlan[] = JSON.parse(jsonMatch[0])
      
      // Validate and sanitize the data
      return postingPlan.filter(post => 
        post.day >= 1 && post.day <= 31 && 
        post.title && 
        post.content &&
        post.platforms?.length > 0
      )

    } catch (error) {
      console.error('Error generating posting plan:', error)
      // Return fallback plan
      return this.generateFallbackPlan()
    }
  }

  static generateFallbackPlan(): PostingPlan[] {
    return [
      {
        day: 3,
        title: "Motivations-Montag",
        content: "Starte die Woche mit positiver Energie! Was motiviert dich heute? 💪",
        platforms: ["instagram"],
        hashtags: ["#Motivation", "#Montag", "#PositiveVibes"],
        bestTime: "09:00",
        category: "fresh",
        reasoning: "Montag ist perfekt für motivierende Inhalte"
      },
      {
        day: 8,
        title: "Behind the Scenes",
        content: "Ein Blick hinter die Kulissen - so entstehen unsere Inhalte! 🎬",
        platforms: ["instagram", "tiktok"],
        hashtags: ["#BehindTheScenes", "#Content", "#Creative"],
        bestTime: "15:30",
        category: "fresh", 
        reasoning: "BTS-Content funktioniert immer gut für Engagement"
      },
      {
        day: 15,
        title: "Tipps & Tricks",
        content: "3 einfache Tricks, die deinen Tag verbessern werden ✨",
        platforms: ["instagram"],
        hashtags: ["#Tips", "#Lifehacks", "#Productivity"],
        bestTime: "12:00",
        category: "fresh",
        reasoning: "Mitte des Monats sind praktische Tipps sehr gefragt"
      }
    ]
  }

  static async savePostingPlan(userId: string, plan: PostingPlan[], targetMonth: string) {
    try {
      // IMPORTANT: Create posts as DRAFTS, not scheduled posts
      // Users must manually review and approve each post before scheduling
      const planData = plan.map(post => ({
        user_id: userId,
        title: post.title,
        content: post.content,
        platforms: post.platforms,
        hashtags: post.hashtags,
        // Store the suggested date/time but keep as draft
        suggested_date: new Date(`${targetMonth}-${String(post.day).padStart(2, '0')}T${post.bestTime}:00`),
        status: 'draft', // Changed from 'scheduled' to 'draft'
        ai_generated: true,
        category: post.category,
        reasoning: post.reasoning,
        // Add metadata to indicate this is an AI suggestion
        metadata: {
          ai_suggestion: true,
          suggested_day: post.day,
          suggested_time: post.bestTime,
          target_month: targetMonth
        }
      }))

      const { error } = await supabase
        .from('posts')
        .insert(planData)

      if (error) throw error
      
      return true
    } catch (error) {
      console.error('Error saving posting plan:', error)
      return false
    }
  }
} 