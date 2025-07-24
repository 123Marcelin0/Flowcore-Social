"use client"

import * as React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Clock } from "lucide-react"

interface TimePickerProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function TimePicker({ value, onChange, className }: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [hours, minutes] = value.split(":").map(Number)
  const containerRef = useRef<HTMLDivElement>(null)
  const hoursRef = useRef<HTMLDivElement>(null)
  const minutesRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const [dropdownWidth, setDropdownWidth] = useState(0)
  const [isScrolling, setIsScrolling] = useState({ hours: false, minutes: false })

  useEffect(() => {
    if (triggerRef.current) {
      setDropdownWidth(triggerRef.current.offsetWidth)
    }
  }, [isOpen])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Handle scroll-based selection
  useEffect(() => {
    if (!isOpen) return

    const hoursElement = hoursRef.current
    const minutesElement = minutesRef.current

    if (!hoursElement || !minutesElement) return

    // Set initial scroll position
    const hourSet = Math.floor(hours / 24)
    const minuteSet = Math.floor(minutes / 60)
    hoursElement.scrollTop = (hours + hourSet * 24) * 40 - (3 * 40)
    minutesElement.scrollTop = (minutes + minuteSet * 60) * 40 - (3 * 40)

    let hoursScrollTimeout: NodeJS.Timeout
    let minutesScrollTimeout: NodeJS.Timeout
    let lastHoursScrollTop = hoursElement.scrollTop
    let lastMinutesScrollTop = minutesElement.scrollTop

    const handleHoursScroll = () => {
      if (isScrolling.hours) return

      const currentScrollTop = hoursElement.scrollTop
      if (Math.abs(currentScrollTop - lastHoursScrollTop) < 5) return // Ignore tiny scroll adjustments
      lastHoursScrollTop = currentScrollTop

      clearTimeout(hoursScrollTimeout)
      
      hoursScrollTimeout = setTimeout(() => {
        const totalHeight = 24 * 40
        const scrollPosition = hoursElement.scrollTop + (3 * 40)
        const normalizedPosition = ((scrollPosition % totalHeight) + totalHeight) % totalHeight
        const newHours = Math.round(normalizedPosition / 40) % 24

        // Calculate exact target position for the selected hour
        const middleSet = Math.floor(5 / 2) * totalHeight
        const targetScroll = middleSet + (newHours * 40) - (3 * 40)

        // Only adjust if significantly off target
        if (Math.abs(hoursElement.scrollTop - targetScroll) > 10) {
          hoursElement.scrollTo({
            top: targetScroll,
            behavior: 'smooth'
          })
        }

        const formattedHours = String(newHours).padStart(2, "0")
        const formattedMinutes = String(minutes).padStart(2, "0")
        onChange(`${formattedHours}:${formattedMinutes}`)

        // Maintain infinite scroll
        if (hoursElement.scrollTop < totalHeight) {
          hoursElement.scrollTop += totalHeight
        } else if (hoursElement.scrollTop > totalHeight * 3) {
          hoursElement.scrollTop -= totalHeight
        }
      }, 100) // Reduced timeout for more responsive feel
    }

    const handleMinutesScroll = () => {
      if (isScrolling.minutes) return

      const currentScrollTop = minutesElement.scrollTop
      if (Math.abs(currentScrollTop - lastMinutesScrollTop) < 5) return // Ignore tiny scroll adjustments
      lastMinutesScrollTop = currentScrollTop

      clearTimeout(minutesScrollTimeout)
      
      minutesScrollTimeout = setTimeout(() => {
        const totalHeight = 60 * 40
        const scrollPosition = minutesElement.scrollTop + (3 * 40)
        const normalizedPosition = ((scrollPosition % totalHeight) + totalHeight) % totalHeight
        const newMinutes = Math.round(normalizedPosition / 40) % 60

        // Calculate exact target position for the selected minute
        const middleSet = Math.floor(5 / 2) * totalHeight
        const targetScroll = middleSet + (newMinutes * 40) - (3 * 40)

        // Only adjust if significantly off target
        if (Math.abs(minutesElement.scrollTop - targetScroll) > 10) {
          minutesElement.scrollTo({
            top: targetScroll,
            behavior: 'smooth'
          })
        }

        const formattedHours = String(hours).padStart(2, "0")
        const formattedMinutes = String(newMinutes).padStart(2, "0")
        onChange(`${formattedHours}:${formattedMinutes}`)

        // Maintain infinite scroll
        if (minutesElement.scrollTop < totalHeight) {
          minutesElement.scrollTop += totalHeight
        } else if (minutesElement.scrollTop > totalHeight * 3) {
          minutesElement.scrollTop -= totalHeight
        }
      }, 100) // Reduced timeout for more responsive feel
    }

    hoursElement.addEventListener('scroll', handleHoursScroll)
    minutesElement.addEventListener('scroll', handleMinutesScroll)

    return () => {
      hoursElement.removeEventListener('scroll', handleHoursScroll)
      minutesElement.removeEventListener('scroll', handleMinutesScroll)
      clearTimeout(hoursScrollTimeout)
      clearTimeout(minutesScrollTimeout)
    }
  }, [isOpen, hours, minutes, onChange, isScrolling])

  // Handle click selection
  const handleTimeClick = (type: 'hours' | 'minutes', value: number) => {
    const formattedHours = String(type === 'hours' ? value : hours).padStart(2, "0")
    const formattedMinutes = String(type === 'minutes' ? value : minutes).padStart(2, "0")
    onChange(`${formattedHours}:${formattedMinutes}`)

    setIsScrolling(prev => ({ ...prev, [type]: true }))

    const element = type === 'hours' ? hoursRef.current : minutesRef.current
    if (element) {
      const totalHeight = type === 'hours' ? 24 * 40 : 60 * 40
      const middleSet = Math.floor(5 / 2) * totalHeight
      const targetScroll = middleSet + (value * 40) - (3 * 40)
      
      element.scrollTo({
        top: targetScroll,
        behavior: 'smooth'
      })

      // Reset scrolling flag after animation
      setTimeout(() => {
        setIsScrolling(prev => ({ ...prev, [type]: false }))
      }, 300) // Reduced animation time for snappier feel
    }
  }

  // Generate multiple sets of hours and minutes for infinite scroll
  const hoursList = [...Array(5)].flatMap(() => 
    Array.from({ length: 24 }, (_, i) => i)
  )
  
  const minutesList = [...Array(5)].flatMap(() => 
    Array.from({ length: 60 }, (_, i) => i)
  )

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <div 
        ref={triggerRef}
        className="relative group cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Input
          type="text"
          value={value}
          readOnly
          className="pl-9 h-10 text-sm bg-white rounded-xl border-gray-200 
          focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all
          group-hover:border-teal-300 cursor-pointer"
        />
        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 
          bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full flex items-center justify-center
          group-hover:from-teal-600 group-hover:to-cyan-600 transition-all pointer-events-none">
          <Clock className="w-3 h-3 text-white" />
        </div>
      </div>

      {isOpen && (
        <div 
          className="absolute z-50 mt-2 bg-white rounded-xl border border-gray-200 shadow-xl 
          overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100"
          style={{ width: `${dropdownWidth}px` }}
        >
          <div className="flex relative h-[280px]">
            {/* Static selection marker */}
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[40px] 
              bg-gradient-to-r from-teal-500/10 to-cyan-500/10 pointer-events-none
              border-y border-y-teal-500/20 z-10" />

            {/* Hours */}
            <div className="flex-1 relative">
              <div 
                ref={hoursRef}
                className="h-full overflow-y-scroll no-scrollbar scroll-smooth"
                style={{ scrollbarWidth: 'none' }}
              >
                <div className="h-[120px]" /> {/* Top padding */}
                {hoursList.map((hour, index) => (
                  <div
                    key={`${hour}-${index}`}
                    className={cn(
                      "h-[40px] flex items-center justify-center text-base font-medium cursor-pointer",
                      "hover:bg-gray-50 transition-colors",
                      hour === hours && "text-teal-600"
                    )}
                    onClick={() => handleTimeClick('hours', hour)}
                  >
                    {String(hour).padStart(2, "0")}
                  </div>
                ))}
                <div className="h-[120px]" /> {/* Bottom padding */}
              </div>
            </div>

            {/* Minutes */}
            <div className="flex-1 relative border-l border-gray-100">
              <div 
                ref={minutesRef}
                className="h-full overflow-y-scroll no-scrollbar scroll-smooth"
                style={{ scrollbarWidth: 'none' }}
              >
                <div className="h-[120px]" /> {/* Top padding */}
                {minutesList.map((minute, index) => (
                  <div
                    key={`${minute}-${index}`}
                    className={cn(
                      "h-[40px] flex items-center justify-center text-base font-medium cursor-pointer",
                      "hover:bg-gray-50 transition-colors",
                      minute === minutes && "text-teal-600"
                    )}
                    onClick={() => handleTimeClick('minutes', minute)}
                  >
                    {String(minute).padStart(2, "0")}
                  </div>
                ))}
                <div className="h-[120px]" /> {/* Bottom padding */}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 