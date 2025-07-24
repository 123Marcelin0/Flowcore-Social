-- Fix for bulk upload - Choose one of these options
-- Run ONE of these in your Supabase SQL Editor

-- OPTION 1: Create a minimal user profile for your current user (RECOMMENDED)
-- Replace 'your-user-id-here' with your actual user ID from auth.users
INSERT INTO user_profiles (id, email, full_name)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', 'User')
FROM auth.users 
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.users.id
)
ON CONFLICT (id) DO NOTHING;

-- OPTION 2: Add permissive policy for bulk uploads (TEMPORARY)
CREATE POLICY "temp_bulk_insert_policy" ON posts
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- OPTION 3: Modify posts table to reference auth.users directly (PERMANENT FIX)
-- WARNING: This will change your database structure
/*
ALTER TABLE posts 
DROP CONSTRAINT posts_user_id_fkey;

ALTER TABLE posts 
ADD CONSTRAINT posts_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
*/

-- OPTION 4: Temporarily disable the foreign key constraint (USE WITH CAUTION)
-- ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_user_id_fkey;

-- OPTION 5: Create a bulk insert function that bypasses RLS
CREATE OR REPLACE FUNCTION bulk_insert_user_posts(posts_data jsonb)
RETURNS json
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  current_user_id uuid;
  result json;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Ensure user profile exists
  INSERT INTO user_profiles (id, email, full_name)
  SELECT 
    current_user_id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', 'User')
  FROM auth.users u 
  WHERE u.id = current_user_id
  ON CONFLICT (id) DO NOTHING;
  
  -- Insert posts
  WITH inserted_posts AS (
    INSERT INTO posts (
      user_id,
      content,
      media_urls,
      media_type,
      platforms,
      status,
      published_at,
      tags,
      likes,
      comments,
      shares,
      reach,
      impressions,
      metadata
    )
    SELECT 
      current_user_id,
      (post->>'content')::text,
      COALESCE(ARRAY(SELECT jsonb_array_elements_text(post->'media_urls')), '{}'),
      COALESCE((post->>'media_type')::text, 'text'),
      COALESCE(ARRAY(SELECT jsonb_array_elements_text(post->'platforms')), '{}'),
      COALESCE((post->>'status')::text, 'published'),
      COALESCE((post->>'published_at')::timestamptz, NOW()),
      COALESCE(ARRAY(SELECT jsonb_array_elements_text(post->'tags')), '{}'),
      COALESCE((post->>'likes')::integer, 0),
      COALESCE((post->>'comments')::integer, 0),
      COALESCE((post->>'shares')::integer, 0),
      COALESCE((post->>'reach')::integer, 0),
      COALESCE((post->>'impressions')::integer, 0),
      COALESCE((post->>'metadata')::jsonb, '{}')
    FROM jsonb_array_elements(posts_data) AS post
    RETURNING *
  )
  SELECT json_agg(inserted_posts) INTO result FROM inserted_posts;
  
  RETURN result;
END;
$$;

-- Grant permission to use the bulk function
GRANT EXECUTE ON FUNCTION bulk_insert_user_posts(jsonb) TO authenticated;

-- To clean up after upload (run this after successful upload):
-- DROP POLICY IF EXISTS "temp_bulk_insert_policy" ON posts;
-- DROP FUNCTION IF EXISTS bulk_insert_user_posts(jsonb); 