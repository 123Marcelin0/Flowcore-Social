// Instagram Data Converter for SDK Crawler Output
// Converts Instagram posts and reels to the correct format for bulk upload

const fs = require('fs');

// Function to convert Instagram post/reel data to dashboard format
function convertInstagramData(instagramData) {
  const posts = [];
  
  // Handle different possible data structures
  let itemsToProcess = [];
  
  console.log('📊 Data structure analysis:');
  console.log('- Is array:', Array.isArray(instagramData));
  console.log('- Data type:', typeof instagramData);
  console.log('- Has .data:', !!instagramData.data);
  console.log('- Has .items:', !!instagramData.items);
  console.log('- Has .posts:', !!instagramData.posts);
  
  if (Array.isArray(instagramData)) {
    itemsToProcess = instagramData;
    console.log(`✅ Found ${itemsToProcess.length} items in root array`);
  } else if (instagramData.data && Array.isArray(instagramData.data)) {
    itemsToProcess = instagramData.data;
    console.log(`✅ Found ${itemsToProcess.length} items in .data array`);
  } else if (instagramData.items && Array.isArray(instagramData.items)) {
    itemsToProcess = instagramData.items;
    console.log(`✅ Found ${itemsToProcess.length} items in .items array`);
  } else if (instagramData.posts && Array.isArray(instagramData.posts)) {
    itemsToProcess = instagramData.posts;
    console.log(`✅ Found ${itemsToProcess.length} items in .posts array`);
  } else if (instagramData.reels && Array.isArray(instagramData.reels)) {
    itemsToProcess = instagramData.reels;
    console.log(`✅ Found ${itemsToProcess.length} items in .reels array`);
  } else {
    console.log('❌ No recognizable array structure found');
    console.log('Available keys:', Object.keys(instagramData));
    return posts;
  }
  
  itemsToProcess.forEach((item, index) => {
    try {
      console.log(`🔄 Converting item ${index + 1}/${itemsToProcess.length}...`);
      const post = convertSingleInstagramItem(item, index);
      if (post && post.content) {
        posts.push(post);
        console.log(`✅ Successfully converted post: "${post.content.substring(0, 50)}..."`);
        console.log(`   📊 Likes: ${post.likes}, Comments: ${post.comments}, Media: ${post.media_urls.length} files`);
      } else {
        console.log(`❌ Skipped item ${index}: No content found`);
      }
    } catch (error) {
      console.log(`❌ Skipping item ${index}: ${error.message}`);
      if (index < 3) { // Show details for first few items to help debug
        console.log(`   Available fields:`, Object.keys(item));
      }
    }
  });
  
  return posts;
}

// Convert a single Instagram item (post or reel)
function convertSingleInstagramItem(item, index) {
  // Common Instagram API/scraper field mappings (updated for your specific format)
  const fieldMappings = {
    // Content text fields - your format uses 'caption'
    content: [
      'caption', 'text', 'description', 'caption_text', 
      'edge_media_to_caption.edges[0].node.text',
      'caption.text', 'node.edge_media_to_caption.edges[0].node.text'
    ],
    
    // Media fields - your format uses 'displayUrl' and 'images'
    media_url: [
      'displayUrl', 'display_url', 'media_url', 'video_url', 'image_url',
      'display_src', 'src', 'url', 'media_src',
      'thumbnail_url', 'display_resources[0].src'
    ],
    
    // Engagement fields - your format uses 'likesCount', 'commentsCount'  
    likes: [
      'likesCount', 'like_count', 'likes', 'likes_count', 'edge_liked_by.count',
      'edge_media_preview_like.count', 'like_and_view_counts_disabled'
    ],
    
    comments: [
      'commentsCount', 'comment_count', 'comments', 'comments_count', 
      'edge_media_to_comment.count', 'edge_media_preview_comment.count'
    ],
    
    views: [
      'viewsCount', 'view_count', 'views', 'video_view_count', 'play_count',
      'video_views', 'edge_media_video_view.count'
    ],
    
    // Metadata fields - your format uses 'id', 'shortCode', 'timestamp'
    id: ['id', 'pk', 'code', 'shortcode', 'shortCode', 'media_id'],
    username: ['username', 'user.username', 'owner.username'],
    timestamp: ['timestamp', 'taken_at', 'created_time', 'date', 'created_at']
  };
  
  // Helper function to get value from nested object path
  function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      if (key.includes('[') && key.includes(']')) {
        const arrayKey = key.substring(0, key.indexOf('['));
        const arrayIndex = parseInt(key.substring(key.indexOf('[') + 1, key.indexOf(']')));
        return current && current[arrayKey] && current[arrayKey][arrayIndex];
      }
      return current && current[key];
    }, obj);
  }
  
  // Helper function to find first available value from field mappings
  function findValue(item, fieldArray) {
    for (const field of fieldArray) {
      if (field.includes('.')) {
        const value = getNestedValue(item, field);
        if (value !== undefined && value !== null && value !== '') {
          return value;
        }
      } else {
        if (item[field] !== undefined && item[field] !== null && item[field] !== '') {
          return item[field];
        }
      }
    }
    return null;
  }
  
  // Extract content (required field)
  const content = findValue(item, fieldMappings.content);
  if (!content) {
    throw new Error('No content found');
  }
  
  // Extract media URL
  const media_url = findValue(item, fieldMappings.media_url);
  
  // Determine media type
  let media_type = 'image';
  if (item.is_video || item.media_type === 2 || item.product_type === 'clips' || media_url?.includes('.mp4')) {
    media_type = 'video';
  } else if (item.edge_sidecar_to_children || item.carousel_media || (item.media_type === 8)) {
    media_type = 'carousel';
  }
  
  // Extract engagement metrics
  const likes = parseInt(findValue(item, fieldMappings.likes)) || 0;
  const comments = parseInt(findValue(item, fieldMappings.comments)) || 0;
  const views = parseInt(findValue(item, fieldMappings.views)) || 0;
  
  // Extract timestamp
  const timestamp = findValue(item, fieldMappings.timestamp);
  let created_at = new Date().toISOString();
  if (timestamp) {
    try {
      // Handle Unix timestamp (common in Instagram API)
      if (typeof timestamp === 'number' && timestamp > 1000000000) {
        created_at = new Date(timestamp * 1000).toISOString();
      } else if (typeof timestamp === 'string') {
        created_at = new Date(timestamp).toISOString();
      }
    } catch (e) {
      // Keep default timestamp if parsing fails
    }
  }
  
  // Extract hashtags - your format already provides hashtags array
  let hashtags = [];
  if (item.hashtags && Array.isArray(item.hashtags)) {
    hashtags = item.hashtags;
  } else if (content) {
    // Fallback: extract from caption if hashtags array not available
    const hashtagMatches = content.match(/#\w+/g);
    if (hashtagMatches) {
      hashtags = hashtagMatches.map(tag => tag.substring(1)); // Remove #
    }
  }
  
  // Build media URLs array
  let media_urls = [];
  if (media_url) {
    media_urls = [media_url];
  }
  
  // Handle carousel/multiple media - your format uses 'images' array and 'type'
  if (item.images && Array.isArray(item.images) && item.images.length > 1) {
    media_urls = item.images.filter(Boolean);
    media_type = 'carousel';
  } else if (item.type === 'Sidecar' && item.images && item.images.length > 0) {
    media_urls = item.images.filter(Boolean);
    media_type = 'carousel';
  } else if (item.childPosts && Array.isArray(item.childPosts) && item.childPosts.length > 0) {
    media_urls = item.childPosts.map(child => child.displayUrl).filter(Boolean);
    media_type = 'carousel';
  } else if (item.edge_sidecar_to_children?.edges) {
    media_urls = item.edge_sidecar_to_children.edges.map(edge => 
      edge.node.display_url || edge.node.video_url || edge.node.display_src
    ).filter(Boolean);
    media_type = 'carousel';
  } else if (item.carousel_media) {
    media_urls = item.carousel_media.map(media => 
      media.image_versions2?.candidates?.[0]?.url || media.video_versions?.[0]?.url
    ).filter(Boolean);
    media_type = 'carousel';
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
    shares: 0, // Instagram doesn't typically expose share counts
    reach: 0,  // Would need separate insights API
    impressions: views, // Use views as impressions for video content
    metadata: {
      imported: true,
      import_date: new Date().toISOString(),
      instagram_id: findValue(item, fieldMappings.id),
      username: findValue(item, fieldMappings.username),
      original_data: item
    }
  };
}

// Function to process Instagram scraper output file
function processInstagramFile(inputFile, outputFile = 'instagram-posts-converted.json') {
  try {
    console.log(`📖 Reading Instagram data from: ${inputFile}`);
    const rawData = fs.readFileSync(inputFile, 'utf8');
    const instagramData = JSON.parse(rawData);
    
    console.log('🔄 Converting Instagram data...');
    const convertedPosts = convertInstagramData(instagramData);
    
    if (convertedPosts.length === 0) {
      console.log('❌ No valid posts found in the data');
      console.log('📋 Expected formats: posts array, reels array, or items with caption/content fields');
      return;
    }
    
    fs.writeFileSync(outputFile, JSON.stringify(convertedPosts, null, 2));
    
    console.log(`✅ Successfully converted ${convertedPosts.length} Instagram posts`);
    console.log(`📁 Output saved to: ${outputFile}`);
    console.log(`📊 Post types: ${getPostTypeStats(convertedPosts)}`);
    console.log(`💬 Total engagement: ${getTotalEngagement(convertedPosts)}`);
    
  } catch (error) {
    console.error('❌ Error processing Instagram data:', error.message);
    console.log('💡 Make sure your file contains Instagram posts/reels data in JSON format');
  }
}

// Helper functions for statistics
function getPostTypeStats(posts) {
  const types = posts.reduce((acc, post) => {
    acc[post.media_type] = (acc[post.media_type] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(types).map(([type, count]) => `${count} ${type}`).join(', ');
}

function getTotalEngagement(posts) {
  const total = posts.reduce((acc, post) => ({
    likes: acc.likes + post.likes,
    comments: acc.comments + post.comments
  }), { likes: 0, comments: 0 });
  return `${total.likes} likes, ${total.comments} comments`;
}

// Command line usage
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log(`
🔄 Instagram Data Converter for Social Media Dashboard

Usage:
  node convert-instagram-data.js <input-file> [output-file]

Examples:
  node convert-instagram-data.js instagram-data.json
  node convert-instagram-data.js posts.json converted-posts.json

📋 Supported Input Formats:
  - Instagram API responses
  - Instagram scraper outputs  
  - Arrays of posts/reels with fields like:
    * caption, text, description (content)
    * display_url, media_url, video_url (media)
    * like_count, comment_count, view_count (engagement)
    * taken_at, timestamp, created_time (dates)

📤 Output: Ready-to-upload JSON for bulk uploader
`);
} else {
  const inputFile = args[0];
  const outputFile = args[1] || 'instagram-posts-converted.json';
  
  if (!fs.existsSync(inputFile)) {
    console.error(`❌ File not found: ${inputFile}`);
    process.exit(1);
  }
  
  processInstagramFile(inputFile, outputFile);
} 