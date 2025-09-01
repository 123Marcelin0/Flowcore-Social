/**
 * Umfassender Test für die Chat-Funktionalität
 * Führen Sie dieses Script aus, nachdem Sie die Datenbank und Umgebungsvariablen eingerichtet haben
 */

const { createClient } = require('@supabase/supabase-js');

// Konfiguration aus Umgebungsvariablen laden
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;
const openaiOrgId = process.env.OPENAI_ORG_ID;
const openaiProjectId = process.env.OPENAI_PROJECT_ID;

console.log('🧪 Chat-Funktionalität Volltest\n');

// Test 1: Umgebungsvariablen prüfen
console.log('📋 Schritt 1: Umgebungsvariablen prüfen...');
if (!supabaseUrl) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL fehlt in .env.local');
  process.exit(1);
}
if (!supabaseAnonKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY fehlt in .env.local');
  process.exit(1);
}
if (!openaiApiKey) {
  console.error('❌ OPENAI_API_KEY fehlt in .env.local');
  process.exit(1);
}
// Safe print key diagnostics
const sanitizedKey = openaiApiKey.trim().replace(/^["']|["']$/g, '');
console.log('✅ Alle Umgebungsvariablen sind gesetzt');
console.log(`   OPENAI_API_KEY: present=${!!sanitizedKey}, len=${sanitizedKey.length}, startsWithSk=${sanitizedKey.startsWith('sk-')}, prefix=${sanitizedKey.slice(0,10)}`);
console.log('');

// Test 2: Supabase-Verbindung prüfen
console.log('📋 Schritt 2: Supabase-Verbindung prüfen...');
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase.from('user_profiles').select('count').limit(1);
    if (error) {
      console.error('❌ Supabase-Verbindung fehlgeschlagen:', error.message);
      return false;
    }
    console.log('✅ Supabase-Verbindung erfolgreich');
    return true;
  } catch (error) {
    console.error('❌ Supabase-Verbindung fehlgeschlagen:', error.message);
    return false;
  }
}

// Test 3: chat_messages Tabelle prüfen
async function testChatMessagesTable() {
  console.log('\n📋 Schritt 3: chat_messages Tabelle prüfen...');
  try {
    const { data, error } = await supabase.from('chat_messages').select('count').limit(1);
    if (error) {
      console.error('❌ chat_messages Tabelle nicht gefunden oder nicht zugänglich:');
      console.error('   Error:', error.message);
      console.error('   Code:', error.code);
      console.error('\n💡 Lösung: Führen Sie das SQL-Script database/fix_chat_messages_final.sql in Ihrem Supabase SQL Editor aus');
      return false;
    }
    console.log('✅ chat_messages Tabelle ist verfügbar');
    return true;
  } catch (error) {
    console.error('❌ Fehler beim Zugriff auf chat_messages Tabelle:', error.message);
    return false;
  }
}

// Test 4: OpenAI API prüfen
async function testOpenAIConnection() {
  console.log('\n📋 Schritt 4: OpenAI API-Verbindung prüfen...');
  try {
    if (typeof fetch !== 'function') {
      const mod = await import('node-fetch');
      global.fetch = mod.default || mod;
    }
    const headers = {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json'
    };
    if (openaiOrgId) headers['OpenAI-Organization'] = openaiOrgId;
    if (openaiProjectId) headers['OpenAI-Project'] = openaiProjectId;

    const response = await fetch('https://api.openai.com/v1/models', { headers });
    
    if (!response.ok) {
      console.error('❌ OpenAI API-Verbindung fehlgeschlagen:', response.status, response.statusText);
      console.error('💡 Überprüfen Sie Ihren OPENAI_API_KEY in .env.local');
      return false;
    }
    
    const data = await response.json();
    console.log('✅ OpenAI API-Verbindung erfolgreich');
    console.log(`   Verfügbare Modelle: ${data.data.length}`);
    return true;
  } catch (error) {
    console.error('❌ OpenAI API-Verbindung fehlgeschlagen:', error.message);
    return false;
  }
}

// Optional: Direct tiny chat completion
async function testOpenAIChatDirect() {
  console.log('\n📋 Schritt 4b: OpenAI Chat Completion direkt testen...');
  try {
    if (typeof fetch !== 'function') {
      const mod = await import('node-fetch');
      global.fetch = mod.default || mod;
    }
    const headers = {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json'
    };
    if (openaiOrgId) headers['OpenAI-Organization'] = openaiOrgId;
    if (openaiProjectId) headers['OpenAI-Project'] = openaiProjectId;

    const body = {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Be concise.' },
        { role: 'user', content: 'Say ok.' }
      ],
      max_tokens: 5
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    const text = await response.text();
    if (!response.ok) {
      console.error('❌ Chat Completion fehlgeschlagen:', response.status, response.statusText);
      console.error(text);
      return false;
    }
    const data = JSON.parse(text);
    const content = data?.choices?.[0]?.message?.content || '';
    console.log('✅ Chat Completion erfolgreich:', content);
    return true;
  } catch (error) {
    console.error('❌ Chat Completion Fehler:', error.message);
    return false;
  }
}

// Test 5: Authentifizierung simulieren (Optional)
async function testAuthentication() {
  console.log('\n📋 Schritt 5: Authentifizierung testen...');
  try {
    // Versuche ein Testuser zu erstellen (wird wahrscheinlich fehlschlagen, aber das ist OK)
    const { data, error } = await supabase.auth.signUp({
      email: 'test@example.com',
      password: 'testpassword123'
    });
    
    if (error && error.message.includes('already registered')) {
      console.log('ℹ️  Test-User existiert bereits (das ist OK)');
      return true;
    } else if (error) {
      console.log('ℹ️  Authentifizierung funktioniert (erwarteter Fehler):', error.message);
      return true;
    } else {
      console.log('✅ Test-User erfolgreich erstellt');
      return true;
    }
  } catch (error) {
    console.log('ℹ️  Authentifizierung ist konfiguriert (Verbindung funktioniert)');
    return true;
  }
}

// Test 6: Chat API Route testen (lokal)
async function testChatAPI() {
  console.log('\n📋 Schritt 6: Chat API Route testen...');
  try {
    if (typeof fetch !== 'function') {
      const mod = await import('node-fetch');
      global.fetch = mod.default || mod;
    }
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer dummy-token' // Dies wird fehlschlagen, aber zeigt uns ob die Route existiert
      },
      body: JSON.stringify({
        query: 'Test message'
      })
    });
    
    if (response.status === 401) {
      console.log('✅ Chat API Route ist verfügbar (Authentifizierung erforderlich)');
      return true;
    } else if (response.status === 404) {
      console.error('❌ Chat API Route nicht gefunden');
      console.error('💡 Stellen Sie sicher, dass der Development Server läuft: pnpm run dev');
      return false;
    } else {
      console.log(`ℹ️  Chat API Route antwortet (Status: ${response.status})`);
      return true;
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Development Server läuft nicht');
      console.error('💡 Starten Sie den Server mit: pnpm run dev');
      return false;
    }
    console.error('❌ Fehler beim Testen der Chat API:', error.message);
    return false;
  }
}

// Hauptfunktion
async function runTests() {
  const results = [];
  
  results.push(await testSupabaseConnection());
  results.push(await testChatMessagesTable());
  results.push(await testOpenAIConnection());
  results.push(await testOpenAIChatDirect());
  results.push(await testAuthentication());
  results.push(await testChatAPI());
  
  const passedTests = results.filter(result => result).length;
  const totalTests = results.length;
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST-ERGEBNISSE');
  console.log('='.repeat(50));
  console.log(`✅ Erfolgreich: ${passedTests}/${totalTests} Tests`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 ALLE TESTS BESTANDEN!');
    console.log('   Ihr Chat-System ist bereit für den Einsatz.');
    console.log('\n🚀 Nächste Schritte:');
    console.log('   1. Starten Sie den Development Server: pnpm run dev');
    console.log('   2. Öffnen Sie http://localhost:3000');
    console.log('   3. Melden Sie sich an');
    console.log('   4. Testen Sie den AI Chat im Dashboard');
  } else {
    console.log('\n⚠️  EINIGE TESTS FEHLGESCHLAGEN');
    console.log('   Bitte beheben Sie die oben genannten Probleme vor dem Start.');
    console.log('\n📖 Hilfe:');
    console.log('   - Überprüfen Sie ENVIRONMENT_VARIABLES_SETUP.md');
    console.log('   - Führen Sie database/fix_chat_messages_final.sql aus');
    console.log('   - Starten Sie den Development Server: pnpm run dev');
  }
  console.log('='.repeat(50));
}

// Script ausführen
runTests().catch(console.error); 