-- Migration script to encrypt existing tokens and add token management features
-- This script should be run after the encryption service is deployed

-- Step 1: Add new columns for enhanced token management
ALTER TABLE social_accounts 
ADD COLUMN IF NOT EXISTS token_encryption_version VARCHAR(10) DEFAULT '1.0',
ADD COLUMN IF NOT EXISTS token_rotation_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS token_last_rotated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS token_scopes TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS token_metadata JSONB DEFAULT '{}';

-- Step 2: Create index for token rotation queries
CREATE INDEX IF NOT EXISTS idx_social_accounts_token_expiry 
ON social_accounts(token_expires_at) 
WHERE status = 'connected';

CREATE INDEX IF NOT EXISTS idx_social_accounts_token_rotation 
ON social_accounts(token_last_rotated, token_rotation_count) 
WHERE status = 'connected';

-- Step 3: Create a function to mark tokens for encryption
CREATE OR REPLACE FUNCTION mark_tokens_for_encryption()
RETURNS TABLE(
    account_id UUID,
    platform TEXT,
    username TEXT,
    needs_encryption BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sa.id,
        sa.platform,
        sa.username,
        CASE 
            WHEN sa.access_token IS NOT NULL 
                AND (sa.access_token NOT LIKE '{"encrypted":%' OR sa.access_token IS NULL)
            THEN true
            ELSE false
        END as needs_encryption
    FROM social_accounts sa
    WHERE sa.status = 'connected' 
        AND sa.access_token IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create a function to update token encryption status
CREATE OR REPLACE FUNCTION update_token_encryption_status(
    p_account_id UUID,
    p_encrypted_access_token TEXT,
    p_encrypted_refresh_token TEXT,
    p_token_metadata JSONB
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE social_accounts 
    SET 
        access_token = p_encrypted_access_token,
        refresh_token = p_encrypted_refresh_token,
        platform_metadata = COALESCE(platform_metadata, '{}'::jsonb) || p_token_metadata,
        token_encryption_version = '1.0',
        updated_at = NOW()
    WHERE id = p_account_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create a function to get tokens needing rotation
CREATE OR REPLACE FUNCTION get_tokens_needing_rotation(
    p_rotation_threshold_days INTEGER DEFAULT 7
)
RETURNS TABLE(
    account_id UUID,
    user_id UUID,
    platform TEXT,
    username TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    days_until_expiry INTEGER,
    last_rotated TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sa.id,
        sa.user_id,
        sa.platform,
        sa.username,
        sa.token_expires_at,
        EXTRACT(DAY FROM (sa.token_expires_at - NOW()))::INTEGER as days_until_expiry,
        sa.token_last_rotated
    FROM social_accounts sa
    WHERE sa.status = 'connected'
        AND sa.token_expires_at IS NOT NULL
        AND sa.token_expires_at > NOW()
        AND EXTRACT(DAY FROM (sa.token_expires_at - NOW())) <= p_rotation_threshold_days
    ORDER BY sa.token_expires_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create a function to update token rotation metadata
CREATE OR REPLACE FUNCTION update_token_rotation_metadata(
    p_account_id UUID,
    p_new_expires_at TIMESTAMP WITH TIME ZONE,
    p_rotation_reason TEXT DEFAULT 'scheduled'
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE social_accounts 
    SET 
        token_expires_at = p_new_expires_at,
        token_rotation_count = token_rotation_count + 1,
        token_last_rotated = NOW(),
        platform_metadata = COALESCE(platform_metadata, '{}'::jsonb) || 
            jsonb_build_object(
                'lastRotation', NOW()::text,
                'rotationReason', p_rotation_reason,
                'totalRotations', token_rotation_count + 1
            ),
        updated_at = NOW()
    WHERE id = p_account_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create a function to revoke tokens securely
CREATE OR REPLACE FUNCTION revoke_token_securely(
    p_account_id UUID,
    p_reason TEXT DEFAULT 'user_revoked'
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE social_accounts 
    SET 
        status = 'disconnected',
        access_token = NULL,
        refresh_token = NULL,
        token_expires_at = NULL,
        platform_metadata = COALESCE(platform_metadata, '{}'::jsonb) || 
            jsonb_build_object(
                'revokedAt', NOW()::text,
                'revocationReason', p_reason
            ),
        updated_at = NOW()
    WHERE id = p_account_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Create a view for token health monitoring
CREATE OR REPLACE VIEW token_health_monitoring AS
SELECT 
    sa.id as account_id,
    sa.user_id,
    sa.organization_id,
    sa.platform,
    sa.username,
    sa.status,
    sa.token_expires_at,
    sa.token_rotation_count,
    sa.token_last_rotated,
    sa.token_encryption_version,
    CASE 
        WHEN sa.status = 'connected' AND sa.token_expires_at > NOW() THEN 'healthy'
        WHEN sa.status = 'connected' AND sa.token_expires_at <= NOW() THEN 'expired'
        WHEN sa.status = 'connected' AND sa.token_expires_at IS NULL THEN 'unknown'
        ELSE 'disconnected'
    END as token_health_status,
    CASE 
        WHEN sa.token_expires_at IS NOT NULL THEN 
            EXTRACT(DAY FROM (sa.token_expires_at - NOW()))::INTEGER
        ELSE NULL
    END as days_until_expiry,
    CASE 
        WHEN sa.token_expires_at IS NOT NULL AND sa.token_expires_at > NOW() THEN
            EXTRACT(DAY FROM (sa.token_expires_at - NOW()))::INTEGER <= 7
        ELSE false
    END as needs_rotation_soon
FROM social_accounts sa
WHERE sa.access_token IS NOT NULL;

-- Step 9: Create RLS policies for token security
-- Ensure only users can access their own tokens
CREATE POLICY IF NOT EXISTS "Users can only access their own tokens"
ON social_accounts
FOR ALL
USING (auth.uid() = user_id);

-- Ensure only users can update their own tokens
CREATE POLICY IF NOT EXISTS "Users can only update their own tokens"
ON social_accounts
FOR UPDATE
USING (auth.uid() = user_id);

-- Step 10: Create audit trigger for token changes
CREATE OR REPLACE FUNCTION audit_token_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Log token access/updates (without sensitive data)
    INSERT INTO ai_context_logs (
        user_id,
        source_type,
        source_id,
        context_summary,
        metadata
    ) VALUES (
        COALESCE(NEW.user_id, OLD.user_id),
        'token_management',
        COALESCE(NEW.id, OLD.id),
        CASE 
            WHEN TG_OP = 'UPDATE' THEN 'Token updated'
            WHEN TG_OP = 'INSERT' THEN 'Token created'
            WHEN TG_OP = 'DELETE' THEN 'Token deleted'
        END,
        jsonb_build_object(
            'operation', TG_OP,
            'platform', COALESCE(NEW.platform, OLD.platform),
            'username', COALESCE(NEW.username, OLD.username),
            'status', COALESCE(NEW.status, OLD.status),
            'encryption_version', COALESCE(NEW.token_encryption_version, OLD.token_encryption_version),
            'rotation_count', COALESCE(NEW.token_rotation_count, OLD.token_rotation_count)
        )
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for token audit
DROP TRIGGER IF EXISTS trigger_audit_token_changes ON social_accounts;
CREATE TRIGGER trigger_audit_token_changes
    AFTER INSERT OR UPDATE OR DELETE ON social_accounts
    FOR EACH ROW EXECUTE FUNCTION audit_token_changes();

-- Step 11: Grant necessary permissions
GRANT EXECUTE ON FUNCTION mark_tokens_for_encryption() TO authenticated;
GRANT EXECUTE ON FUNCTION update_token_encryption_status(UUID, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_tokens_needing_rotation(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION update_token_rotation_metadata(UUID, TIMESTAMP WITH TIME ZONE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION revoke_token_securely(UUID, TEXT) TO authenticated;

GRANT SELECT ON token_health_monitoring TO authenticated;

-- Step 12: Create a comment documenting the encryption setup
COMMENT ON TABLE social_accounts IS 'Social media accounts with encrypted token storage. Access tokens and refresh tokens are encrypted using AES-256-GCM before storage.';
COMMENT ON COLUMN social_accounts.access_token IS 'JSON stringified EncryptedData containing the encrypted access token';
COMMENT ON COLUMN social_accounts.refresh_token IS 'JSON stringified EncryptedData containing the encrypted refresh token';
COMMENT ON COLUMN social_accounts.token_encryption_version IS 'Version of encryption algorithm used';
COMMENT ON COLUMN social_accounts.token_rotation_count IS 'Number of times this token has been rotated';
COMMENT ON COLUMN social_accounts.token_last_rotated IS 'Timestamp of last token rotation';
COMMENT ON COLUMN social_accounts.token_scopes IS 'Array of OAuth scopes granted to this token';
COMMENT ON COLUMN social_accounts.token_metadata IS 'Additional metadata about the token including encryption details';
