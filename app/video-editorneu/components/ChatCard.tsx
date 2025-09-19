"use client"

import React from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Image as ImageIcon, Maximize2, SquarePlay } from "lucide-react"

export function ChatCard({ onOpen }: { onOpen: () => void }) {
  return (
    <div
      className="relative rounded-[14px] text-white/90 border border-white/[0.04] overflow-hidden h-full cursor-pointer"
      style={{ background: 'radial-gradient(circle at 50% 80%, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.08) 25%, transparent 50%), radial-gradient(circle at 30% 30%, #3a3a3a 0%, #2a2a2a 25%, #1a1a1a 70%, #0a0a0a 100%)', boxShadow: 'inset 3px 3px 6px rgba(255,255,255,0.06), inset -3px -3px 6px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)' }}
      onClick={onOpen}
    >
      <div className="p-6 space-y-4 h-full min-h-0 flex flex-col">
        <div className="flex items-start justify-between">
          <div className="flex flex-col items-start">
            <div className="relative w-10 h-10 rounded-[12px] border border-white/[0.04] overflow-hidden flex items-center justify-center" style={{ background: 'radial-gradient(circle at 30% 30%, #3a3a3a 0%, #2a2a2a 25%, #1a1a1a 70%, #0a0a0a 100%)', boxShadow: 'inset 2px 2px 4px rgba(255,255,255,0.04), inset -2px -2px 4px rgba(0,0,0,0.3)' }}>
              <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-3" style={{ background: 'linear-gradient(0deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 90%)' }} />
              <Avatar className="w-full h-full rounded-[12px]">
                <AvatarImage src="https://i.pravatar.cc/64?img=12" />
                <AvatarFallback>HH</AvatarFallback>
              </Avatar>
            </div>
            <div className="mt-6">
              <div className="text-2xl font-normal text-white/95">Hi Mike!</div>
              <div className="text-2xl font-normal text-white/95">How can I help you?</div>
            </div>
          </div>
          <button
            className="relative w-10 h-10 rounded-[12px] border border-white/20 flex items-center justify-center overflow-hidden hover:bg-white/10 transition-colors"
            style={{ background: 'rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(8px)' }}
            onClick={(e) => { e.stopPropagation(); onOpen() }}
            title="Open chat"
          >
            <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-3" style={{ background: 'linear-gradient(0deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 90%)' }} />
            <Maximize2 className="w-6 h-6 text-white/85" strokeWidth={1.2} />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-auto mt-3 mb-3 pr-1">
          {[
            { icon: <SquarePlay className='w-6 h-6' strokeWidth={1.2} />, title: 'Generate Text', desc: 'Automatically create unique text.' },
            { icon: <ImageIcon className='w-6 h-6' strokeWidth={1.2} />, title: 'Generate Images', desc: 'Create images for your projects' }
          ].map((item, idx) => (
            <button key={idx} className="w-full flex items-center gap-3 pl-2 pr-3 py-2 rounded-[12px] border border-white/20 text-left" style={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)' }}>
              <div className="relative -ml-1 w-10 h-10 rounded-[12px] flex items-center justify-center border border-white/20 overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(8px)' }}>
                <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-3" style={{ background: 'linear-gradient(0deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 90%)' }} />
                {item.icon}
              </div>
              <div className="flex-1">
                <div className="text-[13px] font-medium text-white/90">{item.title}</div>
                <div className="text-[12px] text-white/70">{item.desc}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 rounded-[12px] border border-white/20 px-3 py-3 text-[13px] text-white/90 placeholder-white/60" style={{ background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(10px)' }}>Start typing</div>
        </div>
      </div>
    </div>
  )
}


