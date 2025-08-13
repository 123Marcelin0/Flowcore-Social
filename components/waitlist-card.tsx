"use client"

import React from "react"
import GlassSurface from "@/components/ui/glass-surface"
import ShinyText from "@/components/ui/shiny-text"
import ShinyBrand from "@/components/ui/shiny-brand"

export default function WaitlistCard() {
  const [email, setEmail] = React.useState("")
  const [name, setName] = React.useState("")
  const [company, setCompany] = React.useState("")
  const [role, setRole] = React.useState("")
  const [challenge, setChallenge] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [success, setSuccess] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [mode, setMode] = React.useState<'cta' | 'form' | 'done'>('cta')

  React.useEffect(() => {
    if (mode === 'done') {
      const timer = setTimeout(() => {
        setSuccess(null)
        setMode('cta')
      }, 2500)
      return () => clearTimeout(timer)
    }
  }, [mode])

  const isValidEmail = (value: string) => /.+@.+\..+/.test(value)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (mode === 'form' && email && !isValidEmail(email)) {
      setError("Bitte eine gültige E‑Mail eingeben")
      return
    }
    setIsLoading(true)
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, company, role, challenge }),
      })
      if (!res.ok) throw new Error("Request failed")
      setSuccess("Danke! Wir melden uns in Kürze.")
      setMode('done')
    } catch {
      setError("Etwas ist schief gelaufen. Bitte später erneut versuchen.")
    } finally {
      setIsLoading(false)
    }
  }

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
        <div className="w-full h-full flex flex-col">
          <div className={`text-center ${mode === 'cta' ? 'mb-8' : 'mb-4'}`}>
            <div className="mt-[-36px]">
              <ShinyBrand className="mx-auto" speed={2.5} variant="plain" />
            </div>
            {mode === 'cta' && (
              <>
                <h2 className="modern-title mt-10 text-[26px] sm:text-4xl font-semibold tracking-tight leading-tight text-white/95 animate-[fadeIn_.45s_ease-out_.04s_both]">
                  Social Media – einfach wie nie zuvor
                </h2>
                <p className="mt-3 text-sm sm:text-base text-white/85 max-w-2xl mx-auto animate-[fadeIn_.45s_ease-out_.1s_both]">
                  Planen, erstellen und optimieren Sie Ihre gesamte Social‑Media‑Präsenz mit beispielloser Präzision. Unsere KI entfesselt Ihre Kreativität, steuert Ihre Strategie und kümmert sich um Ihre Community – damit Sie wachsen können.
                </p>
              </>
            )}
          </div>
          <div className="flex-1" />
          {mode === 'cta' && (
            <form onSubmit={(e)=>{e.preventDefault(); setMode('form')}} className="mt-auto mx-auto flex w-full max-w-3xl items-center rounded-full bg-white/10 border border-white/20 p-1.5 mb-2 overflow-hidden">
              <button
                type="submit"
                aria-label="anfragen"
                className="relative w-full rounded-full px-8 py-3 bg-white text-black text-sm font-semibold hover:shadow-lg active:scale-95 transition inline-flex items-center justify-center"
              >
                <span>Exklusiven Frühzugang sichern</span>
              </button>
            </form>
          )}

          {mode === 'form' && (
            <form onSubmit={handleSubmit} className="mt-2 mx-auto w-full max-w-3xl rounded-3xl bg-white/10 border border-white/20 p-4 focus-within:ring-2 focus-within:ring-white/40 mb-2 overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="text" value={name} onChange={(e)=>setName(e.target.value)} placeholder="Name" className="rounded-xl bg-transparent px-4 py-3 placeholder-white/60 border border-white/20 focus:outline-none text-sm animate-[fadeIn_.45s_ease-out_.02s_both]" />
                <input type="text" value={company} onChange={(e)=>setCompany(e.target.value)} placeholder="Unternehmen" className="rounded-xl bg-transparent px-4 py-3 placeholder-white/60 border border-white/20 focus:outline-none text-sm animate-[fadeIn_.45s_ease-out_.08s_both]" />
                <input type="text" value={role} onChange={(e)=>setRole(e.target.value)} placeholder="Rolle" className="rounded-xl bg-transparent px-4 py-3 placeholder-white/60 border border-white/20 focus:outline-none text-sm animate-[fadeIn_.45s_ease-out_.14s_both]" />
                <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Ihre geschäftliche E‑Mail (optional)" className="rounded-xl bg-transparent px-4 py-3 placeholder-white/60 border border-white/20 focus:outline-none text-sm animate-[fadeIn_.45s_ease-out_.2s_both]" />
              </div>
              <textarea value={challenge} onChange={(e)=>setChallenge(e.target.value)} placeholder="Größte Social‑Media‑Herausforderung" className="mt-3 w-full rounded-xl bg-transparent px-4 py-3 placeholder-white/60 border border-white/20 focus:outline-none text-sm animate-[fadeIn_.45s_ease-out_.26s_both]" rows={3} />
              <div className="mt-3 flex items-center justify-between animate-[fadeIn_.45s_ease-out_.32s_both]">
                <button type="button" onClick={()=>setMode('cta')} className="text-white/70 text-xs hover:text-white">abbrechen</button>
                <button type="submit" disabled={isLoading} className="rounded-full px-6 py-2 bg-white text-black text-sm font-semibold hover:shadow-lg active:scale-95 transition">senden</button>
              </div>
            </form>
          )}

          {mode === 'done' && (
            <div className="mt-auto mx-auto w-full max-w-3xl rounded-full bg-emerald-400/20 border border-emerald-300/30 p-3 text-center text-emerald-200 text-sm mb-2">
              Danke! Wir melden uns in Kürze.
            </div>
          )}

          {success && (
            <div className="mt-5 text-center text-sm text-emerald-300">{success}</div>
          )}
          {error && (
            <div className="mt-5 text-center text-sm text-red-300">{error}</div>
          )}
        </div>
      </GlassSurface>
    </div>
  )
}



