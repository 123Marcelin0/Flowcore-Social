# 📊 Meta API Integration Setup Guide

This guide will help you set up real-time insights fetching from Instagram and Facebook to power the AI learning feedback loop.

## 🚀 Overview

The AI Insights Feedback Loop system automatically:
- Fetches real-time metrics from your Instagram/Facebook posts
- Analyzes content patterns (emojis, hashtags, posting times)
- Learns what performs best for your audience
- Adapts future caption suggestions based on performance data

## 📋 What You Need to Provide

### 1. **Meta Developer Account Setup**

#### Step 1: Create Meta Developer Account
1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Click "Get Started" and log in with your Facebook account
3. Complete developer verification (may require phone number)

#### Step 2: Create a New App
1. Click "Create App" → Choose "Business" type
2. App Name: `Your Business Name - Social Dashboard`
3. App Contact Email: Your business email
4. Business Account: Select your business account

### 2. **Instagram Integration Setup**

#### Step 3: Instagram Graph API Setup
**⚠️ IMPORTANT: You need a Business or Creator Instagram account linked to a Facebook Page**

1. **Convert to Business/Creator Account** (if not already):
   - Go to Instagram app → Settings → Account → Switch to Professional Account
   - Choose "Business" or "Creator" account type
   - Link to your Facebook Page (required for Graph API access)

2. **In your Meta app dashboard, go to "Add Product"**
3. **Find "Instagram Graph API" and click "Set Up"**
4. **Connect your Instagram Business Account**:
   - Go to "Instagram Graph API" → "Basic Display" → "Instagram Test Users"
   - Add your Instagram Business account username
   - Accept the invitation in Instagram app

#### Step 4: Get Instagram Graph API Credentials
You'll need to provide these to the system:

```javascript
// Instagram Graph API Credentials Needed:
{
  "meta_app_id": "YOUR_META_APP_ID",
  "meta_app_secret": "YOUR_META_APP_SECRET", 
  "instagram_redirect_uri": "https://yourdomain.com/auth/instagram/callback",
  "instagram_user_access_token": "USER_ACCESS_TOKEN_FROM_AUTH_FLOW",
  "instagram_business_account_id": "YOUR_INSTAGRAM_BUSINESS_ACCOUNT_ID"
}
```

**Where to find them:**
- **Meta App ID & Secret**: Meta App Dashboard → "Settings" → "Basic" (used for both Instagram and Facebook)
- **Redirect URI**: Set in "Instagram Graph API" → "Basic Display" → "OAuth Redirect URIs"
- **Business Account ID**: Use Graph API Explorer or our auth flow to get your Instagram Business Account ID

### 3. **Facebook Integration Setup**

#### Step 5: Facebook Pages API
1. In your Meta app, go to "Add Product"
2. Find "Facebook Login" and click "Set Up"
3. Add "Pages API" product as well

#### Step 6: Get Facebook Credentials
You'll need:

```javascript
// Facebook Credentials Needed:
{
  "meta_app_id": "YOUR_META_APP_ID",
  "meta_app_secret": "YOUR_META_APP_SECRET",
  "facebook_page_id": "YOUR_FACEBOOK_PAGE_ID",
  "facebook_page_access_token": "LONG_LIVED_PAGE_ACCESS_TOKEN"
}
```

**Where to find them:**
- **Meta App ID & Secret**: Meta App Dashboard → "Settings" → "Basic" (same as Instagram)
- **Page ID**: Go to your Facebook Page → "About" → "Page ID"
- **Page Access Token**: Use Facebook Graph API Explorer or our auth flow

### 4. **Required Permissions**

#### Instagram Graph API Permissions Needed:
- `instagram_basic` - Basic profile info and media access
- `instagram_manage_insights` - Access to post insights and metrics
- `pages_show_list` - List pages user manages (required for Instagram Business accounts)
- `pages_read_engagement` - Read page insights (required for Instagram Business accounts)

#### Facebook Permissions Needed:
- `pages_show_list` - List pages user manages
- `pages_read_engagement` - Read page insights
- `pages_read_user_content` - Read page posts

### 5. **App Review Requirements**

For production use, you'll need Meta app review for these permissions:
- Instagram: `instagram_basic`, `instagram_manage_insights`
- Facebook: `pages_show_list`, `pages_read_engagement`

**App Review Tips:**
- Clearly explain you're building a social media management tool with analytics
- Show screenshots of your dashboard with insights and metrics
- Provide detailed use case descriptions for performance tracking
- Emphasize that you're only accessing data from Business/Creator accounts
- Usually takes 7-14 days for approval

## 🔧 Technical Integration

### Step 7: Environment Variables
Add these to your `.env.local` file:

```bash
# Meta API Credentials (used for both Instagram Graph API and Facebook)
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret

# Instagram Graph API (uses same Meta app credentials)
INSTAGRAM_REDIRECT_URI=https://yourdomain.com/auth/instagram/callback

# Facebook (uses same Meta app credentials)
FACEBOOK_APP_ID=your_meta_app_id
FACEBOOK_APP_SECRET=your_meta_app_secret

# Webhook Settings (Optional - for real-time updates)
META_WEBHOOK_VERIFY_TOKEN=your_random_webhook_token
META_WEBHOOK_SECRET=your_webhook_secret
```

**Note:** The system uses `META_APP_ID` and `META_APP_SECRET` for both Instagram and Facebook integrations. This consolidation:
- Reduces credential rotation overhead
- Simplifies environment management
- Ensures consistency across Meta platform integrations
- Eliminates duplicate credential storage

### Step 8: OAuth Flow Implementation
The system needs to implement OAuth flows for both platforms:

#### Instagram Graph API Auth Flow:
```
1. Redirect user to: https://www.facebook.com/v18.0/dialog/oauth?client_id={app-id}&redirect_uri={redirect-uri}&scope=instagram_basic,instagram_manage_insights,pages_show_list,pages_read_engagement&response_type=code
2. Handle callback with authorization code
3. Exchange code for user access token
4. Get Instagram Business Account ID: GET https://graph.facebook.com/v18.0/me/accounts?fields=instagram_business_account&access_token={user-access-token}
5. Store access token and business account ID in social_accounts table
```

#### Facebook Auth Flow:
```
1. Redirect user to: https://www.facebook.com/v18.0/dialog/oauth?client_id={app-id}&redirect_uri={redirect-uri}&scope=pages_show_list,pages_read_engagement&response_type=code
2. Handle callback with authorization code  
3. Exchange code for user access token
4. Get page access token for user's pages
5. Store page access token in social_accounts table
```

## 📊 API Endpoints Reference

### Instagram Graph API
- **Business Account Info**: `GET https://graph.facebook.com/v18.0/{instagram-business-account-id}?fields=id,username,media_count&access_token={access-token}`
- **User Media**: `GET https://graph.facebook.com/v18.0/{instagram-business-account-id}/media?fields=id,media_type,media_url,caption,timestamp,like_count,comments_count&access_token={access-token}`
- **Media Insights**: `GET https://graph.facebook.com/v18.0/{media-id}/insights?metric=impressions,reach,engagement,saved&access_token={access-token}`
- **Story Insights**: `GET https://graph.facebook.com/v18.0/{story-id}/insights?metric=exits,impressions,reach,replies&access_token={access-token}`

### Facebook Graph API  
- **Page Posts**: `GET https://graph.facebook.com/v18.0/{page-id}/posts?fields=id,message,created_time,likes.summary(true),comments.summary(true)&access_token={access-token}`
- **Post Insights**: `GET https://graph.facebook.com/v18.0/{post-id}/insights?metric=post_impressions,post_engaged_users&access_token={access-token}`

## 🔄 Automated Sync Setup

### Step 9: Configure Sync Schedule
1. The system will automatically sync every 6 hours
2. You can trigger manual syncs via the dashboard
3. Failed syncs will be retried with exponential backoff

### Step 10: Pattern Detection
Once data starts flowing, the AI will:
- Analyze your top-performing posts
- Detect patterns in content, timing, hashtags
- Update suggestion algorithms automatically
- Improve recommendations over time

## 🛡️ Security Best Practices

### Token Management:
- Store access tokens encrypted in database
- Implement token refresh logic for long-lived tokens
- Monitor for expired/invalid tokens
- Use HTTPS for all API communications

### Rate Limiting:
- Instagram: 200 requests per hour per user
- Facebook: Variable based on app usage
- Implement exponential backoff for rate limit errors
- Cache responses where appropriate

### Data Privacy:
- Only fetch necessary data for analytics
- Respect user privacy settings
- Implement data retention policies
- Allow users to disconnect accounts anytime

## 🧪 Testing Your Integration

### Step 11: Test with Sample Data
1. Connect your Instagram/Facebook accounts
2. Publish a test post
3. Wait 2-4 hours for metrics to populate
4. Trigger a manual sync via: `POST /api/sync-insights`
5. Check the insights in your dashboard

### Step 12: Verify Pattern Detection
1. After 5-10 posts with varied content
2. Check the performance patterns table
3. Review AI suggestions for improved recommendations
4. Monitor engagement improvements over time

## 📈 What You'll Get

### Real-Time Insights:
- **Performance Metrics**: Likes, comments, shares, reach, impressions
- **Engagement Analysis**: Rate calculations and comparisons
- **Content Analysis**: Emoji usage, hashtag effectiveness, optimal posting times

### AI Learning:
- **Pattern Recognition**: What content performs best for YOUR audience
- **Smart Suggestions**: Future captions optimized based on your data
- **Continuous Improvement**: Algorithm adapts as it learns your style

### Performance Categories:
- **High Performers**: 6%+ engagement rate
- **Medium Performers**: 3-6% engagement rate  
- **Low Performers**: <3% engagement rate

## 🚀 Ready to Deploy?

Once you have all credentials:

1. **Add credentials to environment variables**
2. **Run database migration**: `npm run db:migrate`
3. **Connect your social accounts** via the dashboard
4. **Publish your first tracked post**
5. **Watch the AI learn and improve!**

---

## 🆘 Need Help?

### Common Issues:
- **"Invalid Access Token"**: Token may have expired, re-authenticate
- **"Rate Limited"**: Wait and try again, or contact Meta for limit increase
- **"Permission Denied"**: Ensure all required permissions are granted
- **"No Data Returned"**: Check if posts are public and recent enough

### Support Resources:
- [Meta Developer Documentation](https://developers.facebook.com/docs/)
- [Instagram Graph API](https://developers.facebook.com/docs/instagram-api)
- [Instagram Business Account Setup](https://developers.facebook.com/docs/instagram-api/getting-started)
- [Facebook Graph API](https://developers.facebook.com/docs/graph-api)

**Ready to supercharge your social media with AI-powered insights? 🚀** 