"use client"

import type React from "react"
import { useMemo, useEffect } from "react"
import WorkflowCanvas from "@/components/glassmorphic-workflow-canvas"
import { cn } from "@/lib/utils"

export default function Page() {
  // Ensure full-page dotted background extends behind the sidebar and to page edges
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.add("ai-studio-video-editor")
      document.body.classList.add("ai-studio-video-editor")
    }
    return () => {
      if (typeof document !== "undefined") {
        document.documentElement.classList.remove("ai-studio-video-editor")
        document.body.classList.remove("ai-studio-video-editor")
      }
    }
  }, [])
  const bgStyle = useMemo(
    () => ({
      background:
        "radial-gradient(1200px 800px at 70% 10%, rgba(0,0,0,0.04), transparent 45%), radial-gradient(1000px 600px at 20% 80%, rgba(0,0,0,0.045), transparent 50%), #fafafa",
    }),
    [],
  )

  // Dots are now provided by global fixed overlay in globals.css

  return (
    <main className="relative min-h-screen w-full overflow-hidden">
      <section
        className={cn(
          "relative z-[1] m-2 h-[calc(100vh-16px)] rounded-[28px] border",
          "border-black/5 bg-white/70 shadow-[0_20px_60px_rgba(0,0,0,0.08)] backdrop-blur-xl",
        )}
        style={bgStyle as React.CSSProperties}
      >
        <div className="absolute inset-0 rounded-[28px]">
          <WorkflowCanvas className="h-full w-full" />
        </div>
      </section>
    </main>
  )
}



