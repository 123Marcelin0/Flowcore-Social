import { type UserContext } from './chat-context-analyzer'
import { type SocialPlatform, type GenerationOptions } from './enhanced-content-generator'

// Individual component interfaces
export interface ScriptGeneratorOptions {
  platform: SocialPlatform
  contentType: 'video' | 'image' | 'text' | 'reel' | 'story' | 'carousel'
  duration?: string
  tone?: 'professional' | 'casual' | 'friendly' | 'authoritative'
}

export interface HashtagGeneratorOptions {
  platform: SocialPlatform
  maxPrimary?: number
  maxSecondary?: number
  includeTrending?: boolean
  includeNiche?: boolean
}

export interface CaptionGeneratorOptions {
  platform: SocialPlatform
  lengths: ('short' | 'medium' | 'long' | 'story')[]
  includeEmojis?: boolean
  includeCallToAction?: boolean
}

export interface GuideGeneratorOptions {
  platform: SocialPlatform
  includeTimingAdvice?: boolean
  includeBestPractices?: boolean
  stepDetail: 'basic' | 'detailed' | 'expert'
}

export interface VisualGuidanceOptions {
  platform: SocialPlatform
  contentType: 'video' | 'image' | 'carousel' | 'story'
  style?: 'minimal' | 'vibrant' | 'professional' | 'creative'
}

/**
 * Script Generator - Creates structured content scripts
 */
export class ScriptGenerator {
  /**
   * Generates a structured script with hook, main content, and CTA
   */
  generateScript(
    userContext: UserContext,
    topic: string,
    options: ScriptGeneratorOptions
  ): {
    title: string
    hook: string
    mainContent: string
    callToAction: string
    duration: string
  } {
    const { platform, contentType, duration, tone } = options
    const userTone = tone || userContext.userStyle.tone
    
    // Generate title based on topic and user style
    const title = this.generateTitle(topic, userTone, platform)
    
    // Create attention-grabbing hook
    const hook = this.generateHook(topic, userTone, platform, contentType)
    
    // Build main content structure
    const mainContent = this.generateMainContent(
      topic,
      userContext,
      userTone,
      platform,
      contentType
    )
    
    // Create compelling call to action
    const callToAction = this.generateCallToAction(userTone, platform, contentType)
    
    // Determine optimal duration
    const optimalDuration = duration || this.getOptimalDuration(platform, contentType)
    
    return {
      title,
      hook,
      mainContent,
      callToAction,
      duration: optimalDuration
    }
  }

  private generateTitle(topic: string, tone: string, platform: SocialPlatform): string {
    const titleTemplates = {
      professional: [
        `How to Master ${topic}: A Complete Guide`,
        `The Ultimate ${topic} Strategy for 2024`,
        `5 Essential ${topic} Tips Every Professional Should Know`,
        `Transform Your ${topic} Approach with These Proven Methods`
      ],
      casual: [
        `${topic} Made Simple (You'll Love This!)`,
        `Why Everyone's Talking About ${topic}`,
        `The ${topic} Hack That Changed Everything`,
        `${topic}: What Nobody Tells You`
      ],
      friendly: [
        `Let's Talk About ${topic} - My Personal Experience`,
        `${topic}: What I Wish I Knew Earlier`,
        `Sharing My ${topic} Journey with You`,
        `${topic} Tips from a Friend`
      ],
      authoritative: [
        `The Definitive Guide to ${topic}`,
        `${topic}: Industry Expert Insights`,
        `Master ${topic} with These Advanced Strategies`,
        `${topic} Best Practices from the Pros`
      ]
    }

    const templates = titleTemplates[tone as keyof typeof titleTemplates] || titleTemplates.professional
    const randomTemplate = templates[Math.floor(Math.random() * templates.length)]
    
    return randomTemplate
  }

  private generateHook(
    topic: string,
    tone: string,
    platform: SocialPlatform,
    contentType: string
  ): string {
    const hookStrategies = {
      question: [
        `Did you know that 90% of people struggle with ${topic}?`,
        `What if I told you ${topic} could be 10x easier?`,
        `Ever wondered why ${topic} feels so complicated?`
      ],
      statement: [
        `This ${topic} tip will blow your mind.`,
        `I've been doing ${topic} wrong for years.`,
        `The ${topic} secret nobody talks about.`
      ],
      story: [
        `Last week, I discovered something about ${topic}...`,
        `My ${topic} journey started with a simple mistake...`,
        `Here's what happened when I tried ${topic}...`
      ],
      urgency: [
        `Stop doing ${topic} the hard way.`,
        `You're missing out on ${topic} opportunities.`,
        `Don't make these ${topic} mistakes.`
      ]
    }

    // Platform-specific hook optimization
    if (platform === 'tiktok') {
      const tiktokHooks = [
        `POV: You finally understand ${topic}`,
        `Wait... this ${topic} hack is genius`,
        `Tell me you do ${topic} without telling me`,
        `This ${topic} trend is everywhere for a reason`
      ]
      return tiktokHooks[Math.floor(Math.random() * tiktokHooks.length)]
    }

    // Select hook strategy based on tone
    const strategy = tone === 'casual' ? 'statement' : 
                    tone === 'friendly' ? 'story' : 
                    tone === 'authoritative' ? 'urgency' : 'question'
    
    const hooks = hookStrategies[strategy]
    return hooks[Math.floor(Math.random() * hooks.length)]
  }

  private generateMainContent(
    topic: string,
    userContext: UserContext,
    tone: string,
    platform: SocialPlatform,
    contentType: string
  ): string {
    const userInterests = userContext.recentInterests.slice(0, 3)
    const userTopics = userContext.topics.slice(0, 5)
    
    // Build content structure based on user's communication length preference
    const isDetailed = userContext.userStyle.length === 'detailed'
    const isConcise = userContext.userStyle.length === 'concise'
    
    let content = ''
    
    if (isConcise) {
      content = this.generateConciseContent(topic, userInterests, tone)
    } else if (isDetailed) {
      content = this.generateDetailedContent(topic, userInterests, userTopics, tone)
    } else {
      content = this.generateBalancedContent(topic, userInterests, tone)
    }
    
    // Add platform-specific optimizations
    if (platform === 'linkedin') {
      content += `\n\nThis connects to broader trends in ${userTopics.slice(0, 2).join(' and ')}.`
    } else if (platform === 'instagram' && contentType === 'reel') {
      content = this.optimizeForInstagramReel(content)
    }
    
    return content
  }

  private generateConciseContent(topic: string, interests: string[], tone: string): string {
    return `Here's the key to ${topic}:

1. Start with the basics
2. Focus on what matters most
3. Take action immediately

${interests.length > 0 ? `Perfect for anyone interested in ${interests[0]}.` : ''}`
  }

  private generateDetailedContent(
    topic: string,
    interests: string[],
    topics: string[],
    tone: string
  ): string {
    return `Let me break down ${topic} for you:

**The Foundation:**
Understanding ${topic} starts with recognizing its core principles. Most people jump in without proper preparation, which leads to frustration and poor results.

**Key Components:**
1. **Planning Phase** - Map out your approach
2. **Execution Phase** - Implement with consistency
3. **Optimization Phase** - Refine based on results

**Real-World Application:**
${interests.length > 0 ? `This is especially relevant if you're working with ${interests.join(', ')}.` : 'Apply these concepts to your specific situation.'}

**Advanced Considerations:**
${topics.length > 0 ? `Consider how this integrates with ${topics.slice(0, 2).join(' and ')}.` : 'Think about long-term implications and scalability.'}

The key is consistent application and continuous improvement.`
  }

  private generateBalancedContent(topic: string, interests: string[], tone: string): string {
    return `Here's what you need to know about ${topic}:

**The Problem:** Most approaches to ${topic} are overcomplicated or miss the mark entirely.

**The Solution:** Focus on these three core elements:
• Clear understanding of fundamentals
• Practical implementation steps
• Consistent measurement and adjustment

**Why This Matters:** ${interests.length > 0 ? `Especially for ${interests[0]} enthusiasts,` : 'For anyone serious about results,'} getting ${topic} right can be a game-changer.

**Next Steps:** Start with one element, master it, then move to the next.`
  }

  private optimizeForInstagramReel(content: string): string {
    // Instagram reels need shorter, punchier content
    const sentences = content.split('. ')
    const shortened = sentences.slice(0, 3).join('. ')
    return shortened + (shortened.endsWith('.') ? '' : '.')
  }

  private generateCallToAction(
    tone: string,
    platform: SocialPlatform,
    contentType: string
  ): string {
    const ctaTemplates = {
      engagement: [
        'What\'s your experience with this? Share in the comments!',
        'Drop a 💡 if this was helpful!',
        'Tag someone who needs to see this!',
        'Save this for later and share your thoughts!'
      ],
      follow: [
        'Follow for more tips like this!',
        'Hit that follow button for daily insights!',
        'Don\'t miss out - follow for more content!',
        'Join our community by following!'
      ],
      action: [
        'Try this today and let me know how it goes!',
        'Take action on this right now!',
        'Implement this and see the difference!',
        'Put this into practice immediately!'
      ],
      share: [
        'Share this with someone who needs it!',
        'Spread the word - share this post!',
        'Help others by sharing this insight!',
        'Pass this along to your network!'
      ]
    }

    // Platform-specific CTA optimization
    if (platform === 'linkedin') {
      return 'What are your thoughts on this approach? I\'d love to hear your perspective in the comments.'
    } else if (platform === 'tiktok') {
      return 'Follow for more tips! 🔥 #ContentTips'
    } else if (platform === 'youtube') {
      return 'Subscribe and hit the bell for more content like this! What should I cover next?'
    }

    // Default CTA based on tone
    const ctaType = tone === 'professional' ? 'engagement' : 
                   tone === 'casual' ? 'follow' : 
                   tone === 'authoritative' ? 'action' : 'share'
    
    const ctas = ctaTemplates[ctaType]
    return ctas[Math.floor(Math.random() * ctas.length)]
  }

  private getOptimalDuration(platform: SocialPlatform, contentType: string): string {
    const durations = {
      instagram: {
        video: '15-60 seconds',
        reel: '15-30 seconds',
        story: '15 seconds',
        image: 'N/A',
        carousel: 'N/A'
      },
      tiktok: {
        video: '15-60 seconds',
        default: '15-30 seconds'
      },
      youtube: {
        video: '3-10 minutes',
        short: '15-60 seconds',
        default: '5-8 minutes'
      },
      linkedin: {
        video: '30 seconds - 3 minutes',
        default: '1-2 minutes'
      },
      twitter: {
        video: '30 seconds',
        default: '30 seconds'
      }
    }

    const platformDurations = durations[platform as keyof typeof durations]
    if (platformDurations && typeof platformDurations === 'object') {
      return platformDurations[contentType as keyof typeof platformDurations] || 
             platformDurations.default || 
             '30-60 seconds'
    }

    return '30-60 seconds'
  }
}

/**
 * Hashtag Generator - Creates relevant hashtags using context analysis
 */
export class HashtagGenerator {
  private trendingHashtags: Record<SocialPlatform, string[]> = {
    instagram: ['#viral', '#trending', '#explore', '#reels', '#instagood', '#photooftheday'],
    tiktok: ['#fyp', '#foryou', '#viral', '#trending', '#tiktok', '#foryoupage'],
    twitter: ['#trending', '#viral', '#twitter', '#socialmedia', '#content'],
    linkedin: ['#professional', '#business', '#networking', '#career', '#leadership'],
    youtube: ['#youtube', '#subscribe', '#viral', '#trending', '#content'],
    facebook: ['#facebook', '#social', '#community', '#share', '#viral'],
    pinterest: ['#pinterest', '#inspiration', '#ideas', '#creative', '#diy']
  }

  /**
   * Generates hashtags based on context analysis and trending data
   */
  generateHashtags(
    userContext: UserContext,
    topic: string,
    options: HashtagGeneratorOptions
  ): {
    primary: string[]
    secondary: string[]
    trending: string[]
    niche: string[]
  } {
    const { platform, maxPrimary = 10, maxSecondary = 10, includeTrending = true, includeNiche = true } = options

    // Generate primary hashtags from topic and user context
    const primary = this.generatePrimaryHashtags(topic, userContext, platform, maxPrimary)
    
    // Generate secondary hashtags from user topics and interests
    const secondary = this.generateSecondaryHashtags(userContext, platform, maxSecondary)
    
    // Get trending hashtags for platform
    const trending = includeTrending ? this.getTrendingHashtags(platform, topic) : []
    
    // Generate niche hashtags based on user's specific interests
    const niche = includeNiche ? this.generateNicheHashtags(userContext, topic, platform) : []

    return {
      primary: this.removeDuplicates(primary),
      secondary: this.removeDuplicates(secondary),
      trending: this.removeDuplicates(trending),
      niche: this.removeDuplicates(niche)
    }
  }

  private generatePrimaryHashtags(
    topic: string,
    userContext: UserContext,
    platform: SocialPlatform,
    maxCount: number
  ): string[] {
    const hashtags: string[] = []
    
    // Add main topic hashtag
    hashtags.push(`#${this.formatHashtag(topic)}`)
    
    // Add variations of the main topic
    const topicWords = topic.toLowerCase().split(' ')
    if (topicWords.length > 1) {
      hashtags.push(`#${topicWords.join('')}`) // Combined version
      hashtags.push(`#${topicWords[0]}`) // First word
    }
    
    // Add hashtags from user's top topics
    userContext.topics.slice(0, 5).forEach(userTopic => {
      const formatted = this.formatHashtag(userTopic)
      if (formatted && formatted.length > 2) {
        hashtags.push(`#${formatted}`)
      }
    })
    
    // Add platform-specific content hashtags
    const platformSpecific = this.getPlatformSpecificHashtags(platform, topic)
    hashtags.push(...platformSpecific)
    
    return hashtags.slice(0, maxCount)
  }

  private generateSecondaryHashtags(
    userContext: UserContext,
    platform: SocialPlatform,
    maxCount: number
  ): string[] {
    const hashtags: string[] = []
    
    // Add hashtags from user's recent interests
    userContext.recentInterests.forEach(interest => {
      const formatted = this.formatHashtag(interest)
      if (formatted && formatted.length > 2) {
        hashtags.push(`#${formatted}`)
      }
    })
    
    // Add theme-based hashtags
    userContext.themes.forEach(theme => {
      const themeHashtags = this.getThemeHashtags(theme)
      hashtags.push(...themeHashtags)
    })
    
    // Add general engagement hashtags for platform
    const engagementHashtags = this.getEngagementHashtags(platform)
    hashtags.push(...engagementHashtags)
    
    return hashtags.slice(0, maxCount)
  }

  private getTrendingHashtags(platform: SocialPlatform, topic: string): string[] {
    const baseTrending = this.trendingHashtags[platform] || []
    
    // Add topic-specific trending hashtags
    const topicTrending = this.getTopicTrendingHashtags(topic, platform)
    
    return [...baseTrending.slice(0, 3), ...topicTrending].slice(0, 5)
  }

  private generateNicheHashtags(
    userContext: UserContext,
    topic: string,
    platform: SocialPlatform
  ): string[] {
    const hashtags: string[] = []
    
    // Create niche combinations
    const topTopics = userContext.topics.slice(0, 3)
    topTopics.forEach(userTopic => {
      const combination = `${topic}${userTopic}`.replace(/\s+/g, '').toLowerCase()
      if (combination.length < 30) {
        hashtags.push(`#${combination}`)
      }
    })
    
    // Add micro-niche hashtags based on user style
    const styleHashtags = this.getStyleBasedHashtags(userContext.userStyle, topic)
    hashtags.push(...styleHashtags)
    
    // Add community hashtags
    const communityHashtags = this.getCommunityHashtags(topic, platform)
    hashtags.push(...communityHashtags)
    
    return hashtags.slice(0, 5)
  }

  private formatHashtag(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '') // Remove spaces
      .trim()
  }

  private getPlatformSpecificHashtags(platform: SocialPlatform, topic: string): string[] {
    const platformHashtags = {
      instagram: ['#insta', '#ig', '#content', '#creator'],
      tiktok: ['#tiktok', '#content', '#creator', '#tips'],
      linkedin: ['#professional', '#business', '#career', '#industry'],
      youtube: ['#youtube', '#video', '#tutorial', '#howto'],
      twitter: ['#thread', '#tips', '#advice', '#community'],
      facebook: ['#community', '#discussion', '#tips', '#advice'],
      pinterest: ['#ideas', '#inspiration', '#creative', '#diy']
    }
    
    return platformHashtags[platform] || []
  }

  private getThemeHashtags(theme: string): string[] {
    const themeMap = {
      'content-creation': ['#contentcreator', '#content', '#creative', '#creation'],
      'business-growth': ['#business', '#growth', '#entrepreneur', '#success'],
      'learning': ['#learning', '#education', '#knowledge', '#skills'],
      'problem-solving': ['#solutions', '#problemsolving', '#help', '#tips'],
      'planning': ['#planning', '#strategy', '#goals', '#organization'],
      'analysis': ['#analysis', '#data', '#insights', '#research'],
      'creativity': ['#creative', '#innovation', '#art', '#design'],
      'productivity': ['#productivity', '#efficiency', '#workflow', '#optimization']
    }
    
    return themeMap[theme as keyof typeof themeMap] || []
  }

  private getEngagementHashtags(platform: SocialPlatform): string[] {
    const engagementMap = {
      instagram: ['#like', '#follow', '#share', '#save'],
      tiktok: ['#duet', '#stitch', '#share', '#follow'],
      linkedin: ['#connect', '#network', '#share', '#discuss'],
      youtube: ['#subscribe', '#like', '#comment', '#share'],
      twitter: ['#retweet', '#like', '#reply', '#share'],
      facebook: ['#like', '#share', '#comment', '#tag'],
      pinterest: ['#pin', '#save', '#share', '#inspire']
    }
    
    return engagementMap[platform] || []
  }

  private getTopicTrendingHashtags(topic: string, platform: SocialPlatform): string[] {
    // This would ideally connect to real trending data APIs
    // For now, we'll use topic-based trending patterns
    const topicWords = topic.toLowerCase().split(' ')
    const trending: string[] = []
    
    topicWords.forEach(word => {
      if (word.length > 3) {
        trending.push(`#${word}2024`)
        trending.push(`#${word}tips`)
        trending.push(`#${word}hack`)
      }
    })
    
    return trending.slice(0, 3)
  }

  private getStyleBasedHashtags(userStyle: any, topic: string): string[] {
    const styleHashtags: string[] = []
    
    if (userStyle.tone === 'professional') {
      styleHashtags.push('#professional', '#expert', '#industry')
    } else if (userStyle.tone === 'casual') {
      styleHashtags.push('#casual', '#everyday', '#simple')
    } else if (userStyle.tone === 'friendly') {
      styleHashtags.push('#friendly', '#community', '#helpful')
    }
    
    return styleHashtags
  }

  private getCommunityHashtags(topic: string, platform: SocialPlatform): string[] {
    const topicFormatted = this.formatHashtag(topic)
    return [
      `#${topicFormatted}community`,
      `#${topicFormatted}tribe`,
      `#${topicFormatted}family`
    ]
  }

  private removeDuplicates(hashtags: string[]): string[] {
    return [...new Set(hashtags.filter(tag => tag && tag.length > 1))]
  }
}

/**
 * Caption Generator - Creates engaging captions for different lengths and platforms
 */
export class CaptionGenerator {
  /**
   * Generates captions optimized for social media platforms
   */
  generateCaptions(
    userContext: UserContext,
    topic: string,
    script: { title: string; hook: string; mainContent: string; callToAction: string },
    options: CaptionGeneratorOptions
  ): {
    short: string
    medium: string
    long: string
    story: string
  } {
    const { platform, lengths, includeEmojis = true, includeCallToAction = true } = options

    const captions = {
      short: '',
      medium: '',
      long: '',
      story: ''
    }

    // Generate each requested caption length
    if (lengths.includes('short')) {
      captions.short = this.generateShortCaption(
        topic,
        script.hook,
        userContext.userStyle.tone,
        platform,
        includeEmojis,
        includeCallToAction ? script.callToAction : ''
      )
    }

    if (lengths.includes('medium')) {
      captions.medium = this.generateMediumCaption(
        topic,
        script,
        userContext,
        platform,
        includeEmojis,
        includeCallToAction
      )
    }

    if (lengths.includes('long')) {
      captions.long = this.generateLongCaption(
        topic,
        script,
        userContext,
        platform,
        includeEmojis,
        includeCallToAction
      )
    }

    if (lengths.includes('story')) {
      captions.story = this.generateStoryCaption(
        topic,
        script.hook,
        userContext,
        platform,
        includeEmojis
      )
    }

    return captions
  }

  private generateShortCaption(
    topic: string,
    hook: string,
    tone: string,
    platform: SocialPlatform,
    includeEmojis: boolean,
    callToAction: string
  ): string {
    let caption = hook

    // Platform-specific length limits
    const maxLength = this.getPlatformMaxLength(platform, 'short')
    
    // Add CTA if space allows
    if (callToAction && caption.length + callToAction.length + 5 < maxLength) {
      caption += `\n\n${callToAction}`
    }

    // Add emojis if requested and space allows
    if (includeEmojis && caption.length < maxLength - 10) {
      const emoji = this.getTopicEmoji(topic)
      caption = `${emoji} ${caption}`
    }

    return this.truncateToLimit(caption, maxLength)
  }

  private generateMediumCaption(
    topic: string,
    script: { title: string; hook: string; mainContent: string; callToAction: string },
    userContext: UserContext,
    platform: SocialPlatform,
    includeEmojis: boolean,
    includeCallToAction: boolean
  ): string {
    const maxLength = this.getPlatformMaxLength(platform, 'medium')
    
    let caption = `${script.hook}\n\n`
    
    // Add condensed main content
    const condensedContent = this.condenseContent(script.mainContent, 200)
    caption += condensedContent

    // Add user context if relevant
    if (userContext.recentInterests.length > 0) {
      caption += `\n\nPerfect for ${userContext.recentInterests[0]} enthusiasts!`
    }

    // Add CTA
    if (includeCallToAction) {
      caption += `\n\n${script.callToAction}`
    }

    // Add emojis
    if (includeEmojis) {
      caption = this.addEmojisToCaption(caption, topic, platform)
    }

    return this.truncateToLimit(caption, maxLength)
  }

  private generateLongCaption(
    topic: string,
    script: { title: string; hook: string; mainContent: string; callToAction: string },
    userContext: UserContext,
    platform: SocialPlatform,
    includeEmojis: boolean,
    includeCallToAction: boolean
  ): string {
    const maxLength = this.getPlatformMaxLength(platform, 'long')
    
    let caption = `${script.hook}\n\n`
    
    // Add full main content
    caption += script.mainContent

    // Add personal context
    if (userContext.themes.length > 0) {
      caption += `\n\nThis ties into broader themes of ${userContext.themes.slice(0, 2).join(' and ')}.`
    }

    // Add user interests connection
    if (userContext.recentInterests.length > 0) {
      caption += `\n\nEspecially relevant if you're interested in ${userContext.recentInterests.slice(0, 2).join(' or ')}.`
    }

    // Add engagement question
    caption += `\n\nWhat's your experience with ${topic}? Share your thoughts below!`

    // Add CTA
    if (includeCallToAction) {
      caption += `\n\n${script.callToAction}`
    }

    // Add platform-specific elements
    if (platform === 'linkedin') {
      caption += '\n\n#ProfessionalDevelopment #Industry #Networking'
    } else if (platform === 'instagram') {
      caption += '\n\n#ContentCreator #Tips #Growth'
    }

    // Add emojis
    if (includeEmojis) {
      caption = this.addEmojisToCaption(caption, topic, platform)
    }

    return this.truncateToLimit(caption, maxLength)
  }

  private generateStoryCaption(
    topic: string,
    hook: string,
    userContext: UserContext,
    platform: SocialPlatform,
    includeEmojis: boolean
  ): string {
    // Stories are typically shorter and more immediate
    let caption = hook

    // Add quick tip or insight
    caption += `\n\nQuick tip: Focus on the fundamentals first!`

    // Add swipe-up or action prompt
    if (platform === 'instagram') {
      caption += '\n\nSwipe up for more! 👆'
    } else {
      caption += '\n\nTap for more details!'
    }

    // Add emojis for visual appeal
    if (includeEmojis) {
      const emoji = this.getTopicEmoji(topic)
      caption = `${emoji} ${caption} ${emoji}`
    }

    return caption
  }

  private getPlatformMaxLength(platform: SocialPlatform, length: string): number {
    const limits = {
      instagram: { short: 125, medium: 500, long: 2200 },
      twitter: { short: 100, medium: 200, long: 280 },
      linkedin: { short: 200, medium: 600, long: 3000 },
      tiktok: { short: 100, medium: 300, long: 2200 },
      youtube: { short: 150, medium: 400, long: 5000 },
      facebook: { short: 150, medium: 400, long: 8000 },
      pinterest: { short: 100, medium: 300, long: 500 }
    }

    return limits[platform]?.[length as keyof typeof limits[typeof platform]] || 500
  }

  private condenseContent(content: string, maxLength: number): string {
    if (content.length <= maxLength) return content

    // Split into sentences and keep the most important ones
    const sentences = content.split('. ')
    let condensed = ''
    
    for (const sentence of sentences) {
      if (condensed.length + sentence.length + 2 <= maxLength) {
        condensed += (condensed ? '. ' : '') + sentence
      } else {
        break
      }
    }

    return condensed + (condensed.endsWith('.') ? '' : '.')
  }

  private getTopicEmoji(topic: string): string {
    const emojiMap: Record<string, string> = {
      'business': '💼',
      'marketing': '📈',
      'content': '📝',
      'social media': '📱',
      'technology': '💻',
      'ai': '🤖',
      'learning': '📚',
      'tips': '💡',
      'strategy': '🎯',
      'growth': '🚀',
      'success': '⭐',
      'productivity': '⚡',
      'creativity': '🎨',
      'innovation': '💡',
      'leadership': '👑',
      'finance': '💰',
      'health': '🏥',
      'fitness': '💪',
      'travel': '✈️',
      'food': '🍽️',
      'lifestyle': '🌟'
    }

    const topicLower = topic.toLowerCase()
    for (const [key, emoji] of Object.entries(emojiMap)) {
      if (topicLower.includes(key)) {
        return emoji
      }
    }

    return '✨' // Default emoji
  }

  private addEmojisToCaption(caption: string, topic: string, platform: SocialPlatform): string {
    const topicEmoji = this.getTopicEmoji(topic)
    
    // Add topic emoji at the beginning
    caption = `${topicEmoji} ${caption}`

    // Add platform-appropriate emojis throughout
    if (platform === 'instagram' || platform === 'tiktok') {
      // More emoji-friendly platforms
      caption = caption.replace(/\n\n/g, `\n\n${topicEmoji} `)
    }

    return caption
  }

  private truncateToLimit(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text
    
    // Try to truncate at a sentence boundary
    const truncated = text.substring(0, maxLength - 3)
    const lastSentence = truncated.lastIndexOf('. ')
    
    if (lastSentence > maxLength * 0.7) {
      return truncated.substring(0, lastSentence + 1)
    }
    
    return truncated + '...'
  }
}

/**
 * Implementation Guide Generator - Creates step-by-step instructions
 */
export class ImplementationGuideGenerator {
  /**
   * Generates step-by-step implementation instructions
   */
  generateGuide(
    userContext: UserContext,
    topic: string,
    script: { title: string; hook: string; mainContent: string; callToAction: string },
    options: GuideGeneratorOptions
  ): {
    steps: string[]
    tips: string[]
    bestPractices: string[]
    timing: string
  } {
    const { platform, includeTimingAdvice = true, includeBestPractices = true, stepDetail } = options

    // Generate implementation steps
    const steps = this.generateImplementationSteps(topic, script, userContext, stepDetail, platform)
    
    // Generate pro tips
    const tips = this.generateProTips(topic, userContext, platform)
    
    // Generate best practices
    const bestPractices = includeBestPractices ? 
      this.generateBestPractices(topic, platform, userContext) : []
    
    // Generate timing advice
    const timing = includeTimingAdvice ? 
      this.generateTimingAdvice(platform, userContext) : 'Post when your audience is most active'

    return {
      steps,
      tips,
      bestPractices,
      timing
    }
  }

  private generateImplementationSteps(
    topic: string,
    script: { title: string; hook: string; mainContent: string; callToAction: string },
    userContext: UserContext,
    stepDetail: 'basic' | 'detailed' | 'expert',
    platform: SocialPlatform
  ): string[] {
    const baseSteps = [
      'Plan your content approach and key message',
      'Create your content following the script structure',
      'Optimize for your chosen platform',
      'Add engaging visuals or formatting',
      'Include relevant hashtags and captions',
      'Post at optimal timing for your audience',
      'Engage with comments and responses',
      'Monitor performance and adjust strategy'
    ]

    if (stepDetail === 'basic') {
      return baseSteps.slice(0, 5)
    }

    if (stepDetail === 'detailed') {
      return this.expandStepsToDetailed(baseSteps, topic, platform, userContext)
    }

    if (stepDetail === 'expert') {
      return this.expandStepsToExpert(baseSteps, topic, platform, userContext)
    }

    return baseSteps
  }

  private expandStepsToDetailed(
    baseSteps: string[],
    topic: string,
    platform: SocialPlatform,
    userContext: UserContext
  ): string[] {
    return [
      `**Planning Phase**: Define your core message about ${topic}. Research your audience's current knowledge level and interests, especially around ${userContext.topics.slice(0, 2).join(' and ')}.`,
      
      `**Content Creation**: Write your hook to grab attention in the first 3 seconds. Develop your main content with clear, actionable points. End with a specific call-to-action that encourages engagement.`,
      
      `**Platform Optimization**: Format your content for ${platform} specifications. Adjust length, style, and presentation to match platform best practices and user expectations.`,
      
      `**Visual Enhancement**: Add compelling visuals that support your message. Use consistent branding, appropriate colors, and clear text overlays if needed.`,
      
      `**Hashtag Strategy**: Research and include 5-10 relevant hashtags. Mix popular and niche tags. Include platform-specific trending hashtags when relevant.`,
      
      `**Publishing**: Post during your audience's peak activity hours. Write an engaging caption that complements your content and encourages interaction.`,
      
      `**Community Engagement**: Respond to comments within the first hour. Ask follow-up questions to encourage discussion. Share insights from the conversation.`,
      
      `**Performance Analysis**: Track engagement metrics, reach, and audience feedback. Note what resonated most with your audience for future content planning.`
    ]
  }

  private expandStepsToExpert(
    baseSteps: string[],
    topic: string,
    platform: SocialPlatform,
    userContext: UserContext
  ): string[] {
    return [
      `**Strategic Planning**: Conduct audience analysis and competitive research around ${topic}. Map content to your audience's customer journey stage. Align with broader content calendar and business objectives.`,
      
      `**Content Architecture**: Structure content using proven frameworks (AIDA, PAS, etc.). Incorporate psychological triggers relevant to your audience. Plan content series or follow-up pieces to maximize topic value.`,
      
      `**Platform-Specific Optimization**: Leverage ${platform}'s algorithm preferences. Optimize for platform-specific engagement signals. Consider cross-platform adaptation strategies.`,
      
      `**Advanced Visual Strategy**: Create thumb-stopping visuals using design psychology principles. Implement consistent brand visual language. A/B test visual elements for performance optimization.`,
      
      `**Hashtag Intelligence**: Use hashtag analytics tools to identify optimal tag combinations. Monitor hashtag performance and trending patterns. Implement hashtag rotation strategies.`,
      
      `**Strategic Publishing**: Use data-driven timing based on audience analytics. Consider time zone optimization for global reach. Plan publication sequence for maximum algorithmic boost.`,
      
      `**Community Building**: Implement engagement strategies that build long-term relationships. Create conversation starters that generate valuable user-generated content. Develop community guidelines and moderation strategies.`,
      
      `**Advanced Analytics**: Set up conversion tracking and attribution modeling. Analyze content performance against business KPIs. Use insights to refine content strategy and audience targeting.`,
      
      `**Scaling & Automation**: Identify opportunities for content repurposing and automation. Develop systems for consistent content quality at scale. Plan for team collaboration and workflow optimization.`
    ]
  }

  private generateProTips(
    topic: string,
    userContext: UserContext,
    platform: SocialPlatform
  ): string[] {
    const tips = [
      `Hook viewers in the first 3 seconds - your opening line about ${topic} needs to create immediate curiosity or value.`,
      
      `Match your audience's energy level - since your communication style is ${userContext.userStyle.tone}, maintain that consistency throughout.`,
      
      `Use the 80/20 rule: 80% value, 20% promotion. Focus on helping your audience with ${topic} rather than selling.`,
      
      `Engage authentically in comments - your ${userContext.userStyle.formality} style should carry through to all interactions.`,
      
      `Test different content formats - what works for ${topic} might vary between video, carousel, or single image posts.`
    ]

    // Add platform-specific tips
    if (platform === 'instagram') {
      tips.push('Use Instagram Stories to tease your main post and drive traffic to it.')
      tips.push('Save high-performing posts to Highlights for extended visibility.')
    } else if (platform === 'tiktok') {
      tips.push('Jump on trending sounds and adapt them to your topic for better reach.')
      tips.push('Use text overlays to reinforce key points for viewers watching without sound.')
    } else if (platform === 'linkedin') {
      tips.push('Share personal insights and experiences to build professional credibility.')
      tips.push('Tag relevant industry professionals to expand your reach authentically.')
    }

    return tips.slice(0, 6)
  }

  private generateBestPractices(
    topic: string,
    platform: SocialPlatform,
    userContext: UserContext
  ): string[] {
    const practices = [
      `Consistency is key - maintain your ${userContext.userStyle.tone} voice across all content about ${topic}.`,
      
      `Quality over quantity - it's better to post less frequently with high-value content than to post daily with mediocre material.`,
      
      `Engage genuinely with your community - respond to comments with thoughtful replies, not just emojis or generic responses.`,
      
      `Stay updated on platform changes - algorithm updates can significantly impact how your ${topic} content performs.`,
      
      `Build relationships, not just followers - focus on creating meaningful connections with people interested in ${topic}.`
    ]

    // Platform-specific best practices
    const platformPractices = {
      instagram: [
        'Use all available features (Stories, Reels, IGTV) to maximize reach and engagement.',
        'Maintain a cohesive visual aesthetic that reflects your brand and topic expertise.'
      ],
      tiktok: [
        'Post consistently during peak hours for your audience demographic.',
        'Participate in trends while staying true to your niche and expertise.'
      ],
      linkedin: [
        'Share industry insights and professional experiences to establish thought leadership.',
        'Engage meaningfully with others\' content to build professional relationships.'
      ],
      youtube: [
        'Optimize video titles and descriptions for search discovery.',
        'Create compelling thumbnails that accurately represent your content.'
      ],
      twitter: [
        'Use threads to share detailed insights about complex topics.',
        'Engage in real-time conversations and trending discussions when relevant.'
      ]
    }

    const specificPractices = platformPractices[platform] || []
    return [...practices, ...specificPractices].slice(0, 8)
  }

  private generateTimingAdvice(platform: SocialPlatform, userContext: UserContext): string {
    const generalTiming = {
      instagram: 'Post between 11 AM - 1 PM or 7 PM - 9 PM on weekdays for maximum engagement.',
      tiktok: 'Best times are 6 AM - 10 AM and 7 PM - 9 PM, especially on Tuesday through Thursday.',
      linkedin: 'Post during business hours: 8 AM - 10 AM and 12 PM - 2 PM on weekdays.',
      youtube: 'Upload between 2 PM - 4 PM on weekdays when people are looking for content.',
      twitter: 'Tweet between 9 AM - 10 AM and 7 PM - 9 PM for highest engagement rates.',
      facebook: 'Post between 1 PM - 3 PM on weekdays when users are most active.',
      pinterest: 'Pin between 8 PM - 11 PM when users are planning and browsing for ideas.'
    }

    let timing = generalTiming[platform] || 'Post when your audience is most active based on your analytics.'

    // Add personalized advice based on user context
    if (userContext.topics.includes('business') || userContext.topics.includes('professional')) {
      timing += ' Since your content focuses on professional topics, consider posting during business hours for better reach.'
    }

    return timing
  }
}

/**
 * Visual Guidance Generator - Provides content creation tips
 */
export class VisualGuidanceGenerator {
  /**
   * Generates visual guidance for content creation
   */
  generateVisualGuidance(
    userContext: UserContext,
    topic: string,
    options: VisualGuidanceOptions
  ): {
    composition: string[]
    lighting: string[]
    editing: string[]
    style: string
  } {
    const { platform, contentType, style = 'professional' } = options

    // Generate composition guidelines
    const composition = this.generateCompositionGuidance(topic, contentType, platform, style)
    
    // Generate lighting recommendations
    const lighting = this.generateLightingGuidance(contentType, platform, style)
    
    // Generate editing tips
    const editing = this.generateEditingGuidance(contentType, platform, userContext, style)
    
    // Generate overall style description
    const overallStyle = this.generateStyleDescription(topic, userContext, platform, style)

    return {
      composition,
      lighting,
      editing,
      style: overallStyle
    }
  }

  private generateCompositionGuidance(
    topic: string,
    contentType: string,
    platform: SocialPlatform,
    style: string
  ): string[] {
    const baseComposition = [
      'Use the rule of thirds to create visually balanced compositions',
      'Ensure your main subject or text is clearly visible and prominent',
      'Leave adequate white space to avoid cluttered visuals',
      'Consider your audience\'s viewing context (mobile vs desktop)'
    ]

    const contentSpecific = {
      video: [
        'Keep important elements in the center third of the frame for mobile viewing',
        'Use dynamic camera movements sparingly to maintain focus on your message',
        'Plan your shots to support your narrative flow about ' + topic
      ],
      image: [
        'Create a clear focal point that draws the eye to your main message',
        'Use leading lines to guide viewers toward key information',
        'Balance text and visual elements for optimal readability'
      ],
      carousel: [
        'Maintain consistent visual style across all slides',
        'Use progressive disclosure - reveal information slide by slide',
        'End with a strong call-to-action slide'
      ],
      story: [
        'Design for vertical viewing with key elements in the safe zone',
        'Use bold, readable fonts that work on small screens',
        'Keep each story frame focused on one key point'
      ]
    }

    const platformSpecific = {
      instagram: [
        'Optimize for square (1:1) or vertical (4:5) aspect ratios',
        'Use Instagram\'s built-in creative tools for authentic feel'
      ],
      tiktok: [
        'Design for vertical (9:16) format exclusively',
        'Keep text large and readable on mobile devices'
      ],
      linkedin: [
        'Use professional, clean compositions that reflect business context',
        'Include your branding subtly but consistently'
      ],
      youtube: [
        'Design for horizontal (16:9) format with mobile-friendly elements',
        'Create compelling thumbnails that work at small sizes'
      ]
    }

    return [
      ...baseComposition,
      ...(contentSpecific[contentType as keyof typeof contentSpecific] || []),
      ...(platformSpecific[platform] || [])
    ].slice(0, 8)
  }

  private generateLightingGuidance(
    contentType: string,
    platform: SocialPlatform,
    style: string
  ): string[] {
    const baseLighting = [
      'Use natural light whenever possible for the most flattering results',
      'Avoid harsh shadows by using diffused lighting sources',
      'Ensure consistent lighting throughout your content piece',
      'Consider the mood you want to create with your lighting choices'
    ]

    const styleSpecific = {
      professional: [
        'Use even, well-balanced lighting to convey credibility and trust',
        'Avoid dramatic shadows that might distract from your message',
        'Ensure your face (if on camera) is well-lit and clearly visible'
      ],
      creative: [
        'Experiment with colored lighting to create mood and atmosphere',
        'Use dramatic lighting to add visual interest and artistic flair',
        'Consider backlighting for silhouette effects or rim lighting'
      ],
      minimal: [
        'Use soft, even lighting to maintain clean, uncluttered aesthetics',
        'Avoid complex lighting setups that might create visual noise',
        'Focus on clarity and simplicity in your lighting approach'
      ],
      vibrant: [
        'Use bright, energetic lighting to match your content\'s energy',
        'Consider multiple light sources to eliminate flat lighting',
        'Ensure colors appear vibrant and true to life'
      ]
    }

    const contentSpecific = {
      video: [
        'Maintain consistent lighting throughout your video to avoid distracting changes',
        'Use a key light, fill light, and background light for professional results'
      ],
      image: [
        'Golden hour (sunrise/sunset) provides naturally flattering light',
        'Use reflectors to fill in shadows and create even illumination'
      ]
    }

    return [
      ...baseLighting,
      ...(styleSpecific[style as keyof typeof styleSpecific] || []),
      ...(contentSpecific[contentType as keyof typeof contentSpecific] || [])
    ].slice(0, 6)
  }

  private generateEditingGuidance(
    contentType: string,
    platform: SocialPlatform,
    userContext: UserContext,
    style: string
  ): string[] {
    const baseEditing = [
      'Keep editing consistent with your brand and message tone',
      'Use transitions and effects sparingly to maintain focus on content',
      'Ensure audio quality is clear and professional',
      'Export in the highest quality suitable for your platform'
    ]

    const platformSpecific = {
      instagram: [
        'Use Instagram\'s native editing tools for better algorithm performance',
        'Keep videos under 60 seconds for feed posts, 15 seconds for optimal engagement',
        'Add captions or text overlays for accessibility'
      ],
      tiktok: [
        'Use trending sounds and effects to increase discoverability',
        'Keep cuts quick and engaging to maintain viewer attention',
        'Add text overlays for key points since many watch without sound'
      ],
      youtube: [
        'Create engaging thumbnails with bold text and clear imagery',
        'Use jump cuts to maintain pacing and remove dead air',
        'Add end screens and cards to promote other content'
      ],
      linkedin: [
        'Keep editing professional and polished',
        'Add subtitles for professional accessibility',
        'Use clean, business-appropriate graphics and overlays'
      ]
    }

    const styleSpecific = {
      professional: [
        'Use clean cuts and minimal effects for a polished look',
        'Ensure consistent color grading throughout',
        'Add professional graphics and lower thirds when appropriate'
      ],
      creative: [
        'Experiment with creative transitions and visual effects',
        'Use color grading to enhance mood and atmosphere',
        'Incorporate motion graphics and animations'
      ],
      minimal: [
        'Use simple cuts and avoid complex transitions',
        'Maintain consistent, muted color palette',
        'Focus on clean typography and simple graphics'
      ]
    }

    // Add user-specific editing advice
    const userSpecific = []
    if (userContext.userStyle.tone === 'casual') {
      userSpecific.push('Keep editing relaxed and natural - avoid overly polished effects that might seem inauthentic')
    } else if (userContext.userStyle.tone === 'professional') {
      userSpecific.push('Maintain professional editing standards with clean cuts and consistent branding')
    }

    return [
      ...baseEditing,
      ...(platformSpecific[platform] || []),
      ...(styleSpecific[style as keyof typeof styleSpecific] || []),
      ...userSpecific
    ].slice(0, 8)
  }

  private generateStyleDescription(
    topic: string,
    userContext: UserContext,
    platform: SocialPlatform,
    style: string
  ): string {
    const baseDescriptions = {
      professional: `Clean, polished, and credible visual style that establishes authority on ${topic}. Use consistent branding, professional color schemes, and clear typography.`,
      
      creative: `Bold, artistic, and visually striking style that captures attention while discussing ${topic}. Incorporate unique visual elements, creative compositions, and expressive color palettes.`,
      
      minimal: `Simple, clean, and uncluttered aesthetic that lets your ${topic} content shine. Focus on white space, simple typography, and subtle visual elements.`,
      
      vibrant: `Energetic, colorful, and engaging visual style that brings excitement to ${topic} discussions. Use bright colors, dynamic compositions, and eye-catching elements.`
    }

    let description = baseDescriptions[style as keyof typeof baseDescriptions] || baseDescriptions.professional

    // Add user context
    if (userContext.userStyle.tone === 'friendly') {
      description += ' Maintain a warm, approachable feel that reflects your friendly communication style.'
    } else if (userContext.userStyle.tone === 'authoritative') {
      description += ' Emphasize expertise and credibility through polished, professional visual choices.'
    }

    // Add platform context
    if (platform === 'linkedin') {
      description += ' Ensure all visual choices align with professional networking expectations.'
    } else if (platform === 'tiktok') {
      description += ' Adapt style to be mobile-first and attention-grabbing for short-form content.'
    }

    return description
  }
}

/**
 * Main Content Package Builder - Orchestrates all component generators
 */
export class ContentPackageBuilder {
  private scriptGenerator: ScriptGenerator
  private hashtagGenerator: HashtagGenerator
  private captionGenerator: CaptionGenerator
  private guideGenerator: ImplementationGuideGenerator
  private visualGenerator: VisualGuidanceGenerator

  constructor() {
    this.scriptGenerator = new ScriptGenerator()
    this.hashtagGenerator = new HashtagGenerator()
    this.captionGenerator = new CaptionGenerator()
    this.guideGenerator = new ImplementationGuideGenerator()
    this.visualGenerator = new VisualGuidanceGenerator()
  }

  /**
   * Builds a complete content package using all component generators
   */
  buildContentPackage(
    userContext: UserContext,
    topic: string,
    options: GenerationOptions = {}
  ): {
    script: ReturnType<ScriptGenerator['generateScript']>
    hashtags: ReturnType<HashtagGenerator['generateHashtags']>
    captions: ReturnType<CaptionGenerator['generateCaptions']>
    implementationGuide: ReturnType<ImplementationGuideGenerator['generateGuide']>
    visualGuidance: ReturnType<VisualGuidanceGenerator['generateVisualGuidance']>
  } {
    const {
      platform = 'instagram',
      contentType = 'video',
      tone,
      length = 'medium'
    } = options

    // Generate script with proper structure
    const script = this.scriptGenerator.generateScript(userContext, topic, {
      platform,
      contentType,
      tone,
      duration: this.getDurationForLength(length)
    })

    // Generate hashtags using context analysis
    const hashtags = this.hashtagGenerator.generateHashtags(userContext, topic, {
      platform,
      maxPrimary: 10,
      maxSecondary: 10,
      includeTrending: true,
      includeNiche: true
    })

    // Generate captions for different lengths
    const captions = this.captionGenerator.generateCaptions(userContext, topic, script, {
      platform,
      lengths: ['short', 'medium', 'long', 'story'],
      includeEmojis: platform !== 'linkedin',
      includeCallToAction: true
    })

    // Generate implementation guide
    const implementationGuide = this.guideGenerator.generateGuide(userContext, topic, script, {
      platform,
      includeTimingAdvice: true,
      includeBestPractices: true,
      stepDetail: length === 'short' ? 'basic' : length === 'long' ? 'expert' : 'detailed'
    })

    // Generate visual guidance
    const visualGuidance = this.visualGenerator.generateVisualGuidance(userContext, topic, {
      platform,
      contentType,
      style: tone === 'professional' ? 'professional' : 
             tone === 'casual' ? 'creative' : 'minimal'
    })

    return {
      script,
      hashtags,
      captions,
      implementationGuide,
      visualGuidance
    }
  }

  private getDurationForLength(length: string): string {
    const durations = {
      short: '15-30 seconds',
      medium: '30-60 seconds',
      long: '60-180 seconds'
    }
    return durations[length as keyof typeof durations] || durations.medium
  }
}

// Export singleton instance
export const contentPackageBuilder = new ContentPackageBuilder()

// Export individual generators for direct use
export const scriptGenerator = new ScriptGenerator()
export const hashtagGenerator = new HashtagGenerator()
export const captionGenerator = new CaptionGenerator()
export const implementationGuideGenerator = new ImplementationGuideGenerator()
export const visualGuidanceGenerator = new VisualGuidanceGenerator()