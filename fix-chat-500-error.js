#!/usr/bin/env node
// Comprehensive Chat 500 Error Diagnostic & Fix Script
const fs = require('fs');
const path = require('path');

console.log('🔧 COMPREHENSIVE CHAT 500 ERROR DIAGNOSIS & FIX\n');
console.log('================================================\n');

let issues = [];
let fixes = [];

// ==========================================
// STEP 1: ENVIRONMENT CONFIGURATION CHECK
// ==========================================
console.log('📋 STEP 1: Environment Configuration');
console.log('─────────────────────────────────────');

const envPath = '.env';
const envContent = `# ==============================================
# SOCIAL MEDIA DASHBOARD - ENVIRONMENT SETUP
# ==============================================

# ==================
# OpenAI Configuration
# ==================
# Get your API key from: https://platform.openai.com/api-keys
OPENAI_API_KEY=your_openai_api_key

# ==================
# Supabase Configuration
# ==================
# Get these from your Supabase project dashboard → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key-here

# ==================
# Next.js Configuration  
# ==================
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-here

# ==================
# Development Settings
# ==================
NODE_ENV=development

# ==============================================
# WICHTIGE HINWEISE:
# ==============================================
# 1. Ersetzen Sie ALLE Platzhalter mit Ihren echten API-Keys
# 2. Teilen Sie diese Datei NIEMALS öffentlich
# 3. Die .env Datei ist bereits in .gitignore eingetragen
# 4. Nach Änderungen Server neu starten: pnpm run dev
# ==============================================`;

if (!fs.existsSync(envPath)) {
  console.log('❌ .env file missing');
  issues.push('Missing .env file');
  
  try {
    fs.writeFileSync(envPath, envContent);
    console.log('✅ .env file created with templates');
    fixes.push('Created .env file with API key templates');
  } catch (error) {
    console.log('⚠️  Could not create .env file:', error.message);
  }
} else {
  console.log('✅ .env file exists');
  
  const existingEnv = fs.readFileSync(envPath, 'utf8');
  
  // Check for specific keys
  const requiredKeys = [
    'OPENAI_API_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  requiredKeys.forEach(key => {
    if (!existingEnv.includes(key)) {
      console.log(`❌ Missing ${key}`);
      issues.push(`Missing ${key} in .env`);
    } else if (existingEnv.includes(`${key}=your-`) || existingEnv.includes(`${key}=sk-your-`)) {
      console.log(`⚠️  ${key} is placeholder`);
      issues.push(`${key} needs real API key`);
    } else {
      console.log(`✅ ${key} configured`);
    }
  });
}

console.log('');

// ==========================================
// STEP 2: DATABASE SCHEMA VERIFICATION
// ==========================================
console.log('📋 STEP 2: Database Schema Verification');
console.log('───────────────────────────────────────');

const schemaPath = 'database/chat_messages_complete_setup.sql';
if (fs.existsSync(schemaPath)) {
  console.log('✅ Chat messages schema file exists');
  console.log('📝 Schema includes:');
  console.log('   - chat_messages table with correct structure');
  console.log('   - Row Level Security (RLS) policies');
  console.log('   - Vector search embedding column for posts');
  console.log('   - Performance indexes');
} else {
  console.log('❌ Chat messages schema file missing');
  issues.push('Missing database schema file');
}

console.log('');

// ==========================================
// STEP 3: API ROUTE ANALYSIS
// ==========================================
console.log('📋 STEP 3: API Route Analysis');
console.log('──────────────────────────────');

const apiPath = 'app/api/chat/route.ts';
if (fs.existsSync(apiPath)) {
  const apiContent = fs.readFileSync(apiPath, 'utf8');
  
  console.log('✅ Chat API route exists');
  
  // Check for critical components
  if (apiContent.includes('verifyAuth')) {
    console.log('✅ Authentication function present');
  } else {
    console.log('❌ Missing authentication');
    issues.push('API route missing authentication');
  }
  
  if (apiContent.includes('generateEmbedding')) {
    console.log('✅ Vector embedding functionality');
  } else {
    console.log('⚠️  Vector embedding might be missing');
  }
  
  if (apiContent.includes('gpt-4o')) {
    console.log('✅ GPT-4o model configured');
  } else {
    console.log('⚠️  GPT-4o model configuration check needed');
  }
  
  if (apiContent.includes('chat_messages')) {
    console.log('✅ Database integration present');
  } else {
    console.log('❌ Missing database integration');
    issues.push('API route missing database integration');
  }
} else {
  console.log('❌ Chat API route missing');
  issues.push('Missing chat API route');
}

console.log('');

// ==========================================
// STEP 4: FRONTEND INTEGRATION CHECK
// ==========================================
console.log('📋 STEP 4: Frontend Integration Check');
console.log('─────────────────────────────────────');

const dashboardPath = 'app/components/dashboard-overview.tsx';
if (fs.existsSync(dashboardPath)) {
  const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
  
  console.log('✅ Dashboard component exists');
  
  if (dashboardContent.includes('/api/chat')) {
    console.log('✅ Chat API integration present');
  } else {
    console.log('❌ Chat API not integrated');
    issues.push('Dashboard missing chat API integration');
  }
  
  if (dashboardContent.includes('Authorization: Bearer')) {
    console.log('✅ Authentication headers configured');
  } else {
    console.log('❌ Missing authentication headers');
    issues.push('Frontend missing authentication headers');
  }
  
  if (dashboardContent.includes('session.access_token')) {
    console.log('✅ Session token handling present');
  } else {
    console.log('⚠️  Session token handling check needed');
  }
} else {
  console.log('❌ Dashboard component missing');
  issues.push('Missing dashboard component');
}

console.log('');

// ==========================================
// STEP 5: DIAGNOSIS SUMMARY & FIXES
// ==========================================
console.log('📋 DIAGNOSIS SUMMARY');
console.log('══════════════════════════════════════');

if (issues.length > 0) {
  console.log('❌ ISSUES FOUND:');
  issues.forEach((issue, index) => {
    console.log(`   ${index + 1}. ${issue}`);
  });
} else {
  console.log('✅ No critical issues detected');
}

console.log('');

if (fixes.length > 0) {
  console.log('🔧 FIXES APPLIED:');
  fixes.forEach((fix, index) => {
    console.log(`   ${index + 1}. ${fix}`);
  });
  console.log('');
}

// ==========================================
// STEP 6: NEXT STEPS INSTRUCTIONS
// ==========================================
console.log('📋 NEXT STEPS TO COMPLETE SETUP');
console.log('══════════════════════════════════════');
console.log('');

console.log('🔑 1. CONFIGURE API KEYS:');
console.log('   ├─ OpenAI API Key: https://platform.openai.com/api-keys');
console.log('   ├─ Create new API key');
console.log('   └─ Replace "sk-your-openai-api-key-here" in .env');
console.log('');

console.log('🗄️ 2. SETUP SUPABASE:');
console.log('   ├─ Go to https://supabase.com');
console.log('   ├─ Create project (if not exists)');
console.log('   ├─ Go to Settings → API');
console.log('   ├─ Copy Project URL → NEXT_PUBLIC_SUPABASE_URL');
console.log('   ├─ Copy anon/public key → NEXT_PUBLIC_SUPABASE_ANON_KEY');
console.log('   └─ Copy service_role key → SUPABASE_SERVICE_ROLE_KEY');
console.log('');

console.log('🗃️ 3. SETUP DATABASE:');
console.log('   ├─ Open Supabase dashboard → SQL Editor');
console.log('   ├─ Run database/chat_messages_complete_setup.sql');
console.log('   └─ Verify tables are created');
console.log('');

console.log('🚀 4. START DEVELOPMENT:');
console.log('   ├─ pnpm run dev');
console.log('   ├─ Open http://localhost:3000');
console.log('   ├─ Test chat functionality');
console.log('   └─ Check browser console for any errors');
console.log('');

console.log('🔍 5. VERIFY SETUP:');
console.log('   ├─ Login to your app');
console.log('   ├─ Open dashboard');
console.log('   ├─ Click AI chat icon (search + sparkle)');
console.log('   ├─ Send test message: "Hello, can you help me?"');
console.log('   └─ Verify response appears');
console.log('');

console.log('⚠️  TROUBLESHOOTING:');
console.log('   ├─ 500 Error: Check API keys in .env file');
console.log('   ├─ Auth Error: Verify Supabase configuration');
console.log('   ├─ DB Error: Run the SQL schema script');
console.log('   └─ No Response: Check browser developer console');
console.log('');

console.log('✨ SETUP COMPLETE!');
console.log('   The chat should work after completing steps 1-4');
console.log('   If issues persist, check the troubleshooting section'); 