// Enhanced Database Types for Social Media Dashboard
// Matches the enhanced schema with all new improvements

export interface MediaFile {
  id: string;
  user_id: string;
  organization_id?: string;
  filename: string;
  original_filename: string;
  file_path: string;
  storage_url: string;
  file_size: number;
  mime_type: string;
  file_type: 'image' | 'video' | 'audio' | 'document';
  width?: number;
  height?: number;
  duration?: number;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  optimization_status: 'pending' | 'optimized' | 'failed';
  thumbnail_url?: string;
  compressed_url?: string;
  alt_text?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface MediaPostAssociation {
  id: string;
  media_file_id: string;
  post_id: string;
  display_order: number;
  created_at: string;
}

export interface Hashtag {
  id: string;
  tag: string;
  normalized_tag: string;
  usage_count: number;
  trending_score: number;
  category?: string;
  is_trending: boolean;
  last_used_at?: string;
  embedding?: number[];
  created_at: string;
  updated_at: string;
}

export interface PostHashtag {
  id: string;
  post_id: string;
  hashtag_id: string;
  created_at: string;
}

export interface HashtagAnalytics {
  id: string;
  hashtag_id: string;
  user_id: string;
  platform: string;
  impressions: number;
  reach: number;
  engagement: number;
  posts_count: number;
  recorded_at: string;
  created_at: string;
}

export interface PublishingQueue {
  id: string;
  user_id: string;
  post_id: string;
  platform: string;
  scheduled_at: string;
  status: 'pending' | 'processing' | 'published' | 'failed' | 'cancelled';
  attempt_count: number;
  max_attempts: number;
  priority: number;
  error_message?: string;
  external_post_id?: string;
  published_at?: string;
  next_retry_at?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface PublishingLog {
  id: string;
  queue_id: string;
  user_id: string;
  action: string;
  status: string;
  message?: string;
  error_details?: Record<string, any>;
  processing_time_ms?: number;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  website?: string;
  subscription_tier: 'free' | 'pro' | 'enterprise';
  max_users: number;
  max_posts: number;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'editor' | 'member';
  permissions: Record<string, any>;
  invited_by?: string;
  invited_at?: string;
  joined_at: string;
  status: 'active' | 'inactive' | 'pending';
  created_at: string;
  updated_at: string;
}

export interface UserEmbedding {
  id: string;
  user_id: string;
  organization_id?: string;
  embedding_type: 'brand_voice' | 'writing_style' | 'content_preference';
  content_sample: string;
  embedding: number[];
  version: number;
  is_active: boolean;
  confidence_score: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AISuggestion {
  id: string;
  user_id: string;
  suggestion_type: 'content' | 'hashtag' | 'timing' | 'engagement';
  context_id?: string;
  context_type?: string;
  suggestion_text: string;
  confidence_score: number;
  status: 'pending' | 'accepted' | 'rejected' | 'modified';
  user_feedback?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ContentAnalysis {
  id: string;
  post_id: string;
  user_id: string;
  sentiment_score: number;
  engagement_prediction: number;
  optimal_posting_time?: string;
  content_topics: string[];
  readability_score?: number;
  brand_alignment_score: number;
  analysis_metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Enhanced Post type with new relationships
export interface EnhancedPost {
  id: string;
  user_id: string;
  organization_id?: string;
  title?: string;
  content: string;
  media_urls: string[];
  media_type: 'image' | 'video' | 'text' | 'carousel';
  platforms: string[];
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  scheduled_at?: string;
  published_at?: string;
  tags: string[];
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  impressions: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  
  // New relationships
  media_files?: MediaFile[];
  hashtags?: Hashtag[];
  publishing_queue?: PublishingQueue[];
  content_analysis?: ContentAnalysis;
}

// API Response Types
export interface TrendingHashtagsResponse {
  tag: string;
  usage_count: number;
  trending_score: number;
}

export interface SimilarHashtagsResponse {
  tag: string;
  similarity: number;
}

export interface PublishingQueueStatusResponse {
  pending_count: number;
  processing_count: number;
  failed_count: number;
  next_scheduled?: string;
}

// API Request Types
export interface CreateMediaFileRequest {
  filename: string;
  original_filename: string;
  file_path: string;
  storage_url: string;
  file_size: number;
  mime_type: string;
  file_type: 'image' | 'video' | 'audio' | 'document';
  width?: number;
  height?: number;
  duration?: number;
  alt_text?: string;
  metadata?: Record<string, any>;
}

export interface CreateHashtagRequest {
  tag: string;
  category?: string;
  embedding?: number[];
}

export interface CreatePublishingQueueRequest {
  post_id: string;
  platform: string;
  scheduled_at: string;
  priority?: number;
  metadata?: Record<string, any>;
}

export interface CreateOrganizationRequest {
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  website?: string;
  subscription_tier: 'free' | 'pro' | 'enterprise';
  max_users?: number;
  max_posts?: number;
  settings?: Record<string, any>;
}

export interface CreateUserEmbeddingRequest {
  embedding_type: 'brand_voice' | 'writing_style' | 'content_preference';
  content_sample: string;
  embedding: number[];
  confidence_score: number;
  metadata?: Record<string, any>;
}

export interface CreateAISuggestionRequest {
  suggestion_type: 'content' | 'hashtag' | 'timing' | 'engagement';
  context_id?: string;
  context_type?: string;
  suggestion_text: string;
  confidence_score: number;
  metadata?: Record<string, any>;
}

// Filter and Search Types
export interface MediaFileFilters {
  file_type?: 'image' | 'video' | 'audio' | 'document';
  processing_status?: 'pending' | 'processing' | 'completed' | 'failed';
  date_range?: {
    start: string;
    end: string;
  };
}

export interface HashtagFilters {
  category?: string;
  is_trending?: boolean;
  min_usage_count?: number;
  search_query?: string;
}

export interface PublishingQueueFilters {
  status?: 'pending' | 'processing' | 'published' | 'failed' | 'cancelled';
  platform?: string;
  date_range?: {
    start: string;
    end: string;
  };
  priority?: number;
}

// Dashboard Summary Types
export interface MediaSummary {
  total_files: number;
  total_size: number;
  by_type: {
    image: number;
    video: number;
    audio: number;
    document: number;
  };
  processing_status: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
}

export interface HashtagSummary {
  total_hashtags: number;
  trending_count: number;
  top_hashtags: TrendingHashtagsResponse[];
  categories: {
    [category: string]: number;
  };
}

export interface PublishingSummary {
  total_queued: number;
  pending: number;
  processing: number;
  published_today: number;
  failed_count: number;
  next_scheduled?: string;
}

export interface OrganizationSummary {
  total_members: number;
  active_members: number;
  pending_invites: number;
  role_distribution: {
    owner: number;
    admin: number;
    editor: number;
    member: number;
  };
}

export interface AISummary {
  total_suggestions: number;
  pending_suggestions: number;
  accepted_suggestions: number;
  active_embeddings: number;
  average_confidence: number;
}

// Combined dashboard data
export interface EnhancedDashboardData {
  media: MediaSummary;
  hashtags: HashtagSummary;
  publishing: PublishingSummary;
  organization?: OrganizationSummary;
  ai: AISummary;
} 