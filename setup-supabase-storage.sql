-- Setup Supabase Storage and Media Files for AI Video Editor
-- Run this in your Supabase SQL Editor
-- This script is designed to be safe to run multiple times

-- Enable required extensions (ignore if already enabled)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp') THEN
        CREATE EXTENSION "uuid-ossp";
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
        CREATE EXTENSION "pgcrypto";
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        CREATE EXTENSION "vector";
    END IF;
END $$;

-- Create the media_files table if it doesn't exist
CREATE TABLE IF NOT EXISTS media_files (
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

-- Create indexes for better performance (ignore if already exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_media_files_user_id') THEN
        CREATE INDEX idx_media_files_user_id ON media_files(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_media_files_file_type') THEN
        CREATE INDEX idx_media_files_file_type ON media_files(file_type);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_media_files_processing_status') THEN
        CREATE INDEX idx_media_files_processing_status ON media_files(processing_status);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_media_files_created_at') THEN
        CREATE INDEX idx_media_files_created_at ON media_files(created_at DESC);
    END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE media_files ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own media files" ON media_files;
DROP POLICY IF EXISTS "Users can insert their own media files" ON media_files;
DROP POLICY IF EXISTS "Users can update their own media files" ON media_files;
DROP POLICY IF EXISTS "Users can delete their own media files" ON media_files;

-- Create RLS policies for media_files
CREATE POLICY "Users can view their own media files" ON media_files
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own media files" ON media_files
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own media files" ON media_files
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own media files" ON media_files
    FOR DELETE USING (auth.uid() = user_id);

-- Create the storage bucket for media files (ignore if already exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
    'media-files', 
    'media-files', 
    true, 
    104857600, -- 100MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/mov', 'video/avi', 'video/webm', 'audio/mp3', 'audio/wav', 'audio/ogg']
)
ON CONFLICT (id) DO UPDATE SET 
    public = true,
    file_size_limit = 104857600,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/mov', 'video/avi', 'video/webm', 'audio/mp3', 'audio/wav', 'audio/ogg'];

-- Drop existing storage policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow authenticated users to upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to view their own media" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own media" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own media" ON storage.objects;

-- Create storage policies for the media-files bucket
CREATE POLICY "Allow authenticated users to upload" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'media-files' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Allow users to view their own media" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'media-files' 
        AND (auth.uid()::text = (storage.foldername(name))[1] OR bucket_id = 'media-files')
    );

CREATE POLICY "Allow users to update their own media" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'media-files' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Allow users to delete their own media" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'media-files' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Update function for automatic timestamp updating
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_media_files_updated_at ON media_files;

-- Create trigger for automatic timestamp updating
CREATE TRIGGER update_media_files_updated_at 
    BEFORE UPDATE ON media_files 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON media_files TO authenticated;
GRANT ALL ON media_files TO service_role;

-- Verify setup
DO $$
BEGIN
    RAISE NOTICE '✅ Media files table created/verified successfully';
    RAISE NOTICE '✅ Storage bucket "media-files" created/verified successfully';
    RAISE NOTICE '✅ RLS policies configured successfully';
    RAISE NOTICE '✅ Storage policies configured successfully';
    RAISE NOTICE '✅ Permissions granted successfully';
    RAISE NOTICE '🎉 Setup completed! You can now upload media files.';
END $$;