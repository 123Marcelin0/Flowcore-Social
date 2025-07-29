# Content Generator Setup Guide

## Overview

The Content Generator allows users to create both images and videos using AI. It integrates with:
- **DALL-E 2/3** for image generation
- **Google Veo 2/3** for video generation

## 🔧 Environment Variables

Add these environment variables to your `.env.local` file:

### Required for Image Generation (DALL-E)
```bash
# OpenAI API Key (for DALL-E image generation)
OPENAI_API_KEY=sk-your-openai-api-key-here
```

### Required for Video Generation (Google Veo 2/3)
```bash
# Google Cloud Project ID
GOOGLE_CLOUD_PROJECT_ID=your-google-cloud-project-id

# Google Veo API Key (when available)
GOOGLE_VEO_API_KEY=your-google-veo-api-key-here
```

### Database (already configured)
```bash
# Supabase (for logging generations)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

## 🎥 Google Veo 2/3 Setup

### 1. Google Cloud Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the **Vertex AI API**
4. Create a service account and download the credentials JSON

### 2. Authentication
The API uses service account authentication. You have two options:

#### Option A: Service Account JSON
```bash
# Set the path to your service account JSON file
GOOGLE_APPLICATION_CREDENTIALS=path/to/your/service-account-key.json
```

#### Option B: API Key (when available)
```bash
# Direct API key (when Google makes this available)
GOOGLE_VEO_API_KEY=your-api-key-here
```

### 3. Vertex AI Setup
1. Navigate to **Vertex AI** in Google Cloud Console
2. Enable the **Generative AI Studio**
3. Ensure you have access to Veo models (currently in preview)

## 🖼️ DALL-E Setup

### 1. OpenAI Account
1. Go to [OpenAI Platform](https://platform.openai.com)
2. Create an account or sign in
3. Navigate to **API Keys**
4. Create a new API key

### 2. API Key Configuration
```bash
OPENAI_API_KEY=sk-your-openai-api-key-here
```

### 3. Billing
- DALL-E 3: ~$0.040 per image (1024×1024)
- DALL-E 2: ~$0.020 per image (1024×1024)

## 🗄️ Database Schema

The content generator uses the `content_generations` table:

```sql
CREATE TABLE content_generations (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  type VARCHAR(20) NOT NULL, -- 'image' or 'video'
  prompt TEXT NOT NULL,
  settings JSONB,
  result_url TEXT,
  status VARCHAR(20) DEFAULT 'completed',
  task_id TEXT, -- For async video generation
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for performance
CREATE INDEX idx_content_generations_user_type ON content_generations(user_id, type);
CREATE INDEX idx_content_generations_created_at ON content_generations(created_at DESC);
```

## 🚀 Features

### Image Generation
- **Models**: DALL-E 2, DALL-E 3
- **Sizes**: Square, Portrait, Landscape formats
- **Quality**: Standard, HD
- **Styles**: Vivid, Natural
- **Batch**: Up to 10 images (DALL-E 2 only)

### Video Generation
- **Models**: Veo 2, Veo 3 (when available)
- **Duration**: 3-30 seconds
- **Resolution**: 480p, 720p, 1080p
- **Camera Movements**: Static, Zoom, Pan, Crane
- **Styles**: Cinematic, Documentary, Artistic, Commercial

## 🎛️ Configuration Options

### Image Settings
```typescript
{
  model: 'dall-e-3' | 'dall-e-2',
  size: '1024x1024' | '1024x1792' | '1792x1024', // DALL-E 3
  size: '256x256' | '512x512' | '1024x1024',      // DALL-E 2
  quality: 'standard' | 'hd',
  style: 'vivid' | 'natural',
  count: 1-10 // DALL-E 2 only
}
```

### Video Settings
```typescript
{
  model: 'veo-2' | 'veo-3',
  duration: 3-30, // seconds
  fps: 24,
  resolution: '480p' | '720p' | '1080p',
  style: 'cinematic' | 'documentary' | 'artistic' | 'commercial',
  motionIntensity: 1-10,
  cameraMovement: 'static' | 'slow-zoom' | 'pan-left' | 'pan-right' | 'crane-up' | 'crane-down'
}
```

## 🔄 Fallback Behavior

If APIs are not configured or fail:
- **Images**: Uses placeholder images from Picsum
- **Videos**: Uses sample video URLs
- All functionality remains testable in development

## 🚨 Error Handling

The system handles:
- Invalid prompts
- API rate limits
- Network timeouts
- Invalid configurations
- Processing failures

## 💰 Cost Estimation

### DALL-E Pricing (approximate)
- DALL-E 3 Standard: $0.040 per image
- DALL-E 3 HD: $0.080 per image
- DALL-E 2: $0.020 per image

### Google Veo Pricing
- Pricing will be announced when the API becomes generally available
- Currently in preview/beta phase

## 🧪 Testing

### Development Mode
```bash
# Run without API keys for testing
npm run dev
```

The app will use simulation mode with placeholder content.

### Production Mode
```bash
# Ensure all environment variables are set
npm run build
npm start
```

## 📝 Usage Examples

### Image Generation
```typescript
// Generate a real estate image
const response = await fetch('/api/generate-image', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: "Luxurious modern living room with floor-to-ceiling windows",
    model: "dall-e-3",
    size: "1024x1024",
    quality: "hd",
    style: "vivid"
  })
})
```

### Video Generation
```typescript
// Generate a property tour video
const response = await fetch('/api/generate-video', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: "Cinematic drone shot of a modern house at sunset",
    model: "veo-2",
    duration: 10,
    resolution: "1080p",
    style: "cinematic",
    cameraMovement: "crane-up"
  })
})
```

## 🛠️ Troubleshooting

### Common Issues
1. **"API key not configured"**: Check environment variables
2. **"Invalid model"**: Ensure model names are correct
3. **"Generation failed"**: Check API quotas and billing
4. **"Video processing timeout"**: Videos can take 1-3 minutes

### Debug Mode
```bash
# Enable detailed logging
DEBUG=content-generator npm run dev
```

## 🔮 Future Enhancements

- **Image editing**: Inpainting, outpainting
- **Video editing**: Trimming, effects, transitions
- **Style transfer**: Apply artistic styles to images
- **Batch processing**: Queue management for multiple generations
- **Custom models**: Fine-tuned models for real estate 