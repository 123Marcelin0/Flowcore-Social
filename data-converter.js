// Data Converter for Social Media Posts
// This script helps convert various data formats to the correct posts format

const fs = require('fs');

// Example function to convert CSV to posts JSON
function convertCSVToPosts(csvFilePath) {
    // This is a template - you'd need to adjust based on your CSV structure
    console.log('CSV conversion template - modify based on your data structure');
}

// Function to convert any JSON structure to posts format
function convertJSONToPosts(inputFile, outputFile) {
    try {
        const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
        
        // Template conversion - modify this based on your data structure
        let posts = [];
        
        // Example: If your data has different field names
        if (Array.isArray(data)) {
            posts = data.map((item, index) => {
                return {
                    // Map your fields to the expected format
                    caption: item.text || item.caption || item.content || `Post ${index + 1}`,
                    image_url: item.image || item.photo || item.media || "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500",
                    likes: parseInt(item.likes) || Math.floor(Math.random() * 200) + 50,
                    comments: parseInt(item.comments) || Math.floor(Math.random() * 50) + 5,
                    shares: parseInt(item.shares) || Math.floor(Math.random() * 20) + 2,
                    views: parseInt(item.views) || Math.floor(Math.random() * 1000) + 100,
                    platform: item.platform || "instagram",
                    hashtags: item.hashtags || item.tags || ["imported", "post"],
                    created_at: item.date || item.created_at || new Date().toISOString()
                };
            });
        }
        
        // Write the converted data
        fs.writeFileSync(outputFile, JSON.stringify(posts, null, 2));
        console.log(`✅ Converted ${posts.length} posts to ${outputFile}`);
        
    } catch (error) {
        console.error('❌ Error converting data:', error.message);
    }
}

// Function to generate test data
function generateTestPosts(count = 150) {
    const posts = [];
    const platforms = ['instagram', 'facebook', 'twitter', 'linkedin'];
    const hashtags = [
        ['business', 'success', 'growth'],
        ['lifestyle', 'daily', 'inspiration'],
        ['technology', 'innovation', 'future'],
        ['health', 'wellness', 'fitness'],
        ['travel', 'adventure', 'explore']
    ];
    
    for (let i = 1; i <= count; i++) {
        const randomPlatform = platforms[Math.floor(Math.random() * platforms.length)];
        const randomHashtags = hashtags[Math.floor(Math.random() * hashtags.length)];
        const randomDate = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
        
        posts.push({
            caption: `This is post number ${i}. Replace this with your actual post content. Add emojis, mentions, and make it engaging! 🚀`,
            image_url: `https://images.unsplash.com/photo-${1571019613454 + i}?w=500`,
            likes: Math.floor(Math.random() * 500) + 50,
            comments: Math.floor(Math.random() * 100) + 5,
            shares: Math.floor(Math.random() * 50) + 2,
            views: Math.floor(Math.random() * 2000) + 200,
            platform: randomPlatform,
            hashtags: randomHashtags,
            created_at: randomDate.toISOString()
        });
    }
    
    fs.writeFileSync('generated-posts.json', JSON.stringify(posts, null, 2));
    console.log(`✅ Generated ${count} test posts in 'generated-posts.json'`);
    console.log('📝 Edit this file to replace with your real post data');
}

// Command line usage
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
    case 'generate':
        const count = parseInt(args[1]) || 150;
        generateTestPosts(count);
        break;
    case 'convert':
        const inputFile = args[1];
        const outputFile = args[2] || 'converted-posts.json';
        if (!inputFile) {
            console.log('Usage: node data-converter.js convert <input-file> [output-file]');
            break;
        }
        convertJSONToPosts(inputFile, outputFile);
        break;
    default:
        console.log(`
🔄 Social Media Posts Data Converter

Commands:
  generate [count]           - Generate test posts (default: 150)
  convert <input> [output]   - Convert existing JSON to posts format

Examples:
  node data-converter.js generate 150
  node data-converter.js convert my-data.json posts.json

📋 Expected Post Format:
{
  "caption": "Post text content",
  "image_url": "https://example.com/image.jpg", 
  "likes": 100,
  "comments": 10,
  "shares": 5,
  "platform": "instagram",
  "hashtags": ["tag1", "tag2"],
  "created_at": "2024-01-01T10:00:00Z"
}
`);
} 