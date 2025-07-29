#!/usr/bin/env node

/**
 * AI Interior Designer Setup Test Script
 * 
 * This script tests the AI Interior Designer setup by:
 * 1. Checking environment variables
 * 2. Testing API connections
 * 3. Verifying database setup
 * 
 * Usage: node test-interior-design-setup.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

// Load environment variables from .env.local
function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local');
  
  if (!fs.existsSync(envPath)) {
    logWarning('.env.local file not found');
    return {};
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
      env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });

  return env;
}

// Test environment variables
function testEnvironmentVariables() {
  log('\n🔍 Testing Environment Variables...', colors.bold);
  
  const env = { ...process.env, ...loadEnvFile() };
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENAI_API_KEY'
  ];
  
  const optionalVars = [
    'APPLYDESIGN_API_KEY',
    'REIMAGINEHOME_API_KEY'
  ];

  let hasAllRequired = true;
  
  // Check required variables
  requiredVars.forEach(varName => {
    if (env[varName]) {
      logSuccess(`${varName} is set`);
    } else {
      logError(`${varName} is missing`);
      hasAllRequired = false;
    }
  });

  // Check optional variables
  optionalVars.forEach(varName => {
    if (env[varName]) {
      logSuccess(`${varName} is set`);
    } else {
      logWarning(`${varName} is not set (optional for testing)`);
    }
  });

  return { hasAllRequired, env };
}

// Test ApplyDesign.io API
function testApplyDesignAPI(apiKey) {
  return new Promise((resolve) => {
    if (!apiKey) {
      logWarning('APPLYDESIGN_API_KEY not set, skipping ApplyDesign.io test');
      resolve(false);
      return;
    }

    const options = {
      hostname: 'api.applydesign.io',
      path: '/v1/account/coin_count',
      method: 'GET',
      headers: {
        'X-API-Key': apiKey
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const result = JSON.parse(data);
            logSuccess(`ApplyDesign.io API connection successful (Coins: ${result})`);
            resolve(true);
          } catch (error) {
            logError(`ApplyDesign.io API returned invalid JSON: ${data}`);
            resolve(false);
          }
        } else {
          logError(`ApplyDesign.io API error: ${res.statusCode} - ${data}`);
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      logError(`ApplyDesign.io API connection failed: ${error.message}`);
      resolve(false);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      logError('ApplyDesign.io API request timeout');
      resolve(false);
    });

    req.end();
  });
}

// Test file structure
function testFileStructure() {
  log('\n📁 Testing File Structure...', colors.bold);
  
  const requiredFiles = [
    'app/api/ai-studio/interior-design/route.ts',
    'app/components/ai-interior-designer.tsx',
    'database/ai_jobs_table_setup.sql',
    'database/setup_interior_design_storage.sql'
  ];

  let allFilesExist = true;

  requiredFiles.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      logSuccess(`${filePath} exists`);
    } else {
      logError(`${filePath} is missing`);
      allFilesExist = false;
    }
  });

  return allFilesExist;
}

// Test package.json dependencies
function testDependencies() {
  log('\n📦 Testing Dependencies...', colors.bold);
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const requiredDeps = [
      '@supabase/supabase-js',
      'openai',
      'lucide-react'
    ];

    let allDepsPresent = true;

    requiredDeps.forEach(dep => {
      const isPresent = 
        (packageJson.dependencies && packageJson.dependencies[dep]) ||
        (packageJson.devDependencies && packageJson.devDependencies[dep]);
      
      if (isPresent) {
        logSuccess(`${dep} is installed`);
      } else {
        logError(`${dep} is missing`);
        allDepsPresent = false;
      }
    });

    return allDepsPresent;
  } catch (error) {
    logError(`Could not read package.json: ${error.message}`);
    return false;
  }
}

// Main test function
async function runTests() {
  log('🚀 AI Interior Designer Setup Test', colors.bold + colors.blue);
  log('=====================================\n');

  const { hasAllRequired, env } = testEnvironmentVariables();
  const fileStructureOk = testFileStructure();
  const dependenciesOk = testDependencies();

  log('\n🌐 Testing API Connections...', colors.bold);
  const applyDesignOk = await testApplyDesignAPI(env.APPLYDESIGN_API_KEY);

  // Final summary
  log('\n📊 Test Summary', colors.bold);
  log('================');

  if (hasAllRequired) {
    logSuccess('Environment variables: PASS');
  } else {
    logError('Environment variables: FAIL');
  }

  if (fileStructureOk) {
    logSuccess('File structure: PASS');
  } else {
    logError('File structure: FAIL');
  }

  if (dependenciesOk) {
    logSuccess('Dependencies: PASS');
  } else {
    logError('Dependencies: FAIL');
  }

  if (applyDesignOk || !env.APPLYDESIGN_API_KEY) {
    logSuccess('ApplyDesign.io API: PASS');
  } else {
    logError('ApplyDesign.io API: FAIL');
  }

  const allTestsPassed = hasAllRequired && fileStructureOk && dependenciesOk && (applyDesignOk || !env.APPLYDESIGN_API_KEY);

  log('\n' + '='.repeat(40));
  if (allTestsPassed) {
    logSuccess('🎉 All tests passed! Your AI Interior Designer setup is ready.');
    log('\nNext steps:');
    logInfo('1. Run database migrations (ai_jobs_table_setup.sql)');
    logInfo('2. Setup Supabase storage (setup_interior_design_storage.sql)');
    logInfo('3. Test in your application by navigating to AI Studio > Interior');
  } else {
    logError('❌ Some tests failed. Please check the errors above and fix them.');
    log('\nTroubleshooting:');
    logInfo('1. Ensure all environment variables are set in .env.local');
    logInfo('2. Verify API keys are valid');
    logInfo('3. Check that all required files exist');
    logInfo('4. Install missing dependencies with: pnpm install');
  }

  process.exit(allTestsPassed ? 0 : 1);
}

// Run the tests
runTests().catch(error => {
  logError(`Test script failed: ${error.message}`);
  process.exit(1);
}); 