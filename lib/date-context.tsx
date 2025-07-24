"use client"

import { createContext, useContext, useReducer, useCallback, ReactNode } from 'react'

interface DateState {
  currentDate: Date
  isLoading: boolean
}

interface DateContextValue {
  state: DateState
  setCurrentDate: (date: Date) => void
  navigateMonth: (direction: 'prev' | 'next') => void
  goToToday: () => void
  getCurrentMonth: () => string
  getCurrentYear: () => number
}

type DateAction =
  | { type: 'SET_CURRENT_DATE'; payload: Date }
  | { type: 'SET_LOADING'; payload: boolean }

const initialState: DateState = {
  currentDate: new Date(),
  isLoading: false
}

function dateReducer(state: DateState, action: DateAction): DateState {
  switch (action.type) {
    case 'SET_CURRENT_DATE':
      return {
        ...state,
        currentDate: action.payload
      }
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      }
    default:
      return state
  }
}

const DateContext = createContext<DateContextValue | undefined>(undefined)

// Provider Component
export function DateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(dateReducer, initialState)

  const setCurrentDate = useCallback((date: Date) => {
    dispatch({ type: 'SET_CURRENT_DATE', payload: date })
  }, [])

  const navigateMonth = useCallback((direction: 'prev' | 'next') => {
    const newDate = new Date(state.currentDate)
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    dispatch({ type: 'SET_CURRENT_DATE', payload: newDate })
  }, [state.currentDate])

  const goToToday = useCallback(() => {
    dispatch({ type: 'SET_CURRENT_DATE', payload: new Date() })
  }, [])

  const getCurrentMonth = useCallback(() => {
    return state.currentDate.toLocaleDateString('en-US', { month: 'long' })
  }, [state.currentDate])

  const getCurrentYear = useCallback(() => {
    return state.currentDate.getFullYear()
  }, [state.currentDate])

  const value: DateContextValue = {
    state,
    setCurrentDate,
    navigateMonth,
    goToToday,
    getCurrentMonth,
    getCurrentYear
  }

  return <DateContext.Provider value={value}>{children}</DateContext.Provider>
}

// Custom hook to use the date context
export function useDate(): DateContextValue {
  const context = useContext(DateContext)
  if (context === undefined) {
    throw new Error('useDate must be used within a DateProvider')
  }
  return context
} 