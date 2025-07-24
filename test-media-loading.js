const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client 
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testMediaLoading() {
  try {
    console.log('🔍 Testing media loading for Instagram posts...');
    
    // Fetch posts with media URLs
    const { data: posts, error } = await supabase
      .from('posts')
      .select('id, content, media_urls, media_type, likes, comments, impressions')
      .eq('status', 'published')
      .contains('platforms', ['instagram'])
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Database error:', error);
      return;
    }

    if (!posts || posts.length === 0) {
      console.log('❌ No Instagram posts found');
      return;
    }

    console.log(`✅ Found ${posts.length} Instagram posts to test`);
    
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      console.log(`\n--- Post ${i + 1} ---`);
      console.log(`Content: ${post.content?.substring(0, 40)}...`);
      console.log(`Media Type: ${post.media_type}`);
      console.log(`Media URLs: ${post.media_urls?.length || 0}`);
      console.log(`Engagement: ${post.likes} likes, ${post.comments} comments, ${post.impressions} views`);
      
      if (post.media_urls && post.media_urls.length > 0) {
        post.media_urls.forEach((url, urlIndex) => {
          console.log(`  URL ${urlIndex + 1}: ${url?.substring(0, 80)}...`);
          
          // Check if it's an Instagram URL that needs proxy
          if (url && (url.includes('instagram') || url.includes('scontent-') || url.includes('cdninstagram'))) {
            console.log(`    ⚠️  Needs proxy: Instagram CDN URL`);
            console.log(`    🔄 Proxy URL: /api/media-proxy?url=${encodeURIComponent(url).substring(0, 60)}...`);
          } else if (url && url.includes('placeholder')) {
            console.log(`    ℹ️  Placeholder URL`);
          } else if (url) {
            console.log(`    ✅ Direct URL (likely accessible)`);
          } else {
            console.log(`    ❌ Empty/null URL`);
          }
        });
      } else {
        console.log(`  ❌ No media URLs found`);
      }
    }

    // Test media proxy endpoint availability
    console.log('\n🧪 Testing media proxy endpoint...');
    try {
      const testUrl = 'https://scontent-fra3-2.cdninstagram.com/test';
      const proxyUrl = `/api/media-proxy?url=${encodeURIComponent(testUrl)}`;
      console.log(`✅ Proxy endpoint would be: ${proxyUrl}`);
    } catch (proxyError) {
      console.error('❌ Proxy test failed:', proxyError);
    }

    // Summary statistics
    const totalMediaUrls = posts.reduce((total, post) => total + (post.media_urls?.length || 0), 0);
    const instagramUrls = posts.reduce((total, post) => {
      if (!post.media_urls) return total;
      return total + post.media_urls.filter(url => 
        url && (url.includes('instagram') || url.includes('scontent-') || url.includes('cdninstagram'))
      ).length;
    }, 0);

    console.log('\n📊 Summary:');
    console.log(`Total posts: ${posts.length}`);
    console.log(`Total media URLs: ${totalMediaUrls}`);
    console.log(`Instagram CDN URLs needing proxy: ${instagramUrls}`);
    console.log(`Regular URLs: ${totalMediaUrls - instagramUrls}`);

  } catch (error) {
    console.error('❌ Test script error:', error);
  }
}

// Run the test
if (require.main === module) {
  testMediaLoading();
}

module.exports = { testMediaLoading }; 