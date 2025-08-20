"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { ProtectedRoute } from "@/lib/auth-context"
import LoginPage from "@/components/auth/login-page"
import WorkflowCanvas from "@/components/glassmorphic-workflow-canvas"
import { AIStudioToolbar } from "@/app/components/ai-studio-toolbar"

export default function VideoEditorToolPage() {
  const router = useRouter()

  const handleToolSelect = (tool: string) => {
    router.push(`/ai-studio/${tool}`)
  }

  const handleBack = () => {
    router.push('/')
  }

  return (
    <ProtectedRoute fallback={<LoginPage />}>
      {/* Raster Background */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          background: '#f5f6f7',
        }}
      />
      <div 
        className="fixed inset-0 z-0"
        style={{
          background: `
            repeating-linear-gradient(0deg, rgba(148,163,184,0.16) 0 1px, transparent 1px 90px),
            repeating-linear-gradient(90deg, rgba(148,163,184,0.16) 0 1px, transparent 1px 90px),
            radial-gradient(1200px 850px at 86% 10%, rgba(0,0,0,0.12), transparent 62%),
            radial-gradient(1300px 900px at 14% 88%, rgba(0,0,0,0.10), transparent 60%),
            linear-gradient(180deg, transparent 65%, rgba(0,0,0,0.05) 92%, transparent 100%)
          `,
          backgroundBlendMode: 'normal, normal, soft-light, soft-light, soft-light'
        }}
      />
      
      <div className="relative w-full h-screen z-10">
        {/* Main Content - Full Width Under Raster */}
        <main className="w-full h-full overflow-y-auto relative z-20">
          <WorkflowCanvas className="h-full w-full" />
        </main>
        
        {/* AI Studio Toolbar - Overlay on Top */}
        <div className="absolute left-0 top-0 bottom-0 z-40 pointer-events-none">
          <div className="pointer-events-auto">
            <AIStudioToolbar 
              onBack={handleBack}
              activeTool="video-editor" 
              onToolSelect={handleToolSelect}
              onProcess={() => {}}
              isProcessing={false}
              hasFiles={false}
            />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}

