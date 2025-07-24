#!/usr/bin/env node
// Direct Supabase Connection Test

// Fix for Node.js fetch SSL issues
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

require('dotenv').config({ path: '.env.local' });

async function testDirectSupabase() {
  console.log('🔧 DIRECT SUPABASE CONNECTION TEST');
  console.log('===================================\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('URL:', supabaseUrl);
  console.log('Key exists:', !!supabaseKey);
  console.log('');

  // Test 1: Simple fetch test
  console.log('📋 Test 1: Basic HTTP Test');
  console.log('──────────────────────────');
  
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Status:', response.status);
    console.log('OK:', response.ok);
    
    if (response.ok) {
      console.log('✅ Basic HTTP connection works');
    } else {
      console.log('❌ HTTP Error:', response.status, response.statusText);
      const text = await response.text();
      console.log('Response:', text.substring(0, 200));
    }
  } catch (error) {
    console.log('❌ Fetch failed:', error.message);
    
    if (error.message.includes('certificate')) {
      console.log('💡 SSL Certificate issue detected');
      console.log('💡 This is common in development environments');
    }
    
    if (error.message.includes('UNABLE_TO_VERIFY_LEAF_SIGNATURE')) {
      console.log('💡 Try: export NODE_TLS_REJECT_UNAUTHORIZED=0');
    }
  }

  console.log('\n📋 Test 2: Supabase Client Test');
  console.log('─────────────────────────────────');
  
  try {
    // Import Supabase after disabling SSL verification
    const { createClient } = require('@supabase/supabase-js');
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false
      }
    });
    
    // Test simple query
    const { data, error } = await supabase
      .from('user_profiles')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log('❌ Supabase query failed:', error.message);
      
      if (error.message.includes('does not exist')) {
        console.log('💡 Database table missing - run schema setup');
      }
    } else {
      console.log('✅ Supabase connection works!');
      console.log('Data:', data);
    }
    
  } catch (error) {
    console.log('❌ Supabase client failed:', error.message);
  }

  console.log('\n🎯 SOLUTIONS:');
  console.log('1. SSL Issue: Set NODE_TLS_REJECT_UNAUTHORIZED=0 in .env');
  console.log('2. Network Issue: Check Windows Firewall');
  console.log('3. Database Issue: Run database setup scripts');
  console.log('4. Try restarting the development server');
}

testDirectSupabase().catch(console.error); 