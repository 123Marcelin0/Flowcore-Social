-- Social Media Dashboard Schema Enhancements
-- Implementing the top 5 recommended improvements

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ==================================================
-- 1. MEDIA MANAGEMENT SYSTEM (HIGH PRIORITY)
-- ==================================================

-- Create media_files table for proper media management
CREATE TABLE media_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    storage_url TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_type VARCHAR(50) NOT NULL CHECK (file_type IN ('image', 'video', 'audio', 'document')),
    width INTEGER,
    height INTEGER,
    duration INTEGER, -- for video/audio files in seconds
    processing_status VARCHAR(50) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    optimization_status VARCHAR(50) DEFAULT 'pending' CHECK (optimization_status IN ('pending', 'optimized', 'failed')),
    thumbnail_url TEXT,
    compressed_url TEXT,
    alt_text TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create media_post_associations table for many-to-many relationship
CREATE TABLE media_post_associations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    media_file_id UUID NOT NULL REFERENCES media_files(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(media_file_id, post_id)
);

-- ==================================================
-- 2. HASHTAG MANAGEMENT SYSTEM (HIGH PRIORITY)
-- ==================================================

-- Create hashtags table
CREATE TABLE hashtags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tag VARCHAR(100) NOT NULL UNIQUE,
    normalized_tag VARCHAR(100) NOT NULL UNIQUE, -- lowercase, no special chars
    usage_count INTEGER DEFAULT 0,
    trending_score DECIMAL(10,2) DEFAULT 0.00,
    category VARCHAR(50),
    is_trending BOOLEAN DEFAULT FALSE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    embedding VECTOR(1536), -- for semantic hashtag matching
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create post_hashtags junction table
CREATE TABLE post_hashtags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    hashtag_id UUID NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, hashtag_id)
);

-- Create hashtag_analytics table for tracking performance
CREATE TABLE hashtag_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hashtag_id UUID NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    impressions INTEGER DEFAULT 0,
    reach INTEGER DEFAULT 0,
    engagement INTEGER DEFAULT 0,
    posts_count INTEGER DEFAULT 0,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(hashtag_id, user_id, platform, recorded_at)
);

-- ==================================================
-- 3. PUBLISHING QUEUE SYSTEM (HIGH PRIORITY)
-- ==================================================

-- Create publishing_queue table
CREATE TABLE publishing_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'published', 'failed', 'cancelled')),
    attempt_count INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    error_message TEXT,
    external_post_id VARCHAR(255),
    published_at TIMESTAMP WITH TIME ZONE,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create publishing_logs table for audit trail
CREATE TABLE publishing_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    queue_id UUID NOT NULL REFERENCES publishing_queue(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    message TEXT,
    error_details JSONB,
    processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================================================
-- 4. MULTI-TENANCY SUPPORT (MEDIUM PRIORITY)
-- ==================================================

-- Create organizations table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    logo_url TEXT,
    website VARCHAR(255),
    subscription_tier VARCHAR(50) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
    max_users INTEGER DEFAULT 1,
    max_posts INTEGER DEFAULT 100,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create organization_members table
CREATE TABLE organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'editor', 'member')),
    permissions JSONB DEFAULT '{}',
    invited_by UUID REFERENCES auth.users(id),
    invited_at TIMESTAMP WITH TIME ZONE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

-- Add organization_id to existing tables
ALTER TABLE posts ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE media_files ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE content_ideas ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE calendar_events ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE social_accounts ADD COLUMN organization_id UUID REFERENCES organizations(id);

-- ==================================================
-- 5. AI CAPABILITIES ENHANCEMENT (MEDIUM PRIORITY)
-- ==================================================

-- Create user_embeddings table for brand voice
CREATE TABLE user_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id),
    embedding_type VARCHAR(50) NOT NULL CHECK (embedding_type IN ('brand_voice', 'writing_style', 'content_preference')),
    content_sample TEXT NOT NULL,
    embedding VECTOR(1536) NOT NULL,
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    confidence_score DECIMAL(5,4) DEFAULT 0.0000,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ai_suggestions table
CREATE TABLE ai_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    suggestion_type VARCHAR(50) NOT NULL CHECK (suggestion_type IN ('content', 'hashtag', 'timing', 'engagement')),
    context_id UUID, -- can reference posts, content_ideas, etc.
    context_type VARCHAR(50),
    suggestion_text TEXT NOT NULL,
    confidence_score DECIMAL(5,4) DEFAULT 0.0000,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'modified')),
    user_feedback TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create content_analysis table for AI-powered insights
CREATE TABLE content_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sentiment_score DECIMAL(5,4) DEFAULT 0.0000,
    engagement_prediction DECIMAL(5,4) DEFAULT 0.0000,
    optimal_posting_time TIMESTAMP WITH TIME ZONE,
    content_topics TEXT[],
    readability_score DECIMAL(5,2),
    brand_alignment_score DECIMAL(5,4),
    analysis_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================================================
-- INDEXES FOR PERFORMANCE
-- ==================================================

-- Media files indexes
CREATE INDEX idx_media_files_user_id ON media_files(user_id);
CREATE INDEX idx_media_files_file_type ON media_files(file_type);
CREATE INDEX idx_media_files_processing_status ON media_files(processing_status);
CREATE INDEX idx_media_files_created_at ON media_files(created_at);

-- Hashtags indexes
CREATE INDEX idx_hashtags_normalized_tag ON hashtags(normalized_tag);
CREATE INDEX idx_hashtags_usage_count ON hashtags(usage_count DESC);
CREATE INDEX idx_hashtags_trending_score ON hashtags(trending_score DESC);
CREATE INDEX idx_hashtags_is_trending ON hashtags(is_trending);
CREATE INDEX idx_hashtags_embedding ON hashtags USING ivfflat (embedding vector_cosine_ops);

-- Post hashtags indexes
CREATE INDEX idx_post_hashtags_post_id ON post_hashtags(post_id);
CREATE INDEX idx_post_hashtags_hashtag_id ON post_hashtags(hashtag_id);

-- Publishing queue indexes
CREATE INDEX idx_publishing_queue_user_id ON publishing_queue(user_id);
CREATE INDEX idx_publishing_queue_status ON publishing_queue(status);
CREATE INDEX idx_publishing_queue_scheduled_at ON publishing_queue(scheduled_at);
CREATE INDEX idx_publishing_queue_next_retry_at ON publishing_queue(next_retry_at);
CREATE INDEX idx_publishing_queue_priority ON publishing_queue(priority DESC);

-- Organization indexes
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX idx_organization_members_role ON organization_members(role);

-- AI capabilities indexes
CREATE INDEX idx_user_embeddings_user_id ON user_embeddings(user_id);
CREATE INDEX idx_user_embeddings_type ON user_embeddings(embedding_type);
CREATE INDEX idx_user_embeddings_active ON user_embeddings(is_active);
CREATE INDEX idx_user_embeddings_embedding ON user_embeddings USING ivfflat (embedding vector_cosine_ops);

CREATE INDEX idx_ai_suggestions_user_id ON ai_suggestions(user_id);
CREATE INDEX idx_ai_suggestions_type ON ai_suggestions(suggestion_type);
CREATE INDEX idx_ai_suggestions_status ON ai_suggestions(status);
CREATE INDEX idx_ai_suggestions_confidence ON ai_suggestions(confidence_score DESC);

-- ==================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ==================================================

-- Update hashtag usage count when post_hashtags is modified
CREATE OR REPLACE FUNCTION update_hashtag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE hashtags 
        SET usage_count = usage_count + 1, 
            last_used_at = NOW()
        WHERE id = NEW.hashtag_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE hashtags 
        SET usage_count = GREATEST(usage_count - 1, 0)
        WHERE id = OLD.hashtag_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_hashtag_usage_count
    AFTER INSERT OR DELETE ON post_hashtags
    FOR EACH ROW EXECUTE FUNCTION update_hashtag_usage_count();

-- Update publishing queue retry logic
CREATE OR REPLACE FUNCTION update_publishing_retry()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'failed' AND OLD.status != 'failed' THEN
        NEW.attempt_count = OLD.attempt_count + 1;
        IF NEW.attempt_count < NEW.max_attempts THEN
            NEW.next_retry_at = NOW() + INTERVAL '1 hour' * NEW.attempt_count;
            NEW.status = 'pending';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_publishing_retry
    BEFORE UPDATE ON publishing_queue
    FOR EACH ROW EXECUTE FUNCTION update_publishing_retry();

-- ==================================================
-- ROW LEVEL SECURITY POLICIES
-- ==================================================

-- Enable RLS on all new tables
ALTER TABLE media_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_post_associations ENABLE ROW LEVEL SECURITY;
ALTER TABLE hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE hashtag_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE publishing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE publishing_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_analysis ENABLE ROW LEVEL SECURITY;

-- Media files policies
CREATE POLICY "users_can_manage_own_media" ON media_files
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_can_view_org_media" ON media_files
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

-- Hashtags policies (public read, authenticated write)
CREATE POLICY "anyone_can_read_hashtags" ON hashtags
    FOR SELECT USING (true);

CREATE POLICY "authenticated_users_can_create_hashtags" ON hashtags
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Publishing queue policies
CREATE POLICY "users_can_manage_own_queue" ON publishing_queue
    FOR ALL USING (auth.uid() = user_id);

-- Organization policies
CREATE POLICY "members_can_read_org" ON organizations
    FOR SELECT USING (
        id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "owners_can_manage_org" ON organizations
    FOR ALL USING (
        id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid() AND role = 'owner'
        )
    );

-- AI capabilities policies
CREATE POLICY "users_can_manage_own_embeddings" ON user_embeddings
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_can_manage_own_ai_suggestions" ON ai_suggestions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_can_manage_own_content_analysis" ON content_analysis
    FOR ALL USING (auth.uid() = user_id);

-- ==================================================
-- HELPFUL FUNCTIONS
-- ==================================================

-- Function to get trending hashtags
CREATE OR REPLACE FUNCTION get_trending_hashtags(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    tag VARCHAR(100),
    usage_count INTEGER,
    trending_score DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT h.tag, h.usage_count, h.trending_score
    FROM hashtags h
    WHERE h.is_trending = true
    ORDER BY h.trending_score DESC, h.usage_count DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to find similar hashtags using embeddings
CREATE OR REPLACE FUNCTION find_similar_hashtags(query_embedding VECTOR(1536), similarity_threshold FLOAT DEFAULT 0.7)
RETURNS TABLE (
    tag VARCHAR(100),
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT h.tag, (1 - (h.embedding <=> query_embedding)) as similarity
    FROM hashtags h
    WHERE h.embedding IS NOT NULL
    AND (1 - (h.embedding <=> query_embedding)) > similarity_threshold
    ORDER BY similarity DESC
    LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- Function to get publishing queue status
CREATE OR REPLACE FUNCTION get_publishing_queue_status(user_uuid UUID)
RETURNS TABLE (
    pending_count INTEGER,
    processing_count INTEGER,
    failed_count INTEGER,
    next_scheduled TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*)::INTEGER FILTER (WHERE status = 'processing') as processing_count,
        COUNT(*)::INTEGER FILTER (WHERE status = 'failed') as failed_count,
        MIN(scheduled_at) FILTER (WHERE status = 'pending') as next_scheduled
    FROM publishing_queue
    WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to all new tables
CREATE TRIGGER update_media_files_updated_at 
    BEFORE UPDATE ON media_files
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hashtags_updated_at 
    BEFORE UPDATE ON hashtags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_publishing_queue_updated_at 
    BEFORE UPDATE ON publishing_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at 
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_members_updated_at 
    BEFORE UPDATE ON organization_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_embeddings_updated_at 
    BEFORE UPDATE ON user_embeddings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_suggestions_updated_at 
    BEFORE UPDATE ON ai_suggestions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_analysis_updated_at 
    BEFORE UPDATE ON content_analysis
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 