"use client"

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js'
import { supabase, getCurrentUserProfile, UserProfile, isSupabaseConfigured } from './supabase'

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  session: Session | null
  isAuthenticated: boolean
  isLoading: boolean
  authError: string | null
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  // Check if Supabase is configured
  const supabaseConfigured = isSupabaseConfigured()

  // Load user profile from database
  const loadUserProfile = useCallback(async (userId: string) => {
    if (!supabaseConfigured) {
      setAuthError('Supabase is not configured. Please check your environment variables.')
      return
    }
    
    try {
      const profile = await getCurrentUserProfile()
      setUserProfile(profile)
      setAuthError(null)
    } catch (error) {
      console.error('Error loading user profile:', error)
      setUserProfile(null)
      // Don't set auth error for profile loading issues - this is not critical
      // setAuthError('Failed to load user profile')
    }
  }, [supabaseConfigured])

  // Initialize authentication state
  useEffect(() => {
    let mounted = true

    const initAuth = async () => {
      try {
        if (!supabaseConfigured) {
          // If Supabase is not configured, show error and don't allow access
          if (mounted) {
            setUser(null)
            setUserProfile(null)
            setSession(null)
            setAuthError('Supabase is not configured. Please check your environment variables.')
            setLoading(false)
          }
          return
        }

        // Get initial session
        const { data: { session: initialSession }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Authentication error:', error)
          if (mounted) {
            setUser(null)
            setUserProfile(null)
            setSession(null)
            setAuthError(null) // Don't show auth errors to user
            setLoading(false)
          }
          return
        }

        if (mounted) {
          setSession(initialSession)
          setUser(initialSession?.user ?? null)
          setAuthError(null)
          
          if (initialSession?.user) {
            await loadUserProfile(initialSession.user.id)
          }
        }
      } catch (error) {
        console.error('Authentication error:', error)
        if (mounted) {
          setUser(null)
          setUserProfile(null)
          setSession(null)
          setAuthError(error instanceof Error ? error.message : 'Authentication failed')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initAuth()

    // Listen for authentication state changes only if Supabase is configured
    if (supabaseConfigured) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event: AuthChangeEvent, session: Session | null) => {
          if (!mounted) return

          try {
            setSession(session)
            setUser(session?.user ?? null)
            
            if (session?.user) {
              await loadUserProfile(session.user.id)
            } else {
              setUserProfile(null)
            }
            
            setAuthError(null)
          } catch (error) {
            console.error('Auth state change error:', error)
            setAuthError(error instanceof Error ? error.message : 'Authentication state update failed')
          } finally {
            setLoading(false)
          }
        }
      )

      return () => {
        mounted = false
        subscription.unsubscribe()
      }
    }

    return () => {
      mounted = false
    }
  }, [loadUserProfile, supabaseConfigured])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabaseConfigured) {
      return { error: { message: 'Supabase is not configured. Please check your environment variables.' } }
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      return { error }
    } catch (error) {
      return { error: { message: 'Sign in failed. Please try again.' } }
    }
  }, [supabaseConfigured])

  const signUp = useCallback(async (email: string, password: string, fullName?: string) => {
    if (!supabaseConfigured) {
      return { error: { message: 'Supabase is not configured. Please check your environment variables.' } }
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || ''
          }
        }
      })
      return { error }
    } catch (error) {
      return { error: { message: 'Sign up failed. Please try again.' } }
    }
  }, [supabaseConfigured])

  const signOut = useCallback(async () => {
    if (!supabaseConfigured) {
      return
    }

    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }, [supabaseConfigured])

  const refreshProfile = useCallback(async () => {
    if (!supabaseConfigured) {
      return
    }

    if (user) {
      await loadUserProfile(user.id)
    }
  }, [user, loadUserProfile, supabaseConfigured])

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    user,
    userProfile,
    session,
    isAuthenticated: !!user,
    isLoading: loading,
    authError,
    signIn,
    signUp,
    signOut,
    refreshProfile
  }), [user, userProfile, session, loading, authError, signIn, signUp, signOut, refreshProfile])

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

// Protected Route Component
interface ProtectedRouteProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, authError } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (authError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-red-600">Configuration Error</h2>
          <p className="text-gray-600 mb-4">{authError}</p>
          <p className="text-sm text-gray-500">
            Please check your Supabase configuration and try again.
          </p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="text-gray-600">Please log in to access this page.</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// Hook for components that require authentication
export function useRequireAuth() {
  const { user, userProfile, isAuthenticated, isLoading } = useAuth()
  
  if (isLoading) {
    return { user: null, userProfile: null, loading: true }
  }
  
  if (!isAuthenticated) {
    throw new Error('This component requires authentication')
  }
  
  return { user, userProfile, loading: false }
} 