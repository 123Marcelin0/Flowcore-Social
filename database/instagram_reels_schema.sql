-- Instagram Reels Scraper Table
CREATE TABLE IF NOT EXISTS instagramreelsscraper (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reel_url TEXT NOT NULL,
    thumbnail_url TEXT,
    profile_picture TEXT,
    profile_picture_url TEXT,
    creator_username TEXT,
    creator_display_name TEXT,
    title TEXT,
    caption TEXT,
    description TEXT,
    script TEXT,
    engagement_count INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    hashtags TEXT[],
    music_info JSONB,
    scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE instagramreelsscraper ENABLE ROW LEVEL SECURITY;

-- Allow all users to read Instagram reels data (public content)
CREATE POLICY "Allow public read access to Instagram reels" ON instagramreelsscraper
    FOR SELECT USING (true);

-- Only allow authenticated users to insert/update (for admin purposes)
CREATE POLICY "Allow authenticated users to manage Instagram reels" ON instagramreelsscraper
    FOR ALL USING (auth.role() = 'authenticated');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_instagramreels_scraped_at ON instagramreelsscraper(scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_instagramreels_engagement ON instagramreelsscraper(engagement_count DESC);
CREATE INDEX IF NOT EXISTS idx_instagramreels_creator ON instagramreelsscraper(creator_username);

-- Insert some sample data for testing
INSERT INTO instagramreelsscraper (
    reel_url,
    thumbnail_url,
    profile_picture,
    profile_picture_url,
    creator_username,
    creator_display_name,
    title,
    caption,
    description,
    script,
    engagement_count,
    likes_count,
    hashtags
) VALUES 
(
    'https://instagram.com/reel/example1',
    'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
    'realestate_pro',
    'Real Estate Pro',
    'Modern Home Tour',
    'Modern Home Tour',
    'Walking tour of a neighborhood while highlighting key features',
    '🏠 HOOK (0-3s): "This $2M home has a SECRET room..."

📱 MAIN CONTENT (3-15s):
• Quick walkthrough of main living areas
• Highlight unique architectural features
• Show the "secret" home office behind bookshelf
• Mention key selling points (location, size, amenities)

💡 VISUAL TIPS:
• Use smooth camera movements
• Good lighting - shoot during golden hour
• Quick cuts between rooms (2-3 seconds each)
• End with exterior shot

🎯 CTA: "DM me for private showing!"',
    2500000,
    125000,
    ARRAY['realestate', 'luxuryhomes', 'hometour', 'dreamhome', 'property']
),
(
    'https://instagram.com/reel/example2',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
    'home_advisor',
    'Home Advisor',
    'First-Time Buyer Tips',
    'First-Time Buyer Tips',
    '30-second property assessment with key value indicators',
    '💰 HOOK (0-3s): "Buying your first home? Avoid these 5 mistakes!"

📋 MAIN CONTENT (3-20s):
1. Not getting pre-approved first
2. Skipping the home inspection
3. Forgetting about closing costs
4. Falling in love with the first house
5. Not researching the neighborhood

💡 VISUAL TIPS:
• Use text overlays for each point
• Show examples with B-roll footage
• Keep energy high with upbeat music
• Use hand gestures to emphasize points

🎯 CTA: "Save this post & share with someone buying their first home!"',
    1800000,
    90000,
    ARRAY['firsttimehomebuyer', 'realestatetips', 'homebuying', 'mortgage', 'property']
),
(
    'https://instagram.com/reel/example3',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face',
    'market_insights',
    'Market Insights',
    'Market Update 2024',
    'Market Update 2024',
    'The housing market just shifted - here''s what it means for you',
    '📊 HOOK (0-3s): "The housing market just shifted - here''s what it means for you"

📈 MAIN CONTENT (3-18s):
• Interest rates dropped 0.5% this month
• Inventory increased 15% in major cities
• Best time to buy in 2 years
• Sellers are more negotiable now
• Show local market statistics

💡 VISUAL TIPS:
• Use charts and graphs as overlays
• Split screen with before/after data
• Professional background (office/city view)
• Confident, authoritative delivery

🎯 CTA: "Ready to make your move? Link in bio!"',
    3200000,
    160000,
    ARRAY['marketupdate', 'realestate', 'interestrates', 'homebuying', 'investment']
),
(
    'https://instagram.com/reel/example4',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face',
    'staging_expert',
    'Staging Expert',
    'Staging Secrets',
    'Staging Secrets',
    'This simple staging trick sold this house in 3 days!',
    '✨ HOOK (0-3s): "This simple staging trick sold this house in 3 days!"

🏡 MAIN CONTENT (3-16s):
• Before: cluttered, personal items everywhere
• After: clean, neutral, spacious feeling
• Key changes: declutter, depersonalize, add plants
• Show the transformation room by room
• Mention the quick sale result

💡 VISUAL TIPS:
• Split screen before/after shots
• Time-lapse of staging process
• Bright, natural lighting
• Smooth transitions between rooms

🎯 CTA: "Need staging help? DM me!"',
    1500000,
    75000,
    ARRAY['homestaging', 'realestate', 'sellfast', 'homedesign', 'property']
);