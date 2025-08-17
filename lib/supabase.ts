import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const isSupabaseConfigured = () => !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export function getSupabaseClient() {
	if (!isSupabaseConfigured()) {
		console.error('Supabase is not configured. Please check your environment variables.')
		// return a stub client to prevent crashes during build or environments without Supabase
		const stub: any = {
			from() {
				return {
					select: async () => { throw new Error('Supabase not configured') },
					insert: async () => { throw new Error('Supabase not configured') },
					update: async () => { throw new Error('Supabase not configured') },
					delete: async () => { throw new Error('Supabase not configured') },
				}
			},
			auth: {
				getSession: async () => ({ data: { session: null }, error: new Error('Supabase not configured') }),
				getUser: async () => ({ data: { user: null }, error: new Error('Supabase not configured') }),
			}
		}
		return stub as ReturnType<typeof createClient<Database>>
	}
	return createClient<Database>(
		supabaseUrl!,
		supabaseAnonKey!,
		{
			auth: {
				autoRefreshToken: true,
				persistSession: true,
				detectSessionInUrl: true
			},
			global: {
				fetch: (url, options = {}) => {
					return fetch(url, {
						...options,
						headers: {
							...options.headers,
							'User-Agent': 'social-media-dashboard/1.0'
						}
					})
				}
			}
		}
	)
}

export const supabase = getSupabaseClient()

export const supabaseAdmin = typeof window === 'undefined' && supabaseServiceRoleKey && isSupabaseConfigured()
	? createClient(supabaseUrl!, supabaseServiceRoleKey, {
		auth: { autoRefreshToken: false, persistSession: false },
		global: { fetch }
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
    if (!isSupabaseConfigured()) {
      console.log('Supabase not configured, cannot get current user')
      return null
    }

    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) {
      // Don't log auth session missing as an error - it's normal when not logged in
      if (error.message !== 'Auth session missing!') {
        console.log('Authentication error in getCurrentUser:', error.message)
      }
      return null
    }
    return user
  } catch (error) {
    console.log('Error getting current user:', error)
    return null
  }
}

export const getCurrentUserProfile = async (): Promise<UserProfile | null> => {
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      console.error('Supabase is not configured - missing environment variables')
      return null
    }

    const user = await getCurrentUser()
    if (!user) {
      // Don't log this as it's normal when not authenticated
      return null
    }
    
    console.log('Fetching profile for user:', user.id, user.email)
    
    let data, error
    try {
      const result = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      data = result.data
      error = result.error
    } catch (networkError) {
      console.error('Network error connecting to Supabase:', networkError)
      return null
    }
    
    if (error) {
      // Only log actual errors, not empty objects
      if (error.message || error.code || error.details) {
        console.error('Database error fetching user profile:', {
          message: error?.message || 'Unknown error',
          code: error?.code || 'No code',
          details: error?.details || 'No details',
          hint: error?.hint || 'No hint'
        })
      } else {
        console.log('Empty error object received - likely a connection issue')
      }
      
      // Handle case where user profile doesn't exist yet
      if (error.code === 'PGRST116') {
        console.log('User profile not found, creating default profile for user:', user.id)
        
        // Create a default profile
        const { data: newProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert({
            id: user.id,
            email: user.email || '',
            full_name: user.user_metadata?.full_name || null,
            avatar_url: user.user_metadata?.avatar_url || null,
            subscription_tier: 'free',
            onboarding_completed: false,
            preferences: {}
          })
          .select()
          .single()
        
        if (createError) {
          console.error('Error creating default user profile:', {
            message: createError?.message || 'Unknown error',
            code: createError?.code || 'No code',
            details: createError?.details || 'No details',
            hint: createError?.hint || 'No hint',
            fullError: createError || 'No error object'
          })
          return null
        }
        
        console.log('Successfully created default profile for user:', user.id)
        return newProfile
      }
      
      return null
    }
    
    console.log('Successfully fetched profile for user:', user.id)
    return data
  } catch (error) {
    console.error('Unexpected error in getCurrentUserProfile:', error)
    return null
  }
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