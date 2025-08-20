"use client"

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { GlassBar, GlassButton, GlassSep } from "@/components/glass"
import {
  Link2,
  ZoomOut,
  ZoomIn,
  RotateCcw,
  Play,
  ImageIcon,
  VideoIcon,
} from "lucide-react"
import GlassSurface from "@/components/ui/glass-surface"

export type NodeData = {
  id: string
  label: string
  x: number
  y: number
  tint: "violet" | "sky" | "emerald" | "rose"
  mediaType?: "photo" | "video"
  thumb?: string
  src?: string
}

export type EdgeData = {
  id: string
  source: string
  target: string
}

type Point = { x: number; y: number }
type Transform = { x: number; y: number; k: number }

const NODE_WIDTH = 180
const NODE_HEIGHT = 80
const GRID_GAP_X = 80
const GRID_GAP_Y = 120

// Mock media data
const MOCK_MEDIA = [
  { id: "1", kind: "photo" as const, src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop", label: "Mountain View" },
  { id: "2", kind: "video" as const, src: "/api/placeholder/video", poster: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=400&h=300&fit=crop", label: "Ocean Waves" },
  { id: "3", kind: "photo" as const, src: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop", label: "Forest Path" },
  { id: "4", kind: "video" as const, src: "/api/placeholder/video", poster: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop", label: "City Lights" },
  { id: "5", kind: "photo" as const, src: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=300&fit=crop", label: "Desert Sunset" },
  { id: "6", kind: "video" as const, src: "/api/placeholder/video", poster: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop", label: "River Flow" },
  { id: "7", kind: "photo" as const, src: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=400&h=300&fit=crop", label: "Beach Scene" },
  { id: "8", kind: "video" as const, src: "/api/placeholder/video", poster: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=300&fit=crop", label: "Snow Fall" },
]

// Ultra-fast size hook with minimal overhead
function useCanvasSize() {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const rafRef = useRef<number>()

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const updateSize = () => {
      const rect = el.getBoundingClientRect()
      setSize({ width: rect.width, height: rect.height })
    }

    const scheduleUpdate = () => {
      if (rafRef.current) return
      rafRef.current = requestAnimationFrame(() => {
        updateSize()
        rafRef.current = undefined
      })
    }

    const ro = new ResizeObserver(scheduleUpdate)
    ro.observe(el)
    updateSize()

    return () => {
      ro.disconnect()
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return { ref, size }
}

// Ultra-lightweight node component with minimal re-renders
const FastNode = memo(({ 
  node, 
  screenX, 
  screenY, 
  isSelected, 
  isDragging,
  onMouseDown,
  onClick 
}: {
  node: NodeData
  screenX: number
  screenY: number
  isSelected: boolean
  isDragging: boolean
  onMouseDown: (e: React.MouseEvent) => void
  onClick: (e: React.MouseEvent) => void
}) => {
  const tintColors = {
    violet: "from-violet-400/90 to-purple-500/90 border-violet-300/60",
    sky: "from-sky-400/90 to-blue-500/90 border-sky-300/60",
    emerald: "from-emerald-400/90 to-green-500/90 border-emerald-300/60",
    rose: "from-rose-400/90 to-pink-500/90 border-rose-300/60"
  }

  return (
    <div
      className={cn(
        "absolute cursor-move select-none transition-none",
        isSelected && "ring-2 ring-blue-400/80 ring-offset-1 ring-offset-transparent",
        isDragging && "z-50 scale-105 shadow-2xl"
      )}
      style={{
        left: screenX - NODE_WIDTH / 2,
        top: screenY - NODE_HEIGHT / 2,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        transform: "translateZ(0)",
        willChange: isDragging ? "transform" : "auto"
      }}
      onMouseDown={onMouseDown}
      onClick={onClick}
    >
      <div className={cn(
        "w-full h-full rounded-xl backdrop-blur-sm border shadow-lg",
        "bg-gradient-to-br", tintColors[node.tint],
        "hover:shadow-xl transition-shadow duration-100"
      )}>
        <div className="flex items-center h-full px-3 gap-3">
          {/* Media Preview */}
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-black/20 flex-shrink-0">
            {node.thumb ? (
              <img 
                src={node.thumb} 
                alt={node.label}
                className="w-full h-full object-cover"
                draggable={false}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                {node.mediaType === "video" ? (
                  <VideoIcon className="w-5 h-5 text-white/80" />
                ) : (
                  <ImageIcon className="w-5 h-5 text-white/80" />
                )}
              </div>
            )}
          </div>
          
          {/* Label */}
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium text-sm truncate">
              {node.label}
            </p>
            <p className="text-white/70 text-xs">
              {node.mediaType === "video" ? "Video" : "Photo"}
            </p>
          </div>
        </div>
      </div>

      {/* Connection Handles */}
      <div className="absolute left-0 top-1/2 w-2 h-2 -ml-1 -mt-1 rounded-full bg-white/90 border border-gray-300 hover:scale-125 transition-transform duration-75" />
      <div className="absolute right-0 top-1/2 w-2 h-2 -mr-1 -mt-1 rounded-full bg-white/90 border border-gray-300 hover:scale-125 transition-transform duration-75" />
    </div>
  )
})

FastNode.displayName = "FastNode"

// Simple cubic bezier path for connections
function createPath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = x2 - x1
  const cp1x = x1 + dx * 0.5
  const cp2x = x2 - dx * 0.5
  return `M ${x1} ${y1} C ${cp1x} ${y1} ${cp2x} ${y2} ${x2} ${y2}`
}

export default function UltraFastWorkflowCanvas({ className }: { className?: string }) {
  const { ref: canvasRef, size: canvasSize } = useCanvasSize()

  // Initialize nodes in a grid
  const initialNodes = useMemo<NodeData[]>(() => {
    const items = MOCK_MEDIA.slice(0, 8)
    const cols = 4
    const nodes: NodeData[] = []

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const r = Math.floor(i / cols)
      const c = i % cols
      const rowItems = Math.min(cols, items.length - r * cols)
      const rowWidth = rowItems * NODE_WIDTH + (rowItems - 1) * GRID_GAP_X
      const startX = -rowWidth / 2 + NODE_WIDTH / 2
      const x = startX + c * (NODE_WIDTH + GRID_GAP_X)
      const y = (r - 1) * GRID_GAP_Y

      const tint: NodeData["tint"] = 
        item.kind === "photo" 
          ? (["emerald", "violet", "rose", "sky"][i % 4] as any)
          : (["sky", "violet", "emerald", "rose"][i % 4] as any)

      nodes.push({
        id: item.id,
        label: item.label,
        x,
        y,
        tint,
        mediaType: item.kind,
        thumb: item.kind === "photo" ? item.src : item.poster,
        src: item.kind === "video" ? item.src : undefined,
      })
    }
    return nodes
  }, [])

  const [nodes, setNodes] = useState<NodeData[]>(initialNodes)
  const [edges, setEdges] = useState<EdgeData[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, k: 1 })

  // Drag state - using refs for maximum performance
  const dragState = useRef<{
    isDragging: boolean
    draggedNodes: string[]
    startPos: Point
    initialPositions: Record<string, Point>
    lastMousePos: Point
  }>({
    isDragging: false,
    draggedNodes: [],
    startPos: { x: 0, y: 0 },
    initialPositions: {},
    lastMousePos: { x: 0, y: 0 }
  })

  const [isDragging, setIsDragging] = useState(false)
  
  // Add dragging class to body for performance optimizations
  useEffect(() => {
    if (isDragging) {
      document.body.classList.add('dragging')
    } else {
      document.body.classList.remove('dragging')
    }
    
    return () => {
      document.body.classList.remove('dragging')
    }
  }, [isDragging])
  const isPanning = useRef(false)
  const spacePressed = useRef(false)

  // Ultra-fast coordinate transformation
  const toWorld = useCallback((clientX: number, clientY: number): Point => {
    const el = canvasRef.current
    if (!el) return { x: clientX, y: clientY }
    
    const rect = el.getBoundingClientRect()
    const cx = canvasSize.width / 2
    const cy = canvasSize.height / 2
    
    return {
      x: (clientX - rect.left - cx - transform.x) / transform.k,
      y: (clientY - rect.top - cy - transform.y) / transform.k,
    }
  }, [canvasSize, transform])

  const toScreen = useCallback((worldX: number, worldY: number): Point => {
    const cx = canvasSize.width / 2
    const cy = canvasSize.height / 2
    return {
      x: worldX * transform.k + cx + transform.x,
      y: worldY * transform.k + cy + transform.y
    }
  }, [canvasSize, transform])

  // Ultra-responsive drag start
  const startDrag = useCallback((nodeId: string, e: React.MouseEvent) => {
    if (spacePressed.current) return

    e.preventDefault()
    e.stopPropagation()

    const isSelected = selected.has(nodeId)
    const draggedNodes = isSelected ? Array.from(selected) : [nodeId]
    
    if (!isSelected) {
      setSelected(new Set([nodeId]))
    }

    const world = toWorld(e.clientX, e.clientY)
    const initialPositions: Record<string, Point> = {}
    
    draggedNodes.forEach(id => {
      const node = nodes.find(n => n.id === id)
      if (node) {
        initialPositions[id] = { x: node.x, y: node.y }
      }
    })

    dragState.current = {
      isDragging: true,
      draggedNodes,
      startPos: world,
      initialPositions,
      lastMousePos: { x: e.clientX, y: e.clientY }
    }

    setIsDragging(true)
  }, [selected, toWorld, nodes])

  // Ultra-fast mouse move handler
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (dragState.current.isDragging) {
      const world = toWorld(e.clientX, e.clientY)
      const dx = world.x - dragState.current.startPos.x
      const dy = world.y - dragState.current.startPos.y

      // Direct state update for instant response
      setNodes(prev => prev.map(node => {
        if (dragState.current.draggedNodes.includes(node.id)) {
          const initial = dragState.current.initialPositions[node.id]
          return {
            ...node,
            x: initial.x + dx,
            y: initial.y + dy
          }
        }
        return node
      }))
    } else if (isPanning.current) {
      const dx = e.clientX - dragState.current.lastMousePos.x
      const dy = e.clientY - dragState.current.lastMousePos.y
      
      setTransform(t => ({
        ...t,
        x: t.x + dx,
        y: t.y + dy
      }))
    }

    dragState.current.lastMousePos = { x: e.clientX, y: e.clientY }
  }, [toWorld])

  // Mouse up handler
  const handleMouseUp = useCallback(() => {
    dragState.current.isDragging = false
    isPanning.current = false
    setIsDragging(false)
  }, [])

  // Global mouse event listeners
  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        spacePressed.current = true
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spacePressed.current = false
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // Background interaction
  const handleBackgroundMouseDown = useCallback((e: React.MouseEvent) => {
    if (spacePressed.current) {
      isPanning.current = true
      dragState.current.lastMousePos = { x: e.clientX, y: e.clientY }
    } else {
      setSelected(new Set())
    }
  }, [])

  // Node click handler
  const handleNodeClick = useCallback((nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (e.shiftKey) {
      setSelected(prev => {
        const next = new Set(prev)
        if (next.has(nodeId)) {
          next.delete(nodeId)
        } else {
          next.add(nodeId)
        }
        return next
      })
    } else {
      setSelected(new Set([nodeId]))
    }
  }, [])

  // Zoom handlers
  const zoomIn = useCallback(() => {
    setTransform(t => ({ ...t, k: Math.min(2.5, t.k * 1.2) }))
  }, [])

  const zoomOut = useCallback(() => {
    setTransform(t => ({ ...t, k: Math.max(0.25, t.k / 1.2) }))
  }, [])

  const resetView = useCallback(() => {
    setTransform({ x: 0, y: 0, k: 1 })
  }, [])

  // Wheel zoom
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const delta = e.deltaY > 0 ? 0.9 : 1.1
        setTransform(t => ({ ...t, k: Math.max(0.25, Math.min(2.5, t.k * delta)) }))
      }
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [])

  // Memoized screen positions for all nodes
  const nodeScreenPositions = useMemo(() => {
    const positions: Record<string, Point> = {}
    nodes.forEach(node => {
      const screen = toScreen(node.x, node.y)
      positions[node.id] = screen
    })
    return positions
  }, [nodes, toScreen])

  // Memoized edge paths
  const edgePaths = useMemo(() => {
    return edges.map(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source)
      const targetNode = nodes.find(n => n.id === edge.target)
      
      if (!sourceNode || !targetNode) return null
      
      const sourceScreen = nodeScreenPositions[edge.source]
      const targetScreen = nodeScreenPositions[edge.target]
      
      return {
        id: edge.id,
        path: createPath(
          sourceScreen.x + NODE_WIDTH / 2,
          sourceScreen.y,
          targetScreen.x - NODE_WIDTH / 2,
          targetScreen.y
        )
      }
    }).filter(Boolean)
  }, [edges, nodes, nodeScreenPositions])

  const hasCanvasSize = canvasSize.width > 0 && canvasSize.height > 0

  return (
    <div 
      ref={canvasRef}
      className={cn("relative overflow-hidden bg-transparent select-none", className)}
      onMouseDown={handleBackgroundMouseDown}
      style={{ 
        cursor: spacePressed.current ? "grab" : "default",
        contain: "layout paint style"
      }}
    >
      {/* Toolbar */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
        <GlassSurface 
          width="auto" 
          height={48} 
          borderRadius={24} 
          backgroundOpacity={0.1}
          className="px-4"
        >
          <div className="flex items-center gap-2">
            <GlassButton onClick={zoomIn} className="w-8 h-8">
              <ZoomIn className="w-4 h-4" />
            </GlassButton>
            
            <GlassButton onClick={zoomOut} className="w-8 h-8">
              <ZoomOut className="w-4 h-4" />
            </GlassButton>
            
            <GlassSep />
            
            <GlassButton onClick={resetView} className="w-8 h-8">
              <RotateCcw className="w-4 h-4" />
            </GlassButton>
            
            <span className="text-white/70 text-sm px-2">
              {Math.round(transform.k * 100)}%
            </span>
          </div>
        </GlassSurface>
      </div>

      {/* Nodes */}
      {hasCanvasSize && nodes.map(node => {
        const screenPos = nodeScreenPositions[node.id]
        const isSelected = selected.has(node.id)
        const isNodeDragging = isDragging && dragState.current.draggedNodes.includes(node.id)
        
        return (
          <FastNode
            key={node.id}
            node={node}
            screenX={screenPos.x}
            screenY={screenPos.y}
            isSelected={isSelected}
            isDragging={isNodeDragging}
            onMouseDown={(e) => startDrag(node.id, e)}
            onClick={(e) => handleNodeClick(node.id, e)}
          />
        )
      })}

      {/* Edges */}
      {hasCanvasSize && edgePaths.length > 0 && (
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ 
            width: canvasSize.width,
            height: canvasSize.height,
            overflow: "visible"
          }}
        >
          {edgePaths.map(edge => edge && (
            <path
              key={edge.id}
              d={edge.path}
              stroke="rgba(156, 163, 175, 0.6)"
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
            />
          ))}
        </svg>
      )}
    </div>
  )
}