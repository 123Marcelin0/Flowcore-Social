// Test script to verify media upload functionality
// Run with: node test-media-upload.js

const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');

async function testMediaUpload() {
  console.log('🧪 Testing Media Upload API...\n');

  // Test API endpoint availability
  try {
    const healthCheck = await fetch('http://localhost:3000/api/media-upload', {
      method: 'GET'
    });
    
    console.log('📡 API Health Check:', {
      status: healthCheck.status,
      statusText: healthCheck.statusText
    });
  } catch (error) {
    console.error('❌ API endpoint not reachable:', error.message);
    return;
  }

  // Test with authentication (you'll need to get a real JWT token)
  console.log('\n🔑 To fully test upload:');
  console.log('1. Login to your app');
  console.log('2. Open browser dev tools → Network tab');
  console.log('3. Upload a file in AI Video Editor');
  console.log('4. Copy the Authorization header value');
  console.log('5. Use that token in this script\n');

  // Test upload with dummy data (will fail without auth)
  console.log('📤 Testing upload endpoint structure...');
  
  const formData = new FormData();
  formData.append('file', Buffer.from('dummy data'), {
    filename: 'test.jpg',
    contentType: 'image/jpeg'
  });
  formData.append('fileType', 'image');

  try {
    const response = await fetch('http://localhost:3000/api/media-upload', {
      method: 'POST',
      body: formData,
      headers: {
        // Add your real auth token here for full testing
        // 'Authorization': 'Bearer YOUR_JWT_TOKEN_HERE'
      }
    });

    const result = await response.json();
    
    console.log('Upload Response:', {
      status: response.status,
      success: result.success,
      error: result.error,
      suggestion: result.suggestion
    });

    if (response.status === 401) {
      console.log('✅ Endpoint structure is correct (401 = needs auth)');
    }

  } catch (error) {
    console.error('❌ Upload test failed:', error.message);
  }
}

// Helper to check if Supabase is configured
async function checkSupabaseConfig() {
  console.log('🔍 Checking Supabase Configuration...\n');
  
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY', 
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.log('❌ Missing environment variables:');
    missingVars.forEach(varName => {
      console.log(`   - ${varName}`);
    });
    console.log('\n💡 Add these to your .env.local file\n');
  } else {
    console.log('✅ All Supabase environment variables are set\n');
  }
}

// Run tests
async function runAllTests() {
  await checkSupabaseConfig();
  await testMediaUpload();
  
  console.log('\n📋 Next Steps:');
  console.log('1. Run the SQL setup in Supabase');
  console.log('2. Restart your dev server: pnpm run dev');
  console.log('3. Test upload in AI Video Editor');
  console.log('4. Check server logs for detailed debugging');
}

runAllTests().catch(console.error);