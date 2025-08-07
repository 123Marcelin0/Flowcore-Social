/**
 * Environment Variables Check and Setup Guide
 * Helps diagnose and fix environment configuration issues
 */

export interface EnvironmentCheck {
  name: string;
  key: string;
  required: boolean;
  present: boolean;
  value?: string;
  description: string;
  setupInstructions: string[];
}

export interface EnvironmentStatus {
  isFullyConfigured: boolean;
  missingRequired: EnvironmentCheck[];
  missingOptional: EnvironmentCheck[];
  warnings: string[];
  errors: string[];
}

export function checkEnvironmentVariables(): EnvironmentStatus {
  const checks: EnvironmentCheck[] = [
    // Supabase Configuration
    {
      name: 'Supabase URL',
      key: 'NEXT_PUBLIC_SUPABASE_URL',
      required: true,
      present: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      value: process.env.NEXT_PUBLIC_SUPABASE_URL ? `${process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 30)}...` : undefined,
      description: 'Your Supabase project URL',
      setupInstructions: [
        '1. Go to https://supabase.com/dashboard',
        '2. Select your project',
        '3. Go to Settings → API',
        '4. Copy the "Project URL"',
        '5. Add to .env.local: NEXT_PUBLIC_SUPABASE_URL=your_url_here'
      ]
    },
    {
      name: 'Supabase Anon Key',
      key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      required: true,
      present: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20)}...` : undefined,
      description: 'Your Supabase anonymous (public) key',
      setupInstructions: [
        '1. Go to https://supabase.com/dashboard',
        '2. Select your project',
        '3. Go to Settings → API',
        '4. Copy the "anon public" key',
        '5. Add to .env.local: NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key_here'
      ]
    },
    {
      name: 'Supabase Service Role Key',
      key: 'SUPABASE_SERVICE_ROLE_KEY',
      required: true,
      present: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      value: process.env.SUPABASE_SERVICE_ROLE_KEY ? `${process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 20)}...` : undefined,
      description: 'Your Supabase service role (private) key for server operations',
      setupInstructions: [
        '1. Go to https://supabase.com/dashboard',
        '2. Select your project',
        '3. Go to Settings → API',
        '4. Copy the "service_role secret" key',
        '5. Add to .env.local: SUPABASE_SERVICE_ROLE_KEY=your_key_here',
        '⚠️ NEVER expose this key in client-side code!'
      ]
    },

    // Shotstack Configuration
    {
      name: 'Shotstack API Key',
      key: 'SHOTSTACK_API_KEY',
      required: false,
      present: !!process.env.SHOTSTACK_API_KEY,
      value: process.env.SHOTSTACK_API_KEY ? `${process.env.SHOTSTACK_API_KEY.substring(0, 20)}...` : undefined,
      description: 'General Shotstack API key (fallback)',
      setupInstructions: [
        '1. Go to https://shotstack.io/dashboard',
        '2. Sign up or log in',
        '3. Go to API Keys section',
        '4. Copy your API key',
        '5. Add to .env.local: SHOTSTACK_API_KEY=your_key_here'
      ]
    },
    {
      name: 'Shotstack Sandbox API Key',
      key: 'SHOTSTACK_SANDBOX_API_KEY',
      required: false,
      present: !!process.env.SHOTSTACK_SANDBOX_API_KEY,
      value: process.env.SHOTSTACK_SANDBOX_API_KEY ? `${process.env.SHOTSTACK_SANDBOX_API_KEY.substring(0, 20)}...` : undefined,
      description: 'Shotstack sandbox environment API key',
      setupInstructions: [
        '1. Go to https://shotstack.io/dashboard',
        '2. Ensure you\'re in the sandbox environment',
        '3. Go to API Keys section',
        '4. Copy your sandbox API key',
        '5. Add to .env.local: SHOTSTACK_SANDBOX_API_KEY=your_key_here'
      ]
    },
    {
      name: 'Shotstack Production API Key',
      key: 'SHOTSTACK_PRODUCTION_API_KEY',
      required: false,
      present: !!process.env.SHOTSTACK_PRODUCTION_API_KEY,
      value: process.env.SHOTSTACK_PRODUCTION_API_KEY ? `${process.env.SHOTSTACK_PRODUCTION_API_KEY.substring(0, 20)}...` : undefined,
      description: 'Shotstack production environment API key',
      setupInstructions: [
        '1. Go to https://shotstack.io/dashboard',
        '2. Switch to production environment',
        '3. Go to API Keys section',
        '4. Copy your production API key',
        '5. Add to .env.local: SHOTSTACK_PRODUCTION_API_KEY=your_key_here',
        '⚠️ Only use in production!'
      ]
    },
    {
      name: 'Shotstack Environment',
      key: 'SHOTSTACK_ENVIRONMENT',
      required: false,
      present: !!process.env.SHOTSTACK_ENVIRONMENT,
      value: process.env.SHOTSTACK_ENVIRONMENT,
      description: 'Which Shotstack environment to use (sandbox/production)',
      setupInstructions: [
        '1. For development: SHOTSTACK_ENVIRONMENT=sandbox',
        '2. For production: SHOTSTACK_ENVIRONMENT=production',
        '3. Default is sandbox if not set'
      ]
    },

    // OpenAI Configuration
    {
      name: 'OpenAI API Key',
      key: 'OPENAI_API_KEY',
      required: false,
      present: !!process.env.OPENAI_API_KEY,
      value: process.env.OPENAI_API_KEY ? `sk-...${process.env.OPENAI_API_KEY.slice(-10)}` : undefined,
      description: 'OpenAI API key for AI features',
      setupInstructions: [
        '1. Go to https://platform.openai.com/api-keys',
        '2. Log in or create account',
        '3. Click "Create new secret key"',
        '4. Copy the key',
        '5. Add to .env.local: OPENAI_API_KEY=your_key_here'
      ]
    }
  ];

  const missingRequired = checks.filter(check => check.required && !check.present);
  const missingOptional = checks.filter(check => !check.required && !check.present);
  
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check for common issues
  if (missingRequired.length > 0) {
    errors.push(`Missing ${missingRequired.length} required environment variables`);
  }

  if (missingOptional.length > 0) {
    warnings.push(`Missing ${missingOptional.length} optional environment variables - some features may not work`);
  }

  // Specific validation
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl && !supabaseUrl.includes('supabase.co')) {
    errors.push('Supabase URL appears to be invalid - should contain "supabase.co"');
  }

  const shotstackEnv = process.env.SHOTSTACK_ENVIRONMENT;
  if (shotstackEnv && !['sandbox', 'production'].includes(shotstackEnv)) {
    errors.push('SHOTSTACK_ENVIRONMENT must be either "sandbox" or "production"');
  }

  // Check for Shotstack key consistency
  const hasShotstackGeneral = !!process.env.SHOTSTACK_API_KEY;
  const hasShotstackSandbox = !!process.env.SHOTSTACK_SANDBOX_API_KEY;
  const hasShotstackProduction = !!process.env.SHOTSTACK_PRODUCTION_API_KEY;
  
  if (!hasShotstackGeneral && !hasShotstackSandbox && !hasShotstackProduction) {
    warnings.push('No Shotstack API keys found - video features will not work');
  } else if (shotstackEnv === 'production' && !hasShotstackProduction && !hasShotstackGeneral) {
    errors.push('Production environment selected but no production API key found');
  } else if (shotstackEnv === 'sandbox' && !hasShotstackSandbox && !hasShotstackGeneral) {
    warnings.push('Sandbox environment selected but no sandbox API key found, using general key');
  }

  return {
    isFullyConfigured: missingRequired.length === 0 && errors.length === 0,
    missingRequired,
    missingOptional,
    warnings,
    errors
  };
}

export function generateEnvironmentReport(): string {
  const status = checkEnvironmentVariables();
  
  let report = '🔧 Environment Configuration Report\n';
  report += '='.repeat(50) + '\n\n';

  if (status.isFullyConfigured) {
    report += '✅ All required environment variables are configured!\n\n';
  } else {
    report += '❌ Environment configuration issues found\n\n';
  }

  if (status.errors.length > 0) {
    report += '🚨 ERRORS:\n';
    status.errors.forEach(error => {
      report += `  • ${error}\n`;
    });
    report += '\n';
  }

  if (status.warnings.length > 0) {
    report += '⚠️  WARNINGS:\n';
    status.warnings.forEach(warning => {
      report += `  • ${warning}\n`;
    });
    report += '\n';
  }

  if (status.missingRequired.length > 0) {
    report += '🔴 MISSING REQUIRED VARIABLES:\n';
    status.missingRequired.forEach(check => {
      report += `\n📋 ${check.name} (${check.key})\n`;
      report += `   Description: ${check.description}\n`;
      report += `   Setup instructions:\n`;
      check.setupInstructions.forEach(instruction => {
        report += `     ${instruction}\n`;
      });
    });
    report += '\n';
  }

  if (status.missingOptional.length > 0) {
    report += '🟡 MISSING OPTIONAL VARIABLES:\n';
    status.missingOptional.forEach(check => {
      report += `\n📋 ${check.name} (${check.key})\n`;
      report += `   Description: ${check.description}\n`;
      report += `   Setup instructions:\n`;
      check.setupInstructions.forEach(instruction => {
        report += `     ${instruction}\n`;
      });
    });
    report += '\n';
  }

  report += '📝 SAMPLE .env.local FILE:\n';
  report += '-'.repeat(30) + '\n';
  report += '# Supabase Configuration (Required)\n';
  report += 'NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co\n';
  report += 'NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here\n';
  report += 'SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here\n\n';
  
  report += '# Shotstack Configuration (Optional)\n';
  report += 'SHOTSTACK_API_KEY=your_shotstack_key_here\n';
  report += 'SHOTSTACK_ENVIRONMENT=sandbox\n\n';
  
  report += '# OpenAI Configuration (Optional)\n';
  report += 'OPENAI_API_KEY=your_openai_key_here\n\n';

  report += '💡 TIPS:\n';
  report += '  • Create a .env.local file in your project root\n';
  report += '  • Never commit .env.local to version control\n';
  report += '  • Restart your development server after changing environment variables\n';
  report += '  • Use different keys for development and production\n';

  return report;
}

export function logEnvironmentStatus(): void {
  const status = checkEnvironmentVariables();
  
  console.log('\n' + '='.repeat(60));
  console.log('🔧 ENVIRONMENT CONFIGURATION CHECK');
  console.log('='.repeat(60));
  
  if (status.isFullyConfigured) {
    console.log('✅ All required environment variables are configured!');
  } else {
    console.log('❌ Environment configuration issues found');
    
    if (status.errors.length > 0) {
      console.log('\n🚨 ERRORS:');
      status.errors.forEach(error => console.log(`  • ${error}`));
    }
    
    if (status.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      status.warnings.forEach(warning => console.log(`  • ${warning}`));
    }
    
    console.log('\n💡 Run the following command for detailed setup instructions:');
    console.log('   node -e "const {generateEnvironmentReport} = require(\'./lib/environment-check\'); console.log(generateEnvironmentReport())"');
  }
  
  console.log('='.repeat(60) + '\n');
}

// Auto-run check in development
if (process.env.NODE_ENV === 'development' && typeof window === 'undefined') {
  // Only run on server-side in development
  setTimeout(() => {
    logEnvironmentStatus();
  }, 1000);
}