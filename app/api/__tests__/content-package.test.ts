import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, GET } from '../content-package/route'

// Mock environment variables
const mockEnvVars = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
  OPENAI_API_KEY: 'test-openai-key'
}

// Mock modules
vi.mock('@supabase/supabase-js', () => {
  const mockSupabase = {
    auth: {
      getUser: vi.fn()
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          order: vi.fn(() => ({
            range: vi.fn()
          }))
        }))
      })),
      insert: vi.fn()
    }))
  };
  return { createClient: vi.fn(() => mockSupabase) };
})

vi.mock('@/lib/chat-context-analyzer', () => ({
  chatContextAnalyzer: {
    analyzeUserContext: vi.fn()
  }
}))

vi.mock('@/lib/enhanced-content-generator', () => ({
  enhancedContentGenerator: {
    generateContentPackage: vi.fn(),
    regenerateContent: vi.fn()
  }
}))

vi.mock('@/lib/content-package-builder', () => ({
  contentPackageBuilder: {
    buildContentPackage: vi.fn()
  }
}))

// Test utilities
function createMockRequest(
  method: string,
  body?: any,
  headers: Record<string, string> = {}
): NextRequest {
  const url = 'https://test.com/api/content-package'
  const defaultHeaders = {
    'content-type': 'application/json',
    ...headers
  }

  return new NextRequest(url, {
    method,
    headers: defaultHeaders,
    body: body ? JSON.stringify(body) : undefined
  })
}

const mockUser = {
  id: 'test-user-123',
  email: 'test@example.com'
}

const mockUserContext = {
  userId: 'test-user-123',
  topics: ['social media', 'content creation', 'marketing'],
  themes: ['content-creation', 'business-growth'],
  userStyle: {
    tone: 'professional' as const,
    vocabulary: 'mixed' as const,
    length: 'detailed' as const,
    formality: 'formal' as const
  },
  recentInterests: ['instagram marketing', 'video content'],
  communicationPatterns: {
    questionTypes: ['how-to'],
    responsePreferences: ['examples'],
    engagementStyle: 'highly-engaged',
    topicTransitions: ['also']
  },
  contextSummary: 'Professional content creator interested in social media marketing',
  analyzedAt: new Date(),
  messageCount: 15,
  timeRange: {
    from: new Date('2024-01-01'),
    to: new Date('2024-01-30')
  }
}

const mockContentPackage = {
  script: {
    title: 'Test Content Script',
    hook: 'Engaging hook',
    mainContent: 'Main content body',
    callToAction: 'Take action now!',
    duration: '30 seconds'
  },
  hashtags: {
    primary: ['#test', '#content'],
    secondary: ['#marketing', '#social'],
    trending: ['#viral'],
    niche: ['#specific']
  },
  captions: {
    short: 'Short caption',
    medium: 'Medium length caption',
    long: 'Long detailed caption',
    story: 'Story caption'
  },
  implementationGuide: {
    steps: ['Step 1', 'Step 2'],
    tips: ['Tip 1', 'Tip 2'],
    bestPractices: ['Practice 1'],
    timing: 'Best time to post'
  },
  visualGuidance: {
    composition: ['Rule of thirds'],
    lighting: ['Natural light'],
    editing: ['Quick cuts'],
    style: 'Professional and clean'
  }
}

describe('Content Package API', () => {
  let mockSupabase: any
  let mockChatContextAnalyzer: any
  let mockEnhancedContentGenerator: any
  let mockContentPackageBuilder: any

  beforeAll(() => {
    // Set environment variables
    Object.entries(mockEnvVars).forEach(([key, value]) => {
      process.env[key] = value
    })
  })

  beforeEach(async () => {
    vi.clearAllMocks()
    
    // Reset rate limiting store
    const { rateLimitStore } = await import('@/lib/rate-limiter')
    if (rateLimitStore) {
      rateLimitStore.clear()
    }

    // Setup mocks
    const { createClient } = await import('@supabase/supabase-js')
    mockSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    const { chatContextAnalyzer } = await import('@/lib/chat-context-analyzer')
    mockChatContextAnalyzer = chatContextAnalyzer
    
    const { enhancedContentGenerator } = await import('@/lib/enhanced-content-generator')
    mockEnhancedContentGenerator = enhancedContentGenerator
    
    const { contentPackageBuilder } = await import('@/lib/content-package-builder')
    mockContentPackageBuilder = contentPackageBuilder
  })

  describe('POST /api/content-package', () => {
    describe('Authentication', () => {
      it('should reject requests without authorization header', async () => {
        const request = createMockRequest('POST', { topic: 'test topic' })
        const response = await POST(request)
        
        expect(response.status).toBe(401)
        const data = await response.json()
        expect(data.success).toBe(false)
        expect(data.error).toBe('Authentication required')
      })

      it('should reject requests with invalid token', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: { message: 'Invalid token' }
        })

        const request = createMockRequest('POST', 
          { topic: 'test topic' },
          { authorization: 'Bearer invalid-token' }
        )
        const response = await POST(request)
        
        expect(response.status).toBe(401)
        const data = await response.json()
        expect(data.success).toBe(false)
        expect(data.error).toBe('Authentication required')
      })

      it('should accept requests with valid token', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null
        })
        mockChatContextAnalyzer.analyzeUserContext.mockResolvedValue(mockUserContext)
        mockEnhancedContentGenerator.generateContentPackage.mockResolvedValue(mockContentPackage)
        mockSupabase.from.mockReturnValue({
          insert: vi.fn().mockResolvedValue({ error: null })
        })

        const request = createMockRequest('POST',
          { topic: 'test topic' },
          { authorization: 'Bearer valid-token' }
        )
        const response = await POST(request)
        
        expect(response.status).toBe(200)
        const data = await response.json()
        expect(data.success).toBe(true)
      })
    })

    describe('Rate Limiting', () => {
      beforeEach(() => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null
        })
      })

      it('should allow requests within rate limit', async () => {
        mockChatContextAnalyzer.analyzeUserContext.mockResolvedValue(mockUserContext)
        mockEnhancedContentGenerator.generateContentPackage.mockResolvedValue(mockContentPackage)
        mockSupabase.from.mockReturnValue({
          insert: vi.fn().mockResolvedValue({ error: null })
        })

        const request = createMockRequest('POST',
          { topic: 'test topic' },
          { authorization: 'Bearer valid-token' }
        )
        const response = await POST(request)
        
        expect(response.status).toBe(200)
        const headers = response.headers
        expect(headers.get('X-RateLimit-Limit')).toBe('10')
        expect(headers.get('X-RateLimit-Remaining')).toBe('9')
      })

      it('should reject requests exceeding rate limit', async () => {
        // Make 11 requests quickly to exceed limit
        const promises = Array.from({ length: 11 }, () => {
          const request = createMockRequest('POST',
            { topic: 'test topic' },
            { authorization: 'Bearer valid-token' }
          )
          return POST(request)
        })

        const responses = await Promise.all(promises)
        
        // Last request should be rate limited
        const lastResponse = responses[responses.length - 1]
        expect(lastResponse.status).toBe(429)
        
        const data = await lastResponse.json()
        expect(data.success).toBe(false)
        expect(data.error).toBe('Rate limit exceeded')
      })
    })

    describe('Request Validation', () => {
      beforeEach(() => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null
        })
      })

      it('should reject requests with invalid JSON', async () => {
        const request = new NextRequest('https://test.com/api/content-package', {
          method: 'POST',
          headers: {
            'authorization': 'Bearer valid-token',
            'content-type': 'application/json'
          },
          body: 'invalid json'
        })
        
        const response = await POST(request)
        expect(response.status).toBe(400)
        
        const data = await response.json()
        expect(data.success).toBe(false)
        expect(data.error).toBe('Invalid JSON in request body')
      })

      it('should reject requests without topic', async () => {
        const request = createMockRequest('POST',
          { platform: 'instagram' },
          { authorization: 'Bearer valid-token' }
        )
        const response = await POST(request)
        
        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.success).toBe(false)
        expect(data.error).toBe('Topic is required')
      })

      it('should accept valid request parameters', async () => {
        mockChatContextAnalyzer.analyzeUserContext.mockResolvedValue(mockUserContext)
        mockEnhancedContentGenerator.generateContentPackage.mockResolvedValue(mockContentPackage)
        mockSupabase.from.mockReturnValue({
          insert: vi.fn().mockResolvedValue({ error: null })
        })

        const request = createMockRequest('POST',
          {
            topic: 'Social Media Tips',
            platform: 'instagram',
            contentType: 'video',
            tone: 'professional',
            length: 'medium'
          },
          { authorization: 'Bearer valid-token' }
        )
        const response = await POST(request)
        
        expect(response.status).toBe(200)
        const data = await response.json()
        expect(data.success).toBe(true)
        expect(data.contentPackage).toBeDefined()
      })
    })

    describe('Content Generation', () => {
      beforeEach(() => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null
        })
        mockSupabase.from.mockReturnValue({
          insert: vi.fn().mockResolvedValue({ error: null })
        })
      })

      it('should generate content with enhanced content generator', async () => {
        mockChatContextAnalyzer.analyzeUserContext.mockResolvedValue(mockUserContext)
        mockEnhancedContentGenerator.generateContentPackage.mockResolvedValue(mockContentPackage)

        const request = createMockRequest('POST',
          { topic: 'test topic', platform: 'instagram' },
          { authorization: 'Bearer valid-token' }
        )
        const response = await POST(request)
        
        expect(response.status).toBe(200)
        expect(mockChatContextAnalyzer.analyzeUserContext).toHaveBeenCalledWith('test-user-123')
        expect(mockEnhancedContentGenerator.generateContentPackage).toHaveBeenCalledWith(
          mockUserContext,
          expect.objectContaining({
            prompt: 'test topic',
            platform: 'instagram'
          })
        )
      })

      it('should generate content with content package builder for comprehensive packages', async () => {
        mockChatContextAnalyzer.analyzeUserContext.mockResolvedValue(mockUserContext)
        mockContentPackageBuilder.buildContentPackage.mockReturnValue(mockContentPackage)

        const request = createMockRequest('POST',
          { topic: 'test topic', platform: 'content-package' },
          { authorization: 'Bearer valid-token' }
        )
        const response = await POST(request)
        
        expect(response.status).toBe(200)
        expect(mockContentPackageBuilder.buildContentPackage).toHaveBeenCalledWith(
          mockUserContext,
          'test topic',
          expect.objectContaining({
            platform: 'instagram'
          })
        )
      })

      it('should handle regeneration requests', async () => {
        const previousPackage = { ...mockContentPackage, id: 'prev-package-123' }
        mockSupabase.from.mockReturnValue({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: previousPackage })
              }))
            }))
          })),
          insert: vi.fn().mockResolvedValue({ error: null })
        })
        
        mockChatContextAnalyzer.analyzeUserContext.mockResolvedValue(mockUserContext)
        mockEnhancedContentGenerator.regenerateContent.mockResolvedValue(mockContentPackage)

        const request = createMockRequest('POST',
          {
            topic: 'test topic',
            regenerate: true,
            previousPackageId: 'prev-package-123'
          },
          { authorization: 'Bearer valid-token' }
        )
        const response = await POST(request)
        
        expect(response.status).toBe(200)
        expect(mockEnhancedContentGenerator.regenerateContent).toHaveBeenCalledWith(
          previousPackage,
          mockUserContext,
          expect.any(Object)
        )
      })
    })

    describe('Error Handling', () => {
      beforeEach(() => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null
        })
      })

      it('should handle context analysis failure', async () => {
        mockChatContextAnalyzer.analyzeUserContext.mockRejectedValue(new Error('Context analysis failed'))

        const request = createMockRequest('POST',
          { topic: 'test topic' },
          { authorization: 'Bearer valid-token' }
        )
        const response = await POST(request)
        
        expect(response.status).toBe(500)
        const data = await response.json()
        expect(data.success).toBe(false)
        expect(data.error).toBe('Failed to generate content package')
      }, 10000)

      it('should handle content generation failure', async () => {
        mockChatContextAnalyzer.analyzeUserContext.mockResolvedValue(mockUserContext)
        mockEnhancedContentGenerator.generateContentPackage.mockRejectedValue(new Error('Generation failed'))

        const request = createMockRequest('POST',
          { topic: 'test topic' },
          { authorization: 'Bearer valid-token' }
        )
        const response = await POST(request)
        
        expect(response.status).toBe(500)
        const data = await response.json()
        expect(data.success).toBe(false)
        expect(data.error).toBe('Failed to generate content package')
      }, 10000)

      it('should retry failed operations with exponential backoff', async () => {
        let attemptCount = 0
        mockChatContextAnalyzer.analyzeUserContext.mockImplementation(() => {
          attemptCount++
          if (attemptCount < 3) {
            throw new Error('Temporary failure')
          }
          return Promise.resolve(mockUserContext)
        })
        mockEnhancedContentGenerator.generateContentPackage.mockResolvedValue(mockContentPackage)
        mockSupabase.from.mockReturnValue({
          insert: vi.fn().mockResolvedValue({ error: null })
        })

        const request = createMockRequest('POST',
          { topic: 'test topic' },
          { authorization: 'Bearer valid-token' }
        )
        const response = await POST(request)
        
        expect(response.status).toBe(200)
        expect(attemptCount).toBe(3) // Should have retried
      })
    })
  })

  describe('GET /api/content-package', () => {
    describe('Authentication', () => {
      it('should reject requests without authorization', async () => {
        const request = createMockRequest('GET')
        const response = await GET(request)
        
        expect(response.status).toBe(401)
        const data = await response.json()
        expect(data.success).toBe(false)
        expect(data.error).toBe('Authentication required')
      })

      it('should accept requests with valid token', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null
        })
        mockSupabase.from.mockReturnValue({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                range: vi.fn().mockResolvedValue({ data: [], error: null })
              }))
            }))
          }))
        })

        const request = createMockRequest('GET', undefined, { authorization: 'Bearer valid-token' })
        const response = await GET(request)
        
        expect(response.status).toBe(200)
        const data = await response.json()
        expect(data.success).toBe(true)
        expect(data.packages).toBeDefined()
      })
    })

    describe('Query Parameters', () => {
      beforeEach(() => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null
        })
      })

      it('should handle pagination parameters', async () => {
        const mockQuery = {
          select: vi.fn(() => mockQuery),
          eq: vi.fn(() => mockQuery),
          order: vi.fn(() => mockQuery),
          range: vi.fn().mockResolvedValue({ data: [], error: null })
        }
        mockSupabase.from.mockReturnValue(mockQuery)

        const url = 'https://test.com/api/content-package?limit=5&offset=10'
        const request = new NextRequest(url, {
          method: 'GET',
          headers: { authorization: 'Bearer valid-token' }
        })
        const response = await GET(request)
        
        expect(response.status).toBe(200)
        expect(mockQuery.range).toHaveBeenCalledWith(10, 14) // offset + limit - 1
      })

      it('should handle filter parameters', async () => {
        const mockQuery = {
          select: vi.fn(() => mockQuery),
          eq: vi.fn(() => mockQuery),
          order: vi.fn(() => mockQuery),
          range: vi.fn().mockResolvedValue({ data: [], error: null })
        }
        mockSupabase.from.mockReturnValue(mockQuery)

        const url = 'https://test.com/api/content-package?platform=instagram&contentType=video'
        const request = new NextRequest(url, {
          method: 'GET',
          headers: { authorization: 'Bearer valid-token' }
        })
        const response = await GET(request)
        
        expect(response.status).toBe(200)
        expect(mockQuery.eq).toHaveBeenCalledWith('platform', 'instagram')
        expect(mockQuery.eq).toHaveBeenCalledWith('content_type', 'video')
      })
    })

    describe('Error Handling', () => {
      beforeEach(() => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null
        })
      })

      it('should handle database errors', async () => {
        mockSupabase.from.mockReturnValue({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                range: vi.fn().mockResolvedValue({ 
                  data: null, 
                  error: { message: 'Database error' } 
                })
              }))
            }))
          }))
        })

        const request = createMockRequest('GET', undefined, { authorization: 'Bearer valid-token' })
        const response = await GET(request)
        
        expect(response.status).toBe(500)
        const data = await response.json()
        expect(data.success).toBe(false)
        expect(data.error).toBe('Failed to retrieve content packages')
      })
    })
  })

  describe('Performance and Reliability', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null })
      })
    })

    it('should handle concurrent requests efficiently', async () => {
      mockChatContextAnalyzer.analyzeUserContext.mockResolvedValue(mockUserContext)
      mockEnhancedContentGenerator.generateContentPackage.mockResolvedValue(mockContentPackage)

      const requests = Array.from({ length: 5 }, (_, i) => {
        const request = createMockRequest('POST',
          { topic: `test topic ${i}` },
          { authorization: `Bearer valid-token-${i}` }
        )
        return POST(request)
      })

      const responses = await Promise.all(requests)
      
      responses.forEach(response => {
        expect(response.status).toBe(200)
      })
    })

    it('should complete requests within reasonable time', async () => {
      mockChatContextAnalyzer.analyzeUserContext.mockResolvedValue(mockUserContext)
      mockEnhancedContentGenerator.generateContentPackage.mockResolvedValue(mockContentPackage)

      const start = Date.now()
      const request = createMockRequest('POST',
        { topic: 'test topic' },
        { authorization: 'Bearer valid-token' }
      )
      const response = await POST(request)
      const duration = Date.now() - start

      expect(response.status).toBe(200)
      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
    })
  })
}) 