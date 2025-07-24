#!/usr/bin/env node
// Script to create .env file for Social Media Dashboard

const fs = require('fs');
const path = require('path');

console.log('🔧 Creating .env file for Social Media Dashboard...\n');

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
# 2. Teilen Sie die .env Datei NIEMALS öffentlich  
# 3. Nach Änderungen Server neu starten: pnpm run dev
# 4. OpenAI API Key: https://platform.openai.com/api-keys
# 5. Supabase Keys: Dashboard → Settings → API
# ==============================================`;

try {
  // Create .env file
  fs.writeFileSync('.env', envContent);
  console.log('✅ .env file created successfully!');
  console.log('');
  
  console.log('📋 NEXT STEPS:');
  console.log('1. Open the .env file in your editor');
  console.log('2. Replace ALL placeholder values with your real API keys:');
  console.log('   ├─ OPENAI_API_KEY: Get from https://platform.openai.com/api-keys');
  console.log('   ├─ NEXT_PUBLIC_SUPABASE_URL: From your Supabase dashboard');
  console.log('   ├─ NEXT_PUBLIC_SUPABASE_ANON_KEY: From Supabase Settings → API');
  console.log('   └─ SUPABASE_SERVICE_ROLE_KEY: From Supabase Settings → API');
  console.log('');
  console.log('3. Save the .env file');
  console.log('4. Restart your development server: pnpm run dev');
  console.log('5. Test the chat in the dashboard');
  console.log('');
  console.log('🚨 CRITICAL: The chat will NOT work until you replace the placeholder API keys!');
  
} catch (error) {
  console.error('❌ Failed to create .env file:', error.message);
  console.log('');
  console.log('📝 MANUAL SOLUTION:');
  console.log('1. Create a file named ".env" in your project root');
  console.log('2. Copy the content from the console output above');
  console.log('3. Replace all placeholder values with real API keys');
} 