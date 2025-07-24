# Bulk Post Upload Guide

## Overview
The bulk upload functionality allows you to import large amounts of social media posts from JSON files directly into your dashboard. This is perfect for importing historical posts or migrating data from other platforms.

## How to Use

### 1. Access the Bulk Upload Feature
- Go to your dashboard
- Click the **"📁 Bulk Upload"** button next to the "Neuer Post" button
- This will open the bulk upload dialog

### 2. Prepare Your JSON File
Your JSON file should contain an array of posts or an object with a "posts" array. Each post can have the following fields:

#### Supported Content Fields (one of these is required):
- `caption` - Post caption text
- `content` - Post content text  
- `description` - Post description
- `text` - Post text

#### Supported Media Fields:
- `image_url` / `image` - URL to image
- `video_url` / `video` - URL to video
- `media_url` - General media URL
- `media_urls` - Array of media URLs (for carousels)

#### Supported Engagement Fields:
- `likes` / `likes_count` - Number of likes
- `comments` / `comments_count` - Number of comments  
- `shares` / `shares_count` - Number of shares
- `views` / `views_count` - Number of views
- `reach` - Post reach
- `impressions` - Post impressions

#### Other Supported Fields:
- `platform` / `platforms` - Platform(s) where post was published
- `hashtags` / `tags` - Array of hashtags/tags
- `title` - Post title
- `created_at` / `published_at` - Publication date
- `status` - Post status (defaults to "published")

### 3. Upload Process
1. Select your JSON file (max 10MB)
2. Preview the first 3 posts to verify format
3. Click "Upload Posts" 
4. Wait for the upload to complete
5. Posts will appear in your dashboard automatically

### 4. Example JSON Format

#### Simple Array Format:
```json
[
  {
    "caption": "Great workout today! 💪",
    "image_url": "https://example.com/image.jpg",
    "likes": 156,
    "comments": 23,
    "platform": "instagram",
    "hashtags": ["fitness", "workout"]
  }
]
```

#### Object Format:
```json
{
  "posts": [
    {
      "content": "New product announcement!",
      "media_url": "https://example.com/video.mp4", 
      "likes_count": 89,
      "platforms": ["linkedin", "twitter"]
    }
  ]
}
```

## Limitations
- Maximum 200 posts per upload
- Maximum file size: 10MB
- JSON format only
- All posts will be imported under your current user account
- Posts are marked as "published" by default (stored as memory, not for future posting)

## File Location
A sample JSON file (`sample-posts.json`) is included in the project root with examples of different field formats.

## Troubleshooting

### Common Issues:
1. **"Invalid JSON"** - Check that your file is valid JSON format
2. **"Posts must be an array"** - Ensure your data is in array format or has a "posts" array
3. **"Post missing content"** - Each post needs at least one content field (caption, content, text, or description)
4. **Upload timeout** - Try uploading fewer posts at once (under 100)

### Field Mapping:
The system automatically maps various field names to the database schema:
- Content: `caption` → `content` → `description` → `text`
- Likes: `likes` → `likes_count`
- Comments: `comments` → `comments_count`
- Media: `image_url` → `video_url` → `media_url` → `media_urls`

## API Details
- **Endpoint**: `/api/bulk-upload-posts`
- **Method**: POST
- **Authentication**: Required (Bearer token)
- **Batch Processing**: Uploads in batches of 50 posts
- **Response**: Returns success/failure status and count of imported posts

## Notes
- This is a temporary feature for data migration
- Uploaded posts will immediately appear in your dashboard
- The feature preserves original engagement metrics
- Posts are stored with metadata indicating they were imported 