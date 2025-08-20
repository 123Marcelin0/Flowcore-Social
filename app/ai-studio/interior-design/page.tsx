"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { ProtectedRoute } from "@/lib/auth-context"
import LoginPage from "@/components/auth/login-page"
import { AIInteriorDesigner } from "@/app/components/ai-interior-designer"
import { AIStudioToolbar } from "@/app/components/ai-studio-toolbar"

export default function InteriorDesignToolPage() {
  const router = useRouter()

  const handleToolSelect = (tool: string) => {
    router.push(`/ai-studio/${tool}`)
  }

  const handleBack = () => {
    router.push('/')
  }

  return (
    <ProtectedRoute fallback={<LoginPage />}>
      {/* Background Image */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: 'url(/vecteezy_ai-generated-real-estate-advertisment-background-with-copy_36725233.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
        }}
      />

      <div className="relative flex w-full h-screen z-10">
        {/* AI Studio Toolbar */}
        <div className="absolute left-0 top-0 bottom-0 z-40">
          <AIStudioToolbar 
            onBack={handleBack}
            activeTool="interior-design" 
            onToolSelect={handleToolSelect}
            onProcess={() => {}}
            isProcessing={false}
            hasFiles={false}
          />
        </div>
        
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto relative z-20 ml-72">
          <AIInteriorDesigner />
        </main>
      </div>
    </ProtectedRoute>
  )
}


