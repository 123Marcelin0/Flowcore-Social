"use client"

import React from "react"

export function ProcessingOverlay({
  visible,
  title = 'Processing',
  step,
  progress,
  kind = 'default'
}: {
  visible: boolean
  title?: string
  step?: string
  progress?: number
  kind?: 'default' | 'subtitles'
}) {
  if (!visible) return null
  const pct = Math.max(8, Math.min(100, typeof progress === 'number' ? progress : (kind === 'subtitles' ? 60 : 8)))
  return (
    <div className="fixed inset-0 z-[1000] grid place-items-center" style={{ backdropFilter: 'blur(8px)', background: 'rgba(8,8,8,0.45)' }}>
      <div className="rounded-[16px] border border-white/10 p-6 text-white/90" style={{ background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 50%, rgba(0,0,0,0.35) 100%)', boxShadow: 'inset 2px 2px 6px rgba(255,255,255,0.06), inset -2px -2px 6px rgba(0,0,0,0.35), 0 12px 40px rgba(0,0,0,0.45)' }}>
        <div className="text-[12px] uppercase tracking-wide text-white/70 mb-1">{kind === 'subtitles' ? 'Subtitles' : title}</div>
        <div className="text-xl font-medium mb-4">{step || (kind === 'subtitles' ? 'Generating AI subtitles…' : 'Working…')}</div>
        <div className="h-2 w-64 rounded-full overflow-hidden bg-white/10">
          <div className="h-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#ef4444,#f97316)' }} />
        </div>
      </div>
    </div>
  )
}


