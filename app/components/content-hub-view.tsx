"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Edit, Instagram, Facebook, Twitter, Linkedin, Video, Loader2, Lightbulb } from "lucide-react"
import { TrendOptimizationWorkflow } from "./trend-optimization-workflow"
import { ContentStrategyWorkflow } from "./content-strategy-workflow"
import { IdeaGrid } from "@/components/idea-cards/idea-grid"
import type { IdeaCardData } from "@/components/idea-cards/idea-card"
import { CreatePostDialog } from "./create-post-dialog"
import { usePost } from "@/lib/post-context"
import { useAuth } from "@/lib/auth-context"
import { sampleIdeas } from "@/lib/sample-ideas"
import { toast } from "sonner"
import { ContentIdeaService } from "@/lib/content-idea-service"

interface Draft {
  id: string
  content: string
  platforms: string[]
  image: string
  createdAt: string
  status: 'draft'
  likes: number
  comments: number
  shares: number
}

// TrendData interface to match TrendOptimizationWorkflow
interface TrendData {
  id: string
  thumbnail_url: string
  reel_url: string
  title?: string
  creator?: string
  script?: string
  description?: string
}

// ContentStrategyData interface to match ContentStrategyWorkflow
interface ContentStrategyData {
  id: string
  title: string
  description: string
  category: 'content-strategies'
  content: {
    hook?: string
    script?: string
    hashtags?: string[]
    visualTips?: string[]
    platforms?: string[]
    targetAudience?: string
    estimatedReach?: number
  }
  priority: 'low' | 'medium' | 'high'
  estimatedEffort: 'quick' | 'medium' | 'complex'
}

// Convert IdeaCardData to TrendData format for the workflow
const convertIdeaToTrendData = (idea: IdeaCardData): TrendData => {
  return {
    id: idea.id,
    thumbnail_url: '/placeholder.svg',
    reel_url: `#idea-${idea.id}`,
    title: idea.title,
    creator: 'Content Idea',
    script: idea.content.script || idea.description,
    description: idea.description
  }
}

// Convert IdeaCardData to ContentStrategyData format for the workflow
const convertIdeaToContentStrategyData = (idea: IdeaCardData): ContentStrategyData => {
  return {
    id: idea.id,
    title: idea.title,
    description: idea.description,
    category: 'content-strategies',
    content: {
      hook: idea.content.hook,
      script: idea.content.script,
      hashtags: idea.content.hashtags,
      visualTips: idea.content.visualTips,
      platforms: idea.content.platforms,
      targetAudience: idea.content.targetAudience,
      estimatedReach: idea.content.estimatedReach
    },
    priority: idea.priority,
    estimatedEffort: idea.estimatedEffort
  }
}

export function ContentHubView() {
  const { user } = useAuth()
  const { state, actions } = usePost()
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false)
  const [selectedView, setSelectedView] = useState("ideas")
  const [ideas, setIdeas] = useState<IdeaCardData[]>([])
  const [isLoadingIdeas, setIsLoadingIdeas] = useState(false)
  const [convertingIdeaContent, setConvertingIdeaContent] = useState<{
    title: string
    description: string
    hashtags: string[]
    category?: 'trend-reels' | 'content-strategies' | 'ai-strategies'
    source?: 'ai-generated' | 'trend-explorer' | 'manual' | 'content-strategy'
    tags?: string[]
  } | null>(null)
  const [editingPostId, setEditingPostId] = useState<string | null>(null)

  // Trend Optimization Workflow State
  const [showTrendWorkflow, setShowTrendWorkflow] = useState(false)
  const [selectedTrendData, setSelectedTrendData] = useState<TrendData | null>(null)

  // Content Strategy Workflow State
  const [showContentStrategyWorkflow, setShowContentStrategyWorkflow] = useState(false)
  const [selectedContentStrategyData, setSelectedContentStrategyData] = useState<ContentStrategyData | null>(null)

  // Load content ideas from database
  useEffect(() => {
    if (user?.id) {
      const loadIdeas = async () => {
        setIsLoadingIdeas(true)
        try {
          const userIdeas = await ContentIdeaService.syncWithContentHub(user.id)
          setIdeas(userIdeas)
        } catch (error) {
          console.error('Error loading ideas:', error)
          setIdeas(sampleIdeas)
        } finally {
          setIsLoadingIdeas(false)
        }
      }
      loadIdeas()
    }
  }, [user])

  // Subscribe to real-time post changes
  useEffect(() => {
    const unsubscribe = actions.subscribeToChanges((event) => {
      switch (event.type) {
        case 'post_created':
        case 'post_updated':
        case 'post_deleted':
        case 'batch_sync':
          if (event.source !== 'user_action') {
            console.log('Posts synchronized from server')
          }
          break
      }
    })
    
    return unsubscribe
  }, [actions])

  // Show trend workflow instead of content hub when active
  if (showTrendWorkflow && selectedTrendData) {
    return (
      <div className="h-full w-full">
        <TrendOptimizationWorkflow
          trend={selectedTrendData}
          onBack={() => {
            setShowTrendWorkflow(false)
            setSelectedTrendData(null)
          }}
        />
      </div>
    )
  }

  // Show content strategy workflow instead of content hub when active
  if (showContentStrategyWorkflow && selectedContentStrategyData) {
    return (
      <div className="h-full w-full">
        <ContentStrategyWorkflow
          strategy={selectedContentStrategyData}
          onBack={() => {
            setShowContentStrategyWorkflow(false)
            setSelectedContentStrategyData(null)
          }}
        />
      </div>
    )
  }

  // Initial loading state
  if (state.loading && Object.keys(state.posts).length === 0) {
    return (
      <div className="h-full w-full bg-gray-50/50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-4" />
          <p className="text-sm text-gray-600">Loading content...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (state.error) {
    return (
      <div className="h-full w-full bg-gray-50/50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lightbulb className="w-6 h-6 text-red-600" />
          </div>
          <p className="text-sm text-red-600 mb-2">Error loading content</p>
          <p className="text-xs text-gray-500 mb-4">{state.error}</p>
          <Button onClick={actions.fetchPosts} size="sm">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  // Get drafts from context
  const drafts = state.drafts.map(post => ({
    id: post.id,
    content: post.content,
    platforms: post.platforms,
    image: post.image,
    createdAt: post.createdAt,
    status: 'draft' as const,
    likes: post.likes,
    comments: post.comments,
    shares: post.shares,
    approved: post.approved
  }))

  const handleUpdatePostStatus = async (postId: string, status: 'draft' | 'scheduled' | 'published') => {
    if (!user) return
    
    try {
      await actions.updatePost(postId, { status })
    } catch (error) {
      console.error('Error updating post status:', error)
    }
  }

  // Idea management handlers
  const handleAddIdea = () => {
    toast.info("Idea creation coming soon! Use the AI assistant to generate ideas.")
  }

  const handleEditIdea = (idea: IdeaCardData) => {
    const updatedIdeas = ideas.map(i => i.id === idea.id ? idea : i)
    setIdeas(updatedIdeas)
  }

  const handleDeleteIdea = (ideaId: string) => {
    setIdeas(prev => prev.filter(i => i.id !== ideaId))
    toast.success("Idea deleted successfully")
  }

  const handleDuplicateIdea = (idea: IdeaCardData) => {
    const duplicatedIdea: IdeaCardData = {
      ...idea,
      id: `idea-${Date.now()}`,
      title: `${idea.title} (Copy)`,
      savedAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      isImplemented: false,
      implementedPostId: undefined
    }
    setIdeas(prev => [duplicatedIdea, ...prev])
    toast.success("Idea duplicated successfully")
  }

  const handleConvertIdeaToPost = async (idea: IdeaCardData) => {
    if (!user) return
    
    if (idea.isImplemented) {
      toast.info("Diese Idee wurde bereits zu einem Beitrag konvertiert")
      return
    }
    
    if (idea.category === 'trend-reels') {
      const trendData = convertIdeaToTrendData(idea)
      setSelectedTrendData(trendData)
      setShowTrendWorkflow(true)
      return
    }
    
    if (idea.category === 'content-strategies' || idea.category === 'ai-strategies') {
      const contentStrategyData = convertIdeaToContentStrategyData(idea)
      setSelectedContentStrategyData(contentStrategyData)
      setShowContentStrategyWorkflow(true)
      return
    }
    
    const prefilledContent = {
      title: idea.title,
      description: idea.description + (idea.content.hook ? `\n\nHook: ${idea.content.hook}` : ''),
      hashtags: idea.content.hashtags || [],
      category: idea.category,
      source: idea.source,
      tags: idea.tags
    }
    
    setConvertingIdeaContent(prefilledContent)
    setIsCreatePostOpen(true)
    toast.info("Idee in Post-Editor geöffnet. Vervollständigen Sie die Erstellung.")
  }

  const handleSaveIdea = (idea: IdeaCardData) => {
    const updatedIdeas = ideas.map(i => 
      i.id === idea.id 
        ? { ...idea, lastModified: new Date().toISOString() }
        : i
    )
    setIdeas(updatedIdeas)
  }

  return (
    <div className="h-full w-full overflow-y-auto p-8">
      <div className="max-w-[1400px] mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Content Hub</h1>
              <p className="text-gray-600">Explore ideas and manage your draft content</p>
            </div>
            <Button 
              onClick={() => setIsCreatePostOpen(true)}
              size="default" 
              className="h-10 text-sm gap-2 px-4 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-full shadow-sm hover:shadow-md transition-all duration-200"
            >
              <Plus className="w-4 h-4" />
              Neuer Beitrag
            </Button>
          </div>

          {/* View Filter */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex bg-white rounded-full border border-gray-200 p-1 shadow-sm">
              <Button
                variant={selectedView === 'ideas' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedView('ideas')}
                className={`rounded-full px-4 py-2 text-sm transition-all ${
                  selectedView === 'ideas' 
                    ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Lightbulb className="w-4 h-4 mr-2" />
                Ideen
              </Button>
              <Button
                variant={selectedView === 'drafts' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedView('drafts')}
                className={`rounded-full px-4 py-2 text-sm transition-all ${
                  selectedView === 'drafts' 
                    ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Edit className="w-4 h-4 mr-2" />
                Entwürfe
              </Button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="space-y-6">
          {selectedView === "ideas" && (
            isLoadingIdeas ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
                  <p className="text-gray-600">Lade deine gespeicherten Ideen...</p>
                </div>
              </div>
            ) : (
              <IdeaGrid
                ideas={ideas}
                onAddIdea={handleAddIdea}
                onEditIdea={handleEditIdea}
                onDeleteIdea={handleDeleteIdea}
                onDuplicateIdea={handleDuplicateIdea}
                onConvertToPost={handleConvertIdeaToPost}
                onSaveIdea={handleSaveIdea}
              />
            )
          )}

          {selectedView === "drafts" && (
            <div className="space-y-6">
              {drafts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {drafts.map((draft) => (
                    <Card
                      key={draft.id}
                      className="overflow-hidden group border border-gray-100 shadow-sm bg-white hover:shadow-md transition-all duration-300 rounded-2xl"
                    >
                      <CardContent className="p-0">
                        <div className="aspect-video bg-gray-100 rounded-t-2xl overflow-hidden relative">
                          <img
                            src={draft.image || "/placeholder.svg"}
                            alt="Draft content"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.src = '/placeholder.svg'
                            }}
                          />
                          <div className="absolute top-3 right-3">
                            <Badge className="bg-white/90 backdrop-blur-sm text-gray-600 text-xs px-2.5 py-1 rounded-full border shadow-sm">
                              Draft
                            </Badge>
                          </div>
                        </div>
                        <div className="p-4">
                          <div className="flex items-center gap-1.5 mb-3">
                            {draft.platforms.map((platform) => (
                              <div
                                key={platform}
                                className="w-6 h-6 bg-gray-50 rounded-full flex items-center justify-center"
                              >
                                {platform === "instagram" && <Instagram className="w-3.5 h-3.5 text-pink-600" />}
                                {platform === "facebook" && <Facebook className="w-3.5 h-3.5 text-blue-600" />}
                                {platform === "twitter" && <Twitter className="w-3.5 h-3.5 text-blue-400" />}
                                {platform === "linkedin" && <Linkedin className="w-3.5 h-3.5 text-blue-700" />}
                                {platform === "tiktok" && <Video className="w-3.5 h-3.5 text-black" />}
                              </div>
                            ))}
                            <span className="text-xs text-gray-500 ml-auto">{draft.createdAt}</span>
                          </div>
                          <p className="text-sm text-gray-700 mb-4 line-clamp-3 leading-relaxed">{draft.content}</p>
                          <div className="flex items-center gap-2">
                            <Button 
                              size="sm" 
                              className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-full h-8 text-xs"
                              onClick={() => handleUpdatePostStatus(draft.id, 'published')}
                            >
                              Post Now
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="flex-1 border-gray-200 rounded-full h-8 hover:bg-gray-50 text-xs"
                              onClick={() => handleUpdatePostStatus(draft.id, 'scheduled')}
                            >
                              Schedule
                            </Button>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="px-2 h-8 w-8 rounded-full hover:bg-gray-100"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl rounded-2xl">
                                <DialogHeader>
                                  <DialogTitle>Edit Post</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <Textarea
                                    placeholder="Schreiben Sie Ihre Bildunterschrift..."
                                    defaultValue={draft.content}
                                    className="min-h-[100px] border-gray-200 rounded-xl resize-none"
                                  />
                                  <div className="flex gap-4">
                                    <Button className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-full">
                                      Save Changes
                                    </Button>
                                    <Button variant="outline" className="rounded-full">
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-r from-teal-500/10 to-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Edit className="w-8 h-8 text-teal-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No drafts yet</h3>
                  <p className="text-gray-600 mb-6">Create your first draft to get started. You can then schedule it for later or publish it immediately.</p>
                  <Button 
                    onClick={() => setIsCreatePostOpen(true)}
                    className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white rounded-full px-6"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Draft
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <CreatePostDialog
        open={isCreatePostOpen} 
        onOpenChange={(open) => {
          setIsCreatePostOpen(open)
          if (!open) {
            setConvertingIdeaContent(null)
            setEditingPostId(null)
          }
        }} 
        onPostCreated={async () => {
          try {
            await actions.fetchPosts()
            
            if (editingPostId) {
              toast.success("Beitrag erfolgreich aktualisiert!")
            } else if (convertingIdeaContent) {
              const ideaToMark = ideas.find(i => i.title === convertingIdeaContent.title)
              if (ideaToMark) {
                const updatedIdeas = ideas.map(i => 
                  i.id === ideaToMark.id 
                    ? { ...i, isImplemented: true, implementedPostId: `post-${Date.now()}` }
                    : i
                )
                setIdeas(updatedIdeas)
                toast.success("Idee erfolgreich zu Post konvertiert!")
              }
            } else {
              toast.success("Neuer Beitrag erfolgreich erstellt!")
            }
            
            setConvertingIdeaContent(null)
            setEditingPostId(null)
          } catch (error) {
            console.error('Error in post creation callback:', error)
          }
        }}
        initialContent={convertingIdeaContent || undefined}
      />
    </div>
  )
}