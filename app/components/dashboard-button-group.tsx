"use client"

import React, { useCallback, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { MessageSquare, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { OptimizedAIChat } from "./optimized-ai-chat"

interface DashboardButtonGroupProps {
  selectedStatus: string
  setSelectedStatus: (status: string) => void
  onOpenAiWorkflow?: () => void
  showAiWorkflowButton?: boolean
}

export function DashboardButtonGroup({ selectedStatus, setSelectedStatus, onOpenAiWorkflow, showAiWorkflowButton = false }: DashboardButtonGroupProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isAiChatOpen, setIsAiChatOpen] = useState(false)

  const handleAiToggle = useCallback(() => {
    setIsAiChatOpen(!isAiChatOpen)
  }, [isAiChatOpen])

  const isOnAssistantPage = pathname === '/assistant'

  return (
    <div className="w-full">      
      {/* Status Filter and Actions */}
      <div className="w-full flex items-center justify-center mb-4 relative">        
        <div className="flex items-center bg-white/20 rounded-full shadow-lg border border-white/30 p-0.5">
          {["Alle", "Veröffentlicht", "Entwurf"].map((status) => (
            <button
              key={status}
              onClick={() => {
                setSelectedStatus(status)
                if (isOnAssistantPage) {
                  router.push('/dashboard')
                }
              }}
              className={`px-6 py-2.5 text-sm font-medium transition-all relative
                ${selectedStatus === status && !isOnAssistantPage
                  ? 'rounded-full bg-white/40 text-white border border-white/50 shadow-sm'
                  : 'text-white/80 hover:bg-white/20 hover:text-white rounded-full'
                }`}
            >
              {status === "Entwurf" ? "Entwurf" : status}
            </button>
          ))}
          <button 
            onClick={() => router.push('/assistant')}
            className={`px-6 py-2.5 text-sm font-medium transition-all relative
              ${isOnAssistantPage
                ? 'rounded-full bg-white/40 text-white border border-white/50 shadow-sm'
                : 'text-white/80 hover:bg-white/20 hover:text-white rounded-full'
              }`}
          >
            Kommentare
          </button>
          <button 
            onClick={handleAiToggle}
            className={`px-4 py-2.5 rounded-full flex items-center gap-2 transition-all
              ${isAiChatOpen 
                ? 'bg-white/40 text-white border border-white/50 shadow-sm' 
                : 'text-white/80 hover:bg-white/20 hover:text-white'
              }`}
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        </div>

        {/* New Post Button - positioned to the right */}
        {showAiWorkflowButton && onOpenAiWorkflow && (
          <div className="absolute right-0">
            <Button 
              onClick={onOpenAiWorkflow}
              size="default" 
              className="h-10 text-sm gap-2 px-4 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 rounded-full"
            >
              <Plus className="w-4 h-4" />
              Neuer Post
            </Button>
          </div>
        )}
      </div>

      {/* Optimized AI Chat */}
      <OptimizedAIChat 
        isOpen={isAiChatOpen}
        onToggle={handleAiToggle}
      />
    </div>
  )
}