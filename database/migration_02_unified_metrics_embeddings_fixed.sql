-- Migration 02: Unified Time-Series Metrics & Centralized Embeddings (FIXED VERSION)
-- This version checks for table existence before migration

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ==========================================
-- 1. UNIFIED TIME-SERIES METRICS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS time_series_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('post', 'user', 'account', 'hashtag', 'campaign')),
    entity_id UUID NOT NULL,
    metric_name TEXT NOT NULL,
    metric_value NUMERIC NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    platform TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(entity_type, entity_id, metric_name, platform, recorded_at)
);

-- ==========================================
-- 2. CENTRALIZED EMBEDDINGS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('post', 'chat', 'user', 'hashtag', 'dm', 'template', 'content_idea')),
    entity_id UUID NOT NULL,
    source_field TEXT NOT NULL,
    vector_data VECTOR(1536) NOT NULL,
    model_version TEXT DEFAULT 'text-embedding-3-small',
    similarity_method TEXT DEFAULT 'cosine',
    chunk_index INTEGER DEFAULT 0,
    confidence_score FLOAT DEFAULT 1.0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(entity_type, entity_id, source_field, chunk_index)
);

-- ==========================================
-- 3. MIGRATE EXISTING ANALYTICS (WITH SAFETY CHECKS)
-- ==========================================

-- Check if post_analytics table exists and migrate
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'post_analytics') THEN
        RAISE NOTICE 'Migrating data from post_analytics table...';
        
        INSERT INTO time_series_metrics (entity_type, entity_id, metric_name, metric_value, recorded_at, platform, metadata)
        SELECT 
            'post' as entity_type,
            post_id as entity_id,
            'impressions' as metric_name,
            impressions as metric_value,
            recorded_at,
            platform,
            jsonb_build_object('source', 'post_analytics')
        FROM post_analytics
        WHERE impressions > 0

        UNION ALL

        SELECT 
            'post' as entity_type,
            post_id as entity_id,
            'reach' as metric_name,
            reach as metric_value,
            recorded_at,
            platform,
            jsonb_build_object('source', 'post_analytics')
        FROM post_analytics
        WHERE reach > 0

        UNION ALL

        SELECT 
            'post' as entity_type,
            post_id as entity_id,
            'engagement' as metric_name,
            engagement as metric_value,
            recorded_at,
            platform,
            jsonb_build_object('source', 'post_analytics')
        FROM post_analytics
        WHERE engagement > 0

        UNION ALL

        SELECT 
            'post' as entity_type,
            post_id as entity_id,
            'likes' as metric_name,
            likes as metric_value,
            recorded_at,
            platform,
            jsonb_build_object('source', 'post_analytics')
        FROM post_analytics
        WHERE likes > 0

        UNION ALL

        SELECT 
            'post' as entity_type,
            post_id as entity_id,
            'comments' as metric_name,
            comments as metric_value,
            recorded_at,
            platform,
            jsonb_build_object('source', 'post_analytics')
        FROM post_analytics
        WHERE comments > 0

        UNION ALL

        SELECT 
            'post' as entity_type,
            post_id as entity_id,
            'shares' as metric_name,
            shares as metric_value,
            recorded_at,
            platform,
            jsonb_build_object('source', 'post_analytics')
        FROM post_analytics
        WHERE shares > 0

        UNION ALL

        SELECT 
            'post' as entity_type,
            post_id as entity_id,
            'engagement_rate' as metric_name,
            engagement_rate as metric_value,
            recorded_at,
            platform,
            jsonb_build_object('source', 'post_analytics')
        FROM post_analytics
        WHERE engagement_rate > 0
        
        ON CONFLICT (entity_type, entity_id, metric_name, platform, recorded_at) DO NOTHING;
        
        RAISE NOTICE 'Successfully migrated post_analytics data';
    ELSE
        RAISE NOTICE 'post_analytics table not found, skipping migration';
    END IF;
END $$;

-- Check if post_insights table exists and migrate
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'post_insights') THEN
        RAISE NOTICE 'Migrating data from post_insights table...';
        
        INSERT INTO time_series_metrics (entity_type, entity_id, metric_name, metric_value, recorded_at, platform, metadata)
        SELECT 
            'post' as entity_type,
            post_id as entity_id,
            'reach' as metric_name,
            reach as metric_value,
            recorded_at,
            platform,
            jsonb_build_object('source', 'post_insights')
        FROM post_insights
        WHERE reach > 0

        UNION ALL

        SELECT 
            'post' as entity_type,
            post_id as entity_id,
            'impressions' as metric_name,
            impressions as metric_value,
            recorded_at,
            platform,
            jsonb_build_object('source', 'post_insights')
        FROM post_insights
        WHERE impressions > 0

        UNION ALL

        SELECT 
            'post' as entity_type,
            post_id as entity_id,
            'likes' as metric_name,
            likes as metric_value,
            recorded_at,
            platform,
            jsonb_build_object('source', 'post_insights')
        FROM post_insights
        WHERE likes > 0

        UNION ALL

        SELECT 
            'post' as entity_type,
            post_id as entity_id,
            'comments' as metric_name,
            comments_count as metric_value,
            recorded_at,
            platform,
            jsonb_build_object('source', 'post_insights')
        FROM post_insights
        WHERE comments_count > 0

        UNION ALL

        SELECT 
            'post' as entity_type,
            post_id as entity_id,
            'shares' as metric_name,
            shares as metric_value,
            recorded_at,
            platform,
            jsonb_build_object('source', 'post_insights')
        FROM post_insights
        WHERE shares > 0

        UNION ALL

        SELECT 
            'post' as entity_type,
            post_id as entity_id,
            'engagement_rate' as metric_name,
            engagement_rate as metric_value,
            recorded_at,
            platform,
            jsonb_build_object('source', 'post_insights')
        FROM post_insights
        WHERE engagement_rate > 0
        
        ON CONFLICT (entity_type, entity_id, metric_name, platform, recorded_at) DO NOTHING;
        
        RAISE NOTICE 'Successfully migrated post_insights data';
    ELSE
        RAISE NOTICE 'post_insights table not found, skipping migration';
    END IF;
END $$;

-- ==========================================
-- 4. MIGRATE EXISTING EMBEDDINGS (WITH SAFETY CHECKS)
-- ==========================================

-- Check if posts table with embeddings exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts') 
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'embedding') THEN
        RAISE NOTICE 'Migrating embeddings from posts table...';
        
        INSERT INTO embeddings (entity_type, entity_id, source_field, vector_data, metadata)
        SELECT 
            'post' as entity_type,
            id as entity_id,
            'content' as source_field,
            embedding::vector as vector_data,
            jsonb_build_object('migrated_from', 'posts.embedding', 'created_at', created_at)
        FROM posts 
        WHERE embedding IS NOT NULL AND array_length(embedding, 1) > 0
        ON CONFLICT (entity_type, entity_id, source_field, chunk_index) DO NOTHING;
        
        RAISE NOTICE 'Successfully migrated posts embeddings';
    ELSE
        RAISE NOTICE 'posts table with embeddings not found, skipping migration';
    END IF;
END $$;

-- Check if chat_messages table with embeddings exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_messages') 
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'embedding') THEN
        RAISE NOTICE 'Migrating embeddings from chat_messages table...';
        
        INSERT INTO embeddings (entity_type, entity_id, source_field, vector_data, metadata)
        SELECT 
            'chat' as entity_type,
            id as entity_id,
            'content' as source_field,
            embedding::vector as vector_data,
            jsonb_build_object('migrated_from', 'chat_messages.embedding', 'role', role)
        FROM chat_messages 
        WHERE embedding IS NOT NULL AND array_length(embedding, 1) > 0
        ON CONFLICT (entity_type, entity_id, source_field, chunk_index) DO NOTHING;
        
        RAISE NOTICE 'Successfully migrated chat_messages embeddings';
    ELSE
        RAISE NOTICE 'chat_messages table with embeddings not found, skipping migration';
    END IF;
END $$;

-- ==========================================
-- 5. CREATE PERFORMANCE INDEXES
-- ==========================================

-- Time-series metrics indexes
CREATE INDEX IF NOT EXISTS idx_time_series_metrics_entity ON time_series_metrics(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_time_series_metrics_recorded_at ON time_series_metrics(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_time_series_metrics_platform ON time_series_metrics(platform);
CREATE INDEX IF NOT EXISTS idx_time_series_metrics_metric_name ON time_series_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_time_series_metrics_composite ON time_series_metrics(entity_type, metric_name, recorded_at DESC);

-- Embeddings indexes
CREATE INDEX IF NOT EXISTS idx_embeddings_entity ON embeddings(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_source_field ON embeddings(source_field);
CREATE INDEX IF NOT EXISTS idx_embeddings_model_version ON embeddings(model_version);
CREATE INDEX IF NOT EXISTS idx_embeddings_created_at ON embeddings(created_at);

-- Vector similarity index (using HNSW for fast similarity search)
CREATE INDEX IF NOT EXISTS idx_embeddings_vector_cosine ON embeddings 
    USING hnsw (vector_data vector_cosine_ops);

-- ==========================================
-- 6. CREATE UTILITY FUNCTIONS
-- ==========================================

-- Function to find similar content using embeddings
CREATE OR REPLACE FUNCTION find_similar_content(
    input_entity_type TEXT,
    input_entity_id UUID,
    similarity_threshold FLOAT DEFAULT 0.8,
    max_results INTEGER DEFAULT 10
)
RETURNS TABLE(
    entity_type TEXT,
    entity_id UUID,
    source_field TEXT,
    similarity_score FLOAT,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e2.entity_type,
        e2.entity_id,
        e2.source_field,
        (1 - (e1.vector_data <=> e2.vector_data))::FLOAT as similarity_score,
        e2.metadata
    FROM embeddings e1
    JOIN embeddings e2 ON e1.entity_type != e2.entity_type OR e1.entity_id != e2.entity_id
    WHERE e1.entity_type = input_entity_type 
      AND e1.entity_id = input_entity_id
      AND (1 - (e1.vector_data <=> e2.vector_data)) >= similarity_threshold
    ORDER BY similarity_score DESC
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Function to get metrics aggregated by time period
CREATE OR REPLACE FUNCTION get_metrics_aggregated(
    input_entity_type TEXT,
    input_entity_id UUID,
    input_metric_name TEXT,
    time_period TEXT DEFAULT 'day'
)
RETURNS TABLE(
    period_start TIMESTAMP WITH TIME ZONE,
    total_value NUMERIC,
    avg_value NUMERIC,
    max_value NUMERIC,
    min_value NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    EXECUTE format(
        'SELECT 
            date_trunc(%L, recorded_at) as period_start,
            SUM(metric_value) as total_value,
            AVG(metric_value) as avg_value,
            MAX(metric_value) as max_value,
            MIN(metric_value) as min_value
        FROM time_series_metrics 
        WHERE entity_type = $1 
          AND entity_id = $2 
          AND metric_name = $3
        GROUP BY date_trunc(%L, recorded_at)
        ORDER BY period_start DESC',
        time_period, time_period
    )
    USING input_entity_type, input_entity_id, input_metric_name;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 7. ENABLE ROW LEVEL SECURITY
-- ==========================================

ALTER TABLE time_series_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 8. CREATE RLS POLICIES (SIMPLIFIED FOR NOW)
-- ==========================================

-- Time-series metrics policies
CREATE POLICY IF NOT EXISTS "Users can view all metrics" ON time_series_metrics
    FOR SELECT USING (true); -- Simplified for now

CREATE POLICY IF NOT EXISTS "Users can insert metrics" ON time_series_metrics
    FOR INSERT WITH CHECK (true); -- Simplified for now

-- Embeddings policies
CREATE POLICY IF NOT EXISTS "Users can view all embeddings" ON embeddings
    FOR SELECT USING (true); -- Simplified for now

CREATE POLICY IF NOT EXISTS "Users can insert embeddings" ON embeddings
    FOR INSERT WITH CHECK (true); -- Simplified for now

CREATE POLICY IF NOT EXISTS "Users can update embeddings" ON embeddings
    FOR UPDATE USING (true); -- Simplified for now

-- ==========================================
-- 9. CREATE TRIGGERS
-- ==========================================

-- Check if trigger function exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'update_updated_at_column') THEN
        CREATE TRIGGER update_embeddings_updated_at 
            BEFORE UPDATE ON embeddings
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    ELSE
        RAISE NOTICE 'update_updated_at_column function not found, skipping trigger creation';
    END IF;
END $$;

-- ==========================================
-- 10. GRANT PERMISSIONS
-- ==========================================

GRANT ALL ON time_series_metrics TO authenticated;
GRANT ALL ON embeddings TO authenticated;
GRANT EXECUTE ON FUNCTION find_similar_content TO authenticated;
GRANT EXECUTE ON FUNCTION get_metrics_aggregated TO authenticated;

-- Success message
SELECT 'Migration 02 completed successfully! Tables created and data migrated where available.' as migration_status; 