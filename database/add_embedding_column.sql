-- Add embedding column to posts table for OpenAI embeddings
-- This column will store vector embeddings for semantic search

-- Check if the column exists before adding it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'posts' 
        AND column_name = 'embedding'
    ) THEN
        ALTER TABLE posts 
        ADD COLUMN embedding FLOAT8[]; -- Array of float8 values to store embedding vectors
        
        -- Add a comment to document the column
        COMMENT ON COLUMN posts.embedding IS 'OpenAI text embedding vector for semantic search of post content';
        
        RAISE NOTICE 'Embedding column added successfully to posts table';
    ELSE
        RAISE NOTICE 'Embedding column already exists in posts table';
    END IF;
END $$; 