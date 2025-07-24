"use client"

import { useState, useEffect } from "react"
import LoginPage from "../components/auth/login-page"
import { AppSidebar } from "./components/app-sidebar"
import { DashboardOverview } from "./components/dashboard-overview"
import { ContentHub } from "./components/content-hub"
import { AIInteractions } from "./components/ai-interactions"
import { ContentIdeas } from "./components/content-ideas"
import { SettingsPage } from "../components/settings/settings-page"
import { ConnectionStatus } from "../components/connection-status"
import { useAuth } from "../lib/auth-context"
import { DateProvider } from "@/lib/date-context"

type Section = "dashboard" | "content" | "interactions" | "ideas" | "settings"

export function ClientPageRoot() {
  const [activeSection, setActiveSection] = useState<Section>("dashboard")
  const { isAuthenticated, isLoading, signOut } = useAuth()

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

  return (
    <DateProvider>
      <div className="flex h-screen bg-gray-50">
        <AppSidebar 
          activeSection={activeSection} 
          setActiveSection={setActiveSection}
          onLogout={signOut}
        />
        <main className="flex-1 overflow-y-auto p-8">
          {activeSection === "dashboard" && <DashboardOverview />}
          {activeSection === "content" && <ContentHub />}
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