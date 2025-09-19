-- PostgreSQL function for atomically fetching and claiming the next job
-- Run this in your Supabase SQL Editor after creating the jobs table

CREATE OR REPLACE FUNCTION fetch_next_job()
RETURNS SETOF jobs AS $$
DECLARE
    job_record jobs%ROWTYPE;
BEGIN
    -- Use FOR UPDATE SKIP LOCKED for atomic job claiming
    SELECT * INTO job_record
    FROM jobs
    WHERE status = 'pending' 
    AND run_at <= NOW()
    ORDER BY priority DESC, run_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;
    
    -- If we found a job, update it to in_progress
    IF FOUND THEN
        UPDATE jobs 
        SET 
            status = 'in_progress',
            started_at = NOW(),
            attempts = attempts + 1,
            updated_at = NOW()
        WHERE id = job_record.id;
        
        -- Return the updated job
        SELECT * INTO job_record FROM jobs WHERE id = job_record.id;
        RETURN NEXT job_record;
    END IF;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;