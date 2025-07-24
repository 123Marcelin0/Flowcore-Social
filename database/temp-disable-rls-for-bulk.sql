-- Temporary script to allow bulk uploads
-- Run this in your Supabase SQL editor if the authentication approach doesn't work

-- OPTION 1: Add a temporary permissive policy for bulk uploads
-- This adds a policy that allows authenticated users to insert posts
CREATE POLICY "temp_bulk_insert_policy" ON posts
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- OPTION 2: Temporarily disable RLS on posts table (USE WITH CAUTION)
-- ALTER TABLE posts DISABLE ROW LEVEL SECURITY;

-- After bulk upload is complete, you can remove the temporary policy:
-- DROP POLICY "temp_bulk_insert_policy" ON posts;

-- Or re-enable RLS if you disabled it:
-- ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- OPTION 3: Create a service role function for bulk operations
CREATE OR REPLACE FUNCTION bulk_insert_posts(posts_data jsonb, target_user_id uuid)
RETURNS table(
  id uuid,
  user_id uuid,
  content text,
  created_at timestamptz
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert posts bypassing RLS by using SECURITY DEFINER
  RETURN QUERY
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
    target_user_id,
    (post->>'content')::text,
    COALESCE((post->>'media_urls')::text[], '{}'),
    COALESCE((post->>'media_type')::text, 'text'),
    COALESCE((post->>'platforms')::text[], '{}'),
    COALESCE((post->>'status')::text, 'published'),
    COALESCE((post->>'published_at')::timestamptz, NOW()),
    COALESCE((post->>'tags')::text[], '{}'),
    COALESCE((post->>'likes')::integer, 0),
    COALESCE((post->>'comments')::integer, 0),
    COALESCE((post->>'shares')::integer, 0),
    COALESCE((post->>'reach')::integer, 0),
    COALESCE((post->>'impressions')::integer, 0),
    COALESCE((post->>'metadata')::jsonb, '{}')
  FROM jsonb_array_elements(posts_data) AS post
  RETURNING posts.id, posts.user_id, posts.content, posts.created_at;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION bulk_insert_posts(jsonb, uuid) TO authenticated; 