const fs = require('fs');

// Read the current openaiService.ts file
let content = fs.readFileSync('lib/openaiService.ts', 'utf8');

// Add debugging to see what environment variables are available
content = content.replace(
  '// Check if OpenAI API key is available\n    if (!process.env.OPENAI_API_KEY) {',
  '// Check if OpenAI API key is available\n    console.log(" OPENAI DEBUG: All env vars with OPENAI:", Object.keys(process.env).filter(key => key.includes("OPENAI")))\n    console.log(" OPENAI DEBUG: process.env.OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? "EXISTS" : "MISSING")\n    console.log(" OPENAI DEBUG: typeof process.env.OPENAI_API_KEY:", typeof process.env.OPENAI_API_KEY)\n    \n    if (!process.env.OPENAI_API_KEY) {'
);

// Write the updated file
fs.writeFileSync('lib/openaiService.ts', content);
console.log(' Added OpenAI environment debugging!');
