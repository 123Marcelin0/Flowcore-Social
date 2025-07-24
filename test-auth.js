// Quick authentication test
const { createClient } = require('@supabase/supabase-js');

async function testAuth() {
  console.log('🔍 Testing Supabase Authentication...\n');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
    console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'Set' : 'Missing');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Test 1: Check if we can connect to database
    console.log('1. Testing database connection...');
    const { data, error } = await supabase.from('user_profiles').select('count').limit(1);
    if (error) {
      console.error('❌ Database connection failed:', error.message);
      return;
    }
    console.log('✅ Database connection successful');

    // Test 2: List users
    console.log('\n2. Testing user listing...');
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) {
      console.error('❌ Failed to list users:', userError.message);
      return;
    }
    console.log(`✅ Found ${users.length} users`);

    if (users.length > 0) {
      const testUser = users[0];
      console.log(`📧 Test user: ${testUser.email}`);
      console.log(`🆔 User ID: ${testUser.id}`);
      
      // Test 3: Check if user profile exists
      console.log('\n3. Testing user profile...');
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', testUser.id)
        .single();
      
      if (profileError) {
        console.error('❌ User profile not found:', profileError.message);
        console.log('💡 This might be why authentication is failing');
      } else {
        console.log('✅ User profile found');
      }
    } else {
      console.log('⚠️  No users found. You need to create a test user first.');
    }

    // Test 4: Check chat_messages table
    console.log('\n4. Testing chat_messages table...');
    const { data: chatData, error: chatError } = await supabase
      .from('chat_messages')
      .select('count')
      .limit(1);
    
    if (chatError) {
      console.error('❌ Chat messages table error:', chatError.message);
      console.log('💡 You need to run the database migration');
    } else {
      console.log('✅ Chat messages table exists');
    }

    // Test 5: Check posts table structure
    console.log('\n5. Testing posts table structure...');
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('id, title, content, content_text, embedding')
      .limit(1);
    
    if (postsError) {
      console.error('❌ Posts table error:', postsError.message);
      console.log('💡 Posts table might need migration');
    } else {
      console.log('✅ Posts table accessible');
      if (posts && posts.length > 0) {
        const post = posts[0];
        console.log(`📝 Sample post has embedding: ${post.embedding ? 'Yes' : 'No'}`);
        console.log(`📝 Sample post has content_text: ${post.content_text ? 'Yes' : 'No'}`);
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

testAuth().catch(console.error); 