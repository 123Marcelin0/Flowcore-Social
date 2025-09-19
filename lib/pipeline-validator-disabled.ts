/**
 * Video Pipeline Robustness Validator
 * 
 * Tests the video processing pipeline with various edge cases, malformed inputs,
 * and error conditions to ensure it handles failures gracefully.
 */

import { makeEnhancedEditingDecision, collectEnhancedHeuristics } from './enhanced-decision-engine'
import { transcribeWithEnhancedTiming } from './transcribe'
import { jobQueue } from './job-queue'
import { contentModerationService } from './content-moderation'
import { errorDiagnostics } from './error-diagnostics'

export interface ValidationResult {
  testName: string
  passed: boolean
  duration: number
  error?: string
  details?: any
}

export interface PipelineHealthReport {
  overallHealth: 'healthy' | 'degraded' | 'failing'
  totalTests: number
  passedTests: number
  failedTests: number
  testResults: ValidationResult[]
  recommendations: string[]
}

export class PipelineValidator {
  
  /**
   * Run comprehensive pipeline validation tests
   */
  async validatePipeline(): Promise<PipelineHealthReport> {
    console.log('🧪 Starting comprehensive pipeline validation...')
    
    const testResults: ValidationResult[] = []
    
    // Test 1: Decision engine with valid input
    testResults.push(await this.testDecisionEngineValid())
    
    // Test 2: Decision engine with malformed input
    testResults.push(await this.testDecisionEngineMalformed())
    
    // Test 3: Decision engine with missing OpenAI
    testResults.push(await this.testDecisionEngineNoOpenAI())
    
    // Test 4: Job queue operations
    testResults.push(await this.testJobQueueOperations())
    
    // Test 5: Idempotency protection
    testResults.push(await this.testIdempotencyProtection())
    
    // Test 6: Content moderation with various inputs
    testResults.push(await this.testContentModeration())
    
    // Test 7: Error handling and recovery
    testResults.push(await this.testErrorHandling())
    
    // Test 8: Memory and resource limits
    testResults.push(await this.testResourceLimits())
    
    const passedTests = testResults.filter(r => r.passed).length
    const failedTests = testResults.length - passedTests
    
    let overallHealth: 'healthy' | 'degraded' | 'failing' = 'healthy'
    if (failedTests > testResults.length * 0.5) {
      overallHealth = 'failing'
    } else if (failedTests > testResults.length * 0.2) {
      overallHealth = 'degraded'
    }
    
    const recommendations = this.generateRecommendations(testResults)
    
    const report: PipelineHealthReport = {
      overallHealth,
      totalTests: testResults.length,
      passedTests,
      failedTests,
      testResults,
      recommendations
    }
    
    console.log(`✅ Pipeline validation complete: ${passedTests}/${testResults.length} tests passed`)
    console.log(`🏥 Overall health: ${overallHealth}`)
    
    return report
  }

  /**
   * Test decision engine with valid input
   */
  private async testDecisionEngineValid(): Promise<ValidationResult> {
    const startTime = Date.now()
    
    try {
      const mockHeuristics = this.createMockHeuristics()
      const input = {
        uploadId: 'test-valid',
        audioUrl: 'https://example.com/audio.mp3',
        heuristics: mockHeuristics,
        options: {
          aggressiveness: 'balanced' as const,
          preserveNaturalPauses: true,
          enableAutoFix: true,
          targetReduction: 25
        }
      }
      
      const result = await makeEnhancedEditingDecision(input)
      
      // Validate result structure
      const isValid = result &&
        typeof result === 'object' &&
        Array.isArray(result.keepSegments) &&
        Array.isArray(result.removeSegments) &&
        typeof result.statistics === 'object' &&
        typeof result.qualityScore === 'number'
      
      return {
        testName: 'decision_engine_valid_input',
        passed: isValid,
        duration: Date.now() - startTime,
        details: {
          hasKeepSegments: Array.isArray(result.keepSegments),
          hasRemoveSegments: Array.isArray(result.removeSegments),
          hasStatistics: typeof result.statistics === 'object',
          qualityScore: result.qualityScore
        }
      }
      
    } catch (error) {
      return {
        testName: 'decision_engine_valid_input',
        passed: false,
        duration: Date.now() - startTime,
        error: String(error)
      }
    }
  }

  /**
   * Test decision engine with malformed input
   */
  private async testDecisionEngineMalformed(): Promise<ValidationResult> {
    const startTime = Date.now()
    
    try {
      // Test with completely invalid input
      const result = await makeEnhancedEditingDecision({} as any)
      
      // Should return fallback decision, not crash
      const handled = result &&
        typeof result === 'object' &&
        Array.isArray(result.keepSegments) &&
        Array.isArray(result.removeSegments)
      
      return {
        testName: 'decision_engine_malformed_input',
        passed: handled,
        duration: Date.now() - startTime,
        details: {
          returnedFallback: handled,
          resultType: typeof result
        }
      }
      
    } catch (error) {
      // Should NOT throw - defensive code should handle this
      return {
        testName: 'decision_engine_malformed_input',
        passed: false,
        duration: Date.now() - startTime,
        error: `Should not throw: ${String(error)}`
      }
    }
  }

  /**
   * Test decision engine without OpenAI access
   */
  private async testDecisionEngineNoOpenAI(): Promise<ValidationResult> {
    const startTime = Date.now()
    
    try {
      // Temporarily disable OpenAI key
      const originalKey = process.env.OPENAI_API_KEY
      process.env.OPENAI_API_KEY = 'invalid-key'
      
      const mockHeuristics = this.createMockHeuristics()
      const input = {
        uploadId: 'test-no-openai',
        audioUrl: 'https://example.com/audio.mp3',
        heuristics: mockHeuristics,
        options: {
          aggressiveness: 'balanced' as const,
          preserveNaturalPauses: true,
          enableAutoFix: true,
          targetReduction: 25
        }
      }
      
      const result = await makeEnhancedEditingDecision(input)
      
      // Restore original key
      process.env.OPENAI_API_KEY = originalKey
      
      // Should return fallback decision gracefully
      const handled = result &&
        typeof result === 'object' &&
        Array.isArray(result.keepSegments) &&
        Array.isArray(result.removeSegments)
      
      return {
        testName: 'decision_engine_no_openai',
        passed: handled,
        duration: Date.now() - startTime,
        details: {
          returnedFallback: handled,
          qualityScore: result.qualityScore
        }
      }
      
    } catch (error) {
      // Restore key even if error occurs
      const originalKey = process.env.OPENAI_API_KEY
      process.env.OPENAI_API_KEY = originalKey
      
      return {
        testName: 'decision_engine_no_openai',
        passed: false,
        duration: Date.now() - startTime,
        error: String(error)
      }
    }
  }

  /**
   * Test job queue operations
   */
  private async testJobQueueOperations(): Promise<ValidationResult> {
    const startTime = Date.now()
    
    try {
      // Test creating a job
      const jobId = await jobQueue.createJob(
        'transcribe',
        { testData: 'pipeline-validation' }
      )
      
      // Test retrieving job
      const job = await jobQueue.getJob(jobId)
      const hasJob = job && job.job_id === jobId
      
      // Test updating job status
      await jobQueue.updateJobStatus(jobId, 'processing')
      const updatedJob = await jobQueue.getJob(jobId)
      const statusUpdated = updatedJob?.status === 'processing'
      
      // Clean up
      await jobQueue.updateJobStatus(jobId, 'cancelled')
      
      return {
        testName: 'job_queue_operations',
        passed: hasJob && statusUpdated,
        duration: Date.now() - startTime,
        details: {
          jobCreated: !!jobId,
          jobRetrieved: hasJob,
          statusUpdated
        }
      }
      
    } catch (error) {
      return {
        testName: 'job_queue_operations',
        passed: false,
        duration: Date.now() - startTime,
        error: String(error)
      }
    }
  }

  /**
   * Test idempotency protection
   */
  private async testIdempotencyProtection(): Promise<ValidationResult> {
    const startTime = Date.now()
    
    try {
      const params = { testKey: 'idempotency-test', timestamp: Date.now() }
      
      // First operation should create lock
      const check1 = await jobQueue.checkIdempotency('test_operation', params)
      const firstCheck = !check1.exists
      
      // Create lock
      const lockKey = await jobQueue.createOperationLock('test_operation', params, 'test-resource')
      
      // Second operation should detect existing lock
      const check2 = await jobQueue.checkIdempotency('test_operation', params)
      const secondCheck = check2.exists && check2.status === 'processing'
      
      // Complete operation
      await jobQueue.completeOperationLock(lockKey, { result: 'test-success' })
      
      // Third check should return completed result
      const check3 = await jobQueue.checkIdempotency('test_operation', params)
      const thirdCheck = check3.exists && check3.status === 'completed'
      
      return {
        testName: 'idempotency_protection',
        passed: firstCheck && secondCheck && thirdCheck,
        duration: Date.now() - startTime,
        details: {
          firstCheck,
          secondCheck,
          thirdCheck,
          lockKey: !!lockKey
        }
      }
      
    } catch (error) {
      return {
        testName: 'idempotency_protection',
        passed: false,
        duration: Date.now() - startTime,
        error: String(error)
      }
    }
  }

  /**
   * Test content moderation
   */
  private async testContentModeration(): Promise<ValidationResult> {
    const startTime = Date.now()
    
    try {
      // Test with clean text
      const cleanResult = await contentModerationService.moderateText('This is clean family-friendly content.')
      const cleanHandled = typeof cleanResult === 'object' && typeof cleanResult.flagged === 'boolean'
      
      // Test with potentially flagged text
      const flaggedResult = await contentModerationService.moderateText('This contains inappropriate violent language.')
      const flaggedHandled = typeof flaggedResult === 'object' && typeof flaggedResult.flagged === 'boolean'
      
      // Test with empty text (edge case)
      const emptyResult = await contentModerationService.moderateText('')
      const emptyHandled = typeof emptyResult === 'object' && typeof emptyResult.flagged === 'boolean'
      
      return {
        testName: 'content_moderation',
        passed: cleanHandled && flaggedHandled && emptyHandled,
        duration: Date.now() - startTime,
        details: {
          cleanHandled,
          flaggedHandled,
          emptyHandled,
          cleanFlagged: cleanResult.flagged,
          provider: cleanResult.provider
        }
      }
      
    } catch (error) {
      return {
        testName: 'content_moderation',
        passed: false,
        duration: Date.now() - startTime,
        error: String(error)
      }
    }
  }

  /**
   * Test error handling and recovery
   */
  private async testErrorHandling(): Promise<ValidationResult> {
    const startTime = Date.now()
    
    try {
      // Test error logging
      const testError = new Error('Test error for validation')
      const diagnostics = await errorDiagnostics.logError(testError, {
        operation: 'test_operation',
        component: 'pipeline-validator',
        severity: 'low',
        uploadId: 'test-error-handling'
      })
      
      const errorLogged = diagnostics &&
        diagnostics.errorId &&
        diagnostics.suggestions.length > 0 &&
        diagnostics.recoveryActions.length > 0
      
      // Test error trends
      const trends = await errorDiagnostics.getErrorTrends('1h')
      const trendsWorking = Array.isArray(trends)
      
      // Test system health
      const health = await errorDiagnostics.getSystemHealth()
      const healthWorking = health && typeof health.status === 'string'
      
      return {
        testName: 'error_handling',
        passed: errorLogged && trendsWorking && healthWorking,
        duration: Date.now() - startTime,
        details: {
          errorLogged,
          trendsWorking,
          healthWorking,
          errorId: diagnostics.errorId,
          systemStatus: health.status
        }
      }
      
    } catch (error) {
      return {
        testName: 'error_handling',
        passed: false,
        duration: Date.now() - startTime,
        error: String(error)
      }
    }
  }

  /**
   * Test resource limits and memory handling
   */
  private async testResourceLimits(): Promise<ValidationResult> {
    const startTime = Date.now()
    
    try {
      // Test with large mock data (simulate high memory usage)
      const largeMockHeuristics = this.createLargeMockHeuristics()
      
      const input = {
        uploadId: 'test-large-data',
        audioUrl: 'https://example.com/large-audio.mp3',
        heuristics: largeMockHeuristics,
        options: {
          aggressiveness: 'balanced' as const,
          preserveNaturalPauses: true,
          enableAutoFix: true,
          targetReduction: 25
        }
      }
      
      // Should handle large data gracefully
      const result = await makeEnhancedEditingDecision(input)
      
      const handled = result &&
        typeof result === 'object' &&
        Array.isArray(result.keepSegments) &&
        Array.isArray(result.removeSegments)
      
      return {
        testName: 'resource_limits',
        passed: handled,
        duration: Date.now() - startTime,
        details: {
          handledLargeData: handled,
          inputSegments: largeMockHeuristics.asrTimestamps.length,
          memoryUsage: process.memoryUsage()
        }
      }
      
    } catch (error) {
      return {
        testName: 'resource_limits',
        passed: false,
        duration: Date.now() - startTime,
        error: String(error)
      }
    }
  }

  /**
   * Generate recommendations based on test results
   */
  private generateRecommendations(results: ValidationResult[]): string[] {
    const recommendations: string[] = []
    const failedTests = results.filter(r => !r.passed)
    
    if (failedTests.length === 0) {
      recommendations.push('✅ All tests passed - pipeline is robust and healthy')
      return recommendations
    }
    
    for (const test of failedTests) {
      switch (test.testName) {
        case 'decision_engine_valid_input':
          recommendations.push('🔧 Decision engine failing with valid input - check OpenAI configuration')
          break
        case 'decision_engine_malformed_input':
          recommendations.push('🛡️ Decision engine not handling malformed input - improve defensive coding')
          break
        case 'decision_engine_no_openai':
          recommendations.push('🔑 Decision engine failing without OpenAI - implement better fallbacks')
          break
        case 'job_queue_operations':
          recommendations.push('📋 Job queue operations failing - check database connectivity')
          break
        case 'idempotency_protection':
          recommendations.push('🔒 Idempotency protection failing - check operation lock implementation')
          break
        case 'content_moderation':
          recommendations.push('🔍 Content moderation failing - verify moderation service integration')
          break
        case 'error_handling':
          recommendations.push('🚨 Error handling system failing - check diagnostics implementation')
          break
        case 'resource_limits':
          recommendations.push('💾 Resource limit handling failing - optimize for large data processing')
          break
      }
    }
    
    // General recommendations
    if (failedTests.length > 3) {
      recommendations.push('⚠️ Multiple critical systems failing - consider maintenance mode')
    }
    
    recommendations.push(`📊 ${failedTests.length}/${results.length} tests failed - prioritize fixes based on severity`)
    
    return recommendations
  }

  /**
   * Create mock heuristics for testing
   */
  private createMockHeuristics(): any {
    return {
      silenceRegions: [
        { start: 0, end: 1, duration: 1, rms: -40, type: 'silence' },
        { start: 10, end: 11, duration: 1, rms: -35, type: 'pause' }
      ],
      asrTimestamps: [
        {
          start: 1,
          end: 5,
          text: 'This is a test segment',
          confidence: 0.9,
          words: [
            { word: 'This', start: 1, end: 1.5, confidence: 0.9 },
            { word: 'is', start: 1.5, end: 2, confidence: 0.95 },
            { word: 'a', start: 2, end: 2.2, confidence: 0.85 },
            { word: 'test', start: 2.2, end: 3, confidence: 0.9 },
            { word: 'segment', start: 3, end: 5, confidence: 0.88 }
          ]
        }
      ],
      acousticFeatures: [
        { timestamp: 0, duration: 0.5, shortTimeEnergy: 0.1, rms: -30, hasSpike: false, isLowEnergy: false },
        { timestamp: 0.5, duration: 0.5, shortTimeEnergy: 0.8, rms: -20, hasSpike: true, isLowEnergy: false }
      ],
      fillerDetections: [
        { word: 'um', start: 6, end: 6.3, type: 'filler', confidence: 0.9, density: 0.2 }
      ],
      videoMetadata: {
        frameRate: 30,
        resolution: { width: 1920, height: 1080 },
        duration: 60
      },
      processingMetadata: {
        analysisTimestamp: new Date().toISOString(),
        ffmpegVersion: 'test',
        whisperVersion: 'test',
        processingTimeMs: 1000
      }
    }
  }

  /**
   * Create large mock heuristics for resource testing
   */
  private createLargeMockHeuristics(): any {
    const base = this.createMockHeuristics()
    
    // Create 1000 ASR segments to simulate large file
    const largeAsrSegments = Array.from({ length: 1000 }, (_, i) => ({
      start: i * 5,
      end: (i + 1) * 5,
      text: `This is test segment number ${i + 1}`,
      confidence: 0.8 + Math.random() * 0.2,
      words: Array.from({ length: 8 }, (_, j) => ({
        word: `word${j}`,
        start: i * 5 + j * 0.6,
        end: i * 5 + (j + 1) * 0.6,
        confidence: 0.8 + Math.random() * 0.2
      }))
    }))
    
    return {
      ...base,
      asrTimestamps: largeAsrSegments,
      acousticFeatures: Array.from({ length: 2000 }, (_, i) => ({
        timestamp: i * 0.5,
        duration: 0.5,
        shortTimeEnergy: Math.random(),
        rms: -40 + Math.random() * 20,
        hasSpike: Math.random() > 0.9,
        isLowEnergy: Math.random() > 0.8
      })),
      silenceRegions: Array.from({ length: 100 }, (_, i) => ({
        start: i * 10,
        end: i * 10 + 1,
        duration: 1,
        rms: -40 - Math.random() * 10,
        type: 'silence'
      }))
    }
  }
}

// Export singleton
export const pipelineValidator = new PipelineValidator()