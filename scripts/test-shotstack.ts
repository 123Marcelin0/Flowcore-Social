/**
 * Shotstack Integration Test Script
 * Tests the optimized Shotstack implementation with both sandbox and production environments
 */

import { ShotstackService } from '../lib/shotstack-service'
import { getShotstackConfig, validateShotstackConfig } from '../lib/shotstack-config'

// Test assets
const TEST_VIDEO_URL = 'https://shotstack-assets.s3-ap-southeast-2.amazonaws.com/footage/skater.hd.mp4'
const TEST_IMAGE_URL = 'https://shotstack-assets.s3-ap-southeast-2.amazonaws.com/images/earth.jpg'
const TEST_AUDIO_URL = 'https://shotstack-assets.s3-ap-southeast-2.amazonaws.com/music/disco.mp3'

async function runTests() {
  console.log('🧪 Starting Shotstack Integration Tests...\n')
  
  try {
    // Test 1: Configuration Validation
    console.log('📋 Test 1: Configuration Validation')
    const configValidation = validateShotstackConfig()
    
    if (configValidation.isValid) {
      console.log('✅ Configuration is valid')
      const config = getShotstackConfig()
      console.log(`   Environment: ${config.environment}`)
      console.log(`   Debug mode: ${config.debug}`)
      console.log(`   Retry settings: ${config.maxRetries} retries, ${config.retryDelay}ms delay`)
    } else {
      console.log('❌ Configuration errors:')
      configValidation.errors.forEach(error => console.log(`   - ${error}`))
      return
    }
    
    // Test 2: Service Initialization
    console.log('\n🏗️  Test 2: Service Initialization')
    const config = getShotstackConfig()
    const shotstackService = new ShotstackService(config)
    console.log('✅ Shotstack service initialized successfully')
    
    // Test 3: Asset Probing
    console.log('\n🔍 Test 3: Asset Probing')
    
    try {
      console.log('   Testing video probe...')
      const videoProbe = await shotstackService.probeAsset(TEST_VIDEO_URL)
      console.log(`   ✅ Video probe successful: ${videoProbe.response?.metadata?.format?.duration}s duration`)
      
      console.log('   Testing image probe...')
      const imageProbe = await shotstackService.probeAsset(TEST_IMAGE_URL)
      console.log(`   ✅ Image probe successful: ${imageProbe.response?.metadata?.streams?.[0]?.width}x${imageProbe.response?.metadata?.streams?.[0]?.height}`)
      
    } catch (error) {
      console.log(`   ❌ Asset probing failed: ${error instanceof Error ? error.message : error}`)
    }
    
    // Test 4: Simple Slideshow Render
    console.log('\n🎬 Test 4: Simple Slideshow Render')
    
    try {
      const slideshowConfig = shotstackService.createSlideshow([TEST_IMAGE_URL], {
        duration: 2,
        title: 'Test Slideshow',
        outputFormat: 'mp4',
        resolution: 'sd',
        aspectRatio: '16:9'
      })
      
      console.log('   Submitting slideshow render...')
      const renderResponse = await shotstackService.render(slideshowConfig)
      const jobId = renderResponse.response?.id
      
      if (jobId) {
        console.log(`   ✅ Render submitted successfully: ${jobId}`)
        
        // Test 5: Status Polling
        console.log('\n📊 Test 5: Status Polling')
        let attempts = 0
        const maxAttempts = 5
        
        while (attempts < maxAttempts) {
          const status = await shotstackService.getRenderStatus(jobId)
          console.log(`   Status check ${attempts + 1}: ${status.response.status}`)
          
          if (status.response.status === 'done') {
            console.log(`   ✅ Render completed: ${status.response.url}`)
            break
          } else if (status.response.status === 'failed') {
            console.log(`   ❌ Render failed: ${status.response.error}`)
            break
          }
          
          if (attempts < maxAttempts - 1) {
            await new Promise(resolve => setTimeout(resolve, 3000))
          }
          attempts++
        }
        
        if (attempts === maxAttempts) {
          console.log('   ⏱️  Render still in progress after polling attempts')
        }
        
      } else {
        console.log('   ❌ No job ID returned from render submission')
      }
      
    } catch (error) {
      console.log(`   ❌ Render test failed: ${error instanceof Error ? error.message : error}`)
    }
    
    // Test 6: Error Handling
    console.log('\n🛠️  Test 6: Error Handling')
    
    try {
      // Test invalid URL
      await shotstackService.probeAsset('invalid-url')
      console.log('   ❌ Should have thrown error for invalid URL')
    } catch (error) {
      console.log('   ✅ Correctly handled invalid URL error')
    }
    
    try {
      // Test invalid render config
      await shotstackService.render({
        timeline: { tracks: [] },
        output: { format: 'mp4' as any }
      })
      console.log('   ❌ Should have thrown error for invalid config')
    } catch (error) {
      console.log('   ✅ Correctly handled invalid render config')
    }
    
    console.log('\n🎉 All tests completed!')
    
  } catch (error) {
    console.error('\n💥 Test suite failed:', error)
    process.exit(1)
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error)
}

export { runTests }