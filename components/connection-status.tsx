"use client"

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Loader2
} from 'lucide-react'
import { usePost } from '@/lib/post-context'
import { toast } from 'sonner'

export function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [showStatus, setShowStatus] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const { state, actions } = usePost()

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setShowStatus(true)
      toast.success('Connection restored', {
        description: 'Syncing latest changes...',
        duration: 3000
      })
      
      // Auto-hide after 3 seconds
      setTimeout(() => setShowStatus(false), 3000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowStatus(true)
      toast.warning('Connection lost', {
        description: 'Changes will be saved locally and synced when online',
        duration: 5000
      })
    }

    // Set initial state
    setIsOnline(navigator.onLine)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Subscribe to sync events
  useEffect(() => {
    const unsubscribe = actions.subscribeToChanges((event) => {
      if (event.type === 'batch_sync') {
        setLastSyncTime(new Date())
        
        // Show brief sync notification
        if (event.source === 'periodic' && isOnline) {
          setShowStatus(true)
          setTimeout(() => setShowStatus(false), 2000)
        }
      }
    })

    return unsubscribe
  }, [actions, isOnline])

  // Handle manual sync
  const handleManualSync = async () => {
    if (!isOnline) {
      toast.error('Cannot sync while offline')
      return
    }

    try {
      await actions.syncPosts('manual')
      setLastSyncTime(new Date())
      toast.success('Sync completed')
    } catch (error) {
      toast.error('Sync failed. Please try again.')
    }
  }

  // Auto-hide status when online and not syncing
  useEffect(() => {
    if (isOnline && state.syncStatus === 'idle' && showStatus) {
      const timer = setTimeout(() => setShowStatus(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [isOnline, state.syncStatus, showStatus])

  // Always show if offline or syncing
  const shouldShow = !isOnline || state.syncStatus !== 'idle' || showStatus

  if (!shouldShow) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={handleManualSync}
          className="bg-white/90 backdrop-blur-sm border-gray-200 hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Sync
        </Button>
      </div>
    )
  }

  const getStatusConfig = () => {
    if (!isOnline) {
      return {
        icon: WifiOff,
        text: 'Offline',
        description: 'Changes saved locally',
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200'
      }
    }

    switch (state.syncStatus) {
      case 'syncing':
        return {
          icon: Loader2,
          text: 'Syncing...',
          description: 'Updating content',
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          animate: true
        }
      case 'error':
        return {
          icon: AlertCircle,
          text: 'Sync Error',
          description: 'Failed to sync',
          color: 'bg-red-100 text-red-800 border-red-200'
        }
      default:
        return {
          icon: CheckCircle,
          text: 'Synced',
          description: lastSyncTime ? `Last sync: ${lastSyncTime.toLocaleTimeString()}` : 'Up to date',
          color: 'bg-green-100 text-green-800 border-green-200'
        }
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className="bg-white/95 backdrop-blur-sm shadow-lg border-gray-200">
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <Badge 
              variant="outline" 
              className={`${config.color} flex items-center gap-1.5 px-3 py-1`}
            >
              <Icon 
                className={`w-3 h-3 ${config.animate ? 'animate-spin' : ''}`} 
              />
              {config.text}
            </Badge>
            
            <div className="flex items-center gap-2">
              {isOnline && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleManualSync}
                  disabled={state.syncStatus === 'syncing'}
                  className="h-8 px-2 text-gray-600 hover:text-gray-900"
                >
                  <RefreshCw 
                    className={`w-4 h-4 ${state.syncStatus === 'syncing' ? 'animate-spin' : ''}`} 
                  />
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowStatus(false)}
                className="h-8 px-2 text-gray-400 hover:text-gray-600"
              >
                ×
              </Button>
            </div>
          </div>
          
          {config.description && (
            <p className="text-xs text-gray-500 mt-1 ml-1">
              {config.description}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Hook for components that need to know connection status
export function useConnectionStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const { state } = usePost()

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    setIsOnline(navigator.onLine)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return {
    isOnline,
    syncStatus: state.syncStatus,
    isLoading: state.loading,
    hasError: !!state.error
  }
} 