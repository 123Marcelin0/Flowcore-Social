// Debug script to check Instagram posts data in the database
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client (you'll need to add your URL and anon key)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'your-supabase-url',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key'
);

async function debugPostsData() {
  try {
    console.log('🔍 Fetching Instagram posts from database...');
    
    // Fetch recent posts with all data
    const { data: posts, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('❌ Database error:', error);
      return;
    }

    if (!posts || posts.length === 0) {
      console.log('❌ No posts found in database');
      return;
    }

    console.log(`✅ Found ${posts.length} posts`);
    console.log('\n📊 Post data analysis:');

    posts.forEach((post, index) => {
      console.log(`\n--- Post ${index + 1} ---`);
      console.log(`ID: ${post.id}`);
      console.log(`Content: ${post.content?.substring(0, 50)}...`);
      console.log(`Media Type: ${post.media_type}`);
      console.log(`Media URLs Count: ${post.media_urls?.length || 0}`);
      
      if (post.media_urls && post.media_urls.length > 0) {
        console.log(`First Media URL: ${post.media_urls[0]?.substring(0, 80)}...`);
        if (post.media_urls.length > 1) {
          console.log(`Additional URLs: ${post.media_urls.length - 1} more`);
        }
      } else {
        console.log('❌ No media URLs found');
      }
      
      console.log(`Likes: ${post.likes}`);
      console.log(`Comments: ${post.comments || post.comments_count}`);
      console.log(`Impressions (Views): ${post.impressions}`);
      console.log(`Platforms: ${post.platforms?.join(', ')}`);
      console.log(`Status: ${post.status}`);
      console.log(`Created: ${post.created_at}`);
      
      if (post.metadata) {
        console.log(`Has Metadata: Yes (imported: ${post.metadata.imported})`);
        if (post.metadata.instagram_id) {
          console.log(`Instagram ID: ${post.metadata.instagram_id}`);
        }
        if (post.metadata.username) {
          console.log(`Username: ${post.metadata.username}`);
        }
      }
    });

    // Check for media URL patterns
    console.log('\n🔗 Media URL Analysis:');
    const allMediaUrls = posts.flatMap(post => post.media_urls || []);
    const instagramUrls = allMediaUrls.filter(url => 
      url.includes('instagram') || url.includes('scontent-') || url.includes('cdninstagram')
    );
    
    console.log(`Total media URLs: ${allMediaUrls.length}`);
    console.log(`Instagram CDN URLs: ${instagramUrls.length}`);
    console.log(`Other URLs: ${allMediaUrls.length - instagramUrls.length}`);
    
    if (instagramUrls.length > 0) {
      console.log('\nSample Instagram URLs:');
      instagramUrls.slice(0, 3).forEach((url, i) => {
        console.log(`${i + 1}. ${url.substring(0, 100)}...`);
      });
    }

    // Check for video posts specifically
    const videoPosts = posts.filter(post => post.media_type === 'video');
    console.log(`\n🎬 Video posts: ${videoPosts.length}`);
    videoPosts.forEach((post, i) => {
      console.log(`Video ${i + 1}: ${post.impressions} views`);
    });

  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

// Check if we're running this directly
if (require.main === module) {
  debugPostsData();
}

module.exports = { debugPostsData }; 