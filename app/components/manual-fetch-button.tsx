'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { 
  RefreshCw, 
  Zap, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  BarChart3,
  ExternalLink
} from 'lucide-react'

interface ManualFetchButtonProps {
  postId: string
  platform?: string
  size?: 'sm' | 'default' | 'lg'
  variant?: 'default' | 'outline' | 'ghost'
  showLabel?: boolean
  disabled?: boolean
  onSuccess?: (data: any) => void
  onError?: (error: string) => void
}

export default function ManualFetchButton({
  postId,
  platform,
  size = 'sm',
  variant = 'outline',
  showLabel = true,
  disabled = false,
  onSuccess,
  onError
}: ManualFetchButtonProps) {
  const [fetchStatus, setFetchStatus] = useState<'idle' | 'fetching' | 'success' | 'error'>('idle')
  const [lastFetched, setLastFetched] = useState<Date | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const triggerFetch = async () => {
    if (disabled || fetchStatus === 'fetching') return

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    setFetchStatus('fetching')
    setErrorMessage(null)

    try {
      const response = await fetch('/api/manual-webhook-trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          postId: postId,
          platform: platform
        }),
        signal: AbortSignal.timeout(30000) // 30 second timeout
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success) {
        setFetchStatus('success')
        setLastFetched(new Date())
        onSuccess?.(data)

        // Reset to idle after 3 seconds
        timeoutRef.current = setTimeout(() => {
          setFetchStatus('idle')
        }, 3000)
      } else {
        setFetchStatus('error')
        setErrorMessage(data.error || 'Failed to trigger fetch')
        onError?.(data.error || 'Failed to trigger fetch')

        // Reset to idle after 5 seconds
        timeoutRef.current = setTimeout(() => {
          setFetchStatus('idle')
        }, 5000)
      }
    } catch (error) {
      console.error('Error triggering fetch:', error)
      const errorMsg = error instanceof Error ? error.message : 'Network error occurred'
      setErrorMessage(errorMsg)
      onError?.(errorMsg)

      // Reset to idle after 5 seconds
      timeoutRef.current = setTimeout(() => {
        setFetchStatus('idle')
      }, 5000)
    }
  }

  const getButtonContent = () => {
    switch (fetchStatus) {
      case 'fetching':
        return (
          <>
            <RefreshCw className={`${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} animate-spin`} />
            {showLabel && <span>Fetching...</span>}
          </>
        )
      case 'success':
        return (
          <>
            <CheckCircle className={`${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} text-green-600`} />
            {showLabel && <span>Fetched!</span>}
          </>
        )
      case 'error':
        return (
          <>
            <AlertCircle className={`${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} text-red-600`} />
            {showLabel && <span>Error</span>}
          </>
        )
      default:
        return (
          <>
            <BarChart3 className={`${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'}`} />
            {showLabel && <span>Fetch Insights</span>}
          </>
        )
    }
  }

  const getTooltipContent = () => {
    switch (fetchStatus) {
      case 'fetching':
        return 'Triggering Make.com to fetch latest insights from social media...'
      case 'success':
        return `Successfully triggered! Last fetched: ${lastFetched?.toLocaleTimeString()}`
      case 'error':
        return `Error: ${errorMessage}`
      default:
        return 'Manually trigger Make.com to fetch latest insights for this post'
    }
  }

  const getButtonVariant = () => {
    if (fetchStatus === 'success') return 'default'
    if (fetchStatus === 'error') return 'destructive'
    return variant
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={triggerFetch}
              disabled={disabled || fetchStatus === 'fetching'}
              variant={getButtonVariant()}
              size={size}
              className={`
                flex items-center gap-2 transition-all duration-200
                ${fetchStatus === 'success' ? 'bg-green-100 text-green-700 border-green-300' : ''}
                ${fetchStatus === 'error' ? 'bg-red-100 text-red-700 border-red-300' : ''}
              `}
            >
              {getButtonContent()}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="max-w-xs">
              <p className="text-sm">{getTooltipContent()}</p>
              {platform && (
                <p className="text-xs text-gray-500 mt-1">Platform: {platform}</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Status Badge */}
        {lastFetched && fetchStatus === 'idle' && (
          <Badge variant="secondary" className="text-xs">
            <Clock className="w-3 h-3 mr-1" />
            {getTimeAgo(lastFetched)}
          </Badge>
        )}
      </div>
    </TooltipProvider>
  )
}

// Compact version for use in post cards
export function CompactFetchButton({
  postId,
  platform,
  onSuccess,
  onError
}: {
  postId: string
  platform?: string
  onSuccess?: (data: any) => void
  onError?: (error: string) => void
}) {
  return (
    <ManualFetchButton
      postId={postId}
      platform={platform}
      size="sm"
      variant="ghost"
      showLabel={false}
      onSuccess={onSuccess}
      onError={onError}
    />
  )
}

// Full-featured version for detailed views
export function DetailedFetchButton({
  postId,
  platform,
  onSuccess,
  onError
}: {
  postId: string
  platform?: string
  onSuccess?: (data: any) => void
  onError?: (error: string) => void
}) {
  return (
    <ManualFetchButton
      postId={postId}
      platform={platform}
      size="default"
      variant="outline"
      showLabel={true}
      onSuccess={onSuccess}
      onError={onError}
    />
  )
}

// Utility function to format time ago
function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
  
  if (diffInMinutes < 1) return 'now'
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`
  
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours}h ago`
  
  const diffInDays = Math.floor(diffInHours / 24)
  return `${diffInDays}d ago`
} 