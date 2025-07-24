// Direct Instagram Posts Converter
// Converts the Instagram posts array directly to dashboard format

const fs = require('fs');

function convertInstagramPost(post, index) {
  try {
    // Extract content (required)
    const content = post.caption || `Instagram post ${index + 1}`;
    
    // Extract media URLs
    let media_urls = [];
    if (post.displayUrl) {
      media_urls.push(post.displayUrl);
    }
    if (post.images && Array.isArray(post.images)) {
      media_urls = [...media_urls, ...post.images];
    }
    // Remove duplicates
    media_urls = [...new Set(media_urls)];
    
    // Determine media type
    let media_type = 'image';
    if (post.type === 'Sidecar' || (post.images && post.images.length > 1)) {
      media_type = 'carousel';
    } else if (post.type === 'Video' || post.displayUrl?.includes('.mp4')) {
      media_type = 'video';
    }
    
    // Extract engagement
    const likes = parseInt(post.likesCount) || 0;
    const comments = parseInt(post.commentsCount) || 0;
    
    // Extract hashtags
    const hashtags = post.hashtags || [];
    
    // Parse timestamp
    let created_at = new Date().toISOString();
    if (post.timestamp) {
      try {
        created_at = new Date(post.timestamp).toISOString();
      } catch (e) {
        // Keep default if parsing fails
      }
    }
    
    return {
      content: content,
      media_urls: media_urls,
      media_type: media_type,
      platforms: ['instagram'],
      status: 'published',
      published_at: created_at,
      tags: hashtags,
      likes: likes,
      comments: comments,
      shares: 0,
      reach: 0,
      impressions: 0,
      metadata: {
        imported: true,
        import_date: new Date().toISOString(),
        instagram_id: post.id,
        short_code: post.shortCode,
        post_url: post.url,
        original_data: post
      }
    };
  } catch (error) {
    console.error(`Error converting post ${index}:`, error.message);
    return null;
  }
}

// Main conversion function
function convertInstagramData() {
  try {
    console.log('📖 Reading Instagram posts data...');
    
    // Read the file with proper encoding
    const fileContent = fs.readFileSync('SDK_CRAWLER_STATISTICS_0.json', 'utf8');
    console.log(`📄 File size: ${fileContent.length} characters`);
    
    // Parse JSON
    const instagramPosts = JSON.parse(fileContent);
    console.log(`📊 Data type: ${typeof instagramPosts}, Is array: ${Array.isArray(instagramPosts)}`);
    
    if (!Array.isArray(instagramPosts)) {
      console.error('❌ Data is not an array!');
      return;
    }
    
    console.log(`🔄 Converting ${instagramPosts.length} Instagram posts...`);
    
    const convertedPosts = [];
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < instagramPosts.length; i++) {
      const post = instagramPosts[i];
      console.log(`\n🔄 Converting post ${i + 1}/${instagramPosts.length}...`);
      console.log(`   📝 Caption: "${(post.caption || '').substring(0, 50)}..."`);
      console.log(`   👍 Likes: ${post.likesCount || 0}, 💬 Comments: ${post.commentsCount || 0}`);
      console.log(`   🖼️  Media: ${post.images ? post.images.length : 1} file(s)`);
      
      const converted = convertInstagramPost(post, i);
      if (converted) {
        convertedPosts.push(converted);
        successCount++;
        console.log(`   ✅ Success!`);
      } else {
        errorCount++;
        console.log(`   ❌ Failed to convert`);
      }
    }
    
    // Save converted posts
    const outputFile = 'instagram-posts-converted.json';
    fs.writeFileSync(outputFile, JSON.stringify(convertedPosts, null, 2));
    
    console.log(`\n🎉 Conversion complete!`);
    console.log(`✅ Successfully converted: ${successCount} posts`);
    console.log(`❌ Failed to convert: ${errorCount} posts`);
    console.log(`📁 Output saved to: ${outputFile}`);
    console.log(`📊 Total engagement: ${convertedPosts.reduce((sum, p) => sum + p.likes + p.comments, 0)} interactions`);
    
    // Show first few converted posts for verification
    console.log(`\n📋 Sample converted posts:`);
    convertedPosts.slice(0, 3).forEach((post, i) => {
      console.log(`${i + 1}. "${post.content.substring(0, 40)}..." - ${post.likes} likes, ${post.comments} comments`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('JSON')) {
      console.log('💡 Make sure the file contains valid JSON data');
    }
  }
}

// Run the conversion
convertInstagramData(); 