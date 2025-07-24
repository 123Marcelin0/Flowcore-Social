"use client"

import { useState, useEffect } from "react"
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
const mockInteractions: Interaction[] = []

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
  const [autoReply, setAutoReply] = useState(true)
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [selectedFilter, setSelectedFilter] = useState("all")
  const [editingResponse, setEditingResponse] = useState<number | null>(null)
  const [customResponse, setCustomResponse] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  // Load interactions from database (simulated for now)
  useEffect(() => {
    const loadInteractions = async () => {
      setIsLoading(true)
      // Simulate loading time
      await new Promise(resolve => setTimeout(resolve, 1000))
      // For now, set to empty array - will be replaced with real data service call
      setInteractions([])
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
    <div className="h-full w-full bg-gray-50/50 overflow-y-auto">
      <div className="max-w-[1200px] mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Community Management</h1>
              <p className="text-gray-600">Manage interactions with AI-powered responses</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">Auto-Reply</span>
                <Switch 
                  checked={autoReply} 
                  onCheckedChange={setAutoReply} 
                  className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-teal-500 data-[state=checked]:to-cyan-500" 
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>{filteredInteractions.length} pending</span>
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center bg-white rounded-full shadow-sm border border-gray-100 p-0.5">
              {[
                { key: "all", label: "All Pending" },
                { key: "high", label: "High Priority" },
                { key: "positive", label: "Positive" }
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
                            <span className="text-sm font-semibold text-teal-700">AI Suggested Response</span>
                            <Badge className="bg-teal-100 text-teal-700 text-xs px-2 py-1 rounded-full">
                              {interaction.sentiment === 'positive' ? 'Friendly' : 'Professional'}
                            </Badge>
                          </div>
                          
                          {isEditing ? (
                            <div className="space-y-4">
                              <Textarea
                                value={customResponse}
                                onChange={(e) => setCustomResponse(e.target.value)}
                                className="bg-white border-teal-200 rounded-xl resize-none min-h-[100px] focus:border-teal-300 focus:ring-teal-200"
                                placeholder="Edit the AI response..."
                              />
                              <div className="flex items-center gap-2">
                                <Button 
                                  onClick={() => handleSendResponse(interaction.id, customResponse)}
                                  className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-full text-sm px-6"
                                >
                                  <Send className="w-4 h-4 mr-2" />
                                  Send Response
                                </Button>
                                <Button 
                                  variant="outline" 
                                  onClick={() => setEditingResponse(null)}
                                  className="rounded-full text-sm px-6 border-gray-200"
                                >
                                  Cancel
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
                                  Send & Confirm
                                </Button>
                                <Button 
                                  variant="outline" 
                                  onClick={() => handleEditResponse(interaction.id, interaction.aiSuggestion)}
                                  className="rounded-full text-sm px-6 border-gray-200 hover:bg-gray-50"
                                >
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  onClick={() => handleDismiss(interaction.id)}
                                  className="rounded-full text-sm px-6 text-gray-600 hover:bg-gray-100"
                                >
                                  <X className="w-4 h-4 mr-2" />
                                  Dismiss
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
                                      Approve for Auto-Send
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <Eye className="w-4 h-4 mr-2" />
                                      View Original Thread
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <Reply className="w-4 h-4 mr-2" />
                                      Create Follow-up
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading interactions...</h3>
            <p className="text-gray-600">Please wait while we fetch your pending interactions.</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredInteractions.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-to-r from-teal-500/10 to-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-8 h-8 text-teal-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">All caught up!</h3>
            <p className="text-gray-600 mb-6">No pending interactions to review. When users engage with your posts, their comments and messages will appear here for AI-powered response suggestions.</p>
            <Button 
              variant="outline" 
              className="rounded-full border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              View All Interactions
            </Button>
          </div>
        )}
      </div>
    </div>
  )
} 