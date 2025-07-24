import { NextRequest, NextResponse } from 'next/server'

const REIMAGINE_HOME_API_KEY = "686d8281f0bdbfed5cb8f049"
const REIMAGINE_HOME_BASE_URL = "https://api.reimaginehome.ai/api"

export async function GET(request: NextRequest) {
  try {
    console.log('Testing REimagine Home API authentication...')
    console.log('API Key:', REIMAGINE_HOME_API_KEY.substring(0, 8) + '...')
    console.log('Base URL:', REIMAGINE_HOME_BASE_URL)

    // Test endpoints with raw API key using x-api-key header
    const testEndpoints = [
      '/v1/interior-design',
      '/v1/order/image',
      '/v1/order',
      '/health',
      '/status'
    ]

    const results = []

    for (const endpoint of testEndpoints) {
      console.log(`\nTesting endpoint: ${endpoint}`)
      
      try {
        const response = await fetch(`${REIMAGINE_HOME_BASE_URL}${endpoint}`, {
          method: 'GET',
          headers: {
            'x-api-key': REIMAGINE_HOME_API_KEY, // Use raw key directly
            'Accept': 'application/json',
            'User-Agent': 'SocialMediaDashboard/1.0',
          },
        })

        const status = response.status
        const responseText = await response.text()
        
        console.log(`  Status: ${status} - ${responseText.substring(0, 200)}`)
        
        results.push({
          endpoint,
          authMethod: 'x-api-key',
          status,
          response: responseText.substring(0, 500),
          success: status < 400
        })

      } catch (error) {
        console.log(`  Error: ${error}`)
        results.push({
          endpoint,
          authMethod: 'x-api-key',
          status: 'error',
          response: error instanceof Error ? error.message : 'Unknown error',
          success: false
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Authentication test completed',
      results,
      apiKey: REIMAGINE_HOME_API_KEY.substring(0, 8) + '...',
      baseUrl: REIMAGINE_HOME_BASE_URL
    })

  } catch (error) {
    console.error('Test failed:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        apiKey: REIMAGINE_HOME_API_KEY.substring(0, 8) + '...',
        baseUrl: REIMAGINE_HOME_BASE_URL
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { testType } = await request.json()

    if (testType === 'upload') {
      // Test image upload with a placeholder
      const testImageUrl = 'https://via.placeholder.com/800x600.jpg'
      
      // Download the test image
      const imageResponse = await fetch(testImageUrl)
      const imageBlob = await imageResponse.blob()
      
      // Test upload
      const uploadFormData = new FormData()
      uploadFormData.append('image', imageBlob, 'test-image.jpg')

      const uploadResponse = await fetch(`${REIMAGINE_HOME_BASE_URL}/v1/order/image`, {
        method: 'POST',
        headers: {
          'x-api-key': REIMAGINE_HOME_API_KEY,
        },
        body: uploadFormData
      })

      if (uploadResponse.ok) {
        const result = await uploadResponse.json()
        return NextResponse.json({
          success: true,
          message: 'Image upload test successful',
          testType: 'upload',
          result: result
        })
      } else {
        const error = await uploadResponse.text()
        return NextResponse.json({
          success: false,
          message: 'Image upload test failed',
          testType: 'upload',
          error: error,
          status: uploadResponse.status
        })
      }
    }

    return NextResponse.json({
      success: false,
      message: 'Invalid test type',
      availableTests: ['upload']
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Test execution failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
} 