"use client"

import { useState } from "react"
import { v4 as uuidv4 } from 'uuid';
import { IdeaCard, type IdeaCardData } from "./idea-card"
import { Video, FileText, Sparkles } from "lucide-react"

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
        return idea.category === 'content-strategies' || idea.category === 'ai-strategies'
      default:
        return true
    }
  })

  const handleIdeaConvert = async (idea: IdeaCardData) => {
    try {
      await onConvertToPost?.(idea)
      // Optionally mark as implemented after conversion
      if (onSaveIdea) {
        const updatedIdea = { ...idea, isImplemented: true, implementedPostId: uuidv4() }
        onSaveIdea(updatedIdea)
      }
    } catch (error) {
      console.error('Error converting idea to post:', error)
    }
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Modern Filter Buttons */}
      <div className="flex items-center justify-center">
        <div className="flex items-center bg-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.04)] border border-gray-100 p-1">
          <button
            onClick={() => setSelectedFilter('reel-ideas')}
            className={`flex items-center gap-3 px-6 py-3 text-sm font-medium transition-all duration-200 rounded-xl
              ${selectedFilter === 'reel-ideas'
                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
          >
            <Video className="w-4 h-4" />
            Reel Ideen
            {selectedFilter === 'reel-ideas' && (
              <div className="w-2 h-2 bg-white rounded-full" />
            )}
          </button>
          <button
            onClick={() => setSelectedFilter('posts')}
            className={`flex items-center gap-3 px-6 py-3 text-sm font-medium transition-all duration-200 rounded-xl
              ${selectedFilter === 'posts'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
          >
            <FileText className="w-4 h-4" />
            Posts
            {selectedFilter === 'posts' && (
              <div className="w-2 h-2 bg-white rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* Ideas Grid */}
      {filteredIdeas.length > 0 ? (
        <>
          {/* Grid Stats */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              {filteredIdeas.length} {selectedFilter === 'reel-ideas' ? 'Reel-Ideen' : 'Post-Ideen'} verfügbar
            </p>
          </div>

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
        </>
      ) : (
        <div className="text-center py-16">
          <div className="max-w-md mx-auto">
            <div className="w-20 h-20 bg-gradient-to-r from-gray-50 to-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
              {selectedFilter === 'reel-ideas' ? 
                <Video className="w-10 h-10 text-gray-400" /> : 
                <FileText className="w-10 h-10 text-gray-400" />
              }
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Noch keine {selectedFilter === 'reel-ideas' ? 'Reel-Ideen' : 'Post-Ideen'}
            </h3>
            <p className="text-gray-600 mb-8 leading-relaxed">
              {selectedFilter === 'reel-ideas' 
                ? 'Erstelle deine ersten Reel-Ideen für kurze, virale Videos die deine Zielgruppe begeistern.'
                : 'Erstelle deine ersten Post-Ideen für längere, informative Beiträge mit hohem Engagement.'
              }
            </p>
            
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <Sparkles className="w-4 h-4" />
              <span>Nutze den Content-Generator um Ideen zu erstellen</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 