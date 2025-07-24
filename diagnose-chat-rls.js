#!/usr/bin/env node
// Diagnose Chat RLS Policy Issue

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function diagnoseRLSIssue() {
  console.log('🔍 DIAGNOSING CHAT RLS POLICY ISSUE');
  console.log('=====================================\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Test 1: Check chat_messages table structure
    console.log('📋 Test 1: Table Structure');
    console.log('──────────────────────────');
    
    const { data: columns, error: colError } = await supabase
      .rpc('exec_sql', { 
        sql: `SELECT column_name, data_type, column_default, is_nullable
              FROM information_schema.columns
              WHERE table_name = 'chat_messages'
              ORDER BY ordinal_position;`
      });
    
    if (colError) {
      console.log('❌ Cannot check table structure:', colError.message);
    } else {
      console.log('✅ chat_messages structure:');
      console.table(columns);
    }

    // Test 2: Check current RLS policies
    console.log('\n📋 Test 2: Current RLS Policies');
    console.log('───────────────────────────────');
    
    const { data: policies, error: polError } = await supabase
      .rpc('exec_sql', {
        sql: `SELECT policyname, cmd, qual, with_check
              FROM pg_policies 
              WHERE tablename = 'chat_messages';`
      });
    
    if (polError) {
      console.log('❌ Cannot check policies:', polError.message);
    } else {
      console.log('✅ Current RLS policies:');
      console.table(policies);
    }

    // Test 3: Check user authentication
    console.log('\n📋 Test 3: User Authentication');
    console.log('──────────────────────────────');
    
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.log('❌ Cannot list users:', userError.message);
    } else {
      console.log(`✅ Found ${users.users.length} users`);
      if (users.users.length > 0) {
        const firstUser = users.users[0];
        console.log(`First user ID: ${firstUser.id}`);
        console.log(`First user email: ${firstUser.email}`);
      }
    }

    // Test 4: Try direct insert with service role
    console.log('\n📋 Test 4: Direct Insert Test');
    console.log('─────────────────────────────');
    
    if (users.users.length > 0) {
      const testUserId = users.users[0].id;
      
      const { data: insertTest, error: insertError } = await supabase
        .from('chat_messages')
        .insert([{
          user_id: testUserId,
          conversation_id: '550e8400-e29b-41d4-a716-446655440000',
          role: 'user',
          content: 'RLS Test Message'
        }])
        .select();
      
      if (insertError) {
        console.log('❌ Direct insert failed:', insertError.message);
        console.log('Code:', insertError.code);
        
        if (insertError.code === '42501') {
          console.log('🔍 This confirms RLS policy is blocking the insert');
        }
      } else {
        console.log('✅ Direct insert successful:', insertTest);
      }
    }

  } catch (error) {
    console.log('❌ Diagnosis failed:', error.message);
  }

  console.log('\n🎯 SOLUTION STEPS:');
  console.log('1. Go to your Supabase dashboard');
  console.log('2. Open SQL Editor');
  console.log('3. Run the file: fix-chat-rls-policy.sql');
  console.log('4. Restart your development server');
  console.log('5. Test chat again');
  console.log('');
  console.log('🔧 The RLS policies are too restrictive and need to be updated.');
}

diagnoseRLSIssue().catch(console.error); 