-- ==========================================
-- COMPREHENSIVE DATABASE STATUS CHECK
-- Run this to see what migration changes were applied
-- ==========================================

-- Check 1: What extensions are enabled
SELECT 'EXTENSIONS CHECK' as check_category, 
       extname as name, 
       '✅ ENABLED' as status,
       extversion as version
FROM pg_extension 
WHERE extname IN ('uuid-ossp', 'vector', 'pgcrypto')
ORDER BY extname;

-- ==========================================
-- MIGRATION 01: POSTS NORMALIZATION STATUS
-- ==========================================

SELECT 'MIGRATION 01 - POSTS NORMALIZATION' as check_category, '' as name, '' as status, '' as details
UNION ALL

-- Check Migration 01 tables (safely)
SELECT 'Migration 01 Tables' as check_category,
       table_name as name,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t.table_name) 
            THEN '✅ EXISTS' ELSE '❌ MISSING' END as status,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t.table_name)
            THEN 'Table created' ELSE 'Need Migration 01' END as details
FROM (VALUES 
    ('posts_core'),
    ('posts_content'), 
    ('media_files'),
    ('post_media_links'),
    ('post_insights')
) AS t(table_name)

-- ==========================================
-- MIGRATION 02: UNIFIED METRICS & EMBEDDINGS STATUS
-- ==========================================

UNION ALL
SELECT 'MIGRATION 02 - UNIFIED METRICS & EMBEDDINGS' as check_category, '' as name, '' as status, '' as details

UNION ALL

SELECT 'Migration 02 Tables' as check_category,
       table_name as name,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t.table_name) 
            THEN '✅ EXISTS' ELSE '❌ MISSING' END as status,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t.table_name)
            THEN 'Table created' ELSE 'Need Migration 02' END as details
FROM (VALUES 
    ('time_series_metrics'),
    ('embeddings')
) AS t(table_name)

-- ==========================================
-- MIGRATION 03: ORGANIZATIONS & AI CONTEXT STATUS
-- ==========================================

UNION ALL
SELECT 'MIGRATION 03 - ORGANIZATIONS & AI CONTEXT' as check_category, '' as name, '' as status, '' as details

UNION ALL

SELECT 'Migration 03 Tables' as check_category,
       table_name as name,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t.table_name) 
            THEN '✅ EXISTS' ELSE '❌ MISSING' END as status,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t.table_name)
            THEN 'Table created' ELSE 'Need Migration 03' END as details
FROM (VALUES 
    ('organizations'),
    ('organization_members'),
    ('ai_context_logs'),
    ('ai_prompts'),
    ('ai_suggestions'),
    ('publishing_queue')
) AS t(table_name)

-- ==========================================
-- ORGANIZATION_ID COLUMN STATUS CHECK
-- ==========================================

UNION ALL
SELECT 'ORGANIZATION_ID COLUMNS' as check_category, '' as name, '' as status, '' as details

UNION ALL

SELECT 'organization_id Columns' as check_category,
       table_name as name,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t.table_name AND column_name = 'organization_id')
            THEN '✅ EXISTS' ELSE '❌ MISSING' END as status,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t.table_name AND column_name = 'organization_id')
            THEN 'UUID column' ELSE 'Need to add' END as details
FROM (VALUES 
    ('user_profiles'),
    ('posts_core'),
    ('posts'),
    ('content_ideas'),
    ('calendar_events'),
    ('social_accounts'),
    ('interactions'),
    ('chat_messages')
) AS t(table_name)
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t.table_name)

-- ==========================================
-- ORIGINAL TABLES THAT SHOULD BE CLEANED UP
-- ==========================================

UNION ALL
SELECT 'TABLES TO CLEANUP (Migration 04)' as check_category, '' as name, '' as status, '' as details

UNION ALL

SELECT 'Tables to Cleanup' as check_category,
       table_name as name,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t.table_name)
            THEN '⚠️ STILL EXISTS' ELSE '✅ CLEANED UP' END as status,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t.table_name)
            THEN 'Should be consolidated/removed' ELSE 'Already gone' END as details
FROM (VALUES 
    ('instagramreelsscraper'),
    ('instagramreelscraper'),
    ('content_generations'),
    ('hashtag_analytics')
) AS t(table_name)

-- ==========================================
-- FUNCTIONS STATUS CHECK
-- ==========================================

UNION ALL
SELECT 'FUNCTIONS STATUS' as check_category, '' as name, '' as status, '' as details

UNION ALL

SELECT 'Functions' as check_category,
       routine_name as name,
       '✅ EXISTS' as status,
       routine_type as details
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'find_similar_content',
    'get_metrics_aggregated', 
    'user_has_org_permission',
    'get_organization_usage',
    'verify_migration_integrity',
    'archive_old_metrics'
)

-- ==========================================
-- VIEWS STATUS CHECK
-- ==========================================

UNION ALL
SELECT 'VIEWS STATUS' as check_category, '' as name, '' as status, '' as details

UNION ALL

SELECT 'Views' as check_category,
       table_name as name,
       '✅ EXISTS' as status,
       'View for backward compatibility' as details
FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name IN (
    'posts_unified',
    'analytics_dashboard',
    'top_performing_posts',
    'user_dashboard_summary'
)

ORDER BY check_category, name; 