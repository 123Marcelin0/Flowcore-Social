"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Edit, Eye, Copy, Check, Plus } from "lucide-react"
import { CreatePostDialog } from "../../create-post-dialog"
import type { ContentStep } from "../hooks/useContentIdeas"

interface ContentIdeasScriptProps {
  // State
  scriptTitle: string
  scriptDescription: string
  scriptContent: string
  visualGuidance: string
  contentType: 'video' | 'photo'
  isUploadingMedia: boolean
  generatedHashtags: string[]
  uploadedMedia: Array<{id: string, type: 'image' | 'video', url: string, name: string}>
  copiedItems: Set<string>
  uploadInputRef: React.RefObject<HTMLInputElement | null>

  // Setters
  setCurrentStep: (step: ContentStep) => void
  setScriptTitle: (title: string) => void
  setScriptDescription: (description: string) => void
  setScriptContent: (content: string) => void
  setVisualGuidance: (guidance: string) => void
  setContentType: (type: 'video' | 'photo') => void

  // Functions
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
  handleRemoveMedia: (mediaId: string) => void
  copyToClipboard: (text: string, itemId: string) => void
}

export function ContentIdeasScript({
  scriptTitle,
  scriptDescription,
  scriptContent,
  visualGuidance,
  contentType,
  isUploadingMedia,
  generatedHashtags,
  uploadedMedia,
  copiedItems,
  uploadInputRef,
  setCurrentStep,
  setScriptTitle,
  setScriptDescription,
  setScriptContent,
  setVisualGuidance,
  setContentType,
  handleFileUpload,
  handleRemoveMedia,
  copyToClipboard,
}: ContentIdeasScriptProps) {
  const [showCreatePost, setShowCreatePost] = useState(false)

  // Prepare content for post creation
  const preparePostContent = () => {
    // Combine script title and content for the post description
    const postDescription = scriptTitle 
      ? `${scriptTitle}\n\n${scriptContent}` 
      : scriptContent

    // Combine script content and visual guidance if available
    const fullContent = visualGuidance 
      ? `${postDescription}\n\n---\nVisuelle Anleitung:\n${visualGuidance}`
      : postDescription

    return {
      title: scriptTitle || "Immobilien Content Script",
      description: fullContent,
      hashtags: generatedHashtags
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="max-w-full mx-auto px-8 py-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => setCurrentStep("develop")}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4" />
                Zurück
              </Button>
              <div className="h-6 w-px bg-gray-200"></div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">🏠 Immobilien Content Script</h1>
                <p className="text-sm text-gray-500">Basierend auf Ihren aktuellen Gesprächen</p>
              </div>
            </div>
            
            {/* Single Neuer Post Button */}
            <Button 
              onClick={() => setShowCreatePost(true)}
              className="h-14 px-8 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 hover:from-emerald-600 hover:via-blue-600 hover:to-purple-600 text-white rounded-2xl font-semibold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
              <Plus className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform duration-300" />
              Neuer Post
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content - Wide 2-column layout */}
      <div className="max-w-full mx-auto px-8 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-none">
          
          {/* Left Column - Script */}
          <Card className="border-0 shadow-lg rounded-2xl bg-white/95 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center">
                    <Edit className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-semibold text-gray-900">🏠 Immobilien Script</h2>
                </div>
                <button
                  onClick={() => copyToClipboard(scriptContent, 'script-content')}
                  className="p-3 rounded-lg hover:bg-gray-100 transition-colors group"
                >
                  {copiedItems.has('script-content') ? (
                    <Check className="w-6 h-6 text-green-600" />
                  ) : (
                    <Copy className="w-6 h-6 text-gray-400 group-hover:text-gray-600" />
                  )}
                </button>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-8 border border-gray-100">
                <textarea 
                  value={scriptContent}
                  onChange={(e) => setScriptContent(e.target.value)}
                  className="w-full h-[32rem] bg-transparent border-0 focus:outline-none text-lg leading-relaxed resize-none text-gray-800 placeholder-gray-400 font-mono"
                  placeholder="Ihr professionelles Immobilien-Script wird hier angezeigt..."
                />
              </div>
              
              {/* Hashtags section */}
              {generatedHashtags.length > 0 && (
                <div className="mt-6 p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-purple-500 font-bold text-xl">#</span>
                    <h3 className="text-lg font-semibold text-gray-900">Hashtags</h3>
                    <button
                      onClick={() => copyToClipboard(generatedHashtags.join(' '), 'hashtags')}
                      className="ml-auto p-2 rounded-lg hover:bg-gray-100 transition-colors group"
                    >
                      {copiedItems.has('hashtags') ? (
                        <Check className="w-5 h-5 text-green-600" />
                      ) : (
                        <Copy className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                      )}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {generatedHashtags.map((hashtag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-3 py-2 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 text-purple-700 rounded-lg text-sm font-medium hover:from-purple-100 hover:to-pink-100 transition-all cursor-pointer"
                        onClick={() => {
                          navigator.clipboard.writeText(hashtag)
                        }}
                      >
                        <span className="text-purple-500">#</span>
                        {hashtag.replace('#', '')}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right Column - Visual Guidance */}
          <Card className="border-0 shadow-lg rounded-2xl bg-white/95 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                    <Eye className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-semibold text-gray-900">Visuelle Anleitung</h2>
                </div>
                <button
                  onClick={() => copyToClipboard(visualGuidance, 'visual-guidance')}
                  className="p-3 rounded-lg hover:bg-gray-100 transition-colors group"
                >
                  {copiedItems.has('visual-guidance') ? (
                    <Check className="w-6 h-6 text-green-600" />
                  ) : (
                    <Copy className="w-6 h-6 text-gray-400 group-hover:text-gray-600" />
                  )}
                </button>
              </div>
              
              <div className="bg-orange-50 rounded-xl p-8 border border-orange-100">
                <textarea 
                  value={visualGuidance}
                  onChange={(e) => setVisualGuidance(e.target.value)}
                  className="w-full h-[32rem] bg-transparent border-0 focus:outline-none text-lg leading-relaxed resize-none text-gray-800 placeholder-gray-400 font-mono"
                  placeholder="Visuelle Anleitung für Immobilien-Content..."
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Hidden input for file upload - kept for backward compatibility */}
      <input
        type="file"
        ref={uploadInputRef}
        multiple
        accept="image/*,video/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Create Post Dialog with pre-filled content */}
      <CreatePostDialog
        open={showCreatePost}
        onOpenChange={setShowCreatePost}
        onPostCreated={() => {
          setShowCreatePost(false)
          // Optional: show success message or redirect
        }}
        initialContent={preparePostContent()}
      />
    </div>
  )
} 