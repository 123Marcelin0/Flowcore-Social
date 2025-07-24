const fs = require('fs');

// Read the data service file
let content = fs.readFileSync('lib/data-service.ts', 'utf8');

// Remove the generatePostEmbedding function - it shouldn't be on client side
content = content.replace(
  /async function generatePostEmbedding[\s\S]*?^}/m,
  '// Embedding generation moved to server-side API routes for security'
);

// Remove the import of generateEmbedding from openaiService
content = content.replace(
  /import.*generateEmbedding.*from.*openaiService.*/,
  '// generateEmbedding import removed - now handled server-side'
);

fs.writeFileSync('lib/data-service.ts', content);
console.log(' Removed client-side embedding generation');
