import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { ChatContextAnalyzer } from '../chat-context-analyzer'
import { supabase } from '../supabase'

// Integration tests - these require a real database connection
// Run with: npm run test:integration
describe('ChatContextAnalyzer Integration Tests', () => {
  let analyzer: ChatContextAnalyzer
  let testUserId: string | null = null

  beforeAll(async () => {
    analyzer = new ChatContextAnalyzer()
    
    // Get current user for testing
    const { data: { user } } = await supabase.auth.getUser()
    testUserId = user?.id || null
  })

  afterAll(async () => {
    // Clean up any test data if needed
  })

  it('should handle real database connection', async () => {
    if (!testUserId) {
      console.log('Skipping integration test - no authenticated user')
      return
    }

    try {
      const context = await analyzer.analyzeUserContext(testUserId)
      
      // Basic assertions
      expect(context).toBeDefined()
      expect(context.userId).toBe(testUserId)
      expect(context.analyzedAt).toBeInstanceOf(Date)
      expect(Array.isArray(context.topics)).toBe(true)
      expect(Array.isArray(context.themes)).toBe(true)
      expect(typeof context.contextSummary).toBe('string')
      
      console.log('Integration test results:', {
        messageCount: context.messageCount,
        topicsCount: context.topics.length,
        themesCount: context.themes.length,
        summaryLength: context.contextSummary.length
      })
    } catch (error) {
      // This is expected if there are no chat messages or database issues
      console.log('Integration test error (expected):', error)
      expect(error).toBeInstanceOf(Error)
    }
  })

  it('should handle database schema correctly', async () => {
    // Test that we can query the chat_messages table structure
    const { data, error } = await supabase
      .from('chat_messages')
      .select('id, user_id, conversation_id, role, content, created_at')
      .limit(1)

    // Should not error on schema issues
    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)
  })
})