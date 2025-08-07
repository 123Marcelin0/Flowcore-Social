const fs = require('fs');
const path = require('path');

// Files and directories to remove to reduce lag
const filesToRemove = [
  '.next',
  'tsconfig.tsbuildinfo',
  'SDK_CRAWLER_STATISTICS_0.json',
  'instagram-posts-upload.json',
  'instagram-posts-cleaned.xlsx',
  'dataset_instagram-scraper_2025-07-24_15-01-56-173.xlsx',
  'generated-posts.json',
  'template-150-posts.json',
  'sample-posts.json'
];

console.log('🧹 Cleaning up files that cause Cursor lag...\n');

filesToRemove.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    try {
      if (fs.lstatSync(filePath).isDirectory()) {
        fs.rmSync(filePath, { recursive: true, force: true });
        console.log(`✅ Removed directory: ${file}`);
      } else {
        fs.unlinkSync(filePath);
        console.log(`✅ Removed file: ${file}`);
      }
    } catch (error) {
      console.log(`❌ Failed to remove ${file}: ${error.message}`);
    }
  } else {
    console.log(`⚠️  File not found: ${file}`);
  }
});

console.log('\n🎉 Cleanup complete! Cursor should be much faster now.');
console.log('\n💡 Tips to keep Cursor fast:');
console.log('   - Keep large data files in a separate data/ folder');
console.log('   - Use .gitignore to exclude build artifacts');
console.log('   - Regularly run this cleanup script');
console.log('   - Consider using .cursorignore for Cursor-specific exclusions');

