"use client"

import React from 'react'

export function ModeGroup({
  modes,
  activeMode,
  onChange,
  containerRef,
  buttonRefs,
  highlightBox,
  modeContainerWidth
}: {
  modes: readonly string[]
  activeMode: string
  onChange: (mode: string) => void
  containerRef: React.MutableRefObject<HTMLDivElement | null>
  buttonRefs: React.MutableRefObject<Record<string, HTMLButtonElement | null>>
  highlightBox: { left: number; width: number }
  modeContainerWidth: number
}) {
  return (
    <div className="px-0 mt-1">
      <div
        ref={containerRef}
        className="relative ml-auto mr-2 w-max flex items-center gap-3 rounded-[16px] text-white border border-white/[0.04] px-3 py-2"
        style={{ background: 'radial-gradient(circle at 30% 30%, #3a3a3a 0%, #2a2a2a 25%, #1a1a1a 70%, #0a0a0a 100%)', boxShadow: 'inset 3px 3px 6px rgba(255,255,255,0.06), inset -3px -3px 6px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)' }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute top-1/2 -translate-y-1/2 rounded-[14px] transition-[left,width] duration-500 ease-out"
          style={{
            left: `${highlightBox.left - 4}px`,
            width: `${highlightBox.width + 8}px`,
            height: `calc(100% - 8px)`,
            background: 'radial-gradient(circle at 50% 80%, rgba(239, 68, 68, 0.25) 0%, rgba(239, 68, 68, 0.15) 25%, rgba(239, 68, 68, 0.05) 50%, transparent 70%), radial-gradient(circle at 30% 30%, #4a4a4a 0%, #3a3a3a 25%, #2a2a2a 70%, #1a1a1a 100%)',
            boxShadow: 'inset 3px 3px 6px rgba(255,255,255,0.08), inset -3px -3px 6px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)'
          }}
        />
        {modes.map((mode) => (
          <button
            key={mode}
            ref={(el) => { buttonRefs.current[mode] = el }}
            onClick={() => onChange(mode)}
            className={`relative z-10 h-10 px-5 rounded-[14px] text-sm font-medium capitalize transition-colors ${activeMode === mode ? 'text-white' : 'text-white/70 hover:text-white/85'}`}
          >
            {mode}
          </button>
        ))}
      </div>
    </div>
  )
}































