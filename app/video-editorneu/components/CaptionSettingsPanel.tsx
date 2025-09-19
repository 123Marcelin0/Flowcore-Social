"use client"

import React from "react"

export function CaptionSettingsPanel({
  captionConfig,
  onCaptionConfigChange,
  onAddIcons,
  onClearIcons,
  onGenerateTestSubtitles,
  onClearSubtitles,
  isProcessing,
  isProcessingSubtitles
}: {
  captionConfig: any
  onCaptionConfigChange: (updates: any) => void
  onAddIcons: () => void
  onClearIcons: () => void
  onGenerateTestSubtitles?: () => void
  onClearSubtitles?: () => void
  isProcessing: boolean
  isProcessingSubtitles: boolean
}) {
  return (
    <div className="p-4">
      <div className="text-[11px] tracking-wide text-white/60">Caption</div>
      <div className="text-2xl font-normal mb-4">Choose Style</div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-white/70 mb-1">Font Family</div>
          <select className="w-full h-9 rounded-[10px] bg-transparent border border-white/20 px-2" value={captionConfig?.styleKey || 'default'} onChange={(e) => onCaptionConfigChange({ styleKey: e.target.value })}>
            <option value="default">Montserrat</option>
            <option value="hormozi-bold">Anton (Hormozi Bold)</option>
            <option value="bold-outline">Bebas Neue (Bold Outline)</option>
            <option value="neon-glow">Oswald (Neon Glow)</option>
            <option value="karaoke-accent">Karaoke Accent</option>
            <option value="submagic-bold">Viral Bold</option>
            <option value="kelly">Kelly</option>
            <option value="marker-highlight">Marker Highlight</option>
            <option value="pop-shadow">Pop Shadow</option>
            <option value="leon-rect">LEON Rect</option>
            <option value="cinematic-duo">Cinematic Duo (Inter Black + EB Garamond)</option>
          </select>
        </div>
        <div>
          <div className="text-xs text-white/70 mb-1">Font Weight</div>
          <select className="w-full h-9 rounded-[10px] bg-transparent border border-white/20 px-2" value={captionConfig?.fontWeight || 'Bold'} onChange={(e) => onCaptionConfigChange({ fontWeight: e.target.value })}>
            <option value="Heavy">Heavy</option>
            <option value="Bold">Bold</option>
            <option value="Medium">Medium</option>
            <option value="Regular">Regular</option>
            <option value="Light">Light</option>
          </select>
        </div>
      </div>

      <div className="mt-4">
        <div className="text-xs text-white/70 mb-1">Font Size</div>
        <div className="flex items-center gap-3">
          <div className="w-16 text-center h-9 grid place-items-center rounded-[10px] border border-white/20">{captionConfig?.fontSize || 28}</div>
          <input type="range" min={16} max={72} step={1} value={captionConfig?.fontSize || 28} onChange={(e) => onCaptionConfigChange({ fontSize: parseInt(e.target.value || '28', 10) })} className="flex-1" />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-white/70 mb-1">Main Color</div>
          <input type="color" className="w-full h-9 rounded-[10px] border border-white/20 bg-transparent" value={captionConfig?.colorMain || '#ffffff'} onChange={(e) => onCaptionConfigChange({ colorMain: e.target.value })} />
        </div>
        <div>
          <div className="text-xs text-white/70 mb-1">Accent Color</div>
          <input type="color" className="w-full h-9 rounded-[10px] border border-white/20 bg-transparent" value={captionConfig?.accentColor || '#ef4444'} onChange={(e) => onCaptionConfigChange({ accentColor: e.target.value })} />
        </div>
      </div>

      <div className="mt-4">
        <div className="text-xs text-white/70 mb-1">Uppercase</div>
        <div className="flex items-center gap-2">
          <button className={`px-3 py-1.5 rounded-md border ${captionConfig?.uppercase ? 'bg-white/15 border-white/40' : 'bg-white/10 border-white/20'}`} onClick={() => onCaptionConfigChange({ uppercase: true })}>Yes</button>
          <button className={`px-3 py-1.5 rounded-md border ${!captionConfig?.uppercase ? 'bg-white/15 border-white/40' : 'bg-white/10 border-white/20'}`} onClick={() => onCaptionConfigChange({ uppercase: false })}>No</button>
        </div>
      </div>

      <div className="mt-4">
        <div className="text-xs text-white/70 mb-1">Animation</div>
        <div className="flex items-center gap-2">
          <button className={`px-3 py-1.5 rounded-md border ${captionConfig?.animEnabled ? 'bg-white/15 border-white/40' : 'bg-white/10 border-white/20'}`} onClick={() => onCaptionConfigChange({ animEnabled: true })}>Yes</button>
          <button className={`px-3 py-1.5 rounded-md border ${!captionConfig?.animEnabled ? 'bg-white/15 border-white/40' : 'bg-white/10 border-white/20'}`} onClick={() => onCaptionConfigChange({ animEnabled: false })}>No</button>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button className="px-4 py-2 rounded-md border bg-white/10 border-white/20 hover:bg-white/15" onClick={onAddIcons}>Add Icons</button>
        <button className="px-4 py-2 rounded-md border bg-white/10 border-white/20 hover:bg-white/15" onClick={onClearIcons}>Clear Icons</button>
      </div>

      {/* Subtitle Testing Section */}
      <div className="mt-6 pt-4 border-t border-white/10">
        <div className="text-xs text-white/70 mb-2">Subtitle Testing</div>
        <div className="flex items-center gap-2">
          <button 
            className="px-4 py-2 rounded-md border bg-blue-500/20 border-blue-400/30 hover:bg-blue-500/30 text-blue-300 disabled:opacity-50" 
            onClick={onGenerateTestSubtitles}
            disabled={isProcessing || isProcessingSubtitles}
          >
            {isProcessingSubtitles ? 'Generating...' : 'Add Subtitles'}
          </button>
          <button 
            className="px-4 py-2 rounded-md border bg-red-500/20 border-red-400/30 hover:bg-red-500/30 text-red-300" 
            onClick={onClearSubtitles}
          >
            Clear Subtitles
          </button>
        </div>
        <div className="text-xs text-white/50 mt-2">
          Test subtitle generation from transcript or demo content
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between mb-1"><span>Line spacing</span><span className="text-white/60">{(captionConfig?.lineSpacing || 1.18).toFixed(2)}</span></div>
        <input type="range" min={1.00} max={1.60} step={0.02} value={captionConfig?.lineSpacing || 1.18} onChange={(e) => onCaptionConfigChange({ lineSpacing: parseFloat(e.target.value || '1.18') })} className="w-full" />
      </div>
    </div>
  )
}

















