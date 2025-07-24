import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface UserContext {
  userProfile: any;
  recentPosts: any[];
  conversationHistory: any[];
  userPreferences: any;
  performanceMetrics: any;
  trendingTopics: any[];
  interactionPatterns: any[];
  analytics: any;
}

export interface ContextSummary {
  totalPosts: number;
  totalConversations: number;
  avgEngagement: number;
  bestPerformingPosts: number;
  userExpertise: string;
  preferredPlatforms: string[];
  recentTopics: string[];
}

export class ContextService {
  private static instance: ContextService;
  private contextCache: Map<string, { context: UserContext; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): ContextService {
    if (!ContextService.instance) {
      ContextService.instance = new ContextService();
    }
    return ContextService.instance;
  }

  async getUserContext(userId: string): Promise<UserContext> {
    const cacheKey = `user_${userId}`;
    const cached = this.contextCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.context;
    }

    const context = await this.buildUserContext(userId);
    this.contextCache.set(cacheKey, { context, timestamp: Date.now() });
    
    return context;
  }

  private async buildUserContext(userId: string): Promise<UserContext> {
    const [
      userProfile,
      recentPosts,
      conversationHistory,
      userPreferences,
      analytics,
      interactionPatterns,
      trendingTopics
    ] = await Promise.all([
      this.getUserProfile(userId),
      this.getRecentPosts(userId),
      this.getConversationHistory(userId),
      this.getUserPreferences(userId),
      this.getUserAnalytics(userId),
      this.getInteractionPatterns(userId),
      this.getTrendingTopics()
    ]);

    const performanceMetrics = this.calculatePerformanceMetrics(recentPosts);

    return {
      userProfile,
      recentPosts,
      conversationHistory,
      userPreferences,
      performanceMetrics,
      trendingTopics,
      interactionPatterns,
      analytics
    };
  }

  private async getUserProfile(userId: string) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user profile:', error);
    }

    return data || null;
  }

  private async getRecentPosts(userId: string) {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching recent posts:', error);
      return [];
    }

    return data || [];
  }

  private async getConversationHistory(userId: string) {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) {
      console.error('Error fetching conversation history:', error);
      return [];
    }

    return data || [];
  }

  private async getUserPreferences(userId: string) {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user preferences:', error);
    }

    return data || null;
  }

  private async getUserAnalytics(userId: string) {
    const { data, error } = await supabase
      .from('user_analytics')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(7);

    if (error) {
      console.error('Error fetching user analytics:', error);
      return [];
    }

    return data || [];
  }

  private async getInteractionPatterns(userId: string) {
    const { data, error } = await supabase
      .from('user_interaction_patterns')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching interaction patterns:', error);
      return [];
    }

    return data || [];
  }

  private async getTrendingTopics() {
    const { data, error } = await supabase
      .from('trending_topics')
      .select('*')
      .gte('expires_at', new Date().toISOString())
      .order('relevance_score', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching trending topics:', error);
      return [];
    }

    return data || [];
  }

  private calculatePerformanceMetrics(posts: any[]) {
    if (!posts || posts.length === 0) {
      return {
        totalPosts: 0,
        totalLikes: 0,
        totalComments: 0,
        avgEngagement: 0,
        bestPerformingPosts: [],
        recentPerformance: []
      };
    }

    const totalLikes = posts.reduce((sum, p) => sum + (p.likes || 0), 0);
    const totalComments = posts.reduce((sum, p) => sum + (p.comments || 0), 0);
    const avgEngagement = posts.length > 0 ? (totalLikes + totalComments) / posts.length : 0;

    const bestPerformingPosts = posts
      .filter(p => (p.likes || 0) > 5 || (p.comments || 0) > 2)
      .slice(0, 5);

    const recentPerformance = posts.slice(0, 5).map(p => ({
      id: p.id,
      likes: p.likes || 0,
      comments: p.comments || 0,
      content: p.content_text || p.content,
      platform: p.platforms?.[0] || 'unknown',
      status: p.status
    }));

    return {
      totalPosts: posts.length,
      totalLikes,
      totalComments,
      avgEngagement: Math.round(avgEngagement * 100) / 100,
      bestPerformingPosts,
      recentPerformance
    };
  }

  async getContextSummary(userId: string): Promise<ContextSummary> {
    const context = await this.getUserContext(userId);
    
    const recentTopics = this.extractRecentTopics(context.conversationHistory);
    const userExpertise = context.userProfile?.expertise || 'Immobilienmakler';
    const preferredPlatforms = context.userPreferences?.preferred_platforms || ['instagram', 'facebook', 'linkedin'];

    return {
      totalPosts: context.performanceMetrics.totalPosts,
      totalConversations: context.conversationHistory.length,
      avgEngagement: context.performanceMetrics.avgEngagement,
      bestPerformingPosts: context.performanceMetrics.bestPerformingPosts.length,
      userExpertise,
      preferredPlatforms,
      recentTopics
    };
  }

  private extractRecentTopics(conversationHistory: any[]): string[] {
    const topics = new Set<string>();
    const recentMessages = conversationHistory.slice(0, 10);
    
    const topicKeywords = {
      'immobilien': ['immobilie', 'haus', 'wohnung', 'makler', 'verkauf', 'kauf'],
      'content': ['post', 'content', 'idee', 'text', 'bild', 'video'],
      'marketing': ['marketing', 'werbung', 'kampagne', 'zielgruppe'],
      'hashtags': ['hashtag', 'tag', 'trend', 'viral'],
      'performance': ['performance', 'engagement', 'likes', 'kommentare'],
      'finanzierung': ['finanzierung', 'hypothek', 'kredit', 'investment']
    };

    recentMessages.forEach(msg => {
      const content = msg.content.toLowerCase();
      Object.entries(topicKeywords).forEach(([topic, keywords]) => {
        if (keywords.some(keyword => content.includes(keyword))) {
          topics.add(topic);
        }
      });
    });

    return Array.from(topics);
  }

  async updateUserInteractionPattern(userId: string, patternType: string, patternData: any) {
    const { error } = await supabase
      .from('user_interaction_patterns')
      .insert({
        user_id: userId,
        pattern_type: patternType,
        pattern_data: patternData
      });

    if (error) {
      console.error('Error updating interaction pattern:', error);
    }
  }

  async updateUserAnalytics(userId: string, analyticsData: any) {
    const { error } = await supabase
      .from('user_analytics')
      .upsert({
        user_id: userId,
        ...analyticsData
      });

    if (error) {
      console.error('Error updating user analytics:', error);
    }
  }

  clearCache(userId?: string) {
    if (userId) {
      this.contextCache.delete(`user_${userId}`);
    } else {
      this.contextCache.clear();
    }
  }
}

export const contextService = ContextService.getInstance(); 