"use client"

import React from "react"

export function MediaBackgroundCard() {
  return (
    <div className="rounded-[14px] text-white/90 border border-white/[0.04] overflow-hidden relative" style={{ background: 'radial-gradient(circle at 30% 30%, #3a3a3a 0%, #2a2a2a 25%, #1a1a1a 70%, #0a0a0a 100%)', boxShadow: 'inset 3px 3px 6px rgba(255,255,255,0.06), inset -3px -3px 6px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)' }}>
      <div className="p-6 relative">
        <div className="text-[11px] tracking-wide text-white/60">Media</div>
        <div className="text-2xl font-normal text-white mt-1">Background</div>
        <div className="mt-3 flex items-center gap-6 text-[13px] text-white/70">
          <span className="relative pb-1 after:absolute after:left-0 after:right-0 after:-bottom-[2px] after:h-[2px] after:rounded-full after:bg-white/30">Curves</span>
          <span className="opacity-80">HSL</span>
          <span className="opacity-80">Color Wheel</span>
        </div>
        <div className="mt-4 h-28 rounded-[12px] bg-gradient-to-b from-white/5 to-transparent relative overflow-hidden border border-white/5">
          <svg viewBox="0 0 320 110" className="absolute inset-0 w-full h-full">
            <defs>
              <linearGradient id="bgLinePurple" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#dc2626" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0.8" />
              </linearGradient>
              <linearGradient id="bgLineYellow" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#fde047" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#a3e635" stopOpacity="0.85" />
              </linearGradient>
            </defs>
            <g stroke="rgba(255,255,255,0.08)" strokeWidth="1">
              {Array.from({ length: 8 }).map((_, i) => (
                <line key={`h-${i}`} x1="0" x2="320" y1={14 * i} y2={14 * i} />
              ))}
            </g>
            <path d="M0 90 C 40 70, 80 100, 120 76 C 160 54, 200 84, 240 64 C 270 52, 300 66, 320 58" fill="none" stroke="url(#bgLineYellow)" strokeWidth="2" />
            <path d="M0 96 C 40 86, 80 64, 120 72 C 160 84, 200 44, 240 60 C 270 74, 300 90, 320 84" fill="none" stroke="url(#bgLinePurple)" strokeWidth="2" />
            <rect x="200" y="38" width="36" height="72" fill="url(#bgLinePurple)" opacity="0.12" />
            <rect x="200" y="38" width="36" height="72" fill="url(#bgLineYellow)" opacity="0.08" />
          </svg>
        </div>
      </div>
    </div>
  )
}


