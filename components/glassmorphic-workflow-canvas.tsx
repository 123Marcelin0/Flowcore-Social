"use client"

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { distance, cubicPath, lerpPoint, type Point } from "@/lib/glassmorphic-geometry"
import { GlassBar, GlassButton, GlassSep } from "@/components/glass"
import GlassSurface from "@/components/ui/glass-surface"
import {
  Link2,
  AlignCenter,
  Magnet,
  Undo2,
  Redo2,
  ZoomOut,
  ZoomIn,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Play,
  UploadCloud,
  Zap,
  Trash2,
  ImageIcon,
  VideoIcon,
  GalleryHorizontalEnd,
  Network,
  PanelsTopLeft,
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import AudioPopup from "@/components/audio-popup"
import MediaPopup from "@/components/glassmorphic-media-popup"
import MediaBoard, { type MediaBoardItem } from "@/components/glassmorphic-media-board"
import { MOCK_MEDIA } from "@/lib/glassmorphic-mock-media"
import FilmStripEditor from "@/components/glassmorphic-film-strip-editor"
import VideoEditPopup from "@/components/glassmorphic-video-edit-popup"
import TemplatesDialog, { type PickerMedia, type TemplateAssignments } from "@/components/glassmorphic-templates-dialog"

export type NodeData = {
  id: string
  label: string
  x: number
  y: number
  tint: "violet" | "sky" | "emerald" | "rose"
  groupId?: string
  mediaType?: "photo" | "video"
  thumb?: string
  src?: string
  trimStart?: number
  trimEnd?: number
}

export type EdgeData = {
  id: string
  source: string
  target: string
  transformed?: boolean
  transformName?: string
  sweep?: boolean
  birthWhite?: boolean
  dying?: boolean
}

export type HandleSide = "left" | "right"
export type PreviewPayload = { kind: 'photo' | 'video'; src?: string; poster?: string; label?: string }
type TempConnection = {
  from: { nodeId: string; side: HandleSide; anchor: Point }
  to: Point
  snappedTo?: { nodeId: string; side: HandleSide; anchor: Point }
} | null
type Transform = { x: number; y: number; k: number }

const SNAP_RADIUS = 42
const EDGE_PAD = 4000
const AUTOCONNECT_RADIUS = 72
// Smaller node width reduces paint area and memory bandwidth for previews
const NODE_WIDTH = 180
const GRID_GAP_X = 80
const GRID_GAP_Y = 120

type ViewMode = "workflow" | "library"

type WorkflowContextType = {
  snapEnabled: boolean
  setSnapEnabled: (v: boolean) => void
  zoomIn: () => void
  zoomOut: () => void
  resetView: () => void
  zoom: number
  groupSelection: () => void
  ungroupSelection: () => void
  undo: () => void
  redo: () => void
  connectMode: boolean
  toggleConnectMode: () => void
}
const WorkflowContext = React.createContext<WorkflowContextType | null>(null)
export function useWorkflow() {
  const ctx = React.useContext(WorkflowContext)
  if (!ctx) throw new Error("useWorkflow must be used within <WorkflowCanvas>")
  return ctx
}

// Safer size hook
function useElementSize<T extends HTMLElement>() {
  const ref = React.useRef<T | null>(null)
  const [size, setSize] = React.useState({ width: 0, height: 0 })
  const latest = React.useRef(size)
  const frame = React.useRef<number | null>(null)
  const queued = React.useRef(false)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return

    const commit = () => {
      queued.current = false
      const next = latest.current
      setSize((prev) => (prev.width === next.width && prev.height === next.height ? prev : next))
    }

    const scheduleCommit = () => {
      if (queued.current) return
      queued.current = true
      frame.current = requestAnimationFrame(() => {
        frame.current = requestAnimationFrame(commit)
      })
    }

    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect
      if (!cr) return
      latest.current = { width: Math.round(cr.width), height: Math.round(cr.height) }
      scheduleCommit()
    })

    try {
      ro.observe(el, { box: "border-box" })
    } catch {
      ro.observe(el)
    }

    const rect = el.getBoundingClientRect()
    latest.current = { width: Math.round(rect.width), height: Math.round(rect.height) }
    scheduleCommit()

    return () => {
      if (frame.current != null) cancelAnimationFrame(frame.current)
      ro.disconnect()
    }
  }, [])

  return { ref, size }
}

export default function WorkflowCanvas({ className }: { className?: string }) {
  const { ref: canvasRef, size: canvasSize } = useElementSize<HTMLDivElement>()
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  // Seed nodes
  const seededNodes = useMemo<NodeData[]>(() => {
    const items = MOCK_MEDIA.slice(0, 8)
    const cols = 4
    const nodes: NodeData[] = []
    const colW = NODE_WIDTH
    const gapX = GRID_GAP_X
    const gapY = GRID_GAP_Y
    const rowCount = Math.ceil(items.length / cols)

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const r = Math.floor(i / cols)
      const c = i % cols
      const rowItems = Math.min(cols, items.length - r * cols)
      const rowWidth = rowItems * colW + (rowItems - 1) * gapX
      const startX = -rowWidth / 2 + colW / 2
      const x = startX + c * (colW + gapX)
      const y = (r - (rowCount - 1) / 2) * GRID_GAP_Y

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
        thumb: item.kind === "photo" ? item.src : item.poster || "/placeholder.svg?height=400&width=600",
        src: item.kind === "video" ? item.src : undefined,
      })
    }
    return nodes
  }, [])

  const [nodes, setNodes] = useState<NodeData[]>(seededNodes)
  const [edges, setEdges] = useState<EdgeData[]>([])
  const [activePreview, setActivePreview] = useState<PreviewPayload | null>(null)

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [snapEnabled, setSnapEnabled] = useState(true)
  const [audioOpen, setAudioOpen] = useState(false)
  const [mediaOpen, setMediaOpen] = useState(false)
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [view, setView] = useState<ViewMode>("workflow")
  const [resetOpen, setResetOpen] = useState(false)

  // Video editing
  const [editing, setEditing] = useState<{
    nodeId: string
    src: string
    poster?: string
    label: string
    start: number
    end: number
    duration?: number
  } | null>(null)
  const [scrubTime, setScrubTime] = useState<number | null>(null)
  const [barWidth, setBarWidth] = useState<number | null>(null)

  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, k: 1 })
  const spacePressed = useRef(false)

  // Perf mode while interacting
  const [interacting, setInteracting] = useState(false)
  const endInteractTimer = useRef<number | null>(null)
  const beginInteract = () => {
    if (!interacting) setInteracting(true)
    if (endInteractTimer.current) {
      clearTimeout(endInteractTimer.current)
      endInteractTimer.current = null
    }
  }
  const endInteractSoon = () => {
    if (endInteractTimer.current) clearTimeout(endInteractTimer.current)
    endInteractTimer.current = window.setTimeout(() => setInteracting(false), 120)
  }

  // Panning/dragging
  const isPanning = useRef(false)
  const panStart = useRef<Point | null>(null)
  const panFrame = useRef<number | null>(null)
  const applyPan = useRef<{ dx: number; dy: number } | null>(null)

  // DRAG SYSTEM - Core drag state management
  const dragInfo = useRef<{
    type: "node"
    nodeIds: string[]
    startWorld: Point
    initialPositions: Record<string, Point>
  } | null>(null)
  const dragFrame = useRef<number | null>(null)
  const applyDrag = useRef<{ dx: number; dy: number } | null>(null)

  const [tempConn, setTempConn] = useState<TempConnection>(null)
  const tempConnRef = useRef<TempConnection>(null)
  useEffect(() => {
    tempConnRef.current = tempConn
  }, [tempConn])

  const [connectMode, setConnectMode] = useState(false)
  const connectFrom = useRef<string | null>(null)

  const history = useRef<{ nodes: NodeData[]; edges: EdgeData[] }[]>([])
  const future = useRef<typeof history.current>([])
  const commitHistory = () => {
    history.current.push({ nodes: structuredClone(nodes), edges: structuredClone(edges) })
    future.current = []
  }

  // COORDINATE TRANSFORMATION SYSTEM
  const toWorld = useCallback(
    (client: Point): Point => {
      const el = canvasRef.current
      if (!el) return client
      const rect = el.getBoundingClientRect()
      const cx = canvasSize.width / 2
      const cy = canvasSize.height / 2
      return {
        x: (client.x - rect.left - cx - transform.x) / transform.k,
        y: (client.y - rect.top - cy - transform.y) / transform.k,
      }
    },
    [canvasRef, canvasSize, transform],
  )

  const toScreen = useCallback(
    (p: Point): Point => {
      const cx = canvasSize.width / 2
      const cy = canvasSize.height / 2
      return { x: p.x * transform.k + cx + transform.x, y: p.y * transform.k + cy + transform.y }
    },
    [canvasSize, transform],
  )

  const toOverlay = useCallback((p: Point): Point => ({ x: p.x + EDGE_PAD, y: p.y + EDGE_PAD }), [])

  const nodeById = useCallback((id: string) => nodes.find((n) => n.id === id)!, [nodes])

  const handleAnchor = useCallback(
    (nodeId: string, side: HandleSide): Point => {
      const n = nodeById(nodeId)
      const w = NODE_WIDTH
      return { x: n.x + (side === "right" ? w / 2 + 12 : -w / 2 - 12), y: n.y }
    },
    [nodeById],
  )

  // Zoom with ctrl/⌘ + wheel
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        beginInteract()
        const nextK = Math.max(0.25, Math.min(2.5, transform.k * (e.deltaY < 0 ? 1.06 : 0.94)))
        const rect = el.getBoundingClientRect()
        const pointer = { x: e.clientX, y: e.clientY }
        const worldBefore = toWorld(pointer)
        setTransform((t) => ({ ...t, k: nextK }))
        const cx = canvasSize.width / 2
        const cy = canvasSize.height / 2
        const screenAfter = { x: worldBefore.x * nextK + cx + transform.x, y: worldBefore.y * nextK + cy + transform.y }
        const dx = pointer.x - rect.left - screenAfter.x
        const dy = pointer.y - rect.top - screenAfter.y
        setTransform((t) => ({ x: t.x + dx, y: t.y + dy, k: nextK }))
        endInteractSoon()
      }
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [canvasRef, canvasSize, toWorld, transform.k, transform.x, transform.y])

  // Global keys
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") spacePressed.current = true
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        if (e.shiftKey) redo()
        else undo()
      }
      if (e.key === "Escape") {
        setConnectMode(false)
        connectFrom.current = null
        setTempConn(null)
        setSelectedEdgeId(null)
        if (editing) setEditing(null)
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault()
        deleteSelection()
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") spacePressed.current = false
    }
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
    }
  }, [selected, selectedEdgeId, edges, nodes, editing])

  // BACKGROUND INTERACTION HANDLERS
  const onBackgroundPointerDown = (e: React.PointerEvent) => {
    if (editing) {
      e.preventDefault()
      return
    }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    if (spacePressed.current || e.button === 1) {
      isPanning.current = true
      panStart.current = { x: e.clientX, y: e.clientY }
      beginInteract()
      return
    }
    setSelected(new Set())
    setSelectedEdgeId(null)
  }

  const onBackgroundPointerMove = (e: React.PointerEvent) => {
    if (isPanning.current && panStart.current) {
      const dx = e.clientX - panStart.current.x
      const dy = e.clientY - panStart.current.y
      panStart.current = { x: e.clientX, y: e.clientY }
      applyPan.current = { dx, dy }
      if (panFrame.current == null) {
        panFrame.current = requestAnimationFrame(() => {
          const d = applyPan.current
          if (d) setTransform((t) => ({ ...t, x: t.x + d.dx, y: t.y + d.dy }))
          panFrame.current = null
        })
      }
    }
  }

  const onBackgroundPointerUp = (e: React.PointerEvent) => {
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    isPanning.current = false
    panStart.current = null
    if (tempConn) setTempConn(null)
    endInteractSoon()
  }

  // MAIN POINTER MOVE HANDLER - Handles both node dragging and connection drawing
  const onPointerMove = (e: React.PointerEvent) => {
    // NODE DRAGGING LOGIC (throttled via rAF for ultra‑smooth motion)
    if (dragInfo.current?.type === "node") {
      const info = dragInfo.current
      const world = toWorld({ x: e.clientX, y: e.clientY })
      const dx = world.x - info.startWorld.x
      const dy = world.y - info.startWorld.y

      // Defer applying the drag to the next animation frame to avoid
      // flooding React with state updates on every pointer event.
      applyDrag.current = { dx, dy }
      if (dragFrame.current == null) {
        dragFrame.current = requestAnimationFrame(() => {
          const d = applyDrag.current
          const active = dragInfo.current
          if (d && active) {
            setNodes((prev) =>
              prev.map((n) =>
                active.nodeIds.includes(n.id)
                  ? { ...n, x: active.initialPositions[n.id].x + d.dx, y: active.initialPositions[n.id].y + d.dy }
                  : n,
              ),
            )
          }
          dragFrame.current = null
        })
      }
    }

    // CONNECTION DRAWING LOGIC
    if (tempConn) {
      const world = toWorld({ x: e.clientX, y: e.clientY })
      let snapped: NonNullable<TempConnection>["snappedTo"] | undefined
      let best: { nodeId: string; side: HandleSide; anchor: Point; d: number } | null = null

      // Find closest handle for snapping
      for (const n of nodes) {
        if (n.id === tempConn.from.nodeId) continue
        const left = { nodeId: n.id, side: "left" as HandleSide, anchor: handleAnchor(n.id, "left") }
        const right = { nodeId: n.id, side: "right" as HandleSide, anchor: handleAnchor(n.id, "right") }
        for (const h of [left, right]) {
          const d = distance(world, h.anchor)
          if (!best || d < best.d) best = { ...h, d }
        }
      }
      if (best && best.d <= SNAP_RADIUS) snapped = { nodeId: best.nodeId, side: best.side, anchor: best.anchor }
      // Follow pointer exactly for a direct feel
      setTempConn({ ...tempConn, to: world, snappedTo: snapped })
    }
  }

  // NODE DRAG START HANDLER
  const startDragNode = (id: string, e: React.PointerEvent) => {
    if (spacePressed.current || connectMode || editing) return

    const isSelected = selected.has(id)
    const activeIds = isSelected ? Array.from(selected) : [id]

    // Save state for undo
    commitHistory()
    setSelected(new Set(activeIds))
    setSelectedEdgeId(null)

    const world = toWorld({ x: e.clientX, y: e.clientY })
    const initialPositions: Record<string, Point> = {}

    // Store initial positions of all nodes being dragged
    for (const nid of activeIds) {
      const n = nodeById(nid)
      initialPositions[nid] = { x: n.x, y: n.y }
    }

    dragInfo.current = { type: "node", nodeIds: activeIds, startWorld: world, initialPositions }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    beginInteract()
  }

  const finalizeEdge = (from: string, to: string) => {
    if (from === to) return
    if (edges.some((e) => e.source === from && e.target === to)) return
    commitHistory()
    const id = `e-${from}-${to}-${Date.now()}`
    setEdges((prev) => [...prev, { id, source: from, target: to, transformed: true, sweep: true, birthWhite: true }])
    setTimeout(() => {
      setEdges((prev) => prev.map((e) => (e.id === id ? { ...e, birthWhite: false } : e)))
    }, 1300)
  }

  // POINTER UP HANDLER - Finalizes drag operations
  const onPointerUp = () => {
    if (dragInfo.current) {
      const moved = dragInfo.current.nodeIds
      dragInfo.current = null
      if (dragFrame.current != null) {
        cancelAnimationFrame(dragFrame.current)
        dragFrame.current = null
      }
      // Auto-connect nearby nodes after drag
      autoConnectAround(moved)
      endInteractSoon()
      return
    }
    if (tempConn) {
      if (tempConn.snappedTo) finalizeEdge(tempConn.from.nodeId, tempConn.snappedTo.nodeId)
      setTempConn(null)
    }
  }

  // Hold handle to detach edges or drag to connect
  const holdTimer = useRef<number | null>(null)
  const handleHold = useRef<{
    nodeId: string
    side: HandleSide
    start: { x: number; y: number }
    startedConnect: boolean
    detachFired: boolean
  } | null>(null)

  const detachEdges = (nodeId: string, side: HandleSide) => {
    const matches = edges.filter((e) => (side === "right" ? e.source === nodeId : e.target === nodeId))
    if (!matches.length) return
    commitHistory()
    const ids = new Set(matches.map((m) => m.id))
    setEdges((prev) => prev.map((e) => (ids.has(e.id) ? { ...e, dying: true } : e)))
    setTimeout(() => {
      setEdges((prev) => prev.filter((e) => !ids.has(e.id)))
    }, 520)
  }

  const onHandlePointerDown = (nodeId: string, side: HandleSide) => (e: React.PointerEvent) => {
    e.stopPropagation()
    const start = { x: e.clientX, y: e.clientY }
    handleHold.current = { nodeId, side, start, startedConnect: false, detachFired: false }
    holdTimer.current = window.setTimeout(() => {
      if (!handleHold.current) return
      detachEdges(nodeId, side)
      handleHold.current.detachFired = true
    }, 500)

    const onMove = (ev: PointerEvent) => {
      if (!handleHold.current) return
      const dx = ev.clientX - handleHold.current.start.x
      if (!handleHold.current.startedConnect && !handleHold.current.detachFired && Math.hypot(dx) > 5) {
        if (holdTimer.current) {
          clearTimeout(holdTimer.current)
          holdTimer.current = null
        }
        handleHold.current.startedConnect = true
        const anchor = handleAnchor(nodeId, side)
        setTempConn({ from: { nodeId, side, anchor }, to: anchor })
      }
    }
    const onUp = () => {
      if (holdTimer.current) {
        clearTimeout(holdTimer.current)
        holdTimer.current = null
      }
      if (handleHold.current?.startedConnect) {
        const tc = tempConnRef.current
        if (tc?.snappedTo) finalizeEdge(tc.from.nodeId, tc.snappedTo.nodeId)
        setTempConn(null)
      }
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      handleHold.current = null
    }

    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp, { once: true })
  }

  const onNodeClickForConnect = (nodeId: string) => {
    if (!connectMode) return
    if (!connectFrom.current) {
      connectFrom.current = nodeId
      const anchor = handleAnchor(nodeId, "right")
      setTempConn({ from: { nodeId, side: "right", anchor }, to: anchor })
    } else if (connectFrom.current && connectFrom.current !== nodeId) {
      finalizeEdge(connectFrom.current, nodeId)
      setTempConn(null)
      connectFrom.current = null
      // Keep connect mode enabled until the user turns it off manually
    }
  }

  const topBarRef = React.useRef<HTMLDivElement | null>(null)
  function lockBarWidth() {
    const wrap = topBarRef.current
    if (!wrap) return
    const bar = (wrap.querySelector(".liquid-glass") as HTMLElement) || wrap.firstElementChild
    if (!bar) return
    const rect = (bar as HTMLElement).getBoundingClientRect()
    setBarWidth(Math.round(rect.width))
  }
  function clearBarWidth() {
    setBarWidth(null)
  }

  const startVideoEdit = (node: NodeData) => {
    if (!node.src) return
    setConnectMode(false)
    setSelectedEdgeId(null)
    lockBarWidth()
    const s = Math.max(0, node.trimStart ?? 0)
    const e = Math.max(s + 0.1, node.trimEnd ?? Number.POSITIVE_INFINITY)
    setEditing({
      nodeId: node.id,
      src: node.src,
      poster: node.thumb,
      label: node.label,
      start: s,
      end: Number.isFinite(e) ? e : s + 5,
    })
  }

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedEdgeId(null)
    setSelected((prev) => {
      const next = new Set(prev)
      if (e.shiftKey) next.has(id) ? next.delete(id) : next.add(id)
      else {
        next.clear()
        next.add(id)
      }
      return next
    })
  }

  const zoomIn = () => setTransform((t) => ({ ...t, k: Math.min(2.5, t.k * 1.1) }))
  const zoomOut = () => setTransform((t) => ({ ...t, k: Math.max(0.25, t.k / 1.1) }))
  const resetView = () => setTransform({ x: 0, y: 0, k: 1 })

  const hardReset = () => {
    setNodes([])
    setEdges([])
    setSelected(new Set())
    setSelectedEdgeId(null)
    setEditing(null)
    setTempConn(null)
    connectFrom.current = null
    setConnectMode(false)
    resetView()
    history.current = []
    future.current = []
  }

  const addNode = () => {
    commitHistory()
    const pool = MOCK_MEDIA
    const item = pool[Math.floor(Math.random() * pool.length)]
    const x = (Math.random() - 0.5) * 480
    const y = 120 + (Math.random() - 0.5) * 240
    const tint: NodeData["tint"] =
      item.kind === "photo" ? (["emerald", "violet", "rose", "sky"][Math.floor(Math.random() * 4)] as any) : "sky"
    const id = `n-${item.id}-${Date.now()}`
    const node: NodeData = {
      id,
      label: item.label,
      x,
      y,
      tint,
      mediaType: item.kind,
      thumb: item.kind === "photo" ? item.src : item.poster || "/placeholder.svg?height=400&width=600",
      src: item.kind === "video" ? item.src : undefined,
    }
    setNodes((prev) => [...prev, node])
    setSelected(new Set([node.id]))
    setSelectedEdgeId(null)
    queueMicrotask(() => autoConnectAround([node.id]))
  }

  const alignAllGrid = () => {
    if (!nodes.length) return
    commitHistory()
    const maxWidth = Math.max(360, canvasSize.width - 240)
    const colW = NODE_WIDTH
    const gapX = GRID_GAP_X
    const cols = Math.max(1, Math.floor((maxWidth + gapX) / (colW + gapX)))
    const total = nodes.length
    const rows = Math.ceil(total / cols)

    const newPositions: Record<string, Point> = {}
    for (let r = 0; r < rows; r++) {
      const startIdx = r * cols
      const rowCount = Math.min(cols, total - startIdx)
      const rowWidth = rowCount * colW + (rowCount - 1) * gapX
      const startX = -rowWidth / 2 + colW / 2
      const y = (r - (rows - 1) / 2) * GRID_GAP_Y

      for (let i = 0; i < rowCount; i++) {
        const node = nodes[startIdx + i]
        const x = startX + i * (colW + gapX)
        newPositions[node.id] = { x, y }
      }
    }
    setNodes((prev) => prev.map((n) => ({ ...n, ...newPositions[n.id] })))
  }

  const groupSelection = () => {
    if (selected.size < 2) return
    commitHistory()
    const gid = `g-${Date.now()}`
    setNodes((prev) => prev.map((n) => (selected.has(n.id) ? { ...n, groupId: gid } : n)))
  }
  const ungroupSelection = () => {
    if (!selected.size) return
    commitHistory()
    setNodes((prev) => prev.map((n) => (selected.has(n.id) ? { ...n, groupId: undefined } : n)))
  }
  const undo = () => {
    const last = history.current.pop()
    if (!last) return
    future.current.push({ nodes: structuredClone(nodes), edges: structuredClone(edges) })
    setNodes(last.nodes)
    setEdges(last.edges)
  }
  const redo = () => {
    const next = future.current.pop()
    if (!next) return
    history.current.push({ nodes: structuredClone(nodes), edges: structuredClone(edges) })
    setNodes(next.nodes)
    setEdges(next.edges)
  }

  const deleteSelection = () => {
    if (!selected.size && !selectedEdgeId) return
    commitHistory()
    if (selectedEdgeId) {
      setEdges((prev) => prev.filter((e) => e.id !== selectedEdgeId))
      setSelectedEdgeId(null)
    }
    if (selected.size) {
      const toDelete = new Set(selected)
      setNodes((prev) => prev.filter((n) => !toDelete.has(n.id)))
      setEdges((prev) => prev.filter((e) => !toDelete.has(e.source) && !toDelete.has(e.target)))
      setSelected(new Set())
    }
  }

  const applyEdgeTransform = (edgeId: string, name: string) => {
    setEdges((prev) =>
      prev.map((e) => (e.id === edgeId ? { ...e, transformed: true, transformName: name, sweep: true } : e)),
    )
    setTimeout(() => {
      setEdges((prev) => prev.map((e) => (e.id === edgeId ? { ...e, sweep: false } : e)))
    }, 1700)
  }

  const edgeExists = useCallback((a: string, b: string) => edges.some((e) => e.source === a && e.target === b), [edges])

  // AUTO-CONNECT SYSTEM - Automatically connects nearby nodes after drag
  const autoConnectAround = (nodeIds: string[]) => {
    if (!snapEnabled || nodeIds.length === 0) return

    type Candidate = { source: string; target: string; d: number }
    const additions: Candidate[] = []

    for (const id of nodeIds) {
      if (!nodes.some((n) => n.id === id)) continue

      const aRight = handleAnchor(id, "right")
      const aLeft = handleAnchor(id, "left")

      let best: Candidate | null = null
      for (const other of nodes) {
        if (other.id === id) continue

        const bLeft = handleAnchor(other.id, "left")
        const bRight = handleAnchor(other.id, "right")

        const c1: Candidate = { source: id, target: other.id, d: distance(aRight, bLeft) }
        const c2: Candidate = { source: other.id, target: id, d: distance(bRight, aLeft) }

        const preferC1 = aRight.x <= bLeft.x
        const candidate = preferC1 ? c1 : c2
        if (candidate.d <= AUTOCONNECT_RADIUS && !edgeExists(candidate.source, candidate.target)) {
          if (!best || candidate.d < best.d) best = candidate
        }
      }
      if (best) additions.push(best)
    }

    if (additions.length === 0) return

    commitHistory()
    const newEdges: EdgeData[] = additions.map((c) => ({
      id: `e-${c.source}-${c.target}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      source: c.source,
      target: c.target,
      birthWhite: true,
    }))

    setEdges((prev) => [...prev, ...newEdges])

    setTimeout(() => {
      setEdges((prev) => prev.map((e) => (newEdges.some((n) => n.id === e.id) ? { ...e, birthWhite: false } : e)))
    }, 1300)
  }

  const ctx: WorkflowContextType = {
    snapEnabled,
    setSnapEnabled,
    zoom: Math.round(transform.k * 100),
    zoomIn,
    zoomOut,
    resetView,
    groupSelection,
    ungroupSelection,
    undo,
    redo,
    connectMode,
    toggleConnectMode: () => {
      setConnectMode((v) => !v)
      connectFrom.current = null
      setTempConn(null)
      setSelectedEdgeId(null)
    },
  }

  const worldTransformStyle = useMemo(
    () =>
      ({
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.k}) translate(-50%, -50%)`,
        transformOrigin: "0 0",
        willChange: "transform",
      }) as React.CSSProperties,
    [transform],
  )

  // Lighter glass parameters during interactions to keep 60fps
  const glassParams = interacting || !!editing
    ? { backgroundOpacity: 0.06, distortionScale: -25, redOffset: 3, greenOffset: 1, blueOffset: -2, displace: 0.35 }
    : { backgroundOpacity: 0.08, distortionScale: -55, redOffset: 6, greenOffset: 2, blueOffset: -4, displace: 0.6 }

  const edgePathOverlay = useCallback(
    (sourceId: string, targetId: string) => {
      const aW = handleAnchor(sourceId, "right")
      const bW = handleAnchor(targetId, "left")
      const a = toOverlay(toScreen(aW))
      const b = toOverlay(toScreen(bW))
      return {
        a,
        b,
        d: cubicPath(a, b),
        midScreen: {
          x: (a.x - EDGE_PAD + b.x - EDGE_PAD) / 2,
          y: (a.y - EDGE_PAD + b.y - EDGE_PAD) / 2,
        },
      }
    },
    [handleAnchor, toScreen, toOverlay],
  )

  const hasCanvasSize = canvasSize.width > 0 && canvasSize.height > 0
  const tempPathOverlay =
    tempConn && hasCanvasSize
      ? cubicPath(toOverlay(toScreen(tempConn.from.anchor)), toOverlay(toScreen(tempConn.to)))
      : null

  // DRAG AND DROP FROM MEDIA PANEL
  const onDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("application/x-media-item")) {
      e.preventDefault()
      e.dataTransfer.dropEffect = "copy"
    }
  }

  const onDrop = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes("application/x-media-item")) return
    e.preventDefault()
    const json = e.dataTransfer.getData("application/x-media-item")
    try {
      const data = JSON.parse(json) as {
        id: string
        kind: "photo" | "video"
        src: string
        label: string
        poster?: string
      }
      commitHistory()
      const world = toWorld({ x: e.clientX, y: e.clientY })
      const tint: NodeData["tint"] = data.kind === "photo" ? "emerald" : "sky"
      const id = `n-media-${Date.now()}`
      const node: NodeData = {
        id,
        label: data.label || (data.kind === "photo" ? "Photo" : "Video"),
        x: world.x,
        y: world.y,
        tint,
        mediaType: data.kind,
        thumb: data.kind === "photo" ? data.src : data.poster || "/placeholder.svg?height=400&width=600",
        src: data.kind === "video" ? data.src : undefined,
      }
      setNodes((prev) => [...prev, node])
      setSelected(new Set([id]))
      setSelectedEdgeId(null)
      window.dispatchEvent(new CustomEvent("media-dropped", { detail: { id: data.id } }))
      queueMicrotask(() => autoConnectAround([id]))
    } catch {}
  }

  // Library items from nodes for MediaBoard
  const mediaItems: MediaBoardItem[] = useMemo(
    () =>
      nodes
        .filter((n) => n.mediaType)
        .map((n) => ({
          id: n.id,
          kind: n.mediaType as "photo" | "video",
          src: n.mediaType === "video" ? n.src || "" : n.thumb || "",
          label: n.label,
          poster: n.mediaType === "video" ? n.thumb : undefined,
        })),
    [nodes],
  )

  // Available media for Templates (MOCK_MEDIA + nodes)
  const templatePickerMedia: PickerMedia[] = useMemo(() => {
    const base: PickerMedia[] = MOCK_MEDIA.map((m) => ({
      id: m.id,
      kind: m.kind,
      src: m.src,
      label: m.label,
      poster: m.poster,
    }))
    const fromNodes: PickerMedia[] = nodes
      .filter((n) => n.mediaType)
      .map((n) => ({
        id: `node-${n.id}`,
        kind: n.mediaType as "photo" | "video",
        src: n.mediaType === "video" ? n.src || "" : n.thumb || "",
        label: n.label,
        poster: n.mediaType === "video" ? n.thumb : undefined,
      }))
    return [...base, ...fromNodes]
  }, [nodes])

  // Pause node previews during interactions
  useEffect(() => {
    if (interacting) {
      const vids = Array.from(document.querySelectorAll<HTMLVideoElement>('[data-node-preview="1"]'))
      vids.forEach((v) => {
        try {
          v.pause()
        } catch {}
      })
    }
  }, [interacting])

  const isLibrary = view === "library"

  // Apply trim to node
  const applyTrim = (nodeId: string, start: number, end: number, _duration?: number) => {
    commitHistory()
    setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, trimStart: start, trimEnd: end } : n)))
    setEditing(null)
    setScrubTime(null)
    clearBarWidth()
  }

  // Apply template result -> create nodes and connect in sequence
  function applyTemplate(result: { template: any; assignments: TemplateAssignments }) {
    commitHistory()
    const createdIds: string[] = []
    const centerY = 0
    const spacing = 240
    const startX = -((Object.keys(result.assignments).length - 1) * spacing) / 2

    let index = 0
    const newNodes: NodeData[] = []
    for (const slot of result.template.slots) {
      const a = result.assignments[slot.id]
      const x = startX + index * spacing
      index++
      if (!a) continue
      if (slot.kind === "text") {
        const id = `text-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
        newNodes.push({
          id,
          label: (a as any).text || slot.label,
          x,
          y: centerY,
          tint: "rose",
        })
        createdIds.push(id)
      } else {
        const m = (a as any).media as PickerMedia
        const id = `tpl-${m.id}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
        newNodes.push({
          id,
          label: m.label,
          x,
          y: centerY,
          tint: slot.kind === "photo" ? "emerald" : "sky",
          mediaType: slot.kind as any,
          thumb: slot.kind === "photo" ? m.src : m.poster || "/placeholder.svg?height=400&width=600",
          src: slot.kind === "video" ? m.src : undefined,
        })
        createdIds.push(id)
      }
    }

    setNodes((prev) => [...prev, ...newNodes])

    // Connect sequentially
    setEdges((prev) => {
      const extra: EdgeData[] = []
      for (let i = 0; i < createdIds.length - 1; i++) {
        const from = createdIds[i]
        const to = createdIds[i + 1]
        extra.push({ id: `e-${from}-${to}-${Date.now()}-${i}`, source: from, target: to, birthWhite: true })
      }
      return [...prev, ...extra]
    })
    setTimeout(() => {
      setEdges((prev) => prev.map((e) => (e.birthWhite ? { ...e, birthWhite: false } : e)))
    }, 1300)

    // Focus workflow
    setView("workflow")
  }

  return (
    <WorkflowContext.Provider value={ctx}>
      <div
        ref={wrapperRef}
        className={cn("relative h-full w-full", className, (interacting || !!editing) && "perf-mode")}
        data-perf={interacting ? "busy" : "idle"}
      >
        <div
          ref={canvasRef}
          className="relative h-full w-full select-none touch-none"
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          {/* Top toolbar */}
          <div className={cn("absolute left-1/2 top-4 -translate-x-1/2", editing ? "z-[200200]" : "z-20", audioOpen && "pointer-events-none opacity-0 transition-opacity duration-200") }>
            <div ref={topBarRef} className="relative">
              <GlassSurface
                width="auto"
                height="auto"
                borderRadius={36}
                backgroundOpacity={glassParams.backgroundOpacity}
                distortionScale={glassParams.distortionScale}
                redOffset={glassParams.redOffset}
                greenOffset={glassParams.greenOffset}
                blueOffset={glassParams.blueOffset}
                displace={glassParams.displace}
                className={cn("px-3 py-2 toolbar-base editor-toolbar relative overflow-hidden", editing && "toolbar-base--morph")}
                style={editing ? ({ width: barWidth ?? undefined } as React.CSSProperties) : undefined}
                contentClassName="flex items-center gap-1"
              >
                {/* remove edge overlay to eliminate double gray layer */}
                {/* removed extra overlay to avoid double layering */}
                {editing ? (
                  <div className="w-full">
                    <FilmStripEditor
                      src={editing.src}
                      poster={editing.poster}
                      label={editing.label}
                      initialStart={editing.start}
                      initialEnd={editing.end}
                      onScrub={(t) => setScrubTime(t)}
                      onRangeChange={({ start, end }) => {
                        setEditing((prev) => (prev && prev.nodeId === editing.nodeId ? { ...prev, start, end } : prev))
                      }}
                      onCancel={() => {
                        setEditing(null)
                        setScrubTime(null)
                        clearBarWidth()
                      }}
                      onApply={({ start, end, duration }) => applyTrim(editing.nodeId, start, end, duration)}
                    />
                  </div>
                ) : (
                  <>
                    {/* Single toggle for Workflow/Library */}
                    <GlassButton
                      aria-label={isLibrary ? "Switch to Workflow" : "Switch to Library"}
                      onClick={() => setView(isLibrary ? "workflow" : "library")}
                      className="mr-1"
                    >
                      {isLibrary ? (
                        <>
                          <Network className="h-4 w-4" />
                          <span className="hidden sm:inline">Workflow</span>
                        </>
                      ) : (
                        <>
                          <GalleryHorizontalEnd className="h-4 w-4" />
                          <span className="hidden sm:inline">Library</span>
                        </>
                      )}
                    </GlassButton>

                    <GlassSep />

                    {/* Templates */}
                    <GlassButton aria-label="Templates" onClick={() => setTemplatesOpen(true)}>
                      <PanelsTopLeft className="h-4 w-4" />
                      <span className="hidden sm:inline">Templates</span>
                    </GlassButton>

                    <GlassSep />

                    {/* Build tools (Add removed) */}

                    <GlassButton
                      aria-label="Connect"
                      onClick={ctx.toggleConnectMode}
                      className={cn(connectMode && "ring-2 ring-violet-300/80")}
                    >
                      <Link2 className={cn("h-4 w-4", connectMode ? "text-violet-700" : "")} />
                      <span className="hidden sm:inline">{connectMode ? "Connecting…" : "Connect"}</span>
                    </GlassButton>

                    <GlassButton aria-label="Align" onClick={alignAllGrid}>
                      <AlignCenter className="h-4 w-4" />
                      <span className="hidden sm:inline">Align</span>
                    </GlassButton>

                    <GlassButton
                      onClick={() => setSnapEnabled(!snapEnabled)}
                      aria-label="Snap"
                      className={cn(snapEnabled && "ring-1 ring-emerald-300/80")}
                    >
                      <Magnet className={cn("h-4 w-4", snapEnabled ? "text-emerald-600" : "text-zinc-500")} />
                      <span className={cn("hidden sm:inline", snapEnabled ? "text-emerald-700" : undefined)}>
                        {snapEnabled ? "Snap" : "Snap off"}
                      </span>
                    </GlassButton>

                    <GlassSep />

                    <GlassButton onClick={undo} aria-label="Undo">
                      <Undo2 className="h-4 w-4" />
                    </GlassButton>
                    <GlassButton onClick={redo} aria-label="Redo">
                      <Redo2 className="h-4 w-4" />
                    </GlassButton>

                    <GlassSep />

                    <GlassButton onClick={zoomOut} aria-label="Zoom out">
                      <ZoomOut className="h-4 w-4" />
                    </GlassButton>
                    <span className="px-2 text-xs text-zinc-500">{Math.round(transform.k * 100)}%</span>
                    <GlassButton onClick={zoomIn} aria-label="Zoom in">
                      <ZoomIn className="h-4 w-4" />
                    </GlassButton>

                    <GlassButton onClick={() => setResetOpen(true)} aria-label="Reset">
                      <RotateCcw className="h-4 w-4" />
                      {/* icon only */}
                    </GlassButton>

                    <GlassSep />

                    <GlassButton
                      aria-label="Media"
                      className="liquid-btn--tint-emerald"
                      onClick={() => setMediaOpen(true)}
                    >
                      <ImageIcon className="h-4 w-4" />
                      <span className="hidden sm:inline">Media</span>
                    </GlassButton>
                    <GlassButton
                      aria-label="Music"
                      className="liquid-btn--tint-violet"
                      onClick={() => setAudioOpen(true)}
                    >
                      <Play className="h-4 w-4" />
                      <span className="hidden sm:inline">Music</span>
                    </GlassButton>
                  </>
                )}
              </GlassSurface>
            </div>
          </div>

          {/* Background handlers */}
          {view !== "library" && (
            <div
              className="absolute inset-0 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              onPointerDown={onBackgroundPointerDown}
              onPointerMove={onBackgroundPointerMove}
              onPointerUp={onBackgroundPointerUp}
            />
          )}

          {/* Reset confirmation dialog */}
          <Dialog open={resetOpen} onOpenChange={setResetOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Remove everything?
                </DialogTitle>
                <DialogDescription>
                  This will delete all cards, connections, and settings from the canvas. This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setResetOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={() => { setResetOpen(false); hardReset(); }}>Delete all</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edges */}
          {view !== "library" && (
            <div
              className="pointer-events-none absolute z-10"
              style={{
                left: -EDGE_PAD,
                top: -EDGE_PAD,
                width: `calc(100% + ${EDGE_PAD * 2}px)`,
                height: `calc(100% + ${EDGE_PAD * 2}px)`,
              }}
            >
              <svg className="absolute inset-0" style={{ overflow: "visible" }} aria-hidden="true">
                {hasCanvasSize && (
                  <g className="edge-soft-shadow">
                    {edges.map((e) => {
                      const { d } = edgePathOverlay(e.source, e.target)
                      return (
                        <g key={e.id}>
                          {/* Outline underlay for visibility on bright backgrounds */}
                          <path d={d} className={cn("edge-outline", e.dying && "edge-fade-out")} pathLength={1} fill="none" strokeWidth={7} stroke="rgba(0,0,0,0.18)" />
                          <path
                            d={d}
                            className={cn("edge-path edge-base-white", e.dying && "edge-fade-out")}
                            pathLength={1}
                            fill="none"
                            strokeWidth={5}
                            stroke="rgba(255,255,255,0.98)"
                          />
                          {e.transformed && (
                            <>
                              <path d={d} className="edge-outline" pathLength={1} fill="none" strokeWidth={7} stroke="rgba(0,0,0,0.18)" />
                              <path
                                d={d}
                                className={cn("edge-base-purple", e.sweep ? "edge-reveal" : "")}
                                pathLength={1}
                                fill="none"
                                strokeWidth={5}
                                stroke="rgba(168,85,247,0.95)"
                              />
                              {e.sweep && (
                                <path d={d} className="edge-sweep" pathLength={1} fill="none" strokeWidth={6} stroke="url(#purpleSweep)" />
                              )}
                              <path d={d} className="edge-glow" fill="none" stroke="rgba(168,85,247,0.42)" />
                            </>
                          )}
                          {e.birthWhite && (
                            <>
                              <path d={d} className="edge-sweep-white-a" pathLength={1} fill="none" strokeWidth={6} stroke="rgba(255,255,255,0.98)" />
                              <path d={d} className="edge-sweep-white-b" pathLength={1} fill="none" strokeWidth={6} stroke="rgba(255,255,255,0.98)" />
                            </>
                          )}
                        </g>
                      )
                    })}
                    {tempPathOverlay && (
                      <path
                        d={tempPathOverlay}
                        className="temp-edge"
                        fill="none"
                        stroke="rgba(168,85,247,0.95)"
                        strokeWidth={4}
                        strokeDasharray="6 6"
                      />
                    )}
                  </g>
                )}
                <defs>
                  <linearGradient id="purpleSweep" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="rgba(168,85,247,1)" />
                    <stop offset="65%" stopColor="rgba(168,85,247,0.4)" />
                    <stop offset="100%" stopColor="rgba(168,85,247,0.0)" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          )}

          {/* Nodes */}
          {view !== "library" && (
            <div
              className="absolute left-1/2 top-1/2"
              style={worldTransformStyle}
            >
              {nodes.map((n) => (
                <MemoNodeView
                  key={n.id}
                  data={n}
                  selected={selected.has(n.id)}
                  onDragStart={startDragNode}
                  onToggleSelect={toggleSelect}
                  onHandlePointerDown={onHandlePointerDown}
                  onConnectClick={onNodeClickForConnect}
                  connectMode={connectMode}
                  interacting={interacting}
                  onStartEditVideo={startVideoEdit}
                  audioOpen={audioOpen}
                  onOpenPreview={setActivePreview}
                />
              ))}
            </div>
          )}

          {/* Temp connection above nodes for visibility while connecting */}
          {view !== "library" && tempPathOverlay && (
            <div
              className="pointer-events-none absolute z-40"
              style={{
                left: -EDGE_PAD,
                top: -EDGE_PAD,
                width: `calc(100% + ${EDGE_PAD * 2}px)`,
                height: `calc(100% + ${EDGE_PAD * 2}px)`,
              }}
            >
              <svg className="absolute inset-0" style={{ overflow: "visible" }} aria-hidden="true">
                <path
                  d={tempPathOverlay}
                  className="temp-edge"
                  fill="none"
                  stroke="rgba(168,85,247,0.95)"
                  strokeWidth={4}
                  strokeDasharray="6 6"
                />
              </svg>
            </div>
          )}

          {/* Edge controls */}
          {view !== "library" &&
            hasCanvasSize &&
            edges.map((e) => {
              if (e.birthWhite || e.dying) return null
              const { midScreen } = edgePathOverlay(e.source, e.target)
              const mid = { x: midScreen.x, y: midScreen.y }
              return (
                <MemoEdgeControl
                  key={`ctrl-${e.id}`}
                  edge={e}
                  mid={mid}
                  selected={selectedEdgeId === e.id}
                  onFocusEdge={() => {
                    setSelected(new Set())
                    setSelectedEdgeId(e.id)
                  }}
                  onDelete={() => {
                    commitHistory()
                    setEdges((prev) => prev.filter((x) => x.id !== e.id))
                    setSelectedEdgeId(null)
                  }}
                  onSelectTransform={(name) => applyEdgeTransform(e.id, name)}
                />
              )
            })}

          {/* Library view */}
          {view === "library" && !audioOpen && (
            <MediaBoard items={mediaItems} />
          )}

          {/* Popups */}
          <AudioPopup isOpen={audioOpen} onClose={() => setAudioOpen(false)} />
          <MediaPopup isOpen={mediaOpen && !audioOpen} onClose={() => setMediaOpen(false)} />

          {/* Node preview lightbox (matches library style) */}
          <Dialog open={!!activePreview} onOpenChange={(v) => !v && setActivePreview(null)}>
            <DialogContent className={cn("max-w-5xl border-white/25 bg-white/10 p-0 text-white/95 backdrop-blur-2xl") }>
              <DialogHeader className="px-4 pb-2 pt-3">
                <DialogTitle className="text-white/95">{activePreview?.label || "Preview"}</DialogTitle>
                <DialogDescription className="text-white/70">
                  {activePreview?.kind === 'photo' ? 'Image' : 'Video'} preview
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-3 p-4 pt-0">
                <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-white/20 bg-black/30">
                  {activePreview?.kind === 'video' ? (
                    <video src={activePreview?.src} controls preload="metadata" poster={activePreview?.poster} className="h-full w-full object-contain" playsInline disablePictureInPicture controlsList="nodownload noplaybackrate" />
                  ) : (
                    <img src={activePreview?.src || activePreview?.poster || '/placeholder.svg?height=720&width=1280'} alt={activePreview?.label || 'Image preview'} className="h-full w-full object-contain" />
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Video edit popup */}
          {editing && (
            <VideoEditPopup
              open={!!editing}
              onOpenChange={(v) => {
                if (!v) {
                  setEditing(null)
                  setScrubTime(null)
                  clearBarWidth()
                }
              }}
              src={editing.src}
              poster={editing.poster}
              label={editing.label}
              start={editing.start}
              end={editing.end}
              scrubTo={scrubTime}
            />
          )}

          {/* Templates dialog */}
          {templatesOpen && (
            <TemplatesDialog
              open={templatesOpen}
              onOpenChange={setTemplatesOpen}
              media={templatePickerMedia}
              onComplete={applyTemplate}
            />
          )}

          {/* Bottom nav */}
          <div className={cn("absolute inset-x-0 bottom-5 z-20 flex justify-center", audioOpen && "opacity-0 pointer-events-none transition-opacity duration-200") }>
            <GlassSurface width="auto" height="auto" borderRadius={36} backgroundOpacity={glassParams.backgroundOpacity} distortionScale={glassParams.distortionScale} redOffset={glassParams.redOffset} greenOffset={glassParams.greenOffset} blueOffset={glassParams.blueOffset} displace={glassParams.displace} className="px-3 py-2 editor-bottombar relative overflow-hidden" contentClassName="flex items-center gap-1" aria-label="Bottom navigation">
              {/* removed extra overlay to avoid double layering */}
              <GlassButton aria-label="Back">
                <ChevronLeft className="h-4 w-4" />
                Back
              </GlassButton>
              <GlassButton aria-label="Preview" className="liquid-btn--tint-violet">
                <Play className="h-4 w-4" />
                Preview
              </GlassButton>
              <GlassButton aria-label="Publish" className="liquid-btn--tint-emerald">
                <UploadCloud className="h-4 w-4" />
                Publish
              </GlassButton>
              <GlassButton aria-label="Next">
                Next
                <ChevronRight className="h-4 w-4" />
              </GlassButton>
            </GlassSurface>
          </div>

          {/* Hint removed per design request */}
        </div>
      </div>
    </WorkflowContext.Provider>
  )
}

// NODE COMPONENT WITH DRAG FUNCTIONALITY
function NodeViewBase({
  data,
  selected,
  onDragStart,
  onToggleSelect,
  onHandlePointerDown,
  onConnectClick,
  connectMode,
  interacting,
  onStartEditVideo,
  audioOpen,
  onOpenPreview,
}: {
  data: NodeData
  selected: boolean
  onDragStart: (id: string, e: React.PointerEvent) => void
  onToggleSelect: (id: string, e: React.MouseEvent) => void
  onHandlePointerDown: (nodeId: string, side: HandleSide) => (e: React.PointerEvent) => void
  onConnectClick: (nodeId: string) => void
  connectMode: boolean
  interacting: boolean
  onStartEditVideo: (node: NodeData) => void
  audioOpen: boolean
  onOpenPreview: (payload: PreviewPayload) => void
}) {
  const pastel =
    data.tint === "violet"
      ? "from-violet-50 to-white"
      : data.tint === "sky"
        ? "from-sky-50 to-white"
        : data.tint === "emerald"
          ? "from-emerald-50 to-white"
          : "from-rose-50 to-white"

  // MAIN DRAG HANDLER - This is where the drag starts
  const onPointerDownNode = (e: React.PointerEvent) => {
    e.preventDefault()
    onDragStart(data.id, e)
  }

  const onDouble = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (data.mediaType === "video") {
      // open preview dialog for video node
      onOpenPreview({ kind: 'video', src: data.src, poster: data.thumb, label: data.label })
    } else {
      onOpenPreview({ kind: 'photo', src: data.src || data.thumb, poster: data.thumb, label: data.label })
    }
  }

  return (
    <div
      className={cn(
        "node node-draggable absolute rounded-2xl p-[1px] will-change-transform",
        selected && "ring-2 ring-violet-300/70",
        connectMode && "ring-1 ring-violet-200/70",
      )}
      style={{ left: 0, top: 0, transform: `translate3d(${data.x}px, ${data.y}px, 0) translate(-50%, -50%)` }}
      onPointerDown={onPointerDownNode}
      onDoubleClick={onDouble}
      onClick={() => onConnectClick(data.id)}
      onDragStart={(e) => e.preventDefault()}
      role="group"
      aria-label={data.label}
    >
      <GlassSurface
        width={200}
        height={290}
        borderRadius={28}
        backgroundOpacity={interacting ? 0.06 : 0.08}
        distortionScale={interacting ? -25 : -55}
        redOffset={interacting ? 3 : 6}
        greenOffset={interacting ? 1 : 2}
        blueOffset={interacting ? -2 : -4}
        displace={interacting ? 0.35 : 0.6}
        className={cn(audioOpen && "opacity-0 pointer-events-none transition-opacity duration-200")}
        contentClassName="relative select-none rounded-[28px] border border-white/45 bg-white/25 shadow-[0_18px_60px_rgba(0,0,0,0.12)] h-full flex flex-col"
      >
        {data.mediaType ? (
          <div className="relative overflow-hidden mx-2 mt-2 rounded-[22px] border border-white/60 bg-white/35 shrink-0" style={{ borderWidth: 0.75 }}>
            <div className="relative aspect-square w-full">
              {data.mediaType === "video" ? (
                <video
                  src={data.src}
                  poster={data.thumb}
                  muted
                  playsInline
                  preload="metadata"
                  className="h-full w-full object-cover"
                  style={{ pointerEvents: "none" }}
                  disablePictureInPicture
                  controlsList="nodownload noplaybackrate"
                  data-node-preview="1"
                  draggable={false}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.thumb || "/placeholder.svg"}
                  alt={data.label}
                  className="h-full w-full object-cover"
                  draggable={false}
                />
              )}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/30" />
              {/* Top-right liquid preview icon */}
              <button
                onClick={(e) => { e.stopPropagation(); onDouble(e) }}
                aria-label="Preview"
                title="Preview"
                className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border border-white/45 bg-white/35 text-white shadow-[0_8px_24px_rgba(0,0,0,0.25)] backdrop-blur-xl hover:bg-white/45"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 8V4h4"/><path d="M20 8V4h-4"/><path d="M4 16v4h4"/><path d="M20 16v4h-4"/>
                </svg>
              </button>
            </div>
          </div>
        ) : null}

        <div className="px-4 pt-3 pb-5 min-h-[80px] flex-1">
          <div className="flex items-center justify-between">
            <div className="text-[11px] uppercase tracking-wide text-white/80">
              {data.mediaType ? (data.mediaType === "photo" ? "Photo" : "Video") : data.groupId ? "Group" : "Text"}
            </div>
            {data.mediaType && (
              <div className="flex items-center gap-1 text-white/80">
                {data.mediaType === "photo" ? (
                  <ImageIcon className="h-3.5 w-3.5" />
                ) : (
                  <VideoIcon className="h-3.5 w-3.5" />
                )}
              </div>
            )}
          </div>
          <div className="mt-2 truncate text-sm font-medium text-zinc-800">{data.label}</div>
        </div>

        <Handle side="left" onPointerDown={onHandlePointerDown(data.id, "left")} />
        <Handle side="right" onPointerDown={onHandlePointerDown(data.id, "right")} />
      </GlassSurface>
    </div>
  )
}

const MemoNodeView = memo(NodeViewBase, (prev, next) => {
  return (
    prev.selected === next.selected &&
    prev.connectMode === next.connectMode &&
    prev.interacting === next.interacting &&
    prev.data.id === next.data.id &&
    prev.data.x === next.data.x &&
    prev.data.y === next.data.y &&
    prev.data.thumb === next.data.thumb &&
    prev.data.src === next.data.src &&
    prev.data.mediaType === next.data.mediaType &&
    prev.data.tint === next.data.tint &&
    prev.data.trimStart === next.data.trimStart &&
    prev.data.trimEnd === next.data.trimEnd &&
    prev.data.label === next.data.label
  )
})

function Handle({ side, onPointerDown }: { side: HandleSide; onPointerDown: (e: React.PointerEvent) => void }) {
  const isLeft = side === "left"
  return (
    <button
      type="button"
      aria-label={`${side} handle`}
      onPointerDown={onPointerDown}
      className={cn(
        "handle absolute top-1/2 -translate-y-1/2 rounded-full border will-change-transform z-20",
        "border-white/80 bg-white/90 text-violet-500 shadow-[0_6px_16px_rgba(0,0,0,.12)]",
        "after:hidden hover:after:block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300",
        "handle-pulse",
        isLeft ? "left-1" : "right-1",
      )}
      style={{ width: 18, height: 18 }}
    />
  )
}

function EdgeControlBase({
  edge,
  mid,
  selected,
  onSelectTransform,
  onDelete,
  onFocusEdge,
}: {
  edge: EdgeData
  mid: Point
  selected: boolean
  onSelectTransform: (name: string) => void
  onDelete: () => void
  onFocusEdge: () => void
}) {
  const [open, setOpen] = useState(false)
  const select = (name: string) => {
    onSelectTransform(name)
    setOpen(false)
  }
  return (
    <div className="edge-plus animate-appear will-change-transform" style={{ left: mid.x, top: mid.y }}>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className={cn(
                "edge-plus__btn",
                edge.transformed && "edge-plus__btn--zap",
                selected && "edge-plus__selected",
              )}
              aria-label={edge.transformed ? "Change transformation" : "Add transformation"}
              onClick={() => {
                onFocusEdge()
                setOpen((v) => !v)
              }}
            >
              {edge.transformed ? (
                <Zap className="h-4 w-4 text-violet-600" />
              ) : (
                <span className="inline-block h-4 w-4 rounded-full bg-zinc-700" />
              )}
            </button>
          </TooltipTrigger>
          {edge.transformName && (
            <TooltipContent side="top" className="text-xs">
              {edge.transformName}
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      {open && (
        <div className="upward-menu" onMouseDown={(e) => e.stopPropagation()}>
          <div className="px-1 pb-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">Transformation</div>
          <div className="tree">
            <div className="branch">
              <div className="item cursor-pointer" onClick={() => select("Branch")}>
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                <span>Branch</span>
              </div>
            </div>
            <div className="branch">
              <div className="item cursor-pointer" onClick={() => select("Filter")}>
                <span className="h-2.5 w-2.5 rounded-full bg-violet-400" />
                <span>Filter</span>
              </div>
              <div className="branch">
                <div className="item cursor-pointer" onClick={() => select("Filter • By Type")}>
                  <span className="h-2.5 w-2.5 rounded-full bg-violet-300" />
                  <span>By Type</span>
                </div>
                <div className="item cursor-pointer" onClick={() => select("Filter • By Tag")}>
                  <span className="h-2.5 w-2.5 rounded-full bg-violet-300" />
                  <span>By Tag</span>
                </div>
              </div>
            </div>
            <div className="branch">
              <div className="item cursor-pointer" onClick={() => select("Transform")}>
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span>Transform</span>
              </div>
              <div className="branch">
                <div className="item cursor-pointer" onClick={() => select("Transform • Resize")}>
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
                  <span>Resize</span>
                </div>
                <div className="item cursor-pointer" onClick={() => select("Transform • Color Correct")}>
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
                  <span>Color Correct</span>
                </div>
              </div>
            </div>

            <div className="branch">
              <div className="item danger cursor-pointer" onClick={() => onDelete()}>
                <Trash2 className="h-4 w-4" />
                <span>Delete connection</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const MemoEdgeControl = memo(EdgeControlBase, (prev, next) => {
  return (
    prev.selected === next.selected &&
    prev.edge.id === next.edge.id &&
    prev.edge.transformed === next.edge.transformed &&
    prev.edge.transformName === next.edge.transformName &&
    prev.mid.x === next.mid.x &&
    prev.mid.y === next.mid.y
  )
})
