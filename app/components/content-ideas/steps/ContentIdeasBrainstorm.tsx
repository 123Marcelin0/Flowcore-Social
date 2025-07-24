"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { 
  ArrowLeft, 
  Sparkles, 
  MessageSquare, 
  Lightbulb, 
  Target, 
  Hash, 
  Camera, 
  Video, 
  FileText, 
  Zap,
  Send,
  RefreshCw,
  Bookmark,
  Copy,
  Download,
  Wand2,
  Brain,
  Users,
  TrendingUp,
  Clock,
  Heart,
  Eye,
  Share2,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Youtube,
  Star,
  Plus,
  Save,
  MessageCircle,
  CheckCircle
} from "lucide-react"
import { toast } from 'sonner'
import type { ContentStep } from "../hooks/useContentIdeas"

interface ContentIdeasBrainstormProps {
  setCurrentStep: (step: ContentStep) => void
}

interface BrainstormIdea {
  id: string
  type: 'text' | 'hashtag' | 'visual' | 'video' | 'strategy'
  title: string
  content: string
  platform?: string[]
  tags?: string[]
  saved?: boolean
  rating?: number
}

interface BrainstormPrompt {
  id: string
  category: string
  icon: any
  title: string
  description: string
  prompts: string[]
  color: string
}

export function ContentIdeasBrainstorm({ setCurrentStep }: ContentIdeasBrainstormProps) {
  const [activeMode, setActiveMode] = useState<'prompts' | 'chat' | 'saved'>('prompts')
  const [selectedPrompt, setSelectedPrompt] = useState<BrainstormPrompt | null>(null)
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'ai', content: string, ideas?: BrainstormIdea[]}>>([])
  const [currentMessage, setCurrentMessage] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [savedIdeas, setSavedIdeas] = useState<BrainstormIdea[]>([])
  const [generatedIdeas, setGeneratedIdeas] = useState<BrainstormIdea[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const chatEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const brainstormPrompts: BrainstormPrompt[] = [
    {
      id: 'content-types',
      category: 'Content',
      icon: Lightbulb,
      title: 'Content-Typen',
      description: 'Entdecke neue Content-Formate für deine Immobilien',
      color: 'from-purple-500 to-indigo-600',
      prompts: [
        'Welche 5 Content-Formate funktionieren am besten für Immobilienmakler auf Instagram?',
        'Erstelle mir 10 kreative Post-Ideen für Luxusimmobilien',
        'Wie kann ich Kundenerfolgsgeschichten spannend präsentieren?',
        'Welche Behind-the-Scenes Inhalte interessieren potenzielle Käufer?'
      ]
    },
    {
      id: 'platforms',
      category: 'Plattformen',
      icon: Target,
      title: 'Plattform-Strategien',
      description: 'Optimiere deine Inhalte für verschiedene Plattformen',
      color: 'from-violet-500 to-purple-600',
      prompts: [
        'Wie unterscheide ich meine Content-Strategie zwischen Instagram und LinkedIn?',
        'Erstelle mir TikTok-Video-Ideen für junge Hauskäufer',
        'Welche Facebook-Posts generieren die meisten Leads?',
        'Wie nutze ich YouTube für Immobilienmarketing?'
      ]
    },
    {
      id: 'hashtags',
      category: 'Hashtags',
      icon: Hash,
      title: 'Hashtag-Ideen',
      description: 'Finde die perfekten Hashtags für maximale Reichweite',
      color: 'from-fuchsia-500 to-purple-600',
      prompts: [
        'Erstelle mir 30 relevante Hashtags für Luxusimmobilien',
        'Welche lokalen Hashtags sollte ich für [Stadt] nutzen?',
        'Finde Nischen-Hashtags für Ersthauskäufer',
        'Welche Trending-Hashtags passen zu Immobilien?'
      ]
    },
    {
      id: 'visuals',
      category: 'Visuell',
      icon: Camera,
      title: 'Visual Content',
      description: 'Kreative Ideen für Fotos und Grafiken',
      color: 'from-purple-600 to-pink-600',
      prompts: [
        'Welche 10 Foto-Shots sollte ich bei jedem Hausbesuch machen?',
        'Erstelle mir Ideen für Instagram Story Templates',
        'Wie inszeniere ich Immobilienfotos professionell?',
        'Welche Infografiken interessieren Immobilienkäufer?'
      ]
    },
    {
      id: 'engagement',
      category: 'Engagement',
      icon: Heart,
      title: 'Engagement-Booster',
      description: 'Erhöhe Interaktionen und baue Community auf',
      color: 'from-indigo-500 to-purple-600',
      prompts: [
        'Erstelle mir 20 Fragen für mehr Engagement in Posts',
        'Welche Call-to-Actions funktionieren bei Immobilien-Content?',
        'Wie starte ich interessante Diskussionen über Immobilien?',
        'Welche Umfragen kann ich in Stories verwenden?'
      ]
    },
    {
      id: 'trends',
      category: 'Trends',
      icon: TrendingUp,
      title: 'Trend-Integration',
      description: 'Nutze aktuelle Trends für dein Immobilienmarketing',
      color: 'from-purple-500 to-pink-500',
      prompts: [
        'Wie kann ich aktuelle TikTok-Trends für Immobilien nutzen?',
        'Welche saisonalen Trends sollte ich beachten?',
        'Erstelle mir viralen Content für den Herbst-Immobilienmarkt',
        'Wie integriere ich Lifestyle-Trends in Immobilien-Posts?'
      ]
    }
  ]

  // Mock AI response function
  const generateAIResponse = async (userMessage: string, prompt?: BrainstormPrompt) => {
    setIsGenerating(true)
    await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate AI delay

    // Generate mock ideas based on the message/prompt
    const mockIdeas: BrainstormIdea[] = [
      {
        id: '1',
        type: 'text',
        title: 'Virtual House Tour Series',
        content: 'Erstelle eine wöchentliche Serie mit virtuellen Haustouren, bei denen du durch verschiedene Immobilien führst und dabei wichtige Details erklärst.',
        platform: ['instagram', 'youtube'],
        tags: ['immobilien', 'haustour', 'virtuell'],
        rating: 5
      },
      {
        id: '2',
        type: 'visual',
        title: 'Before & After Staging',
        content: 'Zeige dramatische Vorher-Nachher-Bilder von Home Staging Projekten. Diese Posts generieren hohe Engagement-Raten.',
        platform: ['instagram', 'facebook'],
        tags: ['homestaging', 'vorher-nachher', 'design'],
        rating: 4
      },
      {
        id: '3',
        type: 'hashtag',
        title: 'Lokale Hashtag-Strategie',
        content: '#[StadtName]Immobilien #[StadtName]Makler #TraumhausIn[Stadt] #[Stadt]Lifestyle #Immobilie[Stadtteil] #WohnenIn[Stadt]',
        platform: ['instagram'],
        tags: ['lokal', 'hashtags', 'regional'],
        rating: 5
      }
    ]

    const aiResponse = prompt ? 
      `Hier sind kreative Ideen basierend auf "${prompt.title}":` :
      `Basierend auf deiner Anfrage "${userMessage}" habe ich diese Ideen für dich:`

    setChatMessages(prev => [...prev, {
      role: 'ai',
      content: aiResponse,
      ideas: mockIdeas
    }])
    
    setGeneratedIdeas(mockIdeas)
    setIsGenerating(false)
  }

  const handleSendMessage = async () => {
    if (!currentMessage.trim()) return

    setChatMessages(prev => [...prev, { role: 'user', content: currentMessage }])
    const message = currentMessage
    setCurrentMessage('')
    
    await generateAIResponse(message)
  }

  const handlePromptSelect = async (prompt: BrainstormPrompt, selectedPromptText: string) => {
    setChatMessages(prev => [...prev, { role: 'user', content: selectedPromptText }])
    await generateAIResponse(selectedPromptText, prompt)
    setActiveMode('chat')
  }

  const handleSaveIdea = (idea: BrainstormIdea) => {
    if (!savedIdeas.find(s => s.id === idea.id)) {
      setSavedIdeas(prev => [...prev, { ...idea, saved: true }])
      toast.success('Idee gespeichert!')
    }
  }

  const handleCopyIdea = (idea: BrainstormIdea) => {
    navigator.clipboard.writeText(idea.content)
    toast.success('In Zwischenablage kopiert!')
  }

  const renderPromptMode = () => (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Quick Start Section */}
      <div className="mb-12">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Womit möchtest du brainstormen?</h2>
          <p className="text-gray-600">Wähle eine Kategorie oder starte direkt mit dem freien Chat</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {brainstormPrompts.map((prompt) => {
            const IconComponent = prompt.icon
            return (
              <Card key={prompt.id} className="group cursor-pointer hover:shadow-lg transition-all duration-300 border-0 bg-white rounded-2xl overflow-hidden">
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className={`w-16 h-16 bg-gradient-to-br ${prompt.color} rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}>
                      <IconComponent className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{prompt.title}</h3>
                    <p className="text-gray-600 text-sm mb-4">{prompt.description}</p>
                    
                    {/* Quick Prompts */}
                    <div className="space-y-2">
                      {prompt.prompts.slice(0, 2).map((promptText, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          className="w-full text-left justify-start text-xs h-auto py-2 px-3 text-gray-700 hover:bg-purple-50 hover:border-purple-200"
                          onClick={() => handlePromptSelect(prompt, promptText)}
                        >
                          <MessageCircle className="w-3 h-3 mr-2 flex-shrink-0" />
                          <span className="truncate">{promptText}</span>
                        </Button>
                      ))}
                    </div>
                    
                    <Button
                      className={`w-full mt-4 bg-gradient-to-r ${prompt.color} text-white hover:opacity-90 transition-opacity`}
                      onClick={() => {
                        setSelectedPrompt(prompt)
                        setActiveMode('chat')
                      }}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Mehr Ideen
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Free Chat Starter */}
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-8 text-center">
        <Brain className="w-16 h-16 text-purple-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-4">Freies Brainstorming</h3>
        <p className="text-gray-600 mb-6">Hast du eine spezielle Frage oder Idee? Starte einfach ein freies Gespräch mit unserem AI-Assistant!</p>
        <Button
          size="lg"
          className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:opacity-90 transition-opacity"
          onClick={() => setActiveMode('chat')}
        >
          <MessageSquare className="w-5 h-5 mr-2" />
          Chat starten
        </Button>
      </div>
    </div>
  )

  const renderChatMode = () => (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Chat Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden" style={{ height: '70vh' }}>
        {/* Chat Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold">AI Brainstorm Assistant</h3>
                <p className="text-purple-100 text-sm">Bereit für kreative Ideen</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
              onClick={() => setActiveMode('prompts')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Zurück
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ height: 'calc(70vh - 160px)' }}>
          {chatMessages.length === 0 && (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Lass uns brainstormen!</h4>
              <p className="text-gray-600">Stelle mir eine Frage oder beschreibe, womit ich dir helfen kann.</p>
            </div>
          )}
          
          {chatMessages.map((message, index) => (
            <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl p-4 ${
                message.role === 'user' 
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white' 
                  : 'bg-gray-100 text-gray-900'
              }`}>
                <p className="mb-2">{message.content}</p>
                
                {/* Render generated ideas */}
                {message.ideas && (
                  <div className="mt-4 space-y-3">
                    {message.ideas.map((idea) => (
                      <div key={idea.id} className="bg-white rounded-xl p-4 text-gray-900">
                        <div className="flex items-start justify-between mb-2">
                          <h5 className="font-semibold text-purple-900">{idea.title}</h5>
                          <div className="flex gap-1">
                            {[...Array(idea.rating || 5)].map((_, i) => (
                              <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 mb-3">{idea.content}</p>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex gap-1">
                            {idea.tags?.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => handleCopyIdea(idea)}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => handleSaveIdea(idea)}
                            >
                              <Bookmark className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isGenerating && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl p-4 max-w-[80%]">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-600 border-t-transparent"></div>
                  <span className="text-gray-600">Generiere kreative Ideen...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex gap-3">
            <Textarea
              ref={textareaRef}
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              placeholder="Beschreibe deine Idee oder stelle eine Frage..."
              className="flex-1 min-h-[50px] max-h-[100px] resize-none border-gray-300 focus:border-purple-500 focus:ring-purple-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!currentMessage.trim() || isGenerating}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:opacity-90 transition-opacity"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )

  const renderSavedMode = () => (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Gespeicherte Ideen ({savedIdeas.length})</h2>
        <p className="text-gray-600">Deine gesammelten Brainstorming-Ergebnisse</p>
      </div>

      {savedIdeas.length === 0 ? (
        <div className="text-center py-12">
          <Bookmark className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Noch keine Ideen gespeichert</p>
          <p className="text-sm text-gray-500 mt-2">Speichere Ideen während des Brainstormings</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedIdeas.map((idea) => (
            <Card key={idea.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-semibold text-purple-900">{idea.title}</h4>
                  <div className="flex gap-1">
                    {[...Array(idea.rating || 5)].map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </div>
                
                <p className="text-gray-700 text-sm mb-4">{idea.content}</p>
                
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {idea.tags?.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => handleCopyIdea(idea)}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => setCurrentStep('develop')}
                    >
                      <Wand2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatMessages])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={() => setCurrentStep("overview")}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 rounded-lg bg-transparent hover:bg-gray-100"
            >
              <ArrowLeft className="w-4 h-4" />
              Zurück
            </Button>
            
            {/* Centered KI-Brainstorming Button with Purple Gradient */}
            <button className="relative inline-flex items-center gap-3 px-8 py-3 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 font-medium text-xl transition-all duration-300 ease-in-out group hover:scale-105">
              {/* Pulse effect on hover */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 opacity-0 group-hover:opacity-75 group-hover:animate-ping"></div>
              
              {/* Hover glow effect */}
              <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-300 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 blur-md"></div>
              
              {/* Content with white text */}
              <Brain className="w-6 h-6 relative z-10 text-white" />
              <span className="relative z-10 text-white">KI-Brainstorming</span>
            </button>
            
            <div className="w-20"></div>
          </div>
        </div>
      </div>

      {/* Mode Navigation */}
      <div className="max-w-7xl mx-auto px-6 mb-6">
        <div className="flex justify-center">
          <div className="bg-white rounded-full p-1 shadow-sm border border-gray-200">
            <div className="flex gap-1">
              <Button
                variant={activeMode === 'prompts' ? 'default' : 'ghost'}
                size="sm"
                className={`rounded-full ${activeMode === 'prompts' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white' : 'text-gray-600'}`}
                onClick={() => setActiveMode('prompts')}
              >
                <Lightbulb className="w-4 h-4 mr-2" />
                Kategorien
              </Button>
              <Button
                variant={activeMode === 'chat' ? 'default' : 'ghost'}
                size="sm"
                className={`rounded-full ${activeMode === 'chat' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white' : 'text-gray-600'}`}
                onClick={() => setActiveMode('chat')}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Chat
              </Button>
              <Button
                variant={activeMode === 'saved' ? 'default' : 'ghost'}
                size="sm"
                className={`rounded-full ${activeMode === 'saved' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white' : 'text-gray-600'}`}
                onClick={() => setActiveMode('saved')}
              >
                <Bookmark className="w-4 h-4 mr-2" />
                Gespeichert ({savedIdeas.length})
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {activeMode === 'prompts' && renderPromptMode()}
      {activeMode === 'chat' && renderChatMode()}
      {activeMode === 'saved' && renderSavedMode()}
    </div>
  )
} 