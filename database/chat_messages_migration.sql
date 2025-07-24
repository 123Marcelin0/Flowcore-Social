-- Migration script to update chat_messages table for RAG implementation
-- This script adds the missing columns and renames existing ones to match the new structure

-- Add missing columns
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS conversation_id UUID NOT NULL DEFAULT uuid_generate_v4(),
ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'assistant'));

-- Rename message column to content (if it exists)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chat_messages' AND column_name = 'message'
    ) THEN
        ALTER TABLE chat_messages RENAME COLUMN message TO content;
    END IF;
END $$;

-- Update existing records to have proper conversation_id grouping
-- This groups messages by user_id and sequential timestamps into conversations
WITH conversation_groups AS (
    SELECT 
        id,
        user_id,
        created_at,
        ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) as msg_seq,
        LAG(created_at) OVER (PARTITION BY user_id ORDER BY created_at) as prev_timestamp
    FROM chat_messages
),
conversation_assignments AS (
    SELECT 
        id,
        user_id,
        created_at,
        CASE 
            WHEN prev_timestamp IS NULL OR 
                 EXTRACT(EPOCH FROM (created_at - prev_timestamp)) > 1800 -- 30 minutes gap = new conversation
            THEN uuid_generate_v4()
            ELSE LAG(uuid_generate_v4()) OVER (PARTITION BY user_id ORDER BY created_at)
        END as new_conversation_id
    FROM conversation_groups
)
UPDATE chat_messages 
SET conversation_id = ca.new_conversation_id
FROM conversation_assignments ca
WHERE chat_messages.id = ca.id;

-- Create additional indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_role ON chat_messages(role);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_conversation ON chat_messages(user_id, conversation_id);

-- Update the RLS policies if they exist
DROP POLICY IF EXISTS "Users can view their own messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert their own messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON chat_messages;

-- Create updated RLS policies
CREATE POLICY "Users can view their own messages" ON chat_messages
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own messages" ON chat_messages
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own messages" ON chat_messages
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own messages" ON chat_messages
    FOR DELETE USING (auth.uid() = user_id);

-- Add comments for documentation
COMMENT ON COLUMN chat_messages.conversation_id IS 'Groups messages into conversations';
COMMENT ON COLUMN chat_messages.role IS 'Indicates if message is from user or assistant';
COMMENT ON COLUMN chat_messages.content IS 'The actual message content'; 