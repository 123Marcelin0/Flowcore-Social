// Instagram Excel Processor
// Reads Excel file and extracts important columns for social media dashboard

const XLSX = require('xlsx');
const fs = require('fs');

function processInstagramExcel() {
  try {
    console.log('📖 Reading Instagram Excel file...');
    
    // Read the Excel file
    const workbook = XLSX.readFile('dataset_instagram-scraper_2025-07-24_15-01-56-173.xlsx');
    const sheetName = workbook.SheetNames[0]; // Use first sheet
    const worksheet = workbook.Sheets[sheetName];
    
    console.log(`📊 Found sheet: "${sheetName}"`);
    
    // Convert to JSON to see the structure
    const data = XLSX.utils.sheet_to_json(worksheet);
    console.log(`📈 Total rows: ${data.length}`);
    
    if (data.length === 0) {
      console.log('❌ No data found in Excel file');
      return;
    }
    
    // Show available columns
    console.log('📋 Available columns:');
    const columns = Object.keys(data[0]);
    columns.forEach((col, i) => {
      console.log(`   ${i + 1}. ${col}`);
    });
    
    // Extract and clean the important data
    console.log('\n🔄 Processing Instagram posts...');
    const processedPosts = [];
    let successCount = 0;
    let errorCount = 0;
    
    data.forEach((row, index) => {
      try {
        // Extract important fields with multiple possible column names
        const post = {
          // ID fields (your Excel has 'id')
          id: findValue(row, ['id', 'post_id', 'instagram_id', 'ID', 'Post ID']),
          
          // Content fields (your Excel has 'caption')
          caption: findValue(row, [
            'caption', 'description', 'content', 'text', 'post_text',
            'Caption', 'Description', 'Content', 'Text'
          ]),
          
          // Media fields (your Excel has 'type' and 'displayUrl')
          media_type: findValue(row, [
            'type', 'media_type', 'post_type', 'content_type',
            'Media Type', 'Type', 'Post Type'
          ]),
          
          media_url: findValue(row, [
            'displayUrl', 'media_url', 'image_url', 'video_url', 'url', 'link',
            'Media URL', 'Image URL', 'Video URL', 'URL'
          ]),
          
          // Additional images (your Excel has images/0, images/1, etc.)
          images: extractImagesFromRow(row),
          
          // Platform
          platform: findValue(row, [
            'platform', 'source', 'social_media', 'Platform', 'Source'
          ]) || 'instagram',
          
          // Hashtags (your Excel has hashtags/0, hashtags/1, etc.)
          hashtags: extractHashtagsFromRow(row),
          
          // Engagement metrics (updated for your Excel structure)
          likes_count: parseNumber(findValue(row, [
            'likesCount', 'likes_count', 'likes', 'like_count', 'total_likes',
            'Likes Count', 'Likes', 'Like Count'
          ])),
          
          comments_count: parseNumber(findValue(row, [
            'commentsCount', 'comments_count', 'comments', 'comment_count', 'total_comments',
            'Comments Count', 'Comments', 'Comment Count'
          ])),
          
          views_count: parseNumber(findValue(row, [
            'videoPlayCount', 'viewsCount', 'views_count', 'views', 'view_count', 'play_count', 'total_views',
            'Views Count', 'Views', 'View Count', 'Play Count'
          ])),
          
          shares_count: parseNumber(findValue(row, [
            'shares_count', 'shares', 'share_count', 'total_shares',
            'Shares Count', 'Shares', 'Share Count'
          ])),
          
          // Comments list
          comments_list: findValue(row, [
            'comments_list', 'comment_list', 'all_comments', 'comments_text',
            'Comments List', 'Comment List', 'All Comments'
          ]),
          
          // Date fields (your Excel has 'timestamp')
          created_at: findValue(row, [
            'timestamp', 'created_at', 'date', 'post_date', 'created_date',
            'Created At', 'Date', 'Post Date', 'Timestamp'
          ]),
          
          // User/Owner info (your Excel has 'ownerUsername')
          username: findValue(row, [
            'ownerUsername', 'username', 'user', 'owner', 'account', 'profile',
            'Username', 'User', 'Owner', 'Account'
          ]),
          
          // URL
          post_url: findValue(row, [
            'post_url', 'url', 'link', 'permalink', 'instagram_url',
            'Post URL', 'URL', 'Link', 'Permalink'
          ])
        };
        
        // Only include posts with basic required data
        if (post.caption || post.id) {
          processedPosts.push(post);
          successCount++;
          
          if (index < 5) { // Show first 5 for verification
            console.log(`✅ Post ${index + 1}: "${(post.caption || '').substring(0, 40)}..." - ${post.likes_count || 0} likes, ${post.views_count || 0} views, ${post.images?.length || 0} media`);
          }
        } else {
          errorCount++;
        }
        
      } catch (error) {
        console.log(`❌ Error processing row ${index + 1}: ${error.message}`);
        errorCount++;
      }
    });
    
    console.log(`\n📊 Processing complete:`);
    console.log(`✅ Successfully processed: ${successCount} posts`);
    console.log(`❌ Skipped (missing data): ${errorCount} posts`);
    
    if (processedPosts.length === 0) {
      console.log('❌ No valid posts found');
      return;
    }
    
    // Create cleaned Excel file
    console.log('\n📁 Creating cleaned Excel file...');
    const cleanedWorkbook = XLSX.utils.book_new();
    const cleanedWorksheet = XLSX.utils.json_to_sheet(processedPosts);
    
    // Set column widths
    const columnWidths = [
      {wch: 15}, // id
      {wch: 50}, // caption
      {wch: 12}, // media_type
      {wch: 30}, // media_url
      {wch: 10}, // platform
      {wch: 30}, // hashtags
      {wch: 8},  // likes_count
      {wch: 8},  // comments_count
      {wch: 8},  // views_count
      {wch: 8},  // shares_count
      {wch: 40}, // comments_list
      {wch: 15}, // created_at
      {wch: 15}, // username
      {wch: 30}  // post_url
    ];
    cleanedWorksheet['!cols'] = columnWidths;
    
    XLSX.utils.book_append_sheet(cleanedWorkbook, cleanedWorksheet, 'Instagram Posts');
    XLSX.writeFile(cleanedWorkbook, 'instagram-posts-cleaned.xlsx');
    
    // Convert to dashboard JSON format
    console.log('📁 Creating JSON file for bulk upload...');
    const dashboardPosts = processedPosts.map((post, index) => {
      // Parse hashtags if they're in string format
      let tags = [];
      if (typeof post.hashtags === 'string') {
        tags = post.hashtags.split(/[,;#\s]+/).filter(tag => tag.trim().length > 0);
      } else if (Array.isArray(post.hashtags)) {
        tags = post.hashtags;
      }
      
      // Combine main media URL with additional images FIRST
      let media_urls = [];
      if (post.media_url) {
        media_urls.push(post.media_url);
      }
      if (post.images && Array.isArray(post.images)) {
        media_urls = [...media_urls, ...post.images];
      }
      // Remove duplicates
      media_urls = [...new Set(media_urls)];
      
      // Determine media type
      let media_type = 'image';
      if (post.media_type) {
        const type = post.media_type.toLowerCase();
        if (type.includes('video') || type.includes('reel')) {
          media_type = 'video';
        } else if (type.includes('carousel') || type.includes('album') || type.includes('sidecar')) {
          media_type = 'carousel';
        }
      }
      
      // If we have multiple images, it's likely a carousel
      if (media_urls.length > 1) {
        media_type = 'carousel';
      }
      
      // If we have video play count > 0, it's definitely a video
      if (post.views_count > 0) {
        media_type = 'video';
      }
      
      // Parse date
      let published_at = new Date().toISOString();
      if (post.created_at) {
        try {
          published_at = new Date(post.created_at).toISOString();
        } catch (e) {
          // Keep default
        }
      }

      return {
        content: post.caption || `Instagram post ${index + 1}`,
        media_urls: media_urls,
        media_type: media_type,
        platforms: ['instagram'],
        status: 'published',
        published_at: published_at,
        tags: tags,
        likes: post.likes_count || 0,
        comments: post.comments_count || 0,
        shares: post.shares_count || 0,
        reach: 0,
        impressions: post.views_count || 0,
        metadata: {
          imported: true,
          import_date: new Date().toISOString(),
          instagram_id: post.id,
          username: post.username,
          post_url: post.post_url,
          comments_list: post.comments_list,
          original_data: post
        }
      };
    });
    
    fs.writeFileSync('instagram-posts-upload.json', JSON.stringify(dashboardPosts, null, 2));
    
    console.log('\n🎉 Files created successfully!');
    console.log('📊 Cleaned Excel: instagram-posts-cleaned.xlsx');
    console.log('📄 Upload JSON: instagram-posts-upload.json');
    console.log(`📈 Ready to upload ${dashboardPosts.length} posts to dashboard`);
    
    // Show sample data
    console.log('\n📋 Sample processed data:');
    processedPosts.slice(0, 3).forEach((post, i) => {
      console.log(`${i + 1}. ${post.caption?.substring(0, 40) || 'No caption'}...`);
      console.log(`   👍 ${post.likes_count || 0} likes, 💬 ${post.comments_count || 0} comments, 👁️ ${post.views_count || 0} views`);
      console.log(`   📸 ${post.images?.length || 0} media files, Type: ${post.media_type || 'image'}`);
      if (post.media_url) {
        console.log(`   🔗 Main URL: ${post.media_url.substring(0, 60)}...`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('ENOENT')) {
      console.log('💡 Make sure the Excel file exists in the current directory');
    } else if (error.message.includes('MODULE_NOT_FOUND')) {
      console.log('💡 Installing required dependency...');
      console.log('Run: npm install xlsx');
    }
  }
}

// Helper functions
function findValue(obj, possibleKeys) {
  for (const key of possibleKeys) {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
      return obj[key];
    }
  }
  return null;
}

function parseNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  const num = parseInt(value);
  return isNaN(num) ? 0 : num;
}

function extractHashtagsFromRow(row) {
  const hashtags = [];
  // Look for hashtags/0, hashtags/1, etc.
  for (let i = 0; i < 10; i++) {
    const hashtag = row[`hashtags/${i}`];
    if (hashtag && hashtag.trim()) {
      hashtags.push(hashtag.trim());
    }
  }
  return hashtags;
}

function extractImagesFromRow(row) {
  const images = [];
  
  // Look for images/0, images/1, etc.
  for (let i = 0; i < 15; i++) {
    const image = row[`images/${i}`];
    if (image && image.trim()) {
      images.push(image.trim());
    }
  }
  
  // Look for childPosts displayUrls (carousel posts)
  for (let i = 0; i < 20; i++) {
    const childDisplayUrl = row[`childPosts/${i}/displayUrl`];
    if (childDisplayUrl && childDisplayUrl.trim()) {
      images.push(childDisplayUrl.trim());
    }
  }
  
  return images;
}

// Run the processor
processInstagramExcel(); 