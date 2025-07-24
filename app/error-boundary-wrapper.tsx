"use client"

import dynamic from 'next/dynamic'
import { ReactNode } from 'react'

const ErrorBoundary = dynamic(() => import('../components/error-boundary').then(mod => mod.ErrorBoundary), {
  ssr: false
})

export function ErrorBoundaryWrapper({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Log errors to monitoring service
        console.error('Application Error:', error, errorInfo)
        // In production, send to error tracking service like Sentry
      }}
    >
      {children}
    </ErrorBoundary>
  )
} 