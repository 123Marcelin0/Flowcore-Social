import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateEmbedding } from '@/lib/openaiService';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';

// Initialize Supabase client for API routes (backend)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, 
});

// Cache for embeddings to avoid regenerating same embeddings
const embeddingCache = new Map<string, number[]>();

// Helper function to verify authentication
async function verifyAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authenticated: false, user: null, error: 'Missing or invalid authorization header' };
  }

  const token = authHeader.replace('Bearer ', '');
  
  try {
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    const { data: { user }, error } = await anonClient.auth.getUser(token);
    
    if (error || !user) {
      console.error('Auth verification error:', error?.message);
      return { authenticated: false, user: null, error: 'Invalid or expired token' };
    }

    return { authenticated: true, user, error: null };
  } catch (error) {
    console.error('Auth verification exception:', error);
    return { authenticated: false, user: null, error: 'Authentication verification failed' };
  }
}

// Optimized embedding generation with caching
async function getEmbedding(text: string): Promise<number[]> {
  const cacheKey = text.toLowerCase().trim();
  
  if (embeddingCache.has(cacheKey)) {
    return embeddingCache.get(cacheKey)!;
  }
  
  const embedding = await generateEmbedding(text);
  if (embedding) {
    embeddingCache.set(cacheKey, embedding);
  }
  
  return embedding || [];
}

// Enhanced context retrieval with comprehensive user knowledge
async function getRelevantContext(userId: string, query: string, queryEmbedding: number[]) {
  console.log(`[CHAT DEBUG] Getting comprehensive context for user: ${userId}`);
  
  const context: {
    userProfile: any;
    userStrategyProfile: any;
    recentPosts: any[];
    relevantPosts: any[];
    conversationHistory: any[];
    similarMessages: any[];
    userPreferences: any;
    performanceMetrics: any;
    trendingTopics: any[];
    contentIdeas: any[];
    draftPosts: any[];
    scheduledPosts: any[];
    engagementPatterns: any;
    platformInsights: any;
    hashtagPerformance: any[];
  } = {
    userProfile: null,
    userStrategyProfile: null,
    recentPosts: [],
    relevantPosts: [],
    conversationHistory: [],
    similarMessages: [],
    userPreferences: {},
    performanceMetrics: {},
    trendingTopics: [],
    contentIdeas: [],
    draftPosts: [],
    scheduledPosts: [],
    engagementPatterns: {},
    platformInsights: {},
    hashtagPerformance: []
  };

  try {
    // 1. Get comprehensive user profile and strategy data
    const [userProfileResult, userStrategyResult] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single(),
      supabase
        .from('user_strategy_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()
    ]);
    
    context.userProfile = userProfileResult.data;
    context.userStrategyProfile = userStrategyResult.data;
    
    console.log(`[CHAT DEBUG] User profile:`, {
      name: context.userProfile?.full_name || 'No name',
      expertise: context.userProfile?.expertise || 'Not set',
      strategy: context.userStrategyProfile ? 'Has strategy' : 'No strategy'
    });

    // 2. Get ALL user posts with enhanced filtering and analysis
    const { data: allPosts, error: postsError } = await supabase
      .from('posts')
      .select(`
        *,
        post_analytics (
          impressions,
          reach,
          engagement_rate,
          click_through_rate
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100); // Increased for better analysis

    console.log(`[CHAT DEBUG] Enhanced posts query:`, {
      postCount: allPosts?.length || 0,
      error: postsError?.message,
      userId: userId
    });

    if (allPosts && allPosts.length > 0) {
      // Strict user filtering
      const validPosts = allPosts.filter(p => p.user_id === userId);
      
      // Categorize posts by status
      context.draftPosts = validPosts.filter(p => p.status === 'draft');
      context.scheduledPosts = validPosts.filter(p => p.status === 'scheduled');
      const publishedPosts = validPosts.filter(p => p.status === 'published');
      
      // Get recent posts across all statuses
      context.recentPosts = validPosts.slice(0, 15);
      
      // Enhanced performance analysis
      const postsByLikes = [...publishedPosts]
        .filter(p => (p.likes || 0) > 0)
        .sort((a, b) => (b.likes || 0) - (a.likes || 0));
        
      const postsByComments = [...publishedPosts]
        .filter(p => (p.comments_count || 0) > 0)
        .sort((a, b) => (b.comments_count || 0) - (a.comments_count || 0));
        
      const postsByEngagement = [...publishedPosts]
        .map(p => ({
          ...p,
          totalEngagement: (p.likes || 0) + (p.comments_count || 0) + (p.shares || 0)
        }))
        .filter(p => p.totalEngagement > 0)
        .sort((a, b) => b.totalEngagement - a.totalEngagement);
      
      // Platform performance analysis
      const platformStats: Record<string, {
        posts: number;
        totalLikes: number;
        totalComments: number;
        avgEngagement: number;
      }> = {};
      validPosts.forEach(post => {
        if (post.platforms) {
          post.platforms.forEach((platform: string) => {
            if (!platformStats[platform]) {
              platformStats[platform] = { 
                posts: 0, 
                totalLikes: 0, 
                totalComments: 0, 
                avgEngagement: 0 
              };
            }
            platformStats[platform].posts++;
            platformStats[platform].totalLikes += post.likes || 0;
            platformStats[platform].totalComments += post.comments_count || 0;
          });
        }
      });
      
      // Calculate platform averages
      Object.keys(platformStats).forEach(platform => {
        const stats = platformStats[platform];
        stats.avgEngagement = stats.posts > 0 ? 
          (stats.totalLikes + stats.totalComments) / stats.posts : 0;
      });
      
      context.platformInsights = platformStats;
      
      // Enhanced performance metrics
      const totalLikes = publishedPosts.reduce((sum, p) => sum + (p.likes || 0), 0);
      const totalComments = publishedPosts.reduce((sum, p) => sum + (p.comments_count || 0), 0);
      const totalShares = publishedPosts.reduce((sum, p) => sum + (p.shares || 0), 0);
      const avgEngagement = publishedPosts.length > 0 ? 
        (totalLikes + totalComments + totalShares) / publishedPosts.length : 0;
      
      // Engagement patterns by time/day
      const engagementByHour: Record<number, number> = {};
      const engagementByDay: Record<number, number> = {};
      
      publishedPosts.forEach(post => {
        if (post.published_at) {
          const date = new Date(post.published_at);
          const hour = date.getHours();
          const day = date.getDay(); // 0 = Sunday
          
          const engagement = (post.likes || 0) + (post.comments_count || 0);
          
          engagementByHour[hour] = (engagementByHour[hour] || 0) + engagement;
          engagementByDay[day] = (engagementByDay[day] || 0) + engagement;
        }
      });
      
      context.engagementPatterns = {
        bestHours: Object.entries(engagementByHour)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([hour, engagement]) => ({ hour: parseInt(hour), engagement })),
        bestDays: Object.entries(engagementByDay)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([day, engagement]) => ({ 
            day: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'][parseInt(day)], 
            engagement 
          }))
      };
      
      context.performanceMetrics = {
        totalPosts: validPosts.length,
        publishedPosts: publishedPosts.length,
        draftPosts: context.draftPosts.length,
        scheduledPosts: context.scheduledPosts.length,
        totalLikes,
        totalComments,
        totalShares,
        avgEngagement: Math.round(avgEngagement * 100) / 100,
        topPostByLikes: postsByLikes[0],
        topPostByComments: postsByComments[0],
        topPostByEngagement: postsByEngagement[0],
        recentTrend: calculateRecentTrend(publishedPosts),
        contentTypes: analyzeContentTypes(validPosts)
      };
      
      console.log(`[CHAT DEBUG] Enhanced performance metrics:`, {
        totalPosts: context.performanceMetrics.totalPosts,
        platforms: Object.keys(platformStats),
        bestPlatform: Object.entries(platformStats)
          .sort(([,a], [,b]) => b.avgEngagement - a.avgEngagement)[0]?.[0]
      });
      
    } else {
      context.performanceMetrics = {
        totalPosts: 0,
        message: 'IMPORTANT: This user has NO POSTS in the database yet.'
      };
    }

    // 3. Get user's content ideas for context
    const { data: contentIdeas } = await supabase
      .from('content_generations')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'idea')
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (contentIdeas) {
      context.contentIdeas = contentIdeas;
    }

    // 4. Enhanced user preferences with strategy data
    const { data: userPreferences } = await supabase
      .from('user_preferences')
      .select(`
        *,
        target_audience_age,
        target_audience_type,
        active_region,
        price_range,
        lead_platform,
        brand_positioning,
        marketing_goals,
        strategy_preferences
      `)
      .eq('user_id', userId)
      .single();

    if (userPreferences) {
      context.userPreferences = userPreferences;
    }

    // 5. Enhanced conversation history with semantic search
    const { data: chatHistory } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30); // Increased for better context

    if (chatHistory) {
      context.conversationHistory = chatHistory.reverse();
    }

    // 6. Semantic searches with better error handling
    if (queryEmbedding && queryEmbedding.length > 0) {
      try {
        // Similar posts
        const { data: similarPosts } = await supabase
          .rpc('search_similar_posts', {
            user_uuid: userId,
            query_embedding: queryEmbedding,
            similarity_threshold: 0.65, // Lowered for more results
            limit_count: 8
          });

        if (similarPosts?.length > 0) {
          context.relevantPosts = similarPosts;
        }

        // Similar messages  
        const { data: similarMessages } = await supabase
          .rpc('search_similar_messages', {
            user_uuid: userId,
            query_embedding: queryEmbedding,
            similarity_threshold: 0.7,
            limit_count: 8
          });

        if (similarMessages?.length > 0) {
          context.similarMessages = similarMessages;
        }
      } catch (error) {
        console.warn('[CHAT DEBUG] Semantic search failed:', error);
      }
    }

    // 7. Get trending topics relevant to user's domain
    const userDomain = context.userProfile?.expertise || 
                      context.userStrategyProfile?.active_region || 
                      'general';
    
    context.trendingTopics = await getTrendingTopics(userDomain);

  } catch (error) {
    console.error('[CHAT DEBUG] Error retrieving context:', error);
  }

  return context;
}

// Helper function to calculate recent engagement trend
function calculateRecentTrend(posts) {
  if (posts.length < 4) return 'insufficient_data';
  
  const recent = posts.slice(0, Math.floor(posts.length / 2));
  const older = posts.slice(Math.floor(posts.length / 2));
  
  const recentAvg = recent.reduce((sum, p) => 
    sum + (p.likes || 0) + (p.comments_count || 0), 0) / recent.length;
  const olderAvg = older.reduce((sum, p) => 
    sum + (p.likes || 0) + (p.comments_count || 0), 0) / older.length;
  
  const change = ((recentAvg - olderAvg) / olderAvg) * 100;
  
  if (change > 10) return 'improving';
  if (change < -10) return 'declining';
  return 'stable';
}

// Helper function to analyze content types
function analyzeContentTypes(posts) {
  const types = {
    text: 0,
    image: 0,
    video: 0,
    carousel: 0
  };
  
  posts.forEach(post => {
    const type = post.media_type || 'text';
    if (types.hasOwnProperty(type)) {
      types[type]++;
    }
  });
  
  return types;
}

// Helper function to get domain-relevant trending topics
async function getTrendingTopics(domain) {
  const topics = {
    immobilien: [
      { topic: 'Smart Home Technologie', engagement: 'high', relevance: 'technology' },
      { topic: 'Nachhaltige Immobilien', engagement: 'high', relevance: 'sustainability' },
      { topic: 'Finanzierungstipps 2024', engagement: 'high', relevance: 'finance' },
      { topic: 'Immobilienmarkt Trends', engagement: 'medium', relevance: 'market' },
      { topic: 'Energieeffizienz', engagement: 'medium', relevance: 'efficiency' }
    ],
    general: [
      { topic: 'Social Media Trends', engagement: 'high', relevance: 'marketing' },
      { topic: 'Content Creator Tools', engagement: 'medium', relevance: 'tools' },
      { topic: 'Personal Branding', engagement: 'high', relevance: 'branding' }
    ]
  };
  
  return topics[domain.toLowerCase()] || topics.general;
}

// Build comprehensive context string for AI with enhanced user knowledge
function buildContextString(context: any, query: string) {
  let contextString = '';

  // Check if query is post-related
  const postRelatedKeywords = [
    'post', 'posts', 'inhalt', 'content', 'performance', 'engagement', 'likes', 'kommentare', 
    'shares', 'beste', 'erfolgreich', 'analytics', 'metriken', 'reichweite', 'impressions',
    'veröffentlicht', 'published', 'social media', 'instagram', 'facebook', 'linkedin', 'twitter',
    'hashtag', 'strategie', 'zielgruppe', 'audience', 'platform', 'plattform'
  ];
  
  const isPostRelatedQuery = postRelatedKeywords.some(keyword => 
    query.toLowerCase().includes(keyword.toLowerCase())
  );

  // CRITICAL: User data availability check - only for post-related queries
  const hasUserPosts = context.performanceMetrics?.totalPosts > 0;
  if (!hasUserPosts && isPostRelatedQuery) {
    contextString += `[CRITICAL INFORMATION]\n`;
    contextString += `⚠️ DIESER BENUTZER HAT NOCH KEINE POSTS IN DER DATENBANK ⚠️\n`;
    contextString += `Du darfst KEINE Posts oder Performance-Daten erfinden oder halluzinieren.\n`;
    contextString += `Antworte ehrlich, dass noch keine Posts vorhanden sind und biete Hilfe beim Erstellen an.\n\n`;
  } else if (hasUserPosts && isPostRelatedQuery) {
    // HIGHLIGHT THE ACTUAL BEST POST CLEARLY
    if (context.performanceMetrics?.topPostByLikes) {
      const bestPost = context.performanceMetrics.topPostByLikes;
      contextString += `🏆 [ABSOLUT BESTER POST - HÖCHSTE LIKES] 🏆\n`;
      contextString += `LIKES: ${bestPost.likes}\n`;
      contextString += `KOMMENTARE: ${bestPost.comments_count || 0}\n`;
      contextString += `INHALT: ${(bestPost.content || bestPost.content_text || '').substring(0, 300)}...\n`;
      contextString += `PLATTFORM: ${bestPost.platforms?.[0] || 'unknown'}\n`;
      contextString += `STATUS: ${bestPost.status}\n`;
      contextString += `>>> DIES IST DEFINITIV DER BESTE POST NACH LIKES <<<\n\n`;
    }
  }

  // Enhanced User Profile Context
  if (context.userProfile) {
    contextString += `[USER PROFILE]\n`;
    contextString += `- Name: ${context.userProfile.full_name || 'Nicht angegeben'}\n`;
    contextString += `- Expertise: ${context.userProfile.expertise || 'Nicht angegeben'}\n`;
    contextString += `- Location: ${context.userProfile.location || 'Nicht angegeben'}\n`;
    contextString += `- Experience: ${context.userProfile.experience_years || 'Nicht angegeben'} Jahre\n\n`;
  }

  // User Strategy Profile
  if (context.userStrategyProfile) {
    contextString += `[USER STRATEGY PROFILE]\n`;
    contextString += `- Target Audience: ${context.userStrategyProfile.target_audience_type || 'Nicht definiert'}\n`;
    contextString += `- Active Region: ${context.userStrategyProfile.active_region || 'Nicht definiert'}\n`;
    contextString += `- Price Range: ${context.userStrategyProfile.price_range || 'Nicht definiert'}\n`;
    contextString += `- Lead Platform: ${context.userStrategyProfile.lead_platform || 'Nicht definiert'}\n`;
    contextString += `- Brand Positioning: ${context.userStrategyProfile.brand_positioning || 'Nicht definiert'}\n`;
    if (context.userStrategyProfile.unique_selling_points?.length > 0) {
      contextString += `- USPs: ${context.userStrategyProfile.unique_selling_points.join(', ')}\n`;
    }
    contextString += '\n';
  }

  // Enhanced Performance Metrics - only for post-related queries
  if (isPostRelatedQuery && context.performanceMetrics && !context.performanceMetrics.message) {
    const metrics = context.performanceMetrics;
    contextString += `[COMPREHENSIVE PERFORMANCE METRICS]\n`;
    contextString += `- Total Posts: ${metrics.totalPosts} (Published: ${metrics.publishedPosts}, Drafts: ${metrics.draftPosts}, Scheduled: ${metrics.scheduledPosts})\n`;
    contextString += `- Total Engagement: ${metrics.totalLikes} likes, ${metrics.totalComments} comments, ${metrics.totalShares} shares\n`;
    contextString += `- Average Engagement: ${metrics.avgEngagement} per post\n`;
    contextString += `- Recent Trend: ${metrics.recentTrend}\n`;
    
    if (metrics.contentTypes) {
      contextString += `- Content Types: `;
      Object.entries(metrics.contentTypes).forEach(([type, count]) => {
        contextString += `${type}: ${count}, `;
      });
      contextString += '\n';
    }
    contextString += '\n';
  }

  // Platform Performance Insights - only for post-related queries
  if (isPostRelatedQuery && context.platformInsights && Object.keys(context.platformInsights).length > 0) {
    contextString += `[PLATFORM PERFORMANCE INSIGHTS]\n`;
    Object.entries(context.platformInsights).forEach(([platform, stats]: [string, any]) => {
      contextString += `- ${platform.toUpperCase()}: ${stats.posts} posts, avg engagement: ${stats.avgEngagement.toFixed(1)}\n`;
    });
    contextString += '\n';
  }

  // Engagement Patterns - only for post-related queries
  if (isPostRelatedQuery && context.engagementPatterns) {
    contextString += `[ENGAGEMENT PATTERNS]\n`;
    if (context.engagementPatterns.bestHours?.length > 0) {
      contextString += `- Best Hours: `;
      context.engagementPatterns.bestHours.forEach((hourData: any) => {
        contextString += `${hourData.hour}:00 (${hourData.engagement} engagement), `;
      });
      contextString += '\n';
    }
    if (context.engagementPatterns.bestDays?.length > 0) {
      contextString += `- Best Days: `;
      context.engagementPatterns.bestDays.forEach((dayData: any) => {
        contextString += `${dayData.day} (${dayData.engagement} engagement), `;
      });
      contextString += '\n';
    }
    contextString += '\n';
  }

  // Content Ideas Context
  if (context.contentIdeas?.length > 0) {
    contextString += `[SAVED CONTENT IDEAS]\n`;
    context.contentIdeas.slice(0, 5).forEach((idea: any, index: number) => {
      contextString += `${index + 1}. ${idea.title || 'Untitled Idea'}: ${idea.content?.substring(0, 100)}...\n`;
    });
    contextString += '\n';
  }

  // Draft and Scheduled Posts
  if (context.draftPosts?.length > 0) {
    contextString += `[DRAFT POSTS (${context.draftPosts.length})]\n`;
    context.draftPosts.slice(0, 3).forEach((post: any, index: number) => {
      contextString += `${index + 1}. ${post.title || 'Untitled'}: ${post.content?.substring(0, 80)}...\n`;
    });
    contextString += '\n';
  }

  if (context.scheduledPosts?.length > 0) {
    contextString += `[SCHEDULED POSTS (${context.scheduledPosts.length})]\n`;
    context.scheduledPosts.slice(0, 3).forEach((post: any, index: number) => {
      const scheduledDate = new Date(post.scheduled_at).toLocaleDateString('de-DE');
      contextString += `${index + 1}. ${post.title || 'Untitled'} (${scheduledDate}): ${post.content?.substring(0, 80)}...\n`;
    });
    contextString += '\n';
  }

  // Enhanced User Preferences
  if (context.userPreferences) {
    contextString += `[USER PREFERENCES & STRATEGY]\n`;
    if (context.userPreferences.preferred_platforms) {
      contextString += `- Preferred Platforms: ${context.userPreferences.preferred_platforms.join(', ')}\n`;
    }
    if (context.userPreferences.target_audience_age) {
      contextString += `- Target Age: ${context.userPreferences.target_audience_age}\n`;
    }
    if (context.userPreferences.weekly_content_hours) {
      contextString += `- Weekly Content Hours: ${context.userPreferences.weekly_content_hours}\n`;
    }
    if (context.userPreferences.marketing_goals) {
      contextString += `- Marketing Goals: ${JSON.stringify(context.userPreferences.marketing_goals)}\n`;
    }
    contextString += '\n';
  }

  // Semantically Similar Posts (most relevant to current query)
  if (context.relevantPosts.length > 0) {
    contextString += `[ÄHNLICHE POSTS (Semantische Suche)]\n`;
    context.relevantPosts.forEach((post: any, index: number) => {
      const similarity = Math.round(post.similarity * 100);
      const engagement = `${post.likes || 0} likes, ${post.comments || 0} comments`;
      contextString += `${index + 1}. [${similarity}% Ähnlichkeit] ${post.content_text || post.content} (${engagement})\n`;
    });
    contextString += '\n';
  }

  // Recent Posts Context
  if (context.recentPosts && context.recentPosts.length > 0) {
    contextString += `[RECENT POSTS - Last 10]\n`;
    context.recentPosts.forEach((post: any, index: number) => {
      const status = post.status || 'unknown';
      const engagement = `${post.likes || 0} likes, ${post.comments_count || post.comments || 0} comments`;
      const content = post.content || post.content_text || 'Kein Inhalt verfügbar';
      contextString += `${index + 1}. [${status.toUpperCase()}] ${content.substring(0, 100)}... (${engagement})\n`;
    });
    contextString += '\n';
  } else if (!hasUserPosts) {
    contextString += `[RECENT POSTS]\n`;
    contextString += `Keine Posts vorhanden. Dieser Benutzer muss seine ersten Posts erstellen.\n\n`;
  }

  console.log(`[CHAT DEBUG] Context string length: ${contextString.length} characters`);
  console.log(`[CHAT DEBUG] Context preview:`, contextString.substring(0, 500) + '...');
  
  // Semantically Similar Past Conversations
  if (context.similarMessages.length > 0) {
    contextString += `[ÄHNLICHE VERGANGENE GESPRÄCHE (Semantische Suche)]\n`;
    context.similarMessages.forEach((msg: any, index: number) => {
      const role = msg.role === 'user' ? 'Du' : 'AI Assistant';
      const similarity = Math.round(msg.similarity * 100);
      const date = new Date(msg.created_at).toLocaleString('de-DE');
      contextString += `${index + 1}. [${similarity}% Ähnlichkeit] [${date}] ${role}: ${msg.content}\n`;
    });
    contextString += '\n';
  }

  // Conversation History
  if (context.conversationHistory.length > 0) {
    contextString += `[CONVERSATION HISTORY - Last 20 Messages]\n`;
    context.conversationHistory.forEach((msg: any, index: number) => {
      const role = msg.role === 'user' ? 'Du' : 'AI Assistant';
      const date = new Date(msg.created_at).toLocaleString('de-DE');
      contextString += `${index + 1}. [${date}] ${role}: ${msg.content}\n`;
    });
    contextString += '\n';
  }

  // User Preferences
  if (context.userPreferences) {
    contextString += `[USER PREFERENCES]\n`;
    contextString += `- Preferred Platforms: ${context.userPreferences.preferred_platforms?.join(', ') || 'All'}\n`;
    contextString += `- Content Focus: ${context.userPreferences.content_focus || 'General'}\n`;
    contextString += `- Target Audience: ${context.userPreferences.target_audience || 'General'}\n\n`;
  }

  // Trending Topics
  if (context.trendingTopics.length > 0) {
    contextString += `[TRENDING TOPICS]\n`;
    context.trendingTopics.forEach((topic: any) => {
      contextString += `- ${topic.topic} (${topic.engagement} engagement, ${topic.relevance} relevance)\n`;
    });
    contextString += '\n';
  }

  return contextString;
}

// POST /api/chat - Enhanced with full context memory
export async function POST(request: NextRequest) {
  try {
    console.log(`[CHAT DEBUG] Incoming request to /api/chat`);
    
    // 1. Authenticate the user
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      console.log(`[CHAT DEBUG] Authentication failed:`, authResult.error);
      return NextResponse.json(
        { success: false, error: 'Anmeldung erforderlich' },
        { status: 401 }
      );
    }

    const user = authResult.user!;
    console.log(`[CHAT DEBUG] Authenticated user:`, {
      id: user.id,
      email: user.email,
      metadata: user.user_metadata
    });

    // 2. Parse request body with error handling
    let query: string;
    let incoming_conversation_id: string | undefined;
    
    try {
      const body = await request.json();
      query = body.query;
      incoming_conversation_id = body.conversation_id;
      
      if (!query || typeof query !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Gültige Query erforderlich' },
          { status: 400 }
        );
      }
      
      console.log(`[CHAT DEBUG] Query received:`, query.substring(0, 100) + '...');
    } catch (error) {
      console.error(`[CHAT DEBUG] Error parsing request body:`, error);
      return NextResponse.json(
        { success: false, error: 'Ungültiger Request Body' },
        { status: 400 }
      );
    }

    // Let's also check what posts exist for ANY user to understand the data structure
    const { data: allUsersPostsSample, error: sampleError } = await supabase
      .from('posts')
      .select('id, user_id, content, title, likes, comments_count, platforms, status')
      .order('likes', { ascending: false })
      .limit(10);

    console.log(`[CHAT DEBUG] Sample of all posts in database:`, {
      totalSamplePosts: allUsersPostsSample?.length || 0,
      sampleError: sampleError?.message,
      samplePosts: allUsersPostsSample?.map(p => ({
        id: p.id,
        user_id: p.user_id,
        likes: p.likes,
        content: p.content?.substring(0, 50) + '...'
      }))
    });

    // 3. Generate embedding for the query
    const queryEmbedding = await getEmbedding(query);
    if (!queryEmbedding || queryEmbedding.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate embedding for the query.' },
        { status: 500 }
      );
    }

    // 4. Get conversation ID
    let currentConversationId: string;
    if (incoming_conversation_id) {
      currentConversationId = incoming_conversation_id;
    } else {
      const { data: latestMessage } = await supabase
        .from('chat_messages')
        .select('conversation_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      currentConversationId = latestMessage?.conversation_id || uuidv4();
    }

    // 5. Get comprehensive context
    const context = await getRelevantContext(user.id, query, queryEmbedding);
    const contextString = buildContextString(context, query);

    console.log(`[CHAT DEBUG] Final context being sent to AI:`, {
      userHasPosts: context.performanceMetrics?.totalPosts > 0,
      totalPosts: context.performanceMetrics?.totalPosts || 0,
      recentPostsCount: context.recentPosts?.length || 0,
      userName: context.userProfile?.full_name || 'Unknown',
      query: query
    });

    // 6. Store the user's message
    const userMessageToSave = {
      user_id: user.id,
      conversation_id: currentConversationId,
      role: 'user',
      content: query,
      embedding: queryEmbedding,
    };
    
    // Don't wait for this to complete
    (async () => {
      try {
        await supabase.from('chat_messages').insert([userMessageToSave]);
      } catch (error: any) {
        console.error('Error saving user message:', error);
      }
    })();

    // 7. Prepare messages for GPT-4o
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `Du bist ein hochintelligenter Social Media & Content Marketing Analyst und vielseitiger Assistent.

🎯 **DEINE FÄHIGKEITEN:**

**👤 BENUTZER-PERSONALISIERUNG:**
- Vollständiges User Profile (Name, Expertise, Erfahrung)
- User Strategy Profile (Zielgruppe, Region, Positionierung, USPs)
- User Preferences und Ziele

**📈 SOCIAL MEDIA EXPERTISE (wenn relevant):**
- Performance Analytics und Engagement-Metriken
- Platform-spezifische Optimierung
- Content-Strategie und Timing
- Hashtag- und Zielgruppen-Analyse

**🧠 ALLGEMEINE BERATUNG:**
- Immobilien-Fachwissen und Marktkenntnis
- Business-Strategie und Marketing
- Allgemeine Fragen und Hilfestellung
- Conversation Memory für personalisierte Antworten

**💬 ANTWORT-PRINZIPIEN:**
- **Kontextbewusst**: Erkenne, worum es in der Frage geht
- **Personalisiert**: Nutze verfügbare Benutzerdaten wo relevant
- **Präzise**: Beantworte nur das, was gefragt wurde
- **Hilfreich**: Biete konkrete, umsetzbare Unterstützung
- **Ehrlich**: Sage, wenn du keine Daten hast, aber biete trotzdem Hilfe

**⚠️ WICHTIGE REGELN:**
- Antworte NUR auf die gestellte Frage
- Nutze bereitgestellte Daten nur wenn sie relevant sind
- Bei Post/Performance-Fragen: Verwende nur echte Metriken
- Bei allgemeinen Fragen: Fokussiere auf die Frage, nicht auf Posts
- NIEMALS Daten erfinden oder halluzinieren

Du bist ein vielseitiger, intelligenter Assistent - nutze dein Wissen situationsangemessen!`,
      },
      {
        role: 'user',
        content: `${contextString}\n\n[AKTUELLE ANFRAGE]\n${query}`,
      },
    ];

    // 8. Call GPT-4o with enhanced context
    console.log('Sending enhanced context to GPT-4o...');
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000,
      presence_penalty: 0.1,
      frequency_penalty: 0.1,
    });

    const llmResponse = completion.choices[0].message.content;

    if (!llmResponse || llmResponse.trim().length === 0) {
      console.warn('[CHAT API] Empty response from GPT-4o, providing fallback');
      
      // Provide a helpful fallback response instead of an error
      const fallbackResponse = `Entschuldigung, ich konnte keine spezifische Antwort auf Ihre Frage generieren. 

**Hier sind einige Bereiche, in denen ich Ihnen helfen kann:**

• **Content-Analyse** - Bewertung Ihrer bestperformenden Posts
• **Content-Ideen** - Neue Vorschläge basierend auf Ihren Daten  
• **Strategie-Optimierung** - Verbesserung Ihrer Social Media Performance
• **Hashtag-Empfehlungen** - Relevante Tags für bessere Reichweite

Können Sie Ihre Frage spezifischer formulieren oder einen dieser Bereiche wählen?`;

      const aiResponse = {
        success: true,
        message: fallbackResponse,
        conversation_id: currentConversationId,
        query: query,
        debug: {
          userHasPosts: context.performanceMetrics?.totalPosts > 0,
          totalPosts: context.performanceMetrics?.totalPosts || 0,
          topPostByLikes: null,
          fallbackUsed: true
        }
      };

      return NextResponse.json(aiResponse, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // 9. Store the assistant's response
    const responseEmbedding = await getEmbedding(llmResponse);
    
    const assistantMessageToSave = {
      user_id: user.id,
      conversation_id: currentConversationId,
      role: 'assistant',
      content: llmResponse,
      embedding: responseEmbedding,
    };
    
    // Don't wait for this to complete
    (async () => {
      try {
        await supabase.from('chat_messages').insert([assistantMessageToSave]);
      } catch (error: any) {
        console.error('Error saving assistant message:', error);
      }
    })();

    const aiResponse = {
      success: true,
      message: llmResponse,
      conversation_id: currentConversationId,
      query: query,
      debug: {
        userHasPosts: context.performanceMetrics?.totalPosts > 0,
        totalPosts: context.performanceMetrics?.totalPosts || 0,
        topPostByLikes: context.performanceMetrics?.topPostByLikes ? {
          likes: context.performanceMetrics.topPostByLikes.likes,
          content: context.performanceMetrics.topPostByLikes.content?.substring(0, 100) + '...'
        } : null
      }
    };

    console.log(`[CHAT DEBUG] Sending response:`, {
      success: true,
      messageLength: llmResponse?.length || 0,
      conversationId: currentConversationId,
      debug: aiResponse.debug
    });

    return NextResponse.json(aiResponse, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Ein Fehler ist aufgetreten beim Verarbeiten der Anfrage',
        details: error.message 
      },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );
  }
}

// Handle preflight requests
export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
} 