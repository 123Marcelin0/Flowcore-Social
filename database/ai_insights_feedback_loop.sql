-- ==========================================
-- AI INSIGHTS FEEDBACK LOOP SYSTEM
-- Real-time learning from Meta/Instagram/Facebook metrics
-- ==========================================

-- 1. AI Insights Table - Stores performance data with AI analysis
CREATE TABLE IF NOT EXISTS ai_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL CHECK (platform IN ('instagram', 'facebook', 'twitter', 'linkedin', 'tiktok')),
    
    -- External platform data
    external_post_id VARCHAR(255),
    external_account_id VARCHAR(255),
    
    -- Performance metrics
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    saves_count INTEGER DEFAULT 0,
    reach INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    engagement_rate DECIMAL(5,4) DEFAULT 0.0000,
    
    -- Time-based performance
    performance_24h JSONB DEFAULT '{}', -- Hourly breakdown for first 24h
    performance_7d JSONB DEFAULT '{}',  -- Daily breakdown for first 7 days
    peak_engagement_time TIME,
    
    -- Content analysis
    content_features JSONB DEFAULT '{}', -- Emojis, hashtags, mentions, CTAs
    post_timing JSONB DEFAULT '{}',      -- Day of week, time posted
    
    -- AI learning data
    predicted_performance JSONB DEFAULT '{}', -- What AI predicted vs actual
    performance_category VARCHAR(50),          -- 'high', 'medium', 'low' performer
    learning_insights JSONB DEFAULT '{}',     -- Patterns detected
    confidence_score DECIMAL(5,4) DEFAULT 0.0000,
    
    -- Metadata
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sync_status VARCHAR(50) DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed', 'outdated')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Performance Patterns Table - Stores detected patterns
CREATE TABLE IF NOT EXISTS performance_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id),
    
    -- Pattern identification
    pattern_type VARCHAR(100) NOT NULL, -- 'emoji_usage', 'posting_time', 'hashtag_strategy', 'content_length', etc.
    pattern_name VARCHAR(255) NOT NULL,
    
    -- Pattern data
    pattern_config JSONB NOT NULL, -- Configuration/rules for this pattern
    sample_posts UUID[], -- Array of post IDs that match this pattern
    
    -- Performance impact
    avg_engagement_lift DECIMAL(5,4) DEFAULT 0.0000, -- How much this pattern improves engagement
    confidence_level DECIMAL(5,4) DEFAULT 0.0000,    -- How confident we are in this pattern
    sample_size INTEGER DEFAULT 0,
    
    -- Usage in suggestions
    times_suggested INTEGER DEFAULT 0,
    times_accepted INTEGER DEFAULT 0,
    acceptance_rate DECIMAL(5,4) DEFAULT 0.0000,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    priority_score DECIMAL(5,4) DEFAULT 0.5000, -- Higher = more likely to be used in suggestions
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, pattern_type, pattern_name)
);

-- 3. Social Platform Sync Status Table
CREATE TABLE IF NOT EXISTS platform_sync_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    
    -- Sync configuration
    sync_enabled BOOLEAN DEFAULT TRUE,
    sync_frequency_hours INTEGER DEFAULT 6, -- How often to sync
    last_sync_at TIMESTAMP WITH TIME ZONE,
    next_sync_at TIMESTAMP WITH TIME ZONE,
    
    -- API status
    api_status VARCHAR(50) DEFAULT 'active' CHECK (api_status IN ('active', 'rate_limited', 'expired', 'error')),
    api_error_message TEXT,
    api_rate_limit_reset TIMESTAMP WITH TIME ZONE,
    
    -- Sync statistics
    total_posts_synced INTEGER DEFAULT 0,
    failed_syncs INTEGER DEFAULT 0,
    last_successful_sync TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, platform)
);

-- 4. Create indexes for performance
CREATE INDEX idx_ai_insights_user_id ON ai_insights(user_id);
CREATE INDEX idx_ai_insights_post_id ON ai_insights(post_id);
CREATE INDEX idx_ai_insights_platform ON ai_insights(platform);
CREATE INDEX idx_ai_insights_performance_category ON ai_insights(performance_category);
CREATE INDEX idx_ai_insights_last_synced ON ai_insights(last_synced_at);
CREATE INDEX idx_ai_insights_external_post_id ON ai_insights(external_post_id);

CREATE INDEX idx_performance_patterns_user_id ON performance_patterns(user_id);
CREATE INDEX idx_performance_patterns_type ON performance_patterns(pattern_type);
CREATE INDEX idx_performance_patterns_active ON performance_patterns(is_active);
CREATE INDEX idx_performance_patterns_priority ON performance_patterns(priority_score);

CREATE INDEX idx_platform_sync_user_platform ON platform_sync_status(user_id, platform);
CREATE INDEX idx_platform_sync_next_sync ON platform_sync_status(next_sync_at);

-- 5. Functions for pattern analysis
CREATE OR REPLACE FUNCTION analyze_user_patterns(input_user_id UUID)
RETURNS TABLE(
    pattern_type TEXT,
    pattern_name TEXT,
    engagement_lift DECIMAL,
    confidence DECIMAL,
    sample_size INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pp.pattern_type::TEXT,
        pp.pattern_name::TEXT,
        pp.avg_engagement_lift,
        pp.confidence_level,
        pp.sample_size
    FROM performance_patterns pp
    WHERE pp.user_id = input_user_id
      AND pp.is_active = TRUE
      AND pp.confidence_level > 0.7
    ORDER BY pp.priority_score DESC, pp.avg_engagement_lift DESC;
END;
$$ LANGUAGE plpgsql;

-- 6. Function to get high-performing posts for pattern detection
CREATE OR REPLACE FUNCTION get_high_performing_posts(input_user_id UUID, min_engagement_rate DECIMAL DEFAULT 0.05)
RETURNS TABLE(
    post_id UUID,
    platform TEXT,
    engagement_rate DECIMAL,
    likes_count INTEGER,
    comments_count INTEGER,
    content_features JSONB,
    post_timing JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ai.post_id,
        ai.platform::TEXT,
        ai.engagement_rate,
        ai.likes_count,
        ai.comments_count,
        ai.content_features,
        ai.post_timing
    FROM ai_insights ai
    WHERE ai.user_id = input_user_id
      AND ai.engagement_rate >= min_engagement_rate
      AND ai.performance_category IN ('high', 'medium')
      AND ai.sync_status = 'synced'
    ORDER BY ai.engagement_rate DESC, ai.created_at DESC
    LIMIT 50;
END;
$$ LANGUAGE plpgsql;

-- 7. Function to update pattern priorities based on recent performance
CREATE OR REPLACE FUNCTION update_pattern_priorities(input_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    pattern_record RECORD;
    recent_performance DECIMAL;
    updated_count INTEGER DEFAULT 0;
BEGIN
    -- Loop through active patterns for the user
    FOR pattern_record IN 
        SELECT * FROM performance_patterns 
        WHERE user_id = input_user_id AND is_active = TRUE
    LOOP
        -- Calculate recent performance for posts using this pattern
        SELECT AVG(ai.engagement_rate) INTO recent_performance
        FROM ai_insights ai
        WHERE ai.user_id = input_user_id
          AND ai.post_id = ANY(pattern_record.sample_posts)
          AND ai.created_at >= NOW() - INTERVAL '30 days';
        
        -- Update priority based on recent performance
        IF recent_performance IS NOT NULL THEN
            UPDATE performance_patterns 
            SET 
                priority_score = LEAST(1.0, recent_performance * 10), -- Scale 0-1
                updated_at = NOW()
            WHERE id = pattern_record.id;
            
            updated_count := updated_count + 1;
        END IF;
    END LOOP;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- 8. Create views for easy reporting
CREATE OR REPLACE VIEW user_performance_summary AS
SELECT 
    ai.user_id,
    ai.platform,
    COUNT(*) as total_posts,
    AVG(ai.engagement_rate) as avg_engagement_rate,
    AVG(ai.likes_count) as avg_likes,
    AVG(ai.comments_count) as avg_comments,
    AVG(ai.reach) as avg_reach,
    COUNT(CASE WHEN ai.performance_category = 'high' THEN 1 END) as high_performers,
    COUNT(CASE WHEN ai.performance_category = 'low' THEN 1 END) as low_performers,
    MAX(ai.last_synced_at) as last_sync
FROM ai_insights ai
WHERE ai.sync_status = 'synced'
GROUP BY ai.user_id, ai.platform;

-- 9. Sample pattern detection queries (to be used in the application)
-- These would be run periodically to detect new patterns

-- Example: Detect optimal posting times
-- SELECT 
--     EXTRACT(HOUR FROM (post_timing->>'posted_at')::TIMESTAMP) as hour,
--     AVG(engagement_rate) as avg_engagement,
--     COUNT(*) as post_count
-- FROM ai_insights 
-- WHERE user_id = $1 AND performance_category IN ('high', 'medium')
-- GROUP BY EXTRACT(HOUR FROM (post_timing->>'posted_at')::TIMESTAMP)
-- ORDER BY avg_engagement DESC;

-- Example: Detect effective emoji usage
-- SELECT 
--     content_features->>'emoji_count' as emoji_count,
--     AVG(engagement_rate) as avg_engagement,
--     COUNT(*) as post_count
-- FROM ai_insights 
-- WHERE user_id = $1 AND content_features->>'emoji_count' IS NOT NULL
-- GROUP BY content_features->>'emoji_count'
-- ORDER BY avg_engagement DESC;

-- ==========================================
-- SETUP COMPLETE
-- ==========================================

-- Notify completion
DO $$
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'AI INSIGHTS FEEDBACK LOOP SYSTEM READY!';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Tables created:';
    RAISE NOTICE '- ai_insights (performance tracking)';
    RAISE NOTICE '- performance_patterns (learning patterns)';
    RAISE NOTICE '- platform_sync_status (API sync management)';
    RAISE NOTICE '';
    RAISE NOTICE 'Functions created:';
    RAISE NOTICE '- analyze_user_patterns()';
    RAISE NOTICE '- get_high_performing_posts()';
    RAISE NOTICE '- update_pattern_priorities()';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Set up Meta API credentials';
    RAISE NOTICE '2. Configure sync schedules';
    RAISE NOTICE '3. Start pattern detection process';
    RAISE NOTICE '';
    RAISE NOTICE 'System ready for real-time learning! 🚀';
END $$; 