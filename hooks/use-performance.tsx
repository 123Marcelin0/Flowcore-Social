"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'

// Cache for storing frequently accessed data
const memoryCache = new Map<string, { data: any; timestamp: number; ttl: number }>()

// Memory cache hook
export function useMemoryCache<T>(key: string, ttl: number = 300000) { // 5 minutes default
  const getCachedData = useCallback((cacheKey: string): T | null => {
    const cached = memoryCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data
    }
    memoryCache.delete(cacheKey)
    return null
  }, [])

  const setCachedData = useCallback((cacheKey: string, data: T, cacheTtl?: number) => {
    memoryCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl: cacheTtl || ttl
    })
  }, [ttl])

  const clearCache = useCallback((cacheKey?: string) => {
    if (cacheKey) {
      memoryCache.delete(cacheKey)
    } else {
      memoryCache.clear()
    }
  }, [])

  return {
    getCachedData: (customKey?: string) => getCachedData(customKey || key),
    setCachedData: (data: T, customKey?: string, cacheTtl?: number) => 
      setCachedData(customKey || key, data, cacheTtl),
    clearCache: (customKey?: string) => clearCache(customKey || key)
  }
}

// Intersection Observer hook for lazy loading
export function useIntersectionObserver(options: IntersectionObserverInit = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const targetRef = useRef<HTMLElement | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    const target = targetRef.current
    if (!target) return

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting)
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options
      }
    )

    observerRef.current.observe(target)

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [options])

  return { ref: targetRef, isIntersecting }
}

// Lazy image loading hook
export function useLazyImage(src: string, placeholder?: string) {
  const [imageSrc, setImageSrc] = useState(placeholder || '')
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const { ref, isIntersecting } = useIntersectionObserver()

  useEffect(() => {
    if (isIntersecting && src) {
      const img = new Image()
      
      img.onload = () => {
        setImageSrc(src)
        setIsLoading(false)
      }
      
      img.onerror = () => {
        setHasError(true)
        setIsLoading(false)
      }
      
      img.src = src
    }
  }, [isIntersecting, src])

  return {
    ref,
    src: imageSrc,
    isLoading,
    hasError
  }
}

// Virtual scrolling hook for large lists
export function useVirtualScroll<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 5
}: {
  items: T[]
  itemHeight: number
  containerHeight: number
  overscan?: number
}) {
  const [scrollTop, setScrollTop] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    )
    return { startIndex, endIndex }
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan])

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1).map((item, index) => ({
      item,
      index: visibleRange.startIndex + index
    }))
  }, [items, visibleRange])

  const totalHeight = items.length * itemHeight

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  return {
    containerRef,
    visibleItems,
    totalHeight,
    handleScroll,
    visibleRange,
    offsetY: visibleRange.startIndex * itemHeight
  }
}

// Debounced value hook for performance
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Throttled callback hook
export function useThrottle(callback: (...args: any[]) => void, delay: number) {
  const lastRan = useRef<number>(0)
  const timeoutRef = useRef<NodeJS.Timeout>()

  return useCallback((...args: any[]) => {
    if (Date.now() - lastRan.current >= delay) {
      callback(...args)
      lastRan.current = Date.now()
    } else {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => {
        callback(...args)
        lastRan.current = Date.now()
      }, delay - (Date.now() - lastRan.current))
    }
  }, [callback, delay])
}

// Performance monitoring hook
export function usePerformanceMonitor(name: string) {
  const startTime = useRef<number>(Date.now())
  const [metrics, setMetrics] = useState<{
    duration: number
    memoryUsed?: number
    renderCount: number
  }>({
    duration: 0,
    renderCount: 0
  })

  useEffect(() => {
    setMetrics(prev => ({
      ...prev,
      renderCount: prev.renderCount + 1,
      duration: Date.now() - startTime.current,
      memoryUsed: (performance as any).memory?.usedJSHeapSize
    }))
  }, [])

  const logPerformance = useCallback(() => {
    const duration = Date.now() - startTime.current
    console.log(`[Performance] ${name}:`, {
      duration: `${duration}ms`,
      renders: metrics.renderCount,
      memory: (performance as any).memory?.usedJSHeapSize ? 
        `${Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024)}MB` : 'N/A'
    })
  }, [name, metrics.renderCount])

  return { metrics, logPerformance }
}

// Batch updates hook for reducing re-renders
export function useBatchUpdates<T>(initialValue: T, batchDelay: number = 50) {
  const [value, setValue] = useState<T>(initialValue)
  const [pendingUpdates, setPendingUpdates] = useState<((prev: T) => T)[]>([])
  const timeoutRef = useRef<NodeJS.Timeout>()

  const batchUpdate = useCallback((updater: (prev: T) => T) => {
    setPendingUpdates(prev => [...prev, updater])
    
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      setPendingUpdates(updates => {
        if (updates.length > 0) {
          setValue(currentValue => {
            return updates.reduce((acc, update) => update(acc), currentValue)
          })
          return []
        }
        return updates
      })
    }, batchDelay)
  }, [batchDelay])

  return [value, batchUpdate] as const
}

// Hook for managing loading states with minimum duration
export function useLoadingState(minDuration: number = 500) {
  const [isLoading, setIsLoading] = useState(false)
  const startTimeRef = useRef<number>(0)

  const startLoading = useCallback(() => {
    startTimeRef.current = Date.now()
    setIsLoading(true)
  }, [])

  const stopLoading = useCallback(() => {
    const elapsed = Date.now() - startTimeRef.current
    const remaining = Math.max(0, minDuration - elapsed)
    
    setTimeout(() => {
      setIsLoading(false)
    }, remaining)
  }, [minDuration])

  return { isLoading, startLoading, stopLoading }
} 