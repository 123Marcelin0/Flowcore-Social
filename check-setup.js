// Quick setup verification script
const fs = require('fs');
const path = require('path');

console.log('🔍 Checking setup for Enhanced Chat with GPT-4o...\n');

// Check if required files exist
const requiredFiles = [
  'app/api/chat/route.ts',
  'database/chat_messages_migration.sql',
  'lib/supabase.ts',
  'lib/openaiService.ts',
  'package.json'
];

console.log('📁 Checking required files...');
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - Missing!`);
  }
});

// Check package.json for required dependencies
console.log('\n📦 Checking dependencies...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredDeps = ['openai', 'uuid', '@supabase/supabase-js'];

requiredDeps.forEach(dep => {
  if (packageJson.dependencies[dep]) {
    console.log(`✅ ${dep} - ${packageJson.dependencies[dep]}`);
  } else {
    console.log(`❌ ${dep} - Missing!`);
  }
});

// Check for TypeScript types
console.log('\n🔧 Checking TypeScript types...');
const requiredTypeDeps = ['@types/uuid', '@types/node'];
requiredTypeDeps.forEach(dep => {
  if (packageJson.devDependencies[dep]) {
    console.log(`✅ ${dep} - ${packageJson.devDependencies[dep]}`);
  } else {
    console.log(`❌ ${dep} - Missing!`);
  }
});

// Check environment variables
console.log('\n🌍 Checking environment variables...');
const requiredEnvVars = [
  'OPENAI_API_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
];

requiredEnvVars.forEach(envVar => {
  if (process.env[envVar]) {
    console.log(`✅ ${envVar} - Set`);
  } else {
    console.log(`❌ ${envVar} - Missing!`);
  }
});

// Check if chat API route has been updated
console.log('\n🤖 Checking chat API route...');
const chatRoute = fs.readFileSync('app/api/chat/route.ts', 'utf8');
if (chatRoute.includes('gpt-4o')) {
  console.log('✅ Chat route uses GPT-4o model');
} else {
  console.log('❌ Chat route might not be configured for GPT-4o');
}

if (chatRoute.includes('generateEmbedding')) {
  console.log('✅ Chat route includes embedding generation');
} else {
  console.log('❌ Chat route missing embedding generation');
}

if (chatRoute.includes('vector search')) {
  console.log('✅ Chat route includes vector search capability');
} else {
  console.log('❌ Chat route missing vector search');
}

// Check if dashboard components are updated
console.log('\n📱 Checking dashboard components...');
const dashboardFile = 'app/components/dashboard-overview.tsx';
if (fs.existsSync(dashboardFile)) {
  const dashboardContent = fs.readFileSync(dashboardFile, 'utf8');
  if (dashboardContent.includes('/api/chat')) {
    console.log('✅ Dashboard connected to chat API');
  } else {
    console.log('❌ Dashboard not connected to chat API');
  }
  
  if (dashboardContent.includes('supabase')) {
    console.log('✅ Dashboard includes Supabase integration');
  } else {
    console.log('❌ Dashboard missing Supabase integration');
  }
} else {
  console.log('❌ Dashboard component not found');
}

console.log('\n🎯 Setup verification complete!');
console.log('\n📋 Next steps:');
console.log('1. Run the database migration: Execute chat_messages_migration.sql in Supabase');
console.log('2. Start the development server: pnpm run dev');
console.log('3. Test the chat functionality in the dashboard');
console.log('4. Check browser console for any errors'); 