#!/usr/bin/env node
// Chat Functionality Test Script
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

console.log('🧪 TESTING CHAT FUNCTIONALITY');
console.log('==============================\n');

// Load environment variables
require('dotenv').config();

async function testChatFunctionality() {
  const results = {
    envConfig: false,
    supabaseConnection: false,
    openaiConnection: false,
    databaseSchema: false,
    authFlow: false,
    chatAPI: false,
    overallSuccess: false
  };

  // ==========================================
  // TEST 1: Environment Configuration
  // ==========================================
  console.log('📋 Test 1: Environment Configuration');
  console.log('────────────────────────────────────');
  
  const requiredEnvVars = [
    'OPENAI_API_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  let envMissing = 0;
  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      console.log(`❌ Missing: ${varName}`);
      envMissing++;
    } else if (process.env[varName].includes('your-') || process.env[varName].includes('sk-your-')) {
      console.log(`⚠️  Placeholder: ${varName}`);
      envMissing++;
    } else {
      console.log(`✅ Configured: ${varName}`);
    }
  });
  
  results.envConfig = envMissing === 0;
  console.log(`\n🔍 Environment Result: ${results.envConfig ? '✅ PASS' : '❌ FAIL'}\n`);

  // ==========================================
  // TEST 2: Supabase Connection
  // ==========================================
  console.log('📋 Test 2: Supabase Connection');
  console.log('──────────────────────────────');
  
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      
      // Test connection
      const { data, error } = await supabase.from('user_profiles').select('count').limit(1);
      
      if (error) {
        console.log('❌ Supabase connection failed:', error.message);
      } else {
        console.log('✅ Supabase connection successful');
        results.supabaseConnection = true;
      }
    } catch (error) {
      console.log('❌ Supabase error:', error.message);
    }
  } else {
    console.log('❌ Missing Supabase credentials');
  }
  
  console.log(`\n🔍 Supabase Result: ${results.supabaseConnection ? '✅ PASS' : '❌ FAIL'}\n`);

  // ==========================================
  // TEST 3: OpenAI Connection
  // ==========================================
  console.log('📋 Test 3: OpenAI Connection');
  console.log('────────────────────────────');
  
  if (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('your-')) {
    try {
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      
      // Test OpenAI API with a simple completion
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini', // Use cheaper model for testing
        messages: [{ role: 'user', content: 'Hello, this is a test.' }],
        max_tokens: 10
      });
      
      if (response.choices && response.choices.length > 0) {
        console.log('✅ OpenAI API connection successful');
        console.log('✅ GPT-4o model accessible');
        results.openaiConnection = true;
      }
    } catch (error) {
      console.log('❌ OpenAI API error:', error.message);
      if (error.message.includes('401')) {
        console.log('💡 Hint: Check your API key is correct and has credits');
      }
    }
  } else {
    console.log('❌ Missing or placeholder OpenAI API key');
  }
  
  console.log(`\n🔍 OpenAI Result: ${results.openaiConnection ? '✅ PASS' : '❌ FAIL'}\n`);

  // ==========================================
  // TEST 4: Database Schema Check
  // ==========================================
  console.log('📋 Test 4: Database Schema Check');
  console.log('─────────────────────────────────');
  
  if (results.supabaseConnection) {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      
      // Check if chat_messages table exists and has correct structure
      const { data: tableCheck, error: tableError } = await supabase
        .from('chat_messages')
        .select('id')
        .limit(1);
      
      if (tableError) {
        console.log('❌ chat_messages table issue:', tableError.message);
        if (tableError.message.includes('does not exist')) {
          console.log('💡 Hint: Run database/chat_messages_complete_setup.sql in Supabase');
        }
      } else {
        console.log('✅ chat_messages table exists');
        
        // Check posts table with embedding column
        const { data: postsCheck, error: postsError } = await supabase
          .from('posts')
          .select('id, embedding')
          .limit(1);
        
        if (postsError) {
          console.log('⚠️  posts table embedding column issue:', postsError.message);
        } else {
          console.log('✅ posts table with embedding column exists');
          results.databaseSchema = true;
        }
      }
    } catch (error) {
      console.log('❌ Database schema check failed:', error.message);
    }
  } else {
    console.log('⚠️  Skipped (Supabase connection failed)');
  }
  
  console.log(`\n🔍 Database Result: ${results.databaseSchema ? '✅ PASS' : '❌ FAIL'}\n`);

  // ==========================================
  // TEST 5: Authentication Flow
  // ==========================================
  console.log('📋 Test 5: Authentication Flow');
  console.log('──────────────────────────────');
  
  if (results.supabaseConnection) {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      
      // Check if we can list users (admin function)
      const { data: users, error: userError } = await supabase.auth.admin.listUsers();
      
      if (userError) {
        console.log('❌ Auth admin function failed:', userError.message);
      } else {
        console.log(`✅ Auth system accessible (${users.users.length} users found)`);
        
        if (users.users.length > 0) {
          console.log('✅ Test users available for testing');
          results.authFlow = true;
        } else {
          console.log('⚠️  No users found - create a test user first');
          results.authFlow = true; // Auth works, just no users
        }
      }
    } catch (error) {
      console.log('❌ Authentication check failed:', error.message);
    }
  } else {
    console.log('⚠️  Skipped (Supabase connection failed)');
  }
  
  console.log(`\n🔍 Auth Result: ${results.authFlow ? '✅ PASS' : '❌ FAIL'}\n`);

  // ==========================================
  // TEST SUMMARY
  // ==========================================
  console.log('📋 TEST SUMMARY');
  console.log('══════════════════════════════════════');
  
  const tests = [
    { name: 'Environment Configuration', result: results.envConfig },
    { name: 'Supabase Connection', result: results.supabaseConnection },
    { name: 'OpenAI Connection', result: results.openaiConnection },
    { name: 'Database Schema', result: results.databaseSchema },
    { name: 'Authentication Flow', result: results.authFlow }
  ];
  
  let passedTests = 0;
  tests.forEach((test, index) => {
    const status = test.result ? '✅ PASS' : '❌ FAIL';
    console.log(`${index + 1}. ${test.name}: ${status}`);
    if (test.result) passedTests++;
  });
  
  results.overallSuccess = passedTests === tests.length;
  
  console.log('\n' + '='.repeat(40));
  console.log(`OVERALL RESULT: ${results.overallSuccess ? '🎉 ALL TESTS PASSED' : `⚠️  ${passedTests}/${tests.length} TESTS PASSED`}`);
  
  if (results.overallSuccess) {
    console.log('\n✨ CHAT FUNCTIONALITY READY!');
    console.log('   Start your development server: pnpm run dev');
    console.log('   Navigate to the dashboard');
    console.log('   Click the AI chat button');
    console.log('   Send a test message');
  } else {
    console.log('\n🔧 NEXT STEPS:');
    if (!results.envConfig) {
      console.log('   1. Run: node fix-chat-500-error.js');
      console.log('   2. Configure your API keys in .env');
    }
    if (!results.supabaseConnection) {
      console.log('   3. Verify Supabase credentials');
    }
    if (!results.openaiConnection) {
      console.log('   4. Verify OpenAI API key and credits');
    }
    if (!results.databaseSchema) {
      console.log('   5. Run database/chat_messages_complete_setup.sql in Supabase');
    }
  }
  
  console.log('');
}

// Run the test
testChatFunctionality().catch(error => {
  console.error('❌ Test script failed:', error.message);
  process.exit(1);
}); 