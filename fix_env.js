const fs = require('fs');

// Read next.config.mjs
let config = fs.readFileSync('next.config.mjs', 'utf8');

// Add environment variable configuration
config = config.replace(
  'export default nextConfig',
  'nextConfig.env = {\n  OPENAI_API_KEY: process.env.OPENAI_API_KEY,\n}\n\nexport default nextConfig'
);

fs.writeFileSync('next.config.mjs', config);
console.log(' Added OPENAI_API_KEY to Next.js config');
