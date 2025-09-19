"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Sparkles, Lightbulb, MessageSquare, TrendingUp, Target, Bookmark, Grid3X3, Layers3, Zap } from "lucide-react"
import type { ContentStep } from "../hooks/useContentIdeas"
import { useState } from "react"

interface ContentIdeasOverviewProps {
  showSuccessAnimation: boolean
  setCurrentStep: (step: ContentStep) => void
  triggerSuccessAnimation: () => void
}

export function ContentIdeasOverview({ 
  showSuccessAnimation, 
  setCurrentStep, 
  triggerSuccessAnimation 
}: ContentIdeasOverviewProps) {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)

  return (
    <div 
      className="min-h-screen"
      style={{
        backgroundImage: 'url(/background.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Header with enhanced glass morphism */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center">
          <div className={`
            relative inline-flex items-center gap-3 px-10 py-4 rounded-full 
            bg-white/80 backdrop-blur-xl border border-white/20
            shadow-[0_8px_32px_rgba(31,38,135,0.15)]
            text-gray-900 font-medium text-2xl
            transition-all duration-500 ease-in-out
            group hover:scale-105
            ${showSuccessAnimation ? 'animate-success' : ''}
          `}>
            {/* Animated border glow */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-teal-400/30 via-cyan-400/30 to-blue-400/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm"></div>
            
            {/* Inner glow */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-white/40 to-white/10 opacity-50"></div>
            
            {/* Success animation glow */}
            <div className={`
              absolute inset-0 rounded-full opacity-0
              bg-gradient-to-r from-emerald-400/50 via-teal-400/50 to-cyan-400/50
              blur-lg animate-pulse
              ${showSuccessAnimation ? 'opacity-75' : ''}
            `}></div>
            
            {/* Content */}
            <Sparkles className="w-7 h-7 relative z-10 text-teal-600" />
            <span className="relative z-10 bg-gradient-to-r from-gray-900 via-teal-800 to-cyan-800 bg-clip-text text-transparent font-semibold">
              Content Ideas Hub
            </span>
          </div>
          <p className="text-lg text-gray-700/80 font-light max-w-2xl mx-auto mt-6 bg-white/50 backdrop-blur-sm px-6 py-3 rounded-2xl shadow-lg">
            Entwickle hochwertige Social Media Inhalte mit minimalem Aufwand
          </p>
        </div>
      </div>

      {/* Enhanced Main Cards Grid */}
      <div className="max-w-7xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Merged Content Strategies & Inspiration Card */}
          <div 
            className="group relative"
            onMouseEnter={() => setHoveredCard('strategies')}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <Card className={`
              relative border-0 overflow-hidden
              bg-white/60 backdrop-blur-xl 
              shadow-[0_8px_32px_rgba(31,38,135,0.15)]
              border border-white/20
              transition-all duration-500 ease-out
              rounded-[2rem] h-full flex flex-col
              group-hover:bg-white/80 group-hover:shadow-[0_16px_48px_rgba(31,38,135,0.25)]
              group-hover:scale-[1.02] group-hover:-translate-y-2
              ${hoveredCard === 'strategies' ? 'ring-2 ring-teal-400/50' : ''}
            `}>
              {/* Animated background gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-teal-50/30 via-cyan-50/20 to-blue-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <CardContent className="p-8 flex flex-col flex-1 relative z-10">
                <div className="flex flex-col h-full">
                  {/* Header with multiple icons */}
                  <div className="flex items-center justify-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-teal-400/20 to-cyan-400/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/30 shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <Target className="w-8 h-8 text-teal-600" />
                    </div>
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-400/20 to-red-400/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/30 shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <TrendingUp className="w-8 h-8 text-orange-600" />
                    </div>
                  </div>
                  
                  <h3 className="text-2xl font-semibold text-gray-900 mb-4 text-center">
                    Content Strategien & Inspiration
                  </h3>
                  
                  <p className="text-gray-700 mb-6 leading-relaxed text-center flex-1">
                    Entdecke KI-optimierte Strategien und lass dich von viralen Trends inspirieren. 
                    Kombiniere bewährte Methoden mit aktuellen Erfolgsformeln.
                  </p>
                  
                  {/* Feature highlights */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="flex items-center gap-2 text-sm text-gray-600 bg-white/40 backdrop-blur-sm px-3 py-2 rounded-xl">
                      <Bookmark className="w-4 h-4 text-teal-500" />
                      <span>Swipe-to-Save</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 bg-white/40 backdrop-blur-sm px-3 py-2 rounded-xl">
                      <Grid3X3 className="w-4 h-4 text-orange-500" />
                      <span>Viral Trends</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 bg-white/40 backdrop-blur-sm px-3 py-2 rounded-xl">
                      <Layers3 className="w-4 h-4 text-cyan-500" />
                      <span>Card Flip Views</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 bg-white/40 backdrop-blur-sm px-3 py-2 rounded-xl">
                      <Zap className="w-4 h-4 text-purple-500" />
                      <span>KI-Optimiert</span>
                    </div>
                  </div>
                  
                  {/* Unified interface button */}
                  <div className="space-y-3">
                    <Button 
                      onClick={() => setCurrentStep("unified")}
                      className="w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 text-white px-6 py-4 rounded-xl font-medium transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 text-lg"
                    >
                      <Sparkles className="w-5 h-5 mr-2" />
                      Unified Hub öffnen
                    </Button>
                    
                    {/* Alternative individual access */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        onClick={() => setCurrentStep("strategies")}
                        variant="outline"
                        className="text-teal-600 border-teal-200 hover:bg-teal-50 px-3 py-2 rounded-lg text-sm transition-all duration-300"
                      >
                        <Target className="w-4 h-4 mr-1" />
                        Einzeln
                      </Button>
                      <Button 
                        onClick={() => setCurrentStep("inspiration")}
                        variant="outline"
                        className="text-orange-600 border-orange-200 hover:bg-orange-50 px-3 py-2 rounded-lg text-sm transition-all duration-300"
                      >
                        <TrendingUp className="w-4 h-4 mr-1" />
                        Einzeln
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced KI-Brainstorming Card */}
          <div 
            className="group relative"
            onMouseEnter={() => setHoveredCard('brainstorm')}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <Card className={`
              relative border-0 overflow-hidden
              bg-white/60 backdrop-blur-xl 
              shadow-[0_8px_32px_rgba(31,38,135,0.15)]
              border border-white/20
              transition-all duration-500 ease-out
              rounded-[2rem] h-full flex flex-col
              group-hover:bg-white/80 group-hover:shadow-[0_16px_48px_rgba(31,38,135,0.25)]
              group-hover:scale-[1.02] group-hover:-translate-y-2
              ${hoveredCard === 'brainstorm' ? 'ring-2 ring-purple-400/50' : ''}
            `}>
              {/* Animated background gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-50/30 via-indigo-50/20 to-violet-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <CardContent className="p-8 flex flex-col flex-1 relative z-10">
                <div className="flex flex-col h-full text-center">
                  {/* Enhanced icon */}
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-400/20 to-indigo-400/20 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm border border-white/30 shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <MessageSquare className="w-10 h-10 text-purple-600" />
                  </div>
                  
                  <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                    KI-Brainstorming
                  </h3>
                  
                  <p className="text-gray-700 mb-8 leading-relaxed flex-1">
                    Lass deiner Kreativität freien Lauf mit unserem intelligenten AI-Assistant. 
                    Entwickle einzigartige Ideen durch interaktive Gespräche.
                  </p>
                  
                  {/* Enhanced features */}
                  <div className="space-y-3 mb-8">
                    <div className="flex items-center justify-center gap-2 text-sm text-purple-600 bg-purple-50/50 backdrop-blur-sm px-4 py-2 rounded-xl">
                      <Sparkles className="w-4 h-4" />
                      <span>Personalisierte Ideen</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-sm text-indigo-600 bg-indigo-50/50 backdrop-blur-sm px-4 py-2 rounded-xl">
                      <MessageSquare className="w-4 h-4" />
                      <span>Interaktive Sessions</span>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => setCurrentStep("brainstorm")}
                    className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Brainstorming starten
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
} 