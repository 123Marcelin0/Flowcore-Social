CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE users (
    id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    profile_picture_url TEXT
);

CREATE INDEX idx_users_email ON users(email);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "enable_select_own_users" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "enable_insert_own_users" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "enable_update_own_users" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "enable_delete_own_users" ON users
    FOR DELETE USING (auth.uid() = id); 