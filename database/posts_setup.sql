CREATE TABLE posts (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    content_text TEXT,
    media_url TEXT,
    post_type TEXT NOT NULL,
    scheduled_publish_time TIMESTAMP WITH TIME ZONE,
    published_at TIMESTAMP WITH TIME ZONE,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    reach_count INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    embedding VECTOR(1536)
);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "enable_select_own_posts" ON posts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "enable_insert_own_posts" ON posts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "enable_update_own_posts" ON posts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "enable_delete_own_posts" ON posts
    FOR DELETE USING (auth.uid() = user_id); 