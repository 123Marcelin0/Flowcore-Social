-- Setup Supabase Storage for AI Interior Designer
-- This script creates the necessary storage bucket and policies for interior design images

-- Create storage bucket for interior images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'interior-images',
  'interior-images',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Users can upload their own interior images
CREATE POLICY "Users can upload interior images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'interior-images' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Users can view their own interior images  
CREATE POLICY "Users can view their own interior images" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'interior-images' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Users can update their own interior images
CREATE POLICY "Users can update their own interior images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'interior-images' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Users can delete their own interior images
CREATE POLICY "Users can delete their own interior images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'interior-images' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Allow public read access to interior images (since they need to be publicly accessible for external APIs)
CREATE POLICY "Public read access for interior images" ON storage.objects
  FOR SELECT USING (bucket_id = 'interior-images');

-- Function to clean up old interior images (optional, for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_interior_images()
RETURNS void AS $$
BEGIN
  -- Delete images older than 30 days that are not referenced in ai_jobs
  DELETE FROM storage.objects
  WHERE bucket_id = 'interior-images'
    AND created_at < NOW() - INTERVAL '30 days'
    AND name NOT IN (
      SELECT DISTINCT SUBSTRING(image_url FROM '.*/(.+)$')
      FROM ai_jobs
      WHERE image_url LIKE '%' || name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON FUNCTION cleanup_old_interior_images() IS 'Cleans up old interior design images that are no longer referenced';

-- Grant necessary permissions
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated; 