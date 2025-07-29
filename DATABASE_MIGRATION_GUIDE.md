# 🚀 Database Migration Guide - Schema Refactoring

This guide provides step-by-step instructions for implementing the database schema refactoring recommendations from your architectural analysis.

## 📋 Migration Overview

The migration is split into 4 phases to ensure data safety and minimize downtime:

1. **Migration 01**: Posts normalization and separation of concerns
2. **Migration 02**: Unified metrics and centralized embeddings
3. **Migration 03**: Organization multi-tenancy and AI context system
4. **Migration 04**: Cleanup and consolidation

## ⚠️ Pre-Migration Checklist

Before running any migrations, ensure you:

- [ ] **Backup your database** completely
- [ ] Test migrations on a staging environment first
- [ ] Ensure you have `vector` extension enabled: `CREATE EXTENSION IF NOT EXISTS "vector";`
- [ ] Verify sufficient storage space (expect ~2x current size during migration)
- [ ] Schedule maintenance window (estimated 30-60 minutes for large datasets)
- [ ] Have rollback plan ready

## 🔧 Migration Execution

### Step 1: Run Migration 01 - Posts Normalization

```bash
# Using pnpm (as per your preference)
pnpm run db:migrate --file=database/migration_01_posts_normalization.sql

# Or directly with psql
psql -f database/migration_01_posts_normalization.sql your_database_url
```

**What this does:**
- Creates `posts_core`, `posts_content`, `media_files`, `post_media_links`, `post_insights` tables
- Migrates data from existing `posts` table
- Maintains backward compatibility (original table preserved)

**Verification:**
```sql
-- Check data integrity
SELECT COUNT(*) FROM posts; -- Original count
SELECT COUNT(*) FROM posts_core; -- Should match
SELECT COUNT(*) FROM posts_content; -- Should match
```

### Step 2: Run Migration 02 - Unified Metrics & Embeddings

```bash
pnpm run db:migrate --file=database/migration_02_unified_metrics_embeddings.sql
```

**What this does:**
- Creates `time_series_metrics` and `embeddings` tables
- Migrates analytics from `post_analytics` and `post_insights`
- Migrates embeddings from `posts` and `chat_messages`
- Creates partitioned tables for scalability

**Verification:**
```sql
-- Check embeddings migration
SELECT entity_type, COUNT(*) FROM embeddings GROUP BY entity_type;

-- Check metrics migration  
SELECT entity_type, metric_name, COUNT(*) FROM time_series_metrics 
GROUP BY entity_type, metric_name;
```

### Step 3: Run Migration 03 - Organizations & AI Context

```bash
pnpm run db:migrate --file=database/migration_03_organizations_ai_context.sql
```

**What this does:**
- Creates organization tables for multi-tenancy
- Adds `organization_id` to existing tables
- Creates AI context and RAG system tables
- Migrates existing users to default organization

**Verification:**
```sql
-- Check organization setup
SELECT * FROM organizations;
SELECT role, COUNT(*) FROM organization_members GROUP BY role;

-- Verify organization_id population
SELECT 
  (SELECT COUNT(*) FROM posts_core WHERE organization_id IS NOT NULL) as posts_with_org,
  (SELECT COUNT(*) FROM user_profiles WHERE organization_id IS NOT NULL) as users_with_org;
```

### Step 4: Run Migration 04 - Cleanup & Consolidation

```bash
pnpm run db:migrate --file=database/migration_04_cleanup_consolidation.sql
```

**What this does:**
- Consolidates duplicate Instagram scraper tables
- Removes obsolete tables (`content_generations`, `hashtag_analytics`)
- Creates backward compatibility views
- Sets up data archival system

**Verification:**
```sql
-- Run comprehensive verification
SELECT * FROM verify_migration_integrity();

-- If all checks pass, finalize cleanup (CAREFUL!)
SELECT finalize_migration_cleanup(); -- Only run if verification passes
```

## 📊 Post-Migration Verification

### Data Integrity Checks

```sql
-- 1. Check all table row counts
SELECT 
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. Verify foreign key relationships
SELECT 
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE constraint_type = 'FOREIGN KEY';

-- 3. Test embedding similarity search
SELECT * FROM find_similar_content('post', 'some-post-id', 0.8, 5);

-- 4. Test metrics aggregation
SELECT * FROM get_metrics_aggregated('post', 'some-post-id', 'likes', 'day');
```

### Performance Checks

```sql
-- Check index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Check query performance on new views
EXPLAIN ANALYZE SELECT * FROM posts_unified LIMIT 10;
EXPLAIN ANALYZE SELECT * FROM analytics_dashboard LIMIT 10;
EXPLAIN ANALYZE SELECT * FROM top_performing_posts LIMIT 10;
```

## 🔄 Application Code Updates

### Update Supabase Client Configuration

```typescript
// Update your supabase client to use new types
import { EnhancedDatabase } from '@/types/enhanced-database'

const supabase = createClient<EnhancedDatabase>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

### Update Data Access Patterns

**Before (Old Schema):**
```typescript
// Old way - monolithic posts table
const { data: posts } = await supabase
  .from('posts')
  .select('*')
  .eq('user_id', userId)
```

**After (New Schema):**
```typescript
// New way - use unified view for backward compatibility
const { data: posts } = await supabase
  .from('posts_unified') // Use the view
  .select('*')
  .eq('user_id', userId)

// Or use normalized tables for better performance
const { data: posts } = await supabase
  .from('posts_core')
  .select(`
    *,
    posts_content(*),
    post_media_links(media_files(*)),
    time_series_metrics(*)
  `)
  .eq('user_id', userId)
```

### Organization-Aware Queries

```typescript
// Add organization context to queries
const { data: posts } = await supabase
  .from('posts_core')
  .select('*')
  .eq('organization_id', orgId)
  .eq('user_id', userId)

// Check user permissions
const { data: hasPermission } = await supabase
  .rpc('user_has_org_permission', {
    check_user_id: userId,
    check_org_id: orgId,
    required_role: 'editor'
  })
```

### AI Context Integration

```typescript
// Log AI interactions for RAG
const { data } = await supabase
  .from('ai_context_logs')
  .insert({
    user_id: userId,
    organization_id: orgId,
    source_type: 'chat',
    context_summary: 'User asked about content strategy',
    ai_response: response,
    metadata: { model: 'gpt-4', confidence: 0.9 }
  })

// Find similar content using embeddings
const { data: similar } = await supabase
  .rpc('find_similar_content', {
    input_entity_type: 'post',
    input_entity_id: postId,
    similarity_threshold: 0.8,
    max_results: 5
  })
```

## 🔧 Monitoring & Maintenance

### Set Up Automated Archival

```sql
-- Create a scheduled job to archive old metrics (PostgreSQL cron extension)
SELECT cron.schedule('archive-metrics', '0 2 * * 0', 'SELECT archive_old_metrics();');
```

### Monitor Database Health

```sql
-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Monitor embedding search performance
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements 
WHERE query LIKE '%embeddings%' OR query LIKE '%vector%'
ORDER BY mean_time DESC;
```

## 🚨 Rollback Plan

If issues occur during migration:

### Immediate Rollback (Before Step 4)

```sql
-- Restore from backup tables (available until Step 4 cleanup)
DROP TABLE posts_core CASCADE;
DROP TABLE posts_content CASCADE;
DROP TABLE media_files CASCADE;
DROP TABLE post_media_links CASCADE;

-- Rename backup back to original
ALTER TABLE posts_backup RENAME TO posts;
ALTER TABLE post_analytics_backup RENAME TO post_analytics;
```

### Full Database Restore

```bash
# Restore from your pre-migration backup
pg_restore -d your_database your_backup_file.dump
```

## 📈 Expected Benefits

After successful migration:

- **🚀 Performance**: Faster queries with normalized tables and proper indexing
- **📊 Analytics**: Unified metrics system with time-series partitioning
- **🤖 AI Power**: Centralized embeddings enable better content similarity and RAG
- **👥 Multi-tenancy**: Organization support for team collaboration
- **💰 Cost Optimization**: Separate storage for large embeddings and archival
- **🔍 Better Insights**: Enhanced views for dashboard and analytics

## 🆘 Support

If you encounter issues:

1. **Check the verification functions**: `SELECT * FROM verify_migration_integrity();`
2. **Review migration logs**: Check your database logs for any errors
3. **Test queries**: Verify new table structures and relationships
4. **Performance monitoring**: Use the monitoring queries above

## 🎯 Next Steps

1. Update application code to use new schema
2. Monitor performance and optimize queries
3. Set up automated archival and monitoring
4. Train team on new multi-tenant features
5. Leverage new AI context system for better user experience

---

**🎉 Congratulations!** You now have a scalable, AI-native database schema that follows all the architectural best practices from your analysis. 