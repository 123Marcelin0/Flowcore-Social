-- Migration 03: Organization Multi-tenancy & Enhanced AI Context System
-- Implements organization support and unified AI context logging

-- ==========================================
-- 1. ORGANIZATIONS & MULTI-TENANCY TABLES
-- ==========================================

-- Create organizations table
CREATE TABLE organizations (
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
CREATE TABLE organization_members (
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

-- ==========================================
-- 2. AI CONTEXT & RAG SYSTEM
-- ==========================================

-- Unified AI context logs for RAG and conversation history
CREATE TABLE ai_context_logs (
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
CREATE TABLE ai_prompts (
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, name, version)
);

-- AI suggestions with improved feedback system
CREATE TABLE ai_suggestions (
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
-- 3. ADD ORGANIZATION_ID TO EXISTING TABLES
-- ==========================================

-- Add organization_id to posts_core (already exists from migration 01)
-- ALTER TABLE posts_core ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- Add organization_id to content_ideas
ALTER TABLE content_ideas ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- Add organization_id to calendar_events
ALTER TABLE calendar_events ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- Add organization_id to social_accounts
ALTER TABLE social_accounts ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- Add organization_id to interactions
ALTER TABLE interactions ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- Add organization_id to chat_messages
ALTER TABLE chat_messages ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- Add organization_id to user_profiles for default organization
ALTER TABLE user_profiles ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- ==========================================
-- 4. MIGRATE EXISTING DATA TO DEFAULT ORGANIZATION
-- ==========================================

-- Create a default organization for existing users
INSERT INTO organizations (name, slug, description, subscription_tier, max_users, max_posts)
VALUES ('Default Organization', 'default-org', 'Default organization for existing users', 'free', 999, 10000)
ON CONFLICT (slug) DO NOTHING;

-- Get the default organization ID
DO $$
DECLARE
    default_org_id UUID;
BEGIN
    SELECT id INTO default_org_id FROM organizations WHERE slug = 'default-org';
    
    -- Add all existing users to the default organization as owners
    INSERT INTO organization_members (organization_id, user_id, role, status)
    SELECT default_org_id, id, 'owner', 'active'
    FROM user_profiles
    ON CONFLICT (organization_id, user_id) DO NOTHING;
    
    -- Update existing records with default organization
    UPDATE user_profiles SET organization_id = default_org_id WHERE organization_id IS NULL;
    UPDATE posts_core SET organization_id = default_org_id WHERE organization_id IS NULL;
    UPDATE content_ideas SET organization_id = default_org_id WHERE organization_id IS NULL;
    UPDATE calendar_events SET organization_id = default_org_id WHERE organization_id IS NULL;
    UPDATE social_accounts SET organization_id = default_org_id WHERE organization_id IS NULL;
    UPDATE interactions SET organization_id = default_org_id WHERE organization_id IS NULL;
    UPDATE chat_messages SET organization_id = default_org_id WHERE organization_id IS NULL;
END $$;

-- ==========================================
-- 5. CREATE ENHANCED PUBLISHING QUEUE
-- ==========================================

CREATE TABLE publishing_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts_core(id) ON DELETE CASCADE,
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
CREATE TABLE publishing_logs (
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
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_subscription_tier ON organizations(subscription_tier);

-- Organization members indexes
CREATE INDEX idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX idx_organization_members_role ON organization_members(role);
CREATE INDEX idx_organization_members_status ON organization_members(status);

-- AI context logs indexes
CREATE INDEX idx_ai_context_logs_user_id ON ai_context_logs(user_id);
CREATE INDEX idx_ai_context_logs_org_id ON ai_context_logs(organization_id);
CREATE INDEX idx_ai_context_logs_source_type ON ai_context_logs(source_type);
CREATE INDEX idx_ai_context_logs_created_at ON ai_context_logs(created_at DESC);
CREATE INDEX idx_ai_context_logs_feedback ON ai_context_logs(feedback_score) WHERE feedback_score IS NOT NULL;

-- AI prompts indexes
CREATE INDEX idx_ai_prompts_org_id ON ai_prompts(organization_id);
CREATE INDEX idx_ai_prompts_type ON ai_prompts(prompt_type);
CREATE INDEX idx_ai_prompts_active ON ai_prompts(is_active) WHERE is_active = TRUE;

-- AI suggestions indexes
CREATE INDEX idx_ai_suggestions_user_id ON ai_suggestions(user_id);
CREATE INDEX idx_ai_suggestions_org_id ON ai_suggestions(organization_id);
CREATE INDEX idx_ai_suggestions_type ON ai_suggestions(suggestion_type);
CREATE INDEX idx_ai_suggestions_accepted ON ai_suggestions(is_accepted) WHERE is_accepted IS NOT NULL;

-- Publishing queue indexes
CREATE INDEX idx_publishing_queue_scheduled_at ON publishing_queue(scheduled_at);
CREATE INDEX idx_publishing_queue_status ON publishing_queue(status);
CREATE INDEX idx_publishing_queue_platform ON publishing_queue(platform);
CREATE INDEX idx_publishing_queue_user_id ON publishing_queue(user_id);
CREATE INDEX idx_publishing_queue_org_id ON publishing_queue(organization_id);

-- Publishing logs indexes
CREATE INDEX idx_publishing_logs_queue_id ON publishing_logs(queue_id);
CREATE INDEX idx_publishing_logs_action ON publishing_logs(action);
CREATE INDEX idx_publishing_logs_created_at ON publishing_logs(created_at DESC);

-- Organization-based indexes for existing tables
CREATE INDEX idx_posts_core_org_id ON posts_core(organization_id);
CREATE INDEX idx_content_ideas_org_id ON content_ideas(organization_id);
CREATE INDEX idx_calendar_events_org_id ON calendar_events(organization_id);
CREATE INDEX idx_social_accounts_org_id ON social_accounts(organization_id);
CREATE INDEX idx_interactions_org_id ON interactions(organization_id);
CREATE INDEX idx_chat_messages_org_id ON chat_messages(organization_id);

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
        (SELECT COUNT(*)::INTEGER FROM posts_core WHERE organization_id = org_id),
        (SELECT COALESCE(SUM(file_size), 0) FROM media_files mf 
         JOIN post_media_links pml ON mf.id = pml.media_file_id 
         JOIN posts_core pc ON pml.post_id = pc.id 
         WHERE pc.organization_id = org_id),
        (SELECT COUNT(*)::INTEGER FROM posts_core 
         WHERE organization_id = org_id 
           AND created_at >= date_trunc('month', NOW())),
        (SELECT COALESCE(SUM(file_size), 0)::NUMERIC / (1024*1024*1024) FROM media_files mf 
         JOIN post_media_links pml ON mf.id = pml.media_file_id 
         JOIN posts_core pc ON pml.post_id = pc.id 
         WHERE pc.organization_id = org_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 8. CREATE TRIGGERS
-- ==========================================

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
-- 10. CREATE ENHANCED RLS POLICIES
-- ==========================================

-- Organizations policies
CREATE POLICY "Users can view organizations they belong to" ON organizations
    FOR SELECT USING (id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND status = 'active'));

CREATE POLICY "Organization owners can update their organization" ON organizations
    FOR UPDATE USING (user_has_org_permission(auth.uid(), id, 'owner'));

-- Organization members policies
CREATE POLICY "Users can view members of their organizations" ON organization_members
    FOR SELECT USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND status = 'active'));

CREATE POLICY "Organization admins can manage members" ON organization_members
    FOR ALL USING (user_has_org_permission(auth.uid(), organization_id, 'admin'));

-- AI context logs policies
CREATE POLICY "Users can view AI context logs in their organizations" ON ai_context_logs
    FOR SELECT USING (
        user_id = auth.uid() OR 
        (organization_id IS NOT NULL AND user_has_org_permission(auth.uid(), organization_id, 'member'))
    );

CREATE POLICY "Users can insert AI context logs for their organizations" ON ai_context_logs
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND 
        (organization_id IS NULL OR user_has_org_permission(auth.uid(), organization_id, 'member'))
    );

-- AI prompts policies
CREATE POLICY "Users can view AI prompts in their organizations" ON ai_prompts
    FOR SELECT USING (user_has_org_permission(auth.uid(), organization_id, 'member'));

CREATE POLICY "Organization editors can manage AI prompts" ON ai_prompts
    FOR ALL USING (user_has_org_permission(auth.uid(), organization_id, 'editor'));

-- AI suggestions policies
CREATE POLICY "Users can view AI suggestions in their organizations" ON ai_suggestions
    FOR SELECT USING (
        user_id = auth.uid() OR 
        (organization_id IS NOT NULL AND user_has_org_permission(auth.uid(), organization_id, 'member'))
    );

CREATE POLICY "Users can insert AI suggestions for their organizations" ON ai_suggestions
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND 
        (organization_id IS NULL OR user_has_org_permission(auth.uid(), organization_id, 'member'))
    );

-- Publishing queue policies
CREATE POLICY "Users can view publishing queue in their organizations" ON publishing_queue
    FOR SELECT USING (user_has_org_permission(auth.uid(), organization_id, 'member'));

CREATE POLICY "Users can manage publishing queue in their organizations" ON publishing_queue
    FOR ALL USING (user_has_org_permission(auth.uid(), organization_id, 'editor'));

-- Publishing logs policies
CREATE POLICY "Users can view publishing logs in their organizations" ON publishing_logs
    FOR SELECT USING (user_has_org_permission(auth.uid(), organization_id, 'member'));

-- ==========================================
-- 11. UPDATE EXISTING RLS POLICIES FOR ORGANIZATION SUPPORT
-- ==========================================

-- Update existing table policies to consider organization membership
-- (This would be a separate script in production to avoid conflicts)

-- ==========================================
-- 12. GRANT PERMISSIONS
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