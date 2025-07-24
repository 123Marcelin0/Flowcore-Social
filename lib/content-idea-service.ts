import { supabase } from './supabase'
import { generateEmbedding } from './openaiService'
import type { ContentIdea } from './supabase'

export interface EnhancedContentIdea {
  id?: string
  title: string
  description: string
  content_type: 'video' | 'image' | 'text' | 'reel' | 'story' | 'carousel'
  platforms: string[]
  tags: string[]
  category: string
  priority: 'low' | 'medium' | 'high'
  status: 'idea' | 'in_progress' | 'completed' | 'archived'
  due_date?: string
  notes?: string
  is_saved: boolean
  metadata: {
    source?: 'ai-brainstorm' | 'content-strategy' | 'trend-exploration' | 'manual'
    hook?: string
    script?: string
    visualTips?: string[]
    targetAudience?: string
    estimatedReach?: number
    estimatedEffort?: 'quick' | 'medium' | 'complex'
    originalData?: any
    [key: string]: any
  }
}

export class ContentIdeaService {
  
  /**
   * Determines content type based on idea content and metadata
   */
  static determineContentType(idea: any): 'video' | 'image' | 'text' | 'reel' | 'story' | 'carousel' {
    // Check explicit type first
    if (idea.type === 'video' || idea.content_type === 'video') return 'video'
    if (idea.type === 'reel' || idea.content_type === 'reel') return 'reel'
    if (idea.type === 'image' || idea.content_type === 'image') return 'image'
    if (idea.type === 'story' || idea.content_type === 'story') return 'story'
    if (idea.type === 'carousel' || idea.content_type === 'carousel') return 'carousel'
    
    // Check content for video/reel indicators
    const content = (idea.content || idea.description || idea.title || '').toLowerCase()
    const script = (idea.script || '').toLowerCase()
    
    const videoKeywords = ['video', 'reel', 'tiktok', 'youtube', 'walk-through', 'walkthrough', 'before/after', 'time-lapse', 'tutorial']
    const reelKeywords = ['reel', 'quick', 'hook', 'trending', 'viral', 'sound', 'music', 'transition']
    
    if (videoKeywords.some(keyword => content.includes(keyword) || script.includes(keyword))) {
      if (reelKeywords.some(keyword => content.includes(keyword) || script.includes(keyword))) {
        return 'reel'
      }
      return 'video'
    }
    
    // Check for image indicators
    const imageKeywords = ['foto', 'photo', 'bild', 'image', 'infografik', 'infographic', 'carousel', 'galerie']
    if (imageKeywords.some(keyword => content.includes(keyword))) {
      return 'image'
    }
    
    // Default to reel for trend-based content, text for others
    if (idea.category === 'trend-reels' || idea.source === 'trend-exploration') {
      return 'reel'
    }
    
    return 'text'
  }

  /**
   * Extracts hashtags from content
   */
  static extractHashtags(idea: any): string[] {
    const hashtags: string[] = []
    
    // Direct hashtags array
    if (idea.hashtags && Array.isArray(idea.hashtags)) {
      hashtags.push(...idea.hashtags)
    }
    
    // Tags array
    if (idea.tags && Array.isArray(idea.tags)) {
      hashtags.push(...idea.tags)
    }
    
    // Extract from script or content
    const textToSearch = [idea.script, idea.content, idea.description].join(' ')
    const hashtagMatches = textToSearch.match(/#[\w\u00C0-\u017F]+/g) || []
    hashtags.push(...hashtagMatches)
    
    // Remove duplicates and clean
    return [...new Set(hashtags)]
      .map(tag => tag.startsWith('#') ? tag.toLowerCase() : `#${tag.toLowerCase()}`)
      .filter(tag => tag.length > 1)
  }

  /**
   * Extracts platforms from content
   */
  static extractPlatforms(idea: any): string[] {
    if (idea.platforms && Array.isArray(idea.platforms)) {
      return idea.platforms
    }
    
    if (idea.platform && Array.isArray(idea.platform)) {
      return idea.platform
    }
    
    // Default platforms based on content type
    const contentType = this.determineContentType(idea)
    switch (contentType) {
      case 'reel':
        return ['instagram', 'tiktok']
      case 'video':
        return ['instagram', 'youtube']
      case 'story':
        return ['instagram', 'facebook']
      default:
        return ['instagram']
    }
  }

  /**
   * Save content idea from brainstorming session
   */
  static async saveBrainstormIdea(brainstormIdea: any, userId: string): Promise<ContentIdea | null> {
    try {
      const enhancedIdea: EnhancedContentIdea = {
        title: brainstormIdea.title,
        description: brainstormIdea.content || brainstormIdea.description,
        content_type: this.determineContentType(brainstormIdea),
        platforms: this.extractPlatforms(brainstormIdea),
        tags: this.extractHashtags(brainstormIdea),
        category: 'ai-brainstorm',
        priority: 'medium',
        status: 'idea',
        is_saved: true,
        metadata: {
          source: 'ai-brainstorm',
          originalData: brainstormIdea,
          estimatedEffort: 'medium'
        }
      }

      return await this.saveContentIdea(enhancedIdea, userId)
    } catch (error) {
      console.error('Error saving brainstorm idea:', error)
      return null
    }
  }

  /**
   * Save content idea from strategy swipe
   */
  static async saveStrategyIdea(strategy: any, userId: string): Promise<ContentIdea | null> {
    try {
      const enhancedIdea: EnhancedContentIdea = {
        title: strategy.title,
        description: strategy.content || strategy.description,
        content_type: this.determineContentType(strategy),
        platforms: this.extractPlatforms(strategy),
        tags: this.extractHashtags(strategy),
        category: 'content-strategy',
        priority: strategy.priority || 'medium',
        status: 'idea',
        is_saved: true,
        metadata: {
          source: 'content-strategy',
          originalData: strategy,
          targetAudience: strategy.targetAudience,
          estimatedEffort: strategy.effort || 'medium'
        }
      }

      return await this.saveContentIdea(enhancedIdea, userId)
    } catch (error) {
      console.error('Error saving strategy idea:', error)
      return null
    }
  }

  /**
   * Save content idea from trend exploration
   */
  static async saveTrendIdea(trend: any, userId: string): Promise<ContentIdea | null> {
    try {
      const enhancedIdea: EnhancedContentIdea = {
        title: trend.title,
        description: trend.description || trend.script || `Trend-basierte Idee inspiriert von ${trend.creator}`,
        content_type: 'reel', // Trends are usually reels
        platforms: ['instagram', 'tiktok'],
        tags: this.extractHashtags(trend),
        category: 'trend-exploration',
        priority: 'medium',
        status: 'idea',
        is_saved: true,
        metadata: {
          source: 'trend-exploration',
          script: trend.script,
          hook: trend.hook,
          originalData: trend,
          creator: trend.creator,
          engagementData: {
            likes: trend.likes_count,
            comments: trend.comments_count,
            views: trend.views_count,
            shares: trend.shares_count
          },
          estimatedEffort: 'quick'
        }
      }

      return await this.saveContentIdea(enhancedIdea, userId)
    } catch (error) {
      console.error('Error saving trend idea:', error)
      return null
    }
  }

  /**
   * Core method to save content idea to database with embedding
   */
  static async saveContentIdea(idea: EnhancedContentIdea, userId: string): Promise<ContentIdea | null> {
    try {
      // Generate embedding for semantic search
      const embeddingText = `${idea.title} ${idea.description} ${idea.tags.join(' ')}`
      const embedding = await generateEmbedding(embeddingText)

      const { data, error } = await supabase
        .from('content_ideas')
        .insert({
          user_id: userId,
          title: idea.title,
          description: idea.description,
          content_type: idea.content_type,
          platforms: idea.platforms,
          tags: idea.tags,
          category: idea.category,
          priority: idea.priority,
          status: idea.status,
          due_date: idea.due_date || null,
          notes: idea.notes || null,
          is_saved: idea.is_saved,
          metadata: idea.metadata,
          embedding: embedding
        })
        .select()
        .single()

      if (error) {
        console.error('Error saving content idea:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error in saveContentIdea:', error)
      return null
    }
  }

  /**
   * Load all saved content ideas for a user
   */
  static async loadUserContentIdeas(userId: string, filters?: {
    category?: string
    is_saved?: boolean
    limit?: number
  }): Promise<ContentIdea[]> {
    try {
      let query = supabase
        .from('content_ideas')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (filters?.category) {
        query = query.eq('category', filters.category)
      }

      if (filters?.is_saved !== undefined) {
        query = query.eq('is_saved', filters.is_saved)
      }

      if (filters?.limit) {
        query = query.limit(filters.limit)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error loading content ideas:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in loadUserContentIdeas:', error)
      return []
    }
  }

  /**
   * Convert database ContentIdea to IdeaCardData format
   */
  static convertToIdeaCardData(dbIdea: ContentIdea): any {
    return {
      id: dbIdea.id,
      title: dbIdea.title,
      description: dbIdea.description,
      category: this.mapCategoryToCardFormat(dbIdea.category),
      source: dbIdea.metadata?.source || 'manual',
      content: {
        hook: dbIdea.metadata?.hook,
        script: dbIdea.metadata?.script,
        hashtags: dbIdea.tags,
        visualTips: dbIdea.metadata?.visualTips || [],
        platforms: dbIdea.platforms,
        targetAudience: dbIdea.metadata?.targetAudience,
        estimatedReach: dbIdea.metadata?.estimatedReach
      },
      priority: dbIdea.priority,
      savedAt: dbIdea.created_at,
      lastModified: dbIdea.updated_at,
      tags: dbIdea.tags,
      isImplemented: dbIdea.status === 'completed',
      estimatedEffort: dbIdea.metadata?.estimatedEffort || 'medium'
    }
  }

  /**
   * Map database category to card format
   */
  static mapCategoryToCardFormat(dbCategory: string | null): 'trend-reels' | 'content-strategies' | 'ai-strategies' {
    switch (dbCategory) {
      case 'trend-exploration':
        return 'trend-reels'
      case 'content-strategy':
        return 'content-strategies'
      case 'ai-brainstorm':
        return 'ai-strategies'
      default:
        return 'content-strategies'
    }
  }

  /**
   * Sync saved ideas with Content Hub
   */
  static async syncWithContentHub(userId: string): Promise<any[]> {
    try {
      const dbIdeas = await this.loadUserContentIdeas(userId, { is_saved: true })
      return dbIdeas.map(idea => this.convertToIdeaCardData(idea))
    } catch (error) {
      console.error('Error syncing with Content Hub:', error)
      return []
    }
  }
} 