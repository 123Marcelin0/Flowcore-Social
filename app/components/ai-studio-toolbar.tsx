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
  Loader2
} from 'lucide-react'

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
      id: 'image-enhance',
      icon: ImageIcon,
      label: 'Enhance',
      color: 'text-blue-600 hover:bg-blue-50'
    },
    {
      id: 'video-edit',
      icon: VideoIcon,
      label: 'Video',
      color: 'text-purple-600 hover:bg-purple-50'
    },
    {
      id: 'content-create',
      icon: FileText,
      label: 'Content',
      color: 'text-orange-600 hover:bg-orange-50'
    }
  ]

  return (
    <div className="absolute inset-0 w-80 bg-white border-r border-gray-100 animate-in slide-in-from-left-full duration-300 ease-out z-10">
      <div className="h-full flex flex-col">
        {/* Header with Back Button */}
        <div className="p-6 border-b border-gray-100">
          <Button
            variant="ghost"
            onClick={onBack}
            className="w-full justify-start gap-3 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-medium">Back to Dashboard</span>
          </Button>
        </div>

        {/* AI Tools */}
        <div className="flex-1 p-6">
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
              AI Tools
            </h3>
            
            {tools.map((tool) => (
              <Button
                key={tool.id}
                variant="ghost"
                onClick={() => onToolSelect?.(tool.id)}
                className={`w-full justify-start gap-3 h-12 text-sm transition-all ${
                  activeTool === tool.id 
                    ? 'bg-gray-100 shadow-sm border border-gray-200' 
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  activeTool === tool.id ? 'bg-white shadow-sm' : 'bg-gray-100'
                }`}>
                  <tool.icon className={`w-4 h-4 ${
                    activeTool === tool.id ? tool.color.split(' ')[0] : 'text-gray-600'
                  }`} />
                </div>
                <span className="font-medium">{tool.label}</span>
              </Button>
            ))}
          </div>

          {/* Process Button */}
          {activeTool && hasFiles && (
            <div className="mt-8 pt-6 border-t border-gray-100">
              <Button
                onClick={onProcess}
                disabled={isProcessing}
                className="w-full h-12 bg-black text-white hover:bg-gray-800 transition-colors"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Start Processing
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="p-6 border-t border-gray-100">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-12 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <span className="font-medium">Settings</span>
          </Button>
        </div>
      </div>
    </div>
  )
} 