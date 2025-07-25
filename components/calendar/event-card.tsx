"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Edit, Clock, Repeat, Trash2, GripVertical, TrendingUp, Target, ExternalLink } from "lucide-react"
import { CalendarIcon } from "lucide-react"
import { toast } from "sonner"

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  category: string
  color: string
  isRecurring: boolean
  recurrencePattern?: "daily" | "weekly" | "monthly" | "yearly"
  recurrenceEnd?: string
  allDay: boolean
}

interface EventCardProps {
  event: CalendarEvent
  onEdit: (event: CalendarEvent) => void
  onDelete: (eventId: string) => void
  isDragging?: boolean
  style?: React.CSSProperties
}

const categoryColors = {
  work: { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-200" },
  personal: { bg: "bg-green-100", text: "text-green-800", border: "border-green-200" },
  social: { bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-200" },
  health: { bg: "bg-red-100", text: "text-red-800", border: "border-red-200" },
  education: { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-200" },
  travel: { bg: "bg-indigo-100", text: "text-indigo-800", border: "border-indigo-200" },
  other: { bg: "bg-gray-100", text: "text-gray-800", border: "border-gray-200" },
}

export function EventCard({ event, onEdit, onDelete, isDragging, style }: EventCardProps) {
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editedEvent, setEditedEvent] = useState<CalendarEvent>(event)
  const router = useRouter()

  const categoryStyle = categoryColors[event.category as keyof typeof categoryColors] || categoryColors.other

  const handleSave = () => {
    onEdit(editedEvent)
    setIsEditOpen(false)
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":")
    const hour = Number.parseInt(hours)
    const ampm = hour >= 12 ? "PM" : "AM"
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  // Determine if this is a trend or content strategy based on category and metadata
  const getIdeaType = () => {
    // Check metadata first
    if (event.description && typeof event.description === 'string') {
      // Check for trend keywords in description
      const description = event.description.toLowerCase()
      if (description.includes('trend') || description.includes('trending') || 
          description.includes('viral') || description.includes('tiktok') || 
          description.includes('instagram trend')) {
        return 'trend'
      }
    }
    
    // Check category
    if (event.category === 'trend' || event.category === 'trends') {
      return 'trend'
    }
    
    // Default to content strategy
    return 'content-strategy'
  }

  const handleEventClick = () => {
    const ideaType = getIdeaType()
    
    if (ideaType === 'trend') {
      // Navigate to trend optimization page
      toast.success('Navigiere zu Trends Optimierung...')
      // You can create a query param with the event data
      const eventData = encodeURIComponent(JSON.stringify({
        id: event.id,
        title: event.title,
        description: event.description
      }))
      router.push(`/?workflow=trend-optimization&eventData=${eventData}`)
    } else {
      // Navigate to content strategy workflow page
      toast.success('Navigiere zu Content Strategien...')
      // Create strategy data structure for content strategy workflow
      const strategyData = {
        id: event.id,
        title: event.title,
        description: event.description || '',
        category: 'content-strategies',
        content: {
          platforms: ['instagram'],
          targetAudience: 'Immobilienkäufer',
          estimatedReach: 1000
        },
        priority: 'medium' as const,
        estimatedEffort: 'medium' as const
      }
      const encodedStrategy = encodeURIComponent(JSON.stringify(strategyData))
      router.push(`/?workflow=content-strategy&strategyData=${encodedStrategy}`)
    }
  }

  return (
    <>
      <Card
        className={`
          group relative overflow-hidden transition-all duration-200
          hover:shadow-md hover:translate-y-[-1px] cursor-pointer
          ${isDragging ? "opacity-50 rotate-1 scale-95" : ""}
          border-l-4 ${categoryStyle.border}
          bg-white hover:bg-gray-50
        `}
        style={style}
        onClick={handleEventClick}
      >
        <CardContent className="p-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-sm text-gray-900 truncate">{event.title}</h4>
                {getIdeaType() === 'trend' ? (
                  <TrendingUp className="w-3 h-3 text-orange-500" />
                ) : (
                  <Target className="w-3 h-3 text-teal-500" />
                )}
              </div>
              {!event.allDay && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-500">
                    {formatTime(event.startTime)} - {formatTime(event.endTime)}
                  </span>
                </div>
              )}
              {event.isRecurring && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Repeat className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-500 capitalize">
                    {event.recurrencePattern}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {getIdeaType() === 'trend' ? 'Trend' : 'Content Strategie'}
                </Badge>
                <ExternalLink className="w-3 h-3 text-gray-400" />
              </div>
            </div>
            <div className="flex items-start gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsEditOpen(true)
                }}
                className="h-6 w-6 p-0 hover:bg-gray-100"
              >
                <Edit className="w-3 h-3 text-gray-500" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(event.id)
                }}
                className="h-6 w-6 p-0 hover:bg-gray-100 hover:text-red-600"
              >
                <Trash2 className="w-3 h-3 text-gray-500" />
              </Button>
              <div className="h-6 w-6 flex items-center justify-center cursor-move">
                <GripVertical className="w-3 h-3 text-gray-400" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog - Only for event management, not for idea workflows */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-teal-600" />
              <span>Event bearbeiten</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={editedEvent.title}
                onChange={(e) => setEditedEvent({ ...editedEvent, title: e.target.value })}
                className="mt-1"
                placeholder="Veranstaltungstitel eingeben"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editedEvent.description || ""}
                onChange={(e) => setEditedEvent({ ...editedEvent, description: e.target.value })}
                className="mt-1"
                rows={3}
                placeholder="Veranstaltungsbeschreibung hinzufügen (optional)"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={editedEvent.startDate}
                  onChange={(e) => setEditedEvent({ ...editedEvent, startDate: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={editedEvent.endDate}
                  onChange={(e) => setEditedEvent({ ...editedEvent, endDate: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 bg-gray-50 p-3 rounded-lg">
              <Switch
                id="allDay"
                checked={editedEvent.allDay}
                onCheckedChange={(checked) => setEditedEvent({ ...editedEvent, allDay: checked })}
              />
              <Label htmlFor="allDay" className="font-medium">All Day Event</Label>
            </div>

            {!editedEvent.allDay && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={editedEvent.startTime}
                    onChange={(e) => setEditedEvent({ ...editedEvent, startTime: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={editedEvent.endTime}
                    onChange={(e) => setEditedEvent({ ...editedEvent, endTime: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={editedEvent.category}
                onValueChange={(value) => setEditedEvent({ ...editedEvent, category: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="work">Work</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="social">Social</SelectItem>
                  <SelectItem value="health">Health</SelectItem>
                  <SelectItem value="education">Education</SelectItem>
                  <SelectItem value="travel">Travel</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2 bg-gray-50 p-3 rounded-lg">
              <Switch
                id="recurring"
                checked={editedEvent.isRecurring}
                onCheckedChange={(checked) => setEditedEvent({ ...editedEvent, isRecurring: checked })}
              />
              <Label htmlFor="recurring" className="font-medium">Recurring Event</Label>
            </div>

            {editedEvent.isRecurring && (
              <div>
                <Label htmlFor="recurrence">Recurrence Pattern</Label>
                <Select
                  value={editedEvent.recurrencePattern || "weekly"}
                  onValueChange={(value) =>
                    setEditedEvent({
                      ...editedEvent,
                      recurrencePattern: value as "daily" | "weekly" | "monthly" | "yearly",
                    })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} className="bg-teal-600 hover:bg-teal-700">
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
