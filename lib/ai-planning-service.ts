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
  mediaType?: 'image' | 'video' | 'carousel' | 'text'
  estimatedReach?: number
  estimatedEngagement?: number
  contentPillars?: string[]
}

export interface AIAnalysisData {
  posts: any[]
  ideas: any[]
  drafts: any[]
  userProfile?: any
}

// Mock data for realistic post examples
const MOCK_POST_EXAMPLES = [
  {
    title: "Luxuriöse Penthouse-Besichtigung",
    content: "🏙️ Exklusives Penthouse mit Panoramablick über die Stadt! 360° Rundumblick, moderne Ausstattung und XXL-Terrasse. Wer träumt nicht von einem Zuhause in den Wolken? 🌟\n\n📍 Stadtzentrum, 4 Zimmer, 120m²\n💰 Auf Anfrage\n\n#LuxusImmobilien #Penthouse #Traumwohnung #Stadtzentrum #Immobilien",
    hashtags: ["#LuxusImmobilien", "#Penthouse", "#Traumwohnung", "#Stadtzentrum", "#Immobilien"],
    category: "fresh",
    mediaType: "image",
    estimatedReach: 2500,
    estimatedEngagement: 8.5,
    contentPillars: ["Luxus", "Stadtleben", "Architektur"]
  },
  {
    title: "Erste Eigentumswohnung - Tipps",
    content: "🏠 Der Traum vom Eigenheim wird wahr! Diese 5 Tipps helfen beim ersten Wohnungskauf:\n\n✅ Budget realistisch kalkulieren\n✅ Lage, Lage, Lage beachten\n✅ Nebenkosten nicht vergessen\n✅ Besichtigung bei Tageslicht\n✅ Experten-Beratung einholen\n\nWelcher Tipp hat euch am meisten geholfen? 💭",
    hashtags: ["#Erstkauf", "#Immobilien", "#Wohnungskauf", "#Tipps", "#Eigenheim", "#Investment"],
    category: "fresh",
    mediaType: "carousel",
    estimatedReach: 3200,
    estimatedEngagement: 12.3,
    contentPillars: ["Beratung", "Erstkäufer", "Bildung"]
  },
  {
    title: "Familienhaus mit Garten",
    content: "👨‍👩‍👧‍👦 Das perfekte Familienglück! Dieses charmante Einfamilienhaus bietet alles, was eine Familie braucht:\n\n🌳 Großer Garten für die Kinder\n🚗 Doppelgarage für beide Autos\n🏫 Schule und Kita fußläufig\n🛝 Spielplatz nebenan\n\nHier können Träume Realität werden! Wer möchte mehr erfahren? 🏡",
    hashtags: ["#Familienhaus", "#Garten", "#Kinder", "#Einfamilienhaus", "#Traumhaus"],
    category: "fresh",
    mediaType: "video",
    estimatedReach: 1800,
    estimatedEngagement: 15.7,
    contentPillars: ["Familie", "Lifestyle", "Nachbarschaft"]
  }
]

export class AIPlanner {
  static async analyzeUserContent(userId: string): Promise<AIAnalysisData> {
    try {
      // Fetch user's existing posts
      const { data: posts } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30) // Increased for better analysis

      // Fetch user's content ideas  
      const { data: ideas } = await supabase
        .from('content_ideas')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(15) // Get more ideas

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

      console.log('📊 User Content Analysis:', {
        posts: posts?.length || 0,
        ideas: ideas?.length || 0,
        drafts: drafts?.length || 0,
        hasProfile: !!userProfile
      })

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
      // Enhanced prompt with better context and instructions
      const prompt = `
        Als erfahrener KI-Content-Stratege erstelle einen optimalen Posting-Plan für ${targetMonth}.
        
        VERFÜGBARE DATEN ANALYSE:
        - Erfolgreiche Posts: ${analysisData.posts.length} (letzte Performance-Daten)
        - Content-Ideen: ${analysisData.ideas.length} (ungenutzte Inspirationen)
        - Entwürfe: ${analysisData.drafts.length} (halbfertige Inhalte)
        - Nutzer-Strategie: ${analysisData.userProfile?.content_pillars || 'Immobilien-Fokus'}
        
        ERFOLGREICHE POST-BEISPIELE (zur Orientierung):
        ${analysisData.posts.slice(0, 3).map(post => 
          `- "${post.title || post.content?.substring(0, 60)}..." (${post.likes || 0} Likes)`
        ).join('\n')}
        
        UNGENUTZTE IDEEN (einbauen):
        ${analysisData.ideas.slice(0, 5).map(idea => 
          `- ${idea.title}: ${idea.description?.substring(0, 80)}...`
        ).join('\n')}
        
        ENTWÜRFE (weiterentwickeln):
        ${analysisData.drafts.slice(0, 3).map(draft => 
          `- "${draft.content?.substring(0, 80)}..."`
        ).join('\n')}

        AUFGABE: Erstelle 12-15 strategisch verteilte Posts für den gesamten Monat.

        ANFORDERUNGEN:
        1. Mischung: 40% aus bestehenden Ideen/Entwürfen, 60% neue Inhalte
        2. Content-Mix: Text-Posts, Karussell-Posts, Video-Content, Stories
        3. Immobilien-Fokus: Luxus, Families, Erstkäufer, Investment, Lifestyle
        4. Strategische Posting-Zeiten (9:00, 14:30, 19:00)
        5. Realistische Engagement-Prognosen
        6. Trending Hashtags + Nischen-Hashtags
        7. Content-Säulen: Beratung, Lifestyle, Properties, Behind-the-Scenes

        AUSGABE als JSON-Array mit diesem Schema:
        {
          "day": 1-31,
          "title": "Fesselnder Post-Titel (max 60 Zeichen)",
          "content": "Vollständiger Post-Text mit Emojis (max 300 Zeichen)",
          "platforms": ["instagram", "tiktok", "facebook"],
          "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3"],
          "bestTime": "HH:MM",
          "category": "idea|draft|fresh",
          "reasoning": "Strategische Begründung (max 80 Zeichen)",
          "mediaType": "image|video|carousel|text",
          "estimatedReach": 1000-5000,
          "estimatedEngagement": 5.0-20.0,
          "contentPillars": ["pillar1", "pillar2"]
        }
        
        Fokussiere auf QUALITÄT über Quantität. Jeder Post sollte echten Mehrwert bieten.
      `

      let postingPlan: PostingPlan[] = []

      // Try to use OpenAI if available
      if (process.env.OPENAI_API_KEY) {
        try {
          const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            max_tokens: 4000,
          })

          const response = completion.choices[0]?.message?.content
          if (response) {
            // Parse the JSON response
            const jsonMatch = response.match(/\[[\s\S]*\]/)
            if (jsonMatch) {
              const aiPlan: PostingPlan[] = JSON.parse(jsonMatch[0])
              postingPlan = aiPlan.filter(post => 
                post.day >= 1 && post.day <= 31 && 
                post.title && 
                post.content &&
                post.platforms?.length > 0
              )
            }
          }
        } catch (error) {
          console.warn('OpenAI generation failed, using enhanced fallback:', error)
        }
      }

      // Enhanced fallback with realistic examples
      if (postingPlan.length === 0) {
        postingPlan = this.generateEnhancedFallbackPlan(analysisData, targetMonth)
      }

      console.log(`✅ Generated ${postingPlan.length} posts for ${targetMonth}`)
      return postingPlan

    } catch (error) {
      console.error('Error generating posting plan:', error)
      return this.generateEnhancedFallbackPlan(analysisData, targetMonth)
    }
  }

  static generateEnhancedFallbackPlan(analysisData: AIAnalysisData, targetMonth: string): PostingPlan[] {
    const baseExamples = MOCK_POST_EXAMPLES
    const userContent = [...analysisData.ideas, ...analysisData.drafts]
    
    // Create enhanced plan mixing user content with high-quality examples
    const plan: PostingPlan[] = [
      // Week 1 - Strong Start
      {
        day: 2,
        title: "Montags-Motivation: Traumhaus finden",
        content: "🏡 Neuer Monat, neue Möglichkeiten! Wer sucht noch das perfekte Zuhause? Unser Team hilft dabei, Träume in Realität zu verwandeln. Was ist euer wichtigstes Kriterium beim Hauskauf? 💭\n\n#NeuerMonat #Immobilien #Traumhaus",
        platforms: ["instagram", "facebook"],
        hashtags: ["#Immobilien", "#Traumhaus", "#Beratung", "#NeuerMonat", "#Motivation"],
        bestTime: "09:00",
        category: "fresh",
        reasoning: "Motivierender Start in den Monat mit Community-Engagement",
        mediaType: "image",
        estimatedReach: 2100,
        estimatedEngagement: 9.5,
        contentPillars: ["Motivation", "Community", "Beratung"]
      },
      
      // Use user's content if available
      ...(userContent.length > 0 ? [{
        day: 5,
        title: userContent[0]?.title || "User Content Idee",
        content: userContent[0]?.description?.substring(0, 200) + "...\n\n#UserGenerated #Immobilien #Content" || "Basierend auf Ihrer Content-Idee...",
        platforms: ["instagram"],
        hashtags: ["#Immobilien", "#UserContent", "#Ideas"],
        bestTime: "14:30",
        category: "idea" as const,
        reasoning: "Basiert auf Ihrer gespeicherten Content-Idee",
        mediaType: "text" as const,
        estimatedReach: 1500,
        estimatedEngagement: 7.2,
        contentPillars: ["User Content", "Personal"]
      }] : []),

      // Enhanced examples from mock data
      {
        day: 8,
        title: baseExamples[0].title,
        content: baseExamples[0].content,
        platforms: ["instagram", "tiktok"],
        hashtags: baseExamples[0].hashtags,
        bestTime: "19:00",
        category: baseExamples[0].category as 'fresh',
        reasoning: "Luxus-Content für Abend-Engagement",
        mediaType: baseExamples[0].mediaType as 'image',
        estimatedReach: baseExamples[0].estimatedReach || 2500,
        estimatedEngagement: baseExamples[0].estimatedEngagement || 8.5,
        contentPillars: baseExamples[0].contentPillars || ["Luxus"]
      },

      {
        day: 12,
        title: baseExamples[1].title,
        content: baseExamples[1].content,
        platforms: ["instagram", "facebook"],
        hashtags: baseExamples[1].hashtags,
        bestTime: "14:30",
        category: baseExamples[1].category as 'fresh',
        reasoning: "Bildungs-Content für Mittagszeit",
        mediaType: baseExamples[1].mediaType as 'carousel',
        estimatedReach: baseExamples[1].estimatedReach || 3200,
        estimatedEngagement: baseExamples[1].estimatedEngagement || 12.3,
        contentPillars: baseExamples[1].contentPillars || ["Bildung"]
      },

      {
        day: 16,
        title: "Behind the Scenes: Hausbesichtigung",
        content: "🎬 Heute nehmen wir euch mit zur Hausbesichtigung! Von der ersten Minute bis zum finalen Rundgang - seht selbst, wie eine Immobilien-Beratung abläuft 🏠\n\n#BehindTheScenes #Hausbesichtigung #Immobilien",
        platforms: ["instagram", "tiktok"],
        hashtags: ["#BehindTheScenes", "#Hausbesichtigung", "#Immobilien", "#RealEstate", "#BTS"],
        bestTime: "15:30",
        category: "fresh",
        reasoning: "BTS-Content funktioniert immer gut",
        mediaType: "video",
        estimatedReach: 2800,
        estimatedEngagement: 14.2,
        contentPillars: ["Behind the Scenes", "Authentizität", "Prozess"]
      },

      {
        day: 20,
        title: baseExamples[2].title,
        content: baseExamples[2].content,
        platforms: ["instagram", "facebook"],
        hashtags: baseExamples[2].hashtags,
        bestTime: "18:00",
        category: baseExamples[2].category as 'fresh',
        reasoning: "Familien-Content für Feierabend",
        mediaType: baseExamples[2].mediaType as 'video',
        estimatedReach: baseExamples[2].estimatedReach || 1800,
        estimatedEngagement: baseExamples[2].estimatedEngagement || 15.7,
        contentPillars: baseExamples[2].contentPillars || ["Familie"]
      },

      {
        day: 24,
        title: "Marktanalyse: Aktuelle Trends",
        content: "📈 Immobilienmarkt ${targetMonth}: Diese Trends solltet ihr kennen!\n\n✅ Nachhaltige Immobilien im Fokus\n✅ Home-Office-Räume gefragter denn je\n✅ Energieeffiziente Häuser top\n\nWas sind eure Prioritäten? 🏘️",
        platforms: ["instagram", "linkedin", "facebook"],
        hashtags: ["#Immobilienmarkt", "#Trends", "#Nachhaltigkeit", "#HomeOffice", "#Analyse"],
        bestTime: "12:00",
        category: "fresh",
        reasoning: "Marktanalyse für informierte Käufer",
        mediaType: "carousel",
        estimatedReach: 3500,
        estimatedEngagement: 11.8,
        contentPillars: ["Marktanalyse", "Trends", "Bildung"]
      },

      {
        day: 28,
        title: "Monatsrückblick: Erfolge feiern",
        content: "🎉 Was für ein Monat! Zusammen haben wir wieder Träume wahr gemacht:\n\n🏠 12 glückliche Familien\n🔑 Neue Zuhause übergeben\n❤️ Unzählige Lächeln\n\nAuf was seid ihr diesen Monat stolz? 💪",
        platforms: ["instagram", "facebook"],
        hashtags: ["#Monatsrückblick", "#Erfolge", "#GlücklicheFamilien", "#Dankbar", "#Team"],
        bestTime: "16:00",
        category: "fresh",
        reasoning: "Positiver Monatsabschluss mit Erfolgsgeschichten",
        mediaType: "image",
        estimatedReach: 2200,
        estimatedEngagement: 13.5,
        contentPillars: ["Erfolge", "Community", "Dankbarkeit"]
      }
    ]

    // Add user drafts if available
    if (analysisData.drafts.length > 0) {
      plan.push({
        day: 15,
        title: "Aus den Entwürfen: " + (analysisData.drafts[0]?.title || "Ihr Entwurf"),
        content: (analysisData.drafts[0]?.content?.substring(0, 150) || "Basierend auf Ihrem gespeicherten Entwurf...") + "\n\n#Entwurf #Immobilien",
        platforms: ["instagram"],
        hashtags: ["#Immobilien", "#Content", "#Draft"],
        bestTime: "13:00",
        category: "draft",
        reasoning: "Verwendung Ihres gespeicherten Entwurfs",
        mediaType: "text",
        estimatedReach: 1400,
        estimatedEngagement: 6.8,
        contentPillars: ["User Content", "Persönlich"]
      })
    }

    return plan.slice(0, 8) // Return 8 quality posts
  }

  static async savePostingPlan(userId: string, plan: PostingPlan[], targetMonth: string) {
    try {
      console.log(`💾 Saving ${plan.length} posts for user ${userId} in ${targetMonth}`)

      const planData = plan.map(post => ({
        user_id: userId,
        title: post.title,
        content: post.content,
        platforms: post.platforms,
        tags: post.hashtags, // Map hashtags to tags
        // Store the suggested date/time but keep as draft
        scheduled_date: `${targetMonth}-${String(post.day).padStart(2, '0')}`,
        scheduled_time: post.bestTime,
        status: 'draft',
        ai_generated: true,
        media_type: post.mediaType || 'text',
        // Enhanced metadata with all AI planning data
        metadata: {
          ai_suggestion: true,
          ai_planning: true,
          suggested_day: post.day,
          suggested_time: post.bestTime,
          target_month: targetMonth,
          category: post.category,
          reasoning: post.reasoning,
          estimated_reach: post.estimatedReach,
          estimated_engagement: post.estimatedEngagement,
          content_pillars: post.contentPillars,
          created_by_ai_planner: true,
          plan_version: '2.0'
        }
      }))

      const { data, error } = await supabase
        .from('posts')
        .insert(planData)
        .select()

      if (error) {
        console.error('Supabase insert error:', error)
        throw error
      }
      
      console.log(`✅ Successfully saved ${data?.length || 0} posts`)
      return true
    } catch (error) {
      console.error('Error saving posting plan:', error)
      return false
    }
  }
} 