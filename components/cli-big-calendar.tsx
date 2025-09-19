"use client";

import { useState } from "react";
import { format, addDays, startOfWeek, endOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Simple calendar component that doesn't depend on complex imports
export default function CliBigCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const handlePrevious = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNext = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Generate calendar grid
  const generateCalendar = () => {
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const firstDayOfWeek = startOfWeek(firstDayOfMonth, { weekStartsOn: 0 });
    const lastDayOfWeek = endOfWeek(lastDayOfMonth, { weekStartsOn: 0 });

    const days = [];
    let current = firstDayOfWeek;

    while (current <= lastDayOfWeek) {
      days.push(new Date(current));
      current = addDays(current, 1);
    }

    return days;
  };

  const calendarDays = generateCalendar();
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">
          {format(currentDate, "MMMM yyyy")}
        </h2>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevious}
            className="p-2"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleToday}
            className="px-3"
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNext}
            className="p-2"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 grid grid-rows-7 gap-1">
        {/* Week days header */}
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day) => (
            <div
              key={day}
              className="h-10 flex items-center justify-center text-sm font-medium text-gray-500 bg-gray-50 rounded"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1 flex-1">
          {calendarDays.map((day, index) => {
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
            const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

            return (
              <div
                key={index}
                className={cn(
                  "min-h-[100px] p-2 border border-gray-200 rounded bg-white hover:bg-gray-50 cursor-pointer transition-colors",
                  !isCurrentMonth && "bg-gray-50 text-gray-400",
                  isToday && "bg-blue-50 border-blue-200"
                )}
              >
                <div
                  className={cn(
                    "text-sm font-medium",
                    isToday && "text-blue-600"
                  )}
                >
                  {format(day, 'd')}
                </div>
                {/* Future: Add events here */}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}