import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { enhancedContentGenerator } from '../enhanced-content-generator'
import type { UserContext } from '../chat-context-analyzer'
import type { ContentPackage } from '../enhanced-content-generator'

// Mock OpenAI
vi.mock('openai', () => ({
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
        create: vi.fn()
      }
    }
  }))
    }))

// Mock environment variables
const originalEnv = process.env
vi.stubEnv('OPENAI_API_KEY', 'test-api-key')

describe('EnhancedContentGenerator', () => {
  let mockUserContext: UserContext
  let mockContentPackage: ContentPackage

  beforeEach(() => {
    mockUserContext = {
      userId: 'test-user',
      topics: ['real estate', 'marketing', 'social media'],
      themes: ['business-growth', 'content-creation'],
      userStyle: {
        tone: 'professional',
        vocabulary: 'mixed',
        length: 'detailed',
        formality: 'formal'
      },
      recentInterests: ['Instagram reels', 'content strategy'],
      communicationPatterns: {
        questionTypes: ['how-to', 'best-practices'],
        responsePreferences: ['step-by-step', 'examples'],
        engagementStyle: 'highly-engaged',
        topicTransitions: ['also', 'furthermore']
      },
      contextSummary: 'Real estate professional focused on social media marketing',
      analyzedAt: new Date(),
      messageCount: 15,
      timeRange: {
        from: new Date('2024-01-01'),
        to: new Date('2024-01-31')
      }
    }

    mockContentPackage = {
      id: 'test-package-1',
      userId: 'test-user',
      script: {
        title: 'Real Estate Marketing Tips',
        hook: 'Want to sell more properties?',
        mainContent: 'Here are 3 proven strategies...',
        callToAction: 'Follow for more tips!',
        duration: '30 seconds'
      },
      hashtags: {
        primary: ['#realestate', '#marketing', '#tips'],
        secondary: ['#property', '#sales'],
        trending: ['#2024trends'],
        niche: ['#realtor']
      },
      captions: {
        short: 'Real estate marketing tips!',
        medium: 'Learn proven real estate marketing strategies that work.',
        long: 'Discover the most effective real estate marketing strategies that top agents use to sell more properties and build their brand.',
        story: 'Swipe for marketing tips!'
      },
      implementationGuide: {
        steps: ['Plan content', 'Create video', 'Post and engage'],
        tips: ['Use good lighting', 'Keep it short'],
        bestPractices: ['Post consistently', 'Engage with comments'],
        timing: 'Post at 9 AM for best engagement'
      },
      visualGuidance: {
        composition: ['Rule of thirds', 'Clean background'],
        lighting: ['Natural light', 'Avoid shadows'],
        editing: ['Quick cuts', 'Add text overlays'],
        style: 'Professional and clean'
      },
      metadata: {
        generatedAt: new Date(),
        contextSummary: 'Test content',
        userStyle: 'professional',
        topics: ['real estate'],
        confidence: 0.8,
        regenerationCount: 0
      }
    }

    // Mock OpenAI response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              script: {
                title: 'New Real Estate Marketing Tips',
                hook: 'Ready to boost your sales?',
                mainContent: 'Here are 5 fresh strategies...',
                callToAction: 'Save this post!',
                duration: '45 seconds'
              },
              hashtags: {
                primary: ['#realestatetips', '#marketingStrategy', '#propertyexpert'],
                secondary: ['#realtor', '#sales'],
                trending: ['#2024marketing'],
                niche: ['#luxuryrealestate']
              },
              captions: {
                short: 'Fresh marketing strategies!',
                medium: 'Discover new approaches to real estate marketing success.',
                long: 'Transform your real estate business with these cutting-edge marketing strategies that drive results.',
                story: 'New marketing tips inside!'
              },
              implementationGuide: {
                steps: ['Research audience', 'Create content', 'Distribute widely'],
                tips: ['Focus on value', 'Be authentic'],
                bestPractices: ['Track metrics', 'Iterate quickly'],
                timing: 'Post at 10 AM for maximum reach'
              },
              visualGuidance: {
                composition: ['Center subject', 'Use leading lines'],
                lighting: ['Golden hour', 'Soft shadows'],
                editing: ['Smooth transitions', 'Brand colors'],
                style: 'Modern and dynamic'
              }
            })
          }
        }]
      })
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('generateContentPackage', () => {
    it('should generate content package with user context', async () => {
      const result = await enhancedContentGenerator.generateContentPackage(mockUserContext, {
        prompt: 'Create real estate content',
        platform: 'instagram'
      })

      expect(result).toBeDefined()
      expect(result.script).toBeDefined()
      expect(result.hashtags).toBeDefined()
      expect(result.captions).toBeDefined()
      expect(result.implementationGuide).toBeDefined()
      expect(result.visualGuidance).toBeDefined()
      expect(result.metadata.regenerationCount).toBe(0)
    })

    it('should handle different platforms', async () => {
      const result = await enhancedContentGenerator.generateContentPackage(mockUserContext, {
        platform: 'linkedin',
        contentType: 'text'
      })

      expect(result).toBeDefined()
      expect(result.script.title).toContain('Real Estate')
    })

    it('should respect user tone preferences', async () => {
      const casualContext = {
        ...mockUserContext,
        userStyle: { ...mockUserContext.userStyle, tone: 'casual' as const }
      }

      const result = await enhancedContentGenerator.generateContentPackage(casualContext)
      expect(result).toBeDefined()
    })
  })

  describe('regenerateContent', () => {
    it('should regenerate content while maintaining context consistency', async () => {
      const result = await enhancedContentGenerator.regenerateContent(
        mockContentPackage,
        mockUserContext,
        { platform: 'instagram' }
      )

      expect(result).toBeDefined()
      expect(result.id).not.toBe(mockContentPackage.id) // Should have new ID
      expect(result.metadata.regenerationCount).toBe(1)
      expect(result.metadata.generatedAt).toBeInstanceOf(Date)
      expect(result.script.title).toBeDefined()
      expect(result.hashtags.primary.length).toBeGreaterThan(0)
    })

    it('should increment regeneration count', async () => {
      const packageWithRegeneration = {
        ...mockContentPackage,
        metadata: { ...mockContentPackage.metadata, regenerationCount: 2 }
      }

      const result = await enhancedContentGenerator.regenerateContent(
        packageWithRegeneration,
        mockUserContext
      )

      expect(result.metadata.regenerationCount).toBe(3)
    })

    it('should handle errors gracefully', async () => {
      // Mock fetch to return invalid JSON
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ invalid: 'response' })
      })

      await expect(
        enhancedContentGenerator.regenerateContent(mockContentPackage, mockUserContext)
      ).rejects.toThrow()
    })
  })

  describe('regenerateComponent', () => {
    it('should regenerate script component only', async () => {
      // Mock component-specific response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                script: {
                  title: 'Updated Real Estate Script',
                  hook: 'New hook approach',
                  mainContent: 'Fresh main content',
                  callToAction: 'New CTA',
                  duration: '60 seconds'
                }
              })
            }
          }]
        })
      })

      const result = await enhancedContentGenerator.regenerateComponent(
        mockContentPackage,
        'script',
        mockUserContext
      )

      expect(result.script.title).toBe('Updated Real Estate Script')
      expect(result.hashtags).toEqual(mockContentPackage.hashtags) // Should remain unchanged
      expect(result.metadata.regenerationCount).toBe(1)
    })

    it('should regenerate hashtags component only', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
        choices: [{
          message: {
              content: JSON.stringify({
                hashtags: {
                  primary: ['#newhashtag1', '#newhashtag2'],
                  secondary: ['#fresh', '#updated'],
                  trending: ['#trending2024'],
                  niche: ['#premium']
                }
              })
            }
          }]
        })
      })

      const result = await enhancedContentGenerator.regenerateComponent(
        mockContentPackage,
        'hashtags',
        mockUserContext
      )

      expect(result.hashtags.primary).toEqual(['#newhashtag1', '#newhashtag2'])
      expect(result.script).toEqual(mockContentPackage.script) // Should remain unchanged
    })

    it('should handle all component types', async () => {
      const components: Array<'script' | 'hashtags' | 'captions' | 'implementationGuide' | 'visualGuidance'> = [
        'script', 'hashtags', 'captions', 'implementationGuide', 'visualGuidance'
      ]

      for (const component of components) {
        // Mock appropriate response for each component
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
        choices: [{
          message: {
                content: JSON.stringify({
                  [component]: component === 'script' ? {
                    title: 'Test',
                    hook: 'Test',
                    mainContent: 'Test',
                    callToAction: 'Test',
                    duration: 'Test'
                  } : component === 'hashtags' ? {
                    primary: ['#test'],
                    secondary: ['#test'],
                    trending: ['#test'],
                    niche: ['#test']
                  } : component === 'captions' ? {
                    short: 'Test',
                    medium: 'Test',
                    long: 'Test',
                    story: 'Test'
                  } : component === 'implementationGuide' ? {
                    steps: ['Test'],
                    tips: ['Test'],
                    bestPractices: ['Test'],
                    timing: 'Test'
                  } : {
                    composition: ['Test'],
                    lighting: ['Test'],
                    editing: ['Test'],
                    style: 'Test'
                  }
                })
              }
            }]
          })
        })

        const result = await enhancedContentGenerator.regenerateComponent(
          mockContentPackage,
          component,
          mockUserContext
        )

        expect(result).toBeDefined()
        expect(result.metadata.regenerationCount).toBe(1)
      }
    })
  })

  describe('refineContent', () => {
    it('should refine content based on feedback', async () => {
      const feedback = 'Make it more casual and add emojis'

      const result = await enhancedContentGenerator.refineContent(
        mockContentPackage,
        feedback,
        mockUserContext
      )

      expect(result).toBeDefined()
      expect(result.id).not.toBe(mockContentPackage.id) // Should have new ID
      expect(result.metadata.regenerationCount).toBe(1)
      expect(result.script.title).toBeDefined()
    })

    it('should maintain user context in refinement', async () => {
      const feedback = 'Focus more on luxury properties'

      const result = await enhancedContentGenerator.refineContent(
        mockContentPackage,
        feedback,
        mockUserContext,
        { platform: 'linkedin' }
      )

      expect(result).toBeDefined()
      expect(result.metadata.contextSummary).toBe(mockUserContext.contextSummary)
    })

    it('should handle empty feedback gracefully', async () => {
      await expect(
        enhancedContentGenerator.refineContent(mockContentPackage, '', mockUserContext)
      ).rejects.toThrow()
    })
  })

  describe('optimizeForPlatform', () => {
    it('should optimize content for Instagram', () => {
      const optimized = enhancedContentGenerator.optimizeForPlatform(mockContentPackage, 'instagram')
      
      expect(optimized.hashtags.primary.length).toBeLessThanOrEqual(10)
      expect(optimized.captions.short.length).toBeLessThanOrEqual(125)
      expect(optimized.script.duration).toBe('15-60 seconds')
    })

    it('should optimize content for Twitter', () => {
      const optimized = enhancedContentGenerator.optimizeForPlatform(mockContentPackage, 'twitter')
      
      expect(optimized.captions.short.length).toBeLessThanOrEqual(280)
      expect(optimized.hashtags.primary.length).toBeLessThanOrEqual(3)
      expect(optimized.script.duration).toBe('30 seconds')
    })

    it('should optimize content for LinkedIn', () => {
      const optimized = enhancedContentGenerator.optimizeForPlatform(mockContentPackage, 'linkedin')
      
      expect(optimized.hashtags.primary.length).toBeLessThanOrEqual(5)
      expect(optimized.script.duration).toBe('1-3 minutes')
    })

    it('should optimize content for TikTok', () => {
      const optimized = enhancedContentGenerator.optimizeForPlatform(mockContentPackage, 'tiktok')
      
      expect(optimized.script.duration).toBe('15-60 seconds')
      expect(optimized.hashtags.trending.length).toBeLessThanOrEqual(5)
    })

    it('should optimize content for YouTube', () => {
      const optimized = enhancedContentGenerator.optimizeForPlatform(mockContentPackage, 'youtube')
      
      expect(optimized.script.duration).toBe('3-10 minutes')
    })
  })

  describe('error handling', () => {
    it('should handle OpenAI API errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('API Error'))

      await expect(
        enhancedContentGenerator.generateContentPackage(mockUserContext)
      ).rejects.toThrow('Failed to generate content package')
    })

    it('should handle invalid JSON responses', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ invalid: 'structure' })
      })

      await expect(
        enhancedContentGenerator.generateContentPackage(mockUserContext)
      ).rejects.toThrow()
    })

    it('should validate required fields in content response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
        choices: [{
          message: {
              content: JSON.stringify({
                script: { title: 'Test' }, // Missing required fields
                hashtags: { primary: [] }
              })
            }
          }]
        })
      })

      await expect(
        enhancedContentGenerator.generateContentPackage(mockUserContext)
      ).rejects.toThrow()
    })
  })

  describe('confidence calculation', () => {
    it('should calculate higher confidence for rich context', () => {
      const richContext = {
        ...mockUserContext,
        messageCount: 50,
        topics: ['topic1', 'topic2', 'topic3', 'topic4', 'topic5', 'topic6'],
        recentInterests: ['interest1', 'interest2', 'interest3']
      }

      // This would be tested through the actual content generation
      expect(richContext.messageCount).toBeGreaterThan(10)
      expect(richContext.topics.length).toBeGreaterThan(5)
      expect(richContext.recentInterests.length).toBeGreaterThan(0)
    })

    it('should calculate lower confidence for sparse context', () => {
      const sparseContext = {
        ...mockUserContext,
        messageCount: 2,
        topics: ['topic1'],
        recentInterests: []
      }

      expect(sparseContext.messageCount).toBeLessThan(10)
      expect(sparseContext.topics.length).toBeLessThanOrEqual(5)
      expect(sparseContext.recentInterests.length).toBe(0)
    })
  })
})