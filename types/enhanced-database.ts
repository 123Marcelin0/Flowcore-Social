// Enhanced Database Types - Reflects the new normalized schema
export type EnhancedDatabase = {
  public: {
    Tables: {
      // ==========================================
      // CORE NORMALIZED TABLES
      // ==========================================
      
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          logo_url: string | null
          website: string | null
          subscription_tier: 'free' | 'pro' | 'enterprise'
          max_users: number
          max_posts: number
          max_storage_gb: number
          settings: Record<string, any>
          billing_email: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          logo_url?: string | null
          website?: string | null
          subscription_tier?: 'free' | 'pro' | 'enterprise'
          max_users?: number
          max_posts?: number
          max_storage_gb?: number
          settings?: Record<string, any>
          billing_email?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          logo_url?: string | null
          website?: string | null
          subscription_tier?: 'free' | 'pro' | 'enterprise'
          max_users?: number
          max_posts?: number
          max_storage_gb?: number
          settings?: Record<string, any>
          billing_email?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      organization_members: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          role: 'owner' | 'admin' | 'editor' | 'member' | 'viewer'
          permissions: Record<string, any>
          invited_by: string | null
          invited_at: string | null
          joined_at: string
          status: 'active' | 'inactive' | 'pending' | 'suspended'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          role?: 'owner' | 'admin' | 'editor' | 'member' | 'viewer'
          permissions?: Record<string, any>
          invited_by?: string | null
          invited_at?: string | null
          joined_at?: string
          status?: 'active' | 'inactive' | 'pending' | 'suspended'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          role?: 'owner' | 'admin' | 'editor' | 'member' | 'viewer'
          permissions?: Record<string, any>
          invited_by?: string | null
          invited_at?: string | null
          joined_at?: string
          status?: 'active' | 'inactive' | 'pending' | 'suspended'
          created_at?: string
          updated_at?: string
        }
      }

      user_profiles: {
        Row: {
          id: string
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
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

      // ==========================================
      // NORMALIZED POSTS TABLES
      // ==========================================

      posts_core: {
        Row: {
          id: string
          user_id: string
          organization_id: string | null
          title: string | null
          status: 'draft' | 'scheduled' | 'published' | 'failed'
          platforms: string[]
          scheduled_at: string | null
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          organization_id?: string | null
          title?: string | null
          status?: 'draft' | 'scheduled' | 'published' | 'failed'
          platforms?: string[]
          scheduled_at?: string | null
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          organization_id?: string | null
          title?: string | null
          status?: 'draft' | 'scheduled' | 'published' | 'failed'
          platforms?: string[]
          scheduled_at?: string | null
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      posts_content: {
        Row: {
          id: string
          post_id: string
          content: string
          caption: string | null
          alt_text: string | null
          hashtags: string[]
          tags: string[]
          metadata: Record<string, any>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          post_id: string
          content: string
          caption?: string | null
          alt_text?: string | null
          hashtags?: string[]
          tags?: string[]
          metadata?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          content?: string
          caption?: string | null
          alt_text?: string | null
          hashtags?: string[]
          tags?: string[]
          metadata?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
      }

      media_files: {
        Row: {
          id: string
          user_id: string
          filename: string
          original_filename: string
          storage_url: string
          file_size: number | null
          mime_type: string | null
          file_type: 'image' | 'video' | 'audio' | 'document'
          width: number | null
          height: number | null
          duration: number | null
          thumbnail_url: string | null
          alt_text: string | null
          metadata: Record<string, any>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          filename: string
          original_filename: string
          storage_url: string
          file_size?: number | null
          mime_type?: string | null
          file_type: 'image' | 'video' | 'audio' | 'document'
          width?: number | null
          height?: number | null
          duration?: number | null
          thumbnail_url?: string | null
          alt_text?: string | null
          metadata?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          filename?: string
          original_filename?: string
          storage_url?: string
          file_size?: number | null
          mime_type?: string | null
          file_type?: 'image' | 'video' | 'audio' | 'document'
          width?: number | null
          height?: number | null
          duration?: number | null
          thumbnail_url?: string | null
          alt_text?: string | null
          metadata?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
      }

      post_media_links: {
        Row: {
          id: string
          post_id: string
          media_file_id: string
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          media_file_id: string
          order_index?: number
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          media_file_id?: string
          order_index?: number
          created_at?: string
        }
      }

      post_insights: {
        Row: {
          id: string
          post_id: string
          platform: string
          reach: number
          impressions: number
          likes: number
          comments_count: number
          shares: number
          engagement_rate: number
          recorded_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          post_id: string
          platform: string
          reach?: number
          impressions?: number
          likes?: number
          comments_count?: number
          shares?: number
          engagement_rate?: number
          recorded_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          platform?: string
          reach?: number
          impressions?: number
          likes?: number
          comments_count?: number
          shares?: number
          engagement_rate?: number
          recorded_at?: string
          created_at?: string
          updated_at?: string
        }
      }

      // ==========================================
      // UNIFIED METRICS & EMBEDDINGS
      // ==========================================

      time_series_metrics: {
        Row: {
          id: string
          entity_type: 'post' | 'user' | 'account' | 'hashtag' | 'campaign'
          entity_id: string
          metric_name: string
          metric_value: number
          recorded_at: string
          platform: string | null
          metadata: Record<string, any>
          created_at: string
        }
        Insert: {
          id?: string
          entity_type: 'post' | 'user' | 'account' | 'hashtag' | 'campaign'
          entity_id: string
          metric_name: string
          metric_value: number
          recorded_at?: string
          platform?: string | null
          metadata?: Record<string, any>
          created_at?: string
        }
        Update: {
          id?: string
          entity_type?: 'post' | 'user' | 'account' | 'hashtag' | 'campaign'
          entity_id?: string
          metric_name?: string
          metric_value?: number
          recorded_at?: string
          platform?: string | null
          metadata?: Record<string, any>
          created_at?: string
        }
      }

      embeddings: {
        Row: {
          id: string
          entity_type: 'post' | 'chat' | 'user' | 'hashtag' | 'dm' | 'template' | 'content_idea'
          entity_id: string
          source_field: string
          vector_data: number[] // VECTOR type represented as number array
          model_version: string
          similarity_method: string
          chunk_index: number
          confidence_score: number
          metadata: Record<string, any>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          entity_type: 'post' | 'chat' | 'user' | 'hashtag' | 'dm' | 'template' | 'content_idea'
          entity_id: string
          source_field: string
          vector_data: number[]
          model_version?: string
          similarity_method?: string
          chunk_index?: number
          confidence_score?: number
          metadata?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          entity_type?: 'post' | 'chat' | 'user' | 'hashtag' | 'dm' | 'template' | 'content_idea'
          entity_id?: string
          source_field?: string
          vector_data?: number[]
          model_version?: string
          similarity_method?: string
          chunk_index?: number
          confidence_score?: number
          metadata?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
      }

      // ==========================================
      // AI CONTEXT & RAG SYSTEM
      // ==========================================

      ai_context_logs: {
        Row: {
          id: string
          user_id: string
          organization_id: string | null
          source_type: 'chat' | 'post' | 'dm' | 'comment' | 'insight' | 'suggestion' | 'analysis'
          source_id: string | null
          context_summary: string
          ai_response: string | null
          prompt_template: string | null
          model_used: string
          feedback_score: number | null
          feedback_type: 'helpful' | 'too_generic' | 'not_relevant' | 'incorrect' | 'excellent' | null
          metadata: Record<string, any>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          organization_id?: string | null
          source_type: 'chat' | 'post' | 'dm' | 'comment' | 'insight' | 'suggestion' | 'analysis'
          source_id?: string | null
          context_summary: string
          ai_response?: string | null
          prompt_template?: string | null
          model_used?: string
          feedback_score?: number | null
          feedback_type?: 'helpful' | 'too_generic' | 'not_relevant' | 'incorrect' | 'excellent' | null
          metadata?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          organization_id?: string | null
          source_type?: 'chat' | 'post' | 'dm' | 'comment' | 'insight' | 'suggestion' | 'analysis'
          source_id?: string | null
          context_summary?: string
          ai_response?: string | null
          prompt_template?: string | null
          model_used?: string
          feedback_score?: number | null
          feedback_type?: 'helpful' | 'too_generic' | 'not_relevant' | 'incorrect' | 'excellent' | null
          metadata?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
      }

      ai_prompts: {
        Row: {
          id: string
          organization_id: string | null
          name: string
          prompt_type: 'content_generation' | 'chat_response' | 'analysis' | 'suggestion' | 'trend_analysis'
          template: string
          parameters: Record<string, any>
          is_active: boolean
          version: number
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          name: string
          prompt_type: 'content_generation' | 'chat_response' | 'analysis' | 'suggestion' | 'trend_analysis'
          template: string
          parameters?: Record<string, any>
          is_active?: boolean
          version?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          name?: string
          prompt_type?: 'content_generation' | 'chat_response' | 'analysis' | 'suggestion' | 'trend_analysis'
          template?: string
          parameters?: Record<string, any>
          is_active?: boolean
          version?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      ai_suggestions: {
        Row: {
          id: string
          user_id: string
          organization_id: string | null
          suggestion_type: 'content_idea' | 'hashtag' | 'caption' | 'response' | 'optimization'
          source_entity_type: string | null
          source_entity_id: string | null
          suggestion_text: string
          confidence_score: number
          reasoning: string | null
          is_accepted: boolean | null
          is_dismissed: boolean
          feedback_rating: number | null
          feedback_text: string | null
          metadata: Record<string, any>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          organization_id?: string | null
          suggestion_type: 'content_idea' | 'hashtag' | 'caption' | 'response' | 'optimization'
          source_entity_type?: string | null
          source_entity_id?: string | null
          suggestion_text: string
          confidence_score?: number
          reasoning?: string | null
          is_accepted?: boolean | null
          is_dismissed?: boolean
          feedback_rating?: number | null
          feedback_text?: string | null
          metadata?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          organization_id?: string | null
          suggestion_type?: 'content_idea' | 'hashtag' | 'caption' | 'response' | 'optimization'
          source_entity_type?: string | null
          source_entity_id?: string | null
          suggestion_text?: string
          confidence_score?: number
          reasoning?: string | null
          is_accepted?: boolean | null
          is_dismissed?: boolean
          feedback_rating?: number | null
          feedback_text?: string | null
          metadata?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
      }

      // ==========================================
      // PUBLISHING SYSTEM
      // ==========================================

      publishing_queue: {
        Row: {
          id: string
          user_id: string
          organization_id: string
          post_id: string
          platform: string
          scheduled_at: string
          status: 'pending' | 'processing' | 'published' | 'failed' | 'cancelled' | 'retrying'
          attempt_count: number
          max_attempts: number
          priority: number
          error_message: string | null
          error_code: string | null
          external_post_id: string | null
          published_at: string | null
          next_retry_at: string | null
          processing_started_at: string | null
          processing_completed_at: string | null
          metadata: Record<string, any>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          organization_id: string
          post_id: string
          platform: string
          scheduled_at: string
          status?: 'pending' | 'processing' | 'published' | 'failed' | 'cancelled' | 'retrying'
          attempt_count?: number
          max_attempts?: number
          priority?: number
          error_message?: string | null
          error_code?: string | null
          external_post_id?: string | null
          published_at?: string | null
          next_retry_at?: string | null
          processing_started_at?: string | null
          processing_completed_at?: string | null
          metadata?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          organization_id?: string
          post_id?: string
          platform?: string
          scheduled_at?: string
          status?: 'pending' | 'processing' | 'published' | 'failed' | 'cancelled' | 'retrying'
          attempt_count?: number
          max_attempts?: number
          priority?: number
          error_message?: string | null
          error_code?: string | null
          external_post_id?: string | null
          published_at?: string | null
          next_retry_at?: string | null
          processing_started_at?: string | null
          processing_completed_at?: string | null
          metadata?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
      }

      publishing_logs: {
        Row: {
          id: string
          queue_id: string
          user_id: string
          organization_id: string
          action: 'queued' | 'started' | 'completed' | 'failed' | 'cancelled' | 'retried'
          status: string
          message: string | null
          error_details: Record<string, any> | null
          processing_time_ms: number | null
          api_response: Record<string, any> | null
          created_at: string
        }
        Insert: {
          id?: string
          queue_id: string
          user_id: string
          organization_id: string
          action: 'queued' | 'started' | 'completed' | 'failed' | 'cancelled' | 'retried'
          status: string
          message?: string | null
          error_details?: Record<string, any> | null
          processing_time_ms?: number | null
          api_response?: Record<string, any> | null
          created_at?: string
        }
        Update: {
          id?: string
          queue_id?: string
          user_id?: string
          organization_id?: string
          action?: 'queued' | 'started' | 'completed' | 'failed' | 'cancelled' | 'retried'
          status?: string
          message?: string | null
          error_details?: Record<string, any> | null
          processing_time_ms?: number | null
          api_response?: Record<string, any> | null
          created_at?: string
        }
      }

      // ==========================================
      // EXISTING TABLES (UPDATED WITH ORGANIZATION SUPPORT)
      // ==========================================

      social_accounts: {
        Row: {
          id: string
          user_id: string
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
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

      interactions: {
        Row: {
          id: string
          user_id: string
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
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
          organization_id: string | null
          conversation_id: string
          role: 'user' | 'assistant'
          content: string
          metadata: Record<string, any>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          organization_id?: string | null
          conversation_id: string
          role: 'user' | 'assistant'
          content: string
          metadata?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          organization_id?: string | null
          conversation_id?: string
          role?: 'user' | 'assistant'
          content?: string
          metadata?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
      }

      // ==========================================
      // CONSOLIDATED INSTAGRAM REELS
      // ==========================================

      instagram_reels: {
        Row: {
          id: string
          external_reel_id: string | null
          reel_url: string
          thumbnail_url: string | null
          creator_username: string
          creator_display_name: string | null
          caption: string | null
          description: string | null
          script: string | null
          likes_count: number
          comments_count: number
          shares_count: number
          views_count: number
          engagement_count: number
          hashtags: string[]
          music_info: Record<string, any>
          content_category: string | null
          trending_score: number
          scraped_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          external_reel_id?: string | null
          reel_url: string
          thumbnail_url?: string | null
          creator_username: string
          creator_display_name?: string | null
          caption?: string | null
          description?: string | null
          script?: string | null
          likes_count?: number
          comments_count?: number
          shares_count?: number
          views_count?: number
          engagement_count?: number
          hashtags?: string[]
          music_info?: Record<string, any>
          content_category?: string | null
          trending_score?: number
          scraped_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          external_reel_id?: string | null
          reel_url?: string
          thumbnail_url?: string | null
          creator_username?: string
          creator_display_name?: string | null
          caption?: string | null
          description?: string | null
          script?: string | null
          likes_count?: number
          comments_count?: number
          shares_count?: number
          views_count?: number
          engagement_count?: number
          hashtags?: string[]
          music_info?: Record<string, any>
          content_category?: string | null
          trending_score?: number
          scraped_at?: string
          created_at?: string
          updated_at?: string
        }
      }
    }

    Views: {
      // ==========================================
      // ENHANCED VIEWS
      // ==========================================

      posts_unified: {
        Row: {
          id: string
          user_id: string
          organization_id: string | null
          title: string | null
          content: string
          caption: string | null
          tags: string[]
          platforms: string[]
          status: 'draft' | 'scheduled' | 'published' | 'failed'
          scheduled_at: string | null
          published_at: string | null
          media_urls: string[]
          likes: number
          comments: number
          shares: number
          reach: number
          impressions: number
          metadata: Record<string, any>
          created_at: string
          updated_at: string
        }
      }

      analytics_dashboard: {
        Row: {
          entity_type: 'post' | 'user' | 'account' | 'hashtag' | 'campaign'
          entity_id: string
          metric_name: string
          metric_date: string
          daily_total: number
          daily_average: number
          platform: string | null
          data_points: number
        }
      }

      top_performing_posts: {
        Row: {
          id: string
          title: string | null
          user_id: string
          organization_id: string | null
          total_likes: number
          total_comments: number
          total_shares: number
          total_reach: number
          avg_engagement_rate: number | null
          published_at: string | null
        }
      }

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

      find_similar_content: {
        Args: {
          input_entity_type: string
          input_entity_id: string
          similarity_threshold?: number
          max_results?: number
        }
        Returns: {
          entity_type: string
          entity_id: string
          source_field: string
          similarity_score: number
          metadata: Record<string, any>
        }[]
      }

      get_metrics_aggregated: {
        Args: {
          input_entity_type: string
          input_entity_id: string
          input_metric_name: string
          time_period?: string
        }
        Returns: {
          period_start: string
          total_value: number
          avg_value: number
          max_value: number
          min_value: number
        }[]
      }

      user_has_org_permission: {
        Args: {
          check_user_id: string
          check_org_id: string
          required_role?: string
        }
        Returns: boolean
      }

      get_organization_usage: {
        Args: {
          org_id: string
        }
        Returns: {
          total_users: number
          total_posts: number
          total_storage_bytes: number
          posts_this_month: number
          storage_usage_gb: number
        }[]
      }

      verify_migration_integrity: {
        Args: {}
        Returns: {
          check_name: string
          status: string
          old_count: number
          new_count: number
          data_loss: boolean
        }[]
      }

      archive_old_metrics: {
        Args: {}
        Returns: number
      }

      finalize_migration_cleanup: {
        Args: {}
        Returns: string
      }
    }

    Enums: {
      [_ in never]: never
    }
  }
} 