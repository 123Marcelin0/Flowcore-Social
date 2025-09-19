"use client"

import React from "react"
import { Input } from "@/components/ui/input"
import { Filter, Image as ImageIcon, Search, X } from "lucide-react"

export function ProjectVideoPanel({
  visible,
  onClose,
  searchQuery,
  onSearchChange,
  filterKind,
  onToggleFilter,
  filteredMedia
}: {
  visible: boolean
  onClose: () => void
  searchQuery: string
  onSearchChange: (v: string) => void
  filterKind: "all" | "photo" | "video"
  onToggleFilter: () => void
  filteredMedia: any[]
}) {
  if (!visible) return null
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div
        className="relative w-full h-full max-w-4xl max-h-[90vh] rounded-[20px] text-white/90 border border-white/[0.04] overflow-hidden flex flex-col"
        style={{ background: 'radial-gradient(circle at 30% 30%, #3a3a3a 0%, #2a2a2a 25%, #1a1a1a 70%, #0a0a0a 100%)', boxShadow: 'inset 3px 3px 6px rgba(255,255,255,0.06), inset -3px -3px 6px rgba(0,0,0,0.4), 0 20px 40px rgba(0,0,0,0.5)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="text-2xl font-normal text-white/90">Projekt Video</div>
          <button
            className="relative w-10 h-10 rounded-full border border-white/20 flex items-center justify-center overflow-hidden hover:bg-white/10 transition-colors"
            style={{ background: 'rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(8px)' }}
            onClick={onClose}
          >
            <X className="w-5 h-5 text-white/85" strokeWidth={1.2} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" strokeWidth={1.5} />
                <Input value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} placeholder="Search media" className="pl-9 h-10 rounded-[10px] border-white/30 text-white placeholder:text-white/60 bg-transparent" />
              </div>
              <button onClick={onToggleFilter} className="h-10 w-10 rounded-[10px] hover:bg-white/5 border border-white/30 flex items-center justify-center text-white/90" title="Filter" aria-label="Filter">
                <Filter className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {filteredMedia.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-white/70 text-lg mb-2">No media found</div>
                <div className="text-white/50 text-sm">Upload videos and images to get started</div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredMedia.map((item, index) => (
                  <div key={index} className="aspect-video rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                    <div className="w-full h-full flex items-center justify-center text-white/60">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


