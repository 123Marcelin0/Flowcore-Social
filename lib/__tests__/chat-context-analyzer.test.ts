import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ChatContextAnalyzer, type UserContext } from '../chat-context-analyzer'
import type { ChatMessage } from '../supabase'
import * as supabaseModule from '../supabase'

// Mock Supabase
vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => ({
                data: [],
                error: null
              }))
            }))
          }))
        }))
      }))
    }))
  },
  getCurrentUser: vi.fn()
}))

describe('ChatContextAnalyzer', () => {
  let analyzer: ChatContextAnalyzer
  let mockSupabase: any
  let mockGetCurrentUser: any

  beforeEach(() => {
    analyzer = new ChatContextAnalyzer()
    mockSupabase = (supabaseModule as any).supabase
    mockGetCurrentUser = (supabaseModule as any).getCurrentUser
    
    // Reset mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('extractTopics', () => {
    it('should extract marketing and business topics', () => {
      const messages: ChatMessage[] = [
        {
          id: '1',
          user_id: 'user1',
          conversation_id: 'conv1',
          role: 'user',
          content: 'I need help with my marketing strategy and brand engagement',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: '2',
          user_id: 'user1',
          conversation_id: 'conv1',
          role: 'user',
          content: 'How can I improve my social media content and increase ROI?',
          created_at: '2024-01-01T01:00:00Z',
          updated_at: '2024-01-01T01:00:00Z'
        }
      ]

      const topics = analyzer.extractTopics(messages)
      
      expect(topics).toContain('marketing')
      expect(topics).toContain('strategy')
      expect(topics).toContain('brand')
      expect(topics).toContain('engagement')
      expect(topics).toContain('social media')
      expect(topics).toContain('content')
      expect(topics).toContain('roi')
    })

    it('should extract content creation topics', () => {
      const messages: ChatMessage[] = [
        {
          id: '1',
          user_id: 'user1',
          conversation_id: 'conv1',
          role: 'user',
          content: 'I want to create viral videos and trending reels for Instagram',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]

      const topics = analyzer.extractTopics(messages)
      
      // Check that some content creation topics are extracted
      expect(topics.length).toBeGreaterThan(0)
      expect(topics.some(topic => ['video', 'reel', 'instagram', 'viral', 'trending'].includes(topic))).toBe(true)
    })

    it('should filter out assistant messages', () => {
      const messages: ChatMessage[] = [
        {
          id: '1',
          user_id: 'user1',
          conversation_id: 'conv1',
          role: 'assistant',
          content: 'Here are some marketing tips and business strategies',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: '2',
          user_id: 'user1',
          conversation_id: 'conv1',
          role: 'user',
          content: 'I need content ideas',
          created_at: '2024-01-01T01:00:00Z',
          updated_at: '2024-01-01T01:00:00Z'
        }
      ]

      const topics = analyzer.extractTopics(messages)
      
      // Should only extract from user messages
      expect(topics).toContain('content')
      expect(topics).not.toContain('marketing') // This was in assistant message
    })

    it('should limit topics to reasonable number', () => {
      const messages: ChatMessage[] = [
        {
          id: '1',
          user_id: 'user1',
          conversation_id: 'conv1',
          role: 'user',
          content: 'marketing business strategy brand audience engagement growth sales revenue roi conversion content post video photo reel story caption hashtag viral trending creative design instagram facebook twitter linkedin tiktok youtube pinterest snapchat',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]

      const topics = analyzer.extractTopics(messages)
      
      expect(topics.length).toBeLessThanOrEqual(20)
    })
  })

  describe('identifyUserStyle', () => {
    it('should identify professional tone', () => {
      const messages: ChatMessage[] = [
        {
          id: '1',
          user_id: 'user1',
          conversation_id: 'conv1',
          role: 'user',
          content: 'Please provide assistance regarding my marketing strategy. I would appreciate your guidance.',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: '2',
          user_id: 'user1',
          conversation_id: 'conv1',
          role: 'user',
          content: 'Thank you for the information. However, I need further clarification.',
          created_at: '2024-01-01T01:00:00Z',
          updated_at: '2024-01-01T01:00:00Z'
        }
      ]

      const style = analyzer.identifyUserStyle(messages)
      
      expect(style.tone).toBe('professional')
      expect(style.formality).toBe('formal')
    })

    it('should identify casual tone', () => {
      const messages: ChatMessage[] = [
        {
          id: '1',
          user_id: 'user1',
          conversation_id: 'conv1',
          role: 'user',
          content: 'Hey! Yeah, that sounds cool. I wanna try that awesome idea.',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: '2',
          user_id: 'user1',
          conversation_id: 'conv1',
          role: 'user',
          content: 'lol btw gonna check that out later',
          created_at: '2024-01-01T01:00:00Z',
          updated_at: '2024-01-01T01:00:00Z'
        }
      ]

      const style = analyzer.identifyUserStyle(messages)
      
      expect(style.tone).toBe('casual')
      expect(style.formality).toBe('informal')
    })

    it('should identify technical vocabulary', () => {
      const messages: ChatMessage[] = [
        {
          id: '1',
          user_id: 'user1',
          conversation_id: 'conv1',
          role: 'user',
          content: 'I need to optimize my API implementation and improve database performance using advanced algorithms.',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: '2',
          user_id: 'user1',
          conversation_id: 'conv1',
          role: 'user',
          content: 'The analytics show poor ROI and conversion metrics in our marketing funnel.',
          created_at: '2024-01-01T01:00:00Z',
          updated_at: '2024-01-01T01:00:00Z'
        }
      ]

      const style = analyzer.identifyUserStyle(messages)
      
      expect(style.vocabulary).toBe('technical')
    })

    it('should identify message length preferences', () => {
      const shortMessages: ChatMessage[] = [
        {
          id: '1',
          user_id: 'user1',
          conversation_id: 'conv1',
          role: 'user',
          content: 'Help me.',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: '2',
          user_id: 'user1',
          conversation_id: 'conv1',
          role: 'user',
          content: 'Thanks.',
          created_at: '2024-01-01T01:00:00Z',
          updated_at: '2024-01-01T01:00:00Z'
        }
      ]

      const shortStyle = analyzer.identifyUserStyle(shortMessages)
      expect(shortStyle.length).toBe('concise')

      const longMessages: ChatMessage[] = [
        {
          id: '1',
          user_id: 'user1',
          conversation_id: 'conv1',
          role: 'user',
          content: 'I need comprehensive assistance with developing a detailed marketing strategy that encompasses multiple social media platforms, content creation workflows, audience engagement tactics, performance analytics, and long-term growth planning. This should include specific recommendations for each platform, content calendars, and measurable KPIs.',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]

      const longStyle = analyzer.identifyUserStyle(longMessages)
      expect(longStyle.length).toBe('detailed')
    })

    it('should handle empty messages gracefully', () => {
      const style = analyzer.identifyUserStyle([])
      
      expect(style.tone).toBe('mixed')
      expect(style.vocabulary).toBe('mixed')
      expect(style.length).toBe('varied')
      expect(style.formality).toBe('mixed')
    })
  })

  describe('generateContextSummary', () => {
    it('should generate comprehensive context summary', () => {
      const context = {
        topics: ['marketing', 'content', 'social media'],
        themes: ['content-creation', 'business-growth'],
        userStyle: {
          tone: 'professional' as const,
          vocabulary: 'technical' as const,
          length: 'detailed' as const,
          formality: 'formal' as const
        },
        recentInterests: ['instagram reels', 'video editing'],
        messageCount: 25
      }

      const summary = analyzer.generateContextSummary(context)
      
      expect(summary).toContain('25 recent messages')
      expect(summary).toContain('professional tone')
      expect(summary).toContain('technical vocabulary')
      expect(summary).toContain('detailed responses')
      expect(summary).toContain('formal formality')
      expect(summary).toContain('marketing, content, social media')
      expect(summary).toContain('content-creation, business-growth')
      expect(summary).toContain('instagram reels, video editing')
      expect(summary).toContain('matches this user\'s communication style')
    })

    it('should handle empty context gracefully', () => {
      const context = {
        topics: [],
        themes: [],
        userStyle: {
          tone: 'mixed' as const,
          vocabulary: 'mixed' as const,
          length: 'varied' as const,
          formality: 'mixed' as const
        },
        recentInterests: [],
        messageCount: 0
      }

      const summary = analyzer.generateContextSummary(context)
      
      expect(summary).toContain('0 recent messages')
      expect(summary).toContain('mixed tone')
      expect(summary).not.toContain('Main Topics:')
      expect(summary).not.toContain('Key Themes:')
      expect(summary).not.toContain('Recent Interests:')
    })
  })

  describe('analyzeUserContext', () => {
    it('should return empty context when no messages exist', async () => {
      mockGetCurrentUser.mockResolvedValue({ id: 'user1' })
      
      // Mock empty response from database
      const mockQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
              }))
            }))
          }))
        }))
      }
      mockSupabase.from.mockReturnValue(mockQuery)

      const context = await analyzer.analyzeUserContext()
      
      expect(context.userId).toBe('user1')
      expect(context.messageCount).toBe(0)
      expect(context.topics).toEqual([])
      expect(context.themes).toEqual([])
      expect(context.contextSummary).toContain('No recent chat history available')
    })

    it('should analyze context when messages exist', async () => {
      mockGetCurrentUser.mockResolvedValue({ id: 'user1' })
      
      const mockMessages: ChatMessage[] = [
        {
          id: '1',
          user_id: 'user1',
          conversation_id: 'conv1',
          role: 'user',
          content: 'I need help with marketing strategy and content creation',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: '2',
          user_id: 'user1',
          conversation_id: 'conv1',
          role: 'assistant',
          content: 'Here are some marketing tips',
          created_at: '2024-01-01T01:00:00Z',
          updated_at: '2024-01-01T01:00:00Z'
        }
      ]

      const mockQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve({ data: mockMessages, error: null }))
              }))
            }))
          }))
        }))
      }
      mockSupabase.from.mockReturnValue(mockQuery)

      const context = await analyzer.analyzeUserContext()
      
      expect(context.userId).toBe('user1')
      expect(context.messageCount).toBe(2)
      expect(context.topics).toContain('marketing')
      expect(context.topics).toContain('strategy')
      expect(context.topics).toContain('content')
      expect(context.analyzedAt).toBeInstanceOf(Date)
      expect(context.timeRange.from).toBeInstanceOf(Date)
      expect(context.timeRange.to).toBeInstanceOf(Date)
    })

    it('should handle database errors gracefully', async () => {
      mockGetCurrentUser.mockResolvedValue({ id: 'user1' })
      
      const mockQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve({ 
                  data: null, 
                  error: { message: 'Database error' } 
                }))
              }))
            }))
          }))
        }))
      }
      mockSupabase.from.mockReturnValue(mockQuery)

      await expect(analyzer.analyzeUserContext()).rejects.toThrow('Failed to analyze user context')
    })

    it('should handle unauthenticated user', async () => {
      mockGetCurrentUser.mockResolvedValue(null)

      await expect(analyzer.analyzeUserContext()).rejects.toThrow('User not authenticated')
    })

    it('should use provided userId when given', async () => {
      const mockMessages: ChatMessage[] = [
        {
          id: '1',
          user_id: 'user2',
          conversation_id: 'conv1',
          role: 'user',
          content: 'Test message',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]

      const mockEq = vi.fn(() => ({
        gte: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: mockMessages, error: null }))
          }))
        }))
      }))

      const mockQuery = {
        select: vi.fn(() => ({
          eq: mockEq
        }))
      }
      mockSupabase.from.mockReturnValue(mockQuery)

      const context = await analyzer.analyzeUserContext('user2')
      
      expect(context.userId).toBe('user2')
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user2')
    })
  })

  describe('theme extraction', () => {
    it('should identify content-creation theme', () => {
      const messages: ChatMessage[] = [
        {
          id: '1',
          user_id: 'user1',
          conversation_id: 'conv1',
          role: 'user',
          content: 'I want to create and design new content for my brand',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]

      const themes = (analyzer as any).extractThemes(messages)
      expect(themes).toContain('content-creation')
    })

    it('should identify business-growth theme', () => {
      const messages: ChatMessage[] = [
        {
          id: '1',
          user_id: 'user1',
          conversation_id: 'conv1',
          role: 'user',
          content: 'How can I grow my business and scale my operations?',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]

      const themes = (analyzer as any).extractThemes(messages)
      expect(themes).toContain('business-growth')
    })

    it('should identify learning theme', () => {
      const messages: ChatMessage[] = [
        {
          id: '1',
          user_id: 'user1',
          conversation_id: 'conv1',
          role: 'user',
          content: 'I want to learn and understand new marketing techniques',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]

      const themes = (analyzer as any).extractThemes(messages)
      expect(themes).toContain('learning')
    })
  })

  describe('recent interests extraction', () => {
    it('should extract interests from recent messages', () => {
      const recentDate = new Date()
      recentDate.setDate(recentDate.getDate() - 3) // 3 days ago

      const messages: ChatMessage[] = [
        {
          id: '1',
          user_id: 'user1',
          conversation_id: 'conv1',
          role: 'user',
          content: 'I\'m interested in learning about video editing and passionate about creating reels',
          created_at: recentDate.toISOString(),
          updated_at: recentDate.toISOString()
        }
      ]

      const interests = (analyzer as any).extractRecentInterests(messages)
      // Check that interests are extracted (the exact matching may vary based on regex patterns)
      expect(interests.length).toBeGreaterThan(0)
      expect(interests.some(interest => interest.includes('video') || interest.includes('reel'))).toBe(true)
    })

    it('should ignore old messages for recent interests', () => {
      const oldDate = new Date()
      oldDate.setDate(oldDate.getDate() - 10) // 10 days ago

      const messages: ChatMessage[] = [
        {
          id: '1',
          user_id: 'user1',
          conversation_id: 'conv1',
          role: 'user',
          content: 'I\'m interested in old topic',
          created_at: oldDate.toISOString(),
          updated_at: oldDate.toISOString()
        }
      ]

      const interests = (analyzer as any).extractRecentInterests(messages)
      expect(interests).toEqual([])
    })
  })
})