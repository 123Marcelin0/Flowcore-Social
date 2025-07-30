"use client"

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Don't show error boundary for authentication errors
    if (error.message?.includes('JWT') || 
        error.message?.includes('invalid token') || 
        error.message?.includes('auth')) {
      return {}
    }
    
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: uuidv4()
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console and external service
    console.error('Error Boundary caught an error:', error, errorInfo)
    
    // Don't show error boundary for authentication errors
    if (error.message?.includes('JWT') || 
        error.message?.includes('invalid token') || 
        error.message?.includes('auth')) {
      console.log('Authentication error caught, not showing error boundary')
      return
    }
    
    this.setState({
      error,
      errorInfo
    })

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Send error to monitoring service (if available)
    this.reportError(error, errorInfo)
  }

  reportError = (error: Error, errorInfo: ErrorInfo) => {
    try {
      // Here you would send to your error reporting service
      // For now, we'll just log detailed information
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        errorId: this.state.errorId
      }
      
      // Log error report to console
      console.log('Error Report:', errorReport)
      
      // Example: Send to Sentry, LogRocket, or other service
      // Sentry.captureException(error, { contexts: { react: errorInfo } })
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError)
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      const isDevelopment = process.env.NODE_ENV === 'development'

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg">
            <CardContent className="p-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
                
                <h1 className="text-2xl font-bold text-gray-900 mb-4">
                  Something went wrong
                </h1>
                
                <p className="text-gray-600 mb-6">
                  We're sorry, but something unexpected happened. Our team has been notified and is working to fix this issue.
                </p>

                {isDevelopment && this.state.error && (
                  <div className="mb-6 p-4 bg-gray-100 rounded-lg text-left">
                    <div className="text-sm font-medium text-gray-900 mb-2">
                      Error Details (Development Mode):
                    </div>
                    <div className="text-xs text-red-600 font-mono whitespace-pre-wrap">
                      {this.state.error.message}
                    </div>
                    {this.state.errorInfo && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-600 cursor-pointer">
                          Component Stack
                        </summary>
                        <div className="text-xs text-gray-500 font-mono whitespace-pre-wrap mt-1">
                          {this.state.errorInfo.componentStack}
                        </div>
                      </details>
                    )}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button 
                    onClick={this.handleRetry}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={this.handleReload}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Reload Page
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={this.handleGoHome}
                    className="flex items-center gap-2"
                  >
                    <Home className="w-4 h-4" />
                    Go Home
                  </Button>
                </div>

                {this.state.errorId && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      Error ID: {this.state.errorId}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Please include this ID when reporting the issue.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Higher-order component for easier usage
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

// Hook for throwing errors to be caught by Error Boundary
export function useErrorHandler() {
  return (error: Error, errorInfo?: string) => {
    console.error('Manual error throw:', error, errorInfo)
    throw error
  }
} 