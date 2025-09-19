"use client"
import React from 'react'
import { Anton, Bebas_Neue, Oswald, Montserrat } from 'next/font/google'

const anton = Anton({ subsets: ['latin'], weight: '400', display: 'swap' })
const bebas = Bebas_Neue({ subsets: ['latin'], weight: '400', display: 'swap' })
const oswald = Oswald({ subsets: ['latin'], weight: ['600','700'], display: 'swap' })
const mont = Montserrat({ subsets: ['latin'], weight: ['700','800','900'], display: 'swap' })

interface Props {
  value: string
  onChange: (styleId: string) => void
  color?: string
  onColorChange?: (hex: string) => void
  accentColor?: string
  onAccentColorChange?: (hex: string) => void
  animation?: 'pop' | 'fade' | 'slideUp'
  onAnimationChange?: (anim: 'pop' | 'fade' | 'slideUp') => void
}

type StyleCard = { id: string; name: string; preview: React.ReactNode }

const viralPresets: StyleCard[] = [
  {
    id: 'hormozi-bold',
    name: 'Hormozi Bold',
    preview: (
      <div className={`px-3 py-2 rounded-md bg-black text-yellow-300 ${anton.className}`} style={{ WebkitTextStroke: '2px #000', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        THIS IS A PREVIEW
      </div>
    )
  },
  {
    id: 'karaoke-accent',
    name: 'Karaoke Accent',
    preview: (
      <div className={`px-3 py-2 rounded-md bg-neutral-900 ${mont.className}`} style={{ color: '#fff', fontWeight: 900 }}>
        <span>WILLST DU</span>{' '}
        <span className="inline-block" style={{ color: '#22c55e' }}>IMMOBILIE</span>{' '}
        <span>KAUFEN</span>
      </div>
    )
  },
  {
    id: 'submagic-bold',
    name: 'Viral Bold (Submagic)',
    preview: (
      <div className={`px-3 py-2 rounded-md bg-neutral-900`} style={{ fontFamily: 'Arial, Helvetica, sans-serif', color: '#ffffff', WebkitTextStroke: '2px #000', fontWeight: 900 }}>
        <span>WILLST DU</span>{' '}
        <span className="inline-block" style={{ color: '#22c55e', WebkitTextStroke: '2px #fff', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>IMMOBILIE</span>
      </div>
    )
  },
  {
    id: 'kelly',
    name: 'Kelly (Animated)',
    preview: (
      <div className={`px-3 py-2 rounded-md bg-neutral-900 ${mont.className}`} style={{ color: '#fff', WebkitTextStroke: '2px #000', fontWeight: 900, textTransform: 'uppercase', textShadow: '0 2px 0 #000, 0 6px 20px rgba(0,0,0,0.6)' }}>
        <span style={{ display: 'inline-block', animation: 'captionPop .35s ease-out both' }}>KELLY</span>
        <span className="ml-1" style={{ color: '#22c55e', display: 'inline-block', animation: 'captionPop .35s ease-out .05s both' }}>STYLE</span>
      </div>
    )
  },
  {
    id: 'marker-highlight',
    name: 'Marker Highlight',
    preview: (
      <div className={`${mont.className}`} style={{ fontWeight: 900, textTransform: 'uppercase' }}>
        <span className="px-1 rounded" style={{ background: 'linear-gradient(180deg, rgba(255,255,0,0.7), rgba(255,255,0,0.2))' }}>HIGHLIGHTED</span> TEXT
      </div>
    )
  },
  {
    id: 'pop-shadow',
    name: 'Pop Shadow',
    preview: (
      <div className={`${mont.className}`} style={{ fontWeight: 900, textTransform: 'uppercase', color: '#fff', textShadow: '2px 2px 0 #000, 4px 4px 0 rgba(0,0,0,0.25)' }}>
        POP SHADOW
      </div>
    )
  },
  {
    id: 'hormozi-shadow',
    name: 'Hormozi Shadow',
    preview: (
      <div className={`px-3 py-2 rounded-md bg-neutral-900 text-white ${anton.className}`} style={{ textTransform: 'uppercase', letterSpacing: '0.5px', textShadow: '0 6px 24px rgba(0,0,0,0.8), 0 2px 0 #000' }}>
        HORMOZI SHADOW
      </div>
    )
  },
  {
    id: 'bold-outline',
    name: 'Bold Outline',
    preview: (
      <div className={`px-3 py-2 rounded-md bg-neutral-900 text-white ${bebas.className}`} style={{ textTransform: 'uppercase', WebkitTextStroke: '2px #000', textShadow: '0 2px 0 #000, 0 0 12px rgba(0,0,0,0.35)' }}>
        OUTLINED CAPTIONS
      </div>
    )
  },
  {
    id: 'neon-glow',
    name: 'Neon Glow',
    preview: (
      <div className={`px-3 py-2 rounded-md bg-neutral-900 ${oswald.className}`} style={{ color: '#fff', textTransform: 'uppercase', textShadow: '0 0 6px #ff2bd6, 0 0 14px #ff2bd6, 0 0 22px #7bfffd' }}>
        NEON GLOW STYLE
      </div>
    )
  },
  {
    id: 'boxed-highlight',
    name: 'Boxed Highlight',
    preview: (
      <div className={`px-2 py-1 rounded bg-gradient-to-r from-fuchsia-500/20 to-amber-400/20 text-white ${mont.className}` } style={{ fontWeight: 800, textTransform: 'uppercase', boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.15)' }}>
        BOLD HIGHLIGHT
      </div>
    )
  },
  {
    id: 'clean-white',
    name: 'Clean White',
    preview: (
      <div className={`px-3 py-2 rounded-md bg-neutral-800/70 text-white ${mont.className}`} style={{ fontWeight: 800 }}>
        Clean readable
      </div>
    )
  },
  {
    id: 'leon-rect',
    name: 'LEON Rect',
    preview: (
      <div className={`${mont.className}`} style={{ textTransform: 'uppercase', fontWeight: 900, color: '#fff' }}>
        <span className="px-1 py-[2px] rounded bg-orange-500/80 mr-1">LEON</span>
        STYLE
      </div>
    )
  },
  {
    id: 'cinematic-duo',
    name: 'Cinematic Duo',
    preview: (
      <div className={`px-3 py-2 rounded-md bg-black text-white`}>
        <span style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 900 }}>Cinematic </span>
        <em style={{ fontFamily: 'EB Garamond, serif', fontStyle: 'italic', fontWeight: 500 }}>fonts</em>
      </div>
    )
  }
]

export function SubtitleStyleSelector({ value, onChange, color = '#ffffff', onColorChange, accentColor = '#22c55e', onAccentColorChange, animation = 'pop', onAnimationChange }: Props) {
  const [options, setOptions] = React.useState<{ id: string; name: string }[]>([])
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    fetch('/api/subtitle-styles')
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return
        const base: { id: string; name: string }[] = json.styles || []
        // Merge server styles with viral presets (avoid duplicates)
        const merged = [
          ...base,
          ...viralPresets.map((p) => ({ id: p.id, name: p.name }))
        ].filter((v, i, arr) => arr.findIndex((x) => x.id === v.id) === i)
        setOptions(merged)
      })
      .catch(() => setOptions(viralPresets.map((p) => ({ id: p.id, name: p.name }))))
    return () => { cancelled = true }
  }, [])

  const currentName = React.useMemo(() => options.find(o => o.id === value)?.name || value, [options, value])

  return (
    <div className="relative">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setOpen((s) => !s)}
          className="h-9 px-3 rounded-[10px] border border-white/20 text-white/85 hover:bg-white/5 transition-all"
        >
          Subtitle style: <span className="font-medium">{currentName || 'Select'}</span>
        </button>
        {onAnimationChange && (
          <div className="flex items-center gap-2 text-white/70 text-xs">
            <span>Anim</span>
            <select value={animation} onChange={(e) => onAnimationChange(e.target.value as any)} className="h-7 rounded border border-white/20 bg-transparent">
              <option value="pop">Pop</option>
              <option value="fade">Fade</option>
              <option value="slideUp">Slide up</option>
            </select>
          </div>
        )}
        {onColorChange && (
          <div className="flex items-center gap-1 text-white/70 text-xs">
            <span>Base</span>
            <input type="color" value={color} onChange={(e) => onColorChange(e.target.value)} className="w-8 h-6 rounded border border-white/20 bg-transparent cursor-pointer" title="Base color" />
          </div>
        )}
        {onAccentColorChange && (
          <div className="flex items-center gap-1 text-white/70 text-xs">
            <span>Accent</span>
            <input type="color" value={accentColor} onChange={(e) => onAccentColorChange(e.target.value)} className="w-8 h-6 rounded border border-white/20 bg-transparent cursor-pointer" title="Accent color" />
          </div>
        )}
      </div>

      {open && (
        <div className="absolute right-0 mt-2 w-[360px] z-50 rounded-[12px] border border-white/20 p-3" style={{ background: 'rgba(28,28,28,0.95)', backdropFilter: 'blur(8px)' }}>
          <div className="text-xs text-white/60 mb-2">Viral presets</div>
          <div className="grid grid-cols-2 gap-3">
            {viralPresets.map((p) => (
              <button
                key={p.id}
                onClick={() => { onChange(p.id); setOpen(false) }}
                className={`rounded-[10px] p-2 border ${value === p.id ? 'border-white/60' : 'border-white/15'} hover:border-white/40 text-left transition-colors`}
              >
                <div className="mb-2 text-[11px] text-white/60">{p.name}</div>
                <div className="rounded overflow-hidden">{p.preview}</div>
              </button>
            ))}
          </div>

          {options.length > viralPresets.length && (
            <>
              <div className="text-xs text-white/60 mt-4 mb-2">More styles</div>
              <div className="grid grid-cols-2 gap-2">
                {options
                  .filter(o => !viralPresets.find(v => v.id === o.id))
                  .map((o) => (
                    <button
                      key={o.id}
                      onClick={() => { onChange(o.id); setOpen(false) }}
                      className={`rounded-[10px] p-2 border ${value === o.id ? 'border-white/60' : 'border-white/15'} hover:border-white/40 text-left transition-colors text-white/80 text-sm`}
                    >
                      {o.name}
                    </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default SubtitleStyleSelector











