#!/usr/bin/env tsx
import { config } from 'dotenv'
import path from 'path'

// Load environment variables from the project root
config({ path: path.resolve(process.cwd(), '.env') })
config({ path: path.resolve(process.cwd(), '.env.local') })

import { supabaseAdmin } from '../lib/supabase'

async function verifyConnection() {
  console.log('🔍 Verifying Supabase Connection...')
  console.log('📁 Working directory:', process.cwd())
  
  // Check environment variables
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  console.log('📋 Environment Variables:')
  console.log('  URL:', url ? `${url.substring(0, 50)}...` : 'MISSING')
  console.log('  Service Key:', serviceKey ? `${serviceKey.substring(0, 20)}...` : 'MISSING')
  console.log('  Full URL check:', url === 'your-project-id.supabase.co' ? 'PLACEHOLDER DETECTED' : 'Real value detected')
  
  if (!url || !serviceKey) {
    console.error('❌ Missing environment variables!')
    process.exit(1)
  }
  
  if (!supabaseAdmin) {
    console.error('❌ supabaseAdmin is null!')
    process.exit(1)
  }
  
  try {
    console.log('🧪 Testing database connection...')
    
    // Simple test - try to query system tables
    const { data, error } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(5)
    
    if (error) {
      console.error('❌ Database query failed:', error)
      process.exit(1)
    }
    
    console.log('✅ Database connection successful!')
    console.log('📊 Found tables:', data?.map(t => t.table_name) || [])
    
    // Check if jobs table exists
    const { data: jobsTable, error: jobsError } = await supabaseAdmin
      .from('jobs')
      .select('id')
      .limit(1)
    
    if (jobsError) {
      if (jobsError.code === '42P01') {
        console.log('⚠️  Jobs table does not exist yet')
        console.log('📋 Please run the SQL setup in your Supabase dashboard:')
        console.log('   SUPABASE_JOB_QUEUE_SETUP.sql')
      } else {
        console.error('❌ Jobs table query failed:', jobsError)
      }
    } else {
      console.log('✅ Jobs table exists and is accessible!')
    }
    
  } catch (error) {
    console.error('❌ Connection test failed:', error)
    process.exit(1)
  }
}

verifyConnection().catch(console.error)