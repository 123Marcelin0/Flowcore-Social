-- Social Media Dashboard Database Schema
-- Production-ready schema with proper user separation and Row Level Security

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables if they exist (clean slate)
DROP TABLE IF EXISTS interactions CASCADE;
DROP TABLE IF EXISTS post_analytics CASCADE;
DROP TABLE IF EXISTS content_ideas CASCADE;
DROP TABLE IF EXISTS calendar_events CASCADE;
DROP TABLE IF EXISTS social_accounts CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Create user_profiles table (extends auth.users)
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    avatar_url TEXT,
    bio TEXT,
    website VARCHAR(255),
    subscription_tier VARCHAR(50) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
    onboarding_completed BOOLEAN DEFAULT FALSE,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create posts table
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    title VARCHAR(500),
    content TEXT NOT NULL,
    media_urls TEXT[] DEFAULT '{}',
    media_type VARCHAR(50) DEFAULT 'text' CHECK (media_type IN ('image', 'video', 'text', 'carousel')),
    platforms TEXT[] DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'failed')),
    scheduled_at TIMESTAMP WITH TIME ZONE,
    published_at TIMESTAMP WITH TIME ZONE,
    tags TEXT[] DEFAULT '{}',
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    reach INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    embedding FLOAT8[], -- OpenAI text embedding vector for semantic search
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create social_accounts table
CREATE TABLE social_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL CHECK (platform IN ('instagram', 'facebook', 'twitter', 'linkedin', 'tiktok', 'youtube', 'pinterest')),
    username VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    profile_image_url TEXT,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'connected' CHECK (status IN ('connected', 'expired', 'error', 'disconnected')),
    platform_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, platform)
);

-- Create content_ideas table
CREATE TABLE content_ideas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('video', 'image', 'text', 'reel', 'story', 'carousel')),
    platforms TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    category VARCHAR(100),
    priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    status VARCHAR(50) DEFAULT 'idea' CHECK (status IN ('idea', 'in_progress', 'completed', 'archived')),
    due_date DATE,
    notes TEXT,
    is_saved BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create calendar_events table
CREATE TABLE calendar_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    timezone VARCHAR(50) DEFAULT 'UTC',
    category VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#3B82F6',
    all_day BOOLEAN DEFAULT FALSE,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_pattern VARCHAR(100),
    recurrence_end_date DATE,
    location VARCHAR(255),
    attendees TEXT[] DEFAULT '{}',
    reminders INTEGER[] DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'tentative', 'cancelled')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create post_analytics table
CREATE TABLE post_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    external_post_id VARCHAR(255),
    impressions INTEGER DEFAULT 0,
    reach INTEGER DEFAULT 0,
    engagement INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    saves INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    video_views INTEGER DEFAULT 0,
    profile_visits INTEGER DEFAULT 0,
    website_clicks INTEGER DEFAULT 0,
    engagement_rate DECIMAL(5,2) DEFAULT 0.00,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, platform, recorded_at)
);

-- Create interactions table (comments, DMs, mentions)
CREATE TABLE interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    interaction_type VARCHAR(50) NOT NULL CHECK (interaction_type IN ('comment', 'dm', 'mention', 'reply', 'like')),
    sender_name VARCHAR(255) NOT NULL,
    sender_username VARCHAR(255) NOT NULL,
    sender_avatar_url TEXT,
    message TEXT NOT NULL,
    ai_suggestion TEXT,
    sentiment VARCHAR(50) DEFAULT 'neutral' CHECK (sentiment IN ('positive', 'neutral', 'negative')),
    priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'replied', 'dismissed', 'archived')),
    replied_at TIMESTAMP WITH TIME ZONE,
    external_interaction_id VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_created_at ON user_profiles(created_at);

CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_scheduled_at ON posts(scheduled_at);
CREATE INDEX idx_posts_created_at ON posts(created_at);
CREATE INDEX idx_posts_platforms ON posts USING gin(platforms);
CREATE INDEX idx_posts_tags ON posts USING gin(tags);

CREATE INDEX idx_social_accounts_user_id ON social_accounts(user_id);
CREATE INDEX idx_social_accounts_platform ON social_accounts(platform);
CREATE INDEX idx_social_accounts_status ON social_accounts(status);

CREATE INDEX idx_content_ideas_user_id ON content_ideas(user_id);
CREATE INDEX idx_content_ideas_status ON content_ideas(status);
CREATE INDEX idx_content_ideas_priority ON content_ideas(priority);
CREATE INDEX idx_content_ideas_is_saved ON content_ideas(is_saved);
CREATE INDEX idx_content_ideas_platforms ON content_ideas USING gin(platforms);

CREATE INDEX idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX idx_calendar_events_start_date ON calendar_events(start_date);
CREATE INDEX idx_calendar_events_category ON calendar_events(category);
CREATE INDEX idx_calendar_events_status ON calendar_events(status);

CREATE INDEX idx_post_analytics_post_id ON post_analytics(post_id);
CREATE INDEX idx_post_analytics_user_id ON post_analytics(user_id);
CREATE INDEX idx_post_analytics_platform ON post_analytics(platform);
CREATE INDEX idx_post_analytics_recorded_at ON post_analytics(recorded_at);

CREATE INDEX idx_interactions_user_id ON interactions(user_id);
CREATE INDEX idx_interactions_post_id ON interactions(post_id);
CREATE INDEX idx_interactions_platform ON interactions(platform);
CREATE INDEX idx_interactions_status ON interactions(status);
CREATE INDEX idx_interactions_priority ON interactions(priority);

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at 
    BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_social_accounts_updated_at 
    BEFORE UPDATE ON social_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_ideas_updated_at 
    BEFORE UPDATE ON content_ideas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at 
    BEFORE UPDATE ON calendar_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_post_analytics_updated_at 
    BEFORE UPDATE ON post_analytics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interactions_updated_at 
    BEFORE UPDATE ON interactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) for all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;

-- Create comprehensive RLS policies

-- User Profiles Policies
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Posts Policies
CREATE POLICY "Users can view own posts" ON posts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own posts" ON posts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts" ON posts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts" ON posts
    FOR DELETE USING (auth.uid() = user_id);

-- Social Accounts Policies
CREATE POLICY "Users can view own social accounts" ON social_accounts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own social accounts" ON social_accounts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own social accounts" ON social_accounts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own social accounts" ON social_accounts
    FOR DELETE USING (auth.uid() = user_id);

-- Content Ideas Policies
CREATE POLICY "Users can view own content ideas" ON content_ideas
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own content ideas" ON content_ideas
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own content ideas" ON content_ideas
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own content ideas" ON content_ideas
    FOR DELETE USING (auth.uid() = user_id);

-- Calendar Events Policies
CREATE POLICY "Users can view own calendar events" ON calendar_events
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calendar events" ON calendar_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calendar events" ON calendar_events
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own calendar events" ON calendar_events
    FOR DELETE USING (auth.uid() = user_id);

-- Post Analytics Policies
CREATE POLICY "Users can view own post analytics" ON post_analytics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own post analytics" ON post_analytics
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own post analytics" ON post_analytics
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own post analytics" ON post_analytics
    FOR DELETE USING (auth.uid() = user_id);

-- Interactions Policies
CREATE POLICY "Users can view own interactions" ON interactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own interactions" ON interactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own interactions" ON interactions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own interactions" ON interactions
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to get user statistics
CREATE OR REPLACE FUNCTION get_user_stats(user_uuid UUID)
RETURNS TABLE(
    total_posts INTEGER,
    published_posts INTEGER,
    draft_posts INTEGER,
    scheduled_posts INTEGER,
    total_interactions INTEGER,
    pending_interactions INTEGER,
    connected_accounts INTEGER,
    total_content_ideas INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*)::INTEGER FROM posts WHERE user_id = user_uuid),
        (SELECT COUNT(*)::INTEGER FROM posts WHERE user_id = user_uuid AND status = 'published'),
        (SELECT COUNT(*)::INTEGER FROM posts WHERE user_id = user_uuid AND status = 'draft'),
        (SELECT COUNT(*)::INTEGER FROM posts WHERE user_id = user_uuid AND status = 'scheduled'),
        (SELECT COUNT(*)::INTEGER FROM interactions WHERE user_id = user_uuid),
        (SELECT COUNT(*)::INTEGER FROM interactions WHERE user_id = user_uuid AND status = 'pending'),
        (SELECT COUNT(*)::INTEGER FROM social_accounts WHERE user_id = user_uuid AND status = 'connected'),
        (SELECT COUNT(*)::INTEGER FROM content_ideas WHERE user_id = user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Create view for user dashboard summary
CREATE OR REPLACE VIEW user_dashboard_summary AS
SELECT 
    up.id,
    up.email,
    up.full_name,
    up.avatar_url,
    up.subscription_tier,
    up.created_at,
    COUNT(DISTINCT p.id) as total_posts,
    COUNT(DISTINCT CASE WHEN p.status = 'published' THEN p.id END) as published_posts,
    COUNT(DISTINCT CASE WHEN p.status = 'draft' THEN p.id END) as draft_posts,
    COUNT(DISTINCT CASE WHEN p.status = 'scheduled' THEN p.id END) as scheduled_posts,
    COUNT(DISTINCT sa.id) as connected_accounts,
    COUNT(DISTINCT ci.id) as total_content_ideas,
    COUNT(DISTINCT i.id) as total_interactions,
    COUNT(DISTINCT CASE WHEN i.status = 'pending' THEN i.id END) as pending_interactions,
    COALESCE(SUM(p.likes), 0) as total_likes,
    COALESCE(SUM(p.comments), 0) as total_comments,
    COALESCE(SUM(p.shares), 0) as total_shares
FROM user_profiles up
LEFT JOIN posts p ON up.id = p.user_id
LEFT JOIN social_accounts sa ON up.id = sa.user_id AND sa.status = 'connected'
LEFT JOIN content_ideas ci ON up.id = ci.user_id
LEFT JOIN interactions i ON up.id = i.user_id
GROUP BY up.id, up.email, up.full_name, up.avatar_url, up.subscription_tier, up.created_at;

-- Enable RLS on the view
ALTER VIEW user_dashboard_summary ENABLE ROW LEVEL SECURITY;

-- Create policy for the view
CREATE POLICY "Users can view own dashboard summary" ON user_dashboard_summary
    FOR SELECT USING (auth.uid() = id); 