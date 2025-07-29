-- ==========================================
-- INTELLIGENT AI ASSISTANT MEMORY SYSTEM
-- Enhanced chat storage with embeddings for semantic memory
-- ==========================================

-- Enable pgvector extension for embeddings (if not already enabled)
-- Run this in Supabase SQL Editor first
CREATE EXTENSION IF NOT EXISTS vector;

-- ==========================================
-- 1. CHAT SESSIONS TABLE
-- ==========================================

-- Create chat_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_title text NOT NULL,
  context_type text NOT NULL DEFAULT 'chat', -- 'chat', 'caption_request', 'content_ideas', 'feedback'
  last_activity timestamp with time zone DEFAULT now(),
  message_count integer DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add indexes for chat_sessions
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_last_activity ON chat_sessions(last_activity DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_context_type ON chat_sessions(context_type);

-- ==========================================
-- 2. CHAT MESSAGES TABLE
-- ==========================================

-- Create chat_messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  message_type text NOT NULL CHECK (message_type IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  context_type text NOT NULL DEFAULT 'chat',
  embedding vector(1536), -- OpenAI ada-002 embedding dimension
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add indexes for chat_messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_message_type ON chat_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_chat_messages_context_type ON chat_messages(context_type);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);

-- Create vector similarity index for embeddings
CREATE INDEX IF NOT EXISTS idx_chat_messages_embedding ON chat_messages 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ==========================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS on chat_sessions
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

-- Policy for chat_sessions - users can only access their own sessions
CREATE POLICY IF NOT EXISTS "Users can access their own chat sessions" ON chat_sessions
FOR ALL USING (auth.uid() = user_id);

-- Enable RLS on chat_messages
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Policy for chat_messages - users can only access their own messages
CREATE POLICY IF NOT EXISTS "Users can access their own chat messages" ON chat_messages
FOR ALL USING (auth.uid() = user_id);

-- ==========================================
-- 4. HELPER FUNCTIONS
-- ==========================================

-- Function to update session last_activity when messages are added
CREATE OR REPLACE FUNCTION update_session_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_sessions 
  SET 
    last_activity = now(),
    message_count = (
      SELECT COUNT(*) 
      FROM chat_messages 
      WHERE session_id = NEW.session_id
    ),
    updated_at = now()
  WHERE id = NEW.session_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update session activity
DROP TRIGGER IF EXISTS trigger_update_session_activity ON chat_messages;
CREATE TRIGGER trigger_update_session_activity
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_session_activity();

-- Function for semantic similarity search in chat messages
CREATE OR REPLACE FUNCTION search_chat_memories(
  query_embedding vector(1536),
  user_id_param uuid,
  similarity_threshold float DEFAULT 0.7,
  max_results int DEFAULT 10,
  context_filter text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  content text,
  message_type text,
  context_type text,
  created_at timestamp with time zone,
  similarity_score float,
  session_id uuid,
  session_title text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cm.id,
    cm.content,
    cm.message_type,
    cm.context_type,
    cm.created_at,
    (1 - (cm.embedding <=> query_embedding)) as similarity_score,
    cm.session_id,
    cs.session_title
  FROM chat_messages cm
  JOIN chat_sessions cs ON cm.session_id = cs.id
  WHERE 
    cm.user_id = user_id_param 
    AND cm.embedding IS NOT NULL
    AND (1 - (cm.embedding <=> query_embedding)) > similarity_threshold
    AND (context_filter IS NULL OR cm.context_type = context_filter)
  ORDER BY similarity_score DESC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Function to get conversation context for AI responses
CREATE OR REPLACE FUNCTION get_conversation_context(
  session_id_param uuid,
  message_limit int DEFAULT 10
)
RETURNS TABLE (
  message_type text,
  content text,
  context_type text,
  created_at timestamp with time zone
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cm.message_type,
    cm.content,
    cm.context_type,
    cm.created_at
  FROM chat_messages cm
  WHERE cm.session_id = session_id_param
  ORDER BY cm.created_at DESC
  LIMIT message_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to analyze user conversation patterns
CREATE OR REPLACE FUNCTION analyze_user_conversation_patterns(
  user_id_param uuid,
  days_back int DEFAULT 30
)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  total_messages int;
  total_sessions int;
  avg_session_length float;
  top_contexts jsonb;
BEGIN
  -- Get total messages
  SELECT COUNT(*) INTO total_messages
  FROM chat_messages
  WHERE user_id = user_id_param
    AND created_at > (now() - interval '1 day' * days_back);
  
  -- Get total sessions
  SELECT COUNT(*) INTO total_sessions
  FROM chat_sessions
  WHERE user_id = user_id_param
    AND created_at > (now() - interval '1 day' * days_back);
  
  -- Get average session length
  SELECT AVG(message_count) INTO avg_session_length
  FROM chat_sessions
  WHERE user_id = user_id_param
    AND created_at > (now() - interval '1 day' * days_back);
  
  -- Get top context types
  SELECT jsonb_agg(
    jsonb_build_object(
      'context_type', context_type,
      'count', count,
      'percentage', round((count::float / total_messages * 100)::numeric, 1)
    )
  ) INTO top_contexts
  FROM (
    SELECT 
      context_type,
      COUNT(*) as count
    FROM chat_messages
    WHERE user_id = user_id_param
      AND created_at > (now() - interval '1 day' * days_back)
    GROUP BY context_type
    ORDER BY count DESC
    LIMIT 5
  ) t;
  
  -- Build result
  result := jsonb_build_object(
    'total_messages', total_messages,
    'total_sessions', total_sessions,
    'avg_session_length', round(avg_session_length::numeric, 1),
    'top_contexts', COALESCE(top_contexts, '[]'::jsonb),
    'analysis_period_days', days_back,
    'generated_at', now()
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 5. SAMPLE DATA INSERTION (OPTIONAL)
-- ==========================================

-- Function to create sample chat data for testing
CREATE OR REPLACE FUNCTION create_sample_chat_data(test_user_id uuid)
RETURNS void AS $$
DECLARE
  session1_id uuid;
  session2_id uuid;
BEGIN
  -- Create sample session 1: Caption requests
  INSERT INTO chat_sessions (user_id, session_title, context_type, metadata)
  VALUES (
    test_user_id,
    'Caption help for new listing',
    'caption_request',
    '{"topic": "real_estate", "property_type": "family_home"}'
  )
  RETURNING id INTO session1_id;
  
  -- Add sample messages to session 1
  INSERT INTO chat_messages (session_id, user_id, message_type, content, context_type, metadata) VALUES
  (session1_id, test_user_id, 'user', 'Can you help me write a caption for a new family home listing?', 'caption_request', '{"request_type": "caption_generation"}'),
  (session1_id, test_user_id, 'assistant', 'I''d be happy to help! What are the key features of this family home that you''d like to highlight?', 'caption_request', '{"response_type": "clarification"}'),
  (session1_id, test_user_id, 'user', 'It has 3 bedrooms, modern kitchen, large backyard, and is walking distance to schools', 'caption_request', '{"features_provided": true}'),
  (session1_id, test_user_id, 'assistant', '🏡✨ Perfect family sanctuary! This stunning 3-bedroom home features a modern kitchen for family meals, spacious backyard for weekend fun, and the convenience of walking to school. Ready to call this place home? #FamilyHome #DreamHome #WalkToSchool', 'caption_request', '{"caption_generated": true, "style": "family_focused"});
  
  -- Create sample session 2: Content strategy
  INSERT INTO chat_sessions (user_id, session_title, context_type, metadata)
  VALUES (
    test_user_id,
    'Content ideas for engagement',
    'content_ideas',
    '{"focus": "engagement", "platform": "instagram"}'
  )
  RETURNING id INTO session2_id;
  
  -- Add sample messages to session 2
  INSERT INTO chat_messages (session_id, user_id, message_type, content, context_type, metadata) VALUES
  (session2_id, test_user_id, 'user', 'I need content ideas to boost engagement on my real estate Instagram', 'content_ideas', '{"goal": "increase_engagement"}'),
  (session2_id, test_user_id, 'assistant', 'Great goal! Based on what works well for real estate, here are some high-engagement content ideas: 1) Behind-the-scenes home staging videos, 2) Before/after transformation posts, 3) Local market tip carousels, 4) Client success stories. Which type interests you most?', 'content_ideas', '{"ideas_provided": 4, "format": "mixed_media"}'),
  (session2_id, test_user_id, 'user', 'I love the before/after idea! Can you give me specific examples?', 'content_ideas', '{"selected_idea": "before_after_transformations"}');
  
  RAISE NOTICE 'Sample chat data created successfully for user %', test_user_id;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 6. MAINTENANCE AND OPTIMIZATION
-- ==========================================

-- Function to clean up old chat data (optional)
CREATE OR REPLACE FUNCTION cleanup_old_chat_data(days_to_keep int DEFAULT 365)
RETURNS int AS $$
DECLARE
  deleted_count int;
BEGIN
  -- Delete old sessions and their messages (cascades)
  DELETE FROM chat_sessions
  WHERE created_at < (now() - interval '1 day' * days_to_keep);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update embedding statistics
CREATE OR REPLACE FUNCTION update_embedding_stats()
RETURNS jsonb AS $$
DECLARE
  total_messages int;
  messages_with_embeddings int;
  coverage_percentage float;
BEGIN
  SELECT COUNT(*) INTO total_messages FROM chat_messages;
  SELECT COUNT(*) INTO messages_with_embeddings FROM chat_messages WHERE embedding IS NOT NULL;
  
  coverage_percentage := CASE 
    WHEN total_messages > 0 THEN (messages_with_embeddings::float / total_messages * 100)
    ELSE 0
  END;
  
  RETURN jsonb_build_object(
    'total_messages', total_messages,
    'messages_with_embeddings', messages_with_embeddings,
    'coverage_percentage', round(coverage_percentage::numeric, 1),
    'updated_at', now()
  );
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- SETUP COMPLETE
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'INTELLIGENT AI ASSISTANT MEMORY SYSTEM SETUP COMPLETE!';
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Created tables:';
  RAISE NOTICE '- chat_sessions (conversation management)';
  RAISE NOTICE '- chat_messages (message storage with embeddings)';
  RAISE NOTICE '';
  RAISE NOTICE 'Created functions:';
  RAISE NOTICE '- search_chat_memories() - semantic search';
  RAISE NOTICE '- get_conversation_context() - context retrieval';
  RAISE NOTICE '- analyze_user_conversation_patterns() - pattern analysis';
  RAISE NOTICE '- create_sample_chat_data() - testing data';
  RAISE NOTICE '';
  RAISE NOTICE 'Features enabled:';
  RAISE NOTICE '✅ Semantic memory search with embeddings';
  RAISE NOTICE '✅ Conversation context for AI responses';
  RAISE NOTICE '✅ Automatic session management';
  RAISE NOTICE '✅ User conversation pattern analysis';
  RAISE NOTICE '✅ Row-level security for data privacy';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Test the API endpoints in your application';
  RAISE NOTICE '2. Generate embeddings for existing messages';
  RAISE NOTICE '3. Integrate with your AI assistant components';
  RAISE NOTICE '';
  RAISE NOTICE 'Your AI assistant now has intelligent memory! 🧠✨';
END $$;

-- Optional: Run embedding statistics
-- SELECT update_embedding_stats(); 