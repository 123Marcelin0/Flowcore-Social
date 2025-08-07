# Shotstack Video Merging Integration Setup Guide

This guide provides step-by-step instructions for setting up the Shotstack integration to merge multiple short videos into longer highlight reels.

## Overview

The Shotstack integration allows users to:
- Select multiple videos from their media library
- Automatically retrieve accurate video durations using FFprobe
- Merge videos with precise timeline calculations
- Add intro titles and cross-fade transitions
- Include background music with fade effects
- Download the final video in multiple formats
- Track job progress with real-time status updates

## Technical Implementation

This integration uses:
- **Official Shotstack SDK**: `shotstack-sdk` npm package for type-safe API interactions
- **FFmpeg/FFprobe**: For accurate video duration retrieval before timeline construction
- **Precise Timeline Building**: Dynamic start times based on actual video durations
- **Professional Transitions**: Cross-fade effects between video clips
- **Error Handling**: Graceful fallbacks and comprehensive error reporting

## Prerequisites

1. **Shotstack Account**: Sign up at [shotstack.io](https://shotstack.io) and get your API key
2. **Database Setup**: Ensure your Supabase database is properly configured
3. **Media Files**: Have videos uploaded to your media library

## Installation Steps

### 1. Environment Configuration

Add the following environment variable to your `.env.local` file:

```bash
# Shotstack API Configuration
SHOTSTACK_API_KEY=your-shotstack-api-key-here
```

### 2. Database Setup

Run the database migration to create the `shotstack_jobs` table:

```sql
-- Execute the contents of database/shotstack_jobs_setup.sql
-- This creates the table with proper RLS policies
```

Or run it directly in your Supabase SQL editor:

```bash
# Copy and paste the contents of database/shotstack_jobs_setup.sql
# into your Supabase SQL editor and execute
```

### 3. Component Integration

The integration includes these new components:

- **API Route**: `app/api/shotstack/render/route.ts` - Handles video merging requests
- **UI Component**: `app/components/ai-studio-video-merger.tsx` - User interface for video selection
- **Toolbar Integration**: Updated AI Studio toolbar with new "Edit" option

### 4. Features Included

#### Video Selection
- Browse existing videos from your media library
- Multi-select interface (up to 10 videos)
- Video thumbnail preview
- Duration display

#### Output Configuration
- **Formats**: MP4 (recommended), GIF, WebM
- **Resolutions**: Full HD (1080p), HD (720p), SD (480p)
- **Aspect Ratios**: 16:9 for standard, 9:16 for reels

#### Automatic Enhancements
- **Intro Title**: "Your Real Estate Highlight!" (2 seconds)
- **Transitions**: Cross-fade between all video clips
- **Background Music**: Light, happy background track
- **Video Length**: 5 seconds per input video + 2 second intro

#### Job Management
- Real-time status tracking
- Job history with download links
- Progress indicators
- Error handling

### 5. Usage Instructions

1. **Access the Tool**:
   - Go to AI Studio
   - Click the "Edit" tool in the toolbar

2. **Configure Output**:
   - Select desired format (MP4, GIF, WebM)
   - Choose resolution (Full HD recommended)

3. **Select Videos**:
   - Browse your video library
   - Click videos to select/deselect
   - Maximum 10 videos allowed

4. **Create Reel**:
   - Click "Create Reel" button
   - Monitor progress in real-time
   - Download when complete

### 6. API Endpoints

#### POST /api/shotstack/render
Creates a new video merging job.

**Request Body**:
```json
{
  "videoUrls": ["url1", "url2", "url3"],
  "outputFormat": "mp4",
  "outputResolution": "full-hd"
}
```

**Response**:
```json
{
  "success": true,
  "jobId": "shotstack-job-id",
  "dbJobId": "database-record-id",
  "message": "Video merging job submitted successfully"
}
```

#### GET /api/shotstack/render?jobId={id}
Checks the status of a video merging job.

**Response**:
```json
{
  "success": true,
  "jobId": "shotstack-job-id",
  "status": "done",
  "videoUrl": "https://cdn.shotstack.io/output/video.mp4",
  "progress": 100
}
```

### 7. Database Schema

The `shotstack_jobs` table tracks all video merging operations:

```sql
CREATE TABLE public.shotstack_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    shotstack_job_id VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(50) DEFAULT 'submitted',
    input_video_urls TEXT[] NOT NULL,
    output_format VARCHAR(10) DEFAULT 'mp4',
    output_resolution VARCHAR(20) DEFAULT 'full-hd',
    video_url TEXT,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 8. Error Handling

The integration includes comprehensive error handling for:
- Invalid video URLs
- API rate limits
- Network timeouts
- Shotstack service errors
- Database connection issues

### 9. Security Features

- **Authentication**: All endpoints require valid user authentication
- **RLS Policies**: Users can only access their own jobs
- **Input Validation**: URLs and parameters are validated
- **Rate Limiting**: Handled by Shotstack's built-in limits

### 10. Customization Options

#### Video Templates
Modify the Shotstack payload in the API route to:
- Change intro title text
- Adjust video clip duration
- Modify transition types
- Add custom styling

#### UI Customization
Update the video merger component to:
- Change video selection limits
- Modify output format options
- Customize progress indicators
- Add additional metadata fields

### 11. Troubleshooting

#### Common Issues

**"API key not configured"**
- Ensure `SHOTSTACK_API_KEY` is set in your environment variables
- Verify the API key is correct and active

**"Failed to load videos"**
- Check that videos exist in the `media_files` table
- Ensure videos have `processing_status = 'completed'`
- Verify user permissions and RLS policies

**"Job stuck in processing"**
- Check Shotstack dashboard for job status
- Verify input video URLs are publicly accessible
- Contact Shotstack support if jobs consistently fail

**"Database errors"**
- Ensure the `shotstack_jobs` table exists
- Check RLS policies are properly configured
- Verify user authentication is working

### 12. Performance Considerations

- **Video Limits**: Maximum 10 videos per merge job
- **File Sizes**: Larger videos take longer to process
- **Concurrent Jobs**: Shotstack has rate limits on concurrent jobs
- **Polling Frequency**: Status is checked every 3 seconds

### 13. Future Enhancements

Potential improvements to consider:
- Custom background music selection
- Advanced transition options
- Text overlay customization
- Watermark addition
- Batch processing multiple jobs
- Integration with social media posting

### 14. Support

For issues related to:
- **Shotstack API**: Contact Shotstack support
- **Database**: Check Supabase logs and documentation
- **UI Components**: Review component code and styling
- **Authentication**: Verify user session management

## Conclusion

The Shotstack integration provides a powerful video merging capability that enhances your social media dashboard with professional video editing features. Users can easily create highlight reels from their existing video content with minimal effort.