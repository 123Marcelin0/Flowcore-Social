"use client"

import React from "react"
import GlassSurface from "@/components/ui/glass-surface"
import ShinyText from "@/components/ui/shiny-text"
import ShinyBrand from "@/components/ui/shiny-brand"

export default function ManifestoCard() {
  return (
    <div className="w-full flex items-center justify-center">
      <GlassSurface
        width="100%"
        height={560}
        backgroundOpacity={0.16}
        borderRadius={36}
        className="w-full p-10 sm:p-14 max-w-3xl"
        mixBlendMode="normal"
        contentClassName="items-start justify-center"
      >
        <div className="w-full h-full flex flex-col text-left sm:text-center">
          <div className="mt-[-36px]">
            <ShinyBrand className="mx-auto" speed={2.5} variant="plain" />
          </div>
          
          <div className="flex-1" />
          <p className="mt-5 text-base leading-relaxed text-white/85 animate-[fadeIn_.45s_ease-out_.05s_both]">
            In einer überfüllten digitalen Welt ist Sichtbarkeit kein Zufall – sie ist das Ergebnis intelligenter Strategie. Flowcore Social macht Markenführung effizient: Unsere Plattform automatisiert nicht nur, sie inspiriert, interagiert im Kontext und agiert vorausschauend.
          </p>
          <p className="mt-4 text-base leading-relaxed text-white/85 animate-[fadeIn_.45s_ease-out_.12s_both]">
            Kreativität ohne Kompromisse: Aus statischen Assets entstehen kinoreife Reels. Strategische Content‑Ideen entstehen aus Trend‑, Zielgruppen‑ und Markenanalysen. Strategie als Fundament: Monatsplanung in Minuten, optimiert für Reichweite und Konsistenz – mit klaren, handlungsorientierten Insights.
          </p>
          <p className="mt-4 text-base leading-relaxed text-white/85 animate-[fadeIn_.45s_ease-out_.19s_both]">
            Immer online, immer authentisch: Unsere KI versteht Kommentare und DMs im Kontext, antwortet markenkonform und pflegt Beziehungen – rund um die Uhr.
          </p>
          <div className="mt-10 mb-1">
            <div className="text-3xl" style={{ fontFamily: 'var(--font-signature), ui-serif, Georgia, Cambria, "Times New Roman", Times, serif' }}>— The Flowcore Team</div>
            <div className="mt-1 text-sm text-white/70">Founders @ Flowcore</div>
          </div>
        </div>
      </GlassSurface>
    </div>
  )
}



