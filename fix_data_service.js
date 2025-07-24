const fs = require('fs');

// Read the data service file
let content = fs.readFileSync('lib/data-service.ts', 'utf8');

// Find and replace the createPost method to use API route instead of direct Supabase
const createPostMethodRegex = /async createPost\(postData: any\): Promise<any> \{[\s\S]*?\/\/ Return the created post[\s\S]*?\n  \}/;

const newCreatePostMethod = \sync createPost(postData: any): Promise<any> {
    try {
      console.log(' CreatePost called with data:', postData);

      // Get authentication token
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      // Prepare the request body for the API route
      const requestBody = {
        platform: postData.platforms?.[0] || 'instagram', // API expects single platform
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

      console.log(' Sending request to /api/posts with:', requestBody);

      // Make request to our API route (which handles embedding generation server-side)
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

      console.log(' Post created successfully via API route:', result.post);
      return result.post;

    } catch (error) {
      console.error(' Error in createPost:', error);
      throw error;
    }
  }\;

// Replace the method
content = content.replace(createPostMethodRegex, newCreatePostMethod);

// Also remove the generatePostEmbedding function since we don't need it on client-side
content = content.replace(/\/\/ Helper function for optimized embedding generation[\s\S]*?^}/m, '// Embedding generation moved to server-side API routes');

fs.writeFileSync('lib/data-service.ts', content);
console.log(' Updated data service to use API route instead of direct embedding generation');
