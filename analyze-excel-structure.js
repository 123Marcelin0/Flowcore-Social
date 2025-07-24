const XLSX = require('xlsx');

// Read and analyze Excel structure
console.log('📊 Analyzing Excel structure...');

const workbook = XLSX.readFile('dataset_instagram-scraper_2025-07-24_15-01-56-173.xlsx');
const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

if (data.length > 0) {
  const sampleRow = data[0];
  console.log('\n🔍 Columns containing "count", "view", "play", "url", "media":');
  
  Object.keys(sampleRow).forEach((key, index) => {
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes('count') || lowerKey.includes('view') || lowerKey.includes('play') || 
        lowerKey.includes('url') || lowerKey.includes('media') || lowerKey.includes('display')) {
      console.log(`⭐ ${index + 1}. ${key} = ${sampleRow[key]}`);
    }
  });
  
  console.log('\n📹 Looking for video-specific data:');
  Object.keys(sampleRow).forEach((key) => {
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes('video') || lowerKey.includes('reel') || lowerKey.includes('views')) {
      console.log(`🎬 ${key} = ${sampleRow[key]}`);
    }
  });
  
  // Sample a few rows to see data patterns
  console.log('\n📋 Sample data from first 3 posts:');
  data.slice(0, 3).forEach((row, i) => {
    console.log(`\nPost ${i + 1}:`);
    console.log(`  Caption: ${(row.caption || '').substring(0, 50)}...`);
    console.log(`  Type: ${row.type}`);
    console.log(`  Likes: ${row.likesCount}`);
    console.log(`  Comments: ${row.commentsCount}`);
    console.log(`  Display URL: ${row.displayUrl ? 'Yes' : 'No'}`);
    console.log(`  Images count: ${Object.keys(row).filter(k => k.startsWith('images/')).length}`);
    
    // Check for any view-related fields
    Object.keys(row).forEach(key => {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('view') || lowerKey.includes('play')) {
        console.log(`  📹 ${key}: ${row[key]}`);
      }
    });
  });
} 