#!/usr/bin/env node

/**
 * Environment Variables Checker
 * Überprüft ob alle notwendigen API-Schlüssel konfiguriert sind
 */

console.log('\n🔧 ENVIRONMENT CONFIGURATION CHECK');
console.log('='.repeat(50));

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const checks = [
  {
    name: 'Supabase URL',
    key: 'NEXT_PUBLIC_SUPABASE_URL',
    required: true,
    test: (value) => value && value.includes('supabase.co')
  },
  {
    name: 'Supabase Anon Key',
    key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    required: true,
    test: (value) => value && value.length > 50
  },
  {
    name: 'Supabase Service Role Key',
    key: 'SUPABASE_SERVICE_ROLE_KEY',
    required: true,
    test: (value) => value && value.length > 50
  },
  {
    name: 'Shotstack API Key',
    key: 'SHOTSTACK_API_KEY',
    required: false,
    test: (value) => value && value.length > 20
  },
  {
    name: 'OpenAI API Key',
    key: 'OPENAI_API_KEY',
    required: false,
    test: (value) => value && value.startsWith('sk-')
  }
];

let allGood = true;
let missingRequired = [];
let missingOptional = [];

checks.forEach(check => {
  const value = process.env[check.key];
  const isValid = check.test(value);
  
  if (!isValid) {
    if (check.required) {
      missingRequired.push(check);
      allGood = false;
    } else {
      missingOptional.push(check);
    }
  }
});

if (allGood && missingOptional.length === 0) {
  console.log('✅ Alle Environment-Variablen sind konfiguriert!');
} else {
  if (missingRequired.length > 0) {
    console.log('\n❌ FEHLENDE REQUIRED VARIABLEN:');
    missingRequired.forEach(check => {
      console.log(`   • ${check.name} (${check.key})`);
    });
  }
  
  if (missingOptional.length > 0) {
    console.log('\n⚠️  FEHLENDE OPTIONAL VARIABLEN:');
    missingOptional.forEach(check => {
      console.log(`   • ${check.name} (${check.key})`);
    });
  }
}

console.log('\n📋 SETUP-ANLEITUNGEN:');
console.log('');
console.log('🔥 SHOTSTACK (für Video-Features):');
console.log('   1. Gehe zu: https://shotstack.io/dashboard/developers');
console.log('   2. Registriere dich kostenlos');
console.log('   3. Kopiere deinen Sandbox API Key');
console.log('   4. Füge ihn zu .env.local hinzu: SHOTSTACK_API_KEY=dein_key_hier');
console.log('');
console.log('🗄️  SUPABASE (für Datenbank):');
console.log('   1. Gehe zu: https://supabase.com/dashboard');
console.log('   2. Wähle dein Projekt → Settings → API');
console.log('   3. Kopiere Project URL, anon key und service_role key');
console.log('   4. Füge sie zu .env.local hinzu');
console.log('');
console.log('🤖 OPENAI (optional für AI-Features):');
console.log('   1. Gehe zu: https://platform.openai.com/api-keys');
console.log('   2. Erstelle einen neuen Secret Key');
console.log('   3. Füge ihn zu .env.local hinzu: OPENAI_API_KEY=sk-...');

if (!allGood) {
  console.log('\n🚨 WICHTIG: Starte den Server neu nach dem Hinzufügen der Keys:');
  console.log('   pnpm run dev');
  process.exit(1);
} else {
  console.log('\n🎉 Alles bereit! Du kannst jetzt alle Features nutzen.');
  process.exit(0);
}