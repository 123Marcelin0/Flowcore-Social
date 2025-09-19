"use client"

import React, { useCallback, useRef } from "react"
import { ChevronDown, Volume2, VolumeX, Waves } from "lucide-react"

export function MusicVolumeCard({
  value,
  onChange,
  isMuted,
  onToggleMute,
  showPopup,
  onTogglePopup
}: {
  value: number
  onChange: (next: number) => void
  isMuted: boolean
  onToggleMute: () => void
  showPopup: boolean
  onTogglePopup: () => void
}) {
  const volumeTrackRef = useRef<HTMLDivElement | null>(null)

  const getSegmentFillPercent = useCallback((segmentIndex: number) => {
    const segmentStart = segmentIndex * 0.25
    const fraction = (value - segmentStart) / 0.25
    const clamped = Math.max(0, Math.min(1, fraction))
    return `${(clamped * 100).toFixed(2)}%`
  }, [value])

  const setVolumeByClientX = useCallback((clientX: number) => {
    const el = volumeTrackRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left))
    const next = x / rect.width
    onChange(next)
  }, [onChange])

  const onStartDragVolume = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setVolumeByClientX(e.clientX)
    const onMove = (ev: MouseEvent) => setVolumeByClientX(ev.clientX)
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [setVolumeByClientX])

  return (
    <div className="rounded-[14px] text-white/90 border border-white/[0.04] overflow-hidden relative" style={{ background: 'radial-gradient(circle at 30% 30%, #3a3a3a 0%, #2a2a2a 25%, #1a1a1a 70%, #0a0a0a 100%)', boxShadow: 'inset 3px 3px 6px rgba(255,255,255,0.06), inset -3px -3px 6px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)' }}>
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] tracking-wide text-white/60">Music</div>
            <div className="text-2xl font-normal">Volume</div>
          </div>
          <div className="text-3xl font-normal mt-1">{Math.round(value * 100)}%</div>
        </div>
        <div className="mt-6">
          <div className="relative h-6 rounded-[10px] overflow-hidden" style={{ background: 'rgba(27,29,34,0.35)', backdropFilter: 'blur(4px)' }}>
            <span className="pointer-events-none absolute inset-0 rounded-full" style={{ background: 'linear-gradient(270deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 60%)' }} />
            <div className="absolute top-1/2 -translate-y-1/2" ref={volumeTrackRef} onMouseDown={onStartDragVolume} style={{ left: '2px', right: '2px' }}>
              <div className="flex gap-[6px] cursor-pointer">
                {[0, 1, 2, 3].map((i) => (
                  <div key={`seg-${i}`} className="relative flex-1 h-[5px] rounded-[3px] bg-white/10 overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 rounded-[3px]" style={{
                      width: getSegmentFillPercent(i),
                      background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0.5) 25%, rgba(239, 68, 68, 0.7) 50%, rgba(200, 30, 30, 1) 100%)'
                    }} />
                  </div>
                ))}
              </div>
              <div className="absolute top-1/2 -translate-y-1/2 h-6 rounded-full flex items-center justify-center cursor-pointer z-30" onMouseDown={onStartDragVolume} style={{
                left: `${Math.max(0, Math.min(100, value * 100))}%`,
                transform: 'translate(-50%, -50%)',
                width: '32px',
                background: 'rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.25) inset, 0 2px 6px rgba(0,0,0,0.35)'
              }}>
                <Waves className="w-3.5 h-3.5 text-white/80" />
              </div>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between text-[12px] text-white/70">
            <div className="relative">
              <button
                className="flex items-center gap-2 hover:bg-white/5 rounded-md px-2 py-1 -ml-2"
                onClick={onTogglePopup}
              >
                <span className="opacity-80">Study Chill Relax Rep…</span>
                <ChevronDown className="w-3 h-3" strokeWidth={1.5} />
              </button>
              {showPopup && (
                <div className="absolute left-0 mt-2 z-50 w-64 rounded-[14px] border border-white/15 p-3"
                  style={{ background: 'rgba(20,20,20,0.6)', backdropFilter: 'blur(14px)' }}>
                  <div className="text-white/80 text-sm mb-2">Select background music</div>
                  {['Study Chill Relax','Lo-fi Groove','Ambient Focus','No Music'].map((n) => (
                    <button key={n} className="w-full text-left text-white/85 hover:bg-white/10 rounded-md px-2 py-1">
                      {n}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              className="p-1 rounded-md hover:bg-white/10"
              onClick={onToggleMute}
            >
              {isMuted ? <VolumeX className="w-5 h-5" strokeWidth={1.5} /> : <Volume2 className="w-5 h-5" strokeWidth={1.5} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


