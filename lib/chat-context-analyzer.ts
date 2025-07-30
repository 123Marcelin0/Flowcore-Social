import { supabase, getCurrentUser, type ChatMessage } from './supabase'

export interface UserStyle {
  tone: 'professional' | 'casual' | 'friendly' | 'authoritative' | 'mixed'
  vocabulary: 'simple' | 'technical' | 'mixed'
  length: 'concise' | 'detailed' | 'varied'
  formality: 'formal' | 'informal' | 'mixed'
}

export interface CommunicationPattern {
  questionTypes: string[]
  responsePreferences: string[]
  engagementStyle: string
  topicTransitions: string[]
}

export interface UserContext {
  userId: string
  topics: string[]
  themes: string[]
  userStyle: UserStyle
  recentInterests: string[]
  communicationPatterns: CommunicationPattern
  contextSummary: string
  analyzedAt: Date
  messageCount: number
  timeRange: {
    from: Date
    to: Date
  }
}

export class ChatContextAnalyzer {
  private readonly MAX_MESSAGES = 50
  private readonly MAX_DAYS = 30

  /**
   * Analyzes user context from recent chat messages
   */
  async analyzeUserContext(userId?: string): Promise<UserContext> {
    try {
      const user = await getCurrentUser()
      const targetUserId = userId || user?.id
      
      if (!targetUserId) {
        throw new Error('User not authenticated')
      }

      // Retrieve recent chat messages
      const messages = await this.retrieveRecentMessages(targetUserId)
      
      if (messages.length === 0) {
        return this.createEmptyContext(targetUserId)
      }

      // Extract topics and themes
      const topics = this.extractTopics(messages)
      const themes = this.extractThemes(messages)
      
      // Identify user communication style
      const userStyle = this.identifyUserStyle(messages)
      
      // Analyze communication patterns
      const communicationPatterns = this.analyzeCommunicationPatterns(messages)
      
      // Extract recent interests
      const recentInterests = this.extractRecentInterests(messages)
      
      // Generate context summary
      const contextSummary = this.generateContextSummary({
        topics,
        themes,
        userStyle,
        recentInterests,
        messageCount: messages.length
      })

      const timeRange = this.getTimeRange(messages)

      return {
        userId: targetUserId,
        topics,
        themes,
        userStyle,
        recentInterests,
        communicationPatterns,
        contextSummary,
        analyzedAt: new Date(),
        messageCount: messages.length,
        timeRange
      }
    } catch (error) {
      console.error('Error analyzing user context:', error)
      throw new Error(`Failed to analyze user context: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Retrieves recent chat messages for a user
   */
  private async retrieveRecentMessages(userId: string): Promise<ChatMessage[]> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - this.MAX_DAYS)

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', cutoffDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(this.MAX_MESSAGES)

    if (error) {
      console.error('Error retrieving chat messages:', error)
      throw new Error(`Failed to retrieve chat messages: ${error.message}`)
    }

    return data || []
  }

  /**
   * Extracts key topics from chat messages
   */
  extractTopics(messages: ChatMessage[]): string[] {
    const userMessages = messages.filter(msg => msg.role === 'user')
    const topics = new Set<string>()
    
    // Common topic keywords and patterns
    const topicPatterns = [
      // Business/Marketing
      /\b(marketing|business|strategy|brand|audience|engagement|growth|sales|revenue|roi|conversion)\b/gi,
      // Content Creation
      /\b(content|post|video|photo|reel|story|caption|hashtag|viral|trending|creative|design)\b/gi,
      // Social Media Platforms
      /\b(instagram|facebook|twitter|linkedin|tiktok|youtube|pinterest|snapchat|social media)\b/gi,
      // Technology
      /\b(ai|artificial intelligence|automation|tool|software|app|platform|analytics|data|algorithm)\b/gi,
      // Personal Development
      /\b(learning|skill|course|education|training|development|improvement|goal|productivity)\b/gi,
      // Health & Lifestyle
      /\b(health|fitness|wellness|lifestyle|nutrition|exercise|mental health|work-life balance)\b/gi,
      // Finance
      /\b(money|finance|investment|budget|income|expense|profit|cost|pricing|financial)\b/gi,
      // Travel & Entertainment
      /\b(travel|vacation|entertainment|movie|music|book|hobby|leisure|adventure)\b/gi
    ]

    userMessages.forEach(message => {
      const content = message.content.toLowerCase()
      
      topicPatterns.forEach(pattern => {
        const matches = content.match(pattern)
        if (matches) {
          matches.forEach(match => {
            topics.add(match.toLowerCase().trim())
          })
        }
      })
      
      // Extract noun phrases as potential topics
      const nounPhrases = this.extractNounPhrases(content)
      nounPhrases.forEach(phrase => {
        if (phrase.length > 3 && phrase.length < 30) {
          topics.add(phrase)
        }
      })
    })

    return Array.from(topics)
      .filter(topic => topic.length > 2)
      .slice(0, 20) // Limit to top 20 topics
  }

  /**
   * Extracts themes from chat messages
   */
  private extractThemes(messages: ChatMessage[]): string[] {
    const userMessages = messages.filter(msg => msg.role === 'user')
    const themes = new Set<string>()
    
    // Analyze message patterns for themes
    const themeIndicators = {
      'content-creation': ['create', 'make', 'design', 'write', 'produce', 'generate'],
      'business-growth': ['grow', 'scale', 'expand', 'increase', 'improve', 'optimize'],
      'learning': ['learn', 'understand', 'know', 'explain', 'teach', 'study'],
      'problem-solving': ['fix', 'solve', 'help', 'issue', 'problem', 'trouble'],
      'planning': ['plan', 'schedule', 'organize', 'prepare', 'strategy', 'goal'],
      'analysis': ['analyze', 'compare', 'evaluate', 'assess', 'review', 'measure'],
      'creativity': ['creative', 'innovative', 'unique', 'original', 'artistic', 'inspiration'],
      'productivity': ['efficient', 'productive', 'optimize', 'streamline', 'automate', 'workflow']
    }

    userMessages.forEach(message => {
      const content = message.content.toLowerCase()
      
      Object.entries(themeIndicators).forEach(([theme, indicators]) => {
        const hasTheme = indicators.some(indicator => 
          content.includes(indicator) || 
          new RegExp(`\\b${indicator}\\w*\\b`).test(content)
        )
        
        if (hasTheme) {
          themes.add(theme)
        }
      })
    })

    return Array.from(themes)
  }

  /**
   * Identifies user communication style
   */
  identifyUserStyle(messages: ChatMessage[]): UserStyle {
    const userMessages = messages.filter(msg => msg.role === 'user')
    
    if (userMessages.length === 0) {
      return {
        tone: 'mixed',
        vocabulary: 'mixed',
        length: 'varied',
        formality: 'mixed'
      }
    }

    // Analyze tone
    const tone = this.analyzeTone(userMessages)
    
    // Analyze vocabulary complexity
    const vocabulary = this.analyzeVocabulary(userMessages)
    
    // Analyze message length preference
    const length = this.analyzeMessageLength(userMessages)
    
    // Analyze formality
    const formality = this.analyzeFormality(userMessages)

    return {
      tone,
      vocabulary,
      length,
      formality
    }
  }

  /**
   * Analyzes communication patterns
   */
  private analyzeCommunicationPatterns(messages: ChatMessage[]): CommunicationPattern {
    const userMessages = messages.filter(msg => msg.role === 'user')
    
    const questionTypes = this.identifyQuestionTypes(userMessages)
    const responsePreferences = this.identifyResponsePreferences(messages)
    const engagementStyle = this.identifyEngagementStyle(userMessages)
    const topicTransitions = this.identifyTopicTransitions(userMessages)

    return {
      questionTypes,
      responsePreferences,
      engagementStyle,
      topicTransitions
    }
  }

  /**
   * Extracts recent interests from messages
   */
  private extractRecentInterests(messages: ChatMessage[]): string[] {
    // Get messages from the last 7 days for recent interests
    const recentCutoff = new Date()
    recentCutoff.setDate(recentCutoff.getDate() - 7)
    
    const recentMessages = messages.filter(msg => 
      new Date(msg.created_at) >= recentCutoff && msg.role === 'user'
    )
    
    const interests = new Set<string>()
    
    // Interest indicators
    const interestPatterns = [
      /\b(interested in|curious about|want to learn|looking into|exploring|researching)\s+([^.!?]+)/gi,
      /\b(love|enjoy|passionate about|excited about|fascinated by)\s+([^.!?]+)/gi,
      /\b(working on|focusing on|trying to|planning to)\s+([^.!?]+)/gi
    ]

    recentMessages.forEach(message => {
      interestPatterns.forEach(pattern => {
        const matches = [...message.content.matchAll(pattern)]
        matches.forEach(match => {
          if (match[2]) {
            const interest = match[2].trim().toLowerCase()
            if (interest.length > 3 && interest.length < 50) {
              interests.add(interest)
            }
          }
        })
      })
    })

    return Array.from(interests).slice(0, 10)
  }

  /**
   * Generates a context summary for AI prompt enhancement
   */
  generateContextSummary(context: {
    topics: string[]
    themes: string[]
    userStyle: UserStyle
    recentInterests: string[]
    messageCount: number
  }): string {
    const { topics, themes, userStyle, recentInterests, messageCount } = context
    
    let summary = `Based on analysis of ${messageCount} recent messages:\n\n`
    
    // User style summary
    summary += `Communication Style: ${userStyle.tone} tone, ${userStyle.vocabulary} vocabulary, ${userStyle.length} responses, ${userStyle.formality} formality.\n\n`
    
    // Topics summary
    if (topics.length > 0) {
      summary += `Main Topics: ${topics.slice(0, 10).join(', ')}.\n\n`
    }
    
    // Themes summary
    if (themes.length > 0) {
      summary += `Key Themes: ${themes.join(', ')}.\n\n`
    }
    
    // Recent interests
    if (recentInterests.length > 0) {
      summary += `Recent Interests: ${recentInterests.slice(0, 5).join(', ')}.\n\n`
    }
    
    summary += `Generate content that matches this user's communication style and interests.`
    
    return summary
  }

  // Helper methods for analysis

  private createEmptyContext(userId: string): UserContext {
    return {
      userId,
      topics: [],
      themes: [],
      userStyle: {
        tone: 'mixed',
        vocabulary: 'mixed',
        length: 'varied',
        formality: 'mixed'
      },
      recentInterests: [],
      communicationPatterns: {
        questionTypes: [],
        responsePreferences: [],
        engagementStyle: 'neutral',
        topicTransitions: []
      },
      contextSummary: 'No recent chat history available. Using neutral, professional tone for content generation.',
      analyzedAt: new Date(),
      messageCount: 0,
      timeRange: {
        from: new Date(),
        to: new Date()
      }
    }
  }

  private getTimeRange(messages: ChatMessage[]): { from: Date; to: Date } {
    if (messages.length === 0) {
      const now = new Date()
      return { from: now, to: now }
    }

    const dates = messages.map(msg => new Date(msg.created_at))
    return {
      from: new Date(Math.min(...dates.map(d => d.getTime()))),
      to: new Date(Math.max(...dates.map(d => d.getTime())))
    }
  }

  private extractNounPhrases(text: string): string[] {
    // Simple noun phrase extraction using common patterns
    const phrases: string[] = []
    
    // Match patterns like "adjective noun" or "noun noun"
    const nounPhrasePattern = /\b([a-z]+(?:\s+[a-z]+){0,2})\b/gi
    const matches = text.match(nounPhrasePattern)
    
    if (matches) {
      matches.forEach(match => {
        const cleaned = match.trim().toLowerCase()
        if (cleaned.length > 3 && !this.isCommonPhrase(cleaned)) {
          phrases.push(cleaned)
        }
      })
    }
    
    return phrases
  }

  private isCommonPhrase(phrase: string): boolean {
    const commonPhrases = [
      'i want', 'i need', 'can you', 'how to', 'what is', 'this is', 'that is',
      'i think', 'i know', 'i have', 'i will', 'i would', 'i could', 'i should'
    ]
    return commonPhrases.includes(phrase)
  }

  private analyzeTone(messages: ChatMessage[]): UserStyle['tone'] {
    const toneIndicators = {
      professional: ['please', 'thank you', 'appreciate', 'regarding', 'furthermore', 'however'],
      casual: ['hey', 'yeah', 'cool', 'awesome', 'lol', 'btw', 'gonna', 'wanna'],
      friendly: ['thanks', 'great', 'wonderful', 'amazing', 'love', 'excited'],
      authoritative: ['must', 'should', 'need to', 'important', 'critical', 'essential']
    }

    const scores = { professional: 0, casual: 0, friendly: 0, authoritative: 0 }
    
    messages.forEach(message => {
      const content = message.content.toLowerCase()
      Object.entries(toneIndicators).forEach(([tone, indicators]) => {
        indicators.forEach(indicator => {
          if (content.includes(indicator)) {
            scores[tone as keyof typeof scores]++
          }
        })
      })
    })

    const maxScore = Math.max(...Object.values(scores))
    if (maxScore === 0) return 'mixed'
    
    const dominantTone = Object.entries(scores).find(([_, score]) => score === maxScore)?.[0]
    return (dominantTone as UserStyle['tone']) || 'mixed'
  }

  private analyzeVocabulary(messages: ChatMessage[]): UserStyle['vocabulary'] {
    let technicalTerms = 0
    let simpleWords = 0
    let totalWords = 0

    const technicalPatterns = [
      /\b(algorithm|api|database|framework|implementation|optimization|analytics|metrics)\b/gi,
      /\b(roi|kpi|ctr|cpm|engagement rate|conversion|funnel|attribution)\b/gi,
      /\b(seo|sem|ppc|cpc|impressions|reach|organic|paid)\b/gi
    ]

    messages.forEach(message => {
      const words = message.content.split(/\s+/)
      totalWords += words.length

      // Count technical terms
      technicalPatterns.forEach(pattern => {
        const matches = message.content.match(pattern)
        if (matches) technicalTerms += matches.length
      })

      // Count simple words (1-4 characters, common words)
      words.forEach(word => {
        if (word.length <= 4 && /^[a-zA-Z]+$/.test(word)) {
          simpleWords++
        }
      })
    })

    const technicalRatio = technicalTerms / totalWords
    const simpleRatio = simpleWords / totalWords

    if (technicalRatio > 0.05) return 'technical'
    if (simpleRatio > 0.4) return 'simple'
    return 'mixed'
  }

  private analyzeMessageLength(messages: ChatMessage[]): UserStyle['length'] {
    if (messages.length === 0) {
      return 'varied';
    }
    const lengths = messages.map(msg => msg.content.length)
    const avgLength = lengths.reduce((sum, len) => sum + len, 0) / lengths.length
    const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / lengths.length

    if (avgLength < 50) return 'concise'
    if (avgLength > 200) return 'detailed'
    if (variance > 10000) return 'varied' // High variance indicates mixed lengths
    return 'varied'
  }

  private analyzeFormality(messages: ChatMessage[]): UserStyle['formality'] {
    const formalIndicators = ['please', 'thank you', 'would you', 'could you', 'i would appreciate']
    const informalIndicators = ['hey', 'hi', 'yeah', 'ok', 'cool', 'awesome', 'gonna', 'wanna']
    
    let formalCount = 0
    let informalCount = 0

    messages.forEach(message => {
      const content = message.content.toLowerCase()
      
      formalIndicators.forEach(indicator => {
        if (content.includes(indicator)) formalCount++
      })
      
      informalIndicators.forEach(indicator => {
        if (content.includes(indicator)) informalCount++
      })
    })

    if (formalCount > informalCount * 1.5) return 'formal'
    if (informalCount > formalCount * 1.5) return 'informal'
    return 'mixed'
  }

  private identifyQuestionTypes(messages: ChatMessage[]): string[] {
    const questionTypes = new Set<string>()
    
    const patterns = {
      'how-to': /\bhow (to|do|can|should)\b/gi,
      'what-is': /\bwhat (is|are|does|do)\b/gi,
      'why': /\bwhy\b/gi,
      'when': /\bwhen\b/gi,
      'where': /\bwhere\b/gi,
      'which': /\bwhich\b/gi,
      'can-you': /\bcan you\b/gi,
      'should-i': /\bshould i\b/gi,
      'help-with': /\bhelp (me )?with\b/gi
    }

    messages.forEach(message => {
      Object.entries(patterns).forEach(([type, pattern]) => {
        if (pattern.test(message.content)) {
          questionTypes.add(type)
        }
      })
    })

    return Array.from(questionTypes)
  }

  private identifyResponsePreferences(messages: ChatMessage[]): string[] {
    const preferences = new Set<string>()
    
    // Analyze assistant responses that got follow-up questions (indicating satisfaction)
    const assistantMessages = messages.filter(msg => msg.role === 'assistant')
    
    assistantMessages.forEach(message => {
      if (message.content.includes('step-by-step') || message.content.includes('1.') || message.content.includes('2.')) {
        preferences.add('step-by-step')
      }
      if (message.content.includes('example') || message.content.includes('for instance')) {
        preferences.add('examples')
      }
      if (message.content.length > 500) {
        preferences.add('detailed')
      } else if (message.content.length < 200) {
        preferences.add('concise')
      }
    })

    return Array.from(preferences)
  }

  private identifyEngagementStyle(messages: ChatMessage[]): string {
    const engagementIndicators = {
      'highly-engaged': ['thanks', 'great', 'perfect', 'exactly', 'awesome', 'love it'],
      'moderately-engaged': ['ok', 'good', 'fine', 'sure', 'alright'],
      'task-focused': ['next', 'continue', 'what about', 'also', 'and then']
    }

    const scores = { 'highly-engaged': 0, 'moderately-engaged': 0, 'task-focused': 0 }
    
    messages.forEach(message => {
      const content = message.content.toLowerCase()
      Object.entries(engagementIndicators).forEach(([style, indicators]) => {
        indicators.forEach(indicator => {
          if (content.includes(indicator)) {
            scores[style as keyof typeof scores]++
          }
        })
      })
    })

    const maxScore = Math.max(...Object.values(scores))
    if (maxScore === 0) return 'neutral'
    
    const dominantStyle = Object.entries(scores).find(([_, score]) => score === maxScore)?.[0]
    return dominantStyle || 'neutral'
  }

  private identifyTopicTransitions(messages: ChatMessage[]): string[] {
    const transitions = new Set<string>()
    
    const transitionPatterns = [
      /\b(also|additionally|furthermore|moreover|besides)\b/gi,
      /\b(but|however|although|though|nevertheless)\b/gi,
      /\b(speaking of|regarding|about|concerning)\b/gi,
      /\b(by the way|btw|oh|actually)\b/gi
    ]

    messages.forEach(message => {
      transitionPatterns.forEach(pattern => {
        const matches = message.content.match(pattern)
        if (matches) {
          matches.forEach(match => transitions.add(match.toLowerCase()))
        }
      })
    })

    return Array.from(transitions)
  }
}

// Export singleton instance
export const chatContextAnalyzer = new ChatContextAnalyzer()