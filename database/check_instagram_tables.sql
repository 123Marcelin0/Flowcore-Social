-- Diagnostic: Check Instagram Tables Structure
SELECT 'Instagram Tables Structure Check' as info;

-- Check what Instagram-related tables exist
SELECT 
    table_name,
    'Table exists' as status
FROM information_schema.tables 
WHERE table_name LIKE '%instagram%' OR table_name LIKE '%reel%'
ORDER BY table_name;

-- Check columns in instagramreelsscraper (double s)
SELECT 
    'instagramreelsscraper columns' as table_info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'instagramreelsscraper'
ORDER BY ordinal_position;

-- Check columns in instagramreelscraper (single s) 
SELECT 
    'instagramreelscraper columns' as table_info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'instagramreelscraper'
ORDER BY ordinal_position;

-- Check a sample row to see the data
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'instagramreelsscraper') THEN
        RAISE NOTICE 'Sample data from instagramreelsscraper:';
        -- Show first row structure
        PERFORM 1; -- Placeholder since we can't do dynamic SELECT in RAISE NOTICE
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'instagramreelscraper') THEN
        RAISE NOTICE 'Sample data from instagramreelscraper:';
        -- Show first row structure  
        PERFORM 1; -- Placeholder since we can't do dynamic SELECT in RAISE NOTICE
    END IF;
END $$; 