-- Migration 02: Unified Time-Series Metrics & Centralized Embeddings
-- Implements the recommendation for unified analytics and embedding strategy

-- ==========================================
-- 1. UNIFIED TIME-SERIES METRICS TABLE
-- ==========================================

CREATE TABLE time_series_metrics (
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

CREATE TABLE embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('post', 'chat', 'user', 'hashtag', 'dm', 'template', 'content_idea')),
    entity_id UUID NOT NULL,
    source_field TEXT NOT NULL, -- e.g. 'caption', 'message_text', 'bio'
    vector_data VECTOR(1536) NOT NULL, -- OpenAI embedding dimension
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
-- 3. MIGRATE EXISTING ANALYTICS TO UNIFIED METRICS
-- ==========================================

-- Migrate post_analytics data
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
WHERE engagement_rate > 0;

-- Migrate post insights data (from normalized table)
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
WHERE engagement_rate > 0;

-- ==========================================
-- 4. MIGRATE EXISTING EMBEDDINGS TO CENTRALIZED TABLE
-- ==========================================

-- Migrate post embeddings (from original posts table)
INSERT INTO embeddings (entity_type, entity_id, source_field, vector_data, metadata)
SELECT 
    'post' as entity_type,
    id as entity_id,
    'content' as source_field,
    embedding::vector as vector_data,
    jsonb_build_object('migrated_from', 'posts.embedding', 'created_at', created_at)
FROM posts 
WHERE embedding IS NOT NULL AND array_length(embedding, 1) > 0;

-- Migrate chat message embeddings
INSERT INTO embeddings (entity_type, entity_id, source_field, vector_data, metadata)
SELECT 
    'chat' as entity_type,
    id as entity_id,
    'content' as source_field,
    embedding::vector as vector_data,
    jsonb_build_object('migrated_from', 'chat_messages.embedding', 'role', role)
FROM chat_messages 
WHERE embedding IS NOT NULL AND array_length(embedding, 1) > 0;

-- Migrate user embeddings (from existing user_embeddings table if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_embeddings') THEN
        INSERT INTO embeddings (entity_type, entity_id, source_field, vector_data, model_version, confidence_score, metadata)
        SELECT 
            'user' as entity_type,
            user_id as entity_id,
            embedding_type as source_field,
            embedding::vector as vector_data,
            COALESCE(version::text, '1') as model_version,
            COALESCE(confidence_score, 1.0) as confidence_score,
            jsonb_build_object('migrated_from', 'user_embeddings', 'is_active', is_active)
        FROM user_embeddings 
        WHERE embedding IS NOT NULL;
    END IF;
END $$;

-- ==========================================
-- 5. CREATE PERFORMANCE INDEXES
-- ==========================================

-- Time-series metrics indexes
CREATE INDEX idx_time_series_metrics_entity ON time_series_metrics(entity_type, entity_id);
CREATE INDEX idx_time_series_metrics_recorded_at ON time_series_metrics(recorded_at DESC);
CREATE INDEX idx_time_series_metrics_platform ON time_series_metrics(platform);
CREATE INDEX idx_time_series_metrics_metric_name ON time_series_metrics(metric_name);
CREATE INDEX idx_time_series_metrics_composite ON time_series_metrics(entity_type, metric_name, recorded_at DESC);

-- Partitioning for time-series data (for scalability)
-- Create monthly partitions for time_series_metrics
CREATE TABLE time_series_metrics_y2024m01 PARTITION OF time_series_metrics
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE time_series_metrics_y2024m02 PARTITION OF time_series_metrics
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
CREATE TABLE time_series_metrics_y2024m03 PARTITION OF time_series_metrics
    FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');
CREATE TABLE time_series_metrics_y2024m04 PARTITION OF time_series_metrics
    FOR VALUES FROM ('2024-04-01') TO ('2024-05-01');
CREATE TABLE time_series_metrics_y2024m05 PARTITION OF time_series_metrics
    FOR VALUES FROM ('2024-05-01') TO ('2024-06-01');
CREATE TABLE time_series_metrics_y2024m06 PARTITION OF time_series_metrics
    FOR VALUES FROM ('2024-06-01') TO ('2024-07-01');
CREATE TABLE time_series_metrics_y2024m07 PARTITION OF time_series_metrics
    FOR VALUES FROM ('2024-07-01') TO ('2024-08-01');
CREATE TABLE time_series_metrics_y2024m08 PARTITION OF time_series_metrics
    FOR VALUES FROM ('2024-08-01') TO ('2024-09-01');
CREATE TABLE time_series_metrics_y2024m09 PARTITION OF time_series_metrics
    FOR VALUES FROM ('2024-09-01') TO ('2024-10-01');
CREATE TABLE time_series_metrics_y2024m10 PARTITION OF time_series_metrics
    FOR VALUES FROM ('2024-10-01') TO ('2024-11-01');
CREATE TABLE time_series_metrics_y2024m11 PARTITION OF time_series_metrics
    FOR VALUES FROM ('2024-11-01') TO ('2024-12-01');
CREATE TABLE time_series_metrics_y2024m12 PARTITION OF time_series_metrics
    FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');

-- Embeddings indexes
CREATE INDEX idx_embeddings_entity ON embeddings(entity_type, entity_id);
CREATE INDEX idx_embeddings_source_field ON embeddings(source_field);
CREATE INDEX idx_embeddings_model_version ON embeddings(model_version);
CREATE INDEX idx_embeddings_created_at ON embeddings(created_at);

-- Vector similarity index (using HNSW for fast similarity search)
CREATE INDEX idx_embeddings_vector_cosine ON embeddings 
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
    time_period TEXT DEFAULT 'day' -- day, week, month
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
-- 8. CREATE RLS POLICIES
-- ==========================================

-- Time-series metrics policies (based on entity ownership)
CREATE POLICY "Users can view metrics for their entities" ON time_series_metrics
    FOR SELECT USING (
        CASE entity_type
            WHEN 'post' THEN entity_id IN (SELECT id FROM posts_core WHERE user_id = auth.uid())
            WHEN 'user' THEN entity_id = auth.uid()
            WHEN 'account' THEN entity_id IN (SELECT id FROM social_accounts WHERE user_id = auth.uid())
            ELSE false
        END
    );

CREATE POLICY "Users can insert metrics for their entities" ON time_series_metrics
    FOR INSERT WITH CHECK (
        CASE entity_type
            WHEN 'post' THEN entity_id IN (SELECT id FROM posts_core WHERE user_id = auth.uid())
            WHEN 'user' THEN entity_id = auth.uid()
            WHEN 'account' THEN entity_id IN (SELECT id FROM social_accounts WHERE user_id = auth.uid())
            ELSE false
        END
    );

-- Embeddings policies (based on entity ownership)
CREATE POLICY "Users can view embeddings for their entities" ON embeddings
    FOR SELECT USING (
        CASE entity_type
            WHEN 'post' THEN entity_id IN (SELECT id FROM posts_core WHERE user_id = auth.uid())
            WHEN 'chat' THEN entity_id IN (SELECT id FROM chat_messages WHERE user_id = auth.uid())
            WHEN 'user' THEN entity_id = auth.uid()
            ELSE false
        END
    );

CREATE POLICY "Users can insert embeddings for their entities" ON embeddings
    FOR INSERT WITH CHECK (
        CASE entity_type
            WHEN 'post' THEN entity_id IN (SELECT id FROM posts_core WHERE user_id = auth.uid())
            WHEN 'chat' THEN entity_id IN (SELECT id FROM chat_messages WHERE user_id = auth.uid())
            WHEN 'user' THEN entity_id = auth.uid()
            ELSE false
        END
    );

CREATE POLICY "Users can update embeddings for their entities" ON embeddings
    FOR UPDATE USING (
        CASE entity_type
            WHEN 'post' THEN entity_id IN (SELECT id FROM posts_core WHERE user_id = auth.uid())
            WHEN 'chat' THEN entity_id IN (SELECT id FROM chat_messages WHERE user_id = auth.uid())
            WHEN 'user' THEN entity_id = auth.uid()
            ELSE false
        END
    );

-- ==========================================
-- 9. CREATE TRIGGERS
-- ==========================================

CREATE TRIGGER update_embeddings_updated_at 
    BEFORE UPDATE ON embeddings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 10. GRANT PERMISSIONS
-- ==========================================

GRANT ALL ON time_series_metrics TO authenticated;
GRANT ALL ON embeddings TO authenticated;
GRANT EXECUTE ON FUNCTION find_similar_content TO authenticated;
GRANT EXECUTE ON FUNCTION get_metrics_aggregated TO authenticated; 