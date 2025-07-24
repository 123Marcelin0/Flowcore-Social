#!/usr/bin/env node
// Create User Profile for Chat System

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function createUserProfiles() {
  console.log('🔧 CREATING USER PROFILES FOR CHAT SYSTEM');
  console.log('==========================================\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Step 1: Get all auth users
    console.log('📋 Step 1: Get Auth Users');
    console.log('────────────────────────');
    
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.log('❌ Cannot list users:', userError.message);
      return;
    }
    
    console.log(`✅ Found ${users.users.length} auth users`);

    // Step 2: Check existing user_profiles
    console.log('\n📋 Step 2: Check Existing Profiles');
    console.log('─────────────────────────────────');
    
    const { data: existingProfiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, email');
    
    if (profileError) {
      console.log('❌ Cannot check profiles:', profileError.message);
      return;
    }
    
    console.log(`✅ Found ${existingProfiles.length} existing profiles`);
    
    const existingProfileIds = existingProfiles.map(p => p.id);

    // Step 3: Create missing profiles
    console.log('\n📋 Step 3: Create Missing Profiles');
    console.log('─────────────────────────────────');
    
    const profilesToCreate = users.users.filter(user => 
      !existingProfileIds.includes(user.id)
    );
    
    if (profilesToCreate.length === 0) {
      console.log('✅ All users already have profiles!');
      return;
    }
    
    console.log(`🔄 Creating ${profilesToCreate.length} missing profiles...`);
    
    for (const user of profilesToCreate) {
      const profileData = {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        avatar_url: user.user_metadata?.avatar_url || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { error: insertError } = await supabase
        .from('user_profiles')
        .insert([profileData]);
      
      if (insertError) {
        console.log(`❌ Failed to create profile for ${user.email}:`, insertError.message);
      } else {
        console.log(`✅ Created profile for ${user.email}`);
      }
    }

    // Step 4: Verify all profiles exist
    console.log('\n📋 Step 4: Verify Profiles');
    console.log('─────────────────────────');
    
    const { data: finalProfiles, error: finalError } = await supabase
      .from('user_profiles')
      .select('id, email, full_name');
    
    if (finalError) {
      console.log('❌ Cannot verify profiles:', finalError.message);
    } else {
      console.log(`✅ Total profiles now: ${finalProfiles.length}`);
      finalProfiles.forEach(profile => {
        console.log(`   - ${profile.email} (${profile.full_name})`);
      });
    }

  } catch (error) {
    console.log('❌ Script failed:', error.message);
  }

  console.log('\n🎯 NEXT STEPS:');
  console.log('1. Restart your development server: pnpm run dev');
  console.log('2. Login to the dashboard');
  console.log('3. Test the chat functionality');
  console.log('4. The RLS and schema errors should now be resolved');
}

createUserProfiles().catch(console.error); 