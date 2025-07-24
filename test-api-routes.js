// Test script for all API routes
// Run this with: node test-api-routes.js

const BASE_URL = 'http://localhost:3001'

// Mock auth token - in real testing, you would get this from authentication
const AUTH_TOKEN = 'mock-auth-token'

// Test endpoints
const endpoints = [
  // User Profiles
  { method: 'GET', path: '/api/user-profiles', name: 'Get User Profile' },
  { method: 'POST', path: '/api/user-profiles', name: 'Create/Update User Profile' },
  { method: 'PUT', path: '/api/user-profiles', name: 'Update User Profile' },
  { method: 'DELETE', path: '/api/user-profiles', name: 'Delete User Profile' },
  
  // Social Accounts
  { method: 'GET', path: '/api/social-accounts', name: 'Get Social Accounts' },
  { method: 'POST', path: '/api/social-accounts', name: 'Create Social Account' },
  { method: 'PUT', path: '/api/social-accounts', name: 'Update Social Account' },
  { method: 'DELETE', path: '/api/social-accounts?id=test', name: 'Delete Social Account' },
  
  // Content Ideas
  { method: 'GET', path: '/api/content-ideas', name: 'Get Content Ideas' },
  { method: 'POST', path: '/api/content-ideas', name: 'Create Content Idea' },
  { method: 'PUT', path: '/api/content-ideas', name: 'Update Content Idea' },
  { method: 'DELETE', path: '/api/content-ideas?id=test', name: 'Delete Content Idea' },
  
  // Calendar Events
  { method: 'GET', path: '/api/calendar-events', name: 'Get Calendar Events' },
  { method: 'POST', path: '/api/calendar-events', name: 'Create Calendar Event' },
  { method: 'PUT', path: '/api/calendar-events', name: 'Update Calendar Event' },
  { method: 'DELETE', path: '/api/calendar-events?id=test', name: 'Delete Calendar Event' },
  
  // Post Analytics
  { method: 'GET', path: '/api/post-analytics', name: 'Get Post Analytics' },
  { method: 'POST', path: '/api/post-analytics', name: 'Create Post Analytics' },
  { method: 'PUT', path: '/api/post-analytics', name: 'Update Post Analytics' },
  { method: 'DELETE', path: '/api/post-analytics?id=test', name: 'Delete Post Analytics' },
  
  // Interactions
  { method: 'GET', path: '/api/interactions', name: 'Get Interactions' },
  { method: 'POST', path: '/api/interactions', name: 'Create Interaction' },
  { method: 'PUT', path: '/api/interactions', name: 'Update Interaction' },
  { method: 'DELETE', path: '/api/interactions?id=test', name: 'Delete Interaction' },
  
  // Media Files
  { method: 'GET', path: '/api/media-files', name: 'Get Media Files' },
  { method: 'POST', path: '/api/media-files', name: 'Create Media File' },
  { method: 'PUT', path: '/api/media-files', name: 'Update Media File' },
  { method: 'DELETE', path: '/api/media-files?id=test', name: 'Delete Media File' },
  
  // Hashtags
  { method: 'GET', path: '/api/hashtags', name: 'Get Hashtags' },
  { method: 'POST', path: '/api/hashtags', name: 'Create Hashtag' },
  { method: 'PUT', path: '/api/hashtags', name: 'Update Hashtag' },
  { method: 'DELETE', path: '/api/hashtags?id=test', name: 'Delete Hashtag' },
  
  // Publishing Queue
  { method: 'GET', path: '/api/publishing-queue', name: 'Get Publishing Queue' },
  { method: 'POST', path: '/api/publishing-queue', name: 'Add to Publishing Queue' },
  { method: 'PUT', path: '/api/publishing-queue', name: 'Update Publishing Queue' },
  { method: 'DELETE', path: '/api/publishing-queue?id=test', name: 'Delete from Publishing Queue' },
  
  // Posts (existing)
  { method: 'GET', path: '/api/posts', name: 'Get Posts' },
  { method: 'POST', path: '/api/posts', name: 'Create Post' },
  { method: 'PUT', path: '/api/posts', name: 'Update Post' },
  { method: 'DELETE', path: '/api/posts', name: 'Delete Post' },
  
  // Interior Design (existing)
  { method: 'POST', path: '/api/interior-design', name: 'Interior Design Transform' },
  { method: 'GET', path: '/api/interior-design/test', name: 'Interior Design Test' },
]

// Sample data for testing
const sampleData = {
  userProfile: {
    email: 'test@example.com',
    full_name: 'Test User',
    bio: 'Test bio',
    subscription_tier: 'free',
    onboarding_completed: true,
    preferences: { theme: 'dark' }
  },
  socialAccount: {
    platform: 'instagram',
    username: 'testuser',
    display_name: 'Test User',
    status: 'connected'
  },
  contentIdea: {
    title: 'Test Content Idea',
    description: 'Test description',
    content_type: 'image',
    platforms: ['instagram', 'facebook'],
    tags: ['test', 'content'],
    category: 'marketing',
    priority: 'medium'
  },
  calendarEvent: {
    title: 'Test Event',
    description: 'Test description',
    start_date: '2024-12-25',
    end_date: '2024-12-25',
    category: 'content',
    color: '#FF0000'
  },
  postAnalytics: {
    post_id: 'test-post-id',
    platform: 'instagram',
    impressions: 1000,
    reach: 800,
    engagement: 50,
    likes: 45,
    comments: 5
  },
  interaction: {
    platform: 'instagram',
    interaction_type: 'comment',
    sender_name: 'Test User',
    sender_username: 'testuser',
    message: 'Great post!',
    sentiment: 'positive'
  },
  mediaFile: {
    filename: 'test-image.jpg',
    original_filename: 'test-image.jpg',
    file_path: '/uploads/test-image.jpg',
    storage_url: 'https://storage.example.com/test-image.jpg',
    file_size: 1024000,
    mime_type: 'image/jpeg',
    file_type: 'image',
    width: 1920,
    height: 1080
  },
  hashtag: {
    tag: '#test',
    category: 'general',
    usage_count: 10,
    trending_score: 5.5,
    is_trending: false
  },
  publishingQueue: {
    post_id: 'test-post-id',
    platform: 'instagram',
    scheduled_at: '2024-12-25T10:00:00Z',
    priority: 5
  },
  post: {
    title: 'Test Post',
    content: 'This is a test post',
    platforms: ['instagram'],
    status: 'draft',
    tags: ['test']
  }
}

async function testEndpoint(endpoint) {
  try {
    const options = {
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`
      }
    }

    // Add body for POST and PUT requests
    if (endpoint.method === 'POST' || endpoint.method === 'PUT') {
      if (endpoint.path.includes('user-profiles')) {
        options.body = JSON.stringify(sampleData.userProfile)
      } else if (endpoint.path.includes('social-accounts')) {
        options.body = JSON.stringify({ ...sampleData.socialAccount, id: 'test' })
      } else if (endpoint.path.includes('content-ideas')) {
        options.body = JSON.stringify({ ...sampleData.contentIdea, id: 'test' })
      } else if (endpoint.path.includes('calendar-events')) {
        options.body = JSON.stringify({ ...sampleData.calendarEvent, id: 'test' })
      } else if (endpoint.path.includes('post-analytics')) {
        options.body = JSON.stringify({ ...sampleData.postAnalytics, id: 'test' })
      } else if (endpoint.path.includes('interactions')) {
        options.body = JSON.stringify({ ...sampleData.interaction, id: 'test' })
      } else if (endpoint.path.includes('media-files')) {
        options.body = JSON.stringify({ ...sampleData.mediaFile, id: 'test' })
      } else if (endpoint.path.includes('hashtags')) {
        options.body = JSON.stringify({ ...sampleData.hashtag, id: 'test' })
      } else if (endpoint.path.includes('publishing-queue')) {
        options.body = JSON.stringify({ ...sampleData.publishingQueue, id: 'test' })
      } else if (endpoint.path.includes('posts')) {
        options.body = JSON.stringify({ ...sampleData.post, id: 'test' })
      }
    }

    const response = await fetch(`${BASE_URL}${endpoint.path}`, options)
    const data = await response.json()

    console.log(`✅ ${endpoint.name}: ${response.status} - ${response.statusText}`)
    
    // Show response structure for successful calls
    if (response.ok && data.success) {
      console.log(`   📊 Response: ${JSON.stringify(data).substring(0, 100)}...`)
    } else {
      console.log(`   ❌ Error: ${data.error || 'Unknown error'}`)
    }
    
  } catch (error) {
    console.log(`❌ ${endpoint.name}: Failed - ${error.message}`)
  }
}

async function testAllEndpoints() {
  console.log('🚀 Testing all API routes...\n')
  console.log(`📍 Base URL: ${BASE_URL}`)
  console.log(`🔑 Using Auth Token: ${AUTH_TOKEN}\n`)
  
  console.log('=' * 50)
  console.log('API ROUTES TEST RESULTS')
  console.log('=' * 50)
  
  for (const endpoint of endpoints) {
    await testEndpoint(endpoint)
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  console.log('\n' + '=' * 50)
  console.log(`✅ Completed testing ${endpoints.length} endpoints`)
  console.log('=' * 50)
  
  console.log('\n📋 API Routes Summary:')
  console.log(`• User Profiles: 4 endpoints`)
  console.log(`• Social Accounts: 4 endpoints`)
  console.log(`• Content Ideas: 4 endpoints`)
  console.log(`• Calendar Events: 4 endpoints`)
  console.log(`• Post Analytics: 4 endpoints`)
  console.log(`• Interactions: 4 endpoints`)
  console.log(`• Media Files: 4 endpoints`)
  console.log(`• Hashtags: 4 endpoints`)
  console.log(`• Publishing Queue: 4 endpoints`)
  console.log(`• Posts: 4 endpoints`)
  console.log(`• Interior Design: 2 endpoints`)
  console.log(`\n🎯 Total: ${endpoints.length} API endpoints available`)
}

// Check if Next.js server is running
async function checkServer() {
  try {
    const response = await fetch(`${BASE_URL}/`)
    if (response.ok) {
      console.log('✅ Next.js server is running')
      return true
    } else {
      console.log('❌ Next.js server responded with error')
      return false
    }
  } catch (error) {
    console.log(`❌ Next.js server is not running: ${error.message}`)
    console.log('Please run: npm run dev')
    return false
  }
}

// Main execution
async function main() {
  console.log('🔍 Checking server status...')
  
  const serverRunning = await checkServer()
  if (!serverRunning) {
    process.exit(1)
  }
  
  console.log('\n')
  await testAllEndpoints()
  
  console.log('\n🎉 API Routes testing completed!')
  console.log('\nNote: Some endpoints may show 401 errors due to mock auth token.')
  console.log('In production, use real authentication tokens.')
}

main().catch(console.error) 