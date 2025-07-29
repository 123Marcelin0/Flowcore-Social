-- Migration 03: Organization Multi-tenancy & Enhanced AI Context System (FIXED VERSION)
-- This version safely handles existing tables and columns

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ==========================================
-- 1. ORGANIZATIONS & MULTI-TENANCY TABLES
-- ==========================================

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    logo_url TEXT,
    website VARCHAR(255),
    subscription_tier VARCHAR(50) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
    max_users INTEGER DEFAULT 1,
    max_posts INTEGER DEFAULT 100,
    max_storage_gb INTEGER DEFAULT 1,
    settings JSONB DEFAULT '{}',
    billing_email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create organization members table
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'editor', 'member', 'viewer')),
    permissions JSONB DEFAULT '{}',
    invited_by UUID REFERENCES user_profiles(id),
    invited_at TIMESTAMP WITH TIME ZONE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'organization_members_organization_id_user_id_key' 
        AND table_name = 'organization_members'
    ) THEN
        ALTER TABLE organization_members ADD CONSTRAINT organization_members_organization_id_user_id_key UNIQUE(organization_id, user_id);
        RAISE NOTICE 'Added unique constraint to organization_members';
    ELSE
        RAISE NOTICE 'Unique constraint already exists on organization_members';
    END IF;
END $$;

-- ==========================================
-- 2. AI CONTEXT & RAG SYSTEM
-- ==========================================

-- Unified AI context logs for RAG and conversation history
CREATE TABLE IF NOT EXISTS ai_context_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('chat', 'post', 'dm', 'comment', 'insight', 'suggestion', 'analysis')),
    source_id UUID,
    context_summary TEXT NOT NULL,
    ai_response TEXT,
    prompt_template TEXT,
    model_used TEXT DEFAULT 'gpt-4',
    feedback_score INTEGER CHECK (feedback_score BETWEEN 1 AND 5),
    feedback_type TEXT CHECK (feedback_type IN ('helpful', 'too_generic', 'not_relevant', 'incorrect', 'excellent')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI prompt templates for consistent responses
CREATE TABLE IF NOT EXISTS ai_prompts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    prompt_type TEXT NOT NULL CHECK (prompt_type IN ('content_generation', 'chat_response', 'analysis', 'suggestion', 'trend_analysis')),
    template TEXT NOT NULL,
    parameters JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    version INTEGER DEFAULT 1,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add unique constraint for ai_prompts if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'ai_prompts_organization_id_name_version_key' 
        AND table_name = 'ai_prompts'
    ) THEN
        ALTER TABLE ai_prompts ADD CONSTRAINT ai_prompts_organization_id_name_version_key UNIQUE(organization_id, name, version);
        RAISE NOTICE 'Added unique constraint to ai_prompts';
    ELSE
        RAISE NOTICE 'Unique constraint already exists on ai_prompts';
    END IF;
END $$;

-- AI suggestions with improved feedback system
CREATE TABLE IF NOT EXISTS ai_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    suggestion_type TEXT NOT NULL CHECK (suggestion_type IN ('content_idea', 'hashtag', 'caption', 'response', 'optimization')),
    source_entity_type TEXT,
    source_entity_id UUID,
    suggestion_text TEXT NOT NULL,
    confidence_score FLOAT DEFAULT 0.5 CHECK (confidence_score BETWEEN 0 AND 1),
    reasoning TEXT,
    is_accepted BOOLEAN,
    is_dismissed BOOLEAN DEFAULT FALSE,
    feedback_rating INTEGER CHECK (feedback_rating BETWEEN 1 AND 5),
    feedback_text TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 3. ADD ORGANIZATION_ID TO EXISTING TABLES (SAFELY)
-- ==========================================

-- Function to safely add organization_id column
CREATE OR REPLACE FUNCTION add_organization_id_column(target_table TEXT)
RETURNS VOID AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = target_table 
        AND column_name = 'organization_id'
    ) THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL', target_table);
        RAISE NOTICE 'Added organization_id column to %', target_table;
    ELSE
        RAISE NOTICE 'organization_id column already exists in %', target_table;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Add organization_id to existing tables
DO $$
BEGIN
    -- Check if tables exist before adding columns
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'content_ideas') THEN
        PERFORM add_organization_id_column('content_ideas');
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'calendar_events') THEN
        PERFORM add_organization_id_column('calendar_events');
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'social_accounts') THEN
        PERFORM add_organization_id_column('social_accounts');
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'interactions') THEN
        PERFORM add_organization_id_column('interactions');
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_messages') THEN
        PERFORM add_organization_id_column('chat_messages');
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
        PERFORM add_organization_id_column('user_profiles');
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts_core') THEN
        PERFORM add_organization_id_column('posts_core');
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts') THEN
        PERFORM add_organization_id_column('posts');
    END IF;
END $$;

-- Clean up the helper function
DROP FUNCTION IF EXISTS add_organization_id_column(TEXT);

-- ==========================================
-- 4. MIGRATE EXISTING DATA TO DEFAULT ORGANIZATION
-- ==========================================

-- Create a default organization for existing users
DO $$
DECLARE
    default_org_id UUID;
BEGIN
    -- Check if default organization already exists
    SELECT id INTO default_org_id FROM organizations WHERE slug = 'default-org';
    
    IF default_org_id IS NULL THEN
        INSERT INTO organizations (name, slug, description, subscription_tier, max_users, max_posts)
        VALUES ('Default Organization', 'default-org', 'Default organization for existing users', 'free', 999, 10000)
        RETURNING id INTO default_org_id;
        
        RAISE NOTICE 'Created default organization with ID: %', default_org_id;
    ELSE
        RAISE NOTICE 'Default organization already exists with ID: %', default_org_id;
    END IF;
    
    -- Add all existing users to the default organization as owners (avoid duplicates)
    INSERT INTO organization_members (organization_id, user_id, role, status)
    SELECT default_org_id, id, 'owner', 'active'
    FROM user_profiles
    WHERE id NOT IN (
        SELECT user_id FROM organization_members WHERE organization_id = default_org_id
    );
    
    -- Update existing records with default organization (only where NULL)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
        UPDATE user_profiles SET organization_id = default_org_id WHERE organization_id IS NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts_core') THEN
        UPDATE posts_core SET organization_id = default_org_id WHERE organization_id IS NULL;
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts') THEN
        UPDATE posts SET organization_id = default_org_id WHERE organization_id IS NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'content_ideas') THEN
        UPDATE content_ideas SET organization_id = default_org_id WHERE organization_id IS NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'calendar_events') THEN
        UPDATE calendar_events SET organization_id = default_org_id WHERE organization_id IS NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'social_accounts') THEN
        UPDATE social_accounts SET organization_id = default_org_id WHERE organization_id IS NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'interactions') THEN
        UPDATE interactions SET organization_id = default_org_id WHERE organization_id IS NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_messages') THEN
        UPDATE chat_messages SET organization_id = default_org_id WHERE organization_id IS NULL;
    END IF;
    
    RAISE NOTICE 'Successfully migrated existing data to default organization';
END $$;

-- ==========================================
-- 5. ENHANCED PUBLISHING QUEUE
-- ==========================================

CREATE TABLE IF NOT EXISTS publishing_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    post_id UUID NOT NULL,
    platform VARCHAR(50) NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'published', 'failed', 'cancelled', 'retrying')),
    attempt_count INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    error_message TEXT,
    error_code VARCHAR(50),
    external_post_id VARCHAR(255),
    published_at TIMESTAMP WITH TIME ZONE,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    processing_started_at TIMESTAMP WITH TIME ZONE,
    processing_completed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Publishing logs for audit trail
CREATE TABLE IF NOT EXISTS publishing_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    queue_id UUID NOT NULL REFERENCES publishing_queue(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL CHECK (action IN ('queued', 'started', 'completed', 'failed', 'cancelled', 'retried')),
    status VARCHAR(50) NOT NULL,
    message TEXT,
    error_details JSONB,
    processing_time_ms INTEGER,
    api_response JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 6. CREATE PERFORMANCE INDEXES
-- ==========================================

-- Organizations indexes
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_subscription_tier ON organizations(subscription_tier);

-- Organization members indexes
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_role ON organization_members(role);
CREATE INDEX IF NOT EXISTS idx_organization_members_status ON organization_members(status);

-- AI context logs indexes
CREATE INDEX IF NOT EXISTS idx_ai_context_logs_user_id ON ai_context_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_context_logs_org_id ON ai_context_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_context_logs_source_type ON ai_context_logs(source_type);
CREATE INDEX IF NOT EXISTS idx_ai_context_logs_created_at ON ai_context_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_context_logs_feedback ON ai_context_logs(feedback_score) WHERE feedback_score IS NOT NULL;

-- AI prompts indexes
CREATE INDEX IF NOT EXISTS idx_ai_prompts_org_id ON ai_prompts(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_type ON ai_prompts(prompt_type);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_active ON ai_prompts(is_active) WHERE is_active = TRUE;

-- AI suggestions indexes
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_user_id ON ai_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_org_id ON ai_suggestions(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_type ON ai_suggestions(suggestion_type);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_accepted ON ai_suggestions(is_accepted) WHERE is_accepted IS NOT NULL;

-- Publishing queue indexes
CREATE INDEX IF NOT EXISTS idx_publishing_queue_scheduled_at ON publishing_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_publishing_queue_status ON publishing_queue(status);
CREATE INDEX IF NOT EXISTS idx_publishing_queue_platform ON publishing_queue(platform);
CREATE INDEX IF NOT EXISTS idx_publishing_queue_user_id ON publishing_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_publishing_queue_org_id ON publishing_queue(organization_id);

-- Publishing logs indexes
CREATE INDEX IF NOT EXISTS idx_publishing_logs_queue_id ON publishing_logs(queue_id);
CREATE INDEX IF NOT EXISTS idx_publishing_logs_action ON publishing_logs(action);
CREATE INDEX IF NOT EXISTS idx_publishing_logs_created_at ON publishing_logs(created_at DESC);

-- Organization-based indexes for existing tables (safely)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts_core' AND column_name = 'organization_id') THEN
        CREATE INDEX IF NOT EXISTS idx_posts_core_org_id ON posts_core(organization_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'organization_id') THEN
        CREATE INDEX IF NOT EXISTS idx_posts_org_id ON posts(organization_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_ideas' AND column_name = 'organization_id') THEN
        CREATE INDEX IF NOT EXISTS idx_content_ideas_org_id ON content_ideas(organization_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_events' AND column_name = 'organization_id') THEN
        CREATE INDEX IF NOT EXISTS idx_calendar_events_org_id ON calendar_events(organization_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'social_accounts' AND column_name = 'organization_id') THEN
        CREATE INDEX IF NOT EXISTS idx_social_accounts_org_id ON social_accounts(organization_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'interactions' AND column_name = 'organization_id') THEN
        CREATE INDEX IF NOT EXISTS idx_interactions_org_id ON interactions(organization_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'organization_id') THEN
        CREATE INDEX IF NOT EXISTS idx_chat_messages_org_id ON chat_messages(organization_id);
    END IF;
END $$;

-- ==========================================
-- 7. CREATE UTILITY FUNCTIONS
-- ==========================================

-- Function to check if user has permission in organization
CREATE OR REPLACE FUNCTION user_has_org_permission(
    check_user_id UUID,
    check_org_id UUID,
    required_role TEXT DEFAULT 'member'
)
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
    role_hierarchy TEXT[] := ARRAY['viewer', 'member', 'editor', 'admin', 'owner'];
    required_level INTEGER;
    user_level INTEGER;
BEGIN
    -- Get user's role in organization
    SELECT role INTO user_role 
    FROM organization_members 
    WHERE user_id = check_user_id 
      AND organization_id = check_org_id 
      AND status = 'active';
    
    IF user_role IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Get role levels
    SELECT array_position(role_hierarchy, required_role) INTO required_level;
    SELECT array_position(role_hierarchy, user_role) INTO user_level;
    
    -- Check if user has required level or higher
    RETURN user_level >= required_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get organization usage statistics
CREATE OR REPLACE FUNCTION get_organization_usage(org_id UUID)
RETURNS TABLE(
    total_users INTEGER,
    total_posts INTEGER,
    total_storage_bytes BIGINT,
    posts_this_month INTEGER,
    storage_usage_gb NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*)::INTEGER FROM organization_members WHERE organization_id = org_id AND status = 'active'),
        COALESCE((SELECT COUNT(*)::INTEGER FROM posts_core WHERE organization_id = org_id), 
                (SELECT COUNT(*)::INTEGER FROM posts WHERE organization_id = org_id)),
        COALESCE((SELECT SUM(file_size) FROM media_files mf 
                 WHERE EXISTS (
                     SELECT 1 FROM post_media_links pml 
                     JOIN posts_core pc ON pml.post_id = pc.id 
                     WHERE pc.organization_id = org_id AND pml.media_file_id = mf.id
                 )), 0),
        COALESCE((SELECT COUNT(*)::INTEGER FROM posts_core 
                 WHERE organization_id = org_id 
                   AND created_at >= date_trunc('month', NOW())),
                (SELECT COUNT(*)::INTEGER FROM posts 
                 WHERE organization_id = org_id 
                   AND created_at >= date_trunc('month', NOW()))),
        COALESCE((SELECT SUM(file_size)::NUMERIC / (1024*1024*1024) FROM media_files mf 
                 WHERE EXISTS (
                     SELECT 1 FROM post_media_links pml 
                     JOIN posts_core pc ON pml.post_id = pc.id 
                     WHERE pc.organization_id = org_id AND pml.media_file_id = mf.id
                 )), 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 8. CREATE TRIGGERS
-- ==========================================

-- Check if trigger function exists before creating triggers
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'update_updated_at_column') THEN
        -- Drop existing triggers
        DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
        DROP TRIGGER IF EXISTS update_organization_members_updated_at ON organization_members;
        DROP TRIGGER IF EXISTS update_ai_context_logs_updated_at ON ai_context_logs;
        DROP TRIGGER IF EXISTS update_ai_prompts_updated_at ON ai_prompts;
        DROP TRIGGER IF EXISTS update_ai_suggestions_updated_at ON ai_suggestions;
        DROP TRIGGER IF EXISTS update_publishing_queue_updated_at ON publishing_queue;
        
        -- Create new triggers
        CREATE TRIGGER update_organizations_updated_at 
            BEFORE UPDATE ON organizations
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

        CREATE TRIGGER update_organization_members_updated_at 
            BEFORE UPDATE ON organization_members
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

        CREATE TRIGGER update_ai_context_logs_updated_at 
            BEFORE UPDATE ON ai_context_logs
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

        CREATE TRIGGER update_ai_prompts_updated_at 
            BEFORE UPDATE ON ai_prompts
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

        CREATE TRIGGER update_ai_suggestions_updated_at 
            BEFORE UPDATE ON ai_suggestions
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

        CREATE TRIGGER update_publishing_queue_updated_at 
            BEFORE UPDATE ON publishing_queue
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        
        RAISE NOTICE 'Triggers created successfully';
    ELSE
        RAISE NOTICE 'update_updated_at_column function not found, skipping trigger creation';
    END IF;
END $$;

-- ==========================================
-- 9. ENABLE ROW LEVEL SECURITY
-- ==========================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_context_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE publishing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE publishing_logs ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 10. CREATE RLS POLICIES (FIXED SYNTAX)
-- ==========================================

-- Drop existing policies if they exist and create new ones
DO $$
BEGIN
    -- Organizations policies
    DROP POLICY IF EXISTS "Users can view organizations they belong to" ON organizations;
    CREATE POLICY "Users can view organizations they belong to" ON organizations
        FOR SELECT USING (id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND status = 'active'));

    DROP POLICY IF EXISTS "Organization owners can update their organization" ON organizations;
    CREATE POLICY "Organization owners can update their organization" ON organizations
        FOR UPDATE USING (user_has_org_permission(auth.uid(), id, 'owner'));

    -- Organization members policies
    DROP POLICY IF EXISTS "Users can view members of their organizations" ON organization_members;
    CREATE POLICY "Users can view members of their organizations" ON organization_members
        FOR SELECT USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND status = 'active'));

    DROP POLICY IF EXISTS "Organization admins can manage members" ON organization_members;
    CREATE POLICY "Organization admins can manage members" ON organization_members
        FOR ALL USING (user_has_org_permission(auth.uid(), organization_id, 'admin'));

    -- AI context logs policies
    DROP POLICY IF EXISTS "Users can view AI context logs in their organizations" ON ai_context_logs;
    CREATE POLICY "Users can view AI context logs in their organizations" ON ai_context_logs
        FOR SELECT USING (
            user_id = auth.uid() OR 
            (organization_id IS NOT NULL AND user_has_org_permission(auth.uid(), organization_id, 'member'))
        );

    DROP POLICY IF EXISTS "Users can insert AI context logs for their organizations" ON ai_context_logs;
    CREATE POLICY "Users can insert AI context logs for their organizations" ON ai_context_logs
        FOR INSERT WITH CHECK (
            user_id = auth.uid() AND 
            (organization_id IS NULL OR user_has_org_permission(auth.uid(), organization_id, 'member'))
        );

    -- AI prompts policies
    DROP POLICY IF EXISTS "Users can view AI prompts in their organizations" ON ai_prompts;
    CREATE POLICY "Users can view AI prompts in their organizations" ON ai_prompts
        FOR SELECT USING (user_has_org_permission(auth.uid(), organization_id, 'member'));

    DROP POLICY IF EXISTS "Organization editors can manage AI prompts" ON ai_prompts;
    CREATE POLICY "Organization editors can manage AI prompts" ON ai_prompts
        FOR ALL USING (user_has_org_permission(auth.uid(), organization_id, 'editor'));

    -- AI suggestions policies
    DROP POLICY IF EXISTS "Users can view AI suggestions in their organizations" ON ai_suggestions;
    CREATE POLICY "Users can view AI suggestions in their organizations" ON ai_suggestions
        FOR SELECT USING (
            user_id = auth.uid() OR 
            (organization_id IS NOT NULL AND user_has_org_permission(auth.uid(), organization_id, 'member'))
        );

    DROP POLICY IF EXISTS "Users can insert AI suggestions for their organizations" ON ai_suggestions;
    CREATE POLICY "Users can insert AI suggestions for their organizations" ON ai_suggestions
        FOR INSERT WITH CHECK (
            user_id = auth.uid() AND 
            (organization_id IS NULL OR user_has_org_permission(auth.uid(), organization_id, 'member'))
        );

    -- Publishing queue policies
    DROP POLICY IF EXISTS "Users can view publishing queue in their organizations" ON publishing_queue;
    CREATE POLICY "Users can view publishing queue in their organizations" ON publishing_queue
        FOR SELECT USING (user_has_org_permission(auth.uid(), organization_id, 'member'));

    DROP POLICY IF EXISTS "Users can manage publishing queue in their organizations" ON publishing_queue;
    CREATE POLICY "Users can manage publishing queue in their organizations" ON publishing_queue
        FOR ALL USING (user_has_org_permission(auth.uid(), organization_id, 'editor'));

    -- Publishing logs policies
    DROP POLICY IF EXISTS "Users can view publishing logs in their organizations" ON publishing_logs;
    CREATE POLICY "Users can view publishing logs in their organizations" ON publishing_logs
        FOR SELECT USING (user_has_org_permission(auth.uid(), organization_id, 'member'));

    RAISE NOTICE 'RLS policies created successfully';
END $$;

-- ==========================================
-- 11. GRANT PERMISSIONS
-- ==========================================

GRANT ALL ON organizations TO authenticated;
GRANT ALL ON organization_members TO authenticated;
GRANT ALL ON ai_context_logs TO authenticated;
GRANT ALL ON ai_prompts TO authenticated;
GRANT ALL ON ai_suggestions TO authenticated;
GRANT ALL ON publishing_queue TO authenticated;
GRANT ALL ON publishing_logs TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_org_permission TO authenticated;
GRANT EXECUTE ON FUNCTION get_organization_usage TO authenticated;

-- Success message
SELECT 'Migration 03 completed successfully! Organizations and AI context system created.' as migration_status; 