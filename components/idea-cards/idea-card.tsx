"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { 
  Sparkles, 
  Edit3, 
  Copy, 
  Trash2,
  TrendingUp,
  Brain,
  Target,
  Send,
  MoreHorizontal,
  Play,
  ArrowRight
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { TrendOptimizationWorkflow } from "@/app/components/trend-optimization-workflow"

export interface IdeaCardData {
  id: string
  title: string
  description: string
  category: 'trend-reels' | 'content-strategies' | 'ai-strategies'
  source?: 'ai-generated' | 'trend-explorer' | 'manual' | 'content-strategy'
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
  savedAt: string
  lastModified: string
  tags: string[]
  isImplemented?: boolean
  implementedPostId?: string
  estimatedEffort: 'quick' | 'medium' | 'complex'
}

interface IdeaCardProps {
  idea: IdeaCardData
  onEdit?: (idea: IdeaCardData) => void
  onDelete?: (ideaId: string) => void
  onDuplicate?: (idea: IdeaCardData) => void
  onConvertToPost?: (idea: IdeaCardData) => void
  onSave?: (idea: IdeaCardData) => void
  className?: string
  draggable?: boolean
  onDragStart?: (e: React.DragEvent, idea: IdeaCardData) => void
  onDragEnd?: (e: React.DragEvent) => void
}

const categoryConfig = {
  'trend-reels': {
    icon: TrendingUp,
    color: "from-orange-50 to-red-50",
    iconColor: "text-orange-600",
    borderColor: "border-orange-200",
    gradientBg: "from-orange-500 to-red-500",
    label: "Reel Idee"
  },
  'content-strategies': {
    icon: Target,
    color: "from-blue-50 to-indigo-50",
    iconColor: "text-blue-600",
    borderColor: "border-blue-200",
    gradientBg: "from-blue-500 to-indigo-500",
    label: "Post Idee"
  },
  'ai-strategies': {
    icon: Brain,
    color: "from-purple-50 to-violet-50",
    iconColor: "text-purple-600",
    borderColor: "border-purple-200",
    gradientBg: "from-purple-500 to-violet-500",
    label: "AI Idee"
  }
}

export function IdeaCard({ 
  idea, 
  onEdit, 
  onDelete, 
  onDuplicate, 
  onConvertToPost, 
  onSave,
  className = "",
  draggable = false,
  onDragStart,
  onDragEnd
}: IdeaCardProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isConverting, setIsConverting] = useState(false)
  const [editedIdea, setEditedIdea] = useState<IdeaCardData>(idea)
  const [showTrendWorkflow, setShowTrendWorkflow] = useState(false)

  const categoryStyle = categoryConfig[idea.category]
  const CategoryIcon = categoryStyle.icon

  // Convert idea card data to trend data for workflow
  const ideaToTrendData = (ideaData: IdeaCardData) => ({
    id: ideaData.id,
    thumbnail_url: '/placeholder.jpg',
    reel_url: `https://example.com/reel/${ideaData.id}`,
    title: ideaData.title,
    creator: '@content_creator',
    script: ideaData.content.script || ideaData.description,
    description: ideaData.description
  })

  const handleCardClick = () => {
    if (idea.category === 'trend-reels') {
      setShowTrendWorkflow(true)
    }
  }

  const handleConvertToPost = async () => {
    if (idea.category === 'trend-reels') {
      // For reel ideas, open the trend optimization workflow
      setShowTrendWorkflow(true)
      return
    }

    // For other types, use the original conversion
    setIsConverting(true)
    try {
      await onConvertToPost?.(idea)
      toast.success("Idee erfolgreich als Post erstellt!")
    } catch (error) {
      toast.error("Fehler beim Erstellen des Posts")
    } finally {
      setIsConverting(false)
    }
  }

  const handleSaveEdit = () => {
    onSave?.(editedIdea)
    setIsEditDialogOpen(false)
    toast.success("Idee erfolgreich aktualisiert!")
  }

  return (
    <>
      <Card 
        className={`
          group relative overflow-hidden transition-all duration-300 hover:shadow-lg
          border-0 bg-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.04)]
          ${idea.isImplemented ? 'opacity-75' : 'hover:scale-[1.02] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]'}
          ${idea.category === 'trend-reels' ? 'cursor-pointer' : ''}
          ${className}
        `}
        draggable={draggable}
        onDragStart={onDragStart ? (e) => onDragStart(e, idea) : undefined}
        onDragEnd={onDragEnd}
        onClick={handleCardClick}
      >
        <CardContent className="p-0">
          {/* Modern Header */}
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${categoryStyle.color} flex items-center justify-center shadow-sm`}>
                  <CategoryIcon className={`w-5 h-5 ${categoryStyle.iconColor}`} />
                </div>
                <div>
                  <Badge variant="outline" className={`${categoryStyle.borderColor} ${categoryStyle.iconColor} bg-white text-xs font-medium border-0 bg-gradient-to-r ${categoryStyle.color}`}>
                    {categoryStyle.label}
                  </Badge>
                  {idea.category === 'trend-reels' && (
                    <div className="flex items-center gap-1 mt-1">
                      <Play className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500">Klicken für Workflow</span>
                    </div>
                  )}
                </div>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-full hover:bg-gray-100">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={handleConvertToPost} disabled={isConverting}>
                    <Send className="w-4 h-4 mr-2" />
                    {isConverting ? "Erstelle..." : "Post erstellen"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                    <Edit3 className="w-4 h-4 mr-2" />
                    Bearbeiten
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDuplicate?.(idea)}>
                    <Copy className="w-4 h-4 mr-2" />
                    Duplizieren
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onDelete?.(idea.id)} 
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Löschen
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Clean Title and Description */}
            <h3 className="font-semibold text-gray-900 mb-3 text-lg leading-tight">{idea.title}</h3>
            <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed mb-6">{idea.description}</p>
          </div>

          {/* Hook Preview */}
          {idea.content?.hook && (
            <div className="px-6 pb-4">
              <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-100">
                <div className="text-xs text-gray-500 mb-2 flex items-center gap-2">
                  <Sparkles className="w-3 h-3" />
                  Hook Vorschau
                </div>
                <p className="text-sm text-gray-700 italic line-clamp-2 font-medium">"{idea.content.hook}"</p>
              </div>
            </div>
          )}

          {/* Prominent Action Button */}
          <div className="px-6 pb-6">
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500">
                {idea.category === 'trend-reels' ? 'Kurzes Video • Viral Potential' : 'Informativer Post • Engagement Focus'}
              </div>
              
              {idea.isImplemented ? (
                <Badge className="bg-green-100 text-green-700 text-xs px-3 py-1.5 border-0 rounded-full font-medium">
                  ✅ Umgesetzt
                </Badge>
              ) : (
                <Button 
                  size="sm" 
                  className={`
                    h-9 px-4 text-sm font-medium rounded-xl transition-all duration-200 shadow-sm
                    bg-gradient-to-r ${categoryStyle.gradientBg} text-white 
                    hover:shadow-md hover:scale-105 border-0
                    flex items-center gap-2
                  `}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleConvertToPost()
                  }}
                  disabled={isConverting}
                >
                  {isConverting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Erstelle...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Post erstellen
                      <ArrowRight className="w-3 h-3" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Implementation Badge Overlay */}
          {idea.isImplemented && (
            <div className="absolute top-3 right-3 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-sm">
              <span className="text-white text-xs">✓</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trend Optimization Workflow Dialog */}
      {showTrendWorkflow && (
        <Dialog open={showTrendWorkflow} onOpenChange={setShowTrendWorkflow}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0">
            <TrendOptimizationWorkflow
              trend={ideaToTrendData(idea)}
              onBack={() => setShowTrendWorkflow(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="w-5 h-5" />
              Idee bearbeiten
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Titel</label>
              <Input 
                value={editedIdea.title}
                onChange={(e) => setEditedIdea(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Titel der Idee..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Beschreibung</label>
              <Textarea 
                value={editedIdea.description}
                onChange={(e) => setEditedIdea(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Beschreibe deine Idee..."
                className="min-h-[80px]"
              />
            </div>

            {editedIdea.content?.hook && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Hook</label>
                <Textarea 
                  value={editedIdea.content.hook}
                  onChange={(e) => setEditedIdea(prev => ({ 
                    ...prev,
                    content: { ...prev.content, hook: e.target.value }
                  }))}
                  placeholder="Dein fesselnder Hook..."
                  className="min-h-[60px]"
                />
              </div>
            )}

            <div className="flex items-center gap-4 pt-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="implemented"
                  checked={editedIdea.isImplemented}
                  onCheckedChange={(checked) => 
                    setEditedIdea(prev => ({ ...prev, isImplemented: checked as boolean }))
                  }
                />
                <label htmlFor="implemented" className="text-sm">Als umgesetzt markieren</label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleSaveEdit} className="bg-gradient-to-r from-teal-500 to-cyan-500">
                Speichern
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
} 