/**
 * Structured Logging with Correlation IDs
 * Provides comprehensive logging for debugging and monitoring
 */

import { v4 as uuidv4 } from 'uuid'

export interface LogContext {
  requestId: string
  uploadId?: string
  jobId?: string
  userId?: string
  sessionId?: string
  operation?: string
  component?: string
}

export interface LogEvent {
  event: string
  level: 'debug' | 'info' | 'warn' | 'error'
  timestamp: string
  context: LogContext
  data?: Record<string, any>
  error?: {
    message: string
    stack?: string
    code?: string
  }
  performance?: {
    startTime: number
    duration: number
    memory?: number
  }
}

export class StructuredLogger {
  private static instance: StructuredLogger
  private context: Partial<LogContext> = {}

  private constructor() {}

  public static getInstance(): StructuredLogger {
    if (!StructuredLogger.instance) {
      StructuredLogger.instance = new StructuredLogger()
    }
    return StructuredLogger.instance
  }

  /**
   * Sets the default context for all logs
   */
  public setContext(context: Partial<LogContext>): void {
    this.context = { ...this.context, ...context }
  }

  /**
   * Generates a new request ID
   */
  public generateRequestId(): string {
    return `req_${Date.now()}_${uuidv4().split('-')[0]}`
  }

  /**
   * Creates a child logger with additional context
   */
  public child(additionalContext: Partial<LogContext>): StructuredLogger {
    const childLogger = new StructuredLogger()
    childLogger.context = { ...this.context, ...additionalContext }
    return childLogger
  }

  /**
   * Logs a structured event
   */
  private log(
    level: LogEvent['level'],
    event: string,
    data?: Record<string, any>,
    error?: Error,
    performance?: Partial<LogEvent['performance']>
  ): void {
    const logEvent: LogEvent = {
      event,
      level,
      timestamp: new Date().toISOString(),
      context: {
        requestId: this.context.requestId || this.generateRequestId(),
        ...this.context
      },
      ...(data && { data }),
      ...(error && {
        error: {
          message: error.message,
          stack: error.stack,
          code: (error as any).code
        }
      }),
      ...(performance && { performance: performance as LogEvent['performance'] })
    }

    // Output to console based on level
    switch (level) {
      case 'debug':
        console.debug(JSON.stringify(logEvent, null, 2))
        break
      case 'info':
        console.info(JSON.stringify(logEvent, null, 2))
        break
      case 'warn':
        console.warn(JSON.stringify(logEvent, null, 2))
        break
      case 'error':
        console.error(JSON.stringify(logEvent, null, 2))
        break
    }

    // In production, you might want to send logs to external service
    this.sendToExternalLogger(logEvent)
  }

  /**
   * Send logs to external logging service (implement as needed)
   */
  private sendToExternalLogger(logEvent: LogEvent): void {
    // Example: Send to logging service like DataDog, LogRocket, etc.
    // This is where you'd implement your external logging integration
    if (process.env.NODE_ENV === 'production') {
      // Implementation would go here
    }
  }

  /**
   * Debug level logging
   */
  public debug(event: string, data?: Record<string, any>): void {
    this.log('debug', event, data)
  }

  /**
   * Info level logging
   */
  public info(event: string, data?: Record<string, any>): void {
    this.log('info', event, data)
  }

  /**
   * Warning level logging
   */
  public warn(event: string, data?: Record<string, any>, error?: Error): void {
    this.log('warn', event, data, error)
  }

  /**
   * Error level logging
   */
  public error(event: string, error?: Error, data?: Record<string, any>): void {
    this.log('error', event, data, error)
  }

  /**
   * Performance logging with timing
   */
  public performance(
    event: string,
    startTime: number,
    data?: Record<string, any>
  ): void {
    const duration = Date.now() - startTime
    const memory = process.memoryUsage?.()?.heapUsed

    this.log('info', event, data, undefined, {
      startTime,
      duration,
      ...(memory && { memory })
    })
  }

  /**
   * API request logging
   */
  public apiRequest(
    method: string,
    url: string,
    statusCode?: number,
    duration?: number,
    data?: Record<string, any>
  ): void {
    this.info('api_request', {
      method,
      url,
      statusCode,
      duration,
      ...data
    })
  }

  /**
   * Database operation logging
   */
  public dbOperation(
    operation: string,
    table: string,
    duration?: number,
    rowsAffected?: number,
    data?: Record<string, any>
  ): void {
    this.info('db_operation', {
      operation,
      table,
      duration,
      rowsAffected,
      ...data
    })
  }

  /**
   * Job processing logging
   */
  public jobEvent(
    jobType: string,
    jobId: string,
    status: string,
    data?: Record<string, any>
  ): void {
    this.info('job_event', {
      jobType,
      jobId,
      status,
      ...data
    })
  }

  /**
   * AI operation logging
   */
  public aiOperation(
    operation: string,
    model: string,
    tokenUsage?: number,
    duration?: number,
    data?: Record<string, any>
  ): void {
    this.info('ai_operation', {
      operation,
      model,
      tokenUsage,
      duration,
      ...data
    })
  }

  /**
   * File operation logging
   */
  public fileOperation(
    operation: string,
    filePath: string,
    fileSize?: number,
    duration?: number,
    data?: Record<string, any>
  ): void {
    this.info('file_operation', {
      operation,
      filePath: this.sanitizeFilePath(filePath),
      fileSize,
      duration,
      ...data
    })
  }

  /**
   * Security event logging
   */
  public securityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    data?: Record<string, any>
  ): void {
    this.warn('security_event', {
      severity,
      ...data
    })
  }

  /**
   * User action logging
   */
  public userAction(
    action: string,
    userId?: string,
    data?: Record<string, any>
  ): void {
    this.info('user_action', {
      action,
      userId: userId || this.context.userId,
      ...data
    })
  }

  /**
   * Business metric logging
   */
  public metric(
    metricName: string,
    value: number,
    unit?: string,
    tags?: Record<string, string>
  ): void {
    this.info('metric', {
      metricName,
      value,
      unit,
      tags
    })
  }

  /**
   * Sanitizes file paths for logging (removes sensitive info)
   */
  private sanitizeFilePath(filePath: string): string {
    // Remove user-specific paths and keep only relative structure
    return filePath
      .replace(/\/Users\/[^\/]+/g, '/Users/***')
      .replace(/\\Users\\[^\\]+/g, '\\Users\\***')
      .replace(/\/home\/[^\/]+/g, '/home/***')
      .replace(/C:\\Users\\[^\\]+/g, 'C:\\Users\\***')
  }
}

// Singleton instance
export const logger = StructuredLogger.getInstance()

// Helper functions for common logging patterns
export function withRequestId<T>(
  requestId: string,
  operation: () => Promise<T>
): Promise<T> {
  const childLogger = logger.child({ requestId })
  const originalLogger = logger
  
  // Temporarily set the child logger as the global logger
  // Note: In a real implementation, you might want to use AsyncLocalStorage
  return operation()
}

export function logApiCall<T>(
  method: string,
  url: string,
  operation: () => Promise<T>,
  context?: Partial<LogContext>
): Promise<T> {
  const startTime = Date.now()
  const requestLogger = context ? logger.child(context) : logger
  
  requestLogger.info('api_call_start', { method, url })
  
  return operation()
    .then((result) => {
      const duration = Date.now() - startTime
      requestLogger.apiRequest(method, url, 200, duration)
      return result
    })
    .catch((error) => {
      const duration = Date.now() - startTime
      requestLogger.apiRequest(method, url, error.status || 500, duration)
      requestLogger.error('api_call_failed', error, { method, url })
      throw error
    })
}

export function logJobExecution<T>(
  jobType: string,
  jobId: string,
  operation: () => Promise<T>,
  context?: Partial<LogContext>
): Promise<T> {
  const startTime = Date.now()
  const jobLogger = logger.child({ jobId, ...context })
  
  jobLogger.jobEvent(jobType, jobId, 'started')
  
  return operation()
    .then((result) => {
      const duration = Date.now() - startTime
      jobLogger.jobEvent(jobType, jobId, 'completed', { duration })
      return result
    })
    .catch((error) => {
      const duration = Date.now() - startTime
      jobLogger.jobEvent(jobType, jobId, 'failed', { duration, error: error.message })
      jobLogger.error('job_execution_failed', error)
      throw error
    })
}

export function logAIRequest<T>(
  operation: string,
  model: string,
  requestFn: () => Promise<T>,
  context?: Partial<LogContext>
): Promise<T> {
  const startTime = Date.now()
  const aiLogger = logger.child(context)
  
  aiLogger.info('ai_request_start', { operation, model })
  
  return requestFn()
    .then((result: any) => {
      const duration = Date.now() - startTime
      const tokenUsage = result?.usage?.total_tokens
      
      aiLogger.aiOperation(operation, model, tokenUsage, duration, {
        success: true,
        responseLength: typeof result === 'string' ? result.length : JSON.stringify(result).length
      })
      
      return result
    })
    .catch((error) => {
      const duration = Date.now() - startTime
      aiLogger.aiOperation(operation, model, undefined, duration, { success: false })
      aiLogger.error('ai_request_failed', error, { operation, model })
      throw error
    })
}

// Export types for external use
export type { LogContext, LogEvent }