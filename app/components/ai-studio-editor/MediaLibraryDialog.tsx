"use client"

import React from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"

export interface MediaFileLike {
  id?: string
  filename?: string
  original_filename?: string
  file_type?: string
  storage_url?: string
  thumbnail_url?: string
}

interface MediaLibraryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  files: MediaFileLike[]
  filterToSelected?: boolean
  selectedIds?: Set<string>
}

export function MediaLibraryDialog({
  open,
  onOpenChange,
  files,
  filterToSelected = false,
  selectedIds = new Set<string>()
}: MediaLibraryDialogProps) {
  const visibleFiles = React.useMemo(() => {
    return filterToSelected
      ? files.filter((f) => selectedIds.has((f.id || f.filename) as string))
      : files
  }, [files, filterToSelected, selectedIds])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideCloseButton className="z-[200400] p-0 bg-transparent border-none shadow-none data-[state=open]:zoom-in-95">
        <div className="fixed top-20 left-6 w-[440px] max-h-[85vh] rounded-3xl border border-white/60 bg-white/80 supports-[backdrop-filter]:bg-white/60 backdrop-blur-3xl shadow-[0_50px_150px_rgba(0,0,0,0.35)] overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between bg-gradient-to-br from-white/70 via-white/50 to-white/30 border-b border-white/60">
            <div className="text-sm font-semibold text-slate-800">Media Library</div>
            <button
              className="px-3 py-1.5 text-xs rounded-xl border border-white/50 bg-white/70 hover:bg-white/90 text-slate-700"
              onClick={() => onOpenChange(false)}
            >
              Close
            </button>
          </div>
          <div className="p-6 grid grid-cols-2 gap-4 overflow-auto" style={{ maxHeight: 'calc(85vh - 80px)' }}>
            {visibleFiles.length === 0 && (
              <div className="col-span-2 text-center text-xs text-slate-500">No media yet</div>
            )}
            {visibleFiles.map((file) => (
              <div key={file.id || file.filename} className="rounded-2xl overflow-hidden border border-white/60 bg-white/80">
                {file.file_type === 'video' ? (
                  <video src={file.storage_url} className="w-full h-32 object-cover" muted />
                ) : (
                  <img src={file.thumbnail_url || file.storage_url} className="w-full h-32 object-cover" />
                )}
                <div className="px-3 py-2 bg-white/90 text-[11px] text-slate-700 truncate">{file.original_filename || file.filename}</div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}






