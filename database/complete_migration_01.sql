-- ==========================================
-- COMPLETE MIGRATION 01: Missing Tables Only
-- This creates only the tables that are missing from Migration 01
-- ==========================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. CREATE MISSING TABLES (media_files already exists)
-- ==========================================

-- Posts Core (normalized post metadata)
CREATE TABLE IF NOT EXISTS posts_core (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    title VARCHAR(500),
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'failed')),
    platforms TEXT[] DEFAULT '{}',
    scheduled_at TIMESTAMP WITH TIME ZONE,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Add organization_id if not exists (for compatibility)
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL
);

-- Posts Content (text content and metadata)
CREATE TABLE IF NOT EXISTS posts_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts_core(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Post Media Links (junction table for posts and media)
CREATE TABLE IF NOT EXISTS post_media_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts_core(id) ON DELETE CASCADE,
    media_id UUID NOT NULL REFERENCES media_files(id) ON DELETE CASCADE,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, media_id)
);

-- Post Insights (analytics and engagement metrics)
CREATE TABLE IF NOT EXISTS post_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts_core(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    reach INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    engagement_rate DECIMAL(5,4) DEFAULT 0,
    metrics_date DATE DEFAULT CURRENT_DATE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, platform, metrics_date)
);

-- ==========================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- ==========================================

-- Posts Core indexes
CREATE INDEX IF NOT EXISTS idx_posts_core_user_id ON posts_core(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_core_status ON posts_core(status);
CREATE INDEX IF NOT EXISTS idx_posts_core_scheduled_at ON posts_core(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_posts_core_published_at ON posts_core(published_at);
CREATE INDEX IF NOT EXISTS idx_posts_core_organization_id ON posts_core(organization_id);

-- Posts Content indexes
CREATE INDEX IF NOT EXISTS idx_posts_content_post_id ON posts_content(post_id);
CREATE INDEX IF NOT EXISTS idx_posts_content_tags ON posts_content USING gin(tags);

-- Post Media Links indexes
CREATE INDEX IF NOT EXISTS idx_post_media_links_post_id ON post_media_links(post_id);
CREATE INDEX IF NOT EXISTS idx_post_media_links_media_id ON post_media_links(media_id);

-- Post Insights indexes
CREATE INDEX IF NOT EXISTS idx_post_insights_post_id ON post_insights(post_id);
CREATE INDEX IF NOT EXISTS idx_post_insights_platform ON post_insights(platform);
CREATE INDEX IF NOT EXISTS idx_post_insights_metrics_date ON post_insights(metrics_date);

-- ==========================================
-- 3. MIGRATE DATA FROM ORIGINAL POSTS TABLE
-- ==========================================

DO $$ 
BEGIN
    -- Only migrate if posts table exists and has data
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts') THEN
        RAISE NOTICE 'Migrating data from posts table...';
        
        -- Migrate to posts_core
        INSERT INTO posts_core (id, user_id, title, status, platforms, scheduled_at, published_at, created_at, updated_at, organization_id)
        SELECT 
            id, user_id, title, status, platforms, scheduled_at, published_at, created_at, updated_at,
            organization_id  -- This should exist from previous partial migrations
        FROM posts
        ON CONFLICT (id) DO NOTHING;
        
        -- Migrate to posts_content  
        INSERT INTO posts_content (post_id, content, tags, metadata, created_at, updated_at)
        SELECT 
            id as post_id, content, tags, metadata, created_at, updated_at
        FROM posts
        WHERE content IS NOT NULL
        ON CONFLICT DO NOTHING;
        
        -- Skip media migration since media_files table already exists with data
        -- Let's check if we have the expected structure
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'media_files' AND column_name = 'filename') THEN
            RAISE NOTICE 'media_files table already exists with filename column - skipping media migration';
            RAISE NOTICE 'You may need to manually review media_files table structure';
        ELSE
            RAISE NOTICE 'media_files table exists but missing filename column - this needs manual review';
        END IF;
        
        -- Create post-media links (only if we can match existing media)
        -- Since media_files already exists, try to link posts to existing media by URL
        BEGIN
            WITH media_mapping AS (
                SELECT DISTINCT
                    p.id as post_id,
                    mf.id as media_id,
                    row_number() OVER (PARTITION BY p.id ORDER BY mf.created_at) as order_index
                FROM posts p
                CROSS JOIN unnest(p.media_urls) as media_url
                JOIN media_files mf ON mf.file_path = media_url
                WHERE p.media_urls IS NOT NULL
            )
            INSERT INTO post_media_links (post_id, media_id, order_index, created_at)
            SELECT post_id, media_id, order_index, NOW()
            FROM media_mapping
            ON CONFLICT (post_id, media_id) DO NOTHING;
            
            RAISE NOTICE 'Successfully created post-media links for existing media files';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not create post-media links - media_files table structure may be different';
            RAISE NOTICE 'Error: %', SQLERRM;
        END;
        
        -- Migrate to post_insights (with safe type casting)
        INSERT INTO post_insights (post_id, platform, likes, comments, shares, reach, impressions, created_at, updated_at)
        SELECT 
            id as post_id,
            'combined' as platform,  -- Since original table didn't separate by platform
            -- Safe conversion from text to integer, defaulting to 0 if invalid
            COALESCE(NULLIF(regexp_replace(COALESCE(likes::text, '0'), '[^0-9]', '', 'g'), '')::integer, 0) as likes,
            COALESCE(NULLIF(regexp_replace(COALESCE(comments::text, '0'), '[^0-9]', '', 'g'), '')::integer, 0) as comments,
            COALESCE(NULLIF(regexp_replace(COALESCE(shares::text, '0'), '[^0-9]', '', 'g'), '')::integer, 0) as shares,
            COALESCE(NULLIF(regexp_replace(COALESCE(reach::text, '0'), '[^0-9]', '', 'g'), '')::integer, 0) as reach,
            COALESCE(NULLIF(regexp_replace(COALESCE(impressions::text, '0'), '[^0-9]', '', 'g'), '')::integer, 0) as impressions,
            created_at, updated_at
        FROM posts
        WHERE 
            COALESCE(NULLIF(regexp_replace(COALESCE(likes::text, '0'), '[^0-9]', '', 'g'), '')::integer, 0) > 0 OR
            COALESCE(NULLIF(regexp_replace(COALESCE(comments::text, '0'), '[^0-9]', '', 'g'), '')::integer, 0) > 0 OR
            COALESCE(NULLIF(regexp_replace(COALESCE(shares::text, '0'), '[^0-9]', '', 'g'), '')::integer, 0) > 0 OR
            COALESCE(NULLIF(regexp_replace(COALESCE(reach::text, '0'), '[^0-9]', '', 'g'), '')::integer, 0) > 0 OR
            COALESCE(NULLIF(regexp_replace(COALESCE(impressions::text, '0'), '[^0-9]', '', 'g'), '')::integer, 0) > 0
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Data migration from posts table completed successfully.';
    ELSE
        RAISE NOTICE 'No posts table found, skipping data migration.';
    END IF;
END $$;

-- ==========================================
-- 4. CREATE TRIGGERS FOR UPDATED_AT
-- ==========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables
CREATE TRIGGER update_posts_core_updated_at BEFORE UPDATE ON posts_core FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_posts_content_updated_at BEFORE UPDATE ON posts_content FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_post_insights_updated_at BEFORE UPDATE ON post_insights FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 5. ENABLE ROW LEVEL SECURITY
-- ==========================================

ALTER TABLE posts_core ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_media_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_insights ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DO $$ 
BEGIN
    -- Posts Core policies
    DROP POLICY IF EXISTS "Users can view their own posts_core" ON posts_core;
    CREATE POLICY "Users can view their own posts_core" ON posts_core FOR SELECT USING (user_id = auth.uid());
    
    DROP POLICY IF EXISTS "Users can insert their own posts_core" ON posts_core;
    CREATE POLICY "Users can insert their own posts_core" ON posts_core FOR INSERT WITH CHECK (user_id = auth.uid());
    
    DROP POLICY IF EXISTS "Users can update their own posts_core" ON posts_core;
    CREATE POLICY "Users can update their own posts_core" ON posts_core FOR UPDATE USING (user_id = auth.uid());
    
    DROP POLICY IF EXISTS "Users can delete their own posts_core" ON posts_core;
    CREATE POLICY "Users can delete their own posts_core" ON posts_core FOR DELETE USING (user_id = auth.uid());

    -- Posts Content policies
    DROP POLICY IF EXISTS "Users can view their posts_content" ON posts_content;
    CREATE POLICY "Users can view their posts_content" ON posts_content FOR SELECT 
    USING (EXISTS (SELECT 1 FROM posts_core WHERE posts_core.id = posts_content.post_id AND posts_core.user_id = auth.uid()));
    
    DROP POLICY IF EXISTS "Users can insert their posts_content" ON posts_content;
    CREATE POLICY "Users can insert their posts_content" ON posts_content FOR INSERT 
    WITH CHECK (EXISTS (SELECT 1 FROM posts_core WHERE posts_core.id = posts_content.post_id AND posts_core.user_id = auth.uid()));
    
    DROP POLICY IF EXISTS "Users can update their posts_content" ON posts_content;
    CREATE POLICY "Users can update their posts_content" ON posts_content FOR UPDATE 
    USING (EXISTS (SELECT 1 FROM posts_core WHERE posts_core.id = posts_content.post_id AND posts_core.user_id = auth.uid()));
    
    DROP POLICY IF EXISTS "Users can delete their posts_content" ON posts_content;
    CREATE POLICY "Users can delete their posts_content" ON posts_content FOR DELETE 
    USING (EXISTS (SELECT 1 FROM posts_core WHERE posts_core.id = posts_content.post_id AND posts_core.user_id = auth.uid()));

    -- Post Media Links policies  
    DROP POLICY IF EXISTS "Users can view their post_media_links" ON post_media_links;
    CREATE POLICY "Users can view their post_media_links" ON post_media_links FOR SELECT 
    USING (EXISTS (SELECT 1 FROM posts_core WHERE posts_core.id = post_media_links.post_id AND posts_core.user_id = auth.uid()));
    
    DROP POLICY IF EXISTS "Users can manage their post_media_links" ON post_media_links;
    CREATE POLICY "Users can manage their post_media_links" ON post_media_links FOR ALL 
    USING (EXISTS (SELECT 1 FROM posts_core WHERE posts_core.id = post_media_links.post_id AND posts_core.user_id = auth.uid()));

    -- Post Insights policies
    DROP POLICY IF EXISTS "Users can view their post_insights" ON post_insights;
    CREATE POLICY "Users can view their post_insights" ON post_insights FOR SELECT 
    USING (EXISTS (SELECT 1 FROM posts_core WHERE posts_core.id = post_insights.post_id AND posts_core.user_id = auth.uid()));
    
    DROP POLICY IF EXISTS "Users can manage their post_insights" ON post_insights;
    CREATE POLICY "Users can manage their post_insights" ON post_insights FOR ALL 
    USING (EXISTS (SELECT 1 FROM posts_core WHERE posts_core.id = post_insights.post_id AND posts_core.user_id = auth.uid()));
    
END $$;

-- Final success message
DO $$ 
BEGIN
    RAISE NOTICE 'Migration 01 completion successful! Created missing tables: posts_core, posts_content, post_media_links, post_insights';
END $$; 