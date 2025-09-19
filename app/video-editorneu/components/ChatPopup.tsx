"use client"

import React from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Image as ImageIcon, MessageSquare, Send, SquarePlay, Wand2, X } from "lucide-react"

export function ChatPopup({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  if (!visible) return null
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div
        className="relative w-full h-full max-w-7xl max-h-[95vh] rounded-[20px] text-white/90 border border-white/[0.04] overflow-hidden flex flex-col"
        style={{ background: 'radial-gradient(circle at 50% 80%, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.08) 25%, transparent 50%), radial-gradient(circle at 30% 30%, #3a3a3a 0%, #2a2a2a 25%, #1a1a1a 70%, #0a0a0a 100%)', boxShadow: 'inset 3px 3px 6px rgba(255,255,255,0.06), inset -3px -3px 6px rgba(0,0,0,0.4), 0 20px 40px rgba(0,0,0,0.5)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-full border border-white/20 overflow-hidden flex items-center justify-center" style={{ background: 'rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(8px)' }}>
              <Avatar className="w-full h-full rounded-full">
                <AvatarImage src="https://i.pravatar.cc/64?img=12" />
                <AvatarFallback>HH</AvatarFallback>
              </Avatar>
            </div>
            <div>
              <div className="text-lg font-medium text-white/95">AI Assistant</div>
              <div className="text-sm text-white/60">Ready to help</div>
            </div>
          </div>
          <button
            className="relative w-10 h-10 rounded-full border border-white/20 flex items-center justify-center overflow-hidden hover:bg-white/10 transition-colors"
            style={{ background: 'rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(8px)' }}
            onClick={onClose}
          >
            <X className="w-5 h-5 text-white/85" strokeWidth={1.2} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="relative w-8 h-8 rounded-full border border-white/20 overflow-hidden flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(8px)' }}>
              <Avatar className="w-full h-full rounded-full">
                <AvatarImage src="https://i.pravatar.cc/64?img=12" />
                <AvatarFallback>AI</AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1">
              <div className="text-white/95 text-sm leading-relaxed">
                Hi Mike! I'm here to help you with your video editing and content creation. What would you like to work on today?
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
            {[
              { icon: <SquarePlay className='w-5 h-5' strokeWidth={1.2} />, title: 'Generate Text', desc: 'Create unique text for your videos' },
              { icon: <ImageIcon className='w-5 h-5' strokeWidth={1.2} />, title: 'Generate Images', desc: 'Create stunning images' },
              { icon: <Wand2 className='w-5 h-5' strokeWidth={1.2} />, title: 'AI Enhancements', desc: 'Improve your content' },
              { icon: <MessageSquare className='w-5 h-5' strokeWidth={1.2} />, title: 'Content Ideas', desc: 'Get creative suggestions' }
            ].map((item, idx) => (
              <button key={idx} className="w-full flex items-center gap-3 p-4 rounded-xl border border-white/20 text-left" style={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)' }}>
                <div className="relative w-10 h-10 rounded-xl flex items-center justify-center border border-white/20 overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(8px)' }}>
                  {item.icon}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-white/90">{item.title}</div>
                  <div className="text-xs text-white/70">{item.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex-1 rounded-xl border border-white/20 px-4 py-3 text-sm text-white/90 placeholder-white/60" style={{ background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(10px)' }}>
              Type your message here...
            </div>
            <button className="w-10 h-10 rounded-xl border border-white/20 text-white/80 flex items-center justify-center" style={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)' }}>
              <Send className="w-5 h-5" strokeWidth={1.2} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


