"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import LoginPage from "../components/auth/login-page"
import { AppSidebar } from "./components/app-sidebar"
import { DashboardOverviewOptimized } from "./components/dashboard-overview-optimized"
import { ContentHub } from "./components/content-hub"
import { AIStudioToolbar } from "./components/ai-studio-toolbar"
import { AIStudioMain } from "./components/ai-studio-main"
import { AIInteractions } from "./components/ai-interactions"
import { ContentIdeas } from "./components/content-ideas"
import { TrendOptimizationWorkflow } from "./components/trend-optimization-workflow"
import { ContentStrategyWorkflow } from "./components/content-strategy-workflow"
import { SettingsPage } from "../components/settings/settings-page"
import { ConnectionStatus } from "../components/connection-status"
import { useAuth } from "../lib/auth-context"
import { DateProvider } from "@/lib/date-context"

type Section = "dashboard" | "calendar" | "ai-studio" | "interactions" | "ideas" | "settings"

export function ClientPageRoot() {
  const [activeSection, setActiveSection] = useState<Section>("dashboard")
  const [aiStudioState, setAiStudioState] = useState({
    activeTool: null as string | null,
    hasFiles: false,
    isProcessing: false
  })

  // Removed debugging logs

  // Auto-set interior tool when AI Studio is activated
  useEffect(() => {
    if (activeSection === "ai-studio" && !aiStudioState.activeTool) {
      setAiStudioState(prev => ({ ...prev, activeTool: 'interior-design' }))
    }
  }, [activeSection, aiStudioState.activeTool])

  // Removed custom event listener since we're not using routed pages anymore

  // Update body and html class based on AI Studio tool
  useEffect(() => {
    const body = document.body
    const html = document.documentElement
    
    const aiStudioClasses = [
      'ai-studio-interior',
      'ai-studio-video-editor', 
      'ai-studio-content-create',
      'ai-studio-video-edit',
      'ai-studio-image-generation',
      'ai-studio-video-merger'
    ]
    
    // Remove all AI Studio classes from both html and body
    aiStudioClasses.forEach(className => {
      body.classList.remove(className)
      html.classList.remove(className)
    })
    
    // Add appropriate class if in AI Studio
    if (activeSection === "ai-studio" && aiStudioState.activeTool) {
      const toolClassMap: Record<string, string> = {
        'interior-design': 'ai-studio-interior',
        'video-editor': 'ai-studio-video-editor',
        'content-create': 'ai-studio-content-create',
        'video-edit': 'ai-studio-video-edit',
        'image-generation': 'ai-studio-image-generation',
        'video-merger': 'ai-studio-video-merger'
      }
      
      const targetClass = toolClassMap[aiStudioState.activeTool]
      if (targetClass) {
        body.classList.add(targetClass)
        html.classList.add(targetClass)
      }
    }
    
    // Cleanup on unmount
    return () => {
      aiStudioClasses.forEach(className => {
        body.classList.remove(className)
        html.classList.remove(className)
      })
    }
  }, [activeSection, aiStudioState.activeTool])
  const { isAuthenticated, isLoading, signOut } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()
  
  // Check for workflow parameters
  const workflow = searchParams.get('workflow')
  const eventData = searchParams.get('eventData')
  const strategyData = searchParams.get('strategyData')

  const handleBackToCalendar = () => {
    // Clear URL parameters and go back to calendar
    router.push('/')
    setActiveSection("calendar")
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginPage />
  }

  // Handle workflow routing
  if (workflow === 'trend-optimization' && eventData) {
    try {
      const parsedEventData = JSON.parse(decodeURIComponent(eventData))
      return (
        <DateProvider>
          <div className="flex h-screen bg-gray-50">
            <TrendOptimizationWorkflow 
              trend={{
                id: parsedEventData.id,
                thumbnail_url: '/placeholder.jpg',
                reel_url: '#',
                title: parsedEventData.title,
                description: parsedEventData.description || '',
                creator: 'Calendar Event'
              }}
              onBack={handleBackToCalendar}
            />
          </div>
        </DateProvider>
      )
    } catch (error) {
      console.error('Error parsing event data:', error)
    }
  }

  if (workflow === 'content-strategy' && strategyData) {
    try {
      const parsedStrategyData = JSON.parse(decodeURIComponent(strategyData))
      return (
        <DateProvider>
          <div className="flex h-screen bg-gray-50">
            <ContentStrategyWorkflow 
              strategy={parsedStrategyData}
              onBack={handleBackToCalendar}
            />
          </div>
        </DateProvider>
      )
    } catch (error) {
      console.error('Error parsing strategy data:', error)
    }
  }

  return (
    <DateProvider>
      {/* Fixed background layer to ensure complete coverage */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: activeSection === "ai-studio"
              ? 'url(/vecteezy_ai-generated-real-estate-advertisment-background-with-copy_36725233.jpg)'
            : activeSection === "ai-studio" && aiStudioState.activeTool === 'video-editor'
            ? 'url(/abstract-liquid-marble-white-background-handmade-experimental-art.jpg)'
            : activeSection === "ai-studio" && aiStudioState.activeTool === 'content-create'
            ? 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 25%, #bae6fd 50%, #7dd3fc 75%, #38bdf8 100%)'
            : activeSection === "ai-studio" && aiStudioState.activeTool === 'video-edit'
            ? 'none'
            : activeSection === "ai-studio" && aiStudioState.activeTool === 'image-generation'
            ? 'linear-gradient(135deg, #0A0A10 0%, #1A0B2E 50%, #0A0A10 100%)'
            : activeSection === "ai-studio" && aiStudioState.activeTool === 'video-merger'
            ? 'linear-gradient(135deg, #ffffff 0%, #fff7ed 50%, #fed7aa 100%)'
            : 'none',
          backgroundColor: activeSection === "ai-studio" && aiStudioState.activeTool === 'video-edit'
            ? '#080a13'
            : '#f9fafb', // Default bg-gray-50
          backgroundSize: activeSection === "ai-studio" ? 'cover' : 'auto',
          backgroundPosition: activeSection === "ai-studio" ? 'center' : 'initial',
          backgroundRepeat: activeSection === "ai-studio" ? 'no-repeat' : 'initial',
          backgroundAttachment: activeSection === "ai-studio" ? 'fixed' : 'initial'
        }}
      />
      

      
      <div className="flex h-screen relative overflow-hidden z-10">
        {/* AI Studio Liquid Glass Background Layer - Only when AI Studio is active */}
        {activeSection === "ai-studio" && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Primary liquid glass overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-white/[0.01] to-transparent" />
            
            {/* Floating liquid orbs */}
            <div className="absolute top-1/4 left-1/5 w-96 h-96 bg-white/[0.03] rounded-full blur-3xl liquid-float" />
            <div className="absolute top-1/2 right-1/4 w-80 h-80 bg-white/[0.02] rounded-full blur-3xl liquid-float" style={{ animationDelay: '2s' }} />
            <div className="absolute bottom-1/3 left-1/3 w-72 h-72 bg-white/[0.025] rounded-full blur-3xl liquid-float" style={{ animationDelay: '4s' }} />
            
            {/* Subtle light refractions */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.008] to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-bl from-transparent via-white/[0.006] to-transparent" />
          </div>
        )}
        
        <div className="relative z-10 flex w-full">
          {/* Sidebar */}
          <AppSidebar 
            activeSection={activeSection} 
            setActiveSection={(section) => setActiveSection(section)}
            onLogout={signOut}
          />
          
          {/* AI Studio Toolbar Overlay */}
          {activeSection === "ai-studio" && (
            <div className="absolute left-0 top-0 bottom-0 z-40">
              <AIStudioToolbar 
                onBack={() => setActiveSection("dashboard")}
                activeTool={aiStudioState.activeTool}
                onToolSelect={(tool) => setAiStudioState(prev => ({ ...prev, activeTool: tool }))}
                onProcess={() => setAiStudioState(prev => ({ ...prev, isProcessing: true }))}
                isProcessing={aiStudioState.isProcessing}
                hasFiles={aiStudioState.hasFiles}
              />
            </div>
          )}
          
          {/* Main Content Area */}
          <main className={`flex-1 overflow-y-auto relative z-20 ${activeSection === "ai-studio" ? "scrollbar-thin ml-72" : ""}`}>
            {activeSection === "dashboard" && <DashboardOverviewOptimized />}
            {activeSection === "calendar" && <ContentHub />}
            {activeSection === "ai-studio" && (
              <AIStudioMain 
                activeTool={aiStudioState.activeTool}
                isProcessing={aiStudioState.isProcessing}
                onFilesChange={(hasFiles) => setAiStudioState(prev => ({ ...prev, hasFiles }))}
                onProcessingComplete={() => setAiStudioState(prev => ({ ...prev, isProcessing: false }))}
              />
            )}
            {activeSection === "interactions" && <AIInteractions />}
            {activeSection === "ideas" && <ContentIdeas />}
            {activeSection === "settings" && <SettingsPage />}
          </main>
        </div>
        
        {/* Connection Status Monitor */}
        <ConnectionStatus />
      </div>
    </DateProvider>
  )
} 