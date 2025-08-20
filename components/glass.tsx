"use client"

import type React from "react"
import { cn } from "@/lib/utils"

export function GlassBar({
  className,
  children,
  "aria-label": ariaLabel,
  style,
}: {
  className?: string
  children: React.ReactNode
  "aria-label"?: string
  style?: React.CSSProperties
}) {
  return (
    <div aria-label={ariaLabel} className={cn("liquid-glass-base liquid-glass-premium liquid-glass-reflection px-4 py-3 flex items-center gap-2 rounded-2xl", className)} style={style}>
      {children}
    </div>
  )
}

export function GlassButton({
  children,
  className,
  onClick,
  type = "button",
  tint,
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  type?: "button" | "submit"
  tint?: "violet" | "emerald" | "none"
  "aria-label"?: string
}) {
  return (
    <button
      aria-label={ariaLabel}
      type={type}
      onClick={onClick}
      className={cn(
        "text-sm px-4 py-2.5 flex items-center gap-2 rounded-full font-medium transition-all duration-300 hover:scale-105",
        "backdrop-blur-[30px] backdrop-saturate-[200%] border border-white/40",
        "bg-gradient-to-r from-white/[0.15] via-white/[0.08] to-white/[0.04]",
        "hover:from-white/[0.2] hover:via-white/[0.12] hover:to-white/[0.08]",
        "hover:border-white/50 hover:shadow-[0_4px_16px_rgba(255,255,255,0.15)]",
        "text-white/90 hover:text-white",
        "shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)]",
        tint === "violet" && "bg-violet-500/20 hover:bg-violet-500/30 border-violet-400/30 text-violet-100",
        tint === "emerald" && "bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-400/30 text-emerald-100",
        className,
      )}
    >
      {children}
    </button>
  )
}

export function GlassSep() {
  return <div className="w-px h-6 bg-white/40 rounded-full mx-2" aria-hidden="true" />
}
