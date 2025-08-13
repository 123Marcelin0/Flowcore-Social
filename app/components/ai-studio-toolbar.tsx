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
  const isSpecialTool = isVideoActive || isImageActive || isVideoMergerActive || isContentActive || isInteriorActive || isVideoEditorActive



  return (
    <div 
      data-ai-tools-sidebar
      className={`absolute inset-0 w-72 h-[calc(100vh-10rem)] overflow-hidden animate-in slide-in-from-left-full duration-700 ease-out mt-6 mb-20 ${
        isInteriorActive || isVideoEditorActive ? 'rounded-tr-[24px] rounded-br-[24px]' : 'rounded-tr-[80px] rounded-br-[80px]'
      }`}

    >
      {/* Unified Glass Overlay - No duplicate background */}
      <div 
        className={`absolute inset-0 overflow-hidden ${
          isInteriorActive || isVideoEditorActive ? 'rounded-tr-[24px] rounded-br-[24px]' : 'rounded-tr-[80px] rounded-br-[80px]'
        }`}
      >
        {/* Single Glass Overlay that adapts to any background */}
        <div className={`absolute inset-0 backdrop-blur-[40px] backdrop-saturate-[200%] border-r shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_8px_32px_rgba(255,255,255,0.08)] ${
          isVideoActive || isImageActive
            ? 'bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-white/[0.02] border-white/10'
            : 'bg-gradient-to-br from-white/[0.25] via-white/[0.15] to-white/[0.08] border-white/20'
        }`} />
        
        {/* Subtle Floating Orbs - Universal */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/3 w-20 h-20 bg-white/[0.06] rounded-full blur-xl animate-pulse" />
          <div className="absolute bottom-1/3 right-1/4 w-16 h-16 bg-white/[0.04] rounded-full blur-lg animate-pulse" style={{ animationDelay: '2s' }} />
          <div className="absolute top-2/3 left-1/2 w-12 h-12 bg-white/[0.03] rounded-full blur-md animate-pulse" style={{ animationDelay: '4s' }} />
        </div>

        {/* Glass Refraction Effects */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.05] via-transparent to-white/[0.02] pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-bl from-transparent via-white/[0.02] to-transparent pointer-events-none" />
        
        {/* CSS Animations for All Backgrounds */}
        <style jsx>{`
           /* Video Tool Animations */
           @keyframes videoFloat-0 { 0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); } 50% { transform: translate(20px, -15px) scale(1.15) rotate(180deg); } }
           @keyframes videoFloat-1 { 0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); } 50% { transform: translate(-15px, 20px) scale(0.9) rotate(-180deg); } }
           @keyframes videoFloat-2 { 0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); } 50% { transform: translate(25px, 10px) scale(1.2) rotate(90deg); } }
           @keyframes videoFloat-3 { 0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); } 50% { transform: translate(-20px, -12px) scale(0.85) rotate(-90deg); } }
           @keyframes videoFloat-4 { 0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); } 50% { transform: translate(18px, 25px) scale(1.1) rotate(270deg); } }
           @keyframes videoDrift-0 { 0% { transform: translateY(-120%) rotate(0deg); opacity: 0; } 10% { opacity: 0.1; } 90% { opacity: 0.1; } 100% { transform: translateY(120%) rotate(180deg); opacity: 0; } }
           @keyframes videoDrift-1 { 0% { transform: translateY(-120%) rotate(60deg); opacity: 0; } 15% { opacity: 0.08; } 85% { opacity: 0.08; } 100% { transform: translateY(120%) rotate(240deg); opacity: 0; } }
           @keyframes videoDrift-2 { 0% { transform: translateY(-120%) rotate(120deg); opacity: 0; } 20% { opacity: 0.12; } 80% { opacity: 0.12; } 100% { transform: translateY(120%) rotate(300deg); opacity: 0; } }

           /* Image Tool Animations */
           @keyframes imageFloat-0 { 0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); } 33% { transform: translate(15px, -20px) scale(1.3) rotate(120deg); } 66% { transform: translate(-18px, 25px) scale(0.8) rotate(240deg); } }
           @keyframes imageFloat-1 { 0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); } 33% { transform: translate(-22px, 18px) scale(1.1) rotate(-120deg); } 66% { transform: translate(20px, -15px) scale(0.9) rotate(-240deg); } }
           @keyframes imageFloat-2 { 0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); } 33% { transform: translate(25px, 12px) scale(1.25) rotate(90deg); } 66% { transform: translate(-20px, -18px) scale(0.75) rotate(270deg); } }
           @keyframes imageDrift-0 { 0% { transform: translateY(-100%) rotate(0deg); opacity: 0; } 12% { opacity: 0.15; } 88% { opacity: 0.15; } 100% { transform: translateY(100vh) rotate(360deg); opacity: 0; } }
           @keyframes imageDrift-1 { 0% { transform: translateY(-100%) rotate(180deg); opacity: 0; } 18% { opacity: 0.12; } 82% { opacity: 0.12; } 100% { transform: translateY(100vh) rotate(540deg); opacity: 0; } }

           /* Content Tool Animations */
           @keyframes contentStain-0 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.20; } 50% { transform: translate(25px, -20px) scale(1.3); opacity: 0.30; } }
           @keyframes contentStain-1 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.20; } 50% { transform: translate(-20px, 25px) scale(0.8); opacity: 0.25; } }
           @keyframes contentStain-2 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.20; } 50% { transform: translate(30px, 15px) scale(1.2); opacity: 0.28; } }
           @keyframes contentStain-3 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.20; } 50% { transform: translate(-25px, -18px) scale(0.9); opacity: 0.22; } }
           @keyframes contentStain-4 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.20; } 50% { transform: translate(18px, 30px) scale(1.1); opacity: 0.26; } }
           @keyframes contentStain-5 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.20; } 50% { transform: translate(-30px, 12px) scale(0.7); opacity: 0.24; } }
           
           @keyframes contentBubble-0 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.25; } 50% { transform: translate(15px, -25px) scale(1.2); opacity: 0.35; } }
           @keyframes contentBubble-1 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.25; } 50% { transform: translate(-18px, 20px) scale(0.8); opacity: 0.30; } }
           @keyframes contentBubble-2 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.25; } 50% { transform: translate(22px, 18px) scale(1.1); opacity: 0.32; } }
           @keyframes contentBubble-3 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.25; } 50% { transform: translate(-15px, -22px) scale(0.9); opacity: 0.28; } }
           @keyframes contentBubble-4 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.25; } 50% { transform: translate(20px, 25px) scale(1.3); opacity: 0.34; } }
           @keyframes contentBubble-5 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.25; } 50% { transform: translate(-25px, 15px) scale(0.7); opacity: 0.26; } }
           @keyframes contentBubble-6 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.25; } 50% { transform: translate(18px, -20px) scale(1.1); opacity: 0.31; } }
           @keyframes contentBubble-7 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.25; } 50% { transform: translate(-20px, 28px) scale(0.8); opacity: 0.29; } }
           
           @keyframes contentLine-0 { 0% { transform: translateY(-100%) rotate(0deg); opacity: 0; } 10% { opacity: 0.15; } 90% { opacity: 0.15; } 100% { transform: translateY(100vh) rotate(180deg); opacity: 0; } }
           @keyframes contentLine-1 { 0% { transform: translateY(-100%) rotate(120deg); opacity: 0; } 15% { opacity: 0.12; } 85% { opacity: 0.12; } 100% { transform: translateY(100vh) rotate(300deg); opacity: 0; } }
           @keyframes contentLine-2 { 0% { transform: translateY(-100%) rotate(240deg); opacity: 0; } 20% { opacity: 0.10; } 80% { opacity: 0.10; } 100% { transform: translateY(100vh) rotate(420deg); opacity: 0; } }

           /* Video Merger Tool Animations */
           @keyframes mergerFloat-0 { 0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); } 50% { transform: translate(18px, -12px) scale(1.1) rotate(180deg); } }
           @keyframes mergerFloat-1 { 0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); } 50% { transform: translate(-15px, 18px) scale(0.9) rotate(-180deg); } }
           @keyframes mergerFloat-2 { 0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); } 50% { transform: translate(22px, 8px) scale(1.15) rotate(90deg); } }
           @keyframes mergerDrift-0 { 0% { transform: translateY(-100%) rotate(0deg); opacity: 0; } 12% { opacity: 0.06; } 88% { opacity: 0.06; } 100% { transform: translateY(100vh) rotate(180deg); opacity: 0; } }
           @keyframes mergerDrift-1 { 0% { transform: translateY(-100%) rotate(180deg); opacity: 0; } 18% { opacity: 0.08; } 82% { opacity: 0.08; } 100% { transform: translateY(100vh) rotate(360deg); opacity: 0; } }

           /* Interior Tool Animations */
           @keyframes interiorStain-0 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; } 50% { transform: translate(25px, -20px) scale(1.4); opacity: 0.25; } }
           @keyframes interiorStain-1 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; } 50% { transform: translate(-20px, 25px) scale(0.7); opacity: 0.20; } }
           @keyframes interiorStain-2 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; } 50% { transform: translate(30px, 15px) scale(1.3); opacity: 0.23; } }
           @keyframes interiorStain-3 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; } 50% { transform: translate(-25px, -18px) scale(0.8); opacity: 0.18; } }
           @keyframes interiorStain-4 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; } 50% { transform: translate(18px, 30px) scale(1.2); opacity: 0.22; } }
           @keyframes interiorStain-5 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; } 50% { transform: translate(-30px, 12px) scale(0.9); opacity: 0.21; } }
           
           @keyframes interiorBubble-0 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.20; } 50% { transform: translate(15px, -25px) scale(1.3); opacity: 0.35; } }
           @keyframes interiorBubble-1 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.20; } 50% { transform: translate(-18px, 20px) scale(0.7); opacity: 0.30; } }
           @keyframes interiorBubble-2 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.20; } 50% { transform: translate(22px, 18px) scale(1.2); opacity: 0.33; } }
           @keyframes interiorBubble-3 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.20; } 50% { transform: translate(-15px, -22px) scale(0.8); opacity: 0.27; } }
           @keyframes interiorBubble-4 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.20; } 50% { transform: translate(20px, 25px) scale(1.4); opacity: 0.37; } }
           @keyframes interiorBubble-5 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.20; } 50% { transform: translate(-25px, 15px) scale(0.6); opacity: 0.25; } }
           @keyframes interiorBubble-6 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.20; } 50% { transform: translate(18px, -20px) scale(1.1); opacity: 0.31; } }
           @keyframes interiorBubble-7 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.20; } 50% { transform: translate(-20px, 28px) scale(0.9); opacity: 0.29; } }
           
           @keyframes interiorLine-0 { 0% { transform: translateY(-100%) rotate(0deg); opacity: 0; } 10% { opacity: 0.10; } 90% { opacity: 0.10; } 100% { transform: translateY(100vh) rotate(180deg); opacity: 0; } }
           @keyframes interiorLine-1 { 0% { transform: translateY(-100%) rotate(120deg); opacity: 0; } 15% { opacity: 0.08; } 85% { opacity: 0.08; } 100% { transform: translateY(100vh) rotate(300deg); opacity: 0; } }
           @keyframes interiorLine-2 { 0% { transform: translateY(-100%) rotate(240deg); opacity: 0; } 20% { opacity: 0.06; } 80% { opacity: 0.06; } 100% { transform: translateY(100vh) rotate(420deg); opacity: 0; } }
           
           @keyframes interiorParticle-0 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; } 50% { transform: translate(10px, -15px) scale(1.2); opacity: 0.25; } }
           @keyframes interiorParticle-1 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; } 50% { transform: translate(-12px, 18px) scale(0.8); opacity: 0.20; } }
           @keyframes interiorParticle-2 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; } 50% { transform: translate(15px, 12px) scale(1.1); opacity: 0.23; } }
           @keyframes interiorParticle-3 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; } 50% { transform: translate(-8px, -20px) scale(0.9); opacity: 0.18; } }
           @keyframes interiorParticle-4 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; } 50% { transform: translate(20px, 25px) scale(1.3); opacity: 0.27; } }
           @keyframes interiorParticle-5 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; } 50% { transform: translate(-18px, 15px) scale(0.7); opacity: 0.21; } }
           @keyframes interiorParticle-6 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; } 50% { transform: translate(12px, -25px) scale(1.1); opacity: 0.24; } }
           @keyframes interiorParticle-7 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; } 50% { transform: translate(-25px, 22px) scale(0.8); opacity: 0.19; } }
           @keyframes interiorParticle-8 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; } 50% { transform: translate(18px, 30px) scale(1.2); opacity: 0.26; } }
           @keyframes interiorParticle-9 { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; } 50% { transform: translate(-15px, -18px) scale(0.9); opacity: 0.22; } }
        `}</style>
      </div>
      
      <div className="relative h-full flex flex-col z-10">
        {/* AI Tools Header with Back Icon */}
        <div className="flex-1 p-8">
          <div className="space-y-3">
            <div className="flex items-center gap-3 mb-4">
              <Button
                variant="ghost"
                onClick={onBack}
                className="relative p-2 transition-all duration-500 active:scale-95 h-8 w-8 rounded-xl overflow-hidden group bg-gradient-to-br from-white/[0.2] via-white/[0.12] to-white/[0.06] backdrop-blur-[35px] backdrop-saturate-[200%] border border-white/15 shadow-[0_8px_32px_rgba(255,255,255,0.05),inset_0_1px_0_rgba(255,255,255,0.15)] hover:from-white/[0.25] hover:via-white/[0.15] hover:to-white/[0.08] hover:shadow-[0_12px_40px_rgba(255,255,255,0.08),inset_0_2px_0_rgba(255,255,255,0.2)] hover:scale-105"
                style={isInteriorActive ? { backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)' } : {}}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-xl" />
                <ArrowLeft className={`w-4 h-4 relative z-10 transition-all duration-300 ${
                  isVideoActive || isImageActive
                    ? 'text-white/90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.4)]'
                    : 'text-gray-700 drop-shadow-[0_1px_2px_rgba(255,255,255,0.3)]'
                } group-hover:text-gray-800 group-hover:filter group-hover:brightness-110`} />
              </Button>
              <h3 className={`text-sm font-semibold uppercase tracking-wide transition-all duration-300 glass-text-shadow ${
                isVideoActive || isImageActive
                  ? 'text-white/90'
                  : 'text-gray-800'
              }`}>
                AI Tools
              </h3>
            </div>
            
            {tools.map((tool) => (
              <Button
                key={tool.id}
                variant="ghost"
                onClick={() => onToolSelect?.(tool.id)}
                className={`relative w-full justify-start gap-3 h-12 text-sm transition-all duration-500 active:scale-95 rounded-xl overflow-hidden group ${
                  activeTool === tool.id 
                    ? 'bg-gradient-to-r from-white/[0.25] via-white/[0.15] to-white/[0.08] backdrop-blur-[35px] backdrop-saturate-[200%] shadow-[0_16px_48px_rgba(255,255,255,0.08),inset_0_2px_0_rgba(255,255,255,0.2)] border border-white/20'
                    : 'bg-gradient-to-r from-white/[0.15] via-white/[0.08] to-white/[0.04] backdrop-blur-[30px] backdrop-saturate-[200%] border border-white/15 hover:from-white/[0.2] hover:via-white/[0.12] hover:to-white/[0.06] hover:shadow-[0_12px_40px_rgba(255,255,255,0.06),inset_0_1px_0_rgba(255,255,255,0.15)] hover:border-white/20 hover:scale-[1.02]'
                }`}
                style={isInteriorActive ? { backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)' } : {}}
              >
                {/* Glass reflection effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-xl" />
                
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-500 relative z-10 ${
                  activeTool === tool.id 
                    ? 'bg-gradient-to-br from-white/[0.3] via-white/[0.2] to-white/[0.1] backdrop-blur-[30px] backdrop-saturate-[200%] shadow-[0_8px_32px_rgba(255,255,255,0.1),inset_0_2px_0_rgba(255,255,255,0.2)] border border-white/25'
                    : 'bg-gradient-to-br from-white/[0.2] via-white/[0.12] to-white/[0.08] backdrop-blur-[25px] backdrop-saturate-[200%] border border-white/20 group-hover:from-white/[0.25] group-hover:via-white/[0.15] group-hover:to-white/[0.1] group-hover:shadow-[0_8px_32px_rgba(255,255,255,0.08),inset_0_1px_0_rgba(255,255,255,0.2)] group-hover:border-white/25'
                }`}
                style={isInteriorActive ? { backdropFilter: 'blur(25px)', WebkitBackdropFilter: 'blur(25px)' } : {}}>
                  <tool.icon className={`w-4 h-4 transition-all duration-500 ${
                    activeTool === tool.id 
                      ? isVideoActive || isImageActive
                        ? 'text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)] filter brightness-110'
                        : 'text-gray-800 drop-shadow-[0_1px_2px_rgba(255,255,255,0.4)] filter brightness-110'
                      : isVideoActive || isImageActive
                        ? 'text-white/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)] group-hover:text-white/90 group-hover:filter group-hover:brightness-110'
                        : 'text-gray-700 drop-shadow-[0_1px_2px_rgba(255,255,255,0.3)] group-hover:text-gray-800 group-hover:filter group-hover:brightness-110'
                  }`} />
                </div>
                <span className={`font-medium relative z-10 transition-all duration-500 ${
                  activeTool === tool.id 
                    ? isVideoActive || isImageActive
                      ? 'text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)] filter brightness-110'
                      : 'text-gray-800 drop-shadow-[0_1px_2px_rgba(255,255,255,0.4)] filter brightness-110'
                    : isVideoActive || isImageActive
                      ? 'text-white/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)] group-hover:text-white/90 group-hover:filter group-hover:brightness-110'
                      : 'text-gray-700 drop-shadow-[0_1px_2px_rgba(255,255,255,0.3)] group-hover:text-gray-800 group-hover:filter group-hover:brightness-110'
                }`}>{tool.label}</span>
              </Button>
            ))}
          </div>

          {/* Process Button */}
          {activeTool && hasFiles && (
            <div className={`mt-8 pt-8 border-t ${isSpecialTool ? (isInteriorActive ? 'border-white/25' : 'border-white/25') : 'border-white/30'}`}>
              <Button
                onClick={onProcess}
                disabled={isProcessing}
                className={`relative w-full h-12 transition-all duration-500 active:scale-95 rounded-xl overflow-hidden group ${
                  isProcessing 
                    ? isVideoActive
                      ? 'bg-white/15 backdrop-blur-[30px] text-white/50 cursor-not-allowed opacity-50 border border-white/20' 
                      : isImageActive
                      ? 'bg-white/18 backdrop-blur-[35px] text-white/50 cursor-not-allowed opacity-50 border border-purple-300/20'
                      : isContentActive
                      ? 'bg-white/18 backdrop-blur-[35px] text-black/50 cursor-not-allowed opacity-50 border border-teal-300/20'
                      : isInteriorActive
                      ? 'bg-white/6 backdrop-blur-[40px] text-slate-500 cursor-not-allowed opacity-50 border border-white/12'
                      : 'bg-gradient-to-r from-white/25 via-white/15 to-white/8 backdrop-blur-[40px] text-gray-600 cursor-not-allowed opacity-50 border border-white/30'
                    : isVideoActive
                      ? 'bg-white/20 backdrop-blur-[35px] text-white hover:bg-white/25 hover:shadow-[0_0_25px_rgba(14,165,233,0.3),inset_0_2px_4px_rgba(255,255,255,0.2)] border border-white/25 hover:border-white/30'
                      : isImageActive
                      ? 'bg-white/22 backdrop-blur-[40px] text-white hover:bg-white/28 hover:shadow-[0_0_30px_rgba(139,69,19,0.3),inset_0_2px_4px_rgba(255,192,203,0.2)] border border-purple-300/25 hover:border-purple-300/35'
                      : isContentActive
                      ? 'bg-white/22 backdrop-blur-[40px] text-black hover:bg-white/28 hover:shadow-[0_0_30px_rgba(20,184,166,0.3),inset_0_2px_4px_rgba(255,255,255,0.2)] border border-teal-300/25 hover:border-teal-300/35'
                      : isInteriorActive
                      ? 'bg-white/8 backdrop-blur-[40px] text-slate-700 hover:bg-white/12 hover:shadow-[0_8px_32px_rgba(0,0,0,0.06)] border border-white/15 hover:border-white/20'
                      : 'bg-gradient-to-r from-white/50 via-white/40 to-white/30 backdrop-blur-[25px] text-gray-800 hover:shadow-[0_8px_24px_rgba(255,165,0,0.15),inset_0_1px_2px_rgba(255,255,255,0.4)] border border-white/50 hover:border-white/60'
                }`}
                style={isInteriorActive ? { backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)' } : {}}
              >
                {!isProcessing && (
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-xl" />
                )}
                
                {isProcessing ? (
                  <>
                    <Loader2 className={`w-4 h-4 mr-2 animate-spin relative z-10 ${
                      isVideoActive ? 'text-white/60' : isImageActive ? 'text-white/60' : isContentActive ? 'text-black/60' : 'text-white/50'
                    }`} />
                    <span className="relative z-10">Processing...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className={`w-4 h-4 mr-2 relative z-10 transition-all duration-300 group-hover:filter group-hover:brightness-125 ${
                      isVideoActive 
                        ? 'text-white drop-shadow-[0_2px_8px_rgba(14,165,233,0.6)]'
                        : isImageActive
                        ? 'text-white drop-shadow-[0_2px_8px_rgba(255,192,203,0.6)]'
                        : isContentActive
                        ? 'text-black drop-shadow-[0_2px_8px_rgba(20,184,166,0.6)]'
                        : 'text-gray-800 drop-shadow-[0_1px_2px_rgba(255,165,0,0.3)]'
                    }`} />
                    <span className={`font-medium relative z-10 transition-all duration-300 group-hover:filter group-hover:brightness-110 ${
                      isVideoActive 
                        ? 'text-white drop-shadow-[0_2px_8px_rgba(14,165,233,0.4)]'
                        : isImageActive
                        ? 'text-white drop-shadow-[0_2px_8px_rgba(255,192,203,0.4)]'
                        : isContentActive
                        ? 'text-black drop-shadow-[0_2px_8px_rgba(20,184,166,0.4)]'
                        : 'text-gray-800 drop-shadow-[0_1px_2px_rgba(255,165,0,0.3)]'
                    }`}>Start Processing</span>
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Settings */}
        <div className={`p-8 border-t ${isSpecialTool ? 'border-white/25' : 'border-white/30'}`}>
          <Button
            variant="ghost"
            className={`relative w-full justify-start gap-3 h-12 transition-all duration-500 active:scale-95 rounded-xl overflow-hidden group ${
              isVideoActive
                ? 'bg-white/06 backdrop-blur-[30px] border border-white/10 hover:bg-white/08 hover:shadow-[0_0_20px_rgba(14,165,233,0.1),inset_0_1px_2px_rgba(255,255,255,0.15)] hover:border-white/12'
                : isImageActive
                ? 'bg-white/08 backdrop-blur-[35px] border border-purple-300/10 hover:bg-white/10 hover:shadow-[0_0_25px_rgba(139,69,19,0.1),inset_0_1px_2px_rgba(255,192,203,0.15)] hover:border-purple-300/15'
                : 'bg-gradient-to-r from-white/12 via-white/08 to-white/06 backdrop-blur-[20px] border border-white/15 hover:shadow-[0_6px_20px_rgba(255,165,0,0.05),inset_0_1px_2px_rgba(255,255,255,0.15)] hover:border-white/20'
            }`}
          >
            {/* Glass reflection effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-xl" />
            
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center relative z-10 transition-all duration-500 ${
              isVideoActive
                ? 'bg-white/08 backdrop-blur-[25px] border border-white/12 group-hover:shadow-[0_4px_16px_rgba(14,165,233,0.15)]'
                : isImageActive
                ? 'bg-white/10 backdrop-blur-[30px] border border-purple-300/12 group-hover:shadow-[0_4px_16px_rgba(139,69,19,0.15)]'
                : 'bg-gradient-to-br from-white/15 via-white/10 to-white/08 backdrop-blur-[15px] border border-white/15 group-hover:shadow-[0_2px_8px_rgba(255,165,0,0.08)]'
            }`}>
              <Settings className={`w-4 h-4 transition-all duration-300 group-hover:filter group-hover:brightness-110 ${
                isVideoActive 
                  ? 'text-white/90 drop-shadow-[0_1px_6px_rgba(14,165,233,0.5)]'
                  : isImageActive
                  ? 'text-white/90 drop-shadow-[0_1px_6px_rgba(255,192,203,0.5)]'
                  : 'text-gray-700 drop-shadow-[0_1px_2px_rgba(255,165,0,0.2)] group-hover:text-gray-800'
              }`} />
            </div>
            <span className={`font-medium relative z-10 transition-all duration-300 group-hover:filter group-hover:brightness-110 ${
              isVideoActive 
                ? 'text-white/90 drop-shadow-[0_1px_6px_rgba(14,165,233,0.4)]'
                : isImageActive
                ? 'text-white/90 drop-shadow-[0_1px_6px_rgba(255,192,203,0.4)]'
                : 'text-gray-700 drop-shadow-[0_1px_2px_rgba(255,165,0,0.2)] group-hover:text-gray-800'
            }`}>Settings</span>
          </Button>
        </div>
      </div>
    </div>
  )
} 