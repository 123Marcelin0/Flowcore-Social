#!/usr/bin/env node
// Test User ID Mismatch Issue

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testUserIDMismatch() {
  console.log('🔍 TESTING USER ID MISMATCH');
  console.log('============================\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // Step 1: Get a test user
    console.log('📋 Step 1: Get Test User');
    console.log('────────────────────────');
    
    const { data: users, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (userError || users.users.length === 0) {
      console.log('❌ No users found for testing');
      return;
    }
    
    const testUser = users.users[0];
    console.log(`✅ Test user: ${testUser.email}`);
    console.log(`✅ Auth user ID: ${testUser.id}`);

    // Step 2: Check user_profiles table
    console.log('\n📋 Step 2: Check user_profiles');
    console.log('─────────────────────────────');
    
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email, full_name')
      .eq('id', testUser.id);
    
    if (profileError) {
      console.log('❌ Profile lookup failed:', profileError.message);
    } else if (profiles.length === 0) {
      console.log('❌ No user_profile found for auth user!');
      console.log('🔧 This might be the problem - missing user_profile entry');
    } else {
      console.log('✅ Found user_profile:', profiles[0]);
    }

    // Step 3: Generate a session token for this user
    console.log('\n📋 Step 3: Generate Session Token');
    console.log('─────────────────────────────────');
    
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: testUser.email
    });
    
    if (sessionError) {
      console.log('❌ Cannot generate session:', sessionError.message);
      return;
    }
    
    console.log('✅ Session generation successful');

    // Step 4: Test what happens when we verify auth
    console.log('\n📋 Step 4: Test Auth Verification');
    console.log('─────────────────────────────────');
    
    // Simulate the verifyAuth function from the API
    const testAuthHeader = `Bearer ${sessionData.access_token}`;
    
    const { data: { user: verifiedUser }, error: verifyError } = await supabaseClient.auth.getUser(
      sessionData.access_token
    );
    
    if (verifyError) {
      console.log('❌ Auth verification failed:', verifyError.message);
    } else {
      console.log('✅ Auth verification successful');
      console.log(`✅ Verified user ID: ${verifiedUser.id}`);
      console.log(`✅ IDs match: ${verifiedUser.id === testUser.id}`);
    }

    // Step 5: Test insert with verified user ID
    console.log('\n📋 Step 5: Test Chat Message Insert');
    console.log('──────────────────────────────────');
    
    if (verifiedUser) {
      // Test with admin client (should work)
      const { data: adminInsert, error: adminError } = await supabaseAdmin
        .from('chat_messages')
        .insert([{
          user_id: verifiedUser.id,
          conversation_id: 'test-conversation-123',
          role: 'user',
          content: 'Test message from ID verification'
        }])
        .select();
      
      if (adminError) {
        console.log('❌ Admin insert failed:', adminError.message);
      } else {
        console.log('✅ Admin insert successful');
      }

      // Test with user client (might fail due to RLS)
      const { data: { session }, error: sessionSetError } = await supabaseClient.auth.setSession({
        access_token: sessionData.access_token,
        refresh_token: sessionData.refresh_token
      });
      
      if (sessionSetError) {
        console.log('❌ Cannot set session:', sessionSetError.message);
      } else {
        const { data: userInsert, error: userError } = await supabaseClient
          .from('chat_messages')
          .insert([{
            user_id: verifiedUser.id,
            conversation_id: 'test-conversation-456',
            role: 'user',
            content: 'Test message from user client'
          }])
          .select();
        
        if (userError) {
          console.log('❌ User client insert failed:', userError.message);
          console.log('🔍 Error code:', userError.code);
          
          if (userError.code === '42501') {
            console.log('🔧 RLS policy is blocking user inserts!');
          }
        } else {
          console.log('✅ User client insert successful');
        }
      }
    }

  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }

  console.log('\n🎯 NEXT STEPS:');
  console.log('If RLS policy blocks user inserts:');
  console.log('1. Run fix-chat-rls-policy.sql in Supabase SQL Editor');
  console.log('2. The policy needs to allow authenticated users to insert their own messages');
}

testUserIDMismatch().catch(console.error); 