-- Complete chat_messages table setup for RAG functionality
-- Run this in your Supabase SQL Editor to fix all chat-related issues

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Try to create vector extension (may fail if not available, that's OK)
DO $$ 
BEGIN
    CREATE EXTENSION IF NOT EXISTS "vector";
EXCEPTION 
    WHEN OTHERS THEN 
        RAISE NOTICE 'Vector extension not available - using FLOAT8[] instead';
END $$;

-- Drop existing chat_messages table if it exists
DROP TABLE IF EXISTS chat_messages CASCADE;

-- Create the chat_messages table with correct structure for RAG functionality
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    embedding FLOAT8[], -- OpenAI text embedding vector for semantic search
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_role ON chat_messages(role);
CREATE INDEX idx_chat_messages_user_conversation ON chat_messages(user_id, conversation_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);

-- Create trigger for updating timestamps
CREATE TRIGGER update_chat_messages_updated_at 
    BEFORE UPDATE ON chat_messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for chat_messages
-- Policy for viewing own messages
CREATE POLICY "Users can view their own chat messages" ON chat_messages
    FOR SELECT USING (auth.uid() = user_id);

-- Policy for inserting own messages (CRITICAL: This is the main policy your API needs)
CREATE POLICY "Users can insert their own chat messages" ON chat_messages
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy for updating own messages  
CREATE POLICY "Users can update their own chat messages" ON chat_messages
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy for deleting own messages
CREATE POLICY "Users can delete their own chat messages" ON chat_messages
    FOR DELETE USING (auth.uid() = user_id);

-- Ensure posts table has content_text column (needed for RAG search)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'posts' AND column_name = 'content_text'
    ) THEN
        ALTER TABLE posts ADD COLUMN content_text TEXT;
        COMMENT ON COLUMN posts.content_text IS 'Plain text content for search and AI analysis';
        
        -- Update existing posts to have content_text from content
        UPDATE posts SET content_text = content WHERE content_text IS NULL AND content IS NOT NULL;
    END IF;
END $$;

-- Grant necessary permissions
GRANT ALL ON chat_messages TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE chat_messages IS 'Stores chat messages for AI conversations with RAG support';
COMMENT ON COLUMN chat_messages.conversation_id IS 'Groups messages into conversations';
COMMENT ON COLUMN chat_messages.role IS 'Indicates if message is from user or assistant';
COMMENT ON COLUMN chat_messages.content IS 'The actual message content';
COMMENT ON COLUMN chat_messages.embedding IS 'OpenAI text embedding vector for semantic search';

-- Create helper functions
CREATE OR REPLACE FUNCTION get_conversation_history(
    user_uuid UUID,
    conversation_uuid UUID DEFAULT NULL,
    limit_count INTEGER DEFAULT 50
)
RETURNS TABLE(
    id UUID,
    conversation_id UUID,
    role VARCHAR(20),
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    IF conversation_uuid IS NULL THEN
        -- Get latest conversation for user
        SELECT c.conversation_id INTO conversation_uuid
        FROM chat_messages c
        WHERE c.user_id = user_uuid
        ORDER BY c.created_at DESC
        LIMIT 1;
    END IF;
    
    RETURN QUERY
    SELECT 
        c.id,
        c.conversation_id,
        c.role,
        c.content,
        c.created_at
    FROM chat_messages c
    WHERE c.user_id = user_uuid 
    AND (conversation_uuid IS NULL OR c.conversation_id = conversation_uuid)
    ORDER BY c.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_conversation_history TO authenticated;

-- Verify the setup
DO $$
BEGIN
    -- Check if chat_messages table exists and has correct structure
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_messages') THEN
        RAISE NOTICE '✅ SUCCESS: chat_messages table created successfully';
        
        -- Check for required columns
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'user_id') THEN
            RAISE NOTICE '✅ SUCCESS: user_id column exists';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'conversation_id') THEN
            RAISE NOTICE '✅ SUCCESS: conversation_id column exists';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'embedding') THEN
            RAISE NOTICE '✅ SUCCESS: embedding column exists for vector search';
        END IF;
        
    ELSE
        RAISE EXCEPTION '❌ ERROR: chat_messages table was not created';
    END IF;
    
    -- Check RLS policies
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'chat_messages' 
        AND policyname = 'Users can insert their own chat messages'
    ) THEN
        RAISE NOTICE '✅ SUCCESS: Insert policy created correctly';
    ELSE
        RAISE EXCEPTION '❌ ERROR: Insert policy missing';
    END IF;
    
    RAISE NOTICE '🎉 Chat setup completed successfully! You can now test the chat functionality.';
END $$; 