"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { v4 as uuidv4 } from 'uuid';
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
import { ContentIdeaService } from "@/lib/content-idea-service"
import { useAuth } from "@/lib/auth-context"

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
  used?: boolean
  performance?: {
    engagement: number
    likes: number
    comments: number
    conversion: number
  }
  createdAt?: Date
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

interface UserContext {
  recentPosts: Array<{
    content: string
    platform: string
    engagement: number
    type: string
  }>
  bestPerformingTags: string[]
  preferredPlatforms: string[]
  contentPreferences: string[]
  usedIdeas: string[]
}

export function ContentIdeasBrainstorm({ setCurrentStep }: ContentIdeasBrainstormProps) {
  const { user } = useAuth()
  const [activeMode, setActiveMode] = useState<'prompts' | 'chat' | 'saved'>('prompts')
  const [selectedPrompt, setSelectedPrompt] = useState<BrainstormPrompt | null>(null)
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'ai', content: string, ideas?: BrainstormIdea[]}>>([])
  const [currentMessage, setCurrentMessage] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [savedIdeas, setSavedIdeas] = useState<BrainstormIdea[]>([])
  const [generatedIdeas, setGeneratedIdeas] = useState<BrainstormIdea[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [userContext, setUserContext] = useState<UserContext>({
    recentPosts: [],
    bestPerformingTags: ['immobilien', 'traumhaus', 'luxury', 'investment'],
    preferredPlatforms: ['instagram', 'linkedin'],
    contentPreferences: ['luxury', 'tips', 'market-insights'],
    usedIdeas: []
  })
  const [ideaHistory, setIdeaHistory] = useState<BrainstormIdea[]>([])
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

  // Intelligent AI response function with context awareness
  const generateAIResponse = async (userMessage: string, prompt?: BrainstormPrompt) => {
    setIsGenerating(true)
    await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate AI delay

    // Get contextual ideas based on user's performance and preferences
    const contextualIdeas = generateContextualIdeas(userMessage, prompt)
    
    // Filter out ideas that are too similar to previously used ones
    const filteredIdeas = filterSimilarIdeas(contextualIdeas)
    
    // Add performance prediction and rating
    const enhancedIdeas = addPerformancePrediction(filteredIdeas)
    
    // Generate contextual AI response
    const aiResponse = generateContextualResponse(userMessage, enhancedIdeas, prompt)

    setChatMessages(prev => [...prev, {
      role: 'ai',
      content: aiResponse,
      ideas: enhancedIdeas
    }])
    
    setGeneratedIdeas(enhancedIdeas)
    setIdeaHistory(prev => [...prev, ...enhancedIdeas])
    setIsGenerating(false)
  }

  // Generate contextual ideas based on user behavior and performance
  const generateContextualIdeas = (userMessage: string, prompt?: BrainstormPrompt): BrainstormIdea[] => {
    const ideaPools = {
      'content-types': [
        {
          id: uuidv4(),
          type: 'video' as const,
          title: 'Immobilien-Marktanalyse Serie',
          content: 'Erstelle wöchentliche Videos über lokale Markttrends, Preisentwicklungen und Investitionschancen in deiner Region.',
          platform: ['instagram', 'youtube', 'linkedin'],
          tags: ['marktanalyse', 'trends', 'investment']
        },
        {
          id: uuidv4(),
          type: 'visual' as const,
          title: 'Kunden-Success-Stories',
          content: 'Teile anonymisierte Erfolgsgeschichten deiner Kunden mit Before/After Bildern ihrer neuen Homes.',
          platform: ['instagram', 'facebook'],
          tags: ['success', 'kunden', 'transformation']
        },
        {
          id: uuidv4(),
          type: 'text' as const,
          title: 'Finanzierungstipps für Erstkäufer',
          content: 'Erstelle eine Infografik-Serie mit praktischen Tipps zur Immobilienfinanzierung für junge Familien.',
          platform: ['instagram', 'linkedin'],
          tags: ['finanzierung', 'erstkaeufer', 'tipps']
        }
      ],
      'hashtags': [
        {
          id: uuidv4(),
          type: 'hashtag' as const,
          title: 'Engagement-Optimierte Hashtag-Sets',
          content: `Hochperformance-Set: #LuxusImmobilien #TraumhausGefunden #ImmobilienExperte #ExklusiveObjekte #PremiumMakler\n\nNischen-Set: #ErsthauskäuferTipps #FinanzierungsBeratung #ImmobilienInvestment #ModernesWohnen #NachhaltigeBauweise`,
          platform: ['instagram'],
          tags: ['engagement', 'reichweite', 'targeting']
        },
        {
          id: uuidv4(),
          type: 'hashtag' as const,
          title: 'Lokale Community Hashtags',
          content: `#[Stadt]Immobilien #[Stadt]Makler #WohnenIn[Stadt] #[Stadt]Lifestyle #Immobilien[Bezirk] #[Stadt]Architecture #[Stadt]PropertyMarket`,
          platform: ['instagram', 'facebook'],
          tags: ['lokal', 'community', 'regional']
        }
      ],
      'platforms': [
        {
          id: uuidv4(),
          type: 'strategy' as const,
          title: 'LinkedIn Authority Building',
          content: 'Positioniere dich als Marktexperte durch täglich einen wertvollen Tipp oder Marktinsight. Nutze LinkedIn Artikel für tiefere Analysen.',
          platform: ['linkedin'],
          tags: ['authority', 'expertise', 'networking']
        },
        {
          id: uuidv4(),
          type: 'video' as const,
          title: 'TikTok Trend-Integration',
          content: 'Nutze populäre TikTok-Sounds für "Day in the Life of a Realtor" Content oder "House Hunt with me" Videos.',
          platform: ['tiktok', 'instagram'],
          tags: ['trends', 'viral', 'entertainment']
        }
      ],
      'engagement': [
        {
          id: uuidv4(),
          type: 'text' as const,
          title: 'Interactive Story-Umfragen',
          content: 'Erstelle wöchentliche "This or That" Umfragen: Moderner vs. Klassischer Stil, Stadt vs. Land, Neubau vs. Altbau.',
          platform: ['instagram'],
          tags: ['interaction', 'stories', 'engagement']
        },
        {
          id: uuidv4(),
          type: 'text' as const,
          title: 'Community Challenge',
          content: 'Starte eine #TraumhausChallenge wo Follower ihre Wunschimmobilie beschreiben und du passende Objekte vorstellst.',
          platform: ['instagram', 'facebook'],
          tags: ['challenge', 'community', 'ugc']
        }
      ],
      'visuals': [
        {
          id: uuidv4(),
          type: 'visual' as const,
          title: 'Saisonale Immobilien-Aesthetics',
          content: 'Zeige dieselbe Immobilie in verschiedenen Jahreszeiten oder Tageszeiten um emotionale Verbindungen zu schaffen.',
          platform: ['instagram', 'pinterest'],
          tags: ['seasonal', 'emotions', 'aesthetics']
        },
        {
          id: uuidv4(),
          type: 'visual' as const,
          title: 'Makler-Behind-the-Scenes',
          content: 'Dokumentiere deinen Alltag: Objektbesichtigungen, Kundengespräche, Vertragsvorbereitung - authentisch und professionell.',
          platform: ['instagram', 'tiktok'],
          tags: ['authentic', 'bts', 'personal-brand']
        }
      ],
      'trends': [
        {
          id: uuidv4(),
          type: 'video' as const,
          title: 'Sustainable Living Trend',
          content: 'Erstelle Content über nachhaltige Immobilien, Energieeffizienz und umweltfreundliche Bauweisen - hochaktueller Trend.',
          platform: ['instagram', 'linkedin', 'tiktok'],
          tags: ['sustainability', 'green', 'future']
        },
        {
          id: uuidv4(),
          type: 'text' as const,
          title: 'Remote Work Spaces',
          content: 'Zeige perfekte Home-Office Setups in deinen Immobilien und erkläre warum Remote-Work-taugliche Homes gefragter sind.',
          platform: ['linkedin', 'instagram'],
          tags: ['remote-work', 'lifestyle', 'modern']
        }
      ]
    }

    const categoryKey = prompt?.id || 'content-types'
    const baseIdeas = ideaPools[categoryKey as keyof typeof ideaPools] || ideaPools['content-types']
    
    // Add variety by mixing different idea pools if user has used many ideas
    if (userContext.usedIdeas.length > 10) {
      const mixedIdeas = Object.values(ideaPools).flat().filter(idea => 
        !userContext.usedIdeas.includes(idea.id)
      )
      return mixedIdeas.slice(0, 3)
    }
    
    return baseIdeas.slice(0, 3)
  }

  // Filter out ideas too similar to previously used ones
  const filterSimilarIdeas = (ideas: BrainstormIdea[]): BrainstormIdea[] => {
    return ideas.filter(idea => {
      // Check if idea is too similar to used ones
      const similarUsed = ideaHistory.some(usedIdea => 
        usedIdea.tags?.some(tag => idea.tags?.includes(tag)) && 
        usedIdea.type === idea.type
      )
      return !similarUsed || ideaHistory.length < 5 // Allow some similarity if user hasn't used many ideas
    })
  }

  // Add performance prediction based on user's past success
  const addPerformancePrediction = (ideas: BrainstormIdea[]): BrainstormIdea[] => {
    return ideas.map(idea => {
      let rating = 3 // Base rating
      
      // Boost rating if idea matches user's best-performing tags
      if (idea.tags?.some(tag => userContext.bestPerformingTags.includes(tag))) {
        rating += 1
      }
      
      // Boost rating if idea targets user's preferred platforms
      if (idea.platform?.some(platform => userContext.preferredPlatforms.includes(platform))) {
        rating += 1
      }
      
      // Boost rating for trending content types
      if (['video', 'visual'].includes(idea.type)) {
        rating += 0.5
      }
      
      return {
        ...idea,
        rating: Math.min(5, Math.max(1, Math.round(rating))),
        createdAt: new Date()
      }
    })
  }

  // Generate contextual AI response
  const generateContextualResponse = (userMessage: string, ideas: BrainstormIdea[], prompt?: BrainstormPrompt): string => {
    const responses = [
      `Basierend auf deiner Performance-Historie habe ich ${ideas.length} hochwertige Ideen für dich entwickelt:`,
      `Hier sind ${ideas.length} frische Ideen, die zu deinem Stil und deiner Zielgruppe passen:`,
      `Ich habe ${ideas.length} neue Ansätze gefunden, die bei deiner Audience gut ankommen sollten:`,
      `Diese ${ideas.length} Ideen kombinieren aktuelle Trends mit deinen bewährten Strategien:`
    ]
    
    // Add context about why these ideas were chosen
    const contextualNote = ideas.some(idea => idea.rating && idea.rating >= 4) 
      ? " Diese Ideen haben hohes Viral-Potenzial basierend auf ähnlichen erfolgreichen Posts."
      : " Diese Ideen sind speziell auf deine Nische und Zielgruppe abgestimmt."
    
    return responses[Math.floor(Math.random() * responses.length)] + contextualNote
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
  }

  const handleSaveIdea = async (idea: BrainstormIdea) => {
    if (!user?.id) {
      toast.error('Bitte melde dich an, um Ideen zu speichern')
      return
    }

    if (!savedIdeas.find(s => s.id === idea.id)) {
      try {
        // Save to database with embedding
        const savedIdeaData = await ContentIdeaService.saveBrainstormIdea(idea, user.id)
        
        if (savedIdeaData) {
          const savedIdea = { ...idea, saved: true, used: true }
          setSavedIdeas(prev => [...prev, savedIdea])
          setUserContext(prev => ({
            ...prev,
            usedIdeas: [...prev.usedIdeas, idea.id]
          }))
          toast.success('💾 Idee in Datenbank gespeichert!')
        } else {
          toast.error('Fehler beim Speichern der Idee')
        }
      } catch (error) {
        console.error('Error saving brainstorm idea:', error)
        toast.error('Fehler beim Speichern der Idee')
      }
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
                          onClick={() => {
                            handlePromptSelect(prompt, promptText)
                            setActiveMode('chat')
                          }}
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
                        // Generate a contextual prompt for this category
                        const contextualPrompt = `Generiere mir 5 neue kreative ${prompt.title.toLowerCase()}-Ideen für Immobilienmakler, die ich noch nicht ausprobiert habe.`
                        setChatMessages(prev => [...prev, { role: 'user', content: contextualPrompt }])
                        generateAIResponse(contextualPrompt, prompt)
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
              className="h-8 px-3 rounded-full bg-white/20 text-white hover:bg-white hover:text-purple-600 transition-all duration-200"
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
              className="flex items-center gap-2 h-10 px-4 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white shadow-sm hover:shadow-md transition-all duration-200"
              style={{
                border: 'none',
                outline: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'white'
                e.currentTarget.style.color = '#7C3AED'
                e.currentTarget.style.border = '2px solid #7C3AED'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(to right, #9333ea, #6366f1, #7c3aed)'
                e.currentTarget.style.color = 'white'
                e.currentTarget.style.border = 'none'
              }}
            >
              <ArrowLeft className="w-4 h-4" />
              Zurück
            </Button>
            
            {/* Centered KI-Brainstorming Button with Purple Gradient */}
            <button 
              onClick={() => setActiveMode('chat')}
              className="relative inline-flex items-center gap-3 px-8 py-3 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 font-medium text-xl transition-all duration-300 ease-in-out group hover:scale-105 cursor-pointer"
            >
              {/* Pulse effect on hover */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 opacity-0 group-hover:opacity-75 group-hover:animate-ping"></div>
              
              {/* Hover glow effect */}
              <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-300 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 blur-md"></div>
              
              {/* Content with white text */}
              <Brain className="w-6 h-6 relative z-10 text-white" />
              <span className="relative z-10 text-white">KI-Brainstorming</span>
            </button>
            
            {/* Clean save icon button in page colors */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveMode('saved')}
              className="h-10 w-10 p-0 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white shadow-sm hover:shadow-md transition-all duration-200"
              style={{
                border: 'none',
                outline: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'white'
                e.currentTarget.style.color = '#7C3AED'
                e.currentTarget.style.border = '2px solid #7C3AED'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(to right, #9333ea, #6366f1, #7c3aed)'
                e.currentTarget.style.color = 'white'
                e.currentTarget.style.border = 'none'
              }}
            >
              <Bookmark className="w-4 h-4" />
              {savedIdeas.length > 0 && (
                <Badge variant="secondary" className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs bg-red-500 text-white border-2 border-white rounded-full flex items-center justify-center">
                  {savedIdeas.length}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      {activeMode === 'saved' ? renderSavedMode() : activeMode === 'chat' ? renderChatMode() : renderPromptMode()}
    </div>
  )
} 