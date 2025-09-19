// Test script to verify Pixabay API integration
const testPixabayIntegration = async () => {
  try {
    console.log('🧪 Testing Pixabay API integration...')
    
    // Test the API endpoint with imageType parameter
    const response = await fetch('/api/pixabay?q=heart&type=images&perPage=3&order=popular&imageType=vector', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    console.log('✅ Pixabay API response:', data)
    
    if (data.success && data.data?.images?.hits) {
      console.log(`✅ Found ${data.data.images.hits.length} vector images for "heart"`)
      console.log('✅ First image URL:', data.data.images.hits[0]?.webformatURL || data.data.images.hits[0]?.largeImageURL)
    } else {
      console.log('❌ No images found in response')
    }
    
  } catch (error) {
    console.error('❌ Pixabay API test failed:', error)
  }
}

// Run the test if this script is executed directly
if (typeof window !== 'undefined') {
  // Browser environment
  testPixabayIntegration()
} else {
  // Node.js environment
  console.log('This test should be run in the browser environment')
}
































