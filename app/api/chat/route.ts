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

// Enhanced context retrieval with semantic search
async function getRelevantContext(userId: string, query: string, queryEmbedding: number[]) {
  const context: {
    userProfile: any;
    recentPosts: any[];
    relevantPosts: any[];
    conversationHistory: any[];
    userPreferences: any;
    performanceMetrics: any;
    trendingTopics: any[];
  } = {
    userProfile: null,
    recentPosts: [],
    relevantPosts: [],
    conversationHistory: [],
    userPreferences: {},
    performanceMetrics: {},
    trendingTopics: []
  };

  try {
    // 1. Get user profile and preferences
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    context.userProfile = userProfile;

    // 2. Get all user posts with semantic search
    const { data: allPosts } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (allPosts) {
      // Get recent posts (last 10)
      context.recentPosts = allPosts.slice(0, 10);
      
      // Get posts with high engagement for performance analysis
      const highEngagementPosts = allPosts.filter(p => 
        (p.likes || 0) > 5 || (p.comments || 0) > 2
      );
      
      // Calculate performance metrics
      const totalLikes = allPosts.reduce((sum, p) => sum + (p.likes || 0), 0);
      const totalComments = allPosts.reduce((sum, p) => sum + (p.comments || 0), 0);
      const avgEngagement = allPosts.length > 0 ? (totalLikes + totalComments) / allPosts.length : 0;
      
      context.performanceMetrics = {
        totalPosts: allPosts.length,
        totalLikes,
        totalComments,
        avgEngagement: Math.round(avgEngagement * 100) / 100,
        bestPerformingPosts: highEngagementPosts.slice(0, 5),
        recentPerformance: allPosts.slice(0, 5).map(p => ({
          id: p.id,
          likes: p.likes || 0,
          comments: p.comments || 0,
          content: p.content_text || p.content,
          platform: p.platforms?.[0] || 'unknown'
        }))
      };
    }

    // 3. Get conversation history with semantic search
    const { data: chatHistory } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (chatHistory) {
      context.conversationHistory = chatHistory.reverse(); // Oldest first for context
    }

    // 4. Get user preferences and patterns
    const { data: userPreferences } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (userPreferences) {
      context.userPreferences = userPreferences;
    }

    // 5. Get trending topics and hashtags (simulated for now)
    context.trendingTopics = [
      { topic: 'Smart Home', engagement: 'high', relevance: 'immobilien' },
      { topic: 'Nachhaltige Immobilien', engagement: 'medium', relevance: 'immobilien' },
      { topic: 'Finanzierungstipps', engagement: 'high', relevance: 'finanzierung' }
    ];

  } catch (error) {
    console.error('Error retrieving context:', error);
  }

  return context;
}

// Build comprehensive context string for AI
function buildContextString(context: any, query: string) {
  let contextString = '';

  // User Profile Context
  if (context.userProfile) {
    contextString += `[USER PROFILE]\n`;
    contextString += `- User ID: ${context.userProfile.user_id}\n`;
    contextString += `- Expertise: ${context.userProfile.expertise || 'Immobilienmakler'}\n`;
    contextString += `- Location: ${context.userProfile.location || 'Nicht angegeben'}\n`;
    contextString += `- Experience: ${context.userProfile.experience_years || 'Nicht angegeben'} Jahre\n\n`;
  }

  // Performance Metrics
  if (context.performanceMetrics) {
    const metrics = context.performanceMetrics;
    contextString += `[PERFORMANCE METRICS]\n`;
    contextString += `- Total Posts: ${metrics.totalPosts}\n`;
    contextString += `- Total Likes: ${metrics.totalLikes}\n`;
    contextString += `- Total Comments: ${metrics.totalComments}\n`;
    contextString += `- Average Engagement: ${metrics.avgEngagement}\n\n`;
    
    if (metrics.bestPerformingPosts.length > 0) {
      contextString += `[BEST PERFORMING POSTS]\n`;
      metrics.bestPerformingPosts.forEach((post: any, index: number) => {
        contextString += `${index + 1}. ${post.content_text || post.content} (${post.likes} likes, ${post.comments} comments)\n`;
      });
      contextString += '\n';
    }
  }

  // Recent Posts Context
  if (context.recentPosts.length > 0) {
    contextString += `[RECENT POSTS - Last 10]\n`;
    context.recentPosts.forEach((post: any, index: number) => {
      const status = post.status || 'unknown';
      const engagement = `${post.likes || 0} likes, ${post.comments || 0} comments`;
      contextString += `${index + 1}. [${status.toUpperCase()}] ${post.content_text || post.content} (${engagement})\n`;
    });
    contextString += '\n';
  }

  // Conversation History
  if (context.conversationHistory.length > 0) {
    contextString += `[CONVERSATION HISTORY - Last 20 Messages]\n`;
    context.conversationHistory.forEach((msg: any, index: number) => {
      const role = msg.role === 'user' ? 'You' : 'AI Assistant';
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
    // 1. Authenticate the user
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = authResult.user!;

    // 2. Parse request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { query, conversation_id: incoming_conversation_id } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { success: false, error: 'A valid query string is required.' },
        { status: 400 }
      );
    }

    console.log(`Enhanced Chat Query: "${query}" by user: ${user.id}`);

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
        content: `Du bist der perfekte Social Media Manager und persönliche Assistent für einen Immobilienmakler. Du hast ein fotografisches Gedächtnis und erinnerst dich an JEDES Detail aus allen vorherigen Gesprächen und Posts des Benutzers.

**Deine Kernfähigkeiten:**
- **Vollständiges Gedächtnis:** Du erinnerst dich an alle vorherigen Gespräche, Posts, Präferenzen und Verhaltensmuster des Benutzers
- **Kontextuelle Intelligenz:** Du verstehst den vollständigen Kontext und baust darauf auf
- **Persönlicher Assistent:** Du kennst den Benutzer wie ein guter Freund und berätst ihn entsprechend
- **Proaktive Hilfe:** Du erkennst Muster und schlägst proaktiv Verbesserungen vor

**Wichtige Anweisungen:**
- **Verwende IMMER den bereitgestellten Kontext:** Alle Informationen über Posts, Performance, Gesprächsverlauf sind für dich verfügbar
- **Sei persönlich und freundlich:** Sprich wie ein guter Freund, der den Benutzer sehr gut kennt
- **Baue auf vorherigen Gesprächen auf:** Erwähne relevante Details aus früheren Gesprächen
- **Analysiere Muster:** Erkenne Trends in Posts, Performance und Verhalten
- **Sei proaktiv:** Schlage Verbesserungen basierend auf der Historie vor
- **Antworte auf Deutsch:** Alle Kommunikation auf Deutsch

**Kontext-Nutzung:**
- Verwende die Performance-Metriken für personalisierte Ratschläge
- Beziehe dich auf erfolgreiche Posts und deren Strategien
- Erkenne Muster in der Konversationshistorie
- Berücksichtige User-Präferenzen und -Verhalten

**Beispiel-Interaktionen:**
- "Ich sehe, dass deine Posts über [Thema] besonders gut performen..."
- "Basierend auf unserer letzten Diskussion über [Thema]..."
- "Deine durchschnittliche Engagement-Rate von [X] zeigt..."
- "Erinnerst du dich an unser Gespräch über [Thema]? Lass uns das weiterentwickeln..."

**Dynamische Aktions-Buttons:**
Am Ende jeder Antwort schlage 3-5 konkrete nächste Schritte vor:

---
**Nächste Schritte:**
- [Titel der Aktion 1](ACTION_CODE_1)
- [Titel der Aktion 2](ACTION_CODE_2)
- [Titel der Aktion 3](ACTION_CODE_3)
---

Beispiele für ACTION_CODES: ANALYSIERE_PERFORMANCE, OPTIMIERE_BESTE_POSTS, ENTWICKLE_STRATEGIE, SCHLAGE_HASHTAGS_VOR, ERSTELLE_CONTENT_PLAN, MARKTANALYSE, KUNDENGESCHICHTE_ENTWICKELN, VERKAUFSTIPPS_GENERIEREN.`,
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

    if (!llmResponse) {
      return NextResponse.json(
        { success: false, error: 'GPT-4o did not return a response.' },
        { status: 500 }
      );
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

    // 10. Return enhanced response
    return NextResponse.json({
      success: true,
      response: llmResponse,
      conversation_id: currentConversationId,
      message: 'Enhanced chat with full context completed successfully.',
      context_summary: {
        total_posts: context.performanceMetrics?.totalPosts || 0,
        total_conversations: context.conversationHistory?.length || 0,
        avg_engagement: context.performanceMetrics?.avgEngagement || 0,
        best_performing_posts: context.performanceMetrics?.bestPerformingPosts?.length || 0
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Enhanced POST /api/chat error:', error);
    return NextResponse.json(
      { success: false, error: `Internal server error: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

// OPTIONS /api/chat - CORS support
export async function OPTIONS(request: NextRequest) {
  const response = new NextResponse(null, { status: 200 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'POST,OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Max-Age', '86400');
  return response;
} 