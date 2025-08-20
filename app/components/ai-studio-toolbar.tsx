"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { 
  ArrowLeft,
  Home, 
  ImageIcon, 
  VideoIcon, 
  FileText,
  Wand2,
  Settings,
  Loader2,
  Film,
  Edit3
} from 'lucide-react'
import GlassSurface from '@/components/ui/glass-surface'

interface AIStudioToolbarProps {
  onBack: () => void
  activeTool?: string | null
  onToolSelect?: (tool: string) => void
  onProcess?: () => void
  isProcessing?: boolean
  hasFiles?: boolean
}

export function AIStudioToolbar({ 
  onBack, 
  activeTool, 
  onToolSelect, 
  onProcess, 
  isProcessing = false,
  hasFiles = false 
}: AIStudioToolbarProps) {
  // Tool definitions
  const tools = [
    {
      id: 'interior-design',
      icon: Home,
      label: 'Interior',
      color: 'text-emerald-600 hover:bg-emerald-50'
    },
    {
      id: 'image-generation',
      icon: ImageIcon,
      label: 'Images',
      color: 'text-pink-600 hover:bg-pink-50'
    },
    {
      id: 'video-edit',
      icon: VideoIcon,
      label: 'Video',
      color: 'text-purple-600 hover:bg-purple-50'
    },
    {
      id: 'video-merger',
      icon: Film,
      label: 'Merge',
      color: 'text-blue-600 hover:bg-blue-50'
    },
    {
      id: 'video-editor',
      icon: Edit3,
      label: 'Editor',
      color: 'text-indigo-600 hover:bg-indigo-50'
    },
    {
      id: 'workflow-builder',
      icon: Wand2,
      label: 'Workflow',
      color: 'text-orange-600 hover:bg-orange-50'
    },
    {
      id: 'content-create',
      icon: FileText,
      label: 'Content',
      color: 'text-teal-600 hover:bg-teal-50'
    }
  ]

  // Check if special tools are active for dynamic styling
  const isVideoActive = activeTool === 'video-edit'
  const isImageActive = activeTool === 'image-generation'
  const isVideoMergerActive = activeTool === 'video-merger'
  const isContentActive = activeTool === 'content-create'
  const isInteriorActive = activeTool === 'interior-design'
  const isVideoEditorActive = activeTool === 'video-editor'
  const isWorkflowBuilderActive = activeTool === 'workflow-builder'
  const isSpecialTool = isVideoActive || isImageActive || isVideoMergerActive || isContentActive || isInteriorActive || isVideoEditorActive || isWorkflowBuilderActive



  return (
    <div 
      data-ai-tools-sidebar
      className={`absolute inset-0 w-72 h-[calc(100vh-10rem)] overflow-hidden animate-in slide-in-from-left-full duration-700 ease-out mt-6 mb-20 pointer-events-auto z-50 isolate ${
        isInteriorActive || isVideoEditorActive || isWorkflowBuilderActive ? 'rounded-tr-[24px] rounded-br-[24px]' : 'rounded-tr-[80px] rounded-br-[80px]'
      }`}
    >
      <GlassSurface
        width="100%"
        height="100%"
        borderRadius={isInteriorActive || isVideoEditorActive || isWorkflowBuilderActive ? 24 : 80}
        backgroundOpacity={0.01}
        mixBlendMode="normal"
        className="border border-white/30"
        contentClassName="h-full flex flex-col"
      >
        <div className="relative h-full flex flex-col z-10 pointer-events-auto">
          {/* AI Tools Header with Back Icon */}
          <div className="flex-1 p-8 pointer-events-auto">
            <div className="space-y-3 pointer-events-auto">
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={onBack}
                  className="relative p-2 transition-all duration-200 active:scale-95 h-8 w-8 rounded-full overflow-hidden group bg-gradient-to-r from-white/[0.15] via-white/[0.08] to-white/[0.04] backdrop-blur-[30px] backdrop-saturate-[200%] border border-white/40 hover:from-white/[0.2] hover:via-white/[0.12] hover:to-white/[0.08] hover:border-white/50 hover:shadow-[0_4px_16px_rgba(255,255,255,0.15)] hover:scale-105 cursor-pointer will-change-transform touch-manipulation shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)]"
                >
                  <ArrowLeft className="w-4 h-4 text-white/90 group-hover:text-white transition-colors" />
                </button>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-white/90">
                  AI Tools
                </h3>
              </div>
              
              {tools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onToolSelect?.(tool.id)
                  }}
                  className={`relative w-full justify-start gap-3 h-12 text-sm transition-all duration-200 active:scale-95 rounded-full overflow-hidden group cursor-pointer will-change-transform touch-manipulation flex items-center ${
                    activeTool === tool.id 
                      ? 'bg-gradient-to-r from-white/[0.2] via-white/[0.12] to-white/[0.08] backdrop-blur-[30px] backdrop-saturate-[200%] border border-white/50 shadow-[0_4px_16px_rgba(255,255,255,0.15)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)]'
                      : 'bg-gradient-to-r from-white/[0.15] via-white/[0.08] to-white/[0.04] backdrop-blur-[30px] backdrop-saturate-[200%] border border-white/40 hover:from-white/[0.2] hover:via-white/[0.12] hover:to-white/[0.08] hover:border-white/50 hover:shadow-[0_4px_16px_rgba(255,255,255,0.15)] hover:scale-105 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)]'
                  }`}
                >
                  {/* Icon container */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 relative z-10 flex-shrink-0 ${
                    activeTool === tool.id 
                      ? 'bg-gradient-to-br from-white/[0.25] via-white/[0.15] to-white/[0.08] backdrop-blur-[30px] backdrop-saturate-[200%] border border-white/50 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)]'
                      : 'bg-gradient-to-br from-white/[0.15] via-white/[0.08] to-white/[0.04] backdrop-blur-[25px] backdrop-saturate-[200%] border border-white/40 group-hover:from-white/[0.2] group-hover:via-white/[0.12] group-hover:to-white/[0.08] group-hover:border-white/50 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)]'
                  }`}>
                    <tool.icon className="w-4 h-4 text-white/90 group-hover:text-white transition-colors" />
                  </div>
                  <span className="font-medium relative z-10 text-white/90 group-hover:text-white transition-colors flex-1 text-left">{tool.label}</span>
                </button>
              ))}
            </div>

            {/* Process Button */}
            {activeTool && hasFiles && (
              <div className="mt-8 pt-8 border-t border-white/25">
                <button
                  onClick={onProcess}
                  disabled={isProcessing}
                  className={`relative w-full h-12 transition-all duration-500 active:scale-95 rounded-full overflow-hidden group flex items-center justify-center gap-2 ${
                    isProcessing 
                      ? 'bg-white/15 backdrop-blur-[30px] text-white/50 cursor-not-allowed opacity-50 border border-white/20' 
                      : 'bg-gradient-to-r from-white/[0.15] via-white/[0.08] to-white/[0.04] backdrop-blur-[30px] backdrop-saturate-[200%] border border-white/40 hover:from-white/[0.2] hover:via-white/[0.12] hover:to-white/[0.08] hover:border-white/50 hover:shadow-[0_4px_16px_rgba(255,255,255,0.15)] text-white/90 hover:text-white shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)]'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin relative z-10 text-white/60" />
                      <span className="relative z-10">Processing...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 mr-2 relative z-10 transition-all duration-300 group-hover:filter group-hover:brightness-125 text-white" />
                      <span className="font-medium relative z-10 transition-all duration-300 group-hover:filter group-hover:brightness-110 text-white">Start Processing</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Settings */}
          <div className="p-8 border-t border-white/25">
            <button
              className="relative w-full justify-start gap-3 h-12 transition-all duration-500 active:scale-95 rounded-full overflow-hidden group bg-gradient-to-r from-white/[0.15] via-white/[0.08] to-white/[0.04] backdrop-blur-[30px] backdrop-saturate-[200%] border border-white/40 hover:from-white/[0.2] hover:via-white/[0.12] hover:to-white/[0.08] hover:border-white/50 hover:shadow-[0_4px_16px_rgba(255,255,255,0.15)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)] flex items-center"
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center relative z-10 transition-all duration-500 bg-gradient-to-br from-white/[0.15] via-white/[0.08] to-white/[0.04] backdrop-blur-[25px] border border-white/40 group-hover:from-white/[0.2] group-hover:via-white/[0.12] group-hover:to-white/[0.08] group-hover:border-white/50 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)]">
                <Settings className="w-4 h-4 transition-all duration-300 group-hover:filter group-hover:brightness-110 text-white/90 group-hover:text-white" />
              </div>
              <span className="font-medium relative z-10 transition-all duration-300 group-hover:filter group-hover:brightness-110 text-white/90 group-hover:text-white flex-1 text-left">Settings</span>
            </button>
          </div>
        </div>
      </GlassSurface>
    </div>
  )
} 