# Quick Start Guide

## 🚀 Getting Started

Your Social Media Dashboard is now configured to work in **Demo Mode** so you can see it in action immediately!

### 1. Start the Application

```bash
npm run dev
```

The app will now load at `http://localhost:3000` with demo data.

### 2. Demo Mode Features

- ✅ Pre-loaded with sample posts, events, and interactions
- ✅ All dashboard features work with demo data  
- ✅ You can create new posts (they won't be saved)
- ✅ Interior design AI integration is fully functional

### 3. Set Up Supabase (Optional)

To use real data persistence, create a `.env.local` file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Interior Design API (already configured)
REIMAGINE_HOME_API_KEY=686d8281f0bdbfed5cb8f049
REIMAGINE_HOME_BASE_URL=https://api.reimaginehome.ai/api
```

### 4. Test Interior Design API

```bash
# Test API connection
curl http://localhost:3000/api/interior-design/test

# Test image upload
curl -X POST http://localhost:3000/api/interior-design/test \
  -H "Content-Type: application/json" \
  -d '{"testType": "upload"}'
```

## 🎯 What's Working

- ✅ Dashboard loads with demo data
- ✅ Content Hub with sample posts
- ✅ AI Interactions interface
- ✅ Content Ideas generator  
- ✅ Interior Design AI (Reimagine Home API)
- ✅ Calendar functionality
- ✅ Settings page

## 🛠️ Next Steps

1. **Try the Interior Design Feature**: Upload an image and transform it!
2. **Explore the Dashboard**: See all the demo content
3. **Create New Posts**: Test the post creation workflow
4. **Set up Supabase**: For real data persistence (optional)

Your app is ready to use! 🎉 