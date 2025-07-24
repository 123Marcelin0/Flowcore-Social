const fs = require('fs');

// Read the original file
let content = fs.readFileSync('app/api/posts/route.ts', 'utf8');

// Add debugging after the embedding generation comment
content = content.replace(
  '// Generate embedding for post content (and title if available)',
  '// Generate embedding for post content (and title if available)\n    console.log(\" EMBEDDING DEBUG - POST: Starting embedding generation process\")\n    console.log(\" EMBEDDING DEBUG - POST: postContent:\", postContent ? postContent.substring(0, 100) + \"...\" : \"null\")\n    console.log(\" EMBEDDING DEBUG - POST: title:\", title || \"null\")'
);

// Add debugging after embedding generation
content = content.replace(
  'const embeddingText = title ? ${title}\\n\\n : postContent',
  'const embeddingText = title ? ${title}\\n\\n : postContent\n        console.log(\" EMBEDDING DEBUG - POST: Combined text for embedding:\", embeddingText.substring(0, 200) + \"...\")\n        console.log(\" EMBEDDING DEBUG - POST: OPENAI_API_KEY exists:\", !!process.env.OPENAI_API_KEY)'
);

// Add debugging after successful embedding
content = content.replace(
  'embedding = await generateEmbedding(embeddingText)',
  'embedding = await generateEmbedding(embeddingText)\n        \n        if (embedding) {\n          console.log(\" EMBEDDING DEBUG - POST: Embedding generated successfully!\")\n          console.log(\" EMBEDDING DEBUG - POST: Embedding length:\", embedding.length)\n          console.log(\" EMBEDDING DEBUG - POST: First few values:\", embedding.slice(0, 5))\n        }'
);

// Write the updated file
fs.writeFileSync('app/api/posts/route.ts', content);
console.log(' Added embedding debugging!');
