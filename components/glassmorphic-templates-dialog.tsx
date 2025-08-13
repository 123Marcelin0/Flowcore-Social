"use client"

import type React from "react"

import { useMemo, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  ImageIcon,
  VideoIcon,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Play,
  Type,
  Search,
  Filter,
  Grid3X3,
  List,
  Eye,
} from "lucide-react"

export type PickerMedia = {
  id: string
  kind: "photo" | "video"
  src: string
  label: string
  poster?: string
}

type TemplateSlotDef = {
  id: string
  kind: "photo" | "video" | "text"
  label: string
}
type TemplateDef = {
  id: string
  name: string
  cover: string
  description: string
  category: string
  duration: string
  slots: TemplateSlotDef[]
  tags: string[]
}

const TEMPLATES: TemplateDef[] = [
  {
    id: "promo",
    name: "Product Promo",
    cover: "/placeholder.svg?height=320&width=480",
    description: "Short promo with 1 hero clip, 3 gallery photos, and title/subtitle.",
    category: "Business",
    duration: "30s",
    tags: ["product", "commercial", "showcase"],
    slots: [
      { id: "hero", kind: "video", label: "Hero Clip" },
      { id: "photo-1", kind: "photo", label: "Gallery Photo 1" },
      { id: "photo-2", kind: "photo", label: "Gallery Photo 2" },
      { id: "photo-3", kind: "photo", label: "Gallery Photo 3" },
      { id: "title", kind: "text", label: "Title" },
      { id: "subtitle", kind: "text", label: "Subtitle" },
    ],
  },
  {
    id: "travel",
    name: "Travel Montage",
    cover: "/placeholder.svg?height=320&width=480",
    description: "Quick travel montage with 3 clips, 4 photos and a location text.",
    category: "Lifestyle",
    duration: "45s",
    tags: ["travel", "adventure", "montage"],
    slots: [
      { id: "clip-a", kind: "video", label: "Clip A" },
      { id: "clip-b", kind: "video", label: "Clip B" },
      { id: "clip-c", kind: "video", label: "Clip C" },
      { id: "br-1", kind: "photo", label: "B‑Roll 1" },
      { id: "br-2", kind: "photo", label: "B‑Roll 2" },
      { id: "br-3", kind: "photo", label: "B‑Roll 3" },
      { id: "br-4", kind: "photo", label: "B‑Roll 4" },
      { id: "location", kind: "text", label: "Location" },
    ],
  },
  {
    id: "social-story",
    name: "Social Story",
    cover: "/placeholder.svg?height=320&width=480",
    description: "Vertical story format with 2 videos, 3 photos, and text overlay.",
    category: "Social Media",
    duration: "15s",
    tags: ["social", "story", "vertical"],
    slots: [
      { id: "main-video", kind: "video", label: "Main Video" },
      { id: "outro-video", kind: "video", label: "Outro Video" },
      { id: "photo-1", kind: "photo", label: "Photo 1" },
      { id: "photo-2", kind: "photo", label: "Photo 2" },
      { id: "photo-3", kind: "photo", label: "Photo 3" },
      { id: "headline", kind: "text", label: "Headline" },
    ],
  },
  {
    id: "corporate",
    name: "Corporate Intro",
    cover: "/placeholder.svg?height=320&width=480",
    description: "Professional corporate introduction with logo, team photos, and company info.",
    category: "Business",
    duration: "60s",
    tags: ["corporate", "professional", "intro"],
    slots: [
      { id: "logo-video", kind: "video", label: "Logo Animation" },
      { id: "team-1", kind: "photo", label: "Team Photo 1" },
      { id: "team-2", kind: "photo", label: "Team Photo 2" },
      { id: "office", kind: "photo", label: "Office Photo" },
      { id: "company-name", kind: "text", label: "Company Name" },
      { id: "tagline", kind: "text", label: "Tagline" },
    ],
  },
  {
    id: "food-recipe",
    name: "Food Recipe",
    cover: "/placeholder.svg?height=320&width=480",
    description: "Step-by-step recipe with cooking videos and ingredient photos.",
    category: "Lifestyle",
    duration: "90s",
    tags: ["food", "recipe", "cooking"],
    slots: [
      { id: "final-dish", kind: "video", label: "Final Dish" },
      { id: "cooking-1", kind: "video", label: "Cooking Step 1" },
      { id: "cooking-2", kind: "video", label: "Cooking Step 2" },
      { id: "cooking-3", kind: "video", label: "Cooking Step 3" },
      { id: "ingredient-1", kind: "photo", label: "Ingredient 1" },
      { id: "ingredient-2", kind: "photo", label: "Ingredient 2" },
      { id: "ingredient-3", kind: "photo", label: "Ingredient 3" },
      { id: "recipe-title", kind: "text", label: "Recipe Title" },
      { id: "prep-time", kind: "text", label: "Prep Time" },
    ],
  },
  {
    id: "fitness",
    name: "Fitness Workout",
    cover: "/placeholder.svg?height=320&width=480",
    description: "High-energy workout routine with exercise videos and motivational text.",
    category: "Health",
    duration: "120s",
    tags: ["fitness", "workout", "health"],
    slots: [
      { id: "warmup", kind: "video", label: "Warm-up" },
      { id: "exercise-1", kind: "video", label: "Exercise 1" },
      { id: "exercise-2", kind: "video", label: "Exercise 2" },
      { id: "exercise-3", kind: "video", label: "Exercise 3" },
      { id: "before", kind: "photo", label: "Before Photo" },
      { id: "after", kind: "photo", label: "After Photo" },
      { id: "workout-title", kind: "text", label: "Workout Title" },
      { id: "motivation", kind: "text", label: "Motivation" },
    ],
  },
  {
    id: "event-highlight",
    name: "Event Highlight",
    cover: "/placeholder.svg?height=320&width=480",
    description: "Capture the best moments of your event with videos and photos.",
    category: "Events",
    duration: "75s",
    tags: ["event", "celebration", "highlights"],
    slots: [
      { id: "opening", kind: "video", label: "Opening Moment" },
      { id: "highlight-1", kind: "video", label: "Highlight 1" },
      { id: "highlight-2", kind: "video", label: "Highlight 2" },
      { id: "group-1", kind: "photo", label: "Group Photo 1" },
      { id: "group-2", kind: "photo", label: "Group Photo 2" },
      { id: "venue", kind: "photo", label: "Venue Photo" },
      { id: "event-name", kind: "text", label: "Event Name" },
      { id: "date", kind: "text", label: "Date" },
    ],
  },
  {
    id: "tutorial",
    name: "Tutorial Guide",
    cover: "/placeholder.svg?height=320&width=480",
    description: "Step-by-step tutorial with instructional videos and diagrams.",
    category: "Education",
    duration: "180s",
    tags: ["tutorial", "education", "guide"],
    slots: [
      { id: "intro", kind: "video", label: "Introduction" },
      { id: "step-1", kind: "video", label: "Step 1" },
      { id: "step-2", kind: "video", label: "Step 2" },
      { id: "step-3", kind: "video", label: "Step 3" },
      { id: "diagram-1", kind: "photo", label: "Diagram 1" },
      { id: "diagram-2", kind: "photo", label: "Diagram 2" },
      { id: "tutorial-title", kind: "text", label: "Tutorial Title" },
      { id: "difficulty", kind: "text", label: "Difficulty Level" },
    ],
  },
]

const CATEGORIES = ["All", "Business", "Lifestyle", "Social Media", "Health", "Events", "Education"]

export type TemplateAssignments = Record<
  string,
  { kind: "photo" | "video"; media: PickerMedia } | { kind: "text"; text: string }
>

export default function TemplatesDialog({
  open,
  onOpenChange,
  media,
  onComplete,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  media: PickerMedia[]
  onComplete: (result: { template: TemplateDef; assignments: TemplateAssignments }) => void
}) {
  const [step, setStep] = useState<"choose" | "fill">("choose")
  const [selectedTpl, setSelectedTpl] = useState<TemplateDef | null>(null)
  const [assignments, setAssignments] = useState<TemplateAssignments>({})
  const [openPickerFor, setOpenPickerFor] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null)

  const reset = () => {
    setStep("choose")
    setSelectedTpl(null)
    setAssignments({})
    setOpenPickerFor(null)
    setSearchQuery("")
    setSelectedCategory("All")
    setPreviewTemplate(null)
  }

  const filteredTemplates = useMemo(() => {
    return TEMPLATES.filter((template) => {
      const matchesSearch =
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesCategory = selectedCategory === "All" || template.category === selectedCategory

      return matchesSearch && matchesCategory
    })
  }, [searchQuery, selectedCategory])

  const filteredForSlot = (slot: TemplateSlotDef) =>
    media.filter((m) => (slot.kind === "text" ? false : m.kind === slot.kind))

  const filledCount = useMemo(() => {
    if (!selectedTpl) return 0
    return selectedTpl.slots.reduce((acc, s) => {
      const a = assignments[s.id]
      if (!a) return acc
      if (s.kind === "text") {
        return (a as any)?.text?.toString()?.trim() ? acc + 1 : acc
      }
      return (a as any)?.media ? acc + 1 : acc
    }, 0)
  }, [selectedTpl, assignments])

  const totalNeeded = selectedTpl?.slots.length ?? 0
  const allSet = selectedTpl ? filledCount === totalNeeded : false

  function handleChooseTemplate(t: TemplateDef) {
    setSelectedTpl(t)
    setStep("fill")
  }

  function handleDrop(slot: TemplateSlotDef, e: React.DragEvent) {
    if (slot.kind === "text") return
    if (!e.dataTransfer.types.includes("application/x-media-item")) return
    e.preventDefault()
    try {
      const data = JSON.parse(e.dataTransfer.getData("application/x-media-item"))
      if (!data || (data.kind !== "photo" && data.kind !== "video")) return
      if (data.kind !== slot.kind) return
      const item: PickerMedia = {
        id: data.id,
        kind: data.kind,
        src: data.src,
        label: data.label,
        poster: data.poster,
      }
      setAssignments((prev) => ({ ...prev, [slot.id]: { kind: slot.kind, media: item } }))
    } catch {}
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset()
        onOpenChange(v)
      }}
    >
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className={cn(
          // centered modal sizing (slightly smaller)
          "w-[92vw] max-w-[1400px] h-[85vh] max-h-[85vh] border-white/15 bg-white/10 p-0 text-white backdrop-blur-3xl",
          "shadow-[0_32px_120px_rgba(0,0,0,0.35)] ring-1 ring-white/20",
          // layout: sticky header + scrollable content + slightly rounder corners
          "grid grid-rows-[auto,1fr] overflow-hidden rounded-[36px]",
        )}
        style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
        
      >
        <DialogHeader className="px-8 pt-8 pb-6 bg-gradient-to-br from-white/20 via-white/10 to-transparent border-b border-white/15 sticky top-0 z-10">
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="grid place-items-center h-8 w-8 rounded-2xl bg-gradient-to-br from-blue-400/20 to-purple-500/20 border border-white/20">
                <Sparkles className="h-4.5 w-4.5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                  {step === "fill" && selectedTpl ? `Customize ${selectedTpl.name}` : "Templates Library"}
                </DialogTitle>
                <DialogDescription className="text-white/60 text-base leading-relaxed mt-0.5">
                  {step === "fill" && selectedTpl
                    ? "Fill the required slots below to continue"
                    : "Choose from our collection of professional templates"}
                </DialogDescription>
              </div>
            </div>

            {step === "choose" && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/10 border border-white/20">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "rounded-xl px-3 py-1.5 text-white",
                      viewMode === "grid" ? "bg-white/20" : "hover:bg-white/10",
                    )}
                    onClick={() => setViewMode("grid")}
                  >
                    <Grid3X3 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "rounded-xl px-3 py-1.5 text-white",
                      viewMode === "list" ? "bg-white/20" : "hover:bg-white/10",
                    )}
                    onClick={() => setViewMode("list")}
                  >
                    <List className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {/* Built-in top-right close button remains available */}
              </div>
            )}

            {step === "fill" && (
              <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-4 py-2 shadow-md backdrop-blur-sm">
                <span className="text-xs text-white/70">Progress</span>
                <div className="relative h-2 w-36 overflow-hidden rounded-full bg-white/15 ring-1 ring-white/20">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-blue-400 transition-all duration-500 ease-out"
                    style={{ width: `${Math.round((filledCount / Math.max(1, totalNeeded)) * 100)}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-white">{filledCount}/{totalNeeded} complete</span>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="overflow-hidden flex flex-col">
          {step === "choose" && (
            <>
              <div className="px-8 py-6 border-b border-white/10 bg-gradient-to-r from-white/5 to-transparent">
                <div className="flex items-center gap-6 mb-4">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
                    <Input
                      placeholder="Search templates..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-3 py-2 bg-white/10 border-white/20 rounded-xl text-white placeholder-white/60 text-sm"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-white/60" />
                    <div className="flex gap-2">
                      {CATEGORIES.map((category) => (
                        <Button
                          key={category}
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "rounded-2xl px-4 py-2 text-sm font-medium transition-all",
                            selectedCategory === category
                              ? "bg-gradient-to-r from-blue-500/80 to-purple-500/80 text-white border border-white/30"
                              : "bg-white/10 text-white/80 hover:bg-white/20 border border-white/20",
                          )}
                          onClick={() => setSelectedCategory(category)}
                        >
                          {category}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Removed count text */}
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                <div
                  className={cn(
                    viewMode === "grid"
                      ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
                      : "space-y-6",
                  )}
                >
                  {filteredTemplates.map((t) => (
                    <div
                      key={t.id}
                      className={cn(
                        "group relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-white/10 via-white/5 to-white/10",
                        "shadow-[0_20px_60px_rgba(0,0,0,0.3)] hover:shadow-[0_32px_80px_rgba(0,0,0,0.4)]",
                        "hover:-translate-y-2 hover:scale-[1.02] transition-all duration-500 ease-out",
                        "ring-1 ring-white/10 hover:ring-white/20",
                        viewMode === "list" && "flex items-center gap-6 p-6",
                      )}
                    >
                      <div
                        className={cn(
                          "relative overflow-hidden",
                          viewMode === "grid" ? "aspect-[16/10] w-full" : "w-48 h-32 flex-shrink-0 rounded-2xl",
                        )}
                      >
                        <img
                          src={t.cover || "/placeholder.svg"}
                          alt={t.name}
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                          crossOrigin="anonymous"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />

                        <div className="absolute top-4 right-4 flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30"
                            onClick={(e) => {
                              e.stopPropagation()
                              setPreviewTemplate(previewTemplate === t.id ? null : t.id)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <div className="p-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30">
                            <Play className="h-4 w-4 text-white" />
                          </div>
                        </div>

                        <div className="absolute bottom-4 left-4 flex items-center gap-2">
                          <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-xs font-medium">
                            {t.duration}
                          </span>
                          <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-xs font-medium">
                            {t.category}
                          </span>
                        </div>
                      </div>

                      <div className={cn("p-6", viewMode === "list" && "flex-1 p-0")}>
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="min-w-0 flex-1">
                            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-200 transition-colors">
                              {t.name}
                            </h3>
                            <p className="text-white/70 text-sm leading-relaxed mb-3">{t.description}</p>

                            <div className="flex flex-wrap gap-2 mb-4">
                              {t.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2 py-1 rounded-lg bg-white/10 border border-white/20 text-xs text-white/70"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mb-4">
                          <div className="text-xs text-white/50 uppercase tracking-wider font-medium">Includes:</div>
                          <div className="flex gap-1">
                            {t.slots.slice(0, 4).map((slot, i) => (
                              <div key={i} className="p-1 rounded-lg bg-white/10 border border-white/20">
                                {slot.kind === "photo" ? (
                                  <ImageIcon className="h-3 w-3 text-white/70" />
                                ) : slot.kind === "video" ? (
                                  <VideoIcon className="h-3 w-3 text-white/70" />
                                ) : (
                                  <Type className="h-3 w-3 text-white/70" />
                                )}
                              </div>
                            ))}
                            {t.slots.length > 4 && (
                              <div className="px-2 py-1 rounded-lg bg-white/10 border border-white/20 text-xs text-white/70">
                                +{t.slots.length - 4}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <Button
                            onClick={() => handleChooseTemplate(t)}
                            className="px-6 py-2 rounded-2xl bg-gradient-to-r from-blue-500/80 to-purple-500/80 border border-white/30 text-white font-medium text-sm hover:from-blue-400/90 hover:to-purple-400/90 transition-all shadow-lg"
                          >
                            Choose Template
                          </Button>
                        </div>
                      </div>

                      {previewTemplate === t.id && (
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-10">
                          <div className="text-center text-white p-8">
                            <div className="text-2xl font-bold mb-4">Template Preview</div>
                            <div className="text-white/70 mb-6">Preview functionality coming soon</div>
                            <Button
                              onClick={() => setPreviewTemplate(null)}
                              className="px-6 py-2 rounded-2xl bg-white/20 border border-white/30 text-white hover:bg-white/30"
                            >
                              Close Preview
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {filteredTemplates.length === 0 && (
                  <div className="text-center py-16">
                    <div className="text-white/60 text-xl mb-4">No templates found</div>
                    <div className="text-white/40">Try adjusting your search or filter criteria</div>
                  </div>
                )}
              </div>
            </>
          )}

          {step === "fill" && selectedTpl && (
            <div className="flex-1 overflow-y-auto p-8">
              <div className="mb-6" />

              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
                {selectedTpl.slots.map((slot) => {
                  const assigned = assignments[slot.id]
                  return (
                    <div
                      key={slot.id}
                      className={cn(
                        "relative rounded-3xl border border-white/15 bg-gradient-to-br from-white/10 via-white/5 to-white/10 p-6",
                        "shadow-[0_16px_40px_rgba(0,0,0,0.2)] ring-1 ring-white/10",
                        "transition-all duration-300 hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)]",
                        assigned &&
                          "ring-2 ring-emerald-400/50 bg-gradient-to-br from-emerald-500/10 via-white/5 to-white/10",
                      )}
                      // Drag-and-drop into template slots disabled
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "p-3 rounded-2xl border border-white/20",
                              slot.kind === "photo" && "bg-gradient-to-br from-blue-500/20 to-cyan-500/20",
                              slot.kind === "video" && "bg-gradient-to-br from-purple-500/20 to-pink-500/20",
                              slot.kind === "text" && "bg-gradient-to-br from-orange-500/20 to-yellow-500/20",
                            )}
                          >
                            {slot.kind === "photo" ? (
                              <ImageIcon className="h-5 w-5 text-white" />
                            ) : slot.kind === "video" ? (
                              <VideoIcon className="h-5 w-5 text-white" />
                            ) : (
                              <Type className="h-5 w-5 text-white" />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-white">{slot.label}</div>
                            <div className="text-xs text-white/60 capitalize">{slot.kind}</div>
                          </div>
                        </div>
                        {assigned && (
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-400/80 to-green-400/80 border border-white/30">
                            <Check className="h-4 w-4 text-white" />
                            <span className="text-sm font-medium text-white">Ready</span>
                          </div>
                        )}
                      </div>

                      {slot.kind === "text" ? (
                        <Input
                          placeholder="Enter your text here..."
                          className="bg-white/80 text-slate-900 placeholder-slate-500 border-white/30 rounded-2xl h-12 text-base font-medium"
                          value={(assigned && (assigned as any).text) || ""}
                          onChange={(e) =>
                            setAssignments((prev) => ({ ...prev, [slot.id]: { kind: "text", text: e.target.value } }))
                          }
                        />
                      ) : (
                        <div className="space-y-4">
                          {assigned && (assigned as any).media ? (
                            <div className="p-4 rounded-2xl bg-white/10 border border-white/20">
                              <div className="flex items-center gap-4">
                                <div className="relative h-16 w-20 overflow-hidden rounded-xl border border-white/20 bg-white/10">
                                  <img
                                    src={
                                      (assigned as any).media.kind === "video"
                                        ? (assigned as any).media.poster || "/placeholder.svg?height=80&width=120"
                                        : (assigned as any).media.src || "/placeholder.svg?height=80&width=120"
                                    }
                                    alt={(assigned as any).media.label}
                                    className="h-full w-full object-cover"
                                    crossOrigin="anonymous"
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium text-white mb-1">{(assigned as any).media.label}</div>
                                  <div className="text-sm text-white/60">Successfully assigned</div>
                                </div>
                                <Button
                                  variant="ghost"
                                  className="rounded-full border border-white/30 bg-white/10 text-white hover:bg-white/20 p-2"
                                  onClick={() => setAssignments((prev) => ({ ...prev, [slot.id]: undefined as any }))}
                                  aria-label="Remove"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="p-4 rounded-2xl border-2 border-dashed border-white/30 bg-white/5">
                              <div className="text-center">
                                <div className="text-white/70 mb-3">Drag from Media panel or select from library</div>
                                <Button
                                  variant="secondary"
                                  className="rounded-2xl border border-white/30 bg-white/15 text-white hover:bg-white/25 px-6 py-2"
                                  onClick={() => setOpenPickerFor(openPickerFor === slot.id ? null : slot.id)}
                                >
                                  Browse Library
                                </Button>
                              </div>
                            </div>
                          )}

                          {openPickerFor === slot.id && (
                            <div className="p-4 rounded-2xl border border-white/20 bg-white/5 backdrop-blur-sm">
                              <div className="max-h-64 overflow-auto">
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                  {filteredForSlot(slot).map((m) => (
                                    <button
                                      key={m.id + "-" + slot.id}
                                      className={cn(
                                        "group overflow-hidden rounded-xl border border-white/20 bg-white/10 text-left",
                                        "hover:bg-white/15 hover:border-white/30 transition-all duration-200",
                                      )}
                                      onClick={() => {
                                        setAssignments((prev) => ({
                                          ...prev,
                                          [slot.id]: { kind: slot.kind as any, media: m },
                                        }))
                                        setOpenPickerFor(null)
                                      }}
                                    >
                                      <div className="relative aspect-[4/3] w-full">
                                        <img
                                          src={
                                            m.kind === "video"
                                              ? m.poster || "/placeholder.svg?height=80&width=120"
                                              : m.src
                                          }
                                          alt={m.label}
                                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                                          crossOrigin="anonymous"
                                        />
                                      </div>
                                      <div className="p-2">
                                        <div className="truncate text-xs font-medium text-white">{m.label}</div>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                                {filteredForSlot(slot).length === 0 && (
                                  <div className="py-8 text-center text-white/60">No matching media found.</div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="flex items-center justify-between p-6 rounded-3xl bg-gradient-to-r from-white/10 via-white/5 to-white/10 border border-white/15">
                <div className="text-white/60">💡 Tip: You can drag items directly from the Media drawer</div>
                <div className="flex items-center gap-4">
                  <Button
                    variant="secondary"
                    className="rounded-2xl border border-white/30 bg-white/10 text-white hover:bg-white/20 px-6 py-3"
                    onClick={() => setStep("choose")}
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Change Template
                  </Button>
                  <Button
                    disabled={!allSet}
                    className={cn(
                      "rounded-2xl px-8 py-3 font-semibold text-base transition-all duration-300",
                      allSet
                        ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-400 hover:to-purple-400 shadow-lg hover:shadow-xl"
                        : "bg-white/20 text-white/60 cursor-not-allowed",
                    )}
                    onClick={() => {
                      if (!selectedTpl) return
                      onComplete({ template: selectedTpl, assignments })
                      onOpenChange(false)
                      reset()
                    }}
                  >
                    Create in Workflow
                    <ChevronRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
