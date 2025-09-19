"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface CalendarContextType {
  // Date management
  currentDate: Date;
  setCurrentDate: (date: Date) => void;

  // Event management
  events: any[];
  setEvents: (events: any[]) => void;
}

const CalendarContext = createContext<CalendarContextType | undefined>(
  undefined,
);

export function useCalendarContext() {
  const context = useContext(CalendarContext);
  if (context === undefined) {
    throw new Error(
      "useCalendarContext must be used within a CalendarProvider",
    );
  }
  return context;
}

interface CalendarProviderProps {
  children: ReactNode;
}

export function CalendarProvider({ children }: CalendarProviderProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<any[]>([]);

  const value = {
    currentDate,
    setCurrentDate,
    events,
    setEvents,
  };

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
}