// Quick fix script for chat functionality
const fs = require('fs');
const path = require('path');

console.log('🔧 Quick Fix für Chat-Funktionalität\n');

// Check .env file
console.log('1. Prüfe .env Datei...');
const envPath = '.env';
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  if (!envContent.includes('OPENAI_API_KEY')) {
    console.log('   ⚠️  OPENAI_API_KEY fehlt - wird hinzugefügt...');
    fs.appendFileSync(envPath, '\n\n# OpenAI API Key - Bitte mit echtem Key ersetzen\nOPENAI_API_KEY=sk-your-openai-api-key-here\n');
    console.log('   ✅ OPENAI_API_KEY Platzhalter hinzugefügt');
  } else {
    console.log('   ✅ OPENAI_API_KEY gefunden');
  }
} else {
  console.log('   ❌ .env Datei nicht gefunden');
}

// Check if database migration exists
console.log('\n2. Prüfe Datenbank-Migration...');
const migrationPath = 'database/chat_messages_complete_setup.sql';
if (fs.existsSync(migrationPath)) {
  console.log('   ✅ Datenbank-Migration vorhanden');
  console.log('   📋 Führen Sie diese Datei in Ihrem Supabase SQL Editor aus');
} else {
  console.log('   ❌ Datenbank-Migration nicht gefunden');
}

// Check if API route exists
console.log('\n3. Prüfe API Route...');
const apiPath = 'app/api/chat/route.ts';
if (fs.existsSync(apiPath)) {
  const apiContent = fs.readFileSync(apiPath, 'utf8');
  if (apiContent.includes('gpt-4o')) {
    console.log('   ✅ Chat API mit GPT-4o konfiguriert');
  } else {
    console.log('   ⚠️  Chat API möglicherweise nicht korrekt konfiguriert');
  }
} else {
  console.log('   ❌ Chat API Route nicht gefunden');
}

// Check dashboard components
console.log('\n4. Prüfe Dashboard-Komponenten...');
const dashboardPath = 'app/components/dashboard-overview.tsx';
if (fs.existsSync(dashboardPath)) {
  const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
  if (dashboardContent.includes('/api/chat')) {
    console.log('   ✅ Dashboard mit Chat API verbunden');
  } else {
    console.log('   ❌ Dashboard nicht mit Chat API verbunden');
  }
} else {
  console.log('   ❌ Dashboard-Komponente nicht gefunden');
}

console.log('\n🎯 Nächste Schritte:');
console.log('1. Ersetzen Sie "sk-your-openai-api-key-here" in .env mit Ihrem echten OpenAI API Key');
console.log('2. Öffnen Sie Ihr Supabase Dashboard → SQL Editor');
console.log('3. Führen Sie database/chat_messages_complete_setup.sql aus');
console.log('4. Starten Sie den Development Server neu: pnpm run dev');
console.log('5. Testen Sie die Chat-Funktionalität im Dashboard');

console.log('\n📱 OpenAI API Key erhalten:');
console.log('   → https://platform.openai.com/api-keys');
console.log('   → Erstellen Sie einen neuen API Key');
console.log('   → Ersetzen Sie den Platzhalter in .env');

console.log('\n✨ Chat-Funktionalität ist bereit für die Nutzung!'); 