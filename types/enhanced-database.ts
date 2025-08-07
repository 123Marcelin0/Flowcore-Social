// Enhanced Database Types - Reflects the new normalized schema

// ==========================================
// ORGANIZATION SETTINGS INTERFACES
// ==========================================

export interface OrganizationSettings {
  // Brand and appearance settings
  brand_settings?: {
    primary_color?: string
    secondary_color?: string
    logo_url?: string
    brand_voice?: 'professional' | 'casual' | 'friendly' | 'luxury' | 'tech' | 'creative'
    brand_guidelines?: string
    default_hashtags?: string[]
    brand_hashtags?: string[]
  }
  
  // Content and publishing settings
  content_settings?: {
    default_platforms?: string[]
    auto_hashtag_suggestions?: boolean
    hashtag_limit?: number
    content_approval_required?: boolean
    default_posting_times?: {
      monday?: string[]
      tuesday?: string[]
      wednesday?: string[]
      thursday?: string[]
      friday?: string[]
      saturday?: string[]
      sunday?: string[]
    }
    content_categories?: string[]
    ai_content_generation?: boolean
    content_templates?: Array<{
      name: string
      template: string
      variables: string[]
    }>
  }
  
  // Analytics and reporting settings
  analytics_settings?: {
    dashboard_refresh_interval?: number
    default_date_range?: '7d' | '30d' | '90d' | '1y'
    custom_metrics?: string[]
    report_automation?: boolean
    report_recipients?: string[]
    kpi_targets?: {
      engagement_rate?: number
      reach_target?: number
      follower_growth?: number
    }
  }
  
  // Team and collaboration settings
  team_settings?: {
    member_invitation_required?: boolean
    default_member_role?: 'editor' | 'member' | 'viewer'
    content_ownership?: 'creator' | 'organization'
    collaboration_features?: {
      comments_enabled?: boolean
      approval_workflow?: boolean
      content_locking?: boolean
    }
  }
  
  // Integration and API settings
  integration_settings?: {
    webhook_urls?: string[]
    api_rate_limits?: {
      requests_per_minute?: number
      requests_per_hour?: number
    }
    third_party_integrations?: {
      slack?: boolean
      discord?: boolean
      email_notifications?: boolean
    }
  }
  
  // Security and compliance settings
  security_settings?: {
    two_factor_required?: boolean
    session_timeout_minutes?: number
    ip_whitelist?: string[]
    audit_logging?: boolean
    data_retention_days?: number
  }
  
  // Notification settings
  notification_settings?: {
    email_notifications?: {
      post_published?: boolean
      engagement_alerts?: boolean
      system_updates?: boolean
      weekly_reports?: boolean
    }
    push_notifications?: {
      mentions?: boolean
      comments?: boolean
      direct_messages?: boolean
    }
  }
}

// ==========================================
// USER PERMISSIONS INTERFACES
// ==========================================

export interface UserPermissions {
  // Content management permissions
  content_permissions?: {
    create_posts?: boolean
    edit_posts?: boolean
    delete_posts?: boolean
    publish_posts?: boolean
    schedule_posts?: boolean
    approve_content?: boolean
    access_drafts?: boolean
    view_analytics?: boolean
  }
  
  // Media management permissions
  media_permissions?: {
    upload_media?: boolean
    delete_media?: boolean
    organize_media?: boolean
    access_media_library?: boolean
    edit_media_metadata?: boolean
  }
  
  // Team management permissions
  team_permissions?: {
    invite_members?: boolean
    remove_members?: boolean
    change_roles?: boolean
    view_member_list?: boolean
    manage_roles?: boolean
  }
  
  // Account management permissions
  account_permissions?: {
    manage_social_accounts?: boolean
    view_billing?: boolean
    update_settings?: boolean
    access_api_keys?: boolean
    manage_integrations?: boolean
  }
  
  // Analytics and reporting permissions
  analytics_permissions?: {
    view_dashboard?: boolean
    export_reports?: boolean
    access_advanced_analytics?: boolean
    view_competitor_data?: boolean
    create_custom_reports?: boolean
  }
  
  // AI and automation permissions
  ai_permissions?: {
    use_ai_content_generation?: boolean
    access_ai_suggestions?: boolean
    configure_ai_settings?: boolean
    view_ai_analytics?: boolean
  }
  
  // Organization settings permissions
  settings_permissions?: {
    modify_brand_settings?: boolean
    change_content_settings?: boolean
    update_team_settings?: boolean
    manage_integrations?: boolean
    access_security_settings?: boolean
  }
}

// ==========================================
// USER PREFERENCES INTERFACES
// ==========================================

export interface UserPreferences {
  // Interface and display preferences
  interface_preferences?: {
    theme?: 'light' | 'dark' | 'auto'
    language?: string
    timezone?: string
    date_format?: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD'
    time_format?: '12h' | '24h'
    dashboard_layout?: 'grid' | 'list' | 'compact'
    sidebar_collapsed?: boolean
    notifications_position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left'
  }
  
  // Content creation preferences
  content_preferences?: {
    default_content_type?: 'image' | 'video' | 'text' | 'carousel'
    preferred_platforms?: string[]
    auto_save_drafts?: boolean
    draft_auto_save_interval?: number
    default_hashtag_count?: number
    content_templates?: Array<{
      name: string
      template: string
      is_default?: boolean
    }>
    caption_length_preference?: 'short' | 'medium' | 'long'
    include_alt_text?: boolean
  }
  
  // Publishing preferences
  publishing_preferences?: {
    default_posting_times?: {
      monday?: string[]
      tuesday?: string[]
      wednesday?: string[]
      thursday?: string[]
      friday?: string[]
      saturday?: string[]
      sunday?: string[]
    }
    auto_schedule?: boolean
    schedule_buffer_minutes?: number
    cross_platform_posting?: boolean
    platform_specific_captions?: boolean
    approval_workflow_enabled?: boolean
  }
  
  // Analytics and insights preferences
  analytics_preferences?: {
    dashboard_refresh_rate?: number
    default_date_range?: '7d' | '30d' | '90d' | '1y' | 'custom'
    show_engagement_rates?: boolean
    show_reach_estimates?: boolean
    export_format?: 'csv' | 'pdf' | 'excel'
    weekly_report_enabled?: boolean
    performance_alerts?: {
      low_engagement?: boolean
      high_engagement?: boolean
      follower_drop?: boolean
    }
  }
  
  // AI and automation preferences
  ai_preferences?: {
    ai_content_suggestions?: boolean
    ai_hashtag_suggestions?: boolean
    ai_caption_generation?: boolean
    ai_optimization_suggestions?: boolean
    ai_learning_enabled?: boolean
    ai_model_preference?: 'gpt-4' | 'gpt-3.5-turbo' | 'claude' | 'auto'
    ai_creativity_level?: 'conservative' | 'balanced' | 'creative'
  }
  
  // Notification preferences
  notification_preferences?: {
    email_notifications?: {
      post_published?: boolean
      engagement_alerts?: boolean
      mention_notifications?: boolean
      comment_notifications?: boolean
      direct_message_notifications?: boolean
      weekly_reports?: boolean
      system_updates?: boolean
    }
    push_notifications?: {
      new_interactions?: boolean
      scheduled_posts?: boolean
      content_approvals?: boolean
      team_mentions?: boolean
    }
    notification_frequency?: 'immediate' | 'hourly' | 'daily' | 'weekly'
    quiet_hours?: {
      enabled?: boolean
      start_time?: string
      end_time?: string
      timezone?: string
    }
  }
  
  // Privacy and data preferences
  privacy_preferences?: {
    profile_visibility?: 'public' | 'private' | 'organization_only'
    data_sharing?: {
      analytics_data?: boolean
      usage_statistics?: boolean
      feedback_data?: boolean
    }
    content_privacy?: {
      draft_visibility?: 'private' | 'team' | 'organization'
      analytics_sharing?: 'private' | 'team' | 'organization'
    }
  }
}

export interface SimilarityMetadata {
  matchedFields: string[]
  relevanceScore: number
  contextSnippet?: string
  boostFactors?: {
    recency?: number
    popularity?: number
    userAffinity?: number
  }
}

export interface PostMetadata {
  // Content and engagement metadata
  content_type?: 'image' | 'video' | 'carousel' | 'story' | 'reel' | 'text'
  engagement_prediction?: number
  reach_estimate?: number
  best_posting_time?: string
  
  // Platform-specific metadata
  platform_specific?: {
    instagram?: {
      story_mentions?: string[]
      location_tag?: string
      music_attribution?: string
      collaboration_invites?: string[]
      carousel_order?: number[]
    }
    facebook?: {
      page_id?: string
      audience_targeting?: {
        age_range?: [number, number]
        locations?: string[]
        interests?: string[]
      }
      boost_post?: boolean
    }
    twitter?: {
      reply_to_tweet_id?: string
      quote_tweet_id?: string
      sensitive_content?: boolean
    }
    linkedin?: {
      company_page_id?: string
      visibility?: 'public' | 'connections' | 'group'
      group_id?: string
    }
    tiktok?: {
      duet_with?: string
      stitch_with?: string
      music_id?: string
      effects_id?: string
    }
  }
  
  // AI and optimization metadata
  ai_generated?: boolean
  ai_model_version?: string
  optimization_score?: number
  hashtag_strategy?: 'trending' | 'niche' | 'branded' | 'mixed'
  
  // Workflow and approval metadata
  approval_status?: 'pending' | 'approved' | 'rejected'
  approver_id?: string
  approval_notes?: string
  campaign_id?: string
  content_batch_id?: string
  
  // Analytics and tracking metadata
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
  custom_tracking_params?: Record<string, string>
  
  // Content generation metadata
  generated_from_idea_id?: string
  inspiration_sources?: string[]
  content_mood?: 'professional' | 'casual' | 'funny' | 'inspirational' | 'educational'
  brand_voice_match_score?: number
  
  // Publishing metadata
  retry_count?: number
  max_retries?: number
  retry_delay_minutes?: number
  exponential_backoff?: boolean
  retry_reason?: string
  
  // Legacy and custom fields
  [key: string]: any
}

export interface MediaMetadata {
  // File and technical metadata
  file_format?: string
  compression_quality?: number
  color_profile?: string
  bitrate?: number
  frame_rate?: number
  codec?: string
  
  // Image-specific metadata
  image_metadata?: {
    exif_data?: {
      camera_make?: string
      camera_model?: string
      exposure_time?: string
      f_number?: number
      iso_speed?: number
      focal_length?: number
      gps_latitude?: number
      gps_longitude?: number
      date_taken?: string
    }
    dominant_colors?: string[]
    color_palette?: string[]
    brightness?: number
    contrast?: number
    saturation?: number
  }
  
  // Video-specific metadata
  video_metadata?: {
    resolution?: string
    aspect_ratio?: string
    video_codec?: string
    audio_codec?: string
    audio_channels?: number
    audio_sample_rate?: number
    keyframes?: number
    bitrate_mode?: 'constant' | 'variable'
  }
  
  // Processing and optimization metadata
  processing_status?: 'pending' | 'processing' | 'completed' | 'failed'
  processing_errors?: string[]
  optimization_applied?: boolean
  thumbnail_generated?: boolean
  
  // AI and analysis metadata
  ai_analysis?: {
    content_tags?: string[]
    content_moderation_score?: number
    nsfw_probability?: number
    quality_score?: number
    aesthetic_score?: number
    brand_safety_score?: number
  }
  
  // Storage and delivery metadata
  cdn_url?: string
  storage_bucket?: string
  storage_path?: string
  access_control?: 'public' | 'private' | 'organization'
  
  // Usage and tracking metadata
  usage_count?: number
  last_accessed?: string
  download_count?: number
  view_count?: number
  
  // Custom and legacy fields
  [key: string]: any
}

// ==========================================
// PUBLISHING SYSTEM INTERFACES
// ==========================================

export interface PublishingMetadata {
  platform_specific_settings?: {
    instagram?: {
      story_mentions?: string[]
      location_tag?: string
      music_attribution?: string
      collaboration_invites?: string[]
    }
    facebook?: {
      page_id?: string
      audience_targeting?: {
        age_range?: [number, number]
        locations?: string[]
        interests?: string[]
      }
      boost_post?: boolean
    }
    twitter?: {
      reply_to_tweet_id?: string
      quote_tweet_id?: string
      sensitive_content?: boolean
    }
    linkedin?: {
      company_page_id?: string
      visibility?: 'public' | 'connections' | 'group'
      group_id?: string
    }
    tiktok?: {
      duet_with?: string
      stitch_with?: string
      music_id?: string
      effects_id?: string
    }
  }
  content_optimization?: {
    best_posting_time?: string
    hashtag_strategy?: 'trending' | 'niche' | 'branded' | 'mixed'
    engagement_prediction?: number
    reach_estimate?: number
  }
  workflow_metadata?: {
    approval_required?: boolean
    approver_id?: string
    approval_status?: 'pending' | 'approved' | 'rejected'
    approval_notes?: string
    campaign_id?: string
    content_batch_id?: string
  }
  retry_configuration?: {
    max_retries?: number
    retry_delay_minutes?: number
    exponential_backoff?: boolean
    retry_reason?: string
  }
  analytics_tracking?: {
    utm_source?: string
    utm_medium?: string
    utm_campaign?: string
    utm_term?: string
    utm_content?: string
    custom_tracking_params?: Record<string, string>
  }
}

export interface PublishingErrorDetails {
  error_type: 'api_error' | 'authentication_error' | 'rate_limit_error' | 'content_error' | 'network_error' | 'validation_error' | 'unknown_error'
  error_code: string
  error_message: string
  platform_specific_error?: {
    instagram?: {
      error_subcode?: string
      error_user_title?: string
      error_user_msg?: string
      is_transient?: boolean
    }
    facebook?: {
      error_subcode?: number
      error_user_title?: string
      error_user_msg?: string
      fbtrace_id?: string
    }
    twitter?: {
      error_code?: number
      error_message?: string
      error_detail?: string
    }
    linkedin?: {
      error_code?: number
      error_message?: string
      request_id?: string
    }
    tiktok?: {
      error_code?: number
      error_message?: string
      log_id?: string
    }
  }
  retryable: boolean
  retry_after_seconds?: number
  rate_limit_info?: {
    limit: number
    remaining: number
    reset_time: string
  }
  validation_errors?: Array<{
    field: string
    message: string
    code: string
  }>
  debug_info?: {
    request_id?: string
    timestamp: string
    endpoint?: string
    request_body?: Record<string, any>
    response_headers?: Record<string, string>
  }
}

export interface PlatformAPIResponse {
  success: boolean
  platform: 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'tiktok' | 'youtube' | 'pinterest'
  external_post_id?: string
  post_url?: string
  published_at?: string
  platform_specific_data?: {
    instagram?: {
      media_id?: string
      permalink?: string
      shortcode?: string
      media_type?: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM' | 'STORY'
      thumbnail_url?: string
    }
    facebook?: {
      post_id?: string
      page_id?: string
      permalink?: string
      reach_estimate?: number
    }
    twitter?: {
      tweet_id?: string
      tweet_url?: string
      conversation_id?: string
    }
    linkedin?: {
      post_id?: string
      post_url?: string
      company_id?: string
    }
    tiktok?: {
      video_id?: string
      video_url?: string
      share_url?: string
    }
    youtube?: {
      video_id?: string
      video_url?: string
      channel_id?: string
    }
    pinterest?: {
      pin_id?: string
      pin_url?: string
      board_id?: string
    }
  }
  api_metadata?: {
    response_time_ms: number
    rate_limit_remaining?: number
    rate_limit_reset?: string
    request_id?: string
    api_version?: string
  }
  warnings?: Array<{
    code: string
    message: string
    severity: 'low' | 'medium' | 'high'
  }>
  insights?: {
    estimated_reach?: number
    estimated_engagement?: number
    best_posting_time?: string
    hashtag_performance?: Array<{
      hashtag: string
      estimated_reach: number
    }>
  }
}

// ==========================================
// STRUCTURED METADATA INTERFACES
// ==========================================

/**
 * Base metadata interface with common fields across all metadata types
 */
export interface BaseMetadata {
  version: string
  source: string
  lastModifiedBy: string
  tags: string[]
  created_at: string
  updated_at: string
}

/**
 * Time series metrics metadata
 */
export interface TimeSeriesMetadata extends BaseMetadata {
  type: 'time_series_metrics'
  aggregation_method?: 'sum' | 'average' | 'count' | 'min' | 'max'
  data_quality_score?: number
  outlier_detection?: boolean
  seasonality_pattern?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'none'
  trend_direction?: 'increasing' | 'decreasing' | 'stable' | 'fluctuating'
  confidence_interval?: {
    lower: number
    upper: number
    confidence_level: number
  }
}

/**
 * Embeddings metadata
 */
export interface EmbeddingMetadata extends BaseMetadata {
  type: 'embeddings'
  model_name: string
  model_version: string
  embedding_dimensions: number
  similarity_algorithm: 'cosine' | 'euclidean' | 'manhattan' | 'dot_product'
  chunk_size?: number
  overlap_size?: number
  preprocessing_steps?: string[]
  quality_metrics?: {
    coherence_score?: number
    diversity_score?: number
    relevance_score?: number
  }
}

/**
 * AI context logs metadata
 */
export interface AIContextMetadata extends BaseMetadata {
  type: 'ai_context_logs'
  model_provider: 'openai' | 'anthropic' | 'google' | 'azure' | 'custom'
  model_name: string
  model_version: string
  temperature?: number
  max_tokens?: number
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
  response_time_ms?: number
  context_window_size?: number
  memory_usage?: {
    input_tokens: number
    output_tokens: number
    total_cost?: number
  }
  performance_metrics?: {
    latency_ms: number
    throughput_tokens_per_second?: number
    error_rate?: number
  }
}

/**
 * AI suggestions metadata
 */
export interface AISuggestionMetadata extends BaseMetadata {
  type: 'ai_suggestions'
  suggestion_category: 'caption' | 'hashtag' | 'content_idea' | 'optimization' | 'timing'
  confidence_score: number
  reasoning?: string
  alternative_suggestions?: string[]
  user_feedback?: {
    rating?: number
    feedback_type?: 'helpful' | 'not_helpful' | 'inappropriate' | 'excellent'
    feedback_text?: string
    applied?: boolean
  }
  performance_tracking?: {
    impressions?: number
    clicks?: number
    conversions?: number
    engagement_rate?: number
  }
}

/**
 * AI insights metadata
 */
export interface AIInsightMetadata extends BaseMetadata {
  type: 'ai_insights'
  insight_type: 'trend' | 'anomaly' | 'pattern' | 'recommendation' | 'prediction'
  confidence_level: 'low' | 'medium' | 'high'
  impact_score?: number
  actionable?: boolean
  time_horizon?: 'immediate' | 'short_term' | 'long_term'
  affected_metrics?: string[]
  supporting_data?: {
    data_points: number
    time_range: string
    statistical_significance?: number
  }
}

export interface AIPromptTemplateMetadata extends BaseMetadata {
  type: 'ai_prompt_templates'
  template_category: 'content_generation' | 'chat_response' | 'analysis' | 'suggestion' | 'trend_analysis'
  template_variables: string[]
  default_values?: Record<string, any>
  validation_rules?: Record<string, any>
  usage_count?: number
  success_rate?: number
  average_response_time_ms?: number
  last_used?: string
  version_history?: Array<{
    version: number
    changes: string
    updated_at: string
  }>
}



/**
 * Social accounts platform metadata
 */
export interface SocialAccountMetadata extends BaseMetadata {
  type: 'social_accounts'
  platform: 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'tiktok' | 'youtube' | 'pinterest'
  account_type: 'personal' | 'business' | 'creator' | 'brand'
  verification_status?: 'verified' | 'unverified' | 'pending'
  follower_count?: number
  following_count?: number
  post_count?: number
  engagement_rate?: number
  account_age_days?: number
  last_activity?: string
  platform_specific?: {
    instagram?: {
      is_private?: boolean
      is_business_account?: boolean
      category?: string
      connected_facebook_page?: string
    }
    facebook?: {
      page_category?: string
      page_verification_status?: string
      followers_count?: number
    }
    twitter?: {
      verified_type?: string
      followers_count?: number
      following_count?: number
      tweet_count?: number
    }
    linkedin?: {
      company_size?: string
      industry?: string
      specialties?: string[]
    }
    tiktok?: {
      follower_count?: number
      following_count?: number
      heart_count?: number
      video_count?: number
    }
    youtube?: {
      subscriber_count?: number
      video_count?: number
      view_count?: number
      channel_type?: 'personal' | 'brand'
    }
    pinterest?: {
      follower_count?: number
      following_count?: number
      board_count?: number
      pin_count?: number
    }
  }
}

/**
 * Content ideas metadata
 */
export interface ContentIdeaMetadata extends BaseMetadata {
  type: 'content_ideas'
  idea_source: 'ai_generated' | 'user_created' | 'trending' | 'competitor_analysis' | 'user_feedback'
  content_category: 'educational' | 'entertainment' | 'promotional' | 'behind_scenes' | 'user_generated'
  target_audience?: string[]
  estimated_engagement?: number
  difficulty_level?: 'easy' | 'medium' | 'hard'
  required_resources?: string[]
  seasonal_relevance?: {
    is_seasonal: boolean
    seasons?: string[]
    holidays?: string[]
  }
  trend_alignment?: {
    trending_topic?: string
    trend_strength?: number
    trend_direction?: 'rising' | 'falling' | 'stable'
  }
  collaboration_potential?: {
    can_collaborate: boolean
    suggested_collaborators?: string[]
    collaboration_type?: 'cross_promotion' | 'co_creation' | 'guest_appearance'
  }
}

/**
 * Calendar events metadata
 */
export interface CalendarEventMetadata extends BaseMetadata {
  type: 'calendar_events'
  event_category: 'content_creation' | 'publishing' | 'campaign' | 'meeting' | 'reminder' | 'holiday'
  priority_level: 'low' | 'medium' | 'high' | 'urgent'
  visibility: 'private' | 'team' | 'organization' | 'public'
  recurrence_type?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
  reminder_settings?: {
    email_reminder?: boolean
    push_reminder?: boolean
    reminder_times?: number[]
  }
  location_details?: {
    type: 'physical' | 'virtual' | 'hybrid'
    address?: string
    coordinates?: { lat: number; lng: number }
    virtual_meeting_url?: string
    virtual_meeting_platform?: string
  }
  attendees_management?: {
    max_attendees?: number
    requires_confirmation?: boolean
    allow_guests?: boolean
    guest_limit?: number
  }
  content_related?: {
    associated_posts?: string[]
    content_theme?: string
    hashtags?: string[]
    campaign_id?: string
  }
}

/**
 * Interactions metadata
 */
export interface InteractionMetadata extends BaseMetadata {
  type: 'interactions'
  interaction_source: 'organic' | 'paid' | 'viral' | 'influencer' | 'user_generated'
  user_type: 'follower' | 'non_follower' | 'influencer' | 'brand' | 'unknown'
  engagement_quality: 'low' | 'medium' | 'high'
  response_urgency: 'low' | 'medium' | 'high' | 'critical'
  automated_response?: {
    enabled: boolean
    response_template?: string
    response_delay_minutes?: number
  }
  follow_up_required?: {
    required: boolean
    follow_up_type?: 'thank_you' | 'question' | 'offer' | 'invitation'
    follow_up_timing?: 'immediate' | 'within_24h' | 'within_week'
  }
  sentiment_analysis?: {
    primary_sentiment: 'positive' | 'neutral' | 'negative' | 'mixed'
    confidence_score: number
    emotion_tags?: string[]
    sarcasm_detected?: boolean
  }
  user_insights?: {
    user_segment?: string
    user_value_score?: number
    previous_interactions?: number
    potential_customer?: boolean
  }
}

/**
 * Chat messages metadata
 */
export interface ChatMessageMetadata extends BaseMetadata {
  type: 'chat_messages'
  conversation_context: 'content_creation' | 'analytics' | 'support' | 'general' | 'optimization'
  message_intent: 'question' | 'request' | 'feedback' | 'clarification' | 'suggestion'
  ai_assistance_level: 'none' | 'suggestions' | 'full_assistance' | 'automated'
  user_context?: {
    current_page?: string
    user_action?: string
    session_duration?: number
    previous_messages_count?: number
  }
  response_quality?: {
    relevance_score?: number
    helpfulness_score?: number
    accuracy_score?: number
    user_satisfaction?: number
  }
  conversation_flow?: {
    turn_number: number
    conversation_depth: number
    topic_shift?: boolean
    resolution_status?: 'resolved' | 'pending' | 'escalated'
  }
  technical_details?: {
    model_used?: string
    response_time_ms?: number
    tokens_used?: number
    cost_estimate?: number
  }
}

/**
 * Instagram reels music info metadata
 */
export interface MusicInfoMetadata extends BaseMetadata {
  type: 'music_info'
  music_source: 'original' | 'licensed' | 'user_uploaded' | 'platform_library'
  music_details: {
    title: string
    artist: string
    duration_seconds: number
    genre?: string
    mood?: string
    tempo_bpm?: number
    key?: string
  }
  usage_rights?: {
    licensed: boolean
    license_type?: string
    usage_restrictions?: string[]
    attribution_required?: boolean
  }
  popularity_metrics?: {
    play_count?: number
    trending_rank?: number
    viral_score?: number
    usage_count?: number
  }
  content_safety?: {
    explicit_content?: boolean
    content_warnings?: string[]
    age_restriction?: boolean
    region_restrictions?: string[]
  }
}

/**
 * Posts unified view metadata
 */
export interface PostsUnifiedMetadata extends BaseMetadata {
  type: 'posts_unified'
  content_quality_score?: number
  engagement_prediction?: number
  reach_estimate?: number
  best_posting_time?: string
  cross_platform_optimization?: {
    platform_specific_captions?: boolean
    platform_specific_hashtags?: boolean
    platform_specific_timing?: boolean
  }
  performance_tracking?: {
    real_time_metrics?: boolean
    conversion_tracking?: boolean
    roi_calculation?: boolean
  }
  content_strategy?: {
    campaign_id?: string
    content_theme?: string
    target_audience?: string[]
    content_pillar?: string
  }
}

/**
 * Discriminated union type for all metadata types
 */
export type TableMetadata = 
  | TimeSeriesMetadata
  | EmbeddingMetadata
  | AIContextMetadata
  | AISuggestionMetadata
  | AIInsightMetadata
  | SocialAccountMetadata
  | ContentIdeaMetadata
  | CalendarEventMetadata
  | InteractionMetadata
  | ChatMessageMetadata
  | MusicInfoMetadata
  | PostsUnifiedMetadata;

/**
 * Type guard functions for metadata types
 */
export const isTimeSeriesMetadata = (metadata: TableMetadata): metadata is TimeSeriesMetadata => 
  metadata.type === 'time_series_metrics';

export const isEmbeddingMetadata = (metadata: TableMetadata): metadata is EmbeddingMetadata => 
  metadata.type === 'embeddings';

export const isAIContextMetadata = (metadata: TableMetadata): metadata is AIContextMetadata => 
  metadata.type === 'ai_context_logs';

export const isAISuggestionMetadata = (metadata: TableMetadata): metadata is AISuggestionMetadata => 
  metadata.type === 'ai_suggestions';

export const isAIInsightMetadata = (metadata: TableMetadata): metadata is AIInsightMetadata => 
  metadata.type === 'ai_insights';

export const isSocialAccountMetadata = (metadata: TableMetadata): metadata is SocialAccountMetadata => 
  metadata.type === 'social_accounts';

export const isContentIdeaMetadata = (metadata: TableMetadata): metadata is ContentIdeaMetadata => 
  metadata.type === 'content_ideas';

export const isCalendarEventMetadata = (metadata: TableMetadata): metadata is CalendarEventMetadata => 
  metadata.type === 'calendar_events';

export const isInteractionMetadata = (metadata: TableMetadata): metadata is InteractionMetadata => 
  metadata.type === 'interactions';

export const isChatMessageMetadata = (metadata: TableMetadata): metadata is ChatMessageMetadata => 
  metadata.type === 'chat_messages';

export const isMusicInfoMetadata = (metadata: TableMetadata): metadata is MusicInfoMetadata => 
  metadata.type === 'music_info';

export const isPostsUnifiedMetadata = (metadata: TableMetadata): metadata is PostsUnifiedMetadata => 
  metadata.type === 'posts_unified';

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
          settings: OrganizationSettings
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
          settings?: OrganizationSettings
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
          settings?: OrganizationSettings
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
          permissions: UserPermissions
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
          permissions?: UserPermissions
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
          permissions?: UserPermissions
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
          onboarding_completed: boolean
          preferences: UserPreferences
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
          onboarding_completed?: boolean
          preferences?: UserPreferences
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
          onboarding_completed?: boolean
          preferences?: UserPreferences
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
          metadata: PostMetadata
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
          metadata?: PostMetadata
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
          metadata?: PostMetadata
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
          metadata: MediaMetadata
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
          metadata?: MediaMetadata
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
          metadata?: MediaMetadata
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
          metadata: TimeSeriesMetadata
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
          metadata?: TimeSeriesMetadata
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
          metadata?: TimeSeriesMetadata
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
          metadata: EmbeddingMetadata
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
          metadata?: EmbeddingMetadata
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
          metadata?: EmbeddingMetadata
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
          metadata: AIContextMetadata
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
          metadata?: AIContextMetadata
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
          metadata?: AIContextMetadata
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
          parameters: AIPromptTemplateMetadata
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
          parameters?: AIPromptTemplateMetadata
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
          parameters?: AIPromptTemplateMetadata
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
          metadata: AISuggestionMetadata
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
          metadata?: AISuggestionMetadata
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
          metadata?: AISuggestionMetadata
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
          metadata: PublishingMetadata
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
          metadata?: PublishingMetadata
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
          metadata?: PublishingMetadata
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
          error_details: PublishingErrorDetails | null
          processing_time_ms: number | null
          api_response: PlatformAPIResponse | null
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
          error_details?: PublishingErrorDetails | null
          processing_time_ms?: number | null
          api_response?: PlatformAPIResponse | null
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
          error_details?: PublishingErrorDetails | null
          processing_time_ms?: number | null
          api_response?: PlatformAPIResponse | null
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
          access_token: string | null // JSON stringified EncryptedData
          refresh_token: string | null // JSON stringified EncryptedData
          token_expires_at: string | null
          status: 'connected' | 'expired' | 'error' | 'disconnected'
          platform_metadata: SocialAccountMetadata
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
          access_token?: string | null // JSON stringified EncryptedData
          refresh_token?: string | null // JSON stringified EncryptedData
          token_expires_at?: string | null
          status?: 'connected' | 'expired' | 'error' | 'disconnected'
          platform_metadata?: SocialAccountMetadata
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
          access_token?: string | null // JSON stringified EncryptedData
          refresh_token?: string | null // JSON stringified EncryptedData
          token_expires_at?: string | null
          status?: 'connected' | 'expired' | 'error' | 'disconnected'
          platform_metadata?: SocialAccountMetadata
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
          metadata: ContentIdeaMetadata
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
          metadata?: ContentIdeaMetadata
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
          metadata?: ContentIdeaMetadata
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
          metadata: CalendarEventMetadata
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
          metadata?: CalendarEventMetadata
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
          metadata?: CalendarEventMetadata
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
          metadata: InteractionMetadata
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
          metadata?: InteractionMetadata
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
          metadata?: InteractionMetadata
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
          metadata: ChatMessageMetadata
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
          metadata?: ChatMessageMetadata
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
          metadata?: ChatMessageMetadata
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
          music_info: MusicInfoMetadata
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
          music_info?: MusicInfoMetadata
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
          music_info?: MusicInfoMetadata
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
          metadata: PostsUnifiedMetadata
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
          organization_subscription_tier: 'free' | 'pro' | 'enterprise' | null
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
          metadata: SimilarityMetadata
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