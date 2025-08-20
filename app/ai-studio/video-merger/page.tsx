"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { ProtectedRoute } from "@/lib/auth-context"
import LoginPage from "@/components/auth/login-page"
import { AIStudioVideoMerger } from "@/app/components/ai-studio-video-merger"
import { AIStudioToolbar } from "@/app/components/ai-studio-toolbar"

export default function VideoMergerToolPage() {
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
          background: 'linear-gradient(135deg, #ffffff 0%, #fff7ed 50%, #fed7aa 100%)'
        }}
      />

      <div className="relative flex w-full h-screen z-10">
        {/* AI Studio Toolbar */}
        <div className="absolute left-0 top-0 bottom-0 z-40">
          <AIStudioToolbar 
            onBack={handleBack}
            activeTool="video-merger" 
            onToolSelect={handleToolSelect}
            onProcess={() => {}}
            isProcessing={false}
            hasFiles={false}
          />
        </div>
        
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto relative z-20 ml-72">
          <AIStudioVideoMerger />
        </main>
      </div>
    </ProtectedRoute>
  )
}


