"use client"

import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Command } from "lucide-react"

interface CommandPaletteProps {
  open: boolean
  query: string
  onQueryChange: (q: string) => void
  onClose: () => void
  onRun: (item: string) => void
}

const DEFAULT_COMMANDS = [
  'Add Image Node',
  'Add Video Node',
  'Add Caption Node',
  'Add Emoji Node',
  'Add Action Node',
  'Add Output Node',
  'Auto Arrange',
  'Align to Grid',
  'Toggle Snap',
  'Preview',
  'Export',
]

export function CommandPalette({ open, query, onQueryChange, onClose, onRun }: CommandPaletteProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200010] flex items-start justify-center pt-24" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full max-w-xl mx-auto rounded-2xl border border-white/50 bg-white/80 backdrop-blur p-3 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-xl border border-white/40 bg-white/70">
              <Command className="w-4 h-4 text-slate-600" />
              <input
                autoFocus
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="Add node, run action…"
                className="flex-1 bg-transparent outline-none text-slate-900 placeholder:text-slate-500"
              />
            </div>
            <div className="mt-2 max-h-64 overflow-auto">
              {DEFAULT_COMMANDS.filter((i) => i.toLowerCase().includes(query.toLowerCase())).map((item) => (
                <button
                  key={item}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/70"
                  onClick={() => {
                    onRun(item)
                    onClose()
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}






