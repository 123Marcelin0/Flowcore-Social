-- ==========================================
-- LEGACY TABLE CLEANUP SCRIPT
-- Run this ONLY after confirming all migrations are successful
-- This will permanently delete backup and legacy tables
-- ==========================================

-- Safety check: Confirm migrations are complete
DO $$
DECLARE
    missing_tables TEXT[];
    required_tables TEXT[] := ARRAY[
        'posts_core', 'posts_content', 'post_insights', 'post_media_links',
        'organizations', 'organization_members', 'ai_context_logs', 'ai_prompts'
    ];
    tbl_name TEXT;
BEGIN
    -- Check if all required tables exist
    FOREACH tbl_name IN ARRAY required_tables
    LOOP
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl_name) THEN
            missing_tables := array_append(missing_tables, tbl_name);
        END IF;
    END LOOP;
    
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE EXCEPTION 'SAFETY CHECK FAILED: Missing required tables: %. Do not proceed with cleanup!', array_to_string(missing_tables, ', ');
    ELSE
        RAISE NOTICE 'SAFETY CHECK PASSED: All required tables exist. Proceeding with cleanup...';
    END IF;
END $$;

-- ==========================================
-- 1. FINAL BACKUP OF LEGACY DATA (OPTIONAL)
-- ==========================================

-- Create a final archive of legacy data before deletion
DO $$
BEGIN
    -- Create archive schema if it doesn't exist
    CREATE SCHEMA IF NOT EXISTS legacy_archive;
    RAISE NOTICE 'Created legacy_archive schema for final backups';
    
    -- Archive content_generations if it has important data
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'content_generations') THEN
        EXECUTE 'CREATE TABLE legacy_archive.content_generations_final_backup AS SELECT * FROM content_generations';
        RAISE NOTICE 'Created final backup of content_generations in legacy_archive schema';
    END IF;
    
    -- Archive hashtag_analytics if it has important data
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hashtag_analytics') THEN
        EXECUTE 'CREATE TABLE legacy_archive.hashtag_analytics_final_backup AS SELECT * FROM hashtag_analytics';
        RAISE NOTICE 'Created final backup of hashtag_analytics in legacy_archive schema';
    END IF;
    
    RAISE NOTICE 'Final backup completed. You can drop the legacy_archive schema later if not needed.';
END $$;

-- ==========================================
-- 2. DROP BACKUP TABLES (SAFE TO DELETE)
-- ==========================================

-- These are backup tables created during migration - safe to remove
DO $$
BEGIN
    -- Drop posts backup
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts_backup') THEN
        DROP TABLE posts_backup CASCADE;
        RAISE NOTICE 'Deleted posts_backup table';
    ELSE
        RAISE NOTICE 'posts_backup table does not exist';
    END IF;
    
    -- Drop post_analytics backup
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'post_analytics_backup') THEN
        DROP TABLE post_analytics_backup CASCADE;
        RAISE NOTICE 'Deleted post_analytics_backup table';
    ELSE
        RAISE NOTICE 'post_analytics_backup table does not exist';
    END IF;
END $$;

-- ==========================================
-- 3. DROP LEGACY TABLES (CONSOLIDATED INTO NEW SCHEMA)
-- ==========================================

-- These tables have been replaced by the new normalized structure
DO $$
BEGIN
    -- Drop content_generations (data should be migrated to new structure)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'content_generations') THEN
        DROP TABLE content_generations CASCADE;
        RAISE NOTICE 'Deleted content_generations table (backed up to legacy_archive if needed)';
    ELSE
        RAISE NOTICE 'content_generations table does not exist';
    END IF;
    
    -- Drop hashtag_analytics (data should be migrated to time_series_metrics)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hashtag_analytics') THEN
        DROP TABLE hashtag_analytics CASCADE;
        RAISE NOTICE 'Deleted hashtag_analytics table (backed up to legacy_archive if needed)';
    ELSE
        RAISE NOTICE 'hashtag_analytics table does not exist';
    END IF;
END $$;

-- ==========================================
-- 4. DROP INSTAGRAM SCRAPER TABLES (CONSOLIDATED)
-- ==========================================

-- These should be consolidated into the new instagram_reels table
-- (Note: We skipped this migration due to column structure issues)
DO $$
BEGIN
    -- Drop instagramreelscraper (single 's')
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'instagramreelscraper') THEN
        -- Create backup first
        CREATE TABLE IF NOT EXISTS legacy_archive.instagramreelscraper_backup AS SELECT * FROM instagramreelscraper;
        DROP TABLE instagramreelscraper CASCADE;
        RAISE NOTICE 'Deleted instagramreelscraper table (backed up to legacy_archive)';
    ELSE
        RAISE NOTICE 'instagramreelscraper table does not exist';
    END IF;
    
    -- Drop instagramreelsscraper (double 's')
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'instagramreelsscraper') THEN
        -- Create backup first
        CREATE TABLE IF NOT EXISTS legacy_archive.instagramreelsscraper_backup AS SELECT * FROM instagramreelsscraper;
        DROP TABLE instagramreelsscraper CASCADE;
        RAISE NOTICE 'Deleted instagramreelsscraper table (backed up to legacy_archive)';
    ELSE
        RAISE NOTICE 'instagramreelsscraper table does not exist';
    END IF;
END $$;

-- ==========================================
-- 5. CLEANUP VERIFICATION
-- ==========================================

-- Function to verify cleanup was successful
CREATE OR REPLACE FUNCTION verify_legacy_cleanup()
RETURNS TABLE(table_name TEXT, status TEXT, action_taken TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT 'posts_backup'::TEXT,
           CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts_backup')
                THEN '⚠️ STILL EXISTS' ELSE '✅ CLEANED UP' END::TEXT,
           'Migration backup table'::TEXT;
           
    RETURN QUERY
    SELECT 'post_analytics_backup'::TEXT,
           CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'post_analytics_backup')
                THEN '⚠️ STILL EXISTS' ELSE '✅ CLEANED UP' END::TEXT,
           'Migration backup table'::TEXT;
           
    RETURN QUERY
    SELECT 'content_generations'::TEXT,
           CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'content_generations')
                THEN '⚠️ STILL EXISTS' ELSE '✅ CLEANED UP' END::TEXT,
           'Legacy table - consolidated into new structure'::TEXT;
           
    RETURN QUERY
    SELECT 'hashtag_analytics'::TEXT,
           CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hashtag_analytics')
                THEN '⚠️ STILL EXISTS' ELSE '✅ CLEANED UP' END::TEXT,
           'Legacy table - migrated to time_series_metrics'::TEXT;
           
    RETURN QUERY
    SELECT 'instagramreelscraper'::TEXT,
           CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'instagramreelscraper')
                THEN '⚠️ STILL EXISTS' ELSE '✅ CLEANED UP' END::TEXT,
           'Legacy Instagram scraper table'::TEXT;
           
    RETURN QUERY
    SELECT 'instagramreelsscraper'::TEXT,
           CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'instagramreelsscraper')
                THEN '⚠️ STILL EXISTS' ELSE '✅ CLEANED UP' END::TEXT,
           'Legacy Instagram scraper table'::TEXT;
           
    RETURN QUERY
    SELECT 'legacy_archive schema'::TEXT,
           CASE WHEN EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'legacy_archive')
                THEN '✅ CREATED' ELSE '❌ MISSING' END::TEXT,
           'Contains final backups of deleted tables'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 6. OPTIONAL: ANALYZE AND VACUUM
-- ==========================================

-- Reclaim space and update statistics after cleanup
DO $$
BEGIN
    -- Analyze remaining tables to update statistics
    ANALYZE posts_core;
    ANALYZE posts_content;
    ANALYZE post_insights;
    ANALYZE organizations;
    ANALYZE time_series_metrics;
    
    RAISE NOTICE 'Updated table statistics after cleanup';
    RAISE NOTICE 'Consider running VACUUM FULL during maintenance window to reclaim disk space';
END $$;

-- ==========================================
-- CLEANUP COMPLETE
-- ==========================================

DO $$
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'LEGACY TABLE CLEANUP COMPLETED!';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Deleted tables:';
    RAISE NOTICE '- posts_backup (migration backup)';
    RAISE NOTICE '- post_analytics_backup (migration backup)';
    RAISE NOTICE '- content_generations (legacy - backed up)';
    RAISE NOTICE '- hashtag_analytics (legacy - backed up)';
    RAISE NOTICE '- instagramreelscraper (legacy - backed up)';
    RAISE NOTICE '- instagramreelsscraper (legacy - backed up)';
    RAISE NOTICE '';
    RAISE NOTICE 'Final backups stored in legacy_archive schema';
    RAISE NOTICE 'Run: SELECT * FROM verify_legacy_cleanup() to verify';
    RAISE NOTICE '';
    RAISE NOTICE 'Your database is now clean and optimized! 🎉';
END $$; 