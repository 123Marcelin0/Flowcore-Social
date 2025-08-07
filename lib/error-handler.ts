/**
 * Comprehensive Error Handling Utilities
 * Provides centralized error logging and handling for the application
 */

export interface ErrorLogEntry {
  timestamp: string;
  level: 'error' | 'warn' | 'info';
  component: string;
  message: string;
  details?: any;
  stack?: string;
  context?: Record<string, any>;
}

export class ErrorLogger {
  private static logs: ErrorLogEntry[] = [];
  private static maxLogs = 1000; // Keep last 1000 logs in memory

  static log(entry: Omit<ErrorLogEntry, 'timestamp'>): void {
    const logEntry: ErrorLogEntry = {
      timestamp: new Date().toISOString(),
      ...entry
    };

    // Add to in-memory logs
    this.logs.push(logEntry);
    
    // Keep only last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console logging with proper formatting
    const logMessage = `[${logEntry.level.toUpperCase()}] [${logEntry.component}] ${logEntry.message}`;
    
    switch (logEntry.level) {
      case 'error':
        console.error(logMessage, logEntry.details || '', logEntry.stack || '');
        break;
      case 'warn':
        console.warn(logMessage, logEntry.details || '');
        break;
      case 'info':
        console.log(logMessage, logEntry.details || '');
        break;
    }

    // In production, you might want to send these to an external service
    if (process.env.NODE_ENV === 'production' && logEntry.level === 'error') {
      // TODO: Send to external error tracking service (e.g., Sentry, LogRocket)
    }
  }

  static error(component: string, message: string, error?: any, context?: Record<string, any>): void {
    this.log({
      level: 'error',
      component,
      message,
      details: error,
      stack: error instanceof Error ? error.stack : undefined,
      context
    });
  }

  static warn(component: string, message: string, details?: any, context?: Record<string, any>): void {
    this.log({
      level: 'warn',
      component,
      message,
      details,
      context
    });
  }

  static info(component: string, message: string, details?: any, context?: Record<string, any>): void {
    this.log({
      level: 'info',
      component,
      message,
      details,
      context
    });
  }

  static getLogs(level?: 'error' | 'warn' | 'info', component?: string): ErrorLogEntry[] {
    let filteredLogs = this.logs;
    
    if (level) {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }
    
    if (component) {
      filteredLogs = filteredLogs.filter(log => log.component === component);
    }
    
    return filteredLogs.slice().reverse(); // Return newest first
  }

  static getErrorSummary(): Record<string, number> {
    const summary: Record<string, number> = {};
    
    this.logs.forEach(log => {
      if (log.level === 'error') {
        const key = `${log.component}: ${log.message}`;
        summary[key] = (summary[key] || 0) + 1;
      }
    });
    
    return summary;
  }

  static clearLogs(): void {
    this.logs = [];
  }
}

/**
 * Specific error handlers for different types of errors
 */
export class ApiErrorHandler {
  static handleMediaProxyError(error: any, url?: string): { message: string; code: string; suggestions: string[] } {
    ErrorLogger.error('MediaProxy', `Failed to proxy media${url ? ` for URL: ${url}` : ''}`, error);
    
    if (error.message?.includes('ERR_QUIC_PROTOCOL_ERROR')) {
      return {
        message: 'Network protocol error occurred',
        code: 'QUIC_ERROR',
        suggestions: [
          'This is usually a temporary network issue',
          'Try refreshing the page',
          'Check if Instagram post is still available',
          'Contact support if issue persists'
        ]
      };
    }
    
    if (error.status === 403 || error.message?.includes('403')) {
      return {
        message: 'Instagram blocked access to this image',
        code: 'INSTAGRAM_BLOCKED',
        suggestions: [
          'Instagram CDN restrictions prevent direct access',
          'The image may be from a private account',
          'Try uploading the image directly instead',
          'Contact support for alternative solutions'
        ]
      };
    }
    
    if (error.status === 404 || error.message?.includes('404')) {
      return {
        message: 'Image not found',
        code: 'NOT_FOUND',
        suggestions: [
          'The Instagram post might have been deleted',
          'Check if the URL is correct',
          'Try refreshing the source data'
        ]
      };
    }
    
    return {
      message: 'Failed to load image',
      code: 'GENERIC_ERROR',
      suggestions: [
        'Check your internet connection',
        'Try again in a few moments',
        'Contact support if issue persists'
      ]
    };
  }

  static handleShotstackError(error: any, context?: Record<string, any>): { message: string; code: string; suggestions: string[] } {
    ErrorLogger.error('Shotstack', 'Shotstack API error', error, context);
    
    if (error.message?.includes('API key') || error.message?.includes('authentication')) {
      return {
        message: 'Shotstack authentication failed',
        code: 'AUTH_ERROR',
        suggestions: [
          'Check if Shotstack API key is configured',
          'Verify the API key is valid and not expired',
          'Ensure you\'re using the correct environment (sandbox/production)',
          'Check environment variables: SHOTSTACK_API_KEY, SHOTSTACK_SANDBOX_API_KEY'
        ]
      };
    }
    
    if (error.message?.includes('rate limit') || error.status === 429) {
      return {
        message: 'Shotstack rate limit exceeded',
        code: 'RATE_LIMIT',
        suggestions: [
          'Too many requests in a short period',
          'Wait a few minutes before trying again',
          'Consider upgrading your Shotstack plan',
          'Optimize request frequency'
        ]
      };
    }
    
    if (error.message?.includes('quota') || error.message?.includes('credit')) {
      return {
        message: 'Shotstack quota exceeded',
        code: 'QUOTA_EXCEEDED',
        suggestions: [
          'Monthly rendering quota has been reached',
          'Upgrade your Shotstack plan',
          'Wait until next billing cycle',
          'Check usage in Shotstack dashboard'
        ]
      };
    }
    
    return {
      message: 'Video rendering service error',
      code: 'SHOTSTACK_ERROR',
      suggestions: [
        'Check if video URLs are accessible',
        'Verify edit configuration is valid',
        'Try with simpler video settings',
        'Contact support if issue persists'
      ]
    };
  }

  static handleSupabaseError(error: any, operation?: string): { message: string; code: string; suggestions: string[] } {
    ErrorLogger.error('Supabase', `Database error${operation ? ` during ${operation}` : ''}`, error);
    
    if (error.message?.includes('ERR_QUIC_PROTOCOL_ERROR') || error.message?.includes('Failed to fetch')) {
      return {
        message: 'Database connection failed',
        code: 'CONNECTION_ERROR',
        suggestions: [
          'Network connectivity issue detected',
          'Try disabling QUIC protocol in Chrome (chrome://flags)',
          'Check your internet connection',
          'Try again in a few moments'
        ]
      };
    }
    
    if (error.message?.includes('JWT') || error.message?.includes('session')) {
      return {
        message: 'Session expired',
        code: 'SESSION_EXPIRED',
        suggestions: [
          'Please log in again',
          'Your session has expired for security',
          'Clear browser cache if issue persists'
        ]
      };
    }
    
    if (error.message?.includes('Row Level Security') || error.message?.includes('permission')) {
      return {
        message: 'Access denied',
        code: 'PERMISSION_DENIED',
        suggestions: [
          'You don\'t have permission to access this data',
          'Log in with appropriate credentials',
          'Contact administrator for access',
          'Check if your account is properly configured'
        ]
      };
    }
    
    return {
      message: 'Database operation failed',
      code: 'DATABASE_ERROR',
      suggestions: [
        'Temporary database issue',
        'Try again in a few moments',
        'Check your internet connection',
        'Contact support if issue persists'
      ]
    };
  }
}

/**
 * Global error boundary for React components
 */
export function withErrorHandling<T extends (...args: any[]) => any>(
  fn: T,
  component: string
): T {
  return ((...args: any[]) => {
    try {
      const result = fn(...args);
      
      // Handle promises
      if (result instanceof Promise) {
        return result.catch((error) => {
          ErrorLogger.error(component, `Async operation failed`, error, { args });
          throw error;
        });
      }
      
      return result;
    } catch (error) {
      ErrorLogger.error(component, `Sync operation failed`, error, { args });
      throw error;
    }
  }) as T;
}

/**
 * Helper to create user-friendly error messages
 */
export function createUserError(message: string, suggestions: string[] = []): Error {
  const error = new Error(message) as any;
  error.userFriendly = true;
  error.suggestions = suggestions;
  return error;
}

/**
 * Check if an error is user-friendly
 */
export function isUserFriendlyError(error: any): boolean {
  return error?.userFriendly === true;
}

/**
 * Get user-friendly error message and suggestions
 */
export function getUserFriendlyError(error: any): { message: string; suggestions: string[] } {
  if (isUserFriendlyError(error)) {
    return {
      message: error.message,
      suggestions: error.suggestions || []
    };
  }
  
  // Default fallback
  return {
    message: 'An unexpected error occurred',
    suggestions: [
      'Try refreshing the page',
      'Check your internet connection',
      'Contact support if the issue persists'
    ]
  };
}