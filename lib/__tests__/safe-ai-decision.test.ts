/**
 * Unit tests for safe AI decision handling
 */

import {
  normalizeAIDecision,
  createDefaultAIDecision,
  safeJsonParse,
  safeLogDecision,
  mergeWithFallback,
  validateSegmentTiming,
  generateRequestId,
  type SafeAIDecision
} from '../safe-ai-decision'

describe('Safe AI Decision Handler', () => {
  describe('createDefaultAIDecision', () => {
    it('should create a valid default structure', () => {
      const decision = createDefaultAIDecision()
      
      expect(decision.keepSegments).toEqual([])
      expect(decision.removeSegments).toEqual([])
      expect(decision.statistics.reductionPercentage).toBe(0)
      expect(decision.qualityScore).toBe(0.5)
      expect(decision.processingMetadata.fallbackUsed).toBe(true)
    })
    
    it('should merge overrides correctly', () => {
      const decision = createDefaultAIDecision({
        qualityScore: 0.8,
        keepSegments: [{ start: 0, end: 5, score: 0.9 }]
      })
      
      expect(decision.qualityScore).toBe(0.8)
      expect(decision.keepSegments).toHaveLength(1)
      expect(decision.keepSegments[0].start).toBe(0)
    })
  })

  describe('safeJsonParse', () => {
    it('should parse valid JSON', () => {
      const result = safeJsonParse('{"test": true}')
      expect(result).toEqual({ test: true })
    })
    
    it('should return fallback for invalid JSON', () => {
      const result = safeJsonParse('invalid json', { fallback: true })
      expect(result).toEqual({ fallback: true })
    })
    
    it('should return null for malformed input', () => {
      expect(safeJsonParse(null as any)).toBe(null)
      expect(safeJsonParse(undefined as any)).toBe(null)
      expect(safeJsonParse('')).toBe(null)
    })
  })

  describe('normalizeAIDecision', () => {
    const requestId = 'test-req-123'
    const model = 'gpt-4o-mini'
    
    it('should handle null/undefined input gracefully', () => {
      const result = normalizeAIDecision(null, requestId, model, 100)
      
      expect(result.keepSegments).toEqual([])
      expect(result.removeSegments).toEqual([])
      expect(result.processingMetadata.fallbackUsed).toBe(true)
      expect(result.processingMetadata.validationErrors).toContain('Raw decision is not an object')
    })
    
    it('should normalize valid AI response', () => {
      const rawDecision = {
        keepSegments: [
          { start: 0, end: 5.5, score: 0.8, reason: 'good content' },
          { start: 10, end: 15, score: 0.9 }
        ],
        removeSegments: [
          { start: 5.5, end: 10, reason: 'filler words', confidence: 0.7 }
        ],
        statistics: {
          originalDuration: 20,
          finalDuration: 10.5,
          reductionPercentage: 47.5,
          silenceRemoved: 2,
          fillersRemoved: 1
        },
        qualityScore: 0.85,
        recommendations: ['Consider smoother transitions'],
        confidence: 0.9
      }
      
      const result = normalizeAIDecision(rawDecision, requestId, model, 150)
      
      expect(result.keepSegments).toHaveLength(2)
      expect(result.removeSegments).toHaveLength(1)
      expect(result.statistics.reductionPercentage).toBe(47.5)
      expect(result.qualityScore).toBe(0.85)
      expect(result.confidence).toBe(0.9)
      expect(result.processingMetadata.fallbackUsed).toBe(false)
    })
    
    it('should handle malformed segments', () => {
      const rawDecision = {
        keepSegments: [
          { start: 'invalid', end: 5, score: 0.8 }, // Invalid start
          { start: 10, end: 8, score: 0.9 }, // Invalid timing (end < start)
          { start: 15, end: 20, score: 0.7 } // Valid
        ],
        removeSegments: 'not an array', // Invalid type
        statistics: {
          reductionPercentage: 150 // Should be clamped to 100
        }
      }
      
      const result = normalizeAIDecision(rawDecision, requestId, model)
      
      expect(result.keepSegments).toHaveLength(1) // Only valid segment kept
      expect(result.keepSegments[0].start).toBe(15)
      expect(result.removeSegments).toHaveLength(0)
      expect(result.statistics.reductionPercentage).toBe(100) // Clamped
      expect(result.processingMetadata.validationErrors).toContain('removeSegments is not an array')
    })
    
    it('should clamp values to valid ranges', () => {
      const rawDecision = {
        qualityScore: 1.5, // Should be clamped to 1
        confidence: -0.5, // Should be clamped to 0
        statistics: {
          reductionPercentage: 200 // Should be clamped to 100
        }
      }
      
      const result = normalizeAIDecision(rawDecision, requestId, model)
      
      expect(result.qualityScore).toBe(1)
      expect(result.confidence).toBe(0)
      expect(result.statistics.reductionPercentage).toBe(100)
    })
  })

  describe('validateSegmentTiming', () => {
    it('should validate correct timing', () => {
      const segments = [
        { start: 0, end: 5, score: 0.8 },
        { start: 10, end: 15, score: 0.9 }
      ]
      
      const errors = validateSegmentTiming(segments)
      expect(errors).toHaveLength(0)
    })
    
    it('should detect timing errors', () => {
      const segments = [
        { start: 5, end: 3, score: 0.8 }, // Invalid: start > end
        { start: -1, end: 2, score: 0.9 }, // Invalid: negative start
        { start: 10, end: 12, score: 0.7 }, // Valid
        { start: 11, end: 15, score: 0.6 } // Invalid: overlap with previous
      ]
      
      const errors = validateSegmentTiming(segments as any)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0]).toContain('start (5) must be less than end (3)')
      expect(errors[1]).toContain('start time cannot be negative')
      expect(errors[2]).toContain('overlap detected')
    })
  })

  describe('mergeWithFallback', () => {
    it('should use AI decision when confidence is high', () => {
      const aiDecision: SafeAIDecision = createDefaultAIDecision({
        confidence: 0.9,
        keepSegments: [{ start: 0, end: 5, score: 0.8 }]
      })
      
      const fallbackSegments = [
        { start: 10, end: 15 },
        { start: 20, end: 25 }
      ]
      
      const result = mergeWithFallback(aiDecision, fallbackSegments, 30)
      
      expect(result.keepSegments).toHaveLength(1) // Only AI segments
      expect(result.processingMetadata.fallbackUsed).toBe(true) // Was set in createDefaultAIDecision
    })
    
    it('should merge with fallback when confidence is low', () => {
      const aiDecision: SafeAIDecision = createDefaultAIDecision({
        confidence: 0.2, // Low confidence
        keepSegments: []
      })
      
      const fallbackSegments = [
        { start: 0, end: 5 },
        { start: 10, end: 15 }
      ]
      
      const result = mergeWithFallback(aiDecision, fallbackSegments, 20)
      
      expect(result.keepSegments).toHaveLength(2) // Fallback segments added
      expect(result.statistics.originalDuration).toBe(20)
      expect(result.processingMetadata.fallbackUsed).toBe(true)
    })
  })

  describe('safeLogDecision', () => {
    // Mock console to test logging
    let consoleInfoSpy: jest.SpyInstance
    let consoleWarnSpy: jest.SpyInstance
    
    beforeEach(() => {
      consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation()
      consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
    })
    
    afterEach(() => {
      consoleInfoSpy.mockRestore()
      consoleWarnSpy.mockRestore()
    })
    
    it('should log valid decision without errors', () => {
      const decision = {
        keepSegments: [{ start: 0, end: 5 }],
        removeSegments: [],
        qualityScore: 0.8,
        confidence: 0.9,
        statistics: {}
      }
      
      safeLogDecision(decision, 'test-context')
      
      expect(consoleInfoSpy).toHaveBeenCalledWith({
        event: 'ai_decision_log',
        context: 'test-context',
        keepSegmentsCount: 1,
        removeSegmentsCount: 0,
        qualityScore: 0.8,
        confidence: 0.9,
        hasStatistics: true,
        timestamp: expect.any(String)
      })
    })
    
    it('should handle malformed decision gracefully', () => {
      safeLogDecision(null, 'test-context')
      
      expect(consoleInfoSpy).toHaveBeenCalledWith({
        event: 'ai_decision_log',
        context: 'test-context',
        keepSegmentsCount: 0,
        removeSegmentsCount: 0,
        qualityScore: 'unknown',
        confidence: 'unknown',
        hasStatistics: false,
        timestamp: expect.any(String)
      })
    })
  })

  describe('generateRequestId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateRequestId()
      const id2 = generateRequestId()
      
      expect(id1).not.toBe(id2)
      expect(id1).toMatch(/^req_\d+_[a-z0-9]+$/)
      expect(id2).toMatch(/^req_\d+_[a-z0-9]+$/)
    })
  })
})