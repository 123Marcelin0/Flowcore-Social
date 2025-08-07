'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import AIFeedbackCollector from './ai-feedback-collector'
import { 
  Brain, 
  MessageCircle, 
  User, 
  Bot, 
  Send, 
  History, 
  Sparkles, 
  Search,
  Clock,
  Target,
  Lightbulb,
  TrendingUp,
  Archive
} from 'lucide-react'

interface MessageMetadata {
  // User message metadata
  user_input?: boolean
  length?: number
  
  // Assistant message metadata
  generated_response?: boolean
  memory_context_used?: boolean
  similar_conversations_found?: number
  
  // General metadata
  context_type?: string
  session_id?: string
  timestamp?: string
  [key: string]: any // Allow for future extensibility
}

interface ChatMessage {
  id: string
  message_type: 'user' | 'assistant' | 'system'
  content: string
  context_type: string
  created_at: string
  metadata?: MessageMetadata
  similarity_score?: number
  session_title?: string
}

interface MemoryContext {
  similar_past_conversations: ChatMessage[]
  memory_count: number
  context_available: boolean
  suggestions: string[]
}

interface ChatSession {
  id: string
  session_title: string
  last_activity: string
  message_count: number
  context_type: string
}

export default function IntelligentAIAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [memoryContext, setMemoryContext] = useState<MemoryContext | null>(null)
  const [showMemoryPanel, setShowMemoryPanel] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ChatMessage[]>([])
  const [recentSessions, setRecentSessions] = useState<ChatSession[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load recent sessions on component mount
  useEffect(() => {
    loadRecentSessions()
  }, [])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadRecentSessions = async () => {
    try {
      const response = await fetch('/api/chat-memory')
      const data = await response.json()
      
      if (data.success) {
        setRecentSessions(data.data.recent_sessions || [])
      }
    } catch (error) {
      console.error('Failed to load recent sessions:', error)
    }
  }

  const storeMessage = async (content: string, messageType: 'user' | 'assistant', contextType = 'chat', metadata: MessageMetadata = {}) => {
    try {
      const response = await fetch('/api/chat-memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: currentSessionId,
          message_type: messageType,
          content: content,
          context_type: contextType,
          metadata: metadata
        })
      })

      const data = await response.json()
      
      if (data.success) {
        // Update current session ID if this is a new session
        if (!currentSessionId) {
          setCurrentSessionId(data.data.session_id)
        }
        
        // Update memory context if provided
        if (data.data.memory_context) {
          setMemoryContext(data.data.memory_context)
        }

        return data.data
      }
    } catch (error) {
      console.error('Failed to store message:', error)
    }
    return null
  }

  const generateAIResponse = async (userMessage: string, context: MemoryContext | null) => {
    // Simulate AI response generation with memory context
    const responses = [
      // Context-aware responses
      ...(context?.similar_past_conversations?.length ? [
        `I remember we discussed similar topics before! Based on our previous conversations about ${context.similar_past_conversations[0]?.context_type}, here's my updated perspective...`,
        `Looking at our chat history, I see you've been working on ${context.similar_past_conversations[0]?.context_type}. Building on what we discussed earlier...`,
        `Great question! This reminds me of when we talked about ${extractTopicFromContent(context.similar_past_conversations[0]?.content || '')}. Let me expand on that...`
      ] : []),
      
      // Default responses
      "I'd be happy to help you with that! Let me provide some tailored suggestions.",
      "Based on your request, here are some personalized recommendations.",
      "That's an interesting question! Let me think about the best approach for your situation."
    ]

    // Add memory context to response
    let baseResponse = responses[Math.floor(Math.random() * responses.length)]
    
    if (context?.context_available) {
      baseResponse += `\n\n💭 **Memory Context**: I found ${context.memory_count} related conversations in our history. ${context.suggestions.slice(0, 2).join('. ')}.`
    }

    // Add specific advice based on user message content
    if (userMessage.toLowerCase().includes('caption')) {
      baseResponse += "\n\n📝 For captions, I recommend focusing on your established voice while incorporating engagement elements."
    } else if (userMessage.toLowerCase().includes('content idea')) {
      baseResponse += "\n\n💡 For content ideas, let's build on what's worked well for you before while exploring new angles."
    } else if (userMessage.toLowerCase().includes('engagement')) {
      baseResponse += "\n\n📊 For engagement, consistency with your brand voice has been key in our past discussions."
    }

    return baseResponse
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || loading) return

    const userMessage = inputValue.trim()
    setInputValue('')
    setLoading(true)

    // Add user message to UI immediately
    const userMsgId = `user-${Date.now()}`
    const newUserMessage: ChatMessage = {
      id: userMsgId,
      message_type: 'user',
      content: userMessage,
      context_type: 'chat',
      created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, newUserMessage])

    try {
      // Store user message and get memory context
      const storeResult = await storeMessage(userMessage, 'user', 'chat', {
        user_input: true,
        length: userMessage.length
      })

      // Generate AI response with memory context
      const aiResponse = await generateAIResponse(userMessage, storeResult?.memory_context || null)

      // Add AI response to UI
      const assistantMsgId = `assistant-${Date.now()}`
      const aiMessage: ChatMessage = {
        id: assistantMsgId,
        message_type: 'assistant',
        content: aiResponse,
        context_type: 'chat',
        created_at: new Date().toISOString()
      }
      setMessages(prev => [...prev, aiMessage])

      // Store AI response
      await storeMessage(aiResponse, 'assistant', 'chat', {
        generated_response: true,
        memory_context_used: !!storeResult?.memory_context?.context_available,
        similar_conversations_found: storeResult?.memory_context?.memory_count || 0
      })

      // Update memory context display
      if (storeResult?.memory_context) {
        setMemoryContext(storeResult.memory_context)
      }

    } catch (error) {
      console.error('Error sending message:', error)
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        message_type: 'system',
        content: 'Sorry, I encountered an error. Please try again.',
        context_type: 'error',
        created_at: new Date().toISOString()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const searchMemory = async () => {
    if (!searchQuery.trim()) return

    try {
      const response = await fetch(`/api/chat-memory?query=${encodeURIComponent(searchQuery)}`)
      const data = await response.json()
      
      if (data.success) {
        setSearchResults(data.data.relevant_memories || [])
      }
    } catch (error) {
      console.error('Memory search failed:', error)
    }
  }

  const loadSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/chat-memory?session_id=${sessionId}`)
      const data = await response.json()
      
      if (data.success) {
        setCurrentSessionId(sessionId)
        setMessages(data.data.messages || [])
        setShowMemoryPanel(false)
      }
    } catch (error) {
      console.error('Failed to load session:', error)
    }
  }

  const startNewSession = () => {
    setCurrentSessionId(null)
    setMessages([])
    setMemoryContext(null)
    setShowMemoryPanel(false)
  }

  const extractTopicFromContent = (content: string): string => {
    if (content.includes('caption')) return 'caption creation'
    if (content.includes('content')) return 'content strategy'
    if (content.includes('engagement')) return 'engagement optimization'
    if (content.includes('real estate')) return 'real estate marketing'
    return 'content creation'
  }

  const getMessageIcon = (messageType: string) => {
    switch (messageType) {
      case 'user': return <User className="w-4 h-4" />
      case 'assistant': return <Bot className="w-4 h-4" />
      case 'system': return <Archive className="w-4 h-4" />
      default: return <MessageCircle className="w-4 h-4" />
    }
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="w-8 h-8" />
            🧠 Intelligent AI Assistant
          </h1>
          <p className="text-gray-600">Memory-powered conversations that learn and remember</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowMemoryPanel(!showMemoryPanel)}
            className="flex items-center gap-2"
          >
            <History className="w-4 h-4" />
            Memory Panel
          </Button>
          <Button
            variant="outline"
            onClick={startNewSession}
            className="flex items-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            New Chat
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chat Area */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Chat Session
                {currentSessionId && (
                  <Badge variant="secondary" className="text-xs">
                    Session Active
                  </Badge>
                )}
              </CardTitle>
              
              {memoryContext?.context_available && (
                <Badge className="bg-blue-100 text-blue-700 flex items-center gap-1">
                  <Brain className="w-3 h-3" />
                  {memoryContext.memory_count} memories
                </Badge>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Messages */}
            <ScrollArea className="h-96">
              <div className="space-y-4 pr-4">
                {messages.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <Brain className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p>Start a conversation! I'll remember our discussion for future reference.</p>
                  </div>
                )}
                
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.message_type === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        message.message_type === 'user'
                          ? 'bg-blue-600 text-white'
                          : message.message_type === 'system'
                          ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {getMessageIcon(message.message_type)}
                        <span className="text-xs font-medium">
                          {message.message_type === 'user' ? 'You' : 
                           message.message_type === 'system' ? 'System' : 'AI Assistant'}
                        </span>
                        <span className="text-xs opacity-70">
                          {formatTime(message.created_at)}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </p>
                    </div>
                  </div>
                ))}
                
                {loading && (
                  <div className="flex gap-3 justify-start">
                    <div className="bg-gray-100 text-gray-900 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Bot className="w-4 h-4" />
                        <span className="text-xs font-medium">AI Assistant</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Sparkles className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Thinking with memory context...</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask me anything... I'll remember our conversation!"
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1"
              />
              <Button 
                onClick={handleSendMessage} 
                disabled={!inputValue.trim() || loading}
                size="sm"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>

            {/* Memory Context Display */}
            {memoryContext?.context_available && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <Brain className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-blue-900 text-sm">Memory Context Active</h4>
                      <p className="text-xs text-blue-700 mt-1">
                        Found {memoryContext.memory_count} related conversations
                      </p>
                      {memoryContext.suggestions.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {memoryContext.suggestions.slice(0, 2).map((suggestion, index) => (
                            <div key={index} className="text-xs text-blue-600 flex items-center gap-1">
                              <Target className="w-3 h-3" />
                              {suggestion}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        {/* Memory Panel */}
        <Card className={showMemoryPanel ? 'block' : 'hidden lg:block'}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Memory & History
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Memory Search */}
            <div>
              <div className="flex gap-2 mb-3">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search conversation history..."
                  onKeyPress={(e) => e.key === 'Enter' && searchMemory()}
                  className="text-sm"
                />
                <Button size="sm" onClick={searchMemory}>
                  <Search className="w-4 h-4" />
                </Button>
              </div>
              
              {searchResults.length > 0 && (
                <div className="space-y-2 mb-4">
                  <h4 className="text-sm font-medium">Search Results:</h4>
                  {searchResults.slice(0, 3).map((result) => (
                    <div key={result.id} className="p-2 bg-gray-50 rounded text-xs">
                      <div className="flex items-center gap-1 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {Math.round((result.similarity_score || 0) * 100)}% match
                        </Badge>
                        <span className="text-gray-500">{result.session_title}</span>
                      </div>
                      <p className="text-gray-700 line-clamp-2">
                        {result.content.slice(0, 100)}...
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Sessions */}
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Recent Sessions
              </h4>
              <div className="space-y-2">
                {recentSessions.slice(0, 5).map((session) => (
                  <div
                    key={session.id}
                    onClick={() => loadSession(session.id)}
                    className="p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium truncate">
                        {session.session_title}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {session.message_count}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(session.last_activity).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Memory Stats */}
            {memoryContext && (
              <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                <h4 className="text-sm font-medium text-purple-900 mb-2">Memory Insights</h4>
                <div className="space-y-1 text-xs text-purple-700">
                  <div>📊 {memoryContext.memory_count} related memories found</div>
                  <div>🎯 Context-aware responses enabled</div>
                  <div>🧠 Learning from conversation patterns</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* How Memory Works */}
      <Card className="bg-gray-50 border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            🔧 How Intelligent Memory Works
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <div className="font-medium mb-1">💾 **Conversation Storage**:</div>
            <p className="text-gray-600">Every message is stored with embeddings for semantic search and context retrieval</p>
          </div>
          <div>
            <div className="font-medium mb-1">🔍 **Memory Search**:</div>
            <p className="text-gray-600">AI finds relevant past conversations to inform current responses and avoid repetition</p>
          </div>
          <div>
            <div className="font-medium mb-1">🎯 **Personalized Responses**:</div>
            <p className="text-gray-600">References your previous discussions, goals, and preferences for contextual assistance</p>
          </div>
          <div>
            <div className="font-medium mb-1">📈 **Long-term Learning**:</div>
            <p className="text-gray-600">Builds understanding of your needs over time, remembering what works best for you</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 