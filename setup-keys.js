#!/usr/bin/env node

/**
 * Interactive API Keys Setup Helper
 * Hilft beim einfachen Einrichten der API-Schlüssel
 */

const readline = require('readline');
const fs = require('fs');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n🚀 API KEYS SETUP HELPER');
console.log('='.repeat(40));
console.log('Ich helfe dir dabei, alle API-Schlüssel einzurichten!\n');

const keys = {};

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function setupKeys() {
  try {
    console.log('📋 SHOTSTACK API KEY (für Video-Features):');
    console.log('   Gehe zu: https://shotstack.io/dashboard/developers');
    console.log('   Kopiere deinen Sandbox API Key\n');
    
    keys.SHOTSTACK_API_KEY = await askQuestion('🔑 Shotstack API Key eingeben (oder Enter für später): ');
    
    console.log('\n📋 SUPABASE KEYS (für Datenbank):');
    console.log('   Gehe zu: https://supabase.com/dashboard');
    console.log('   Wähle dein Projekt → Settings → API\n');
    
    keys.NEXT_PUBLIC_SUPABASE_URL = await askQuestion('🌐 Supabase Project URL eingeben: ');
    keys.NEXT_PUBLIC_SUPABASE_ANON_KEY = await askQuestion('🔓 Supabase Anon Key eingeben: ');
    keys.SUPABASE_SERVICE_ROLE_KEY = await askQuestion('🔐 Supabase Service Role Key eingeben: ');
    
    console.log('\n📋 OPENAI API KEY (optional für AI-Features):');
    console.log('   Gehe zu: https://platform.openai.com/api-keys\n');
    
    keys.OPENAI_API_KEY = await askQuestion('🤖 OpenAI API Key eingeben (oder Enter für später): ');
    
    // Erstelle .env.local Inhalt
    let envContent = `# ==================================
# SOCIAL MEDIA DASHBOARD - ENVIRONMENT CONFIGURATION
# ==================================
# Automatisch generiert am ${new Date().toLocaleDateString('de-DE')}

# SUPABASE CONFIGURATION (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=${keys.NEXT_PUBLIC_SUPABASE_URL || 'https://YOUR_PROJECT_ID.supabase.co'}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${keys.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your_supabase_anon_key_here'}
SUPABASE_SERVICE_ROLE_KEY=${keys.SUPABASE_SERVICE_ROLE_KEY || 'your_supabase_service_role_key_here'}

# SHOTSTACK CONFIGURATION (für Video Features)
SHOTSTACK_API_KEY=${keys.SHOTSTACK_API_KEY || 'your_shotstack_sandbox_key_here'}
SHOTSTACK_ENVIRONMENT=sandbox

# OPENAI CONFIGURATION (OPTIONAL)
OPENAI_API_KEY=${keys.OPENAI_API_KEY || 'your_openai_api_key_here'}

# ==================================
# WICHTIG: Diese Datei NIEMALS in Git committen!
# ==================================
`;

    // Schreibe .env.local
    fs.writeFileSync('.env.local', envContent);
    
    console.log('\n✅ .env.local wurde erfolgreich erstellt!');
    console.log('\n🔧 Nächste Schritte:');
    console.log('   1. Starte den Server neu: pnpm run dev');
    console.log('   2. Teste die Konfiguration: node check-env.js');
    console.log('   3. Deine App sollte jetzt funktionieren! 🎉');
    
  } catch (error) {
    console.error('\n❌ Fehler:', error.message);
  } finally {
    rl.close();
  }
}

setupKeys();