"use client"

import type React from "react"
import { cn } from "@/lib/utils"

export function GlassBar({
  className,
  children,
  "aria-label": ariaLabel,
}: {
  className?: string
  children: React.ReactNode
  "aria-label"?: string
}) {
  return (
    <div aria-label={ariaLabel} className={cn("liquid-glass px-2 py-1 flex items-center gap-1", className)}>
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
        "liquid-btn text-sm px-3 py-2 flex items-center gap-2 text-zinc-700 hover:text-zinc-900",
        tint === "violet" && "liquid-btn--tint-violet text-violet-800 hover:text-violet-900",
        tint === "emerald" && "liquid-btn--tint-emerald text-emerald-800 hover:text-emerald-900",
        className,
      )}
    >
      {children}
    </button>
  )
}

export function GlassSep() {
  return <div className="liquid-sep" aria-hidden="true" />
}
