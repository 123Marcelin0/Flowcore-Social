-- Insert sample data into instagramreelsscraper table
-- Make sure to run this in your Supabase SQL editor

-- First, let's check if the table exists and is empty
SELECT COUNT(*) FROM instagramreelsscraper;

-- Insert sample data
INSERT INTO instagramreelsscraper (
    reel_url,
    thumbnail_url,
    profile_picture,
    profile_picture_url,
    creator_username,
    creator_display_name,
    title,
    description,
    script,
    engagement_count,
    likes_count,
    hashtags
) VALUES 
(
    'https://instagram.com/reel/sample1',
    'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&h=800&fit=crop',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
    'realestate_pro',
    'Real Estate Pro',
    'Modern Home Tour',
    'This $2M home has a SECRET room that will blow your mind!',
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

🎯 CTA: "DM me for private showing!"

#realestate #luxuryhomes #hometour #dreamhome #property',
    2500000,
    125000,
    ARRAY['realestate', 'luxuryhomes', 'hometour', 'dreamhome', 'property']
),
(
    'https://instagram.com/reel/sample2',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&h=800&fit=crop',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
    'home_advisor',
    'Home Advisor',
    'First-Time Buyer Tips',
    'Avoid these 5 costly mistakes when buying your first home',
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

🎯 CTA: "Save this post & share with someone buying their first home!"

#firsttimehomebuyer #realestatetips #homebuying #mortgage #property',
    1800000,
    90000,
    ARRAY['firsttimehomebuyer', 'realestatetips', 'homebuying', 'mortgage', 'property']
),
(
    'https://instagram.com/reel/sample3',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&h=800&fit=crop',
    'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face',
    'market_insights',
    'Market Insights',
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

🎯 CTA: "Ready to make your move? Link in bio!"

#marketupdate #realestate #interestrates #homebuying #investment',
    3200000,
    160000,
    ARRAY['marketupdate', 'realestate', 'interestrates', 'homebuying', 'investment']
);

-- Verify the data was inserted
SELECT id, title, description, reel_url FROM instagramreelsscraper ORDER BY created_at DESC;