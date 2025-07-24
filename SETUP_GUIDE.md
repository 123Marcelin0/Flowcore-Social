# 🚀 Chat-Funktionalität Setup Guide

## ⚠️ **Aktuelle Probleme und Lösungen**

### 1. **OPENAI_API_KEY fehlt**
```bash
# Fügen Sie diese Zeile zu Ihrer .env Datei hinzu:
OPENAI_API_KEY=your_openai_api_key_here
```

### 2. **Datenbank-Schema fehlt**
Die `chat_messages` Tabelle muss erstellt werden.

### 3. **Authentifizierungs-Probleme**
Refresh Token Fehler deuten auf Client-seitige Auth-Probleme hin.

## 🔧 **Schritt-für-Schritt Lösung**

### **Schritt 1: OpenAI API Key hinzufügen**
1. Gehen Sie zu [OpenAI Platform](https://platform.openai.com/api-keys)
2. Erstellen Sie einen neuen API Key
3. Fügen Sie ihn zu Ihrer `.env` Datei hinzu:
```env
OPENAI_API_KEY=sk-your-openai-api-key-here
```

### **Schritt 2: Datenbank-Migration ausführen**
1. Öffnen Sie Ihr Supabase Dashboard
2. Gehen Sie zu "SQL Editor"
3. Führen Sie das folgende SQL-Skript aus:

```sql
-- Führen Sie dieses Skript in Ihrem Supabase SQL Editor aus
-- (Inhalt von database/chat_messages_complete_setup.sql)
```

### **Schritt 3: Umgebungsvariablen prüfen**
```bash
# Prüfen Sie, ob alle Variablen gesetzt sind:
node test-auth.js
```

### **Schritt 4: Entwicklungsserver neustarten**
```bash
pnpm run dev
```

### **Schritt 5: Testen der Chat-Funktionalität**
1. Melden Sie sich in der Anwendung an
2. Öffnen Sie das Chat-Fenster
3. Stellen Sie eine Testfrage

## 🛠️ **Schnelle Problemlösung**

### **Problem: "Failed to save user message"**
**Lösung:** Datenbank-Migration ausführen

### **Problem: "Invalid Refresh Token"**
**Lösung:** Browser-Cache leeren und erneut anmelden

### **Problem: "OpenAI API Key not found"**
**Lösung:** OPENAI_API_KEY in .env hinzufügen

### **Problem: "Vector search failed"**
**Lösung:** Embedding-Spalte zur posts-Tabelle hinzufügen

## 🎯 **Automatische Lösung**

Führen Sie diese Befehle aus, um alle Probleme automatisch zu beheben:

```bash
# 1. Prüfen Sie das aktuelle Setup
node test-auth.js

# 2. Führen Sie die Datenbank-Migration aus
# (Kopieren Sie den Inhalt von database/chat_messages_complete_setup.sql 
#  in den Supabase SQL Editor)

# 3. Starten Sie den Server neu
pnpm run dev
```

## 📋 **Vollständige .env Datei**

Ihre `.env` Datei sollte so aussehen:

```env
# Replicate
REPLICATE_API_TOKEN=your_replicate_api_token

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://jckolowsnvlgmtolwzzn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# OpenAI (HINZUFÜGEN!)
OPENAI_API_KEY=sk-your-openai-api-key-here
```

## 🔍 **Debugging-Tipps**

### **Browser-Konsole prüfen**
```javascript
// In der Browser-Konsole ausführen:
console.log('Auth status:', localStorage.getItem('supabase.auth.token'));
```

### **Server-Logs prüfen**
```bash
# Terminal prüfen für Fehler wie:
# - "OpenAI API key is not defined"
# - "Failed to save user message"
# - "Vector search failed"
```

### **Netzwerk-Tab prüfen**
- Suchen Sie nach 500-Fehlern bei `/api/chat`
- Prüfen Sie Auth-Header in Anfragen

## ✅ **Erfolgreich getestet**

Nach der Durchführung dieser Schritte sollten Sie:
- ✅ Erfolgreiche Authentifizierung haben
- ✅ Chat-Nachrichten senden können
- ✅ GPT-4o Antworten erhalten
- ✅ Konversations-Kontext beibehalten
- ✅ Relevante Posts in Antworten einbezogen bekommen

## 🆘 **Sofortige Hilfe**

Wenn Sie weiterhin Probleme haben:
1. Führen Sie `node test-auth.js` aus
2. Überprüfen Sie die Browser-Konsole
3. Kontrollieren Sie die Server-Logs
4. Stellen Sie sicher, dass alle Umgebungsvariablen gesetzt sind 