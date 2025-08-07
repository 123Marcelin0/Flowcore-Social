/**
 * Shotstack Configuration Management
 * Handles environment-specific API key selection and configuration
 */

export interface ShotstackEnvironmentConfig {
  apiKey: string
  ownerId: string
  environment: 'sandbox' | 'production'
  webhookUrl?: string
  debug?: boolean
  maxRetries?: number
  retryDelay?: number
  enableCache?: boolean
}

/**
 * Get Shotstack configuration based on environment variables
 */
export function getShotstackConfig(): ShotstackEnvironmentConfig {
  // Determine which environment to use
  const environment = (process.env.SHOTSTACK_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production'
  
  let apiKey: string
  let ownerId: string
  
  if (environment === 'production') {
    apiKey = process.env.SHOTSTACK_PRODUCTION_API_KEY || process.env.SHOTSTACK_API_KEY || ''
    ownerId = process.env.SHOTSTACK_PRODUCTION_OWNER_ID || ''
  } else {
    apiKey = process.env.SHOTSTACK_SANDBOX_API_KEY || process.env.SHOTSTACK_API_KEY || ''
    ownerId = process.env.SHOTSTACK_SANDBOX_OWNER_ID || ''
  }
  
  console.log(`[Shotstack Config] Environment: ${environment}`);
  console.log(`[Shotstack Config] API Key exists: ${!!apiKey}`);
  console.log(`[Shotstack Config] Owner ID exists: ${!!ownerId}`);
  
  if (!apiKey || apiKey === 'disabled') {
    const errorMsg = `Shotstack API key is ${!apiKey ? 'missing' : 'disabled'} for ${environment} environment. Please check your environment variables:
    - SHOTSTACK_API_KEY (general fallback)
    - SHOTSTACK_${environment.toUpperCase()}_API_KEY (environment-specific)
    Available env vars: ${Object.keys(process.env).filter(key => key.includes('SHOTSTACK')).join(', ')}
    ${apiKey === 'disabled' ? '\nNote: API key is currently set to "disabled". Set a real API key to enable video features.' : ''}`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
  
  const config: ShotstackEnvironmentConfig = {
    apiKey,
    ownerId,
    environment,
    webhookUrl: process.env.SHOTSTACK_WEBHOOK_URL,
    debug: process.env.SHOTSTACK_DEBUG === 'true' || process.env.NODE_ENV === 'development',
    maxRetries: parseInt(process.env.SHOTSTACK_MAX_RETRIES || '3'),
    retryDelay: parseInt(process.env.SHOTSTACK_RETRY_DELAY || '2000'),
    enableCache: process.env.SHOTSTACK_ENABLE_CACHE !== 'false'
  }
  
  if (config.debug) {
    console.log(`[Shotstack Config] Using ${environment} environment`)
    console.log(`[Shotstack Config] Owner ID: ${ownerId}`)
    console.log(`[Shotstack Config] Webhook URL: ${config.webhookUrl || 'Not set'}`)
  }
  
  return config
}

/**
 * Validate that all required environment variables are set
 */
export function validateShotstackConfig(): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []
  
  const environment = process.env.SHOTSTACK_ENVIRONMENT || 'sandbox'
  console.log(`[Shotstack Validation] Checking ${environment} environment`);
  
  if (environment === 'production') {
    const hasProductionKey = !!(process.env.SHOTSTACK_PRODUCTION_API_KEY || process.env.SHOTSTACK_API_KEY);
    const hasProductionOwner = !!process.env.SHOTSTACK_PRODUCTION_OWNER_ID;
    
    if (!hasProductionKey) {
      errors.push('Missing SHOTSTACK_PRODUCTION_API_KEY for production environment');
    }
    if (!hasProductionOwner) {
      warnings.push('Missing SHOTSTACK_PRODUCTION_OWNER_ID for production environment (optional but recommended)');
    }
  } else {
    const hasSandboxKey = !!(process.env.SHOTSTACK_SANDBOX_API_KEY || process.env.SHOTSTACK_API_KEY);
    const hasSandboxOwner = !!process.env.SHOTSTACK_SANDBOX_OWNER_ID;
    
    if (!hasSandboxKey) {
      errors.push('Missing SHOTSTACK_SANDBOX_API_KEY or SHOTSTACK_API_KEY for sandbox environment');
    }
    if (!hasSandboxOwner) {
      warnings.push('Missing SHOTSTACK_SANDBOX_OWNER_ID for sandbox environment (optional but recommended)');
    }
  }
  
  // Additional validation
  const availableEnvVars = Object.keys(process.env).filter(key => key.includes('SHOTSTACK'));
  console.log(`[Shotstack Validation] Available Shotstack env vars: ${availableEnvVars.join(', ')}`);
  
  if (errors.length > 0) {
    console.error(`[Shotstack Validation] Errors: ${errors.join(', ')}`);
  }
  if (warnings.length > 0) {
    console.warn(`[Shotstack Validation] Warnings: ${warnings.join(', ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Get environment-appropriate template configurations
 */
export function getTemplateConfig(platform: string) {
  return {
    aspectRatio: getAspectRatioForPlatform(platform),
    resolution: process.env.SHOTSTACK_ENVIRONMENT === 'production' ? 'full-hd' : 'hd',
    quality: process.env.SHOTSTACK_ENVIRONMENT === 'production' ? 'high' : 'medium'
  }
}

/**
 * Platform-specific aspect ratios
 */
function getAspectRatioForPlatform(platform: string): string {
  const ratios: Record<string, string> = {
    instagram: '9:16',
    tiktok: '9:16',
    youtube: '16:9',
    facebook: '1:1',
    twitter: '16:9',
    linkedin: '16:9'
  }
  
  return ratios[platform] || '16:9'
}