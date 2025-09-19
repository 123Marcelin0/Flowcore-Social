/**
 * Integration tests for AI reliability and parsing improvements
 */

import { 
  normalizeAIDecision, 
  createDefaultAIDecision,
  mergeWithFallback,
  SafeAIDecision 
} from '../safe-ai-decision'
import { 
  analyzeWithLocalHeuristics, 
  intelligentMerge,
  LocalHeuristics,
  HeuristicOptions
} from '../fallback-heuristics'
import { 
  makeStructuredAIRequest,
  makeStructuredCaptionRequest
} from '../structured-ai-responses'
import OpenAI from 'openai'

// Mock OpenAI for testing
jest.mock('openai')
const MockedOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>

describe('AI Reliability Integration Tests', () => {
  let mockOpenAI: jest.Mocked<OpenAI>
  
  beforeEach(() => {
    mockOpenAI = new MockedOpenAI() as jest.Mocked<OpenAI>
    // Mock the chat.completions.create method
    mockOpenAI.chat = {
      completions: {
        create: jest.fn()
      }
    } as any
  })

  describe('End-to-End AI Decision Processing', () => {
    const mockSegments = [
      { 
        start: 0, 
        end: 5, 
        text: 'Hello everyone, welcome to the show',
        confidence: 0.9,
        words: [
          { word: 'Hello', start: 0, end: 0.5, confidence: 0.95 },
          { word: 'everyone', start: 0.6, end: 1.2, confidence: 0.9 },
          { word: 'welcome', start: 1.3, end: 1.8, confidence: 0.85 },
          { word: 'to', start: 1.9, end: 2.0, confidence: 0.9 },
          { word: 'the', start: 2.1, end: 2.3, confidence: 0.8 },
          { word: 'show', start: 2.4, end: 2.8, confidence: 0.9 }
        ]
      },
      {
        start: 7, // 2 second gap
        end: 10,
        text: 'Um, so today we are going to talk about',
        confidence: 0.7,
        words: [
          { word: 'Um', start: 7, end: 7.2, confidence: 0.6 },
          { word: 'so', start: 7.3, end: 7.5, confidence: 0.8 },
          { word: 'today', start: 7.6, end: 8.0, confidence: 0.9 }
        ]
      },
      {
        start: 10,
        end: 15,
        text: 'artificial intelligence and machine learning',
        confidence: 0.95,
        words: [
          { word: 'artificial', start: 10, end: 10.8, confidence: 0.95 },
          { word: 'intelligence', start: 10.9, end: 11.8, confidence: 0.9 },
          { word: 'and', start: 11.9, end: 12.1, confidence: 0.85 },
          { word: 'machine', start: 12.2, end: 12.8, confidence: 0.9 },
          { word: 'learning', start: 12.9, end: 13.5, confidence: 0.95 }
        ]
      }
    ]

    it('should handle successful AI response with validation', async () => {
      // Mock successful OpenAI response
      const mockAIResponse = {
        choices: [{
          message: {
            function_call: {
              name: 'create_edit_decision',
              arguments: JSON.stringify({
                keepSegments: [
                  { start: 0, end: 5, score: 0.9, reason: 'good introduction' },
                  { start: 10, end: 15, score: 0.95, reason: 'main content' }
                ],
                removeSegments: [
                  { start: 7, end: 10, reason: 'contains filler words', confidence: 0.8 }
                ],
                statistics: {
                  originalDuration: 15,
                  finalDuration: 10,
                  reductionPercentage: 33.3
                },
                qualityScore: 0.85,
                confidence: 0.9,
                recommendations: ['Consider smoother transitions']
              })
            }
          }
        }]
      }

      mockOpenAI.chat.completions.create.mockResolvedValue(mockAIResponse as any)

      const context = {
        uploadId: 'test-upload-123',
        segments: mockSegments,
        requestId: 'test-req-456'
      }

      const result = await makeStructuredAIRequest(mockOpenAI, context)

      expect(result.keepSegments).toHaveLength(2)
      expect(result.removeSegments).toHaveLength(1)
      expect(result.confidence).toBe(0.9)
      expect(result.processingMetadata.fallbackUsed).toBe(false)
    })

    it('should handle malformed AI response gracefully', async () => {
      // Mock malformed OpenAI response
      const mockAIResponse = {
        choices: [{
          message: {
            function_call: {
              name: 'create_edit_decision',
              arguments: 'invalid json here'
            }
          }
        }]
      }

      mockOpenAI.chat.completions.create.mockResolvedValue(mockAIResponse as any)

      const context = {
        uploadId: 'test-upload-123',
        segments: mockSegments
      }

      const result = await makeStructuredAIRequest(mockOpenAI, context)

      expect(result.keepSegments).toHaveLength(0)
      expect(result.removeSegments).toHaveLength(0)
      expect(result.processingMetadata.fallbackUsed).toBe(true)
      expect(result.processingMetadata.validationErrors).toContain('Failed to parse JSON response')
    })

    it('should merge AI decision with local heuristics when confidence is low', async () => {
      // Mock low-confidence AI response
      const mockAIResponse = {
        choices: [{
          message: {
            function_call: {
              name: 'create_edit_decision',
              arguments: JSON.stringify({
                keepSegments: [],
                removeSegments: [],
                statistics: {
                  originalDuration: 15,
                  finalDuration: 15,
                  reductionPercentage: 0
                },
                qualityScore: 0.3,
                confidence: 0.2 // Low confidence
              })
            }
          }
        }]
      }

      mockOpenAI.chat.completions.create.mockResolvedValue(mockAIResponse as any)

      const context = {
        uploadId: 'test-upload-123',
        segments: mockSegments
      }

      // Get AI decision
      const aiDecision = await makeStructuredAIRequest(mockOpenAI, context)

      // Analyze with local heuristics
      const localHeuristics = analyzeWithLocalHeuristics(mockSegments, {
        longPauseThreshold: 1.5,
        fillerWordList: ['um', 'so']
      })

      // Merge intelligently
      const mergedDecision = intelligentMerge(aiDecision, localHeuristics, mockSegments)

      expect(mergedDecision.processingMetadata.fallbackUsed).toBe(true)
      expect(mergedDecision.confidence).toBeGreaterThan(aiDecision.confidence)
      // Should have found some segments to remove (silence and fillers)
      expect(mergedDecision.removeSegments.length).toBeGreaterThan(0)
    })
  })

  describe('Local Heuristics Analysis', () => {
    it('should detect silence segments', () => {
      const segments = [
        { start: 0, end: 2, text: 'First segment' },
        { start: 5, end: 8, text: 'Second segment' }, // 3 second gap
        { start: 10, end: 12, text: 'Third segment' }   // 2 second gap
      ]

      const heuristics = analyzeWithLocalHeuristics(segments, {
        longPauseThreshold: 2.0
      })

      expect(heuristics.silenceSegments).toHaveLength(2)
      expect(heuristics.silenceSegments[0]).toEqual({
        start: 2,
        end: 5,
        confidence: 1.0 // 3/2 = 1.5, clamped to 1.0
      })
    })

    it('should detect filler words', () => {
      const segments = [{
        start: 0,
        end: 5,
        text: 'Um, like, you know what I mean',
        words: [
          { word: 'Um', start: 0, end: 0.5 },
          { word: 'like', start: 1, end: 1.5 },
          { word: 'you', start: 2, end: 2.3 },
          { word: 'know', start: 2.4, end: 2.8 },
          { word: 'what', start: 3, end: 3.3 },
          { word: 'I', start: 3.5, end: 3.6 },
          { word: 'mean', start: 3.7, end: 4 }
        ]
      }]

      const heuristics = analyzeWithLocalHeuristics(segments, {
        fillerWordList: ['um', 'like', 'you know']
      })

      expect(heuristics.fillerWords).toHaveLength(2) // 'Um' and 'like'
      expect(heuristics.fillerWords[0].word).toBe('um')
      expect(heuristics.fillerWords[1].word).toBe('like')
    })

    it('should detect low confidence segments', () => {
      const segments = [
        { start: 0, end: 3, confidence: 0.9, text: 'Good segment' },
        { start: 3, end: 6, confidence: 0.4, text: 'Bad segment' }, // Low confidence
        { start: 6, end: 9, confidence: 0.8, text: 'OK segment' }
      ]

      const heuristics = analyzeWithLocalHeuristics(segments, {
        minConfidenceThreshold: 0.6
      })

      expect(heuristics.lowConfidenceSegments).toHaveLength(1)
      expect(heuristics.lowConfidenceSegments[0]).toEqual({
        start: 3,
        end: 6,
        avgConfidence: 0.4
      })
    })
  })

  describe('Intelligent Merging Strategies', () => {
    let mockHeuristics: LocalHeuristics

    beforeEach(() => {
      mockHeuristics = {
        silenceSegments: [
          { start: 5, end: 7, confidence: 0.9 }
        ],
        fillerWords: [
          { start: 2, end: 2.5, word: 'um', confidence: 0.8 }
        ],
        lowConfidenceSegments: [
          { start: 10, end: 12, avgConfidence: 0.3 }
        ],
        pauseAnalysis: {
          shortPauses: 2,
          mediumPauses: 1,
          longPauses: 1,
          averagePauseLength: 1.2
        },
        readingSpeed: {
          averageCps: 15,
          segments: []
        },
        processingMetadata: {
          processingTimeMs: 100,
          methodsUsed: ['silence_detection', 'filler_detection'],
          totalSegments: 3,
          totalWords: 20
        }
      }
    })

    it('should trust high-confidence AI decisions', () => {
      const highConfidenceAI = createDefaultAIDecision({
        confidence: 0.9,
        keepSegments: [{ start: 0, end: 5, score: 0.9 }],
        qualityScore: 0.8
      })

      const result = intelligentMerge(
        highConfidenceAI, 
        mockHeuristics, 
        [], 
        { aggressiveness: 'balanced' }
      )

      expect(result.keepSegments).toHaveLength(1) // Should keep AI decision
      // May have additional remove segments from local heuristics
      expect(result.removeSegments.length).toBeGreaterThanOrEqual(0)
    })

    it('should use fallback for very low confidence AI', () => {
      const lowConfidenceAI = createDefaultAIDecision({
        confidence: 0.2,
        keepSegments: [],
        removeSegments: []
      })

      const originalSegments = [
        { start: 0, end: 3, confidence: 0.9 },
        { start: 3, end: 6, confidence: 0.8 },
        { start: 6, end: 9, confidence: 0.7 }
      ]

      const result = intelligentMerge(
        lowConfidenceAI,
        mockHeuristics,
        originalSegments,
        { aggressiveness: 'conservative' }
      )

      expect(result.processingMetadata.fallbackUsed).toBe(true)
      expect(result.confidence).toBeGreaterThan(0.2)
      expect(result.processingMetadata.model).toBe('local_heuristics')
    })

    it('should merge aggressively when configured', () => {
      const mediumConfidenceAI = createDefaultAIDecision({
        confidence: 0.5,
        removeSegments: []
      })

      const result = intelligentMerge(
        mediumConfidenceAI,
        mockHeuristics,
        [],
        { aggressiveness: 'aggressive' }
      )

      // Should add more remove segments in aggressive mode
      const removedReasons = result.removeSegments.map(s => s.reason)
      expect(removedReasons.some(r => r.includes('silence'))).toBe(true)
      expect(removedReasons.some(r => r.includes('filler'))).toBe(true)
      expect(removedReasons.some(r => r.includes('low_confidence'))).toBe(true)
    })
  })

  describe('Caption Segmentation', () => {
    it('should handle caption segmentation requests', async () => {
      const mockCaptionResponse = {
        choices: [{
          message: {
            function_call: {
              name: 'create_caption_segments',
              arguments: JSON.stringify({
                cards: [
                  {
                    start: 0,
                    end: 2.5,
                    text: 'Hello everyone',
                    words: [
                      { word: 'Hello', start: 0, end: 0.5, confidence: 0.9 },
                      { word: 'everyone', start: 0.6, end: 1.2, confidence: 0.9 }
                    ],
                    confidence: 0.9
                  }
                ],
                metadata: {
                  totalCards: 1,
                  averageWordsPerCard: 2,
                  qualityScore: 0.85
                }
              })
            }
          }
        }]
      }

      mockOpenAI.chat.completions.create.mockResolvedValue(mockCaptionResponse as any)

      const words = [
        { word: 'Hello', start: 0, end: 0.5, confidence: 0.9 },
        { word: 'everyone', start: 0.6, end: 1.2, confidence: 0.9 }
      ]

      const result = await makeStructuredCaptionRequest(mockOpenAI, words)

      expect(result.cards).toHaveLength(1)
      expect(result.cards[0].text).toBe('Hello everyone')
      expect(result.metadata.totalCards).toBe(1)
    })
  })

  describe('Error Recovery', () => {
    it('should handle OpenAI API errors gracefully', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(
        new Error('API rate limit exceeded')
      )

      const context = {
        uploadId: 'test-upload-123',
        segments: [{ start: 0, end: 5, text: 'Test segment' }]
      }

      const result = await makeStructuredAIRequest(mockOpenAI, context)

      expect(result.processingMetadata.fallbackUsed).toBe(true)
      expect(result.processingMetadata.validationErrors).toContain('API rate limit exceeded')
    })

    it('should handle partial AI responses', () => {
      const partialResponse = {
        keepSegments: [{ start: 0, end: 5, score: 0.8 }],
        // Missing removeSegments
        statistics: {
          originalDuration: 10
          // Missing other required fields
        },
        // Missing qualityScore and confidence
      }

      const normalized = normalizeAIDecision(partialResponse, 'test-req', 'gpt-4o-mini', 100)

      expect(normalized.keepSegments).toHaveLength(1)
      expect(normalized.removeSegments).toHaveLength(0) // Should default to empty
      expect(normalized.statistics.finalDuration).toBe(0) // Should default
      expect(normalized.qualityScore).toBe(0.5) // Should default
      expect(normalized.confidence).toBe(0.5) // Should default
    })
  })

  describe('Performance and Logging', () => {
    it('should track processing times', async () => {
      const mockResponse = {
        choices: [{
          message: {
            function_call: {
              name: 'create_edit_decision',
              arguments: JSON.stringify({
                keepSegments: [],
                removeSegments: [],
                statistics: { originalDuration: 0, finalDuration: 0, reductionPercentage: 0 },
                qualityScore: 0.5,
                confidence: 0.5
              })
            }
          }
        }]
      }

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse as any)

      const context = {
        uploadId: 'test-upload-123',
        segments: []
      }

      const result = await makeStructuredAIRequest(mockOpenAI, context)

      expect(result.processingMetadata.processingTimeMs).toBeGreaterThan(0)
      expect(result.processingMetadata.requestId).toMatch(/^req_\d+_[a-z0-9]+$/)
    })

    it('should handle large segment arrays efficiently', () => {
      // Create a large array of segments
      const largeSegmentArray = Array.from({ length: 1000 }, (_, i) => ({
        start: i * 5,
        end: (i + 1) * 5,
        text: `Segment ${i}`,
        confidence: 0.8 + (Math.random() * 0.2)
      }))

      const startTime = Date.now()
      const heuristics = analyzeWithLocalHeuristics(largeSegmentArray)
      const processingTime = Date.now() - startTime

      expect(heuristics.processingMetadata.totalSegments).toBe(1000)
      expect(processingTime).toBeLessThan(5000) // Should process in under 5 seconds
    })
  })
})