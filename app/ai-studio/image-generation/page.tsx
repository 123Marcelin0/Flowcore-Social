"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { ProtectedRoute } from "@/lib/auth-context"
import LoginPage from "@/components/auth/login-page"
import { AIStudioImageGenerator } from "@/app/components/ai-studio-image-generator"
import { AIStudioToolbar } from "@/app/components/ai-studio-toolbar"

export default function ImageGenerationToolPage() {
  const router = useRouter()

  const handleToolSelect = (tool: string) => {
    router.push(`/ai-studio/${tool}`)
  }

  const handleBack = () => {
    router.push('/')
  }

  return (
    <ProtectedRoute fallback={<LoginPage />}>
      {/* Background */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          background: 'linear-gradient(135deg, #0A0A10 0%, #1A0B2E 50%, #0A0A10 100%)'
        }}
      />

      <div className="relative flex w-full h-screen z-10">
        {/* AI Studio Toolbar */}
        <div className="absolute left-0 top-0 bottom-0 z-40">
          <AIStudioToolbar 
            onBack={handleBack}
            activeTool="image-generation" 
            onToolSelect={handleToolSelect}
            onProcess={() => {}}
            isProcessing={false}
            hasFiles={false}
          />
        </div>
        
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto relative z-20 ml-72">
          <AIStudioImageGenerator />
        </main>
      </div>
    </ProtectedRoute>
  )
}



