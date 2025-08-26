"use client"

import React, { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { Play, Pause, Scissors, Volume2, VolumeX, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TranscriptSegment {
  id: string
  text: string
  startTime: number
  endTime: number
  speaker?: string
  confidence?: number
}

interface TranscriptEditorProps {
  segments: TranscriptSegment[]
  currentTime: number
  isPlaying: boolean
  onSeek: (time: number) => void
  onPlay: () => void
  onPause: () => void
  onSegmentEdit: (id: string, newText: string) => void
  onSegmentSplit: (id: string, splitTime: number) => void
  onSegmentRemove: (id: string) => void
  className?: string
}

export function TranscriptEditor({
  segments,
  currentTime,
  isPlaying,
  onSeek,
  onPlay,
  onPause,
  onSegmentEdit,
  onSegmentSplit,
  onSegmentRemove,
  className = ""
}: TranscriptEditorProps) {
  const [editingSegment, setEditingSegment] = useState<string | null>(null)
  const [editText, setEditText] = useState("")
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const activeSegmentRef = useRef<HTMLDivElement>(null)

  // Find the currently active segment
  const activeSegmentId = segments.find(
    segment => currentTime >= segment.startTime && currentTime <= segment.endTime
  )?.id

  // Auto-scroll to active segment
  useEffect(() => {
    if (activeSegmentRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current
      const activeElement = activeSegmentRef.current
      const containerRect = container.getBoundingClientRect()
      const elementRect = activeElement.getBoundingClientRect()
      
      if (elementRect.top < containerRect.top || elementRect.bottom > containerRect.bottom) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [activeSegmentId])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 100)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
  }

  const handleSegmentClick = (segment: TranscriptSegment) => {
    onSeek(segment.startTime)
  }

  const handleEditStart = (segment: TranscriptSegment) => {
    setEditingSegment(segment.id)
    setEditText(segment.text)
  }

  const handleEditSave = () => {
    if (editingSegment) {
      onSegmentEdit(editingSegment, editText)
      setEditingSegment(null)
      setEditText("")
    }
  }

  const handleEditCancel = () => {
    setEditingSegment(null)
    setEditText("")
  }

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-normal text-white/90">Transcript Editor</h2>
          <div className="text-sm text-white/60">
            {segments.length} segments
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={isPlaying ? onPause : onPlay}
            className="w-8 h-8 p-0 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 text-white/90" />
            ) : (
              <Play className="w-4 h-4 text-white/90" />
            )}
          </Button>
        </div>
      </div>

      {/* Transcript Content */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-track-white/5 scrollbar-thumb-white/20"
      >
        {segments.length === 0 ? (
          <div className="flex items-center justify-center h-full text-white/60">
            <div className="text-center">
              <p className="text-lg mb-2">No transcript available</p>
              <p className="text-sm">Upload a video with audio to generate transcript</p>
            </div>
          </div>
        ) : (
          segments.map((segment) => {
            const isActive = segment.id === activeSegmentId
            const isEditing = editingSegment === segment.id
            
            return (
              <motion.div
                key={segment.id}
                ref={isActive ? activeSegmentRef : undefined}
                className={`group relative rounded-lg border transition-all duration-200 ${
                  isActive 
                    ? 'border-red-500/50 bg-red-500/10' 
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="p-3">
                  {/* Timestamp and controls */}
                  <div className="flex items-center justify-between mb-2">
                    <button
                      onClick={() => handleSegmentClick(segment)}
                      className="text-xs text-white/60 hover:text-white/90 font-mono transition-colors"
                    >
                      {formatTime(segment.startTime)} → {formatTime(segment.endTime)}
                    </button>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditStart(segment)}
                        className="w-6 h-6 p-0 rounded hover:bg-white/20"
                      >
                        <MoreHorizontal className="w-3 h-3 text-white/70" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onSegmentSplit(segment.id, currentTime)}
                        className="w-6 h-6 p-0 rounded hover:bg-white/20"
                        disabled={currentTime < segment.startTime || currentTime > segment.endTime}
                      >
                        <Scissors className="w-3 h-3 text-white/70" />
                      </Button>
                    </div>
                  </div>

                  {/* Text content */}
                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full p-2 rounded bg-white/10 border border-white/20 text-white/90 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500/50"
                        rows={3}
                        autoFocus
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={handleEditSave}
                          className="h-7 px-3 text-xs bg-red-600 hover:bg-red-700"
                        >
                          Save
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleEditCancel}
                          className="h-7 px-3 text-xs hover:bg-white/20"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => handleSegmentClick(segment)}
                      className="cursor-pointer"
                    >
                      <p className="text-white/90 text-sm leading-relaxed">
                        {segment.text.split(' ').map((word, wordIndex) => {
                          // Highlight current word based on playback position
                          const wordStartTime = segment.startTime + (wordIndex / segment.text.split(' ').length) * (segment.endTime - segment.startTime)
                          const wordEndTime = segment.startTime + ((wordIndex + 1) / segment.text.split(' ').length) * (segment.endTime - segment.startTime)
                          const isCurrentWord = currentTime >= wordStartTime && currentTime < wordEndTime && isActive
                          
                          return (
                            <span
                              key={wordIndex}
                              className={`transition-colors duration-100 ${
                                isCurrentWord ? 'bg-red-500/30 text-white' : ''
                              }`}
                            >
                              {word}{' '}
                            </span>
                          )
                        })}
                      </p>
                      {segment.speaker && (
                        <div className="mt-1 text-xs text-white/50">
                          Speaker: {segment.speaker}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })
        )}
      </div>
    </div>
  )
}