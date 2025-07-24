"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { TimePicker } from "@/components/ui/time-picker"

interface TimeInterval {
  startDate: Date
  startTime?: string
  endDate?: Date
  endTime?: string
}

interface CalendarPopupProps {
  selectedInterval?: TimeInterval
  onIntervalSelect?: (interval: TimeInterval) => void
  onClose?: () => void
  onConfirm?: (interval: TimeInterval) => void
  isOpen?: boolean
  className?: string
  showTimeSelect?: boolean
  singleDateMode?: boolean // New prop for post scheduling
}

const months = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember"
]

const weekdays = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"]

// Add global styles for time input
const timeInputStyles = `
  input[type="time"]::-webkit-time-picker-popup {
    border-radius: 12px;
    padding: 8px;
    background: white;
    border: 1px solid #e5e7eb;
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
    animation: timePickerFadeIn 0.2s ease-out;
    transform-origin: top;
  }
  
  @keyframes timePickerFadeIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  
  input[type="time"]::-webkit-time-picker-popup::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  
  input[type="time"]::-webkit-time-picker-popup::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 3px;
  }
  
  input[type="time"]::-webkit-time-picker-popup::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }
  
  input[type="time"]::-webkit-time-picker-popup::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }

  input[type="time"]::-webkit-time-picker-popup option {
    padding: 8px 12px;
    font-size: 14px;
    color: #374151;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  input[type="time"]::-webkit-time-picker-popup option:hover {
    background: #f3f4f6;
  }

  input[type="time"]::-webkit-time-picker-popup option:checked {
    background: linear-gradient(to right, #2dd4bf, #0d9488);
    color: white;
  }

  input[type="time"]::-webkit-calendar-picker-indicator {
    opacity: 0;
    cursor: pointer;
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
  }
`

export function CalendarPopup({
  selectedInterval,
  onIntervalSelect,
  onClose,
  onConfirm,
  isOpen = false,
  className,
  showTimeSelect = true,
  singleDateMode = false // New prop with default value
}: CalendarPopupProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [animationClass, setAnimationClass] = useState("")
  const [interval, setInterval] = useState<TimeInterval>({
    startDate: selectedInterval?.startDate || new Date(),
    startTime: selectedInterval?.startTime || "09:00",
    endDate: selectedInterval?.endDate,
    endTime: selectedInterval?.endTime || "17:00"
  })
  const [selectingEnd, setSelectingEnd] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setAnimationClass("animate-in fade-in-0 zoom-in-95 duration-200")
    } else {
      setAnimationClass("animate-out fade-out-0 zoom-out-95 duration-150")
    }
  }, [isOpen])

  // Inject global styles
  useEffect(() => {
    const styleElement = document.createElement('style')
    styleElement.textContent = timeInputStyles
    document.head.appendChild(styleElement)
    return () => {
      document.head.removeChild(styleElement)
    }
  }, [])

  // Prevent escape key and outside clicks from closing the modal
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        // Don't close the modal - only "Abbrechen" button can close it
      }
    }

    // Add event listeners to capture escape key at document level
    document.addEventListener('keydown', handleKeyDown, true)
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [isOpen])

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
    if (singleDateMode) {
      // Single date selection for post scheduling
      const newInterval = {
        ...interval,
        startDate: date,
        endDate: date // Set same date for both start and end
      }
      setInterval(newInterval)
      onIntervalSelect?.(newInterval)
    } else {
      // Original range selection logic
      if (!selectingEnd) {
        // Selecting start date
        setInterval(prev => ({
          ...prev,
          startDate: date,
          endDate: undefined
        }))
        setSelectingEnd(true)
      } else {
        // Selecting end date
        if (date >= interval.startDate) {
          setInterval(prev => ({
            ...prev,
            endDate: date
          }))
          onIntervalSelect?.({
            ...interval,
            endDate: date
          })
          setSelectingEnd(false)
        }
      }
    }
  }

  const handleTimeChange = (value: string, type: 'start' | 'end') => {
    const newInterval = {
      ...interval,
      [type === 'start' ? 'startTime' : 'endTime']: value
    }
    setInterval(newInterval)
    if (interval.endDate) {
      onIntervalSelect?.(newInterval)
    }
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

  const isInRange = (date: Date) => {
    if (!interval.endDate) return false
    return date >= interval.startDate && date <= interval.endDate
  }

  const isRangeEnd = (date: Date) => {
    return interval.endDate && date.toDateString() === interval.endDate.toDateString()
  }

  const isRangeStart = (date: Date) => {
    return date.toDateString() === interval.startDate.toDateString()
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    })
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onMouseDown={(e) => {
        // Prevent event from bubbling up to parent dialogs
        e.stopPropagation()
      }}
      onKeyDown={(e) => {
        // Prevent escape key from closing the modal
        if (e.key === 'Escape') {
          e.preventDefault()
          e.stopPropagation()
        }
      }}
      style={{ pointerEvents: 'auto' }}
    >
      <Card 
        className={cn(
          "w-[420px] bg-white border-2 border-gray-200 shadow-2xl rounded-2xl overflow-hidden",
          animationClass,
          className
        )}
        onClick={(e) => {
          // Prevent any propagation of click events
          e.stopPropagation()
        }}
        onMouseDown={(e) => {
          // Prevent event from bubbling up to parent dialogs
          e.stopPropagation()
        }}
        onKeyDown={(e) => {
          // Prevent escape key from closing inside the card as well
          if (e.key === 'Escape') {
            e.preventDefault()
            e.stopPropagation()
          }
        }}
        style={{ pointerEvents: 'auto', zIndex: 9999 }}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-teal-50 via-cyan-50 to-blue-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg">
                <CalendarIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">
                  {singleDateMode ? "Start auswählen" : (selectingEnd ? "Ende auswählen" : "Start auswählen")}
                </h3>
                <p className="text-sm text-gray-600 font-medium">
                  {months[month]} {year}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handlePrevMonth()
                }}
                className="h-8 w-8 p-0 hover:bg-white/60 rounded-full"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleNextMonth()
                }}
                className="h-8 w-8 p-0 hover:bg-white/60 rounded-full"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Time Selection */}
        {showTimeSelect && (
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50/50 to-gray-100/50">
            <div className="flex items-center gap-6">
              <div className="flex-1 space-y-2">
                <label className="text-xs font-medium text-gray-600">Startzeit</label>
                <TimePicker
                  value={interval.startTime || "09:00"}
                  onChange={(value) => handleTimeChange(value, 'start')}
                />
              </div>
              {!singleDateMode && (
                <div className="flex-1 space-y-2">
                  <label className="text-xs font-medium text-gray-600">Endzeit</label>
                  <TimePicker
                    value={interval.endTime || "17:00"}
                    onChange={(value) => handleTimeChange(value, 'end')}
                  />
                </div>
              )}
              {singleDateMode && (
                <div className="flex-1 space-y-2">
                  <label className="text-xs font-medium text-gray-400 flex items-center gap-1">
                    <span>Endzeit</span>
                    <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </label>
                  <div className="relative">
                    <div className="h-10 px-3 py-2 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-400 flex items-center justify-between pointer-events-none">
                      <span>{interval.endTime || "17:00"}</span>
                      <Clock className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Calendar Grid */}
        <div className="p-4">
          {/* Selected Range Display */}
          <div className="mb-4 flex items-center gap-2 text-sm">
            <div className="flex-1">
              <div className="text-xs font-medium text-gray-500 mb-1">Start</div>
              <div className="font-medium text-gray-900">{formatDate(interval.startDate)}</div>
            </div>
            {!singleDateMode && interval.endDate && (
              <div className="flex-1">
                <div className="text-xs font-medium text-gray-500 mb-1">Ende</div>
                <div className="font-medium text-gray-900">{formatDate(interval.endDate)}</div>
              </div>
            )}
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekdays.map((day) => (
              <div
                key={day}
                className="h-8 flex items-center justify-center text-xs font-medium text-gray-500"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((date, index) => (
              <div key={index} className="h-10 flex items-center justify-center">
                {date ? (
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleDateClick(date)
                    }}
                    disabled={!singleDateMode && selectingEnd && date < interval.startDate}
                    className={cn(
                      "w-8 h-8 flex items-center justify-center text-sm rounded-full transition-all duration-150",
                      isToday(date) && !isRangeStart(date) && !isRangeEnd(date) && "bg-blue-50 text-blue-600 font-medium hover:bg-blue-100",
                      isRangeStart(date) && "bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-medium hover:from-teal-600 hover:to-cyan-600",
                      !singleDateMode && isRangeEnd(date) && "bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-medium hover:from-teal-600 hover:to-cyan-600",
                      !singleDateMode && isInRange(date) && !isRangeStart(date) && !isRangeEnd(date) && "bg-gradient-to-r from-teal-50 to-cyan-50 text-teal-600",
                      !isToday(date) && !isInRange(date) && !isRangeStart(date) && !isRangeEnd(date) && "text-gray-700 hover:bg-gray-100",
                      !singleDateMode && selectingEnd && date < interval.startDate && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {date.getDate()}
                  </button>
                ) : (
                  <div className="w-8 h-8" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                const todayInterval = {
                  startDate: today,
                  startTime: interval.startTime,
                  endDate: singleDateMode ? today : today,
                  endTime: interval.endTime
                }
                setInterval(todayInterval)
                onIntervalSelect?.(todayInterval)
              }}
              className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-full"
            >
              Heute
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setInterval({
                    startDate: selectedInterval?.startDate || new Date(),
                    startTime: selectedInterval?.startTime || "09:00",
                    endDate: selectedInterval?.endDate,
                    endTime: selectedInterval?.endTime || "17:00"
                  })
                  setSelectingEnd(false)
                  onClose?.()
                }}
                className="text-gray-700 hover:text-gray-900 hover:bg-red-50 border border-gray-300 hover:border-red-300 rounded-full font-medium transition-all duration-200"
              >
                ✕ Abbrechen
              </Button>
              <Button
                size="sm"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  if (singleDateMode || interval.endDate) {
                    if (onConfirm) {
                      onConfirm(interval)
                    } else {
                      onIntervalSelect?.(interval)
                      onClose?.()
                    }
                  }
                }}
                disabled={!singleDateMode && !interval.endDate}
                className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-full"
              >
                Datum übernehmen
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
} 