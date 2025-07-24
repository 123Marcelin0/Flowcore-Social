"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import type { ContentStep } from "../hooks/useContentIdeas"

interface ContentIdeasDevelopProps {
  setCurrentStep: (step: ContentStep) => void
}

export function ContentIdeasDevelop({ setCurrentStep }: ContentIdeasDevelopProps) {
  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => setCurrentStep("strategies")}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Zurück
            </Button>
            <div className="h-6 w-px bg-gray-200"></div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Content Entwickeln</h1>
              <p className="text-sm text-gray-500">Entwickle deine gewählte Strategie weiter</p>
            </div>
          </div>
        </div>
        
        <div className="mt-8 text-center">
          <p className="text-gray-600">Develop component - To be implemented</p>
          <Button 
            onClick={() => setCurrentStep("script")}
            className="mt-4 bg-gradient-to-r from-teal-500 to-cyan-500 text-white"
          >
            Zum Script Editor
          </Button>
        </div>
      </div>
    </div>
  )
} 