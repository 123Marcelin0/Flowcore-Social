-- User Strategy Profile Enhancement
-- Add fields to store user's marketing strategy information

-- Add columns to existing user_preferences table for strategy information
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS target_audience_age TEXT DEFAULT NULL;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS target_audience_type TEXT DEFAULT NULL; -- 'erstkaufer', 'familien', 'investoren'
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS active_region TEXT DEFAULT NULL;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS price_range TEXT DEFAULT NULL; -- 'budget', 'mittelklasse', 'luxus'
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS lead_platform TEXT DEFAULT NULL; -- which platform brings most leads
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS weekly_content_hours INTEGER DEFAULT NULL; -- hours per week for content creation
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS unique_selling_points TEXT[] DEFAULT '{}';
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS special_services TEXT[] DEFAULT '{}';
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS brand_positioning TEXT DEFAULT NULL; -- 'expert' or 'approachable_advisor'
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS marketing_goals JSONB DEFAULT '{}';
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS strategy_preferences JSONB DEFAULT '{}';

-- Create an index for better performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_target_audience ON user_preferences(target_audience_type);
CREATE INDEX IF NOT EXISTS idx_user_preferences_active_region ON user_preferences(active_region);
CREATE INDEX IF NOT EXISTS idx_user_preferences_brand_positioning ON user_preferences(brand_positioning);

-- Create a function to get complete user strategy profile
CREATE OR REPLACE FUNCTION get_user_strategy_profile(user_uuid UUID)
RETURNS TABLE(
    user_id UUID,
    -- Basic info
    preferred_platforms TEXT[],
    content_focus TEXT,
    target_audience TEXT,
    posting_frequency TEXT,
    preferred_content_types TEXT[],
    
    -- Strategy-specific info
    target_audience_age TEXT,
    target_audience_type TEXT,
    active_region TEXT,
    price_range TEXT,
    lead_platform TEXT,
    weekly_content_hours INTEGER,
    unique_selling_points TEXT[],
    special_services TEXT[],
    brand_positioning TEXT,
    marketing_goals JSONB,
    strategy_preferences JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.user_id,
        up.preferred_platforms,
        up.content_focus,
        up.target_audience,
        up.posting_frequency,
        up.preferred_content_types,
        up.target_audience_age,
        up.target_audience_type,
        up.active_region,
        up.price_range,
        up.lead_platform,
        up.weekly_content_hours,
        up.unique_selling_points,
        up.special_services,
        up.brand_positioning,
        up.marketing_goals,
        up.strategy_preferences
    FROM user_preferences up
    WHERE up.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to update user strategy profile
CREATE OR REPLACE FUNCTION update_user_strategy_profile(
    user_uuid UUID,
    p_target_audience_age TEXT DEFAULT NULL,
    p_target_audience_type TEXT DEFAULT NULL,
    p_active_region TEXT DEFAULT NULL,
    p_price_range TEXT DEFAULT NULL,
    p_lead_platform TEXT DEFAULT NULL,
    p_weekly_content_hours INTEGER DEFAULT NULL,
    p_unique_selling_points TEXT[] DEFAULT NULL,
    p_special_services TEXT[] DEFAULT NULL,
    p_brand_positioning TEXT DEFAULT NULL,
    p_marketing_goals JSONB DEFAULT NULL,
    p_strategy_preferences JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE user_preferences SET
        target_audience_age = COALESCE(p_target_audience_age, target_audience_age),
        target_audience_type = COALESCE(p_target_audience_type, target_audience_type),
        active_region = COALESCE(p_active_region, active_region),
        price_range = COALESCE(p_price_range, price_range),
        lead_platform = COALESCE(p_lead_platform, lead_platform),
        weekly_content_hours = COALESCE(p_weekly_content_hours, weekly_content_hours),
        unique_selling_points = COALESCE(p_unique_selling_points, unique_selling_points),
        special_services = COALESCE(p_special_services, special_services),
        brand_positioning = COALESCE(p_brand_positioning, brand_positioning),
        marketing_goals = COALESCE(p_marketing_goals, marketing_goals),
        strategy_preferences = COALESCE(p_strategy_preferences, strategy_preferences),
        updated_at = NOW()
    WHERE user_id = user_uuid;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Sample data insertion for testing (optional)
-- INSERT INTO user_preferences (user_id, target_audience_age, target_audience_type, active_region, price_range, lead_platform, weekly_content_hours, brand_positioning)
-- VALUES ('your-test-user-id', '25-35', 'erstkaufer', 'München', 'mittelklasse', 'instagram', 5, 'expert')
-- ON CONFLICT (user_id) DO UPDATE SET
--     target_audience_age = EXCLUDED.target_audience_age,
--     target_audience_type = EXCLUDED.target_audience_type,
--     active_region = EXCLUDED.active_region,
--     price_range = EXCLUDED.price_range,
--     lead_platform = EXCLUDED.lead_platform,
--     weekly_content_hours = EXCLUDED.weekly_content_hours,
--     brand_positioning = EXCLUDED.brand_positioning; 