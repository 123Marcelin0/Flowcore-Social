-- ==========================================
-- MIGRATION 04 - SAFE CLEANUP & CONSOLIDATION
-- Skips Instagram migration due to column structure issues
-- Focuses on essential cleanup and view creation
-- ==========================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. CREATE BACKUP TABLES FOR SAFETY
-- ==========================================

DO $$
BEGIN
    -- Create backup of posts table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts') THEN
        EXECUTE 'CREATE TABLE IF NOT EXISTS posts_backup AS SELECT * FROM posts';
        RAISE NOTICE 'Created backup of posts table';
    END IF;
    
    -- Create backup of post_analytics table if it exists  
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'post_analytics') THEN
        EXECUTE 'CREATE TABLE IF NOT EXISTS post_analytics_backup AS SELECT * FROM post_analytics';
        RAISE NOTICE 'Created backup of post_analytics table';
    END IF;
END $$;

-- ==========================================
-- 2. CREATE ESSENTIAL VIEWS FOR BACKWARD COMPATIBILITY
-- ==========================================

-- Unified posts view (combines normalized tables)
CREATE OR REPLACE VIEW posts_unified AS
SELECT 
    pc.id,
    pc.user_id,
    pc.title,
    pcont.content,
    pc.status,
    pc.platforms,
    pc.scheduled_at,
    pc.published_at,
    pcont.tags,
    -- Aggregate media URLs
    COALESCE(
        (SELECT array_agg(mf.file_path ORDER BY pml.order_index)
         FROM post_media_links pml
         JOIN media_files mf ON mf.id = pml.media_id
         WHERE pml.post_id = pc.id), 
        '{}'::text[]
    ) as media_urls,
    -- Aggregate insights
    COALESCE(
        (SELECT SUM(likes) FROM post_insights WHERE post_id = pc.id), 0
    ) as likes,
    COALESCE(
        (SELECT SUM(comments) FROM post_insights WHERE post_id = pc.id), 0
    ) as comments,
    COALESCE(
        (SELECT SUM(shares) FROM post_insights WHERE post_id = pc.id), 0
    ) as shares,
    COALESCE(
        (SELECT SUM(reach) FROM post_insights WHERE post_id = pc.id), 0
    ) as reach,
    COALESCE(
        (SELECT SUM(impressions) FROM post_insights WHERE post_id = pc.id), 0
    ) as impressions,
    pcont.metadata,
    pc.organization_id,
    pc.created_at,
    pc.updated_at
FROM posts_core pc
LEFT JOIN posts_content pcont ON pcont.post_id = pc.id;

-- Analytics dashboard view
CREATE OR REPLACE VIEW analytics_dashboard AS
SELECT 
    pc.user_id,
    pc.organization_id,
    COUNT(*) as total_posts,
    COUNT(CASE WHEN pc.status = 'published' THEN 1 END) as published_posts,
    COUNT(CASE WHEN pc.status = 'draft' THEN 1 END) as draft_posts,
    COALESCE(AVG(pi.likes), 0) as avg_likes,
    COALESCE(AVG(pi.comments), 0) as avg_comments,
    COALESCE(AVG(pi.shares), 0) as avg_shares,
    COALESCE(SUM(pi.likes), 0) as total_likes,
    COALESCE(SUM(pi.comments), 0) as total_comments,
    COALESCE(SUM(pi.shares), 0) as total_shares,
    COALESCE(SUM(pi.reach), 0) as total_reach,
    COALESCE(SUM(pi.impressions), 0) as total_impressions
FROM posts_core pc
LEFT JOIN post_insights pi ON pi.post_id = pc.id
GROUP BY pc.user_id, pc.organization_id;

-- Top performing posts view  
CREATE OR REPLACE VIEW top_performing_posts AS
SELECT 
    pu.*,
    COALESCE(
        (pu.likes * 1.0 + pu.comments * 2.0 + pu.shares * 3.0) / 
        NULLIF(GREATEST(pu.reach, 1), 0) * 100, 0
    ) as engagement_score
FROM posts_unified pu
WHERE pu.status = 'published'
AND (pu.likes > 0 OR pu.comments > 0 OR pu.shares > 0)
ORDER BY engagement_score DESC;

-- User dashboard summary view
CREATE OR REPLACE VIEW user_dashboard_summary AS
SELECT 
    up.id as user_id,
    up.email,
    up.full_name,
    up.organization_id,
    o.name as organization_name,
    ad.total_posts,
    ad.published_posts,
    ad.draft_posts,
    ad.total_likes,
    ad.total_comments,
    ad.total_shares,
    ad.total_reach,
    ad.total_impressions,
    COALESCE(ad.avg_likes, 0) as avg_engagement
FROM user_profiles up
LEFT JOIN organizations o ON o.id = up.organization_id
LEFT JOIN analytics_dashboard ad ON ad.user_id = up.id;

-- ==========================================
-- 3. CREATE UTILITY FUNCTIONS
-- ==========================================

-- Function to get post performance metrics
CREATE OR REPLACE FUNCTION get_post_performance(post_uuid UUID)
RETURNS TABLE (
    total_engagement INTEGER,
    engagement_rate DECIMAL,
    best_platform VARCHAR,
    performance_score DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(pi.likes + pi.comments + pi.shares), 0)::INTEGER as total_engagement,
        CASE 
            WHEN COALESCE(SUM(pi.reach), 0) > 0 
            THEN (COALESCE(SUM(pi.likes + pi.comments + pi.shares), 0) * 100.0 / SUM(pi.reach))::DECIMAL(5,2)
            ELSE 0::DECIMAL(5,2)
        END as engagement_rate,
        COALESCE(
            (SELECT pi2.platform FROM post_insights pi2 
             WHERE pi2.post_id = post_uuid 
             ORDER BY (pi2.likes + pi2.comments + pi2.shares) DESC 
             LIMIT 1), 
            'unknown'
        )::VARCHAR as best_platform,
        CASE 
            WHEN COALESCE(SUM(pi.reach), 0) > 0 
            THEN (COALESCE(SUM(pi.likes + pi.comments + pi.shares), 0) * 100.0 / SUM(pi.reach))::DECIMAL(5,2)
            ELSE 0::DECIMAL(5,2)
        END as performance_score
    FROM post_insights pi
    WHERE pi.post_id = post_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to archive old metrics (for data management)
CREATE OR REPLACE FUNCTION archive_old_metrics(days_old INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    -- Move old time_series_metrics to archive table
    CREATE TABLE IF NOT EXISTS time_series_metrics_archive (
        LIKE time_series_metrics INCLUDING ALL
    );
    
    WITH archived_rows AS (
        DELETE FROM time_series_metrics 
        WHERE created_at < NOW() - INTERVAL '1 day' * days_old
        RETURNING *
    )
    INSERT INTO time_series_metrics_archive 
    SELECT * FROM archived_rows;
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    
    RAISE NOTICE 'Archived % old metric records', archived_count;
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 4. UPDATE RLS POLICIES FOR VIEWS
-- ==========================================

-- Enable RLS on views (if supported)
DO $$
BEGIN
    -- Note: RLS on views is handled by underlying tables
    RAISE NOTICE 'RLS policies for views are inherited from underlying tables';
END $$;

-- ==========================================
-- 5. CREATE INDEXES FOR VIEW PERFORMANCE
-- ==========================================

-- Indexes to improve view performance (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_posts_core_status_published ON posts_core(status) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_post_insights_engagement ON post_insights((likes + comments + shares));
CREATE INDEX IF NOT EXISTS idx_posts_core_user_org ON posts_core(user_id, organization_id);

-- ==========================================
-- 6. MIGRATION VERIFICATION
-- ==========================================

-- Function to verify migration integrity
CREATE OR REPLACE FUNCTION verify_migration_integrity()
RETURNS TABLE(check_name TEXT, status TEXT, details TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT 'Posts Core Table'::TEXT, 
           CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts_core')
                THEN 'EXISTS' ELSE 'MISSING' END::TEXT,
           COALESCE((SELECT COUNT(*)::TEXT || ' records' FROM posts_core), 'N/A')::TEXT;
           
    RETURN QUERY
    SELECT 'Posts Content Table'::TEXT,
           CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts_content')
                THEN 'EXISTS' ELSE 'MISSING' END::TEXT,
           COALESCE((SELECT COUNT(*)::TEXT || ' records' FROM posts_content), 'N/A')::TEXT;
           
    RETURN QUERY
    SELECT 'Unified Posts View'::TEXT,
           CASE WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'posts_unified')
                THEN 'EXISTS' ELSE 'MISSING' END::TEXT,
           'Backward compatibility view'::TEXT;
           
    RETURN QUERY
    SELECT 'Analytics Dashboard View'::TEXT,
           CASE WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'analytics_dashboard')
                THEN 'EXISTS' ELSE 'MISSING' END::TEXT,
           'Performance metrics view'::TEXT;
           
    RETURN QUERY
    SELECT 'Organizations Setup'::TEXT,
           CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations')
                THEN 'EXISTS' ELSE 'MISSING' END::TEXT,
           COALESCE((SELECT COUNT(*)::TEXT || ' organizations' FROM organizations), 'N/A')::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 7. FINAL CLEANUP (OPTIONAL)
-- ==========================================

-- Mark legacy tables for future removal (don't actually drop them yet)
DO $$
BEGIN
    -- Add comments to legacy tables to mark them for cleanup
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'content_generations') THEN
        EXECUTE 'COMMENT ON TABLE content_generations IS ''LEGACY: Consider archiving/removing after Migration 04''';
        RAISE NOTICE 'Marked content_generations for future cleanup';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hashtag_analytics') THEN
        EXECUTE 'COMMENT ON TABLE hashtag_analytics IS ''LEGACY: Consider archiving/removing after Migration 04''';
        RAISE NOTICE 'Marked hashtag_analytics for future cleanup';
    END IF;
    
    -- Note: Instagram tables will need manual review due to column structure differences
    RAISE NOTICE 'Instagram tables need manual review - column structure differs from expected';
END $$;

-- ==========================================
-- MIGRATION 04 COMPLETE
-- ==========================================

DO $$
BEGIN
    RAISE NOTICE 'Migration 04 (Safe) completed successfully!';
    RAISE NOTICE 'Created essential views: posts_unified, analytics_dashboard, top_performing_posts, user_dashboard_summary';
    RAISE NOTICE 'Created utility functions: get_post_performance, archive_old_metrics, verify_migration_integrity';
    RAISE NOTICE 'Instagram table consolidation skipped - needs manual review';
    RAISE NOTICE 'Run SELECT * FROM verify_migration_integrity() to check status';
END $$; 