import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/supabase'
import { generateEmbedding } from '@/lib/openaiService'

// POST /api/chat-memory - Store new chat message and manage sessions
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
      session_id,
      message_type, // 'user' | 'assistant'
      content,
      context_type, // 'chat', 'caption_request', 'content_ideas', 'feedback'
      metadata // Additional context like feature used, suggestions provided, etc.
    } = body

    if (!content || !message_type) {
      return NextResponse.json({
        success: false,
        error: 'content and message_type are required'
      })
    }

    let currentSessionId = session_id

    // Create new session if none provided
    if (!currentSessionId) {
      const { data: newSession, error: sessionError } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: user.id,
          session_title: generateSessionTitle(content),
          context_type: context_type || 'chat',
          metadata: {
            started_at: new Date().toISOString(),
            initial_context: context_type,
            ...metadata
          }
        })
        .select()
        .single()

      if (sessionError) {
        console.error('Error creating chat session:', sessionError)
        return NextResponse.json({
          success: false,
          error: 'Failed to create chat session'
        })
      }

      currentSessionId = newSession.id
    }

    // Store the message
    const { data: message, error: messageError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: currentSessionId,
        user_id: user.id,
        message_type: message_type,
        content: content,
        context_type: context_type || 'chat',
        metadata: {
          timestamp: new Date().toISOString(),
          word_count: content.split(' ').length,
          ...metadata
        }
      })
      .select()
      .single()

    if (messageError) {
      console.error('Error storing chat message:', messageError)
      return NextResponse.json({
        success: false,
        error: 'Failed to store message'
      })
    }

    // Generate embedding for the message content
    let embedding = null
    try {
      embedding = await generateEmbedding(content)
      
      // Update message with embedding
      await supabase
        .from('chat_messages')
        .update({ embedding: embedding })
        .eq('id', message.id)

    } catch (embeddingError) {
      console.warn('Failed to generate embedding for message:', embeddingError)
      // Continue without embedding - not critical for basic functionality
    }

    // Update session with latest activity
    await supabase
      .from('chat_sessions')
      .update({
        last_activity: new Date().toISOString(),
        message_count: await getSessionMessageCount(currentSessionId)
      })
      .eq('id', currentSessionId)

    // Check if we should create a conversation summary
    await maybeCreateConversationSummary(currentSessionId)

    // Log memory storage activity
    await supabase
      .from('ai_context_logs')
      .insert({
        user_id: user.id,
        source_type: 'chat_memory',
        source_id: message.id,
        context_summary: `Stored ${message_type} message in session ${currentSessionId}`,
        ai_response: JSON.stringify({
          session_id: currentSessionId,
          message_id: message.id,
          embedding_generated: !!embedding,
          content_length: content.length
        }),
        model_used: 'memory_system',
        metadata: {
          context_type: context_type,
          session_id: currentSessionId,
          has_embedding: !!embedding
        }
      })

    return NextResponse.json({
      success: true,
      data: {
        session_id: currentSessionId,
        message_id: message.id,
        message: 'Message stored successfully',
        embedding_generated: !!embedding,
        memory_context: await getRecentMemoryContext(user.id, content)
      }
    })

  } catch (error) {
    console.error('Error managing chat memory:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to manage chat memory' },
      { status: 500 }
    )
  }
}

// GET /api/chat-memory - Retrieve chat history and relevant memories
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
    const session_id = searchParams.get('session_id')
    const query = searchParams.get('query') // For semantic search
    const context_type = searchParams.get('context_type')
    const limit = parseInt(searchParams.get('limit') || '50')

    if (session_id) {
      // Get specific session messages
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', session_id)
        .order('created_at', { ascending: true })
        .limit(limit)

      const { data: session } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('id', session_id)
        .single()

      return NextResponse.json({
        success: true,
        data: {
          session: session,
          messages: messages || [],
          memory_insights: await analyzeSessionMemory(session_id)
        }
      })
    }

    if (query) {
      // Semantic search through chat history
      const relevantMemories = await searchChatMemory(user.id, query, context_type)
      return NextResponse.json({
        success: true,
        data: {
          query: query,
          relevant_memories: relevantMemories,
          search_insights: generateSearchInsights(relevantMemories)
        }
      })
    }

    // Get recent sessions and overall memory summary
    const { data: sessions } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('last_activity', { ascending: false })
      .limit(10)

    const memoryStats = await getUserMemoryStats(user.id)

    return NextResponse.json({
      success: true,
      data: {
        recent_sessions: sessions || [],
        memory_statistics: memoryStats,
        conversation_insights: await getConversationInsights(user.id)
      }
    })

  } catch (error) {
    console.error('Error retrieving chat memory:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve chat memory' },
      { status: 500 }
    )
  }
}

// Helper function to generate session title from first message
function generateSessionTitle(content: string): string {
  const words = content.split(' ').slice(0, 6).join(' ')
  const cleanWords = words.replace(/[^\w\s]/g, '').trim()
  return cleanWords.length > 0 ? cleanWords + '...' : 'New Conversation'
}

// Helper function to get message count for a session
async function getSessionMessageCount(sessionId: string): Promise<number> {
  const { count } = await supabase
    .from('chat_messages')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId)

  return count || 0
}

// Helper function to create conversation summaries for long sessions
async function maybeCreateConversationSummary(sessionId: string) {
  const messageCount = await getSessionMessageCount(sessionId)
  
  // Create summary every 20 messages
  if (messageCount % 20 === 0 && messageCount > 0) {
    const { data: messages } = await supabase
      .from('chat_messages')
      .select('content, message_type, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (messages && messages.length > 0) {
      const conversationText = messages
        .reverse()
        .map(m => `${m.message_type}: ${m.content}`)
        .join('\n')

      try {
        const summary = await generateConversationSummary(conversationText)
        const summaryEmbedding = await generateEmbedding(summary)

        // Store summary as a special message
        await supabase
          .from('chat_messages')
          .insert({
            session_id: sessionId,
            user_id: (await getCurrentUser())?.id,
            message_type: 'system',
            content: summary,
            context_type: 'conversation_summary',
            embedding: summaryEmbedding,
            metadata: {
              summary_of_messages: messageCount,
              generated_at: new Date().toISOString(),
              type: 'conversation_summary'
            }
          })

      } catch (error) {
        console.warn('Failed to generate conversation summary:', error)
      }
    }
  }
}

// Helper function to search through chat memory using embeddings
async function searchChatMemory(userId: string, query: string, contextType?: string | null) {
  try {
    const queryEmbedding = await generateEmbedding(query)

    let searchQuery = supabase
      .from('chat_messages')
      .select(`
        id,
        content,
        message_type,
        context_type,
        created_at,
        metadata,
        session_id,
        chat_sessions!inner(session_title)
      `)
      .eq('user_id', userId)
      .not('embedding', 'is', null)

    if (contextType) {
      searchQuery = searchQuery.eq('context_type', contextType)
    }

    const { data: messages } = await searchQuery.limit(100)

    if (!messages || messages.length === 0) {
      return []
    }

    // Calculate similarity scores
    const scoredMessages = messages
      .map(message => {
        if (!message.embedding) return null
        
        const similarity = calculateCosineSimilarity(queryEmbedding, message.embedding)
        return {
          ...message,
          similarity_score: similarity,
          relevance_explanation: explainRelevance(query, message.content, similarity),
          session_title: message.chat_sessions?.session_title || 'Unknown Session'
        }
      })
      .filter(msg => msg !== null && msg.similarity_score > 0.7) // Only high similarity
      .sort((a, b) => b.similarity_score - a.similarity_score)
      .slice(0, 10)

    return scoredMessages
  } catch (error) {
    console.error('Error searching chat memory:', error)
    return []
  }
}

// Helper function to calculate cosine similarity
function calculateCosineSimilarity(embedding1: number[], embedding2: number[]): number {
  if (!embedding1 || !embedding2 || embedding1.length !== embedding2.length) {
    return 0
  }

  let dotProduct = 0
  let magnitude1 = 0
  let magnitude2 = 0

  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i]
    magnitude1 += embedding1[i] * embedding1[i]
    magnitude2 += embedding2[i] * embedding2[i]
  }

  magnitude1 = Math.sqrt(magnitude1)
  magnitude2 = Math.sqrt(magnitude2)

  return magnitude1 && magnitude2 ? dotProduct / (magnitude1 * magnitude2) : 0
}

// Helper function to explain why a memory is relevant
function explainRelevance(query: string, content: string, similarity: number): string {
  if (similarity > 0.9) return 'Highly relevant - very similar topic'
  if (similarity > 0.8) return 'Very relevant - related content'
  if (similarity > 0.7) return 'Relevant - some connection'
  return 'Somewhat relevant'
}

// Helper function to get recent memory context for new messages
async function getRecentMemoryContext(userId: string, currentContent: string) {
  const recentMemories = await searchChatMemory(userId, currentContent)
  
  return {
    similar_past_conversations: recentMemories.slice(0, 3),
    memory_count: recentMemories.length,
    context_available: recentMemories.length > 0,
    suggestions: generateContextSuggestions(recentMemories)
  }
}

// Helper function to generate conversation summary using AI
async function generateConversationSummary(conversationText: string): Promise<string> {
  // This would use OpenAI to generate a summary
  // For now, return a simple summary
  const lines = conversationText.split('\n')
  const userMessages = lines.filter(l => l.startsWith('user:')).length
  const assistantMessages = lines.filter(l => l.startsWith('assistant:')).length
  
  return `Conversation summary: ${userMessages} user messages, ${assistantMessages} assistant responses. Topics discussed include content creation, AI assistance, and feedback.`
}

// Helper function to analyze session memory patterns
async function analyzeSessionMemory(sessionId: string) {
  const { data: messages } = await supabase
    .from('chat_messages')
    .select('content, message_type, context_type, created_at')
    .eq('session_id', sessionId)

  if (!messages || messages.length === 0) {
    return { patterns: [], insights: [] }
  }

  const patterns = []
  const userMessages = messages.filter(m => m.message_type === 'user')
  const assistantMessages = messages.filter(m => m.message_type === 'assistant')
  
  patterns.push({
    type: 'conversation_flow',
    value: `${userMessages.length} user messages, ${assistantMessages.length} assistant responses`
  })

  const contextTypes = [...new Set(messages.map(m => m.context_type))]
  patterns.push({
    type: 'topics_covered',
    value: contextTypes.join(', ')
  })

  return {
    patterns,
    insights: [
      `Active conversation with ${messages.length} total messages`,
      `Covered topics: ${contextTypes.join(', ')}`,
      `Session duration: ${getSessionDuration(messages)}`
    ]
  }
}

// Helper function to get session duration
function getSessionDuration(messages: any[]): string {
  if (messages.length < 2) return 'Just started'
  
  const first = new Date(messages[0].created_at)
  const last = new Date(messages[messages.length - 1].created_at)
  const diffMinutes = Math.round((last.getTime() - first.getTime()) / (1000 * 60))
  
  if (diffMinutes < 60) return `${diffMinutes} minutes`
  const hours = Math.round(diffMinutes / 60)
  return `${hours} hours`
}

// Helper function to get user memory statistics
async function getUserMemoryStats(userId: string) {
  const { data: sessions } = await supabase
    .from('chat_sessions')
    .select('id, message_count, created_at')
    .eq('user_id', userId)

  const { count: totalMessages } = await supabase
    .from('chat_messages')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  const { count: messagesWithEmbeddings } = await supabase
    .from('chat_messages')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .not('embedding', 'is', null)

  return {
    total_sessions: sessions?.length || 0,
    total_messages: totalMessages || 0,
    messages_with_embeddings: messagesWithEmbeddings || 0,
    memory_coverage: messagesWithEmbeddings && totalMessages ? 
      Math.round((messagesWithEmbeddings / totalMessages) * 100) : 0
  }
}

// Helper function to get conversation insights
async function getConversationInsights(userId: string) {
  const { data: recentMessages } = await supabase
    .from('chat_messages')
    .select('content, context_type, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (!recentMessages || recentMessages.length === 0) {
    return { insights: [], trends: [] }
  }

  const contextTypes = recentMessages.reduce((acc, msg) => {
    acc[msg.context_type] = (acc[msg.context_type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const topContexts = Object.entries(contextTypes)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)

  return {
    insights: [
      `Most common topics: ${topContexts.map(([type, count]) => `${type} (${count})`).join(', ')}`,
      `Recent activity: ${recentMessages.length} messages in chat history`,
      `Active user with regular AI assistance usage`
    ],
    trends: topContexts.map(([type, count]) => ({ type, count, percentage: Math.round((count / recentMessages.length) * 100) }))
  }
}

// Helper function to generate context suggestions
function generateContextSuggestions(memories: any[]): string[] {
  if (memories.length === 0) return []
  
  const suggestions = []
  
  if (memories.some(m => m.context_type === 'caption_request')) {
    suggestions.push('I remember helping you with captions before')
  }
  
  if (memories.some(m => m.context_type === 'content_ideas')) {
    suggestions.push('We\'ve discussed content strategy previously')
  }
  
  if (memories.some(m => m.content.toLowerCase().includes('engagement'))) {
    suggestions.push('Engagement has been a recurring topic for you')
  }

  return suggestions
}

// Helper function to generate search insights
function generateSearchInsights(memories: any[]) {
  if (memories.length === 0) {
    return { summary: 'No relevant memories found', recommendations: [] }
  }

  const avgSimilarity = memories.reduce((sum, m) => sum + m.similarity_score, 0) / memories.length
  const contextTypes = [...new Set(memories.map(m => m.context_type))]
  
  return {
    summary: `Found ${memories.length} relevant memories with ${Math.round(avgSimilarity * 100)}% average relevance`,
    recommendations: [
      `Previous discussions covered: ${contextTypes.join(', ')}`,
      `Strong memory connections available for context`,
      memories.length > 3 ? 'Rich conversation history to draw from' : 'Building conversation context'
    ]
  }
} 