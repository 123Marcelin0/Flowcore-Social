-- Add embedding column to chat_messages table for RAG functionality
-- Run this in your Supabase SQL editor

-- Add embedding column to store OpenAI text embeddings
ALTER TABLE chat_messages 
ADD COLUMN embedding FLOAT8[]; -- Array of float8 values to store embedding vectors

-- Add index for faster vector similarity searches (optional but recommended)
-- Note: This requires the pgvector extension if you want to use vector similarity functions
-- For now, we'll use basic array operations

-- Add comment to document the column
COMMENT ON COLUMN chat_messages.embedding IS 'OpenAI text embedding vector for semantic search of chat messages';

-- Verify the column was added successfully
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'chat_messages' 
AND column_name = 'embedding'; 