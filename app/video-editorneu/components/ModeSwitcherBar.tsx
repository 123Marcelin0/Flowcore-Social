"use client"

import React, { useEffect, useState } from "react"

export function ModeSwitcherBar({
  containerRef,
  modes,
  activeMode,
  onSelectMode,
  registerButtonRef
}: {
  containerRef: React.RefObject<HTMLDivElement | null>
  modes: ReadonlyArray<string>
  activeMode: string
  onSelectMode: (mode: string) => void
  registerButtonRef?: (mode: string, el: HTMLButtonElement | null) => void
}) {
  const [highlightBox, setHighlightBox] = useState<{ left: number; width: number }>({ left: 0, width: 0 })
  const buttonRefs = React.useRef<Record<string, HTMLButtonElement | null>>({})

  // Update highlight position when active mode changes
  useEffect(() => {
    const activeButton = buttonRefs.current[activeMode]
    const container = containerRef.current
    if (activeButton && container) {
      const containerRect = container.getBoundingClientRect()
      const buttonRect = activeButton.getBoundingClientRect()
      setHighlightBox({
        left: buttonRect.left - containerRect.left,
        width: buttonRect.width
      })
    }
  }, [activeMode, containerRef])

  return (
    <div
      ref={containerRef}
      className="relative w-full inline-flex items-center gap-3 rounded-[16px] text-white border border-white/[0.04] px-3 py-2 justify-between"
      style={{ whiteSpace: 'nowrap', background: 'radial-gradient(circle at 30% 30%, #3a3a3a 0%, #2a2a2a 25%, #1a1a1a 70%, #0a0a0a 100%)', boxShadow: 'inset 3px 3px 6px rgba(255,255,255,0.06), inset -3px -3px 6px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)' }}
    >
      {/* Moving highlight background */}
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
          ref={(el) => { 
            buttonRefs.current[mode] = el
            registerButtonRef?.(mode, el)
          }}
          onClick={() => onSelectMode(mode)}
          className={`relative z-10 h-10 px-5 rounded-[14px] text-sm font-medium capitalize transition-colors ${activeMode === mode ? 'text-white' : 'text-white/70 hover:text-white/85'}`}
        >
          {mode}
        </button>
      ))}
    </div>
  )
}


