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
  const [isConverting, setIsConverting] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editedIdea, setEditedIdea] = useState<IdeaCardData>(idea)

  const categoryStyle = categoryConfig[idea.category]
  const CategoryIcon = categoryStyle.icon

  const handleCardClick = () => {
    if (idea.category === 'trend-reels') {
      // For trend-reels, trigger the conversion which will be handled by ContentHub
      handleConvertToPost()
    }
  }

  const handleConvertToPost = async () => {
    setIsConverting(true)
    try {
      await onConvertToPost?.(idea)
      if (idea.category !== 'trend-reels') {
        toast.success("Idee erfolgreich als Post erstellt!")
      }
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
                      <Play className="w-3 h-3 text-gray-500" />
                      <span className="text-xs text-gray-500">Klicken für Workflow</span>
                    </div>
                  )}
                </div>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-full hover:bg-gray-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setIsEditDialogOpen(true) }}>
                    <Edit3 className="w-4 h-4 mr-2" />
                    Bearbeiten
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate?.(idea) }}>
                    <Copy className="w-4 h-4 mr-2" />
                    Duplizieren
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={(e) => { e.stopPropagation(); onDelete?.(idea.id) }}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Löschen
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Title */}
            <h3 className="font-semibold text-gray-900 mb-3 text-lg leading-tight">
              {idea.title}
            </h3>

            {/* Description */}
            <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-3">
              {idea.description}
            </p>

            {/* Hook Preview */}
            {idea.content.hook && (
              <div className="bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-xl p-3 mb-4 border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-medium text-gray-700">Hook Preview</span>
                </div>
                <p className="text-sm text-gray-700 italic leading-relaxed">
                  "{idea.content.hook}"
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500">
                  {idea.category === 'trend-reels' ? 'Reel-Content erstellen' : 'In wenigen Minuten umsetzen'}
                </span>
              </div>
            </div>

            {/* Convert to Post Button */}
            {!idea.isImplemented && (
              <Button 
                size="sm" 
                className={`
                  h-9 px-4 text-sm font-medium rounded-xl transition-all duration-200 shadow-sm
                  bg-gradient-to-r ${categoryStyle.gradientBg} text-white 
                  hover:shadow-md hover:scale-105 border-0
                  flex items-center gap-2
                `}
                onClick={(e) => {
                  e.stopPropagation() // Prevent card click when button is clicked
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

            {/* Implementation Badge */}
            {idea.isImplemented && (
              <Badge className="bg-green-100 text-green-800 text-xs px-3 py-1">
                ✓ Umgesetzt
              </Badge>
            )}
          </div>

          {/* Implementation Badge Overlay */}
          {idea.isImplemented && (
            <div className="absolute top-3 right-3 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-sm">
              <span className="text-white text-xs">✓</span>
            </div>
          )}
        </CardContent>
      </Card>

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
                placeholder="Beschreibung der Idee..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Hook (optional)</label>
              <Input 
                value={editedIdea.content.hook || ''}
                onChange={(e) => setEditedIdea(prev => ({ 
                  ...prev, 
                  content: { ...prev.content, hook: e.target.value }
                }))}
                placeholder="Eingängiger Hook für den Content..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Priorität</label>
                <Select 
                  value={editedIdea.priority} 
                  onValueChange={(value: 'low' | 'medium' | 'high') => 
                    setEditedIdea(prev => ({ ...prev, priority: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Niedrig</SelectItem>
                    <SelectItem value="medium">Mittel</SelectItem>
                    <SelectItem value="high">Hoch</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Aufwand</label>
                <Select 
                  value={editedIdea.estimatedEffort} 
                  onValueChange={(value: 'quick' | 'medium' | 'complex') => 
                    setEditedIdea(prev => ({ ...prev, estimatedEffort: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quick">Schnell</SelectItem>
                    <SelectItem value="medium">Mittel</SelectItem>
                    <SelectItem value="complex">Komplex</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

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
        </DialogContent>
      </Dialog>
    </>
  )
} 