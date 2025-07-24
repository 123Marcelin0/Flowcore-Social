"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface CalendarPickerProps {
  selectedDate?: Date
  onDateSelect?: (date: Date) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

const months = [
  "Jan", "Feb", "Mär", "Apr", "Mai", "Jun",
  "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"
]

const weekdays = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"]

export function CalendarPicker({
  selectedDate,
  onDateSelect,
  placeholder = "Datum auswählen",
  className,
  disabled = false
}: CalendarPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentDate, setCurrentDate] = useState(selectedDate || new Date())
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const today = new Date()
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Get first day of month and number of days
  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  const firstDayWeekday = firstDayOfMonth.getDay()
  const daysInMonth = lastDayOfMonth.getDate()

  // Generate calendar days
  const calendarDays = []
  
  // Add empty cells for days before month starts
  for (let i = 0; i < firstDayWeekday; i++) {
    calendarDays.push(null)
  }
  
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(new Date(year, month, day))
  }

  const handleDateClick = (date: Date) => {
    onDateSelect?.(date)
    setIsOpen(false)
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString()
  }

  const isSelected = (date: Date) => {
    return selectedDate && date.toDateString() === selectedDate.toDateString()
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    })
  }

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <Button
        variant="outline"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "w-full justify-start text-left font-normal h-10 px-3 rounded-xl border-gray-200 bg-white hover:bg-gray-50 transition-all",
          !selectedDate && "text-gray-500"
        )}
      >
        <CalendarIcon className="w-4 h-4 mr-2" />
        {selectedDate ? formatDate(selectedDate) : placeholder}
      </Button>

      {isOpen && (
        <Card className="absolute z-50 mt-2 w-72 bg-white/95 backdrop-blur-sm border border-gray-100 shadow-xl rounded-xl overflow-hidden">
          {/* Header */}
          <div className="p-3 border-b border-gray-100 bg-gradient-to-r from-teal-50 to-cyan-50">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900 text-sm">
                {months[month]} {year}
              </h3>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrevMonth}
                  className="h-7 w-7 p-0 hover:bg-white/60 rounded-full"
                >
                  <ChevronLeft className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNextMonth}
                  className="h-7 w-7 p-0 hover:bg-white/60 rounded-full"
                >
                  <ChevronRight className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="p-3">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekdays.map((day) => (
                <div
                  key={day}
                  className="h-6 flex items-center justify-center text-xs font-medium text-gray-500"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((date, index) => (
                <div key={index} className="h-8 flex items-center justify-center">
                  {date ? (
                    <button
                      onClick={() => handleDateClick(date)}
                      className={cn(
                        "w-7 h-7 flex items-center justify-center text-xs rounded-full transition-all duration-150 hover:bg-gray-100",
                        isToday(date) && "bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-medium hover:from-teal-600 hover:to-cyan-600",
                        isSelected(date) && !isToday(date) && "bg-blue-100 text-blue-600 font-medium",
                        !isToday(date) && !isSelected(date) && "text-gray-700 hover:bg-gray-100"
                      )}
                    >
                      {date.getDate()}
                    </button>
                  ) : (
                    <div className="w-7 h-7" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-gray-100 bg-gray-50/50">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDateClick(today)}
                className="text-xs text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-full h-7 px-3"
              >
                Heute
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="text-xs text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded-full h-7 px-3"
              >
                Schließen
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
} 