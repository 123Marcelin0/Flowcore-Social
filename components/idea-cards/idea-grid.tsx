"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { IdeaCard, type IdeaCardData } from "./idea-card"
import { 
  Plus, 
  Search, 
  Filter, 
  SortAsc, 
  Grid, 
  List, 
  Lightbulb,
  TrendingUp,
  Brain,
  Target,
  FileText,
  Share2,
  Archive,
  CheckSquare,
  Clock
} from "lucide-react"
import { toast } from "sonner"

interface IdeaGridProps {
  ideas: IdeaCardData[]
  onAddIdea?: () => void
  onEditIdea?: (idea: IdeaCardData) => void
  onDeleteIdea?: (ideaId: string) => void
  onDuplicateIdea?: (idea: IdeaCardData) => void
  onConvertToPost?: (idea: IdeaCardData) => void
  onSaveIdea?: (idea: IdeaCardData) => void
  className?: string
  showCreateButton?: boolean
}

type SortOption = 'newest' | 'oldest' | 'priority' | 'effort' | 'category'
type FilterOption = 'all' | 'trend-reels' | 'content-strategies' | 'ai-strategies'
type ViewMode = 'grid' | 'list'

const categoryIcons = {
  'trend-reels': TrendingUp,
  'content-strategies': Target,
  'ai-strategies': Brain
}

const filterStats = (ideas: IdeaCardData[]) => {
  const stats = {
    total: ideas.length,
    implemented: ideas.filter(i => i.isImplemented).length,
    highPriority: ideas.filter(i => i.priority === 'high').length,
    quickWins: ideas.filter(i => i.estimatedEffort === 'quick' && !i.isImplemented).length
  }
  return stats
}

export function IdeaGrid({ 
  ideas = [], 
  onAddIdea, 
  onEditIdea, 
  onDeleteIdea, 
  onDuplicateIdea, 
  onConvertToPost, 
  onSaveIdea,
  className = "",
  showCreateButton = true
}: IdeaGridProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<FilterOption>("all")
  const [sortBy, setSortBy] = useState<SortOption>("newest")
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [showImplemented, setShowImplemented] = useState(true)

  // Filter and sort ideas
  const filteredAndSortedIdeas = ideas
    .filter(idea => {
      // Search filter
      const matchesSearch = searchTerm === "" || 
        idea.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        idea.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        idea.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      
      // Category filter
      const matchesCategory = selectedCategory === "all" || idea.category === selectedCategory
      
      // Implementation filter
      const matchesImplementation = showImplemented || !idea.isImplemented
      
      return matchesSearch && matchesCategory && matchesImplementation
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
        case 'oldest':
          return new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime()
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 }
          return priorityOrder[b.priority] - priorityOrder[a.priority]
        case 'effort':
          const effortOrder = { quick: 1, medium: 2, complex: 3 }
          return effortOrder[a.estimatedEffort] - effortOrder[b.estimatedEffort]
        case 'category':
          return a.category.localeCompare(b.category)
        default:
          return 0
      }
    })

  const stats = filterStats(filteredAndSortedIdeas)

  const categoryCount = (category: FilterOption) => {
    if (category === 'all') return ideas.length
    return ideas.filter(idea => idea.category === category).length
  }

  const handleIdeaConvert = async (idea: IdeaCardData) => {
    try {
      await onConvertToPost?.(idea)
      // Optionally mark as implemented after conversion
      if (onSaveIdea) {
        const updatedIdea = { ...idea, isImplemented: true, implementedPostId: `post-${Date.now()}` }
        onSaveIdea(updatedIdea)
      }
    } catch (error) {
      console.error('Error converting idea to post:', error)
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Stats */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-1">Content Ideas</h2>
            <p className="text-sm text-gray-600">
              {stats.total} total • {stats.implemented} implemented • {stats.quickWins} quick wins
            </p>
          </div>
          {showCreateButton && (
            <Button 
              onClick={onAddIdea}
              size="sm" 
              className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Idea
            </Button>
          )}
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white border border-gray-200 rounded-xl p-3">
            <div className="flex items-center gap-2">
              <Archive className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">Total Ideas</span>
            </div>
            <p className="text-lg font-semibold text-gray-900 mt-1">{stats.total}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-3">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-green-500" />
              <span className="text-sm text-gray-600">Implemented</span>
            </div>
            <p className="text-lg font-semibold text-gray-900 mt-1">{stats.implemented}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-red-500" />
              <span className="text-sm text-gray-600">High Priority</span>
            </div>
            <p className="text-lg font-semibold text-gray-900 mt-1">{stats.highPriority}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-500" />
              <span className="text-sm text-gray-600">Quick Wins</span>
            </div>
            <p className="text-lg font-semibold text-gray-900 mt-1">{stats.quickWins}</p>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search ideas, tags, or descriptions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-gray-200"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <div className="flex items-center gap-1">
              {(['all', 'trend-reels', 'content-strategies', 'ai-strategies'] as FilterOption[]).map((category) => {
                const Icon = category !== 'all' ? categoryIcons[category as keyof typeof categoryIcons] : Archive
                const count = categoryCount(category)
                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs transition-all ${
                      selectedCategory === category 
                        ? 'bg-teal-100 text-teal-700 border border-teal-200' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    {category === 'all' ? 'All' : 
                     category === 'trend-reels' ? 'Trend Reels' :
                     category === 'content-strategies' ? 'Content Strategies' :
                     category === 'ai-strategies' ? 'AI Strategies' : category}
                    <Badge variant="outline" className="ml-1 text-xs bg-white border-current">
                      {count}
                    </Badge>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Sort */}
          <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
            <SelectTrigger className="w-40 h-8">
              <div className="flex items-center gap-2">
                <SortAsc className="w-3 h-3" />
                <SelectValue placeholder="Sort by..." />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="priority">By Priority</SelectItem>
              <SelectItem value="effort">By Effort</SelectItem>
              <SelectItem value="category">By Category</SelectItem>
            </SelectContent>
          </Select>

          {/* View Mode */}
          <div className="flex items-center border border-gray-200 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-teal-100 text-teal-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-teal-100 text-teal-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Show Implemented Toggle */}
          <button
            onClick={() => setShowImplemented(!showImplemented)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition-all ${
              showImplemented 
                ? 'bg-green-100 text-green-700 border border-green-200' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <CheckSquare className="w-3 h-3" />
            {showImplemented ? 'Hide Implemented' : 'Show Implemented'}
          </button>
        </div>
      </div>

      {/* Ideas Grid/List */}
      {filteredAndSortedIdeas.length > 0 ? (
        <div className={`
          ${viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
            : 'space-y-4'
          }
        `}>
          {filteredAndSortedIdeas.map((idea) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              onEdit={onEditIdea}
              onDelete={onDeleteIdea}
              onDuplicate={onDuplicateIdea}
              onConvertToPost={handleIdeaConvert}
              onSave={onSaveIdea}
              className={viewMode === 'list' ? 'w-full' : ''}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-xl">
          <div className="w-16 h-16 bg-gradient-to-r from-teal-500/10 to-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lightbulb className="w-8 h-8 text-teal-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchTerm || selectedCategory !== 'all' 
              ? 'No ideas match your filters' 
              : 'No content ideas yet'
            }
          </h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || selectedCategory !== 'all'
              ? 'Try adjusting your search or filters to find more ideas.'
              : 'Start by brainstorming content ideas or exploring trending topics to get inspired.'
            }
          </p>
          {showCreateButton && (
            <Button 
              onClick={onAddIdea}
              className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white rounded-full px-6"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First Idea
            </Button>
          )}
        </div>
      )}
    </div>
  )
} 