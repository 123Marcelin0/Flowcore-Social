"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Sparkles, Lightbulb, MessageSquare, TrendingUp, Edit } from "lucide-react"
import type { ContentStep } from "../hooks/useContentIdeas"

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
  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center">
          <div className={`
            relative inline-flex items-center gap-3 px-8 py-3 rounded-full 
            bg-[#ECF8F6] text-[#0D9488] font-medium text-xl
            transition-all duration-300 ease-in-out
            group
            ${showSuccessAnimation ? 'animate-success' : ''}
          `}>
            {/* Animated border */}
            <div className="absolute inset-0 rounded-full border-2 border-[#2DD4BF] transition-all duration-300 group-hover:opacity-50"></div>
            
            {/* Hover glow effect */}
            <div className={`absolute inset-0 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-300 bg-[#2DD4BF] blur-md`}></div>
            
            {/* Success animation glow */}
            <div className={`
              absolute inset-0 rounded-full opacity-0
              bg-gradient-to-r from-[#2DD4BF] via-[#0D9488] to-[#2DD4BF]
              blur-md
              ${showSuccessAnimation ? 'animate-success-glow' : ''}
            `}></div>
            
            {/* Content */}
            <Sparkles className="w-6 h-6 relative z-10" />
            <span className="relative z-10">Content Strategies</span>
          </div>
          <p className="text-lg text-gray-500 font-light max-w-2xl mx-auto mt-6">
            Entwickle hochwertige Social Media Inhalte mit minimalem Aufwand
          </p>
        </div>
      </div>

      {/* Main Cards */}
      <div className="max-w-7xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          
          {/* Structured Strategies Card */}
          <div className="group relative">
            <Card className="relative border-0 bg-white hover:shadow-none transition-all duration-300 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full flex flex-col transform group-hover:translate-y-2 transition-transform duration-300">
              <CardContent className="p-8 flex flex-col flex-1">
                <div className="text-center flex flex-col flex-1">
                  <div className="w-16 h-16 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[0_4px_20px_rgb(45,212,191,0.1)]">
                    <Lightbulb className="w-8 h-8 text-teal-600" />
                  </div>
                  <h3 className="text-xl font-light text-gray-900 mb-4">Content-Strategien</h3>
                  <p className="text-gray-600 mb-6 leading-relaxed text-sm flex-1">
                    Wähle aus KI-optimierten Content-Strategien, die auf deine Zielgruppe abgestimmt sind.
                  </p>
                  <Button 
                    onClick={() => setCurrentStep("strategies")}
                    className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity shadow-[0_4px_20px_rgb(45,212,191,0.2)]"
                  >
                    Strategien erkunden
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Content Inspiration Card */}
          <div className="group relative">
            <Card className="relative border-0 bg-white hover:shadow-none transition-all duration-300 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full flex flex-col transform group-hover:translate-y-2 transition-transform duration-300">
              <CardContent className="p-8 flex flex-col flex-1">
                <div className="text-center flex flex-col flex-1">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[0_4px_20px_rgb(251,146,60,0.1)]">
                    <TrendingUp className="w-8 h-8 text-orange-600" />
                  </div>
                  <h3 className="text-xl font-light text-gray-900 mb-4">Content Inspiration</h3>
                  <p className="text-gray-600 mb-6 leading-relaxed text-sm flex-1">
                    Entdecke virale Immobilien-Content und lass dich von erfolgreichen Beispielen inspirieren.
                  </p>
                  <Button 
                    onClick={() => setCurrentStep("inspiration")}
                    className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity shadow-[0_4px_20px_rgb(251,146,60,0.2)]"
                  >
                    Inspiration entdecken
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Freies Brainstorming Card */}
          <div className="group relative">
            <Card className="relative border-0 bg-white hover:shadow-none transition-all duration-300 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full flex flex-col transform group-hover:translate-y-2 transition-transform duration-300">
              <CardContent className="p-8 flex flex-col flex-1">
                <div className="text-center flex flex-col flex-1">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[0_4px_20px_rgb(147,51,234,0.1)]">
                    <MessageSquare className="w-8 h-8 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-light text-gray-900 mb-4">KI-Brainstorming</h3>
                  <p className="text-gray-600 mb-6 leading-relaxed text-sm flex-1">
                    Lass deiner Kreativität freien Lauf mit unserem intelligenten AI-Assistant.
                  </p>
                  <Button 
                    onClick={() => setCurrentStep("brainstorm")}
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity shadow-[0_4px_20px_rgb(147,51,234,0.2)]"
                  >
                    Brainstorming starten
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Script Editor Card */}
          <div className="group relative">
            <Card className="relative border-0 bg-white hover:shadow-none transition-all duration-300 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full flex flex-col transform group-hover:translate-y-2 transition-transform duration-300">
              <CardContent className="p-8 flex flex-col flex-1">
                <div className="text-center flex flex-col flex-1">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[0_4px_20px_rgb(52,211,153,0.1)]">
                    <Edit className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-light text-gray-900 mb-4">Script Editor</h3>
                  <p className="text-gray-600 mb-6 leading-relaxed text-sm flex-1">
                    Erstelle und bearbeite professionelle Content-Skripte mit integrierten visuellen Anleitungen.
                  </p>
                  <Button 
                    onClick={() => setCurrentStep("script")}
                    className="bg-gradient-to-r from-emerald-600 to-green-600 text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity shadow-[0_4px_20px_rgb(52,211,153,0.2)]"
                  >
                    Script bearbeiten
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