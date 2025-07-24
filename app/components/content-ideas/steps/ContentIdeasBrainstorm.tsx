"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import type { ContentStep } from "../hooks/useContentIdeas"

interface ContentIdeasBrainstormProps {
  setCurrentStep: (step: ContentStep) => void
}

export function ContentIdeasBrainstorm({ setCurrentStep }: ContentIdeasBrainstormProps) {
  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => setCurrentStep("overview")}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Zurück
            </Button>
            <div className="h-6 w-px bg-gray-200"></div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">KI-Brainstorming</h1>
              <p className="text-sm text-gray-500">Freies Brainstorming mit deinem AI-Assistenten</p>
            </div>
          </div>
        </div>
        
        <div className="mt-8 text-center">
          <p className="text-gray-600">Brainstorm component - To be implemented</p>
        </div>
      </div>
    </div>
  )
} 