-- ==========================================
-- DATABASE NEXT STEPS ANALYSIS
-- Run this after the status check to understand what needs to be done
-- ==========================================

-- 1. DATA MIGRATION STATUS CHECK
SELECT 'DATA MIGRATION STATUS' as analysis_category, '' as item, '' as status, '' as action_needed
UNION ALL

-- Check if posts data was migrated to normalized tables
SELECT 'Data Migration' as analysis_category,
       'Posts → posts_core/posts_content' as item,
       CASE 
           WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts_core') 
           AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts_content')
           THEN '⚠️ TABLES EXIST'
           ELSE '❌ NOT MIGRATED'
       END as status,
       CASE 
           WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts_core')
           THEN 'Run Migration 01 first'
           WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts') 
           THEN 'Migration 01 partially complete - check data'
           ELSE 'Migration 01 complete'
       END as action_needed

UNION ALL

-- Check embeddings migration
SELECT 'Data Migration' as analysis_category,
       'Embeddings consolidation' as item,
       CASE 
           WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'embeddings')
           THEN '✅ TABLE EXISTS'
           ELSE '❌ NOT CREATED'
       END as status,
       CASE 
           WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'embeddings')
           THEN 'Run Migration 02'
           ELSE 'Check if Migration 02 completed successfully'
       END as action_needed

UNION ALL

-- Check organization setup
SELECT 'Data Migration' as analysis_category,
       'Organization setup' as item,
       CASE 
           WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations')
           AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organization_members')
           THEN '✅ TABLES EXIST'
           ELSE '❌ NOT CREATED'
       END as status,
       CASE 
           WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations')
           THEN 'Run Migration 03'
           ELSE 'Check if Migration 03 completed successfully'
       END as action_needed

-- ==========================================
-- 2. FOREIGN KEY RELATIONSHIPS CHECK
-- ==========================================

UNION ALL
SELECT 'FOREIGN KEY RELATIONSHIPS' as analysis_category, '' as item, '' as status, '' as action_needed

UNION ALL

-- Check critical foreign keys
SELECT 'Foreign Keys' as analysis_category,
       tc.table_name || '.' || kcu.column_name || ' → ' || ccu.table_name as item,
       '✅ EXISTS' as status,
       'Good' as action_needed
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name IN ('posts_core', 'posts_content', 'embeddings', 'organization_members', 'ai_context_logs')

-- ==========================================
-- 3. ORIGINAL TABLES STATUS & CLEANUP PLAN
-- ==========================================

UNION ALL
SELECT 'CLEANUP NEEDED' as analysis_category, '' as item, '' as status, '' as action_needed

UNION ALL

SELECT 'Original Tables' as analysis_category,
       'posts (original)' as item,
       CASE 
           WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts')
           THEN '⚠️ STILL EXISTS'
           ELSE '✅ CLEANED UP'
       END as status,
       CASE 
           WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts')
           AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts_core')
           THEN 'Ready for Migration 04 cleanup'
           WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts')
           THEN 'Need to complete data migration first'
           ELSE 'Already cleaned up'
       END as action_needed

UNION ALL

SELECT 'Original Tables' as analysis_category,
       'post_analytics (original)' as item,
       CASE 
           WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'post_analytics')
           THEN '⚠️ STILL EXISTS'
           ELSE '✅ CLEANED UP'
       END as status,
       CASE 
           WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'post_analytics')
           AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'time_series_metrics')
           THEN 'Ready for Migration 04 cleanup'
           WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'post_analytics')
           THEN 'Need to complete Migration 02 first'
           ELSE 'Already cleaned up'
       END as action_needed

-- ==========================================
-- 4. NEXT MIGRATION STEPS
-- ==========================================

UNION ALL
SELECT 'NEXT STEPS RECOMMENDATIONS' as analysis_category, '' as item, '' as status, '' as action_needed

UNION ALL

SELECT 'Next Migration' as analysis_category,
       'Migration 04 - Final Cleanup' as item,
       CASE 
           WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations')
           AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'time_series_metrics')
           AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'embeddings')
           THEN '✅ READY TO RUN'
           ELSE '⚠️ PREREQUISITES MISSING'
       END as status,
       CASE 
           WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'time_series_metrics')
           THEN 'Complete Migration 02 first'
           WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations')
           THEN 'Complete Migration 03 first'
           WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations')
           AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'time_series_metrics')
           THEN 'Ready for Migration 04!'
           ELSE 'Check previous migrations'
       END as action_needed

-- ==========================================
-- 5. APPLICATION UPDATE REQUIREMENTS
-- ==========================================

UNION ALL
SELECT 'APPLICATION UPDATES NEEDED' as analysis_category, '' as item, '' as status, '' as action_needed

UNION ALL

SELECT 'Code Updates' as analysis_category,
       'Update Supabase client types' as item,
       CASE 
           WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts_core')
           THEN '📝 ACTION REQUIRED'
           ELSE '⏸️ WAIT FOR MIGRATION'
       END as status,
       'Import EnhancedDatabase types in your app' as action_needed

UNION ALL

SELECT 'Code Updates' as analysis_category,
       'Update post queries' as item,
       CASE 
           WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts_core')
           AND EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'posts_unified')
           THEN '📝 ACTION REQUIRED'
           ELSE '⏸️ WAIT FOR MIGRATION'
       END as status,
       'Use posts_unified view or normalized queries' as action_needed

UNION ALL

SELECT 'Code Updates' as analysis_category,
       'Add organization context' as item,
       CASE 
           WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations')
           THEN '📝 ACTION REQUIRED'
           ELSE '⏸️ WAIT FOR MIGRATION'
       END as status,
       'Add organization_id to queries and user context' as action_needed

ORDER BY analysis_category, item; 