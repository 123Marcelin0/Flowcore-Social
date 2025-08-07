# Vertex AI Video Generation Setup

This document explains the implementation of Vertex AI video generation with OAuth 2.0 authentication in the social media dashboard.

## Overview

The video generation API has been updated to use Google's Vertex AI `predictLongRunning` endpoint instead of the previous Veo API. This implementation includes:

- OAuth 2.0 authentication using Google Cloud credentials
- Long-running operation polling
- Proper error handling and fallback mechanisms

## Environment Variables Required

Add these environment variables to your `.env.local` file:

```bash
# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=path/to/your/service-account-key.json
```

## Authentication Setup

### 1. Create a Google Cloud Service Account

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to IAM & Admin > Service Accounts
3. Create a new service account or use an existing one
4. Grant the following roles:
   - Vertex AI User
   - Vertex AI Service Agent

### 2. Download Service Account Key

1. Click on your service account
2. Go to the "Keys" tab
3. Create a new JSON key
4. Download the JSON file
5. Place it in your project (e.g., `config/google-credentials.json`)
6. Update `GOOGLE_APPLICATION_CREDENTIALS` to point to this file

### 3. Enable Required APIs

Enable these APIs in your Google Cloud project:
- Vertex AI API
- Cloud Storage API (if storing generated videos)

## API Endpoints

### POST /api/generate-video

Generates a video using Vertex AI.

**Request Body:**
```json
{
  "prompt": "A beautiful sunset over mountains",
  "model": "veo-2",
  "duration": 10,
  "fps": 30,
  "resolution": "720p",
  "style": "cinematic",
  "motionIntensity": 5,
  "cameraMovement": "slow_pan"
}
```

**Response:**
```json
{
  "success": true,
  "videoUrl": "https://storage.googleapis.com/...",
  "taskId": "operations/...",
  "estimatedTime": 60
}
```

### GET /api/generate-video?taskId=...

Check the status of a long-running video generation operation.

**Response:**
```json
{
  "success": true,
  "status": "completed",
  "videoUrl": "https://storage.googleapis.com/...",
  "progress": 100
}
```

## Implementation Details

### OAuth 2.0 Authentication

The implementation uses the `google-auth-library` package to handle OAuth 2.0 authentication:

```typescript
import { GoogleAuth } from 'google-auth-library'

async function getAuthenticatedClient() {
  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    keyFile: GOOGLE_APPLICATION_CREDENTIALS,
  })
  
  return await auth.getClient()
}
```

### Long-Running Operations

The Vertex AI `predictLongRunning` endpoint returns an operation name that must be polled until completion:

```typescript
async function pollOperation(operationName: string): Promise<any> {
  const client = await getAuthenticatedClient()
  const accessToken = await client.getAccessToken()
  
  const maxAttempts = 60 // 5 minutes with 5-second intervals
  let attempts = 0
  
  while (attempts < maxAttempts) {
    const response = await fetch(
      `${VERTEX_AI_BASE_URL}/v1/${operationName}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json',
        },
      }
    )
    
    const operation = await response.json()
    
    if (operation.done) {
      if (operation.error) {
        throw new Error(`Operation failed: ${JSON.stringify(operation.error)}`)
      }
      return operation.response
    }
    
    await new Promise(resolve => setTimeout(resolve, 5000))
    attempts++
  }
  
  throw new Error('Operation timed out after 5 minutes')
}
```

### Request Format

The Vertex AI request format has been updated to match the API specification:

```typescript
const vertexRequest = {
  instances: [{
    prompt: request.prompt,
    video_config: {
      duration_seconds: request.duration,
      fps: request.fps,
      width: dimensions.width,
      height: dimensions.height,
      style: request.style,
      motion_intensity: request.motionIntensity / 10, // Normalize to 0-1
      camera_movement: request.cameraMovement
    }
  }],
  parameters: {
    model: request.model
  }
}
```

## Error Handling

The implementation includes comprehensive error handling:

1. **Authentication Errors**: Checks for valid Google Cloud credentials
2. **API Errors**: Handles Vertex AI API response errors
3. **Timeout Errors**: Manages long-running operation timeouts
4. **Fallback**: Falls back to simulation mode if Vertex AI is unavailable

## Testing

To test the implementation:

1. Ensure all environment variables are set
2. Make a POST request to `/api/generate-video` with valid parameters
3. Check the response for success and video URL
4. If using long-running operations, poll the status endpoint

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify `GOOGLE_APPLICATION_CREDENTIALS` points to a valid service account key
   - Ensure the service account has the required permissions

2. **API Errors**
   - Check that Vertex AI API is enabled in your Google Cloud project
   - Verify the project ID is correct

3. **Timeout Errors**
   - Video generation can take several minutes
   - The polling mechanism will timeout after 5 minutes
   - Consider increasing the timeout for longer videos

### Debug Mode

Enable debug logging by setting:
```bash
NODE_ENV=development
```

This will provide detailed logs of the authentication and API request/response cycle.

## Security Considerations

1. **Service Account Keys**: Never commit service account keys to version control
2. **Environment Variables**: Use environment variables for sensitive configuration
3. **API Scopes**: Only request the minimum required scopes
4. **Rate Limiting**: Implement rate limiting to prevent abuse

## Performance Optimization

1. **Caching**: Consider caching generated videos to avoid regeneration
2. **Async Processing**: Use the long-running operation pattern for better user experience
3. **Progress Tracking**: Implement progress callbacks for better UX
4. **Error Recovery**: Implement retry logic for transient failures
