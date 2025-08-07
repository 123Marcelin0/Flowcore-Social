const fetch = require('node-fetch');

// Test configuration
const API_BASE_URL = 'http://localhost:3000/api';
const TEST_PROMPT = 'A beautiful sunset over mountains with gentle camera movement';

async function testVideoGeneration() {
  console.log('🧪 Testing Vertex AI Video Generation API');
  console.log('==========================================\n');

  try {
    // Test 1: Basic video generation request
    console.log('1. Testing basic video generation...');
    
    const requestBody = {
      prompt: TEST_PROMPT,
      model: 'veo-2',
      duration: 10,
      fps: 30,
      resolution: '720p',
      style: 'cinematic',
      motionIntensity: 5,
      cameraMovement: 'slow_pan'
    };

    const response = await fetch(`${API_BASE_URL}/generate-video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // Replace with actual token
      },
      body: JSON.stringify(requestBody)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Video generation request successful');
      console.log('Response:', JSON.stringify(result, null, 2));
      
      // Test 2: Check status if operation is long-running
      if (result.taskId) {
        console.log('\n2. Testing status check for long-running operation...');
        
        const statusResponse = await fetch(`${API_BASE_URL}/generate-video?taskId=${result.taskId}`, {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer test-token'
          }
        });
        
        const statusResult = await statusResponse.json();
        
        if (statusResponse.ok) {
          console.log('✅ Status check successful');
          console.log('Status:', JSON.stringify(statusResult, null, 2));
        } else {
          console.log('❌ Status check failed:', statusResult);
        }
      }
    } else {
      console.log('❌ Video generation request failed');
      console.log('Error:', result);
    }

  } catch (error) {
    console.log('❌ Test failed with error:', error.message);
  }
}

async function testEnvironmentSetup() {
  console.log('🔧 Testing Environment Setup');
  console.log('============================\n');

  const requiredEnvVars = [
    'GOOGLE_CLOUD_PROJECT_ID',
    'GOOGLE_APPLICATION_CREDENTIALS'
  ];

  console.log('Checking required environment variables:');
  
  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar];
    if (value) {
      console.log(`✅ ${envVar}: ${envVar.includes('CREDENTIALS') ? '[SET]' : value}`);
    } else {
      console.log(`❌ ${envVar}: [NOT SET]`);
    }
  }

  console.log('\n📝 Setup Instructions:');
  console.log('1. Set GOOGLE_CLOUD_PROJECT_ID to your Google Cloud project ID');
  console.log('2. Set GOOGLE_APPLICATION_CREDENTIALS to path of your service account key file');
  console.log('3. Ensure Vertex AI API is enabled in your Google Cloud project');
  console.log('4. Ensure your service account has Vertex AI User permissions');
}

// Run tests
async function runTests() {
  await testEnvironmentSetup();
  console.log('\n' + '='.repeat(50) + '\n');
  await testVideoGeneration();
}

// Check if running directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testVideoGeneration, testEnvironmentSetup };
