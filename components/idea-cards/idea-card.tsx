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
  MoreHorizontal
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
    label: "Reel Idee"
  },
  'content-strategies': {
    icon: Target,
    color: "from-blue-50 to-indigo-50",
    iconColor: "text-blue-600",
    borderColor: "border-blue-200",
    label: "Post Idee"
  },
  'ai-strategies': {
    icon: Brain,
    color: "from-purple-50 to-violet-50",
    iconColor: "text-purple-600",
    borderColor: "border-purple-200",
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

  const categoryStyle = categoryConfig[idea.category]
  const CategoryIcon = categoryStyle.icon

  const handleConvertToPost = async () => {
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
          group relative overflow-hidden transition-all duration-300 hover:shadow-xl
          border-2 ${categoryStyle.borderColor} bg-gradient-to-br ${categoryStyle.color}
          ${idea.isImplemented ? 'opacity-75' : 'hover:scale-[1.02]'}
          ${className}
        `}
        draggable={draggable}
        onDragStart={onDragStart ? (e) => onDragStart(e, idea) : undefined}
        onDragEnd={onDragEnd}
      >
        <CardContent className="p-0">
          {/* Clean Header */}
          <div className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <CategoryIcon className={`w-5 h-5 ${categoryStyle.iconColor}`} />
                <Badge variant="outline" className={`${categoryStyle.borderColor} ${categoryStyle.iconColor} bg-white text-xs font-medium`}>
                  {categoryStyle.label}
                </Badge>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
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
            <h3 className="font-semibold text-gray-900 mb-3 text-base leading-tight">{idea.title}</h3>
            <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed mb-4">{idea.description}</p>
          </div>

            {/* Hook Preview */}
            {idea.content?.hook && (
              <div className="px-5 pb-4">
                <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Hook
                </div>
                <p className="text-sm text-gray-700 italic line-clamp-2">"{idea.content.hook}"</p>
              </div>
            )}

            {/* Simple Footer */}
            <div className="px-5 pb-5">
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  {idea.category === 'trend-reels' ? 'Kurzes Video' : 'Informativer Post'}
                </div>
                
                {idea.isImplemented ? (
                  <Badge className="bg-green-100 text-green-700 text-xs px-2 py-1 border-0">
                    ✅ Umgesetzt
                  </Badge>
                ) : (
                  <Button 
                    size="sm" 
                    className="h-7 text-xs px-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white border-0 shadow-sm"
                    onClick={handleConvertToPost}
                    disabled={isConverting}
                  >
                    {isConverting ? "Erstelle..." : "Post erstellen"}
                  </Button>
                )}
              </div>
            </div>

          {/* Implementation Badge Overlay */}
          {idea.isImplemented && (
            <div className="absolute top-2 right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
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
              <CategoryIcon className={`w-5 h-5 ${categoryStyle.iconColor}`} />
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
                Änderungen speichern
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
} 