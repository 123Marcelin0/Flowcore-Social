-- Ensure content_ideas table has embedding column for semantic search
-- This script safely adds the embedding column if it doesn't exist

-- Add embedding column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'content_ideas' 
                   AND column_name = 'embedding') THEN
        ALTER TABLE content_ideas ADD COLUMN embedding FLOAT8[];
        
        -- Add index for vector similarity search if the extension is available
        CREATE INDEX IF NOT EXISTS idx_content_ideas_embedding 
        ON content_ideas USING gin(embedding);
        
        RAISE NOTICE 'Added embedding column to content_ideas table';
    ELSE
        RAISE NOTICE 'Embedding column already exists in content_ideas table';
    END IF;
END $$;

-- Ensure proper RLS policies for content_ideas if they don't exist
DO $$
BEGIN
    -- Enable RLS if not already enabled
    ALTER TABLE content_ideas ENABLE ROW LEVEL SECURITY;
    
    -- Create select policy if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'content_ideas' AND policyname = 'Users can view their own content ideas') THEN
        CREATE POLICY "Users can view their own content ideas" ON content_ideas
            FOR SELECT USING (auth.uid() = user_id);
        RAISE NOTICE 'Created SELECT policy for content_ideas';
    END IF;
    
    -- Create insert policy if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'content_ideas' AND policyname = 'Users can insert their own content ideas') THEN
        CREATE POLICY "Users can insert their own content ideas" ON content_ideas
            FOR INSERT WITH CHECK (auth.uid() = user_id);
        RAISE NOTICE 'Created INSERT policy for content_ideas';
    END IF;
    
    -- Create update policy if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'content_ideas' AND policyname = 'Users can update their own content ideas') THEN
        CREATE POLICY "Users can update their own content ideas" ON content_ideas
            FOR UPDATE USING (auth.uid() = user_id);
        RAISE NOTICE 'Created UPDATE policy for content_ideas';
    END IF;
    
    -- Create delete policy if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'content_ideas' AND policyname = 'Users can delete their own content ideas') THEN
        CREATE POLICY "Users can delete their own content ideas" ON content_ideas
            FOR DELETE USING (auth.uid() = user_id);
        RAISE NOTICE 'Created DELETE policy for content_ideas';
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not update RLS policies: %', SQLERRM;
END $$;

-- Add helpful indexes for performance
CREATE INDEX IF NOT EXISTS idx_content_ideas_user_id_created_at 
ON content_ideas(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_content_ideas_is_saved 
ON content_ideas(user_id, is_saved) WHERE is_saved = true;

CREATE INDEX IF NOT EXISTS idx_content_ideas_category 
ON content_ideas(user_id, category);

CREATE INDEX IF NOT EXISTS idx_content_ideas_status 
ON content_ideas(user_id, status);

-- Add comment for documentation
COMMENT ON COLUMN content_ideas.embedding IS 'OpenAI embedding vector for semantic search of content ideas';
COMMENT ON TABLE content_ideas IS 'Stores user content ideas with embeddings for AI-powered semantic search and categorization'; 