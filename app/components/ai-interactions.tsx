"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { createClient } from '@supabase/supabase-js'
import { toast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { 
  Sparkles, 
  Send, 
  Edit, 
  X, 
  Instagram, 
  Facebook, 
  Twitter, 
  Linkedin, 
  MessageCircle, 
  Clock, 
  Eye,
  ThumbsUp,
  Reply,
  MoreVertical,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Image as ImageIcon
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Interaction {
  id: number
  sender: string
  avatar: string
  platform: "instagram" | "facebook" | "twitter" | "linkedin"
  originalPost: {
    id: string
    title: string
    content: string
    image: string
    platforms: string[]
    engagement: {
      likes: number
      comments: number
      shares?: number
    }
  }
  message: string
  aiSuggestion: string
  timestamp: string
  priority: "high" | "medium" | "low"
  status: "pending" | "approved" | "sent" | "dismissed"
  sentiment: "positive" | "neutral" | "negative"
}

// Mock data removed - will be replaced with real data from the database
const mockInteractions: Interaction[] = [
  {
    id: 1,
    sender: "Anna Müller",
    avatar: "/placeholder-user.jpg",
    platform: "instagram",
    originalPost: {
      id: "post-1",
      title: "Traumvilla in München-Bogenhausen verfügbar",
      content: "🏡 EXKLUSIV: Wunderschöne Villa mit 300m² Wohnfläche, großem Garten und Pool in bester Lage von München-Bogenhausen. Perfekt für Familien, die das Besondere suchen. #München #Immobilien #Villa",
      image: "/placeholder.jpg",
      platforms: ["Instagram", "Facebook"],
      engagement: {
        likes: 127,
        comments: 23,
        shares: 8
      }
    },
    message: "Ist die Villa noch verfügbar? Wir suchen dringend ein Haus in München für unsere Familie mit 3 Kindern. Könnte ich einen Besichtigungstermin bekommen?",
    aiSuggestion: "Hallo Anna! 😊 Ja, die Villa ist noch verfügbar und wäre perfekt für Ihre Familie! Gerne vereinbare ich einen Besichtigungstermin mit Ihnen. Können Sie mir Ihre Telefonnummer per DM senden? Dann rufe ich Sie heute noch an und wir finden einen passenden Termin. Freue mich auf Ihre Nachricht! 🏡✨",
    timestamp: "vor 15 Min",
    priority: "high",
    status: "pending",
    sentiment: "positive"
  },
  {
    id: 2,
    sender: "Thomas Weber",
    avatar: "/placeholder-user.jpg",
    platform: "facebook",
    originalPost: {
      id: "post-2",
      title: "Erste Immobilie kaufen - Ratgeber für Einsteiger",
      content: "📊 Du willst deine erste Immobilie kaufen? Dann schau dir unseren kostenlosen Ratgeber an! Wir erklären dir Schritt für Schritt, worauf du achten musst - von der Finanzierung bis zum Notartermin. Link in Bio! 💪 #Immobilienkauf #Erstimmobilie #Beratung",
      image: "/placeholder.jpg",
      platforms: ["Facebook", "LinkedIn"],
      engagement: {
        likes: 89,
        comments: 15,
        shares: 12
      }
    },
    message: "Super Artikel! Ich bin 28 und spare seit 2 Jahren für meine erste Wohnung. Habt ihr auch Tipps zur optimalen Eigenkapitalquote? Sind 20% wirklich ausreichend oder sollte man mehr ansparen?",
    aiSuggestion: "Hallo Thomas! Vielen Dank für Ihr Interesse! 😊 20% Eigenkapital ist ein guter Richtwert, aber je mehr Sie mitbringen, desto bessere Konditionen erhalten Sie. Bei Ihrer Situation würde ich eine persönliche Beratung empfehlen - so können wir Ihre individuelle Finanzierungsstrategie besprechen. Möchten Sie einen kostenlosen Beratungstermin vereinbaren? 📞",
    timestamp: "vor 32 Min",
    priority: "medium",
    status: "pending",
    sentiment: "positive"
  },
  {
    id: 3,
    sender: "Lisa Schmidt",
    avatar: "/placeholder-user.jpg",
    platform: "instagram",
    originalPost: {
      id: "post-3",
      title: "Moderne 3-Zimmer Wohnung in Schwabing",
      content: "✨ NEU: Stilvolle 3-Zimmer Wohnung in Schwabing-West. 95m², Balkon, Einbauküche, Parkplatz. Perfekt für Paare oder kleine Familien. Bezugsfertig ab sofort! #Schwabing #München #Wohnung #Miete",
      image: "/placeholder.jpg",
      platforms: ["Instagram"],
      engagement: {
        likes: 54,
        comments: 8,
        shares: 3
      }
    },
    message: "Hallo, die Wohnung sieht toll aus! Ist sie noch frei? Wir sind ein Paar ohne Kinder, beide berufstätig. Könnten wir uns bewerben?",
    aiSuggestion: "Hallo Lisa! Schön, dass Ihnen die Wohnung gefällt! 😊 Sie ist tatsächlich noch verfügbar. Für eine Bewerbung senden Sie mir gerne per DM Ihre Unterlagen: Gehaltsnachweise, SCHUFA-Auskunft und eine kurze Selbstauskunft. Dann können wir zeitnah einen Besichtigungstermin vereinbaren! 🏠",
    timestamp: "vor 1 Std",
    priority: "high",
    status: "pending",
    sentiment: "positive"
  },
  {
    id: 4,
    sender: "Michael Klein",
    avatar: "/placeholder-user.jpg",
    platform: "linkedin",
    originalPost: {
      id: "post-4",
      title: "Investition in Immobilien 2024 - Marktanalyse",
      content: "📈 Immobilienmarkt 2024: Trotz steigender Zinsen bleiben Immobilien eine stabile Wertanlage. Unsere aktuelle Marktanalyse zeigt interessante Entwicklungen in verschiedenen Münchner Stadtteilen. Was denken Sie über die aktuellen Trends? #Immobilieninvestment #München #Marktanalyse",
      image: "/placeholder.jpg",
      platforms: ["LinkedIn", "Facebook"],
      engagement: {
        likes: 156,
        comments: 31,
        shares: 24
      }
    },
    message: "Interessante Analyse! Ich überlege, in eine Anlageimmobilie zu investieren. Welche Stadtteile würden Sie aktuell für Buy-and-Hold Strategien empfehlen? Budget bis 800k.",
    aiSuggestion: "Hallo Michael! Danke für Ihr Interesse! 🏘️ Mit einem Budget von 800k sind besonders Giesing, Sendling und Teile von Laim interessant - dort gibt es noch gute Renditemöglichkeiten bei solider Wertstabilität. Gerne bespreche ich mit Ihnen konkrete Objekte und Renditekalkulationen. Soll ich Ihnen unsere aktuelle Investoren-Objektliste zusenden? 📊",
    timestamp: "vor 2 Std",
    priority: "medium",
    status: "pending",
    sentiment: "positive"
  },
  {
    id: 5,
    sender: "Sarah Johnson",
    avatar: "/placeholder-user.jpg",
    platform: "facebook",
    originalPost: {
      id: "post-5",
      title: "Hausverkauf leicht gemacht - Kostenlose Bewertung",
      content: "🏠 Sie möchten Ihr Haus verkaufen? Wir bieten Ihnen eine kostenlose und unverbindliche Marktwertermittlung! Mit über 15 Jahren Erfahrung am Münchner Immobilienmarkt sorgen wir für den optimalen Verkaufspreis. Kontaktieren Sie uns! #Hausverkauf #Immobilienbewertung #München",
      image: "/placeholder.jpg",
      platforms: ["Facebook", "Instagram"],
      engagement: {
        likes: 72,
        comments: 12,
        shares: 6
      }
    },
    message: "Wir denken über den Verkauf unseres Hauses nach. Es ist von 1995, Doppelhaushälfte in Garching. Wie läuft so eine Bewertung ab und was kostet sie wirklich? Haben etwas Bedenken wegen versteckter Kosten...",
    aiSuggestion: "Hallo Sarah! Verstehe Ihre Bedenken völlig - Transparenz ist uns wichtig! 😊 Die Bewertung ist komplett kostenlos und unverbindlich. Ich komme vorbei, schaue mir Ihr Haus an (ca. 45 Min), analysiere Vergleichsobjekte und erstelle einen detaillierten Bericht. Keine versteckten Kosten, kein Kleingedrucktes. Erst wenn Sie sich für unsere Vermarktung entscheiden, entstehen Gebühren. Soll ich einen Termin vorschlagen? 📋",
    timestamp: "vor 3 Std",
    priority: "high",
    status: "pending",
    sentiment: "neutral"
  },
  {
    id: 6,
    sender: "Frank Richter",
    avatar: "/placeholder-user.jpg",
    platform: "instagram",
    originalPost: {
      id: "post-6",
      title: "Luxus-Penthouse mit Dachterrasse in Maxvorstadt",
      content: "🌟 EXKLUSIV: Spektakuläres Penthouse in der Maxvorstadt! 180m² Wohnfläche + 80m² Dachterrasse mit 360° München-Blick. Hochwertige Ausstattung, Smart Home, 2 Parkplätze. Ein Traum wird wahr! #Penthouse #München #Luxus #Maxvorstadt",
      image: "/placeholder.jpg",
      platforms: ["Instagram"],
      engagement: {
        likes: 234,
        comments: 45,
        shares: 18
      }
    },
    message: "Das Penthouse ist der Wahnsinn! Aber ehrlich gesagt, bei den Preisen in München... ist das überhaupt noch bezahlbar für normale Menschen? Für wen ist so etwas gedacht?",
    aiSuggestion: "Hallo Frank! Sie haben einen wichtigen Punkt angesprochen! 🤔 Solche Luxusobjekte richten sich tatsächlich an einen sehr speziellen Kundenkreis. Aber wir haben auch viele bezahlbare Alternativen im Portfolio! Falls Sie sich für den Münchner Markt interessieren, zeige ich Ihnen gerne Objekte in verschiedenen Preisklassen. Jeder verdient ein schönes Zuhause! 🏠 Was ist denn Ihr Budget-Rahmen?",
    timestamp: "vor 4 Std",
    priority: "low",
    status: "pending",
    sentiment: "neutral"
  }
]

const platformIcons = {
  instagram: Instagram,
  facebook: Facebook,
  twitter: Twitter,
  linkedin: Linkedin
}

const platformColors = {
  instagram: "from-pink-500 to-purple-600",
  facebook: "from-blue-600 to-blue-700",
  twitter: "from-blue-400 to-blue-500",
  linkedin: "from-blue-700 to-blue-800"
}

const priorityColors = {
  high: "border-red-200 bg-red-50",
  medium: "border-yellow-200 bg-yellow-50",
  low: "border-green-200 bg-green-50"
}

const sentimentIndicators = {
  positive: { color: "text-green-600", icon: ThumbsUp },
  neutral: { color: "text-gray-500", icon: MessageCircle },
  negative: { color: "text-red-600", icon: AlertCircle }
}

export function AIInteractions() {
  const { user } = useAuth()
  const [autoReply, setAutoReply] = useState(true)
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [selectedFilter, setSelectedFilter] = useState("all")
  const [editingResponse, setEditingResponse] = useState<number | null>(null)
  const [customResponse, setCustomResponse] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [regeneratingResponse, setRegeneratingResponse] = useState<number | null>(null)

  // Load interactions from database (simulated for now)
  useEffect(() => {
    const loadInteractions = async () => {
      setIsLoading(true)
      // Simulate loading time
      await new Promise(resolve => setTimeout(resolve, 1000))
      // For now, set to empty array - will be replaced with real data service call
      setInteractions(mockInteractions)
      setIsLoading(false)
    }
    loadInteractions()
  }, [])

  const handleSendResponse = (interactionId: number, response: string) => {
    setInteractions(prev => prev.map(interaction => 
      interaction.id === interactionId 
        ? { ...interaction, status: "sent", aiSuggestion: response }
        : interaction
    ))
    setEditingResponse(null)
    setCustomResponse("")
  }

  const handleDismiss = (interactionId: number) => {
    setInteractions(prev => prev.map(interaction => 
      interaction.id === interactionId 
        ? { ...interaction, status: "dismissed" }
        : interaction
    ))
  }

  const handleApprove = (interactionId: number) => {
    setInteractions(prev => prev.map(interaction => 
      interaction.id === interactionId 
        ? { ...interaction, status: "approved" }
        : interaction
    ))
  }

  const handleEditResponse = (interactionId: number, currentResponse: string) => {
    setEditingResponse(interactionId)
    setCustomResponse(currentResponse)
  }

  // Regenerate AI response
  const regenerateAIResponse = useCallback(async (interactionId: number) => {
    const interaction = interactions.find(i => i.id === interactionId)
    if (!interaction || !user) return

    setRegeneratingResponse(interactionId)
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('Keine Authentifizierung gefunden')
      }

      const prompt = `Erstelle eine professionelle, freundliche Antwort auf diese Nachricht in einem Social Media Kontext für ein Immobilienunternehmen:

Original Post: "${interaction.originalPost.title}"
Post Inhalt: "${interaction.originalPost.content}"
Plattform: ${interaction.platform}

Kundenanfrage: "${interaction.message}"

Bitte antworte professionell, hilfsbereit und führe den Kunden zu einer konkreten Aktion (Termin, DM, etc.). Verwende Emojis sparsam und angemessen. Halte die Antwort persönlich aber professionell.`

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          query: prompt
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Generieren der Antwort')
      }

      // Update the interaction with the new AI suggestion
      setInteractions(prev => prev.map(item => 
        item.id === interactionId 
          ? { ...item, aiSuggestion: data.message }
          : item
      ))

      toast({
        title: "KI-Antwort neu generiert",
        description: "Eine neue Antwort wurde erfolgreich erstellt.",
      })

    } catch (error) {
      console.error('Error regenerating AI response:', error)
      toast({
        title: "Fehler",
        description: "Die KI-Antwort konnte nicht neu generiert werden.",
        variant: "destructive"
      })
    } finally {
      setRegeneratingResponse(null)
    }
  }, [interactions, user])

  const filteredInteractions = interactions.filter(interaction => {
    if (selectedFilter === "all") return interaction.status === "pending"
    if (selectedFilter === "high") return interaction.priority === "high" && interaction.status === "pending"
    if (selectedFilter === "positive") return interaction.sentiment === "positive" && interaction.status === "pending"
    return true
  })

  const getPlatformIcon = (platform: keyof typeof platformIcons) => {
    const Icon = platformIcons[platform]
    return <Icon className="w-4 h-4" />
  }

  return (
    <div className="h-full w-full overflow-y-auto p-8">
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">KI Community Management</h1>
              <p className="text-gray-600">Verwalten Sie Interaktionen mit KI-gestützten Antworten</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">Auto-Antwort</span>
                <Switch 
                  checked={autoReply} 
                  onCheckedChange={setAutoReply} 
                  className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-teal-500 data-[state=checked]:to-cyan-500" 
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>{filteredInteractions.length} ausstehend</span>
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center bg-white rounded-full shadow-sm border border-gray-100 p-0.5">
              {[
                { key: "all", label: "Alle Ausstehend" },
                { key: "high", label: "Hohe Priorität" },
                { key: "positive", label: "Positiv" }
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setSelectedFilter(filter.key)}
                  className={`px-6 py-2.5 text-sm font-medium transition-all relative
                    ${selectedFilter === filter.key
                      ? 'rounded-full bg-gradient-to-r from-teal-500/10 to-cyan-500/10 text-teal-600 border border-teal-200'
                      : 'text-gray-600 hover:bg-gray-50 rounded-full'
                    }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Interactions List */}
        <div className="space-y-6">
          {filteredInteractions.map((interaction) => {
            const PlatformIcon = platformIcons[interaction.platform]
            const SentimentIcon = sentimentIndicators[interaction.sentiment].icon
            const isEditing = editingResponse === interaction.id

            return (
              <Card
                key={interaction.id}
                className={`overflow-hidden group border-0 shadow-sm bg-white hover:shadow-md transition-all duration-300 rounded-2xl ${
                  interaction.priority === 'high' ? 'ring-2 ring-red-100' : ''
                }`}
              >
                <CardContent className="p-0">
                  <div className="flex">
                    {/* Left: Original Post Preview */}
                    <div className="w-80 bg-gray-50 p-6 border-r border-gray-100">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 bg-gradient-to-r ${platformColors[interaction.platform]} rounded-full flex items-center justify-center`}>
                            <PlatformIcon className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 text-sm">Original Post</h4>
                            <p className="text-xs text-gray-500">{interaction.originalPost.platforms.join(", ")}</p>
                          </div>
                        </div>
                        
                        <div className="aspect-video bg-gray-200 rounded-xl overflow-hidden">
                          <img
                            src={interaction.originalPost.image}
                            alt="Post preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        
                        <div>
                          <h5 className="font-medium text-gray-900 mb-1 text-sm">{interaction.originalPost.title}</h5>
                          <p className="text-xs text-gray-600 line-clamp-2">{interaction.originalPost.content}</p>
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <ThumbsUp className="w-3 h-3" />
                            {interaction.originalPost.engagement.likes}
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" />
                            {interaction.originalPost.engagement.comments}
                          </div>
                          {interaction.originalPost.engagement.shares && (
                            <div className="flex items-center gap-1">
                              <ArrowRight className="w-3 h-3" />
                              {interaction.originalPost.engagement.shares}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: User Message & AI Response */}
                    <div className="flex-1 p-6">
                      <div className="space-y-6">
                        {/* User Message */}
                        <div className="flex items-start gap-4">
                          <Avatar className="w-10 h-10 border-2 border-gray-100">
                            <AvatarImage src={interaction.avatar} />
                            <AvatarFallback className="bg-gray-100 text-gray-600 font-medium">
                              {interaction.sender.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-gray-900">{interaction.sender}</h3>
                              <div className={`w-6 h-6 bg-gradient-to-r ${platformColors[interaction.platform]} rounded-full flex items-center justify-center`}>
                                <PlatformIcon className="w-3 h-3 text-white" />
                              </div>
                              <Badge className={`text-xs px-2 py-1 rounded-full ${priorityColors[interaction.priority]}`}>
                                {interaction.priority}
                              </Badge>
                              <div className="flex items-center gap-1">
                                <SentimentIcon className={`w-3 h-3 ${sentimentIndicators[interaction.sentiment].color}`} />
                                <span className="text-xs text-gray-500">{interaction.sentiment}</span>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-gray-500 ml-auto">
                                <Clock className="w-3 h-3" />
                                {interaction.timestamp}
                              </div>
                            </div>
                            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                              <p className="text-gray-900 leading-relaxed">{interaction.message}</p>
                            </div>
                          </div>
                        </div>

                        {/* AI Response */}
                        <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-100 rounded-2xl p-5">
                          <div className="flex items-center gap-2 mb-4">
                            <div className="w-6 h-6 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full flex items-center justify-center">
                              <Sparkles className="w-3 h-3 text-white" />
                            </div>
                            <span className="text-sm font-semibold text-teal-700">KI-Vorschlag für Antwort</span>
                            <Badge className="bg-teal-100 text-teal-700 text-xs px-2 py-1 rounded-full">
                              {interaction.sentiment === 'positive' ? 'Freundlich' : 'Professionell'}
                            </Badge>
                          </div>
                          
                          {isEditing ? (
                            <div className="space-y-4">
                              <Textarea
                                value={customResponse}
                                onChange={(e) => setCustomResponse(e.target.value)}
                                className="bg-white border-teal-200 rounded-xl resize-none min-h-[100px] focus:border-teal-300 focus:ring-teal-200"
                                placeholder="Bearbeiten Sie die KI-Antwort..."
                              />
                              <div className="flex items-center gap-2">
                                <Button 
                                  onClick={() => handleSendResponse(interaction.id, customResponse)}
                                  className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-full text-sm px-6"
                                >
                                  <Send className="w-4 h-4 mr-2" />
                                  Antwort Senden
                                </Button>
                                <Button 
                                  variant="outline" 
                                  onClick={() => setEditingResponse(null)}
                                  className="rounded-full text-sm px-6 border-gray-200"
                                >
                                  Abbrechen
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="bg-white rounded-xl p-4 border border-teal-200">
                                <p className="text-gray-900 leading-relaxed">{interaction.aiSuggestion}</p>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Button 
                                  onClick={() => handleSendResponse(interaction.id, interaction.aiSuggestion)}
                                  className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-full text-sm px-6"
                                >
                                  <Send className="w-4 h-4 mr-2" />
                                  Senden & Bestätigen
                                </Button>
                                <Button 
                                  variant="outline" 
                                  onClick={() => handleEditResponse(interaction.id, interaction.aiSuggestion)}
                                  className="rounded-full text-sm px-6 border-gray-200 hover:bg-gray-50"
                                >
                                  <Edit className="w-4 h-4 mr-2" />
                                  Bearbeiten
                                </Button>
                                <Button 
                                  variant="outline" 
                                  onClick={() => regenerateAIResponse(interaction.id)}
                                  disabled={regeneratingResponse === interaction.id}
                                  className="rounded-full text-sm px-6 border-blue-200 text-blue-600 hover:bg-blue-50"
                                >
                                  {regeneratingResponse === interaction.id ? (
                                    <div className="w-4 h-4 mr-2 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <Sparkles className="w-4 h-4 mr-2" />
                                  )}
                                  {regeneratingResponse === interaction.id ? 'Generiert...' : 'Neu Generieren'}
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  onClick={() => handleDismiss(interaction.id)}
                                  className="rounded-full text-sm px-6 text-gray-600 hover:bg-gray-100"
                                >
                                  <X className="w-4 h-4 mr-2" />
                                  Ablehnen
                                </Button>
                                
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full ml-auto">
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48 rounded-xl">
                                    <DropdownMenuItem onClick={() => handleApprove(interaction.id)}>
                                      <CheckCircle className="w-4 h-4 mr-2" />
                                      Für Auto-Senden genehmigen
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <Eye className="w-4 h-4 mr-2" />
                                      Original Thread ansehen
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <Reply className="w-4 h-4 mr-2" />
                                      Follow-up erstellen
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-to-r from-teal-500/10 to-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Interaktionen werden geladen...</h3>
            <p className="text-gray-600">Bitte warten Sie, während wir Ihre ausstehenden Interaktionen laden.</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredInteractions.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-to-r from-teal-500/10 to-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-8 h-8 text-teal-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Alles erledigt!</h3>
            <p className="text-gray-600 mb-6">Keine ausstehenden Interaktionen zu überprüfen. Wenn Nutzer mit Ihren Posts interagieren, erscheinen deren Kommentare und Nachrichten hier für KI-gestützte Antwortvorschläge.</p>
            <Button 
              variant="outline" 
              className="rounded-full border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              Alle Interaktionen anzeigen
            </Button>
          </div>
        )}
      </div>
    </div>
  )
} 