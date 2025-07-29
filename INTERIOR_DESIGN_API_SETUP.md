# AI Interior Designer Setup Guide

This guide covers the complete setup for the AI Interior Designer module, including backend API, frontend component, database setup, and external API integrations.

## 🏗️ Architecture Overview

The AI Interior Designer module consists of:

1. **Backend API** (`app/api/ai-studio/interior-design/route.ts`)
2. **Frontend Component** (`app/components/ai-interior-designer.tsx`)
3. **Database Tables** (ai_jobs table)
4. **Storage Setup** (Supabase storage bucket)
5. **External API Integrations** (ApplyDesign.io & ReimaginehHome.ai)

## 🔧 Environment Variables Setup

Add the following environment variables to your `.env.local` file:

```env
# AI Interior Designer APIs
APPLYDESIGN_API_KEY=your_applydesign_api_key_here
REIMAGINEHOME_API_KEY=your_reimaginehome_api_key_here

# Existing Supabase variables (should already be set)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Existing OpenAI variable (should already be set)
OPENAI_API_KEY=your_openai_api_key
```

### Getting API Keys:

#### ApplyDesign.io (Premium Features)
1. Visit [ApplyDesign.io](https://applydesign.io)
2. Sign up for an account
3. Navigate to API settings
4. Generate your API key
5. Add to environment variables as `APPLYDESIGN_API_KEY`

**Note**: ApplyDesign.io uses `X-API-Key` header format, not Bearer tokens.

#### ReimaginehHome.ai (Standard Features)
1. Visit [ReimaginehHome.ai](https://reimaginehome.ai)
2. Sign up for an account
3. Go to API documentation/settings
4. Generate your API key
5. Add to environment variables as `REIMAGINEHOME_API_KEY`

## 🗄️ Database Setup

### 1. Create AI Jobs Table

Run the following SQL in your Supabase SQL Editor:

```sql
-- Execute this file: database/ai_jobs_table_setup.sql
-- It creates the ai_jobs table with proper RLS policies
```

### 2. Setup Storage Bucket

Run the following SQL in your Supabase SQL Editor:

```sql
-- Execute this file: database/setup_interior_design_storage.sql
-- It creates the interior-images storage bucket with proper policies
```

## 🚀 Component Integration

The AI Interior Designer is automatically integrated into the AI Studio when you select the "Interior" tool from the toolbar.

### Features Included:

- **🖼️ Image Upload**: Drag & drop or click to upload interior images
- **🎨 Style Selection**: Choose from multiple interior design styles
- **🏠 Room Types**: Specify room type for better AI results
- **⭐ Premium/Standard**: Toggle between ApplyDesign.io (premium) and ReimaginehHome.ai (standard)
- **🔄 Real-time Status**: Live job status updates with polling
- **📊 Progress Tracking**: Visual progress indicators for processing jobs
- **🎯 Multiple Actions**:
  - **Change Style**: Transform room style (Modern, Scandinavian, etc.)
  - **Remove Interior**: AI-powered furniture removal
  - **Add Interior**: Add furniture and decorations

## 🔌 API Endpoints

### POST `/api/ai-studio/interior-design`
Transform interior images using AI.

**Request Body:**
```json
{
  "imageUrl": "https://example.com/image.jpg",
  "action": "change_style|remove_interior|add_interior",
  "styleId": "modern", // optional, for change_style/add_interior
  "roomType": "living_room", // optional, for change_style/add_interior
  "usePremium": true, // true for ApplyDesign.io, false for ReimaginehHome.ai
  "batchId": "optional_batch_id" // optional, for grouping
}
```

**Response (Immediate):**
```json
{
  "success": true,
  "imageUrl": "https://result-image-url.jpg",
  "status": "completed"
}
```

**Response (Async Job):**
```json
{
  "success": true,
  "jobId": "job_12345",
  "status": "pending",
  "message": "Image processing started..."
}
```

### GET `/api/ai-studio/interior-design?endpoint=styles`
Fetch available styles and room types.

**Response:**
```json
{
  "styles": [
    { "id": "modern", "name": "Modern", "preview_url": null },
    { "id": "scandinavian", "name": "Scandinavian", "preview_url": null }
  ],
  "roomTypes": [
    { "id": "living_room", "name": "Living Room" },
    { "id": "bedroom", "name": "Bedroom" }
  ]
}
```

### GET `/api/ai-studio/interior-design?endpoint=status&jobId=<jobId>`
Check job processing status.

**Response:**
```json
{
  "status": "completed|pending|in_progress|failed",
  "imageUrl": "https://result-image-url.jpg", // if completed
  "error": "Error message" // if failed
}
```

### GET `/api/ai-studio/interior-design/test-applydesign`
Test ApplyDesign.io API connection and check account coin balance.

**Response:**
```json
{
  "success": true,
  "configured": true,
  "coinCount": 100,
  "message": "ApplyDesign.io API connection successful"
}
```

## 🔒 Security Features

- **Authentication**: JWT token-based authentication
- **Rate Limiting**: 10 requests per minute per user
- **RLS Policies**: Row-level security for user data
- **File Validation**: Image type and size validation
- **URL Validation**: Proper URL format checking

## 🎛️ Usage Flow

1. **Upload Images**: Users drag & drop or select interior images
2. **Select Action**: Choose transformation type (style change, removal, addition)
3. **Configure Options**: Select style, room type, and quality level
4. **Process**: AI processes the image using external APIs
5. **Monitor Progress**: Real-time status updates via polling
6. **View Results**: Before/after comparison with download option

## 🔧 Troubleshooting

### Common Issues:

1. **API Keys Not Working**
   - Verify keys are correctly set in `.env.local`
   - Check if APIs have usage limits or require payment
   - Ensure API endpoints are correct

2. **Storage Upload Errors**
   - Verify Supabase storage bucket exists
   - Check RLS policies are correctly set
   - Ensure file size is under 50MB limit

3. **Job Status Not Updating**
   - Check if polling is working (every 3 seconds)
   - Verify external API status endpoints
   - Check database connectivity

### Debug Mode:

To enable debug logging, check the browser console and server logs for detailed error messages.

## 📱 Mobile Responsiveness

The component is fully responsive and works on:
- Desktop computers
- Tablets
- Mobile phones

## 🎨 Customization

### Styling:
- Uses Tailwind CSS classes
- Fully customizable colors and layout
- Supports dark/light themes

### External APIs:
- Easy to add new AI service providers
- Modular API integration architecture
- Fallback to hardcoded styles if APIs fail

## 🧪 Testing API Connections

Before deploying or using the Interior Designer, test your API connections:

### Test ApplyDesign.io API
Use the built-in test endpoint to verify your API key:

```bash
curl https://your-domain.com/api/ai-studio/interior-design/test-applydesign \
  -H "Authorization: Bearer YOUR_USER_JWT_TOKEN"
```

**Expected Success Response:**
```json
{
  "success": true,
  "configured": true,
  "coinCount": 100,
  "message": "ApplyDesign.io API connection successful"
}
```

**Expected Error Response (if API key is invalid):**
```json
{
  "success": false,
  "error": "API test failed: 401",
  "configured": true,
  "details": "Invalid API key"
}
```

### Test ReimaginehHome.ai API
The system will automatically test this API when you make your first request. Monitor the browser console for any connection errors.

### Automated Setup Test
Run the included test script to verify your entire setup:

```bash
node test-interior-design-setup.js
```

This script will:
- ✅ Check all environment variables
- ✅ Verify file structure integrity  
- ✅ Test API connections
- ✅ Validate dependencies
- ✅ Provide detailed setup status

### Manual Testing Steps
1. Navigate to AI Studio in your application
2. Select "Interior" tool from toolbar
3. Upload a test interior image
4. Choose "Standard" quality (ReimaginehHome.ai)
5. Process the image and check for errors
6. Repeat with "Premium" quality (ApplyDesign.io)

## 🚀 Deployment Notes

1. Ensure all environment variables are set in production
2. Run database migrations before deployment
3. Test external API connectivity using test endpoints
4. Verify storage bucket permissions
5. Check rate limiting settings

## 📊 Monitoring

Monitor the following for production:
- API response times
- External API usage/costs
- Storage usage
- User activity in ai_jobs table
- Error rates and types

## 🔄 Maintenance

Regular maintenance tasks:
- Clean up old images using `cleanup_old_interior_images()` function
- Monitor API usage and costs
- Update style lists from external APIs
- Review and optimize database performance 