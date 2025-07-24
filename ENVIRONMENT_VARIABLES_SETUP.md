# Umgebungsvariablen Setup

## Schritt 4: Umgebungsvariablen konfigurieren

Sie müssen eine `.env.local` Datei im Hauptverzeichnis Ihres Projekts erstellen.

### 1. Erstellen Sie die .env.local Datei:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL_HERE
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY_HERE
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE

# OpenAI Configuration  
OPENAI_API_KEY=YOUR_OPENAI_API_KEY_HERE

# Optional: Node.js Configuration
NODE_TLS_REJECT_UNAUTHORIZED=0
```

### 2. Supabase-Werte erhalten:

1. Gehen Sie zu [Ihr Supabase Dashboard](https://app.supabase.com)
2. Wählen Sie Ihr Projekt aus
3. Gehen Sie zu **Settings > API**
4. Kopieren Sie:
   - **URL**: Das ist Ihre `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key**: Das ist Ihre `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
   - **service_role key**: Das ist Ihre `SUPABASE_SERVICE_ROLE_KEY`

### 3. OpenAI API Key erhalten:

1. Gehen Sie zu [OpenAI Platform](https://platform.openai.com/api-keys)
2. Melden Sie sich an
3. Erstellen Sie einen neuen API Key
4. Kopieren Sie ihn als `OPENAI_API_KEY`

### 4. Beispiel einer vollständigen .env.local:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
OPENAI_API_KEY=your_openai_api_key
NODE_TLS_REJECT_UNAUTHORIZED=0
```

### ⚠️ Wichtige Hinweise:

- Die `.env.local` Datei sollte NIEMALS ins Git Repository eingecheckt werden
- Alle Werte sind geheim und sollten nicht geteilt werden
- Nach Änderungen an der .env.local müssen Sie den Development Server neu starten

### Überprüfung:

Nach dem Setup können Sie mit diesem Befehl testen:
```bash
pnpm run dev
``` 