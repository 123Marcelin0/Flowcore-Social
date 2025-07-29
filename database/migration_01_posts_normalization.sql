-- Migration 01: Posts Table Normalization
-- Implements the core recommendation to split posts into specialized tables

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ==========================================
-- 1. CREATE NEW NORMALIZED TABLES
-- ==========================================

-- Core posts metadata (scheduling, status, ownership)
CREATE TABLE posts_core (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    organization_id UUID, -- Will be populated in migration 02
    title VARCHAR(500),
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'failed')),
    platforms TEXT[] DEFAULT '{}',
    scheduled_at TIMESTAMP WITH TIME ZONE,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Content-specific data (text, captions, hashtags)
CREATE TABLE posts_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts_core(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    caption TEXT,
    alt_text TEXT,
    hashtags TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id) -- One content record per post
);

-- Media file management (normalized from media_urls array)
CREATE TABLE media_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    storage_url TEXT NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    file_type VARCHAR(50) CHECK (file_type IN ('image', 'video', 'audio', 'document')),
    width INTEGER,
    height INTEGER,
    duration INTEGER, -- for video/audio in seconds
    thumbnail_url TEXT,
    alt_text TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Link posts to media files (many-to-many)
CREATE TABLE post_media_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts_core(id) ON DELETE CASCADE,
    media_file_id UUID NOT NULL REFERENCES media_files(id) ON DELETE CASCADE,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, media_file_id)
);

-- Separate insights/metrics from core posts data
CREATE TABLE post_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts_core(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    reach INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    engagement_rate DECIMAL(5,2) DEFAULT 0.00,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, platform, recorded_at)
);

-- ==========================================
-- 2. MIGRATE DATA FROM EXISTING POSTS TABLE
-- ==========================================

-- Migrate core post data
INSERT INTO posts_core (id, user_id, title, status, platforms, scheduled_at, published_at, created_at, updated_at)
SELECT 
    id, 
    user_id, 
    title, 
    status, 
    platforms, 
    scheduled_at, 
    published_at, 
    created_at, 
    updated_at
FROM posts;

-- Migrate content data
INSERT INTO posts_content (post_id, content, hashtags, tags, metadata)
SELECT 
    id as post_id,
    content,
    COALESCE(tags, '{}') as hashtags, -- Map tags to hashtags for consistency
    '{}' as tags, -- Will be populated separately
    COALESCE(metadata, '{}') as metadata
FROM posts;

-- Migrate insights data (create platform-specific records)
INSERT INTO post_insights (post_id, platform, reach, impressions, likes, comments_count, shares)
SELECT 
    id as post_id,
    'aggregate' as platform, -- Mark as aggregate since original didn't have platform breakdown
    COALESCE(reach, 0),
    COALESCE(impressions, 0),
    COALESCE(likes, 0),
    COALESCE(comments, 0),
    COALESCE(shares, 0)
FROM posts
WHERE reach > 0 OR impressions > 0 OR likes > 0 OR comments > 0 OR shares > 0;

-- ==========================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- ==========================================

-- Posts Core indexes
CREATE INDEX idx_posts_core_user_id ON posts_core(user_id);
CREATE INDEX idx_posts_core_status ON posts_core(status);
CREATE INDEX idx_posts_core_scheduled_at ON posts_core(scheduled_at);
CREATE INDEX idx_posts_core_platforms ON posts_core USING gin(platforms);

-- Posts Content indexes
CREATE INDEX idx_posts_content_post_id ON posts_content(post_id);
CREATE INDEX idx_posts_content_hashtags ON posts_content USING gin(hashtags);

-- Media Files indexes
CREATE INDEX idx_media_files_user_id ON media_files(user_id);
CREATE INDEX idx_media_files_file_type ON media_files(file_type);
CREATE INDEX idx_media_files_created_at ON media_files(created_at);

-- Post Media Links indexes
CREATE INDEX idx_post_media_links_post_id ON post_media_links(post_id);
CREATE INDEX idx_post_media_links_media_file_id ON post_media_links(media_file_id);

-- Post Insights indexes
CREATE INDEX idx_post_insights_post_id ON post_insights(post_id);
CREATE INDEX idx_post_insights_platform ON post_insights(platform);
CREATE INDEX idx_post_insights_recorded_at ON post_insights(recorded_at);

-- ==========================================
-- 4. CREATE TRIGGERS FOR UPDATED_AT
-- ==========================================

CREATE TRIGGER update_posts_core_updated_at 
    BEFORE UPDATE ON posts_core
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_content_updated_at 
    BEFORE UPDATE ON posts_content
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_media_files_updated_at 
    BEFORE UPDATE ON media_files
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_post_insights_updated_at 
    BEFORE UPDATE ON post_insights
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 5. ENABLE ROW LEVEL SECURITY
-- ==========================================

ALTER TABLE posts_core ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_media_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_insights ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 6. CREATE RLS POLICIES
-- ==========================================

-- Posts Core policies
CREATE POLICY "Users can view own posts core" ON posts_core
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own posts core" ON posts_core
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts core" ON posts_core
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts core" ON posts_core
    FOR DELETE USING (auth.uid() = user_id);

-- Posts Content policies
CREATE POLICY "Users can view own posts content" ON posts_content
    FOR SELECT USING (auth.uid() = (SELECT user_id FROM posts_core WHERE id = post_id));
CREATE POLICY "Users can insert own posts content" ON posts_content
    FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM posts_core WHERE id = post_id));
CREATE POLICY "Users can update own posts content" ON posts_content
    FOR UPDATE USING (auth.uid() = (SELECT user_id FROM posts_core WHERE id = post_id));
CREATE POLICY "Users can delete own posts content" ON posts_content
    FOR DELETE USING (auth.uid() = (SELECT user_id FROM posts_core WHERE id = post_id));

-- Media Files policies
CREATE POLICY "Users can view own media files" ON media_files
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own media files" ON media_files
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own media files" ON media_files
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own media files" ON media_files
    FOR DELETE USING (auth.uid() = user_id);

-- Post Media Links policies  
CREATE POLICY "Users can view own post media links" ON post_media_links
    FOR SELECT USING (auth.uid() = (SELECT user_id FROM posts_core WHERE id = post_id));
CREATE POLICY "Users can insert own post media links" ON post_media_links
    FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM posts_core WHERE id = post_id));
CREATE POLICY "Users can update own post media links" ON post_media_links
    FOR UPDATE USING (auth.uid() = (SELECT user_id FROM posts_core WHERE id = post_id));
CREATE POLICY "Users can delete own post media links" ON post_media_links
    FOR DELETE USING (auth.uid() = (SELECT user_id FROM posts_core WHERE id = post_id));

-- Post Insights policies
CREATE POLICY "Users can view own post insights" ON post_insights
    FOR SELECT USING (auth.uid() = (SELECT user_id FROM posts_core WHERE id = post_id));
CREATE POLICY "Users can insert own post insights" ON post_insights
    FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM posts_core WHERE id = post_id));
CREATE POLICY "Users can update own post insights" ON post_insights
    FOR UPDATE USING (auth.uid() = (SELECT user_id FROM posts_core WHERE id = post_id));
CREATE POLICY "Users can delete own post insights" ON post_insights
    FOR DELETE USING (auth.uid() = (SELECT user_id FROM posts_core WHERE id = post_id));

-- ==========================================
-- 7. GRANT PERMISSIONS
-- ==========================================

GRANT ALL ON posts_core TO authenticated;
GRANT ALL ON posts_content TO authenticated;
GRANT ALL ON media_files TO authenticated;
GRANT ALL ON post_media_links TO authenticated;
GRANT ALL ON post_insights TO authenticated;

-- NOTE: The original posts table will be backed up and dropped in migration_04_cleanup.sql
-- after all data has been successfully migrated and verified. 