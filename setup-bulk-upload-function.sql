-- Create the bulk_insert_user_posts function for Instagram posts upload
-- Run this in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION bulk_insert_user_posts(posts_data jsonb)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_uuid uuid;
    post_record jsonb;
    inserted_count integer := 0;
    error_count integer := 0;
    result json;
BEGIN
    -- Get the current user's UUID
    user_uuid := auth.uid();
    
    IF user_uuid IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User not authenticated'
        );
    END IF;
    
    -- Ensure user_profiles entry exists
    INSERT INTO user_profiles (id, username, full_name, created_at, updated_at)
    VALUES (
        user_uuid, 
        COALESCE((SELECT raw_user_meta_data->>'email' FROM auth.users WHERE id = user_uuid), 'user'),
        COALESCE((SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = user_uuid), 'User'),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    
    -- Loop through each post in the JSON array
    FOR post_record IN SELECT * FROM jsonb_array_elements(posts_data)
    LOOP
        BEGIN
            -- Insert the post
            INSERT INTO posts (
                user_id,
                content,
                media_urls,
                media_type,
                platforms,
                status,
                published_at,
                likes,
                comments,
                shares,
                reach,
                impressions,
                metadata,
                created_at,
                updated_at
            ) VALUES (
                user_uuid,
                COALESCE(post_record->>'content', ''),
                COALESCE(
                    (SELECT jsonb_agg(value) FROM jsonb_array_elements_text(post_record->'media_urls')),
                    '[]'::jsonb
                ),
                COALESCE(post_record->>'media_type', 'image'),
                COALESCE(
                    (SELECT jsonb_agg(value) FROM jsonb_array_elements_text(post_record->'platforms')),
                    '["instagram"]'::jsonb
                ),
                COALESCE(post_record->>'status', 'published'),
                COALESCE(
                    (post_record->>'published_at')::timestamptz,
                    NOW()
                ),
                COALESCE((post_record->>'likes')::integer, 0),
                COALESCE((post_record->>'comments')::integer, 0),
                COALESCE((post_record->>'shares')::integer, 0),
                COALESCE((post_record->>'reach')::integer, 0),
                COALESCE((post_record->>'impressions')::integer, 0),
                COALESCE(post_record->'metadata', '{}'::jsonb),
                NOW(),
                NOW()
            );
            
            inserted_count := inserted_count + 1;
            
        EXCEPTION WHEN OTHERS THEN
            error_count := error_count + 1;
            -- Continue with next post even if one fails
        END;
    END LOOP;
    
    -- Return results
    result := json_build_object(
        'success', true,
        'inserted_count', inserted_count,
        'error_count', error_count,
        'total_processed', inserted_count + error_count
    );
    
    RETURN result;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION bulk_insert_user_posts(jsonb) TO authenticated;

-- Add any missing tags column if it doesn't exist (for hashtags)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'tags') THEN
        ALTER TABLE posts ADD COLUMN tags jsonb DEFAULT '[]'::jsonb;
    END IF;
END $$; 