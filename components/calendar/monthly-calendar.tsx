"use client"

import type React from "react"
import { v4 as uuidv4 } from 'uuid';

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from "lucide-react"
import { EventCard, type CalendarEvent } from "./event-card"

interface MonthlyCalendarProps {
  events: CalendarEvent[]
  onEventCreate: (event: CalendarEvent) => void
  onEventUpdate: (event: CalendarEvent) => void
  onEventDelete: (eventId: string) => void
}

export function MonthlyCalendar({ events, onEventCreate, onEventUpdate, onEventDelete }: MonthlyCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null)
  const [dragOverDate, setDragOverDate] = useState<string | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({
    title: "",
    description: "",
    category: "work",
    allDay: false,
    isRecurring: false,
    startTime: "09:00",
    endTime: "10:00",
  })

  const dragCounter = useRef(0)

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  const getDaysInMonth = useCallback((date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }

    return days
  }, [])

  const formatDate = (date: Date) => {
    return date.toISOString().split("T")[0]
  }

  const getEventsForDate = useCallback(
    (date: Date) => {
      const dateString = formatDate(date)
      return events.filter((event) => {
        const eventStart = new Date(event.startDate)
        const eventEnd = new Date(event.endDate)
        const currentDate = new Date(dateString)

        return currentDate >= eventStart && currentDate <= eventEnd
      })
    },
    [events],
  )

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const handleDragStart = (e: React.DragEvent, event: CalendarEvent) => {
    setDraggedEvent(event)
    e.dataTransfer.effectAllowed = "move"

    // Create custom drag image
    const dragElement = e.currentTarget as HTMLElement
    const rect = dragElement.getBoundingClientRect()
    e.dataTransfer.setDragImage(dragElement, rect.width / 2, rect.height / 2)
  }

  const handleDragEnd = () => {
    setDraggedEvent(null)
    setDragOverDate(null)
    dragCounter.current = 0
  }

  const handleDragEnter = (e: React.DragEvent, date: Date) => {
    e.preventDefault()
    dragCounter.current++
    setDragOverDate(formatDate(date))
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current--
    if (dragCounter.current === 0) {
      setDragOverDate(null)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = (e: React.DragEvent, date: Date) => {
    e.preventDefault()
    dragCounter.current = 0
    setDragOverDate(null)

    if (draggedEvent) {
      const dateString = formatDate(date)
      const updatedEvent = {
        ...draggedEvent,
        startDate: dateString,
        endDate: dateString,
      }
      onEventUpdate(updatedEvent)
      setDraggedEvent(null)
    }
  }

  const handleDateClick = (date: Date) => {
    const dateString = formatDate(date)
    setSelectedDate(dateString)
    setNewEvent((prev) => ({
      ...prev,
      startDate: dateString,
      endDate: dateString,
    }))
    setIsCreateDialogOpen(true)
  }

  const handleCreateEvent = () => {
    if (newEvent.title && newEvent.startDate) {
      const event: CalendarEvent = {
        id: uuidv4(),
        title: newEvent.title,
        description: newEvent.description || "",
        startDate: newEvent.startDate!,
        endDate: newEvent.endDate || newEvent.startDate!,
        startTime: newEvent.startTime || "09:00",
        endTime: newEvent.endTime || "10:00",
        category: newEvent.category || "work",
        color: "#3B82F6",
        allDay: newEvent.allDay || false,
        isRecurring: newEvent.isRecurring || false,
        recurrencePattern: newEvent.recurrencePattern,
      }

      onEventCreate(event)
      setIsCreateDialogOpen(false)
      setNewEvent({
        title: "",
        description: "",
        category: "work",
        allDay: false,
        isRecurring: false,
        startTime: "09:00",
        endTime: "10:00",
      })
    }
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-0 shadow-lg bg-white rounded-xl">
        <CardHeader className="pb-4 bg-white border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CalendarIcon className="w-6 h-6 text-teal-600" />
              <div>
                <CardTitle className="text-2xl font-semibold text-gray-900">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  Click any date to create an event or drag to reschedule
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-gray-50 rounded-lg p-1 flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateMonth("prev")}
                  className="h-8 w-8 p-0 hover:bg-white hover:text-teal-600"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentDate(new Date())}
                  className="h-8 text-sm hover:bg-white hover:text-teal-600"
                >
                  Today
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateMonth("next")}
                  className="h-8 w-8 p-0 hover:bg-white hover:text-teal-600"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <Button
                onClick={() => {
                  setSelectedDate(formatDate(new Date()))
                  setNewEvent((prev) => ({
                    ...prev,
                    startDate: formatDate(new Date()),
                    endDate: formatDate(new Date()),
                  }))
                  setIsCreateDialogOpen(true)
                }}
                className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Event
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-7 gap-px bg-gray-100">
            {/* Day headers */}
            {dayNames.map((day) => (
              <div key={day} className="bg-gray-50/80 py-3 text-center">
                <span className="text-xs font-medium text-gray-600">{day}</span>
              </div>
            ))}

            {/* Calendar days */}
            {getDaysInMonth(currentDate).map((date, index) => {
              const dateString = date ? formatDate(date) : null
              const isDragOver = dateString === dragOverDate
              const eventsForDate = date ? getEventsForDate(date) : []
              const isCurrentDay = date ? isToday(date) : false

              return (
                <div
                  key={index}
                  className={`
                    relative bg-white min-h-[140px] p-2 
                    transition-all duration-200 
                    ${date ? "hover:bg-gray-50/50" : "bg-gray-25"}
                    ${isDragOver ? "bg-teal-50 shadow-inner" : ""}
                  `}
                  onDragEnter={date ? (e) => handleDragEnter(e, date) : undefined}
                  onDragLeave={date ? handleDragLeave : undefined}
                  onDragOver={date ? handleDragOver : undefined}
                  onDrop={date ? (e) => handleDrop(e, date) : undefined}
                  onClick={date ? () => handleDateClick(date) : undefined}
                >
                  {date && (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <div 
                          className={`
                            flex items-center justify-center w-8 h-8 rounded-full
                            ${isCurrentDay 
                              ? "bg-teal-600 text-white shadow-teal-100 shadow-lg" 
                              : "text-gray-700 hover:bg-gray-100"
                            }
                          `}
                        >
                          <span className="text-sm font-medium">
                            {date.getDate()}
                          </span>
                        </div>
                        {eventsForDate.length > 0 && (
                          <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                            {eventsForDate.length}
                          </span>
                        )}
                      </div>

                      {isDragOver && (
                        <div className="absolute inset-2 border-2 border-dashed border-teal-400 rounded-lg bg-teal-50/30 backdrop-blur-sm flex items-center justify-center z-10">
                          <div className="text-teal-600 text-xs font-medium px-2 py-1 bg-white/80 rounded-full shadow-sm">
                            Drop to reschedule
                          </div>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        {eventsForDate.slice(0, 2).map((event) => (
                          <div
                            key={event.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, event)}
                            onDragEnd={handleDragEnd}
                            className="relative z-20"
                            onClickCapture={(e) => {
                              // Allow EventCard click to work by preventing drag wrapper interference
                              e.stopPropagation()
                            }}
                          >
                            <EventCard
                              event={event}
                              onEdit={onEventUpdate}
                              onDelete={onEventDelete}
                              isDragging={draggedEvent?.id === event.id}
                            />
                          </div>
                        ))}

                        {eventsForDate.length > 2 && (
                          <button className="w-full text-xs text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors duration-150 font-medium">
                            +{eventsForDate.length - 2} more events
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Create Event Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-teal-600" />
              <span>Create New Event</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-title">Title</Label>
              <Input
                id="new-title"
                value={newEvent.title || ""}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                className="mt-1"
                placeholder="Veranstaltungstitel eingeben"
              />
            </div>

            <div>
              <Label htmlFor="new-description">Description</Label>
              <Textarea
                id="new-description"
                value={newEvent.description || ""}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                className="mt-1"
                rows={3}
                placeholder="Veranstaltungsbeschreibung hinzufügen (optional)"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="new-startDate">Start Date</Label>
                <Input
                  id="new-startDate"
                  type="date"
                  value={newEvent.startDate || ""}
                  onChange={(e) => setNewEvent({ ...newEvent, startDate: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="new-endDate">End Date</Label>
                <Input
                  id="new-endDate"
                  type="date"
                  value={newEvent.endDate || newEvent.startDate || ""}
                  onChange={(e) => setNewEvent({ ...newEvent, endDate: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 bg-gray-50 p-3 rounded-lg">
              <Switch
                id="new-allDay"
                checked={newEvent.allDay || false}
                onCheckedChange={(checked) => setNewEvent({ ...newEvent, allDay: checked })}
              />
              <Label htmlFor="new-allDay" className="font-medium">All Day Event</Label>
            </div>

            {!newEvent.allDay && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="new-startTime">Start Time</Label>
                  <Input
                    id="new-startTime"
                    type="time"
                    value={newEvent.startTime || "09:00"}
                    onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="new-endTime">End Time</Label>
                  <Input
                    id="new-endTime"
                    type="time"
                    value={newEvent.endTime || "10:00"}
                    onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="new-category">Category</Label>
              <Select
                value={newEvent.category || "work"}
                onValueChange={(value) => setNewEvent({ ...newEvent, category: value })}
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
                id="new-recurring"
                checked={newEvent.isRecurring || false}
                onCheckedChange={(checked) => setNewEvent({ ...newEvent, isRecurring: checked })}
              />
              <Label htmlFor="new-recurring" className="font-medium">Recurring Event</Label>
            </div>

            {newEvent.isRecurring && (
              <div>
                <Label htmlFor="new-recurrence">Recurrence Pattern</Label>
                <Select
                  value={newEvent.recurrencePattern || "weekly"}
                  onValueChange={(value) =>
                    setNewEvent({
                      ...newEvent,
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
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateEvent} className="bg-teal-600 hover:bg-teal-700">
                Create Event
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
