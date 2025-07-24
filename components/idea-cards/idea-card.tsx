"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { 
  Lightbulb, 
  Sparkles, 
  Eye, 
  Edit3, 
  Copy, 
  Trash2, 
  ArrowRight,
  Clock,
  TrendingUp,
  Brain,
  Heart,
  Share2,
  Bookmark,
  Play,
  Image as ImageIcon,
  Video,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  MoreHorizontal,
  FileText,
  Palette,
  Target,
  Calendar,
  Send
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
    label: "Trend Reels"
  },
  'content-strategies': {
    icon: Target,
    color: "from-blue-50 to-indigo-50",
    iconColor: "text-blue-600",
    borderColor: "border-blue-200",
    label: "Content Strategies"
  },
  'ai-strategies': {
    icon: Brain,
    color: "from-purple-50 to-violet-50",
    iconColor: "text-purple-600",
    borderColor: "border-purple-200",
    label: "AI Strategies"
  }
}

const priorityConfig = {
  low: { color: "bg-gray-100 text-gray-600", label: "Low" },
  medium: { color: "bg-yellow-100 text-yellow-700", label: "Medium" },
  high: { color: "bg-red-100 text-red-700", label: "High" }
}

const effortConfig = {
  quick: { color: "bg-green-100 text-green-700", label: "Quick", icon: "⚡" },
  medium: { color: "bg-yellow-100 text-yellow-700", label: "Medium", icon: "⏱️" },
  complex: { color: "bg-red-100 text-red-700", label: "Complex", icon: "🧠" }
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
  const [isExpanded, setIsExpanded] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isConverting, setIsConverting] = useState(false)
  const [editedIdea, setEditedIdea] = useState<IdeaCardData>(idea)

  const categoryStyle = categoryConfig[idea.category]
  const priorityStyle = priorityConfig[idea.priority]
  const effortStyle = effortConfig[idea.estimatedEffort]
  const CategoryIcon = categoryStyle.icon

  const handleConvertToPost = async () => {
    setIsConverting(true)
    try {
      await onConvertToPost?.(idea)
      toast.success("Idea converted to post successfully!")
    } catch (error) {
      toast.error("Failed to convert idea to post")
    } finally {
      setIsConverting(false)
    }
  }

  const handleSaveEdit = () => {
    onSave?.(editedIdea)
    setIsEditDialogOpen(false)
    toast.success("Idea updated successfully!")
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Copied to clipboard!")
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return "Just now"
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInHours < 48) return "Yesterday"
    return date.toLocaleDateString()
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
          {/* Minimalist Header */}
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
                    {isConverting ? "Converting..." : "Create Post"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                    <Edit3 className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDuplicate?.(idea)}>
                    <Copy className="w-4 h-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onDelete?.(idea.id)} 
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Clean Title and Description */}
            <h3 className="font-semibold text-gray-900 mb-3 text-base leading-tight">{idea.title}</h3>
            <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed mb-4">{idea.description}</p>
          </div>

            {/* Essential Content Preview */}
            {idea.content?.hook && (
              <div className="px-5 pb-4">
                <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Hook
                </div>
                <p className="text-sm text-gray-700 italic line-clamp-1">"{idea.content.hook}"</p>
              </div>
            )}

            {/* Minimal Footer */}
            <div className="px-5 pb-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className={`text-xs px-2 py-0.5 ${priorityStyle.color} border-0`}>
                    {priorityStyle.label}
                  </Badge>
                  <Badge className={`text-xs px-2 py-0.5 ${effortStyle.color} border-0`}>
                    {effortStyle.icon} {effortStyle.label}
                  </Badge>
                  {idea.content?.estimatedReach && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {idea.content.estimatedReach > 1000 ? 
                        `${Math.round(idea.content.estimatedReach / 1000)}K` : 
                        idea.content.estimatedReach
                      }
                    </span>
                  )}
                </div>
                
                {idea.isImplemented ? (
                  <Badge className="bg-green-100 text-green-700 text-xs px-2 py-1 border-0">
                    ✅ Implemented
                  </Badge>
                ) : (
                  <Button 
                    size="sm" 
                    className="h-7 text-xs px-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white border-0 shadow-sm"
                    onClick={handleConvertToPost}
                    disabled={isConverting}
                  >
                    {isConverting ? "Converting..." : "Create Post"}
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
              Edit Idea
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input 
                value={editedIdea.title}
                onChange={(e) => setEditedIdea(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Idea title..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea 
                value={editedIdea.description}
                onChange={(e) => setEditedIdea(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your idea..."
                className="min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
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
                    <SelectItem value="low">Low Priority</SelectItem>
                    <SelectItem value="medium">Medium Priority</SelectItem>
                    <SelectItem value="high">High Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Effort</label>
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
                    <SelectItem value="quick">⚡ Quick</SelectItem>
                    <SelectItem value="medium">⏱️ Medium</SelectItem>
                    <SelectItem value="complex">🧠 Complex</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                  placeholder="Your compelling hook..."
                  className="min-h-[60px]"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Tags</label>
              <Input 
                value={editedIdea.tags.join(", ")}
                onChange={(e) => setEditedIdea(prev => ({ 
                  ...prev, 
                  tags: e.target.value.split(",").map(tag => tag.trim()).filter(Boolean)
                }))}
                placeholder="Tag1, Tag2, Tag3..."
              />
            </div>

            <div className="flex items-center gap-4 pt-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="implemented"
                  checked={editedIdea.isImplemented}
                  onCheckedChange={(checked) => 
                    setEditedIdea(prev => ({ ...prev, isImplemented: checked as boolean }))
                  }
                />
                <label htmlFor="implemented" className="text-sm">Mark as implemented</label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} className="bg-gradient-to-r from-teal-500 to-cyan-500">
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
} 