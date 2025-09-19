-- Quick fix for jobs table UUID issue (without dropping table)
-- Run this in your Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Check current id column setup
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name = 'jobs' AND column_name = 'id';

-- Fix the id column to have proper UUID default
ALTER TABLE jobs ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- If the column doesn't exist or has wrong type, recreate it
-- First check if we need to recreate the column
DO $$
BEGIN
    -- Check if id column exists and is UUID type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'jobs' 
        AND column_name = 'id' 
        AND data_type = 'uuid'
    ) THEN
        -- Drop and recreate id column if it exists with wrong type
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'jobs' AND column_name = 'id'
        ) THEN
            ALTER TABLE jobs DROP COLUMN id;
        END IF;
        
        -- Add id column with proper UUID setup
        ALTER TABLE jobs ADD COLUMN id UUID PRIMARY KEY DEFAULT gen_random_uuid();
    END IF;
END $$;

-- Test UUID generation
INSERT INTO jobs (type, payload) VALUES ('test_uuid', '{"test": true}');
SELECT id, type, created_at FROM jobs WHERE type = 'test_uuid';
DELETE FROM jobs WHERE type = 'test_uuid';

-- Verify the fix worked
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name = 'jobs' AND column_name = 'id';