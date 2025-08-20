"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { ProtectedRoute } from "@/lib/auth-context"
import LoginPage from "@/components/auth/login-page"
// Removed AIStudioVideoGenerator import - component deleted
import { AIStudioToolbar } from "@/app/components/ai-studio-toolbar"

export default function VideoEditToolPage() {
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
          backgroundColor: '#080a13'
        }}
      />

      <div className="relative flex w-full h-screen z-10">
        {/* AI Studio Toolbar */}
        <div className="absolute left-0 top-0 bottom-0 z-40">
          <AIStudioToolbar 
            onBack={handleBack}
            activeTool="video-edit" 
            onToolSelect={handleToolSelect}
            onProcess={() => {}}
            isProcessing={false}
            hasFiles={false}
          />
        </div>
        
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto relative z-20 ml-72">
          <div className="flex items-center justify-center h-full text-white">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Video Edit Tool</h2>
              <p className="text-gray-400">This tool is currently being updated.</p>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}

