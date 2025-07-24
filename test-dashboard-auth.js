#!/usr/bin/env node
// Test Dashboard Authentication

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testDashboardAuth() {
  console.log('🔐 TESTING DASHBOARD AUTHENTICATION');
  console.log('=====================================\n');

  // Load environment from .env.local (which has the real keys)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log('📋 Environment Check:');
  console.log(`Supabase URL: ${supabaseUrl ? 'SET' : 'MISSING'}`);
  console.log(`Service Key: ${supabaseServiceKey ? 'SET' : 'MISSING'}`);
  console.log(`Anon Key: ${supabaseAnonKey ? 'SET' : 'MISSING'}`);
  console.log('');

  if (!supabaseUrl || !supabaseServiceKey) {
    console.log('❌ Missing Supabase configuration');
    return;
  }

  // Create Supabase clients
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // Test 1: Check if we can connect to Supabase
    console.log('📋 Test 1: Supabase Connection');
    console.log('─────────────────────────────');
    
    const { data: healthCheck, error: healthError } = await supabaseAdmin
      .from('user_profiles')
      .select('count')
      .limit(1);
    
    if (healthError) {
      console.log('❌ Supabase connection failed:', healthError.message);
      if (healthError.message.includes('relation "user_profiles" does not exist')) {
        console.log('💡 SOLUTION: Run database/schema.sql in your Supabase dashboard');
      }
      return;
    } else {
      console.log('✅ Supabase connection successful');
    }

    // Test 2: Check if users exist
    console.log('\n📋 Test 2: User Database');
    console.log('────────────────────────');
    
    const { data: users, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (userError) {
      console.log('❌ Cannot access users:', userError.message);
      return;
    }
    
    console.log(`✅ Found ${users.users.length} users in database`);
    
    if (users.users.length === 0) {
      console.log('⚠️  NO USERS FOUND - This explains the 401 error!');
      console.log('');
      console.log('🔧 SOLUTION:');
      console.log('1. Go to http://localhost:3001');
      console.log('2. Create an account / Login');
      console.log('3. Then test the chat');
      return;
    }

    // Test 3: Test auth with first user
    const firstUser = users.users[0];
    console.log(`\n📋 Test 3: Authentication Test`);
    console.log('─────────────────────────────');
    console.log(`Testing with user: ${firstUser.email}`);
    
    // Generate a session for testing
    const { data: session, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: firstUser.email
    });
    
    if (sessionError) {
      console.log('❌ Cannot generate test session:', sessionError.message);
    } else {
      console.log('✅ Can generate auth sessions');
    }

    // Test 4: Check chat_messages table
    console.log('\n📋 Test 4: Chat Messages Table');
    console.log('──────────────────────────────');
    
    const { data: chatCheck, error: chatError } = await supabaseAdmin
      .from('chat_messages')
      .select('count')
      .limit(1);
    
    if (chatError) {
      console.log('❌ chat_messages table issue:', chatError.message);
      if (chatError.message.includes('does not exist')) {
        console.log('💡 SOLUTION: Run database/chat_messages_complete_setup.sql');
      }
    } else {
      console.log('✅ chat_messages table exists and accessible');
    }

  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }

  console.log('\n🎯 SUMMARY:');
  console.log('If users exist but you get 401 errors:');
  console.log('1. Make sure you are LOGGED IN to the dashboard');
  console.log('2. Check browser console for auth errors');
  console.log('3. Try logging out and back in');
  console.log('');
  console.log('If no users exist:');
  console.log('1. Go to http://localhost:3001');
  console.log('2. Create an account');
  console.log('3. Login to the dashboard');
  console.log('4. Then test the chat');
}

testDashboardAuth().catch(console.error); 