"use client"

import { useState } from "react"
import { IdeaCard, type IdeaCardData } from "./idea-card"
import { Video, FileText } from "lucide-react"

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

type FilterOption = 'reel-ideas' | 'posts'

export function IdeaGrid({ 
  ideas = [], 
  onEditIdea, 
  onDeleteIdea, 
  onDuplicateIdea, 
  onConvertToPost, 
  onSaveIdea,
  className = ""
}: IdeaGridProps) {
  const [selectedFilter, setSelectedFilter] = useState<FilterOption>("reel-ideas")

  // Filter ideas based on selected filter
  const filteredIdeas = ideas.filter(idea => {
    switch (selectedFilter) {
      case 'reel-ideas':
        return idea.category === 'trend-reels'
      case 'posts':
        return idea.category === 'content-strategies'
      default:
        return true
    }
  })

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
      {/* Simple Filter Buttons */}
      <div className="flex items-center justify-center">
        <div className="flex items-center bg-white rounded-full shadow-sm border border-gray-100 p-0.5">
          <button
            onClick={() => setSelectedFilter('reel-ideas')}
            className={`flex items-center gap-2 px-6 py-2.5 text-sm font-medium transition-all rounded-full
              ${selectedFilter === 'reel-ideas'
                ? 'bg-gradient-to-r from-teal-500/10 to-cyan-500/10 text-teal-600 border border-teal-200'
                : 'text-gray-600 hover:bg-gray-50'
              }`}
          >
            <Video className="w-4 h-4" />
            Reel Ideen
          </button>
          <button
            onClick={() => setSelectedFilter('posts')}
            className={`flex items-center gap-2 px-6 py-2.5 text-sm font-medium transition-all rounded-full
              ${selectedFilter === 'posts'
                ? 'bg-gradient-to-r from-teal-500/10 to-cyan-500/10 text-teal-600 border border-teal-200'
                : 'text-gray-600 hover:bg-gray-50'
              }`}
          >
            <FileText className="w-4 h-4" />
            Posts
          </button>
        </div>
      </div>

      {/* Ideas Grid */}
      {filteredIdeas.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredIdeas.map((idea) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              onEdit={onEditIdea}
              onDelete={onDeleteIdea}
              onDuplicate={onDuplicateIdea}
              onConvertToPost={handleIdeaConvert}
              onSave={onSaveIdea}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-xl">
          <div className="w-16 h-16 bg-gradient-to-r from-teal-500/10 to-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            {selectedFilter === 'reel-ideas' ? 
              <Video className="w-8 h-8 text-teal-600" /> : 
              <FileText className="w-8 h-8 text-teal-600" />
            }
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Keine {selectedFilter === 'reel-ideas' ? 'Reel Ideen' : 'Posts'} gefunden
          </h3>
          <p className="text-gray-600">
            {selectedFilter === 'reel-ideas' 
              ? 'Erstelle deine ersten Reel-Ideen für kurze, virale Videos.'
              : 'Erstelle deine ersten Post-Ideen für längere, informative Beiträge.'
            }
          </p>
        </div>
      )}
    </div>
  )
} 