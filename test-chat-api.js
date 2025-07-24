// Test script for the enhanced chat API with GPT-4o
const { createClient } = require('@supabase/supabase-js');

async function testChatAPI() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase configuration');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Test 1: Create a test user session
  console.log('🔑 Testing authentication...');
  const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
  
  if (userError) {
    console.error('❌ Error fetching users:', userError);
    process.exit(1);
  }

  if (users.length === 0) {
    console.log('⚠️  No users found. Please create a test user first.');
    process.exit(1);
  }

  const testUser = users[0];
  console.log(`✅ Found test user: ${testUser.email}`);

  // Test 2: Generate a JWT token for the test user
  const { data: { session }, error: sessionError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: testUser.email,
    options: {
      redirectTo: 'http://localhost:3000'
    }
  });

  if (sessionError) {
    console.error('❌ Error generating session:', sessionError);
    process.exit(1);
  }

  // Test 3: Test the chat API endpoint
  console.log('\n💬 Testing chat API endpoint...');
  
  const testQueries = [
    'Hallo, wie geht es dir?',
    'Was sind meine beliebtesten Posts?',
    'Kannst du mir bei der Erstellung neuer Inhalte helfen?',
    'Analysiere meine Social Media Performance'
  ];

  for (const query of testQueries) {
    console.log(`\n📝 Testing query: "${query}"`);
    
    try {
      const response = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ query })
      });

      const data = await response.json();

      if (response.ok) {
        console.log(`✅ Success! Response: ${data.response.substring(0, 100)}...`);
        console.log(`📊 Retrieved ${data.retrieved_posts_count} relevant posts`);
        console.log(`🔗 Conversation ID: ${data.conversation_id}`);
      } else {
        console.error(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      console.error(`❌ Network error: ${error.message}`);
    }
  }

  console.log('\n🎉 Chat API test completed!');
}

// Run the test
testChatAPI().catch(console.error); 