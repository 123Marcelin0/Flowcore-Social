-- ==========================================
-- COMPLETE MIGRATION 03: Missing AI Tables & Columns Only
-- This adds only what's missing from Migration 03 based on status check
-- ==========================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. CREATE MISSING AI TABLES
-- ==========================================

-- AI Context Logs (conversation history and context)
CREATE TABLE IF NOT EXISTS ai_context_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    conversation_id UUID NOT NULL,
    message_type VARCHAR(50) NOT NULL CHECK (message_type IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    context_data JSONB DEFAULT '{}',
    embedding VECTOR(1536), -- OpenAI text-embedding-ada-002 dimensions
    token_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Prompts (reusable prompt templates)
CREATE TABLE IF NOT EXISTS ai_prompts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    prompt_template TEXT NOT NULL,
    variables JSONB DEFAULT '{}', -- Template variables
    category VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 2. ADD MISSING ORGANIZATION_ID COLUMNS
-- ==========================================

-- Function to safely add organization_id column
CREATE OR REPLACE FUNCTION add_organization_id_if_missing(target_table TEXT)
RETURNS VOID AS $$
DECLARE
    column_exists BOOLEAN;
BEGIN
    -- Check if column already exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = target_table AND column_name = 'organization_id'
    ) INTO column_exists;
    
    -- Add column if it doesn't exist
    IF NOT column_exists THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL', target_table);
        RAISE NOTICE 'Added organization_id column to %', target_table;
    ELSE
        RAISE NOTICE 'Column organization_id already exists in %', target_table;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Add organization_id to missing tables
DO $$
BEGIN
    -- Add to user_profiles
    PERFORM add_organization_id_if_missing('user_profiles');
    
    -- Add to chat_messages (if table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_messages') THEN
        PERFORM add_organization_id_if_missing('chat_messages');
    END IF;
    
    -- Add to interactions (if table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'interactions') THEN
        PERFORM add_organization_id_if_missing('interactions');
    END IF;
    
    RAISE NOTICE 'Organization ID columns added to missing tables.';
END $$;

-- Clean up the helper function
DROP FUNCTION IF EXISTS add_organization_id_if_missing(TEXT);

-- ==========================================
-- 3. CREATE INDEXES FOR NEW TABLES
-- ==========================================

-- AI Context Logs indexes
CREATE INDEX IF NOT EXISTS idx_ai_context_logs_user_id ON ai_context_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_context_logs_organization_id ON ai_context_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_context_logs_conversation_id ON ai_context_logs(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_context_logs_message_type ON ai_context_logs(message_type);
CREATE INDEX IF NOT EXISTS idx_ai_context_logs_created_at ON ai_context_logs(created_at);

-- AI Prompts indexes
CREATE INDEX IF NOT EXISTS idx_ai_prompts_organization_id ON ai_prompts(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_category ON ai_prompts(category);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_is_active ON ai_prompts(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_created_by ON ai_prompts(created_by);

-- Add indexes for new organization_id columns
CREATE INDEX IF NOT EXISTS idx_user_profiles_organization_id ON user_profiles(organization_id);

DO $$
BEGIN
    -- Add index for chat_messages if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_messages') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_chat_messages_organization_id ON chat_messages(organization_id)';
    END IF;
    
    -- Add index for interactions if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'interactions') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_interactions_organization_id ON interactions(organization_id)';
    END IF;
END $$;

-- ==========================================
-- 4. MIGRATE EXISTING USERS TO DEFAULT ORGANIZATION
-- ==========================================

DO $$
DECLARE
    default_org_id UUID;
    user_count INTEGER;
BEGIN
    -- Get or create default organization
    SELECT id INTO default_org_id FROM organizations WHERE name = 'Default Organization' LIMIT 1;
    
    IF default_org_id IS NULL THEN
        -- Create default organization
        INSERT INTO organizations (id, name, slug, description, created_at)
        VALUES (uuid_generate_v4(), 'Default Organization', 'default', 'Default organization for existing users', NOW())
        RETURNING id INTO default_org_id;
        
        RAISE NOTICE 'Created default organization with ID: %', default_org_id;
    ELSE
        RAISE NOTICE 'Using existing default organization with ID: %', default_org_id;
    END IF;
    
    -- Update user_profiles without organization_id
    UPDATE user_profiles 
    SET organization_id = default_org_id 
    WHERE organization_id IS NULL;
    
    GET DIAGNOSTICS user_count = ROW_COUNT;
    RAISE NOTICE 'Updated % users with default organization', user_count;
    
    -- Add users to organization_members if not already there
    INSERT INTO organization_members (id, organization_id, user_id, role, created_at)
    SELECT 
        uuid_generate_v4(),
        default_org_id,
        up.id,
        'member',
        NOW()
    FROM user_profiles up
    WHERE NOT EXISTS (
        SELECT 1 FROM organization_members om 
        WHERE om.user_id = up.id AND om.organization_id = default_org_id
    )
    ON CONFLICT DO NOTHING;
    
    GET DIAGNOSTICS user_count = ROW_COUNT;
    RAISE NOTICE 'Added % users to organization members', user_count;
    
    -- Update other tables with organization_id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'organization_id') THEN
        UPDATE chat_messages 
        SET organization_id = (
            SELECT up.organization_id 
            FROM user_profiles up 
            WHERE up.id = chat_messages.user_id
        )
        WHERE organization_id IS NULL;
        
        GET DIAGNOSTICS user_count = ROW_COUNT;
        RAISE NOTICE 'Updated % chat_messages with organization_id', user_count;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'interactions' AND column_name = 'organization_id') THEN
        UPDATE interactions 
        SET organization_id = (
            SELECT up.organization_id 
            FROM user_profiles up 
            WHERE up.id = interactions.user_id
        )
        WHERE organization_id IS NULL;
        
        GET DIAGNOSTICS user_count = ROW_COUNT;
        RAISE NOTICE 'Updated % interactions with organization_id', user_count;
    END IF;
    
END $$;

-- ==========================================
-- 5. CREATE TRIGGERS FOR NEW TABLES
-- ==========================================

-- Function already exists from previous migrations, but let's ensure it's there
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_ai_prompts_updated_at BEFORE UPDATE ON ai_prompts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 6. ENABLE ROW LEVEL SECURITY FOR NEW TABLES
-- ==========================================

ALTER TABLE ai_context_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_prompts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for new tables
DO $$ 
BEGIN
    -- AI Context Logs policies
    DROP POLICY IF EXISTS "Users can view their own ai_context_logs" ON ai_context_logs;
    CREATE POLICY "Users can view their own ai_context_logs" ON ai_context_logs FOR SELECT USING (user_id = auth.uid());
    
    DROP POLICY IF EXISTS "Users can insert their own ai_context_logs" ON ai_context_logs;
    CREATE POLICY "Users can insert their own ai_context_logs" ON ai_context_logs FOR INSERT WITH CHECK (user_id = auth.uid());
    
    DROP POLICY IF EXISTS "Users can update their own ai_context_logs" ON ai_context_logs;
    CREATE POLICY "Users can update their own ai_context_logs" ON ai_context_logs FOR UPDATE USING (user_id = auth.uid());
    
    DROP POLICY IF EXISTS "Users can delete their own ai_context_logs" ON ai_context_logs;
    CREATE POLICY "Users can delete their own ai_context_logs" ON ai_context_logs FOR DELETE USING (user_id = auth.uid());

    -- AI Prompts policies (organization-based)
    DROP POLICY IF EXISTS "Users can view org ai_prompts" ON ai_prompts;
    CREATE POLICY "Users can view org ai_prompts" ON ai_prompts FOR SELECT 
    USING (
        organization_id IS NULL OR 
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.id = auth.uid() AND up.organization_id = ai_prompts.organization_id
        )
    );
    
    DROP POLICY IF EXISTS "Users can manage org ai_prompts" ON ai_prompts;
    CREATE POLICY "Users can manage org ai_prompts" ON ai_prompts FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.id = auth.uid() AND up.organization_id = ai_prompts.organization_id
        )
    );
    
END $$;

-- ==========================================
-- 7. CREATE HELPER FUNCTIONS
-- ==========================================

-- Function to get user's organization
CREATE OR REPLACE FUNCTION get_user_organization(target_user_id UUID)
RETURNS UUID AS $$
DECLARE
    org_id UUID;
BEGIN
    SELECT organization_id INTO org_id
    FROM user_profiles
    WHERE id = target_user_id;
    
    RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user belongs to organization
CREATE OR REPLACE FUNCTION user_belongs_to_organization(target_user_id UUID, target_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM organization_members om
        JOIN user_profiles up ON up.id = om.user_id
        WHERE om.user_id = target_user_id 
        AND om.organization_id = target_org_id
        AND up.organization_id = target_org_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Final success message
DO $$ 
BEGIN
    RAISE NOTICE 'Migration 03 completion successful! Created missing AI tables and added organization_id columns.';
END $$; 