# API Routes Documentation

## Overview
This document describes all API routes available in the Social Media Dashboard application.

**Total API Routes: 42 endpoints across 11 route groups**

## Authentication
All routes (except some public hashtag endpoints) require authentication via Bearer token:
```
Authorization: Bearer <your-auth-token>
```

## Route Groups

### 1. User Profiles (`/api/user-profiles`)
Manage user profile information and settings.

#### GET `/api/user-profiles`
- **Description**: Get authenticated user's profile
- **Auth**: Required
- **Response**: User profile object

#### POST `/api/user-profiles`
- **Description**: Create or update user profile
- **Auth**: Required
- **Body**: 
```json
{
  "email": "user@example.com",
  "full_name": "User Name",
  "bio": "User bio",
  "website": "https://example.com",
  "subscription_tier": "free|pro|enterprise",
  "onboarding_completed": true,
  "preferences": {}
}
```

#### PUT `/api/user-profiles`
- **Description**: Update user profile
- **Auth**: Required
- **Body**: Partial profile object

#### DELETE `/api/user-profiles`
- **Description**: Delete user profile
- **Auth**: Required

---

### 2. Social Accounts (`/api/social-accounts`)
Manage connected social media accounts.

#### GET `/api/social-accounts`
- **Description**: Get all social accounts for user
- **Auth**: Required
- **Query Parameters**:
  - `platform`: Filter by platform
  - `status`: Filter by status

#### POST `/api/social-accounts`
- **Description**: Connect new social account
- **Auth**: Required
- **Body**:
```json
{
  "platform": "instagram|facebook|twitter|linkedin|tiktok|youtube|pinterest",
  "username": "username",
  "display_name": "Display Name",
  "access_token": "token",
  "status": "connected|expired|error|disconnected"
}
```

#### PUT `/api/social-accounts`
- **Description**: Update social account
- **Auth**: Required
- **Body**: Account object with `id`

#### DELETE `/api/social-accounts?id=<account_id>`
- **Description**: Delete social account
- **Auth**: Required

---

### 3. Content Ideas (`/api/content-ideas`)
Manage content ideas and inspiration.

#### GET `/api/content-ideas`
- **Description**: Get all content ideas
- **Auth**: Required
- **Query Parameters**:
  - `status`: Filter by status
  - `priority`: Filter by priority
  - `category`: Filter by category
  - `is_saved`: Filter saved ideas

#### POST `/api/content-ideas`
- **Description**: Create new content idea
- **Auth**: Required
- **Body**:
```json
{
  "title": "Content Title",
  "description": "Content description",
  "content_type": "video|image|text|reel|story|carousel",
  "platforms": ["instagram", "facebook"],
  "tags": ["tag1", "tag2"],
  "category": "Category",
  "priority": "low|medium|high",
  "due_date": "2024-12-31"
}
```

#### PUT `/api/content-ideas`
- **Description**: Update content idea
- **Auth**: Required

#### DELETE `/api/content-ideas?id=<idea_id>`
- **Description**: Delete content idea
- **Auth**: Required

---

### 4. Calendar Events (`/api/calendar-events`)
Manage calendar events and scheduling.

#### GET `/api/calendar-events`
- **Description**: Get calendar events
- **Auth**: Required
- **Query Parameters**:
  - `start_date`: Filter events from date
  - `end_date`: Filter events to date
  - `category`: Filter by category

#### POST `/api/calendar-events`
- **Description**: Create calendar event
- **Auth**: Required
- **Body**:
```json
{
  "title": "Event Title",
  "description": "Event description",
  "start_date": "2024-12-25",
  "end_date": "2024-12-25",
  "start_time": "10:00",
  "end_time": "11:00",
  "category": "content",
  "color": "#FF0000",
  "all_day": false
}
```

#### PUT `/api/calendar-events`
- **Description**: Update calendar event
- **Auth**: Required

#### DELETE `/api/calendar-events?id=<event_id>`
- **Description**: Delete calendar event
- **Auth**: Required

---

### 5. Post Analytics (`/api/post-analytics`)
Track and analyze post performance.

#### GET `/api/post-analytics`
- **Description**: Get post analytics
- **Auth**: Required
- **Query Parameters**:
  - `post_id`: Filter by post
  - `platform`: Filter by platform
  - `start_date`: Filter from date
  - `end_date`: Filter to date

#### POST `/api/post-analytics`
- **Description**: Create analytics record
- **Auth**: Required
- **Body**:
```json
{
  "post_id": "post-uuid",
  "platform": "instagram",
  "impressions": 1000,
  "reach": 800,
  "engagement": 50,
  "likes": 45,
  "comments": 5,
  "shares": 2
}
```

#### PUT `/api/post-analytics`
- **Description**: Update analytics record
- **Auth**: Required

#### DELETE `/api/post-analytics?id=<analytics_id>`
- **Description**: Delete analytics record
- **Auth**: Required

---

### 6. Interactions (`/api/interactions`)
Manage social media interactions (comments, DMs, mentions).

#### GET `/api/interactions`
- **Description**: Get interactions
- **Auth**: Required
- **Query Parameters**:
  - `post_id`: Filter by post
  - `platform`: Filter by platform
  - `interaction_type`: Filter by type
  - `status`: Filter by status
  - `sentiment`: Filter by sentiment

#### POST `/api/interactions`
- **Description**: Create interaction record
- **Auth**: Required
- **Body**:
```json
{
  "platform": "instagram",
  "interaction_type": "comment|dm|mention|reply|like",
  "sender_name": "User Name",
  "sender_username": "username",
  "message": "Message content",
  "sentiment": "positive|neutral|negative",
  "priority": "low|medium|high"
}
```

#### PUT `/api/interactions`
- **Description**: Update interaction
- **Auth**: Required

#### DELETE `/api/interactions?id=<interaction_id>`
- **Description**: Delete interaction
- **Auth**: Required

---

### 7. Media Files (`/api/media-files`)
Manage media files and assets.

#### GET `/api/media-files`
- **Description**: Get media files
- **Auth**: Required
- **Query Parameters**:
  - `file_type`: Filter by type
  - `processing_status`: Filter by processing status
  - `optimization_status`: Filter by optimization status

#### POST `/api/media-files`
- **Description**: Create media file record
- **Auth**: Required
- **Body**:
```json
{
  "filename": "image.jpg",
  "original_filename": "image.jpg",
  "file_path": "/uploads/image.jpg",
  "storage_url": "https://storage.example.com/image.jpg",
  "file_size": 1024000,
  "mime_type": "image/jpeg",
  "file_type": "image|video|audio|document",
  "width": 1920,
  "height": 1080
}
```

#### PUT `/api/media-files`
- **Description**: Update media file
- **Auth**: Required

#### DELETE `/api/media-files?id=<file_id>`
- **Description**: Delete media file
- **Auth**: Required

---

### 8. Hashtags (`/api/hashtags`)
Manage hashtags and trending topics.

#### GET `/api/hashtags`
- **Description**: Get hashtags (public endpoint)
- **Auth**: Not required
- **Query Parameters**:
  - `search`: Search hashtags
  - `is_trending`: Filter trending hashtags
  - `category`: Filter by category
  - `sort_by`: Sort by usage_count, trending_score, last_used

#### POST `/api/hashtags`
- **Description**: Create hashtag
- **Auth**: Required
- **Body**:
```json
{
  "tag": "#example",
  "category": "general",
  "usage_count": 10,
  "trending_score": 5.5,
  "is_trending": false
}
```

#### PUT `/api/hashtags`
- **Description**: Update hashtag
- **Auth**: Required

#### DELETE `/api/hashtags?id=<hashtag_id>`
- **Description**: Delete hashtag
- **Auth**: Required

---

### 9. Publishing Queue (`/api/publishing-queue`)
Manage scheduled posts and publishing.

#### GET `/api/publishing-queue`
- **Description**: Get publishing queue
- **Auth**: Required
- **Query Parameters**:
  - `post_id`: Filter by post
  - `platform`: Filter by platform
  - `status`: Filter by status
  - `start_date`: Filter from date
  - `end_date`: Filter to date

#### POST `/api/publishing-queue`
- **Description**: Add to publishing queue
- **Auth**: Required
- **Body**:
```json
{
  "post_id": "post-uuid",
  "platform": "instagram",
  "scheduled_at": "2024-12-25T10:00:00Z",
  "priority": 5,
  "max_attempts": 3
}
```

#### PUT `/api/publishing-queue`
- **Description**: Update queue item
- **Auth**: Required

#### DELETE `/api/publishing-queue?id=<queue_id>`
- **Description**: Delete queue item
- **Auth**: Required

---

### 10. Posts (`/api/posts`)
Manage posts and content.

#### GET `/api/posts`
- **Description**: Get all posts
- **Auth**: Required

#### POST `/api/posts`
- **Description**: Create new post
- **Auth**: Required

#### PUT `/api/posts`
- **Description**: Update post
- **Auth**: Required

#### DELETE `/api/posts`
- **Description**: Delete post
- **Auth**: Required

---

### 11. Interior Design (`/api/interior-design`)
AI-powered interior design transformations.

#### POST `/api/interior-design`
- **Description**: Transform interior design
- **Auth**: Required
- **Body**: FormData with image and parameters

#### GET `/api/interior-design/test`
- **Description**: Test API authentication
- **Auth**: Required

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message"
}
```

## Success Responses

All endpoints return consistent success responses:

```json
{
  "success": true,
  "data": { /* response data */ }
}
```

## Testing

Use the provided test script to verify all endpoints:

```bash
node test-api-routes.js
```

## Rate Limiting

Some endpoints may have rate limiting implemented. Check response headers for rate limit information.

## Database Schema

All API routes interact with the following database tables:
- `user_profiles`
- `social_accounts`
- `content_ideas`
- `calendar_events`
- `post_analytics`
- `interactions`
- `media_files`
- `hashtags`
- `publishing_queue`
- `posts`

For detailed schema information, see the database schema files in the `/database` folder. 