import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Check if Supabase is configured
export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey)
}

// Create Supabase client - only if configured
if (!isSupabaseConfigured()) {
  console.error('Supabase is not configured. Please check your environment variables.')
}

export const supabase = createClient<Database>(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
)

// Admin client for server-side operations (only available on server)
export const supabaseAdmin = typeof window === 'undefined' && supabaseServiceRoleKey && isSupabaseConfigured()
  ? createClient(supabaseUrl!, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

// Database types
export type UserProfile = Database['public']['Tables']['user_profiles']['Row']
export type UserProfileInsert = Database['public']['Tables']['user_profiles']['Insert']
export type UserProfileUpdate = Database['public']['Tables']['user_profiles']['Update']

export type Post = Database['public']['Tables']['posts']['Row']
export type PostInsert = Database['public']['Tables']['posts']['Insert']
export type PostUpdate = Database['public']['Tables']['posts']['Update']

export type SocialAccount = Database['public']['Tables']['social_accounts']['Row']
export type SocialAccountInsert = Database['public']['Tables']['social_accounts']['Insert']
export type SocialAccountUpdate = Database['public']['Tables']['social_accounts']['Update']

export type ContentIdea = Database['public']['Tables']['content_ideas']['Row']
export type ContentIdeaInsert = Database['public']['Tables']['content_ideas']['Insert']
export type ContentIdeaUpdate = Database['public']['Tables']['content_ideas']['Update']

export type CalendarEvent = Database['public']['Tables']['calendar_events']['Row']
export type CalendarEventInsert = Database['public']['Tables']['calendar_events']['Insert']
export type CalendarEventUpdate = Database['public']['Tables']['calendar_events']['Update']

export type PostAnalytics = Database['public']['Tables']['post_analytics']['Row']
export type PostAnalyticsInsert = Database['public']['Tables']['post_analytics']['Insert']
export type PostAnalyticsUpdate = Database['public']['Tables']['post_analytics']['Update']

export type Interaction = Database['public']['Tables']['interactions']['Row']
export type InteractionInsert = Database['public']['Tables']['interactions']['Insert']
export type InteractionUpdate = Database['public']['Tables']['interactions']['Update']

export type ChatMessage = Database['public']['Tables']['chat_messages']['Row']
export type ChatMessageInsert = Database['public']['Tables']['chat_messages']['Insert']
export type ChatMessageUpdate = Database['public']['Tables']['chat_messages']['Update']

export type DashboardSummary = Database['public']['Views']['user_dashboard_summary']['Row']
export type UserStats = Database['public']['Functions']['get_user_stats']['Returns'][0]

// Utility functions
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) {
      console.log('Authentication error in getCurrentUser:', error.message)
      return null
    }
    return user
  } catch (error) {
    console.log('Error getting current user:', error)
    return null
  }
}

export const getCurrentUserProfile = async (): Promise<UserProfile | null> => {
  const user = await getCurrentUser()
  if (!user) return null
  
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  
  if (error) {
    console.error('Error fetching user profile:', error)
    return null
  }
  
  return data
}

export const getDashboardSummary = async (): Promise<DashboardSummary | null> => {
  const user = await getCurrentUser()
  if (!user) return null
  
  const { data, error } = await supabase
    .from('user_dashboard_summary')
    .select('*')
    .eq('id', user.id)
    .single()
  
  if (error) {
    console.error('Error fetching dashboard summary:', error)
    return null
  }
  
  return data
}

export const getUserStats = async (): Promise<UserStats | null> => {
  const user = await getCurrentUser()
  if (!user) return null
  
  const { data, error } = await supabase
    .rpc('get_user_stats', { user_uuid: user.id })
  
  if (error) {
    console.error('Error fetching user stats:', error)
    return null
  }
  
  return data[0] || null
}

// Error handling
export const handleSupabaseError = (error: any) => {
  console.error('Supabase error:', error)
  
  // Handle null/undefined errors
  if (!error) {
    return 'An unexpected error occurred'
  }

  // Handle authentication errors
  if (error?.name === 'AuthApiError' || 
      error?.message?.includes('Invalid Refresh Token') || 
      error?.message?.includes('Refresh Token Not Found') ||
      error?.message?.includes('JWT expired') ||
      error?.message?.includes('session_not_found')) {
    // Force sign out on auth errors
    supabase.auth.signOut()
    return 'Your session has expired. Please log in again.'
  }
  
  // Handle schema cache errors and column issues
  if (error?.message?.includes('schema cache') || 
      error?.message?.includes('column') || 
      error?.message?.includes('does not exist') ||
      error?.code === '42703' || 
      error?.code === '42P01') {
    return 'Database schema error. Please try again or contact support.'
  }
  
  // Handle permission errors
  if (error?.message?.includes('Row Level Security') ||
      error?.message?.includes('permission') ||
      error?.message?.includes('policy')) {
    return 'You do not have permission to access this data'
  }

  // Return user-friendly error messages
  if (error.code === 'PGRST116') {
    return 'No data found'
  } else if (error.code === '23505') {
    return 'A record with this information already exists'
  } else if (error.code === '23503') {
    return 'Cannot delete this record because it is referenced by other data'
  } else if (error.code === '23502') {
    return 'Required field is missing'
  } else if (error.message?.includes('JWT')) {
    return 'Session expired. Please log in again.'
  }

  // Return the original error message or a default one
  return error.message || error.toString() || 'An unexpected error occurred'
} 