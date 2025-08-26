// Environment variable checker utility
export function checkEnvironmentVariables() {
  const checks = {
    OPENAI_API_KEY: {
      value: process.env.OPENAI_API_KEY,
      required: true,
      validation: (val: string) => val.startsWith('sk-'),
      validationMessage: 'Should start with sk-'
    },
    SUPABASE_SERVICE_ROLE_KEY: {
      value: process.env.SUPABASE_SERVICE_ROLE_KEY,
      required: true,
      validation: (val: string) => val.length > 100,
      validationMessage: 'Should be a long JWT token'
    },
    NEXT_PUBLIC_SUPABASE_URL: {
      value: process.env.NEXT_PUBLIC_SUPABASE_URL,
      required: true,
      validation: (val: string) => val.includes('supabase.co'),
      validationMessage: 'Should be a Supabase URL'
    }
  }
  
  const results: Record<string, any> = {}
  
  for (const [key, config] of Object.entries(checks)) {
    const value = config.value
    const present = !!value
    const valid = present && config.validation ? config.validation(value) : present
    
    results[key] = {
      present,
      valid,
      length: value?.length || 0,
      prefix: value?.substring(0, 10) || 'none',
      error: !present ? 'Missing' : !valid ? config.validationMessage : null
    }
  }
  
  return results
}

export function logEnvironmentStatus() {
  console.log('🔍 Environment Variables Check:')
  const results = checkEnvironmentVariables()
  
  for (const [key, result] of Object.entries(results)) {
    const status = result.present && result.valid ? '✅' : '❌'
    console.log(`${status} ${key}: ${result.error || 'OK'} (${result.length} chars, prefix: ${result.prefix})`)
  }
  
  return results
}