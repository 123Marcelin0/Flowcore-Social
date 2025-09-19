/**
 * Error Diagnostics and Monitoring System
 * 
 * Provides comprehensive error tracking, diagnostics, and recovery suggestions
 * for the video processing pipeline.
 */

import { supabase, supabaseAdmin } from './supabase'

export interface ErrorContext {
  uploadId?: string
  userId?: string
  operation: string
  component: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  metadata?: Record<string, any>
  userAgent?: string
  timestamp?: string
}

export interface ErrorDiagnostics {
  errorId: string
  context: ErrorContext
  error: {
    message: string
    stack?: string
    name?: string
    code?: string
  }
  systemInfo: {
    nodeVersion?: string
    platform?: string
    memoryUsage?: NodeJS.MemoryUsage
    uptime?: number
  }
  suggestions: string[]
  recoveryActions: string[]
  relatedErrors: string[]
}

export interface ErrorTrend {
  operation: string
  component: string
  errorCount: number
  firstSeen: string
  lastSeen: string
  frequency: 'rare' | 'occasional' | 'frequent' | 'critical'
}

export class ErrorDiagnosticsSystem {
  private db = supabaseAdmin || supabase
  private errorCache = new Map<string, number>() // For rate limiting

  /**
   * Log and analyze an error with comprehensive diagnostics
   */
  async logError(error: Error, context: ErrorContext): Promise<ErrorDiagnostics> {
    const errorId = this.generateErrorId(error, context)
    
    // Rate limiting: don't spam identical errors
    const cacheKey = `${context.operation}-${error.message}`
    const recentCount = this.errorCache.get(cacheKey) || 0
    if (recentCount > 5) {
      console.warn('🔥 Error rate limited:', cacheKey)
      return this.getCachedDiagnostics(errorId)
    }
    this.errorCache.set(cacheKey, recentCount + 1)
    
    // Clear rate limiting after 5 minutes
    setTimeout(() => this.errorCache.delete(cacheKey), 5 * 60 * 1000)

    const diagnostics: ErrorDiagnostics = {
      errorId,
      context: {
        ...context,
        timestamp: context.timestamp || new Date().toISOString()
      },
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: (error as any).code
      },
      systemInfo: this.getSystemInfo(),
      suggestions: this.generateSuggestions(error, context),
      recoveryActions: this.generateRecoveryActions(error, context),
      relatedErrors: await this.findRelatedErrors(error, context)
    }

    // Store diagnostics in database
    try {
      await this.storeDiagnostics(diagnostics)
    } catch (dbError) {
      console.error('Failed to store error diagnostics:', dbError)
    }

    // Log to console with color coding
    this.logToConsole(diagnostics)

    return diagnostics
  }

  /**
   * Generate actionable suggestions based on error patterns
   */
  private generateSuggestions(error: Error, context: ErrorContext): string[] {
    const suggestions: string[] = []

    // OpenAI-related errors
    if (error.message.includes('OpenAI') || error.message.includes('API key')) {
      suggestions.push('Check OPENAI_API_KEY environment variable is set correctly')
      suggestions.push('Verify API key has sufficient credits and correct permissions')
      suggestions.push('Test API key with a simple OpenAI request')
    }

    // Network/timeout errors
    if (error.message.includes('timeout') || error.message.includes('ECONNRESET')) {
      suggestions.push('Check network connectivity and firewall settings')
      suggestions.push('Consider increasing timeout values')
      suggestions.push('Implement retry logic with exponential backoff')
    }

    // FFmpeg-related errors
    if (error.message.includes('ffmpeg') || error.message.includes('FFmpeg')) {
      suggestions.push('Verify FFmpeg is installed and accessible')
      suggestions.push('Check input file format and codec compatibility')
      suggestions.push('Ensure sufficient disk space for temporary files')
    }

    // Database errors
    if (error.message.includes('supabase') || error.message.includes('database')) {
      suggestions.push('Check Supabase connection and credentials')
      suggestions.push('Verify database schema and table permissions')
      suggestions.push('Check for database connection limits')
    }

    // Memory/resource errors
    if (error.message.includes('memory') || error.message.includes('heap')) {
      suggestions.push('Check available system memory')
      suggestions.push('Consider processing smaller file chunks')
      suggestions.push('Implement memory cleanup and garbage collection')
    }

    // File system errors
    if (error.message.includes('ENOENT') || error.message.includes('file not found')) {
      suggestions.push('Verify file paths and permissions')
      suggestions.push('Check if required directories exist')
      suggestions.push('Ensure file upload completed successfully')
    }

    // Decision engine specific errors
    if (context.component === 'decision-engine') {
      suggestions.push('Validate input data structure and completeness')
      suggestions.push('Check heuristics collection completed successfully')
      suggestions.push('Verify ASR segments have proper timing information')
    }

    // Transcription errors
    if (context.operation.includes('transcrib')) {
      suggestions.push('Check audio file format and quality')
      suggestions.push('Verify file size is within API limits (25MB)')
      suggestions.push('Test with a smaller/simpler audio file')
    }

    // Default suggestions
    if (suggestions.length === 0) {
      suggestions.push('Check error logs for more detailed information')
      suggestions.push('Verify all required environment variables are set')
      suggestions.push('Try the operation again with different parameters')
    }

    return suggestions
  }

  /**
   * Generate recovery actions based on error type
   */
  private generateRecoveryActions(error: Error, context: ErrorContext): string[] {
    const actions: string[] = []

    switch (context.severity) {
      case 'critical':
        actions.push('Immediately switch to fallback processing mode')
        actions.push('Alert development team')
        actions.push('Consider service degradation announcements')
        break
      
      case 'high':
        actions.push('Retry operation with exponential backoff')
        actions.push('Switch to alternative processing method if available')
        actions.push('Log incident for investigation')
        break
      
      case 'medium':
        actions.push('Retry operation up to 3 times')
        actions.push('Use cached results if available')
        actions.push('Continue with degraded functionality')
        break
      
      case 'low':
        actions.push('Log for monitoring')
        actions.push('Continue normal operation')
        break
    }

    // Operation-specific recovery actions
    if (context.operation.includes('transcrib')) {
      actions.push('Try alternative transcription provider (Deepgram/Xenova)')
      actions.push('Use mock transcription for development')
    }

    if (context.operation.includes('decision')) {
      actions.push('Use fallback decision with conservative settings')
      actions.push('Skip AI decision and use heuristic-only approach')
    }

    return actions
  }

  /**
   * Find related errors to identify patterns
   */
  private async findRelatedErrors(error: Error, context: ErrorContext): Promise<string[]> {
    try {
      // Look for similar errors in recent history
      const { data: recentErrors } = await this.db
        .from('error_logs')
        .select('error_id, error_message')
        .eq('operation', context.operation)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
        .limit(5)

      return recentErrors?.map(e => e.error_id) || []
    } catch (dbError) {
      return []
    }
  }

  /**
   * Store diagnostics in database for analysis
   */
  private async storeDiagnostics(diagnostics: ErrorDiagnostics): Promise<void> {
    try {
      await this.db
        .from('error_logs')
        .insert({
          error_id: diagnostics.errorId,
          operation: diagnostics.context.operation,
          component: diagnostics.context.component,
          severity: diagnostics.context.severity,
          error_message: diagnostics.error.message,
          error_stack: diagnostics.error.stack,
          context_data: diagnostics.context,
          system_info: diagnostics.systemInfo,
          suggestions: diagnostics.suggestions,
          recovery_actions: diagnostics.recoveryActions,
          upload_id: diagnostics.context.uploadId,
          user_id: diagnostics.context.userId,
          created_at: diagnostics.context.timestamp
        })
    } catch (dbError) {
      // Don't fail the main operation if logging fails
      console.error('Failed to store error diagnostics in database:', dbError)
    }
  }

  /**
   * Get error trends and statistics
   */
  async getErrorTrends(timeframe: '1h' | '24h' | '7d' = '24h'): Promise<ErrorTrend[]> {
    try {
      const hours = { '1h': 1, '24h': 24, '7d': 168 }[timeframe]
      const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

      const { data: trends } = await this.db
        .from('error_logs')
        .select('operation, component, created_at')
        .gte('created_at', cutoff)
        .order('created_at', { ascending: false })

      if (!trends) return []

      // Group and analyze trends
      const grouped = this.groupErrors(trends)
      return this.analyzeTrends(grouped)
    } catch (error) {
      console.error('Failed to get error trends:', error)
      return []
    }
  }

  /**
   * Health check for error rates
   */
  async getSystemHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    errorRate: number
    criticalErrors: number
    recommendations: string[]
  }> {
    try {
      const trends = await this.getErrorTrends('1h')
      const totalErrors = trends.reduce((sum, t) => sum + t.errorCount, 0)
      const criticalErrors = trends.filter(t => t.frequency === 'critical').length

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
      const recommendations: string[] = []

      if (criticalErrors > 0) {
        status = 'unhealthy'
        recommendations.push('Critical errors detected - immediate attention required')
      } else if (totalErrors > 50) {
        status = 'degraded'
        recommendations.push('High error rate detected - investigate common failure patterns')
      }

      return {
        status,
        errorRate: totalErrors,
        criticalErrors,
        recommendations
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        errorRate: -1,
        criticalErrors: -1,
        recommendations: ['Unable to determine system health - check diagnostics system']
      }
    }
  }

  // Helper methods
  private generateErrorId(error: Error, context: ErrorContext): string {
    const hash = require('crypto')
      .createHash('sha256')
      .update(`${error.message}-${context.operation}-${context.component}`)
      .digest('hex')
      .substring(0, 16)
    
    return `err_${hash}_${Date.now()}`
  }

  private getSystemInfo(): ErrorDiagnostics['systemInfo'] {
    if (typeof process === 'undefined') return {}

    return {
      nodeVersion: process.version,
      platform: process.platform,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    }
  }

  private getCachedDiagnostics(errorId: string): ErrorDiagnostics {
    return {
      errorId,
      context: { operation: 'unknown', component: 'unknown', severity: 'low' },
      error: { message: 'Rate limited error' },
      systemInfo: {},
      suggestions: ['This error is being rate limited - check recent logs'],
      recoveryActions: ['Wait before retrying'],
      relatedErrors: []
    }
  }

  private logToConsole(diagnostics: ErrorDiagnostics): void {
    const colors = {
      critical: '\x1b[41m', // Red background
      high: '\x1b[31m',     // Red text
      medium: '\x1b[33m',   // Yellow text
      low: '\x1b[36m',      // Cyan text
      reset: '\x1b[0m'
    }

    const color = colors[diagnostics.context.severity]
    console.error(`${color}🚨 ERROR DIAGNOSTICS [${diagnostics.context.severity.toUpperCase()}]${colors.reset}`)
    console.error(`📍 ${diagnostics.context.component} > ${diagnostics.context.operation}`)
    console.error(`💥 ${diagnostics.error.message}`)
    console.error(`🔧 Suggestions: ${diagnostics.suggestions.slice(0, 2).join(', ')}`)
    console.error(`🩹 Recovery: ${diagnostics.recoveryActions[0]}`)
    console.error(`🆔 Error ID: ${diagnostics.errorId}`)
  }

  private groupErrors(errors: any[]): Map<string, any[]> {
    const grouped = new Map()
    for (const error of errors) {
      const key = `${error.operation}-${error.component}`
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key).push(error)
    }
    return grouped
  }

  private analyzeTrends(grouped: Map<string, any[]>): ErrorTrend[] {
    const trends: ErrorTrend[] = []
    
    for (const [key, errors] of grouped) {
      const [operation, component] = key.split('-')
      const sortedErrors = errors.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      
      let frequency: ErrorTrend['frequency'] = 'rare'
      if (errors.length > 20) frequency = 'critical'
      else if (errors.length > 10) frequency = 'frequent'
      else if (errors.length > 3) frequency = 'occasional'
      
      trends.push({
        operation,
        component,
        errorCount: errors.length,
        firstSeen: sortedErrors[0].created_at,
        lastSeen: sortedErrors[sortedErrors.length - 1].created_at,
        frequency
      })
    }
    
    return trends.sort((a, b) => b.errorCount - a.errorCount)
  }
}

// Singleton instance
export const errorDiagnostics = new ErrorDiagnosticsSystem()

// Convenience function for common usage
export async function logError(
  error: Error, 
  operation: string, 
  component: string, 
  severity: ErrorContext['severity'] = 'medium',
  metadata?: Record<string, any>
): Promise<ErrorDiagnostics> {
  return errorDiagnostics.logError(error, {
    operation,
    component,
    severity,
    metadata,
    timestamp: new Date().toISOString()
  })
}