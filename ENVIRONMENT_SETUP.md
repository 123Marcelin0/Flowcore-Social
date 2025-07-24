# Environment Setup

This document outlines the environment setup required for the social media dashboard.

## Required Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database Configuration
DATABASE_URL=your-database-url
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-key

# API Keys
REIMAGINE_HOME_API_KEY=your-reimagine-home-api-key

# Other Configuration
NODE_ENV=development
PORT=3000
```

## API Keys

### Reimagine Home API
1. Sign up for an account at [Reimagine Home](https://reimaginehome.ai)
2. Generate an API key from your dashboard
3. Add the API key to your `.env` file as `REIMAGINE_HOME_API_KEY`

## Development Setup

1. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

2. Start the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Production Setup

For production deployment, ensure all environment variables are properly configured in your hosting platform's environment settings. 