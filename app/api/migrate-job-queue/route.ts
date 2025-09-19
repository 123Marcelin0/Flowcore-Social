import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'

export async function POST(request: NextRequest) {
  try {
    // Create jobs table
    const { error: jobsTableError } = await supabaseAdmin
      .rpc('create_jobs_table_if_not_exists')
      .select()

    if (jobsTableError && !jobsTableError.message.includes('already exists')) {
      console.log('Creating jobs table manually...')
      
      // Manual table creation
      const createJobsTable = `
        CREATE TABLE IF NOT EXISTS jobs (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
          data JSONB NOT NULL DEFAULT '{}'::jsonb,
          result JSONB,
          error TEXT,
          progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
          attempts INTEGER NOT NULL DEFAULT 0,
          max_attempts INTEGER NOT NULL DEFAULT 3,
          upload_id TEXT,
          user_id TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          started_at TIMESTAMPTZ,
          completed_at TIMESTAMPTZ
        );
      `
      
      const { error } = await supabaseAdmin.rpc('exec_sql', { sql: createJobsTable })
      if (error) {
        throw new Error(`Failed to create jobs table: ${error.message}`)
      }
    }

    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);',
      'CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs(type);',
      'CREATE INDEX IF NOT EXISTS idx_jobs_upload_id ON jobs(upload_id);',
      'CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);',
      'CREATE INDEX IF NOT EXISTS idx_jobs_status_type ON jobs(status, type);',
      'CREATE INDEX IF NOT EXISTS idx_jobs_upload_type_status ON jobs(upload_id, type, status);'
    ]
    
    for (const indexSql of indexes) {
      await supabaseAdmin.rpc('exec_sql', { sql: indexSql })
    }

    // Create operation_locks table
    const createLocksTable = `
      CREATE TABLE IF NOT EXISTS operation_locks (
        id SERIAL PRIMARY KEY,
        operation_key TEXT UNIQUE NOT NULL,
        operation_type TEXT NOT NULL,
        resource_id TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('processing', 'completed', 'failed')),
        result_data JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL
      );
    `
    
    await supabaseAdmin.rpc('exec_sql', { sql: createLocksTable })
    
    // Create lock indexes
    const lockIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_operation_locks_key ON operation_locks(operation_key);',
      'CREATE INDEX IF NOT EXISTS idx_operation_locks_expires ON operation_locks(expires_at);'
    ]
    
    for (const indexSql of lockIndexes) {
      await supabaseAdmin.rpc('exec_sql', { sql: indexSql })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Job queue migration completed successfully' 
    })
  } catch (error: any) {
    console.error('Migration failed:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}