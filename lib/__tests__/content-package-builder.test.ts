import { describe, it, expect, beforeEach } from 'vitest'
import {
  ScriptGenerator,
  HashtagGenerator,
  CaptionGenerator,
  ImplementationGuideGenerator,
  VisualGuidanceGenerator,
  ContentPackageBuilder,
  scriptGenerator,
  hashtagGenerator,
  captionGenerator,
  implementationGuideGenerator,
  visualGuidanceGenerator,
  contentPackageBuilder
} from '../content-package-builder'
import type { UserContext } from '../chat-context-analyzer'

// Mock user context for testing
const mockUserContext: UserContext = {
  userId: 'test-user-123',
  topics: ['social media', 'content creation', 'marketing', 'business', 'design'],
  themes: ['content-creation', 'business-growth', 'learning'],
  userStyle: {
    tone: 'professional',
    vocabulary: 'mixed',
    length: 'detailed',
    formality: 'formal'
  },
  recentInterests: ['instagram marketing', 'video content', 'audience engagement'],
  communicationPatterns: {
    questionTypes: ['how-to', 'what-is'],
    responsePreferences: ['step-by-step', 'examples'],
    engagementStyle: 'highly-engaged',
    topicTransitions: ['also', 'furthermore']
  },
  contextSummary: 'User is interested in professional content creation and social media marketing.',
  analyzedAt: new Date(),
  messageCount: 25,
  timeRange: {
    from: new Date('2024-01-01'),
    to: new Date('2024-01-30')
  }
}

const mockCasualUserContext: UserContext = {
  ...mockUserContext,
  userStyle: {
    tone: 'casual',
    vocabulary: 'simple',
    length: 'concise',
    formality: 'informal'
  }
}

describe('ScriptGenerator', () => {
  let generator: ScriptGenerator

  beforeEach(() => {
    generator = new ScriptGenerator()
  })

  describe('generateScript', () => {
    it('should generate a complete script with all required components', () => {
      const result = generator.generateScript(mockUserContext, 'social media marketing', {
        platform: 'instagram',
        contentType: 'video',
        tone: 'professional'
      })

      expect(result).toHaveProperty('title')
      expect(result).toHaveProperty('hook')
      expect(result).toHaveProperty('mainContent')
      expect(result).toHaveProperty('callToAction')
      expect(result).toHaveProperty('duration')

      expect(result.title).toContain('social media marketing')
      expect(result.hook.length).toBeGreaterThan(10)
      expect(result.mainContent.length).toBeGreaterThan(50)
      expect(result.callToAction.length).toBeGreaterThan(10)
      expect(result.duration).toMatch(/\d+/)
    })

    it('should adapt to different user tones', () => {
      const professionalResult = generator.generateScript(mockUserContext, 'content creation', {
        platform: 'linkedin',
        contentType: 'video',
        tone: 'professional'
      })

      const casualResult = generator.generateScript(mockCasualUserContext, 'content creation', {
        platform: 'tiktok',
        contentType: 'video',
        tone: 'casual'
      })

      expect(professionalResult.title).not.toEqual(casualResult.title)
      expect(professionalResult.hook).not.toEqual(casualResult.hook)
    })

    it('should generate platform-specific content', () => {
      const tiktokResult = generator.generateScript(mockUserContext, 'trending tips', {
        platform: 'tiktok',
        contentType: 'video'
      })

      const linkedinResult = generator.generateScript(mockUserContext, 'trending tips', {
        platform: 'linkedin',
        contentType: 'video'
      })

      expect(tiktokResult.hook).toMatch(/POV|Wait|Tell me|This/i)
      expect(linkedinResult.callToAction).toContain('comment')
    })

    it('should adapt content length to user preference', () => {
      const detailedResult = generator.generateScript(mockUserContext, 'marketing strategy', {
        platform: 'instagram',
        contentType: 'video'
      })

      const conciseResult = generator.generateScript(mockCasualUserContext, 'marketing strategy', {
        platform: 'instagram',
        contentType: 'video'
      })

      expect(detailedResult.mainContent.length).toBeGreaterThan(conciseResult.mainContent.length)
    })

    it('should include user interests in content', () => {
      const result = generator.generateScript(mockUserContext, 'video content', {
        platform: 'instagram',
        contentType: 'video'
      })

      const contentLower = result.mainContent.toLowerCase()
      const hasUserInterest = mockUserContext.recentInterests.some(interest => 
        contentLower.includes(interest.toLowerCase())
      )
      expect(hasUserInterest).toBe(true)
    })
  })
})

describe('HashtagGenerator', () => {
  let generator: HashtagGenerator

  beforeEach(() => {
    generator = new HashtagGenerator()
  })

  describe('generateHashtags', () => {
    it('should generate all hashtag categories', () => {
      const result = generator.generateHashtags(mockUserContext, 'content creation', {
        platform: 'instagram',
        maxPrimary: 10,
        maxSecondary: 10,
        includeTrending: true,
        includeNiche: true
      })

      expect(result).toHaveProperty('primary')
      expect(result).toHaveProperty('secondary')
      expect(result).toHaveProperty('trending')
      expect(result).toHaveProperty('niche')

      expect(Array.isArray(result.primary)).toBe(true)
      expect(Array.isArray(result.secondary)).toBe(true)
      expect(Array.isArray(result.trending)).toBe(true)
      expect(Array.isArray(result.niche)).toBe(true)
    })

    it('should respect maximum hashtag limits', () => {
      const result = generator.generateHashtags(mockUserContext, 'marketing', {
        platform: 'instagram',
        maxPrimary: 5,
        maxSecondary: 3
      })

      expect(result.primary.length).toBeLessThanOrEqual(5)
      expect(result.secondary.length).toBeLessThanOrEqual(3)
    })

    it('should include topic-related hashtags', () => {
      const result = generator.generateHashtags(mockUserContext, 'social media', {
        platform: 'instagram'
      })

      const allHashtags = [...result.primary, ...result.secondary].join(' ').toLowerCase()
      expect(allHashtags).toMatch(/(social|media|content|marketing)/i)
    })

    it('should generate platform-specific hashtags', () => {
      const instagramResult = generator.generateHashtags(mockUserContext, 'content', {
        platform: 'instagram'
      })

      const tiktokResult = generator.generateHashtags(mockUserContext, 'content', {
        platform: 'tiktok'
      })

      const instagramTags = [...instagramResult.trending, ...instagramResult.primary].join(' ')
      const tiktokTags = [...tiktokResult.trending, ...tiktokResult.primary].join(' ')

      expect(instagramTags).toMatch(/#(insta|ig|explore|reels)/i)
      expect(tiktokTags).toMatch(/#(fyp|foryou|tiktok)/i)
    })

    it('should remove duplicate hashtags within each category', () => {
      const result = generator.generateHashtags(mockUserContext, 'marketing', {
        platform: 'instagram'
      })

      // Check that each category has no internal duplicates
      expect(result.primary.length).toEqual([...new Set(result.primary)].length)
      expect(result.secondary.length).toEqual([...new Set(result.secondary)].length)
      expect(result.trending.length).toEqual([...new Set(result.trending)].length)
      expect(result.niche.length).toEqual([...new Set(result.niche)].length)

      // Also verify that all hashtags are properly formatted
      const allHashtags = [...result.primary, ...result.secondary, ...result.trending, ...result.niche]
      allHashtags.forEach(hashtag => {
        expect(hashtag).toMatch(/^#[a-z0-9]+$/i)
        expect(hashtag.length).toBeGreaterThan(1)
      })
    })

    it('should format hashtags correctly', () => {
      const result = generator.generateHashtags(mockUserContext, 'social media marketing', {
        platform: 'instagram'
      })

      result.primary.forEach(hashtag => {
        expect(hashtag).toMatch(/^#[a-z0-9]+$/i)
        expect(hashtag).not.toContain(' ')
        expect(hashtag).not.toContain('-')
      })
    })

    it('should include user context in niche hashtags', () => {
      const result = generator.generateHashtags(mockUserContext, 'content', {
        platform: 'instagram',
        includeNiche: true
      })

      const nicheHashtags = result.niche.join(' ').toLowerCase()
      const hasUserTopic = mockUserContext.topics.some(topic => 
        nicheHashtags.includes(topic.replace(/\s+/g, ''))
      )
      expect(hasUserTopic).toBe(true)
    })
  })
})

describe('CaptionGenerator', () => {
  let generator: CaptionGenerator

  beforeEach(() => {
    generator = new CaptionGenerator()
  })

  const mockScript = {
    title: 'How to Create Engaging Content',
    hook: 'Want to know the secret to viral content?',
    mainContent: 'Here are the key strategies for creating content that resonates with your audience and drives engagement.',
    callToAction: 'Share your thoughts in the comments!'
  }

  describe('generateCaptions', () => {
    it('should generate all requested caption lengths', () => {
      const result = generator.generateCaptions(
        mockUserContext,
        'content creation',
        mockScript,
        {
          platform: 'instagram',
          lengths: ['short', 'medium', 'long', 'story']
        }
      )

      expect(result).toHaveProperty('short')
      expect(result).toHaveProperty('medium')
      expect(result).toHaveProperty('long')
      expect(result).toHaveProperty('story')

      expect(result.short.length).toBeGreaterThan(0)
      expect(result.medium.length).toBeGreaterThan(0)
      expect(result.long.length).toBeGreaterThan(0)
      expect(result.story.length).toBeGreaterThan(0)
    })

    it('should respect platform character limits', () => {
      const twitterResult = generator.generateCaptions(
        mockUserContext,
        'quick tips',
        mockScript,
        {
          platform: 'twitter',
          lengths: ['short']
        }
      )

      const instagramResult = generator.generateCaptions(
        mockUserContext,
        'quick tips',
        mockScript,
        {
          platform: 'instagram',
          lengths: ['short']
        }
      )

      expect(twitterResult.short.length).toBeLessThanOrEqual(280)
      expect(instagramResult.short.length).toBeLessThanOrEqual(125)
    })

    it('should include emojis when requested', () => {
      const withEmojis = generator.generateCaptions(
        mockUserContext,
        'content tips',
        mockScript,
        {
          platform: 'instagram',
          lengths: ['short'],
          includeEmojis: true
        }
      )

      const withoutEmojis = generator.generateCaptions(
        mockUserContext,
        'content tips',
        mockScript,
        {
          platform: 'linkedin',
          lengths: ['short'],
          includeEmojis: false
        }
      )

      const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u
      
      expect(emojiRegex.test(withEmojis.short)).toBe(true)
      expect(emojiRegex.test(withoutEmojis.short)).toBe(false)
    })

    it('should include call to action when requested', () => {
      const withCTA = generator.generateCaptions(
        mockUserContext,
        'engagement tips',
        mockScript,
        {
          platform: 'instagram',
          lengths: ['medium'],
          includeCallToAction: true
        }
      )

      const withoutCTA = generator.generateCaptions(
        mockUserContext,
        'engagement tips',
        mockScript,
        {
          platform: 'instagram',
          lengths: ['medium'],
          includeCallToAction: false
        }
      )

      expect(withCTA.medium).toContain(mockScript.callToAction)
      expect(withoutCTA.medium).not.toContain(mockScript.callToAction)
    })

    it('should adapt content length appropriately', () => {
      const result = generator.generateCaptions(
        mockUserContext,
        'social media',
        mockScript,
        {
          platform: 'instagram',
          lengths: ['short', 'medium', 'long']
        }
      )

      expect(result.short.length).toBeLessThan(result.medium.length)
      expect(result.medium.length).toBeLessThan(result.long.length)
    })

    it('should include user interests in long captions', () => {
      const result = generator.generateCaptions(
        mockUserContext,
        'content strategy',
        mockScript,
        {
          platform: 'instagram',
          lengths: ['long']
        }
      )

      const captionLower = result.long.toLowerCase()
      const hasUserInterest = mockUserContext.recentInterests.some(interest => 
        captionLower.includes(interest.toLowerCase())
      )
      expect(hasUserInterest).toBe(true)
    })
  })
})

describe('ImplementationGuideGenerator', () => {
  let generator: ImplementationGuideGenerator

  beforeEach(() => {
    generator = new ImplementationGuideGenerator()
  })

  const mockScript = {
    title: 'Content Strategy Guide',
    hook: 'Ready to level up your content?',
    mainContent: 'Here\'s how to create a winning content strategy that drives results.',
    callToAction: 'Start implementing these tips today!'
  }

  describe('generateGuide', () => {
    it('should generate a complete implementation guide', () => {
      const result = generator.generateGuide(
        mockUserContext,
        'content strategy',
        mockScript,
        {
          platform: 'instagram',
          includeTimingAdvice: true,
          includeBestPractices: true,
          stepDetail: 'detailed'
        }
      )

      expect(result).toHaveProperty('steps')
      expect(result).toHaveProperty('tips')
      expect(result).toHaveProperty('bestPractices')
      expect(result).toHaveProperty('timing')

      expect(Array.isArray(result.steps)).toBe(true)
      expect(Array.isArray(result.tips)).toBe(true)
      expect(Array.isArray(result.bestPractices)).toBe(true)
      expect(typeof result.timing).toBe('string')
    })

    it('should adapt step detail level', () => {
      const basicResult = generator.generateGuide(
        mockUserContext,
        'social media',
        mockScript,
        {
          platform: 'instagram',
          stepDetail: 'basic'
        }
      )

      const expertResult = generator.generateGuide(
        mockUserContext,
        'social media',
        mockScript,
        {
          platform: 'instagram',
          stepDetail: 'expert'
        }
      )

      expect(basicResult.steps.length).toBeLessThan(expertResult.steps.length)
      expect(expertResult.steps.join(' ').length).toBeGreaterThan(basicResult.steps.join(' ').length)
    })

    it('should include platform-specific tips', () => {
      const instagramResult = generator.generateGuide(
        mockUserContext,
        'content creation',
        mockScript,
        {
          platform: 'instagram',
          stepDetail: 'detailed'
        }
      )

      const linkedinResult = generator.generateGuide(
        mockUserContext,
        'content creation',
        mockScript,
        {
          platform: 'linkedin',
          stepDetail: 'detailed'
        }
      )

      const instagramTips = instagramResult.tips.join(' ').toLowerCase()
      const linkedinTips = linkedinResult.tips.join(' ').toLowerCase()

      expect(instagramTips).toMatch(/(instagram|stories|reels)/i)
      expect(linkedinTips).toMatch(/(professional|industry|business)/i)
    })

    it('should provide platform-specific timing advice', () => {
      const instagramResult = generator.generateGuide(
        mockUserContext,
        'engagement',
        mockScript,
        {
          platform: 'instagram',
          includeTimingAdvice: true,
          stepDetail: 'basic'
        }
      )

      const linkedinResult = generator.generateGuide(
        mockUserContext,
        'engagement',
        mockScript,
        {
          platform: 'linkedin',
          includeTimingAdvice: true,
          stepDetail: 'basic'
        }
      )

      expect(instagramResult.timing).toMatch(/(11 AM|1 PM|7 PM|9 PM)/i)
      expect(linkedinResult.timing).toMatch(/(8 AM|10 AM|12 PM|2 PM|business hours)/i)
    })

    it('should include best practices when requested', () => {
      const withBestPractices = generator.generateGuide(
        mockUserContext,
        'content strategy',
        mockScript,
        {
          platform: 'instagram',
          includeBestPractices: true,
          stepDetail: 'detailed'
        }
      )

      const withoutBestPractices = generator.generateGuide(
        mockUserContext,
        'content strategy',
        mockScript,
        {
          platform: 'instagram',
          includeBestPractices: false,
          stepDetail: 'detailed'
        }
      )

      expect(withBestPractices.bestPractices.length).toBeGreaterThan(0)
      expect(withoutBestPractices.bestPractices.length).toBe(0)
    })

    it('should reference user communication style in tips', () => {
      const result = generator.generateGuide(
        mockUserContext,
        'audience engagement',
        mockScript,
        {
          platform: 'instagram',
          stepDetail: 'detailed'
        }
      )

      const tipsText = result.tips.join(' ').toLowerCase()
      expect(tipsText).toContain(mockUserContext.userStyle.tone)
    })
  })
})

describe('VisualGuidanceGenerator', () => {
  let generator: VisualGuidanceGenerator

  beforeEach(() => {
    generator = new VisualGuidanceGenerator()
  })

  describe('generateVisualGuidance', () => {
    it('should generate complete visual guidance', () => {
      const result = generator.generateVisualGuidance(
        mockUserContext,
        'content creation',
        {
          platform: 'instagram',
          contentType: 'video',
          style: 'professional'
        }
      )

      expect(result).toHaveProperty('composition')
      expect(result).toHaveProperty('lighting')
      expect(result).toHaveProperty('editing')
      expect(result).toHaveProperty('style')

      expect(Array.isArray(result.composition)).toBe(true)
      expect(Array.isArray(result.lighting)).toBe(true)
      expect(Array.isArray(result.editing)).toBe(true)
      expect(typeof result.style).toBe('string')
    })

    it('should adapt to different content types', () => {
      const videoResult = generator.generateVisualGuidance(
        mockUserContext,
        'tutorials',
        {
          platform: 'youtube',
          contentType: 'video',
          style: 'professional'
        }
      )

      const imageResult = generator.generateVisualGuidance(
        mockUserContext,
        'tutorials',
        {
          platform: 'instagram',
          contentType: 'image',
          style: 'professional'
        }
      )

      const videoGuidance = videoResult.composition.join(' ')
      const imageGuidance = imageResult.composition.join(' ')

      expect(videoGuidance).toMatch(/(video|camera|movement)/i)
      expect(imageGuidance).toMatch(/(focal point|balance|visual)/i)
    })

    it('should provide platform-specific guidance', () => {
      const instagramResult = generator.generateVisualGuidance(
        mockUserContext,
        'lifestyle content',
        {
          platform: 'instagram',
          contentType: 'image',
          style: 'vibrant'
        }
      )

      const tiktokResult = generator.generateVisualGuidance(
        mockUserContext,
        'lifestyle content',
        {
          platform: 'tiktok',
          contentType: 'video',
          style: 'vibrant'
        }
      )

      const instagramGuidance = instagramResult.composition.join(' ')
      const tiktokGuidance = tiktokResult.composition.join(' ')

      expect(instagramGuidance).toMatch(/(square|vertical)/i)
      expect(tiktokGuidance).toMatch(/(vertical|9:16)/i)
    })

    it('should adapt to different visual styles', () => {
      const professionalResult = generator.generateVisualGuidance(
        mockUserContext,
        'business content',
        {
          platform: 'linkedin',
          contentType: 'image',
          style: 'professional'
        }
      )

      const creativeResult = generator.generateVisualGuidance(
        mockUserContext,
        'business content',
        {
          platform: 'instagram',
          contentType: 'image',
          style: 'creative'
        }
      )

      const professionalStyle = professionalResult.style.toLowerCase()
      const creativeStyle = creativeResult.style.toLowerCase()

      expect(professionalStyle).toMatch(/(clean|polished|credible|professional)/i)
      expect(creativeStyle).toMatch(/(bold|artistic|creative|unique)/i)
    })

    it('should include user communication style in recommendations', () => {
      const result = generator.generateVisualGuidance(
        mockUserContext,
        'personal branding',
        {
          platform: 'instagram',
          contentType: 'video',
          style: 'professional'
        }
      )

      expect(result.style.toLowerCase()).toContain('professional')
    })

    it('should provide appropriate lighting guidance by style', () => {
      const minimalResult = generator.generateVisualGuidance(
        mockUserContext,
        'productivity tips',
        {
          platform: 'youtube',
          contentType: 'video',
          style: 'minimal'
        }
      )

      const vibrantResult = generator.generateVisualGuidance(
        mockUserContext,
        'productivity tips',
        {
          platform: 'tiktok',
          contentType: 'video',
          style: 'vibrant'
        }
      )

      const minimalLighting = minimalResult.lighting.join(' ').toLowerCase()
      const vibrantLighting = vibrantResult.lighting.join(' ').toLowerCase()

      expect(minimalLighting).toMatch(/(soft|even|simple|clean)/i)
      expect(vibrantLighting).toMatch(/(bright|energetic|vibrant)/i)
    })
  })
})

describe('ContentPackageBuilder', () => {
  let builder: ContentPackageBuilder

  beforeEach(() => {
    builder = new ContentPackageBuilder()
  })

  describe('buildContentPackage', () => {
    it('should build a complete content package', () => {
      const result = builder.buildContentPackage(
        mockUserContext,
        'social media strategy',
        {
          platform: 'instagram',
          contentType: 'video',
          tone: 'professional',
          length: 'medium'
        }
      )

      expect(result).toHaveProperty('script')
      expect(result).toHaveProperty('hashtags')
      expect(result).toHaveProperty('captions')
      expect(result).toHaveProperty('implementationGuide')
      expect(result).toHaveProperty('visualGuidance')

      // Verify script structure
      expect(result.script).toHaveProperty('title')
      expect(result.script).toHaveProperty('hook')
      expect(result.script).toHaveProperty('mainContent')
      expect(result.script).toHaveProperty('callToAction')
      expect(result.script).toHaveProperty('duration')

      // Verify hashtags structure
      expect(result.hashtags).toHaveProperty('primary')
      expect(result.hashtags).toHaveProperty('secondary')
      expect(result.hashtags).toHaveProperty('trending')
      expect(result.hashtags).toHaveProperty('niche')

      // Verify captions structure
      expect(result.captions).toHaveProperty('short')
      expect(result.captions).toHaveProperty('medium')
      expect(result.captions).toHaveProperty('long')
      expect(result.captions).toHaveProperty('story')

      // Verify implementation guide structure
      expect(result.implementationGuide).toHaveProperty('steps')
      expect(result.implementationGuide).toHaveProperty('tips')
      expect(result.implementationGuide).toHaveProperty('bestPractices')
      expect(result.implementationGuide).toHaveProperty('timing')

      // Verify visual guidance structure
      expect(result.visualGuidance).toHaveProperty('composition')
      expect(result.visualGuidance).toHaveProperty('lighting')
      expect(result.visualGuidance).toHaveProperty('editing')
      expect(result.visualGuidance).toHaveProperty('style')
    })

    it('should handle different content lengths', () => {
      const shortResult = builder.buildContentPackage(
        mockUserContext,
        'quick tips',
        { length: 'short' }
      )

      const longResult = builder.buildContentPackage(
        mockUserContext,
        'quick tips',
        { length: 'long' }
      )

      expect(shortResult.script.duration).toContain('15-30')
      expect(longResult.script.duration).toContain('60-180')
      expect(shortResult.implementationGuide.steps.length).toBeLessThan(longResult.implementationGuide.steps.length)
    })

    it('should adapt to different platforms', () => {
      const instagramResult = builder.buildContentPackage(
        mockUserContext,
        'content creation',
        { platform: 'instagram' }
      )

      const linkedinResult = builder.buildContentPackage(
        mockUserContext,
        'content creation',
        { platform: 'linkedin' }
      )

      // Instagram should exclude emojis for LinkedIn, include for Instagram
      expect(instagramResult.captions.short).toMatch(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]/u)
      
      // Different hashtag strategies
      const instagramHashtags = instagramResult.hashtags.trending.join(' ')
      const linkedinHashtags = linkedinResult.hashtags.trending.join(' ')
      
      expect(instagramHashtags).toMatch(/#(viral|trending|explore|reels)/i)
      expect(linkedinHashtags).toMatch(/#(professional|business|networking)/i)
    })

    it('should incorporate user context consistently', () => {
      const result = builder.buildContentPackage(
        mockUserContext,
        'audience engagement',
        {
          platform: 'instagram',
          contentType: 'video'
        }
      )

      // Check if user topics appear in hashtags
      const allHashtags = [
        ...result.hashtags.primary,
        ...result.hashtags.secondary,
        ...result.hashtags.niche
      ].join(' ').toLowerCase()

      const hasUserTopic = mockUserContext.topics.some(topic => 
        allHashtags.includes(topic.replace(/\s+/g, ''))
      )
      expect(hasUserTopic).toBe(true)

      // Check if user interests appear in content
      const contentText = [
        result.script.mainContent,
        result.captions.long
      ].join(' ').toLowerCase()

      const hasUserInterest = mockUserContext.recentInterests.some(interest => 
        contentText.includes(interest.toLowerCase())
      )
      expect(hasUserInterest).toBe(true)
    })

    it('should use default options when none provided', () => {
      const result = builder.buildContentPackage(
        mockUserContext,
        'default content'
      )

      expect(result.script.duration).toContain('30-60') // medium length default
      expect(result.hashtags.primary.length).toBeGreaterThan(0)
      expect(result.captions.short.length).toBeGreaterThan(0)
      expect(result.implementationGuide.steps.length).toBeGreaterThan(0)
      expect(result.visualGuidance.composition.length).toBeGreaterThan(0)
    })
  })
})

// Test singleton instances
describe('Singleton Instances', () => {
  it('should export working singleton instances', () => {
    expect(scriptGenerator).toBeInstanceOf(ScriptGenerator)
    expect(hashtagGenerator).toBeInstanceOf(HashtagGenerator)
    expect(captionGenerator).toBeInstanceOf(CaptionGenerator)
    expect(implementationGuideGenerator).toBeInstanceOf(ImplementationGuideGenerator)
    expect(visualGuidanceGenerator).toBeInstanceOf(VisualGuidanceGenerator)
    expect(contentPackageBuilder).toBeInstanceOf(ContentPackageBuilder)
  })

  it('should have singleton instances work correctly', () => {
    const result = contentPackageBuilder.buildContentPackage(
      mockUserContext,
      'singleton test'
    )

    expect(result).toHaveProperty('script')
    expect(result).toHaveProperty('hashtags')
    expect(result).toHaveProperty('captions')
    expect(result).toHaveProperty('implementationGuide')
    expect(result).toHaveProperty('visualGuidance')
  })
}) 