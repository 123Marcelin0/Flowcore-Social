const fs = require('fs');

// Read the current file
let content = fs.readFileSync('app/api/posts/route.ts', 'utf8');

// Add debugging for OpenAI API key check
content = content.replace(
  'console.log(" EMBEDDING DEBUG - POST: Combined text for embedding:", embeddingText.substring(0, 200) + "...")',
  'console.log(" EMBEDDING DEBUG - POST: Combined text for embedding:", embeddingText.substring(0, 200) + "...")\n        console.log(" EMBEDDING DEBUG - POST: OPENAI_API_KEY exists:", !!process.env.OPENAI_API_KEY)'
);

// Add debugging before database insertion
content = content.replace(
  'embedding: embedding,',
  'embedding: embedding,\n    }\n\n    console.log(" EMBEDDING DEBUG - POST: Embedding being added to postData:", embedding ? "YES (length: " + embedding.length + ")" : "NO/NULL")'
);

// Add debugging after database insertion
content = content.replace(
  'if (error) {\n      console.error("Error creating post:", error)',
  'if (error) {\n      console.error(" DATABASE ERROR - POST:", error)'
);

content = content.replace(
  'return NextResponse.json({\n      success: true,\n      post: newPost,\n      message: "Post created successfully"\n    }, { status: 201 })',
  'console.log(" EMBEDDING DEBUG - POST: Post created successfully. Checking returned data...")\n    console.log(" EMBEDDING DEBUG - POST: Returned post embedding:", newPost?.embedding ? "EXISTS (length: " + newPost.embedding.length + ")" : "MISSING/NULL")\n\n    return NextResponse.json({\n      success: true,\n      post: newPost,\n      message: "Post created successfully"\n    }, { status: 201 })'
);

// Write the updated file
fs.writeFileSync('app/api/posts/route.ts', content);
console.log(' Added additional embedding debugging!');
