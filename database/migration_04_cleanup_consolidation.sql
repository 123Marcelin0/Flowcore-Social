-- Migration 04: Cleanup & Consolidation
-- Removes redundant tables and finalizes the schema refactoring

-- ==========================================
-- 1. BACKUP OLD TABLES BEFORE CLEANUP
-- ==========================================

-- Create backup tables for safety (can be dropped after verification)
CREATE TABLE posts_backup AS SELECT * FROM posts;
CREATE TABLE post_analytics_backup AS SELECT * FROM post_analytics;

-- ==========================================
-- 2. CONSOLIDATE DUPLICATE INSTAGRAM SCRAPER TABLES
-- ==========================================

-- Create unified Instagram reels table
CREATE TABLE instagram_reels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_reel_id VARCHAR(255) UNIQUE,
    reel_url TEXT NOT NULL,
    thumbnail_url TEXT,
    creator_username TEXT NOT NULL,
    creator_display_name TEXT,
    caption TEXT,
    description TEXT,
    script TEXT,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    engagement_count INTEGER DEFAULT 0,
    hashtags TEXT[] DEFAULT '{}',
    music_info JSONB DEFAULT '{}',
    content_category VARCHAR(100),
    trending_score DECIMAL(5,2) DEFAULT 0.00,
    scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migrate data from existing Instagram scraper tables safely
DO $$
BEGIN
    -- Migrate from instagramreelsscraper (with double 's')
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'instagramreelsscraper') THEN
        INSERT INTO instagram_reels (
            external_reel_id, reel_url, thumbnail_url, creator_username, creator_display_name,
            caption, description, script, likes_count, comments_count, 
            shares_count, views_count, engagement_count, hashtags, music_info, scraped_at
        )
        SELECT 
            -- Extract ID from URL or use a hash of the URL as external_reel_id
            COALESCE(
                NULLIF(split_part(reel_url, '/', -2), ''),  -- Try to extract from URL
                md5(reel_url)  -- Fallback to hash of URL
            ) as external_reel_id,
            reel_url, thumbnail_url, creator_username, creator_display_name,
            COALESCE(caption, title, description) as caption,
            description, script, 
            COALESCE(likes_count, 0), COALESCE(comments_count, 0),
            COALESCE(shares_count, 0), COALESCE(views_count, 0), 
            COALESCE(engagement_count, 0), 
            COALESCE(hashtags, '{}'), COALESCE(music_info, '{}'), 
            COALESCE(scraped_at, created_at)
        FROM instagramreelsscraper
        ON CONFLICT (external_reel_id) DO UPDATE SET
            reel_url = EXCLUDED.reel_url,
            updated_at = NOW();
            
        RAISE NOTICE 'Migrated data from instagramreelsscraper table';
    ELSE
        RAISE NOTICE 'instagramreelsscraper table does not exist, skipping migration';
    END IF;

    -- Migrate from instagramreelscraper (with single 's') if it exists separately
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'instagramreelscraper') THEN
        INSERT INTO instagram_reels (
            external_reel_id, reel_url, thumbnail_url, creator_username, creator_display_name,
            caption, description, script, likes_count, comments_count, 
            shares_count, views_count, engagement_count, hashtags, music_info, scraped_at
        )
        SELECT 
            -- Extract ID from URL or use a hash of the URL as external_reel_id
            COALESCE(
                NULLIF(split_part(reel_url, '/', -2), ''),  -- Try to extract from URL
                md5(reel_url)  -- Fallback to hash of URL
            ) as external_reel_id,
            reel_url, thumbnail_url, creator_username, creator_display_name,
            COALESCE(caption, title, description) as caption,
            description, script, 
            COALESCE(likes_count, 0), COALESCE(comments_count, 0),
            COALESCE(shares_count, 0), COALESCE(views_count, 0), 
            COALESCE(engagement_count, 0), 
            COALESCE(hashtags, '{}'), COALESCE(music_info, '{}'), 
            COALESCE(scraped_at, created_at)
        FROM instagramreelscraper
        ON CONFLICT (external_reel_id) DO UPDATE SET
            reel_url = EXCLUDED.reel_url,
            updated_at = NOW();
            
        RAISE NOTICE 'Migrated data from instagramreelscraper table';
    ELSE
        RAISE NOTICE 'instagramreelscraper table does not exist, skipping migration';
    END IF;
END $$;

-- ==========================================
-- 3. DEPRECATED TABLES CLEANUP
-- ==========================================

-- Drop duplicate/obsolete tables after data migration
DROP TABLE IF EXISTS instagramreelsscraper CASCADE;
DROP TABLE IF EXISTS instagramreelscraper CASCADE; -- Note: both variations mentioned in analysis

-- Remove obsolete content_generations table (replaced by ai_context_logs)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'content_generations') THEN
        -- Migrate any useful data to ai_context_logs first
        INSERT INTO ai_context_logs (user_id, source_type, context_summary, ai_response, metadata)
        SELECT 
            user_id,
            'post' as source_type,
            COALESCE(prompt, 'Content generation') as context_summary,
            COALESCE(generated_content, response) as ai_response,
            jsonb_build_object('migrated_from', 'content_generations', 'original_created_at', created_at)
        FROM content_generations
        WHERE (generated_content IS NOT NULL OR response IS NOT NULL);
        
        -- Now drop the table
        DROP TABLE content_generations CASCADE;
    END IF;
END $$;

-- Clean up fragmented analytics tables
-- (Keep post_analytics for now as it has detailed platform-specific data)
-- But mark hashtag_analytics for consolidation into time_series_metrics

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hashtag_analytics') THEN
        -- Migrate hashtag analytics to unified metrics
        INSERT INTO time_series_metrics (entity_type, entity_id, metric_name, metric_value, recorded_at, platform, metadata)
        SELECT 
            'hashtag' as entity_type,
            hashtag_id as entity_id,
            'impressions' as metric_name,
            impressions as metric_value,
            recorded_at,
            platform,
            jsonb_build_object('source', 'hashtag_analytics', 'posts_count', posts_count)
        FROM hashtag_analytics
        WHERE impressions > 0

        UNION ALL

        SELECT 
            'hashtag' as entity_type,
            hashtag_id as entity_id,
            'reach' as metric_name,
            reach as metric_value,
            recorded_at,
            platform,
            jsonb_build_object('source', 'hashtag_analytics', 'posts_count', posts_count)
        FROM hashtag_analytics
        WHERE reach > 0

        UNION ALL

        SELECT 
            'hashtag' as entity_type,
            hashtag_id as entity_id,
            'engagement' as metric_name,
            engagement as metric_value,
            recorded_at,
            platform,
            jsonb_build_object('source', 'hashtag_analytics', 'posts_count', posts_count)
        FROM hashtag_analytics
        WHERE engagement > 0;

        -- Drop the redundant table
        DROP TABLE hashtag_analytics CASCADE;
    END IF;
END $$;

-- ==========================================
-- 4. CREATE ENHANCED VIEWS FOR BACKWARD COMPATIBILITY
-- ==========================================

-- Create a view that mimics the old posts table structure for backward compatibility
CREATE OR REPLACE VIEW posts_unified AS
SELECT 
    pc.id,
    pc.user_id,
    pc.organization_id,
    pc.title,
    pco.content,
    pco.caption,
    pco.hashtags as tags, -- Map hashtags back to tags for compatibility
    pc.platforms,
    pc.status,
    pc.scheduled_at,
    pc.published_at,
    -- Aggregate media URLs
    COALESCE(
        ARRAY(
            SELECT mf.storage_url 
            FROM post_media_links pml 
            JOIN media_files mf ON pml.media_file_id = mf.id 
            WHERE pml.post_id = pc.id 
            ORDER BY pml.order_index
        ), 
        '{}'
    ) as media_urls,
    -- Aggregate insights
    (SELECT SUM(likes) FROM post_insights WHERE post_id = pc.id) as likes,
    (SELECT SUM(comments_count) FROM post_insights WHERE post_id = pc.id) as comments,
    (SELECT SUM(shares) FROM post_insights WHERE post_id = pc.id) as shares,
    (SELECT SUM(reach) FROM post_insights WHERE post_id = pc.id) as reach,
    (SELECT SUM(impressions) FROM post_insights WHERE post_id = pc.id) as impressions,
    pco.metadata,
    pc.created_at,
    pc.updated_at
FROM posts_core pc
LEFT JOIN posts_content pco ON pc.id = pco.post_id;

-- Create view for analytics dashboard
CREATE OR REPLACE VIEW analytics_dashboard AS
SELECT 
    entity_type,
    entity_id,
    metric_name,
    DATE(recorded_at) as metric_date,
    SUM(metric_value) as daily_total,
    AVG(metric_value) as daily_average,
    platform,
    COUNT(*) as data_points
FROM time_series_metrics
GROUP BY entity_type, entity_id, metric_name, DATE(recorded_at), platform
ORDER BY metric_date DESC;

-- Create view for top performing content
CREATE OR REPLACE VIEW top_performing_posts AS
SELECT 
    p.id,
    p.title,
    p.user_id,
    p.organization_id,
    SUM(CASE WHEN tsm.metric_name = 'likes' THEN tsm.metric_value ELSE 0 END) as total_likes,
    SUM(CASE WHEN tsm.metric_name = 'comments' THEN tsm.metric_value ELSE 0 END) as total_comments,
    SUM(CASE WHEN tsm.metric_name = 'shares' THEN tsm.metric_value ELSE 0 END) as total_shares,
    SUM(CASE WHEN tsm.metric_name = 'reach' THEN tsm.metric_value ELSE 0 END) as total_reach,
    AVG(CASE WHEN tsm.metric_name = 'engagement_rate' THEN tsm.metric_value ELSE NULL END) as avg_engagement_rate,
    p.published_at
FROM posts_core p
LEFT JOIN time_series_metrics tsm ON tsm.entity_type = 'post' AND tsm.entity_id = p.id
WHERE p.status = 'published'
GROUP BY p.id, p.title, p.user_id, p.organization_id, p.published_at
ORDER BY total_likes DESC, total_comments DESC, total_reach DESC;

-- ==========================================
-- 5. CREATE INDEXES FOR NEW CONSOLIDATED TABLES
-- ==========================================

-- Instagram reels indexes
CREATE INDEX idx_instagram_reels_creator ON instagram_reels(creator_username);
CREATE INDEX idx_instagram_reels_engagement ON instagram_reels(engagement_count DESC);
CREATE INDEX idx_instagram_reels_scraped_at ON instagram_reels(scraped_at DESC);
CREATE INDEX idx_instagram_reels_hashtags ON instagram_reels USING gin(hashtags);
CREATE INDEX idx_instagram_reels_trending ON instagram_reels(trending_score DESC);

-- ==========================================
-- 6. CREATE DATA ARCHIVAL SYSTEM
-- ==========================================

-- Create archive tables for older data (cost optimization)
CREATE TABLE time_series_metrics_archive (
    LIKE time_series_metrics INCLUDING ALL
);

-- Function to archive old metrics (older than 1 year)
CREATE OR REPLACE FUNCTION archive_old_metrics()
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    -- Move records older than 1 year to archive
    WITH archived_data AS (
        DELETE FROM time_series_metrics 
        WHERE recorded_at < NOW() - INTERVAL '1 year'
        RETURNING *
    )
    INSERT INTO time_series_metrics_archive 
    SELECT * FROM archived_data;
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    
    -- Log the archival
    INSERT INTO ai_context_logs (
        user_id, 
        source_type, 
        context_summary, 
        metadata
    ) VALUES (
        (SELECT id FROM user_profiles LIMIT 1), -- System user
        'system',
        'Automated metrics archival',
        jsonb_build_object('archived_count', archived_count, 'archived_at', NOW())
    );
    
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 7. CREATE MIGRATION VERIFICATION FUNCTIONS
-- ==========================================

-- Function to verify data integrity after migration
CREATE OR REPLACE FUNCTION verify_migration_integrity()
RETURNS TABLE(
    check_name TEXT,
    status TEXT,
    old_count BIGINT,
    new_count BIGINT,
    data_loss BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    -- Check posts migration
    SELECT 
        'posts_migration'::TEXT as check_name,
        CASE 
            WHEN old_count = new_count THEN 'PASS'
            ELSE 'FAIL'
        END as status,
        old_count,
        new_count,
        old_count != new_count as data_loss
    FROM (
        SELECT 
            (SELECT COUNT(*) FROM posts_backup) as old_count,
            (SELECT COUNT(*) FROM posts_core) as new_count
    ) checks

    UNION ALL

    -- Check analytics migration
    SELECT 
        'analytics_migration'::TEXT as check_name,
        CASE 
            WHEN old_count <= new_count THEN 'PASS' -- Allow for data expansion
            ELSE 'FAIL'
        END as status,
        old_count,
        new_count,
        old_count > new_count as data_loss
    FROM (
        SELECT 
            (SELECT COUNT(*) FROM post_analytics_backup) as old_count,
            (SELECT COUNT(*) FROM time_series_metrics WHERE metadata->>'source' LIKE '%analytics%') as new_count
    ) checks

    UNION ALL

    -- Check embeddings migration
    SELECT 
        'embeddings_migration'::TEXT as check_name,
        CASE 
            WHEN posts_with_embeddings <= embeddings_count THEN 'PASS'
            ELSE 'FAIL'
        END as status,
        posts_with_embeddings as old_count,
        embeddings_count as new_count,
        posts_with_embeddings > embeddings_count as data_loss
    FROM (
        SELECT 
            (SELECT COUNT(*) FROM posts_backup WHERE embedding IS NOT NULL) as posts_with_embeddings,
            (SELECT COUNT(*) FROM embeddings WHERE entity_type = 'post') as embeddings_count
    ) checks;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 8. ENABLE ROW LEVEL SECURITY FOR NEW TABLES
-- ==========================================

ALTER TABLE instagram_reels ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_series_metrics_archive ENABLE ROW LEVEL SECURITY;

-- Create policies for new tables
CREATE POLICY "Instagram reels are publicly readable" ON instagram_reels
    FOR SELECT USING (true);

CREATE POLICY "Only system can insert Instagram reels" ON instagram_reels
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Users can view their archived metrics" ON time_series_metrics_archive
    FOR SELECT USING (
        CASE entity_type
            WHEN 'post' THEN entity_id IN (SELECT id FROM posts_core WHERE user_id = auth.uid())
            WHEN 'user' THEN entity_id = auth.uid()
            ELSE false
        END
    );

-- ==========================================
-- 9. CREATE CLEANUP UTILITY FUNCTIONS
-- ==========================================

-- Function to safely drop old tables after verification
CREATE OR REPLACE FUNCTION finalize_migration_cleanup()
RETURNS TEXT AS $$
DECLARE
    verification_results RECORD;
    all_passed BOOLEAN := TRUE;
    result_text TEXT := '';
BEGIN
    -- Check migration integrity
    FOR verification_results IN 
        SELECT * FROM verify_migration_integrity()
    LOOP
        result_text := result_text || verification_results.check_name || ': ' || verification_results.status || E'\n';
        IF verification_results.status != 'PASS' THEN
            all_passed := FALSE;
        END IF;
    END LOOP;
    
    IF all_passed THEN
        -- Safe to drop backup tables
        DROP TABLE IF EXISTS posts_backup;
        DROP TABLE IF EXISTS post_analytics_backup;
        result_text := result_text || E'\nMigration verified successfully. Backup tables dropped.';
    ELSE
        result_text := result_text || E'\nMigration verification failed. Backup tables preserved.';
    END IF;
    
    RETURN result_text;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 10. GRANT PERMISSIONS FOR NEW OBJECTS
-- ==========================================

GRANT ALL ON instagram_reels TO authenticated;
GRANT ALL ON time_series_metrics_archive TO authenticated;
GRANT SELECT ON posts_unified TO authenticated;
GRANT SELECT ON analytics_dashboard TO authenticated;
GRANT SELECT ON top_performing_posts TO authenticated;
GRANT EXECUTE ON FUNCTION archive_old_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION verify_migration_integrity TO authenticated;
GRANT EXECUTE ON FUNCTION finalize_migration_cleanup TO service_role; -- Only service role can cleanup

-- ==========================================
-- 11. CREATE MIGRATION LOG ENTRY
-- ==========================================

INSERT INTO ai_context_logs (
    user_id,
    source_type,
    context_summary,
    ai_response,
    metadata
) 
SELECT 
    id as user_id,
    'system' as source_type,
    'Database schema migration completed' as context_summary,
    'Successfully migrated to normalized schema with unified metrics and embeddings' as ai_response,
    jsonb_build_object(
        'migration_version', '04_cleanup_consolidation',
        'completed_at', NOW(),
        'tables_created', ARRAY['instagram_reels', 'time_series_metrics_archive'],
        'tables_dropped', ARRAY['instagramreelsscraper', 'instagramreelscraper'],
        'views_created', ARRAY['posts_unified', 'analytics_dashboard', 'top_performing_posts']
    )
FROM user_profiles 
WHERE email LIKE '%admin%' OR id = (SELECT id FROM user_profiles LIMIT 1)
LIMIT 1;

-- Final success message
SELECT 'Schema migration completed successfully! Run verify_migration_integrity() to check data integrity.' as migration_status; 