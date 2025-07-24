import { 
  supabase, 
  getCurrentUser,
  handleSupabaseError,
  UserProfile,
  UserProfileUpdate,
  Post,
  PostInsert,
  PostUpdate,
  SocialAccount,
  SocialAccountInsert,
  SocialAccountUpdate,
  ContentIdea,
  ContentIdeaInsert,
  ContentIdeaUpdate,
  CalendarEvent,
  CalendarEventInsert,
  CalendarEventUpdate,
  PostAnalytics,
  PostAnalyticsInsert,
  PostAnalyticsUpdate,
  Interaction,
  InteractionInsert,
  InteractionUpdate,
  DashboardSummary,
  UserStats
} from './supabase'
import { generateEmbedding } from '@/lib/openaiService'

// Helper function for optimized embedding generation
// Embedding generation moved to server-side API routes for security

// User Profile Service
class UserProfileService {
  static async getProfile(): Promise<UserProfile | null> {
    try {
      const user = await getCurrentUser()
      if (!user) return null

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      return null
    }
  }

  static async updateProfile(updates: UserProfileUpdate): Promise<UserProfile> {
    try {
      const user = await getCurrentUser()
      if (!user) throw new Error('No authenticated user')

      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      throw new Error(handleSupabaseError(error))
    }
  }

  static async completeOnboarding(): Promise<void> {
    try {
      const user = await getCurrentUser()
      if (!user) throw new Error('No authenticated user')

      const { error } = await supabase
        .from('user_profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id)

      if (error) throw error
    } catch (error) {
      throw new Error(handleSupabaseError(error))
    }
  }

  static async getDashboardSummary(): Promise<DashboardSummary | null> {
    try {
      const user = await getCurrentUser()
      if (!user) return null

      const { data, error } = await supabase
        .from('user_dashboard_summary')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      return null
    }
  }

  static async getUserStats(): Promise<UserStats | null> {
    try {
      const user = await getCurrentUser()
      if (!user) return null

      const { data, error } = await supabase
        .rpc('get_user_stats', { user_uuid: user.id })

      if (error) throw error
      return data[0] || null
    } catch (error) {
      return null
    }
  }
}

// Posts Service
class PostsService {
  static async getPosts(filters?: {
    status?: string
    limit?: number
    offset?: number
    includeMedia?: boolean
  }): Promise<Post[]> {
    try {
      const user = await getCurrentUser()
      if (!user) {
        console.log('No authenticated user found, returning empty posts array')
        return []
      }

      // Build select string based on includeMedia flag
      let query = supabase
        .from('posts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (filters?.status) {
        query = query.eq('status', filters.status)
      }

      // Always use pagination to prevent loading too much data
      const limit = filters?.limit || 10
      const offset = filters?.offset || 0
      query = query.range(offset, offset + limit - 1)

      const { data, error } = await query

      if (error) {
        // Handle specific error cases
        const errorMessage = String(error.message || '')
        if (errorMessage.includes('JWT') || errorMessage.includes('invalid token')) {
          console.log('Authentication error, returning empty posts array')
          return []
        }
        console.log('Database error fetching posts:', error)
        return []
      }

      return (data || []) as Post[]
    } catch (error) {
      // Handle authentication errors gracefully
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('JWT') || 
          errorMessage.includes('invalid token') ||
          errorMessage.includes('auth')) {
        console.log('Authentication error in getPosts, returning empty array')
        return []
      }
      console.log('Unexpected error in getPosts:', error)
      return []
    }
  }

  static async getPostCount(status?: string): Promise<number> {
    try {
      const user = await getCurrentUser()
      if (!user) return 0

      let query = supabase
        .from('posts')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)

      if (status) {
        query = query.eq('status', status)
      }

      const { count, error } = await query

      if (error) {
        console.error('Error counting posts:', error)
        throw error
      }

      return count || 0
    } catch (error) {
      console.error('Error in getPostCount:', error)
      throw error
    }
  }

  static async getPost(id: string): Promise<Post | null> {
    try {
      const user = await getCurrentUser()
      if (!user) return null

      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      return null
    }
  }


  static async createPost(postData: PostInsert & { title?: string }): Promise<Post> {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('No authenticated user');

      // Log the incoming postData from the route
      console.log('🚀 PostsService.createPost called with data:', JSON.stringify(postData, null, 2));

      // Determine the primary content for embedding
      const primaryContent = postData.content; // This now comes pre-mapped from the route

      // Construct the full text to embed including title
      let textToEmbed = '';
      if (postData.title) {
        textToEmbed += postData.title + '. ';
      }
      textToEmbed += primaryContent || '';
      textToEmbed = textToEmbed.trim();

      console.log('📝 Primary content for embedding (from route):', primaryContent);
      console.log('📝 Full text to embed (title + content):', textToEmbed.substring(0, 100) + '...');
      console.log('📝 Content length for embedding:', textToEmbed.length);

      let embedding: number[] | null = null;
      if (textToEmbed) {
        console.log('🔄 Starting embedding generation...');
        try {
          embedding = await generateEmbedding(textToEmbed);
          if (!embedding) {
            console.warn('Failed to generate embedding: result was null/undefined.');
          }
        } catch (error) {
          console.error('Error generating embedding in data-service:', error);
          // Continue with post creation even if embedding fails
        }
      } else {
        console.log('🛑 No valid text for embedding, skipping embedding generation.');
      }

      // Prepare data for Supabase insert - CRITICALLY filter out 'title'
      const { title, ...dataToInsert } = postData; // Destructure to remove title

      // Ensure user_id is set
      dataToInsert.user_id = user.id;

      // Add embedding to the data being inserted
      if (embedding) {
        dataToInsert.embedding = embedding;
      } else {
        dataToInsert.embedding = null; // Ensure it's explicitly null if embedding failed
      }

      // Note: Database uses media_urls array and media_type, no separate image_url/video_url columns

      // Debugging log for data being sent to database
      console.log('💾 Inserting post into database with data keys (after filtering title):', Object.keys(dataToInsert));
      console.log('💾 Has embedding?', !!dataToInsert.embedding);

      const { data, error } = await supabase
        .from('posts')
        .insert([dataToInsert])
        .select()
        .single();

      if (error) {
        console.error('Supabase insert error details:', error);
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Error in PostsService.createPost:', error);
      throw new Error(`Failed to create post: ${handleSupabaseError(error)}`);
    }
  }

  static async updatePost(id: string, updates: PostUpdate & { title?: string }): Promise<Post> {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('No authenticated user');

      console.log('🚀 PostsService.updatePost called with updates:', JSON.stringify(updates, null, 2));

      // Fetch the existing post to get its current content and potentially title if it were stored
      // For embedding generation, we need the *full* text, which might involve combining
      // the new `content` and `title` (if provided) with existing values.
      const { data: existingPost, error: fetchError } = await supabase
        .from('posts')
        .select('content') // Select fields needed for embedding
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (fetchError || !existingPost) {
        throw new Error('Post not found or unauthorized for update.');
      }

      // Determine the content for embedding (new or existing)
      const updatedContent = updates.content !== undefined ? updates.content : existingPost.content;
      const updatedTitle = updates.title !== undefined ? updates.title : null; // If title isn't stored, assume null unless provided in update

      let textToEmbed = '';
      if (updatedTitle) {
        textToEmbed += updatedTitle + '. ';
      }
      textToEmbed += updatedContent || '';
      textToEmbed = textToEmbed.trim();

      let embedding: number[] | null | undefined = undefined; // Undefined means don't update embedding by default
      // Only regenerate embedding if content or title is explicitly provided in updates
      if (updates.content !== undefined || updates.title !== undefined) {
        if (textToEmbed) {
          console.log('🔄 Starting embedding regeneration for update...');
          try {
            const newEmbedding = await generateEmbedding(textToEmbed);
            if (newEmbedding) {
              embedding = newEmbedding;
              console.log('Embedding successfully regenerated for update.');
            } else {
              embedding = null; // Explicitly set to null if generation yields null
              console.warn('Failed to regenerate embedding for update: result was null/undefined.');
            }
          } catch (error) {
            console.error('Error regenerating embedding for update in data-service:', error);
            embedding = null; // Set to null if embedding generation fails
          }
        } else {
          embedding = null; // Clear embedding if content becomes empty
          console.log('🛑 No valid text for embedding in update, clearing embedding.');
        }
      }

      // Prepare update data for Supabase - CRITICALLY filter out 'title'
      const updateDataForDb: any = { ...updates }; // Start with all updates
      delete updateDataForDb.title; // Remove title property

      // Add embedding to updateDataForDb if it was generated (or set to null)
      if (embedding !== undefined) { // Check if embedding was explicitly processed
        updateDataForDb.embedding = embedding;
      }
      
      // Note: Database uses media_urls array and media_type, no separate image_url/video_url columns

      // Debugging log for data being updated in database
      console.log('💾 Updating post in database with data keys (after filtering title):', Object.keys(updateDataForDb));
      console.log('💾 Has embedding (for update)?', !!updateDataForDb.embedding);

      const { data: updatedPost, error } = await supabase
        .from('posts')
        .update(updateDataForDb)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating post:', error);
        throw error;
      }

      return updatedPost;
    } catch (error) {
      console.error('Error in PostsService.updatePost:', error);
      throw new Error(`Failed to update post: ${handleSupabaseError(error)}`);
    }
  }

  static async deletePost(id: string): Promise<void> {
    try {
      const user = await getCurrentUser()
      if (!user) throw new Error('No authenticated user')

      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) throw error
    } catch (error) {
      throw new Error(handleSupabaseError(error))
    }
  }

  static async schedulePost(id: string, scheduledAt: Date): Promise<Post> {
    try {
      const user = await getCurrentUser()
      if (!user) throw new Error('No authenticated user')

      const { data, error } = await supabase
        .from('posts')
        .update({ 
          status: 'scheduled', 
          scheduled_at: scheduledAt.toISOString() 
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      throw new Error(handleSupabaseError(error))
    }
  }

  static async publishPost(id: string): Promise<Post> {
    try {
      const user = await getCurrentUser()
      if (!user) throw new Error('No authenticated user')

      const { data, error } = await supabase
        .from('posts')
        .update({ 
          status: 'published', 
          published_at: new Date().toISOString() 
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      throw new Error(handleSupabaseError(error))
    }
  }
}

// Social Accounts Service
class SocialAccountsService {
  static async getAccounts(): Promise<SocialAccount[]> {
    try {
      const user = await getCurrentUser()
      if (!user) return []

      const { data, error } = await supabase
        .from('social_accounts')
        .select('id, platform, username, display_name, profile_image_url, status, created_at, updated_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data || []) as SocialAccount[]
    } catch (error) {
      return []
    }
  }

  static async getAccount(id: string): Promise<SocialAccount | null> {
    try {
      const user = await getCurrentUser()
      if (!user) return null

      const { data, error } = await supabase
        .from('social_accounts')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      return null
    }
  }

  static async connectAccount(account: SocialAccountInsert): Promise<SocialAccount> {
    try {
      const user = await getCurrentUser()
      if (!user) throw new Error('No authenticated user')

      const { data, error } = await supabase
        .from('social_accounts')
        .insert({ ...account, user_id: user.id })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      throw new Error(handleSupabaseError(error))
    }
  }

  static async updateAccount(id: string, updates: SocialAccountUpdate): Promise<SocialAccount> {
    try {
      const user = await getCurrentUser()
      if (!user) throw new Error('No authenticated user')

      const { data, error } = await supabase
        .from('social_accounts')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      throw new Error(handleSupabaseError(error))
    }
  }

  static async disconnectAccount(id: string): Promise<void> {
    try {
      const user = await getCurrentUser()
      if (!user) throw new Error('No authenticated user')

      const { error } = await supabase
        .from('social_accounts')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) throw error
    } catch (error) {
      throw new Error(handleSupabaseError(error))
    }
  }
}

// Content Ideas Service
class ContentIdeasService {
  static async getIdeas(filters?: {
    status?: string
    priority?: string
    limit?: number
    offset?: number
  }): Promise<ContentIdea[]> {
    try {
      const user = await getCurrentUser()
      if (!user) return []

      let query = supabase
        .from('content_ideas')
        .select('id, title, description, content_type, platforms, tags, category, priority, status, due_date, is_saved, created_at, updated_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (filters?.status) {
        query = query.eq('status', filters.status)
      }

      if (filters?.priority) {
        query = query.eq('priority', filters.priority)
      }

      if (filters?.limit) {
        query = query.limit(filters.limit)
      }

      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
      }

      const { data, error } = await query

      if (error) throw error
      return (data || []) as ContentIdea[]
    } catch (error) {
      return []
    }
  }

  static async getIdea(id: string): Promise<ContentIdea | null> {
    try {
      const user = await getCurrentUser()
      if (!user) return null

      const { data, error } = await supabase
        .from('content_ideas')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      return null
    }
  }

  static async createIdea(idea: ContentIdeaInsert): Promise<ContentIdea> {
    try {
      const user = await getCurrentUser()
      if (!user) throw new Error('No authenticated user')

      const { data, error } = await supabase
        .from('content_ideas')
        .insert({ ...idea, user_id: user.id })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      throw new Error(handleSupabaseError(error))
    }
  }

  static async updateIdea(id: string, updates: ContentIdeaUpdate): Promise<ContentIdea> {
    try {
      const user = await getCurrentUser()
      if (!user) throw new Error('No authenticated user')

      const { data, error } = await supabase
        .from('content_ideas')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      throw new Error(handleSupabaseError(error))
    }
  }

  static async deleteIdea(id: string): Promise<void> {
    try {
      const user = await getCurrentUser()
      if (!user) throw new Error('No authenticated user')

      const { error } = await supabase
        .from('content_ideas')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) throw error
    } catch (error) {
      throw new Error(handleSupabaseError(error))
    }
  }
}

// Calendar Events Service
class CalendarEventsService {
  static async getEvents(filters?: {
    startDate?: string
    endDate?: string
    category?: string
    limit?: number
    offset?: number
  }): Promise<CalendarEvent[]> {
    try {
      const user = await getCurrentUser()
      if (!user) return []

      let query = supabase
        .from('calendar_events')
        .select('id, title, description, start_date, end_date, start_time, end_time, category, color, all_day, status, created_at, updated_at')
        .eq('user_id', user.id)
        .order('start_date', { ascending: true })

      if (filters?.startDate) {
        query = query.gte('start_date', filters.startDate)
      }

      if (filters?.endDate) {
        query = query.lte('end_date', filters.endDate)
      }

      if (filters?.category) {
        query = query.eq('category', filters.category)
      }

      if (filters?.limit) {
        query = query.limit(filters.limit)
      }

      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
      }

      const { data, error } = await query

      if (error) throw error
      return (data || []) as CalendarEvent[]
    } catch (error) {
      return []
    }
  }

  static async getEvent(id: string): Promise<CalendarEvent | null> {
    try {
      const user = await getCurrentUser()
      if (!user) return null

      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      return null
    }
  }

  static async createEvent(event: CalendarEventInsert): Promise<CalendarEvent> {
    try {
      const user = await getCurrentUser()
      if (!user) throw new Error('No authenticated user')

      const { data, error } = await supabase
        .from('calendar_events')
        .insert({ ...event, user_id: user.id })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      throw new Error(handleSupabaseError(error))
    }
  }

  static async updateEvent(id: string, updates: CalendarEventUpdate): Promise<CalendarEvent> {
    try {
      const user = await getCurrentUser()
      if (!user) throw new Error('No authenticated user')

      const { data, error } = await supabase
        .from('calendar_events')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      throw new Error(handleSupabaseError(error))
    }
  }

  static async deleteEvent(id: string): Promise<void> {
    try {
      const user = await getCurrentUser()
      if (!user) throw new Error('No authenticated user')

      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) throw error
    } catch (error) {
      throw new Error(handleSupabaseError(error))
    }
  }
}

// Interactions Service
class InteractionsService {
  static async getInteractions(filters?: {
    status?: string
    priority?: string
    platform?: string
    limit?: number
    offset?: number
  }): Promise<Interaction[]> {
    try {
      const user = await getCurrentUser()
      if (!user) return []

      let query = supabase
        .from('interactions')
        .select('id, platform, interaction_type, sender_name, sender_username, sender_avatar_url, message, ai_suggestion, sentiment, priority, status, created_at, updated_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (filters?.status) {
        query = query.eq('status', filters.status)
      }

      if (filters?.priority) {
        query = query.eq('priority', filters.priority)
      }

      if (filters?.platform) {
        query = query.eq('platform', filters.platform)
      }

      if (filters?.limit) {
        query = query.limit(filters.limit)
      }

      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
      }

      const { data, error } = await query

      if (error) throw error
      return (data || []) as Interaction[]
    } catch (error) {
      return []
    }
  }

  static async getInteraction(id: string): Promise<Interaction | null> {
    try {
      const user = await getCurrentUser()
      if (!user) return null

      const { data, error } = await supabase
        .from('interactions')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      return null
    }
  }

  static async createInteraction(interaction: InteractionInsert): Promise<Interaction> {
    try {
      const user = await getCurrentUser()
      if (!user) throw new Error('No authenticated user')

      const { data, error } = await supabase
        .from('interactions')
        .insert({ ...interaction, user_id: user.id })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      throw new Error(handleSupabaseError(error))
    }
  }

  static async updateInteraction(id: string, updates: InteractionUpdate): Promise<Interaction> {
    try {
      const user = await getCurrentUser()
      if (!user) throw new Error('No authenticated user')

      const { data, error } = await supabase
        .from('interactions')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      throw new Error(handleSupabaseError(error))
    }
  }

  static async markAsReplied(id: string): Promise<Interaction> {
    try {
      const user = await getCurrentUser()
      if (!user) throw new Error('No authenticated user')

      const { data, error } = await supabase
        .from('interactions')
        .update({ 
          status: 'replied', 
          replied_at: new Date().toISOString() 
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      throw new Error(handleSupabaseError(error))
    }
  }

  static async deleteInteraction(id: string): Promise<void> {
    try {
      const user = await getCurrentUser()
      if (!user) throw new Error('No authenticated user')

      const { error } = await supabase
        .from('interactions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) throw error
    } catch (error) {
      throw new Error(handleSupabaseError(error))
    }
  }
}

// Post Analytics Service
class PostAnalyticsService {
  static async getAnalytics(filters?: {
    postId?: string
    platform?: string
    dateRange?: { start: string; end: string }
    limit?: number
    offset?: number
  }): Promise<PostAnalytics[]> {
    try {
      const user = await getCurrentUser()
      if (!user) return []

      let query = supabase
        .from('post_analytics')
        .select('id, post_id, platform, impressions, reach, engagement, likes, comments, shares, engagement_rate, recorded_at')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false })

      if (filters?.postId) {
        query = query.eq('post_id', filters.postId)
      }

      if (filters?.platform) {
        query = query.eq('platform', filters.platform)
      }

      if (filters?.dateRange) {
        query = query.gte('recorded_at', filters.dateRange.start)
                    .lte('recorded_at', filters.dateRange.end)
      }

      if (filters?.limit) {
        query = query.limit(filters.limit)
      }

      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
      }

      const { data, error } = await query

      if (error) throw error
      return (data || []) as PostAnalytics[]
    } catch (error) {
      return []
    }
  }

  static async createAnalytics(analytics: PostAnalyticsInsert): Promise<PostAnalytics> {
    try {
      const user = await getCurrentUser()
      if (!user) throw new Error('No authenticated user')

      const { data, error } = await supabase
        .from('post_analytics')
        .insert({ ...analytics, user_id: user.id })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      throw new Error(handleSupabaseError(error))
    }
  }

  static async updateAnalytics(id: string, updates: PostAnalyticsUpdate): Promise<PostAnalytics> {
    try {
      const user = await getCurrentUser()
      if (!user) throw new Error('No authenticated user')

      const { data, error } = await supabase
        .from('post_analytics')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      throw new Error(handleSupabaseError(error))
    }
  }
}

// Export all services
export {
  UserProfileService,
  PostsService,
  SocialAccountsService,
  ContentIdeasService,
  CalendarEventsService,
  InteractionsService,
  PostAnalyticsService
}

// Export types
export type { Post, PostInsert, PostUpdate } from './supabase';