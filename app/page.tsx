"use client"

import React from "react"
import GlassSurface from "@/components/ui/glass-surface"
import ShinyText from "@/components/ui/shiny-text"
import ShinyBrand from "@/components/ui/shiny-brand"
import dynamic from "next/dynamic"
import WaitlistCard from "@/components/waitlist-card"
import ManifestoCard from "@/components/manifesto-card"
 

const Silk = dynamic(() => import("@/components/ui/silk"), { ssr: false })

export default function LandingPage() {
  const [tab, setTab] = React.useState<'waitlist' | 'manifesto'>('waitlist')
  React.useEffect(() => {
    const glow = document.getElementById('cursor-glow')
    if (!glow) return
    let raf = 0
    let targetX = 0
    let targetY = 0
    let x = 0
    let y = 0
    const handleMove = (e: MouseEvent) => {
      targetX = e.clientX
      targetY = e.clientY
      glow.style.opacity = '0.8'
    }
    const tick = () => {
      x += (targetX - x) * 0.12
      y += (targetY - y) * 0.12
      glow.style.transform = `translate(${x - 0.0}px, ${y - 0.0}px)`
      raf = requestAnimationFrame(tick)
    }
    document.addEventListener('mousemove', handleMove)
    raf = requestAnimationFrame(tick)
    return () => {
      document.removeEventListener('mousemove', handleMove)
      cancelAnimationFrame(raf)
    }
  }, [])
  return (
    <main className="min-h-screen relative overflow-hidden text-white">
      {/* Silk animated background - respect reduced motion to avoid GPU strain */}
      <div className="absolute inset-0 z-0 motion-safe:block motion-reduce:hidden">
        <Silk speed={5} scale={1} color="#7B7481" noiseIntensity={1.5} rotation={0.1} />
      </div>

      {/* Top nav glass bar */}
      <div className="mx-auto mt-6 flex max-w-6xl items-center justify-between px-4">
        <GlassSurface width="100%" height={48} borderRadius={28} backgroundOpacity={0.08} className="px-4" contentClassName="items-center justify-between">
          <div className="flex w-full items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <ShinyBrand leftSizeClass="text-base" rightSizeClass="text-sm" speed={2.5} />
            </div>
            <nav className="flex items-center gap-4">
              <a className="opacity-90 hover:opacity-100" href="/dashboard">Home</a>
              <a className="opacity-90 hover:opacity-100" href="#">Docs</a>
            </nav>
          </div>
        </GlassSurface>
      </div>

      {/* Hero */}
      <section className="relative z-10 mx-auto mt-24 flex max-w-6xl flex-col items-center px-4 text-center">
        {/* Top toggle pill to mirror reference layout */}
        <GlassSurface width={280} height={52} borderRadius={28} backgroundOpacity={0.12} className="mb-6 px-2">
          <div className="relative h-full w-full">
            <div
              className="pointer-events-none absolute inset-1 rounded-full bg-white/25 backdrop-blur-md saturate-150 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35),0_8px_24px_rgba(255,255,255,0.12)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ width: 'calc(50% - 0px)', transform: tab === 'waitlist' ? 'translateX(0%)' : 'translateX(100%)' }}
            />
            <div className="relative z-10 grid h-full w-full grid-cols-2 items-center text-sm">
              <button onClick={() => setTab('waitlist')} className="px-4 py-1 rounded-full text-white/90">Waitlist</button>
              <button onClick={() => setTab('manifesto')} className="px-4 py-1 rounded-full text-white/90">Manifesto</button>
            </div>
          </div>
        </GlassSurface>

        {/* Content Cards - keep outer glass static; animate inner content within each card */}
        <div className="w-full max-w-3xl">
          {tab === 'waitlist' ? <WaitlistCard /> : <ManifestoCard />}
        </div>
      </section>
    </main>
  )
}
