"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useState, useRef, useEffect, useCallback, memo, useMemo } from "react"
import {
  Search,
  Sparkles,
  Send,
  X,
  Bot,
  Loader2
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface ChatMessage {
  id: string
  type: 'user' | 'ai'
  message: string
  timestamp: Date
}

interface OptimizedAIChatProps {
  isOpen: boolean
  onToggle: () => void
}

// Memoized chat message component for better performance
const ChatMessageComponent = memo(function ChatMessageComponent({ 
  message, 
  onSuggestionClick 
}: { 
  message: ChatMessage
  onSuggestionClick: (text: string) => void
}) {
  // Render markdown formatting for AI messages
  const renderMessageWithMarkdown = useCallback((text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g)
    
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <span key={index} className="font-semibold text-gray-900">
            {part.slice(2, -2)}
          </span>
        )
      } else {
        return part.split('\n').map((line, lineIndex, arr) => (
          <span key={`${index}-${lineIndex}`}>
            {line}
            {lineIndex < arr.length - 1 && <br />}
          </span>
        ))
      }
    })
  }, [])

  return (
    <div className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] px-5 py-4 rounded-3xl text-sm leading-relaxed break-words ${
        message.type === 'user' 
          ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-sm' 
          : 'bg-gray-50 text-gray-800 border border-gray-100 shadow-sm'
      }`} style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}>
        <div className="whitespace-pre-wrap">
          {message.type === 'ai' ? renderMessageWithMarkdown(message.message) : message.message}
        </div>
      </div>
    </div>
  )
})

// Optimized suggestion component
const SuggestionComponent = memo(function SuggestionComponent({
  suggestion,
  onClick,
  variant = 'full'
}: {
  suggestion: { id: string; text: string }
  onClick: (text: string) => void
  variant?: 'full' | 'compact'
}) {
  if (variant === 'compact') {
    return (
      <button
        onClick={() => onClick(suggestion.text)}
        className="text-left px-3 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-300 rounded-xl transition-all duration-200 group flex-1 min-w-0"
      >
        <span className="text-xs text-gray-600 group-hover:text-gray-800 leading-tight whitespace-normal">
          {suggestion.text}
        </span>
      </button>
    )
  }

  return (
    <button
      onClick={() => onClick(suggestion.text)}
      className="flex items-center gap-4 p-4 text-left bg-gradient-to-r from-gray-50 to-gray-100 hover:from-teal-50 hover:to-cyan-50 border border-gray-200 hover:border-teal-200 rounded-2xl transition-all duration-200 group"
    >
      <span className="text-2xl">💡</span>
      <span className="text-sm font-medium text-gray-700 group-hover:text-teal-700 leading-relaxed">
        {suggestion.text}
      </span>
      <Send className="w-5 h-5 text-gray-400 group-hover:text-teal-500 ml-auto transition-colors flex-shrink-0" />
    </button>
  )
})

export const OptimizedAIChat = memo(function OptimizedAIChat({ isOpen, onToggle }: OptimizedAIChatProps) {
  const [chatMessage, setChatMessage] = useState("")
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Optimized scroll to bottom with requestAnimationFrame
  const scrollToBottom = useCallback(() => {
    if (chatContainerRef.current) {
      requestAnimationFrame(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
        }
      })
    }
  }, [])

  // Scroll when chat updates
  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
    }
  }, [chatHistory, isTyping, isOpen, scrollToBottom])

  // Dynamic suggestions with memoization
  const getDynamicSuggestions = useMemo(() => {
    const messageCount = chatHistory.length
    
    if (messageCount === 0) {
      return [
        { id: 'analyze-performance', text: 'Analysiere meine Post-Performance und gib konkrete Verbesserungsvorschläge.' },
        { id: 'content-ideas', text: 'Erstelle 5 kreative Content-Ideen für meine Immobilien-Posts.' },
        { id: 'posting-strategy', text: 'Entwickle eine optimale Posting-Strategie für maximale Reichweite.' },
        { id: 'competitor-analysis', text: 'Analysiere meine Konkurrenz und zeige Differenzierungsmöglichkeiten.' }
      ]
    }

    const lastMessage = chatHistory[chatHistory.length - 1]
    const conversationText = chatHistory.slice(-3).map(m => m.message.toLowerCase()).join(' ')
    
    const suggestions: Array<{ id: string; text: string }> = []

    // Context-based suggestions
    if (lastMessage?.type === 'ai') {
      if (/content|idee|post/i.test(conversationText)) {
        suggestions.push({ id: 'create-post', text: 'Erstelle einen vollständigen Post basierend auf diesen Ideen.' })
      }
      if (/hashtag|#|tag/i.test(conversationText)) {
        suggestions.push({ id: 'hashtag-strategy', text: 'Erstelle eine Hashtag-Strategie für maximale Reichweite.' })
      }
      if (/analytics|zahlen|performance/i.test(conversationText)) {
        suggestions.push({ id: 'deep-analysis', text: 'Analysiere meine Top-Posts und erkläre warum sie erfolgreich waren.' })
      }
    }

    // Fallback suggestions
    if (suggestions.length === 0) {
      suggestions.push(
        { id: 'quick-tip', text: 'Gib mir einen schnellen Tipp zur Verbesserung meiner Posts.' },
        { id: 'content-audit', text: 'Führe ein Content-Audit durch und zeige Optimierungspotenziale.' }
      )
    }

    return suggestions.slice(0, 4)
  }, [chatHistory])

  // Optimized message processing
  const processAIResponse = useCallback((response: string | undefined | null) => {
    if (!response || typeof response !== 'string' || response.trim().length === 0) {
      return "Entschuldigung, ich konnte keine Antwort generieren. Bitte versuchen Sie es erneut."
    }

    return response
      .replace(/---[\s\S]*?(\[.*?\]\(.*?\)[\s\S]*?)*---/g, '')
      .replace(/\*\*Nächste Schritte[\s\S]*$/g, '')
      .replace(/\n\n\n+/g, '\n\n')
      .trim()
  }, [])

  // Optimized message handler with debouncing
  const handleSendMessage = useCallback(async () => {
    if (!chatMessage.trim() || isTyping) return

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      message: chatMessage,
      timestamp: new Date()
    }

    setChatHistory(prev => [...prev, newMessage])
    setChatMessage("")
    setIsTyping(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('No authentication token found')
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          query: chatMessage + "\n\nBitte antworte prägnant und strukturiert. Verwende **fett** für wichtige Begriffe und halte dich kurz, außer bei detaillierten Fragen.",
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get AI response')
      }

      const processedResponse = processAIResponse(data.message)

      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        message: processedResponse,
        timestamp: new Date()
      }
      
      setChatHistory(prev => [...prev, aiResponse])
    } catch (error) {
      console.error('Error sending message to AI:', error)
      
      let errorMessage = "Entschuldigung, ich konnte Ihre Nachricht nicht verarbeiten."
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = "Die Anfrage hat zu lange gedauert. Bitte versuchen Sie es erneut."
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = "Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung."
        }
      }
      
      const errorResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        message: errorMessage,
        timestamp: new Date()
      }
      setChatHistory(prev => [...prev, errorResponse])
      
      toast.error('Fehler beim Senden der Nachricht')
    } finally {
      setIsTyping(false)
    }
  }, [chatMessage, isTyping, processAIResponse])

  const handleSuggestionClick = useCallback((text: string) => {
    setChatMessage(text)
    setTimeout(() => {
      handleSendMessage()
    }, 100)
  }, [handleSendMessage])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setChatMessage(e.target.value)
  }, [])

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isTyping) {
      handleSendMessage()
    }
  }, [handleSendMessage, isTyping])

  if (!isOpen) {
    return null
  }

  return (
    <Card className="bg-white/95 backdrop-blur-sm border border-gray-100 shadow-lg rounded-3xl mb-4">
      <div className="p-6 flex flex-col" style={{ height: 'min(85vh, 750px)' }}>
        {/* Chat Header */}
        <div className="flex items-center justify-between mb-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-2xl flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">AI Assistant</h3>
              <p className="text-sm text-gray-500">Hier, um zu helfen</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="h-10 w-10 p-0 hover:bg-gray-100 rounded-2xl"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Chat Messages with Larger Fixed Height */}
        <div 
          className="flex-1 overflow-y-auto scroll-smooth pr-2 mb-6" 
          ref={chatContainerRef}
          style={{ 
            scrollbarWidth: 'thin',
            minHeight: '400px',
            maxHeight: '500px'
          }}
        >
          {chatHistory.length === 0 ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-gradient-to-r from-teal-500/10 to-cyan-500/10 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-teal-600" />
              </div>
              <p className="text-base text-gray-600 mb-3">Willkommen beim AI Assistant!</p>
              <p className="text-sm text-gray-500 mb-6">Wählen Sie eine Aktion oder stellen Sie mir eine Frage.</p>
              
              <div className="flex flex-col gap-4 mt-6">
                {getDynamicSuggestions.map((suggestion) => (
                  <SuggestionComponent
                    key={suggestion.id}
                    suggestion={suggestion}
                    onClick={handleSuggestionClick}
                    variant="full"
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {chatHistory.map((msg) => (
                <ChatMessageComponent
                  key={msg.id}
                  message={msg}
                  onSuggestionClick={handleSuggestionClick}
                />
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 px-4 py-3 rounded-2xl">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chat Input - Fixed at Bottom */}
        <div className="flex-shrink-0">
          {/* Dynamic Suggestion Sentences */}
          {chatHistory.length > 0 && (
            <div className="mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {getDynamicSuggestions.slice(0, 2).map((suggestion) => (
                  <SuggestionComponent
                    key={suggestion.id}
                    suggestion={suggestion}
                    onClick={handleSuggestionClick}
                    variant="compact"
                  />
                ))}
              </div>
            </div>
          )}
          
          {/* Input Field */}
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <Input
              value={chatMessage}
              onChange={handleInputChange}
              placeholder="Stellen Sie mir eine Frage..."
              className="flex-1 border-gray-200 focus:border-teal-500 focus:ring-teal-500/20 rounded-2xl h-12 px-4"
              onKeyPress={handleKeyPress}
              disabled={isTyping}
            />
            <Button
              onClick={handleSendMessage}
              size="sm"
              disabled={isTyping || !chatMessage.trim()}
              className="h-12 w-12 p-0 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isTyping ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}) 