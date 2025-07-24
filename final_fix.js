const fs = require('fs');
let content = fs.readFileSync('lib/data-service.ts', 'utf8');

// Find the section that does direct Supabase insertion and replace it
const supabaseInsertSection = /console\.log\(' Inserting post into database with data keys:.*[\s\S]*?\/\/ Return the created post[\s\S]*?return data/;

const newApiSection = \console.log(' Making API request to /api/posts instead of direct Supabase insertion');
      
      // Get authentication token
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      // Prepare request body for our API route
      const requestBody = {
        platform: postData.platforms?.[0] || 'instagram',
        content: postData.content || '',
        title: postData.title || null,
        media_urls: postData.media_urls || [],
        media_type: postData.media_type || 'text',
        scheduled_publish_time: postData.scheduled_at || null,
        likes: postData.likes || 0,
        comments_count: postData.comments || 0,
        shares: postData.shares || 0,
        reach: postData.reach || 0,
        impressions: postData.impressions || 0
      };

      console.log(' Sending to API:', requestBody);

      // Call our API route (which handles embedding generation server-side)
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \\\Bearer \\\\\\
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(\\\API request failed: \\\\\\);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create post');
      }

      console.log(' Post created successfully via API route with embedding support');
      return result.post\;

// Replace the direct Supabase insertion
content = content.replace(supabaseInsertSection, newApiSection);

fs.writeFileSync('lib/data-service.ts', content);
console.log(' Replaced direct Supabase insertion with API route call');
