import OpenAI from 'openai'
import { chatContextAnalyzer, type UserContext } from './chat-context-analyzer'
import { supabase } from './supabase'

// Initialize OpenAI client lazily
let openai: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not defined. Please set OPENAI_API_KEY in your environment variables.')
    }

    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      dangerouslyAllowBrowser: true,
    })
  }
  return openai
}

export type SocialPlatform = 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'tiktok' | 'youtube' | 'pinterest'

export interface ContentScript {
  title: string
  hook: string
  mainContent: string
  callToAction: string
  duration: string
}

export interface ContentHashtags {
  primary: string[]
  secondary: string[]
  trending: string[]
  niche: string[]
}

export interface ContentCaptions {
  short: string
  medium: string
  long: string
  story: string
}

export interface ImplementationGuide {
  steps: string[]
  tips: string[]
  bestPractices: string[]
  timing: string
}

export interface VisualGuidance {
  composition: string[]
  lighting: string[]
  editing: string[]
  style: string
}

export interface ContentPackageMetadata {
  generatedAt: Date
  contextSummary?: string
  userStyle: string
  topics: string[]
  confidence?: number
  regenerationCount: number
  // Real estate specific metadata
  contentIdea?: {
    title: string
    concept: string
    viralPotential: string
    targetAudience: string
  }
  platformOptimization?: {
    instagram?: string
    tiktok?: string
    facebook?: string
    linkedin?: string
  }
  optimizationTips?: {
    visualElements?: string[]
    trends?: string[]
    engagement?: string[]
    branding?: string[]
  }
}

export interface ContentPackage {
  id: string
  userId: string
  script: ContentScript
  hashtags: ContentHashtags
  captions: ContentCaptions
  implementationGuide: ImplementationGuide
  visualGuidance: VisualGuidance
  metadata: ContentPackageMetadata
}

export interface GenerationOptions {
  prompt?: string
  platform?: SocialPlatform
  contentType?: 'video' | 'image' | 'text' | 'reel' | 'story' | 'carousel'
  tone?: 'professional' | 'casual' | 'friendly' | 'authoritative'
  length?: 'short' | 'medium' | 'long'
}

export class EnhancedContentGenerator {
  private readonly maxRetries = 3
  private readonly retryDelay = process.env.NODE_ENV === 'test' ? 10 : 1000

  /**
   * Generates a comprehensive content package using chat context
   */
  async generateContentPackage(
    userContext: UserContext,
    options: GenerationOptions = {}
  ): Promise<ContentPackage> {
    try {
      const client = getOpenAIClient()
      
      // Build enhanced prompt with user context
      const enhancedPrompt = this.buildEnhancedPrompt(userContext, options)
      
      // Generate content using OpenAI
      const response = await this.callOpenAIWithRetry(client, enhancedPrompt)
      
      // Parse and structure the response
      const contentPackage = this.parseContentResponse(response, userContext, options)
      
      return contentPackage
    } catch (error) {
      console.error('Error generating content package:', error)
      throw new Error(`Failed to generate content package: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Regenerates content while maintaining context consistency
   */
  async regenerateContent(
    previousPackage: ContentPackage,
    userContext: UserContext,
    options: GenerationOptions = {}
  ): Promise<ContentPackage> {
    try {
      // Increment regeneration count
      const regenerationCount = previousPackage.metadata.regenerationCount + 1
      
      // Build regeneration prompt with previous context
      const regenerationPrompt = this.buildRegenerationPrompt(
        previousPackage,
        userContext,
        options,
        regenerationCount
      )
      
      const client = getOpenAIClient()
      const response = await this.callOpenAIWithRetry(client, regenerationPrompt)
      
      // Parse response and maintain consistency
      const newPackage = this.parseContentResponse(response, userContext, options)
      
      // Update metadata to reflect regeneration
      newPackage.metadata.regenerationCount = regenerationCount
      newPackage.metadata.generatedAt = new Date()
      newPackage.id = this.generateId() // New ID for regenerated content
      
      return newPackage
    } catch (error) {
      console.error('Error regenerating content:', error)
      throw new Error(`Failed to regenerate content: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Regenerates specific content components
   */
  async regenerateComponent(
    previousPackage: ContentPackage,
    component: 'script' | 'hashtags' | 'captions' | 'implementationGuide' | 'visualGuidance',
    userContext: UserContext,
    options: GenerationOptions = {}
  ): Promise<ContentPackage> {
    try {
      const componentPrompt = this.buildComponentRegenerationPrompt(
        previousPackage,
        component,
        userContext,
        options
      )
      
      const client = getOpenAIClient()
      const response = await this.callOpenAIWithRetry(client, componentPrompt)
      
      // Parse only the specific component
      const componentData = this.parseComponentResponse(response, component)
      
      // Create updated package with new component
      const updatedPackage = {
        ...previousPackage,
        [component]: componentData,
        metadata: {
          ...previousPackage.metadata,
          regenerationCount: previousPackage.metadata.regenerationCount + 1,
          generatedAt: new Date()
        }
      }
      
      return updatedPackage
    } catch (error) {
      console.error(`Error regenerating ${component}:`, error)
      throw new Error(`Failed to regenerate ${component}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Refines content based on specific feedback
   */
  async refineContent(
    previousPackage: ContentPackage,
    feedback: string,
    userContext: UserContext,
    options: GenerationOptions = {}
  ): Promise<ContentPackage> {
    try {
      const refinementPrompt = this.buildRefinementPrompt(
        previousPackage,
        feedback,
        userContext,
        options
      )
      
      const client = getOpenAIClient()
      const response = await this.callOpenAIWithRetry(client, refinementPrompt)
      
      const refinedPackage = this.parseContentResponse(response, userContext, options)
      
      // Maintain some consistency with original
      refinedPackage.metadata = {
        ...previousPackage.metadata,
        regenerationCount: previousPackage.metadata.regenerationCount + 1,
        generatedAt: new Date()
      }
      refinedPackage.id = this.generateId()
      
      return refinedPackage
    } catch (error) {
      console.error('Error refining content:', error)
      throw new Error(`Failed to refine content: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Optimizes content package for specific platform
   */
  optimizeForPlatform(
    content: ContentPackage,
    platform: SocialPlatform
  ): ContentPackage {
    const optimized = { ...content }
    
    // Platform-specific optimizations
    switch (platform) {
      case 'instagram':
        optimized.hashtags.primary = optimized.hashtags.primary.slice(0, 10)
        optimized.captions.short = this.truncateText(optimized.captions.short, 125)
        optimized.script.duration = '15-60 seconds'
        break
        
      case 'twitter':
        optimized.captions.short = this.truncateText(optimized.captions.short, 280)
        optimized.hashtags.primary = optimized.hashtags.primary.slice(0, 3)
        optimized.script.duration = '30 seconds'
        break
        
      case 'linkedin':
        optimized.captions.long = this.expandForLinkedIn(optimized.captions.long)
        optimized.hashtags.primary = optimized.hashtags.primary.slice(0, 5)
        optimized.script.duration = '1-3 minutes'
        break
        
      case 'tiktok':
        optimized.script.hook = this.optimizeForTikTokHook(optimized.script.hook)
        optimized.script.duration = '15-60 seconds'
        optimized.hashtags.trending = optimized.hashtags.trending.slice(0, 5)
        break
        
      case 'youtube':
        optimized.script.duration = '3-10 minutes'
        optimized.captions.long = this.expandForYouTube(optimized.captions.long)
        break
        
      default:
        // Keep original content for other platforms
        break
    }
    
    return optimized
  }

  /**
   * Generates real estate content based on recent chat conversations
   * Uses optimized German prompt for real estate social media
   */
  async generateRealEstateContentFromChat(
    userContext: UserContext,
    options: GenerationOptions = {}
  ): Promise<ContentPackage> {
    try {
      const client = getOpenAIClient()
      
      // Get recent chat messages for context
      const recentChatText = await this.getRecentChatText(userContext.userId)
      
      // Build the specialized real estate prompt
      const realEstatePrompt = this.buildRealEstatePrompt(recentChatText, userContext)
      
      // Generate content using OpenAI
      const response = await this.callOpenAIWithRetry(client, realEstatePrompt)
      
      // Parse and structure the response
      const contentPackage = this.parseRealEstateResponse(response, userContext, options)
      
      return contentPackage
    } catch (error) {
      console.error('Error generating real estate content:', error)
      throw new Error(`Failed to generate real estate content: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Gets recent chat messages as text for context analysis
   */
  private async getRecentChatText(userId: string): Promise<string> {
    try {
      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('content, role, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) {
        console.error('Error fetching recent chat messages:', error)
        return 'Keine aktuellen Gespräche verfügbar.'
      }

      if (!messages || messages.length === 0) {
        return 'Keine aktuellen Gespräche verfügbar.'
      }

      // Format messages as conversation text
      const conversationText = messages
        .reverse() // Show chronological order
        .map(msg => `${msg.role === 'user' ? 'Nutzer' : 'KI'}: ${msg.content}`)
        .join('\n\n')

      return conversationText
    } catch (error) {
      console.error('Error getting recent chat text:', error)
      return 'Keine aktuellen Gespräche verfügbar.'
    }
  }

  /**
   * Builds the specialized German real estate prompt
   */
  private buildRealEstatePrompt(chatText: string, userContext: UserContext): string {
    const contextSummary = userContext.contextSummary || 'Kein spezifischer Kontext verfügbar.'
    
    return `You are the ultimate social media manager for a successful real estate agent, with a keen eye for viral trends and the ability to craft engaging content. Your expertise lies in analyzing social media conversations, evaluating their potential for virality, and providing actionable recommendations for improvement.

Your task is to evaluate the following transcription of recent text conversations with an AI, along with their context, to determine if the content idea is professional and has the potential to go viral. Here are the details you need to consider: 

Transcription: ${chatText}

Context: ${contextSummary}

As you assess the content idea, please keep in mind the following criteria: originality, alignment with real estate branding, audience engagement potential, and current trends in social media. If you find the concept promising, offer suggestions for optimizing the idea further. Additionally, provide a step-by-step guide for the realtor to transform this idea into their own unique content, including a script or dialogue they can use while creating posts or videos. Make sure to highlight any elements that should be emphasized or modified to enhance the overall appeal and effectiveness of the content. 

Provide everything in German and structure your response as a comprehensive JSON content package:

{
  "contentIdea": {
    "title": "Haupttitel der Content-Idee",
    "concept": "Detaillierte Beschreibung des Content-Konzepts",
    "viralPotential": "Bewertung des Viral-Potentials mit Begründung",
    "targetAudience": "Zielgruppe für diesen Content"
  },
  "script": {
    "title": "Prägnanter Titel für das Video/Post",
    "hook": "Aufmerksamkeitsstarker Einstieg (erste 3 Sekunden)",
    "mainContent": "Hauptinhalt mit wichtigen Punkten und Mehrwert",
    "callToAction": "Klare Handlungsaufforderung für Engagement",
    "duration": "Geschätzte Dauer für den Content"
  },
  "implementationGuide": {
    "preparation": ["Vorbereitungsschritte für die Umsetzung"],
    "filming": ["Schritt-für-Schritt Drehanleitung"],
    "editing": ["Bearbeitungshinweise für maximale Wirkung"],
    "posting": ["Optimale Posting-Strategie und Timing"]
  },
  "optimizationTips": {
    "visualElements": ["Visuelle Elemente die betont werden sollen"],
    "trends": ["Aktuelle Trends die eingebaut werden können"],
    "engagement": ["Strategien zur Steigerung der Interaktion"],
    "branding": ["Wie das Immobilien-Branding optimal integriert wird"]
  },
  "hashtags": {
    "primary": ["8-12 primäre Hashtags für Immobilien"],
    "secondary": ["5-8 unterstützende Hashtags"],
    "trending": ["3-5 aktuell trendende Hashtags"],
    "local": ["3-5 lokale/regionale Hashtags"]
  },
  "platformOptimization": {
    "instagram": "Spezifische Anpassungen für Instagram",
    "tiktok": "Spezifische Anpassungen für TikTok", 
    "facebook": "Spezifische Anpassungen für Facebook",
    "linkedin": "Spezifische Anpassungen für LinkedIn"
  }
}

WICHTIG: 
- Analysiere die Gespräche sorgfältig auf Immobilien-relevante Inhalte
- Bewerte das Viral-Potential ehrlich und realistisch
- Gib konkrete, umsetzbare Ratschläge
- Stelle sicher, dass der Content professionell und markenkonform ist
- Integriere aktuelle Social Media Trends
- Antworte ausschließlich mit gültigem JSON ohne zusätzlichen Text`
  }

  /**
   * Parses the real estate response into a structured content package
   */
  private parseRealEstateResponse(
    response: string,
    userContext: UserContext,
    options: GenerationOptions
  ): ContentPackage {
    try {
      const parsed = JSON.parse(response)
      
      // Transform the real estate response into the standard ContentPackage format
      const contentPackage: ContentPackage = {
        id: this.generateId(),
        userId: userContext.userId,
        script: {
          title: parsed.script?.title || 'Immobilien Content Script',
          hook: parsed.script?.hook || 'Aufmerksamkeitsstarker Einstieg...',
          mainContent: parsed.script?.mainContent || 'Hauptinhalt mit wertvollste Marktkenntnis. Hier sind drei wichtige Trends, die Sie kennen sollten...',
          callToAction: parsed.script?.callToAction || 'Schreiben Sie mir eine DM für ein kostenloses Beratungsgespräch!',
          duration: parsed.script?.duration || '30-60 Sekunden'
        },
        hashtags: {
          primary: parsed.hashtags?.primary || ['#immobilien', '#makler', '#eigenheim'],
          secondary: parsed.hashtags?.secondary || ['#investment', '#hausbau'],
          trending: parsed.hashtags?.trending || ['#trends2024'],
          niche: parsed.hashtags?.local || ['#lokalermarkt']
        },
        captions: {
          short: this.extractShortCaption(parsed),
          medium: this.extractMediumCaption(parsed),
          long: this.extractLongCaption(parsed),
          story: this.extractStoryCaption(parsed)
        },
        implementationGuide: {
          steps: [
            ...(parsed.implementationGuide?.preparation || []),
            ...(parsed.implementationGuide?.filming || []),
            ...(parsed.implementationGuide?.editing || []),
            ...(parsed.implementationGuide?.posting || [])
          ],
          tips: parsed.optimizationTips?.engagement || ['Verwenden Sie Call-to-Actions', 'Antworten Sie schnell auf Kommentare'],
          bestPractices: parsed.optimizationTips?.branding || ['Konsistente Markenfarben verwenden', 'Professionelle Aufnahmequalität'],
          timing: 'Optimale Zeiten: 18-20 Uhr unter der Woche, 10-14 Uhr am Wochenende'
        },
        visualGuidance: {
          composition: parsed.optimizationTips?.visualElements || ['Professionelle Beleuchtung', 'Hochwertige Aufnahmen'],
          lighting: ['Natürliches Licht bevorzugen', 'Goldene Stunde für Außenaufnahmen'],
          editing: parsed.implementationGuide?.editing || ['Kurze Schnitte für hohe Aufmerksamkeit', 'Untertitel hinzufügen'],
          style: 'Professionell, vertrauenswürdig, modern'
        },
        metadata: {
          contentIdea: parsed.contentIdea || {
            title: 'Immobilien Content Idee',
            concept: 'Basierend auf aktuellen Gesprächen',
            viralPotential: 'Mittel bis hoch',
            targetAudience: 'Immobilieninteressierte'
          },
          platformOptimization: parsed.platformOptimization || {},
          optimizationTips: parsed.optimizationTips || {},
          userStyle: userContext.userStyle.tone,
          topics: userContext.topics.slice(0, 5),
          generatedAt: new Date(),
          regenerationCount: 0
        }
      }

      return contentPackage
    } catch (error) {
      console.error('Error parsing real estate response:', error)
      
      // Fallback content package
      return this.createFallbackRealEstatePackage(userContext)
    }
  }

  /**
   * Creates a fallback content package for real estate
   */
  private createFallbackRealEstatePackage(userContext: UserContext): ContentPackage {
    return {
      id: this.generateId(),
      userId: userContext.userId,
      script: {
        title: 'Professioneller Immobilien Content',
        hook: 'Wussten Sie, dass 90% der Käufer online nach Immobilien suchen?',
        mainContent: 'Als Ihr lokaler Immobilienexperte bringe ich Ihnen die besten Objekte und wertvollste Marktkenntnis. Hier sind drei wichtige Trends, die Sie kennen sollten...',
        callToAction: 'Schreiben Sie mir eine DM für ein kostenloses Beratungsgespräch!',
        duration: '45-60 Sekunden'
      },
      hashtags: {
        primary: ['#immobilien', '#makler', '#eigenheim', '#hausbau', '#investment', '#traumhaus', '#immobilienmarkt'],
        secondary: ['#beratung', '#lokalerexperte', '#vertrauen', '#service'],
        trending: ['#immobilientrends2024', '#nachhaltigkeit'],
        niche: ['#erstbezug', '#altbau', '#modernisierung']
      },
      captions: {
        short: 'Ihr Traumhaus wartet! 🏠 Kontaktieren Sie mich für eine persönliche Beratung. #immobilien #makler',
        medium: 'Der Immobilienmarkt entwickelt sich ständig weiter. Als Ihr lokaler Experte helfe ich Ihnen dabei, die besten Entscheidungen zu treffen. 🏠✨ #immobilien #beratung',
        long: 'Die Suche nach der perfekten Immobilie kann überwältigend sein. Mit über 10 Jahren Erfahrung im lokalen Markt und einem Netzwerk von vertrauenswürdigen Partnern, begleite ich Sie von der ersten Besichtigung bis zum Schlüsselübergabe. Lassen Sie uns gemeinsam Ihr Traumzuhause finden! 🏠💫 #immobilien #makler #traumhaus',
        story: 'Wieder ein zufriedener Kunde! 🏠✨ Die Suche nach dem perfekten Zuhause ist eine Reise - und ich begleite Sie gerne dabei. #immobilien #erfolgsgeschichte'
      },
      implementationGuide: {
        steps: [
          'Vorbereitung: Objekt besichtigen und beste Winkel identifizieren',
          'Aufnahme: Natürliches Licht nutzen, goldene Stunde bevorzugen',
          'Content: Kurze, prägnante Botschaften mit Mehrwert',
          'Bearbeitung: Professionelle Schnitte, Untertitel hinzufügen',
          'Posting: Optimale Zeiten beachten, Community engagement'
        ],
        tips: [
          'Authentisch bleiben und persönliche Erfahrungen teilen',
          'Häufige Fragen der Kunden als Content-Ideen nutzen',
          'Erfolgsgeschichten und Testimonials einbauen'
        ],
        bestPractices: [
          'Konsistente Markenfarben und -logos verwenden',
          'Hochwertige Bild- und Videoqualität sicherstellen',
          'Rechtliche Bestimmungen beim Fotografieren beachten'
        ],
        timing: 'Beste Zeiten: 18-20 Uhr unter der Woche, 10-14 Uhr am Wochenende'
      },
      visualGuidance: {
        composition: ['Weitwinkel für Raumgefühl', 'Vertikale Videos für Mobile', 'Führungslinien nutzen'],
        lighting: ['Natürliches Licht bevorzugen', 'Goldene Stunde für Außenaufnahmen', 'Innenbeleuchtung ergänzen'],
        editing: ['Kurze Schnitte für hohe Aufmerksamkeit', 'Untertitel für Accessibility', 'Call-to-Action Overlays'],
        style: 'Professionell, vertrauenswürdig, einladend'
      },
      metadata: {
        contentIdea: {
          title: 'Immobilien Expertise Content',
          concept: 'Vertrauen durch Expertise aufbauen',
          viralPotential: 'Mittel - fokussiert auf Zielgruppe',
          targetAudience: 'Immobilieninteressierte, erste Käufer, Investoren'
        },
        platformOptimization: {
          instagram: 'Hochwertige Bilder, Stories für Behind-the-Scenes',
          tiktok: 'Kurze, trendige Videos mit Immobilien-Hacks',
          facebook: 'Längere Posts mit detaillierten Marktanalysen',
          linkedin: 'Professionelle Markteinschätzungen und Branchen-Insights'
        },
        userStyle: userContext.userStyle.tone,
        topics: ['immobilien', 'beratung', 'markt', 'service'],
        generatedAt: new Date(),
        regenerationCount: 0
      }
    }
  }

  // Helper methods for extracting captions from real estate response
  private extractShortCaption(parsed: any): string {
    const title = parsed.script?.title || 'Immobilien Tipp'
    return `${title} 🏠 Mehr Infos in DM! #immobilien #makler`
  }

  private extractMediumCaption(parsed: any): string {
    const hook = parsed.script?.hook || 'Interessante Immobilien-Insights'
    const cta = parsed.script?.callToAction || 'Kontaktieren Sie mich!'
    return `${hook}\n\n${cta} #immobilien #beratung #lokalerexperte`
  }

  private extractLongCaption(parsed: any): string {
    const concept = parsed.contentIdea?.concept || 'Wertvolle Immobilien-Einblicke basierend auf aktuellen Markttrends'
    const mainContent = parsed.script?.mainContent || 'Professionelle Beratung für Ihre Immobilienentscheidungen'
    const cta = parsed.script?.callToAction || 'Schreiben Sie mir für eine kostenlose Beratung!'
    
    return `${concept}\n\n${mainContent}\n\n${cta}\n\n#immobilien #makler #beratung #lokalerexperte #traumhaus`
  }

  private extractStoryCaption(parsed: any): string {
    return 'Wieder ein zufriedener Kunde! 🏠✨ Die Suche nach dem perfekten Zuhause ist eine Reise - und ich begleite Sie gerne dabei. #immobilien #erfolgsgeschichte'
  }

  /**
   * Builds enhanced prompt with user context
   */
  private buildEnhancedPrompt(
    userContext: UserContext,
    options: GenerationOptions
  ): string {
    const {
      prompt = '',
      platform = 'instagram',
      contentType = 'video',
      tone,
      length = 'medium'
    } = options

    const contextSummary = userContext.contextSummary || 'No specific context available.'
    const userTone = tone || userContext.userStyle.tone
    const topics = userContext.topics.slice(0, 5).join(', ')
    const recentInterests = userContext.recentInterests.slice(0, 3).join(', ')

    return `You are an expert content creator and social media strategist. Create a comprehensive content package based on the following user context and requirements.

USER CONTEXT:
${contextSummary}

USER COMMUNICATION STYLE:
- Tone: ${userTone}
- Vocabulary: ${userContext.userStyle.vocabulary}
- Length preference: ${userContext.userStyle.length}
- Formality: ${userContext.userStyle.formality}

KEY TOPICS: ${topics || 'General content creation'}
RECENT INTERESTS: ${recentInterests || 'Not specified'}

CONTENT REQUIREMENTS:
- Platform: ${platform}
- Content Type: ${contentType}
- Length: ${length}
- User Prompt: ${prompt || 'Create engaging content based on my interests and style'}

Please generate a complete content package in the following JSON format:

{
  "script": {
    "title": "Compelling title that hooks the audience",
    "hook": "Opening line that grabs attention (first 3 seconds)",
    "mainContent": "Main content body with key points and value",
    "callToAction": "Clear call to action for engagement",
    "duration": "Estimated duration for the content"
  },
  "hashtags": {
    "primary": ["5-10 most relevant hashtags"],
    "secondary": ["5-10 supporting hashtags"],
    "trending": ["3-5 trending hashtags if applicable"],
    "niche": ["3-5 niche-specific hashtags"]
  },
  "captions": {
    "short": "Brief caption (under 150 characters)",
    "medium": "Medium caption (150-500 characters)",
    "long": "Detailed caption (500+ characters with storytelling)",
    "story": "Story-style caption for Instagram stories or similar"
  },
  "implementationGuide": {
    "steps": ["Step-by-step creation instructions"],
    "tips": ["Pro tips for better execution"],
    "bestPractices": ["Best practices for the platform"],
    "timing": "Best time to post for maximum engagement"
  },
  "visualGuidance": {
    "composition": ["Visual composition suggestions"],
    "lighting": ["Lighting recommendations"],
    "editing": ["Editing tips and style suggestions"],
    "style": "Overall visual style description"
  }
}

IMPORTANT: 
- Match the user's communication style and tone
- Incorporate their topics and interests naturally
- Make content actionable and valuable
- Ensure platform-specific optimization
- Keep content authentic to the user's voice
- Provide only valid JSON response without additional text`
  }

  /**
   * Builds regeneration prompt maintaining context consistency
   */
  private buildRegenerationPrompt(
    previousPackage: ContentPackage,
    userContext: UserContext,
    options: GenerationOptions,
    regenerationCount: number
  ): string {
    const {
      platform = 'instagram',
      contentType = 'video',
      tone,
      length = 'medium'
    } = options

    const userTone = tone || userContext.userStyle.tone
    const contextSummary = userContext.contextSummary || 'No specific context available.'

    return `You are an expert content creator regenerating content while maintaining consistency with the user's style and context.

PREVIOUS CONTENT ANALYSIS:
Original Title: ${previousPackage.script.title}
Original Hook: ${previousPackage.script.hook}
User Style Tone: ${previousPackage.metadata.userStyle}
Topics Covered: ${previousPackage.metadata.topics.join(', ')}
Regeneration Attempt: ${regenerationCount}

USER CONTEXT (MAINTAIN CONSISTENCY):
${contextSummary}

USER COMMUNICATION STYLE:
- Tone: ${userTone}
- Vocabulary: ${userContext.userStyle.vocabulary}
- Length preference: ${userContext.userStyle.length}
- Formality: ${userContext.userStyle.formality}

REGENERATION REQUIREMENTS:
- Platform: ${platform}
- Content Type: ${contentType}
- Length: ${length}
- Maintain core theme but provide fresh perspective
- Keep user's established tone and style
- Generate alternative approaches while staying true to context

Please regenerate the complete content package with fresh ideas but consistent style:

{
  "script": {
    "title": "New compelling title with fresh angle",
    "hook": "Alternative opening that grabs attention (first 3 seconds)",
    "mainContent": "Fresh main content body with new perspective",
    "callToAction": "Updated call to action for engagement",
    "duration": "Estimated duration for the content"
  },
  "hashtags": {
    "primary": ["array of 8-12 primary hashtags"],
    "secondary": ["array of 5-8 secondary hashtags"],
    "trending": ["array of 3-5 trending hashtags"],
    "niche": ["array of 3-5 niche-specific hashtags"]
  },
  "captions": {
    "short": "Concise caption under 150 characters",
    "medium": "Medium caption 150-300 characters",
    "long": "Detailed caption 300-500 characters",
    "story": "Story-format caption for Instagram Stories"
  },
  "implementationGuide": {
    "steps": ["array of implementation steps"],
    "tips": ["array of helpful tips"],
    "bestPractices": ["array of best practices"],
    "timing": "optimal posting timing advice"
  },
  "visualGuidance": {
    "composition": ["array of composition tips"],
    "lighting": ["array of lighting suggestions"],
    "editing": ["array of editing recommendations"],
    "style": "overall visual style description"
  }
}

Provide ONLY the JSON response without additional text.`
  }

  /**
   * Builds component-specific regeneration prompt
   */
  private buildComponentRegenerationPrompt(
    previousPackage: ContentPackage,
    component: string,
    userContext: UserContext,
    options: GenerationOptions
  ): string {
    const componentData = previousPackage[component as keyof ContentPackage]
    const userTone = options.tone || userContext.userStyle.tone

    const componentPrompts = {
      script: `Regenerate ONLY the script component with a fresh approach while maintaining the user's style.

CURRENT SCRIPT:
Title: ${previousPackage.script.title}
Hook: ${previousPackage.script.hook}
Main Content: ${previousPackage.script.mainContent}
CTA: ${previousPackage.script.callToAction}

USER STYLE: ${userTone}
TOPICS: ${previousPackage.metadata.topics.join(', ')}

Generate a fresh script with new angle but same energy:
{
  "script": {
    "title": "New title with fresh perspective",
    "hook": "Alternative hook with same impact",
    "mainContent": "New main content with different angle",
    "callToAction": "Updated call to action",
    "duration": "Estimated content duration"
  }
}`,

      hashtags: `Regenerate ONLY hashtags with fresh alternatives while maintaining relevance.

CURRENT HASHTAGS:
Primary: ${previousPackage.hashtags.primary.join(', ')}
Secondary: ${previousPackage.hashtags.secondary.join(', ')}

TOPICS: ${previousPackage.metadata.topics.join(', ')}
PLATFORM: ${options.platform || 'instagram'}

Generate fresh hashtag alternatives:
{
  "hashtags": {
    "primary": ["8-12 fresh primary hashtags"],
    "secondary": ["5-8 alternative secondary hashtags"],
    "trending": ["3-5 current trending hashtags"],
    "niche": ["3-5 niche-specific alternatives"]
  }
}`,

      captions: `Regenerate ONLY captions with new approaches while keeping the core message.

CURRENT CAPTIONS:
Short: ${previousPackage.captions.short}
Medium: ${previousPackage.captions.medium}

USER STYLE: ${userTone}
CORE MESSAGE: ${previousPackage.script.title}

Generate alternative caption approaches:
{
  "captions": {
    "short": "Alternative short caption under 150 chars",
    "medium": "Alternative medium caption 150-300 chars",
    "long": "Alternative long caption 300-500 chars",
    "story": "Alternative story-format caption"
  }
}`,

      implementationGuide: `Regenerate ONLY the implementation guide with alternative approaches.

CURRENT GUIDE:
Steps: ${JSON.stringify(previousPackage.implementationGuide.steps)}
Tips: ${JSON.stringify(previousPackage.implementationGuide.tips)}

CONTENT TYPE: ${options.contentType || 'video'}
PLATFORM: ${options.platform || 'instagram'}

Generate alternative implementation approach:
{
  "implementationGuide": {
    "steps": ["alternative implementation steps"],
    "tips": ["different helpful tips"],
    "bestPractices": ["alternative best practices"],
    "timing": "alternative timing advice"
  }
}`,

      visualGuidance: `Regenerate ONLY visual guidance with fresh creative approaches.

CURRENT GUIDANCE:
Style: ${previousPackage.visualGuidance.style}
Composition: ${JSON.stringify(previousPackage.visualGuidance.composition)}

CONTENT TYPE: ${options.contentType || 'video'}
USER STYLE: ${userTone}

Generate alternative visual approach:
{
  "visualGuidance": {
    "composition": ["alternative composition suggestions"],
    "lighting": ["different lighting approaches"],
    "editing": ["alternative editing techniques"],
    "style": "fresh visual style description"
  }
}`
    }

    return `You are an expert content creator. ${componentPrompts[component as keyof typeof componentPrompts] || componentPrompts.script}

Provide ONLY the JSON response without additional text.`
  }

  /**
   * Builds refinement prompt based on user feedback
   */
  private buildRefinementPrompt(
    previousPackage: ContentPackage,
    feedback: string,
    userContext: UserContext,
    options: GenerationOptions
  ): string {
    const userTone = options.tone || userContext.userStyle.tone

    return `You are an expert content creator refining content based on specific user feedback.

CURRENT CONTENT:
Title: ${previousPackage.script.title}
Hook: ${previousPackage.script.hook}
Main Content: ${previousPackage.script.mainContent}
Primary Hashtags: ${previousPackage.hashtags.primary.join(', ')}

USER FEEDBACK TO ADDRESS:
"${feedback}"

USER CONTEXT:
${userContext.contextSummary}

USER STYLE:
- Tone: ${userTone}
- Vocabulary: ${userContext.userStyle.vocabulary}
- Formality: ${userContext.userStyle.formality}

REFINEMENT REQUIREMENTS:
- Address the specific feedback provided
- Maintain user's established style and tone
- Keep core message while improving based on feedback
- Platform: ${options.platform || 'instagram'}
- Content Type: ${options.contentType || 'video'}

Please provide refined content that addresses the feedback:

{
  "script": {
    "title": "Refined title addressing feedback",
    "hook": "Improved hook based on feedback",
    "mainContent": "Enhanced main content incorporating feedback",
    "callToAction": "Optimized call to action",
    "duration": "Estimated duration"
  },
  "hashtags": {
    "primary": ["refined primary hashtags"],
    "secondary": ["improved secondary hashtags"],
    "trending": ["current trending hashtags"],
    "niche": ["refined niche hashtags"]
  },
  "captions": {
    "short": "Refined short caption",
    "medium": "Improved medium caption",
    "long": "Enhanced long caption",
    "story": "Refined story caption"
  },
  "implementationGuide": {
    "steps": ["improved implementation steps"],
    "tips": ["enhanced tips"],
    "bestPractices": ["refined best practices"],
    "timing": "optimized timing advice"
  },
  "visualGuidance": {
    "composition": ["improved composition guidance"],
    "lighting": ["enhanced lighting suggestions"],
    "editing": ["refined editing recommendations"],
    "style": "improved visual style description"
  }
}

Provide ONLY the JSON response without additional text.`
  }

  /**
   * Calls OpenAI API with retry mechanism
   */
  private async callOpenAIWithRetry(
    client: OpenAI,
    prompt: string,
    retryCount = 0
  ): Promise<string> {
    try {
      const response = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert content creator. Always respond with valid JSON only, no additional text or formatting.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000,
        response_format: { type: 'json_object' }
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error('No content received from OpenAI')
      }

      return content
    } catch (error) {
      console.error(`OpenAI API call failed (attempt ${retryCount + 1}):`, error)
      
      if (retryCount < this.maxRetries) {
        await this.delay(this.retryDelay * Math.pow(2, retryCount))
        return this.callOpenAIWithRetry(client, prompt, retryCount + 1)
      }
      
      throw error
    }
  }

  /**
   * Parses OpenAI response into ContentPackage
   */
  private parseContentResponse(
    response: string,
    userContext: UserContext,
    options: GenerationOptions
  ): ContentPackage {
    try {
      const parsed = JSON.parse(response)
      
      // Validate required fields
      this.validateContentStructure(parsed)
      
      const contentPackage: ContentPackage = {
        id: this.generateId(),
        userId: userContext.userId,
        script: {
          title: parsed.script.title || 'Untitled Content',
          hook: parsed.script.hook || '',
          mainContent: parsed.script.mainContent || '',
          callToAction: parsed.script.callToAction || '',
          duration: parsed.script.duration || '30 seconds'
        },
        hashtags: {
          primary: Array.isArray(parsed.hashtags.primary) ? parsed.hashtags.primary : [],
          secondary: Array.isArray(parsed.hashtags.secondary) ? parsed.hashtags.secondary : [],
          trending: Array.isArray(parsed.hashtags.trending) ? parsed.hashtags.trending : [],
          niche: Array.isArray(parsed.hashtags.niche) ? parsed.hashtags.niche : []
        },
        captions: {
          short: parsed.captions.short || '',
          medium: parsed.captions.medium || '',
          long: parsed.captions.long || '',
          story: parsed.captions.story || ''
        },
        implementationGuide: {
          steps: Array.isArray(parsed.implementationGuide.steps) ? parsed.implementationGuide.steps : [],
          tips: Array.isArray(parsed.implementationGuide.tips) ? parsed.implementationGuide.tips : [],
          bestPractices: Array.isArray(parsed.implementationGuide.bestPractices) ? parsed.implementationGuide.bestPractices : [],
          timing: parsed.implementationGuide.timing || 'Optimal posting time varies by audience'
        },
        visualGuidance: {
          composition: Array.isArray(parsed.visualGuidance.composition) ? parsed.visualGuidance.composition : [],
          lighting: Array.isArray(parsed.visualGuidance.lighting) ? parsed.visualGuidance.lighting : [],
          editing: Array.isArray(parsed.visualGuidance.editing) ? parsed.visualGuidance.editing : [],
          style: parsed.visualGuidance.style || 'Clean and professional'
        },
        metadata: {
          generatedAt: new Date(),
          contextSummary: userContext.contextSummary,
          userStyle: userContext.userStyle.tone,
          topics: userContext.topics.slice(0, 10),
          confidence: this.calculateConfidence(userContext, parsed),
          regenerationCount: 0
        }
      }
      
      return contentPackage
    } catch (error) {
      console.error('Error parsing content response:', error)
      throw new Error(`Failed to parse content response: ${error instanceof Error ? error.message : 'Invalid JSON'}`)
    }
  }

  /**
   * Parses component-specific response
   */
  private parseComponentResponse(response: string, component: string): any {
    try {
      const parsed = JSON.parse(response.trim())
      
      // Validate that the response contains the expected component
      if (!parsed[component]) {
        throw new Error(`Response missing ${component} component`)
      }
      
      return parsed[component]
    } catch (error) {
      console.error(`Error parsing ${component} response:`, error)
      throw new Error(`Failed to parse ${component} response: ${error instanceof Error ? error.message : 'Invalid JSON'}`)
    }
  }

  /**
   * Validates content structure
   */
  private validateContentStructure(content: any): void {
    const requiredFields = [
      'script',
      'hashtags',
      'captions',
      'implementationGuide',
      'visualGuidance'
    ]
    
    for (const field of requiredFields) {
      if (!content[field]) {
        throw new Error(`Missing required field: ${field}`)
      }
    }
    
    // Validate script structure
    if (!content.script.title || !content.script.mainContent) {
      throw new Error('Script must have title and mainContent')
    }
    
    // Validate hashtags structure
    if (!Array.isArray(content.hashtags.primary)) {
      throw new Error('Primary hashtags must be an array')
    }
  }

  /**
   * Calculates confidence score based on context quality
   */
  private calculateConfidence(userContext: UserContext, content: any): number {
    let confidence = 0.5 // Base confidence
    
    // Increase confidence based on context quality
    if (userContext.messageCount > 10) confidence += 0.2
    if (userContext.topics.length > 5) confidence += 0.1
    if (userContext.recentInterests.length > 0) confidence += 0.1
    
    // Increase confidence based on content completeness
    if (content.script.hook && content.script.callToAction) confidence += 0.1
    if (content.hashtags.primary.length >= 5) confidence += 0.05
    if (content.implementationGuide.steps.length >= 3) confidence += 0.05
    
    return Math.min(confidence, 1.0)
  }

  // Platform-specific optimization helpers

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength - 3) + '...'
  }

  private expandForLinkedIn(caption: string): string {
    if (caption.length < 500) {
      return caption + '\n\nWhat are your thoughts on this? Share your experience in the comments below!'
    }
    return caption
  }

  private optimizeForTikTokHook(hook: string): string {
    // TikTok hooks should be very immediate and attention-grabbing
    if (!hook.match(/^(POV|Wait|Stop|Don't|You|This|Here's|Watch)/i)) {
      return `Wait... ${hook}`
    }
    return hook
  }

  private expandForYouTube(caption: string): string {
    return `${caption}

🔔 Don't forget to subscribe and hit the notification bell!
👍 Like this video if it was helpful
💬 Let me know your thoughts in the comments
📱 Follow for more content like this

#ContentCreation #SocialMedia #Tips`
  }

  // Utility methods

  private generateId(): string {
    return `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Export singleton instance
export const enhancedContentGenerator = new EnhancedContentGenerator()