import { supabase } from './supabase'

export interface UserStrategyProfile {
  user_id: string
  preferred_platforms: string[]
  content_focus: string
  target_audience: string
  posting_frequency: string
  preferred_content_types: string[]
  target_audience_age?: string
  target_audience_type?: string
  active_region?: string
  price_range?: string
  lead_platform?: string
  weekly_content_hours?: number
  unique_selling_points?: string[]
  special_services?: string[]
  brand_positioning?: string
  marketing_goals?: Record<string, any>
  strategy_preferences?: Record<string, any>
}

export async function getUserStrategyProfile(userId?: string): Promise<UserStrategyProfile | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const targetUserId = userId || session?.user?.id
    
    if (!targetUserId) {
      console.warn('No user ID provided for strategy profile fetch')
      return null
    }

    const { data, error } = await supabase.rpc('get_user_strategy_profile', {
      user_uuid: targetUserId
    })

    if (error) {
      console.error('Error fetching user strategy profile:', error)
      return null
    }

    return data?.[0] || null
  } catch (error) {
    console.error('Error in getUserStrategyProfile:', error)
    return null
  }
}

export async function updateUserStrategyProfile(
  updates: Partial<UserStrategyProfile>,
  userId?: string
): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const targetUserId = userId || session?.user?.id
    
    if (!targetUserId) {
      console.warn('No user ID provided for strategy profile update')
      return false
    }

    const { data, error } = await supabase.rpc('update_user_strategy_profile', {
      user_uuid: targetUserId,
      p_target_audience_age: updates.target_audience_age,
      p_target_audience_type: updates.target_audience_type,
      p_active_region: updates.active_region,
      p_price_range: updates.price_range,
      p_lead_platform: updates.lead_platform,
      p_weekly_content_hours: updates.weekly_content_hours,
      p_unique_selling_points: updates.unique_selling_points,
      p_special_services: updates.special_services,
      p_brand_positioning: updates.brand_positioning,
      p_marketing_goals: updates.marketing_goals,
      p_strategy_preferences: updates.strategy_preferences
    })

    if (error) {
      console.error('Error updating user strategy profile:', error)
      return false
    }

    return data === true
  } catch (error) {
    console.error('Error in updateUserStrategyProfile:', error)
    return false
  }
}

export function hasCompleteStrategyProfile(profile: UserStrategyProfile | null): boolean {
  if (!profile) return false
  
  return !!(
    profile.target_audience_age &&
    profile.target_audience_type &&
    profile.active_region &&
    profile.preferred_platforms?.length &&
    profile.brand_positioning
  )
}

export function generateStrategyContextMessage(profile: UserStrategyProfile): string {
  const contextParts = []
  
  if (profile.target_audience_age && profile.target_audience_type) {
    contextParts.push(`**Zielgruppe:** ${profile.target_audience_type} (${profile.target_audience_age})`)
  }
  
  if (profile.active_region) {
    contextParts.push(`**Region:** ${profile.active_region}`)
  }
  
  if (profile.price_range) {
    contextParts.push(`**Preisbereich:** ${profile.price_range}`)
  }
  
  if (profile.preferred_platforms?.length) {
    contextParts.push(`**Aktive Plattformen:** ${profile.preferred_platforms.join(', ')}`)
  }
  
  if (profile.lead_platform) {
    contextParts.push(`**Haupt-Lead-Plattform:** ${profile.lead_platform}`)
  }
  
  if (profile.weekly_content_hours) {
    contextParts.push(`**Wöchentliche Content-Zeit:** ${profile.weekly_content_hours} Stunden`)
  }
  
  if (profile.brand_positioning) {
    contextParts.push(`**Positionierung:** ${profile.brand_positioning === 'expert' ? 'Experte' : 'Nahbarer Berater'}`)
  }
  
  if (profile.unique_selling_points?.length) {
    contextParts.push(`**Alleinstellungsmerkmale:** ${profile.unique_selling_points.join(', ')}`)
  }
  
  if (profile.special_services?.length) {
    contextParts.push(`**Besondere Services:** ${profile.special_services.join(', ')}`)
  }
  
  return contextParts.join('\n')
}

export const STRATEGY_PROFILE_DEFAULTS = {
  target_audience_types: [
    { value: 'erstkaufer', label: 'Erstkäufer (25-35)' },
    { value: 'familien', label: 'Familien (30-45)' },
    { value: 'investoren', label: 'Investoren (40+)' },
    { value: 'senioren', label: 'Senioren (55+)' }
  ],
  price_ranges: [
    { value: 'budget', label: 'Budget (bis 300k)' },
    { value: 'mittelklasse', label: 'Mittelklasse (300k-800k)' },
    { value: 'premium', label: 'Premium (800k-1.5M)' },
    { value: 'luxus', label: 'Luxus (1.5M+)' }
  ],
  brand_positions: [
    { value: 'expert', label: 'Experte' },
    { value: 'approachable_advisor', label: 'Nahbarer Berater' }
  ]
} 