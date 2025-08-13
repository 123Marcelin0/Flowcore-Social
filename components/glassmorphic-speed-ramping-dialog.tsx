"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { X, Play, RotateCcw, Zap } from "lucide-react"

export type SpeedPoint = {
  time: number // 0-100 (percentage of video duration)
  speed: number // 0.1-3.0 (speed multiplier)
}

export type SpeedPreset = {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  points: SpeedPoint[]
}

const SPEED_PRESETS: SpeedPreset[] = [
  {
    id: "normal",
    name: "Normal Speed",
    description: "Constant 1x playback speed",
    icon: <Play className="h-4 w-4" />,
    points: [
      { time: 0, speed: 1.0 },
      { time: 100, speed: 1.0 },
    ],
  },
  {
    id: "cinematic-slow",
    name: "Cinematic Slow Mo",
    description: "Dramatic slow motion effect",
    icon: <Zap className="h-4 w-4" />,
    points: [
      { time: 0, speed: 1.0 },
      { time: 20, speed: 0.3 },
      { time: 80, speed: 0.3 },
      { time: 100, speed: 1.0 },
    ],
  },
  {
    id: "speed-ramp",
    name: "Speed Ramp",
    description: "Accelerate then decelerate",
    icon: <RotateCcw className="h-4 w-4" />,
    points: [
      { time: 0, speed: 0.5 },
      { time: 25, speed: 2.0 },
      { time: 75, speed: 2.0 },
      { time: 100, speed: 0.5 },
    ],
  },
  {
    id: "freeze-frame",
    name: "Freeze Frame",
    description: "Pause in the middle",
    icon: <X className="h-4 w-4" />,
    points: [
      { time: 0, speed: 1.0 },
      { time: 45, speed: 1.0 },
      { time: 50, speed: 0.1 },
      { time: 55, speed: 1.0 },
      { time: 100, speed: 1.0 },
    ],
  },
]

interface SpeedRampingDialogProps {
  isOpen: boolean
  onClose: () => void
  mediaItem?: {
    id: string
    label: string
    kind: "photo" | "video"
  }
  onApply?: (points: SpeedPoint[]) => void
}

export default function SpeedRampingDialog({ isOpen, onClose, mediaItem, onApply }: SpeedRampingDialogProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>("normal")
  const [customPoints, setCustomPoints] = useState<SpeedPoint[]>(SPEED_PRESETS[0].points)
  const [isDragging, setIsDragging] = useState<number | null>(null)
  const graphRef = useRef<HTMLDivElement>(null)

  // Update custom points when preset changes
  useEffect(() => {
    const preset = SPEED_PRESETS.find((p) => p.id === selectedPreset)
    if (preset) {
      setCustomPoints([...preset.points])
    }
  }, [selectedPreset])

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging === null || !graphRef.current) return

      const rect = graphRef.current.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = 3.0 - ((e.clientY - rect.top) / rect.height) * 2.9

      setCustomPoints((prev) => {
        const newPoints = [...prev]
        newPoints[isDragging] = {
          time: Math.max(0, Math.min(100, x)),
          speed: Math.max(0.1, Math.min(3.0, y)),
        }
        return newPoints.sort((a, b) => a.time - b.time)
      })
      setSelectedPreset("custom")
    },
    [isDragging],
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(null)
  }, [])

  useEffect(() => {
    if (isDragging !== null) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      return () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  const handlePresetSelect = (presetId: string) => {
    setSelectedPreset(presetId)
  }

  const handleGraphClick = (e: React.MouseEvent) => {
    if (!graphRef.current || isDragging !== null) return

    const rect = graphRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = 3.0 - ((e.clientY - rect.top) / rect.height) * 2.9

    const newPoint: SpeedPoint = {
      time: Math.max(0, Math.min(100, x)),
      speed: Math.max(0.1, Math.min(3.0, y)),
    }

    // Insert point in correct time order
    const newPoints = [...customPoints, newPoint].sort((a, b) => a.time - b.time)
    setCustomPoints(newPoints)
    setSelectedPreset("custom")
  }

  const handleApply = () => {
    onApply?.(customPoints)
    onClose()
  }

  const generatePath = (points: SpeedPoint[]) => {
    if (points.length === 0) return ""

    const graphWidth = 100
    const graphHeight = 100

    let path = `M ${points[0].time} ${graphHeight - ((points[0].speed - 0.1) / 2.9) * graphHeight}`

    for (let i = 1; i < points.length; i++) {
      const point = points[i]
      const x = point.time
      const y = graphHeight - ((point.speed - 0.1) / 2.9) * graphHeight
      path += ` L ${x} ${y}`
    }

    return path
  }

  if (!isOpen || !mediaItem) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-[95vw] h-[85vh] border-white/25 bg-white/10 text-white/95 backdrop-blur-2xl top-[55%] left-[50%] -translate-x-1/2 -translate-y-1/2 overflow-y-auto">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-purple-400" />
            Speed Ramping - {mediaItem.label}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Presets */}
          <div>
            <h3 className="mb-2 text-sm font-medium text-white/90">Quick Presets</h3>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              {SPEED_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetSelect(preset.id)}
                  className={cn(
                    "rounded-lg border p-2.5 text-left transition-all text-sm",
                    selectedPreset === preset.id
                      ? "border-purple-400/50 bg-purple-500/20"
                      : "border-white/20 bg-white/5 hover:bg-white/10",
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {preset.icon}
                    <span className="font-medium">{preset.name}</span>
                  </div>
                  <p className="text-xs text-white/70 leading-tight">{preset.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Speed Graph */}
          <div className="flex-1">
            <h3 className="mb-2 text-sm font-medium text-white/90">Speed Curve</h3>
            <div className="rounded-lg border border-white/20 bg-white/5 p-3">
              <div className="relative">
                {/* Graph container */}
                <div
                  ref={graphRef}
                  className="relative h-40 w-full cursor-crosshair rounded-md border border-white/20 bg-black/20"
                  onClick={handleGraphClick}
                >
                  {/* ... existing SVG code ... */}
                  <svg className="absolute inset-0 h-full w-full">
                    {/* Horizontal grid lines */}
                    {[0.5, 1.0, 1.5, 2.0, 2.5].map((speed) => (
                      <line
                        key={speed}
                        x1="0"
                        x2="100%"
                        y1={`${100 - ((speed - 0.1) / 2.9) * 100}%`}
                        y2={`${100 - ((speed - 0.1) / 2.9) * 100}%`}
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="1"
                      />
                    ))}
                    {/* Vertical grid lines */}
                    {[25, 50, 75].map((time) => (
                      <line
                        key={time}
                        x1={`${time}%`}
                        x2={`${time}%`}
                        y1="0"
                        y2="100%"
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="1"
                      />
                    ))}

                    {/* Speed curve */}
                    <path
                      d={generatePath(customPoints)}
                      fill="none"
                      stroke="rgb(168, 85, 247)"
                      strokeWidth="2"
                      vectorEffect="non-scaling-stroke"
                    />

                    {/* Control points */}
                    {customPoints.map((point, index) => (
                      <circle
                        key={index}
                        cx={`${point.time}%`}
                        cy={`${100 - ((point.speed - 0.1) / 2.9) * 100}%`}
                        r="4"
                        fill="rgb(168, 85, 247)"
                        stroke="white"
                        strokeWidth="2"
                        className="cursor-move"
                        onMouseDown={(e) => {
                          setIsDragging(index)
                          e.preventDefault()
                          e.stopPropagation()
                        }}
                      />
                    ))}
                  </svg>
                </div>

                {/* Labels */}
                <div className="mt-2 flex justify-between text-xs text-white/60">
                  <span>0%</span>
                  <span>25%</span>
                  <span>50%</span>
                  <span>75%</span>
                  <span>100%</span>
                </div>
                <div className="absolute -left-6 top-0 flex h-40 flex-col justify-between text-xs text-white/60">
                  <span>3.0x</span>
                  <span>2.0x</span>
                  <span>1.0x</span>
                  <span>0.5x</span>
                  <span>0.1x</span>
                </div>
              </div>

              <p className="mt-2 text-xs text-white/60">
                Click to add control points. Drag points to adjust speed curve.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm text-white/90 hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-700 transition-colors"
            >
              Apply Speed Ramping
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
