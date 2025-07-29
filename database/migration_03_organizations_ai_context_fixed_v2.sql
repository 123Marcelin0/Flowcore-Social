-- Migration 03: Organization Multi-tenancy & Enhanced AI Context System (FIXED VERSION v2)
-- This version handles column dependencies more carefully

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ==========================================
-- 1. CREATE CORE ORGANIZATION TABLES FIRST
-- ==========================================

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,
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

-- Add unique constraint for slug if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'organizations_slug_key' 
        AND table_name = 'organizations'
    ) THEN
        ALTER TABLE organizations ADD CONSTRAINT organizations_slug_key UNIQUE(slug);
        RAISE NOTICE 'Added unique constraint to organizations.slug';
    ELSE
        RAISE NOTICE 'Unique constraint already exists on organizations.slug';
    END IF;
END $$;

-- Create organization members table (depends on organizations and user_profiles)
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'editor', 'member', 'viewer')),
    permissions JSONB DEFAULT '{}',
    invited_by UUID,
    invited_at TIMESTAMP WITH TIME ZONE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraints to organization_members if they don't exist
DO $$
BEGIN
    -- Add foreign key to organizations
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'organization_members_organization_id_fkey' 
        AND table_name = 'organization_members'
    ) THEN
        ALTER TABLE organization_members 
        ADD CONSTRAINT organization_members_organization_id_fkey 
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key constraint to organization_members.organization_id';
    END IF;

    -- Add foreign key to user_profiles (if user_profiles exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') AND
       NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'organization_members_user_id_fkey' 
        AND table_name = 'organization_members'
    ) THEN
        ALTER TABLE organization_members 
        ADD CONSTRAINT organization_members_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key constraint to organization_members.user_id';
    END IF;

    -- Add unique constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'organization_members_organization_id_user_id_key' 
        AND table_name = 'organization_members'
    ) THEN
        ALTER TABLE organization_members 
        ADD CONSTRAINT organization_members_organization_id_user_id_key 
        UNIQUE(organization_id, user_id);
        RAISE NOTICE 'Added unique constraint to organization_members';
    END IF;
END $$;

-- ==========================================
-- 2. CREATE DEFAULT ORGANIZATION FIRST
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
END $$;

-- ==========================================
-- 3. ADD ORGANIZATION_ID COLUMNS SAFELY
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
        EXECUTE format('ALTER TABLE %I ADD COLUMN organization_id UUID', target_table);
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
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
        PERFORM add_organization_id_column('user_profiles');
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts_core') THEN
        PERFORM add_organization_id_column('posts_core');
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts') THEN
        PERFORM add_organization_id_column('posts');
    END IF;
    
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
END $$;

-- Clean up the helper function
DROP FUNCTION IF EXISTS add_organization_id_column(TEXT);

-- ==========================================
-- 4. ADD FOREIGN KEY CONSTRAINTS TO ORGANIZATION_ID COLUMNS
-- ==========================================

-- Function to safely add foreign key constraint
CREATE OR REPLACE FUNCTION add_org_foreign_key(target_table TEXT)
RETURNS VOID AS $$
DECLARE
    constraint_name TEXT;
BEGIN
    constraint_name := target_table || '_organization_id_fkey';
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = target_table AND column_name = 'organization_id') 
       AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = add_org_foreign_key.constraint_name 
        AND table_name = target_table
    ) THEN
        EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL', target_table, constraint_name);
        RAISE NOTICE 'Added foreign key constraint to %.organization_id', target_table;
    ELSE
        RAISE NOTICE 'Foreign key constraint already exists or column missing in %', target_table;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Add foreign key constraints
DO $$
BEGIN
    PERFORM add_org_foreign_key('user_profiles');
    PERFORM add_org_foreign_key('posts_core');
    PERFORM add_org_foreign_key('posts');
    PERFORM add_org_foreign_key('content_ideas');
    PERFORM add_org_foreign_key('calendar_events');
    PERFORM add_org_foreign_key('social_accounts');
    PERFORM add_org_foreign_key('interactions');
    PERFORM add_org_foreign_key('chat_messages');
END $$;

-- Clean up helper function
DROP FUNCTION IF EXISTS add_org_foreign_key(TEXT);

-- ==========================================
-- 5. POPULATE ORGANIZATION_ID WITH DEFAULT ORG
-- ==========================================

-- Update existing records with default organization (only where NULL)
DO $$
DECLARE
    default_org_id UUID;
BEGIN
    -- Get default organization ID
    SELECT id INTO default_org_id FROM organizations WHERE slug = 'default-org';
    
    IF default_org_id IS NOT NULL THEN
        -- Add users to default organization
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
            INSERT INTO organization_members (organization_id, user_id, role, status)
            SELECT default_org_id, id, 'owner', 'active'
            FROM user_profiles
            WHERE id NOT IN (
                SELECT user_id FROM organization_members WHERE organization_id = default_org_id
            );
            
            UPDATE user_profiles SET organization_id = default_org_id WHERE organization_id IS NULL;
        END IF;
        
        -- Update other tables
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts_core' AND column_name = 'organization_id') THEN
            UPDATE posts_core SET organization_id = default_org_id WHERE organization_id IS NULL;
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'organization_id') THEN
            UPDATE posts SET organization_id = default_org_id WHERE organization_id IS NULL;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_ideas' AND column_name = 'organization_id') THEN
            UPDATE content_ideas SET organization_id = default_org_id WHERE organization_id IS NULL;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_events' AND column_name = 'organization_id') THEN
            UPDATE calendar_events SET organization_id = default_org_id WHERE organization_id IS NULL;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'social_accounts' AND column_name = 'organization_id') THEN
            UPDATE social_accounts SET organization_id = default_org_id WHERE organization_id IS NULL;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'interactions' AND column_name = 'organization_id') THEN
            UPDATE interactions SET organization_id = default_org_id WHERE organization_id IS NULL;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'organization_id') THEN
            UPDATE chat_messages SET organization_id = default_org_id WHERE organization_id IS NULL;
        END IF;
        
        RAISE NOTICE 'Successfully migrated existing data to default organization';
    ELSE
        RAISE NOTICE 'Default organization not found, skipping data migration';
    END IF;
END $$;

-- ==========================================
-- 6. CREATE AI CONTEXT & RAG SYSTEM TABLES
-- ==========================================

-- AI context logs for RAG and conversation history
CREATE TABLE IF NOT EXISTS ai_context_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    organization_id UUID,
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

-- Add foreign key constraints to ai_context_logs
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') AND
       NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'ai_context_logs_user_id_fkey' 
        AND table_name = 'ai_context_logs'
    ) THEN
        ALTER TABLE ai_context_logs 
        ADD CONSTRAINT ai_context_logs_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'ai_context_logs_organization_id_fkey' 
        AND table_name = 'ai_context_logs'
    ) THEN
        ALTER TABLE ai_context_logs 
        ADD CONSTRAINT ai_context_logs_organization_id_fkey 
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL;
    END IF;
END $$;

-- AI prompt templates
CREATE TABLE IF NOT EXISTS ai_prompts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID,
    name VARCHAR(255) NOT NULL,
    prompt_type TEXT NOT NULL CHECK (prompt_type IN ('content_generation', 'chat_response', 'analysis', 'suggestion', 'trend_analysis')),
    template TEXT NOT NULL,
    parameters JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    version INTEGER DEFAULT 1,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraints to ai_prompts
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'ai_prompts_organization_id_fkey' 
        AND table_name = 'ai_prompts'
    ) THEN
        ALTER TABLE ai_prompts 
        ADD CONSTRAINT ai_prompts_organization_id_fkey 
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') AND
       NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'ai_prompts_created_by_fkey' 
        AND table_name = 'ai_prompts'
    ) THEN
        ALTER TABLE ai_prompts 
        ADD CONSTRAINT ai_prompts_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES user_profiles(id);
    END IF;

    -- Add unique constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'ai_prompts_organization_id_name_version_key' 
        AND table_name = 'ai_prompts'
    ) THEN
        ALTER TABLE ai_prompts 
        ADD CONSTRAINT ai_prompts_organization_id_name_version_key 
        UNIQUE(organization_id, name, version);
    END IF;
END $$;

-- AI suggestions
CREATE TABLE IF NOT EXISTS ai_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    organization_id UUID,
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

-- Add foreign key constraints to ai_suggestions
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') AND
       NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'ai_suggestions_user_id_fkey' 
        AND table_name = 'ai_suggestions'
    ) THEN
        ALTER TABLE ai_suggestions 
        ADD CONSTRAINT ai_suggestions_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'ai_suggestions_organization_id_fkey' 
        AND table_name = 'ai_suggestions'
    ) THEN
        ALTER TABLE ai_suggestions 
        ADD CONSTRAINT ai_suggestions_organization_id_fkey 
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ==========================================
-- 7. CREATE PUBLISHING SYSTEM TABLES
-- ==========================================

-- Publishing queue (create after organization_id columns exist)
CREATE TABLE IF NOT EXISTS publishing_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    organization_id UUID NOT NULL,
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

-- Add foreign key constraints to publishing_queue
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') AND
       NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'publishing_queue_user_id_fkey' 
        AND table_name = 'publishing_queue'
    ) THEN
        ALTER TABLE publishing_queue 
        ADD CONSTRAINT publishing_queue_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'publishing_queue_organization_id_fkey' 
        AND table_name = 'publishing_queue'
    ) THEN
        ALTER TABLE publishing_queue 
        ADD CONSTRAINT publishing_queue_organization_id_fkey 
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Publishing logs
CREATE TABLE IF NOT EXISTS publishing_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    queue_id UUID NOT NULL,
    user_id UUID NOT NULL,
    organization_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('queued', 'started', 'completed', 'failed', 'cancelled', 'retried')),
    status VARCHAR(50) NOT NULL,
    message TEXT,
    error_details JSONB,
    processing_time_ms INTEGER,
    api_response JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraints to publishing_logs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'publishing_logs_queue_id_fkey' 
        AND table_name = 'publishing_logs'
    ) THEN
        ALTER TABLE publishing_logs 
        ADD CONSTRAINT publishing_logs_queue_id_fkey 
        FOREIGN KEY (queue_id) REFERENCES publishing_queue(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') AND
       NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'publishing_logs_user_id_fkey' 
        AND table_name = 'publishing_logs'
    ) THEN
        ALTER TABLE publishing_logs 
        ADD CONSTRAINT publishing_logs_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'publishing_logs_organization_id_fkey' 
        AND table_name = 'publishing_logs'
    ) THEN
        ALTER TABLE publishing_logs 
        ADD CONSTRAINT publishing_logs_organization_id_fkey 
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ==========================================
-- 8. CREATE INDEXES
-- ==========================================

-- Organizations indexes
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_subscription_tier ON organizations(subscription_tier);

-- Organization members indexes
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_role ON organization_members(role);

-- AI context logs indexes
CREATE INDEX IF NOT EXISTS idx_ai_context_logs_user_id ON ai_context_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_context_logs_org_id ON ai_context_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_context_logs_source_type ON ai_context_logs(source_type);

-- AI prompts indexes
CREATE INDEX IF NOT EXISTS idx_ai_prompts_org_id ON ai_prompts(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_type ON ai_prompts(prompt_type);

-- AI suggestions indexes
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_user_id ON ai_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_org_id ON ai_suggestions(organization_id);

-- Publishing queue indexes
CREATE INDEX IF NOT EXISTS idx_publishing_queue_scheduled_at ON publishing_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_publishing_queue_status ON publishing_queue(status);

-- ==========================================
-- 9. CREATE UTILITY FUNCTIONS
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

-- ==========================================
-- 10. ENABLE ROW LEVEL SECURITY
-- ==========================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_context_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE publishing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE publishing_logs ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 11. CREATE BASIC RLS POLICIES
-- ==========================================

-- Simple policies for now (can be enhanced later)
DO $$
BEGIN
    -- Organizations policies
    DROP POLICY IF EXISTS "Users can view organizations they belong to" ON organizations;
    CREATE POLICY "Users can view organizations they belong to" ON organizations
        FOR SELECT USING (true); -- Simplified for now

    -- Organization members policies
    DROP POLICY IF EXISTS "Users can view organization members" ON organization_members;
    CREATE POLICY "Users can view organization members" ON organization_members
        FOR SELECT USING (true); -- Simplified for now

    -- AI context logs policies
    DROP POLICY IF EXISTS "Users can view AI context logs" ON ai_context_logs;
    CREATE POLICY "Users can view AI context logs" ON ai_context_logs
        FOR SELECT USING (true); -- Simplified for now

    DROP POLICY IF EXISTS "Users can insert AI context logs" ON ai_context_logs;
    CREATE POLICY "Users can insert AI context logs" ON ai_context_logs
        FOR INSERT WITH CHECK (true); -- Simplified for now

    -- AI prompts policies
    DROP POLICY IF EXISTS "Users can view AI prompts" ON ai_prompts;
    CREATE POLICY "Users can view AI prompts" ON ai_prompts
        FOR SELECT USING (true); -- Simplified for now

    -- AI suggestions policies
    DROP POLICY IF EXISTS "Users can view AI suggestions" ON ai_suggestions;
    CREATE POLICY "Users can view AI suggestions" ON ai_suggestions
        FOR SELECT USING (true); -- Simplified for now

    DROP POLICY IF EXISTS "Users can insert AI suggestions" ON ai_suggestions;
    CREATE POLICY "Users can insert AI suggestions" ON ai_suggestions
        FOR INSERT WITH CHECK (true); -- Simplified for now

    -- Publishing queue policies
    DROP POLICY IF EXISTS "Users can view publishing queue" ON publishing_queue;
    CREATE POLICY "Users can view publishing queue" ON publishing_queue
        FOR SELECT USING (true); -- Simplified for now

    -- Publishing logs policies
    DROP POLICY IF EXISTS "Users can view publishing logs" ON publishing_logs;
    CREATE POLICY "Users can view publishing logs" ON publishing_logs
        FOR SELECT USING (true); -- Simplified for now

    RAISE NOTICE 'RLS policies created successfully';
END $$;

-- ==========================================
-- 12. CREATE TRIGGERS
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
-- 13. GRANT PERMISSIONS
-- ==========================================

GRANT ALL ON organizations TO authenticated;
GRANT ALL ON organization_members TO authenticated;
GRANT ALL ON ai_context_logs TO authenticated;
GRANT ALL ON ai_prompts TO authenticated;
GRANT ALL ON ai_suggestions TO authenticated;
GRANT ALL ON publishing_queue TO authenticated;
GRANT ALL ON publishing_logs TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_org_permission TO authenticated;

-- Success message
SELECT 'Migration 03 completed successfully! Organizations and AI context system created.' as migration_status; 