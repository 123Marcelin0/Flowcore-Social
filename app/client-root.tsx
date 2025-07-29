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
      <div className="flex h-screen bg-gray-50">
        <div className="relative">
          {/* Sidebar */}
          <AppSidebar 
            activeSection={activeSection} 
            setActiveSection={(section) => setActiveSection(section)}
            onLogout={signOut}
          />
          
          {/* AI Studio Toolbar Overlay */}
          {activeSection === "ai-studio" && (
            <AIStudioToolbar 
              onBack={() => setActiveSection("dashboard")}
              activeTool={aiStudioState.activeTool}
              onToolSelect={(tool) => setAiStudioState(prev => ({ ...prev, activeTool: tool }))}
              onProcess={() => setAiStudioState(prev => ({ ...prev, isProcessing: true }))}
              isProcessing={aiStudioState.isProcessing}
              hasFiles={aiStudioState.hasFiles}
            />
          )}
        </div>
        
        <main className={`flex-1 overflow-y-auto ${activeSection === "ai-studio" ? "" : "p-8"}`}>
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
        
        {/* Connection Status Monitor */}
        <ConnectionStatus />
      </div>
    </DateProvider>
  )
} 