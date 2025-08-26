# Environment Variable Diagnostic

## Issue
The video processing is failing with "invalid API key" even though the OpenAI API key is present in both `.env` and `.env.local` files.

## Diagnostic Steps

### 1. Test the API Key Directly
Visit this URL in your browser after starting the dev server:
```
http://localhost:3000/api/test-openai
```

This will test if the OpenAI API key is properly loaded and working.

### 2. Restart Development Server
The most common cause of this issue is that environment variables aren't loaded after changes:

```bash
# Stop the current dev server (Ctrl+C)
# Then restart it
npm run dev
# or
yarn dev
```

### 3. Check Environment Variable Loading
The system will now log detailed environment variable status when processing videos. Check the console for:
- ✅ or ❌ status for each environment variable
- Key length and prefix information
- Specific error messages

### 4. Verify API Key Format
The OpenAI API key should:
- Start with `sk-proj-` (for project keys) or `sk-` (for legacy keys)
- Be approximately 164 characters long for project keys
- Not contain any spaces or newlines

### 5. Check File Encoding
Ensure your `.env` and `.env.local` files are saved with UTF-8 encoding without BOM.

## Current API Key Status
From your files, the API key appears to be:
- ✅ Present in both `.env` and `.env.local`
- ✅ Starts with `sk-proj-` (project key format)
- ✅ Correct length (164 characters)

## Troubleshooting

### If the test endpoint shows the key is missing:
1. Restart the development server
2. Check for any syntax errors in the `.env` files
3. Ensure there are no spaces around the `=` sign

### If the test endpoint shows the key is invalid:
1. Verify the key in your OpenAI dashboard
2. Check if the key has been revoked or expired
3. Try generating a new API key

### If the key works in the test but fails in transcription:
1. Check the server logs for more detailed error messages
2. The issue might be with the OpenAI service itself
3. Try processing a shorter video file

## Next Steps
1. Restart your development server
2. Test the `/api/test-openai` endpoint
3. Try processing a video again
4. Check the console logs for detailed diagnostic information

The system now includes comprehensive error handling and diagnostics to help identify the exact issue.