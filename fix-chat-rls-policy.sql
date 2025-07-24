-- Fix Chat Messages RLS Policy - Sofortige Lösung
-- Run this in your Supabase SQL Editor

-- Step 1: Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert their own messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON chat_messages;

-- Step 2: Check if user_profiles table references auth.users correctly
-- This query shows the current user_id structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('chat_messages', 'user_profiles') 
AND column_name LIKE '%user%';

-- Step 3: Create new, working RLS policies
-- Policy for viewing messages (SELECT)
CREATE POLICY "Enable read access for users to their own messages" ON chat_messages
    FOR SELECT USING (
        user_id = auth.uid()
    );

-- Policy for inserting messages (INSERT) 
CREATE POLICY "Enable insert access for authenticated users" ON chat_messages
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
    );

-- Policy for updating messages (UPDATE)
CREATE POLICY "Enable update access for users to their own messages" ON chat_messages
    FOR UPDATE USING (
        user_id = auth.uid()
    );

-- Policy for deleting messages (DELETE)
CREATE POLICY "Enable delete access for users to their own messages" ON chat_messages
    FOR DELETE USING (
        user_id = auth.uid()
    );

-- Step 4: Ensure the chat_messages table structure is correct
-- Check current structure
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'chat_messages'
ORDER BY ordinal_position;

-- Step 5: Alternative fix - if user_profiles references are wrong
-- If the foreign key reference is incorrect, fix it:
-- ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_user_id_fkey;
-- ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_user_id_fkey 
--     FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 6: Grant proper permissions
GRANT ALL ON chat_messages TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Step 7: Test query to verify the fix
-- This should work after running the above
-- INSERT INTO chat_messages (user_id, conversation_id, role, content) 
-- VALUES (auth.uid(), gen_random_uuid(), 'user', 'Test message');

-- Step 8: Show current policies for verification
SELECT schemaname, tablename, policyname, permissive, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'chat_messages';

COMMIT; 