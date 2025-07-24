export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          bio: string | null
          website: string | null
          subscription_tier: 'free' | 'pro' | 'enterprise'
          onboarding_completed: boolean
          preferences: Record<string, any>
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          website?: string | null
          subscription_tier?: 'free' | 'pro' | 'enterprise'
          onboarding_completed?: boolean
          preferences?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          website?: string | null
          subscription_tier?: 'free' | 'pro' | 'enterprise'
          onboarding_completed?: boolean
          preferences?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
      }
      posts: {
        Row: {
          id: string
          user_id: string
          title: string | null
          content: string
          media_urls: string[]
          media_type: 'image' | 'video' | 'text' | 'carousel'
          platforms: string[]
          status: 'draft' | 'scheduled' | 'published' | 'failed'
          scheduled_at: string | null
          published_at: string | null
          tags: string[]
          likes: number
          comments_count: number
          shares: number
          reach: number
          impressions: number
          metadata: Record<string, any>
          embedding: number[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title?: string | null
          content: string
          media_urls?: string[]
          media_type?: 'image' | 'video' | 'text' | 'carousel'
          platforms?: string[]
          status?: 'draft' | 'scheduled' | 'published' | 'failed'
          scheduled_at?: string | null
          published_at?: string | null
          tags?: string[]
          likes?: number
          comments_count?: number
          shares?: number
          reach?: number
          impressions?: number
          metadata?: Record<string, any>
          embedding?: number[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string | null
          content?: string
          media_urls?: string[]
          media_type?: 'image' | 'video' | 'text' | 'carousel'
          platforms?: string[]
          status?: 'draft' | 'scheduled' | 'published' | 'failed'
          scheduled_at?: string | null
          published_at?: string | null
          tags?: string[]
          likes?: number
          comments_count?: number
          shares?: number
          reach?: number
          impressions?: number
          metadata?: Record<string, any>
          embedding?: number[] | null
          created_at?: string
          updated_at?: string
        }
      }
      social_accounts: {
        Row: {
          id: string
          user_id: string
          platform: 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'tiktok' | 'youtube' | 'pinterest'
          username: string
          display_name: string | null
          profile_image_url: string | null
          access_token: string | null
          refresh_token: string | null
          token_expires_at: string | null
          status: 'connected' | 'expired' | 'error' | 'disconnected'
          platform_metadata: Record<string, any>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          platform: 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'tiktok' | 'youtube' | 'pinterest'
          username: string
          display_name?: string | null
          profile_image_url?: string | null
          access_token?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          status?: 'connected' | 'expired' | 'error' | 'disconnected'
          platform_metadata?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          platform?: 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'tiktok' | 'youtube' | 'pinterest'
          username?: string
          display_name?: string | null
          profile_image_url?: string | null
          access_token?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          status?: 'connected' | 'expired' | 'error' | 'disconnected'
          platform_metadata?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
      }
      content_ideas: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string
          content_type: 'video' | 'image' | 'text' | 'reel' | 'story' | 'carousel'
          platforms: string[]
          tags: string[]
          category: string | null
          priority: 'low' | 'medium' | 'high'
          status: 'idea' | 'in_progress' | 'completed' | 'archived'
          due_date: string | null
          notes: string | null
          is_saved: boolean
          metadata: Record<string, any>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description: string
          content_type: 'video' | 'image' | 'text' | 'reel' | 'story' | 'carousel'
          platforms?: string[]
          tags?: string[]
          category?: string | null
          priority?: 'low' | 'medium' | 'high'
          status?: 'idea' | 'in_progress' | 'completed' | 'archived'
          due_date?: string | null
          notes?: string | null
          is_saved?: boolean
          metadata?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string
          content_type?: 'video' | 'image' | 'text' | 'reel' | 'story' | 'carousel'
          platforms?: string[]
          tags?: string[]
          category?: string | null
          priority?: 'low' | 'medium' | 'high'
          status?: 'idea' | 'in_progress' | 'completed' | 'archived'
          due_date?: string | null
          notes?: string | null
          is_saved?: boolean
          metadata?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
      }
      calendar_events: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          start_date: string
          end_date: string
          start_time: string | null
          end_time: string | null
          timezone: string
          category: string
          color: string
          all_day: boolean
          is_recurring: boolean
          recurrence_pattern: string | null
          recurrence_end_date: string | null
          location: string | null
          attendees: string[]
          reminders: number[]
          status: 'confirmed' | 'tentative' | 'cancelled'
          metadata: Record<string, any>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          start_date: string
          end_date: string
          start_time?: string | null
          end_time?: string | null
          timezone?: string
          category: string
          color?: string
          all_day?: boolean
          is_recurring?: boolean
          recurrence_pattern?: string | null
          recurrence_end_date?: string | null
          location?: string | null
          attendees?: string[]
          reminders?: number[]
          status?: 'confirmed' | 'tentative' | 'cancelled'
          metadata?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          start_date?: string
          end_date?: string
          start_time?: string | null
          end_time?: string | null
          timezone?: string
          category?: string
          color?: string
          all_day?: boolean
          is_recurring?: boolean
          recurrence_pattern?: string | null
          recurrence_end_date?: string | null
          location?: string | null
          attendees?: string[]
          reminders?: number[]
          status?: 'confirmed' | 'tentative' | 'cancelled'
          metadata?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
      }
      post_analytics: {
        Row: {
          id: string
          post_id: string
          user_id: string
          platform: string
          external_post_id: string | null
          impressions: number
          reach: number
          engagement: number
          likes: number
          comments: number
          shares: number
          saves: number
          clicks: number
          video_views: number
          profile_visits: number
          website_clicks: number
          engagement_rate: number
          recorded_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          platform: string
          external_post_id?: string | null
          impressions?: number
          reach?: number
          engagement?: number
          likes?: number
          comments?: number
          shares?: number
          saves?: number
          clicks?: number
          video_views?: number
          profile_visits?: number
          website_clicks?: number
          engagement_rate?: number
          recorded_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          platform?: string
          external_post_id?: string | null
          impressions?: number
          reach?: number
          engagement?: number
          likes?: number
          comments?: number
          shares?: number
          saves?: number
          clicks?: number
          video_views?: number
          profile_visits?: number
          website_clicks?: number
          engagement_rate?: number
          recorded_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      interactions: {
        Row: {
          id: string
          user_id: string
          post_id: string | null
          platform: string
          interaction_type: 'comment' | 'dm' | 'mention' | 'reply' | 'like'
          sender_name: string
          sender_username: string
          sender_avatar_url: string | null
          message: string
          ai_suggestion: string | null
          sentiment: 'positive' | 'neutral' | 'negative'
          priority: 'low' | 'medium' | 'high'
          status: 'pending' | 'replied' | 'dismissed' | 'archived'
          replied_at: string | null
          external_interaction_id: string | null
          metadata: Record<string, any>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          post_id?: string | null
          platform: string
          interaction_type: 'comment' | 'dm' | 'mention' | 'reply' | 'like'
          sender_name: string
          sender_username: string
          sender_avatar_url?: string | null
          message: string
          ai_suggestion?: string | null
          sentiment?: 'positive' | 'neutral' | 'negative'
          priority?: 'low' | 'medium' | 'high'
          status?: 'pending' | 'replied' | 'dismissed' | 'archived'
          replied_at?: string | null
          external_interaction_id?: string | null
          metadata?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          post_id?: string | null
          platform?: string
          interaction_type?: 'comment' | 'dm' | 'mention' | 'reply' | 'like'
          sender_name?: string
          sender_username?: string
          sender_avatar_url?: string | null
          message?: string
          ai_suggestion?: string | null
          sentiment?: 'positive' | 'neutral' | 'negative'
          priority?: 'low' | 'medium' | 'high'
          status?: 'pending' | 'replied' | 'dismissed' | 'archived'
          replied_at?: string | null
          external_interaction_id?: string | null
          metadata?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
      }
      chat_messages: {
        Row: {
          id: string
          user_id: string
          conversation_id: string
          role: 'user' | 'assistant'
          content: string
          embedding: number[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          conversation_id: string
          role: 'user' | 'assistant'
          content: string
          embedding?: number[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          conversation_id?: string
          role?: 'user' | 'assistant'
          content?: string
          embedding?: number[] | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      user_dashboard_summary: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          subscription_tier: 'free' | 'pro' | 'enterprise'
          created_at: string
          total_posts: number
          published_posts: number
          draft_posts: number
          scheduled_posts: number
          connected_accounts: number
          total_content_ideas: number
          total_interactions: number
          pending_interactions: number
          total_likes: number
          total_comments: number
          total_shares: number
        }
      }
    }
    Functions: {
      get_user_stats: {
        Args: {
          user_uuid: string
        }
        Returns: {
          total_posts: number
          published_posts: number
          draft_posts: number
          scheduled_posts: number
          total_interactions: number
          pending_interactions: number
          connected_accounts: number
          total_content_ideas: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
} 