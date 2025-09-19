"use client"

import React from 'react'

type Props = { children: React.ReactNode; fallback?: React.ReactNode }

type State = { hasError: boolean; error?: any }

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error }
  }

  componentDidCatch(error: any, info: any) {
    console.error('Video editor error boundary caught:', error, info)
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-6 text-white/90">
          <div className="text-lg mb-2">Something went wrong.</div>
          <div className="text-sm text-white/70">Try reloading the page or checking console logs.</div>
        </div>
      )
    }
    return this.props.children
  }
}































