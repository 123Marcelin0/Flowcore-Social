-- Simple Supabase Storage Setup - Run each section separately to identify issues
-- Copy and paste each section into Supabase SQL Editor one at a time

-- ==========================================
-- SECTION 1: Check Extensions
-- ==========================================
-- Run this first to see what extensions are available
SELECT extname, extversion FROM pg_extension WHERE extname IN ('uuid-ossp', 'pgcrypto', 'vector');

-- ==========================================
-- SECTION 2: Create Table (if needed)
-- ==========================================
-- Run this to create the media_files table
CREATE TABLE IF NOT EXISTS media_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    storage_url TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    width INTEGER,
    height INTEGER,
    duration INTEGER,
    processing_status VARCHAR(50) DEFAULT 'pending',
    optimization_status VARCHAR(50) DEFAULT 'pending',
    thumbnail_url TEXT,
    compressed_url TEXT,
    alt_text TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- SECTION 3: Create Storage Bucket
-- ==========================================
-- Run this to create the storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('media-files', 'media-files', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- ==========================================
-- SECTION 4: Enable RLS
-- ==========================================
-- Run this to enable Row Level Security
ALTER TABLE media_files ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- SECTION 5: Create Basic Policies
-- ==========================================
-- Run this to create basic RLS policies
CREATE POLICY "Users can view their own media files" ON media_files
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own media files" ON media_files
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- SECTION 6: Create Storage Policies
-- ==========================================
-- Run this to create storage policies
CREATE POLICY "Allow authenticated users to upload" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'media-files' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Allow users to view media" ON storage.objects
    FOR SELECT USING (bucket_id = 'media-files');

-- ==========================================
-- SECTION 7: Grant Permissions
-- ==========================================
-- Run this to grant permissions
GRANT ALL ON media_files TO authenticated;
GRANT ALL ON media_files TO service_role;

-- ==========================================
-- SECTION 8: Verify Setup
-- ==========================================
-- Run this to verify everything is working
SELECT 'Table exists' as check_item, EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'media_files'
) as result
UNION ALL
SELECT 'Bucket exists' as check_item, EXISTS (
    SELECT FROM storage.buckets 
    WHERE id = 'media-files'
) as result
UNION ALL
SELECT 'RLS enabled' as check_item, (
    SELECT relrowsecurity FROM pg_class 
    WHERE relname = 'media_files'
) as result; 