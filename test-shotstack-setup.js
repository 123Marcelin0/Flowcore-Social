const axios = require('axios');

async function testShotstackAPI() {
  console.log('🔧 Testing Shotstack API Setup...\n');

  // Test configuration - replace with your actual sandbox API key
  const apiKey = process.env.SHOTSTACK_SANDBOX_API_KEY || 'YOUR_SANDBOX_API_KEY_HERE';
  const endpoint = 'https://api.shotstack.io/edit/stage/render'; // Sandbox endpoint

  // Hello World JSON configuration
  const helloWorldEdit = {
    "timeline": {
      "soundtrack": {
        "src": "https://s3-ap-southeast-2.amazonaws.com/shotstack-assets/music/moment.mp3",
        "effect": "fadeOut"
      },
      "tracks": [
        {
          "clips": [
            {
              "asset": {
                "type": "text",
                "text": "HELLO WORLD",
                "font": {
                  "family": "Montserrat ExtraBold",
                  "color": "#ffffff",
                  "size": 32
                },
                "alignment": {
                  "horizontal": "left"
                }
              },
              "start": 0,
              "length": 5,
              "transition": {
                "in": "fade",
                "out": "fade"
              }
            }
          ]
        }
      ]
    },
    "output": {
      "format": "mp4",
      "size": {
        "width": 1024,
        "height": 576
      }
    }
  };

  try {
    console.log('📡 Making request to Shotstack API...');
    
    const response = await axios.post(endpoint, helloWorldEdit, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      }
    });

    console.log('✅ Success! Response:', {
      status: response.status,
      data: response.data
    });

    const jobId = response.data?.response?.id;
    if (jobId) {
      console.log(`\n🎬 Render job created with ID: ${jobId}`);
      console.log(`\n🔍 To check status, run:`);
      console.log(`curl -H "x-api-key: ${apiKey}" https://api.shotstack.io/edit/stage/render/${jobId}`);
    }

    return { success: true, jobId };

  } catch (error) {
    console.error('❌ Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });

    if (error.response?.status === 401) {
      console.log('\n🔑 API Key Issue: The API key might be invalid or expired.');
      console.log('👉 Get a new API key from: https://shotstack.io/dashboard/developers');
    }

    return { success: false, error: error.message };
  }
}

// Run the test
testShotstackAPI()
  .then(result => {
    if (result.success) {
      console.log('\n🎉 Shotstack API is working correctly!');
    } else {
      console.log('\n💥 Shotstack API test failed. Please check your API key.');
    }
  })
  .catch(console.error);