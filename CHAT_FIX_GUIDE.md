# Chat Functionality Fix Guide

## Issues Fixed

This guide addresses the following errors:
1. **500 Internal Server Error** when using chat functionality
2. **"Failed to save user message"** error in the dashboard
3. Missing database tables and environment configuration

## Root Causes Identified

1. **Missing OpenAI API Key** - The chat functionality requires an OpenAI API key for embeddings and chat completion
2. **Missing chat_messages table** - The database was missing the required table for storing chat messages
3. **Missing vector extension** - Required for semantic search functionality in the chat

## Step-by-Step Fix

### 1. Set Up OpenAI API Key

**Add to your `.env.local` file:**
```bash
# OpenAI API Key for Chat functionality and embeddings
# Get your API key from: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your-actual-openai-api-key-here
```

**Important Notes:**
- Replace `sk-your-actual-openai-api-key-here` with your real OpenAI API key
- Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
- Ensure you have credits/billing set up in your OpenAI account

### 2. Run Database Setup

**In your Supabase SQL Editor, run this script:**
```sql
-- Copy and paste the entire content from: database/complete_chat_setup_fix.sql
```

**Or run the script directly:**
1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy the content from `database/complete_chat_setup_fix.sql`
4. Execute the script
5. Verify you see success messages in the output

### 3. Enable Vector Extension (if needed)

If the vector extension is not available in your Supabase instance:

1. Go to **Database > Extensions** in your Supabase dashboard
2. Search for "vector" 
3. Enable the `pgvector` extension
4. Re-run the database setup script

### 4. Restart Your Application

After making these changes:
```bash
# Stop the development server (Ctrl+C)
# Restart it
npm run dev
```

## Verification Steps

### Test the Chat Functionality

1. **Open the Dashboard**: Navigate to your social media dashboard
2. **Open AI Chat**: Click the search/sparkles icon to open the AI chat panel
3. **Send a Test Message**: Try sending "Hello" or "What posts do I have?"
4. **Check for Errors**: 
   - No 500 errors should appear
   - The AI should respond appropriately
   - Messages should be saved (visible in chat history)

### Check Database

You can verify the setup in Supabase:
```sql
-- Check if chat_messages table exists
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'chat_messages';

-- Check if vector extension is enabled
SELECT extname FROM pg_extension WHERE extname = 'vector';

-- Check if posts table has embedding column
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'posts' AND column_name = 'embedding';
```

## Troubleshooting

### Still Getting 500 Errors?

1. **Check API Key**: Ensure your OpenAI API key is valid and has credits
2. **Check Console**: Look for specific error messages in browser developer tools
3. **Check Supabase Logs**: Review logs in your Supabase dashboard
4. **Verify Database**: Ensure all tables were created successfully

### "Invalid or expired token" Error?

1. **Clear Browser Cache**: Sometimes auth tokens get stuck
2. **Re-login**: Log out and log back into the application
3. **Check Supabase Auth**: Verify your authentication setup

### Vector Search Not Working?

1. **Enable pgvector**: Make sure the vector extension is enabled in Supabase
2. **Re-run Setup**: Execute the database setup script again
3. **Check Supabase Plan**: Ensure your plan supports the vector extension

## What Was Fixed

1. **Database Schema**: Added complete `chat_messages` table with proper structure
2. **Vector Support**: Added embedding column to posts table for semantic search
3. **Row Level Security**: Proper RLS policies to ensure user data isolation
4. **Helper Functions**: Added functions for conversation management
5. **Environment Setup**: Documented required environment variables

## Additional Notes

- The chat functionality uses OpenAI's `gpt-4o` model for responses
- Embeddings are generated using `text-embedding-3-small` model
- The system implements RAG (Retrieval-Augmented Generation) to provide context from your posts
- All chat messages are stored with proper user isolation via RLS policies

## Support

If you continue to experience issues after following this guide:

1. Check the browser console for detailed error messages
2. Review your Supabase project logs
3. Ensure all environment variables are properly set
4. Verify your OpenAI account has sufficient credits

The application should now work correctly with full chat functionality! 